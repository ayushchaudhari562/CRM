import React from 'react';
import { View, ViewProps, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

export interface CardProps extends ViewProps {
  surface?: 'surface' | 'surface2';
  bordered?: boolean;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  surface = 'surface',
  bordered = false,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor:
            surface === 'surface2' ? theme.colors.surface2 : theme.colors.surface,
          borderRadius: theme.radius.card,
          borderColor: bordered ? theme.colors.border : 'transparent',
          borderWidth: bordered ? 1 : 0,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

export const Tile: React.FC<CardProps> = ({
  children,
  surface = 'surface',
  bordered = true,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor:
            surface === 'surface2' ? theme.colors.surface2 : theme.colors.surface,
          borderRadius: theme.radius.tile,
          borderColor: bordered ? theme.colors.border : 'transparent',
          borderWidth: bordered ? 1 : 0,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    overflow: 'hidden',
  },
  tile: {
    padding: 20,
    overflow: 'hidden',
  },
});

