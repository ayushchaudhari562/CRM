// Which token do we send to our API?
// - TEMPORARY dev login (fixed OTP checked by our API) while EXPO_PUBLIC_DEV_LOGIN=1
// - otherwise the Supabase phone-OTP session
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export const DEV_LOGIN = process.env.EXPO_PUBLIC_DEV_LOGIN === '1';
const DEV_TOKEN_KEY = 'devToken';

export async function getToken(): Promise<string | null> {
  if (DEV_LOGIN) return AsyncStorage.getItem(DEV_TOKEN_KEY);
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export const saveDevToken = (token: string) => AsyncStorage.setItem(DEV_TOKEN_KEY, token);

export async function clearSession() {
  await AsyncStorage.removeItem(DEV_TOKEN_KEY);
  await supabase.auth.signOut();
}
