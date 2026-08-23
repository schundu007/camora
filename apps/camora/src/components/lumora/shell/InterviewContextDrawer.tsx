import { useState, useEffect, useCallback } from 'react';
import {
  listCompanyPreps,
  getActiveCompanyKey,
  setActiveCompanyKey,
  ASSISTANT_UPDATED_EVENT,
  type CompanyPrepListItem,
} from '../../../lib/companyContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const InterviewContextDrawer = ({ open, onClose }: Props) => {
  const [items, setItems] = useState<CompanyPrepListItem[]>(() => listCompanyPreps());
  const [activeKey, setActiveKeyState] = useState<string | null>(() => getActiveCompanyKey());

  const refresh = useCallback(() => {
    setItems(listCompanyPreps());
    setActiveKeyState(getActiveCompanyKey());
  }, []);

  useEffect(() => {
    if (!open) return;
    refresh();
    window.addEventListener(ASSISTANT_UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ASSISTANT_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleActivate = (key: string) => {
    // Evict any stale file-based interview contexts left from prior sessions
    // so they can never override the prep kit selection.
    try {
      localStorage.removeItem('lumora_interview_contexts_v1');
      localStorage.removeItem('lumora_interview_contexts_v1_active');
    } catch { /* ignore */ }
    setActiveCompanyKey(key);
    onClose();
  };

  const handleDeactivate = () => {
    setActiveCompanyKey(null);
    setActiveKeyState(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Interview Context"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{
          width: 'min(520px, 94vw)',
          maxHeight: '82vh',
          background: 'var(--bg-surface)',
          border: '1px solid var(--cam-gold-leaf)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
        }}
      >
        {/* Header */}
        <div
          className="relative px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--cam-gold-leaf)', background: 'linear-gradient(135deg, rgba(38,97,156,0.05) 0%, rgba(201,162,39,0.06) 100%)' }}
        >
          <span aria-hidden className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ background: 'linear-gradient(180deg, var(--cam-primary) 0%, var(--cam-primary-dk) 100%)' }} />
          <div className="pl-3 flex items-start justify-between gap-3">
            <div>
              <span
                className="inline-flex items-center px-2.5 py-0.5 mb-2 rounded-full text-[12px] font-extrabold uppercase tracking-[0.16em]"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--cam-gold-leaf)', color: 'var(--cam-gold-leaf-text)', boxShadow: '0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.45)' }}
              >
                Interview Context
              </span>
              <h2 className="text-[18px] font-extrabold tracking-tight" style={{ color: 'var(--cam-primary)' }}>
                Your Interviews
              </h2>
              <p className="text-[12.5px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                Activate a workspace — Sona will use its JD, resume, and prep materials.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>
              </div>
              <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No prep workspaces yet</p>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Open the <strong>Documents</strong> sidebar and add a company to get started.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map(item => {
                const isActive = item.key === activeKey;
                const badges = [
                  item.hasJd && 'JD',
                  item.hasResume && 'Resume',
                  item.hasGeneratedSections && 'Prep sections',
                ].filter(Boolean) as string[];
                return (
                  <li key={item.key}>
                    <div
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{
                        background: isActive ? 'color-mix(in srgb, var(--cam-gold-leaf) 10%, var(--bg-elevated))' : 'var(--bg-elevated)',
                        border: isActive ? '1px solid var(--cam-gold-leaf)' : '1px solid var(--border)',
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: isActive ? 'var(--cam-primary)' : item.ready ? '#22c55e' : 'var(--border)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-bold truncate" style={{ color: isActive ? 'var(--cam-primary)' : 'var(--text-primary)' }}>
                            {item.key}
                          </span>
                          {isActive && (
                            <span className="text-[12px] font-extrabold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full" style={{ background: 'var(--cam-primary-dk)', color: '#fff' }}>
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {badges.length ? badges.join(' · ') : 'No materials yet — add JD or resume in Documents'}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {isActive ? (
                          <button
                            type="button"
                            onClick={handleDeactivate}
                            className="text-[12px] font-semibold px-2.5 py-1 rounded-md transition-opacity hover:opacity-80"
                            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivate(item.key)}
                            className="text-[12px] font-bold px-2.5 py-1 rounded-md transition-opacity hover:opacity-80"
                            style={{ background: 'var(--cam-primary-dk)', color: '#fff' }}
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 shrink-0 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Manage workspaces in the <strong>Documents</strong> sidebar
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-md"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
