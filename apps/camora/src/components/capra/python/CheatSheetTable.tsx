import type { CheatTable } from '@/data/python';
import SurfaceCard from './SurfaceCard';

const TH = 'px-6 py-2.5 text-left font-mono text-[12px] font-bold uppercase tracking-widest';

/** The header a plain method table gets when a table declares no columns. */
const DEFAULT_COLUMNS: [string, string, string] = ['Call', 'Does', 'Returns'];

export default function CheatSheetTable({ tables }: { tables?: CheatTable[] }) {
  const filled = (tables ?? []).filter(t => t.rows.length > 0);
  if (!filled.length) return null;

  return (
    <SurfaceCard label="Cheat Sheet" accent="var(--cam-gold-leaf)">
      {filled.map((table, ti) => {
        const columns = table.columns ?? DEFAULT_COLUMNS;
        return (
          <div
            key={ti}
            style={ti ? { borderTop: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' } : undefined}
          >
            {table.title && (
              <h3
                className="px-6 pt-4 pb-1 text-[13px] font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {table.title}
              </h3>
            )}
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}>
                    {columns.map((label, ci) => (
                      <th key={ci} className={TH} style={{ color: 'var(--text-muted)' }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r, i) => (
                    <tr key={i} style={{ borderTop: i ? '1px solid color-mix(in oklab, var(--border) 40%, transparent)' : 'none' }}>
                      <td className="px-6 py-3 align-top font-mono text-[12px] whitespace-nowrap" style={{ color: 'var(--cam-gold-leaf-dk)' }}>{r.call}</td>
                      <td className="px-6 py-3 align-top text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{r.does}</td>
                      <td className="px-6 py-3 align-top font-mono text-[12px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{r.returns}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </SurfaceCard>
  );
}
