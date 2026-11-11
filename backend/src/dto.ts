// DB rows -> API shapes (the types in src/types, shared with the app).
import type { Prisma, User, MeetingOutcome as DbOutcome } from './generated/prisma/client';
import type { AppUser, FollowUp, Meeting, MeetingOutcome } from '../../src/types';

export const OUTCOME_TO_API: Record<DbOutcome, MeetingOutcome> = {
  INTERESTED: 'Interested',
  CLOSED: 'Closed',
  NOT_INTERESTED: 'Not interested',
};
export const OUTCOME_TO_DB: Record<MeetingOutcome, DbOutcome> = {
  Interested: 'INTERESTED',
  Closed: 'CLOSED',
  'Not interested': 'NOT_INTERESTED',
};

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

export function toAppUser(u: User): AppUser {
  return { id: u.id, name: u.name, initials: initials(u.name), role: u.role === 'ADMIN' ? 'admin' : 'salesman', phone: u.phone };
}

/** Prisma `include` needed by toMeeting. */
export const meetingInclude = {
  client: true,
  salesman: { select: { name: true } },
  products: { select: { name: true } },
  attachments: true,
} satisfies Prisma.MeetingInclude;

type MeetingRow = Prisma.MeetingGetPayload<{ include: typeof meetingInclude }>;

export function toMeeting(m: MeetingRow): Meeting {
  return {
    id: m.id,
    salesmanId: m.salesmanId,
    salesmanName: m.salesman.name,
    clientId: m.clientId,
    clientName: m.client.name,
    businessType: m.client.businessType,
    contactNumber: m.client.contactNumber,
    products: m.products.map((p) => p.name),
    dealValue: Number(m.dealValue),
    outcome: OUTCOME_TO_API[m.outcome],
    note: m.note,
    voiceNoteUrl: m.voiceNoteUrl,
    voiceNoteDuration: m.voiceNoteSeconds,
    aiSummary: m.aiSummary,
    nextVisit: m.nextVisitAt?.toISOString() ?? null,
    whatsappReminder: m.whatsappReminder,
    attachments: m.attachments.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
      type: a.type === 'PHOTO' ? 'photo' : 'file',
      size: a.sizeBytes,
    })),
    location: m.checkInLat !== null && m.checkInLng !== null ? { latitude: m.checkInLat, longitude: m.checkInLng } : null,
    selfieUrl: m.selfieUrl,
    checkInAt: m.checkInAt.toISOString(),
    checkOutAt: m.checkOutAt?.toISOString() ?? null,
  };
}

type FollowUpRow = Prisma.FollowUpGetPayload<{ include: { client: true } }>;

export function toFollowUp(f: FollowUpRow, now = new Date()): FollowUp {
  const overdue = f.status === 'PENDING' && f.dueAt < now;
  return {
    id: f.id,
    clientId: f.clientId,
    clientName: f.client.name,
    businessType: f.client.businessType,
    type: f.type === 'CALL' ? 'Call' : 'Visit',
    dueAt: f.dueAt.toISOString(),
    status: overdue ? 'Overdue' : f.status === 'DONE' ? 'Done' : f.status === 'CANCELLED' ? 'Cancelled' : 'Pending',
  };
}

/** Start/end of "today" in India (IST, UTC+5:30), as UTC Dates. */
export function istToday(now = new Date()) {
  const IST = 5.5 * 3600_000;
  const ist = new Date(now.getTime() + IST);
  const start = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST);
  const end = new Date(start.getTime() + 24 * 3600_000);
  const date = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate())); // for @db.Date
  return { start, end, date };
}
