import { env } from './env';
import { prisma } from './db';
import { buildApp } from './app';

const app = buildApp();
if (env.devLoginOtp) console.warn('WARNING: DEV LOGIN (fixed OTP) is ON. Remove DEV_LOGIN_OTP from .env before going live.');

const close = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', close);
process.on('SIGTERM', close);

app
  .listen({ port: env.port, host: '0.0.0.0' })
  .then(() => console.log(`API ready on http://localhost:${env.port}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
