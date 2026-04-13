import MediaDetailContent from '@/components/media/MediaDetailContent';
import { getDramaDetail, getDramaEpisodes, getRecommendedContent } from '@/services/tmdb';
import { useAuthStore } from '@/store/useAuthStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import type { WatchlistStatus } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

export default function DramaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
          });
        } else {
          await markEpisodeWatched(user.id, dramaId, 'kdrama', episodeNumber);
          Toast.show({
            type: 'success',
            text1: 'Episode marked as watched',
          });
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Failed to update episode',
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
            });
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: 'Failed to remove',
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
        <Text className="text-base text-center text-light-300">Failed to load drama details.</Text>
      </View>
    );
  }

  return (
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
      isEpisodeWatched={(episodeNumber) => isEpisodeWatched(dramaId, 'kdrama', episodeNumber)}
      onToggleEpisode={handleToggleEpisode}
    />
  );
}
