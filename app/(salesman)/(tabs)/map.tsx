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

export default function SalesmanMapTab() {
  const { theme } = useTheme();
  const { data: home } = useQuery({ queryKey: ['home'], queryFn: crmService.getHome });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Field Map</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Map placeholder · today&apos;s visits
        </Text>
      </View>

      <View style={styles.mapWrapper}>
        <MapCard height={300} pins={PLACEHOLDER_PINS.slice(0, home?.visitsDone ?? 0)} />
      </View>

      <View style={styles.listSection}>
        <Card surface="surface" style={styles.legendCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Today&apos;s Route</Text>
          <Text style={[styles.cardSub, { color: theme.colors.muted }]}>
            {home
              ? `${home.visitsDone}${home.visitsTarget ? ` of ${home.visitsTarget}` : ''} visits today · ${home.followUpsToday.length} follow-ups due`
              : 'Loading...'}
          </Text>
        </Card>
      </View>
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
  listSection: {
    flex: 1,
  },
  legendCard: {
    gap: 6,
  },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  cardSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
});
