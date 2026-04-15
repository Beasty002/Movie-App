import { getImageUrl, searchDramas, searchMovies } from '@/services/tmdb';
import { useAuthStore } from '@/store/useAuthStore';
import { usePollStore } from '@/store/usePollStore';
import type { MediaType, PollOption, TMDBDrama, WatchTime } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ArrowLeft,
    Calendar,
    Check,
    ChevronDown,
    ChevronUp,
    Clock,
    Film,
    Link2,
    Plus,
    Tv,
    X
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AlertIOS,
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

export default function EditPollScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();
    const { currentPoll, updatePoll, suggestOption, fetchPollById } = usePollStore();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
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
    const [isSaving, setIsSaving] = useState(false);

    // For adding new options
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [showAddOptions, setShowAddOptions] = useState(false);

    const dateChips = useMemo(() => getDateChips(), []);

    // Fetch poll if not already loaded
    useEffect(() => {
        if (id && (!currentPoll || currentPoll.id !== id)) {
            fetchPollById(id);
        }
    }, [id, currentPoll, fetchPollById]);

    // Initialize form with current poll data
    useEffect(() => {
        if (currentPoll) {
            setTitle(currentPoll.title);
            setDescription(currentPoll.description || '');
            setSelectedDate(currentPoll.watch_date || null);
            setSelectedTime(currentPoll.watch_time || null);

            // Handle custom datetime
            if (currentPoll.watch_custom_time) {
                setUseCustomDateTime(true);
                // Parse HH:MM to Date object
                const [hours, minutes] = currentPoll.watch_custom_time.split(':').map(Number);
                const timeDate = new Date();
                timeDate.setHours(hours || 0, minutes || 0, 0, 0);
                setCustomTime(timeDate);

                // Convert ISO date (YYYY-MM-DD) to Date object
                if (currentPoll.watch_date) {
                    const dateObj = new Date(currentPoll.watch_date);
                    setCustomDate(dateObj);
                }
            }

            setWatchTogetherLink(currentPoll.watch_together_link || '');
            setAllowSuggestions(currentPoll.allow_suggestions || false);
        }
    }, [currentPoll]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { data: tvResults, isLoading: tvLoading } = useQuery({
        queryKey: ['poll-edit-search-tv', debouncedQuery],
        queryFn: () => searchDramas(debouncedQuery),
        enabled: debouncedQuery.length > 1,
        staleTime: 2 * 60 * 1000,
    });

    const { data: movieResults, isLoading: movieLoading } = useQuery({
        queryKey: ['poll-edit-search-movie', debouncedQuery],
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
        currentPoll?.options.some(
            (o) =>
                o.media_id === drama.id &&
                o.media_type === mediaTypeFromTMDB(drama.media_type),
        );

    const canAddOption = (currentPoll?.options.length ?? 0) < 10;

    const addOption = async (drama: TMDBDrama) => {
        if (!currentPoll || !canAddOption || isAlreadySelected(drama)) return;
        try {
            const option: Omit<PollOption, 'index'> = {
                media_id: drama.id,
                media_type: mediaTypeFromTMDB(drama.media_type),
                title: drama.name ?? drama.title ?? 'Unknown',
                title_korean: null,
                poster: drama.poster_path ?? null,
                year: yearFromDrama(drama),
                suggested_by: user?.id,
                suggested_by_name: user?.user_metadata?.username,
            };
            await suggestOption(currentPoll.id, option);
            setSearchQuery('');
            // Show success message
            const AlertType = Platform.OS === 'ios' ? AlertIOS : Alert;
            AlertType.alert('Success', 'Option added to the poll!');
        } catch (error) {
            const AlertType = Platform.OS === 'ios' ? AlertIOS : Alert;
            AlertType.alert('Error', 'Could not add option. Please try again.');
        }
    };

    const handleSave = async () => {
        if (!currentPoll || !title.trim()) return;
        setIsSaving(true);
        try {
            // Parse custom date from MM/DD/YYYY to ISO format YYYY-MM-DD
            let finalWatchDate = selectedDate;
            let finalWatchTime = selectedTime;
            let finalWatchCustomTime: string | undefined;

            if (useCustomDateTime && customDate) {
                // Convert MM/DD/YYYY to YYYY-MM-DD
                const [month, day, year] = customDate.split('/');
                if (month && day && year && year.length === 4) {
                    finalWatchDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
                finalWatchTime = null;
                finalWatchCustomTime = customTime || undefined;
            }

            await updatePoll(currentPoll.id, {
                title: title.trim(),
                description: description.trim() || undefined,
                watch_date: finalWatchDate,
                watch_time: finalWatchTime,
                watch_custom_time: finalWatchCustomTime,
                watch_together_link: watchTogetherLink.trim() || undefined,
                allow_suggestions: allowSuggestions,
            });
            const AlertType = Platform.OS === 'ios' ? AlertIOS : Alert;
            AlertType.alert('Success', 'Poll updated!', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error) {
            const AlertType = Platform.OS === 'ios' ? AlertIOS : Alert;
            AlertType.alert('Error', 'Could not save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!currentPoll) {
        return (
            <View className="flex-1 bg-primary items-center justify-center">
                <ActivityIndicator color="#AB8BFF" size="large" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-primary"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Header */}
            <View className="flex-row items-center px-4 pt-14 pb-4">
                <TouchableOpacity
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    className="w-9 h-9 rounded-full bg-dark-100 items-center justify-center mr-3"
                >
                    <ArrowLeft size={18} color="#A8B5DB" strokeWidth={2} />
                </TouchableOpacity>
                <Text className="text-white font-bold text-lg flex-1">Edit Poll</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Title */}
                <Text className="text-light-200 text-xs font-medium mb-1.5 uppercase tracking-wide">
                    Poll Title
                </Text>
                <View className="bg-dark-100 rounded-xl px-4 mb-1">
                    <TextInput
                        className="text-white text-base py-3.5"
                        placeholder="Poll title…"
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
                    Description
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

                {/* ─── When to Watch ─── */}
                <TouchableOpacity
                    onPress={() => setWhenExpanded((v) => !v)}
                    activeOpacity={0.8}
                    className="flex-row items-center justify-between bg-dark-100 rounded-xl px-4 py-3.5 mb-2"
                >
                    <View className="flex-row items-center gap-x-2">
                        <Tv
                            size={16}
                            color={selectedDate || selectedTime || useCustomDateTime ? '#AB8BFF' : '#A8B5DB'}
                            strokeWidth={2}
                        />
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
                                    className={`px-3 py-2 rounded-xl items-center ${selectedDate === chip.value ? 'bg-accent' : 'bg-dark-200'
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

                        {/* Custom datetime section */}
                        <View className="mt-4 pt-4 border-t border-dark-200">
                            <TouchableOpacity
                                onPress={() => setUseCustomDateTime((v) => !v)}
                                activeOpacity={0.8}
                                className={`flex-row items-center px-3 py-2 rounded-xl border ${useCustomDateTime ? 'bg-accent/10 border-accent/30' : 'bg-dark-200 border-dark-200'
                                    }`}
                            >
                                <Clock size={14} color={useCustomDateTime ? '#AB8BFF' : '#A8B5DB'} strokeWidth={2} />
                                <Text className={`text-xs font-semibold ml-2 ${useCustomDateTime ? 'text-accent' : 'text-light-200'}`}>
                                    Custom date & time
                                </Text>
                            </TouchableOpacity>

                            {useCustomDateTime && (
                                <View className="mt-3 gap-y-2">
                                    {/* Date input */}
                                    <View className="flex-row items-center bg-dark-200 rounded-lg px-3">
                                        <Calendar size={12} color="#9CA4AB" strokeWidth={1.5} />
                                        <TextInput
                                            className="flex-1 text-white text-sm py-2.5 ml-2"
                                            placeholder="MM/DD/YYYY"
                                            placeholderTextColor="#6B7280"
                                            value={customDate}
                                            onChangeText={(text) => {
                                                const cleaned = text.replace(/[^0-9\/]/g, '');
                                                if (cleaned.length <= 10) {
                                                    if (cleaned.length === 2 && !customDate.includes('/')) {
                                                        setCustomDate(cleaned + '/');
                                                    } else if (cleaned.length === 5 && !customDate.slice(0, 5).includes(cleaned.slice(0, 4))) {
                                                        setCustomDate(cleaned + '/');
                                                    } else {
                                                        setCustomDate(cleaned);
                                                    }
                                                }
                                            }}
                                            maxLength={10}
                                            keyboardType="decimal-pad"
                                        />
                                        {customDate ? (
                                            <TouchableOpacity onPress={() => setCustomDate('')} hitSlop={8}>
                                                <X size={12} color="#A8B5DB" strokeWidth={2} />
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>

                                    {/* Time input */}
                                    <View className="flex-row items-center bg-dark-200 rounded-lg px-3">
                                        <Clock size={12} color="#9CA4AB" strokeWidth={1.5} />
                                        <TextInput
                                            className="flex-1 text-white text-sm py-2.5 ml-2"
                                            placeholder="HH:MM (24h)"
                                            placeholderTextColor="#6B7280"
                                            value={customTime}
                                            onChangeText={(text) => {
                                                const cleaned = text.replace(/[^0-9:]/g, '');
                                                if (cleaned.length <= 5) {
                                                    if (cleaned.length === 2 && !customTime.includes(':')) {
                                                        setCustomTime(cleaned + ':');
                                                    } else {
                                                        setCustomTime(cleaned);
                                                    }
                                                }
                                            }}
                                            maxLength={5}
                                            keyboardType="decimal-pad"
                                        />
                                        {customTime ? (
                                            <TouchableOpacity onPress={() => setCustomTime('')} hitSlop={8}>
                                                <X size={12} color="#A8B5DB" strokeWidth={2} />
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>

                                    <Text className="text-light-300/60 text-[10px] mt-1">
                                        {customDate && customTime
                                            ? `Set for ${customDate} at ${customTime}`
                                            : 'Enter date and time for custom selection'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* ─── Where to Watch ─── */}
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
                <View className="flex-row items-center justify-between bg-dark-100 rounded-xl px-4 py-3.5 mb-4">
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

                {/* ─── Current Options ─── */}
                <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-light-200 text-xs font-medium uppercase tracking-wide">
                            Poll Options ({currentPoll.options.length}/10)
                        </Text>
                        {canAddOption && (
                            <TouchableOpacity
                                onPress={() => setShowAddOptions((v) => !v)}
                                activeOpacity={0.8}
                                className="flex-row items-center gap-x-1 bg-accent/10 px-2 py-1 rounded-lg"
                            >
                                <Plus size={12} color="#AB8BFF" strokeWidth={2} />
                                <Text className="text-accent text-xs font-semibold">Add</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {currentPoll.options.map((opt, idx) => {
                        const posterUrl = getImageUrl(opt.poster, 'w300');
                        return (
                            <View
                                key={`${opt.media_id}-${idx}`}
                                className="flex-row items-center bg-dark-100 rounded-xl p-2 mb-2"
                            >
                                {posterUrl ? (
                                    <Image
                                        source={{ uri: posterUrl }}
                                        style={{ width: 40, height: 60 }}
                                        contentFit="cover"
                                    />
                                ) : (
                                    <View
                                        style={{ width: 40, height: 60 }}
                                        className="bg-dark-200 items-center justify-center rounded"
                                    >
                                        <Film size={16} color="#A8B5DB" strokeWidth={1.5} />
                                    </View>
                                )}
                                <View className="flex-1 ml-2">
                                    <Text className="text-white text-xs font-medium" numberOfLines={1}>
                                        {opt.title}
                                    </Text>
                                    <Text className="text-light-300 text-[10px]">
                                        {opt.year || 'N/A'}
                                        {opt.suggested_by_name ? ` • @${opt.suggested_by_name}` : ' • creator'}
                                    </Text>
                                </View>
                                <View className="bg-accent/20 px-2 py-1 rounded">
                                    <Text className="text-accent text-xs font-semibold">
                                        {currentPoll.votes_by_option[opt.index] ?? 0}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* ─── Add new option section ─── */}
                {showAddOptions && canAddOption && (
                    <View className="bg-dark-100 rounded-xl p-3 mb-4 border border-accent/20">
                        <View className="flex-row items-center px-3 bg-dark-200 rounded-lg mb-2">
                            <Film size={16} color="#9CA4AB" strokeWidth={1.5} />
                            <TextInput
                                className="flex-1 text-white text-sm py-3 ml-2"
                                placeholder="Search shows to add…"
                                placeholderTextColor="#9CA4AB"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                returnKeyType="search"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                                    <X size={14} color="#A8B5DB" strokeWidth={2} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {searchQuery.length > 0 && (
                            <FlatList<TMDBDrama>
                                data={showSkeleton ? [] : searchResults}
                                keyExtractor={(item, idx) => `${item.media_type}-${item.id}-${idx}`}
                                renderItem={({ item }) => {
                                    const already = isAlreadySelected(item);
                                    const posterUrl = getImageUrl(item.poster_path, 'w300');
                                    const year = yearFromDrama(item);
                                    return (
                                        <TouchableOpacity
                                            onPress={() => addOption(item)}
                                            disabled={already}
                                            activeOpacity={0.7}
                                            className={`flex-row items-center py-2 pl-2 pr-2 ${already ? 'opacity-40' : ''
                                                }`}
                                        >
                                            {posterUrl ? (
                                                <Image
                                                    source={{ uri: posterUrl }}
                                                    style={{ width: 32, height: 48, borderRadius: 4 }}
                                                    contentFit="cover"
                                                />
                                            ) : (
                                                <View
                                                    style={{ width: 32, height: 48, borderRadius: 4 }}
                                                    className="bg-dark-200 items-center justify-center"
                                                >
                                                    <Film size={12} color="#A8B5DB" strokeWidth={1.5} />
                                                </View>
                                            )}
                                            <View className="flex-1 ml-2">
                                                <Text className="text-white text-xs font-medium" numberOfLines={1}>
                                                    {item.name ?? item.title}
                                                </Text>
                                                <Text className="text-light-300 text-[10px]">
                                                    {year || 'N/A'}
                                                </Text>
                                            </View>
                                            {already ? (
                                                <Check size={14} color="#AB8BFF" strokeWidth={2} />
                                            ) : (
                                                <Plus size={14} color="#A8B5DB" strokeWidth={2} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                }}
                                scrollEnabled={false}
                                showsVerticalScrollIndicator={false}
                                ListHeaderComponent={
                                    showSkeleton ? (
                                        <View>
                                            {[1, 2].map((i) => (
                                                <View key={i} className="flex-row items-center py-2">
                                                    <View className="w-8 h-12 bg-dark-100 rounded" />
                                                    <View className="flex-1 ml-2 gap-y-1">
                                                        <View className="h-3 bg-dark-100 rounded w-2/3" />
                                                        <View className="h-2 bg-dark-100 rounded w-1/3" />
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    ) : null
                                }
                            />
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Save button */}
            <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-primary border-t border-dark-100">
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={isSaving || !title.trim()}
                    activeOpacity={0.8}
                    className={`py-4 rounded-xl items-center flex-row justify-center gap-x-2 ${title.trim() && !isSaving ? 'bg-accent' : 'bg-dark-100'
                        }`}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#030014" size="small" />
                    ) : (
                        <Check size={18} color="#030014" strokeWidth={2.5} />
                    )}
                    <Text
                        className={`font-semibold text-base ${title.trim() && !isSaving ? 'text-primary' : 'text-light-300'
                            }`}
                    >
                        {isSaving ? 'Saving…' : 'Save Changes'}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
