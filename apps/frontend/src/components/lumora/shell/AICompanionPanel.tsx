import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { streamResponse } from '@/lib/sse-client';
import { getActiveAssistant, buildSystemContext, type LumoraStory } from '@/lib/lumora-assistant';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import { VoiceEnrollment } from '@/components/lumora/audio/VoiceEnrollment';
import { dialogConfirm } from '@/components/shared/Dialog';
import { extractAnswer, cleanTags } from './companion/text-formatting';
import { AnswerView, StoryBankPanel, getArchetype } from './companion/answer-view';
import { useInterviewStore } from '@/stores/interview-store';

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

  // Pull the global Lumora history store. Behavioral Q&A pairs are
  // pushed here so they show up in /lumora/sessions alongside Coding
  // and Design entries — without this, the Sessions tab only saw the
  // InterviewPage history and Behavioral chats vanished on tab close.
  const addHistoryEntry = useInterviewStore(s => s.addHistoryEntry);

  // Voice-filter state — surfaces directly in the input area so users can
  // tell whether their own voice is being transcribed. Behavioral has no
  // LumoraTopBar (only coding/design tabs do), so this is the ONLY place
  // the user can see/toggle the filter from inside this view.
  const voiceEnrolled = useInterviewStore(s => s.voiceEnrolled);
  const voiceFilterEnabled = useInterviewStore(s => s.voiceFilterEnabled);

  // Persist Behavioral messages per-assistant in sessionStorage so refresh doesn't
  // wipe an in-progress interview. Cleared when the user explicitly clears chat.
  // MUST come after activeAssistant — `const` has TDZ, minified references crash
  // at runtime with 'Cannot access … before initialization' if this block runs first.
  const storageKey = useMemo(() => activeAssistant?.id ? `lumora_behavioral_${activeAssistant.id}` : 'lumora_behavioral_default', [activeAssistant?.id]);
  const [messages, setMessages] = useState<CopilotMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as Array<{ role: 'user' | 'ai'; text: unknown; time: string }>;
      // Filter persisted bad entries (e.g. "[object Object]" or non-string
      // text from earlier buggy versions) so they don't keep haunting the
      // QUESTIONS panel across sessions.
      return parsed
        .filter((m) =>
          (m.role === 'user' || m.role === 'ai') &&
          typeof m.text === 'string' &&
          m.text.trim().length > 0 &&
          m.text !== '[object Object]' &&
          !m.text.startsWith('[object '),
        )
        .map((m) => ({ role: m.role, text: m.text as string, time: new Date(m.time) }));
    } catch { return []; }
  });

  // Persist on every messages change
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(messages.map(m => ({ ...m, time: m.time.toISOString() })))); } catch { /* quota */ }
  }, [messages, storageKey]);

  // Delete a Sona card AND the user question that prompted it. Q&A
  // turns alternate (user, ai, user, ai, ...) so the matching question
  // is the last `role: 'user'` message before the AI message at index
  // `aiIdx`. We splice both out atomically so the QUESTIONS rail and
  // the answers rail stay in sync.
  const deleteQAPair = useCallback(async (aiIdx: number) => {
    const ok = await dialogConfirm({
      title: 'Delete this Q&A?',
      message: 'Removes both the question (left rail) and Sona\'s answer.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setMessages(prev => {
      if (aiIdx < 0 || aiIdx >= prev.length || prev[aiIdx].role !== 'ai') return prev;
      let userIdx = -1;
      for (let i = aiIdx - 1; i >= 0; i--) {
        if (prev[i].role === 'user') { userIdx = i; break; }
      }
      const next = prev.filter((_, i) => i !== aiIdx && i !== userIdx);
      return next;
    });
  }, []);

  // Export the full Q&A transcript as a Markdown file so the user can
  // archive it after the interview, paste into Notion/Obsidian, or
  // convert to PDF locally. Markdown is the lowest-common-denominator
  // format that round-trips into every doc tool. PDF/DOCX export needs
  // a backend renderer (Puppeteer/Pandoc) which is a separate task.
  const exportSession = useCallback(() => {
    if (messages.length === 0) return;
    const role = activeAssistant?.role || activeAssistant?.company || 'Behavioral';
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const lines: string[] = [`# Lumora — ${role} session`, `> ${stamp}`, ''];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.role === 'user') {
        lines.push(`## Q: ${m.text}`, '');
      } else {
        lines.push('### Sona:', '', cleanTags(m.text), '', '---', '');
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumora-${role.toLowerCase().replace(/\s+/g, '-')}-${stamp.replace(/[: ]/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages, activeAssistant]);

  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [input, setInput] = useState('');
  const [minimized, setMinimized] = useState(true);
  const [maximized, setMaximized] = useState(false);
  // Cap initial size to the actual viewport so the floating copilot
  // doesn't ship off the edge on small windows. 400×560 is the desktop
  // default; on phones the panel claims most of the width with a 24px
  // gutter and stays within the visible vertical area.
  //
  // Size + position persist via localStorage so the panel keeps the
  // exact dimensions the user picked across reloads — interview-day
  // setup is one-and-done.
  const PANEL_PREFS_KEY = 'lumora_sona_panel_v1';
  const loadPanelPrefs = () => {
    try {
      const raw = localStorage.getItem(PANEL_PREFS_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (typeof p?.w !== 'number' || typeof p?.h !== 'number') return null;
      return p as { w: number; h: number; x: number; y: number };
    } catch { return null; }
  };
  const savedPrefs = typeof window === 'undefined' ? null : loadPanelPrefs();
  const [panelWidth, setPanelWidth] = useState(() => {
    if (savedPrefs?.w && typeof window !== 'undefined') {
      return Math.min(savedPrefs.w, window.innerWidth - 16);
    }
    return typeof window === 'undefined' ? 400 : Math.min(400, Math.max(280, window.innerWidth - 48));
  });
  const [panelHeight, setPanelHeight] = useState(() => {
    if (savedPrefs?.h && typeof window !== 'undefined') {
      return Math.min(savedPrefs.h, window.innerHeight - 16);
    }
    return typeof window === 'undefined' ? 560 : Math.min(560, Math.max(360, window.innerHeight - 96));
  });
  const [isResizing, setIsResizing] = useState<false | 'w' | 'h' | 'wh' | 'e' | 's' | 'es'>(false);
  const [answerMode, setAnswerMode] = useState<AnswerMode>('short');
  const [position, setPosition] = useState(() => savedPrefs ? { x: savedPrefs.x, y: savedPrefs.y } : { x: 0, y: 0 });

  // Debounced write-through of size + position
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(PANEL_PREFS_KEY, JSON.stringify({
          w: panelWidth,
          h: panelHeight,
          x: position.x,
          y: position.y,
        }));
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [panelWidth, panelHeight, position.x, position.y]);
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

  // Resize handlers — edges and corners. The panel is anchored to the
  // bottom-right; left/top handles grow it INWARD (dragging away from
  // the anchor), right/bottom handles grow it OUTWARD. Max width/height
  // clamp to viewport so the user can fill the screen on big monitors
  // (was capped at 800×900 — too small for 4K + ultrawide setups).
  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const r = resizeRef.current;
      const maxW = typeof window !== 'undefined' ? window.innerWidth - 16 : 1600;
      const maxH = typeof window !== 'undefined' ? window.innerHeight - 16 : 1200;

      // Width — left handles use (startX - e.clientX), right handles use (e.clientX - startX)
      if (r.mode === 'w' || r.mode === 'wh') {
        const dX = r.startX - e.clientX;
        setPanelWidth(Math.min(Math.max(300, r.startW + dX), maxW));
      } else if (r.mode === 'e' || r.mode === 'es') {
        const dX = e.clientX - r.startX;
        setPanelWidth(Math.min(Math.max(300, r.startW + dX), maxW));
      }
      // Height — top handles use (startY - e.clientY), bottom handles use (e.clientY - startY)
      if (r.mode === 'h' || r.mode === 'wh') {
        const dY = r.startY - e.clientY;
        setPanelHeight(Math.min(Math.max(300, r.startH + dY), maxH));
      } else if (r.mode === 's' || r.mode === 'es') {
        const dY = e.clientY - r.startY;
        setPanelHeight(Math.min(Math.max(300, r.startH + dY), maxH));
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
    // Defensive: an upstream caller occasionally hands us a non-string
    // (event object, transcription envelope, etc.). Coercing to "" lets
    // it through as `[object Object]` which then renders in the
    // QUESTIONS panel and wastes an LLM call.
    if (typeof question !== 'string') {
      console.warn('[Sona] ask() received non-string question, dropping:', question);
      return;
    }
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
          // Persist this Q&A to the Lumora session history so it shows
          // up in /lumora/sessions with timestamp + view button. Backend
          // already saves to lumora_conversations + lumora_messages on
          // every /api/v1/stream POST — we capture conversation_id and
          // message_id here so a future "open this session" can replay
          // the durable record from the DB rather than relying solely
          // on the local Zustand cache.
          try {
            addHistoryEntry({
              question: trimmed,
              blocks: Array.isArray(data?.parsed) ? data.parsed : [],
              timestamp: new Date(),
              messageId: data?.message_id,
              conversationId: data?.conversation_id,
            });
          } catch (e) {
            console.warn('[Sona] addHistoryEntry failed', e);
          }
        },
        onError: (data: any) => {
          // Backend SSE error frames vary in field name (msg/message/detail/error).
          // Earlier code read only `data.message` so every error rendered as the
          // useless "Something went wrong" — the real reason was being thrown
          // away. Log the full envelope so we can see what came back.
          console.error('[Sona] stream error frame:', data);
          const msg = data?.msg || data?.message || data?.detail || data?.error
            || (typeof data === 'string' ? data : null)
            || 'Something went wrong';
          setMessages(prev => [...prev, { role: 'ai', text: `Error: ${msg}`, time: new Date() }]);
          setStreamText('');
          setStreaming(false);
        },
      });
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Connection failed. Try again.', time: new Date() }]);
      setStreamText('');
      setStreaming(false);
    }
  }, [token, streaming, answerMode, systemContext, addHistoryEntry]);

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
    // Type-guard: AudioCapture's onTranscription is typed as (string)
    // but the runtime contract has been violated in the past (the
    // QUESTIONS panel was showing `[object Object]`). Drop anything
    // that isn't a non-empty string.
    if (typeof text !== 'string' || !text.trim()) {
      console.warn('[Sona] handleAutoTranscription received non-string:', text);
      return;
    }
    askRef.current?.(text);
  }, []);

  // Embedded mode = render inline, skip minimized/floating
  useEffect(() => {
    if (embedded) setMinimized(false);
  }, [embedded]);

  // Mobile drawer for the Questions / Story Bank rail. The 280px sidebar
  // is hidden on screens <md and accessible via a hamburger in the header.
  // Auto-closes when a question is tapped from the drawer so the user
  // returns to the answer view immediately.
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  useEffect(() => { if (!embedded) setMobileRailOpen(false); }, [embedded]);

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
      {/* Resize handles — all four edges + all four corners. Mac-window-
          style: drag any edge to grow in that direction, drag a corner
          for diagonal resize. */}
      {!maximized && (
        <>
          {/* Edges */}
          <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10" onMouseDown={(e) => { setIsResizing('w'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, mode: 'w' }; }} />
          <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10" onMouseDown={(e) => { setIsResizing('e'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, mode: 'e' }; }} />
          <div className="absolute left-0 top-0 right-0 h-2 cursor-ns-resize z-10" onMouseDown={(e) => { setIsResizing('h'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, mode: 'h' }; }} />
          <div className="absolute left-0 bottom-0 right-0 h-2 cursor-ns-resize z-10" onMouseDown={(e) => { setIsResizing('s'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, mode: 's' }; }} />
          {/* Corners */}
          <div className="absolute left-0 top-0 w-4 h-4 cursor-nwse-resize z-20" onMouseDown={(e) => { setIsResizing('wh'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, mode: 'wh' }; }} />
          <div className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize z-20" onMouseDown={(e) => { setIsResizing('es'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, mode: 'es' }; }} />
        </>
      )}

      {/* Header — LeetCode treatment: navy --cam-hero-strip background
          with a 2px gold-leaf underline. Matches StreamingCodingCard
          headers used elsewhere in Lumora so the panel reads as a
          first-class tool window, not flat chrome. Children below are
          re-themed for white-on-navy contrast. */}
      <div
        className={`flex items-center gap-2 h-10 px-3 shrink-0 ${embedded ? '' : 'cursor-move'} select-none`}
        style={{
          background: 'var(--cam-hero-strip)',
          borderBottom: '2px solid var(--cam-gold-leaf)',
          borderRadius: embedded || maximized ? 0 : '16px 16px 0 0',
        }}
        onMouseDown={embedded ? undefined : startDrag}
      >
        {/* Left: export + clear + close (embedded) or clear + new (floating) */}
        <div className="flex items-center gap-0.5">
          {/* Mobile-only: toggle the Questions/Story Bank drawer. The
              280px rail is hidden <md so the answer card gets the full
              viewport width — a phone-sized side rail truncates both
              the question text and the answer to the point of being
              unusable. This button surfaces the rail as a slide-over. */}
          {embedded && (
            <button
              onClick={() => setMobileRailOpen(v => !v)}
              className="md:hidden p-2 rounded-md transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.9)' }}
              title="Questions"
              aria-label="Open questions panel"
              aria-expanded={mobileRailOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            </button>
          )}
          {/* Session export — Markdown for now (works in every editor +
              converts cleanly to PDF/DOCX via Pandoc or any browser
              "Save as PDF"). A native PDF/DOCX renderer needs a backend
              hop and is tracked separately. */}
          <button
            onClick={exportSession}
            disabled={messages.length === 0}
            className="p-1 rounded-md transition-colors hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: 'rgba(255,255,255,0.85)' }}
            title="Export session (.md)"
            aria-label="Export session as Markdown"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          </button>
          <button onClick={async () => { if (messages.length === 0) return; const ok = await dialogConfirm({ title: 'Clear chat history?', message: 'This will clear the Sona chat in this panel only.', confirmLabel: 'Clear', tone: 'danger' }); if (ok) setMessages([]); }}
            className="p-1 rounded-md transition-colors hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.85)' }} title="Clear history">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
          </button>
          {embedded ? (
            <button onClick={onClose} className="p-1 rounded-md transition-colors hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.85)' }} title="Close">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          ) : (
            <button onClick={() => setMessages([])} className="p-1 rounded-md transition-colors hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.85)' }} title="New chat">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
          )}
        </div>

        {/* Center: title + mode toggle. Title white-on-navy, company
            chip in gold-leaf, SHORT/DETAILED tabs use the same gold
            highlight as the StreamingCodingCard pattern so the active
            mode is unmistakable on a navy strip. */}
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <SonaAvatar size={18} />
          <span className="text-[11px] font-bold tracking-wide text-white">Sona</span>
          {activeAssistant && (
            <span
              className="hidden sm:inline text-[8px] font-semibold px-1.5 py-0.5 rounded truncate max-w-[120px]"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'var(--cam-gold-leaf-lt)' }}
            >
              {activeAssistant.company || activeAssistant.role || 'Custom'}
            </span>
          )}
          <div
            className="flex items-center rounded-md p-0.5"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
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
                  color: answerMode === mode ? 'var(--cam-primary-dk)' : 'rgba(255,255,255,0.8)',
                  background: answerMode === mode ? 'var(--cam-gold-leaf)' : 'transparent',
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
              className="p-1 rounded-md transition-colors hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.85)' }} title="Minimize">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12h16" /></svg>
            </button>
            <button onClick={() => { setMaximized(!maximized); setPosition({ x: 0, y: 0 }); }}
              className="p-1 rounded-md transition-colors hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.85)' }} title={maximized ? 'Restore' : 'Maximize'}>
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
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Mobile scrim — taps anywhere outside the drawer to close it. */}
          {mobileRailOpen && (
            <div
              className="md:hidden absolute inset-0 z-30"
              style={{ background: 'rgba(0,0,0,0.4)' }}
              onClick={() => setMobileRailOpen(false)}
              aria-hidden="true"
            />
          )}
          {/* Left: stories + questions. Subtle bg-elevated tint so it
              reads as chrome/navigation; the main reading area stays on
              bg-surface (white) so answer cards have somewhere to lift
              off from.

              Mobile: rendered as a slide-over drawer (≤md) keyed off
              mobileRailOpen; on md+ it stays a fixed 280px column. */}
          <div
            className={`shrink-0 overflow-auto border-r transition-transform md:translate-x-0
              ${mobileRailOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
              md:relative md:w-[280px] md:max-w-none
              absolute md:static inset-y-0 left-0 z-40 w-[82vw] max-w-[320px]`}
            style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)', boxShadow: mobileRailOpen ? '0 10px 30px rgba(0,0,0,0.25)' : undefined }}
          >
            {/* Mobile-only header inside the drawer with a close button so
                touch users have an obvious dismiss. The scrim handles taps
                outside, but a visible X is the discoverable affordance. */}
            <div className="md:hidden flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--cam-primary-dk)' }}>Menu</span>
              <button
                onClick={() => setMobileRailOpen(false)}
                className="p-2 rounded-md"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close menu"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
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
                      <button key={s} onClick={() => { ask(s); setMobileRailOpen(false); }} className="w-full text-left px-3 py-2.5 md:py-2 rounded-lg text-[13px] md:text-[11px] transition-all" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.borderColor = 'var(--cam-primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; }}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {/* Iterate the full messages array (not a filtered copy) so
                  each user message keeps its ORIGINAL index — the delete
                  button needs that index to find and remove the matching
                  AI answer. */}
              {messages.map((msg, origIdx) => msg.role !== 'user' ? null : (
                <div
                  key={origIdx}
                  className="group px-3 py-2.5 md:py-2 rounded-lg text-[13px] md:text-[11px] font-medium flex items-start gap-2"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="break-words">
                      {/* Defensive: if a buggy version persisted a non-string,
                          show a placeholder instead of the literal
                          "[object Object]" so the rail still reads cleanly
                          before the user clears history. */}
                      {typeof msg.text === 'string' && msg.text.trim() ? msg.text : '(empty question — deleted via clear)'}
                    </p>
                    <span className="text-[8px] mt-1 block" style={{ color: 'var(--text-muted)' }}>{msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <button
                    onClick={async () => {
                      const ok = await dialogConfirm({
                        title: 'Delete this Q&A?',
                        message: 'Removes both the question and Sona\'s answer.',
                        confirmLabel: 'Delete',
                        tone: 'danger',
                      });
                      if (!ok) return;
                      // Find the AI message immediately following this user
                      // message and drop both. Walking forward (rather than
                      // assuming origIdx + 1) handles cases where the AI
                      // message hasn't arrived yet (delete the question
                      // alone) or a network error inserted an error reply.
                      setMessages(prev => {
                        if (origIdx < 0 || origIdx >= prev.length || prev[origIdx].role !== 'user') return prev;
                        let aiIdx = -1;
                        for (let j = origIdx + 1; j < prev.length; j++) {
                          if (prev[j].role === 'ai') { aiIdx = j; break; }
                          if (prev[j].role === 'user') break; // next question started, no answer arrived
                        }
                        return prev.filter((_, k) => k !== origIdx && k !== aiIdx);
                      });
                    }}
                    className="shrink-0 p-1 rounded-md transition-colors"
                    style={{ color: 'var(--text-muted)', border: '1px solid transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger, #DC2626)'; e.currentTarget.style.borderColor = 'var(--danger, #DC2626)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'transparent'; }}
                    title="Delete this Q&A"
                    aria-label="Delete this Q&A"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
          {/* Right: answers. Cards are width-capped at 880px (≈80-char
              line length, the typographic sweet spot for sustained
              reading) and centered in the available space. Without the
              cap, dense bullet lists stretched the full panel width
              (~1700px on a 16:10 monitor) and the eye couldn't track
              from line to line — that was the actual readability
              failure, not a color choice. */}
          <div ref={scrollRef} className="flex-1 overflow-auto p-3 sm:p-4 md:p-5 min-w-0">
            {messages.filter(m => m.role === 'ai').length === 0 && !streaming ? (
              <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                <p className="text-sm md:text-xs px-4 text-center">Tap the menu to pick a starter question, or use the mic below.</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 mx-auto w-full" style={{ maxWidth: 880 }}>
                {messages.map((msg, i) => msg.role !== 'ai' ? null : (
                  <div
                    key={i}
                    className="rounded-lg overflow-hidden group"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.10)',
                    }}
                  >
                    {/* LeetCode header strip — navy gradient + gold-leaf
                        underline + white uppercase title. Same pattern as
                        StreamingCodingCard so every Lumora card reads as
                        a tool window with consistent chrome. */}
                    <div
                      className="flex items-center gap-2 px-4 py-2"
                      style={{
                        background: 'var(--cam-hero-strip)',
                        borderBottom: '2px solid var(--cam-gold-leaf)',
                      }}
                    >
                      <SonaAvatar size={16} />
                      <span className="font-display text-[11px] font-bold tracking-[0.12em] uppercase text-white">Sona</span>
                      <span className="ml-auto flex items-center gap-1">
                        {/* Delete is always visible (not hover-only) per
                            project rule on visible destructive actions. */}
                        <button
                          onClick={() => deleteQAPair(i)}
                          className="p-1 rounded-md transition-colors"
                          style={{ color: 'rgba(255,255,255,0.8)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.background = 'transparent'; }}
                          title="Delete this Q&A"
                          aria-label="Delete this Q&A"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                        </button>
                      </span>
                    </div>
                    <div className="p-4 sm:p-5 answer-flow">
                      <AnswerView text={msg.text} />
                    </div>
                  </div>
                ))}
                {streaming && (
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.10)',
                    }}
                  >
                    <div
                      className="flex items-center gap-2 px-4 py-2"
                      style={{
                        background: 'var(--cam-hero-strip)',
                        borderBottom: '2px solid var(--cam-gold-leaf)',
                      }}
                    >
                      <SonaAvatar size={16} active />
                      <span className="font-display text-[11px] font-bold tracking-[0.12em] uppercase text-white">
                        Sona is answering…
                      </span>
                    </div>
                    <div className="p-4 sm:p-5">
                      {streamText ? (
                        <div className="answer-flow">
                          <AnswerView text={cleanTags(streamText)} streaming />
                          <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm" style={{ background: 'var(--cam-gold-leaf)' }} />
                        </div>
                      ) : (
                        <span className="animate-pulse text-xs" style={{ color: 'var(--text-muted)' }}>Thinking...</span>
                      )}
                    </div>
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
                <div
                  key={i}
                  className="rounded-lg overflow-hidden"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 20px -12px rgba(15,23,42,0.10)',
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5"
                    style={{
                      background: 'var(--cam-hero-strip)',
                      borderBottom: '2px solid var(--cam-gold-leaf)',
                    }}
                  >
                    <SonaAvatar size={14} />
                    <span className="font-display text-[9px] font-bold tracking-[0.12em] uppercase text-white">Sona</span>
                  </div>
                  <div className="p-3 min-w-0"><AnswerView text={msg.text} /></div>
                </div>
              ))}
              {streaming && (
                <div
                  className="rounded-lg overflow-hidden"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 20px -12px rgba(15,23,42,0.10)',
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5"
                    style={{
                      background: 'var(--cam-hero-strip)',
                      borderBottom: '2px solid var(--cam-gold-leaf)',
                    }}
                  >
                    <SonaAvatar size={14} active />
                    <span className="font-display text-[9px] font-bold tracking-[0.12em] uppercase text-white">Sona is answering…</span>
                  </div>
                  <div className="p-3">
                    {streamText ? <><AnswerView text={cleanTags(streamText)} streaming /><span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm" style={{ background: 'var(--cam-gold-leaf)' }} /></>
                      : <span className="animate-pulse" style={{ fontSize: '10px', color: C.muted }}>Thinking...</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Input — on mobile (when embedded) the LumoraShell bottom nav
          (fixed, 56px + safe-area-inset-bottom) sits over the bottom of
          the panel. Without bottom padding the mic + send row hides
          behind it. The wrapper class ladders padding by breakpoint;
          the inline style replicates it so safe-area is included on
          mobile-Safari notch devices. */}
      <div className="px-3 pt-2 shrink-0 flex flex-col items-center gap-2 lumora-companion-input-row"
        data-embedded={embedded ? 'true' : 'false'}
      >
        {/* Voice-filter banner — Behavioral has no LumoraTopBar, so the
            voice-filter status was invisible here and Sona was answering
            the candidate's own voice. This row makes the state explicit:
              · Not enrolled  → red warning + Enroll My Voice
              · Enrolled, off → amber warning + Filter Off toggle
              · Enrolled, on  → quiet green confirmation
            The VoiceEnrollment component handles enroll / toggle / unenroll. */}
        {embedded && (
          <div className="w-full flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: voiceFilterEnabled && voiceEnrolled ? 'rgba(16,185,129,0.08)' : !voiceEnrolled ? 'rgba(220,38,38,0.08)' : 'rgba(245,158,11,0.10)',
              border: `1px solid ${voiceFilterEnabled && voiceEnrolled ? 'rgba(16,185,129,0.35)' : !voiceEnrolled ? 'rgba(220,38,38,0.35)' : 'rgba(245,158,11,0.40)'}`,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={voiceFilterEnabled && voiceEnrolled ? '#10b981' : !voiceEnrolled ? '#dc2626' : '#d97706'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] md:text-[11px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {!voiceEnrolled ? 'Enroll your voice to filter it out' :
                 !voiceFilterEnabled ? 'Your voice is being transcribed' :
                 'Filter on — only the interviewer is heard'}
              </p>
              <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                {!voiceEnrolled ? 'Sona will answer YOUR voice until you enroll.' :
                 !voiceFilterEnabled ? 'Turn Filter On so Sona only answers the interviewer.' :
                 'Sona ignores you and replies only to the interviewer.'}
              </p>
            </div>
            <VoiceEnrollment disabled={false} variant="light" />
          </div>
        )}
        {/* Mic + AUTO toggle — single source of truth for capture.
            Click AUTO before the interview to keep Sona listening
            continuously (auto-restarts, persists across reloads).
            The previous MicButtonLarge was removed: it ran its own
            independent getUserMedia stream, which competed with this
            one for the same physical mic and produced two visible
            mic controls that confused users. The mic button inside
            UnifiedMicButton is the one-shot capture; AUTO is the
            continuous toggle. */}
        <div className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <AudioCapture onTranscription={handleAutoTranscription} />
        </div>
        {/* Text input row — taller + larger text on mobile so the iOS
            keyboard shows up at a comfortable size and the placeholder
            doesn't trigger Safari's text-zoom (it kicks in below 16px). */}
        <div className="flex items-center gap-2 px-3 h-12 md:h-9 rounded-xl w-full" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) handleSubmit(); }}
            placeholder="Type a question..."
            className="flex-1 bg-transparent focus:outline-none min-w-0 placeholder:opacity-40 text-[16px] md:text-[10px]"
            style={{ fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)' }} disabled={streaming} />
          {input.trim() && !streaming && (
            <button onClick={handleSubmit} className="w-9 h-9 md:w-6 md:h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--cam-primary)' }} aria-label="Send question">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-4 h-4 md:w-3 md:h-3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
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
