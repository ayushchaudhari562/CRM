// The login on this phone (OTP on our server). Like a shopping app: log in once, stay logged in.
// - Refresh token: kept in the phone's secure storage (Android Keystore). It is what keeps the user logged in.
// - Access token: short-lived (15 min), only in memory; renewed with the refresh token when it expires.
// - The user is cached so the app opens offline. Being offline NEVER logs anyone out.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { AppUser } from '../types';

const REFRESH_KEY = 'jta.refreshToken';
const USER_KEY = 'jta.user';

// The web build (testing only) has no secure storage.
const secure = {
  get: (k: string) =>
    Platform.OS === 'web' ? AsyncStorage.getItem(k) : SecureStore.getItemAsync(k),
  set: (k: string, v: string) =>
    Platform.OS === 'web' ? AsyncStorage.setItem(k, v) : SecureStore.setItemAsync(k, v),
  del: (k: string) =>
    Platform.OS === 'web' ? AsyncStorage.removeItem(k) : SecureStore.deleteItemAsync(k),
};

let accessToken: string | null = null;

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => secure.get(REFRESH_KEY);

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export async function saveSession(tokens: Tokens, user?: AppUser) {
  accessToken = tokens.accessToken;
  await secure.set(REFRESH_KEY, tokens.refreshToken);
  if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getCachedUser(): Promise<AppUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AppUser) : null;
}

export async function clearSession() {
  accessToken = null;
  await secure.del(REFRESH_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

// The store registers this, so a session ended on the server (logout elsewhere, deactivated) opens the login screen.
let onEnded: () => void = () => {};
export const onSessionEnded = (fn: () => void) => {
  onEnded = fn;
};
export const sessionEnded = async () => {
  await clearSession();
  onEnded();
};
