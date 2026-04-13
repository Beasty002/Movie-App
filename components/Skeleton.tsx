import { useEffect } from 'react';
import { View, ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

interface SkeletonProps extends ViewProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
}

export default function Skeleton({
    width = '100%',
    height = 16,
    borderRadius = 4,
    style,
    ...props
}: SkeletonProps) {
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(
            withTiming(1, { duration: 1200 }),
            -1,
            true
        );
    }, [shimmer]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: shimmer.value === 0 ? 0.5 : 1,
    }));

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    backgroundColor: '#221F3D',
                    borderRadius,
                },
                animatedStyle,
                style,
            ]}
            {...props}
        />
    );
}

export function SkeletonText({ lines = 3, gap = 8 }: { lines?: number; gap?: number }) {
    return (
        <View style={{ gap }}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    height={i === lines - 1 ? 14 : 16}
                    width={i === lines - 1 ? '70%' : '100%'}
                />
            ))}
        </View>
    );
}
