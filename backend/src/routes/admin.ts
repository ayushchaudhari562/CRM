// Admin (manager) API. Sees all salesmen.
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { authenticate, forgetUser, HttpError, normalizePhone, requireRole } from '../auth';
import { followUpInclude, initials, istDay, istToday, meetingInclude, OUTCOME_TO_DB, toAppUser, toFollowUp, toMeeting } from '../dto';
import { dayTargets, followUpQuery } from '../planning';
import { withFileUrls } from '../storage';
import { audit } from '../audit';
import { revokeAllForUser } from '../sessions';
import { dayRoute, latestLocations } from '../tracking';
import { adminFollowUpsQuery, adminMeetingsQuery, adminTargetsQuery, createSalesmanBody, dayRouteQuery, idParam, setTargetBody } from '../schemas';
import type { AdminFollowUp, AdminOverview, CreateSalesmanInput, FieldStatus, FollowUpScope, MeetingOutcome, SalesmanProgress, SetTargetInput } from '../../../src/types';

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
    const status: FieldStatus = inMeeting ? 'In meeting' : punchedIn ? 'On the road' : s.attendance.length ? 'Day ended' : 'Not started';
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
  }).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name)); // working first
}

const STATUS_ORDER: Record<FieldStatus, number> = { 'In meeting': 0, 'On the road': 1, 'Day ended': 2, 'Not started': 3 };

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);
  app.addHook('onRequest', requireRole('ADMIN'));

  app.get('/admin/overview', async (): Promise<AdminOverview> => {
    const { start, end, date } = istToday();
    const now = new Date();
    const [progress, byOutcome, targets, followupsDue, followupsOverdue, remindersSent] = await Promise.all([
      todayProgress(),
      // Counted + summed in the DB: one small row per outcome instead of every meeting.
      prisma.meeting.groupBy({ by: ['outcome'], where: { checkInAt: { gte: start, lt: end } }, _count: true, _sum: { dealValue: true } }),
      prisma.target.aggregate({ where: { date, salesman: { isActive: true } }, _sum: { visitsTarget: true } }),
      prisma.followUp.count({ where: { status: 'PENDING', dueAt: { gte: now, lt: end } } }),
      prisma.followUp.count({ where: { status: 'PENDING', dueAt: { lt: now } } }),
      prisma.followUp.count({ where: { whatsappSentAt: { gte: start, lt: end } } }),
    ]);
    const outcome = (o: (typeof byOutcome)[number]['outcome']) => byOutcome.find((g) => g.outcome === o);
    const n = (o: Parameters<typeof outcome>[0]) => outcome(o)?._count ?? 0;
    const visitsDone = byOutcome.reduce((sum, g) => sum + g._count, 0);
    const count = (s: FieldStatus) => progress.filter((p) => p.status === s).length;
    return {
      salesmenCount: progress.length,
      visitsDone,
      visitsTarget: targets._sum.visitsTarget ?? 0,
      dealsClosed: n('CLOSED'),
      dealValueTotal: Number(outcome('CLOSED')?._sum.dealValue ?? 0),
      followupsDue,
      followupsOverdue,
      remindersSent,
      fieldStatus: { inMeeting: count('In meeting'), onRoad: count('On the road'), dayEnded: count('Day ended'), notStarted: count('Not started'), total: progress.length },
      outcomes: {
        interested: n('INTERESTED'),
        closed: n('CLOSED'),
        notInterested: n('NOT_INTERESTED'),
        total: visitsDone,
      },
    };
  });

  app.get('/admin/progress', async () => todayProgress());

  // Add a salesman. They can then log in with OTP on this phone number.
  app.post<{ Body: CreateSalesmanInput }>('/admin/salesmen', { schema: createSalesmanBody }, async (req) => {
    const name = req.body.name.trim();
    const digits = req.body.phone.replace(/\D/g, '');
    const phone = digits.length === 10 ? normalizePhone('91' + digits) : digits.length === 12 && digits.startsWith('91') ? normalizePhone(digits) : null;
    if (name.length < 2) throw new HttpError(400, 'invalid', 'Enter the full name.');
    if (!phone) throw new HttpError(400, 'invalid', 'Enter a valid 10-digit mobile number.');
    const exists = await prisma.user.findUnique({ where: { phone } });
    if (exists) throw new HttpError(409, 'phone_taken', 'This number is already registered.');
    const user = await prisma.user.create({ data: { name, phone, role: 'SALESMAN' } });
    await audit('salesman_added', req.user!.id, { salesmanId: user.id });
    return toAppUser(user);
  });

  // Deactivate a salesman: logged out on every phone at once; all their data is kept.
  app.post<{ Params: { id: string } }>('/admin/salesmen/:id/deactivate', { schema: idParam }, async (req) => {
    const s = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!s || s.role !== 'SALESMAN') throw new HttpError(404, 'not_found', 'Salesman not found.');
    await prisma.user.update({ where: { id: s.id }, data: { isActive: false } });
    const sessions = await revokeAllForUser(s.id);
    forgetUser(s.phone);
    await audit('salesman_deactivated', req.user!.id, { salesmanId: s.id, sessions });
    return { ok: true };
  });

  app.get<{ Querystring: { salesmanId?: string; limit: number; outcome?: MeetingOutcome; range?: 'today' } }>('/admin/meetings', { schema: adminMeetingsQuery }, async (req) => {
    const { limit, salesmanId, outcome, range } = req.query;
    const today = range === 'today' ? istToday() : null;
    const rows = await prisma.meeting.findMany({
      where: {
        ...(salesmanId ? { salesmanId } : {}),
        ...(outcome ? { outcome: OUTCOME_TO_DB[outcome] } : {}),
        ...(today ? { checkInAt: { gte: today.start, lt: today.end } } : {}),
      },
      include: meetingInclude,
      orderBy: { checkInAt: 'desc' },
      take: limit,
    });
    return withFileUrls(rows.map(toMeeting));
  });

  app.get<{ Params: { id: string } }>('/admin/meetings/:id', { schema: idParam }, async (req) => {
    const m = await prisma.meeting.findUnique({ where: { id: req.params.id }, include: meetingInclude });
    if (!m) throw new HttpError(404, 'not_found', 'Meeting not found.');
    return (await withFileUrls([toMeeting(m)]))[0];
  });

  app.get<{ Querystring: { scope: FollowUpScope; limit: number; salesmanId?: string } }>(
    '/admin/followups',
    { schema: adminFollowUpsQuery },
    async (req): Promise<AdminFollowUp[]> => {
      const { where, orderBy } = followUpQuery(req.query.scope);
      const rows = await prisma.followUp.findMany({
        where: { ...where, ...(req.query.salesmanId ? { salesmanId: req.query.salesmanId } : {}) },
        include: { ...followUpInclude, salesman: { select: { name: true } } },
        orderBy,
        take: req.query.limit,
      });
      return rows.map((f) => ({ ...toFollowUp(f), salesmanId: f.salesmanId, salesmanName: f.salesman.name }));
    },
  );

  // Target vs. achieved for all salesmen on one day (default today).
  app.get<{ Querystring: { date?: string } }>('/admin/targets', { schema: adminTargetsQuery }, async (req) =>
    dayTargets(req.query.date ?? istToday().day),
  );

  // Same target for one or many salesmen on one day (create or overwrite). Returns that day's progress.
  app.put<{ Body: SetTargetInput }>('/admin/targets', { schema: setTargetBody }, async (req) => {
    const { salesmanIds, visitsTarget, dealValueTarget } = req.body;
    const { date, day } = istDay(req.body.date);
    const valid = await prisma.user.count({ where: { id: { in: salesmanIds }, role: 'SALESMAN', isActive: true } });
    if (valid !== salesmanIds.length) throw new HttpError(400, 'invalid', 'Some salesmen were not found.');
    await prisma.$transaction(
      salesmanIds.map((salesmanId) =>
        prisma.target.upsert({
          where: { salesmanId_date: { salesmanId, date } },
          create: { salesmanId, date, visitsTarget, dealValueTarget },
          update: { visitsTarget, dealValueTarget },
        }),
      ),
    );
    return dayTargets(day);
  });

  // Map: last known point today for every salesman on duty.
  app.get('/admin/locations', async () => latestLocations());

  // One salesman's day on the map: shifts, GPS trail, visits.
  app.get<{ Params: { id: string }; Querystring: { date?: string } }>('/admin/salesmen/:id/route', { schema: dayRouteQuery }, async (req) => {
    const s = await prisma.user.findFirst({ where: { id: req.params.id, role: 'SALESMAN' }, select: { id: true } });
    if (!s) throw new HttpError(404, 'not_found', 'Salesman not found.');
    return dayRoute(s.id, req.query.date ?? istToday().day);
  });
}
