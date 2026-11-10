import React from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../theme';

export interface FieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  successHint?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  label,
  error,
  hint,
  successHint,
  containerStyle,
  inputStyle,
  rightElement,
  leftElement,
  style,
  ...inputProps
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.muted }]}>{label}</Text>
      ) : null}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.colors.surface2,
            borderColor: error ? theme.colors.adminRedText : theme.colors.border,
            borderRadius: theme.radius.field,
          },
        ]}
      >
        {leftElement ? <View style={styles.adornment}>{leftElement}</View> : null}
        <TextInput
          placeholderTextColor={theme.colors.muted}
          selectionColor={theme.colors.accent}
          style={[
            styles.input,
            {
              color: theme.colors.text,
            },
            inputStyle,
            style,
          ]}
          {...inputProps}
        />
        {rightElement ? <View style={styles.adornment}>{rightElement}</View> : null}
      </View>

      {successHint ? (
        <Text style={[styles.successText, { color: theme.colors.accent }]}>{successHint}</Text>
      ) : null}

      {error ? (
        <Text style={[styles.errorText, { color: theme.colors.adminRedText }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hintText, { color: theme.colors.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 0,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 13,
    marginBottom: 6,
  },
  inputWrapper: {
    height: 48,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: 'Inter',
    fontSize: 15,
    padding: 0,
  },
  adornment: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    fontFamily: 'Inter',
    fontSize: 13,
    marginTop: 4,
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 12,
    marginTop: 4,
  },
  hintText: {
    fontFamily: 'Inter',
    fontSize: 12,
    marginTop: 4,
  },
});

