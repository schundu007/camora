import { useRef, useEffect, useState, useCallback } from 'react';
import { useInterviewStore } from '@/stores/interview-store';
import { useAuth } from '@/contexts/AuthContext';
import { transcriptionAPI } from '@/lib/api-client';

const C = {
  base: '#0D0C14',
  surface: '#16141F',
  elevated: '#1E1C28',
  text: '#F2F1F3',
  muted: '#6C6B7B',
  accent: '#818cf8',
  accentBg: 'rgba(99,102,241,0.12)',
  border: 'rgba(255,255,255,0.06)',
};

interface AICompanionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
  onAskQuestion: (q: string) => void;
  viewingIdx?: number | null;
}

/** Clean and extract text from any block format */
function extractText(blocks: any): string {
  if (!blocks) return '';
  let raw = '';
  if (Array.isArray(blocks)) {
    if (blocks.length === 0) return '';
    raw = blocks
      .filter((b: any) => b.content && typeof b.content === 'string')
      .map((b: any) => b.content)
      .join('\n\n');
  } else if (typeof blocks === 'object') {
    const parts: string[] = [];
    if (blocks.systemDesign) {
      const sd = blocks.systemDesign;
      if (sd.overview) parts.push(sd.overview);
      if (sd.requirements?.functional) parts.push('**Functional**\n' + sd.requirements.functional.map((r: string) => `• ${r}`).join('\n'));
      if (sd.requirements?.nonFunctional) parts.push('**Non-Functional**\n' + sd.requirements.nonFunctional.map((r: string) => `• ${r}`).join('\n'));
      if (sd.tradeoffs) parts.push('**Trade-offs**\n' + sd.tradeoffs.map((t: string) => `• ${t}`).join('\n'));
      if (sd.edgeCases) parts.push('**Edge Cases**\n' + sd.edgeCases.map((e: string) => `• ${e}`).join('\n'));
    }
    if (blocks.pitch) {
      const p = typeof blocks.pitch === 'string' ? blocks.pitch : (blocks.pitch.opener || blocks.pitch.approach || '');
      if (p) parts.push(p);
      if (blocks.pitch?.keyPoints) parts.push(blocks.pitch.keyPoints.map((k: string) => `• ${k}`).join('\n'));
    }
    if (blocks.solutions) {
      blocks.solutions.forEach((sol: any, i: number) => {
        parts.push(`**${sol.name || `Solution ${i + 1}`}**\n${sol.approach || ''}`);
      });
    }
    raw = parts.join('\n\n');
  } else {
    raw = String(blocks);
  }
  // Strip leftover tags like [FOLLOWUP], [/FOLLOWUP], [HEADLINE], etc.
  raw = raw.replace(/\[\/?(?:FOLLOWUP|HEADLINE|ANSWER|CODE|DIAGRAM|REQUIREMENTS|SCALEMATH|DEEPDESIGN|EDGECASES|TRADEOFFS)\]/gi, '');
  // Clean up excessive blank lines
  raw = raw.replace(/\n{3,}/g, '\n\n').trim();
  return raw;
}

/** Render answer text with structured formatting */
function RichText({ text }: { text: string }) {
  if (!text) return null;

  // Split into lines and render with structure
  const lines = text.split('\n');

  return (
    <div className="text-[13px] leading-relaxed flex flex-col gap-0.5" style={{ fontFamily: 'var(--font-sans)' }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        // **Bold headers**
        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          return <div key={i} className="text-[11px] font-bold uppercase tracking-wider mt-2 mb-0.5" style={{ color: C.accent }}>{trimmed.replace(/\*\*/g, '')}</div>;
        }

        // STAR labels: SITUATION:, TASK:, ACTION:, RESULT:, LEARNING:
        const starMatch = trimmed.match(/^(SITUATION|TASK|ACTION|RESULT|LEARNING|Q\d|A\d):\s*(.*)/);
        if (starMatch) {
          return (
            <div key={i} className="flex gap-2 mt-1">
              <span className="text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded mt-0.5" style={{ background: C.accentBg, color: C.accent }}>{starMatch[1]}</span>
              <span style={{ color: C.text }}>{starMatch[2]}</span>
            </div>
          );
        }

        // Bullet points: - or •
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="shrink-0 mt-2 w-1 h-1 rounded-full" style={{ background: C.accent }} />
              <span style={{ color: C.text }}>{trimmed.slice(2)}</span>
            </div>
          );
        }

        // Regular text
        return <div key={i} style={{ color: C.text }}>{trimmed}</div>;
      })}
    </div>
  );
}

/* ═══ Mic Button with recording state ═══ */
function MicButton({ onTranscription, disabled }: { onTranscription: (text: string) => void; disabled: boolean }) {
  const { token } = useAuth();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 1000) return; // too small
        setProcessing(true);
        try {
          const result = await transcriptionAPI.transcribe(token!, blob, 'audio.webm', false);
          if (result.text?.trim()) onTranscription(result.text.trim());
        } catch (err) {
          console.error('Transcription failed:', err);
        }
        setProcessing(false);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error('Mic access denied:', err);
    }
  }, [token, onTranscription]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  if (processing) {
    return (
      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: C.accentBg }}>
        <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: C.muted, borderTopColor: C.accent }} />
      </div>
    );
  }

  return (
    <button
      onClick={recording ? stopRecording : startRecording}
      disabled={disabled}
      className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
      style={recording ? { background: '#ef4444', boxShadow: '0 0 12px rgba(239,68,68,0.4)' } : { background: C.elevated }}
      title={recording ? 'Stop recording' : 'Hold to speak'}
    >
      {recording ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      )}
    </button>
  );
}

/* ═══ Main Panel ═══ */
export function AICompanionPanel({ isOpen, onClose, inputValue, setInputValue, onSubmit, isStreaming, onAskQuestion, viewingIdx }: AICompanionPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { history, question, streamChunks, parsedBlocks } = useInterviewStore();

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [streamChunks, history.length, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const hasContent = history.length > 0 || isStreaming;

  const SUGGESTIONS = [
    'Design a URL shortener like bit.ly',
    'Explain TCP vs UDP with examples',
    'Walk me through a conflict resolution',
    'Implement cycle detection in linked list',
  ];

  // Handle mic transcription — ask the question
  const handleMicResult = useCallback((text: string) => {
    onAskQuestion(text);
  }, [onAskQuestion]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />

      <div className="fixed bottom-20 right-6 z-50 flex flex-col w-[400px] max-h-[75vh] rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: C.surface, border: `1px solid ${C.border}` }}>

        {/* Header */}
        <div className="flex items-center justify-between h-11 px-4 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            <span className="text-[13px] font-semibold" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>AI Copilot</span>
            {history.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: C.elevated, color: C.muted }}>{history.length}</span>}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: C.muted }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Chat thread */}
        <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-3">
          {!hasContent ? (
            /* Empty — suggestions */
            <div className="flex flex-col items-center justify-center h-full py-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-40">
                <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              <p className="text-sm font-medium mb-1" style={{ color: C.text, fontFamily: 'var(--font-sans)' }}>Ask with voice or text</p>
              <p className="text-xs mb-5" style={{ color: C.muted, fontFamily: 'var(--font-sans)' }}>Tap the mic or type below</p>
              <div className="grid grid-cols-2 gap-2 w-full">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => onAskQuestion(s)}
                    className="text-left px-3 py-2.5 rounded-lg text-[11px] leading-snug transition-all"
                    style={{ border: `1px solid ${C.border}`, fontFamily: 'var(--font-sans)', color: C.muted }}
                    onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = C.elevated; }}
                    onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = 'transparent'; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Conversation thread — like Claude web */
            <div className="flex flex-col gap-4">
              {history.map((entry, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  {/* User message */}
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold" style={{ background: '#6366f1', color: '#fff' }}>You</div>
                    <div className="flex-1 rounded-xl px-3 py-2" style={{ background: C.elevated }}>
                      <p className="text-[13px]" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>{entry.question}</p>
                    </div>
                  </div>
                  {/* AI response */}
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center" style={{ background: C.accentBg }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    </div>
                    <div className="flex-1">
                      {(() => {
                        // Try entry blocks first, then parsedBlocks from store (for coding/design JSON responses)
                        let text = extractText(entry.blocks);
                        if (!text && idx === history.length - 1) {
                          text = extractText(parsedBlocks);
                        }
                        if (!text) text = 'Answer generated — view in the Coding or Design tab for full details.';
                        return <RichText text={text} />;
                      })()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming message */}
              {isStreaming && question && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold" style={{ background: '#6366f1', color: '#fff' }}>You</div>
                    <div className="flex-1 rounded-xl px-3 py-2" style={{ background: C.elevated }}>
                      <p className="text-[13px]" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>{question}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center animate-pulse" style={{ background: C.accentBg }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    </div>
                    <div className="flex-1">
                      {streamChunks.length > 0
                        ? <><RichText text={streamChunks.join('').replace(/\[\/?(?:FOLLOWUP|HEADLINE|ANSWER|CODE|DIAGRAM|REQUIREMENTS|SCALEMATH|DEEPDESIGN|EDGECASES|TRADEOFFS)\]/gi, '')} /><span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm" style={{ background: C.accent }} /></>
                        : <span className="text-[13px] animate-pulse" style={{ color: C.muted, fontFamily: 'var(--font-sans)' }}>Thinking...</span>
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input bar — mic + text (like Claude web) */}
        <div className="px-3 pb-3 pt-1 shrink-0">
          <div className="flex items-center gap-2 px-2 h-11 rounded-xl"
            style={{ background: C.elevated, border: `1px solid ${C.border}` }}>
            {/* Mic button */}
            <MicButton onTranscription={handleMicResult} disabled={isStreaming} />

            {/* Text input */}
            <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && inputValue.trim()) onSubmit(); }}
              placeholder={isStreaming ? 'Generating...' : 'Ask a question...'}
              className="flex-1 bg-transparent text-[13px] focus:outline-none min-w-0 placeholder:opacity-40"
              style={{ fontFamily: 'var(--font-sans)', color: C.text }} disabled={isStreaming} />

            {/* Send button */}
            {inputValue.trim() && !isStreaming && (
              <button onClick={onSubmit} className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#6366f1' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>
          <p className="text-[9px] mt-1 text-center" style={{ color: C.muted }}>Tap mic to speak or type • AI can make mistakes</p>
        </div>
      </div>
    </>
  );
}

/* ── Toggle button ── */
export function AICompanionToggle({ onClick, hasActivity }: { onClick: () => void; hasActivity: boolean }) {
  return (
    <button onClick={onClick}
      className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
      style={{ background: '#6366f1' }} title="AI Copilot">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      {hasActivity && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2" style={{ borderColor: C.base }} />}
    </button>
  );
}
