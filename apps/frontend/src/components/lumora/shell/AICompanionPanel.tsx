import { useRef, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { streamResponse } from '@/lib/sse-client';
import { transcriptionAPI } from '@/lib/api-client';

/* White background copilot — black text */
const C = {
  base: '#FFFFFF', surface: '#F8FAFC', elevated: '#76B900',
  text: '#0F172A', muted: '#64748B', accent: '#76B900',
  accentBg: 'rgba(118,185,0,0.08)', border: '#E2E8F0',
};

/* ── Types ── */
interface CopilotMessage { role: 'user' | 'ai'; text: string; time: Date; }

interface AICompanionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type AnswerMode = 'short' | 'detailed';

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

/* ── RichText — renders markdown with proper code blocks ── */
function RichText({ text }: { text: string }) {
  if (!text) return null;

  // Split into blocks: fenced code blocks vs regular text
  const blocks: { type: 'code' | 'text'; lang?: string; content: string }[] = [];
  const codeRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIdx = 0;
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIdx) blocks.push({ type: 'text', content: text.slice(lastIdx, match.index) });
    blocks.push({ type: 'code', lang: match[1] || 'python', content: match[2].trim() });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) blocks.push({ type: 'text', content: text.slice(lastIdx) });

  /** Detect if a line looks like code (indented, has code syntax) */
  const isCodeLine = (line: string): boolean => {
    const t = line.trimEnd();
    if (!t) return false;
    // Indented by 4+ spaces or tab
    if (/^(\s{4,}|\t)/.test(line) && !line.trim().startsWith('-') && !line.trim().startsWith('•')) return true;
    // Common code patterns
    if (/^(class |def |function |const |let |var |import |from |if |for |while |return |self\.|print\(|console\.)/.test(t.trim())) return true;
    if (/[{};]$/.test(t.trim()) || /^\s*(else|elif|except|finally|catch|try):?\s*$/.test(t.trim())) return true;
    if (/^\s*(slow|fast|head|node|prev|curr|next)\s*[=.]/.test(t.trim())) return true;
    return false;
  };

  /** Group consecutive code-like lines into code blocks */
  const processTextBlock = (content: string): { type: 'code' | 'text'; content: string }[] => {
    const lines = content.split('\n');
    const result: { type: 'code' | 'text'; content: string }[] = [];
    let codeLines: string[] = [];
    let textLines: string[] = [];

    const flushCode = () => { if (codeLines.length > 0) { result.push({ type: 'code', content: codeLines.join('\n') }); codeLines = []; } };
    const flushText = () => { if (textLines.length > 0) { result.push({ type: 'text', content: textLines.join('\n') }); textLines = []; } };

    for (const line of lines) {
      if (isCodeLine(line)) {
        flushText();
        codeLines.push(line);
      } else {
        // Allow blank lines inside code blocks
        if (codeLines.length > 0 && line.trim() === '') {
          codeLines.push(line);
        } else {
          flushCode();
          textLines.push(line);
        }
      }
    }
    flushCode();
    flushText();
    return result;
  };

  const renderInline = (s: string) => {
    return s
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#0F172A;font-weight:700;font-family:\'Clash Display\',sans-serif">$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:#F1F5F9;color:#0F766E;padding:1px 5px;border-radius:3px;font-size:10px;font-family:\'JetBrains Mono\',monospace;border:1px solid #E2E8F0">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#76B900;text-decoration:underline">$1</a>');
  };

  const renderCodeBlock = (content: string, lang?: string, key?: number | string) => (
    <div key={key} className="rounded overflow-hidden my-1.5" style={{ border: '1px solid #E2E8F0' }}>
      <div className="flex items-center justify-between px-3 py-1" style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>{lang || 'code'}</span>
        <button onClick={() => navigator.clipboard.writeText(content)} className="text-[9px] px-1.5 py-0.5 rounded transition-colors hover:bg-gray-100" style={{ color: '#64748B' }}>Copy</button>
      </div>
      <pre className="px-3 py-2 overflow-x-auto" style={{ background: '#0F172A', color: '#A5F3FC', fontSize: '11px', lineHeight: '1.6', fontFamily: "'JetBrains Mono', monospace" }}><code>{content}</code></pre>
    </div>
  );

  const renderTextLine = (line: string, key: string) => {
    const t = line.trim();
    if (!t) return <div key={key} className="h-1" />;

    // Headers — bold with Clash Display
    if (t.startsWith('### ')) return <h4 key={key} className="mt-3 mb-1" style={{ fontSize: '11px', fontWeight: 700, color: C.text, fontFamily: "'Clash Display', sans-serif", letterSpacing: '-0.01em' }}>{t.slice(4)}</h4>;
    if (t.startsWith('## ')) return <h3 key={key} className="mt-3 mb-1" style={{ fontSize: '12px', fontWeight: 700, color: C.text, fontFamily: "'Clash Display', sans-serif", letterSpacing: '-0.01em' }}>{t.slice(3)}</h3>;
    if (t.startsWith('# ')) return <h2 key={key} className="mt-3 mb-1" style={{ fontSize: '13px', fontWeight: 700, color: C.text, fontFamily: "'Clash Display', sans-serif", letterSpacing: '-0.02em' }}>{t.slice(2)}</h2>;

    // ALL-CAPS labels (TIME:, SPACE:, APPROACH:, etc.)
    const labelMatch = t.match(/^(SITUATION|TASK|ACTION|RESULT|LEARNING|SUMMARY|TIP|NOTE|WARNING|TIME|SPACE|APPROACH|COMPLEXITY|EXAMPLE|INPUT|OUTPUT|Q\d+|A\d+)[:\s]+\s*(.*)/i);
    if (labelMatch) return (
      <div key={key} className="flex gap-2 mt-1.5">
        <span className="text-[8px] font-bold shrink-0 px-1.5 py-0.5 rounded mt-0.5" style={{ background: C.accentBg, color: C.accent }}>{labelMatch[1].toUpperCase()}</span>
        <span style={{ fontSize: '11px', lineHeight: '1.5', color: C.text }} dangerouslySetInnerHTML={{ __html: renderInline(labelMatch[2]) }} />
      </div>
    );

    // Step N: pattern
    const stepMatch = t.match(/^(Step\s+\d+)[:\s]+\s*(.*)/i);
    if (stepMatch) return (
      <div key={key} className="flex gap-2 pl-1 mt-0.5">
        <span className="text-[9px] font-bold shrink-0 px-1.5 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#475569' }}>{stepMatch[1]}</span>
        <span style={{ fontSize: '11px', color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{stepMatch[2]}</span>
      </div>
    );

    // Numbered list
    const numMatch = t.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) return (
      <div key={key} className="flex gap-2 pl-1 mt-0.5">
        <span className="text-[8px] font-bold shrink-0 mt-0.5 w-4 h-4 rounded flex items-center justify-center" style={{ background: C.accentBg, color: C.accent }}>{numMatch[1]}</span>
        <span style={{ fontSize: '11px', lineHeight: '1.5', color: C.text }} dangerouslySetInnerHTML={{ __html: renderInline(numMatch[2]) }} />
      </div>
    );

    // Bullets
    if (t.startsWith('- ') || t.startsWith('• ') || t.startsWith('* ')) return (
      <div key={key} className="flex gap-2 pl-2 mt-0.5">
        <span className="shrink-0 mt-2 w-1 h-1 rounded-full" style={{ background: C.accent }} />
        <span style={{ fontSize: '11px', lineHeight: '1.5', color: C.text }} dangerouslySetInnerHTML={{ __html: renderInline(t.slice(2)) }} />
      </div>
    );

    // Arrow patterns (Input: X -> Output: Y)
    if (/^(Input|Output)[:\s]/.test(t)) return (
      <div key={key} className="mt-0.5 px-2 py-1 rounded" style={{ background: '#F1F5F9', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#0F172A', border: '1px solid #E2E8F0' }}>
        {t}
      </div>
    );

    // Horizontal rule
    if (t === '---' || t === '***') return <div key={key} className="my-2 h-px" style={{ background: C.border }} />;

    // Regular paragraph
    return <p key={key} style={{ fontSize: '11px', lineHeight: '1.6', color: C.text }} dangerouslySetInnerHTML={{ __html: renderInline(t) }} />;
  };

  return (
    <div className="flex flex-col gap-0.5" style={{ fontFamily: "'Satoshi', sans-serif" }}>
      {blocks.map((block, bi) => {
        if (block.type === 'code') return renderCodeBlock(block.content, block.lang, bi);

        // Process text blocks to detect inline code
        const subBlocks = processTextBlock(block.content);
        return subBlocks.map((sub, si) => {
          if (sub.type === 'code') return renderCodeBlock(sub.content, 'python', `${bi}-code-${si}`);
          return sub.content.split('\n').map((line, li) => renderTextLine(line, `${bi}-${si}-${li}`));
        });
      })}
    </div>
  );
}

/* ── Mic Button (centered, prominent) ── */
function MicButtonLarge({ onResult, disabled }: { onResult: (text: string) => void; disabled: boolean }) {
  const { token } = useAuth();
  const [rec, setRec] = useState(false);
  const [busy, setBusy] = useState(false);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const mimeType = 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        console.log(`[Camo] stop: ${blob.size} bytes, ${chunks.current.length} chunks, mime=${mimeType}`);
        if (blob.size === 0) { console.warn('[Camo] empty blob'); return; }
        setBusy(true);
        try {
          const r = await transcriptionAPI.transcribe(token!, blob, 'audio.webm', false);
          console.log(`[Camo] API response:`, r);
          if (r.text?.trim()) onResult(r.text.trim());
          else console.warn('[Camo] empty text:', r);
        } catch (err) { console.error('[Camo] API error:', err); }
        setBusy(false);
      };
      mr.start();
      mrRef.current = mr;
      setRec(true);
      console.log('[Camo] recording started, mime:', mimeType);
    } catch (err) { console.error('[Camo] mic access error:', err); }
  }, [token, onResult]);
  const stop = useCallback(() => { mrRef.current?.state === 'recording' && mrRef.current.stop(); setRec(false); }, []);

  if (busy) return (
    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: C.accentBg }}>
      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: C.muted, borderTopColor: C.accent }} />
    </div>
  );
  return (
    <button onClick={rec ? stop : start} disabled={disabled}
      className="w-14 h-14 rounded-full flex items-center justify-center transition-all disabled:opacity-40 shadow-md hover:shadow-lg hover:scale-105"
      style={rec
        ? { background: '#ef4444', boxShadow: '0 0 0 4px rgba(239,68,68,0.2)' }
        : { background: C.elevated, boxShadow: `0 0 0 4px ${C.accentBg}` }
      }
      title={rec ? 'Stop recording' : 'Voice input'}
    >
      {rec
        ? <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
        : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
      }
    </button>
  );
}

/* ═══ Camo Panel ═══ */
export function AICompanionPanel({ isOpen, onClose }: AICompanionPanelProps) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [input, setInput] = useState('');
  const [minimized, setMinimized] = useState(false);
  const [panelWidth, setPanelWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);
  const [answerMode, setAnswerMode] = useState<AnswerMode>('short');
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

    const modePrefix = answerMode === 'short' ? '[SHORT] ' : '[DETAILED] ';

    setMessages(prev => [...prev, { role: 'user', text: question.trim(), time: new Date() }]);
    setStreaming(true);
    setStreamText('');

    try {
      await streamResponse({
        question: modePrefix + question.trim(),
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
  }, [token, streaming, answerMode]);

  const handleSubmit = useCallback(() => {
    if (input.trim()) { ask(input); setInput(''); }
  }, [input, ask]);

  return (
    <div className="hidden lg:flex shrink-0 h-full transition-all duration-200" style={{ width: minimized ? 48 : panelWidth }}>
      {/* Resize handle */}
      {!minimized && (
        <div
          className="w-[5px] h-full cursor-col-resize flex items-center justify-center group shrink-0 hover:bg-blue-400/20 transition-colors"
          style={{ background: isResizing ? 'rgba(118,185,0,0.2)' : '#E2E8F0' }}
          onMouseDown={(e) => { setIsResizing(true); resizeRef.current = { startX: e.clientX, startW: panelWidth }; }}
        >
          <div className="w-[3px] h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: '#76B900' }} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0" style={{ background: '#FFFFFF', borderLeft: '1px solid #E2E8F0' }}>
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-3 shrink-0" style={{ borderBottom: '1px solid #E2E8F0' }}>
        {minimized ? (
          <button onClick={() => setMinimized(false)} className="w-full flex items-center justify-center p-1.5 rounded-lg transition-colors hover:bg-gray-100" style={{ color: C.accent }} title="Expand Camo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          </button>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <button onClick={() => { if (messages.length > 0 && confirm('Clear chat history?')) setMessages([]); }}
                className="p-1.5 rounded-lg transition-colors hover:bg-gray-100" style={{ color: C.muted }} title="Clear history">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              </button>
              <button onClick={() => setMessages([])}
                className="p-1.5 rounded-lg transition-colors hover:bg-gray-100" style={{ color: C.muted }} title="New chat">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
            </div>
            <span className="text-xs font-bold tracking-tight" style={{ fontFamily: "'Clash Display', sans-serif", color: C.text }}>Camo</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: C.muted }}>{messages.filter(m => m.role === 'user').length}</span>
              <button onClick={() => setMinimized(true)}
                className="p-1.5 rounded-lg transition-colors hover:bg-gray-100" style={{ color: C.muted }} title="Minimize">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12h16" /></svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Answer Mode Toggle — Short / Detailed */}
      {!minimized && (
        <div className="flex items-center px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div className="flex items-center w-full rounded-lg p-0.5" style={{ background: '#F1F5F9' }}>
            {(['short', 'detailed'] as AnswerMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setAnswerMode(mode)}
                className="flex-1 py-1.5 text-center rounded-md transition-all"
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: "'Clash Display', sans-serif",
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: answerMode === mode ? '#FFFFFF' : '#94A3B8',
                  background: answerMode === mode ? '#76B900' : 'transparent',
                }}
              >
                {mode === 'short' ? 'Short' : 'Detailed'}
              </button>
            ))}
          </div>
        </div>
      )}

      {minimized ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: C.muted, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Camo</span>
        </div>
      ) : (<>
      {/* Chat */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-3">
        {messages.length === 0 && !streaming ? (
          <div className="flex flex-col items-center justify-center h-full py-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1" className="mb-4 opacity-40">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <p className="text-[9px] mb-3 text-center" style={{ color: C.muted }}>
              {answerMode === 'short' ? 'Short mode — concise bullet points for live interviews' : 'Detailed mode — comprehensive explanations with code'}
            </p>
            <div className="grid grid-cols-2 gap-1.5 w-full">
              {['Design a URL shortener', 'Explain TCP vs UDP', 'Tell me about a conflict', 'Detect cycle in linked list'].map(s => (
                <button key={s} onClick={() => ask(s)} className="text-left px-2.5 py-2 rounded-lg transition-all"
                  style={{ border: `1px solid ${C.border}`, fontSize: '10px', fontFamily: "'Satoshi', sans-serif", color: C.muted, lineHeight: '1.4' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.background = '#F1F5F9'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = 'transparent'; }}>
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
                  <p style={{ fontSize: '10px', fontFamily: "'Satoshi', sans-serif", color: C.text }}>{msg.text}</p>
                </div>
                <span className="text-[8px] mt-0.5 mr-1" style={{ color: C.muted }}>{msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ) : (
              <div key={i} className="flex gap-1.5 items-start">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" className="shrink-0 mt-0.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <div className="flex-1 min-w-0"><RichText text={msg.text} /></div>
              </div>
            ))}

            {/* Streaming */}
            {streaming && (
              <div className="flex gap-1.5 items-start">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" className="shrink-0 mt-0.5 animate-pulse">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <div className="flex-1">
                  {streamText ? <><RichText text={cleanTags(streamText)} /><span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm" style={{ background: C.accent }} /></>
                    : <span className="animate-pulse" style={{ fontSize: '10px', color: C.muted }}>Thinking...</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 shrink-0 flex flex-col items-center gap-2">
        {/* Prominent centered mic button */}
        <MicButtonLarge onResult={(text) => ask(text)} disabled={streaming} />
        {/* Text input row */}
        <div className="flex items-center gap-1.5 px-2 h-9 rounded-xl w-full" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) handleSubmit(); }}
            placeholder={answerMode === 'short' ? 'Type a question...' : 'Type a question...'}
            className="flex-1 bg-transparent focus:outline-none min-w-0 placeholder:opacity-40"
            style={{ fontFamily: "'Satoshi', sans-serif", color: C.text, fontSize: '10px' }} disabled={streaming} />
          {input.trim() && !streaming && (
            <button onClick={handleSubmit} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: '#76B900' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
      </div>
      </>)}
      </div>
    </div>
  );
}

export function AICompanionToggle({ onClick, hasActivity }: { onClick: () => void; hasActivity: boolean }) {
  return (
    <button onClick={onClick} className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105" style={{ background: '#76B900' }} title="Camo">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
      {hasActivity && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2" style={{ borderColor: C.base }} />}
    </button>
  );
}
