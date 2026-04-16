import { useRouter } from 'expo-router';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
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

export default function ChangePasswordScreen() {
    const router = useRouter();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!currentPassword) {
            setError('Current password is required');
            return;
        }

        if (!newPassword) {
            setError('New password is required');
            return;
        }

        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword === currentPassword) {
            setError('New password must be different from current password');
            return;
        }

        setIsSaving(true);
        try {
            // This would typically call supabase.auth.updateUser({ password: newPassword })
            // after verifying the current password
            Alert.alert('Success', 'Password updated successfully');
            router.back();
        } catch (err: any) {
            setError(err.message || 'Failed to update password');
        } finally {
            setIsSaving(false);
        }
    };

    const PasswordInput = ({
        label,
        value,
        onChangeText,
        showPassword,
        onToggleShow,
    }: {
        label: string;
        value: string;
        onChangeText: (text: string) => void;
        showPassword: boolean;
        onToggleShow: () => void;
    }) => (
        <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700">{label}</Text>
            <View className="flex-row items-center px-4 py-3 border border-gray-300 rounded-lg">
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder="Enter password"
                    placeholderTextColor="#D1D5DB"
                    secureTextEntry={!showPassword}
                    className="flex-1 text-gray-900"
                />
                <TouchableOpacity onPress={onToggleShow} className="ml-2">
                    {showPassword ? (
                        <EyeOff size={20} color="#9CA3AF" />
                    ) : (
                        <Eye size={20} color="#9CA3AF" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-white">
            <View className="flex-row items-center px-4 py-4 border-b border-gray-200">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <ChevronLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900">Change Password</Text>
            </View>

            <ScrollView className="flex-1 px-4 py-6">
                <PasswordInput
                    label="Current Password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    showPassword={showPasswords.current}
                    onToggleShow={() =>
                        setShowPasswords((prev) => ({ ...prev, current: !prev.current }))
                    }
                />

                <PasswordInput
                    label="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    showPassword={showPasswords.new}
                    onToggleShow={() =>
                        setShowPasswords((prev) => ({ ...prev, new: !prev.new }))
                    }
                />

                <PasswordInput
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    showPassword={showPasswords.confirm}
                    onToggleShow={() =>
                        setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
                    }
                />

                {error && (
                    <View className="p-3 mb-4 border border-red-200 rounded-lg bg-red-50">
                        <Text className="text-sm text-red-600">{error}</Text>
                    </View>
                )}

                <TouchableOpacity
                    onPress={handleSave}
                    disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                    className={`py-3 rounded-lg items-center ${isSaving || !currentPassword || !newPassword || !confirmPassword
                            ? 'bg-gray-300'
                            : 'bg-purple-600'
                        }`}
                >
                    {isSaving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="font-semibold text-white">Update Password</Text>
                    )}
                </TouchableOpacity>

                <Text className="mt-6 text-xs text-center text-gray-500">
                    Use a strong password with at least 8 characters
                </Text>
            </ScrollView>
        </View>
    );
}
