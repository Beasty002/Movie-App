import PollListCard from '@/components/poll/PollListCard';
import { useAuthStore } from '@/store/useAuthStore';
import { usePollStore } from '@/store/usePollStore';
import type { PollListItem } from '@/types';
import { useRouter } from 'expo-router';
import { Hash, Plus, Vote, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type SubTab = 'mine' | 'voted';

function EmptyMyPolls({ onCreate }: { onCreate: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 pt-16">
      <View className="w-16 h-16 rounded-full bg-accent/10 items-center justify-center mb-4">
        <Vote size={28} color="#AB8BFF" strokeWidth={1.5} />
      </View>
      <Text className="text-white font-semibold text-base text-center mb-1">
        No polls yet
      </Text>
      <Text className="text-light-300 text-sm text-center mb-6">
        Create your first poll and share with friends to decide what to watch
      </Text>
      <TouchableOpacity
        onPress={onCreate}
        activeOpacity={0.8}
        className="bg-accent px-6 py-3 rounded-xl"
      >
        <Text className="text-primary font-semibold text-sm">Create Poll</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyVoted() {
  return (
    <View className="flex-1 items-center justify-center px-8 pt-16">
      <View className="w-16 h-16 rounded-full bg-dark-100 items-center justify-center mb-4">
        <Vote size={28} color="#A8B5DB" strokeWidth={1.5} />
      </View>
      <Text className="text-white font-semibold text-base text-center mb-1">
        No votes yet
      </Text>
      <Text className="text-light-300 text-sm text-center">
        Polls you vote on will appear here
      </Text>
    </View>
  );
}

export default function PollsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { myPolls, votedPolls, isLoading, fetchMyPolls, fetchVotedPolls, subscribeToMyPolls, unsubscribeFromMyPolls } =
    usePollStore();
  const [activeTab, setActiveTab] = useState<SubTab>('mine');
  const [refreshing, setRefreshing] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeValue, setCodeValue] = useState('');
  const codeInputRef = useRef<TextInput>(null);

  const loadPolls = useCallback(async () => {
    if (!user) return;
    await Promise.all([fetchMyPolls(user.id), fetchVotedPolls(user.id)]);
  }, [user, fetchMyPolls, fetchVotedPolls]);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  // Realtime subscription to my polls
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToMyPolls(user.id);
    return () => {
      unsubscribe();
      unsubscribeFromMyPolls();
    };
  }, [user, subscribeToMyPolls, unsubscribeFromMyPolls]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPolls();
    setRefreshing(false);
  }, [loadPolls]);

  const handlePollPress = (poll: PollListItem) => {
    router.push(`/poll/${poll.id}` as never);
  };

  const handleCreate = () => {
    router.push('/poll/create' as never);
  };

  const handleOpenCodeInput = () => {
    setShowCodeInput(true);
    setTimeout(() => codeInputRef.current?.focus(), 100);
  };

  const handleJoinByCode = () => {
    const code = codeValue.trim();
    if (!code) return;
    setShowCodeInput(false);
    setCodeValue('');
    router.push(`/poll/${code}` as never);
  };

  const currentData = activeTab === 'mine' ? myPolls : votedPolls;

  return (
    <View className="flex-1 bg-primary">
      {/* Header */}
      <View className="px-4 pt-14 pb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white font-bold text-2xl">Polls</Text>
          <View className="flex-row items-center gap-x-2">
            <TouchableOpacity
              onPress={handleOpenCodeInput}
              activeOpacity={0.8}
              className="flex-row items-center gap-x-1.5 bg-dark-100 px-3 py-2 rounded-xl"
            >
              <Hash size={15} color="#AB8BFF" strokeWidth={2.5} />
              <Text className="text-accent font-semibold text-sm">Join</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              activeOpacity={0.8}
              className="flex-row items-center gap-x-1.5 bg-accent px-3 py-2 rounded-xl"
            >
              <Plus size={16} color="#030014" strokeWidth={2.5} />
              <Text className="text-primary font-semibold text-sm">Create</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showCodeInput && (
          <View className="flex-row items-center gap-x-2 bg-dark-100 rounded-xl px-3 py-2">
            <Hash size={15} color="#AB8BFF" strokeWidth={2} />
            <TextInput
              ref={codeInputRef}
              value={codeValue}
              onChangeText={setCodeValue}
              placeholder="Enter poll code…"
              placeholderTextColor="#4A5568"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleJoinByCode}
              className="flex-1 text-white text-sm py-0"
            />
            <TouchableOpacity onPress={handleJoinByCode} hitSlop={8}>
              <Text className="text-accent font-semibold text-sm">Go</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowCodeInput(false); setCodeValue(''); }} hitSlop={8}>
              <X size={16} color="#A8B5DB" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Sub-tab toggle */}
      <View className="flex-row mx-4 mb-4 bg-dark-100 rounded-xl p-1">
        <TouchableOpacity
          onPress={() => setActiveTab('mine')}
          activeOpacity={0.8}
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'mine' ? 'bg-accent' : ''
            }`}
        >
          <Text
            className={`font-semibold text-sm ${activeTab === 'mine' ? 'text-primary' : 'text-light-300'
              }`}
          >
            My Polls
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('voted')}
          activeOpacity={0.8}
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'voted' ? 'bg-accent' : ''
            }`}
        >
          <Text
            className={`font-semibold text-sm ${activeTab === 'voted' ? 'text-primary' : 'text-light-300'
              }`}
          >
            Voted
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList<PollListItem>
        data={currentData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PollListCard poll={item} onPress={() => handlePollPress(item)} />
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
            activeTab === 'mine' ? (
              <EmptyMyPolls onCreate={handleCreate} />
            ) : (
              <EmptyVoted />
            )
          ) : null
        }
      />
    </View>
  );
}
