import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { crmService } from '../../../src/services';
import { useTheme, fonts } from '../../../src/theme';
import { MapCard, Card } from '../../../src/components';

// Map is a placeholder (real map needs a maps library). Pin count = real numbers.
const PLACEHOLDER_PINS = [
  { x: 120, y: 70 },
  { x: 200, y: 120 },
  { x: 260, y: 60 },
  { x: 90, y: 50 },
  { x: 180, y: 110 },
  { x: 140, y: 140 },
  { x: 290, y: 130 },
  { x: 60, y: 120 },
];

export default function AdminMapScreen() {
  const { theme } = useTheme();
  const { data: o } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: crmService.getAdminOverview,
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Live Field Map</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Map placeholder · {o ? `${o.salesmenCount} salesmen` : 'loading...'}
        </Text>
      </View>

      <View style={styles.mapWrapper}>
        <MapCard
          height={320}
          pins={PLACEHOLDER_PINS.slice(0, o ? o.fieldStatus.inMeeting + o.fieldStatus.onRoad : 0)}
        />
      </View>

      <Card surface="surface" style={styles.infoCard}>
        <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Active Territory</Text>
        <Text style={[styles.infoSub, { color: theme.colors.muted }]}>
          {o
            ? `${o.fieldStatus.inMeeting} in client meetings, ${o.fieldStatus.onRoad} on the road, ${o.fieldStatus.notStarted} not started.`
            : 'Loading...'}
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 26,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  mapWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  infoCard: {
    gap: 6,
  },
  infoTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  infoSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
});
