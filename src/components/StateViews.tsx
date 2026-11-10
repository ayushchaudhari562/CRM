import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { AlertCircle, Inbox } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button } from './Button';

export interface LoadingViewProps {
  message?: string;
  style?: ViewStyle;
}

export const LoadingView: React.FC<LoadingViewProps> = ({
  message = 'Loading data...',
  style,
}) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.center, style]}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
      <Text style={[styles.text, { color: theme.colors.muted, marginTop: 12 }]}>{message}</Text>
    </View>
  );
};

export interface EmptyViewProps {
  title?: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyView: React.FC<EmptyViewProps> = ({
  title = 'No items found',
  description = 'There are no records to display right now.',
  actionTitle,
  onAction,
  style,
}) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.center, style]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border },
        ]}
      >
        <Inbox size={28} color={theme.colors.muted} />
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.colors.muted }]}>{description}</Text>
      {actionTitle && onAction ? (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="secondary"
          size="compact"
          fullWidth={false}
          style={{ marginTop: 16 }}
        />
      ) : null}
    </View>
  );
};

export interface ErrorViewProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  title = 'Something went wrong',
  message = 'Failed to load details. Please try again.',
  onRetry,
  style,
}) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.center, style]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border },
        ]}
      >
        <AlertCircle size={28} color={theme.colors.adminRedText} />
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.colors.muted }]}>{message}</Text>
      {onRetry ? (
        <Button
          title="Try again"
          onPress={onRetry}
          variant="secondary"
          size="compact"
          fullWidth={false}
          style={{ marginTop: 16 }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontFamily: 'Inter',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  text: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
});

