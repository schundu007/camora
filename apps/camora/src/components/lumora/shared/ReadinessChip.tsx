import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Check } from './readiness';

/** Keep in sync with the popover's `w-[min(306px,...)]` class below. */
const POPOVER_WIDTH = 306;

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
 *
 * The popover is portaled to document.body and positioned `fixed`. It cannot be
 * `absolute`: CoFixLayout mounts this inside an <Allotment.Pane>, and allotment's
 * own stylesheet puts `overflow: hidden` on every pane, which clips a 306px
 * popover the moment the pane is dragged near its 220px minimum.
 */
export function ReadinessChip({ blocking, degrading, onDismiss, actions }: ReadinessChipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const r = hostRef.current?.getBoundingClientRect();
    if (!r) return;
    // Keep 8px clear of BOTH viewport edges. Clamping only the right edge pushes the
    // popover's left edge off-screen when the chip sits in a narrow left-hand pane
    // (CoFixLayout's Allotment.Pane has minSize={220}; the popover is 306px wide).
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - 16);
    const right = Math.min(
      Math.max(8, window.innerWidth - r.right),
      window.innerWidth - width - 8,
    );
    setPos({ top: r.bottom + 8, right });
  }, []);

  // Measure before paint so the popover never flashes at the wrong coordinates.
  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      // The popover is portaled OUT of hostRef, so it must be checked separately —
      // otherwise clicking "Ignore this session" reads as an outside click and closes.
      if (hostRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    // `capture` so a scroll inside any ancestor (the editor, the pane) repositions us.
    document.addEventListener('mousedown', onDocPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDocPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  const items = [...blocking, ...degrading];
  if (items.length === 0) return null;

  const isBlocked = blocking.length > 0;
  // --danger and --warning/--warning-text are the real tokens (globals.css:55-56,
  // 235-236). There is no --error or --error-text in this codebase.
  const tone = isBlocked
    ? { border: 'var(--danger)', color: 'var(--danger)', bg: 'color-mix(in oklab, var(--danger) 10%, transparent)' }
    : { border: 'var(--warning)', color: 'var(--warning-text)', bg: 'color-mix(in oklab, var(--warning) 10%, transparent)' };

  const popover = open && pos ? createPortal(
    <div
      ref={popRef}
      role="group"
      aria-label="Readiness checks"
      className="fixed z-[1000] w-[min(306px,calc(100vw-16px))] rounded-lg p-1.5"
      style={{
        top: pos.top,
        right: pos.right,
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
    </div>,
    document.body,
  ) : null;

  return (
    <div ref={hostRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="h-6 px-2.5 rounded text-[11px] font-bold tracking-[0.04em] inline-flex items-center gap-1.5 transition-opacity hover:opacity-90"
        style={{ border: `1px solid ${tone.border}`, color: tone.color, background: tone.bg }}
      >
        <span aria-hidden="true">▲</span>
        {items.length} {items.length === 1 ? 'check' : 'checks'}
      </button>
      {popover}
    </div>
  );
}
