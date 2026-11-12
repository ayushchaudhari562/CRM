import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme';

// Access to this group is guarded in app/_layout.tsx (role === 'admin').
export default function AdminRootLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="report/[id]" />
      <Stack.Screen name="bento" />
      <Stack.Screen name="outcome" />
    </Stack>
  );
}
