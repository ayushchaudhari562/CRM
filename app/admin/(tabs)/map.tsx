import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, fonts } from '../../../src/theme';
import { MapCard, Card } from '../../../src/components';

export default function AdminMapScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Live Field Map</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Real-time locations of all 12 field salesmen
        </Text>
      </View>

      <View style={styles.mapWrapper}>
        <MapCard
          height={320}
          pins={[
            { x: 90, y: 50 },
            { x: 180, y: 110 },
            { x: 260, y: 70 },
            { x: 140, y: 140 },
            { x: 290, y: 130 },
          ]}
        />
      </View>

      <Card surface="surface" style={styles.infoCard}>
        <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Active Territory</Text>
        <Text style={[styles.infoSub, { color: theme.colors.muted }]}>
          5 salesmen currently engaged in client meetings, 4 travelling between shops.
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

