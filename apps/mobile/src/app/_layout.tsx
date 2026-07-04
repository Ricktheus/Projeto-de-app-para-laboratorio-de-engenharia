import '../../global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Toaster } from '../components/ui';
import { useInitAuth } from '../features/auth/useInitAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: { retry: false },
    queries: { retry: 1 },
  },
});

/** Bootstraps auth, renders the navigator and the global toast layer. */
function AuthGate() {
  useInitAuth();
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toaster />
    </>
  );
}

/** expo-router root layout: providers wrap the whole app tree. */
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <AuthGate />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
