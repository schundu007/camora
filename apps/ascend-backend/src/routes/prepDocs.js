import { Router } from 'express';
import multer from 'multer';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2, R2_BUCKET } from '../lib/r2.js';
import { query } from '../lib/shared-db.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { logger } from '../middleware/requestLogger.js';

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
).catch(err => logger.error({ err }, '[prepDocs] migration error'));

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
    sql += ' ORDER BY uploaded_at DESC';
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
