import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listCompanyPreps,
  getActiveCompanyKey,
  setActiveCompanyKey,
  ASSISTANT_UPDATED_EVENT,
  type CompanyPrepListItem,
} from '../../../lib/companyContext';

/**
 * Behavioral-tab quick switcher for Lumora Prep Kit company workspaces.
 * Reads from `lumora_prep_v8` localStorage — the same store the
 * /lumora/prepkit page writes to. Picking a workspace here is identical
 * to opening Prep Kit, switching the dropdown to that company, and
 * coming back: Sona's next stream uses that workspace's JD / resume /
 * prep materials / study docs / generated sections as authoritative
 * reference.
 *
 * Wears the docs design system chrome (navy strip, gold-leaf border,
 * glassy pill capsules) to match the rest of Lumora.
 */
const CompanyContextPicker = () => {
  const [open, setOpen] = useState(false);
  const [preps, setPreps] = useState<CompanyPrepListItem[]>(() => listCompanyPreps());
  const [activeKey, setActiveKey] = useState<string | null>(() => getActiveCompanyKey());

  // Refresh whenever the picker opens — covers the case where the user
  // adds a new workspace in /lumora/prepkit and switches back here
  // without a page reload.
  const refresh = () => {
    setPreps(listCompanyPreps());
    setActiveKey(getActiveCompanyKey());
  };

  // Sync to assistant-updated events fired anywhere in the app.
  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener(ASSISTANT_UPDATED_EVENT, onUpdate);
    // Also listen to storage events so a change in another tab is
    // reflected here.
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'lumora_prep_v8') refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(ASSISTANT_UPDATED_EVENT, onUpdate);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Esc to close + body scroll lock + refresh on open.
  useEffect(() => {
    if (!open) return;
    refresh();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handlePick = (key: string) => {
    setActiveCompanyKey(key);
    setActiveKey(key);
    setOpen(false);
  };

  const handleClear = () => {
    setActiveCompanyKey(null);
    setActiveKey(null);
    setOpen(false);
  };

  const activeName = activeKey || null;
  const label = activeName || 'Company';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={activeName ? `Active workspace: ${activeName}` : 'Switch which Prep Kit workspace Sona uses for context'}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-[0.1em] transition-colors min-w-0"
        style={{
          background: 'rgba(3,19,46,0.88)',
          border: '1px solid rgba(201,162,39,0.50)',
          color: 'rgba(255,255,255,0.90)',
          maxWidth: 160,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
        <span className="truncate min-w-0" style={{ maxWidth: 110 }}>{label}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Pick Prep Kit workspace for Sona"
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
                  Pick Prep Kit workspace for Sona
                </h2>
                <p className="text-[12.5px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Sona will lean on the picked workspace&apos;s JD, resume, prep notes, study
                  docs, and generated sections as authoritative reference for behavioral answers.
                </p>
              </div>
            </div>

            {/* List body — scrolls inside the dialog */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {preps.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <p className="text-[14px] mb-2" style={{ color: 'var(--text-primary)' }}>
                    No Prep Kit workspaces yet.
                  </p>
                  <p className="text-[12.5px] mb-3" style={{ color: 'var(--text-muted)' }}>
                    Open <strong>Documents (Prep Kit)</strong> in Lumora to add a company workspace
                    with JD, resume, and prep materials.
                  </p>
                  <Link
                    to="/lumora/prepkit"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-[12px] font-bold"
                    style={{
                      background: 'var(--cam-primary)',
                      color: '#fff',
                    }}
                  >
                    Open Prep Kit →
                  </Link>
                </div>
              )}
              {preps.length > 0 && (
                <ul className="space-y-1">
                  {preps.map((p) => {
                    const isActive = p.key === activeKey;
                    const stats = [
                      p.hasJd && 'JD',
                      p.hasResume && 'Resume',
                      p.hasGeneratedSections && 'Generated sections',
                    ].filter(Boolean) as string[];
                    return (
                      <li key={p.key}>
                        <button
                          type="button"
                          onClick={() => handlePick(p.key)}
                          className="w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start gap-3"
                          style={{
                            background: isActive
                              ? 'color-mix(in srgb, var(--cam-gold-leaf) 12%, var(--bg-elevated))'
                              : 'transparent',
                            border: isActive
                              ? '1px solid var(--cam-gold-leaf)'
                              : '1px solid transparent',
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
                            {stats.length > 0 ? (
                              <span
                                className="block text-[11px] mt-0.5"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                {stats.join(' · ')}
                              </span>
                            ) : (
                              <span
                                className="block text-[11px] mt-0.5 italic"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                Empty workspace — add JD or resume in Prep Kit first.
                              </span>
                            )}
                          </span>
                          {isActive && (
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

            {/* Footer — clear + open prep kit + close */}
            <div
              className="flex items-center justify-between px-5 py-3 gap-2 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={!activeKey}
                  className="text-[12px] font-semibold transition-colors"
                  style={{
                    color: activeKey ? 'var(--text-secondary)' : 'var(--text-muted)',
                    opacity: activeKey ? 1 : 0.5,
                    cursor: activeKey ? 'pointer' : 'not-allowed',
                  }}
                >
                  Clear active
                </button>
                <Link
                  to="/lumora/prepkit"
                  onClick={() => setOpen(false)}
                  className="text-[12px] font-semibold"
                  style={{ color: 'var(--accent)' }}
                >
                  Manage in Prep Kit →
                </Link>
              </div>
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
};

export default CompanyContextPicker;
