import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Camera, AlertTriangle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTheme, fonts } from '../../src/theme';
import { Button, MapCard } from '../../src/components';
import { useAppStore, type CheckIn } from '../../src/store';
import { formatTime } from '../../src/utils/format';

type GpsState =
  | { status: 'checking' }
  | { status: 'captured'; location: NonNullable<CheckIn['location']> }
  | { status: 'denied' }
  | { status: 'error' };

/** Ask permission and read the GPS position. Never throws. */
async function readLocation(): Promise<GpsState> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { status: 'denied' };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const { latitude, longitude, accuracy } = pos.coords;
    return { status: 'captured', location: { latitude, longitude, accuracy: accuracy ?? null } };
  } catch {
    return { status: 'error' }; // GPS off / no signal
  }
}

export default function CheckinScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { setCheckIn } = useAppStore();

  // Arrival time = when the salesman opens this screen.
  const [checkInAt] = useState(() => new Date().toISOString());
  const [gps, setGps] = useState<GpsState>({ status: 'checking' });
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    let active = true; // ignore the answer if the screen was closed meanwhile
    readLocation().then((state) => active && setGps(state));
    return () => {
      active = false;
    };
  }, []);

  const retryLocation = () => {
    setGps({ status: 'checking' });
    readLocation().then(setGps);
  };

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
    setCheckIn({ checkInAt, location: gps.status === 'captured' ? gps.location : null, selfieUri });
    router.push('/(salesman)/meeting-details');
  };

  const gpsText =
    gps.status === 'captured'
      ? `Location captured (±${Math.round(gps.location.accuracy ?? 0)} m)`
      : gps.status === 'checking'
        ? 'Getting your location...'
        : gps.status === 'denied'
          ? 'Location permission denied'
          : 'Could not get location (GPS off?)';
  const gpsOk = gps.status === 'captured';

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
        <MapCard height={190} />

        {/* Verification Checklist */}
        <View style={[styles.checklistCard, { backgroundColor: theme.colors.surface }]}>
          <CheckRow ok={gpsOk} text={gpsText} />
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
          disabled={gps.status === 'checking'}
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
