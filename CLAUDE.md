# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Camora is a monorepo for an AI-powered interview platform with two products:
- **Lumora** — Real-time AI interview assistant (live transcription + AI answers)
- **Capra** — Interview preparation platform (study DSA, system design, behavioral topics)

## Monorepo Structure

```
apps/
  camora/          # React 19 + Vite 8 + Tailwind 4 (deployed on Vercel)
                   #   was apps/frontend pre-2026-05; renamed to match the product brand
  lumora-backend/  # Express 5 — live interview API (deployed on Railway)
  ascend-backend/  # Express 5 — prep/study API + lumora mirror (deployed on Railway)
  ai-services/     # FastAPI (Python) — speaker verification, diagrams (Docker on Railway)
                   #   non-/health routes require X-API-Key in AI_SERVICES_API_KEY env
  code-runner/     # Express — sandboxed code execution microservice (port 4000).
                   #   POST /run { code, language, test_cases } → executeCode(); backs
                   #   the Coding tab's run/verify path.
  playground-backend/ # Express — interactive hands-on lab sessions (k8s/etcd/linux).
                   #   Nomad container orchestration (nomadClient), SSH (ssh2), WS proxy,
                   #   R2/S3 session storage, Redis, Postgres, log streaming.
  extension/       # Browser extension — reads the coding-problem tab you already
                   #   have open so camora.cariara.com can load it without a
                   #   pasted URL (the web equivalent of the desktop app's
                   #   Electron IPC `window.camo.getActiveBrowserUrl`).
  desktop/         # Electron 41 shell that loads camora.cariara.com (arm64 DMG)
  mobile/          # Expo (React Native) — iOS + Android. Reviewer-facing
                   #   framing is "Study & Live Notes" (not "interview AI") to
                   #   reduce App Store rejection risk under Guideline 5.6.1.
                   #   Underlying functionality is identical to web Lumora audio:
                   #   mic capture → /api/v1/transcribe → /api/v1/inference/stream.
                   #   Video/coding redirect to desktop or web by design.
packages/
  shared-types/    # TypeScript types (User, Conversation, Subscription, PlanType, etc.)
  shared-db/       # PostgreSQL pool (getPool, query, closePool) + migrations
  shared-auth/     # JWT auth (verifyToken, createToken, authenticate middleware, SSO cookie)
  shared-llm/      # LLM client factories (getAnthropicClient, getOpenAIClient).
                   #   Currently UNUSED — no app imports it. Unlike the same-named
                   #   helpers inside each backend, this one is a REAL Anthropic
                   #   client, so importing it from ascend-backend would break the
                   #   provider separation. Prefer the in-app _shared/llm.js.
```

Package manager: **pnpm 9.15** with workspaces (`apps/*`, `packages/*`).

## Common Commands

```bash
# Frontend
pnpm dev:camora            # Vite dev server (port 3000, proxies /api → localhost:8000)
pnpm build:camora          # Vite production build → apps/camora/dist/

# Lumora Backend
pnpm dev:lumora            # Express server (port 8000)
node --watch apps/lumora-backend/src/index.js   # Dev with auto-restart

# Ascend Backend
pnpm dev:ascend            # Express server (port 3009)
node --watch apps/ascend-backend/src/index.js   # Dev with auto-restart

# AI Services (Python)
uvicorn main:app --reload --port 8001   # From apps/ai-services/

# Mobile (Expo)
cd apps/mobile && pnpm start             # Dev server (scan QR with Expo Go)
cd apps/mobile && pnpm ios               # iOS simulator
cd apps/mobile && pnpm android           # Android emulator

# Tests (both backends use vitest)
cd apps/lumora-backend && npx vitest
cd apps/ascend-backend && npx vitest
cd apps/ascend-backend && npx vitest run tests/solve.test.js   # Single test

# Lint
cd apps/camora && npx eslint .
```

## Architecture

### Frontend (`apps/camora`)

- **Router**: React Router DOM v7 — routes defined in `src/App.tsx`
- **Auth**: `src/contexts/AuthContext.tsx` — reads `cariara_sso` cookie or OAuth hash tokens, validates against lumora-backend `/api/v1/auth/me`
- **State**: Zustand store at `src/stores/interview-store.ts` (audio, transcription, streaming state)
- **Import alias**: `@/*` → `./src/*`
- **Pages**: Lazy-loaded via `React.lazy` + `Suspense`. Two domains:
  - `pages/lumora/` — InterviewPage, CodingPage, DesignPage (live interview UI)
  - `pages/capra/` — DashboardPage, PracticePage, PreparePage (prep UI)
- **API clients**:
  - `src/lib/api-client.ts` — Lumora backend (transcription, speaker, documents, auth)
  - `src/services/capra-api.ts` — Ascend backend (solve, analyze, prep, billing)
- **Components**: Organized as `components/shared/`, `components/lumora/`, `components/capra/`
- **Streaming**: Uses native Fetch + ReadableStream for SSE from backends

### Lumora Backend (`apps/lumora-backend`)

- ES6+ JavaScript (no TypeScript), Express 5
- Routes mounted at `/api/v1/*` in `src/index.js`
- Key services: `claude.js` (Anthropic SDK), `transcription.js` (OpenAI Whisper + ffmpeg), `aiServiceProxy.js` (proxies to Python ai-services)
- Multi-provider fallback chain in `provider-stream.js`: Claude → Gemini 1.5 Flash → Qwen-2.5-72B (OpenRouter) → DeepSeek-V3 (OpenRouter) → GPT-4o-mini. Fallback triggers only when a provider errors before any tokens stream.
- RAG pipeline: `retrieval.js` → `hybridRetrieval.js` (BM25 + vector) → optional `hyde.js` (HyDE rewriting) → optional `reranker.js` (Cohere) → optional `chunkGrader.js` (CRAG relevance filter)
- Behavioral story anchor: `storyAnchor.js` persists parsed STAR stories per user (`lumora_user_stories` table) and injects the best archetype-matched story into the prompt so Claude uses the exact experience/metric rather than re-discovering from raw resume text.
- Answer caching: `answerCache.js` hashes question + plan + context; cache hits replay the full answer SSE without hitting the LLM.
- Runs DB migrations on startup (idempotent `CREATE TABLE IF NOT EXISTS`)
- Tables: `lumora_conversations`, `lumora_messages`, `lumora_usage_logs`, `lumora_bookmarks`, `lumora_quotas`, `coding_usage`, `lumora_completion_marks`, `lumora_prep_state`, `lumora_company_context`, `lumora_audio_preferences`, `lumora_kb_chunks`, `lumora_user_doc_chunks`, `lumora_user_code_chunks`, `lumora_session_kit`, `lumora_retrieval_logs`, `lumora_user_stories`

### Ascend Backend (`apps/ascend-backend`)

- ES6+ JavaScript, Express 5
- Routes mounted at `/api/v1/*` and some at `/api/*` in `src/index.js`
- Key services: `claude.js`, `openai.js`, `ascendPrep.js` (interview prep generation).
  **Both service filenames lie** — see LLM Provider Separation below. `claude.js`
  imports `GoogleGenerativeAI`; `openai.js` does too.
- Ask Sona (`routes/ask.js`) — the `/lumora/ask` tab. Streams SSE from
  `POST /api/v1/ask/stream`. Routes each turn to a code or prose template via
  `looksLikeCodeTask(text, { hasImages })`; screenshots are decoded to Gemini
  `inlineData` and archived to R2 off the critical path.
- Uses Redis for problem caching (`problemCache.js`)
- Graceful shutdown with connection tracking

## LLM Provider Separation

**Rule: ascend-backend never spends Anthropic keys. lumora-backend does.**
Claude is Lumora's model; ascend answers on Gemini.

This is enforced by naming that actively works against you, so read this before
changing any model call:

- `apps/ascend-backend/src/lib/_shared/llm.js` and
  `apps/ascend-backend/src/lumora/lib/_shared/llm.js` export
  **`getAnthropicClient()` that returns a GEMINI client** wearing an
  Anthropic-shaped interface (`messages.create` / `messages.stream`, responses as
  `{ content: [{ type:'text', text }] }`). Call sites read as Anthropic and are not.
- `apps/ascend-backend/src/services/claude.js` imports `GoogleGenerativeAI`, and
  its `getApiKey()` returns the **Gemini** key.
- `claude-sonnet-4-6` / `claude-haiku-*` strings scattered through ascend
  (`solve.js`, `analyze.js`, `fix.js`, `diagram.js`, `ascendPrep.js`,
  `lumora/routes/coding.js`) are arguments to those shims and are **ignored**.
  They are naming debt, not Anthropic calls.
- `routes/ask.js` keeps a real Anthropic branch behind `ANTHROPIC_ENABLED = false`.
  Flip that one constant only if Ask moves to lumora-backend.

Auditing this: grepping for `@anthropic-ai/sdk` is **not sufficient** — a raw
`fetch('https://api.anthropic.com/v1/messages')` slipped past exactly that check.
Grep for both, plus `x-api-key`.

Trap in the other direction: **lumora-backend's `lib/_shared/llm.js`
`getAnthropicClient()` is ALSO a Gemini shim.** Nothing imports it today (the
only import from that module is `getOpenAIClient`, by `openai-stream.js`), so it
is harmless — but importing it in Lumora silently violates the rule while
looking correct.

`getAnthropicClient` is defined **four separate times** in lumora-backend, and
three of them are the real thing:

| Definition | Real Anthropic? |
|---|---|
| `services/claude.js:55` (exported; the canonical one) | yes |
| `services/companyContext.js:200` | yes |
| `routes/coding.js:111` | yes |
| `lib/_shared/llm.js:20` | **no — Gemini** |

So `grep -rn getAnthropicClient` tells you nothing on its own. Always check which
module a call site imports from.

### Shared Auth Flow

1. Google OAuth → ascend-backend creates JWT → sets `cariara_sso` cookie (domain: `.cariara.com`, 30 days)
2. Frontend reads cookie → validates via lumora-backend `/api/v1/auth/me`
3. Both backends verify JWT using `@camora/shared-auth` middleware
4. Token payload: `{ sub, email, name, picture, exp, iat }`

### Database

- PostgreSQL with connection pool from `@camora/shared-db`
- Shared `users` table across both backends
- SSL auto-enabled for Railway (`rejectUnauthorized: false`)
- Parameterized queries throughout (no raw string interpolation)

## Key Environment Variables

### Frontend (Vite)
- `VITE_LUMORA_API_URL` (default: `http://localhost:8000`)
- `VITE_CAPRA_API_URL` (default: `http://localhost:3009`)
- `VITE_OAUTH_URL` — Google OAuth redirect URL

### Backends
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing key (canonical). `JWT_SECRET_KEY` was the prior name and is still read as a fallback for backward compat — set `JWT_SECRET` going forward.
- `ANTHROPIC_API_KEY` — **lumora-backend only.** ascend-backend must not hold or
  spend it (see LLM Provider Separation); it is no longer in ascend's
  `requiredEnvVars`, so that service boots without it.
- `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY` — ascend-backend's primary model access,
  and Gemini elsewhere. Most call sites read `GOOGLE_AI_API_KEY` first; as of
  2026-07 ascend's `GEMINI_API_KEY` was stale and returned `API_KEY_INVALID`.
- `OPENAI_API_KEY` — Whisper transcription, and the GPT-4o-mini tail of lumora's
  fallback chain
- `GROQ_API_KEY` — optional. When set, lumora-backend uses Groq `whisper-large-v3-turbo` for transcription (~100ms vs ~300ms). Falls back to OpenAI Whisper when absent or on error.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — Payments
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth
- `AI_SERVICES_URL` (default: `http://localhost:8001`) — Python microservice
- `AI_SERVICES_API_KEY` — shared secret. Required on both ai-services AND every backend that calls it (lumora-backend, ascend-backend). The Python service rejects all non-`/health` requests without a matching `X-API-Key` header. Generate with `openssl rand -hex 32`.
- `OWNER_EMAILS` / `ADMIN_EMAILS` (csv) — bypass quotas + admin gates. No hardcoded fallback in source; if unset, no one is admin.
- `REDIS_URL` — Redis (ascend-backend only)
- `COHERE_API_KEY` — optional. Enables cross-encoder reranking via Cohere `rerank-v3.5`. When absent, retrieval uses RRF order alone.
- `RAG_USE_HYDE` — optional `'true'`/`'false'`. Enables HyDE query rewriting (Haiku-generated hypothetical answer embedded for retrieval). Default off.
- `RAG_USE_RERANK` — optional `'true'`/`'false'`. Enables Cohere reranker (also requires `COHERE_API_KEY`). Default off.
- `RAG_USE_WARM_KIT` — optional `'true'`/`'false'`. Enables session-warm prefetch read in retrieve(). **Default ON** (set to `'false'` to disable). The kit is built on Prep save and skips live retrieval at question time.
- `RAG_AUTO_WEB_SEARCH` — optional `'true'`. Auto-enables web search when retrieval returns low-confidence chunks (without the user toggling the search button).
- `RAG_USE_GRADING` — optional `'true'`. Enables CRAG-style chunk relevance grading via Haiku before prompt injection. Off by default. Adds ~50ms per request (parallel grading, 300ms budget, fails open).
- `OPENROUTER_API_KEY` — optional. Enables Qwen-2.5-72B and DeepSeek-V3 as fallback providers in `provider-stream.js`.

## Conventions

- **Internal navigation**: Use React Router `<Link>` or `useNavigate()` for internal routes. Use `<a>` only for external URLs (e.g., `https://jobs.cariara.com`).
- **Backend routes**: All API routes prefixed with `/api/v1/`. Stripe webhooks use raw body parsing.
- **Rate limiting**: Four tiers per-IP — `authLimiter` (10/15min), `apiLimiter` (60/min), `aiLimiter` (20/min), `paymentLimiter` (20/hr).
- **Error responses**: `{ error: string }` or `{ detail: string }` format.
- **Streaming responses**: SSE via `text/event-stream` content type, flushed per chunk.
- **File naming**: React components PascalCase (`.tsx`/`.jsx`), services/utils camelCase (`.ts`/`.js`).
- **Theme** (`apps/camora/src/styles/globals.css`, the source of truth): primary is
  the Navy Atlas ramp — canon `#26619C`, lightened to `#6E96C0` for the dark
  default because the base is too dark on charcoal; `[data-theme="light"]` uses
  the base ramp. Accent `--cam-gold-leaf` `#D4A043`. **`#10b981` is
  `--cam-success`, not the primary** — an older version of this file called it
  "primary emerald", which it never was.
- **Fonts**: Plus Jakarta Sans (display) + Inter (body) + JetBrains Mono (code).
  IBM Plex Mono was the code font for a long time and is no longer used.

## Billing & Stripe Integration

- **Primary billing**: Ascend backend handles all subscription management
- **Webhook route order matters**: `express.raw()` for `/api/billing/webhook` must be registered **before** `express.json()` — Stripe signature verification requires the raw body
- **Webhook idempotency**: `ascend_stripe_events` table prevents duplicate event processing
- **Cross-service verification**: `GET /api/billing/verify-subscription/:userId` requires `X-API-Key` header (internal API key) — used by external services (e.g., jobs.cariara.com)
- **Subscription plans**: Monthly ($29), Quarterly Pro ($59, includes Lumora sessions), Desktop Lifetime ($99, one-time)
- **Open redirect prevention**: Checkout redirect URLs validated against domain allowlist

## Auth Middleware Differences

- **Ascend backend** (`jwtAuth`): Strict JWT validation with token type checking (`type: 'access'`), calls `initUser()` to auto-provision subscription/credits records on first request
- **Lumora backend** (`authenticate`): Email-based user lookup, auto-creates user with `provider='ascend_sso'` if not found in DB
- **`optionalJwtAuth`**: Non-blocking — attaches user if token present, proceeds without auth otherwise
- **`subscriptionRequired`**: Blocks free-tier users; valid paid plan_type values are `pro_monthly`, `pro_yearly`, `team`, `lifetime` (see `packages/shared-types/src/index.ts` `PlanType`). Owner emails (`OWNER_EMAILS` / `ADMIN_EMAILS` env) bypass the gate; nothing is hardcoded in source.

## Frontend Routing Details

- **`ProtectedRoute`** component wraps all authenticated routes — redirects to login with return URL preserved as query param
- **Onboarding enforcement**: `/capra/*` routes redirect to `/capra/onboarding` if `onboarding_completed` is false
- **Legacy route aliases**: `/app/*`, `/prepare`, `/practice`, `/handbook`, `/problems/:slug` all redirect to current routes
- **Vite proxy**: Only `/api/*` proxies to lumora-backend (`localhost:8000`) in dev; ascend-backend calls go directly via `VITE_CAPRA_API_URL`

## Deployment

- **Frontend**: Vercel — auto-deploy from `main` is unreliable on this project; after every push run `vercel --prod` from the repo root (the `.vercel` link is at root, not `apps/camora/`, because the project's Vercel-side Root Directory is set to `apps/camora` and the CLI would otherwise double the path)
- **Lumora Backend**: Railway (Nixpacks — `nodejs_20` + `ffmpeg`, healthcheck at `/health`)
- **Ascend Backend**: Railway (Nixpacks — `nodejs_20` + `python3` + `graphviz` + `go` + `rustc` + `openjdk17`, healthcheck at `/health`)
- **AI Services**: Railway (Dockerfile, `python:3.11-slim` + `graphviz` + `ffmpeg`, healthcheck at `/health`)

## Code Pasted in Chat

When the user pastes code into the conversation (any multi-line block that looks like source code), **immediately strip all comments and empty lines** before analyzing or responding:
- Remove `//` line comments (JS/TS/Java/Go/C++)
- Remove `#` line comments (Python/Ruby/Shell/YAML)
- Remove `/* ... */` and `/** ... */` block comments
- Remove `<!-- ... -->` HTML comments
- Remove all blank/whitespace-only lines
Show the cleaned code first, then proceed with the analysis or task.

## Database Notes

- **No migration tool**: Both backends use inline `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN IF NOT EXISTS` on startup — idempotent but manual
- **Ascend tables** (beyond shared `users`): `ascend_subscriptions`, `ascend_credits`, `ascend_free_usage`, `ascend_stripe_events`, `ascend_diagram_cache`, `ascend_credit_transactions`
- **Auto-provisioning**: `initUser()` in ascend-backend automatically creates subscription/credits rows for new users on first authenticated request
