import { Text, TouchableOpacity, View } from 'react-native';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
}

/**
 * Consistent empty state component for use across all screens
 */
export function EmptyState({
    icon,
    title,
    subtitle,
    actionLabel,
    onAction,
}: EmptyStateProps) {
    return (
        <View className="flex-1 items-center justify-center px-6">
            <View className="mb-4">
                {icon}
            </View>
            <Text className="text-lg font-bold text-gray-900 text-center mb-2">
                {title}
            </Text>
            {subtitle && (
                <Text className="text-gray-600 text-sm text-center mb-6">
                    {subtitle}
                </Text>
            )}
            {actionLabel && onAction && (
                <TouchableOpacity
                    onPress={onAction}
                    className="mt-4 bg-purple-600 px-6 py-3 rounded-lg"
                >
                    <Text className="text-white font-semibold text-sm">{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
