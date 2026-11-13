// OTP login on our own server; the messaging provider only delivers the code (WhatsApp template "otp").
// Rules: 6 digits, 5 min, max 5 wrong tries, 60 s between codes, max 3 codes per 5 min, a new code
// cancels the old one, single use. Only an HMAC of the code is stored, compared in constant time, never logged.
// A number that is not registered (or is deactivated) is told so at once and is never sent anything.
// (Product choice: this reveals whether a number belongs to the company; the per-IP limit keeps guessing slow.)
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { prisma } from './db';
import { env } from './env';
import { HttpError, normalizePhone } from './http';
import { authenticate } from './auth';
import { audit } from './audit';
import { toAppUser } from './dto';
import { MessagingError, sendTemplate, type SendTemplate } from './messaging';
import { createSession, refreshSession, revokeAllForUser, revokeByToken } from './sessions';

export const OTP_TTL_MS = 5 * 60_000;
export const MAX_WRONG = 5;
export const RESEND_GAP_MS = 60_000;
const WINDOW_MS = 5 * 60_000;
const MAX_PER_WINDOW = 3;

const hashCode = (phone: string, code: string) => createHmac('sha256', env.authSecret!).update(`${phone}:${code}`).digest('hex');
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** 10 digits -> +91..., 12 digits starting 91 -> +91...; anything else is rejected. */
function toE164(input: string): string {
  const d = input.replace(/\D/g, '');
  if (d.length === 10) return normalizePhone('91' + d);
  if (d.length === 12 && d.startsWith('91')) return normalizePhone(d);
  throw new HttpError(400, 'invalid', 'Enter a valid 10-digit mobile number.');
}

/** New random code. In development with the fixed test OTP and the mock sender, the test OTP is used. */
function newCode(): string {
  if (env.devLoginOtp && env.messaging.provider === 'mock') return env.devLoginOtp;
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

const off = () => {
  if (!env.authSecret) throw new HttpError(404, 'not_found', 'Not found.');
};

export async function otpRoutes(app: FastifyInstance, opts: { send?: SendTemplate } = {}) {
  const send = opts.send ?? sendTemplate;
  const phoneBody = {
    type: 'object',
    required: ['phone'],
    additionalProperties: false,
    properties: { phone: { type: 'string', pattern: '^[+0-9 ]{10,16}$' } },
  } as const;
  const tokenBody = {
    type: 'object',
    required: ['refreshToken'],
    additionalProperties: false,
    properties: { refreshToken: { type: 'string', minLength: 20, maxLength: 200 } },
  } as const;

  app.post<{ Body: { phone: string } }>(
    '/auth/request-otp',
    { schema: { body: phoneBody }, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req) => {
      off();
      const phone = toE164(req.body.phone);
      // Only numbers the manager added can log in: say so before any code is made or sent.
      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user) throw new HttpError(403, 'not_registered', 'This number is not registered. Ask your manager to add you.');
      if (!user.isActive) throw new HttpError(403, 'inactive', 'Your account is deactivated. Contact your manager.');

      const now = Date.now();
      const recent = await prisma.otpCode.findMany({
        where: { phone, createdAt: { gte: new Date(now - WINDOW_MS) } },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      const wait = recent[0] ? RESEND_GAP_MS - (now - recent[0].createdAt.getTime()) : 0;
      if (wait > 0) throw new HttpError(429, 'otp_wait', `Please wait ${Math.ceil(wait / 1000)} seconds before asking for a new code.`);
      if (recent.length >= MAX_PER_WINDOW) throw new HttpError(429, 'otp_limit', 'Too many codes. Please try again in 5 minutes.');

      const code = newCode();
      // A new code cancels any older one.
      await prisma.otpCode.updateMany({ where: { phone, usedAt: null }, data: { usedAt: new Date() } });
      const row = await prisma.otpCode.create({
        data: { phone, codeHash: hashCode(phone, code), expiresAt: new Date(now + OTP_TTL_MS) },
        select: { id: true },
      });

      try {
        await send(phone, 'otp', [code]);
      } catch (e) {
        await prisma.otpCode.updateMany({ where: { id: row.id }, data: { usedAt: new Date() } });
        req.log.warn({ err: e instanceof MessagingError ? e.message : String(e) }, 'OTP send failed');
        throw new HttpError(503, 'messaging_busy', 'WhatsApp service is busy. Please try again.');
      }
      await audit('otp_sent', user.id);
      return { ok: true, resendInSec: RESEND_GAP_MS / 1000, expiresInSec: OTP_TTL_MS / 1000 };
    },
  );

  app.post<{ Body: { phone: string; otp: string } }>(
    '/auth/verify-otp',
    {
      schema: {
        body: { ...phoneBody, required: ['phone', 'otp'], properties: { ...phoneBody.properties, otp: { type: 'string', pattern: '^[0-9]{6}$' } } },
      },
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (req) => {
      off();
      const phone = toE164(req.body.phone);
      const row = await prisma.otpCode.findFirst({ where: { phone, usedAt: null }, orderBy: { createdAt: 'desc' } });
      if (!row || row.expiresAt.getTime() < Date.now()) throw new HttpError(401, 'otp_expired', 'Code expired. Please ask for a new one.');
      if (row.attempts >= MAX_WRONG) throw new HttpError(401, 'otp_locked', 'Too many wrong tries. Please ask for a new code.');

      if (!same(row.codeHash, hashCode(phone, req.body.otp))) {
        await prisma.otpCode.updateMany({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
        const left = MAX_WRONG - row.attempts - 1;
        if (left <= 0) await audit('otp_locked', null, { phone: phone.slice(-4) });
        throw new HttpError(401, 'wrong_otp', left > 0 ? `Wrong code. ${left} tries left.` : 'Too many wrong tries. Please ask for a new code.');
      }
      // Single use: only one request can claim the code.
      const claimed = await prisma.otpCode.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
      if (!claimed.count) throw new HttpError(401, 'otp_expired', 'Code expired. Please ask for a new one.');

      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user) throw new HttpError(401, 'wrong_otp', 'Wrong code.'); // cannot happen: no code is ever made for an unknown number
      if (!user.isActive) throw new HttpError(403, 'inactive', 'Your account is deactivated. Contact your manager.');
      const tokens = await createSession(user);
      await audit('login', user.id);
      return { ...tokens, user: toAppUser(user) };
    },
  );

  app.post<{ Body: { refreshToken: string } }>(
    '/auth/refresh',
    { schema: { body: tokenBody }, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (req) => {
      off();
      const { user, ...tokens } = await refreshSession(req.body.refreshToken);
      return { ...tokens, user: toAppUser(user) };
    },
  );

  // Logout on this phone. Always 200, so a lost answer can simply be retried.
  app.post<{ Body: { refreshToken: string } }>('/auth/logout', { schema: { body: tokenBody } }, async (req) => {
    off();
    const userId = await revokeByToken(req.body.refreshToken);
    if (userId) await audit('logout', userId);
    return { ok: true };
  });

  // Log out on every phone (e.g. a phone was lost).
  app.post('/auth/logout-all', { onRequest: authenticate }, async (req) => {
    off();
    const n = await revokeAllForUser(req.user!.id);
    await audit('logout_all', req.user!.id, { sessions: n });
    return { ok: true, sessions: n };
  });
}
