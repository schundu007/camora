# DevOps Playground — Design Spec

**Date:** 2026-05-22  
**Status:** Approved for implementation  
**Scope:** New `/lumora/playground` page with Python3, Bash, Docker, Terraform execution + advanced Python learning features

---

## 1. Overview

A standalone code playground added as a new top-level tab in the Lumora shell (alongside Interview, Coding, Design, CoFix). Users type code in the left pane and see real execution output in the right pane. **No AI involvement** — all output comes from real tool backends.

Audience: all logged-in Camora users (not owner-only).

---

## 2. Route & Navigation

- **Route:** `/lumora/playground`
- **Lumora shell tab:** `Playground` — added after `CoFix` in `LumoraShellPage.tsx`
- **Auth:** `ProtectedRoute` (must be logged in)
- **Paywall:** none — free tier can access (consistent with Capra content model)

---

## 3. Language Support & Execution Semantics

| Tab | Backend tool | Timeout | What it does |
|-----|-------------|---------|--------------|
| Python3 | `python3 <tmpfile>` via `execFile` | 10s | Runs script, captures stdout/stderr/locals |
| Bash | `bash <tmpfile>` via `execFile` | 10s | Runs shell script, captures stdout/stderr |
| Docker | `hadolint -` (stdin pipe) | 5s | Lints Dockerfile, returns warnings/errors |
| Terraform | `terraform init -backend=false && terraform validate && terraform plan -no-color` in isolated temp dir | 60s | Validates + plans HCL against null provider |

**Python execution wrapper:** Backend wraps user code to capture `locals()` at end of script. Stdout goes to the user; variable snapshot is emitted as a JSON line to stderr under the sentinel `__VARS__:`. The backend strips this before returning stderr to the client and surfaces it separately as the variable inspector payload.

**Terraform null provider:** The null/random provider is pre-downloaded into a plugin cache dir during ascend-backend startup (or baked into the Nixpacks image) so `terraform init` completes without network access at run time.

---

## 4. Frontend Architecture

### New files

```
apps/camora/src/pages/lumora/PlaygroundPage.tsx
apps/camora/src/components/lumora/playground/
  PlaygroundLayout.tsx       — root layout, tab state, split pane
  LanguageTabs.tsx           — tab bar (Python3 / Bash / Docker / Terraform)
  PlaygroundEditor.tsx       — Monaco wrapper, per-language syntax + linting
  OutputPane.tsx             — stdout (green) / stderr (red) / exit code / duration
  VariableInspector.tsx      — variables table strip below output (Python3 only)
  TestPanel.tsx              — collapsible second Monaco + pytest results (Python3 only)
  SnippetsPanel.tsx          — slide-out panel with 60+ categorised Python snippets
  RunHistory.tsx             — drawer, last 20 runs from localStorage
  BigOVisualiser.tsx         — sparkline + O() classification (Python3 only)
  DiffView.tsx               — side-by-side code + output diff for any 2 history entries
  ErrorDecoder.ts            — rule-based traceback parser (no network, no AI)
  snippets/
    data-structures.json
    oop.json
    decorators.json
    generators.json
    context-managers.json
    async.json
    type-hints.json
    functools-itertools.json
```

### Tab state

Each language tab independently owns its editor content, output, variable snapshot, test code, and run history. State lives in a `useRef` map keyed by language slug so switching tabs does not reset work. History is persisted to `localStorage` under `playground_history_<lang>`.

### Monaco configuration per language

| Tab | Monaco language | Extra |
|-----|----------------|-------|
| Python3 | `python` | Pyright-lite IntelliSense built into Monaco |
| Bash | `shell` | — |
| Docker | `dockerfile` | — |
| Terraform | `hcl` | — |

### Toolbar (Python3 tab)

Left side: filename chip (`main.py`), `Profile` toggle pill, `Memory` toggle pill, `Benchmark` pill  
Right side: shortcut hint `⌘↵ Run · ⌘L Clear · ⌘D Format`, `Format` button, `Snippets` button, `▶ Run` button (emerald `#10b981`)

### Design tokens (Camora system)

- Page background: charcoal `#111318`
- Panel background: `#0d1117`
- Output background: `#0a0d12`
- Active language tab: navy `#0047AB` fill, white text
- Run button: emerald `#10b981`
- Stdout text: `#10b981`
- Stderr text: `#f87171`
- Border: `#1e293b`
- Display font: Plus Jakarta Sans
- Code font: IBM Plex Mono

---

## 5. Advanced Learning Features (Python3 + partial Bash)

### Tier 1 — Foundation

**Ruff lint as-you-type**  
Frontend debounces editor changes 500ms, POSTs code to `POST /api/v1/playground/lint`. Backend runs `ruff check --output-format=json -`. Response is an array of `{line, col, code, message}` objects. Monaco `editor.setModelMarkers()` renders inline squiggles. Applies to Python3 tab only.

**Error decoder**  
`ErrorDecoder.ts` is a pure client-side rule table (~50 entries) mapping Python exception class names and common message patterns to plain-English explanations. When a run returns a non-zero exit code containing a Python traceback, the OutputPane appends a collapsible "What went wrong" block below stderr. No network call, no AI.

**Auto-format via Black**  
`Format` button POSTs code to `POST /api/v1/playground/format`. Backend runs `black - --quiet` (stdin→stdout). Response `{code: string}` replaces editor content. Applies to Python3 tab only.

**Keyboard shortcuts**  
`⌘+Enter` / `Ctrl+Enter` — Run  
`⌘+L` / `Ctrl+L` — Clear output  
`⌘+D` / `Ctrl+D` — Format  
Displayed in a persistent muted chip in the toolbar. Wired via Monaco `addCommand`.

---

### Tier 2 — Program Insight

**Variable Inspector**  
After each Python3 run, backend returns `variables: Record<string, {type: string, repr: string}>` extracted from the `__VARS__:` sentinel. `VariableInspector.tsx` renders a horizontal chip strip below the output pane: `name · type · repr`. Collapsed by default if >10 variables; expand button shows full table. Only shown on successful exit (code 0).

**Execution Profiler**  
When the `Profile` toggle is active, backend wraps code with `cProfile.run(..., sort='cumtime')` and captures its text output. Returns `profilerOutput: string` alongside normal stdout. OutputPane renders a collapsible "Profile" section showing the top-10 function rows as a fixed-width table.

**Memory Tracker**  
When the `Memory` toggle is active, backend wraps code with `tracemalloc.start()` / `tracemalloc.take_snapshot()`. Returns `{peakKB: number, top: [{file, line, sizeKB}]}`. OutputPane renders a collapsible "Memory" section showing peak + top-5 allocation sites.

**Run History**  
Every successful or failed run appends to `localStorage` (`playground_history_python3`, etc.). Entry shape: `{id, timestamp, code, testsCode, stdout, stderr, exitCode, duration, variables}`. Max 20 entries per language (oldest evicted). `RunHistory.tsx` is a slide-out drawer triggered by a history icon. Clicking any entry restores editor + output to that run's state. "Compare" checkbox on two entries opens `DiffView.tsx`.

---

### Tier 3 — Test-Driven Mindset

**Test Panel**  
Collapsible panel below the main editor (collapsed by default, shows a `Tests ▸` header with pass/fail badge). Expands to a second Monaco editor (Python, `test_main.py`). On Run, backend receives both `code` and `testsCode`. Backend writes both to the temp dir and runs `pytest test_main.py -v --tb=short --no-header -q`. Response includes `pytestOutput: string` and `pytestSummary: {passed, failed, errors}`. Results render in the test panel with green ✓ / red ✗ per test function.

**McCabe Complexity Badge**  
After each Python3 run, backend also runs `radon cc -s -a -` on the code (stdin). Returns `{grade: 'A'|'B'|...|'F', average: number, functions: [{name, complexity, grade}]}`. A badge is displayed in the output footer: grade letter + average score. Clicking expands a per-function breakdown table.

**Snippets Library**  
`SnippetsPanel.tsx` is a fixed-width right drawer triggered by the `Snippets` toolbar button. Snippets are loaded from static JSON files bundled with the frontend. Categories: Data Structures, OOP & Dataclasses, Decorators, Generators & Iterators, Context Managers, Async/Await, Type Hints & Protocols, Functools & Itertools, File I/O, Error Handling. Each snippet has: `title`, `description`, `code`. Clicking a snippet inserts it at the current Monaco cursor position.

---

### Tier 4 — Pro Tooling

**Big-O Visualiser**  
`Benchmark` pill in toolbar opens a config popover: user selects their function name + input parameter (default `n`). Backend runs the function 5× with `n = [10, 100, 1_000, 10_000, 100_000]`, recording wall time each run (via `time.perf_counter`). Returns `{sizes: number[], times: number[]}`. `BigOVisualiser.tsx` renders a simple SVG sparkline + fits the curve to classify as O(1) / O(log n) / O(n) / O(n log n) / O(n²) / O(2ⁿ) using log-log slope estimation.

**Share Snippet**  
`Share` button (icon in toolbar) POSTs to `POST /api/v1/playground/share` with `{language, code, testsCode?}`. Backend saves to `playground_snippets` table, returns `{id, url: '/playground/s/:id'}`. PlaygroundPage handles the `/lumora/playground/s/:id` route — on load it fetches `GET /api/v1/playground/share/:id` and pre-fills the editor. Share URL is copied to clipboard automatically.

**REPL Mode**  
Toggle button `Script | REPL` in the language tab bar (Python3 only). In REPL mode, the editor shrinks to a single-line input. Pressing Enter sends the expression/statement to `POST /api/v1/playground/repl`. Backend maintains a per-user Python process (keyed by `userId`) using a persistent child process with a simple prompt protocol. State accumulates across submissions. Process is killed after 10 minutes of inactivity. Output appends below the input in a scrollable terminal-style pane.

**Diff View**  
Activated from Run History: check two entries → "Compare" button appears. `DiffView.tsx` uses Monaco's `createDiffEditor()` to show a side-by-side code diff. Below, a simple text diff of the two stdout outputs is rendered (added lines green, removed lines red). Closes back to normal view on dismiss.

---

## 6. Backend Architecture (ascend-backend)

### New route file

`apps/ascend-backend/src/routes/playground.js`

Mounted in `src/index.js` as:
```js
app.use('/api/v1/playground', jwtAuth, playgroundLimiter, playgroundRoutes);
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/run` | Execute code (all 4 languages); `profile` + `memory` flags enable wrappers |
| `POST` | `/lint` | Ruff lint (Python3 only) |
| `POST` | `/format` | Black format (Python3 only) |
| `POST` | `/benchmark` | Big-O 5× run (Python3 only) |
| `POST` | `/repl` | REPL line execution (Python3 only) |
| `POST` | `/share` | Save snippet to DB |
| `GET` | `/share/:id` | Load shared snippet |

### Request / Response shapes

**POST /run**
```json
// request
{
  "language": "python3|bash|docker|terraform",
  "code": "string",
  "testsCode": "string?",
  "profile": false,
  "memory": false
}

// response
{
  "stdout": "string",
  "stderr": "string",
  "exitCode": 0,
  "duration": 312,
  "variables": { "result": { "type": "list", "repr": "[0,1,1,2,3]" } },
  "complexity": { "grade": "A", "average": 2.0, "functions": [] },
  "pytestSummary": { "passed": 3, "failed": 0, "errors": 0 },
  "pytestOutput": "string",
  "profilerOutput": "string?",
  "memoryPeakKB": 1200,
  "memoryTop": [{ "file": "main.py", "line": 4, "sizeKB": 640 }]
}
```

**POST /lint**
```json
// response
{ "diagnostics": [{ "line": 3, "col": 5, "code": "F821", "message": "Undefined name 'x'" }] }
```

### Security

- `jwtAuth` middleware on all routes (authenticated users only)
- `playgroundLimiter`: 30 requests/minute per IP (new limiter using `express-rate-limit`)
- Code size limit: 50 KB (rejected with 413 before execution)
- Execution via `child_process.execFile` (not `exec`) — no shell injection
- All temp files written to unique UUID dirs under `/tmp/playground-<uuid>/`, cleaned in `finally`
- Terraform runs in isolated temp dirs; provider plugin cache dir is read-only mounted
- REPL processes killed after 10 minutes idle (via `setTimeout` + process tracking map)
- No outbound network from executed Python/Bash code (enforced by Railway's network policy; not enforced at OS level)

### Rate limiting tiers

| Action | Limit |
|--------|-------|
| Run / Profile / Memory / Benchmark | 30/min per IP |
| Lint / Format | 60/min per IP (lightweight) |
| Share | 10/min per IP |

---

## 7. Database

### New table: `playground_snippets`

```sql
CREATE TABLE IF NOT EXISTS playground_snippets (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     INTEGER REFERENCES users(id),
  language    TEXT NOT NULL,
  code        TEXT NOT NULL,
  tests_code  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Added to ascend-backend's inline migration block in `src/index.js`.

---

## 8. Nixpacks Changes (ascend-backend)

Add to `nixpacks.toml` `[phases.setup]` packages:

```toml
[phases.setup]
nixPkgs = [
  # existing...
  "hadolint",
  "terraform",
]
```

Add to `[phases.install]` pip installs:

```toml
[phases.install]
cmds = [
  # existing...
  "pip install ruff black radon pytest",
]
```

Add a startup script to pre-cache the Terraform null provider:

```toml
[phases.build]
cmds = [
  "mkdir -p /terraform-plugin-cache && TF_PLUGIN_CACHE_DIR=/terraform-plugin-cache terraform -chdir=/tmp/tf-warmup init 2>/dev/null || true"
]
```

---

## 9. Data Flow (end-to-end, Python3 run)

```
User types code → Monaco editor
  → (500ms debounce) → POST /api/v1/playground/lint → ruff → inline squiggles

User clicks Run (⌘+Enter)
  → POST /api/v1/playground/run {language:"python3", code, testsCode?}
  → ascend-backend:
      1. Write wrapper + user code to /tmp/playground-<uuid>/main.py
      2. Write test file to /tmp/playground-<uuid>/test_main.py (if testsCode present)
      3. execFile('python3', ['main.py'], {cwd, timeout:10000})
      4. Parse __VARS__ sentinel from stderr
      5. Run radon cc -s -a - < code (sync, fast)
      6. If testsCode: execFile('pytest', ['test_main.py', '-v', '--tb=short'])
      7. rm -rf /tmp/playground-<uuid>/
      8. Return combined response JSON
  → Frontend:
      OutputPane renders stdout/stderr
      VariableInspector renders variables
      Complexity badge renders grade
      TestPanel renders pytest results
```

---

## 10. Out of Scope

- Docker image building (option A) — deferred; Dockerfile lint is sufficient for now
- Terraform plan against real cloud providers — requires credentials, out of scope
- Multi-file projects — single-file execution only
- Collaborative/shared editing (multiplayer)
- Jupyter notebook mode
- Language server protocol (LSP) for Bash/Terraform — Monaco built-in only
