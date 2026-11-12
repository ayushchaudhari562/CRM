import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.includes('[YOUR-PASSWORD]')) {
    throw new Error(`Missing env var ${name} (see backend/.env.example)`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === 'production';

// TEMPORARY dev login (fixed OTP) until Supabase phone OTP is enabled.
// On only when DEV_LOGIN_OTP is set AND not production. Remove both lines from .env to turn it off.
const devLoginOtp = !isProduction ? process.env.DEV_LOGIN_OTP?.trim() || null : null;
if (devLoginOtp && !/^\d{6}$/.test(devLoginOtp)) throw new Error('DEV_LOGIN_OTP must be 6 digits');
const devJwtSecret = devLoginOtp ? required('DEV_JWT_SECRET') : null;
if (devJwtSecret && devJwtSecret.length < 32) throw new Error('DEV_JWT_SECRET must be at least 32 characters');

const corsOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseKey: required('VITE_SUPABASE_PUBLISHABLE_KEY'),
  isProduction,
  // Comma-separated web origins allowed to call the API. Unset = allow any (fine for dev / native apps).
  corsOrigins: corsOrigins.length ? corsOrigins : null,
  // File storage. Unset key = uploads off (API still runs; files show as unavailable).
  storageKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null,
  storageBucket: process.env.STORAGE_BUCKET?.trim() || 'visit-files',
  devLoginOtp,
  devJwtSecret,
  // Signs our access tokens and the OTP hashes. Without it, OTP login is off (the old logins keep working).
  authSecret: authSecret(),
  messaging: messagingConfig(),
};

function authSecret() {
  const s = process.env.AUTH_SECRET?.trim();
  if (s && s.length < 32) throw new Error('AUTH_SECRET must be at least 32 characters');
  return s || null;
}

/** Who delivers WhatsApp messages. "mock" (default) only logs, so development never sends real messages. */
function messagingConfig() {
  const provider = (process.env.MESSAGING_PROVIDER?.trim() || 'mock') as 'mock' | 'meta';
  if (provider === 'mock') return { provider } as const;
  if (provider !== 'meta') throw new Error('MESSAGING_PROVIDER must be "mock" or "meta"');
  const need = (name: string) => {
    const v = process.env[name]?.trim().replace(/^"|"$/g, '');
    if (!v) throw new Error(`${name} is required when MESSAGING_PROVIDER=meta`);
    return v;
  };
  return {
    provider,
    token: need('WHATSAPP_TOKEN'), // permanent System User token
    phoneNumberId: need('WHATSAPP_PHONE_NUMBER_ID'), // the sender (Meta's ID, not the phone number)
    templates: { otp: need('WHATSAPP_OTP_TEMPLATE'), reminder: need('WHATSAPP_REMINDER_TEMPLATE') },
    language: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || 'en',
  } as const;
}
