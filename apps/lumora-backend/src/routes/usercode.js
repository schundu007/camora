/**
 * User-code indexing endpoint.
 *
 * Called fire-and-forget by ascend-backend's run.js after a successful
 * Practice playground execution. The user's JWT is forwarded so the
 * call authenticates against the same secret both backends share.
 *
 * The route is intentionally minimal — chunking + embedding + storage
 * lives in the indexer service. Always returns 202 (accepted) on
 * shape-valid input even if the underlying index fails, so the caller
 * doesn't retry on a noisy network and create duplicates.
 */
import { Router } from 'express';
import { indexUserCode } from '../services/userCodeIndexer.js';

const router = Router();

router.post('/index', async (req, res) => {
  const { problem, language, code, success = true } = req.body || {};
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
  if (!problem || !language || !code) {
    return res.status(400).json({ error: 'problem, language, and code are required' });
  }
  // Fire-and-forget on the server side too: respond immediately, run
  // the embed/insert in the background. The Practice page never waits
  // for this, so latency here only affects backend throughput.
  indexUserCode({ userId, problem, language, code, success })
    .then((r) => {
      if (r.error) console.warn('[usercode] index failed:', r.error);
    })
    .catch((err) => console.warn('[usercode] index threw:', err.message));
  return res.status(202).json({ accepted: true });
});

export default router;
