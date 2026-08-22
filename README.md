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

**Lumora** — Real-time AI interview co-pilot. Live mic transcription, instant answers from Sona, and contextual follow-ups — all during a live interview.

**Capra** — Interview prep platform. Study DSA, system design, behavioral topics, and DevOps challenges with AI-generated explanations, spaced repetition, and mock coding environments.

## Monorepo

| Package | Description | Deploy |
|---------|-------------|--------|
| `apps/camora` | React 19 + Vite 8 frontend | Vercel |
| `apps/lumora-backend` | Express 5 — live interview API | Railway |
| `apps/ascend-backend` | Express 5 — prep & study API, plus a Lumora route mirror | Railway |
| `apps/ai-services` | FastAPI — speaker verification & diagrams | Railway |
| `apps/code-runner` | Express — sandboxed code execution (port 4000) | Railway |
| `apps/playground-backend` | Express — hands-on k8s/etcd/linux lab sessions | Railway |
| `apps/desktop` | Electron 41 desktop shell | DMG |
| `apps/mobile` | Expo (React Native) iOS + Android | — |
| `apps/extension` | Browser extension — reads your open coding-problem tab | — |
| `packages/shared-*` | Shared types, DB pool, auth, LLM clients | — |

## Tech Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS 4, React Router DOM v7, Zustand
- **Backend**: Express 5, PostgreSQL, Redis, Anthropic SDK, Google Generative AI SDK, OpenAI SDK
- **AI**: Claude (Anthropic) powers lumora-backend; Gemini (Google) powers
  ascend-backend; OpenAI covers Whisper transcription and the fallback tail.
  The two services are deliberately kept on separate providers — see
  "LLM Provider Separation" in `CLAUDE.md` before changing a model call.
- **Auth**: Google OAuth → JWT → `cariara_sso` cookie
- **Payments**: Stripe subscriptions
- **RAG**: pgvector hybrid search (BM25 + cosine), HyDE, Cohere reranking, CRAG chunk grading, session warm-kit
- **AI providers** (lumora live answers): Claude (primary), Gemini, Qwen-2.5-72B, DeepSeek-V3, GPT-4o-mini (auto-fallback chain)
- **Voice**: Whisper transcription → sentence-boundary streaming → SSE token delivery
- **Behavioral**: Resume story parser → archetype-matched story anchor injection per question
