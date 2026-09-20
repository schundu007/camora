/**
 * Interview context, as a modal.
 *
 * MOBILE ONLY. On desktop this same content lives at the top of the Prep Kit
 * page — one destination for choosing the interview and working on it, rather
 * than a Setup chip and a Prep chip for two halves of one job. Mobile has no
 * rail to reach that page from, so it keeps the modal.
 *
 * The content itself is InterviewContextPanel. This file is only the chrome
 * around it.
 */
import { useEffect } from 'react';
import { InterviewContextPanel } from './InterviewContextPanel';

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
  // Escape closes. That is the only behaviour this file owns now — the
  // content it wraps manages its own state.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
          className="relative px-5 py-3.5 border-b shrink-0"
          style={{ borderColor: 'var(--lum-border)', background: 'var(--lum-bg)' }}
        >
          {/* One accent rule down the edge. The gradient wash behind it was two
              brand colours at 5% on a light panel — invisible here, and a
              gradient nobody can see is just a paint cost. */}
          <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--lum-accent)' }} />
          <div className="pl-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {/* Title only. The subtitle explained what the window was for, to
                  someone already looking at three labelled, numbered sections
                  that say it better — and the eyebrow above it said the same
                  words a third time. */}
              <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--lum-text)' }}>
                Interview context
              </h2>
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

        <div className="flex-1 overflow-y-auto">
          <InterviewContextPanel
            meetingPlatform={meetingPlatform}
            onMeetingPlatformChange={onMeetingPlatformChange}
            codingPlatform={codingPlatform}
            onCodingPlatformChange={onCodingPlatformChange}
            onActivated={onClose}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 shrink-0 border-t" style={{ borderColor: 'var(--lum-border)', background: 'var(--lum-bg)' }}>
          {/* The "manage workspaces in Documents" line went with the rest of the
              explanatory copy. The empty state already says it, in the one
              place it is actually needed — when there is nothing to pick. */}
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
