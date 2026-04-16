import { SectionHeader } from '@/components/ui/SectionHeader';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { UserPreferences } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Globe, Shield, Trash2 } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: prefs, isLoading } = useQuery<UserPreferences | null>({
    queryKey: ['user_preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      return (data as UserPreferences) ?? null;
    },
    enabled: !!user?.id,
  });

  const mutation = useMutation({
    mutationFn: async (patch: Partial<Omit<UserPreferences, 'user_id'>>) => {
      if (!user) return;
      await supabase
        .from('user_preferences')
        .update(patch)
        .eq('user_id', user.id)
        .throwOnError();
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ['user_preferences', user?.id] });
      const previous = queryClient.getQueryData(['user_preferences', user?.id]);
      queryClient.setQueryData(['user_preferences', user?.id], (old: UserPreferences | null) =>
        old ? { ...old, ...patch } : old
      );
      return { previous };
    },
    onError: (_err, _patch, ctx) => {
      queryClient.setQueryData(['user_preferences', user?.id], ctx?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user_preferences', user?.id] });
    },
  });

  const toggle = (key: keyof Omit<UserPreferences, 'user_id'>) => (value: boolean) => {
    mutation.mutate({ [key]: value });
  };

  return (
    <View className="flex-1 bg-primary">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-14 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="w-9 h-9 rounded-full bg-dark-100 items-center justify-center mr-3"
        >
          <ArrowLeft size={18} color="#A8B5DB" strokeWidth={2} />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View className="px-4">
          <View className="flex-row items-center mb-3">
            <Bell size={16} color="#AB8BFF" strokeWidth={2} />
            <Text className="text-light-200 text-[13px] ml-2">
              Control what triggers a notification
            </Text>
          </View>

          {isLoading ? (
            <View className="py-6 items-center">
              <ActivityIndicator color="#AB8BFF" />
            </View>
          ) : (
            <>
              <ToggleRow
                label="Poll votes"
                description="When someone votes on your poll"
                value={prefs?.notify_poll_votes ?? true}
                onToggle={toggle('notify_poll_votes')}
                disabled={mutation.isPending}
              />
              <ToggleRow
                label="Poll expiry"
                description="Reminder before your poll closes"
                value={prefs?.notify_poll_expiry ?? true}
                onToggle={toggle('notify_poll_expiry')}
                disabled={mutation.isPending}
              />
              <ToggleRow
                label="New episodes"
                description="When a show you're watching gets new episodes"
                value={prefs?.notify_new_episodes ?? false}
                onToggle={toggle('notify_new_episodes')}
                disabled={mutation.isPending}
              />
            </>
          )}
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <View className="px-4 gap-y-2">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/settings/account' as never)}
            className="flex-row items-center bg-dark-100 px-4 py-3.5 rounded-xl"
          >
            <Shield size={16} color="#A8B5DB" strokeWidth={2} />
            <Text className="text-white text-base ml-3 flex-1">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <View className="px-4 gap-y-2">
          <View className="flex-row items-center bg-dark-100 px-4 py-3.5 rounded-xl">
            <Globe size={16} color="#A8B5DB" strokeWidth={2} />
            <Text className="text-white text-base ml-3 flex-1">Version</Text>
            <Text className="text-light-300 text-sm">1.0.0</Text>
          </View>
        </View>

        {/* Danger Zone */}
        <SectionHeader title="Danger Zone" />
        <View className="px-4">
          <TouchableOpacity
            activeOpacity={0.8}
            className="flex-row items-center bg-red-500/10 border border-red-500/30 px-4 py-3.5 rounded-xl"
          >
            <Trash2 size={16} color="#EF4444" strokeWidth={2} />
            <Text className="text-red-400 text-base ml-3">Delete Account</Text>
          </TouchableOpacity>
          <Text className="text-light-300 text-[11px] mt-2 px-1">
            Permanently deletes your account and all associated data. This cannot be undone.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
