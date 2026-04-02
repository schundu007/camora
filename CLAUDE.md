# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Camora is a monorepo for an AI-powered interview platform with two products:
- **Lumora** — Real-time AI interview assistant (live transcription + AI answers)
- **Capra** — Interview preparation platform (study DSA, system design, behavioral topics)

## Monorepo Structure

```
apps/
  frontend/        # React 19 + Vite 8 + Tailwind 4 (deployed on Vercel)
  lumora-backend/  # Express 5 — live interview API (deployed on Railway)
  ascend-backend/  # Express 5 — prep/study API (deployed on Railway)
  ai-services/     # FastAPI (Python) — speaker verification, diagrams (Docker on Railway)
packages/
  shared-types/    # TypeScript types (User, Conversation, Subscription, etc.)
  shared-db/       # PostgreSQL pool (getPool, query, closePool) + migrations
  shared-auth/     # JWT auth (verifyToken, createToken, authenticate middleware, SSO cookie)
```

Package manager: **pnpm 9.15** with workspaces (`apps/*`, `packages/*`).

## Common Commands

```bash
# Frontend
pnpm dev:frontend          # Vite dev server (port 3000, proxies /api → localhost:8000)
pnpm build:frontend        # Vite production build → apps/frontend/dist/

# Lumora Backend
pnpm dev:lumora            # Express server (port 8000)
node --watch apps/lumora-backend/src/index.js   # Dev with auto-restart

# Ascend Backend
pnpm dev:ascend            # Express server (port 3009)
node --watch apps/ascend-backend/src/index.js   # Dev with auto-restart

# AI Services (Python)
uvicorn main:app --reload --port 8001   # From apps/ai-services/

# Tests (both backends use vitest)
cd apps/lumora-backend && npx vitest
cd apps/ascend-backend && npx vitest
cd apps/ascend-backend && npx vitest run tests/solve.test.js   # Single test

# Lint
cd apps/frontend && npx eslint .
```

## Architecture

### Frontend (`apps/frontend`)

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
- Runs DB migrations on startup (idempotent `CREATE TABLE IF NOT EXISTS`)
- Tables: `lumora_conversations`, `lumora_messages`, `lumora_usage_logs`, `lumora_bookmarks`, `lumora_quotas`, `coding_usage`

### Ascend Backend (`apps/ascend-backend`)

- ES6+ JavaScript, Express 5
- Routes mounted at `/api/v1/*` and some at `/api/*` in `src/index.js`
- Key services: `claude.js` (43KB), `openai.js` (30KB), `ascendPrep.js` (57KB — interview prep generation)
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
- `JWT_SECRET` / `JWT_SECRET_KEY` — JWT signing key
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` — AI model access
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — Payments
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth
- `AI_SERVICES_URL` (default: `http://localhost:8001`) — Python microservice
- `REDIS_URL` — Redis (ascend-backend only)

## Conventions

- **Internal navigation**: Use React Router `<Link>` or `useNavigate()` for internal routes. Use `<a>` only for external URLs (e.g., `https://jobs.cariara.com`).
- **Backend routes**: All API routes prefixed with `/api/v1/`. Stripe webhooks use raw body parsing.
- **Rate limiting**: Three tiers — `apiLimiter`, `aiLimiter`, `paymentLimiter` — applied per-route.
- **Error responses**: `{ error: string }` or `{ detail: string }` format.
- **Streaming responses**: SSE via `text/event-stream` content type, flushed per chunk.
- **File naming**: React components PascalCase (`.tsx`/`.jsx`), services/utils camelCase (`.ts`/`.js`).
- **Tailwind theme**: Primary emerald (#10b981), fonts Inter (display) + JetBrains Mono (code).

## Deployment

- **Frontend**: Vercel (auto-deploys, SPA rewrite to `index.html`)
- **Lumora Backend**: Railway (Nixpacks, `node src/index.js`, healthcheck at `/health`)
- **Ascend Backend**: Railway (Nixpacks, `node src/index.js`, healthcheck at `/health`)
- **AI Services**: Railway (Dockerfile, `uvicorn main:app`, healthcheck at `/health`)
