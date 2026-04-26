import { useEffect, useState } from 'react';
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
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg shrink-0" style={{ background: 'rgba(38,97,156,0.03)', border: '1px solid rgba(38,97,156,0.13)' }}>
              <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
                <span className="flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold" style={{ background: 'rgba(38,97,156,0.08)', color: 'var(--cam-primary)', fontFamily: 'var(--font-code)' }}>
                  •
                </span>
                <div className="absolute inset-0 border-2 border-transparent rounded animate-spin" style={{ borderTopColor: 'var(--cam-primary)' }} />
              </div>
              <span className="text-[13px] font-medium leading-snug flex-1 truncate" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
                {question}
              </span>
              <span className="text-[9px] shrink-0 animate-pulse font-medium" style={{ fontFamily: 'var(--font-code)', color: 'var(--cam-primary)' }}>generating...</span>
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
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--danger)' }}>
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--danger)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ fontFamily: 'var(--font-sans)', color: 'var(--danger)' }}>{error}</p>
                <button onClick={() => setError(null)} className="mt-1.5 text-xs hover:underline" style={{ fontFamily: 'var(--font-code)', color: 'var(--danger)' }}>Dismiss</button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

/* ─── Databricks-style prompt thumbnail ─────────────────────
   64×64 rounded square with a navy radial gradient and a large
   category glyph centered inside. Bold enough to scan a 6-card
   grid at a glance, on-brand (navy only, no rainbow). */
function PromptThumb({ type }: { type: 'coding' | 'design' | 'behavioral' }) {
  const glyph =
    type === 'coding' ? (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>
    ) : type === 'design' ? (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
    ) : (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 00-16 0" /></svg>
    );
  return (
    <div
      className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
      style={{
        background:
          'radial-gradient(120% 120% at 0% 0%, var(--cam-primary-lt) 0%, var(--cam-primary) 55%, var(--cam-primary-dk) 100%)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 14px rgba(38,97,156,0.18)',
      }}
    >
      {/* Subtle highlight blob — Databricks-style soft orb on top edge */}
      <div
        aria-hidden="true"
        className="absolute -top-3 -left-3 w-10 h-10 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)' }}
      />
      <div className="relative">{glyph}</div>
    </div>
  );
}

/* ─── Lumora Dashboard ─────────────────────────────── */
function EmptyState({ onAskQuestion, onSwitchToCoding, onSwitchToDesign }: {
  onAskQuestion?: (question: string) => void;
  onSwitchToCoding?: (problem?: string) => void;
  onSwitchToDesign?: (problem?: string) => void;
}) {
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const COPILOTS = [
    { name: 'Coding', desc: 'Real-time coding solutions with multi-approach answers and complexity analysis.', image: '/topic-heroes/coding.jpg', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>, onClick: () => onSwitchToCoding?.() },
    { name: 'System Design', desc: 'Architecture diagrams and system design answers in real-time.', image: '/topic-heroes/system-design.jpg', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>, onClick: () => onSwitchToDesign?.() },
    { name: 'Behavioral', desc: 'STAR method answers for behavioral and leadership questions.', image: '/topic-heroes/behavioral.jpg', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 00-16 0" /></svg>, onClick: () => onAskQuestion?.('Tell me about yourself and your experience') },
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
    <div className="flex-1 overflow-auto px-3 sm:px-4 md:px-6 py-2 md:py-3">
      {/* Greeting + live clock */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Launch an AI assistant for your next interview.</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-code)' }}>{timeStr}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{dateStr}</div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px mb-6" style={{ background: 'var(--border)' }} />

      {/* Launch Now */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-primary)' }}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Launch Now</span>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Start fast with ready-to-use interview co-pilots.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COPILOTS.map(cp => (
            <button key={cp.name} onClick={cp.onClick} className="group text-left rounded-xl overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5" style={{ background: 'rgba(38,97,156,0.04)', border: '1px solid rgba(38,97,156,0.15)' }}>
              {/* Compact Unsplash hero strip — duotone-navy filter unifies
                  all 3 photos into one brand mood. ~50px tall on a 400px
                  card so the title/description below stay the focus. */}
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: '8 / 1', background: 'var(--cam-primary-dk)' }}>
                <img src={cp.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'grayscale(100%) contrast(1.05) brightness(0.85)' }} />
                <div aria-hidden="true" className="absolute inset-0" style={{ background: 'var(--cam-primary)', mixBlendMode: 'multiply' }} />
                <div aria-hidden="true" className="absolute inset-0" style={{ background: 'var(--cam-primary-lt)', mixBlendMode: 'screen', opacity: 0.35 }} />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(38,97,156,0.1)' }}>{cp.icon}</div>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{cp.name}</span>
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>{cp.desc}</p>
                <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--cam-primary)' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  Launch
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick prompts — each card has a Databricks-style gradient
          thumbnail (bold navy radial → light) with a large category
          glyph for instant visual scanning. */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-primary)' }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Try Asking</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p.text}
              onClick={() => handlePromptClick(p)}
              className="group flex items-center gap-3 text-left p-3 rounded-xl transition-all"
              style={{ border: '1px solid rgba(38,97,156,0.2)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(38,97,156,0.5)'; e.currentTarget.style.background = 'rgba(38,97,156,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(38,97,156,0.2)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <PromptThumb type={p.type} />
              <span className="text-[13px] leading-snug flex-1" style={{ color: 'var(--text-secondary)' }}>{p.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard hints — hidden on mobile (no physical keyboard) */}
      <div className="hidden md:flex items-center gap-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span><kbd className="px-1.5 py-0.5 rounded" style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>⌘K</kbd> focus</span>
        <span><kbd className="px-1.5 py-0.5 rounded" style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>⌘M</kbd> mic</span>
        <span><kbd className="px-1.5 py-0.5 rounded" style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>⌘B</kbd> blank screen</span>
      </div>
    </div>
  );
}
