import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import { useAuthStore } from './useAuthStore';
import type { Poll, PollListItem, PollOption, PollVote, PollWithResults, StreamingPlatform, WatchTime } from '@/types';

const GUEST_ID_KEY = 'votch_guest_id';

async function getOrCreateGuestId(): Promise<string> {
  const existing = await AsyncStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;
  const id =
    'guest_' +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2);
  await AsyncStorage.setItem(GUEST_ID_KEY, id);
  return id;
}

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from(
    { length: 8 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}

function getExpiresAt(duration: '12h' | '24h' | '48h' | '1w'): string {
  const now = new Date();
  const hoursMap: Record<string, number> = {
    '12h': 12,
    '24h': 24,
    '48h': 48,
    '1w': 168,
  };
  now.setHours(now.getHours() + hoursMap[duration]);
  return now.toISOString();
}

function buildPollWithResults(
  poll: Poll,
  votes: PollVote[],
  userId: string | null,
  guestId: string | null,
): PollWithResults {
  const votes_by_option: Record<number, number> = {};
  for (const v of votes) {
    votes_by_option[v.option_index] =
      (votes_by_option[v.option_index] ?? 0) + 1;
  }

  let user_vote: number | null = null;
  if (userId) {
    const myVote = votes.find((v) => v.voter_id === userId);
    if (myVote) user_vote = myVote.option_index;
  } else if (guestId) {
    const myVote = votes.find((v) => v.guest_identifier === guestId);
    if (myVote) user_vote = myVote.option_index;
  }

  return { ...poll, total_votes: votes.length, votes_by_option, user_vote };
}

// Module-level channel reference — not reactive state
let activeChannel: ReturnType<typeof supabase.channel> | null = null;

// Raw Supabase row shape when using select('*, poll_votes(count)')
interface RawPollRow {
  id: string;
  title: string;
  share_code: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  options: PollOption[];
  poll_votes: { count: number }[];
}

function mapRawToPollListItem(p: RawPollRow): PollListItem {
  return {
    id: p.id,
    title: p.title,
    share_code: p.share_code,
    expires_at: p.expires_at,
    is_active: p.is_active,
    created_at: p.created_at,
    options: p.options ?? [],
    total_votes: p.poll_votes?.[0]?.count ?? 0,
  };
}

interface PollState {
  myPolls: PollListItem[];
  votedPolls: PollListItem[];
  currentPoll: PollWithResults | null;
  isLoading: boolean;
  error: string | null;
  fetchMyPolls: (userId: string) => Promise<void>;
  fetchVotedPolls: (userId: string) => Promise<void>;
  fetchPollByCode: (shareCode: string) => Promise<PollWithResults>;
  fetchPollById: (pollId: string) => Promise<PollWithResults>;
  createPoll: (data: {
    title: string;
    description?: string;
    options: PollOption[];
    expiry_duration: '12h' | '24h' | '48h' | '1w';
    watch_date?: string | null;
    watch_time?: WatchTime | null;
    streaming_platforms?: StreamingPlatform[] | null;
    allow_suggestions?: boolean;
  }) => Promise<Poll>;
  suggestOption: (pollId: string, option: Omit<PollOption, 'index'>) => Promise<void>;
  vote: (
    pollId: string,
    optionIndex: number,
    guestIdentifier?: string,
  ) => Promise<void>;
  changeVote: (pollId: string, newOptionIndex: number) => Promise<void>;
  subscribeToVotes: (pollId: string) => () => void;
  unsubscribeFromVotes: () => void;
}

export const usePollStore = create<PollState>((set, get) => ({
  myPolls: [],
  votedPolls: [],
  currentPoll: null,
  isLoading: false,
  error: null,

  fetchMyPolls: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('polls')
        .select('*, poll_votes(count)')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ myPolls: (data as unknown as RawPollRow[]).map(mapRawToPollListItem) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load polls' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchVotedPolls: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const { data: votes, error: votesError } = await supabase
        .from('poll_votes')
        .select('poll_id')
        .eq('voter_id', userId);

      if (votesError) throw votesError;

      const pollIds = (votes ?? []).map(
        (v: { poll_id: string }) => v.poll_id,
      );

      if (pollIds.length === 0) {
        set({ votedPolls: [], isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('polls')
        .select('*, poll_votes(count)')
        .in('id', pollIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ votedPolls: (data as unknown as RawPollRow[]).map(mapRawToPollListItem) });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load voted polls',
      });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPollByCode: async (shareCode) => {
    set({ isLoading: true, error: null });
    try {
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('share_code', shareCode)
        .single();

      if (pollError) throw pollError;

      const { data: votes, error: votesError } = await supabase
        .from('poll_votes')
        .select('*')
        .eq('poll_id', (poll as Poll).id);

      if (votesError) throw votesError;

      const userId = useAuthStore.getState().user?.id ?? null;
      const guestId = await getOrCreateGuestId();
      const result = buildPollWithResults(
        poll as Poll,
        (votes ?? []) as PollVote[],
        userId,
        guestId,
      );

      set({ currentPoll: result });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load poll';
      set({ error: msg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPollById: async (pollId) => {
    set({ isLoading: true, error: null });
    try {
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (pollError) throw pollError;

      const { data: votes, error: votesError } = await supabase
        .from('poll_votes')
        .select('*')
        .eq('poll_id', pollId);

      if (votesError) throw votesError;

      const userId = useAuthStore.getState().user?.id ?? null;
      const guestId = await getOrCreateGuestId();
      const result = buildPollWithResults(
        poll as Poll,
        (votes ?? []) as PollVote[],
        userId,
        guestId,
      );

      set({ currentPoll: result });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load poll';
      set({ error: msg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  createPoll: async (data) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Must be signed in to create a poll');

    set({ isLoading: true, error: null });
    try {
      const shareCode = generateShareCode();
      const expiresAt = getExpiresAt(data.expiry_duration);

      const { data: created, error } = await supabase
        .from('polls')
        .insert({
          creator_id: userId,
          title: data.title,
          description: data.description ?? null,
          options: data.options,
          expiry_duration: data.expiry_duration,
          expires_at: expiresAt,
          is_active: true,
          share_code: shareCode,
          watch_date: data.watch_date ?? null,
          watch_time: data.watch_time ?? null,
          streaming_platforms: data.streaming_platforms ?? null,
          allow_suggestions: data.allow_suggestions ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return created as Poll;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create poll';
      set({ error: msg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  vote: async (pollId, optionIndex, guestIdentifier) => {
    const userId = useAuthStore.getState().user?.id ?? null;
    const guestId =
      guestIdentifier ?? (userId ? null : await getOrCreateGuestId());

    // Optimistic update
    set((state) => {
      if (!state.currentPoll) return state;
      const newVotesByOption = { ...state.currentPoll.votes_by_option };
      newVotesByOption[optionIndex] =
        (newVotesByOption[optionIndex] ?? 0) + 1;
      return {
        currentPoll: {
          ...state.currentPoll,
          votes_by_option: newVotesByOption,
          total_votes: state.currentPoll.total_votes + 1,
          user_vote: optionIndex,
        },
      };
    });

    try {
      const { error } = await supabase.from('poll_votes').insert({
        poll_id: pollId,
        voter_id: userId,
        guest_identifier: guestId,
        option_index: optionIndex,
      });
      if (error) throw error;
    } catch (err) {
      // Revert on failure
      set((state) => {
        if (!state.currentPoll) return state;
        const newVotesByOption = { ...state.currentPoll.votes_by_option };
        newVotesByOption[optionIndex] = Math.max(
          0,
          (newVotesByOption[optionIndex] ?? 1) - 1,
        );
        return {
          currentPoll: {
            ...state.currentPoll,
            votes_by_option: newVotesByOption,
            total_votes: Math.max(0, state.currentPoll.total_votes - 1),
            user_vote: null,
          },
        };
      });
      throw err;
    }
  },

  changeVote: async (pollId, newOptionIndex) => {
    const userId = useAuthStore.getState().user?.id ?? null;
    const prevVote = get().currentPoll?.user_vote ?? null;

    // Optimistic update
    set((state) => {
      if (!state.currentPoll || prevVote === null) return state;
      const newVotesByOption = { ...state.currentPoll.votes_by_option };
      newVotesByOption[prevVote] = Math.max(
        0,
        (newVotesByOption[prevVote] ?? 1) - 1,
      );
      newVotesByOption[newOptionIndex] =
        (newVotesByOption[newOptionIndex] ?? 0) + 1;
      return {
        currentPoll: {
          ...state.currentPoll,
          votes_by_option: newVotesByOption,
          user_vote: newOptionIndex,
        },
      };
    });

    try {
      const guestId = userId ? null : await getOrCreateGuestId();
      const filterCol = userId ? 'voter_id' : 'guest_identifier';
      const filterVal = userId ?? guestId ?? '';

      const { error } = await supabase
        .from('poll_votes')
        .update({ option_index: newOptionIndex })
        .eq('poll_id', pollId)
        .eq(filterCol, filterVal);

      if (error) throw error;
    } catch (err) {
      // Revert
      if (prevVote !== null) {
        set((state) => {
          if (!state.currentPoll) return state;
          const newVotesByOption = { ...state.currentPoll.votes_by_option };
          newVotesByOption[newOptionIndex] = Math.max(
            0,
            (newVotesByOption[newOptionIndex] ?? 1) - 1,
          );
          newVotesByOption[prevVote] =
            (newVotesByOption[prevVote] ?? 0) + 1;
          return {
            currentPoll: {
              ...state.currentPoll,
              votes_by_option: newVotesByOption,
              user_vote: prevVote,
            },
          };
        });
      }
      throw err;
    }
  },

  suggestOption: async (pollId, option) => {
    const poll = get().currentPoll;
    if (!poll) return;

    const newOption: PollOption = { ...option, index: poll.options.length };
    const newOptions = [...poll.options, newOption];

    const { error } = await supabase
      .from('polls')
      .update({ options: newOptions })
      .eq('id', pollId);

    if (error) throw error;

    set((state) => {
      if (!state.currentPoll) return state;
      return { currentPoll: { ...state.currentPoll, options: newOptions } };
    });
  },

  subscribeToVotes: (pollId) => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }

    activeChannel = supabase
      .channel(`poll:${pollId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'poll_votes',
          filter: `poll_id=eq.${pollId}`,
        },
        (payload) => {
          const newVote = payload.new as PollVote;
          set((state) => {
            if (!state.currentPoll) return state;
            const newVotesByOption = { ...state.currentPoll.votes_by_option };
            newVotesByOption[newVote.option_index] =
              (newVotesByOption[newVote.option_index] ?? 0) + 1;
            return {
              currentPoll: {
                ...state.currentPoll,
                votes_by_option: newVotesByOption,
                total_votes: state.currentPoll.total_votes + 1,
              },
            };
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'polls',
          filter: `id=eq.${pollId}`,
        },
        (payload) => {
          const updated = payload.new as Poll;
          set((state) => {
            if (!state.currentPoll) return state;
            return {
              currentPoll: {
                ...state.currentPoll,
                options: updated.options ?? state.currentPoll.options,
              },
            };
          });
        },
      )
      .subscribe();

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
        activeChannel = null;
      }
    };
  },

  unsubscribeFromVotes: () => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
  },
}));
