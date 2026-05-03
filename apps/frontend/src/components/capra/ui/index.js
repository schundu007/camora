/**
 * Shared Capra UI primitives — single source of truth for the
 * navy-strip + gold-leaf-border + glassy-pill-capsule design pattern.
 *
 * Every Capra page heading, card title, tab, tile, and toolbar should
 * import from here. New surfaces inherit the global look automatically;
 * a future restyle changes one file, not twelve.
 *
 * Components:
 *   - SectionCard    — card with navy-strip header + gold-leaf border
 *   - SectionHero    — mid-page section divider (eyebrow + h2 + subtitle)
 *   - HeroBand       — page-level hero band with eyebrow + title + actions
 *   - HeroAccent     — gold-leaf accented word inside HeroBand title
 *   - PillToggleGroup / PillToggle — segmented control inside glassy capsule
 *   - GlassPill      — single read-only pill (count badge / status / tag)
 */

export { default as SectionCard } from './SectionCard.jsx';
export { default as SectionHero } from './SectionHero.jsx';
export { default as HeroBand, HeroAccent } from './HeroBand.jsx';
export { PillToggleGroup, PillToggle, GlassPill } from './PillToggle.jsx';
