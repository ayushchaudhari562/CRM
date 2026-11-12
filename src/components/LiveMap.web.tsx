import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, fonts } from '../theme';
import type { LiveMapProps } from './LiveMap';

/** Web build (testing only): react-native-maps has no web version. */
export function LiveMap({ height }: LiveMapProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.box,
        height ? { height } : styles.fill,
        { backgroundColor: theme.colors.surface2 },
      ]}
    >
      <Text style={[styles.note, { color: theme.colors.muted }]}>
        Map is shown in the phone app
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
});
