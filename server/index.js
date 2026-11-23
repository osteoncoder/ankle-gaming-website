/* ============================================================
   AnkleGaming — website server
   ------------------------------------------------------------
   Serves the static site and handles POST /api/enquiry,
   which validates the contact-popup form and emails the
   enquiry to the company inbox.

   All credentials are read from environment variables only.
   See server/.env.example — never commit a real .env file.

   Run locally:  cd server && npm install && npm start
   ============================================================ */
'use strict';

require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { sendEnquiryEmail, mailStatus } = require('./mailer');

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const SITE_DIR = path.resolve(__dirname, '..', process.env.SITE_DIR || 'ankle gaming website');
const TRUST_PROXY = /^\d+$/.test(String(process.env.TRUST_PROXY || ''))
  ? Number(process.env.TRUST_PROXY)
  : (String(process.env.TRUST_PROXY || '').toLowerCase() === 'true' ? 1 : false);

if (TRUST_PROXY) app.set('trust proxy', TRUST_PROXY);

// Render/Netlify terminate TLS in front of the app.
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

/* ---------- security headers ---------- */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

/* ---------- limits ---------- */
/* Normalise a single-line field: collapse CR/LF and other control
   characters so a crafted value can never add mail headers or spoof
   extra lines in the notification email. */
const HEADER_TOKEN = /\b(bcc|cc|to|from|reply-to|content-type|mime-version|subject|return-path)\s*:/gi;

const stripControl = (v) => v
  .replace(/[\r\n\t\u0000-\u001f\u007f]+/g, ' ')
  .replace(HEADER_TOKEN, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

const field = (v, max) => (typeof v === 'string' ? stripControl(v).slice(0, max) : '');

/* Multi-line field: keep newlines, drop other control characters. */
const multiline = (v, max) => (typeof v === 'string'
  ? v.replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max)
  : '');

const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 5,   // set RATE_LIMIT_MAX to tune; 0 is not a valid limit
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'RATE_LIMITED' },
});

// Form must be on screen for at least this long — humans take seconds, bots submit instantly.
// Explicit 0 disables the check (useful in tests); undefined falls back to 2500.
const MIN_FILL_MS = process.env.MIN_FILL_MS === undefined || process.env.MIN_FILL_MS === ''
  ? 2500
  : Math.max(0, Number(process.env.MIN_FILL_MS) || 0);

/* ---------- validation ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+0-9][0-9\s\-()]{6,19}$/;

const ALLOWED_SERVICES = new Set([
  '', 'Android App Development', 'iOS App Development', 'Cross Platform Development',
  'Website Development', 'Web Application Development', 'AI / ML Development',
  'WordPress Development', 'UI / UX Design', 'Game Development', 'SaaS Development',
  'Software Development', 'CRM / CMS Development',
]);
const ALLOWED_TYPES = new Set([
  '', 'New Project', 'Existing Product Enhancement', 'Dedicated Team / Staff Augmentation',
  'Support & Maintenance', 'Free Consultation', 'Other',
]);
const ALLOWED_BUDGETS = new Set([
  '', 'Prefer to discuss', 'Under ₹2 Lakh', '₹2 – 5 Lakh', '₹5 – 15 Lakh', '₹15 Lakh+',
]);

function validateEnquiry(body) {
  const errors = [];
  const data = {
    name: field(body.name, 120),
    email: field(body.email, 200).toLowerCase(),
    phone: field(body.phone, 40),
    service: field(body.service, 80),
    enquiryType: field(body.enquiryType || body.project_type, 80),
    budget: field(body.budget, 40),
    message: multiline(body.message, 5000),
  };

  if (data.name.length < 2) errors.push({ field: 'name', message: 'Please enter your name.' });
  if (data.name.length > 120) errors.push({ field: 'name', message: 'That name is too long.' });

  if (!EMAIL_RE.test(data.email)) errors.push({ field: 'email', message: 'Please enter a valid email address.' });
  if (data.email.length > 200) errors.push({ field: 'email', message: 'That email address is too long.' });

  if (data.phone && !PHONE_RE.test(data.phone)) {
    errors.push({ field: 'phone', message: 'Please enter a valid phone number.' });
  }
  if (data.message.length < 10) {
    errors.push({ field: 'message', message: 'Please tell us a little about your project (at least 10 characters).' });
  }

  // Reject values outside the known option lists (tampered requests).
  if (!ALLOWED_SERVICES.has(data.service)) errors.push({ field: 'service', message: 'Please choose a service from the list.' });
  if (!ALLOWED_TYPES.has(data.enquiryType)) errors.push({ field: 'enquiryType', message: 'Please choose an enquiry type from the list.' });
  if (!ALLOWED_BUDGETS.has(data.budget)) errors.push({ field: 'budget', message: 'Please choose a budget range from the list.' });

  // Link / markup flooding is the classic spam pattern for a multi-line box.
  const linkCount = (data.message.match(/https?:\/\//gi) || []).length;
  if (linkCount > 4) errors.push({ field: 'message', message: 'Please remove the extra links from your message.' });

  return { data, errors };
}

/* ---------- routes ---------- */
app.get('/api/health', (req, res) => {
  const mail = mailStatus();
  res.json({
    ok: true,
    service: 'anklegaming-website',
    uptime: Math.round(process.uptime()),
    mail: { provider: mail.provider, configured: mail.configured },
  });
});

// Lets the frontend know whether real email delivery is wired up,
// so it never shows a success message that did not happen.
app.get('/api/enquiry/status', (req, res) => {
  const mail = mailStatus();
  res.setHeader('Cache-Control', 'no-store');
  res.json({ configured: mail.configured, provider: mail.provider });
});

app.post('/api/enquiry', enquiryLimiter, async (req, res) => {
  const requestId = crypto.randomUUID();
  const body = req.body || {};

  // 1) Honeypot: real users never see or fill this. Pretend success to bots.
  if (field(body.website || body.botcheck || body.company_url, 200) !== '') {
    return res.status(200).json({ success: true, id: requestId });
  }

  // 2) Time trap: a form completed impossibly fast is automated.
  const elapsed = Number(body.elapsedMs);
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < MIN_FILL_MS) {
    return res.status(200).json({ success: true, id: requestId });
  }

  // 3) Validation.
  const { data, errors } = validateEnquiry(body);
  if (errors.length) {
    return res.status(422).json({
      success: false,
      error: 'VALIDATION_FAILED',
      message: 'Please check the highlighted fields and try again.',
      fields: errors,
    });
  }

  // 4) Delivery. Success is only reported when the provider accepted the mail.
  const mail = mailStatus();
  if (!mail.configured) {
    console.error(`[enquiry ${requestId}] MAIL NOT CONFIGURED — set SMTP_* or RESEND_API_KEY`);
    return res.status(503).json({
      success: false,
      error: 'MAIL_NOT_CONFIGURED',
      message: 'Our enquiry email is not configured yet. Please email info@anklegaming.com or message us on WhatsApp.',
    });
  }

  try {
    const result = await sendEnquiryEmail(data, {
      requestId,
      ip: req.ip,
      userAgent: field(req.get('user-agent'), 300),
      pageUrl: field(body.pageUrl, 300),
      receivedAt: new Date(),
    });

    console.log(`[enquiry ${requestId}] delivered via ${result.provider} id=${result.id || 'n/a'} from=${data.email}`);
    return res.status(200).json({ success: true, id: requestId });
  } catch (err) {
    console.error(`[enquiry ${requestId}] DELIVERY FAILED code=${err.code || 'UNKNOWN'} :: ${err.message}`);
    return res.status(502).json({
      success: false,
      error: 'SEND_FAILED',
      message: 'We could not deliver your enquiry just now. Please try again, or reach us on WhatsApp / info@anklegaming.com.',
    });
  }
});

/* ---------- static site ---------- */
app.use(express.static(SITE_DIR, {
  extensions: ['html'],
  setHeaders(res, filePath) {
    if (/\.(html|xml|txt)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (/\.(css|js|jpe?g|png|webp|svg)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  },
}));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  }
  res.status(404).sendFile(path.join(SITE_DIR, '404.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'PAYLOAD_TOO_LARGE' });
  }
  console.error('[server] unhandled error:', err && err.message);
  res.status(500).json({ success: false, error: 'SERVER_ERROR' });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    const mail = mailStatus();
    console.log(`AnkleGaming server listening on 0.0.0.0:${PORT}`);
    console.log(`  site dir : ${SITE_DIR}`);
    console.log(`  mail     : ${mail.configured ? `${mail.provider} -> ${mail.to}` : 'NOT CONFIGURED (enquiries will fail loudly)'}`);
  });
}

module.exports = app;
