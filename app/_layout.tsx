import { useAuthStore } from '@/store/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import './globals.css';

const queryClient = new QueryClient();

const toastConfig = {
  success: (props: any) => (
    <View
      className="mx-4 bg-black/60 border border-green-500/60 rounded-lg px-4 py-3 flex-row items-center gap-3"
      style={{
        marginBottom: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
      }}
    >
      <Text className="text-green-400 text-xl">✓</Text>
      <View className="flex-1">
        <Text className="text-green-400 font-semibold text-sm">{props.text1}</Text>
      </View>
    </View>
  ),
  error: (props: any) => (
    <View
      className="mx-4 bg-black/60 border border-red-500/60 rounded-lg px-4 py-3 flex-row items-center gap-3"
      style={{
        marginBottom: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
      }}
    >
      <Text className="text-red-400 text-xl">✕</Text>
      <View className="flex-1">
        <Text className="text-red-400 font-semibold text-sm">{props.text1}</Text>
      </View>
    </View>
  ),
};

function AuthGate() {
  const { session, isInitialized, initialize } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, isInitialized, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate />
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="movie/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="drama/[id]" options={{ headerShown: false }} />
      </Stack>
      <Toast config={toastConfig} position="bottom" bottomOffset={60} />
    </QueryClientProvider>
  );
}
