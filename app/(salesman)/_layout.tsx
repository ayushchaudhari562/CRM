import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme';

// Access to this group is guarded in app/_layout.tsx (role === 'salesman').
export default function SalesmanLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="checkin" />
      <Stack.Screen name="meeting-details" />
      <Stack.Screen name="meeting-saved" />
    </Stack>
  );
}
