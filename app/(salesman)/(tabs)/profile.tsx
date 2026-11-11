import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Phone, LogOut } from 'lucide-react-native';
import { useTheme, fonts } from '../../../src/theme';
import { useAppStore } from '../../../src/store';
import { Card, Button } from '../../../src/components';

export default function SalesmanProfileTab() {
  const { theme } = useTheme();
  const { user, isPunchedIn, punchInTime, togglePunchIn, logout } = useAppStore();


  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Profile</Text>
      </View>

      {/* User Info Card */}
      <Card surface="surface" style={styles.userCard}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.surface2 }]}>
          <Text style={[styles.avatarText, { color: theme.colors.text }]}>
            {user.initials}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.colors.text }]}>{user.name}</Text>
          <Text style={[styles.userRole, { color: theme.colors.accent }]}>Field Sales Representative</Text>
          <View style={styles.phoneRow}>
            <Phone size={13} color={theme.colors.muted} />
            <Text style={[styles.userPhone, { color: theme.colors.muted }]}>
              {user.phone || '+91 98765 43210'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Attendance / Punch Card */}
      <Card surface="surface" style={styles.attendanceCard}>
        <View style={styles.attendanceHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Daily Attendance
          </Text>
          <Text style={[styles.sectionSub, { color: theme.colors.muted }]}>
            {isPunchedIn
              ? `Active shift since ${punchInTime || '09:00 AM'}`
              : 'Shift not started'}
          </Text>
        </View>

        <Button
          title={isPunchedIn ? 'Punch Out' : 'Punch In Now'}
          onPress={togglePunchIn}
          variant={isPunchedIn ? 'outline' : 'primary'}
          size="normal"
        />
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

const styles = StyleSheet.create({
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

