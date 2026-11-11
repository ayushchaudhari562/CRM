import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme, fonts, minTouch } from '../theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  count?: number | string;
}

// Pill used for filters and multi-select (product chips, Today/Week/All).
export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  style,
  textStyle,
  accessibilityLabel,
  count,
}) => {
  const { theme } = useTheme();
  const textColor = selected ? theme.colors.onAccent : theme.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? (count !== undefined ? `${label} ${count}` : label)}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: theme.radius.chip,
          backgroundColor: selected ? theme.colors.accent : theme.colors.surface2,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: textColor }, textStyle]}>
        {label}
        {count !== undefined ? (
          <Text style={[styles.count, { color: selected ? textColor : theme.colors.accent }]}>
            {` ${count}`}
          </Text>
        ) : null}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    minHeight: minTouch,
    paddingHorizontal: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  count: {
    fontFamily: fonts.semibold,
  },
});
