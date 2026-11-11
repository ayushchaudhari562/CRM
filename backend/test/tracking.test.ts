// Location: stored only while on duty, at most 1 point a minute.
import { as, fakeDb, makeApp, users } from './helpers';
import { after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

/* eslint-disable @typescript-eslint/no-explicit-any */
const app = makeApp();
after(() => app.close());
const M = 60_000;
const now = Date.now();
let shifts: any[];
let stored: any[];
let punches: any[];

beforeEach(() => {
  shifts = [];
  stored = [];
  punches = [];
  fakeDb({
    attendance: {
      findMany: async () => shifts,
      findFirst: async () => null,
      create: async ({ data }: any) => (punches.push(data), { punchInAt: data.punchInAt }),
    },
    locationPing: {
      findFirst: async () => (stored.length ? { recordedAt: stored[stored.length - 1].recordedAt } : null),
      createMany: async ({ data }: any) => (stored.push(...data), { count: data.length }),
    },
  });
});

const ping = (minAgo: number) => ({ latitude: 19.07, longitude: 72.87, accuracy: 10, recordedAt: new Date(now - minAgo * M).toISOString() });
const send = (pings: object[]) => app.inject({ method: 'POST', url: '/me/locations', headers: as(users.rahul), payload: { pings } });
const accepted = async (pings: object[]) => (await send(pings)).json().accepted;

describe('POST /me/locations', () => {
  it('off duty -> nothing stored', async () => {
    assert.equal(await accepted([ping(5)]), 0);
  });

  it('on duty: drops <1 min gaps, points before the shift and future points', async () => {
    shifts = [{ punchInAt: new Date(now - 60 * M), punchOutAt: null }];
    assert.equal(await accepted([ping(30), ping(29.5), ping(29), ping(90), ping(-10)]), 2);
  });

  it('after punch-out -> not stored', async () => {
    shifts = [{ punchInAt: new Date(now - 60 * M), punchOutAt: new Date(now - 20 * M) }];
    assert.equal(await accepted([ping(5)]), 0);
  });

  it('bad latitude or more than 120 points -> 400', async () => {
    assert.equal((await send([{ ...ping(1), latitude: 200 }])).statusCode, 400);
    assert.equal((await send(Array.from({ length: 121 }, (_, i) => ping(i)))).statusCode, 400);
  });
});

describe('punch in', () => {
  it('works with no body (older app)', async () => {
    const r = await app.inject({ method: 'POST', url: '/me/attendance/toggle', headers: as(users.rahul) });
    assert.equal(r.statusCode, 200);
  });

  it('saves the location when sent', async () => {
    await app.inject({
      method: 'POST',
      url: '/me/attendance/toggle',
      headers: as(users.rahul),
      payload: { location: { latitude: 19.1, longitude: 72.9 } },
    });
    assert.equal(punches[0].punchInLat, 19.1);
  });
});
