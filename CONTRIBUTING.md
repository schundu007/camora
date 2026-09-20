# Contributing to Camora

Thanks for being here. Camora is a working product with real users, so this guide is
mostly about the handful of conventions that are not obvious from reading the code — the
ones that will get a PR sent back if you miss them.

- [Before you start](#before-you-start)
- [Setup](#setup)
- [The one rule that catches everyone](#the-one-rule-that-catches-everyone)
- [Repo conventions](#repo-conventions)
- [Adding or fixing a prep topic](#adding-or-fixing-a-prep-topic)
- [Adding a diagram](#adding-a-diagram)
- [Before you open a PR](#before-you-open-a-pr)
- [Pull request flow](#pull-request-flow)
- [What will not be merged](#what-will-not-be-merged)

## Before you start

**Small fixes** — typos, a broken link, a wrong complexity in a topic, a bad diagram
layout, an accessibility bug: just open a PR. No issue needed.

**Anything larger** — a new feature, a new topic category, a refactor, a dependency
change: open an issue first and let's agree on the shape before you spend a weekend on it.

**Good first areas** are listed in the README. Prep content and diagrams are the easiest
places to land a real contribution, because neither needs a database or an API key.

## Setup

See [Run it locally](README.md#run-it-locally) in the README. The short version:

```bash
pnpm install
pnpm dev:camora        # http://localhost:3000
```

Front-end work — UI, design system, every Prepare topic page — needs **no API keys and no
database**. Only start a backend if your change touches one.

## The one rule that catches everyone

**`ascend-backend` must never spend an Anthropic key. `lumora-backend` does.**
Claude is Lumora's model; the prep backend answers on Gemini.

This is enforced by naming that actively works against you:

- `apps/ascend-backend/src/lib/_shared/llm.js` exports a function called
  **`getAnthropicClient()` that returns a Gemini client** wearing an Anthropic-shaped
  interface. Call sites read as Anthropic and are not.
- `apps/ascend-backend/src/services/claude.js` imports `GoogleGenerativeAI`. Its
  `getApiKey()` returns the **Gemini** key.
- Model strings like `claude-sonnet-4-6` scattered through `solve.js`, `analyze.js`,
  `fix.js` and `diagram.js` are arguments to those shims and are **ignored**. They are
  naming debt, not Anthropic calls.

There is a trap in the other direction too: `lumora-backend`'s own
`lib/_shared/llm.js` `getAnthropicClient()` is **also** a Gemini shim. Nothing imports it
today. If you import it in Lumora you will silently violate the rule while your code looks
correct.

`getAnthropicClient` is defined four separate times in `lumora-backend`, and three are the
real thing:

| Definition | Real Anthropic? |
|---|---|
| `services/claude.js` (the canonical one) | yes |
| `services/companyContext.js` | yes |
| `routes/coding.js` | yes |
| `lib/_shared/llm.js` | **no — Gemini** |

So `grep -rn getAnthropicClient` tells you nothing on its own. **Always check which module
a call site imports from.** And when auditing, grepping for `@anthropic-ai/sdk` is not
enough — a raw `fetch('https://api.anthropic.com/v1/messages')` has slipped past exactly
that check before. Grep for both, plus `x-api-key`.

> **Note:** `apps/ascend-backend/.env.example` currently still lists `ANTHROPIC_API_KEY`.
> That is leftover and is being removed — do not add one to your ascend `.env`.

## Repo conventions

**Diagrams.** Graphviz, rendered from a spec file, always.
- Never Mermaid.
- Never hand-coded SVG boxes and arrows.
- Never generated per request — diagrams are built ahead of time and served from
  `apps/camora/public/diagrams/<topic-id>/`.

**Topic content strings.** No Markdown inside them. `**bold**`, `*italic*` and emoji are
emitted literally by the render path and will show up as raw characters on the page. CLI
tokens use inline-code backticks (`` `readelf -h` ``), which render bold and coloured.

**Navigation.** React Router `<Link>` or `useNavigate()` for anything internal. A plain
`<a>` is only for genuinely external URLs.

**Styling.** Use the canonical utility classes in `apps/camora/src/styles/globals.css`
(`.tab-group`, `.chip`, `.badge-*`, `.btn-*`, `.page-wrap`) rather than inline Tailwind.
There are two design systems and they are deliberately not merged: Capra uses Microsoft
Fluent tokens globally, Lumora uses AWS Cloudscape scoped to `.lumora-shell-root`. Do not
make either one global.

**Colours.** `globals.css` is the source of truth. The primary is the Navy Atlas ramp
(`#26619C`, lightened to `#6E96C0` on the dark default); the accent is gold-leaf
`#D4A043`. `#10b981` is `--cam-success`, **not** the primary, whatever an old comment says.

**Dialogs.** No native `confirm()` / `alert()` / `prompt()`. Use `dialogConfirm` /
`dialogAlert`.

**Backend routes.** Everything under `/api/v1/`. Errors are `{ error: string }` or
`{ detail: string }`. Streaming is SSE via `text/event-stream`, flushed per chunk. Stripe
webhooks need `express.raw()` registered **before** `express.json()`, or signature
verification breaks.

**File naming.** React components PascalCase (`.tsx` / `.jsx`); services and utils
camelCase (`.ts` / `.js`).

**Database.** There is no migration tool. Both backends run idempotent
`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` on boot. Add your
DDL there. All queries are parameterized — never interpolate into SQL.

## Adding or fixing a prep topic

Topics live in `apps/camora/src/data/capra/topics/` (71 files, grouped by domain). Each
module exports three things: a categories array, a `topicCategoryMap` from topic id to
category id, and the topics themselves.

Wiring a topic in takes four edits, and **missing any one of them fails silently**:

1. Add the topic object to the right `*Topics.js` file.
2. Add its id to that file's `topicCategoryMap`.
3. Make sure the loader imports and merges your module.
4. If it should appear for a specific job role, add its id in
   `apps/camora/src/data/capra/jobRoleTopicMapping.ts`.

The page renders `filteredTopics.filter(t => map[t.id] === category.id)`, so a topic that
is missing from the map renders nowhere, and a map entry with no topic renders nothing.
Neither throws. `apps/camora/src/data/capra/topics/catalog-integrity.test.ts` exists
precisely to make those failures loud — it mirrors the loader's merge, so if you change
how the loader merges, change the test with it. Run it:

```bash
cd apps/camora && npx vitest run src/data/capra/topics/catalog-integrity.test.ts
```

Content bar: a topic should teach the thing, not summarise it. Long-form prose over bullet
soup, a real diagram, concrete numbers, and the trade-offs an interviewer will actually
push on.

## Adding a diagram

1. Write a left-to-right spec at `apps/camora/scripts/specs/<topic-id>.json`.
2. Render it — the per-topic generators live in `apps/camora/scripts/` as
   `gen-<topic>-diagrams.py`.
3. Output lands in `apps/camora/public/diagrams/<topic-id>/`.
4. Register it in `apps/camora/src/data/capra/topics/__generated/diagram-manifests.ts`,
   which gates what the page will load.

Watch the aspect ratios — Graphviz will happily emit something 8:1 that looks broken in the
page's diagram frame.

## Before you open a PR

```bash
cd apps/camora          && npx eslint . && npx vite build
cd apps/lumora-backend  && npx vitest
cd apps/ascend-backend  && npx vitest
```

Run the **full `vite build`**, not a filtered type-check. It catches things a narrower
check does not — including a Rolldown quirk where a module-level `function` returning JSX
becomes a `const` and throws a temporal-dead-zone error at runtime. Declare component-local
helpers as `const` arrow functions inside the component.

## Pull request flow

1. Fork, branch off `main`.
2. Keep the PR focused. One concern per PR; unrelated cleanup in its own PR.
3. Write a commit message that says *why*, not just *what*.
4. Fill in the PR template — especially the testing section. "Ran the build" is not
   testing; say what you actually exercised.
5. A maintainer reviews. Expect questions; they are not an objection.

By contributing you agree your work is licensed under [AGPL-3.0](LICENSE).

## What will not be merged

- Mermaid diagrams, or hand-coded SVG boxes and arrows.
- Anthropic calls added to `ascend-backend`.
- Markdown syntax inside topic content strings.
- Opportunistic rewrites of code the PR did not need to touch.
- Secrets, real API keys, or `.env` files. If you commit one, rotate it immediately and
  tell us — see [SECURITY.md](SECURITY.md).
- Dependency additions without a reason in the PR description.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be decent to people.
