import { useEffect, useMemo, useRef, useState } from 'react';
import hljs from '@/lib/hljs';
import type { ParsedBlock } from '@/types';
import { GraphvizDiagram } from './GraphvizDiagram';
import SharedDiagram from '@/components/shared/diagrams/SharedDiagram';
import { AnswerBook } from '@/components/lumora/shared/book/AnswerBook';
import { docFromBlocks } from '@/lib/lumora/book-model';

/** Sniff the diagram source. DOT graphs always start with `digraph`,
 *  `graph`, or `strict` (case-insensitive), then a `{` somewhere. Mermaid
 *  starts with one of `flowchart|sequenceDiagram|classDiagram|stateDiagram|
 *  erDiagram|gantt|pie|gitGraph` OR a bare `graph TD/LR/...`. We bias
 *  toward DOT only when the body matches the unambiguous DOT shape so a
 *  LLM that still emits Mermaid `graph TD ...` keeps falling through to
 *  MermaidDiagram. */
const looksLikeDot = (content: string): boolean  => {
  const head = content.trim().slice(0, 40).toLowerCase();
  if (!head) return false;
  // Strip ``` fences if the LLM wrapped the source.
  const stripped = head.replace(/^```(?:dot|graphviz)?\s*/i, '');
  return /^(digraph|strict\s+(?:digraph|graph))\b/.test(stripped) ||
    /^graph\s+\w+\s*\{/.test(stripped);
}
import { cleanText } from '@/lib/text-utils';

interface AnswerBlocksProps {
  blocks: ParsedBlock[];
  isDesign: boolean;
  isCoding?: boolean;
  question?: string;
}

export const AnswerBlocks = ({ blocks, isDesign, isCoding, question }: AnswerBlocksProps) => {
  if (isDesign) {
    return <SystemDesignView blocks={blocks} question={question} />;
  }

  if (isCoding) {
    return <CodingView blocks={blocks} question={question} />;
  }

  return <BehavioralView blocks={blocks} />;
}

const BehavioralView = ({ blocks }: { blocks: ParsedBlock[] }) => {
  const headline = blocks.find(b => b.type === 'HEADLINE');
  const answer = blocks.find(b => b.type === 'ANSWER');
  const followup = blocks.find(b => b.type === 'FOLLOWUP');
  const others = blocks.filter(b => b.type !== 'HEADLINE' && b.type !== 'ANSWER' && b.type !== 'FOLLOWUP');

  return (
    <div className="flex flex-col gap-2">
      {headline && <Block block={headline} delay={0} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          {answer && <Block block={answer} delay={60} />}
          {others.map((b, i) => <Block key={i} block={b} delay={(i + 2) * 60} />)}
        </div>
        <div>
          {followup && <Block block={followup} delay={120} />}
        </div>
      </div>
    </div>
  );
};

const Block = ({ block, delay }: { block: ParsedBlock; delay: number }) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (block.type === 'CODE' && codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [block]);

  // Unified card chrome — same charcoal-strip + gold-leaf-seam +
  // colored-dot + uppercase-white-title pattern as the prep kit's
  // "documents sections" content cards (and the system-design /
  // coding GridCard further down this file). Each block's body
  // content stays specialized; only the chrome is unified.
  const wrap = { animationDelay: `${delay}ms` };

  switch (block.type) {
    case 'HEADLINE':
      return (
        <div className="animate-fade-up" style={wrap}>
          <GridCard title="Overview" titleColor="text-[var(--cam-gold-leaf-lt)]" collapsible={false}>
            <p
              className="font-medium"
              style={{
                fontFamily: 'var(--font-answer-heading)',
                fontSize: 'var(--fs-answer-heading)',
                lineHeight: 'var(--lh-answer)',
                color: 'var(--text-primary)',
                letterSpacing: '-0.005em',
              }}
            >
              {cleanText(block.content)}
            </p>
          </GridCard>
        </div>
      );

    case 'ANSWER': {
      return (
        <div className="animate-fade-up" style={wrap}>
          <GridCard title="Key Points" titleColor="text-[var(--accent)]" collapsible={false} className="h-full">
            <RichContent content={block.content} />
          </GridCard>
        </div>
      );
    }

    case 'DIAGRAM':
      return (
        <div className="animate-fade-up" style={wrap}>
          <GridCard title="Flow" titleColor="text-[var(--accent)]" collapsible={false}>
            {/* Render DOT content via Graphviz. Non-DOT diagram syntax is
                shown as a code block — Mermaid is not used per project rules. */}
            {looksLikeDot(block.content)
              ? <GraphvizDiagram content={block.content} />
              : (
                <pre className="p-3 overflow-x-auto rounded-md text-[12px] leading-relaxed font-mono" style={{ background: '#0F172A', color: '#94a3b8' }}>
                  {block.content}
                </pre>
              )}
          </GridCard>
        </div>
      );

    case 'CODE': {
      const lang = block.lang || 'bash';
      return (
        <div className="animate-fade-up group" style={wrap}>
          <GridCard title={lang} titleColor="text-[var(--accent)]" collapsible={false}>
            <div className="-m-4 group">
              <div className="flex items-center justify-end px-3 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <button
                  className="text-[10px] font-mono px-2 py-0.5 border rounded transition-[background-color,border-color,color,opacity] opacity-0 group-hover:opacity-100 active:scale-[0.98]"
                  style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                  onClick={() => navigator.clipboard.writeText(block.content)}
                >
                  Copy
                </button>
              </div>
              <pre className="p-4 overflow-x-auto" style={{ background: '#0F172A' }}>
                <code ref={codeRef} className={`language-${lang} text-[13px] leading-relaxed`}>
                  {block.content}
                </code>
              </pre>
            </div>
          </GridCard>
        </div>
      );
    }

    case 'FOLLOWUP': {
      const pairs = parseFollowups(block.content);
      return (
        <div className="animate-fade-up" style={wrap}>
          <GridCard title={`Follow-up Q&A (${pairs.length})`} titleColor="text-[var(--warning-text)]" collapsible={false}>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {pairs.map((pair, i) => (
                <div key={i} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-2 mb-2">
                    <span
                      className="flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold shrink-0 font-mono"
                      style={{ background: 'var(--accent-subtle)', color: 'var(--warning-text)' }}
                    >
                      Q{i + 1}
                    </span>
                    <span
                      className="font-semibold"
                      style={{
                        fontFamily: 'var(--font-answer)',
                        fontSize: 'var(--fs-answer-body)',
                        lineHeight: 'var(--lh-answer)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {pair.question}
                    </span>
                  </div>
                  <div
                    className="ml-7 rounded-lg p-3"
                    style={{
                      background: 'var(--bg-app)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      fontFamily: 'var(--font-answer)',
                      fontSize: 'var(--fs-answer-body)',
                      lineHeight: 'var(--lh-answer)',
                    }}
                  >
                    {pair.answer}
                  </div>
                </div>
              ))}
            </div>
          </GridCard>
        </div>
      );
    }

    default:
      return (
        <div className="animate-fade-up" style={wrap}>
          <GridCard title="Answer" titleColor="text-[var(--text-secondary)]" collapsible={false}>
            <p
              style={{
                fontFamily: 'var(--font-answer)',
                fontSize: 'var(--fs-answer-body)',
                lineHeight: 'var(--lh-answer)',
                color: 'var(--text-secondary)',
              }}
            >
              {cleanText(block.content)}
            </p>
          </GridCard>
        </div>
      );
  }
}

const CodingView = ({ blocks, question }: { blocks: ParsedBlock[]; question?: string }) => {
  const withQuestion = useMemo(() => {
    const hasProblem = blocks.some(b => b.type === 'PROBLEM');
    return hasProblem || !question
      ? blocks
      : [{ type: 'PROBLEM', content: question }, ...blocks];
  }, [blocks, question]);

  return <AnswerBook doc={docFromBlocks(withQuestion)} />;
};

const SystemDesignView = ({ blocks, question }: { blocks: ParsedBlock[]; question?: string }) => {
  const headline = blocks.find(b => b.type === 'HEADLINE');
  const headlineText = headline ? cleanText(headline.content) : '';
  const diagramQuestion = question || headlineText;
  return (
    <div className="flex flex-col gap-3">
      {headlineText && (
        <h2 className="lumora-book-section" style={{ marginTop: 0 }}>{headlineText}</h2>
      )}
      {diagramQuestion && <ArchitectureCard question={diagramQuestion} />}
      <AnswerBook doc={docFromBlocks(blocks)} />
    </div>
  );
};

const GridCard = ({
  title,
  titleColor,
  children,
  className = '',
  collapsible = true,
  defaultCollapsed = false,
  compact = false,
}: {
  title: string;
  titleColor: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  compact?: boolean;
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const hasFullHeight = className.includes('h-full');
  return (
    <div
      className={`relative border border-border bg-bg2/50 overflow-hidden min-w-0 flex flex-col rounded-lg ${className}`}
      style={{
        boxShadow: '0 4px 14px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <style>{`
        @keyframes gridcard-shimmer {
          0%   { background-position: -200% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
      <button
        onClick={() => collapsible && setCollapsed(!collapsed)}
        className={`relative flex items-center justify-between ${compact ? 'px-3 py-2' : 'px-4 py-2.5'} shrink-0 w-full text-left ${collapsible ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}`}
        style={{
          // Richer header — inner cyan glow at top-right + the existing
          // navy strip beneath. Reads as a lit chrome bar instead of flat.
          background:
            'radial-gradient(ellipse 60% 100% at 100% 0%, rgba(38,97,156,0.22), transparent 60%),' +
            'var(--cam-hero-strip)',
          borderBottom: '1px solid var(--cam-gold-leaf)',
        }}
      >
        {/* Animated gold shimmer line riding the gold border-bottom — a
            slow 4s sweep that signals "this is an active surface" without
            being noisy. Pure CSS, no JS, GPU-only. */}
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 -bottom-[2px] h-[2px] pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'gridcard-shimmer 4s linear infinite',
            mixBlendMode: 'overlay',
          }}
        />
        <span className="flex items-center gap-2">
          {/* Per-section accent dot — color tag with a subtle outer halo */}
          <span
            className={`relative inline-block w-1.5 h-1.5 rounded-full ${titleColor.startsWith('text-') ? `bg-current ${titleColor}` : ''}`}
            style={{ filter: 'drop-shadow(0 0 4px currentColor)' }}
          />
          <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-[var(--cam-strip-heading)]">
            {title}
          </span>
        </span>
        {collapsible && (
          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} style={{ color: 'var(--cam-strip-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      {!collapsed && (
        <div className={`${compact ? 'p-3' : 'p-4'} overflow-y-auto overflow-x-auto flex-1 ${hasFullHeight ? '' : compact ? 'max-h-[280px]' : 'max-h-[420px]'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

const ArchitectureCard = ({ question }: { question: string }) => {
  return (
    <div className="border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden min-w-0 flex flex-col h-full rounded-lg" style={{ minHeight: '600px' }}>
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{
          background: 'var(--cam-hero-strip)',
          borderBottom: '1px solid var(--cam-gold-leaf)',
        }}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--cam-gold-leaf-lt)]" />
        <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-[var(--cam-strip-heading)]">
          Architecture
        </span>
      </div>
      <div className="p-2 overflow-y-auto overflow-x-auto flex-1">
        {question ? (
          <SharedDiagram question={question} className="w-full h-full min-h-[560px]" />
        ) : <EmptyBlock />}
      </div>
    </div>
  );
}

const EmptyBlock = () => {
  return (
    <div className="flex items-center gap-2 py-3 text-[var(--text-muted)]">
      <svg className="w-4 h-4 shrink-0 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-mono text-[11px]">Not included in this response</span>
    </div>
  );
}

// ─── Rich markdown content renderer ─────────────────────────────────────────
// Handles the LLM's markdown output inside ANSWER blocks: ## section headers,
// | pipe tables |, - bullet points, and plain text — rendering each properly
// instead of as raw characters.

type RichSeg =
  | { kind: 'heading'; text: string; level: number }
  | { kind: 'subheading'; text: string }
  | { kind: 'table'; rows: string[][] }
  | { kind: 'bullet'; text: string; label?: string }
  | { kind: 'text'; text: string };

const parseRichContent = (raw: string): RichSeg[] => {
  const lines = (raw || '').split('\n');
  const out: RichSeg[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    i++;
    if (!trimmed) continue;

    // ## heading (capture level so ## vs #### render differently)
    const hm = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (hm) {
      const text = hm[2].replace(/\*\*/g, '').replace(/\*/g, '').trim();
      if (text) out.push({ kind: 'heading', text, level: hm[1].length });
      continue;
    }

    // --- divider: collapse silently (headings already separate sections)
    if (/^\s*[-*]{3,}\s*$/.test(trimmed)) continue;

    // | table row |
    if (trimmed.startsWith('|')) {
      i--; // re-read as table block
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i].trim();
        i++;
        if (/^\|[\s\-:|]+\|$/.test(row)) continue; // separator row
        const cells = row.split('|').slice(1, -1).map(c => c.trim());
        if (cells.some(c => c)) tableRows.push(cells);
      }
      if (tableRows.length > 0) out.push({ kind: 'table', rows: tableRows });
      continue;
    }

    // - bullet / * bullet / • bullet
    const bm = trimmed.match(/^[•\-*]\s+(.+)/);
    if (bm) {
      const t = bm[1].replace(/\*\*/g, '').replace(/\*/g, '').trim();
      if (t) {
        const ci = t.indexOf(':');
        const hasL = ci > 0 && ci < 60;
        out.push({ kind: 'bullet', text: hasL ? t.slice(ci + 1).trim() : t, label: hasL ? t.slice(0, ci).trim() : undefined });
      }
      continue;
    }

    // 1. numbered item
    const nm = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (nm) {
      const t = nm[1].replace(/\*\*/g, '').replace(/\*/g, '').trim();
      if (t) {
        const ci = t.indexOf(':');
        const hasL = ci > 0 && ci < 60;
        out.push({ kind: 'bullet', text: hasL ? t.slice(ci + 1).trim() : t, label: hasL ? t.slice(0, ci).trim() : undefined });
      }
      continue;
    }

    // ALL CAPS subheading (e.g. "CLASSIFICATION MODELS (DEFECT DETECTION):")
    if (/^[A-Z][A-Z\s,():-]{3,}$/.test(trimmed)) {
      out.push({ kind: 'subheading', text: trimmed.replace(/:$/, '') });
      continue;
    }

    // Regular text / labeled line
    const text = trimmed.replace(/\*\*/g, '').replace(/\*/g, '').trim();
    if (text) {
      const ci = text.indexOf(':');
      const hasL = ci > 0 && ci < 60 && !text.startsWith('http');
      if (hasL) {
        out.push({ kind: 'bullet', text: text.slice(ci + 1).trim(), label: text.slice(0, ci).trim() });
      } else {
        out.push({ kind: 'text', text });
      }
    }
  }

  return out;
};

const RichTable = ({ rows }: { rows: string[][] }) => {
  if (rows.length === 0) return null;
  const [header, ...dataRows] = rows;
  return (
    <div className="overflow-x-auto rounded-md border my-1" style={{ borderColor: 'var(--border)' }}>
      <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
        {header && header.length > 0 && (
          <thead>
            <tr style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
              {header.map((cell, ci) => (
                <th key={ci} className="font-mono text-[9px] font-bold tracking-wider uppercase px-3 py-2 text-[var(--cam-strip-heading)] whitespace-nowrap">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {dataRows.map((row, ri) => (
            <tr key={ri} className="border-t" style={{ borderColor: 'var(--border)', background: ri % 2 ? 'rgba(38,97,156,0.025)' : 'transparent' }}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5"
                  style={{
                    fontSize: '12px',
                    color: ci === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: ci === 0 ? 600 : 400,
                    fontFamily: ci === 0 ? 'var(--font-code)' : 'var(--font-answer)',
                  }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RichContent = ({ content }: { content: string }) => {
  const { segments, bulletMap } = useMemo(() => {
    const segs = parseRichContent(content);
    const bm = new Map<number, number>();
    let n = 0;
    segs.forEach((s, i) => { if (s.kind === 'bullet') bm.set(i, ++n); });
    return { segments: segs, bulletMap: bm };
  }, [content]);

  return (
    <div className="space-y-2">
      {segments.map((seg, idx) => {
        if (seg.kind === 'heading') {
          if (seg.level <= 2) {
            // ## Major section — navy-tinted bar with gold left border (slide section divider)
            return (
              <div key={idx} className="flex items-center gap-3 px-3 py-2 mt-4 mb-1.5 rounded-sm first:mt-0"
                style={{ background: 'rgba(38,97,156,0.08)', borderLeft: '3px solid var(--cam-gold-leaf)' }}>
                <span className="font-mono text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: 'var(--text-primary)', letterSpacing: '0.12em' }}>
                  {seg.text.replace(/:$/, '')}
                </span>
              </div>
            );
          }
          // #### Numbered subsection (e.g. "8. Responsible AI Baselines:")
          const numMatch = seg.text.match(/^(\d+)[.)]\s+(.+)/);
          const num = numMatch ? numMatch[1] : null;
          const title = (numMatch ? numMatch[2] : seg.text).replace(/:$/, '');
          return (
            <div key={idx} className="flex items-center gap-2 mt-3 mb-1"
              style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '8px' }}>
              {num && (
                <span className="flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold font-mono shrink-0"
                  style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                  {num}
                </span>
              )}
              <span className="text-[12px] font-semibold"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em' }}>
                {title}
              </span>
            </div>
          );
        }
        if (seg.kind === 'subheading') {
          return (
            <div key={idx} className="font-mono text-[9px] font-bold tracking-widest uppercase mt-2 mb-0.5"
              style={{ color: 'var(--text-muted)' }}>
              {seg.text}
            </div>
          );
        }
        if (seg.kind === 'table') {
          return <RichTable key={idx} rows={seg.rows} />;
        }
        if (seg.kind === 'bullet') {
          const n = bulletMap.get(idx) ?? 1;
          return (
            <div key={idx} className="flex items-start gap-3">
              <span className="flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold shrink-0 mt-0.5 font-mono"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                {n}
              </span>
              <div style={{ fontFamily: 'var(--font-answer)', fontSize: 'var(--fs-answer-body)', lineHeight: 'var(--lh-answer)', color: 'var(--text-primary)' }}>
                {seg.label && <span className="font-semibold">{seg.label}:{' '}</span>}
                {seg.text}
              </div>
            </div>
          );
        }
        return (
          <p key={idx} style={{ fontFamily: 'var(--font-answer)', fontSize: 'var(--fs-answer-body)', lineHeight: 'var(--lh-answer)', color: 'var(--text-primary)' }}>
            {(seg as { kind: string; text: string }).text}
          </p>
        );
      })}
    </div>
  );
};

// Helpers
const parseFollowups = (content: string): { question: string; answer: string }[] => {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const pairs: { question: string; answer: string }[] = [];
  let currentQ: string | null = null;
  let currentA: string[] = [];

  // Mirror StreamingFollowupList: accumulate continuation lines into the answer
  // once an A-line has started, so multi-line answers aren't truncated to their
  // first line after streaming settles / when reopened from history.
  const flush = () => {
    if (currentQ && currentA.length > 0) pairs.push({ question: currentQ, answer: currentA.join(' ') });
  };

  for (const line of lines) {
    if (/^Q\d*:/i.test(line)) {
      flush();
      currentQ = line.replace(/^Q\d*:\s*/i, '');
      currentA = [];
    } else if (/^A\d*:/i.test(line)) {
      currentA.push(line.replace(/^A\d*:\s*/i, ''));
    } else if (currentQ && currentA.length > 0) {
      currentA.push(line);
    }
  }
  flush();

  return pairs;
}
