import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Phone, LogOut } from 'lucide-react-native';
import { useTheme, fonts } from '../../../src/theme';
import { useAppStore } from '../../../src/store';
import { Card, Button } from '../../../src/components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crmService } from '../../../src/services';
import { formatINR, formatTime } from '../../../src/utils/format';

export default function SalesmanProfileTab() {
  const { theme } = useTheme();
  const { user, logout } = useAppStore();
  const qc = useQueryClient();
  // Punch state lives on the server (same query as the home screen).
  const { data: home } = useQuery({ queryKey: ['home'], queryFn: crmService.getHome });
  const punch = useMutation({
    mutationFn: crmService.togglePunch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home'] }),
  });
  // Today's target (set by the manager) vs. what I have done.
  const { data: targets } = useQuery({
    queryKey: ['my-targets', 1],
    queryFn: () => crmService.getMyTargets(1),
  });
  const today = targets?.[0];
  if (!user) return null; // route guard redirects to login
  const isPunchedIn = !!home?.punchedInAt;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Profile</Text>
      </View>

      {/* User Info Card */}
      <Card surface="surface" style={styles.userCard}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.surface2 }]}>
          <Text style={[styles.avatarText, { color: theme.colors.text }]}>{user.initials}</Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.colors.text }]}>{user.name}</Text>
          <Text style={[styles.userRole, { color: theme.colors.accent }]}>
            Field Sales Representative
          </Text>
          <View style={styles.phoneRow}>
            <Phone size={13} color={theme.colors.muted} />
            <Text style={[styles.userPhone, { color: theme.colors.muted }]}>{user.phone}</Text>
          </View>
        </View>
      </Card>

      {/* Attendance / Punch Card */}
      <Card surface="surface" style={styles.attendanceCard}>
        <View style={styles.attendanceHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Daily Attendance</Text>
          <Text style={[styles.sectionSub, { color: theme.colors.muted }]}>
            {isPunchedIn
              ? `Active shift since ${formatTime(home!.punchedInAt!)}`
              : 'Shift not started'}
          </Text>
        </View>

        <Button
          title={isPunchedIn ? 'Punch Out' : 'Punch In Now'}
          onPress={() => punch.mutate()}
          loading={punch.isPending}
          disabled={!home}
          variant={isPunchedIn ? 'outline' : 'primary'}
          size="normal"
        />
      </Card>

      {/* Today's target */}
      <Card surface="surface" style={styles.attendanceCard}>
        <View style={styles.attendanceHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Today&apos;s target
          </Text>
          <Text style={[styles.sectionSub, { color: theme.colors.muted }]}>
            Set by your manager
          </Text>
        </View>
        {!today ? (
          <Text style={[styles.sectionSub, { color: theme.colors.muted }]}>Loading...</Text>
        ) : today.visitsTarget === 0 && today.dealValueTarget == null ? (
          <Text style={[styles.sectionSub, { color: theme.colors.muted }]}>
            No target set for today
          </Text>
        ) : (
          <>
            {today.visitsTarget > 0 ? (
              <TargetRow
                label="Visits"
                done={`${today.visitsDone}`}
                target={`${today.visitsTarget}`}
                ratio={today.visitsDone / today.visitsTarget}
              />
            ) : null}
            {today.dealValueTarget ? (
              <TargetRow
                label="Deals closed"
                done={formatINR(today.dealValue)}
                target={formatINR(today.dealValueTarget)}
                ratio={today.dealValue / today.dealValueTarget}
              />
            ) : null}
          </>
        )}
      </Card>

      <View style={{ flex: 1 }} />

      <Button
        title="Sign Out"
        onPress={logout}
        variant="outline"
        size="compact"
        icon={<LogOut size={16} color={theme.colors.muted} />}
      />
    </View>
  );
}

function TargetRow({
  label,
  done,
  target,
  ratio,
}: {
  label: string;
  done: string;
  target: string;
  ratio: number;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.targetRow}>
      <View style={styles.targetText}>
        <Text style={[styles.sectionSub, { color: theme.colors.muted }]}>{label}</Text>
        <Text style={[styles.targetValue, { color: theme.colors.text }]}>
          {done} <Text style={{ color: theme.colors.muted }}>/ {target}</Text>
        </Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: theme.colors.surface2 }]}>
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: theme.colors.accent,
              width: `${Math.round(Math.min(1, ratio) * 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  targetRow: {
    gap: 6,
  },
  targetText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  targetValue: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  container: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 26,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.semibold,
    fontSize: 20,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontFamily: fonts.semibold,
    fontSize: 17,
  },
  userRole: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  userPhone: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  attendanceCard: {
    gap: 14,
  },
  attendanceHeader: {
    gap: 2,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  sectionSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
});
