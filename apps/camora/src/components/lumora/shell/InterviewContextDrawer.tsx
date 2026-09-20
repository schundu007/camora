import { useState, useEffect, useCallback } from 'react';
import {
  listCompanyPreps,
  getActiveCompanyKey,
  setActiveCompanyKey,
  ASSISTANT_UPDATED_EVENT,
  type CompanyPrepListItem,
} from '../../../lib/companyContext';

/** One row of choices, rendered as buttons rather than a <select>.
 *
 *  A native select opens its menu in a SEPARATE OS window, which
 *  setContentProtection cannot hide — so the two platform pickers this drawer
 *  absorbed were a hole in stealth: the list would stay on screen in a share
 *  even with the rest of Camora hidden. Buttons are ordinary DOM and go with
 *  the window. */
const ChoiceRow = ({ label, hint, value, options, onChange }: {
  label: string;
  hint: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) => (
  <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--lum-border)' }}>
    <div className="flex items-baseline gap-2 mb-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--lum-accent-sm)' }}>{label}</span>
      <span className="text-[12px]" style={{ color: 'var(--lum-text-2)' }}>{hint}</span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className="px-2.5 h-7 rounded-full text-[12px] font-semibold transition-colors"
            style={on
              ? { background: 'var(--lum-accent-bg)', color: 'var(--lum-accent-sm)', border: '1px solid var(--lum-accent)' }
              : { background: 'transparent', color: 'var(--lum-text-2)', border: '1px solid var(--lum-border)' }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  </div>
);

const MEETING_OPTIONS = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'teams', label: 'Teams' },
  { value: 'meet', label: 'Google Meet' },
  { value: 'other', label: 'Other' },
];

const CODING_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'none', label: 'Disabled' },
  { value: 'hackerrank', label: 'HackerRank' },
  { value: 'leetcode', label: 'LeetCode' },
  { value: 'coderpad', label: 'CoderPad' },
  { value: 'codesignal', label: 'CodeSignal' },
  { value: 'glider', label: 'Glider' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /* The two platform pickers the rail used to carry as its own chips. They are
     the same decision as the workspace — what this interview IS — so they
     belong in the same window rather than as two more icons to hunt for. */
  meetingPlatform?: string;
  onMeetingPlatformChange?: (v: string) => void;
  codingPlatform?: string;
  onCodingPlatformChange?: (v: string) => void;
}

export const InterviewContextDrawer = ({
  open, onClose, meetingPlatform, onMeetingPlatformChange, codingPlatform, onCodingPlatformChange,
}: Props) => {
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
      // lumora-shell-root on the overlay itself. This renders as a sibling of
      // the shell, not a child, so none of the --lum-* remaps reached it and it
      // drew itself in the global Capra palette: a white panel floating over a
      // dark interview.
      className="lumora-shell-root fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Interview Context"
      onClick={onClose}
      style={{ background: 'rgba(6,9,14,0.66)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="rounded-xl overflow-hidden flex flex-col"
        data-overlay-keep
        style={{
          width: 'min(560px, 94vw)',
          maxHeight: '82vh',
          background: 'var(--lum-surface)',
          border: '1px solid var(--lum-border-strong)',
          // One shadow, no inset highlight. The gloss belonged to the light
          // palette; on a dark surface it reads as a seam across the top edge.
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Header */}
        <div
          className="relative px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--lum-border)', background: 'var(--lum-bg)' }}
        >
          {/* One accent rule down the edge. The gradient wash behind it was two
              brand colours at 5% on a light panel — invisible here, and a
              gradient nobody can see is just a paint cost. */}
          <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--lum-accent)' }} />
          <div className="pl-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--lum-text)' }}>
                Interview context
              </h2>
              <p className="text-[12px] mt-1 leading-relaxed" style={{ color: 'var(--lum-text-2)' }}>
                Pick the workspace Sona answers from, and what this interview is run on.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-opacity hover:opacity-70"
              style={{ color: 'var(--lum-text-2)', border: '1px solid var(--lum-border)' }}
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
              <div className="w-11 h-11 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'var(--lum-accent-bg)', border: '1px solid var(--lum-border)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lum-accent)" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>
              </div>
              <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--lum-text)' }}>No prep workspaces yet</p>
              <p className="text-[12px]" style={{ color: 'var(--lum-text-2)' }}>
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
                        background: isActive
                          ? 'color-mix(in oklab, var(--lum-accent) 12%, transparent)'
                          : 'var(--lum-bg)',
                        border: isActive ? '1px solid var(--lum-accent)' : '1px solid var(--lum-border)',
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: isActive ? 'var(--lum-accent)' : item.ready ? 'var(--success)' : 'var(--lum-border-strong)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--lum-text)' }}>
                            {item.key}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full" style={{ background: 'var(--lum-accent-bg)', color: 'var(--lum-accent-sm)', border: '1px solid var(--lum-accent)' }}>
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--lum-text-2)' }}>
                          {badges.length ? badges.join(' · ') : 'No materials yet — add a JD or resume in Documents'}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {isActive ? (
                          <button
                            type="button"
                            onClick={handleDeactivate}
                            className="text-[12px] font-semibold px-2.5 py-1 rounded-md transition-opacity hover:opacity-80"
                            style={{ color: 'var(--lum-text-2)', border: '1px solid var(--lum-border)' }}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivate(item.key)}
                            className="text-[12px] font-bold px-2.5 py-1 rounded-md transition-opacity hover:opacity-80"
                            style={{ background: 'var(--lum-accent-bg)', color: 'var(--lum-accent-sm)', border: '1px solid var(--lum-accent)' }}
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

        {onMeetingPlatformChange && (
          <ChoiceRow
            label="Meeting"
            hint="where the interviewer is calling from"
            value={meetingPlatform || 'zoom'}
            options={MEETING_OPTIONS}
            onChange={onMeetingPlatformChange}
          />
        )}
        {onCodingPlatformChange && (
          <ChoiceRow
            label="Coding"
            hint="the editor they will share"
            value={codingPlatform || 'auto'}
            options={CODING_OPTIONS}
            onChange={onCodingPlatformChange}
          />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 shrink-0 border-t" style={{ borderColor: 'var(--lum-border)', background: 'var(--lum-bg)' }}>
          <p className="text-[12px]" style={{ color: 'var(--lum-text-2)' }}>
            Manage workspaces in the <strong style={{ color: 'var(--lum-text)' }}>Documents</strong> sidebar
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-md"
            style={{ color: 'var(--lum-text-2)', border: '1px solid var(--lum-border)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
