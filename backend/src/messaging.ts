// Sends WhatsApp template messages through Meta's WhatsApp Cloud API (official).
// "mock" (default) only logs: development and tests never send real messages.
import { env } from './env';

const GRAPH = 'https://graph.facebook.com/v23.0';

// otp: {{1}} code (Meta's fixed authentication text + "Copy code" button)
// reminder: {{1}} salesman name, {{2}} client, {{3}} time
export type Template = 'otp' | 'reminder';

/** retryable = network error, timeout, 5xx, or a Meta "try again later" code. Anything else is final. */
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

// Meta error codes that clear up by themselves (rate limits, temporary outages). From Meta's error-code docs.
const RETRY_CODES = new Set([1, 2, 4, 80007, 130429, 131016, 131056, 131057, 133004, 134101, 2494100]);

const masked = (phone: string) => phone.slice(0, 3) + '*****' + phone.slice(-3);

const mock: SendTemplate = async (to, template, params) => {
  const shown = template === 'otp' ? ['******'] : params; // never log the OTP
  console.info(`[mock whatsapp] to=${masked(to)} template=${template} params=${JSON.stringify(shown)}`);
};

/** Request body for one template message. */
export function metaBody(to: string, template: Template, params: string[], name: string, language: string) {
  const text = (t: string) => ({ type: 'text', text: t });
  const components: object[] = [{ type: 'body', parameters: params.map(text) }];
  // Authentication template: the code goes in the body AND in the copy-code button.
  if (template === 'otp') components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [text(params[0])] });
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to.replace(/\D/g, ''), // E.164 digits, e.g. 919876543210
    type: 'template',
    template: { name, language: { code: language }, components },
  };
}

const meta: SendTemplate = async (to, template, params) => {
  const m = env.messaging;
  if (m.provider !== 'meta') throw new MessagingError('WhatsApp is not configured', false);
  let res: Response;
  try {
    res = await fetch(`${GRAPH}/${m.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${m.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(metaBody(to, template, params, m.templates[template], m.language)),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    throw new MessagingError(`WhatsApp unreachable: ${(e as Error).message}`, true);
  }
  if (res.ok) return;
  const data = (await res.json().catch(() => ({}))) as { error?: { code?: number; message?: string } };
  const code = data.error?.code ?? 0;
  const retryAfter = Number(res.headers.get('retry-after')) || undefined;
  throw new MessagingError(
    `WhatsApp ${res.status} #${code}: ${(data.error?.message ?? '').slice(0, 160)}`,
    res.status >= 500 || res.status === 429 || RETRY_CODES.has(code),
    retryAfter,
  );
};

/** The configured sender. Tests pass their own instead. */
export const sendTemplate: SendTemplate = (...args) => (env.messaging.provider === 'meta' ? meta : mock)(...args);
