import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useTheme } from '../theme';

export interface OfflineBannerProps {
  visible?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ visible = true }) => {
  const { theme } = useTheme();

  if (!visible) return null;

  return (
    <View style={[styles.banner, { backgroundColor: '#2A2015', borderColor: '#664D28' }]}>
      <WifiOff size={16} color="#E5A855" />
      <Text style={[styles.text, { color: '#E5A855' }]}>
        Offline mode · Changes will sync when connected
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 1,
    zIndex: 999,
  },
  text: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
  },
});

