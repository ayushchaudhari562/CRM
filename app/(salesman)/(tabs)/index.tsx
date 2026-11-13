import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, ChevronRight, Calendar } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme, fonts } from '../../../src/theme';
import {
  Button,
  TickRing,
  LoadingView,
  ErrorView,
  SegmentedControl,
} from '../../../src/components';
import { crmService } from '../../../src/services';
import {
  formatClock,
  formatDay,
  formatDuration,
  formatINR,
  formatTime,
  greeting,
  initialOf,
} from '../../../src/utils/format';
import { usePunch, useWorkedMs } from '../../../src/utils/shift';

type Tab = 'today' | 'followups';

export default function SalesmanHomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();

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
  const { data: todayRoute } = useQuery({
    queryKey: ['weekly-plan', 'today'],
    queryFn: () => crmService.getWeeklyPlan(),
  });

  const punch = usePunch();
  const workedMs = useWorkedMs(home);

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
            style={({ pressed }) => [
              styles.punchInBtn,
              { opacity: pressed || punch.isPending ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.punchInText, { color: theme.colors.accent }]}>
              {isPunchedIn ? `Punched in ${formatTime(home.punchedInAt!)}` : 'Punch in'}
            </Text>
            {isPunchedIn ? (
              <Text style={[styles.shiftTime, { color: theme.colors.accent }]}>
                {formatClock(workedMs)}
              </Text>
            ) : workedMs > 0 ? (
              <Text style={[styles.shiftTime, { color: theme.colors.muted }]}>
                Total {formatDuration(workedMs)}
              </Text>
            ) : null}
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

        {todayRoute?.stops && todayRoute.stops.length > 0 ? (
          <Pressable
            onPress={() => router.push('/(salesman)/(tabs)/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open today's route plan"
            style={({ pressed }) => [
              styles.routeBanner,
              {
                backgroundColor: theme.colors.surface2,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Calendar size={18} color={theme.colors.accent} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.routeBannerTitle, { color: theme.colors.text }]}>
                Today&apos;s Planned Route
              </Text>
              <Text style={[styles.routeBannerSub, { color: theme.colors.muted }]}>
                {todayRoute.stops.filter((s) => s.status === 'VISITED').length} of {todayRoute.stops.length} stops visited
              </Text>
            </View>
            <ChevronRight size={16} color={theme.colors.muted} />
          </Pressable>
        ) : null}

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
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  shiftTime: {
    fontFamily: fonts.medium,
    fontSize: 12,
    marginTop: 2,
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
  routeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  routeBannerTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  routeBannerSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
});
