import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInterviewStore } from '@/stores/interview-store';
import { StreamingAnswer } from '@/components/lumora/interview/StreamingAnswer';
import { AnswerBlocks } from '@/components/lumora/interview/AnswerBlocks';

/* ── Color tokens (standardized) ── */
const C = {
  base: '#0D0C14',
  surface: '#16141F',
  elevated: '#1E1C28',
  text: '#F2F1F3',
  muted: '#6C6B7B',
  accent: '#818cf8',
  accentBg: 'rgba(99,102,241,0.12)',
  border: 'rgba(255,255,255,0.06)',
};

interface AICompanionPanelProps {
  inputValue: string;
  setInputValue: (v: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
  onAskQuestion: (q: string) => void;
  activeTab: 'interview' | 'coding' | 'design';
}

function safeBlocks(blocks: any): any[] {
  if (Array.isArray(blocks)) return blocks;
  if (blocks && typeof blocks === 'object') {
    const result: any[] = [];
    if (blocks.systemDesign?.overview) result.push({ type: 'HEADLINE', content: blocks.systemDesign.overview });
    if (blocks.pitch) result.push({ type: 'ANSWER', content: typeof blocks.pitch === 'string' ? blocks.pitch : blocks.pitch.approach || '' });
    if (result.length > 0) return result;
  }
  return [];
}

export function AICompanionPanel({ inputValue, setInputValue, onSubmit, isStreaming, onAskQuestion, activeTab }: AICompanionPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { history, question, streamChunks, isDesignQuestion, isCodingQuestion, parsedBlocks } = useInterviewStore();

  useEffect(() => {
    if (panelRef.current && isStreaming) panelRef.current.scrollTop = panelRef.current.scrollHeight;
  }, [streamChunks, isStreaming]);

  const hasContent = activeTab === 'interview' && (isStreaming || parsedBlocks.length > 0 || history.length > 0);

  const SUGGESTIONS = [
    'What are some tips for system design interviews?',
    'Practice a coding problem with me',
    'Help me answer behavioral questions',
    'Tell me what I can do with AI Companion',
  ];

  return (
    <div className="hidden lg:flex flex-col w-[340px] shrink-0 h-full" style={{ background: C.surface, borderLeft: `1px solid ${C.border}` }}>
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span className="text-[13px] font-semibold" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>AI Companion</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg transition-colors" style={{ color: C.muted }} title="Notifications">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
          </button>
          <button className="p-1.5 rounded-lg transition-colors" style={{ color: C.muted }} title="Pop out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={panelRef} className="flex-1 overflow-auto p-4">
        {!hasContent ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative w-16 h-16 mb-6">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="animate-[spin_8s_linear_infinite]">
                <path d="M32 4L36.5 24.5L52 16L43.5 36.5L64 32L43.5 36.5L52 52L36.5 43.5L32 64L27.5 43.5L12 52L20.5 36.5L0 32L20.5 27.5L12 12L27.5 20.5L32 4Z" fill="url(#sparkle)" fillOpacity="0.6" />
                <defs><linearGradient id="sparkle" x1="0" y1="0" x2="64" y2="64"><stop stopColor={C.accent} /><stop offset="1" stopColor="#6366f1" /></linearGradient></defs>
              </svg>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => onAskQuestion(s)}
                  className="text-left px-3 py-3.5 rounded-xl text-[12px] leading-snug transition-all"
                  style={{ border: `1px solid ${C.border}`, fontFamily: 'var(--font-sans)', color: C.muted }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = C.elevated; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = 'transparent'; }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {isStreaming && question && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: C.accentBg }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
                <p className="text-sm leading-relaxed" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>{question}</p>
              </div>
            )}
            {isStreaming && <StreamingAnswer chunks={streamChunks} isDesign={isDesignQuestion} isCoding={isCodingQuestion} />}
            {!isStreaming && history.length > 0 && (() => {
              const last = history[history.length - 1];
              return (
                <>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: C.accentBg }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>{last.question}</p>
                  </div>
                  <AnswerBlocks blocks={safeBlocks(last.blocks)} isDesign={false} isCoding={false} question={last.question} />
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Link */}
      <div className="px-4 py-2 text-right shrink-0">
        <Link to="/capra/prepare" className="text-xs font-medium transition-colors" style={{ fontFamily: 'var(--font-sans)', color: C.accent }}>
          Open in Prepare →
        </Link>
      </div>

      {/* Input */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex items-center gap-2 px-3 h-10 rounded-xl transition-all focus-within:ring-1" style={{ background: C.elevated, border: `1px solid ${C.border}`, '--tw-ring-color': 'rgba(99,102,241,0.4)' } as React.CSSProperties}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: C.muted, flexShrink: 0 }}>
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          {isStreaming && <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: C.accent }} />}
          <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
            placeholder="Write a message or type / for more"
            className="flex-1 bg-transparent text-[13px] focus:outline-none min-w-0"
            style={{ fontFamily: 'var(--font-sans)', color: C.text, '--placeholder-color': C.muted } as React.CSSProperties} disabled={isStreaming} />
          {inputValue.trim() && !isStreaming && (
            <button onClick={onSubmit} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: '#6366f1' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
        <p className="text-[10px] mt-1.5 text-center" style={{ fontFamily: 'var(--font-sans)', color: C.muted }}>AI can make mistakes. Review for accuracy.</p>
      </div>
    </div>
  );
}
