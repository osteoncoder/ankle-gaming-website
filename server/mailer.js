/* ============================================================
   AnkleGaming — email delivery for website enquiries
   ------------------------------------------------------------
   Credentials come ONLY from environment variables. Nothing
   secret is ever read from, or written to, the repository.

   Primary transport : SMTP via Nodemailer (Hostinger, Zoho,
                       Google Workspace, SendGrid SMTP, Brevo,
                       Mailgun SMTP, Amazon SES SMTP, ...)
   Optional fallback : Resend HTTPS API (useful on hosts that
                       block outbound SMTP ports).

   Provider is chosen with MAIL_PROVIDER:
     smtp    -> SMTP only
     resend  -> Resend only
     auto    -> SMTP if configured, else Resend  (default)
   ============================================================ */
'use strict';

const nodemailer = require('nodemailer');

const str = (v) => (typeof v === 'string' ? v.trim() : '');

const env = {
  provider: (str(process.env.MAIL_PROVIDER) || 'auto').toLowerCase(),

  smtpHost: str(process.env.SMTP_HOST),
  smtpPort: Number(str(process.env.SMTP_PORT) || 587),
  smtpUser: str(process.env.SMTP_USER),
  smtpPass: str(process.env.SMTP_PASS),
  smtpSecure: str(process.env.SMTP_SECURE).toLowerCase() === 'true',

  resendKey: str(process.env.RESEND_API_KEY),
  resendFrom: str(process.env.RESEND_FROM),

  fromName: str(process.env.MAIL_FROM_NAME) || 'AnkleGaming Website',
  fromEmail: str(process.env.MAIL_FROM) ||
    str(process.env.SMTP_USER) ||
    str(process.env.RESEND_FROM) ||
    'no-reply@anklegaming.com',
  toEmail: str(process.env.ENQUIRY_TO_EMAIL) || 'info@anklegaming.com',
  replyToVisitor: str(process.env.MAIL_REPLY_TO_VISITOR).toLowerCase() !== 'false',

  // Test hook: deliver to a local SMTP catcher instead of the real world.
  mockMode: str(process.env.MAIL_MOCK).toLowerCase() === 'true',
  mockPort: Number(str(process.env.MAIL_MOCK_PORT) || 2525),
};

const hasSmtp = Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
const hasResend = Boolean(env.resendKey);

function activeProvider() {
  if (env.mockMode) return 'mock';
  if (env.provider === 'smtp') return hasSmtp ? 'smtp' : 'none';
  if (env.provider === 'resend') return hasResend ? 'resend' : 'none';
  if (hasSmtp) return 'smtp';
  if (hasResend) return 'resend';
  return 'none';
}

let smtpTransport = null;
function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;
  const port = env.smtpPort;
  // 465 = implicit TLS. 587/25 = STARTTLS. Honour SMTP_SECURE when set.
  const secure = str(process.env.SMTP_SECURE)
    ? env.smtpSecure
    : port === 465;

  if (env.mockMode) {
    smtpTransport = nodemailer.createTransport({ host: '127.0.0.1', port: env.mockPort, secure: false, ignoreTLS: true });
    return smtpTransport;
  }
  smtpTransport = nodemailer.createTransport({
    host: env.smtpHost,
    port,
    secure,
    auth: { user: env.smtpUser, pass: env.smtpPass },
    requireTLS: !secure && port === 587,
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 20000,
    tls: { minVersion: 'TLSv1.2' },
  });
  return smtpTransport;
}

/* ---------- small helpers ---------- */

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const dash = (v) => {
  const s = str(v);
  return s === '' ? '—' : s;
};

function formatDateTime(date, timeZone) {
  const d = date || new Date();
  const iso = d.toISOString();
  try {
    const friendly = d.toLocaleString('en-IN', {
      timeZone: timeZone || 'Asia/Kolkata',
      weekday: 'short', year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });
    return { iso, friendly: `${friendly} (IST)`, timeZone: timeZone || 'Asia/Kolkata' };
  } catch (_) {
    return { iso, friendly: d.toUTCString(), timeZone: 'UTC' };
  }
}

function buildMessage(enquiry, meta) {
  const when = formatDateTime(meta.receivedAt, process.env.ENQUIRY_TIMEZONE || 'Asia/Kolkata');
  const rows = [
    ['Name', dash(enquiry.name)],
    ['Email', dash(enquiry.email)],
    ['Phone / WhatsApp', dash(enquiry.phone)],
    ['Service Required', dash(enquiry.service)],
    ['Enquiry Type', dash(enquiry.enquiryType)],
    ['Indicative Budget', dash(enquiry.budget)],
  ];

  const text = [
    'New Website Enquiry – Ankle Gaming',
    '==================================',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'Project Details:',
    '----------------',
    String(enquiry.message || '').trim(),
    '',
    '----------------',
    `Submitted: ${when.iso}`,
    `Submitted (local): ${when.friendly}`,
    `Page: ${meta.pageUrl || '—'}`,
    `IP: ${meta.ip || '—'}`,
  ].join('\n');

  const tableRows = rows.map(([k, v]) => `
      <tr>
        <td style="padding:11px 16px;border-bottom:1px solid #e6ebf4;color:#5b6b84;font-size:13px;width:190px;vertical-align:top;">${esc(k)}</td>
        <td style="padding:11px 16px;border-bottom:1px solid #e6ebf4;color:#0d1a2e;font-size:14px;font-weight:600;vertical-align:top;">${esc(v)}</td>
      </tr>`).join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>New Website Enquiry – Ankle Gaming</title></head>
<body style="margin:0;padding:0;background:#eef2f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dde5f0;">
        <tr><td style="background:linear-gradient(92deg,#2e7cf6,#38bdf8 55%,#818cf8);padding:22px 26px;">
          <div style="color:#ffffff;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;opacity:.92;">AnkleGaming Private Limited</div>
          <div style="color:#ffffff;font-size:21px;font-weight:700;margin-top:6px;">New Website Enquiry</div>
        </td></tr>
        <tr><td style="padding:22px 26px 4px;">
          <p style="margin:0 0 18px;color:#33425c;font-size:14px;line-height:1.6;">
            A new enquiry was submitted through the website contact popup.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6ebf4;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;">
            ${tableRows}
          </table>
        </td></tr>
        <tr><td style="padding:20px 26px 6px;">
          <div style="color:#5b6b84;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;">Project Details</div>
          <div style="background:#f6f9fe;border:1px solid #e6ebf4;border-left:3px solid #2e7cf6;border-radius:8px;padding:14px 16px;color:#0d1a2e;font-size:14px;line-height:1.65;white-space:pre-wrap;">${esc(String(enquiry.message || '').trim())}</div>
        </td></tr>
        <tr><td style="padding:18px 26px 24px;">
          <p style="margin:0;color:#7b8aa3;font-size:12px;line-height:1.7;">
            Submitted: ${esc(when.iso)}<br>
            Local time: ${esc(when.friendly)}<br>
            Page: ${esc(meta.pageUrl || '—')}<br>
            IP: ${esc(meta.ip || '—')}
          </p>
        </td></tr>
      </table>
      <p style="max-width:620px;margin:14px auto 0;color:#93a1b8;font-size:11px;text-align:center;">
        Sent automatically by the AnkleGaming website enquiry form.
      </p>
    </td></tr>
  </table>
</body></html>`;

  const subject = 'New Website Enquiry – Ankle Gaming';
  return { subject, text, html, when };
}

async function sendViaResend({ subject, text, html, replyTo }) {
  const body = {
    from: `${env.fromName} <${env.resendFrom || env.fromEmail}>`,
    to: [env.toEmail],
    subject,
    text,
    html,
  };
  if (replyTo) body.reply_to = replyTo;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    let detail = '';
    try { detail = JSON.stringify(await res.json()); } catch (_) { detail = await res.text().catch(() => ''); }
    const err = new Error(`Resend rejected the message (HTTP ${res.status}) ${detail}`.trim());
    err.code = 'RESEND_REJECTED';
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  return { provider: 'resend', id: data && data.id ? data.id : null };
}

/**
 * Send a website enquiry to the company inbox.
 * @param {object} enquiry  validated enquiry fields
 * @param {object} meta     { ip, userAgent, pageUrl, receivedAt }
 * @returns {Promise<{provider:string,id:string|null,messageId:string|null}>}
 */
async function sendEnquiryEmail(enquiry, meta = {}) {
  const provider = activeProvider();
  if (provider === 'none') {
    const err = new Error('Email delivery is not configured on the server.');
    err.code = 'MAIL_NOT_CONFIGURED';
    throw err;
  }

  const built = buildMessage(enquiry, meta);
  const replyTo = env.replyToVisitor && enquiry.email ? enquiry.email : undefined;

  if (provider === 'resend') {
    return sendViaResend({ ...built, replyTo });
  }

  const transport = getSmtpTransport();
  const info = await transport.sendMail({
    from: `"${env.fromName}" <${env.fromEmail}>`,
    to: env.toEmail,
    subject: built.subject,
    text: built.text,
    html: built.html,
    replyTo,
    headers: {
      'X-AnkleGaming-Form': 'website-enquiry',
      'X-Entity-Ref-ID': meta.requestId || '',
    },
  });

  return {
    provider: env.mockMode ? 'mock-smtp' : 'smtp',
    id: info && info.messageId ? String(info.messageId) : null,
    messageId: info && info.messageId ? String(info.messageId) : null,
    accepted: info && info.accepted ? info.accepted : [],
    rejected: info && info.rejected ? info.rejected : [],
    response: info && info.response ? String(info.response) : '',
  };
}

function mailStatus() {
  const provider = activeProvider();
  return {
    provider,
    configured: provider !== 'none',
    to: provider === 'none' ? null : env.toEmail,
    from: provider === 'none' ? null : env.fromEmail,
    mock: env.mockMode,
  };
}

module.exports = { sendEnquiryEmail, mailStatus, activeProvider, env, buildMessage, formatDateTime };
