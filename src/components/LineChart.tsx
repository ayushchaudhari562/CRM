import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme';

export interface LineChartProps {
  timeLabels?: string[];
  currentTime?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  timeLabels = ['9', '11', '13', '15', '17'],
  currentTime = '13:30 now',
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Svg
        width="100%"
        height={110}
        viewBox="0 0 350 110"
        accessibilityRole="image"
        accessibilityLabel="Visits through the day chart"
      >
        {/* Target dashed line */}
        <Path
          d="M0 100L60 85L120 90L180 70L240 75L300 60L350 50"
          fill="none"
          stroke={theme.colors.muted}
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Actual progress line */}
        <Path
          d="M0 90L50 70L100 80L150 40L200 55L250 30L300 45L350 20"
          fill="none"
          stroke={theme.colors.text}
          strokeWidth="2"
        />

        {/* Current position marker */}
        <Circle
          cx="200"
          cy="55"
          r="5"
          fill={theme.colors.bg}
          stroke={theme.colors.text}
          strokeWidth="2"
        />

        {/* Current time tooltip pill */}
        <Rect x="164" y="6" width="72" height="24" rx="12" fill={theme.colors.border} />
        <SvgText
          x="200"
          y="22"
          textAnchor="middle"
          fontFamily="Inter"
          fontSize="12"
          fontWeight="500"
          fill={theme.colors.text}
        >
          {currentTime}
        </SvgText>
      </Svg>

      <View style={styles.labelsRow}>
        {timeLabels.map((t, idx) => (
          <Text key={idx} style={[styles.timeLabel, { color: theme.colors.muted }]}>
            {t}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
  },
});

