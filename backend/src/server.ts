import { env } from './env';
import { prisma } from './db';
import { buildApp } from './app';
import { deleteOldVoiceNotes, VOICE_KEEP_DAYS } from './storage';

const app = buildApp();
if (env.devLoginOtp) console.warn('WARNING: DEV LOGIN (fixed OTP) is ON. Remove DEV_LOGIN_OTP from .env before going live.');

const close = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
// Daily: remove voice notes older than 30 days (first run 1 min after start).
const cleanup = () =>
  deleteOldVoiceNotes()
    .then((n) => n && console.log(`Deleted ${n} voice notes older than ${VOICE_KEEP_DAYS} days`))
    .catch((e: Error) => console.error(e.message));
setTimeout(cleanup, 60_000).unref();
setInterval(cleanup, 24 * 3600_000).unref();

process.on('SIGINT', close);
process.on('SIGTERM', close);

app
  .listen({ port: env.port, host: '0.0.0.0' })
  .then(() => console.log(`API ready on http://localhost:${env.port}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
