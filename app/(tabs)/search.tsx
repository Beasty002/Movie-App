import DramaCard from '@/components/drama/DramaCard';
import { discoverMovies, discoverTV, searchDramas, searchMovies } from '@/services/tmdb';
import type { TMDBDrama } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Film, Flame, Search, Sliders, XCircle } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type FilterType = 'all' | 'tv' | 'movie';
type SortBy = 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc' | 'first_air_date.desc';

interface ResultWithType extends TMDBDrama {
  media_type: 'tv' | 'movie';
}

interface AdvancedFilters {
  sortBy: SortBy;
  yearMin: string;
  yearMax: string;
  genreIds: number[];
  voteMinimum: number;
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

const GENRE_OPTIONS = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 10770, name: 'TV Movie' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

const CURRENT_YEAR = new Date().getFullYear();

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    sortBy: 'popularity.desc',
    yearMin: '',
    yearMax: String(CURRENT_YEAR),
    genreIds: [],
    voteMinimum: 0,
  });

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Build filter params - TMDB format (for discover endpoints)
  const buildFilterParams = () => {
    const params: Record<string, string> = {};
    if (advancedFilters.sortBy) params.sort_by = advancedFilters.sortBy;
    // For year filtering in discover
    if (advancedFilters.yearMin) params.primary_release_date_gte = `${advancedFilters.yearMin}-01-01`;
    if (advancedFilters.yearMin && !advancedFilters.yearMax) params.first_air_date_gte = `${advancedFilters.yearMin}-01-01`;
    if (advancedFilters.yearMax) params.primary_release_date_lte = `${advancedFilters.yearMax}-12-31`;
    if (advancedFilters.yearMax && !advancedFilters.yearMin) params.first_air_date_lte = `${advancedFilters.yearMax}-12-31`;
    // Genre filtering
    if (advancedFilters.genreIds.length > 0) params.with_genres = advancedFilters.genreIds.join(',');
    // Vote average
    if (advancedFilters.voteMinimum > 0) params.vote_average_gte = String(advancedFilters.voteMinimum);
    return params;
  };

  // Check if we have active filters
  const hasActiveFilters = advancedFilters.genreIds.length > 0 ||
    advancedFilters.yearMin ||
    advancedFilters.voteMinimum > 0;

  // Search TV and Movies
  const { data: tvData, isLoading: tvLoading } = useQuery({
    queryKey: ['search-tv', debouncedQuery, advancedFilters],
    queryFn: () => {
      if (debouncedQuery) {
        // Use search endpoint for text queries (filters will be applied client-side)
        return searchDramas(debouncedQuery);
      }
      // Use discover with filters only (no text query)
      return discoverTV(buildFilterParams());
    },
    enabled: debouncedQuery.length > 0 && (filter === 'all' || filter === 'tv'),
    staleTime: 2 * 60 * 1000,
  });

  const { data: movieData, isLoading: movieLoading } = useQuery({
    queryKey: ['search-movie', debouncedQuery, advancedFilters],
    queryFn: () => {
      if (debouncedQuery) {
        // Use search endpoint for text queries (filters will be applied client-side)
        return searchMovies(debouncedQuery);
      }
      // Use discover with filters only (no text query)
      return discoverMovies(buildFilterParams());
    },
    enabled: debouncedQuery.length > 0 && (filter === 'all' || filter === 'movie'),
    staleTime: 2 * 60 * 1000,
  });

  // Trending content for initial display
  const { data: trendingTvData, isLoading: trendingTvLoading } = useQuery({
    queryKey: ['trending-tv'],
    queryFn: () => discoverTV({ sort_by: 'popularity.desc' }),
    enabled: debouncedQuery.length === 0,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const { data: trendingMovieData, isLoading: trendingMovieLoading } = useQuery({
    queryKey: ['trending-movie'],
    queryFn: () => discoverMovies({ sort_by: 'popularity.desc' }),
    enabled: debouncedQuery.length === 0,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Filter results client-side based on advanced filters
  const filterResults = (items: ResultWithType[]): ResultWithType[] => {
    return items.filter(item => {
      // Genre filter
      if (advancedFilters.genreIds.length > 0) {
        const itemGenreIds = item.genre_ids || [];
        const hasMatchingGenre = advancedFilters.genreIds.some(gid => itemGenreIds.includes(gid));
        if (!hasMatchingGenre) return false;
      }

      // Vote average filter
      if (advancedFilters.voteMinimum > 0) {
        if ((item.vote_average || 0) < advancedFilters.voteMinimum) return false;
      }

      // Year filter
      if (advancedFilters.yearMin || advancedFilters.yearMax) {
        const itemYear = parseInt(
          item.release_date?.substring(0, 4) || item.first_air_date?.substring(0, 4) || '0'
        );
        if (advancedFilters.yearMin && itemYear < parseInt(advancedFilters.yearMin)) return false;
        if (advancedFilters.yearMax && itemYear > parseInt(advancedFilters.yearMax)) return false;
      }

      return true;
    });
  };

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

    // Apply client-side filtering only when we have a text query
    const filteredResults = debouncedQuery && hasActiveFilters ? filterResults(merged) : merged;

    // Sort by vote_average if showing all types
    if (filter === 'all') {
      filteredResults.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    }

    return filteredResults;
  })();

  // Trending results for initial display
  const trendingResults: ResultWithType[] = (() => {
    if (debouncedQuery.length > 0) return [];

    const merged: ResultWithType[] = [];

    if (filter === 'all' || filter === 'tv') {
      const tvResults = trendingTvData?.results ?? [];
      merged.push(...tvResults.map(item => ({ ...item, media_type: 'tv' as const })));
    }

    if (filter === 'all' || filter === 'movie') {
      const movieResults = trendingMovieData?.results ?? [];
      merged.push(...movieResults.map(item => ({ ...item, media_type: 'movie' as const })));
    }

    return merged;
  })();

  const showSkeleton = (tvLoading || movieLoading) && debouncedQuery.length > 0;
  const showTrendingSkeleton = (trendingTvLoading || trendingMovieLoading) && debouncedQuery.length === 0;

  const handleResultPress = (item: ResultWithType) => {
    const route = item.media_type === 'movie' ? `/movie/${item.id}` : `/drama/${item.id}`;
    router.push(route as never);
  };

  const renderEmpty = () => {
    if (showSkeleton) return null;
    if (debouncedQuery.length === 0) {
      return null; // Don't show empty state when we have trending content
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
      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <View style={{ height: '85%', backgroundColor: '#030014', borderTopLeftRadius: 24, borderTopRightRadius: 24, display: 'flex', flexDirection: 'column' }}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#221F3D' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>Advanced Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <XCircle size={24} color="#AB8BFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
            >
              {/* Sort By Section */}
              <View className="mb-6">
                <Text className="mb-3 font-semibold text-white">Sort By</Text>
                {[
                  { value: 'popularity.desc' as SortBy, label: 'Popularity' },
                  { value: 'vote_average.desc' as SortBy, label: 'Rating' },
                  { value: 'primary_release_date.desc' as SortBy, label: 'Newest (Movies)' },
                  { value: 'first_air_date.desc' as SortBy, label: 'Newest (TV)' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setAdvancedFilters(prev => ({ ...prev, sortBy: option.value }))}
                    className={`p-3 rounded-lg mb-2 flex-row items-center ${advancedFilters.sortBy === option.value ? 'bg-accent' : 'bg-dark-100'
                      }`}
                  >
                    <View
                      className={`w-5 h-5 rounded-full border-2 mr-3 ${advancedFilters.sortBy === option.value
                        ? 'bg-accent border-accent'
                        : 'border-light-300'
                        }`}
                    />
                    <Text
                      className={`${advancedFilters.sortBy === option.value ? 'text-primary font-semibold' : 'text-light-200'
                        }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Year Range Section */}
              <View className="mb-6">
                <Text className="mb-3 font-semibold text-white">Year Range</Text>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-light-300 text-xs mb-1.5">From</Text>
                    <TextInput
                      placeholder="1950"
                      value={advancedFilters.yearMin}
                      onChangeText={(text) => setAdvancedFilters(prev => ({ ...prev, yearMin: text }))}
                      keyboardType="numeric"
                      maxLength={4}
                      className="p-3 text-center text-white rounded-lg bg-dark-100"
                      placeholderTextColor="#9CA4AB"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-light-300 text-xs mb-1.5">To</Text>
                    <TextInput
                      placeholder={String(CURRENT_YEAR)}
                      value={advancedFilters.yearMax}
                      onChangeText={(text) => setAdvancedFilters(prev => ({ ...prev, yearMax: text }))}
                      keyboardType="numeric"
                      maxLength={4}
                      className="p-3 text-center text-white rounded-lg bg-dark-100"
                      placeholderTextColor="#9CA4AB"
                    />
                  </View>
                </View>
              </View>

              {/* Vote Average Section */}
              <View className="mb-6">
                <Text className="mb-3 font-semibold text-white">Minimum Rating</Text>
                <View className="flex-row gap-2">
                  {[0, 5, 6, 7, 8].map(rating => (
                    <TouchableOpacity
                      key={rating}
                      onPress={() => setAdvancedFilters(prev => ({ ...prev, voteMinimum: rating }))}
                      className={`flex-1 py-2 rounded-lg ${advancedFilters.voteMinimum === rating ? 'bg-accent' : 'bg-dark-100'
                        }`}
                    >
                      <Text
                        className={`text-center font-semibold ${advancedFilters.voteMinimum === rating ? 'text-primary' : 'text-light-200'
                          }`}
                      >
                        {rating === 0 ? 'Any' : `${rating}+`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Genre Section */}
              <View className="mb-6">
                <Text className="mb-3 font-semibold text-white">Genres</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {GENRE_OPTIONS.map(genre => (
                    <TouchableOpacity
                      key={genre.id}
                      onPress={() =>
                        setAdvancedFilters(prev => ({
                          ...prev,
                          genreIds: prev.genreIds.includes(genre.id)
                            ? prev.genreIds.filter(id => id !== genre.id)
                            : [...prev.genreIds, genre.id],
                        }))
                      }
                      className={`px-4 py-2 rounded-full ${advancedFilters.genreIds.includes(genre.id) ? 'bg-accent' : 'bg-dark-100'
                        }`}
                    >
                      <Text
                        className={`text-sm font-medium ${advancedFilters.genreIds.includes(genre.id)
                          ? 'text-primary'
                          : 'text-light-200'
                          }`}
                      >
                        {genre.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Sticky Footer with Buttons */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#030014', borderTopWidth: 1, borderTopColor: '#221F3D' }}>
              <TouchableOpacity
                onPress={() =>
                  setAdvancedFilters({
                    sortBy: 'popularity.desc',
                    yearMin: '',
                    yearMax: String(CURRENT_YEAR),
                    genreIds: [],
                    voteMinimum: 0,
                  })
                }
                style={{ backgroundColor: '#221F3D', paddingVertical: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#9CA4AB' }}
              >
                <Text style={{ color: '#9CA4AB', textAlign: 'center', fontWeight: '600' }}>Reset Filters</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={{ backgroundColor: '#AB8BFF', paddingVertical: 12, borderRadius: 8 }}
              >
                <Text style={{ color: '#030014', textAlign: 'center', fontWeight: 'bold' }}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Type Filter selector */}
      <View style={{ height: 36, marginBottom: 16, paddingHorizontal: 16 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {(['all', 'tv', 'movie'] as FilterType[]).map(filterOption => (
            <TouchableOpacity
              key={filterOption}
              onPress={() => setFilter(filterOption)}
              activeOpacity={0.8}
              style={{ height: 36, justifyContent: 'center' }}
              className={`flex-row items-center gap-2 px-3 py-0 rounded-full flex-shrink-0 ${filter === filterOption ? 'bg-accent' : 'bg-dark-100'
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
      </View>

      {/* Search Bar with Filter */}
      <View className="px-4 mb-4">
        <View className="flex-row items-center gap-2 mb-3">
          <View className="flex-row items-center flex-1 px-4 bg-dark-100 rounded-xl">
            <Search size={20} color="#9CA4AB" strokeWidth={1.5} />
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
                <XCircle size={18} color="#AB8BFF" strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            className="items-center justify-center p-3 bg-dark-100 rounded-xl"
            activeOpacity={0.7}
          >
            <Sliders size={20} color="#AB8BFF" strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Active Filters Indicator */}
        {(advancedFilters.genreIds.length > 0 ||
          advancedFilters.yearMin ||
          advancedFilters.voteMinimum > 0) && (
            <View className="flex-row flex-wrap items-center gap-2 px-2 mt-2">
              <Text className="text-xs text-light-300">Active Filters:</Text>
              <View className="flex-row flex-wrap gap-2">
                {advancedFilters.genreIds.map(genreId => {
                  const genre = GENRE_OPTIONS.find(g => g.id === genreId);
                  return genre ? (
                    <TouchableOpacity
                      key={genreId}
                      onPress={() =>
                        setAdvancedFilters(prev => ({
                          ...prev,
                          genreIds: prev.genreIds.filter(id => id !== genreId),
                        }))
                      }
                      className="flex-row items-center gap-2 px-3 py-2 rounded-full bg-dark-100"
                    >
                      <Text className="text-sm font-semibold text-accent">{genre.name}</Text>
                      <XCircle size={16} color="#AB8BFF" strokeWidth={2} />
                    </TouchableOpacity>
                  ) : null;
                })}
                {advancedFilters.yearMin && (
                  <TouchableOpacity
                    onPress={() =>
                      setAdvancedFilters(prev => ({
                        ...prev,
                        yearMin: '',
                      }))
                    }
                    className="flex-row items-center gap-2 px-3 py-2 rounded-full bg-dark-100"
                  >
                    <Text className="text-sm font-semibold text-accent">{advancedFilters.yearMin}+</Text>
                    <XCircle size={16} color="#AB8BFF" strokeWidth={2} />
                  </TouchableOpacity>
                )}
                {advancedFilters.voteMinimum > 0 && (
                  <TouchableOpacity
                    onPress={() =>
                      setAdvancedFilters(prev => ({
                        ...prev,
                        voteMinimum: 0,
                      }))
                    }
                    className="flex-row items-center gap-2 px-3 py-2 rounded-full bg-dark-100"
                  >
                    <Text className="text-sm font-semibold text-accent">{advancedFilters.voteMinimum}★</Text>
                    <XCircle size={16} color="#AB8BFF" strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
      </View>

      {/* Skeleton for search results */}
      {showSkeleton && (
        <View className="px-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      )}

      {/* Skeleton for trending content */}
      {showTrendingSkeleton && (
        <View className="px-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      )}

      {/* Search Results */}
      {debouncedQuery.length > 0 && !showSkeleton && (
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

      {/* Trending Content - Initial View */}
      {debouncedQuery.length === 0 && !showTrendingSkeleton && (
        <FlatList<ResultWithType>
          data={trendingResults}
          keyExtractor={(item, idx) => `${item.media_type}-${item.id}-${idx}`}
          renderItem={({ item }) => (
            <DramaCard
              drama={item}
              onPress={() => handleResultPress(item)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, flexGrow: 1 }}
          ListHeaderComponent={() => (
            <View className="flex-row items-center gap-2 mt-2 mb-4">
              <Flame size={20} color="#AB8BFF" strokeWidth={2} />
              <Text className="text-lg font-bold text-white">
                {filter === 'all' ? 'Trending Now' : filter === 'tv' ? 'Trending TV & Anime' : 'Trending Movies'}
              </Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
}
