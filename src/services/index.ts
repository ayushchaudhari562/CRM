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
  Product,
  SalesmanHome,
  SalesmanProgress,
} from '../types';
import { getToken } from './session';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
if (!API_URL) throw new Error('Missing EXPO_PUBLIC_API_URL in .env');

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
  togglePunch: () =>
    request<{ punchedInAt: string | null }>('/me/attendance/toggle', { method: 'POST' }),
  getMeetings: (range: 'today' | 'week' | 'all' = 'all') =>
    request<Meeting[]>(`/me/meetings?range=${range}`),
  searchClients: (q: string) => request<Client[]>(`/me/clients?q=${encodeURIComponent(q)}`),
  getClient: (id: string) => request<ClientDetail>(`/me/clients/${encodeURIComponent(id)}`),
  getProducts: () => request<Product[]>('/products'),
  createMeeting: (input: CreateMeetingInput) =>
    request<Meeting>('/me/meetings', { method: 'POST', body: input }),

  // Admin
  getAdminOverview: () => request<AdminOverview>('/admin/overview'),
  getSalesmanProgress: () => request<SalesmanProgress[]>('/admin/progress'),
  getAllMeetings: (limit = 50, salesmanId?: string) =>
    request<Meeting[]>(
      `/admin/meetings?limit=${limit}${salesmanId ? `&salesmanId=${encodeURIComponent(salesmanId)}` : ''}`,
    ),
  getMeeting: (id: string) => request<Meeting>(`/admin/meetings/${encodeURIComponent(id)}`),
  addSalesman: (input: CreateSalesmanInput) =>
    request<AppUser>('/admin/salesmen', { method: 'POST', body: input }),

  // TODO (backend later): uploadAttachment, transcribeVoiceNote, sendWhatsAppReminder
};
