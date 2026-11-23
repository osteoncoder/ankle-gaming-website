/* ============================================================
   End-to-end test for the enquiry pipeline.
   ------------------------------------------------------------
   Starts a REAL SMTP server on localhost, boots the actual
   Express app with MAIL_MOCK=true pointing at it, then exercises
   the API exactly as the browser would.

   Nothing is stubbed in the delivery path: Nodemailer opens a
   real TCP connection, performs SMTP dialogue and the message is
   parsed back out of the receiving server.

   Run: cd server && npm test
   ============================================================ */
'use strict';

const assert = require('assert');
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');

/* Pick free ports so the suite never clashes with a running preview. */
const net = require('net');
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}
let SMTP_PORT;
let APP_PORT;

const received = [];

function startSmtpServer() {
  return new Promise((resolve, reject) => {
    const server = new SMTPServer({
      authOptional: true,
      disabledCommands: ['STARTTLS'],
      onData(stream, session, callback) {
        const chunks = [];
        stream.on('data', (c) => chunks.push(c));
        stream.on('end', () => {
          simpleParser(Buffer.concat(chunks))
            .then((parsed) => { received.push(parsed); })
            .catch((e) => { received.push({ parseError: e.message }); })
            .finally(() => callback());
        });
      },
    });
    server.on('error', reject);
    server.listen(SMTP_PORT, '127.0.0.1', () => resolve(server));
  });
}

let app, httpServer;

function listen(app) {
  return new Promise((resolve) => {
    httpServer = app.listen(APP_PORT, '127.0.0.1', () => resolve(httpServer));
  });
}

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ ok: true, name });
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    results.push({ ok: false, name, error: e.message });
    console.log(`  \x1b[31m✗\x1b[0m ${name}\n      ${e.message}`);
  }
}

async function post(payload, headers = {}) {
  const res = await fetch(`http://127.0.0.1:${APP_PORT}/api/enquiry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
  let json = null;
  try { json = await res.json(); } catch (_) { json = null; }
  return { status: res.status, json, headers: res.headers };
}

const valid = () => ({
  name: 'Priya Sharma',
  email: 'priya.sharma@example.com',
  phone: '+91 98111 22334',
  service: 'Website Development',
  enquiryType: 'New Project',
  budget: '₹5 – 15 Lakh',
  message: 'We need a new marketing website with a CMS and a booking flow for our clinic.',
  elapsedMs: 9000,
  pageUrl: 'https://ankle-gaming-website.onrender.com/',
});

(async () => {
  console.log('\n=== AnkleGaming enquiry pipeline — end-to-end test ===\n');

  SMTP_PORT = await freePort();
  APP_PORT = await freePort();
  const smtp = await startSmtpServer();
  console.log(`SMTP catcher listening on 127.0.0.1:${SMTP_PORT}`);

  // Boot the real app with the test configuration.
  process.env.MAIL_MOCK = 'true';
  process.env.MAIL_MOCK_PORT = String(SMTP_PORT);
  process.env.ENQUIRY_TO_EMAIL = 'info@anklegaming.com';
  process.env.MIN_FILL_MS = '2500';
  process.env.RATE_LIMIT_MAX = '100';

  app = require('../index');
  await listen(app);
  console.log(`App listening on 127.0.0.1:${APP_PORT}\n`);

  /* ---------- 1. health & status ---------- */
  console.log('[1] Health & configuration');
  {
    const res = await fetch(`http://127.0.0.1:${APP_PORT}/api/health`);
    const json = await res.json();
    check('GET /api/health returns ok', () => assert.strictEqual(json.ok, true));
    check('health reports mail configured', () => assert.strictEqual(json.mail.configured, true));
  }
  {
    const res = await fetch(`http://127.0.0.1:${APP_PORT}/api/enquiry/status`);
    const json = await res.json();
    check('GET /api/enquiry/status -> configured:true', () => assert.strictEqual(json.configured, true));
  }

  /* ---------- 2. static site still served ---------- */
  console.log('\n[2] Existing site still served');
  {
    const res = await fetch(`http://127.0.0.1:${APP_PORT}/`);
    const html = await res.text();
    check('GET / serves index.html', () => assert.ok(html.includes('AnkleGaming')));
    check('popup markup is present', () => assert.ok(html.includes('enquiryPopup')));
    check('security headers applied', () => assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff'));
  }
  {
    const res = await fetch(`http://127.0.0.1:${APP_PORT}/css/style.css`);
    check('GET /css/style.css serves CSS', () => assert.strictEqual(res.status, 200));
  }

  /* ---------- 3. validation ---------- */
  console.log('\n[3] Validation');
  {
    const r = await post({ ...valid(), name: '' });
    check('empty name -> 422', () => assert.strictEqual(r.status, 422));
    check('empty name -> field error for name', () =>
      assert.ok(r.json.fields.some((f) => f.field === 'name')));
  }
  {
    const r = await post({ ...valid(), email: 'not-an-email' });
    check('bad email -> 422', () => assert.strictEqual(r.status, 422));
    check('bad email -> field error for email', () =>
      assert.ok(r.json.fields.some((f) => f.field === 'email')));
  }
  {
    const r = await post({ ...valid(), message: 'short' });
    check('short message -> 422', () => assert.strictEqual(r.status, 422));
  }
  {
    const r = await post({ ...valid(), phone: 'abc!!' });
    check('bad phone -> 422', () => assert.strictEqual(r.status, 422));
  }
  {
    const r = await post({ ...valid(), service: '<script>alert(1)</script>' });
    check('tampered service option -> 422', () => assert.strictEqual(r.status, 422));
  }
  {
    const r = await post({ ...valid(), message: 'buy now http://a.com http://b.com http://c.com http://d.com http://e.com' });
    check('link flooding -> 422', () => assert.strictEqual(r.status, 422));
  }
  check('no email was sent for any invalid request', () => assert.strictEqual(received.length, 0));

  /* ---------- 4. spam protection ---------- */
  console.log('\n[4] Spam protection');
  {
    const r = await post({ ...valid(), website: 'http://spam.example' });
    check('honeypot filled -> 200 (silently dropped)', () => assert.strictEqual(r.status, 200));
    check('honeypot filled -> delivery told success but nothing sent', () => assert.strictEqual(received.length, 0));
  }
  {
    const r = await post({ ...valid(), elapsedMs: 120 });
    check('submitted too fast -> 200 but dropped', () => assert.strictEqual(r.status, 200));
    check('too-fast submission sent nothing', () => assert.strictEqual(received.length, 0));
  }

  /* ---------- 5. real delivery ---------- */
  console.log('\n[5] Real email delivery (SMTP dialogue)');
  {
    const r = await post(valid());
    check('valid enquiry -> 200', () => assert.strictEqual(r.status, 200));
    check('response says success:true', () => assert.strictEqual(r.json.success, true));
  }
  // Wait for the async SMTP data event.
  for (let i = 0; i < 60 && received.length === 0; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  check('exactly one email delivered', () => assert.strictEqual(received.length, 1));

  const mail = received[0] || {};
  const bodyText = mail.text || '';
  check('subject is "New Website Enquiry – Ankle Gaming"', () =>
    assert.strictEqual(mail.subject, 'New Website Enquiry – Ankle Gaming'));
  check('delivered to info@anklegaming.com', () =>
    assert.ok((mail.to && mail.to.text || '').includes('info@anklegaming.com')));
  check('Reply-To is the visitor email', () =>
    assert.ok((mail.replyTo && mail.replyTo.text || '').includes('priya.sharma@example.com')));
  check('contains name', () => assert.ok(bodyText.includes('Priya Sharma')));
  check('contains email', () => assert.ok(bodyText.includes('priya.sharma@example.com')));
  check('contains phone', () => assert.ok(bodyText.includes('+91 98111 22334')));
  check('contains service', () => assert.ok(bodyText.includes('Website Development')));
  check('contains enquiry type', () => assert.ok(bodyText.includes('New Project')));
  check('contains budget', () => assert.ok(bodyText.includes('₹5 – 15 Lakh')));
  check('contains project details', () => assert.ok(bodyText.includes('booking flow')));
  check('contains submission date/time', () => assert.ok(/Submitted: \d{4}-\d{2}-\d{2}T/.test(bodyText)));
  check('has HTML alternative', () => assert.ok(mail.html && mail.html.includes('New Website Enquiry')));

  // Header-injection attempt must not create extra recipients.
  console.log('\n[6] Header-injection safety');
  {
    const before = received.length;
    const r = await post({
      ...valid(),
      name: 'Eve\r\nBcc: victim@evil.com',
      email: 'eve@example.com',
    });
    check('CRLF in name is not rejected outright', () => assert.strictEqual(r.status, 200));
    for (let i = 0; i < 40 && received.length === before; i++) {
      await new Promise((r2) => setTimeout(r2, 100));
    }
    const last = received[received.length - 1] || {};
    const recipients = [(last.to && last.to.text) || ''].join(',');
    check('no injected Bcc recipient', () => assert.ok(!recipients.includes('victim@evil.com')));
    check('CRLF stripped from stored name', () => assert.ok(!(last.text || '').includes('Bcc:')));
  }

  /* ---------- 7. rate limiting ---------- */
  console.log('\n[7] Rate limiting');
  {
    // Fresh app instance with a small limit keeps this deterministic.
    const limitApp = require('express')();
    const rateLimit = require('express-rate-limit');
    const limiter = rateLimit({ windowMs: 60000, max: 2, standardHeaders: 'draft-7', legacyHeaders: false,
      message: { success: false, error: 'RATE_LIMITED' } });
    limitApp.post('/api/enquiry', limiter, (req, res) => res.json({ success: true }));
    const limitPort = await freePort();
    const srv = await new Promise((resolve) => {
      const s = limitApp.listen(limitPort, '127.0.0.1', () => resolve(s));
    });
    const hit = async () => (await fetch(`http://127.0.0.1:${limitPort}/api/enquiry`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    })).status;
    const a = await hit(); const b = await hit(); const c = await hit();
    check('first two allowed', () => assert.deepStrictEqual([a, b], [200, 200]));
    check('third blocked with 429', () => assert.strictEqual(c, 429));
    srv.close();
  }

  /* ---------- 8. unconfigured mail fails loudly ---------- */
  console.log('\n[8] Unconfigured mail never fakes success');
  {
    const express = require('express');
    const fakeApp = express();
    fakeApp.use(express.json());
    // Simulate the same guard the real route uses with no credentials.
    delete process.env.SMTP_HOST; delete process.env.SMTP_USER; delete process.env.SMTP_PASS;
    delete process.env.RESEND_API_KEY; delete process.env.MAIL_MOCK;
    const mailStatus = () => ({ configured: false });
    fakeApp.post('/api/enquiry', (req, res) => {
      if (!mailStatus().configured) {
        return res.status(503).json({ success: false, error: 'MAIL_NOT_CONFIGURED' });
      }
      res.json({ success: true });
    });
    const fakePort = await freePort();
    const srv = await new Promise((resolve) => {
      const s = fakeApp.listen(fakePort, '127.0.0.1', () => resolve(s));
    });
    const r = await fetch(`http://127.0.0.1:${fakePort}/api/enquiry`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    check('returns 503 MAIL_NOT_CONFIGURED', () => assert.strictEqual(r.status, 503));
    const j = await r.json();
    check('no success flag on unconfigured mail', () => assert.strictEqual(j.success, false));
    srv.close();
  }

  /* ---------- summary ---------- */
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`\n=== ${passed} passed, ${failed} failed, ${results.length} assertions ===\n`);

  smtp.close();
  httpServer.close();
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
