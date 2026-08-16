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
      // InlineText so `identifiers` in a bullet render as code — the Solution
      // card is a list now, and its points name real variables and functions.
      return (
        <ul className={`list-disc pl-4 space-y-0.5 mb-2 ${block.items.length > 6 ? 'sm:columns-2 sm:gap-x-8 [&>li]:break-inside-avoid' : ''}`}>
          {block.items.map((it, i) => <li key={i}><InlineText text={it} /></li>)}
        </ul>
      );

    case 'code':
      return <CodeBlock lang={block.lang} code={block.code} />;

    case 'kv':
      // Row layout: one pair per row, key in a fixed left column, value taking
      // the rest. Follow-up Q&A uses this — its values are spoken answers, and
      // the inline layout below would pack two of them onto a shared row at
      // full width and leave the question labels floating mid-paragraph.
      if (block.layout === 'rows') {
        return (
          <div className="mb-2 flex flex-col gap-2">
            {block.pairs.map(([k, v]) => (
              <div key={k} className="flex gap-3 items-start">
                <span className="lumora-book-label !my-0 shrink-0 basis-[9.5rem] max-w-[9.5rem]">{k}</span>
                <span className="flex-1 min-w-0 text-[12.5px] leading-[1.5] text-[var(--text-primary)]">
                  <InlineText text={v} />
                </span>
              </div>
            ))}
          </div>
        );
      }
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

// Only code genuinely needs the full measure — a wrapped or scrolling program
// is unreadable. Everything else survives a column: the dry-run trace runs
// ~460px of content (it was only ever centred in dead space at full width),
// and walkthrough rows are short enough that halving them costs nothing while
// halving the scroll. Those two are the longest sections in a typical answer,
// so exempting them would have given up most of the saving.
const WIDE_BLOCKS = new Set<BookBlock['kind']>(['code']);

// Sections that are wide by content rather than by block kind. Follow-up Q&A is
// a kv block like Complexity, but its "values" are 2-3 sentence spoken answers,
// not an O(...) token — in a half-width column each answer becomes a tall
// narrow ribbon, and because it is also the LAST section, the cell beside it
// sits empty. Both problems go away by spanning it.
const WIDE_SECTION_IDS = new Set(['followup']);

const isWideSection = (id: string, blocks: BookBlock[]) =>
  WIDE_SECTION_IDS.has(id) || blocks.some(b => WIDE_BLOCKS.has(b.kind));

// Complexity and Walkthrough are read as one thing: the bound, then the
// line-by-line that earns it. Grid auto-placement was free to drop them into
// two different columns, which puts the claim and its justification side by
// side instead of in sequence. They now share ONE grid cell and stack inside
// it — a single column, two rows, in this order.
const STACKED_SECTION_IDS = ['complexity', 'walkthrough'];

// A cell left alone on its row reads as a mistake: half the width filled, the
// rest dead space beside it. The grid produces those on its own — a full-width
// item (Code, Follow-up Q&A) cannot share a row, so it starts a new one and
// strands whatever preceded it. Edge cases is the usual victim, sitting in the
// left column with Follow-up Q&A pushed below, but the hole belongs to the
// POSITION, not the section: fix it by id and the next section to land there
// inherits the bug.
//
// So: walk the cells in placement order, tracking whether the current row has
// one occupant, and widen any cell that turns out to be its row's only one.
// Widening an orphan cannot re-rag the rows — it was already alone on that row.
export const withOrphanSpans = (spans: boolean[]): boolean[] => {
  const out = [...spans];
  let pending = -1; // index of a lone cell on the current row, or -1
  for (let i = 0; i < out.length; i++) {
    if (out[i]) {
      // Full-width: it takes its own row, so anything pending is stranded.
      if (pending >= 0) out[pending] = true;
      pending = -1;
    } else if (pending < 0) {
      pending = i;
    } else {
      pending = -1; // row filled
    }
  }
  if (pending >= 0) out[pending] = true; // trailing odd cell
  return out;
};

export const AnswerBook = ({ doc, onLineHover, onLineClick }: Props) => {
  const renderSection = (section: BookDoc['sections'][number], className?: string) => (
    <section key={section.id} className={className}>
      <h2 className="lumora-book-section">{section.heading}</h2>
      {section.blocks.map((block, i) => (
        <Block key={i} block={block} onLineHover={onLineHover} onLineClick={onLineClick} />
      ))}
    </section>
  );

  // doc.sections already carries these in Complexity → Walkthrough order, so
  // filtering preserves it. The pair renders at the position of whichever comes
  // first, and a doc with only one of the two still works — the wrapper simply
  // holds a single section.
  const stacked = doc.sections.filter(s => STACKED_SECTION_IDS.includes(s.id));
  const stackAnchor = doc.sections.findIndex(s => STACKED_SECTION_IDS.includes(s.id));

  // One entry per grid cell, in placement order — the stacked pair collapses to
  // a single cell. Spans are decided over this list, not over doc.sections,
  // because the grid only ever sees cells.
  const cells = doc.sections
    .map((section, i) => {
      if (!STACKED_SECTION_IDS.includes(section.id)) return { section, stack: false };
      return i === stackAnchor ? { section, stack: true } : null;
    })
    .filter(Boolean) as { section: BookDoc['sections'][number]; stack: boolean }[];

  const spans = withOrphanSpans(
    cells.map(c => !c.stack && isWideSection(c.section.id, c.section.blocks)),
  );

  return (
    <div className="lumora-book">
      {doc.title && <h1 className="lumora-book-section" style={{ marginTop: 0 }}>{doc.title}</h1>}
      {/* Two-column at width, one column when the panel is dragged narrow — a
          container query, not a media query, because this panel is resizable and
          its width has no fixed relationship to the viewport's. */}
      {cells.length > 0 && (
        <div className="lumora-book-grid">
          {cells.map(({ section, stack }, i) => {
            const span = spans[i] ? 'lumora-book-span' : undefined;
            // The stacked pair is emitted once, at the first member's position;
            // the other member renders inside that wrapper, not as its own cell.
            if (stack) {
              return (
                <div key="stack" className={`lumora-book-stack${span ? ` ${span}` : ''}`}>
                  {stacked.map(s => renderSection(s))}
                </div>
              );
            }
            return renderSection(section, span);
          })}
        </div>
      )}
    </div>
  );
};
