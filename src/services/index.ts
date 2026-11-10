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

  async getClients(): Promise<Client[]> {
    await delay(300);
    return [...clients];
  }

  async getClient(id: string): Promise<Client | null> {
    await delay(300);
    return clients.find((c) => c.id === id) ?? null;
  }

  async searchClients(query: string): Promise<Client[]> {
    await delay(300);
    const q = query.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }

  async getMeetings(salesmanId?: string): Promise<Meeting[]> {
    await delay(300);
    const list = [...meetings];
    if (salesmanId) {
      return list.filter((m) => m.salesmanId === salesmanId);
    }
    return list;
  }

  async getMeeting(id: string): Promise<Meeting | null> {
    await delay(300);
    return meetings.find((m) => m.id === id) ?? null;
  }

  async createMeeting(input: Omit<Meeting, 'id' | 'salesmanId' | 'createdAt' | 'updatedAt'>): Promise<Meeting> {
    await delay(500);
    const meeting: Meeting = {
      ...input,
      id: `m-${Date.now()}`,
      salesmanId: 'sm-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    meetings.push(meeting);
    return meeting;
  }

  async updateMeeting(id: string, patch: Partial<Meeting>): Promise<Meeting | null> {
    await delay(400);
    const idx = meetings.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    meetings[idx] = { ...meetings[idx], ...patch, updatedAt: new Date().toISOString() };
    return meetings[idx];
  }

  async getReminders(salesmanId?: string): Promise<Reminder[]> {
    await delay(300);
    return [...reminders];
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
