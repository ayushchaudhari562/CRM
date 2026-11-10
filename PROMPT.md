# Task: build the FRONTEND ONLY of a Sales Visit CRM (React Native + TypeScript)

You are a senior React Native engineer. Build a polished, production-quality FRONTEND for a field-sales CRM.
Do NOT build a real backend now. Use typed mock data and a service layer so a TypeScript backend can be plugged in later.

## 1. What the product does
Salesmen visit shops/offices. For every visit they log: who they met, where (GPS location), what time, the deal, and what was discussed (typed text or a voice note). A manager monitors everything in an admin portal. If a client says "come back after 7 days", the salesman gets a reminder on that day (WhatsApp later, backend job). Today we build only the screens and flows.

## 2. Stack (use exactly this)
- Expo (latest SDK) + React Native + TypeScript (strict mode), expo-router for navigation
- One codebase: salesman app (iOS/Android, also runs on web as a PWA) and admin portal (responsive, web-first)
- State: Zustand. Forms: react-hook-form + zod. Data layer: TanStack Query on top of a mock service.
- Icons: lucide-react-native. SVG (rings, charts, waveform, map placeholder): react-native-svg. Fonts: Inter (400/500/600) via @expo-google-fonts/inter.
- Device features (real, with permission handling and graceful fallbacks): expo-location (check-in), expo-camera or expo-image-picker (selfie/photo), expo-audio (hold-to-record voice note), expo-document-picker (attach file).
- No UI kit that fights the design. Build our own small component library.

## 3. Design: DARK/BLACK theme (mandatory)
Use `starter/theme.ts` tokens exactly. Black background, dark grey cards, soft green accent. Rounded cards, pill buttons, large clean typography, generous spacing.
- Screen padding 20, gap 16. Cards radius 22-24. Bottom sheets radius 28 on top corners. Buttons are pills, 52px high (60px for the main CTA). Inputs 48px high, radius 14, fill surface2, 1px border.
- Text sizes: h1 30/600, title 18/600, body 15, label 13 muted, caption 12 muted.
- Touch targets at least 44x44. Every icon-only button has an accessibilityLabel. Text contrast at least 4.5:1.
- No emoji in UI. No gradients, no shadows, flat surfaces.
- Visual reference for every screen is in `design-reference/*.html`. They are exported mockups: use them ONLY as a visual guide (layout, spacing, copy). Do not copy their HTML. Recreate natively in React Native.
- The admin WEB screen (`09-admin-web-bento.html`) uses the same dark theme but with RED as the accent (adminRed fill for the hero tile and primary buttons, adminRedText for red text). Make accent a theme token so this is a one-line switch.

## 4. Screens to build

### Salesman app (mobile, 390x844 base)
1. Login (`01`): app logo tile, "Welcome in, [APP NAME]", field "Phone number or employee ID", "Send OTP" button (then OTP input step), hint "Next time: face unlock or fingerprint", "Add to Home Screen" install card (show on web only).
2. Home (`02`): date + "Punch in" outline pill, heading "Good morning, Today's plan", ring of 48 radial ticks showing visits done vs target (e.g. 3/8), bottom sheet with big "Start new meeting" button and "Follow-ups due today" list (initial tile, client name, type and time, status chip). Bottom tab bar: Home, Visits, Map, Profile.
3. Start meeting / check-in (`03`): map card with pin, checklist (location captured, time saved, fake-GPS check passed), selfie card with "Open camera", "Continue to client details".
4. Meeting details (`04`): client name (autocomplete, shows "Existing client found. Details filled in."), business type, contact number, product chips (multi-select), deal value (INR), outcome segmented control (Interested / Closed / Not interested), hold-to-record voice note card with timer and "Text summary appears after saving", next-visit date-time picker, WhatsApp reminder toggle row, "Add photo or file", sticky "Submit". Validate with zod and show inline errors.
5. Meeting saved (`05`): big check, "Meeting saved", list of automatic actions (report added to manager portal, reminder set, visit count updated), "Start next meeting", "Back to home".
Also add: an offline banner state (UI only) and a "Visits" list screen with filter chips (Today, Week, All).

### Admin portal
6. Admin home (`06`, mobile): date, "+ Add salesman", "Welcome in, Manager", big ring "86 Visits today", bottom sheet with tiles (visits of target, deals closed) and outcome pills.
7. Live monitoring (`07`, mobile): segmented status bar (In meeting / On the road / Not started), legend with counts, "Today's progress" list per salesman with amounts.
8. Meeting report (`08`, mobile): salesman header, "Meeting report", line chart of visits through the day, next-visit card, visit timeline (done / in progress / planned), voice note player with waveform and AI summary text, "Download report (PDF)" button (stub).
9. Admin web bento grid (`09`, responsive): 4-column bento on wide screens, 2 columns on tablet, 1 column on phone. Tiles: hero visits-today (red), deals closed, follow-ups, field status, live locations map placeholder, outcomes bars, WhatsApp reminders sent, today's progress, latest voice note with AI summary. Top bar with Overview / Team / Map / Reports and "+ Add salesman".

## 5. Architecture rules
- Folders: `app/` (expo-router routes, grouped `(salesman)` and `(admin)`), `src/components/` (Button, Field, Chip, Card, Tile, Ring, Waveform, Timeline, TabBar, SegmentedControl, etc.), `src/features/` (visits, clients, monitoring), `src/services/` (mock API), `src/mocks/`, `src/types/`, `src/theme/`.
- All data comes through `src/services/*` returning Promises, typed with interfaces in `src/types` (Salesman, Client, Meeting, Outcome, Reminder, VoiceNote, Attachment). Mock implementation now; real HTTP implementation swaps in later without touching screens.
- Mock numbers and names (Client A, Salesman A, amounts) are sample data only.
- Role switch for development: a dev toggle to open as Salesman or Admin. No real auth yet.
- Every screen needs loading, empty and error states.
- Reusable components, no copy-pasted styles, no inline magic numbers (use tokens).
- ESLint + Prettier, strict TS, no `any`.

## 6. Out of scope for now
Real backend, database, real OTP, email, WhatsApp, AI/voice transcription. Show the AI summary and reminder text as mock data. Leave clearly marked TODO service interfaces for them.

## 7. Later backend (do not build, just keep types ready)
TypeScript backend (Node + Fastify or NestJS), PostgreSQL + Prisma, S3-compatible storage for voice/photos, BullMQ for scheduled reminders, WhatsApp Business Cloud API, an LLM for voice summary and "next visit date" extraction. Keep `src/types` free of UI imports so it can move to a shared package.

## 8. Deliverables
1. Working Expo project that runs with `npx expo start` (iOS, Android, web).
2. README with setup, scripts, folder map, and how to swap mock services for real APIs.
3. Work in small steps: scaffold + theme + component library first, then salesman flow, then admin screens. After each step, run the app and fix errors before moving on.
4. At the end, list what is done, what is mocked, and any assumptions.
