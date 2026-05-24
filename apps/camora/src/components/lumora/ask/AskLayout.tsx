import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import hljs from 'highlight.js/lib/core';
import hljsPython from 'highlight.js/lib/languages/python';
import hljsJS from 'highlight.js/lib/languages/javascript';
import hljsTS from 'highlight.js/lib/languages/typescript';
import hljsJava from 'highlight.js/lib/languages/java';
import hljsGo from 'highlight.js/lib/languages/go';
import hljsSQL from 'highlight.js/lib/languages/sql';
import hljsCpp from 'highlight.js/lib/languages/cpp';
import hljsBash from 'highlight.js/lib/languages/bash';
import 'highlight.js/styles/atom-one-dark.css';

hljs.registerLanguage('python', hljsPython);
hljs.registerLanguage('py', hljsPython);
hljs.registerLanguage('javascript', hljsJS);
hljs.registerLanguage('js', hljsJS);
hljs.registerLanguage('typescript', hljsTS);
hljs.registerLanguage('ts', hljsTS);
hljs.registerLanguage('java', hljsJava);
hljs.registerLanguage('go', hljsGo);
hljs.registerLanguage('sql', hljsSQL);
hljs.registerLanguage('cpp', hljsCpp);
hljs.registerLanguage('c', hljsCpp);
hljs.registerLanguage('bash', hljsBash);
hljs.registerLanguage('sh', hljsBash);

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

// ── Syntax-highlighted code block ─────────────────────────────────────────────
const CodeBlock = ({ code, lang }: { code: string; lang: string }) => {
  const html = useMemo(() => {
    const trimmed = code.trim();
    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(trimmed, { language: lang, ignoreIllegals: true }).value;
      }
      return hljs.highlightAuto(trimmed).value;
    } catch {
      return trimmed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }, [code, lang]);

  return (
    <div className="my-2 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      {lang && (
        <div className="px-3 py-1.5 flex items-center justify-between" style={{ background: '#21252b', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#abb2bf' }}>{lang}</span>
        </div>
      )}
      <pre className="px-4 py-3 text-[12.5px] overflow-x-auto leading-relaxed hljs" style={{ background: '#282c34', fontFamily: 'IBM Plex Mono, monospace', margin: 0 }}>
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
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
      nodes.push(<code key={m.index} style={{ padding: '1px 5px', background: 'rgba(16,185,129,0.12)', borderRadius: 4, color: '#10b981', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{m[2]}</code>);
    }
    last = m.index + m[0].length;
  }
  if (last < raw.length) nodes.push(raw.slice(last));
  return nodes;
};

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

    for (const line of lines) {
      const trimmed = line.trim();
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

  const deleteConversation = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API_URL}/api/v1/ask/history/${id}`, { method: 'DELETE', credentials: 'include' });
      setHistory(prev => prev.filter(c => c.id !== id));
      if (convId === id) { setMessages([]); setConvId(null); }
    } catch {}
  }, [convId]);

  const clearAllHistory = useCallback(async () => {
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
            if (parsed.error) { full = `Error: ${parsed.error}`; break; }
          } catch {}
        }
      }

      if (full) {
        setMessages(prev => [...prev, { role: 'assistant', content: full }]);
        if (!full.startsWith('Error:')) {
          fetch(`${API_URL}/api/v1/ask/history`, { credentials: 'include' })
            .then(r => r.json()).then(d => setHistory(d.conversations || [])).catch(() => {});
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'No response received. Please try again.' }]);
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

      {/* Top bar — navy strip with gold-leaf border */}
      <div className="flex items-center justify-between px-5 h-12 shrink-0" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
        <div className="flex items-center gap-2">
          {hasMessages && (
            <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors hover:bg-white/10" style={{ color: 'var(--cam-gold-leaf)', border: '1px solid rgba(217,181,67,0.35)', ...sans }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New
            </button>
          )}
        </div>
        <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color: 'var(--cam-gold-leaf)', ...sans }}>Ask Sona</span>
        <button
          onClick={() => setShowHistory(h => !h)}
          className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors hover:bg-white/10"
          style={{ color: showHistory ? 'var(--cam-gold-leaf)' : 'rgba(255,255,255,0.7)', border: `1px solid ${showHistory ? 'rgba(217,181,67,0.5)' : 'rgba(255,255,255,0.15)'}`, ...sans }}
        >
          {showHistory ? 'Close' : `History (${history.length})`}
        </button>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="shrink-0 border-b" style={{ borderColor: 'var(--cam-gold-leaf-dk)', background: 'var(--cam-hero-strip)' }}>
          {/* History header */}
          <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--cam-gold-leaf-dk)' }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-gold-leaf)', ...sans }}>
              History ({history.length})
            </span>
            {history.length > 0 && (
              <button
                onClick={clearAllHistory}
                className="text-[11px] px-2.5 py-1 rounded transition-colors hover:bg-red-900/30"
                style={{ color: '#f87171', ...sans }}
              >
                Clear all
              </button>
            )}
          </div>
          {/* History list */}
          <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
            {history.length === 0 ? (
              <p className="p-4 text-[12px]" style={{ color: 'var(--cam-gold-leaf-dk)', ...sans }}>No history yet</p>
            ) : history.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-2 border-b hover:bg-white/5 transition-colors"
                style={{ borderColor: 'rgba(217,181,67,0.15)' }}
              >
                <button
                  onClick={() => loadConversation(c.id)}
                  className="flex-1 text-left px-4 py-2.5 text-[13px] flex items-center gap-3 min-w-0"
                  style={{ color: 'rgba(255,255,255,0.85)', ...sans }}
                >
                  <span className="truncate">{c.title}</span>
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(217,181,67,0.15)', color: 'var(--cam-gold-leaf)' }}>
                    {c.provider}
                  </span>
                </button>
                <button
                  onClick={e => deleteConversation(c.id, e)}
                  className="shrink-0 mr-3 p-1 rounded hover:bg-red-900/40 transition-colors"
                  title="Delete conversation"
                  style={{ color: '#f87171' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
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
          <div className="flex flex-col gap-2 mb-6 w-full" style={{ maxWidth: 640 }}>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSubmit(s)}
                className="flex items-center gap-3 text-left px-4 py-3 rounded-xl transition-all hover:bg-[var(--bg-elevated)] active:scale-[0.99]"
                style={{ color: 'var(--text-secondary)', fontSize: 13, background: 'var(--bg-surface)', border: '1px solid rgba(217,181,67,0.18)', ...sans }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--cam-gold-leaf)', flexShrink: 0 }}>
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--cam-gold-leaf-dk)', background: 'var(--bg-surface)' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {/* Provider toggle */}
          <div className="flex items-center justify-end gap-1.5 mb-2">
            {(['claude', 'gemini'] as Provider[]).map(p => (
              <button
                key={p}
                onClick={() => {
                  if (p === provider) return;
                  setProvider(p);
                  setMessages([]);
                  setConvId(null);
                  setStreamText('');
                  setShowHistory(false);
                }}
                className="px-3 py-1 text-[11px] rounded-full font-semibold transition-all"
                style={{
                  ...sans,
                  background: provider === p ? 'var(--cam-gold-leaf)' : 'var(--bg-elevated)',
                  color: provider === p ? '#020617' : 'var(--text-muted)',
                  border: `1px solid ${provider === p ? 'var(--cam-gold-leaf)' : 'var(--border)'}`,
                  boxShadow: provider === p ? '0 0 0 1px rgba(217,181,67,0.4), 0 2px 8px rgba(217,181,67,0.2)' : 'none',
                }}
              >
                {p === 'claude' ? '✦ Claude' : '◆ Gemini'}
              </button>
            ))}
          </div>

          {/* Input box */}
          <div className="relative rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--cam-gold-leaf-dk)', boxShadow: '0 0 0 1px rgba(217,181,67,0.1), 0 4px 20px rgba(0,0,0,0.3)' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Ask anything…"
              rows={1}
              className="w-full resize-none px-5 pt-3 pb-10 text-[14px] bg-transparent focus:outline-none placeholder:opacity-40"
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
