import { useState } from 'react';
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
}

export function InterviewPanel({ onAskQuestion, onSwitchToCoding, onSwitchToDesign }: InterviewPanelProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

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
    <main className="flex-1 min-h-0 overflow-auto flex flex-col p-2 md:p-3 gap-2">
      {showEmptyState ? (
        <EmptyState onAskQuestion={onAskQuestion} onSwitchToCoding={onSwitchToCoding} onSwitchToDesign={onSwitchToDesign} />
      ) : (
        <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-auto">
          {/* All Q&As from history - compact pill navigation */}
          {history.length > 0 && (
            <div className="flex items-center gap-1.5 pb-2 border-b border-white/10 shrink-0 overflow-x-auto">
              <span className="text-[10px] font-code font-semibold text-white/40 uppercase tracking-wider shrink-0 mr-1">History</span>
              {history.map((entry, idx) => (
                <div key={idx} className="group relative flex items-center shrink-0">
                  <button
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                    className={`q-pill ${
                      expandedIdx === idx
                        ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                        : idx === history.length - 1 && !isStreaming
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-white/5 text-white/50 border-white/10 hover:bg-indigo-500/15 hover:text-indigo-300 hover:border-indigo-500/30'
                    }`}
                    title={entry.question}
                  >
                    Q{idx + 1}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (expandedIdx === idx) setExpandedIdx(null);
                      removeHistoryEntry(idx);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white/10 text-white/40 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center text-[10px] leading-none transition-all opacity-0 group-hover:opacity-100 z-10"
                    title="Remove question"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {isStreaming && (
                <div className="q-pill bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Q{history.length + 1}
                </div>
              )}
            </div>
          )}

          {/* Expanded history item */}
          {expandedIdx !== null && history[expandedIdx] && (
            <div className="flex-1 flex flex-col gap-2 overflow-auto">
              <div className="history-question-card shrink-0 border-indigo-500/20 bg-indigo-500/5">
                <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-indigo-500/15 text-indigo-300 text-xs font-bold font-code shrink-0">
                  Q{expandedIdx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-display text-sm font-semibold text-white/90 leading-snug">
                    {history[expandedIdx].question}
                  </span>
                </div>
              </div>
              <AnswerBlocks
                blocks={safeBlocks(history[expandedIdx].blocks)}
                isDesign={isDesignBlocks(history[expandedIdx].blocks)}
                isCoding={isCodingBlocks(history[expandedIdx].blocks)}
              />
            </div>
          )}

          {/* Current question - only show if not viewing history */}
          {expandedIdx === null && (
            <>
              {/* Current streaming question header */}
              {isStreaming && question && (
                <div className="history-question-card shrink-0 border-emerald-500/20 bg-emerald-500/5">
                  <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
                    <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-300 text-xs font-bold font-code">
                      Q{history.length + 1}
                    </span>
                    <div className="absolute inset-0 border-2 border-transparent border-t-emerald-500 rounded-xl animate-spin" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-display text-sm font-semibold text-white/90 leading-snug">
                      {question}
                    </span>
                    <span className="ml-2 text-[10px] font-code text-emerald-400">Analyzing...</span>
                  </div>
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
                <div className="flex-1 flex flex-col gap-2 overflow-auto">
                  <div className="history-question-card shrink-0 border-emerald-500/20 bg-emerald-500/5">
                    <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-300 text-xs font-bold font-code shrink-0">
                      Q{history.length}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="font-display text-sm font-semibold text-white/90 leading-snug">
                        {history[history.length - 1].question}
                      </span>
                    </div>
                  </div>
                  <AnswerBlocks
                    blocks={safeBlocks(history[history.length - 1].blocks)}
                    isDesign={isDesignBlocks(history[history.length - 1].blocks)}
                    isCoding={isCodingBlocks(history[history.length - 1].blocks)}
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
              <a href="/capra/prepare" className="shrink-0 px-3 py-1.5 text-white text-xs font-display font-bold rounded-xl hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                Prepare →
              </a>
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
  const CARDS = [
    { category: 'System Design', color: '#06b6d4', glow: 'rgba(6,182,212,0.15)', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', prompts: [
      'Design a URL shortener like TinyURL',
      'Design a distributed message queue',
      'Design Instagram news feed',
    ]},
    { category: 'Coding', color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', prompts: [
      'Implement LRU Cache in Python',
      'Find median of two sorted arrays',
      'Serialize and deserialize binary tree',
    ]},
    { category: 'Behavioral', color: '#f59e0b', glow: 'rgba(245,158,11,0.15)', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', prompts: [
      'Tell me about a time you dealt with conflict',
      'Describe a project you led from start to finish',
      'How do you handle tight deadlines?',
    ]},
    { category: 'Concepts', color: '#10b981', glow: 'rgba(16,185,129,0.15)', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', prompts: [
      'What is the CAP theorem?',
      'Explain consistent hashing',
      'How does a load balancer work?',
    ]},
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 lumora-empty-mesh">
      <div className="relative z-10 w-full max-w-3xl px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CARDS.map(card => (
            <div key={card.category}
              className="rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${card.color}20` }}>
              {/* Card header */}
              <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: `1px solid ${card.color}15` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${card.color}15` }}>
                  <svg className="w-4 h-4" fill="none" stroke={card.color} viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={card.icon} />
                  </svg>
                </div>
                <span className="text-sm font-bold" style={{ color: card.color }}>{card.category}</span>
              </div>
              {/* Prompts */}
              <div className="p-2">
                {card.prompts.map(prompt => (
                  <button key={prompt} onClick={() => onAskQuestion?.(prompt)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all truncate"
                  >{prompt}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
