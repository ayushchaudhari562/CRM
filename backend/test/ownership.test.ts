// A salesman only ever sees / changes their own data.
import { as, fakeDb, makeApp, users } from './helpers';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

const app = makeApp();
after(() => app.close());

type Where = { id?: string; salesmanId?: string; status?: string };
const clients = [
  { id: 'cli_r', salesmanId: users.rahul.id, name: 'Rahul Shop', businessType: 'Retail', contactNumber: null, address: null },
  { id: 'cli_p', salesmanId: users.priya.id, name: 'Priya Shop', businessType: 'Retail', contactNumber: null, address: null },
];
const followUps = [
  { id: 'fu_r', salesmanId: users.rahul.id, status: 'PENDING' },
  { id: 'fu_done', salesmanId: users.rahul.id, status: 'DONE' },
  { id: 'fu_p', salesmanId: users.priya.id, status: 'PENDING' },
];
const match = (row: Where, w: Where) => (!w.id || row.id === w.id) && (!w.salesmanId || row.salesmanId === w.salesmanId) && (!w.status || row.status === w.status);
let lastMeetingsWhere: Where | undefined;

before(() =>
  fakeDb({
    client: { findFirst: async ({ where }: { where: Where }) => clients.find((c) => match(c, where)) ?? null },
    meeting: {
      findMany: async ({ where }: { where: Where }) => ((lastMeetingsWhere = where), []),
      findFirst: async () => null,
      findUnique: async () => null,
    },
    followUp: {
      findMany: async () => [],
      updateMany: async ({ where }: { where: Where }) => ({ count: followUps.filter((f) => match(f, where)).length }),
      findFirst: async ({ where }: { where: Where }) => {
        const f = followUps.find((x) => match(x, where));
        return f && { ...f, clientId: 'cli_r', type: 'VISIT', dueAt: new Date(), client: { name: 'x', businessType: 'y' } };
      },
    },
    user: {
      findUnique: async ({ where }: { where: { phone: string } }) => Object.values(users).find((u) => u.phone === where.phone) ?? null,
      count: async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.filter((id) => [users.rahul.id, users.priya.id].includes(id)).length,
    },
  }),
);

describe('salesman data is private', () => {
  it("another salesman's client -> 404 (not their data)", async () => {
    const r = await app.inject({ url: '/me/clients/cli_p', headers: as(users.rahul) });
    assert.equal(r.statusCode, 404);
  });

  it('meeting list is always filtered by me', async () => {
    await app.inject({ url: '/me/meetings?range=all', headers: as(users.rahul) });
    assert.equal(lastMeetingsWhere?.salesmanId, users.rahul.id);
  });

  it("closing another salesman's follow-up -> 404", async () => {
    const r = await app.inject({ method: 'PATCH', url: '/me/followups/fu_p', headers: as(users.rahul), payload: { status: 'Done' } });
    assert.equal(r.statusCode, 404);
  });

  it('closing my pending follow-up -> 200 Done', async () => {
    const r = await app.inject({ method: 'PATCH', url: '/me/followups/fu_r', headers: as(users.rahul), payload: { status: 'Done' } });
    assert.equal(r.statusCode, 200);
  });

  it('closing an already closed follow-up -> 409', async () => {
    const r = await app.inject({ method: 'PATCH', url: '/me/followups/fu_done', headers: as(users.rahul), payload: { status: 'Done' } });
    assert.equal(r.statusCode, 409);
  });

  it('rescheduling into the past -> 400', async () => {
    const r = await app.inject({ method: 'PATCH', url: '/me/followups/fu_r', headers: as(users.rahul), payload: { dueAt: '2020-01-01T00:00:00Z' } });
    assert.equal(r.statusCode, 400);
  });
});

describe('visit edit rules (src/config.ts: all locked)', () => {
  it('locked field -> 403 field_locked', async () => {
    const r = await app.inject({ method: 'PATCH', url: '/me/meetings/m1', headers: as(users.rahul), payload: { note: 'x' } });
    assert.equal(r.statusCode, 403);
    assert.equal(r.json().error, 'field_locked');
  });

  it('visit proof (selfie) can never be edited', async () => {
    const r = await app.inject({ method: 'PATCH', url: '/me/meetings/m1', headers: as(users.rahul), payload: { selfieUrl: 'x' } });
    assert.equal(r.statusCode, 400);
  });
});

describe('new visit', () => {
  const visit = { clientRequestId: 'req1', clientName: 'A', businessType: 'B', contactNumber: null, productIds: [], dealValue: 0, outcome: 'Interested', note: null, nextVisit: null, whatsappReminder: false, checkInAt: new Date().toISOString(), location: null };

  it("using another salesman's client id -> 404", async () => {
    const r = await app.inject({ method: 'POST', url: '/me/meetings', headers: as(users.rahul), payload: { ...visit, clientId: 'cli_p' } });
    assert.equal(r.statusCode, 404);
  });

  for (const [name, selfiePath] of [
    ["another salesman's file", 'usr_002/selfie/a.jpg'],
    ['voice file as selfie', 'usr_001/voice/a.m4a'],
    ['path traversal', 'usr_001/selfie/../../usr_002/selfie/a.jpg'],
    ['look-alike id prefix', 'usr_0010/selfie/a.jpg'],
  ]) {
    it(`${name} -> 400 invalid_file`, async () => {
      const r = await app.inject({ method: 'POST', url: '/me/meetings', headers: as(users.rahul), payload: { ...visit, clientId: null, selfiePath } });
      assert.equal(r.json().error, 'invalid_file');
    });
  }
});

describe('admin', () => {
  it('target for an unknown salesman -> 400', async () => {
    const r = await app.inject({ method: 'PUT', url: '/admin/targets', headers: as(users.admin), payload: { salesmanIds: ['usr_001', 'nope'], date: '2026-11-12', visitsTarget: 5, dealValueTarget: null } });
    assert.equal(r.statusCode, 400);
  });

  it('impossible date (31 Feb) -> 400', async () => {
    const r = await app.inject({ url: '/admin/targets?date=2026-02-31', headers: as(users.admin) });
    assert.equal(r.statusCode, 400);
  });
});
