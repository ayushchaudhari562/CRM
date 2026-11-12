import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, fonts } from '../theme';
import type { SalesmanLocation } from '../types';

export interface TeamMapHandle {
  focus: (p: SalesmanLocation) => void;
}

/** Web build (testing only): react-native-maps has no web version. */
export const TeamMap = forwardRef<TeamMapHandle, { points: SalesmanLocation[] }>(function TeamMap(
  { points },
  _ref,
) {
  const { theme } = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: theme.colors.surface2 }]}>
      <Text style={[styles.note, { color: theme.colors.muted }]}>
        Map is shown in the phone app · {points.length} on the map
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  box: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
});
