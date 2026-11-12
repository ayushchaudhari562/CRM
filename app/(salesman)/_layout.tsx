import React from 'react';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../src/theme';
import { crmService } from '../../src/services';
import { useShiftTracking } from '../../src/utils/location';

// Access to this group is guarded in app/_layout.tsx (role === 'salesman').
export default function SalesmanLayout() {
  const { theme } = useTheme();
  // While punched in, the position is sent about once a minute (anti-fraud trail for the manager).
  const { data: home } = useQuery({ queryKey: ['home'], queryFn: crmService.getHome });
  useShiftTracking(!!home?.punchedInAt);

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
      <Stack.Screen name="client/[id]" />
    </Stack>
  );
}
