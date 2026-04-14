import ImageWithFallback from '@/components/ImageWithFallback';
import { getImageUrl } from '@/services/tmdb';
import type { WatchlistStatus, WatchlistWithProgress } from '@/types';
import { Text, TouchableOpacity, View } from 'react-native';

interface WatchlistCardProps {
  item: WatchlistWithProgress;
  onPress: () => void;
  onLongPress: () => void;
}

const STATUS_CONFIG: Record<WatchlistStatus, { label: string; bg: string; text: string }> = {
  watching: { label: 'Watching', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  completed: { label: 'Completed', bg: 'bg-green-500/20', text: 'text-green-400' },
  planning: { label: 'Planning', bg: 'bg-gray-500/20', text: 'text-gray-400' },
  on_hold: { label: 'On Hold', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  dropped: { label: 'Dropped', bg: 'bg-red-500/20', text: 'text-red-400' },
};

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function WatchlistCard({ item, onPress, onLongPress }: WatchlistCardProps) {
  const posterUrl = getImageUrl(item.media_poster, 'w300');
  const cfg = STATUS_CONFIG[item.status];
  const progress =
    item.total_episodes && item.total_episodes > 0
      ? Math.min(item.episodes_watched / item.total_episodes, 1)
      : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      className="flex-row bg-dark-100 rounded-xl p-3 mb-4"
    >
      <ImageWithFallback
        source={posterUrl ? { uri: posterUrl } : undefined}
        style={{ width: 60, height: 90, borderRadius: 8 }}
        contentFit="cover"
      />

      <View className="flex-1 ml-3 justify-between py-0.5">
        <View>
          <Text className="text-white font-semibold text-[14px]" numberOfLines={1}>
            {item.media_title}
          </Text>
          {item.media_title_korean ? (
            <Text className="text-light-200 text-[12px] mt-0.5" numberOfLines={1}>
              {item.media_title_korean}
            </Text>
          ) : null}
        </View>

        <View className="mt-1">
          <View className={`self-start px-2 py-0.5 rounded-full ${cfg.bg}`}>
            <Text className={`text-[10px] font-medium ${cfg.text}`}>{cfg.label}</Text>
          </View>

          {item.total_episodes ? (
            <View className="mt-2">
              <View className="h-1 bg-dark-200 rounded-full overflow-hidden">
                <View
                  className="h-1 bg-accent rounded-full"
                  style={{ width: `${progress * 100}%` }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-light-300 text-[11px]">
                  {item.episodes_watched} / {item.total_episodes} eps
                </Text>
                <Text className="text-light-300 text-[11px]">
                  {formatRelative(item.updated_at)}
                </Text>
              </View>
            </View>
          ) : (
            <Text className="text-light-300 text-[11px] mt-1">
              {formatRelative(item.updated_at)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
