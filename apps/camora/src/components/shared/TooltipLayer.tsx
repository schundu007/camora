// App-wide, in-DOM tooltip layer — replaces native HTML `title=` tooltips.
//
// WHY THIS EXISTS: the OS-drawn tooltip that a `title` attribute produces is a
// separate top-level platform window. It is NOT covered by the desktop overlay's
// setContentProtection, so it leaks into screen shares (a stealth bug) and it can
// never be themed. This layer draws the tooltip INSIDE the React DOM instead, so
// it is captured/hidden with the rest of the window and follows the navy-gold theme.
//
// USAGE: put `data-tip="..."` on any DOM element (in place of `title=`). A single
// delegated listener handles hover/focus for the whole app — no per-component wiring.
// Leave real React-component `title` PROPS (GridCard, Chip, …) alone; they are not
// DOM attributes and this layer never touches them.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SHOW_DELAY = 350;   // ms before a tooltip appears (matches native feel)
const GAP = 8;            // px between the anchor and the tooltip
const MAX_WIDTH = 280;

type TipState = { text: string; top: number; left: number; below: boolean } | null;

export function TooltipLayer() {
  const [tip, setTip] = useState<TipState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const tipElRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clear = () => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    };
    const hide = () => { clear(); anchorRef.current = null; setTip(null); };

    const place = (el: HTMLElement, text: string) => {
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Prefer below; flip above when the anchor is in the bottom third.
      const below = r.bottom + GAP + 40 < vh;
      const top = below ? r.bottom + GAP : r.top - GAP;
      let left = r.left + r.width / 2;
      // Keep the (center-anchored) bubble clear of both viewport edges.
      const half = Math.min(MAX_WIDTH, vw - 16) / 2;
      left = Math.min(Math.max(half + 8, left), vw - half - 8);
      setTip({ text, top, left, below });
    };

    const findTip = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof Element)) return null;
      const el = target.closest<HTMLElement>('[data-tip]');
      if (!el) return null;
      const text = el.getAttribute('data-tip');
      return text && text.trim() ? el : null;
    };

    const onOver = (e: PointerEvent) => {
      const el = findTip(e.target);
      if (!el) return;
      if (el === anchorRef.current) return;
      clear();
      anchorRef.current = el;
      const text = el.getAttribute('data-tip')!;
      timer.current = setTimeout(() => {
        // Anchor may have unmounted/moved during the delay.
        if (anchorRef.current === el && el.isConnected) place(el, text);
      }, SHOW_DELAY);
    };

    const onOut = (e: PointerEvent) => {
      const el = findTip(e.target);
      if (el && el === anchorRef.current) {
        // Only hide when the pointer actually left the anchor subtree.
        const to = e.relatedTarget;
        if (to instanceof Node && el.contains(to)) return;
        hide();
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      const el = findTip(e.target);
      if (!el) { return; }
      clear();
      anchorRef.current = el;
      place(el, el.getAttribute('data-tip')!);
    };

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };

    document.addEventListener('pointerover', onOver, true);
    document.addEventListener('pointerout', onOut, true);
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', hide, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    document.addEventListener('keydown', onKey, true);

    return () => {
      clear();
      document.removeEventListener('pointerover', onOver, true);
      document.removeEventListener('pointerout', onOut, true);
      document.removeEventListener('pointerdown', hide, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', hide, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('blur', hide);
      document.removeEventListener('keydown', onKey, true);
    };
  }, []);

  if (!tip) return null;

  return createPortal(
    <div
      ref={tipElRef}
      role="tooltip"
      className="fixed pointer-events-none rounded-md px-2 py-1 text-[12px] font-semibold leading-snug"
      style={{
        top: tip.top,
        left: tip.left,
        maxWidth: MAX_WIDTH,
        transform: `translate(-50%, ${tip.below ? '0' : '-100%'})`,
        zIndex: 2147483000,
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        border: '1px solid var(--cam-gold-leaf-dk, var(--border))',
        boxShadow: '0 8px 28px -10px rgba(0,0,0,0.6)',
        whiteSpace: 'pre-line',
      }}
    >
      {tip.text}
    </div>,
    document.body,
  );
}
