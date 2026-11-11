// Builds the API (no listen). Used by server.ts and by the tests, so tests run the real app.
import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './env';
import { authenticate, HttpError } from './auth';
import { toAppUser } from './dto';
import { salesmanRoutes } from './routes/salesman';
import { adminRoutes } from './routes/admin';
import { devLoginRoutes } from './devLogin';

export function buildApp({ logger = true } = {}) {
  const app = Fastify({
    logger: logger && { level: env.isProduction ? 'info' : 'warn' },
    bodyLimit: 100 * 1024, // JSON only; files go straight to storage, never through the API
    requestTimeout: 15_000,
    trustProxy: env.isProduction, // behind the host's proxy in prod: real client IP for rate limits
    ajv: { customOptions: { removeAdditional: true, coerceTypes: true, useDefaults: true } },
  });

  // Native apps send no Origin header, so CORS only matters for the web build.
  // Auth is a Bearer token (no cookies), so this does not open CSRF.
  void app.register(cors, { origin: env.corsOrigins ?? true });

  // Per IP. Login routes set a much lower limit of their own.
  void app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

  // One error format for the whole API: { error, message }.
  const PRISMA_ERRORS: Record<string, [number, string, string]> = {
    P2002: [409, 'conflict', 'This already exists.'],
    P2003: [400, 'invalid', 'A linked record does not exist.'],
    P2025: [400, 'invalid', 'A linked record does not exist.'],
  };
  app.setErrorHandler((err: FastifyError & { code?: string }, req, reply) => {
    if (err instanceof HttpError)
      return reply.status(err.status).send({ error: err.code, message: err.message });
    if (err.validation) {
      return reply
        .status(400)
        .send({
          error: 'invalid',
          message:
            `Invalid ${err.validationContext ?? 'input'}: ${err.validation[0]?.message ?? ''}`.trim(),
        });
    }
    const prismaErr = err.code ? PRISMA_ERRORS[err.code] : undefined;
    if (prismaErr)
      return reply.status(prismaErr[0]).send({ error: prismaErr[1], message: prismaErr[2] });
    // Fastify's own 4xx (bad JSON, body too large, rate limited...): pass through, don't turn into 500.
    if (err.statusCode && err.statusCode < 500) {
      return reply
        .status(err.statusCode)
        .send({
          error: err.statusCode === 429 ? 'rate_limited' : 'bad_request',
          message: err.message,
        });
    }
    req.log.error(err);
    return reply
      .status(500)
      .send({ error: 'server_error', message: 'Something went wrong. Please try again.' });
  });

  app.get('/health', async () => ({ ok: true }));

  // Any logged-in user: who am I (role comes from our DB).
  app.get('/me', { onRequest: authenticate }, async (req) => toAppUser(req.user!));

  void app.register(salesmanRoutes);
  void app.register(adminRoutes);
  void app.register(devLoginRoutes);
  return app;
}
