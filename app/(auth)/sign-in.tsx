import { GradientBackground } from '@/components/ui/GradientBackground';
import { images } from '@/constants/images';
import { useAuthStore } from '@/store/useAuthStore';
import { Link } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
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
  const [showPassword, setShowPassword] = useState(false);
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
            <View className="relative">
              <TextInput
                className="bg-dark-100 text-white rounded-xl px-4 pr-12 py-3.5 text-base"
                placeholder="••••••••"
                placeholderTextColor="#9CA4AB"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                className="absolute right-4 top-0 bottom-0 justify-center"
                onPress={() => setShowPassword(v => !v)}
                activeOpacity={0.7}
              >
                {showPassword
                  ? <EyeOff size={20} color="#9CA4AB" />
                  : <Eye size={20} color="#9CA4AB" />}
              </TouchableOpacity>
            </View>
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

          {/* Google Sign In - Disabled for now */}
          {/* <View className="mt-6 mb-4">
            <View className="flex-row items-center gap-x-3 mb-4">
              <View className="flex-1 h-px bg-dark-100" />
              <Text className="text-light-200 text-xs">OR</Text>
              <View className="flex-1 h-px bg-dark-100" />
            </View>

            <TouchableOpacity
              className="flex-row items-center justify-center gap-x-2 bg-dark-100 border border-dark-200 rounded-xl py-3.5"
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Globe size={20} color="#FFFFFF" />
              <Text className="text-white font-semibold">Continue with Google</Text>
            </TouchableOpacity>
          </View> */}
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
