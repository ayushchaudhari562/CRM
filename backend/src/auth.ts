// Who is calling? The app logs in with Supabase Auth (phone OTP) and sends the access token.
// We ask Supabase to validate the token, then find our own User by phone.
// The ROLE always comes from our database, never from the app.
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './db';
import { env } from './env';
import type { User } from './generated/prisma/client';
import { HttpError, normalizePhone } from './http';
import { phoneFromDevToken } from './devLogin';
import { sessionIdFromAccessToken, userForSession } from './sessions';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

export { HttpError, normalizePhone } from './http';

// Small in-memory caches so most requests skip the Supabase call and the user lookup.
const MAX_CACHE = 2000;
const USER_TTL_MS = 30_000; // a deactivated user is locked out within 30s
const tokenCache = new Map<string, { phone: string; expiresAt: number }>();
const userCache = new Map<string, { user: User; expiresAt: number }>();

function remember<V extends { expiresAt: number }>(cache: Map<string, V>, key: string, value: V) {
  if (cache.size >= MAX_CACHE) {
    const now = Date.now();
    for (const [k, v] of cache) if (v.expiresAt <= now) cache.delete(k);
    if (cache.size >= MAX_CACHE) cache.clear(); // still full: start over, never grow without limit
  }
  cache.set(key, value);
}

function tokenExpiry(token: string): number {
  try {
    const exp = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString()).exp;
    return typeof exp === 'number' ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function phoneFromToken(token: string): Promise<string> {
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.phone;

  const res = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: env.supabaseKey, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  }).catch(() => {
    throw new HttpError(503, 'auth_unavailable', 'Could not verify your login. Please try again.');
  });
  if (!res.ok) throw new HttpError(401, 'invalid_token', 'Session expired. Please log in again.');
  const user = (await res.json()) as { phone?: string };
  if (!user.phone) throw new HttpError(401, 'no_phone', 'This login has no phone number.');

  const phone = normalizePhone(user.phone);
  remember(tokenCache, token, { phone, expiresAt: Math.min(tokenExpiry(token), Date.now() + 10 * 60_000) });
  return phone;
}

/** Fastify preHandler: sets request.user or replies 401/403. */
export async function authenticate(request: FastifyRequest) {
  const header = request.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'no_token', 'Please log in.');

  // Our own access token (OTP login): the session must still be open.
  const sessionId = sessionIdFromAccessToken(token);
  if (sessionId) {
    const u = await userForSession(sessionId);
    if (!u.isActive) throw new HttpError(403, 'inactive', 'Your account is deactivated. Contact your manager.');
    request.user = u;
    return;
  }

  // TEMPORARY dev login token (fixed OTP) is accepted only while dev login is enabled.
  const phone = phoneFromDevToken(token) ?? (await phoneFromToken(token));

  let user = userCache.get(phone);
  if (!user || user.expiresAt <= Date.now()) {
    const row = await prisma.user.findUnique({ where: { phone } });
    if (!row) throw new HttpError(403, 'not_registered', 'This number is not registered. Ask your manager to add you.');
    user = { user: row, expiresAt: Date.now() + USER_TTL_MS };
    remember(userCache, phone, user);
  }
  if (!user.user.isActive) throw new HttpError(403, 'inactive', 'Your account is deactivated. Contact your manager.');
  request.user = user.user;
}

/** Call after changing a user (role, active, name) so the change applies at once. */
export const forgetUser = (phone: string) => userCache.delete(phone);

export function requireRole(role: User['role']) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (request.user?.role !== role) throw new HttpError(403, 'forbidden', 'You do not have access to this.');
  };
}
