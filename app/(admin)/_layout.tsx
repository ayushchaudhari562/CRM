import React from 'react';
import { Stack } from 'expo-router';

export default function AdminRootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0B0C0D' },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="report/[id]" />
      <Stack.Screen name="bento" />
    </Stack>
  );
}

