# Cara AI — Platform Guide Design

**Date:** 2026-06-18  
**Status:** Approved  
**Scope:** Phase 1 (navigation) — Phase 2 (agentic actions) deferred

---

## Overview

Cara is Camora's platform-wide AI guide. She lives in a ⌘K command bar accessible from every page, helps users navigate features, explains the platform, and suggests what to study next based on their prep progress. She is distinct from Sona (Lumora's interview AI) — Cara speaks *about* the user, never *as* the candidate.

---

## Architecture

### Backend — ascend-backend

**New route:** `POST /api/v1/cara/ask`  
Protected by existing `jwtAuth` middleware. Rate-limited by existing `aiLimiter` (20/min per IP).

**Request:**
```json
{
  "message": "what should I study next?",
  "context": {
    "currentPath": "/capra/prepare",
    "goal": "software_engineer",
    "topicsStudied": ["arrays", "trees"],
    "quizScores": { "arrays": 82 },
    "prepPlanActive": true
  }
}
```

**Response:**
```json
{
  "answer": "You've covered Arrays well (82%). System Design is untouched — I'd start there next.",
  "action": {
    "type": "navigate",
    "path": "/capra/prepare/system-design",
    "label": "Opening System Design"
  }
}
```

`action` is optional — omitted when a conversational answer is sufficient.

**New files:**
- `apps/ascend-backend/src/routes/cara.js` — route handler
- `apps/ascend-backend/src/services/cara.js` — Claude call + response parsing

### Frontend — apps/camora

**New files:**
- `src/components/shared/cara/CaraBar.tsx` — ⌘K modal component
- `src/lib/cara-context.ts` — assembles `userContext` from Zustand stores + auth
- `src/lib/cara-registry.ts` — module-level singleton (mirrors sona-registry pattern)

**Modified files:**
- `src/App.tsx` — global `keydown` listener for ⌘K
- `src/components/shared/SiteNav.tsx` — add `✦ Cara` trigger chip

---

## UI Design

CaraBar is a centered glass modal overlaying the current page:

```
┌─────────────────────────────────────────┐
│  ✦ Ask Cara                         ⌘K  │
│  ─────────────────────────────────────  │
│  [ What should I study next?         ]  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ You've covered Arrays well      │    │
│  │ (82%). System Design is next —  │    │
│  │ you haven't touched it yet.     │    │
│  │                                 │    │
│  │  → Open System Design           │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

- `backdrop-blur` dark overlay, click-outside dismisses
- Input auto-focused on open; `Enter` submits, `Escape` closes
- Navigation actions render as a clickable pill below the answer; click executes `useNavigate(path)` and closes bar
- Subtle pulse animation on input while awaiting response (no spinner)
- SiteNav shows a `✦ Cara` chip on the right side (navy/gold scheme, same as existing nav elements)

**During active Lumora session:**  
Bar opens but shows: *"Cara is quiet during live sessions — Sona has you covered."* No input rendered.

---

## Persona & System Prompt

**Identity:** Cara is Camora's platform guide. Warm, direct, concise. 1–3 sentences max per response. Never answers interview questions — redirects to Sona ("For live interviews, Sona's got you — head to Lumora").

**System prompt (backend):**
```
You are Cara, Camora's platform guide. Help users navigate features and 
plan their prep. Be concise — 1-3 sentences max.

USER CONTEXT:
- Goal: {goal}
- Topics studied: {topicsStudied}
- Quiz scores: {quizScores}  
- Current page: {currentPath}
- Plan: {planTier}

CAMORA ROUTES:
/capra/prepare            → Prep dashboard
/capra/practice           → DSA practice problems  
/capra/prepare/system-design → System Design topics
/capra/mcq               → Multiple choice quizzes
/capra/playground        → Code playground
/capra/resume            → Resume analysis
/capra/company-prep      → Company-specific prep
/lumora                  → Live interview assistant (Sona)
[... full route map from App.tsx ...]

When navigation is appropriate, return JSON: { answer, action: { type: "navigate", path, label } }
Never fabricate routes. If unsure, answer without an action.
```

---

## Data Flow

1. User presses ⌘K (or clicks `✦ Cara` in nav)
2. `caraRegistry` checks for active Lumora session — blocks if active
3. `CaraBar` mounts, input focused
4. User submits → `cara-context.ts` assembles `userContext` from Zustand prep store + `AuthContext`
5. `POST /api/v1/cara/ask` with JWT auth header
6. Backend calls Claude, parses structured JSON response
7. Frontend renders `answer` + optional navigation pill
8. User clicks pill → `useNavigate(action.path)`, bar closes

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Backend Claude failure | `{ answer: "I'm having trouble right now — try again in a moment.", action: null }` |
| Invalid route in action | Frontend validates path against known route list; falls back to answer-only if invalid |
| No prep context loaded | Context fields send as empty arrays; system prompt handles gracefully |
| Free-tier user | Fully available — Cara is not paywalled |
| Active Lumora session | Bar opens, shows quiet message, no input |

---

## cara-registry.ts

Module-level singleton mirroring `sona-registry.ts`:

```typescript
const caraRegistry = {
  open(): void         // Opens CaraBar (no-op if Lumora session active)
  close(): void        // Closes CaraBar
  isOpen(): boolean
  setLumoraActive(v: boolean): void  // Called by Lumora session lifecycle
  isLumoraActive(): boolean
}
```

---

## Phase 2 (Deferred)

Agentic actions extend the `action` type union:

```typescript
type CaraAction =
  | { type: 'navigate'; path: string; label: string }
  | { type: 'start_quiz'; topicId: string }
  | { type: 'add_to_plan'; topicId: string }
  | { type: 'search_company'; company: string }
```

Backend executes these against existing ascend-backend service layer. No frontend changes to `CaraBar` — it already renders any action the backend returns.

---

## Out of Scope (Phase 1)

- Cara answering interview questions (Sona's domain)
- Cara modifying user data (start quiz, update prep plan)
- Resume or company context in Cara's awareness
- Voice input for Cara
