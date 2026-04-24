import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { streamResponse } from '@/lib/sse-client';
import { getActiveAssistant, buildSystemContext, type LumoraStory } from '@/lib/lumora-assistant';
import { transcriptionAPI } from '@/lib/api-client';
import { useAudioDevices } from '@/components/lumora/audio/hooks/useAudioDevices';

/* White glass copilot — dark text */
const C = {
  base: 'rgba(255,255,255,0.4)', surface: 'rgba(0,0,0,0.03)', elevated: '#22D3EE',
  text: '#0F172A', muted: '#64748B', accent: '#22D3EE',
  accentBg: 'rgba(34,211,238,0.08)', border: 'rgba(0,0,0,0.15)',
};

/* ── Types ── */
interface CopilotMessage { role: 'user' | 'ai'; text: string; time: Date; }

interface AICompanionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type AnswerMode = 'short' | 'detailed';

/* ── Text formatting ── */
function extractAnswer(parsed: any): string {
  if (!parsed) return '';
  if (Array.isArray(parsed)) {
    return parsed.filter((b: any) => b.content).map((b: any) => b.content).join('\n\n');
  }
  return '';
}

function cleanTags(text: string): string {
  return text.replace(/\[\/?(?:FOLLOWUP|HEADLINE|ANSWER|CODE|DIAGRAM|REQUIREMENTS|SCALEMATH|DEEPDESIGN|EDGECASES|TRADEOFFS)\]/gi, '').replace(/\n{3,}/g, '\n\n').trim();
}

/* ── Archetype parser — pulls leading "ARCHETYPE: X" line off a behavioral answer ── */
const ARCHETYPES = ['Conflict', 'Leadership', 'Failure', 'Ambiguity', 'Influence', 'Innovation', 'Collaboration', 'Growth', 'Career', 'Fit'] as const;
type Archetype = typeof ARCHETYPES[number];

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
  // Line-level parse: collect each labeled block until the next label or end
  const lines = text.split('\n');
  const found: { label: StarLabel; startLine: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim().replace(/^\*+\s*/, '').replace(/\*+$/, '');
    const m = stripped.match(/^(SITUATION|TASK|ACTION|RESULT)\s*[:\-—]/i);
    if (m) found.push({ label: m[1].toUpperCase() as StarLabel, startLine: i });
  }
  // Require at least Situation + Action + Result to treat as STAR (Task is often collapsed into Situation)
  const labels = new Set(found.map(f => f.label));
  if (!labels.has('SITUATION') || !labels.has('ACTION') || !labels.has('RESULT')) return null;

  const sections: { label: StarLabel; body: string }[] = [];
  for (let k = 0; k < found.length; k++) {
    const { label, startLine } = found[k];
    const endLine = k + 1 < found.length ? found[k + 1].startLine : lines.length;
    // Strip the label off the first line
    const firstLine = lines[startLine].replace(/^\s*\*?\*?\s*(SITUATION|TASK|ACTION|RESULT)\s*[:\-—]\s*/i, '');
    const body = [firstLine, ...lines.slice(startLine + 1, endLine)].join('\n').trim();
    sections.push({ label, body });
  }
  // Enforce canonical order S → T → A → R for display
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
  const renderInline = (s: string) =>
    s
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#0F172A;font-weight:700">$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.05);color:#0E7490;padding:1px 5px;border-radius:3px;font-size:12px;font-family:\'JetBrains Mono\',monospace">$1</code>');
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let bulletGroup: string[] = [];
  const flushBullets = (key: string) => {
    if (bulletGroup.length === 0) return;
    out.push(
      <ul key={key} className="my-1 flex flex-col gap-1 pl-1">
        {bulletGroup.map((b, bi) => (
          <li key={bi} className="flex gap-2">
            <span className="shrink-0 mt-2 w-1 h-1 rounded-full" style={{ background: '#22D3EE' }} />
            <span style={{ fontSize: '13px', lineHeight: '1.55', color: '#0F172A' }} dangerouslySetInnerHTML={{ __html: renderInline(b) }} />
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
      <p key={`p-${i}`} style={{ fontSize: '13px', lineHeight: '1.55', color: '#0F172A' }} dangerouslySetInnerHTML={{ __html: renderInline(t) }} />
    );
  });
  flushBullets('bl-end');
  return <div className="flex flex-col gap-1" style={{ fontFamily: "'Satoshi', sans-serif" }}>{out}</div>;
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
      {sections.map((s, i) => (
        <div key={s.label} className="rounded-lg overflow-hidden"
          style={{
            background: 'rgba(34,211,238,0.04)',
            border: '1px solid rgba(34,211,238,0.18)',
            borderLeft: '3px solid #22D3EE',
          }}>
          <div className="flex items-center justify-between px-3 py-1.5" style={{ background: 'rgba(34,211,238,0.06)', borderBottom: '1px solid rgba(34,211,238,0.1)' }}>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
                style={{ background: '#22D3EE', color: '#FFFFFF', fontFamily: "'Clash Display', sans-serif" }}>
                {s.label[0]}
              </span>
              <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: '#0E7490', fontFamily: "'Clash Display', sans-serif" }}>
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
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22D3EE' }} />
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
      style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0E7490" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: '#0E7490', fontFamily: "'Clash Display', sans-serif" }}>
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
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#B45309', fontFamily: "'Clash Display', sans-serif" }}>Likely Rebuttals</span>
        <span className="ml-auto text-[10px]" style={{ color: '#92400E' }}>{items.length}</span>
      </div>
      <div className="px-2.5 py-2 flex flex-col gap-1.5">
        {items.map((r, i) => (
          <div key={i} className="text-[12px] leading-[1.55]" style={{ color: '#0F172A', fontFamily: "'Satoshi', sans-serif" }}>
            <p className="font-bold flex items-start gap-1">
              <span className="font-mono shrink-0" style={{ color: '#B45309' }}>Q{i + 1}.</span>
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
function StoryBankPanel({ stories, activeArchetype }: { stories?: LumoraStory[]; activeArchetype: Archetype | null }) {
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
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: '#0E7490' }}>Story Bank</span>
        <span className="text-[9px]" style={{ color: '#94A3B8' }}>{stories.length}</span>
      </div>
      <div className="px-2 pb-2 space-y-1">
        {sorted.map(s => {
          const matches = !!activeArchetype && s.archetypes.includes(activeArchetype);
          return (
            <div key={s.id} className="px-2 py-1.5 rounded-md transition-all"
              style={{
                background: matches ? 'rgba(34,211,238,0.1)' : '#FFFFFF',
                border: matches ? '1px solid #22D3EE' : '1px solid #E2E8F0',
              }}>
              <div className="flex items-start gap-1.5">
                <div className="flex flex-wrap gap-0.5 shrink-0 pt-0.5">
                  {s.archetypes.slice(0, 2).map(t => (
                    <span key={t} className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
                      style={{
                        background: (matches && t === activeArchetype) ? '#22D3EE' : 'rgba(34,211,238,0.15)',
                        color: (matches && t === activeArchetype) ? '#FFFFFF' : '#0E7490',
                      }}>
                      {t}
                    </span>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold truncate" style={{ color: '#0F172A', fontFamily: "'Clash Display', sans-serif" }}>
                    {s.title}
                  </p>
                  {s.impact && <p className="text-[9px] truncate" style={{ color: '#0E7490' }}>{s.impact}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── AnswerView — picks STAR cards for behavioral, RichText otherwise ── */
function AnswerView({ text, streaming }: { text: string; streaming?: boolean }) {
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

/* ── RichText — renders markdown with proper code blocks ── */
function RichText({ text }: { text: string }) {
  if (!text) return null;

  // Split into blocks: fenced code blocks vs regular text
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
    // Indented by 4+ spaces or tab
    if (/^(\s{4,}|\t)/.test(line) && !line.trim().startsWith('-') && !line.trim().startsWith('•')) return true;
    // Common code patterns
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
        // Allow blank lines inside code blocks
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

  const renderInline = (s: string) => {
    return s
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#0F172A;font-weight:700;font-family:\'Clash Display\',sans-serif">$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.06);color:#0E7490;padding:1px 5px;border-radius:3px;font-size:10px;font-family:\'JetBrains Mono\',monospace;border:1px solid rgba(0,0,0,0.08)">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#22D3EE;text-decoration:underline">$1</a>');
  };

  const renderCodeBlock = (content: string, lang?: string, key?: number | string) => (
    <div key={key} className="rounded overflow-hidden my-1.5" style={{ border: '1px solid rgba(0,0,0,0.1)' }}>
      <div className="flex items-center justify-between px-3 py-1" style={{ background: 'rgba(0,0,0,0.04)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>{lang || 'code'}</span>
        <button onClick={() => navigator.clipboard.writeText(content)} className="text-[9px] px-1.5 py-0.5 rounded transition-colors hover:bg-black/5" style={{ color: '#64748B' }}>Copy</button>
      </div>
      <pre className="px-3 py-2 overflow-x-auto" style={{ background: 'rgba(15,23,42,0.95)', color: '#7DD3FC', fontSize: '11px', lineHeight: '1.6', fontFamily: "'JetBrains Mono', monospace" }}><code>{content}</code></pre>
    </div>
  );

  const renderTextLine = (line: string, key: string) => {
    const t = line.trim();
    if (!t) return <div key={key} className="h-1" />;

    // Headers — bold with Clash Display
    if (t.startsWith('### ')) return <h4 key={key} className="mt-3 mb-1" style={{ fontSize: '11px', fontWeight: 700, color: C.text, fontFamily: "'Clash Display', sans-serif", letterSpacing: '-0.01em' }}>{t.slice(4)}</h4>;
    if (t.startsWith('## ')) return <h3 key={key} className="mt-3 mb-1" style={{ fontSize: '12px', fontWeight: 700, color: C.text, fontFamily: "'Clash Display', sans-serif", letterSpacing: '-0.01em' }}>{t.slice(3)}</h3>;
    if (t.startsWith('# ')) return <h2 key={key} className="mt-3 mb-1" style={{ fontSize: '13px', fontWeight: 700, color: C.text, fontFamily: "'Clash Display', sans-serif", letterSpacing: '-0.02em' }}>{t.slice(2)}</h2>;

    // ALL-CAPS labels (TIME:, SPACE:, APPROACH:, etc.)
    const labelMatch = t.match(/^(SITUATION|TASK|ACTION|RESULT|LEARNING|SUMMARY|TIP|NOTE|WARNING|TIME|SPACE|APPROACH|COMPLEXITY|EXAMPLE|INPUT|OUTPUT|Q\d+|A\d+)[:\s]+\s*(.*)/i);
    if (labelMatch) return (
      <div key={key} className="mt-1.5">
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#0F172A', fontFamily: "'Clash Display', sans-serif" }}>{labelMatch[1].toUpperCase()}: </span>
        <span style={{ fontSize: '11px', lineHeight: '1.5', color: '#0F172A' }} dangerouslySetInnerHTML={{ __html: renderInline(labelMatch[2]) }} />
      </div>
    );

    // Step N: pattern
    const stepMatch = t.match(/^(Step\s+\d+)[:\s]+\s*(.*)/i);
    if (stepMatch) return (
      <div key={key} className="mt-0.5">
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#0F172A' }}>{stepMatch[1]}: </span>
        <span style={{ fontSize: '11px', color: '#0F172A' }}>{stepMatch[2]}</span>
      </div>
    );

    // Numbered list
    const numMatch = t.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) return (
      <div key={key} className="flex gap-1.5 pl-1 mt-0.5">
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A' }}>{numMatch[1]}.</span>
        <span style={{ fontSize: '11px', lineHeight: '1.5', color: '#0F172A' }} dangerouslySetInnerHTML={{ __html: renderInline(numMatch[2]) }} />
      </div>
    );

    // Bullets
    if (t.startsWith('- ') || t.startsWith('• ') || t.startsWith('* ')) return (
      <div key={key} className="flex gap-1.5 pl-2 mt-0.5">
        <span className="shrink-0 mt-2 w-1 h-1 rounded-full" style={{ background: '#0F172A' }} />
        <span style={{ fontSize: '11px', lineHeight: '1.5', color: '#0F172A' }} dangerouslySetInnerHTML={{ __html: renderInline(t.slice(2)) }} />
      </div>
    );

    // Arrow patterns (Input: X -> Output: Y)
    if (/^(Input|Output)[:\s]/.test(t)) return (
      <div key={key} className="mt-0.5 px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.04)', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#0F172A', border: '1px solid rgba(0,0,0,0.06)' }}>
        {t}
      </div>
    );

    // Horizontal rule
    if (t === '---' || t === '***') return <div key={key} className="my-2 h-px" style={{ background: C.border }} />;

    // Regular paragraph
    return <p key={key} style={{ fontSize: '11px', lineHeight: '1.6', color: C.text }} dangerouslySetInnerHTML={{ __html: renderInline(t) }} />;
  };

  return (
    <div className="flex flex-col gap-0.5" style={{ fontFamily: "'Satoshi', sans-serif" }}>
      {blocks.map((block, bi) => {
        if (block.type === 'code') return renderCodeBlock(block.content, block.lang, bi);

        // Process text blocks to detect inline code
        const subBlocks = processTextBlock(block.content);
        return subBlocks.map((sub, si) => {
          if (sub.type === 'code') return renderCodeBlock(sub.content, 'python', `${bi}-code-${si}`);
          return sub.content.split('\n').map((line, li) => renderTextLine(line, `${bi}-${si}-${li}`));
        });
      })}
    </div>
  );
}

/* ── Mic Button (centered, prominent) ── */
function MicButtonLarge({ onResult, disabled }: { onResult: (text: string) => void; disabled: boolean }) {
  const { token } = useAuth();
  const { selectedDeviceId } = useAudioDevices();
  const [rec, setRec] = useState(false);
  const [busy, setBusy] = useState(false);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    try {
      // Use exact same audio config as the working main AudioCapture
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (selectedDeviceId) {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      chunks.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        if (blob.size === 0) return;
        setBusy(true);
        try {
          const r = await transcriptionAPI.transcribe(token!, blob, 'audio.webm', false);
          if (r.text?.trim()) onResult(r.text.trim());
        } catch {}
        setBusy(false);
      };
      mr.start(500);
      mrRef.current = mr;
      setRec(true);
    } catch {}
  }, [token, onResult, selectedDeviceId]);
  const stop = useCallback(() => { mrRef.current?.state === 'recording' && mrRef.current.stop(); setRec(false); }, []);

  if (busy) return (
    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: C.accentBg }}>
      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: C.muted, borderTopColor: C.accent }} />
    </div>
  );
  return (
    <button onClick={rec ? stop : start} disabled={disabled}
      className="w-14 h-14 rounded-full flex items-center justify-center transition-all disabled:opacity-40 shadow-md hover:shadow-lg hover:scale-105"
      style={rec
        ? { background: '#ef4444', boxShadow: '0 0 0 4px rgba(239,68,68,0.2)' }
        : { background: C.elevated, boxShadow: `0 0 0 4px ${C.accentBg}` }
      }
      title={rec ? 'Stop recording' : 'Voice input'}
    >
      {rec
        ? <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
        : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
      }
    </button>
  );
}

/* ═══ Icicle Panel ═══ */
export function AICompanionPanel({ isOpen, onClose, initialQuestion, embedded = false }: AICompanionPanelProps & { initialQuestion?: string; embedded?: boolean }) {
  const { token } = useAuth();

  // Load active assistant context (resume + JD) — shared helper, same shape as Coding + Design windows
  const activeAssistant = useMemo(() => getActiveAssistant(), []);
  const systemContext = useMemo(() => buildSystemContext(activeAssistant), [activeAssistant]);

  // Persist Behavioral messages per-assistant in sessionStorage so refresh doesn't
  // wipe an in-progress interview. Cleared when the user explicitly clears chat.
  // MUST come after activeAssistant — `const` has TDZ, minified references crash
  // at runtime with 'Cannot access … before initialization' if this block runs first.
  const storageKey = useMemo(() => activeAssistant?.id ? `lumora_behavioral_${activeAssistant.id}` : 'lumora_behavioral_default', [activeAssistant?.id]);
  const [messages, setMessages] = useState<CopilotMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as Array<{ role: 'user' | 'ai'; text: string; time: string }>;
      return parsed.map(m => ({ ...m, time: new Date(m.time) }));
    } catch { return []; }
  });

  // Persist on every messages change
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(messages.map(m => ({ ...m, time: m.time.toISOString() })))); } catch { /* quota */ }
  }, [messages, storageKey]);

  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [input, setInput] = useState('');
  const [minimized, setMinimized] = useState(true);
  const [maximized, setMaximized] = useState(false);
  const [panelWidth, setPanelWidth] = useState(400);
  const [panelHeight, setPanelHeight] = useState(560);
  const [isResizing, setIsResizing] = useState<false | 'w' | 'h' | 'wh'>(false);
  const [answerMode, setAnswerMode] = useState<AnswerMode>('short');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number; mode: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initialQuestionSent = useRef(false);

  // Handle initial question from behavioral button
  useEffect(() => {
    if (initialQuestion && !initialQuestionSent.current) {
      initialQuestionSent.current = true;
      setMinimized(false);
      // Small delay to let panel render before sending
      setTimeout(() => ask(initialQuestion), 300);
    }
  }, [initialQuestion]);

  // Reset when question changes
  useEffect(() => {
    if (!initialQuestion) initialQuestionSent.current = false;
  }, [initialQuestion]);

  // Drag handlers for floating window
  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setPosition({
        x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
      });
    };
    const handleUp = () => { setIsDragging(false); dragRef.current = null; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isDragging]);

  const startDrag = (e: React.MouseEvent) => {
    if (maximized) return;
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: position.x, origY: position.y };
  };

  // Resize handlers — edges and corner
  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const r = resizeRef.current;
      if (r.mode === 'w' || r.mode === 'wh') {
        const dX = r.startX - e.clientX;
        setPanelWidth(Math.min(Math.max(300, r.startW + dX), 800));
      }
      if (r.mode === 'h' || r.mode === 'wh') {
        const dY = r.startY - e.clientY;
        setPanelHeight(Math.min(Math.max(300, r.startH + dY), 900));
      }
    };
    const handleUp = () => { setIsResizing(false); resizeRef.current = null; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isResizing]);

  // Auto-scroll
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, streamText, isOpen]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen]);

  // Ask a question — streams independently
  const ask = useCallback(async (question: string) => {
    if (!question.trim() || !token || streaming) return;

    const modePrefix = answerMode === 'short' ? '[SHORT] ' : '[DETAILED] ';

    setMessages(prev => [...prev, { role: 'user', text: question.trim(), time: new Date() }]);
    setStreaming(true);
    setStreamText('');

    try {
      await streamResponse({
        question: modePrefix + question.trim(),
        token,
        useSearch: false,
        systemContext,
        onToken: (data) => {
          if (data.t) setStreamText(prev => prev + data.t);
        },
        onAnswer: (data: any) => {
          const answerText = extractAnswer(data.parsed) || data.raw || '';
          setMessages(prev => [...prev, { role: 'ai', text: cleanTags(answerText), time: new Date() }]);
          setStreamText('');
          setStreaming(false);
        },
        onError: (data: any) => {
          setMessages(prev => [...prev, { role: 'ai', text: `Error: ${data.message || 'Something went wrong'}`, time: new Date() }]);
          setStreamText('');
          setStreaming(false);
        },
      });
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Connection failed. Try again.', time: new Date() }]);
      setStreamText('');
      setStreaming(false);
    }
  }, [token, streaming, answerMode, systemContext]);

  const handleSubmit = useCallback(() => {
    if (input.trim()) { ask(input); setInput(''); }
  }, [input, ask]);

  // Embedded mode = render inline, skip minimized/floating
  useEffect(() => {
    if (embedded) setMinimized(false);
  }, [embedded]);

  // Minimized = floating icon button
  if (minimized && !embedded) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110"
        style={{ background: '#22D3EE', boxShadow: 'none' }}
        title="Open Icicle"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{messages.filter(m => m.role === 'user').length}</span>
        )}
      </button>
    );
  }

  return (
    <div
      className={embedded ? "flex flex-col h-full w-full" : "fixed z-50 flex flex-col"}
      style={embedded ? { background: '#FFFFFF', borderRadius: 0 } : {
        width: maximized ? 'calc(100vw - 80px)' : panelWidth,
        height: maximized ? '100vh' : panelHeight,
        right: maximized ? 0 : `calc(24px - ${position.x}px)`,
        bottom: maximized ? 0 : `calc(24px - ${position.y}px)`,
        left: maximized ? '80px' : undefined,
        top: maximized ? 0 : undefined,
        borderRadius: maximized ? 0 : '16px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: maximized ? 'none' : '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        transition: isDragging ? 'none' : 'all 0.2s ease',
      }}
    >
      {/* Resize handles — left edge, top edge, top-left corner */}
      {!maximized && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10" onMouseDown={(e) => { setIsResizing('w'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, mode: 'w' }; }} />
          <div className="absolute left-0 top-0 right-0 h-2 cursor-ns-resize z-10" onMouseDown={(e) => { setIsResizing('h'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, mode: 'h' }; }} />
          <div className="absolute left-0 top-0 w-4 h-4 cursor-nwse-resize z-20" onMouseDown={(e) => { setIsResizing('wh'); resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelWidth, startH: panelHeight, mode: 'wh' }; }} />
        </>
      )}

      {/* Header */}
      <div
        className={`flex items-center gap-2 h-10 px-3 shrink-0 ${embedded ? '' : 'cursor-move'} select-none`}
        style={{ borderBottom: '1px solid #E2E8F0', borderRadius: embedded || maximized ? 0 : '16px 16px 0 0' }}
        onMouseDown={embedded ? undefined : startDrag}
      >
        {/* Left: clear + close (embedded) or clear + new (floating) */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => { if (messages.length > 0 && confirm('Clear chat history?')) setMessages([]); }}
            className="p-1 rounded-md transition-colors hover:bg-black/5" style={{ color: '#94A3B8' }} title="Clear history">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
          </button>
          {embedded ? (
            <button onClick={onClose} className="p-1 rounded-md transition-colors hover:bg-black/5" style={{ color: '#94A3B8' }} title="Close">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          ) : (
            <button onClick={() => setMessages([])} className="p-1 rounded-md transition-colors hover:bg-black/5" style={{ color: '#94A3B8' }} title="New chat">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
          )}
        </div>

        {/* Center: title + mode toggle */}
        <div className="flex-1 flex items-center justify-center gap-2">
          <span className="text-[11px] font-bold" style={{ color: '#0F172A' }}>Icicle</span>
          {activeAssistant && <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#F0FDF4', color: '#16A34A' }}>{activeAssistant.company || activeAssistant.role || 'Custom'}</span>}
          <div className="flex items-center rounded-md p-0.5" style={{ background: '#F1F5F9' }}>
            {(['short', 'detailed'] as AnswerMode[]).map(mode => (
              <button
                key={mode}
                onClick={(e) => { e.stopPropagation(); setAnswerMode(mode); }}
                className="px-2.5 py-0.5 rounded transition-all"
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: answerMode === mode ? '#FFFFFF' : '#94A3B8',
                  background: answerMode === mode ? '#22D3EE' : 'transparent',
                }}
              >
                {mode === 'short' ? 'Short' : 'Detailed'}
              </button>
            ))}
          </div>
        </div>

        {/* Right: minimize + maximize (floating only) */}
        {!embedded && (
          <div className="flex items-center gap-0.5">
            <button onClick={() => setMinimized(true)}
              className="p-1 rounded-md transition-colors hover:bg-black/5" style={{ color: '#94A3B8' }} title="Minimize">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12h16" /></svg>
            </button>
            <button onClick={() => { setMaximized(!maximized); setPosition({ x: 0, y: 0 }); }}
              className="p-1 rounded-md transition-colors hover:bg-black/5" style={{ color: '#94A3B8' }} title={maximized ? 'Restore' : 'Maximize'}>
              {maximized ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="5" width="14" height="14" rx="1" /><path d="M9 3h10a2 2 0 012 2v10" /></svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Chat — side-by-side when embedded, top-to-bottom when floating */}
      {embedded ? (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left: stories + questions */}
          <div className="w-[280px] shrink-0 overflow-auto border-r" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
            <StoryBankPanel
              stories={activeAssistant?.stories}
              activeArchetype={(() => {
                const lastAi = [...messages].reverse().find(m => m.role === 'ai');
                if (!lastAi && streamText) return extractArchetype(streamText).archetype;
                return lastAi ? extractArchetype(lastAi.text).archetype : null;
              })()}
            />
            <div className="p-3 space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] px-1" style={{ color: '#94A3B8' }}>Questions</p>
              {messages.filter(m => m.role === 'user').length === 0 && !streaming && (
                <div className="py-4">
                  <p className="text-[10px] mb-3" style={{ color: '#94A3B8' }}>Ask a question to get started</p>
                  <div className="space-y-1.5">
                    {['Tell me about yourself', 'Describe a conflict at work', 'Why should we hire you?', 'Your biggest weakness?'].map(s => (
                      <button key={s} onClick={() => ask(s)} className="w-full text-left px-3 py-2 rounded-lg text-[11px] transition-all" style={{ border: '1px solid #E2E8F0', color: '#475569' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#22D3EE'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.filter(m => m.role === 'user').map((msg, i) => (
                <div key={i} className="px-3 py-2 rounded-lg text-[11px] font-medium" style={{ background: '#fff', border: '1px solid #E2E8F0', color: '#0F172A' }}>
                  <p>{msg.text}</p>
                  <span className="text-[8px] mt-1 block" style={{ color: '#94A3B8' }}>{msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Right: answers */}
          <div ref={scrollRef} className="flex-1 overflow-auto p-4">
            {messages.filter(m => m.role === 'ai').length === 0 && !streaming ? (
              <div className="flex items-center justify-center h-full" style={{ color: '#94A3B8' }}>
                <p className="text-xs">Answers will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.filter(m => m.role === 'ai').map((msg, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#29B5E8" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#29B5E8' }}>Answer</span>
                    </div>
                    <AnswerView text={msg.text} />
                  </div>
                ))}
                {streaming && (
                  <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#29B5E8" strokeWidth="1.5" className="animate-pulse"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#29B5E8' }}>Answering...</span>
                    </div>
                    {streamText ? <><AnswerView text={cleanTags(streamText)} streaming /><span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm" style={{ background: '#29B5E8' }} /></>
                      : <span className="animate-pulse text-xs" style={{ color: '#94A3B8' }}>Thinking...</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-3">
          {messages.length === 0 && !streaming ? (
            <div className="flex flex-col items-center justify-center h-full py-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1" className="mb-4 opacity-40">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <p className="text-[9px] mb-3 text-center" style={{ color: C.muted }}>
                {answerMode === 'short' ? 'Short mode — concise bullet points' : 'Detailed mode — comprehensive explanations'}
              </p>
              <div className="grid grid-cols-2 gap-1.5 w-full">
                {['Design a URL shortener', 'Explain TCP vs UDP', 'Tell me about a conflict', 'Detect cycle in linked list'].map(s => (
                  <button key={s} onClick={() => ask(s)} className="text-left px-2.5 py-2 rounded-lg transition-all"
                    style={{ border: '1px solid rgba(0,0,0,0.08)', fontSize: '10px', color: '#64748B' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = 'transparent'; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg, i) => msg.role === 'user' ? (
                <div key={i} className="flex flex-col items-end">
                  <div className="rounded-xl px-2.5 py-1.5 max-w-[90%]" style={{ background: C.accentBg }}>
                    <p style={{ fontSize: '10px', color: C.text }}>{msg.text}</p>
                  </div>
                </div>
              ) : (
                <div key={i} className="rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.accent }}>Icicle</span>
                  </div>
                  <div className="min-w-0"><AnswerView text={msg.text} /></div>
                </div>
              ))}
              {streaming && (
                <div className="rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" className="animate-pulse">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.accent }}>Icicle</span>
                  </div>
                  <div>
                    {streamText ? <><AnswerView text={cleanTags(streamText)} streaming /><span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm" style={{ background: C.accent }} /></>
                      : <span className="animate-pulse" style={{ fontSize: '10px', color: C.muted }}>Thinking...</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-2 shrink-0 flex flex-col items-center gap-2">
        {/* Prominent centered mic button */}
        <MicButtonLarge onResult={(text) => ask(text)} disabled={streaming} />
        {/* Text input row */}
        <div className="flex items-center gap-1.5 px-2 h-9 rounded-xl w-full" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) handleSubmit(); }}
            placeholder={answerMode === 'short' ? 'Type a question...' : 'Type a question...'}
            className="flex-1 bg-transparent focus:outline-none min-w-0 placeholder:opacity-40"
            style={{ fontFamily: "'Satoshi', sans-serif", color: '#0F172A', fontSize: '10px' }} disabled={streaming} />
          {input.trim() && !streaming && (
            <button onClick={handleSubmit} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: '#22D3EE' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AICompanionToggle({ onClick, hasActivity }: { onClick: () => void; hasActivity: boolean }) {
  return (
    <button onClick={onClick} className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105" style={{ background: '#22D3EE' }} title="Icicle">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
      {hasActivity && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--accent)] border-2" style={{ borderColor: C.base }} />}
    </button>
  );
}
