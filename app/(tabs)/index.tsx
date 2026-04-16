import DramaCard from '@/components/drama/DramaCard';
import ImageWithFallback from '@/components/ImageWithFallback';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { images } from '@/constants/images';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useStreak } from '@/hooks/useStreak';
import { getImageUrl, getTrending } from '@/services/tmdb';
import { useAuthStore } from '@/store/useAuthStore';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import type { TMDBDrama, WatchlistWithProgress } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bell, Clapperboard, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';


function TrendingSkeleton() {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} className="mr-3 w-28">
          <View
            style={{ width: 112, height: 160, borderRadius: 8, backgroundColor: '#221F3D' }}
          />
          <View className="w-4/5 h-3 mt-2 rounded bg-dark-100" />
        </View>
      ))}
    </View>
  );
}

function ContinueWatchingCard({
  item,
  onPress,
}: {
  item: WatchlistWithProgress;
  onPress: () => void;
}) {
  const posterUrl = getImageUrl(item.media_poster, 'w300');
  const progress =
    item.total_episodes && item.total_episodes > 0
      ? Math.min(item.episodes_watched / item.total_episodes, 1)
      : 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} className="w-32 mr-3">
      <ImageWithFallback
        source={posterUrl ? { uri: posterUrl } : undefined}
        style={{ width: 128, height: 185, borderRadius: 10 }}
        contentFit="cover"
      />
      <Text className="text-white text-[12px] font-medium mt-1.5" numberOfLines={1}>
        {item.media_title}
      </Text>
      <View className="h-1 mt-1 overflow-hidden rounded-full bg-dark-100">
        <View
          className="h-1 rounded-full bg-accent"
          style={{ width: `${progress * 100}%` }}
        />
      </View>
      {item.total_episodes ? (
        <Text className="text-light-300 text-[10px] mt-0.5">
          {item.episodes_watched}/{item.total_episodes}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, isLoading: watchlistLoading, fetchWatchlist } = useWatchlistStore();
  const { streak, streakAtRisk } = useStreak();
  const { isOffline } = useNetworkStatus();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) fetchWatchlist(user.id);
  }, [user]);

  const { data: trending, isLoading: trendingLoading, refetch: refetchTrending } = useQuery({
    queryKey: ['trending'],
    queryFn: getTrending,
    staleTime: 10 * 60 * 1000,
  });

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.all([fetchWatchlist(user.id), refetchTrending()]);
    setRefreshing(false);
  }, [user, fetchWatchlist, refetchTrending]);

  const watching = items.filter((i) => i.status === 'watching');
  const recentlyAdded = [...items]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <View className="flex-1 bg-primary">
      <OfflineBanner isOffline={isOffline} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AB8BFF" />
        }
      >
        {/* Header with Streak Badge */}
        <View className="flex-row items-center justify-between px-4 pb-4 pt-14">
          <View className="flex-row items-center gap-x-2.5">
            <Image source={images.votchIcon} className="w-9 h-9 rounded-lg" />
            <View className="flex-row items-center gap-x-1">
              <Text className="text-3xl font-black tracking-wider text-accent">Votch</Text>
              <Clapperboard size={28} color="#AB8BFF" strokeWidth={2.5} />
            </View>
          </View>
          <View className="flex-row items-center gap-x-2">
            {streak > 0 && <StreakBadge streak={streak} size="sm" isAtRisk={streakAtRisk} />}
            <TouchableOpacity
              onPress={() => router.push('/poll/create' as never)}
              activeOpacity={0.8}
              className="flex-row items-center gap-x-1 bg-accent/15 px-3 py-1.5 rounded-lg"
            >
              <Plus size={14} color="#AB8BFF" strokeWidth={2.5} />
              <Text className="text-xs font-semibold text-accent">Poll</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              activeOpacity={0.8}
              className="items-center justify-center w-9 h-9"
            >
              <Bell size={22} color="#AB8BFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak at Risk Banner */}
        {streakAtRisk && (
          <View className="mx-4 mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
            <Text className="text-orange-900 text-sm font-medium">
              ⚡ Watch something today to keep your {streak}-day streak!
            </Text>
            <TouchableOpacity
              onPress={() => {
                // Scroll to continue watching or navigate to watchlist
                router.push('/(tabs)/watchlist');
              }}
              className="mt-2"
            >
              <Text className="text-orange-700 text-xs font-semibold">
                Find something to watch →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Continue Watching */}
        {watching.length > 0 && (
          <View className="mb-6">
            <Text className="px-4 mb-3 text-base font-semibold text-white">
              Continue Watching
            </Text>
            <FlatList<WatchlistWithProgress>
              data={watching}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ContinueWatchingCard
                  item={item}
                  onPress={() => router.push(`/drama/${item.media_id}`)}
                />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            />
          </View>
        )}

        {/* Trending Shows */}
        <View className="mb-6">
          <Text className="px-4 mb-3 text-base font-semibold text-white">
            Trending Now
          </Text>
          {trendingLoading ? (
            <View className="px-4">
              <TrendingSkeleton />
            </View>
          ) : (
            <FlatList<TMDBDrama>
              data={trending ?? []}
              keyExtractor={(item, idx) => `${item.media_type}-${item.id}-${idx}`}
              renderItem={({ item }) => (
                <DramaCard
                  drama={item}
                  onPress={() => {
                    const route = item.media_type === 'movie' ? `/movie/${item.id}` : `/drama/${item.id}`;
                    router.push(route);
                  }}
                  compact
                />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              scrollEventThrottle={16}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              ListEmptyComponent={
                <Text className="px-4 text-sm text-light-300">Nothing trending right now</Text>
              }
            />
          )}
        </View>

        {/* Recently Added */}
        {recentlyAdded.length > 0 && (
          <View className="px-4">
            <Text className="mb-3 text-base font-semibold text-white">
              Recently Added to My List
            </Text>
            {recentlyAdded.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  const route = item.media_type === 'movie' ? `/movie/${item.media_id}` : `/drama/${item.media_id}`;
                  router.push(route);
                }}
                activeOpacity={0.8}
                className="flex-row items-center p-3 mb-4 bg-dark-100 rounded-xl"
              >
                <Image
                  source={item.media_poster ? { uri: getImageUrl(item.media_poster, 'w300') ?? '' } : undefined}
                  style={{ width: 44, height: 64, borderRadius: 6 }}
                  contentFit="cover"
                />
                <View className="flex-1 ml-3">
                  <Text className="text-white text-[13px] font-medium" numberOfLines={1}>
                    {item.media_title}
                  </Text>
                  {item.media_title_korean ? (
                    <Text className="text-light-300 text-[11px] mt-0.5" numberOfLines={1}>
                      {item.media_title_korean}
                    </Text>
                  ) : null}
                  <Text className="text-light-300 text-[11px] mt-0.5 capitalize">
                    {item.status}
                    {item.total_episodes
                      ? ` · ${item.episodes_watched}/${item.total_episodes} eps`
                      : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty state when watchlist is loading and no items */}
        {!watchlistLoading && items.length === 0 && (
          <View className="px-4 mt-4">
            <TouchableOpacity
              onPress={() => router.push('/search')}
              activeOpacity={0.8}
            >
              <Text className="mt-3 mb-1 text-base font-semibold text-white">
                Start Your Watchlist
              </Text>
              <Text className="text-light-300 text-[13px] text-center">
                Search for K-Dramas and add them to track your progress
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
