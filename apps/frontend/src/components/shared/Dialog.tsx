import { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';

/* ── In-app dialog system ──────────────────────────────────────
   Replaces native window.confirm / window.alert so every prompt
   renders inside the Camora chrome (tokens, fonts, dark-mode aware)
   instead of the browser's OS dialog.

   Two ways to use:
   1. Inside components — call useDialog() to get { confirm, alert }.
   2. Anywhere else (event handlers, arrow fns, async code) —
      import { dialogConfirm, dialogAlert } and call directly.
      The module-level refs are set by <DialogProvider> on mount. */

export type ConfirmOpts = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
};
export type AlertOpts = {
  title?: string;
  message: string;
  okLabel?: string;
  tone?: 'default' | 'danger' | 'success';
};

type PendingConfirm = { kind: 'confirm'; opts: ConfirmOpts; resolve: (v: boolean) => void };
type PendingAlert = { kind: 'alert'; opts: AlertOpts; resolve: () => void };
type Pending = PendingConfirm | PendingAlert;

let _confirmImpl: ((opts: ConfirmOpts) => Promise<boolean>) | null = null;
let _alertImpl: ((opts: AlertOpts) => Promise<void>) | null = null;

export function dialogConfirm(opts: ConfirmOpts | string): Promise<boolean> {
  const o: ConfirmOpts = typeof opts === 'string' ? { message: opts } : opts;
  if (_confirmImpl) return _confirmImpl(o);
  // Fallback to native if the provider hasn't mounted yet
  return Promise.resolve(window.confirm(o.message));
}
export function dialogAlert(opts: AlertOpts | string): Promise<void> {
  const o: AlertOpts = typeof opts === 'string' ? { message: opts } : opts;
  if (_alertImpl) return _alertImpl(o);
  window.alert(o.message);
  return Promise.resolve();
}

interface DialogContextValue {
  confirm: (opts: ConfirmOpts | string) => Promise<boolean>;
  alert: (opts: AlertOpts | string) => Promise<void>;
}
const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (ctx) return ctx;
  // Fallback — lets components work before provider mounts or in tests
  return { confirm: dialogConfirm, alert: dialogAlert };
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback((opts: ConfirmOpts | string) => new Promise<boolean>((resolve) => {
    const o: ConfirmOpts = typeof opts === 'string' ? { message: opts } : opts;
    setPending({ kind: 'confirm', opts: o, resolve });
  }), []);

  const alert = useCallback((opts: AlertOpts | string) => new Promise<void>((resolve) => {
    const o: AlertOpts = typeof opts === 'string' ? { message: opts } : opts;
    setPending({ kind: 'alert', opts: o, resolve });
  }), []);

  // Publish module-level impls so non-component call sites can reach them
  useEffect(() => {
    _confirmImpl = confirm;
    _alertImpl = alert;
    return () => {
      if (_confirmImpl === confirm) _confirmImpl = null;
      if (_alertImpl === alert) _alertImpl = null;
    };
  }, [confirm, alert]);

  // Autofocus the primary action when the dialog appears
  useEffect(() => {
    if (pending && confirmBtnRef.current) {
      const id = setTimeout(() => confirmBtnRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [pending]);

  // Keyboard: Enter = confirm, Esc = cancel
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        close(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  function close(accepted: boolean) {
    if (!pending) return;
    if (pending.kind === 'confirm') pending.resolve(accepted);
    else pending.resolve();
    setPending(null);
  }

  const ctxValue: DialogContextValue = { confirm, alert };

  return (
    <DialogContext.Provider value={ctxValue}>
      {children}
      {pending && <DialogOverlay pending={pending} confirmBtnRef={confirmBtnRef} onClose={close} />}
    </DialogContext.Provider>
  );
}

function DialogOverlay({ pending, confirmBtnRef, onClose }: {
  pending: Pending;
  confirmBtnRef: React.MutableRefObject<HTMLButtonElement | null>;
  onClose: (accepted: boolean) => void;
}) {
  const opts = pending.opts;
  const isConfirm = pending.kind === 'confirm';
  const tone = opts.tone || (isConfirm ? 'default' : 'default');
  const danger = tone === 'danger';
  const success = tone === 'success';

  const primaryLabel = isConfirm
    ? ((opts as ConfirmOpts).confirmLabel || (danger ? 'Delete' : 'Confirm'))
    : ((opts as AlertOpts).okLabel || 'OK');
  const cancelLabel = isConfirm ? ((opts as ConfirmOpts).cancelLabel || 'Cancel') : null;
  const title = opts.title || (isConfirm ? (danger ? 'Are you sure?' : 'Confirm') : (danger ? 'Error' : success ? 'Done' : 'Notice'));

  // Route through semantic CSS vars so dialog colors flip with the theme
  // (was hardcoded crimson/emerald hex; emerald violated the navy palette
  // and the iconBg pastels disappeared on dark surfaces).
  const primaryBg = danger ? 'var(--danger)' : success ? 'var(--success)' : 'var(--cam-primary-dk)';
  const primaryBgHover = danger ? 'var(--danger)' : success ? 'var(--cam-primary-dk)' : 'var(--cam-primary-dk)';
  const iconColor = danger ? 'var(--danger)' : success ? 'var(--success)' : 'var(--cam-primary-dk)';
  const iconBg = 'var(--accent-subtle)';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(false); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="camora-dialog-title"
    >
      <div
        className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', fontFamily: "'Inter', var(--font-sans)" }}
      >
        {/* Body */}
        <div className="p-5 flex gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: iconBg, color: iconColor }}>
            {danger ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ) : success ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="camora-dialog-title" className="text-[15px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
            <p className="text-[13px] whitespace-pre-wrap" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{opts.message}</p>
          </div>
        </div>
        {/* Actions */}
        <div className="px-5 py-3 flex items-center justify-end gap-2" style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}>
          {cancelLabel && (
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-4 py-1.5 text-[13px] font-semibold rounded-md transition-colors"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={() => onClose(true)}
            className="px-4 py-1.5 text-[13px] font-semibold rounded-md transition-colors shadow-sm"
            style={{ color: '#FFFFFF', background: primaryBg, border: `1px solid ${primaryBg}` }}
            onMouseEnter={(e) => { e.currentTarget.style.background = primaryBgHover; e.currentTarget.style.borderColor = primaryBgHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = primaryBg; e.currentTarget.style.borderColor = primaryBg; }}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
