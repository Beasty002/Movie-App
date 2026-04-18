import { GradientBackground } from '@/components/ui/GradientBackground';
import { useAuthStore } from '@/store/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import './globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
});

const toastConfig = {
  success: (props: { text1?: string }) => (
    <View
      className="flex-row items-center gap-3 px-4 py-3 mx-4 border rounded-lg bg-black/60 border-green-500/60"
      style={{
        marginBottom: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
      }}
    >
      <Text className="text-xl text-green-400">✓</Text>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-green-400">{props.text1}</Text>
      </View>
    </View>
  ),
  error: (props: { text1?: string }) => (
    <View
      className="flex-row items-center gap-3 px-4 py-3 mx-4 border rounded-lg bg-black/60 border-red-500/60"
      style={{
        marginBottom: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
      }}
    >
      <Text className="text-xl text-red-400">✕</Text>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-red-400">{props.text1}</Text>
      </View>
    </View>
  ),
};

function AuthGate() {
  const { session, isInitialized, initialize } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initialize().catch((err) => {
      console.error('Auth init error:', err);
      setInitError(err?.message || 'Failed to initialize auth');
    });
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

  if (initError) {
    return (
      <View className="items-center justify-center flex-1 bg-black">
        <Text className="px-6 text-base font-semibold text-center text-red-500">
          Error initializing app: {initError}
        </Text>
        <Text className="px-6 mt-4 text-sm text-center text-slate-400">
          Please restart the app.
        </Text>
      </View>
    );
  }

  return null;
}

function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    // Handle deep links when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const parsed = Linking.parse(url);
      // votch://poll/{shareCode} → navigate to /poll/{shareCode}
      if (parsed.scheme === 'votch' && parsed.path?.startsWith('poll/')) {
        const shareCode = parsed.path.replace('poll/', '');
        if (shareCode) {
          router.push(`/poll/${shareCode}` as never);
        }
      }
    });

    // Handle deep link that opened the app (cold start)
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      if (parsed.scheme === 'votch' && parsed.path?.startsWith('poll/')) {
        const shareCode = parsed.path.replace('poll/', '');
        if (shareCode) {
          router.push(`/poll/${shareCode}` as never);
        }
      }
    });

    return () => subscription.remove();
  }, [router]);

  return null;
}

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate />
      <DeepLinkHandler />
      <View className="flex-1 bg-primary">
        <StatusBar style="light" backgroundColor="#030014" translucent={false} />
        <GradientBackground />
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="movie/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="drama/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="poll/create" options={{ headerShown: false }} />
          <Stack.Screen name="poll/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="poll/history" options={{ headerShown: false }} />
          <Stack.Screen name="genre/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="person/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="watchlist/import" options={{ headerShown: false }} />
          <Stack.Screen name="watchlist/export" options={{ headerShown: false }} />
          <Stack.Screen name="favorites/people" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
        </Stack>
      </View>
      <Toast config={toastConfig} position="bottom" bottomOffset={60} />
    </QueryClientProvider>
  );
}

export default RootLayout;
