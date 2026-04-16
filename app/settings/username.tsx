import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type { Profile } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ChangeUsernameScreen() {
    const router = useRouter();
    const { user } = useAuthStore();

    const [newUsername, setNewUsername] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: profile, isLoading } = useQuery<Profile | null>({
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

    const handleSave = async () => {
        if (!newUsername.trim()) {
            setError('Username cannot be empty');
            return;
        }

        if (newUsername.length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }

        setIsSaving(true);
        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ username: newUsername.trim() })
                .eq('id', user?.id);

            if (updateError) {
                throw updateError;
            }

            Alert.alert('Success', 'Username updated successfully');
            router.back();
        } catch (err: any) {
            setError(err.message || 'Failed to update username');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View className="flex-1 bg-white">
            <View className="flex-row items-center px-4 py-4 border-b border-gray-200">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <ChevronLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900">Change Username</Text>
            </View>

            <ScrollView className="flex-1 px-4 py-6">
                <Text className="text-gray-600 text-sm mb-4">
                    Current username: <Text className="font-semibold">{profile?.username}</Text>
                </Text>

                <View className="mb-4">
                    <Text className="text-gray-700 font-medium text-sm mb-2">New Username</Text>
                    <TextInput
                        value={newUsername}
                        onChangeText={setNewUsername}
                        placeholder="Enter new username"
                        placeholderTextColor="#D1D5DB"
                        className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                    />
                    <Text className="text-gray-500 text-xs mt-1">
                        3-30 characters • No spaces
                    </Text>
                </View>

                {error && (
                    <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <Text className="text-red-600 text-sm">{error}</Text>
                    </View>
                )}

                <TouchableOpacity
                    onPress={handleSave}
                    disabled={isSaving || !newUsername.trim()}
                    className={`py-3 rounded-lg items-center ${isSaving || !newUsername.trim()
                            ? 'bg-gray-300'
                            : 'bg-purple-600'
                        }`}
                >
                    {isSaving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-semibold">Save Username</Text>
                    )}
                </TouchableOpacity>

                <Text className="text-gray-500 text-xs mt-6 text-center">
                    You can only change your username once every 30 days
                </Text>
            </ScrollView>
        </View>
    );
}
