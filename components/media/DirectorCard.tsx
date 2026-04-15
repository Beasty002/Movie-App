import ImageWithFallback from '@/components/ImageWithFallback';
import { getImageUrl } from '@/services/tmdb';
import { useFavoritePeopleStore } from '@/store/useFavoritePeopleStore';
import type { TMDBCrew } from '@/types';
import { Heart } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

export default function DirectorCard({
    director,
    onPress,
}: {
    director: TMDBCrew;
    onPress?: () => void;
}) {
    const photoUrl = getImageUrl(director.profile_path, 'w300');
    const favorited = useFavoritePeopleStore((s) => s.favorites.some((f) => f.id === director.id));
    const { addFavorite, removeFavorite } = useFavoritePeopleStore();

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            className="items-center w-20 mr-3"
        >
            <View>
                <ImageWithFallback
                    source={photoUrl ? { uri: photoUrl } : undefined}
                    style={{ width: 64, height: 64, borderRadius: 32 }}
                    contentFit="cover"
                />
                <TouchableOpacity
                    onPress={() => {
                        if (favorited) {
                            removeFavorite(director.id);
                            Toast.show({ type: 'success', text1: `Removed ${director.name} from favorites` });
                        } else {
                            addFavorite({ id: director.id, name: director.name, profile_path: director.profile_path, known_for: director.job });
                            Toast.show({ type: 'success', text1: `${director.name} added to favorites` });
                        }
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        borderRadius: 10,
                        padding: 3,
                    }}
                >
                    <Heart
                        size={11}
                        strokeWidth={2}
                        color={favorited ? '#F87171' : '#fff'}
                        fill={favorited ? '#F87171' : 'transparent'}
                    />
                </TouchableOpacity>
            </View>
            <Text className="text-white text-[11px] font-medium text-center mt-1" numberOfLines={2}>
                {director.name}
            </Text>
            <Text className="text-light-300 text-[10px] text-center" numberOfLines={1}>
                {director.job}
            </Text>
        </TouchableOpacity>
    );
}
