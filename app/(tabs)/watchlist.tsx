import WatchlistCard from '@/components/watchlist/WatchlistCard';
import { useAuthStore } from '@/store/useAuthStore';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import type { WatchlistStatus, WatchlistWithProgress } from '@/types';
import { useRouter } from 'expo-router';
import { Check, ChevronDown, Download, Film, Upload } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

type FilterTab = 'all' | WatchlistStatus;
type SortKey = 'recent_added' | 'recent_updated' | 'title_az';
type MediaTypeFilter = 'all' | 'kdrama' | 'anime' | 'movie' | 'series';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'watching', label: 'Watching' },
  { key: 'planning', label: 'Planning' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'completed', label: 'Completed' },
  { key: 'dropped', label: 'Dropped' },
];

const MEDIA_TYPE_FILTERS: { key: MediaTypeFilter; label: string }[] = [
  { key: 'all', label: 'All Content' },
  { key: 'kdrama', label: 'K-Dramas' },
  { key: 'series', label: 'Series' },
  { key: 'anime', label: 'Anime' },
  { key: 'movie', label: 'Movies' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent_added', label: 'Recently Added' },
  { key: 'recent_updated', label: 'Recently Updated' },
  { key: 'title_az', label: 'Title A–Z' },
];

const EMPTY_MESSAGES: Record<FilterTab, string> = {
  all: 'Start tracking your first drama',
  watching: 'Nothing currently watching',
  planning: 'No dramas planned yet',
  on_hold: 'No dramas on hold',
  completed: 'No completed dramas yet',
  dropped: 'No dropped dramas',
};

function sortItems(items: WatchlistWithProgress[], sort: SortKey): WatchlistWithProgress[] {
  return [...items].sort((a, b) => {
    if (sort === 'title_az') return a.media_title.localeCompare(b.media_title);
    if (sort === 'recent_updated')
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default function WatchlistScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, isLoading, fetchWatchlist, removeFromWatchlist, updateStatus } = useWatchlistStore();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [activeSort, setActiveSort] = useState<SortKey>('recent_added');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) fetchWatchlist(user.id);
  }, [user]);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchWatchlist(user.id);
    setRefreshing(false);
  }, [user, fetchWatchlist]);

  // Counts per status scoped to the active media type filter
  const statusCounts = useMemo(() => {
    const base = mediaTypeFilter === 'all' ? items : items.filter((i) => i.media_type === mediaTypeFilter);
    const counts: Record<string, number> = { all: base.length };
    base.forEach((i) => { counts[i.status] = (counts[i.status] ?? 0) + 1; });
    return counts;
  }, [items, mediaTypeFilter]);

  const filtered =
    activeFilter === 'all' ? items : items.filter((i) => i.status === activeFilter);
  const mediaFiltered = mediaTypeFilter === 'all' ? filtered : filtered.filter((i) => i.media_type === mediaTypeFilter);
  const sorted = sortItems(mediaFiltered, activeSort);

  const handleLongPress = (item: WatchlistWithProgress) => {
    Alert.alert(item.media_title, 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Change Status',
        onPress: () => showStatusOptions(item),
      },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeFromWatchlist(item.id);
          Toast.show({
            type: 'success',
            text1: 'Removed from watchlist',
            duration: 2000,
          });
        },
      },
    ]);
  };

  const showStatusOptions = (item: WatchlistWithProgress) => {
    const options: WatchlistStatus[] = ['watching', 'planning', 'on_hold', 'completed', 'dropped'];
    const statusLabels = {
      watching: 'Watching',
      planning: 'Plan to Watch',
      on_hold: 'On Hold',
      completed: 'Completed',
      dropped: 'Dropped',
    };
    Alert.alert('Change Status', undefined, [
      ...options.map((s) => ({
        text: statusLabels[s],
        onPress: () => {
          updateStatus(item.id, s);
          Toast.show({
            type: 'success',
            text1: `Status changed to ${statusLabels[s]}`,
            duration: 2000,
          });
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <View className="flex-1 bg-primary">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-3 pt-14">
        <View>
          <Text className="text-2xl font-bold text-white">My Watchlist</Text>
          <Text className="text-light-300 text-[13px]">
            {items.length} {items.length === 1 ? 'title' : 'titles'}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => router.push('/watchlist/export' as never)}
            className="bg-dark-100 px-3 py-1.5 rounded-full"
          >
            <Upload size={18} color="#B0B0B0" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/watchlist/import' as never)}
            className="bg-dark-100 px-3 py-1.5 rounded-full"
          >
            <Download size={18} color="#B0B0B0" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowSortMenu((p) => !p)}
            className="bg-dark-100 px-3 py-1.5 rounded-full flex-row items-center gap-x-1"
          >
            <Text className="text-light-200 text-[13px]">
              {SORT_OPTIONS.find((s) => s.key === activeSort)?.label}
            </Text>
            <ChevronDown size={16} strokeWidth={2} color="#B0B0B0" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort dropdown */}
      {showSortMenu && (
        <View className="mx-4 mb-2 overflow-hidden border bg-dark-100 rounded-xl border-accent/30">
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => {
                setActiveSort(opt.key);
                setShowSortMenu(false);
              }}
              className="flex-row items-center justify-between px-4 py-3 border-b border-dark-200 last:border-b-0"
            >
              <Text className="text-white text-[13px]">{opt.label}</Text>
              {activeSort === opt.key && <Check size={18} color="#AB8BFF" strokeWidth={2} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Filters Row */}
      <View className="px-4 mb-4">
        {/* Status Label and Filter */}
        <Text className="mb-2 text-xs tracking-wider uppercase text-light-300">Status</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingBottom: 8 }}
        >
          {FILTER_TABS.map((tab) => {
            const count = statusCounts[tab.key] ?? 0;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                activeOpacity={0.8}
                className={`px-3 py-1 rounded-lg flex-shrink-0 border ${activeFilter === tab.key ? 'bg-accent border-accent' : 'bg-dark-100 border-dark-100'
                  }`}
              >
                <Text
                  className={`text-xs font-semibold ${activeFilter === tab.key ? 'text-primary' : 'text-light-200'
                    }`}
                >
                  {tab.label}{count > 0 ? ` (${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Media Type Filter */}
      <View className="px-4 mb-4">
        <Text className="mb-2 text-xs tracking-wider uppercase text-light-300">Content Type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {MEDIA_TYPE_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setMediaTypeFilter(filter.key)}
              activeOpacity={0.8}
              className={`px-3 py-1 rounded-lg flex-shrink-0 border ${mediaTypeFilter === filter.key ? 'bg-accent border-accent' : 'bg-dark-100 border-dark-100'
                }`}
            >
              <Text
                className={`text-xs font-semibold ${mediaTypeFilter === filter.key ? 'text-primary' : 'text-light-200'
                  }`}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading && items.length === 0 ? (
        <View className="items-center justify-center flex-1">
          <ActivityIndicator color="#AB8BFF" />
        </View>
      ) : (
        <FlatList<WatchlistWithProgress>
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WatchlistCard
              item={item}
              onPress={() => {
                const route = item.media_type === 'movie' ? `/movie/${item.media_id}` : `/drama/${item.media_id}`;
                router.push(route);
              }}
              onLongPress={() => handleLongPress(item)}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 120,
            flexGrow: 1,
            gap: 8,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#AB8BFF"
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center flex-1 pt-20">
              <Film size={48} color="#AB8BFF" strokeWidth={2} />
              <Text className="mt-3 text-base text-center text-light-300">
                {EMPTY_MESSAGES[activeFilter]}
              </Text>
              {activeFilter === 'all' && (
                <View className="flex-row gap-3 mt-4">
                  <TouchableOpacity
                    onPress={() => router.push('/search')}
                    className="px-6 py-2 rounded-lg bg-accent"
                  >
                    <Text className="font-bold text-primary">Start Exploring</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push('/watchlist/import' as never)}
                    className="px-6 py-2 rounded-lg bg-dark-100 border border-accent/50"
                  >
                    <Text className="font-bold text-accent">Import List</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
