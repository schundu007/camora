import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import hljs from 'highlight.js';
import type { BookBlock, BookDoc } from '@/lib/lumora/book-model';

type Props = {
  doc: BookDoc;
  onLineHover?: (line?: number) => void;
  onLineClick?: (line: number) => void;
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
    <div className="lumora-book-breakout my-4 rounded-lg overflow-hidden border border-[var(--border)]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)]">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent-text)]">{lang}</span>
        <button
          className="font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => navigator.clipboard.writeText(code)}
        >
          Copy
        </button>
      </div>
      <pre className="overflow-x-auto p-3 m-0">
        <code ref={ref} className={`language-${lang} text-[13px] leading-relaxed`} />
      </pre>
    </div>
  );
};

const Block = ({ block, onLineHover, onLineClick }: { block: BookBlock } & Omit<Props, 'doc'>): ReactElement | null => {
  switch (block.kind) {
    case 'prose':
      return <p className="mb-3">{block.text}</p>;

    case 'callout':
      return (
        <div className="lumora-book-callout">
          <div className="lumora-book-label !mt-0">{block.label}</div>
          <ul className="space-y-1">
            {block.items.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        </div>
      );

    case 'list':
      return (
        <ul className="list-disc pl-5 space-y-1 mb-3">
          {block.items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      );

    case 'code':
      return <CodeBlock lang={block.lang} code={block.code} />;

    case 'kv':
      return (
        <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3">
          {block.pairs.map(([k, v]) => (
            <span key={k} className="flex items-baseline gap-2">
              <span className="lumora-book-label !my-0">{k}</span>
              <span className="font-mono text-[13px] text-[var(--text-primary)]">{v}</span>
            </span>
          ))}
        </div>
      );

    case 'trace':
      return (
        <div className="lumora-book-breakout my-3 overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-1.5 pr-3 font-mono text-[var(--accent-text)] align-top">{r.step}</td>
                  <td className="py-1.5 pr-3 align-top">{r.action}</td>
                  <td className="py-1.5 font-mono text-[var(--text-muted)] align-top">{r.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'walk':
      return (
        <div className="my-3">
          {block.rows.map((r, i) => (
            <div
              key={i}
              className="py-2 border-b border-[var(--border)] last:border-0"
              style={r.line != null ? { cursor: 'pointer' } : undefined}
              onMouseEnter={() => r.line != null && onLineHover?.(r.line)}
              onMouseLeave={() => onLineHover?.(undefined)}
              onClick={() => r.line != null && onLineClick?.(r.line)}
            >
              {(r.line != null || r.code) && (
                <div className="flex items-center gap-2 mb-1">
                  {r.line != null && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent-text)] shrink-0">
                      L{r.line}
                    </span>
                  )}
                  {r.code && <code className="font-mono text-[12px] text-[var(--text-muted)] truncate">{r.code}</code>}
                </div>
              )}
              <span className="text-[13px] leading-relaxed">{r.explanation}</span>
            </div>
          ))}
        </div>
      );

    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
};

export const AnswerBook = ({ doc, onLineHover, onLineClick }: Props) => (
  <div className="lumora-book">
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
