// Managers from ADMIN_PHONES: created at start-up, existing users never changed.
import { fakeDb } from './helpers';
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensureAdmins, parseAdmins } from '../src/admins';

/* eslint-disable @typescript-eslint/no-explicit-any */
let created: any[];
beforeEach(() => {
  created = [];
  fakeDb({
    user: {
      findUnique: async ({ where }: any) =>
        where.phone === '+919000000100' ? { id: 'usr_001', role: 'SALESMAN' } : where.phone === '+919000000900' ? { id: 'adm_001', role: 'ADMIN' } : null,
      create: async ({ data }: any) => (created.push(data), data),
    },
  });
});

describe('ADMIN_PHONES', () => {
  it('accepts "Name:number" and plain numbers, +91 or 10 digits', () => {
    assert.deepEqual(parseAdmins('Suresh Iyer:9876543210, 919123456789 ,'), [
      { name: 'Suresh Iyer', phone: '+919876543210' },
      { name: 'Manager', phone: '+919123456789' },
    ]);
  });

  it('a bad number is a clear start-up error', () => {
    assert.throws(() => parseAdmins('Suresh:12345'), /not a valid 10-digit/);
  });

  it('creates only the missing managers; salesmen and existing managers are not touched', async () => {
    const n = await ensureAdmins('New Boss:9876543210,9000000900,9000000100');
    assert.equal(n, 1);
    assert.deepEqual(created, [{ name: 'New Boss', phone: '+919876543210', role: 'ADMIN' }]);
  });

  it('empty setting does nothing', async () => {
    assert.equal(await ensureAdmins(''), 0);
  });
});
