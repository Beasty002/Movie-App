import { Image } from 'expo-image';
import { TouchableOpacity, View, Text } from 'react-native';
import type { TMDBDrama, WatchlistStatus } from '@/types';
import { getImageUrl } from '@/services/tmdb';

interface DramaCardProps {
  drama: TMDBDrama;
  onPress: () => void;
  showStatus?: boolean;
  status?: WatchlistStatus;
  /** Compact mode: vertical poster card (for horizontal lists on home screen) */
  compact?: boolean;
}

const STATUS_LABELS: Record<WatchlistStatus, string> = {
  watching: 'Watching',
  completed: 'Completed',
  planning: 'Planning',
  dropped: 'Dropped',
};

const STATUS_COLORS: Record<WatchlistStatus, string> = {
  watching: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  planning: 'bg-gray-500/20 text-gray-400',
  dropped: 'bg-red-500/20 text-red-400',
};

function StatusBadge({ status }: { status: WatchlistStatus }) {
  const colors = STATUS_COLORS[status];
  const [bg, text] = colors.split(' ');
  return (
    <View className={`px-2 py-0.5 rounded-full ${bg}`}>
      <Text className={`text-[10px] font-medium ${text}`}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

export default function DramaCard({ drama, onPress, showStatus, status, compact }: DramaCardProps) {
  const posterUrl = getImageUrl(drama.poster_path, 'w300');
  const year = drama.first_air_date ? drama.first_air_date.split('-')[0] : '';
  const rating = drama.vote_average ? drama.vote_average.toFixed(1) : '–';

  if (compact) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} className="mr-3 w-28">
        <Image
          source={posterUrl ? { uri: posterUrl } : undefined}
          style={{ width: 112, height: 160, borderRadius: 8 }}
          contentFit="cover"
          placeholder={{ color: '#221F3D' }}
        />
        <Text className="text-white text-xs font-medium mt-1.5" numberOfLines={2}>
          {drama.name}
        </Text>
        <Text className="text-light-300 text-[11px] mt-0.5">{year}</Text>
      </TouchableOpacity>
    );
  }

  const episodeInfo = [
    year,
    drama.number_of_episodes ? `${drama.number_of_episodes} eps` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="flex-row p-3 mb-3 bg-dark-100 rounded-xl"
    >
      <Image
        source={posterUrl ? { uri: posterUrl } : undefined}
        style={{ width: 70, height: 100, borderRadius: 8 }}
        contentFit="cover"
        placeholder={{ color: '#221F3D' }}
      />

      <View className="flex-1 ml-3 justify-between py-0.5">
        <View>
          <Text className="text-white font-bold text-[15px]" numberOfLines={2}>
            {drama.name}
          </Text>
          <Text className="text-light-200 text-[13px] mt-0.5" numberOfLines={1}>
            {drama.original_name}
          </Text>
        </View>

        <View>
          {episodeInfo ? (
            <Text className="text-light-300 text-[12px] mt-1">{episodeInfo}</Text>
          ) : null}

          <View className="flex-row items-center mt-1.5 gap-x-2">
            <View className="flex-row items-center gap-x-0.5">
              <Text className="text-accent text-[12px]">★</Text>
              <Text className="text-light-200 text-[12px] ml-0.5">{rating}</Text>
            </View>
            {showStatus && status ? <StatusBadge status={status} /> : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
