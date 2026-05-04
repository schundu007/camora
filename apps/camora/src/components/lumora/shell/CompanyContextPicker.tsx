import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  fetchCompanyPreps,
  fetchCompanyPrep,
  applyPrepToActiveAssistant,
  getActivePrepId,
  ASSISTANT_UPDATED_EVENT,
  type CompanyPrepListItem,
} from '../../../lib/companyContext';

/**
 * Behavioral-tab picker for "scope Sona to one company's generated
 * prep". A pill capsule in the AICompanionPanel header shows the
 * active company; clicking opens a dialog with the user's saved
 * company-preps. Picking one writes it into the active Lumora
 * assistant's studyDocs (as a single `Company Prep — <name>` entry)
 * so buildSystemContext picks it up on the very next stream.
 *
 * Lean-toward semantics, not refuse: the existing studyDocs prompt
 * tells Sona to "treat as authoritative reference material when
 * relevant — quote, cite by filename, and prefer them over your
 * priors when they overlap." General-knowledge questions still get
 * answered.
 */
export default function CompanyContextPicker() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preps, setPreps] = useState<CompanyPrepListItem[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(getActivePrepId());
  const [activeName, setActiveName] = useState<string | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);

  // When the picker first lands, look up the saved active id's name so
  // the chip can show "📋 Acme" without forcing the user to open the
  // dialog.
  useEffect(() => {
    if (!activeId || !token || activeName) return;
    let alive = true;
    fetchCompanyPreps(token).then((list) => {
      if (!alive) return;
      setPreps(list);
      const found = list.find((p) => p.id === activeId);
      if (found) setActiveName(found.company_name);
    });
    return () => { alive = false; };
  }, [activeId, token, activeName]);

  const refreshList = async () => {
    if (!token) return;
    setLoading(true);
    const list = await fetchCompanyPreps(token);
    setPreps(list);
    if (activeId) {
      const found = list.find((p) => p.id === activeId);
      setActiveName(found?.company_name || null);
    }
    setLoading(false);
  };

  const handleOpen = () => {
    setOpen(true);
    if (!preps) refreshList();
  };

  const handlePick = async (prepId: string) => {
    if (!token) return;
    setPickingId(prepId);
    const prep = await fetchCompanyPrep(prepId, token);
    if (prep) {
      applyPrepToActiveAssistant(prep);
      setActiveId(prep.id);
      setActiveName(prep.company_name);
    }
    setPickingId(null);
    setOpen(false);
  };

  const handleClear = () => {
    applyPrepToActiveAssistant(null);
    setActiveId(null);
    setActiveName(null);
    setOpen(false);
  };

  // Esc to close + body scroll lock.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Listen for cross-window assistant updates so two open behavioral
  // tabs stay in sync.
  useEffect(() => {
    const sync = () => setActiveId(getActivePrepId());
    window.addEventListener(ASSISTANT_UPDATED_EVENT, sync);
    return () => window.removeEventListener(ASSISTANT_UPDATED_EVENT, sync);
  }, []);

  const label = activeId
    ? activeName
      ? `Company: ${activeName}`
      : 'Loading company...'
    : 'Pick Company Prep';

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="Scope Sona to one of your saved company preps"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-[0.1em] transition-colors"
        style={{
          background: 'rgba(255,255,255,0.12)',
          border: `1px solid var(--cam-gold-leaf)`,
          color: '#fff',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          maxWidth: 240,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
        <span className="truncate" style={{ maxWidth: 180 }}>{label}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Pick company prep for Sona context"
          onClick={() => setOpen(false)}
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{
              width: 'min(560px, 92vw)',
              maxHeight: '80vh',
              background: 'var(--bg-surface)',
              border: '1px solid var(--cam-gold-leaf)',
              boxShadow:
                '0 20px 60px rgba(0,0,0,0.4),' +
                ' 0 1px 0 color-mix(in srgb, var(--cam-gold-leaf) 22%, transparent),' +
                ' inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            {/* Header — navy strip + gold-leaf border + glassy pill label */}
            <div
              className="relative px-5 py-4 border-b"
              style={{
                borderColor: 'var(--cam-gold-leaf)',
                background:
                  'linear-gradient(135deg, rgba(38,97,156,0.05) 0%, rgba(201,162,39,0.06) 100%)',
              }}
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                style={{
                  background:
                    'linear-gradient(180deg, var(--cam-primary) 0%, var(--cam-primary-dk) 100%)',
                }}
              />
              <div className="pl-3">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 mb-2 rounded-full text-[10px] font-extrabold uppercase tracking-[0.16em]"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--cam-gold-leaf)',
                    color: 'var(--cam-gold-leaf-text)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.45)',
                  }}
                >
                  Company Context
                </span>
                <h2
                  className="text-[18px] font-extrabold tracking-tight"
                  style={{ color: 'var(--cam-primary)' }}
                >
                  Pick a company prep for Sona
                </h2>
                <p className="text-[12.5px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Sona will lean on the picked company&apos;s prep material as authoritative
                  reference for behavioral answers.
                </p>
              </div>
            </div>

            {/* List body — scrolls inside the dialog */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {loading && (
                <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  Loading your company preps&hellip;
                </div>
              )}
              {!loading && preps && preps.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <p className="text-[14px] mb-2" style={{ color: 'var(--text-primary)' }}>
                    You haven&apos;t generated any company preps yet.
                  </p>
                  <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                    Create one from <strong>Prepare → Company-specific prep</strong> first, then
                    come back here to scope Sona to it.
                  </p>
                </div>
              )}
              {!loading && preps && preps.length > 0 && (
                <ul className="space-y-1">
                  {preps.map((p) => {
                    const isActive = p.id === activeId;
                    const isPicking = p.id === pickingId;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => handlePick(p.id)}
                          disabled={!!pickingId}
                          className="w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start gap-3"
                          style={{
                            background: isActive
                              ? 'color-mix(in srgb, var(--cam-gold-leaf) 12%, var(--bg-elevated))'
                              : 'transparent',
                            border: isActive
                              ? '1px solid var(--cam-gold-leaf)'
                              : '1px solid transparent',
                            cursor: pickingId ? 'wait' : 'pointer',
                            opacity: pickingId && !isPicking ? 0.5 : 1,
                          }}
                        >
                          <span
                            aria-hidden="true"
                            className="mt-1 inline-block w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              background: isActive ? 'var(--cam-primary)' : 'var(--border)',
                            }}
                          />
                          <span className="flex-1 min-w-0">
                            <span
                              className="block text-[14px] font-bold"
                              style={{ color: isActive ? 'var(--cam-primary)' : 'var(--text-primary)' }}
                            >
                              {p.company_name}
                            </span>
                            {p.updated_at && (
                              <span
                                className="block text-[11px] mt-0.5"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                Updated {new Date(p.updated_at).toLocaleDateString()}
                              </span>
                            )}
                          </span>
                          {isPicking && (
                            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              Loading&hellip;
                            </span>
                          )}
                          {isActive && !isPicking && (
                            <span
                              className="text-[10px] font-extrabold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full"
                              style={{
                                background: 'var(--cam-primary)',
                                color: '#fff',
                              }}
                            >
                              Active
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer — clear + cancel */}
            <div
              className="flex items-center justify-between px-5 py-3 gap-2 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                type="button"
                onClick={handleClear}
                disabled={!activeId}
                className="text-[12px] font-semibold transition-colors"
                style={{
                  color: activeId ? 'var(--text-secondary)' : 'var(--text-muted)',
                  opacity: activeId ? 1 : 0.5,
                  cursor: activeId ? 'pointer' : 'not-allowed',
                }}
              >
                Clear company context
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-md"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
