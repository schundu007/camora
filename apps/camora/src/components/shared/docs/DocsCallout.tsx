import { ReactNode } from 'react';
import Chip from '@/components/shared/ui/Chip';

export type CalloutVariant = 'tip' | 'note' | 'warning' | 'caution';

export interface DocsCalloutProps {
  children: ReactNode;
  variant?: CalloutVariant;
  /** Override the variant's default label (e.g. "Heads up" instead of "Note"). */
  label?: string;
}

// Illuminated-manuscript palette — every variant carries a navy strip + a
// gold-leaf border on the glassy pill label. The accent color shifts only
// the label/icon hue so the chrome stays unified across variant types.
const VARIANTS: Record<
  CalloutVariant,
  { label: string; color: string; icon: ReactNode }
> = {
  tip: {
    label: 'Tip',
    color: '#00B8A3',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V18h6v-1.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" />
      </svg>
    ),
  },
  note: {
    label: 'Note',
    color: '#10B981',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  warning: {
    label: 'Warning',
    color: '#F59E0B',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  caution: {
    label: 'Caution',
    color: '#FF375F',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
};

/**
 * Doc callout: navy left strip + gold-leaf border + glassy pill label.
 * Layered chrome:
 *   • 3px navy strip on the far left edge
 *   • 1px gold-leaf-tinted outer border + soft inner glow
 *   • subtle accent-tinted gradient background (pulled from the variant
 *     hue so tip/note/warning/caution stay distinguishable)
 *   • glassy pill capsule for the label, with the variant icon bubbled
 *     into a soft accent-tinted square
 */
export default function DocsCallout({
  children,
  variant = 'note',
  label,
}: DocsCalloutProps) {
  const v = VARIANTS[variant];
  return (
    <div
      role="note"
      className="my-5 relative rounded-xl overflow-hidden pl-5 pr-4 py-3.5"
      style={{
        background: `linear-gradient(180deg, ${v.color}10 0%, ${v.color}05 100%)`,
        border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
        boxShadow:
          `0 1px 0 color-mix(in srgb, var(--accent) 12%, transparent),` +
          ` 0 6px 18px -12px ${v.color}40,` +
          ` inset 0 1px 0 rgba(255,255,255,0.3)`,
      }}
    >
      {/* Accent strip — sits on the left edge, slightly inset top/bottom */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
        style={{ background: 'var(--accent)' }}
      />

      {/* Glassy pill label */}
      <div className="flex items-center gap-2 mb-1.5">
        <Chip variant="default" className="gap-1.5">
          <span
            className="inline-flex items-center justify-center"
            style={{ width: 16, height: 16, color: v.color }}
            aria-hidden="true"
          >
            {v.icon}
          </span>
          {label ?? v.label}
        </Chip>
      </div>

      {/* Body content */}
      <div className="text-[14px] leading-[1.65]" style={{ color: 'var(--text-primary)' }}>
        {children}
      </div>
    </div>
  );
}
