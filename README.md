<p align="center">
  <img src="apps/camora/public/camora-logo.png" width="120" alt="Camora" />
</p>

<h1 align="center">Camora</h1>

<p align="center">AI-powered interview platform — prepare smarter, perform better.</p>

<p align="center">
  <a href="https://camora.cariara.com">camora.cariara.com</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite_8-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Express_5-000000?style=flat&logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/Railway-0B0D0E?style=flat&logo=railway&logoColor=white" alt="Railway" />
</p>

---

## Products

**Lumora** — Real-time AI interview co-pilot. Live mic transcription, instant answers from Sona (Claude / GPT-4o / Gemini), and contextual follow-ups — all during a live interview.

**Capra** — Interview prep platform. Study DSA, system design, behavioral topics, and DevOps challenges with AI-generated explanations, spaced repetition, and mock coding environments.

## Monorepo

| Package | Description | Deploy |
|---------|-------------|--------|
| `apps/camora` | React 19 + Vite 8 frontend | Vercel |
| `apps/lumora-backend` | Express 5 — live interview API | Railway |
| `apps/ascend-backend` | Express 5 — prep & study API | Railway |
| `apps/ai-services` | FastAPI — speaker verification & diagrams | Railway |
| `apps/desktop` | Electron 41 desktop shell | DMG |
| `apps/mobile` | Expo (React Native) iOS + Android | — |
| `packages/shared-*` | Shared types, DB pool, auth | — |

## Tech Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS 4, React Router DOM v7, Zustand
- **Backend**: Express 5, PostgreSQL, Redis, Anthropic SDK, OpenAI SDK
- **AI**: Claude (Anthropic), GPT-4o (OpenAI), Gemini (Google)
- **Auth**: Google OAuth → JWT → `cariara_sso` cookie
- **Payments**: Stripe subscriptions
