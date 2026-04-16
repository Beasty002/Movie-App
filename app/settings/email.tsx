import { useAuthStore } from '@/store/useAuthStore';
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

export default function ChangeEmailScreen() {
    const router = useRouter();
    const { user } = useAuthStore();

    const [newEmail, setNewEmail] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!newEmail.trim()) {
            setError('Email cannot be empty');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            setError('Please enter a valid email address');
            return;
        }

        setIsSaving(true);
        try {
            // This would typically call supabase.auth.updateUser({ email: newEmail })
            // For now, we'll show a placeholder
            Alert.alert('Success', 'A confirmation email has been sent to ' + newEmail);
            router.back();
        } catch (err: any) {
            setError(err.message || 'Failed to update email');
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
                <Text className="text-lg font-bold text-gray-900">Change Email</Text>
            </View>

            <ScrollView className="flex-1 px-4 py-6">
                <Text className="text-gray-600 text-sm mb-4">
                    Current email: <Text className="font-semibold">{user?.email}</Text>
                </Text>

                <View className="mb-4">
                    <Text className="text-gray-700 font-medium text-sm mb-2">New Email</Text>
                    <TextInput
                        value={newEmail}
                        onChangeText={setNewEmail}
                        placeholder="Enter new email"
                        placeholderTextColor="#D1D5DB"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                    />
                </View>

                {error && (
                    <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <Text className="text-red-600 text-sm">{error}</Text>
                    </View>
                )}

                <TouchableOpacity
                    onPress={handleSave}
                    disabled={isSaving || !newEmail.trim()}
                    className={`py-3 rounded-lg items-center ${isSaving || !newEmail.trim()
                            ? 'bg-gray-300'
                            : 'bg-purple-600'
                        }`}
                >
                    {isSaving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-semibold">Send Confirmation Email</Text>
                    )}
                </TouchableOpacity>

                <Text className="text-gray-500 text-xs mt-6 text-center">
                    You'll need to confirm your new email address via a confirmation link
                </Text>
            </ScrollView>
        </View>
    );
}
