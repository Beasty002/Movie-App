import { Text, View } from 'react-native';

interface SectionHeaderProps {
    title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
    return (
        <View className="px-4 pt-6 pb-3">
            <Text className="text-light-200 font-semibold text-xs uppercase tracking-wider">
                {title}
            </Text>
        </View>
    );
}
