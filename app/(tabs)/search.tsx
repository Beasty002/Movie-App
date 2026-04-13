import DramaCard from '@/components/drama/DramaCard';
import { searchDramas, searchMovies } from '@/services/tmdb';
import type { TMDBDrama } from '@/types';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Film } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type FilterType = 'all' | 'tv' | 'movie';

interface ResultWithType extends TMDBDrama {
  media_type: 'tv' | 'movie';
}

function SkeletonCard() {
  return (
    <View className="flex-row p-3 mb-2 bg-dark-100 rounded-xl">
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

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // Auto-focus when the tab is focused
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }, []),
  );

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Search TV and Movies
  const { data: tvData, isLoading: tvLoading } = useQuery({
    queryKey: ['search-tv', debouncedQuery],
    queryFn: () => searchDramas(debouncedQuery),
    enabled: debouncedQuery.length > 0 && (filter === 'all' || filter === 'tv'),
    staleTime: 2 * 60 * 1000,
  });

  const { data: movieData, isLoading: movieLoading } = useQuery({
    queryKey: ['search-movie', debouncedQuery],
    queryFn: () => searchMovies(debouncedQuery),
    enabled: debouncedQuery.length > 0 && (filter === 'all' || filter === 'movie'),
    staleTime: 2 * 60 * 1000,
  });

  // Merge and filter results
  const results: ResultWithType[] = (() => {
    const merged: ResultWithType[] = [];

    if (filter === 'all' || filter === 'tv') {
      const tvResults = tvData?.results ?? [];
      merged.push(...tvResults.map(item => ({ ...item, media_type: 'tv' as const })));
    }

    if (filter === 'all' || filter === 'movie') {
      const movieResults = movieData?.results ?? [];
      merged.push(...movieResults.map(item => ({ ...item, media_type: 'movie' as const })));
    }

    // Sort by vote_average if showing all types
    if (filter === 'all') {
      merged.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    }

    return merged;
  })();

  const showSkeleton = (tvLoading || movieLoading) && debouncedQuery.length > 0;
  const isError = false;

  const handleResultPress = (item: ResultWithType) => {
    const route = item.media_type === 'movie' ? `/movie/${item.id}` : `/drama/${item.id}`;
    router.push(route);
  };

  const renderEmpty = () => {
    if (showSkeleton) return null;
    if (isError) {
      return (
        <View className="items-center justify-center flex-1 pt-20">
          <Text className="text-base text-center text-light-300">
            Something went wrong.{'\n'}Try again.
          </Text>
        </View>
      );
    }
    if (debouncedQuery.length === 0) {
      return (
        <View className="items-center justify-center flex-1 pt-20">
          <Text className="text-base text-center text-light-200">
            Search for K-Dramas, Anime, or Movies
          </Text>
        </View>
      );
    }
    return (
      <View className="items-center justify-center flex-1 pt-20">
        <Text className="text-base text-center text-light-300">
          No results for "{debouncedQuery}"
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-primary pt-14">
      {/* Filter selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 mb-4"
        contentContainerStyle={{ gap: 8 }}
      >
        {(['all', 'tv', 'movie'] as FilterType[]).map(filterOption => (
          <TouchableOpacity
            key={filterOption}
            onPress={() => setFilter(filterOption)}
            activeOpacity={0.8}
            className={`flex-row items-center gap-2 px-3 py-1 rounded-full flex-shrink-0 ${filter === filterOption ? 'bg-accent' : 'bg-dark-100'
              }`}
          >
            <Film size={16} color={filter === filterOption ? '#030014' : '#AB8BFF'} strokeWidth={2} />
            <Text
              className={`text-sm font-medium ${filter === filterOption
                ? 'text-primary'
                : 'text-light-200'
                }`}
            >
              {filterOption === 'all' ? 'All' : filterOption === 'tv' ? 'TV & Anime' : 'Movies'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search bar */}
      <View className="px-4 mb-4">
        <View className="flex-row items-center px-4 bg-dark-100 rounded-xl">
          <Film size={20} color="#9CA4AB" strokeWidth={1.5} />
          <TextInput
            ref={inputRef}
            className="flex-1 text-white text-base py-3.5 ml-2"
            placeholder="Search dramas, movies, anime..."
            placeholderTextColor="#9CA4AB"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Text className="text-lg text-light-300">✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Skeleton */}
      {showSkeleton && (
        <View className="px-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      )}

      {/* Results */}
      {!showSkeleton && (
        <FlatList<ResultWithType>
          data={results}
          keyExtractor={(item, idx) => `${item.media_type}-${item.id}-${idx}`}
          renderItem={({ item }) => (
            <DramaCard
              drama={item}
              onPress={() => handleResultPress(item)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, flexGrow: 1 }}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
}
