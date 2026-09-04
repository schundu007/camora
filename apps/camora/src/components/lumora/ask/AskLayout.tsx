import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import atomOneDark from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import cpp from 'react-syntax-highlighter/dist/esm/languages/hljs/cpp';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash';
import { StreamingMicButton } from './StreamingMicButton';
import { InterviewerListenButton } from './InterviewerListenButton';
import { useSpeakerAudio } from '@/components/lumora/audio/SpeakerAudio';
import { useSessionStore } from '@/stores/session-store';
import { resolveAskListenSource } from '@/lib/lumora/ask-listen-source';
import { snapRegion } from '@/lib/lumora/snapCapture';
import { dialogAlert } from '@/components/shared/Dialog';

SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('c', cpp);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sh', bash);

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

// Quiet window that closes an interviewer question while listening to the
// shared stream. The capture emits one chunk per VAD segment, so "Tell me about
// a time you disagreed with your manager" can arrive in two or three pieces;
// submitting each piece would ask Sona three half-questions. Same value the
// behavioral panel coalesces on.
const LISTEN_COALESCE_MS = 1200;

interface MsgImage { url?: string; dataUrl?: string }
interface Msg { role: 'user' | 'assistant'; content: string; images?: MsgImage[]; }
interface Conv { id: string; title: string; provider: string; updated_at: string; }

type Provider = 'claude' | 'gemini';

const SUGGESTIONS = [
  'Fill in the missing code for a binary search function',
  'Write a Python function to find all subsets of an array',
  'Explain each line of this code and fix any bugs',
  'Implement a LRU cache class with get and put methods',
];

// ── Syntax-highlighted code block ─────────────────────────────────────────────
const KNOWN_LANGS = new Set(['python','py','javascript','js','typescript','ts','java','go','sql','cpp','c','bash','sh']);

// An ASCII path sketch is not code. Sent through the highlighter it gets the
// python fallback, which colours arrows and component names at random and turns a
// diagram into confetti. These render as plain monospace instead.
const PLAIN_LANGS = new Set(['text', 'txt', 'plain', 'ascii', 'diagram', '']);

const CodeBlock = ({ code, lang }: { code: string; lang: string }) => {
  const normalizedLang = KNOWN_LANGS.has(lang?.toLowerCase()) ? lang.toLowerCase() : 'python';
  const [copied, setCopied] = useState(false);

  if (PLAIN_LANGS.has((lang || '').toLowerCase())) {
    return (
      <pre
        className="ask-code my-2 px-4 py-3 rounded-lg overflow-x-auto text-[12px] leading-[1.65]"
        data-overlay-keep
        style={{
          background: '#282c34',
          color: '#abb2bf',
          border: '1px solid rgba(255,255,255,0.12)',
          fontFamily: "var(--font-mono)",
          letterSpacing: '-0.02em',
        }}
      >
        {code.trim()}
      </pre>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="ask-code my-3 rounded-lg overflow-hidden" data-overlay-keep style={{ border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
      <div className="flex items-center justify-between px-3 py-1.5" style={{ background: '#1e222a', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span className="text-[12px] font-mono font-semibold uppercase tracking-widest" style={{ color: '#61afef' }}>{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="text-[12px] font-medium px-2 py-0.5 rounded transition-all"
          style={{
            color: copied ? '#98c379' : '#abb2bf',
            background: copied ? 'rgba(152,195,121,0.12)' : 'rgba(255,255,255,0.06)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={normalizedLang}
        style={atomOneDark}
        customStyle={{ margin: 0, padding: '14px 16px', fontSize: '14px', lineHeight: '1.65', fontFamily: "var(--font-mono)", letterSpacing: '-0.02em', WebkitFontSmoothing: 'antialiased', background: '#282c34', borderRadius: 0 }}
        showLineNumbers={false}
        wrapLongLines={false}
      >
        {code.trim()}
      </SyntaxHighlighter>
    </div>
  );
};

// Process inline markdown: **bold**, `code`
const inlineMarkdown = (raw: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) nodes.push(raw.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(<strong key={m.index} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{m[1]}</strong>);
    } else {
      nodes.push(<code key={m.index} style={{ padding: '1px 5px', background: 'rgba(30,77,120,0.12)', borderRadius: 4, color: '#1e4d78', fontFamily: "var(--font-mono)", fontSize: 14, letterSpacing: '-0.02em' }}>{m[2]}</code>);
    }
    last = m.index + m[0].length;
  }
  if (last < raw.length) nodes.push(raw.slice(last));
  return nodes;
};

// Pipe tables. Ten HTTP codes as ten bullet lines is a wall; the same ten as
// Code / Who emits it / What's wrong is one glance. The model emits standard
// markdown, so the parser only has to recognise a header row followed by a
// |---|---| rule. Scrolls inside its own box — a wide table must never push the
// answer column sideways.
const isTableRow = (s: string) => s.startsWith('|') && s.endsWith('|') && s.length > 2;
const isTableRule = (s: string) => isTableRow(s) && /^\|[\s:|-]+\|$/.test(s) && s.includes('-');
const tableCells = (s: string) => s.slice(1, -1).split('|').map((c) => c.trim());

const AnswerTable = ({ head, rows }: { head: string[]; rows: string[][] }) => (
  <div className="my-2 overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border-subtle, rgba(255,255,255,0.10))' }}>
    <table className="w-full border-collapse text-[13px]" style={{ fontFamily: 'var(--font-sans)' }}>
      <thead>
        <tr>
          {head.map((h, i) => (
            <th
              key={i}
              className="text-left px-3 py-2 text-[12px] font-bold uppercase tracking-widest whitespace-nowrap"
              style={{ color: 'var(--lum-accent-sm)', background: 'var(--lum-accent-bg)' }}
            >
              {inlineMarkdown(h)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))' }}>
            {head.map((_, j) => (
              <td
                key={j}
                className="px-3 py-2 align-top leading-relaxed"
                style={{ color: 'var(--text-secondary)', fontWeight: j === 0 ? 700 : 400 }}
              >
                {inlineMarkdown(r[j] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const renderContent = (text: string) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  const result: React.ReactNode[] = [];
  let key = 0;

  for (const part of parts) {
    if (part.startsWith('```')) {
      const inner = part.slice(3, -3);
      const nl = inner.indexOf('\n');
      const lang = nl > -1 ? inner.slice(0, nl).trim() : '';
      const code = nl > -1 ? inner.slice(nl + 1) : inner;
      result.push(<CodeBlock key={key++} code={code} lang={lang} />);
      continue;
    }
    if (!part.trim()) continue;

    // Render line-by-line so list items get proper treatment
    const lines = part.split('\n');
    const listItems: string[] = [];

    const flushList = () => {
      if (!listItems.length) return;
      result.push(
        <ul key={key++} className="space-y-1 my-1.5 ml-1">
          {listItems.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="w-1 h-1 rounded-full mt-[7px] shrink-0" style={{ background: 'var(--cam-primary)' }} />
              <span>{inlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      );
      listItems.length = 0;
    };

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // A header row followed by a |---|---| rule opens a table; consume every
      // row after it. Anything that only looks like a row (a lone piped line)
      // falls through to the paragraph path unchanged.
      if (isTableRow(trimmed) && isTableRule((lines[i + 1] || '').trim())) {
        flushList();
        const head = tableCells(trimmed);
        const rows: string[][] = [];
        let j = i + 2;
        for (; j < lines.length; j++) {
          const r = lines[j].trim();
          if (!isTableRow(r)) break;
          rows.push(tableCells(r));
        }
        result.push(<AnswerTable key={key++} head={head} rows={rows} />);
        i = j - 1;
        continue;
      }

      if (trimmed.match(/^[-*•]\s/)) {
        listItems.push(trimmed.replace(/^[-*•]\s/, ''));
      } else {
        flushList();
        if (trimmed) {
          result.push(
            <p key={key++} className="text-[13px] leading-relaxed my-0.5" style={{ color: 'var(--text-secondary)' }}>
              {inlineMarkdown(trimmed)}
            </p>
          );
        }
      }
    }
    flushList();
  }

  return result;
};

export const AskResponse = ({ content }: { content: string }) => {
  const sections = content.split(/^### /m).filter(Boolean);
  if (sections.length <= 1) return <div>{renderContent(content)}</div>;
  return (
    <div className="flex flex-col gap-4">
      {sections.map((sec, i) => {
        const nl = sec.indexOf('\n');
        const title = nl > -1 ? sec.slice(0, nl).trim() : sec.trim();
        const body = nl > -1 ? sec.slice(nl + 1) : '';
        return (
          <div key={i}>
            <p className="text-[12px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--lum-accent-sm)', fontFamily: 'var(--font-sans)' }}>
              {title}
            </p>
            <div>{renderContent(body)}</div>
          </div>
        );
      })}
    </div>
  );
};

const HISTORY_KEY = 'sona_ask_history';
const HISTORY_MAX = 50;

// ── Main component ────────────────────────────────────────────────────────────
export const AskLayout = () => {
  const { user } = useAuth() as any;
  const firstName = user?.name?.split(' ')[0] || 'there';

  const [messages, setMessages]         = useState<Msg[]>([]);
  const [input, setInput]               = useState('');
  const [streaming, setStreaming]       = useState(false);
  const [streamText, setStreamText]     = useState('');
  // Fixed, not state: ascend-backend serves Ask and never calls Anthropic, so
  // there is nothing to switch between. Still sent on every request and stored
  // per conversation so the field keeps its meaning.
  const provider: Provider = 'gemini';
  const [convId, setConvId]             = useState<string | null>(null);
  const [history, setHistory]           = useState<Conv[]>([]);
  const [showHistory, setShowHistory]   = useState(false);
  // Pasted / dropped screenshots staged for the next message (data URLs).
  const [pending, setPending]           = useState<{ id: string; dataUrl: string }[]>([]);
  // Bumped by the Space shortcut to toggle the dictation mic.
  const [micToggle, setMicToggle]       = useState(0);
  // Shell-style ↑/↓ recall of questions you've sent — typed or dictated alike,
  // since dictation lands in the composer and submits through the same path.
  // Newest first; survives conversation switches and reloads.
  const [sentHistory, setSentHistory]   = useState<string[]>(() => {
    try { return (JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as string[]).slice(0, HISTORY_MAX); }
    catch { return []; }
  });
  // -1 = not browsing history. draftRef stashes the half-written question so
  // ↓ back past the newest entry restores it.
  const [histIdx, setHistIdx]           = useState(-1);
  const draftRef = useRef('');

  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dictationBaseRef = useRef(''); // input text captured when dictation starts
  // Sending bumps submitSeq. A dictation session records the seq it started
  // under, so the late-arriving Whisper final (it lands ~1s after you stop the
  // mic) is discarded if you already sent — otherwise it would re-fill the
  // composer with the question you just asked, and the next dictation would
  // append to it, snowballing every prior question into the box.
  const submitSeqRef = useRef(0);
  const dictationSeqRef = useRef(0);
  // Set when dictation ended because the speaker went quiet (not because they
  // clicked stop) — onFinal reads it to decide whether to send automatically.
  const autoSendRef = useRef(false);
  // Aborts the in-flight Ask stream so a stale answer can't land in a fresh /
  // switched / deleted conversation.
  const askAbortRef = useRef<AbortController | null>(null);
  const hasMessages = messages.length > 0;

  const MAX_PENDING = 4;
  const addImageFiles = useCallback((files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith('image/'));
    if (!imgs.length) return;
    imgs.slice(0, MAX_PENDING).forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        if (dataUrl.startsWith('data:image/')) {
          setPending(prev => prev.length >= MAX_PENDING ? prev : [...prev, { id: `${f.name}-${dataUrl.length}-${prev.length}`, dataUrl }]);
        }
      };
      reader.readAsDataURL(f);
    });
  }, []);

  const onComposerPaste = useCallback((e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData?.items || [])
      .filter(it => it.kind === 'file' && it.type.startsWith('image/'))
      .map(it => it.getAsFile())
      .filter((f): f is File => !!f);
    if (files.length) { e.preventDefault(); addImageFiles(files); }
  }, [addImageFiles]);

  const onComposerDrop = useCallback((e: React.DragEvent) => {
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.some(f => f.type.startsWith('image/'))) { e.preventDefault(); addImageFiles(files); }
  }, [addImageFiles]);

  // Take a screenshot straight into the composer. Paste and drag-drop already
  // worked, but neither is discoverable — the only thing that ever said so was
  // one line of grey hint text. Reuses the shared snapRegion path: macOS
  // crosshair on the desktop app, the browser's share picker on web.
  const [snapping, setSnapping] = useState(false);
  const snapIntoComposer = useCallback(async () => {
    if (snapping) return;
    setSnapping(true);
    try {
      const res = await snapRegion();
      if (res.cancelled) return;               // Escape is not an error — stay silent
      if (!res.dataUrl) { if (res.error) dialogAlert({ title: 'Screenshot failed', message: res.error }); return; }
      setPending(prev => prev.length >= MAX_PENDING
        ? prev
        : [...prev, { id: `snap-${Date.now()}-${prev.length}`, dataUrl: res.dataUrl }]);
      inputRef.current?.focus();
    } finally {
      setSnapping(false);
    }
  }, [snapping]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  // Load conversation history on mount
  useEffect(() => {
    fetch(`${API_URL}/api/v1/ask/history`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setHistory(d.conversations || []))
      .catch(() => {});
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    askAbortRef.current?.abort();
    setStreaming(false); setStreamText('');
    try {
      const r = await fetch(`${API_URL}/api/v1/ask/history/${id}`, { credentials: 'include' });
      const d = await r.json();
      // Images come back as absolute presigned R2 URLs — use directly.
      setMessages((d.messages || []) as Msg[]);
      setConvId(id);
      setShowHistory(false);
    } catch {}
  }, []);

  const deleteConversation = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API_URL}/api/v1/ask/history/${id}`, { method: 'DELETE', credentials: 'include' });
      setHistory(prev => prev.filter(c => c.id !== id));
      if (convId === id) { askAbortRef.current?.abort(); setStreaming(false); setStreamText(''); setMessages([]); setConvId(null); }
    } catch {}
  }, [convId]);

  const clearAllHistory = useCallback(async () => {
    askAbortRef.current?.abort();
    setStreaming(false); setStreamText('');
    try {
      await fetch(`${API_URL}/api/v1/ask/history`, { method: 'DELETE', credentials: 'include' });
      setHistory([]);
      setMessages([]);
      setConvId(null);
      setShowHistory(false);
    } catch {}
  }, []);

  const handleSubmit = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    const imgs = pending;
    if ((!msg && imgs.length === 0) || streaming) return;
    setInput('');
    submitSeqRef.current += 1;
    dictationBaseRef.current = '';
    setHistIdx(-1);
    draftRef.current = '';
    if (msg) {
      setSentHistory(prev => {
        const next = [msg, ...prev.filter(q => q !== msg)].slice(0, HISTORY_MAX);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
    }
    setPending([]);
    setMessages(prev => [...prev, { role: 'user', content: msg, images: imgs.map(i => ({ dataUrl: i.dataUrl })) }]);
    setStreaming(true);
    setStreamText('');

    // Supersede any prior in-flight stream and track this one.
    askAbortRef.current?.abort();
    const controller = new AbortController();
    askAbortRef.current = controller;

    try {
      const body = JSON.stringify({
        message: msg,
        history: messages.map(m => ({ role: m.role, content: m.content })),
        provider,
        conversationId: convId,
        images: imgs.map(i => i.dataUrl),
      });
      const resp = await fetch(`${API_URL}/api/v1/ask/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body,
        signal: controller.signal,
      });
      if (!resp.ok || !resp.body) throw new Error('stream failed');

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let full = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.conversationId) setConvId(parsed.conversationId);
            if (parsed.text) { full += parsed.text; setStreamText(full); }
            if (parsed.error) { full = `Error: ${parsed.error}`; break; }
          } catch {}
        }
      }

      // Superseded mid-flight → don't append into the conversation that replaced it.
      if (askAbortRef.current !== controller) return;

      if (full) {
        setMessages(prev => [...prev, { role: 'assistant', content: full }]);
        if (!full.startsWith('Error:')) {
          fetch(`${API_URL}/api/v1/ask/history`, { credentials: 'include' })
            .then(r => r.json()).then(d => setHistory(d.conversations || [])).catch(() => {});
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'No response received. Please try again.' }]);
      }
    } catch (err: any) {
      // Aborted by a supersede (New/switch/load/delete) — stay silent.
      if (err?.name === 'AbortError' || askAbortRef.current !== controller) return;
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      // Only the current stream owns the UI state; a superseded one must not
      // flip streaming off for the answer that replaced it.
      if (askAbortRef.current === controller) {
        askAbortRef.current = null;
        setStreaming(false);
        setStreamText('');
        inputRef.current?.focus();
      }
    }
  }, [input, pending, messages, streaming, provider, convId]);

  /* ── Listening to the interviewer ──────────────────────────────────────
   *
   * The mic button opens no microphone while a stream that carries the
   * interviewer — and not the candidate — is live. It subscribes the composer
   * to the shell's shared capture instead, which LumoraShellPage forwards as
   * `lumora:ask-question`.
   *
   * Why: the dictation mic is one microphone in the room. In an interview it
   * heard the interviewer through the candidate's speakers AND the candidate
   * answering, and because an utterance only ended after 2s of true silence —
   * which a live interview never gives you — the recording never closed. Both
   * voices landed in the composer and went out as one question, and nothing
   * auto-sent. See lib/lumora/ask-listen-source.ts for which streams qualify.
   */
  const speaker = useSpeakerAudio();
  const { voiceEnrolled, voiceFilterEnabled } = useSessionStore();
  const listenSource = resolveAskListenSource({
    speakerActive: speaker.active,
    method: speaker.method,
    voiceFilterActive: voiceEnrolled && voiceFilterEnabled,
  });
  const [listening, setListening] = useState(false);

  // Questions that arrived while Sona was still answering the previous one.
  // handleSubmit drops a call outright when `streaming` is true, so without
  // this an interviewer asking a follow-up mid-answer would be silently lost —
  // the same "it didn't submit" symptom, in a different place. Mirrors the FIFO
  // drain in AICompanionPanel.
  const askQueueRef = useRef<string[]>([]);
  // Coalescing: the capture emits one chunk per VAD segment, so a single spoken
  // question can arrive as two or three fragments. Each fragment restarts the
  // quiet window; the assembled question is submitted once it closes.
  const coalesceRef = useRef('');
  const coalesceTimerRef = useRef<number | null>(null);
  // What we last wrote into the composer, so a preview only ever overwrites our
  // own preview — never something the user typed.
  const listenPreviewRef = useRef('');
  const inputMirrorRef = useRef('');
  useEffect(() => { inputMirrorRef.current = input; }, [input]);

  // `streaming` read inside the coalesce timer would be the value captured when
  // the timer was armed — which is exactly when it was still false. Declared
  // before its reader: const has a temporal dead zone.
  const streamingRef = useRef(streaming);
  useEffect(() => { streamingRef.current = streaming; }, [streaming]);

  // handleSubmit is rebuilt on every keystroke (it closes over `input`,
  // `messages`, `pending`…). Reaching it through a ref is not a style choice:
  // if the listener effect below depended on its identity, every preview write
  // would tear the effect down, and the cleanup would wipe the half-assembled
  // question and cancel its flush timer — the very "it never submits" bug this
  // whole change exists to fix, rebuilt one layer up.
  const submitRef = useRef(handleSubmit);
  useEffect(() => { submitRef.current = handleSubmit; }, [handleSubmit]);

  const submitOrQueue = useCallback((text: string) => {
    if (streamingRef.current) { askQueueRef.current.push(text); return; }
    submitRef.current(text);
  }, []);

  useEffect(() => {
    if (!streaming && askQueueRef.current.length > 0) {
      const next = askQueueRef.current.shift()!;
      submitRef.current(next);
    }
  }, [streaming]);

  // A stream that stops, drops, or loses its voice filter mid-session must not
  // leave the button claiming to listen to something that is no longer there.
  useEffect(() => {
    if (listenSource !== 'interviewer') setListening(false);
  }, [listenSource]);

  useEffect(() => {
    if (!listening || listenSource !== 'interviewer') return;
    const flush = () => {
      coalesceTimerRef.current = null;
      const full = coalesceRef.current.trim();
      coalesceRef.current = '';
      listenPreviewRef.current = '';
      if (full) submitOrQueue(full);
    };
    const handler = (e: Event) => {
      const text = (e as CustomEvent<{ text?: string }>).detail?.text?.trim();
      if (!text) return;
      const buf = coalesceRef.current;
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
      // The same utterance arriving twice must not be appended to itself.
      if (!buf) coalesceRef.current = text;
      else if (!norm(buf).includes(norm(text))) coalesceRef.current = `${buf} ${text}`;
      // Show what Sona is hearing, but never clobber a draft the user typed.
      if (inputMirrorRef.current === listenPreviewRef.current) {
        listenPreviewRef.current = coalesceRef.current;
        setInput(coalesceRef.current);
      }
      if (coalesceTimerRef.current) clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = window.setTimeout(flush, LISTEN_COALESCE_MS);
    };
    window.addEventListener('lumora:ask-question', handler);
    return () => {
      window.removeEventListener('lumora:ask-question', handler);
      if (coalesceTimerRef.current) { clearTimeout(coalesceTimerRef.current); coalesceTimerRef.current = null; }
      coalesceRef.current = '';
      listenPreviewRef.current = '';
    };
  }, [listening, listenSource, submitOrQueue]);

  const startNew = () => {
    askAbortRef.current?.abort();
    setStreaming(false);
    setMessages([]);
    setConvId(null);
    setStreamText('');
    setShowHistory(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const sans: React.CSSProperties = { fontFamily: 'var(--font-sans)' };

  // Grow the composer with the question instead of scrolling a one-line box —
  // long dictated questions stay fully visible up to the max-height.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 256)}px`;
  }, [input]);

  // Load a history entry into the composer (idx -1 restores the stashed draft)
  // and park the caret at the end so you can keep typing / hit ↵ straight away.
  const applyHistory = useCallback((idx: number) => {
    const text = idx < 0 ? draftRef.current : (sentHistory[idx] ?? '');
    setHistIdx(idx);
    setInput(text);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) { el.focus(); el.setSelectionRange(text.length, text.length); }
    });
  }, [sentHistory]);

  // ↑/↓ walk sent questions, but only from the edges of the composer so the
  // arrows still move the caret normally inside a multi-line draft.
  const onComposerArrows = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.shiftKey || e.altKey || e.metaKey || e.ctrlKey || sentHistory.length === 0) return;
    const el = e.currentTarget;
    const collapsed = el.selectionStart === el.selectionEnd;
    if (!collapsed) return;
    if (e.key === 'ArrowUp' && el.selectionStart === 0) {
      if (histIdx === -1) draftRef.current = el.value;
      e.preventDefault();
      applyHistory(Math.min(histIdx + 1, sentHistory.length - 1));
    } else if (e.key === 'ArrowDown' && el.selectionStart === el.value.length && histIdx >= 0) {
      e.preventDefault();
      applyHistory(histIdx - 1);
    }
  }, [sentHistory, histIdx, applyHistory]);

  // Single-stroke shortcut: Space toggles dictation when you're not mid-typing
  // (composer empty or focus outside it). Esc stops an active dictation. Plain
  // Space still types a space when the composer already has text.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      const inEmptyComposer = el === inputRef.current && !input.trim();
      // Don't hijack Space where it has a native meaning: typing in a field, or
      // activating a focused button/link. Fire from empty composer or plain
      // page background only.
      const interactive = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' ||
        tag === 'A' || tag === 'SELECT' || !!el?.isContentEditable || el?.getAttribute('role') === 'button';
      if (!interactive || inEmptyComposer) {
        e.preventDefault();
        // Same stroke, whichever source the button is currently on — the user
        // presses Space to "start listening", not to pick a capture path.
        if (listenSource === 'interviewer') setListening(v => !v);
        else setMicToggle(n => n + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [input, listenSource]);

  return (
    <div className="flex flex-row h-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      {/* History — collapsible LEFT sidebar. Hidden by default; the top-bar
          "History (N)" chip brings it back in one click, the ‹ chevron here
          collapses it. Replaces the old top drop-down that covered the chat. */}
      {showHistory && (
        <aside className="shrink-0 w-[260px] h-full flex flex-col border-r" style={{ borderColor: 'var(--lum-border)', background: 'var(--lum-bg)' }}>
          <div className="flex items-center justify-between px-3 h-12 shrink-0 border-b" style={{ borderColor: 'var(--lum-border)' }}>
            <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--lum-accent)', ...sans }}>
              History ({history.length})
            </span>
            <div className="flex items-center gap-1">
              {history.length > 0 && (
                <button onClick={clearAllHistory} className="text-[12px] px-2 py-1 rounded transition-colors hover:bg-[var(--danger)]/30" style={{ color: 'var(--danger)', ...sans }}>
                  Clear
                </button>
              )}
              <button onClick={() => setShowHistory(false)} data-tip="Collapse history" aria-label="Collapse history" className="p-1 rounded transition-colors hover:bg-[var(--lum-surface-hover)]" style={{ color: 'var(--lum-accent)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <p className="p-4 text-[12px]" style={{ color: 'var(--lum-text-2)', ...sans }}>No history yet</p>
            ) : history.map(c => (
              <div key={c.id} className="flex items-center gap-2 border-b hover:bg-[var(--lum-surface-hover)] transition-colors" style={{ borderColor: 'var(--lum-border)' }}>
                <button onClick={() => loadConversation(c.id)} className="flex-1 text-left px-3 py-2.5 text-[13px] flex flex-col gap-1 min-w-0" style={{ color: 'var(--lum-text-2)', ...sans }}>
                  <span className="truncate w-full">{c.title}</span>
                  <span className="text-[12px] px-1.5 py-0.5 rounded self-start" style={{ background: 'var(--lum-accent-bg)', color: 'var(--lum-accent)' }}>{c.provider}</span>
                </button>
                <button onClick={e => deleteConversation(c.id, e)} className="shrink-0 mr-2 p-1 rounded hover:bg-[var(--danger)]/40 transition-colors" data-tip="Delete conversation" style={{ color: 'var(--danger)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                </button>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">

      {/* Top bar — navy strip with gold-leaf border */}
      <div className="flex items-center justify-between px-5 h-12 shrink-0 lumora-winctl-safe" style={{ background: 'var(--lum-accent)', borderBottom: '1px solid var(--lum-accent-sm)' }}>
        <div className="flex items-center gap-2">
          {hasMessages && (
            <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors hover:bg-white/20" style={{ color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.45)', ...sans }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New
            </button>
          )}
        </div>
        <span className="text-[12px] uppercase tracking-widest font-bold" style={{ color: '#FFFFFF', ...sans }}>Ask Sona</span>
        {/* Single-click chip: opens the left History sidebar (collapse lives
            inside the sidebar). Hidden while the sidebar is open so there's one
            unambiguous control at a time. */}
        {!showHistory && (
          <button
            onClick={() => setShowHistory(true)}
            data-tip="Show conversation history"
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.45)', ...sans }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            History ({history.length})
          </button>
        )}
      </div>

      {/* Messages / empty state */}
      {hasMessages ? (
        <div className="flex-1 min-h-0 overflow-y-auto py-6" style={{ paddingLeft: 'max(1rem, calc(50% - 390px))', paddingRight: 'max(1rem, calc(50% - 390px))' }}>
          {messages.map((m, i) => (
            <div key={i} className={`mb-6 ${m.role === 'user' ? 'flex justify-end' : ''}`}>
              {m.role === 'user' ? (
                <div className="max-w-[75%] flex flex-col items-end gap-2">
                  {!!m.images?.length && (
                    <div className="flex flex-wrap gap-2 justify-end">
                      {m.images.map((im, k) => (
                        <img
                          key={k}
                          src={im.url || im.dataUrl}
                          alt="attachment"
                          className="rounded-lg max-h-40 object-cover"
                          style={{ border: '1px solid var(--lum-border-strong)' }}
                        />
                      ))}
                    </div>
                  )}
                  {m.content && (
                    <div className="px-4 py-2.5 rounded-2xl text-[14px]" style={{ background: 'var(--lum-accent)', border: '1px solid var(--lum-accent-sm)', color: '#FFFFFF', ...sans }}>
                      {m.content}
                    </div>
                  )}
                </div>
              ) : (
                <AskResponse content={m.content} />
              )}
            </div>
          ))}
          {streaming && (
            <div className="mb-6">
              {streamText ? (
                <>
                  <AskResponse content={streamText} />
                  <span className="inline-block w-1.5 h-4 animate-pulse ml-0.5 align-middle rounded-sm" style={{ background: 'var(--lum-accent)' }} />
                </>
              ) : (
                <div className="flex items-center gap-1.5 mt-2">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--lum-accent)', animationDelay: `${d}ms` }} />
                  ))}
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 overflow-y-auto">
          <h1 className="text-[26px] font-semibold mb-8 text-center" style={{ color: 'var(--text-primary)', ...sans }}>
            Hey <span style={{ color: 'var(--lum-accent)' }}>{firstName}</span>, what's on your mind?
          </h1>
          <div className="flex flex-col gap-2 mb-6 w-full" style={{ maxWidth: 640 }}>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSubmit(s)}
                className="flex items-center gap-3 text-left px-4 py-3 rounded-xl transition-all hover:bg-[var(--bg-elevated)] active:scale-[0.99]"
                style={{ color: 'var(--text-secondary)', fontSize: 13, background: 'var(--lum-surface)', border: '1px solid var(--lum-border)', ...sans }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--lum-accent)', flexShrink: 0 }}>
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--lum-border)', background: 'var(--lum-surface)' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {/* Provider toggle removed: Ask runs on ascend-backend, which does not
              spend Anthropic keys (Claude belongs to lumora-backend), so the
              Claude chip offered a model the service will never call — the same
              "nothing tells you which model answered" confusion the toggle was
              added to fix, just inverted. `provider` is still sent on the
              request and stored per conversation, so restoring the toggle is a
              UI-only change if Ask ever moves services. */}
          {/* Input box */}
          <div
            className="relative rounded-2xl flex flex-col"
            style={{ background: 'var(--lum-surface)', border: '1px solid var(--lum-border-strong)', boxShadow: 'var(--lum-shadow)' }}
            onDrop={onComposerDrop}
            onDragOver={e => e.preventDefault()}
          >
            {/* Staged screenshot thumbnails */}
            {pending.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pt-3">
                {pending.map((p) => (
                  <div key={p.id} className="relative">
                    <img src={p.dataUrl} alt="pending attachment" className="h-16 w-16 object-cover rounded-lg" style={{ border: '1px solid var(--lum-border-strong)' }} />
                    <button
                      onClick={() => setPending(prev => prev.filter(x => x.id !== p.id))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold"
                      style={{ background: 'var(--lum-bg)', border: '1px solid var(--lum-border-strong)', color: 'var(--lum-text)' }}
                      aria-label="Remove image"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); if (histIdx !== -1) setHistIdx(-1); }}
              onPaste={onComposerPaste}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); return; }
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') onComposerArrows(e);
              }}
              placeholder="Ask anything… (↑ past questions · paste or drop a screenshot)"
              rows={1}
              className="flex-1 min-w-0 resize-none px-2 py-2 min-h-[40px] max-h-64 overflow-y-auto text-[15px] leading-relaxed bg-transparent focus:outline-none placeholder:opacity-40"
              style={{ color: 'var(--text-primary)', ...sans }}
            />
            {/* Controls sit to the RIGHT of the box and the textarea grows with
                the question, so nothing ever overlaps the text. */}
              <div className="flex items-center gap-2 shrink-0 pb-1">
                {/* Screenshot → composer. Same crosshair / share-picker path as
                    every other camera button in Lumora. Paste and drag-drop
                    already worked; nothing on screen said so, which is the same
                    as not having it. */}
                <button
                  type="button"
                  onClick={snapIntoComposer}
                  disabled={snapping || streaming || pending.length >= MAX_PENDING}
                  data-tip={pending.length >= MAX_PENDING
                    ? `Up to ${MAX_PENDING} images per question`
                    : 'Screenshot — drag to select any area and ask about it. Pasting or dropping an image works too.'}
                  aria-label="Add a screenshot"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40 hover:opacity-85"
                  style={{ background: 'var(--lum-bg)', border: '1px solid var(--lum-border-strong)' }}
                >
                  {snapping ? (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" style={{ color: 'var(--text-muted)' }} />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lum-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  )}
                </button>
                {/* Live dictation — text types into the composer as you talk
                    (re-transcribes the growing clip ~1/sec via the backend, so
                    it works in both web and the Electron desktop app). The
                    transcript is appended after whatever was already typed.
                    Space toggles it (single-stroke) when not mid-typing. */}
                {listenSource === 'interviewer' ? (
                  <InterviewerListenButton
                    listening={listening}
                    onToggle={() => setListening(v => !v)}
                  />
                ) : (
                <StreamingMicButton
                  toggleSignal={micToggle}
                  onStart={() => {
                    dictationSeqRef.current = submitSeqRef.current;
                    dictationBaseRef.current = input;
                    autoSendRef.current = false;
                    setHistIdx(-1);
                  }}
                  onInterim={(t) => {
                    if (dictationSeqRef.current !== submitSeqRef.current) return;
                    const base = dictationBaseRef.current.trim();
                    setInput(base && t ? base + ' ' + t : (t || base));
                  }}
                  // Speaking and then stopping IS the send. One press, talk,
                  // done — instead of click mic, click mic again, click send.
                  onSilenceStop={() => { autoSendRef.current = true; }}
                  onFinal={(t) => {
                    const send = autoSendRef.current;
                    autoSendRef.current = false;
                    if (dictationSeqRef.current !== submitSeqRef.current) return;
                    const base = dictationBaseRef.current.trim();
                    const next = base && t ? base + ' ' + t : (t || base);
                    setInput(next);
                    dictationBaseRef.current = next;
                    // Pass the text explicitly — `input` state has not committed
                    // yet on this tick, so handleSubmit() with no argument would
                    // read the pre-dictation value and send the wrong thing.
                    if (send && next.trim()) handleSubmit(next);
                  }}
                  disabled={streaming}
                />
                )}
                <button
                  onClick={() => handleSubmit()}
                  disabled={(!input.trim() && pending.length === 0) || streaming}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30 hover:opacity-85"
                  style={{ background: 'var(--lum-accent)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0e1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>{/* /Main column */}
    </div>
  );
};
