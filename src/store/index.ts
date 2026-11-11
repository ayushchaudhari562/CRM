import { create } from 'zustand';
import type { Role, Salesman, MeetingOutcome } from '../types';
import { currentUser } from '../mocks/data';

export interface MeetingDraft {
  clientName: string;
  businessType: string;
  contactNumber: string;
  products: string[];
  dealValue: string; // formatted or raw
  outcome: MeetingOutcome;
  voiceNoteUri: string | null;
  voiceNoteDuration: number;
  nextVisit: string;
  whatsappReminder: boolean;
  selfieUri: string | null;
  checkinTime: string;
  locationCaptured: boolean;
  timeSaved: boolean;
  fakeGpsPassed: boolean;
  attachments: { id: string; name: string; uri: string; type: 'photo' | 'file'; size: number }[];
}

const defaultDraft: MeetingDraft = {
  clientName: 'Client A',
  businessType: 'Kirana store',
  contactNumber: '+91 90000 00001',
  products: ['Product 1', 'Product 2'],
  dealValue: '25,000',
  outcome: 'Interested',
  voiceNoteUri: null,
  voiceNoteDuration: 24,
  nextVisit: '15 Nov 2026, 11:00 AM',
  whatsappReminder: true,
  selfieUri: null,
  checkinTime: '11:02 AM',
  locationCaptured: true,
  timeSaved: true,
  fakeGpsPassed: true,
  attachments: [],
};

interface AppState {
  role: Role;
  isLoggedIn: boolean;
  user: Salesman;
  isPunchedIn: boolean;
  punchInTime: string | null;
  offlineMode: boolean;
  meetingDraft: MeetingDraft;

  // Actions
  setRole: (role: Role) => void;
  setIsLoggedIn: (loggedIn: boolean) => void;
  login: (user: Salesman) => void; // role comes from the user, never chosen separately
  logout: () => void;
  togglePunchIn: () => void;
  toggleOffline: () => void;
  updateMeetingDraft: (patch: Partial<MeetingDraft>) => void;
  resetMeetingDraft: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  role: 'salesman',
  isLoggedIn: false, // app always starts at login
  user: currentUser,
  isPunchedIn: false,
  punchInTime: null,
  offlineMode: false,
  meetingDraft: { ...defaultDraft },

  setRole: (role) => set({ role }),
  setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
  login: (user) => set({ user, role: user.role, isLoggedIn: true }),
  logout: () => set({ isLoggedIn: false, isPunchedIn: false, punchInTime: null }),
  togglePunchIn: () =>
    set((state) => ({
      isPunchedIn: !state.isPunchedIn,
      punchInTime: !state.isPunchedIn ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
    })),
  toggleOffline: () => set((state) => ({ offlineMode: !state.offlineMode })),
  updateMeetingDraft: (patch) =>
    set((state) => ({
      meetingDraft: { ...state.meetingDraft, ...patch },
    })),
  resetMeetingDraft: () =>
    set({
      meetingDraft: {
        ...defaultDraft,
        clientName: '',
        businessType: '',
        contactNumber: '',
        products: [],
        dealValue: '',
        outcome: 'Interested',
        selfieUri: null,
        attachments: [],
      },
    }),
}));

