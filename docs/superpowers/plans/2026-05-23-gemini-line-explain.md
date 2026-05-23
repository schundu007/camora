# Gemini Line Explanation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Explain" toggle chip to both the Playground and CoFix toolbars; when enabled, hovering any line of code shows a Gemini-powered 1-2 sentence explanation in a Monaco tooltip.

**Architecture:** Monaco `registerHoverProvider` (per language, global to the Monaco instance) calls `POST /api/v1/playground/explain` on the ascend-backend, which proxies to Gemini Flash and caches results in a 500-entry in-memory Map. The Gemini API key lives only in the backend env (`GEMINI_API_KEY`), never in the browser.

**Tech Stack:** Monaco Editor, React 19, TypeScript, Express 5, Gemini `gemini-2.0-flash` REST API

---

### Task 1: Add Gemini explain route to ascend-backend

**Files:**
- Modify: `apps/ascend-backend/src/routes/playground.js`

- [ ] **Step 1: Add `createHash` to the existing crypto import**

Find at top of file:

```js
import { randomUUID } from 'crypto';
```

Replace with:

```js
import { randomUUID, createHash } from 'crypto';
```

- [ ] **Step 2: Add the cache Map and Gemini helper after the `EXEC_OPTS` constant**

After the line `const EXEC_OPTS = { maxBuffer: 1024 * 1024 };`, add:

```js
const EXPLAIN_CACHE = new Map();
const EXPLAIN_CACHE_MAX = 500;

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
        generationConfig: { maxOutputTokens: 150, temperature: 0.1 },
      }),
    }
  );
  if (!resp.ok) throw new Error(`Gemini ${resp.status}`);
  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}
```

- [ ] **Step 3: Add the `/explain` route before the existing `router.post('/run', ...)`**

```js
// POST /explain  — Gemini line explanation
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
    const lineContent = code.split('\n')[lineNumber - 1] ?? '';
    if (!lineContent.trim()) return res.json({ explanation: '' });

    const cacheKey = createHash('sha256')
      .update(`${code}:${lineNumber}:${language}`)
      .digest('hex');

    if (EXPLAIN_CACHE.has(cacheKey)) {
      return res.json({ explanation: EXPLAIN_CACHE.get(cacheKey) });
    }

    const prompt = `Explain what line ${lineNumber} does in this ${language} code in 1-2 concise sentences. Focus on the purpose, not just restating the syntax.\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\`\n\nLine ${lineNumber}: ${lineContent}`;
    const explanation = await callGemini(prompt);

    if (EXPLAIN_CACHE.size >= EXPLAIN_CACHE_MAX) {
      EXPLAIN_CACHE.delete(EXPLAIN_CACHE.keys().next().value);
    }
    EXPLAIN_CACHE.set(cacheKey, explanation);

    res.json({ explanation });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 4: Commit**

```bash
cd /Users/chundu/camora
git pull
git add apps/ascend-backend/src/routes/playground.js
git commit -m "feat(playground): add Gemini line explain route with in-memory cache"
```

---

### Task 2: Add `explain()` to capra-api.ts

**Files:**
- Modify: `apps/camora/src/lib/capra-api.ts`

- [ ] **Step 1: Add the `explain` function to `playgroundAPI`**

Find the last entry in `playgroundAPI` (the `getShare` function). After `getShare`, before the closing `};`, add:

```ts
  explain: (
    code: string,
    line: number,
    language: string,
    token?: string
  ): Promise<{ explanation: string }> =>
    fetchCapra('/api/v1/playground/explain', {
      method: 'POST',
      body: JSON.stringify({ code, line, language }),
    }, token),
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/chundu/camora/apps/camora && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/chundu/camora
git add apps/camora/src/lib/capra-api.ts
git commit -m "feat(playground): add explain() to playgroundAPI"
```

---

### Task 3: Update PlaygroundEditor — explainMode prop + hover provider

**Files:**
- Modify: `apps/camora/src/components/lumora/playground/PlaygroundEditor.tsx`

- [ ] **Step 1: Add `explainMode` to the Props interface**

Find:

```ts
interface Props {
  language:     PlaygroundLanguage;
  defaultValue: string;
  onChange:     (value: string) => void;
  onMount:      (editor: Monaco.editor.IStandaloneCodeEditor) => void;
}
```

Replace with:

```ts
interface Props {
  language:     PlaygroundLanguage;
  defaultValue: string;
  onChange:     (value: string) => void;
  onMount:      (editor: Monaco.editor.IStandaloneCodeEditor) => void;
  explainMode:  boolean;
}
```

- [ ] **Step 2: Destructure `explainMode` in the function signature**

Find:

```ts
export function PlaygroundEditor({ language, defaultValue, onChange, onMount }: Props) {
```

Replace with:

```ts
export function PlaygroundEditor({ language, defaultValue, onChange, onMount, explainMode }: Props) {
```

- [ ] **Step 3: Add `hoverDisposable` ref and hover provider `useEffect`**

After the `lintTimer` ref declaration:

```ts
const lintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
```

Add:

```ts
const hoverDisposable = useRef<Monaco.IDisposable | null>(null);
```

After the existing `useEffect` that clears markers on language change, add:

```ts
useEffect(() => {
  hoverDisposable.current?.dispose();
  hoverDisposable.current = null;
  if (!monaco || !explainMode) return;

  const monacoLang = MONACO_LANG[language];
  hoverDisposable.current = monaco.languages.registerHoverProvider(monacoLang, {
    provideHover: async (model, position) => {
      const lineContent = model.getLineContent(position.lineNumber).trim();
      if (!lineContent) return null;
      try {
        const result = await playgroundAPI.explain(
          model.getValue(),
          position.lineNumber,
          language
        );
        if (!result.explanation) return null;
        return {
          contents: [
            { value: `**Line ${position.lineNumber}** — *Gemini*` },
            { value: result.explanation },
          ],
        };
      } catch {
        return null;
      }
    },
  });

  return () => { hoverDisposable.current?.dispose(); };
}, [monaco, language, explainMode]);
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/chundu/camora/apps/camora && npx tsc --noEmit 2>&1 | head -20
```

Expected: TypeScript will flag `PlaygroundLayout.tsx` for missing `explainMode` prop — fixed in Task 4.

- [ ] **Step 5: Commit**

```bash
cd /Users/chundu/camora
git add apps/camora/src/components/lumora/playground/PlaygroundEditor.tsx
git commit -m "feat(playground): add explainMode prop + Gemini hover provider"
```

---

### Task 4: Add Explain chip to PlaygroundLayout

**Files:**
- Modify: `apps/camora/src/components/lumora/playground/PlaygroundLayout.tsx`

- [ ] **Step 1: Add `explainMode` state**

After the `const [formatting, setFormatting] = useState(false);` line, add:

```ts
const [explainMode, setExplainMode]   = useState(false);
```

- [ ] **Step 2: Add the Explain chip to the toolbar center group**

Find the center group div that contains the Format and Clear buttons. Add the Explain chip before the Clear button:

```tsx
          <button
            onClick={() => setExplainMode(v => !v)}
            className="text-[11px] font-semibold px-3 py-1 rounded-md transition-opacity hover:opacity-90"
            style={explainMode ? {
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 100%)',
              border: '1px solid var(--cam-gold-leaf)',
              color: '#0a0e1a',
            } : {
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              background: 'linear-gradient(135deg, rgba(0,47,120,0.35) 0%, rgba(10,14,26,0.75) 100%)',
              border: '1px solid var(--cam-gold-leaf-dk)',
              color: 'var(--cam-gold-leaf-dk)',
            }}
          >
            Explain
          </button>
```

- [ ] **Step 3: Pass `explainMode` to `<PlaygroundEditor>`**

Find the `<PlaygroundEditor` JSX block:

```tsx
          <PlaygroundEditor
            key={activeTab}
            language={activeTab}
            defaultValue={codeRef.current[activeTab]}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
          />
```

Add `explainMode={explainMode}`:

```tsx
          <PlaygroundEditor
            key={activeTab}
            language={activeTab}
            defaultValue={codeRef.current[activeTab]}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
            explainMode={explainMode}
          />
```

- [ ] **Step 4: Build to confirm no TypeScript errors**

```bash
cd /Users/chundu/camora/apps/camora && npx vite build 2>&1 | tail -8
```

Expected: `✓ built in X.XXs`

- [ ] **Step 5: Commit**

```bash
cd /Users/chundu/camora
git add apps/camora/src/components/lumora/playground/PlaygroundLayout.tsx
git commit -m "feat(playground): add Explain toggle chip"
```

---

### Task 5: Add `onMount` prop to SharedCodeEditor

**Files:**
- Modify: `apps/camora/src/components/shared/code/SharedCodeEditor.tsx`

- [ ] **Step 1: Add `onMount` to the props interface**

Find:

```ts
interface SharedCodeEditorProps {
  language: string;
  code: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
  theme?: 'vs-dark' | 'light';
  fontSize?: number;
  height?: string;
  showLineNumbers?: boolean;
  className?: string;
}
```

Replace with:

```ts
interface SharedCodeEditorProps {
  language: string;
  code: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
  theme?: 'vs-dark' | 'light';
  fontSize?: number;
  height?: string;
  showLineNumbers?: boolean;
  className?: string;
  onMount?: (editor: any) => void;
}
```

- [ ] **Step 2: Destructure `onMount` and pass it to MonacoEditor**

Find the function signature:

```ts
export default function SharedCodeEditor({
  language,
  code,
  onChange,
  readOnly = false,
  theme = 'vs-dark',
  fontSize = 14,
  height = '300px',
  showLineNumbers = true,
  className,
}: SharedCodeEditorProps) {
```

Replace with:

```ts
export default function SharedCodeEditor({
  language,
  code,
  onChange,
  readOnly = false,
  theme = 'vs-dark',
  fontSize = 14,
  height = '300px',
  showLineNumbers = true,
  className,
  onMount,
}: SharedCodeEditorProps) {
```

Find the `<MonacoEditor` JSX and add `onMount={onMount}` after the `onChange` prop:

```tsx
          <MonacoEditor
            height={height}
            language={language}
            value={code}
            onChange={(val) => onChange(val || '')}
            onMount={onMount}
            theme={theme}
            options={{
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/chundu/camora/apps/camora && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/chundu/camora
git add apps/camora/src/components/shared/code/SharedCodeEditor.tsx
git commit -m "feat(shared): add optional onMount prop to SharedCodeEditor"
```

---

### Task 6: Add Explain chip + hover provider to CoFixLayout

**Files:**
- Modify: `apps/camora/src/components/lumora/cofix/CoFixLayout.tsx`

- [ ] **Step 1: Add `playgroundAPI` import**

Find the existing imports at the top of `CoFixLayout.tsx`. Add after the `streamCoFixResponse` import line:

```ts
import { playgroundAPI } from '@/lib/capra-api';
```

- [ ] **Step 2: Add `explainMode` state and `cofixHoverDisposable` ref**

After the `const [isRunning, setIsRunning] = useState(false);` line, add:

```ts
const [explainMode, setExplainMode]           = useState(false);
const cofixHoverDisposable                    = useRef<any>(null);
```

- [ ] **Step 3: Add the hover provider `useEffect`**

After the `useEffect` that handles `ASSISTANT_UPDATED_EVENT`, add:

```ts
useEffect(() => {
  cofixHoverDisposable.current?.dispose();
  cofixHoverDisposable.current = null;
  if (!monaco || !explainMode) return;

  const monacoLang = toMonacoLang(effectiveLang);
  cofixHoverDisposable.current = monaco.languages.registerHoverProvider(monacoLang, {
    provideHover: async (model, position) => {
      const lineContent = model.getLineContent(position.lineNumber).trim();
      if (!lineContent) return null;
      try {
        const result = await playgroundAPI.explain(
          model.getValue(),
          position.lineNumber,
          effectiveLang
        );
        if (!result.explanation) return null;
        return {
          contents: [
            { value: `**Line ${position.lineNumber}** — *Gemini*` },
            { value: result.explanation },
          ],
        };
      } catch {
        return null;
      }
    },
  });

  return () => { cofixHoverDisposable.current?.dispose(); };
}, [monaco, explainMode, effectiveLang]);
```

- [ ] **Step 4: Add the Explain chip to the CoFix toolbar**

In the toolbar `div`, find the first divider (after the Lang select group):

```tsx
        {/* Divider */}
        <div className="w-px h-5 shrink-0" style={{ background: 'var(--cam-gold-leaf-dk)', opacity: 0.4 }} />

        {/* Status */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
```

Between the divider and the Status div, add the Explain chip:

```tsx
        {/* Explain chip */}
        <button
          onClick={() => setExplainMode(v => !v)}
          className="text-[11px] font-semibold px-3 py-1 rounded-md transition-opacity hover:opacity-90 shrink-0"
          style={explainMode ? {
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 100%)',
            border: '1px solid var(--cam-gold-leaf)',
            color: '#0a0e1a',
          } : {
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            background: 'linear-gradient(135deg, rgba(0,47,120,0.35) 0%, rgba(10,14,26,0.75) 100%)',
            border: '1px solid var(--cam-gold-leaf-dk)',
            color: 'var(--cam-gold-leaf-dk)',
          }}
        >
          Explain
        </button>

        {/* Divider */}
        <div className="w-px h-5 shrink-0" style={{ background: 'var(--cam-gold-leaf-dk)', opacity: 0.4 }} />
```

- [ ] **Step 5: Build to confirm no TypeScript errors**

```bash
cd /Users/chundu/camora/apps/camora && npx vite build 2>&1 | tail -8
```

Expected: `✓ built in X.XXs`

- [ ] **Step 6: Commit and push**

```bash
cd /Users/chundu/camora
git pull
git add apps/camora/src/components/lumora/cofix/CoFixLayout.tsx
git commit -m "feat(cofix): add Explain toggle chip + Gemini hover provider"
git push
vercel --prod
```

---

### Task 7: Set GEMINI_API_KEY on Railway

- [ ] **Step 1: Set the env var on ascend-backend Railway service**

In Railway dashboard → `camora` project → `ascend-backend` service → Variables tab:

Add: `GEMINI_API_KEY` = `<the Gemini API key>`

Railway will trigger a redeploy automatically.

- [ ] **Step 2: Verify the explain endpoint is live**

```bash
curl -s -X POST https://ascendb.cariara.com/api/v1/playground/explain \
  -H "Content-Type: application/json" \
  -d '{"code":"print(\"hello\")\n","line":1,"language":"python"}' | head -c 200
```

Expected: `{"explanation":"..."}` with a non-empty explanation string.

If you get `{"error":"GEMINI_API_KEY not set"}`: the Railway env var wasn't picked up yet — wait for the redeploy to finish.
