import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionStore } from '@/stores/session-store';
import { useTheme } from '@/hooks/useTheme';
import { StreamingAnswer } from './StreamingAnswer';
import { AnswerBlocks } from './AnswerBlocks';
import { Citations } from '@/components/lumora/Citations';

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
  if (/^\[[A-Z+#.-]{2,16}\]/.test(t)) return 'coding';
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
  onSwitchToCofix?: () => void;
  focusedEntry?: number | null;
  onClearFocus?: () => void;
  onRetry?: () => void;
}

export const SessionPanel = ({ onAskQuestion, onSwitchToCoding, onSwitchToDesign, onSwitchToCofix, onRetry }: SessionPanelProps) => {
  const {
    question,
    isStreaming,
    isDesignQuestion,
    isCodingQuestion,
    streamText,
    parsedBlocks,
    activeCitations,
    lastFromCache,
    error,
    setError,
    history,
  } = useSessionStore();
  // Q.<#> numbering counts the active stream as the next entry in
  // history, so users see "Q.7" land before it gets persisted as #7.
  const activeQNumber = history.length + 1;
  const activeCategory = categorize(question || '', isCodingQuestion, isDesignQuestion);
  const { theme } = useTheme();
  const behavioralAccent = theme === 'light' ? '#3683DC' : '#C9A227';

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
        <EmptyState onAskQuestion={onAskQuestion} onSwitchToCoding={onSwitchToCoding} onSwitchToDesign={onSwitchToDesign} onSwitchToCofix={onSwitchToCofix} />
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
                    background: 'var(--cam-accent-fill)',
                    color: 'var(--cam-accent-fill-text)',
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

          {/* Completed answer — rendered from parsedBlocks once streaming ends */}
          {!isStreaming && parsedBlocks.length > 0 && (
            <div className="shrink-0 mt-1">
              <AnswerBlocks
                blocks={parsedBlocks}
                isDesign={isDesignQuestion}
                isCoding={isCodingQuestion}
                question={question || undefined}
              />
              <Citations citations={activeCitations} />
              {lastFromCache && onRetry && (
                <div className="flex justify-end px-1 mt-0.5 mb-2">
                  <button
                    onClick={onRetry}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-md transition-opacity hover:opacity-80"
                    style={{
                      fontFamily: 'var(--font-code)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-elevated)',
                    }}
                  >
                    Try fresh answer
                  </button>
                </div>
              )}
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
                <div className="flex items-center gap-3 mt-1.5">
                  {onRetry && question && (
                    <button
                      onClick={() => { setError(null); onRetry(); }}
                      className="text-xs font-semibold hover:underline"
                      style={{ fontFamily: 'var(--font-code)', color: 'var(--danger)' }}
                    >
                      Retry
                    </button>
                  )}
                  <button onClick={() => setError(null)} className="text-xs hover:underline" style={{ fontFamily: 'var(--font-code)', color: 'var(--danger)' }}>Dismiss</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

/* ─── Lumora Dashboard ─────────────────────────────── */
const EmptyState = ({ onAskQuestion, onSwitchToCoding, onSwitchToDesign, onSwitchToCofix }: {
  onAskQuestion?: (question: string) => void;
  onSwitchToCoding?: (problem?: string) => void;
  onSwitchToDesign?: (problem?: string) => void;
  onSwitchToCofix?: () => void;
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const behavioralAccent = theme === 'light' ? '#3683DC' : '#C9A227';
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const hh12 = ((now.getHours() + 11) % 12) + 1;
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ampm = now.getHours() < 12 ? 'AM' : 'PM';
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const COPILOTS = [
    {
      name: 'Coding', desc: 'Multi-approach solutions with complexity analysis.',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>,
      accent: '#3683DC',
      onClick: () => onSwitchToCoding?.(),
    },
    {
      name: 'System Design', desc: 'Architecture diagrams generated in real-time.',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
      accent: '#5B9BD5',
      onClick: () => onSwitchToDesign?.(),
    },
    {
      name: 'CoFix', desc: 'Fix & debug your code with inline annotations.',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2-2 2.6-2.6z" /></svg>,
      accent: '#C9A227',
      onClick: () => onSwitchToCofix?.(),
    },
    {
      name: 'Behavioral', desc: 'STAR answers drawn from your resume and past experience.',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 00-16 0" /></svg>,
      accent: behavioralAccent,
      onClick: () => onAskQuestion?.('Tell me about yourself and your experience'),
    },
  ];

  const QUICK_PROMPTS = [
    { text: 'Design a rate limiter for an API gateway', type: 'design' as const },
    { text: 'Implement LRU cache from scratch', type: 'coding' as const },
    { text: 'Tell me about a time you disagreed with your manager', type: 'behavioral' as const },
    { text: 'Design a URL shortener like bit.ly', type: 'design' as const },
    { text: 'Reverse a linked list iteratively and recursively', type: 'coding' as const },
    { text: 'Describe a time you failed and what you learned', type: 'behavioral' as const },
  ];
  const PROMPT_ACCENT: Record<string, string> = { design: '#5B9BD5', coding: '#3683DC', behavioral: behavioralAccent };

  const handlePromptClick = (prompt: typeof QUICK_PROMPTS[number]) => {
    if (prompt.type === 'coding') onSwitchToCoding?.(prompt.text);
    else if (prompt.type === 'design') onSwitchToDesign?.(prompt.text);
    else onAskQuestion?.(prompt.text);
  };

  return (
    <div className="flex-1 overflow-auto flex flex-col" style={{ background: 'var(--bg-surface)' }}>
      <style>{`
        @keyframes sona-ready {
          0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(74,222,128,.55)}
          50%{opacity:.75;box-shadow:0 0 0 6px rgba(74,222,128,0)}
        }
      `}</style>

      {/* ── Hero — compact, clean command-center ── */}
      <div className="relative overflow-hidden" style={{
        background: theme === 'light' ? 'var(--bg-elevated)' : 'var(--lumora-hero-gradient)',
        borderBottom: theme === 'light' ? '1px solid var(--border)' : 'none',
        minHeight: 160,
      }}>
        {theme !== 'light' && (
          <div aria-hidden="true" style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
            <div style={{ position:'absolute', width:340, height:340, borderRadius:'50%', top:'-100px', left:'-60px', background:'radial-gradient(circle,rgba(54,131,220,.13) 0%,transparent 65%)' }} />
            <div style={{ position:'absolute', width:220, height:220, borderRadius:'50%', top:'0', right:'-30px', background:'radial-gradient(circle,rgba(201,162,39,.07) 0%,transparent 65%)' }} />
          </div>
        )}
        {theme !== 'light' && (
          <div aria-hidden="true" style={{ position:'absolute', bottom:0, left:0, right:0, height:48, background:'linear-gradient(to bottom,transparent,var(--bg-surface))', pointerEvents:'none' }} />
        )}

        <div className="relative px-4 md:px-6 pt-7 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
            style={{
              background: theme === 'light' ? 'var(--accent-subtle)' : 'rgba(255,255,255,.05)',
              border: theme === 'light' ? '1px solid var(--border-focus)' : '1px solid rgba(255,255,255,.10)',
            }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#4ADE80', display:'inline-block', flexShrink:0, animation:'sona-ready 2s ease-in-out infinite' }} />
            <span style={{ fontFamily:'var(--font-code)', fontSize:10, fontWeight:700, letterSpacing:'0.16em', color: theme === 'light' ? 'var(--accent)' : 'rgba(255,255,255,.72)', textTransform:'uppercase' }}>Sona · Ready</span>
          </div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color: theme === 'light' ? 'var(--text-primary)' : '#fff', margin:0, lineHeight:1.2 }}>
            {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
          </h2>
          <div className="flex items-center justify-center gap-3 mt-2">
            <span style={{ fontFamily:'var(--font-code)', fontSize:13, fontWeight:600, color: theme === 'light' ? 'var(--text-secondary)' : 'rgba(255,255,255,.5)', letterSpacing:'0.06em' }}>
              {hh12}:{mm} <span style={{ color:'var(--accent)' }}>{ampm}</span>
            </span>
            <span style={{ display:'inline-block', width:1, height:12, background: theme === 'light' ? 'var(--border)' : 'rgba(255,255,255,.18)' }} />
            <span style={{ fontFamily:'var(--font-code)', fontSize:11, color: theme === 'light' ? 'var(--text-muted)' : 'rgba(255,255,255,.35)', letterSpacing:'0.06em' }}>{dateStr}</span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 md:px-6 pt-4 pb-8 max-w-2xl mx-auto w-full flex flex-col gap-6">

        {/* Session cards */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span style={{ display:'inline-block', width:2, height:14, borderRadius:2, background:'var(--accent)', flexShrink:0 }} />
            <span style={{ fontFamily:'var(--font-code)', fontSize:10, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--text-muted)' }}>Start a session</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {COPILOTS.map(cp => (
              <button
                key={cp.name}
                onClick={cp.onClick}
                className="group text-left rounded-2xl p-5 relative overflow-hidden"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderTop: `3px solid ${cp.accent}`,
                  transition: 'box-shadow .18s, transform .18s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.boxShadow = `0 8px 32px ${cp.accent}1E, 0 2px 8px rgba(0,0,0,.10)`;
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.boxShadow = 'none';
                  el.style.transform = 'none';
                }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:`${cp.accent}18`, border:`1px solid ${cp.accent}30`, display:'flex', alignItems:'center', justifyContent:'center', color:cp.accent, flexShrink:0 }}>
                    {cp.icon}
                  </div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>
                    {cp.name}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, fontFamily:'var(--font-code)', color:cp.accent, letterSpacing:'0.06em', textTransform:'uppercase' }}>
                  Launch
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Suggested prompts */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span style={{ display:'inline-block', width:2, height:14, borderRadius:2, background:'var(--accent)', flexShrink:0 }} />
            <span style={{ fontFamily:'var(--font-code)', fontSize:10, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--text-muted)' }}>Suggested prompts</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {QUICK_PROMPTS.map(p => {
              const accent = PROMPT_ACCENT[p.type];
              return (
                <button
                  key={p.text}
                  onClick={() => handlePromptClick(p)}
                  className="group text-left rounded-xl px-4 py-3.5 flex flex-col gap-1.5"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderTop: `2px solid ${accent}`,
                    minHeight: 80,
                    transition: 'box-shadow .15s, transform .15s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.boxShadow = `0 4px 16px ${accent}18`;
                    el.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.boxShadow = 'none';
                    el.style.transform = 'none';
                  }}
                >
                  <span style={{ fontFamily:'var(--font-code)', fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:accent }}>
                    {p.type}
                  </span>
                  <span style={{ fontFamily:'var(--font-sans)', fontSize:13, lineHeight:1.55, color:'var(--text-secondary)', fontWeight:450 }}>
                    {p.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="hidden md:flex items-center justify-between pt-3" style={{ borderTop:'1px solid var(--border)' }}>
          <div className="flex items-center gap-4" style={{ fontFamily:'var(--font-code)', fontSize:10, color:'var(--text-muted)' }}>
            {([['⌘K','focus'],['⌘M','mic'],['⌘B','blank screen']] as const).map(([k,v]) => (
              <span key={k} className="flex items-center gap-1.5">
                <kbd style={{ padding:'2px 6px', borderRadius:4, border:'1px solid var(--border)', background:'var(--bg-surface)', fontSize:10 }}>{k}</kbd>
                {v}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5" style={{ fontFamily:'var(--font-code)', fontSize:10, color:'var(--text-muted)' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#4ADE80', display:'inline-block', animation:'sona-ready 2s ease-in-out infinite' }} />
            Sona ready
          </div>
        </div>
      </div>

      <div style={{ borderTop:'1px solid var(--border)', flexShrink:0 }} />
    </div>
  );
}
