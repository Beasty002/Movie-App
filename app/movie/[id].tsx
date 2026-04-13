import MediaDetailContent from '@/components/media/MediaDetailContent';
import { getMovieDetail, getRecommendedContent } from '@/services/tmdb';
import { useAuthStore } from '@/store/useAuthStore';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import type { WatchlistStatus } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

export default function MovieDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
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
                    });
                }
            } catch (error) {
                Toast.show({
                    type: 'error',
                    text1: 'Failed to update watchlist',
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

    if (isError || !movie) {
        return (
            <View className="items-center justify-center flex-1 px-6 bg-primary">
                <Text className="text-base text-center text-light-300">
                    Failed to load movie details.
                </Text>
            </View>
        );
    }

    return (
        <MediaDetailContent
            media={movie}
            watchlistItem={watchlistItem}
            synopsis={movie.overview}
            synopsisExpanded={synopsisExpanded}
            onSynopsisToggle={() => setSynopsisExpanded((p) => !p)}
            showStatusModal={showStatusModal}
            onStatusModalToggle={setShowStatusModal}
            onStatusSelect={handleAddOrUpdate}
            onRemove={handleRemove}
            recommended={recommended}
        />
    );
}