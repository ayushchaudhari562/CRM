// Supabase is used ONLY for login (phone OTP). All data comes from our API (src/services/index.ts).
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
if (!url || !key)
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY in .env');

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage, // keeps the user logged in after app restart
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // During web static rendering there is no window/localStorage.
    ...(Platform.OS === 'web' && typeof window === 'undefined' ? { persistSession: false } : {}),
  },
});

/** "+91 98765 43210" / "9876543210" -> "+919876543210". 10 digits = Indian mobile. */
export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return null;
}
