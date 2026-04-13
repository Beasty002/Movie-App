import { getImageUrl, searchDramas, searchMovies } from '@/services/tmdb';
import { usePollStore } from '@/store/usePollStore';
import type { MediaType, PollOption, TMDBDrama } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Check,
  Film,
  Loader,
  Plus,
  X,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ExpiryDuration = '12h' | '24h' | '48h' | '1w';

const EXPIRY_OPTIONS: { label: string; value: ExpiryDuration }[] = [
  { label: '12h', value: '12h' },
  { label: '24h', value: '24h' },
  { label: '48h', value: '48h' },
  { label: '1 week', value: '1w' },
];

function mediaTypeFromTMDB(tmdbType: 'tv' | 'movie' | undefined): MediaType {
  return tmdbType === 'movie' ? 'movie' : 'series';
}

function yearFromDrama(drama: TMDBDrama): number | null {
  const raw = drama.first_air_date ?? drama.release_date ?? null;
  if (!raw) return null;
  const parsed = parseInt(raw.slice(0, 4), 10);
  return isNaN(parsed) ? null : parsed;
}

export default function CreatePollScreen() {
  const router = useRouter();
  const { createPoll } = usePollStore();

  // Step 1 state
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiry, setExpiry] = useState<ExpiryDuration>('24h');

  // Step 2 state
  const [selectedOptions, setSelectedOptions] = useState<PollOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: tvResults, isLoading: tvLoading } = useQuery({
    queryKey: ['poll-search-tv', debouncedQuery],
    queryFn: () => searchDramas(debouncedQuery),
    enabled: debouncedQuery.length > 1,
    staleTime: 2 * 60 * 1000,
  });

  const { data: movieResults, isLoading: movieLoading } = useQuery({
    queryKey: ['poll-search-movie', debouncedQuery],
    queryFn: () => searchMovies(debouncedQuery),
    enabled: debouncedQuery.length > 1,
    staleTime: 2 * 60 * 1000,
  });

  const searchResults: TMDBDrama[] = (() => {
    const tv = (tvResults?.results ?? []).map((d) => ({
      ...d,
      media_type: 'tv' as const,
    }));
    const movies = (movieResults?.results ?? []).map((d) => ({
      ...d,
      media_type: 'movie' as const,
    }));
    return [...tv, ...movies]
      .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
      .slice(0, 15);
  })();

  const showSkeleton = (tvLoading || movieLoading) && debouncedQuery.length > 1;

  const isAlreadySelected = (drama: TMDBDrama) =>
    selectedOptions.some(
      (o) =>
        o.media_id === drama.id &&
        o.media_type === mediaTypeFromTMDB(drama.media_type),
    );

  const addOption = (drama: TMDBDrama) => {
    if (selectedOptions.length >= 5) return;
    if (isAlreadySelected(drama)) return;

    const option: PollOption = {
      index: selectedOptions.length,
      media_id: drama.id,
      media_type: mediaTypeFromTMDB(drama.media_type),
      title: drama.name ?? drama.title ?? 'Unknown',
      title_korean: null,
      poster: drama.poster_path ?? null,
      year: yearFromDrama(drama),
    };
    setSelectedOptions((prev) => [...prev, option]);
  };

  const removeOption = (index: number) => {
    setSelectedOptions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((o, i) => ({ ...o, index: i })),
    );
  };

  const canProceed = title.trim().length > 0;
  const canCreate = selectedOptions.length >= 3 && selectedOptions.length <= 5;

  const handleCreate = async () => {
    if (!canCreate || isCreating) return;
    setIsCreating(true);
    try {
      const poll = await createPoll({
        title: title.trim(),
        description: description.trim() || undefined,
        options: selectedOptions,
        expiry_duration: expiry,
      });
      router.replace(`/poll/${poll.id}` as never);
    } catch {
      setIsCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-primary"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View className="flex-row items-center px-4 pt-14 pb-4">
        <TouchableOpacity
          onPress={() => {
            if (step === 2) setStep(1);
            else router.back();
          }}
          hitSlop={8}
          className="mr-3"
        >
          <ArrowLeft size={22} color="#A8B5DB" strokeWidth={2} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-light-300 text-xs mb-0.5">
            Step {step} of 2
          </Text>
          <Text className="text-white font-bold text-lg">
            {step === 1 ? 'Poll Details' : 'Add Options'}
          </Text>
        </View>
        {/* Step indicator dots */}
        <View className="flex-row gap-x-1.5">
          <View
            className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-accent' : 'bg-accent/40'}`}
          />
          <View
            className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-accent' : 'bg-dark-200'}`}
          />
        </View>
      </View>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text className="text-light-200 text-xs font-medium mb-1.5 uppercase tracking-wide">
            Poll Title *
          </Text>
          <View className="bg-dark-100 rounded-xl px-4 mb-1">
            <TextInput
              className="text-white text-base py-3.5"
              placeholder="e.g. What should we watch this weekend?"
              placeholderTextColor="#9CA4AB"
              value={title}
              onChangeText={(t) => setTitle(t.slice(0, 100))}
              maxLength={100}
              returnKeyType="next"
            />
          </View>
          <Text className="text-light-300 text-[11px] text-right mb-5">
            {title.length}/100
          </Text>

          {/* Description */}
          <Text className="text-light-200 text-xs font-medium mb-1.5 uppercase tracking-wide">
            Description (optional)
          </Text>
          <View className="bg-dark-100 rounded-xl px-4 mb-1">
            <TextInput
              className="text-white text-base py-3.5"
              placeholder="Add a note for your friends…"
              placeholderTextColor="#9CA4AB"
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, 300))}
              maxLength={300}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 80 }}
            />
          </View>
          <Text className="text-light-300 text-[11px] text-right mb-5">
            {description.length}/300
          </Text>

          {/* Expiry */}
          <Text className="text-light-200 text-xs font-medium mb-2 uppercase tracking-wide">
            Voting ends in
          </Text>
          <View className="flex-row gap-x-2 mb-8">
            {EXPIRY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setExpiry(opt.value)}
                activeOpacity={0.8}
                className={`flex-1 py-2.5 rounded-xl items-center ${
                  expiry === opt.value
                    ? 'bg-accent'
                    : 'bg-dark-100 border border-dark-200'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    expiry === opt.value ? 'text-primary' : 'text-light-200'
                  }`}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Next button */}
          <TouchableOpacity
            onPress={() => setStep(2)}
            disabled={!canProceed}
            activeOpacity={0.8}
            className={`py-4 rounded-xl items-center ${
              canProceed ? 'bg-accent' : 'bg-dark-100'
            }`}
          >
            <Text
              className={`font-semibold text-base ${
                canProceed ? 'text-primary' : 'text-light-300'
              }`}
            >
              Next — Add Options
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <View className="flex-1">
          {/* Selected chips */}
          {selectedOptions.length > 0 && (
            <View className="px-4 mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-light-300 text-xs">
                  Selected options
                </Text>
                <Text
                  className={`text-xs font-semibold ${
                    selectedOptions.length < 3 ? 'text-amber-400' : 'text-green-400'
                  }`}
                >
                  {selectedOptions.length}/5
                  {selectedOptions.length < 3 ? ' (min 3)' : ''}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {selectedOptions.map((opt, idx) => {
                  const posterUrl = getImageUrl(opt.poster, 'w300');
                  return (
                    <View
                      key={`${opt.media_id}-${idx}`}
                      className="flex-row items-center bg-dark-100 rounded-xl pr-2 overflow-hidden"
                      style={{ maxWidth: 180 }}
                    >
                      {posterUrl ? (
                        <Image
                          source={{ uri: posterUrl }}
                          style={{ width: 32, height: 48 }}
                          contentFit="cover"
                        />
                      ) : (
                        <View
                          style={{ width: 32, height: 48 }}
                          className="bg-dark-200 items-center justify-center"
                        >
                          <Film size={14} color="#A8B5DB" strokeWidth={1.5} />
                        </View>
                      )}
                      <Text
                        className="text-white text-xs mx-2 flex-1"
                        numberOfLines={2}
                      >
                        {opt.title}
                      </Text>
                      <TouchableOpacity onPress={() => removeOption(idx)} hitSlop={6}>
                        <X size={14} color="#A8B5DB" strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Search input */}
          <View className="px-4 mb-3">
            <View className="flex-row items-center px-4 bg-dark-100 rounded-xl">
              <Film size={18} color="#9CA4AB" strokeWidth={1.5} />
              <TextInput
                ref={searchInputRef}
                className="flex-1 text-white text-base py-3.5 ml-2"
                placeholder="Search movies, shows, anime…"
                placeholderTextColor="#9CA4AB"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <X size={16} color="#A8B5DB" strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Results list */}
          <FlatList<TMDBDrama>
            data={showSkeleton ? [] : searchResults}
            keyExtractor={(item, idx) =>
              `${item.media_type}-${item.id}-${idx}`
            }
            renderItem={({ item }) => {
              const already = isAlreadySelected(item);
              const full = selectedOptions.length >= 5;
              const posterUrl = getImageUrl(item.poster_path, 'w300');
              const year = yearFromDrama(item);

              return (
                <TouchableOpacity
                  onPress={() => addOption(item)}
                  disabled={already || full}
                  activeOpacity={0.7}
                  className={`flex-row items-center px-4 py-3 mb-1 mx-4 rounded-xl ${
                    already ? 'bg-accent/10' : 'bg-dark-100'
                  } ${full && !already ? 'opacity-40' : ''}`}
                >
                  {posterUrl ? (
                    <Image
                      source={{ uri: posterUrl }}
                      style={{ width: 44, height: 66, borderRadius: 6 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={{ width: 44, height: 66, borderRadius: 6 }}
                      className="bg-dark-200 items-center justify-center"
                    >
                      <Film size={16} color="#A8B5DB" strokeWidth={1.5} />
                    </View>
                  )}
                  <View className="flex-1 ml-3">
                    <Text
                      className="text-white text-sm font-medium"
                      numberOfLines={2}
                    >
                      {item.name ?? item.title}
                    </Text>
                    <Text className="text-light-300 text-xs mt-0.5">
                      {item.media_type === 'movie' ? 'Movie' : 'TV Series'}
                      {year ? ` · ${year}` : ''}
                    </Text>
                  </View>
                  {already ? (
                    <Check size={18} color="#AB8BFF" strokeWidth={2.5} />
                  ) : (
                    !full && (
                      <Plus size={18} color="#A8B5DB" strokeWidth={2} />
                    )
                  )}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 160 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListHeaderComponent={
              showSkeleton ? (
                <View className="px-4 pt-2">
                  {[1, 2, 3].map((i) => (
                    <View
                      key={i}
                      className="flex-row items-center bg-dark-100 rounded-xl p-3 mb-2"
                    >
                      <View
                        style={{ width: 44, height: 66, borderRadius: 6 }}
                        className="bg-dark-200"
                      />
                      <View className="flex-1 ml-3 gap-y-2">
                        <View className="h-4 bg-dark-200 rounded w-3/4" />
                        <View className="h-3 bg-dark-200 rounded w-1/3" />
                      </View>
                    </View>
                  ))}
                </View>
              ) : null
            }
            ListEmptyComponent={
              !showSkeleton && debouncedQuery.length > 1 ? (
                <Text className="text-light-300 text-sm text-center pt-8">
                  No results for "{debouncedQuery}"
                </Text>
              ) : debouncedQuery.length === 0 ? (
                <Text className="text-light-300 text-sm text-center pt-8">
                  Search for movies, shows or anime to add
                </Text>
              ) : null
            }
          />

          {/* Create button — pinned to bottom */}
          <View
            className="absolute bottom-0 left-0 right-0 px-4 pb-10 pt-3 bg-primary border-t border-dark-100"
          >
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!canCreate || isCreating}
              activeOpacity={0.8}
              className={`py-4 rounded-xl items-center flex-row justify-center gap-x-2 ${
                canCreate && !isCreating ? 'bg-accent' : 'bg-dark-100'
              }`}
            >
              {isCreating ? (
                <ActivityIndicator color="#030014" size="small" />
              ) : (
                <>
                  {canCreate ? (
                    <Check size={18} color="#030014" strokeWidth={2.5} />
                  ) : (
                    <Loader size={18} color="#A8B5DB" strokeWidth={2} />
                  )}
                  <Text
                    className={`font-semibold text-base ${
                      canCreate && !isCreating ? 'text-primary' : 'text-light-300'
                    }`}
                  >
                    {isCreating
                      ? 'Creating…'
                      : canCreate
                        ? 'Create Poll'
                        : `Need ${3 - selectedOptions.length} more option${3 - selectedOptions.length !== 1 ? 's' : ''}`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
