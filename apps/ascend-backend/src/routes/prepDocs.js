import { Router } from 'express';
import multer from 'multer';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2, R2_BUCKET } from '../lib/r2.js';
import { query } from '../lib/shared-db.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { logger } from '../middleware/requestLogger.js';
import { lookup as dnsLookupCb } from 'node:dns';
import { promisify } from 'node:util';

const dnsLookup = promisify(dnsLookupCb);

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const LUMORA_URL = process.env.LUMORA_INTERNAL_URL || 'http://localhost:8000';

query(`
  CREATE TABLE IF NOT EXISTS user_company_docs (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL,
    company_slug TEXT NOT NULL,
    filename     TEXT NOT NULL,
    r2_key       TEXT NOT NULL UNIQUE,
    mime_type    TEXT,
    size_bytes   INTEGER,
    doc_type     TEXT NOT NULL DEFAULT 'upload',
    indexed_at   TIMESTAMP,
    uploaded_at  TIMESTAMP NOT NULL DEFAULT NOW()
  )
`).then(() =>
  query(`CREATE INDEX IF NOT EXISTS user_company_docs_user_company ON user_company_docs(user_id, company_slug)`)
).then(() =>
  // Links live in the same table as uploads so the card can list both in the
  // order they were added. NULL for a file.
  query(`ALTER TABLE user_company_docs ADD COLUMN IF NOT EXISTS source_url TEXT`)
).catch(err => logger.error({ err }, '[prepDocs] migration error'));

/* ── URL ingestion ────────────────────────────────────────────────────────
 * Fetching a user-supplied URL server-side is an SSRF primitive: this process
 * sits inside the private network and can reach the metadata service, Redis,
 * Postgres and every internal healthcheck. So the target is checked BEFORE the
 * request and again on every redirect hop, because a public hostname is free to
 * 302 to 169.254.169.254.
 */
const BLOCKED_HOST = /^(localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i;

const isPrivateAddress = (host) => {
  if (BLOCKED_HOST.test(host)) return true;
  // IPv6 loopback / link-local / unique-local.
  if (host === '::1' || /^\[?(::1|fe80:|fc00:|fd)/i.test(host)) return true;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!v4) return false;
  const [a, b] = [Number(v4[1]), Number(v4[2])];
  if ([a, Number(v4[2]), Number(v4[3]), Number(v4[4])].some(n => n > 255)) return true;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||          // link-local, incl. cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || // carrier NAT
    a >= 224                              // multicast + reserved
  );
};

const assertFetchable = async (raw) => {
  let u;
  try { u = new URL(raw); } catch { throw new Error('That is not a valid URL'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Only http and https links can be added');
  if (isPrivateAddress(u.hostname)) throw new Error('That address is not reachable');
  // A literal-IP check alone is not enough: any public hostname is free to
  // resolve to 169.254.169.254. Check what it actually points at.
  try {
    const addrs = await dnsLookup(u.hostname, { all: true });
    if (addrs.some(a => isPrivateAddress(a.address))) throw new Error('That address is not reachable');
  } catch (err) {
    if (err?.message === 'That address is not reachable') throw err;
    throw new Error('That host could not be found');
  }
  return u;
};

/** Fetch with redirects followed BY HAND so every hop is re-checked. */
const safeFetch = async (startUrl, { hops = 4, timeoutMs = 12000 } = {}) => {
  let url = await assertFetchable(startUrl);
  for (let i = 0; i <= hops; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(url.href, {
        redirect: 'manual',
        signal: ctrl.signal,
        headers: { 'User-Agent': 'CamoraPrepBot/1.0', Accept: 'text/html,text/plain,application/pdf;q=0.9,*/*;q=0.5' },
      });
    } finally {
      clearTimeout(timer);
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) throw new Error('The link redirected nowhere');
      url = await assertFetchable(new URL(loc, url).href);
      continue;
    }
    if (!res.ok) throw new Error(`The link returned HTTP ${res.status}`);
    return { res, finalUrl: url };
  }
  throw new Error('The link redirected too many times');
};

/** Strip a page down to the text a model can use. */
const htmlToText = (html) => html
  .replace(/<(script|style|noscript|svg|head)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/[ \t]+/g, ' ')
  .replace(/\n\s*\n\s*\n+/g, '\n\n')
  .trim();

const titleOf = (html, fallback) => {
  const m = html.match(/<title[^>]*>([\s\S]{1,300}?)<\/title>/i);
  const t = m ? htmlToText(m[1]).trim() : '';
  return t || fallback;
};

router.post('/upload', jwtAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const rawSlug = req.body.company_slug;
    if (!rawSlug) return res.status(400).json({ error: 'company_slug required' });

    const companySlug = rawSlug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const userId = req.user.id;

    if (req.file.size > 10 * 1024 * 1024) return res.status(400).json({ error: 'File exceeds 10MB limit' });

    const countResult = await query('SELECT COUNT(*) FROM user_company_docs WHERE user_id = $1', [userId]);
    if (parseInt(countResult.rows[0].count) >= 50) {
      return res.status(400).json({ error: 'File limit reached (50 files per user)' });
    }

    const r2Key = `users/${userId}/companies/${companySlug}/${crypto.randomUUID()}-${req.file.originalname}`;

    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    const insertResult = await query(
      `INSERT INTO user_company_docs (user_id, company_slug, filename, r2_key, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId, companySlug, req.file.originalname, r2Key, req.file.mimetype, req.file.size]
    );

    const docId = insertResult.rows[0].id;

    fetch(`${LUMORA_URL}/internal/reindex-doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.AI_SERVICES_API_KEY || '' },
      body: JSON.stringify({ r2_key: r2Key, user_id: userId, company_slug: companySlug }),
    }).catch(err => console.warn('[prepDocs] reindex trigger failed:', err.message));

    res.json({ id: docId, filename: req.file.originalname, r2_key: r2Key, size_bytes: req.file.size });
  } catch (err) {
    logger.error({ err }, '[prepDocs] upload error');
    res.status(500).json({ error: 'Upload failed' });
  }
});

/* Read a link and hand back its text, without storing anything.
 *
 * The Materials intake keeps its documents in the user's prep state, not in
 * the R2/RAG store that /url writes to, so it needs the extraction and the
 * SSRF checks but not the persistence. Same guards, different destination. */
router.post('/fetch-url', jwtAuth, async (req, res) => {
  try {
    const rawUrl = typeof req.body.url === 'string' ? req.body.url.trim() : '';
    if (!rawUrl) return res.status(400).json({ error: 'url required' });

    let fetched;
    try {
      fetched = await safeFetch(rawUrl);
    } catch (err) {
      return res.status(400).json({ error: err?.message || 'Could not open that link' });
    }
    const { res: upstream, finalUrl } = fetched;

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    if (!/^(text\/|application\/(json|xhtml))/.test(contentType)) {
      return res.status(400).json({ error: 'That link is not a page or a text document. Upload the file instead.' });
    }

    const raw = (await upstream.text()).slice(0, 2 * 1024 * 1024);
    const isHtml = /html|xhtml/.test(contentType);
    const text = isHtml ? htmlToText(raw) : raw.trim();
    if (text.length < 40) {
      return res.status(400).json({ error: 'Nothing readable on that page — it is probably rendered by JavaScript.' });
    }

    const title = (isHtml ? titleOf(raw, finalUrl.hostname) : finalUrl.pathname.split('/').pop() || finalUrl.hostname).slice(0, 160);
    res.json({ title, url: finalUrl.href, text: text.slice(0, 400_000) });
  } catch (err) {
    logger.error({ err }, '[prepDocs] fetch-url error');
    res.status(500).json({ error: 'Could not read that link' });
  }
});

/* Add a link. Same table and same indexing path as an upload, so the card can
 * list files and links together in the order they were added. */
router.post('/url', jwtAuth, async (req, res) => {
  try {
    const rawSlug = req.body.company_slug;
    const rawUrl = typeof req.body.url === 'string' ? req.body.url.trim() : '';
    if (!rawUrl) return res.status(400).json({ error: 'url required' });
    if (!rawSlug) return res.status(400).json({ error: 'company_slug required' });

    const companySlug = rawSlug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const userId = req.user.id;

    const countResult = await query('SELECT COUNT(*) FROM user_company_docs WHERE user_id = $1', [userId]);
    if (parseInt(countResult.rows[0].count) >= 50) {
      return res.status(400).json({ error: 'File limit reached (50 files per user)' });
    }

    let fetched;
    try {
      fetched = await safeFetch(rawUrl);
    } catch (err) {
      // These messages are written for the user, not the log.
      return res.status(400).json({ error: err?.message || 'Could not open that link' });
    }
    const { res: upstream, finalUrl } = fetched;

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    if (!/^(text\/|application\/(json|xhtml))/.test(contentType)) {
      return res.status(400).json({ error: 'That link is not a page or a text document. Upload the file instead.' });
    }

    // Cap the read so a huge or endless response cannot exhaust memory —
    // Content-Length is a hint a server is free to lie about, so the slice is
    // what actually enforces it.
    const raw = (await upstream.text()).slice(0, 2 * 1024 * 1024);
    const isHtml = /html|xhtml/.test(contentType);
    const text = isHtml ? htmlToText(raw) : raw.trim();
    if (text.length < 40) {
      return res.status(400).json({ error: 'Nothing readable on that page — it is probably rendered by JavaScript.' });
    }

    const filename = (isHtml ? titleOf(raw, finalUrl.hostname) : finalUrl.pathname.split('/').pop() || finalUrl.hostname)
      .slice(0, 160);
    const body = Buffer.from(`${filename}\n${finalUrl.href}\n\n${text}`, 'utf8');
    const r2Key = `users/${userId}/companies/${companySlug}/${crypto.randomUUID()}-link.txt`;

    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: body,
      ContentType: 'text/plain; charset=utf-8',
    }));

    const insertResult = await query(
      `INSERT INTO user_company_docs (user_id, company_slug, filename, r2_key, mime_type, size_bytes, doc_type, source_url)
       VALUES ($1, $2, $3, $4, $5, $6, 'link', $7) RETURNING id`,
      [userId, companySlug, filename, r2Key, 'text/plain', body.length, finalUrl.href]
    );

    const docId = insertResult.rows[0].id;

    fetch(`${LUMORA_URL}/internal/reindex-doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.AI_SERVICES_API_KEY || '' },
      body: JSON.stringify({ r2_key: r2Key, user_id: userId, company_slug: companySlug }),
    }).catch(err => console.warn('[prepDocs] reindex trigger failed:', err.message));

    // Returns the text as well, so one call can both index the link and hand
    // it to the caller's own state — otherwise the intake needs a second fetch
    // of the same page to show what it added.
    res.json({ id: docId, filename, title: filename, url: finalUrl.href, source_url: finalUrl.href, size_bytes: body.length, text: text.slice(0, 400_000) });
  } catch (err) {
    logger.error({ err }, '[prepDocs] url error');
    res.status(500).json({ error: 'Could not add that link' });
  }
});

router.get('/', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { company_slug } = req.query;
    let sql = 'SELECT * FROM user_company_docs WHERE user_id = $1';
    const params = [userId];
    if (company_slug) {
      sql += ' AND company_slug = $2';
      params.push(company_slug);
    }
    sql += ' ORDER BY uploaded_at ASC, id ASC';
    const result = await query(sql, params);
    res.json({ docs: result.rows });
  } catch (err) {
    logger.error({ err }, '[prepDocs] list error');
    res.status(500).json({ error: 'Failed to list docs' });
  }
});

router.delete('/company/:slug', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { slug } = req.params;
    const docs = await query(
      'SELECT id, r2_key FROM user_company_docs WHERE user_id = $1 AND company_slug = $2',
      [userId, slug]
    );
    for (const doc of docs.rows) {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: doc.r2_key })).catch(() => {});
      fetch(`${LUMORA_URL}/internal/remove-doc-chunks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.AI_SERVICES_API_KEY || '' },
        body: JSON.stringify({ r2_key: doc.r2_key }),
      }).catch(() => {});
    }
    await query('DELETE FROM user_company_docs WHERE user_id = $1 AND company_slug = $2', [userId, slug]);
    res.json({ success: true, deleted: docs.rows.length });
  } catch (err) {
    logger.error({ err }, '[prepDocs] delete-company error');
    res.status(500).json({ error: 'Delete failed' });
  }
});

router.delete('/:id', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const docResult = await query('SELECT * FROM user_company_docs WHERE id = $1 AND user_id = $2', [id, userId]);
    if (docResult.rows.length === 0) return res.status(404).json({ error: 'Doc not found' });

    const doc = docResult.rows[0];

    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: doc.r2_key }));
    await query('DELETE FROM user_company_docs WHERE id = $1', [id]);

    fetch(`${LUMORA_URL}/internal/remove-doc-chunks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.AI_SERVICES_API_KEY || '' },
      body: JSON.stringify({ r2_key: doc.r2_key }),
    }).catch(err => console.warn('[prepDocs] remove-chunks trigger failed:', err.message));

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, '[prepDocs] delete error');
    res.status(500).json({ error: 'Delete failed' });
  }
});

router.get('/:id/download', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const docResult = await query('SELECT * FROM user_company_docs WHERE id = $1 AND user_id = $2', [id, userId]);
    if (docResult.rows.length === 0) return res.status(404).json({ error: 'Doc not found' });

    const doc = docResult.rows[0];
    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: doc.r2_key }),
      { expiresIn: 900 }
    );

    res.json({ url });
  } catch (err) {
    logger.error({ err }, '[prepDocs] download error');
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

router.put('/:id/mark-indexed', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.AI_SERVICES_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    await query('UPDATE user_company_docs SET indexed_at = NOW() WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, '[prepDocs] mark-indexed error');
    res.status(500).json({ error: 'Failed to mark indexed' });
  }
});

export default router;
