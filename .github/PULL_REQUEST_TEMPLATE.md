## What this changes

<!-- One or two sentences. What is different after this PR? -->

## Why

<!-- The problem being solved. Link the issue if there is one: Fixes #123 -->

## How to check it

<!-- How a reviewer reproduces the before/after. Be specific: which page, which
     command, which input. "Ran the build" is not testing. -->

## Testing done

- [ ] `cd apps/camora && npx eslint .`
- [ ] `cd apps/camora && npx vite build` (the full build, not a filtered type-check)
- [ ] `cd apps/lumora-backend && npx vitest` (if it touches lumora-backend)
- [ ] `cd apps/ascend-backend && npx vitest` (if it touches ascend-backend)
- [ ] Exercised the change by hand in the running app

## Screenshots

<!-- Required for any visible UI change. Before and after, please. Redact your name,
     email and any resume content. -->

## Checklist

- [ ] Scoped to one concern — no unrelated refactors riding along
- [ ] No Anthropic call added to `ascend-backend` (see CONTRIBUTING.md)
- [ ] Diagrams are Graphviz-rendered — no Mermaid, no hand-coded SVG
- [ ] No Markdown syntax (`**bold**`, emoji) inside topic content strings
- [ ] Internal links use React Router `<Link>` / `useNavigate()`, not `<a>`
- [ ] New topics are wired into the topic file, the category map, the loader, and the
      job-role map where relevant
- [ ] No secrets, keys or `.env` files committed
- [ ] I agree to license this contribution under AGPL-3.0
