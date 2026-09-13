import type { CheatRow } from '@/data/python';
import SurfaceCard from './SurfaceCard';

const TH = 'px-6 py-2.5 text-left font-mono text-[12px] font-bold uppercase tracking-widest';

export default function CheatSheetTable({ rows }: { rows?: CheatRow[] }) {
  if (!rows?.length) return null;
  return (
    <SurfaceCard label="Cheat Sheet" accent="var(--cam-gold-leaf)">
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}>
              <th className={TH} style={{ color: 'var(--text-muted)' }}>Call</th>
              <th className={TH} style={{ color: 'var(--text-muted)' }}>Does</th>
              <th className={TH} style={{ color: 'var(--text-muted)' }}>Returns</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderTop: i ? '1px solid color-mix(in oklab, var(--border) 40%, transparent)' : 'none' }}>
                <td className="px-6 py-3 align-top font-mono text-[12px] whitespace-nowrap" style={{ color: 'var(--cam-gold-leaf-dk)' }}>{r.call}</td>
                <td className="px-6 py-3 align-top text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{r.does}</td>
                <td className="px-6 py-3 align-top font-mono text-[12px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{r.returns}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}
