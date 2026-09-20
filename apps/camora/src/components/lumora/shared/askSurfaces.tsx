// The four Q&A surfaces, and the switcher that moves between them.
//
// They are one job — ask a question, read an answer — answered by four
// different backends: Ask Sona on ascend, Behavioral on lumora with your
// resume, and the Claude and Gemini tabs on the shared interview brief. Which
// one is answering changes the answer, so the switcher has to say which one you
// are on, and it belongs where you are already looking: directly above the box
// you type into, not across the window in the rail.
//
// One list, imported by both the rail and the switcher, so a surface can never
// exist in one and not the other.
import { Link, useLocation } from 'react-router-dom';
import { VoiceEnrollment } from '@/components/lumora/audio/VoiceEnrollment';

export type AskSurface = { id: string; label: string; path: string; icon: React.ReactNode };

/**
 * The rail chip that leads into these surfaces.
 *
 * It used to borrow the active surface's name and glyph, which read as "you
 * are on Claude" — fine until nothing was active, when it fell back to the
 * first surface and announced "Behavioral" while standing for all three. A
 * group needs its own name and its own mark.
 *
 * The mark is drawn here rather than pulled from a set: a speech bubble whose
 * body is three answer lines, longest first. It says question-in,
 * answer-out — which is the one thing all three surfaces have in common and
 * the reason they share a chip at all.
 */
export const ASK_GROUP = {
  label: 'Ask',
  icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 12.6a7.9 7.9 0 01-8 7.9 8.3 8.3 0 01-3.4-.7L4 21l1.3-4.3a7.7 7.7 0 01-.8-3.4 8 8 0 018-7.9h.5a7.9 7.9 0 017.5 7.4z" />
      <path d="M8.6 10.3h7.2" />
      <path d="M8.6 13h5" />
      <path d="M8.6 15.7h2.9" />
    </svg>
  ),
};

export const ASK_SURFACES: AskSurface[] = [
  // Ask Sona is no longer here. It held the chip on three things the tabs did
  // not have, and all three moved: its table rules for family questions ("4xx
  // vs 5xx", "the GC collectors") are in the shared brief, and the two lookups
  // that grounded it — the candidate's own prep kit and the shared knowledge
  // base — now run on both tabs. What is left that it alone does is persist a
  // conversation, and a scratchpad you consult mid-interview does not need to.
  //
  // /lumora/ask still routes and still works; it just no longer costs a chip
  // in a row read while someone is watching you.
  { id: 'behavioral', label: 'Behavioral', path: '/lumora/behavioral', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 00-16 0" /></svg> },
  { id: 'claude', label: 'Claude', path: '/lumora/claude', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 3.6 1.9 5 5.5 5.5C13.9 8 12.5 9.4 12 13c-.5-3.6-1.9-5-5.5-5.5C10.1 7 11.5 5.6 12 2zM18.5 12c.3 2.2 1.1 3 3.3 3.3-2.2.3-3 1.1-3.3 3.3-.3-2.2-1.1-3-3.3-3.3 2.2-.3 3-1.1 3.3-3.3zM6 14c.2 1.5.8 2.1 2.3 2.3C6.8 16.5 6.2 17.1 6 18.6c-.2-1.5-.8-2.1-2.3-2.3C5.2 16.1 5.8 15.5 6 14z" /></svg> },
  { id: 'gemini', label: 'Gemini', path: '/lumora/gemini', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.9 5.1 4 8.2 9.1 9.1-5.1.9-8.2 4-9.1 9.1-.9-5.1-4-8.2-9.1-9.1C8 10.2 11.1 7.1 12 2z" /></svg> },
];

/**
 * A horizontal row of the four surfaces, for the strip above a composer.
 *
 * `data-overlay-keep` on the active chip: the overlay strips backgrounds from
 * every non-button element in the shell, and without the fill there is nothing
 * left to say which surface you are on.
 */
const ACTION_ICON = {
  new: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>,
  copy: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>,
  export: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>,
  close: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>,
};

const ActionChip = ({ kind, label, onClick, disabled }: {
  kind: keyof typeof ACTION_ICON; label: string; onClick: () => void; disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    data-tip={label}
    aria-label={label}
    className="flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[12px] font-semibold whitespace-nowrap shrink-0 transition-colors disabled:opacity-40"
    style={{ background: 'transparent', color: 'var(--lum-text-2)', border: '1px solid var(--lum-border)' }}
  >
    {ACTION_ICON[kind]}
    {label}
  </button>
);

export interface AskActions {
  /** Clear this surface's Q&A. "New chat" on the tabs, "Reset" on behavioral —
   *  the same action under two names, so it gets one name here. */
  onNew?: () => void;
  onCopy?: () => void;
  onExport?: () => void;
  /** Behavioral only: shuts the companion panel. The tabs are routed pages and
   *  have nothing to shut, so they pass nothing and no chip renders. */
  onClose?: () => void;
  /** Both New and Export are meaningless on an empty surface. */
  hasContent?: boolean;
}

/**
 * @param voice  Show the enrol / filter control on the right of the strip.
 *   Whose voice becomes a question is the same rule on all four surfaces, so
 *   the control belongs wherever the question is asked — it used to exist only
 *   on behavioral, which is why the filter read as a behavioral setting rather
 *   than the standing instruction it actually is.
 */
export const AskSwitcher = ({
  className = '',
  voice = true,
  topRow = false,
  onNew,
  onCopy,
  onExport,
  onClose,
  hasContent = false,
}: {
  className?: string;
  voice?: boolean;
  /**
   * This strip is the TOPMOST row of the window, so its right end has to clear
   * the desktop window controls — the grip, the overlay slider, dock, minimise
   * and close — which are positioned over the top-right corner and are not in
   * the layout. `lumora-winctl-safe` reserves 120px for them, 188px in overlay
   * where the transparency slider widens the cluster.
   *
   * Only the surfaces where this strip is genuinely first need it. On the
   * others a strip above it already reserves, and adding it there would just
   * push the chips off their own centre.
   */
  topRow?: boolean;
} & AskActions) => {
  const { pathname } = useLocation();
  return (
    <div
      className={`flex items-center gap-1 ${topRow ? 'lumora-winctl-safe' : ''} ${className}`}
      role="navigation"
      aria-label="Answer surface"
    >
      {ASK_SURFACES.map((s) => {
        const active = pathname.startsWith(s.path);
        return (
          <Link
            key={s.id}
            to={s.path}
            aria-current={active ? 'page' : undefined}
            data-overlay-keep={active ? '' : undefined}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors"
            style={active
              ? { background: 'var(--lum-accent-bg)', color: 'var(--lum-accent-sm)', border: '1px solid var(--lum-accent)' }
              : { background: 'transparent', color: 'var(--lum-text-2)', border: '1px solid var(--lum-border)' }}
          >
            {s.icon}
            {s.label}
          </Link>
        );
      })}
      {/* Actions, in the same strip and the same shape on every surface.
          They used to be four different toolbars saying four different things
          for the same job: "New chat" on the tabs, a Reset icon on behavioral,
          "+ New" on Ask. One row, one vocabulary, so nothing has to be
          relearned when you switch mid-interview. */}
      <span className="ml-auto flex items-center gap-1 shrink-0" data-overlay-keep>
        {onNew && <ActionChip kind="new" label="New" onClick={onNew} disabled={!hasContent} />}
        {onCopy && <ActionChip kind="copy" label="Copy" onClick={onCopy} disabled={!hasContent} />}
        {onExport && <ActionChip kind="export" label="Export" onClick={onExport} disabled={!hasContent} />}
        {onClose && <ActionChip kind="close" label="Close" onClick={onClose} />}
        {voice && <VoiceEnrollment disabled={false} variant="light" iconOnly />}
      </span>
    </div>
  );
};
