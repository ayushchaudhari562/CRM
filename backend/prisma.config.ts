import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  // Migrations need a DIRECT connection (port 5432), not the pooled one.
  datasource: { url: env('DIRECT_URL') },
});
