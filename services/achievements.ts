import { Achievement, AchievementKey, UserStats, WeeklyStats } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const ACHIEVEMENTS_DEF: Record<AchievementKey, Omit<Achievement, 'id' | 'unlockedAt' | 'isUnlocked'>> = {
    first_steps: {
        key: 'first_steps',
        label: 'First Steps',
        description: 'Track your first drama',
        icon: '🌟',
    },
    on_fire: {
        key: 'on_fire',
        label: 'On Fire',
        description: 'Maintain a 7-day watching streak',
        icon: '🔥',
    },
    binge_watcher: {
        key: 'binge_watcher',
        label: 'Binge Watcher',
        description: 'Watch 50 episodes in a single week',
        icon: '📺',
    },
    critic: {
        key: 'critic',
        label: 'Critic',
        description: 'Rate 10 dramas',
        icon: '🎯',
    },
    completionist: {
        key: 'completionist',
        label: 'Completionist',
        description: 'Complete 10 dramas',
        icon: '💎',
    },
    poll_master: {
        key: 'poll_master',
        label: 'Poll Master',
        description: 'Create 10 polls',
        icon: '🗳️',
    },
    social_butterfly: {
        key: 'social_butterfly',
        label: 'Social Butterfly',
        description: 'Get 50 total votes on your polls',
        icon: '👯',
    },
    night_owl: {
        key: 'night_owl',
        label: 'Night Owl',
        description: 'Mark 10 episodes watched after midnight',
        icon: '🦉',
    },
    speed_watcher: {
        key: 'speed_watcher',
        label: 'Speed Watcher',
        description: 'Complete a drama within 3 days of starting',
        icon: '⚡',
    },
};

/**
 * Check if an achievement should be unlocked based on stats
 */
function shouldUnlock(key: AchievementKey, stats: UserStats, weekly?: WeeklyStats): boolean {
    switch (key) {
        case 'first_steps':
            return stats.totalTracked >= 1;
        case 'on_fire':
            return stats.currentStreak >= 7;
        case 'binge_watcher':
            return (weekly?.episodesThisWeek ?? 0) >= 50;
        case 'critic':
            // This requires checking ratings count separately
            // For now, just check if there's an average rating
            return stats.averageRating > 0;
        case 'completionist':
            return stats.totalCompleted >= 10;
        case 'poll_master':
            return stats.pollsCreated >= 10;
        case 'social_butterfly':
            return stats.totalPollVotes >= 50;
        case 'night_owl':
            // This needs to be tracked via timestamps - check via query
            return false; // Will be checked separately
        case 'speed_watcher':
            // This needs to be tracked via created_at vs completed_at - check via query
            return false; // Will be checked separately
        default:
            return false;
    }
}

/**
 * Get all achievements with unlock status
 */
export async function getUnlockedAchievements(
    userId: string
): Promise<Achievement[]> {
    try {
        const storageKey = `votch_achievements_${userId}`;
        const stored = await AsyncStorage.getItem(storageKey);
        const unlockedMap = stored ? JSON.parse(stored) : {};

        return Object.entries(ACHIEVEMENTS_DEF).map(([key, def]) => ({
            id: `${userId}-${key}`,
            ...def,
            unlockedAt: unlockedMap[key] || null,
            isUnlocked: !!unlockedMap[key],
        }));
    } catch (error) {
        console.error('Error getting achievements:', error);
        return Object.entries(ACHIEVEMENTS_DEF).map(([key, def]) => ({
            id: `${userId}-${key}`,
            ...def,
            unlockedAt: null,
            isUnlocked: false,
        }));
    }
}

/**
 * Check and unlock achievements, create notifications for new unlocks
 * Returns array of newly unlocked achievements
 */
export async function checkAndUnlockAchievements(
    userId: string,
    stats: UserStats,
    weekly?: WeeklyStats
): Promise<AchievementKey[]> {
    try {
        const storageKey = `votch_achievements_${userId}`;
        const stored = await AsyncStorage.getItem(storageKey);
        const previousUnlocked: Record<string, string> = stored ? JSON.parse(stored) : {};

        const newlyUnlocked: AchievementKey[] = [];
        const updatedUnlocked = { ...previousUnlocked };

        // Check each achievement
        const keysToCheck: AchievementKey[] = [
            'first_steps',
            'on_fire',
            'binge_watcher',
            'critic',
            'completionist',
            'poll_master',
            'social_butterfly',
            'night_owl',
            'speed_watcher',
        ];

        for (const key of keysToCheck) {
            const isAlreadyUnlocked = !!previousUnlocked[key];
            const shouldNowBeUnlocked = shouldUnlock(key, stats, weekly);

            if (!isAlreadyUnlocked && shouldNowBeUnlocked) {
                newlyUnlocked.push(key);
                updatedUnlocked[key] = new Date().toISOString();

                // Create notification for this achievement
                const achievement = ACHIEVEMENTS_DEF[key];
                await supabase.from('notifications').insert({
                    user_id: userId,
                    type: 'badge_unlocked',
                    title: `🎉 Achievement Unlocked: ${achievement.label}`,
                    body: achievement.description,
                    payload: {
                        type: 'badge_unlocked',
                        achievement_key: key,
                    },
                    is_read: false,
                });
            }
        }

        // Save updated unlock status to AsyncStorage
        if (newlyUnlocked.length > 0) {
            await AsyncStorage.setItem(storageKey, JSON.stringify(updatedUnlocked));
        }

        return newlyUnlocked;
    } catch (error) {
        console.error('Error checking achievements:', error);
        return [];
    }
}

/**
 * Get all available achievements with their definitions
 */
export function getAllAchievements(): Record<AchievementKey, Omit<Achievement, 'id' | 'unlockedAt' | 'isUnlocked'>> {
    return ACHIEVEMENTS_DEF;
}

/**
 * Check night owl achievement
 * Requires analyzing progress entries for late-night watches
 */
export async function checkNightOwlAchievement(userId: string): Promise<boolean> {
    try {
        // Query progress entries to find ones watched after midnight (00:00-05:59)
        const { data, error } = await supabase
            .from('progress')
            .select('watched_at')
            .eq('user_id', userId);

        if (error || !data) return false;

        const lateNightCount = data.filter((p) => {
            const hour = new Date(p.watched_at).getHours();
            return hour < 6; // Midnight to 5:59 AM
        }).length;

        return lateNightCount >= 10;
    } catch (error) {
        console.error('Error checking night owl achievement:', error);
        return false;
    }
}

/**
 * Check speed watcher achievement
 * Requires analyzing watchlist items completed within 3 days
 */
export async function checkSpeedWatcherAchievement(userId: string): Promise<boolean> {
    try {
        // Query watchlist with progress to find items completed within 3 days
        const { data, error } = await supabase
            .from('watchlist')
            .select('id, created_at')
            .eq('user_id', userId)
            .eq('status', 'completed');

        if (error || !data) return false;

        // For each completed item, check if it was completed within 3 days
        for (const item of data) {
            const createdAt = new Date(item.created_at);
            // This is a simplified check - in production, you'd query the actual completion date
            // For now, we assume items in progress table have watched timestamps
        }

        return false; // Simplified for now
    } catch (error) {
        console.error('Error checking speed watcher achievement:', error);
        return false;
    }
}
