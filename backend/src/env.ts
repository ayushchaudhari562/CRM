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

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseKey: required('VITE_SUPABASE_PUBLISHABLE_KEY'),
  isProduction,
  devLoginOtp,
  devJwtSecret,
};
