import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Chip from '@/components/shared/ui/Chip';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

// Try to load pre-generated static content from the public directory.
// Returns the content string, or null if the file doesn't exist.
async function loadStaticContent(source: string, slug: string): Promise<string | null> {
  try {
    const resp = await fetch(`/learn-content/${source}/${slug}.json`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.content || null;
  } catch {
    return null;
  }
}

// ── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  if (!text) return null;

  const escHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inline = (s: string) => {
    let r = escHtml(s);
    r = r.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary);font-weight:600">$1</strong>');
    r = r.replace(/`([^`]+)`/g, '<code style="padding:1px 5px;background:color-mix(in oklab,var(--cam-primary) 12%,var(--bg-elevated));border-radius:4px;color:var(--cam-primary);font-family:var(--font-mono);font-size:12px">$1</code>');
    r = r.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
    return r;
  };

  const codes: { lang: string; code: string }[] = [];
  const processed = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    codes.push({ lang: lang || 'code', code: code.trim() });
    return `__CODE_${codes.length - 1}__`;
  });

  const elements: React.ReactNode[] = [];
  let key = 0;
  const lines = processed.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Code block ──────────────────────────────────────────────────────────
    if (line.startsWith('__CODE_')) {
      const idx = parseInt(line.replace('__CODE_', '').replace('__', ''));
      const { lang, code } = codes[idx];
      elements.push(
        <div key={key++} className="my-4 rounded-xl overflow-hidden" style={{ background: '#0d1117', border: '1px solid color-mix(in oklab,var(--cam-primary) 20%,transparent)' }}>
          <div className="px-4 py-2" style={{ background: 'color-mix(in oklab,var(--cam-primary) 10%,#0d1117)', borderBottom: '1px solid color-mix(in oklab,var(--cam-primary) 15%,transparent)' }}>
            <span className="font-mono text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)', opacity: 0.7 }}>{lang}</span>
          </div>
          <pre className="px-4 py-4 overflow-x-auto text-[13px] leading-relaxed m-0" style={{ fontFamily: 'var(--font-mono)', color: '#e6edf3' }}>
            <code>{code}</code>
          </pre>
        </div>
      );
      i++; continue;
    }

    // ── Horizontal rule ─────────────────────────────────────────────────────
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      elements.push(
        <div key={key++} className="my-5" style={{ borderTop: '1px solid var(--border)' }} />
      );
      i++; continue;
    }

    // ── H1 (topic title, appears once at top of content) ────────────────────
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      elements.push(
        <h1 key={key++} className="text-[20px] font-bold mt-2 mb-5 leading-snug" style={{ color: 'var(--cam-gold-leaf)' }}>
          {line.slice(2)}
        </h1>
      );
      i++; continue;
    }

    // ── H2 ──────────────────────────────────────────────────────────────────
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-[15px] font-bold mt-8 mb-3 flex items-center gap-2" style={{ color: 'var(--cam-gold-leaf)' }}>
          <span className="w-1 h-4 rounded-full shrink-0" style={{ background: 'var(--cam-gold-leaf)' }} />
          {line.slice(3)}
        </h2>
      );
      i++; continue;
    }

    // ── H3 / standalone **bold** — both render as a subheading ─────────────
    {
      const t = line.trim();
      const isH3 = line.startsWith('### ');
      // Match "**label**", "****label****", "| **label**" with optional trailing colon
      const boldRe = /^(?:\|\s*)?\*{1,4}((?:[^*]|\*(?!\*))+)\*{1,4}:?\s*$/;
      const boldMatch = !isH3 ? boldRe.exec(t) : null;
      if (isH3 || boldMatch) {
        const rawLabel = isH3 ? line.slice(4) : (boldMatch ? boldMatch[1] : t);
        // Strip any wrapping ** that the AI adds inside H3 titles (e.g. ### **Title**)
        const cleanLabel = rawLabel.replace(/^\*+(.+?)\*+$/, '$1').trim();

        // ── Phase card layout (Learning Path Workflow phase headings) ────────
        if (/^phase\s+\d+/i.test(cleanLabel)) {
          i++;
          const descLines: string[] = [];
          const topics: { title: string; taskRange: string; bullets: string[] }[] = [];
          while (i < lines.length) {
            const ln = lines[i];
            const lnt = ln.trim();
            if (ln.startsWith('## ') || ln.startsWith('### ')) break;
            // Detect next phase bold heading — stop collecting
            if (boldRe.test(lnt)) {
              const m = boldRe.exec(lnt);
              if (m && /^phase\s+\d+/i.test(m[1].replace(/^\*+(.+?)\*+$/, '$1').trim())) break;
            }
            const numMatch = ln.match(/^\d+[.)]\s+(.*)/);
            if (numMatch) {
              const raw = numMatch[1].replace(/\*\*/g, '').trim();
              // Separate topic title from "(Tasks X–Y)" / "(Week N)" range annotation
              const taskM = raw.match(/^([\s\S]+?)\s+(\((?:Tasks?|Week)\s+[\d\-–—,\s]+\))\s*$/i);
              const title = (taskM ? taskM[1] : raw).trim();
              const taskRange = taskM ? taskM[2] : '';
              i++;
              const bullets: string[] = [];
              while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
                bullets.push(lines[i].replace(/^[-*•]\s/, ''));
                i++;
              }
              topics.push({ title, taskRange, bullets });
              continue;
            }
            if (!lnt) { i++; continue; }
            // Non-numbered text before any topics = phase description line
            if (topics.length === 0) { descLines.push(lnt); i++; continue; }
            break;
          }
          const description = descLines.join(' ');
          elements.push(
            <div key={key++} className="my-5 rounded-xl overflow-hidden"
              style={{ border: '1px solid color-mix(in oklab,var(--cam-gold-leaf) 30%,transparent)' }}>
              <div className="cam-hero-strip px-4 py-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--cam-gold-leaf)' }} />
                <span className="text-[13px] font-bold" style={{ color: 'var(--cam-gold-leaf)' }}>{cleanLabel}</span>
              </div>
              <div className="px-4 py-4 space-y-4" style={{ background: 'var(--bg-surface)' }}>
                {description && (
                  <p className="text-[12px] leading-relaxed -mt-1 mb-1" style={{ color: 'var(--text-muted)' }}>{description}</p>
                )}
                {topics.map((topic, ti) => (
                  <div key={ti}>
                    <div className="flex items-start gap-2.5 mb-1.5">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5"
                        style={{ background: 'color-mix(in oklab,var(--cam-primary) 15%,var(--bg-elevated))', color: 'var(--cam-primary)' }}>
                        {ti + 1}
                      </span>
                      <span className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                        {topic.title}
                        {topic.taskRange && (
                          <span className="ml-1.5 text-[12px] font-normal" style={{ color: 'var(--text-muted)' }}>{topic.taskRange}</span>
                        )}
                      </span>
                    </div>
                    {topic.bullets.length > 0 && (
                      <ul className="space-y-1 ml-7">
                        {topic.bullets.map((b, bi) => (
                          <li key={bi} className="flex items-start gap-1.5 text-[12px] leading-relaxed"
                            style={{ color: 'var(--text-secondary)' }}>
                            <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--text-muted)' }} />
                            <span dangerouslySetInnerHTML={{ __html: inline(b) }} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
          continue;
        }

        // ── Normal H3 / bold subheading ──────────────────────────────────────
        elements.push(
          <h3 key={key++} className="text-[13px] font-semibold mt-6 mb-2 flex items-center gap-2" style={{ color: 'var(--cam-gold-leaf)' }}>
            <span className="w-0.5 h-3.5 rounded-full shrink-0" style={{ background: 'var(--cam-gold-leaf)', opacity: 0.6 }} />
            <span dangerouslySetInnerHTML={{ __html: inline(cleanLabel) }} />
          </h3>
        );
        i++;
        // After a "Code Sketch / Code Sample / Snippet" heading, collect bare code lines that
        // the AI forgot to wrap in triple backticks and render them as a formatted code block.
        if (/code[\s_-]*(sketch|sample|snippet|example)|sample[\s_-]*code/i.test(cleanLabel)) {
          let j = i;
          if (j < lines.length && !lines[j].trim()) j++; // skip optional blank separator
          // Only activate if next content is NOT already a placeholder code block
          if (j < lines.length && !lines[j].startsWith('__CODE_') &&
              !lines[j].startsWith('## ') && !lines[j].startsWith('### ') && lines[j].trim()) {
            const codeLines: string[] = [];
            while (j < lines.length) {
              const ln = lines[j];
              if (!ln.trim()) break;
              if (ln.startsWith('__CODE_') || ln.startsWith('## ') || ln.startsWith('### ')) break;
              if (/^\*{1,4}[A-Z]/.test(ln.trim()) && /\*{1,4}:?\s*$/.test(ln.trim())) break;
              codeLines.push(ln);
              j++;
            }
            if (codeLines.length > 0) {
              const firstTrimmed = codeLines[0].trim();
              const isLangIndicator = /^[a-z][a-z0-9+#-]*$/.test(firstTrimmed) && codeLines.length > 1;
              const lang = isLangIndicator ? firstTrimmed : 'code';
              const codeContent = (isLangIndicator ? codeLines.slice(1) : codeLines).join('\n').trim();
              if (codeContent) {
                elements.push(
                  <div key={key++} className="my-4 rounded-xl overflow-hidden" style={{ background: '#0d1117', border: '1px solid color-mix(in oklab,var(--cam-primary) 20%,transparent)' }}>
                    <div className="px-4 py-2" style={{ background: 'color-mix(in oklab,var(--cam-primary) 10%,#0d1117)', borderBottom: '1px solid color-mix(in oklab,var(--cam-primary) 15%,transparent)' }}>
                      <span className="font-mono text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)', opacity: 0.7 }}>{lang}</span>
                    </div>
                    <pre className="px-4 py-4 overflow-x-auto text-[13px] leading-relaxed m-0" style={{ fontFamily: 'var(--font-mono)', color: '#e6edf3' }}>
                      <code>{codeContent}</code>
                    </pre>
                  </div>
                );
                i = j;
              }
            }
          }
        }
        continue;
      }
    }

    // ── Bullet list ──────────────────────────────────────────────────────────
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

    // ── Ordered list ─────────────────────────────────────────────────────────
    // Detect "section-style" numbered items (each followed by bullet sub-items)
    // vs. a plain sequential numbered list. Section-style renders the ordered
    // item as a bold sub-heading and the bullets as indented children.
    if (line.match(/^\d+[.)]\s/)) {
      const sections: Array<{ heading: string; bullets: string[] }> = [];
      let j = i;
      while (j < lines.length && lines[j].match(/^\d+[.)]\s/)) {
        const heading = lines[j].replace(/^\d+[.)]\s/, '');
        j++;
        if (j < lines.length && !lines[j].trim()) j++; // skip optional blank line between heading and bullets
        const bullets: string[] = [];
        while (j < lines.length && lines[j].match(/^[-*•]\s/)) {
          bullets.push(lines[j].replace(/^[-*•]\s/, ''));
          j++;
        }
        sections.push({ heading, bullets });
      }
      i = j;

      if (sections.some(s => s.bullets.length > 0)) {
        // Section-style: bold sub-heading + indented bullet children
        for (const section of sections) {
          elements.push(
            <p key={key++} className="text-[13px] font-semibold mt-3 mb-1" style={{ color: 'var(--text-primary)' }}
              dangerouslySetInnerHTML={{ __html: inline(section.heading) }} />
          );
          if (section.bullets.length > 0) {
            elements.push(
              <ul key={key++} className="space-y-1 mb-2 ml-4">
                {section.bullets.map((item, idx) => (
                  <li key={idx} className="text-[13px] leading-relaxed flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: 'var(--cam-primary)', opacity: 0.6 }} />
                    <span dangerouslySetInnerHTML={{ __html: inline(item) }} />
                  </li>
                ))}
              </ul>
            );
          }
        }
      } else {
        // Plain sequential numbered list
        elements.push(
          <ol key={key++} className="space-y-1.5 my-2 ml-4 list-decimal" style={{ paddingLeft: '1.25rem' }}>
            {sections.map((s, idx) => (
              <li key={idx} className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <span dangerouslySetInnerHTML={{ __html: inline(s.heading) }} />
              </li>
            ))}
          </ol>
        );
      }
      continue;
    }

    // ── Empty line ───────────────────────────────────────────────────────────
    if (!line.trim()) { i++; continue; }

    // ── Paragraph ────────────────────────────────────────────────────────────
    elements.push(
      <p key={key++} className="text-[13px] leading-relaxed my-2" style={{ color: 'var(--text-secondary)' }}
        dangerouslySetInnerHTML={{ __html: inline(line) }} />
    );
    i++;
  }

  return <>{elements}</>;
}

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  beginner:     { bg: 'color-mix(in oklab,#10b981 15%,var(--bg-elevated))', text: '#10b981' },
  intermediate: { bg: 'color-mix(in oklab,#f59e0b 15%,var(--bg-elevated))', text: '#f59e0b' },
  advanced:     { bg: 'color-mix(in oklab,#ef4444 15%,var(--bg-elevated))', text: '#ef4444' },
  easy:         { bg: 'color-mix(in oklab,#10b981 15%,var(--bg-elevated))', text: '#10b981' },
  medium:       { bg: 'color-mix(in oklab,#f59e0b 15%,var(--bg-elevated))', text: '#f59e0b' },
  hard:         { bg: 'color-mix(in oklab,#ef4444 15%,var(--bg-elevated))', text: '#ef4444' },
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LearnTopicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const title    = searchParams.get('title')    || slug?.replace(/-/g, ' ') || 'Topic';
  const source   = searchParams.get('source')   || 'programiz';
  const category = searchParams.get('category') || searchParams.get('topic') || '';
  const level    = searchParams.get('level')    || searchParams.get('difficulty') || 'beginner';
  const count    = searchParams.get('count')    || '';

  const backPath  = source === 'codesignal' ? '/capra/learn/codesignal' : '/capra/learn/programiz';
  const backLabel = source === 'codesignal' ? 'CodeSignal Learn' : 'Programiz Python';

  const [content, setContent]     = useState('');
  const [streaming, setStreaming] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const levelChip = LEVEL_COLORS[level] ?? LEVEL_COLORS.beginner;

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    (async () => {
      setContent('');
      setFromCache(false);
      setStreaming(true);

      // Check pre-generated static file first — instant, no AI generation
      const staticContent = await loadStaticContent(source, slug);
      if (staticContent && !cancelled) {
        setContent(staticContent);
        setFromCache(true);
        setStreaming(false);
        return;
      }

      try {
        const resp = await fetch(`${API_URL}/api/v1/learn/topic/${slug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: ctrl.signal,
          body: JSON.stringify({ title, source, category, level, count }),
        });

        if (!resp.ok || !resp.body) throw new Error('stream failed');

        const reader = resp.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        let full = '';
        let isCache = false;

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
              if (parsed.fromCache) {
                isCache = true;
                full = parsed.text;
                if (!cancelled) setContent(full);
              } else if (parsed.text) {
                full += parsed.text;
                if (!cancelled) setContent(full);
              }
            } catch {}
          }
        }

        if (!cancelled) setFromCache(isCache);
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== 'AbortError' && !cancelled) {
          setContent('Failed to load content. Please go back and try again.');
        }
      } finally {
        if (!cancelled) setStreaming(false);
      }
    })();

    return () => { cancelled = true; ctrl.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header strip */}
      <div className="cam-hero-strip px-6 py-5" style={{ borderBottom: '1px solid var(--cam-gold-leaf)' }}>
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="flex items-center gap-1.5 mb-3 text-[12px] font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--cam-strip-text-muted)' }}
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
              <Chip>{category.replace(/-/g, ' ')}</Chip>
            )}
            <Chip>{level}</Chip>
            {count && (
              <Chip variant="gold">{count} tasks</Chip>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <p className="text-[12px]" style={{ color: 'var(--cam-strip-text-muted)' }}>
            {source === 'programiz' ? 'Python Programming' : 'CodeSignal Learn'} · Learning guide
          </p>
          {fromCache && (
            <Chip variant="success">cached</Chip>
          )}
          {streaming && (
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--cam-strip-text-muted)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--cam-gold-leaf)' }} />
              Generating…
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 overflow-y-auto" style={{ maxWidth: 860, width: '100%', margin: '0 auto' }}>
        {!content && streaming && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="w-5 h-5 rounded-full border-2 border-[var(--cam-primary)] border-t-transparent animate-spin" />
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Building your learning guide…</span>
          </div>
        )}

        {content && (
          <div>
            {renderMarkdown(content)}
            {streaming && (
              <span className="inline-block w-2 h-4 ml-0.5 rounded-sm animate-pulse" style={{ background: 'var(--cam-primary)', verticalAlign: 'middle' }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
