import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  count?: number | string;
}

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

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel || label}
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
      <Text
        style={[
          styles.text,
          {
            color: selected ? theme.colors.onAccent : theme.colors.text,
          },
          textStyle,
        ]}
      >
        {label}
        {count !== undefined ? (
          <Text
            style={{
              color: selected ? theme.colors.onAccent : theme.colors.accent,
              fontWeight: '600',
            }}
          >
            {' '}{count}
          </Text>
        ) : null}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
  },
});

