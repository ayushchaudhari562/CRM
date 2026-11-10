import React from 'react';
import { Stack } from 'expo-router';

export default function SalesmanLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0B0C0D' },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="checkin" />
      <Stack.Screen name="meeting-details" />
      <Stack.Screen name="meeting-saved" />
    </Stack>
  );
}

