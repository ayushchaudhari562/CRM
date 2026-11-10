# Sales Visit CRM Frontend

Production-ready frontend for a field-sales CRM built with **React Native**, **Expo SDK 58**, **TypeScript (strict)**, and **expo-router**.
Contains a single unified codebase for the field salesman mobile app (iOS, Android, and Web PWA) and the admin manager portal (responsive web-first bento grid + mobile views).

---

## 1. Quick Start

### Prerequisites
- Node.js (v18+ or v20+)
- npm or pnpm

### Installation
```bash
npm install
```

### Running the App
```bash
# Start Expo development server (iOS / Android / Web)
npm run start

# Run specifically on Web
npm run web

# Run on Android emulator / device
npm run android

# Run on iOS simulator / device
npm run ios

# Type check across the entire TypeScript codebase
npm run check-types
```

---

## 2. Developer Role & Screen Switcher (`DevBar`)
A sticky developer control bar is embedded at the top of the app in development:
- **Role Toggle**: One-click switch between `[Salesman]` and `[Admin]` views.
- **Offline Simulator**: Toggle simulated offline mode to inspect the `OfflineBanner` banner state.
- **Jump to Any Screen**: Expand the drawer to quickly jump to any of the 9 screens:
  1. `01 Login` (`/(salesman)/login`)
  2. `02 Home` (`/(salesman)/(tabs)`)
  3. `03 Check-in` (`/(salesman)/checkin`)
  4. `04 Details` (`/(salesman)/meeting-details`)
  5. `05 Saved` (`/(salesman)/meeting-saved`)
  6. `Visits List` (`/(salesman)/(tabs)/visits`)
  7. `06 Admin Home` (`/(admin)/(tabs)`)
  8. `07 Live Mon` (`/(admin)/(tabs)/monitoring`)
  9. `08 Report` (`/(admin)/report/m-3`)
  10. `09 Web Bento` (`/(admin)/bento` with Red theme tokens)

---

## 3. Architecture & Folder Structure

```
├── app/                              # expo-router file-system routes
│   ├── _layout.tsx                   # Root layout (QueryClient, ThemeProvider, Fonts, DevBar, OfflineBanner)
│   ├── index.tsx                     # Entry router (redirects based on role & auth state)
│   ├── (salesman)/                   # Salesman App Flow
│   │   ├── _layout.tsx               # Stack navigation for salesman flow
│   │   ├── login.tsx                 # Screen 01: Login with phone/ID & OTP
│   │   ├── checkin.tsx               # Screen 03: Check-in (GPS capture, verification, selfie)
│   │   ├── meeting-details.tsx       # Screen 04: Form with Zod validation, autocomplete, voice note
│   │   ├── meeting-saved.tsx         # Screen 05: Confirmation with automated actions list
│   │   └── (tabs)/                   # Salesman bottom tab bar
│   │       ├── _layout.tsx           # Custom 4-tab bar (Home, Visits, Map, Profile)
│   │       ├── index.tsx             # Screen 02: Home with 48-tick ring & follow-ups
│   │       ├── visits.tsx            # Visits list with filter chips (Today, Week, All)
│   │       ├── map.tsx               # Field territory map
│   │       └── profile.tsx           # Salesman profile, punch-in/out, role switcher
│   └── (admin)/                      # Admin Manager Portal
│       ├── _layout.tsx               # Admin stack layout
│       ├── bento.tsx                 # Screen 09: Responsive Admin Web Bento Grid (4-col, 2-col, 1-col)
│       ├── report/
│       │   └── [id].tsx              # Screen 08: Meeting report (Line chart, timeline, waveform, PDF)
│       └── (tabs)/                   # Admin mobile bottom tabs
│           ├── _layout.tsx           # 4-tab bar (Home, Team, Map, Reports)
│           ├── index.tsx             # Screen 06: Admin mobile home (86 visits ring, summary tiles)
│           ├── monitoring.tsx        # Screen 07: Live monitoring (field status bar, progress list)
│           ├── map.tsx               # Admin live map
│           └── reports.tsx           # Reports list
├── src/
│   ├── components/                   # Flat, reusable custom UI component library
│   │   ├── Button.tsx                # Pill buttons (52px normal, 60px hero, secondary, outline, white, danger)
│   │   ├── Field.tsx                 # 48px height inputs, radius 14, fill surface2, inline errors
│   │   ├── Chip.tsx                  # Rounded pill chips with active/inactive states
│   │   ├── SegmentedControl.tsx      # Segment switch (Interested / Closed / Not interested)
│   │   ├── Card.tsx                  # Flat surface cards (radius 22/24)
│   │   ├── TickRing.tsx              # SVG 48 radial tick ring for visits progress
│   │   ├── LineChart.tsx             # SVG visit progression curve with tooltip
│   │   ├── Waveform.tsx              # SVG audio waveform player with AI summary
│   │   ├── Timeline.tsx              # Meeting visit timeline with status nodes
│   │   ├── MapCard.tsx               # Vector map with location pins
│   │   ├── BottomTabBar.tsx          # Custom mobile bottom navigation bar
│   │   ├── DevBar.tsx                # Dev switcher toolbar
│   │   ├── OfflineBanner.tsx         # Warning banner for offline state
│   │   └── StateViews.tsx            # LoadingView, EmptyView, ErrorView
│   ├── theme/                        # Design tokens & ThemeProvider
│   │   ├── tokens.ts                 # Exact tokens from starter/theme.ts
│   │   ├── ThemeProvider.tsx         # Context supporting Green (mobile) and Red (admin web) accents
│   │   └── index.ts
│   ├── store/                        # Zustand global state (role, punch-in, meeting drafts, offline)
│   ├── services/                     # Typed service layer abstraction (CrmService)
│   ├── mocks/                        # Typed mock datasets (salesmen, clients, meetings, stats)
│   └── types/                        # Strict TypeScript interfaces with zero UI dependencies
└── starter/
    └── theme.ts                      # Original theme token reference
```

---

## 4. Theme Tokens & Dark Theme Implementation

The dark theme strictly applies the tokens from `starter/theme.ts`:
- **Colors**:
  - `bg`: `#0B0C0D`
  - `surface`: `#17181A`
  - `surface2`: `#1F2022`
  - `border`: `#2A2B2E`
  - `track`: `#3A3C40`
  - `neutral`: `#5A5C61`
  - `text`: `#F4F4F2`
  - `muted`: `#9EA1A6`
  - `accent`: `#7FC08A` (Salesman App & Admin Mobile)
  - `onAccent`: `#0B0C0D`
  - `accentSoftBg`: `#1F3A27`
  - `adminRed`: `#D13438` (Admin Web Bento hero tile and primary CTAs)
  - `adminRedText`: `#FF6B6F` (Red text on dark surfaces)
- **Geometry**:
  - Screen padding: `20`, Gap: `16`
  - Radius: `field: 14`, `chip: 20`, `card: 22`, `tile: 24`, `sheet: 28`, `pill: 26`
  - Buttons: 52px height (60px for hero CTA `Start new meeting`)
  - Inputs: 48px height, radius 14, fill `surface2`, 1px border `border`
  - Minimum touch target: at least 44x44 on all interactable elements

---

## 5. How to Swap Mock Services for a Real Backend

All screens consume data through `src/services/index.ts` using `@tanstack/react-query`. No screen makes direct mock data calls.

### Example: Connecting to a REST or GraphQL API
In `src/services/index.ts`:

```typescript
// Replace mock implementation:
export class CrmService {
  private baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.yourcrm.com';

  async getMeetings(salesmanId?: string): Promise<Meeting[]> {
    const res = await fetch(`${this.baseUrl}/meetings${salesmanId ? `?salesmanId=${salesmanId}` : ''}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error('Failed to fetch meetings');
    return res.json();
  }

  async createMeeting(input: Omit<Meeting, 'id' | 'salesmanId' | 'createdAt' | 'updatedAt'>): Promise<Meeting> {
    const res = await fetch(`${this.baseUrl}/meetings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Failed to create meeting');
    return res.json();
  }
}
```
Because all domain models in `src/types/index.ts` are pure TypeScript interfaces without any React or React Native dependencies, they can be directly shared with your Node/Fastify/NestJS backend repository.

---

## 6. What is Done, Mocked & Assumptions

### What is Done:
1. **Full native replication of all 9 screens**:
   - `01 Salesman Login`: Phone/employee ID input, OTP verification step, biometrics hint, web install card.
   - `02 Salesman Home`: Date, punch-in toggle, 48-tick radial progress ring, bottom sheet with 60px "Start new meeting" button, follow-ups list.
   - `03 Start Meeting / Check-in`: Pinned vector map, verification checklist, real camera / photo selfie capture (`expo-image-picker`), continue CTA.
   - `04 Meeting Details`: Client autocomplete with existing client detection ("Existing client found. Details filled in."), products multi-select, INR deal value, outcome segmented control, hold-to-record voice note with live timer, next visit picker, WhatsApp reminder toggle, photo/file attachments (`expo-document-picker`), sticky submit button with **Zod validation** and inline error messages.
   - `05 Meeting Saved`: Large 96px check circle, automated backend actions breakdown, "Start next meeting" and "Back to home" navigation.
   - `Visits List Screen`: Filter chips (`Today`, `Week`, `All`), visit cards with outcome badges, deal values, and timestamps.
   - `06 Admin Home`: Manager greeting, "+ Add salesman" modal, 86 visits radial tick ring, summary metrics (visits done vs target, deals closed value), outcome pills with counts.
   - `07 Live Monitoring`: Segmented status bar, field status legend (In meeting, On the road, Not started), today's progress list per salesman with revenue values.
   - `08 Meeting Report`: Salesman header badge, SVG visit progression line chart with "13:30 now" pill, 50% next visit progress circle, vertical timeline with completed/in-progress/planned states, waveform voice note player with AI summary text, PDF download action stub.
   - `09 Admin Web Bento Grid`: Fully responsive 4-column desktop, 2-column tablet, and 1-column mobile grid using the red theme tokens (`#D13438`, `#FF6B6F`), interactive audio player, live location map with glowing markers, and search.
2. **State & Validation**:
   - Zustand store managing user roles, punch-in state, meeting drafts, and simulated offline mode.
   - Zod schemas validating form fields.
   - TanStack React Query managing async data fetching, error retries, and cache invalidation.
3. **Accessibility & Design Compliance**:
   - Every button meets or exceeds the 44x44 min touch target.
   - Every icon-only element contains an `accessibilityLabel`.
   - Inter font loaded and styled across all text variants.
   - Flat surfaces, zero gradients, zero shadows as instructed.

### What is Mocked:
- GPS verification checks (fallbacks to mock coordinates if device sensors/permissions are unavailable).
- Audio transcription and AI summary text generation (mocked strings ready for LLM integration).
- PDF download (triggers a success notification stub).
- WhatsApp reminder sending (managed by BullMQ job in backend scope).
- Backend database persistence (data persists in-memory/Zustand during session).

### Assumptions:
- In production, salesman authentication will verify against a real SMS/WhatsApp OTP service; for testing, any 4-digit code (e.g. `1234`) signs in.
- The dev toolbar (`DevBar`) is rendered at the top of the app to allow quick switching between roles and screens during design and QA review.
