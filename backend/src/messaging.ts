// Sends WhatsApp template messages. The provider sits behind one small function, so it can be swapped.
// "mock" (default) only logs: development and tests never send real messages.
import { env } from './env';

export type Template = 'otp' | 'reminder'; // otp: {{1}} code · reminder: {{1}} client, {{2}} time

/** retryable = network error, timeout, 429 or 5xx. Anything else (bad number, rejected template) is final. */
export class MessagingError extends Error {
  constructor(
    message: string,
    public retryable: boolean,
    public retryAfterSec?: number,
  ) {
    super(message);
  }
}

export type SendTemplate = (to: string, template: Template, params: string[]) => Promise<void>;

const masked = (phone: string) => phone.slice(0, 3) + '*****' + phone.slice(-3);

const mock: SendTemplate = async (to, template, params) => {
  // Never log the OTP itself.
  const shown = template === 'otp' ? ['******'] : params;
  console.info(`[mock whatsapp] to=${masked(to)} template=${template} params=${JSON.stringify(shown)}`);
};

const twilio: SendTemplate = async (to, template, params) => {
  const t = env.messaging;
  if (t.provider !== 'twilio') throw new MessagingError('Twilio is not configured', false);
  const body = new URLSearchParams({
    From: `whatsapp:${t.from}`,
    To: `whatsapp:${to}`,
    ContentSid: t.templates[template],
    ContentVariables: JSON.stringify(Object.fromEntries(params.map((p, i) => [String(i + 1), p]))),
  });
  let res: Response;
  try {
    res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${t.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${t.accountSid}:${t.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    throw new MessagingError(`Twilio unreachable: ${(e as Error).message}`, true);
  }
  if (res.ok) return;
  const retryAfter = Number(res.headers.get('retry-after')) || undefined;
  const text = (await res.text()).slice(0, 200);
  throw new MessagingError(`Twilio ${res.status}: ${text}`, res.status === 429 || res.status >= 500, retryAfter);
};

/** The configured sender. Tests pass their own instead. */
export const sendTemplate: SendTemplate = (...args) => (env.messaging.provider === 'twilio' ? twilio : mock)(...args);
