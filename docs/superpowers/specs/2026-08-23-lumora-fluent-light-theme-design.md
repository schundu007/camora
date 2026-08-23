# Lumora light theme, rebuilt in Fluent

**Date:** 2026-08-23
**Status:** Approved (mockup reviewed 2026-08-23)
**Mockup:** https://claude.ai/code/artifact/ce778750-2740-4c35-b723-605b588dbd8c

## Goal

Rebuild the Lumora light theme to match Azure portal conventions, so the shell
reads as an operational console rather than consumer software, and so text
stays legible at a glance mid-interview.

## The problem, measured

Two failures compound.

**Contrast.** `--text-muted` (#647084) carries most of Lumora's text — 250 uses,
more than `--text-primary` at 212. It measures 3.7:1 against `--bg-surface`,
below the 4.5:1 floor for body text. `--text-dimmed` measures 2.1:1. On top of
these sit 192 opacity reductions, which multiply downward. In light theme the
text tokens pass, but the gold accent (#C2963E) measures 2.72:1 — and gold
carries the category labels and launch links.

**Type size.** Lumora's dominant size is 10px (239 uses), followed by 12px (188),
11px (137), and 9px (87). Eight-pixel text appears 11 times. Sixteen-pixel text
appears 36 times. That puts 337 instances at or below 10px.

Small type and weak contrast each survive alone. Together, at a glance, they do
not.

## Why the fix is architectural

The light theme is not a theme. Components branch on it inline:
`theme === 'light' ? 'var(--bg-elevated)' : 'var(--lumora-hero-gradient)'`.
Lumora contains 23 such branches across 4 files, plus 221 hardcoded hex literals
that ignore the theme entirely — #0A0E1A appears 19 times, #2B6394 16 times.

This rules out a CSS-only redesign. `SessionPanel.tsx` styles its elements with
inline `style={{…}}` objects, and inline styles outrank stylesheets in the
cascade. A `[data-theme="light"] .lumora-root { … }` override would be ignored on
exactly the elements that matter, and would fail silently rather than loudly.

The token layer must therefore absorb the branching, and components must stop
deciding their own colors.

## Design language

Microsoft Fluent, the system behind the Azure portal.

### Color

| Role | Value | Contrast on white |
|---|---|---|
| Body substrate | `#FAF9F8` | — |
| Card surface | `#FFFFFF` | — |
| Border | `#EDEBE9` | — |
| Border, stronger | `#E1DFDD` | — |
| Text primary | `#323130` | 12.98:1 |
| Text secondary | `#605E5C` | 6.46:1 |
| Accent | `#0078D4` | 4.53:1 |
| Accent, small text | `#005A9E` | 7.10:1 |
| Success | `#107C10` | 5.37:1 |
| Error | `#A4262C` | 7.26:1 |

`#0078D4` clears AA only just, so it applies to links and actions at 14px and
above. Small text takes `#005A9E`. Encode both as separate tokens so the
distinction survives future edits.

Gold leaves the Lumora light theme entirely.

### Type

Segoe UI first, Inter as the loaded fallback:
`'Segoe UI', Inter, system-ui, -apple-system, sans-serif`. Plus Jakarta Sans —
geometric and friendly — leaves Lumora; it fights the console register.

Sizes: 12, 13, 14, 16, 20, 24. Nothing below 12px. Section labels move from
10px gold micro-caps to 14px `#323130` headings with a rule beneath.

### Shape and depth

Radius drops from 12px to 2px. Borders carry depth; shadows stay near-invisible
(`0 .3px .9px`, `0 1.6px 3.6px`). The decorative radial gradients and the hero
glow are deleted.

## Scope

### Phase 1 — tokens plus `SessionPanel.tsx`

The screen already reviewed, as the reference implementation:

1. Add the Fluent token set to `globals.css` under `[data-theme="light"]`.
2. Delete the `theme === 'light'` ternaries in `SessionPanel.tsx`; read tokens.
3. Replace the four hardcoded copilot accents with one accent plus category tags.
4. Remove the two decorative gradients and the hero glow.
5. Raise every size below 12px to at least 12px.
6. Replace `max-w-2xl` with an auto-fit grid so content fills the window.
7. Add the command bar: New session, Microphone, Blank screen, Settings.
8. Convert the six prompt cards to one bordered list.

### Phase 2 — the rest of Lumora

Roll the same tokens through the remaining components once Phase 1 holds up in
use. Phase 2 is not specified here.

## Non-goals

- Dark theme. It keeps its current appearance; its contrast failures are
  recorded above and belong to a later pass.
- Capra. The token additions scope to `[data-theme="light"]` under Lumora.
- Layout beyond `SessionPanel`. Panels, rails, and tabs stay where they are.
- The 284 existing lint warnings.

## Verification

- Recompute every contrast pair after implementation; each must clear 4.5:1, and
  the accent pair must respect the 14px rule.
- Grep `SessionPanel.tsx` for `theme === 'light'` and for six-digit hex literals;
  both must return nothing.
- Grep the file for font sizes below 12px; must return nothing.
- `pnpm lint`, `tsc --noEmit`, and `pnpm build` must stay clean.
- Compare the rendered screen against the mockup.

## Risks

**Inline styles fight the token layer.** Any element still carrying an inline
color overrides the tokens silently. The greps under Verification catch this.

**The command bar changes behaviour, not just appearance.** It surfaces actions
that previously lived in the icon rail and keyboard shortcuts. If it crowds the
screen in use, drop it and keep the visual changes.

**Removing per-copilot accents flattens the cards.** Four white rectangles need a
differentiator; the tinted icon chip supplies it. Watch that the four stay
distinguishable at a glance.
