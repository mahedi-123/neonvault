/**
 * Email outbox. Messages are stored (and visible in Admin → Emails) and logged
 * to the console. Plug a real provider into `deliver` (SMTP, Resend, SES…)
 * when going live — the rest of the app never changes.
 */
export function createMailer(db, log) {
  const deliver = async () => {};
  return {
    async send(to, subject, body, kind = 'general') {
      db.run('INSERT INTO emails (to_addr, subject, body, kind) VALUES (?, ?, ?, ?)', to, subject, body, kind);
      log.info(`✉  ${kind} → ${to}: ${subject}`);
      try { await deliver({ to, subject, body }); } catch (e) { log.warn('email delivery failed', e.message); }
    },
  };
}
