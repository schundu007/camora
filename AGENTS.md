# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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
- Key services: `Codex.js` (Anthropic SDK), `transcription.js` (OpenAI Whisper + ffmpeg), `aiServiceProxy.js` (proxies to Python ai-services)
- Runs DB migrations on startup (idempotent `CREATE TABLE IF NOT EXISTS`)
- Tables: `lumora_conversations`, `lumora_messages`, `lumora_usage_logs`, `lumora_bookmarks`, `lumora_quotas`, `coding_usage`

### Ascend Backend (`apps/ascend-backend`)

- ES6+ JavaScript, Express 5
- Routes mounted at `/api/v1/*` and some at `/api/*` in `src/index.js`
- Key services: `Codex.js` (43KB), `openai.js` (30KB), `ascendPrep.js` (57KB — interview prep generation)
- Uses Redis for problem caching (`problemCache.js`)
- Graceful shutdown with connection tracking

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
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` — AI model access
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

## Conventions

- **Internal navigation**: Use React Router `<Link>` or `useNavigate()` for internal routes. Use `<a>` only for external URLs (e.g., `https://jobs.cariara.com`).
- **Backend routes**: All API routes prefixed with `/api/v1/`. Stripe webhooks use raw body parsing.
- **Rate limiting**: Four tiers per-IP — `authLimiter` (10/15min), `apiLimiter` (60/min), `aiLimiter` (20/min), `paymentLimiter` (20/hr).
- **Error responses**: `{ error: string }` or `{ detail: string }` format.
- **Streaming responses**: SSE via `text/event-stream` content type, flushed per chunk.
- **File naming**: React components PascalCase (`.tsx`/`.jsx`), services/utils camelCase (`.ts`/`.js`).
- **Tailwind theme**: Primary emerald (#10b981), fonts Plus Jakarta Sans (display) + IBM Plex Mono (code).

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

## Database Notes

- **No migration tool**: Both backends use inline `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN IF NOT EXISTS` on startup — idempotent but manual
- **Ascend tables** (beyond shared `users`): `ascend_subscriptions`, `ascend_credits`, `ascend_free_usage`, `ascend_stripe_events`, `ascend_diagram_cache`, `ascend_credit_transactions`
- **Auto-provisioning**: `initUser()` in ascend-backend automatically creates subscription/credits rows for new users on first authenticated request


<claude-mem-context>
# Memory Context

# [camora] recent context, 2026-05-07 12:12am PDT

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (18,599t read) | 236,583t work | 92% savings

### May 6, 2026
1002 8:32p ✅ Regenerated PNG exports for corrected diagram layouts with reduced file sizes
1003 " 🔵 Canvas optimization successfully achieved: oversized diagrams reduced to 1460-1542px
1004 " ✅ Committed diagram layout optimization and canvas width fixes
1005 8:33p ✅ Deployed diagram fixes to production via Vercel
1006 " 🔵 Vercel production deployments completed successfully for diagram fixes
1007 8:39p ✅ Deployed camora to Vercel production
1008 9:08p 🔵 System-design mode architecture in Camora dashboard
1009 " 🔵 PreparePage uses lazy loading for ~7 MB topic data bundle
1010 9:09p 🔵 Cloud provider-specific content formatting via useCloudFormatter hook
1011 " 🔵 Two-tier diagram caching strategy with intelligent sessionStorage exclusion
1012 " 🔵 DocsPage state management includes page aliasing, topic persistence, and diagram cloud provider selection
1013 9:10p 🔵 Bidirectional URL-state sync with job role filtering and smart history management
1014 " 🔵 System design topics curriculum includes real-world case studies and infrastructure examples
1015 " 🔵 Topic lookup searches across 18 unified topic arrays without page restrictions
1016 9:11p 🔵 Free tier quota system with server-authoritative read tracking
1017 9:12p 🔵 Client-side quota enforcement with optimistic updates and server sync
1018 " 🔵 System-design aggregates 7 topic arrays; per-call AbortController prevents diagram race conditions
1019 9:13p 🔵 Eager category prefetch with safe-side defaults; already-read topics bypass quota limit
1020 9:14p 🔵 Twitch is a system design problem topic in systemDesignProblemsExtra
1021 " 🔵 TopicDetail marks topics as read on mount; contentAccess object required as dependency
1022 9:16p 🔵 TopicDetail detects topic shape to render coding vs system-design style content
1023 9:18p 🔵 Heavy topic data lazily loaded per page; system-design bundle is ~4 MB aggregating 7 sources
1024 " 🔵 systemDesignProblemsExtra (including Twitch) loaded in system-design chunk via loader.js
1025 " 🔵 systemDesigns merges core problems with extraSystemDesigns from loader
1026 9:19p 🔴 Memoize useContentAccess return object to prevent unnecessary TopicDetail effect reruns
S166 React #300 error fix and continuation toward JobPrepPage improvements — previous session identified and resolved the "Maximum update depth exceeded" error on scroll-heavy topic surfaces; now resuming deferred JobPrepPage improvements (May 6 at 11:01 PM)
1027 11:16p 🔵 Located Job Preparation Page Component
1028 11:17p 🔵 Identified Generic Emoji Icons and Problem UI Elements in JobPrepPage
1029 " 🔵 Analyzed JobPrepPage Round Structure and Emoji Icon Implementation
1030 " 🔵 Found Study Path UI Implementation and Prepare Material Button Current Behavior
1031 " 🔵 Located Lumora Documentation and Context Management Components
1032 11:18p 🔵 Found Lumora Prepkit Route and LumoraDocsPanel Interview Prep Interface
1033 " 🔴 Fixed React Error #300 on Topic Pages with useRef-based Dependency Management
1034 11:19p 🔵 Verified Lazy Loading Pattern for Route and Component Code Splitting
1035 " 🔴 Fixed React Rules of Hooks Violation in TopicDetail and API Rate Limiter Cascade
1036 11:20p 🔵 Identified Scroll-Spy Architecture: OnThisPage Owns Active Section Tracking
1037 11:21p 🔵 Documented OnThisPage Scroll-Spy Algorithm and Implementation Details
1038 " 🔵 Revealed TopicDetail Refactoring: Delegated Scroll-Spy to OnThisPage Primitive
1039 11:22p 🔵 Confirmed TopicDetail Lazy Loading for Bundle Optimization
1040 11:23p ⚖️ Reverted TopicDetail Lazy Loading Due to React Error #300 on Scroll Interaction
1041 11:26p 🔵 Vite Build Completed Successfully After TopicDetail Lazy Loading Revert
1042 " 🔵 Confirmed TopicDetail is Pure Presentation Component Without App Shell State Management
S167 React #300 error fix on topic detail pages — identified and resolved three load-bearing causes preventing scroll interactions from triggering "Maximum update depth exceeded" errors (May 6 at 11:26 PM)
S168 Continue CSS variable refactoring for ProfilePage feature components to fix white-on-white contrast issues in dark mode and widen the page layout from max-w-3xl to the site's canonical 1280px maximum (May 6 at 11:32 PM)
S169 CSS variable refactoring for ProfilePage feature components to fix white-on-white contrast in dark mode and align page layout with site maximum width (May 6 at 11:32 PM)
S170 Continue CSS variable refactoring for Camora app: Plan comprehensive "apply to all pages" sweep using established pattern from ProfilePage feature components (BadgeGrid, Leaderboard, ReferralDashboard, ProfilePage). Previous session completed component refactoring and created 80-route inventory as foundation. (May 6 at 11:37 PM)
S171 Plan comprehensive CSS variable refactoring across all pages in Camora app. Continue from previous session's ProfilePage feature component work (BadgeGrid, Leaderboard, ReferralDashboard, ProfilePage). Route inventory (80 routes by chrome family) created to guide systematic "apply to all pages" sweep. (May 6 at 11:38 PM)
S172 Complete Camora landing page component refactoring: extract animated components into standalone memoized files to prevent perpetual animations from triggering parent re-renders, following performance isolation guardrails (May 6 at 11:39 PM)
S173 Complete Camora landing page component extraction and refactoring with animated components (live session preview, visitor count, skill carousel, magnetic CTA effects) extracted into standalone memoized React components to prevent perpetual animations from triggering parent re-renders (May 6 at 11:40 PM)
S174 Replace Excalidraw as the interview-prep diagram tool with a production-quality alternative that supports auto-layout, mixed flow + code + tradeoff annotations, and maintains consistency across multiple topics without manual re-measurement drifting (May 6 at 11:45 PM)
1043 11:53p ⚖️ Planned DSL Enhancement: Navy/Gold Palette, Layout Fixes, Clustering, and Edge Labels
1044 11:54p ⚖️ Twitter Diagram Migration: Excalidraw to DSL Specs
1045 " ⚖️ DSL Pipeline Integration: Inline Specs in Topic Data
1046 " ✅ DSL Polishing Work Started
1047 11:56p 🟣 DSL Compiler Refactored: Navy/Gold Palette, TB Layout with Clusters, Multi-line Labels
1048 " 🟣 Polished DSL Successfully Renders Twitter Diagrams
1049 11:57p 🔵 Twitter diagram asset inventory mapped
1050 " ✅ Twitter architecture diagrams replaced with generated versions
1051 " 🟣 Graphviz-based diagram DSL replaces manual Excalidraw authoring
S175 Replace Excalidraw diagrams with programmatic Graphviz DSL — Twitter system design Wave 1 (May 6 at 11:58 PM)
**Investigated**: Identified 16 Twitter diagrams consumed by systemDesignProblems.js; analyzed original file sizes (681KB, 757KB) and authoring overhead (~600 lines Excalidraw JSON per diagram); evaluated Excalidraw pain points: amateur hand-drawn fonts, text overflow on edits, arrow anchor snapping, manual dragging workflow

**Learned**: New system: JSON specs → Graphviz DOT compiler → PNG renderer at 160 DPI. Supports node kinds (actor, service, datastore, cache, queue, worker, decision, gateway, client) and panel blocks (code with mono+navy, issue in red, tradeoff in gold +/-, note in blue). Top-to-bottom layout with rank=same horizontal flow lanes for LR readability. Reduces authoring to ~50 lines JSON per diagram. File size dropped 63-69% while improving visual fidelity.

**Completed**: Built dsl.mjs (spec-to-DOT compiler honoring Camora navy/gold palette, dark theme #0E1117). Built render.mjs CLI wrapper for batch rendering. Created twitter-fanout-basic.json and twitter-fanout-hybrid.json specifications. Regenerated architecture-basic.png (681KB→250KB) and architecture-advanced.png (757KB→232KB). Archived originals with sources in _excalidraw-archive/ for rollback. Committed and pushed Wave 1 to main (b7b131ad).

**Next Steps**: Awaiting user verification of Wave 1 diagrams on live site (https://camora.cariara.com/capra/prepare?page=system-design&topic=twitter). Pending style approval, will migrate remaining 10 Twitter diagrams (deep-dive-fanout, deep-dive-snowflake, deep-dive-earlybird, deep-dive-ranking, deep-dive-trends, flow-create-tweet, flow-read-timeline, discuss-media, discuss-search, discuss-trending). Starting pipeline integration to embed diagram specs directly in topic data files instead of separate spec files.


Access 237k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>