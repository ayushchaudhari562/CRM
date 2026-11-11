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
import { supabase } from '../src/services/supabase';
import { clearSession, getToken } from '../src/services/session';
import { crmService } from '../src/services';
import { queryClient } from '../src/services/queryClient';

/** On app start: if a saved login exists, load the user (and role) from our API. */
function useRestoreSession() {
  const { setUser, setAuthReady } = useAppStore();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (await getToken()) {
        try {
          const me = await crmService.getMe();
          if (!cancelled) setUser(me);
        } catch {
          await clearSession(); // expired session or user removed/deactivated
        }
      }
      if (!cancelled) setAuthReady();
    })();
    // Session ended elsewhere (token refresh failed, signed out) -> back to login.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setUser(null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
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
