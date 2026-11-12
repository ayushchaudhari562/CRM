import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Phone, LogOut } from 'lucide-react-native';
import { useTheme, fonts } from '../../../src/theme';
import { useAppStore } from '../../../src/store';
import { Card, Button, Field } from '../../../src/components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crmService } from '../../../src/services';
import { formatTime } from '../../../src/utils/format';

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
  if (!user) return null; // route guard redirects to login
  const isPunchedIn = !!home?.punchedInAt;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
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

      <TargetCard />

      <View style={{ flex: 1 }} />

      <Button
        title="Sign Out"
        onPress={logout}
        variant="outline"
        size="compact"
        icon={<LogOut size={16} color={theme.colors.muted} />}
      />
    </ScrollView>
  );
}

/** Today's target: the salesman sets it, and sees progress against it. */
function TargetCard() {
  const { theme } = useTheme();
  const qc = useQueryClient();
  const { data: targets } = useQuery({
    queryKey: ['my-targets', 1],
    queryFn: () => crmService.getMyTargets(1),
  });
  const today = targets?.[0];
  const [editing, setEditing] = useState(false);
  const [visits, setVisits] = useState('');
  const save = useMutation({
    mutationFn: crmService.setMyTarget,
    onSuccess: () => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['my-targets'] });
      qc.invalidateQueries({ queryKey: ['home'] });
    },
  });
  const hasTarget = !!today && today.visitsTarget > 0;
  const visitsNum = Number(visits || 0);
  const invalid = !Number.isInteger(visitsNum) || visitsNum < 1 || visitsNum > 100;

  const startEdit = () => {
    setVisits(today?.visitsTarget ? String(today.visitsTarget) : '');
    save.reset();
    setEditing(true);
  };

  return (
    <Card surface="surface" style={styles.attendanceCard}>
      <View style={styles.targetText}>
        <View style={styles.attendanceHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Today&apos;s target
          </Text>
          <Text style={[styles.sectionSub, { color: theme.colors.muted }]}>
            How much you plan to do today
          </Text>
        </View>
        {today && !editing ? (
          <Button
            title={hasTarget ? 'Edit' : 'Set'}
            onPress={startEdit}
            variant="outline"
            size="compact"
          />
        ) : null}
      </View>

      {!today ? (
        <Text style={[styles.sectionSub, { color: theme.colors.muted }]}>Loading...</Text>
      ) : editing ? (
        <>
          <Field
            label="Visits"
            value={visits}
            onChangeText={(t) => setVisits(t.replace(/\D/g, ''))}
            keyboardType="number-pad"
            placeholder="e.g. 8"
            maxLength={3}
            error={save.error?.message}
          />
          <View style={styles.editRow}>
            <View style={{ flex: 1 }}>
              <Button
                title="Cancel"
                onPress={() => setEditing(false)}
                variant="outline"
                size="normal"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Save"
                onPress={() => save.mutate({ visitsTarget: visitsNum })}
                loading={save.isPending}
                disabled={invalid}
                variant="primary"
                size="normal"
              />
            </View>
          </View>
        </>
      ) : !hasTarget ? (
        <Text style={[styles.sectionSub, { color: theme.colors.muted }]}>
          No target for today. Tap Set.
        </Text>
      ) : (
        <TargetRow
          label="Visits"
          done={`${today.visitsDone}`}
          target={`${today.visitsTarget}`}
          ratio={today.visitsDone / today.visitsTarget}
        />
      )}
    </Card>
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
  editRow: {
    flexDirection: 'row',
    gap: 12,
  },
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
    flexGrow: 1,
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
