import type { ReactNode } from 'react';

export interface FeatureMatrixPlan {
  id: string;
  name: string;
  /** Optional subline under the plan name (e.g. "Most popular") */
  highlight?: string;
}

export interface FeatureMatrixRow {
  /** Feature name shown in the leftmost column */
  feature: ReactNode;
  /** Optional one-line clarifier (renders muted under the feature name) */
  hint?: ReactNode;
  /** Per-plan value: true = checkmark, false = dash, string/node = literal */
  values: Record<string, boolean | string | ReactNode>;
}

export interface FeatureMatrixSection {
  /** Section heading (e.g. "AI features", "Limits", "Support") */
  title: string;
  rows: FeatureMatrixRow[];
}

export interface FeatureMatrixProps {
  plans: FeatureMatrixPlan[];
  sections: FeatureMatrixSection[];
  /** Optional plan id to highlight (typically the recommended/popular plan) */
  highlightPlanId?: string;
  className?: string;
}

/**
 * Pricing comparison matrix in the Databricks/Stripe pattern.
 * Plans across the top, features grouped by section as rows.
 * The highlighted plan column gets a subtle accent-tinted background.
 *
 * Cell semantics:
 *   true  → centered checkmark
 *   false → centered dash (—)
 *   string / node → rendered as-is, centered
 */
export default function FeatureMatrix({
  plans,
  sections,
  highlightPlanId,
  className = '',
}: FeatureMatrixProps) {
  // Sizing strategy: FeatureMatrix fills 100% of whatever container it's given.
  // The consumer (e.g. PricingPage) is responsible for capping width with a
  // wrapper like `<div className="max-w-4xl mx-auto">`. Keeps this component
  // composable across pages with different layout constraints.
  const planCols = plans.length;
  // Feature column is 1.5× a plan column.
  const featureColPct = (1.5 / (planCols + 1.5)) * 100;
  const planColPct = (1 / (planCols + 1.5)) * 100;
  // Only force a horizontal-scroll min-width on tables wide enough to need it.
  const minWidth = planCols >= 5 ? 720 : undefined;

  return (
    <div
      className={`overflow-x-auto rounded-xl ${className}`}
      style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
    >
      <table
        className="w-full text-sm"
        style={{ minWidth, borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}
      >
        <colgroup>
          <col style={{ width: `${featureColPct}%` }} />
          {plans.map((p) => (
            <col key={p.id} style={{ width: `${planColPct}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ background: 'var(--bg-elevated)' }}>
            <th
              className="text-left px-5 py-4 text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border)' }}
            >
              Features
            </th>
            {plans.map((p) => {
              const isHighlight = p.id === highlightPlanId;
              return (
                <th
                  key={p.id}
                  className="px-4 py-4 text-center"
                  style={{
                    background: isHighlight ? 'var(--accent-subtle)' : undefined,
                    borderBottom: '1px solid var(--border)',
                    borderLeft: isHighlight ? '1px solid var(--accent)' : undefined,
                    borderRight: isHighlight ? '1px solid var(--accent)' : undefined,
                  }}
                >
                  <div
                    className="text-[13px] font-bold"
                    style={{ color: isHighlight ? 'var(--accent)' : 'var(--text-primary)' }}
                  >
                    {p.name}
                  </div>
                  {p.highlight && (
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                      {p.highlight}
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sections.map((sec, si) => (
            <FeatureMatrixSectionRows
              key={sec.title}
              section={sec}
              plans={plans}
              highlightPlanId={highlightPlanId}
              isFirst={si === 0}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeatureMatrixSectionRows({
  section,
  plans,
  highlightPlanId,
  isFirst,
}: {
  section: FeatureMatrixSection;
  plans: FeatureMatrixPlan[];
  highlightPlanId?: string;
  isFirst: boolean;
}) {
  return (
    <>
      <tr>
        <th
          colSpan={plans.length + 1}
          className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em]"
          style={{
            color: 'var(--text-secondary)',
            background: 'var(--bg-elevated)',
            borderTop: isFirst ? 'none' : '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {section.title}
        </th>
      </tr>
      {section.rows.map((row, ri) => (
        <tr key={ri} style={{ background: ri % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)' }}>
          <td
            className="px-5 py-3.5"
            style={{ borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}
          >
            <div className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {row.feature}
            </div>
            {row.hint && (
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {row.hint}
              </div>
            )}
          </td>
          {plans.map((p) => {
            const value = row.values[p.id];
            const isHighlight = p.id === highlightPlanId;
            return (
              <td
                key={p.id}
                className="px-4 py-3.5 text-center"
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: isHighlight ? 'var(--accent-subtle)' : undefined,
                  borderLeft: isHighlight ? '1px solid var(--accent)' : undefined,
                  borderRight: isHighlight ? '1px solid var(--accent)' : undefined,
                }}
              >
                <FeatureCell value={value} highlight={isHighlight} />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function FeatureCell({ value, highlight }: { value: boolean | string | ReactNode; highlight?: boolean }) {
  if (value === true) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke={highlight ? 'var(--accent)' : 'var(--accent)'}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
        aria-label="Included"
      >
        <path d="M13 4L6 11L3 8" />
      </svg>
    );
  }
  if (value === false || value === undefined || value === null) {
    return (
      <span
        aria-label="Not included"
        style={{ color: 'var(--text-dimmed)', fontSize: 14 }}
      >
        —
      </span>
    );
  }
  return (
    <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
      {value}
    </span>
  );
}
