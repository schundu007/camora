import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInterviewStore } from '@/stores/interview-store';
import { DESIGN_BLOCK_TYPES, CODING_BLOCK_TYPES } from '@/lib/constants';
import { AnswerBlocks } from './AnswerBlocks';
import { StreamingAnswer } from './StreamingAnswer';

function isDesignBlocks(blocks: any): boolean {
  if (!blocks) return false;
  if (Array.isArray(blocks)) return blocks.some(b => (DESIGN_BLOCK_TYPES as readonly string[]).includes(b.type));
  if (blocks.systemDesign) return true;
  return false;
}
function isCodingBlocks(blocks: any): boolean {
  if (!blocks) return false;
  if (Array.isArray(blocks)) return blocks.some(b => (CODING_BLOCK_TYPES as readonly string[]).includes(b.type));
  if (blocks.code) return true;
  return false;
}
function safeBlocks(blocks: any): any[] {
  if (Array.isArray(blocks)) return blocks;
  if (blocks && typeof blocks === 'object') {
    const result: any[] = [];
    if (blocks.systemDesign) {
      const sd = blocks.systemDesign;
      if (sd.overview) result.push({ type: 'HEADLINE', content: sd.overview });
      if (sd.requirements) {
        const reqs = [
          'FUNCTIONAL',
          ...(sd.requirements.functional || []).map((r: string) => `- ${r}`),
          'NON-FUNCTIONAL',
          ...(sd.requirements.nonFunctional || []).map((r: string) => `- ${r}`),
        ].join('\n');
        result.push({ type: 'REQUIREMENTS', content: reqs });
      }
      if (sd.scaleEstimates) {
        result.push({ type: 'SCALEMATH', content: Object.entries(sd.scaleEstimates).map(([k, v]) => `${k}: ${v}`).join('\n') });
      }
      if (sd.tradeoffs) result.push({ type: 'TRADEOFFS', content: sd.tradeoffs.map((t: string) => `- ${t}`).join('\n') });
      if (sd.edgeCases) result.push({ type: 'EDGECASES', content: sd.edgeCases.map((e: string) => `- ${e}`).join('\n') });
      if (sd.followups) result.push({ type: 'FOLLOWUP', content: sd.followups.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n') });
    }
    if (blocks.pitch) result.push({ type: 'ANSWER', content: typeof blocks.pitch === 'string' ? blocks.pitch : blocks.pitch.approach || '' });
    if (result.length > 0) return result;
  }
  return [];
}

interface InterviewPanelProps {
  onAskQuestion?: (question: string) => void;
  onSwitchToCoding?: (problem?: string) => void;
  onSwitchToDesign?: (problem?: string) => void;
  focusedEntry?: number | null;
  onClearFocus?: () => void;
  /** Called when user clicks a history entry — opens copilot with that answer */
  onViewAnswer?: (idx: number) => void;
}

export function InterviewPanel({ onAskQuestion, onSwitchToCoding, onSwitchToDesign, focusedEntry, onClearFocus, onViewAnswer }: InterviewPanelProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (focusedEntry !== null && focusedEntry !== undefined) {
      setExpandedIdx(focusedEntry);
      onClearFocus?.();
    }
  }, [focusedEntry, onClearFocus]);

  const {
    question,
    isStreaming,
    isDesignQuestion,
    isCodingQuestion,
    streamChunks,
    parsedBlocks,
    error,
    history,
    removeHistoryEntry,
    setError,
  } = useInterviewStore();

  const showEmptyState = !question && !isStreaming && parsedBlocks.length === 0 && history.length === 0;

  return (
    <main className="flex-1 min-h-0 overflow-auto flex flex-col">
      {showEmptyState ? (
        <EmptyState onAskQuestion={onAskQuestion} onSwitchToCoding={onSwitchToCoding} onSwitchToDesign={onSwitchToDesign} />
      ) : (
        <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-auto w-full mx-auto px-2 sm:px-3 py-2" style={{ maxWidth: 'min(700px, 100%)' }}>
          {/* Q&A history */}
          {history.length > 0 && history.map((entry, idx) => (
            <div key={idx} className="shrink-0">
              <button
                onClick={() => onViewAnswer ? onViewAnswer(idx) : setExpandedIdx(expandedIdx === idx ? null : idx)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group"
                style={{ background: 'transparent', border: '1px solid transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
              >
                <span className="flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold shrink-0"
                  style={{ background: '#2D8CFF10', color: '#2D8CFF', fontFamily: 'var(--font-code)' }}>
                  {idx + 1}
                </span>
                <span className="text-[13px] font-medium leading-snug flex-1 truncate" style={{ fontFamily: 'var(--font-sans)', color: 'rgba(255,255,255,0.9)' }}>
                  {entry.question}
                </span>
                <svg className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#2D8CFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ))}

          {/* Current streaming question */}
          {isStreaming && question && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg shrink-0" style={{ background: '#2D8CFF08', border: '1px solid #2D8CFF20' }}>
              <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
                <span className="flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold" style={{ background: '#2D8CFF15', color: '#2D8CFF', fontFamily: 'var(--font-code)' }}>
                  {history.length + 1}
                </span>
                <div className="absolute inset-0 border-2 border-transparent rounded animate-spin" style={{ borderTopColor: '#2563eb' }} />
              </div>
              <span className="text-[13px] font-medium leading-snug flex-1 truncate" style={{ fontFamily: 'var(--font-sans)', color: 'rgba(255,255,255,0.9)' }}>
                {question}
              </span>
              <span className="text-[9px] shrink-0 animate-pulse font-medium" style={{ fontFamily: 'var(--font-code)', color: '#2D8CFF' }}>generating...</span>
            </div>
          )}

          {/* Cross-sell */}
          {history.length > 0 && history.length % 3 === 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Want deeper prep?</span>
              <Link to="/capra/prepare" className="text-xs font-bold hover:opacity-90 transition-all" style={{ color: '#2D8CFF' }}>
                Explore 300+ topics →
              </Link>
            </div>
          )}

          {/* Error — red is semantic, kept minimal */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ fontFamily: 'var(--font-sans)', color: '#ef4444' }}>{error}</p>
                <button onClick={() => setError(null)} className="mt-1.5 text-xs text-red-400 hover:underline" style={{ fontFamily: 'var(--font-code)' }}>Dismiss</button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

/* ─── Zoom-style Empty State ─────────────────────────────── */
function EmptyState({ onAskQuestion, onSwitchToCoding, onSwitchToDesign }: {
  onAskQuestion?: (question: string) => void;
  onSwitchToCoding?: (problem?: string) => void;
  onSwitchToDesign?: (problem?: string) => void;
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const accent = '#2D8CFF';

  const ACTIONS = [
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>,
      label: 'Start Session', onClick: () => onAskQuestion?.('I\'m starting an interview session. Help me warm up with a quick practice question.') },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>,
      label: 'Coding', onClick: () => onSwitchToCoding?.() },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
      label: 'System Design', onClick: () => onSwitchToDesign?.() },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
      label: 'Prep Kit', onClick: () => { window.location.href = '/lumora/prepkit'; } },
  ];

  const PROMPTS = [
    'Design a URL shortener like bit.ly that handles 100M links/month',
    'Explain the difference between TCP and UDP with real-world examples',
    'Walk me through how you would handle a conflict with a teammate',
    'Implement a function to detect a cycle in a linked list',
    'What happens when you type google.com in a browser?',
    'Tell me about a time you had to make a decision with incomplete data',
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 select-none overflow-auto">
      {/* Large clock */}
      <div className="text-center mb-10">
        <h1 className="text-6xl md:text-7xl font-bold tracking-tight tabular-nums" style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 700, letterSpacing: '-0.03em', color: '#FFFFFF' }}>
          {timeStr}
        </h1>
        <p className="text-sm mt-2 font-medium" style={{ fontFamily: "'Satoshi', sans-serif", color: 'rgba(255,255,255,0.4)' }}>{dateStr}</p>
      </div>

      {/* Action buttons — all use single accent color */}
      <div className="flex items-center gap-6 mb-10">
        {ACTIONS.map((action) => (
          <button key={action.label} onClick={action.onClick} className="flex flex-col items-center gap-2.5 group">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105"
              style={{ background: accent }}>
              {action.icon}
            </div>
            <span className="text-[11px] font-medium transition-colors" style={{ fontFamily: "'Satoshi', sans-serif", color: 'rgba(255,255,255,0.4)' }}>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-full max-w-2xl h-px mb-8" style={{ background: 'rgba(255,255,255,0.08)' }} />

      {/* Quick-start prompts */}
      <div className="w-full max-w-2xl">
        <p className="text-xs font-medium mb-3 text-center" style={{ fontFamily: "'Satoshi', sans-serif", color: 'rgba(255,255,255,0.4)' }}>Try asking</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PROMPTS.map((prompt) => (
            <button key={prompt} onClick={() => onAskQuestion?.(prompt)}
              className="text-left px-4 py-3.5 rounded-xl text-[13px] leading-snug transition-all"
              style={{ fontFamily: "'Satoshi', sans-serif", border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', borderRadius: '10px' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}>
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="mt-8 flex items-center justify-center gap-4 text-[10px]" style={{ fontFamily: 'var(--font-code)', color: 'rgba(255,255,255,0.3)' }}>
        <span><kbd className="px-1.5 py-0.5 rounded" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)' }}>⌘K</kbd> focus</span>
        <span><kbd className="px-1.5 py-0.5 rounded" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)' }}>⌘M</kbd> mic</span>
        <span><kbd className="px-1.5 py-0.5 rounded" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)' }}>⌘S</kbd> search</span>
      </div>

    </div>
  );
}
