import express from 'express';
import { executeCode } from './codeRunner.js';
import { hasValidApiKey, validateRequest } from './security.js';

const app = express();
const apiKey = process.env.CODE_RUNNER_API_KEY;
const MAX_CONCURRENT_RUNS = 4;
let activeRuns = 0;
if (!apiKey && process.env.NODE_ENV !== 'test') {
  throw new Error('CODE_RUNNER_API_KEY must be configured');
}

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb', strict: true }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/run', (req, res, next) => {
  if (!hasValidApiKey(req.get('x-api-key'), apiKey)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
});

app.post('/run', async (req, res) => {
  if (activeRuns >= MAX_CONCURRENT_RUNS) {
    return res.status(429).json({ error: 'Code runner is busy; retry shortly' });
  }
  let counted = false;
  try {
    const { code, language, testCases } = validateRequest(req.body);
    activeRuns += 1;
    counted = true;
    const result = await executeCode(code, language, testCases);
    res.json(result);
  } catch (err) {
    res.status(err.type === 'entity.too.large' ? 413 : 400).json({ error: err.message });
  } finally {
    if (counted) activeRuns -= 1;
  }
});

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large' });
  return res.status(400).json({ error: 'Invalid JSON request' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`code-runner :${PORT}`));
