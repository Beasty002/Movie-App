import { supabase } from '@/services/supabase';
import type { MediaType, ProgressEntry } from '@/types';
import { create } from 'zustand';
import { useWatchlistStore } from './useWatchlistStore';

interface ProgressState {
  // key = `${mediaId}-${mediaType}`
  progress: Record<string, ProgressEntry[]>;
  isLoading: boolean;
  fetchProgress: (userId: string, mediaId: number, mediaType: MediaType) => Promise<void>;
  markEpisodeWatched: (
    userId: string,
    mediaId: number,
    mediaType: MediaType,
    episodeNumber: number,
  ) => Promise<void>;
  unmarkEpisode: (
    userId: string,
    mediaId: number,
    mediaType: MediaType,
    episodeNumber: number,
  ) => Promise<void>;
  getWatchedCount: (mediaId: number, mediaType: MediaType) => number;
  isEpisodeWatched: (mediaId: number, mediaType: MediaType, episodeNumber: number) => boolean;
}

const makeKey = (mediaId: number, mediaType: MediaType) => `${mediaId}-${mediaType}`;

export const useProgressStore = create<ProgressState>((set, get) => ({
  progress: {},
  isLoading: false,

  fetchProgress: async (userId, mediaId, mediaType) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', userId)
        .eq('media_id', mediaId)
        .eq('media_type', mediaType)
        .order('episode_number', { ascending: true });

      if (error) throw error;

      const key = makeKey(mediaId, mediaType);
      set((state) => ({
        progress: { ...state.progress, [key]: (data as ProgressEntry[]) ?? [] },
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  markEpisodeWatched: async (userId, mediaId, mediaType, episodeNumber) => {
    const key = makeKey(mediaId, mediaType);
    const existing = get().progress[key] ?? [];

    // Skip if already marked
    if (existing.some((e) => e.episode_number === episodeNumber)) return;

    // Optimistic add
    const tempEntry: ProgressEntry = {
      id: `temp-${Date.now()}`,
      user_id: userId,
      media_id: mediaId,
      media_type: mediaType,
      episode_number: episodeNumber,
      watched_at: new Date().toISOString(),
    };
    set((state) => ({
      progress: { ...state.progress, [key]: [...existing, tempEntry] },
    }));

    // Bump episodes_watched in watchlist store
    const watchlistStore = useWatchlistStore.getState();
    const watchlistItem = watchlistStore.getItemByMedia(mediaId, mediaType);
    if (watchlistItem) {
      useWatchlistStore.setState((state) => ({
        items: state.items.map((i) =>
          i.id === watchlistItem.id
            ? { ...i, episodes_watched: i.episodes_watched + 1 }
            : i,
        ),
      }));
    }

    try {
      const { data, error } = await supabase
        .from('progress')
        .insert({ user_id: userId, media_id: mediaId, media_type: mediaType, episode_number: episodeNumber })
        .select()
        .single();

      if (error) throw error;

      // Replace temp with server data
      set((state) => ({
        progress: {
          ...state.progress,
          [key]: state.progress[key].map((e) =>
            e.id === tempEntry.id ? (data as ProgressEntry) : e,
          ),
        },
      }));

      // Auto-update watchlist: planning → watching when any episode is marked
      if (watchlistItem && watchlistItem.status === 'planning') {
        await watchlistStore.updateStatus(watchlistItem.id, 'watching');
      }
    } catch (err) {
      // Revert progress
      set((state) => ({
        progress: { ...state.progress, [key]: existing },
      }));
      // Revert watchlist episodes_watched
      if (watchlistItem) {
        useWatchlistStore.setState((state) => ({
          items: state.items.map((i) =>
            i.id === watchlistItem.id
              ? { ...i, episodes_watched: Math.max(0, i.episodes_watched - 1) }
              : i,
          ),
        }));
      }
      throw err;
    }
  },

  unmarkEpisode: async (userId, mediaId, mediaType, episodeNumber) => {
    const key = makeKey(mediaId, mediaType);
    const existing = get().progress[key] ?? [];
    const entry = existing.find((e) => e.episode_number === episodeNumber);
    if (!entry) return;

    // Optimistic remove
    set((state) => ({
      progress: {
        ...state.progress,
        [key]: existing.filter((e) => e.episode_number !== episodeNumber),
      },
    }));

    // Decrement episodes_watched in watchlist store
    const watchlistItem = useWatchlistStore.getState().getItemByMedia(mediaId, mediaType);
    if (watchlistItem) {
      useWatchlistStore.setState((state) => ({
        items: state.items.map((i) =>
          i.id === watchlistItem.id
            ? { ...i, episodes_watched: Math.max(0, i.episodes_watched - 1) }
            : i,
        ),
      }));
    }

    try {
      const { error } = await supabase
        .from('progress')
        .delete()
        .eq('user_id', userId)
        .eq('media_id', mediaId)
        .eq('media_type', mediaType)
        .eq('episode_number', episodeNumber);

      if (error) throw error;
    } catch (err) {
      // Revert
      set((state) => ({
        progress: { ...state.progress, [key]: existing },
      }));
      if (watchlistItem) {
        useWatchlistStore.setState((state) => ({
          items: state.items.map((i) =>
            i.id === watchlistItem.id
              ? { ...i, episodes_watched: i.episodes_watched + 1 }
              : i,
          ),
        }));
      }
      throw err;
    }
  },

  getWatchedCount: (mediaId, mediaType) => {
    const key = makeKey(mediaId, mediaType);
    return get().progress[key]?.length ?? 0;
  },

  isEpisodeWatched: (mediaId, mediaType, episodeNumber) => {
    const key = makeKey(mediaId, mediaType);
    return get().progress[key]?.some((e) => e.episode_number === episodeNumber) ?? false;
  },
}));
