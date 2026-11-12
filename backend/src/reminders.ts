// WhatsApp reminder to the salesman on the morning of a follow-up (Twilio WhatsApp, approved template).
// Sent at most once per follow-up: the row is claimed (whatsappSentAt set) before sending, and released if
// Twilio fails, so the next run retries it.
import { prisma } from './db';
import { env } from './env';
import { istToday } from './dto';

export const REMINDER_HOUR_IST = 9; // 9:00 am India time
const IST = 5.5 * 3600_000;
const BATCH = 50;

/** "11:00 am" in India time. */
const istTime = (d: Date) =>
  new Date(d.getTime() + IST).toISOString().slice(11, 16).replace(/^(\d\d):(\d\d)$/, (_, h: string, m: string) => {
    const n = Number(h);
    return `${n % 12 || 12}:${m} ${n < 12 ? 'am' : 'pm'}`;
  });

type Send = (to: string, variables: Record<string, string>) => Promise<void>;

/** Twilio Messages API with a content template. Throws on any non-2xx answer. */
export const sendWhatsApp: Send = async (to, variables) => {
  const t = env.twilio!;
  const body = new URLSearchParams({
    From: `whatsapp:${t.from}`,
    To: `whatsapp:${to}`,
    ContentSid: t.reminderContentSid,
    ContentVariables: JSON.stringify(variables),
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${t.accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${t.accountSid}:${t.authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${(await res.text()).slice(0, 200)}`);
};

/**
 * Sends today's due reminders (from 9 am IST until the follow-up time). Returns how many were sent.
 * Template variables: {{1}} client name, {{2}} time, e.g. "Reminder: visit Om Super Market today at 11:00 am."
 */
export async function sendDueReminders(now = new Date(), send: Send = sendWhatsApp): Promise<number> {
  if (!env.twilio) return 0;
  const { start, end } = istToday(now);
  if (now.getTime() < start.getTime() + REMINDER_HOUR_IST * 3600_000) return 0; // before 9 am
  const due = await prisma.followUp.findMany({
    where: {
      status: 'PENDING',
      whatsappSentAt: null,
      dueAt: { gte: now, lt: end },
      meeting: { whatsappReminder: true },
      salesman: { isActive: true },
    },
    select: { id: true, dueAt: true, client: { select: { name: true } }, salesman: { select: { phone: true } } },
    orderBy: { dueAt: 'asc' },
    take: BATCH,
  });
  let sent = 0;
  for (const f of due) {
    // Claim first: two servers (or two runs) never send the same reminder.
    const claimed = await prisma.followUp.updateMany({ where: { id: f.id, whatsappSentAt: null }, data: { whatsappSentAt: now } });
    if (!claimed.count) continue;
    try {
      await send(f.salesman.phone, { '1': f.client.name, '2': istTime(f.dueAt) });
      sent++;
    } catch (e) {
      await prisma.followUp.updateMany({ where: { id: f.id }, data: { whatsappSentAt: null } }); // retry next run
      console.error(`WhatsApp reminder ${f.id} failed: ${(e as Error).message}`);
    }
  }
  return sent;
}
