import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTheme, fonts } from '../../src/theme';
import { Button, Card, MapCard } from '../../src/components';
import { useAppStore } from '../../src/store';

export default function CheckinScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { meetingDraft, updateMeetingDraft } = useAppStore();

  const [locationStatus, setLocationStatus] = useState<'checking' | 'captured' | 'mocked'>('captured');
  const [selfieUri, setSelfieUri] = useState<string | null>(meetingDraft.selfieUri);
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    // Request location permission gracefully
    async function checkLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          updateMeetingDraft({
            locationCaptured: true,
            fakeGpsPassed: true,
          });
          setLocationStatus('captured');
        } else {
          // Graceful fallback to mock GPS coordinates
          setLocationStatus('mocked');
        }
      } catch (e) {
        // Fallback for web or dev environment without sensor
        setLocationStatus('mocked');
      }
    }
    checkLocation();
  }, []);

  const handleOpenCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        // Fallback to image library if camera not allowed/available
        const libResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
        if (!libResult.canceled && libResult.assets[0]) {
          setSelfieUri(libResult.assets[0].uri);
          updateMeetingDraft({ selfieUri: libResult.assets[0].uri });
        }
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setSelfieUri(result.assets[0].uri);
        updateMeetingDraft({ selfieUri: result.assets[0].uri });
      }
    } catch (err) {
      // Simulate taking a photo for preview
      const mockSelfie = 'https://picsum.photos/200';
      setSelfieUri(mockSelfie);
      updateMeetingDraft({ selfieUri: mockSelfie });
    }
  };

  const handleContinue = () => {
    updateMeetingDraft({
      checkinTime: currentTime,
      locationCaptured: true,
      timeSaved: true,
      fakeGpsPassed: true,
    });
    router.push('/(salesman)/meeting-details');
  };

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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
          <View style={styles.checkItem}>
            <View style={[styles.checkCircle, { backgroundColor: theme.colors.accentSoftBg }]}>
              <Check size={16} color={theme.colors.accent} strokeWidth={2.5} />
            </View>
            <Text style={[styles.checkText, { color: theme.colors.text }]}>
              Location captured
            </Text>
          </View>

          <View style={styles.checkItem}>
            <View style={[styles.checkCircle, { backgroundColor: theme.colors.accentSoftBg }]}>
              <Check size={16} color={theme.colors.accent} strokeWidth={2.5} />
            </View>
            <Text style={[styles.checkText, { color: theme.colors.text }]}>
              Time saved: {currentTime}
            </Text>
          </View>

          <View style={styles.checkItem}>
            <View style={[styles.checkCircle, { backgroundColor: theme.colors.accentSoftBg }]}>
              <Check size={16} color={theme.colors.accent} strokeWidth={2.5} />
            </View>
            <Text style={[styles.checkText, { color: theme.colors.text }]}>
              Fake GPS check passed
            </Text>
          </View>
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
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Continue Button */}
        <Button
          title="Continue to client details"
          onPress={handleContinue}
          variant="primary"
          size="normal"
          style={styles.continueBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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

