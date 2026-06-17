/**
 * PillToggleGroup + PillToggle — glassy capsule containing pill toggles.
 *
 * Same grammar as the Lumora design Input Tab Header (TEXT/URL/IMAGE):
 * a glassy capsule (rgba white) holding inline buttons; the active
 * button gets the gold-leaf fill with dark text.
 *
 * Use anywhere a segmented control / mode toggle / sub-tab appears.
 *
 * Usage:
 *   <PillToggleGroup>
 *     <PillToggle active={mode === 'text'} onClick={() => setMode('text')}>Text</PillToggle>
 *     <PillToggle active={mode === 'url'} onClick={() => setMode('url')}>URL</PillToggle>
 *   </PillToggleGroup>
 */

import Chip from '@/components/shared/ui/Chip';

export function PillToggleGroup({ children, className = '' }) {
  return (
    <div
      className={`inline-flex items-center gap-1 px-1 py-1 ${className}`}
      style={{
        background: 'var(--cam-strip-icon-bg)',
        border: '1px solid var(--cam-strip-icon-border)',
        borderRadius: 999,
        boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
      }}
    >
      {children}
    </div>
  );
}

export function PillToggle({ active, onClick, children, title, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`px-3.5 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all ${className}`}
      style={
        active
          ? {
              background: 'var(--cam-gold-leaf)',
              color: '#020617',
              borderRadius: 999,
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }
          : {
              color: 'var(--cam-strip-text)',
              borderRadius: 999,
              background: 'transparent',
            }
      }
    >
      {children}
    </button>
  );
}

/**
 * GlassPill — single read-only pill, used for count badges, status
 * indicators, provider tags inside navy strips. Visually matches the
 * inactive PillToggle but is non-interactive.
 */
export function GlassPill({ children, className = '' }) {
  return (
    <Chip variant="default" className={`gap-1.5 ${className}`}>
      {children}
    </Chip>
  );
}
