// Google Maps on Android needs an API key in the build; without it the map crashes the app.
// Expo Go has its own key. A real build (APK) has one only if GOOGLE_MAPS_API_KEY was set when it was built.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';

export const MAPS_AVAILABLE =
  Platform.OS !== 'android' ||
  isRunningInExpoGo() ||
  !!Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
