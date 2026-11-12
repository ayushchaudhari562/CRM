import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Play, Pause } from 'lucide-react-native';
import { useTheme, fonts } from '../theme';

const mmss = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Play / pause a voice note (local file or signed URL) with a progress bar. */
export function VoicePlayer({ uri, seconds }: { uri: string; seconds?: number | null }) {
  const { theme } = useTheme();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const total = status.duration || seconds || 0;
  const at = status.didJustFinish ? 0 : status.currentTime;
  const ratio = total ? Math.min(1, at / total) : 0;

  const toggle = () => {
    if (status.playing) return player.pause();
    if (status.didJustFinish || (total && status.currentTime >= total - 0.2)) player.seekTo(0);
    player.play();
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause voice note' : 'Play voice note'}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: theme.colors.accent, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        {status.playing ? (
          <Pause size={18} color={theme.colors.onAccent} fill={theme.colors.onAccent} />
        ) : (
          <Play size={18} color={theme.colors.onAccent} fill={theme.colors.onAccent} />
        )}
      </Pressable>
      <View style={[styles.track, { backgroundColor: theme.colors.track }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: theme.colors.accent, width: `${Math.round(ratio * 100)}%` },
          ]}
        />
      </View>
      <Text style={[styles.time, { color: theme.colors.muted }]}>
        {status.playing || at > 0 ? `${mmss(at)} / ${mmss(total)}` : mmss(total)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
  },
  time: {
    fontFamily: fonts.medium,
    fontSize: 12,
    minWidth: 72,
    textAlign: 'right',
  },
});
