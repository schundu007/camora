import { useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import type { ParsedBlock } from '@/types';
import { MermaidDiagram } from './MermaidDiagram';

interface AnswerBlocksProps {
  blocks: ParsedBlock[];
  isDesign: boolean;
  isCoding?: boolean;
}

export function AnswerBlocks({ blocks, isDesign, isCoding }: AnswerBlocksProps) {
  if (isDesign) {
    return <SystemDesignView blocks={blocks} />;
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
        <div className="relative rounded-xl overflow-hidden animate-fade-up" style={{...style, boxShadow: '0 2px 12px rgba(5,150,105,0.08)'}}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <div className="bg-white p-5">
            <p className="text-base text-gray-900 leading-relaxed font-medium">{cleanText(block.content)}</p>
          </div>
        </div>
      );

    case 'ANSWER':
      const lines = block.content
        .split('\n')
        .map(l => cleanText(l).replace(/^[•\-*]\s*/, ''))
        .filter(Boolean);
      return (
        <div className="rounded-xl border border-indigo-100 bg-white overflow-hidden shadow-sm animate-fade-up" style={style}>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50/50 border-b border-indigo-100">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h4 className="text-[11px] font-mono font-bold text-indigo-700 uppercase tracking-wider">Key Points</h4>
            <span className="ml-auto text-[10px] font-mono text-indigo-400 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">{lines.length}</span>
          </div>
          <div className="p-4 space-y-2.5">
            {lines.map((line, i) => {
              const colonIdx = line.indexOf(':');
              const hasLabel = colonIdx > 0 && colonIdx < 40;
              const label = hasLabel ? line.slice(0, colonIdx).trim() : null;
              const text = hasLabel ? line.slice(colonIdx + 1).trim() : line;
              return (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {label && <span className="font-semibold text-gray-900">{label}: </span>}
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
        <div className="rounded-xl border border-cyan-100 bg-white overflow-hidden shadow-sm animate-fade-up" style={style}>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-cyan-50/50 border-b border-cyan-100">
            <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" /></svg>
            <h4 className="text-[11px] font-mono font-bold text-cyan-700 uppercase tracking-wider">Flow</h4>
          </div>
          <MermaidDiagram content={block.content} />
        </div>
      );

    case 'CODE':
      const lang = block.lang || 'bash';
      return (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm animate-fade-up" style={style}>
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-red-300" /><div className="w-2 h-2 rounded-full bg-amber-300" /><div className="w-2 h-2 rounded-full bg-emerald-300" /></div>
              <span className="font-mono text-[10px] font-bold text-violet-600 uppercase tracking-wider">{lang}</span>
            </div>
            <button className="text-[10px] font-mono text-gray-400 hover:text-gray-700 px-2 py-0.5 border border-gray-200 rounded hover:border-gray-400 transition-colors"
              onClick={() => navigator.clipboard.writeText(block.content)}>Copy</button>
          </div>
          <pre className="p-4 overflow-x-auto bg-gray-50"><code ref={codeRef} className={`language-${lang} text-xs leading-relaxed`}>{block.content}</code></pre>
        </div>
      );

    case 'FOLLOWUP':
      const pairs = parseFollowups(block.content);
      return (
        <div className="rounded-xl border border-amber-100 bg-white overflow-hidden shadow-sm animate-fade-up" style={style}>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50/50 border-b border-amber-100">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h4 className="text-[11px] font-mono font-bold text-amber-700 uppercase tracking-wider">Follow-up Q&A</h4>
            <span className="ml-auto text-[10px] font-mono text-amber-400 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">{pairs.length}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {pairs.map((pair, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-start gap-2 mb-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold shrink-0">Q{i+1}</span>
                  <span className="text-sm font-semibold text-gray-900 leading-relaxed">{pair.question}</span>
                </div>
                <div className="ml-8 text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">{pair.answer}</div>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm animate-fade-up" style={style}>
          <p className="text-sm text-gray-700 leading-relaxed">{cleanText(block.content)}</p>
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
        <GridCard title="PROBLEM" titleColor="text-indigo-light">
          {byType.PROBLEM ? (
            <p className="text-[13px] text-text-muted leading-relaxed">
              {cleanText(byType.PROBLEM.content)}
            </p>
          ) : <Shimmer />}
        </GridCard>
        <GridCard title="APPROACH" titleColor="text-violet-light">
          {byType.APPROACH ? (
            <p className="text-[13px] text-text-muted leading-relaxed">
              {cleanText(byType.APPROACH.content)}
            </p>
          ) : <Shimmer />}
        </GridCard>
      </div>

      {/* Code Block - Full Width */}
      <div className="rounded-md border border-emerald/20 bg-[#0d1117] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-rose/40" />
              <div className="w-2 h-2 rounded-full bg-amber/40" />
              <div className="w-2 h-2 rounded-full bg-emerald/40" />
            </div>
            <span className="font-mono text-xs text-emerald-light tracking-wider uppercase font-bold">
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
        <GridCard title="COMPLEXITY" titleColor="text-cyan-light" className="border-cyan/15 bg-cyan/[0.02]">
          {byType.COMPLEXITY ? (
            <ComplexityList content={byType.COMPLEXITY.content} />
          ) : <Shimmer />}
        </GridCard>
        <GridCard title="WALKTHROUGH" titleColor="text-violet-light">
          {byType.WALKTHROUGH ? (
            <WalkthroughList content={byType.WALKTHROUGH.content} />
          ) : <Shimmer />}
        </GridCard>
      </div>

      {/* Edge Cases & Test Cases Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <GridCard title="EDGE CASES" titleColor="text-amber-light" className="border-amber/15 bg-amber/[0.02]">
          {byType.EDGECASES ? (
            <EdgeCasesList content={byType.EDGECASES.content} />
          ) : <Shimmer />}
        </GridCard>
        <GridCard title="TEST CASES" titleColor="text-emerald-light" className="border-emerald/15 bg-emerald/[0.02]">
          {byType.TESTCASES ? (
            <TestCasesList content={byType.TESTCASES.content} />
          ) : <Shimmer />}
        </GridCard>
      </div>

      {/* Follow-up */}
      {byType.FOLLOWUP && (
        <GridCard title="FOLLOW-UP Q&A" titleColor="text-rose-light">
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
            <div key={i} className="flex items-center gap-3 p-2 rounded bg-white/[0.02]">
              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${isTime ? 'bg-cyan/10 text-cyan-light' : isSpace ? 'bg-violet/10 text-violet-light' : 'bg-white/5 text-text-dim'}`}>
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
              <span className="font-mono text-xs font-semibold text-violet-light bg-violet/10 px-2 py-0.5 rounded shrink-0">
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
            <div key={i} className="flex flex-col gap-1 p-2 rounded bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-light bg-emerald/10 px-2 py-0.5 rounded">IN</span>
                <code className="font-mono text-[12px] text-text-muted">{arrowMatch[1]}</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-light bg-cyan/10 px-2 py-0.5 rounded">OUT</span>
                <code className="font-mono text-[12px] text-cyan-light">{arrowMatch[2]}</code>
              </div>
            </div>
          );
        }
        return <div key={i} className="text-[13px] text-text-muted font-mono">{line}</div>;
      })}
    </div>
  );
}

function SystemDesignView({ blocks }: { blocks: ParsedBlock[] }) {
  const byType: Record<string, ParsedBlock> = {};
  blocks.forEach(b => { byType[b.type] = b; });

  return (
    <div className="flex flex-col gap-2">
      {/* Approach Headline */}
      {byType.HEADLINE && (
        <div className="flex items-center gap-4 px-4 py-3 border border-primary/20 bg-primary/[0.03] animate-fade-up shrink-0">
          <span className="font-mono text-[10px] font-bold text-primary border border-primary/30 px-2 py-1 tracking-widest shrink-0">
            APPROACH
          </span>
          <span className="font-display text-[14px] font-semibold text-text leading-snug">
            {cleanText(byType.HEADLINE.content)}
          </span>
        </div>
      )}

      {/* Row 1: FUNCTIONAL | NON-FUNCTIONAL | SCALE MATH */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <GridCard title="FUNCTIONAL" titleColor="text-indigo-light">
          {byType.REQUIREMENTS ? (
            <RequirementsList content={byType.REQUIREMENTS.content} type="functional" />
          ) : <EmptyBlock />}
        </GridCard>
        <GridCard title="NON-FUNCTIONAL" titleColor="text-violet-light">
          {byType.REQUIREMENTS ? (
            <RequirementsList content={byType.REQUIREMENTS.content} type="nonfunctional" />
          ) : <EmptyBlock />}
        </GridCard>
        <GridCard title="SCALE MATH" titleColor="text-emerald-light" className="sm:col-span-2 lg:col-span-1">
          {byType.SCALEMATH ? (
            <ScaleMathList content={byType.SCALEMATH.content} />
          ) : <EmptyBlock />}
        </GridCard>
      </div>

      {/* Row 2: TRADE-OFFS | EDGE CASES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <GridCard title="TRADE-OFFS" titleColor="text-rose-light">
          {byType.TRADEOFFS ? (
            <TradeoffsList content={byType.TRADEOFFS.content} />
          ) : <EmptyBlock />}
        </GridCard>
        <GridCard title="EDGE CASES" titleColor="text-amber-light">
          {byType.EDGECASES ? (
            <EdgeCasesList content={byType.EDGECASES.content} />
          ) : <EmptyBlock />}
        </GridCard>
      </div>

      {/* Row 3: ARCHITECTURE — full width */}
      <GridCard title="ARCHITECTURE" titleColor="text-cyan-light" className="border-cyan/15 bg-cyan/[0.02]">
        {byType.DIAGRAM && byType.DIAGRAM.content.trim() && !/^skip/i.test(byType.DIAGRAM.content.trim()) ? (
          <MermaidDiagram content={byType.DIAGRAM.content} />
        ) : <EmptyBlock />}
      </GridCard>

      {/* Row 4: LAYER DESIGN (2/3) | FOLLOW-UP Q&A (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
        <GridCard title="LAYER DESIGN" titleColor="text-violet-light" className="lg:col-span-3">
          {byType.DEEPDESIGN ? (
            <DeepDesignList content={byType.DEEPDESIGN.content} />
          ) : <EmptyBlock />}
        </GridCard>
        <GridCard title="FOLLOW-UP Q&A" titleColor="text-amber-light" className="lg:col-span-2 border-amber/15 bg-amber/[0.02]">
          {byType.FOLLOWUP ? (
            <FollowupList content={byType.FOLLOWUP.content} />
          ) : <EmptyBlock />}
        </GridCard>
      </div>
    </div>
  );
}

function SDCard({
  title,
  titleColor,
  children,
  className = '',
}: {
  title: string;
  titleColor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-border bg-surface p-2 ${className}`}>
      <div className={`font-display text-[10px] font-bold tracking-[0.1em] uppercase mb-1 pb-1 border-b border-border ${titleColor}`}>
        {title}
      </div>
      {children}
    </div>
  );
}

function FitCard({
  title,
  titleColor,
  children,
  className = '',
}: {
  title: string;
  titleColor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-border bg-surface p-3 w-fit shrink-0 ${className}`}>
      <div className={`font-display text-xs font-bold tracking-[0.1em] uppercase mb-2 pb-1 border-b border-border ${titleColor}`}>
        {title}
      </div>
      {children}
    </div>
  );
}

function GridCard({
  title,
  titleColor,
  children,
  className = '',
}: {
  title: string;
  titleColor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-border bg-bg2/50 overflow-hidden min-w-0 ${className}`}>
      <div className={`font-mono text-[10px] font-bold tracking-widest uppercase px-4 pt-4 pb-2 mb-0 border-b border-border ${titleColor}`}>
        {title}
      </div>
      <div className="p-4 overflow-y-auto overflow-x-auto max-h-[420px]">
        {children}
      </div>
    </div>
  );
}

function EmptyBlock() {
  return (
    <div className="flex items-center gap-2 py-3 text-gray-500">
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
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-[13px] text-text-muted leading-snug">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${type === 'functional' ? 'bg-indigo' : 'bg-violet'}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function ScaleMathList({ content }: { content: string }) {
  const lines = content.split('\n').map(l => cleanText(l).replace(/^[-*]\s*/, '')).filter(Boolean);
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          return (
            <div key={i} className="flex items-baseline px-1.5 py-1 rounded bg-white/[0.02]">
              <span className="font-mono text-[13px] text-text-dim shrink-0">{line.slice(0, colonIdx)}</span>
              <span className="font-mono text-[13px] font-semibold text-emerald-light text-right flex-1 ml-2">{line.slice(colonIdx + 1).trim()}</span>
            </div>
          );
        }
        return <div key={i} className="font-mono text-[13px] text-text-subtle px-1.5">{line}</div>;
      })}
    </div>
  );
}

function DeepDesignList({ content }: { content: string }) {
  const lines = content.split('\n').map(l => cleanText(l)).filter(Boolean);

  if (lines.length === 0) return <div className="text-[13px] text-text-muted italic">No layer design data</div>;

  let itemNum = 0;
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // Try numbered format: "1. Something" or "1) Something"
        const match = line.match(/^(\d+)[.)]\s*(.*)/);
        if (match) {
          itemNum = parseInt(match[1]);
          return (
            <div key={i} className="flex items-start gap-2 py-0.5">
              <span className="font-mono text-xs font-bold text-violet-light w-4 text-right shrink-0">{match[1]}</span>
              <span className="text-[13px] text-text-muted leading-snug">{match[2]}</span>
            </div>
          );
        }
        // Sub-bullet under a numbered item
        const subLine = line.replace(/^[-*]\s*/, '');
        if (subLine && itemNum > 0) {
          return (
            <div key={i} className="flex items-start gap-2 py-0.5 pl-6">
              <span className="w-1.5 h-1.5 rounded-full bg-violet/40 shrink-0 mt-1.5" />
              <span className="text-[13px] text-text-muted leading-snug">{subLine}</span>
            </div>
          );
        }
        // Fallback: treat as a layer heading or plain line
        itemNum++;
        return (
          <div key={i} className="flex items-start gap-2 py-0.5">
            <span className="font-mono text-xs font-bold text-violet-light w-4 text-right shrink-0">{itemNum}</span>
            <span className="text-[13px] text-text-muted leading-snug">{line}</span>
          </div>
        );
      })}
    </div>
  );
}

function EdgeCasesList({ content }: { content: string }) {
  const lines = content.split('\n').map(l => cleanText(l).replace(/^[-*]\s*/, '')).filter(Boolean);
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0 && colonIdx < 40) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="font-mono text-xs font-semibold text-amber-light bg-amber/10 px-2 py-0.5 rounded shrink-0">
                {line.slice(0, colonIdx)}
              </span>
              <span className="text-[13px] text-text-muted leading-snug">{line.slice(colonIdx + 1).trim()}</span>
            </div>
          );
        }
        return <div key={i} className="text-[13px] text-text-muted leading-snug">{line}</div>;
      })}
    </div>
  );
}

function TradeoffsList({ content }: { content: string }) {
  const lines = content.split('\n').map(l => cleanText(l).replace(/^[-*]\s*/, '')).filter(Boolean);

  if (lines.length === 0) return <div className="text-[13px] text-text-muted italic">No trade-offs data</div>;

  return (
    <div className="space-y-1.5">
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
          <div key={i} className="py-1 border-b border-white/[0.03] last:border-b-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-mono text-[13px] font-semibold text-cyan-light">{pick}</span>
              {alt && (
                <>
                  <span className="font-mono text-xs text-text-dim">vs</span>
                  <span className="font-mono text-[13px] text-text-subtle">{alt}</span>
                </>
              )}
            </div>
            {reason && <div className="text-[13px] text-text-muted mt-1 leading-snug">{reason}</div>}
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
    <div className="space-y-3">
      {pairs.map((pair, i) => (
        <div key={i} className="py-2 border-b border-border last:border-b-0">
          <div className="flex items-start gap-3 text-[13px]">
            <span className="font-mono font-bold text-primary border border-primary/30 px-2 py-0.5 shrink-0">Q{i + 1}</span>
            <span className="text-text-muted leading-snug">{pair.question}</span>
          </div>
          <div className="flex items-start gap-3 text-[13px] mt-2 pl-10">
            <span className="text-text-subtle leading-snug">{pair.answer}</span>
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
function cleanText(s: string): string {
  return (s || '')
    .replace(/^#{1,4}\s+.*$/gm, '')
    .replace(/^\s*[-*]{3,}\s*$/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();
}

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
