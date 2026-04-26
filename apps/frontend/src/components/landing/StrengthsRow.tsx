/* ── StrengthsRow ──────────────────────────────────────────────────────
   LeetCode "Companies & Candidates" two-column block — image #4 of the
   redesign brief. Each column leads with a hex-cluster, follows with a
   bold colored heading, body copy, and a tiny chevron "view more" link.

   Pure presentation — accepts up to 2 columns and renders them side by
   side on md+ screens, stacked on mobile. */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { HexColor, HexClusterItem } from '../shared/HexBadge';
import { HexCluster } from '../shared/HexBadge';

const HEADING_COLOR_MAP: Record<HexColor, string> = {
  navy: 'var(--cam-primary)',
  'navy-lt': 'var(--cam-primary-lt)',
  'navy-dk': 'var(--cam-primary-dk)',
  gold: 'var(--cam-gold-leaf-text)',
  red: 'var(--danger)',
  cream: 'var(--text-primary)',
};

export interface StrengthColumn {
  hexes: HexClusterItem[];
  heading: string;
  headingColor: HexColor;
  body: ReactNode;
  linkText: string;
  linkHref: string;
}

export function StrengthsRow({
  columns,
  className = '',
}: {
  columns: [StrengthColumn] | [StrengthColumn, StrengthColumn];
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 ${
        columns.length === 2 ? 'md:grid-cols-2' : ''
      } gap-12 md:gap-20 max-w-5xl mx-auto px-6 ${className}`}
    >
      {columns.map((col, idx) => (
        <div key={idx} className="text-center md:text-left">
          <div className="flex justify-center md:justify-start mb-5">
            <HexCluster items={col.hexes} size={64} />
          </div>
          <h3
            className="text-xl md:text-2xl font-bold mb-3"
            style={{
              color: HEADING_COLOR_MAP[col.headingColor],
              fontFamily: 'var(--font-display, var(--font-sans))',
            }}
          >
            {col.heading}
          </h3>
          <div
            className="text-sm leading-relaxed mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            {col.body}
          </div>
          <Link
            to={col.linkHref}
            className="inline-flex items-center gap-1 text-sm font-semibold hover:opacity-80 transition-opacity"
            style={{ color: 'var(--cam-primary)' }}
          >
            {col.linkText}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      ))}
    </div>
  );
}
