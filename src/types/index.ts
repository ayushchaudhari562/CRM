// API contract shared by the app and the backend (backend imports this file).
// Keep it free of UI / React Native imports.
// All dates are ISO strings (UTC). Money is in INR as a number.

export type Role = 'salesman' | 'admin';

export interface AppUser {
  id: string;
  name: string;
  initials: string;
  role: Role;
  phone: string;
}

export type MeetingOutcome = 'Interested' | 'Closed' | 'Not interested';

export interface Product {
  id: string;
  name: string;
}

export interface Client {
  id: string;
  name: string;
  businessType: string;
  contactNumber: string | null;
  address: string | null;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'photo' | 'file';
  size: number; // bytes
}

export interface Meeting {
  id: string;
  salesmanId: string;
  salesmanName: string;
  clientId: string;
  clientName: string;
  businessType: string;
  contactNumber: string | null;
  products: string[];
  dealValue: number;
  outcome: MeetingOutcome;
  note: string | null;
  voiceNoteUrl: string | null;
  voiceNoteDuration: number | null; // seconds
  aiSummary: string | null;
  nextVisit: string | null;
  whatsappReminder: boolean;
  attachments: Attachment[];
  location: { latitude: number; longitude: number } | null; // null = GPS denied
  selfieUrl: string | null;
  checkInAt: string;
  checkOutAt: string | null;
}

export type FollowUpStatus = 'Pending' | 'Overdue' | 'Done' | 'Cancelled';

export interface FollowUp {
  id: string;
  clientId: string;
  clientName: string;
  businessType: string;
  type: 'Visit' | 'Call';
  dueAt: string;
  status: FollowUpStatus;
}

export interface SalesmanHome {
  visitsDone: number; // today
  visitsTarget: number; // today (0 = no target set)
  followUpsToday: FollowUp[]; // pending, due today
  punchedInAt: string | null; // open punch-in today
}

export interface ClientDetail extends Client {
  meetings: Meeting[]; // newest first
  followUps: FollowUp[];
}

export type FieldStatus = 'In meeting' | 'On the road' | 'Not started';

export interface SalesmanProgress {
  id: string;
  name: string;
  initials: string;
  status: FieldStatus;
  visits: number; // today
  dealValue: number; // today, closed deals
  lastActivityAt: string | null;
  lastMeetingId: string | null; // today's latest visit (opens the report)
}

export interface AdminOverview {
  salesmenCount: number; // active
  visitsDone: number; // today
  visitsTarget: number; // today, sum of targets
  dealsClosed: number;
  dealValueTotal: number;
  followupsDue: number; // pending, due today
  followupsOverdue: number; // pending, due before now
  remindersSent: number; // WhatsApp reminders sent today
  fieldStatus: { inMeeting: number; onRoad: number; notStarted: number; total: number };
  outcomes: { interested: number; closed: number; notInterested: number; total: number };
}

/** Body of POST /me/meetings. clientRequestId makes retries / offline sync safe (no duplicates). */
export interface CreateMeetingInput {
  clientRequestId: string;
  clientId: string | null; // null = new client (created from the fields below)
  clientName: string;
  businessType: string;
  contactNumber: string | null;
  productIds: string[];
  dealValue: number;
  outcome: MeetingOutcome;
  note: string | null;
  nextVisit: string | null;
  whatsappReminder: boolean;
  checkInAt: string;
  location: { latitude: number; longitude: number; accuracy: number | null } | null;
}

/** Body of POST /admin/salesmen */
export interface CreateSalesmanInput {
  name: string;
  phone: string; // any format; server stores +91XXXXXXXXXX
}

export interface ApiErrorBody {
  error: string; // machine code, e.g. "not_registered"
  message: string; // human text
}
