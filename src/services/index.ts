import type {
  AdminOverview,
  Client,
  Meeting,
  Reminder,
  Salesman,
  SalesmanProgress,
  ServiceError,
  VisitStats,
} from '../types';
import { clients, meetings, reminders, adminSalesmen, salesmanProgress, visitStats, adminOverview } from '../mocks/data';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function serviceError(message: string, opts?: { code?: string; status?: number }): ServiceError {
  const err = new Error(message) as ServiceError;
  err.name = 'ServiceError';
  err.code = opts?.code;
  err.status = opts?.status;
  return err;
}

export class CrmService {
  async getStats(): Promise<VisitStats> {
    await delay(300);
    return { ...visitStats };
  }

  async getAdminOverview(): Promise<AdminOverview> {
    await delay(300);
    return { ...adminOverview };
  }

  // --- Salesman scope: salesmanId is required so a salesman only ever gets their own data.
  // NOTE: this is UX only. The real backend must enforce it from the auth token.

  async getClients(salesmanId: string): Promise<Client[]> {
    await delay(300);
    return clients.filter((c) => c.salesmanId === salesmanId);
  }

  async getClient(salesmanId: string, id: string): Promise<Client | null> {
    await delay(300);
    return clients.find((c) => c.id === id && c.salesmanId === salesmanId) ?? null;
  }

  async searchClients(salesmanId: string, query: string): Promise<Client[]> {
    await delay(300);
    const q = query.trim().toLowerCase();
    return clients.filter((c) => c.salesmanId === salesmanId && c.name.toLowerCase().includes(q));
  }

  async getMeetings(salesmanId: string): Promise<Meeting[]> {
    await delay(300);
    return meetings.filter((m) => m.salesmanId === salesmanId);
  }

  async getReminders(salesmanId: string): Promise<Reminder[]> {
    await delay(300);
    return reminders.filter((r) => r.salesmanId === salesmanId);
  }

  async createMeeting(
    salesmanId: string,
    input: Omit<Meeting, 'id' | 'salesmanId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Meeting> {
    await delay(500);
    const now = new Date().toISOString();
    const meeting: Meeting = { ...input, id: `m-${Date.now()}`, salesmanId, createdAt: now, updatedAt: now };
    meetings.push(meeting);
    return meeting;
  }

  // --- Admin scope: sees everything.

  async getAllMeetings(): Promise<Meeting[]> {
    await delay(300);
    return [...meetings];
  }

  async getMeeting(id: string): Promise<Meeting | null> {
    await delay(300);
    return meetings.find((m) => m.id === id) ?? null;
  }

  async updateMeeting(id: string, patch: Partial<Meeting>): Promise<Meeting | null> {
    await delay(400);
    const idx = meetings.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    meetings[idx] = { ...meetings[idx], ...patch, updatedAt: new Date().toISOString() };
    return meetings[idx];
  }

  async getSalesmanProgress(): Promise<SalesmanProgress[]> {
    await delay(300);
    return [...salesmanProgress];
  }

  async getSalesmen(): Promise<Salesman[]> {
    await delay(300);
    return [...adminSalesmen];
  }

  // TODO: wire up to real TypeScript backend
  // async uploadAttachment(uri: string): Promise<Attachment> { ... }
  // async transcribeVoiceNote(url: string): Promise<string> { ... }
  // async sendWhatsAppReminder(reminderId: string): Promise<void> { ... }
}

export const crmService = new CrmService();
