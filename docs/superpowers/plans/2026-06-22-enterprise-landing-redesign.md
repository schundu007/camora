# Enterprise Landing Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Camora light-theme landing page enterprise-grade by removing visual noise from the hero, grayscaling company logos, unifying section backgrounds, and replacing dark-box card animations with stat lines.

**Architecture:** All changes are confined to `apps/camora/src/pages/LandingPage.tsx` (one file). Visual-only — no logic, routing, or backend changes. Dark theme is not touched.

**Tech Stack:** React 19, Vite 8, Tailwind 4, Framer Motion, React Router DOM v7

## Global Constraints

- Only `apps/camora/src/pages/LandingPage.tsx` is modified
- Dark theme (default / no `data-theme` attribute) must remain visually unchanged
- All existing routes, copy, CTAs, and section order are preserved
- No new dependencies
- Build command: `cd apps/camora && npx vite build` — must pass with zero errors
- After all tasks: `git pull --rebase && git push origin main && vercel --prod`

---

### Task 1: Hero — Strip the Visual Noise

**Files:**
- Modify: `apps/camora/src/pages/LandingPage.tsx` (hero section ~lines 243–418)

**Interfaces:**
- Produces: a dark hero that keeps the grid overlay, bottom accent glow line, all headline copy, pill badge, CTAs, and VisitorCountLine — but removes all animated/decorative elements

- [ ] **Step 1: Remove the aurora gradient div**

In `LandingPage.tsx`, find and delete this entire block (the first `aria-hidden` div inside the hero `<section>`):

```tsx
{/* Animated aurora gradient orbs */}
<div
  aria-hidden="true"
  className="absolute inset-0"
  style={{
    background:
      'radial-gradient(ellipse 90% 70% at 5% 40%, rgba(54,131,220,0.24), transparent 55%),' +
      'radial-gradient(ellipse 60% 80% at 12% 25%, rgba(139,92,246,0.22), transparent 60%),' +
      'radial-gradient(ellipse 50% 60% at 92% 65%, rgba(54,131,220,0.30), transparent 60%),' +
      'radial-gradient(ellipse 35% 45% at 72% 15%, rgba(34,211,238,0.12), transparent 50%),' +
      'radial-gradient(ellipse 40% 50% at 50% 85%, rgba(139,92,246,0.08), transparent 55%),' +
      'linear-gradient(135deg, #080B14 0%, #0C1120 50%, #10172E 100%)',
    animation: 'heroOrbs 18s ease-in-out infinite alternate',
  }}
/>
```

- [ ] **Step 2: Remove drifting orb 1**

Delete:
```tsx
{/* Drifting accent orb 1 */}
<div aria-hidden="true" className="absolute pointer-events-none opacity-20"
  style={{
    width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(54,131,220,0.38) 0%, transparent 70%)',
    top: '-10%', left: '-5%',
    animation: 'heroDrift1 25s ease-in-out infinite alternate',
  }}
/>
```

- [ ] **Step 3: Remove drifting orb 2**

Delete:
```tsx
{/* Drifting accent orb 2 */}
<div aria-hidden="true" className="absolute pointer-events-none opacity-15"
  style={{
    width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)',
    bottom: '-8%', right: '10%',
    animation: 'heroDrift2 20s ease-in-out infinite alternate',
  }}
/>
```

- [ ] **Step 4: Remove floating tech nodes**

Delete this entire block:
```tsx
{/* Floating decorative tech nodes */}
<div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
  {['top-[12%] left-[8%] w-3 h-3 delay-0', 'top-[30%] right-[15%] w-2 h-2 delay-[2s]',
    'bottom-[20%] left-[20%] w-2.5 h-2.5 delay-[4s]', 'top-[60%] right-[8%] w-1.5 h-1.5 delay-[1s]',
    'bottom-[35%] right-[35%] w-2 h-2 delay-[3s]', 'top-[8%] right-[30%] w-1.5 h-1.5 delay-[5s]',
  ].map((pos, i) => (
    <span key={i} className={`absolute rounded-full ${pos}`}
      style={{
        background: i % 2 === 0 ? 'rgba(54,131,220,0.70)' : 'rgba(139,92,246,0.60)',
        boxShadow: i % 2 === 0 ? '0 0 18px rgba(54,131,220,0.55)' : '0 0 18px rgba(139,92,246,0.45)',
        animation: `heroFloat ${4 + (i % 3) * 2}s ease-in-out ${i * 0.5}s infinite`,
      }}
    />
  ))}
</div>
```

- [ ] **Step 5: Remove noise texture**

Delete:
```tsx
{/* Noise texture for premium AI depth */}
<div
  aria-hidden="true"
  className="absolute inset-0 pointer-events-none"
  style={{
    opacity: 0.035,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    backgroundSize: '200px 200px',
  }}
/>
```

- [ ] **Step 6: Remove diagonal light beam**

Delete:
```tsx
{/* Diagonal light beam */}
<div
  aria-hidden="true"
  className="absolute pointer-events-none"
  style={{
    top: '-20%', left: '38%', width: 90, height: '140%',
    background: 'linear-gradient(to bottom, transparent, rgba(54,131,220,0.12) 30%, rgba(139,92,246,0.08) 65%, transparent)',
    transform: 'rotate(-18deg)',
    filter: 'blur(32px)',
  }}
/>
```

- [ ] **Step 7: Replace hero section opening tag with clean single-gradient background**

Find:
```tsx
<section className="relative overflow-hidden bg-[#080B14] text-white">
```

Replace with:
```tsx
<section
  className="relative overflow-hidden text-white"
  style={{
    background:
      'radial-gradient(ellipse 55% 70% at 18% 40%, rgba(54,131,220,0.18), transparent 60%),' +
      'linear-gradient(160deg, #080B14 0%, #0C1120 60%, #10172E 100%)',
  }}
>
```

- [ ] **Step 8: Remove the dead hero keyframes `<style>` block entirely**

Find the `<style>` tag at the bottom of the hero section (before the closing `</section>`). It contains `heroOrbs`, `heroDrift1`, `heroDrift2`, `heroFloat`. Delete the entire block:

```tsx
<style>{`
  @keyframes heroOrbs {
    0%   { transform: translate(0, 0) rotate(0deg) scale(1); }
    33%  { transform: translate(3%, -2%) rotate(1.5deg) scale(1.03); }
    66%  { transform: translate(-2%, 3%) rotate(-1deg) scale(0.97); }
    100% { transform: translate(2%, -2%) rotate(0.5deg) scale(1.02); }
  }
  @keyframes heroDrift1 {
    0%   { transform: translate(0, 0) scale(1); }
    50%  { transform: translate(8%, 6%) scale(1.12); }
    100% { transform: translate(-4%, -3%) scale(0.95); }
  }
  @keyframes heroDrift2 {
    0%   { transform: translate(0, 0) scale(1); }
    50%  { transform: translate(-6%, -8%) scale(1.08); }
    100% { transform: translate(5%, 4%) scale(0.92); }
  }
  @keyframes heroFloat {
    0%, 100% { transform: translateY(0) scale(1); opacity: 1; }
    50%      { transform: translateY(-18px) scale(1.15); opacity: 0.7; }
  }
`}</style>
```

- [ ] **Step 9: Verify build passes**

```bash
cd apps/camora && npx vite build 2>&1 | tail -5
```

Expected: a line containing `✓ built in` with no errors above it.

- [ ] **Step 10: Commit**

```bash
git pull --rebase
git add apps/camora/src/pages/LandingPage.tsx
git commit -m "feat(landing): remove hero visual noise — clean single gradient"
```

---

### Task 2: Grayscale All Company Logos (Strip + Testimonials)

**Files:**
- Modify: `apps/camora/src/pages/LandingPage.tsx` (logo strip ~line 444, testimonials ~line 711)

**Interfaces:**
- Consumes: Task 1's LandingPage.tsx
- Produces: all `<img>` logo elements rendered in grayscale with hover brightening

- [ ] **Step 1: Update logo strip `<img>`**

Find the `<img>` inside the scrolling div in the logo strip section:
```tsx
<img
  key={`${c}-${i}`}
  src={`https://img.logo.dev/${c}.com?token=${LOGO_TOKEN}&size=40&format=png`}
  alt={c}
  className="h-6 mx-7 shrink-0 object-contain"
  loading="lazy"
  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
/>
```

Replace with:
```tsx
<img
  key={`${c}-${i}`}
  src={`https://img.logo.dev/${c}.com?token=${LOGO_TOKEN}&size=40&format=png`}
  alt={c}
  className="h-6 mx-7 shrink-0 object-contain transition-opacity duration-150"
  loading="lazy"
  style={{ filter: 'grayscale(1)', opacity: 0.5 }}
  onMouseEnter={e => { (e.target as HTMLImageElement).style.opacity = '0.8'; }}
  onMouseLeave={e => { (e.target as HTMLImageElement).style.opacity = '0.5'; }}
  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
/>
```

- [ ] **Step 2: Update testimonial company logo `<img>`**

In the testimonials section, find:
```tsx
<img src={`https://img.logo.dev/${t.logoDomain}?token=${LOGO_TOKEN}&size=32&format=png`} alt="" width={22} height={22} style={{ objectFit: 'contain' }} />
```

Replace with:
```tsx
<img
  src={`https://img.logo.dev/${t.logoDomain}?token=${LOGO_TOKEN}&size=32&format=png`}
  alt=""
  width={22}
  height={22}
  style={{ objectFit: 'contain', filter: 'grayscale(1)', opacity: 0.6 }}
/>
```

- [ ] **Step 3: Verify build passes**

```bash
cd apps/camora && npx vite build 2>&1 | tail -5
```

Expected: `✓ built in` with no errors.

- [ ] **Step 4: Commit**

```bash
git pull --rebase
git add apps/camora/src/pages/LandingPage.tsx
git commit -m "feat(landing): grayscale company logos in strip and testimonials"
```

---

### Task 3: Unify Light-Body Section Backgrounds

**Files:**
- Modify: `apps/camora/src/pages/LandingPage.tsx` (5 `<Section>` calls)

**Interfaces:**
- Consumes: Task 2's LandingPage.tsx
- Produces: all body sections share `tone="surface"`, separated by `border-b border-[var(--border)]`; final CTA section gets no border-b

- [ ] **Step 1: Capability Deck section**

Find:
```tsx
{/* ═══════════ CAPABILITY DECK ═══════════ */}
<Section tone="muted" spacing="lg">
```
Replace with:
```tsx
{/* ═══════════ CAPABILITY DECK ═══════════ */}
<Section tone="surface" spacing="lg" className="border-b border-[var(--border)]">
```

- [ ] **Step 2: Features Bento section**

Find:
```tsx
{/* ═══════════ FEATURES — Bento grid ═══════════ */}
<Section tone="muted" spacing="lg">
```
Replace with:
```tsx
{/* ═══════════ FEATURES — Bento grid ═══════════ */}
<Section tone="surface" spacing="lg" className="border-b border-[var(--border)]">
```

- [ ] **Step 3: Job URL Analysis section**

Find:
```tsx
{/* ═══════════ JOB URL ANALYSIS ═══════════ */}
<Section tone="muted" spacing="lg">
```
Replace with:
```tsx
{/* ═══════════ JOB URL ANALYSIS ═══════════ */}
<Section tone="surface" spacing="lg" className="border-b border-[var(--border)]">
```

- [ ] **Step 4: Two Audiences section — add border-b**

Find:
```tsx
{/* ═══════════ TWO AUDIENCES ═══════════ */}
<Section tone="surface" spacing="lg">
```
Replace with:
```tsx
{/* ═══════════ TWO AUDIENCES ═══════════ */}
<Section tone="surface" spacing="lg" className="border-b border-[var(--border)]">
```

- [ ] **Step 5: Testimonials section — add border-b**

Find:
```tsx
{/* ═══════════ TESTIMONIALS ═══════════ */}
<Section tone="surface" spacing="lg">
```
Replace with:
```tsx
{/* ═══════════ TESTIMONIALS ═══════════ */}
<Section tone="surface" spacing="lg" className="border-b border-[var(--border)]">
```

Note: The final CTA `<Section tone="surface" spacing="md">` is intentionally left without `border-b` — it sits directly above the footer.

- [ ] **Step 6: Verify build passes**

```bash
cd apps/camora && npx vite build 2>&1 | tail -5
```

Expected: `✓ built in` with no errors.

- [ ] **Step 7: Commit**

```bash
git pull --rebase
git add apps/camora/src/pages/LandingPage.tsx
git commit -m "feat(landing): unify section backgrounds, add border-b dividers"
```

---

### Task 4: Feature Cards — Replace Dark Animation Boxes with Stat Lines

**Files:**
- Modify: `apps/camora/src/pages/LandingPage.tsx` (FEATURES array + feature card JSX)

**Interfaces:**
- Consumes: Task 3's LandingPage.tsx
- Produces: feature cards with left blue accent border stripe and a numeric stat line; no dark animation preview boxes; bullet dots are slightly larger and explicitly blue

- [ ] **Step 1: Replace the entire `FEATURES` array**

Find the `const FEATURES = [` declaration and replace the whole array:

```tsx
const FEATURES = [
  {
    label: 'Live AI',
    title: 'Real-time AI during sessions',
    bullets: ['Live voice capture + instant answers', 'Architecture diagrams in seconds', 'Works during actual interviews'],
    stat: '<1s',
    statLabel: 'avg answer latency',
  },
  {
    label: 'Job Matching',
    title: 'AI-powered job discovery',
    bullets: ['1,000+ roles matched to your skills', 'Auto-generate resume + cover letter', 'One-click application tracking'],
    stat: '1,000+',
    statLabel: 'matched roles',
  },
  {
    label: 'Prep',
    title: '978+ topics with diagrams',
    bullets: ['System design, DSA, behavioral, databases', 'AI explanations + architecture diagrams', 'Company-specific study paths'],
    stat: '978+',
    statLabel: 'study topics',
  },
  {
    label: 'Mock Interviews',
    title: 'AI-scored practice sessions',
    bullets: ['Timed sessions with instant feedback', 'Scored: communication, code, design', 'Pinpoints exactly where you lost points'],
    stat: '50+',
    statLabel: 'domains scored',
  },
  {
    label: 'Playground',
    title: 'Real terminals. Real Docker. Real Kubernetes.',
    bullets: ['Ubuntu, Docker, Kubernetes — live in browser', 'No VM, no setup, ready in 5 seconds', 'Build real muscle memory before the screen'],
    stat: '<5s',
    statLabel: 'env ready time',
  },
  {
    label: 'Practice',
    title: '9,500+ problems with AI feedback',
    bullets: ['DSA, SQL, MCQ, system design, coding', 'AI explains why your approach was wrong', '50+ domains, difficulty-graduated'],
    stat: '9,500+',
    statLabel: 'problems',
  },
];
```

- [ ] **Step 2: Remove the 6 Feature animation imports**

Find the import line:
```tsx
import {
  ApplyAnim, PrepareAnim, PracticeAnim, AttendAnim, CardAnimationStyles, FeaturePlaygroundAnim, FeaturePracticeAnim,
  FeatureLiveAIAnim, FeatureJobMatchAnim, FeaturePrepAnim, FeatureMockSessionAnim,
} from '../components/landing/CardAnimations';
```

Replace with (keeping only the APPA anims and CardAnimationStyles):
```tsx
import {
  ApplyAnim, PrepareAnim, PracticeAnim, AttendAnim, CardAnimationStyles,
} from '../components/landing/CardAnimations';
```

- [ ] **Step 3: Update the feature card render block**

Find the features bento grid render:
```tsx
{FEATURES.map((f, i) => (
    <Reveal key={f.title} delay={i * 0.06}>
      <SurfaceCard interactive padding="lg" className="h-full group">
        <Eyebrow tone="accent">{f.label}</Eyebrow>
        <h3 className="mt-2 font-display text-[22px] font-semibold tracking-tight leading-snug text-[var(--text-primary)]">
          {f.title}
        </h3>
        <ul className="mt-3 space-y-1.5">
          {f.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-[15px] text-[var(--text-secondary)]">
              <span className="mt-[3px] shrink-0 w-1 h-1 rounded-full bg-[var(--accent)] opacity-70" />
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-5 -mx-2 h-32 md:h-36 overflow-hidden rounded-xl relative bg-[var(--bg-elevated)] transition-all duration-300">
          <f.Anim />
        </div>
      </SurfaceCard>
    </Reveal>
))}
```

Replace with:
```tsx
{FEATURES.map((f, i) => (
    <Reveal key={f.title} delay={i * 0.06}>
      <SurfaceCard interactive padding="lg" className="h-full group border-l-2 border-[var(--accent)]">
        <Eyebrow tone="accent">{f.label}</Eyebrow>
        <h3 className="mt-2 font-display text-[22px] font-semibold tracking-tight leading-snug text-[var(--text-primary)]">
          {f.title}
        </h3>
        <ul className="mt-3 space-y-1.5">
          {f.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-[15px] text-[var(--text-secondary)]">
              <span className="mt-[3px] shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-5 pt-5 border-t border-[var(--border)] flex items-baseline gap-2">
          <span className="font-mono text-[22px] font-bold text-[var(--accent)]">{f.stat}</span>
          <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)]">{f.statLabel}</span>
        </div>
      </SurfaceCard>
    </Reveal>
))}
```

- [ ] **Step 4: Verify build passes with no TypeScript errors**

```bash
cd apps/camora && npx vite build 2>&1
```

Expected: `✓ built in Xs` with no errors. Specifically, no "is not assignable" or "declared but never read" errors.

- [ ] **Step 5: Commit**

```bash
git pull --rebase
git add apps/camora/src/pages/LandingPage.tsx
git commit -m "feat(landing): replace feature card animations with stat lines + accent border"
```

---

### Task 5: Final Verification + Deploy

- [ ] **Step 1: Full build**

```bash
cd apps/camora && npx vite build 2>&1
```

Expected: `✓ built in` with zero errors.

- [ ] **Step 2: Push and deploy**

```bash
git push origin main
vercel --prod
```

- [ ] **Step 3: Visual smoke test (light theme)**

Navigate to the live URL and switch to light theme. Verify:

| Check | Expected |
|-------|----------|
| Hero | Clean dark background, single blue left glow only — no orbs, no particles |
| Logo strip | All logos monochrome gray, fade in slightly on hover |
| Body sections | All same background color, thin border line between each section |
| Feature cards | Blue left border stripe, stat number at bottom, no dark animation box |
| Testimonials | Company logos monochrome gray |
| Gold | Not visible on any white/light surface |

- [ ] **Step 4: Dark theme smoke test**

Switch back to dark theme. Verify the APPA card, hero, features, and final CTA all look unchanged from before this work.

---

## Self-Review Against Spec

| Spec requirement | Task |
|-----------------|------|
| Remove aurora orbs, drifting blobs, particles, diagonal beam, noise texture, 4 keyframes | Task 1 steps 1–8 |
| Single clean blue radial gradient on hero | Task 1 step 7 |
| Grid overlay + bottom accent glow line kept | Task 1 (explicitly not removed) |
| Logo strip: `grayscale(1)` + `opacity: 0.5` + hover to `0.8` | Task 2 step 1 |
| Testimonial logos: `grayscale(1)` + `opacity: 0.6` | Task 2 step 2 |
| All body sections: `tone="surface"` | Task 3 steps 1–5 |
| Section dividers: `border-b border-[var(--border)]` | Task 3 steps 1–5 |
| Final CTA section: no border-b | Task 3 note (intentionally skipped) |
| Feature cards: `border-l-2 border-[var(--accent)]` | Task 4 step 3 |
| Feature cards: remove dark animation box | Task 4 steps 1–3 |
| Feature stats: `<1s`, `1,000+`, `978+`, `50+`, `<5s`, `9,500+` | Task 4 step 1 |
| Bullet dots: `w-1.5 h-1.5`, explicit blue, no opacity modifier | Task 4 step 3 |
| Gold not visible on any light surface | No task needed — audit confirmed clean |
| SiteNav, SiteFooter, APPA card, CapabilityDeck, LiveSessionPreview unchanged | No task touches them |
| Dark theme visually unchanged | Task 5 step 4 (smoke test) |
| Vite build passes | Tasks 1–5 each include a build check |
