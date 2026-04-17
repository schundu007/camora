import { useRef, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { streamResponse } from '@/lib/sse-client';
import { transcriptionAPI } from '@/lib/api-client';

const C = {
  base: '#041838', surface: '#062452', elevated: '#0B5CFF',
  text: '#ffffff', muted: 'rgba(255,255,255,0.7)', accent: '#34d399',
  accentBg: 'rgba(52,211,153,0.15)', border: 'rgba(255,255,255,0.12)',
};

/* ── Types ── */
interface CopilotMessage { role: 'user' | 'ai'; text: string; time: Date; }

interface AICompanionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ── Text formatting ── */
function extractAnswer(parsed: any): string {
  if (!parsed) return '';
  if (Array.isArray(parsed)) {
    return parsed.filter((b: any) => b.content).map((b: any) => b.content).join('\n\n');
  }
  return '';
}

function cleanTags(text: string): string {
  return text.replace(/\[\/?(?:FOLLOWUP|HEADLINE|ANSWER|CODE|DIAGRAM|REQUIREMENTS|SCALEMATH|DEEPDESIGN|EDGECASES|TRADEOFFS)\]/gi, '').replace(/\n{3,}/g, '\n\n').trim();
}

function RichText({ text }: { text: string }) {
  if (!text) return null;

  // Split into blocks: code blocks vs regular text
  const blocks: { type: 'code' | 'text'; lang?: string; content: string }[] = [];
  const codeRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIdx = 0;
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIdx) blocks.push({ type: 'text', content: text.slice(lastIdx, match.index) });
    blocks.push({ type: 'code', lang: match[1] || 'text', content: match[2].trim() });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) blocks.push({ type: 'text', content: text.slice(lastIdx) });

  const renderInline = (s: string) => {
    // Bold, inline code, links
    return s
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ffffff;font-weight:700">$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(96,165,250,0.15);color:#60a5fa;padding:1px 4px;border-radius:3px;font-size:12px">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#93c5fd;text-decoration:underline">$1</a>');
  };

  return (
    <div className="text-sm leading-relaxed flex flex-col gap-1" style={{ fontFamily: 'var(--font-sans)' }}>
      {blocks.map((block, bi) => {
        if (block.type === 'code') {
          return (
            <div key={bi} className="rounded-lg overflow-hidden my-1" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-[9px] font-bold uppercase" style={{ color: C.muted }}>{block.lang}</span>
                <button onClick={() => navigator.clipboard.writeText(block.content)} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: C.muted }}>Copy</button>
              </div>
              <pre className="px-3 py-2 overflow-x-auto text-xs leading-relaxed" style={{ background: '#041838', color: '#93c5fd' }}><code>{block.content}</code></pre>
            </div>
          );
        }

        return block.content.split('\n').map((line, i) => {
          const t = line.trim();
          if (!t) return <div key={`${bi}-${i}`} className="h-1" />;

          // Headers
          if (t.startsWith('### ')) return <h4 key={`${bi}-${i}`} className="text-xs font-extrabold mt-2 mb-0.5" style={{ color: C.text }}>{t.slice(4)}</h4>;
          if (t.startsWith('## ')) return <h3 key={`${bi}-${i}`} className="text-sm font-extrabold mt-2 mb-0.5" style={{ color: C.text }}>{t.slice(3)}</h3>;
          if (t.startsWith('# ')) return <h2 key={`${bi}-${i}`} className="text-base font-extrabold mt-2 mb-1" style={{ color: C.text }}>{t.slice(2)}</h2>;

          // STAR labels
          const starMatch = t.match(/^(SITUATION|TASK|ACTION|RESULT|LEARNING|SUMMARY|TIP|NOTE|WARNING|Q\d+|A\d+):\s*(.*)/i);
          if (starMatch) return (
            <div key={`${bi}-${i}`} className="flex gap-2 mt-1.5">
              <span className="text-[9px] font-bold shrink-0 px-1.5 py-0.5 rounded mt-0.5" style={{ background: C.accentBg, color: C.accent }}>{starMatch[1].toUpperCase()}</span>
              <span className="text-sm" style={{ color: C.text }} dangerouslySetInnerHTML={{ __html: renderInline(starMatch[2]) }} />
            </div>
          );

          // Numbered list
          const numMatch = t.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) return (
            <div key={`${bi}-${i}`} className="flex gap-2 pl-1">
              <span className="text-[10px] font-bold shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center" style={{ background: C.accentBg, color: C.accent }}>{numMatch[1]}</span>
              <span className="text-sm" style={{ color: C.text }} dangerouslySetInnerHTML={{ __html: renderInline(numMatch[2]) }} />
            </div>
          );

          // Bullets
          if (t.startsWith('- ') || t.startsWith('• ') || t.startsWith('* ')) return (
            <div key={`${bi}-${i}`} className="flex gap-2 pl-2">
              <span className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full" style={{ background: C.accent }} />
              <span className="text-sm" style={{ color: C.text }} dangerouslySetInnerHTML={{ __html: renderInline(t.slice(2)) }} />
            </div>
          );

          // Horizontal rule
          if (t === '---' || t === '***') return <div key={`${bi}-${i}`} className="my-2 h-px" style={{ background: C.border }} />;

          // Regular paragraph
          return <p key={`${bi}-${i}`} className="text-sm" style={{ color: C.text }} dangerouslySetInnerHTML={{ __html: renderInline(t) }} />;
        });
      })}
    </div>
  );
}

/* ── Mic Button ── */
function MicButton({ onResult, disabled }: { onResult: (text: string) => void; disabled: boolean }) {
  const { token } = useAuth();
  const [rec, setRec] = useState(false);
  const [busy, setBusy] = useState(false);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunks.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        if (blob.size < 1000) return;
        setBusy(true);
        try { const r = await transcriptionAPI.transcribe(token!, blob, 'audio.webm', false); if (r.text?.trim()) onResult(r.text.trim()); } catch {}
        setBusy(false);
      };
      mrRef.current = mr; mr.start(); setRec(true);
    } catch {}
  }, [token, onResult]);
  const stop = useCallback(() => { mrRef.current?.state === 'recording' && mrRef.current.stop(); setRec(false); }, []);

  if (busy) return <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.accentBg }}><div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: C.muted, borderTopColor: C.accent }} /></div>;
  return (
    <button onClick={rec ? stop : start} disabled={disabled} className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
      style={rec ? { background: '#ef4444' } : { background: C.elevated }}>
      {rec ? <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>}
    </button>
  );
}

/* ═══ AI Copilot Panel — FULLY INDEPENDENT from interview store ═══ */
export function AICompanionPanel({ isOpen, onClose }: AICompanionPanelProps) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [input, setInput] = useState('');
  const [minimized, setMinimized] = useState(false);
  const [panelWidth, setPanelWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Resize handlers
  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startX - e.clientX;
      const newW = Math.min(Math.max(200, resizeRef.current.startW + delta), 700);
      setPanelWidth(newW);
    };
    const handleUp = () => { setIsResizing(false); resizeRef.current = null; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isResizing]);

  // Auto-scroll
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, streamText, isOpen]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen]);

  // Ask a question — streams independently
  const ask = useCallback(async (question: string) => {
    if (!question.trim() || !token || streaming) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: question.trim(), time: new Date() }]);
    setStreaming(true);
    setStreamText('');

    try {
      await streamResponse({
        question: question.trim(),
        token,
        useSearch: false,
        onToken: (data) => {
          if (data.t) setStreamText(prev => prev + data.t);
        },
        onAnswer: (data: any) => {
          const answerText = extractAnswer(data.parsed) || data.raw || '';
          setMessages(prev => [...prev, { role: 'ai', text: cleanTags(answerText), time: new Date() }]);
          setStreamText('');
          setStreaming(false);
        },
        onError: (data: any) => {
          setMessages(prev => [...prev, { role: 'ai', text: `Error: ${data.message || 'Something went wrong'}`, time: new Date() }]);
          setStreamText('');
          setStreaming(false);
        },
      });
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Connection failed. Try again.', time: new Date() }]);
      setStreamText('');
      setStreaming(false);
    }
  }, [token, streaming]);

  const handleSubmit = useCallback(() => {
    if (input.trim()) { ask(input); setInput(''); }
  }, [input, ask]);

  return (
    <div className="hidden lg:flex shrink-0 h-full transition-all duration-200" style={{ width: minimized ? 48 : panelWidth }}>
      {/* Resize handle */}
      {!minimized && (
        <div
          className="w-[5px] h-full cursor-col-resize flex items-center justify-center group shrink-0 hover:bg-blue-400/20 transition-colors"
          style={{ background: isResizing ? 'rgba(52,211,153,0.3)' : '#041838' }}
          onMouseDown={(e) => { setIsResizing(true); resizeRef.current = { startX: e.clientX, startW: panelWidth }; }}
        >
          <div className="w-[3px] h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: '#34d399' }} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0" style={{ background: 'linear-gradient(180deg, #0B5CFF 0%, #041838 100%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {minimized ? (
          /* Minimized: just the expand button */
          <button onClick={() => setMinimized(false)} className="w-full flex items-center justify-center p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: C.accent }} title="Expand AI Copilot">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          </button>
        ) : (
          /* Expanded: full header */
          <>
            <div className="flex items-center gap-1">
              <button onClick={() => { if (messages.length > 0 && confirm('Clear chat history?')) setMessages([]); }}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: C.muted }} title="Clear history">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              </button>
              <button onClick={() => setMessages([])}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: C.muted }} title="New chat">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
            </div>
            <span className="text-sm font-extrabold tracking-tight" style={{ fontFamily: "var(--font-sans)", color: C.text }}>AI Copilot</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: C.muted }}>{messages.filter(m => m.role === 'user').length}</span>
              <button onClick={() => setMinimized(true)}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: C.muted }} title="Minimize">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12h16" /></svg>
              </button>
            </div>
          </>
        )}
      </div>

      {minimized ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: C.muted, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>AI Copilot</span>
        </div>
      ) : (<>
      {/* Chat */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-3">
        {messages.length === 0 && !streaming ? (
          <div className="flex flex-col items-center justify-center h-full py-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1" className="mb-4 opacity-40">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <div className="grid grid-cols-2 gap-2 w-full">
              {['Design a URL shortener', 'Explain TCP vs UDP', 'Tell me about a conflict', 'Detect cycle in linked list'].map(s => (
                <button key={s} onClick={() => ask(s)} className="text-left px-3 py-2.5 rounded-lg text-xs leading-snug transition-all"
                  style={{ border: `1px solid ${C.border}`, fontFamily: 'var(--font-sans)', color: C.muted }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.background = 'transparent'; }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg, i) => msg.role === 'user' ? (
              <div key={i} className="flex flex-col items-end">
                <div className="rounded-xl px-3 py-2 max-w-[90%]" style={{ background: C.accentBg }}>
                  <p className="text-[12px]" style={{ fontFamily: 'var(--font-sans)', color: C.text }}>{msg.text}</p>
                </div>
                <span className="text-[9px] mt-0.5 mr-1" style={{ color: C.muted }}>{msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ) : (
              <div key={i} className="flex gap-2 items-start">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" className="shrink-0 mt-0.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <div className="flex-1 min-w-0"><RichText text={msg.text} /></div>
              </div>
            ))}

            {/* Streaming */}
            {streaming && (
              <div className="flex gap-2 items-start">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" className="shrink-0 mt-0.5 animate-pulse">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <div className="flex-1">
                  {streamText ? <><RichText text={cleanTags(streamText)} /><span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm" style={{ background: C.accent }} /></>
                    : <span className="text-[12px] animate-pulse" style={{ color: C.muted }}>Thinking...</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-1 shrink-0">
        <div className="flex items-center gap-1.5 px-2 h-10 rounded-xl" style={{ background: C.elevated, border: `1px solid ${C.border}` }}>
          <MicButton onResult={(text) => ask(text)} disabled={streaming} />
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) handleSubmit(); }}
            placeholder="Write a message or type / for more"
            className="flex-1 bg-transparent text-[12px] focus:outline-none min-w-0 placeholder:opacity-40"
            style={{ fontFamily: 'var(--font-sans)', color: C.text }} disabled={streaming} />
          {input.trim() && !streaming && (
            <button onClick={handleSubmit} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: '#0B5CFF' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
        <p className="text-[9px] mt-1 text-center" style={{ color: C.muted }}>AI can make mistakes. Review for accuracy.</p>
      </div>
      </>)}
      </div>
    </div>
  );
}

export function AICompanionToggle({ onClick, hasActivity }: { onClick: () => void; hasActivity: boolean }) {
  return (
    <button onClick={onClick} className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105" style={{ background: '#0B5CFF' }} title="AI Copilot">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
      {hasActivity && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2" style={{ borderColor: C.base }} />}
    </button>
  );
}
