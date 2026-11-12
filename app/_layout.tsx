import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { ThemeProvider, useTheme, baseColors } from '../src/theme';
import { useAppStore } from '../src/store';
import { OfflineBanner } from '../src/components';
import { getCachedUser, getRefreshToken, onSessionEnded } from '../src/services/session';
import { refreshAccess } from '../src/services';
import { queryClient } from '../src/services/queryClient';

/**
 * On app start: a saved login opens the app at once from the cached user (works offline),
 * then the server is asked for a fresh token. Only the server can end a login (logout / deactivated).
 */
function useRestoreSession() {
  const { setUser, setAuthReady } = useAppStore();
  useEffect(() => {
    let cancelled = false;
    onSessionEnded(() => {
      queryClient.clear();
      setUser(null);
    });
    (async () => {
      const [refreshToken, cached] = await Promise.all([getRefreshToken(), getCachedUser()]);
      if (refreshToken && cached && !cancelled) setUser(cached);
      if (!cancelled) setAuthReady();
      if (refreshToken) await refreshAccess().catch(() => {}); // offline: keep the login, retry on the next request
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, setAuthReady]);
}

function AppContent() {
  const { theme } = useTheme();
  const { offlineMode, user, authReady } = useAppStore();
  useRestoreSession();

  if (!authReady) return <Loading />;
  const role = user?.role;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <StatusBar style="light" />
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
              When a guard flips (login/logout), expo-router redirects automatically.
              This is UX only: the API checks the token and role on every request. */}
          <Stack.Protected guard={!user}>
            <Stack.Screen name="login" />
          </Stack.Protected>
          <Stack.Protected guard={role === 'salesman'}>
            <Stack.Screen name="(salesman)" />
          </Stack.Protected>
          <Stack.Protected guard={role === 'admin'}>
            <Stack.Screen name="admin" />
          </Stack.Protected>
        </Stack>
      </View>
    </SafeAreaView>
  );
}

function Loading() {
  return (
    <View style={[styles.loading, { backgroundColor: baseColors.bg }]}>
      <ActivityIndicator size="large" color={baseColors.accent} />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  if (!fontsLoaded) return <Loading />;

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
  container: { flex: 1 },
  content: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
