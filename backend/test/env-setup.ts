// Test env: set BEFORE src/env.ts loads (.env never overrides vars that are already set).
// Everything points nowhere, so a test can never touch the real DB, Supabase or storage.
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/test',
  VITE_SUPABASE_URL: 'http://127.0.0.1:1',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  SUPABASE_SERVICE_ROLE_KEY: '',
  DEV_LOGIN_OTP: '123456',
  DEV_JWT_SECRET: 'test-secret-test-secret-test-secret-0000',
});
