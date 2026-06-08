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
const LcStripHeader = ({ icon, label, hint, count, right }: {
  icon?: React.ReactNode;
  label: string;
  hint?: string;
  count?: number | string;
  right?: React.ReactNode;
}) => {
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

const extractArchetype = (text: string): { archetype: Archetype | null; stripped: string } => {
  if (!text) return { archetype: null, stripped: text };
  const m = text.match(/^\s*ARCHETYPE\s*:\s*([A-Za-z/ -]+)\s*\n/);
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

const parseStar = (text: string): { sections: { label: StarLabel; body: string }[] } | null => {
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
    const body = [firstLine, ...lines.slice(startLine + 1, endLine)]
      .join('\n')
      // Strip stray leading ** Claude emits before section bodies.
      // Valid bold (**word**) has no space after the opener — safe to remove
      // "** " (asterisks + space) and standalone "**" lines.
      .replace(/^\*\* ?/gm, '')
      .replace(/^\*\*$/gm, '')
      .trim();
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
const StarBody = ({ text }: { text: string }) => {
  if (!text) return null;
  const STAR_BOLD: React.CSSProperties = { color: TEXT_PRIMARY, fontWeight: 700 };
  const STAR_CODE: React.CSSProperties = { background: 'var(--bg-elevated)', color: 'var(--accent-text)', padding: '1px 6px', borderRadius: 4, fontSize: 12.5, fontFamily: 'var(--font-mono)', border: '1px solid var(--border)' };
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
const StarAnswer = ({ sections, streaming }: { sections: { label: StarLabel; body: string }[]; streaming?: boolean }) => {
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
                className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded transition-[background-color,color,transform] active:scale-[0.98]"
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
const ArchetypeBadge = ({ archetype }: { archetype: Archetype }) => {
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

const extractRebuttals = (text: string): { rebuttals: Rebuttal[]; stripped: string } => {
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

const RebuttalsPanel = ({ items }: { items: Rebuttal[] }) => {
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
export const StoryBankPanel = ({ stories, activeArchetype }: { stories?: LumoraStory[]; activeArchetype: Archetype | null }) => {
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
            <div key={s.id} className="px-2 py-1.5 rounded-md transition-[background-color,border-color]"
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
                  <p className="text-[10px] font-bold truncate" style={{ color: TEXT_PRIMARY, fontFamily: "var(--font-sans)" }}>
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

/* ── RichText — single-pass markdown renderer.
   Parses ## headings, | tables |, - bullets, ``` code ```, numbered lists,
   and plain paragraphs into typed segments, then renders each one. */
const RichText = ({ text }: { text: string }) => {
  if (!text) return null;

  const BOLD: React.CSSProperties = { color: TEXT_PRIMARY, fontWeight: 700 };
  const ICODE: React.CSSProperties = { background: 'var(--bg-elevated)', color: 'var(--accent-text)', padding: '1px 6px', borderRadius: 4, fontSize: 12.5, fontFamily: 'var(--font-mono)', border: '1px solid var(--border)' };
  const inline = (s: string) => renderInlineSafe(s, { bold: BOLD, code: ICODE, link: { color: 'var(--accent-text)', textDecoration: 'underline' }, allowLinks: true });

  const renderCodeBlock = (content: string, lang?: string, key?: number | string) => (
    <div key={key} className="rounded-lg overflow-hidden my-3" style={{ border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
        <span className="flex gap-1 items-center">
          <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(239,68,68,0.65)' }} />
          <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(201,162,39,0.85)' }} />
          <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(217,181,67,0.85)' }} />
        </span>
        <span className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-white">{lang || 'code'}</span>
        <button onClick={() => navigator.clipboard.writeText(content)} className="ml-auto text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded transition-[background-color,color,transform] active:scale-[0.98]" style={{ color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.20)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>Copy</button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto" style={{ background: '#0F1B2D', color: '#E6F4FF', fontSize: '12.5px', lineHeight: '1.65', fontFamily: 'var(--font-mono)' }}><code>{content}</code></pre>
    </div>
  );

  // Typed segment union
  type Seg =
    | { s: 'h1'; text: string } | { s: 'h2'; text: string }
    | { s: 'h3'; num: string | null; text: string }
    | { s: 'divider' }
    | { s: 'table'; rows: string[][] }
    | { s: 'bullet'; text: string } | { s: 'num'; n: string; text: string }
    | { s: 'label'; label: string; body: string } | { s: 'step'; step: string; body: string }
    | { s: 'para'; text: string };

  const parseSegs = (raw: string): Seg[] => {
    const lines = raw.split('\n');
    const out: Seg[] = [];
    let tRows: string[][] = [];
    const flushT = () => { if (tRows.length > 0) { out.push({ s: 'table', rows: [...tRows] }); tRows = []; } };
    const LBRE = /^(SITUATION|TASK|ACTION|RESULT|LEARNING|SUMMARY|TIP|NOTE|WARNING|TIME|SPACE|APPROACH|COMPLEXITY|EXAMPLE|CONSTRAINTS|EDGE CASES|Q\d+|A\d+)[:\s]+\s*(.*)/i;
    const STRE = /^(Step\s+\d+)[:\s]+\s*(.*)/i;

    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('|')) {
        if (/^\|[\s\-:|]+\|$/.test(t)) continue;
        const cells = t.split('|').slice(1, -1).map(c => c.trim());
        if (cells.some(c => c)) tRows.push(cells);
        continue;
      }
      flushT();
      if (!t) continue;
      const hm = t.match(/^(#{1,6})\s+(.*)/);
      if (hm) {
        const lvl = hm[1].length;
        const r = hm[2].replace(/\*\*/g, '').replace(/\*/g, '').trim().replace(/:$/, '');
        if (lvl === 1) { out.push({ s: 'h1', text: r }); continue; }
        if (lvl === 2) { out.push({ s: 'h2', text: r }); continue; }
        const nm = r.match(/^(\d+)[.)]\s+(.*)/);
        out.push({ s: 'h3', num: nm ? nm[1] : null, text: nm ? nm[2].replace(/:$/, '') : r });
        continue;
      }
      if (t === '---' || t === '***') { out.push({ s: 'divider' }); continue; }
      if (t.startsWith('- ') || t.startsWith('• ') || t.startsWith('* ')) { out.push({ s: 'bullet', text: t.slice(2) }); continue; }
      const nm2 = t.match(/^(\d+)\.\s+(.*)/);
      if (nm2) { out.push({ s: 'num', n: nm2[1], text: nm2[2] }); continue; }
      const lm = t.match(LBRE);
      if (lm) { out.push({ s: 'label', label: lm[1].toUpperCase(), body: lm[2] }); continue; }
      const sm = t.match(STRE);
      if (sm) { out.push({ s: 'step', step: sm[1], body: sm[2] }); continue; }
      out.push({ s: 'para', text: t });
    }
    flushT();
    return out;
  };

  const renderSeg = (seg: Seg, key: string): React.ReactNode => {
    switch (seg.s) {
      case 'h1': return <div key={key} className="flex items-center gap-3 px-3 py-2.5 mt-4 mb-2 rounded-sm first:mt-0" style={{ background: 'rgba(38,97,156,0.12)', borderLeft: '3px solid var(--cam-gold-leaf)' }}><span className="font-mono text-[11px] font-bold tracking-widest uppercase" style={{ color: TEXT_PRIMARY }}>{seg.text}</span></div>;
      case 'h2': return <div key={key} className="flex items-center gap-3 px-3 py-2 mt-3 mb-1.5 rounded-sm first:mt-0" style={{ background: 'rgba(38,97,156,0.08)', borderLeft: '3px solid var(--cam-gold-leaf)' }}><span className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: TEXT_PRIMARY }}>{seg.text}</span></div>;
      case 'h3': return (
        <div key={key} className="flex items-center gap-2 mt-2.5 mb-1" style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '8px' }}>
          {seg.num && <span className="flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold font-mono shrink-0" style={{ background: 'var(--accent-subtle)', color: 'var(--cam-primary-dk)', border: '1px solid var(--border)' }}>{seg.num}</span>}
          <span className="text-[13px] font-semibold" style={{ color: TEXT_PRIMARY, fontFamily: FONT_ANSWER }}>{seg.text}</span>
        </div>
      );
      case 'divider': return <div key={key} className="my-3 h-px" style={{ background: 'var(--cam-gold-leaf)', opacity: 0.4 }} />;
      case 'table': {
        if (seg.rows.length === 0) return null;
        const [hdr, ...body] = seg.rows;
        return (
          <div key={key} className="overflow-x-auto rounded-md border my-2" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>{hdr.map((c, ci) => <th key={ci} className="font-mono text-[9px] font-bold tracking-wider uppercase px-3 py-2 text-white whitespace-nowrap">{c}</th>)}</tr></thead>
              <tbody>{body.map((row, ri) => <tr key={ri} className="border-t" style={{ borderColor: 'var(--border)', background: ri % 2 ? 'rgba(38,97,156,0.025)' : 'transparent' }}>{row.map((c, ci) => <td key={ci} className="px-3 py-1.5" style={{ fontSize: '12.5px', lineHeight: '1.5', color: ci === 0 ? TEXT_PRIMARY : TEXT_SECONDARY, fontWeight: ci === 0 ? 600 : 400, fontFamily: ci === 0 ? 'var(--font-mono)' : FONT_ANSWER }}>{inline(c)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        );
      }
      case 'bullet': return <div key={key} className="flex gap-2.5 items-start mt-1"><span className="shrink-0 mt-[10px] w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cam-gold-leaf)' }} /><span style={{ fontSize: '14px', lineHeight: '1.65', color: TEXT_PRIMARY }}>{inline(seg.text)}</span></div>;
      case 'num': return <div key={key} className="flex gap-2.5 items-start mt-1"><span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold tabular-nums mt-[1px]" style={{ background: 'var(--accent-subtle)', color: 'var(--cam-primary-dk)', border: '1px solid var(--border)', fontFamily: FONT_ANSWER }}>{seg.n}</span><span style={{ fontSize: '14px', lineHeight: '1.65', color: TEXT_PRIMARY }}>{inline(seg.text)}</span></div>;
      case 'label': return <div key={key} className="mt-2 flex gap-2.5 items-baseline"><span className="shrink-0 font-mono font-bold text-[10px] tracking-[0.14em] uppercase px-2 py-0.5 rounded" style={{ background: 'var(--cam-primary-dk)', color: 'var(--cam-gold-leaf-lt)' }}>{seg.label}</span><span style={{ fontSize: '13.5px', lineHeight: '1.65', color: TEXT_PRIMARY }}>{inline(seg.body)}</span></div>;
      case 'step': return <div key={key} className="mt-1.5 flex gap-2 items-baseline"><span className="shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.12em]" style={{ background: 'var(--accent-subtle)', color: 'var(--cam-primary-dk)', border: '1px solid var(--border)' }}>{seg.step}</span><span style={{ fontSize: '13.5px', lineHeight: '1.65', color: TEXT_PRIMARY }}>{inline(seg.body)}</span></div>;
      case 'para': return /^(Input|Output)[:\s]/i.test(seg.text)
        ? <div key={key} className="mt-1.5 px-3 py-1.5 rounded-md" style={{ background: '#0F1B2D', color: '#E6F4FF', fontFamily: 'var(--font-mono)', fontSize: '12.5px', lineHeight: '1.6' }}>{seg.text}</div>
        : <p key={key} style={{ fontSize: '14px', lineHeight: '1.7', color: TEXT_PRIMARY }}>{inline(seg.text)}</p>;
    }
  };

  // Split on fenced code blocks, then parse each text chunk with parseSegs
  type Chunk = { k: 'code'; lang: string; content: string } | { k: 'text'; content: string };
  const chunks: Chunk[] = [];
  const fenceRe = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIdx = 0;
  let match;

  while ((match = fenceRe.exec(text)) !== null) {
    if (match.index > lastIdx) chunks.push({ k: 'text', content: text.slice(lastIdx, match.index) });
    chunks.push({ k: 'code', lang: match[1] || 'python', content: match[2].trim() });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) chunks.push({ k: 'text', content: text.slice(lastIdx) });

  return (
    <div className="flex flex-col gap-1" style={{ fontFamily: FONT_ANSWER }}>
      {chunks.map((chunk, ci) => chunk.k === 'code'
        ? renderCodeBlock(chunk.content, chunk.lang, ci)
        : parseSegs(chunk.content).map((seg, si) => renderSeg(seg, `${ci}-${si}`))
      )}
    </div>
  );
}


/* ── AnswerView — picks STAR cards for behavioral, RichText otherwise ── */
export const AnswerView = ({ text, streaming }: { text: string; streaming?: boolean }) => {
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
export const getArchetype = (text: string): Archetype | null  => {
  return extractArchetype(text).archetype;
}
