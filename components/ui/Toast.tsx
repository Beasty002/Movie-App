import { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  visible: boolean;
  onDismiss: () => void;
}

export default function Toast({
  message,
  actionLabel,
  onAction,
  duration = 5000,
  visible,
  onDismiss,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, duration, onDismiss, translateY]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{ transform: [{ translateY }] }}
      className="absolute bottom-28 left-4 right-4 z-50"
    >
      <View className="bg-dark-100 border border-accent/30 rounded-2xl px-4 py-3 flex-row items-center shadow-lg">
        <Text className="text-white text-sm flex-1 leading-5">{message}</Text>
        {actionLabel && onAction ? (
          <TouchableOpacity
            onPress={() => {
              onAction();
              onDismiss();
            }}
            className="ml-3 px-3 py-1.5 bg-accent rounded-lg"
          >
            <Text className="text-primary text-xs font-semibold">
              {actionLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
}
