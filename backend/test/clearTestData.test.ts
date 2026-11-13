// The cleanup removes only seeded fake users (+9190000xxxxx), previews by default, and never locks everyone out.
import { fakeDb } from './helpers';
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clearTestData } from '../src/scripts/clearTestData';

/* eslint-disable @typescript-eslint/no-explicit-any */
let users: any[];
let deletes: string[];
const count = (n: number) => async () => n;
const del = (name: string) => async () => (deletes.push(name), { count: 1 });

beforeEach(() => {
  deletes = [];
  users = [
    { id: 'usr_001', phone: '+919000000100', role: 'SALESMAN' },
    { id: 'adm_001', phone: '+919000000900', role: 'ADMIN' },
    { id: 'real_1', phone: '+919569518989', role: 'ADMIN' },
    { id: 'real_2', phone: '+919876543210', role: 'SALESMAN' },
  ];
  fakeDb({
    user: { findMany: async () => users, deleteMany: async ({ where }: any) => (deletes.push('user:' + where.id.in.join('+')), { count: 1 }) },
    meeting: { count: count(7), deleteMany: del('meeting') },
    client: { count: count(5), deleteMany: del('client') },
    followUp: { count: count(3), deleteMany: del('followUp') },
    attendance: { count: count(2), deleteMany: del('attendance') },
    locationPing: { count: count(4), deleteMany: del('locationPing') },
    target: { count: count(6), deleteMany: del('target') },
    session: { count: count(1), deleteMany: del('session') },
    otpCode: { deleteMany: del('otpCode') },
  });
});

describe('clearTestData', () => {
  it('preview by default: counts only, nothing deleted', async () => {
    const r = await clearTestData();
    assert.equal(r.deleted, false);
    assert.deepEqual(r.counts, { users: 2, visits: 7, clients: 5, followUps: 3, attendance: 2, locations: 4, targets: 6, sessions: 1 });
    assert.deepEqual(deletes, []);
  });

  it('--yes: children first, user last, only the fake users', async () => {
    const r = await clearTestData({ yes: true });
    assert.equal(r.deleted, true);
    assert.deepEqual(deletes, ['followUp', 'meeting', 'client', 'attendance', 'locationPing', 'target', 'session', 'otpCode', 'user:usr_001+adm_001']);
  });

  it('refuses when no real manager exists (nobody could log in as manager)', async () => {
    users = users.filter((u) => u.id !== 'real_1');
    await assert.rejects(clearTestData({ yes: true }), /No real manager exists/);
    assert.deepEqual(deletes, []);
  });

  it('nothing fake: nothing to do', async () => {
    users = users.filter((u) => !u.phone.startsWith('+9190000'));
    const r = await clearTestData({ yes: true });
    assert.equal(r.deleted, false);
    assert.deepEqual(deletes, []);
  });
});
