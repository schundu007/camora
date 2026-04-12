import { useState } from 'react';
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
          {/* Vertical Q&A list — all questions visible, click to expand/collapse answers */}
          {history.length > 0 && history.map((entry, idx) => (
            <div key={idx} className="shrink-0">
              {/* Question header — always visible, click to toggle answer */}
              <button
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                  expandedIdx === idx
                    ? 'bg-indigo-500/10 border border-indigo-500/20'
                    : 'hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <span className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold font-code shrink-0 ${
                  expandedIdx === idx ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/15 text-emerald-300'
                }`}>
                  Q{idx + 1}
                </span>
                <span className="font-display text-sm font-medium text-white/80 leading-snug flex-1 truncate">
                  {entry.question}
                </span>
                <svg className={`w-4 h-4 shrink-0 transition-transform duration-200 ${expandedIdx === idx ? 'rotate-180' : ''}`} style={{ color: 'rgba(255,255,255,0.2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
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

  const CARDS = [
    { category: 'System Design', color: '#06b6d4', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', prompts: [
      'Design a URL shortener like TinyURL',
      'Design a distributed message queue',
      'Design Instagram news feed',
    ]},
    { category: 'Coding', color: '#8b5cf6', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', prompts: [
      'Implement LRU Cache in Python',
      'Find median of two sorted arrays',
      'Serialize and deserialize binary tree',
    ]},
    { category: 'Behavioral', color: '#f59e0b', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', prompts: [
      'Tell me about a time you dealt with conflict',
      'Describe a project you led from start to finish',
      'How do you handle tight deadlines?',
    ]},
    { category: 'Concepts', color: '#10b981', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', prompts: [
      'What is the CAP theorem?',
      'Explain consistent hashing',
      'How does a load balancer work?',
    ]},
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 lumora-empty-mesh">
      {/* Tour is now handled by Shepherd.js in InterviewPage */}
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
