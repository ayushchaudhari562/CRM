import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Phone, LogOut, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../../src/theme';
import { useAppStore } from '../../../src/store';
import { Card, Button } from '../../../src/components';

export default function SalesmanProfileTab() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, isPunchedIn, punchInTime, togglePunchIn, setIsLoggedIn, setRole } = useAppStore();

  const handleLogout = () => {
    setIsLoggedIn(false);
    router.replace('/(salesman)/login');
  };

  const handleSwitchToAdmin = () => {
    setRole('admin');
    router.push('/(admin)/(tabs)');
  };

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

      {/* Dev Switch to Admin */}
      <Card surface="surface2" style={styles.devCard}>
        <Text style={[styles.devTitle, { color: theme.colors.muted }]}>DEVELOPER PORTAL</Text>
        <Button
          title="Switch to Admin Portal"
          onPress={handleSwitchToAdmin}
          variant="secondary"
          size="compact"
        />
      </Card>

      <View style={{ flex: 1 }} />

      <Button
        title="Sign Out"
        onPress={handleLogout}
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
    fontFamily: 'Inter',
    fontSize: 26,
    fontWeight: '600',
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
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '600',
  },
  userRole: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '500',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  userPhone: {
    fontFamily: 'Inter',
    fontSize: 12,
  },
  attendanceCard: {
    gap: 14,
  },
  attendanceHeader: {
    gap: 2,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionSub: {
    fontFamily: 'Inter',
    fontSize: 13,
  },
  devCard: {
    padding: 16,
    gap: 10,
    borderRadius: 18,
  },
  devTitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

