import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, CheckCircle2 } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../src/theme';
import { useAppStore } from '../../../src/store';
import { Button, TickRing, LoadingView, ErrorView } from '../../../src/components';
import { crmService } from '../../../src/services';
import type { Reminder } from '../../../src/types';

export default function SalesmanHomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, isPunchedIn, punchInTime, togglePunchIn } = useAppStore();

  const {
    data: reminders,
    isLoading: loadingReminders,
    error: remindersError,
    refetch: refetchReminders,
  } = useQuery<Reminder[]>({
    queryKey: ['reminders', user.id],
    queryFn: () => crmService.getReminders(user.id),
  });

  const {
    data: meetings,
    isLoading: loadingMeetings,
    error: meetingsError,
    refetch: refetchMeetings,
  } = useQuery({
    queryKey: ['meetings', user.id],
    queryFn: () => crmService.getMeetings(user.id),
  });

  if (loadingReminders && loadingMeetings) {
    return <LoadingView message="Loading today's plan..." />;
  }

  if (remindersError || meetingsError) {
    return (
      <ErrorView
        message="Could not load your visits plan"
        onRetry={() => {
          refetchReminders();
          refetchMeetings();
        }}
      />
    );
  }

  // Calculate visits done (e.g. 3 done out of 8 target)
  const visitsDone = meetings?.length ? Math.min(meetings.length, 3) : 3;
  const visitsTarget = 8;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topSection}>
        {/* Date and Punch in row */}
        <View style={styles.dateRow}>
          <Text style={[styles.dateText, { color: theme.colors.muted }]}>
            Tuesday, 10 Nov
          </Text>
          <Pressable
            onPress={togglePunchIn}
            accessibilityRole="button"
            accessibilityLabel={isPunchedIn ? 'Punched in' : 'Punch in'}
            style={[
              styles.punchInBtn,
              {
                borderColor: isPunchedIn ? theme.colors.accent : theme.colors.border,
                backgroundColor: isPunchedIn ? theme.colors.accentSoftBg : 'transparent',
              },
            ]}
          >
            {isPunchedIn ? (
              <View style={styles.punchInActiveRow}>
                <CheckCircle2 size={14} color={theme.colors.accent} />
                <Text style={[styles.punchInText, { color: theme.colors.accent }]}>
                  {punchInTime ? `Punched in ${punchInTime}` : 'Punched in'}
                </Text>
              </View>
            ) : (
              <Text style={[styles.punchInText, { color: theme.colors.text }]}>
                Punch in
              </Text>
            )}
          </Pressable>
        </View>

        {/* Heading */}
        <View style={styles.headingWrapper}>
          <Text style={[styles.heading, { color: theme.colors.text }]}>
            Good morning,{'\n'}Today&apos;s plan
          </Text>
        </View>

        {/* Radial Tick Ring */}
        <View style={styles.ringWrapper}>
          <TickRing
            value={`${visitsDone}/${visitsTarget}`}
            label="Visits done"
            activeCount={visitsDone}
            totalCount={visitsTarget}
            size={220}
          />
        </View>
      </View>

      {/* Bottom Sheet Card */}
      <View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radius.sheet,
            borderTopRightRadius: theme.radius.sheet,
          },
        ]}
      >
        {/* Main CTA */}
        <Button
          title="Start new meeting"
          onPress={() => router.push('/(salesman)/checkin')}
          variant="primary"
          size="hero"
          icon={<MapPin size={22} color={theme.colors.onAccent} />}
        />

        {/* Follow-ups Due Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Follow-ups due today
          </Text>
        </View>

        <View style={styles.followupsList}>
          {reminders && reminders.length > 0 ? (
            reminders.map((item) => {
              const initial = item.clientName.replace('Client ', '').trim() || item.clientName.charAt(0);
              return (
                <View key={item.id} style={styles.followupRow}>
                  <View
                    style={[
                      styles.avatarSquare,
                      { backgroundColor: theme.colors.text },
                    ]}
                  >
                    <Text style={[styles.avatarText, { color: theme.colors.bg }]}>
                      {initial}
                    </Text>
                  </View>

                  <View style={styles.clientDetails}>
                    <Text style={[styles.clientName, { color: theme.colors.text }]}>
                      {item.clientName}
                    </Text>
                    <Text style={[styles.clientSub, { color: theme.colors.muted }]}>
                      {item.clientName === 'Client A'
                        ? 'Kirana store · 11:00 AM'
                        : item.clientName === 'Client B'
                        ? 'Hardware shop · 1:30 PM'
                        : 'Pharmacy · 4:00 PM'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: theme.colors.surface2 },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: theme.colors.accent }]}>
                      {item.type}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={{ color: theme.colors.muted, textAlign: 'center', padding: 12 }}>
              No follow-ups due today
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
  punchInBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  punchInActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  punchInText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
  },
  headingWrapper: {
    paddingTop: 14,
  },
  heading: {
    fontFamily: 'Inter',
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 35,
  },
  ringWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 10,
  },
  bottomSheet: {
    padding: 20,
    gap: 16,
    marginTop: 12,
  },
  sectionHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
  },
  followupsList: {
    gap: 14,
  },
  followupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarSquare: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
  },
  clientDetails: {
    flex: 1,
    gap: 2,
  },
  clientName: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
  },
  clientSub: {
    fontFamily: 'Inter',
    fontSize: 12,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  statusText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
  },
});

