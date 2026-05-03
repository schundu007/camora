/* ── Answer rendering tree ─────────────────────────────────────────────────
   AnswerView is the single entry point used by AICompanionPanel to render an
   AI answer body. It picks STAR cards for behavioral answers, falls back to
   RichText for everything else, and decorates with an ArchetypeBadge +
   RebuttalsPanel when the response declares them.

   Modernized to match the LeetCode-inspired chrome used elsewhere
   (StreamingAnswer, LumoraTopBar, CodingLayout): every block header gets
   the cam-hero-strip navy gradient + 2px gold-leaf underline + white
   uppercase title. Body type bumps to 14 px on the --font-answer family so
   answers read like a textbook article rather than a side-panel chip.
*/
import React, { useMemo } from 'react';
import type { LumoraStory } from '@/lib/lumora-assistant';
import { renderInlineSafe } from './inline-renderer';

// Theme-aware. The hardcoded slate-900 we used to ship rendered as
// near-black on dark-navy --bg-elevated in dark mode → unreadable.
// Use the design-token primary so it flips to cream in dark mode.
const TEXT_PRIMARY = 'var(--text-primary)';
const TEXT_SECONDARY = 'var(--text-secondary)';
const BORDER = 'var(--border)';
const FONT_ANSWER = "var(--font-answer)";

/* ── LcStripHeader — the LeetCode-style block header used across every
       sub-card in the answer (code blocks, rebuttals, archetype badge,
       STAR sections). Navy hero-strip + 2px gold-leaf underline + white
       uppercase title is the unified active grammar. */
function LcStripHeader({ icon, label, hint, count, right }: {
  icon?: React.ReactNode;
  label: string;
  hint?: string;
  count?: number | string;
  right?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2"
      style={{
        background: 'var(--cam-hero-strip)',
        borderBottom: '1px solid var(--cam-gold-leaf)',
      }}
    >
      {icon ?? (
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cam-gold-leaf-lt)' }} />
      )}
      <span className="font-display text-[11px] font-bold tracking-[0.14em] uppercase text-white">
        {label}
      </span>
      {hint && (
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.72)' }}>
          · {hint}
        </span>
      )}
      <span className="ml-auto flex items-center gap-2">
        {count !== undefined && (
          <span className="text-[10px] font-bold tabular-nums" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {count}
          </span>
        )}
        {right}
      </span>
    </div>
  );
}

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

/* ── StarBody — body renderer used inside STAR cards. STAR answers are
   prose with bullets/bold — no code blocks needed. Set on the
   --font-answer (Source Sans 3) family at 14 px so the cards read
   like a textbook section. */
function StarBody({ text }: { text: string }) {
  if (!text) return null;
  const STAR_BOLD: React.CSSProperties = { color: TEXT_PRIMARY, fontWeight: 700 };
  const STAR_CODE: React.CSSProperties = { background: 'var(--bg-elevated)', color: 'var(--cam-primary-dk)', padding: '1px 6px', borderRadius: 4, fontSize: 12.5, fontFamily: 'var(--font-mono)', border: '1px solid var(--border)' };
  const inline = (s: string) => renderInlineSafe(s, { bold: STAR_BOLD, code: STAR_CODE });
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let bulletGroup: string[] = [];
  const flushBullets = (key: string) => {
    if (bulletGroup.length === 0) return;
    out.push(
      <ul key={key} className="my-1 flex flex-col gap-1.5">
        {bulletGroup.map((b, bi) => (
          <li key={bi} className="flex gap-2.5 items-start">
            <span className="shrink-0 mt-[9px] w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cam-gold-leaf)' }} />
            <span style={{ fontSize: '14px', lineHeight: '1.65', color: TEXT_PRIMARY }}>{inline(b)}</span>
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
      <p key={`p-${i}`} style={{ fontSize: '14px', lineHeight: '1.65', color: TEXT_PRIMARY }}>{inline(t)}</p>
    );
  });
  flushBullets('bl-end');
  return <div className="flex flex-col gap-2" style={{ fontFamily: FONT_ANSWER }}>{out}</div>;
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
    <div className="flex flex-col gap-3">
      {sections.map((s) => (
        <div key={s.label} className="rounded-lg overflow-hidden"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          }}>
          <LcStripHeader
            icon={
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold tabular-nums"
                style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', fontFamily: FONT_ANSWER }}
              >
                {s.label[0]}
              </span>
            }
            label={labelCopy[s.label].short}
            hint={labelCopy[s.label].hint}
            right={
              <button
                onClick={() => navigator.clipboard.writeText(s.body)}
                className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded transition-colors"
                style={{ color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.20)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                Copy
              </button>
            }
          />
          <div className="px-4 py-3">
            <StarBody text={s.body} />
          </div>
        </div>
      ))}
      {streaming && sections.length < 4 && (
        <div className="text-[11px] px-2 py-1 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--cam-gold-leaf)' }} />
          Generating remaining STAR sections…
        </div>
      )}
    </div>
  );
}

/* ── ArchetypeBadge — question-type pill shown above behavioral answers ── */
function ArchetypeBadge({ archetype }: { archetype: Archetype }) {
  return (
    <div
      className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
      style={{
        background: 'var(--cam-hero-strip)',
        borderBottom: '1px solid var(--cam-gold-leaf)',
      }}
    >
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full"
        style={{ background: 'var(--cam-gold-leaf)' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary-dk)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>
      <span className="font-display text-[11px] font-bold tracking-[0.14em] uppercase text-white">
        {archetype}
      </span>
      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.72)' }}>· {ARCHETYPE_HINT[archetype]}</span>
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
    <div
      className="mt-3 rounded-lg overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <LcStripHeader
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--cam-gold-leaf-lt)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        }
        label="Likely Rebuttals"
        count={items.length}
      />
      <div className="px-4 py-3 flex flex-col gap-3" style={{ fontFamily: FONT_ANSWER }}>
        {items.map((r, i) => (
          <div key={i} className="flex gap-2.5 items-start">
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-md shrink-0 text-[10px] font-bold tabular-nums"
              style={{
                background: 'var(--accent-subtle)',
                color: 'var(--cam-primary-dk)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Q{i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p style={{ fontSize: '13.5px', lineHeight: '1.55', fontWeight: 700, color: TEXT_PRIMARY }}>
                {r.probe}
              </p>
              <p className="mt-1 flex gap-1.5" style={{ fontSize: '13px', lineHeight: '1.6', color: TEXT_SECONDARY }}>
                <span style={{ color: 'var(--cam-gold-leaf-text)', fontWeight: 700 }}>→</span>
                <span>{r.handling}</span>
              </p>
            </div>
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
    <div className="border-b" style={{ borderColor: BORDER }}>
      <div className="px-3 pt-3 pb-1.5 flex items-center gap-2">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--cam-primary-dk)' }}>Story Bank</span>
        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{stories.length}</span>
      </div>
      <div className="px-2 pb-2 space-y-1">
        {sorted.map(s => {
          const matches = !!activeArchetype && s.archetypes.includes(activeArchetype);
          return (
            <div key={s.id} className="px-2 py-1.5 rounded-md transition-all"
              style={{
                background: matches ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                border: matches ? '1px solid var(--cam-primary)' : '1px solid var(--border)',
              }}>
              <div className="flex items-start gap-1.5">
                <div className="flex flex-wrap gap-0.5 shrink-0 pt-0.5">
                  {s.archetypes.slice(0, 2).map(t => (
                    <span key={t} className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
                      style={{
                        background: (matches && t === activeArchetype) ? 'var(--cam-primary)' : 'var(--accent-subtle)',
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

/* ── RichText — renders markdown with proper code blocks. Scaled up to a
   readable 14 px / 1.65 textbook treatment with stronger heading
   hierarchy and LeetCode-style inline labels. */
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

  const RICH_BOLD: React.CSSProperties = { color: TEXT_PRIMARY, fontWeight: 700 };
  const RICH_CODE: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    color: 'var(--cam-primary-dk)',
    padding: '1px 6px',
    borderRadius: 4,
    fontSize: 12.5,
    fontFamily: 'var(--font-mono)',
    border: '1px solid var(--border)',
  };
  const RICH_LINK: React.CSSProperties = { color: 'var(--cam-primary)', textDecoration: 'underline' };
  const renderInline = (s: string) => renderInlineSafe(s, { bold: RICH_BOLD, code: RICH_CODE, link: RICH_LINK, allowLinks: true });

  /* Code block — full LeetCode chrome: cam-hero-strip header, mac
     traffic-light dots, gold lang tag, copy button, dark-navy body
     with cyan token color so the code reads as a clear surface. */
  const renderCodeBlock = (content: string, lang?: string, key?: number | string) => (
    <div
      key={key}
      className="rounded-lg overflow-hidden my-3"
      style={{ border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5"
        style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}
      >
        <span className="flex gap-1 items-center">
          <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(239,68,68,0.65)' }} />
          <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(201,162,39,0.85)' }} />
          <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(217,181,67,0.85)' }} />
        </span>
        <span className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-white">
          {lang || 'code'}
        </span>
        <button
          onClick={() => navigator.clipboard.writeText(content)}
          className="ml-auto text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded transition-colors"
          style={{ color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.20)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          Copy
        </button>
      </div>
      <pre
        className="px-4 py-3 overflow-x-auto"
        style={{
          background: '#0F1B2D',
          color: '#E6F4FF',
          fontSize: '12.5px',
          lineHeight: '1.65',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <code>{content}</code>
      </pre>
    </div>
  );

  /* Headings — Source Sans 3 / Source Serif 4 family for "studied
     textbook" feel. Section titles get a subtle gold underline that
     matches the LeetCode active-tab grammar. */
  const headingBase: React.CSSProperties = {
    color: TEXT_PRIMARY,
    fontFamily: "var(--font-answer-heading)",
    letterSpacing: '-0.01em',
    fontWeight: 700,
  };

  const renderTextLine = (line: string, key: string) => {
    const t = line.trim();
    if (!t) return <div key={key} className="h-1" />;

    if (t.startsWith('### ')) {
      return (
        <h4 key={key} className="mt-4 mb-1.5 pb-1" style={{ ...headingBase, fontSize: '14px', borderBottom: '1px solid var(--border)' }}>
          {t.slice(4)}
        </h4>
      );
    }
    if (t.startsWith('## ')) {
      return (
        <h3 key={key} className="mt-5 mb-2 pb-1.5" style={{ ...headingBase, fontSize: '15.5px', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
          {t.slice(3)}
        </h3>
      );
    }
    if (t.startsWith('# ')) {
      return (
        <h2 key={key} className="mt-5 mb-2 pb-1.5" style={{ ...headingBase, fontSize: '17px', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
          {t.slice(2)}
        </h2>
      );
    }

    // ALL-CAPS labels (TIME:, SPACE:, APPROACH:, etc.) — render as a
    // navy chip + body, like a LeetCode mini-card row.
    const labelMatch = t.match(/^(SITUATION|TASK|ACTION|RESULT|LEARNING|SUMMARY|TIP|NOTE|WARNING|TIME|SPACE|APPROACH|COMPLEXITY|EXAMPLE|INPUT|OUTPUT|CONSTRAINTS|EDGE CASES|Q\d+|A\d+)[:\s]+\s*(.*)/i);
    if (labelMatch) {
      return (
        <div key={key} className="mt-2 flex gap-2.5 items-baseline">
          <span
            className="shrink-0 font-mono font-bold text-[10px] tracking-[0.14em] uppercase px-2 py-0.5 rounded"
            style={{
              background: 'var(--cam-primary-dk)',
              color: 'var(--cam-gold-leaf-lt)',
              letterSpacing: '0.12em',
            }}
          >
            {labelMatch[1].toUpperCase()}
          </span>
          <span style={{ fontSize: '13.5px', lineHeight: '1.65', color: TEXT_PRIMARY }}>
            {renderInline(labelMatch[2])}
          </span>
        </div>
      );
    }

    // Step N: pattern.
    const stepMatch = t.match(/^(Step\s+\d+)[:\s]+\s*(.*)/i);
    if (stepMatch) {
      return (
        <div key={key} className="mt-1.5 flex gap-2 items-baseline">
          <span
            className="shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{
              background: 'var(--accent-subtle)',
              color: 'var(--cam-primary-dk)',
              border: '1px solid var(--border)',
            }}
          >
            {stepMatch[1]}
          </span>
          <span style={{ fontSize: '13.5px', lineHeight: '1.65', color: TEXT_PRIMARY }}>
            {renderInline(stepMatch[2])}
          </span>
        </div>
      );
    }

    // Numbered list — chip-style number tile to anchor the eye.
    const numMatch = t.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      return (
        <div key={key} className="flex gap-2.5 items-start mt-1">
          <span
            className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold tabular-nums mt-[1px]"
            style={{
              background: 'var(--accent-subtle)',
              color: 'var(--cam-primary-dk)',
              border: '1px solid var(--border)',
              fontFamily: FONT_ANSWER,
            }}
          >
            {numMatch[1]}
          </span>
          <span style={{ fontSize: '14px', lineHeight: '1.65', color: TEXT_PRIMARY }}>
            {renderInline(numMatch[2])}
          </span>
        </div>
      );
    }

    // Bullets — gold-leaf dots, generous spacing.
    if (t.startsWith('- ') || t.startsWith('• ') || t.startsWith('* ')) {
      return (
        <div key={key} className="flex gap-2.5 items-start mt-1">
          <span
            className="shrink-0 mt-[10px] w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--cam-gold-leaf)' }}
          />
          <span style={{ fontSize: '14px', lineHeight: '1.65', color: TEXT_PRIMARY }}>
            {renderInline(t.slice(2))}
          </span>
        </div>
      );
    }

    // Input/Output lines — wrap as a navy code-card row.
    if (/^(Input|Output)[:\s]/.test(t)) {
      return (
        <div
          key={key}
          className="mt-1.5 px-3 py-1.5 rounded-md"
          style={{
            background: '#0F1B2D',
            color: '#E6F4FF',
            fontFamily: 'var(--font-mono)',
            fontSize: '12.5px',
            lineHeight: '1.6',
          }}
        >
          {t}
        </div>
      );
    }

    // Horizontal rule — gold-leaf accent line.
    if (t === '---' || t === '***') {
      return <div key={key} className="my-4 h-px" style={{ background: 'var(--cam-gold-leaf)', opacity: 0.5 }} />;
    }

    // Regular paragraph — textbook body type.
    return (
      <p key={key} style={{ fontSize: '14px', lineHeight: '1.7', color: TEXT_PRIMARY }}>
        {renderInline(t)}
      </p>
    );
  };

  return (
    <div className="flex flex-col gap-1" style={{ fontFamily: FONT_ANSWER }}>
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
