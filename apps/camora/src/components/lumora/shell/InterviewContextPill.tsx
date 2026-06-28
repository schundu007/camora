import { useState, useEffect } from 'react';
import {
  getActiveInterviewContext,
  INTERVIEW_CONTEXT_UPDATED_EVENT,
  type InterviewContext,
} from '../../../lib/interview-context';

interface Props {
  onOpen: () => void;
}

export const InterviewContextPill = ({ onOpen }: Props) => {
  const [ctx, setCtx] = useState<InterviewContext | null>(() => getActiveInterviewContext());

  useEffect(() => {
    const update = () => setCtx(getActiveInterviewContext());
    window.addEventListener(INTERVIEW_CONTEXT_UPDATED_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(INTERVIEW_CONTEXT_UPDATED_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const hasContext = !!(ctx && (ctx.cachedJd || ctx.cachedResume));

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-[background-color,opacity] hover:opacity-80 active:scale-[0.97] shrink-0"
      style={hasContext
        ? {
            background: 'var(--cam-chip-active-bg)',
            color: 'var(--cam-chip-active-text)',
            border: '1px solid rgba(201,162,39,0.40)',
            boxShadow: '0 0 0 2px rgba(201,162,39,0.15)',
          }
        : {
            background: 'var(--lumora-chrome-bg)',
            border: '1px solid var(--lumora-chrome-border)',
            color: 'var(--lumora-chrome-text)',
          }
      }
      title={hasContext ? `Interview context: ${ctx!.name}` : 'Set interview context for Sona'}
      aria-label={hasContext ? `Interview context: ${ctx!.name} — click to change` : 'Set interview context'}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      </svg>
      <span className="max-w-[110px] truncate">
        {hasContext ? ctx!.name : '+ Context'}
      </span>
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
};
