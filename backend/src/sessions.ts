// Login sessions, like a shopping app: log in once, stay logged in.
// - Access token: short JWT (15 min), signed with AUTH_SECRET, carries the session id.
// - Refresh token: random 32 bytes, only its SHA-256 is stored, replaced on every refresh.
// - No time limit. A session ends only on logout, "log out everywhere" or when the admin deactivates the user.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from './db';
import { env } from './env';
import type { User } from './generated/prisma/client';
import { HttpError } from './http';

export const ACCESS_TOKEN_SECONDS = 15 * 60;
const LOST_ANSWER_GRACE_MS = 10 * 60_000; // the previous refresh token still works for 10 min after a refresh
const CACHE_MS = 30_000;

const b64 = (s: string) => Buffer.from(s).toString('base64url');
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

function signAccess(sessionId: string, userId: string): string {
  const body = `${b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64(
    JSON.stringify({ typ: 'access', sid: sessionId, sub: userId, exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_SECONDS }),
  )}`;
  return `${body}.${createHmac('sha256', env.authSecret!).update(body).digest('base64url')}`;
}

/** Session id inside a valid, unexpired access token; null if the token is not one of ours. */
export function sessionIdFromAccessToken(token: string): string | null {
  if (!env.authSecret) return null;
  const [h, p, sig] = token.split('.');
  if (!h || !p || !sig) return null;
  if (!same(sig, createHmac('sha256', env.authSecret).update(`${h}.${p}`).digest('base64url'))) return null;
  try {
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString()) as { typ?: string; sid?: string; exp?: number };
    if (payload.typ !== 'access' || !payload.sid || !payload.exp) return null;
    if (payload.exp * 1000 < Date.now()) throw new HttpError(401, 'token_expired', 'Session expired. Please refresh.');
    return payload.sid;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    return null;
  }
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until the access token expires
}

export async function createSession(user: User): Promise<Tokens> {
  const refreshToken = newToken();
  const s = await prisma.session.create({ data: { userId: user.id, tokenHash: sha256(refreshToken) }, select: { id: true } });
  return { accessToken: signAccess(s.id, user.id), refreshToken, expiresIn: ACCESS_TOKEN_SECONDS };
}

/** New token pair for a refresh token. The old token keeps working for 10 min in case this answer is lost. */
export async function refreshSession(refreshToken: string): Promise<Tokens & { user: User }> {
  const hash = sha256(refreshToken);
  for (let tryNo = 0; tryNo < 2; tryNo++) {
    const s = await prisma.session.findFirst({
      where: { revokedAt: null, OR: [{ tokenHash: hash }, { prevTokenHash: hash }] },
      include: { user: true },
    });
    if (!s) break;
    const isPrev = s.tokenHash !== hash;
    if (isPrev && (!s.rotatedAt || Date.now() - s.rotatedAt.getTime() > LOST_ANSWER_GRACE_MS)) break;
    if (!s.user.isActive) throw new HttpError(403, 'inactive', 'Your account is deactivated. Contact your manager.');

    const next = newToken();
    // Only if nobody refreshed in between (two refreshes at once: the second one re-reads and retries).
    const ok = await prisma.session.updateMany({
      where: { id: s.id, tokenHash: s.tokenHash, revokedAt: null },
      data: {
        tokenHash: sha256(next),
        prevTokenHash: isPrev ? s.prevTokenHash : s.tokenHash,
        rotatedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });
    if (ok.count) return { accessToken: signAccess(s.id, s.userId), refreshToken: next, expiresIn: ACCESS_TOKEN_SECONDS, user: s.user };
  }
  throw new HttpError(401, 'session_ended', 'You were logged out. Please log in again.');
}

// Small cache so most requests skip the session lookup. Logout / deactivate clear it at once.
const cache = new Map<string, { user: User; until: number }>();

/** The user of an active session (access token already verified). */
export async function userForSession(sessionId: string): Promise<User> {
  const hit = cache.get(sessionId);
  if (hit && hit.until > Date.now()) return hit.user;
  const s = await prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } });
  if (!s || s.revokedAt) throw new HttpError(401, 'session_ended', 'You were logged out. Please log in again.');
  if (cache.size > 2000) cache.clear();
  cache.set(sessionId, { user: s.user, until: Date.now() + CACHE_MS });
  return s.user;
}

/** Ends the session that owns this refresh token (logout on this phone). Returns its user id, if any. */
export async function revokeByToken(refreshToken: string): Promise<string | null> {
  const hash = sha256(refreshToken);
  const s = await prisma.session.findFirst({ where: { revokedAt: null, OR: [{ tokenHash: hash }, { prevTokenHash: hash }] } });
  if (!s) return null;
  await prisma.session.updateMany({ where: { id: s.id }, data: { revokedAt: new Date() } });
  cache.delete(s.id);
  return s.userId;
}

/** Ends every session of a user (log out everywhere / deactivated). */
export async function revokeAllForUser(userId: string): Promise<number> {
  const ids = await prisma.session.findMany({ where: { userId, revokedAt: null }, select: { id: true } });
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  ids.forEach((s) => cache.delete(s.id));
  return ids.length;
}
