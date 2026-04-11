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
              <span className="text-[10px] font-code font-semibold text-gray-700 uppercase tracking-wider shrink-0 mr-1">History</span>
              {history.map((entry, idx) => (
                <div key={idx} className="group relative flex items-center shrink-0">
                  <button
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                    className={`q-pill ${
                      expandedIdx === idx
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : idx === history.length - 1 && !isStreaming
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
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
                <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-bold font-code shrink-0">
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
                    <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold font-code">
                      Q{history.length + 1}
                    </span>
                    <div className="absolute inset-0 border-2 border-transparent border-t-emerald-500 rounded-xl animate-spin" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-display text-sm font-semibold text-gray-900 leading-snug">
                      {question}
                    </span>
                    <span className="ml-2 text-[10px] font-code text-emerald-600">Analyzing...</span>
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
                    <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold font-code shrink-0">
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
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-amber-200 bg-amber-50/50">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-semibold text-amber-800">Want deeper preparation?</p>
                <p className="text-xs font-display text-amber-600">Ascend has 300+ DSA topics, system design problems, and mock interviews.</p>
              </div>
              <a href="/capra/prepare" className="shrink-0 px-3 py-1.5 text-white text-xs font-display font-bold rounded-xl hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                Prepare →
              </a>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-2xl border border-red-200 bg-red-50 text-sm">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-red-700 font-display font-medium">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-1.5 text-xs text-red-500 hover:text-red-700 font-code hover:underline"
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
  const { status } = useInterviewStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12">
      <div className="text-center max-w-lg">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', boxShadow: '0 4px 20px rgba(16,185,129,0.2)' }}>
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Ready for your interview</h2>
        <p className="text-sm text-gray-400 mb-2">
          {status.state === 'listen' ? 'Listening... speak your question or let the interviewer ask.' : 'Click Live above to auto-transcribe, or type/paste a question.'}
        </p>
        <p className="text-xs text-emerald-500 font-medium mb-8">{status.message}</p>

        <p className="text-xs text-gray-400 mb-3">Try asking one of these:</p>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {[
            'Design a URL shortener like TinyURL',
            'Implement LRU Cache in Python',
            'Tell me about a time you dealt with conflict',
            'What is the CAP theorem?',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => onAskQuestion?.(prompt)}
              className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-display text-gray-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/50 transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex justify-center gap-4 text-xs text-gray-300 font-mono">
          <span>Cmd+M mic</span>
          <span>Cmd+B blank</span>
          <span>Cmd+K focus</span>
        </div>
      </div>
    </div>
  );
}
