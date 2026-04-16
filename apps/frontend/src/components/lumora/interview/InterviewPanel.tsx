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
}

export function InterviewPanel({ onAskQuestion, onSwitchToCoding, onSwitchToDesign, focusedEntry, onClearFocus }: InterviewPanelProps) {
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
        <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-auto w-full mx-auto p-4" style={{ maxWidth: '860px' }}>
          {/* Q&A history */}
          {history.length > 0 && history.map((entry, idx) => (
            <div key={idx} className="shrink-0">
              <button
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-200 group"
                style={expandedIdx === idx
                  ? { background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(255,255,255,0.06)' }
                  : { background: 'transparent', border: '1px solid transparent' }}
                onMouseEnter={(e) => { if (expandedIdx !== idx) e.currentTarget.style.background = '#16141F'; }}
                onMouseLeave={(e) => { if (expandedIdx !== idx) e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold shrink-0"
                  style={expandedIdx === idx ? { background: 'rgba(99,102,241,0.12)', color: '#818cf8', fontFamily: 'var(--font-code)' } : { background: '#1E1C28', color: '#6C6B7B', fontFamily: 'var(--font-code)' }}>
                  {idx + 1}
                </span>
                <span className="text-sm font-medium leading-snug flex-1 truncate" style={{ fontFamily: 'var(--font-sans)', color: '#F2F1F3' }}>
                  {entry.question}
                </span>
                <svg className={`w-4 h-4 shrink-0 transition-transform duration-200 ${expandedIdx === idx ? 'rotate-180' : ''}`} style={{ color: '#6C6B7B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedIdx === idx && (
                <div className="mt-2 ml-10 animate-[fadeIn_200ms_ease-out]">
                  <AnswerBlocks
                    blocks={safeBlocks(entry.blocks)}
                    isDesign={isDesignBlocks(entry.blocks)}
                    isCoding={isCodingBlocks(entry.blocks)}
                    question={entry.question}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Current streaming question */}
          {isStreaming && question && expandedIdx === null && (
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl shrink-0" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', fontFamily: 'var(--font-code)' }}>
                  {history.length + 1}
                </span>
                <div className="absolute inset-0 border-2 border-transparent rounded-lg animate-spin" style={{ borderTopColor: '#818cf8' }} />
              </div>
              <span className="text-sm font-medium leading-snug flex-1" style={{ fontFamily: 'var(--font-sans)', color: '#F2F1F3' }}>
                {question}
              </span>
              <span className="text-[10px] shrink-0 animate-pulse font-medium" style={{ fontFamily: 'var(--font-code)', color: '#818cf8' }}>analyzing → AI Companion</span>
            </div>
          )}

          {/* Cross-sell — uses accent color only */}
          {history.length > 0 && history.length % 3 === 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#16141F', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.12)' }}>
                <svg className="w-4.5 h-4.5" style={{ color: '#818cf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-sans)', color: '#F2F1F3' }}>Want deeper preparation?</p>
                <p className="text-xs" style={{ fontFamily: 'var(--font-sans)', color: '#6C6B7B' }}>300+ DSA topics, system design, and mock interviews.</p>
              </div>
              <Link to="/capra/prepare" className="shrink-0 px-4 py-2 text-xs font-bold rounded-xl hover:opacity-90 transition-all" style={{ background: '#6366f1', color: '#F2F1F3' }}>
                Prepare
              </Link>
            </div>
          )}

          {/* Error — red is semantic, kept minimal */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#16141F', border: '1px solid rgba(255,255,255,0.06)' }}>
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ fontFamily: 'var(--font-sans)', color: '#F2F1F3' }}>{error}</p>
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

  const accent = '#6366f1';

  const ACTIONS = [
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>,
      label: 'Start Session', onClick: () => {} },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>,
      label: 'Coding', onClick: () => onSwitchToCoding?.() },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
      label: 'System Design', onClick: () => onSwitchToDesign?.() },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
      label: 'Upload Doc', onClick: () => {} },
  ];

  const PROMPTS = [
    'What are some tips for system design interviews?',
    'Practice a coding problem with me',
    'Help me prepare for behavioral questions',
    'Tell me what I can do with AI Companion',
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      {/* Large clock */}
      <div className="text-center mb-10">
        <h1 className="text-6xl md:text-7xl font-bold tracking-tight tabular-nums" style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, letterSpacing: '-0.03em', color: '#F2F1F3' }}>
          {timeStr}
        </h1>
        <p className="text-sm mt-2 font-medium" style={{ fontFamily: 'var(--font-sans)', color: '#6C6B7B' }}>{dateStr}</p>
      </div>

      {/* Action buttons — all use single accent color */}
      <div className="flex items-center gap-6 mb-10">
        {ACTIONS.map((action) => (
          <button key={action.label} onClick={action.onClick} className="flex flex-col items-center gap-2.5 group">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105"
              style={{ background: accent }}>
              {action.icon}
            </div>
            <span className="text-[11px] font-medium transition-colors" style={{ fontFamily: 'var(--font-sans)', color: '#6C6B7B' }}>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-full max-w-2xl h-px mb-8" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* AI Companion suggestions */}
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-4 justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-sans)', color: '#6C6B7B' }}>AI Interview Companion</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PROMPTS.map((prompt) => (
            <button key={prompt} onClick={() => onAskQuestion?.(prompt)}
              className="text-left px-4 py-3.5 rounded-xl text-[13px] leading-snug transition-all"
              style={{ fontFamily: 'var(--font-sans)', border: '1px solid rgba(255,255,255,0.06)', color: '#6C6B7B' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#F2F1F3'; e.currentTarget.style.background = '#16141F'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#6C6B7B'; e.currentTarget.style.background = 'transparent'; }}>
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="mt-8 flex items-center justify-center gap-4 text-[10px]" style={{ fontFamily: 'var(--font-code)', color: '#6C6B7B' }}>
        <span><kbd className="px-1.5 py-0.5 rounded" style={{ border: '1px solid rgba(255,255,255,0.06)', background: '#1E1C28' }}>⌘K</kbd> focus</span>
        <span><kbd className="px-1.5 py-0.5 rounded" style={{ border: '1px solid rgba(255,255,255,0.06)', background: '#1E1C28' }}>⌘M</kbd> mic</span>
        <span><kbd className="px-1.5 py-0.5 rounded" style={{ border: '1px solid rgba(255,255,255,0.06)', background: '#1E1C28' }}>⌘S</kbd> search</span>
      </div>
    </div>
  );
}
