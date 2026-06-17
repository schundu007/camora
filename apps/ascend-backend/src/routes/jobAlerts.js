import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../lib/shared-db.js';
import { authenticate } from '../middleware/authenticate.js';
import { sendJobAlertDigest } from '../services/jobAlertEmailService.js';

const router = Router();

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

/**
 * POST /send-digest
 * Triggered by Railway cron (X-API-Key) to send daily job alert emails.
 * ?test_email=foo@bar.com — sends only to that user with a 72h window.
 */
router.post('/send-digest', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!process.env.INTERNAL_API_KEY || !safeCompare(apiKey, process.env.INTERNAL_API_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const testEmail = typeof req.query.test_email === 'string' ? req.query.test_email.trim() : null;

  try {
    let users;
    if (testEmail) {
      const r = await query(
        'SELECT id, email, name, job_roles, resume_text FROM users WHERE email = $1 LIMIT 1',
        [testEmail],
      );
      users = r.rows;
    } else {
      const r = await query(
        `SELECT id, email, name, job_roles, resume_text FROM users
         WHERE job_alerts_enabled = true
           AND (job_alerts_last_sent_at IS NULL OR job_alerts_last_sent_at < NOW() - INTERVAL '20 hours')`,
      );
      users = r.rows;
    }

    let sent = 0, skipped = 0, errors = 0;

    for (const user of users) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const ok = await sendJobAlertDigest(user, { test: !!testEmail });
        if (ok) {
          sent++;
          if (!testEmail) {
            await query('UPDATE users SET job_alerts_last_sent_at = NOW() WHERE id = $1', [user.id]);
          }
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`[JobAlerts] Error for user ${user.id}:`, err.message);
        errors++;
      }
    }

    res.json({ sent, skipped, errors, total_users: users.length });
  } catch (err) {
    console.error('[JobAlerts] send-digest failed:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /test
 * Authenticated — sends a test digest to the currently logged-in user.
 * Uses a 72h job window to maximise candidates during testing.
 */
router.post('/test', authenticate, async (req, res) => {
  try {
    const r = await query(
      'SELECT id, email, name, job_roles, resume_text FROM users WHERE id = $1',
      [req.user.id],
    );
    const user = r.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ok = await sendJobAlertDigest(user, { test: true });
    if (!ok) {
      return res.status(422).json({
        error: 'No matching jobs found in the last 72 hours, or email service unavailable.',
      });
    }
    res.json({ sent: true, email: user.email });
  } catch (err) {
    console.error('[JobAlerts] /test failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /unsubscribe?token=<jwt>
 * No auth required — verifies signed token and disables job alerts.
 */
router.get('/unsubscribe', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send(unsubPage('Invalid unsubscribe link.', false));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== 'job_alert_unsub') throw new Error('wrong purpose');
    await query('UPDATE users SET job_alerts_enabled = false WHERE id = $1', [payload.sub]);
    res.send(unsubPage("You've been unsubscribed.", true));
  } catch {
    res.status(400).send(unsubPage('Invalid or expired unsubscribe link.', false));
  }
});

function unsubPage(message, success) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Job Alerts — Camora</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:400px;margin:0 auto;padding:80px 24px;text-align:center;">
    <img src="https://camora.cariara.com/camora-logo.png" alt="Camora" width="40" height="40" style="border-radius:10px;margin-bottom:24px;">
    <h2 style="color:${success ? '#ffffff' : '#ef4444'};font-size:20px;font-weight:700;margin:0 0 12px;">${message}</h2>
    ${success ? '<p style="color:#6b7280;font-size:14px;margin:0 0 24px;">You won\'t receive job alert emails anymore. You can re-enable them anytime in your profile.</p>' : ''}
    <a href="https://camora.cariara.com" style="display:inline-block;background:#26619C;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:8px;">Back to Camora</a>
  </div>
</body>
</html>`;
}

export default router;
