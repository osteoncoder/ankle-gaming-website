/* ============================================================
   Local inbox — a real SMTP server that accepts messages in place
   of the mail provider while testing the popup in a browser.

   It prints the host/port to use and logs every message it
   receives, so a live preview test shows genuine SMTP delivery.

   Run (separate terminal):
     cd server && npm run inbox
   Then start the site with:
     MAIL_MOCK=true MAIL_MOCK_PORT=2525 npm start
   ============================================================ */
'use strict';

const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');

const PORT = Number(process.env.MAIL_MOCK_PORT) || 2525;
let count = 0;

const server = new SMTPServer({
  authOptional: true,
  disabledCommands: ['STARTTLS'],
  onData(stream, session, callback) {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => {
      simpleParser(Buffer.concat(chunks))
        .then((mail) => {
          count += 1;
          console.log(`\n══════════════════════════════════════════════════════`);
          console.log(`  MESSAGE #${count} RECEIVED  ${new Date().toISOString()}`);
          console.log(`══════════════════════════════════════════════════════`);
          console.log(`From     : ${mail.from && mail.from.text}`);
          console.log(`To       : ${mail.to && mail.to.text}`);
          console.log(`Reply-To : ${mail.replyTo && mail.replyTo.text}`);
          console.log(`Subject  : ${mail.subject}`);
          console.log(`──────────────────────────────────────────────────────`);
          console.log(mail.text || '(no text part)');
          console.log(`══════════════════════════════════════════════════════`);
        })
        .catch((e) => console.error('[inbox] parse failed:', e.message))
        .finally(() => callback());
    });
  },
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Local test inbox listening on 0.0.0.0:${PORT}`);
  console.log('Messages sent by the enquiry form will be printed here.');
});
