import { ReactNode } from 'react';

export type CalloutVariant = 'tip' | 'note' | 'warning' | 'caution';

export interface DocsCalloutProps {
  children: ReactNode;
  variant?: CalloutVariant;
  /** Override the variant's default label (e.g. "Heads up" instead of "Note"). */
  label?: string;
}

// LC-inspired palette — tip=teal, note=blue, warning=amber/gold, caution=red
const VARIANTS: Record<
  CalloutVariant,
  { label: string; color: string; icon: ReactNode }
> = {
  tip: {
    label: 'Tip',
    color: '#00B8A3',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V18h6v-1.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" />
      </svg>
    ),
  },
  note: {
    label: 'Note',
    color: '#0EA5E9',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  warning: {
    label: 'Warning',
    color: '#C9A227',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
};

/**
 * LC-inspired callout: tinted paper-card background, hexagon glyph + accent
 * label header, icon bubble in the accent color. No grey walls.
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
      className="my-4 rounded-lg overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${v.color}10 0%, ${v.color}05 100%)`,
        border: `1px solid ${v.color}40`,
        boxShadow: `0 1px 0 ${v.color}10`,
      }}
    >
      <div className="px-4 py-3">
        <div
          className="flex items-center gap-2 mb-1.5 text-[12px] font-extrabold uppercase tracking-[0.1em]"
          style={{ color: v.color }}
        >
          <span
            className="inline-flex items-center justify-center rounded-md"
            style={{ width: 22, height: 22, background: `${v.color}20`, color: v.color }}
            aria-hidden="true"
          >
            {v.icon}
          </span>
          <span>{label ?? v.label}</span>
          <span
            className="flex-1 h-px ml-1"
            style={{ background: `linear-gradient(90deg, ${v.color}40 0%, transparent 100%)` }}
          />
        </div>
        <div className="text-[14px] leading-[1.65]" style={{ color: 'var(--text-primary)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
