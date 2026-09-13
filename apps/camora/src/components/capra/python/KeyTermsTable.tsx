import type { KeyTerm } from '@/data/python';
import SurfaceCard from './SurfaceCard';

export default function KeyTermsTable({ terms }: { terms?: KeyTerm[] }) {
  if (!terms?.length) return null;
  return (
    <SurfaceCard label="Key Terms">
      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {terms.map((t, i) => (
              <tr key={i} style={{ borderTop: i ? '1px solid color-mix(in oklab, var(--border) 40%, transparent)' : 'none' }}>
                <th
                  scope="row"
                  className="px-6 py-3 align-top font-mono text-[12px] font-bold whitespace-nowrap"
                  style={{ color: 'var(--cam-primary)' }}
                >
                  {t.term}
                </th>
                <td className="px-6 py-3 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {t.meaning}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}
