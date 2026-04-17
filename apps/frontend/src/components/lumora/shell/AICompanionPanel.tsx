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
    raw = blocks.filter((b: any) => b.content && typeof b.content === 'string').map((b: any) => b.content).join('\n\n');
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
    if (blocks.solutions) blocks.solutions.forEach((sol: any, i: number) => parts.push(`**${sol.name || `Solution ${i + 1}`}**\n${sol.approach || ''}`));
    raw = parts.join('\n\n');
  } else { raw = String(blocks); }
  raw = raw.replace(/\[\/?(?:FOLLOWUP|HEADLINE|ANSWER|CODE|DIAGRAM|REQUIREMENTS|SCALEMATH|DEEPDESIGN|EDGECASES|TRADEOFFS)\]/gi, '');
  return raw.replace(/\n{3,}/g, '\n\n').trim();
}

/** Render answer text with structured formatting */
function RichText({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="text-[13px] leading-relaxed flex flex-col gap-0.5" style={{ fontFamily: 'var(--font-sans)' }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;
        if (trimmed.startsWith('**') && trimmed.endsWith('**'))
          return <div key={i} className="text-[10px] font-bold uppercase tracking-wider mt-2 mb-0.5" style={{ color: C.accent }}>{trimmed.replace(/\*\*/g, '')}</div>;
        const starMatch = trimmed.match(/^(SITUATION|TASK|ACTION|RESULT|LEARNING|Q\d|A\d):\s*(.*)/);
        if (starMatch)
          return <div key={i} className="flex gap-2 mt-1"><span className="text-[9px] font-bold shrink-0 px-1 py-0.5 rounded" style={{ background: C.accentBg, color: C.accent }}>{starMatch[1]}</span><span style={{ color: C.text }}>{starMatch[2]}</span></div>;
        if (trimmed.startsWith('- ') || trimmed.startsWith('• '))
          return <div key={i} className="flex gap-2 pl-1"><span className="shrink-0 mt-2 w-1 h-1 rounded-full" style={{ background: C.accent }} /><span style={{ color: C.text }}>{trimmed.slice(2)}</span></div>;
        return <div key={i} style={{ color: C.text }}>{trimmed}</div>;
      })}
    </div>
  );
}

/** Mic button with recording */
function MicButton({ onTranscription, disabled }: { onTranscription: (text: string) => void; disabled: boolean }) {
  const { token } = useAuth();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 1000) return;
        setProcessing(true);
        try { const r = await transcriptionAPI.transcribe(token!, blob, 'audio.webm', false); if (r.text?.trim()) onTranscription(r.text.trim()); } catch {}
        setProcessing(false);
      };
      mediaRecorderRef.current = mr; mr.start(); setRecording(true);
    } catch {}
  }, [token, onTranscription]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setRecording(false);
  }, []);

  if (processing) return <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.accentBg }}><div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: C.muted, borderTopColor: C.accent }} /></div>;

  return (
    <button onClick={recording ? stopRecording : startRecording} disabled={disabled}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
      style={recording ? { background: '#ef4444' } : { background: C.elevated }} title={recording ? 'Stop' : 'Speak'}>
      {recording
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>}
    </button>
  );
}

/* ═══ Fixed Right Sidebar Panel (Zoom AI Companion style) ═══ */
export function AICompanionPanel({ isOpen, onClose, inputValue, setInputValue, onSubmit, isStreaming, onAskQuestion, viewingIdx }: AICompanionPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { history, question, streamChunks, parsedBlocks } = useInterviewStore();

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [streamChunks, history.length, isOpen]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen]);

  const hasContent = history.length > 0 || isStreaming;
  const handleMicResult = useCallback((text: string) => onAskQuestion(text), [onAskQuestion]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col w-[340px] shrink-0 h-full" style={{ background: C.surface, borderLeft: `1px solid ${C.border}` }}>
      {/* Header — matches Zoom "AI Companion" exactly */}
      <div className="flex items-center justify-between h-12 px-4 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2">
          {/* Zoom-style icons on the left */}
          <button className="p-1 rounded transition-colors" style={{ color: C.muted }} title="History">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </button>
          <button className="p-1 rounded transition-colors" style={{ color: C.muted }} title="New chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </button>
        </div>
        <span className="text-[13px] font-semibold" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>AI Copilot</span>
        <div className="flex items-center gap-1">
          <button className="p-1 rounded transition-colors" style={{ color: C.muted }} title="Notifications">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
          </button>
          <button onClick={onClose} className="p-1 rounded transition-colors" style={{ color: C.muted }} title="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
          </button>
        </div>
      </div>

      {/* Chat thread */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-3">
        {!hasContent ? (
          <div className="flex flex-col items-center justify-center h-full py-6">
            {/* Zoom-style sparkle */}
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1" className="mb-4 opacity-40">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <div className="grid grid-cols-2 gap-2 w-full">
              {['Design a URL shortener', 'Explain TCP vs UDP', 'Tell me about a conflict', 'Detect cycle in linked list'].map(s => (
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
          <div className="flex flex-col gap-4">
            {history.map((entry, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                {/* User question — Zoom style: right-aligned bubble with timestamp */}
                <div className="flex flex-col items-end">
                  <div className="rounded-xl px-3 py-2 max-w-[90%]" style={{ background: C.accentBg }}>
                    <p className="text-[12px]" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>{entry.question}</p>
                  </div>
                  <span className="text-[9px] mt-0.5 mr-1" style={{ color: C.muted }}>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {/* AI answer — left-aligned with sparkle icon */}
                <div className="flex gap-2 items-start">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" className="shrink-0 mt-0.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    {(() => {
                      let text = extractText(entry.blocks);
                      if (!text && idx === history.length - 1) text = extractText(parsedBlocks);
                      if (!text) text = 'View full answer in Coding or Design tab.';
                      return <RichText text={text} />;
                    })()}
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming */}
            {isStreaming && question && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col items-end">
                  <div className="rounded-xl px-3 py-2 max-w-[90%]" style={{ background: C.accentBg }}>
                    <p className="text-[12px]" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>{question}</p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" className="shrink-0 mt-0.5 animate-pulse">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <div className="flex-1">
                    {streamChunks.length > 0
                      ? <><RichText text={streamChunks.join('').replace(/\[\/?(?:FOLLOWUP|HEADLINE|ANSWER|CODE|DIAGRAM|REQUIREMENTS|SCALEMATH|DEEPDESIGN|EDGECASES|TRADEOFFS)\]/gi, '')} /><span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm" style={{ background: C.accent }} /></>
                      : <span className="text-[12px] animate-pulse" style={{ color: C.muted }}>Thinking...</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom input — matches Zoom: pencil icon + input + send */}
      <div className="px-3 pb-3 pt-1 shrink-0">
        <div className="flex items-center gap-1.5 px-2 h-10 rounded-xl" style={{ background: C.elevated, border: `1px solid ${C.border}` }}>
          <MicButton onTranscription={handleMicResult} disabled={isStreaming} />
          <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && inputValue.trim()) onSubmit(); }}
            placeholder="Write a message or type / for more"
            className="flex-1 bg-transparent text-[12px] focus:outline-none min-w-0 placeholder:opacity-40"
            style={{ fontFamily: 'var(--font-sans)', color: C.text }} disabled={isStreaming} />
          {inputValue.trim() && !isStreaming && (
            <button onClick={onSubmit} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: '#6366f1' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
        <p className="text-[9px] mt-1 text-center" style={{ color: C.muted }}>AI can make mistakes. Review for accuracy.</p>
      </div>
    </div>
  );
}

/** Toggle button — only shown when panel is closed */
export function AICompanionToggle({ onClick, hasActivity }: { onClick: () => void; hasActivity: boolean }) {
  return (
    <button onClick={onClick}
      className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
      style={{ background: '#6366f1' }} title="AI Copilot">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
      {hasActivity && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2" style={{ borderColor: C.base }} />}
    </button>
  );
}
