// TEMPORARY fixed-OTP login.
import { fakeDb, makeApp, users } from './helpers';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

const app = makeApp();
before(() => fakeDb());
after(() => app.close());
const login = (phone: string, otp: string) => app.inject({ method: 'POST', url: '/auth/dev-login', payload: { phone, otp } });

describe('dev login', () => {
  it('right OTP -> token that works on /me', async () => {
    const r = await login('9000000100', '123456');
    assert.equal(r.statusCode, 200);
    const me = await app.inject({ url: '/me', headers: { authorization: `Bearer ${r.json().token}` } });
    assert.equal(me.json().id, users.rahul.id);
  });

  it('wrong OTP -> 401', async () => {
    assert.equal((await login('9000000100', '000000')).statusCode, 401);
  });

  it('unregistered number -> 403', async () => {
    assert.equal((await login('9999999999', '123456')).statusCode, 403);
  });

  it('OTP with letters -> 400', async () => {
    assert.equal((await login('9000000100', '12ab56')).statusCode, 400);
  });

  it('6th try in a minute -> 429 (brute force blocked)', async () => {
    // 4 calls above + 1 here = 5 allowed
    await login('9000000100', '000000');
    const r = await login('9000000100', '123456');
    assert.equal(r.statusCode, 429);
    assert.equal(r.json().error, 'rate_limited');
  });
});
