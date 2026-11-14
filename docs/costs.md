# JTA Sales CRM — Infrastructure & Production Cost Sheet

**Target Scale:** ~400–500 Active Salesmen  
**Date:** November 2026  
**Currency:** All amounts shown in Indian Rupees (₹) with USD reference ($1 ≈ ₹85).

---

## 1. Summary Overview (At a Glance)

| Expense Category | Amount (Approx.) | Frequency | Note |
|---|---|---|---|
| **One-Time Setup & Accounts** | **₹2,400** | One-time | Play Store License ($25) + Dedicated SIM Card |
| **Monthly Cloud & Servers** | **₹4,250 – ₹4,850** | Monthly | Always-on Backend (Render) + Postgres DB & Storage (Supabase Pro) |
| **Monthly WhatsApp Usage** | **₹1,800 – ₹2,400** | Monthly | 400 Salesmen (Login OTPs + 8 AM Reminders + 10 PM Route Alerts) |
| **Maps & Location** | **₹0 (Free tier)** | Monthly | Ola Maps 1,00,000 requests/month included free |
| **Total Estimated Monthly Running Cost** | **~₹6,000 – ₹7,000 / month** | Recurring | Covers full 400–500 salesmen infrastructure |

*(Optional: Apple App Store license is ₹8,400/year if salesmen use iPhones).*

---

## 2. One-Time Setup Costs

| Item | Cost | Purpose | Paid To |
|---|---|---|---|
| **Google Play Developer Account** | **₹2,125** ($25) | Lifetime license to publish & update the Android app on Google Play Store | Google |
| **Dedicated Company SIM Card** | **~₹250** | Official WhatsApp Business Bot number (for sending OTPs & alerts) | Telecom (Jio/Airtel) |
| **Apple Developer Account (Optional)** | **₹8,400** ($99/year) | Only required if salesmen or managers use iOS/iPhones | Apple |
| **Custom Domain (Optional)** | **~₹800** / year | e.g., `api.jtaindia.com` (Professional API address) | Namecheap / GoDaddy |

---

## 3. Monthly Recurring Costs (Production Infrastructure)

### A. Cloud Hosting & Database
| Service | Plan | Monthly Cost | Purpose |
|---|---|---|---|
| **Supabase (PostgreSQL Database & Storage)** | **Pro Plan** | **₹2,125 / mo** ($25) | Secure cloud database, daily automated backups, 100 GB private storage for visit selfies and voice notes. |
| **Render (Backend API Server)** | **Standard / Starter** | **₹2,125 / mo** ($25) | Always-on server handling 400 salesmen punch-ins, meeting sync, GPS tracking, and cron jobs. *(Can start on ₹600/mo Starter plan and upgrade if needed).* |

---

### B. WhatsApp Cloud API (Meta Official)
Direct billing with Meta — **₹0 middleman or agency commission**. Pay-per-message on usage:

| Message Type | Meta Template | Rate / Message | Estimated Vol / Month | Approx. Cost |
|---|---|---|---|---|
| **Login Verification (OTP)** | `jta_login_otp` (Authentication) | ~₹0.14 | ~300 OTPs (Salesmen stay logged in) | **~₹45** |
| **Daily 8:00 AM Task Reminder** | `jta_visit_reminder` (Utility) | ~₹0.13 | ~12,000 to 15,000 messages (Follow-up client visits) | **₹1,600 – ₹1,950** |
| **Night 10:00 PM Route Deviation Alert** | `jta_route_alert` (Utility) | ~₹0.13 | ~500 to 1,000 alerts to Managers | **₹65 – ₹130** |
| **Total WhatsApp Monthly Cost** | | | | **~₹1,800 – ₹2,200 / mo** |

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
- Extra storage above 100 GB costs ~$0.021/GB (~₹1.80 per GB per month).

| Timeline | Total Stored Files | Approx Extra Storage Cost |
|---|---|---|
| **Months 1 – 3** | Under 100 GB | **₹0** (Included in Pro plan) |
| **Month 6** | ~350 GB | **~₹450 / month** |
| **Year 1** | ~750 GB | **~₹1,150 / month** |

*(Cost Optimization: After 1 year, older archived recordings can be shifted to Cloudflare R2 / Backblaze at ₹0.50/GB if needed, keeping everything accessible).*

---

## 5. Billing Best Practices for Client
1. **Ownership:** All accounts (Google Play, Meta Business, Render, Supabase) should be created using the **company's official email address and company credit/debit card**.
2. **Meta Business Verification:** Submit company GST / PAN certificate in Meta Business Suite to unlock messaging limits to 1,000+ recipients per day.
