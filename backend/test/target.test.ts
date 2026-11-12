// The salesman sets their own target for today; nobody else's.
import { as, fakeDb, makeApp, users } from './helpers';
import { after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

/* eslint-disable @typescript-eslint/no-explicit-any */
const app = makeApp();
after(() => app.close());
let saved: any[];

beforeEach(() => {
  saved = [];
  fakeDb({
    target: {
      upsert: async (args: any) => (saved.push(args), {}),
      findMany: async () => saved.map((s) => ({ ...s.create, date: s.create.date })),
    },
    $queryRaw: async () => [],
  });
});

const put = (payload: object, who = users.rahul) => app.inject({ method: 'PUT', url: '/me/target', headers: as(who), payload });

describe('PUT /me/target', () => {
  it('saves today for the logged-in salesman and returns progress', async () => {
    const r = await put({ visitsTarget: 6, salesmanId: 'usr_999' });
    assert.equal(r.statusCode, 200);
    assert.equal(saved[0].create.salesmanId, users.rahul.id); // salesmanId in the body is ignored
    assert.equal(r.json().visitsTarget, 6);
  });

  it('bad values -> 400', async () => {
    assert.equal((await put({ visitsTarget: -1 })).statusCode, 400);
    assert.equal((await put({ visitsTarget: 101 })).statusCode, 400);
    assert.equal((await put({})).statusCode, 400);
  });

  it('manager cannot use it', async () => {
    assert.equal((await put({ visitsTarget: 5 }, users.admin)).statusCode, 403);
  });
});
