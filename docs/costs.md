# JTA Sales CRM — Infrastructure & Production Cost Sheet

**Target Scale:** ~400–500 Active Salesmen  
**Date:** November 2026  
**Currency Conversion:** **$1 USD = ₹95 INR** (Bank Forex & GST buffer included)

---

## 1. Summary Overview (At a Glance)

| Expense Category | Amount (Approx.) | Frequency | Note |
|---|---|---|---|
| **One-Time Setup & Accounts** | **₹2,625** | One-time | Play Store License ($25 = ₹2,375) + Dedicated SIM Card (₹250) |
| **Monthly Cloud & Servers** | **₹4,750** | Monthly | Always-on Backend (Render $25) + Postgres DB & Storage (Supabase Pro $25) |
| **Monthly WhatsApp Usage** | **₹2,000 – ₹2,450** | Monthly | 400 Salesmen (Login OTPs + 8 AM Reminders + 10 PM Route Alerts) |
| **Maps & Location** | **₹0 (Free tier)** | Monthly | Ola Maps 1,00,000 requests/month included free |
| **Total Estimated Monthly Running Cost** | **~₹6,800 – ₹7,200 / month** | Recurring | Covers full 400–500 salesmen infrastructure |

*(Optional: Apple App Store developer license is ₹9,405/year [$99] if salesmen use iPhones).*

---

## 2. One-Time Setup Costs

| Item | USD Cost | INR Cost (@ ₹95/$) | Purpose | Paid To |
|---|---|---|---|---|
| **Google Play Developer Account** | $25 | **₹2,375** | Lifetime license to publish & update Android app on Google Play Store | Google |
| **Dedicated Company SIM Card** | — | **~₹250** | Official WhatsApp Business Bot number (for sending OTPs & alerts) | Telecom (Jio/Airtel) |
| **Apple Developer Account (Optional)** | $99 / yr | **₹9,405** / yr | Only required if salesmen or managers use iOS/iPhones | Apple |
| **Custom Domain (Optional)** | ~$10 / yr | **~₹950** / yr | e.g., `api.jtaindia.com` (Professional API address) | Namecheap / GoDaddy |

---

## 3. Monthly Recurring Costs (Production Infrastructure)

### A. Cloud Hosting & Database
| Service | Plan | USD Cost | INR Cost (@ ₹95/$) | Purpose |
|---|---|---|---|---|
| **Supabase (PostgreSQL Database & Storage)** | **Pro Plan** | $25 / mo | **₹2,375 / mo** | Secure cloud database, daily automated backups, 100 GB private storage for visit selfies and voice notes. |
| **Render (Backend API Server)** | **Standard** | $25 / mo | **₹2,375 / mo** | Always-on server handling 400 salesmen punch-ins, meeting sync, GPS tracking, and cron jobs. *(Can start on Starter $7 ≈ ₹665/mo and scale up).* |
| **Subtotal (Servers & DB)** | | **$50 / mo** | **₹4,750 / mo** | |

---

### B. WhatsApp Cloud API (Meta Official)
Direct official billing with Meta — **₹0 middleman or agency commission**. Pay-per-message on actual usage:

| Message Type | Meta Template | Rate / Message | Estimated Vol / Month | Approx. Cost (INR) |
|---|---|---|---|---|
| **Login Verification (OTP)** | `jta_login_otp` (Authentication) | ~₹0.15 | ~300 OTPs (Salesmen stay logged in) | **~₹50** |
| **Daily 8:00 AM Task Reminder** | `jta_visit_reminder` (Utility) | ~₹0.14 | ~12,000 to 15,000 messages (Follow-up client visits) | **₹1,800 – ₹2,100** |
| **Night 10:00 PM Route Deviation Alert** | `jta_route_alert` (Utility) | ~₹0.14 | ~500 to 1,000 alerts to Managers | **₹70 – ₹140** |
| **Total WhatsApp Monthly Cost** | | | | **~₹2,000 – ₹2,300 / mo** |

*Note: Meta provides first 1,000 service conversations free every month.*

---

### C. Maps & App Updates
| Service | Plan | Cost | Details |
|---|---|---|---|
| **Ola Maps (Indian Provider)** | Startup / Pay-as-you-go | **₹0 / mo** | **First 1,00,000 map requests/month are completely FREE.** Covers all daily salesman routing and live manager maps. |
| **Expo EAS (App Delivery & OTA)** | Free Plan | **₹0 / mo** | Instant Over-The-Air (OTA) updates to salesmen phones without waiting for store approvals. |

---

## 4. Storage Scaling Plan (Long Term)
The system retains **100% of visit records, client selfies, and voice notes for life**:
- Supabase Pro includes **100 GB storage free**.
- Extra storage above 100 GB costs ~$0.021/GB (~₹2.00 per GB per month @ ₹95/$).

| Timeline | Total Stored Files | Approx Extra Storage Cost |
|---|---|---|
| **Months 1 – 3** | Under 100 GB | **₹0** (Included in Pro plan) |
| **Month 6** | ~350 GB | **~₹500 / month** |
| **Year 1** | ~750 GB | **~₹1,300 / month** |

*(Cost Optimization: After 1 year, older archived recordings can be shifted to Cloudflare R2 / Backblaze at ₹0.50/GB if needed, keeping everything accessible).*

---

## 5. Billing Best Practices for Client
1. **Ownership:** All accounts (Google Play, Meta Business, Render, Supabase) should be created using the **company's official email address and company credit/debit card**.
2. **Meta Business Verification:** Submit company GST / PAN certificate in Meta Business Suite to unlock messaging limits to 1,000+ recipients per day.
