import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { useTheme } from '../theme';

export interface MapPin {
  x: number;
  y: number;
  label?: string;
}

export interface MapCardProps {
  height?: number;
  width?: number | string;
  pins?: MapPin[];
  pinColor?: string;
  style?: ViewStyle;
}

export const MapCard: React.FC<MapCardProps> = ({
  height = 190,
  pins,
  pinColor,
  style,
}) => {
  const { theme } = useTheme();
  const activeColor = pinColor ?? theme.colors.accent;

  const defaultPins: MapPin[] = pins ?? [{ x: 175, y: 95 }];

  return (
    <View style={[styles.container, { height }, style]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 350 190"
        accessibilityRole="image"
        accessibilityLabel="Map with pinned location"
      >
        <Rect width={350} height={190} rx={22} fill={theme.colors.surface2} />
        {/* Road grid */}
        <Path
          d="M0 60H350M0 130H350M90 0V190M230 0V190"
          stroke={theme.colors.border}
          strokeWidth={8}
        />

        {/* Pinned location markers */}
        {defaultPins.map((p, idx) => (
          <React.Fragment key={idx}>
            <Circle cx={p.x} cy={p.y} r={28} fill={activeColor} fillOpacity={0.18} />
            <Circle
              cx={p.x}
              cy={p.y}
              r={9}
              fill={activeColor}
              stroke={theme.colors.bg}
              strokeWidth={3}
            />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 22,
    overflow: 'hidden',
  },
});

