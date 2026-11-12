// Messaging: mock never sends and never logs the OTP; Twilio errors are sorted into retry / final.
import './env-setup';
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/env';
import { MessagingError, sendTemplate } from '../src/messaging';

const realMessaging = env.messaging;
const realFetch = globalThis.fetch;
const realInfo = console.info;
after(() => {
  env.messaging = realMessaging;
  globalThis.fetch = realFetch;
  console.info = realInfo;
});
const twilio = { provider: 'twilio', accountSid: 'AC1', authToken: 't', from: '+14155550100', templates: { otp: 'HXotp', reminder: 'HXrem' } } as const;

describe('sendTemplate', () => {
  it('mock: no network call, OTP hidden in the log', async () => {
    env.messaging = { provider: 'mock' };
    let called = false;
    globalThis.fetch = (async () => ((called = true), new Response(''))) as typeof fetch;
    const lines: string[] = [];
    console.info = (s: string) => lines.push(s);
    await sendTemplate('+919000000100', 'otp', ['482913']);
    assert.equal(called, false);
    assert.ok(!lines.join('').includes('482913'));
  });

  it('twilio: posts the template with numbered variables', async () => {
    env.messaging = twilio;
    let body = '';
    let url = '';
    globalThis.fetch = (async (u: string, init: RequestInit) => ((url = u), (body = String(init.body)), new Response('{}', { status: 201 }))) as typeof fetch;
    await sendTemplate('+919000000100', 'reminder', ['Om Super Market', '11:00 am']);
    const p = new URLSearchParams(body);
    assert.match(url, /Accounts\/AC1\/Messages\.json$/);
    assert.equal(p.get('To'), 'whatsapp:+919000000100');
    assert.equal(p.get('ContentSid'), 'HXrem');
    assert.deepEqual(JSON.parse(p.get('ContentVariables')!), { '1': 'Om Super Market', '2': '11:00 am' });
  });

  it('twilio: 429 / 5xx / network are retryable, 400 is final', async () => {
    env.messaging = twilio;
    const status = async (code: number, headers: Record<string, string> = {}) => {
      globalThis.fetch = (async () => new Response('x', { status: code, headers })) as typeof fetch;
      return sendTemplate('+91', 'otp', ['1']).then(
        () => null,
        (e: MessagingError) => e,
      );
    };
    const r429 = await status(429, { 'retry-after': '30' });
    assert.equal(r429?.retryable, true);
    assert.equal(r429?.retryAfterSec, 30);
    assert.equal((await status(503))?.retryable, true);
    assert.equal((await status(400))?.retryable, false);
    globalThis.fetch = (async () => {
      throw new Error('ECONNRESET');
    }) as typeof fetch;
    const net = await sendTemplate('+91', 'otp', ['1']).catch((e: MessagingError) => e);
    assert.equal((net as MessagingError).retryable, true);
  });
});
