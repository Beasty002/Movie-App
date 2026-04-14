import ImageWithFallback from '@/components/ImageWithFallback';
import DramaCard from '@/components/drama/DramaCard';
import { getImageUrl, getPersonCombinedCredits, getPersonDetail } from '@/services/tmdb';
import type { TMDBPersonCredit } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, MapPin, User } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getGenderLabel(gender: number): string {
  if (gender === 1) return 'Female';
  if (gender === 2) return 'Male';
  return '';
}

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = parseInt(id, 10);
  const router = useRouter();
  const [bioExpanded, setBioExpanded] = useState(false);
  const [creditFilter, setCreditFilter] = useState<'all' | 'tv' | 'movie'>('all');

  const { data: person, isLoading: personLoading } = useQuery({
    queryKey: ['person', id],
    queryFn: () => getPersonDetail(personId),
  });

  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ['person', id, 'credits'],
    queryFn: () => getPersonCombinedCredits(personId),
    enabled: !!person,
  });

  const filteredCredits = useMemo(() => {
    if (!credits) return [];
    const castCredits = credits.cast.filter(c => c.vote_count > 10);
    const unique = Array.from(
      new Map(castCredits.map(c => [`${c.media_type}-${c.id}`, c])).values(),
    );
    const filtered =
      creditFilter === 'all'
        ? unique
        : unique.filter(c => c.media_type === creditFilter);
    return filtered.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
  }, [credits, creditFilter]);

  const handleCreditPress = (credit: TMDBPersonCredit) => {
    const route = credit.media_type === 'movie' ? `/movie/${credit.id}` : `/drama/${credit.id}`;
    router.push(route as never);
  };

  if (personLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-primary">
        <ActivityIndicator color="#AB8BFF" size="large" />
      </View>
    );
  }

  if (!person) {
    return (
      <View className="items-center justify-center flex-1 px-6 bg-primary">
        <Text className="text-base text-center text-light-300">Failed to load person.</Text>
      </View>
    );
  }

  const profileUrl = getImageUrl(person.profile_path, 'w300');
  const genderLabel = getGenderLabel(person.gender);

  return (
    <ScrollView
      className="flex-1 bg-primary"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Header */}
      <View className="pt-14 px-4 pb-5">
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute items-center justify-center rounded-full top-14 left-4 w-9 h-9 bg-dark-100 z-10"
        >
          <Text className="text-base text-white">‹</Text>
        </TouchableOpacity>

        {/* Profile section */}
        <View className="items-center mt-10">
          <ImageWithFallback
            source={profileUrl ? { uri: profileUrl } : undefined}
            style={{ width: 120, height: 120, borderRadius: 60 }}
            contentFit="cover"
          />
          <Text className="mt-3 text-2xl font-bold text-white text-center">{person.name}</Text>
          <View className="mt-1 px-3 py-1 rounded-full bg-accent/20">
            <Text className="text-accent text-[12px] font-medium">
              {person.known_for_department}
            </Text>
          </View>
        </View>

        {/* Info row */}
        <View className="flex-row justify-center flex-wrap gap-4 mt-4">
          {person.birthday && (
            <View className="flex-row items-center gap-1.5">
              <Calendar size={14} color="#9CA4AB" strokeWidth={1.5} />
              <Text className="text-light-300 text-[13px]">{formatDate(person.birthday)}</Text>
            </View>
          )}
          {person.place_of_birth && (
            <View className="flex-row items-center gap-1.5">
              <MapPin size={14} color="#9CA4AB" strokeWidth={1.5} />
              <Text className="text-light-300 text-[13px]" numberOfLines={1}>
                {person.place_of_birth}
              </Text>
            </View>
          )}
          {genderLabel ? (
            <View className="flex-row items-center gap-1.5">
              <User size={14} color="#9CA4AB" strokeWidth={1.5} />
              <Text className="text-light-300 text-[13px]">{genderLabel}</Text>
            </View>
          ) : null}
        </View>

        {/* Also known as */}
        {person.also_known_as && person.also_known_as.length > 0 && (
          <View className="mt-3 items-center">
            <Text className="text-light-300 text-[12px]" numberOfLines={2}>
              Also known as: {person.also_known_as.slice(0, 3).join(' · ')}
            </Text>
          </View>
        )}
      </View>

      {/* Biography */}
      {person.biography ? (
        <View className="px-4 mb-5">
          <Text className="mb-2 text-base font-semibold text-white">Biography</Text>
          <Text
            className="text-light-200 text-[13px] leading-5"
            numberOfLines={bioExpanded ? undefined : 4}
          >
            {person.biography}
          </Text>
          <TouchableOpacity onPress={() => setBioExpanded(p => !p)} className="mt-1">
            <Text className="text-accent text-[13px]">
              {bioExpanded ? 'Show less' : 'Read more'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Credits */}
      <View className="px-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-semibold text-white">Filmography</Text>
          {credits && (
            <Text className="text-light-300 text-[12px]">{filteredCredits.length} titles</Text>
          )}
        </View>

        {/* Filter tabs */}
        <View className="flex-row gap-2 mb-4">
          {(['all', 'tv', 'movie'] as const).map(opt => (
            <TouchableOpacity
              key={opt}
              onPress={() => setCreditFilter(opt)}
              className={`px-4 py-1.5 rounded-full ${creditFilter === opt ? 'bg-accent' : 'bg-dark-100'}`}
            >
              <Text
                className={`text-[12px] font-medium ${creditFilter === opt ? 'text-primary' : 'text-light-200'}`}
              >
                {opt === 'all' ? 'All' : opt === 'tv' ? 'TV & Anime' : 'Movies'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {creditsLoading ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#AB8BFF" />
          </View>
        ) : filteredCredits.length === 0 ? (
          <View className="items-center py-10">
            <Text className="text-light-300 text-[13px]">No credits found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCredits}
            keyExtractor={item => `${item.media_type}-${item.id}`}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <DramaCard
                drama={{
                  id: item.id,
                  name: item.name,
                  title: item.title,
                  original_name: item.original_name,
                  original_title: item.original_title,
                  poster_path: item.poster_path,
                  backdrop_path: null,
                  overview: '',
                  vote_average: item.vote_average,
                  vote_count: item.vote_count,
                  genre_ids: item.genre_ids ?? [],
                  first_air_date: item.first_air_date,
                  release_date: item.release_date,
                  media_type: item.media_type,
                }}
                onPress={() => handleCreditPress(item)}
              />
            )}
          />
        )}
      </View>
    </ScrollView>
  );
}
