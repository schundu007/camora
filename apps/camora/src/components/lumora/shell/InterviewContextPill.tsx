import { useState, useEffect } from 'react';
import { getActiveCompanyKey, ASSISTANT_UPDATED_EVENT } from '../../../lib/companyContext';

interface Props {
  onOpen: () => void;
}

export const InterviewContextPill = ({ onOpen }: Props) => {
  const [activeKey, setActiveKey] = useState<string | null>(() => getActiveCompanyKey());

  useEffect(() => {
    const update = () => setActiveKey(getActiveCompanyKey());
    window.addEventListener(ASSISTANT_UPDATED_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(ASSISTANT_UPDATED_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-[background-color,opacity] hover:opacity-80 active:scale-[0.97] shrink-0"
      style={activeKey
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
      title={activeKey ? `Interview: ${activeKey}` : 'Set interview context for Sona'}
      aria-label={activeKey ? `Interview: ${activeKey} — click to change` : 'Set interview context'}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      </svg>
      <span className="max-w-[90px] truncate">
        {activeKey ?? '+ Context'}
      </span>
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
};
