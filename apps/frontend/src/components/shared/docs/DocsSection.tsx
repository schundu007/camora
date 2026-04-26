import { ReactNode } from 'react';

export interface DocsSectionProps {
  /** Element id used for OnThisPage anchor links. */
  id: string;
  /** Heading text — rendered as <h2>. */
  title: ReactNode;
  /** Optional eyebrow label (uppercase, small) above the title. */
  eyebrow?: string;
  /** Optional intro paragraph rendered below the heading. */
  description?: ReactNode;
  /** Heading level. h2 = top-level page section, h3 = sub-section. Default "h2". */
  level?: 'h2' | 'h3';
  children: ReactNode;
}

/**
 * NVIDIA-style page section: bold heading, optional intro paragraph,
 * thin hairline below h2 for visual rhythm. Provides the anchor target
 * that OnThisPage links to.
 */
export default function DocsSection({
  id,
  title,
  eyebrow,
  description,
  level = 'h2',
  children,
}: DocsSectionProps) {
  const Heading = level;
  const isTop = level === 'h2';

  return (
    <section id={id} className={isTop ? 'mt-12 first:mt-0' : 'mt-8'}>
      {eyebrow && (
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-2">
          {eyebrow}
        </div>
      )}
      <Heading
        className={
          isTop
            ? 'text-[26px] font-bold text-[var(--text-primary)] leading-tight pb-2 border-b border-[var(--border)] mb-5 scroll-mt-20'
            : 'text-[19px] font-semibold text-[var(--text-primary)] leading-snug mb-3 scroll-mt-20'
        }
      >
        {title}
      </Heading>
      {description && (
        <p className="text-[14.5px] leading-relaxed text-[var(--text-secondary)] mb-5 max-w-[68ch]">
          {description}
        </p>
      )}
      <div className="text-[14px] leading-relaxed text-[var(--text-secondary)] space-y-4">
        {children}
      </div>
    </section>
  );
}
