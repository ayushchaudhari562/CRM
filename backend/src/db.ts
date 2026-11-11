import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
import { env } from './env';

// Pooled connection (Supabase transaction pooler, port 6543).
export const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: env.databaseUrl,
    max: 10,
    // pg closes idle connections after 10s by default; opening a new TLS connection to the pooler costs
    // 1-6s on a slow network. Keep them warm for 5 min so normal use never pays that.
    idleTimeoutMillis: 5 * 60_000,
    connectionTimeoutMillis: 12_000, // DB unreachable -> fail fast with an error instead of hanging
    keepAlive: true, // stops mobile / NAT networks from silently dropping an idle connection
  }),
  transactionOptions: { maxWait: 10_000, timeout: 20_000 },
});
