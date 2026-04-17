import { useRef, useEffect } from 'react';
import { useInterviewStore } from '@/stores/interview-store';

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
  isOpen: boolean;
  onClose: () => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
  onAskQuestion: (q: string) => void;
  /** When set, show this specific history entry's answer */
  viewingIdx?: number | null;
}

/** Extract plain text from any block format for simple Q&A display */
function extractText(blocks: any): string {
  if (!blocks) return '';
  // Array of parsed blocks (tag-based)
  if (Array.isArray(blocks)) {
    return blocks
      .filter((b: any) => b.content && typeof b.content === 'string')
      .map((b: any) => {
        const label = b.type && b.type !== 'ANSWER' && b.type !== 'HEADLINE' ? `**${b.type}**\n` : '';
        return label + b.content;
      })
      .join('\n\n');
  }
  // JSON object (system design, coding)
  if (typeof blocks === 'object') {
    const parts: string[] = [];
    if (blocks.systemDesign) {
      const sd = blocks.systemDesign;
      if (sd.overview) parts.push(sd.overview);
      if (sd.requirements?.functional) parts.push('**Functional Requirements**\n' + sd.requirements.functional.map((r: string) => `• ${r}`).join('\n'));
      if (sd.requirements?.nonFunctional) parts.push('**Non-Functional Requirements**\n' + sd.requirements.nonFunctional.map((r: string) => `• ${r}`).join('\n'));
      if (sd.tradeoffs) parts.push('**Trade-offs**\n' + sd.tradeoffs.map((t: string) => `• ${t}`).join('\n'));
      if (sd.edgeCases) parts.push('**Edge Cases**\n' + sd.edgeCases.map((e: string) => `• ${e}`).join('\n'));
    }
    if (blocks.pitch) {
      const p = typeof blocks.pitch === 'string' ? blocks.pitch : (blocks.pitch.opener ? blocks.pitch.opener + '\n\n' + (blocks.pitch.approach || '') : blocks.pitch.approach || '');
      if (p) parts.push(p);
      if (blocks.pitch?.keyPoints) parts.push('**Key Points**\n' + blocks.pitch.keyPoints.map((k: string) => `• ${k}`).join('\n'));
    }
    if (blocks.solutions) {
      blocks.solutions.forEach((sol: any, i: number) => {
        parts.push(`**${sol.name || `Solution ${i + 1}`}**\n${sol.approach || ''}`);
      });
    }
    return parts.join('\n\n');
  }
  return String(blocks);
}

export function AICompanionPanel({ isOpen, onClose, inputValue, setInputValue, onSubmit, isStreaming, onAskQuestion, viewingIdx }: AICompanionPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { history, question, streamChunks, isDesignQuestion, isCodingQuestion, parsedBlocks } = useInterviewStore();

  useEffect(() => {
    if (panelRef.current && isStreaming) panelRef.current.scrollTop = panelRef.current.scrollHeight;
  }, [streamChunks, isStreaming]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const hasContent = isStreaming || parsedBlocks.length > 0 || history.length > 0;

  const SUGGESTIONS = [
    'What are some tips for system design interviews?',
    'Practice a coding problem with me',
    'Help me answer behavioral questions',
    'Tell me what I can do with AI Copilot',
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />

      {/* Floating panel — anchored bottom-right */}
      <div className="fixed bottom-20 right-6 z-50 flex flex-col w-[380px] max-h-[70vh] rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: C.surface, border: `1px solid ${C.border}` }}>

        {/* Header */}
        <div className="flex items-center justify-between h-12 px-4 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="text-[13px] font-semibold" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>AI Copilot</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: C.muted }}
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = C.muted}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div ref={panelRef} className="flex-1 overflow-auto p-4">
          {!hasContent ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative w-14 h-14 mb-5">
                <svg width="56" height="56" viewBox="0 0 64 64" fill="none" className="animate-[spin_8s_linear_infinite]">
                  <path d="M32 4L36.5 24.5L52 16L43.5 36.5L64 32L43.5 36.5L52 52L36.5 43.5L32 64L27.5 43.5L12 52L20.5 36.5L0 32L20.5 27.5L12 12L27.5 20.5L32 4Z" fill="url(#sparkle2)" fillOpacity="0.5" />
                  <defs><linearGradient id="sparkle2" x1="0" y1="0" x2="64" y2="64"><stop stopColor={C.accent} /><stop offset="1" stopColor="#6366f1" /></linearGradient></defs>
                </svg>
              </div>
              <p className="text-sm font-medium mb-4" style={{ color: C.muted, fontFamily: 'var(--font-sans)' }}>Ask me anything about your interview</p>
              <div className="grid grid-cols-2 gap-2 w-full">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => onAskQuestion(s)}
                    className="text-left px-3 py-3 rounded-xl text-[12px] leading-snug transition-all"
                    style={{ border: `1px solid ${C.border}`, fontFamily: 'var(--font-sans)', color: C.muted }}
                    onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = C.elevated; }}
                    onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = 'transparent'; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Show specific entry or latest — simple Q&A chat format */}
              {(() => {
                const showIdx = viewingIdx != null ? viewingIdx : history.length - 1;
                const entry = history[showIdx];
                if (!entry && !isStreaming) return null;
                return entry ? (
                  <>
                    {/* Question */}
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold shrink-0 mt-1 w-5 h-5 rounded flex items-center justify-center" style={{ background: C.accentBg, color: C.accent }}>Q</span>
                      <p className="text-[13px] font-medium leading-snug" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>{entry.question}</p>
                    </div>
                    {/* Answer — plain text */}
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold shrink-0 mt-1 w-5 h-5 rounded flex items-center justify-center" style={{ background: C.elevated, color: C.muted }}>A</span>
                      <div className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>
                        {extractText(entry.blocks).split(/\*\*(.+?)\*\*/g).map((part, i) =>
                          i % 2 === 1
                            ? <strong key={i} className="block mt-3 mb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.accent }}>{part}</strong>
                            : <span key={i}>{part}</span>
                        )}
                      </div>
                    </div>
                  </>
                ) : null;
              })()}

              {/* Current streaming — show raw chunks as text */}
              {isStreaming && question && (
                <>
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold shrink-0 mt-1 w-5 h-5 rounded flex items-center justify-center" style={{ background: C.accentBg, color: C.accent }}>Q</span>
                    <p className="text-[13px] font-medium leading-snug" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>{question}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold shrink-0 mt-1 w-5 h-5 rounded flex items-center justify-center animate-pulse" style={{ background: C.accentBg, color: C.accent }}>A</span>
                    <div className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>
                      {streamChunks.join('') || <span className="animate-pulse" style={{ color: C.muted }}>Thinking...</span>}
                      <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: C.accent }} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-3 pb-3 pt-1 shrink-0">
          <div className="flex items-center gap-2 px-3 h-10 rounded-xl transition-all focus-within:ring-1"
            style={{ background: C.elevated, border: `1px solid ${C.border}`, '--tw-ring-color': 'rgba(99,102,241,0.4)' } as React.CSSProperties}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: C.muted, flexShrink: 0 }}>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {isStreaming && <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: C.accent }} />}
            <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
              placeholder="Ask a question..."
              className="flex-1 bg-transparent text-[13px] focus:outline-none min-w-0 placeholder:opacity-50"
              style={{ fontFamily: 'var(--font-sans)', color: C.text }} disabled={isStreaming} />
            {inputValue.trim() && !isStreaming && (
              <button onClick={onSubmit} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: '#6366f1' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>
          <p className="text-[10px] mt-1.5 text-center" style={{ fontFamily: 'var(--font-sans)', color: C.muted }}>AI can make mistakes. Review for accuracy.</p>
        </div>
      </div>
    </>
  );
}

/* ── Floating toggle button ── */
export function AICompanionToggle({ onClick, hasActivity }: { onClick: () => void; hasActivity: boolean }) {
  return (
    <button onClick={onClick}
      className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
      style={{ background: '#6366f1' }} title="AI Copilot">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      {hasActivity && (
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2" style={{ borderColor: C.base }} />
      )}
    </button>
  );
}
