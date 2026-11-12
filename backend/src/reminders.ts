// WhatsApp reminder to the salesman's login number at 8 am on the day of a follow-up (approved "reminder" template:
// "Good morning {{1}}! Today's task: visit {{2}} at {{3}}. - JTA Manager").
// Flow per follow-up: claim (reminderClaimedAt) -> send -> mark sent, or schedule a retry, or give up.
// A claim older than 5 minutes means a run crashed mid-send: the follow-up is picked up again
// (at-least-once: in that rare case the salesman may get the reminder twice).
import { prisma } from './db';
import { env } from './env';
import { istToday } from './dto';
import { MessagingError, sendTemplate, type SendTemplate } from './messaging';

export const REMINDER_HOUR_IST = 8; // 8:00 am India time
export const MAX_ATTEMPTS = 8;
const STALE_CLAIM_MS = 5 * 60_000;
const BATCH = 50;
const IST = 5.5 * 3600_000;

/** "11:00 am" in India time. */
export function istTime(d: Date): string {
  const [h, m] = new Date(d.getTime() + IST).toISOString().slice(11, 16).split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** Wait before retry n (1, 2, 4 ... minutes, max 60), or what the provider asked for. */
const backoffMs = (attempt: number, retryAfterSec?: number) =>
  Math.max((retryAfterSec ?? 0) * 1000, Math.min(60, 2 ** (attempt - 1)) * 60_000);

/** Sends today's due reminders (from 8 am IST until the follow-up time). Returns how many were sent. */
export async function sendDueReminders(now = new Date(), send: SendTemplate = sendTemplate): Promise<number> {
  const { start, end } = istToday(now);
  if (now.getTime() < start.getTime() + REMINDER_HOUR_IST * 3600_000) return 0; // before 8 am
  const stale = new Date(now.getTime() - STALE_CLAIM_MS);
  const due = await prisma.followUp.findMany({
    where: {
      status: 'PENDING',
      whatsappSentAt: null,
      reminderFailedAt: null,
      dueAt: { gte: now, lt: end },
      meeting: { whatsappReminder: true },
      salesman: { isActive: true, whatsappOptOut: false },
      AND: [
        { OR: [{ reminderNextAt: null }, { reminderNextAt: { lte: now } }] },
        { OR: [{ reminderClaimedAt: null }, { reminderClaimedAt: { lt: stale } }] },
      ],
    },
    select: {
      id: true,
      dueAt: true,
      reminderAttempts: true,
      client: { select: { name: true } },
      salesman: { select: { phone: true, name: true } },
    },
    orderBy: { dueAt: 'asc' },
    take: BATCH,
  });

  let sent = 0;
  for (const f of due) {
    // Claim first, so two servers (or overlapping runs) never send the same reminder.
    const claimed = await prisma.followUp.updateMany({
      where: { id: f.id, whatsappSentAt: null, OR: [{ reminderClaimedAt: null }, { reminderClaimedAt: { lt: stale } }] },
      data: { reminderClaimedAt: now },
    });
    if (!claimed.count) continue;

    try {
      await send(f.salesman.phone, 'reminder', [f.salesman.name, f.client.name, istTime(f.dueAt)]);
      await prisma.followUp.updateMany({
        where: { id: f.id },
        data: { whatsappSentAt: new Date(), reminderClaimedAt: null, reminderError: null },
      });
      sent++;
    } catch (e) {
      const err = e instanceof MessagingError ? e : new MessagingError((e as Error).message, true);
      const attempts = f.reminderAttempts + 1;
      const giveUp = !err.retryable || attempts >= MAX_ATTEMPTS;
      await prisma.followUp.updateMany({
        where: { id: f.id },
        data: {
          reminderClaimedAt: null,
          reminderAttempts: attempts,
          reminderError: err.message.slice(0, 300),
          ...(giveUp ? { reminderFailedAt: new Date() } : { reminderNextAt: new Date(now.getTime() + backoffMs(attempts, err.retryAfterSec)) }),
        },
      });
      // alert: a log line with alert:true, so it is easy to find (and later wire to email / Slack).
      console.error(JSON.stringify({ alert: giveUp, event: giveUp ? 'reminder_failed' : 'reminder_retry', followUpId: f.id, attempts, error: err.message }));
    }
  }
  return sent;
}

/** Reminders run only with a real provider: in mock mode they would be marked "sent" without being sent. */
export const remindersEnabled = () => env.messaging.provider !== 'mock';
