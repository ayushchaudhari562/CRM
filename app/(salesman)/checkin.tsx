import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Camera, AlertTriangle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, fonts } from '../../src/theme';
import { Button, LiveMap } from '../../src/components';
import { useAppStore } from '../../src/store';
import { formatLatLng, formatTime } from '../../src/utils/format';
import { useAddress, useLiveLocation } from '../../src/utils/location';

export default function CheckinScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { setCheckIn } = useAppStore();

  // Arrival time = when the salesman opens this screen.
  const [checkInAt] = useState(() => new Date().toISOString());
  const [retry, setRetry] = useState(0);
  const gps = useLiveLocation(retry); // live: exact fix, or nearest until GPS locks
  const fix = gps.fix;
  const address = useAddress(fix);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');

  const retryLocation = () => setRetry((n) => n + 1);

  // Selfie must come from the camera (it is proof of the visit), never from the gallery.
  const handleOpenCamera = async () => {
    setCameraError('');
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted)
        return setCameraError(
          'Camera permission is off. Allow it in phone settings to take the selfie.',
        );
      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        quality: 0.6,
      });
      if (!result.canceled && result.assets[0]) setSelfieUri(result.assets[0].uri);
    } catch {
      setCameraError('Could not open the camera. Please try again.');
    }
  };

  const handleContinue = () => {
    const location = fix
      ? { latitude: fix.latitude, longitude: fix.longitude, accuracy: fix.accuracy }
      : null;
    setCheckIn({ checkInAt, location, selfieUri });
    router.push('/(salesman)/meeting-details');
  };

  const gpsText = fix
    ? fix.approx
      ? `Nearest location (±${Math.round(fix.accuracy ?? 0)} m)`
      : `Exact location (±${Math.round(fix.accuracy ?? 0)} m)`
    : gps.status === 'checking'
      ? 'Getting your location...'
      : gps.status === 'denied'
        ? 'Location permission denied'
        : 'Could not get location (GPS off?)';
  const gpsOk = !!fix; // exact or nearest: both are saved with their accuracy

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: theme.colors.surface2, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <ChevronLeft size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.barTitle, { color: theme.colors.text }]}>Start meeting</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Check in</Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            Location and time are saved automatically
          </Text>
        </View>

        {/* Map Card */}
        <LiveMap
          height={190}
          interactive={false}
          latitude={fix?.latitude ?? null}
          longitude={fix?.longitude ?? null}
          accuracy={fix?.accuracy}
        />

        {/* Verification Checklist */}
        <View style={[styles.checklistCard, { backgroundColor: theme.colors.surface }]}>
          <CheckRow ok={gpsOk} text={gpsText} />
          {fix ? (
            <Text selectable style={[styles.coords, { color: theme.colors.muted }]}>
              {formatLatLng(fix.latitude, fix.longitude)}
              {address ? `\n${address}` : ''}
            </Text>
          ) : null}
          {gps.status === 'denied' || gps.status === 'error' ? (
            <Button
              title="Try again"
              onPress={retryLocation}
              variant="outline"
              size="small"
              fullWidth={false}
            />
          ) : null}
          <CheckRow ok text={`Time saved: ${formatTime(checkInAt)}`} />
        </View>

        {/* Selfie Card */}
        <View style={[styles.selfieCard, { backgroundColor: theme.colors.surface }]}>
          <View
            style={[
              styles.previewBox,
              { borderColor: theme.colors.track, backgroundColor: theme.colors.surface2 },
            ]}
          >
            {selfieUri ? (
              <Image source={{ uri: selfieUri }} style={styles.selfieImage} />
            ) : (
              <Camera size={28} color={theme.colors.muted} />
            )}
          </View>

          <View style={styles.selfieDetails}>
            <Text style={[styles.selfieTitle, { color: theme.colors.text }]}>
              Selfie at the shop
            </Text>
            <Button
              title={selfieUri ? 'Retake selfie' : 'Open camera'}
              onPress={handleOpenCamera}
              variant="outline"
              size="compact"
            />
            {cameraError ? (
              <Text
                accessibilityRole="alert"
                style={[styles.errorText, { color: theme.colors.adminRedText }]}
              >
                {cameraError}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Continue Button */}
        <Button
          title="Continue to client details"
          onPress={handleContinue}
          disabled={gps.status === 'checking' && !fix}
          variant="primary"
          size="normal"
          style={styles.continueBtn}
        />
      </ScrollView>
    </View>
  );
}

function CheckRow({ ok, text }: { ok: boolean; text: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.checkItem}>
      <View
        style={[
          styles.checkCircle,
          { backgroundColor: ok ? theme.colors.accentSoftBg : theme.colors.warningBg },
        ]}
      >
        {ok ? (
          <Check size={16} color={theme.colors.accent} strokeWidth={2.5} />
        ) : (
          <AlertTriangle size={14} color={theme.colors.warning} />
        )}
      </View>
      <Text style={[styles.checkText, { color: theme.colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  coords: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginLeft: 40,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 16,
    flexGrow: 1,
  },
  header: {
    paddingVertical: 8,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 30,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 4,
  },
  checklistCard: {
    borderRadius: 22,
    padding: 16,
    gap: 14,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  selfieCard: {
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  previewBox: {
    width: 88,
    height: 88,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selfieImage: {
    width: '100%',
    height: '100%',
  },
  selfieDetails: {
    flex: 1,
    gap: 10,
  },
  selfieTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  spacer: {
    flex: 1,
    minHeight: 20,
  },
  continueBtn: {
    marginBottom: 8,
  },
});
