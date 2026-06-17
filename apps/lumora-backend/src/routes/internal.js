import { Router } from 'express';
import { indexR2Doc } from '../services/userDocIndexer.js';
import { query } from '../lib/shared-db.js';

const router = Router();

router.use((req, res, next) => {
  if (req.headers['x-api-key'] !== process.env.AI_SERVICES_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

router.post('/reindex-doc', async (req, res) => {
  const { r2_key, user_id, company_slug } = req.body;
  if (!r2_key || !user_id || !company_slug) {
    return res.status(400).json({ error: 'r2_key, user_id, company_slug required' });
  }
  try {
    const result = await indexR2Doc({ r2Key: r2_key, userId: user_id, companySlug: company_slug });
    if (result.written > 0) {
      await query('UPDATE user_company_docs SET indexed_at = NOW() WHERE r2_key = $1', [r2_key]);
    }
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[internal/reindex-doc] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/remove-doc-chunks', async (req, res) => {
  const { r2_key } = req.body;
  if (!r2_key) return res.status(400).json({ error: 'r2_key required' });
  try {
    await query('DELETE FROM lumora_user_doc_chunks WHERE source_key = $1', [r2_key]);
    res.json({ success: true });
  } catch (err) {
    console.error('[internal/remove-doc-chunks] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
