import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { streamResponse } from '@/lib/sse-client';
import { getActiveAssistant, buildSystemContext } from '@/lib/lumora-assistant';
import { ASSISTANT_UPDATED_EVENT, setActiveCompanyKey } from '@/lib/companyContext';
import { dialogConfirm, dialogAlert } from '@/components/shared/Dialog';
import { snapRegion } from '@/lib/lumora/snapCapture';
import { isQuestion, isWhisperHallucination } from '@/lib/questionDetector';
import { passesNoiseFilter, shouldAutoAnswer } from './companion/question-routing';
import { extractAnswer, cleanTags } from './companion/text-formatting';
import { AnswerView, StoryBankPanel, getArchetype } from './companion/answer-view';
import { Citations } from '@/components/lumora/Citations';
import { useSessionStore } from '@/stores/session-store';
import { sonaRegistry } from '@/lib/sona-registry';
import type { Citation } from '@/types';

// Quiet-window (ms) after the last transcription fragment before the assembled
// question is submitted. Long enough to bridge natural mid-sentence pauses,
// short enough to feel responsive once the interviewer stops talking.
const COALESCE_MS = 1200;

const normalizeQ = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim();

// Two questions count as duplicates when, after normalizing whitespace/case,
// they are equal or one contains the other. Catches continuation fragments and
// the same utterance arriving from two entry paths.
const isDuplicateQuestion = (a: string, b: string): boolean => {
  const na = normalizeQ(a);
  const nb = normalizeQ(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
};

/* Theme-aware copilot palette — flips with [data-theme="dark"] via CSS vars */
const C = {
  base: 'var(--bg-surface)', surface: 'var(--bg-elevated)', elevated: 'var(--cam-primary)',
  text: 'var(--text-primary)', muted: 'var(--text-muted)', accent: 'var(--cam-primary)',
  accentBg: 'var(--accent-subtle)', border: 'var(--border)',
};

/* ── Types ── */
interface CopilotMessage {
  role: 'user' | 'ai';
  text: string;
  time: Date;
  /** RAG citations attached to this AI message (empty = no sources). */
  citations?: Citation[];
}

interface AICompanionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

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
const SonaAvatar = ({ size = 24, active = false }: { size?: number; active?: boolean }) => {
  // Stable per-mount id for the SVG <defs>. useRef survives across
  // re-renders and React's allowed memo discards; useMemo would
  // re-compute and increment the counter, orphaning gradient
  // references and showing the avatar as a black rectangle.
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) idRef.current = `sona-${++SONA_AVATAR_SEED}`;
  const id = idRef.current;
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
export const AICompanionPanel = ({ isOpen, onClose, initialQuestion, embedded = false }: AICompanionPanelProps & { initialQuestion?: string; embedded?: boolean }) => {
  const { token } = useAuth();

  // Load active assistant context (resume + JD) — shared helper, same shape as Coding + Design windows
  // Bumped whenever the picker writes a new company prep into the
  // assistant — forces activeAssistant to re-read from localStorage so
  // the next streamed answer carries the new context.
  const [assistantVersion, setAssistantVersion] = useState(0);
  useEffect(() => {
    const onUpdate = () => setAssistantVersion((v) => v + 1);
    window.addEventListener(ASSISTANT_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(ASSISTANT_UPDATED_EVENT, onUpdate);
  }, []);
  const activeAssistant = useMemo(() => getActiveAssistant(), [assistantVersion]);
  // Behavioral embedded mode skips study docs — they add ~15k tokens with
  // no benefit (RAG handles retrieval). Cuts TTFT from ~20s to ~5s.
  const baseSystemContext = useMemo(() => buildSystemContext(activeAssistant, { skipStudyDocs: embedded }), [activeAssistant, embedded]);

  // Live solve context — when the user just solved a coding/design
  // problem on a sibling tab, append the problem + chosen solution
  // to Sona's system context so follow-up Q&A is grounded in the
  // exact code on screen. Without this, "what's the time
  // complexity?" gets a generic / deflective answer because Sona
  // has no idea which problem was solved. Cleared on New Problem /
  // Reset, so once the user moves on, Sona stops answering against
  // stale context.
  const liveSolveContext = useSessionStore(s => s.liveSolveContext);
  const systemContext = useMemo(() => {
    if (!liveSolveContext) return baseSystemContext;
    const surface = liveSolveContext.surface === 'design' ? 'system-design' : 'coding';
    const lang = liveSolveContext.language || 'python';
    const fence = liveSolveContext.surface === 'design' ? '' : `\`\`\`${lang}\n${liveSolveContext.code}\n\`\`\``;
    const liveBlock = [
      '',
      '##############################################################################',
      `# CURRENT ${surface.toUpperCase()} SESSION (live, on-screen right now)`,
      '##############################################################################',
      'The candidate just solved this problem on the sibling tab and is now',
      'asking a follow-up about it. Treat their next message as a follow-up',
      'to THIS specific solution unless they clearly switch topics.',
      '',
      `PROBLEM:`,
      liveSolveContext.problem,
      '',
      liveSolveContext.approach ? `APPROACH:\n${liveSolveContext.approach}\n` : '',
      liveSolveContext.complexity ? `COMPLEXITY: ${liveSolveContext.complexity}\n` : '',
      liveSolveContext.surface === 'coding' ? `CODE (${lang}):\n${fence}` : `DESIGN:\n${liveSolveContext.code}`,
      '',
    ].filter(Boolean).join('\n');
    return (baseSystemContext || '') + liveBlock;
  }, [baseSystemContext, liveSolveContext]);

  // Pull the global Lumora history store. Behavioral Q&A pairs are
  // pushed here so they show up in /lumora/sessions alongside Coding
  // and Design entries — without this, the Sessions tab only saw the
  // LivePage history and Behavioral chats vanished on tab close.
  const addHistoryEntry = useSessionStore(s => s.addHistoryEntry);

  // Voice enrollment / filter status is shown and controlled from the
  // ScreenshotStrip top toolbar for behavioral (single <VoiceEnrollment>
  // instance, backed by session-store). The old duplicate status banner
  // that used to live in this panel's input row was removed.

  // Persist Behavioral messages per-assistant in sessionStorage so refresh doesn't
  // wipe an in-progress interview. Cleared when the user explicitly clears chat.
  // MUST come after activeAssistant — `const` has TDZ, minified references crash
  // at runtime with 'Cannot access … before initialization' if this block runs first.
  const storageKey = useMemo(() => activeAssistant?.id ? `lumora_behavioral_${activeAssistant.id}` : 'lumora_behavioral_default', [activeAssistant?.id]);
  // Helper — pulls + sanitises a messages bucket from sessionStorage.
  const loadMessages = (key: string): CopilotMessage[] => {
    try {
      const saved = sessionStorage.getItem(key);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as Array<{ role: 'user' | 'ai'; text: unknown; time: string }>;
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
  };
  const [messages, setMessages] = useState<CopilotMessage[]>(() => loadMessages(storageKey));

  // Mirror of `messages` read by the send path. Sending is a useCallback that
  // deliberately does not depend on `messages` (it would re-create on every
  // streamed token), so the transcript is read through a ref instead.
  const messagesRef = useRef<CopilotMessage[]>(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Tracks which bucket the current `messages` array was loaded from.
  // The persist effect only writes when it matches `storageKey` —
  // otherwise a switch from "Nvidia" to "Fireworks" would clobber the
  // Fireworks bucket with the previous Nvidia messages before the
  // reload effect has a chance to swap in the Fireworks data. The
  // reload effect updates this ref to mark the new bucket as live.
  const loadedKeyRef = useRef(storageKey);

  // Reload messages when the active assistant — and therefore the
  // storage bucket — changes. Switching company in the picker flows
  // through here; the previous assistant's messages stay safely in
  // their own bucket for when the user switches back.
  useEffect(() => {
    if (loadedKeyRef.current === storageKey) return;
    loadedKeyRef.current = storageKey;
    setMessages(loadMessages(storageKey));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist on every messages change — guarded so it never writes to a
  // bucket that doesn't match what's currently loaded.
  useEffect(() => {
    if (loadedKeyRef.current !== storageKey) return;
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

  const clearMessages = useCallback(async () => {
    if (messages.length === 0) return;
    const ok = await dialogConfirm({ title: 'Reset this interview?', message: 'This clears the current behavioral Q&A with Sona so you can start fresh. Saved sessions are not affected.', confirmLabel: 'Reset', tone: 'danger' });
    if (ok) setMessages([]);
  }, [messages.length]);

  // Declared here (before the useEffect below) so the dependency array
  // can reference it without a TDZ — const/let in function scope is hoisted
  // as uninitialized, so any reference before the declaration line crashes.
  const setSonaActions = useSessionStore(s => s.setSonaActions);

  // Ref holds the latest unstable callbacks so the useEffect below can
  // read fresh values without listing them as deps. LumoraShellPage passes
  // onClose as an inline arrow function, which creates a new reference on
  // every parent re-render — putting it in the dep array would cause
  // setSonaActions → store update → parent re-renders → new onClose →
  // effect re-fires → setSonaActions again → infinite loop (#185).
  const embeddedActionsRef = useRef({ exportSession, clearMessages, onClose });
  embeddedActionsRef.current = { exportSession, clearMessages, onClose };

  // Register panel actions into the store so ScreenshotStrip can render
  // them in the behavioral toolbar without prop-drilling through LumoraShellPage.
  useEffect(() => {
    if (!embedded) return;
    const { exportSession: exp, clearMessages: clr, onClose: cls } = embeddedActionsRef.current;
    setSonaActions({ export: exp, clear: clr, close: cls, hasMessages: messages.length > 0 });
    return () => { setSonaActions({ export: null, clear: null, close: null, hasMessages: false }); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, messages.length, setSonaActions]);

  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  // Abort controller for the active LLM stream. Behavioural mode aborts
  // the current answer when a new question arrives so Sona responds
  // immediately instead of waiting for the previous answer to finish.
  const streamAbortRef = useRef<AbortController | null>(null);
  // True while a deliberate skip is tearing down the current stream. The abort
  // it triggers surfaces as a stream error, and without this the panel reports
  // "Connection failed. Try again." for something the user did on purpose.
  const skippedRef = useRef(false);
  // Citations accumulator for the in-flight stream. Populated by the
  // `citations` SSE event and attached to the AI message on `onAnswer`.
  // Using a ref (not state) so it doesn't trigger a re-render — the
  // citations only surface once the final message is committed.
  const pendingCitationsRef = useRef<Citation[]>([]);
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
    // Cap at viewport - 96 px so the panel never reaches up into the
    // 56 px LumoraShell topbar (HOME / CODING / DESIGN / BEHAVIORAL
    // tabs) plus a 24 px breathing margin below it. Without this, a
    // saved height from a taller window earlier covered the tabs and
    // looked like the panel was eating the top chrome.
    if (savedPrefs?.h && typeof window !== 'undefined') {
      return Math.min(savedPrefs.h, window.innerHeight - 96);
    }
    return typeof window === 'undefined' ? 560 : Math.min(560, Math.max(360, window.innerHeight - 96));
  });
  const [isResizing, setIsResizing] = useState<false | 'w' | 'h' | 'wh' | 'e' | 's' | 'es'>(false);
  const answerMode = useSessionStore(s => s.answerMode);
  const setAnswerMode = useSessionStore(s => s.setAnswerMode);
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
  // origX/origY snapshot the position offset at the start of a resize so
  // east/south handles can shift the bottom-right anchor outward without
  // accumulating drift across consecutive moves.
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number; origX: number; origY: number; mode: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialQuestionSent = useRef(false);

  // Handle initial question from behavioral button
  useEffect(() => {
    if (initialQuestion && !initialQuestionSent.current) {
      initialQuestionSent.current = true;
      setMinimized(false);
      // Small delay to let panel render before sending. Use askRef
      // (kept in sync with the latest ask via the effect below) so the
      // initial behavioral question gets the freshest systemContext —
      // the closure'd `ask` would stale-fire with empty resume / JD.
      setTimeout(() => askRef.current?.(initialQuestion), 300);
    }
  }, [initialQuestion]);

  // Reset when question changes
  useEffect(() => {
    if (!initialQuestion) initialQuestionSent.current = false;
  }, [initialQuestion]);

  // Drag handlers for floating window. Clamp Y so the panel can't be
  // dragged up into the LumoraShell topbar (56 px) — the panel's drag
  // header would otherwise hide behind the page tabs and the user
  // couldn't grab it to drag it back. With panel anchored bottom-right
  // (bottom: 24 - y), the lowest valid y is `80 + height - viewport`
  // which puts the panel's top edge exactly at 56 px (topbar bottom).
  // Keep the floating panel on-screen. Clamps the bottom-right-anchored
  // position so neither axis can push the panel past a viewport edge (the
  // header must stay grabbable). Applied during drag, on mount, and on
  // resize so a previously-saved off-screen position self-heals.
  const clampPosition = useCallback((pos: { x: number; y: number }, w: number, h: number) => {
    const maxX = 16, maxY = 16;
    const minX = 32 - window.innerWidth + w;
    const minY = 80 + h - window.innerHeight;
    return {
      x: minX > maxX ? 0 : Math.max(minX, Math.min(maxX, pos.x)),
      y: minY > maxY ? minY : Math.max(minY, Math.min(maxY, pos.y)),
    };
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    // RAF-throttle the position state writes — without this, dragging
    // the panel during an active stream queues 60+ setState calls per
    // second and React's batcher fights the streamer's renders,
    // producing visible jank. We accumulate the latest pointer
    // position in a ref and commit at most once per frame.
    let pendingX = 0, pendingY = 0, hasPending = false, rafId = 0;
    const flush = () => {
      rafId = 0;
      if (!hasPending) return;
      hasPending = false;
      setPosition({ x: pendingX, y: pendingY });
    };
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const rawX = dragRef.current.origX + (e.clientX - dragRef.current.startX);
      const rawY = dragRef.current.origY + (e.clientY - dragRef.current.startY);
      const c = clampPosition({ x: rawX, y: rawY }, panelWidth, panelHeight);
      pendingX = c.x; pendingY = c.y;
      hasPending = true;
      if (!rafId) rafId = requestAnimationFrame(flush);
    };
    const handleUp = () => { setIsDragging(false); dragRef.current = null; };
    // passive:true tells the browser we won't preventDefault — keeps
    // scroll thread non-blocked even while the listener is attached.
    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('mouseup', handleUp);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, panelHeight, panelWidth, clampPosition]);

  // Self-heal a persisted off-screen position (older builds had no X clamp)
  // and re-clamp when the viewport shrinks below the saved position.
  useEffect(() => {
    const reclamp = () => setPosition(p => {
      const c = clampPosition(p, panelWidth, panelHeight);
      return (c.x === p.x && c.y === p.y) ? p : c;
    });
    reclamp();
    window.addEventListener('resize', reclamp);
    return () => window.removeEventListener('resize', reclamp);
  }, [clampPosition, panelWidth, panelHeight]);

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

      // Width — left handles grow inward (anchor on right stays put);
      // right handles must also nudge position.x by the same delta so the
      // bottom-right anchor (`right: calc(24px - position.x)`) follows the
      // cursor outward instead of letting the panel grow leftward.
      if (r.mode === 'w' || r.mode === 'wh') {
        const dX = r.startX - e.clientX;
        setPanelWidth(Math.min(Math.max(300, r.startW + dX), maxW));
      } else if (r.mode === 'e' || r.mode === 'es') {
        const dX = e.clientX - r.startX;
        const newW = Math.min(Math.max(300, r.startW + dX), maxW);
        setPanelWidth(newW);
        setPosition(p => ({ ...p, x: r.origX + (newW - r.startW) }));
      }
      // Height — same trick: south handle has to drag the bottom anchor
      // down via position.y, otherwise the panel just grows upward.
      if (r.mode === 'h' || r.mode === 'wh') {
        const dY = r.startY - e.clientY;
        setPanelHeight(Math.min(Math.max(300, r.startH + dY), maxH));
      } else if (r.mode === 's' || r.mode === 'es') {
        const dY = e.clientY - r.startY;
        const newH = Math.min(Math.max(300, r.startH + dY), maxH);
        setPanelHeight(newH);
        setPosition(p => ({ ...p, y: r.origY + (newH - r.startH) }));
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

  // FIFO queue of questions captured while Sona is streaming. All questions
  // are preserved and drained one-by-one as each answer completes.
  const pendingQuestionRef = useRef<string[]>([]);

  // The question whose answer is currently streaming. Used to dedup: a
  // continuation fragment or a repeat of the in-flight question must not be
  // re-queued (it would answer the same thing twice).
  const activeQuestionRef = useRef<string>('');

  // Fragment-coalescing buffer for continuous (behavioral) transcription.
  // A real interviewer question is often flushed by Whisper's VAD as several
  // segments across natural mid-sentence pauses ("Tell me about a time…" …
  // "…how did you handle it?"). Each segment used to be a separate ask() that
  // ABORTED the answer the previous segment started — so nothing ever finished.
  // We now buffer segments and only submit once the speaker has been quiet for
  // COALESCE_MS, assembling the full question as one ask().
  const coalesceBufferRef = useRef<string>('');
  const coalesceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Behavioral tap-to-answer: the SOFT tier. Transcribed interviewer lines that
  // cleared the noise floor but not shouldAutoAnswer() land here as PENDING
  // questions for the user to tap. Lines that DO clear it are answered
  // hands-free — see the routing in submitCoalesced. Splitting the two is what
  // gives back auto-answers without the meeting-chatter / Whisper-hallucination
  // flood that made blanket auto-answering unusable in noisy rooms.
  const [detectedQuestions, setDetectedQuestions] = useState<{ id: number; text: string; time: Date }[]>([]);

  // Screenshots staged for the next question. A ref shadows the state because
  // ask() runs from timers and event listeners whose closures predate the last
  // render — reading state there would attach yesterday's screenshot, or none.
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const pendingImagesRef = useRef<string[]>([]);
  useEffect(() => { pendingImagesRef.current = pendingImages; }, [pendingImages]);
  const MAX_IMAGES = 3;
  const [snapping, setSnapping] = useState(false);

  // Voice enrollment gates whether Sona can tell the candidate's voice from the
  // interviewer's. Unenrolled, the mic feeds BOTH into the question stream and
  // the candidate's own answers come back as the next question. Nothing said so
  // — the filter simply sat inert — so the panel says it, once, where the
  // questions appear. Dismissable for the session only; the toolbar chip stays
  // the permanent way in, so nothing is lost by hiding this.
  const voiceEnrolled = useSessionStore(s => s.voiceEnrolled);
  const isEnrolling = useSessionStore(s => s.isEnrolling);
  const [enrollNudgeHidden, setEnrollNudgeHidden] = useState(false);

  /**
   * What Sona heard, and what it DID with it.
   *
   * Every drop between a transcript and the LLM used to be silent — noise
   * filter, repeat guard, missing token, a stream still in flight — so "Sona
   * isn't answering" and "Sona never heard you" and "Sona heard you and threw
   * it away" all looked identical: a question that flashes up and vanishes.
   * This is the one place that says which of those happened.
   */
  const [heardLog, setHeardLog] = useState<{ id: number; text: string; outcome: string; time: Date }[]>([]);
  const heardIdRef = useRef(0);
  const noteHeard = useCallback((text: string, outcome: string) => {
    setHeardLog(prev => [
      { id: ++heardIdRef.current, text: (text || '').slice(0, 90), outcome, time: new Date() },
      ...prev,
    ].slice(0, 5));
  }, []);

  const addImage = useCallback((dataUrl: string) => {
    if (!dataUrl.startsWith('data:image/')) return;
    setPendingImages(prev => (prev.length >= MAX_IMAGES ? prev : [...prev, dataUrl]));
  }, []);

  // Screenshot straight into the composer — the shared crosshair (desktop) /
  // share-picker (web) path used by every other camera button in Lumora.
  const snapIntoComposer = useCallback(async () => {
    if (snapping) return;
    setSnapping(true);
    try {
      const res = await snapRegion();
      if (res.cancelled) return;              // Escape is not a failure
      if (!res.dataUrl) { if (res.error) dialogAlert({ title: 'Screenshot failed', message: res.error }); return; }
      addImage(res.dataUrl);
      inputRef.current?.focus();
    } finally { setSnapping(false); }
  }, [snapping, addImage]);

  // Cmd+V of an image anywhere in the composer.
  const onComposerPaste = useCallback((e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData?.items || [])
      .filter(it => it.kind === 'file' && it.type.startsWith('image/'))
      .map(it => it.getAsFile())
      .filter((f): f is File => !!f);
    if (!files.length) return;
    e.preventDefault();
    files.slice(0, MAX_IMAGES).forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => addImage(String(reader.result || ''));
      reader.readAsDataURL(f);
    });
  }, [addImage]);
  const detectedIdRef = useRef(0);

  // Hands-free auto-answer. ON by default — in a live interview the user's eyes
  // are on the interviewer, and tapping every question is the one thing they
  // can least afford to do. Only lines clearing shouldAutoAnswer() fire
  // automatically; softer prompts still land in the tap list, so the noisy-room
  // flood 45d885ae fixed stays fixed. Persisted so the choice survives a reload
  // mid-interview.
  const AUTO_ANSWER_KEY = 'lumora_behavioral_autoanswer_v1';
  const [autoAnswer, setAutoAnswer] = useState<boolean>(() => {
    try { return localStorage.getItem(AUTO_ANSWER_KEY) !== '0'; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem(AUTO_ANSWER_KEY, autoAnswer ? '1' : '0'); } catch { /* ignore */ }
  }, [autoAnswer]);
  // submitCoalesced's flush runs from a timer that captured its closure when the
  // window opened; a ref keeps the decision honest if the user toggles during it.
  const autoAnswerRef = useRef(autoAnswer);
  useEffect(() => { autoAnswerRef.current = autoAnswer; }, [autoAnswer]);
  // Last auto-asked utterance. ask() only dedupes while a stream is in flight,
  // so without this a question repeated across two quiet windows (interviewer
  // rephrasing, same line via mic + loopback) burns a second LLM call.
  const lastAutoAskedRef = useRef('');
  const addDetectedQuestion = useCallback((text: string) => {
    const t = (text || '').trim();
    // Keep the tap-to-answer list clean in a noisy room — shared noise floor.
    if (!passesNoiseFilter(t)) return;
    setDetectedQuestions(prev => {
      // Drop near-duplicates of the last few entries (continuation fragments,
      // same utterance from two paths).
      if (prev.slice(-6).some(q => isDuplicateQuestion(q.text, t))) return prev;
      const next = [...prev, { id: ++detectedIdRef.current, text: t, time: new Date() }];
      return next.slice(-40); // cap the list so a long session doesn't grow unbounded
    });
  }, []);

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
    if (!trimmed) return;
    if (!token) { noteHeard(trimmed, 'not answered — signed out'); return; }
    if (streaming) {
      // Let the in-flight answer finish, then answer this next. Do NOT abort
      // the current stream — aborting on every incoming transcription was the
      // root cause of answers never completing in a live interview. Dedup so a
      // continuation fragment or a duplicate (same utterance arriving from two
      // entry paths) of the active or last-queued question isn't re-answered.
      const lastQueued = pendingQuestionRef.current[pendingQuestionRef.current.length - 1] || '';
      if (!isDuplicateQuestion(trimmed, activeQuestionRef.current) && !isDuplicateQuestion(trimmed, lastQueued)) {
        pendingQuestionRef.current.push(trimmed);
        noteHeard(trimmed, 'queued behind the current answer');
      } else {
        noteHeard(trimmed, 'ignored — repeat of the current question');
      }
      return;
    }

    const modePrefix = answerMode === 'short' ? '[SHORT] ' : '[DETAILED] ';

    activeQuestionRef.current = trimmed;
    noteHeard(trimmed, 'answering');
    // Clear the skip latch per question. It is normally consumed by the abort's
    // error/catch path, but an abort landing between frames can produce
    // neither — and a latch left set would silently swallow the next REAL
    // error as if the user had skipped it.
    skippedRef.current = false;
    setMessages(prev => [...prev, { role: 'user', text: question.trim(), time: new Date() }]);
    setStreaming(true);
    setStreamText('');

    // Inactivity timeout, NOT wall-clock: a healthy answer that streams for over
    // 60s kept tripping the old fixed timer, which appended "timed out" AND left
    // the stream running (so onAnswer double-rendered) and never aborted it.
    // armSafety() is reset on every token, so this only fires after a real 60s
    // stall — and then it aborts the stream.
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;
    const armSafety = () => {
      clearTimeout(safetyTimer);
      safetyTimer = setTimeout(() => {
        streamAbortRef.current?.abort();
        setStreaming(s => {
          if (s) {
            setMessages(m => [...m, { role: 'ai' as const, text: 'Response timed out. Please try again.', time: new Date() }]);
            setStreamText('');
          }
          return false;
        });
      }, 60_000);
    };
    armSafety();

    // Reset the pending citations for this new question's stream.
    pendingCitationsRef.current = [];

    try {
      const streamAbort = new AbortController();
      streamAbortRef.current = streamAbort;
      // Staged screenshots ride with THIS question and are cleared immediately,
      // so the next question can't silently inherit the last one's image.
      const imgs = pendingImagesRef.current;
      if (imgs.length) { pendingImagesRef.current = []; setPendingImages([]); }
      await streamResponse({
        question: modePrefix + question.trim(),
        ...(imgs.length ? { images: imgs } : {}),
        token,
        signal: streamAbort.signal,
        useSearch: false,
        systemContext,
        // Prior turns of this chat. Each request opens a new conversation on
        // the backend, so without this every follow-up is answered as if the
        // exchange had just begun.
        history: messagesRef.current
          .filter(m => typeof m.text === 'string' && m.text.trim())
          .map(m => ({ role: m.role === 'ai' ? ('assistant' as const) : ('user' as const), content: m.text })),
        // Behavioral fullscreen → tell the backend so retrieval biases to
        // the capra-behavioral STAR sources (modeSourceFilter). The
        // floating Sona handles mixed coding/design follow-ups, so it
        // stays on the default 'general' retrieval.
        ...(embedded ? { mode: 'behavioral' as const } : {}),
        onCitations: (citations) => {
          pendingCitationsRef.current = citations;
        },
        onToken: (data) => {
          if (data.t) { setStreamText(prev => prev + data.t); armSafety(); }
        },
        onAnswer: (data: any) => {
          // Clear the inactivity timer NOW. It's a per-ask `let`, but the abort
          // it fires targets the SHARED streamAbortRef — if left armed after the
          // answer lands (a stream that ends on the answer frame without a
          // trailing onComplete), it can later abort the NEXT question's stream
          // and stamp it "timed out". Belt-and-suspenders with onComplete.
          clearTimeout(safetyTimer);
          const answerText = extractAnswer(data.parsed) || data.raw || '';
          const citations = pendingCitationsRef.current;
          pendingCitationsRef.current = [];
          setMessages(prev => [...prev, {
            role: 'ai',
            text: cleanTags(answerText),
            time: new Date(),
            citations: citations.length > 0 ? citations : undefined,
          }]);
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
          clearTimeout(safetyTimer);
          // Deliberate skip — the teardown is not a failure to report.
          if (skippedRef.current) { skippedRef.current = false; return; }
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
        onComplete: () => { clearTimeout(safetyTimer); setStreaming(false); },
      });
    } catch {
      clearTimeout(safetyTimer);
      // Same reason as onError: an aborted stream is how a skip ends.
      if (skippedRef.current) { skippedRef.current = false; setStreamText(''); setStreaming(false); return; }
      setMessages(prev => [...prev, { role: 'ai', text: 'Connection failed. Try again.', time: new Date() }]);
      setStreamText('');
      setStreaming(false);
    }
  }, [token, streaming, answerMode, systemContext, addHistoryEntry, embedded, noteHeard]);

  /**
   * Skip the question Sona is answering right now.
   *
   * Interviewers move on, rephrase, or ask something the candidate would rather
   * answer themselves — and until now the only exits were watching the answer
   * finish or clearing the whole session. Skip stops the stream, drops anything
   * queued behind it, and lifts the abandoned question back out of the
   * transcript so the next one starts on a clean page.
   *
   * lastAutoAskedRef is deliberately NOT cleared: the utterance that produced
   * this question is often still arriving in fragments, and clearing it would
   * let the very question just skipped fire again on the next coalesce window.
   */
  const skipCurrent = useCallback(() => {
    skippedRef.current = true;
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    pendingQuestionRef.current = [];
    activeQuestionRef.current = '';
    setStreaming(false);
    setStreamText('');
    setMessages(prev => {
      // Drop the trailing question that never got an answer under it. Anything
      // already answered stays — this skips one question, it is not a reset.
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].role === 'ai') break;
        if (prev[i].role === 'user') return prev.slice(0, i);
      }
      return prev;
    });
  }, []);

  // Esc skips, so the candidate can drop an answer without looking down for a
  // button. Free on this surface since the behavioral tab has no listen switch
  // for Esc to stop (see AudioCapture's locked guard).
  useEffect(() => {
    if (!embedded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !streaming) return;
      const el = e.target as HTMLElement | null;
      if (el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el.isContentEditable)) return;
      e.preventDefault();
      skipCurrent();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [embedded, streaming, skipCurrent]);

  const handleSubmit = useCallback(() => {
    const typed = input.trim();
    // A screenshot on its own is a complete request — "answer what's on my
    // screen". Without a question the backend rejects the call, so supply the
    // one the user obviously means rather than making them type it.
    if (!typed && pendingImagesRef.current.length > 0) {
      ask('Answer the question in this screenshot.');
      return;
    }
    if (typed) { ask(input); setInput(''); }
  }, [input, ask]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const API_URL = (import.meta as any).env?.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';


  // Stable ref so AudioCapture's onTranscription dep doesn't rebuild on every
  // `streaming` flip — mid-recording callback swaps caused dropped chunks.
  const askRef = useRef(ask);
  useEffect(() => { askRef.current = ask; }, [ask]);

  // Coalesce continuous-transcription fragments into a single question. Each
  // new fragment restarts the quiet-window timer; the assembled question is
  // submitted only after COALESCE_MS with no new fragment. A fragment already
  // contained in the buffer (same utterance arriving twice) doesn't re-append.
  const submitCoalesced = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    const buf = coalesceBufferRef.current;
    if (!buf) {
      coalesceBufferRef.current = t;
    } else if (!normalizeQ(buf).includes(normalizeQ(t))) {
      coalesceBufferRef.current = `${buf} ${t}`;
    }
    if (coalesceTimerRef.current) clearTimeout(coalesceTimerRef.current);
    coalesceTimerRef.current = setTimeout(() => {
      const full = coalesceBufferRef.current.trim();
      coalesceBufferRef.current = '';
      coalesceTimerRef.current = null;
      // Gate the COMPLETE assembled utterance (not the fragments) with the
      // recall-favoring behavioral gate: answer anything that isn't clearly
      // Whisper noise, interview wrap-up, or pure acknowledgment/filler. This
      // is where narration is filtered now that the per-fragment isQuestion()
      // gate in LumoraShellPage was removed (it ate ~90% of real questions).
      // Manual mic presses never reach here — they ask() directly upstream.
      //
      // Two-tier routing, the single control point for flood vs. miss:
      //   clears shouldAutoAnswer()  → answer hands-free, right now
      //   softer / ambiguous         → tap-to-answer list, user picks
      // Both tiers sit behind the same passesNoiseFilter() floor, so auto-answer
      // can never become the hole that lets the 2026-06-29 garbage flood back in.
      if (!full) return;
      if (!passesNoiseFilter(full)) { noteHeard(full, 'ignored — filler, noise or not a question'); return; }
      if (autoAnswerRef.current && shouldAutoAnswer(full)) {
        // ask() dedupes against the active + last-queued question only while a
        // stream is in flight; guard the idle case too.
        if (isDuplicateQuestion(full, lastAutoAskedRef.current)) {
          noteHeard(full, 'ignored — just answered this');
          return;
        }
        lastAutoAskedRef.current = full;
        askRef.current?.(full);
        return;
      }
      noteHeard(full, 'waiting for you to tap it');
      addDetectedQuestion(full);
    }, COALESCE_MS);
  }, [addDetectedQuestion, noteHeard]);

  // On unmount: drop any buffered fragment and abort an in-flight stream so we
  // stop billing tokens the browser will never render.
  useEffect(() => () => {
    if (coalesceTimerRef.current) clearTimeout(coalesceTimerRef.current);
    streamAbortRef.current?.abort();
  }, []);

  // Register with the Sona ask-callback registry so the page-level
  // voice router (LumoraBottomBar's mic + dispatchTranscript) can
  // forward routed transcripts here without a React-tree dependency.
  // Routed through handleAutoTranscription (declared below) so the
  // isQuestion gating + manual-bypass policy lives in one place.
  // Use a ref to avoid re-registering on every render.
  const autoTranscriptionRef = useRef<((text: string, opts?: { manual?: boolean }) => void) | null>(null);
  useEffect(() => {
    return sonaRegistry.register((text, opts) => {
      autoTranscriptionRef.current?.(text, opts);
    });
  }, []);

  // Sona panel state is INDEPENDENT of voice routing. Whether the
  // panel is open or minimized, the routing rule stays:
  //   first utterance on a coding/design tab → problem field +
  //                                            solver fires + auto-flip
  //   subsequent utterances                  → Sona answers them
  //   New Problem button                      → reset to 'problem'
  // The user keeps the panel open just to see Sona's answers; that
  // visibility shouldn't reroute the mic. Embedded mode (fullscreen
  // behavioral) is the ONLY case where we force the panel state into
  // the registry — that page has no problem field to fill.
  useEffect(() => {
    if (!embedded) return;
    sonaRegistry.setOpen(true);
    return () => { sonaRegistry.setOpen(false); };
  }, [embedded]);

  // Drain the FIFO queue when each answer finishes streaming.
  // Questions captured mid-stream are answered in order, none dropped.
  useEffect(() => {
    if (!streaming && pendingQuestionRef.current.length > 0) {
      const q = pendingQuestionRef.current.shift()!;
      askRef.current?.(q);
    }
  }, [streaming]);

  // Stable handler for continuous-mic transcriptions.
  // `opts.manual === true` means the user explicitly pressed the mic button.
  // In embedded behavioral mode, bypass isQuestion() entirely — the user is
  // in an active interview and wants Sona to answer the interviewer's
  // questions even when they don't hit the heuristic's starters (e.g.
  // "Take me through…", "And what did you…", etc.). The isLikelyRealSpeech
  // gate inside AudioCapture already filters noise and Whisper hallucinations,
  // so auto-answering everything transcribed in behavioral mode is safe.
  const handleAutoTranscription = useCallback((text: string, opts?: { manual?: boolean }) => {
    if (typeof text !== 'string' || !text.trim()) {
      console.warn('[Sona] handleAutoTranscription received non-string:', text);
      return;
    }
    setLiveTranscript(''); // question is committed — clear live preview
    // Whisper hallucination garbage ("So, tb Cz, as a So, dc") must never reach
    // the QUESTIONS panel — not via manual presses, not via embedded behavioral.
    if (isWhisperHallucination(text)) return;
    // Explicit mic press = one deliberate utterance → answer immediately.
    if (opts?.manual) { askRef.current?.(text); return; }
    // Continuous behavioral capture → coalesce VAD fragments into one question
    // so a multi-segment interviewer question isn't split into several asks.
    if (embedded) { submitCoalesced(text); return; }
    // Non-embedded (floating Sona): gate on isQuestion so monologues / acknowledgments don't fire.
    if (!isQuestion(text)) {
      return;
    }
    askRef.current?.(text);
  }, [embedded, submitCoalesced]);

  // Keep the registry-bound ref in sync with the latest handler.
  // handleAutoTranscription has [] deps so it never rebuilds, but
  // wiring through a ref keeps the registration stable regardless.
  useEffect(() => { autoTranscriptionRef.current = handleAutoTranscription; }, [handleAutoTranscription]);

  // When embedded in /lumora/behavioral, listen for interviewer-audio
  // transcriptions forwarded from LumoraShellPage. The shell's
  // useStreamingSession path renders into LivePage which is
  // hidden behind this embedded panel — so the answer would otherwise
  // disappear into nothing.
  useEffect(() => {
    if (!embedded) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text?: string; manual?: boolean }>).detail;
      const text = typeof detail?.text === 'string' ? detail.text.trim() : '';
      if (!text) return;
      // Manual mic press = one deliberate utterance → answer immediately,
      // skipping both the coalescer and the behavioral gate (explicit intent).
      if (detail?.manual) { askRef.current?.(text); return; }
      submitCoalesced(text);
    };
    window.addEventListener('lumora:behavioral-question', handler);
    return () => window.removeEventListener('lumora:behavioral-question', handler);
  }, [embedded, submitCoalesced]);

  useEffect(() => {
    if (!embedded) return;
    const handler = (e: Event) => {
      const text = (e as CustomEvent<{ text?: string }>).detail?.text ?? '';
      setLiveTranscript(text);
    };
    window.addEventListener('lumora:behavioral-live-transcript', handler);
    return () => window.removeEventListener('lumora:behavioral-live-transcript', handler);
  }, [embedded]);

  // Embedded mode = render inline, skip minimized/floating
  useEffect(() => {
    if (embedded) setMinimized(false);
  }, [embedded]);

  // Mobile drawer for the Questions / Story Bank rail. The 280px sidebar
  // is hidden on screens <md and accessible via a hamburger in the header.
  // Auto-closes when a question is tapped from the drawer so the user
  // returns to the answer view immediately.
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  useEffect(() => { if (!embedded) setMobileRailOpen(false); }, [embedded]);

  // Minimized = floating icon button. Draggable: shares the same
  // `position` state as the open panel so wherever the user parks it
  // stays consistent across minimize/restore. We treat a real drag
  // (>4 px movement) as different from a click — clicks open the
  // panel, drags reposition the icon. Without this distinction every
  // click would also reposition by a few pixels and feel jittery.
  if (minimized && !embedded) {
    return (
      <button
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          const startX = e.clientX;
          const startY = e.clientY;
          const origX = position.x;
          const origY = position.y;
          let moved = false;
          const handleMove = (ev: MouseEvent) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            if (!moved && Math.hypot(dx, dy) > 4) moved = true;
            if (moved) setPosition(clampPosition({ x: origX + dx, y: origY + dy }, panelWidth, panelHeight));
          };
          const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            // Click (no real movement) → open the panel.
            if (!moved) setMinimized(false);
          };
          window.addEventListener('mousemove', handleMove);
          window.addEventListener('mouseup', handleUp);
        }}
        className="fixed z-50 w-14 h-14 rounded-full flex items-center justify-center transition-[transform,box-shadow,opacity] hover:scale-110 active:scale-[0.98] select-none group"
        style={{
          right: `calc(24px - ${position.x}px)`,
          bottom: `calc(24px - ${position.y}px)`,
          // Layered fill: deep navy core for Sona's identity, with a
          // soft gold radial highlight in the upper-left so the
          // avatar reads as illuminated rather than flat.
          background:
            'radial-gradient(circle at 30% 25%, rgba(217,181,67,0.35) 0%, transparent 55%),' +
            'radial-gradient(circle at 70% 80%, rgba(38,97,156,0.55) 0%, transparent 70%),' +
            'linear-gradient(135deg, var(--cam-primary-dk) 0%, var(--cam-primary) 50%, #03132E 100%)',
          border: '1px solid var(--cam-gold-leaf)',
          // Multi-stop shadow: outer lapis halo + outer gold halo +
          // inset top highlight + bottom inner shadow for depth.
          boxShadow:
            '0 12px 28px -6px rgba(38,97,156,0.55),' +
            '0 0 24px 2px rgba(201,162,39,0.30),' +
            'inset 0 1px 0 rgba(255,255,255,0.20),' +
            'inset 0 -2px 6px rgba(0,0,0,0.30)',
          cursor: 'grab',
        }}
        data-tip="Drag to reposition · click to open Sona"
      >
        {/* Pulsing gold halo behind the button — subtle "alive"
            indicator without pulling focus from the avatar. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(217,181,67,0.18) 0%, transparent 70%)',
            animation: 'sona-icon-glow 3s ease-in-out infinite',
          }}
        />
        <span className="relative">
          <SonaAvatar size={44} active />
        </span>
        {messages.length > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{
              background: 'var(--cam-accent-fill)',
              color: 'var(--cam-accent-fill-text)',
              border: '1.5px solid var(--accent)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {messages.filter(m => m.role === 'user').length}
          </span>
        )}
        <style>{`
          @keyframes sona-icon-glow {
            0%, 100% { opacity: 0.55; transform: scale(1); }
            50%      { opacity: 1;    transform: scale(1.08); }
          }
        `}</style>
      </button>
    );
  }

  // The composer. In embedded mode it is rendered INSIDE the answers column
  // (below the answer cards, capped to the same 880px measure) instead of as a
  // full-width bar under both columns — a question box that starts under the
  // questions rail reads as belonging to the rail, and its text ran a whole
  // column wider than the answers it produces.
  //
  // Mobile note: when embedded, the LumoraShell bottom nav (fixed, 56px +
  // safe-area-inset-bottom) sits over the bottom of the panel. Without bottom
  // padding the mic + send row hides behind it. The wrapper class ladders
  // padding by breakpoint; the inline style replicates it so safe-area is
  // included on mobile-Safari notch devices.
  const composer = (
    <div
      className="px-3 pt-2 shrink-0 flex flex-col items-center gap-2 lumora-companion-input-row w-full mx-auto"
      data-embedded={embedded ? 'true' : 'false'}
      style={embedded ? { maxWidth: 880 } : undefined}
    >
        {/* Voice enrollment / filter status lives in the ScreenshotStrip top
            toolbar for behavioral (the single <VoiceEnrollment> instance,
            backed by session-store). The old duplicate banner that used to
            render here ("Not enrolled · Enroll My Voice") was removed — it
            shared the same store state, so the toolbar chip is authoritative. */}
        {/* Staged screenshots — thumbnails sit ABOVE the input so the row of
            controls keeps its fixed height and nothing reflows mid-interview. */}
        {pendingImages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 w-full">
            {pendingImages.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="attached screenshot" className="h-12 w-12 object-cover rounded-md" style={{ border: '1px solid var(--cam-gold-leaf)' }} />
                <button
                  onClick={() => setPendingImages(prev => prev.filter((_, k) => k !== i))}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  aria-label="Remove screenshot"
                  data-tip="Remove this screenshot"
                >×</button>
              </div>
            ))}
          </div>
        )}
        {/* Text input — visible in both floating and embedded behavioral mode */}
        {/* Double height: the composer is where the whole panel gets driven
            from, and a 36px strip at the bottom of a full-screen window read as
            a status bar rather than the thing you type into. */}
        <div className="flex items-center gap-2 px-3 h-24 md:h-[72px] rounded-xl w-full" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (input.trim() || pendingImages.length > 0)) handleSubmit(); }}
            onPaste={onComposerPaste}
            placeholder="Type a question..."
            className="flex-1 bg-transparent focus:outline-none min-w-0 placeholder:opacity-40 text-[16px] md:text-[13px]"
            style={{ fontFamily: "var(--font-sans)", color: 'var(--text-primary)' }} disabled={streaming} />
          {/* Screenshot — ask Sona about whatever is on screen. */}
          <button
            onClick={snapIntoComposer}
            disabled={snapping || streaming || pendingImages.length >= MAX_IMAGES}
            className="w-9 h-9 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40"
            style={{ border: '1px solid var(--border)' }}
            aria-label="Add a screenshot"
            data-tip={pendingImages.length >= MAX_IMAGES
              ? `Up to ${MAX_IMAGES} screenshots per question`
              : 'Screenshot — drag to select any area and ask about it. Pasting an image works too.'}
          >
            {snapping ? (
              <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" style={{ color: 'var(--text-muted)' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--cam-gold-leaf)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 md:w-4 md:h-4">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            )}
          </button>
          {(input.trim() || pendingImages.length > 0) && !streaming && (
            <button onClick={handleSubmit} className="w-9 h-9 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--cam-primary)' }} aria-label="Send question">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
    </div>
  );

  return (
    <div
      className={embedded ? "flex flex-col h-full w-full" : "fixed z-50 flex flex-col"}
      style={embedded ? { background: 'var(--bg-surface)', borderRadius: 0 } : {
        // On mobile the LumoraIconRail is hidden, so maximized must start at left:0
        // and span the full viewport width. md+ keeps the 80px rail offset.
        width: maximized ? `calc(100vw - var(--lumora-rail-offset, 0px))` : panelWidth,
        // Maximized: start 56 px below the viewport top (LumoraShell topbar
        // height) so the HOME/CODING/DESIGN/BEHAVIORAL tabs stay visible
        // — without this top:0 covered them. Height drops to
        // 100dvh - 56px to match.
        // Non-maximized: cap maxHeight to viewport - 80 (56 topbar + 24
        // breathing room) so a tall resize / restored save can't push
        // the top edge into the topbar.
        height: maximized ? 'calc(100dvh - 56px)' : panelHeight,
        maxHeight: maximized ? undefined : 'calc(100dvh - 80px)',
        right: maximized ? 0 : `calc(24px - ${position.x}px)`,
        bottom: maximized ? 0 : `calc(24px - ${position.y}px)`,
        left: maximized ? 'var(--lumora-rail-offset, 0px)' : undefined,
        top: maximized ? 56 : undefined,
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
          <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10" onMouseDown={(e) => { setIsResizing('w'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, origX: position.x, origY: position.y, mode: 'w' }; }} />
          <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10" onMouseDown={(e) => { setIsResizing('e'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, origX: position.x, origY: position.y, mode: 'e' }; }} />
          <div className="absolute left-0 top-0 right-0 h-2 cursor-ns-resize z-10" onMouseDown={(e) => { setIsResizing('h'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, origX: position.x, origY: position.y, mode: 'h' }; }} />
          <div className="absolute left-0 bottom-0 right-0 h-2 cursor-ns-resize z-10" onMouseDown={(e) => { setIsResizing('s'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, origX: position.x, origY: position.y, mode: 's' }; }} />
          {/* Corners */}
          <div className="absolute left-0 top-0 w-4 h-4 cursor-nwse-resize z-20" onMouseDown={(e) => { setIsResizing('wh'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, origX: position.x, origY: position.y, mode: 'wh' }; }} />
          <div className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize z-20" onMouseDown={(e) => { setIsResizing('es'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, origX: position.x, origY: position.y, mode: 'es' }; }} />
        </>
      )}

      {/* Header — LeetCode treatment: navy --cam-hero-strip background
          with a 2px gold-leaf underline. Matches StreamingCodingCard
          headers used elsewhere in Lumora so the panel reads as a
          first-class tool window, not flat chrome. Children below are
          re-themed for white-on-navy contrast. */}
      <div
        className={`flex items-center gap-2 h-10 px-3 shrink-0 ${embedded ? 'md:hidden' : 'cursor-move'} select-none`}
        style={{
          background: 'var(--cam-hero-strip)',
          borderBottom: '1px solid var(--cam-gold-leaf)',
          borderRadius: embedded || maximized ? 0 : '16px 16px 0 0',
        }}
        onMouseDown={embedded ? undefined : startDrag}
      >
        {/* Left: mobile rail toggle (embedded) or export+clear+new (floating) */}
        <div className="flex items-center gap-0.5">
          {embedded ? (
            <button
              onClick={() => setMobileRailOpen(v => !v)}
              className="md:hidden p-2 rounded-md transition-colors hover:bg-[var(--cam-strip-icon-bg)]"
              style={{ color: 'var(--cam-strip-text)' }}
              data-tip="Questions"
              aria-label="Open questions panel"
              aria-expanded={mobileRailOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            </button>
          ) : (
            <>
              <button
                onClick={exportSession}
                disabled={messages.length === 0}
                className="p-1 rounded-md transition-colors hover:bg-[var(--cam-strip-icon-bg)] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: 'var(--cam-strip-text)' }}
                data-tip="Export session (.md)"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              </button>
              <button onClick={() => setMessages([])} className="p-1 rounded-md transition-colors hover:bg-[var(--cam-strip-icon-bg)]" style={{ color: 'var(--cam-strip-text)' }} data-tip="New chat">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
            </>
          )}
        </div>

        {/* Center: title + mode toggle. Title white-on-navy, company
            chip in gold-leaf, SHORT/DETAILED tabs use the same gold
            highlight as the StreamingCodingCard pattern so the active
            mode is unmistakable on a navy strip. */}
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <SonaAvatar size={18} />
          <span className="text-[11px] font-bold tracking-wide" style={{ color: 'var(--cam-strip-heading)' }}>Sona</span>
          {activeAssistant && (
            <span
              className="hidden sm:inline items-center gap-0.5 text-[8px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'var(--cam-strip-icon-bg)', color: 'var(--cam-gold-leaf-lt)', display: 'inline-flex', maxWidth: 140 }}
            >
              <span className="truncate">{activeAssistant.company || activeAssistant.role || 'Custom'}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveCompanyKey(null); }}
                data-tip="Clear company context"
                className="ml-0.5 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                style={{ lineHeight: 1 }}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </span>
          )}
        </div>

        {!embedded && (
          <div className="flex items-center gap-0.5">
            <button onClick={() => setMinimized(true)}
              className="p-1 rounded-md transition-colors hover:bg-[var(--cam-strip-icon-bg)]" style={{ color: 'var(--cam-strip-text)' }} data-tip="Minimize">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12h16" /></svg>
            </button>
            <button onClick={() => { setMaximized(!maximized); setPosition({ x: 0, y: 0 }); }}
              className="p-1 rounded-md transition-colors hover:bg-[var(--cam-strip-icon-bg)]" style={{ color: 'var(--cam-strip-text)' }} data-tip={maximized ? 'Restore' : 'Maximize'}>
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
            className={`shrink-0 flex flex-col overflow-hidden border-r transition-transform md:translate-x-0
              ${mobileRailOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
              md:relative md:w-[280px] md:max-w-none
              absolute md:static inset-y-0 left-0 z-40 w-[82vw] max-w-[320px]`}
            style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)', boxShadow: mobileRailOpen ? '0 10px 30px rgba(0,0,0,0.25)' : undefined }}
          >
            {/* Mobile-only header inside the drawer with a close button so
                touch users have an obvious dismiss. The scrim handles taps
                outside, but a visible X is the discoverable affordance. */}
            <div className="md:hidden shrink-0 flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-primary)' }}>Menu</span>
              <button
                onClick={() => setMobileRailOpen(false)}
                className="p-2 rounded-md"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close menu"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Capped at a third of the rail and scrolling inside itself: the
                story bank has no bound of its own, and as a fixed block in a
                flex column a long resume would push the questions list off the
                bottom — the exact failure this layout exists to prevent. */}
            <div className="shrink-0 max-h-[33%] overflow-auto">
              <StoryBankPanel
                stories={activeAssistant?.stories}
                activeArchetype={(() => {
                  const lastAi = [...messages].reverse().find(m => m.role === 'ai');
                  if (!lastAi && streamText) return getArchetype(streamText);
                  return lastAi ? getArchetype(lastAi.text) : null;
                })()}
              />
            </div>
            {/* The questions list owns every pixel between the story bank and
                the footer. It used to share the column with the enrollment
                nudge and the auto-answer switch, which pushed questions below
                the fold while the bottom half of the rail sat empty — those two
                now live in the pinned footer below. */}
            <div className="flex-1 min-h-0 overflow-auto p-3 space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] px-1" style={{ color: 'var(--text-muted)' }}>Questions</p>
              {messages.filter(m => m.role === 'user').length === 0 && !streaming && (
                <div className="py-2">
                  <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>Ask a question to get started</p>
                  <div className="space-y-1.5">
                    {['Tell me about yourself', 'Describe a conflict at work', 'Why should we hire you?', 'Your biggest weakness?'].map(s => (
                      <button key={s} onClick={() => { ask(s); setMobileRailOpen(false); }} className="w-full text-left px-3 py-2.5 md:py-2 rounded-lg text-[13px] md:text-[11px] transition-[background-color,border-color,color] active:scale-[0.98]" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.borderColor = 'var(--cam-primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; }}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {/* Live preview — shows each Whisper chunk immediately as it
                  arrives, before the accumulation flush fires. Clears
                  automatically when the question is sent. */}
              {liveTranscript && (
                <div className="px-3 py-2.5 md:py-2 rounded-lg text-[13px] md:text-[11px] font-medium flex items-start gap-2 animate-pulse"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--cam-primary)', color: 'var(--text-secondary)', opacity: 0.85 }}>
                  <div className="flex-1 min-w-0">
                    <p className="break-words">{liveTranscript}</p>
                    <span className="text-[8px] mt-1 block" style={{ color: 'var(--cam-primary)' }}>listening…</span>
                  </div>
                </div>
              )}
              {/* What Sona heard and what it did with it. Every one of these
                  outcomes used to be a silent return, which made "never heard
                  you", "heard you and ignored it" and "answering but nothing on
                  screen" indistinguishable. */}
              {embedded && heardLog.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Heard</span>
                    <button onClick={() => setHeardLog([])} className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }} data-tip="Clear this list">Clear</button>
                  </div>
                  {heardLog.map(h => (
                    <div key={h.id} className="px-2 py-1 rounded-md" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      <p className="text-[9px] leading-snug break-words" style={{ color: 'var(--text-secondary)' }}>{h.text}</p>
                      <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: h.outcome === 'answering' ? 'var(--cam-gold-leaf)' : 'var(--text-muted)' }}>
                        {h.outcome} · {h.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {/* Pending detected questions (behavioral tap-to-answer). These are
                  the transcribed lines that did NOT clear shouldAutoAnswer() —
                  softer or ambiguous prompts the user taps to answer. With
                  auto-answer off, every detected line lands here. */}
              {embedded && detectedQuestions.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--cam-gold-leaf)', fontFamily: 'var(--font-mono)' }}>Tap to answer</span>
                    <button onClick={() => setDetectedQuestions([])} className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }} data-tip="Clear all detected questions">Clear</button>
                  </div>
                  {[...detectedQuestions].reverse().map(q => (
                    <div
                      key={q.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => { setDetectedQuestions(prev => prev.filter(x => x.id !== q.id)); ask(q.text); setMobileRailOpen(false); }}
                      className="group flex items-start gap-2 px-3 py-2.5 md:py-2 rounded-lg cursor-pointer transition-colors"
                      style={{ background: 'var(--accent-subtle)', border: '1px solid var(--cam-gold-leaf)', color: 'var(--text-primary)' }}
                      data-tip="Answer this with Sona"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="break-words text-[13px] md:text-[11px] font-medium">{q.text}</p>
                        <span className="text-[8px] mt-1 block font-bold uppercase tracking-wide" style={{ color: 'var(--cam-gold-leaf)' }}>tap to answer · {q.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetectedQuestions(prev => prev.filter(x => x.id !== q.id)); }}
                        className="shrink-0 p-1 rounded-md transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        data-tip="Dismiss (don't answer)"
                        aria-label="Dismiss question"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Iterate the full messages array (not a filtered copy) so
                  each user message keeps its ORIGINAL index — the delete
                  button needs that index to find and remove the matching
                  AI answer. */}
              {messages.map((msg, origIdx) => msg.role !== 'user' ? null : (
                <div
                  key={origIdx}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    // Jump the answer panel to the AI reply that follows this
                    // question (the first 'ai' message after origIdx).
                    let aiIdx = -1;
                    for (let j = origIdx + 1; j < messages.length; j++) {
                      if (messages[j].role === 'ai') { aiIdx = j; break; }
                      if (messages[j].role === 'user') break; // answer not arrived yet
                    }
                    if (aiIdx >= 0) {
                      document.getElementById(`sona-answer-${aiIdx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    setMobileRailOpen(false);
                  }}
                  className="group px-3 py-2.5 md:py-2 rounded-lg text-[13px] md:text-[11px] font-medium flex items-start gap-2 cursor-pointer transition-colors"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cam-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
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
                    onClick={async (e) => {
                      e.stopPropagation(); // don't trigger the card's scroll-to-answer
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
                    data-tip="Delete this Q&A"
                    aria-label="Delete this Q&A"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                  </button>
                </div>
              ))}
            </div>
            {/* Rail footer — the enrollment nudge and the auto-answer switch,
                pinned under the list and collapsed to one line each. Both are
                status you glance at, not text you read twice; as full cards in
                the middle of the list they cost four question slots between
                them. The tooltips still carry the long explanation. */}
            {embedded && (
              <div className="shrink-0 border-t px-2 py-1.5 flex flex-col gap-1" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                {!voiceEnrolled && !enrollNudgeHidden && (
                  <div
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md"
                    style={{ background: 'var(--accent-subtle)', border: '1px solid var(--cam-gold-leaf)' }}
                    data-tip="Without a sample of your voice, your own answers can come back as questions. Takes five seconds."
                  >
                    <span className="min-w-0 flex-1 text-[9px] font-bold uppercase tracking-[0.12em] truncate" style={{ color: 'var(--cam-gold-leaf)', fontFamily: 'var(--font-mono)' }}>
                      {isEnrolling ? 'Listening — 5s' : 'Sona hears you too'}
                    </span>
                    {!isEnrolling && (
                      <>
                        <button
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('lumora:start-voice-enrollment'));
                            // The listener lives in VoiceEnrollment, mounted by the
                            // behavioral toolbar. If that toolbar isn't there, the
                            // event lands nowhere and the button would look dead —
                            // so say what happened instead of failing silently.
                            setTimeout(() => {
                              if (!useSessionStore.getState().isEnrolling) {
                                dialogAlert({
                                  title: 'Enrollment unavailable here',
                                  message: 'Use the voice chip in the toolbar above, or Settings → Voice, to record your 5-second sample.',
                                });
                              }
                            }, 2000);
                          }}
                          className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
                          style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-accent-fill-text, #0a0e1a)' }}
                          data-tip="Record a 5-second sample so Sona can tell your voice from the interviewer's"
                        >
                          Enroll
                        </button>
                        <button
                          onClick={() => setEnrollNudgeHidden(true)}
                          className="shrink-0 p-0.5 rounded"
                          style={{ color: 'var(--text-muted)' }}
                          data-tip="Hide for now — the voice chip in the toolbar always does this"
                          aria-label="Hide enrollment prompt"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setAutoAnswer(v => !v)}
                  className="flex items-center gap-2 px-2 py-1 rounded-md w-full text-left transition-colors"
                  style={{
                    background: autoAnswer ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                    border: `1px solid ${autoAnswer ? 'var(--cam-gold-leaf)' : 'var(--border)'}`,
                  }}
                  role="switch"
                  aria-checked={autoAnswer}
                  data-tip={autoAnswer
                    ? 'Every question Sona hears is answered automatically. Turn off to tap each one instead.'
                    : 'Nothing is answered automatically — every question Sona hears waits for a tap.'}
                >
                  <span
                    className="shrink-0 inline-flex items-center rounded-full transition-colors"
                    style={{
                      width: 24, height: 14, padding: 2,
                      background: autoAnswer ? 'var(--cam-gold-leaf)' : 'var(--border)',
                      justifyContent: autoAnswer ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <span className="block rounded-full" style={{ width: 10, height: 10, background: '#fff' }} />
                  </span>
                  <span className="min-w-0 flex-1 text-[9px] font-bold uppercase tracking-[0.12em] truncate" style={{ color: autoAnswer ? 'var(--cam-gold-leaf)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Auto-answer {autoAnswer ? 'on' : 'off'}
                  </span>
                </button>
              </div>
            )}
          </div>
          {/* Right: answers. Cards are width-capped at 880px (≈80-char
              line length, the typographic sweet spot for sustained
              reading) and centered in the available space. Without the
              cap, dense bullet lists stretched the full panel width
              (~1700px on a 16:10 monitor) and the eye couldn't track
              from line to line — that was the actual readability
              failure, not a color choice. */}
          <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto p-3 sm:p-4 md:p-5 min-w-0">
            {messages.filter(m => m.role === 'ai').length === 0 && !streaming ? (
              <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                <p className="text-sm md:text-xs px-4 text-center">Tap the menu to pick a starter question, or use the mic below.</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 mx-auto w-full" style={{ maxWidth: 880 }}>
                {messages.map((msg, i) => msg.role !== 'ai' ? null : (
                  <div
                    key={i}
                    id={`sona-answer-${i}`}
                    className="rounded-lg overflow-hidden group"
                    style={{
                      scrollMarginTop: 12,
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
                        borderBottom: '1px solid var(--cam-gold-leaf)',
                      }}
                    >
                      <SonaAvatar size={16} />
                      <span className="font-display text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--cam-strip-heading)' }}>Sona</span>
                      <span className="ml-auto flex items-center gap-1">
                        <button
                          onClick={() => navigator.clipboard.writeText(msg.text)}
                          className="p-1 rounded-md transition-colors"
                          style={{ color: 'var(--cam-strip-text)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cam-strip-heading)'; e.currentTarget.style.background = 'var(--cam-strip-icon-bg)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cam-strip-text)'; e.currentTarget.style.background = 'transparent'; }}
                          data-tip="Copy answer"
                          aria-label="Copy answer"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        </button>
                        <button
                          onClick={() => deleteQAPair(i)}
                          className="p-1 rounded-md transition-colors"
                          style={{ color: 'var(--cam-strip-text)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cam-strip-heading)'; e.currentTarget.style.background = 'var(--cam-strip-icon-bg)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cam-strip-text)'; e.currentTarget.style.background = 'transparent'; }}
                          data-tip="Delete this Q&A"
                          aria-label="Delete this Q&A"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                        </button>
                      </span>
                    </div>
                    <div className="p-4 sm:p-5 answer-flow">
                      <AnswerView text={msg.text} />
                      {msg.citations && msg.citations.length > 0 && (
                        <Citations citations={msg.citations} />
                      )}
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
                        borderBottom: '1px solid var(--cam-gold-leaf)',
                      }}
                    >
                      <SonaAvatar size={16} active />
                      <span className="font-display text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--cam-strip-heading)' }}>
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
          {composer}
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-3">
          {messages.length === 0 && !streaming ? (
            <div className="flex flex-col items-center justify-center h-full py-6">
              <div className="mb-4 opacity-40"><SonaAvatar size={32} /></div>
              <p className="text-[9px] mb-3 text-center" style={{ color: C.muted }}>
                {answerMode === 'short' ? 'Short mode — concise bullet points' : 'Detailed mode — comprehensive explanations'}
              </p>
              <div className="grid grid-cols-2 gap-1.5 w-full">
                {['Design a URL shortener', 'Explain TCP vs UDP', 'Tell me about a conflict', 'Detect cycle in linked list'].map(s => (
                  <button key={s} onClick={() => ask(s)} className="text-left px-2.5 py-2 rounded-lg transition-[background-color,border-color,color] active:scale-[0.98]"
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
                      borderBottom: '1px solid var(--cam-gold-leaf)',
                    }}
                  >
                    <SonaAvatar size={14} />
                    <span className="font-display text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--cam-strip-heading)' }}>Sona</span>
                  </div>
                  <div className="p-3 min-w-0">
                    <AnswerView text={msg.text} />
                    {msg.citations && msg.citations.length > 0 && (
                      <Citations citations={msg.citations} />
                    )}
                  </div>
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
                      borderBottom: '1px solid var(--cam-gold-leaf)',
                    }}
                  >
                    <SonaAvatar size={14} active />
                    <span className="font-display text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--cam-strip-heading)' }}>Sona is answering…</span>
                    {/* Skip — always visible while streaming, never hover-only:
                        the moment you need it is the moment you cannot hunt for
                        it. Esc does the same thing. */}
                    <button
                      onClick={skipCurrent}
                      className="ml-auto px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide shrink-0"
                      style={{ color: 'var(--cam-strip-heading)', border: '1px solid var(--cam-gold-leaf)' }}
                      data-tip="Skip this question — stops the answer and clears anything queued behind it (Esc)"
                      aria-label="Skip this question"
                    >
                      Skip · Esc
                    </button>
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

      {!embedded && composer}
    </div>
  );
}

export const AICompanionToggle = ({ onClick, hasActivity }: { onClick: () => void; hasActivity: boolean }) => {
  return (
    <button
      onClick={onClick}
      className="fixed right-6 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-[transform,box-shadow,opacity] hover:scale-105 active:scale-[0.98]"
      style={{
        // Float above the mobile bottom nav (56px + safe-area-inset)
        // so the toggle never overlaps the Home/Code/Design/Prep tabs.
        bottom: 'calc(80px + env(safe-area-inset-bottom))',
        background: 'var(--cam-primary)',
      }}
      data-tip="Sona"
    >
      <SonaAvatar size={22} active />
      {hasActivity && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--accent)] border-2" style={{ borderColor: C.base }} />}
    </button>
  );
}
