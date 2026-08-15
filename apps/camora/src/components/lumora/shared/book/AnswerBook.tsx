import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import hljs from 'highlight.js';
import type { BookBlock, BookDoc } from '@/lib/lumora/book-model';

type Props = {
  doc: BookDoc;
  onLineHover?: (line: number | undefined, code?: string, index?: number) => void;
  onLineClick?: (line: number | undefined, code?: string, index?: number) => void;
};

const CodeBlock = ({ lang, code }: { lang: string; code: string }) => {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.removeAttribute('data-highlighted');
    el.textContent = code;
    hljs.highlightElement(el);
  }, [code, lang]);
  return (
    <div className="lumora-book-breakout my-2.5 rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--bg-elevated)]">
      <div className="flex items-center justify-between px-2.5 py-1 border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent-text)]">{lang}</span>
        <button
          className="font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => navigator.clipboard.writeText(code)}
        >
          Copy
        </button>
      </div>
      <pre className="overflow-x-auto p-2.5 m-0">
        <code ref={ref} className={`language-${lang} text-[12.5px] leading-[1.5]`} />
      </pre>
    </div>
  );
};

// Render inline `code` spans within otherwise-plain prose. Only backticks are
// styled — cleanText() already strips ** and # upstream, so nothing else can
// smuggle markdown in. Restores the inline-code styling the old CoFix
// inlineFormat parser gave walkthrough text.
const InlineText = ({ text }: { text: string }): ReactElement => {
  if (!text || !text.includes('`')) return <>{text}</>;
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.length > 2 && part.startsWith('`') && part.endsWith('`')
          ? <code key={i} className="font-mono text-[0.86em] px-1.5 py-[1.5px] mx-[1px] rounded-[4px] border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] whitespace-nowrap">{part.slice(1, -1)}</code>
          : <span key={i}>{part}</span>,
      )}
    </>
  );
};

const Block = ({ block, onLineHover, onLineClick }: { block: BookBlock } & Omit<Props, 'doc'>): ReactElement | null => {
  switch (block.kind) {
    case 'prose':
      return <p className="mb-3"><InlineText text={block.text} /></p>;

    case 'callout':
      return (
        <div className="lumora-book-callout">
          <div className="lumora-book-label !mt-0">{block.label}</div>
          <ul className="space-y-0.5">
            {block.items.map((it, i) => <li key={i}><InlineText text={it} /></li>)}
          </ul>
        </div>
      );

    case 'list':
      // Long lists (e.g. Concepts) flow into two columns to save vertical space.
      return (
        <ul className={`list-disc pl-4 space-y-0.5 mb-2 ${block.items.length > 6 ? 'sm:columns-2 sm:gap-x-8 [&>li]:break-inside-avoid' : ''}`}>
          {block.items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      );

    case 'code':
      return <CodeBlock lang={block.lang} code={block.code} />;

    case 'kv':
      return (
        <div className="flex flex-wrap gap-x-5 gap-y-0.5 mb-2">
          {block.pairs.map(([k, v]) => (
            <span key={k} className="flex items-baseline gap-2">
              <span className="lumora-book-label !my-0">{k}</span>
              <span className="font-mono text-[12.5px] text-[var(--text-primary)]">{v}</span>
            </span>
          ))}
        </div>
      );

    case 'trace':
      return (
        <div className="lumora-book-breakout my-2 overflow-x-auto">
          <table className="w-full text-[12.5px] border-collapse">
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-1 pr-2.5 font-mono text-[var(--accent-text)] align-top">{r.step}</td>
                  <td className="py-1 pr-2.5 align-top">{r.action}</td>
                  <td className="py-1 font-mono text-[var(--text-muted)] align-top">{r.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'walk': {
      const interactive = !!(onLineHover || onLineClick);
      return (
        <div className="my-2 space-y-1.5">
          {block.rows.map((r, i) => {
            const bindable = interactive && (r.line != null || !!r.code);
            return (
            <div
              key={i}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 transition-colors hover:border-[var(--cam-gold-leaf-dk)]"
              style={bindable ? { cursor: 'pointer' } : undefined}
              onMouseEnter={() => bindable && onLineHover?.(r.line, r.code, i)}
              onMouseLeave={() => bindable && onLineHover?.(undefined)}
              onClick={() => bindable && onLineClick?.(r.line, r.code, i)}
            >
              {(r.line != null || r.code) && (
                <div className="flex items-center gap-1.5 mb-0.5">
                  {r.line != null && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent-text)] shrink-0">
                      L{r.line}
                    </span>
                  )}
                  {r.code && <code className="font-mono text-[12px] text-[var(--text-muted)] truncate">{r.code}</code>}
                </div>
              )}
              <span className="text-[12.5px] leading-[1.5]"><InlineText text={r.explanation} /></span>
            </div>
            );
          })}
        </div>
      );
    }

    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
};

export const AnswerBook = ({ doc, onLineHover, onLineClick }: Props) => (
  <div className="lumora-book">
    {doc.title && <h1 className="lumora-book-section" style={{ marginTop: 0 }}>{doc.title}</h1>}
    {doc.sections.map(section => (
      <section key={section.id}>
        <h2 className="lumora-book-section">{section.heading}</h2>
        {section.blocks.map((block, i) => (
          <Block key={i} block={block} onLineHover={onLineHover} onLineClick={onLineClick} />
        ))}
      </section>
    ))}
  </div>
);
