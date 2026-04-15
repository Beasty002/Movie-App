import { getImageUrl, searchDramas, searchMovies } from '@/services/tmdb';
import { usePollStore } from '@/store/usePollStore';
import type { MediaType, PollOption, TMDBDrama, WatchTime } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Film,
  Link2,
  Loader,
  Plus,
  Tv,
  X
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
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

const TIME_OPTIONS: { label: string; sub: string; value: WatchTime }[] = [
  { label: 'Morning', sub: '10 AM', value: 'morning' },
  { label: 'Afternoon', sub: '3 PM', value: 'afternoon' },
  { label: 'Evening', sub: '7 PM', value: 'evening' },
  { label: 'Night', sub: '9 PM', value: 'night' },
  { label: 'Anytime', sub: '', value: 'anytime' },
];

function getDateChips(): { label: string; value: string }[] {
  const chips: { label: string; value: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    let label: string;
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Tomorrow';
    else
      label = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    chips.push({ label, value: d.toISOString().slice(0, 10) });
  }
  return chips;
}

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

  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 — core
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiry, setExpiry] = useState<ExpiryDuration>('24h');

  // Step 1 — when / where (when to watch and where collapsed by default)
  const [whenExpanded, setWhenExpanded] = useState(false);
  const [whereExpanded, setWhereExpanded] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<WatchTime | null>(null);
  const [useCustomDateTime, setUseCustomDateTime] = useState(false);
  const [customDate, setCustomDate] = useState<Date>(new Date());
  const [customTime, setCustomTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [watchTogetherLink, setWatchTogetherLink] = useState('');
  const [allowSuggestions, setAllowSuggestions] = useState(false);

  // Step 2 — options
  const [selectedOptions, setSelectedOptions] = useState<PollOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const searchInputRef = useRef<TextInput>(null);
  const dateChips = useMemo(() => getDateChips(), []);

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

  const togglePlatform = (name: string) => {
    // Removed - using watchTogetherLink instead
  };

  const updatePlatformUrl = (name: string, url: string) => {
    // Removed - using watchTogetherLink instead
  };

  const canProceed = title.trim().length > 0;
  const canCreate = selectedOptions.length >= 3 && selectedOptions.length <= 5;

  const handleCreate = async () => {
    if (!canCreate || isCreating) return;
    setIsCreating(true);
    try {
      // Parse custom date from Date object to ISO format YYYY-MM-DD
      let finalWatchDate = selectedDate;
      let finalWatchTime = selectedTime;
      let finalWatchCustomTime: string | undefined;

      if (useCustomDateTime) {
        // Convert Date to YYYY-MM-DD
        const year = customDate.getFullYear();
        const month = String(customDate.getMonth() + 1).padStart(2, '0');
        const day = String(customDate.getDate()).padStart(2, '0');
        finalWatchDate = `${year}-${month}-${day}`;

        // Convert time to HH:MM format
        const hours = String(customTime.getHours()).padStart(2, '0');
        const minutes = String(customTime.getMinutes()).padStart(2, '0');
        finalWatchCustomTime = `${hours}:${minutes}`;

        finalWatchTime = null;
      }

      const poll = await createPoll({
        title: title.trim(),
        description: description.trim() || undefined,
        options: selectedOptions,
        expiry_duration: expiry,
        watch_date: finalWatchDate,
        watch_time: finalWatchTime,
        watch_custom_time: finalWatchCustomTime,
        watch_together_link: watchTogetherLink.trim() || undefined,
        allow_suggestions: allowSuggestions,
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
          activeOpacity={0.7}
          className="w-9 h-9 rounded-full bg-dark-100 items-center justify-center mr-3"
        >
          <ArrowLeft size={18} color="#A8B5DB" strokeWidth={2} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-light-300 text-xs mb-0.5">Step {step} of 2</Text>
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
          <View className="flex-row gap-x-2 mb-6">
            {EXPIRY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setExpiry(opt.value)}
                activeOpacity={0.8}
                className={`flex-1 py-2.5 rounded-xl items-center ${expiry === opt.value
                  ? 'bg-accent'
                  : 'bg-dark-100 border border-dark-200'
                  }`}
              >
                <Text
                  className={`text-sm font-semibold ${expiry === opt.value ? 'text-primary' : 'text-light-200'
                    }`}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ─── When to Watch (collapsible) ─── */}
          <TouchableOpacity
            onPress={() => setWhenExpanded((v) => !v)}
            activeOpacity={0.8}
            className="flex-row items-center justify-between bg-dark-100 rounded-xl px-4 py-3.5 mb-2"
          >
            <View className="flex-row items-center gap-x-2">
              <Tv size={16} color={selectedDate || selectedTime || useCustomDateTime ? '#AB8BFF' : '#A8B5DB'} strokeWidth={2} />
              <Text
                className={`text-sm font-semibold ${selectedDate || selectedTime || useCustomDateTime ? 'text-accent' : 'text-light-200'
                  }`}
              >
                When to Watch <Text className="text-light-300 text-xs font-normal">(optional)</Text>
              </Text>
              {(selectedDate || selectedTime || useCustomDateTime) && (
                <View className="bg-accent/20 px-2 py-0.5 rounded-full">
                  <Text className="text-accent text-[10px] font-semibold">Set</Text>
                </View>
              )}
            </View>
            {whenExpanded ? (
              <ChevronUp size={16} color="#A8B5DB" strokeWidth={2} />
            ) : (
              <ChevronDown size={16} color="#A8B5DB" strokeWidth={2} />
            )}
          </TouchableOpacity>

          {whenExpanded && (
            <View className="bg-dark-100/60 rounded-xl px-4 pt-3 pb-4 mb-2">
              <Text className="text-light-300 text-xs mb-2">Pick a day (optional)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              >
                {dateChips.map((chip) => (
                  <TouchableOpacity
                    key={chip.value}
                    onPress={() =>
                      setSelectedDate((v) => (v === chip.value ? null : chip.value))
                    }
                    activeOpacity={0.8}
                    className={`px-3 py-2 rounded-xl items-center ${selectedDate === chip.value
                      ? 'bg-accent'
                      : 'bg-dark-200'
                      }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${selectedDate === chip.value ? 'text-primary' : 'text-light-200'
                        }`}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="text-light-300 text-xs mt-3 mb-2">Pick a time (optional)</Text>
              <View className="flex-row flex-wrap gap-2">
                {TIME_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setSelectedTime((v) => (v === opt.value ? null : opt.value));
                      setUseCustomDateTime(false);
                    }}
                    activeOpacity={0.8}
                    className={`px-3 py-2 rounded-xl items-center ${selectedTime === opt.value && !useCustomDateTime ? 'bg-accent' : 'bg-dark-200'
                      }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${selectedTime === opt.value && !useCustomDateTime ? 'text-primary' : 'text-light-200'
                        }`}
                    >
                      {opt.label}
                    </Text>
                    {opt.sub ? (
                      <Text
                        className={`text-[10px] mt-0.5 ${selectedTime === opt.value && !useCustomDateTime ? 'text-primary/80' : 'text-light-300'
                          }`}
                      >
                        {opt.sub}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>

              {/* ─── Custom date/time section ─── */}
              <View className="mt-4 pt-4 border-t border-dark-200">
                <TouchableOpacity
                  onPress={() => setUseCustomDateTime((v) => !v)}
                  activeOpacity={0.8}
                  className={`flex-row items-center px-3 py-2 rounded-xl border ${useCustomDateTime ? 'bg-accent/10 border-accent/30' : 'bg-dark-200 border-dark-200'}
                    }`}
                >
                  <Clock size={14} color={useCustomDateTime ? '#AB8BFF' : '#A8B5DB'} strokeWidth={2} />
                  <Text className={`text-xs font-semibold ml-2 ${useCustomDateTime ? 'text-accent' : 'text-light-200'}`}>
                    Custom date & time
                  </Text>
                </TouchableOpacity>

                {useCustomDateTime && (
                  <View className="mt-3 gap-y-2">
                    {/* Date Picker */}
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      activeOpacity={0.8}
                      className="flex-row items-center bg-dark-200 rounded-lg px-3 py-2.5"
                    >
                      <Calendar size={12} color="#9CA4AB" strokeWidth={1.5} />
                      <Text className="flex-1 text-white text-sm ml-2 font-medium">
                        {customDate.toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                        })}
                      </Text>
                      <ChevronDown size={14} color="#A8B5DB" strokeWidth={2} />
                    </TouchableOpacity>

                    {showDatePicker && (
                      <DateTimePicker
                        value={customDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, selectedDate) => {
                          if (Platform.OS === 'android') {
                            setShowDatePicker(false);
                          }
                          if (selectedDate) {
                            setCustomDate(selectedDate);
                          }
                        }}
                        minimumDate={new Date()}
                        textColor="#FFFFFF"
                      />
                    )}

                    {Platform.OS === 'ios' && showDatePicker && (
                      <View className="flex-row gap-x-2 justify-end px-2 py-2">
                        <TouchableOpacity onPress={() => setShowDatePicker(false)} className="px-4 py-2">
                          <Text className="text-accent font-semibold">Done</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Time Picker */}
                    <TouchableOpacity
                      onPress={() => setShowTimePicker(true)}
                      activeOpacity={0.8}
                      className="flex-row items-center bg-dark-200 rounded-lg px-3 py-2.5"
                    >
                      <Clock size={12} color="#9CA4AB" strokeWidth={1.5} />
                      <Text className="flex-1 text-white text-sm ml-2 font-medium">
                        {customTime.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </Text>
                      <ChevronDown size={14} color="#A8B5DB" strokeWidth={2} />
                    </TouchableOpacity>

                    {showTimePicker && (
                      <DateTimePicker
                        value={customTime}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, selectedTime) => {
                          if (Platform.OS === 'android') {
                            setShowTimePicker(false);
                          }
                          if (selectedTime) {
                            setCustomTime(selectedTime);
                          }
                        }}
                        is24Hour={true}
                        textColor="#FFFFFF"
                      />
                    )}

                    {Platform.OS === 'ios' && showTimePicker && (
                      <View className="flex-row gap-x-2 justify-end px-2 py-2">
                        <TouchableOpacity onPress={() => setShowTimePicker(false)} className="px-4 py-2">
                          <Text className="text-accent font-semibold">Done</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ─── Where to Watch (collapsible) ─── */}
          <TouchableOpacity
            onPress={() => setWhereExpanded((v) => !v)}
            activeOpacity={0.8}
            className="flex-row items-center justify-between bg-dark-100 rounded-xl px-4 py-3.5 mb-2"
          >
            <View className="flex-row items-center gap-x-2">
              <Link2 size={16} color={watchTogetherLink ? '#AB8BFF' : '#A8B5DB'} strokeWidth={2} />
              <Text
                className={`text-sm font-semibold ${watchTogetherLink ? 'text-accent' : 'text-light-200'
                  }`}
              >
                Watch Together Link <Text className="text-light-300 text-xs font-normal">(optional)</Text>
              </Text>
              {watchTogetherLink && (
                <View className="bg-accent/20 px-2 py-0.5 rounded-full">
                  <Text className="text-accent text-[10px] font-semibold">Added</Text>
                </View>
              )}
            </View>
            {whereExpanded ? (
              <ChevronUp size={16} color="#A8B5DB" strokeWidth={2} />
            ) : (
              <ChevronDown size={16} color="#A8B5DB" strokeWidth={2} />
            )}
          </TouchableOpacity>

          {whereExpanded && (
            <View className="bg-dark-100/60 rounded-xl px-4 pt-3 pb-4 mb-2">
              <View className="flex-row items-center gap-x-1.5 mb-2">
                <Link2 size={12} color="#A8B5DB" strokeWidth={2} />
                <Text className="text-light-300 text-xs">
                  Add a watch-together link (optional)
                </Text>
              </View>
              <Text className="text-light-300/70 text-[11px] mb-3">
                Paste a Teleparty link, Kast watch party, or any streaming link for your friends
              </Text>
              <View className="flex-row items-center bg-dark-200 rounded-lg px-3">
                <Link2 size={12} color="#9CA4AB" strokeWidth={1.5} />
                <TextInput
                  className="flex-1 text-white text-sm py-3 ml-2"
                  placeholder="https://teleparty.com/… or watch party link"
                  placeholderTextColor="#6B7280"
                  value={watchTogetherLink}
                  onChangeText={setWatchTogetherLink}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="done"
                />
                {watchTogetherLink ? (
                  <TouchableOpacity
                    onPress={() => setWatchTogetherLink('')}
                    hitSlop={8}
                  >
                    <X size={12} color="#A8B5DB" strokeWidth={2} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}

          {/* ─── Allow suggestions toggle ─── */}
          <View className="flex-row items-center justify-between bg-dark-100 rounded-xl px-4 py-3.5 mb-8">
            <View className="flex-1 mr-3">
              <Text className="text-white text-sm font-semibold">Allow suggestions</Text>
              <Text className="text-light-300 text-xs mt-0.5">
                Voters can add extra shows to the poll
              </Text>
            </View>
            <Switch
              value={allowSuggestions}
              onValueChange={setAllowSuggestions}
              trackColor={{ false: '#2A2A3D', true: '#AB8BFF' }}
              thumbColor={allowSuggestions ? '#030014' : '#A8B5DB'}
            />
          </View>

          {/* Next button */}
          <TouchableOpacity
            onPress={() => setStep(2)}
            disabled={!canProceed}
            activeOpacity={0.8}
            className={`py-4 rounded-xl items-center ${canProceed ? 'bg-accent' : 'bg-dark-100'
              }`}
          >
            <Text
              className={`font-semibold text-base ${canProceed ? 'text-primary' : 'text-light-300'
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
                <Text className="text-light-300 text-xs">Selected options</Text>
                <Text
                  className={`text-xs font-semibold ${selectedOptions.length < 3 ? 'text-amber-400' : 'text-green-400'
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
            keyExtractor={(item, idx) => `${item.media_type}-${item.id}-${idx}`}
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
                  className={`flex-row items-center px-4 py-3 mb-1 mx-4 rounded-xl ${already ? 'bg-accent/10' : 'bg-dark-100'
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
                    <Text className="text-white text-sm font-medium" numberOfLines={2}>
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
                    !full && <Plus size={18} color="#A8B5DB" strokeWidth={2} />
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
                    <View key={i} className="flex-row items-center bg-dark-100 rounded-xl p-3 mb-2">
                      <View style={{ width: 44, height: 66, borderRadius: 6 }} className="bg-dark-200" />
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
          <View className="absolute bottom-0 left-0 right-0 px-4 pb-10 pt-3 bg-primary border-t border-dark-100">
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!canCreate || isCreating}
              activeOpacity={0.8}
              className={`py-4 rounded-xl items-center flex-row justify-center gap-x-2 ${canCreate && !isCreating ? 'bg-accent' : 'bg-dark-100'
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
                    className={`font-semibold text-base ${canCreate && !isCreating ? 'text-primary' : 'text-light-300'
                      }`}
                  >
                    {isCreating
                      ? 'Creating…'
                      : canCreate
                        ? 'Create Poll'
                        : `Need ${3 - selectedOptions.length} more option${3 - selectedOptions.length !== 1 ? 's' : ''
                        }`}
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
