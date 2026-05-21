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
import { useInterviewStore } from '@/stores/interview-store';
import { extractAnswer, cleanTags } from './companion/text-formatting';
import { AnswerView } from './companion/answer-view';
import { Citations } from '@/components/lumora/Citations';
import { SonaMicButton } from './SonaMicButton';
import { Icon } from '@/components/shared/Icons';
import { dialogConfirm } from '@/components/shared/Dialog';
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
  /** Increment to auto-start the Sona mic (e.g. after coding generation
   *  completes so the interviewer's follow-up is captured immediately). */
  listenTrigger?: number;
}

const STORAGE_PREFIX = 'lumora_sona_sidebar_';

const loadHistory = (surface: string): ChatMessage[]  => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + surface);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-50); // cap history to keep storage small
  } catch { return []; }
}

const saveHistory = (surface: string, msgs: ChatMessage[]) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + surface, JSON.stringify(msgs.slice(-50)));
  } catch { /* ignore quota errors */ }
}

export const CodingSonaSidebar = ({ surface, open, onClose, listenTrigger }: CodingSonaSidebarProps) => {
  const { token } = useAuth();
  const liveSolveContext = useInterviewStore(s => s.liveSolveContext);

  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory(surface));
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [micStartTrigger, setMicStartTrigger] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Citations accumulator for the in-flight stream.
  const pendingCitationsRef = useRef<Citation[]>([]);

  // Auto-scroll to bottom on new messages / streaming tokens
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamText]);

  // Persist history to localStorage on every change
  useEffect(() => { saveHistory(surface, messages); }, [surface, messages]);

  // Focus input when the sidebar opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  // When listenTrigger fires from the parent (coding generation complete),
  // bump the mic start so the user can immediately ask a follow-up.
  useEffect(() => {
    if (!listenTrigger || !open) return;
    const t = setTimeout(() => setMicStartTrigger(n => n + 1), 500);
    return () => clearTimeout(t);
  }, [listenTrigger, open]);

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
      const text = (e as CustomEvent<{ text: string }>).detail?.text;
      if (text) sendRef.current?.(text);
    };
    window.addEventListener('lumora:coding-question', handler);
    return () => window.removeEventListener('lumora:coding-question', handler);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }, [input, send]);

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

  const placeholder = useMemo(() => liveSolveContext
    ? `Ask Sona about this ${surface}…\n(e.g., What's the time complexity? Why this data structure?)`
    : `Solve a ${surface} problem first — then ask Sona about it.`,
    [liveSolveContext, surface]);

  return (
    <aside
      className="shrink-0 flex flex-col border-l overflow-hidden"
      style={{
        width: open ? 360 : 0,
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
        transition: 'width 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        willChange: 'width',
      }}
      aria-hidden={!open}
    >
      {open && (
        <>
          {/* Header — navy hero strip + gold underline, matches the
              app's other tool-window chrome. */}
          <div
            className="flex items-center gap-2 h-10 px-3 shrink-0"
            style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}
          >
            <span className="font-display text-[11px] font-bold tracking-[0.14em] uppercase text-white">
              Sona · Follow-ups
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
              · {surface === 'coding' ? 'about your code' : 'about your design'}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              {messages.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="inline-flex items-center justify-center text-[9px] font-bold uppercase tracking-[0.12em] px-3 h-7 min-h-[1.75rem] rounded transition-colors"
                  style={{ color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.20)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  title="Clear chat history"
                  aria-label="Clear chat history"
                >
                  Clear
                </button>
              )}
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors"
                style={{ color: 'rgba(255,255,255,0.85)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                title="Close sidebar"
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
              className="flex items-center gap-2 px-3 py-1.5 text-[10px]"
              style={{ background: 'var(--accent-subtle)', borderBottom: '1px solid var(--border)', color: 'var(--cam-primary-dk)' }}
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
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-10" style={{ color: 'var(--text-muted)' }}>
                <Icon name="messageSquare" size={32} strokeWidth={1.4} style={{ opacity: 0.5 }} aria-hidden="true" />
                <p className="mt-3 text-[12px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "var(--font-sans)" }}>
                  No follow-ups yet
                </p>
                <p className="mt-1 text-[11px] leading-relaxed">
                  {liveSolveContext
                    ? `Ask anything about your ${surface} solution.`
                    : `Solve a ${surface} problem to enable grounded Q&A.`}
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
                      <span className="font-display text-[10px] font-bold tracking-[0.14em] uppercase text-white">Sona</span>
                      {m.fromCache && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.15)', color: 'var(--cam-gold-leaf-lt)' }}>
                          cached
                        </span>
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
                  <span className="font-display text-[10px] font-bold tracking-[0.14em] uppercase text-white">Sona is answering…</span>
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
                className="rounded-lg px-3 py-2 text-[11px]"
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
                disabled={streaming}
                startTrigger={micStartTrigger}
                onText={(t) => {
                  const full = input ? `${input.trimEnd()} ${t}` : t;
                  setInput(full);
                  send(full);
                }}
              />
              <span className="hidden md:inline text-[10px] leading-tight self-center" style={{ color: 'var(--text-muted)' }}>
                <kbd className="font-mono">Enter</kbd> to send <span aria-hidden="true">·</span>{' '}
                <kbd className="font-mono">Shift+Enter</kbd> for newline
              </span>
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
export const CodingSonaSidebarToggle = ({ open, onToggle, hasSolve }: { open: boolean; onToggle: () => void; hasSolve: boolean }) => {
  if (open) return null;
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
      title={hasSolve ? 'Sona has live context — ask a follow-up about your solution' : 'Open Sona Q&A sidebar'}
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
          title="Live context ready"
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
