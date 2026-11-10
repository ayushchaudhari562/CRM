import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Sliders, Wifi, WifiOff } from 'lucide-react-native';
import { useAppStore } from '../store';
import { useTheme } from '../theme';

export const DevBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { role, setRole, offlineMode, toggleOffline } = useAppStore();
  const { theme, setThemeVariant } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const screens = [
    { label: '01 Login', path: '/(salesman)/login', role: 'salesman' as const },
    { label: '02 Home', path: '/(salesman)/(tabs)', role: 'salesman' as const },
    { label: '03 Check-in', path: '/(salesman)/checkin', role: 'salesman' as const },
    { label: '04 Details', path: '/(salesman)/meeting-details', role: 'salesman' as const },
    { label: '05 Saved', path: '/(salesman)/meeting-saved', role: 'salesman' as const },
    { label: 'Visits List', path: '/(salesman)/(tabs)/visits', role: 'salesman' as const },
    { label: '06 Admin Home', path: '/(admin)/(tabs)', role: 'admin' as const },
    { label: '07 Live Mon', path: '/(admin)/(tabs)/monitoring', role: 'admin' as const },
    { label: '08 Report', path: '/(admin)/report/m-3', role: 'admin' as const },
    { label: '09 Web Bento', path: '/(admin)/bento', role: 'admin' as const, isRed: true },
  ];

  const handleNavigate = (s: (typeof screens)[0]) => {
    setRole(s.role);
    if (s.isRed) {
      setThemeVariant('red');
    } else {
      setThemeVariant('green');
    }
    router.push(s.path as any);
  };

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.bar,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <Pressable
          onPress={() => setExpanded(!expanded)}
          style={styles.expandBtn}
          accessibilityRole="button"
          accessibilityLabel="Toggle developer navigation bar"
        >
          <Sliders size={15} color={theme.colors.accent} />
          <Text style={[styles.barTitle, { color: theme.colors.text }]}>DEV</Text>
        </Pressable>

        {/* Quick Role switch */}
        <View style={[styles.roleSwitch, { backgroundColor: theme.colors.surface2 }]}>
          <Pressable
            onPress={() => {
              setRole('salesman');
              setThemeVariant('green');
              router.push('/(salesman)/(tabs)');
            }}
            accessibilityRole="button"
            accessibilityLabel="Switch to Salesman role"
            style={[
              styles.roleBtn,
              role === 'salesman' && { backgroundColor: theme.colors.accent },
            ]}
          >
            <Text
              style={[
                styles.roleText,
                { color: role === 'salesman' ? theme.colors.onAccent : theme.colors.muted },
              ]}
            >
              Salesman
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setRole('admin');
              router.push('/(admin)/(tabs)');
            }}
            accessibilityRole="button"
            accessibilityLabel="Switch to Admin role"
            style={[
              styles.roleBtn,
              role === 'admin' && { backgroundColor: theme.colors.accent },
            ]}
          >
            <Text
              style={[
                styles.roleText,
                { color: role === 'admin' ? theme.colors.onAccent : theme.colors.muted },
              ]}
            >
              Admin
            </Text>
          </Pressable>
        </View>

        {/* Offline simulator toggle */}
        <Pressable
          onPress={toggleOffline}
          accessibilityRole="button"
          accessibilityLabel="Toggle simulated offline mode"
          style={[
            styles.offlineBtn,
            {
              backgroundColor: offlineMode ? '#664D28' : theme.colors.surface2,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {offlineMode ? (
            <WifiOff size={14} color="#E5A855" />
          ) : (
            <Wifi size={14} color={theme.colors.muted} />
          )}
        </Pressable>
      </View>

      {/* Expanded Screen Navigator */}
      {expanded && (
        <View
          style={[
            styles.drawer,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.drawerTitle, { color: theme.colors.muted }]}>
            JUMP TO ANY SCREEN (1-9):
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {screens.map((s, idx) => {
              const isActive = pathname === s.path;
              return (
                <Pressable
                  key={idx}
                  onPress={() => handleNavigate(s)}
                  style={[
                    styles.screenChip,
                    {
                      backgroundColor: isActive ? theme.colors.accent : theme.colors.surface2,
                      borderColor: isActive ? theme.colors.accent : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isActive ? theme.colors.onAccent : theme.colors.text },
                    ]}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    zIndex: 1000,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  barTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
  },
  roleSwitch: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 2,
    gap: 2,
  },
  roleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  roleText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
  },
  offlineBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawer: {
    padding: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  drawerTitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  chipsScroll: {
    gap: 8,
  },
  screenChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
  },
});

