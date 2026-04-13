import { useCallback, useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import WatchlistCard from '@/components/watchlist/WatchlistCard';
import type { WatchlistStatus, WatchlistWithProgress } from '@/types';

type FilterTab = 'all' | WatchlistStatus;
type SortKey = 'recent_added' | 'recent_updated' | 'title_az';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'watching', label: 'Watching' },
  { key: 'planning', label: 'Planning' },
  { key: 'completed', label: 'Completed' },
  { key: 'dropped', label: 'Dropped' },
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

  const filtered =
    activeFilter === 'all' ? items : items.filter((i) => i.status === activeFilter);
  const sorted = sortItems(filtered, activeSort);

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
        onPress: () => removeFromWatchlist(item.id),
      },
    ]);
  };

  const showStatusOptions = (item: WatchlistWithProgress) => {
    const options: WatchlistStatus[] = ['watching', 'planning', 'completed', 'dropped'];
    Alert.alert('Change Status', undefined, [
      ...options.map((s) => ({
        text: s.charAt(0).toUpperCase() + s.slice(1),
        onPress: () => updateStatus(item.id, s),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <View className="flex-1 bg-primary">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-3">
        <View>
          <Text className="text-white font-bold text-2xl">My Watchlist</Text>
          <Text className="text-light-300 text-[13px]">
            {items.length} {items.length === 1 ? 'title' : 'titles'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowSortMenu((p) => !p)}
          className="bg-dark-100 px-3 py-1.5 rounded-full"
        >
          <Text className="text-light-200 text-[13px]">
            {SORT_OPTIONS.find((s) => s.key === activeSort)?.label} ↕
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort dropdown */}
      {showSortMenu && (
        <View className="mx-4 bg-dark-100 rounded-xl overflow-hidden mb-2">
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => {
                setActiveSort(opt.key);
                setShowSortMenu(false);
              }}
              className="px-4 py-3 flex-row items-center justify-between"
            >
              <Text className="text-white text-[13px]">{opt.label}</Text>
              {activeSort === opt.key && <Text className="text-accent">✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4"
        contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
      >
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveFilter(tab.key)}
            activeOpacity={0.8}
            className={`px-4 py-1.5 rounded-full ${
              activeFilter === tab.key ? 'bg-accent' : 'bg-dark-100'
            }`}
          >
            <Text
              className={`text-[13px] font-medium ${
                activeFilter === tab.key ? 'text-primary' : 'text-light-200'
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {isLoading && items.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#AB8BFF" />
        </View>
      ) : (
        <FlatList<WatchlistWithProgress>
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WatchlistCard
              item={item}
              onPress={() => router.push(`/drama/${item.media_id}`)}
              onLongPress={() => handleLongPress(item)}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 120,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#AB8BFF"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Text className="text-4xl mb-3">📺</Text>
              <Text className="text-light-300 text-base text-center">
                {EMPTY_MESSAGES[activeFilter]}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
