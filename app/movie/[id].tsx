import ImageWithFallback from '@/components/ImageWithFallback';
import DramaCard from '@/components/drama/DramaCard';
import { getImageUrl, getMovieDetail, getRecommendedContent, getSimilarContent } from '@/services/tmdb';
import { useAuthStore } from '@/store/useAuthStore';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import type { TMDBDrama, WatchlistStatus } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bookmark, Check, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
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
import Toast from 'react-native-toast-message';

type StatusOption = {
    value: WatchlistStatus;
    label: string;
    icon: string;
};

const STATUS_OPTIONS: StatusOption[] = [
    { value: 'watching', label: 'Watching', icon: 'play' },
    { value: 'planning', label: 'Plan to Watch', icon: 'bookmark' },
    { value: 'completed', label: 'Completed', icon: 'check' },
    { value: 'dropped', label: 'Dropped', icon: 'trash2' },
];

const STATUS_COLORS: Record<WatchlistStatus, string> = {
    watching: 'text-blue-400',
    completed: 'text-green-400',
    planning: 'text-gray-400',
    dropped: 'text-red-400',
};

function StatusIcon({ iconName }: { iconName: string }) {
    const iconProps = { size: 20, strokeWidth: 2 };
    switch (iconName) {
        case 'play':
            return <TouchableOpacity {...iconProps} />;
        case 'bookmark':
            return <Bookmark {...iconProps} color="#9CA4AB" />;
        case 'check':
            return <Check {...iconProps} color="#4ADE80" />;
        case 'trash2':
            return <Trash2 {...iconProps} color="#F87171" />;
        default:
            return null;
    }
}

export default function MovieDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const movieId = parseInt(id, 10);

    const { user } = useAuthStore();
    const { addToWatchlist, updateStatus, removeFromWatchlist, getItemByMedia } = useWatchlistStore();

    const [showStatusModal, setShowStatusModal] = useState(false);
    const [synopsisExpanded, setSynopsisExpanded] = useState(false);

    const watchlistItem = getItemByMedia(movieId, 'movie');

    const { data: movie, isLoading, isError } = useQuery({
        queryKey: ['movie', id],
        queryFn: () => getMovieDetail(movieId),
    });

    const { data: similar } = useQuery({
        queryKey: ['movie', id, 'similar'],
        queryFn: () => getSimilarContent(movieId, 'movie'),
        enabled: !!movie,
    });

    const { data: recommended } = useQuery({
        queryKey: ['movie', id, 'recommended'],
        queryFn: () => getRecommendedContent(movieId, 'movie'),
        enabled: !!movie,
    });

    const handleAddOrUpdate = useCallback(
        async (status: WatchlistStatus) => {
            if (!user || !movie) return;
            setShowStatusModal(false);

            try {
                if (watchlistItem) {
                    await updateStatus(watchlistItem.id, status);
                    Toast.show({
                        type: 'success',
                        text1: `Status changed to ${status}`,
                        duration: 2000,
                    });
                } else {
                    await addToWatchlist(
                        {
                            media_id: movie.id,
                            media_type: 'movie',
                            media_title: movie.title || movie.name || '',
                            media_title_korean: null,
                            media_poster: movie.poster_path,
                            media_year: movie.release_date ? parseInt(movie.release_date.split('-')[0], 10) : null,
                            total_episodes: null,
                            status,
                        },
                        user.id,
                    );
                    Toast.show({
                        type: 'success',
                        text1: 'Added to watchlist',
                        duration: 2000,
                    });
                }
            } catch (error) {
                Toast.show({
                    type: 'error',
                    text1: 'Failed to update watchlist',
                    duration: 2000,
                });
            }
        },
        [user, movie, watchlistItem, addToWatchlist, updateStatus],
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
                            duration: 2000,
                        });
                    } catch (error) {
                        Toast.show({
                            type: 'error',
                            text1: 'Failed to remove',
                            duration: 2000,
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

    if (isError || !movie) {
        return (
            <View className="items-center justify-center flex-1 px-6 bg-primary">
                <Text className="text-base text-center text-light-300">
                    Failed to load movie details.
                </Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4">
                    <Text className="text-accent">Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const backdropUrl = getImageUrl(movie.backdrop_path, 'w780');
    const posterUrl = getImageUrl(movie.poster_path, 'w300');
    const year = movie.release_date ? movie.release_date.split('-')[0] : '';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '–';

    return (
        <>
            <ScrollView
                className="flex-1 bg-primary"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* Backdrop + poster overlap */}
                <View style={{ height: 270 }}>
                    <ImageWithFallback
                        source={backdropUrl ? { uri: backdropUrl } : undefined}
                        style={{ width: '100%', height: 220 }}
                        contentFit="cover"
                    />
                    {/* Back button */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="absolute items-center justify-center rounded-full top-12 left-4 w-9 h-9 bg-black/50"
                    >
                        <Text className="text-base text-white">‹</Text>
                    </TouchableOpacity>

                    {/* Poster */}
                    <View className="absolute left-4" style={{ bottom: 0 }}>
                        <ImageWithFallback
                            source={posterUrl ? { uri: posterUrl } : undefined}
                            style={{ width: 90, height: 130, borderRadius: 10 }}
                            contentFit="cover"
                        />
                    </View>
                </View>

                <View className="px-4 -mt-[42px]">
                    {/* Title */}
                    <View className="ml-28">
                        <Text className="text-xl font-bold text-white" numberOfLines={3}>
                            {movie.title || movie.name}
                        </Text>
                    </View>

                    {/* Meta row */}
                    <View className="flex-row flex-wrap items-center mt-3 gap-x-3 gap-y-1">
                        {year ? <Text className="text-light-300 text-[13px]">{year}</Text> : null}
                        <View className="flex-row items-center gap-x-1">
                            <Text className="text-accent text-[13px]">★</Text>
                            <Text className="text-light-200 text-[13px]">{rating}</Text>
                        </View>
                    </View>

                    {/* Genres */}
                    {movie.genres && movie.genres.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="mt-3"
                            contentContainerStyle={{ gap: 8 }}
                        >
                            {movie.genres.map((g) => (
                                <View key={g.id} className="px-3 py-1 border rounded-full border-accent/50">
                                    <Text className="text-accent text-[12px]">{g.name}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    {/* Watchlist button */}
                    <View className="flex-row mt-4 gap-x-3">
                        {watchlistItem ? (
                            <>
                                <TouchableOpacity
                                    onPress={() => setShowStatusModal(true)}
                                    activeOpacity={0.8}
                                    className="items-center flex-1 py-3 border border-accent rounded-xl"
                                >
                                    <View className="flex-row items-center gap-x-2">
                                        <StatusIcon iconName={STATUS_OPTIONS.find((o) => o.value === watchlistItem.status)?.icon ?? 'play'} />
                                        <Text className={`font-semibold text-[14px] ${STATUS_COLORS[watchlistItem.status]}`}>
                                            {STATUS_OPTIONS.find((o) => o.value === watchlistItem.status)?.label}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleRemove}
                                    activeOpacity={0.8}
                                    className="items-center justify-center px-4 border border-red-500/50 rounded-xl"
                                >
                                    <Trash2 size={20} strokeWidth={2} color="#F87171" />
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity
                                onPress={() => setShowStatusModal(true)}
                                activeOpacity={0.8}
                                className="items-center flex-1 py-3 bg-accent rounded-xl"
                            >
                                <Text className="text-primary font-bold text-[14px]">+ Add to Watchlist</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Synopsis */}
                    {movie.overview ? (
                        <View className="mt-5">
                            <Text className="mb-2 text-base font-semibold text-white">Overview</Text>
                            <Text
                                className="text-light-200 text-[13px] leading-5"
                                numberOfLines={synopsisExpanded ? undefined : 3}
                            >
                                {movie.overview}
                            </Text>
                            <TouchableOpacity onPress={() => setSynopsisExpanded((p) => !p)} className="mt-1">
                                <Text className="text-accent text-[13px]">
                                    {synopsisExpanded ? 'Show less' : 'Read more'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {/* Recommended For You */}
                    {recommended && recommended.length > 0 && (
                        <View className="mt-6">
                            <Text className="mb-3 text-base font-semibold text-white">Recommended For You</Text>
                            <FlatList<TMDBDrama>
                                data={recommended.slice(0, 10)}
                                keyExtractor={(item) => `recommended-${item.id}`}
                                renderItem={({ item }) => (
                                    <View className="mr-3\">
                                        <DramaCard
                                            drama={item}
                                            compact
                                            onPress={() => {
                                                const route = item.media_type === 'movie' ? `/movie/${item.id}` : `/drama/${item.id}`;
                                                router.push(route);
                                            }}
                                        />
                                    </View>
                                )}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                scrollEnabled
                                contentContainerStyle={{ paddingRight: 16 }}
                            />
                        </View>
                    )}
                </View>
            </ScrollView >

            {/* Status selection modal */}
            <Modal
                visible={showStatusModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowStatusModal(false)}
            >
                <TouchableOpacity
                    className="justify-end flex-1 bg-black/60"
                    activeOpacity={1}
                    onPress={() => setShowStatusModal(false)}
                >
                    <View className="px-6 pt-6 pb-10 bg-dark-100 rounded-t-3xl">
                        <Text className="mb-5 text-lg font-bold text-center text-white">
                            {watchlistItem ? 'Change Status' : 'Add to Watchlist'}
                        </Text>
                        {STATUS_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                onPress={() => handleAddOrUpdate(option.value)}
                                activeOpacity={0.8}
                                className={`flex-row items-center py-4 border-b border-dark-200 ${watchlistItem?.status === option.value ? 'opacity-100' : 'opacity-80'
                                    }`}
                            >
                                <View className="mr-3">
                                    <StatusIcon iconName={option.icon} />
                                </View>
                                <Text className="flex-1 text-base text-white">{option.label}</Text>
                                {watchlistItem?.status === option.value && (
                                    <Check size={20} strokeWidth={2} color="#AB8BFF" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}