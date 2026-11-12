// Offline queue: idempotent, one bad visit never blocks the rest, phone clock is not trusted.
import { as, fakeDb, makeApp, users } from './helpers';
import { after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

/* eslint-disable @typescript-eslint/no-explicit-any */
const app = makeApp();
after(() => app.close());
const M = 60_000;
let clients: any[];
let meetings: any[];
let doneFor: string[];
const eqI = (a: string, b: { equals: string }) => a.toLowerCase() === b.equals.toLowerCase();
const row = (m: any) => ({ ...m, client: clients.find((c) => c.id === m.clientId), salesman: { name: 'Rahul' }, products: [], attachments: [], createdAt: new Date() });

beforeEach(() => {
  clients = [];
  meetings = [];
  doneFor = [];
  fakeDb({
    client: {
      findFirst: async ({ where }: any) =>
        clients.find((c) => c.salesmanId === where.salesmanId && (where.id ? c.id === where.id : eqI(c.name, where.name) && eqI(c.businessType, where.businessType))) ?? null,
      create: async ({ data }: any) => {
        const c = { id: `cli_${clients.length}`, ...data };
        clients.push(c);
        return c;
      },
    },
    meeting: {
      findUnique: async ({ where }: any) => {
        const m = meetings.find((x) => x.clientRequestId === where.clientRequestId);
        return m ? row(m) : null;
      },
      create: async ({ data }: any) => {
        if (data.products.connect.some((p: any) => p.id === 'deleted_product')) throw Object.assign(new Error('P2025'), { code: 'P2025' });
        const m = { id: `mtg_${meetings.length + 1}`, ...data };
        meetings.push(m);
        return row(m);
      },
    },
    followUp: { create: async () => ({}), updateMany: async ({ where }: any) => (doneFor.push(where.clientId), { count: 1 }) },
  });
});

const now = Date.now();
const visit = (id: string, extra: object = {}) => ({
  clientRequestId: id,
  clientId: null,
  clientName: 'Gupta Store',
  businessType: 'Kirana',
  contactNumber: null,
  productIds: [],
  dealValue: 100,
  outcome: 'Interested',
  note: null,
  nextVisit: null,
  whatsappReminder: false,
  checkInAt: new Date(now - 180 * M).toISOString(),
  checkOutAt: new Date(now - 150 * M).toISOString(),
  location: null,
  ...extra,
});
const sync = (list: object[]) => app.inject({ method: 'POST', url: '/me/sync', headers: as(users.rahul), payload: { meetings: list } });
const saved = (id: string) => meetings.find((m) => m.clientRequestId === id);

describe('POST /me/sync', () => {
  it('one result per visit, same order; a bad one does not block the rest', async () => {
    const r = await sync([
      visit('a'),
      visit('b', { productIds: ['deleted_product'] }),
      visit('c', { checkInAt: new Date(now - 40 * 24 * 60 * M).toISOString() }),
      visit('d'),
    ]);
    assert.equal(r.statusCode, 200);
    assert.deepEqual(
      r.json().map((x: any) => `${x.clientRequestId}:${x.status}${x.error ? ':' + x.error : ''}`),
      ['a:created', 'b:error:invalid', 'c:error:too_old', 'd:created'],
    );
  });

  it('resending is safe: duplicate, no new rows', async () => {
    await sync([visit('a')]);
    const r = await sync([visit('a')]);
    assert.equal(r.json()[0].status, 'duplicate');
    assert.equal(meetings.length, 1);
  });

  it('POST /me/meetings with the same id returns the same meeting', async () => {
    await sync([visit('a')]);
    const r = await app.inject({ method: 'POST', url: '/me/meetings', headers: as(users.rahul), payload: visit('a') });
    assert.equal(r.json().id, 'mtg_1');
  });

  it('two offline visits to one new shop -> one client', async () => {
    await sync([visit('a'), visit('b', { clientName: 'GUPTA store', businessType: 'kirana' })]);
    assert.equal(clients.length, 1);
  });

  it('a repeat visit completes the pending follow-ups of that client; a new client has none', async () => {
    await sync([visit('a')]);
    assert.deepEqual(doneFor, []);
    await sync([visit('b')]);
    assert.deepEqual(doneFor, ['cli_0']);
  });

  it('check-in address from the phone is saved (trimmed)', async () => {
    await sync([visit('a', { location: { latitude: 25.24, longitude: 86.98, accuracy: 5, address: ' 2, Bhikhanpur, Bhagalpur ' } })]);
    assert.equal(saved('a').checkInAddress, '2, Bhikhanpur, Bhagalpur');
  });

  it('phone clock ahead -> times clamped to now', async () => {
    await sync([visit('a', { checkInAt: new Date(now + 300 * M).toISOString(), checkOutAt: undefined })]);
    assert.ok(Math.abs(saved('a').checkInAt.getTime() - Date.now()) < 5000);
  });

  it('checkOutAt comes from the phone, not the sync time', async () => {
    await sync([visit('a')]);
    assert.ok(Math.abs(saved('a').checkOutAt.getTime() - (now - 150 * M)) < 1000);
  });

  it('check-out before check-in -> set to check-in', async () => {
    await sync([visit('a', { checkOutAt: new Date(now - 240 * M).toISOString() })]);
    assert.equal(saved('a').checkOutAt.getTime(), saved('a').checkInAt.getTime());
  });

  it('limits: 0 or 26 visits -> 400; 25 with max-size notes fits', async () => {
    assert.equal((await sync([])).statusCode, 400);
    assert.equal((await sync(Array.from({ length: 26 }, (_, i) => visit('x' + i)))).statusCode, 400);
    assert.equal((await sync(Array.from({ length: 25 }, (_, i) => visit('y' + i, { note: 'n'.repeat(2000) })))).statusCode, 200);
  });
});
