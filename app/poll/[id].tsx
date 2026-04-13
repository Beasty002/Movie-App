import Toast from '@/components/ui/Toast';
import { getImageUrl } from '@/services/tmdb';
import { useAuthStore } from '@/store/useAuthStore';
import { usePollStore } from '@/store/usePollStore';
import type { PollOption } from '@/types';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Film,
  RefreshCw,
  Share2,
  SquareX,
  Users,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Share,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '@/services/supabase';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      className={`bg-dark-100 rounded-2xl p-3 mb-3 flex-row items-start ${
        isSelected && !hasVoted ? 'border-2 border-accent' : 'border-2 border-transparent'
      } ${isUserVote && hasVoted ? 'border border-accent/40' : ''}`}
    >
      {/* Poster */}
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

      {/* Content */}
      <View className="flex-1 ml-3">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-sm flex-1 pr-2 ${
              isLeading && hasVoted ? 'text-white font-bold' : 'text-white font-medium'
            }`}
            numberOfLines={2}
          >
            {option.title}
          </Text>
          {/* Checkmark indicators */}
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

        {/* Results bar — only after voting */}
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
      // Check if this poll was just created (within last 5 seconds)
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
        <Text className="text-white font-semibold text-lg mb-2">
          Poll not found
        </Text>
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

  // Find leading option
  const maxVotes = Math.max(
    0,
    ...Object.values(currentPoll.votes_by_option),
  );

  return (
    <View className="flex-1 bg-primary">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center px-4 pt-14 pb-2">
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} className="mr-3">
            <ArrowLeft size={22} color="#A8B5DB" strokeWidth={2} />
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
            <Text className="text-light-200 text-sm mb-3">
              {currentPoll.description}
            </Text>
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
            className={`flex-row items-center gap-x-2 rounded-xl px-4 py-2.5 mb-5 ${
              isActive ? 'bg-accent/10' : 'bg-dark-100'
            }`}
          >
            <Clock
              size={14}
              color={isActive ? '#AB8BFF' : '#6B7280'}
              strokeWidth={2}
            />
            <Text
              className={`text-sm font-medium ${
                isActive ? 'text-accent' : 'text-light-300'
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

          {/* Options */}
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

          {/* Share section */}
          <View className="bg-dark-100 rounded-2xl p-4 mt-2 mb-4">
            <Text className="text-white font-semibold text-sm mb-1">
              Share this poll
            </Text>
            <Text className="text-light-300 text-xs mb-3">
              Code: <Text className="text-white font-mono font-semibold">{currentPoll.share_code}</Text>
            </Text>
            <View className="flex-row gap-x-2">
              <TouchableOpacity
                onPress={handleCopyCode}
                activeOpacity={0.8}
                className="flex-1 flex-row items-center justify-center gap-x-2 bg-dark-200 border border-dark-200 rounded-xl py-3"
              >
                <Copy size={15} color={codeCopied ? '#AB8BFF' : '#A8B5DB'} strokeWidth={2} />
                <Text className={`font-semibold text-sm ${codeCopied ? 'text-accent' : 'text-light-200'}`}>
                  {codeCopied ? 'Copied!' : 'Copy Code'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShare}
                activeOpacity={0.8}
                className="flex-1 flex-row items-center justify-center gap-x-2 bg-accent/10 border border-accent/30 rounded-xl py-3"
              >
                <Share2 size={15} color="#AB8BFF" strokeWidth={2} />
                <Text className="text-accent font-semibold text-sm">
                  Share
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Creator controls */}
          {isCreator && (
            <View className="gap-y-2 mb-4">
              {isActive && (
                <TouchableOpacity
                  onPress={handleEndPoll}
                  activeOpacity={0.8}
                  className="flex-row items-center justify-center gap-x-2 bg-red-500/10 border border-red-500/30 rounded-xl py-3"
                >
                  <SquareX size={16} color="#EF4444" strokeWidth={2} />
                  <Text className="text-red-400 font-semibold text-sm">
                    End Poll Early
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleRerun}
                activeOpacity={0.8}
                className="flex-row items-center justify-center gap-x-2 bg-dark-100 border border-dark-200 rounded-xl py-3"
              >
                <RefreshCw size={16} color="#A8B5DB" strokeWidth={2} />
                <Text className="text-light-200 font-semibold text-sm">
                  Re-run Poll (24h)
                </Text>
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
            className={`py-4 rounded-xl items-center flex-row justify-center gap-x-2 ${
              selectedOption !== null && !submitting
                ? 'bg-accent'
                : 'bg-dark-100'
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#030014" size="small" />
            ) : (
              <>
                <Copy size={18} color={selectedOption !== null ? '#030014' : '#A8B5DB'} strokeWidth={2} />
                <Text
                  className={`font-semibold text-base ${
                    selectedOption !== null ? 'text-primary' : 'text-light-300'
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
