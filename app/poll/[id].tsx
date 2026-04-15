import Toast from '@/components/ui/Toast';
import { supabase } from '@/services/supabase';
import { getImageUrl, searchDramas, searchMovies } from '@/services/tmdb';
import { useAuthStore } from '@/store/useAuthStore';
import { usePollStore } from '@/store/usePollStore';
import type { PollOption, TMDBDrama, WatchTime } from '@/types';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Edit2,
  ExternalLink,
  Film,
  Link2,
  Plus,
  RefreshCw,
  Share2,
  SquareX,
  Tv,
  Users,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WATCH_TIME_LABELS: Record<WatchTime, string> = {
  morning: 'Morning · 10 AM',
  afternoon: 'Afternoon · 3 PM',
  evening: 'Evening · 7 PM',
  night: 'Night · 9 PM',
  anytime: 'Anytime',
};

function formatWatchDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

function getTimeRemaining(expiresAt: string, isActive: boolean): string {
  if (!isActive) return 'Poll ended';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Poll ended';
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`;
  if (hours > 0) return `${hours}h remaining`;
  return `${totalMinutes}m remaining`;
}

function mediaTypeFromTMDB(tmdbType: 'tv' | 'movie' | undefined) {
  return tmdbType === 'movie' ? 'movie' as const : 'series' as const;
}

function yearFromDrama(drama: TMDBDrama): number | null {
  const raw = drama.first_air_date ?? drama.release_date ?? null;
  if (!raw) return null;
  const parsed = parseInt(raw.slice(0, 4), 10);
  return isNaN(parsed) ? null : parsed;
}

interface VoteBarProps {
  count: number;
  total: number;
  isLeading: boolean;
  isUserVote: boolean;
}

function VoteBar({ count, total, isLeading, isUserVote }: VoteBarProps) {
  const pct = total > 0 ? count / total : 0;
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: pct,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [pct, animWidth]);

  return (
    <View className="h-2 bg-dark-200 rounded-full mt-2 overflow-hidden">
      <Animated.View
        style={{
          height: '100%',
          borderRadius: 999,
          backgroundColor: isLeading
            ? '#AB8BFF'
            : isUserVote
              ? '#7C5CBF'
              : '#4B3F8A',
          width: animWidth.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
          }),
        }}
      />
    </View>
  );
}

interface OptionCardProps {
  option: PollOption;
  hasVoted: boolean;
  isSelected: boolean;
  isUserVote: boolean;
  isLeading: boolean;
  voteCount: number;
  totalVotes: number;
  onSelect: () => void;
  disabled: boolean;
}

function OptionCard({
  option,
  hasVoted,
  isSelected,
  isUserVote,
  isLeading,
  voteCount,
  totalVotes,
  onSelect,
  disabled,
}: OptionCardProps) {
  const posterUrl = getImageUrl(option.poster, 'w300');
  const pct =
    totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

  return (
    <TouchableOpacity
      onPress={onSelect}
      disabled={disabled}
      activeOpacity={0.75}
      className={`bg-dark-100 rounded-2xl p-3 mb-3 flex-row items-start ${isSelected && !hasVoted ? 'border-2 border-accent' : 'border-2 border-transparent'
        } ${isUserVote && hasVoted ? 'border border-accent/40' : ''}`}
    >
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={{ width: 50, height: 75, borderRadius: 8 }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{ width: 50, height: 75, borderRadius: 8 }}
          className="bg-dark-200 items-center justify-center"
        >
          <Film size={18} color="#A8B5DB" strokeWidth={1.5} />
        </View>
      )}

      <View className="flex-1 ml-3">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-sm flex-1 pr-2 ${isLeading && hasVoted ? 'text-white font-bold' : 'text-white font-medium'
              }`}
            numberOfLines={2}
          >
            {option.title}
          </Text>
          {!hasVoted && isSelected && (
            <CheckCircle size={20} color="#AB8BFF" strokeWidth={2} />
          )}
          {hasVoted && isUserVote && (
            <Check size={18} color="#AB8BFF" strokeWidth={2.5} />
          )}
        </View>

        {option.year ? (
          <Text className="text-light-300 text-[11px] mt-0.5">{option.year}</Text>
        ) : null}

        {option.suggested_by_name && (
          <Text className="text-light-300 text-[10px] mt-0.5">
            Suggested by @{option.suggested_by_name}
          </Text>
        )}

        {hasVoted && (
          <>
            <VoteBar
              count={voteCount}
              total={totalVotes}
              isLeading={isLeading}
              isUserVote={isUserVote}
            />
            <Text className="text-light-300 text-[11px] mt-1">
              {voteCount} {voteCount === 1 ? 'vote' : 'votes'} · {pct}%
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Suggest-a-show panel ──────────────────────────────────────────────────────
interface SuggestPanelProps {
  pollId: string;
  existingOptions: PollOption[];
  currentUserId: string | null;
  currentUsername: string | null;
  onDone: () => void;
}

function SuggestPanel({
  pollId,
  existingOptions,
  currentUserId,
  currentUsername,
  onDone,
}: SuggestPanelProps) {
  const { suggestOption } = usePollStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: tvResults, isLoading: tvLoading } = useQuery({
    queryKey: ['suggest-tv', debouncedQuery],
    queryFn: () => searchDramas(debouncedQuery),
    enabled: debouncedQuery.length > 1,
    staleTime: 2 * 60 * 1000,
  });
  const { data: movieResults, isLoading: movieLoading } = useQuery({
    queryKey: ['suggest-movie', debouncedQuery],
    queryFn: () => searchMovies(debouncedQuery),
    enabled: debouncedQuery.length > 1,
    staleTime: 2 * 60 * 1000,
  });

  const results: TMDBDrama[] = (() => {
    const tv = (tvResults?.results ?? []).map((d) => ({ ...d, media_type: 'tv' as const }));
    const movies = (movieResults?.results ?? []).map((d) => ({ ...d, media_type: 'movie' as const }));
    return [...tv, ...movies]
      .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
      .slice(0, 10);
  })();

  const showSkeleton = (tvLoading || movieLoading) && debouncedQuery.length > 1;

  const isAlready = (drama: TMDBDrama) =>
    existingOptions.some(
      (o) => o.media_id === drama.id && o.media_type === mediaTypeFromTMDB(drama.media_type),
    );

  const handleSuggest = async (drama: TMDBDrama) => {
    if (submitting || existingOptions.length >= 10) return;
    setSubmitting(true);
    try {
      await suggestOption(pollId, {
        media_id: drama.id,
        media_type: mediaTypeFromTMDB(drama.media_type),
        title: drama.name ?? drama.title ?? 'Unknown',
        title_korean: null,
        poster: drama.poster_path ?? null,
        year: yearFromDrama(drama),
        suggested_by: currentUserId,
        suggested_by_name: currentUsername,
      });
      onDone();
    } catch {
      Alert.alert('Error', 'Could not add suggestion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="bg-dark-100 rounded-2xl overflow-hidden mb-4">
      {/* Search input */}
      <View className="flex-row items-center px-4 py-3 border-b border-dark-200">
        <Film size={16} color="#9CA4AB" strokeWidth={1.5} />
        <TextInput
          className="flex-1 text-white text-sm py-1 ml-2"
          placeholder="Search a show or movie to suggest…"
          placeholderTextColor="#9CA4AB"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
            <X size={14} color="#A8B5DB" strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {showSkeleton ? (
        <View className="px-4 py-3">
          {[1, 2].map((i) => (
            <View key={i} className="flex-row items-center mb-3">
              <View style={{ width: 36, height: 54, borderRadius: 6 }} className="bg-dark-200" />
              <View className="flex-1 ml-3 gap-y-2">
                <View className="h-3 bg-dark-200 rounded w-3/4" />
                <View className="h-2.5 bg-dark-200 rounded w-1/3" />
              </View>
            </View>
          ))}
        </View>
      ) : results.length > 0 ? (
        results.map((item, idx) => {
          const already = isAlready(item);
          const posterUrl = getImageUrl(item.poster_path, 'w300');
          const year = yearFromDrama(item);
          return (
            <TouchableOpacity
              key={`${item.media_type}-${item.id}-${idx}`}
              onPress={() => handleSuggest(item)}
              disabled={already || submitting}
              activeOpacity={0.7}
              className={`flex-row items-center px-4 py-3 border-b border-dark-200/50 ${already ? 'opacity-40' : ''
                }`}
            >
              {posterUrl ? (
                <Image
                  source={{ uri: posterUrl }}
                  style={{ width: 36, height: 54, borderRadius: 6 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{ width: 36, height: 54, borderRadius: 6 }}
                  className="bg-dark-200 items-center justify-center"
                >
                  <Film size={14} color="#A8B5DB" strokeWidth={1.5} />
                </View>
              )}
              <View className="flex-1 ml-3">
                <Text className="text-white text-sm font-medium" numberOfLines={1}>
                  {item.name ?? item.title}
                </Text>
                <Text className="text-light-300 text-xs mt-0.5">
                  {item.media_type === 'movie' ? 'Movie' : 'TV Series'}
                  {year ? ` · ${year}` : ''}
                </Text>
              </View>
              {already ? (
                <Check size={16} color="#AB8BFF" strokeWidth={2.5} />
              ) : submitting ? (
                <ActivityIndicator size="small" color="#AB8BFF" />
              ) : (
                <Plus size={16} color="#A8B5DB" strokeWidth={2} />
              )}
            </TouchableOpacity>
          );
        })
      ) : debouncedQuery.length > 1 ? (
        <Text className="text-light-300 text-sm text-center py-6">
          No results for "{debouncedQuery}"
        </Text>
      ) : (
        <Text className="text-light-300 text-sm text-center py-6">
          Type to search
        </Text>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PollDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const {
    currentPoll,
    isLoading,
    fetchPollByCode,
    fetchPollById,
    vote,
    changeVote,
    subscribeToVotes,
    unsubscribeFromVotes,
    createPoll,
  } = usePollStore();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [creatorUsername, setCreatorUsername] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [showSuggestPanel, setShowSuggestPanel] = useState(false);
  const isNewPoll = useRef(false);

  const loadPoll = useCallback(async () => {
    if (!id) return;
    const isUUID = UUID_REGEX.test(id);
    if (isUUID) {
      await fetchPollById(id);
    } else {
      await fetchPollByCode(id);
    }
  }, [id, fetchPollById, fetchPollByCode]);

  useEffect(() => {
    loadPoll();
  }, [loadPoll]);

  // Show creation toast if navigated from create screen
  useEffect(() => {
    if (currentPoll && !isNewPoll.current) {
      const age = Date.now() - new Date(currentPoll.created_at).getTime();
      if (age < 8000 && currentPoll.creator_id === user?.id) {
        isNewPoll.current = true;
        setToastVisible(true);
      }
    }
  }, [currentPoll, user?.id]);

  // Fetch creator username
  useEffect(() => {
    if (!currentPoll?.creator_id) return;
    supabase
      .from('profiles')
      .select('username')
      .eq('id', currentPoll.creator_id)
      .single()
      .then(({ data }) => {
        if (data) setCreatorUsername((data as { username: string }).username);
      });
  }, [currentPoll?.creator_id]);

  // Fetch current user's username for suggestions
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setCurrentUsername((data as { username: string }).username);
      });
  }, [user?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!currentPoll?.id) return;
    const unsubscribe = subscribeToVotes(currentPoll.id);
    return () => {
      unsubscribe();
      unsubscribeFromVotes();
    };
  }, [currentPoll?.id, subscribeToVotes, unsubscribeFromVotes]);

  const handleVote = async () => {
    if (selectedOption === null || !currentPoll) return;
    setSubmitting(true);
    try {
      await vote(currentPoll.id, selectedOption);
    } catch {
      Alert.alert('Error', 'Failed to submit vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeVote = async (newIdx: number) => {
    if (!currentPoll || currentPoll.user_vote === newIdx) return;
    try {
      await changeVote(currentPoll.id, newIdx);
    } catch {
      Alert.alert('Error', 'Failed to change vote.');
    }
  };

  const handleShare = async () => {
    if (!currentPoll) return;
    try {
      await Share.share({
        message: `Vote on "${currentPoll.title}"!\n\nvotch://poll/${currentPoll.share_code}\n\nhttps://votch.app/p/${currentPoll.share_code}`,
        title: currentPoll.title,
      });
    } catch {
      // user cancelled
    }
  };

  const [codeCopied, setCodeCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!currentPoll) return;
    await Clipboard.setStringAsync(currentPoll.share_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleEndPoll = () => {
    if (!currentPoll) return;
    Alert.alert(
      'End Poll Early',
      'This will stop accepting new votes. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Poll',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('polls')
              .update({ is_active: false })
              .eq('id', currentPoll.id);
            await loadPoll();
          },
        },
      ],
    );
  };

  const handleRerun = async () => {
    if (!currentPoll) return;
    try {
      const newPoll = await createPoll({
        title: currentPoll.title,
        description: currentPoll.description ?? undefined,
        options: currentPoll.options,
        expiry_duration: '24h',
      });
      router.replace(`/poll/${newPoll.id}` as never);
    } catch {
      Alert.alert('Error', 'Failed to re-run poll.');
    }
  };

  if (isLoading && !currentPoll) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator color="#AB8BFF" size="large" />
      </View>
    );
  }

  if (!currentPoll) {
    return (
      <View className="flex-1 bg-primary items-center justify-center px-8">
        <Text className="text-white font-semibold text-lg mb-2">Poll not found</Text>
        <Text className="text-light-300 text-sm text-center">
          This poll may have expired or the link is invalid.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 bg-accent px-6 py-3 rounded-xl"
        >
          <Text className="text-primary font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasVoted = currentPoll.user_vote !== null;
  const isCreator = currentPoll.creator_id === user?.id;
  const isActive =
    currentPoll.is_active &&
    new Date(currentPoll.expires_at).getTime() > Date.now();
  const timeLabel = getTimeRemaining(currentPoll.expires_at, currentPoll.is_active);

  const maxVotes = Math.max(0, ...Object.values(currentPoll.votes_by_option));

  // Already suggested by current user?
  const alreadySuggested = currentPoll.options.some(
    (o) => o.suggested_by && o.suggested_by === user?.id,
  );
  const atOptionLimit = currentPoll.options.length >= 10;
  const canSuggest =
    isActive &&
    !!currentPoll.allow_suggestions &&
    !atOptionLimit &&
    (user !== null); // must be logged in to suggest

  return (
    <View className="flex-1 bg-primary">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center px-4 pt-14 pb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-9 h-9 rounded-full bg-dark-100 items-center justify-center mr-3"
          >
            <ArrowLeft size={18} color="#A8B5DB" strokeWidth={2} />
          </TouchableOpacity>
          <View className="flex-1" />
          <TouchableOpacity onPress={handleShare} hitSlop={8}>
            <Share2 size={20} color="#AB8BFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View className="px-4">
          {/* Title */}
          <Text className="text-white font-bold text-2xl mt-2 mb-1 leading-tight">
            {currentPoll.title}
          </Text>

          {/* Description */}
          {currentPoll.description ? (
            <Text className="text-light-200 text-sm mb-3">{currentPoll.description}</Text>
          ) : null}

          {/* Meta row */}
          <View className="flex-row items-center flex-wrap gap-x-3 mb-4">
            {creatorUsername ? (
              <Text className="text-light-300 text-xs">
                by @{creatorUsername} · {formatTimeAgo(currentPoll.created_at)}
              </Text>
            ) : null}
          </View>

          {/* Time banner */}
          <View
            className={`flex-row items-center gap-x-2 rounded-xl px-4 py-2.5 mb-3 ${isActive ? 'bg-accent/10' : 'bg-dark-100'
              }`}
          >
            <Clock size={14} color={isActive ? '#AB8BFF' : '#6B7280'} strokeWidth={2} />
            <Text
              className={`text-sm font-medium ${isActive ? 'text-accent' : 'text-light-300'
                }`}
            >
              {timeLabel}
            </Text>
            {hasVoted && (
              <>
                <View className="flex-1" />
                <Users size={13} color="#A8B5DB" strokeWidth={2} />
                <Text className="text-light-300 text-xs">
                  {currentPoll.total_votes}{' '}
                  {currentPoll.total_votes === 1 ? 'person' : 'people'} voted
                </Text>
              </>
            )}
          </View>

          {/* ─── When to Watch banner ─── */}
          {(currentPoll.watch_date || currentPoll.watch_time || currentPoll.watch_custom_time) && (
            <View className="flex-row items-center gap-x-2 bg-dark-100 rounded-xl px-4 py-2.5 mb-3">
              <Tv size={14} color="#AB8BFF" strokeWidth={2} />
              <Text className="text-white text-sm font-medium">
                {currentPoll.watch_date ? formatWatchDate(currentPoll.watch_date) : ''}
                {currentPoll.watch_date && (currentPoll.watch_time || currentPoll.watch_custom_time) ? '  ·  ' : ''}
                {currentPoll.watch_custom_time
                  ? currentPoll.watch_custom_time
                  : currentPoll.watch_time
                    ? WATCH_TIME_LABELS[currentPoll.watch_time]
                    : ''}
              </Text>
            </View>
          )}

          {/* ─── Where to Watch banner ─── */}
          {currentPoll.watch_together_link && (
            <TouchableOpacity
              onPress={() => Linking.openURL(currentPoll.watch_together_link!)}
              activeOpacity={0.75}
              className="flex-row items-center gap-x-2 bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 mb-3"
            >
              <Link2 size={14} color="#AB8BFF" strokeWidth={2} />
              <View className="flex-1">
                <Text className="text-light-300 text-xs">Watch Together</Text>
                <Text className="text-accent text-sm font-semibold">Open watch party link</Text>
              </View>
              <ExternalLink size={14} color="#AB8BFF" strokeWidth={2} />
            </TouchableOpacity>
          )}

          {/* Options */}
          <View className="mt-1">
            {currentPoll.options.map((option) => {
              const voteCount = currentPoll.votes_by_option[option.index] ?? 0;
              const isLeading = hasVoted && voteCount === maxVotes && maxVotes > 0;
              const isUserVote = currentPoll.user_vote === option.index;
              const isSelected = selectedOption === option.index;

              return (
                <OptionCard
                  key={option.index}
                  option={option}
                  hasVoted={hasVoted}
                  isSelected={isSelected}
                  isUserVote={isUserVote}
                  isLeading={isLeading}
                  voteCount={voteCount}
                  totalVotes={currentPoll.total_votes}
                  disabled={!isActive}
                  onSelect={() => {
                    if (hasVoted && isActive) {
                      handleChangeVote(option.index);
                    } else {
                      setSelectedOption(option.index);
                    }
                  }}
                />
              );
            })}
          </View>

          {/* Change vote hint */}
          {hasVoted && isActive && (
            <Text className="text-light-300 text-xs text-center mt-1 mb-2">
              Tap another option to change your vote
            </Text>
          )}

          {/* Guest vote note */}
          {!hasVoted && isActive && !user && (
            <Text className="text-light-300 text-xs text-center mt-1 mb-2">
              Voting without an account — your vote will be saved to this device
            </Text>
          )}

          {/* ─── Suggest a Show section ─── */}
          {canSuggest && (
            <View className="mt-2 mb-4">
              {showSuggestPanel ? (
                <SuggestPanel
                  pollId={currentPoll.id}
                  existingOptions={currentPoll.options}
                  currentUserId={user?.id ?? null}
                  currentUsername={currentUsername}
                  onDone={() => setShowSuggestPanel(false)}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => setShowSuggestPanel(true)}
                  activeOpacity={0.8}
                  className={`flex-row items-center justify-center gap-x-2 rounded-xl py-3 border ${alreadySuggested
                    ? 'bg-dark-100 border-dark-200 opacity-60'
                    : 'bg-accent/10 border-accent/30'
                    }`}
                  disabled={alreadySuggested}
                >
                  <Plus
                    size={16}
                    color={alreadySuggested ? '#A8B5DB' : '#AB8BFF'}
                    strokeWidth={2}
                  />
                  <Text
                    className={`text-sm font-semibold ${alreadySuggested ? 'text-light-300' : 'text-accent'
                      }`}
                  >
                    {alreadySuggested
                      ? 'You already suggested a show'
                      : `Suggest a Show  ·  ${10 - currentPoll.options.length} slot${10 - currentPoll.options.length !== 1 ? 's' : ''
                      } left`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Share section */}
          <View className="bg-dark-100 rounded-2xl p-4 mt-2 mb-4">
            <Text className="text-white font-semibold text-sm mb-1">Share this poll</Text>
            <Text className="text-light-300 text-xs mb-3">
              Code:{' '}
              <Text className="text-white font-mono font-semibold">
                {currentPoll.share_code}
              </Text>
            </Text>
            <View className="flex-row gap-x-2">
              <TouchableOpacity
                onPress={handleCopyCode}
                activeOpacity={0.8}
                className="flex-1 flex-row items-center justify-center gap-x-2 bg-dark-200 border border-dark-200 rounded-xl py-3"
              >
                <Copy
                  size={15}
                  color={codeCopied ? '#AB8BFF' : '#A8B5DB'}
                  strokeWidth={2}
                />
                <Text
                  className={`font-semibold text-sm ${codeCopied ? 'text-accent' : 'text-light-200'
                    }`}
                >
                  {codeCopied ? 'Copied!' : 'Copy Code'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShare}
                activeOpacity={0.8}
                className="flex-1 flex-row items-center justify-center gap-x-2 bg-accent/10 border border-accent/30 rounded-xl py-3"
              >
                <Share2 size={15} color="#AB8BFF" strokeWidth={2} />
                <Text className="text-accent font-semibold text-sm">Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Creator controls */}
          {isCreator && (
            <View className="gap-y-2 mb-4">
              {isActive && (
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/poll/edit', params: { id: currentPoll.id } } as never)}
                  activeOpacity={0.8}
                  className="flex-row items-center justify-center gap-x-2 bg-accent/10 border border-accent/30 rounded-xl py-3"
                >
                  <Edit2 size={16} color="#AB8BFF" strokeWidth={2} />
                  <Text className="text-accent font-semibold text-sm">Edit Poll</Text>
                </TouchableOpacity>
              )}
              {isActive && (
                <TouchableOpacity
                  onPress={handleEndPoll}
                  activeOpacity={0.8}
                  className="flex-row items-center justify-center gap-x-2 bg-red-500/10 border border-red-500/30 rounded-xl py-3"
                >
                  <SquareX size={16} color="#EF4444" strokeWidth={2} />
                  <Text className="text-red-400 font-semibold text-sm">End Poll Early</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleRerun}
                activeOpacity={0.8}
                className="flex-row items-center justify-center gap-x-2 bg-dark-100 border border-dark-200 rounded-xl py-3"
              >
                <RefreshCw size={16} color="#A8B5DB" strokeWidth={2} />
                <Text className="text-light-200 font-semibold text-sm">Re-run Poll (24h)</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Submit vote button — pinned */}
      {!hasVoted && isActive && (
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-10 pt-3 bg-primary border-t border-dark-100">
          <TouchableOpacity
            onPress={handleVote}
            disabled={selectedOption === null || submitting}
            activeOpacity={0.8}
            className={`py-4 rounded-xl items-center flex-row justify-center gap-x-2 ${selectedOption !== null && !submitting ? 'bg-accent' : 'bg-dark-100'
              }`}
          >
            {submitting ? (
              <ActivityIndicator color="#030014" size="small" />
            ) : (
              <>
                <Copy
                  size={18}
                  color={selectedOption !== null ? '#030014' : '#A8B5DB'}
                  strokeWidth={2}
                />
                <Text
                  className={`font-semibold text-base ${selectedOption !== null ? 'text-primary' : 'text-light-300'
                    }`}
                >
                  {selectedOption !== null ? 'Submit Vote' : 'Select an option'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Creation toast */}
      <Toast
        visible={toastVisible}
        message="Poll created! Share with friends to start voting"
        actionLabel="Share Now"
        onAction={handleShare}
        onDismiss={() => setToastVisible(false)}
        duration={5000}
      />
    </View>
  );
}
