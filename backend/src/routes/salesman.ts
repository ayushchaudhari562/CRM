// Salesman API. Every query is filtered by the logged-in salesman: they only ever see their own data.
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { authenticate, HttpError, requireRole } from '../auth';
import { istToday, meetingInclude, OUTCOME_TO_DB, toFollowUp, toMeeting } from '../dto';
import type { ClientDetail, CreateMeetingInput, SalesmanHome } from '../../../src/types';

const OUTCOMES = Object.keys(OUTCOME_TO_DB);

export async function salesmanRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('SALESMAN'));

  app.get('/me/home', async (req): Promise<SalesmanHome> => {
    const me = req.user!;
    const { start, end, date } = istToday();
    const [visitsDone, target, followUps, punch] = await Promise.all([
      prisma.meeting.count({ where: { salesmanId: me.id, checkInAt: { gte: start, lt: end } } }),
      prisma.target.findUnique({ where: { salesmanId_date: { salesmanId: me.id, date } } }),
      prisma.followUp.findMany({
        where: { salesmanId: me.id, status: 'PENDING', dueAt: { gte: start, lt: end } },
        include: { client: true },
        orderBy: { dueAt: 'asc' },
      }),
      prisma.attendance.findFirst({
        where: { salesmanId: me.id, punchInAt: { gte: start, lt: end }, punchOutAt: null },
        orderBy: { punchInAt: 'desc' },
      }),
    ]);
    return {
      visitsDone,
      visitsTarget: target?.visitsTarget ?? 0,
      followUpsToday: followUps.map((f) => toFollowUp(f)),
      punchedInAt: punch?.punchInAt.toISOString() ?? null,
    };
  });

  // Punch in if not punched in today, otherwise punch out.
  app.post('/me/attendance/toggle', async (req) => {
    const me = req.user!;
    const { start, end } = istToday();
    const open = await prisma.attendance.findFirst({
      where: { salesmanId: me.id, punchInAt: { gte: start, lt: end }, punchOutAt: null },
    });
    if (open) {
      await prisma.attendance.update({ where: { id: open.id }, data: { punchOutAt: new Date() } });
      return { punchedInAt: null };
    }
    const row = await prisma.attendance.create({ data: { salesmanId: me.id, punchInAt: new Date() } });
    return { punchedInAt: row.punchInAt.toISOString() };
  });

  app.get<{ Querystring: { range?: string } }>('/me/meetings', async (req) => {
    const me = req.user!;
    const { start } = istToday();
    const range = req.query.range ?? 'all';
    const from = range === 'today' ? start : range === 'week' ? new Date(start.getTime() - 6 * 24 * 3600_000) : undefined;
    const rows = await prisma.meeting.findMany({
      where: { salesmanId: me.id, ...(from ? { checkInAt: { gte: from } } : {}) },
      include: meetingInclude,
      orderBy: { checkInAt: 'desc' },
      take: 200,
    });
    return rows.map(toMeeting);
  });

  app.get<{ Querystring: { q?: string } }>('/me/clients', async (req) => {
    const me = req.user!;
    const q = (req.query.q ?? '').trim();
    const rows = await prisma.client.findMany({
      where: { salesmanId: me.id, ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
      orderBy: { name: 'asc' },
      take: 50,
    });
    return rows.map(({ id, name, businessType, contactNumber, address }) => ({ id, name, businessType, contactNumber, address }));
  });

  app.get<{ Params: { id: string } }>('/me/clients/:id', async (req): Promise<ClientDetail> => {
    const me = req.user!;
    // salesmanId in the WHERE: another salesman's client id returns 404, not their data.
    const client = await prisma.client.findFirst({ where: { id: req.params.id, salesmanId: me.id } });
    if (!client) throw new HttpError(404, 'not_found', 'Client not found.');
    const [meetings, followUps] = await Promise.all([
      prisma.meeting.findMany({ where: { clientId: client.id, salesmanId: me.id }, include: meetingInclude, orderBy: { checkInAt: 'desc' } }),
      prisma.followUp.findMany({ where: { clientId: client.id, salesmanId: me.id }, include: { client: true }, orderBy: { dueAt: 'desc' } }),
    ]);
    return {
      id: client.id,
      name: client.name,
      businessType: client.businessType,
      contactNumber: client.contactNumber,
      address: client.address,
      meetings: meetings.map(toMeeting),
      followUps: followUps.map((f) => toFollowUp(f)),
    };
  });

  app.get('/products', async () => {
    return prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  });

  app.post<{ Body: CreateMeetingInput }>('/me/meetings', async (req) => {
    const me = req.user!;
    const b = req.body;
    if (!b?.clientRequestId || !b.clientName?.trim() || !b.businessType?.trim()) {
      throw new HttpError(400, 'invalid', 'Client name and business type are required.');
    }
    if (!OUTCOMES.includes(b.outcome)) throw new HttpError(400, 'invalid', 'Invalid outcome.');
    if (!(Number.isFinite(b.dealValue) && b.dealValue >= 0)) throw new HttpError(400, 'invalid', 'Invalid deal value.');

    // Same clientRequestId sent again (retry / offline sync) -> return the existing meeting.
    const existing = await prisma.meeting.findUnique({ where: { clientRequestId: b.clientRequestId }, include: meetingInclude });
    if (existing) {
      if (existing.salesmanId !== me.id) throw new HttpError(409, 'conflict', 'Duplicate request id.');
      return toMeeting(existing);
    }

    const meeting = await prisma.$transaction(async (tx) => {
      // Existing client must belong to this salesman; otherwise create a new one.
      let clientId = b.clientId;
      if (clientId) {
        const owned = await tx.client.findFirst({ where: { id: clientId, salesmanId: me.id } });
        if (!owned) throw new HttpError(404, 'not_found', 'Client not found.');
      } else {
        const created = await tx.client.create({
          data: { salesmanId: me.id, name: b.clientName.trim(), businessType: b.businessType.trim(), contactNumber: b.contactNumber?.trim() || null },
        });
        clientId = created.id;
      }
      const nextVisitAt = b.nextVisit ? new Date(b.nextVisit) : null;
      const m = await tx.meeting.create({
        data: {
          clientRequestId: b.clientRequestId,
          salesmanId: me.id,
          clientId,
          checkInAt: new Date(b.checkInAt),
          checkInLat: b.location?.latitude ?? null,
          checkInLng: b.location?.longitude ?? null,
          checkInAccuracy: b.location?.accuracy ?? null,
          checkOutAt: new Date(),
          outcome: OUTCOME_TO_DB[b.outcome],
          dealValue: b.dealValue,
          note: b.note?.trim() || null,
          nextVisitAt,
          whatsappReminder: b.whatsappReminder,
          products: { connect: (b.productIds ?? []).map((id) => ({ id })) },
        },
        include: meetingInclude,
      });
      if (nextVisitAt) {
        await tx.followUp.create({ data: { salesmanId: me.id, clientId, meetingId: m.id, dueAt: nextVisitAt } });
      }
      return m;
    });
    return toMeeting(meeting);
  });
}
