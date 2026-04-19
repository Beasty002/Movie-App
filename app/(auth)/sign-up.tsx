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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

        <Text className="mb-2 text-3xl font-bold text-center text-white">
          Create account
        </Text>
        <Text className="mb-8 text-center text-light-200">
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
            <View className="relative">
              <TextInput
                className="bg-dark-100 text-white rounded-xl px-4 pr-12 py-3.5 text-base"
                placeholder="Min. 6 characters"
                placeholderTextColor="#9CA4AB"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
              />
              <TouchableOpacity
                className="absolute top-0 bottom-0 justify-center right-4"
                onPress={() => setShowPassword(v => !v)}
                activeOpacity={0.7}
              >
                {showPassword
                  ? <EyeOff size={20} color="#9CA4AB" />
                  : <Eye size={20} color="#9CA4AB" />}
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <Text className="text-light-200 text-sm mb-1.5">Confirm Password</Text>
            <View className="relative">
              <TextInput
                className="bg-dark-100 text-white rounded-xl px-4 pr-12 py-3.5 text-base"
                placeholder="Repeat password"
                placeholderTextColor="#9CA4AB"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
              />
              <TouchableOpacity
                className="absolute top-0 bottom-0 justify-center right-4"
                onPress={() => setShowConfirmPassword(v => !v)}
                activeOpacity={0.7}
              >
                {showConfirmPassword
                  ? <EyeOff size={20} color="#9CA4AB" />
                  : <Eye size={20} color="#9CA4AB" />}
              </TouchableOpacity>
            </View>
          </View>

          {displayError && (
            <Text className="text-sm text-center text-red-400">{displayError}</Text>
          )}

          <TouchableOpacity
            className="items-center py-4 mt-2 bg-accent rounded-xl"
            onPress={handleSignUp}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#030014" />
            ) : (
              <Text className="text-base font-bold text-primary">Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Google Sign Up - Disabled for now */}
          {/* <View className="mt-6 mb-4">
            <View className="flex-row items-center mb-4 gap-x-3">
              <View className="flex-1 h-px bg-dark-100" />
              <Text className="text-xs text-light-200">OR</Text>
              <View className="flex-1 h-px bg-dark-100" />
            </View>

            <TouchableOpacity
              className="flex-row items-center justify-center gap-x-2 bg-dark-100 border border-dark-200 rounded-xl py-3.5"
              onPress={handleGoogleSignUp}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Globe size={20} color="#FFFFFF" />
              <Text className="font-semibold text-white">Sign up with Google</Text>
            </TouchableOpacity>
          </View> */}
        </View>

        <View className="flex-row justify-center pb-8 mt-8 gap-x-1">
          <Text className="text-light-200">Already have an account?</Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text className="font-semibold text-accent">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
