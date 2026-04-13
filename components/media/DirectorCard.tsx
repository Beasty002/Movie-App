import ImageWithFallback from '@/components/ImageWithFallback';
import { getImageUrl } from '@/services/tmdb';
import type { TMDBCrew } from '@/types';
import { Text, View } from 'react-native';

export default function DirectorCard({ director }: { director: TMDBCrew }) {
    const photoUrl = getImageUrl(director.profile_path, 'w300');
    return (
        <View className="items-center w-20 mr-3">
            <ImageWithFallback
                source={photoUrl ? { uri: photoUrl } : undefined}
                style={{ width: 64, height: 64, borderRadius: 32 }}
                contentFit="cover"
            />
            <Text className="text-white text-[11px] font-medium text-center mt-1" numberOfLines={2}>
                {director.name}
            </Text>
            <Text className="text-light-300 text-[10px] text-center" numberOfLines={1}>
                {director.job}
            </Text>
        </View>
    );
}
