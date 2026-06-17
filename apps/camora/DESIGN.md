---
name: Camora
description: AI-powered interview platform — long-form study (Capra) plus live interview assistance (Lumora).
colors:
  # Primary — Linode/Akamai blue. Structure, actions, focus rings.
  accent: "#3683DC"
  accent-hover: "#2265BF"
  accent-text: "#2265BF"
  accent-subtle: "rgba(54,131,220,0.10)"
  # Secondary — warm gold. Signal, momentum, what's next. In light mode aliased to accent.
  gold-leaf: "#D4A043"
  gold-leaf-dk: "#B88930"
  gold-leaf-text: "#8A6B2A"
  gold-leaf-subtle: "color-mix(in oklab, #D4A043 8%, transparent)"
  # Danger — only hue outside blue + gold.
  danger: "#EF4444"
  # Backgrounds — dark default (charcoal substrate)
  bg-base: "#0A0A0C"
  bg-app: "#0E0E11"
  bg-surface: "#141417"
  bg-elevated: "#1C1C22"
  # Backgrounds — light theme (blue-tinted whites)
  light-bg-base: "#F3F7FC"
  light-bg-app: "#E6EEF8"
  light-bg-surface: "#EFF5FB"
  light-bg-elevated: "#F5F9FD"
  # Text — dark theme
  text-primary: "#F0EEE9"
  text-secondary: "#9BAAB8"
  text-muted: "#647084"
  text-dimmed: "#434B5C"
  # Text — light theme
  light-text-primary: "#12141A"
  light-text-secondary: "#464B54"
  light-text-muted: "#5E646B"
  # Borders
  border: "#26262E"
  border-hover: "#32323C"
  border-focus: "#3683DC"
  light-border: "#C8D9ED"
  light-border-hover: "#BBCFE4"
  # Semantic — navy reuse for success/info, gold for warning
  success: "#2563EB"
  warning: "#D4A043"
  info: "#2563EB"
  # Difficulty — weight/saturation-driven, not hue-driven
  easy: "#6B7280"
  medium: "#F0EEE9"
  hard: "#D4A043"
typography:
  display:
    fontFamily: "Clash Display, Satoshi, system-ui, sans-serif"
    fontSize: "31px"
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: "-0.016em"
  headline:
    fontFamily: "Satoshi, -apple-system, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.026em"
  title:
    fontFamily: "Clash Display, Satoshi, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.012em"
  body:
    fontFamily: "Nunito Sans, Satoshi, -apple-system, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "-0.003em"
  body-sm:
    fontFamily: "Nunito Sans, Satoshi, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "JetBrains Mono, IBM Plex Mono, ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.18em"
  section-label:
    fontFamily: "JetBrains Mono, IBM Plex Mono, ui-monospace, monospace"
    fontSize: "10.5px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    typography: "{typography.body-sm}"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "#FFFFFF"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-secondary-hover:
    backgroundColor: "transparent"
    textColor: "{colors.accent-text}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  card:
    backgroundColor: "{colors.bg-surface}"
    rounded: "{rounded.xl}"
    padding: "24px"
  card-sm:
    backgroundColor: "{colors.bg-surface}"
    rounded: "{rounded.md}"
    padding: "16px"
  chip-default:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  chip-active:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  tab-group-item-active:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "5px 14px"
  badge-primary:
    backgroundColor: "{colors.accent-subtle}"
    textColor: "{colors.accent}"
    rounded: "{rounded.xs}"
    padding: "2px 8px"
  badge-gold:
    backgroundColor: "{colors.gold-leaf-subtle}"
    textColor: "{colors.gold-leaf-text}"
    rounded: "{rounded.xs}"
    padding: "2px 8px"
  badge-danger:
    backgroundColor: "color-mix(in oklab, #EF4444 10%, transparent)"
    textColor: "{colors.danger}"
    rounded: "{rounded.xs}"
    padding: "2px 8px"
  input:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
---

# Design System: Camora

## 1. Overview

**Creative North Star: "The Navy Atlas"**

Camora is built for the focused evening study session — a software engineer at a desk with good light, 3 weeks out from an interview loop, going deep on system design or behavioral preparation. The interface must feel like a very good textbook that also knows your weaknesses: authoritative, efficient, never entertaining for its own sake. The Navy Atlas is the visual metaphor: a navigator's instrument, not a dashboard. Navy `#3683DC` is the structural metal of the instrument; gold `#D4A043` is the signal amber on the instrument face, pointing at what matters next.

The product spans two surfaces. **Capra** (the study product) is long-form: section headings, 72ch measure, sustained reading that earns trust through typographic precision. **Lumora** (the live interview AI) is dense and time-pressured: monospaced timers, status dots, citation tier badges, single-key affordances under 56px chrome. Both share the navy/gold discipline. Lumora leans denser and more cockpit-like; Capra leans editorial. Both use the same token layer — `[data-product]` adjusts the content max-width only (`--content-max: 760px` for Capra vs. 720px default).

The light theme is a Linode/iximiuz education aesthetic: blue-only, never gold in light mode. `--cam-gold-leaf` is intentionally aliased to `var(--accent)` in `[data-theme="light"]`. This is not a bug. A warm-gold accent on a white-blue substrate reads as amber-on-ice and breaks the educational instrument feel. Blue-only in light; navy-plus-gold in dark.

This system rejects, by name: the cluttered gamified visual noise of LeetCode; the bureaucratic depressing chrome of HackerRank; the pastel-card emoji-bullet kindergarten feel of generic SaaS academy products; the all-structure-no-hierarchy flatness of Notion-style wikis; the dark-mode-neon developer side-project aesthetic. It also rejects the SaaS hero-metric cliché (big number, small label, gradient accent) and the identical-card-grid filler pattern.

**Key Characteristics:**
- **Dual-theme, single token layer.** `:root` is dark (charcoal substrate, near-black). `[data-theme="light"]` overrides every token. No duplicated stylesheets.
- **Two accent roles, four uses.** Blue for primary actions, focus rings, structure markers, success/info states. Gold for signal, momentum, problem counts, agenda numerals, list markers, hard-difficulty badges. Only `--danger` (red) is a third hue, reserved for destructive states.
- **Hairline-first elevation.** Surfaces are flat at rest. 1px `var(--border)` carries every boundary. Shadows appear only on genuinely floating elements.
- **19px body floor on Capra prose.** `.prep-content` and `.docs-page` paragraphs render at 19px/1.75 with a 72ch measure cap. No prose ever drops below 16px at any breakpoint.
- **Named transitions, never `transition-all`.** Every interactive element specifies properties explicitly (`background-color 0.15s ease-out, border-color 0.15s ease-out`). A codebase-wide sweep enforces this.
- **`prefers-reduced-motion` honored at root.** The global `@media (prefers-reduced-motion: reduce)` block disables all keyframe animations and transitions in one place — `card-lift`, `ai-aurora`, `shimmer`, `sona-breathe`, view transitions.

## 2. Colors: The Navigator's Palette

A deliberately small palette: two saturated accents, each with a named role. Everything else is tinted neutral.

### Primary
- **Linode Blue** (`#3683DC`, hover `#2265BF`, text-safe `#2265BF`): primary actions ("Ask Sona"), focus rings (2px solid `rgba(54,131,220,0.55)`), section heading text in `.prep-content`, the 4px rounded navy strip on `h2::before`, blue-line underlines on `h2::after`, table header backgrounds, active chip/tab states. In dark mode this is also used for success and info semantic states, reducing the palette to effectively two saturated hues.

### Secondary
- **Warm Gold** (`#D4A043` dark, `#C2963E` light, text-safe `#8A6B2A`): signal and momentum. Hard-difficulty badge, agenda numerals, `::marker` bullets in unordered lists, Q&A answer labels (`.qa-a .qa-label`), warning semantic state. In light mode `--cam-gold-leaf` is aliased to `var(--accent)` — gold is not used in light mode at all. Never structural.

### Tertiary
- **Danger Red** (`#EF4444` dark, `#DC2626` light): destructive states only. Delete buttons, recording-state mic button (`SonaMicButton` in last 10s of 90s auto-stop), form error borders and helper text. Used as text color, full-saturation border, and `color-mix(in oklab, var(--danger) 14%, transparent)` background tint.

### Neutral
- **Dark surfaces**: `--bg-base: #0A0A0C`, `--bg-app: #0E0E11`, `--bg-surface: #141417`, `--bg-elevated: #1C1C22`. Charcoal ramp with no blue hue in the substrate — blue and gold appear as accents on neutral, not as the substrate.
- **Light surfaces**: `--bg-base: #F3F7FC`, `--bg-app: #E6EEF8`, `--bg-surface: #EFF5FB`, `--bg-elevated: #F5F9FD`. Cool blue-tinted whites — the Linode education palette.
- **Text (dark)**: `--text-primary: #F0EEE9` (warm white, 14.7:1), `--text-secondary: #9BAAB8` (cool slate), `--text-muted: #647084`, `--text-dimmed: #434B5C`.
- **Text (light)**: `--text-primary: #12141A`, `--text-secondary: #464B54`, `--text-muted: #5E646B`, `--text-dimmed: #6C737A`.
- **Borders (dark)**: `--border: #26262E`, `--border-hover: #32323C`. Hairlines only.
- **Borders (light)**: `--border: #C8D9ED`, `--border-hover: #BBCFE4`. Still hairlines.

### Named Rules
**The Two-Accent Rule.** Navy and gold are the only saturated colors that may carry meaning. Green for "success" reuses navy; warning reuses gold; only `--danger` introduces a third hue, and only for unambiguously destructive UI. If a proposed component reaches for teal, purple, or emerald, it violates this rule.

**The Surface-Wash Rule.** When a tint is needed (hover scrim, state background, subtle card tint), use `color-mix(in oklab, var(--token) X%, transparent)` against the existing surface. Never a hardcoded `rgba(...)`. The `color-mix` approach stays live-bound to the token and survives theme switches.

**The Light-Mode Gold Ban.** In `[data-theme="light"]`, `--cam-gold-leaf` is aliased to `var(--accent)` (`#3683DC`). This is intentional. A warm-gold accent on the blue-tinted white substrate reads as amber-on-ice and breaks the Linode/iximiuz education aesthetic. Do not restore gold in light mode.

## 3. Typography

**Display / Title Font:** Clash Display (with Satoshi, system-ui fallbacks). Geometric editorial cut. Used for section headings (`h2`, `h3`), viz-caption titles, and the brand wordmark.
**Body Font:** Nunito Sans (primary, set in `--font-sans`), Satoshi (fallback). Warm rounded geometric; renders well at 16-19px on both retina and standard displays. OpenType features `ss01, ss02, cv01, cv02` activated on `.prep-content` and `.docs-page`.
**Code / Label Font:** JetBrains Mono (primary), IBM Plex Mono (fallback). Used for eyebrows, status labels, timers, inline code, code blocks, badge text.

**Character:** The pairing leans technical-editorial. Clash Display's geometric weight gives headings authority without the SaaS-Inter sameness. Nunito Sans at 19px/1.75 on 72ch makes Capra's long-form content genuinely comfortable to read for 30-60 minute sessions. JetBrains Mono in 10px all-caps with 0.18em tracking gives the Lumora interface its cockpit-instrument feel without becoming decorative.

### Hierarchy

- **Headline** (Satoshi/Nunito Sans, 700, 40px / 1.08, `-0.026em`): `.heading-1`. Landing page hero text and the largest marketing display. `text-wrap: balance` on headings by default.
- **Display** (Clash Display, 700, 31px / 1.18, `-0.016em`, `text-wrap: balance`): `.prep-content > h2`, `.docs-page section > h2`. Section headings in topic pages and docs, paired with a navy 4px left-strip `::before` and a fading navy hairline `::after`.
- **Title** (Clash Display, 600, 18px / 1.25, `-0.012em`): `.viz-caption-title`. Figure captions and subsection titles. `text-wrap: balance`.
- **Body** (Nunito Sans, 400, 19px / 1.75, `-0.003em`, `max-width: 72ch`, `text-wrap: pretty`): `.prep-content > p`, `.docs-page p`. The primary reading surface for Capra topic content and docs pages.
- **Body-sm** (Nunito Sans, 400, 15px / 1.65): `.text-body`, card descriptions, supplementary prose outside `.prep-content`.
- **Eyebrow** (JetBrains Mono, 700, 10px / 1, `0.18em tracking`, uppercase): `.text-eyebrow`, `.viz-caption-eyebrow`. Figure sequence labels ("Diagram 1 / 3"), section IDs, status line prefixes.
- **Section Label** (JetBrains Mono, 600, 10.5px, `0.08em tracking`, uppercase): `.section-label`. Used in blue (`var(--accent-text)`) for inline "DESIGN" / "DSA" / "BEHAVIORAL" eyebrows on both themes.
- **Label** (Nunito Sans, 700, 11px / 1, `0.12em tracking`, uppercase): `.text-label`. Status chips, `heading-4` style labels, navigation eyebrows.

### Named Rules
**The 19px Prose Floor.** Body text inside `.prep-content` and `.docs-page` renders at 19px (not 16px). On mobile `<768px` the docs body drops to 14.5px, but `.answer-flow` enforces 15px minimum via `!important` override. No running prose anywhere in the application drops below 15px.

**The Display-for-Display-Only Rule.** Clash Display is for headings, titles, and the wordmark. It is never a body font. Body belongs to Nunito Sans / Satoshi.

**The Heading-Strip Rule.** Every `h2` in `.prep-content` and `.docs-page` carries a 4px rounded navy strip on `::before` (top/bottom inset 0.25em) and a fading navy gradient hairline on `::after` (max-width 18rem). Every `h3` carries an 8px navy hexagon glyph `::before` via `clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)`. These strips are structural — they set a reading rhythm across 1,400 topics. They are not decorative and must not be removed.

## 4. Elevation

This system is **flat by default with hairline borders**. Surfaces sit on the page via background tint and 1px `var(--border)`. The shadow vocabulary exists but is reserved for genuinely floating elements (topbar, popovers, modals, the Sona mic button's recording state). The light theme adds a subtle `inset 0 1px 0 rgba(255,255,255,0.9)` top highlight on `.card` to give surfaces a slight editorial-paper lift without adding depth complexity.

### Shadow Vocabulary
- **`--shadow-xs`** (`0 1px 2px rgba(0,0,0,0.4)` dark / `rgba(15,23,42,0.05)` light): Default rest shadow on `.btn` elements. Nearly invisible at rest; serves as a base layer for hover transitions.
- **`--shadow-sm`** (`0 1px 2px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.35)`): Card rest shadow (`--card-shadow`). Applied uniformly to `.card`, `.card-sm`, `.block-base`, `.grid-card`.
- **`--shadow-md`** (`0 2px 4px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.45)`): Floating chrome: topbar, sidebar drawer on mobile overlay.
- **`--shadow-lg`** (`0 4px 8px rgba(0,0,0,0.4), 0 12px 32px rgba(0,0,0,0.5)`): Popovers, dropdown menus.
- **`--shadow-xl`** (`0 8px 16px rgba(0,0,0,0.45), 0 24px 56px rgba(0,0,0,0.55)`): Modal scrims, command palette, Shepherd.js tour overlays.
- **`--shadow-accent-sm`** (`0 2px 8px rgba(37,99,235,0.22), 0 8px 24px rgba(37,99,235,0.12)`): Blue-tinted glow on `.btn-primary:hover`. Adds brand warmth to the hover state without looking generic.
- **`.card-lift:hover`**: `translateY(-2px)` + `0 6px 20px rgba(37,99,235,0.12), 0 2px 6px rgba(37,99,235,0.06)`. Applied to interactive topic cards and category panels. Combines motion + tinted shadow.
- **`.session-row:hover`**: `translateY(-2px)` + `0 10px 28px rgba(37,99,235,0.15)`. Session history cards get a stronger lift to reward cursor intent.

### Named Rules
**The Hairline-First Rule.** Every container starts with a 1px `var(--border)` border, no shadow. Add shadow only when the element needs to read as floating above the page (topbar, modal, popover). Never both a heavy border AND a heavy shadow on the same element.

**The Flat-at-Rest Rule.** Cards, panels, and containers have `--shadow-sm` as their rest shadow (nearly invisible). The shadow deepens only on state change (`hover`, `focus`, `.active`). A shadowed surface at rest competes with floating chrome for visual hierarchy.

## 5. Components

### Buttons
Uniform shape: `border-radius: 8px` (`--rounded.md`). All variants use named transitions (`background-color 0.15s ease-out, border-color 0.15s ease-out, color 0.15s ease-out`) — never `transition-all`. `:active` state compresses via `transform: scale(0.97)`. Every button carries `focus-visible:outline: 2px solid rgba(54,131,220,0.55)` with 2px offset.

- **Primary** (`.btn-primary`): Navy fill (`var(--accent)`), white text, `10px 20px` padding, 14px 600-weight sans. Hover deepens to `var(--accent-hover)` and adds `--shadow-accent-sm` glow. The canonical "Ask Sona" / "Save" action.
- **Secondary** (`.btn-secondary`): Transparent fill, `1px var(--border)` border, muted text. Hover shifts border to `var(--accent)`, text to `var(--accent-text)`. For destructive-adjacent secondary actions.
- **Ghost** (`.btn-ghost`): Transparent fill, `1px var(--border)` border, muted text, `8px 14px` padding (slightly tighter). Hover fills with `var(--bg-elevated)`. For utility actions in dense UI (session row controls, filter reset).
- **Danger** (`.btn-danger`): Red fill (`var(--danger)`), white text. Hover reduces opacity to 88%. Used only for actions with irreversible consequences (delete session, clear transcript).
- **Size modifiers**: `.btn-sm` (`6px 14px`, 12px type) and `.btn-lg` (`12px 24px`, 15px type) compose onto any variant.
- **Disabled**: `opacity: 0.5`, `cursor: not-allowed`. No color change.

### Chips and Tab Groups
Two distinct patterns for toggleable selection:

- **Filter Chips** (`.chip`): 12px 600-weight sans, `5px 12px` padding, full-pill radius, 1px border + surface background. Active state (`.chip-active`): navy fill, white text. In light mode, `[data-theme="light"] .chip-active` uses `var(--accent)`. Hover (inactive only): border darkens to `var(--border-hover)`, text to `var(--text-primary)`.
- **Segmented Tab Group** (`.tab-group` / `.tab-group-item`): 11px 700-weight JetBrains Mono, uppercase, `0.08em` tracking, `5px 14px` padding. Container has 3px inner padding, `var(--bg-elevated)` fill, 1px border. Active item (`.tab-group-item-active`): hardcoded `#3683DC` fill, white text. This survives theme switches because it's the action color, not a neutral.
- **Underline Tab Bar** (`.tab-bar` / `.tab-bar-item`): 13px 600-weight sans, `8px 16px` padding, 1px bottom border in `var(--border)`. Active item: `var(--accent)` text and 2px bottom border. For content-area secondary navigation (docs tabs, topic sub-nav).

### Cards / Containers
- **Corner Style**: `border-radius: 12px` on `.card`, `8px` on `.card-sm`, `.block-base`, `.grid-card`, `.input`, buttons.
- **Background**: `var(--bg-surface)` at rest. `var(--bg-elevated)` for nested headers and inline code backgrounds.
- **Shadow Strategy**: `--card-shadow` (`--shadow-sm`) at rest; no shadow on interaction unless `.card-lift` or `.card-glow` modifier is added. Light theme adds `inset 0 1px 0 rgba(255,255,255,0.9)` top highlight.
- **Border**: 1px `var(--border)` on all four sides. Hover shifts to `var(--border-hover)`. Interaction (`.card-lift:hover`): border shifts to `var(--accent)`.
- **Internal Padding**: `24px` (`.card`), `16px` (`.card-sm`), `1.125rem 1.5rem 1.25rem` (viz figcaption).
- **Side stripes**: A 4px `::before` strip is used on `.prep-content > h2` and `.qa-q` / `.qa-a` items as part of the reading rhythm convention. Never on card containers themselves — a card border is always four-sided.

### Inputs / Fields
- **Style**: 1px `var(--border)` border, `var(--bg-elevated)` fill, `border-radius: 8px`, 15px body text, `10px 16px` padding. Placeholder text in `var(--text-muted)`.
- **Focus**: `border-color: var(--accent)` + `box-shadow: 0 0 0 3px rgba(37,99,235,0.18)`. No outline override — uses the global `focus-visible` ring pattern.
- **Error**: Border to `var(--danger)`. Light-mode error adds `box-shadow: 0 0 0 3px rgba(220,38,38,0.12)`. Error helper text `role="alert"` in `var(--danger)`.
- **Disabled**: `opacity: 0.5`, `cursor: not-allowed`. No color change.
- **Mobile**: `font-size: 16px !important` on all inputs at `max-width: 767px` to prevent iOS auto-zoom.

### Badges
Read-only labels, never interactive. Distinguish from `.chip` (toggleable).

- **Structure**: 10px JetBrains Mono, 700, uppercase, `0.12em` tracking, `2px 8px` padding, `border-radius: 4px`.
- **`.badge-primary`**: Navy-tinted bg (`var(--accent)` at 12%), navy text, navy border at 25%.
- **`.badge-gold`**: Gold-tinted bg (`var(--cam-gold-leaf)` at 12%), gold-text (`#8A6B2A`), gold border at 25%.
- **`.badge-danger`**: Red-tinted bg (10%), red text, red border at 20%.
- **`.badge-muted`**: `var(--bg-elevated)` fill, muted text, hairline border. For neutral read-only labels.
- **`.badge-new`**: Navy-tinted bg via hardcoded `rgba(37,99,235,0.12)` with blue border. New feature callouts.

### Navigation
- **SiteNav (topbar)**: `--topbar-height: 56px`. Background from `--nav-bg` (`rgba(14,14,17,0.92)` dark, transparent in light over hero). Bottom hairline from `var(--border)`. Logo + wordmark left, nav links center-right, avatar dropdown rightmost. Transitions for scroll-blur behavior.
- **Lumora chrome nav**: Uses `var(--lumora-chrome-bg)` (the `--cam-hero-strip` dark radial gradient) as background, `var(--lumora-chrome-text)` for nav links. Light mode: `rgba(18,20,26,0.75)` text. Tab pills use `.lumora-tab-pill` with `view-transition-name: lumora-active-tab` for FLIP-morphed tab switching (300ms cubic-bezier(0.25, 1, 0.5, 1)).
- **Docs sidebar** (`.docs-sidebar-shell`): Plus Jakarta Sans nav font, 10.5px uppercase section labels in `var(--accent-text)`, 13.5px links with 8px border-radius hover. Active link gets `color-mix(in srgb, var(--accent) 10%, var(--bg-elevated))` fill and a 3px left border in `var(--accent)`.
- **On-this-page rail** (`.docs-rail-shell`): 12.5px links, left 1px border column tinted to 20% navy. Active link gets 8% navy fill and `border-radius: 0 6px 6px 0`.

### Visualization Figcaption (Signature Component)
The visual system's most distinctive surface. Every PNG diagram in Capra topic pages sits inside a `<figure>` with `.viz-figure` border and a `.viz-caption` editorial panel below.

- **Container**: `.viz-figure` — 8px radius, 1px `color-mix(in srgb, var(--accent) 20%, transparent)` border, 0.5px inner shadow, `var(--bg-surface)` fill.
- **Caption container**: `.viz-caption` — `1.125rem 1.5rem 1.25rem` padding, 1px bottom border, `color-mix(in oklab, var(--bg-elevated) 60%, transparent)` background (semi-transparent so the surface reads as distinct from the figure without being opaque).
- **Eyebrow**: `.viz-caption-eyebrow` — 10px JetBrains Mono, 700, uppercase, `0.18em` tracking, `var(--text-muted)` color, 0.625rem bottom margin.
- **Title**: `.viz-caption-title` — Clash Display, 18px / 1.25, 600, `-0.012em`, `var(--text-primary)`, `text-wrap: balance`.
- **Body**: `.viz-caption-body` — Nunito Sans, 16px / 1.7, `text-wrap: pretty`. Inline code gets navy-tinted bg via `color-mix(in oklab, var(--cam-primary) 10%, transparent)`.
- **Performance**: Wrapped `figure:has(> .viz-caption)` receives `content-visibility: auto; contain-intrinsic-size: 0 800px` — pages can render 60+ figures without upfront layout cost.

### Q&A Pairs (Signature Component)
Used in behavioral and LLD topic pages. A two-row pattern: question (navy-tinted) + answer (lighter navy-tinted), each with a mono badge label.

- **Q row**: `color-mix(in srgb, var(--accent) 12%, var(--bg-elevated))` background, 3px left border in `var(--accent)`, "Q" label in `var(--cam-primary)` fill.
- **A row**: Lighter tint (8%), same 3px left border. "A" label in `var(--cam-gold-leaf)` fill, near-black text (`#1a1200`) for contrast.
- **Note**: The 3px left border on `.qa-q` and `.qa-a` is an established semantic convention (Q vs. A visual separation), not a decorative side-stripe. It is scoped tightly and does not generalize to other components.

### Sona Mic Button (Signature Component)
The Lumora live-interview AI trigger. Three states, all with explicit CSS class-based transitions.

- **Idle**: 32px button, `--rounded.md`, elevated background, mic icon in `var(--text-muted)`.
- **Recording**: Background swaps to `color-mix(in oklab, var(--danger) 14%, transparent)`, border to 45% danger opacity, text/icon to full `var(--danger)`. A `mm:ss` JetBrains Mono timer appears beside it. Timer turns red in the last 10s of the 90s auto-stop.
- **Transcribing**: Three dots with staggered `sona-mic-dot-pulse` keyframes (`scale(1.3)` at 50%, `opacity: 0.6`). Respects `prefers-reduced-motion: reduce`.
- **Sona avatar**: `.sona-breathe` animation (4s ease-in-out `scale(1.04)` loop) keeps the AI presence visible between turns. Disabled by `prefers-reduced-motion`.

## 6. Do's and Don'ts

### Do:
- **Do** use `var(--accent)` (`#3683DC`) for structure (section heading text, primary actions, focus rings, active states, section strip markers). Use `var(--cam-gold-leaf)` for signal and momentum (hard difficulty badges, unordered list markers, Q&A answer labels, agenda numerals). These are the only two saturated accents.
- **Do** keep body prose at 19px in `.prep-content` and `.docs-page`. Constrain measure to 72ch via `max-width: 72ch`. The reading experience is the Capra product.
- **Do** use `color-mix(in oklab, var(--token) X%, transparent)` for tints, hover scrims, and state backgrounds. Never hardcode `rgba(...)` values.
- **Do** name every transition property explicitly: `transition: background-color 0.15s ease-out, border-color 0.15s ease-out`. The codebase-wide `transition-all` sweep is in place; don't reintroduce it.
- **Do** wire `focus-visible:outline: 2px solid rgba(54,131,220,0.55)` with `outline-offset: 2px` on every interactive element. Keyboard users are first-class.
- **Do** use the `.page-wrap` utility class on every public page's main content div for consistent max-width (`1280px`) and responsive gutters (`1rem → 1.5rem → 2rem`).
- **Do** include `prefers-reduced-motion` opt-outs for keyframe animations. The global block at the bottom of `globals.css` covers system utility classes; per-component animations need their own guards.
- **Do** use `content-visibility: auto` with `contain-intrinsic-size` on heavy off-screen sections. The viz figure pattern (`figure:has(> .viz-caption)`) is the established precedent.
- **Do** keep gold in dark mode only. In `[data-theme="light"]`, `--cam-gold-leaf` is `var(--accent)` — blue throughout, as intended.

### Don't:
- **Don't** use `border-left` or `border-right` greater than 1px as a decorative accent stripe on cards, list items, or callouts. The Q&A pattern is a semantic exception, tightly scoped. Everywhere else: full four-sided border + tinted background, or nothing. (Absolute ban from impeccable skill.)
- **Don't** use `background-clip: text` with a gradient fill. The `.ai-shimmer` and `.ai-gradient-text` classes exist only for strictly controlled streaming-state and decorative landing contexts. Do not apply gradient text to body copy, headings, or navigation. (Absolute ban.)
- **Don't** default to backdrop-blur glassmorphism on cards or panels. The codebase has `backdrop-filter` only on topbar chrome and the lumora-mobile-sheet. It is not a card pattern. (Absolute ban.)
- **Don't** use the hero-metric template (big number + small label + supporting stats + gradient accent). This is the SaaS cliché the product explicitly rejects. (Absolute ban.)
- **Don't** introduce a third saturated hue. Teal, green, purple, and orange are all violations of the Two-Accent Rule. State colors reuse navy (success, info) or gold (warning). Only red (`--danger`) is the sanctioned third hue, for destructive actions exclusively.
- **Don't** restore gold in light mode. The `--cam-gold-leaf: var(--accent)` alias in `[data-theme="light"]` is an intentional design decision matching the Linode/iximiuz education aesthetic. Not a bug. Not to be "fixed."
- **Don't** use LeetCode-style gamification chrome: XP bars, confetti animations, streaks, badge walls, progress rings. The `.celebration-badge` component is a restrained single-completion moment, not a recurring gamification pattern.
- **Don't** use `window.confirm`, `window.alert`, or `window.prompt`. All dialog logic goes through `dialogConfirm` / `dialogAlert` via `DialogProvider`.
- **Don't** use Mermaid.js for diagrams. Always Graphviz-generated PNGs served from the database cache (`ascend_diagram_cache` table).
- **Don't** use generic SVG icons or literal emoji characters (`✓`, `❌`, `✅`, `•`, `→`) in rendered component content. Custom icons from `Icons.jsx` or `logo.dev` only. Emojis in status log panels and onboarding steps are the single allowed exception (explicit thematic use as step prefixes: `⚡🔍🛡️🖥️`).
- **Don't** use `transition-all`. Name the properties. This was a codebase-wide sweep — enforce it on every new component.
- **Don't** hide destructive or primary actions behind hover-only affordances. Delete, clear, and close buttons must be visible at rest.
- **Don't** implement long-press, double-tap, or swipe gesture controls. Explicit click-once buttons only.
- **Don't** use Inter, Roboto, or system-default sans as the intentional body font. `var(--font-sans)` is Nunito Sans / Satoshi — use that.
