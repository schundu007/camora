import { ReactNode } from 'react';
import Chip from '@/components/shared/ui/Chip';
import { Icon } from '@/components/shared/Icons';

export type CalloutVariant = 'tip' | 'note' | 'warning' | 'caution';

export interface DocsCalloutProps {
  children: ReactNode;
  variant?: CalloutVariant;
  /** Override the variant's default label (e.g. "Heads up" instead of "Note"). */
  label?: string;
}

const VARIANTS: Record<
  CalloutVariant,
  { label: string; color: string; iconName: string }
> = {
  tip:     { label: 'Tip',     color: '#00B8A3', iconName: 'lightbulb'     },
  note:    { label: 'Note',    color: '#2B6394', iconName: 'info'          },
  warning: { label: 'Warning', color: 'var(--warning)', iconName: 'alertTriangle' },
  caution: { label: 'Caution', color: '#FF375F', iconName: 'alertCircle'   },
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
            <Icon name={v.iconName} size={13} />
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
