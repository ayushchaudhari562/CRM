import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { MapPin, Check } from 'lucide-react-native';
import { useTheme, fonts } from '../src/theme';
import { Button, Field, SegmentedControl } from '../src/components';
import { useAppStore } from '../src/store';
import { APP_NAME, adminUser, currentUser } from '../src/mocks/data';
import type { Role } from '../src/types';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'salesman', label: 'Salesman' },
  { value: 'admin', label: 'Manager' },
];

export default function LoginScreen() {
  const { theme } = useTheme();
  const { login } = useAppStore();

  const [loginAs, setLoginAs] = useState<Role>('salesman');
  const [phoneOrId, setPhoneOrId] = useState('+91 98765 43210');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [installed, setInstalled] = useState(false);

  const handleSendOtp = () => {
    if (!phoneOrId || phoneOrId.trim().length < 6) {
      setError('Please enter a valid phone number or employee ID');
      return;
    }
    setError('');
    setOtpSent(true);
  };

  const handleVerifyOtp = () => {
    if (!otp || otp.length < 4) {
      setError('Please enter the 4-digit OTP (e.g. 1234)');
      return;
    }
    setError('');
    // MOCK: the chosen tab decides the role. With a real backend, the server must
    // return the user (and role) for this phone number after OTP check.
    login(loginAs === 'admin' ? adminUser : currentUser); // route guard then opens the right home
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {/* App Logo */}
          <View
            style={[styles.logoBadge, { backgroundColor: theme.colors.accent, borderRadius: 16 }]}
          >
            <MapPin size={28} color={theme.colors.onAccent} strokeWidth={2.2} />
          </View>

          {/* Heading */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Welcome in,{'\n'}
              {APP_NAME}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              Sign in to start today&apos;s visits
            </Text>
          </View>

          {/* Inputs & Actions */}
          {!otpSent ? (
            <View style={styles.form}>
              <SegmentedControl options={ROLE_OPTIONS} value={loginAs} onChange={setLoginAs} />
              <Field
                label="Phone number or employee ID"
                value={phoneOrId}
                onChangeText={(val) => {
                  setPhoneOrId(val);
                  if (error) setError('');
                }}
                keyboardType="phone-pad"
                autoCapitalize="none"
                error={error}
                placeholder="+91 98765 43210"
              />

              <Button title="Send OTP" onPress={handleSendOtp} variant="primary" size="normal" />
            </View>
          ) : (
            <View style={styles.form}>
              <Field
                label="Enter 4-digit OTP"
                value={otp}
                onChangeText={(val) => {
                  setOtp(val);
                  if (error) setError('');
                }}
                keyboardType="number-pad"
                maxLength={4}
                error={error}
                hint="Use mock code: 1234"
                placeholder="1234"
              />

              <Text style={[styles.hint, { color: theme.colors.muted }]}>
                Signing in as {loginAs === 'admin' ? 'Manager' : 'Salesman'}
              </Text>
              <Button
                title="Verify & Sign in"
                onPress={handleVerifyOtp}
                variant="primary"
                size="normal"
              />

              <Button
                title="Change phone number"
                onPress={() => setOtpSent(false)}
                variant="outline"
                size="compact"
              />
            </View>
          )}

          {/* Biometrics hint */}
          <Text style={[styles.hint, { color: theme.colors.muted }]}>
            Next time: face unlock or fingerprint
          </Text>

          <View style={styles.spacer} />

          {/* Add to Home Screen install card (Platform web only as specified in brief) */}
          {Platform.OS === 'web' && (
            <View style={[styles.installCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.installTextWrapper}>
                <Text style={[styles.installTitle, { color: theme.colors.text }]}>
                  Add to Home Screen
                </Text>
                <Text style={[styles.installSub, { color: theme.colors.muted }]}>
                  Works offline once installed
                </Text>
              </View>

              <Button
                title={installed ? 'Installed' : 'Install'}
                onPress={() => setInstalled(true)}
                variant="white"
                size="small"
                fullWidth={false}
                icon={installed ? <Check size={16} color="#0B0C0D" /> : undefined}
                style={{ paddingHorizontal: 20 }}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 24,
    gap: 20,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  logoBadge: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: 8,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 30,
    lineHeight: 35,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  form: {
    gap: 16,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  installCard: {
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  installTextWrapper: {
    flex: 1,
  },
  installTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  installSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
});
