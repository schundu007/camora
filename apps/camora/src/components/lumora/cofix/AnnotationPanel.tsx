import type { CoFixChange, CoFixWalkStep } from '@/lib/sse-client';

interface AnnotationPanelProps {
  changes: CoFixChange[];
  walkthrough?: CoFixWalkStep[];
}

// Render **bold** and `code` inline spans
const inlineFormat = (text: string) => {
  const nodes: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let last = 0, m: RegExpExecArray | null, key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(<strong key={key++} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{m[1]}</strong>);
    } else {
      nodes.push(
        <code key={key++} style={{ padding: '1px 4px', borderRadius: 3, background: 'rgba(20,184,166,0.15)', color: '#2dd4bf', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, letterSpacing: '-0.01em' }}>
          {m[2]}
        </code>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
};

export const AnnotationPanel = ({ changes, walkthrough = [] }: AnnotationPanelProps) => {
  const hasChanges = changes.length > 0;
  const hasWalkthrough = walkthrough.length > 0;

  return (
    <div
      className="w-full h-full overflow-y-auto border-l border-[var(--cam-gold-leaf-dk)] bg-[var(--bg-primary)]"
    >
      {/* Walk-Through section */}
      {hasWalkthrough && (
        <div className="px-3 pt-3 pb-2">
          <p className="text-[9px] font-bold tracking-[0.12em] uppercase mb-2.5" style={{ color: 'var(--cam-gold-leaf)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Walk-Through
            <span className="ml-1.5 normal-case font-normal text-[8.5px] opacity-60" style={{ letterSpacing: '0.03em' }}>say to interviewer</span>
          </p>
          <div className="flex flex-col gap-2.5">
            {walkthrough.map((step, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="mt-[4px] shrink-0 w-1 h-1 rounded-full" style={{ background: 'var(--cam-primary)' }} />
                <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {`Line${step.lines.includes('-') || step.lines.includes(',') ? 's' : ''} ${step.lines}`}
                    {step.context ? ` (${step.context})` : ''}:
                  </strong>
                  {' '}
                  {inlineFormat(step.text)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider between sections */}
      {hasWalkthrough && hasChanges && (
        <div className="mx-3 my-1" style={{ height: 1, background: 'rgba(196,160,60,0.15)' }} />
      )}

      {/* Changes section */}
      {hasChanges && (
        <div className="px-3 pt-2 pb-3">
          <p className="text-[9px] font-bold tracking-[0.12em] uppercase mb-2.5" style={{ color: 'var(--cam-gold-leaf)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Changes
          </p>
          <div className="flex flex-col gap-3.5">
            {changes.map((change) => (
              <div key={change.badge} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className="flex-shrink-0 w-[16px] h-[16px] rounded-full text-[8px] font-bold flex items-center justify-center"
                    style={{ background: 'var(--cam-gold-leaf)', color: '#0a0e1a' }}
                  >
                    {change.badge}
                  </span>
                  <span className="text-[10px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {change.label}
                  </span>
                </div>
                <p className="text-[9.5px] leading-relaxed pl-[24px]" style={{ color: 'var(--text-muted)' }}>
                  {change.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
