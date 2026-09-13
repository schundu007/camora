import type { Reference } from '@/data/python';
import SurfaceCard from './SurfaceCard';

export default function ReferenceLinks({ references }: { references?: Reference[] }) {
  if (!references?.length) return null;
  return (
    <SurfaceCard label="Go Deeper">
      <ul className="divide-y divide-[var(--border)]/40">
        {references.map((r, i) => (
          <li key={i}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 px-6 py-3 text-[13px] transition-opacity hover:opacity-70"
              style={{ color: 'var(--cam-primary)' }}
            >
              <span>{r.label}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </li>
        ))}
      </ul>
    </SurfaceCard>
  );
}
