import MediaDetailContent from '@/components/media/MediaDetailContent';
import { getDramaDetail, getDramaEpisodes, getRecommendedContent } from '@/services/tmdb';
import { useAuthStore } from '@/store/useAuthStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import type { WatchlistStatus } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

export default function DramaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dramaId = parseInt(id, 10);
  const queryClient = useQueryClient();

  const { user } = useAuthStore();
  const { addToWatchlist, updateStatus, removeFromWatchlist, getItemByMedia } = useWatchlistStore();
  const { fetchProgress, markEpisodeWatched, unmarkEpisode, isEpisodeWatched, getWatchedCount } = useProgressStore();

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);

  const watchlistItem = getItemByMedia(dramaId, 'kdrama');

  const { data: drama, isLoading, isError } = useQuery({
    queryKey: ['drama', id],
    queryFn: () => getDramaDetail(dramaId),
  });

  const { data: episodes, isLoading: isEpisodesLoading } = useQuery({
    queryKey: ['drama', id, 'episodes', selectedSeason],
    queryFn: () => getDramaEpisodes(dramaId, selectedSeason),
    enabled: !!drama && (drama.number_of_seasons ?? 0) >= selectedSeason,
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
      if (!user || !drama) return;
      const watched = isEpisodeWatched(dramaId, 'kdrama', episodeNumber);
      try {
        if (watched) {
          await unmarkEpisode(user.id, dramaId, 'kdrama', episodeNumber);
          Toast.show({
            type: 'success',
            text1: 'Episode marked as unwatched',
          });
        } else {
          await markEpisodeWatched(user.id, dramaId, 'kdrama', episodeNumber);
          Toast.show({
            type: 'success',
            text1: 'Episode marked as watched',
          });

          // Auto-add to watchlist if not already there
          if (!watchlistItem) {
            await addToWatchlist(
              {
                media_id: drama.id,
                media_type: 'kdrama',
                media_title: drama.name || '',
                media_title_korean: drama.original_name ?? null,
                media_poster: drama.poster_path,
                media_year: drama.first_air_date ? parseInt(drama.first_air_date.split('-')[0], 10) : null,
                total_episodes: drama.number_of_episodes ?? null,
                status: 'watching',
              },
              user.id,
            );
          } else if (watchlistItem.status === 'planning') {
            // Auto-change from planning to watching when marking episodes
            await updateStatus(watchlistItem.id, 'watching');
          }
        }

        // Trigger store refresh to update watchlist reactivity
        await queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Failed to update episode',
        });
      }
    },
    [user, drama, dramaId, isEpisodeWatched, markEpisodeWatched, unmarkEpisode, addToWatchlist, updateStatus, watchlistItem, queryClient],
  );

  const handleMarkAllSeason = useCallback(
    async (markAsWatched: boolean) => {
      if (!user || !episodes || !drama) return;
      try {
        const releasedEpisodes = episodes.filter((ep) => ep.air_date);
        for (const episode of releasedEpisodes) {
          const isWatched = isEpisodeWatched(dramaId, 'kdrama', episode.episode_number);
          if (markAsWatched && !isWatched) {
            await markEpisodeWatched(user.id, dramaId, 'kdrama', episode.episode_number);
          } else if (!markAsWatched && isWatched) {
            await unmarkEpisode(user.id, dramaId, 'kdrama', episode.episode_number);
          }
        }
        Toast.show({
          type: 'success',
          text1: markAsWatched ? 'Season marked as watched' : 'Season marked as unwatched',
        });

        // Auto-add to watchlist if not already there
        let currentItem = getItemByMedia(dramaId, 'kdrama');
        if (!currentItem) {
          await addToWatchlist(
            {
              media_id: drama.id,
              media_type: 'kdrama',
              media_title: drama.name || '',
              media_title_korean: drama.original_name ?? null,
              media_poster: drama.poster_path,
              media_year: drama.first_air_date ? parseInt(drama.first_air_date.split('-')[0], 10) : null,
              total_episodes: drama.number_of_episodes ?? null,
              status: markAsWatched ? 'completed' : 'watching',
            },
            user.id,
          );
        } else if (markAsWatched) {
          // Check if all episodes are watched - if so, mark as completed
          const totalEpisodes = drama.number_of_episodes ?? 0;
          const watchedCount = getWatchedCount(dramaId, 'kdrama');
          if (watchedCount >= totalEpisodes && totalEpisodes > 0) {
            await updateStatus(currentItem.id, 'completed');
          } else if (currentItem.status === 'planning') {
            await updateStatus(currentItem.id, 'watching');
          }
        }

        // Trigger store refresh to update watchlist reactivity
        await queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Failed to update season',
        });
      }
    },
    [user, dramaId, drama, episodes, isEpisodeWatched, markEpisodeWatched, unmarkEpisode, addToWatchlist, updateStatus, getWatchedCount, getItemByMedia, queryClient],
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
          });
        } else {
          await addToWatchlist(
            {
              media_id: drama.id,
              media_type: 'kdrama',
              media_title: drama.name || '',
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
          });
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Failed to update watchlist',
        });
      }
    },
    [user, drama, watchlistItem, addToWatchlist, updateStatus],
  );

  const handleRemove = useCallback(() => {
    if (!watchlistItem) return;
    setShowRemoveModal(true);
  }, [watchlistItem]);

  const confirmRemove = useCallback(async () => {
    if (!watchlistItem) return;
    setShowRemoveModal(false);
    try {
      await removeFromWatchlist(watchlistItem.id);
      Toast.show({
        type: 'success',
        text1: 'Removed from watchlist',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to remove',
      });
    }
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
        <Text className="text-base text-center text-light-300">Failed to load drama details.</Text>
      </View>
    );
  }

  return (
    <>
      <MediaDetailContent
        media={drama}
        watchlistItem={watchlistItem}
        synopsis={drama.overview}
        synopsisExpanded={synopsisExpanded}
        onSynopsisToggle={() => setSynopsisExpanded((p) => !p)}
        showStatusModal={showStatusModal}
        onStatusModalToggle={setShowStatusModal}
        onStatusSelect={handleAddOrUpdate}
        onRemove={handleRemove}
        recommended={recommended}
        networks={drama.networks}
        episodes={episodes}
        selectedSeason={selectedSeason}
        onSeasonChange={setSelectedSeason}
        isDrama
        isEpisodesLoading={isEpisodesLoading}
        isEpisodeWatched={(episodeNumber) => isEpisodeWatched(dramaId, 'kdrama', episodeNumber)}
        onToggleEpisode={handleToggleEpisode}
        onMarkAllSeason={handleMarkAllSeason}
      />

      {/* Remove Confirmation Modal */}
      <Modal
        visible={showRemoveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemoveModal(false)}
      >
        <TouchableOpacity
          className="items-center justify-center flex-1 bg-black/60"
          activeOpacity={1}
          onPress={() => setShowRemoveModal(false)}
        >
          <View className="px-6 py-6 bg-dark-100 rounded-2xl w-80">
            <Text className="mb-2 text-lg font-bold text-white">Remove from Watchlist?</Text>
            <Text className="mb-6 text-sm text-light-300">This action cannot be undone.</Text>
            <View className="flex-row gap-x-3">
              <TouchableOpacity
                onPress={() => setShowRemoveModal(false)}
                activeOpacity={0.7}
                className="items-center flex-1 py-3 border rounded-lg border-light-200"
              >
                <Text className="text-sm font-semibold text-light-200">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmRemove}
                activeOpacity={0.7}
                className="items-center flex-1 py-3 border border-red-500 rounded-lg bg-red-500/30"
              >
                <Text className="text-sm font-semibold text-red-400">Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
