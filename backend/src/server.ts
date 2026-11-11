import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './env';
import { prisma } from './db';
import { authenticate, HttpError } from './auth';
import { toAppUser } from './dto';
import { salesmanRoutes } from './routes/salesman';
import { adminRoutes } from './routes/admin';
import { devLoginRoutes } from './devLogin';

const app = Fastify({ logger: { level: env.isProduction ? 'info' : 'warn' } });

// The app runs on a phone / browser, not on our domain, so allow cross-origin calls.
// Auth is a Bearer token (no cookies), so this does not open CSRF.
void app.register(cors, { origin: true });

// One error format for the whole API: { error, message }.
app.setErrorHandler((err, req, reply) => {
  if (err instanceof HttpError) return reply.status(err.status).send({ error: err.code, message: err.message });
  req.log.error(err);
  return reply.status(500).send({ error: 'server_error', message: 'Something went wrong. Please try again.' });
});

app.get('/health', async () => ({ ok: true }));

// Any logged-in user: who am I (role comes from our DB).
app.get('/me', { preHandler: authenticate }, async (req) => toAppUser(req.user!));

void app.register(salesmanRoutes);
void app.register(adminRoutes);
void app.register(devLoginRoutes);
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
