# JTA Sales CRM: running costs

Prepared 12 Nov 2026, updated 13 Nov 2026 (WhatsApp via Meta Cloud API replaces Twilio). All figures are estimates. Most rates are from public pricing pages or third-party
summaries, and some are from memory (marked). Check each provider's pricing page before paying.
Assumption: about 500 salesmen. All data, including voice notes, is kept for life.

---

## 1. Monthly costs

| Service | What it does | Plan | Cost / month (approx.) |
|---|---|---|---|
| **Supabase** | Database, file storage (voice notes), login | Pro | **$25** base, plus storage above 100 GB (see 3.1) |
| **Render** | Runs the backend API | Starter → Standard | **$7** (Starter). For 500 users probably **$25** (Standard); a load test will confirm |
| **WhatsApp OTP** (Meta Cloud API) | Login code on WhatsApp | Pay per message, card on Meta | **~₹30** a month (see 3.2) |
| **Ola Maps** | Maps in the app (salesman + manager live map) | Prepaid credits | **₹0** up to 1,00,000 requests a month, then a small per-request charge (see 3.3) |
| **WhatsApp reminders** (Meta Cloud API) | 8 am reminder to the salesman | Pay per message | **~₹2,300–2,900** for 20,000 a month (see 3.4) |
| **Expo (EAS)** | Builds the APK, sends over-the-air updates | Free | **$0** (free builds wait in a queue). Optional ~$19 for faster builds *(from memory)* |

**Total, first year: about $35–$60 a month for hosting (≈ ₹3,000–₹5,000) + about ₹2,300–2,900 for WhatsApp**
(≈ ₹5,300–₹7,900 in all), plus any Ola Maps usage above the free limit.

## 2. One-time costs

| Item | Cost (approx.) | Needed for |
|---|---|---|
| DLT registration (India) | ₹5,000 – ₹6,000 | **Not needed**: OTP goes on WhatsApp, not SMS |
| Google Play developer account | $25 once *(from memory)* | Publishing on the Play Store |
| Apple developer account | $99 / year *(from memory)* | Only if salesmen use iPhones |
| Domain (e.g. api.company.com) | ~₹800 / year *(from memory)* | Optional, nicer API address |
| Meta Business verification | Free | Not required to start; lifts the 250-a-day limit (see 3.4) |

## 3. Details

### 3.1 Storage growth (voice notes kept for life)
400 recordings a day, about 30 minutes each at 32 kbps ≈ 7 MB each.

| After | Stored | Extra Supabase cost / month (~$0.021 per GB above 100 GB, *from memory*) |
|---|---|---|
| 6 months | ~500 GB | ~$9 |
| 1 year | ~1 TB | ~$19 |
| 3 years | ~3 TB | ~$61 |

Later option to save money: move old recordings to cheaper storage (Backblaze B2 / Cloudflare R2). Nothing is deleted.

### 3.2 Login OTP on WhatsApp (Meta Cloud API)
- Our server makes the code; Meta delivers it with the approved **authentication** template (`jta_login_otp`).
- About **₹0.13–0.15 per code** (Meta's India authentication rate, third-party sources).
- The app keeps salesmen logged in until they sign out, so codes are rare: ~200 a month ≈ **₹30**.
- No DLT, no SMS provider.

### 3.3 Ola Maps
- Indian provider, rupee prepaid credits, no card needed for the free tier.
- **First 1,00,000 requests every month are free** (pricing from 1 Sep 2026).
- A map screen loads several map tiles, and each may count as a request. Real use will show if 500 salesmen
  stay inside the free limit. If not, the per-request charge applies (see Ola's pricing page).

### 3.4 WhatsApp reminders (Meta Cloud API)
- Sent at **8:00 am** on the follow-up day to the salesman's login number, with the approved **utility** template
  (`jta_visit_reminder`: "Good morning {{1}}! Today's task: visit {{2}} at {{3}}. - JTA Manager").
- About **₹0.115–0.145 per message** (Meta's India utility rate; sources differ). 20,000 a month ≈ **₹2,300–2,900**.
- **Limit without Meta Business Verification:** messages to at most **250 different numbers a day**. With 500 salesmen,
  a day with more than 250 salesmen to remind will fail for the rest (they are retried and an alert is logged).
  Business Verification raises the limit to at least 1,000 a day.
- Meta charges the card added in WhatsApp Manager directly; no middleman fee.

## 4. Who should own the accounts
Create every account (Supabase, Render, Meta / WhatsApp, Ola Maps, Expo, Google Play) in the **company's name with the
company card**. Moving accounts later is slow and risky.

---

## Sources
- WhatsApp pricing: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing ,
  https://whautomate.com/whatsapp-business-api-pricing-india , https://waba.nxccontrols.in/blog/10-best-whatsapp-api-providers-in-india
- Limits without verification: https://www.conferbot.com/limits/whatsapp , https://blueticks.co/blog/whatsapp-api-without-meta-verification
- Ola Maps pricing: https://maps.olakrutrim.com/pricing , https://maps.olakrutrim.com/pricing/update-2026
- MapTiler (alternative, not used): https://www.maptiler.com/cloud/pricing/
