# Topic Voice Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one switchable voice agent (Read / Teach / Quiz / Ask) to every Prepare topic, driven off the topic data object, reusing the existing mic→transcribe→stream loop and adding browser text-to-speech.

**Architecture:** A self-contained `TopicVoiceAgent` panel mounts from the TopicDetail toolbar and receives the resolved topic object. Pure helpers turn the topic + mode into the `systemContext`/directive strings passed to the existing `streamResponse` SSE helper; a `useSonaVoice` hook wraps `window.speechSynthesis` for spoken output (isolated so a cloud voice can swap in later). No new backend, no `sonaRegistry`/`voice-router`/`useSessionStore` coupling.

**Tech Stack:** React 19 + Vite 8 + TypeScript; existing `lib/api-client.ts` (`transcriptionAPI.transcribe`), `lib/sse-client.ts` (`streamResponse`), `contexts/AuthContext` (`useAuth`), `components/lumora/shell/SonaMicButton.tsx`; browser Web Speech API (`speechSynthesis`); vitest (added, scoped to pure logic).

## Global Constraints

- Import alias `@/*` → `apps/camora/src/*`.
- **No new backend endpoints.** Reuse `transcriptionAPI.transcribe(token, blob)` and `streamResponse(...)` exactly as `components/lumora/shell/PracticePanel.tsx` does.
- **No coupling** to `sonaRegistry`, `voice-router`, or `useSessionStore` — the agent calls the API helpers directly.
- Auth token comes from `useAuth().token` (`@/contexts/AuthContext`).
- **Design system:** navy-gold; use existing utility classes (`.btn-*`, `.chip`, `.tab-group`, `.badge-*`, `.text-eyebrow/.text-label`) and the `SonaAvatar` from `components/lumora/shell/AICompanionPanel.tsx`. No inline rainbow colors.
- **No native dialogs** — use `dialogAlert`/`dialogConfirm` from the DialogProvider if a modal is ever needed.
- **Verification gate for UI tasks:** `cd apps/camora && npx vite build` must pass (full typecheck), plus the manual browser steps listed. Frontend has no unit-test runner except the vitest added in Task 1 for pure logic.
- Sona here is a **tutor** (explains/quizzes the topic), NOT the first-person interview candidate — normal second-person coaching voice is correct.
- Read mode uses **no LLM** (free). Teach/Quiz/Ask call the LLM and must pass through the same `contentAccess` gate already threaded into `TopicDetail`.

---

## File Structure

- **Create** `apps/camora/src/lib/topic-voice-context.ts` — pure functions: `buildReadBlocks`, `buildSystemContext`, `buildDirective`, `pickQuizQuestions`. Turns a varying-shape topic object into voice-loop inputs.
- **Create** `apps/camora/src/lib/topic-voice-context.test.ts` — vitest unit tests for the above.
- **Create** `apps/camora/vitest.config.ts` + add `"test"` script — minimal, scoped to pure logic (skippable if the team rejects a frontend test runner; the module still typechecks via `vite build`).
- **Create** `apps/camora/src/components/capra/docs/useSonaVoice.ts` — `speechSynthesis` hook: `speak`, `enqueue`, `cancel`, `speaking`, `supported`.
- **Create** `apps/camora/src/components/capra/docs/TopicVoiceAgent.tsx` — the panel: mode tabs, mic (reused `SonaMicButton`), streaming brain, spoken output, transcript log.
- **Modify** `apps/camora/src/components/capra/docs/TopicDetail.jsx` (~line 1010, the Interactive Toolbar) — add a "Voice" button beside "Ask AI" and mount `<TopicVoiceAgent>`.

---

## Task 1: Pure voice-context helpers (TDD)

**Files:**
- Create: `apps/camora/src/lib/topic-voice-context.ts`
- Create: `apps/camora/src/lib/topic-voice-context.test.ts`
- Create: `apps/camora/vitest.config.ts`
- Modify: `apps/camora/package.json` (add `"test": "vitest run"` script + devDeps `vitest`)

**Interfaces:**
- Produces:
  - `type VoiceMode = 'read' | 'teach' | 'quiz' | 'ask'`
  - `interface TopicLike { title?: string; introduction?: string; description?: string; keyQuestions?: Array<{ question: string; answer: string }>; sections?: Array<{ heading?: string; title?: string; content?: string; body?: string }>; }`
  - `buildReadBlocks(topic: TopicLike): string[]` — ordered plain-text blocks to narrate (title, description, introduction split by paragraph, each keyQuestions Q then A).
  - `buildSystemContext(topic: TopicLike): string` — a single context string (title + description + introduction + Q/A) capped to ~6000 chars.
  - `buildDirective(mode: VoiceMode): string` — the per-mode instruction prepended to the model call.
  - `pickQuizQuestions(topic: TopicLike): string[]` — questions from `keyQuestions` (fallback to a generic "Explain <title>" if none).

- [ ] **Step 1: Add vitest devDependency and config**

Run:
```bash
cd apps/camora && pnpm add -D vitest
```
Create `apps/camora/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
```
Add to `apps/camora/package.json` `scripts`: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing test**

Create `apps/camora/src/lib/topic-voice-context.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildReadBlocks, buildSystemContext, buildDirective, pickQuizQuestions } from './topic-voice-context';

const behavioral = {
  title: 'Tell Me About Yourself',
  description: 'The opening question.',
  introduction: 'Para one.\n\nPara two.',
  keyQuestions: [
    { question: 'How long should it be?', answer: 'About 90 seconds.' },
    { question: 'Where to start?', answer: 'Present, then past, then future.' },
  ],
};

describe('buildReadBlocks', () => {
  it('narrates title, description, intro paragraphs, then each Q and A', () => {
    const b = buildReadBlocks(behavioral);
    expect(b[0]).toContain('Tell Me About Yourself');
    expect(b).toContain('Para one.');
    expect(b).toContain('Para two.');
    expect(b.some((x) => x.includes('How long should it be?'))).toBe(true);
    expect(b.some((x) => x.includes('About 90 seconds.'))).toBe(true);
  });
  it('never returns empty strings and tolerates a bare topic', () => {
    expect(buildReadBlocks({ title: 'X' }).every((s) => s.trim().length > 0)).toBe(true);
    expect(() => buildReadBlocks({})).not.toThrow();
  });
});

describe('buildSystemContext', () => {
  it('includes the title and caps length', () => {
    const c = buildSystemContext(behavioral);
    expect(c).toContain('Tell Me About Yourself');
    expect(c.length).toBeLessThanOrEqual(6000);
  });
});

describe('buildDirective', () => {
  it('returns a distinct directive per mode', () => {
    const modes = ['read', 'teach', 'quiz', 'ask'] as const;
    const set = new Set(modes.map((m) => buildDirective(m)));
    expect(set.size).toBe(4);
    expect(buildDirective('quiz').toLowerCase()).toContain('grade');
  });
});

describe('pickQuizQuestions', () => {
  it('uses keyQuestions when present', () => {
    expect(pickQuizQuestions(behavioral)).toContain('How long should it be?');
  });
  it('falls back to an Explain prompt', () => {
    expect(pickQuizQuestions({ title: 'Binary Search' })[0]).toContain('Binary Search');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/lib/topic-voice-context.test.ts`
Expected: FAIL — `Failed to resolve import './topic-voice-context'`.

- [ ] **Step 4: Write minimal implementation**

Create `apps/camora/src/lib/topic-voice-context.ts`:
```ts
export type VoiceMode = 'read' | 'teach' | 'quiz' | 'ask';

export interface TopicLike {
  title?: string;
  description?: string;
  introduction?: string;
  keyQuestions?: Array<{ question?: string; answer?: string }>;
  sections?: Array<{ heading?: string; title?: string; content?: string; body?: string }>;
}

const clean = (s: unknown): string => String(s ?? '').replace(/\s+/g, ' ').trim();

export function buildReadBlocks(topic: TopicLike): string[] {
  const blocks: string[] = [];
  if (topic.title) blocks.push(clean(topic.title));
  if (topic.description) blocks.push(clean(topic.description));
  if (topic.introduction) {
    for (const para of String(topic.introduction).split(/\n{2,}/)) {
      const p = clean(para).replace(/^#+\s*/, '');
      if (p) blocks.push(p);
    }
  }
  for (const s of topic.sections || []) {
    const body = clean(s.content || s.body);
    const head = clean(s.heading || s.title);
    if (head) blocks.push(head);
    if (body) blocks.push(body);
  }
  for (const q of topic.keyQuestions || []) {
    if (q.question) blocks.push(clean(q.question));
    if (q.answer) blocks.push(clean(q.answer));
  }
  return blocks.filter((b) => b.trim().length > 0);
}

export function buildSystemContext(topic: TopicLike): string {
  const parts: string[] = [];
  if (topic.title) parts.push(`Topic: ${clean(topic.title)}`);
  if (topic.description) parts.push(clean(topic.description));
  if (topic.introduction) parts.push(clean(topic.introduction));
  for (const q of topic.keyQuestions || []) {
    if (q.question) parts.push(`Q: ${clean(q.question)}`);
    if (q.answer) parts.push(`A: ${clean(q.answer)}`);
  }
  return parts.join('\n').slice(0, 6000);
}

export function buildDirective(mode: VoiceMode): string {
  switch (mode) {
    case 'teach':
      return 'You are Sona, a friendly expert tutor. Explain this topic clearly and conversationally in short spoken sentences (the reply is read aloud). Use plain language, no markdown, no code fences. Keep it under ~150 words unless asked to go deeper.';
    case 'quiz':
      return 'You are Sona running an active-recall quiz. The user just answered aloud. Grade their answer briefly: say Correct / Partly right / Not quite, give the one key correction, then stop. Plain spoken sentences, no markdown.';
    case 'ask':
      return 'You are Sona, a topic tutor. Answer the user\'s spoken question using the topic context. Be concise and conversational (read aloud). Plain sentences, no markdown, no code fences.';
    case 'read':
    default:
      return 'Narrate the provided content verbatim in a natural speaking cadence.';
  }
}

export function pickQuizQuestions(topic: TopicLike): string[] {
  const qs = (topic.keyQuestions || []).map((q) => clean(q.question)).filter(Boolean);
  if (qs.length) return qs;
  return [`Explain ${clean(topic.title) || 'this topic'} in your own words.`];
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/camora && npx vitest run src/lib/topic-voice-context.test.ts`
Expected: PASS (4 suites).

- [ ] **Step 6: Typecheck + commit**

Run: `cd apps/camora && npx vite build` → Expected: builds OK.
```bash
git add apps/camora/src/lib/topic-voice-context.ts apps/camora/src/lib/topic-voice-context.test.ts apps/camora/vitest.config.ts apps/camora/package.json apps/camora/../../pnpm-lock.yaml
git commit -m "feat(voice): topic voice-context pure helpers + vitest"
```

---

## Task 2: `useSonaVoice` — browser TTS hook

**Files:**
- Create: `apps/camora/src/components/capra/docs/useSonaVoice.ts`

**Interfaces:**
- Consumes: nothing (browser `window.speechSynthesis`).
- Produces:
  - `interface SonaVoice { supported: boolean; speaking: boolean; speak(text: string): void; enqueue(text: string): void; flushSentences(buffer: string): string; cancel(): void; }`
  - `function useSonaVoice(opts?: { rate?: number; onEnd?: () => void }): SonaVoice`
  - `speak` cancels current speech then speaks immediately (barge-in safe). `enqueue` appends to a spoken queue (used for streamed sentences). `flushSentences(buffer)` returns the buffer with complete sentences removed after enqueuing them (helper for streaming). `cancel` stops all speech and clears the queue.

- [ ] **Step 1: Implement the hook**

Create `apps/camora/src/components/capra/docs/useSonaVoice.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SonaVoice {
  supported: boolean;
  speaking: boolean;
  speak(text: string): void;
  enqueue(text: string): void;
  flushSentences(buffer: string): string;
  cancel(): void;
}

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!synth) return null;
  const voices = synth.getVoices();
  // Prefer a natural en-US voice; fall back to the first English voice.
  return (
    voices.find((v) => /en-US/i.test(v.lang) && /natural|samantha|google/i.test(v.name)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    voices[0] ||
    null
  );
}

export function useSonaVoice(opts: { rate?: number; onEnd?: () => void } = {}): SonaVoice {
  const { rate = 1, onEnd } = opts;
  const [speaking, setSpeaking] = useState(false);
  const queue = useRef<string[]>([]);
  const draining = useRef(false);

  // Some browsers populate voices asynchronously; nudge them to load.
  useEffect(() => {
    if (!synth) return;
    const load = () => pickVoice();
    load();
    synth.addEventListener?.('voiceschanged', load);
    return () => synth.removeEventListener?.('voiceschanged', load);
  }, []);

  const drain = useCallback(() => {
    if (!synth || draining.current) return;
    const next = queue.current.shift();
    if (!next) { setSpeaking(false); onEnd?.(); return; }
    draining.current = true;
    setSpeaking(true);
    const u = new SpeechSynthesisUtterance(next);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = rate;
    u.onend = u.onerror = () => { draining.current = false; drain(); };
    synth.speak(u);
  }, [rate, onEnd]);

  const enqueue = useCallback((text: string) => {
    const t = text.trim();
    if (!synth || !t) return;
    queue.current.push(t);
    drain();
  }, [drain]);

  const speak = useCallback((text: string) => {
    if (!synth) return;
    synth.cancel();
    queue.current = [];
    draining.current = false;
    enqueue(text);
  }, [enqueue]);

  const cancel = useCallback(() => {
    if (!synth) return;
    queue.current = [];
    draining.current = false;
    synth.cancel();
    setSpeaking(false);
  }, []);

  // Enqueue any COMPLETE sentences in `buffer`, return the trailing remainder.
  const flushSentences = useCallback((buffer: string): string => {
    const parts = buffer.split(/(?<=[.!?])\s+/);
    if (parts.length <= 1) return buffer;
    const remainder = parts.pop() as string;
    for (const p of parts) enqueue(p);
    return remainder;
  }, [enqueue]);

  useEffect(() => () => { if (synth) synth.cancel(); }, []);

  return { supported: !!synth, speaking, speak, enqueue, flushSentences, cancel };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/camora && npx vite build`
Expected: builds OK (no type errors).

- [ ] **Step 3: Commit**

```bash
git add apps/camora/src/components/capra/docs/useSonaVoice.ts
git commit -m "feat(voice): useSonaVoice browser TTS hook with sentence queue"
```

---

## Task 3: `TopicVoiceAgent` panel

**Files:**
- Create: `apps/camora/src/components/capra/docs/TopicVoiceAgent.tsx`

**Interfaces:**
- Consumes: `buildReadBlocks`, `buildSystemContext`, `buildDirective`, `pickQuizQuestions`, `VoiceMode` (Task 1); `useSonaVoice` (Task 2); `SonaMicButton` (`@/components/lumora/shell/SonaMicButton`); `streamResponse` (`@/lib/sse-client`); `useAuth` (`@/contexts/AuthContext`).
- Produces: `export default function TopicVoiceAgent(props: { topic: any; open: boolean; onClose: () => void; locked?: boolean }): JSX.Element | null`

**Verify the reused signatures first** (read, do not guess): open `apps/camora/src/components/lumora/shell/PracticePanel.tsx` to copy the exact `streamResponse(...)` call shape (arguments, how tokens arrive, how it's awaited) and `apps/camora/src/components/lumora/shell/SonaMicButton.tsx` for its prop names (`onText`, `autoMode`, `disabled`, `startTrigger`/`toggleTrigger`). Mirror them exactly.

- [ ] **Step 1: Implement the component**

Create `apps/camora/src/components/capra/docs/TopicVoiceAgent.tsx`. Structure (fill the `streamResponse` call to match PracticePanel exactly):
```tsx
import { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { streamResponse } from '@/lib/sse-client';
import SonaMicButton from '@/components/lumora/shell/SonaMicButton';
import { useSonaVoice } from './useSonaVoice';
import {
  buildReadBlocks, buildSystemContext, buildDirective, pickQuizQuestions, type VoiceMode,
} from '@/lib/topic-voice-context';

type Line = { who: 'sona' | 'you'; text: string };
const MODES: Array<{ id: VoiceMode; label: string; llm: boolean }> = [
  { id: 'read', label: 'Read', llm: false },
  { id: 'teach', label: 'Teach', llm: true },
  { id: 'quiz', label: 'Quiz', llm: true },
  { id: 'ask', label: 'Ask', llm: true },
];

export default function TopicVoiceAgent({ topic, open, onClose, locked }: { topic: any; open: boolean; onClose: () => void; locked?: boolean }) {
  const { token } = useAuth();
  const [mode, setMode] = useState<VoiceMode>('read');
  const [log, setLog] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const voice = useSonaVoice({ rate: 1 });

  const systemContext = useMemo(() => buildSystemContext(topic), [topic]);
  const readBlocks = useMemo(() => buildReadBlocks(topic), [topic]);
  const quizQuestions = useMemo(() => pickQuizQuestions(topic), [topic]);
  const bufferRef = useRef('');

  const push = (who: Line['who'], text: string) => setLog((l) => [...l, { who, text }]);

  // Stream an LLM reply, speaking complete sentences as they arrive.
  const runLLM = useCallback(async (userText: string) => {
    if (!token) return;
    setBusy(true);
    bufferRef.current = '';
    let full = '';
    const question = mode === 'quiz'
      ? `Question: ${quizQuestions[quizIdx] || ''}\nUser answer: ${userText}`
      : userText;
    try {
      // MIRROR PracticePanel.tsx's streamResponse(...) call EXACTLY. On each
      // token chunk, do:
      //   full += chunk;
      //   bufferRef.current = voice.flushSentences(bufferRef.current + chunk);
      // (leave the running text on-screen via setLog replace of the last sona line)
      // On completion: if (bufferRef.current.trim()) voice.enqueue(bufferRef.current);
      await streamResponse(/* token, question, systemContext + directive, onToken, ... — match PracticePanel */);
    } finally {
      if (bufferRef.current.trim()) voice.enqueue(bufferRef.current);
      setBusy(false);
      if (mode === 'quiz') setQuizIdx((i) => Math.min(i + 1, quizQuestions.length - 1));
    }
  }, [token, mode, quizIdx, quizQuestions, systemContext, voice]);

  // Directive is prepended to systemContext when calling streamResponse:
  //   const ctx = `${buildDirective(mode)}\n\n${systemContext}`;

  const onMicText = useCallback((text: string) => {
    if (!text.trim()) return;
    voice.cancel();                 // barge-in: stop Sona before processing
    push('you', text);
    if (mode !== 'read') runLLM(text);
  }, [mode, runLLM, voice]);

  const startRead = useCallback(() => {
    voice.cancel();
    setLog([]);
    for (const b of readBlocks) { push('sona', b); voice.enqueue(b); }
  }, [readBlocks, voice]);

  const askQuizQuestion = useCallback(() => {
    const q = quizQuestions[quizIdx];
    if (!q) return;
    push('sona', q);
    voice.speak(q);
  }, [quizQuestions, quizIdx, voice]);

  if (!open) return null;
  const llmLocked = locked && MODES.find((m) => m.id === mode)?.llm;

  return (
    <div className="cam-hero-strip ..."> {/* navy-gold panel; use design-system classes */}
      {/* Header: SonaAvatar + "Voice — {topic.title}" + close button (onClose) */}
      {/* Mode tabs: .tab-group over MODES; setMode; on switch call voice.cancel() */}
      {/* Body: transcript log (map `log`), plus mode controls:
            - read: Play (startRead) / Stop (voice.cancel) buttons
            - teach: an opener button that calls runLLM('Teach me this topic from the start.')
            - quiz: "Ask question" (askQuizQuestion) then the mic answers it
            - ask: just the mic
          Mic: <SonaMicButton onText={onMicText} autoMode disabled={busy} />  (match real props) */}
      {/* If !voice.supported: show "Your browser can't speak; showing text instead." and keep transcript. */}
      {/* If llmLocked: show the standard upgrade prompt instead of the mic/LLM controls. */}
    </div>
  );
}
```
Notes for the implementer:
- Do **not** import `sonaRegistry`, `voice-router`, or `useSessionStore`.
- The directive + context passed to the model is `` `${buildDirective(mode)}\n\n${systemContext}` ``.
- Switching mode or pressing the mic must call `voice.cancel()` first so Sona never talks over the user.
- Keep the running Sona reply as the last `log` line, updating it as tokens stream (replace-last), so the transcript matches the spoken audio.

- [ ] **Step 2: Typecheck**

Run: `cd apps/camora && npx vite build`
Expected: builds OK.

- [ ] **Step 3: Commit**

```bash
git add apps/camora/src/components/capra/docs/TopicVoiceAgent.tsx
git commit -m "feat(voice): TopicVoiceAgent panel (Read/Teach/Quiz/Ask)"
```

---

## Task 4: Wire into the TopicDetail toolbar + verify end-to-end

**Files:**
- Modify: `apps/camora/src/components/capra/docs/TopicDetail.jsx` (Interactive Toolbar ~line 956-1022, beside the "Ask AI" button; and add the panel mount + a `showVoice` state near the existing `showAskAI` state)

**Interfaces:**
- Consumes: `TopicVoiceAgent` (Task 3). The toolbar already has `topicDetails` (the resolved topic) and `contentAccess`/lock info in scope.

- [ ] **Step 1: Import + state**

At the top of `TopicDetail.jsx` add:
```jsx
import TopicVoiceAgent from './TopicVoiceAgent';
```
Near the `showAskAI` usage, add local state:
```jsx
const [showVoice, setShowVoice] = useState(false);
```

- [ ] **Step 2: Add the toolbar button (beside "Ask AI", ~line 1010)**

Add, matching the sibling buttons' class/markup pattern:
```jsx
<button
  type="button"
  className="btn-ghost ..."   /* mirror the Ask AI button's classes */
  onClick={() => setShowVoice(true)}
  title="Talk to Sona about this topic"
>
  {/* small mic/sound icon consistent with the toolbar */} Voice
</button>
```

- [ ] **Step 3: Mount the panel**

Where `showAskAI` renders its panel, add:
```jsx
<TopicVoiceAgent
  topic={topicDetails}
  open={showVoice}
  onClose={() => setShowVoice(false)}
  locked={contentAccess?.isTopicLocked?.(selectedTopic) ?? false}
/>
```
(Use whatever lock predicate is already in scope in TopicDetail; if none, pass `locked={false}`.)

- [ ] **Step 4: Typecheck / build**

Run: `cd apps/camora && npx vite build`
Expected: builds OK.

- [ ] **Step 5: Manual verification (browser)**

Deploy to production per repo convention (no localhost): `cd /Users/chundu/camora && vercel --prod --yes`, then on `camora.cariara.com`:
1. Open a **behavioral** topic → click **Voice** → **Read**: Sona narrates the topic aloud; Stop halts it.
2. **Quiz**: "Ask question" speaks a `keyQuestions` item; answer via mic → Sona grades aloud; next question advances.
3. **Ask**: speak a question → Sona answers aloud, grounded in the topic.
4. Barge-in: while Sona speaks, press the mic → speech stops immediately.
5. Open a **coding** and a **system-design** topic → Read still produces sensible narration (varying shapes handled).
6. With a free-exhausted account: Teach/Quiz/Ask show the upgrade prompt; **Read still works**.

- [ ] **Step 6: Commit + verify deploy**

```bash
git add apps/camora/src/components/capra/docs/TopicDetail.jsx
git commit -m "feat(voice): mount Topic Voice Agent from the TopicDetail toolbar"
```
Then confirm the new chunk is live (curl production for the updated hash) per the repo's verify-deploy convention.

---

## Self-Review Notes (author)

- **Spec coverage:** Read/Teach/Quiz/Ask → Tasks 1+3; TTS abstraction → Task 2; entry point → Task 4; gating (Read free, LLM gated) → Task 3 (`llmLocked`) + Task 4 (`locked` prop); "all topics" → data-driven off `topicDetails` in Task 4; error handling (no TTS, barge-in) → Task 2/3.
- **Known follow-ups (out of scope, in spec):** cloud TTS swap (behind `useSonaVoice`), card-level mic trigger, persisting voice transcripts.
- **Implementer must read before Task 3:** `PracticePanel.tsx` (exact `streamResponse` call) and `SonaMicButton.tsx` (exact props) — these are copied, not invented.
