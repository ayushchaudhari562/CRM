// Admin (manager) API. Sees all salesmen.
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { authenticate, HttpError, normalizePhone, requireRole } from '../auth';
import { initials, istToday, meetingInclude, toAppUser, toMeeting } from '../dto';
import type { AdminOverview, CreateSalesmanInput, FieldStatus, SalesmanProgress } from '../../../src/types';

/** Today's field status + numbers for every active salesman. Used by overview and monitoring. */
async function todayProgress(): Promise<SalesmanProgress[]> {
  const { start, end } = istToday();
  const salesmen = await prisma.user.findMany({
    where: { role: 'SALESMAN', isActive: true },
    orderBy: { name: 'asc' },
    include: {
      meetings: { where: { checkInAt: { gte: start, lt: end } }, select: { id: true, outcome: true, dealValue: true, checkInAt: true, checkOutAt: true }, orderBy: { checkInAt: 'desc' } },
      attendance: { where: { punchInAt: { gte: start, lt: end } }, select: { punchOutAt: true } },
      locationPings: { where: { recordedAt: { gte: start, lt: end } }, orderBy: { recordedAt: 'desc' }, take: 1, select: { recordedAt: true } },
    },
  });

  return salesmen.map((s) => {
    const inMeeting = s.meetings.some((m) => m.checkOutAt === null);
    const punchedIn = s.attendance.some((a) => a.punchOutAt === null);
    const status: FieldStatus = inMeeting ? 'In meeting' : punchedIn ? 'On the road' : 'Not started';
    const times = [...s.meetings.map((m) => m.checkInAt), ...s.locationPings.map((p) => p.recordedAt)];
    const last = times.length ? new Date(Math.max(...times.map((t) => t.getTime()))) : null;
    return {
      id: s.id,
      name: s.name,
      initials: initials(s.name),
      status,
      visits: s.meetings.length,
      dealValue: s.meetings.filter((m) => m.outcome === 'CLOSED').reduce((sum, m) => sum + Number(m.dealValue), 0),
      lastActivityAt: last?.toISOString() ?? null,
      lastMeetingId: s.meetings[0]?.id ?? null,
    };
  });
}

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('ADMIN'));

  app.get('/admin/overview', async (): Promise<AdminOverview> => {
    const { start, end, date } = istToday();
    const now = new Date();
    const [progress, meetings, targets, followupsDue, followupsOverdue, remindersSent] = await Promise.all([
      todayProgress(),
      prisma.meeting.findMany({ where: { checkInAt: { gte: start, lt: end } }, select: { outcome: true, dealValue: true } }),
      prisma.target.aggregate({ where: { date, salesman: { isActive: true } }, _sum: { visitsTarget: true } }),
      prisma.followUp.count({ where: { status: 'PENDING', dueAt: { gte: now, lt: end } } }),
      prisma.followUp.count({ where: { status: 'PENDING', dueAt: { lt: now } } }),
      prisma.followUp.count({ where: { whatsappSentAt: { gte: start, lt: end } } }),
    ]);
    const closed = meetings.filter((m) => m.outcome === 'CLOSED');
    const count = (s: FieldStatus) => progress.filter((p) => p.status === s).length;
    return {
      salesmenCount: progress.length,
      visitsDone: meetings.length,
      visitsTarget: targets._sum.visitsTarget ?? 0,
      dealsClosed: closed.length,
      dealValueTotal: closed.reduce((sum, m) => sum + Number(m.dealValue), 0),
      followupsDue,
      followupsOverdue,
      remindersSent,
      fieldStatus: { inMeeting: count('In meeting'), onRoad: count('On the road'), notStarted: count('Not started'), total: progress.length },
      outcomes: {
        interested: meetings.filter((m) => m.outcome === 'INTERESTED').length,
        closed: closed.length,
        notInterested: meetings.filter((m) => m.outcome === 'NOT_INTERESTED').length,
        total: meetings.length,
      },
    };
  });

  app.get('/admin/progress', async () => todayProgress());

  // Add a salesman. They can then log in with OTP on this phone number.
  app.post<{ Body: CreateSalesmanInput }>('/admin/salesmen', async (req) => {
    const name = req.body?.name?.trim() ?? '';
    const digits = (req.body?.phone ?? '').replace(/\D/g, '');
    const phone = digits.length === 10 ? normalizePhone('91' + digits) : digits.length === 12 && digits.startsWith('91') ? normalizePhone(digits) : null;
    if (name.length < 2) throw new HttpError(400, 'invalid', 'Enter the full name.');
    if (!phone) throw new HttpError(400, 'invalid', 'Enter a valid 10-digit mobile number.');
    const exists = await prisma.user.findUnique({ where: { phone } });
    if (exists) throw new HttpError(409, 'phone_taken', 'This number is already registered.');
    const user = await prisma.user.create({ data: { name, phone, role: 'SALESMAN' } });
    return toAppUser(user);
  });

  app.get<{ Querystring: { salesmanId?: string; limit?: string } }>('/admin/meetings', async (req) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = await prisma.meeting.findMany({
      where: req.query.salesmanId ? { salesmanId: req.query.salesmanId } : {},
      include: meetingInclude,
      orderBy: { checkInAt: 'desc' },
      take: limit,
    });
    return rows.map(toMeeting);
  });

  app.get<{ Params: { id: string } }>('/admin/meetings/:id', async (req) => {
    const m = await prisma.meeting.findUnique({ where: { id: req.params.id }, include: meetingInclude });
    if (!m) throw new HttpError(404, 'not_found', 'Meeting not found.');
    return toMeeting(m);
  });
}
