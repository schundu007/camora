import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Keep in sync with the popover's `w-[min(220px,...)]` class below. */
const POPOVER_WIDTH = 220;

export interface ChipSelectOption {
  value: string;
  label: string;
}

export interface ChipSelectProps {
  value: string;
  options: ChipSelectOption[];
  onChange: (value: string) => void;
  /** optional short prefix shown before the value, e.g. "Lang" */
  label?: string;
  disabled?: boolean;
  title?: string;
}

/**
 * Compact chip that opens a portaled menu of options — a drop-in replacement
 * for space-eating native `<select>` toolbars. Mirrors ReadinessChip.tsx's
 * portal + positioning + outside-click/Escape lifecycle exactly: the menu is
 * portaled to document.body and positioned `fixed` so it is never clipped by
 * an `overflow:hidden` Allotment.Pane ancestor.
 */
export function ChipSelect({ value, options, onChange, label, disabled, title }: ChipSelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const r = hostRef.current?.getBoundingClientRect();
    if (!r) return;
    // Keep 8px clear of BOTH viewport edges — clamping only one side pushes
    // the popover off-screen when the chip sits near a narrow pane edge.
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - 16);
    const left = Math.min(
      Math.max(8, r.left),
      window.innerWidth - width - 8,
    );
    setPos({ top: r.bottom + 6, left });
  }, []);

  // Measure before paint so the popover never flashes at the wrong coordinates.
  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      // The menu is portaled OUT of hostRef, so it must be checked separately —
      // otherwise clicking an option reads as an outside click and closes first.
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

  const current = options.find((o) => o.value === value);

  const menu = open && pos ? createPortal(
    <div
      ref={popRef}
      role="listbox"
      aria-label={label ?? title ?? 'Options'}
      className="fixed z-[1000] w-[min(220px,calc(100vw-16px))] max-h-[min(320px,calc(100vh-16px))] overflow-y-auto rounded-lg p-1"
      style={{
        top: pos.top,
        left: pos.left,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        boxShadow: '0 12px 40px -12px rgba(0,0,0,0.55)',
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => { onChange(o.value); setOpen(false); }}
            className="w-full text-left px-2.5 py-1.5 rounded text-[12px] font-bold truncate"
            style={{
              background: active ? 'var(--cam-chip-active-bg)' : 'transparent',
              color: active ? 'var(--cam-chip-active-text)' : 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'color-mix(in oklab, var(--accent) 8%, transparent)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
          >
            {o.label}
          </button>
        );
      })}
    </div>,
    document.body,
  ) : null;

  return (
    <div ref={hostRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        disabled={disabled}
        data-tip={title}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="h-[26px] px-2.5 rounded text-[12px] font-bold inline-flex items-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          border: '1px solid var(--cam-gold-leaf-dk)',
          color: 'var(--cam-gold-leaf)',
          background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 15%, transparent) 0%, var(--bg-elevated) 100%)',
        }}
      >
        {label && (
          <span className="text-[12px] font-bold tracking-wider uppercase opacity-70">{label}</span>
        )}
        <span className="truncate max-w-[140px]">{current?.label ?? value}</span>
        <span aria-hidden="true" className="text-[12px] opacity-70">▾</span>
      </button>
      {menu}
    </div>
  );
}
