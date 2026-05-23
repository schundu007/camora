import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';

interface Msg { role: 'user' | 'assistant'; content: string; }
interface Conv { id: string; title: string; provider: string; updated_at: string; }

type Provider = 'claude' | 'gemini';

const SUGGESTIONS = [
  'Fill in the missing code for a binary search function',
  'Write a Python function to find all subsets of an array',
  'Explain each line of this code and fix any bugs',
  'Implement a LRU cache class with get and put methods',
];

// ── Simple structured response renderer ──────────────────────────────────────
const CodeBlock = ({ code, lang }: { code: string; lang: string }) => (
  <div className="my-2 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
    {lang && (
      <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
        {lang}
      </div>
    )}
    <pre className="px-4 py-3 text-[12px] overflow-x-auto leading-relaxed" style={{ background: '#0d1117', color: '#e6edf3', fontFamily: 'IBM Plex Mono, monospace', margin: 0 }}>
      {code.trim()}
    </pre>
  </div>
);

const renderContent = (text: string) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const inner = part.slice(3, -3);
      const nl = inner.indexOf('\n');
      const lang = nl > -1 ? inner.slice(0, nl).trim() : '';
      const code = nl > -1 ? inner.slice(nl + 1) : inner;
      return <CodeBlock key={i} code={code} lang={lang} />;
    }
    if (!part.trim()) return null;
    return (
      <span key={i} className="whitespace-pre-wrap text-[14px] leading-relaxed" style={{ color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        {part}
      </span>
    );
  });
};

const AskResponse = ({ content }: { content: string }) => {
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
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--cam-gold-leaf-dk)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {title}
            </p>
            <div>{renderContent(body)}</div>
          </div>
        );
      })}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const AskLayout = () => {
  const { user } = useAuth() as any;
  const firstName = user?.name?.split(' ')[0] || 'there';

  const [messages, setMessages]         = useState<Msg[]>([]);
  const [input, setInput]               = useState('');
  const [streaming, setStreaming]       = useState(false);
  const [streamText, setStreamText]     = useState('');
  const [provider, setProvider]         = useState<Provider>('claude');
  const [convId, setConvId]             = useState<string | null>(null);
  const [history, setHistory]           = useState<Conv[]>([]);
  const [showHistory, setShowHistory]   = useState(false);

  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

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
    try {
      const r = await fetch(`${API_URL}/api/v1/ask/history/${id}`, { credentials: 'include' });
      const d = await r.json();
      setMessages(d.messages || []);
      setConvId(id);
      setShowHistory(false);
    } catch {}
  }, []);

  const handleSubmit = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setStreaming(true);
    setStreamText('');

    try {
      const body = JSON.stringify({
        message: msg,
        history: messages.map(m => ({ role: m.role, content: m.content })),
        provider,
        conversationId: convId,
      });
      const resp = await fetch(`${API_URL}/api/v1/ask/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body,
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
          } catch {}
        }
      }

      if (full) {
        setMessages(prev => [...prev, { role: 'assistant', content: full }]);
        // refresh history list
        fetch(`${API_URL}/api/v1/ask/history`, { credentials: 'include' })
          .then(r => r.json()).then(d => setHistory(d.conversations || [])).catch(() => {});
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setStreaming(false);
      setStreamText('');
      inputRef.current?.focus();
    }
  }, [input, messages, streaming, provider, convId]);

  const startNew = () => {
    setMessages([]);
    setConvId(null);
    setStreamText('');
    setShowHistory(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const sans: React.CSSProperties = { fontFamily: 'Plus Jakarta Sans, sans-serif' };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-10 shrink-0" style={{ borderBottom: '1px solid var(--cam-gold-leaf-dk)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-2">
          {hasMessages && (
            <button onClick={startNew} className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-colors hover:bg-[var(--bg-elevated)]" style={{ color: 'var(--cam-gold-leaf-dk)', ...sans }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New
            </button>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--cam-gold-leaf-dk)', ...sans }}>Ask Sona</span>
        <button
          onClick={() => setShowHistory(h => !h)}
          className="text-[11px] px-2.5 py-1 rounded transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-muted)', ...sans }}
        >
          {showHistory ? 'Close' : `History (${history.length})`}
        </button>
      </div>

      {/* History panel overlay */}
      {showHistory && (
        <div className="shrink-0 overflow-y-auto border-b" style={{ maxHeight: 220, borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          {history.length === 0 ? (
            <p className="p-4 text-[12px]" style={{ color: 'var(--text-muted)', ...sans }}>No history yet</p>
          ) : history.map(c => (
            <button
              key={c.id}
              onClick={() => loadConversation(c.id)}
              className="w-full text-left px-4 py-2.5 text-[13px] transition-colors hover:bg-[var(--bg-elevated)] flex items-center justify-between gap-3"
              style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', ...sans }}
            >
              <span className="truncate">{c.title}</span>
              <span className="shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {c.provider}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Messages / empty state */}
      {hasMessages ? (
        <div className="flex-1 overflow-y-auto py-6" style={{ paddingLeft: 'max(1rem, calc(50% - 390px))', paddingRight: 'max(1rem, calc(50% - 390px))' }}>
          {messages.map((m, i) => (
            <div key={i} className={`mb-6 ${m.role === 'user' ? 'flex justify-end' : ''}`}>
              {m.role === 'user' ? (
                <div className="max-w-[75%] px-4 py-2.5 rounded-2xl text-[14px]" style={{ background: 'var(--cam-hero-strip)', border: '1px solid var(--cam-gold-leaf-dk)', color: 'white', ...sans }}>
                  {m.content}
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
                  <span className="inline-block w-1.5 h-4 animate-pulse ml-0.5 align-middle rounded-sm" style={{ background: 'var(--cam-gold-leaf)' }} />
                </>
              ) : (
                <div className="flex items-center gap-1.5 mt-2">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--cam-gold-leaf)', animationDelay: `${d}ms` }} />
                  ))}
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <h1 className="text-[26px] font-semibold mb-8 text-center" style={{ color: 'var(--text-primary)', ...sans }}>
            Hey <span style={{ color: 'var(--cam-gold-leaf)' }}>{firstName}</span>, what's on your mind?
          </h1>
          <div className="flex flex-col gap-1 mb-6 w-full" style={{ maxWidth: 640 }}>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSubmit(s)}
                className="flex items-center gap-3 text-left px-4 py-2.5 rounded-xl transition-colors hover:bg-[var(--bg-elevated)]"
                style={{ color: 'var(--text-secondary)', fontSize: 13, ...sans }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--cam-gold-leaf-dk)', flexShrink: 0 }}>
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 px-4 pb-4 pt-2" style={{ borderTop: hasMessages ? '1px solid var(--border)' : 'none' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {/* Provider toggle */}
          <div className="flex items-center justify-end gap-1.5 mb-2">
            {(['claude', 'gemini'] as Provider[]).map(p => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className="px-3 py-1 text-[11px] rounded-full font-semibold transition-all"
                style={{
                  ...sans,
                  background: provider === p ? 'var(--cam-gold-leaf)' : 'var(--bg-elevated)',
                  color: provider === p ? '#0a0e1a' : 'var(--text-muted)',
                  border: `1px solid ${provider === p ? 'var(--cam-gold-leaf)' : 'var(--border)'}`,
                }}
              >
                {p === 'claude' ? '✦ Claude' : '◆ Gemini'}
              </button>
            ))}
          </div>

          {/* Input box */}
          <div className="relative rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 2px 16px rgba(0,0,0,0.25)' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Ask anything…"
              rows={2}
              className="w-full resize-none px-5 pt-4 pb-14 text-[14px] bg-transparent focus:outline-none placeholder:opacity-40"
              style={{ color: 'var(--text-primary)', ...sans }}
            />
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
              <span className="text-[10px]" style={{ color: 'var(--text-muted)', ...sans }}>↵ to send · ⇧↵ new line</span>
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || streaming}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30 hover:opacity-85"
                style={{ background: 'var(--cam-gold-leaf)' }}
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
  );
};
