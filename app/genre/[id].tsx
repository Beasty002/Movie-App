import DramaCard from '@/components/drama/DramaCard';
import { discoverByGenre } from '@/services/tmdb';
import type { TMDBDrama } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';

type MediaFilter = 'all' | 'tv' | 'movie';

function SkeletonCard() {
  return (
    <View className="flex-row p-3 mb-3 bg-dark-100 rounded-xl">
      <View style={{ width: 70, height: 100, borderRadius: 8, backgroundColor: '#221F3D' }} />
      <View className="flex-1 ml-3 justify-between py-0.5">
        <View>
          <View className="w-3/4 h-4 rounded bg-dark-200" />
          <View className="w-1/2 h-3 mt-2 rounded bg-dark-200" />
        </View>
        <View className="w-1/3 h-3 rounded bg-dark-200" />
      </View>
    </View>
  );
}

export default function GenreScreen() {
  const { id, name, mediaType } = useLocalSearchParams<{
    id: string;
    name: string;
    mediaType?: string;
  }>();
  const genreId = parseInt(id, 10);
  const router = useRouter();

  const defaultFilter: MediaFilter =
    mediaType === 'tv' ? 'tv' : mediaType === 'movie' ? 'movie' : 'all';
  const [filter, setFilter] = useState<MediaFilter>(defaultFilter);

  const { data: tvData, isLoading: tvLoading } = useQuery({
    queryKey: ['genre', id, 'tv'],
    queryFn: () => discoverByGenre('tv', genreId),
    enabled: filter === 'all' || filter === 'tv',
    staleTime: 5 * 60 * 1000,
  });

  const { data: movieData, isLoading: movieLoading } = useQuery({
    queryKey: ['genre', id, 'movie'],
    queryFn: () => discoverByGenre('movie', genreId),
    enabled: filter === 'all' || filter === 'movie',
    staleTime: 5 * 60 * 1000,
  });

  const results: TMDBDrama[] = (() => {
    const merged: TMDBDrama[] = [];
    if (filter === 'all' || filter === 'tv') {
      merged.push(...(tvData?.results ?? []));
    }
    if (filter === 'all' || filter === 'movie') {
      merged.push(...(movieData?.results ?? []));
    }
    if (filter === 'all') {
      merged.sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
    }
    return merged;
  })();

  const isLoading =
    (filter === 'all' && (tvLoading || movieLoading)) ||
    (filter === 'tv' && tvLoading) ||
    (filter === 'movie' && movieLoading);

  const handlePress = (item: TMDBDrama) => {
    const route = item.media_type === 'movie' ? `/movie/${item.id}` : `/drama/${item.id}`;
    router.push(route as never);
  };

  return (
    <View className="flex-1 bg-primary pt-14">
      {/* Header */}
      <View className="flex-row items-center px-4 mb-5 gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="items-center justify-center rounded-full w-9 h-9 bg-dark-100"
        >
          <Text className="text-base text-white">‹</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">{name ?? 'Genre'}</Text>
      </View>

      {/* Filter tabs */}
      <View className="flex-row px-4 gap-2 mb-4">
        {(['all', 'tv', 'movie'] as MediaFilter[]).map(opt => (
          <TouchableOpacity
            key={opt}
            onPress={() => setFilter(opt)}
            className={`px-4 py-1.5 rounded-full ${filter === opt ? 'bg-accent' : 'bg-dark-100'}`}
          >
            <Text
              className={`text-[13px] font-medium ${filter === opt ? 'text-primary' : 'text-light-200'}`}
            >
              {opt === 'all' ? 'All' : opt === 'tv' ? 'TV & Anime' : 'Movies'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View className="px-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : results.length === 0 ? (
        <View className="items-center justify-center flex-1">
          <Text className="text-light-300 text-[13px]">No results found</Text>
        </View>
      ) : (
        <FlatList<TMDBDrama>
          data={results}
          keyExtractor={(item, idx) => `${item.media_type}-${item.id}-${idx}`}
          renderItem={({ item }) => (
            <DramaCard drama={item} onPress={() => handlePress(item)} />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <Text className="text-light-300 text-[12px] mb-3">
              {results.length}+ results
            </Text>
          )}
        />
      )}
    </View>
  );
}
