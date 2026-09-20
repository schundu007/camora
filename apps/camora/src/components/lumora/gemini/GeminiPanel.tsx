// Gemini tab — a second opinion beside Ask Sona, answered by Gemini directly.
//
// This used to embed aistudio.google.com in an Electron <webview>. That could
// not be made to work: Google blocks Google sign-in inside embedded browsers
// ("This browser or app may not be secure"), and the detection is not
// defeatable from our side. Rewriting the User-Agent and Sec-CH-UA request
// headers on the partition's session — which we did, and verified — still
// leaves `navigator.userAgentData` reporting Electron to JS inside their page,
// and the one override that would fix that (webContents.setUserAgent) breaks
// the renderer's own desktop detection in lib/audio-preferences.ts. main.js
// reached the same conclusion for app login and routes it through the system
// browser instead; there is no equivalent escape hatch for an embedded tab.
//
// Calling the API is strictly better for what this tab was FOR. The stated
// reason to pick AI Studio over gemini.google.com was its System instructions
// field; here the interview framing lives server-side in routes/gemini.js, so
// it is always applied instead of depending on a generated DOM selector that
// "will move" — and there is no sign-in, no seeding step, and no arms race.
//
// It also stops being desktop-only: with no webview, the tab works on the web
// build too.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AskResponse } from '../ask/AskLayout';
// Ask Sona's dictation button, reused as-is. It already carries the two things
// this tab needs — the Deepgram-realtime-with-Groq-fallback path, and the
// distinction between "I clicked stop" and "I stopped talking" — and the panel
// already imports its renderer from ../ask, so this follows an existing seam
// rather than opening a new one.
import { StreamingMicButton } from '../ask/StreamingMicButton';
import { InterviewerListenButton } from '../ask/InterviewerListenButton';
import { useInterviewerListen } from '../shared/useInterviewerListen';
import { QuestionBlock } from '../shared/QuestionBlock';
import { toTurns, lastTurns } from '../shared/qaTurns';
import { AskSwitcher } from '../shared/askSurfaces';
import { useSnapAttach, MAX_PENDING_IMAGES } from '../shared/useSnapAttach';

// The reading column is capped rather than filling the panel. At 15px a
// full-width tab runs past 120 characters a line, and a line that long loses
// the eye on the way back from the webcam — the one thing this surface cannot
// afford. 23.75rem of gutter leaves ~760px, which at 14px is a shade over 90
// characters. The same measure is used by Ask Sona.
const READ_GUTTER = 'max(0.75rem, calc(50% - 23.75rem))';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

type Role = 'user' | 'assistant';
type Msg = { role: Role; content: string };

export const GeminiPanel = ({ isActive }: { isActive: boolean }) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streamText, setStreamText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  // Bumped by the Space shortcut; StreamingMicButton toggles on each new value.
  const [micToggle, setMicToggle] = useState(0);
  const snap = useSnapAttach(() => inputRef.current?.focus());

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Whatever was already typed when dictation started, so speaking appends to a
  // half-written question instead of erasing it.
  const dictationBaseRef = useRef('');
  // Set only when recording ended because the speaker went quiet — that is the
  // signal to send. Clicking the mic off deliberately leaves the text to edit.
  const autoSendRef = useRef(false);
  // Dictation is async and the composer can be reset underneath it (New chat,
  // or a send). Stamping the conversation at onStart and re-checking on each
  // callback stops a finished utterance from landing in — and auto-sending to —
  // a conversation the user has already moved on from.
  const convSeqRef = useRef(0);
  const dictationSeqRef = useRef(0);

  // Abort in flight work on unmount. The shell keeps this tab mounted while it
  // is inactive, so this only fires on a real teardown — but an interview
  // produces plenty of superseded questions and each is billed until cut off.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Hold the view at the TOP, where the newest turn renders. This used to chase
  // the bottom of the list — the right instinct for a chat app and the wrong
  // one here, because it walked the answer further down the screen on every
  // exchange while a camera was pointed at the candidate.
  //
  // Keyed on a message landing or a stream starting, never on every token, or
  // scrolling back through history would yank you forward mid-read.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [messages.length, streaming]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const newChat = useCallback(() => {
    stop();
    convSeqRef.current += 1;
    dictationBaseRef.current = '';
    autoSendRef.current = false;
    setMessages([]);
    setStreamText('');
    setStreaming(false);
    setInput('');
    inputRef.current?.focus();
  }, [stop]);

  const copyLast = useCallback(() => {
    const last = [...messages].reverse().find(m => m.role === 'assistant');
    if (!last) return;
    navigator.clipboard?.writeText(last.content).then(() => setCopied(true)).catch(() => { /* clipboard denied */ });
  }, [messages]);

  const send = useCallback(async (override?: string) => {
    // Dictation calls this on the same tick as setInput, before `input` state
    // has committed — so it passes the text explicitly rather than letting this
    // closure read the pre-dictation value and send the wrong thing.
    const text = (override ?? input).trim();
    // Returning here while an answer streams leaves a dictated question sitting
    // in the box rather than dropping it: the candidate sees it and can send it
    // themselves once the current answer lands.
    if ((!text && !snap.pending.length) || streaming) return;

    convSeqRef.current += 1;
    dictationBaseRef.current = '';
    const imgs = snap.pending.map(p => p.dataUrl);
    snap.clear();
    const next: Msg[] = [...messages, { role: 'user', content: text || '(screenshot)' }];
    setMessages(next);
    setInput('');
    setStreamText('');
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let full = '';

    try {
      const resp = await fetch(`${API_URL}/api/v1/gemini/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: next, images: imgs }),
        signal: controller.signal,
      });
      if (!resp.ok || !resp.body) throw new Error(`stream failed (${resp.status})`);

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        // The last element is a partial line — hold it until the next chunk
        // completes it, or a token gets split across reads and is lost.
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.text) { full += parsed.text; setStreamText(full); }
            if (parsed.error) full = full || `Error: ${parsed.error}`;
          } catch { /* a partial frame — the next read completes it */ }
        }
      }

      // Superseded mid-flight (New chat, or unmount) — don't append into a
      // conversation that no longer exists.
      if (abortRef.current !== controller) return;
      setMessages(prev => [...prev, { role: 'assistant', content: full || 'No response received. Please try again.' }]);
    } catch (err: any) {
      if (err?.name === 'AbortError' || abortRef.current !== controller) return;
      // A partial answer is still worth keeping — the candidate may already be
      // reading it out loud.
      setMessages(prev => [...prev, { role: 'assistant', content: full || 'Something went wrong. Please try again.' }]);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setStreaming(false);
        setStreamText('');
        inputRef.current?.focus();
      }
    }
  }, [input, streaming, messages, snap]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter is a newline. Mid-interview the common case by
    // far is a single pasted question, so Enter should not cost a reach.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }, [send]);

  // Interviewer listening — the same subscription Ask Sona has, so a question
  // asked out loud arrives here without anyone touching a key. Nothing on this
  // path opens a microphone: it rides the dedicated capture stream the shell
  // already transcribes, which the candidate is not on. That is what keeps
  // their own answers from being sent back as questions.
  const listen = useInterviewerListen({
    onQuestion: (t) => { void send(t); },
    onPreview: setInput,
    draft: input,
    enabled: isActive,
  });
  // Destructured because the hook returns a fresh object each render; binding
  // the effect below to that object would re-register the listener every time.
  const { toggle: toggleListen } = listen;

  // Two audio keys, matching Ask Sona so the pair means the same thing on every
  // surface:
  //   `      → arm/disarm interviewer listening
  //   Space  → the dictation mic, for asking something in your own voice
  //
  // Gated on isActive because this tab is kept MOUNTED while hidden (so a
  // conversation survives tab switches). Without the gate the listener would
  // still be live behind the Coding tab and one key would drive two panels.
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      // Shift+` is ~, a character someone may genuinely want to type.
      const isTick = e.code === 'Backquote' && !e.shiftKey;
      const isSpace = e.code === 'Space' && !e.shiftKey;
      if ((!isTick && !isSpace) || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      const inEmptyComposer = el === inputRef.current && !input.trim();
      // Typing wins: in any editable target both keys keep their native
      // meaning. The empty composer is the exception — there is nothing there
      // to type over yet.
      const editable = tag === 'INPUT' || tag === 'TEXTAREA' ||
        !!el?.isContentEditable || !!el?.closest?.('.monaco-editor');
      if (editable && !inEmptyComposer) return;
      // Space activates a focused button or link. ` activates nothing, so only
      // Space has to yield to them — and treating the two alike is exactly what
      // made ` dead here before: you reach this panel by CLICKING its tab, so
      // focus is sitting on that button when you press the key.
      if (isSpace && (tag === 'BUTTON' || tag === 'A' || tag === 'SELECT' ||
          el?.getAttribute('role') === 'button')) return;
      e.preventDefault();
      if (isTick) toggleListen(); else setMicToggle(n => n + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, input, toggleListen]);

  const hasAnswer = messages.some(m => m.role === 'assistant');

  // Only the last two turns render. Everything older stays in `messages` and
  // still goes to the model, so a follow-up that refers back keeps working —
  // it just stops competing for the window with the answer being read now.
  const turns = toTurns(lastTurns(messages));
  // The turn being answered right now: the newest one, still without an answer.
  // The stream renders INSIDE it, so the live answer stays under the question
  // it answers instead of floating above it at the top of the list.
  const last = turns[turns.length - 1];
  const pendingKey = streaming && last && !last.answer ? last.key : null;
  // The in-flight answer goes through the same markdown path as a finished one,
  // so nothing reflows the moment the stream closes.
  const liveAnswer = streamText
    ? <AskResponse content={streamText} />
    : <p className="text-[15px]" style={{ color: 'var(--lum-text-2)' }}>Thinking…</p>;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Composer on TOP. The answer is the thing being read mid-interview,
          so it grows downward from a fixed point instead of pushing the box
          you are typing in around as it streams. */}
      {/* Surface switcher — directly above the box you type into, because that
          is where the eye already is when you decide the other model would
          answer this better. */}
      <div className="shrink-0 px-2 pt-2" style={{ background: 'var(--lum-surface)' }}>
        <AskSwitcher
          topRow
          onNew={newChat}
          onCopy={copyLast}
          hasContent={hasAnswer}
        />
      </div>
      <div className="shrink-0 px-2 py-2" style={{ background: 'var(--lum-surface)', borderBottom: '1px solid var(--lum-border)' }}>
        {/* Attached screenshots, above the box they belong to. */}
        {snap.pending.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2" data-overlay-keep>
            {snap.pending.map(img => (
              <div key={img.id} className="relative">
                <img src={img.dataUrl} alt="attachment" className="h-14 rounded object-cover"
                  style={{ border: '1px solid var(--lum-border-strong)' }} />
                <button type="button" onClick={() => snap.remove(img.id)}
                  aria-label="Remove screenshot" data-tip="Remove this screenshot"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[12px] leading-none flex items-center justify-center"
                  style={{ background: 'var(--lum-surface)', color: 'var(--lum-text-2)', border: '1px solid var(--lum-border-strong)' }}
                >×</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2"
          onPaste={(e) => snap.addFiles(e.clipboardData?.files || null)}
          onDrop={(e) => { e.preventDefault(); snap.addFiles(e.dataTransfer?.files || null); }}
          onDragOver={(e) => e.preventDefault()}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Ask Gemini…  (Enter sends, ` listens to the interviewer, Space is the mic)"
            className="flex-1 resize-none rounded px-2.5 py-2 text-[13px] leading-relaxed outline-none"
            style={{ background: 'var(--lum-bg)', border: '1px solid var(--lum-border)', color: 'var(--lum-text)' }}
          />
          <button
            type="button"
            onClick={() => void snap.snap()}
            disabled={snap.snapping || snap.full || streaming}
            data-tip={snap.full ? `Up to ${MAX_PENDING_IMAGES} screenshots` : 'Screenshot a region into the question'}
            aria-label="Attach a screenshot"
            className="w-9 h-9 rounded flex items-center justify-center shrink-0 transition-opacity disabled:opacity-40"
            style={{ background: 'var(--lum-bg)', border: '1px solid var(--lum-border)', color: 'var(--lum-text-2)' }}
          >
            {snap.snapping
              ? <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>}
          </button>
          <InterviewerListenButton
            listening={listen.listening}
            onToggle={listen.toggle}
            unavailableReason={listen.unavailableReason}
          />
          <StreamingMicButton
            toggleSignal={micToggle}
            onStart={() => {
              dictationSeqRef.current = convSeqRef.current;
              dictationBaseRef.current = input;
              autoSendRef.current = false;
            }}
            onInterim={(t) => {
              if (dictationSeqRef.current !== convSeqRef.current) return;
              const base = dictationBaseRef.current.trim();
              setInput(base && t ? base + ' ' + t : (t || base));
            }}
            // Going quiet IS the send. One press, ask the question out loud,
            // done — rather than press mic, press mic again, press Send, while
            // an interviewer waits.
            onSilenceStop={() => { autoSendRef.current = true; }}
            onFinal={(t) => {
              const auto = autoSendRef.current;
              autoSendRef.current = false;
              if (dictationSeqRef.current !== convSeqRef.current) return;
              const base = dictationBaseRef.current.trim();
              const nextText = base && t ? base + ' ' + t : (t || base);
              setInput(nextText);
              dictationBaseRef.current = nextText;
              if (auto && nextText.trim()) void send(nextText);
            }}
          />
          {streaming ? (
            <button type="button" onClick={stop}
              className="px-3 h-9 rounded text-[12px] font-semibold shrink-0"
              style={{ background: 'var(--lum-surface-hover)', color: 'var(--lum-text-2)' }}>
              Stop
            </button>
          ) : (
            <button type="button" onClick={() => void send()} disabled={!input.trim()}
              className="px-3 h-9 rounded text-[12px] font-semibold shrink-0"
              style={{ background: 'var(--lum-accent-bg)', color: 'var(--lum-accent-sm)', opacity: input.trim() ? 1 : 0.4 }}>
              Send
            </button>
          )}
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto py-3"
        style={{ paddingLeft: READ_GUTTER, paddingRight: READ_GUTTER }}>
        <div className="flex flex-col gap-3">
          {/* Newest turn first, directly under the composer — the order Ask Sona
              and the behavioral panel already read in. Only the pairing differs:
              a question here is a labelled block rather than a chat bubble, so
              the reversal is per turn and each answer keeps its question on top
              of it. */}
          {streaming && pendingKey === null && liveAnswer}
          {[...turns].reverse().map((t) => (
            <div key={t.key} className="flex flex-col gap-3">
              {t.question && <QuestionBlock>{t.question.content}</QuestionBlock>}
              {t.answer
                ? <AskResponse content={t.answer.content} />
                : t.key === pendingKey ? liveAnswer : null}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
