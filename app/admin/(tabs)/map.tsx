import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { crmService } from '../../../src/services';
import { useTheme, fonts } from '../../../src/theme';
import { Card, TeamMap, type TeamMapHandle } from '../../../src/components';
import { timeAgo } from '../../../src/utils/format';

/** Manager: where each salesman is now (latest GPS point or punch-in point today). */
export default function AdminMapScreen() {
  const { theme } = useTheme();
  const map = useRef<TeamMapHandle>(null);
  const { data: points = [], isLoading } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: crmService.getLatestLocations,
    refetchInterval: 30_000, // live: every 30 s
  });
  const sorted = [...points].sort(
    (a, b) => Number(b.onDuty) - Number(a.onDuty) || a.salesmanName.localeCompare(b.salesmanName),
  );
  const onDuty = points.filter((p) => p.onDuty).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Live Field Map</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          {isLoading ? 'Loading...' : `${onDuty} on duty · updates every 30 s`}
        </Text>
      </View>

      <View style={styles.mapWrapper}>
        <TeamMap ref={map} points={points} />
      </View>

      <Card surface="surface" style={styles.listCard}>
        {sorted.length === 0 ? (
          <Text style={[styles.sub, { color: theme.colors.muted }]}>
            {isLoading ? 'Loading...' : 'No salesman has punched in today yet.'}
          </Text>
        ) : (
          <ScrollView>
            {sorted.map((p) => (
              <Pressable
                key={p.salesmanId}
                onPress={() => map.current?.focus(p)}
                accessibilityRole="button"
                accessibilityLabel={`${p.salesmanName}, ${p.onDuty ? 'on duty' : 'day ended'}. Show on map`}
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: p.onDuty ? theme.colors.accent : theme.colors.warning },
                  ]}
                />
                <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                  {p.salesmanName}
                </Text>
                <Text style={[styles.sub, { color: theme.colors.muted }]}>
                  {p.onDuty ? 'On duty' : 'Day ended'} · {timeAgo(p.recordedAt)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
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
    flex: 1,
  },
  listCard: {
    padding: 14,
    maxHeight: 220,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: 15,
    flex: 1,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
});
