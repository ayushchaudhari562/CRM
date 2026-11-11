import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme, fonts } from '../theme';

interface CustomTextProps extends TextProps {
  color?: string;
  center?: boolean;
}

export const H1: React.FC<CustomTextProps> = ({ style, children, color, center, ...props }) => {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        styles.h1,
        { color: color ?? theme.colors.text, textAlign: center ? 'center' : 'left' },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

export const Title: React.FC<CustomTextProps> = ({ style, children, color, center, ...props }) => {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        styles.title,
        { color: color ?? theme.colors.text, textAlign: center ? 'center' : 'left' },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

export const Body: React.FC<CustomTextProps & { weight?: '400' | '500' | '600' }> = ({
  style,
  children,
  color,
  center,
  weight = '400',
  ...props
}) => {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        styles.body,
        {
          color: color ?? theme.colors.text,
          fontFamily: WEIGHT_FONT[weight],
          textAlign: center ? 'center' : 'left',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

export const Label: React.FC<CustomTextProps> = ({ style, children, color, center, ...props }) => {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        styles.label,
        { color: color ?? theme.colors.muted, textAlign: center ? 'center' : 'left' },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

export const Caption: React.FC<CustomTextProps> = ({
  style,
  children,
  color,
  center,
  ...props
}) => {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        styles.caption,
        { color: color ?? theme.colors.muted, textAlign: center ? 'center' : 'left' },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

const WEIGHT_FONT = { '400': fonts.regular, '500': fonts.medium, '600': fonts.semibold } as const;

const styles = StyleSheet.create({
  h1: {
    fontFamily: fonts.semibold,
    fontSize: 30,
    lineHeight: 35,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 22,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
});
