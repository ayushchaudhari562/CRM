import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { ThemeProvider, useTheme, baseColors } from '../src/theme';
import { useAppStore } from '../src/store';
import { DevBar, OfflineBanner } from '../src/components';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function AppContent() {
  const { theme } = useTheme();
  const { offlineMode, isLoggedIn, role } = useAppStore();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <StatusBar style="light" />
      {__DEV__ && <DevBar />}
      <OfflineBanner visible={offlineMode} />
      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bg },
            animation: 'fade',
          }}
        >
          {/* Route guards: a group is only reachable when its guard is true.
              When a guard flips (login/logout), expo-router redirects automatically,
              and "/" opens the home of the one allowed group.
              Note: this is UX only. Real access control must be done by the backend. */}
          <Stack.Protected guard={!isLoggedIn}>
            <Stack.Screen name="login" />
          </Stack.Protected>
          <Stack.Protected guard={isLoggedIn && role === 'salesman'}>
            <Stack.Screen name="(salesman)" />
          </Stack.Protected>
          <Stack.Protected guard={isLoggedIn && role === 'admin'}>
            <Stack.Screen name="admin" />
          </Stack.Protected>
        </Stack>
      </View>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: baseColors.bg }]}>
        <ActivityIndicator size="large" color={baseColors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
