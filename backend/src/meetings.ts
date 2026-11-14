// Saving a visit. Used by POST /me/meetings (online) and POST /me/sync (offline queue).
import { prisma } from './db';
import { HttpError } from './http';
import { meetingInclude, OUTCOME_TO_DB, toMeeting } from './dto';
import { isOwnPath } from './storage';
import type { CreateMeetingInput, Meeting } from '../../src/types';

const MAX_AGE_MS = 30 * 24 * 3600_000; // offline visits older than this are refused

/** Phone times can't be in the future (wrong clock): clamp to now. Too old: refuse. */
function phoneTime(iso: string, now: number): Date {
  const t = new Date(iso).getTime();
  if (t < now - MAX_AGE_MS) throw new HttpError(400, 'too_old', 'This visit is more than 30 days old.');
  return new Date(Math.min(t, now));
}

async function findExisting(salesmanId: string, clientRequestId: string): Promise<Meeting | null> {
  const m = await prisma.meeting.findUnique({ where: { clientRequestId }, include: meetingInclude });
  if (m && m.salesmanId !== salesmanId) throw new HttpError(409, 'conflict', 'Duplicate request id.');
  return m && toMeeting(m);
}

/** Idempotent: the same clientRequestId always gives back the same meeting. */
export async function saveMeeting(salesmanId: string, b: CreateMeetingInput): Promise<{ meeting: Meeting; created: boolean }> {
  const name = b.clientName.trim();
  const businessType = b.businessType.trim();
  if (!name || !businessType) throw new HttpError(400, 'invalid', 'Client name and business type are required.');

  // Files must be this salesman's own uploads of the right kind (path = <salesmanId>/<kind>/...).
  const files: [string | null | undefined, string[]][] = [
    [b.selfiePath, ['selfie']],
    [b.voiceNote?.path, ['voice']],
    ...(b.attachments ?? []).map((a): [string, string[]] => [a.path, a.type === 'photo' ? ['photo'] : ['file', 'photo']]),
  ];
  for (const [path, kinds] of files) {
    if (path && !kinds.some((k) => isOwnPath(salesmanId, path) && path.startsWith(`${salesmanId}/${k}/`))) {
      throw new HttpError(400, 'invalid_file', 'An attached file is not valid. Please attach it again.');
    }
  }

  const existing = await findExisting(salesmanId, b.clientRequestId);
  if (existing) return { meeting: existing, created: false };

  const now = Date.now();
  const checkInAt = phoneTime(b.checkInAt, now);
  const checkOutAt = b.checkOutAt ? phoneTime(b.checkOutAt, now) : new Date(now);
  if (checkOutAt < checkInAt) checkOutAt.setTime(checkInAt.getTime());

  const meeting = await prisma
    .$transaction(async (tx) => {
      let clientId = b.clientId;
      let isNewClient = false;
      const address = b.clientAddress?.trim() || null; // shop address typed by the salesman
      if (clientId) {
        // Existing client must be mine.
        const owned = await tx.client.findFirst({ where: { id: clientId, salesmanId }, select: { id: true } });
        if (!owned) throw new HttpError(404, 'not_found', 'Client not found.');
      } else {
        // New client: reuse my client with the same name + type, so two offline visits to one new shop
        // don't create two copies of it.
        const same = await tx.client.findFirst({
          where: { salesmanId, name: { equals: name, mode: 'insensitive' }, businessType: { equals: businessType, mode: 'insensitive' } },
          select: { id: true },
        });
        clientId =
          same?.id ??
          (await tx.client.create({ data: { salesmanId, name, businessType, contactNumber: b.contactNumber?.trim() || null, address }, select: { id: true } })).id;
        isNewClient = !same;
      }
      // Typed address fills an existing client's empty address (an address already saved is not overwritten).
      if (address && !isNewClient) await tx.client.updateMany({ where: { id: clientId, salesmanId, address: null }, data: { address } });
      // Visiting the client again completes the pending follow-ups for them (a new one comes from nextVisit below).
      if (!isNewClient) await tx.followUp.updateMany({ where: { salesmanId, clientId, status: 'PENDING' }, data: { status: 'DONE' } });
      const nextVisitAt = b.nextVisit ? new Date(b.nextVisit) : null;
      const m = await tx.meeting.create({
        data: {
          clientRequestId: b.clientRequestId,
          salesmanId,
          clientId,
          checkInAt,
          checkInLat: b.location?.latitude ?? null,
          checkInLng: b.location?.longitude ?? null,
          checkInAccuracy: b.location?.accuracy ?? null,
          checkInAddress: b.location?.address?.trim() || null,
          checkOutAt,
          outcome: OUTCOME_TO_DB[b.outcome],
          dealValue: b.dealValue,
          note: b.note?.trim() || null,
          nextVisitAt,
          whatsappReminder: b.whatsappReminder,
          products: { connect: b.productIds.map((id) => ({ id })) },
          selfieUrl: b.selfiePath ?? null, // column holds the storage path
          voiceNoteUrl: b.voiceNote?.path ?? null,
          voiceNoteSeconds: b.voiceNote?.seconds ?? null,
          attachments: { create: (b.attachments ?? []).map((a) => ({ url: a.path, name: a.name, type: a.type === 'photo' ? 'PHOTO' : 'FILE', sizeBytes: a.sizeBytes })) },
        },
        include: meetingInclude,
      });
      if (nextVisitAt) await tx.followUp.create({ data: { salesmanId, clientId, meetingId: m.id, dueAt: nextVisitAt } });
      // Mark matching planned route stop as VISITED if scheduled for today
      try {
        const todayDate = new Date(Date.UTC(checkInAt.getUTCFullYear(), checkInAt.getUTCMonth(), checkInAt.getUTCDate()));
        const plan = await tx.weeklyPlan.findFirst({
          where: { salesmanId, date: todayDate },
          include: { stops: { where: { status: 'PENDING' } } },
        });
        if (plan && plan.stops.length) {
          const norm = (s: string) => s.toLowerCase().trim();
          const targetName = norm(b.clientName);
          const matched = plan.stops.find((s) => norm(s.clientName) === targetName || targetName.includes(norm(s.clientName)) || norm(s.clientName).includes(targetName));
          if (matched) {
            await tx.plannedStop.update({
              where: { id: matched.id },
              data: { status: 'VISITED', visitedMeetingId: m.id, visitedAt: checkInAt },
            });
          }
        }
      } catch {}
      return m;
    })
    .catch((e: { code?: string }) => {
      // Two copies of the same request at once: the loser returns the winner's meeting.
      if (e.code === 'P2002') return null;
      throw e;
    });
  if (meeting) return { meeting: toMeeting(meeting), created: true };
  const winner = await findExisting(salesmanId, b.clientRequestId);
  if (!winner) throw new HttpError(409, 'conflict', 'Please try again.');
  return { meeting: winner, created: false };
}
