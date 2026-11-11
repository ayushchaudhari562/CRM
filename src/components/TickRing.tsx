import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Text as SvgText } from 'react-native-svg';
import { useTheme, fonts } from '../theme';

export interface TickRingProps {
  value: string; // big text in the middle, e.g. "3/8"
  label: string; // small text under it, e.g. "Visits done"
  activeCount?: number;
  totalCount?: number;
  percentage?: number; // 0..1, used instead of active/total when given
  size?: number;
  accentColor?: string;
}

const TICKS = 48;
const CENTER = 130; // the drawing is 260x260 and scaled to `size`
const INNER_RADIUS = 70;
// Fixed "random" tick lengths to match the organic look of the mockup.
const TICK_LENGTHS = [
  12, 29, 32, 20, 19, 27, 21, 8, 25, 31, 16, 22, 34, 28, 12, 27, 29, 17, 16, 21, 20, 8, 29, 34, 10,
  23, 33, 27, 18, 24, 23, 16, 20, 31, 27, 14, 30, 32, 19, 21, 29, 22, 10, 22, 28, 17, 23, 33,
];

/** How many of the 48 ticks are lit. Always 0..48 (no NaN, no negative, no overflow). */
export function litTickCount(percentage?: number, active?: number, total?: number): number {
  let ratio = 0;
  if (percentage !== undefined) ratio = percentage;
  else if (active !== undefined && total !== undefined && total > 0) ratio = active / total;
  if (!Number.isFinite(ratio)) return 0;
  return Math.round(Math.min(1, Math.max(0, ratio)) * TICKS);
}

export const TickRing: React.FC<TickRingProps> = ({
  value,
  label,
  activeCount,
  totalCount,
  percentage,
  size = 220,
  accentColor,
}) => {
  const { theme } = useTheme();
  const lit = litTickCount(percentage, activeCount, totalCount);
  const litColor = accentColor ?? theme.colors.ringTick;

  return (
    <View style={styles.wrapper}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 260 260"
        accessibilityRole="image"
        accessibilityLabel={`${value} ${label}`}
      >
        {TICK_LENGTHS.map((len, i) => {
          const angle = (i / TICKS) * 2 * Math.PI;
          const isLit = i < lit;
          const outer = INNER_RADIUS + len;
          return (
            <Line
              key={i}
              x1={CENTER + INNER_RADIUS * Math.cos(angle)}
              y1={CENTER + INNER_RADIUS * Math.sin(angle)}
              x2={CENTER + outer * Math.cos(angle)}
              y2={CENTER + outer * Math.sin(angle)}
              stroke={isLit ? litColor : theme.colors.track}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={isLit ? 0.75 + (i % 4) * 0.08 : 1}
            />
          );
        })}
        <SvgText
          x={CENTER}
          y={128}
          textAnchor="middle"
          fontFamily={fonts.semibold}
          fontSize="44"
          fill={theme.colors.text}
        >
          {value}
        </SvgText>
        <SvgText
          x={CENTER}
          y={154}
          textAnchor="middle"
          fontFamily={fonts.regular}
          fontSize="15"
          fill={theme.colors.muted}
        >
          {label}
        </SvgText>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
});
