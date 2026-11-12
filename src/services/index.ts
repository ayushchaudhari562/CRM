// All app data comes from our API (backend/). No mock data.
import type {
  AdminOverview,
  ApiErrorBody,
  AppUser,
  Client,
  ClientDetail,
  CreateMeetingInput,
  CreateSalesmanInput,
  Meeting,
  MeetingOutcome,
  Product,
  SalesmanHome,
  SalesmanProgress,
  AdminFollowUp,
  FollowUp,
  FollowUpScope,
  SalesmanTargetProgress,
  SetMyTargetInput,
  SetTargetInput,
  TargetProgress,
  UpdateFollowUpInput,
  UpdateMeetingInput,
  SyncInput,
  SyncResult,
  CreateUploadInput,
  UploadKind,
  UploadTicket,
  DayRoute,
  LatLng,
  LocationPingsInput,
  SalesmanLocation,
} from '../types';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { getToken } from './session';

/**
 * On a phone/emulator "localhost" is the phone itself, not the laptop running the API.
 * In development we swap it for the laptop's address that Expo already uses to load the app
 * (hostUri, e.g. "192.168.1.5:8081"), so it keeps working when the Wi-Fi / hotspot changes.
 * Release builds use EXPO_PUBLIC_API_URL as is.
 */
function apiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error('Missing EXPO_PUBLIC_API_URL in .env');
  const devHost = __DEV__ ? Constants.expoConfig?.hostUri?.split(':')[0] : undefined;
  return devHost && /localhost|127\.0\.0\.1/.test(url)
    ? url.replace(/localhost|127\.0\.0\.1/, devHost)
    : url;
}
const API_URL = apiUrl();

/** Error with the API's machine code (e.g. "not_registered") and a message safe to show. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network', 'No internet connection or server is down. Please try again.');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      body?.error ?? 'server_error',
      body?.message ?? 'Something went wrong.',
    );
  }
  return (await res.json()) as T;
}

export const crmService = {
  // Any user
  getMe: () => request<AppUser>('/me'),
  // TEMPORARY: fixed-OTP login checked by our API (see backend/src/devLogin.ts)
  devLogin: (phone: string, otp: string) =>
    request<{ token: string; user: AppUser }>('/auth/dev-login', {
      method: 'POST',
      body: { phone, otp },
    }),

  // Salesman (server filters everything by the logged-in salesman)
  getHome: () => request<SalesmanHome>('/me/home'),
  togglePunch: (location: LatLng | null = null) =>
    request<{ punchedInAt: string | null }>('/me/attendance/toggle', {
      method: 'POST',
      body: { location },
    }),
  /** GPS points buffered while punched in (max 120 per call). */
  sendLocations: (input: LocationPingsInput) =>
    request<{ accepted: number }>('/me/locations', { method: 'POST', body: input }),
  getMeetings: (range: 'today' | 'week' | 'all' = 'all') =>
    request<Meeting[]>(`/me/meetings?range=${range}`),
  searchClients: (q: string) => request<Client[]>(`/me/clients?q=${encodeURIComponent(q)}`),
  getClient: (id: string) => request<ClientDetail>(`/me/clients/${encodeURIComponent(id)}`),
  getProducts: () => request<Product[]>('/products'),
  createMeeting: (input: CreateMeetingInput) =>
    request<Meeting>('/me/meetings', { method: 'POST', body: input }),
  /** File step 1: one-time upload URL. Step 2: uploadFile. Step 3: send ticket.path with the meeting. */
  createUpload: (input: CreateUploadInput) =>
    request<UploadTicket>('/me/uploads', { method: 'POST', body: input }),
  /** File step 2: send the file straight to storage (not through our API). */
  uploadFile: async (ticket: UploadTicket, fileUri: string) => {
    const file = await (await fetch(fileUri)).blob();
    const res = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': ticket.contentType },
      body: file,
    });
    if (!res.ok) throw new ApiError(res.status, 'upload_failed', 'Could not upload the file.');
    return ticket.path;
  },
  /**
   * All 3 file steps for a file on the phone. Returns the storage path to send with the meeting.
   * The file is checked first and sent natively (JS fetch cannot always read local files).
   */
  uploadLocal: async (kind: UploadKind, fileUri: string, contentType: string) => {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists || !info.size) {
      throw new ApiError(
        0,
        'file_missing',
        'The recording could not be read. Please record again.',
      );
    }
    const ticket = await request<UploadTicket>('/me/uploads', {
      method: 'POST',
      body: { kind, contentType, sizeBytes: info.size },
    });
    const res = await FileSystem.uploadAsync(ticket.uploadUrl, fileUri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': ticket.contentType },
    });
    if (res.status < 200 || res.status >= 300) {
      throw new ApiError(
        res.status,
        'upload_failed',
        'Could not upload the file. Please try again.',
      );
    }
    return ticket.path;
  },
  /** Offline queue: max 25 visits per call, oldest first. */
  syncMeetings: (input: SyncInput) =>
    request<SyncResult[]>('/me/sync', { method: 'POST', body: input }),
  updateMeeting: (id: string, input: UpdateMeetingInput) =>
    request<Meeting>(`/me/meetings/${encodeURIComponent(id)}`, { method: 'PATCH', body: input }),
  getFollowUps: (scope: FollowUpScope) => request<FollowUp[]>(`/me/followups?scope=${scope}`),
  updateFollowUp: (id: string, input: UpdateFollowUpInput) =>
    request<FollowUp>(`/me/followups/${encodeURIComponent(id)}`, { method: 'PATCH', body: input }),
  getMyTargets: (days = 7) => request<TargetProgress[]>(`/me/targets?days=${days}`),
  setMyTarget: (input: SetMyTargetInput) =>
    request<TargetProgress>('/me/target', { method: 'PUT', body: input }),

  // Admin
  getAdminOverview: () => request<AdminOverview>('/admin/overview'),
  getSalesmanProgress: () => request<SalesmanProgress[]>('/admin/progress'),
  getAllMeetings: (limit = 50, salesmanId?: string) =>
    request<Meeting[]>(
      `/admin/meetings?limit=${limit}${salesmanId ? `&salesmanId=${encodeURIComponent(salesmanId)}` : ''}`,
    ),
  /** Today's meetings with one outcome (admin home pills). */
  getTodayMeetingsByOutcome: (outcome: MeetingOutcome) =>
    request<Meeting[]>(
      `/admin/meetings?range=today&limit=200&outcome=${encodeURIComponent(outcome)}`,
    ),
  getLatestLocations: () => request<SalesmanLocation[]>('/admin/locations'),
  getDayRoute: (salesmanId: string, date?: string) =>
    request<DayRoute>(
      `/admin/salesmen/${encodeURIComponent(salesmanId)}/route${date ? `?date=${date}` : ''}`,
    ),
  getMeeting: (id: string) => request<Meeting>(`/admin/meetings/${encodeURIComponent(id)}`),
  addSalesman: (input: CreateSalesmanInput) =>
    request<AppUser>('/admin/salesmen', { method: 'POST', body: input }),
  getAllFollowUps: (scope: FollowUpScope, salesmanId?: string) =>
    request<AdminFollowUp[]>(
      `/admin/followups?scope=${scope}${salesmanId ? `&salesmanId=${encodeURIComponent(salesmanId)}` : ''}`,
    ),
  getTargets: (date?: string) =>
    request<SalesmanTargetProgress[]>(`/admin/targets${date ? `?date=${date}` : ''}`),
  setTargets: (input: SetTargetInput) =>
    request<SalesmanTargetProgress[]>('/admin/targets', { method: 'PUT', body: input }),

  // TODO (backend later): uploadAttachment, transcribeVoiceNote, sendWhatsAppReminder
};
