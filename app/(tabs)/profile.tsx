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
import { ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoritePeopleStore } from '@/store/useFavoritePeopleStore';
import { usePollStore } from '@/store/usePollStore';
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

function Divider() {
  return <View className="w-px bg-dark-200 self-stretch" />;
}

interface ActionRowProps {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  loading?: boolean;
}

function ActionRow({ label, onPress, destructive = false, loading = false }: ActionRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={loading}
      className={`flex-row items-center rounded-xl px-4 py-4 ${
        destructive
          ? 'bg-red-500/10 border border-red-500/30'
          : 'bg-dark-100'
      }`}
    >
      {loading ? (
        <ActivityIndicator color={destructive ? '#EF4444' : '#AB8BFF'} size="small" />
      ) : (
        <>
          <Text
            className={`text-base flex-1 ${
              destructive ? 'text-red-400 font-medium' : 'text-white'
            }`}
          >
            {label}
          </Text>
          {!destructive && (
            <ChevronRight size={16} color="#A8B5DB" strokeWidth={2} />
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, isLoading: authLoading } = useAuthStore();
  const { items, fetchWatchlist } = useWatchlistStore();
  const { myPolls, fetchMyPolls } = usePollStore();
  const { favorites, fetchFavorites } = useFavoritePeopleStore();

  useEffect(() => {
    if (user) {
      fetchWatchlist(user.id);
      fetchMyPolls(user.id);
      fetchFavorites(user.id);
    }
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

  // Watchlist stats
  const totalTracked = items.length;
  const watching = items.filter((i) => i.status === 'watching').length;
  const completed = items.filter((i) => i.status === 'completed').length;
  const episodesWatched = items.reduce((sum, i) => sum + i.episodes_watched, 0);

  // Poll stats
  const pollsCreated = myPolls.length;
  const totalVoters = myPolls.reduce((sum, p) => sum + p.total_votes, 0);

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

      {/* Watchlist Stats */}
      <View className="mx-4 bg-dark-100 rounded-2xl py-4 px-2 mb-3">
        <Text className="text-light-300 text-[11px] text-center mb-3 uppercase tracking-wide">
          Watchlist
        </Text>
        <View className="flex-row">
          <StatBlock value={totalTracked} label="Tracked" />
          <Divider />
          <StatBlock value={watching} label="Watching" />
          <Divider />
          <StatBlock value={completed} label="Completed" />
          <Divider />
          <StatBlock value={episodesWatched} label="Episodes" />
        </View>
      </View>

      {/* Poll Stats */}
      <View className="mx-4 bg-dark-100 rounded-2xl py-4 px-2 mb-6">
        <Text className="text-light-300 text-[11px] text-center mb-3 uppercase tracking-wide">
          Polls
        </Text>
        <View className="flex-row">
          <StatBlock value={pollsCreated} label="Polls Created" />
          <Divider />
          <StatBlock value={totalVoters} label="Total Voters" />
        </View>
      </View>

      {/* Links */}
      <View className="px-4 gap-y-3">
        <ActionRow
          label="Edit Profile"
          onPress={() => router.push('/settings/account')}
        />
        <ActionRow
          label={`Favorite People${favorites.length > 0 ? ` (${favorites.length})` : ''}`}
          onPress={() => router.push('/favorites/people' as never)}
        />
        <ActionRow
          label="My Poll History"
          onPress={() => router.push('/poll/history' as never)}
        />
        <ActionRow
          label="Settings"
          onPress={() => router.push('/settings' as never)}
        />
        <ActionRow
          label="Sign Out"
          onPress={handleSignOut}
          destructive
          loading={authLoading}
        />
      </View>
    </ScrollView>
  );
}
