import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme';

export interface TickRingProps {
  value: string;
  label: string;
  activeCount?: number;
  totalCount?: number;
  percentage?: number; // 0 to 1
  size?: number;
  accentColor?: string;
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
  const ticks = 48;
  const cx = 130;
  const cy = 130;

  // Determine how many ticks to light up
  let litTicks = 0;
  if (percentage !== undefined) {
    litTicks = Math.round(percentage * ticks);
  } else if (activeCount !== undefined && totalCount !== undefined && totalCount > 0) {
    litTicks = Math.min(ticks, Math.round((activeCount / totalCount) * ticks));
  } else {
    litTicks = 18; // default matching 3/8 mockup
  }

  // Precomputed pseudorandom outer lengths for the exact organic look in the mockup
  const tickLengths = [
    12, 29, 32, 20, 19, 27, 21, 8, 25, 31, 16, 22, 34, 28, 12, 27, 29, 17, 16, 21, 20, 8, 29, 34,
    10, 23, 33, 27, 18, 24, 23, 16, 20, 31, 27, 14, 30, 32, 19, 21, 29, 22, 10, 22, 28, 17, 23,
    33,
  ];

  const activeStroke = accentColor ?? '#BFE3C5';
  const trackStroke = theme.colors.track;

  const lines = [];
  for (let i = 0; i < ticks; i++) {
    const angle = (i / ticks) * 2 * Math.PI;
    const isLit = i < litTicks;

    const r1 = 70;
    const len = tickLengths[i % tickLengths.length];
    const r2 = r1 + len;

    const x1 = cx + r1 * Math.cos(angle);
    const y1 = cy + r1 * Math.sin(angle);
    const x2 = cx + r2 * Math.cos(angle);
    const y2 = cy + r2 * Math.sin(angle);

    const opacity = isLit ? 0.75 + (i % 4) * 0.08 : 1.0;

    lines.push(
      <Line
        key={i}
        x1={x1.toFixed(1)}
        y1={y1.toFixed(1)}
        x2={x2.toFixed(1)}
        y2={y2.toFixed(1)}
        stroke={isLit ? activeStroke : trackStroke}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={isLit ? opacity : 1.0}
      />
    );
  }

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 260 260"
        accessibilityRole="image"
        accessibilityLabel={`${value} ${label}`}
      >
        {lines}
        <SvgText
          x={cx}
          y={128}
          textAnchor="middle"
          fontFamily="Inter"
          fontSize="44"
          fontWeight="600"
          fill={theme.colors.text}
        >
          {value}
        </SvgText>
        <SvgText
          x={cx}
          y={154}
          textAnchor="middle"
          fontFamily="Inter"
          fontSize="15"
          fontWeight="400"
          fill={theme.colors.muted}
        >
          {label}
        </SvgText>
      </Svg>
    </View>
  );
};

