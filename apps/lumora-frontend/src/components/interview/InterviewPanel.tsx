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
            <div className="flex items-center gap-1.5 pb-2 border-b border-gray-200 shrink-0 overflow-x-auto">
              <span className="text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-wider shrink-0 mr-1">History</span>
              {history.map((entry, idx) => (
                <div key={idx} className="group relative flex items-center shrink-0">
                  <button
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                    className={`q-pill ${
                      expandedIdx === idx
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : idx === history.length - 1 && !isStreaming
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
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
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-600 flex items-center justify-center text-[10px] leading-none transition-all opacity-0 group-hover:opacity-100 z-10"
                    title="Remove question"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {isStreaming && (
                <div className="q-pill bg-emerald-50 text-emerald-700 border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Q{history.length + 1}
                </div>
              )}
            </div>
          )}

          {/* Expanded history item */}
          {expandedIdx !== null && history[expandedIdx] && (
            <div className="flex-1 flex flex-col gap-2 overflow-auto">
              <div className="history-question-card shrink-0">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold font-mono shrink-0">
                  Q{expandedIdx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-display text-sm font-semibold text-gray-900 leading-snug">
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
                <div className="history-question-card shrink-0 border-emerald-200 bg-emerald-50/30">
                  <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold font-mono">
                      Q{history.length + 1}
                    </span>
                    <div className="absolute inset-0 border-2 border-transparent border-t-emerald-500 rounded-lg animate-spin" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-display text-sm font-semibold text-gray-900 leading-snug">
                      {question}
                    </span>
                    <span className="ml-2 text-[10px] font-mono text-emerald-600">Analyzing...</span>
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
                  <div className="history-question-card shrink-0 border-emerald-200 bg-emerald-50/20">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold font-mono shrink-0">
                      Q{history.length}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="font-display text-sm font-semibold text-gray-900 leading-snug">
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
            <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/50">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">Want deeper preparation?</p>
                <p className="text-xs text-amber-600">Ascend has 300+ DSA topics, system design problems, and mock interviews.</p>
              </div>
              <a href="https://capra.cariara.com/prepare" target="_blank" rel="noopener noreferrer" className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors">
                Prepare →
              </a>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-sm">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-red-700 font-medium">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-1.5 text-xs text-red-500 hover:text-red-700 font-mono hover:underline"
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

function EmptyState({ onAskQuestion, onSwitchToCoding, onSwitchToDesign }: { onAskQuestion?: (question: string) => void; onSwitchToCoding?: (problem?: string) => void; onSwitchToDesign?: (problem?: string) => void }) {
  return (
      <div className="flex-1 flex flex-col items-center justify-center overflow-auto py-8 md:py-12" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #ecfdf5 40%, #e0f2fe 70%, #f5f3ff 90%, #ffffff 100%)' }}>
        <div className="max-w-4xl w-full px-6 md:px-12 text-center">

          {/* Hero */}
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Your AI co-pilot for <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 bg-clip-text text-transparent">live interviews</span>
          </h1>

          {/* How it works - 2 steps */}
          <div className="mt-10 grid grid-cols-2 gap-4 md:gap-6 text-center">
            <div className="p-4 rounded-2xl bg-white/80 border border-emerald-100 shadow-sm">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-white font-extrabold text-xl">1</span>
              </div>
              <p className="text-sm font-bold text-gray-900">Join your interview</p>
              <p className="text-xs text-gray-500 mt-1">Open Zoom, Meet, or Teams alongside</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/80 border border-violet-100 shadow-sm">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-violet-400 to-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <span className="text-white font-extrabold text-xl">2</span>
              </div>
              <p className="text-sm font-bold text-gray-900">Ask anything in real-time</p>
              <p className="text-xs text-gray-500 mt-1">Type, paste, or use your mic</p>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="mt-10">
            <div className="flex justify-center">
              <button
                onClick={() => onAskQuestion?.('Help me with my interview — I just joined the call')}
                className="group px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg rounded-2xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-xl shadow-emerald-500/30 hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Start Live Interview
              </button>
            </div>
          </div>

        </div>
      </div>
    );
}
