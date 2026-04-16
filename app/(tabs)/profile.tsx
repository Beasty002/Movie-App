import { GenreChart } from '@/components/profile/GenreChart';
import { WeeklyBar } from '@/components/profile/WeeklyBar';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { useStreak } from '@/hooks/useStreak';
import { getUnlockedAchievements } from '@/services/achievements';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoritePeopleStore } from '@/store/useFavoritePeopleStore';
import { usePollStore } from '@/store/usePollStore';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import type { Achievement, Profile, WeeklyStats } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Award, ChevronRight, Flame, Heart, PencilIcon, Star, Trophy, X, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getAchievementIcon(label: string | undefined, size = 20) {
  if (!label) return <Award size={size} color="#AB8BFF" strokeWidth={1.5} />;

  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes('streak')) return <Flame size={size} color="#FF6B6B" strokeWidth={1.5} />;
  if (lowerLabel.includes('rating')) return <Star size={size} color="#FFD93D" strokeWidth={1.5} />;
  if (lowerLabel.includes('vote')) return <Zap size={size} color="#6BCB77" strokeWidth={1.5} />;
  if (lowerLabel.includes('heart') || lowerLabel.includes('favorite')) return <Heart size={size} color="#FF6B9D" strokeWidth={1.5} />;
  if (lowerLabel.includes('champion') || lowerLabel.includes('master') || lowerLabel.includes('poll')) return <Trophy size={size} color="#FFD93D" strokeWidth={1.5} />;

  return <Award size={size} color="#AB8BFF" strokeWidth={1.5} />;
}

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(/[\s_]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View className="items-center justify-center w-16 h-16 bg-purple-600 border-2 rounded-full border-purple-400/40">
      <Text className="text-xl font-bold text-white">{initials}</Text>
    </View>
  );
}

interface StatCardProps {
  value: number | string;
  label: string;
}

function StatCard({ value, label }: StatCardProps) {
  return (
    <View className="items-center flex-1 p-4 border rounded-lg bg-dark-100 border-dark-200">
      <Text className="text-2xl font-bold text-accent">{value}</Text>
      <Text className="mt-1 text-xs text-center text-light-300">{label}</Text>
    </View>
  );
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
      className={`flex-row items-center rounded-lg px-4 py-3 border ${destructive
        ? 'bg-red-500/10 border-red-500/30'
        : 'bg-dark-100 border-dark-200'
        }`}
    >
      {loading ? (
        <ActivityIndicator color={destructive ? '#EF4444' : '#AB8BFF'} size="small" />
      ) : (
        <>
          <Text
            className={`text-sm flex-1 font-medium ${destructive ? 'text-red-400' : 'text-white'
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
  const { streak, bestStreak, todayWatched, streakAtRisk } = useStreak();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);

  useEffect(() => {
    if (user) {
      fetchWatchlist(user.id);
      fetchMyPolls(user.id);
      fetchFavorites(user.id);
      loadAchievements(user.id);
      loadWeeklyStats(user.id);
    }
  }, [user]);

  const loadAchievements = async (userId: string) => {
    const achs = await getUnlockedAchievements(userId);
    setAchievements(achs);
  };

  const loadWeeklyStats = async (userId: string) => {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { data: progress } = await supabase
        .from('progress')
        .select('watched_at')
        .eq('user_id', userId)
        .gte('watched_at', sevenDaysAgo.toISOString());

      const episodesThisWeek = progress?.length || 0;
      const hoursThisWeek = episodesThisWeek * 1; // Simplified: 1 hour per episode

      // Build genre breakdown
      const { data: watchlistData } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', userId)
        .limit(50);

      const genreBreakdown: Record<string, number> = {};
      // This would require genre info from TMDB for each item

      setWeeklyStats({
        episodesThisWeek,
        hoursThisWeek,
        topDrama: null,
        genreBreakdown,
        comparedToLastWeek: 0,
        weekStart: sevenDaysAgo.toISOString().split('T')[0],
        weekEnd: now.toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('Error loading weekly stats:', error);
    }
  };

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

  // Calculate user stats
  const totalTracked = items.length;
  const watching = items.filter((i) => i.status === 'watching').length;
  const completed = items.filter((i) => i.status === 'completed').length;
  const dropped = items.filter((i) => i.status === 'dropped').length;
  const episodesWatched = items.reduce((sum, i) => sum + i.episodes_watched, 0);

  const hoursWatched = Math.round(episodesWatched * 1.1); // Rough estimate: 60-66 min per episode

  // Poll stats
  const pollsCreated = myPolls.length;
  const totalVoters = myPolls.reduce((sum, p) => sum + p.total_votes, 0);

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;

  if (!user) return null;

  const displayName = profile?.username ?? user.email?.split('@')[0] ?? 'User';
  const memberSince = formatMemberSince(user.created_at);

  // Weekly bar data (mock - would come from DB)
  const weeklyData = [0, 2, 3, 1, 0, 4, 2];

  return (
    <>
      <ScrollView
        className="flex-1 bg-primary"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Section 1: Profile Header */}
        <View className="px-4 pb-5 border-b pt-14 bg-dark-100 border-dark-200">
          {/* Avatar + Info + Streak row */}
          <View className="flex-row items-center gap-3 mb-4">
            {profileLoading ? (
              <View className="items-center justify-center w-16 h-16 rounded-full bg-dark-200">
                <ActivityIndicator color="#A78BFA" />
              </View>
            ) : (
              <InitialsAvatar name={displayName} />
            )}

            <View className="flex-1 min-w-0">
              <Text className="text-xl font-bold leading-tight text-white" numberOfLines={1}>
                {displayName}
              </Text>
              {profile?.bio ? (
                <Text className="text-light-300 text-xs mt-0.5 leading-4" numberOfLines={2}>
                  {profile.bio}
                </Text>
              ) : null}
              <Text className="text-light-300 text-[11px] mt-1">Member since {memberSince}</Text>
            </View>

            <StreakBadge streak={streak} bestStreak={bestStreak} size="md" isAtRisk={streakAtRisk} />
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity
            onPress={() => router.push('/settings/account')}
            activeOpacity={0.75}
            className="flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-accent/50 bg-accent/10"
          >
            <PencilIcon size={14} color="#AB8BFF" strokeWidth={2} />
            <Text className="text-sm font-semibold text-accent">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Section 2: Stats Grid */}
        <View className="gap-3 p-4">
          <View className="flex-row gap-3">
            <StatCard value={totalTracked} label="Total Dramas" />
            <StatCard value={watching} label="Watching Now" />
            <StatCard value={completed} label="Completed" />
          </View>
          <View className="flex-row gap-3">
            <StatCard value={episodesWatched} label="Episodes Watched" />
            <StatCard value={hoursWatched} label="Hours Watched" />
            <StatCard value={dropped} label="Dropped" />
          </View>
        </View>

        {/* Section 3: Weekly Activity */}
        <View className="px-4 mb-4">
          <WeeklyBar
            data={weeklyData}
            totalEpisodes={weeklyData.reduce((a, b) => a + b, 0)}
            totalHours={weeklyData.reduce((a, b) => a + b, 0)}
          />
        </View>

        {/* Section 4: Genre Breakdown */}
        <View className="px-4 mb-4">
          <GenreChart
            genres={[
              { name: 'K-Drama', count: 25 },
              { name: 'Romance', count: 18 },
              { name: 'Thriller', count: 12 },
              { name: 'Comedy', count: 8 },
            ]}
          />
        </View>

        {/* Section 5: Achievements */}
        <View className="px-4 mb-4">
          <View className="p-4 border rounded-lg bg-dark-100 border-dark-200">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-semibold text-white">Achievements</Text>
              <Text className="text-xs font-semibold text-accent">
                {unlockedCount}/{achievements.length} unlocked
              </Text>
            </View>
            <View className="gap-2">
              {achievements.map((achievement) => (
                <TouchableOpacity
                  key={achievement.id}
                  onPress={() => setSelectedAchievement(achievement)}
                  activeOpacity={0.75}
                  className={`flex-row items-center gap-3 px-3 py-3 rounded-xl border ${achievement.isUnlocked
                    ? 'bg-accent/10 border-accent/40'
                    : 'bg-dark-200/50 border-dark-200'
                    }`}
                >
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center ${achievement.isUnlocked ? 'bg-accent/20' : 'bg-dark-200'
                      }`}
                  >
                    <View className={achievement.isUnlocked ? 'opacity-100' : 'opacity-30'}>
                      {getAchievementIcon(achievement.label)}
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-sm font-semibold ${achievement.isUnlocked ? 'text-white' : 'text-light-300'
                        }`}
                    >
                      {achievement.label}
                    </Text>
                    <Text className="text-xs text-light-300 mt-0.5" numberOfLines={1}>
                      {achievement.description}
                    </Text>
                  </View>
                  {achievement.isUnlocked ? (
                    <View className="items-end">
                      <Award size={14} color="#AB8BFF" strokeWidth={2} />
                      {achievement.unlockedAt && (
                        <Text className="text-[10px] text-light-300 mt-0.5">
                          {new Date(achievement.unlockedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View className="items-center justify-center w-5 h-5 rounded-full bg-dark-200">
                      <Text className="text-[10px] text-light-300">🔒</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Section 6: Poll Stats */}
        <View className="px-4 mb-4">
          <View className="p-4 border rounded-lg bg-dark-100 border-dark-200">
            <Text className="mb-3 text-sm font-semibold text-white">Poll Stats</Text>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-light-300">Polls Created</Text>
                <Text className="font-semibold text-white">{pollsCreated}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-light-300">Total Votes Received</Text>
                <Text className="font-semibold text-white">{totalVoters}</Text>
              </View>
            </View>
            {pollsCreated > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/poll/history')}
                className="py-2 mt-3"
              >
                <Text className="text-sm font-medium text-accent">View Poll History →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Section 7: Links */}
        <View className="gap-2 px-4">
          <ActionRow
            label={`Favorite People${favorites.length > 0 ? ` (${favorites.length})` : ''}`}
            onPress={() => router.push('/favorites/people')}
          />
          <ActionRow
            label="Settings"
            onPress={() => router.push('/settings')}
          />
          <ActionRow
            label="Sign Out"
            onPress={handleSignOut}
            destructive
            loading={authLoading}
          />
        </View>
      </ScrollView>

      {/* Achievement Detail Modal */}
      <Modal
        visible={selectedAchievement !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedAchievement(null)}
      >
        <View className="items-center justify-center flex-1 p-4 bg-black/50">
          <View className="items-center w-full max-w-xs p-6 border rounded-lg bg-dark-100 border-dark-200">
            <TouchableOpacity
              onPress={() => setSelectedAchievement(null)}
              className="absolute p-2 top-4 right-4"
            >
              <X size={24} color="#A8B5DB" />
            </TouchableOpacity>
            {selectedAchievement && (
              <>
                <View className="items-center justify-center w-16 h-16 mb-4 rounded-full bg-accent/20">
                  {getAchievementIcon(selectedAchievement.label, 36)}
                </View>
                <Text className="mb-2 text-lg font-bold text-white">
                  {selectedAchievement.label}
                </Text>
                <Text className="mb-4 text-sm text-center text-light-300">
                  {selectedAchievement.description}
                </Text>
                {selectedAchievement.isUnlocked && selectedAchievement.unlockedAt && (
                  <Text className="text-xs text-light-400">
                    Unlocked {new Date(selectedAchievement.unlockedAt).toLocaleDateString()}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
