import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

interface StreakBadgeProps {
    streak: number;
    bestStreak?: number;
    size?: 'sm' | 'md' | 'lg';
    isAtRisk?: boolean;
}

/**
 * Streak badge component showing current streak count
 * Sizes:
 * - sm: inline badge for home feed header
 * - md: card style for profile
 * - lg: full display with "day streak" label and best streak
 */
export function StreakBadge({
    streak,
    bestStreak = 0,
    size = 'md',
    isAtRisk = false,
}: StreakBadgeProps) {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isAtRisk) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [isAtRisk, pulseAnim]);

    // Determine colors based on streak level
    const getStreakColor = () => {
        if (streak === 0) return 'bg-gray-300';
        if (streak >= 30) return 'bg-red-500';
        if (streak >= 7) return 'bg-amber-500';
        return 'bg-purple-500';
    };

    const getStreakTextColor = () => {
        if (streak === 0) return 'text-gray-600';
        return 'text-white';
    };

    // Small badge (inline, for header)
    if (size === 'sm') {
        return (
            <View className={`flex-row items-center gap-1 ${getStreakColor()} rounded-full px-2 py-1`}>
                <Text className="text-base">🔥</Text>
                <Text className={`${getStreakTextColor()} font-bold text-xs`}>{streak}</Text>
            </View>
        );
    }

    // Medium badge (card style, for profile)
    if (size === 'md') {
        return (
            <Animated.View
                style={{
                    transform: [{ scale: isAtRisk ? pulseAnim : 1 }],
                }}
                className={`${getStreakColor()} rounded-lg p-3 items-center justify-center`}
            >
                <Text className="text-2xl mb-1">🔥</Text>
                <Text className={`${getStreakTextColor()} font-bold text-lg`}>{streak}</Text>
                <Text className={`${getStreakTextColor()} text-xs mt-0.5`}>day streak</Text>
            </Animated.View>
        );
    }

    // Large badge (full display with best streak)
    return (
        <Animated.View
            style={{
                transform: [{ scale: isAtRisk ? pulseAnim : 1 }],
            }}
            className={`${getStreakColor()} rounded-xl p-6 items-center justify-center`}
        >
            <Text className="text-5xl mb-2">🔥</Text>
            <Text className={`${getStreakTextColor()} font-bold text-3xl`}>{streak}</Text>
            <Text className={`${getStreakTextColor()} text-base mt-1`}>day streak</Text>
            {bestStreak > 0 && (
                <View className="mt-4 pt-4 border-t border-white border-opacity-30">
                    <Text className={`${getStreakTextColor()} text-xs opacity-80`}>Best: {bestStreak} days</Text>
                </View>
            )}
        </Animated.View>
    );
}
