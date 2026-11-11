import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useTheme, fonts } from '../theme';

export interface OfflineBannerProps {
  visible?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ visible = true }) => {
  const { theme } = useTheme();

  if (!visible) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        { backgroundColor: theme.colors.warningBg, borderColor: theme.colors.warningBorder },
      ]}
    >
      <WifiOff size={16} color={theme.colors.warning} />
      <Text style={[styles.text, { color: theme.colors.warning }]}>
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
    fontFamily: fonts.medium,
    fontSize: 12,
  },
});
