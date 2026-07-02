# Topic Voice Agent — Design Spec

**Date:** 2026-07-02
**Status:** Awaiting user approval
**Goal:** Add a switchable voice agent to every topic across the Prepare page categories (`/capra/prepare/*`), so a learner can talk to Sona about the topic they're studying — have it read the content aloud, teach it, quiz them, or answer questions — by voice.

---

## 1. Scope

- **In:** A per-topic voice agent, available on all ~1,500–2,500 topics across the ~25 Prepare category pages, driven entirely off the topic data object (no per-topic hand-wiring).
- **In:** Four modes in a single agent — **Read**, **Teach**, **Quiz**, **Ask**.
- **In:** Voice OUTPUT (text-to-speech) — new capability; Sona is currently text-only.
- **In:** Voice INPUT via the existing mic → transcription pipeline.
- **Out (later):** Cloud/premium TTS voice (design keeps a swap point). Card-level mic triggers on the category grid (detail-view first). Voice enrollment / speaker filtering. Persisting voice-session transcripts to history.

## 2. Modes (one switchable agent)

| Mode | LLM? | Behavior |
|------|------|----------|
| **Read** | No | Sona narrates the topic's own study content aloud (the `introduction` sections, and optionally each `keyQuestions` Q→A). Pure TTS over existing text. Play / pause / skip-section / speed controls. |
| **Teach** | Yes | Sona explains the topic conversationally, grounded in the topic content, spoken aloud sentence-by-sentence as it streams. User can barge in (mic) to ask a follow-up. |
| **Quiz** | Yes | Sona asks a spoken question (seeded from the topic's `keyQuestions`, then generated), user answers by voice, Sona scores + corrects aloud, then next question. Mirrors the existing `PracticePanel` grade loop but topic-scoped and voice-driven. |
| **Ask** | Yes | Open voice Q&A: user speaks a question, Sona answers aloud using the topic content as context. |

Default mode when opened: **Read** (immediate value, no LLM cost, no mic permission needed to start).

## 3. Architecture

New self-contained component; **no new backend endpoints** — reuses the existing STT + SSE pipeline exactly as `PracticePanel` does.

```
TopicDetail toolbar  ──(Voice button)──►  <TopicVoiceAgent topic={topicDetails} />
                                                │
        ┌───────────────────────────────────────┼───────────────────────────────┐
        │                                        │                               │
  SonaMicButton (reused)              buildTopicContext(topic)            useSonaVoice() [NEW]
   mic → POST /api/v1/transcribe      title + introduction +             speechSynthesis wrapper:
   → onText(transcript)               keyQuestions → systemContext        speak(text), cancel(),
        │                                        │                        onBoundary; sentence queue
        └──────────────► streamResponse (reused, SSE /api/v1/stream) ◄────┘
                          question + systemContext + per-mode directive
                          → tokens stream → spoken sentence-by-sentence
```

### Components / units
- **`components/capra/docs/TopicVoiceAgent.tsx`** (new) — the whole feature. Props: `{ topic: TopicObject, open: boolean, onClose: () => void }`. Owns mode state, transcript log, and the speak/listen loop. Deliberately avoids `sonaRegistry`, `voice-router`, and `useSessionStore` (those carry Lumora-live semantics) — it calls `transcriptionAPI`/`streamResponse` directly.
- **`components/capra/docs/useSonaVoice.ts`** (new) — thin hook over `window.speechSynthesis`: `speak(text)`, `cancel()`, `speaking`, `supported`, a preferred-voice picker, and a **sentence queue** so streamed tokens are spoken in natural chunks. This hook is the single swap point for a future cloud TTS.
- **`lib/topic-voice-context.ts`** (new, small + unit-tested) — `buildTopicContext(topic)` and `buildDirective(mode)`. Pure functions turning a topic object + mode into the `systemContext`/`question` strings passed to `streamResponse`.
- **Reused as-is:** `SonaMicButton` (input), `streamResponse` (`lib/sse-client.ts`), `transcriptionAPI` (`lib/api-client.ts`), `useAuth().token`, `SonaAvatar`.
- **Placement:** one "Voice" button added to the TopicDetail Interactive Toolbar (`TopicDetail.jsx` ~line 1010, beside "Ask AI"), toggling `TopicVoiceAgent`. Because it reads `topicDetails`, it appears on every topic automatically.

## 4. Data flow per mode
- **Read:** `buildTopicContext` extracts ordered text blocks (intro sections; optional Q/A) → `useSonaVoice.speak` each in sequence. No network.
- **Teach/Ask:** user's spoken question (or an auto opener for Teach) → `streamResponse({ question, systemContext, directive })` → tokens accumulate into sentences → spoken as they complete; barge-in cancels TTS and reopens mic.
- **Quiz:** pick next question (topic `keyQuestions` first, then generated) → speak it → mic captures answer → `streamResponse` with a GRADE directive → speak the grade/correction → advance.

## 5. Voice output (TTS) decision
**Browser now, cloud later.** Use `window.speechSynthesis` behind `useSonaVoice`. Rationale: $0, no backend, works on all topics immediately, offline-capable; quality is adequate. The hook boundary lets a cloud voice (OpenAI/ElevenLabs) drop in later with no change to `TopicVoiceAgent` or the topic UI. If `speechSynthesis` is unsupported, the agent still works in text (transcript shown) and Read falls back to on-screen highlighting.

## 6. Gating
- **Read** — free for everyone (narrates already-visible content; no LLM).
- **Teach / Quiz / Ask** — go through the same free-usage/quota gate as other AI features (`contentAccess` is already threaded into `TopicDetail`). Blocked users get the standard upgrade prompt; Read remains available.

## 7. Error handling
- No mic permission → Read still works; LLM modes show a "enable mic or type" fallback (text input like PracticePanel).
- `speechSynthesis` unsupported/silent (some browsers need a user gesture) → first speak is triggered by the button press; if still unavailable, degrade to text transcript.
- `streamResponse` error → surface inline (reuse existing SSE error handling), don't crash the panel.
- Barge-in race: starting the mic always calls `voice.cancel()` first so Sona never talks over the user.

## 8. Testing
- Unit: `topic-voice-context.ts` — `buildTopicContext` handles the varying topic shapes (behavioral `keyQuestions`, coding/system-design `sections`, missing fields) without throwing; `buildDirective` returns the right per-mode directive.
- Manual: on one topic per major category shape (behavioral, coding, system-design, a roadmap) — Read narrates; Quiz asks→listens→grades; barge-in stops speech; gating blocks LLM modes for a free-exhausted account while Read still works.

## 9. Why this shape
- **One component, data-driven** → covers all ~2000 topics with zero per-topic work and no risk of drifting per-category wiring.
- **Reuses the proven STT+SSE loop** (same as PracticePanel) → no backend, no new provider, no schema.
- **Decoupled from Lumora-live** (no session store / registry / router) → safe to run on the free Prepare surface.
- **TTS behind a hook** → the one genuinely-new capability is isolated and swappable.
