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
/* A numbered section header.

   The three things this window sets are a SEQUENCE — which interview, then
   where it is held, then what you will be coding in — and numbering them says
   so. (Numbered markers are decoration on content that is not ordered; this
   content is.) The current value sits at the right of each header, so the
   window answers "what am I set up for" without reading a single chip. */
const SectionHead = ({ n, label, value }: { n: number; label: string; value: string }) => (
  <div className="flex items-center gap-2.5 mb-2.5">
    <span
      aria-hidden
      className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[10px] font-bold tabular-nums shrink-0"
      style={{ background: 'color-mix(in oklab, var(--lum-accent) 18%, transparent)', color: 'var(--lum-accent-sm)', border: '1px solid var(--lum-accent)' }}
    >
      {n}
    </span>
    <span className="text-[12px] font-semibold" style={{ color: 'var(--lum-text)' }}>{label}</span>
    <span className="ml-auto text-[12px] truncate max-w-[45%]" style={{ color: 'var(--lum-text-2)' }}>{value}</span>
  </div>
);

const ChoiceRow = ({ n, label, value, options, onChange }: {
  n: number;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) => (
  <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--lum-border)' }}>
    <SectionHead n={n} label={label} value={options.find(o => o.value === value)?.label ?? '—'} />
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className="px-3 h-7 rounded-md text-[12px] font-medium transition-colors"
            style={on
              // Ink is --lum-text, and the fill is a color-mix TINT of the
              // accent — not --lum-accent-bg.
              //
              // That token is a fill, not a colour: near-black navy in dark,
              // near-white in light, and a TRANSLUCENT blue under the overlay
              // theme. Used as text on an accent fill it turned into faint blue
              // on blue the moment the overlay was on, which is exactly the
              // trap QuestionBlock documents and I walked into anyway.
              //
              // A tint plus a border plus body ink is legible in all three,
              // and it is what the icon rail already uses to mark selection.
              ? {
                  background: 'color-mix(in oklab, var(--lum-accent) 22%, transparent)',
                  color: 'var(--lum-text)',
                  border: '1px solid var(--lum-accent)',
                  fontWeight: 600,
                }
              : { background: 'var(--lum-bg)', color: 'var(--lum-text-2)', border: '1px solid var(--lum-border)' }}
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

export interface InterviewContextPanelProps {
  /** Fired after a workspace is activated. The modal host uses it to dismiss;
   *  the page host passes nothing, because a page has nothing to dismiss. */
  onActivated?: () => void;
  meetingPlatform?: string;
  onMeetingPlatformChange?: (v: string) => void;
  codingPlatform?: string;
  onCodingPlatformChange?: (v: string) => void;
}

/**
 * The interview setup itself — which workspace Sona answers from, where the
 * call is held, and what editor gets shared.
 *
 * Extracted so it has ONE implementation and two homes: the Prep Kit page,
 * where it sits above the very materials it selects between, and a modal on
 * mobile, which has no rail to reach that page from.
 *
 * Setup and Prep were two rail entries for one job — choose the interview,
 * then work on it — which meant activating a workspace in one place and
 * editing its documents in another.
 */
export const InterviewContextPanel = ({
  meetingPlatform, onMeetingPlatformChange, codingPlatform, onCodingPlatformChange, onActivated,
}: InterviewContextPanelProps) => {
  const [items, setItems] = useState<CompanyPrepListItem[]>(() => listCompanyPreps());
  const [activeKey, setActiveKeyState] = useState<string | null>(() => getActiveCompanyKey());

  const refresh = useCallback(() => {
    setItems(listCompanyPreps());
    setActiveKeyState(getActiveCompanyKey());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(ASSISTANT_UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ASSISTANT_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);


  const handleActivate = (key: string) => {
    // Evict any stale file-based interview contexts left from prior sessions
    // so they can never override the prep kit selection.
    try {
      localStorage.removeItem('lumora_interview_contexts_v1');
      localStorage.removeItem('lumora_interview_contexts_v1_active');
    } catch { /* ignore */ }
    setActiveCompanyKey(key);
    onActivated?.();
  };

  const handleDeactivate = () => {
    setActiveCompanyKey(null);
    setActiveKeyState(null);
  };

  return (
    <>
      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {items.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-11 h-11 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'color-mix(in oklab, var(--lum-accent) 14%, transparent)', border: '1px solid var(--lum-border)' }}>
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
                          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in oklab, var(--lum-accent) 18%, transparent)', color: 'var(--lum-accent-sm)', border: '1px solid var(--lum-accent)' }}>
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
                          style={{ background: 'color-mix(in oklab, var(--lum-accent) 18%, transparent)', color: 'var(--lum-accent-sm)', border: '1px solid var(--lum-accent)' }}
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
          n={2}
          label="Where the interview is held"
          value={meetingPlatform || 'zoom'}
          options={MEETING_OPTIONS}
          onChange={onMeetingPlatformChange}
        />
      )}
      {onCodingPlatformChange && (
        <ChoiceRow
          n={3}
          label="Coding platform they will share"
          value={codingPlatform || 'auto'}
          options={CODING_OPTIONS}
          onChange={onCodingPlatformChange}
        />
      )}
    </>
  );
};
