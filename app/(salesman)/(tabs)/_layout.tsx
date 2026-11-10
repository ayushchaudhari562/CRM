import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Home, ListFilter, MapPin, User } from 'lucide-react-native';
import { BottomTabBar, TabItem } from '../../../src/components/BottomTabBar';

export default function SalesmanTabsLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs: TabItem[] = [
    {
      id: 'index',
      label: 'Home',
      icon: ({ color, size }) => <Home color={color} size={size} strokeWidth={2} />,
    },
    {
      id: 'visits',
      label: 'Visits',
      icon: ({ color, size }) => <ListFilter color={color} size={size} strokeWidth={2} />,
    },
    {
      id: 'map',
      label: 'Map',
      icon: ({ color, size }) => <MapPin color={color} size={size} strokeWidth={2} />,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: ({ color, size }) => <User color={color} size={size} strokeWidth={2} />,
    },
  ];

  // Derive active tab from pathname
  const getActiveTab = () => {
    if (pathname.includes('/visits')) return 'visits';
    if (pathname.includes('/map')) return 'map';
    if (pathname.includes('/profile')) return 'profile';
    return 'index';
  };

  const handleTabPress = (id: string) => {
    if (id === 'index') router.push('/(salesman)/(tabs)');
    else if (id === 'visits') router.push('/(salesman)/(tabs)/visits');
    else if (id === 'map') router.push('/(salesman)/(tabs)/map');
    else if (id === 'profile') router.push('/(salesman)/(tabs)/profile');
  };

  return (
    <View style={styles.container}>
      <Tabs
        tabBar={() => (
          <BottomTabBar
            tabs={tabs}
            activeTab={getActiveTab()}
            onTabPress={handleTabPress}
          />
        )}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="visits" />
        <Tabs.Screen name="map" />
        <Tabs.Screen name="profile" />
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
