import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { MapPin, Check } from 'lucide-react-native';
import { useTheme, fonts } from '../src/theme';
import { Button, Field, SegmentedControl } from '../src/components';
import { useAppStore } from '../src/store';
import { APP_NAME } from '../src/config';
import { toE164 } from '../src/services/supabase';
import { crmService, ApiError } from '../src/services';
import { clearSession, saveSession } from '../src/services/session';
import type { Role } from '../src/types';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'salesman', label: 'Salesman' },
  { value: 'admin', label: 'Manager' },
];
const ROLE_LABEL: Record<Role, string> = { salesman: 'Salesman', admin: 'Manager' };

export default function LoginScreen() {
  const { theme } = useTheme();
  const { setUser } = useAppStore();

  // The tab is only what the user INTENDS. The real role comes from our database after OTP.
  const [loginAs, setLoginAs] = useState<Role>('salesman');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState<string | null>(null); // E.164, set once the code is sent
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [resendIn, setResendIn] = useState(0); // seconds until "Resend code" is allowed

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const message = (e: unknown) =>
    e instanceof ApiError ? e.message : 'Could not reach the server. Please try again.';

  // Our server makes the code and sends it on WhatsApp. Same answer for any number (privacy).
  const sendCode = async (e164: string) => {
    setBusy(true);
    setError('');
    try {
      const r = await crmService.requestOtp(e164);
      setPhone(e164);
      setOtp('');
      setResendIn(r.resendInSec);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = () => {
    const e164 = toE164(phoneInput);
    if (!e164) return setError('Enter a valid 10-digit mobile number');
    void sendCode(e164);
  };

  const handleVerifyOtp = async () => {
    if (!phone) return;
    if (!/^\d{6}$/.test(otp)) return setError('Enter the 6-digit code');
    setBusy(true);
    setError('');
    try {
      const { user, ...tokens } = await crmService.verifyOtp(phone, otp);
      if (user.role !== loginAs) {
        await crmService.logout(tokens.refreshToken).catch(() => {});
        setBusy(false);
        return setError(`This number is not registered as ${ROLE_LABEL[loginAs]}.`);
      }
      await saveSession(tokens, user); // stays logged in until Sign Out
      setUser(user); // route guard then opens the right home
    } catch (e) {
      await clearSession();
      setBusy(false);
      setError(message(e));
    }
  };

  const changeNumber = () => {
    setPhone(null);
    setOtp('');
    setError('');
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
          {!phone ? (
            <View style={styles.form}>
              <SegmentedControl options={ROLE_OPTIONS} value={loginAs} onChange={setLoginAs} />
              <Field
                label="Mobile number"
                value={phoneInput}
                onChangeText={(val) => {
                  setPhoneInput(val);
                  if (error) setError('');
                }}
                keyboardType="phone-pad"
                autoCapitalize="none"
                error={error}
                placeholder="98765 43210"
              />

              <Button
                title="Send code on WhatsApp"
                onPress={handleSendOtp}
                loading={busy}
                variant="primary"
                size="normal"
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Field
                label={`Enter the 6-digit code sent on WhatsApp to ${phone}`}
                value={otp}
                onChangeText={(val) => {
                  setOtp(val);
                  if (error) setError('');
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                error={error}
                placeholder="123456"
              />

              <Text style={[styles.hint, { color: theme.colors.muted }]}>
                Signing in as {ROLE_LABEL[loginAs]}
              </Text>
              <Button
                title="Verify & Sign in"
                onPress={handleVerifyOtp}
                loading={busy}
                variant="primary"
                size="normal"
              />

              <Button
                title={resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                onPress={() => void sendCode(phone)}
                disabled={busy || resendIn > 0}
                variant="outline"
                size="compact"
              />

              <Button
                title="Change phone number"
                onPress={changeNumber}
                disabled={busy}
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
                icon={installed ? <Check size={16} color={theme.colors.bg} /> : undefined}
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
