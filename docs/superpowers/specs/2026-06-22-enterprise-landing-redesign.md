# Enterprise Landing Page Redesign

**Date:** 2026-06-22  
**Status:** Approved  
**Scope:** `apps/camora/src/pages/LandingPage.tsx` + `src/components/marketing/primitives.tsx`

---

## Problem Statement

The light-theme landing page at `camora.cariara.com` has three competing visual languages colliding on the same page:

1. **Dark space-AI hero** — multicolored aurora orbs (blue + purple), floating particles, diagonal beam, noise texture. Designed for dark context; in light mode the page immediately fractures.
2. **Rainbow logo strip** — Google, Microsoft, Meta, Amazon logos each import 3–4 distinct hues with no relationship to Camora's palette.
3. **Flat light body** — alternating `--bg-surface` / `--bg-elevated` zebra sections with gold + blue accents competing for attention, no clear hierarchy.

Result: a page that looks like a startup playground, not an enterprise career platform.

---

## Design Direction

**Option A — Simplified dark hero + disciplined light body** (chosen).

Keep the dark hero (copy and layout are strong). Remove all animation noise. Rebuild the light body with a single accent color and strong typographic hierarchy. This is the Stripe/Linear pattern: commanding dark hero, then a clean editorial light body.

---

## Palette (Light Theme)

| Role | Token / Value | Notes |
|------|--------------|-------|
| Body background | `#F4F6FA` (`--bg-surface`) | All sections share this |
| Cards / elevated surfaces | `#FFFFFF` (`--bg-elevated`) | Cards only |
| Body text | `#12141A` (`--text-primary`) | Unchanged |
| Secondary text | `#464B54` (`--text-secondary`) | Unchanged |
| Sole accent (light body) | `#3683DC` (`--cam-primary`) | Blue only — no gold in light body |
| Section dividers | `#C8D9ED` (`--border`) | 1px `border-b`, no alternating bg |
| Company logos | `filter: grayscale(1); opacity: 0.5` | CSS-only, no asset change |
| Gold accent | Dark hero + APPA dark card + final CTA only | Never on white/light surfaces |

---

## Section-by-Section Changes

### 1. Hero (`<section className="relative overflow-hidden bg-[#080B14]">`)

**Remove (zero functional impact, maximum visual noise reduction):**

| Element | What to remove |
|---------|---------------|
| Aurora gradient div | The entire `aria-hidden` div with `heroOrbs` animation and 6-layer radial gradient |
| Drifting orb 1 | `<div>` with `heroDrift1` animation, `width:500` |
| Drifting orb 2 | `<div>` with `heroDrift2` animation, `width:400` |
| Floating tech nodes | The `{[...].map(...)}` block generating 6 glowing `<span>` dots |
| Diagonal light beam | The `<div>` with `rotate(-18deg)` and `blur(32px)` |
| Noise texture | The `<div>` with the inline `feTurbulence` SVG data URI |
| All hero `@keyframes` | `heroOrbs`, `heroDrift1`, `heroDrift2`, `heroFloat` — all 4 |

**Replace background with:**
```
background:
  radial-gradient(ellipse 55% 70% at 18% 40%, rgba(54,131,220,0.18), transparent 60%),
  linear-gradient(160deg, #080B14 0%, #0C1120 60%, #10172E 100%);
```
One cool blue glow anchored left. Grid overlay stays (opacity 0.15). Bottom accent glow line stays.

**Unchanged:** Headline, pill badge, CTAs, VisitorCountLine, motion enter animations, `LiveSessionPreview` section below hero.

---

### 2. Logo Strip

**One change — grayscale all logos:**

Add to each `<img>` in the logo strip:
```tsx
style={{ filter: 'grayscale(1)', opacity: 0.5 }}
```
Add hover handlers:
```tsx
onMouseEnter={e => { (e.target as HTMLImageElement).style.opacity = '0.75'; }}
onMouseLeave={e => { (e.target as HTMLImageElement).style.opacity = '0.5'; }}
```

The `COMPANY_LOGOS` array and scrolling animation are unchanged.

---

### 3. Section Backgrounds — Unify the Zebra

**Problem:** Alternating `tone="surface"` and `tone="muted"` creates a low-contrast zebra that signals "generic template."

**Fix:** All `Section` components in the body use `tone="surface"`. Sections are separated by adding `className="border-b border-[var(--border)]"` directly to each `Section` call in `LandingPage.tsx` (not to the primitive — avoids unintended side-effects on the final CTA section which sits above the footer).

Sections to change `tone="muted"` → `tone="surface"` + add border-b:
- Capability Deck section
- Features Bento section  
- Job URL Analysis section
- Two Audiences section
- Testimonials section

The final CTA `Section` (`tone="surface"` wrapper around the dark card) gets no border-b.

---

### 4. Feature Cards — Visual Weight

**Problem:** In light mode, the `<f.Anim />` animation blocks inside each card render as dark-background boxes that look like broken embed slots. Cards have no visual anchor.

**Changes:**

**A) Left-border accent stripe on each `SurfaceCard` in the features grid:**
```tsx
className="h-full group border-l-2 border-[var(--accent)]"
```

**B) Remove in-card animation preview block entirely:**
```tsx
// Remove this block from each feature card:
<div className="mt-5 -mx-2 h-32 md:h-36 overflow-hidden rounded-xl relative bg-[var(--bg-elevated)] ...">
  <f.Anim />
</div>
```

**C) Replace with a feature stat line:**
```tsx
<div className="mt-5 pt-5 border-t border-[var(--border)] flex items-baseline gap-2">
  <span className="font-mono text-[22px] font-bold text-[var(--accent)]">{f.stat}</span>
  <span className="text-[12px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)]">{f.statLabel}</span>
</div>
```

**D) Add `stat` + `statLabel` fields to the `FEATURES` array:**

| Feature | stat | statLabel |
|---------|------|-----------|
| Live AI | <8s | avg answer latency *(verify before ship)* |
| Job Matching | 1,000+ | matched roles |
| Prep | 978+ | study topics |
| Mock Interviews | 50+ | domains scored |
| Playground | 5s | env ready time |
| Practice | 9,500+ | problems |

**E) Bullet dot — explicit blue:**
```tsx
className="mt-[3px] shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
```

---

### 5. Testimonial Logos — Grayscale

Apply the same grayscale treatment to company logo images in testimonial cards:
```tsx
style={{ objectFit: 'contain', filter: 'grayscale(1)', opacity: 0.6 }}
```

---

## Gold Audit — Light Surfaces

All occurrences of `cam-gold-leaf` verified safe (all on dark backgrounds):

| Location | Background | Safe? |
|----------|-----------|-------|
| APPA dark card internals | `#0B1221` dark | ✅ |
| Final CTA block | `#0A0E1A` dark | ✅ |
| `AudienceCard tone="dark"` | `#0A0E1A` dark | ✅ |
| Hero H1 gradient (`#60A5FA → #A855F7`) | `#080B14` dark | ✅ |

No gold appears on any `#F4F6FA` or `#FFFFFF` surface after these changes.

---

## Files Changed

| File | Change type |
|------|------------|
| `apps/camora/src/pages/LandingPage.tsx` | Remove hero effects · grayscale logos · update FEATURES array · swap card styles · add border-b to body Sections |

No changes to `primitives.tsx`, `globals.css`, or any backend files.

---

## What Does Not Change

- SiteNav, SiteFooter
- Hero copy, pill badge, CTAs, VisitorCountLine
- APPA dark card
- CapabilityDeck, SkillDrift, LiveSessionPreview, JobUrlAnalysisDemo, MagneticCTA
- All routes, content, testimonial copy
- Dark theme (intentionally excluded — dark theme is strong)

---

## Success Criteria

1. Hero reads as clean and confident — no competing gradients
2. Logo strip renders as monochrome trust bar
3. All light body sections share the same background — no zebra
4. Feature cards have left-border accent and stat lines (no dark animation boxes)
5. Zero gold on any white/light-gray surface
6. Full `vite build` passes, no TypeScript errors
7. Both light and dark themes remain functional
