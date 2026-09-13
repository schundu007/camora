import type { Section } from '@/data/python';
import SurfaceCard from './SurfaceCard';

export default function ConceptSections({ sections }: { sections?: Section[] }) {
  if (!sections?.length) return null;
  return (
    <SurfaceCard label="Concept">
      <div className="divide-y divide-[var(--border)]/40">
        {sections.map((s, i) => (
          <div key={i} className="px-6 py-5">
            <h3 className="text-[14px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{s.heading}</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.body}</p>
            {s.code && (
              <pre
                className="mt-3 px-4 py-3 rounded-xl overflow-x-auto text-[12px] leading-relaxed"
                style={{ fontFamily: 'var(--font-mono)', background: '#0d1117', color: '#e6edf3', margin: 0 }}
              >
                <code>{s.code}</code>
              </pre>
            )}
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
