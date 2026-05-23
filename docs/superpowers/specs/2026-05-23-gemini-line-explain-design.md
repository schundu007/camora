# Gemini Line Explanation — Design Spec

**Date:** 2026-05-23  
**Scope:** Playground page + CoFix page  
**Approach:** Monaco hover provider → backend proxy → Gemini Flash, with in-memory cache

---

## 1. Backend Explain Route

**File:** `apps/ascend-backend/src/routes/playground.js`

### Route

```
POST /api/v1/playground/explain
```

**Request body:**
```json
{ "code": "string", "line": 3, "language": "python" }
```

**Response:**
```json
{ "explanation": "string" }
```
On Gemini failure: `{ "error": "string" }` with HTTP 200 (tooltip silently skips on error — best-effort).

### Gemini Call

Model: `gemini-2.0-flash` (fastest and cheapest).

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=GEMINI_API_KEY
```

Prompt sent as a single user turn:
```
Explain what line {N} does in this {language} code in 1-2 concise sentences.
Focus on purpose, not just restating the syntax.

Code:
```{language}
{fullCode}
```
Line {N}: {lineContent}
```

### Caching

Module-level `Map<string, string>` capped at 500 entries.

- Key: `sha256(code + ':' + line + ':' + language)` (Node built-in `crypto.createHash`)
- On hit: return cached explanation immediately, no Gemini call
- On miss: call Gemini, store result, return
- Eviction: when size reaches 500, delete the oldest entry (`map.keys().next().value`)

### Environment Variable

`GEMINI_API_KEY` — set on ascend-backend Railway service. Never exposed to frontend.

---

## 2. Frontend API

**File:** `apps/camora/src/lib/capra-api.ts`

Add to `playgroundAPI`:

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

---

## 3. Hover Provider — PlaygroundEditor

**File:** `apps/camora/src/components/lumora/playground/PlaygroundEditor.tsx`

### New Prop

```ts
interface Props {
  // existing...
  explainMode: boolean;
}
```

### Hover Provider Registration

In a `useEffect` that depends on `[monaco, language, explainMode]`:

```ts
const hoverDisposable = useRef<Monaco.IDisposable | null>(null);

useEffect(() => {
  hoverDisposable.current?.dispose();
  hoverDisposable.current = null;
  if (!monaco || !explainMode) return;

  hoverDisposable.current = monaco.languages.registerHoverProvider(
    MONACO_LANG[language],
    {
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
    }
  );

  return () => { hoverDisposable.current?.dispose(); };
}, [monaco, language, explainMode]);
```

Note: Monaco hover providers are registered globally per language string. Since Playground and CoFix are on separate routes (never mounted simultaneously), there is no conflict.

---

## 4. Explain Chip — Playground

**File:** `apps/camora/src/components/lumora/playground/PlaygroundLayout.tsx`

### State

```ts
const [explainMode, setExplainMode] = useState(false);
```

### Chip (added to toolbar center group, before Clear button)

```tsx
<button
  onClick={() => setExplainMode(v => !v)}
  className="text-[11px] font-semibold px-3 py-1 rounded-md transition-opacity hover:opacity-90"
  style={explainMode ? {
    background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 100%)',
    border: '1px solid var(--cam-gold-leaf)',
    color: '#0a0e1a',
  } : {
    background: 'linear-gradient(135deg, rgba(0,47,120,0.35) 0%, rgba(10,14,26,0.75) 100%)',
    border: '1px solid var(--cam-gold-leaf-dk)',
    color: 'var(--cam-gold-leaf-dk)',
  }}
>
  Explain
</button>
```

### Prop passthrough

```tsx
<PlaygroundEditor
  explainMode={explainMode}
  // ...other props
/>
```

---

## 5. Explain Chip + Hover — CoFix

**File:** `apps/camora/src/components/lumora/cofix/CoFixLayout.tsx`

### State

```ts
const [explainMode, setExplainMode] = useState(false);
```

### Chip (added to toolbar, after Lang selector + divider, before status text)

Same visual style as Playground chip above, toggling `explainMode`.

### Hover Provider Registration

CoFix has two editors: the left input (SharedCodeEditor) and the right fixed-code Monaco Editor.

Register a single hover provider that covers both (same language, same Monaco instance):

```ts
const cofixHoverDisposable = useRef<Monaco.IDisposable | null>(null);
const inputEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

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

The provider depends on `effectiveLang` (re-registers when language changes, disposing the old one).

### SharedCodeEditor — expose editor instance

**File:** `apps/camora/src/components/shared/code/SharedCodeEditor.tsx`

Add optional `onMount?: (editor: Monaco.editor.IStandaloneCodeEditor) => void` prop, passed through to the Monaco `<Editor onMount>` callback. CoFixLayout uses this to store `inputEditorRef.current` (kept for future use, e.g., per-editor hover scoping).

---

## 6. File Change Summary

| File | Change |
|---|---|
| `apps/ascend-backend/src/routes/playground.js` | Add `POST /explain` route, Gemini fetch helper, 500-entry LRU-ish cache |
| `apps/camora/src/lib/capra-api.ts` | Add `explain()` to `playgroundAPI` |
| `apps/camora/src/components/lumora/playground/PlaygroundEditor.tsx` | Add `explainMode` prop + hover provider `useEffect` |
| `apps/camora/src/components/lumora/playground/PlaygroundLayout.tsx` | Add `explainMode` state + Explain chip in toolbar |
| `apps/camora/src/components/lumora/cofix/CoFixLayout.tsx` | Add `explainMode` state + Explain chip + hover provider `useEffect` |
| `apps/camora/src/components/shared/code/SharedCodeEditor.tsx` | Add optional `onMount` prop |

**Railway env var to set:** `GEMINI_API_KEY` on the ascend-backend service.

---

## 7. Out of Scope

- Persisting explain mode across sessions (always starts off)
- Streaming Gemini responses (single response is fast enough for 1-2 sentences)
- Rate limiting explain calls per user (best-effort, cache reduces Gemini load significantly)
- Explain mode for languages beyond what Gemini knows (all 4 playground languages + all CoFix languages are supported by Gemini)
