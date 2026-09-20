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

export const ASK_SURFACES: AskSurface[] = [
  // Ask Sona and Behavioral sit adjacent on purpose: both are live Q&A with
  // Sona, and the eye should not travel between them mid-interview.
  { id: 'ask', label: 'Ask Sona', path: '/lumora/ask', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8v.5z" /></svg> },
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
/**
 * @param voice  Show the enrol / filter control on the right of the strip.
 *   Whose voice becomes a question is the same rule on all four surfaces, so
 *   the control belongs wherever the question is asked — it used to exist only
 *   on behavioral, which is why the filter read as a behavioral setting rather
 *   than the standing instruction it actually is.
 */
export const AskSwitcher = ({ className = '', voice = true }: { className?: string; voice?: boolean }) => {
  const { pathname } = useLocation();
  return (
    <div className={`flex items-center gap-1 ${className}`} role="navigation" aria-label="Answer surface">
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
      {voice && (
        <span className="ml-auto pl-2 shrink-0" data-overlay-keep>
          <VoiceEnrollment disabled={false} variant="light" iconOnly />
        </span>
      )}
    </div>
  );
};
