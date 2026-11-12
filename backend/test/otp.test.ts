// OTP login on our server + sessions (stay logged in until logout / deactivate).
import { fakeDb, makeApp, users } from './helpers';
import { after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/env';

/* eslint-disable @typescript-eslint/no-explicit-any */
const app = makeApp();
const realMessaging = env.messaging;
const realFetch = globalThis.fetch;
after(() => {
  app.close();
  env.messaging = realMessaging;
  globalThis.fetch = realFetch;
});

// ---- tiny in-memory DB for the tables used here ----
let otps: any[];
let sessions: any[];
let audits: any[];
let people: any[];
let seq = 0;
const match = (row: any, where: any): boolean =>
  Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (k === 'OR') return v.some((w: any) => match(row, w));
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('gte' in v) return row[k] >= v.gte;
      if ('lt' in v) return row[k] < v.lt;
    }
    return row[k] === v;
  });
const apply = (row: any, data: any) =>
  Object.entries(data).forEach(([k, v]: [string, any]) => (row[k] = v && typeof v === 'object' && 'increment' in v ? row[k] + v.increment : v));
const table = (rows: () => any[]) => ({
  findMany: async ({ where, orderBy }: any = {}) => {
    const r = rows().filter((x) => match(x, where));
    return orderBy?.createdAt === 'desc' ? r.sort((a, b) => b.createdAt - a.createdAt) : r;
  },
  findFirst: async ({ where, include }: any) => {
    const r = rows().filter((x) => match(x, where)).sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
    return r && include?.user ? { ...r, user: people.find((u) => u.id === r.userId) } : r;
  },
  findUnique: async ({ where, include }: any) => {
    const r = rows().find((x) => match(x, where)) ?? null;
    return r && include?.user ? { ...r, user: people.find((u) => u.id === r.userId) } : r;
  },
  create: async ({ data }: any) => {
    const r = { id: `id${++seq}`, createdAt: new Date(Date.now() + seq), usedAt: null, attempts: 0, revokedAt: null, prevTokenHash: null, rotatedAt: null, ...data };
    rows().push(r);
    return r;
  },
  updateMany: async ({ where, data }: any) => {
    const hit = rows().filter((x) => match(x, where));
    hit.forEach((x) => apply(x, data));
    return { count: hit.length };
  },
  update: async ({ where, data }: any) => {
    const r = rows().find((x) => match(x, where));
    apply(r, data);
    return r;
  },
});

beforeEach(() => {
  otps = [];
  sessions = [];
  audits = [];
  people = Object.values(users).map((u) => ({ ...u }));
  env.messaging = { provider: 'mock' };
  fakeDb({ otpCode: table(() => otps), session: table(() => sessions), auditLog: table(() => audits), user: table(() => people) });
});

// A different client IP per request, so the per-IP rate limit (10/min, real in production) does not hit the tests.
let ip = 0;
const post = (url: string, payload: object, headers: Record<string, string> = {}) =>
  app.inject({ method: 'POST', url, payload, headers, remoteAddress: `10.0.${Math.floor(++ip / 250)}.${ip % 250}` });
const ask = (phone = '9000000100') => post('/auth/request-otp', { phone });
const verify = (otp: string, phone = '9000000100') => post('/auth/verify-otp', { phone, otp });
const age = (ms: number) => otps.forEach((o) => (o.createdAt = new Date(o.createdAt.getTime() - ms)));

describe('POST /auth/request-otp', () => {
  it('registered and unknown numbers get the same answer; only an HMAC is stored', async () => {
    const a = await ask('9000000100');
    const b = await ask('9999999999');
    assert.equal(a.statusCode, 200);
    assert.deepEqual(a.json(), b.json());
    assert.equal(otps.length, 2);
    assert.ok(otps.every((o) => /^[0-9a-f]{64}$/.test(o.codeHash) && !o.codeHash.includes('123456')));
    assert.deepEqual(audits.map((x) => x.action), ['otp_sent']); // nothing is sent to the unknown number
  });

  it('60 s between codes, max 3 per 15 min, a new code cancels the old one', async () => {
    await ask();
    assert.equal((await ask()).json().error, 'otp_wait');
    age(61_000);
    await ask();
    assert.equal(otps.filter((o) => o.usedAt === null).length, 1); // old code cancelled
    age(61_000);
    await ask();
    age(61_000);
    assert.equal((await ask()).json().error, 'otp_limit');
  });

  it('sender down -> 503 (not 500) and the code is cancelled', async () => {
    env.messaging = { provider: 'twilio', accountSid: 'AC1', authToken: 't', from: '+1', templates: { otp: 'HX1', reminder: 'HX2' } };
    globalThis.fetch = (async () => new Response('down', { status: 500 })) as typeof fetch;
    const r = await ask();
    assert.equal(r.statusCode, 503);
    assert.equal(r.json().error, 'messaging_busy');
    assert.notEqual(otps[0].usedAt, null);
  });

  it('bad number -> 400', async () => {
    assert.equal((await ask('12345')).statusCode, 400);
  });
});

describe('POST /auth/verify-otp', () => {
  it('right code -> tokens; the code works only once', async () => {
    await ask();
    const r = await verify('123456');
    assert.equal(r.statusCode, 200);
    const body = r.json();
    assert.ok(body.accessToken && body.refreshToken && body.user.name === 'Rahul Sharma');
    assert.equal(sessions.length, 1);
    assert.notEqual(sessions[0].tokenHash, body.refreshToken); // only the hash is stored
    assert.equal((await verify('123456')).json().error, 'otp_expired');
  });

  it('5 wrong tries lock the code', async () => {
    await ask();
    for (let i = 0; i < 5; i++) assert.equal((await verify('000000')).json().error, 'wrong_otp');
    assert.equal((await verify('123456')).json().error, 'otp_locked');
  });

  it('expired after 5 minutes', async () => {
    await ask();
    otps[0].expiresAt = new Date(Date.now() - 1000);
    assert.equal((await verify('123456')).json().error, 'otp_expired');
  });

  it('unknown number: the test code does not work', async () => {
    await ask('9999999999');
    assert.equal((await verify('123456', '9999999999')).json().error, 'wrong_otp');
  });
});

describe('sessions', () => {
  const login = async () => {
    await ask();
    return (await verify('123456')).json();
  };
  const me = (accessToken: string) =>
    app.inject({ method: 'GET', url: '/me', headers: { authorization: `Bearer ${accessToken}` }, remoteAddress: `10.9.0.${++ip % 250}` });

  it('access token works; refresh gives a new pair; the old refresh token still works once if the answer was lost', async () => {
    const t = await login();
    assert.equal((await me(t.accessToken)).statusCode, 200);
    const r1 = (await post('/auth/refresh', { refreshToken: t.refreshToken })).json();
    assert.ok(r1.refreshToken && r1.refreshToken !== t.refreshToken);
    const again = await post('/auth/refresh', { refreshToken: t.refreshToken }); // answer lost, phone retries
    assert.equal(again.statusCode, 200);
  });

  it('no time limit: a refresh token from months ago still works', async () => {
    const t = await login();
    sessions[0].createdAt = new Date(Date.now() - 200 * 24 * 3600_000);
    sessions[0].lastUsedAt = sessions[0].createdAt;
    assert.equal((await post('/auth/refresh', { refreshToken: t.refreshToken })).statusCode, 200);
  });

  it('logout ends the session at once', async () => {
    const t = await login();
    assert.equal((await post('/auth/logout', { refreshToken: t.refreshToken })).statusCode, 200);
    assert.equal((await post('/auth/refresh', { refreshToken: t.refreshToken })).json().error, 'session_ended');
    assert.equal((await me(t.accessToken)).json().error, 'session_ended');
  });

  it('logout-all ends every phone', async () => {
    const a = await login();
    age(61_000);
    const b = await login();
    const r = await post('/auth/logout-all', {}, { authorization: `Bearer ${a.accessToken}` });
    assert.equal(r.json().sessions, 2);
    assert.equal((await post('/auth/refresh', { refreshToken: b.refreshToken })).json().error, 'session_ended');
  });

  it('deactivated user: refresh refused', async () => {
    const t = await login();
    people.find((u) => u.id === users.rahul.id).isActive = false;
    assert.equal((await post('/auth/refresh', { refreshToken: t.refreshToken })).json().error, 'inactive');
  });

  it('garbage refresh token -> 401', async () => {
    assert.equal((await post('/auth/refresh', { refreshToken: 'x'.repeat(43) })).statusCode, 401);
  });
});
