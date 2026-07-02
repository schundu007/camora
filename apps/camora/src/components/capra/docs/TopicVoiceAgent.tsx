/**
 * TopicVoiceAgent — a compact voice bar for any Prepare topic (no popup).
 *
 * Read  : highlights the topic's OWN content in place (blocks under
 *         `.prep-content`) and reads them aloud — no duplicated text.
 * Teach : one crisp spoken explanation (≤60 words), markdown stripped.
 * Quiz  : speaks a question → mic answer → short spoken grade.
 * Ask   : mic → short spoken answer grounded in the topic.
 *
 * Reuses transcribe + streamResponse (like PracticePanel); speaks via
 * useSonaVoice. No sonaRegistry / voice-router / useSessionStore coupling.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { streamResponse } from '@/lib/sse-client';
import { stripInlineMarkdown } from '@/lib/text-utils';
import { SonaMicButton } from '@/components/lumora/shell/SonaMicButton';
import { Icon } from '@/components/shared/Icons';
import { useSonaVoice } from './useSonaVoice';
import {
  buildSystemContext,
  buildDirective,
  pickQuizQuestions,
  type VoiceMode,
} from '@/lib/topic-voice-context';

const MODES: Array<{ id: VoiceMode; label: string; llm: boolean }> = [
  { id: 'read', label: 'Read', llm: false },
  { id: 'teach', label: 'Teach', llm: true },
  { id: 'quiz', label: 'Quiz', llm: true },
  { id: 'ask', label: 'Ask', llm: true },
];

const HL_CLASS = 'sona-read-hl';
const HL_STYLE_ID = 'sona-read-style';

/** Strip markdown/headings so nothing is spoken or shown as raw **bold** / #head. */
const clean = (s: string): string =>
  stripInlineMarkdown(s || '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

function ensureHighlightStyle() {
  if (typeof document === 'undefined' || document.getElementById(HL_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = HL_STYLE_ID;
  el.textContent = `.${HL_CLASS}{background:color-mix(in oklab, var(--accent) 15%, transparent);box-shadow:-3px 0 0 0 var(--accent);border-radius:4px;transition:background .2s ease;}`;
  document.head.appendChild(el);
}

interface Props {
  topic: any;
  open: boolean;
  onClose: () => void;
  locked?: boolean;
}

export default function TopicVoiceAgent({ topic, open, onClose, locked = false }: Props) {
  const { token } = useAuth();
  const [mode, setMode] = useState<VoiceMode>('read');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const voice = useSonaVoice({ rate: 1 });

  const systemContext = useMemo(() => (topic ? buildSystemContext(topic) : ''), [topic]);
  const quizQuestions = useMemo(() => (topic ? pickQuizQuestions(topic) : []), [topic]);

  // ── Read-along: highlight the topic's real content blocks in place ──
  const readEls = useRef<HTMLElement[]>([]);
  const readIdx = useRef(0);
  const readActive = useRef(false);

  const clearHighlight = useCallback(() => {
    readEls.current.forEach((e) => e.classList.remove(HL_CLASS));
  }, []);

  const stopRead = useCallback(() => {
    readActive.current = false;
    voice.cancel();
    clearHighlight();
    setReading(false);
  }, [voice, clearHighlight]);

  const readNext = useCallback(() => {
    if (!readActive.current) return;
    const els = readEls.current;
    const i = readIdx.current;
    if (i >= els.length) { readActive.current = false; setReading(false); clearHighlight(); return; }
    clearHighlight();
    const el = els[i];
    el.classList.add(HL_CLASS);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setCaption((el.textContent || '').trim().slice(0, 140));
    voice.speakOne(el.textContent || '', () => {
      if (!readActive.current) return;
      readIdx.current = i + 1;
      readNext();
    });
  }, [voice, clearHighlight]);

  const startRead = useCallback(() => {
    stopRead();
    ensureHighlightStyle();
    const nodes = document.querySelectorAll(
      '.prep-content h1, .prep-content h2, .prep-content h3, .prep-content h4, .prep-content p, .prep-content li',
    );
    const els = (Array.from(nodes) as HTMLElement[]).filter(
      (e) => (e.textContent || '').trim().length > 1 && e.offsetParent !== null,
    );
    if (!els.length) { setCaption('No readable content found on this topic.'); return; }
    readEls.current = els;
    readIdx.current = 0;
    readActive.current = true;
    setReading(true);
    readNext();
  }, [stopRead, readNext]);

  // ── LLM modes (Teach / Quiz / Ask): short, clean, spoken ──
  const runLLM = useCallback(async (userText: string) => {
    if (!token) return;
    abortRef.current?.abort();
    voice.cancel();
    setBusy(true);
    setCaption('…');
    let full = '';
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const question = mode === 'quiz'
      ? `Question: ${quizQuestions[quizIdx] || ''}\nUser's spoken answer: ${userText}`
      : userText;
    const ctx = `${buildDirective(mode)}\n\n${systemContext}`;
    try {
      await streamResponse({
        question,
        token,
        systemContext: ctx,
        mode: 'behavioral',
        signal: ctrl.signal,
        onToken: (data: any) => {
          const t = typeof data === 'string' ? data : (data?.t ?? data?.token ?? data?.text ?? data?.content ?? '');
          if (t) { full += t; setCaption(clean(full)); }
        },
        onError: () => { setCaption(clean(full) || 'Sorry — please try again.'); },
        onComplete: () => {},
      } as any);
    } catch {
      setCaption(clean(full) || 'Sorry — something went wrong.');
    } finally {
      const spoken = clean(full);
      setCaption(spoken || '(no answer)');
      if (spoken) voice.speak(spoken);        // speak the whole short, clean reply
      setBusy(false);
      if (mode === 'quiz' && quizQuestions.length) setQuizIdx((n) => (n + 1) % quizQuestions.length);
    }
  }, [token, mode, quizIdx, quizQuestions, systemContext, voice]);

  const onMicText = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    voice.cancel();               // barge-in
    setCaption(`“${t}”`);
    runLLM(t);
  }, [runLLM, voice]);

  const askQuizQuestion = useCallback(() => {
    const q = quizQuestions[quizIdx];
    if (!q) return;
    voice.cancel();
    setCaption(q);
    voice.speak(q);
  }, [quizQuestions, quizIdx, voice]);

  const switchMode = useCallback((m: VoiceMode) => {
    stopRead();
    voice.cancel();
    setMode(m);
    setCaption('');
  }, [stopRead, voice]);

  const handleClose = useCallback(() => {
    stopRead();
    voice.cancel();
    onClose();
  }, [stopRead, voice, onClose]);

  // Cleanup on unmount / close so highlights never linger on the page.
  useEffect(() => {
    if (!open) { stopRead(); voice.cancel(); }
    return () => { readActive.current = false; clearHighlight(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const active = MODES.find((m) => m.id === mode);
  const llmLocked = locked && !!active?.llm;

  return (
    <div
      role="dialog"
      aria-label={`Voice — ${topic?.title || 'topic'}`}
      style={{
        position: 'fixed', left: '50%', bottom: 16, transform: 'translateX(-50%)',
        width: 'min(720px, 96vw)', zIndex: 60,
        background: 'var(--bg-elevated)', border: '1px solid var(--cam-gold-leaf)',
        borderRadius: 14, boxShadow: '0 18px 50px -22px rgba(20,20,40,0.55)',
        padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      {/* Row 1 — modes + actions + mic + close */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: '50%', background: 'var(--cam-primary)', color: '#fff', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="sparkles" size={14} />
        </span>
        <div style={{ display: 'flex', gap: 5 }}>
          {MODES.map((m) => (
            <button key={m.id} type="button" className={`chip ${mode === m.id ? 'chip-active' : ''}`} onClick={() => switchMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {mode === 'read' && (
            reading
              ? <button type="button" className="btn-secondary" onClick={stopRead}>■ Stop</button>
              : <button type="button" className="btn-primary" onClick={startRead}>▶ Read aloud</button>
          )}
          {mode === 'quiz' && !llmLocked && (
            <button type="button" className="btn-primary" onClick={askQuizQuestion} disabled={busy}>New question</button>
          )}
          {(mode === 'teach' || mode === 'quiz' || mode === 'ask') && !llmLocked && (
            voice.speaking
              ? <button type="button" className="btn-secondary" onClick={voice.cancel}>■ Stop</button>
              : mode === 'teach'
                ? <button type="button" className="btn-primary" onClick={() => runLLM('Teach me this topic — the single most important idea.')} disabled={busy}>{busy ? 'Thinking…' : '▶ Teach'}</button>
                : null
          )}
          {/* Mic — prominent, click-to-talk (no auto-start) for the conversational modes */}
          {(mode === 'teach' || mode === 'quiz' || mode === 'ask') && !llmLocked && (
            <SonaMicButton onText={onMicText} disabled={busy} />
          )}
          <button type="button" className="btn-ghost" onClick={handleClose} aria-label="Close voice">
            <Icon name="x" size={15} />
          </button>
        </div>
      </div>

      {/* Row 2 — one-line status / caption */}
      <div style={{ minHeight: 20, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        {llmLocked ? (
          <span>Teach, Quiz and Ask need a subscription — <a href="/pricing" style={{ color: 'var(--cam-primary)', fontWeight: 600 }}>upgrade</a>, or use <button type="button" className="btn-ghost" style={{ padding: 0, color: 'var(--cam-primary)' }} onClick={() => switchMode('read')}>Read</button> (free).</span>
        ) : !voice.supported ? (
          <span style={{ color: 'var(--warning-text)' }}>This browser can’t speak aloud — text only.</span>
        ) : caption ? (
          <span style={{ color: 'var(--text-primary)' }}>{caption}</span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>
            {mode === 'read' && 'Reads this topic aloud and highlights each part as it goes.'}
            {mode === 'teach' && 'Tap Teach for a 20-second explainer, or ask via the mic.'}
            {mode === 'quiz' && 'Tap New question, then answer out loud with the mic.'}
            {mode === 'ask' && 'Tap the mic and ask anything about this topic.'}
          </span>
        )}
      </div>
    </div>
  );
}
