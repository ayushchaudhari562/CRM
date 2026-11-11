import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { useTheme, fonts, type Theme } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'white' | 'danger';
export type ButtonSize = 'hero' | 'normal' | 'compact' | 'small';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  fullWidth?: boolean;
}

// Heights from PROMPT.md: 60 main CTA, 52 normal. All sizes stay >= 44 (min touch target).
const HEIGHT: Record<ButtonSize, number> = { hero: 60, normal: 52, compact: 48, small: 44 };
const FONT_SIZE: Record<ButtonSize, number> = { hero: 17, normal: 16, compact: 16, small: 14 };

function variantColors(variant: ButtonVariant, c: Theme['colors']) {
  switch (variant) {
    case 'secondary':
      return { bg: c.surface2, text: c.text, border: c.border };
    case 'outline':
      return { bg: 'transparent', text: c.text, border: c.border };
    case 'white':
      return { bg: c.text, text: c.bg, border: undefined };
    case 'danger':
      return { bg: c.adminRed, text: c.onDanger, border: undefined };
    case 'primary':
    default:
      return { bg: c.accent, text: c.onAccent, border: undefined };
  }
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'normal',
  disabled = false,
  loading = false,
  icon,
  rightIcon,
  style,
  textStyle,
  accessibilityLabel,
  fullWidth = true,
}) => {
  const { theme } = useTheme();
  const height = HEIGHT[size];
  const colors = variantColors(variant, theme.colors);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          borderRadius: height / 2, // pill
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderWidth: colors.border ? 1 : 0,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: fullWidth ? 16 : 20,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.text, { color: colors.text, fontSize: FONT_SIZE[size] }, textStyle]}>
            {title}
          </Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontFamily: fonts.semibold,
    letterSpacing: 0.1,
  },
});
