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
  url: string | null; // signed, short-lived; null = file not available
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
  clientAddress: string | null; // shop address typed by the salesman
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
  location: { latitude: number; longitude: number; address: string | null } | null; // null = GPS denied
  selfieUrl: string | null;
  checkInAt: string;
  checkOutAt: string | null;
  editableUntil: string | null; // salesman can edit (allowed fields) until this time; null = not editable
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

/** Lists: overdue = pending & past due, today = pending & due later today, upcoming = after today, done = done/cancelled. */
export type FollowUpScope = 'overdue' | 'today' | 'upcoming' | 'done';

/** Admin list adds who owns it. */
export interface AdminFollowUp extends FollowUp {
  salesmanId: string;
  salesmanName: string;
}

/** Body of PATCH /me/followups/:id. Send a status to close it, or dueAt to reschedule. */
export interface UpdateFollowUpInput {
  status?: 'Done' | 'Cancelled';
  dueAt?: string;
}

/** One day's target vs. achieved. date = YYYY-MM-DD (India time). */
export interface TargetProgress {
  date: string;
  visitsTarget: number; // 0 = no target set
  visitsDone: number;
  dealValueTarget: number | null;
  dealValue: number; // closed deals
}

export interface SalesmanTargetProgress extends TargetProgress {
  salesmanId: string;
  salesmanName: string;
}

/** Body of PUT /admin/targets: same target for one or many salesmen on one day. */
export interface SetTargetInput {
  salesmanIds: string[];
  date: string; // YYYY-MM-DD
  visitsTarget: number;
  dealValueTarget: number | null;
}

/** Body of PUT /me/target: the salesman's own target for today. */
export interface SetMyTargetInput {
  visitsTarget: number; // 0 = no target
}

export interface SalesmanHome {
  visitsDone: number; // today
  visitsTarget: number; // today (0 = no target set)
  followUpsToday: FollowUp[]; // pending, due today
  punchedInAt: string | null; // open punch-in today
  workedMs: number; // finished shifts today (add now - punchedInAt for the open one)
  punchedOutAt: string | null; // last punch-out today
}

export interface ClientDetail extends Client {
  meetings: Meeting[]; // newest first
  followUps: FollowUp[];
}

export type FieldStatus = 'In meeting' | 'On the road' | 'Day ended' | 'Not started';

export interface SalesmanProgress {
  id: string;
  name: string;
  phone?: string;
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
  fieldStatus: { inMeeting: number; onRoad: number; dayEnded: number; notStarted: number; total: number };
  outcomes: { interested: number; closed: number; notInterested: number; total: number };
}

/** Body of POST /me/meetings. clientRequestId makes retries / offline sync safe (no duplicates). */
export interface CreateMeetingInput {
  clientRequestId: string;
  clientId: string | null; // null = new client (created from the fields below)
  clientName: string;
  businessType: string;
  contactNumber: string | null;
  clientAddress?: string | null; // exact shop address typed by the salesman
  productIds: string[];
  dealValue: number;
  outcome: MeetingOutcome;
  note: string | null;
  nextVisit: string | null;
  whatsappReminder: boolean;
  checkInAt: string;
  checkOutAt?: string; // when the form was saved on the phone (offline visits sync later); default = now
  // Files uploaded first via POST /me/uploads; send back the returned paths.
  selfiePath?: string | null;
  voiceNote?: { path: string; seconds: number } | null;
  attachments?: { path: string; name: string; type: 'photo' | 'file'; sizeBytes: number }[];
  location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    address?: string | null; // looked up on the phone
  } | null;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Body of POST /me/attendance/toggle (location optional: GPS may be off). */
export interface PunchInput {
  location?: LatLng | null;
}

/** Body of POST /me/locations: GPS points buffered on the phone while punched in. */
export interface LocationPingsInput {
  pings: (LatLng & { accuracy: number | null; recordedAt: string })[];
}

/** Admin map: last known point today. */
export interface SalesmanLocation extends LatLng {
  salesmanId: string;
  salesmanName: string;
  accuracy: number | null;
  recordedAt: string;
  onDuty: boolean; // punched in right now
}

/** Admin: one salesman's day on the map. */
export interface DayRoute {
  salesmanId: string;
  date: string; // YYYY-MM-DD
  shifts: {
    punchInAt: string;
    punchOutAt: string | null;
    punchIn: LatLng | null;
    punchOut: LatLng | null;
  }[];
  points: (LatLng & { recordedAt: string })[];
  visits: (LatLng & { meetingId: string; clientName: string; checkInAt: string })[];
}

export type UploadKind = 'selfie' | 'photo' | 'voice' | 'file';

/** Body of POST /me/uploads */
export interface CreateUploadInput {
  kind: UploadKind;
  contentType: string; // e.g. image/jpeg, audio/mp4, application/pdf
  sizeBytes: number;
}

/** Then: PUT uploadUrl with the file as body and this Content-Type. Use `path` in the meeting. */
export interface UploadTicket {
  path: string;
  uploadUrl: string;
  contentType: string;
}

/** Body of POST /me/sync: visits saved offline, oldest first. */
export interface SyncInput {
  meetings: CreateMeetingInput[];
}

/** One result per sent visit, same order. created = new, duplicate = already synced before (safe to drop). */
export type SyncResult =
  | { clientRequestId: string; status: 'created' | 'duplicate'; meeting: Meeting }
  | { clientRequestId: string; status: 'error'; error: string; message: string };

/** Body of PATCH /me/meetings/:id: only the fields to change. */
export type UpdateMeetingInput = Partial<
  Pick<
    CreateMeetingInput,
    | 'clientName'
    | 'businessType'
    | 'contactNumber'
    | 'productIds'
    | 'dealValue'
    | 'outcome'
    | 'note'
    | 'nextVisit'
    | 'whatsappReminder'
  >
>;

/** Body of POST /admin/salesmen */
export interface CreateSalesmanInput {
  name: string;
  phone: string; // any format; server stores +91XXXXXXXXXX
}

export interface ApiErrorBody {
  error: string; // machine code, e.g. "not_registered"
  message: string; // human text
}

// ---------- Weekly Route Plan ----------

export type PlannedStopStatus = 'PENDING' | 'VISITED' | 'MISSED';

export interface PlannedStop {
  id: string;
  clientName: string;
  location: string;
  contactNumber: string | null;
  status: PlannedStopStatus;
  visitedMeetingId: string | null;
  visitedAt: string | null;
}

export interface WeeklyPlan {
  id: string;
  salesmanId: string;
  date: string; // YYYY-MM-DD
  stops: PlannedStop[];
}

export interface SetWeeklyPlanInput {
  date: string; // YYYY-MM-DD
  stops: {
    clientName: string;
    location: string;
    contactNumber?: string | null;
  }[];
}
