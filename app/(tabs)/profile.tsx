import { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import { supabase } from '@/services/supabase';
import type { Profile } from '@/types';

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(/[\s_]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View className="w-20 h-20 rounded-full bg-accent items-center justify-center">
      <Text className="text-primary font-bold text-2xl">{initials}</Text>
    </View>
  );
}

interface StatBlockProps {
  value: number;
  label: string;
}

function StatBlock({ value, label }: StatBlockProps) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-white font-bold text-xl">{value}</Text>
      <Text className="text-light-300 text-[11px] text-center mt-0.5">{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, isLoading: authLoading } = useAuthStore();
  const { items, fetchWatchlist } = useWatchlistStore();

  useEffect(() => {
    if (user) fetchWatchlist(user.id);
  }, [user]);

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return (data as Profile) ?? null;
    },
    enabled: !!user?.id,
  });

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  // Stats
  const totalTracked = items.length;
  const watching = items.filter((i) => i.status === 'watching').length;
  const completed = items.filter((i) => i.status === 'completed').length;
  const episodesWatched = items.reduce((sum, i) => sum + i.episodes_watched, 0);

  if (!user) return null;

  const displayName = profile?.username ?? user.email?.split('@')[0] ?? 'User';
  const memberSince = formatMemberSince(user.created_at);

  return (
    <ScrollView
      className="flex-1 bg-primary"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Header */}
      <View className="px-4 pt-14 pb-6 items-center">
        {profileLoading ? (
          <View className="w-20 h-20 rounded-full bg-dark-100 items-center justify-center">
            <ActivityIndicator color="#AB8BFF" />
          </View>
        ) : (
          <InitialsAvatar name={displayName} />
        )}

        <Text className="text-white font-bold text-xl mt-4">{displayName}</Text>

        {profile?.bio ? (
          <Text className="text-light-200 text-[13px] text-center mt-1 px-8">
            {profile.bio}
          </Text>
        ) : null}

        <Text className="text-light-300 text-[12px] mt-2">
          Member since {memberSince}
        </Text>
      </View>

      {/* Stats */}
      <View className="mx-4 bg-dark-100 rounded-2xl py-4 px-2">
        <View className="flex-row">
          <StatBlock value={totalTracked} label="Total Tracked" />
          <View className="w-px bg-dark-200 self-stretch" />
          <StatBlock value={watching} label="Watching" />
          <View className="w-px bg-dark-200 self-stretch" />
          <StatBlock value={completed} label="Completed" />
          <View className="w-px bg-dark-200 self-stretch" />
          <StatBlock value={episodesWatched} label="Episodes" />
        </View>
      </View>

      {/* Actions */}
      <View className="px-4 mt-6 gap-y-3">
        <TouchableOpacity
          onPress={() => router.push('/settings/account' as never)}
          activeOpacity={0.8}
          className="flex-row items-center bg-dark-100 rounded-xl px-4 py-4"
        >
          <Text className="text-white text-base flex-1">Edit Profile</Text>
          <Text className="text-light-300">›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.8}
          disabled={authLoading}
          className="flex-row items-center bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-4"
        >
          {authLoading ? (
            <ActivityIndicator color="#EF4444" size="small" />
          ) : (
            <Text className="text-red-400 text-base font-medium flex-1">Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
