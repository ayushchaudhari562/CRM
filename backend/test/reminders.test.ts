// WhatsApp reminders: salesman, morning of the follow-up, once only, retry with backoff, crash recovery.
import { fakeDb } from './helpers';
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ATTEMPTS, istTime, sendDueReminders } from '../src/reminders';
import { MessagingError } from '../src/messaging';

/* eslint-disable @typescript-eslint/no-explicit-any */
// 13 Nov 2026 in India (IST = UTC + 5:30)
const ist = (hhmm: string) => new Date(`2026-11-13T${hhmm}:00+05:30`);
let row: any;
let where: any;
let sent: { to: string; template: string; params: string[] }[];

const matches = (r: any, w: any): boolean =>
  Object.entries(w).every(([k, v]: [string, any]) => {
    if (k === 'OR') return v.some((x: any) => matches(r, x));
    if (v && typeof v === 'object' && !(v instanceof Date) && 'lt' in v) return r[k] !== null && r[k] < v.lt;
    return r[k] === v;
  });

beforeEach(() => {
  sent = [];
  row = {
    id: 'f1',
    dueAt: ist('11:00'),
    whatsappSentAt: null,
    reminderClaimedAt: null,
    reminderAttempts: 0,
    reminderNextAt: null,
    reminderFailedAt: null,
    reminderError: null,
    client: { name: 'Om Super Market' },
    salesman: { phone: '+919000000100' },
  };
  fakeDb({
    followUp: {
      // The real filter runs in Postgres; here the fake returns the row unless it is done or waiting.
      findMany: async (args: any) => {
        where = args.where;
        const waiting = row.reminderNextAt && row.reminderNextAt > args.where.dueAt.gte;
        return row.whatsappSentAt || row.reminderFailedAt || waiting ? [] : [{ ...row }];
      },
      updateMany: async ({ where: w, data }: any) => {
        if (!matches(row, w)) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
  });
});

const ok = async (to: string, template: string, params: string[]) => {
  sent.push({ to, template, params });
};
const fail = (retryable: boolean, retryAfterSec?: number) => async () => {
  throw new MessagingError('Twilio error', retryable, retryAfterSec);
};

describe('sendDueReminders', () => {
  it('before 9 am IST: nothing', async () => {
    assert.equal(await sendDueReminders(ist('08:59'), ok), 0);
  });

  it('after 9 am: reminder template to the salesman; filter = today, pending, reminder on, opted in, active', async () => {
    assert.equal(await sendDueReminders(ist('09:05'), ok), 1);
    assert.deepEqual(sent[0], { to: '+919000000100', template: 'reminder', params: ['Om Super Market', '11:00 am'] });
    assert.equal(where.status, 'PENDING');
    assert.deepEqual(where.meeting, { whatsappReminder: true });
    assert.deepEqual(where.salesman, { isActive: true, whatsappOptOut: false });
    assert.equal(where.dueAt.gte.getTime(), ist('09:05').getTime());
    assert.notEqual(row.whatsappSentAt, null);
    assert.equal(row.reminderClaimedAt, null);
  });

  it('sent once only', async () => {
    await sendDueReminders(ist('09:05'), ok);
    assert.equal(await sendDueReminders(ist('09:10'), ok), 0);
    assert.equal(sent.length, 1);
  });

  it('network / 429 / 5xx: retried later with backoff (respects Retry-After)', async () => {
    await sendDueReminders(ist('09:05'), fail(true, 300));
    assert.equal(row.reminderAttempts, 1);
    assert.equal(row.reminderNextAt.getTime(), ist('09:10').getTime()); // 300 s > 1 min backoff
    assert.equal(row.whatsappSentAt, null);
    assert.equal(await sendDueReminders(ist('09:11'), ok), 1);
  });

  it('bad number / rejected template: not retried, marked failed', async () => {
    await sendDueReminders(ist('09:05'), fail(false));
    assert.notEqual(row.reminderFailedAt, null);
    assert.equal(await sendDueReminders(ist('09:30'), ok), 0);
  });

  it(`gives up after ${MAX_ATTEMPTS} tries`, async () => {
    row.reminderAttempts = MAX_ATTEMPTS - 1;
    await sendDueReminders(ist('09:05'), fail(true));
    assert.notEqual(row.reminderFailedAt, null);
  });

  it('crashed run: a claim older than 5 min is picked up again, a fresh one is not', async () => {
    row.reminderClaimedAt = ist('09:03');
    assert.equal(await sendDueReminders(ist('09:05'), ok), 0); // another run is sending it right now
    assert.equal(await sendDueReminders(ist('09:09'), ok), 1); // that run died
  });

  it('time is shown in India time', () => {
    assert.equal(istTime(new Date('2026-11-13T07:30:00Z')), '1:00 pm');
    assert.equal(istTime(new Date('2026-11-13T18:45:00Z')), '12:15 am');
  });
});
