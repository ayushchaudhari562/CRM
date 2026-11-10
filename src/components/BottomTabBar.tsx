import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

export interface TabItem {
  id: string;
  label: string;
  icon: (props: { color: string; size: number }) => React.ReactNode;
}

export interface BottomTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (id: string) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: '#111213',
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const color = isActive ? theme.colors.accent : theme.colors.muted;

        return (
          <Pressable
            key={tab.id}
            onPress={() => onTabPress(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            style={styles.tabButton}
          >
            {tab.icon({ color, size: 22 })}
            <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 24,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
  },
});

