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
import { useTheme } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'white' | 'danger';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'normal' | 'hero' | 'compact' | 'small';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  fullWidth?: boolean;
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

  const getHeight = () => {
    switch (size) {
      case 'hero':
        return 60;
      case 'compact':
        return 48;
      case 'small':
        return 44;
      case 'normal':
      default:
        return 52;
    }
  };

  const height = getHeight();
  const borderRadius = height / 2;

  let bg = theme.colors.accent;
  let textColor = theme.colors.onAccent;
  let borderColor = 'transparent';
  let borderWidth = 0;

  if (variant === 'primary') {
    bg = theme.colors.accent;
    textColor = theme.colors.onAccent;
  } else if (variant === 'secondary') {
    bg = theme.colors.surface2;
    textColor = theme.colors.text;
    borderColor = theme.colors.border;
    borderWidth = 1;
  } else if (variant === 'outline') {
    bg = 'transparent';
    textColor = theme.colors.text;
    borderColor = theme.colors.border;
    borderWidth = 1;
  } else if (variant === 'white') {
    bg = theme.colors.text;
    textColor = theme.colors.bg;
  } else if (variant === 'danger') {
    bg = theme.colors.adminRed;
    textColor = '#FFFFFF';
  }

  const fontSize = size === 'hero' ? 17 : size === 'small' ? 14 : 16;
  const fontWeight = size === 'hero' ? '600' : '600';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          borderRadius,
          backgroundColor: bg,
          borderColor,
          borderWidth,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: fullWidth ? 16 : 20,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
          <Text
            style={[
              styles.text,
              {
                color: textColor,
                fontSize,
                fontWeight,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {rightIcon ? <View style={styles.rightIconWrapper}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Inter',
    letterSpacing: 0.1,
  },
});

