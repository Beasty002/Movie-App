import { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';

interface ToggleRowProps {
    label: string;
    description?: string;
    value: boolean;
    onToggle: (value: boolean) => void;
    disabled?: boolean;
}

export function ToggleRow({ label, description, value, onToggle, disabled }: ToggleRowProps) {
    const toggleAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(toggleAnim, {
            toValue: value ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [value, toggleAnim]);

    const translateX = toggleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 18],
    });

    const backgroundColor = toggleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#1a1a2e', '#AB8BFF'],
    });

    return (
        <View className="flex-row items-center justify-between py-3 px-0 border-b border-dark-100">
            <View className="flex-1">
                <Text className="text-white text-sm font-medium">{label}</Text>
                {description && (
                    <Text className="text-light-300 text-xs mt-0.5">{description}</Text>
                )}
            </View>
            <TouchableOpacity
                onPress={() => !disabled && onToggle(!value)}
                disabled={disabled}
                activeOpacity={0.8}
            >
                <Animated.View
                    style={{ backgroundColor }}
                    className="w-12 h-7 rounded-full flex-row items-center px-1"
                >
                    <Animated.View
                        style={{ transform: [{ translateX }] }}
                        className="w-5 h-5 rounded-full bg-white"
                    />
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
}
