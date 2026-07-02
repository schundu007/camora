/**
 * TopicVoiceAgent — one switchable voice agent for any Prepare topic.
 *
 * Modes: Read (TTS of the topic's own content, no LLM), Teach / Quiz / Ask
 * (LLM, grounded in the topic). Reuses the existing mic → /transcribe →
 * streamResponse loop (same as PracticePanel) and speaks replies via
 * useSonaVoice. Deliberately decoupled from sonaRegistry / voice-router /
 * useSessionStore so it is safe on the free Prepare surface.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { streamResponse } from '@/lib/sse-client';
import { SonaMicButton } from '@/components/lumora/shell/SonaMicButton';
import { Icon } from '@/components/shared/Icons';
import { useSonaVoice } from './useSonaVoice';
import {
  buildReadBlocks,
  buildSystemContext,
  buildDirective,
  pickQuizQuestions,
  type VoiceMode,
} from '@/lib/topic-voice-context';

type Line = { who: 'sona' | 'you'; text: string };

const MODES: Array<{ id: VoiceMode; label: string; llm: boolean }> = [
  { id: 'read', label: 'Read', llm: false },
  { id: 'teach', label: 'Teach', llm: true },
  { id: 'quiz', label: 'Quiz', llm: true },
  { id: 'ask', label: 'Ask', llm: true },
];

interface Props {
  topic: any;
  open: boolean;
  onClose: () => void;
  locked?: boolean;
}

export default function TopicVoiceAgent({ topic, open, onClose, locked = false }: Props) {
  const { token } = useAuth();
  const [mode, setMode] = useState<VoiceMode>('read');
  const [log, setLog] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const bufferRef = useRef('');
  const voice = useSonaVoice({ rate: 1 });

  const systemContext = useMemo(() => (topic ? buildSystemContext(topic) : ''), [topic]);
  const readBlocks = useMemo(() => (topic ? buildReadBlocks(topic) : []), [topic]);
  const quizQuestions = useMemo(() => (topic ? pickQuizQuestions(topic) : []), [topic]);

  const push = useCallback((who: Line['who'], text: string) => {
    setLog((l) => [...l, { who, text }]);
  }, []);

  // Update (replace) the last Sona line while tokens stream in.
  const setLastSona = useCallback((text: string) => {
    setLog((l) => {
      const next = [...l];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].who === 'sona') { next[i] = { who: 'sona', text }; return next; }
      }
      return [...next, { who: 'sona', text }];
    });
  }, []);

  const stopAll = useCallback(() => {
    abortRef.current?.abort();
    voice.cancel();
    setBusy(false);
  }, [voice]);

  const runLLM = useCallback(async (userText: string) => {
    if (!token) return;
    stopAll();
    setBusy(true);
    bufferRef.current = '';
    let full = '';
    push('sona', '');
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
          if (!t) return;
          full += t;
          setLastSona(full);
          bufferRef.current = voice.flushSentences(bufferRef.current + t);
        },
        onError: () => { setLastSona(full || 'Sorry — I could not answer that. Please try again.'); },
        onComplete: () => {},
      } as any);
    } catch {
      setLastSona(full || 'Sorry — something went wrong. Please try again.');
    } finally {
      if (bufferRef.current.trim()) { voice.enqueue(bufferRef.current); bufferRef.current = ''; }
      setBusy(false);
      if (mode === 'quiz' && quizQuestions.length) {
        setQuizIdx((i) => (i + 1) % quizQuestions.length);
      }
    }
  }, [token, mode, quizIdx, quizQuestions, systemContext, voice, push, setLastSona, stopAll]);

  const onMicText = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    voice.cancel(); // barge-in: never talk over the user
    push('you', t);
    if (mode !== 'read') runLLM(t);
  }, [mode, runLLM, voice, push]);

  const startRead = useCallback(() => {
    stopAll();
    setLog([]);
    for (const b of readBlocks) { push('sona', b); voice.enqueue(b); }
  }, [readBlocks, voice, push, stopAll]);

  const askQuizQuestion = useCallback(() => {
    const q = quizQuestions[quizIdx];
    if (!q) return;
    voice.cancel();
    push('sona', q);
    voice.speak(q);
  }, [quizQuestions, quizIdx, voice, push]);

  const teachOpener = useCallback(() => {
    runLLM('Teach me this topic from the beginning, as if I am new to it.');
  }, [runLLM]);

  const switchMode = useCallback((m: VoiceMode) => {
    stopAll();
    setMode(m);
    setLog([]);
  }, [stopAll]);

  if (!open) return null;

  const active = MODES.find((m) => m.id === mode);
  const llmLocked = locked && !!active?.llm;

  return (
    <div
      role="dialog"
      aria-label={`Voice — ${topic?.title || 'topic'}`}
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(440px, 100vw)',
        zIndex: 60, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-elevated)', borderLeft: '1px solid var(--cam-gold-leaf)',
        boxShadow: '-12px 0 40px -20px rgba(20,20,40,0.5)',
      }}
    >
      {/* Header */}
      <div className="cam-hero-strip" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
        <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: '50%', background: 'var(--cam-primary)', color: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="sparkles" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="text-eyebrow" style={{ color: 'var(--cam-gold-leaf-text)' }}>Sona · Voice</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {topic?.title || 'This topic'}
          </div>
        </div>
        <button type="button" className="btn-ghost" onClick={() => { stopAll(); onClose(); }} aria-label="Close voice agent">
          <Icon name="x" />
        </button>
      </div>

      {/* Mode selector (chips) */}
      <div style={{ padding: '10px 12px', gap: 6, display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`chip ${mode === m.id ? 'chip-active' : ''}`}
            onClick={() => switchMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Transcript */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {log.length === 0 && (
          <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
            {mode === 'read' && 'Press Play and Sona will read this topic aloud.'}
            {mode === 'teach' && 'Press Start and Sona will teach this topic — tap the mic anytime to ask.'}
            {mode === 'quiz' && 'Press New question, answer out loud, and Sona will grade you.'}
            {mode === 'ask' && 'Tap the mic and ask Sona anything about this topic.'}
          </p>
        )}
        {log.map((line, i) => (
          <div
            key={i}
            style={{
              alignSelf: line.who === 'you' ? 'flex-end' : 'flex-start',
              maxWidth: '85%', padding: '8px 11px', borderRadius: 12,
              fontSize: 13, lineHeight: 1.5,
              background: line.who === 'you' ? 'var(--cam-primary)' : 'var(--bg-surface)',
              color: line.who === 'you' ? '#fff' : 'var(--text-primary)',
              border: line.who === 'you' ? 'none' : '1px solid var(--border)',
            }}
          >
            {line.text || '…'}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {!voice.supported && (
          <span className="text-caption" style={{ color: 'var(--warning-text)' }}>
            This browser can’t speak aloud — showing the transcript instead.
          </span>
        )}
        {voice.supported && llmLocked && (
          <div className="text-caption" style={{ color: 'var(--text-secondary)' }}>
            Teach, Quiz, and Ask need a subscription. <a href="/pricing" style={{ color: 'var(--cam-primary)', fontWeight: 600 }}>Upgrade</a> — or use <button type="button" className="btn-ghost" style={{ padding: 0 }} onClick={() => switchMode('read')}>Read</button> (free).
          </div>
        )}
        {voice.supported && !llmLocked && (
          <>
            {mode === 'read' && (
              voice.speaking
                ? <button type="button" className="btn-secondary" onClick={voice.cancel}>Stop</button>
                : <button type="button" className="btn-primary" onClick={startRead}>▶ Play</button>
            )}
            {mode === 'teach' && (
              <button type="button" className="btn-primary" onClick={teachOpener} disabled={busy}>
                {busy ? 'Sona is speaking…' : '▶ Start lesson'}
              </button>
            )}
            {mode === 'quiz' && (
              <button type="button" className="btn-primary" onClick={askQuizQuestion} disabled={busy}>New question</button>
            )}
            {(mode === 'teach' || mode === 'quiz' || mode === 'ask') && (
              <div style={{ marginLeft: 'auto' }}>
                <SonaMicButton onText={onMicText} autoMode disabled={busy} />
              </div>
            )}
            {(mode === 'teach' || mode === 'ask' || busy) && voice.speaking && (
              <button type="button" className="btn-ghost" onClick={voice.cancel} style={{ marginLeft: 'auto' }}>Stop voice</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
