import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, fonts } from '../theme';
import { MAPS_AVAILABLE } from '../utils/maps';
import { OlaMapView, type OlaMapHandle } from './OlaMapView';
import type { SalesmanLocation } from '../types';

export interface TeamMapHandle {
  focus: (p: SalesmanLocation) => void;
}

const ON_DUTY = '#2E9E5B'; // green pin
const DAY_ENDED = '#F08C2E'; // orange pin

/** Manager's live map: one pin per salesman (green = on duty, orange = day ended). Light Ola map. */
export const TeamMap = forwardRef<TeamMapHandle, { points: SalesmanLocation[] }>(function TeamMap(
  { points },
  ref,
) {
  const { theme } = useTheme();
  const map = useRef<OlaMapHandle>(null);
  useImperativeHandle(ref, () => ({ focus: (p) => map.current?.focus(p.latitude, p.longitude) }));

  // No map key in this build: the list below the map still shows everyone.
  if (!MAPS_AVAILABLE) {
    return (
      <View style={[styles.box, styles.center, { backgroundColor: theme.colors.surface2 }]}>
        <Text style={[styles.note, { color: theme.colors.muted }]}>
          Map view coming soon · {points.length} salesmen below
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.box, { backgroundColor: theme.colors.surface2 }]}>
      <OlaMapView
        ref={map}
        pins={points.map((p) => ({
          id: p.salesmanId,
          latitude: p.latitude,
          longitude: p.longitude,
          color: p.onDuty ? ON_DUTY : DAY_ENDED,
          label: `${p.salesmanName} · ${p.onDuty ? 'On duty' : 'Day ended'}`,
        }))}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  box: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
});
