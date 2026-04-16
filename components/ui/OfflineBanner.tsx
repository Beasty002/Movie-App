import { Wifi } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';

interface OfflineBannerProps {
    isOffline: boolean;
}

/**
 * Slides down from top as an overlay — does not affect layout of other elements
 */
export function OfflineBanner({ isOffline }: OfflineBannerProps) {
    const slideAnim = useRef(new Animated.Value(-60)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isOffline ? 0 : -60,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isOffline, slideAnim]);

    return (
        <Animated.View
            style={{
                transform: [{ translateY: slideAnim }],
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
            }}
            className="bg-orange-950 border-b border-orange-900 px-4 py-3 flex-row items-center gap-3"
            pointerEvents={isOffline ? 'auto' : 'none'}
        >
            <Wifi size={16} color="#FBBF24" />
            <Text className="text-orange-300 text-sm flex-1">
                No internet connection — changes will sync when reconnected
            </Text>
        </Animated.View>
    );
}
