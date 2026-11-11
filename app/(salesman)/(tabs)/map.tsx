import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, fonts } from '../../../src/theme';
import { MapCard, Card } from '../../../src/components';

export default function SalesmanMapTab() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Field Map</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Scheduled visits and assigned territory
        </Text>
      </View>

      <View style={styles.mapWrapper}>
        <MapCard
          height={300}
          pins={[
            { x: 120, y: 70 },
            { x: 200, y: 120 },
            { x: 260, y: 60 },
          ]}
        />
      </View>

      <View style={styles.listSection}>
        <Card surface="surface" style={styles.legendCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Today&apos;s Route</Text>
          <Text style={[styles.cardSub, { color: theme.colors.muted }]}>
            3 of 8 clients visited · Current area: Zone B
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

