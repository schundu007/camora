import { Router } from 'express';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const router = Router();

const DATA_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../data/hr_library.json'
);

// Duration buckets
const DURATION_BUCKETS = {
  quick:    p => p.duration_min != null && p.duration_min <= 10,
  short:    p => p.duration_min != null && p.duration_min > 10 && p.duration_min <= 30,
  long:     p => p.duration_min != null && p.duration_min > 30 && p.duration_min <= 60,
  extended: p => p.duration_min != null && p.duration_min > 60,
};

let _cache = null;
let _meta = null;

async function getLibrary() {
  if (_cache) return _cache;
  const raw = await readFile(DATA_PATH, 'utf-8');
  const data = JSON.parse(raw);
  _cache = data.problems;

  // Build meta — skills sorted by frequency
  const skillFreq = {};
  for (const p of _cache) for (const s of p.skills) skillFreq[s] = (skillFreq[s] || 0) + 1;
  const skills = Object.entries(skillFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);

  const types = [...new Set(_cache.map(p => p.type).filter(Boolean))].sort();
  _meta = {
    types,
    skills,
    difficulties: ['Easy', 'Medium', 'Hard'],
    durations: ['quick', 'short', 'long', 'extended'],
    total: _cache.length,
  };

  return _cache;
}

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
 * ?q=search
 * &type=code,mcq
 * &difficulty=Easy,Medium
 * &skills=Python,Java        (multi-skill, comma-separated, match ANY)
 * &duration=quick,short      (quick ≤10m, short 11-30m, long 31-60m, extended >60m)
 * &page=1&limit=30
 */
router.get('/', async (req, res) => {
  try {
    const problems = await getLibrary();

    const q          = (req.query.q || '').trim().toLowerCase();
    const types      = req.query.type       ? req.query.type.split(',').map(t => t.trim())       : [];
    const diffs      = req.query.difficulty ? req.query.difficulty.split(',').map(d => d.trim()) : [];
    const skills     = req.query.skills     ? req.query.skills.split(',').map(s => s.trim().toLowerCase()) : [];
    const durations  = req.query.duration   ? req.query.duration.split(',').map(d => d.trim())  : [];
    const page       = Math.max(1, parseInt(req.query.page)  || 1);
    const limit      = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));

    let filtered = problems;

    if (q) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.summary && p.summary.toLowerCase().includes(q)) ||
        (p.preview && p.preview.toLowerCase().includes(q)) ||
        p.skills.some(s => s.toLowerCase().includes(q)) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (types.length)     filtered = filtered.filter(p => types.includes(p.type));
    if (diffs.length)     filtered = filtered.filter(p => diffs.includes(p.difficulty));
    if (skills.length)    filtered = filtered.filter(p =>
      p.skills.some(ps => skills.some(f => ps.toLowerCase().includes(f)))
    );
    if (durations.length) filtered = filtered.filter(p =>
      durations.some(d => DURATION_BUCKETS[d]?.(p))
    );

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
