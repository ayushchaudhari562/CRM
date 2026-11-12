// WhatsApp reminders: salesman, on the morning of the follow-up, once only, retried after a failure.
import { fakeDb } from './helpers';
import { after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/env';
import { sendDueReminders } from '../src/reminders';

/* eslint-disable @typescript-eslint/no-explicit-any */
const realTwilio = env.twilio;
after(() => {
  env.twilio = realTwilio;
});

// 13 Nov 2026 in India (IST = UTC + 5:30)
const ist = (hhmm: string) => new Date(`2026-11-13T${hhmm}:00+05:30`);
let rows: any[];
let where: any;
let sent: { to: string; vars: Record<string, string> }[];

beforeEach(() => {
  env.twilio = { accountSid: 'AC1', authToken: 't', from: '+14155550100', reminderContentSid: 'HX1' };
  sent = [];
  rows = [{ id: 'f1', dueAt: ist('11:00'), whatsappSentAt: null, client: { name: 'Om Super Market' }, salesman: { phone: '+919000000100' } }];
  fakeDb({
    followUp: {
      findMany: async (args: any) => ((where = args.where), rows.filter((r) => r.whatsappSentAt === null)),
      updateMany: async ({ where: w, data }: any) => {
        const hit = rows.filter((r) => r.id === w.id && (w.whatsappSentAt === undefined || r.whatsappSentAt === w.whatsappSentAt));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
    },
  });
});

const ok = async (to: string, vars: Record<string, string>) => {
  sent.push({ to, vars });
};

describe('sendDueReminders', () => {
  it('before 9 am IST: nothing is sent', async () => {
    assert.equal(await sendDueReminders(ist('08:59'), ok), 0);
    assert.equal(sent.length, 0);
  });

  it('after 9 am: sent to the salesman with client name and time; filter is today, pending, reminder on', async () => {
    assert.equal(await sendDueReminders(ist('09:05'), ok), 1);
    assert.deepEqual(sent[0], { to: '+919000000100', vars: { '1': 'Om Super Market', '2': '11:00 am' } });
    assert.equal(where.status, 'PENDING');
    assert.deepEqual(where.meeting, { whatsappReminder: true });
    assert.equal(where.dueAt.gte.getTime(), ist('09:05').getTime()); // already-passed follow-ups are skipped
    assert.equal(where.dueAt.lt.getTime(), ist('00:00').getTime() + 24 * 3600_000); // until end of today (IST)
  });

  it('sent once only: a second run sends nothing', async () => {
    await sendDueReminders(ist('09:05'), ok);
    assert.equal(await sendDueReminders(ist('09:10'), ok), 0);
    assert.equal(sent.length, 1);
  });

  it('Twilio error: released and retried on the next run', async () => {
    const fail = async () => {
      throw new Error('Twilio 500');
    };
    assert.equal(await sendDueReminders(ist('09:05'), fail), 0);
    assert.equal(rows[0].whatsappSentAt, null);
    assert.equal(await sendDueReminders(ist('09:10'), ok), 1);
  });

  it('no Twilio keys: off', async () => {
    env.twilio = null;
    assert.equal(await sendDueReminders(ist('09:05'), ok), 0);
  });
});
