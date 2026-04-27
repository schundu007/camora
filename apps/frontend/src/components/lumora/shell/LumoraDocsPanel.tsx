/**
 * Interview Prep — matches capra.cariara.com/app/prep layout.
 * Sidebar sections + upload zones + Generate button.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getAuthHeaders } from '../../../utils/authHeaders';

const STORAGE_KEY = 'lumora_prep_v8'; // v8: fix rawContent unwrapping
const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface DocState {
  jd: string;
  jdFile?: string;
  resume: string;
  resumeFile?: string;
  coverLetter: string;
  coverLetterFile?: string;
  prepMaterials: string;
  prepMaterialsFile?: string;
  studyMaterials: string;
  studyMaterialsFile?: string;
  sections: Record<string, any>;
}

interface PrepData {
  companies: string[];
  activeCompany: string | null;
  data: Record<string, DocState>;
}

const EMPTY_DOC: DocState = {
  jd: '', resume: '', coverLetter: '', prepMaterials: '', studyMaterials: '',
  sections: {},
};

const INITIAL_STATE: PrepData = {
  companies: [],
  activeCompany: null,
  data: {},
};

const SIDEBAR_SECTIONS = [
  { id: 'input', label: 'Input Materials', color: 'var(--cam-primary)' },
  { id: 'jd-view', label: 'Job Description', color: 'var(--cam-primary)' },
  { id: 'pitch', label: 'Elevator Pitch', color: 'var(--cam-primary)' },
  { id: 'hr', label: 'HR Questions', color: 'var(--warning-text)' },
  { id: 'hiring-manager', label: 'Hiring Manager', color: 'var(--accent)' },
  { id: 'coding', label: 'Coding', color: 'var(--cam-primary)' },
  { id: 'system-design', label: 'System Design', color: 'var(--cam-primary)' },
  { id: 'behavioral', label: 'Behavioral', color: 'var(--cam-primary)' },
  { id: 'techstack', label: 'Tech Stack', color: 'var(--cam-primary)' },
];

/** Strip markdown fences and leading "json" tag; shared helper. */
function stripFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/gim, '')
    .replace(/```\s*$/gm, '')
    .replace(/^data:\s*/gim, '')
    .replace(/^json\s*(?=\{)/i, '')
    .trim();
}

/** Normalize prep content into a clean object (never stringify).
 *  Backend wraps failed JSON parsing in { rawContent: string } — unwrap it
 *  here and, if parsing fails, fall back to a readable { summary: text }
 *  so the UI never renders a RAW CONTENT dump with ```json fences. */
function formatPrepContent(content: any): any {
  if (!content) return { summary: 'No content generated' };
  if (typeof content === 'object' && !Array.isArray(content)) {
    // Backend wraps unparsed AI output in rawContent — try to extract the real JSON.
    // Bounded to small wrapper objects so we don't nuke legitimate payloads that
    // happen to carry a rawContent field alongside real fields.
    if (content.rawContent && typeof content.rawContent === 'string' && Object.keys(content).length <= 2) {
      const parsed = extractJSON(content.rawContent);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed;
      // Parsing failed — strip fences and present the text as a readable summary
      // instead of leaving the rawContent wrapper on, which would render a
      // "RAW CONTENT" dump via the generic catch-all.
      return { summary: stripFences(content.rawContent) };
    }
    // Summary contains raw JSON from a previous failed parse — extract it.
    // Drop the `Object.keys(content).length === 1` gate: cached data from
    // earlier broken parses can carry stale neighbour fields, but the
    // *real* payload is still inside the summary string. If extractJSON
    // returns a richer object than the wrapper, prefer it.
    if (content.summary && typeof content.summary === 'string' && content.summary.trim().startsWith('{')) {
      const parsed = extractJSON(content.summary);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length >= 1) {
        // Merge — parsed wins on overlap, but we keep any extra wrapper fields
        return { ...content, ...parsed };
      }
    }
    return content;
  }
  if (typeof content === 'string') {
    const parsed = extractJSON(content);
    if (parsed) return parsed;
    return { summary: stripFences(content) };
  }
  return { summary: String(content) };
}

/** Repair truncated JSON using delimiter stack — closes in correct nesting order */
function repairJSON(s: string): any {
  let str = s.trim();
  const start = str.indexOf('{');
  if (start < 0) return null;
  str = str.slice(start);

  // Close any unterminated string
  let inStr = false, esc = false;
  for (let i = 0; i < str.length; i++) {
    if (esc) { esc = false; continue; }
    if (str[i] === '\\') { esc = true; continue; }
    if (str[i] === '"') inStr = !inStr;
  }
  if (inStr) str += '"';

  // Remove trailing partial key-value pairs and commas
  str = str.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*"?\s*$/, '');
  str = str.replace(/,\s*$/, '');

  // Build stack of open delimiters and close in correct nesting order
  const stack: string[] = [];
  inStr = false; esc = false;
  for (let i = 0; i < str.length; i++) {
    if (esc) { esc = false; continue; }
    if (str[i] === '\\') { esc = true; continue; }
    if (str[i] === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (str[i] === '{') stack.push('}');
    else if (str[i] === '[') stack.push(']');
    else if (str[i] === '}' || str[i] === ']') stack.pop();
  }
  str += stack.reverse().join('');

  try { const p = JSON.parse(str); if (p && typeof p === 'object') return p; } catch {}
  return null;
}

/** Escape literal newlines/tabs inside JSON string values so JSON.parse
 *  tolerates model outputs that forget to escape control chars. */
function escapeJsonStringControls(s: string): string {
  let out = '';
  let inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { out += c; esc = false; continue; }
    if (c === '\\') { out += c; esc = true; continue; }
    if (c === '"') { inStr = !inStr; out += c; continue; }
    if (inStr) {
      if (c === '\n') { out += '\\n'; continue; }
      if (c === '\r') { out += '\\r'; continue; }
      if (c === '\t') { out += '\\t'; continue; }
    }
    out += c;
  }
  return out;
}

/** Aggressively extract a JSON object from any string */
function extractJSON(raw: string): any {
  if (!raw || typeof raw !== 'string') return null;
  let s = stripFences(raw);
  // Try direct parse
  try { const p = JSON.parse(s); if (p && typeof p === 'object') return p; } catch {}
  // Try with literal-newline rescue (most common model-output failure mode)
  try { const p = JSON.parse(escapeJsonStringControls(s)); if (p && typeof p === 'object') return p; } catch {}
  // Try extracting { ... } from the string
  const i = s.indexOf('{'), j = s.lastIndexOf('}');
  if (i >= 0 && j > i) {
    const slice = s.slice(i, j + 1);
    try { const p = JSON.parse(slice); if (p && typeof p === 'object') return p; } catch {}
    try { const p = JSON.parse(escapeJsonStringControls(slice)); if (p && typeof p === 'object') return p; } catch {}
  }
  // Try double-parse (content was double-stringified)
  try { const inner = JSON.parse(s); if (typeof inner === 'string') return extractJSON(inner); } catch {}
  // Try repairing truncated JSON (model hit token limit mid-response)
  const repaired = repairJSON(s);
  if (repaired && Object.keys(repaired).length > 0) return repaired;
  const repairedEsc = repairJSON(escapeJsonStringControls(s));
  if (repairedEsc && Object.keys(repairedEsc).length > 0) return repairedEsc;
  return null;
}

/** Format a key from camelCase to readable label. */
function fmtKey(k: string): string {
  return k.replace(/([A-Z])/g, ' $1').trim().replace(/^./, (c) => c.toUpperCase());
}

/** Best-effort JSON parse — returns parsed value if the string is valid JSON,
 *  null otherwise. Used to heal stringified-object values that snuck through
 *  schema validation or are coming back from stale localStorage. */
function tryParseJsonValue(s: string): any {
  if (typeof s !== 'string') return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/** Defensive text coercion — guarantees a renderable React child even when
 *  the model returns an object/array where we expected a string. Without
 *  this guard, React throws "Objects are not valid as a React child" and
 *  the whole panel goes blank. */
function safeText(v: any): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(safeText).filter(Boolean).join(', ');
  if (typeof v === 'object') {
    // Object dropped where text was expected — turn it into a readable
    // "key: value, key: value" line instead of crashing.
    return Object.entries(v)
      .map(([k, vv]) => `${k}: ${safeText(vv)}`)
      .join(' • ');
  }
  return String(v);
}

/** Render a leaf that *might* be an object — if it is, recurse through
 *  ValueRenderer (which handles structure properly); if it's primitive,
 *  render as text. Use this anywhere a model field could legally vary
 *  between string and object. */
function SafeLeaf({ val, className, style }: { val: any; className?: string; style?: React.CSSProperties }) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') {
    return <div className={className} style={style}><ValueRenderer val={val} /></div>;
  }
  return <span className={className} style={style}>{safeText(val)}</span>;
}

/** Recursively render any value: string, array (of strings or objects), or object.
 *  This is the catch-all that prevents `[object Object]` from ever leaking
 *  into the UI when nested arrays contain objects. */
function ValueRenderer({ val, depth = 0 }: { val: any; depth?: number }): JSX.Element | null {
  if (val === null || val === undefined) return null;

  if (typeof val === 'string') {
    // Heal stringified JSON — if the value is a JSON-shaped string, parse and recurse
    const parsed = tryParseJsonValue(val);
    if (parsed !== null) return <ValueRenderer val={parsed} depth={depth} />;
    return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{val}</span>;
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{String(val)}</span>;
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return null;
    // Array of primitives — comma-join for inline display
    const allPrimitive = val.every((x) => typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean');
    if (allPrimitive) {
      return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{val.map(String).join(', ')}</span>;
    }
    // Array of objects — render each as a nested card
    return (
      <ul className={`space-y-2 ${depth === 0 ? 'mt-1' : 'mt-1 ml-2'}`}>
        {val.map((item, i) => (
          <li key={i} className="rounded-md p-3" style={{ background: depth === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <ValueRenderer val={item} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }

  if (typeof val === 'object') {
    const entries = Object.entries(val).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0));
    if (entries.length === 0) return null;
    return (
      <div className="space-y-2">
        {entries.map(([k, v]) => {
          const isComplex = (Array.isArray(v) && v.some((x) => typeof x === 'object' && x !== null)) || (typeof v === 'object' && v !== null && !Array.isArray(v));
          if (isComplex) {
            return (
              <div key={k}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{fmtKey(k)}</div>
                <ValueRenderer val={v} depth={depth + 1} />
              </div>
            );
          }
          return (
            <p key={k} className="text-sm leading-relaxed">
              <strong className="text-xs uppercase tracking-wider mr-1.5" style={{ color: 'var(--text-muted)' }}>{fmtKey(k)}:</strong>
              <ValueRenderer val={v} depth={depth + 1} />
            </p>
          );
        })}
      </div>
    );
  }

  return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{String(val)}</span>;
}

/** Generic renderer for any key-value pair — wraps ValueRenderer in a labeled card. */
function GenericField({ label, val }: { label: string; val: any }) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--cam-primary)' }}>{fmtKey(label)}</div>
      <ValueRenderer val={val} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// LeetCode-inspired primitives — uses LC's actual palette hardcoded so the
// visual language comes through regardless of the active app theme.
// ─────────────────────────────────────────────────────────────────────────

/** LC + Camora palette — landing-page tones blended with LC's section colors.
 *  Cream `paper` is the book-style page; each content type gets a tinted
 *  card on top of it instead of a grey wall. Avoid theme tokens on purpose. */
const LC = {
  // Difficulty (LC's exact tones)
  easy:   { fg: '#00B8A3', bg: 'rgba(0,184,163,0.10)',  border: 'rgba(0,184,163,0.40)' },
  medium: { fg: '#FFB800', bg: 'rgba(255,184,0,0.10)',  border: 'rgba(255,184,0,0.40)' },
  hard:   { fg: '#FF375F', bg: 'rgba(255,55,95,0.10)',  border: 'rgba(255,55,95,0.40)' },

  // Section accents — LC-inspired, paired with Camora navy/gold for brand fit
  navy:        '#26619C',   // Camora primary
  gold:        '#C9A227',   // Camora gold-leaf
  problem:     '#0EA5E9',   // LC blue (description tab)
  examples:    '#00B8A3',   // LC teal
  approach:    '#A855F7',   // LC purple
  edge:        '#FF375F',   // LC red
  mistake:     '#F59E0B',   // LC amber
  followup:    '#0EA5E9',
  // System-design specific accents
  requirements:  '#0EA5E9',  // blue
  capacity:      '#A855F7',  // purple
  architecture:  '#00B8A3',  // teal
  database:      '#F59E0B',  // amber
  api:           '#16A34A',  // green
  tradeoffs:     '#EC4899',  // pink/red
  scalability:   '#6366F1',  // indigo
  clarify:       '#0EA5E9',  // blue (same as problem family)

  // STAR
  star: {
    situation: '#00B8A3',
    task:      '#0EA5E9',
    action:    '#F59E0B',
    result:    '#16A34A',
  },

  // Code editor (VSCode-dark — pops on any theme)
  codeBg:    '#1E1E1E',
  codeFg:    '#D4D4D4',
  codeHdr:   '#2D2D2D',
  codeMuted: '#9CA3AF',

  // LC-landing-style paper. LC uses CLEAN WHITE bodies in light mode and
  // a near-black charcoal (#0E1116) in dark mode. We use translucent rgba
  // so it reads on either theme without a grey wall.
  paper:       'rgba(255,255,255,0.65)',          // white paper in light, soft over-tone in dark
  paperBorder: 'rgba(38,97,156,0.18)',            // soft navy border (Camora primary tinted)
  pageRule:    'rgba(38,97,156,0.22)',
  // Bright section-color accents — LC landing uses solid, saturated heads:
  //   Start Exploring (teal), Questions Community Contests (blue),
  //   Companies & Candidates (amber). We mirror that cadence.
};

/** Tinted card surface — strong enough to be visible on white-paper or
 *  dark-paper without grey walls. Used everywhere instead of bg-elevated. */
function paperCard(accent: string) {
  return {
    background: `linear-gradient(180deg, ${accent}0F 0%, ${accent}05 100%)`,
    border: `1px solid ${accent}40`,
    boxShadow: `0 1px 0 ${accent}10`,
  };
}

/** LC-landing-style "hero header" used at the top of every question.
 *  Solid colored band, bright label text. */
function sectionHero(accent: string) {
  return {
    background: `${accent}14`,
    borderBottom: `2px solid ${accent}`,
  };
}

/** Difficulty pill — Easy/Medium/Hard with LC's exact colors. */
function DifficultyPill({ value }: { value: string }) {
  const v = String(value).toLowerCase();
  const senior = ['senior', 'staff', 'principal'].some((s) => v.includes(s));
  const tone = v.includes('hard') || senior
    ? LC.hard
    : v.includes('medium') || v.includes('mid')
      ? LC.medium
      : LC.easy;
  return (
    <span
      className="inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full"
      style={{ background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}` }}
    >
      {value}
    </span>
  );
}

/** Tag chip — subtle pill for category/topic/value. */
function TagChip({ label, color = LC.problem }: { label: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded"
      style={{ background: `${color}1A`, color, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  );
}

/** Complexity badge — O(n), O(log n) — LC's time/space pill, dark mono on any theme. */
function ComplexityBadge({ kind, value }: { kind: 'time' | 'space'; value: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded"
      style={{ background: LC.codeBg, color: LC.codeFg, border: `1px solid ${LC.codeHdr}` }}
    >
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: LC.codeMuted }}>
        {kind === 'time' ? 'TIME' : 'SPACE'}
      </span>
      <span style={{ color: '#FFFFFF' }}>{value}</span>
    </span>
  );
}

/** Code block — VSCode-dark editor look with a file-tab header. */
function CodeBlock({ code, language = 'code' }: { code: string; language?: string }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${LC.codeHdr}` }}>
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ background: LC.codeHdr, borderBottom: `1px solid ${LC.codeHdr}` }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: '#FF5F56' }} />
            <span className="w-2 h-2 rounded-full" style={{ background: '#FFBD2E' }} />
            <span className="w-2 h-2 rounded-full" style={{ background: '#27C93F' }} />
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: LC.codeMuted }}>
            {language}
          </span>
        </div>
        <span className="text-[10px] font-mono" style={{ color: LC.codeMuted }}>{code.split('\n').length} LOC</span>
      </div>
      <pre
        className="px-4 py-3 text-[12.5px] leading-relaxed overflow-x-auto"
        style={{ background: LC.codeBg, color: LC.codeFg, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** LC-style example block — green-tinted card with mono Input/Output/Explanation. */
function ExampleBlock({ example, index }: { example: any; index: number }) {
  if (!example || typeof example !== 'object') return null;
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: `${LC.examples}08`, border: `1px solid ${LC.examples}33` }}
    >
      <div
        className="px-3 py-1.5"
        style={{ background: `${LC.examples}14`, borderBottom: `1px solid ${LC.examples}33` }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: LC.examples }}>
          Example {index + 1}
        </span>
      </div>
      <div className="px-3 py-2.5 space-y-1.5 text-xs font-mono">
        {example.input && (
          <div className="leading-relaxed">
            <span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.examples }}>Input:</span>
            <span style={{ color: 'var(--text-primary)' }}>{example.input}</span>
          </div>
        )}
        {example.output && (
          <div className="leading-relaxed">
            <span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.examples }}>Output:</span>
            <span style={{ color: 'var(--text-primary)' }}>{example.output}</span>
          </div>
        )}
        {example.explanation && (
          <p className="text-xs mt-1.5 leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.examples }}>Explanation:</span>
            {example.explanation}
          </p>
        )}
      </div>
    </div>
  );
}

/** LC-style approach card — purple-accented header, complexity pills, code editor. */
function ApproachCard({ approach, index }: { approach: any; index: number }) {
  if (!approach || typeof approach !== 'object') return null;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: `${LC.approach}06`, border: `1px solid ${LC.approach}33` }}>
      <div
        className="px-4 py-3"
        style={{ background: `${LC.approach}10`, borderBottom: `1px solid ${LC.approach}33` }}
      >
        <div className="flex items-baseline gap-2 flex-wrap mb-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: `${LC.approach}20`, color: LC.approach }}
          >
            Approach {index + 1}
          </span>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{approach.name}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {approach.timeComplexity && <ComplexityBadge kind="time" value={approach.timeComplexity} />}
          {approach.spaceComplexity && <ComplexityBadge kind="space" value={approach.spaceComplexity} />}
        </div>
        {approach.description && (
          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{approach.description}</p>
        )}
      </div>
      <div className="px-4 py-3 space-y-3">
        {approach.code && <CodeBlock code={approach.code} language={approach.language || 'python'} />}
        {Array.isArray(approach.lineByLine) && approach.lineByLine.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: LC.approach }}>Line-by-Line</div>
            <div className="space-y-1">
              {approach.lineByLine.filter((l: any) => l && typeof l === 'object').map((l: any, i: number) => (
                <div key={i} className="grid gap-2 text-xs" style={{ gridTemplateColumns: 'minmax(0, 0.55fr) minmax(0, 1fr)' }}>
                  <code
                    className="font-mono px-2 py-1 rounded text-[11.5px]"
                    style={{ background: LC.codeBg, color: LC.codeFg, border: `1px solid ${LC.codeHdr}` }}
                  >
                    {l.line}
                  </code>
                  <span className="leading-relaxed pt-1" style={{ color: 'var(--text-secondary)' }}>{l.explanation}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** LC-landing-style section heading — bold colored typography like their
 *  homepage section heads ("Start Exploring", "Companies & Candidates").
 *  Left hexagon dot + uppercase title in the section's accent color. */
function SectionHeading({ label, color = LC.problem }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      {/* Hexagon-ish dot — LC's iconography uses geometric badges */}
      <span
        className="block flex-shrink-0"
        style={{
          width: 10,
          height: 10,
          background: color,
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
        }}
      />
      <h4 className="text-[13px] font-extrabold tracking-tight" style={{ color }}>
        {label}
      </h4>
      <span className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color}50 0%, transparent 100%)` }} />
    </div>
  );
}

/** Rich content renderer for prep sections — accepts string or object.
 *  Renders known fields with custom layouts, then catches ALL remaining fields generically.
 *  Nothing is ever silently dropped. */
function PrepContentRenderer({ content }: { content: any }) {
  let data: any = null;
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    data = content;
  } else if (typeof content === 'string') {
    data = extractJSON(content);
    if (!data) {
      const text = content.replace(/^"|"$/g, '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
      return <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</div>;
    }
  }
  if (!data) return <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No content available</div>;

  // Last-line defence — cached data from before the parser was hardened can
  // still arrive with `summary` holding the entire raw JSON. If it looks
  // like JSON, parse it one more time and merge so we render structured
  // fields (companyInsights, questions, etc.) instead of dumping a wall
  // of text into the Summary block.
  if (data && typeof data === 'object' && typeof data.summary === 'string') {
    const s = data.summary.trim();
    if (s.startsWith('{') && /["']\s*:/.test(s)) {
      const reparsed = extractJSON(s);
      if (reparsed && typeof reparsed === 'object' && Object.keys(reparsed).length >= 1) {
        data = { ...data, ...reparsed };
      }
    }
  }

  // Track which keys are rendered by specific renderers
  const rendered = new Set<string>();

  const mark = (...keys: string[]) => keys.forEach(k => rendered.add(k));

  // Build elements
  const els: JSX.Element[] = [];

  // Summary — book-style hero block
  if (data.summary) {
    mark('summary');
    const summaryStr = String(data.summary).trim();
    const looksLikeJson = summaryStr.startsWith('{') && /["']\s*:/.test(summaryStr) && summaryStr.length > 80;
    if (looksLikeJson) {
      els.push(
        <div key="summary" className="rounded-xl p-4" style={paperCard(LC.medium.fg)}>
          <SectionHeading label="Generation Incomplete" color={LC.medium.fg} />
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            The model returned malformed output. Click <strong style={{ color: LC.medium.fg }}>Re-generate</strong> above to retry.
          </p>
        </div>
      );
    } else {
      els.push(
        <div
          key="summary"
          className="rounded-xl p-5 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${LC.navy}0F 0%, ${LC.gold}08 100%)`,
            border: `1px solid ${LC.navy}30`,
            boxShadow: `0 1px 0 ${LC.gold}30`,
          }}
        >
          <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: `linear-gradient(180deg, ${LC.gold} 0%, ${LC.navy} 100%)` }} />
          <SectionHeading label="Summary" color={LC.navy} />
          <p className="text-[15px] leading-[1.65]" style={{ color: 'var(--text-primary)' }}>{data.summary}</p>
        </div>
      );
    }
  }

  // Pitch Sections
  if (data.pitchSections || data.chSections) {
    mark('pitchSections', 'chSections');
    const sections = data.pitchSections || data.chSections;
    els.push(
      <div key="pitch" className="space-y-4">
        {sections.map((s: any, i: number) => (
          <div key={i} className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--cam-primary)', color: '#FFFFFF' }}>{i + 1}</span>
            <div className="flex-1 pt-0.5">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {(s.bullets || []).map((b: string, j: number) => (
                  <span key={j}>{j === 0 ? <><strong style={{ color: 'var(--cam-primary)' }}>{String(b).split(' ').slice(0, 3).join(' ')}</strong> {String(b).split(' ').slice(3).join(' ')}</> : ` ${b}`}</span>
                ))}
                {s.title && !s.bullets?.length && <>{s.title}</>}
              </p>
              {s.duration && <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{s.duration}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Company Insights — amber accent (LC landing's "Companies & Candidates" tone)
  if (data.companyInsights) {
    mark('companyInsights');
    const ci = data.companyInsights;
    els.push(
      <div key="insights" className="rounded-xl p-4" style={paperCard(LC.medium.fg)}>
        <SectionHeading label="Company Insights" color={LC.medium.fg} />
        {typeof ci === 'string' ? (
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>{ci}</p>
        ) : Array.isArray(ci) ? (
          <ValueRenderer val={ci} />
        ) : typeof ci === 'object' ? (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {Object.entries(ci).map(([k, v]) => (
              <div key={k} className="rounded-md p-2.5" style={{ background: 'rgba(255,184,0,0.05)', border: 'rgba(255,184,0,0.15) 1px solid' }}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.medium.fg }}>{fmtKey(k)}</div>
                <div><ValueRenderer val={v} /></div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{String(ci)}</p>
        )}
      </div>
    );
  }

  // Questions — LeetCode-inspired card layout
  if (data.questions?.length > 0) {
    mark('questions');
    els.push(
      <div key="questions" className="space-y-5">
        {data.questions.map((q: any, i: number) => {
          const title = q.question || q.title || q.text || q.scenario || `Question ${i + 1}`;
          const qRendered = new Set(['question', 'title', 'text', 'scenario']);

          // Tag chips — extract metadata that should appear as small pills
          const chips: { label: string; color: string }[] = [];
          if (q.frequency) { qRendered.add('frequency'); chips.push({ label: q.frequency, color: 'var(--cam-primary)' }); }
          if (q.category) { qRendered.add('category'); chips.push({ label: q.category, color: 'var(--accent)' }); }
          if (q.companyValue) { qRendered.add('companyValue'); chips.push({ label: q.companyValue, color: 'var(--success)' }); }
          if (q.timeLimit) { qRendered.add('timeLimit'); chips.push({ label: q.timeLimit, color: 'var(--warning-text)' }); }

          return (
            <article
              key={i}
              className="rounded-xl overflow-hidden"
              style={{
                border: `1px solid ${LC.paperBorder}`,
                background: LC.paper,
                boxShadow: `0 1px 0 ${LC.pageRule}, 0 8px 24px -16px rgba(20,20,40,0.18)`,
              }}
            >
              {/* ── LC-style header: gold accent strip + number + title + difficulty pill + chips ── */}
              <header
                className="px-5 pt-4 pb-3 relative"
                style={{
                  borderBottom: `1px solid ${LC.pageRule}`,
                  background: `linear-gradient(180deg, ${LC.gold}10 0%, transparent 100%)`,
                }}
              >
                <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: `linear-gradient(180deg, ${LC.gold} 0%, ${LC.navy} 100%)` }} />
                <div className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg text-[14px] font-bold font-mono"
                    style={{
                      background: LC.navy,
                      color: '#FFFFFF',
                      boxShadow: `0 2px 6px ${LC.navy}40`,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[16px] font-bold leading-snug tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      {q.difficulty && <DifficultyPill value={q.difficulty} />}
                      {chips.map((c, ci) => <TagChip key={ci} label={c.label} color={c.color} />)}
                    </div>
                  </div>
                </div>
                {/* Inline metadata strip — small italic context lines */}
                {(q.whyTheyAsk || q.whyThisCompanyAsks || q.whatTheyTest || q.companyConnection) && (
                  <div className="mt-3 pl-10 space-y-1">
                    {q.whyTheyAsk && (qRendered.add('whyTheyAsk'),
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: 'var(--warning-text)' }}>Why asked:</span>
                        {q.whyTheyAsk}
                      </p>
                    )}
                    {q.whyThisCompanyAsks && (qRendered.add('whyThisCompanyAsks'),
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: 'var(--warning-text)' }}>Why asked:</span>
                        {q.whyThisCompanyAsks}
                      </p>
                    )}
                    {q.whatTheyTest && (qRendered.add('whatTheyTest'),
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: 'var(--warning-text)' }}>What they test:</span>
                        {q.whatTheyTest}
                      </p>
                    )}
                    {q.companyConnection && (qRendered.add('companyConnection'),
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: 'var(--cam-primary)' }}>Connect to:</span>
                        {q.companyConnection}
                      </p>
                    )}
                  </div>
                )}
              </header>

              {/* ── Body ── */}
              <div className="px-5 py-4 space-y-4">
                {/* Problem statement — blue rail, like LC's "Description" tab */}
                {(q.problemStatement || q.description) && (() => {
                  qRendered.add('problemStatement', 'description');
                  const text = q.problemStatement || q.description;
                  return (
                    <div>
                      <SectionHeading label="Problem" color={LC.problem} />
                      <div className="rounded-lg p-3" style={{ background: `${LC.problem}06`, border: `1px solid ${LC.problem}25` }}>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Suggested answer (HR / hiring-manager / behavioral non-STAR) */}
                {!q.situation && !q.task && !q.action && !q.result && (q.answer || q.sampleAnswer || q.suggestedAnswer) && (() => {
                  qRendered.add('answer', 'sampleAnswer', 'suggestedAnswer');
                  const text = q.answer || q.sampleAnswer || q.suggestedAnswer;
                  return (
                    <div>
                      <SectionHeading label="Suggested Answer" color={LC.examples} />
                      <div className="rounded-lg p-3" style={{ background: `${LC.examples}06`, border: `1px solid ${LC.examples}25` }}>
                        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{text}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* STAR format — behavioral */}
                {(q.situation || q.task || q.action || q.result) && (() => {
                  qRendered.add('situation', 'task', 'action', 'result');
                  const stars = [
                    { key: 'situation', label: 'Situation', accent: '#16A34A' },
                    { key: 'task',      label: 'Task',      accent: '#2563EB' },
                    { key: 'action',    label: 'Action',    accent: '#D97706' },
                    { key: 'result',    label: 'Result',    accent: '#059669' },
                  ];
                  return (
                    <div>
                      <SectionHeading label="STAR Response" />
                      <div className="space-y-2">
                        {stars.map((s) => q[s.key] && (
                          <div key={s.key} className="rounded-lg p-3 flex gap-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: `3px solid ${s.accent}` }}>
                            <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider" style={{ color: s.accent, minWidth: 64 }}>{s.label}</span>
                            <span className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{Array.isArray(q[s.key]) ? q[s.key].join('\n') : q[s.key]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Examples — LC-style monospace blocks */}
                {Array.isArray(q.examples) && q.examples.length > 0 && (() => {
                  qRendered.add('examples');
                  return (
                    <div>
                      <SectionHeading label="Examples" />
                      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                        {q.examples.map((ex: any, ei: number) => <ExampleBlock key={ei} example={ex} index={ei} />)}
                      </div>
                    </div>
                  );
                })()}

                {/* Approaches — LC-style with complexity pills */}
                {Array.isArray(q.approaches) && q.approaches.length > 0 && (() => {
                  qRendered.add('approaches');
                  return (
                    <div>
                      <SectionHeading label="Approaches" />
                      <div className="space-y-3">
                        {q.approaches.map((ap: any, ai: number) => <ApproachCard key={ai} approach={ap} index={ai} />)}
                      </div>
                    </div>
                  );
                })()}

                {/* Standalone code example (techstack questions) */}
                {q.codeExample && !q.approaches && (() => {
                  qRendered.add('codeExample');
                  return (
                    <div>
                      <SectionHeading label="Code Example" />
                      <CodeBlock code={q.codeExample} language={q.language || 'code'} />
                    </div>
                  );
                })()}

                {/* RRK structuredAnswer */}
                {q.structuredAnswer && typeof q.structuredAnswer === 'object' && (() => {
                  qRendered.add('structuredAnswer');
                  const sa = q.structuredAnswer;
                  const fields = ['setup', 'technicalDepth', 'tradeoffs', 'impact', 'companyRelevance'];
                  return (
                    <div>
                      <SectionHeading label="Structured Answer" color="var(--success)" />
                      <div className="space-y-2">
                        {fields.filter((f) => sa[f]).map((f) => (
                          <div key={f} className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--cam-primary)' }}>{fmtKey(f)}</div>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{sa[f]}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Edge cases — red-tinted alert */}
                {Array.isArray(q.edgeCases) && q.edgeCases.length > 0 && (() => {
                  qRendered.add('edgeCases');
                  return (
                    <div>
                      <SectionHeading label="Edge Cases" color="var(--danger)" />
                      <div className="space-y-1.5">
                        {q.edgeCases.filter((e: any) => e && typeof e === 'object').map((e: any, ei: number) => (
                          <div key={ei} className="rounded-lg p-3 text-xs" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            {e.case && <div className="font-bold mb-1" style={{ color: 'var(--danger)' }}>{e.case}</div>}
                            {e.input && <div className="font-mono mb-1" style={{ color: 'var(--text-primary)' }}>{e.input}</div>}
                            {e.explanation && <p style={{ color: 'var(--text-secondary)' }}>{e.explanation}</p>}
                            {e.expectedOutput && <div className="font-mono mt-1" style={{ color: 'var(--text-muted)' }}>→ {e.expectedOutput}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Common mistakes — warning-tinted */}
                {Array.isArray(q.commonMistakes) && q.commonMistakes.length > 0 && (() => {
                  qRendered.add('commonMistakes');
                  return (
                    <div>
                      <SectionHeading label="Common Mistakes" color="var(--warning-text)" />
                      <ul className="space-y-1">
                        {q.commonMistakes.map((m: any, mi: number) => (
                          <li key={mi} className="text-xs flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--warning-text)' }}>•</span>
                            <span>{typeof m === 'string' ? m : JSON.stringify(m)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}

                {/* Follow-ups */}
                {(Array.isArray(q.followUpQuestions) || Array.isArray(q.followUps) || q.followUp) && (() => {
                  qRendered.add('followUpQuestions', 'followUps', 'followUp');
                  const items = q.followUpQuestions || q.followUps || (q.followUp ? [q.followUp] : []);
                  return (
                    <div>
                      <SectionHeading label="Follow-ups" color="var(--accent)" />
                      <ul className="space-y-1">
                        {items.map((fu: any, fi: number) => (
                          <li key={fi} className="text-xs flex gap-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--accent)' }}>↳</span>
                            <span>{typeof fu === 'string' ? fu : (fu.question || JSON.stringify(fu))}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}

                {/* Tips */}
                {q.tips && (qRendered.add('tips'),
                  <div className="rounded-lg p-3 text-xs leading-relaxed" style={paperCard(LC.gold)}>
                    <span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.gold }}>Tip:</span>
                    <span style={{ color: 'var(--text-primary)' }}>{Array.isArray(q.tips) ? q.tips.join(' ') : q.tips}</span>
                  </div>
                )}

                {/* ── SYSTEM DESIGN TYPED RENDERERS ── */}

                {/* Clarifying Questions */}
                {Array.isArray(q.clarifyingQuestions) && q.clarifyingQuestions.length > 0 && (() => {
                  qRendered.add('clarifyingQuestions');
                  return (
                    <div>
                      <SectionHeading label="Clarifying Questions" color={LC.clarify} />
                      <div className="rounded-lg p-3" style={paperCard(LC.clarify)}>
                        <ul className="space-y-1.5">
                          {q.clarifyingQuestions.map((cq: any, ci: number) => (
                            <li key={ci} className="text-sm leading-relaxed flex gap-2" style={{ color: 'var(--text-primary)' }}>
                              <span style={{ color: LC.clarify }}>?</span><span>{safeText(cq)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })()}

                {/* Requirements (functional + non-functional) */}
                {q.requirements && typeof q.requirements === 'object' && (() => {
                  qRendered.add('requirements');
                  const r = q.requirements;
                  const fn = Array.isArray(r.functional) ? r.functional : [];
                  const nfn = Array.isArray(r.nonFunctional) ? r.nonFunctional : [];
                  return (
                    <div>
                      <SectionHeading label="Requirements" color={LC.requirements} />
                      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                        {fn.length > 0 && (
                          <div className="rounded-lg p-3" style={paperCard(LC.requirements)}>
                            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: LC.requirements }}>Functional</div>
                            <ul className="space-y-1.5">
                              {fn.map((f: any, fi: number) => (
                                <li key={fi} className="text-sm leading-relaxed flex gap-2" style={{ color: 'var(--text-primary)' }}>
                                  <span style={{ color: LC.requirements }}>•</span><span>{safeText(f)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {nfn.length > 0 && (
                          <div className="rounded-lg p-3" style={paperCard(LC.scalability)}>
                            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: LC.scalability }}>Non-Functional</div>
                            <ul className="space-y-1.5">
                              {nfn.map((f: any, fi: number) => (
                                <li key={fi} className="text-sm leading-relaxed flex gap-2" style={{ color: 'var(--text-primary)' }}>
                                  <span style={{ color: LC.scalability }}>•</span><span>{safeText(f)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Capacity Estimation */}
                {q.capacityEstimation && typeof q.capacityEstimation === 'object' && (() => {
                  qRendered.add('capacityEstimation');
                  const c = q.capacityEstimation;
                  const assumptions = Array.isArray(c.assumptions) ? c.assumptions : [];
                  const calculations = Array.isArray(c.calculations) ? c.calculations : [];
                  return (
                    <div>
                      <SectionHeading label="Capacity Estimation" color={LC.capacity} />
                      <div className="rounded-lg overflow-hidden" style={paperCard(LC.capacity)}>
                        {assumptions.length > 0 && (
                          <div className="px-3 py-2.5 border-b" style={{ borderColor: `${LC.capacity}25` }}>
                            <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: LC.capacity }}>Assumptions</div>
                            <ul className="space-y-1">
                              {assumptions.map((a: any, ai: number) => (
                                <li key={ai} className="text-sm flex gap-2" style={{ color: 'var(--text-primary)' }}>
                                  <span style={{ color: LC.capacity }}>›</span><span>{safeText(a)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {calculations.length > 0 && (
                          <div className="px-3 py-2.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: LC.capacity }}>Calculations</div>
                            <table className="w-full text-xs">
                              <thead><tr style={{ color: LC.capacity }}>
                                <th className="text-left font-bold uppercase text-[9px] tracking-wider pb-1">Metric</th>
                                <th className="text-left font-bold uppercase text-[9px] tracking-wider pb-1">Formula</th>
                                <th className="text-right font-bold uppercase text-[9px] tracking-wider pb-1">Result</th>
                              </tr></thead>
                              <tbody>
                                {calculations.filter((cl: any) => cl && typeof cl === 'object').map((cl: any, ci: number) => (
                                  <tr key={ci} style={{ borderTop: `1px solid ${LC.capacity}15` }}>
                                    <td className="py-1.5 pr-2 font-medium" style={{ color: 'var(--text-primary)' }}>{safeText(cl.metric)}</td>
                                    <td className="py-1.5 pr-2 font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>{safeText(cl.calculation)}</td>
                                    <td className="py-1.5 font-mono font-bold text-right" style={{ color: LC.capacity }}>{safeText(cl.result)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Architecture */}
                {q.architecture && typeof q.architecture === 'object' && (() => {
                  qRendered.add('architecture');
                  const a = q.architecture;
                  const components = Array.isArray(a.components) ? a.components : [];
                  return (
                    <div>
                      <SectionHeading label="Architecture" color={LC.architecture} />
                      {a.diagramDescription && (
                        <div className="rounded-lg p-3 mb-2" style={paperCard(LC.architecture)}>
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: LC.architecture }}>Overview</div>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{safeText(a.diagramDescription)}</p>
                        </div>
                      )}
                      {components.length > 0 && (
                        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                          {components.filter((c: any) => c && typeof c === 'object').map((c: any, ci: number) => (
                            <div key={ci} className="rounded-lg p-3" style={paperCard(LC.architecture)}>
                              <div className="flex items-baseline justify-between gap-2 mb-1">
                                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{safeText(c.name)}</span>
                                {c.technology && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${LC.architecture}15`, color: LC.architecture }}>{safeText(c.technology)}</span>}
                              </div>
                              {c.responsibility && <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{safeText(c.responsibility)}</p>}
                              {c.whyThisChoice && <p className="text-xs leading-relaxed mt-1.5 italic" style={{ color: 'var(--text-muted)' }}>{safeText(c.whyThisChoice)}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Database Design */}
                {q.databaseDesign && typeof q.databaseDesign === 'object' && (() => {
                  qRendered.add('databaseDesign');
                  const db = q.databaseDesign;
                  return (
                    <div>
                      <SectionHeading label="Database Design" color={LC.database} />
                      <div className="rounded-lg p-3" style={paperCard(LC.database)}>
                        <ValueRenderer val={db} />
                      </div>
                    </div>
                  );
                })()}

                {/* API Design */}
                {Array.isArray(q.apiDesign) && q.apiDesign.length > 0 && (() => {
                  qRendered.add('apiDesign');
                  return (
                    <div>
                      <SectionHeading label="API Design" color={LC.api} />
                      <div className="space-y-2">
                        {q.apiDesign.filter((e: any) => e && typeof e === 'object').map((e: any, ei: number) => (
                          <div key={ei} className="rounded-lg overflow-hidden" style={paperCard(LC.api)}>
                            {e.endpoint && (
                              <div className="px-3 py-1.5 font-mono text-[12px] font-bold" style={{ background: `${LC.api}15`, color: LC.api }}>
                                {safeText(e.endpoint)}
                              </div>
                            )}
                            <div className="px-3 py-2 space-y-1.5 text-xs">
                              {e.request !== undefined && e.request !== null && (
                                <div>
                                  <div className="text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5" style={{ color: LC.api }}>Request</div>
                                  {typeof e.request === 'object' ? (
                                    <pre className="font-mono text-[11px] p-2 rounded overflow-x-auto" style={{ background: `${LC.api}08`, color: 'var(--text-primary)', border: `1px solid ${LC.api}20` }}>{JSON.stringify(e.request, null, 2)}</pre>
                                  ) : (
                                    <div className="font-mono" style={{ color: 'var(--text-primary)' }}>{safeText(e.request)}</div>
                                  )}
                                </div>
                              )}
                              {e.response !== undefined && e.response !== null && (
                                <div>
                                  <div className="text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5" style={{ color: LC.api }}>Response</div>
                                  {typeof e.response === 'object' ? (
                                    <pre className="font-mono text-[11px] p-2 rounded overflow-x-auto" style={{ background: `${LC.api}08`, color: 'var(--text-primary)', border: `1px solid ${LC.api}20` }}>{JSON.stringify(e.response, null, 2)}</pre>
                                  ) : (
                                    <div className="font-mono" style={{ color: 'var(--text-primary)' }}>{safeText(e.response)}</div>
                                  )}
                                </div>
                              )}
                              {e.notes && <p className="text-xs font-sans mt-1 italic" style={{ color: 'var(--text-muted)' }}>{safeText(e.notes)}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Trade-offs */}
                {Array.isArray(q.tradeOffs) && q.tradeOffs.length > 0 && (() => {
                  qRendered.add('tradeOffs');
                  return (
                    <div>
                      <SectionHeading label="Trade-offs" color={LC.tradeoffs} />
                      <div className="space-y-2">
                        {q.tradeOffs.filter((t: any) => t && typeof t === 'object').map((t: any, ti: number) => (
                          <div key={ti} className="rounded-lg p-3" style={paperCard(LC.tradeoffs)}>
                            {t.decision && <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{safeText(t.decision)}</div>}
                            {t.chose && <p className="text-sm" style={{ color: 'var(--text-primary)' }}><span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.tradeoffs }}>Chose:</span>{safeText(t.chose)}</p>}
                            {t.reason && <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}><span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.tradeoffs }}>Reason:</span>{safeText(t.reason)}</p>}
                            {t.alternative && <p className="text-xs leading-relaxed mt-1 italic" style={{ color: 'var(--text-muted)' }}><span className="text-[10px] font-bold uppercase tracking-wider mr-1.5 not-italic" style={{ color: LC.tradeoffs }}>Alt:</span>{safeText(t.alternative)}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Scalability Considerations */}
                {Array.isArray(q.scalabilityConsiderations) && q.scalabilityConsiderations.length > 0 && (() => {
                  qRendered.add('scalabilityConsiderations');
                  return (
                    <div>
                      <SectionHeading label="Scalability" color={LC.scalability} />
                      <div className="space-y-2">
                        {q.scalabilityConsiderations.filter((s: any) => s && typeof s === 'object').map((s: any, si: number) => (
                          <div key={si} className="rounded-lg p-3" style={paperCard(LC.scalability)}>
                            {s.challenge && <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>⚠ {safeText(s.challenge)}</div>}
                            {s.solution && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}><span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.scalability }}>Solution:</span>{safeText(s.solution)}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Catch-all for any remaining question fields */}
                {Object.entries(q).filter(([k]) => !qRendered.has(k) && k !== 'difficulty').map(([k, v]) => (
                  <div key={k}>
                    <SectionHeading label={fmtKey(k)} color={LC.navy} />
                    <div className="rounded-lg p-3" style={paperCard(LC.navy)}>
                      <ValueRenderer val={v} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  // Tech Stack table
  if (data.techStack && Array.isArray(data.techStack)) {
    mark('techStack');
    els.push(
      <div key="techstack">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--cam-primary)' }}>Tech Stack ({data.techStack.length})</div>
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-xs">
            <thead><tr style={{ background: 'var(--bg-elevated)' }}>
              <th className="text-left px-3 py-2 font-bold" style={{ color: 'var(--text-primary)' }}>Technology</th>
              <th className="text-left px-3 py-2 font-bold" style={{ color: 'var(--text-primary)' }}>Category</th>
              <th className="text-left px-3 py-2 font-bold" style={{ color: 'var(--text-primary)' }}>Experience</th>
              <th className="text-left px-3 py-2 font-bold" style={{ color: 'var(--text-primary)' }}>Relevance</th>
            </tr></thead>
            <tbody>{data.techStack.map((t: any, i: number) => (
              <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-3 py-2 font-semibold" style={{ color: 'var(--cam-primary)' }}>{t.technology || t.name}</td>
                <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{t.category}</td>
                <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{t.experience}</td>
                <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{t.relevance}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    );
  }

  // Simple list fields
  const listFields = [
    { key: 'keyTopics', label: 'Key Topics', color: 'var(--cam-primary)', pill: true },
    { key: 'keyPoints', label: 'Key Points', color: 'var(--cam-primary)' },
    { key: 'talkingPoints', label: 'Talking Points', color: 'var(--cam-primary)' },
    { key: 'questionsToAsk', label: 'Questions to Ask', color: 'var(--accent)' },
    { key: 'keyThemes', label: 'Key Themes', color: 'var(--cam-primary)', pill: true },
    { key: 'generalTips', label: 'General Tips', color: 'var(--accent)' },
    { key: 'ascendTips', label: 'Tips', color: 'var(--accent)' },
    { key: 'studyTips', label: 'Study Tips', color: 'var(--accent)' },
  ];
  for (const f of listFields) {
    if (!data[f.key]) continue;
    mark(f.key);
    const items = Array.isArray(data[f.key]) ? data[f.key] : [data[f.key]];
    els.push(
      <div key={f.key}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: f.color }}>{f.label}</div>
        {f.pill ? (
          <div className="flex flex-wrap gap-1.5">{items.map((t: any, i: number) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: `${f.color}10`, color: f.color, border: `1px solid ${f.color}30` }}>{typeof t === 'string' ? t : t?.question || t?.text || JSON.stringify(t)}</span>
          ))}</div>
        ) : (
          <ul className="space-y-1.5">{items.map((t: any, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: f.color }}>•</span>
              {typeof t === 'string' ? t : t?.question || t?.text || JSON.stringify(t)}
            </li>
          ))}</ul>
        )}
      </div>
    );
  }

  // Box fields — companyInsights is intentionally NOT here; it has its own
  // typed renderer above. Adding it would double-render.
  const boxFields = [
    { key: 'tips', label: 'Tips', bg: 'var(--bg-elevated)', border: 'var(--warning)', color: 'var(--warning-text)' },
    { key: 'deliveryTips', label: 'Delivery Tips', bg: 'var(--accent-subtle)', border: 'var(--border)', color: 'var(--cam-primary)' },
    { key: 'recentNews', label: 'Recent News', bg: 'var(--accent-subtle)', border: 'var(--border)', color: 'var(--success)' },
    { key: 'companyContext', label: 'Company Context', bg: 'var(--bg-elevated)', border: 'var(--border)', color: 'var(--cam-primary)' },
    { key: 'companyTechContext', label: 'Company Tech Context', bg: 'var(--bg-elevated)', border: 'var(--border)', color: 'var(--cam-primary)' },
  ];
  for (const f of boxFields) {
    if (!data[f.key] || rendered.has(f.key)) continue;
    mark(f.key);
    const val = data[f.key];
    els.push(
      <div key={f.key} className="rounded-lg p-3" style={{ background: f.bg, border: `1px solid ${f.border}` }}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: f.color }}>{f.label}</div>
        {Array.isArray(val) ? (
          <ul className="space-y-1">{val.map((t: string, i: number) => <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>• {t}</li>)}</ul>
        ) : typeof val === 'string' ? (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{val}</p>
        ) : (
          <div className="space-y-1">{Object.entries(val).map(([k, v]) => (
            <p key={k} className="text-sm"><strong className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>{k.replace(/([A-Z])/g, ' $1').trim()}: </strong><span style={{ color: 'var(--text-secondary)' }}>{typeof v === 'string' ? v : Array.isArray(v) ? (v as string[]).join(', ') : JSON.stringify(v)}</span></p>
          ))}</div>
        )}
      </div>
    );
  }

  // Abbreviations
  if (data.abbreviations?.length > 0) {
    mark('abbreviations');
    els.push(
      <div key="abbr">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Abbreviations</div>
        <div className="flex flex-wrap gap-1.5">{data.abbreviations.map((a: any, i: number) => (
          <span key={i} className="text-[10px] px-2 py-1 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <strong>{a.term || a.abbr || a.name}</strong>: {a.definition || a.full || a.meaning}
          </span>
        ))}</div>
      </div>
    );
  }

  // Salary Negotiation
  if (data.salaryNegotiation) {
    mark('salaryNegotiation');
    els.push(<GenericField key="salary" label="Salary Negotiation" val={data.salaryNegotiation} />);
  }

  // CATCH-ALL: Render every remaining field generically — nothing is silently dropped
  const remaining = Object.keys(data).filter(k => !rendered.has(k));
  for (const key of remaining) {
    els.push(<GenericField key={key} label={key} val={data[key]} />);
  }

  return <div className="space-y-4">{els}</div>;
}

function loadPrepData(): PrepData {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (!r) return INITIAL_STATE;
    const data = JSON.parse(r) as PrepData;
    // Clean up any rawContent wrappers from previously cached data
    for (const company of Object.keys(data.data || {})) {
      const sections = data.data[company]?.sections;
      if (sections) {
        for (const key of Object.keys(sections)) {
          sections[key] = formatPrepContent(sections[key]);
        }
      }
    }
    return data;
  } catch { return INITIAL_STATE; }
}
function savePrepData(s: PrepData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

function UploadZone({ label, required, value, fileName, onUpload, onPaste, onClickOverride }: {
  label: string; required?: boolean; value: string; fileName?: string;
  onUpload: (file: File) => void; onPaste: (text: string) => void;
  onClickOverride?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div
      className={`rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[120px] ${dragOver ? 'ring-2 ring-[var(--cam-primary)]' : ''}`}
      style={{ background: value ? 'var(--accent-subtle)' : 'var(--bg-elevated)', border: `1px solid ${value ? 'var(--cam-primary)' : 'var(--border)'}` }}
      onClick={() => { if (onClickOverride) onClickOverride(); else ref.current?.click(); }}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
    >
      <input ref={ref} type="file" accept=".pdf,.docx,.doc,.txt,.md" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      {value ? (
        <>
          <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: 'var(--cam-primary)', color: '#FFFFFF' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--cam-primary)' }}>{fileName || 'Content added'}</span>
          <span className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{value.length.toLocaleString()} characters</span>
        </>
      ) : (
        <>
          <svg className="w-6 h-6 mb-2" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {label}{required && <span style={{ color: 'var(--danger)' }}>*</span>}
          </span>
          <span className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {onClickOverride ? 'Paste URL, text, or upload' : 'Drop or click'}
          </span>
        </>
      )}
    </div>
  );
}

/** Parse JD text into structured sections and render beautifully */
function FormattedJD({ text }: { text: string }) {
  if (!text?.trim()) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No job description added yet.</p>;

  // Detect section headers — lines that look like titles (short, no bullet, often Title Case)
  const SECTION_PATTERNS = [
    /^(about\s+(the\s+)?(company|role|team|position|us))/i,
    /^(what\s+you'?ll?\s+(be\s+)?do(ing)?)/i,
    /^(what\s+we\s+(need|are\s+looking|expect|require|want)\s+to\s+see)/i,
    /^(responsibilities|key\s+responsibilities)/i,
    /^(requirements|qualifications|minimum\s+qualifications)/i,
    /^(preferred|nice\s+to\s+have|bonus|ways?\s+to\s+stand\s+out)/i,
    /^(benefits|perks|compensation|what\s+we\s+offer)/i,
    /^(tech\s+stack|technologies|tools)/i,
    /^(who\s+you\s+are|ideal\s+candidate)/i,
    /^(experience|skills)/i,
  ];

  const isHeader = (line: string): boolean => {
    const t = line.trim();
    if (!t || t.length > 80) return false;
    if (SECTION_PATTERNS.some(p => p.test(t))) return true;
    // Title-case short lines without punctuation at end
    if (t.length < 50 && !t.endsWith('.') && !t.endsWith(',') && !t.startsWith('-') && !t.startsWith('•') && /^[A-Z]/.test(t) && !/^\d/.test(t)) {
      const words = t.split(/\s+/);
      if (words.length <= 8 && words.filter(w => /^[A-Z]/.test(w)).length >= words.length * 0.5) return true;
    }
    return false;
  };

  // ─── Pre-pass: extract Workday-style metadata (label\nvalue line pairs) ───
  // Workday scrapes emit `locations\nUS, CA, Santa Clara\ntime type\nFull time`
  // — known labels precede their values on the next non-empty line. We pull
  // those out FIRST so the heuristic section parser doesn't misclassify
  // capitalized values as section headers.
  const META_LABELS = [
    /^locations?$/i,
    /^time\s*type$/i,
    /^posted\s*on$/i,
    /^job\s*requisition\s*id$/i,
    /^job\s*id$/i,
    /^req(uisition)?\s*(id|number|#)?$/i,
    /^department$/i,
    /^team$/i,
    /^employment\s*type$/i,
    /^salary(\s*range)?$/i,
    /^compensation$/i,
    /^remote(\s*type)?$/i,
    /^seniority(\s*level)?$/i,
    /^industry$/i,
  ];
  // Filler tokens to drop entirely (Workday button text, breadcrumbs, etc.)
  const FILLER = new Set(['apply', 'apply now', 'save job', 'share', 'back to search']);

  const rawLines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !FILLER.has(l.toLowerCase()));

  // ─── Pass 1: Workday metadata pairs (label → next-line value) ───
  const metadata: { label: string; value: string }[] = [];
  const afterMetadata: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const isLabel = META_LABELS.some((p) => p.test(line));
    if (isLabel && i + 1 < rawLines.length) {
      const value = rawLines[i + 1];
      if (value.length <= 100 && !META_LABELS.some((p) => p.test(value))) {
        metadata.push({ label: line.replace(/^[a-z]/, (c) => c.toUpperCase()), value });
        i += 1;
        continue;
      }
    }
    afterMetadata.push(line);
  }

  // ─── Pass 2: BOILERPLATE EXTRACTION (LINE-LEVEL) ───
  // Run BEFORE the section parser so boilerplate lines never end up
  // misclassified under "Ways to Stand Out", "Requirements", etc. Aggressive
  // keyword matching — any of these substrings (case-insensitive, anywhere
  // in the line) routes the line into its bucket.
  type Bucket = { title: string; keywords: string[]; color?: 'warning' | 'success' | 'muted' };
  const BUCKETS: Bucket[] = [
    {
      title: 'Compensation',
      color: 'success',
      keywords: [
        'base salary', 'salary range', 'salary will be', 'pay range', 'pay transparency',
        'total compensation', 'comp range', 'cash compensation', 'annual salary',
        'starting salary', 'eligible for equity', 'eligible for bonus', 'eligible for benefits',
        'equity and benefits', 'equity & benefits', 'usd for level', 'usd - ', 'usd-',
        'usd per year', '$/year', 'per year (', 'compensation package',
      ],
    },
    {
      title: 'Application',
      color: 'muted',
      keywords: [
        'applications for this', 'application deadline', 'will be accepted until',
        'will be accepted at least until', 'accepted at least until', 'this posting is for',
        'existing vacancy', 'apply by ', 'closing date', 'deadline to apply',
      ],
    },
    {
      title: 'AI & Recruiting',
      color: 'muted',
      keywords: [
        'uses ai tools', 'ai tools in its recruiting', 'ai-assisted screening',
        'ai assisted screening', 'automated screening', 'automated hiring',
        'recruiting processes', 'automated decisions',
      ],
    },
    {
      title: 'Equal Opportunity',
      color: 'muted',
      keywords: [
        'equal opportunity employer', 'fostering a diverse', 'highly value diversity',
        'do not discriminate', 'protected by law', 'affirmative action',
        'reasonable accommodation', 'minorities, women, veterans', 'equal employment',
        'race, religion, color, national origin', 'gender, gender expression',
        'sexual orientation', 'veteran status', 'disability status',
      ],
    },
  ];

  const matchBucket = (line: string): Bucket | null => {
    const lower = line.toLowerCase();
    for (const b of BUCKETS) {
      if (b.keywords.some((k) => lower.includes(k))) return b;
    }
    return null;
  };

  const bucketedLines = new Map<string, string[]>();
  const linesForParser: string[] = [];
  for (const line of afterMetadata) {
    const matched = matchBucket(line);
    if (matched) {
      if (!bucketedLines.has(matched.title)) bucketedLines.set(matched.title, []);
      bucketedLines.get(matched.title)!.push(line);
    } else {
      linesForParser.push(line);
    }
  }

  // ─── Pass 3: Run the heuristic section parser on what's LEFT ───
  // Boilerplate lines are gone, so the parser only sees real JD content.
  const sections: { title: string | null; items: string[] }[] = [];
  let current: { title: string | null; items: string[] } = { title: null, items: [] };

  for (const t of linesForParser) {
    if (isHeader(t)) {
      if (current.items.length > 0 || current.title) sections.push(current);
      current = { title: t, items: [] };
    } else {
      current.items.push(t.replace(/^[-•]\s*/, ''));
    }
  }
  if (current.items.length > 0 || current.title) sections.push(current);

  // Hero promotion (job title)
  let heroTitle: string | null = null;
  if (sections.length > 0 && !sections[0].title && sections[0].items.length === 1 && sections[0].items[0].length < 100) {
    heroTitle = sections[0].items[0];
    sections.shift();
  }
  if (!heroTitle && sections.length > 0 && sections[0].title && sections[0].items.length === 0 && sections[0].title.length < 100) {
    heroTitle = sections[0].title;
    sections.shift();
  }

  // ─── Build final content list: real sections first, then boilerplate buckets ───
  type ContentSection = { title: string | null; items: string[]; color?: 'warning' | 'success' | 'muted' };
  const content: ContentSection[] = [...sections];
  for (const b of BUCKETS) {
    const items = bucketedLines.get(b.title);
    if (items && items.length > 0) {
      content.push({ title: b.title, items, color: b.color });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {heroTitle && (
        <div className="rounded-xl px-5 py-4" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--cam-primary)' }}>
          <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--cam-primary)' }}>{heroTitle}</h3>
        </div>
      )}

      {metadata.length > 0 && (
        <div
          className="rounded-xl px-4 py-3 grid gap-x-6 gap-y-2"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}
        >
          {metadata.map((m, i) => (
            <div key={i} className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {m.label.replace(/^[a-z]/, (c) => c.toUpperCase())}
              </span>
              <span className="text-[13px] truncate" style={{ color: 'var(--text-primary)' }} title={m.value}>{m.value}</span>
            </div>
          ))}
        </div>
      )}

      {content.map((sec, i) => {
        const tone = (sec as any).color as 'warning' | 'success' | 'muted' | undefined;
        const accent =
          tone === 'success' ? '#16A34A' :
          tone === 'warning' ? '#D97706' :
          tone === 'muted'   ? 'var(--text-muted)' :
          'var(--cam-primary)';
        const headerBg =
          tone === 'success' ? 'rgba(34,197,94,0.08)' :
          tone === 'warning' ? 'rgba(245,158,11,0.08)' :
          tone === 'muted'   ? 'var(--bg-elevated)' :
          'var(--accent-subtle)';
        return (
          <div key={i} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            {sec.title && (
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: headerBg, borderBottom: '1px solid var(--border)' }}>
                <span className="block w-1 h-3.5 rounded-sm" style={{ background: accent }} />
                <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: accent }}>{sec.title}</h4>
              </div>
            )}
            <div className="px-4 py-3 flex flex-col gap-1.5">
              {sec.items.map((item, j) => {
                if (i === 0 && !sec.title) {
                  return <p key={j} className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item}</p>;
                }
                return (
                  <div key={j} className="flex gap-2 items-start">
                    <span className="w-1 h-1 rounded-full shrink-0 mt-2" style={{ background: accent }} />
                    <span className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LumoraDocsPanel({ onClose }: { onClose?: () => void }) {
  const { token } = useAuth();
  const [prepData, setPrepData] = useState<PrepData>(loadPrepData);
  const [activeSection, setActiveSection] = useState('input');
  const [generating, setGenerating] = useState(false);
  const [sectionStatus, setSectionStatus] = useState<Record<string, 'pending' | 'generating' | 'done' | 'error'>>({});
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const newCompanyRef = useRef<HTMLInputElement>(null);
  const jdFileInputRef = useRef<HTMLInputElement>(null);
  const [jdModalOpen, setJdModalOpen] = useState(false);
  const [jdUrl, setJdUrl] = useState('');
  const [jdEditText, setJdEditText] = useState('');
  const [jdFetching, setJdFetching] = useState(false);
  const [jdUrlError, setJdUrlError] = useState('');

  const closeJdModal = () => {
    setJdModalOpen(false);
    setJdUrl('');
    setJdEditText('');
    setJdUrlError('');
    setJdFetching(false);
  };

  const fetchJdUrl = async (url: string) => {
    if (!url.trim()) return;
    setJdFetching(true);
    setJdUrlError('');
    try {
      const res = await fetch(`${API_URL}/api/job-analyze/fetch-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({ url: url.trim() }),
      });
      // 404 means the deployed backend doesn't have /api/job-analyze/fetch-text
      // yet — surface that explicitly so the user knows it's a deploy-lag, not
      // a broken URL. Other statuses parse the JSON error message.
      if (res.status === 404) {
        setJdUrlError('JD fetch endpoint is being deployed. Try again in a minute, or paste the JD text below.');
      } else {
        let data: any = null;
        try { data = await res.json(); } catch { /* non-JSON 5xx */ }
        if (!res.ok || !data?.success) {
          setJdUrlError(res.status === 401
            ? 'Please sign in again, then retry.'
            : (data?.error || `Could not fetch this URL (HTTP ${res.status}).`));
        } else {
          setJdEditText(data.text);
        }
      }
    } catch {
      setJdUrlError('Network error. Please try again.');
    } finally {
      setJdFetching(false);
    }
  };

  const pasteJdFromClipboard = async () => {
    setJdUrlError('');
    if (!navigator.clipboard?.readText) {
      setJdUrlError('Clipboard access unavailable. Use Cmd/Ctrl+V to paste.');
      return;
    }
    let clip: string;
    try {
      clip = (await navigator.clipboard.readText()).trim();
    } catch {
      setJdUrlError('Clipboard permission denied. Use Cmd/Ctrl+V to paste.');
      return;
    }
    if (!clip) { setJdUrlError('Clipboard is empty.'); return; }
    if (/^https?:\/\/\S+$/i.test(clip)) {
      setJdUrl(clip);
      await fetchJdUrl(clip);
      return;
    }
    setJdEditText(clip);
  };

  useEffect(() => { savePrepData(prepData); }, [prepData]);

  // Auto-create default company if none exists
  useEffect(() => {
    if (prepData.companies.length === 0) {
      setPrepData(prev => ({
        ...prev,
        companies: ['My Interview'],
        activeCompany: 'My Interview',
        data: { ...prev.data, 'My Interview': { ...EMPTY_DOC } },
      }));
    } else if (!prepData.activeCompany && prepData.companies.length > 0) {
      setPrepData(prev => ({ ...prev, activeCompany: prev.companies[0] }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get active company's doc state
  const state = prepData.activeCompany ? (prepData.data[prepData.activeCompany] || EMPTY_DOC) : EMPTY_DOC;
  const setState = (updater: DocState | ((prev: DocState) => DocState)) => {
    const company = prepData.activeCompany;
    if (!company) return;
    setPrepData(prev => {
      const newState = typeof updater === 'function' ? updater(prev.data[company] || EMPTY_DOC) : updater;
      return { ...prev, data: { ...prev.data, [company]: newState } };
    });
  };

  const addCompany = () => {
    const name = newCompanyName.trim();
    if (!name) return;
    setPrepData(prev => ({
      ...prev,
      companies: [...prev.companies, name],
      activeCompany: name,
      data: { ...prev.data, [name]: { ...EMPTY_DOC } },
    }));
    setNewCompanyName('');
    setShowNewCompany(false);
    setActiveSection('input');
  };

  const switchCompany = (name: string) => {
    setPrepData(prev => ({ ...prev, activeCompany: name }));
    setShowDropdown(false);
    setActiveSection('input');
  };

  const deleteCompany = (name: string) => {
    setPrepData(prev => {
      const newCompanies = prev.companies.filter(c => c !== name);
      const newData = { ...prev.data };
      delete newData[name];
      return { ...prev, companies: newCompanies, activeCompany: newCompanies[0] || null, data: newData };
    });
  };

  const extractFile = useCallback(async (file: File): Promise<string> => {
    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      return await file.text();
    }
    if (!token) return `[Uploaded: ${file.name}]`;
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch(`${API_URL}/api/extract`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        credentials: 'include',
        body: fd,
      });
      if (res.ok) { const d = await res.json(); return d.text || `[${file.name}]`; }
    } catch {}
    return `[Uploaded: ${file.name}]`;
  }, [token]);

  const GENERATE_SECTIONS = ['pitch', 'hr', 'hiring-manager', 'coding', 'system-design', 'behavioral', 'techstack'];

  /** Read SSE stream and return parsed result — pure function, no shared state */
  const readSSE = async (response: Response): Promise<any> => {
    const reader = response.body?.getReader();
    if (!reader) return null;
    const decoder = new TextDecoder();
    let result: any = null;
    let chunks = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(t.slice(6));
          if (parsed.done && parsed.result) result = parsed.result;
          else if (parsed.chunk) chunks += parsed.chunk;
          else if (parsed.error) chunks = `Error: ${parsed.error}`;
        } catch {}
      }
    }
    // Process remaining buffer — done event often lands here
    if (buffer.trim().startsWith('data: ')) {
      try {
        const parsed = JSON.parse(buffer.trim().slice(6));
        if (parsed.done && parsed.result) result = parsed.result;
        else if (parsed.chunk) chunks += parsed.chunk;
      } catch {}
    }

    if (result) return formatPrepContent(result);
    if (chunks) { try { return formatPrepContent(JSON.parse(chunks)); } catch { return formatPrepContent(chunks); } }
    return null;
  };

  /** Generate a single section — fully isolated, no shared state */
  const generateOneSection = useCallback(async (section: string) => {
    if (!state.jd.trim() || !state.resume.trim() || !token) return;
    const label = SIDEBAR_SECTIONS.find(s => s.id === section)?.label || section;
    setSectionStatus(prev => ({ ...prev, [section]: 'generating' }));

    try {
      // Use getAuthHeaders() which reads from the in-memory token store
      // (set by AuthContext from /me) and falls back to the legacy
      // non-httpOnly cookie. credentials:'include' lets the httpOnly cookie
      // ride along as a server-side fallback if the Bearer is rejected.
      const res = await fetch(`${API_URL}/api/ascend/prep/section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({ section, jobDescription: state.jd, resume: state.resume, coverLetter: state.coverLetter, prepMaterial: state.prepMaterials }),
      });

      if (!res.ok) {
        setSectionStatus(prev => ({ ...prev, [section]: 'error' }));
        setState(prev => ({ ...prev, sections: { ...prev.sections, [section]: { summary: `Error ${res.status}: ${res.statusText || 'Failed'}` } } }));
        return;
      }

      const content = await readSSE(res);
      setState(prev => ({ ...prev, sections: { ...prev.sections, [section]: content || { summary: `No content received for ${label}` } } }));
      setSectionStatus(prev => ({ ...prev, [section]: content ? 'done' : 'error' }));
    } catch {
      setSectionStatus(prev => ({ ...prev, [section]: 'error' }));
      setState(prev => ({ ...prev, sections: { ...prev.sections, [section]: { summary: `Error generating ${label}` } } }));
    }
  }, [state.jd, state.resume, state.coverLetter, state.prepMaterials, token]);

  /** Generate ALL sections in parallel — each runs independently */
  const handleGenerate = useCallback(async () => {
    if (!state.jd.trim() || !state.resume.trim() || !token) return;
    setGenerating(true);
    const initStatus: Record<string, 'pending' | 'generating' | 'done' | 'error'> = {};
    GENERATE_SECTIONS.forEach(s => { initStatus[s] = 'generating'; });
    setSectionStatus(initStatus);

    await Promise.allSettled(GENERATE_SECTIONS.map(s => generateOneSection(s)));
    setGenerating(false);
  }, [state.jd, state.resume, state.coverLetter, state.prepMaterials, token, generateOneSection]);

  /** Re-generate a single section */
  const regenerateSection = useCallback(async (section: string) => {
    await generateOneSection(section);
  }, [generateOneSection]);

  const hasRequiredDocs = state.jd.trim().length > 0 && state.resume.trim().length > 0;

  return (
    <div className="h-full flex flex-col sm:flex-row" style={{ background: 'var(--bg-surface)' }}>
      {/* Sidebar */}
      <div className="w-full sm:w-[180px] flex flex-col shrink-0 sm:shrink-0" style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        {/* LeetCode-style sidebar header */}
        <div className="px-3 py-3" style={{ background: 'var(--cam-hero-strip)', borderBottom: '2px solid var(--cam-gold-leaf)' }}>
          <h2 className="text-[10px] font-bold uppercase tracking-wider mb-2 text-white" style={{ fontFamily: "'Inter', sans-serif" }}>Interview Prep</h2>
          {prepData.activeCompany ? (
            <div className="relative">
              <button onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <span className="truncate">{prepData.activeCompany}</span>
                <svg className="w-3 h-3 shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    {prepData.companies.map(c => (
                      <button key={c} onClick={() => switchCompany(c)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors"
                        style={{ color: c === prepData.activeCompany ? 'var(--cam-primary)' : 'var(--text-muted)', background: c === prepData.activeCompany ? 'var(--accent-subtle)' : 'transparent' }}>
                        <span className="truncate">{c}</span>
                        {prepData.companies.length > 1 && (
                          <button onClick={(e) => { e.stopPropagation(); deleteCompany(c); }}
                            className="p-0.5 rounded" style={{ color: 'var(--text-muted)' }}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </button>
                    ))}
                    <button onClick={() => { setShowDropdown(false); setShowNewCompany(true); setTimeout(() => newCompanyRef.current?.focus(), 100); }}
                      className="w-full px-3 py-2 text-xs font-medium text-left" style={{ color: 'var(--cam-primary)', borderTop: '1px solid var(--border)' }}>
                      + Add Company
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : showNewCompany ? (
            <div className="space-y-1.5">
              <input ref={newCompanyRef} value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCompany(); if (e.key === 'Escape') setShowNewCompany(false); }}
                placeholder="e.g. Nvidia Devops" className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <div className="flex gap-1.5">
                <button onClick={addCompany} className="flex-1 py-1 text-[10px] font-bold rounded" style={{ background: 'var(--cam-primary)', color: '#FFFFFF' }}>Create</button>
                <button onClick={() => setShowNewCompany(false)} className="px-2 py-1 text-[10px] rounded" style={{ color: 'var(--text-muted)' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setShowNewCompany(true); setTimeout(() => newCompanyRef.current?.focus(), 100); }}
              className="w-full py-2 text-xs font-bold rounded-lg" style={{ background: 'var(--cam-primary)', color: '#FFFFFF' }}>
              + Add Company
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {SIDEBAR_SECTIONS.map((s) => {
            const isActive = s.id === activeSection;
            const hasContent = s.id === 'input' ? hasRequiredDocs : !!state.sections[s.id];
            return (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors text-xs font-medium"
                style={{
                  background: isActive ? 'var(--accent-subtle)' : 'transparent',
                  color: isActive ? 'var(--cam-primary)' : 'var(--text-muted)',
                  borderLeft: isActive ? `3px solid var(--cam-primary)` : '3px solid transparent',
                }}>
                {/* Status indicator */}
                {sectionStatus[s.id] === 'generating' ? (
                  <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin shrink-0" style={{ borderColor: s.color, borderTopColor: 'transparent' }} />
                ) : sectionStatus[s.id] === 'done' || hasContent ? (
                  <div className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center" style={{ background: s.color }}>
                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : sectionStatus[s.id] === 'error' ? (
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: 'var(--danger)' }} />
                ) : (
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--border)' }} />
                )}
                <span className="flex-1">{s.label}</span>
                {sectionStatus[s.id] === 'pending' && generating && (
                  <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>queued</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Generate button + progress */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          {generating && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>Generating all sections...</span>
                <span className="text-[9px] font-bold" style={{ color: 'var(--cam-primary)' }}>
                  {Object.values(sectionStatus).filter(s => s === 'done').length}/{GENERATE_SECTIONS.length}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${(Object.values(sectionStatus).filter(s => s === 'done').length / GENERATE_SECTIONS.length) * 100}%`,
                  background: 'var(--cam-primary)',
                }} />
              </div>
            </div>
          )}
          <button onClick={handleGenerate} disabled={!hasRequiredDocs || generating}
            className="w-full py-2.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
            style={{ background: 'var(--cam-primary)', color: '#FFFFFF' }}>
            {generating ? 'Generating...' : `Generate (${GENERATE_SECTIONS.length})`}
          </button>
          {!hasRequiredDocs && <p className="text-[9px] mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>Add JD & Resume to start</p>}
          <button onClick={() => { setState({ ...EMPTY_DOC } as any); setSectionStatus({}); setActiveSection('input'); }}
            className="w-full py-1.5 mt-1.5 text-[10px] font-medium rounded-lg" style={{ color: 'var(--text-muted)' }}>Clear</button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {activeSection === 'input' ? (
          <div className="p-6 max-w-4xl">
            {/* Materials */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--cam-primary)' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Materials</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <UploadZone label="Job Description" required value={state.jd} fileName={state.jdFile}
                  onUpload={async (f) => { const t = await extractFile(f); setState(p => ({ ...p, jd: t, jdFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, jd: t }))}
                  onClickOverride={() => { setJdEditText(state.jd || ''); setJdModalOpen(true); }} />
                <UploadZone label="Resume" required value={state.resume} fileName={state.resumeFile}
                  onUpload={async (f) => { const t = await extractFile(f); setState(p => ({ ...p, resume: t, resumeFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, resume: t }))} />
                <UploadZone label="Cover Letter" value={state.coverLetter} fileName={state.coverLetterFile}
                  onUpload={async (f) => { const t = await extractFile(f); setState(p => ({ ...p, coverLetter: t, coverLetterFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, coverLetter: t }))} />
                <UploadZone label="Prep Materials" value={state.prepMaterials} fileName={state.prepMaterialsFile}
                  onUpload={async (f) => { const t = await extractFile(f); setState(p => ({ ...p, prepMaterials: t, prepMaterialsFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, prepMaterials: t }))} />
              </div>
            </div>

            {/* Study Materials */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--cam-primary)' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Study Materials</span>
              </div>
              <UploadZone label="Drop files or click" value={state.studyMaterials} fileName={state.studyMaterialsFile}
                onUpload={async (f) => { const t = await extractFile(f); setState(p => ({ ...p, studyMaterials: t, studyMaterialsFile: f.name })); }}
                onPaste={(t) => setState(p => ({ ...p, studyMaterials: t }))} />
            </div>

            {/* Status */}
            <div className="mt-6 text-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {hasRequiredDocs ? 'Ready to generate — click Generate in the sidebar' : 'Add JD & Resume to start'}
              </p>
            </div>
          </div>
        ) : activeSection === 'jd-view' ? (
          /* JD formatted viewer */
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Job Description</h3>
              <button onClick={() => setActiveSection('input')} className="text-[10px] font-medium px-2 py-1 rounded-lg" style={{ color: 'var(--cam-primary)', background: 'var(--accent-subtle)' }}>Edit</button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <FormattedJD text={state.jd} />
            </div>
          </div>
        ) : (
          /* Generated section content */
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {SIDEBAR_SECTIONS.find(s => s.id === activeSection)?.label}
              </h3>
              <div className="flex items-center gap-2">
                {state.sections[activeSection] && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-subtle)', color: 'var(--cam-primary)' }}>Generated</span>
                )}
                {hasRequiredDocs && (
                  <button
                    onClick={() => regenerateSection(activeSection)}
                    disabled={sectionStatus[activeSection] === 'generating'}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-colors disabled:opacity-40"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    {sectionStatus[activeSection] === 'generating' ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    )}
                    {state.sections[activeSection] ? 'Re-generate' : 'Generate'}
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {sectionStatus[activeSection] === 'generating' ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--cam-primary)', borderTopColor: 'transparent' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Generating {SIDEBAR_SECTIONS.find(s => s.id === activeSection)?.label}...</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Each section generates independently</p>
                </div>
              ) : state.sections[activeSection] ? (
                <PrepContentRenderer content={state.sections[activeSection]} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>No content yet</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {hasRequiredDocs ? 'Click Generate or Re-generate above' : 'Add JD & Resume first'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {jdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={closeJdModal}>
          <div className="w-full max-w-2xl mx-4 rounded-lg overflow-hidden" style={{ background: 'var(--bg-surface)' }} onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Job Description</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => jdFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded text-xs font-medium" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  Upload File
                </button>
                <button onClick={closeJdModal} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="p-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Paste job posting URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={jdUrl}
                  onChange={(e) => { setJdUrl(e.target.value); setJdUrlError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && jdUrl.trim() && !jdFetching) { e.preventDefault(); fetchJdUrl(jdUrl); } }}
                  placeholder="https://nvidia.wd5.myworkdayjobs.com/..."
                  disabled={jdFetching}
                  className="flex-1 px-3 py-2 rounded-lg text-xs"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <button onClick={pasteJdFromClipboard} disabled={jdFetching}
                  className="px-3 py-2 rounded text-xs font-medium" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)', opacity: jdFetching ? 0.5 : 1, cursor: jdFetching ? 'not-allowed' : 'pointer' }}
                  title="Paste URL or JD text from clipboard">
                  Paste
                </button>
                <button onClick={() => fetchJdUrl(jdUrl)} disabled={!jdUrl.trim() || jdFetching}
                  className="px-3 py-2 rounded text-xs font-bold" style={{ background: 'var(--cam-primary)', color: '#fff', opacity: (!jdUrl.trim() || jdFetching) ? 0.5 : 1, cursor: (!jdUrl.trim() || jdFetching) ? 'not-allowed' : 'pointer' }}>
                  {jdFetching ? 'Fetching…' : 'Fetch JD'}
                </button>
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Supports Workday, Greenhouse, Lever, Ashby, SmartRecruiters, LinkedIn, and most career pages.
              </p>
              {jdUrlError && <p className="text-[11px] mt-1.5" style={{ color: 'var(--danger)' }}>{jdUrlError}</p>}

              <textarea
                value={jdEditText}
                onChange={(e) => setJdEditText(e.target.value)}
                placeholder="Or paste the full job description text here..."
                className="w-full mt-3 p-3 rounded-lg text-xs resize-none"
                style={{ height: '240px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <input ref={jdFileInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.md" className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  setJdFetching(true);
                  try {
                    const t = await extractFile(f);
                    setState(p => ({ ...p, jd: t, jdFile: f.name }));
                    closeJdModal();
                  } finally { setJdFetching(false); }
                }} />
            </div>
            <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={closeJdModal} className="px-4 py-2 rounded text-xs font-medium" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button
                onClick={() => {
                  if (jdEditText.trim()) setState(p => ({ ...p, jd: jdEditText.trim(), jdFile: undefined }));
                  closeJdModal();
                }}
                disabled={!jdEditText.trim()}
                className="px-4 py-2 rounded text-xs font-bold"
                style={{ background: 'var(--cam-primary)', color: '#fff', opacity: jdEditText.trim() ? 1 : 0.5, cursor: jdEditText.trim() ? 'pointer' : 'not-allowed' }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
