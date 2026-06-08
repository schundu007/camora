// apps/ascend-backend/src/routes/playground.js
import { Router } from 'express';
import { promisify } from 'util';
import { execFile, spawn } from 'child_process';
import { writeFile, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir, platform } from 'os';
import { randomUUID, createHash } from 'crypto';
import { query } from '../config/database.js';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const execFileAsync = promisify(execFile);
const router = Router();

// ---------------------------------------------------------------------------
// Auto-install missing Python packages
// ---------------------------------------------------------------------------

const PIP_ALIAS = {
  cv2:        'opencv-python',
  PIL:        'Pillow',
  sklearn:    'scikit-learn',
  bs4:        'beautifulsoup4',
  yaml:       'PyYAML',
  dotenv:     'python-dotenv',
  Crypto:     'pycryptodome',
  google:     'google-api-python-client',
  serial:     'pyserial',
  dateutil:   'python-dateutil',
  jwt:        'PyJWT',
  MySQLdb:    'mysqlclient',
  psycopg2:   'psycopg2-binary',
  redis:      'redis',
  pymongo:    'pymongo',
  pydantic:   'pydantic',
  aiohttp:    'aiohttp',
  httpx:      'httpx',
  attr:       'attrs',
  click:      'click',
  rich:       'rich',
  loguru:     'loguru',
  tabulate:   'tabulate',
  arrow:      'arrow',
  pendulum:   'pendulum',
  tqdm:       'tqdm',
  faker:      'Faker',
  colorama:   'colorama',
};

function missingModule(stderr = '') {
  return stderr.match(/ModuleNotFoundError: No module named '([\w.]+)'/)?.[1]?.split('.')?.[0] ?? null;
}

async function pipInstall(importName) {
  if (!/^[a-zA-Z0-9._-]+$/.test(importName)) return false;
  const pkgName = PIP_ALIAS[importName] ?? importName;
  // Use `python3 -m pip` — guaranteed to find the right pip for whatever
  // Python binary is on PATH, regardless of whether pip3/pip are symlinked.
  for (const flag of ['--break-system-packages', '--user']) {
    try {
      await execFileAsync('python3', ['-m', 'pip', 'install', '--quiet', flag, pkgName],
        { timeout: 90000, encoding: 'utf8' });
      console.log(`[playground] pip installed: ${pkgName} (${flag})`);
      return true;
    } catch { /* try next flag */ }
  }
  console.warn(`[playground] pip install failed for ${pkgName}`);
  return false;
}

const CODE_LIMIT = 50 * 1024; // 50KB
const EXEC_OPTS = { maxBuffer: 1024 * 1024, encoding: 'utf8' };

const EXPLAIN_CACHE = new Map();
const EXPLAIN_CACHE_MAX = 500;

let _anthropic = null;
const getAnthropic = () => {
  if (!_anthropic && process.env.ANTHROPIC_API_KEY) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
};

let _openrouter = null;
const getOpenRouter = () => {
  if (!_openrouter && process.env.OPENROUTER_API_KEY) {
    _openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: { 'HTTP-Referer': 'https://cariara.com', 'X-Title': 'Camora Playground' },
    });
  }
  return _openrouter;
};

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 700, temperature: 0.1 },
      }),
    }
  );
  if (!resp.ok) throw new Error(`Gemini ${resp.status}`);
  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

async function callExplain(prompt) {
  if (process.env.GEMINI_API_KEY) {
    try { return await callGemini(prompt); } catch (e) { console.warn('[explain] Gemini failed:', e.message); }
  }
  const anthropic = getAnthropic();
  if (anthropic) {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      });
      return msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '';
    } catch (e) { console.warn('[explain] Anthropic failed:', e.message); }
  }
  const or = getOpenRouter();
  if (or) {
    try {
      const res = await or.chat.completions.create({
        model: 'qwen/qwen-2.5-72b-instruct',
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      });
      return res.choices[0]?.message?.content?.trim() ?? '';
    } catch (e) { console.warn('[explain] OpenRouter failed:', e.message); }
  }
  return null;
}

// Wrapper reads code.py from disk — avoids any string-escaping issues.
// Emits __VARS__:<json> to stderr so backend can parse variables separately.
//
// Single shared namespace (_ns) is critical: exec with separate globals/locals
// breaks cross-references between top-level classes/functions and prevents
// `if __name__ == '__main__':` from ever being true.
const PYTHON_WRAPPER = `import json as _j, sys as _s, traceback as _t, io as _io, re as _re, subprocess as _sp

def _auto_install(mod_name):
    _pkg = {
        'cv2': 'opencv-python', 'PIL': 'Pillow', 'sklearn': 'scikit-learn',
        'bs4': 'beautifulsoup4', 'yaml': 'PyYAML', 'dotenv': 'python-dotenv',
        'Crypto': 'pycryptodome', 'dateutil': 'python-dateutil', 'jwt': 'PyJWT',
        'psycopg2': 'psycopg2-binary', 'attr': 'attrs', 'faker': 'Faker',
    }.get(mod_name, mod_name)
    for _flag in ['--break-system-packages', '--user']:
        try:
            _sp.check_call([_s.executable, '-m', 'pip', 'install', '--quiet', _flag, _pkg],
                           stdout=_sp.DEVNULL, stderr=_sp.DEVNULL, timeout=90)
            return True
        except Exception:
            pass
    return False

with open('code.py', 'r') as _f:
    _src = _f.read()

_cap = _io.StringIO()
_s.stdout = _cap
import builtins as _bi
_orig_input = _bi.input
def _silent_input(prompt=''):
    return _orig_input()
_bi.input = _silent_input
_ns = {'__name__': '__main__'}

_MAX_RETRIES = 5
for _attempt in range(_MAX_RETRIES + 1):
    try:
        exec(compile(_src, 'code.py', 'exec'), _ns)
        break
    except ModuleNotFoundError as _e:
        _s.stdout = _s.__stdout__
        _mod = _re.search(r"No module named '([\\w.]+)'", str(_e))
        _mod = _mod.group(1).split('.')[0] if _mod else None
        if not _mod or _attempt == _MAX_RETRIES or not _auto_install(_mod):
            _s.stdout.write(_cap.getvalue())
            _s.stderr.write(_t.format_exc())
            _s.stderr.flush()
            _s.exit(1)
        _cap = _io.StringIO()
        _s.stdout = _cap
    except Exception:
        _s.stdout = _s.__stdout__
        _s.stdout.write(_cap.getvalue())
        _s.stderr.write(_t.format_exc())
        _s.stderr.flush()
        _s.exit(1)

_s.stdout = _s.__stdout__
_s.stdout.write(_cap.getvalue())
_safe = {}
for _k, _v in _ns.items():
    if not _k.startswith('_'):
        try:
            _safe[_k] = {'type': type(_v).__name__, 'repr': repr(_v)[:200]}
        except Exception:
            pass
_s.stderr.write('__VARS__:' + _j.dumps(_safe) + '\\n')
`;

function parseVarsSentinel(stderr = '') {
  const lines = stderr.split('\n');
  const varsLine = lines.find(l => l.startsWith('__VARS__:'));
  const cleanStderr = lines.filter(l => !l.startsWith('__VARS__:')).join('\n').trimEnd();
  let variables = {};
  if (varsLine) {
    try { variables = JSON.parse(varsLine.slice('__VARS__:'.length)); } catch {}
  }
  return { cleanStderr, variables };
}

async function withTmpDir(fn) {
  const dir = join(tmpdir(), `playground-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function spawnPython(dir, stdinData = '') {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', ['main.py'], { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), 10000);
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    if (stdinData) child.stdin.write(stdinData, 'utf8');
    child.stdin.end();
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const msg = signal === 'SIGKILL'
          ? 'Execution timed out (10s limit)'
          : 'Command failed: python3 main.py';
        reject(Object.assign(new Error(msg), { stdout, stderr, code: code ?? 1 }));
      }
    });
    child.on('error', e => { clearTimeout(timer); reject(e); });
  });
}

async function runPython(code, stdinData = '') {
  return withTmpDir(async (dir) => {
    await writeFile(join(dir, 'code.py'), code, 'utf8');
    await writeFile(join(dir, 'main.py'), PYTHON_WRAPPER, 'utf8');
    const start = Date.now();

    let lastErr = null;
    for (let attempt = 0; attempt <= 5; attempt++) {
      try {
        const { stdout, stderr } = await spawnPython(dir, stdinData);
        const { cleanStderr, variables } = parseVarsSentinel(stderr);
        return { stdout, stderr: cleanStderr, exitCode: 0, duration: Date.now() - start, variables };
      } catch (err) {
        lastErr = err;
        const mod = missingModule(err.stderr);
        if (!mod) break;
        const ok = await pipInstall(mod);
        if (!ok) break;
      }
    }

    const { cleanStderr, variables } = parseVarsSentinel(lastErr.stderr ?? '');
    return {
      stdout: lastErr.stdout || '',
      stderr: cleanStderr || lastErr.message,
      exitCode: typeof lastErr.code === 'number' ? lastErr.code : 1,
      duration: Date.now() - start,
      variables,
    };
  });
}

async function runBash(code) {
  return withTmpDir(async (dir) => {
    const file = join(dir, 'script.sh');
    await writeFile(file, code, { encoding: 'utf8', mode: 0o755 });
    const start = Date.now();
    try {
      const { stdout, stderr } = await execFileAsync(
        'bash', [file],
        { cwd: dir, timeout: 10000, ...EXEC_OPTS }
      );
      return { stdout, stderr, exitCode: 0, duration: Date.now() - start, variables: {} };
    } catch (err) {
      return {
        stdout: err.stdout || '',
        stderr: err.stderr || err.message,
        exitCode: typeof err.code === 'number' ? err.code : 1,
        duration: Date.now() - start,
        variables: {},
      };
    }
  });
}

function spawnWithStdin(cmd, args, input, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.stdin.write(input, 'utf8');
    child.stdin.end();
    child.stdin.on('error', () => {}); // suppress EPIPE if child exits before reading all stdin
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout: '', stderr: err.message, exitCode: 1 });
    });
  });
}

async function runDockerLint(code) {
  const start = Date.now();
  const result = await spawnWithStdin('hadolint', ['-'], code, 5000);
  return {
    stdout: result.stdout || (result.exitCode === 0 ? 'Dockerfile is valid. No issues found.' : ''),
    stderr: result.stderr,
    exitCode: result.exitCode,
    duration: Date.now() - start,
    variables: {},
  };
}

const TF_PROVIDERS_TF = `terraform {
  required_providers {
    null   = { source = "hashicorp/null" }
    random = { source = "hashicorp/random" }
  }
}
`;

async function runTerraform(code) {
  return withTmpDir(async (dir) => {
    await writeFile(join(dir, 'main.tf'), code, 'utf8');
    if (!code.includes('terraform {')) {
      await writeFile(join(dir, 'providers.tf'), TF_PROVIDERS_TF, 'utf8');
    }
    const env = {
      ...process.env,
      TF_PLUGIN_CACHE_DIR: '/terraform-plugin-cache',
      TF_INPUT: 'false',
    };
    const start = Date.now();
    const output = [];
    try {
      const init = await execFileAsync(
        'terraform', ['init', '-backend=false', '-no-color'],
        { cwd: dir, timeout: 30000, env, ...EXEC_OPTS }
      );
      output.push(init.stdout.trim());

      const validate = await execFileAsync(
        'terraform', ['validate', '-no-color'],
        { cwd: dir, timeout: 10000, env, ...EXEC_OPTS }
      );
      output.push(validate.stdout.trim());

      const plan = await execFileAsync(
        'terraform', ['plan', '-no-color'],
        { cwd: dir, timeout: 30000, env, ...EXEC_OPTS }
      );
      output.push(plan.stdout.trim());

      return { stdout: output.filter(Boolean).join('\n\n'), stderr: '', exitCode: 0, duration: Date.now() - start, variables: {} };
    } catch (err) {
      // exit code 2 = plan has changes (not an error)
      if (err.code === 2) {
        output.push(err.stdout || '');
        return { stdout: output.filter(Boolean).join('\n\n'), stderr: '', exitCode: 0, duration: Date.now() - start, variables: {} };
      }
      return {
        stdout: err.stdout || '',
        stderr: err.stderr || err.message,
        exitCode: typeof err.code === 'number' ? err.code : 1,
        duration: Date.now() - start,
        variables: {},
      };
    }
  });
}

// POST /explain  — Gemini line explanation with in-memory cache
router.post('/explain', async (req, res, next) => {
  try {
    const { code, line, language = 'python' } = req.body;
    if (!code || !line || typeof code !== 'string') {
      return res.status(400).json({ error: 'code and line are required' });
    }
    if (code.length > CODE_LIMIT) {
      return res.status(413).json({ error: 'Code too large' });
    }

    const lineNumber = Number(line);
    const allLines = code.split('\n');
    const rawContent = allLines[lineNumber - 1] ?? '';
    if (!rawContent.trim()) return res.json({ explanation: '' });

    // Strip comment-only lines so the LLM sees only active code
    const activeLines = allLines.filter(l => !/^\s*#/.test(l));
    const activeCode = activeLines.join('\n').trim();
    if (!activeCode) return res.json({ what: '', how: [], concepts: [] });

    // If cursor is on a comment line, find nearest active line below then above
    let targetContent = rawContent;
    let targetLineNumber = lineNumber;
    if (/^\s*#/.test(rawContent)) {
      const below = allLines.slice(lineNumber).findIndex(l => l.trim() && !/^\s*#/.test(l));
      const above = allLines.slice(0, lineNumber - 1).reverse().findIndex(l => l.trim() && !/^\s*#/.test(l));
      if (below !== -1) {
        targetLineNumber = lineNumber + below + 1;
        targetContent = allLines[targetLineNumber - 1];
      } else if (above !== -1) {
        targetLineNumber = lineNumber - above - 1;
        targetContent = allLines[targetLineNumber - 1];
      } else {
        return res.json({ what: '', how: [], concepts: [] });
      }
    }

    const cacheKey = createHash('sha256')
      .update(`${activeCode}:${targetContent}:${language}`)
      .digest('hex');

    if (EXPLAIN_CACHE.has(cacheKey)) {
      return res.json(EXPLAIN_CACHE.get(cacheKey));
    }

    const prompt = `You are a beginner-friendly coding tutor. Explain this line from the ${language} code below.

Code (active lines only):
\`\`\`${language}
${activeCode}
\`\`\`

Target line: ${targetContent}

Return ONLY a JSON object (no markdown fences). Schema:
{
  "what": "One plain sentence — what this specific line does. No jargon.",
  "how": [
    { "code": "the snippet or sub-expression", "text": "plain English for a complete beginner" }
  ],
  "trace": "Show the variable state change this line causes, e.g. 'Before: x = 5  →  After: x = 8'. Omit if the line has no state change (import, comment, def, etc.).",
  "analogy": "A real-world comparison that makes the concept click for a total beginner. One sentence.",
  "concepts": ["concept1", "concept2"]
}

Rules:
- how: 2-4 entries breaking the line into its meaningful parts (sub-expressions, operator, keyword)
- trace: use actual variable names and example values from the surrounding code context
- analogy: avoid tech metaphors — use everyday objects (drawers, sticky notes, recipe cards)
- concepts: 2-4 ${language} concept names a beginner should look up (e.g. "dictionary", "f-string", "for loop")`;

    const raw = await callExplain(prompt) ?? '';
    if (!raw) return res.json({ what: '', how: [], concepts: [] });

    let result;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      result = JSON.parse(match ? match[0] : cleaned);
    } catch {
      result = { what: raw, how: [], concepts: [] };
    }

    if (EXPLAIN_CACHE.size >= EXPLAIN_CACHE_MAX) {
      EXPLAIN_CACHE.delete(EXPLAIN_CACHE.keys().next().value);
    }
    EXPLAIN_CACHE.set(cacheKey, result);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /run
router.post('/run', async (req, res, next) => {
  try {
    const { language, code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'code is required' });
    }
    if (code.length > CODE_LIMIT) {
      return res.status(413).json({ error: 'Code exceeds 50 KB limit' });
    }

    const lang = String(language || '').toLowerCase();
    const stdin = typeof req.body.stdin === 'string' ? req.body.stdin : '';
    let result;
    switch (lang) {
      case 'python3': result = await runPython(code, stdin); break;
      case 'bash':    result = await runBash(code);   break;
      case 'docker':  result = await runDockerLint(code); break;
      case 'terraform': result = await runTerraform(code); break;
      default:
        return res.status(400).json({ error: `Unsupported language: ${language}` });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /lint  — ruff, Python3 only
router.post('/lint', async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string' || code.length > CODE_LIMIT) return res.json({ diagnostics: [] });

    const result = await spawnWithStdin(
      'ruff', ['check', '--output-format=json', '--stdin-filename=main.py', '-'],
      code, 5000
    );

    let diagnostics = [];
    try {
      const raw = JSON.parse(result.stdout || '[]');
      diagnostics = raw.map(d => ({
        line:    d.location?.row    ?? 1,
        col:     d.location?.column ?? 1,
        endLine: d.end_location?.row    ?? d.location?.row    ?? 1,
        endCol:  d.end_location?.column ?? d.location?.column ?? 2,
        code:    d.code ?? 'E000',
        message: d.message ?? '',
      }));
    } catch {}

    res.json({ diagnostics });
  } catch (err) {
    next(err);
  }
});

const stripEmptyLines = (s) => s.split('\n').filter(l => l.trim() !== '').join('\n');

// POST /format  — black (python3), shfmt (bash), terraform fmt (terraform)
// Always strips empty/blank lines from the result.
router.post('/format', async (req, res, next) => {
  try {
    const { code, language = 'python3' } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'code is required' });
    }

    const lang = String(language).toLowerCase();
    let result;

    if (lang === 'python3') {
      result = await spawnWithStdin('black', ['-', '--quiet'], code, 5000);
    } else if (lang === 'bash') {
      result = await spawnWithStdin('shfmt', ['-i', '2', '-'], code, 5000);
    } else if (lang === 'terraform') {
      result = await spawnWithStdin('terraform', ['fmt', '-'], code, 10000);
    } else {
      return res.json({ code: stripEmptyLines(code) });
    }

    if (result.exitCode === 0) {
      res.json({ code: stripEmptyLines(result.stdout) });
    } else {
      res.json({ code: stripEmptyLines(code), error: result.stderr || `${lang} formatter failed` });
    }
  } catch (err) {
    next(err);
  }
});

// POST /share  — save snippet, return short URL
router.post('/share', async (req, res, next) => {
  try {
    const { language, code, testsCode } = req.body;
    if (!language || !code) {
      return res.status(400).json({ error: 'language and code are required' });
    }
    const result = await query(
      `INSERT INTO playground_snippets (user_id, language, code, tests_code)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [req.user.id, language, code, testsCode ?? null]
    );
    const id = result.rows[0].id;
    res.json({ id, url: `/lumora/playground/s/${id}` });
  } catch (err) {
    next(err);
  }
});

// GET /share/:id  — load shared snippet (auth still required — all playground routes require login)
router.get('/share/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT language, code, tests_code FROM playground_snippets WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Snippet not found' });
    }
    const { language, code, tests_code } = result.rows[0];
    res.json({ language, code, testsCode: tests_code });
  } catch (err) {
    next(err);
  }
});

export { router as playgroundRouter };
