import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin, Crosshair } from 'lucide-react-native';
import { useTheme, fonts } from '../../../src/theme';
import { Card, LiveMap, Button } from '../../../src/components';
import { useAddress, useLiveLocation } from '../../../src/utils/location';
import { formatLatLng, formatTime } from '../../../src/utils/format';

/** The salesman's own live position (exact, or nearest available). */
export default function SalesmanMapTab() {
  const { theme } = useTheme();
  const [retry, setRetry] = useState(0);
  const loc = useLiveLocation(retry);
  const fix = loc.fix;
  const address = useAddress(fix);

  const status =
    loc.status === 'denied'
      ? 'Location permission is off. Allow it in phone settings.'
      : loc.status === 'error'
        ? 'Could not get location. Turn on GPS / location.'
        : !fix
          ? 'Finding your location...'
          : fix.approx
            ? `Nearest location (±${Math.round(fix.accuracy ?? 0)} m) · improving...`
            : `Exact location (±${Math.round(fix.accuracy ?? 0)} m)`;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Field Map</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>Your live location</Text>
      </View>

      <LiveMap
        latitude={fix?.latitude ?? null}
        longitude={fix?.longitude ?? null}
        accuracy={fix?.accuracy}
      />

      <Card surface="surface" style={styles.card}>
        <View style={styles.row}>
          <Crosshair size={16} color={fix ? theme.colors.accent : theme.colors.warning} />
          <Text style={[styles.status, { color: theme.colors.text }]}>{status}</Text>
        </View>

        {fix ? (
          <>
            <Text selectable style={[styles.coords, { color: theme.colors.text }]}>
              {formatLatLng(fix.latitude, fix.longitude)}
            </Text>
            {address ? (
              <View style={styles.row}>
                <MapPin size={14} color={theme.colors.muted} />
                <Text style={[styles.sub, { color: theme.colors.muted }]} numberOfLines={2}>
                  {address}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.updated, { color: theme.colors.muted }]}>
              Updated {formatTime(new Date(fix.at))}
            </Text>
          </>
        ) : null}

        {loc.status === 'denied' || loc.status === 'error' ? (
          <Button
            title="Try again"
            onPress={() => setRetry((n) => n + 1)}
            variant="outline"
            size="small"
          />
        ) : null}
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
  card: {
    padding: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  status: {
    fontFamily: fonts.medium,
    fontSize: 14,
    flex: 1,
  },
  coords: {
    fontFamily: fonts.semibold,
    fontSize: 18,
  },
  updated: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    flex: 1,
  },
});
