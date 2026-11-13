# JTA Sales CRM: handover for the next developer / AI assistant

State as of 13 Nov 2026. Read this whole file first. It has no secrets: every key lives in git-ignored `.env` files,
the Render dashboard, or the Expo (EAS) environment. Ask the owner (Ayush) for any value you need; never print or commit one.

## 1. What the product is
A sales-visit CRM for a company (Jain Tyres & Automobiles, "JTA"), about 500 salesmen.
- **Salesman app (Android):** punch in / out, start a meeting (check-in with GPS + address), fill the visit form
  (client, shop address, deal value, outcome, note, voice note, next visit / reminder), see today's visits, follow-ups,
  own daily target, own live location on a map.
- **Manager app (same APK):** live monitoring (who is on duty, today's visits), outcome lists, reports, live team map,
  add salesmen.
- Salesmen see only their own data. Roles are decided by the database, never by the app.

## 2. Stack and where things are
| Part | Tech | Where |
|---|---|---|
| App | Expo SDK 58, React Native, expo-router, TanStack Query, Zustand | repo root: `app/` (screens), `src/` (components, services, utils, theme, types) |
| API | Fastify 5, Prisma 7 (adapter-pg), Postgres on Supabase (Sydney pooler) | `backend/` |
| Tests | `node:test` through `tsx --test` | `backend/test/` (95 tests) |
| Hosting | Render web service, deploys the **`main`** branch, root `backend`, build `npm ci && npx prisma generate && npx prisma migrate deploy`, start `npm start` | https://crm-501r.onrender.com |
| Files | Supabase Storage, private bucket `visit-files` (voice notes, selfies) | `backend/src/storage.ts` |
| Maps | Ola Maps vector tiles drawn by MapLibre in a WebView | `src/components/OlaMapView.tsx`, key in EAS env `EXPO_PUBLIC_MAP_KEY` |
| Builds | EAS (Expo) project `@ayush_chaudhari/sales-crm`, channel `preview` | `eas.json`, `app.json` |

Repo: https://github.com/ayushchaudhari562/CRM. Work happens on `feature/live-location` and is **merged into `main`** after
each piece (Render only deploys `main`).

Key backend files: `app.ts` (routes + one error format), `auth.ts`, `otp.ts` (login), `sessions.ts` (tokens),
`messaging.ts` (WhatsApp sender, mock by default), `reminders.ts` (8 am reminder job), `admins.ts` (ADMIN_PHONES),
`routes/salesman.ts`, `routes/admin.ts`, `schemas.ts`, `meetings.ts`, `tracking.ts`, `planning.ts`, `storage.ts`.
Key app files: `src/services/index.ts` (API client, refreshes the token once for all calls), `src/services/session.ts`
(login kept in secure storage), `src/utils/location.ts`, `src/utils/shift.ts`, `app/login.tsx`.

## 3. How to run and check (always do this before saying something works)
```
cd backend && npx tsc -p . && npm test          # backend: typecheck + 95 tests
cd .. && npx tsc --noEmit && npx expo lint       # app
npx expo start                                    # app in Expo Go / emulator (set EXPO_PUBLIC_API_URL in .env)
```
- Never claim a thing works unless you ran it. Say what you did NOT verify.
- The laptop cannot reach the database on the college WiFi (ports 6543 and 5432 are blocked). Use the phone hotspot,
  or test through the live Render API.
- Our test APK is arm64 only, so it does not run on the x86_64 Android emulator. Use Expo Go there.

## 4. Login (OTP on our own server)
- `POST /auth/request-otp`, `/auth/verify-otp`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all` (`backend/src/otp.ts`).
- Only numbers a manager added can log in; an unknown number is told "not registered" at once (the owner chose this).
- Code: 6 digits, 5 minutes, 5 wrong tries, 60 s between codes, at most 3 codes per 5 minutes. Only an HMAC is stored.
- **Session has no time limit.** The salesman logs in once and stays logged in until sign out, "log out everywhere",
  or a manager deactivates them. Never log anyone out because of being offline.
- Managers come from the `ADMIN_PHONES` setting (`"Name:9876543210,..."`), created at server start.
- **Test mode (current):** Render has `NODE_ENV=development`, `DEV_LOGIN_OTP=123456`, `MESSAGING_PROVIDER=mock`.
  Every registered number then logs in with code `123456`. **Anyone who knows a number can log in. Turn this off before real data.**

## 5. WhatsApp (OTP + reminders): built, waiting for Meta
- Sender: Meta WhatsApp Cloud API directly (`backend/src/messaging.ts`). `MESSAGING_PROVIDER=mock` only logs (the OTP is hidden in the log).
- Reminder: 8:00 am India time on the follow-up day, to the salesman's login number, once per follow-up, retried with
  backoff (max 8), skipped for opted-out salesmen. Template `jta_visit_reminder`:
  `Good morning {{1}}! Today's task: visit {{2}} at {{3}}. - JTA Manager` ({{1}} salesman, {{2}} client, {{3}} time).
- Login code uses an **authentication** template `jta_login_otp` (code in the body and in a copy-code button).
- Meta templates were still "In review" on 13 Nov: `jta_login_otp` (en), `jta_visit_reminder` (en), `jta_login_otp_v2` (en_US).
  A template exists per language code, so set `WHATSAPP_OTP_LANG` / `WHATSAPP_REMINDER_LANG` to exactly what Meta shows.
- The reminder job runs inside the API process, and **only when `MESSAGING_PROVIDER=meta`**. A free Render server sleeps,
  so an 8 am reminder would not fire: use a paid, always-on Render plan.
- Meta's free test number can message only 5 verified numbers. Production needs the company's own number,
  a card in WhatsApp Manager, and **Business Verification** (without it: 250 different recipients per day).

## 6. Environment settings (names only)
- **Render:** `DATABASE_URL`, `DIRECT_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `NODE_VERSION`, `NODE_ENV`, `DEV_LOGIN_OTP`, `DEV_JWT_SECRET`, `AUTH_SECRET`, `MESSAGING_PROVIDER`, `ADMIN_PHONES`,
  `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_OTP_TEMPLATE`,
  `WHATSAPP_REMINDER_TEMPLATE`, `WHATSAPP_TEMPLATE_LANG` (and the two `_LANG` settings above). See `backend/.env.example`.
- **App / EAS environment `preview`:** `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`, `EXPO_PUBLIC_MAP_KEY`.
- Only `EXPO_PUBLIC_*` values are bundled in the app, so they must be safe to be public.

## 7. Shipping changes to phones
- **JavaScript-only changes** (screens, logic): over-the-air update, no new APK:
  `npx eas-cli update --channel preview --environment preview --platform android --message "..."`
  then check the bundle really contains the server URL (`grep -c crm-501r.onrender.com dist/_expo/static/js/android/*.hbc` must be 1).
  Installed apps pick it up after being opened twice.
- **Native changes** (a new native library, icon, permissions, app name): a new APK, `npx eas-cli build -p android --profile preview`.
  The current APK is version **1.0.1** (versionCode 2). Only APKs of the same version receive the update, so never publish
  code that needs a native module the installed APK lacks.
- The free Expo build queue can take an hour or more.

## 8. Rules the owner set (keep following them)
1. Reply to the owner in **Hinglish (Roman script)**. Be honest and short.
2. Keep the code simple. **No new library without asking.** Use theme tokens, no hard-coded colours.
3. **All real data is kept for life** (voice notes included). Never add a cleanup or delete job for real data.
   The only exception: the seeded fake users (see 9.2).
4. Secrets only in `.env` files / dashboards. Never in git, never in chat, never in logs. Do not commit `.env`.
5. Work in small steps: say what you will do, do it, run typecheck + tests, review it, report what you did and did not verify.
6. Salesman and manager stay separate; a salesman sees only their own data.
7. Ask before anything costly, destructive or outward-facing.

## 9. What is left (in this order)
1. **Fake test data:** the database still has 12 seeded salesmen and 2 seeded managers (phones `+9190000xxxxx`) with test visits.
   The real manager (`ADMIN_PHONES`) exists and works. On the phone hotspot, from `backend/`:
   `npm run db:clear-test-data` (preview, shows counts), then `npm run db:clear-test-data -- --yes`.
   It touches only `+9190000xxxxx` numbers and refuses to run unless a real manager exists. Deletion cannot be undone.
2. **Go live with WhatsApp:** when Meta approves the templates, add the real sender number, card and Business Verification, then on
   Render set `MESSAGING_PROVIDER=meta`, delete `DEV_LOGIN_OTP`, set `NODE_ENV=production`, set the `WHATSAPP_*` settings.
   Test a real code and a real reminder (a reminder can be tested today: save a visit with "Pick date" = today, a time 1–2 hours later).
3. **Rotate secrets that appeared in chat screenshots:** database password, Supabase service key, `DEV_JWT_SECRET`, `AUTH_SECRET`,
   the Ola client secret; delete the old Ola AI key. Update Render / `.env` / EAS afterwards.
4. **Paid, always-on hosting:** Render Starter or Standard, Supabase Pro. Run a 500-user load test and report real numbers.
5. **Not built yet:** offline queue in the app (the backend `/me/sync` is ready), manager "deactivate another manager",
   background location tracking (needs a new APK and the "all the time" permission), follow-up / target screens polish,
   Google Play release (app signing, store listing), README.
6. `docs/costs.md` is the cost sheet (about 15,000 WhatsApp messages a month, production plans). `docs/twilio-plan.md` is outdated
   (Twilio was dropped for Meta's WhatsApp Cloud API); ignore or delete it.
