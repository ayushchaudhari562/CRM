# JTA Sales CRM: running costs (production setup)

Prepared 12 Nov 2026, updated 13 Nov 2026. All figures are estimates. Most rates come from public pricing pages or
third-party summaries, and some are from memory (marked *from memory*). Check each provider's pricing page before paying.
Exchange rate used: about ₹85 per US$1.

**What this plan assumes (production, not a test setup):**
- About **500 salesmen**, all on paid, always-on services (no free plans that sleep or stop).
- About **15,000 WhatsApp messages a month** (reminders, plus a few login codes).
- Login code on WhatsApp, and a visit reminder on WhatsApp at 8:00 am to the salesman's login number.
- All data, including voice notes, is kept for life.

---

## 1. Monthly costs

| Service | What it does | Production plan | Cost / month (approx.) |
|---|---|---|---|
| **Supabase** | Database, file storage (voice notes) | **Pro** (daily backups, no pausing) | **$25 ≈ ₹2,125** + storage above 100 GB (see 3.1) |
| **Render** | Runs the backend API, always on | **Standard** (for 500 users; **Starter $7 ≈ ₹600** is the minimum always-on plan) | **$25 ≈ ₹2,125** (a load test will show if Starter is enough) |
| **WhatsApp reminders** (Meta Cloud API) | 8 am reminder to the salesman | Pay per message, card on Meta | **₹1,725 – ₹2,175** for 15,000 messages (see 3.4) |
| **WhatsApp login codes** | Login code on WhatsApp | Pay per message | **~₹30** (about 200 codes, see 3.2) |
| **Ola Maps** | Maps in the app (salesman + manager live map) | Prepaid credits | **₹0** up to 1,00,000 requests a month, then a small per-request charge (see 3.3) |
| **Expo (EAS)** | Builds the APK, sends over-the-air updates | Free | **₹0** (builds wait in a queue; optional ~$19 for faster builds, *from memory*) |

**Total: about ₹6,000 – ₹6,500 a month** (Supabase + Render Standard + WhatsApp), plus the growing storage cost in 3.1
and any Ola Maps usage above the free limit.
With Render Starter instead of Standard: about ₹4,500 – ₹5,000 a month.

## 2. One-time and yearly costs

| Item | Cost (approx.) | Needed for |
|---|---|---|
| Google Play developer account | $25 once ≈ ₹2,100 *(from memory)* | Publishing on the Play Store |
| A new SIM / phone number for WhatsApp | A few hundred rupees | The sender number; it must **not** be used on normal WhatsApp |
| Apple developer account | $99 / year ≈ ₹8,400 *(from memory)* | Only if salesmen use iPhones |
| Domain (e.g. api.company.com) | ~₹800 / year *(from memory)* | Optional, nicer API address |
| DLT registration (India) | ₹0 | **Not needed**: login codes go on WhatsApp, not SMS |
| Meta Business verification | Free, needs company documents | **Needed for production** (see 3.4) |

## 3. Details

### 3.1 Storage growth (voice notes & visit selfies kept for life)
- Voice notes: ~400 recordings/day, ~30 min each at 32 kbps ≈ 7 MB each (~2.8 GB/day).
- Check-in selfies: ~400 selfies/day, compressed JPEG ≈ 250 KB each (~100 MB/day, ~3 GB/month).

| After | Stored | Extra Supabase cost / month (~$0.021 per GB above 100 GB, *from memory*) |
|---|---|---|
| 6 months | ~500 GB | ~$9 ≈ ₹765 |
| 1 year | ~1 TB | ~$19 ≈ ₹1,600 |
| 3 years | ~3 TB | ~$61 ≈ ₹5,200 |

Later option to save money: move old recordings to cheaper storage (Backblaze B2 / Cloudflare R2). Nothing is deleted.

### 3.2 Login codes on WhatsApp (Meta Cloud API)
- Our server makes the code; Meta delivers it with the approved **authentication** template (`jta_login_otp`).
- About **₹0.13–0.15 per code** (Meta's India authentication rate, third-party sources).
- The app keeps salesmen logged in until they sign out, so codes are rare: about 200 a month ≈ **₹30**.
- Only numbers added by a manager can ask for a code, so no money is spent on strangers.
- A number can ask for at most 3 codes in 5 minutes, with 60 seconds between codes.
- No DLT, no SMS provider.

### 3.3 Ola Maps
- Indian provider, rupee prepaid credits, no card needed for the free tier.
- **First 1,00,000 requests every month are free** (pricing from 1 Sep 2026).
- A map screen loads several map tiles, and each may count as a request. Real use will show if 500 salesmen
  stay inside the free limit. If not, the per-request charge applies (see Ola's pricing page).

### 3.4 WhatsApp reminders (Meta Cloud API)
- Sent at **8:00 am** on the follow-up day to the salesman's login number, with the approved **utility** template
  (`jta_visit_reminder`: "Good morning {{1}}! Today's task: visit {{2}} at {{3}}. - JTA Manager").
- About **₹0.115–0.145 per message** (Meta's India utility rate; sources differ).
  **15,000 a month ≈ ₹1,725 – ₹2,175.** Meta charges the card added in WhatsApp Manager; there is no middleman fee.
- 15,000 a month is about 500 a day. If most of the 500 salesmen get a reminder on the same day, that is about
  **500 different numbers in one day**.
- **Why Meta Business verification is needed for production:** without it, WhatsApp allows messages to only
  **250 different numbers in 24 hours**. Salesmen beyond that on a busy day would not get their reminder
  (the server retries and logs an alert, so nothing disappears silently). With verification, the limit is
  at least 1,000 different numbers a day. Verification needs the company's documents (GST certificate, PAN).

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
