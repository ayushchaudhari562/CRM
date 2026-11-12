import { create } from 'zustand';
import type { AppUser, Meeting } from '../types';
import { clearSession, getRefreshToken } from '../services/session';
import { crmService } from '../services';
import { queryClient } from '../services/queryClient';

/** Captured on the check-in screen, sent with the meeting. */
export interface CheckIn {
  checkInAt: string; // ISO
  location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    address?: string | null;
  } | null; // null = GPS denied
  selfieUri: string | null; // local file; upload comes with the storage backend (TODO)
}

interface AppState {
  user: AppUser | null; // null = logged out. Role comes from the API (/me), never chosen in the app.
  authReady: boolean; // false until we checked for a saved session on app start
  offlineMode: boolean; // UI-only banner for now
  checkIn: CheckIn | null;
  lastSavedMeeting: Meeting | null; // shown on the "Meeting saved" screen

  setUser: (user: AppUser | null) => void;
  setAuthReady: () => void;
  logout: () => Promise<void>;
  toggleOffline: () => void;
  setCheckIn: (checkIn: CheckIn | null) => void;
  setLastSavedMeeting: (meeting: Meeting | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  authReady: false,
  offlineMode: false,
  checkIn: null,
  lastSavedMeeting: null,

  setUser: (user) => set({ user }),
  setAuthReady: () => set({ authReady: true }),
  logout: async () => {
    // End the session on the server too (best effort: offline still logs out on this phone).
    const refreshToken = await getRefreshToken();
    if (refreshToken) await crmService.logout(refreshToken).catch(() => {});
    await clearSession();
    queryClient.clear(); // never show the previous user's cached data
    set({ user: null, checkIn: null, lastSavedMeeting: null });
  },
  toggleOffline: () => set((s) => ({ offlineMode: !s.offlineMode })),
  setCheckIn: (checkIn) => set({ checkIn }),
  setLastSavedMeeting: (lastSavedMeeting) => set({ lastSavedMeeting }),
}));
