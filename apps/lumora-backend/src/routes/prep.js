/**
 * Prep workspace state — backend persistence for the Lumora Prep Kit.
 *
 * The Prep Kit panel (apps/frontend/src/components/lumora/shell/LumoraDocsPanel.tsx)
 * keeps its workspaces in localStorage under the key `lumora_prep_v8`.
 * That meant clearing browser data, switching devices, or opening
 * incognito wiped a user's JD/resume — and Sona then had no context.
 *
 * This route stores the same JSON blob in PostgreSQL keyed by user_id,
 * so the panel can hydrate on session start and write through on save.
 *
 * The blob shape is owned by the frontend (PrepData in LumoraDocsPanel);
 * this route is intentionally schema-agnostic — we only enforce a size
 * cap and the requirement that the value is a JSON object. Schema
 * evolution stays in the client.
 */
import { Router } from 'express';
import { query } from '@camora/shared-db';
import { authenticate } from '../middleware/authenticate.js';
import { refreshCompanyContext } from '../services/companyContext.js';

const router = Router();

router.use(authenticate);

// Cap at 2 MB serialized — a healthy JD + resume + cover letter +
// generated prep sections should fit comfortably; anything larger
// suggests pasted nonsense or abuse.
const MAX_BYTES = 2 * 1024 * 1024;

router.get('/state', async (req, res, next) => {
  try {
    const r = await query(
      'SELECT data, updated_at FROM lumora_prep_state WHERE user_id = $1',
      [req.user.id],
    );
    if (r.rows.length === 0) {
      return res.json({ data: null, updated_at: null });
    }
    res.json({
      data: r.rows[0].data,
      updated_at: r.rows[0].updated_at,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/state', async (req, res, next) => {
  try {
    const { data } = req.body || {};
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ error: 'data must be a JSON object' });
    }
    const serialized = JSON.stringify(data);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_BYTES) {
      return res.status(413).json({
        error: `prep state exceeds ${MAX_BYTES / (1024 * 1024)} MB`,
      });
    }
    const r = await query(
      `INSERT INTO lumora_prep_state (user_id, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET data = EXCLUDED.data, updated_at = NOW()
       RETURNING updated_at`,
      [req.user.id, serialized],
    );

    // Fire-and-forget company-context warm-up so by the time the user
    // starts the live interview, Sona's briefing cache is already
    // populated. detectFromPrepData scans filenames + JD body for
    // allowlisted companies; unknown companies are silently skipped.
    try {
      const detected = detectCompanyFromPrepData(data);
      if (detected) {
        refreshCompanyContext(detected).catch(() => {});
      }
    } catch {}

    res.json({ updated_at: r.rows[0].updated_at });
  } catch (err) {
    next(err);
  }
});

/**
 * Lightweight company detection on the prep-kit blob — looks at the
 * active workspace's JD body, resume body, and original filenames for
 * allowlisted company names. Mirrors the frontend logic so warm-up
 * triggers without requiring the client to send the company.
 */
function detectCompanyFromPrepData(data) {
  if (!data || typeof data !== 'object') return null;
  const key = data.activeCompany || data.companies?.[0];
  if (!key) return null;
  const doc = data.data?.[key];
  if (!doc) return null;
  const haystack = [doc.jdFile, doc.resumeFile, doc.jd, doc.resume]
    .filter(Boolean)
    .join(' \n ');
  if (!haystack) return null;
  const tokens = [
    'NVIDIA', 'Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 'Netflix',
    'Stripe', 'Anthropic', 'OpenAI', 'Uber', 'Airbnb', 'Tesla', 'Databricks',
    'Snowflake', 'Shopify', 'Cloudflare', 'GitHub', 'Datadog', 'Pinterest',
    'LinkedIn', 'TikTok', 'ByteDance', 'Salesforce', 'Oracle', 'Intel', 'AMD',
    'Adobe', 'Coinbase', 'Robinhood', 'Plaid', 'Notion', 'Figma', 'Vercel',
    'Supabase', 'MongoDB', 'Spotify', 'Reddit', 'Discord', 'Atlassian',
    'Dropbox', 'Slack', 'Twilio', 'DoorDash', 'Lyft', 'Instacart', 'Snap',
    'PayPal', 'Palantir', 'Cohere',
  ];
  const scores = {};
  for (const t of tokens) {
    const re = new RegExp(`(^|[^A-Za-z])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z]|$)`, 'gi');
    const m = haystack.match(re);
    if (m) scores[t] = m.length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

router.delete('/state', async (req, res, next) => {
  try {
    await query('DELETE FROM lumora_prep_state WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
