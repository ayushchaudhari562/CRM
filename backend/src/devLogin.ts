// TEMPORARY: fixed-OTP login for development, until Supabase phone OTP is enabled.
// The OTP lives only in backend/.env (never in the app). Only registered, active users can log in.
// Disabled automatically in production (see env.ts).
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { prisma } from './db';
import { env } from './env';
import { HttpError, normalizePhone } from './http';
import { toAppUser } from './dto';

const TOKEN_HOURS = 12;
const b64 = (s: string) => Buffer.from(s).toString('base64url');

function sign(payload: object): string {
  const body = `${b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64(JSON.stringify(payload))}`;
  const sig = createHmac('sha256', env.devJwtSecret!).update(body).digest('base64url');
  return `${body}.${sig}`;
}

const sameText = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Returns the phone inside a valid dev token, or null if it is not a (valid) dev token. */
export function phoneFromDevToken(token: string): string | null {
  if (!env.devJwtSecret) return null;
  const [h, p, sig] = token.split('.');
  if (!h || !p || !sig) return null;
  const expected = createHmac('sha256', env.devJwtSecret).update(`${h}.${p}`).digest('base64url');
  if (!sameText(sig, expected)) return null;
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString()) as { typ?: string; phone?: string; exp?: number };
  if (payload.typ !== 'dev' || !payload.phone || !payload.exp || payload.exp * 1000 < Date.now()) return null;
  return payload.phone;
}

export async function devLoginRoutes(app: FastifyInstance) {
  const schema = {
    body: {
      type: 'object',
      required: ['phone', 'otp'],
      additionalProperties: false,
      properties: { phone: { type: 'string', pattern: '^[+0-9 ]{10,16}$' }, otp: { type: 'string', pattern: '^[0-9]{6}$' } },
    },
  } as const;
  // 5 tries per minute per IP: a 6-digit OTP can't be brute-forced.
  const config = { rateLimit: { max: 5, timeWindow: '1 minute' } };

  app.post<{ Body: { phone: string; otp: string } }>('/auth/dev-login', { schema, config }, async (req) => {
    if (!env.devLoginOtp) throw new HttpError(404, 'not_found', 'Not found.');
    const digits = req.body.phone.replace(/\D/g, '');
    const phone = normalizePhone(digits.length === 10 ? '91' + digits : digits);
    if (!sameText(req.body.otp, env.devLoginOtp)) {
      throw new HttpError(401, 'wrong_otp', 'Wrong OTP. Please try again.');
    }
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) throw new HttpError(403, 'not_registered', 'This number is not registered. Ask your manager to add you.');
    if (!user.isActive) throw new HttpError(403, 'inactive', 'Your account is deactivated. Contact your manager.');
    const token = sign({ typ: 'dev', sub: user.id, phone, exp: Math.floor(Date.now() / 1000) + TOKEN_HOURS * 3600 });
    return { token, user: toAppUser(user) };
  });
}
