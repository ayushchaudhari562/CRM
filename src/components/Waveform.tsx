import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Play, Pause } from 'lucide-react-native';
import { useTheme } from '../theme';

export interface WaveformProps {
  duration?: string;
  aiSummary?: string;
  accentColor?: string;
  showAiSummary?: boolean;
}

export const Waveform: React.FC<WaveformProps> = ({
  duration = '00:24',
  aiSummary = 'Client ko rate thoda zyada laga. Sample dekhna chahta hai. 7 din baad dobara milne ko bola.',
  accentColor,
  showAiSummary = true,
}) => {
  const { theme } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);

  const activeColor = accentColor ?? theme.colors.accent;
  const inactiveColor = theme.colors.track;

  // Bar heights from design
  const barHeights = [
    8, 16, 24, 12, 28, 18, 10, 22, 30, 14, 20, 26, 12, 18, 24, 10, 16, 28, 14, 20, 12, 22, 8, 18,
    26, 10, 16, 20, 12, 8,
  ];

  return (
    <View style={styles.container}>
      <View style={styles.playerRow}>
        <Pressable
          onPress={() => setIsPlaying(!isPlaying)}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause voice note' : 'Play voice note'}
          style={({ pressed }) => [
            styles.playButton,
            {
              backgroundColor: theme.colors.text,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {isPlaying ? (
            <Pause size={18} color={theme.colors.bg} />
          ) : (
            <Play size={18} color={theme.colors.bg} style={{ marginLeft: 2 }} />
          )}
        </Pressable>

        <View style={styles.svgWrapper}>
          <Svg width="100%" height={36} viewBox="0 0 240 36">
            {barHeights.map((h, i) => {
              const x = i * 8;
              const y = (36 - h) / 2;
              const isPast = isPlaying ? true : i < 14;
              return (
                <Rect
                  key={i}
                  x={x}
                  y={y}
                  width={4}
                  height={h}
                  rx={2}
                  fill={isPast ? activeColor : inactiveColor}
                />
              );
            })}
          </Svg>
        </View>

        <Text style={[styles.duration, { color: theme.colors.muted }]}>{duration}</Text>
      </View>

      {showAiSummary && aiSummary ? (
        <View style={styles.summaryBox}>
          <Text style={[styles.summaryLabel, { color: theme.colors.muted }]}>AI summary</Text>
          <Text style={[styles.summaryText, { color: theme.colors.text }]}>{aiSummary}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgWrapper: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
  },
  duration: {
    fontFamily: 'Inter',
    fontSize: 13,
  },
  summaryBox: {
    gap: 4,
  },
  summaryLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
  },
  summaryText: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
  },
});

