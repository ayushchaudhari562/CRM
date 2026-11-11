import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Home, Users, MapPin, BarChart3 } from 'lucide-react-native';
import { BottomTabBar, TabItem } from '../../../src/components/BottomTabBar';

export default function AdminTabsLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs: TabItem[] = [
    {
      id: 'index',
      label: 'Home',
      icon: ({ color, size }) => <Home color={color} size={size} strokeWidth={2} />,
    },
    {
      id: 'monitoring',
      label: 'Team',
      icon: ({ color, size }) => <Users color={color} size={size} strokeWidth={2} />,
    },
    {
      id: 'map',
      label: 'Map',
      icon: ({ color, size }) => <MapPin color={color} size={size} strokeWidth={2} />,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: ({ color, size }) => <BarChart3 color={color} size={size} strokeWidth={2} />,
    },
  ];

  const getActiveTab = () => {
    if (pathname.includes('/monitoring')) return 'monitoring';
    if (pathname.includes('/map')) return 'map';
    if (pathname.includes('/reports')) return 'reports';
    return 'index';
  };

  const handleTabPress = (id: string) => {
    if (id === 'index') router.push('/admin');
    else if (id === 'monitoring') router.push('/admin/monitoring');
    else if (id === 'map') router.push('/admin/map');
    else if (id === 'reports') router.push('/admin/reports');
  };

  return (
    <View style={styles.container}>
      <Tabs
        tabBar={() => (
          <BottomTabBar tabs={tabs} activeTab={getActiveTab()} onTabPress={handleTabPress} />
        )}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="monitoring" />
        <Tabs.Screen name="map" />
        <Tabs.Screen name="reports" />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0C0D',
  },
});
