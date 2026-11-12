import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { useTheme, fonts } from '../theme';

export interface LiveMapProps {
  latitude: number | null; // null = no position yet
  longitude: number | null;
  accuracy?: number | null; // metres: drawn as a circle around the dot
  height?: number; // omit to fill the parent (flex: 1)
  interactive?: boolean; // false = fixed map (inside a scroll view)
}

const ZOOM = { latitudeDelta: 0.004, longitudeDelta: 0.004 }; // ~ street level

/** Native map (Google Maps on Android) with the salesman's live position. Light map style. */
export function LiveMap({
  latitude,
  longitude,
  accuracy = null,
  height,
  interactive = true,
}: LiveMapProps) {
  const { theme } = useTheme();
  const ref = useRef<MapView>(null);
  const follow = useRef(true); // keep the dot centred until the user moves the map
  const has = latitude != null && longitude != null;

  useEffect(() => {
    if (has && follow.current) {
      ref.current?.animateToRegion({ latitude: latitude!, longitude: longitude!, ...ZOOM }, 400);
    }
  }, [has, latitude, longitude]);

  return (
    <View
      style={[
        styles.box,
        height ? { height } : styles.fill,
        { backgroundColor: theme.colors.surface2 },
      ]}
    >
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        initialRegion={
          has
            ? { latitude: latitude!, longitude: longitude!, ...ZOOM }
            : { latitude: 22.5, longitude: 79, latitudeDelta: 25, longitudeDelta: 25 } // India
        }
        userInterfaceStyle="light"
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        onPanDrag={() => (follow.current = false)}
      >
        {has ? (
          <>
            {accuracy ? (
              <Circle
                center={{ latitude: latitude!, longitude: longitude! }}
                radius={accuracy}
                strokeColor="rgba(66,133,244,0.6)"
                fillColor="rgba(66,133,244,0.15)"
                strokeWidth={1}
              />
            ) : null}
            <Marker
              coordinate={{ latitude: latitude!, longitude: longitude! }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={styles.dot} />
            </Marker>
          </>
        ) : null}
      </MapView>
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
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4285F4',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});
