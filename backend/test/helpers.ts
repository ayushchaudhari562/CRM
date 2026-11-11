import './env-setup';
import { createHmac } from 'node:crypto';
import { buildApp } from '../src/app';
import { prisma } from '../src/db';

export const users = {
  rahul: { id: 'usr_001', name: 'Rahul Sharma', phone: '+919000000100', role: 'SALESMAN', isActive: true },
  priya: { id: 'usr_002', name: 'Priya Patel', phone: '+919000000101', role: 'SALESMAN', isActive: true },
  admin: { id: 'adm_001', name: 'Suresh Iyer', phone: '+919000000900', role: 'ADMIN', isActive: true },
  gone: { id: 'usr_009', name: 'Old User', phone: '+919000000109', role: 'SALESMAN', isActive: false },
};
type U = (typeof users)[keyof typeof users];

/** Replace Prisma model methods with in-memory fakes. User lookup by phone is always faked. */
export function fakeDb(models: Record<string, unknown> = {}) {
  const all = Object.values(users);
  Object.assign(prisma, {
    user: { findUnique: async ({ where }: { where: { phone: string } }) => all.find((u) => u.phone === where.phone) ?? null },
    $transaction: async (fn: unknown) => (typeof fn === 'function' ? fn(prisma) : Promise.all(fn as Promise<unknown>[])),
    ...models,
  });
}

/** A dev-login token, signed like the real one. */
export function tokenFor(u: Pick<U, 'phone'>, { secret = process.env.DEV_JWT_SECRET!, expInSec = 600 } = {}) {
  const b64 = (s: string) => Buffer.from(s).toString('base64url');
  const body = `${b64('{"alg":"HS256","typ":"JWT"}')}.${b64(JSON.stringify({ typ: 'dev', phone: u.phone, exp: Math.floor(Date.now() / 1000) + expInSec }))}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

export const as = (u: Pick<U, 'phone'>) => ({ authorization: `Bearer ${tokenFor(u)}` });

export const makeApp = () => buildApp({ logger: false });

// Supabase is unreachable in tests: any non-dev token is answered "invalid" unless a test says otherwise.
globalThis.fetch = (async () => new Response('{}', { status: 401 })) as typeof fetch;
