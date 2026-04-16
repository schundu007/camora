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
  // Convert JSON design response to ParsedBlock[] format
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

  // When sidebar clicks an entry, expand it
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

  // Show empty state when no question has been asked
  const showEmptyState = !question && !isStreaming && parsedBlocks.length === 0 && history.length === 0;

  return (
    <main className="flex-1 min-h-0 overflow-y-auto flex flex-col p-2 md:p-3 gap-1.5">
      {showEmptyState ? (
        <EmptyState onAskQuestion={onAskQuestion} onSwitchToCoding={onSwitchToCoding} onSwitchToDesign={onSwitchToDesign} />
      ) : (
        <div className="flex-1 flex flex-col gap-1.5 min-h-0 overflow-y-auto w-full mx-auto" style={{ maxWidth: '95%' }}>
          {/* Vertical Q&A list — all questions visible, click to expand/collapse answers */}
          {history.length > 0 && history.map((entry, idx) => (
            <div key={idx} className="shrink-0">
              {/* Question header — always visible, click to toggle answer */}
              <button
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                  expandedIdx === idx
                    ? 'border border-indigo-500/20'
                    : 'hover:bg-[var(--bg-surface)]/[0.03] border border-transparent'
                }`}
                style={expandedIdx === idx ? { background: 'rgba(99,102,241,0.06)', backdropFilter: 'blur(4px)' } : {}}
              >
                <span className={`flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold font-mono shrink-0 ${
                  expandedIdx === idx ? 'bg-indigo-500/20 text-indigo-300' : 'bg-[var(--bg-surface)]/5 text-white/40'
                }`}>
                  {idx + 1}
                </span>
                <span className="text-sm font-medium text-white/80 leading-snug flex-1 truncate" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                  {entry.question}
                </span>
                <svg className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${expandedIdx === idx ? 'rotate-180' : ''}`} style={{ color: 'rgba(255,255,255,0.15)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Answer — shown when expanded */}
              {expandedIdx === idx && (
                <div className="mt-2 ml-10">
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

          {/* Current question - only show if not viewing history */}
          {expandedIdx === null && (
            <>
              {/* Current streaming question header */}
              {isStreaming && question && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl shrink-0" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold font-mono">
                      {history.length + 1}
                    </span>
                    <div className="absolute inset-0 border-2 border-transparent border-t-indigo-400 rounded-md animate-spin" />
                  </div>
                  <span className="text-sm font-medium text-white/90 leading-snug flex-1" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                    {question}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-400 shrink-0 animate-pulse">analyzing</span>
                </div>
              )}

              {/* Streaming indicator */}
              {isStreaming && (
                <StreamingAnswer
                  chunks={streamChunks}
                  isDesign={isDesignQuestion}
                  isCoding={isCodingQuestion}
                />
              )}

              {/* Show latest history entry when not streaming */}
              {!isStreaming && history.length > 0 && (
                <div className="flex-1 flex flex-col gap-1.5 min-h-0 overflow-y-auto">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl shrink-0" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold font-mono shrink-0">
                      {history.length}
                    </span>
                    <span className="text-sm font-medium text-white/90 leading-snug flex-1" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                      {history[history.length - 1].question}
                    </span>
                  </div>
                  <AnswerBlocks
                    blocks={safeBlocks(history[history.length - 1].blocks)}
                    isDesign={isDesignBlocks(history[history.length - 1].blocks)}
                    isCoding={isCodingBlocks(history[history.length - 1].blocks)}
                    question={history[history.length - 1].question}
                  />
                </div>
              )}
            </>
          )}

          {/* Cross-sell: Ascend preparation */}
          {history.length > 0 && history.length % 3 === 0 && (
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-semibold text-amber-300">Want deeper preparation?</p>
                <p className="text-xs font-display text-amber-400/70">Ascend has 300+ DSA topics, system design problems, and mock interviews.</p>
              </div>
              <Link to="/capra/prepare" className="shrink-0 px-3 py-1.5 text-white text-xs font-display font-bold rounded-xl hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                Prepare →
              </Link>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-2xl border border-red-500/20 bg-red-500/5 text-sm">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-red-300 font-display font-medium">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-1.5 text-xs text-red-400 hover:text-red-300 font-code hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function EmptyState({ onAskQuestion }: { onAskQuestion?: (question: string) => void; onSwitchToCoding?: (problem?: string) => void; onSwitchToDesign?: (problem?: string) => void }) {

  const PROMPTS = [
    { text: 'Design a URL shortener like TinyURL', category: 'System Design', color: '#06b6d4' },
    { text: 'Implement LRU Cache in Python', category: 'Coding', color: '#8b5cf6' },
    { text: 'Tell me about a time you led a failing project', category: 'Behavioral', color: '#f59e0b' },
    { text: 'Explain consistent hashing', category: 'Concepts', color: '#6366f1' },
    { text: 'Design Instagram news feed at scale', category: 'System Design', color: '#06b6d4' },
    { text: 'Find median of two sorted arrays', category: 'Coding', color: '#8b5cf6' },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 lumora-empty-mesh">
      <div className="relative z-10 w-full max-w-2xl px-4 text-center">
        {/* Animated logo mark */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-2xl animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', filter: 'blur(12px)' }} />
          <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 24px rgba(99,102,241,0.25)' }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
          What are you preparing for?
        </h1>
        <p className="text-sm text-white/35 mb-8 max-w-md mx-auto">
          Ask any interview question — system design, coding, behavioral. Get structured answers in seconds.
        </p>

        {/* Prompt pills */}
        <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
          {PROMPTS.map(prompt => (
            <button
              key={prompt.text}
              onClick={() => onAskQuestion?.(prompt.text)}
              className="group flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm text-white/60 transition-all duration-200 hover:text-white hover:scale-[1.02]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${prompt.color}40`; e.currentTarget.style.background = `${prompt.color}08`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: prompt.color }} />
              <span className="truncate">{prompt.text}</span>
            </button>
          ))}
        </div>

        {/* Keyboard hints */}
        <div className="mt-8 flex items-center justify-center gap-4 text-[11px] font-code text-white/20">
          <span><kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-[var(--bg-surface)]/3 text-white/35">⌘K</kbd> focus input</span>
          <span><kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-[var(--bg-surface)]/3 text-white/35">⌘M</kbd> mic toggle</span>
          <span><kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-[var(--bg-surface)]/3 text-white/35">⌘S</kbd> web search</span>
        </div>
      </div>
    </div>
  );
}
