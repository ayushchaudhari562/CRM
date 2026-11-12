// Admin live status (working salesmen first) and the outcome / today filter for meetings.
import { as, fakeDb, makeApp, users } from './helpers';
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';

/* eslint-disable @typescript-eslint/no-explicit-any */
const app = makeApp();
after(() => app.close());
const get = (url: string) => app.inject({ method: 'GET', url, headers: as(users.admin) });

const salesman = (name: string, extra: any = {}) => ({ id: name, name, meetings: [], attendance: [], locationPings: [], ...extra });

describe('GET /admin/progress', () => {
  it('status per salesman, working ones first', async () => {
    fakeDb({
      user: {
        findUnique: async () => users.admin, // login check
        findMany: async () => [
          salesman('Amit'),
          salesman('Bina', { attendance: [{ punchOutAt: new Date() }] }), // punched out -> Day ended
          salesman('Chetan', { attendance: [{ punchOutAt: null }] }), // on duty
          salesman('Dev', { attendance: [{ punchOutAt: null }], meetings: [{ id: 'm1', outcome: 'INTERESTED', dealValue: 0, checkInAt: new Date(), checkOutAt: null }] }),
        ],
      },
    });
    const r = await get('/admin/progress');
    assert.equal(r.statusCode, 200);
    assert.deepEqual(
      r.json().map((p: any) => `${p.name}:${p.status}`),
      ['Dev:In meeting', 'Chetan:On the road', 'Bina:Day ended', 'Amit:Not started'],
    );
  });
});

describe('GET /admin/meetings filters', () => {
  it('outcome + today are turned into a DB filter', async () => {
    let where: any;
    fakeDb({ meeting: { findMany: async (args: any) => ((where = args.where), []) } });
    const r = await get('/admin/meetings?outcome=Closed&range=today');
    assert.equal(r.statusCode, 200);
    assert.equal(where.outcome, 'CLOSED');
    assert.ok(where.checkInAt.gte instanceof Date && where.checkInAt.lt instanceof Date);
  });

  it('unknown outcome -> 400', async () => {
    assert.equal((await get('/admin/meetings?outcome=Maybe')).statusCode, 400);
  });
});
