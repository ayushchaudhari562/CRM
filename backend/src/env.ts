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
  // WhatsApp reminders (Twilio). All four set = reminders on; any missing = off.
  twilio: twilioConfig(),
};

function twilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim(); // e.g. +14155238886 (the WhatsApp sender)
  const reminderContentSid = process.env.TWILIO_REMINDER_CONTENT_SID?.trim(); // approved template, HX...
  return accountSid && authToken && from && reminderContentSid ? { accountSid, authToken, from, reminderContentSid } : null;
}
