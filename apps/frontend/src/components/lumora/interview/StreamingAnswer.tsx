import { useMemo } from 'react';
import { MermaidDiagram } from './MermaidDiagram';

interface StreamingAnswerProps {
  chunks: string[];
  isDesign: boolean;
  isCoding?: boolean;
}

interface ParsedBlock {
  type: string;
  content: string;
  isComplete: boolean;
}

// Parse blocks from streaming content
function parseStreamingBlocks(content: string): Record<string, ParsedBlock> {
  const blocks: Record<string, ParsedBlock> = {};

  // Match complete blocks [TYPE]...[/TYPE]
  const completeRegex = /\[(\w+)\]([\s\S]*?)\[\/\1\]/g;
  let match;
  while ((match = completeRegex.exec(content)) !== null) {
    const type = match[1].toUpperCase();
    blocks[type] = {
      type,
      content: match[2].trim(),
      isComplete: true,
    };
  }

  // Match incomplete blocks [TYPE]... (no closing tag yet)
  const incompleteRegex = /\[(\w+)\](?![\s\S]*?\[\/\1\])([\s\S]*)$/;
  const incompleteMatch = content.match(incompleteRegex);
  if (incompleteMatch) {
    const type = incompleteMatch[1].toUpperCase();
    if (!blocks[type]) {
      blocks[type] = {
        type,
        content: incompleteMatch[2].trim(),
        isComplete: false,
      };
    }
  }

  return blocks;
}

export function StreamingAnswer({ chunks, isDesign, isCoding }: StreamingAnswerProps) {
  const content = chunks.join('');

  const blocks = useMemo(() => parseStreamingBlocks(content), [content]);

  if (isDesign) {
    return <StreamingDesignView blocks={blocks} />;
  }

  if (isCoding) {
    return <StreamingCodingView blocks={blocks} />;
  }

  // Show cards simultaneously with shimmers for Q&A
  return <StreamingQAView blocks={blocks} />;
}

function StreamingQAView({ blocks }: { blocks: Record<string, ParsedBlock> }) {
  return (
    <div className="flex flex-col gap-2">
      {/* Headline */}
      <div className="px-2 py-1.5 border border-primary/20 bg-primary/[0.03] rounded">
        {blocks.HEADLINE ? (
          <span className="text-base text-primary font-semibold leading-tight">
            {cleanText(blocks.HEADLINE.content)}
            {!blocks.HEADLINE.isComplete && <Cursor />}
          </span>
        ) : (
          <Shimmer width="w-3/4" />
        )}
      </div>

      {/* Answer Card */}
      <div className="rounded-md border border-indigo/15 bg-indigo/[0.02] p-3">
        <div className="font-display text-base font-bold tracking-[0.1em] uppercase mb-2 pb-1 border-b border-border text-indigo-light">
          KEY POINTS
        </div>
        {blocks.ANSWER ? (
          <StreamingAnswerList content={blocks.ANSWER.content} isComplete={blocks.ANSWER.isComplete} />
        ) : (
          <ShimmerBlock lines={4} />
        )}
      </div>

      {/* Follow-up Card */}
      <div className="rounded-md border border-amber/15 bg-amber/[0.02] p-3">
        <div className="font-display text-base font-bold tracking-[0.1em] uppercase mb-2 pb-1 border-b border-border text-amber-light">
          FOLLOW-UP Q&A
        </div>
        {blocks.FOLLOWUP ? (
          <StreamingFollowupList content={blocks.FOLLOWUP.content} isComplete={blocks.FOLLOWUP.isComplete} />
        ) : (
          <ShimmerBlock lines={3} />
        )}
      </div>
    </div>
  );
}

function StreamingAnswerList({ content, isComplete }: { content: string; isComplete: boolean }) {
  const lines = content.split('\n').map(l => cleanText(l).replace(/^[•\-*]\s*/, '')).filter(Boolean);

  if (lines.length === 0) return <ShimmerBlock lines={3} />;

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const colonIdx = line.indexOf(':');
        const hasLabel = colonIdx > 0 && colonIdx < 30;
        const label = hasLabel ? line.slice(0, colonIdx).trim() : null;
        const text = hasLabel ? line.slice(colonIdx + 1).trim() : line;

        return (
          <div key={i} className="text-base text-text-muted leading-relaxed">
            {label && <span className="font-semibold text-indigo-light mr-1">{label}:</span>}
            {text}
          </div>
        );
      })}
      {!isComplete && <Cursor />}
    </div>
  );
}

function StreamingCodingView({ blocks }: { blocks: Record<string, ParsedBlock> }) {
  const lang = blocks.CODE?.content.match(/lang=(\w+)/)?.[1] || 'python';

  return (
    <div className="flex flex-col gap-2">
      {/* Problem & Approach Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <StreamingCodingCard title="PROBLEM" titleColor="text-indigo-light" block={blocks.PROBLEM} />
        <StreamingCodingCard title="APPROACH" titleColor="text-violet-light" block={blocks.APPROACH} />
      </div>

      {/* Code Block - Full Width */}
      <div className="rounded-md border border-emerald/20 bg-gray-50 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-300 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-rose/40" />
              <div className="w-2 h-2 rounded-full bg-amber/40" />
              <div className="w-2 h-2 rounded-full bg-emerald/40" />
            </div>
            <span className="font-mono text-base text-emerald-light tracking-wider uppercase font-bold">
              {lang}
            </span>
          </div>
        </div>
        {blocks.CODE ? (
          <pre className="p-4 overflow-x-auto">
            <code className={`language-${lang} text-base leading-relaxed text-emerald-light`}>
              {blocks.CODE.content}
              {!blocks.CODE.isComplete && <Cursor />}
            </code>
          </pre>
        ) : <div className="p-4"><ShimmerBlock lines={6} /></div>}
      </div>

      {/* Complexity & Walkthrough Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-md border border-cyan/15 bg-cyan/[0.02] p-3">
          <div className="font-display text-base font-bold tracking-[0.1em] uppercase mb-2 pb-1 border-b border-border text-cyan-light">
            COMPLEXITY
          </div>
          {blocks.COMPLEXITY ? (
            <StreamingComplexityList content={blocks.COMPLEXITY.content} isComplete={blocks.COMPLEXITY.isComplete} />
          ) : <ShimmerBlock lines={2} />}
        </div>
        <StreamingCodingCard title="WALKTHROUGH" titleColor="text-violet-light" block={blocks.WALKTHROUGH} />
      </div>

      {/* Edge Cases & Test Cases Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-md border border-amber/15 bg-amber/[0.02] p-3">
          <div className="font-display text-base font-bold tracking-[0.1em] uppercase mb-2 pb-1 border-b border-border text-amber-light">
            EDGE CASES
          </div>
          {blocks.EDGECASES ? (
            <EdgeCasesList content={blocks.EDGECASES.content} isComplete={blocks.EDGECASES.isComplete} />
          ) : <ShimmerBlock lines={3} />}
        </div>
        <div className="rounded-md border border-emerald/15 bg-emerald/[0.02] p-3">
          <div className="font-display text-base font-bold tracking-[0.1em] uppercase mb-2 pb-1 border-b border-border text-emerald-light">
            TEST CASES
          </div>
          {blocks.TESTCASES ? (
            <StreamingTestCasesList content={blocks.TESTCASES.content} isComplete={blocks.TESTCASES.isComplete} />
          ) : <ShimmerBlock lines={3} />}
        </div>
      </div>

      {/* Follow-up */}
      {blocks.FOLLOWUP && (
        <div className="rounded-lg border border-border bg-bg2 p-4">
          <div className="font-display text-base font-bold tracking-[0.1em] uppercase mb-2 pb-1 border-b border-border text-rose-light">
            FOLLOW-UP Q&A
          </div>
          <StreamingFollowupList content={blocks.FOLLOWUP.content} isComplete={blocks.FOLLOWUP.isComplete} />
        </div>
      )}
    </div>
  );
}

function StreamingCodingCard({
  title,
  titleColor,
  block,
}: {
  title: string;
  titleColor: string;
  block?: ParsedBlock;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg2 p-4">
      <div className={`font-display text-base font-bold tracking-[0.1em] uppercase mb-2 pb-1 border-b border-border ${titleColor}`}>
        {title}
      </div>
      {block ? (
        <p className="text-base text-text-muted leading-relaxed">
          {cleanText(block.content)}
          {!block.isComplete && <Cursor />}
        </p>
      ) : <ShimmerBlock lines={2} />}
    </div>
  );
}

function StreamingComplexityList({ content, isComplete }: { content: string; isComplete: boolean }) {
  const lines = content.split('\n').map(l => cleanText(l)).filter(Boolean);

  if (lines.length === 0) return <ShimmerBlock lines={2} />;

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
            <div key={i} className="flex items-center gap-3 p-2 rounded bg-gray-50">
              <span className={`font-mono text-base font-bold px-2 py-0.5 rounded ${isTime ? 'bg-cyan/10 text-cyan-light' : isSpace ? 'bg-violet/10 text-violet-light' : 'bg-gray-100 text-text-dim'}`}>
                {label}
              </span>
              <span className="font-mono text-base text-text">{value}</span>
            </div>
          );
        }
        return <div key={i} className="text-base text-text-muted">{line}</div>;
      })}
      {!isComplete && <Cursor />}
    </div>
  );
}

function StreamingTestCasesList({ content, isComplete }: { content: string; isComplete: boolean }) {
  const lines = content.split('\n').map(l => cleanText(l)).filter(Boolean);

  if (lines.length === 0) return <ShimmerBlock lines={3} />;

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const arrowMatch = line.match(/Input:\s*(.+?)\s*[-→>]+\s*Output:\s*(.+)/i);
        if (arrowMatch) {
          return (
            <div key={i} className="flex flex-col gap-1 p-2 rounded bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-emerald-light bg-emerald/10 px-2 py-0.5 rounded">IN</span>
                <code className="font-mono text-base text-text-muted">{arrowMatch[1]}</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-cyan-light bg-cyan/10 px-2 py-0.5 rounded">OUT</span>
                <code className="font-mono text-base text-cyan-light">{arrowMatch[2]}</code>
              </div>
            </div>
          );
        }
        return <div key={i} className="text-base text-text-muted font-mono">{line}</div>;
      })}
      {!isComplete && <Cursor />}
    </div>
  );
}

function StreamingDesignView({ blocks }: { blocks: Record<string, ParsedBlock> }) {
  return (
    <div className="flex flex-col gap-2">
      {/* Approach Headline */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-indigo/20 bg-gradient-to-r from-indigo/7 to-violet/4 shrink-0">
        <span className="font-mono text-base font-bold text-indigo-light bg-indigo/12 px-2 py-0.5 rounded tracking-wider shrink-0">
          Approach
        </span>
        {blocks.HEADLINE ? (
          <span className="font-display text-base font-semibold text-text leading-snug">
            {cleanText(blocks.HEADLINE.content)}
            {!blocks.HEADLINE.isComplete && <Cursor />}
          </span>
        ) : (
          <Shimmer width="w-3/4" />
        )}
      </div>

      {/* Main 2-column layout: Architecture left, cards right */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
        {/* LEFT: Architecture diagram */}
        <div className="lg:col-span-2 lg:sticky lg:top-0 lg:self-start">
          <div className="border border-cyan/15 bg-cyan/[0.02] overflow-hidden min-w-0 flex flex-col h-full">
            <div className="font-mono text-[10px] font-bold tracking-widest uppercase px-4 pt-4 pb-2 border-b border-border text-cyan-light shrink-0">
              ARCHITECTURE
            </div>
            <div className="p-4 overflow-y-auto overflow-x-auto flex-1">
              {blocks.DIAGRAM && blocks.DIAGRAM.content.trim() && !/^skip/i.test(blocks.DIAGRAM.content.trim()) ? (
                blocks.DIAGRAM.isComplete ? (
                  <MermaidDiagram content={blocks.DIAGRAM.content} />
                ) : (
                  <pre className="font-mono text-sm text-cyan-light leading-snug whitespace-pre overflow-x-auto">
                    {blocks.DIAGRAM.content}
                    <Cursor />
                  </pre>
                )
              ) : (
                <ShimmerBlock lines={6} />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: All info cards stacked */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          {/* FUNCTIONAL | NON-FUNCTIONAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <StreamingGridCard title="FUNCTIONAL" titleColor="text-indigo-light" block={blocks.REQUIREMENTS} type="functional" />
            <StreamingGridCard title="NON-FUNCTIONAL" titleColor="text-violet-light" block={blocks.REQUIREMENTS} type="nonfunctional" />
          </div>

          {/* SCALE MATH */}
          <StreamingGridCard title="SCALE MATH" titleColor="text-emerald-light" block={blocks.SCALEMATH} type="scalemath" />

          {/* TRADE-OFFS | EDGE CASES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <StreamingGridCard title="TRADE-OFFS" titleColor="text-rose-light" block={blocks.TRADEOFFS} type="tradeoffs" />
            <StreamingGridCard title="EDGE CASES" titleColor="text-amber-light" block={blocks.EDGECASES} type="edgecases" />
          </div>

          {/* LAYER DESIGN */}
          <StreamingGridCard title="LAYER DESIGN" titleColor="text-violet-light" block={blocks.DEEPDESIGN} type="deepdesign" />

          {/* FOLLOW-UP Q&A */}
          <div className="border border-amber/15 bg-amber/[0.02] overflow-hidden min-w-0">
            <div className="font-mono text-[10px] font-bold tracking-widest uppercase px-4 pt-4 pb-2 border-b border-border text-amber-light shrink-0">
              FOLLOW-UP Q&A
            </div>
            <div className="p-4 overflow-y-auto max-h-[420px]">
              {blocks.FOLLOWUP ? (
                <StreamingFollowupList content={blocks.FOLLOWUP.content} isComplete={blocks.FOLLOWUP.isComplete} />
              ) : (
                <ShimmerBlock lines={4} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StreamingGridCard({
  title,
  titleColor,
  block,
  type,
  className = '',
}: {
  title: string;
  titleColor: string;
  block?: ParsedBlock;
  type: string;
  className?: string;
}) {
  let content = null;

  if (block) {
    if (type === 'functional' || type === 'nonfunctional') {
      content = <RequirementsList content={block.content} reqType={type} isComplete={block.isComplete} />;
    } else if (type === 'scalemath') {
      content = <ScaleMathList content={block.content} isComplete={block.isComplete} />;
    } else if (type === 'deepdesign') {
      content = <DeepDesignList content={block.content} isComplete={block.isComplete} />;
    } else if (type === 'edgecases') {
      content = <EdgeCasesList content={block.content} isComplete={block.isComplete} />;
    } else if (type === 'tradeoffs') {
      content = <TradeoffsList content={block.content} isComplete={block.isComplete} />;
    }
  }

  return (
    <div className={`border border-border bg-bg2 overflow-hidden min-w-0 ${className}`}>
      <div className={`font-mono text-[10px] font-bold tracking-widest uppercase px-4 pt-4 pb-2 border-b border-border ${titleColor}`}>
        {title}
      </div>
      <div className="p-4 overflow-y-auto overflow-x-auto max-h-[420px]">
        {content || <ShimmerBlock lines={4} />}
      </div>
    </div>
  );
}

function StreamingFitCard({
  title,
  titleColor,
  block,
  type,
}: {
  title: string;
  titleColor: string;
  block?: ParsedBlock;
  type: string;
}) {
  let content = null;

  if (block) {
    if (type === 'functional' || type === 'nonfunctional') {
      content = <RequirementsList content={block.content} reqType={type} isComplete={block.isComplete} />;
    } else if (type === 'scalemath') {
      content = <ScaleMathList content={block.content} isComplete={block.isComplete} />;
    } else if (type === 'deepdesign') {
      content = <DeepDesignList content={block.content} isComplete={block.isComplete} />;
    } else if (type === 'edgecases') {
      content = <EdgeCasesList content={block.content} isComplete={block.isComplete} />;
    } else if (type === 'tradeoffs') {
      content = <TradeoffsList content={block.content} isComplete={block.isComplete} />;
    }
  }

  return (
    <div className="rounded-lg border border-border bg-bg2 p-4 w-fit shrink-0">
      <div className={`font-display text-base font-bold tracking-[0.1em] uppercase mb-2 pb-1 border-b border-border ${titleColor}`}>
        {title}
      </div>
      {content || <ShimmerBlock lines={4} />}
    </div>
  );
}

function StreamingCard({
  title,
  titleColor,
  block,
  type,
}: {
  title: string;
  titleColor: string;
  block?: ParsedBlock;
  type: string;
}) {
  let content = null;

  if (block) {
    if (type === 'functional' || type === 'nonfunctional') {
      content = <RequirementsList content={block.content} reqType={type} isComplete={block.isComplete} />;
    } else if (type === 'scalemath') {
      content = <ScaleMathList content={block.content} isComplete={block.isComplete} />;
    } else if (type === 'deepdesign') {
      content = <DeepDesignList content={block.content} isComplete={block.isComplete} />;
    } else if (type === 'edgecases') {
      content = <EdgeCasesList content={block.content} isComplete={block.isComplete} />;
    } else if (type === 'tradeoffs') {
      content = <TradeoffsList content={block.content} isComplete={block.isComplete} />;
    }
  }

  return (
    <div className="rounded-lg border border-border bg-bg2 p-4">
      <div className={`font-display text-base font-bold tracking-[0.1em] uppercase mb-2 pb-1 border-b border-border ${titleColor}`}>
        {title}
      </div>
      {content || <ShimmerBlock lines={4} />}
    </div>
  );
}

function RequirementsList({ content, reqType, isComplete }: { content: string; reqType: string; isComplete: boolean }) {
  const lines = content.split('\n').map(l => cleanText(l).replace(/^[-*]\s*/, '')).filter(Boolean);
  const items: string[] = [];
  let mode: string | null = null;

  lines.forEach(l => {
    if (/^FUNCTIONAL/i.test(l)) { mode = 'f'; return; }
    if (/^NON.?FUNCTIONAL/i.test(l)) { mode = 'n'; return; }
    if (mode === 'f' && reqType === 'functional') items.push(l);
    if (mode === 'n' && reqType === 'nonfunctional') items.push(l);
  });

  if (items.length === 0) {
    return <ShimmerBlock lines={3} />;
  }

  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-base text-text-muted leading-snug">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${reqType === 'functional' ? 'bg-indigo' : 'bg-violet'}`} />
          {item}
        </li>
      ))}
      {!isComplete && <Cursor />}
    </ul>
  );
}

function ScaleMathList({ content, isComplete }: { content: string; isComplete: boolean }) {
  const lines = content.split('\n').map(l => cleanText(l).replace(/^[-*]\s*/, '')).filter(Boolean);

  if (lines.length === 0) return <ShimmerBlock lines={3} />;

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          return (
            <div key={i} className="flex items-baseline px-1.5 py-1 rounded bg-gray-50">
              <span className="font-mono text-base text-text-dim shrink-0">{line.slice(0, colonIdx)}</span>
              <span className="font-mono text-base font-semibold text-emerald-light text-right flex-1 ml-2">{line.slice(colonIdx + 1).trim()}</span>
            </div>
          );
        }
        return <div key={i} className="font-mono text-base text-text-subtle px-1.5">{line}</div>;
      })}
      {!isComplete && <Cursor />}
    </div>
  );
}

function DeepDesignList({ content, isComplete }: { content: string; isComplete: boolean }) {
  const lines = content.split('\n').map(l => cleanText(l)).filter(Boolean);

  if (lines.length === 0) return <ShimmerBlock lines={4} />;

  let itemNum = 0;
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const match = line.match(/^(\d+)[.)]\s*(.*)/);
        if (match) {
          itemNum = parseInt(match[1]);
          return (
            <div key={i} className="flex items-start gap-2 py-0.5">
              <span className="font-mono text-base font-bold text-violet-light w-4 text-right shrink-0">{match[1]}</span>
              <span className="text-base text-text-muted leading-snug">{match[2]}</span>
            </div>
          );
        }
        // Sub-bullet under a numbered item
        const subLine = line.replace(/^[-*]\s*/, '');
        if (subLine && itemNum > 0) {
          return (
            <div key={i} className="flex items-start gap-2 py-0.5 pl-5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet/40 shrink-0 mt-1.5" />
              <span className="text-base text-text-muted leading-snug">{subLine}</span>
            </div>
          );
        }
        // Fallback: assign a number
        itemNum++;
        return (
          <div key={i} className="flex items-start gap-2 py-0.5">
            <span className="font-mono text-base font-bold text-violet-light w-4 text-right shrink-0">{itemNum}</span>
            <span className="text-base text-text-muted leading-snug">{line}</span>
          </div>
        );
      })}
      {!isComplete && <Cursor />}
    </div>
  );
}

function EdgeCasesList({ content, isComplete }: { content: string; isComplete: boolean }) {
  const lines = content.split('\n').map(l => cleanText(l).replace(/^[-*]\s*/, '')).filter(Boolean);

  if (lines.length === 0) return <ShimmerBlock lines={3} />;

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0 && colonIdx < 40) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="font-mono text-base font-semibold text-amber-light bg-amber/10 px-2 py-0.5 rounded shrink-0">
                {line.slice(0, colonIdx)}
              </span>
              <span className="text-base text-text-muted leading-snug">{line.slice(colonIdx + 1).trim()}</span>
            </div>
          );
        }
        return <div key={i} className="text-base text-text-muted leading-snug">{line}</div>;
      })}
      {!isComplete && <Cursor />}
    </div>
  );
}

function TradeoffsList({ content, isComplete }: { content: string; isComplete: boolean }) {
  const lines = content.split('\n').map(l => cleanText(l).replace(/^[-*]\s*/, '')).filter(Boolean);

  if (lines.length === 0) return <ShimmerBlock lines={3} />;

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

        if (!pick) return <div key={i} className="text-base text-text-muted leading-snug">{line}</div>;

        return (
          <div key={i} className="py-1 border-b border-gray-200 last:border-b-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-mono text-base font-semibold text-cyan-light">{pick}</span>
              {alt && (
                <>
                  <span className="font-mono text-base text-text-dim">vs</span>
                  <span className="font-mono text-base text-text-subtle">{alt}</span>
                </>
              )}
            </div>
            {reason && <div className="text-base text-text-muted mt-1 leading-snug">{reason}</div>}
          </div>
        );
      })}
      {!isComplete && <Cursor />}
    </div>
  );
}

function StreamingFollowupList({ content, isComplete }: { content: string; isComplete: boolean }) {
  const lines = content.split('\n').map(l => cleanText(l)).filter(Boolean);
  const pairs: { question: string; answer: string }[] = [];
  let currentQ: string | null = null;
  let currentA: string[] = [];

  for (const line of lines) {
    if (/^Q\d*:/i.test(line)) {
      // Save previous Q&A pair if we have one
      if (currentQ && currentA.length > 0) {
        pairs.push({ question: currentQ, answer: currentA.join(' ') });
      }
      currentQ = line.replace(/^Q\d*:\s*/i, '');
      currentA = [];
    } else if (/^A\d*:/i.test(line)) {
      currentA.push(line.replace(/^A\d*:\s*/i, ''));
    } else if (currentQ && currentA.length > 0) {
      // Continuation of answer
      currentA.push(line);
    }
  }

  // Don't forget the last pair
  if (currentQ && currentA.length > 0) {
    pairs.push({ question: currentQ, answer: currentA.join(' ') });
    currentQ = null;
  }

  if (pairs.length === 0 && !currentQ) return <ShimmerBlock lines={3} />;

  return (
    <div className="space-y-2">
      {pairs.map((pair, i) => (
        <div key={i} className="py-1.5 border-b border-gray-200 last:border-b-0">
          <div className="flex items-start gap-2 text-base">
            <span className="font-mono font-bold text-amber-light bg-amber/10 px-2 py-0.5 rounded shrink-0">Q{i + 1}</span>
            <span className="text-text-muted leading-snug">{pair.question}</span>
          </div>
          <div className="flex items-start gap-2 text-base mt-1.5 pl-8">
            <span className="text-text-subtle leading-snug">{pair.answer}</span>
          </div>
        </div>
      ))}
      {currentQ && (
        <div className="py-1.5">
          <div className="flex items-start gap-2 text-base">
            <span className="font-mono font-bold text-amber-light bg-amber/10 px-2 py-0.5 rounded shrink-0">Q{pairs.length + 1}</span>
            <span className="text-text-muted leading-snug">{currentQ}<Cursor /></span>
          </div>
        </div>
      )}
      {!isComplete && !currentQ && <Cursor />}
    </div>
  );
}

function Shimmer({ width = 'w-full' }: { width?: string }) {
  return <div className={`h-3 ${width} rounded shimmer`} />;
}

function ShimmerBlock({ lines }: { lines: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-2 rounded shimmer ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

function Cursor() {
  return <span className="inline-block w-1.5 h-3 bg-indigo-light/60 ml-0.5 animate-pulse" />;
}

function cleanText(s: string): string {
  return (s || '')
    .replace(/^#{1,4}\s+.*$/gm, '')
    .replace(/^\s*[-*]{3,}\s*$/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();
}
