import { Router } from 'express';
import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const router = Router();

const DATA_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../data/hr_library.json'
);

let _cache = null;
let _meta = null;

async function getLibrary() {
  if (_cache) return _cache;
  const raw = await readFile(DATA_PATH, 'utf-8');
  const data = JSON.parse(raw);
  _cache = data.problems;

  // Build meta once
  const types = [...new Set(_cache.map(p => p.type).filter(Boolean))].sort();
  const skills = [...new Set(_cache.flatMap(p => p.skills))].sort();
  const difficulties = ['Easy', 'Medium', 'Hard'];
  _meta = { types, skills, difficulties, total: _cache.length };

  return _cache;
}

// Warm cache at import time
getLibrary().catch(err => console.error('[library] Failed to load hr_library.json:', err.message));

/** GET /api/library/meta */
router.get('/meta', async (req, res) => {
  try {
    await getLibrary();
    res.json(_meta);
  } catch (err) {
    console.error('[library] meta error:', err.message);
    res.status(500).json({ error: 'Failed to load library metadata' });
  }
});

/** GET /api/library
 * ?q=search&type=code,mcq&difficulty=Easy,Medium&skill=Python&page=1&limit=20
 */
router.get('/', async (req, res) => {
  try {
    const problems = await getLibrary();

    const q = (req.query.q || '').trim().toLowerCase();
    const types = req.query.type ? req.query.type.split(',').map(t => t.trim()) : [];
    const difficulties = req.query.difficulty ? req.query.difficulty.split(',').map(d => d.trim()) : [];
    const skill = (req.query.skill || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    let filtered = problems;

    if (q) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.summary && p.summary.toLowerCase().includes(q)) ||
        p.skills.some(s => s.toLowerCase().includes(q)) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (types.length > 0) {
      filtered = filtered.filter(p => types.includes(p.type));
    }

    if (difficulties.length > 0) {
      filtered = filtered.filter(p => difficulties.includes(p.difficulty));
    }

    if (skill) {
      filtered = filtered.filter(p =>
        p.skills.some(s => s.toLowerCase().includes(skill))
      );
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    res.json({ problems: items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[library] list error:', err.message);
    res.status(500).json({ error: 'Failed to load library' });
  }
});

export default router;
