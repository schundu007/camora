import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

// ── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  if (!text) return null;

  const escHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inline = (s: string) => {
    let r = escHtml(s);
    r = r.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary);font-weight:600">$1</strong>');
    r = r.replace(/`([^`]+)`/g, '<code style="padding:1px 5px;background:color-mix(in oklab,var(--cam-primary) 12%,var(--bg-elevated));border-radius:4px;color:var(--cam-primary);font-family:var(--font-mono);font-size:12px">$1</code>');
    r = r.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return r;
  };

  // Extract code blocks
  const codes: { lang: string; code: string }[] = [];
  let processed = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    codes.push({ lang: lang || 'code', code: code.trim() });
    return `__CODE_${codes.length - 1}__`;
  });

  const elements: React.ReactNode[] = [];
  let key = 0;
  const lines = processed.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block placeholder
    if (line.startsWith('__CODE_')) {
      const idx = parseInt(line.replace('__CODE_', '').replace('__', ''));
      const { lang, code } = codes[idx];
      elements.push(
        <div key={key++} className="my-4 rounded-xl overflow-hidden" style={{ background: '#0d1117', border: '1px solid color-mix(in oklab,var(--cam-primary) 20%,transparent)' }}>
          <div className="flex items-center justify-between px-4 py-2" style={{ background: 'color-mix(in oklab,var(--cam-primary) 10%,#0d1117)', borderBottom: '1px solid color-mix(in oklab,var(--cam-primary) 15%,transparent)' }}>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)', opacity: 0.7 }}>{lang || 'code'}</span>
          </div>
          <pre className="px-4 py-4 overflow-x-auto text-[13px] leading-relaxed m-0" style={{ fontFamily: 'var(--font-mono)', color: '#e6edf3' }}>
            <code>{code}</code>
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-[15px] font-bold mt-8 mb-3 flex items-center gap-2" style={{ color: 'var(--cam-gold-leaf)' }}>
          <span className="w-1 h-4 rounded-full shrink-0" style={{ background: 'var(--cam-gold-leaf)' }} />
          {line.slice(3)}
        </h2>
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-[13px] font-semibold mt-5 mb-2" style={{ color: 'var(--text-primary)' }}>
          {line.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    // Bullet list — collect consecutive items
    if (line.match(/^[-*•]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*•]\s/)) {
        items.push(lines[i].replace(/^[-*•]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={key++} className="space-y-1.5 my-2 ml-4">
          {items.map((item, j) => (
            <li key={j} className="text-[13px] leading-relaxed flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
              <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: 'var(--cam-primary)' }} />
              <span dangerouslySetInnerHTML={{ __html: inline(item) }} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (line.match(/^\d+[.)]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+[.)]\s/)) {
        items.push(lines[i].replace(/^\d+[.)]\s/, ''));
        i++;
      }
      elements.push(
        <ol key={key++} className="space-y-1.5 my-2 ml-4 list-decimal" style={{ paddingLeft: '1.25rem' }}>
          {items.map((item, j) => (
            <li key={j} className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span dangerouslySetInnerHTML={{ __html: inline(item) }} />
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line — skip
    if (!line.trim()) { i++; continue; }

    // Paragraph
    elements.push(
      <p key={key++} className="text-[13px] leading-relaxed my-2" style={{ color: 'var(--text-secondary)' }}
        dangerouslySetInnerHTML={{ __html: inline(line) }} />
    );
    i++;
  }

  return <>{elements}</>;
}

// ── Level / difficulty badge colors ─────────────────────────────────────────

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  beginner:     { bg: 'color-mix(in oklab,#10b981 15%,var(--bg-elevated))', text: '#10b981' },
  intermediate: { bg: 'color-mix(in oklab,#f59e0b 15%,var(--bg-elevated))', text: '#f59e0b' },
  advanced:     { bg: 'color-mix(in oklab,#ef4444 15%,var(--bg-elevated))', text: '#ef4444' },
  easy:         { bg: 'color-mix(in oklab,#10b981 15%,var(--bg-elevated))', text: '#10b981' },
  medium:       { bg: 'color-mix(in oklab,#f59e0b 15%,var(--bg-elevated))', text: '#f59e0b' },
  hard:         { bg: 'color-mix(in oklab,#ef4444 15%,var(--bg-elevated))', text: '#ef4444' },
};

function buildPrompt(params: {
  title: string;
  source: string;
  category: string;
  level: string;
  count: string;
}): string {
  const { title, source, category, level, count } = params;

  if (source === 'programiz') {
    return `Create a comprehensive Python learning guide for: "${title}".
Level: ${level} | Category: ${category}

Structure your response EXACTLY as follows with these headings:

## Overview
2–3 sentences: what this topic is and why it matters in Python.

## Key Concepts
Bullet list of the core ideas for this topic (5–7 points).

## How It Works
Step-by-step explanation of the mechanics. Include at least one code example.

## Code Examples
Show 3 practical Python code examples covering different use cases. Each should have a short label and demonstrate a real pattern.

## Workflow
Describe in bullet points the typical workflow / mental model a developer follows when using this feature.

## Common Mistakes
2–3 common errors or misconceptions beginners make with this topic and how to avoid them.

## Practice Exercise
One concrete hands-on exercise with a clear problem statement.

Keep code examples clean, idiomatic Python. Be specific to "${title}" — do not give generic programming advice.`;
  }

  // CodeSignal course path
  return `Create a comprehensive learning guide for the programming course path: "${title}".
Difficulty: ${level} | Focus area: ${category}${count ? ` | ${count} practice tasks` : ''}

Structure your response EXACTLY as follows:

## Course Overview
What this course path covers, who it's designed for, and what makes it valuable for interview prep.

## Core Topics Covered
Bullet list of the main subjects and skills taught in this course path (6–8 items).

## Learning Path Workflow
Step-by-step breakdown of how to progress through this course effectively — what to learn in what order and why.

## Key Skills You'll Build
The specific technical competencies and patterns you'll develop from this course path.

## Sample Problem Types
3–4 representative problem types or challenges from this course with brief descriptions and pseudocode or code sketches.

## Prerequisites
What knowledge you should have before starting, and what you can tackle after completing this path.

## Interview Relevance
How mastery of this course path translates to technical interview performance — which roles, companies, or question categories this prepares you for.

Be specific to "${title}". Include concrete code examples where relevant.`;
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function LearnTopicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const title    = searchParams.get('title')    || slug?.replace(/-/g, ' ') || 'Topic';
  const source   = searchParams.get('source')   || 'programiz';
  const category = searchParams.get('category') || searchParams.get('topic') || '';
  const level    = searchParams.get('level')    || searchParams.get('difficulty') || 'beginner';
  const count    = searchParams.get('count')    || '';

  const backPath = source === 'codesignal' ? '/capra/learn/codesignal' : '/capra/learn/programiz';
  const backLabel = source === 'codesignal' ? 'CodeSignal Learn' : 'Programiz Python';

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const levelChip = LEVEL_COLORS[level] ?? LEVEL_COLORS.beginner;
  const cacheKey = `learn_topic_${slug}`;

  const generate = async (force = false) => {
    if (loading) {
      abortRef.current?.abort();
      return;
    }

    // Return cached content unless forcing a regeneration
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setContent(cached);
        setDone(true);
        return;
      }
    }

    setContent('');
    setDone(false);
    setLoading(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch(`${API_URL}/api/v1/ask/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: ctrl.signal,
        body: JSON.stringify({ message: buildPrompt({ title, source, category, level, count }) }),
      });

      if (!resp.ok || !resp.body) throw new Error('stream failed');

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let full = '';

      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.text) { full += parsed.text; setContent(full); }
          } catch {}
        }
      }
      if (full) localStorage.setItem(cacheKey, full);
      setDone(true);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setContent(prev => prev || 'Failed to generate content. Please try again.');
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  // Load from cache or generate on mount
  useEffect(() => {
    generate(false);
    return () => abortRef.current?.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header strip */}
      <div className="cam-hero-strip px-6 py-5" style={{ borderBottom: '1px solid var(--cam-gold-leaf)' }}>
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="flex items-center gap-1.5 mb-3 text-[12px] font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {backLabel}
        </button>

        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-[18px] font-bold leading-snug flex-1" style={{ color: 'var(--cam-gold-leaf)' }}>
            {title}
          </h1>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {category && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' }}>
                {category.replace(/-/g, ' ')}
              </span>
            )}
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full capitalize font-bold" style={{ background: levelChip.bg, color: levelChip.text }}>
              {level}
            </span>
            {count && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in oklab,var(--cam-gold-leaf) 15%,transparent)', color: 'var(--cam-gold-leaf)' }}>
                {count} tasks
              </span>
            )}
          </div>
        </div>

        <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {source === 'programiz' ? 'Python Programming' : 'CodeSignal Learn'} · AI-powered learning guide
        </p>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 px-6 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        <button
          type="button"
          onClick={() => generate(loading ? false : true)}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80"
          style={{
            background: loading ? 'color-mix(in oklab,var(--cam-primary) 20%,var(--bg-surface))' : 'var(--cam-primary)',
            color: loading ? 'var(--cam-primary)' : 'white',
            border: loading ? '1px solid var(--cam-primary)' : 'none',
          }}
        >
          {loading ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Stop
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 7l-7 5 7 5V7zM1 5h15v14H1z" />
              </svg>
              {done ? 'Regenerate' : 'Generate'}
            </>
          )}
        </button>
        {loading && (
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Generating learning guide…</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 overflow-y-auto" style={{ maxWidth: 860, width: '100%', margin: '0 auto' }}>
        {!content && !loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Click Generate to create a learning guide for this topic.</span>
          </div>
        )}

        {content && (
          <div>
            {renderMarkdown(content)}
            {loading && (
              <span className="inline-block w-2 h-4 ml-0.5 rounded-sm animate-pulse" style={{ background: 'var(--cam-primary)', verticalAlign: 'middle' }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
