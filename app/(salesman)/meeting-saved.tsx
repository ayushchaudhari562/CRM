import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useTheme, fonts } from '../../src/theme';
import { Button } from '../../src/components';
import { useAppStore } from '../../src/store';
import { formatDateTime } from '../../src/utils/format';

export default function MeetingSavedScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { lastSavedMeeting } = useAppStore();

  const handleStartNext = () => router.replace('/(salesman)/checkin');

  const handleBackHome = () => {
    router.replace('/(salesman)/(tabs)');
  };

  const next = lastSavedMeeting?.nextVisit;
  const reminderText = next
    ? `Follow-up set for ${formatDateTime(next)}${lastSavedMeeting?.whatsappReminder ? ' (WhatsApp reminder)' : ''}`
    : 'No follow-up set';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.content}>
        {/* Big Check Circle */}
        <View style={[styles.checkCircleLarge, { backgroundColor: theme.colors.accent }]}>
          <Check size={48} color={theme.colors.onAccent} strokeWidth={3} />
        </View>

        {/* Heading */}
        <Text style={[styles.title, { color: theme.colors.text }]}>Meeting saved</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Everything below happens automatically
        </Text>

        {/* Automatic actions list card */}
        <View style={[styles.actionsCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.actionRow}>
            <View style={[styles.actionCheck, { backgroundColor: theme.colors.accentSoftBg }]}>
              <Check size={16} color={theme.colors.accent} strokeWidth={2.5} />
            </View>
            <Text style={[styles.actionText, { color: theme.colors.text }]}>
              Report added to manager portal
            </Text>
          </View>

          <View style={styles.actionRow}>
            <View style={[styles.actionCheck, { backgroundColor: theme.colors.accentSoftBg }]}>
              <Check size={16} color={theme.colors.accent} strokeWidth={2.5} />
            </View>
            <Text style={[styles.actionText, { color: theme.colors.text }]}>{reminderText}</Text>
          </View>

          <View style={styles.actionRow}>
            <View style={[styles.actionCheck, { backgroundColor: theme.colors.accentSoftBg }]}>
              <Check size={16} color={theme.colors.accent} strokeWidth={2.5} />
            </View>
            <Text style={[styles.actionText, { color: theme.colors.text }]}>
              Added to today&apos;s visit count
            </Text>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* CTA Buttons */}
        <View style={styles.ctaGroup}>
          <Button
            title="Start next meeting"
            onPress={handleStartNext}
            variant="primary"
            size="normal"
          />

          <Button title="Back to home" onPress={handleBackHome} variant="outline" size="compact" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 16,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  checkCircleLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 30,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
  },
  actionsCard: {
    borderRadius: 22,
    padding: 18,
    width: '100%',
    gap: 14,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  spacer: {
    flex: 1,
  },
  ctaGroup: {
    width: '100%',
    gap: 12,
  },
});
