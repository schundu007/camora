/* ── CodingSonaSidebar ───────────────────────────────────────────────────
   Right-side collapsible panel that gives Coding and Design tabs a
   dedicated Sona chat for follow-up Q&A grounded in the solution
   currently on screen. Completely self-contained:

     · Owns its own message history (per-surface, in localStorage so
       the user can refresh without losing context).
     · Builds its own systemContext on every send — resume + JD via
       the shared assistant helper, then appends the
       liveSolveContext block so Sona reasons about the actual code
       / design that's visible.
     · Calls streamResponse → /api/v1/inference/stream directly. No
       shared store mutation, no voiceRoute, no sonaRegistry — none
       of the global state machinery that caused earlier issues.

   Voice is intentionally NOT wired in v1: the bottom-bar mic stays
   focused on the problem field. Typing-only here. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { streamResponse } from '@/lib/sse-client';
import { getSystemContext } from '@/lib/lumora-assistant';
import { sonaSidebarStoreFor } from '@/lib/userScopedStorage';
import { useSessionStore } from '@/stores/session-store';
import { extractAnswer, cleanTags } from './companion/text-formatting';
import { AnswerView } from './companion/answer-view';
import { Citations } from '@/components/lumora/Citations';
import { SonaMicButton } from './SonaMicButton';

const HANDS_FREE_KEY = 'lumora:sonaHandsFree';
import { Icon } from '@/components/shared/Icons';
import { dialogConfirm } from '@/components/shared/Dialog';
import Chip from '@/components/shared/ui/Chip';
import type { Citation } from '@/types';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  time: number;
  fromCache?: boolean;
  citations?: Citation[];
}

interface CodingSonaSidebarProps {
  surface: 'coding' | 'design';
  open: boolean;
  onClose: () => void;
}

// Per-user, per-surface store (sonaSidebarStoreFor) — chat history is scoped
// to the logged-in user so a shared browser can't expose one account's Sona
// follow-ups to another. Legacy global `lumora_sona_sidebar_<surface>` keys
// migrate in on first read and are cleared on logout.
const loadHistory = (surface: string): ChatMessage[]  => {
  const parsed = sonaSidebarStoreFor(surface).read();
  if (!Array.isArray(parsed)) return [];
  return parsed.slice(-50); // cap history to keep storage small
}

const saveHistory = (surface: string, msgs: ChatMessage[]) => {
  sonaSidebarStoreFor(surface).write(msgs.slice(-50));
}

export const CodingSonaSidebar = ({ surface, open, onClose }: CodingSonaSidebarProps) => {
  const { token } = useAuth();
  const liveSolveContext = useSessionStore(s => s.liveSolveContext);

  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory(surface));
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [micToggleTrigger, setMicToggleTrigger] = useState(0);
  // Hands-free: the mic arms itself, stops on silence, sends, and re-arms. Off
  // by default and remembered — an always-open mic is a choice about the room
  // you are in, not something to switch on for someone.
  const [handsFree, setHandsFree] = useState(() => {
    try { return localStorage.getItem(HANDS_FREE_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(HANDS_FREE_KEY, handsFree ? '1' : '0'); } catch {}
  }, [handsFree]);
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Citations accumulator for the in-flight stream.
  const pendingCitationsRef = useRef<Citation[]>([]);
  // Track the previous context identity to detect problem changes.
  const prevContextKeyRef = useRef<string | null>(null);

  // Reset messages when a new problem is solved or the problem is cleared.
  // liveSolveContext is set to null at the start of each generate, then to
  // the new problem+solution when it completes. Either transition means the
  // user moved to a different problem and Sona should start fresh.
  useEffect(() => {
    const key = liveSolveContext
      ? `${liveSolveContext.surface}:${liveSolveContext.solvedAt}`
      : null;
    if (key !== prevContextKeyRef.current) {
      prevContextKeyRef.current = key;
      if (messages.length > 0) {
        abortRef.current?.abort();
        setMessages([]);
        setStreamText('');
        setError(null);
        sonaSidebarStoreFor(surface).clear();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveSolveContext]);

  // Auto-scroll to bottom on new messages / streaming tokens
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamText]);

  // Persist history to localStorage on every change
  useEffect(() => { saveHistory(surface, messages); }, [surface, messages]);

  // Mirror of `messages` for send(). send is a useCallback that must not
  // re-create on every token, so it reads the transcript through a ref rather
  // than closing over state that would be stale by the time it runs.
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Focus input when the sidebar opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  // Cleanup any in-flight stream on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  // Build the system context for THIS request. Includes the active
  // solve when present so Sona answers ground in the on-screen code.
  const buildContext = useCallback((): string => {
    const base = getSystemContext() || '';
    if (!liveSolveContext) return base;
    const ctx = liveSolveContext;
    const lang = ctx.language || 'python';
    const codeBlock = ctx.surface === 'design'
      ? `DESIGN OUTLINE:\n${ctx.code}`
      : `CODE (${lang}):\n\`\`\`${lang}\n${ctx.code}\n\`\`\``;
    const block = [
      '',
      '##############################################################################',
      `# CURRENT ${ctx.surface.toUpperCase()} SESSION (live, on-screen right now)`,
      '##############################################################################',
      'The candidate just solved this on the sibling tab and is asking a follow-up.',
      'Treat the next message as a follow-up to THIS specific solution unless they',
      'clearly switch topics.',
      '',
      'PROBLEM:',
      ctx.problem,
      '',
      ctx.approach ? `APPROACH:\n${ctx.approach}` : '',
      ctx.complexity ? `COMPLEXITY: ${ctx.complexity}` : '',
      '',
      codeBlock,
      '',
    ].filter(Boolean).join('\n');
    return base + block;
  }, [liveSolveContext]);

  const send = useCallback(async (raw: string) => {
    const question = raw.trim();
    if (!question || !token || streaming) return;
    setError(null);
    setMessages(prev => [...prev, { role: 'user', text: question, time: Date.now() }]);
    setStreaming(true);
    setStreamText('');
    setInput('');
    pendingCitationsRef.current = [];

    const controller = new AbortController();
    abortRef.current = controller;
    // Snapshot the question so a stream failure can restore it to the
    // textarea for one-tap retry instead of forcing the user to retype.
    const originalQuestion = question;

    try {
      await streamResponse({
        question,
        token,
        useSearch: false,
        systemContext: buildContext(),
        // Prior turns of this sidebar thread. The backend opens a fresh
        // conversation per request, so without this a follow-up ("can you add
        // more test cases?") arrives with no memory of what came before and
        // Sona answers as though the chat just started.
        history: messagesRef.current
          .filter(m => m.text.trim())
          .map(m => ({ role: m.role === 'ai' ? ('assistant' as const) : ('user' as const), content: m.text })),
        mode: 'coding',
        // Coding-playground context defaults design questions to the
        // application archetype (LLD / OOP). The classifier still
        // routes infra-cued questions ("design a rate limiter") to
        // 'infrastructure' regardless of this hint.
        designKind: 'application',
        signal: controller.signal,
        onCitations: (citations) => {
          pendingCitationsRef.current = citations;
        },
        onToken: (data) => { if (data.t) setStreamText(prev => prev + data.t); },
        onAnswer: (data: any) => {
          const answerText = extractAnswer(data?.parsed) || data?.raw || '';
          const citations = pendingCitationsRef.current;
          pendingCitationsRef.current = [];
          setMessages(prev => [...prev, {
            role: 'ai',
            text: cleanTags(answerText),
            time: Date.now(),
            fromCache: Boolean(data?.fromCache),
            citations: citations.length > 0 ? citations : undefined,
          }]);
          setStreamText('');
          setStreaming(false);
        },
        onError: (data: any) => {
          const msg = data?.msg || data?.message || data?.detail || data?.error || 'Stream error';
          setError(msg);
          setStreamText('');
          setStreaming(false);
          // Restore the question so the user can press Enter again
          // without retyping. The user message bubble is left in
          // place as the ledger of "this was attempted".
          setInput(originalQuestion);
        },
        onComplete: () => { setStreaming(false); },
      });
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Failed to reach Sona');
      setStreaming(false);
      setStreamText('');
      setInput(originalQuestion);
    }
  }, [token, streaming, buildContext]);

  // Listen for interviewer questions routed here by voice-router after
  // a solution is on screen. Declared AFTER `send` to avoid TDZ —
  // both useRef(send) and [send] in the dep array would reference `send`
  // before its useCallback declaration if placed earlier.
  const sendRef = useRef<typeof send | null>(null);
  useEffect(() => { sendRef.current = send; }, [send]);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text: string; autoSend?: boolean }>).detail;
      const text = detail?.text;
      if (!text) return;
      // autoSend false = speech the router would not ask on its own (no solution
      // yet, or phrasing the question heuristic rejected). Put it in the box so
      // it is visible as you speak and can be sent with Enter.
      // undefined keeps older emitters asking, as they did.
      if (detail?.autoSend === false) setInput(text);
      else sendRef.current?.(text);
    };
    window.addEventListener('lumora:coding-question', handler);
    return () => window.removeEventListener('lumora:coding-question', handler);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(input); }
  }, [input, send]);

  // Mic toggle: Cmd/Ctrl+M anywhere, or a bare ` (backquote) — the one-key
  // toggle, since reaching for the mic button mid-interview is the thing that
  // actually costs time.
  //
  // ` is a printable character, so it only toggles when it would not have
  // produced text the user wanted: from the composer it toggles ONLY while the
  // composer is empty (start typing a backtick-quoted snippet and it types
  // normally), and it is ignored entirely inside any other editable surface
  // (Monaco, the problem textarea).
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'm' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setMicToggleTrigger(n => n + 1);
        return;
      }
      if (e.code !== 'Backquote' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (el === inputRef.current) {
        if (inputRef.current?.value) return; // mid-sentence backtick — let it type
      } else if (
        el?.isContentEditable ||
        el?.tagName === 'INPUT' ||
        el?.tagName === 'TEXTAREA' ||
        el?.closest?.('.monaco-editor')
      ) {
        return;
      }
      e.preventDefault();
      setMicToggleTrigger(n => n + 1);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const clearHistory = useCallback(async () => {
    // Project memory: never window.confirm/alert/prompt. Always
    // dialogConfirm via DialogProvider. Destructive without
    // confirmation is the bug Audit P1 flagged.
    const ok = await dialogConfirm({
      title: 'Clear chat history?',
      message: 'This removes all of your follow-up Q&A with Sona on this surface. The current solve context stays loaded.',
      confirmLabel: 'Clear',
      cancelLabel: 'Keep',
      tone: 'danger',
    });
    if (!ok) return;
    abortRef.current?.abort();
    setMessages([]);
    setStreamText('');
    setStreaming(false);
    setError(null);
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    dragRef.current = { startX, startW };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startX - ev.clientX;
      setSidebarWidth(Math.max(280, Math.min(700, dragRef.current.startW + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);

  const placeholder = useMemo(() => `Ask Sona about this ${surface}…`, [surface]);

  return (
    <aside
      // Tagged so AudioCapture's global Backquote shortcut yields the key when
      // it is pressed inside this sidebar — ` drives Sona's mic here and the
      // interview mic everywhere else.
      data-sona-sidebar
      className="shrink-0 flex flex-col border-l overflow-hidden relative"
      style={{
        width: open ? sidebarWidth : 0,
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
        transition: dragRef.current ? 'none' : 'width 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        willChange: 'width',
      }}
      aria-hidden={!open}
    >
      {open && (
        <>
          {/* Drag handle — left edge, 6px wide, ew-resize cursor */}
          <div
            onMouseDown={handleDragStart}
            className="absolute left-0 top-0 h-full z-10 cursor-ew-resize"
            style={{ width: 6, background: 'transparent' }}
            data-tip="Drag to resize"
          />
          {/* Header — navy hero strip + gold underline, matches the
              app's other tool-window chrome. */}
          <div
            className="flex items-center gap-2 h-10 px-3 shrink-0 min-w-0 overflow-hidden lumora-winctl-safe"
            style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}
          >
            {/* Title must never wrap — the header is a fixed h-10, so a wrapped
                label spills over the overlay window controls sitting on top of
                it. Nowrap + truncate clips instead of overflowing. */}
            <span className="font-display text-[12px] font-bold tracking-[0.14em] uppercase whitespace-nowrap truncate shrink" style={{ color: 'var(--cam-strip-heading)' }}>
              Sona
            </span>
            {/* Scope, as an icon chip rather than a text chip — the words
                "· about your code" were the other thing wrapping. */}
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded shrink-0"
              style={{ background: 'var(--cam-strip-icon-bg)', border: '1px solid var(--cam-strip-icon-border)', color: 'var(--cam-strip-text)' }}
              data-tip={surface === 'coding' ? 'Follow-ups about your code' : 'Follow-ups about your design'}
              aria-label={surface === 'coding' ? 'Follow-ups about your code' : 'Follow-ups about your design'}
            >
              {surface === 'coding' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
              )}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              {messages.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors shrink-0"
                  style={{ color: 'var(--cam-strip-text)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cam-strip-icon-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  data-tip="Clear chat history"
                  aria-label="Clear chat history"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
                </button>
              )}
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors"
                style={{ color: 'var(--cam-strip-text)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cam-strip-icon-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                data-tip="Close sidebar"
                aria-label="Close Sona sidebar"
              >
                <Icon name="close" size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Live-context indicator — when a solve is on screen, show a
              tiny pill so the user knows Sona has the right context. */}
          {liveSolveContext && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 text-[12px]"
              style={{ background: 'var(--accent-subtle)', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cam-primary)' }} />
              <span className="font-bold uppercase tracking-wider">Live context loaded</span>
              <span className="truncate" style={{ color: 'var(--text-muted)' }}>
                · {liveSolveContext.problem.slice(0, 60)}{liveSolveContext.problem.length > 60 ? '…' : ''}
              </span>
            </div>
          )}

          {/* Chat scroll area */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && !streaming && (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" style={{ color: 'var(--text-muted)', opacity: 0.45 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p className="text-[12px] leading-relaxed" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }}>
                  {liveSolveContext
                    ? `Ask Sona anything about this ${surface} solution`
                    : `Solve a ${surface} problem first, then ask Sona follow-up questions here`}
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i}>
                {m.role === 'user' ? (
                  <div
                    className="rounded-lg px-3 py-2 ml-6 text-[12px] leading-relaxed"
                    style={{ background: 'var(--cam-primary-dk)', color: '#FFFFFF' }}
                  >
                    {m.text}
                  </div>
                ) : (
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                  >
                    <div
                      className="flex items-center gap-2 px-3 py-1.5"
                      style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}
                    >
                      <span className="font-display text-[12px] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--cam-strip-heading)' }}>Sona</span>
                      {m.fromCache && (
                        <Chip variant="gold">cached</Chip>
                      )}
                    </div>
                    <div className="p-3">
                      <AnswerView text={m.text} />
                      {m.citations && m.citations.length > 0 && (
                        <Citations citations={m.citations} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {streaming && (
              <div
                className="rounded-lg overflow-hidden"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <div
                  className="flex items-center gap-2 px-3 py-1.5"
                  style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}
                >
                  <span className="font-display text-[12px] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--cam-strip-heading)' }}>Sona is answering…</span>
                  <span className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--cam-gold-leaf-lt)' }} />
                </div>
                <div className="p-3 text-[12px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {streamText
                    ? <AnswerView text={cleanTags(streamText)} streaming />
                    : <span style={{ opacity: 0.6 }}>Sona is thinking…</span>}
                </div>
              </div>
            )}

            {error && !streaming && (
              <div
                className="rounded-lg px-3 py-2 text-[12px]"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--danger)', color: 'var(--danger)' }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Input row */}
          <div className="shrink-0 border-t p-3 flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={streaming}
              rows={2}
              className="w-full text-[12px] leading-relaxed rounded-lg px-3 py-2 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cam-primary)]/30 disabled:opacity-60"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
              }}
            />
            <div className="flex items-end gap-3 min-h-[2rem]">
              <SonaMicButton
                key={handsFree ? 'auto' : 'manual'}
                autoMode={handsFree}
                disabled={streaming}
                toggleTrigger={micToggleTrigger}
                onText={(t) => {
                  const full = input ? `${input.trimEnd()} ${t}` : t;
                  setInput(full);
                  send(full);
                }}
              />
              {/* Hands-free switch. In auto mode the mic renders as a status
                  readout with nothing to click, so the way back out has to live
                  here rather than on the mic itself. */}
              <button
                type="button"
                onClick={() => setHandsFree(v => !v)}
                aria-pressed={handsFree}
                data-tip={handsFree
                  ? 'Hands-free is on — the mic listens, sends on a pause, and re-arms. Click to go back to press-to-talk.'
                  : 'Hands-free — let the mic listen continuously and send each question on a pause.'}
                aria-label={handsFree ? 'Turn off hands-free mic' : 'Turn on hands-free mic'}
                className="flex items-center justify-center h-8 px-2 rounded-md text-[12px] font-bold uppercase tracking-wider shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cam-primary)]/30"
                style={handsFree
                  ? { background: 'var(--cam-hero-strip)', color: 'var(--cam-gold-leaf-lt)', border: '1px solid var(--cam-gold-leaf)' }
                  : { background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                Auto
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

/* Toggle button rendered by LumoraShellPage on Coding/Design tabs.
   Visually mirrors the AICompanionPanel minimized icon on Home —
   same circular FAB, same lapis+gold radial gradient, same pulsing
   halo — so Sona's affordance reads identically across every tab.
   When a solve is on screen we add a small gold "context ready"
   dot at the top-right corner. */
export const CodingSonaSidebarToggle = ({ open, onToggle, hasSolve, variant = 'fab' }: {
  open: boolean;
  onToggle: () => void;
  hasSolve: boolean;
  /* 'strip' docks Sona into the coding toolbar as a control among controls.
     The FAB floats over the bottom-right corner — which on Coding is the OUTPUT
     pane, so the one object permanently on top of the screen was covering the
     test results and the Run button. Design has no toolbar to dock into and
     keeps the FAB. */
  variant?: 'fab' | 'strip';
}) => {
  if (open) return null;

  if (variant === 'strip') {
    return (
      <button
        type="button"
        onClick={onToggle}
        data-tip={hasSolve ? 'Sona has live context — ask a follow-up about your solution' : 'Open Sona Q&A sidebar'}
        aria-label="Open Sona Q&A sidebar"
        className="relative shrink-0 flex items-center justify-center w-7 h-6 rounded-md transition-[background-color,color,transform] active:scale-[0.98] hover:opacity-90"
        style={{ color: hasSolve ? 'var(--cam-gold-leaf-lt)' : 'var(--cam-strip-text)' }}
      >
        <Icon name="messageSquare" size={13} aria-hidden="true" />
        {/* Live-context dot. The FAB's version is a 16px pill with an aura; at
            strip scale that would be a third of the button, so it is a plain
            4px dot in the corner — same meaning, same colour. */}
        {hasSolve && (
          <span
            aria-hidden="true"
            className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--cam-gold-leaf)', boxShadow: '0 0 5px rgba(217,181,67,0.8)' }}
          />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="fixed z-30 w-14 h-14 rounded-full flex items-center justify-center transition-[transform,box-shadow,opacity] hover:scale-110 active:scale-[0.98] select-none"
      style={{
        right: 24,
        // Mobile: the bottom nav is 56px + safe-area-inset-bottom, so
        // a fixed 80px sits inside the nav on devices with a software
        // gesture bar. Add the safe-area inset so the FAB always
        // floats above the tabs instead of overlapping them.
        bottom: 'calc(80px + env(safe-area-inset-bottom))',
        background:
          'radial-gradient(circle at 30% 25%, rgba(217,181,67,0.35) 0%, transparent 55%),' +
          'radial-gradient(circle at 70% 80%, rgba(38,97,156,0.55) 0%, transparent 70%),' +
          'linear-gradient(135deg, var(--cam-primary-dk) 0%, var(--cam-primary) 50%, oklch(8% 0.03 250) 100%)',
        border: '1px solid var(--cam-gold-leaf)',
        boxShadow:
          '0 12px 28px -6px rgba(38,97,156,0.55),' +
          '0 0 24px 2px rgba(201,162,39,0.30),' +
          'inset 0 1px 0 rgba(255,255,255,0.20),' +
          'inset 0 -2px 6px rgba(0,0,0,0.30)',
        cursor: 'pointer',
      }}
      data-tip={hasSolve ? 'Sona has live context — ask a follow-up about your solution' : 'Open Sona Q&A sidebar'}
      aria-label="Open Sona Q&A sidebar"
    >
      {/* Pulsing gold halo — same animation as the Home Sona icon
          so the affordance feels identical across tabs. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(217,181,67,0.18) 0%, transparent 70%)',
          animation: 'sona-toggle-fab-glow 3s ease-in-out infinite',
        }}
      />

      {/* Chat-bubble icon, white on the navy/gold field. The Icon
          library uses currentColor for stroke; force white via the
          parent button's color and let the drop-shadow ride on the
          inline style. */}
      <span className="relative" style={{ color: '#FFFFFF', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}>
        <Icon name="messageSquare" size={22} aria-hidden="true" />
      </span>

      {/* Live-context indicator dot — gold pill in the corner with a
          blurred aura so the user knows Sona is loaded with the
          on-screen solve. */}
      {hasSolve && (
        <span
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
          aria-label="Live context ready"
          data-tip="Live context ready"
          style={{
            background: 'var(--cam-gold-leaf)',
            border: '1.5px solid var(--cam-primary-dk)',
            boxShadow: '0 0 8px rgba(217,181,67,0.65), 0 1px 3px rgba(0,0,0,0.35)',
          }}
        >
          <span className="w-1 h-1 rounded-full" style={{ background: 'var(--cam-primary-dk)' }} />
        </span>
      )}

      <style>{`
        @keyframes sona-toggle-fab-glow {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.08); }
        }
      `}</style>
    </button>
  );
}
