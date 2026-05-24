import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionStore } from '@/stores/session-store';
import { StreamingAnswer } from './StreamingAnswer';
import { Citations } from '@/components/lumora/Citations';
import { DatabricksThumb, type DatabricksColor } from '@/components/shared/DatabricksThumb';

// LeetCode-style row classification — purely structural (numbered
// Q.<#> + category pill on the right). Per the navy-palette memory we
// keep one accent color and differentiate categories by label text
// only, NOT by hue (no green/yellow/red Easy/Medium/Hard).
type QuestionCategory = 'behavioral' | 'coding' | 'design';
const categorize = (q: string, isCodingFlag = false, isDesignFlag = false): QuestionCategory  => {
  if (isDesignFlag) return 'design';
  if (isCodingFlag) return 'coding';
  const t = (q || '').trim();
  if (/^\[SYSTEM DESIGN\]/i.test(t)) return 'design';
  // Coding submits prefix the displayTitle with [LANGUAGE] (see
  // useStreamingSession.handleCodingSubmit). A trailing word like
  // [PYTHON] / [TYPESCRIPT] is the signal.
  if (/^\[[A-Z+#.\-]{2,16}\]/.test(t)) return 'coding';
  return 'behavioral';
}
const CATEGORY_LABEL: Record<QuestionCategory, string> = {
  behavioral: 'BEHAVIORAL',
  coding: 'CODING',
  design: 'DESIGN',
};
const CategoryPill = ({ category }: { category: QuestionCategory }) => {
  return (
    <span
      className="font-mono text-[9px] font-bold tracking-[0.18em] px-2 py-0.5 rounded shrink-0 uppercase"
      style={{
        background: 'var(--accent-subtle)',
        color: 'var(--accent)',
        border: '1px solid var(--accent)',
      }}
      aria-label={`Category: ${CATEGORY_LABEL[category]}`}
    >
      {CATEGORY_LABEL[category]}
    </span>
  );
}
const QNumber = ({ n }: { n: number }) => {
  return (
    <span
      className="font-mono text-[11px] font-bold tabular-nums shrink-0"
      style={{ color: 'var(--accent)' }}
      aria-hidden="true"
    >
      Q.{n}
    </span>
  );
}

interface SessionPanelProps {
  onAskQuestion?: (question: string) => void;
  onSwitchToCoding?: (problem?: string) => void;
  onSwitchToDesign?: (problem?: string) => void;
}

export const SessionPanel = ({ onAskQuestion, onSwitchToCoding, onSwitchToDesign }: SessionPanelProps) => {
  const {
    question,
    isStreaming,
    isDesignQuestion,
    isCodingQuestion,
    streamText,
    parsedBlocks,
    activeCitations,
    error,
    setError,
    history,
  } = useSessionStore();
  // Q.<#> numbering counts the active stream as the next entry in
  // history, so users see "Q.7" land before it gets persisted as #7.
  const activeQNumber = history.length + 1;
  const activeCategory = categorize(question || '', isCodingQuestion, isDesignQuestion);

  // Home tab = dashboard by default. Past sessions live on /lumora/sessions,
  // not here. Only switch off the dashboard while a question is actively
  // being asked / answered.
  // Also show dashboard when the active Q&A is coding/design — those have
  // their own dedicated tabs; Home tab should always show the dashboard.
  const showEmptyState =
    (!question && !isStreaming && parsedBlocks.length === 0) ||
    isCodingQuestion ||
    isDesignQuestion;

  return (
    <main
      className="flex-1 min-h-0 overflow-auto flex flex-col relative"
      style={{
        // Layered atmospheric backdrop — subtle navy spotlight at the top
        // and a faint cyan wash at the bottom. Pulls focus to the streaming
        // answer area without competing with content. Pairs cleanly with
        // the cam-hero-bg used in the Dashboard's hero band.
        background:
          'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(38,97,156,0.06), transparent 70%),' +
          'radial-gradient(ellipse 70% 40% at 50% 105%, rgba(38,97,156,0.07), transparent 70%),' +
          'var(--bg-surface)',
      }}
    >
      <style>{`
        @keyframes lumora-pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(38,97,156,0.4); }
          70%  { box-shadow: 0 0 0 12px rgba(38,97,156,0); }
          100% { box-shadow: 0 0 0 0 rgba(38,97,156,0); }
        }
        @keyframes lumora-glow-shift {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
      {showEmptyState ? (
        <EmptyState onAskQuestion={onAskQuestion} onSwitchToCoding={onSwitchToCoding} onSwitchToDesign={onSwitchToDesign} />
      ) : (
        <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-auto w-full mx-auto px-3 sm:px-4 py-3" style={{ maxWidth: 'min(720px, 100%)' }}>
          {/* Current streaming question — glowing pill with a pulse ring */}
          {isStreaming && question && (
            <div
              className="relative flex items-center gap-3 px-4 py-3 rounded-xl shrink-0 overflow-hidden"
              style={{
                background:
                  'linear-gradient(110deg, rgba(38,97,156,0.10) 0%, rgba(38,97,156,0.16) 50%, rgba(38,97,156,0.10) 100%)',
                backgroundSize: '200% 200%',
                border: '1px solid rgba(38,97,156,0.30)',
                boxShadow: '0 4px 20px rgba(38,97,156,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
                animation: 'lumora-glow-shift 4s ease-in-out infinite',
              }}
            >
              <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold"
                  style={{
                    background: 'var(--cam-primary)',
                    color: '#FFFFFF',
                    fontFamily: 'var(--font-code)',
                    animation: 'lumora-pulse-ring 1.6s ease-out infinite',
                  }}
                >
                  •
                </span>
              </div>
              <QNumber n={activeQNumber} />
              <span className="text-[14px] font-medium leading-snug flex-1 truncate" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
                {question}
              </span>
              <CategoryPill category={activeCategory} />
              <span className="text-[10px] shrink-0 animate-pulse font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-code)', color: 'var(--cam-primary)' }}>
                Generating
              </span>
            </div>
          )}

          {/* Live streaming answer — renders tokens as they arrive so the
              candidate sees the solution building up in real time instead
              of staring at "generating…" for 10-15 s until the full
              response completes. StreamingAnswer parses partial blocks
              (HEADLINE, CODE, ANSWER, COMPLEXITY, etc.) and shows each
              section as soon as it becomes available. */}
          {isStreaming && streamText && streamText.length > 0 && (
            <div className="shrink-0 mt-1">
              <StreamingAnswer
                chunks={[streamText]}
                isDesign={isDesignQuestion}
                isCoding={isCodingQuestion}
              />
              {/* Citations strip — shown below the live answer as soon as
                  the `citations` SSE event lands (before first token).
                  Collapsed by default; click "Sources N" to expand. */}
              <Citations citations={activeCitations} />
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

/* ─── Quick-prompt thumbnail — wraps the shared DatabricksThumb
   primitive with a per-category glyph + color. */
const PROMPT_GLYPH = {
  coding: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>,
  design: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
  behavioral: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 00-16 0" /></svg>,
} as const;
const PROMPT_COLOR: Record<keyof typeof PROMPT_GLYPH, DatabricksColor> = {
  coding: 'navy',
  design: 'navy-lt',
  behavioral: 'gold',
};
const PromptThumb = ({ type }: { type: 'coding' | 'design' | 'behavioral' }) => {
  return <DatabricksThumb color={PROMPT_COLOR[type]} size={64} icon={PROMPT_GLYPH[type]} />;
}

/* ─── Lumora Dashboard ─────────────────────────────── */
const EmptyState = ({ onAskQuestion, onSwitchToCoding, onSwitchToDesign }: {
  onAskQuestion?: (question: string) => void;
  onSwitchToCoding?: (problem?: string) => void;
  onSwitchToDesign?: (problem?: string) => void;
}) => {
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  // Digital-clock split so we can style HH:MM big and the AM/PM smaller.
  const hh12 = ((now.getHours() + 11) % 12) + 1;
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ampm = now.getHours() < 12 ? 'AM' : 'PM';
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
    <div className="flex-1 overflow-auto flex flex-col">
      {/* Hero — atmospheric dark band with the big digital clock and
          a soft fade-out into the body (no harsh diagonal divider —
          per "less boxes/lines" feedback, sections flow seamlessly). */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'var(--cam-hero-bg)' }}
      >
        {/* White spotlight at top + cyan wash inside the navy */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 80% 30%, rgba(38,97,156,0.14), transparent 60%),' +
              'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.10), transparent 70%)',
          }}
        />
        <div className="relative px-3 sm:px-4 md:px-6 pt-5 md:pt-7 pb-10 md:pb-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-baseline justify-center gap-2 leading-none" style={{ color: 'oklch(97% 0.006 250)', fontFamily: 'var(--font-code)' }}>
              <span
                className="font-bold tabular-nums"
                style={{
                  fontSize: '60px',
                  letterSpacing: '-0.02em',
                  textShadow: '0 0 24px rgba(255,255,255,0.18)',
                }}
              >
                {hh12}:{mm}
              </span>
              <span
                className="font-semibold tabular-nums"
                style={{
                  fontSize: '20px',
                  color: 'var(--cam-gold-leaf-lt)',
                  textShadow: '0 0 18px rgba(217,181,67,0.35)',
                }}
              >
                {ampm}
              </span>
            </div>
            <div className="mt-2 text-sm font-medium" style={{ color: 'oklch(82% 0.008 250)' }}>{dateStr}</div>
            <h1 className="mt-4 text-xl font-bold" style={{ color: 'oklch(97% 0.006 250)' }}>{greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          </div>
        </div>
        {/* Soft fade into the body — replaces the diagonal divider */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent, var(--bg-surface))' }}
        />
      </div>

      <div className="px-3 sm:px-4 md:px-6 pt-2 md:pt-3 pb-6 max-w-5xl mx-auto w-full">

      {/* Launch Now */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-code)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 600 }}>Launch Now</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {COPILOTS.map(cp => (
            <button
              key={cp.name}
              onClick={cp.onClick}
              className="group flex items-center gap-3 p-3 rounded-xl text-left transition-[box-shadow,border-color] duration-200"
              style={{
                border: '1px solid rgba(38,97,156,0.14)',
                background: 'rgba(38,97,156,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(38,97,156,0.35)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(38,97,156,0.14)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(38,97,156,0.14)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="relative shrink-0 rounded-lg overflow-hidden" style={{ width: 44, height: 44, background: 'var(--cam-primary-dk)' }}>
                <img
                  src={cp.image}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ filter: 'grayscale(100%) contrast(1.08) brightness(0.72)' }}
                />
                <div aria-hidden="true" className="absolute inset-0" style={{ background: 'var(--cam-primary)', mixBlendMode: 'multiply' }} />
                <div className="absolute inset-0 flex items-center justify-center">{cp.icon}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{cp.name}</div>
                <div className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>{cp.desc}</div>
              </div>
              <svg className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Quick prompts — each card has a Databricks-style gradient
          thumbnail (bold navy radial → light) with a large category
          glyph for instant visual scanning. */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-code)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 600 }}>Try Asking</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p.text}
              onClick={() => handlePromptClick(p)}
              className="group flex items-center gap-3 text-left p-5 rounded-xl transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                minHeight: 88,
                background: 'linear-gradient(135deg, rgba(38,97,156,0.04) 0%, rgba(38,97,156,0.08) 100%)',
                border: '1px solid rgba(38,97,156,0.10)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(38,97,156,0.32)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(38,97,156,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(38,97,156,0.10)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <PromptThumb type={p.type} />
              <span className="text-[13px] leading-snug flex-1" style={{ color: 'var(--text-secondary)' }}>{p.text}</span>
              <svg
                className="w-3.5 h-3.5 shrink-0 opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-[transform,opacity]"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                style={{ color: 'var(--cam-primary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard hints — hidden on mobile (no physical keyboard) */}
      <div className="hidden md:flex items-center gap-4 text-[10px] pt-4 mt-2" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
        <span><kbd className="px-1.5 py-0.5 rounded" style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>⌘K</kbd> focus</span>
        <span><kbd className="px-1.5 py-0.5 rounded" style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>⌘M</kbd> mic</span>
        <span><kbd className="px-1.5 py-0.5 rounded" style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>⌘B</kbd> blank screen</span>
      </div>
      </div>
      {/* Full-width gold border below content — mirrors the hero strip top border */}
      <div style={{ borderTop: '2px solid var(--cam-gold-leaf)', flexShrink: 0 }} />
    </div>
  );
}
