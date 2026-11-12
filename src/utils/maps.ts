// Maps come from Ola Maps (web map in a WebView). The key is public by design (it ships inside the app)
// and is set as EXPO_PUBLIC_MAP_KEY in the EAS environment. Without it the app shows coordinates instead.
export const MAP_KEY = process.env.EXPO_PUBLIC_MAP_KEY?.trim() ?? '';
export const MAPS_AVAILABLE = MAP_KEY.length > 0;
