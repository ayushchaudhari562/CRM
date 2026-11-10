import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

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
          fontWeight: weight,
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

export const Caption: React.FC<CustomTextProps> = ({ style, children, color, center, ...props }) => {
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

const styles = StyleSheet.create({
  h1: {
    fontFamily: 'Inter',
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 35,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 20,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 16,
  },
});

