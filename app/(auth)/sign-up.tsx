import { GradientBackground } from '@/components/ui/GradientBackground';
import { images } from '@/constants/images';
import { useAuthStore } from '@/store/useAuthStore';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { signUp, isLoading, error, clearError } = useAuthStore();

  const handleSignUp = async () => {
    setLocalError(null);
    clearError();

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setLocalError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    await signUp(email.trim(), password);
  };

  const displayError = localError ?? error;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-primary"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <GradientBackground />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        className="flex-1 px-6"
      >
        <Image source={images.votchIcon} className="w-16 h-16 mx-auto mb-6 rounded-full" />

        <Text className="text-3xl font-bold text-white text-center mb-2">
          Create account
        </Text>
        <Text className="text-light-200 text-center mb-8">
          Track dramas, anime, and movies
        </Text>

        <View className="gap-y-4">
          <View>
            <Text className="text-light-200 text-sm mb-1.5">Email</Text>
            <TextInput
              className="bg-dark-100 text-white rounded-xl px-4 py-3.5 text-base"
              placeholder="you@example.com"
              placeholderTextColor="#9CA4AB"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View>
            <Text className="text-light-200 text-sm mb-1.5">Password</Text>
            <TextInput
              className="bg-dark-100 text-white rounded-xl px-4 py-3.5 text-base"
              placeholder="Min. 6 characters"
              placeholderTextColor="#9CA4AB"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <View>
            <Text className="text-light-200 text-sm mb-1.5">Confirm Password</Text>
            <TextInput
              className="bg-dark-100 text-white rounded-xl px-4 py-3.5 text-base"
              placeholder="Repeat password"
              placeholderTextColor="#9CA4AB"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          {displayError && (
            <Text className="text-red-400 text-sm text-center">{displayError}</Text>
          )}

          <TouchableOpacity
            className="bg-accent rounded-xl py-4 items-center mt-2"
            onPress={handleSignUp}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#030014" />
            ) : (
              <Text className="text-primary font-bold text-base">Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-8 gap-x-1 pb-8">
          <Text className="text-light-200">Already have an account?</Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text className="text-accent font-semibold">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
