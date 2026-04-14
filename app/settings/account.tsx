import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/services/supabase';
import { useQuery } from '@tanstack/react-query';
import type { Profile } from '@/types';

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return (data as Profile) ?? null;
    },
    enabled: !!user?.id,
  });

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Populate fields once profile loads
  if (profile && !initialized) {
    setUsername(profile.username ?? '');
    setBio(profile.bio ?? '');
    setInitialized(true);
  }

  const handleSave = async () => {
    if (!user) return;

    const trimmedUsername = username.trim();
    const trimmedBio = bio.trim();

    if (!trimmedUsername) {
      setError('Username cannot be empty.');
      return;
    }
    if (trimmedUsername.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (trimmedUsername.length > 30) {
      setError('Username must be 30 characters or fewer.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setError('Username can only contain letters, numbers, and underscores.');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: trimmedUsername, bio: trimmedBio || null })
        .eq('id', user.id);

      if (updateError) {
        if (updateError.message.includes('unique')) {
          setError('That username is already taken.');
        } else {
          setError(updateError.message);
        }
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-primary"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View className="flex-row items-center px-4 pt-14 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="w-9 h-9 rounded-full bg-dark-100 items-center justify-center mr-3"
        >
          <ArrowLeft size={18} color="#A8B5DB" strokeWidth={2} />
        </TouchableOpacity>

        <Text className="text-white font-bold text-lg flex-1">Edit Profile</Text>

        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.7}
          disabled={isSaving || profileLoading}
          className="w-9 h-9 rounded-full bg-accent items-center justify-center"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#0F0D23" />
          ) : (
            <Check size={18} color="#0F0D23" strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {profileLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator color="#AB8BFF" />
          </View>
        ) : (
          <View className="px-4 gap-y-5 mt-2">
            {/* Avatar placeholder */}
            <View className="items-center py-4">
              <View className="w-20 h-20 rounded-full bg-accent items-center justify-center">
                <Text className="text-primary font-bold text-2xl">
                  {username
                    .split(/[\s_]+/)
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase() ?? '')
                    .join('') || '?'}
                </Text>
              </View>
            </View>

            {/* Username */}
            <View>
              <Text className="text-light-300 text-[12px] uppercase tracking-wide mb-2">
                Username
              </Text>
              <TextInput
                value={username}
                onChangeText={(v) => {
                  setUsername(v);
                  setError(null);
                }}
                placeholder="your_username"
                placeholderTextColor="#4B5563"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                className="bg-dark-100 text-white rounded-xl px-4 py-3.5 text-base"
              />
              <Text className="text-light-300 text-[11px] mt-1.5 text-right">
                {username.length}/30
              </Text>
            </View>

            {/* Bio */}
            <View>
              <Text className="text-light-300 text-[12px] uppercase tracking-wide mb-2">
                Bio
              </Text>
              <TextInput
                value={bio}
                onChangeText={(v) => setBio(v)}
                placeholder="Tell people a bit about yourself..."
                placeholderTextColor="#4B5563"
                multiline
                numberOfLines={4}
                maxLength={160}
                textAlignVertical="top"
                className="bg-dark-100 text-white rounded-xl px-4 py-3.5 text-base"
                style={{ minHeight: 100 }}
              />
              <Text className="text-light-300 text-[11px] mt-1.5 text-right">
                {bio.length}/160
              </Text>
            </View>

            {/* Error */}
            {error ? (
              <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <Text className="text-red-400 text-sm">{error}</Text>
              </View>
            ) : null}

            {/* Email (read-only) */}
            <View>
              <Text className="text-light-300 text-[12px] uppercase tracking-wide mb-2">
                Email
              </Text>
              <View className="bg-dark-100 rounded-xl px-4 py-3.5">
                <Text className="text-light-200 text-base">{user?.email}</Text>
              </View>
              <Text className="text-light-300 text-[11px] mt-1.5">
                Email cannot be changed here.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
