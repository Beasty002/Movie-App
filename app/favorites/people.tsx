import ImageWithFallback from '@/components/ImageWithFallback';
import { getImageUrl } from '@/services/tmdb';
import { useFavoritePeopleStore } from '@/store/useFavoritePeopleStore';
import type { FavoritePerson } from '@/types';
import { useRouter } from 'expo-router';
import { Heart, Users } from 'lucide-react-native';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

function FavoritePersonCard({
  item,
  onPress,
  onUnfavorite,
}: {
  item: FavoritePerson;
  onPress: () => void;
  onUnfavorite: () => void;
}) {
  const photoUrl = getImageUrl(item.profile_path, 'w300');
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="flex-1 items-center">
      <View>
        <ImageWithFallback
          source={photoUrl ? { uri: photoUrl } : undefined}
          style={{ width: 90, height: 90, borderRadius: 45 }}
          contentFit="cover"
        />
        <TouchableOpacity
          onPress={onUnfavorite}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            borderRadius: 12,
            padding: 4,
          }}
        >
          <Heart size={13} strokeWidth={2} color="#F87171" fill="#F87171" />
        </TouchableOpacity>
      </View>
      <Text
        className="text-white text-[11px] font-medium text-center mt-2"
        numberOfLines={2}
      >
        {item.name}
      </Text>
      {item.known_for ? (
        <Text className="text-light-300 text-[10px] text-center mt-0.5" numberOfLines={1}>
          {item.known_for}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

export default function FavoritePeopleScreen() {
  const router = useRouter();
  const { favorites, removeFavorite } = useFavoritePeopleStore();

  return (
    <View className="flex-1 bg-primary">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pt-14 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="items-center justify-center w-9 h-9 rounded-full bg-dark-100"
        >
          <Text className="text-base text-white">‹</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Favorite People</Text>
        <Text className="text-light-300 text-[13px] ml-auto">
          {favorites.length} {favorites.length === 1 ? 'person' : 'people'}
        </Text>
      </View>

      {favorites.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Users size={52} color="#AB8BFF" strokeWidth={1.5} />
          <Text className="text-white text-base font-semibold text-center">
            No favorite people yet
          </Text>
          <Text className="text-light-300 text-[13px] text-center leading-5">
            Tap the heart on any actor, director, or creator card to save them here
          </Text>
        </View>
      ) : (
        <FlatList<FavoritePerson>
          data={favorites}
          numColumns={3}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 20 }}
          columnWrapperStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <FavoritePersonCard
              item={item}
              onPress={() => router.push(`/person/${item.id}` as never)}
              onUnfavorite={() => {
                removeFavorite(item.id);
                Toast.show({ type: 'success', text1: `Removed ${item.name} from favorites` });
              }}
            />
          )}
        />
      )}
    </View>
  );
}
