import { useEffect, useState, type CSSProperties } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionStore } from '@/stores/session-store';
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
/* Shared shell styling for the home screen. Every value resolves through
   --lum-* tokens, which are defined in BOTH themes (globals.css), so this
   component never branches on `theme === 'light'`. */
const SECTION_H: CSSProperties = {
  fontSize: 14, fontWeight: 600, margin: 0, paddingBottom: 8,
  borderBottom: '1px solid var(--lum-border)', color: 'var(--lum-text)',
};
const SECTION_HINT: CSSProperties = {
  fontSize: 12, color: 'var(--lum-text-2)', margin: '8px 0 12px',
};
const TAG_BASE: CSSProperties = {
  display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '1px 8px',
  borderRadius: 'var(--lum-radius)', border: '1px solid', textTransform: 'uppercase',
  letterSpacing: '0.04em',
};
const TAG_TONE: Record<string, CSSProperties> = {
  design:     { color: 'var(--lum-tag-design-fg)', background: 'var(--lum-tag-design-bg)', borderColor: 'var(--lum-tag-design-br)' },
  coding:     { color: 'var(--lum-tag-coding-fg)', background: 'var(--lum-tag-coding-bg)', borderColor: 'var(--lum-tag-coding-br)' },
  behavioral: { color: 'var(--lum-tag-behav-fg)',  background: 'var(--lum-tag-behav-bg)',  borderColor: 'var(--lum-tag-behav-br)'  },
};

const EmptyState = ({ onAskQuestion, onSwitchToCoding, onSwitchToDesign, onSwitchToCofix }: {
  onAskQuestion?: (question: string) => void;
  onSwitchToCoding?: (problem?: string) => void;
  onSwitchToDesign?: (problem?: string) => void;
  onSwitchToCofix?: () => void;
}) => {
  const { user } = useAuth();
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
      onClick: () => onSwitchToCoding?.(),
    },
    {
      name: 'System Design', desc: 'Architecture diagrams generated in real-time.',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
      onClick: () => onSwitchToDesign?.(),
    },
    {
      name: 'CoFix', desc: 'Fix & debug your code with inline annotations.',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2-2 2.6-2.6z" /></svg>,
      onClick: () => onSwitchToCofix?.(),
    },
    {
      name: 'Behavioral', desc: 'STAR answers drawn from your resume and past experience.',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 00-16 0" /></svg>,
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

  const handlePromptClick = (prompt: typeof QUICK_PROMPTS[number]) => {
    if (prompt.type === 'coding') onSwitchToCoding?.(prompt.text);
    else if (prompt.type === 'design') onSwitchToDesign?.(prompt.text);
    else onAskQuestion?.(prompt.text);
  };

  return (
    <div className="flex-1 overflow-auto flex flex-col" style={{ background: 'var(--lum-bg)', color: 'var(--lum-text)' }}>
      <style>{`
        @keyframes sona-ready { 0%,100%{opacity:1} 50%{opacity:.55} }
        .lum-card { transition: border-color .12s ease; }
        .lum-card:hover { border-color: var(--lum-border-strong); }
        .lum-card:focus-visible { outline: 2px solid var(--lum-accent); outline-offset: 1px; }
        .lum-row { transition: background .1s ease; }
        .lum-row:hover { background: var(--lum-surface-hover); }
        .lum-row:focus-visible { outline: 2px solid var(--lum-accent); outline-offset: -2px; }
        @media (prefers-reduced-motion: reduce) { .lum-card, .lum-row { transition: none; } }
      `}</style>

      {/* Context bar. Carries state, not verbs: the actions the mockup
          showed here (mic, blank screen) have no handler on this screen,
          and shipping them would be dead controls. */}
      <div style={{ display:'flex', alignItems:'center', gap:8, height:44, padding:'0 20px', flexShrink:0,
                    background:'var(--lum-cmdbar-bg)', borderBottom:'1px solid var(--lum-border)' }}>
        <span style={{ fontSize:12, color:'var(--lum-text-2)' }}>Lumora</span>
        <span style={{ fontSize:12, color:'var(--lum-text-2)' }} aria-hidden="true">&rsaquo;</span>
        <span style={{ fontSize:12, fontWeight:600, color:'var(--lum-text)' }}>Home</span>
        <span style={{ marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:7, fontSize:12, color:'var(--lum-text-2)' }}>
          <span aria-hidden="true" style={{ width:8, height:8, borderRadius:'50%', background:'var(--lum-ok)', animation:'sona-ready 2s ease-in-out infinite' }} />
          Sona ready
        </span>
      </div>

      <div style={{ padding:'18px 20px 16px' }}>
        <h2 style={{ fontSize:24, fontWeight:600, margin:0, letterSpacing:'-0.01em', color:'var(--lum-text)' }}>
          {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h2>
        <div style={{ fontSize:13, color:'var(--lum-text-2)', marginTop:2 }}>
          {dateStr} &middot; {hh12}:{mm} {ampm} &middot; No session running
        </div>
      </div>

      <div style={{ padding:'0 20px 24px', display:'flex', flexDirection:'column', gap:22 }}>

        <section>
          <h3 style={SECTION_H}>Start a session</h3>
          <p style={SECTION_HINT}>Pick the copilot that matches the interview you&rsquo;re about to take.</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(215px, 1fr))', gap:12 }}>
            {COPILOTS.map(cp => (
              <button key={cp.name} onClick={cp.onClick} className="lum-card"
                style={{ textAlign:'left', cursor:'pointer', display:'flex', flexDirection:'column', gap:8, padding:14,
                         background:'var(--lum-surface)', border:'1px solid var(--lum-border)',
                         borderRadius:'var(--lum-radius)', boxShadow:'var(--lum-shadow)' }}>
                <span style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <span aria-hidden="true" data-overlay-keep style={{ width:28, height:28, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                               borderRadius:'var(--lum-radius)', background:'var(--lum-accent-bg)', color:'var(--lum-accent)' }}>
                    {cp.icon}
                  </span>
                  <span style={{ fontSize:14, fontWeight:600, color:'var(--lum-text)' }}>{cp.name}</span>
                </span>
                <span style={{ fontSize:12, lineHeight:1.5, color:'var(--lum-text-2)' }}>{cp.desc}</span>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--lum-accent-sm)', marginTop:'auto', paddingTop:4 }}>Launch &rarr;</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 style={SECTION_H}>Suggested prompts</h3>
          <p style={SECTION_HINT}>Common starters. Select one to begin immediately.</p>
          <div data-overlay-keep style={{ border:'1px solid var(--lum-border)', borderRadius:'var(--lum-radius)',
                        background:'var(--lum-surface)', overflow:'hidden' }}>
            {QUICK_PROMPTS.map((p, i) => (
              <button key={p.text} onClick={() => handlePromptClick(p)} className="lum-row"
                style={{ width:'100%', textAlign:'left', cursor:'pointer', display:'grid',
                         gridTemplateColumns:'104px 1fr auto', alignItems:'center', gap:14, padding:'10px 14px',
                         background:'transparent', border:'none',
                         borderBottom: i < QUICK_PROMPTS.length - 1 ? '1px solid var(--lum-border)' : 'none' }}>
                <span>
                  <span data-overlay-keep style={{ ...TAG_BASE, ...TAG_TONE[p.type] }}>{p.type}</span>
                </span>
                <span style={{ fontSize:13, color:'var(--lum-text)' }}>{p.text}</span>
                <span aria-hidden="true" style={{ fontSize:13, color:'var(--lum-text-2)' }}>&rarr;</span>
              </button>
            ))}
          </div>
        </section>

        {/* Only shortcuts LumoraShellPage actually binds. The previous
            footer advertised Cmd+K / Cmd+M / Cmd+B, none of which exist. */}
        <div style={{ display:'flex', gap:16, alignItems:'center', fontSize:12, color:'var(--lum-text-2)', paddingTop:4 }}>
          {([['⌘S','Search'],['⌘⌫','Clear history']] as const).map(([k, v]) => (
            <span key={k} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <kbd style={{ padding:'1px 6px', fontSize:12, fontFamily:'inherit', color:'var(--lum-text)',
                            background:'var(--lum-surface)', border:'1px solid var(--lum-border-strong)',
                            borderBottomWidth:2, borderRadius:'var(--lum-radius)' }}>{k}</kbd>
              {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
