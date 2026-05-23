# DevOps Playground — Core Implementation Plan (Plan 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/lumora/playground` page with Python3, Bash, Docker (hadolint), and Terraform (validate + plan) execution, plus Tier 1 Python learning features (ruff lint, Black format, error decoder, keyboard shortcuts).

**Architecture:** New `playground.js` route mounted on ascend-backend at `/api/v1/playground`. Each language runs via `execFile`/`spawn` with temp dirs, timeouts, and cleanup. Frontend is a new `PlaygroundLayout` lazy-loaded inside the existing `LumoraShellPage` when `location.pathname` includes `/playground`. Tier 1 features (ruff, black) call lightweight backend endpoints; error decoding is pure client-side.

**Tech Stack:** Node.js `execFile`/`spawn`, Python3 wrapper script, `hadolint`, `terraform`, `ruff`, `black`, Monaco editor (already in project), React 19, Tailwind 4, `nixpacks.toml` for Railway.

---

## File Map

**Create (backend):**
- `apps/ascend-backend/nixpacks.toml` — install hadolint, terraform, ruff, black
- `apps/ascend-backend/src/routes/playground.js` — all 6 endpoints
- `apps/ascend-backend/src/middleware/playgroundLimiter.js` — rate limiter

**Modify (backend):**
- `apps/ascend-backend/src/index.js` — DB migration + route mount

**Create (frontend):**
- `apps/camora/src/pages/lumora/PlaygroundPage.tsx` — thin page wrapper
- `apps/camora/src/components/lumora/playground/PlaygroundLayout.tsx` — root layout + tab state
- `apps/camora/src/components/lumora/playground/LanguageTabs.tsx` — tab bar
- `apps/camora/src/components/lumora/playground/PlaygroundEditor.tsx` — Monaco wrapper
- `apps/camora/src/components/lumora/playground/OutputPane.tsx` — stdout/stderr display
- `apps/camora/src/components/lumora/playground/ErrorDecoder.ts` — traceback rule table

**Modify (frontend):**
- `apps/camora/src/services/capra-api.ts` — add `playgroundAPI` export
- `apps/camora/src/App.tsx` — add `/lumora/playground` and `/lumora/playground/s/:id` routes
- `apps/camora/src/components/lumora/shell/LumoraIconRail.tsx` — add `'playground'` to `LumoraTab` type + nav item
- `apps/camora/src/pages/lumora/LumoraShellPage.tsx` — add pathname detection + lazy-load `PlaygroundLayout`

---

## Task 1: Create nixpacks.toml for ascend-backend

**Files:**
- Create: `apps/ascend-backend/nixpacks.toml`

- [ ] **Step 1: Verify no nixpacks.toml exists**

```bash
ls apps/ascend-backend/nixpacks.toml 2>/dev/null || echo "does not exist"
```

Expected: `does not exist`

- [ ] **Step 2: Create nixpacks.toml**

```toml
# apps/ascend-backend/nixpacks.toml
[phases.setup]
nixPkgs = [
  "hadolint",
  "terraform",
]

[phases.build]
cmds = [
  "pip install ruff black radon pytest 2>/dev/null || pip3 install ruff black radon pytest",
  "mkdir -p /terraform-plugin-cache /tmp/tf-warmup",
  "printf 'terraform { required_providers { null = { source = \"hashicorp/null\" } random = { source = \"hashicorp/random\" } } }\\n' > /tmp/tf-warmup/main.tf",
  "TF_PLUGIN_CACHE_DIR=/terraform-plugin-cache terraform -chdir=/tmp/tf-warmup init -backend=false -no-color 2>/dev/null || true",
]
```

- [ ] **Step 3: Verify hadolint + terraform are available locally (optional — CI will validate)**

```bash
which hadolint 2>/dev/null && echo "hadolint found" || echo "hadolint not installed locally (ok — Railway will install)"
which terraform 2>/dev/null && echo "terraform found" || echo "terraform not installed locally (ok — Railway will install)"
```

- [ ] **Step 4: Commit**

```bash
git add apps/ascend-backend/nixpacks.toml
git commit -m "feat(playground): add nixpacks.toml with hadolint, terraform, ruff, black"
```

---

## Task 2: Add playgroundLimiter middleware

**Files:**
- Create: `apps/ascend-backend/src/middleware/playgroundLimiter.js`

- [ ] **Step 1: Read rateLimiter.js to understand the pattern**

```bash
cat apps/ascend-backend/src/middleware/rateLimiter.js
```

Note the import style and rateLimit constructor signature — mirror it exactly.

- [ ] **Step 2: Create playgroundLimiter.js**

```javascript
// apps/ascend-backend/src/middleware/playgroundLimiter.js
import rateLimit from 'express-rate-limit';

// 30 run/format/lint requests per minute per IP
export const playgroundLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many playground requests. Try again in a minute.' },
  keyGenerator: (req) => req.ip,
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/ascend-backend/src/middleware/playgroundLimiter.js
git commit -m "feat(playground): add playground rate limiters"
```

---

## Task 3: Create playground.js — /run for Python3 and Bash

**Files:**
- Create: `apps/ascend-backend/src/routes/playground.js`

- [ ] **Step 1: Write the Python3 + Bash section of playground.js**

```javascript
// apps/ascend-backend/src/routes/playground.js
import { Router } from 'express';
import { promisify } from 'util';
import { execFile, spawn } from 'child_process';
import { writeFile, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { query } from '../config/database.js';

const execFileAsync = promisify(execFile);
const router = Router();

const CODE_LIMIT = 50 * 1024; // 50KB
const EXEC_OPTS = { maxBuffer: 1024 * 1024 }; // 1MB

// Wrapper reads code.py from disk — avoids any string-escaping issues.
// Emits __VARS__:<json> to stderr so backend can parse variables separately.
const PYTHON_WRAPPER = `import json as _j, sys as _s, traceback as _t, io as _io

with open('code.py', 'r') as _f:
    _src = _f.read()

_cap = _io.StringIO()
_s.stdout = _cap
_loc = {}

try:
    exec(compile(_src, 'code.py', 'exec'), {}, _loc)
except Exception:
    _s.stdout = _s.__stdout__
    _s.stdout.write(_cap.getvalue())
    _s.stderr.write(_t.format_exc())
    _s.exit(1)

_s.stdout = _s.__stdout__
_s.stdout.write(_cap.getvalue())
_safe = {}
for _k, _v in _loc.items():
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

async function runPython(code) {
  return withTmpDir(async (dir) => {
    await writeFile(join(dir, 'code.py'), code, 'utf8');
    await writeFile(join(dir, 'main.py'), PYTHON_WRAPPER, 'utf8');
    const start = Date.now();
    try {
      const { stdout, stderr } = await execFileAsync(
        'python3', ['main.py'],
        { cwd: dir, timeout: 10000, ...EXEC_OPTS }
      );
      const { cleanStderr, variables } = parseVarsSentinel(stderr);
      return { stdout, stderr: cleanStderr, exitCode: 0, duration: Date.now() - start, variables };
    } catch (err) {
      const { cleanStderr, variables } = parseVarsSentinel(err.stderr);
      return {
        stdout: err.stdout || '',
        stderr: cleanStderr || err.message,
        exitCode: typeof err.code === 'number' ? err.code : 1,
        duration: Date.now() - start,
        variables,
      };
    }
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

export { router as playgroundRouter };
```

- [ ] **Step 2: Commit**

```bash
git add apps/ascend-backend/src/routes/playground.js
git commit -m "feat(playground): add Python3 and Bash execution runners"
```

---

## Task 4: Add Docker (hadolint) and Terraform runners to playground.js, wire /run endpoint

**Files:**
- Modify: `apps/ascend-backend/src/routes/playground.js`

- [ ] **Step 1: Add runDockerLint, runTerraform, and the POST /run handler after the existing exports line**

Replace the last line `export { router as playgroundRouter };` with:

```javascript
function spawnWithStdin(cmd, args, input, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.stdin.write(input, 'utf8');
    child.stdin.end();
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
    let result;
    switch (lang) {
      case 'python3': result = await runPython(code); break;
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

export { router as playgroundRouter };
```

- [ ] **Step 2: Commit**

```bash
git add apps/ascend-backend/src/routes/playground.js
git commit -m "feat(playground): add Docker lint + Terraform runner + POST /run endpoint"
```

---

## Task 5: Add /lint and /format endpoints to playground.js

**Files:**
- Modify: `apps/ascend-backend/src/routes/playground.js`

- [ ] **Step 1: Add /lint and /format before the export line**

Replace `export { router as playgroundRouter };` with:

```javascript
// POST /lint  — ruff, Python3 only
router.post('/lint', async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code || code.length > CODE_LIMIT) return res.json({ diagnostics: [] });

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

// POST /format  — black, Python3 only
router.post('/format', async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'code is required' });
    }

    const result = await spawnWithStdin('black', ['-', '--quiet'], code, 5000);

    if (result.exitCode === 0) {
      res.json({ code: result.stdout });
    } else {
      // black failed (syntax error) — return original unchanged
      res.json({ code, error: result.stderr });
    }
  } catch (err) {
    next(err);
  }
});

export { router as playgroundRouter };
```

- [ ] **Step 2: Commit**

```bash
git add apps/ascend-backend/src/routes/playground.js
git commit -m "feat(playground): add /lint (ruff) and /format (black) endpoints"
```

---

## Task 6: Add /share endpoints and DB migration to playground.js + index.js

**Files:**
- Modify: `apps/ascend-backend/src/routes/playground.js`
- Modify: `apps/ascend-backend/src/index.js`

- [ ] **Step 1: Add /share POST and GET before the export line in playground.js**

Replace `export { router as playgroundRouter };` with:

```javascript
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

// GET /share/:id  — load shared snippet (no auth required)
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
```

- [ ] **Step 2: Read index.js to find the runMigrations function**

```bash
grep -n "CREATE TABLE\|runMigrations\|IF NOT EXISTS" apps/ascend-backend/src/index.js | head -20
```

Note the line number of the last `CREATE TABLE IF NOT EXISTS` statement inside `runMigrations`.

- [ ] **Step 3: Add playground_snippets migration**

Find the last `await query(\`CREATE TABLE IF NOT EXISTS` block inside `runMigrations()` and add immediately after it:

```javascript
  await query(`
    CREATE TABLE IF NOT EXISTS playground_snippets (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      language   TEXT NOT NULL,
      code       TEXT NOT NULL,
      tests_code TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
```

- [ ] **Step 4: Commit**

```bash
git add apps/ascend-backend/src/routes/playground.js apps/ascend-backend/src/index.js
git commit -m "feat(playground): add /share endpoints and playground_snippets migration"
```

---

## Task 7: Mount playground routes in ascend-backend index.js

**Files:**
- Modify: `apps/ascend-backend/src/index.js`

- [ ] **Step 1: Add the import at the top of index.js (with other route imports)**

```javascript
import { playgroundRouter } from './routes/playground.js';
import { playgroundLimiter } from './middleware/playgroundLimiter.js';
```

- [ ] **Step 2: Mount the route (after the other /api/ mounts, before error handler)**

Find the block where routes like `/api/run` are mounted and add:

```javascript
// Playground — all routes require auth
app.use('/api/v1/playground', authenticate, playgroundLimiter, playgroundRouter);
```

- [ ] **Step 3: Start ascend-backend and verify**

```bash
cd apps/ascend-backend && node src/index.js &
sleep 2

# Smoke test /run
curl -s -X POST http://localhost:3009/api/v1/playground/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{"language":"python3","code":"print(1+1)"}' | jq .
# Expected: {"stdout":"2\n","stderr":"","exitCode":0,"duration":...,"variables":{}}

# Smoke test /lint
curl -s -X POST http://localhost:3009/api/v1/playground/lint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{"code":"x = 1\nprint(y)"}' | jq .
# Expected: {"diagnostics":[{"line":2,"col":7,"code":"F821","message":"Undefined name `y`"}]}

kill %1
```

- [ ] **Step 4: Commit**

```bash
git add apps/ascend-backend/src/index.js
git commit -m "feat(playground): mount playground routes on ascend-backend"
```

---

## Task 8: Add playground API methods to capra-api.ts

**Files:**
- Modify: `apps/camora/src/services/capra-api.ts`

- [ ] **Step 1: Read the first 60 lines of capra-api.ts**

```bash
head -60 apps/camora/src/services/capra-api.ts
```

Note the `fetchCapra` (or equivalent) function name and how other API objects are exported.

- [ ] **Step 2: Add types and playgroundAPI export at the bottom of capra-api.ts**

```typescript
// --- Playground ---

export interface PlaygroundRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  variables: Record<string, { type: string; repr: string }>;
}

export interface LintDiagnostic {
  line: number;
  col: number;
  endLine: number;
  endCol: number;
  code: string;
  message: string;
}

export type PlaygroundLanguage = 'python3' | 'bash' | 'docker' | 'terraform';

export const playgroundAPI = {
  run: (payload: {
    language: PlaygroundLanguage;
    code: string;
    testsCode?: string;
    profile?: boolean;
    memory?: boolean;
  }): Promise<PlaygroundRunResult> =>
    fetchCapra('/api/v1/playground/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  lint: (code: string): Promise<{ diagnostics: LintDiagnostic[] }> =>
    fetchCapra('/api/v1/playground/lint', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  format: (code: string): Promise<{ code: string; error?: string }> =>
    fetchCapra('/api/v1/playground/format', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  share: (payload: { language: PlaygroundLanguage; code: string; testsCode?: string }): Promise<{ id: string; url: string }> =>
    fetchCapra('/api/v1/playground/share', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getShare: (id: string): Promise<{ language: string; code: string; testsCode?: string }> =>
    fetchCapra(`/api/v1/playground/share/${id}`),
};
```

> **Note:** Replace `fetchCapra` with whatever the actual internal fetch helper is called in that file. It will be the same function used by other API objects in the same file.

- [ ] **Step 3: Commit**

```bash
git add apps/camora/src/services/capra-api.ts
git commit -m "feat(playground): add playgroundAPI client methods to capra-api.ts"
```

---

## Task 9: Add routes to App.tsx

**Files:**
- Modify: `apps/camora/src/App.tsx`

- [ ] **Step 1: Read the Lumora route block in App.tsx**

```bash
grep -n "lumora\|playground" apps/camora/src/App.tsx | head -30
```

- [ ] **Step 2: Add two new routes after the existing `/lumora/fix` route**

```typescript
{/* Playground — auth only, no paywall */}
<Route path="/lumora/playground" element={<ProtectedRoute><LumoraShellPage /></ProtectedRoute>} />
<Route path="/lumora/playground/s/:snippetId" element={<ProtectedRoute><LumoraShellPage /></ProtectedRoute>} />
```

> **Note:** Use `ProtectedRoute` only — NOT `PaidRoute`. The spec says playground is free for all logged-in users.

- [ ] **Step 3: Commit**

```bash
git add apps/camora/src/App.tsx
git commit -m "feat(playground): add /lumora/playground routes (free, auth-only)"
```

---

## Task 10: Add 'playground' to LumoraTab type and nav item

**Files:**
- Modify: `apps/camora/src/components/lumora/shell/LumoraIconRail.tsx`

- [ ] **Step 1: Read LumoraIconRail.tsx**

```bash
cat apps/camora/src/components/lumora/shell/LumoraIconRail.tsx
```

- [ ] **Step 2: Add 'playground' to the LumoraTab union type**

Find:
```typescript
export type LumoraTab = 'session' | 'coding' | 'design' | 'cofix' | ...
```

Add `'playground'` to the union:
```typescript
export type LumoraTab = 'session' | 'coding' | 'design' | 'cofix' | 'behavioral' | 'prepkit' | 'docs' | 'calendar' | 'sessions' | 'assistants' | 'profile' | 'credits' | 'playground';
```

- [ ] **Step 3: Add a Playground nav item to MAIN_ITEMS (or wherever Coding/Design/CoFix appear)**

If Coding/Design/CoFix are in the icon rail, add Playground immediately after CoFix:

```typescript
{
  id: 'playground',
  label: 'Playground',
  path: '/lumora/playground',
  icon: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
    </svg>
  ),
},
```

- [ ] **Step 4: Add active-state mapping for playground**

In the `isActive` function (or equivalent), add:
```typescript
if (id === 'playground') return activeTab === 'playground';
```

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/components/lumora/shell/LumoraIconRail.tsx
git commit -m "feat(playground): add Playground to Lumora nav rail"
```

---

## Task 11: Update LumoraShellPage to handle /playground

**Files:**
- Modify: `apps/camora/src/pages/lumora/LumoraShellPage.tsx`

- [ ] **Step 1: Read LumoraShellPage.tsx — understand how activeTab is computed and how content is rendered**

```bash
cat apps/camora/src/pages/lumora/LumoraShellPage.tsx
```

Note:
- Where `activeTab` is derived from `location.pathname`
- How each tab's content component is lazy-loaded
- Where the content area renders based on `activeTab`

- [ ] **Step 2: Add lazy import for PlaygroundLayout**

At the top where other lazy imports live:
```typescript
const PlaygroundLayout = lazy(() =>
  import('../../components/lumora/playground/PlaygroundLayout').then(m => ({ default: m.PlaygroundLayout }))
);
```

- [ ] **Step 3: Add playground to the activeTab detection**

In the `activeTab` ternary chain, add (before the final fallback):
```typescript
location.pathname.includes('/playground') ? 'playground' :
```

- [ ] **Step 4: Add playground to the content rendering area**

Wherever the other tabs render their content (e.g. `activeTab === 'cofix' && <CoFixLayout />`), add:
```typescript
{activeTab === 'playground' && <PlaygroundLayout />}
```

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/pages/lumora/LumoraShellPage.tsx
git commit -m "feat(playground): wire PlaygroundLayout into LumoraShellPage"
```

---

## Task 12: Create PlaygroundLayout.tsx

**Files:**
- Create: `apps/camora/src/components/lumora/playground/PlaygroundLayout.tsx`

- [ ] **Step 1: Create PlaygroundLayout.tsx**

```typescript
// apps/camora/src/components/lumora/playground/PlaygroundLayout.tsx
import { useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { LanguageTabs } from './LanguageTabs';
import { PlaygroundEditor } from './PlaygroundEditor';
import { OutputPane } from './OutputPane';
import { playgroundAPI, type PlaygroundLanguage, type PlaygroundRunResult } from '../../../services/capra-api';
import type * as Monaco from 'monaco-editor';

const LANGUAGES: PlaygroundLanguage[] = ['python3', 'bash', 'docker', 'terraform'];

const DEFAULT_CODE: Record<PlaygroundLanguage, string> = {
  python3: 'print("Hello, World!")\n',
  bash:    '#!/usr/bin/env bash\necho "Hello, World!"\n',
  docker:  'FROM ubuntu:22.04\nRUN apt-get update\nCMD ["bash"]\n',
  terraform: `resource "null_resource" "example" {
  triggers = {
    value = "hello"
  }
}
`,
};

interface TabState {
  code: string;
}

export function PlaygroundLayout() {
  const { snippetId } = useParams<{ snippetId?: string }>();

  const [activeTab, setActiveTab] = useState<PlaygroundLanguage>('python3');
  const [running, setRunning]     = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [result, setResult]       = useState<PlaygroundRunResult | null>(null);
  const [error, setError]         = useState<string | null>(null);

  // Per-tab editor content — useRef so switching tabs never resets code
  const tabState = useRef<Record<PlaygroundLanguage, TabState>>({
    python3:   { code: DEFAULT_CODE.python3 },
    bash:      { code: DEFAULT_CODE.bash },
    docker:    { code: DEFAULT_CODE.docker },
    terraform: { code: DEFAULT_CODE.terraform },
  });

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleCodeChange = useCallback((value: string) => {
    tabState.current[activeTab] = { code: value };
  }, [activeTab]);

  const handleRun = useCallback(async () => {
    const code = tabState.current[activeTab].code;
    setRunning(true);
    setError(null);
    try {
      const r = await playgroundAPI.run({ language: activeTab, code });
      setResult(r);
    } catch (err: any) {
      setError(err.message ?? 'Execution failed');
    } finally {
      setRunning(false);
    }
  }, [activeTab]);

  const handleFormat = useCallback(async () => {
    if (activeTab !== 'python3') return;
    const code = tabState.current.python3.code;
    setFormatting(true);
    try {
      const r = await playgroundAPI.format(code);
      tabState.current.python3 = { code: r.code };
      // Force Monaco to update by setting value on the model
      editorRef.current?.setValue(r.code);
    } catch {}
    finally { setFormatting(false); }
  }, [activeTab]);

  const handleClear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  // Keyboard shortcuts
  const handleEditorMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    editor.addCommand(
      // ⌘+Enter / Ctrl+Enter → Run
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => handleRun()
    );
    editor.addCommand(
      // ⌘+L / Ctrl+L → Clear
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL,
      () => handleClear()
    );
    editor.addCommand(
      // ⌘+D / Ctrl+D → Format
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD,
      () => handleFormat()
    );
  }, [handleRun, handleClear, handleFormat]);

  const currentCode = tabState.current[activeTab].code;

  return (
    <div className="flex flex-col h-full bg-[#111318] text-white">
      {/* Language tab bar */}
      <LanguageTabs active={activeTab} onChange={setActiveTab} />

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d1117] border-b border-[#1e293b]">
        <span className="text-[10px] text-[#334155] uppercase tracking-widest font-medium" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {activeTab === 'python3' ? 'main.py' : activeTab === 'bash' ? 'script.sh' : activeTab === 'docker' ? 'Dockerfile' : 'main.tf'}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#334155] hidden md:block" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            ⌘↵ Run · ⌘L Clear · ⌘D Format
          </span>
          {activeTab === 'python3' && (
            <button
              onClick={handleFormat}
              disabled={formatting}
              className="text-[11px] px-3 py-1 rounded-md border border-[#1e293b] text-[#64748b] hover:text-white hover:border-[#334155] transition-colors disabled:opacity-40"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {formatting ? 'Formatting…' : 'Format'}
            </button>
          )}
          <button
            onClick={handleClear}
            className="text-[11px] px-3 py-1 rounded-md border border-[#1e293b] text-[#64748b] hover:text-white hover:border-[#334155] transition-colors"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Clear
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="text-[11px] px-4 py-1.5 rounded-md font-semibold bg-[#10b981] text-white hover:bg-[#059669] transition-colors disabled:opacity-50"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            {running ? 'Running…' : '▶ Run'}
          </button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 border-r border-[#1e293b] overflow-hidden">
          <PlaygroundEditor
            key={activeTab}
            language={activeTab}
            defaultValue={currentCode}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
            activeTab={activeTab}
            editorRef={editorRef}
          />
        </div>
        <div className="flex-1 overflow-auto">
          <OutputPane result={result} error={error} language={activeTab} />
        </div>
      </div>
    </div>
  );
}
```

> **Note:** `monaco` (the global) is available because Monaco editor sets it globally. If it isn't imported, add `import * as monaco from 'monaco-editor';` at the top and check how CoFixLayout.tsx does it.

- [ ] **Step 2: Commit**

```bash
git add apps/camora/src/components/lumora/playground/PlaygroundLayout.tsx
git commit -m "feat(playground): create PlaygroundLayout with tab state and run/format/clear"
```

---

## Task 13: Create LanguageTabs.tsx

**Files:**
- Create: `apps/camora/src/components/lumora/playground/LanguageTabs.tsx`

- [ ] **Step 1: Create LanguageTabs.tsx**

```typescript
// apps/camora/src/components/lumora/playground/LanguageTabs.tsx
import type { PlaygroundLanguage } from '../../../services/capra-api';

const TABS: { id: PlaygroundLanguage; label: string; icon: string }[] = [
  { id: 'python3',   label: 'Python3',   icon: '🐍' },
  { id: 'bash',      label: 'Bash',      icon: '$' },
  { id: 'docker',    label: 'Docker',    icon: '🐳' },
  { id: 'terraform', label: 'Terraform', icon: '◈' },
];

interface Props {
  active: PlaygroundLanguage;
  onChange: (lang: PlaygroundLanguage) => void;
}

export function LanguageTabs({ active, onChange }: Props) {
  return (
    <div
      className="flex items-end gap-0 px-4 bg-[#0d1117] border-b border-[#1e293b]"
      role="tablist"
      aria-label="Language"
    >
      {TABS.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={[
            'px-4 py-2 mt-1 text-[11px] font-semibold rounded-t-md transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB]',
            active === tab.id
              ? 'bg-[#0047AB] text-white'
              : 'text-[#475569] hover:text-white',
          ].join(' ')}
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          <span className="mr-1.5">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/camora/src/components/lumora/playground/LanguageTabs.tsx
git commit -m "feat(playground): create LanguageTabs component"
```

---

## Task 14: Create PlaygroundEditor.tsx

**Files:**
- Create: `apps/camora/src/components/lumora/playground/PlaygroundEditor.tsx`

- [ ] **Step 1: Read CoFixLayout.tsx to see how Monaco is imported and used**

```bash
grep -n "monaco\|Monaco\|Editor\|import" apps/camora/src/components/lumora/cofix/CoFixLayout.tsx | head -30
```

Note the exact import path for Monaco editor and how `Editor` is instantiated.

- [ ] **Step 2: Create PlaygroundEditor.tsx (mirror CoFixLayout Monaco pattern)**

```typescript
// apps/camora/src/components/lumora/playground/PlaygroundEditor.tsx
import { useEffect, useRef, MutableRefObject } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import type { PlaygroundLanguage, LintDiagnostic } from '../../../services/capra-api';
import { playgroundAPI } from '../../../services/capra-api';

const MONACO_LANG: Record<PlaygroundLanguage, string> = {
  python3:   'python',
  bash:      'shell',
  docker:    'dockerfile',
  terraform: 'hcl',
};

interface Props {
  language:     PlaygroundLanguage;
  defaultValue: string;
  onChange:     (value: string) => void;
  onMount:      (editor: Monaco.editor.IStandaloneCodeEditor) => void;
  activeTab:    PlaygroundLanguage;
  editorRef:    MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
}

export function PlaygroundEditor({ language, defaultValue, onChange, onMount, activeTab, editorRef }: Props) {
  const monaco = useMonaco();
  const lintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string | undefined) {
    const v = value ?? '';
    onChange(v);

    // Debounced ruff lint — Python3 only
    if (language === 'python3' && monaco) {
      if (lintTimer.current) clearTimeout(lintTimer.current);
      lintTimer.current = setTimeout(() => runLint(v), 500);
    }
  }

  async function runLint(code: string) {
    if (!monaco || !editorRef.current) return;
    try {
      const { diagnostics } = await playgroundAPI.lint(code);
      const model = editorRef.current.getModel();
      if (!model) return;
      monaco.editor.setModelMarkers(
        model,
        'ruff',
        diagnostics.map((d: LintDiagnostic) => ({
          startLineNumber: d.line,
          startColumn:     d.col,
          endLineNumber:   d.endLine,
          endColumn:       d.endCol,
          message:         `[${d.code}] ${d.message}`,
          severity:        monaco.MarkerSeverity.Warning,
        }))
      );
    } catch {
      // lint is best-effort — swallow errors silently
    }
  }

  // Clear lint markers when switching languages
  useEffect(() => {
    if (!monaco || !editorRef.current) return;
    const model = editorRef.current.getModel();
    if (model) monaco.editor.setModelMarkers(model, 'ruff', []);
  }, [language, monaco]);

  return (
    <Editor
      height="100%"
      language={MONACO_LANG[language]}
      defaultValue={defaultValue}
      onChange={handleChange}
      onMount={onMount}
      theme="vs-dark"
      options={{
        fontSize: 13,
        fontFamily: '"IBM Plex Mono", "Fira Code", monospace',
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 12, bottom: 12 },
        lineNumbers: 'on',
        renderLineHighlight: 'line',
        tabSize: 4,
        insertSpaces: true,
        wordWrap: 'on',
        automaticLayout: true,
      }}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/camora/src/components/lumora/playground/PlaygroundEditor.tsx
git commit -m "feat(playground): create PlaygroundEditor with Monaco + ruff debounce lint"
```

---

## Task 15: Create ErrorDecoder.ts

**Files:**
- Create: `apps/camora/src/components/lumora/playground/ErrorDecoder.ts`

- [ ] **Step 1: Create ErrorDecoder.ts**

```typescript
// apps/camora/src/components/lumora/playground/ErrorDecoder.ts

interface ErrorRule {
  pattern: RegExp;
  explain: (m: RegExpMatchArray) => string;
}

const RULES: ErrorRule[] = [
  {
    pattern: /NameError: name '(.+?)' is not defined/,
    explain: m => `'${m[1]}' has not been assigned yet. Check for a typo or make sure you defined it before using it.`,
  },
  {
    pattern: /TypeError: unsupported operand type\(s\) for (.+?): '(.+?)' and '(.+?)'/,
    explain: m => `You tried to use '${m[1]}' on a ${m[2]} and a ${m[3]}. Convert one of them to the same type first (e.g. int(), str(), float()).`,
  },
  {
    pattern: /TypeError: '(.+?)' object is not subscriptable/,
    explain: m => `${m[1]} doesn't support indexing with []. You may be trying to index a number or None instead of a list/dict.`,
  },
  {
    pattern: /TypeError: '(.+?)' object is not iterable/,
    explain: m => `You're trying to loop over a ${m[1]}, which isn't iterable. Use a list, tuple, or generator instead.`,
  },
  {
    pattern: /TypeError: (.+?) takes (\d+) positional argument.? but (\d+) .+? given/,
    explain: m => `${m[1]} expects ${m[2]} argument(s) but got ${m[3]}. Check the number of arguments in your function call.`,
  },
  {
    pattern: /IndexError: list index out of range/,
    explain: () => `You're accessing an index that doesn't exist. Remember lists are 0-indexed — if your list has N items, valid indices are 0 to N-1.`,
  },
  {
    pattern: /KeyError: (.+)/,
    explain: m => `Key ${m[1]} doesn't exist in the dictionary. Use .get(key) to return None instead of raising an error, or check with 'if key in d' first.`,
  },
  {
    pattern: /AttributeError: '(.+?)' object has no attribute '(.+?)'/,
    explain: m => `${m[1]} objects don't have a '${m[2]}' attribute. Check the spelling or look up what methods ${m[1]} actually has.`,
  },
  {
    pattern: /ZeroDivisionError/,
    explain: () => `Division by zero. Add a guard: 'if divisor != 0' before dividing.`,
  },
  {
    pattern: /RecursionError: maximum recursion depth exceeded/,
    explain: () => `Your function calls itself too many times without a base case. Make sure your recursive function has a condition that stops the recursion.`,
  },
  {
    pattern: /IndentationError: (.+)/,
    explain: m => `Python cares about indentation — ${m[1]}. Use 4 spaces per indent level and never mix tabs and spaces.`,
  },
  {
    pattern: /SyntaxError: (.+)/,
    explain: m => `Python can't parse your code — ${m[1]}. Look for a missing colon, parenthesis, or quote near the line shown.`,
  },
  {
    pattern: /ImportError: cannot import name '(.+?)' from '(.+?)'/,
    explain: m => `'${m[1]}' doesn't exist in '${m[2]}'. Check the spelling and the library's documentation.`,
  },
  {
    pattern: /ModuleNotFoundError: No module named '(.+?)'/,
    explain: m => `The '${m[1]}' module is not installed in this environment. You can only import the Python standard library here.`,
  },
  {
    pattern: /ValueError: (.+)/,
    explain: m => `${m[1]}. You passed a value that the function can't handle — check the input you're providing.`,
  },
  {
    pattern: /FileNotFoundError: .+? '(.+?)'/,
    explain: m => `File '${m[1]}' doesn't exist at that path. The playground runs in a temporary directory — only files you write in your script are accessible.`,
  },
  {
    pattern: /StopIteration/,
    explain: () => `next() was called on an exhausted iterator. You've consumed all items — create a new iterator or use a for loop.`,
  },
  {
    pattern: /OverflowError/,
    explain: () => `A calculation produced a number too large for Python to represent. Consider using integer math or checking for unbounded growth in your algorithm.`,
  },
  {
    pattern: /MemoryError/,
    explain: () => `Your code ran out of memory. You may be creating a very large list or infinite structure. Add size limits to your collections.`,
  },
  {
    pattern: /TimeoutError|signal\.alarm/,
    explain: () => `Execution timed out (10s limit). Your code may have an infinite loop or a very slow algorithm. Check your loop conditions.`,
  },
];

/**
 * Given Python stderr output, returns a plain-English explanation of the first
 * recognised exception, or null if none matched.
 */
export function decodeError(stderr: string): string | null {
  for (const rule of RULES) {
    const m = stderr.match(rule.pattern);
    if (m) return rule.explain(m);
  }
  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/camora/src/components/lumora/playground/ErrorDecoder.ts
git commit -m "feat(playground): add ErrorDecoder with 20 Python traceback rules"
```

---

## Task 16: Create OutputPane.tsx

**Files:**
- Create: `apps/camora/src/components/lumora/playground/OutputPane.tsx`

- [ ] **Step 1: Create OutputPane.tsx**

```typescript
// apps/camora/src/components/lumora/playground/OutputPane.tsx
import { decodeError } from './ErrorDecoder';
import type { PlaygroundRunResult, PlaygroundLanguage } from '../../../services/capra-api';

interface Props {
  result:   PlaygroundRunResult | null;
  error:    string | null;
  language: PlaygroundLanguage;
}

export function OutputPane({ result, error, language }: Props) {
  const label = (s: string) => (
    <span
      className="text-[9px] uppercase tracking-widest text-[#334155] font-medium"
      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
    >
      {s}
    </span>
  );

  if (!result && !error) {
    return (
      <div className="flex items-center justify-center h-full text-[#334155] text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        Press ▶ Run to execute
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 h-full bg-[#0a0d12]">
        {label('Error')}
        <pre className="mt-2 text-[#f87171] text-[11px] font-mono whitespace-pre-wrap break-words">{error}</pre>
      </div>
    );
  }

  const { stdout, stderr, exitCode, duration } = result!;
  const decoded = language === 'python3' && stderr ? decodeError(stderr) : null;

  return (
    <div className="flex flex-col h-full bg-[#0a0d12]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e293b]">
        {label('Output')}
        <span
          className={`text-[9px] font-semibold ${exitCode === 0 ? 'text-[#10b981]' : 'text-[#f87171]'}`}
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          exit {exitCode} · {duration}ms
        </span>
      </div>

      {/* Stdout */}
      {stdout && (
        <div className="px-4 py-3 border-b border-[#1e293b]">
          {label('stdout')}
          <pre className="mt-1 text-[#10b981] text-[11px] font-mono whitespace-pre-wrap break-words leading-relaxed">
            {stdout}
          </pre>
        </div>
      )}

      {/* Stderr */}
      {stderr && (
        <div className="px-4 py-3 border-b border-[#1e293b]">
          {label('stderr')}
          <pre className="mt-1 text-[#f87171] text-[11px] font-mono whitespace-pre-wrap break-words leading-relaxed">
            {stderr}
          </pre>
        </div>
      )}

      {/* Error Decoder — Python3 only */}
      {decoded && (
        <div className="mx-4 my-3 p-3 rounded-md bg-[#1c1008] border border-[#44230a]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] uppercase tracking-widest text-[#b45309] font-semibold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              What went wrong
            </span>
          </div>
          <p className="text-[#fbbf24] text-[12px] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {decoded}
          </p>
        </div>
      )}

      {/* Empty stdout but successful */}
      {!stdout && !stderr && exitCode === 0 && (
        <div className="px-4 py-3 text-[#334155] text-[11px] italic" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          (no output)
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/camora/src/components/lumora/playground/OutputPane.tsx
git commit -m "feat(playground): create OutputPane with stdout/stderr/error-decoder display"
```

---

## Task 17: Build the frontend and verify

- [ ] **Step 1: Run Vite build to catch TypeScript errors**

```bash
cd apps/camora && npx vite build 2>&1 | tail -30
```

Expected: build succeeds with no TypeScript errors. Fix any type errors before proceeding.

- [ ] **Step 2: Start dev server and open playground**

```bash
# Terminal 1
pnpm dev:ascend

# Terminal 2
pnpm dev:camora
```

Open `http://localhost:3000/lumora/playground` (log in first).

- [ ] **Step 3: Manual smoke tests**

**Python3:**
- Type `print("hello")` → click Run → stdout shows `hello`
- Type `x = ` (syntax error) → ruff squiggle appears within 500ms

**Bash:**
- Switch to Bash tab → type `echo $((2 + 2))` → Run → stdout `4`

**Docker:**
- Switch to Docker tab → type `FROM scratch\nINVALID_DIRECTIVE foo` → Run → hadolint error in stdout

**Terraform:**
- Switch to Terraform tab → Run default code → see `terraform init`, `validate`, `plan` output

**Format:**
- Switch to Python3 → type `x=1+1` → click Format → editor updates to `x = 1 + 1`

**Error decoder:**
- Type `print(undefined_var)` → Run → "What went wrong" block appears explaining NameError

- [ ] **Step 4: Commit final wiring**

```bash
git add -A
git commit -m "feat(playground): complete Plan 1 — core playground with Tier 1 learning features"
```

---

## Task 18: Push and deploy

- [ ] **Step 1: Pull, push**

```bash
git pull --rebase && git push
```

- [ ] **Step 2: Deploy frontend**

```bash
vercel --prod
```

- [ ] **Step 3: Trigger Railway redeploy for ascend-backend**

Go to Railway → ascend-backend service → Deploy → confirm new Nixpacks build picks up hadolint + terraform.

- [ ] **Step 4: Verify production**

```bash
# Test /run endpoint in production
curl -s -X POST https://ascendb.cariara.com/api/v1/playground/run \
  -H "Content-Type: application/json" \
  -H "Cookie: cariara_sso=<your_prod_cookie>" \
  -d '{"language":"python3","code":"print(42)"}' | jq .
# Expected: {"stdout":"42\n","stderr":"","exitCode":0,...}
```

---

*Plan 2 (Advanced Python Learning — Tiers 2–4) covers: variable inspector, cProfile/tracemalloc toggles, run history, pytest test panel, radon complexity badge, snippets library, Big-O visualiser, REPL mode, share snippet UI, and diff view.*
