import type {
  Client,
  Meeting,
  Reminder,
  Salesman,
  SalesmanProgress,
  VisitStats,
} from '../types';

export const APP_NAME = 'Sales CRM';

export const currentUser: Salesman = {
  id: 'sm-1',
  name: 'Salesman A',
  initials: 'SA',
  role: 'salesman',
  phone: '+91 98765 43210',
};

export const adminUser: Salesman = {
  id: 'ad-1',
  name: 'Manager',
  initials: 'MG',
  role: 'admin',
};

export const clients: Client[] = [
  { id: 'c-1', salesmanId: 'sm-1', name: 'Client A', businessType: 'Kirana store', contactNumber: '+91 90000 00001' },
  { id: 'c-2', salesmanId: 'sm-1', name: 'Client B', businessType: 'Hardware shop', contactNumber: '+91 90000 00002' },
  { id: 'c-3', salesmanId: 'sm-1', name: 'Client C', businessType: 'Pharmacy', contactNumber: '+91 90000 00003' },
  { id: 'c-4', salesmanId: 'sm-1', name: 'Client D', businessType: 'Kirana store', contactNumber: '+91 90000 00004' },
  { id: 'c-5', salesmanId: 'sm-1', name: 'Client E', businessType: 'Hardware shop', contactNumber: '+91 90000 00005' },
  { id: 'c-6', salesmanId: 'sm-2', name: 'Client F', businessType: 'Pharmacy', contactNumber: '+91 90000 00006' },
  { id: 'c-7', salesmanId: 'sm-2', name: 'Client G', businessType: 'Stationery', contactNumber: '+91 90000 00007' },
];

export const products = ['Product 1', 'Product 2', 'Product 3', 'Product 4', 'Product 5'];

export const meetings: Meeting[] = [
  {
    id: 'm-1',
    salesmanId: 'sm-1',
    clientName: 'Client D',
    businessType: 'Kirana store',
    contactNumber: '+91 90000 00004',
    products: ['Product 1'],
    dealValue: 0,
    outcome: 'Not interested',
    voiceNoteUrl: undefined,
    voiceNoteDuration: undefined,
    aiSummary: undefined,
    nextVisit: undefined,
    whatsappReminder: false,
    attachments: [],
    location: { latitude: 19.076, longitude: 72.8777 },
    createdAt: '2026-11-10T09:40:00Z',
    updatedAt: '2026-11-10T09:40:00Z',
  },
  {
    id: 'm-2',
    salesmanId: 'sm-1',
    clientName: 'Client E',
    businessType: 'Hardware shop',
    contactNumber: '+91 90000 00005',
    products: ['Product 2'],
    dealValue: 0,
    outcome: 'Interested',
    voiceNoteUrl: undefined,
    voiceNoteDuration: undefined,
    aiSummary: undefined,
    nextVisit: undefined,
    whatsappReminder: false,
    attachments: [],
    location: { latitude: 19.076, longitude: 72.8777 },
    createdAt: '2026-11-10T10:20:00Z',
    updatedAt: '2026-11-10T10:20:00Z',
  },
  {
    id: 'm-3',
    salesmanId: 'sm-1',
    clientName: 'Client A',
    businessType: 'Kirana store',
    contactNumber: '+91 90000 00001',
    products: ['Product 1', 'Product 2'],
    dealValue: 25000,
    outcome: 'Closed',
    voiceNoteUrl: 'mock://voice/m-3',
    voiceNoteDuration: 24,
    aiSummary:
      'Client ko rate thoda zyada laga. Sample dekhna chahta hai. 7 din baad dobara milne ko bola.',
    nextVisit: '2026-11-15T11:00:00Z',
    whatsappReminder: true,
    attachments: [],
    location: { latitude: 19.076, longitude: 72.8777 },
    createdAt: '2026-11-10T11:02:00Z',
    updatedAt: '2026-11-10T11:02:00Z',
  },
  {
    id: 'm-4',
    salesmanId: 'sm-2',
    clientName: 'Client F',
    businessType: 'Pharmacy',
    contactNumber: '+91 90000 00006',
    products: ['Product 3'],
    dealValue: 0,
    outcome: 'Interested',
    voiceNoteUrl: undefined,
    voiceNoteDuration: undefined,
    aiSummary: undefined,
    nextVisit: undefined,
    whatsappReminder: false,
    attachments: [],
    location: { latitude: 19.076, longitude: 72.8777 },
    createdAt: '2026-11-10T12:15:00Z',
    updatedAt: '2026-11-10T12:15:00Z',
  },
];

export const reminders: Reminder[] = [
  {
    id: 'r-1',
    salesmanId: 'sm-1',
    meetingId: 'm-3',
    clientName: 'Client A',
    type: 'Follow-up',
    time: '11:00 AM',
    status: 'Due',
  },
  {
    id: 'r-2',
    salesmanId: 'sm-2',
    meetingId: 'm-4',
    clientName: 'Client F',
    type: 'Call back',
    time: '1:30 PM',
    status: 'Due',
  },
  {
    id: 'r-3',
    salesmanId: 'sm-1',
    meetingId: 'm-1',
    clientName: 'Client C',
    type: 'Visit',
    time: '4:00 PM',
    status: 'Due',
  },
];

export const adminSalesmen: Salesman[] = [
  { id: 'sm-1', name: 'Salesman A', initials: 'SA', role: 'salesman' },
  { id: 'sm-2', name: 'Salesman B', initials: 'SB', role: 'salesman' },
  { id: 'sm-3', name: 'Salesman C', initials: 'SC', role: 'salesman' },
  { id: 'sm-4', name: 'Salesman D', initials: 'SD', role: 'salesman' },
];

export const salesmanProgress: SalesmanProgress[] = [
  { id: 'sm-1', name: 'Salesman A', initials: 'SA', visits: 8, lastUpdated: '12 min ago', dealValue: 25000 },
  { id: 'sm-2', name: 'Salesman B', initials: 'SB', visits: 6, lastUpdated: '25 min ago', dealValue: 12500 },
  { id: 'sm-3', name: 'Salesman C', initials: 'SC', visits: 5, lastUpdated: '1 hr ago', dealValue: 8000 },
  { id: 'sm-4', name: 'Salesman D', initials: 'SD', visits: 0, lastUpdated: 'not started', dealValue: 0 },
];

export const visitStats: VisitStats = {
  visitsDone: 86,
  target: 120,
  dealsClosed: 14,
  dealValue: 380000,
};

export const adminOverview = {
  visitsDone: 86,
  visitsTarget: 120,
  dealsClosed: 14,
  dealValueTotal: 380000,
  followupsDue: 9,
  followupsOverdue: 3,
  remindersSent: 6,
  fieldStatus: {
    inMeeting: 5,
    onRoad: 4,
    notStarted: 3,
    total: 12,
  },
  outcomes: {
    interested: 41,
    closed: 14,
    notInterested: 31,
    total: 86,
  },
};
