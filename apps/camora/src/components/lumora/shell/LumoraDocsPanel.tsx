/**
 * Interview Prep — matches capra.cariara.com/app/prep layout.
 * Sidebar sections + upload zones + Generate button.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { JSX, CSSProperties } from 'react';
import hljs from '@/lib/hljs';
import { useAuth } from '../../../contexts/AuthContext';
import { getAuthHeaders } from '../../../utils/authHeaders';
import { prepAPI } from '../../../lib/api-client';
import { sectionsToPrepSections, downloadPrepAsPdf, downloadPrepAsDocx } from '../../../lib/prepDownload';
import { useCloudProvider } from '../../../hooks/useCloudProvider';
import CloudProviderSelector from '../../shared/CloudProviderSelector';
import { stripInlineMarkdown, isImageUrl } from '../../../lib/text-utils';
import { RichText } from './companion/answer-view';
import Chip from '@/components/shared/ui/Chip';
import { ResearchDocsCard } from '../prep/ResearchDocsCard';
import { readPrepRaw, writePrepRaw } from '../../../lib/prepStorage';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface StudyDoc {
  name: string;
  content: string;
}

interface DocState {
  jd: string;
  jdFile?: string;
  resume: string;
  resumeFile?: string;
  coverLetter: string;
  coverLetterFile?: string;
  prepMaterials: string;
  prepMaterialsFile?: string;
  // Multi-document study material list. Sona reads every entry as
  // additional context during live sessions.
  studyDocs: StudyDoc[];
  // Legacy single-string field — read once by migrateStudyDocs() and
  // folded into studyDocs, then kept undefined.
  studyMaterials?: string;
  studyMaterialsFile?: string;
  sections: Record<string, any>;
}

interface PrepData {
  companies: string[];
  archivedCompanies?: string[];
  activeCompany: string | null;
  data: Record<string, DocState>;
}

const EMPTY_DOC: DocState = {
  jd: '', resume: '', coverLetter: '', prepMaterials: '', studyDocs: [],
  sections: {},
};

/** Fold a legacy single-string studyMaterials field into the studyDocs
 *  array so users who uploaded one doc on v8 don't lose it on first read. */
const migrateStudyDocs = (doc: any): DocState  => {
  if (!doc) return { ...EMPTY_DOC };
  const studyDocs: StudyDoc[] = Array.isArray(doc.studyDocs) ? doc.studyDocs : [];
  if (!studyDocs.length && typeof doc.studyMaterials === 'string' && doc.studyMaterials.trim()) {
    studyDocs.push({ name: doc.studyMaterialsFile || 'Study material', content: doc.studyMaterials });
  }
  return { ...EMPTY_DOC, ...doc, studyDocs, studyMaterials: undefined, studyMaterialsFile: undefined };
}

const INITIAL_STATE: PrepData = {
  companies: [],
  archivedCompanies: [],
  activeCompany: null,
  data: {},
};

// All sidebar sections share the docs design palette (navy primary +
// gold leaf for "done"). The previous setup had HR Questions in
// warning yellow and Hiring Manager in accent — that rainbow is gone
// in favour of one uniform palette across the rail. Section identity
// now reads from the label, not the dot colour.
const SIDEBAR_SECTIONS = [
  { id: 'input', label: 'Input Materials', color: 'var(--cam-primary)' },
  { id: 'jd-view', label: 'Job Description', color: 'var(--cam-primary)' },
  { id: 'pitch', label: 'Elevator Pitch', color: 'var(--cam-primary)' },
  { id: 'hr', label: 'HR Questions', color: 'var(--cam-primary)' },
  { id: 'hiring-manager', label: 'Hiring Manager', color: 'var(--cam-primary)' },
  { id: 'coding', label: 'Coding', color: 'var(--cam-primary)' },
  { id: 'system-design', label: 'System Design', color: 'var(--cam-primary)' },
  { id: 'behavioral', label: 'Behavioral', color: 'var(--cam-primary)' },
  { id: 'techstack', label: 'Tech Stack', color: 'var(--cam-primary)' },
];

/** Strip markdown fences and leading "json" tag; shared helper. */
const stripFences = (raw: string): string  => {
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
const formatPrepContent = (content: any): any  => {
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
const repairJSON = (s: string): any  => {
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
const escapeJsonStringControls = (s: string): string  => {
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
const extractJSON = (raw: string): any  => {
  if (!raw || typeof raw !== 'string') return null;
  const s = stripFences(raw);
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
const fmtKey = (k: string): string  => {
  return k.replace(/([A-Z])/g, ' $1').trim().replace(/^./, (c) => c.toUpperCase());
}

/** Best-effort JSON parse — returns parsed value if the string is valid JSON,
 *  null otherwise. Used to heal stringified-object values that snuck through
 *  schema validation or are coming back from stale localStorage. */
const tryParseJsonValue = (s: string): any  => {
  if (typeof s !== 'string') return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return null;
  try { return JSON.parse(trimmed); } catch {}
  try { return JSON.parse(escapeJsonStringControls(trimmed)); } catch {}
  return null;
}

/** Defensive text coercion — guarantees a renderable React child even when
 *  the model returns an object/array where we expected a string. Without
 *  this guard, React throws "Objects are not valid as a React child" and
 *  the whole panel goes blank. */
const safeText = (v: any): string  => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return stripInlineMarkdown(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  // Sentence arrays (elevator-pitch openingHook, keyAchievement…) arrive as
  // ["…experience.", "My expertise…"]. Comma-joining them produced the
  // "experience., My" artifact; stripInlineMarkdown heals ".," → ". " on the
  // joined result while short token lists (tech stacks) keep their commas.
  if (Array.isArray(v)) return stripInlineMarkdown(v.map(safeText).filter(Boolean).join(', '));
  if (typeof v === 'object') {
    // Object dropped where text was expected — turn it into a readable
    // "key: value, key: value" line instead of crashing.
    return Object.entries(v)
      .map(([k, vv]) => `${k}: ${safeText(vv)}`)
      .join(' • ');
  }
  return String(v);
}

/** Recursively render any value: string, array (of strings or objects), or object.
 *  This is the catch-all that prevents `[object Object]` from ever leaking
 *  into the UI when nested arrays contain objects. */
const ValueRenderer = ({ val, depth = 0 }: { val: any; depth?: number }): JSX.Element | null => {
  if (val === null || val === undefined) return null;

  if (typeof val === 'string') {
    // Heal stringified JSON — if the value is a JSON-shaped string, parse and recurse
    const parsed = tryParseJsonValue(val);
    if (parsed !== null) return <ValueRenderer val={parsed} depth={depth} />;
    // A bare image URL (e.g. a generated architecture diagram) renders as the
    // actual image, not the raw link text.
    if (isImageUrl(val)) {
      return (
        <img
          src={val.trim()}
          alt="Diagram"
          loading="lazy"
          className="max-w-full rounded-lg mt-1"
          style={{ border: '1px solid var(--border)' }}
        />
      );
    }
    const clean = stripInlineMarkdown(val);
    if (!clean) return null;
    return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{clean}</span>;
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{String(val)}</span>;
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return null;
    // Array of primitives — comma-join for inline display
    const allPrimitive = val.every((x) => typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean');
    if (allPrimitive) {
      return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{stripInlineMarkdown(val.map(String).join(', '))}</span>;
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
    const entries = Object.entries(val).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0));
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
const GenericField = ({ label, val }: { label: string; val: any }) => {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--cam-primary)' }}>{fmtKey(label)}</div>
      <ValueRenderer val={val} />
    </div>
  );
}

/** Compact "key: value" rows — renders a JSON payload (API request/response)
 *  as readable labelled lines instead of a raw JSON.stringify blob. */
const KeyValueRows = ({ obj, accent }: { obj: Record<string, any>; accent: string }) => {
  const entries = Object.entries(obj || {}).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) {
    return <div className="text-xs font-mono italic" style={{ color: 'var(--text-muted)' }}>None</div>;
  }
  return (
    <div className="space-y-0.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-1.5 text-[12px] leading-relaxed font-mono">
          <span className="font-semibold shrink-0" style={{ color: accent }}>{k}:</span>
          <span className="break-words" style={{ color: 'var(--text-primary)' }}>{safeText(v)}</span>
        </div>
      ))}
    </div>
  );
}

/** Compact database schema — renders each table's columns as a dense table
 *  (Column · Type · Constraint) instead of one oversized card per column. */
const SchemaTables = ({ schema, accent }: { schema: any[]; accent: string }) => {
  const tables = (schema || []).filter((t) => t && typeof t === 'object');
  if (tables.length === 0) return null;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      {tables.map((t, ti) => {
        const cols = Array.isArray(t.columns) ? t.columns.filter((c: any) => c && typeof c === 'object') : [];
        return (
          <div key={ti} className="rounded-lg overflow-hidden self-start" style={{ border: `1px solid ${accent}30` }}>
            <div className="px-3 py-1.5 font-mono text-[12px] font-bold" style={{ background: `${accent}15`, color: accent }}>
              {safeText(t.table || t.name)}
            </div>
            {cols.length > 0 ? (
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Column', 'Type', 'Constraint'].map((h) => (
                      <th key={h} className="text-left px-3 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)', borderBottom: `1px solid ${accent}22` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cols.map((c: any, ci: number) => (
                    <tr key={ci} style={{ borderBottom: ci < cols.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td className="px-3 py-1 font-mono text-[12px]" style={{ color: 'var(--text-primary)' }}>{safeText(c.name)}</td>
                      <td className="px-3 py-1 font-mono text-[12px]" style={{ color: 'var(--text-secondary)' }}>{safeText(c.type)}</td>
                      <td className="px-3 py-1 font-mono text-[11px]" style={{ color: c.constraint ? accent : 'var(--text-muted)' }}>{c.constraint ? safeText(c.constraint) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-3 py-2"><ValueRenderer val={t} /></div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** True for content that reads better rendered as book-style RichText —
 *  multi-line prose, headings, bullet/numbered lists, tables, or fenced code. */
const hasBlockMarkdown = (s: string): boolean =>
  /\n/.test(s) || /```/.test(s) || /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|\|)/.test(s);

/** Book-style prose renderer for prep-kit fields. Block/multi-line content
 *  renders via RichText (bold, `code`, bullets, headings, tables) so no raw
 *  markdown ever shows. Single-line content is stripped of inline markdown and
 *  rendered inline, preserving the caller's color/size. Objects fall back to
 *  the safe "key: value" coercion. */
const Prose = ({ value, className, style }: { value: any; className?: string; style?: CSSProperties }) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    if (!value.trim()) return null;
    if (hasBlockMarkdown(value)) return <RichText text={value} />;
    return <span className={className} style={style}>{stripInlineMarkdown(value)}</span>;
  }
  return <span className={className} style={style}>{safeText(value)}</span>;
};

// ─────────────────────────────────────────────────────────────────────────
// LeetCode-inspired primitives — uses LC's actual palette hardcoded so the
// visual language comes through regardless of the active app theme.
// ─────────────────────────────────────────────────────────────────────────

/** Camora palette — navy primary with gold caution.
 *  Navy (#1E4D78) = structural/informational. Gold (#D4A043) = caution/highlight.
 *  No rainbow. Section type is communicated by label, not hue. */
const LC = {
  // Difficulty pills — semantic meaning, kept intentional
  easy:   { fg: '#3B82B9', bg: 'rgba(59,130,185,0.08)',  border: 'rgba(59,130,185,0.22)' },
  medium: { fg: '#D4A043', bg: 'rgba(212,160,67,0.10)',  border: 'rgba(212,160,67,0.30)' },
  hard:   { fg: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.22)' },

  // Brand tokens
  navy:        '#1E4D78',
  gold:        '#D4A043',

  // All section accents → navy (informational) or gold (caution/watch-out)
  problem:      '#2B6394',
  examples:     '#2B6394',
  approach:     '#2B6394',
  edge:         '#D4A043',  // watch-out → gold
  mistake:      '#D4A043',  // watch-out → gold
  followup:     '#2B6394',
  requirements: '#2B6394',
  capacity:     '#2B6394',
  architecture: '#2B6394',
  database:     '#2B6394',
  api:          '#2B6394',
  tradeoffs:    '#D4A043',  // trade-off emphasis → gold
  scalability:  '#2B6394',
  clarify:      '#2B6394',

  // STAR — action (the doing) → gold, rest → navy
  star: {
    situation: '#2B6394',
    task:      '#2B6394',
    action:    '#D4A043',
    result:    '#2B6394',
  },

  // Code editor — VSCode dark, universally readable
  codeBg:    '#1E1E1E',
  codeFg:    '#D4D4D4',
  codeHdr:   '#2D2D2D',
  codeMuted: '#9CA3AF',

  paper:       'var(--bg-surface)',
  paperBorder: 'rgba(30,77,120,0.22)',
  pageRule:    'rgba(30,77,120,0.22)',
};

/** Card surface with accent tint. Navy for informational, amber for caution sections. */
const paperCard = (accent: string) => {
  const isAmber = accent === LC.gold;
  // Navy (not emerald) for informational cards — matches the Camora navy-gold palette.
  const rgb = isAmber ? '245,158,11' : '38,97,156';
  return {
    background: `linear-gradient(180deg, rgba(${rgb},0.07) 0%, rgba(${rgb},0.03) 100%), var(--bg-surface)`,
    border: `1px solid rgba(${rgb},0.22)`,
    boxShadow: `0 1px 0 rgba(${rgb},0.08), 0 2px 8px -3px rgba(0,0,0,0.06)`,
  };
}

const DifficultyPill = ({ value }: { value: string }) => {
  const v = String(value).toLowerCase();
  const senior = ['senior', 'staff', 'principal'].some((s) => v.includes(s));
  const variant = v.includes('hard') || senior ? 'hard' : v.includes('medium') || v.includes('mid') ? 'medium' : 'easy';
  return <Chip variant={variant}>{value}</Chip>;
}

const TagChip = ({ label }: { label: string }) => {
  return <Chip variant="default">{label}</Chip>;
}

/** Complexity badge — O(n), O(log n) — LC's time/space pill, dark mono on any theme. */
const ComplexityBadge = ({ kind, value }: { kind: 'time' | 'space'; value: string }) => {
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

/** Map any caller-supplied language token onto a hljs-recognised id. */
const resolveHljsLanguage = (input?: string): { id: string | null; label: string } => {
  const raw = (input || '').trim().toLowerCase();
  if (!raw || raw === 'code' || raw === 'plaintext' || raw === 'text') {
    return { id: null, label: raw || 'code' };
  }
  const aliases: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    yml: 'yaml',
    py: 'python',
    rb: 'ruby',
    rs: 'rust',
    'c++': 'cpp',
    cs: 'csharp',
    'objective-c': 'objectivec',
    tf: 'terraform',
    hcl: 'terraform',
    docker: 'dockerfile',
    md: 'markdown',
  };
  const id = aliases[raw] ?? raw;
  // hljs.getLanguage returns undefined for unregistered ids — fall back to
  // auto-detect in that case so the caller's label is still shown.
  return { id: hljs.getLanguage(id) ? id : null, label: input || raw };
}

/** Code block — VSCode-dark editor look with a file-tab header + hljs highlighting. */
const CodeBlock = ({ code, language = 'code', maxLines = 10 }: { code: string; language?: string; maxLines?: number }) => {
  const codeRef = useRef<HTMLElement>(null);
  const { id: hljsLang, label } = resolveHljsLanguage(language);
  const lines = code.split('\n');
  const totalLines = lines.length;
  const shouldTruncate = totalLines > maxLines + 2;
  const [expanded, setExpanded] = useState(false);
  const displayCode = shouldTruncate && !expanded ? lines.slice(0, maxLines).join('\n') : code;

  useEffect(() => {
    if (!codeRef.current) return;
    codeRef.current.removeAttribute('data-highlighted');
    try {
      if (hljsLang) {
        const html = hljs.highlight(displayCode, { language: hljsLang, ignoreIllegals: true }).value;
        codeRef.current.innerHTML = html;
      } else {
        const html = hljs.highlightAuto(displayCode).value;
        codeRef.current.innerHTML = html;
      }
      codeRef.current.setAttribute('data-highlighted', 'yes');
    } catch {
      codeRef.current.textContent = displayCode;
    }
  }, [displayCode, hljsLang]);

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${LC.codeHdr}` }}>
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ background: LC.codeHdr, borderBottom: `1px solid var(--cam-strip-icon-border)` }}
      >
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: LC.codeMuted }}>
          {label}
        </span>
        <span className="text-[10px] font-mono" style={{ color: LC.codeMuted }}>{totalLines} LOC</span>
      </div>
      <pre
        className="px-4 py-3 text-[12.5px] leading-relaxed overflow-x-auto"
        style={{ background: LC.codeBg, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
      >
        <code ref={codeRef} className={hljsLang ? `language-${hljsLang} hljs` : 'hljs'} style={{ background: 'transparent' }}>
          {displayCode}
        </code>
      </pre>
      {shouldTruncate && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full py-1.5 flex items-center justify-center gap-1 text-[10px] font-medium transition-opacity hover:opacity-80"
          style={{ background: LC.codeHdr, color: LC.codeMuted, borderTop: `1px solid var(--cam-strip-icon-border)` }}
        >
          {expanded ? (
            <><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 7L5 4L8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Collapse</>
          ) : (
            <><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3L5 6L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>+{totalLines - maxLines} more lines</>
          )}
        </button>
      )}
    </div>
  );
}

/** Example block — navy-tinted card with mono Input/Output/Explanation. */
const ExampleBlock = ({ example, index }: { example: any; index: number }) => {
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
            {safeText(example.explanation)}
          </p>
        )}
      </div>
    </div>
  );
}

/** Approach card — navy-accented header, complexity pills, code editor. */
const ApproachCard = ({ approach, index }: { approach: any; index: number }) => {
  if (!approach || typeof approach !== 'object') return null;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: `${LC.approach}06`, border: `1px solid ${LC.approach}33` }}>
      <div
        className="px-4 py-3"
        style={{ background: `${LC.approach}10`, borderBottom: `1px solid ${LC.approach}33` }}
      >
        <div className="flex items-baseline gap-2 flex-wrap mb-2">
          <Chip variant="default">Approach {index + 1}</Chip>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{safeText(approach.name)}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {approach.timeComplexity && <ComplexityBadge kind="time" value={approach.timeComplexity} />}
          {approach.spaceComplexity && <ComplexityBadge kind="space" value={approach.spaceComplexity} />}
        </div>
        {approach.description && (
          <div className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}><Prose value={approach.description} /></div>
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
                  <span className="leading-relaxed pt-1" style={{ color: 'var(--text-secondary)' }}>{safeText(l.explanation)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Section heading — navy or gold hexagon dot + label + fading rule. */
const SectionHeading = ({ label, color = LC.navy }: { label: string; color?: string }) => {
  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <span
        className="block flex-shrink-0"
        style={{
          width: 8,
          height: 8,
          background: color,
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
        }}
      />
      <h4 className="text-[12px] font-bold uppercase tracking-widest" style={{ color }}>
        {label}
      </h4>
      <span className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color}40 0%, transparent 100%)` }} />
    </div>
  );
}

/** Rich content renderer for prep sections — accepts string or object.
 *  Renders known fields with custom layouts, then catches ALL remaining fields generically.
 *  Nothing is ever silently dropped. */
const PrepContentRenderer = ({ content }: { content: any }) => {
  let data: any = null;
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    data = content;
  } else if (typeof content === 'string') {
    data = extractJSON(content);
    if (!data) {
      const text = content.replace(/^"|"$/g, '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
      return <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}><Prose value={text} /></div>;
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
          <div className="text-[15px] leading-[1.65]" style={{ color: 'var(--text-primary)' }}><Prose value={data.summary} /></div>
        </div>
      );
    }
  }

  // Pitch Sections — accept the canonical `pitchSections` key plus loose
  // aliases some generations emit (`chSections`, a bare `pitch` array) so the
  // elevator pitch always renders here (first, as numbered cards) instead of
  // falling through to the generic catch-all at the bottom of the builder.
  const pitchArr =
    data.pitchSections ||
    data.chSections ||
    (Array.isArray(data.pitch) && data.pitch.some((p: any) => p && typeof p === 'object' && (p.bullets || p.title)) ? data.pitch : null);
  if (pitchArr) {
    mark('pitchSections', 'chSections', 'pitch');
    const sections = pitchArr;
    els.push(
      <div key="pitch" className="space-y-4">
        {sections.map((s: any, i: number) => (
          <div key={i} className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--cam-primary)', color: '#FFFFFF' }}>{i + 1}</span>
            <div className="flex-1 pt-0.5">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {(s.bullets || []).map((b: string, j: number) => (
                  <span key={j}>{j === 0 ? <><strong style={{ color: 'var(--cam-primary)' }}>{safeText(b).split(' ').slice(0, 3).join(' ')}</strong> {safeText(b).split(' ').slice(3).join(' ')}</> : ` ${safeText(b)}`}</span>
                ))}
                {s.title && !s.bullets?.length && <>{safeText(s.title)}</>}
              </p>
              {s.duration && <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{s.duration}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Behavioral companyContext — interviewFormat / whatTheyLookFor / knownQuestions / culturalFit
  if (data.companyContext && typeof data.companyContext === 'object') {
    mark('companyContext');
    const cc = data.companyContext;
    els.push(
      <div key="companyContext" className="rounded-xl p-4" style={paperCard(LC.medium.fg)}>
        <SectionHeading label="Company Insights" color={LC.medium.fg} />
        <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {cc.interviewFormat && (
            <div className="rounded-md p-2.5" style={{ background: 'rgba(255,184,0,0.05)', border: 'rgba(255,184,0,0.15) 1px solid' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.medium.fg }}>Interview Format</div>
              <div className="text-[13px]" style={{ color: 'var(--text-primary)' }}><Prose value={cc.interviewFormat} /></div>
            </div>
          )}
          {cc.whatTheyLookFor && (
            <div className="rounded-md p-2.5" style={{ background: 'rgba(255,184,0,0.05)', border: 'rgba(255,184,0,0.15) 1px solid' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.medium.fg }}>What They Look For</div>
              <div className="text-[13px]" style={{ color: 'var(--text-primary)' }}><Prose value={cc.whatTheyLookFor} /></div>
            </div>
          )}
          {cc.culturalFit && (
            <div className="rounded-md p-2.5" style={{ background: 'rgba(255,184,0,0.05)', border: 'rgba(255,184,0,0.15) 1px solid' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.medium.fg }}>Cultural Fit</div>
              <div className="text-[13px]" style={{ color: 'var(--text-primary)' }}><Prose value={cc.culturalFit} /></div>
            </div>
          )}
          {cc.knownQuestions && (
            <div className="rounded-md p-2.5" style={{ background: 'rgba(255,184,0,0.05)', border: 'rgba(255,184,0,0.15) 1px solid' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.medium.fg }}>Known Questions</div>
              <div className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{Array.isArray(cc.knownQuestions) ? cc.knownQuestions.map(safeText).filter(Boolean).join(' · ') : safeText(cc.knownQuestions)}</div>
            </div>
          )}
        </div>
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
          <div className="text-[14px] leading-relaxed" style={{ color: 'var(--text-primary)' }}><Prose value={ci} /></div>
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

  // Questions — LeetCode-inspired card layout.
  //
  // Defensive: the previous guard `data.questions?.length > 0` let through any
  // value with a length (strings, length-bearing objects), then crashed at
  // `.map`. Hiring-manager responses sometimes arrive as a string paragraph
  // or a `{ items: [...] }` wrapper, hence this normalization.
  let rawQuestions = data.questions;
  let questionsArr: any[] | null = null;
  // Heal stringified questions arrays — generation sometimes returns the
  // entire `[{...}, {...}]` payload as a JSON string (with unescaped newlines
  // in long suggestedAnswer strings), which would otherwise dump as raw JSON.
  if (typeof rawQuestions === 'string') {
    const trimmed = rawQuestions.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      let parsed: any = tryParseJsonValue(trimmed);
      if (!parsed) {
        // tryParseJsonValue only repairs {}-objects. For arrays, wrap in an
        // object so repairJSON can close open delimiters, then unwrap.
        const escaped = escapeJsonStringControls(trimmed);
        try { parsed = JSON.parse(escaped); } catch {}
        if (!parsed && trimmed.startsWith('[')) {
          const asObj = repairJSON(`{"_q":${escaped}}`);
          if (asObj && Array.isArray(asObj._q)) parsed = asObj._q;
        }
        if (!parsed) parsed = repairJSON(trimmed);
      }
      if (Array.isArray(parsed)) {
        rawQuestions = parsed;
      } else if (parsed && typeof parsed === 'object') {
        const wrapped = (parsed as any).items ?? (parsed as any).list ?? (parsed as any).questions;
        if (Array.isArray(wrapped)) rawQuestions = wrapped;
      }
    }
  }
  if (Array.isArray(rawQuestions)) {
    questionsArr = rawQuestions;
  } else if (rawQuestions && typeof rawQuestions === 'object') {
    const wrapped = (rawQuestions as any).items ?? (rawQuestions as any).list ?? (rawQuestions as any).questions;
    if (Array.isArray(wrapped)) questionsArr = wrapped;
  }
  if (!questionsArr && typeof rawQuestions === 'string' && rawQuestions.trim()) {
    const looksLikeJson = rawQuestions.trim().startsWith('[') || rawQuestions.trim().startsWith('{');
    mark('questions');
    els.push(
      <div key="questions" className="rounded-xl p-4" style={paperCard(LC.navy)}>
        <SectionHeading label="Questions" color={LC.navy} />
        {looksLikeJson ? (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Questions could not be displayed. Click <strong style={{ color: LC.navy }}>Re-generate</strong> to retry.
          </p>
        ) : (
          <div className="text-[14px] leading-relaxed" style={{ color: 'var(--text-primary)' }}><Prose value={rawQuestions} /></div>
        )}
      </div>
    );
  } else if (questionsArr && questionsArr.length > 0) {
    mark('questions');
    els.push(
      // Single column — earlier multi-column grid hurt readability on
      // narrow viewports and tablets. Question cards have variable
      // heights (STAR + code + chips) and read more naturally one at
      // a time.
      <div key="questions" className="space-y-5">
        {questionsArr.map((q: any, i: number) => {
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
                    <h3 className="text-[16px] font-bold leading-snug tracking-tight" style={{ color: 'var(--text-primary)' }}>{safeText(title)}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      {q.difficulty && <DifficultyPill value={q.difficulty} />}
                      {chips.map((c, ci) => <TagChip key={ci} label={c.label} />)}
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
                  qRendered.add('problemStatement'); qRendered.add('description');
                  const text = q.problemStatement || q.description;
                  return (
                    <div>
                      <SectionHeading label="Problem" color={LC.problem} />
                      <div className="rounded-lg p-3" style={{ background: `${LC.problem}06`, border: `1px solid ${LC.problem}25` }}>
                        <div className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}><Prose value={text} /></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Suggested answer (HR / hiring-manager / behavioral non-STAR) */}
                {!q.situation && !q.task && !q.action && !q.result && (q.answer || q.sampleAnswer || q.suggestedAnswer) && (() => {
                  qRendered.add('answer'); qRendered.add('sampleAnswer'); qRendered.add('suggestedAnswer');
                  const text = q.answer || q.sampleAnswer || q.suggestedAnswer;
                  return (
                    <div>
                      <SectionHeading label="Suggested Answer" color={LC.examples} />
                      <div className="rounded-lg p-3" style={{ background: `${LC.examples}06`, border: `1px solid ${LC.examples}25` }}>
                        <div className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}><Prose value={text} /></div>
                      </div>
                    </div>
                  );
                })()}

                {/* STAR format — behavioral */}
                {(q.situation || q.task || q.action || q.result) && (() => {
                  qRendered.add('situation'); qRendered.add('task'); qRendered.add('action'); qRendered.add('result');
                  const stars = [
                    { key: 'situation', label: 'Situation', accent: '#2B6394' },
                    { key: 'task',      label: 'Task',      accent: '#265C93' },
                    { key: 'action',    label: 'Action',    accent: '#22558A' },
                    { key: 'result',    label: 'Result',    accent: '#1E4D78' },
                  ];
                  return (
                    <div>
                      <SectionHeading label="STAR Response" />
                      <div className="space-y-2">
                        {stars.map((s) => q[s.key] && (
                          <div key={s.key} className="rounded-lg p-3 flex gap-3" style={{ background: `${s.accent}10`, border: `1px solid ${s.accent}40` }}>
                            <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider" style={{ color: s.accent, minWidth: 64 }}>{s.label}</span>
                            <div className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}><Prose value={Array.isArray(q[s.key]) ? q[s.key].join('\n') : q[s.key]} /></div>
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
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{sa[f]}</p>
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
                      <SectionHeading label="Edge Cases" color={LC.edge} />
                      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                        {q.edgeCases.filter((e: any) => e && typeof e === 'object').map((e: any, ei: number) => (
                          <div key={ei} className="rounded-lg p-3 text-xs" style={paperCard(LC.edge)}>
                            {e.case && <div className="font-bold mb-1" style={{ color: LC.edge }}>{safeText(e.case)}</div>}
                            {e.input && <div className="font-mono mb-1" style={{ color: 'var(--text-primary)' }}>{safeText(e.input)}</div>}
                            {e.explanation && <p style={{ color: 'var(--text-primary)' }}>{safeText(e.explanation)}</p>}
                            {e.expectedOutput && <div className="font-mono mt-1" style={{ color: 'var(--text-muted)' }}>→ {safeText(e.expectedOutput)}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Common mistakes — warning-tinted, 2-col grid when 3+ items */}
                {Array.isArray(q.commonMistakes) && q.commonMistakes.length > 0 && (() => {
                  qRendered.add('commonMistakes');
                  const useGrid = q.commonMistakes.length >= 3;
                  return (
                    <div>
                      <SectionHeading label="Common Mistakes" color={LC.mistake} />
                      <ul className={useGrid ? 'grid gap-x-4 gap-y-1.5' : 'space-y-1'} style={useGrid ? { gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' } : undefined}>
                        {q.commonMistakes.map((m: any, mi: number) => (
                          <li key={mi} className="text-xs flex gap-2 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                            <span style={{ color: LC.mistake }}>•</span>
                            <span>{safeText(m)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}

                {/* Follow-ups — 2-col grid when 3+ items */}
                {(Array.isArray(q.followUpQuestions) || Array.isArray(q.followUps) || q.followUp) && (() => {
                  qRendered.add('followUpQuestions'); qRendered.add('followUps'); qRendered.add('followUp');
                  const items = q.followUpQuestions || q.followUps || (q.followUp ? [q.followUp] : []);
                  const useGrid = items.length >= 3;
                  return (
                    <div>
                      <SectionHeading label="Follow-ups" color={LC.followup} />
                      <ul className={useGrid ? 'grid gap-x-4 gap-y-1.5' : 'space-y-1'} style={useGrid ? { gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' } : undefined}>
                        {items.map((fu: any, fi: number) => (
                          <li key={fi} className="text-xs flex gap-2 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                            <span style={{ color: LC.followup }}>↳</span>
                            <span>{typeof fu === 'string' ? fu : safeText(fu.question || fu)}</span>
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
                    <span style={{ color: 'var(--text-primary)' }}>{Array.isArray(q.tips) ? q.tips.map(safeText).filter(Boolean).join(' ') : safeText(q.tips)}</span>
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
                        <ul className="grid gap-x-4 gap-y-1.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
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
                  const schema = Array.isArray(db.schema) ? db.schema : null;
                  // Fields beyond `schema` (relationships, indexes, notes…) still
                  // get the generic card so nothing is dropped.
                  const rest = Object.entries(db).filter(([k, v]) => k !== 'schema' && v != null && !(Array.isArray(v) && v.length === 0));
                  return (
                    <div>
                      <SectionHeading label="Database Design" color={LC.database} />
                      {schema && schema.length > 0 ? (
                        <SchemaTables schema={schema} accent={LC.database} />
                      ) : (
                        <div className="rounded-lg p-3" style={paperCard(LC.database)}>
                          <ValueRenderer val={db} />
                        </div>
                      )}
                      {schema && rest.length > 0 && (
                        <div className="rounded-lg p-3 mt-2 space-y-2" style={paperCard(LC.database)}>
                          {rest.map(([k, v]) => (
                            <div key={k}>
                              <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.database }}>{fmtKey(k)}</div>
                              <ValueRenderer val={v} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* API Design */}
                {Array.isArray(q.apiDesign) && q.apiDesign.length > 0 && (() => {
                  qRendered.add('apiDesign');
                  return (
                    <div>
                      <SectionHeading label="API Design" color={LC.api} />
                      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
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
                                    <div className="p-2 rounded" style={{ background: `${LC.api}08`, border: `1px solid ${LC.api}20` }}><KeyValueRows obj={e.request} accent={LC.api} /></div>
                                  ) : (
                                    <div className="font-mono" style={{ color: 'var(--text-primary)' }}>{safeText(e.request)}</div>
                                  )}
                                </div>
                              )}
                              {e.response !== undefined && e.response !== null && (
                                <div>
                                  <div className="text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5" style={{ color: LC.api }}>Response</div>
                                  {typeof e.response === 'object' ? (
                                    <div className="p-2 rounded" style={{ background: `${LC.api}08`, border: `1px solid ${LC.api}20` }}><KeyValueRows obj={e.response} accent={LC.api} /></div>
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
                      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
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
                      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                        {q.scalabilityConsiderations.filter((s: any) => s && typeof s === 'object').map((s: any, si: number) => (
                          <div key={si} className="rounded-lg p-3" style={paperCard(LC.scalability)}>
                            {s.challenge && <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>⚠ {safeText(s.challenge)}</div>}
                            {s.solution && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}><span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.scalability }}>Solution:</span>{safeText(s.solution)}</p>}
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

  // Tech Stack — LC-modern card grid (used by Pitch + simple-shape sections)
  if (data.techStack && Array.isArray(data.techStack)) {
    mark('techStack');
    els.push(
      <div key="techstack">
        <SectionHeading label={`Tech Stack · ${data.techStack.length}`} color={LC.navy} />
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {data.techStack.filter((t: any) => t && typeof t === 'object').map((t: any, i: number) => {
            const experience = safeText(t.experience);
            // A short experience string ("12+ years", "Expert") fits in the
            // top-right pill; anything longer is treated as a description
            // and rendered on its own line so it can wrap inside the card
            // instead of overlapping the title or adjacent cards.
            const isShortExperience = !!experience && experience.length <= 24;
            return (
              <div
                key={i}
                className="rounded-xl p-3.5 transition-transform hover:scale-[1.01] overflow-hidden"
                style={paperCard(LC.navy)}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold font-mono leading-tight truncate" style={{ color: LC.navy }} data-tip={safeText(t.technology || t.name)}>
                      {safeText(t.technology || t.name)}
                    </div>
                    {t.category && (
                      <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {safeText(t.category)}
                      </div>
                    )}
                  </div>
                  {isShortExperience && (
                    <span
                      className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${LC.gold}15`, color: LC.gold, border: `1px solid ${LC.gold}40` }}
                    >
                      {experience}
                    </span>
                  )}
                </div>
                {experience && !isShortExperience && (
                  <p className="text-[11.5px] leading-snug mb-1.5" style={{ color: LC.gold }}>
                    {experience}
                  </p>
                )}
                {t.relevance && (
                  <p className="text-[12px] leading-relaxed break-words" style={{ color: 'var(--text-secondary)' }}>
                    {safeText(t.relevance)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Technologies (dedicated Tech Stack section) — comprehensive card per technology
  if (data.technologies && Array.isArray(data.technologies) && data.technologies.length > 0) {
    mark('technologies');
    const importancePill = (imp: any) => {
      const v = String(imp || '').toLowerCase();
      const variant = v === 'high' || v === 'critical' ? 'hard' : v === 'medium' || v === 'mid' ? 'warning' : 'easy';
      return <Chip variant={variant}>{safeText(imp)}</Chip>;
    };
    els.push(
      <div key="technologies" className="space-y-4">
        <SectionHeading label={`Technologies · ${data.technologies.length}`} color={LC.navy} />
        {data.technologies.filter((tech: any) => tech && typeof tech === 'object').map((tech: any, ti: number) => (
          <article
            key={ti}
            className="rounded-xl overflow-hidden"
            style={{
              border: `1px solid ${LC.paperBorder}`,
              background: LC.paper,
              boxShadow: `0 1px 0 ${LC.pageRule}, 0 8px 24px -16px rgba(20,20,40,0.18)`,
            }}
          >
            {/* Header */}
            <header
              className="px-5 pt-4 pb-3 relative"
              style={{
                borderBottom: `1px solid ${LC.pageRule}`,
                background: `linear-gradient(180deg, ${LC.navy}10 0%, transparent 100%)`,
              }}
            >
              <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: `linear-gradient(180deg, ${LC.gold} 0%, ${LC.navy} 100%)` }} />
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <h3 className="text-[18px] font-extrabold font-mono tracking-tight" style={{ color: LC.navy }}>
                  {safeText(tech.name)}
                </h3>
                {tech.importance && importancePill(tech.importance)}
              </div>
              {tech.whyImportant && (
                <p className="text-[13px] leading-relaxed mt-2" style={{ color: 'var(--text-secondary)' }}>
                  {safeText(tech.whyImportant)}
                </p>
              )}
            </header>

            <div className="px-5 py-4 space-y-4">
              {/* Concepts to Know */}
              {Array.isArray(tech.conceptsToKnow) && tech.conceptsToKnow.length > 0 && (
                <div>
                  <SectionHeading label="Concepts to Know" color={LC.problem} />
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    {tech.conceptsToKnow.filter((c: any) => c && typeof c === 'object').map((c: any, ci: number) => (
                      <div key={ci} className="rounded-lg p-3" style={paperCard(LC.problem)}>
                        {c.concept && <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{safeText(c.concept)}</div>}
                        {c.explanation && <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{safeText(c.explanation)}</p>}
                        {c.whyAsked && <p className="text-xs italic mt-1.5" style={{ color: LC.problem }}>Why asked: {safeText(c.whyAsked)}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions */}
              {Array.isArray(tech.questions) && tech.questions.length > 0 && (
                <div>
                  <SectionHeading label="Practice Questions" color={LC.approach} />
                  <div className="space-y-2">
                    {tech.questions.filter((q: any) => q && typeof q === 'object').map((q: any, qi: number) => (
                      <div key={qi} className="rounded-lg overflow-hidden" style={paperCard(LC.approach)}>
                        <div className="px-3 py-2 flex items-baseline gap-2 flex-wrap" style={{ background: `${LC.approach}14`, borderBottom: `1px solid ${LC.approach}25` }}>
                          <Chip variant="default">Q{qi + 1}</Chip>
                          <span className="text-sm font-bold flex-1" style={{ color: 'var(--text-primary)' }}>{safeText(q.question)}</span>
                          {q.difficulty && <DifficultyPill value={q.difficulty} />}
                        </div>
                        <div className="px-3 py-2.5 space-y-2">
                          {q.answer && <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>{safeText(q.answer)}</p>}
                          {q.codeExample && <CodeBlock code={String(q.codeExample)} language="code" />}
                          {Array.isArray(q.followUps) && q.followUps.length > 0 && (
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.followup }}>Follow-ups</div>
                              <ul className="space-y-0.5">
                                {q.followUps.map((f: any, fi: number) => (
                                  <li key={fi} className="text-xs flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                                    <span style={{ color: LC.followup }}>↳</span>{safeText(f)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {Array.isArray(q.commonMistakes) && q.commonMistakes.length > 0 && (
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.mistake }}>Common Mistakes</div>
                              <ul className="space-y-0.5">
                                {q.commonMistakes.map((m: any, mi: number) => (
                                  <li key={mi} className="text-xs flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                                    <span style={{ color: LC.mistake }}>•</span>{safeText(m)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Best Practices vs Anti-Patterns — masonry columns */}
              {(Array.isArray(tech.bestPractices) && tech.bestPractices.length > 0) || (Array.isArray(tech.antiPatterns) && tech.antiPatterns.length > 0) ? (() => {
                const bps = (tech.bestPractices || []).filter((bp: any) => bp && typeof bp === 'object');
                const aps = (tech.antiPatterns || []).filter((ap: any) => ap && typeof ap === 'object');
                type CardItem = { type: 'bp'; item: any } | { type: 'ap'; item: any };
                const cards: CardItem[] = [];
                const max = Math.max(bps.length, aps.length);
                for (let i = 0; i < max; i++) {
                  if (i < bps.length) cards.push({ type: 'bp', item: bps[i] });
                  if (i < aps.length) cards.push({ type: 'ap', item: aps[i] });
                }
                return (
                  <div style={{ columns: '2 280px', columnGap: '12px' }}>
                    {bps.length > 0 && aps.length > 0 ? (
                      cards.map((c, idx) =>
                        c.type === 'bp' ? (
                          <div key={`bp-${idx}`} className="rounded-lg p-3 mb-2" style={{ ...paperCard(LC.api), breakInside: 'avoid' }}>
                            <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: LC.api }}>Best Practice</div>
                            {c.item.practice && <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>✓ {safeText(c.item.practice)}</div>}
                            {c.item.when && <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}><span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.api }}>When:</span>{safeText(c.item.when)}</p>}
                            {c.item.codeExample && <div className="mt-2"><CodeBlock code={String(c.item.codeExample)} language="code" /></div>}
                          </div>
                        ) : (
                          <div key={`ap-${idx}`} className="rounded-lg p-3 mb-2" style={{ ...paperCard(LC.edge), breakInside: 'avoid' }}>
                            <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: LC.edge }}>Anti-Pattern</div>
                            {c.item.pattern && <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>✗ {safeText(c.item.pattern)}</div>}
                            {c.item.problem && <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}><span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.edge }}>Problem:</span>{safeText(c.item.problem)}</p>}
                            {c.item.solution && <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}><span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.api }}>Fix:</span>{safeText(c.item.solution)}</p>}
                          </div>
                        )
                      )
                    ) : (
                      <>
                        {bps.map((bp: any, bi: number) => (
                          <div key={bi} className="rounded-lg p-3 mb-2" style={{ ...paperCard(LC.api), breakInside: 'avoid' }}>
                            {bp.practice && <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>✓ {safeText(bp.practice)}</div>}
                            {bp.when && <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}><span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.api }}>When:</span>{safeText(bp.when)}</p>}
                            {bp.codeExample && <div className="mt-2"><CodeBlock code={String(bp.codeExample)} language="code" /></div>}
                          </div>
                        ))}
                        {aps.map((ap: any, ai: number) => (
                          <div key={ai} className="rounded-lg p-3 mb-2" style={{ ...paperCard(LC.edge), breakInside: 'avoid' }}>
                            {ap.pattern && <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>✗ {safeText(ap.pattern)}</div>}
                            {ap.problem && <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}><span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.edge }}>Problem:</span>{safeText(ap.problem)}</p>}
                            {ap.solution && <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}><span className="text-[10px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.api }}>Fix:</span>{safeText(ap.solution)}</p>}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })() : null}

              {/* Performance Topics — chip strip */}
              {Array.isArray(tech.performanceTopics) && tech.performanceTopics.length > 0 && (
                <div>
                  <SectionHeading label="Performance Topics" color={LC.examples} />
                  <div className="flex flex-wrap gap-1.5">
                    {tech.performanceTopics.map((p: any, pi: number) => (
                      <TagChip key={pi} label={safeText(p)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
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
  // Extract a primary label + optional sublabel from a list item that may
  // arrive as a string, a {topic, frequency, rationale} object, a
  // {question, ...} object, etc. Never falls back to JSON.stringify so
  // the panel can't leak raw JSON into the UI.
  const formatListItem = (t: any): { label: string; sub?: string } => {
    if (typeof t === 'string') return { label: t };
    if (!t || typeof t !== 'object') return { label: String(t ?? '') };
    const label =
      t.topic ?? t.question ?? t.title ?? t.name ?? t.label ?? t.text ?? '';
    const sub = t.rationale ?? t.detail ?? t.description ?? undefined;
    if (!label) return { label: '' };
    return { label: String(label), sub: sub ? String(sub) : undefined };
  };

  for (const f of listFields) {
    if (!data[f.key]) continue;
    mark(f.key);
    const items = Array.isArray(data[f.key]) ? data[f.key] : [data[f.key]];
    const formatted = items
      .map(formatListItem)
      .filter((it: { label: string }) => it.label.trim().length > 0);
    if (formatted.length === 0) continue;
    els.push(
      <div key={f.key}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: f.color }}>{f.label}</div>
        {f.pill ? (
          <div className="flex flex-wrap gap-1.5">
            {formatted.map((it: { label: string; sub?: string }, i: number) => (
              <Chip key={i} variant="default" title={it.sub}>{it.label}</Chip>
            ))}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {formatted.map((it: { label: string; sub?: string }, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: f.color }}>•</span>
                <span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{safeText(it.label)}</span>
                  {it.sub && <span className="ml-1.5 text-[var(--text-muted)]">— {safeText(it.sub)}</span>}
                </span>
              </li>
            ))}
          </ul>
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
          <ul className="space-y-1">{val.map((t: string, i: number) => <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>• {safeText(t)}</li>)}</ul>
        ) : typeof val === 'string' ? (
          <div className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}><Prose value={val} /></div>
        ) : (
          <div className="space-y-1">{Object.entries(val).map(([k, v]) => (
            <p key={k} className="text-sm"><strong className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>{k.replace(/([A-Z])/g, ' $1').trim()}: </strong><span style={{ color: 'var(--text-secondary)' }}>{safeText(v)}</span></p>
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
          <Chip key={i} variant="default"><strong>{a.term || a.abbr || a.name}</strong>: {a.definition || a.full || a.meaning}</Chip>
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

// Reads the CURRENT USER's prep cache only. readPrepRaw() is scoped by
// the logged-in user id and refuses a blob stamped for anyone else, so a
// shared browser can never seed one account's panel with another's prep.
// Unknown user (not yet hydrated) → null → empty INITIAL_STATE.
const loadPrepData = (): PrepData  => {
  try {
    const data = readPrepRaw() as PrepData | null;
    if (!data) return INITIAL_STATE;
    // Clean up any rawContent wrappers from previously cached data,
    // and migrate legacy single-string studyMaterials into studyDocs[].
    for (const company of Object.keys(data.data || {})) {
      data.data[company] = migrateStudyDocs(data.data[company]);
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
const savePrepData = (s: PrepData) => {
  writePrepRaw(s);
}

const UploadZone = ({ label, required, value, fileName, onUpload, onPaste: _onPaste, onClickOverride }: {
  label: string; required?: boolean; value: string; fileName?: string;
  onUpload: (file: File) => void; onPaste: (text: string) => void;
  onClickOverride?: () => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div
      className={`rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-[border-color,background-color,box-shadow] min-h-[120px] ${dragOver ? 'ring-2 ring-[var(--cam-primary)]' : ''}`}
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
          <span className="text-xs font-semibold w-full px-2 truncate text-center" style={{ color: 'var(--cam-primary)' }} data-tip={fileName}>{fileName || 'Content added'}</span>
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

const LUMORA_API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

const GitHubRepoFetcher = ({ onDocs }: { onDocs: (docs: StudyDoc[]) => void }) => {
  const { token } = useAuth();
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed || !token) return;
    setStatus('loading');
    setMsg('');
    try {
      const res = await fetch(`${LUMORA_API_URL}/api/v1/github/fetch-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus('error'); setMsg(data.error || 'Fetch failed'); return; }
      onDocs(data.docs || []);
      setStatus('done');
      setMsg(`Added ${data.docs?.length ?? 0} files from ${data.repoName}`);
      setUrl('');
    } catch (e: any) {
      setStatus('error');
      setMsg(e?.message || 'Network error');
    }
  };

  return (
    <div className="mb-3 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'var(--bg-elevated)' }}>
        {/* GitHub mark icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
        <input
          type="url"
          value={url}
          onChange={e => { setUrl(e.target.value); setStatus('idle'); setMsg(''); }}
          onKeyDown={e => { if (e.key === 'Enter') handleFetch(); }}
          placeholder="https://github.com/owner/repo"
          className="flex-1 bg-transparent text-[12px] outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          onClick={handleFetch}
          disabled={!url.trim() || status === 'loading'}
          className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide shrink-0 disabled:opacity-40 transition-opacity"
          style={{ background: 'var(--cam-primary)', color: '#fff' }}
        >
          {status === 'loading' ? '…' : 'Fetch'}
        </button>
      </div>
      {msg && (
        <div className="px-3 py-1.5 text-[10px]" style={{ color: status === 'error' ? 'var(--danger)' : '#00ea64', background: 'var(--bg-surface)' }}>
          {msg}
        </div>
      )}
    </div>
  );
}

/** Multi-document dropzone for Study Materials. Accepts multiple files at
 *  once (drag-drop or file picker), shows a chip per uploaded doc, and
 *  lets the user delete individual entries. */
const MultiUploadZone = ({ docs, onAdd, onRemove }: {
  docs: StudyDoc[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) onAdd(files);
  };

  return (
    <div className="space-y-2">
      <div
        className={`rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-[border-color,background-color,box-shadow] min-h-[120px] ${dragOver ? 'ring-2 ring-[var(--cam-primary)]' : ''}`}
        style={{ background: 'var(--bg-elevated)', border: `1px dashed ${dragOver ? 'var(--cam-primary)' : 'var(--border)'}` }}
        onClick={() => ref.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
      >
        <input
          ref={ref}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) onAdd(files);
            e.target.value = '';
          }}
        />
        <svg className="w-6 h-6 mb-2" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {docs.length ? 'Add more documents' : 'Drop files or click — multiple OK'}
        </span>
        <span className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          PDF, DOCX, TXT, MD — Sona will read every file
        </span>
      </div>
      {docs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {docs.map((d, i) => (
            <div
              key={`${d.name}-${i}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px]"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--cam-primary)', color: 'var(--cam-primary)' }}
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-semibold truncate max-w-[200px]" data-tip={d.name}>{d.name}</span>
              <span className="text-[9px] opacity-70">{d.content.length.toLocaleString()} ch</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                className="ml-1 opacity-60 hover:opacity-100"
                aria-label={`Remove ${d.name}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Parse JD text into structured sections and render beautifully */
const FormattedJD = ({ text }: { text: string }) => {
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
    // A line that reads as a full sentence (terminal punctuation, or simply
    // long) is body content even when it opens with a section keyword — e.g.
    // "Experience with cloud services and distributed data structures."
    // Without this guard such lines become empty, title-only JD cards.
    const looksLikeSentence = /[.!?]$/.test(t) || t.length > 55;
    if (SECTION_PATTERNS.some(p => p.test(t)) && !looksLikeSentence) return true;
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
  // Lines prefixed with a bullet marker (-, •, *, ◦, etc.) are real bullet
  // items. All other lines are paragraph text — we buffer consecutive
  // paragraph lines and join them with a space so word-wrapped source text
  // (common in Workday/Greenhouse scrapes) doesn't produce one bullet per
  // wrapped line with the right side left empty.
  type JDItem = { text: string; kind: 'bullet' | 'para' };
  const sections: { title: string | null; items: JDItem[] }[] = [];
  let current: { title: string | null; items: JDItem[] } = { title: null, items: [] };
  let paraBuffer: string[] = [];

  const flushPara = () => {
    if (paraBuffer.length > 0) {
      current.items.push({ text: paraBuffer.join(' '), kind: 'para' });
      paraBuffer = [];
    }
  };

  for (const t of linesForParser) {
    if (isHeader(t)) {
      flushPara();
      if (current.items.length > 0 || current.title) sections.push(current);
      current = { title: t, items: [] };
    } else if (/^[-•*◦‣▪▸·]\s/.test(t)) {
      flushPara();
      current.items.push({ text: t.replace(/^[-•*◦‣▪▸·]\s*/, ''), kind: 'bullet' });
    } else if (/^\d+[.)]\s/.test(t)) {
      flushPara();
      current.items.push({ text: t, kind: 'bullet' });
    } else {
      paraBuffer.push(t);
    }
  }
  flushPara();
  if (current.items.length > 0 || current.title) sections.push(current);

  // Hero promotion (job title)
  let heroTitle: string | null = null;
  if (sections.length > 0 && !sections[0].title && sections[0].items.length === 1 && sections[0].items[0].text.length < 100) {
    heroTitle = sections[0].items[0].text;
    sections.shift();
  }
  if (!heroTitle && sections.length > 0 && sections[0].title && sections[0].items.length === 0 && sections[0].title.length < 100) {
    heroTitle = sections[0].title;
    sections.shift();
  }

  // ─── Promote Compensation summary into the metadata row ───
  // The Compensation bucket holds full disclosure paragraphs; the row card
  // wants a tight value (salary range or first short line). Extract a $X–$Y
  // range when present, else fall back to the shortest bucket line.
  const compLines = bucketedLines.get('Compensation');
  if (compLines && compLines.length > 0) {
    let value: string | null = null;
    for (const l of compLines) {
      const m = l.match(/\$\s?[\d][\d,]*(?:\.\d+)?\s*[–\-‐‒—]\s*\$\s?[\d][\d,]*(?:\.\d+)?(?:\s*(?:USD|usd))?(?:\s*(?:per\s*year|\/\s*yr|\/\s*year|annually))?/);
      if (m) { value = m[0].replace(/\s+/g, ' ').trim(); break; }
    }
    if (!value) {
      const m = compLines.join(' ').match(/\$\s?[\d][\d,]*(?:\.\d+)?(?:\s*(?:USD|usd))?(?:\s*(?:per\s*year|\/\s*yr|\/\s*year|annually))?/);
      if (m) value = m[0].replace(/\s+/g, ' ').trim();
    }
    if (!value) value = [...compLines].sort((a, b) => a.length - b.length)[0];
    if (value && value.length > 80) value = value.slice(0, 77) + '…';
    if (value) metadata.push({ label: 'Compensation', value });
  }

  // ─── Build final content list: real sections first, then boilerplate buckets ───
  type ContentSection = { title: string | null; items: JDItem[]; color?: 'warning' | 'success' | 'muted' };
  const content: ContentSection[] = [...sections];
  for (const b of BUCKETS) {
    const rawItems = bucketedLines.get(b.title);
    if (rawItems && rawItems.length > 0) {
      content.push({ title: b.title, items: rawItems.map(t => ({ text: t, kind: 'para' as const })), color: b.color });
    }
  }

  // Render the JD as scannable bullet points: split each paragraph into
  // sentences and promote every one to its own bullet (common abbreviations
  // like "e.g." / "Ph.D." / "U.S." are shielded from the split). Existing
  // bullet / numbered items pass through untouched. Any card that ends up
  // with no body (a stray heading) is dropped so no empty cards render.
  const splitSentences = (raw: string): string[] => {
    const ABBR = /^(e\.g|i\.e|etc|vs|approx|Dr|Mr|Mrs|Ms|Ph\.D|U\.S|Inc|Ltd|Corp|Sr|Jr|No)$/i;
    const s = String(raw);
    const out: string[] = [];
    let buf = '';
    for (let i = 0; i < s.length; i++) {
      buf += s[i];
      if (/[.!?]/.test(s[i])) {
        const rest = s.slice(i + 1);
        const nextChar = (rest.match(/\S/) || [''])[0];
        const brokeOnSpace = rest.length === 0 || /^\s/.test(rest);
        if (brokeOnSpace && /[A-Z("“]/.test(nextChar)) {
          const lastWord = (buf.trim().match(/(\S+)[.!?]$/) || ['', ''])[1];
          if (!ABBR.test(lastWord)) { out.push(buf.trim()); buf = ''; }
        }
      }
    }
    if (buf.trim()) out.push(buf.trim());
    return out.filter(Boolean);
  };
  const bulleted: ContentSection[] = content
    .map((sec) => {
      const items: JDItem[] = [];
      for (const it of sec.items) {
        if (it.kind === 'para') {
          for (const sentence of splitSentences(it.text)) items.push({ text: sentence, kind: 'bullet' });
        } else {
          items.push(it);
        }
      }
      return { ...sec, items };
    })
    .filter((sec) => sec.items.length > 0);

  // Section type → glyph. The chrome is identical across every section
  // (navy strip + gold-leaf border + glassy pill label, per docs design
  // system); the glyph + uppercase title is what distinguishes a section
  // visually. No rainbow accents — every JD card reads as part of the
  // same illuminated-manuscript family.
  const iconForSection = (title: string | null, explicitTone?: string): string => {
    if (explicitTone === 'success') return '$';   // compensation
    if (explicitTone === 'warning') return '⚑';   // application / deadline
    if (explicitTone === 'muted')   return '·';   // boilerplate
    if (!title) return '◆';
    const t = title.toLowerCase();
    if (/(about|company|who\s+we\s+are|overview|introduction)/i.test(t)) return '◆';
    if (/(responsib|what\s+you'?ll?\s+do|key\s+role|day[- ]to[- ]day)/i.test(t)) return '▸';
    if (/(requirement|qualification|must\s+have|what\s+we\s+need|what\s+we\s+expect)/i.test(t)) return '◉';
    if (/(preferred|nice\s+to\s+have|bonus|stand\s+out|plus)/i.test(t)) return '★';
    if (/(benefit|perk|what\s+we\s+offer|reward)/i.test(t)) return '✦';
    if (/(tech\s+stack|technolog|tool|stack)/i.test(t)) return '⬢';
    if (/(experience|skill|expertise)/i.test(t)) return '⌘';
    if (/(team|culture|values)/i.test(t)) return '◈';
    return '·';
  };

  // Shared chrome for every JD card — navy left strip, gold-leaf border,
  // soft navy→gold gradient bg, gentle inner glow. Unified across hero,
  // metadata, and every parsed section so the JD reads as one piece of
  // illuminated manuscript instead of a rainbow.
  const cardChrome: React.CSSProperties = {
    background:
      'linear-gradient(135deg, rgba(38,97,156,0.04) 0%, rgba(201,162,39,0.05) 100%)',
    border: '1px solid var(--cam-gold-leaf)',
    boxShadow:
      '0 1px 0 color-mix(in srgb, var(--cam-gold-leaf) 18%, transparent),' +
      ' 0 8px 24px -16px rgba(38,97,156,0.18),' +
      ' inset 0 1px 0 rgba(255,255,255,0.35)',
  };

  // Single column flow — the multi-column grid we tried earlier hurt
  // readability across web / desktop / mobile (cards squashed, bullets
  // truncated, hierarchy lost). Reverted to a clean vertical stack;
  // each card already wears the unified navy/gold/glassy chrome.
  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {heroTitle && (
        <div
          className="relative rounded-2xl overflow-hidden px-6 py-6"
          style={cardChrome}
        >
          <NavyStrip />
          <Chip variant="gold" className="mb-3">Position</Chip>
          <h3
            className="text-[22px] md:text-[26px] font-extrabold leading-tight tracking-tight"
            style={{ color: 'var(--cam-primary)' }}
          >
            {heroTitle}
          </h3>
        </div>
      )}

      {metadata.length > 0 && (
        <div
          className="relative rounded-2xl px-5 py-4 grid gap-x-6 gap-y-4 overflow-hidden"
          style={{
            ...cardChrome,
            // Inner metadata pairs flow at minmax 180 — these ARE small
            // labels (Location / Compensation / Posted On) so a couple
            // sit side-by-side comfortably without hurting readability.
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}
        >
          <NavyStrip />
          {metadata.map((m, i) => (
            <div key={i} className="flex items-start gap-2.5 min-w-0">
              <span
                className="flex-shrink-0 inline-flex items-center justify-center rounded-lg mt-0.5"
                style={{
                  width: 28,
                  height: 28,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--cam-gold-leaf)',
                }}
              >
                <span
                  className="block"
                  style={{
                    width: 10,
                    height: 10,
                    background: 'var(--cam-gold-leaf)',
                    clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                  }}
                />
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span
                  className="text-[10px] font-extrabold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--cam-gold-leaf-text)' }}
                >
                  {m.label.replace(/^[a-z]/, (ch) => ch.toUpperCase())}
                </span>
                <span
                  className="text-[13.5px] font-semibold truncate"
                  style={{ color: 'var(--text-primary)' }}
                  data-tip={m.value}
                >
                  {m.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {bulleted.map((sec, i) => {
        const tone = (sec as any).color as 'warning' | 'success' | 'muted' | undefined;
        const icon = iconForSection(sec.title, tone);
        return (
          <div
            key={i}
            className="relative rounded-2xl overflow-hidden"
            style={cardChrome}
          >
            <NavyStrip />
            {sec.title && (
              <div
                className="px-5 py-3 flex items-center gap-3"
                style={{
                  borderBottom: '1px solid color-mix(in srgb, var(--cam-gold-leaf) 30%, transparent)',
                }}
              >
                <Chip variant="gold" className="gap-2">
                  <span aria-hidden style={{ fontSize: 11 }}>{icon}</span>
                  {sec.title.replace(/^[a-z]/, (c) => c.toUpperCase())}
                </Chip>
                <span className="flex-1" />
                <span
                  className="text-[10px] font-mono font-bold"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {String(sec.items.length).padStart(2, '0')}
                </span>
              </div>
            )}
            <div className="px-5 py-4 flex flex-col gap-1.5">
              {sec.items.map((item, j) => {
                if (item.kind === 'para') {
                  return (
                    <p key={j} className="text-[13px] leading-[1.65] mb-0.5" style={{ color: 'var(--text-primary)' }}>
                      {item.text}
                    </p>
                  );
                }
                const isNumberedHeading = /^\d+[.)]\s/.test(item.text);
                if (isNumberedHeading) {
                  return (
                    <div
                      key={j}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md mt-2 first:mt-0"
                      style={{
                        background: 'rgba(0,71,171,0.18)',
                        border: '1px solid rgba(0,71,171,0.35)',
                      }}
                    >
                      <span
                        className="flex-shrink-0"
                        style={{
                          width: 6,
                          height: 6,
                          background: 'var(--cam-gold-leaf)',
                          borderRadius: '50%',
                        }}
                      />
                      <p
                        className="text-[13px] leading-[1.6] font-semibold"
                        style={{ color: 'var(--cam-gold-leaf-text)' }}
                      >
                        {item.text}
                      </p>
                    </div>
                  );
                }
                return (
                  <div key={j} className="flex items-start gap-2 pl-8">
                    <span
                      className="flex-shrink-0 mt-[6px]"
                      style={{
                        width: 5,
                        height: 5,
                        background: 'var(--cam-gold-leaf)',
                        borderRadius: '50%',
                      }}
                    />
                    <p
                      className="text-[13px] leading-[1.65]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {item.text}
                    </p>
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

// Left navy accent bar removed per user request — the vertical blue lines on
// the Job Description cards were distracting. Kept as a no-op so the three call
// sites don't need touching; the `pl-7` that reserved space for it was reduced
// to `pl-5`.
const NavyStrip = () => null;

export const LumoraDocsPanel = ({ onClose: _onClose }: { onClose?: () => void }) => {
  const { token } = useAuth();
  // Cloud-platform choice for prep-section generation. Sent to the backend
  // so the LLM names services correctly (Cosmos DB vs DynamoDB) instead of
  // relying on render-time substitution alone.
  const [cloudProvider] = useCloudProvider();
  const [prepData, setPrepData] = useState<PrepData>(loadPrepData);
  const [activeSection, setActiveSection] = useState('input');
  // Mobile sidebar collapse — on phones the sidebar (10 section
  // labels + company dropdown + Generate / Download buttons)
  // stacked above the content takes ~80% of the viewport, leaving
  // ~10% for the actual section content. The flag below collapses
  // the sidebar to a single-row chip when a section is being read,
  // and the user taps a chevron to re-open the full list.
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sectionStatus, setSectionStatus] = useState<Record<string, 'pending' | 'generating' | 'done' | 'error'>>({});
  const [selectedSections, setSelectedSections] = useState<string[]>(() => ['pitch', 'hr', 'hiring-manager', 'coding', 'system-design', 'behavioral', 'techstack']);
  const [showArchived, setShowArchived] = useState(false);
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

  // Tracks whether the initial backend hydration has run. We only enable
  // write-through after hydration so we don't overwrite the server with
  // an empty/stale local state on first render.
  const hydratedRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const writeTimerRef = useRef<number | null>(null);
  const autoGenerateRef = useRef(false);

  const formatSyncError = (err: unknown): string => {
    if (err && typeof err === 'object') {
      const e = err as { status?: number; message?: string };
      if (typeof e.status === 'number') return `HTTP ${e.status} — ${e.message || 'request failed'}`;
      if (e.message) return String(e.message);
    }
    return String(err);
  };

  // Hydrate from backend on mount — gives Sona access to materials
  // uploaded on a different device or after browser data was cleared.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await prepAPI.getState(token);
        if (cancelled) return;
        const remoteHasData = r.data && typeof r.data === 'object' && Object.keys(r.data as object).length > 0;
        if (remoteHasData) {
          // Server payload predates the studyDocs[] schema, so run every
          // company through migrateStudyDocs() before committing to state
          // — otherwise renders that touch state.studyDocs.length crash.
          const remote = r.data as PrepData;
          for (const company of Object.keys(remote.data || {})) {
            remote.data[company] = migrateStudyDocs(remote.data[company]);
          }
          setPrepData(remote);
        } else {
          // Server has nothing for this user yet but local already has
          // companies/JD/resume from a previous session. Push the local
          // copy up now — without this nudge, the write-through effect
          // never fires (it keys on prepData changes, and hydration
          // completing isn't a prepData change), so cross-device sync
          // would silently never start.
          //
          // Guard: only backfill when local has SUBSTANTIVE content
          // (any company with a non-empty JD, resume, prepMaterials,
          // coverLetter, or studyDocs). Without this guard, a
          // transient backend hiccup that returned `{ data: null }`
          // would let the auto-create effect's "My Interview" empty
          // doc be PUT'd up, wiping the user's real prep on the
          // server. Counting "any company key exists" wasn't enough
          // because the auto-create runs after this hydrate's first
          // paint with exactly one empty company.
          // Ownership guard (defense in depth): only ever backfill a local
          // cache that is stamped for THIS user. readPrepRaw() returns null
          // for a missing cache or one owned by a different account, so a
          // shared browser can never push the previous user's prep into this
          // user's server row — the leak that made another user's kit appear
          // under a fresh account.
          const ownLocal = readPrepRaw();
          const hasSubstantiveContent = (() => {
            if (!ownLocal?.data) return false;
            for (const c of Object.values(ownLocal.data as Record<string, DocState>)) {
              if (!c) continue;
              const anyText = [c.jd, c.resume, c.coverLetter, c.prepMaterials]
                .some((s) => typeof s === 'string' && s.trim().length > 0);
              const anyDocs = Array.isArray(c.studyDocs) && c.studyDocs.length > 0;
              const anySections = c.sections && Object.keys(c.sections).some((k) => c.sections[k] != null);
              if (anyText || anyDocs || anySections) return true;
            }
            return false;
          })();
          if (hasSubstantiveContent) {
            setSyncStatus('saving');
            try {
              await prepAPI.putState(token, prepData);
              if (!cancelled) { setSyncStatus('saved'); setSyncError(null); }
            } catch (err) {
              console.warn('[prep] initial backfill failed', err);
              if (!cancelled) { setSyncStatus('error'); setSyncError(formatSyncError(err)); }
            }
          } else {
            console.info('[prep] skipping backfill — local payload is empty / placeholder');
          }
        }
      } catch (err) {
        // Backend offline — fall back to localStorage that's already loaded.
        console.warn('[prep] hydrate failed, using localStorage', err);
      } finally {
        hydratedRef.current = true;
        setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    savePrepData(prepData);
    // Notify in-tab listeners (ContextBadge, etc.) — the storage event
    // doesn't fire in the tab that wrote the value.
    try { window.dispatchEvent(new CustomEvent('lumora:context-updated')); } catch {}

    // Debounced write-through to the backend. Skip until hydration has
    // run (first render after mount would otherwise PUT the empty
    // initial state and clobber the server copy).
    if (!hydratedRef.current || !token) return;
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    setSyncStatus('saving');
    writeTimerRef.current = window.setTimeout(async () => {
      try {
        await prepAPI.putState(token, prepData);
        setSyncStatus('saved');
        setSyncError(null);
      } catch (err) {
        console.warn('[prep] write-through failed', err);
        setSyncStatus('error');
        setSyncError(formatSyncError(err));
      }
    }, 1500);
  }, [prepData, token]);

  const [searchParams] = useSearchParams();

  // When arriving from /jobs/:id/prepare with ?company=X&role=Y&autoprep=1,
  // auto-create or switch to that company and seed JD + resume from sessionStorage.
  useEffect(() => {
    const urlCompany = searchParams.get('company');
    if (!urlCompany) return;
    const autoprep = searchParams.get('autoprep') === '1';
    let seedJd = '';
    if (autoprep) {
      try {
        const ctx = JSON.parse(sessionStorage.getItem('camora_job_prep_ctx') || '{}');
        seedJd = ctx.jd || '';
      } catch { /* ignore */ }
      sessionStorage.removeItem('camora_job_prep_ctx');
    }
    setPrepData(prev => {
      const existing = prev.companies.includes(urlCompany);
      const baseDoc = existing ? (prev.data[urlCompany] || EMPTY_DOC) : { ...EMPTY_DOC };
      const jd = baseDoc.jd.trim() ? baseDoc.jd : seedJd;
      // Carry over resume from any existing company that already has one
      const borrowedResume = (Object.values(prev.data) as DocState[]).find(d => d?.resume?.trim())?.resume || '';
      const resume = baseDoc.resume.trim() ? baseDoc.resume : borrowedResume;
      const newDoc = seedJd ? { ...baseDoc, jd, resume } : baseDoc;
      return {
        ...prev,
        companies: existing ? prev.companies : [...prev.companies, urlCompany],
        activeCompany: urlCompany,
        data: { ...prev.data, [urlCompany]: existing ? (seedJd ? newDoc : baseDoc) : newDoc },
      };
    });
    setActiveSection('input');
    if (seedJd) autoGenerateRef.current = true;
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-create default company if none exists
  useEffect(() => {
    if (prepData.companies.length === 0) {
      setPrepData(prev => ({
        ...prev,
        companies: ['My Session'],
        activeCompany: 'My Session',
        data: { ...prev.data, 'My Session': { ...EMPTY_DOC } },
      }));
    } else if (!prepData.activeCompany && prepData.companies.length > 0) {
      setPrepData(prev => ({ ...prev, activeCompany: prev.companies[0] }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get active company's doc state. Run through migrateStudyDocs every
  // read so any older payload that slipped past the loader/hydrate (e.g.
  // a company entry created before the studyDocs schema landed) still
  // exposes an array, not undefined.
  const state = migrateStudyDocs(
    prepData.activeCompany ? (prepData.data[prepData.activeCompany] || EMPTY_DOC) : EMPTY_DOC
  );
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

  const archiveCompany = (name: string) => {
    setPrepData(prev => {
      const newCompanies = prev.companies.filter(c => c !== name);
      const archived = [...(prev.archivedCompanies || []), name];
      const next = { ...prev, companies: newCompanies, archivedCompanies: archived, activeCompany: newCompanies[0] || null };
      if (token) prepAPI.putState(token, next).catch(() => {});
      return next;
    });
  };

  const unarchiveCompany = (name: string) => {
    setPrepData(prev => {
      const archived = (prev.archivedCompanies || []).filter(c => c !== name);
      const next = { ...prev, companies: [...prev.companies, name], archivedCompanies: archived, activeCompany: name };
      if (token) prepAPI.putState(token, next).catch(() => {});
      return next;
    });
  };

  const deleteCompany = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    setPrepData(prev => {
      const newCompanies = prev.companies.filter(c => c !== name);
      const newData = { ...prev.data };
      delete newData[name];
      const next = { ...prev, companies: newCompanies, activeCompany: newCompanies[0] || null, data: newData };
      if (token) {
        prepAPI.putState(token, next).catch(() => {});
        fetch(`${API_URL}/api/v1/prep-docs/company/${encodeURIComponent(slug)}`, {
          method: 'DELETE',
          headers: getAuthHeaders() as Record<string, string>,
          credentials: 'include',
        }).catch(() => {});
      }
      return next;
    });
  };

  const uploadToResearchDocs = useCallback((file: File) => {
    const slug = (prepData.activeCompany || 'general')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('company_slug', slug);
    fetch(`${API_URL}/api/v1/prep-docs/upload`, {
      method: 'POST',
      headers: getAuthHeaders() as Record<string, string>,
      credentials: 'include',
      body: fd,
    }).catch(() => {});
  }, [prepData.activeCompany]);

  // Reset generation visual state when the user switches companies so that
  // an in-progress generation for Company A doesn't bleed its spinner/status
  // into Company B's sidebar. The actual async work for Company A continues
  // writing to Company A's section data (closed over at call time).
  useEffect(() => {
    setGenerating(false);
    setSectionStatus({});
  }, [prepData.activeCompany]);

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
    // Capture a backend-sent error (daily limit, auth, generation failure)
    // instead of swallowing it — previously the error was thrown inside the
    // JSON.parse try/catch and eaten, so every failure surfaced as the
    // useless "No content received". Surface the real message instead.
    let streamError: string | null = null;

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
          else if (parsed.error) streamError = String(parsed.error);
        } catch {}
      }
    }
    // Process remaining buffer — done event often lands here
    if (buffer.trim().startsWith('data: ')) {
      try {
        const parsed = JSON.parse(buffer.trim().slice(6));
        if (parsed.done && parsed.result) result = parsed.result;
        else if (parsed.chunk) chunks += parsed.chunk;
        else if (parsed.error) streamError = String(parsed.error);
      } catch {}
    }

    if (result) return formatPrepContent(result);
    if (streamError) return { __error: streamError };
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
        body: JSON.stringify({
          section,
          // The selected company (dropdown label, e.g. "Coupang-Infra"). Without
          // this the backend can't extract a company from most JDs and the LLM
          // emits "target company name was not provided" across every section
          // (and leaks [Company Name] placeholders into the pitch). This is the
          // single field that unblocks HR questions, company insights, and the
          // elevator pitch.
          companyName: prepData.activeCompany || undefined,
          jobDescription: state.jd,
          resume: state.resume,
          coverLetter: state.coverLetter,
          // Key must be `prepMaterials` (plural) — the backend reads that; the
          // old singular `prepMaterial` was silently dropped.
          prepMaterials: state.prepMaterials,
          // Backend reads `documentation` as a {name,content}[] array and
          // injects every entry into the prompt — see ascendPrep.js.
          documentation: state.studyDocs,
          // Cloud platform — picked once via useCloudProvider, applied by
          // the backend to system-design / coding / techstack sections.
          cloudProvider,
        }),
      });

      if (!res.ok) {
        setSectionStatus(prev => ({ ...prev, [section]: 'error' }));
        setState(prev => ({ ...prev, sections: { ...prev.sections, [section]: { summary: `Error ${res.status}: ${res.statusText || 'Failed'}` } } }));
        return;
      }

      const content = await readSSE(res);
      if (content && (content as any).__error) {
        // Backend told us why (daily limit, auth, generation failure) — show it.
        setState(prev => ({ ...prev, sections: { ...prev.sections, [section]: { summary: (content as any).__error } } }));
        setSectionStatus(prev => ({ ...prev, [section]: 'error' }));
        return;
      }
      setState(prev => ({ ...prev, sections: { ...prev.sections, [section]: content || { summary: `No content received for ${label}` } } }));
      setSectionStatus(prev => ({ ...prev, [section]: content ? 'done' : 'error' }));
    } catch {
      setSectionStatus(prev => ({ ...prev, [section]: 'error' }));
      setState(prev => ({ ...prev, sections: { ...prev.sections, [section]: { summary: `Error generating ${label}` } } }));
    }
  }, [state.jd, state.resume, state.coverLetter, state.prepMaterials, state.studyDocs, token, cloudProvider, prepData.activeCompany]);

  /** Generate ALL sections in parallel — each runs independently */
  const handleGenerate = useCallback(async () => {
    if (!state.jd.trim() || !state.resume.trim() || !token) return;
    const toGenerate = selectedSections.length > 0 ? selectedSections : GENERATE_SECTIONS;
    setGenerating(true);
    const initStatus: Record<string, 'pending' | 'generating' | 'done' | 'error'> = {};
    toGenerate.forEach(s => { initStatus[s] = 'generating'; });
    setSectionStatus(prev => ({ ...prev, ...initStatus }));

    // Bounded concurrency: each section is one Gemini call server-side, and the
    // free tier rate-limits bursts. Run a small pool (was: all-at-once, which
    // 429'd every section but the first) so every section actually completes.
    const POOL = 4;
    const queue = [...toGenerate];
    const worker = async () => {
      while (queue.length) {
        const s = queue.shift();
        if (s) await generateOneSection(s);
      }
    };
    await Promise.allSettled(Array.from({ length: Math.min(POOL, queue.length) }, worker));
    setGenerating(false);
  }, [state.jd, state.resume, state.coverLetter, state.prepMaterials, state.studyDocs, token, generateOneSection, selectedSections]);

  /** Re-generate a single section */
  const regenerateSection = useCallback(async (section: string) => {
    await generateOneSection(section);
  }, [generateOneSection]);

  /** Build the title + ordered section list for download. */
  const buildDownloadPayload = useCallback(() => {
    const company = prepData.activeCompany || 'Company';
    const generated = SIDEBAR_SECTIONS
      .filter((s) => s.id !== 'input' && s.id !== 'jd-view' && state.sections[s.id])
      .map((s) => ({ id: s.id, label: s.label, content: state.sections[s.id] }));
    return { title: `${company} — Prep`, sections: sectionsToPrepSections(generated) };
  }, [prepData.activeCompany, state.sections]);

  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  const handleDownload = useCallback(async (kind: 'pdf' | 'docx') => {
    if (downloading) return;
    const { title, sections } = buildDownloadPayload();
    if (sections.length === 0) {
      setDownloadMsg('Generate at least one section first');
      setTimeout(() => setDownloadMsg(null), 3000);
      return;
    }
    setDownloading(kind);
    setDownloadMsg(null);
    const fn = kind === 'pdf' ? downloadPrepAsPdf : downloadPrepAsDocx;
    const result = await fn(title, sections);
    setDownloading(null);
    if (result.ok) {
      setDownloadMsg(`Saved as ${kind.toUpperCase()}`);
    } else if (result.error) {
      setDownloadMsg(`Failed: ${result.error}`);
    }
    if (result.ok || result.error) setTimeout(() => setDownloadMsg(null), 2500);
  }, [downloading, buildDownloadPayload]);

  const generatedCount = SIDEBAR_SECTIONS.filter((s) => s.id !== 'input' && s.id !== 'jd-view' && state.sections[s.id]).length;

  const hasRequiredDocs = state.jd.trim().length > 0 && state.resume.trim().length > 0;

  // Auto-trigger generation when arriving from a job page with JD pre-seeded
  // and resume is available (either carried over or already saved).
  useEffect(() => {
    if (autoGenerateRef.current && hasRequiredDocs && !generating) {
      autoGenerateRef.current = false;
      handleGenerate();
    }
  }, [hasRequiredDocs, generating, handleGenerate]);

  // Active section's display name — used for the mobile collapsed
  // chip so the user can tell what they're reading without expanding
  // the full sidebar.
  const activeSectionLabel = SIDEBAR_SECTIONS.find(s => s.id === activeSection)?.label || 'Section';

  return (
    <div className="h-full flex flex-col sm:flex-row" style={{ background: 'var(--bg-surface)' }}>
      {/* Mobile collapsed-sidebar pill — only shows when the sidebar is
          collapsed on phones. Tap to expand. The desktop sidebar at
          sm:w-[180px] stays visible always; this pill is mobile-only. */}
      {!mobileSidebarOpen && (
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="sm:hidden flex items-center justify-between gap-2 px-3 py-2 shrink-0"
          style={{
            background: 'var(--cam-hero-strip)',
            borderBottom: '2px solid var(--cam-gold-leaf)',
          }}
          aria-expanded="false"
          aria-label="Open prep sections"
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cam-strip-text-muted)] shrink-0">Section</span>
            <span className="text-[12px] font-bold text-[var(--cam-strip-heading)] truncate">{activeSectionLabel}</span>
          </span>
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--cam-strip-text)] shrink-0">
            Sections
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
      )}

      {/* Sidebar — collapsed-out on mobile by default. Auto-shows on
          ≥sm screens via sm:flex. */}
      <div
        className={`${mobileSidebarOpen ? 'flex' : 'hidden'} sm:flex w-full sm:w-[180px] flex-col shrink-0 sm:shrink-0`}
        style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
      >
        {/* LeetCode-style sidebar header */}
        <div className="px-3 py-3" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[var(--cam-strip-heading)]" style={{ fontFamily: "var(--font-sans)" }}>Prep</h2>
            {/* Mobile-only collapse button so users can dismiss the
                sidebar without picking a different section. Hidden on
                ≥sm where the sidebar is permanent chrome. */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="sm:hidden shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-[color-mix(in_oklab,var(--text-primary)_12%,transparent)]"
              style={{ color: 'var(--cam-strip-text)' }}
              aria-label="Close sections"
              data-tip="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            {/* Sync indicator — proves writes are reaching the lumora
                backend (lumora_prep_state). "Saved" means the JD/resume/
                companies have landed in Postgres and will be available
                on the webapp / any other device after sign-in. */}
            <span
              className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
              data-tip={
                !token ? 'Not signed in — changes are local-only and will not appear on the webapp.'
                  : syncStatus === 'saving' ? 'Writing to lumora_prep_state…'
                  : syncStatus === 'saved'  ? 'Synced to backend. Reachable from any device while signed in.'
                  : syncStatus === 'error'  ? 'Sync failed. Open the dev tools console (View → Toggle Developer Tools) for details. Local copy is preserved.'
                  : 'Idle'
              }
              style={{
                color:
                  !token ? 'var(--cam-strip-text-muted)'
                  : syncStatus === 'error'  ? '#FCA5A5'
                  : syncStatus === 'saving' ? 'var(--cam-strip-text)'
                  : syncStatus === 'saved'  ? '#A7F3D0'
                  : 'var(--cam-strip-text-muted)',
              }}
            >
              <span
                aria-hidden="true"
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{
                  background:
                    !token ? 'var(--cam-strip-icon-border)'
                    : syncStatus === 'error'  ? '#F87171'
                    : syncStatus === 'saving' ? '#FCD34D'
                    : syncStatus === 'saved'  ? '#3B82B9'
                    : 'var(--cam-strip-icon-border)',
                }}
              />
              {!token ? 'Local only' : syncStatus === 'saving' ? 'Saving…' : syncStatus === 'saved' ? 'Saved' : syncStatus === 'error' ? 'Sync failed' : 'Idle'}
            </span>
          </div>
          {syncStatus === 'error' && syncError && (
            <p
              className="text-[9px] mt-1 leading-snug break-all"
              style={{ color: '#FCA5A5', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
              data-tip={syncError}
            >
              {syncError}
            </p>
          )}
          {/* The new-company input must take priority over the dropdown.
              Auto-init sets activeCompany = "My Session" on first mount,
              so without this hoist the dropdown branch always wins and
              clicking "+ Add Company" inside the dropdown silently sets
              showNewCompany=true with no visible change. */}
          {showNewCompany ? (
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
          ) : prepData.activeCompany ? (
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
                  <div
                    className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl overflow-hidden"
                    style={{
                      background: 'color-mix(in srgb, var(--bg-surface) 96%, var(--cam-primary) 4%)',
                      border: '1px solid var(--cam-gold-leaf)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)',
                    }}
                  >
                    {prepData.companies.map(c => (
                      <button key={c} onClick={() => switchCompany(c)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors hover:bg-[color-mix(in_oklab,var(--text-primary)_7%,transparent)]"
                        style={{ color: c === prepData.activeCompany ? 'var(--cam-gold-leaf-text)' : 'var(--text-primary)', background: c === prepData.activeCompany ? 'color-mix(in srgb, var(--cam-gold-leaf) 15%, transparent)' : 'transparent' }}>
                        <span className="truncate font-medium">{c}</span>
                        <button onClick={(e) => { e.stopPropagation(); archiveCompany(c); }}
                          className="p-0.5 rounded opacity-40 hover:opacity-100" data-tip="Archive" style={{ color: 'var(--text-muted)' }}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" /></svg>
                        </button>
                      </button>
                    ))}
                    {(prepData.archivedCompanies || []).length > 0 && (
                      <div style={{ borderTop: '1px solid color-mix(in srgb, var(--border) 60%, transparent)' }}>
                        <button onClick={(e) => { e.stopPropagation(); setShowArchived(v => !v); }}
                          className="w-full px-3 py-1.5 text-[10px] text-left flex items-center gap-1 opacity-60 hover:opacity-100"
                          style={{ color: 'var(--text-muted)' }}>
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" /></svg>
                          Archived ({(prepData.archivedCompanies || []).length})
                          <span style={{ marginLeft: 'auto' }}>{showArchived ? '▲' : '▼'}</span>
                        </button>
                        {showArchived && (prepData.archivedCompanies || []).map(c => (
                          <button key={c} onClick={(e) => { e.stopPropagation(); unarchiveCompany(c); }}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] text-left hover:bg-[color-mix(in_oklab,var(--text-primary)_7%,transparent)]"
                            style={{ color: 'var(--text-muted)' }} data-tip="Click to restore">
                            <span className="truncate italic">{c}</span>
                            <span className="text-[9px] opacity-60">Restore</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <button onClick={() => { setShowDropdown(false); setShowNewCompany(true); setTimeout(() => newCompanyRef.current?.focus(), 100); }}
                      className="w-full px-3 py-2 text-xs font-bold text-left flex items-center gap-1.5"
                      style={{ color: 'var(--cam-gold-leaf-text)', borderTop: '1px solid color-mix(in srgb, var(--cam-gold-leaf) 30%, transparent)', background: 'color-mix(in srgb, var(--cam-gold-leaf) 8%, transparent)' }}>
                      <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add Company
                    </button>
                  </div>
                </>
              )}
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
              <button key={s.id} onClick={() => { setActiveSection(s.id); setMobileSidebarOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors text-xs font-medium"
                style={{
                  background: isActive
                    ? 'color-mix(in srgb, var(--cam-gold-leaf) 12%, var(--bg-elevated))'
                    : 'transparent',
                  color: isActive ? 'var(--cam-primary)' : 'var(--text-muted)',
                  borderLeft: isActive
                    ? `3px solid var(--cam-primary)`
                    : '3px solid transparent',
                  borderRight: isActive
                    ? `1px solid var(--cam-gold-leaf)`
                    : '1px solid transparent',
                }}>
                {/* Status indicator — gold leaf when done, gold-leaf
                    spinner when generating, danger red on error,
                    neutral border tone when empty. No rainbow per
                    section. */}
                {sectionStatus[s.id] === 'generating' ? (
                  <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin shrink-0" style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }} />
                ) : sectionStatus[s.id] === 'done' || hasContent ? (
                  <div className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center" style={{ background: 'var(--cam-gold-leaf)' }}>
                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : sectionStatus[s.id] === 'error' ? (
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: 'var(--danger)' }} />
                ) : (
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--border)' }} />
                )}
                <span className="flex-1">{s.label}</span>
                {sectionStatus[s.id] === 'pending' && generating && (
                  <Chip variant="default" className="text-[8px]">queued</Chip>
                )}
                {GENERATE_SECTIONS.includes(s.id) && !generating && (() => {
                  const checked = selectedSections.includes(s.id);
                  return (
                    <span
                      role="checkbox"
                      aria-checked={checked}
                      onClick={(e) => { e.stopPropagation(); setSelectedSections(prev => checked ? prev.filter(x => x !== s.id) : [...prev, s.id]); }}
                      className="shrink-0 flex items-center justify-center transition-all"
                      style={{
                        width: 15, height: 15, borderRadius: 4, cursor: 'pointer', flexShrink: 0,
                        background: checked ? 'var(--cam-primary)' : 'var(--bg-surface)',
                        border: `1.5px solid ${checked ? 'var(--cam-primary)' : 'color-mix(in srgb, var(--border) 100%, transparent)'}`,
                        boxShadow: checked ? '0 0 0 2px color-mix(in srgb, var(--cam-primary) 20%, transparent)' : 'none',
                      }}>
                      {checked && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                  );
                })()}
              </button>
            );
          })}

          {/* Select All / Deselect All — icon-only row below Tech Stack */}
          {!generating && (
            <div className="flex gap-1.5 px-3 pt-1 pb-0.5">
              <button
                data-tip="Select all sections"
                onClick={() => setSelectedSections([...GENERATE_SECTIONS])}
                disabled={selectedSections.length === GENERATE_SECTIONS.length}
                className="flex-1 flex items-center justify-center py-1.5 rounded-md transition-all active:scale-[0.97] disabled:opacity-30"
                style={{ background: 'color-mix(in srgb, var(--cam-primary) 12%, var(--bg-elevated))', border: '1px solid color-mix(in srgb, var(--cam-primary) 35%, transparent)' }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: 'var(--cam-primary)' }}>
                  <rect x="1" y="1" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M3.5 6.5L5.5 8.5L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                data-tip="Deselect all sections"
                onClick={() => setSelectedSections([])}
                disabled={selectedSections.length === 0}
                className="flex-1 flex items-center justify-center py-1.5 rounded-md transition-all active:scale-[0.97] disabled:opacity-30"
                style={{ background: 'color-mix(in srgb, var(--cam-primary) 12%, var(--bg-elevated))', border: '1px solid color-mix(in srgb, var(--cam-primary) 35%, transparent)' }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: 'var(--cam-primary)' }}>
                  <rect x="1" y="1" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M4 6.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Bottom action panel */}
        <div className="p-3 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>

          {/* Progress bar — only while generating */}
          {generating && (() => {
            // Clamp: `done` can exceed selectedSections.length (stale/extra
            // section statuses), which showed >100% and a wrong X/Y.
            const done = Object.values(sectionStatus).filter(s => s === 'done').length;
            const total = Math.max(selectedSections.length, done, 1);
            return (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>Generating…</span>
                <span className="text-[9px] font-bold tabular-nums" style={{ color: 'var(--cam-primary)' }}>
                  {done}/{total}
                </span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (done / total) * 100)}%`, background: 'var(--cam-primary)' }} />
              </div>
            </div>
            );
          })()}

          {/* Cloud provider */}
          <div className="flex justify-center">
            <CloudProviderSelector variant="compact" />
          </div>


          {/* Generate CTA */}
          <button
            onClick={handleGenerate}
            disabled={!hasRequiredDocs || generating || selectedSections.length === 0}
            className="w-full py-2.5 text-xs font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, var(--cam-primary) 0%, color-mix(in srgb, var(--cam-primary) 80%, #7c3aed) 100%)',
              color: '#fff',
              boxShadow: hasRequiredDocs && !generating && selectedSections.length > 0 ? '0 2px 12px color-mix(in srgb, var(--cam-primary) 40%, transparent)' : 'none',
            }}>
            {generating
              ? <span className="flex items-center justify-center gap-2"><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />Generating…</span>
              : `Generate ${selectedSections.length > 0 ? `(${selectedSections.length})` : ''}`}
          </button>
          {!hasRequiredDocs && (
            <p className="text-[9px] text-center -mt-1" style={{ color: 'var(--text-muted)' }}>Add JD & Resume to start</p>
          )}

          {/* Download — export the generated sections (was fully built but had no UI) */}
          {generatedCount > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload('pdf')}
                  disabled={!!downloading}
                  className="flex-1 py-2 text-[11px] font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{ color: 'var(--cam-primary-dk)', background: 'var(--accent-subtle)', border: '1px solid var(--border)' }}>
                  {downloading === 'pdf' ? 'Saving…' : 'Download PDF'}
                </button>
                <button
                  onClick={() => handleDownload('docx')}
                  disabled={!!downloading}
                  className="flex-1 py-2 text-[11px] font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{ color: 'var(--cam-primary-dk)', background: 'var(--accent-subtle)', border: '1px solid var(--border)' }}>
                  {downloading === 'docx' ? 'Saving…' : 'Download DOCX'}
                </button>
              </div>
              {downloadMsg && <p className="text-[9px] text-center" style={{ color: 'var(--text-muted)' }}>{downloadMsg}</p>}
            </div>
          )}

          {/* Clear */}
          <button
            onClick={() => { setState({ ...EMPTY_DOC } as any); setSectionStatus({}); setActiveSection('input'); }}
            className="w-full py-2 text-[11px] font-semibold rounded-lg transition-all active:scale-[0.98] hover:opacity-90"
            style={{ color: 'color-mix(in srgb, #ef4444 70%, var(--text-secondary))', background: 'color-mix(in srgb, #ef4444 8%, var(--bg-elevated))', border: '1px solid color-mix(in srgb, #ef4444 25%, transparent)' }}>
            Clear All
          </button>
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
                  onUpload={async (f) => { uploadToResearchDocs(f); const t = await extractFile(f); setState(p => ({ ...p, jd: t, jdFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, jd: t }))}
                  onClickOverride={() => { setJdEditText(state.jd || ''); setJdModalOpen(true); }} />
                <UploadZone label="Resume" required value={state.resume} fileName={state.resumeFile}
                  onUpload={async (f) => { uploadToResearchDocs(f); const t = await extractFile(f); setState(p => ({ ...p, resume: t, resumeFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, resume: t }))} />
                <UploadZone label="Cover Letter" value={state.coverLetter} fileName={state.coverLetterFile}
                  onUpload={async (f) => { uploadToResearchDocs(f); const t = await extractFile(f); setState(p => ({ ...p, coverLetter: t, coverLetterFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, coverLetter: t }))} />
                <UploadZone label="Prep Materials" value={state.prepMaterials} fileName={state.prepMaterialsFile}
                  onUpload={async (f) => { uploadToResearchDocs(f); const t = await extractFile(f); setState(p => ({ ...p, prepMaterials: t, prepMaterialsFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, prepMaterials: t }))} />
              </div>
            </div>

            {/* Study Materials — multi-document. Sona reads every entry
                here as additional context during the live interview. */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--cam-primary)' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Study Materials</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {state.studyDocs.length === 0 ? 'Add as many as you want — Sona reads them all' : `${state.studyDocs.length} document${state.studyDocs.length === 1 ? '' : 's'} loaded`}
                </span>
              </div>
              {/* GitHub repo fetcher */}
              <GitHubRepoFetcher onDocs={(docs) => setState(p => ({ ...p, studyDocs: [...p.studyDocs, ...docs] }))} />
              <MultiUploadZone
                docs={state.studyDocs}
                onAdd={async (files) => {
                  const added: StudyDoc[] = [];
                  for (const f of files) {
                    try {
                      const content = await extractFile(f);
                      if (content.trim()) added.push({ name: f.name, content });
                    } catch (err) {
                      console.warn('[study] extract failed', f.name, err);
                    }
                  }
                  if (added.length) setState(p => ({ ...p, studyDocs: [...p.studyDocs, ...added] }));
                }}
                onRemove={(idx) => setState(p => ({ ...p, studyDocs: p.studyDocs.filter((_, i) => i !== idx) }))}
              />
            </div>

            {/* Research Docs — RAG-indexed documents Sona reads during live sessions */}
            <div className="mt-6">
              <ResearchDocsCard
                companySlug={prepData.activeCompany
                  ? prepData.activeCompany.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                  : 'default'}
              />
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
            <div className="flex-1 overflow-auto p-6 select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
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
                  <Chip variant="success">Generated</Chip>
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
            <div className="flex-1 overflow-auto p-6 select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
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
        /* Camora + LeetCode-style modal: charcoal-tinted backdrop with
           blur, charcoal header strip with gold-leaf seam, solid brand
           Save pill, ghost Cancel with border. Same chrome language as
           SiteNav / SiteFooter so popups read as the same product. */
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          style={{ background: 'rgba(2,6,23,0.62)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={closeJdModal}
        >
          <div
            className="w-full max-w-2xl rounded-xl overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 24px 70px rgba(0,0,0,0.45)', maxHeight: 'calc(100vh - 6rem)' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="jd-modal-title"
          >
            {/* Header — charcoal strip with gold-leaf seam, matches SiteNav */}
            <div
              className="px-5 py-3.5 flex items-center justify-between shrink-0"
              style={{ background: '#1A1D24', borderBottom: '1px solid rgba(201,162,39,0.35)' }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="inline-block w-1 h-5 rounded-sm"
                  style={{ background: 'var(--cam-gold-leaf)' }}
                />
                <h3 id="jd-modal-title" className="text-[15px] font-bold tracking-tight" style={{ color: '#FFFFFF', fontFamily: 'var(--font-sans)' }}>Job Description</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => jdFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.18)' }}
                >
                  Upload File
                </button>
                <button
                  onClick={closeJdModal}
                  aria-label="Close"
                  className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-[color-mix(in_oklab,var(--text-primary)_12%,transparent)]"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-5 overflow-y-auto">
              <label className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--text-muted)' }}>Paste job posting URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={jdUrl}
                  onChange={(e) => { setJdUrl(e.target.value); setJdUrlError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && jdUrl.trim() && !jdFetching) { e.preventDefault(); fetchJdUrl(jdUrl); } }}
                  placeholder="https://nvidia.wd5.myworkdayjobs.com/..."
                  disabled={jdFetching}
                  className="flex-1 px-3 py-2 rounded-md text-[13px] focus:outline-none focus:ring-2"
                  style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <button
                  onClick={pasteJdFromClipboard}
                  disabled={jdFetching}
                  className="px-3 py-2 rounded-md text-[12px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  data-tip="Paste URL or JD text from clipboard"
                >
                  Paste
                </button>
                <button
                  onClick={() => fetchJdUrl(jdUrl)}
                  disabled={!jdUrl.trim() || jdFetching}
                  className="px-4 py-2 rounded-md text-[12px] font-bold uppercase tracking-wider transition-[opacity,transform] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'var(--cam-primary)', color: '#FFFFFF', boxShadow: (!jdUrl.trim() || jdFetching) ? 'none' : '0 4px 12px rgba(38,97,156,0.32)' }}
                >
                  {jdFetching ? 'Fetching…' : 'Fetch JD'}
                </button>
              </div>
              <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                Supports Workday, Greenhouse, Lever, Ashby, SmartRecruiters, LinkedIn, and most career pages.
              </p>
              {jdUrlError && <p className="text-[11px] mt-2 font-semibold" style={{ color: 'var(--danger)' }}>{jdUrlError}</p>}

              <textarea
                value={jdEditText}
                onChange={(e) => setJdEditText(e.target.value)}
                placeholder="Or paste the full job description text here..."
                className="w-full mt-4 p-3 rounded-md text-[13px] resize-none focus:outline-none"
                style={{ height: '240px', background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}
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

            {/* Footer */}
            <div className="px-5 py-3 flex justify-end gap-2 shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <button
                onClick={closeJdModal}
                className="px-4 py-2 rounded-md text-[12px] font-bold uppercase tracking-wider transition-colors"
                style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (jdEditText.trim()) setState(p => ({ ...p, jd: jdEditText.trim(), jdFile: undefined }));
                  closeJdModal();
                }}
                disabled={!jdEditText.trim()}
                className="px-5 py-2 rounded-md text-[12px] font-bold uppercase tracking-wider transition-[opacity,transform] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--cam-primary)', color: '#FFFFFF', boxShadow: jdEditText.trim() ? '0 4px 12px rgba(38,97,156,0.32)' : 'none' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
