/* ── Answer rendering tree ─────────────────────────────────────────────────
   AnswerView is the single entry point used by AICompanionPanel to render an
   AI answer body. It picks STAR cards for behavioral answers, falls back to
   RichText for everything else, and decorates with an ArchetypeBadge +
   RebuttalsPanel when the response declares them.

   Lifted out of AICompanionPanel.tsx to keep that file under 1k LOC and to
   give the parsers (extractArchetype, parseStar, extractRebuttals) a stable
   home that other surfaces can import without dragging in panel UI.
*/
import React, { useMemo } from 'react';
import type { LumoraStory } from '@/lib/lumora-assistant';
import { renderInlineSafe } from './inline-renderer';

const TEXT_PRIMARY = '#0F172A';
const BORDER = 'rgba(0,0,0,0.15)';

/* ── Archetype parser — pulls leading "ARCHETYPE: X" line off a behavioral answer ── */
const ARCHETYPES = ['Conflict', 'Leadership', 'Failure', 'Ambiguity', 'Influence', 'Innovation', 'Collaboration', 'Growth', 'Career', 'Fit'] as const;
export type Archetype = typeof ARCHETYPES[number];

function extractArchetype(text: string): { archetype: Archetype | null; stripped: string } {
  if (!text) return { archetype: null, stripped: text };
  const m = text.match(/^\s*ARCHETYPE\s*:\s*([A-Za-z\/ -]+)\s*\n/);
  if (!m) return { archetype: null, stripped: text };
  const raw = m[1].trim();
  const found = ARCHETYPES.find(a => a.toLowerCase() === raw.toLowerCase()) || null;
  return { archetype: found, stripped: text.slice(m[0].length).trimStart() };
}

const ARCHETYPE_HINT: Record<Archetype, string> = {
  Conflict: 'Disagreement with peer / manager',
  Leadership: 'Led team, drove initiative',
  Failure: 'Own the mistake, show learning',
  Ambiguity: 'Unclear goals, incomplete info',
  Influence: 'Persuaded without authority',
  Innovation: 'Creative solve, novel approach',
  Collaboration: 'Worked across teams',
  Growth: 'Skill gap, stretch assignment',
  Career: 'Tell me about yourself',
  Fit: 'Why this company / role',
};

/* ── STAR detector — returns sections if the answer is behavioral STAR ── */
const STAR_LABELS = ['SITUATION', 'TASK', 'ACTION', 'RESULT'] as const;
type StarLabel = typeof STAR_LABELS[number];

function parseStar(text: string): { sections: { label: StarLabel; body: string }[] } | null {
  if (!text) return null;
  const lines = text.split('\n');
  const found: { label: StarLabel; startLine: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim().replace(/^\*+\s*/, '').replace(/\*+$/, '');
    const m = stripped.match(/^(SITUATION|TASK|ACTION|RESULT)\s*[:\-—]/i);
    if (m) found.push({ label: m[1].toUpperCase() as StarLabel, startLine: i });
  }
  // Require at least Situation + Action + Result (Task is often collapsed).
  const labels = new Set(found.map(f => f.label));
  if (!labels.has('SITUATION') || !labels.has('ACTION') || !labels.has('RESULT')) return null;

  const sections: { label: StarLabel; body: string }[] = [];
  for (let k = 0; k < found.length; k++) {
    const { label, startLine } = found[k];
    const endLine = k + 1 < found.length ? found[k + 1].startLine : lines.length;
    const firstLine = lines[startLine].replace(/^\s*\*?\*?\s*(SITUATION|TASK|ACTION|RESULT)\s*[:\-—]\s*/i, '');
    const body = [firstLine, ...lines.slice(startLine + 1, endLine)].join('\n').trim();
    sections.push({ label, body });
  }
  // Enforce canonical order S → T → A → R for display.
  const order: Record<StarLabel, number> = { SITUATION: 0, TASK: 1, ACTION: 2, RESULT: 3 };
  sections.sort((a, b) => order[a.label] - order[b.label]);
  return { sections };
}

/* ── StarBody — larger-type body renderer used inside STAR cards.
   STAR answers are prose with bullets/bold — no code blocks needed. The
   regular RichText runs at 11px for side-panel density, but the fullscreen
   behavioral view is read at glance-distance during a live interview, so
   this renders at 13-14px and skips the code-detection machinery. */
function StarBody({ text }: { text: string }) {
  if (!text) return null;
  const STAR_BOLD: React.CSSProperties = { color: TEXT_PRIMARY, fontWeight: 700 };
  const STAR_CODE: React.CSSProperties = { background: 'rgba(0,0,0,0.05)', color: 'var(--cam-primary-dk)', padding: '1px 5px', borderRadius: 3, fontSize: 12, fontFamily: "'JetBrains Mono',monospace" };
  const inline = (s: string) => renderInlineSafe(s, { bold: STAR_BOLD, code: STAR_CODE });
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let bulletGroup: string[] = [];
  const flushBullets = (key: string) => {
    if (bulletGroup.length === 0) return;
    out.push(
      <ul key={key} className="my-1 flex flex-col gap-1 pl-1">
        {bulletGroup.map((b, bi) => (
          <li key={bi} className="flex gap-2">
            <span className="shrink-0 mt-2 w-1 h-1 rounded-full" style={{ background: 'var(--cam-primary)' }} />
            <span style={{ fontSize: '13px', lineHeight: '1.55', color: TEXT_PRIMARY }}>{inline(b)}</span>
          </li>
        ))}
      </ul>
    );
    bulletGroup = [];
  };
  lines.forEach((raw, i) => {
    const t = raw.trim();
    if (!t) { flushBullets(`bl-${i}`); return; }
    if (t.startsWith('- ') || t.startsWith('• ') || t.startsWith('* ')) {
      bulletGroup.push(t.slice(2));
      return;
    }
    flushBullets(`bl-${i}`);
    out.push(
      <p key={`p-${i}`} style={{ fontSize: '13px', lineHeight: '1.55', color: TEXT_PRIMARY }}>{inline(t)}</p>
    );
  });
  flushBullets('bl-end');
  return <div className="flex flex-col gap-1" style={{ fontFamily: "'Inter', sans-serif" }}>{out}</div>;
}

/* ── StarAnswer — renders a behavioral STAR answer as 4 scannable cards ── */
function StarAnswer({ sections, streaming }: { sections: { label: StarLabel; body: string }[]; streaming?: boolean }) {
  const labelCopy: Record<StarLabel, { short: string; hint: string }> = {
    SITUATION: { short: 'Situation', hint: 'Set the scene' },
    TASK: { short: 'Task', hint: 'Your responsibility' },
    ACTION: { short: 'Action', hint: 'What you did' },
    RESULT: { short: 'Result', hint: 'Measurable outcome' },
  };
  return (
    <div className="flex flex-col gap-2">
      {sections.map((s) => (
        <div key={s.label} className="rounded-lg overflow-hidden"
          style={{
            background: 'rgba(38,97,156,0.04)',
            border: '1px solid rgba(38,97,156,0.18)',
            borderLeft: '3px solid var(--cam-primary)',
          }}>
          <div className="flex items-center justify-between px-3 py-1.5" style={{ background: 'rgba(38,97,156,0.06)', borderBottom: '1px solid rgba(38,97,156,0.1)' }}>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
                style={{ background: 'var(--cam-primary)', color: '#FFFFFF', fontFamily: "'Source Sans 3', sans-serif" }}>
                {s.label[0]}
              </span>
              <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--cam-primary-dk)', fontFamily: "'Source Sans 3', sans-serif" }}>
                {labelCopy[s.label].short}
              </span>
              <span className="text-[10px]" style={{ color: '#64748B' }}>· {labelCopy[s.label].hint}</span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(s.body)}
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-colors"
              style={{ color: '#64748B' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
              Copy
            </button>
          </div>
          <div className="px-3 py-2">
            <StarBody text={s.body} />
          </div>
        </div>
      ))}
      {streaming && sections.length < 4 && (
        <div className="text-[10px] px-2 py-1 flex items-center gap-1.5" style={{ color: '#64748B' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--cam-primary)' }} />
          Generating remaining STAR sections…
        </div>
      )}
    </div>
  );
}

/* ── ArchetypeBadge — question-type pill shown above behavioral answers ── */
function ArchetypeBadge({ archetype }: { archetype: Archetype }) {
  return (
    <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-lg"
      style={{ background: 'rgba(38,97,156,0.08)', border: '1px solid rgba(38,97,156,0.2)' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary-dk)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--cam-primary-dk)', fontFamily: "'Source Sans 3', sans-serif" }}>
        {archetype} Question
      </span>
      <span className="text-[10px]" style={{ color: '#64748B' }}>· {ARCHETYPE_HINT[archetype]}</span>
    </div>
  );
}

/* ── Rebuttals parser — pulls "REBUTTALS:" block off the end of behavioral answer ── */
interface Rebuttal { probe: string; handling: string; }

function extractRebuttals(text: string): { rebuttals: Rebuttal[]; stripped: string } {
  if (!text) return { rebuttals: [], stripped: text };
  const m = text.match(/\n\s*REBUTTALS\s*:\s*\n([\s\S]*?)$/i);
  if (!m) return { rebuttals: [], stripped: text };
  const body = m[1];
  const rebuttals: Rebuttal[] = [];
  body.split('\n').forEach(line => {
    const t = line.trim();
    if (!t) return;
    const lm = t.match(/^\d+[.)]\s*(.+?)\s*(?:—|-|–|:)\s*(.+)$/);
    if (lm) rebuttals.push({ probe: lm[1].trim(), handling: lm[2].trim() });
  });
  return { rebuttals, stripped: text.slice(0, m.index).trimEnd() };
}

function RebuttalsPanel({ items }: { items: Rebuttal[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2 rounded-lg overflow-hidden" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.22)', borderLeft: '3px solid #F59E0B' }}>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{ borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C9A227" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#C9A227', fontFamily: "'Source Sans 3', sans-serif" }}>Likely Rebuttals</span>
        <span className="ml-auto text-[10px]" style={{ color: '#A88817' }}>{items.length}</span>
      </div>
      <div className="px-2.5 py-2 flex flex-col gap-1.5">
        {items.map((r, i) => (
          <div key={i} className="text-[12px] leading-[1.55]" style={{ color: TEXT_PRIMARY, fontFamily: "'Inter', sans-serif" }}>
            <p className="font-bold flex items-start gap-1">
              <span className="font-mono shrink-0" style={{ color: '#C9A227' }}>Q{i + 1}.</span>
              <span>{r.probe}</span>
            </p>
            <p className="pl-5" style={{ color: '#334155' }}>→ {r.handling}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── StoryBankPanel — lists resume-parsed stories in the left column ── */
export function StoryBankPanel({ stories, activeArchetype }: { stories?: LumoraStory[]; activeArchetype: Archetype | null }) {
  if (!stories || stories.length === 0) return null;
  // Sort: matching-archetype stories first
  const sorted = [...stories].sort((a, b) => {
    const aMatch = activeArchetype && a.archetypes.includes(activeArchetype) ? 0 : 1;
    const bMatch = activeArchetype && b.archetypes.includes(activeArchetype) ? 0 : 1;
    return aMatch - bMatch;
  });
  return (
    <div className="border-b" style={{ borderColor: '#E2E8F0' }}>
      <div className="px-3 pt-3 pb-1.5 flex items-center gap-2">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--cam-primary-dk)' }}>Story Bank</span>
        <span className="text-[9px]" style={{ color: '#94A3B8' }}>{stories.length}</span>
      </div>
      <div className="px-2 pb-2 space-y-1">
        {sorted.map(s => {
          const matches = !!activeArchetype && s.archetypes.includes(activeArchetype);
          return (
            <div key={s.id} className="px-2 py-1.5 rounded-md transition-all"
              style={{
                background: matches ? 'rgba(38,97,156,0.1)' : '#FFFFFF',
                border: matches ? '1px solid var(--cam-primary)' : '1px solid #E2E8F0',
              }}>
              <div className="flex items-start gap-1.5">
                <div className="flex flex-wrap gap-0.5 shrink-0 pt-0.5">
                  {s.archetypes.slice(0, 2).map(t => (
                    <span key={t} className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
                      style={{
                        background: (matches && t === activeArchetype) ? 'var(--cam-primary)' : 'rgba(38,97,156,0.15)',
                        color: (matches && t === activeArchetype) ? '#FFFFFF' : 'var(--cam-primary-dk)',
                      }}>
                      {t}
                    </span>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold truncate" style={{ color: TEXT_PRIMARY, fontFamily: "'Source Sans 3', sans-serif" }}>
                    {s.title}
                  </p>
                  {s.impact && <p className="text-[9px] truncate" style={{ color: 'var(--cam-primary-dk)' }}>{s.impact}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── RichText — renders markdown with proper code blocks ── */
function RichText({ text }: { text: string }) {
  if (!text) return null;

  // Split into blocks: fenced code blocks vs regular text.
  const blocks: { type: 'code' | 'text'; lang?: string; content: string }[] = [];
  const codeRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIdx = 0;
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIdx) blocks.push({ type: 'text', content: text.slice(lastIdx, match.index) });
    blocks.push({ type: 'code', lang: match[1] || 'python', content: match[2].trim() });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) blocks.push({ type: 'text', content: text.slice(lastIdx) });

  /** Detect if a line looks like code (indented, has code syntax) */
  const isCodeLine = (line: string): boolean => {
    const t = line.trimEnd();
    if (!t) return false;
    if (/^(\s{4,}|\t)/.test(line) && !line.trim().startsWith('-') && !line.trim().startsWith('•')) return true;
    if (/^(class |def |function |const |let |var |import |from |if |for |while |return |self\.|print\(|console\.)/.test(t.trim())) return true;
    if (/[{};]$/.test(t.trim()) || /^\s*(else|elif|except|finally|catch|try):?\s*$/.test(t.trim())) return true;
    if (/^\s*(slow|fast|head|node|prev|curr|next)\s*[=.]/.test(t.trim())) return true;
    return false;
  };

  /** Group consecutive code-like lines into code blocks */
  const processTextBlock = (content: string): { type: 'code' | 'text'; content: string }[] => {
    const lines = content.split('\n');
    const result: { type: 'code' | 'text'; content: string }[] = [];
    let codeLines: string[] = [];
    let textLines: string[] = [];

    const flushCode = () => { if (codeLines.length > 0) { result.push({ type: 'code', content: codeLines.join('\n') }); codeLines = []; } };
    const flushText = () => { if (textLines.length > 0) { result.push({ type: 'text', content: textLines.join('\n') }); textLines = []; } };

    for (const line of lines) {
      if (isCodeLine(line)) {
        flushText();
        codeLines.push(line);
      } else {
        // Allow blank lines inside code blocks.
        if (codeLines.length > 0 && line.trim() === '') {
          codeLines.push(line);
        } else {
          flushCode();
          textLines.push(line);
        }
      }
    }
    flushCode();
    flushText();
    return result;
  };

  const RICH_BOLD: React.CSSProperties = { color: TEXT_PRIMARY, fontWeight: 700, fontFamily: "'Clash Display',sans-serif" };
  const RICH_CODE: React.CSSProperties = { background: 'rgba(0,0,0,0.06)', color: 'var(--cam-primary-dk)', padding: '1px 5px', borderRadius: 3, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", border: '1px solid rgba(0,0,0,0.08)' };
  const RICH_LINK: React.CSSProperties = { color: 'var(--cam-primary)', textDecoration: 'underline' };
  const renderInline = (s: string) => renderInlineSafe(s, { bold: RICH_BOLD, code: RICH_CODE, link: RICH_LINK, allowLinks: true });

  const renderCodeBlock = (content: string, lang?: string, key?: number | string) => (
    <div key={key} className="rounded overflow-hidden my-1.5" style={{ border: '1px solid rgba(0,0,0,0.1)' }}>
      <div className="flex items-center justify-between px-3 py-1" style={{ background: 'rgba(0,0,0,0.04)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>{lang || 'code'}</span>
        <button onClick={() => navigator.clipboard.writeText(content)} className="text-[9px] px-1.5 py-0.5 rounded transition-colors hover:bg-black/5" style={{ color: '#64748B' }}>Copy</button>
      </div>
      <pre className="px-3 py-2 overflow-x-auto" style={{ background: 'rgba(15,23,42,0.95)', color: '#7DD3FC', fontSize: '11px', lineHeight: '1.6', fontFamily: "'Source Code Pro', monospace" }}><code>{content}</code></pre>
    </div>
  );

  const renderTextLine = (line: string, key: string) => {
    const t = line.trim();
    if (!t) return <div key={key} className="h-1" />;

    // Headers — bold with Clash Display.
    if (t.startsWith('### ')) return <h4 key={key} className="mt-3 mb-1" style={{ fontSize: '11px', fontWeight: 700, color: TEXT_PRIMARY, fontFamily: "'Source Sans 3', sans-serif", letterSpacing: '-0.01em' }}>{t.slice(4)}</h4>;
    if (t.startsWith('## ')) return <h3 key={key} className="mt-3 mb-1" style={{ fontSize: '12px', fontWeight: 700, color: TEXT_PRIMARY, fontFamily: "'Source Sans 3', sans-serif", letterSpacing: '-0.01em' }}>{t.slice(3)}</h3>;
    if (t.startsWith('# ')) return <h2 key={key} className="mt-3 mb-1" style={{ fontSize: '13px', fontWeight: 700, color: TEXT_PRIMARY, fontFamily: "'Source Sans 3', sans-serif", letterSpacing: '-0.02em' }}>{t.slice(2)}</h2>;

    // ALL-CAPS labels (TIME:, SPACE:, APPROACH:, etc.).
    const labelMatch = t.match(/^(SITUATION|TASK|ACTION|RESULT|LEARNING|SUMMARY|TIP|NOTE|WARNING|TIME|SPACE|APPROACH|COMPLEXITY|EXAMPLE|INPUT|OUTPUT|Q\d+|A\d+)[:\s]+\s*(.*)/i);
    if (labelMatch) return (
      <div key={key} className="mt-1.5">
        <span style={{ fontSize: '10px', fontWeight: 700, color: TEXT_PRIMARY, fontFamily: "'Source Sans 3', sans-serif" }}>{labelMatch[1].toUpperCase()}: </span>
        <span style={{ fontSize: '11px', lineHeight: '1.5', color: TEXT_PRIMARY }}>{renderInline(labelMatch[2])}</span>
      </div>
    );

    // Step N: pattern.
    const stepMatch = t.match(/^(Step\s+\d+)[:\s]+\s*(.*)/i);
    if (stepMatch) return (
      <div key={key} className="mt-0.5">
        <span style={{ fontSize: '10px', fontWeight: 700, color: TEXT_PRIMARY }}>{stepMatch[1]}: </span>
        <span style={{ fontSize: '11px', color: TEXT_PRIMARY }}>{stepMatch[2]}</span>
      </div>
    );

    // Numbered list.
    const numMatch = t.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) return (
      <div key={key} className="flex gap-1.5 pl-1 mt-0.5">
        <span style={{ fontSize: '11px', fontWeight: 700, color: TEXT_PRIMARY }}>{numMatch[1]}.</span>
        <span style={{ fontSize: '11px', lineHeight: '1.5', color: TEXT_PRIMARY }}>{renderInline(numMatch[2])}</span>
      </div>
    );

    // Bullets.
    if (t.startsWith('- ') || t.startsWith('• ') || t.startsWith('* ')) return (
      <div key={key} className="flex gap-1.5 pl-2 mt-0.5">
        <span className="shrink-0 mt-2 w-1 h-1 rounded-full" style={{ background: TEXT_PRIMARY }} />
        <span style={{ fontSize: '11px', lineHeight: '1.5', color: TEXT_PRIMARY }}>{renderInline(t.slice(2))}</span>
      </div>
    );

    // Arrow patterns (Input: X -> Output: Y).
    if (/^(Input|Output)[:\s]/.test(t)) return (
      <div key={key} className="mt-0.5 px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.04)', fontFamily: "'Source Code Pro', monospace", fontSize: '10px', color: TEXT_PRIMARY, border: '1px solid rgba(0,0,0,0.06)' }}>
        {t}
      </div>
    );

    // Horizontal rule.
    if (t === '---' || t === '***') return <div key={key} className="my-2 h-px" style={{ background: BORDER }} />;

    // Regular paragraph.
    return <p key={key} style={{ fontSize: '11px', lineHeight: '1.6', color: TEXT_PRIMARY }}>{renderInline(t)}</p>;
  };

  return (
    <div className="flex flex-col gap-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
      {blocks.map((block, bi) => {
        if (block.type === 'code') return renderCodeBlock(block.content, block.lang, bi);

        const subBlocks = processTextBlock(block.content);
        return subBlocks.map((sub, si) => {
          if (sub.type === 'code') return renderCodeBlock(sub.content, 'python', `${bi}-code-${si}`);
          return sub.content.split('\n').map((line, li) => renderTextLine(line, `${bi}-${si}-${li}`));
        });
      })}
    </div>
  );
}

/* ── AnswerView — picks STAR cards for behavioral, RichText otherwise ── */
export function AnswerView({ text, streaming }: { text: string; streaming?: boolean }) {
  const { archetype, stripped: afterArch } = useMemo(() => extractArchetype(text), [text]);
  const { rebuttals, stripped } = useMemo(() => extractRebuttals(afterArch), [afterArch]);
  const star = useMemo(() => parseStar(stripped), [stripped]);
  if (star) {
    return (
      <div>
        {archetype && <ArchetypeBadge archetype={archetype} />}
        <StarAnswer sections={star.sections} streaming={streaming} />
        <RebuttalsPanel items={rebuttals} />
      </div>
    );
  }
  if (archetype) {
    return (
      <div>
        <ArchetypeBadge archetype={archetype} />
        <RichText text={stripped} />
        <RebuttalsPanel items={rebuttals} />
      </div>
    );
  }
  return (
    <div>
      <RichText text={stripped} />
      <RebuttalsPanel items={rebuttals} />
    </div>
  );
}

/** Surface the archetype detected in `text`, for callers that want to drive
 *  story-bank highlighting in parallel with the AnswerView render. */
export function getArchetype(text: string): Archetype | null {
  return extractArchetype(text).archetype;
}
