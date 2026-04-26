import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { streamResponse } from '@/lib/sse-client';
import { getActiveAssistant, buildSystemContext, type LumoraStory } from '@/lib/lumora-assistant';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import { dialogConfirm } from '@/components/shared/Dialog';
import { extractAnswer, cleanTags } from './companion/text-formatting';
import { AnswerView, StoryBankPanel, getArchetype } from './companion/answer-view';
import { MicButtonLarge } from './companion/mic-button-large';

/* Theme-aware copilot palette — flips with [data-theme="dark"] via CSS vars */
const C = {
  base: 'var(--bg-surface)', surface: 'var(--bg-elevated)', elevated: 'var(--cam-primary)',
  text: 'var(--text-primary)', muted: 'var(--text-muted)', accent: 'var(--cam-primary)',
  accentBg: 'var(--accent-subtle)', border: 'var(--border)',
};

/* ── Types ── */
interface CopilotMessage { role: 'user' | 'ai'; text: string; time: Date; }

interface AICompanionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type AnswerMode = 'short' | 'detailed';

/* ── SonaAvatar — enterprise wordmark ──
   Hexagonal silhouette with a bold brand-color "S" glyph over a deep-navy
   field. Designed to read like a product wordmark — Stripe / Linear /
   Vercel weight class — rather than a cute portrait. Stays crisp at
   14–64 px. The glyph and indicator ring read from --cam-primary so the
   avatar tracks whatever the current palette is, without hard-coded hex.

   Props:
     size   — px square dimension
     active — a thin outer ring pulses while Sona is streaming */
let SONA_AVATAR_SEED = 0;
function SonaAvatar({ size = 24, active = false }: { size?: number; active?: boolean }) {
  const id = useMemo(() => `sona-${++SONA_AVATAR_SEED}`, []);
  const g = {
    field: `${id}-field`,
    glyph: `${id}-glyph`,
    edge: `${id}-edge`,
  };
  // Pointy-top hexagon path — precise symmetric vertices, rounded join.
  const hexPath = 'M32 5 L55.3 18.5 L55.3 45.5 L32 59 L8.7 45.5 L8.7 18.5 Z';
  // S glyph — two continuous bezier curves forming a flat-ribbon monogram.
  // Thick enough to hold at 14 px, crisp enough to read like a typeset letter.
  const sPath =
    'M41.5 22.2 C41.5 19.1 37.5 17 32 17 C26 17 22 19.3 22 23.8 ' +
    'C22 28.2 27 30.5 33 31.8 C39 33.1 42.5 35.3 42.5 39.8 ' +
    'C42.5 44.5 38 47 32 47 C26.5 47 22.5 44.8 21.5 41.2';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="sona-breathe"
      style={{ display: 'block', filter: 'drop-shadow(0 1px 2px rgba(8,47,73,0.25))' }}
    >
      <defs>
        {/* Deep-navy field — flat enterprise feel, just a subtle top-to-bottom
            lift so the hex has form without reading as a glass orb. */}
        <linearGradient id={g.field} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        {/* S glyph — single-tone brand color, no rainbow. */}
        <linearGradient id={g.glyph} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#95B0CD" />
          <stop offset="100%" stopColor="var(--cam-primary)" />
        </linearGradient>
        {/* Inner edge hairline — a thin brand-color hint along the top edge
            of the hex to suggest light catch. No glossy shine. */}
        <linearGradient id={g.edge} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cam-primary)" stopOpacity="0.7" />
          <stop offset="55%" stopColor="var(--cam-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Active outer indicator ring — pulses while Sona streams */}
      {active && (
        <path
          d={hexPath}
          fill="none"
          stroke="var(--cam-primary)"
          strokeWidth="1.2"
          strokeLinejoin="round"
          opacity="0"
        >
          <animate attributeName="opacity" values="0;0.55;0" dur="1.8s" repeatCount="indefinite" />
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1;1.06;1"
            dur="1.8s"
            additive="sum"
            repeatCount="indefinite"
          />
        </path>
      )}

      {/* Main hex field */}
      <path d={hexPath} fill={`url(#${g.field})`} stroke="var(--cam-primary)" strokeOpacity="0.35" strokeWidth="1" strokeLinejoin="round" />

      {/* Top-edge light catch (enterprise depth cue, no gloss) */}
      <path d={hexPath} fill={`url(#${g.edge})`} style={{ mixBlendMode: 'screen' }} />

      {/* S glyph — thick ribbon, single-tone brand color, crisp at 14 px */}
      <path
        d={sPath}
        fill="none"
        stroke={`url(#${g.glyph})`}
        strokeWidth="5.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


/* ═══ Assistant Panel ═══ */
export function AICompanionPanel({ isOpen, onClose, initialQuestion, embedded = false }: AICompanionPanelProps & { initialQuestion?: string; embedded?: boolean }) {
  const { token } = useAuth();

  // Load active assistant context (resume + JD) — shared helper, same shape as Coding + Design windows
  const activeAssistant = useMemo(() => getActiveAssistant(), []);
  const systemContext = useMemo(() => buildSystemContext(activeAssistant), [activeAssistant]);

  // Persist Behavioral messages per-assistant in sessionStorage so refresh doesn't
  // wipe an in-progress interview. Cleared when the user explicitly clears chat.
  // MUST come after activeAssistant — `const` has TDZ, minified references crash
  // at runtime with 'Cannot access … before initialization' if this block runs first.
  const storageKey = useMemo(() => activeAssistant?.id ? `lumora_behavioral_${activeAssistant.id}` : 'lumora_behavioral_default', [activeAssistant?.id]);
  const [messages, setMessages] = useState<CopilotMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as Array<{ role: 'user' | 'ai'; text: string; time: string }>;
      return parsed.map(m => ({ ...m, time: new Date(m.time) }));
    } catch { return []; }
  });

  // Persist on every messages change
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(messages.map(m => ({ ...m, time: m.time.toISOString() })))); } catch { /* quota */ }
  }, [messages, storageKey]);

  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [input, setInput] = useState('');
  const [minimized, setMinimized] = useState(true);
  const [maximized, setMaximized] = useState(false);
  // Cap initial size to the actual viewport so the floating copilot
  // doesn't ship off the edge on small windows. 400×560 is the desktop
  // default; on phones the panel claims most of the width with a 24px
  // gutter and stays within the visible vertical area.
  const [panelWidth, setPanelWidth] = useState(() =>
    typeof window === 'undefined' ? 400 : Math.min(400, Math.max(280, window.innerWidth - 48))
  );
  const [panelHeight, setPanelHeight] = useState(() =>
    typeof window === 'undefined' ? 560 : Math.min(560, Math.max(360, window.innerHeight - 96))
  );
  const [isResizing, setIsResizing] = useState<false | 'w' | 'h' | 'wh'>(false);
  const [answerMode, setAnswerMode] = useState<AnswerMode>('short');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number; mode: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initialQuestionSent = useRef(false);

  // Handle initial question from behavioral button
  useEffect(() => {
    if (initialQuestion && !initialQuestionSent.current) {
      initialQuestionSent.current = true;
      setMinimized(false);
      // Small delay to let panel render before sending
      setTimeout(() => ask(initialQuestion), 300);
    }
  }, [initialQuestion]);

  // Reset when question changes
  useEffect(() => {
    if (!initialQuestion) initialQuestionSent.current = false;
  }, [initialQuestion]);

  // Drag handlers for floating window
  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setPosition({
        x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
      });
    };
    const handleUp = () => { setIsDragging(false); dragRef.current = null; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isDragging]);

  const startDrag = (e: React.MouseEvent) => {
    if (maximized) return;
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: position.x, origY: position.y };
  };

  // Resize handlers — edges and corner
  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const r = resizeRef.current;
      if (r.mode === 'w' || r.mode === 'wh') {
        const dX = r.startX - e.clientX;
        setPanelWidth(Math.min(Math.max(300, r.startW + dX), 800));
      }
      if (r.mode === 'h' || r.mode === 'wh') {
        const dY = r.startY - e.clientY;
        setPanelHeight(Math.min(Math.max(300, r.startH + dY), 900));
      }
    };
    const handleUp = () => { setIsResizing(false); resizeRef.current = null; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isResizing]);

  // Auto-scroll
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, streamText, isOpen]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen]);

  // Holds the most recent question captured while Sona is still streaming.
  // Only the latest is kept — older pending questions are overwritten — so
  // the queue drains to exactly one follow-up when the current answer ends.
  const pendingQuestionRef = useRef<string | null>(null);

  // Ask a question — streams independently
  const ask = useCallback(async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || !token) return;
    if (streaming) {
      pendingQuestionRef.current = trimmed;
      return;
    }

    const modePrefix = answerMode === 'short' ? '[SHORT] ' : '[DETAILED] ';

    setMessages(prev => [...prev, { role: 'user', text: question.trim(), time: new Date() }]);
    setStreaming(true);
    setStreamText('');

    try {
      await streamResponse({
        question: modePrefix + question.trim(),
        token,
        useSearch: false,
        systemContext,
        onToken: (data) => {
          if (data.t) setStreamText(prev => prev + data.t);
        },
        onAnswer: (data: any) => {
          const answerText = extractAnswer(data.parsed) || data.raw || '';
          setMessages(prev => [...prev, { role: 'ai', text: cleanTags(answerText), time: new Date() }]);
          setStreamText('');
          setStreaming(false);
        },
        onError: (data: any) => {
          setMessages(prev => [...prev, { role: 'ai', text: `Error: ${data.message || 'Something went wrong'}`, time: new Date() }]);
          setStreamText('');
          setStreaming(false);
        },
      });
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Connection failed. Try again.', time: new Date() }]);
      setStreamText('');
      setStreaming(false);
    }
  }, [token, streaming, answerMode, systemContext]);

  const handleSubmit = useCallback(() => {
    if (input.trim()) { ask(input); setInput(''); }
  }, [input, ask]);

  // Stable ref so AudioCapture's onTranscription dep doesn't rebuild on every
  // `streaming` flip — mid-recording callback swaps caused dropped chunks.
  const askRef = useRef(ask);
  useEffect(() => { askRef.current = ask; }, [ask]);

  // Drain the queued question when the current answer finishes streaming.
  // Auto-mic can capture follow-ups while Sona is mid-stream — we hold only
  // the latest in `pendingQuestionRef` and fire it here.
  useEffect(() => {
    if (!streaming && pendingQuestionRef.current) {
      const q = pendingQuestionRef.current;
      pendingQuestionRef.current = null;
      const timer = setTimeout(() => askRef.current?.(q), 0);
      return () => clearTimeout(timer);
    }
  }, [streaming]);

  // Stable handler for continuous-mic transcriptions (no deps → never rebuilds).
  const handleAutoTranscription = useCallback((text: string) => {
    askRef.current?.(text);
  }, []);

  // Embedded mode = render inline, skip minimized/floating
  useEffect(() => {
    if (embedded) setMinimized(false);
  }, [embedded]);

  // Minimized = floating icon button
  if (minimized && !embedded) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--cam-primary)', boxShadow: '0 10px 26px -6px rgba(38,97,156,0.45), 0 2px 6px rgba(38,97,156,0.18)' }}
        title="Open Sona"
      >
        <SonaAvatar size={44} />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{messages.filter(m => m.role === 'user').length}</span>
        )}
      </button>
    );
  }

  return (
    <div
      className={embedded ? "flex flex-col h-full w-full" : "fixed z-50 flex flex-col"}
      style={embedded ? { background: 'var(--bg-surface)', borderRadius: 0 } : {
        // On mobile the LumoraIconRail is hidden, so maximized must start at left:0
        // and span the full viewport width. md+ keeps the 80px rail offset.
        width: maximized ? `calc(100vw - var(--lumora-rail-offset, 0px))` : panelWidth,
        height: maximized ? '100dvh' : panelHeight,
        right: maximized ? 0 : `calc(24px - ${position.x}px)`,
        bottom: maximized ? 0 : `calc(24px - ${position.y}px)`,
        left: maximized ? 'var(--lumora-rail-offset, 0px)' : undefined,
        top: maximized ? 0 : undefined,
        borderRadius: maximized ? 0 : '16px',
        background: 'var(--bg-surface)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: maximized ? 'none' : '1px solid var(--border)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        transition: isDragging ? 'none' : 'all 0.2s ease',
      }}
    >
      {/* Resize handles — left edge, top edge, top-left corner */}
      {!maximized && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10" onMouseDown={(e) => { setIsResizing('w'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, mode: 'w' }; }} />
          <div className="absolute left-0 top-0 right-0 h-2 cursor-ns-resize z-10" onMouseDown={(e) => { setIsResizing('h'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, mode: 'h' }; }} />
          <div className="absolute left-0 top-0 w-4 h-4 cursor-nwse-resize z-20" onMouseDown={(e) => { setIsResizing('wh'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, mode: 'wh' }; }} />
        </>
      )}

      {/* Header */}
      <div
        className={`flex items-center gap-2 h-10 px-3 shrink-0 ${embedded ? '' : 'cursor-move'} select-none`}
        style={{ borderBottom: '1px solid var(--border)', borderRadius: embedded || maximized ? 0 : '16px 16px 0 0' }}
        onMouseDown={embedded ? undefined : startDrag}
      >
        {/* Left: clear + close (embedded) or clear + new (floating) */}
        <div className="flex items-center gap-0.5">
          <button onClick={async () => { if (messages.length === 0) return; const ok = await dialogConfirm({ title: 'Clear chat history?', message: 'This will clear the Sona chat in this panel only.', confirmLabel: 'Clear', tone: 'danger' }); if (ok) setMessages([]); }}
            className="p-1 rounded-md transition-colors hover:bg-black/5" style={{ color: 'var(--text-muted)' }} title="Clear history">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
          </button>
          {embedded ? (
            <button onClick={onClose} className="p-1 rounded-md transition-colors hover:bg-black/5" style={{ color: 'var(--text-muted)' }} title="Close">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          ) : (
            <button onClick={() => setMessages([])} className="p-1 rounded-md transition-colors hover:bg-black/5" style={{ color: 'var(--text-muted)' }} title="New chat">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
          )}
        </div>

        {/* Center: title + mode toggle */}
        <div className="flex-1 flex items-center justify-center gap-2">
          <SonaAvatar size={18} />
          <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>Sona</span>
          {activeAssistant && <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-subtle)', color: 'var(--success)' }}>{activeAssistant.company || activeAssistant.role || 'Custom'}</span>}
          <div className="flex items-center rounded-md p-0.5" style={{ background: 'var(--bg-elevated)' }}>
            {(['short', 'detailed'] as AnswerMode[]).map(mode => (
              <button
                key={mode}
                onClick={(e) => { e.stopPropagation(); setAnswerMode(mode); }}
                className="px-2.5 py-0.5 rounded transition-all"
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: answerMode === mode ? '#FFFFFF' : 'var(--text-dimmed)',
                  background: answerMode === mode ? 'var(--cam-primary)' : 'transparent',
                }}
              >
                {mode === 'short' ? 'Short' : 'Detailed'}
              </button>
            ))}
          </div>
        </div>

        {/* Right: minimize + maximize (floating only) */}
        {!embedded && (
          <div className="flex items-center gap-0.5">
            <button onClick={() => setMinimized(true)}
              className="p-1 rounded-md transition-colors hover:bg-black/5" style={{ color: 'var(--text-muted)' }} title="Minimize">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12h16" /></svg>
            </button>
            <button onClick={() => { setMaximized(!maximized); setPosition({ x: 0, y: 0 }); }}
              className="p-1 rounded-md transition-colors hover:bg-black/5" style={{ color: 'var(--text-muted)' }} title={maximized ? 'Restore' : 'Maximize'}>
              {maximized ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="5" width="14" height="14" rx="1" /><path d="M9 3h10a2 2 0 012 2v10" /></svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Chat — side-by-side when embedded, top-to-bottom when floating */}
      {embedded ? (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left: stories + questions */}
          <div className="w-[280px] shrink-0 overflow-auto border-r" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
            <StoryBankPanel
              stories={activeAssistant?.stories}
              activeArchetype={(() => {
                const lastAi = [...messages].reverse().find(m => m.role === 'ai');
                if (!lastAi && streamText) return getArchetype(streamText);
                return lastAi ? getArchetype(lastAi.text) : null;
              })()}
            />
            <div className="p-3 space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] px-1" style={{ color: 'var(--text-muted)' }}>Questions</p>
              {messages.filter(m => m.role === 'user').length === 0 && !streaming && (
                <div className="py-4">
                  <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>Ask a question to get started</p>
                  <div className="space-y-1.5">
                    {['Tell me about yourself', 'Describe a conflict at work', 'Why should we hire you?', 'Your biggest weakness?'].map(s => (
                      <button key={s} onClick={() => ask(s)} className="w-full text-left px-3 py-2 rounded-lg text-[11px] transition-all" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.borderColor = 'var(--cam-primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; }}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.filter(m => m.role === 'user').map((msg, i) => (
                <div key={i} className="px-3 py-2 rounded-lg text-[11px] font-medium" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <p>{msg.text}</p>
                  <span className="text-[8px] mt-1 block" style={{ color: 'var(--text-muted)' }}>{msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Right: answers */}
          <div ref={scrollRef} className="flex-1 overflow-auto p-4">
            {messages.filter(m => m.role === 'ai').length === 0 && !streaming ? (
              <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                <p className="text-xs">Answers will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.filter(m => m.role === 'ai').map((msg, i) => (
                  <div key={i} className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <SonaAvatar size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--cam-primary-dk)' }}>Sona</span>
                    </div>
                    {/* Multi-column flow so a long answer fans left→right instead of
                        forcing 2–3 viewports of vertical scroll during a live interview. */}
                    <div className="answer-flow gap-x-8 columns-1 lg:columns-2 2xl:columns-3 [&>div]:contents [&>div>div]:contents">
                      <AnswerView text={msg.text} />
                    </div>
                  </div>
                ))}
                {streaming && (
                  <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <SonaAvatar size={18} active />
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--cam-primary-dk)' }}>Sona is answering…</span>
                    </div>
                    {streamText ? (
                      <div className="answer-flow gap-x-8 columns-1 lg:columns-2 2xl:columns-3 [&>div]:contents [&>div>div]:contents">
                        <AnswerView text={cleanTags(streamText)} streaming />
                        <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm" style={{ background: 'var(--cam-primary)' }} />
                      </div>
                    ) : (
                      <span className="animate-pulse text-xs" style={{ color: 'var(--text-muted)' }}>Thinking...</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-3">
          {messages.length === 0 && !streaming ? (
            <div className="flex flex-col items-center justify-center h-full py-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1" className="mb-4 opacity-40">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <p className="text-[9px] mb-3 text-center" style={{ color: C.muted }}>
                {answerMode === 'short' ? 'Short mode — concise bullet points' : 'Detailed mode — comprehensive explanations'}
              </p>
              <div className="grid grid-cols-2 gap-1.5 w-full">
                {['Design a URL shortener', 'Explain TCP vs UDP', 'Tell me about a conflict', 'Detect cycle in linked list'].map(s => (
                  <button key={s} onClick={() => ask(s)} className="text-left px-2.5 py-2 rounded-lg transition-all"
                    style={{ border: '1px solid var(--border)', fontSize: '10px', color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg, i) => msg.role === 'user' ? (
                <div key={i} className="flex flex-col items-end">
                  <div className="rounded-xl px-2.5 py-1.5 max-w-[90%]" style={{ background: C.accentBg }}>
                    <p style={{ fontSize: '10px', color: C.text }}>{msg.text}</p>
                  </div>
                </div>
              ) : (
                <div key={i} className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <SonaAvatar size={14} />
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.accent }}>Sona</span>
                  </div>
                  <div className="min-w-0"><AnswerView text={msg.text} /></div>
                </div>
              ))}
              {streaming && (
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <SonaAvatar size={14} active />
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.accent }}>Sona</span>
                  </div>
                  <div>
                    {streamText ? <><AnswerView text={cleanTags(streamText)} streaming /><span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm" style={{ background: C.accent }} /></>
                      : <span className="animate-pulse" style={{ fontSize: '10px', color: C.muted }}>Thinking...</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-2 shrink-0 flex flex-col items-center gap-2">
        {/* Mic + AUTO toggle — click AUTO before the interview to keep Sona
            listening continuously (auto-restarts, persists across reloads). */}
        <div className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <AudioCapture onTranscription={handleAutoTranscription} />
        </div>
        {/* Prominent centered one-shot mic — kept for explicit single-question capture */}
        <MicButtonLarge onResult={(text) => ask(text)} disabled={streaming} />
        {/* Text input row */}
        <div className="flex items-center gap-1.5 px-2 h-9 rounded-xl w-full" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) handleSubmit(); }}
            placeholder={answerMode === 'short' ? 'Type a question...' : 'Type a question...'}
            className="flex-1 bg-transparent focus:outline-none min-w-0 placeholder:opacity-40"
            style={{ fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)', fontSize: '10px' }} disabled={streaming} />
          {input.trim() && !streaming && (
            <button onClick={handleSubmit} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--cam-primary)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AICompanionToggle({ onClick, hasActivity }: { onClick: () => void; hasActivity: boolean }) {
  return (
    <button onClick={onClick} className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105" style={{ background: 'var(--cam-primary)' }} title="Assistant">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
      {hasActivity && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--accent)] border-2" style={{ borderColor: C.base }} />}
    </button>
  );
}
