import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio';
import { Mic, Square, Trash2 } from 'lucide-react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { isRunningInExpoGo } from 'expo';
import { useTheme, fonts } from '../theme';
import { VoicePlayer } from './VoicePlayer';

export interface VoiceClip {
  uri: string; // local file (m4a)
  seconds: number;
}

export const VOICE_CONTENT_TYPE = 'audio/mp4'; // m4a (AAC)
const MAX_SECONDS = 3600; // 60 minutes (the server accepts up to this)

// Speech only: mono, 32 kbps AAC ≈ 0.24 MB a minute (30 min ≈ 7 MB; fast on mobile data).
const PRESET: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 32000,
};

const KEEP_AWAKE = 'voice-recording';
const IN_EXPO_GO = isRunningInExpoGo();

const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Record a voice note: tap to start, tap to stop, then listen / delete. */
export function VoiceRecorder({
  value,
  onChange,
  disabled,
}: {
  value: VoiceClip | null;
  onChange: (clip: VoiceClip | null) => void;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const recorder = useAudioRecorder(PRESET);
  const state = useAudioRecorderState(recorder, 250);
  const [error, setError] = useState('');
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null); // auto-stop at 10 minutes
  useEffect(
    () => () => {
      clearTimeout(limit.current ?? undefined);
      deactivateKeepAwake(KEEP_AWAKE);
    },
    [],
  );

  const start = async () => {
    setError('');
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted)
        return setError('Microphone permission is off. Allow it in phone settings.');
      // Keep recording if the screen locks: needs the recording service from the app.json plugin,
      // which only real builds (APK) have. Expo Go has no such service, so it is off there.
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        allowsBackgroundRecording: !IN_EXPO_GO,
      });
      await activateKeepAwakeAsync(KEEP_AWAKE).catch(() => {}); // screen stays on while recording
      await recorder.prepareToRecordAsync();
      recorder.record();
      limit.current = setTimeout(() => stop(), MAX_SECONDS * 1000);
    } catch {
      setError('Could not start recording. Please try again.');
    }
  };

  const stop = async () => {
    clearTimeout(limit.current ?? undefined);
    deactivateKeepAwake(KEEP_AWAKE);
    const ms = recorder.getStatus().durationMillis;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); // play on the speaker
      if (!recorder.uri) return setError('Recording failed. Please try again.');
      if (ms < 1000) return setError('Too short. Hold on a little longer.');
      onChange({
        uri: recorder.uri,
        seconds: Math.min(MAX_SECONDS, Math.max(1, Math.round(ms / 1000))),
      });
    } catch {
      setError('Could not save the recording. Please try again.');
    }
  };

  if (value && !state.isRecording) {
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Voice note</Text>
          <Pressable
            onPress={() => onChange(null)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Delete voice note"
            hitSlop={10}
            style={({ pressed }) => ({ opacity: pressed || disabled ? 0.5 : 1 })}
          >
            <Trash2 size={18} color={theme.colors.muted} />
          </Pressable>
        </View>
        <VoicePlayer uri={value.uri} seconds={value.seconds} />
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.center, { backgroundColor: theme.colors.surface }]}>
      <Pressable
        onPress={state.isRecording ? stop : start}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={state.isRecording ? 'Stop recording' : 'Record voice note'}
        style={({ pressed }) => [
          styles.mic,
          {
            backgroundColor: state.isRecording ? theme.colors.adminRedText : theme.colors.accent,
            opacity: pressed || disabled ? 0.8 : 1,
          },
        ]}
      >
        {state.isRecording ? (
          <Square size={24} color="#FFFFFF" fill="#FFFFFF" />
        ) : (
          <Mic size={28} color={theme.colors.onAccent} />
        )}
      </Pressable>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {state.isRecording
          ? `Recording ${mmss(state.durationMillis)}`
          : 'Tap to record a voice note'}
      </Text>
      <Text
        style={[styles.hint, { color: error ? theme.colors.adminRedText : theme.colors.muted }]}
      >
        {error || (state.isRecording ? 'Tap the button to stop' : 'Optional · up to 60 minutes')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  center: {
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mic: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'center',
  },
});
