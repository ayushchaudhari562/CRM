# JTA Sales CRM: running costs

Prepared 12 Nov 2026. All figures are estimates. Most rates are from public pricing pages or third-party
summaries, and some are from memory (marked). Check each provider's pricing page before paying.
Assumption: about 500 salesmen. All data, including voice notes, is kept for life.

---

## 1. Monthly costs

| Service | What it does | Plan | Cost / month (approx.) |
|---|---|---|---|
| **Supabase** | Database, file storage (voice notes), login | Pro | **$25** base, plus storage above 100 GB (see 3.1) |
| **Render** | Runs the backend API | Starter → Standard | **$7** (Starter). For 500 users probably **$25** (Standard); a load test will confirm |
| **Twilio Verify** | SMS OTP login | Pay as you go | **~$27** normal month, ~$80 first month (see 3.2) |
| **Ola Maps** | Maps in the app (salesman + manager live map) | Prepaid credits | **₹0** up to 1,00,000 requests a month, then a small per-request charge (see 3.3) |
| **WhatsApp reminders** (Twilio) | Follow-up reminders | Pay per message | Meta fee ~₹0.13 + Twilio fee per message (see 3.4) |
| **Expo (EAS)** | Builds the APK, sends over-the-air updates | Free | **$0** (free builds wait in a queue). Optional ~$19 for faster builds *(from memory)* |

**Total, first year: about $60–$90 a month (≈ ₹5,000–₹7,500)** plus WhatsApp and any Ola Maps usage above the free limit.

## 2. One-time costs

| Item | Cost (approx.) | Needed for |
|---|---|---|
| DLT registration (India) | ₹5,000 – ₹6,000 | SMS OTP (required by law, also with Twilio) |
| Google Play developer account | $25 once *(from memory)* | Publishing on the Play Store |
| Apple developer account | $99 / year *(from memory)* | Only if salesmen use iPhones |
| Domain (e.g. api.company.com) | ~₹800 / year *(from memory)* | Optional, nicer API address |
| Meta Business verification | Free | WhatsApp reminders |

## 3. Details

### 3.1 Storage growth (voice notes kept for life)
400 recordings a day, about 30 minutes each at 32 kbps ≈ 7 MB each.

| After | Stored | Extra Supabase cost / month (~$0.021 per GB above 100 GB, *from memory*) |
|---|---|---|
| 6 months | ~500 GB | ~$9 |
| 1 year | ~1 TB | ~$19 |
| 3 years | ~3 TB | ~$61 |

Later option to save money: move old recordings to cheaper storage (Backblaze B2 / Cloudflare R2). Nothing is deleted.

### 3.2 SMS OTP (Twilio Verify)
- About **$0.13 (≈ ₹11) per login**: $0.05 Verify fee + $0.0832 SMS to India.
- The app keeps salesmen logged in, so OTP is needed only on a new phone, a reinstall or after logging out.
- Normal month ~200 logins ≈ $27. First month ~600 ≈ $80.
- Full setup steps: [twilio-plan.md](twilio-plan.md).

### 3.3 Ola Maps
- Indian provider, rupee prepaid credits, no card needed for the free tier.
- **First 1,00,000 requests every month are free** (pricing from 1 Sep 2026).
- A map screen loads several map tiles, and each may count as a request. Real use will show if 500 salesmen
  stay inside the free limit. If not, the per-request charge applies (see Ola's pricing page).

### 3.4 WhatsApp reminders
- Utility template message: Meta fee about ₹0.13 each, plus Twilio's per-message fee (check Twilio's rate card).
- Example: 400 reminders a day ≈ 12,000 a month × (₹0.13 + Twilio fee).

## 4. Who should own the accounts
Create every account (Supabase, Render, Twilio, Ola Maps, Expo, Google Play) in the **company's name with the
company card**. Moving accounts later is slow and risky.

---

## Sources
- Twilio Verify: https://www.authgear.com/post/twilio-verify-pricing-and-alternatives/ , https://www.engagelab.com/blog/twilio-verify-pricing
- Twilio SMS India: https://textbee.dev/sms-pricing/twilio/in
- Twilio India DLT: https://support.twilio.com/hc/en-us/articles/21162166457755-Documents-Required-and-Instructions-to-Register-Your-Alphanumeric-Sender-ID-in-India
- WhatsApp pricing: https://twilio.com/whatsapp/pricing , https://developers.facebook.com/docs/whatsapp/pricing
- Ola Maps pricing: https://maps.olakrutrim.com/pricing , https://maps.olakrutrim.com/pricing/update-2026
- MapTiler (alternative, not used): https://www.maptiler.com/cloud/pricing/
