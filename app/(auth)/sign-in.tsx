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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoading, error, clearError } = useAuthStore();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) return;
    clearError();
    await signIn(email.trim(), password);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-primary"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <GradientBackground />
      <View className="flex-1 justify-center px-6">
        <Image source={images.votchIcon} className="w-16 h-16 mx-auto mb-6 rounded-full" />

        <Text className="text-3xl font-bold text-white text-center mb-2">
          Welcome back
        </Text>
        <Text className="text-light-200 text-center mb-8">
          Sign in to continue watching
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
              placeholder="••••••••"
              placeholderTextColor="#9CA4AB"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {error && (
            <Text className="text-red-400 text-sm text-center">{error}</Text>
          )}

          <TouchableOpacity
            className="bg-accent rounded-xl py-4 items-center mt-2"
            onPress={handleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#030014" />
            ) : (
              <Text className="text-primary font-bold text-base">Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-8 gap-x-1">
          <Text className="text-light-200">Don't have an account?</Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity>
              <Text className="text-accent font-semibold">Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
