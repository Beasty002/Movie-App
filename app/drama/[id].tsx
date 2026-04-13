import ImageWithFallback from '@/components/ImageWithFallback';
import DramaCard from '@/components/drama/DramaCard';
import { getDramaDetail, getDramaEpisodes, getImageUrl, getRecommendedContent, getSimilarContent } from '@/services/tmdb';
import { useAuthStore } from '@/store/useAuthStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import type { TMDBCast, TMDBDrama, TMDBEpisode, WatchlistStatus } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bookmark, Check, Play, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

type StatusOption = {
  value: WatchlistStatus;
  label: string;
  icon: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'watching', label: 'Watching', icon: 'play' },
  { value: 'planning', label: 'Plan to Watch', icon: 'bookmark' },
  { value: 'completed', label: 'Completed', icon: 'check' },
  { value: 'dropped', label: 'Dropped', icon: 'trash2' },
];

const STATUS_COLORS: Record<WatchlistStatus, string> = {
  watching: 'text-blue-400',
  completed: 'text-green-400',
  planning: 'text-gray-400',
  dropped: 'text-red-400',
};

function StatusIcon({ iconName }: { iconName: string }) {
  const iconProps = { size: 20, strokeWidth: 2 };
  switch (iconName) {
    case 'play':
      return <Play {...iconProps} color="#60A5FA" />;
    case 'bookmark':
      return <Bookmark {...iconProps} color="#9CA4AB" />;
    case 'check':
      return <Check {...iconProps} color="#4ADE80" />;
    case 'trash2':
      return <Trash2 {...iconProps} color="#F87171" />;
    default:
      return null;
  }
}

function CastCard({ cast }: { cast: TMDBCast }) {
  const photoUrl = getImageUrl(cast.profile_path, 'w300');
  return (
    <View className="items-center w-20 mr-3">
      <ImageWithFallback
        source={photoUrl ? { uri: photoUrl } : undefined}
        style={{ width: 64, height: 64, borderRadius: 32 }}
        contentFit="cover"
      />
      <Text className="text-white text-[11px] font-medium text-center mt-1" numberOfLines={2}>
        {cast.name}
      </Text>
      <Text className="text-light-300 text-[10px] text-center" numberOfLines={1}>
        {cast.character}
      </Text>
    </View>
  );
}

function EpisodeRow({
  episode,
  watched,
  onToggle,
  isReleased,
}: {
  episode: TMDBEpisode;
  watched: boolean;
  onToggle: () => void;
  isReleased: boolean;
}) {
  return (
    <View className={`flex-row items-center py-3 border-b border-dark-100 ${!isReleased ? 'opacity-50' : ''}`}>
      <View className="flex-1 mr-3">
        <Text className={`text-[13px] font-medium ${isReleased ? 'text-white' : 'text-light-300'}`}>
          Ep {episode.episode_number} · {episode.name}
        </Text>
        {episode.air_date ? (
          <Text className="text-light-300 text-[11px] mt-0.5">{episode.air_date}</Text>
        ) : (
          <Text className="text-light-300 text-[11px] mt-0.5 italic">Unreleased</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        disabled={!isReleased}
        className={`w-7 h-7 rounded-full border-2 items-center justify-center ${watched && isReleased ? 'bg-accent border-accent' : isReleased ? 'border-light-200' : 'border-light-300 opacity-50'
          }`}
      >
        {watched && isReleased ? <Check size={16} strokeWidth={3} color="#030014" /> : null}
      </TouchableOpacity>
    </View>
  );
}

export default function DramaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dramaId = parseInt(id, 10);

  const { user } = useAuthStore();
  const { addToWatchlist, updateStatus, removeFromWatchlist, getItemByMedia } = useWatchlistStore();
  const { fetchProgress, markEpisodeWatched, unmarkEpisode, isEpisodeWatched } = useProgressStore();

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);

  const watchlistItem = getItemByMedia(dramaId, 'kdrama');

  const { data: drama, isLoading, isError } = useQuery({
    queryKey: ['drama', id],
    queryFn: () => getDramaDetail(dramaId),
  });

  const { data: episodes } = useQuery({
    queryKey: ['drama', id, 'episodes', selectedSeason],
    queryFn: () => getDramaEpisodes(dramaId, selectedSeason),
    enabled: !!drama && (drama.number_of_seasons ?? 0) >= selectedSeason,
  });

  const { data: similar } = useQuery({
    queryKey: ['drama', id, 'similar'],
    queryFn: () => getSimilarContent(dramaId, 'tv'),
    enabled: !!drama,
  });

  const { data: recommended } = useQuery({
    queryKey: ['drama', id, 'recommended'],
    queryFn: () => getRecommendedContent(dramaId, 'tv'),
    enabled: !!drama,
  });

  useEffect(() => {
    if (user && drama) {
      fetchProgress(user.id, dramaId, 'kdrama');
    }
  }, [user, drama]);

  const handleToggleEpisode = useCallback(
    async (episodeNumber: number) => {
      if (!user) return;
      const watched = isEpisodeWatched(dramaId, 'kdrama', episodeNumber);
      try {
        if (watched) {
          await unmarkEpisode(user.id, dramaId, 'kdrama', episodeNumber);
          Toast.show({
            type: 'success',
            text1: 'Episode marked as unwatched',
            duration: 2000,
          });
        } else {
          await markEpisodeWatched(user.id, dramaId, 'kdrama', episodeNumber);
          Toast.show({
            type: 'success',
            text1: 'Episode marked as watched',
            duration: 2000,
          });
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Failed to update episode',
          duration: 2000,
        });
      }
    },
    [user, dramaId, isEpisodeWatched, markEpisodeWatched, unmarkEpisode],
  );

  const handleAddOrUpdate = useCallback(
    async (status: WatchlistStatus) => {
      if (!user || !drama) return;
      setShowStatusModal(false);

      try {
        if (watchlistItem) {
          await updateStatus(watchlistItem.id, status);
          Toast.show({
            type: 'success',
            text1: `Status changed to ${status}`,
            duration: 2000,
          });
        } else {
          await addToWatchlist(
            {
              media_id: drama.id,
              media_type: 'kdrama',
              media_title: drama.name,
              media_title_korean: drama.original_name ?? null,
              media_poster: drama.poster_path,
              media_year: drama.first_air_date ? parseInt(drama.first_air_date.split('-')[0], 10) : null,
              total_episodes: drama.number_of_episodes ?? null,
              status,
            },
            user.id,
          );
          Toast.show({
            type: 'success',
            text1: 'Added to watchlist',
            duration: 2000,
          });
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Failed to update watchlist',
          duration: 2000,
        });
      }
    },
    [user, drama, watchlistItem, addToWatchlist, updateStatus],
  );

  const handleRemove = useCallback(() => {
    if (!watchlistItem) return;
    Alert.alert('Remove from Watchlist', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFromWatchlist(watchlistItem.id);
            Toast.show({
              type: 'success',
              text1: 'Removed from watchlist',
              duration: 2000,
            });
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: 'Failed to remove',
              duration: 2000,
            });
          }
        },
      },
    ]);
  }, [watchlistItem, removeFromWatchlist]);

  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-primary">
        <ActivityIndicator color="#AB8BFF" size="large" />
      </View>
    );
  }

  if (isError || !drama) {
    return (
      <View className="items-center justify-center flex-1 px-6 bg-primary">
        <Text className="text-base text-center text-light-300">
          Failed to load drama details.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-accent">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const backdropUrl = getImageUrl(drama.backdrop_path, 'w780');
  const posterUrl = getImageUrl(drama.poster_path, 'w300');
  const year = drama.first_air_date ? drama.first_air_date.split('-')[0] : '';
  const rating = drama.vote_average ? drama.vote_average.toFixed(1) : '–';
  const cast = drama.credits?.cast ?? [];

  return (
    <>
      <ScrollView
        className="flex-1 bg-primary"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Backdrop + poster overlap */}
        <View style={{ height: 270 }}>
          <ImageWithFallback
            source={backdropUrl ? { uri: backdropUrl } : undefined}
            style={{ width: '100%', height: 220 }}
            contentFit="cover"
          />
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute items-center justify-center rounded-full top-12 left-4 w-9 h-9 bg-black/50"
          >
            <Text className="text-base text-white">‹</Text>
          </TouchableOpacity>

          {/* Poster */}
          <View className="absolute left-4" style={{ bottom: 0 }}>
            <ImageWithFallback
              source={posterUrl ? { uri: posterUrl } : undefined}
              style={{ width: 90, height: 130, borderRadius: 10 }}
              contentFit="cover"
            />
          </View>
        </View>

        <View className="px-4 -mt-[42px]">
          {/* Title */}
          <View className="ml-28">
            <Text className="text-xl font-bold text-white" numberOfLines={3}>
              {drama.name}
            </Text>
            <Text className="text-light-200 text-[15px] mt-1">{drama.original_name}</Text>
          </View>

          {/* Meta row */}
          <View className="flex-row flex-wrap items-center mt-3 gap-x-3 gap-y-1">
            {year ? <Text className="text-light-300 text-[13px]">{year}</Text> : null}
            {drama.number_of_episodes ? (
              <Text className="text-light-300 text-[13px]">
                {drama.number_of_episodes} eps
              </Text>
            ) : null}
            {drama.status ? (
              <View className="bg-dark-100 px-2 py-0.5 rounded-full">
                <Text className="text-light-200 text-[11px]">{drama.status}</Text>
              </View>
            ) : null}
            <View className="flex-row items-center gap-x-1">
              <Text className="text-accent text-[13px]">★</Text>
              <Text className="text-light-200 text-[13px]">{rating}</Text>
            </View>
          </View>

          {/* Networks */}
          {drama.networks && drama.networks.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{ gap: 8 }}
            >
              {drama.networks.map((n) => (
                <View key={n.id} className="px-3 py-1 rounded-full bg-dark-100">
                  <Text className="text-light-200 text-[12px]">{n.name}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Genres */}
          {drama.genres && drama.genres.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-2"
              contentContainerStyle={{ gap: 8 }}
            >
              {drama.genres.map((g) => (
                <View key={g.id} className="px-3 py-1 border rounded-full border-accent/50">
                  <Text className="text-accent text-[12px]">{g.name}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Watchlist button */}
          <View className="flex-row mt-4 gap-x-3">
            {watchlistItem ? (
              <>
                <TouchableOpacity
                  onPress={() => setShowStatusModal(true)}
                  activeOpacity={0.8}
                  className="items-center flex-1 py-3 border border-accent rounded-xl"
                >
                  <View className="flex-row items-center gap-x-2">
                    <StatusIcon iconName={STATUS_OPTIONS.find((o) => o.value === watchlistItem.status)?.icon ?? 'play'} />
                    <Text className={`font-semibold text-[14px] ${STATUS_COLORS[watchlistItem.status]}`}>
                      {STATUS_OPTIONS.find((o) => o.value === watchlistItem.status)?.label}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRemove}
                  activeOpacity={0.8}
                  className="items-center justify-center px-4 border border-red-500/50 rounded-xl"
                >
                  <Trash2 size={20} strokeWidth={2} color="#F87171" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => setShowStatusModal(true)}
                activeOpacity={0.8}
                className="items-center flex-1 py-3 bg-accent rounded-xl"
              >
                <Text className="text-primary font-bold text-[14px]">+ Add to Watchlist</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Synopsis */}
          {drama.overview ? (
            <View className="mt-5">
              <Text className="mb-2 text-base font-semibold text-white">Synopsis</Text>
              <Text
                className="text-light-200 text-[13px] leading-5"
                numberOfLines={synopsisExpanded ? undefined : 3}
              >
                {drama.overview}
              </Text>
              <TouchableOpacity onPress={() => setSynopsisExpanded((p) => !p)} className="mt-1">
                <Text className="text-accent text-[13px]">
                  {synopsisExpanded ? 'Show less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Cast */}
          {cast.length > 0 && (
            <View className="mt-5">
              <Text className="mb-3 text-base font-semibold text-white">Cast</Text>
              <FlatList<TMDBCast>
                data={cast.slice(0, 15)}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => <CastCard cast={item} />}
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled
              />
            </View>
          )}

          {/* Episodes */}
          {episodes && episodes.length > 0 && (
            <View className="mt-5">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-semibold text-white">
                  Episodes
                </Text>
                {drama && drama.number_of_seasons && drama.number_of_seasons > 1 && (
                  <View className="flex-row gap-x-2">
                    {Array.from({ length: drama.number_of_seasons }, (_, i) => i + 1).map(
                      (season) => (
                        <TouchableOpacity
                          key={season}
                          onPress={() => setSelectedSeason(season)}
                          className={`px-3 py-1 rounded-full ${selectedSeason === season ? 'bg-accent' : 'bg-dark-100'
                            }`}
                        >
                          <Text
                            className={`text-[12px] font-medium ${selectedSeason === season ? 'text-primary' : 'text-light-200'
                              }`}
                          >
                            S{season}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                )}
              </View>
              {episodes.map((ep: TMDBEpisode) => {
                const isReleased = !!ep.air_date;
                return (
                  <EpisodeRow
                    key={ep.id}
                    episode={ep}
                    watched={isEpisodeWatched(dramaId, 'kdrama', ep.episode_number)}
                    onToggle={() => {
                      if (isReleased) handleToggleEpisode(ep.episode_number);
                    }}
                    isReleased={isReleased}
                  />
                );
              })}
            </View>
          )}

          {/* Recommended For You */}
          {recommended && recommended.length > 0 && (
            <View className="mt-6">
              <Text className="mb-3 text-base font-semibold text-white">Recommended For You</Text>
              <FlatList<TMDBDrama>
                data={recommended.slice(0, 10)}
                keyExtractor={(item) => `recommended-${item.id}`}
                renderItem={({ item }) => (
                  <View className="mr-3">
                    <DramaCard
                      drama={item}
                      compact
                      onPress={() => {
                        const route = item.media_type === 'movie' ? `/movie/${item.id}` : `/drama/${item.id}`;
                        router.push(route);
                      }}
                    />
                  </View>
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled
                contentContainerStyle={{ paddingRight: 16 }}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Status selection modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity
          className="justify-end flex-1 bg-black/60"
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View className="px-6 pt-6 pb-10 bg-dark-100 rounded-t-3xl">
            <Text className="mb-5 text-lg font-bold text-center text-white">
              {watchlistItem ? 'Change Status' : 'Add to Watchlist'}
            </Text>
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleAddOrUpdate(option.value)}
                activeOpacity={0.8}
                className={`flex-row items-center py-4 border-b border-dark-200 ${watchlistItem?.status === option.value ? 'opacity-100' : 'opacity-80'
                  }`}
              >
                <View className="mr-3">
                  <StatusIcon iconName={option.icon} />
                </View>
                <Text className="flex-1 text-base text-white">{option.label}</Text>
                {watchlistItem?.status === option.value && (
                  <Check size={20} strokeWidth={2} color="#AB8BFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal >
    </>
  );
}
