import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { StreakData } from '@/types';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to get streak data for the current user
 * Computes: current streak, best streak, last watched date, and whether watched today
 */
export function useStreak() {
    const { user } = useAuthStore();

    const { data: streakData, isLoading, error } = useQuery({
        queryKey: ['streak', user?.id],
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes
        queryFn: async (): Promise<StreakData> => {
            if (!user?.id) {
                return {
                    current: 0,
                    best: 0,
                    lastWatchedDate: null,
                    todayWatched: false,
                };
            }

            try {
                // Get user's profile with streak data
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('streak_current, streak_best, last_watched_date')
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    console.error('Error fetching streak data:', profileError);
                    return {
                        current: 0,
                        best: 0,
                        lastWatchedDate: null,
                        todayWatched: false,
                    };
                }

                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const lastWatched = profile?.last_watched_date || null;
                const todayWatched = lastWatched === today;

                return {
                    current: profile?.streak_current || 0,
                    best: profile?.streak_best || 0,
                    lastWatchedDate: lastWatched,
                    todayWatched,
                };
            } catch (error) {
                console.error('Error computing streak:', error);
                return {
                    current: 0,
                    best: 0,
                    lastWatchedDate: null,
                    todayWatched: false,
                };
            }
        },
    });

    // Compute streak at risk (watched yesterday but not today)
    const streakAtRisk =
        streakData &&
        !streakData.todayWatched &&
        streakData.lastWatchedDate &&
        new Date(streakData.lastWatchedDate).toDateString() ===
        new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

    return {
        streak: streakData?.current || 0,
        bestStreak: streakData?.best || 0,
        todayWatched: streakData?.todayWatched || false,
        streakAtRisk: streakAtRisk || false,
        isLoading,
        error,
    };
}
