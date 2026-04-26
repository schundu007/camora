import { ReactNode } from 'react';

export type CalloutVariant = 'tip' | 'note' | 'warning' | 'caution';

export interface DocsCalloutProps {
  children: ReactNode;
  variant?: CalloutVariant;
  /** Override the variant's default label (e.g. "Heads up" instead of "Note"). */
  label?: string;
}

const VARIANTS: Record<
  CalloutVariant,
  { label: string; bg: string; border: string; iconColor: string; icon: ReactNode }
> = {
  tip: {
    label: 'Tip',
    bg: 'rgba(38,97,156,0.04)',
    border: '#26619C',
    iconColor: '#26619C',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V18h6v-1.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" />
      </svg>
    ),
  },
  note: {
    label: 'Note',
    bg: 'rgba(15,23,42,0.04)',
    border: 'var(--text-primary)',
    iconColor: 'var(--text-primary)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  warning: {
    label: 'Warning',
    bg: 'rgba(201,162,39,0.06)',
    border: '#C9A227',
    iconColor: '#A88817',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  caution: {
    label: 'Caution',
    bg: 'rgba(239,68,68,0.04)',
    border: '#EF4444',
    iconColor: '#EF4444',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
};

/**
 * NVIDIA-style callout box: 4px accent left border, pale tinted bg,
 * icon + label header, body content below.
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
      className="my-4 rounded-r-md"
      style={{
        background: v.bg,
        borderLeft: `4px solid ${v.border}`,
      }}
    >
      <div className="px-4 py-3">
        <div
          className="flex items-center gap-2 mb-1.5 text-[13px] font-semibold"
          style={{ color: v.iconColor }}
        >
          {v.icon}
          <span>{label ?? v.label}</span>
        </div>
        <div className="text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
          {children}
        </div>
      </div>
    </div>
  );
}
