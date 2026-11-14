import { env } from './env';
import { prisma } from './db';
import { buildApp } from './app';
import { remindersEnabled, sendDueReminders } from './reminders';
import { sendNightlyRouteAlerts } from './routeAlerts';
import { ensureAdmins } from './admins';

const app = buildApp();
if (env.devLoginOtp) console.warn('WARNING: DEV LOGIN (fixed OTP) is ON. Remove DEV_LOGIN_OTP from .env before going live.');

const close = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
// WhatsApp reminders & route alerts: every 5 minutes, only with a real provider (mock would mark them sent without sending).
if (remindersEnabled()) {
  const run = () => sendDueReminders().catch((e: Error) => console.error(`Reminder job: ${e.message}`));
  setInterval(run, 5 * 60_000).unref();
  setTimeout(run, 30_000).unref();

  const runRouteAlerts = () => sendNightlyRouteAlerts().catch((e: Error) => console.error(`Route alert job: ${e.message}`));
  setInterval(runRouteAlerts, 5 * 60_000).unref();
  setTimeout(runRouteAlerts, 45_000).unref();
} else console.warn('WhatsApp reminders are OFF (MESSAGING_PROVIDER=mock; set "meta" to send).');
if (!env.authSecret) console.warn('OTP login is OFF (set AUTH_SECRET to turn it on).');

process.on('SIGINT', close);
process.on('SIGTERM', close);

app
  .listen({ port: env.port, host: '0.0.0.0' })
  .then(async () => {
    console.log(`API ready on http://localhost:${env.port}`);
    // Managers from ADMIN_PHONES: a database hiccup must not stop the API.
    const made = await ensureAdmins().catch((e: Error) => (console.error(`ADMIN_PHONES: ${e.message}`), 0));
    if (made) console.log(`Created ${made} manager account(s) from ADMIN_PHONES`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
