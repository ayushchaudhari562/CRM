import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme, fonts } from '../../../src/theme';
import {
  Button,
  TickRing,
  LoadingView,
  ErrorView,
  SegmentedControl,
} from '../../../src/components';
import { crmService } from '../../../src/services';
import { formatDay, formatINR, formatTime, greeting, initialOf } from '../../../src/utils/format';

type Tab = 'today' | 'followups';

export default function SalesmanHomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const {
    data: home,
    isLoading,
    error,
    refetch,
  } = useQuery({ queryKey: ['home'], queryFn: crmService.getHome });
  const [tab, setTab] = useState<Tab>('today');
  // Same cache as the Visits tab "Today" filter; refreshed after a meeting is saved.
  const { data: todayVisits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ['meetings', 'today'],
    queryFn: () => crmService.getMeetings('today'),
  });

  const punch = useMutation({
    mutationFn: crmService.togglePunch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home'] }),
  });

  if (isLoading) return <LoadingView message="Loading today's plan..." />;
  if (error || !home) {
    return (
      <ErrorView message={error?.message ?? 'Could not load your plan'} onRetry={() => refetch()} />
    );
  }

  const isPunchedIn = !!home.punchedInAt;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topSection}>
        {/* Date and Punch in row */}
        <View style={styles.dateRow}>
          <Text style={[styles.dateText, { color: theme.colors.muted }]}>{formatDay()}</Text>
          <Pressable
            onPress={() => punch.mutate()}
            disabled={punch.isPending}
            accessibilityRole="button"
            accessibilityLabel={isPunchedIn ? 'Punch out' : 'Punch in'}
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
                  Punched in {formatTime(home.punchedInAt!)}
                </Text>
              </View>
            ) : (
              <Text style={[styles.punchInText, { color: theme.colors.text }]}>Punch in</Text>
            )}
          </Pressable>
        </View>

        {/* Heading */}
        <View style={styles.headingWrapper}>
          <Text style={[styles.heading, { color: theme.colors.text }]}>
            {greeting()},{'\n'}Today&apos;s plan
          </Text>
        </View>

        {/* Radial Tick Ring */}
        <View style={styles.ringWrapper}>
          <TickRing
            value={
              home.visitsTarget ? `${home.visitsDone}/${home.visitsTarget}` : `${home.visitsDone}`
            }
            label={home.visitsTarget ? 'Visits done' : 'Visits today'}
            activeCount={home.visitsDone}
            totalCount={home.visitsTarget || 10} // no target yet: ring fills toward 10
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

        <SegmentedControl<Tab>
          options={[
            { value: 'today', label: `Today (${home.visitsDone})` },
            { value: 'followups', label: `Follow-ups (${home.followUpsToday.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />

        <View style={styles.followupsList}>
          {tab === 'today' ? (
            visitsLoading ? (
              <Text style={[styles.empty, { color: theme.colors.muted }]}>Loading...</Text>
            ) : todayVisits.length > 0 ? (
              todayVisits.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => router.push(`/(salesman)/client/${m.clientId}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.clientName}, ${m.outcome} at ${formatTime(m.checkInAt)}. Open client details`}
                  style={({ pressed }) => [styles.followupRow, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[styles.avatarSquare, { backgroundColor: theme.colors.text }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.bg }]}>
                      {initialOf(m.clientName)}
                    </Text>
                  </View>
                  <View style={styles.clientDetails}>
                    <Text
                      style={[styles.clientName, { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      {m.clientName}
                    </Text>
                    <Text
                      style={[styles.clientSub, { color: theme.colors.muted }]}
                      numberOfLines={1}
                    >
                      {m.businessType} · {formatTime(m.checkInAt)}
                      {m.dealValue > 0 ? ` · ${formatINR(m.dealValue)}` : ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          m.outcome === 'Closed'
                            ? theme.colors.accentSoftBg
                            : theme.colors.surface2,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            m.outcome === 'Closed'
                              ? theme.colors.accent
                              : m.outcome === 'Interested'
                                ? theme.colors.text
                                : theme.colors.muted,
                        },
                      ]}
                    >
                      {m.outcome}
                    </Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <Text style={[styles.empty, { color: theme.colors.muted }]}>
                No visits yet today. Tap Start new meeting.
              </Text>
            )
          ) : home.followUpsToday.length > 0 ? (
            home.followUpsToday.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/(salesman)/client/${item.clientId}`)}
                accessibilityRole="button"
                accessibilityLabel={`${item.clientName}, ${item.type} at ${formatTime(item.dueAt)}. Open client details`}
                style={({ pressed }) => [styles.followupRow, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.avatarSquare, { backgroundColor: theme.colors.text }]}>
                  <Text style={[styles.avatarText, { color: theme.colors.bg }]}>
                    {initialOf(item.clientName)}
                  </Text>
                </View>

                <View style={styles.clientDetails}>
                  <Text style={[styles.clientName, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.clientName}
                  </Text>
                  <Text style={[styles.clientSub, { color: theme.colors.muted }]} numberOfLines={1}>
                    {item.businessType} · {formatTime(item.dueAt)}
                  </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: theme.colors.surface2 }]}>
                  <Text style={[styles.statusText, { color: theme.colors.accent }]}>
                    {item.type}
                  </Text>
                </View>
                <ChevronRight size={16} color={theme.colors.muted} />
              </Pressable>
            ))
          ) : (
            <Text style={[styles.empty, { color: theme.colors.muted }]}>
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
    fontFamily: fonts.regular,
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
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  headingWrapper: {
    paddingTop: 14,
  },
  heading: {
    fontFamily: fonts.semibold,
    fontSize: 30,
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
  empty: {
    fontFamily: fonts.regular,
    textAlign: 'center',
    padding: 12,
  },
  followupsList: {
    gap: 14,
  },
  followupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  avatarSquare: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  clientDetails: {
    flex: 1,
    gap: 2,
  },
  clientName: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  clientSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  statusText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
});
