// Home: today's worked time comes from finished shifts; the open shift is returned separately.
import { as, fakeDb, makeApp, users } from './helpers';
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';

/* eslint-disable @typescript-eslint/no-explicit-any */
const app = makeApp();
after(() => app.close());
const M = 60_000;
const now = Date.now();
const home = async (shifts: any[]) => {
  fakeDb({
    meeting: { count: async () => 0 },
    target: { findUnique: async () => null },
    followUp: { findMany: async () => [] },
    attendance: { findMany: async () => shifts },
  });
  return (await app.inject({ method: 'GET', url: '/me/home', headers: as(users.rahul) })).json();
};
const at = (minAgo: number) => new Date(now - minAgo * M);

describe('GET /me/home shift time', () => {
  it('not started -> 0, nothing open', async () => {
    const h = await home([]);
    assert.deepEqual([h.workedMs, h.punchedInAt, h.punchedOutAt], [0, null, null]);
  });

  it('two finished shifts are added up; last punch-out returned', async () => {
    const h = await home([
      { punchInAt: at(300), punchOutAt: at(240) },
      { punchInAt: at(120), punchOutAt: at(90) },
    ]);
    assert.equal(h.workedMs, 90 * M);
    assert.equal(h.punchedOutAt, at(90).toISOString());
    assert.equal(h.punchedInAt, null);
  });

  it('open shift is returned as punchedInAt, not counted in workedMs', async () => {
    const h = await home([
      { punchInAt: at(300), punchOutAt: at(240) },
      { punchInAt: at(30), punchOutAt: null },
    ]);
    assert.equal(h.workedMs, 60 * M);
    assert.equal(h.punchedInAt, at(30).toISOString());
  });
});
