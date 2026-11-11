import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter, usePathname, type Href } from 'expo-router';
import { Sliders, Wifi, WifiOff } from 'lucide-react-native';
import { useAppStore } from '../store';
import type { Role } from '../types';
import { useTheme, fonts } from '../theme';

export const DevBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { role, setRole, setIsLoggedIn, offlineMode, toggleOffline } = useAppStore();
  const { theme, setThemeVariant } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const screens = [
    { label: '01 Login', path: '/login' as Href, role: 'salesman' as const },
    { label: '02 Home', path: '/(salesman)/(tabs)' as Href, role: 'salesman' as const },
    { label: '03 Check-in', path: '/(salesman)/checkin' as Href, role: 'salesman' as const },
    { label: '04 Details', path: '/(salesman)/meeting-details' as Href, role: 'salesman' as const },
    { label: '05 Saved', path: '/(salesman)/meeting-saved' as Href, role: 'salesman' as const },
    { label: 'Visits List', path: '/(salesman)/(tabs)/visits' as Href, role: 'salesman' as const },
    { label: '06 Admin Home', path: '/admin' as Href, role: 'admin' as const },
    { label: '07 Live Mon', path: '/admin/monitoring' as Href, role: 'admin' as const },
    { label: '08 Report', path: '/admin/report/m-3' as Href, role: 'admin' as const },
    { label: '09 Web Bento', path: '/admin/bento' as Href, role: 'admin' as const, isRed: true },
  ];

  // Dev only: fake a login as `nextRole`, then open `path`.
  // Navigation waits one tick so the route guards in app/_layout.tsx see the new state first.
  const openAs = (nextRole: Role, path: Href, red = false) => {
    const isLogin = path === '/login';
    setRole(nextRole);
    setIsLoggedIn(!isLogin);
    setThemeVariant(red ? 'red' : 'green');
    setTimeout(() => router.push(path), 0);
  };

  const handleNavigate = (s: (typeof screens)[0]) => openAs(s.role, s.path, s.isRed);

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
            onPress={() => openAs('salesman', '/(salesman)/(tabs)')}
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
            onPress={() => openAs('admin', '/admin')}
            accessibilityRole="button"
            accessibilityLabel="Switch to Admin role"
            style={[styles.roleBtn, role === 'admin' && { backgroundColor: theme.colors.accent }]}
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
    fontFamily: fonts.semibold,
    fontSize: 12,
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
    fontFamily: fonts.semibold,
    fontSize: 12,
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
    fontFamily: fonts.semibold,
    fontSize: 11,
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
    fontFamily: fonts.medium,
    fontSize: 12,
  },
});
