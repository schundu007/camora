import express from 'express';
import { executeCode } from './codeRunner.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/run', async (req, res) => {
  const { code, language, test_cases } = req.body;
  if (!code || !language) {
    return res.status(400).json({ error: 'Missing code or language' });
  }
  try {
    const result = await executeCode(code, language, test_cases || []);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`code-runner :${PORT}`));
