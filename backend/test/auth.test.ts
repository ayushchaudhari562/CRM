// Who can call what. Role always comes from our DB.
import { as, fakeDb, makeApp, tokenFor, users } from './helpers';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

const app = makeApp();
before(() => fakeDb());
after(() => app.close());
const get = (url: string, headers = {}) => app.inject({ url, headers });

describe('auth', () => {
  it('health is public', async () => {
    assert.equal((await get('/health')).statusCode, 200);
  });

  it('no token -> 401 no_token', async () => {
    const r = await get('/me/home');
    assert.equal(r.statusCode, 401);
    assert.deepEqual(r.json(), { error: 'no_token', message: 'Please log in.' });
  });

  it('dev token signed with another secret -> 401', async () => {
    const r = await get('/me', { authorization: `Bearer ${tokenFor(users.rahul, { secret: 'x'.repeat(40) })}` });
    assert.equal(r.statusCode, 401);
  });

  it('expired dev token -> 401', async () => {
    const r = await get('/me', { authorization: `Bearer ${tokenFor(users.rahul, { expInSec: -10 })}` });
    assert.equal(r.statusCode, 401);
  });

  it('Supabase down -> 503, not a crash', async () => {
    const real = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error('down'); }) as typeof fetch;
    try {
      const r = await get('/me', { authorization: 'Bearer some.supabase.token' });
      assert.equal(r.statusCode, 503);
    } finally {
      globalThis.fetch = real;
    }
  });

  it('valid token -> /me gives role from DB', async () => {
    const r = await get('/me', as(users.admin));
    assert.equal(r.statusCode, 200);
    assert.equal(r.json().role, 'admin');
  });

  it('salesman cannot open admin routes', async () => {
    for (const url of ['/admin/overview', '/admin/meetings', '/admin/locations', '/admin/targets']) {
      assert.equal((await get(url, as(users.rahul))).statusCode, 403, url);
    }
  });

  it('admin cannot open salesman routes', async () => {
    for (const url of ['/me/home', '/me/meetings', '/me/followups', '/me/targets']) {
      assert.equal((await get(url, as(users.admin))).statusCode, 403, url);
    }
  });

  it('deactivated user -> 403 inactive', async () => {
    const r = await get('/me', as(users.gone));
    assert.equal(r.statusCode, 403);
    assert.equal(r.json().error, 'inactive');
  });

  it('unknown number -> 403 not_registered', async () => {
    const r = await get('/me', as({ phone: '+919999999999' }));
    assert.equal(r.json().error, 'not_registered');
  });
});

describe('errors keep one format', () => {
  it('bad JSON -> 400 {error, message}', async () => {
    const r = await app.inject({ method: 'POST', url: '/me/meetings', headers: { ...as(users.rahul), 'content-type': 'application/json' }, payload: '{bad' });
    assert.equal(r.statusCode, 400);
    assert.deepEqual(Object.keys(r.json()).sort(), ['error', 'message']);
  });

  it('body over 100KB -> 413', async () => {
    const r = await app.inject({ method: 'POST', url: '/me/meetings', headers: as(users.rahul), payload: { x: 'a'.repeat(110_000) } });
    assert.equal(r.statusCode, 413);
  });

  it('schema error -> 400 invalid with a reason', async () => {
    const r = await app.inject({ method: 'GET', url: '/admin/meetings?limit=abc', headers: as(users.admin) });
    assert.equal(r.statusCode, 400);
    assert.equal(r.json().error, 'invalid');
  });
});
