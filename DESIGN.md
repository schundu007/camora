---
name: Camora
description: AI-powered interview platform — long-form study (Capra) plus live interview assistance (Lumora).
colors:
  primary: "#26619C"            # Lapis navy. Structure, primary actions, section markers.
  primary-lt: "#3C7AAB"
  primary-dk: "#1A4F86"
  gold-leaf: "#C9A227"          # Signal + momentum. Eyebrow accents, problem counts, gold-leaf hairlines.
  gold-leaf-text: "#7A5C0A"     # Text-safe darkened gold for body labels.
  bg-base: "#FFFFFF"
  bg-app: "#FFFFFF"
  bg-surface: "#FFFFFF"
  bg-elevated: "#F1F5F9"
  text-primary: "#000000"
  text-secondary: "#0F172A"
  text-muted: "#1E293B"
  text-dimmed: "#334155"
  border: "#E2E8F0"
  border-hover: "#CBD5E1"
  border-focus: "#38BDF8"
  success: "#26619C"            # Navy reuse: success = "ready / live", not "green check".
  warning: "#C9A227"
  danger: "#EF4444"
  info: "#26619C"
  # Dark-mode parallels live in globals.css :root[data-theme="dark"].
  # Sidecar (.impeccable/design.json) carries the full ramp.
typography:
  display:
    fontFamily: "Clash Display, Satoshi, sans-serif"
    fontSize: "1.625rem"        # 26px — used for .prep-content section h2
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: "-0.016em"
  title:
    fontFamily: "Clash Display, Satoshi, sans-serif"
    fontSize: "1.125rem"        # 18px — viz-caption-title
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.012em"
  body:
    fontFamily: "Satoshi, Plus Jakarta Sans, -apple-system, sans-serif"
    fontSize: "1rem"            # 16px floor
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "-0.003em"
  body-figure:
    fontFamily: "Satoshi, Plus Jakarta Sans, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
  label:
    fontFamily: "JetBrains Mono, IBM Plex Mono, ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.18em"     # uppercase
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "3rem"               # .prep-content > h2 margin-top
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "0.375rem 0.75rem"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.primary-dk}"
    textColor: "#FFFFFF"
  button-primary-disabled:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
  button-icon:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    size: "32px"
  button-icon-recording:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
  pill-default:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
    typography: "{typography.label}"
  card-surface:
    backgroundColor: "{colors.bg-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  badge-tier-kb:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
    typography: "{typography.label}"
  badge-tier-yours:
    backgroundColor: "{colors.gold-leaf}"
    textColor: "{colors.gold-leaf-text}"
    rounded: "{rounded.sm}"
---

# Design System: Camora

## 1. Overview

**Creative North Star: "The Navy Atlas"**

Camora is a navigator's instrument for interview preparation. Navy `#26619C` is the institution: it carries hierarchy, marks structure, anchors primary actions. Gold leaf `#C9A227` is the signal: it points at momentum and the next actionable focus, used in flashes (problem counts, agenda numerals, eyebrow markers, hairlines under section headings). The rest is editorial neutral. The aesthetic mood is a very good textbook that also knows your weaknesses, never a gamified feed.

The product spans two surfaces. **Capra** (study) is long-form: 1,400+ topic deep-dives where typography, measure, and rhythm have to make sustained reading comfortable. **Lumora** (live interview) is dense and time-pressured: small monospaced timers, status dots, citation tiers, single-key affordances. Both share the navy/gold discipline; Lumora leans denser, Capra leans editorial.

What this system rejects (sourced verbatim from `PRODUCT.md` anti-references): the cluttered, gamified, visually-noisy aesthetic of LeetCode; the bureaucratic depressing UI of HackerRank; the pastel-card emoji-bullet kindergarten feel of generic SaaS "academy" products; the all-structure-no-hierarchy flatness of Notion-style wikis; and the dark-mode-neon "developer side project" aesthetic that screams unfinished.

**Key Characteristics:**
- **Restrained color strategy.** Two named accents (navy + gold), each with a defined role. Everything else is neutral.
- **Editorial type system.** Clash Display for display + title, Satoshi for body, Source Serif 4 for Sona answers, JetBrains Mono for labels and code.
- **OpenType features on by default** in `.prep-content` (`ss01`, `ss02`, `cv01`, `cv02`).
- **16px body floor** with `text-wrap: pretty` for prose, `text-wrap: balance` for headings.
- **Light + dark themes via tokens**, not duplicated stylesheets. Dark mode swaps to charcoal surfaces, navy gets lifted to `#6E96C0` for ≥7:1 contrast.

## 2. Colors

The palette is deliberately small. Navy carries structure, gold carries signal, and everything else is text on tinted neutral.

### Primary
- **Lapis Navy** (`#26619C`, dark `#1A4F86`, light `#3C7AAB`): primary actions ("Ask Sona"), section heading text, structure markers (left-strip on `.prep-content > h2`, sidebar accents, focus rings). In dark mode this lifts to `#6E96C0` at 7.4:1 contrast on `--bg-app`.

### Secondary
- **Gold Leaf** (`#C9A227`, text-safe `#7A5C0A`): signal and momentum. Agenda numerals, the gold-leaf hairline under section headings, the YOURS-tier citation badge, problem counts on topic header cards. Never structural; always announces "this is what's next or what's yours."

### Tertiary
- **Danger Red** (`#EF4444`, dark `#F87171`): destructive states and the recording state on `SonaMicButton`. Used as text color, full-saturation border, and `color-mix(in oklab, var(--danger) 14%, transparent)` background tint.

### Neutral
- **Surfaces** (light): `--bg-app: #FFFFFF`, `--bg-surface: #FFFFFF`, `--bg-elevated: #F1F5F9`. Tinted toward cool slate.
- **Surfaces** (dark): `--bg-app: #11141A`, `--bg-surface: #1A1E26`, `--bg-elevated: #232830`. Tinted toward warm charcoal so navy reads correctly against it.
- **Text** (light): `--text-primary: #000000`, `--text-secondary: #0F172A`, `--text-muted: #1E293B`, `--text-dimmed: #334155`.
- **Text** (dark): `--text-primary: #F5F0E5` (14.7:1), `--text-secondary: #E5DFD0` (12.8:1), `--text-muted: #C8C2B0` (9.6:1).
- **Borders**: `--border: #E2E8F0` (light), `#2E343F` (dark). Hairlines only.

### Named Rules
**The Two-Accent Rule.** Navy and gold are the only saturated colors that may carry meaning. Green tier badges, purple gradient buttons, teal callouts: all violations. State colors (`--success`, `--info`) intentionally reuse navy so the palette stays disciplined; `--warning` reuses gold; only `--danger` introduces a third hue and only for unambiguously destructive UI.

**The Surface-Wash Rule.** When a tint is needed (subtle backgrounds, hover states, error scrims), use `color-mix(in oklab, var(--token) X%, transparent)` against the existing surface. Never a hardcoded `rgba(...)`.

## 3. Typography

**Display Font:** Clash Display (with Satoshi fallback). Editorial weight, geometric, used for display + title roles.
**Body Font:** Satoshi (with Plus Jakarta Sans, system fallbacks). Set with `font-feature-settings: 'ss01', 'ss02', 'cv01', 'cv02'` in `.prep-content`.
**Label / Mono Font:** JetBrains Mono (with IBM Plex Mono, ui-monospace fallbacks). Used for eyebrows, IDs, timers, code.
**Sona Answer Heading Font:** Source Serif 4. Reserved for the live-interview answer surface; gives Sona's responses a distinct editorial voice.

**Character:** Geometric-but-warm sans pairing with a serif "moment" inside Sona answers. The pairing avoids the SaaS-Inter cliché while staying legible at study-length distances.

### Hierarchy

- **Display** (Clash Display, 700, 26px / 1.18, `-0.016em`): `.prep-content > h2`. Section headings on topic pages, paired with a navy left-strip and a gold hairline `::after`.
- **Title** (Clash Display, 600, 18px / 1.25, `-0.012em`, `text-wrap: balance`): `.viz-caption-title`. Figure captions, callout headings.
- **Body** (Satoshi, 400, 16px / 1.75, `-0.003em`, `max-width: 72ch`, `text-wrap: pretty`): `.prep-content > p`, `.docs-page p`. The reading surface.
- **Body Figure** (Satoshi, 400, 16px / 1.7, `max-width: 70ch`, `text-wrap: pretty`): `.viz-caption-body`. Same family + size as body, slightly tighter leading because figure captions sit inside framed surfaces.
- **Label** (JetBrains Mono, 700, 10px, `0.18em`, uppercase): `.viz-caption-eyebrow`, status tags, timer mm:ss, agenda numerals, citation tier badges.

### Named Rules
**The 16px Floor Rule.** No body-mode prose ever drops below 16px. Captions and labels can be 10-12px; running text never can. Even the narrow-viewport breakpoint on `.viz-caption-body` keeps the body at 16px and only trims the title.

**The Display-For-Display-Only Rule.** Clash Display is for headings, titles, and the brand wordmark. It is never a body font. Body always belongs to Satoshi.

## 4. Elevation

This system is **flat by default with hairline borders, not shadows**. Surfaces sit on the page via background tint and 1px `var(--border)` borders. The shadow vocabulary in `globals.css` exists but is reserved for genuinely-floating elements (the SiteNav strip, command palette, modal scrims).

### Shadow Vocabulary
- **`--shadow-xs`** (`0 1px 2px rgba(56,189,248,0.06)`): default rest shadow on `.btn`. Almost imperceptible.
- **`--shadow-sm`** (`0 2px 6px rgba(56,189,248,0.08)`): hover state, button press feedback.
- **`--shadow-md`** (`0 4px 12px rgba(56,189,248,0.10)`): floating chrome (topbar, sidebar drawer).
- **`--shadow-lg`** (`0 8px 24px rgba(56,189,248,0.12)`): popovers, dropdowns.
- **`--shadow-xl`** (`0 16px 48px rgba(56,189,248,0.15)`): modal scrims, command palette.

Note: the shadow chroma is tinted with the navy hue (`56,189,248` is sky-blue rgb), giving a cool ambient cast rather than neutral grey. This was a deliberate choice; do not switch to neutral grey shadows.

### Named Rules
**The Hairline-First Rule.** Every container starts with a 1px `var(--border)` border, no shadow. Add shadow only when the element needs to read as floating above the page (topbar, modal, popover). Never both a heavy border AND a heavy shadow.

## 5. Components

### Buttons
- **Shape:** `border-radius: 8px` (`--rounded.md`), 32px height for icon buttons, `padding: 0.375rem 0.75rem` for label buttons.
- **Primary** (`button-primary`): navy background, white text, gold-leaf focus ring via `focus-visible:ring-2 focus-visible:ring-[var(--cam-primary)]`. The "Ask Sona" pattern.
- **Icon** (`SonaMicButton`, Back button): elevated background (`var(--bg-elevated)`), muted text color, 32×32, focus-visible ring.
- **Recording state**: background swaps to `color-mix(in oklab, var(--danger) 14%, transparent)`, border to `45%`, text/icon to full `var(--danger)`.
- **Hover / Focus:** 0.15s `ease-out` on `background-color, border-color, color`. Never `transition-all` (per the recent project-wide motion polish).

### Pills / Badges
- **Pill** (`.pill`): 12px sans, 500 weight, `4px 12px` padding, full-pill rounded, 1px border + surface bg.
- **Tier badge** (Citations): 9px mono, 700 weight, uppercase, `0.14em` tracking, color-and-bg coded by tier (KB navy, YOURS gold, CODE green pending colorize collapse to gold).
- **Eyebrow** (`viz-caption-eyebrow`): 10px mono, 700, `0.18em` tracking, `--text-muted` color (pending colorize promotion to navy).

### Cards / Containers
- **Corner Style:** `border-radius: 8px` (12px on larger cards).
- **Background:** `var(--bg-surface)` rest, `var(--bg-elevated)` for nested headers (figcaptions, agenda banners).
- **Shadow Strategy:** None at rest. Hairline border carries the boundary.
- **Border:** 1px `var(--border)` on all four sides; never a side-stripe greater than 1px.
- **Internal Padding:** `1.125rem 1.5rem 1.25rem` (figcaptions), `1rem` (small surfaces), `1.5rem` (large topic content blocks).

### Inputs / Fields
- **Style:** Border `1px var(--border)`, background `var(--bg-elevated)`, radius `8px`, body typography.
- **Focus:** `focus-visible:ring-2 focus-visible:ring-[var(--cam-primary)]/30` (navy-tinted, 30% opacity).
- **Error:** Border switches to `var(--danger)`; helper text `role="alert"` in `var(--danger)` mono.
- **Disabled:** `opacity: 0.4-0.6`, `cursor-not-allowed`.

### Navigation
- **SiteNav (top bar)**: charcoal-tinted bg, gold-leaf bottom hairline, navy hover state. Back button left of wordmark on every non-landing page.
- **Capra DocsPage breadcrumb**: sticky top, sentence-case section names with gold chevrons, Back button left-flush.
- **Lumora shell topbar**: minimal — Back / Prepare / Pricing / theme toggle / avatar.

### Visualization Figcaption (signature component)
- 10px mono eyebrow ("Diagram 1 / 3") in `--text-muted`.
- 18px Clash Display title in `--text-primary`, `text-wrap: balance`.
- 16px Satoshi body in `--text-primary`, `line-height: 1.7`, `max-width: 70ch`.
- Inline `code` gets `color-mix(in oklab, var(--cam-primary) 10%, transparent)` background.
- Padding: `1.125rem 1.5rem 1.25rem` desktop, tightens on `<768px`.
- Background: `color-mix(in oklab, var(--bg-elevated) 60%, transparent)` so the caption blends into the figure but stays distinct from prose.

### Sona Mic Button (signature component)
- 32×32 square, `--rounded.md`, three states (idle / recording / transcribing).
- Recording shows a navy-mono `mm:ss` timer next to it; turns `var(--danger)` in the last 10s of the 90s safety auto-stop.
- Transcribing shows three dots with staggered `sona-mic-dot-pulse` keyframes; respects `prefers-reduced-motion`.
- Errors render `role="alert"` inline below the row, never as a tooltip.

## 6. Do's and Don'ts

### Do:
- **Do** use `var(--cam-primary)` (navy) for structure (section heading text, primary actions, focus rings, sidebar accents) and `var(--cam-gold-leaf)` (gold) for signal (agenda numerals, problem counts, hairlines, "what's next" markers). Two accent roles, both named, both consistent across every screen.
- **Do** keep body text at 16px or larger and constrain measure to 65-75ch via `max-width: 70ch` (or 72ch in `.prep-content`). The reading experience is the product on Capra.
- **Do** use `color-mix(in oklab, var(--token) X%, transparent)` for tints, hover scrims, and state backgrounds. Never hardcode `rgba(...)`.
- **Do** use the custom `<Icon name="..." />` component from `apps/camora/src/components/shared/Icons.jsx` for all UI icons. Inline SVG paths are only acceptable when there's no equivalent in the icon library, and only for one-shot icons that won't be reused.
- **Do** name transitions explicitly (`transition: background-color 0.15s ease-out, border-color 0.15s ease-out`). Tailwind's `transition-all` was scrubbed from the codebase in the recent polish pass.
- **Do** include `prefers-reduced-motion` opt-outs for any keyframe animation. The pattern is a `useEffect` hook checking `matchMedia('(prefers-reduced-motion: reduce)')`.
- **Do** wire `focus-visible:ring-2` (with `ring-offset-1` and `ring-offset-[var(--bg-surface)]`) on every interactive element. Keyboard users are first-class.
- **Do** quote PRODUCT.md anti-references when reviewing new design work. The strategic line should carry into the visual spec.

### Don't:
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe. Use a full hairline border + a tinted background, or a navy left-strip on `::before` only inside `.prep-content > h2` where the convention is established. (Listed as an absolute ban in `impeccable` skill.)
- **Don't** introduce a third saturated hue. Green for "success" reuses navy; warning reuses gold; only `--danger` (red) is allowed beyond navy + gold, and only for destructive actions. The CODE-tier citation badge is a known violation pending consolidation.
- **Don't** use `#000` for `--text-primary`. The light-mode token is currently `#000000` (a real bug, captured here so it can be fixed); per the impeccable skill, every neutral should be tinted toward the brand hue (chroma 0.005-0.01). Replace with `oklch(15% 0.015 250)` or similar before the next design pass.
- **Don't** use Inter, Roboto, or system-default sans for body. Satoshi is loaded; use `var(--font-sans)`.
- **Don't** apply gradient text via `background-clip: text`. Decorative, never meaningful. Use a single solid color; emphasis via weight or size. (Absolute ban.)
- **Don't** default to glassmorphism (backdrop-blur cards, frosted overlays). Rare and purposeful, or nothing. (Absolute ban.)
- **Don't** wrap dialog logic in native `window.confirm` / `alert` / `prompt`. Use the project's `dialogConfirm` / `dialogAlert` via `DialogProvider`. (Project memory: "In-App Dialogs".)
- **Don't** use Mermaid for diagrams. Always Graphviz/Python-generated PNGs served from cache. (Project memory: "No Mermaid Diagrams".)
- **Don't** use generic SVGs or emojis (`✓ ❌ ✅ • →`). Custom Icons or `logo.dev` only. Many `.viz-caption-body` strings still contain literal emojis from earlier authoring; sweep them out as topic data is updated.
- **Don't** rely on hover-only affordances. Destructive buttons (delete, clear, X) must be visible at rest. (Project memory: "Visible Destructive Buttons".)
- **Don't** use long-press, double-tap, or any gesture interaction. Explicit click-once buttons only. (Project memory: "No Gesture Controls".)
- **Don't** use `transition-all`. Name the properties you're transitioning. (Recent codebase-wide polish: every `transition-all` was rewritten to targeted properties.)
- **Don't** route every design question to the same prompt. Application designs (LRU cache), distributed systems (Twitter), and infrastructure components (CDN) get distinct prompts and diagram styles. (Today's Plan A-D refactor.)
