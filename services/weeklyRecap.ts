import { WeeklyStats } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

/**
 * Generate weekly stats for a user
 */
export async function generateWeeklyStats(userId: string): Promise<WeeklyStats> {
    try {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Get this week's progress
        const { data: thisWeekProgress } = await supabase
            .from('progress')
            .select('watched_at')
            .eq('user_id', userId)
            .gte('watched_at', sevenDaysAgo.toISOString());

        const episodesThisWeek = thisWeekProgress?.length || 0;
        const hoursThisWeek = episodesThisWeek * 1; // Simplified: 1 hour per episode

        // Get last week's progress for comparison
        const { data: lastWeekProgress } = await supabase
            .from('progress')
            .select('watched_at')
            .eq('user_id', userId)
            .gte('watched_at', fourteenDaysAgo.toISOString())
            .lt('watched_at', sevenDaysAgo.toISOString());

        const episodesLastWeek = lastWeekProgress?.length || 0;
        const comparedToLastWeek = episodesThisWeek - episodesLastWeek;

        // Get top drama this week
        const { data: watchlistData } = await supabase
            .from('watchlist')
            .select('*')
            .eq('user_id', userId)
            .limit(1);

        // Genre breakdown - would need TMDB data
        const genreBreakdown: Record<string, number> = {};

        return {
            episodesThisWeek,
            hoursThisWeek,
            topDrama: watchlistData?.[0] || null,
            genreBreakdown,
            comparedToLastWeek,
            weekStart: sevenDaysAgo.toISOString().split('T')[0],
            weekEnd: now.toISOString().split('T')[0],
        };
    } catch (error) {
        console.error('Error generating weekly stats:', error);
        return {
            episodesThisWeek: 0,
            hoursThisWeek: 0,
            topDrama: null,
            genreBreakdown: {},
            comparedToLastWeek: 0,
            weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            weekEnd: new Date().toISOString().split('T')[0],
        };
    }
}

/**
 * Check if weekly recap should be shown
 * Shows if last shown was more than 6 days ago
 */
export async function shouldShowRecap(): Promise<boolean> {
    try {
        const lastShown = await AsyncStorage.getItem('votch_last_recap_shown');
        if (!lastShown) return true; // First time

        const lastShownDate = new Date(lastShown);
        const now = new Date();
        const daysSince = (now.getTime() - lastShownDate.getTime()) / (1000 * 60 * 60 * 24);

        return daysSince > 6;
    } catch {
        return false;
    }
}

/**
 * Mark recap as shown
 */
export async function markRecapAsShown(): Promise<void> {
    try {
        await AsyncStorage.setItem('votch_last_recap_shown', new Date().toISOString());
    } catch (error) {
        console.error('Error marking recap as shown:', error);
    }
}

/**
 * Generate share text for weekly recap
 */
export function generateShareText(stats: WeeklyStats): string {
    return `I watched ${stats.episodesThisWeek} episodes and ${stats.hoursThisWeek} hours this week on Votch! 📺🔥`;
}
