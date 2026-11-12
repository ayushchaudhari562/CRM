# Twilio plan: SMS OTP login + WhatsApp reminders

Prepared 12 Nov 2026 for the JTA Sales CRM app.
All prices are estimates from public sources (listed at the end). Twilio's own India rate card was not
checked directly, so confirm every rate in the Twilio console before paying.

---

## 1. Cost

### 1.1 One-time costs

| Item | Cost (approx.) | Why |
|---|---|---|
| DLT registration in India (company as "Principal Entity") | ₹5,000 – ₹6,000 | Indian law: every business SMS must come from a DLT-registered company, sender ID and template. Needed with Twilio too. |
| Sender ID registration with Twilio (e.g. `JTAPVT`) | Check in Twilio console | Twilio registers your DLT sender ID on its Indian routes. |
| WhatsApp: Meta Business verification | Free | Company documents only. |

### 1.2 Per-use costs

| Item | Rate (approx.) |
|---|---|
| **OTP via Twilio Verify** | $0.05 per successful verification + $0.0832 per SMS to India ≈ **$0.13 (≈ ₹11) per login** |
| OTP resent / not completed | $0.0832 per extra SMS (charged even if not delivered) |
| **WhatsApp reminder (utility template)** | Meta fee ≈ ₹0.13 + Twilio fee per message (see Twilio rate card) |

### 1.3 Monthly estimate (500 salesmen)

Assumptions: the app keeps salesmen logged in, so an OTP is needed only on a new phone, a reinstall
or after logging out. About 200 logins a month after the first month.

| Scenario | OTP SMS / month | Cost / month |
|---|---|---|
| First month (everyone logs in once, some resends) | ~600 | ~$80 (≈ ₹6,800) |
| Normal month | ~200 | ~$27 (≈ ₹2,300) |
| Busy month (many reinstalls / new phones) | ~500 | ~$67 (≈ ₹5,700) |

WhatsApp reminders depend on how many follow-ups have the reminder switched on.
Example: 400 reminders a day ≈ 12,000 a month × (₹0.13 Meta + Twilio fee). Exact total needs Twilio's India WhatsApp rate.

> These are on top of the hosting costs already discussed (Supabase Pro ~$25/month, Render ~$7–25/month).

---

## 2. What the company / owner does

### 2.1 SMS OTP (start now: DLT takes 1–2 weeks)

1. **DLT registration** on one operator portal (Jio TrueConnect, Vi Vilpower or Airtel).
   Documents: company PAN, GST certificate, certificate of incorporation, authorised person's ID,
   letter of authorisation.
2. On the DLT portal, register:
   - **Header (sender ID):** 6 letters, e.g. `JTAPVT`.
   - **OTP template**, e.g.
     `Your JTA Sales login OTP is {#var#}. It is valid for 10 minutes. Do not share it. - JTA`
3. **Twilio account** in the company's name. Upgrade to paid and add balance.
4. In Twilio, submit the DLT details (Principal Entity ID, header, approved template) through
   Twilio's India sender ID registration form.
5. In Twilio: **Verify → Services → Create**, named `JTA Sales`. Note the **Service SID** (`VA…`).
6. In **Supabase → Authentication → Sign In / Providers → Phone**:
   enable Phone, choose **Twilio Verify**, and enter Account SID, Auth Token and Verify Service SID.
   Then raise the SMS limit in **Authentication → Rate Limits**.
   *Type these keys only into Supabase. Do not send them in chat.*

### 2.2 WhatsApp reminders

1. **Meta Business account** in the company's name, and complete business verification.
2. A **new phone number** that is not used on normal WhatsApp.
3. In Twilio: **Messaging → Senders → WhatsApp senders**, connect the Meta account and number.
4. Create a **utility template** in Twilio (Content Template Builder) and send it for approval, e.g.
   `Reminder: you have a visit with {{1}} on {{2}}.`
5. Put these on Render (Environment), never in chat:
   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_REMINDER_CONTENT_SID`.

**Open decision:** who gets the reminder, the **salesman** ("visit Om Super Market tomorrow 11 am")
or the **client / shop owner** ("our representative will visit tomorrow 11 am")?

---

## 3. What I (developer) do

### 3.1 SMS OTP (about 1 day after Supabase is set up)

1. Test real OTP login with the owner's number (salesman and manager).
2. App: switch off the fixed-OTP test mode. The Supabase OTP code is already in the app.
   Ship it as an **over-the-air update** (no new APK).
3. Backend: already checks Supabase login tokens; remove the temporary dev login.
4. Render: remove `DEV_LOGIN_OTP`, `DEV_JWT_SECRET` and `NODE_ENV=development`.
5. Change the secrets that appeared in chat (database password, storage key).
6. Test: wrong OTP, expired OTP, resend, unregistered number ("Ask your manager to add you").

### 3.2 WhatsApp reminders (about 2–3 days after the template is approved)

1. Backend job every 5 minutes: find follow-ups with the reminder on, due soon and not sent yet.
2. Send the approved template through Twilio's API, then save the send time
   (`whatsappSentAt`, the column already exists) so nothing is sent twice.
3. Failed sends are retried, and the manager's "reminders sent" count uses real data.
4. Tests for: sent once only, reminder off, follow-up cancelled or done, Twilio error.

---

## 4. Order and timeline

| Week | Owner | Developer |
|---|---|---|
| 1 | Start DLT registration, create Twilio account, start Meta verification | Google Maps key + new APK |
| 2 | DLT approved, send details to Twilio, set up Supabase phone login | Real OTP live (over-the-air update) |
| 2–3 | WhatsApp sender + template approved, keys on Render | WhatsApp reminder job, tests, go live |

---

## Sources

- Twilio Verify pricing (third-party summaries): https://www.authgear.com/post/twilio-verify-pricing-and-alternatives/ ,
  https://www.engagelab.com/blog/twilio-verify-pricing
- Twilio SMS rate to India: https://textbee.dev/sms-pricing/twilio/in
- Twilio India sender ID / DLT documents: https://support.twilio.com/hc/en-us/articles/21162166457755-Documents-Required-and-Instructions-to-Register-Your-Alphanumeric-Sender-ID-in-India
- DLT rules (general): https://www.telerivet.com/blog/india-sms-compliance-trai-dlt-registration-and-tcccpr-guide
- WhatsApp pricing: https://twilio.com/whatsapp/pricing ,
  https://developers.facebook.com/docs/whatsapp/pricing ,
  https://support.myoperator.com/portal/en/kb/articles/whatsapp-has-shifted-to-per-message-pricing-effective-july-1-2025-based-on-message-categories-and-your-recipient-s-country-in-india-there-are-three-paid-categories
