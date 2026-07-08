import { useEffect, useRef, useState } from 'react';
import type { Check } from './readiness';

export interface ReadinessChipProps {
  blocking: Check[];
  degrading: Check[];
  onDismiss: (id: string) => void;
  actions?: Record<string, Array<{ label: string; onClick: () => void; primary?: boolean }>>;
}

/**
 * Renders nothing when every check passes and nothing is blocking — an always-on
 * "● Ready" pill is chrome that teaches nothing. It appears only when it has
 * something to say.
 */
export function ReadinessChip({ blocking, degrading, onDismiss, actions }: ReadinessChipProps) {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!hostRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = [...blocking, ...degrading];
  if (items.length === 0) return null;

  const isBlocked = blocking.length > 0;
  // --danger and --warning/--warning-text are the real tokens (globals.css:55-56,
  // 235-236). There is no --error or --error-text in this codebase.
  const tone = isBlocked
    ? { border: 'var(--danger)', color: 'var(--danger)', bg: 'color-mix(in oklab, var(--danger) 10%, transparent)' }
    : { border: 'var(--warning)', color: 'var(--warning-text)', bg: 'color-mix(in oklab, var(--warning) 10%, transparent)' };

  return (
    <div ref={hostRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="h-6 px-2.5 rounded text-[11px] font-bold tracking-[0.04em] inline-flex items-center gap-1.5 transition-opacity hover:opacity-90"
        style={{ border: `1px solid ${tone.border}`, color: tone.color, background: tone.bg }}
      >
        <span aria-hidden="true">▲</span>
        {items.length} {items.length === 1 ? 'check' : 'checks'}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Readiness checks"
          className="absolute top-[calc(100%+8px)] right-0 z-30 w-[306px] rounded-lg p-1.5"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            boxShadow: '0 12px 40px -12px rgba(0,0,0,0.55)',
          }}
        >
          {items.map((c, i) => (
            <div
              key={c.id}
              className="p-2.5 rounded"
              style={i > 0 ? { borderTop: '1px solid var(--border)' } : undefined}
            >
              <div className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                <span aria-hidden="true" className="text-[10px]" style={{ color: c.severity === 'blocking' ? 'var(--danger)' : 'var(--warning)' }}>▲</span>
                {c.label}
              </div>
              <p className="mt-1.5 ml-[18px] text-[12px] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
                {c.consequence}
              </p>
              <div className="mt-2 ml-[18px] flex gap-1.5 flex-wrap">
                {(actions?.[c.id] ?? []).map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => { a.onClick(); setOpen(false); }}
                    className="h-6 px-2 rounded text-[10px] font-bold tracking-[0.06em]"
                    style={{
                      border: `1px solid ${a.primary ? 'var(--cam-primary)' : 'var(--border)'}`,
                      color: a.primary ? 'var(--cam-primary)' : 'var(--text-secondary)',
                      background: 'transparent',
                    }}
                  >
                    {a.label}
                  </button>
                ))}
                {c.severity === 'degrading' && (
                  <button
                    type="button"
                    onClick={() => onDismiss(c.id)}
                    className="h-6 px-2 rounded text-[10px] font-bold tracking-[0.06em]"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'transparent' }}
                  >
                    Ignore this session
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
