// Messaging: mock never sends and never logs the OTP; Meta request format; errors sorted into retry / final.
import './env-setup';
/* eslint-disable @typescript-eslint/no-explicit-any */
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
const meta = { provider: 'meta', token: 'EAAtest', phoneNumberId: '123456789012345', templates: { otp: 'jta_login_otp', reminder: 'jta_visit_reminder' }, languages: { otp: 'en_US', reminder: 'en' } } as const;
const metaError = (status: number, code: number, headers: Record<string, string> = {}) =>
  (async () => new Response(JSON.stringify({ error: { code, message: 'x' } }), { status, headers })) as unknown as typeof fetch;

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

  it('meta reminder: body parameters in order, number without +', async () => {
    env.messaging = meta;
    let url = '';
    let body: any;
    let auth = '';
    globalThis.fetch = (async (u: string, init: RequestInit) => {
      url = u;
      body = JSON.parse(String(init.body));
      auth = (init.headers as Record<string, string>).Authorization;
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    await sendTemplate('+919000000100', 'reminder', ['Rahul Sharma', 'Om Super Market', '11:00 am']);
    assert.match(url, /\/v23\.0\/123456789012345\/messages$/);
    assert.equal(auth, 'Bearer EAAtest');
    assert.equal(body.to, '919000000100');
    assert.equal(body.template.name, 'jta_visit_reminder');
    assert.deepEqual(body.template.language, { code: 'en' }); // each template has its own language
    assert.deepEqual(body.template.components, [
      { type: 'body', parameters: [{ type: 'text', text: 'Rahul Sharma' }, { type: 'text', text: 'Om Super Market' }, { type: 'text', text: '11:00 am' }] },
    ]);
  });

  it('meta otp: code in the body and in the copy-code button', async () => {
    env.messaging = meta;
    let body: any;
    globalThis.fetch = (async (_u: string, init: RequestInit) => ((body = JSON.parse(String(init.body))), new Response('{}'))) as typeof fetch;
    await sendTemplate('+919000000100', 'otp', ['482913']);
    assert.equal(body.template.name, 'jta_login_otp');
    assert.deepEqual(body.template.language, { code: 'en_US' });
    assert.deepEqual(body.template.components[1], { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: '482913' }] });
  });

  it('meta errors: throughput / 5xx / network retry; not on WhatsApp or bad template is final', async () => {
    env.messaging = meta;
    const run = (f: typeof fetch) => ((globalThis.fetch = f), sendTemplate('+91', 'otp', ['1']).catch((e: MessagingError) => e));
    assert.equal(((await run(metaError(400, 130429))) as MessagingError).retryable, true);
    assert.equal(((await run(metaError(500, 0))) as MessagingError).retryable, true);
    const r429 = (await run(metaError(429, 4, { 'retry-after': '30' }))) as MessagingError;
    assert.equal(r429.retryable, true);
    assert.equal(r429.retryAfterSec, 30);
    assert.equal(((await run(metaError(400, 131026))) as MessagingError).retryable, false); // not a WhatsApp user
    assert.equal(((await run(metaError(404, 132001))) as MessagingError).retryable, false); // template missing
    const net = (await run((async () => {
      throw new Error('ECONNRESET');
    }) as typeof fetch)) as MessagingError;
    assert.equal(net.retryable, true);
  });
});
