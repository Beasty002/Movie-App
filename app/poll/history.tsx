import PollListCard from '@/components/poll/PollListCard';
import { useAuthStore } from '@/store/useAuthStore';
import { usePollStore } from '@/store/usePollStore';
import type { PollListItem } from '@/types';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function mergeSortedPolls(
  myPolls: PollListItem[],
  votedPolls: PollListItem[],
): PollListItem[] {
  const seen = new Set<string>();
  const all: PollListItem[] = [];
  for (const p of [...myPolls, ...votedPolls]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      all.push(p);
    }
  }
  return all.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export default function PollHistoryScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { myPolls, votedPolls, isLoading, fetchMyPolls, fetchVotedPolls } =
    usePollStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    if (!user) return;
    await Promise.all([fetchMyPolls(user.id), fetchVotedPolls(user.id)]);
  }, [user, fetchMyPolls, fetchVotedPolls]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const merged = mergeSortedPolls(myPolls, votedPolls);

  return (
    <View className="flex-1 bg-primary">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-14 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="w-9 h-9 rounded-full bg-dark-100 items-center justify-center mr-3"
        >
          <ArrowLeft size={18} color="#A8B5DB" strokeWidth={2} />
        </TouchableOpacity>
        <Text className="text-white font-bold text-xl">Poll History</Text>
      </View>

      <FlatList<PollListItem>
        data={merged}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PollListCard
            poll={item}
            onPress={() => router.push(`/poll/${item.id}` as never)}
          />
        )}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 120,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#AB8BFF"
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="flex-1 items-center justify-center pt-20">
              <View className="w-16 h-16 rounded-full bg-dark-100 items-center justify-center mb-4">
                <Clock size={26} color="#A8B5DB" strokeWidth={1.5} />
              </View>
              <Text className="text-white font-semibold text-base mb-1">
                No poll history yet
              </Text>
              <Text className="text-light-300 text-sm text-center px-8">
                Create or vote on polls and they'll appear here
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
