// Who is calling? The app logs in with Supabase Auth (phone OTP) and sends the access token.
// We ask Supabase to validate the token, then find our own User by phone.
// The ROLE always comes from our database, never from the app.
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './db';
import { env } from './env';
import type { User } from './generated/prisma/client';
import { HttpError, normalizePhone } from './http';
import { phoneFromDevToken } from './devLogin';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

export { HttpError, normalizePhone } from './http';

// Small cache so we don't call Supabase on every request. Token -> phone, until the token expires.
const tokenCache = new Map<string, { phone: string; expiresAt: number }>();

async function phoneFromToken(token: string): Promise<string> {
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.phone;

  const res = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: env.supabaseKey, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new HttpError(401, 'invalid_token', 'Session expired. Please log in again.');
  const user = (await res.json()) as { phone?: string };
  if (!user.phone) throw new HttpError(401, 'no_phone', 'This login has no phone number.');

  // JWT payload has the expiry; cache until then (max 10 min).
  const exp = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString() || '{}').exp as number | undefined;
  const expiresAt = Math.min((exp ?? 0) * 1000, Date.now() + 10 * 60_000);
  tokenCache.set(token, { phone: normalizePhone(user.phone), expiresAt });
  return normalizePhone(user.phone);
}

/** Fastify preHandler: sets request.user or replies 401/403. */
export async function authenticate(request: FastifyRequest) {
  const header = request.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'no_token', 'Please log in.');
  // TEMPORARY dev login token (fixed OTP) is accepted only while dev login is enabled.
  const phone = phoneFromDevToken(token) ?? (await phoneFromToken(token));

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new HttpError(403, 'not_registered', 'This number is not registered. Ask your manager to add you.');
  if (!user.isActive) throw new HttpError(403, 'inactive', 'Your account is deactivated. Contact your manager.');
  request.user = user;
}

export function requireRole(role: User['role']) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (request.user?.role !== role) throw new HttpError(403, 'forbidden', 'You do not have access to this.');
  };
}
