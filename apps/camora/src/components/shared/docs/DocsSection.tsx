import { ReactNode } from 'react';

const ACCENT = 'var(--accent)';
const ACCENT_TEXT = 'var(--accent-text)';
const NAVY = '#1E4D78';
const HEX_SM = 8;
const HEX_LG = 12;

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
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="block flex-shrink-0"
            style={{
              width: HEX_SM,
              height: HEX_SM,
              background: NAVY,
              clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            }}
          />
          <div
            className="text-[10px] font-extrabold uppercase tracking-[0.16em]"
            style={{ color: NAVY }}
          >
            {eyebrow}
          </div>
        </div>
      )}
      {isTop ? (
        <div className="mb-5 scroll-mt-20">
          <div className="flex items-center gap-2.5">
            <span
              className="block flex-shrink-0"
              style={{
                width: HEX_LG,
                height: HEX_LG,
                background: NAVY,
                clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
              }}
            />
            <Heading
              className="text-[26px] font-extrabold leading-tight tracking-tight"
              style={{ color: ACCENT_TEXT }}
            >
              {title}
            </Heading>
          </div>
          <div
            className="h-px mt-3"
            style={{
              background: `linear-gradient(90deg, color-mix(in srgb, ${ACCENT} 50%, transparent) 0%, transparent 100%)`,
            }}
          />
        </div>
      ) : (
        <Heading
          className="text-[19px] font-bold leading-snug mb-3 scroll-mt-20"
          style={{ color: ACCENT_TEXT }}
        >
          {title}
        </Heading>
      )}
      {description && (
        <p className="text-[15px] leading-[1.65] text-[var(--text-secondary)] mb-5 max-w-[68ch]">
          {description}
        </p>
      )}
      <div className="text-[14.5px] leading-[1.65] text-[var(--text-primary)] space-y-4">
        {children}
      </div>
    </section>
  );
}
