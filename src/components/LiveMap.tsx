import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, fonts } from '../theme';
import { MAPS_AVAILABLE } from '../utils/maps';
import { OlaMapView } from './OlaMapView';

export interface LiveMapProps {
  latitude: number | null; // null = no position yet
  longitude: number | null;
  accuracy?: number | null; // metres (shown as text by the screens)
  height?: number; // omit to fill the parent (flex: 1)
  interactive?: boolean; // false = fixed map (inside a scroll view)
}

/** The salesman's live position on a light Ola map (follows them until they move the map). */
export function LiveMap({ latitude, longitude, height, interactive = true }: LiveMapProps) {
  const { theme } = useTheme();
  const has = latitude != null && longitude != null;
  const boxStyle = [
    styles.box,
    height ? { height } : styles.fill,
    { backgroundColor: theme.colors.surface2 },
  ];

  // No map key in this build: show the position as text.
  if (!MAPS_AVAILABLE) {
    return (
      <View style={[boxStyle, styles.center]}>
        <Text style={[styles.note, { color: theme.colors.text }]}>
          {has ? `${latitude!.toFixed(6)}, ${longitude!.toFixed(6)}` : 'Finding your location...'}
        </Text>
        <Text style={[styles.note, { color: theme.colors.muted }]}>Map view coming soon</Text>
      </View>
    );
  }

  return (
    <View style={boxStyle}>
      <OlaMapView
        interactive={interactive}
        follow
        pins={
          has
            ? [
                {
                  id: 'me',
                  latitude: latitude!,
                  longitude: longitude!,
                  color: '#4285F4',
                  label: 'You',
                },
              ]
            : []
        }
      />
      {!has ? (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Text style={[styles.note, { color: theme.colors.text }]}>Finding your location...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
});
