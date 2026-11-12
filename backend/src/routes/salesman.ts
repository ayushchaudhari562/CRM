// Salesman API. Every query is filtered by the logged-in salesman: they only ever see their own data.
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { authenticate, HttpError, requireRole } from '../auth';
import { editableUntil, followUpInclude, istToday, meetingInclude, OUTCOME_TO_DB, toFollowUp, toMeeting } from '../dto';
import { followUpQuery, salesmanTargets } from '../planning';
import { clientSearchQuery, createMeetingBody, createUploadBody, followUpsQuery, locationPingsBody, punchBody, syncBody, idParam, meetingsQuery, setMyTargetBody, targetsQuery, updateFollowUpBody, updateMeetingBody } from '../schemas';
import { saveMeeting } from '../meetings';
import { createUpload, withFileUrls } from '../storage';
import { savePings } from '../tracking';
import { MEETING_FIELD_GROUP, SALESMAN_EDITABLE } from '../../../src/config';
import type { ClientDetail, CreateMeetingInput, FollowUpScope, CreateUploadInput, LocationPingsInput, PunchInput, SalesmanHome, SetMyTargetInput, SyncInput, SyncResult, UpdateFollowUpInput, UpdateMeetingInput } from '../../../src/types';

export async function salesmanRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);
  app.addHook('onRequest', requireRole('SALESMAN'));

  app.get('/me/home', async (req): Promise<SalesmanHome> => {
    const me = req.user!;
    const { start, end, date } = istToday();
    const [visitsDone, target, followUps, punch] = await Promise.all([
      prisma.meeting.count({ where: { salesmanId: me.id, checkInAt: { gte: start, lt: end } } }),
      prisma.target.findUnique({ where: { salesmanId_date: { salesmanId: me.id, date } } }),
      prisma.followUp.findMany({
        where: { salesmanId: me.id, status: 'PENDING', dueAt: { gte: start, lt: end } },
        include: followUpInclude,
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

  app.get<{ Querystring: { scope: FollowUpScope; limit: number } }>('/me/followups', { schema: followUpsQuery }, async (req) => {
    const { where, orderBy } = followUpQuery(req.query.scope);
    const rows = await prisma.followUp.findMany({
      where: { ...where, salesmanId: req.user!.id },
      include: followUpInclude,
      orderBy,
      take: req.query.limit,
    });
    return rows.map((f) => toFollowUp(f));
  });

  // Close (Done / Cancelled) or reschedule one of MY pending follow-ups.
  app.patch<{ Params: { id: string }; Body: UpdateFollowUpInput }>('/me/followups/:id', { schema: updateFollowUpBody }, async (req) => {
    const me = req.user!;
    const { status, dueAt } = req.body;
    const newDue = dueAt ? new Date(dueAt) : null;
    if (newDue && newDue.getTime() < Date.now() - 5 * 60_000) throw new HttpError(400, 'invalid', 'Pick a time in the future.');
    // One atomic query: only matches if it is mine AND still pending.
    const { count } = await prisma.followUp.updateMany({
      where: { id: req.params.id, salesmanId: me.id, status: 'PENDING' },
      data: newDue ? { dueAt: newDue } : { status: status === 'Done' ? 'DONE' : 'CANCELLED' },
    });
    const row = await prisma.followUp.findFirst({ where: { id: req.params.id, salesmanId: me.id }, include: followUpInclude });
    if (!row) throw new HttpError(404, 'not_found', 'Follow-up not found.');
    if (!count) throw new HttpError(409, 'already_closed', 'This follow-up is already closed.');
    return toFollowUp(row);
  });

  app.get<{ Querystring: { days: number } }>('/me/targets', { schema: targetsQuery }, async (req) =>
    salesmanTargets(req.user!.id, req.query.days),
  );

  // The salesman sets their own target for today (create or overwrite). Returns today's progress.
  app.put<{ Body: SetMyTargetInput }>('/me/target', { schema: setMyTargetBody }, async (req) => {
    const salesmanId = req.user!.id;
    const { date } = istToday();
    const { visitsTarget } = req.body;
    await prisma.target.upsert({ where: { salesmanId_date: { salesmanId, date } }, create: { salesmanId, date, visitsTarget }, update: { visitsTarget } });
    return (await salesmanTargets(salesmanId, 1))[0];
  });

  // Punch in if not punched in today, otherwise punch out.
  app.post<{ Body: PunchInput | null }>('/me/attendance/toggle', { schema: punchBody }, async (req) => {
    const me = req.user!;
    const { start, end } = istToday();
    const loc = req.body?.location ?? null;
    const open = await prisma.attendance.findFirst({
      where: { salesmanId: me.id, punchInAt: { gte: start, lt: end }, punchOutAt: null },
      select: { id: true },
    });
    if (open) {
      await prisma.attendance.update({
        where: { id: open.id },
        data: { punchOutAt: new Date(), punchOutLat: loc?.latitude ?? null, punchOutLng: loc?.longitude ?? null },
      });
      return { punchedInAt: null };
    }
    const row = await prisma.attendance.create({
      data: { salesmanId: me.id, punchInAt: new Date(), punchInLat: loc?.latitude ?? null, punchInLng: loc?.longitude ?? null },
    });
    return { punchedInAt: row.punchInAt.toISOString() };
  });

  // GPS points buffered on the phone. Stored only while on duty, at most 1 per minute.
  app.post<{ Body: LocationPingsInput }>('/me/locations', { schema: locationPingsBody }, async (req) => ({
    accepted: await savePings(req.user!.id, req.body.pings),
  }));

  app.get<{ Querystring: { range: 'today' | 'week' | 'all' } }>('/me/meetings', { schema: meetingsQuery }, async (req) => {
    const me = req.user!;
    const { start } = istToday();
    const { range } = req.query;
    const from = range === 'today' ? start : range === 'week' ? new Date(start.getTime() - 6 * 24 * 3600_000) : undefined;
    const rows = await prisma.meeting.findMany({
      where: { salesmanId: me.id, ...(from ? { checkInAt: { gte: from } } : {}) },
      include: meetingInclude,
      orderBy: { checkInAt: 'desc' },
      take: 200,
    });
    return withFileUrls(rows.map(toMeeting));
  });

  app.get<{ Querystring: { q?: string } }>('/me/clients', { schema: clientSearchQuery }, async (req) => {
    const me = req.user!;
    const q = (req.query.q ?? '').trim();
    const rows = await prisma.client.findMany({
      where: { salesmanId: me.id, ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
      select: { id: true, name: true, businessType: true, contactNumber: true, address: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
    return rows;
  });

  app.get<{ Params: { id: string } }>('/me/clients/:id', { schema: idParam }, async (req): Promise<ClientDetail> => {
    const me = req.user!;
    // salesmanId in the WHERE: another salesman's client id returns 404, not their data.
    const client = await prisma.client.findFirst({ where: { id: req.params.id, salesmanId: me.id } });
    if (!client) throw new HttpError(404, 'not_found', 'Client not found.');
    const [meetings, followUps] = await Promise.all([
      prisma.meeting.findMany({ where: { clientId: client.id, salesmanId: me.id }, include: meetingInclude, orderBy: { checkInAt: 'desc' }, take: 50 }),
      prisma.followUp.findMany({ where: { clientId: client.id, salesmanId: me.id }, include: followUpInclude, orderBy: { dueAt: 'desc' }, take: 50 }),
    ]);
    return {
      id: client.id,
      name: client.name,
      businessType: client.businessType,
      contactNumber: client.contactNumber,
      address: client.address,
      meetings: await withFileUrls(meetings.map(toMeeting)),
      followUps: followUps.map((f) => toFollowUp(f)),
    };
  });

  app.get('/products', async () => {
    return prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  });

  app.post<{ Body: CreateMeetingInput }>('/me/meetings', { schema: createMeetingBody }, async (req) => {
    const [meeting] = await withFileUrls([(await saveMeeting(req.user!.id, req.body)).meeting]);
    return meeting;
  });

  // Offline queue: visits saved without network, sent together (oldest first). Each one is saved on its own,
  // so one bad visit never blocks the rest. Safe to resend: already-synced visits come back as 'duplicate'.
  app.post<{ Body: SyncInput }>('/me/sync', { schema: syncBody }, async (req): Promise<SyncResult[]> => {
    const results: SyncResult[] = [];
    for (const input of req.body.meetings) {
      try {
        const { meeting, created } = await saveMeeting(req.user!.id, input);
        results.push({ clientRequestId: input.clientRequestId, status: created ? 'created' : 'duplicate', meeting });
      } catch (e) {
        const known = e instanceof HttpError ? e : (e as { code?: string }).code === 'P2025' ? new HttpError(400, 'invalid', 'A product no longer exists.') : null;
        if (!known) req.log.error(e);
        results.push({ clientRequestId: input.clientRequestId, status: 'error', error: known?.code ?? 'server_error', message: known?.message ?? 'Could not save. Will retry.' });
      }
    }
    // Sign all returned files in one storage call.
    const ok = results.filter((r) => r.status !== 'error');
    const signed = await withFileUrls(ok.map((r) => r.meeting));
    ok.forEach((r, i) => (r.meeting = signed[i]!));
    return results;
  });

  // Step 1 of attaching a file: get a one-time upload URL. Step 2: phone PUTs the file there.
  // Step 3: send the returned path with the meeting (selfiePath / voiceNote / attachments).
  app.post<{ Body: CreateUploadInput }>('/me/uploads', { schema: createUploadBody }, async (req) =>
    createUpload(req.user!.id, req.body.kind, req.body.contentType, req.body.sizeBytes),
  );

  // Edit one of MY visits. Rules (which fields, how long) come from src/config.ts and are enforced HERE.
  app.patch<{ Params: { id: string }; Body: UpdateMeetingInput }>('/me/meetings/:id', { schema: updateMeetingBody }, async (req) => {
    const me = req.user!;
    const b = req.body;
    const fields = Object.keys(b) as (keyof UpdateMeetingInput)[];
    // Unknown fields (e.g. selfie, GPS) are stripped by the schema, so an empty list means nothing editable was sent.
    if (!fields.length) throw new HttpError(400, 'invalid', 'Nothing to change. Visit proof can never be edited.');
    const locked = fields.filter((f) => !SALESMAN_EDITABLE[MEETING_FIELD_GROUP[f]]);
    if (locked.length) throw new HttpError(403, 'field_locked', `These fields can't be edited: ${locked.join(', ')}.`);
    if (b.clientName !== undefined && !b.clientName.trim()) throw new HttpError(400, 'invalid', 'Client name is required.');
    if (b.businessType !== undefined && !b.businessType.trim()) throw new HttpError(400, 'invalid', 'Business type is required.');

    const meeting = await prisma.meeting.findFirst({ where: { id: req.params.id, salesmanId: me.id }, select: { id: true, clientId: true, createdAt: true } });
    if (!meeting) throw new HttpError(404, 'not_found', 'Visit not found.');
    if (!editableUntil(meeting.createdAt)) throw new HttpError(403, 'edit_window_over', 'This visit can no longer be edited.');

    const updated = await prisma.$transaction(async (tx) => {
      const client = {
        ...(b.clientName !== undefined && { name: b.clientName.trim() }),
        ...(b.businessType !== undefined && { businessType: b.businessType.trim() }),
        ...(b.contactNumber !== undefined && { contactNumber: b.contactNumber?.trim() || null }),
      };
      if (Object.keys(client).length) await tx.client.update({ where: { id: meeting.clientId }, data: client });

      // Keep this visit's pending follow-up in step with nextVisit.
      if (b.nextVisit !== undefined) {
        const due = b.nextVisit ? new Date(b.nextVisit) : null;
        const pending = { meetingId: meeting.id, status: 'PENDING' } as const;
        if (!due) await tx.followUp.updateMany({ where: pending, data: { status: 'CANCELLED' } });
        else if (!(await tx.followUp.updateMany({ where: pending, data: { dueAt: due } })).count) {
          await tx.followUp.create({ data: { salesmanId: me.id, clientId: meeting.clientId, meetingId: meeting.id, dueAt: due } });
        }
      }

      return tx.meeting.update({
        where: { id: meeting.id },
        data: {
          ...(b.outcome !== undefined && { outcome: OUTCOME_TO_DB[b.outcome] }),
          ...(b.dealValue !== undefined && { dealValue: b.dealValue }),
          ...(b.note !== undefined && { note: b.note?.trim() || null }),
          ...(b.nextVisit !== undefined && { nextVisitAt: b.nextVisit ? new Date(b.nextVisit) : null }),
          ...(b.whatsappReminder !== undefined && { whatsappReminder: b.whatsappReminder }),
          ...(b.productIds !== undefined && { products: { set: b.productIds.map((id) => ({ id })) } }),
        },
        include: meetingInclude,
      });
    });
    return (await withFileUrls([toMeeting(updated)]))[0];
  });
}
