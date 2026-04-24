import { useAuth } from '@/contexts/AuthContext';
import { useInterviewStore } from '@/stores/interview-store';
import { StreamingAnswer } from './StreamingAnswer';

interface InterviewPanelProps {
  onAskQuestion?: (question: string) => void;
  onSwitchToCoding?: (problem?: string) => void;
  onSwitchToDesign?: (problem?: string) => void;
}

export function InterviewPanel({ onAskQuestion, onSwitchToCoding, onSwitchToDesign }: InterviewPanelProps) {
  const {
    question,
    isStreaming,
    isDesignQuestion,
    isCodingQuestion,
    streamChunks,
    parsedBlocks,
    error,
    setError,
  } = useInterviewStore();

  // Home tab = dashboard by default. Past sessions live on /lumora/sessions,
  // not here. Only switch off the dashboard while a question is actively
  // being asked / answered.
  const showEmptyState = !question && !isStreaming && parsedBlocks.length === 0;

  return (
    <main className="flex-1 min-h-0 overflow-auto flex flex-col">
      {showEmptyState ? (
        <EmptyState onAskQuestion={onAskQuestion} onSwitchToCoding={onSwitchToCoding} onSwitchToDesign={onSwitchToDesign} />
      ) : (
        <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-auto w-full mx-auto px-2 sm:px-3 py-2" style={{ maxWidth: 'min(700px, 100%)' }}>
          {/* Current streaming question */}
          {isStreaming && question && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg shrink-0" style={{ background: '#22D3EE08', border: '1px solid #22D3EE20' }}>
              <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
                <span className="flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold" style={{ background: '#22D3EE15', color: '#22D3EE', fontFamily: 'var(--font-code)' }}>
                  •
                </span>
                <div className="absolute inset-0 border-2 border-transparent rounded animate-spin" style={{ borderTopColor: '#06B6D4' }} />
              </div>
              <span className="text-[13px] font-medium leading-snug flex-1 truncate" style={{ fontFamily: 'var(--font-sans)', color: '#0F172A' }}>
                {question}
              </span>
              <span className="text-[9px] shrink-0 animate-pulse font-medium" style={{ fontFamily: 'var(--font-code)', color: '#22D3EE' }}>generating...</span>
            </div>
          )}

          {/* Live streaming answer — renders tokens as they arrive so the
              candidate sees the solution building up in real time instead
              of staring at "generating…" for 10-15 s until the full
              response completes. StreamingAnswer parses partial blocks
              (HEADLINE, CODE, ANSWER, COMPLEXITY, etc.) and shows each
              section as soon as it becomes available. */}
          {isStreaming && streamChunks && streamChunks.length > 0 && (
            <div className="shrink-0 mt-1">
              <StreamingAnswer
                chunks={streamChunks}
                isDesign={isDesignQuestion}
                isCoding={isCodingQuestion}
              />
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

/* ─── Lumora Dashboard ─────────────────────────────── */
function EmptyState({ onAskQuestion, onSwitchToCoding, onSwitchToDesign }: {
  onAskQuestion?: (question: string) => void;
  onSwitchToCoding?: (problem?: string) => void;
  onSwitchToDesign?: (problem?: string) => void;
}) {
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const COPILOTS = [
    { name: 'Coding', desc: 'Real-time coding solutions with multi-approach answers and complexity analysis.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#29B5E8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>, onClick: () => onSwitchToCoding?.() },
    { name: 'System Design', desc: 'Architecture diagrams and system design answers in real-time.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#29B5E8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>, onClick: () => onSwitchToDesign?.() },
    { name: 'Behavioral', desc: 'STAR method answers for behavioral and leadership questions.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#29B5E8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 00-16 0" /></svg>, onClick: () => onAskQuestion?.('Tell me about yourself and your experience') },
  ];

  const QUICK_PROMPTS = [
    { text: 'Design a rate limiter for an API gateway', type: 'design' as const },
    { text: 'Implement LRU cache from scratch', type: 'coding' as const },
    { text: 'Tell me about a time you disagreed with your manager', type: 'behavioral' as const },
    { text: 'Design a URL shortener like bit.ly', type: 'design' as const },
    { text: 'Reverse a linked list iteratively and recursively', type: 'coding' as const },
    { text: 'Describe a time you failed and what you learned', type: 'behavioral' as const },
  ];

  const handlePromptClick = (prompt: typeof QUICK_PROMPTS[number]) => {
    if (prompt.type === 'coding') onSwitchToCoding?.(prompt.text);
    else if (prompt.type === 'design') onSwitchToDesign?.(prompt.text);
    else onAskQuestion?.(prompt.text);
  };

  return (
    <div className="flex-1 overflow-auto px-8 py-6">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>{greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
        <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Launch an AI assistant for your next interview.</p>
      </div>

      {/* Divider */}
      <div className="h-px mb-6" style={{ background: '#E2E8F0' }} />

      {/* Launch Now */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
          <span className="text-sm font-bold" style={{ color: '#0F172A' }}>Launch Now</span>
        </div>
        <p className="text-xs mb-4" style={{ color: '#94A3B8' }}>Start fast with ready-to-use interview co-pilots.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COPILOTS.map(cp => (
            <button key={cp.name} onClick={cp.onClick} className="group text-left p-5 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5" style={{ background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.15)' }}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(41,181,232,0.1)' }}>{cp.icon}</div>
                <span className="text-sm font-bold" style={{ color: '#0F172A' }}>{cp.name}</span>
              </div>
              <p className="text-xs leading-relaxed mb-3" style={{ color: '#64748B' }}>{cp.desc}</p>
              <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#22D3EE' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                Launch
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick prompts */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
          <span className="text-sm font-bold" style={{ color: '#0F172A' }}>Try Asking</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {QUICK_PROMPTS.map(p => (
            <button key={p.text} onClick={() => handlePromptClick(p)} className="text-left px-4 py-3 rounded-xl text-[12px] leading-snug transition-all" style={{ border: '1px solid rgba(34,211,238,0.2)', color: '#475569' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,211,238,0.5)'; e.currentTarget.style.background = 'rgba(34,211,238,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(34,211,238,0.2)'; e.currentTarget.style.background = 'transparent'; }}>
              {p.text}
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="flex items-center gap-4 text-[10px]" style={{ color: '#94A3B8' }}>
        <span><kbd className="px-1.5 py-0.5 rounded" style={{ border: '1px solid #E2E8F0', background: '#F8FAFC' }}>⌘K</kbd> focus</span>
        <span><kbd className="px-1.5 py-0.5 rounded" style={{ border: '1px solid #E2E8F0', background: '#F8FAFC' }}>⌘M</kbd> mic</span>
        <span><kbd className="px-1.5 py-0.5 rounded" style={{ border: '1px solid #E2E8F0', background: '#F8FAFC' }}>⌘B</kbd> blank screen</span>
      </div>
    </div>
  );
}
