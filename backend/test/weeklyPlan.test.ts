// Salesman weekly route plan: get, set, validation and stop status.
import { as, fakeDb, makeApp, users } from './helpers';
import { after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

/* eslint-disable @typescript-eslint/no-explicit-any */
const app = makeApp();
after(() => app.close());

let savedPlans: any[];
let savedStops: any[];

beforeEach(() => {
  savedPlans = [];
  savedStops = [];
  fakeDb({
    weeklyPlan: {
      findUnique: async ({ where }: any) => {
        const found = savedPlans.find(
          (p) => p.salesmanId === where.salesmanId_date?.salesmanId && p.date.toISOString().slice(0, 10) === where.salesmanId_date?.date.toISOString().slice(0, 10),
        );
        if (!found) return null;
        return {
          ...found,
          stops: savedStops.filter((s) => s.planId === found.id),
        };
      },
      create: async ({ data }: any) => {
        const plan = {
          id: `wp_${savedPlans.length + 1}`,
          salesmanId: data.salesmanId,
          date: data.date,
          stops: (data.stops?.create || []).map((s: any, idx: number) => {
            const stop = { id: `stop_${savedStops.length + 1 + idx}`, ...s, status: 'PENDING', visitedMeetingId: null, visitedAt: null };
            savedStops.push(stop);
            return stop;
          }),
        };
        savedPlans.push(plan);
        return plan;
      },
      upsert: async ({ create }: any) => {
        const plan = { id: `wp_${savedPlans.length + 1}`, ...create };
        savedPlans.push(plan);
        return plan;
      },
    },
    plannedStop: {
      deleteMany: async ({ where }: any) => {
        savedStops = savedStops.filter((s) => s.planId !== where.planId);
        return { count: 1 };
      },
      createMany: async ({ data }: any) => {
        data.forEach((d: any, idx: number) => {
          savedStops.push({ id: `stop_${savedStops.length + 1 + idx}`, ...d, status: 'PENDING', visitedMeetingId: null, visitedAt: null });
        });
        return { count: data.length };
      },
      findMany: async () => savedStops,
    },
  });
});

const getPlan = (date?: string, who = users.rahul) =>
  app.inject({ method: 'GET', url: `/me/weekly-plan${date ? `?date=${date}` : ''}`, headers: as(who) });

const postPlan = (payload: object, who = users.rahul) =>
  app.inject({ method: 'POST', url: '/me/weekly-plan', headers: as(who), payload });

describe('Weekly Route Plan', () => {
  it('GET /me/weekly-plan returns empty stops when no plan exists', async () => {
    const res = await getPlan('2026-11-20');
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.date, '2026-11-20');
    assert.deepEqual(body.stops, []);
  });

  it('POST /me/weekly-plan saves route stops and returns them', async () => {
    const payload = {
      date: '2026-11-20',
      stops: [
        { clientName: 'Sharma Traders', location: 'Civil Lines', contactNumber: '9876543210' },
        { clientName: 'Gupta Stores', location: 'Market Complex' }, // optional phone
      ],
    };
    const res = await postPlan(payload);
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.date, '2026-11-20');
    assert.equal(body.stops.length, 2);
    assert.equal(body.stops[0].clientName, 'Sharma Traders');
    assert.equal(body.stops[0].location, 'Civil Lines');
    assert.equal(body.stops[0].status, 'PENDING');
    assert.equal(body.stops[1].clientName, 'Gupta Stores');
    assert.equal(body.stops[1].contactNumber, null);
  });

  it('POST /me/weekly-plan validates body', async () => {
    // Missing stops
    assert.equal((await postPlan({ date: '2026-11-20' })).statusCode, 400);
    // Empty stops array
    assert.equal((await postPlan({ date: '2026-11-20', stops: [] })).statusCode, 400);
    // Missing location
    assert.equal((await postPlan({ date: '2026-11-20', stops: [{ clientName: 'A' }] })).statusCode, 400);
    // Invalid date
    assert.equal((await postPlan({ date: 'not-a-date', stops: [{ clientName: 'A', location: 'L' }] })).statusCode, 400);
  });

  it('manager cannot use salesman weekly plan routes', async () => {
    const res = await getPlan('2026-11-20', users.admin);
    assert.equal(res.statusCode, 403);
  });
});
