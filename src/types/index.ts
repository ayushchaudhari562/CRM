export type Role = 'salesman' | 'admin';

export interface Salesman {
  id: string;
  name: string;
  initials: string;
  role: Role;
  phone?: string;
}

export interface Client {
  id: string;
  salesmanId: string; // owner: a salesman only sees their own clients
  name: string;
  businessType: string;
  contactNumber?: string;
  avatar?: string; // initials fallback
}

export type MeetingOutcome = 'Interested' | 'Closed' | 'Not interested';

export interface Meeting {
  id: string;
  salesmanId: string;
  clientName: string;
  businessType: string;
  contactNumber: string;
  products: string[];
  dealValue: number;
  outcome: MeetingOutcome;
  voiceNoteUrl?: string;
  voiceNoteDuration?: number;
  aiSummary?: string;
  nextVisit?: string; // ISO string
  whatsappReminder: boolean;
  attachments: Attachment[];
  location?: { latitude: number; longitude: number };
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface Reminder {
  id: string;
  salesmanId: string;
  meetingId: string;
  clientName: string;
  type: 'Follow-up' | 'Call back' | 'Visit';
  time: string; // HH:MM
  status: 'Due' | 'Done' | 'Overdue';
}

export interface VoiceNote {
  id: string;
  meetingId: string;
  url: string;
  duration: number; // seconds
  transcribedText?: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  uri: string;
  type: 'photo' | 'file';
  size: number;
}

export interface VisitStats {
  visitsDone: number;
  target: number;
  dealsClosed: number;
  dealValue: number;
}

export interface FieldStatus {
  label: string;
  count: number;
  total: number;
  percent: number;
  color: string;
}

export interface SalesmanProgress {
  id: string;
  name: string;
  initials: string;
  visits: number;
  lastUpdated: string;
  dealValue: number;
}

export interface AdminOverview {
  visitsDone: number;
  visitsTarget: number;
  dealsClosed: number;
  dealValueTotal: number;
  followupsDue: number;
  followupsOverdue: number;
  remindersSent: number;
  fieldStatus: {
    inMeeting: number;
    onRoad: number;
    notStarted: number;
    total: number;
  };
  outcomes: {
    interested: number;
    closed: number;
    notInterested: number;
    total: number;
  };
}

export interface ServiceError extends Error {
  code?: string;
  status?: number;
}
