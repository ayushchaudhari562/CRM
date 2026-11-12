import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../theme';
import type { SalesmanLocation } from '../types';

export interface TeamMapHandle {
  focus: (p: SalesmanLocation) => void;
}

/** Manager's live map: one marker per salesman (green = on duty, orange = day ended). Light map. */
export const TeamMap = forwardRef<TeamMapHandle, { points: SalesmanLocation[] }>(function TeamMap(
  { points },
  ref,
) {
  const { theme } = useTheme();
  const map = useRef<MapView>(null);
  const fitted = useRef(false);

  useImperativeHandle(ref, () => ({
    focus: (p) =>
      map.current?.animateToRegion(
        { latitude: p.latitude, longitude: p.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        400,
      ),
  }));

  // Zoom to show everyone the first time positions arrive.
  useEffect(() => {
    if (fitted.current || !points.length) return;
    fitted.current = true;
    const t = setTimeout(
      () =>
        map.current?.fitToCoordinates(points, {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: false,
        }),
      300,
    );
    return () => clearTimeout(t);
  }, [points]);

  return (
    <View style={[styles.box, { backgroundColor: theme.colors.surface2 }]}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: 22.5, longitude: 79, latitudeDelta: 25, longitudeDelta: 25 }} // India
        userInterfaceStyle="light"
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        {points.map((p) => (
          <Marker
            key={p.salesmanId}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            title={p.salesmanName}
            description={p.onDuty ? 'On duty' : 'Day ended'}
            pinColor={p.onDuty ? 'green' : 'orange'} // Android pins support hues only (no grey)
          />
        ))}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  box: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
});
