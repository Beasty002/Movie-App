import ImageWithFallback from '@/components/ImageWithFallback';
import DramaCard from '@/components/drama/DramaCard';
import DirectorCard from '@/components/media/DirectorCard';
import { getImageUrl } from '@/services/tmdb';
import type { TMDBCast, TMDBDrama, TMDBEpisode, WatchlistStatus } from '@/types';
import { useRouter } from 'expo-router';
import { Bookmark, Check, ChevronDown, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const STATUS_OPTIONS = [
    { value: 'watching' as WatchlistStatus, label: 'Watching', icon: 'play' },
    { value: 'planning' as WatchlistStatus, label: 'Plan to Watch', icon: 'bookmark' },
    { value: 'completed' as WatchlistStatus, label: 'Completed', icon: 'check' },
    { value: 'dropped' as WatchlistStatus, label: 'Dropped', icon: 'trash2' },
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
            return <Check {...iconProps} color="#60A5FA" />;
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

function CastCard({ cast }: { cast: TMDBCast }) {
    const photoUrl = getImageUrl(cast.profile_path, 'w300');
    return (
        <View className="items-center w-20 mr-3">
            <ImageWithFallback
                source={photoUrl ? { uri: photoUrl } : undefined}
                style={{ width: 64, height: 64, borderRadius: 32 }}
                contentFit="cover"
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

interface MediaDetailContentProps {
    media: TMDBDrama;
    watchlistItem?: any;
    synopsis?: string;
    synopsisExpanded: boolean;
    onSynopsisToggle: () => void;
    showStatusModal: boolean;
    onStatusModalToggle: (show: boolean) => void;
    onStatusSelect: (status: WatchlistStatus) => void;
    onRemove?: () => void;
    recommended?: TMDBDrama[];
    networks?: { id: number; name: string; logo_path: string }[];
    episodes?: TMDBEpisode[];
    selectedSeason?: number;
    onSeasonChange?: (season: number) => void;
    isEpisodeWatched?: (episodeNumber: number) => boolean;
    onToggleEpisode?: (episodeNumber: number) => void;
    onMarkAllSeason?: (markAsWatched: boolean) => void;
    isDrama?: boolean;
}

export default function MediaDetailContent({
    media,
    watchlistItem,
    synopsis,
    synopsisExpanded,
    onSynopsisToggle,
    showStatusModal,
    onStatusModalToggle,
    onStatusSelect,
    onRemove,
    recommended,
    networks,
    episodes,
    selectedSeason,
    onSeasonChange,
    isEpisodeWatched,
    onToggleEpisode,
    onMarkAllSeason,
    isDrama = false,
}: MediaDetailContentProps) {
    const router = useRouter();
    const [showEpisodeActions, setShowEpisodeActions] = useState(false);

    const backdropUrl = getImageUrl(media.backdrop_path, 'w780');
    const posterUrl = getImageUrl(media.poster_path, 'w300');
    const year = media.first_air_date
        ? media.first_air_date.split('-')[0]
        : media.release_date
            ? media.release_date.split('-')[0]
            : '';
    const rating = media.vote_average ? media.vote_average.toFixed(1) : '–';
    const cast = media.credits?.cast ?? [];
    const directors = useMemo(
        () =>
            (media.credits?.crew ?? [])
                .filter((c) => c.job === 'Director')
                .slice(0, 5),
        [media.credits?.crew],
    );

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
                        className="absolute top-12 left-4 w-9 h-9 bg-black/50 rounded-full items-center justify-center"
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

                <View className="px-4 -mt-[25px]">
                    {/* Title */}
                    <View className="ml-28">
                        <Text className="text-xl font-bold text-white" numberOfLines={3}>
                            {isDrama ? media.name : media.title || media.name}
                        </Text>
                        {isDrama && media.original_name && (
                            <Text className="text-light-200 text-[15px] mt-1">{media.original_name}</Text>
                        )}
                    </View>

                    {/* Meta row */}
                    <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1 mt-3">
                        {year ? <Text className="text-light-300 text-[13px]">{year}</Text> : null}
                        {isDrama && media.number_of_episodes ? (
                            <Text className="text-light-300 text-[13px]">{media.number_of_episodes} eps</Text>
                        ) : null}
                        {isDrama && media.status ? (
                            <View className="bg-dark-100 px-2 py-0.5 rounded-full">
                                <Text className="text-light-200 text-[11px]">{media.status}</Text>
                            </View>
                        ) : null}
                        <View className="flex-row items-center gap-x-1">
                            <Text className="text-accent text-[13px]">★</Text>
                            <Text className="text-light-200 text-[13px]">{rating}</Text>
                        </View>
                    </View>

                    {/* Networks (Drama only) */}
                    {isDrama && networks && networks.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="mt-3"
                            contentContainerStyle={{ gap: 8 }}
                        >
                            {networks.map((n) => (
                                <View key={n.id} className="bg-dark-100 px-3 py-1 rounded-full">
                                    <Text className="text-light-200 text-[12px]">{n.name}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    {/* Genres */}
                    {media.genres && media.genres.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className={isDrama && networks ? 'mt-2' : 'mt-3'}
                            contentContainerStyle={{ gap: 8 }}
                        >
                            {media.genres.map((g) => (
                                <View key={g.id} className="border border-accent/50 px-3 py-1 rounded-full">
                                    <Text className="text-accent text-[12px]">{g.name}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    {/* Watchlist button */}
                    <View className="flex-row gap-x-3 mt-4">
                        {watchlistItem ? (
                            <>
                                <TouchableOpacity
                                    onPress={() => onStatusModalToggle(true)}
                                    activeOpacity={0.8}
                                    className="flex-1 items-center py-3 border border-accent rounded-xl"
                                >
                                    <View className="flex-row items-center gap-x-2">
                                        <StatusIcon
                                            iconName={
                                                STATUS_OPTIONS.find((o) => o.value === watchlistItem.status)?.icon ??
                                                'play'
                                            }
                                        />
                                        <Text
                                            className={`font-semibold text-[14px] ${STATUS_COLORS[watchlistItem.status]}`}
                                        >
                                            {
                                                STATUS_OPTIONS.find((o) => o.value === watchlistItem.status)?.label
                                            }
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                                {onRemove && (
                                    <TouchableOpacity
                                        onPress={onRemove}
                                        activeOpacity={0.8}
                                        className="items-center justify-center px-4 border border-red-500/50 rounded-xl"
                                    >
                                        <Trash2 size={20} strokeWidth={2} color="#F87171" />
                                    </TouchableOpacity>
                                )}
                            </>
                        ) : (
                            <TouchableOpacity
                                onPress={() => onStatusModalToggle(true)}
                                activeOpacity={0.8}
                                className="flex-1 items-center py-3 bg-accent rounded-xl"
                            >
                                <Text className="text-primary font-bold text-[14px]">+ Add to Watchlist</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Synopsis */}
                    {synopsis ? (
                        <View className="mt-5">
                            <Text className="text-base font-semibold text-white mb-2">
                                {isDrama ? 'Synopsis' : 'Overview'}
                            </Text>
                            <Text
                                className="text-light-200 text-[13px] leading-5"
                                numberOfLines={synopsisExpanded ? undefined : 3}
                            >
                                {synopsis}
                            </Text>
                            <TouchableOpacity onPress={onSynopsisToggle} className="mt-1">
                                <Text className="text-accent text-[13px]">
                                    {synopsisExpanded ? 'Show less' : 'Read more'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {/* Cast */}
                    {cast.length > 0 && (
                        <View className="mt-5">
                            <Text className="text-base font-semibold text-white mb-3">Cast</Text>
                            <FlatList
                                data={cast.slice(0, 15)}
                                keyExtractor={(item) => String(item.id)}
                                renderItem={({ item }) => <CastCard cast={item} />}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                scrollEnabled
                            />
                        </View>
                    )}

                    {/* Directors */}
                    {directors.length > 0 && (
                        <View className="mt-5">
                            <Text className="text-base font-semibold text-white mb-3">Directors</Text>
                            <FlatList
                                data={directors}
                                keyExtractor={(item) => String(item.id)}
                                renderItem={({ item }) => <DirectorCard director={item} />}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                scrollEnabled
                            />
                        </View>
                    )}

                    {/* Episodes (Drama only) */}
                    {isDrama && episodes && episodes.length > 0 && (
                        <View className="mt-5">
                            <View className="flex-row items-center justify-between mb-3">
                                <Text className="text-base font-semibold text-white">Episodes</Text>
                                <View className="flex-row items-center gap-x-2">
                                    {media.number_of_seasons && media.number_of_seasons > 1 && (
                                        <View className="flex-row gap-x-2">
                                            {Array.from(
                                                { length: media.number_of_seasons },
                                                (_, i) => i + 1,
                                            ).map((season) => (
                                                <TouchableOpacity
                                                    key={season}
                                                    onPress={() => onSeasonChange?.(season)}
                                                    className={`px-3 py-1 rounded-full ${selectedSeason === season ? 'bg-accent' : 'bg-dark-100'}`}
                                                >
                                                    <Text
                                                        className={`text-[12px] font-medium ${selectedSeason === season ? 'text-primary' : 'text-light-200'}`}
                                                    >
                                                        S{season}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                    {/* Toggle Episode Actions - Icon Only */}
                                    <TouchableOpacity
                                        onPress={() => setShowEpisodeActions(!showEpisodeActions)}
                                        activeOpacity={0.6}
                                        className="ml-1 p-1 z-50"
                                        style={{ zIndex: 50 }}
                                    >
                                        <ChevronDown
                                            size={18}
                                            strokeWidth={2.5}
                                            color="#AB8BFF"
                                            style={{
                                                transform: [{ rotate: showEpisodeActions ? '180deg' : '0deg' }],
                                                opacity: 1,
                                                zIndex: 50,
                                            }}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Mark All / Clear All buttons - Collapsible */}
                            {showEpisodeActions && (
                                <View className="flex-row gap-x-2 mb-4">
                                    <TouchableOpacity
                                        onPress={() => onMarkAllSeason?.(true)}
                                        activeOpacity={0.7}
                                        className="flex-1 bg-accent/15 border border-accent px-3 py-2 rounded-lg items-center"
                                    >
                                        <Text className="text-accent text-[12px] font-semibold">Mark All</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => onMarkAllSeason?.(false)}
                                        activeOpacity={0.7}
                                        className="flex-1 bg-red-500/15 border border-red-500/50 px-3 py-2 rounded-lg items-center"
                                    >
                                        <Text className="text-red-400 text-[12px] font-semibold">Clear All</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {episodes.map((ep: TMDBEpisode) => {
                                const isReleased = !!ep.air_date;
                                return (
                                    <View
                                        key={ep.id}
                                        className={`flex-row items-center py-3 border-b border-dark-100 ${!isReleased ? 'opacity-50' : ''}`}
                                    >
                                        <View className="flex-1 mr-3">
                                            <Text
                                                className={`text-[13px] font-medium ${isReleased ? 'text-white' : 'text-light-300'}`}
                                            >
                                                Ep {ep.episode_number} · {ep.name}
                                            </Text>
                                            {ep.air_date ? (
                                                <Text className="text-light-300 text-[11px] mt-0.5">{ep.air_date}</Text>
                                            ) : (
                                                <Text className="text-light-300 text-[11px] mt-0.5 italic">Unreleased</Text>
                                            )}
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => onToggleEpisode?.(ep.episode_number)}
                                            activeOpacity={0.7}
                                            disabled={!isReleased}
                                            className={`w-7 h-7 rounded-full border-2 items-center justify-center ${isEpisodeWatched?.(ep.episode_number) && isReleased ? 'bg-accent border-accent' : isReleased ? 'border-light-200' : 'border-light-300 opacity-50'}`}
                                        >
                                            {isEpisodeWatched?.(ep.episode_number) && isReleased ? (
                                                <Check size={16} strokeWidth={3} color="#030014" />
                                            ) : null}
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Recommended For You */}
                    {recommended && recommended.length > 0 && (
                        <View className="mt-6">
                            <Text className="text-base font-semibold text-white mb-3">
                                Recommended For You
                            </Text>
                            <FlatList
                                data={recommended.slice(0, 10)}
                                keyExtractor={(item) => `recommended-${item.id}`}
                                renderItem={({ item }) => (
                                    <View className="mr-3">
                                        <DramaCard
                                            drama={item}
                                            compact
                                            onPress={() => {
                                                const route =
                                                    item.media_type === 'movie'
                                                        ? `/movie/${item.id}`
                                                        : `/drama/${item.id}`;
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
            </ScrollView>

            {/* Status selection modal */}
            <Modal
                visible={showStatusModal}
                transparent
                animationType="slide"
                onRequestClose={() => onStatusModalToggle(false)}
            >
                <TouchableOpacity
                    className="flex-1 justify-end bg-black/60"
                    activeOpacity={1}
                    onPress={() => onStatusModalToggle(false)}
                >
                    <View className="rounded-t-3xl bg-dark-100 px-6 pt-6 pb-10">
                        <Text className="text-lg font-bold text-center text-white mb-5">
                            {watchlistItem ? 'Change Status' : 'Add to Watchlist'}
                        </Text>
                        {STATUS_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                onPress={() => onStatusSelect(option.value)}
                                activeOpacity={0.8}
                                className={`flex-row items-center py-4 border-b border-dark-200 ${watchlistItem?.status === option.value ? 'opacity-100' : 'opacity-80'}`}
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
