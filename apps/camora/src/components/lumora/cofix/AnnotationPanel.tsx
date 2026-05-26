import type { CoFixChange } from '@/lib/sse-client';

interface AnnotationPanelProps {
  changes: CoFixChange[];
  width?: number;
}

export const AnnotationPanel = ({ changes, width }: AnnotationPanelProps) => {
  if (changes.length === 0) return null;

  return (
    <div
      className="flex-shrink-0 overflow-y-auto border-l border-[var(--cam-gold-leaf-dk)] bg-[var(--bg-primary)] p-3"
      style={width ? { width } : { width: 200 }}
    >
      <p className="text-[10px] font-semibold tracking-wider text-[var(--cam-gold-leaf)] uppercase mb-3">
        Changes
      </p>
      <div className="flex flex-col gap-4">
        {changes.map((change) => (
          <div key={change.badge} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className="flex-shrink-0 w-[18px] h-[18px] rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: 'var(--cam-gold-leaf)', color: '#0a0e1a' }}
              >
                {change.badge}
              </span>
              <span className="text-[11px] font-medium text-[var(--text-primary)] leading-tight">
                {change.label}
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] pl-[26px] leading-relaxed">
              {change.note}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
