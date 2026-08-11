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
import { query } from '../lib/shared-db.js';
import { authenticate } from '../middleware/authenticate.js';
import { refreshCompanyContext } from '../services/companyContext.js';
import { indexUserPrepDocs } from '../services/userDocIndexer.js';
import { buildSessionKit, clearSessionKit } from '../services/sessionKit.js';
import { buildWebWatchlist } from '../services/webWatchlist.js';
import { r2, R2_BUCKET } from '../lib/r2.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const slugify = s => String(s).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const router = Router();

router.use(authenticate);

// Cap at 8 MB serialized. The panel PUTs the WHOLE PrepData blob —
// every company's JD + resume + cover letter + prep materials + the full
// text of every study doc + every generated section. One GitHub repo
// fetch alone adds up to 600 KB (routes/github.js MAX_TOTAL_BYTES) and
// the UI invites "as many as you want", so the old 2 MB cap sat below
// what a normal multi-company kit reaches: users crossed it and then
// EVERY save 413'd forever, which also froze the RAG index (the
// index/kit/watchlist pipeline below only runs after a save succeeds).
// 8 MB leaves headroom under the express.json 10 MB parser limit in
// index.js, so oversize payloads still get this clean 413 rather than
// the parser's entity.too.large.
const MAX_BYTES = 8 * 1024 * 1024;

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
    const bytes = Buffer.byteLength(serialized, 'utf8');
    if (bytes > MAX_BYTES) {
      // Name the limit, the actual size, and the way out. The panel renders
      // this string verbatim in its sync banner; without it the user only
      // saw "HTTP 413" and had no idea which document to drop.
      const mb = n => (n / (1024 * 1024)).toFixed(1).replace(/\.0$/, '');
      return res.status(413).json({
        error: `Prep Kit is ${mb(bytes)} MB — over the ${mb(MAX_BYTES)} MB limit. `
          + 'Remove a large study doc or archive a company you are done with, then save again.',
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
      // Index the Prep Kit blob into pgvector so retrieval has the
      // current JD/resume to ground Sona's answers. Fire-and-forget;
      // a failure here must not block the user's save.
      // Sequence: index user docs → build session kit. The kit reads
      // from the user-doc rows we just wrote, so we chain rather than
      // run them in parallel.
      indexUserPrepDocs({ userId: req.user.id, prepData: data })
        .then(() => buildSessionKit({ userId: req.user.id, prepData: data }))
        .then(() => buildWebWatchlist({ userId: req.user.id, prepData: data }))
        .catch((err) => console.warn('[prep] index/kit/watchlist pipeline failed:', err.message));

      const r2Key = `users/${req.user.id}/companies/${slugify(data.activeCompany || 'default')}/prep_state.json`;
      r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: serialized,
        ContentType: 'application/json',
      })).catch(err => console.warn('[prep] R2 sync failed:', err.message));
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
    // Deleting the Prep Kit must delete everything DERIVED from it, not just
    // the source row. It previously dropped lumora_prep_state alone and left
    // behind both the indexed doc chunks and the warm session kit — so answers
    // kept coming from a company's material after the user had deleted it, with
    // no way to clear it from the UI. User-tier chunks bypass mode filtering by
    // design, and the warm kit short-circuits live retrieval, so those two
    // leftovers fully determined the grounding of every subsequent answer.
    await query('DELETE FROM lumora_prep_state WHERE user_id = $1', [req.user.id]);
    await query('DELETE FROM lumora_user_doc_chunks WHERE user_id = $1', [req.user.id]);
    await clearSessionKit(req.user.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
