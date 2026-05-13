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

// Role inference rules — matches HackerRank's role taxonomy
const ROLE_RULES = [
  ['Applied AI Engineer',       /rag\b|large language model|generative ai|prompt engineering\b/i],
  ['Front-End Developer',       /\breact\b|\bangular\b|vue\.?js\b|html\/css|javascript\b|typescript\b|\bcss\b/i],
  ['Back-End Developer',        /\bnode\.?js\b|\bjava\b|\bspring\b|\bdjango\b|\blaravel\b|express\.?js|\bphp\b|\bruby\b|\bkotlin\b|\bgo\b|\brust\b|\.net\b|\bflask\b|\bfastapi\b/i],
  ['Full-Stack Engineer',       /full.?stack/i],
  ['Data Scientist',            /data science|machine learning|\bstatistics\b|\btensorflow\b|\bpytorch\b|\bscikit\b|\bpredictive\b/i],
  ['Data Engineer',             /\bhadoop\b|\bspark\b|\bpyspark\b|\bkafka\b|\bairflow\b|\bsnowflake\b|\bdatabricks\b|apache spark|\bscala\b/i],
  ['Data Analyst',              /\bsql\b|\bpower bi\b|\btableau\b|\bexcel\b|data wrangling|data quality|\bdbms\b/i],
  ['Cloud Engineer',            /\baws\b|\bazure\b|\bgcp\b|\bkubernetes\b|\bdocker\b|\bterraform\b|\bcloudformation\b|\bserverless\b/i],
  ['DevOps Engineer',           /\bdevops\b|\bjenkins\b|\bansible\b|\bpuppet\b|\bchef\b|\bbash\b|\blinux\b|\bhelm\b|\bprometheus\b|\bgrafana\b|\belk\b/i],
  ['Mobile Developer',          /\bios\b|\bandroid\b|react native|\bflutter\b|\bswift\b|\bdart\b|\bmobile\b/i],
  ['QA Engineer',               /\bselenium\b|\bappium\b|\bjunit\b|quality assurance|testing techniques|automation testing/i],
  ['Machine Learning Engineer', /machine learning|deep learning|\bnlp\b|natural language processing|computer vision|\bllm\b/i],
  ['Cybersecurity Engineer',    /\bowasp\b|\bcryptography\b|network security|application security|security testing|offensive security|information security/i],
  ['Site Reliability Engineer', /\bsre\b|\bgrafana\b|\bprometheus\b|\belk\b|\bmonitoring\b|\bvirtualization\b/i],
  ['Database Administrator',    /\bpl\/sql\b|\bdynamodb\b|\bmongodb\b|\bcouchbase\b|\bdbms\b|postgresql|mysql|\boracle\b/i],
  ['Salesforce Developer',      /salesforce/i],
];

function inferRoles(problem) {
  const text = [
    ...(problem.skills_full || []),
    ...(problem.skills || []),
    ...(problem.tags || []),
    problem.name || '',
  ].join(' ');

  const roles = new Set();

  // Type-based overrides
  if (problem.type === 'fullstack')  roles.add('Full-Stack Engineer');
  if (problem.type === 'database')   roles.add('Database Administrator');
  if (problem.type === 'whiteboard') roles.add('Software Engineer');

  for (const [role, re] of ROLE_RULES) {
    if (re.test(text)) roles.add(role);
  }

  if (roles.size === 0) roles.add('Software Engineer');
  return [...roles].sort();
}

let _cache = null;
let _meta  = null;

async function getLibrary() {
  if (_cache) return _cache;
  const raw  = await readFile(DATA_PATH, 'utf-8');
  const data = JSON.parse(raw);
  _cache = data.problems;

  // Attach inferred roles to every problem (stored as _roles so it doesn't pollute the wire data)
  for (const p of _cache) p._roles = inferRoles(p);

  // Skills meta — use skills_full (HackerRank-style labels with level suffixes)
  const sfFreq = {};
  for (const p of _cache) {
    for (const s of (p.skills_full?.length ? p.skills_full : p.skills)) {
      sfFreq[s] = (sfFreq[s] || 0) + 1;
    }
  }
  const skills = Object.entries(sfFreq).sort((a, b) => b[1] - a[1]).map(([s]) => s);

  // Roles meta — frequency-sorted
  const roleFreq = {};
  for (const p of _cache) for (const r of p._roles) roleFreq[r] = (roleFreq[r] || 0) + 1;
  const roles = Object.entries(roleFreq).sort((a, b) => b[1] - a[1]).map(([r]) => r);

  const types = [...new Set(_cache.map(p => p.type).filter(Boolean))].sort();
  _meta = {
    types,
    skills,
    roles,
    difficulties: ['Easy', 'Medium', 'Hard'],
    durations:    ['quick', 'short', 'long', 'extended'],
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
 * &role=Back-End Developer,Front-End Developer  (match ANY role, inferred)
 * &type=code,mcq
 * &difficulty=Easy,Medium
 * &skills=Python (Basic),Java (Basic)           (match ANY, against skills_full)
 * &duration=quick,short                         (quick ≤10m, short 11-30m, long 31-60m, extended >60m)
 * &page=1&limit=30
 */
router.get('/', async (req, res) => {
  try {
    const problems = await getLibrary();

    const q         = (req.query.q || '').trim().toLowerCase();
    const rolesF    = req.query.role       ? req.query.role.split(',').map(r => r.trim())          : [];
    const types     = req.query.type       ? req.query.type.split(',').map(t => t.trim())          : [];
    const diffs     = req.query.difficulty ? req.query.difficulty.split(',').map(d => d.trim())    : [];
    const skills    = req.query.skills     ? req.query.skills.split(',').map(s => s.trim().toLowerCase()) : [];
    const durations = req.query.duration   ? req.query.duration.split(',').map(d => d.trim())      : [];
    const page      = Math.max(1, parseInt(req.query.page)  || 1);
    const limit     = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));

    let filtered = problems;

    if (q) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.summary  && p.summary.toLowerCase().includes(q)) ||
        (p.preview  && p.preview.toLowerCase().includes(q)) ||
        p.skills.some(s => s.toLowerCase().includes(q)) ||
        (p.skills_full || []).some(s => s.toLowerCase().includes(q)) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (rolesF.length)     filtered = filtered.filter(p => rolesF.some(r => p._roles.includes(r)));
    if (types.length)      filtered = filtered.filter(p => types.includes(p.type));
    if (diffs.length)      filtered = filtered.filter(p => diffs.includes(p.difficulty));
    if (skills.length)     filtered = filtered.filter(p => {
      const all = [...(p.skills_full?.length ? p.skills_full : p.skills), ...p.skills].map(s => s.toLowerCase());
      return skills.some(f => all.some(ps => ps.includes(f)));
    });
    if (durations.length)  filtered = filtered.filter(p => durations.some(d => DURATION_BUCKETS[d]?.(p)));

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
