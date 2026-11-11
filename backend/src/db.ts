import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
import { env } from './env';

// Pooled connection (Supabase transaction pooler, port 6543).
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.databaseUrl }),
  transactionOptions: { maxWait: 10_000, timeout: 20_000 },
});
