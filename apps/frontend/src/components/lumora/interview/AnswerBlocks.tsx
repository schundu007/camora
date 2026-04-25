import { useEffect, useRef, useState } from 'react';
import hljs from 'highlight.js';
import type { ParsedBlock } from '@/types';
import { MermaidDiagram } from './MermaidDiagram';
import SharedDiagram from '@/components/shared/diagrams/SharedDiagram';
import { cleanText } from '@/lib/text-utils';

interface AnswerBlocksProps {
  blocks: ParsedBlock[];
  isDesign: boolean;
  isCoding?: boolean;
  question?: string;
}

export function AnswerBlocks({ blocks, isDesign, isCoding, question }: AnswerBlocksProps) {
  if (isDesign) {
    return <SystemDesignView blocks={blocks} question={question} />;
  }

  if (isCoding) {
    return <CodingView blocks={blocks} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => (
        <Block key={i} block={block} delay={i * 60} />
      ))}
    </div>
  );
}

function Block({ block, delay }: { block: ParsedBlock; delay: number }) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (block.type === 'CODE' && codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [block]);

  const style = { animationDelay: `${delay}ms` };

  switch (block.type) {
    case 'HEADLINE':
      return (
        <div className="relative rounded-xl overflow-hidden animate-fade-up" style={{...style, background: '#F8FAFC', border: '1px solid #E2E8F0', backdropFilter: 'blur(8px)'}}>
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, var(--cam-primary), var(--cam-primary), #9F9CEC)' }} />
          <div className="p-5">
            <p className="text-[15px] text-slate-800 leading-relaxed font-medium" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>{cleanText(block.content)}</p>
          </div>
        </div>
      );

    case 'ANSWER':
      const lines = (block.content || '')
        .split('\n')
        .map(l => cleanText(l).replace(/^[•\-*]\s*/, ''))
        .filter(Boolean);
      return (
        <div className="rounded-xl overflow-hidden animate-fade-up" style={{...style, background: '#F8FAFC', border: '1px solid #E2E8F0'}}>
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200">
            <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h4 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Key Points</h4>
            <span className="ml-auto text-[10px] font-mono text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">{lines.length}</span>
          </div>
          <div className="p-4 space-y-2.5">
            {lines.map((line, i) => {
              const colonIdx = line.indexOf(':');
              const hasLabel = colonIdx > 0 && colonIdx < 40;
              const label = hasLabel ? line.slice(0, colonIdx).trim() : null;
              const text = hasLabel ? line.slice(colonIdx + 1).trim() : line;
              return (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-[rgba(59,54,220,0.15)] text-[#9F9CEC] text-[10px] font-bold shrink-0 mt-0.5 font-mono">{i + 1}</span>
                  <div className="text-[13px] text-slate-600 leading-relaxed">
                    {label && <span className="font-semibold text-slate-800">{label}: </span>}
                    {text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

    case 'DIAGRAM':
      return (
        <div className="rounded-xl overflow-hidden animate-fade-up" style={{...style, background: '#F8FAFC', border: '1px solid #E2E8F0'}}>
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200">
            <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" /></svg>
            <h4 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Flow</h4>
          </div>
          <MermaidDiagram content={block.content} />
        </div>
      );

    case 'CODE':
      const lang = block.lang || 'bash';
      return (
        <div className="rounded-xl overflow-hidden animate-fade-up group" style={{...style, background: '#F8FAFC', border: '1px solid #E2E8F0'}}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-red-400/40" /><div className="w-2 h-2 rounded-full bg-amber-400/40" /><div className="w-2 h-2 rounded-full bg-[var(--accent)]/40" /></div>
              <span className="font-mono text-[10px] font-bold text-[#9F9CEC]/80 uppercase tracking-widest">{lang}</span>
            </div>
            <button className="text-[10px] font-mono text-slate-400 hover:text-slate-600 px-2 py-0.5 border border-slate-200 rounded hover:border-slate-300 transition-all opacity-0 group-hover:opacity-100"
              onClick={() => navigator.clipboard.writeText(block.content)}>Copy</button>
          </div>
          <pre className="p-4 overflow-x-auto" style={{ background: '#0F172A' }}><code ref={codeRef} className={`language-${lang} text-[13px] leading-relaxed`}>{block.content}</code></pre>
        </div>
      );

    case 'FOLLOWUP':
      const pairs = parseFollowups(block.content);
      return (
        <div className="rounded-xl overflow-hidden animate-fade-up" style={{...style, background: '#F8FAFC', border: '1px solid #E2E8F0'}}>
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200">
            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h4 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Follow-up Q&A</h4>
            <span className="ml-auto text-[10px] font-mono text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">{pairs.length}</span>
          </div>
          <div className="divide-y divide-slate-200">
            {pairs.map((pair, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-start gap-2 mb-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-bold shrink-0 font-mono">Q{i+1}</span>
                  <span className="text-[13px] font-semibold text-slate-800 leading-relaxed">{pair.question}</span>
                </div>
                <div className="ml-7 text-[13px] text-slate-500 leading-relaxed rounded-lg p-3" style={{ background: '#F1F5F9' }}>{pair.answer}</div>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div className="rounded-xl p-4 animate-fade-up" style={{...style, background: '#F8FAFC', border: '1px solid #E2E8F0'}}>
          <p className="text-[13px] text-slate-600 leading-relaxed">{cleanText(block.content)}</p>
        </div>
      );
  }
}

function CodingView({ blocks }: { blocks: ParsedBlock[] }) {
  const codeRef = useRef<HTMLElement>(null);
  const byType: Record<string, ParsedBlock> = {};
  blocks.forEach(b => { byType[b.type] = b; });

  useEffect(() => {
    if (byType.CODE && codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [blocks]);

  const lang = byType.CODE?.lang || 'python';

  return (
    <div className="flex flex-col gap-2">
      {/* Problem & Approach Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <GridCard title="PROBLEM" titleColor="text-[var(--accent)]">
          {byType.PROBLEM ? (
            <p className="text-[13px] text-text-muted leading-relaxed">
              {cleanText(byType.PROBLEM.content)}
            </p>
          ) : <Shimmer />}
        </GridCard>
        <GridCard title="APPROACH" titleColor="text-[var(--text-secondary)]">
          {byType.APPROACH ? (
            <p className="text-[13px] text-text-muted leading-relaxed">
              {cleanText(byType.APPROACH.content)}
            </p>
          ) : <Shimmer />}
        </GridCard>
      </div>

      {/* Code Block - Full Width */}
      <div className="rounded-md border border-[var(--accent)]/20 bg-[#0d1117] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-[var(--bg-surface)]/[0.02]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400/40" />
              <div className="w-2 h-2 rounded-full bg-amber-400/40" />
              <div className="w-2 h-2 rounded-full bg-[var(--accent)]/40" />
            </div>
            <span className="font-mono text-xs text-[var(--accent)] tracking-wider uppercase font-bold">
              {lang}
            </span>
          </div>
          {byType.CODE && (
            <button
              className="font-mono text-xs text-text-dim hover:text-text px-2 py-0.5 border border-border rounded hover:border-border2 transition-colors"
              onClick={() => navigator.clipboard.writeText(byType.CODE.content)}
            >
              Copy
            </button>
          )}
        </div>
        {byType.CODE ? (
          <pre className="p-4 overflow-x-auto">
            <code ref={codeRef} className={`language-${lang} text-[13px] leading-relaxed`}>
              {byType.CODE.content}
            </code>
          </pre>
        ) : <div className="p-4"><Shimmer /></div>}
      </div>

      {/* Complexity & Walkthrough Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <GridCard title="COMPLEXITY" titleColor="text-[var(--accent)]" className="border-[var(--accent)]/15 bg-[var(--accent)]/[0.02]">
          {byType.COMPLEXITY ? (
            <ComplexityList content={byType.COMPLEXITY.content} />
          ) : <Shimmer />}
        </GridCard>
        <GridCard title="WALKTHROUGH" titleColor="text-[var(--text-secondary)]">
          {byType.WALKTHROUGH ? (
            <WalkthroughList content={byType.WALKTHROUGH.content} />
          ) : <Shimmer />}
        </GridCard>
      </div>

      {/* Edge Cases & Test Cases Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <GridCard title="EDGE CASES" titleColor="text-[var(--warning)]" className="border-[var(--warning)]/15 bg-[var(--warning)]/[0.02]">
          {byType.EDGECASES ? (
            <EdgeCasesList content={byType.EDGECASES.content} />
          ) : <Shimmer />}
        </GridCard>
        <GridCard title="TEST CASES" titleColor="text-[var(--accent)]" className="border-[var(--accent)]/15 bg-[var(--accent)]/[0.02]">
          {byType.TESTCASES ? (
            <TestCasesList content={byType.TESTCASES.content} />
          ) : <Shimmer />}
        </GridCard>
      </div>

      {/* Follow-up */}
      {byType.FOLLOWUP && (
        <GridCard title="FOLLOW-UP Q&A" titleColor="text-[var(--danger)]">
          <FollowupList content={byType.FOLLOWUP.content} />
        </GridCard>
      )}
    </div>
  );
}

function ComplexityList({ content }: { content: string }) {
  const lines = content.split('\n').map(l => cleanText(l)).filter(Boolean);

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const label = line.slice(0, colonIdx).trim();
          const value = line.slice(colonIdx + 1).trim();
          const isTime = /time/i.test(label);
          const isSpace = /space/i.test(label);

          return (
            <div key={i} className="flex items-center gap-3 p-2 rounded bg-[var(--bg-surface)]/[0.02]">
              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${isTime ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : isSpace ? 'bg-[var(--accent)]/10 text-[var(--text-secondary)]' : 'bg-[var(--bg-surface)]/5 text-text-dim'}`}>
                {label}
              </span>
              <span className="font-mono text-[13px] text-text">{value}</span>
            </div>
          );
        }
        return <div key={i} className="text-[13px] text-text-muted">{line}</div>;
      })}
    </div>
  );
}

function WalkthroughList({ content }: { content: string }) {
  const lines = content.split('\n').map(l => cleanText(l).replace(/^[-*]\s*/, '')).filter(Boolean);

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        // Look for "Line N:" pattern
        const lineMatch = line.match(/^(Line\s*\d+)[:\s]*(.*)/i);
        if (lineMatch) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="font-mono text-xs font-semibold text-[var(--text-secondary)] bg-[var(--accent)]/10 px-2 py-0.5 rounded shrink-0">
                {lineMatch[1]}
              </span>
              <span className="text-[13px] text-text-muted leading-snug">{lineMatch[2]}</span>
            </div>
          );
        }
        return <div key={i} className="text-[13px] text-text-muted leading-snug pl-1">{line}</div>;
      })}
    </div>
  );
}

function TestCasesList({ content }: { content: string }) {
  const lines = content.split('\n').map(l => cleanText(l)).filter(Boolean);

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        // Parse "Input: X -> Output: Y" or "Input: X → Output: Y"
        const arrowMatch = line.match(/Input:\s*(.+?)\s*[-→>]+\s*Output:\s*(.+)/i);
        if (arrowMatch) {
          return (
            <div key={i} className="flex flex-col gap-1 p-2 rounded bg-[var(--bg-surface)]/[0.02] border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded">IN</span>
                <code className="font-mono text-[12px] text-text-muted">{arrowMatch[1]}</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded">OUT</span>
                <code className="font-mono text-[12px] text-[var(--accent)]">{arrowMatch[2]}</code>
              </div>
            </div>
          );
        }
        return <div key={i} className="text-[13px] text-text-muted font-mono">{line}</div>;
      })}
    </div>
  );
}

function SystemDesignView({ blocks, question }: { blocks: ParsedBlock[]; question?: string }) {
  const byType: Record<string, ParsedBlock> = {};
  blocks.forEach(b => { byType[b.type] = b; });

  return (
    <div className="flex flex-col gap-2">
      {/* Approach Headline */}
      {byType.HEADLINE && (
        <div className="flex items-center gap-4 px-4 py-2 border border-primary/20 bg-primary/[0.03] animate-fade-up shrink-0 rounded-lg">
          <span className="font-mono text-[10px] font-bold text-primary border border-primary/30 px-2 py-1 tracking-widest shrink-0">
            APPROACH
          </span>
          <span className="font-display text-[13px] font-semibold text-text leading-snug">
            {cleanText(byType.HEADLINE.content)}
          </span>
        </div>
      )}

      {/* Main layout: Architecture LEFT (sticky) + ALL cards RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* LEFT: Architecture diagram — sticky, full height */}
        <div className="lg:sticky lg:top-0 lg:self-start">
          <ArchitectureCard
            question={question || (byType.HEADLINE ? cleanText(byType.HEADLINE.content) : '')}
          />
        </div>

        {/* RIGHT: All info cards — dense stack */}
        <div className="flex flex-col gap-2">
          {/* Functional + Non-Functional */}
          <div className="grid grid-cols-2 gap-2">
            <GridCard title="FUNCTIONAL" titleColor="text-[var(--accent)]" compact>
              {byType.REQUIREMENTS ? (
                <RequirementsList content={byType.REQUIREMENTS.content} type="functional" />
              ) : <EmptyBlock />}
            </GridCard>
            <GridCard title="NON-FUNCTIONAL" titleColor="text-[var(--text-secondary)]" compact>
              {byType.REQUIREMENTS ? (
                <RequirementsList content={byType.REQUIREMENTS.content} type="nonfunctional" />
              ) : <EmptyBlock />}
            </GridCard>
          </div>
          {/* Scale Math */}
          <GridCard title="SCALE MATH" titleColor="text-[var(--accent)]" compact>
            {byType.SCALEMATH ? (
              <ScaleMathList content={byType.SCALEMATH.content} />
            ) : <EmptyBlock />}
          </GridCard>
          {/* Trade-offs + Edge Cases */}
          <div className="grid grid-cols-2 gap-2">
            <GridCard title="TRADE-OFFS" titleColor="text-[var(--danger)]" compact>
              {byType.TRADEOFFS ? (
                <TradeoffsList content={byType.TRADEOFFS.content} />
              ) : <EmptyBlock />}
            </GridCard>
            <GridCard title="EDGE CASES" titleColor="text-[var(--warning)]" compact>
              {byType.EDGECASES ? (
                <EdgeCasesList content={byType.EDGECASES.content} />
              ) : <EmptyBlock />}
            </GridCard>
          </div>
          {/* Layer Design */}
          {byType.DEEPDESIGN && (
            <GridCard title="LAYER DESIGN" titleColor="text-[var(--text-secondary)]" compact>
              <DeepDesignList content={byType.DEEPDESIGN.content} />
            </GridCard>
          )}
          {/* Follow-up Q&A */}
          {byType.FOLLOWUP && (
            <GridCard title="FOLLOW-UP Q&A" titleColor="text-[var(--warning)]" className="border-[var(--warning)]/15 bg-[var(--warning)]/[0.02]" compact>
              <FollowupList content={byType.FOLLOWUP.content} />
            </GridCard>
          )}
        </div>
      </div>
    </div>
  );
}

function GridCard({
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
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const hasFullHeight = className.includes('h-full');
  return (
    <div className={`border border-border bg-bg2/50 overflow-hidden min-w-0 flex flex-col rounded-lg ${className}`}>
      <button
        onClick={() => collapsible && setCollapsed(!collapsed)}
        className={`flex items-center justify-between ${compact ? 'px-3 py-2' : 'px-4 pt-3 pb-2'} border-b border-border shrink-0 w-full text-left ${collapsible ? 'cursor-pointer hover:bg-[var(--bg-surface)]/[0.02]' : 'cursor-default'}`}
      >
        <span className={`font-mono text-[10px] font-bold tracking-widest uppercase ${titleColor}`}>
          {title}
        </span>
        {collapsible && (
          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} style={{ color: '#94A3B8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
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

function ArchitectureCard({ question }: { question: string }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden min-w-0 flex flex-col h-full rounded-lg" style={{ minHeight: '600px' }}>
      <div className="font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-2 border-b border-border text-[var(--accent)] shrink-0">
        Architecture
      </div>
      <div className="p-2 overflow-y-auto overflow-x-auto flex-1">
        {question ? (
          <SharedDiagram question={question} className="w-full h-full min-h-[560px]" />
        ) : <EmptyBlock />}
      </div>
    </div>
  );
}

function EmptyBlock() {
  return (
    <div className="flex items-center gap-2 py-3 text-[var(--text-muted)]">
      <svg className="w-4 h-4 shrink-0 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-mono text-[11px]">Not included in this response</span>
    </div>
  );
}

function RequirementsList({ content, type }: { content: string; type: 'functional' | 'nonfunctional' }) {
  const lines = content.split('\n').map(l => cleanText(l).replace(/^[-*]\s*/, '')).filter(Boolean);
  const items: string[] = [];
  let mode: string | null = null;

  lines.forEach(l => {
    if (/^FUNCTIONAL/i.test(l)) { mode = 'f'; return; }
    if (/^NON.?FUNCTIONAL/i.test(l)) { mode = 'n'; return; }
    if (mode === 'f' && type === 'functional') items.push(l);
    if (mode === 'n' && type === 'nonfunctional') items.push(l);
  });

  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-text-muted leading-relaxed">
          {type === 'functional' ? (
            <svg className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="4" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 20 20" strokeWidth={2}>
              <rect x="5" y="5" width="10" height="10" rx="2" />
            </svg>
          )}
          {item}
        </li>
      ))}
    </ul>
  );
}

function ScaleMathList({ content }: { content: string }) {
  const lines = content.split('\n').map(l => cleanText(l).replace(/^[-*]\s*/, '')).filter(Boolean);
  const metrics: { label: string; value: string }[] = [];
  const other: string[] = [];

  lines.forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      metrics.push({ label: line.slice(0, colonIdx).trim(), value: line.slice(colonIdx + 1).trim() });
    } else {
      other.push(line);
    }
  });

  const half = Math.ceil(metrics.length / 2);
  const left = metrics.slice(0, half);
  const right = metrics.slice(half);

  const renderTable = (items: typeof metrics) => (
    <table className="w-full text-left font-mono" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid rgba(59,54,220,0.15)' }}>
          <th className="text-[9px] font-bold uppercase tracking-wider py-1.5 pr-3" style={{ color: 'var(--text-muted)' }}>Metric</th>
          <th className="text-[9px] font-bold uppercase tracking-wider py-1.5" style={{ color: 'var(--text-muted)' }}>Estimate</th>
        </tr>
      </thead>
      <tbody>
        {items.map((m, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
            <td className="text-[11px] font-bold py-1.5 pr-3 whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{m.label}</td>
            <td className="text-[11px] py-1.5" style={{ color: 'var(--text-secondary)' }}>{m.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        {renderTable(left)}
        {right.length > 0 && renderTable(right)}
      </div>
      {other.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {other.map((line, i) => (
            <div key={`o-${i}`} className="font-mono text-[10px] px-1" style={{ color: 'var(--text-muted)' }}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeepDesignList({ content }: { content: string }) {
  const lines = content.split('\n').map(l => cleanText(l)).filter(Boolean);

  if (lines.length === 0) return <div className="text-[13px] text-text-muted italic">No layer design data</div>;

  // Group lines into layers: each layer starts with a numbered line or a non-sub-bullet line
  type Layer = { num: number; title: string; bullets: string[] };
  const layers: Layer[] = [];
  let layerNum = 0;

  lines.forEach(line => {
    const match = line.match(/^(\d+)[.)]\s*(.*)/);
    if (match) {
      layerNum = parseInt(match[1]);
      layers.push({ num: layerNum, title: match[2], bullets: [] });
    } else {
      const subLine = line.replace(/^[-*]\s*/, '');
      if (layers.length > 0 && subLine) {
        layers[layers.length - 1].bullets.push(subLine);
      } else {
        layerNum++;
        layers.push({ num: layerNum, title: line, bullets: [] });
      }
    }
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
      {layers.map((layer, i) => (
        <div key={i}>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold text-[var(--text-secondary)] bg-[var(--accent)]/10 w-5 h-5 flex items-center justify-center rounded shrink-0">
              {layer.num}
            </span>
            <span className="text-sm font-bold text-text leading-snug">{layer.title}</span>
          </div>
          {layer.bullets.length > 0 && (
            <div className="space-y-0.5 pl-7">
              {layer.bullets.map((bullet, j) => (
                <div key={j} className="flex items-start gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[12px] text-text-muted leading-relaxed">{bullet}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EdgeCasesList({ content }: { content: string }) {
  const lines = content.split('\n').map(l => cleanText(l).replace(/^[-*]\s*/, '')).filter(Boolean);
  return (
    <div className="space-y-2.5">
      {lines.map((line, i) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0 && colonIdx < 40) {
          const caseName = line.slice(0, colonIdx).trim();
          const explanation = line.slice(colonIdx + 1).trim();
          return (
            <div key={i} className="space-y-0.5">
              <span className="font-mono text-xs font-bold text-[var(--warning)]">{caseName}</span>
              <div className="text-[13px] text-text-dim leading-relaxed pl-0.5">{explanation}</div>
            </div>
          );
        }
        return <div key={i} className="text-[13px] text-text-muted leading-relaxed">{line}</div>;
      })}
    </div>
  );
}

function TradeoffsList({ content }: { content: string }) {
  const lines = content.split('\n').map(l => cleanText(l).replace(/^[-*]\s*/, '')).filter(Boolean);

  if (lines.length === 0) return <div className="text-[13px] text-text-muted italic">No trade-offs data</div>;

  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        // Try pipe format: "Decision: X | vs: Y | because: Z"
        const parts = line.split('|').map(p => p.trim());
        let pick = parts[0]?.replace(/^(Decision|Choice):\s*/i, '') || '';
        let alt = parts[1]?.replace(/^(vs|Rejected|Alt):\s*/i, '') || '';
        let reason = parts[2]?.replace(/^(because|Reason|Why):\s*/i, '') || '';

        // Try "X vs Y" or "X vs. Y"
        if (!alt && / vs\.? /i.test(pick)) {
          const vsParts = pick.split(/ vs\.? /i);
          pick = vsParts[0].trim();
          alt = vsParts[1]?.trim() || '';
        }

        // Try "Chose X over Y: reason"
        if (!alt && /chose .+ over /i.test(pick)) {
          const overMatch = pick.match(/^(?:Chose\s+)(.+?)\s+over\s+(.+?)(?::\s*(.*))?$/i);
          if (overMatch) {
            pick = overMatch[1].trim();
            alt = overMatch[2].trim();
            reason = overMatch[3]?.trim() || reason;
          }
        }

        // Extract reason from colon in alt
        if (!reason && alt) {
          const colonIdx = alt.indexOf(':');
          if (colonIdx > 0) {
            reason = alt.slice(colonIdx + 1).trim();
            alt = alt.slice(0, colonIdx).trim();
          }
        }

        // Extract reason from colon in pick (if no alt found)
        if (!alt && !reason) {
          const colonIdx = pick.indexOf(':');
          if (colonIdx > 0 && colonIdx < pick.length - 1) {
            reason = pick.slice(colonIdx + 1).trim();
            pick = pick.slice(0, colonIdx).trim();
          }
        }

        if (!pick) return <div key={i} className="text-[13px] text-text-muted leading-snug">{line}</div>;

        return (
          <div key={i} className="pb-2.5 border-b border-slate-200 last:border-b-0 last:pb-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-[var(--accent)]">{pick}</span>
              {alt && (
                <>
                  <span className="font-mono text-xs text-text-dim">vs</span>
                  <span className="font-mono text-sm text-text-subtle line-through decoration-slate-300">{alt}</span>
                </>
              )}
            </div>
            {reason && <div className="text-[13px] text-text-dim mt-1.5 leading-relaxed pl-0.5">{reason}</div>}
          </div>
        );
      })}
    </div>
  );
}

function FollowupList({ content }: { content: string }) {
  const pairs = parseFollowups(content);
  if (pairs.length === 0) return <Shimmer />;

  return (
    <div className="space-y-4">
      {pairs.map((pair, i) => (
        <div key={i}>
          <div className="flex items-start gap-3 mb-2">
            <span className="font-mono text-[11px] font-bold text-white bg-[var(--accent)] px-2 py-0.5 rounded shrink-0">
              Q{i + 1}
            </span>
            <span className="text-sm font-semibold text-text leading-relaxed">{pair.question}</span>
          </div>
          <div className="ml-9 border-l-2 border-[rgba(59,54,220,0.3)] pl-4 py-1">
            <span className="text-[13px] text-text-muted leading-relaxed">{pair.answer}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Shimmer() {
  return (
    <div className="space-y-2">
      <div className="h-2 w-full rounded shimmer" />
      <div className="h-2 w-3/4 rounded shimmer" />
      <div className="h-2 w-5/6 rounded shimmer" />
    </div>
  );
}

// Helpers
function parseFollowups(content: string): { question: string; answer: string }[] {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const pairs: { question: string; answer: string }[] = [];
  let currentQ: string | null = null;

  for (const line of lines) {
    if (/^Q\d*:/i.test(line)) {
      currentQ = line.replace(/^Q\d*:\s*/i, '');
    } else if (/^A\d*:/i.test(line) && currentQ) {
      pairs.push({
        question: currentQ,
        answer: line.replace(/^A\d*:\s*/i, ''),
      });
      currentQ = null;
    }
  }

  return pairs;
}
