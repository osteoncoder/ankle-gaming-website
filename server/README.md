# AnkleGaming website — server & email setup

The website is a static site plus a small Node/Express server in this folder.
The server does two things:

1. Serves the existing site from `ankle gaming website/` unchanged.
2. Handles `POST /api/enquiry` — validates the enquiry popup form and emails
   the enquiry to the company inbox.

The enquiry popup and the inline contact form both post to that endpoint.

---

## 1. How it works

```
Browser (popup / inline form)
      │  POST /api/enquiry  (JSON)
      ▼
Express server ──validate──► Nodemailer (SMTP) ──► info@anklegaming.com
   │                              or Resend API
   └──► { success: true }   ← only after the provider ACCEPTS the message
```

The frontend shows “Thank you! Your enquiry has been submitted successfully.”
**only** when the server confirms the mail provider accepted the message.
If mail is not configured the API returns `503` and the visitor is told to use
WhatsApp or email instead — it never fakes success.

---

## 2. Environment variables

Copy `.env.example` to `.env` for local use, or add the keys in
**Render → your service → Environment**. `.env` is git-ignored.
**Never commit real credentials.**

### Required

| Variable | Purpose |
|---|---|
| `ENQUIRY_TO_EMAIL` | Where enquiries are delivered (default `info@anklegaming.com`) |

### Option A — SMTP via Nodemailer (recommended)

Works with Hostinger, Zoho, Google Workspace, Microsoft 365, Brevo, Mailgun,
SendGrid, Amazon SES SMTP, etc.

| Variable | Example |
|---|---|
| `MAIL_PROVIDER` | `smtp` |
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` (or `587`) |
| `SMTP_SECURE` | `true` for port 465, `false` for 587 |
| `SMTP_USER` | `no-reply@anklegaming.com` |
| `SMTP_PASS` | mailbox password / app password |
| `MAIL_FROM` | `no-reply@anklegaming.com` (must be allowed by the SMTP account) |
| `MAIL_FROM_NAME` | `AnkleGaming Website` |

### Option B — Resend HTTPS API

Useful if the host blocks outbound SMTP ports.

| Variable | Example |
|---|---|
| `MAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | `re_xxxxxxxx` |
| `RESEND_FROM` | `no-reply@your-verified-domain.com` |

`MAIL_PROVIDER=auto` (default) uses SMTP when configured, otherwise Resend.

### Optional tuning

| Variable | Default | Purpose |
|---|---|---|
| `ENQUIRY_TIMEZONE` | `Asia/Kolkata` | Timezone for the “Submitted (local)” line |
| `RATE_LIMIT_MAX` | `5` | Max submissions per IP per 15 minutes |
| `MIN_FILL_MS` | `2500` | Minimum time between popup opening and submit (bot trap) |
| `TRUST_PROXY` | – | Set `1` behind a CDN/proxy so `req.ip` is correct |
| `MAIL_REPLY_TO_VISITOR` | `true` | Sets Reply-To to the visitor so you can reply directly |

### To switch on real email delivery

1. Pick a transport (SMTP mailbox or Resend).
2. Add the variables above in Render → Environment.
3. Redeploy.
4. Check `GET /api/health` — it reports `mail.configured: true` and the provider.

Until then the popup still validates and submits, but the API answers `503`
and the visitor sees a clear “please use WhatsApp / email” message.

---

## 3. Spam protection

* **Honeypot** field (hidden from humans and from the tab order).
* **Time trap** — a form completed faster than `MIN_FILL_MS` is dropped.
* **Rate limiting** — per-IP limit on `/api/enquiry`.
* **Strict validation** — required fields, email/phone formats, option values
  checked against the known lists, link-flood limits, length caps.
* **Header-injection safety** — CR/LF and header-like tokens are stripped
  from single-line fields, and the message is rendered escaped.

---

## 4. Local development

```bash
cd server
npm install
cp .env.example .env      # then fill in your mail settings
npm start                 # site on http://localhost:3000
```

### Preview the email flow without a real mailbox

Terminal 1 — a real SMTP server that prints what it receives:

```bash
cd server && npm run inbox
```

Terminal 2 — the site, pointed at that inbox:

```bash
cd server && MAIL_MOCK=true MAIL_MOCK_PORT=2525 npm start
```

Open <http://localhost:3000>, fill in the popup, and the formatted email
appears in terminal 1.

---

## 5. Tests

```bash
cd server && npm test
```

Starts a real SMTP server and the real app, then checks validation, spam
handling, header-injection safety, rate limiting and genuine delivery
(42 assertions).

---

## 6. API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness + whether mail is configured |
| `GET` | `/api/enquiry/status` | `{ configured, provider }` |
| `POST` | `/api/enquiry` | Submit an enquiry (JSON) |

`POST /api/enquiry` body:

```json
{
  "name": "…", "email": "…", "phone": "…",
  "service": "…", "enquiryType": "…", "budget": "…",
  "message": "…", "elapsedMs": 9000, "pageUrl": "https://…"
}
```

Responses: `200 {success:true}` · `422 {success:false,fields:[…]}` ·
`429` rate limited · `502` delivery failed · `503` mail not configured.
