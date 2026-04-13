import SearchBar from "@/components/SearchBar";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { Image, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();
  return (
    <View
      className="flex-1 bg-primary"

    >
      <Image source={images.bg} className="absolute z-0 w-full" />
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10, minHeight: '100%' }}>
        <Image source={icons.logo} className="w-12 h-10 mx-auto mt-20 mb-5" />
        <View className="flex-1 mt-5">
          <SearchBar onPress={() => router.push('/search')} placeholder="Search movies..." />
        </View>
      </ScrollView>

    </View>
  );
}
