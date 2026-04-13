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
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getDramaDetail, getDramaEpisodes, getImageUrl } from '@/services/tmdb';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { TMDBCast, TMDBEpisode, WatchlistStatus } from '@/types';

const STATUS_OPTIONS: { value: WatchlistStatus; label: string; emoji: string }[] = [
  { value: 'watching', label: 'Watching', emoji: '▶️' },
  { value: 'planning', label: 'Plan to Watch', emoji: '📋' },
  { value: 'completed', label: 'Completed', emoji: '✅' },
  { value: 'dropped', label: 'Dropped', emoji: '🚫' },
];

const STATUS_COLORS: Record<WatchlistStatus, string> = {
  watching: 'text-blue-400',
  completed: 'text-green-400',
  planning: 'text-gray-400',
  dropped: 'text-red-400',
};

function CastCard({ cast }: { cast: TMDBCast }) {
  const photoUrl = getImageUrl(cast.profile_path, 'w300');
  return (
    <View className="mr-3 w-20 items-center">
      <Image
        source={photoUrl ? { uri: photoUrl } : undefined}
        style={{ width: 64, height: 64, borderRadius: 32 }}
        contentFit="cover"
        placeholder={{ color: '#221F3D' }}
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
}: {
  episode: TMDBEpisode;
  watched: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="flex-row items-center py-3 border-b border-dark-100">
      <View className="flex-1 mr-3">
        <Text className="text-white text-[13px] font-medium">
          Ep {episode.episode_number} · {episode.name}
        </Text>
        {episode.air_date ? (
          <Text className="text-light-300 text-[11px] mt-0.5">{episode.air_date}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        className={`w-7 h-7 rounded-full border-2 items-center justify-center ${
          watched ? 'bg-accent border-accent' : 'border-light-200'
        }`}
      >
        {watched ? <Text className="text-primary text-xs font-bold">✓</Text> : null}
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

  const watchlistItem = getItemByMedia(dramaId, 'kdrama');

  const { data: drama, isLoading, isError } = useQuery({
    queryKey: ['drama', id],
    queryFn: () => getDramaDetail(dramaId),
  });

  const { data: episodes } = useQuery({
    queryKey: ['drama', id, 'episodes', 1],
    queryFn: () => getDramaEpisodes(dramaId, 1),
    enabled: !!drama && (drama.number_of_seasons ?? 0) > 0,
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
      if (watched) {
        await unmarkEpisode(user.id, dramaId, 'kdrama', episodeNumber);
      } else {
        await markEpisodeWatched(user.id, dramaId, 'kdrama', episodeNumber);
      }
    },
    [user, dramaId, isEpisodeWatched, markEpisodeWatched, unmarkEpisode],
  );

  const handleAddOrUpdate = useCallback(
    async (status: WatchlistStatus) => {
      if (!user || !drama) return;
      setShowStatusModal(false);

      if (watchlistItem) {
        await updateStatus(watchlistItem.id, status);
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
        onPress: () => removeFromWatchlist(watchlistItem.id),
      },
    ]);
  }, [watchlistItem, removeFromWatchlist]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator color="#AB8BFF" size="large" />
      </View>
    );
  }

  if (isError || !drama) {
    return (
      <View className="flex-1 bg-primary items-center justify-center px-6">
        <Text className="text-light-300 text-base text-center">
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
          <Image
            source={backdropUrl ? { uri: backdropUrl } : undefined}
            style={{ width: '100%', height: 220 }}
            contentFit="cover"
            placeholder={{ color: '#221F3D' }}
          />
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-12 left-4 w-9 h-9 bg-black/50 rounded-full items-center justify-center"
          >
            <Text className="text-white text-base">‹</Text>
          </TouchableOpacity>

          {/* Poster */}
          <View className="absolute left-4" style={{ bottom: 0 }}>
            <Image
              source={posterUrl ? { uri: posterUrl } : undefined}
              style={{ width: 90, height: 130, borderRadius: 10 }}
              contentFit="cover"
              placeholder={{ color: '#221F3D' }}
            />
          </View>
        </View>

        <View className="px-4">
          {/* Title */}
          <View className="ml-28">
            <Text className="text-white font-bold text-xl" numberOfLines={3}>
              {drama.name}
            </Text>
            <Text className="text-light-200 text-[15px] mt-1">{drama.original_name}</Text>
          </View>

          {/* Meta row */}
          <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1 mt-3">
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
                <View key={n.id} className="bg-dark-100 px-3 py-1 rounded-full">
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
                <View key={g.id} className="border border-accent/50 px-3 py-1 rounded-full">
                  <Text className="text-accent text-[12px]">{g.name}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Watchlist button */}
          <View className="mt-4 flex-row gap-x-3">
            {watchlistItem ? (
              <>
                <TouchableOpacity
                  onPress={() => setShowStatusModal(true)}
                  activeOpacity={0.8}
                  className="flex-1 border border-accent rounded-xl py-3 items-center"
                >
                  <Text className={`font-semibold text-[14px] ${STATUS_COLORS[watchlistItem.status]}`}>
                    {STATUS_OPTIONS.find((o) => o.value === watchlistItem.status)?.emoji}{' '}
                    {STATUS_OPTIONS.find((o) => o.value === watchlistItem.status)?.label}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRemove}
                  activeOpacity={0.8}
                  className="border border-red-500/50 px-4 rounded-xl items-center justify-center"
                >
                  <Text className="text-red-400 text-base">🗑</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => setShowStatusModal(true)}
                activeOpacity={0.8}
                className="flex-1 bg-accent rounded-xl py-3 items-center"
              >
                <Text className="text-primary font-bold text-[14px]">+ Add to Watchlist</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Synopsis */}
          {drama.overview ? (
            <View className="mt-5">
              <Text className="text-white font-semibold text-base mb-2">Synopsis</Text>
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
              <Text className="text-white font-semibold text-base mb-3">Cast</Text>
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
              <Text className="text-white font-semibold text-base mb-1">
                Episodes · Season 1
              </Text>
              {episodes.map((ep: TMDBEpisode) => (
                <EpisodeRow
                  key={ep.id}
                  episode={ep}
                  watched={isEpisodeWatched(dramaId, 'kdrama', ep.episode_number)}
                  onToggle={() => handleToggleEpisode(ep.episode_number)}
                />
              ))}
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
          className="flex-1 bg-black/60 justify-end"
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View className="bg-dark-100 rounded-t-3xl px-6 pt-6 pb-10">
            <Text className="text-white font-bold text-lg mb-5 text-center">
              {watchlistItem ? 'Change Status' : 'Add to Watchlist'}
            </Text>
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleAddOrUpdate(option.value)}
                activeOpacity={0.8}
                className={`flex-row items-center py-4 border-b border-dark-200 ${
                  watchlistItem?.status === option.value ? 'opacity-100' : 'opacity-80'
                }`}
              >
                <Text className="text-2xl mr-3">{option.emoji}</Text>
                <Text className="text-white text-base flex-1">{option.label}</Text>
                {watchlistItem?.status === option.value && (
                  <Text className="text-accent">✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
