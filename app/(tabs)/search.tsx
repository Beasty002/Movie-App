import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { searchDramas } from '@/services/tmdb';
import DramaCard from '@/components/drama/DramaCard';
import type { TMDBDrama } from '@/types';

function SkeletonCard() {
  return (
    <View className="flex-row bg-dark-100 rounded-xl p-3 mb-3">
      <View style={{ width: 70, height: 100, borderRadius: 8, backgroundColor: '#221F3D' }} />
      <View className="flex-1 ml-3 justify-between py-0.5">
        <View>
          <View className="h-4 bg-dark-200 rounded w-3/4" />
          <View className="h-3 bg-dark-200 rounded w-1/2 mt-2" />
        </View>
        <View className="h-3 bg-dark-200 rounded w-1/3" />
      </View>
    </View>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

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

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchDramas(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const results = data?.results ?? [];
  const showSkeleton = isLoading && debouncedQuery.length > 0;

  const renderEmpty = () => {
    if (showSkeleton) return null;
    if (isError) {
      return (
        <View className="flex-1 items-center justify-center pt-20">
          <Text className="text-light-300 text-base text-center">
            Something went wrong.{'\n'}Try again.
          </Text>
        </View>
      );
    }
    if (debouncedQuery.length === 0) {
      return (
        <View className="flex-1 items-center justify-center pt-20">
          <Text className="text-3xl mb-3">🎬</Text>
          <Text className="text-light-200 text-base text-center">
            Search for K-Dramas,{'\n'}Anime, or Movies
          </Text>
        </View>
      );
    }
    return (
      <View className="flex-1 items-center justify-center pt-20">
        <Text className="text-light-300 text-base text-center">
          No results for "{debouncedQuery}"
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-primary pt-14">
      {/* Search bar */}
      <View className="px-4 mb-4">
        <View className="flex-row items-center bg-dark-100 rounded-xl px-4">
          <Text className="text-light-300 text-base mr-2">🔍</Text>
          <TextInput
            ref={inputRef}
            className="flex-1 text-white text-base py-3.5"
            placeholder="Search dramas, anime, movies..."
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
              <Text className="text-light-300 text-lg">✕</Text>
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
        <FlatList<TMDBDrama>
          data={results}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <DramaCard
              drama={item}
              onPress={() => router.push(`/drama/${item.id}`)}
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
