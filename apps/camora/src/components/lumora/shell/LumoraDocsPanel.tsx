/**
 * Interview Prep — matches capra.cariara.com/app/prep layout.
 * Sidebar sections + upload zones + Generate button.
 */
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { InterviewContextPanel } from './InterviewContextPanel';
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
import { dialogConfirm } from '../../shared/Dialog';

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
  /* None of these four have a card of their own any more. There is ONE intake —
     a drop zone and a URL box — and everything below is DERIVED from it by
     deriveFromIntake(). The fields survive because the backend reads each one
     differently: getCandidateBackground grounds first-person answers on
     resume + coverLetter and never looks at prepMaterials or documentation,
     so a single merged blob would put a resume where nothing answering "tell
     me about yourself" reads it. The classification is the UI's job now
     instead of the user's. */
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
  /** The one list everything is added to, and the only one the user edits. */
  intake: IntakeDoc[];
  /** Superseded by intake. Read once on load, then left undefined. */
  otherDocs?: StudyDoc[];
  sections: Record<string, any>;
}

type DocKind = 'jd' | 'resume' | 'cover' | 'other';

interface IntakeDoc extends StudyDoc {
  kind: DocKind;
  /** Set when it came from the URL box rather than a file. */
  url?: string;
}

interface PrepData {
  companies: string[];
  archivedCompanies?: string[];
  activeCompany: string | null;
  data: Record<string, DocState>;
}

const EMPTY_DOC: DocState = {
  jd: '', resume: '', coverLetter: '', prepMaterials: '', studyDocs: [],
  intake: [],
  sections: {},
};

/* ── Which of the four a document is ──────────────────────────────────────
 * There used to be a card per kind, so the user classified every file before
 * they could add it. Now one box takes everything and this decides, because
 * the backend genuinely reads the four differently — see DocState.
 *
 * Filename first: it is what the user actually named the thing, and
 * "Senior_DevOps_Resume.docx" is not a guess. Content second, on markers that
 * only appear in one kind. Ambiguous falls to 'other', which is the harmless
 * answer — and every row carries a dropdown, so a wrong guess is one click to
 * fix rather than something to be clever about.
 */
const RE_NAME_RESUME = /\b(resume|r[ée]sum[ée]|\bcv\b|curriculum[\s_-]*vitae)\b/i;
const RE_NAME_JD = /\b(jd|job[\s_-]*(description|post(ing)?|spec)|role[\s_-]*(description|spec)|requisition)\b/i;
const RE_NAME_COVER = /cover[\s_-]*letter/i;

const RE_BODY_COVER = /\b(dear\s+(hiring|recruit|sir|madam|mr\.?|ms\.?)|i am writing to (apply|express)|i'm writing to (apply|express))/i;
// A posting describes a role it is offering. A resume describes work already
// done. These phrases only ever appear on the offering side.
// No trailing \b on these: a boundary after ':' needs a word character next,
// and "Responsibilities:" is followed by a space — which silently killed every
// alternative ending in a colon.
const RE_BODY_JD = /\b(what you'?ll do|what you'?ll bring|responsibilities\s*:|qualifications\s*:|requirements\s*:|we are looking for|you will be responsible|minimum qualifications|preferred qualifications|equal opportunity employer|about the role)/i;
// And these only on the having-done side.
const RE_BODY_RESUME = /\b(work experience|professional experience|employment history|technical skills|education\s*:|certifications\s*:)/i;

/* Underscores are word characters, so \b never fires inside
   "Senior_DevOps_Resume.docx" and the most common resume filename there is
   classified as 'other'. Separators become spaces before matching. */
const nameWords = (name: string) => name.replace(/[_.-]+/g, ' ');

export const classifyDoc = (name: string, content: string): DocKind => {
  const n = nameWords(name);
  if (RE_NAME_COVER.test(n)) return 'cover';
  if (RE_NAME_RESUME.test(n)) return 'resume';
  if (RE_NAME_JD.test(n)) return 'jd';
  const head = content.slice(0, 3000);
  if (RE_BODY_COVER.test(head)) return 'cover';
  const jd = RE_BODY_JD.test(head);
  const resume = RE_BODY_RESUME.test(head);
  // Both sets of markers means a JD pasted alongside notes, or a resume
  // quoting the posting. Neither is safe to claim, so neither wins.
  if (jd && !resume) return 'jd';
  if (resume && !jd) return 'resume';
  return 'other';
};

const KIND_LABEL: Record<DocKind, string> = {
  jd: 'Job description',
  resume: 'Resume',
  cover: 'Cover letter',
  other: 'Other',
};

/** Split the one list back into the fields the backend reads. */
const deriveFromIntake = (docs: IntakeDoc[]): Pick<DocState, 'jd' | 'jdFile' | 'resume' | 'resumeFile' | 'coverLetter' | 'coverLetterFile' | 'prepMaterials' | 'prepMaterialsFile' | 'studyDocs'> => {
  const of = (k: DocKind) => docs.filter(d => d.kind === k);
  // More than one of a kind is legitimate — two resumes tailored differently,
  // a JD plus the team page. Joining keeps both rather than picking a winner.
  const join = (list: IntakeDoc[]) =>
    list.map(d => (list.length > 1 ? `### ${d.name}\n${d.content}` : d.content)).join('\n\n');
  const [jd, resume, cover, other] = [of('jd'), of('resume'), of('cover'), of('other')];
  return {
    jd: join(jd), jdFile: jd[0]?.name,
    resume: join(resume), resumeFile: resume[0]?.name,
    coverLetter: join(cover), coverLetterFile: cover[0]?.name,
    // Everything else goes as `documentation`, the array the generator injects
    // entry by entry. prepMaterials was the single-string version of the same
    // thing and loses the filenames, so it stays empty.
    prepMaterials: '', prepMaterialsFile: undefined,
    studyDocs: other.map(({ name, content }) => ({ name, content })),
  };
};

/** Bring every older shape forward into `intake`.
 *
 *  Three generations are in the wild: a single studyMaterials string, the four
 *  named fields, and the short-lived otherDocs list. All of them held content
 *  in fields that no longer have any UI, so without this it would still be
 *  sent to the backend while being invisible and unremovable on screen. */
const migrateStudyDocs = (doc: any): DocState  => {
  if (!doc) return { ...EMPTY_DOC };
  if (Array.isArray(doc.intake) && doc.intake.length) {
    return { ...EMPTY_DOC, ...doc, intake: doc.intake, otherDocs: undefined, studyMaterials: undefined, studyMaterialsFile: undefined };
  }

  const intake: IntakeDoc[] = [];
  const push = (name: string | undefined, content: unknown, kind: DocKind, fallback: string) => {
    if (typeof content !== 'string' || !content.trim()) return;
    intake.push({ name: name || fallback, content, kind });
  };
  push(doc.jdFile, doc.jd, 'jd', 'Job description');
  push(doc.resumeFile, doc.resume, 'resume', 'Resume');
  push(doc.coverLetterFile, doc.coverLetter, 'cover', 'Cover letter');
  push(doc.prepMaterialsFile, doc.prepMaterials, 'other', 'Prep material');
  push(doc.studyMaterialsFile, doc.studyMaterials, 'other', 'Study material');
  for (const d of (Array.isArray(doc.otherDocs) ? doc.otherDocs : [])) {
    if (d?.content?.trim()) intake.push({ name: d.name || 'Document', content: d.content, kind: classifyDoc(d.name || '', d.content) });
  }
  for (const d of (Array.isArray(doc.studyDocs) ? doc.studyDocs : [])) {
    if (d?.content?.trim()) intake.push({ name: d.name || 'Document', content: d.content, kind: 'other' });
  }

  return {
    ...EMPTY_DOC, ...doc, intake, ...deriveFromIntake(intake),
    otherDocs: undefined, studyMaterials: undefined, studyMaterialsFile: undefined,
  };
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
                <div className="text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{fmtKey(k)}</div>
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
      <div className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--cam-primary)' }}>{fmtKey(label)}</div>
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
                      <th key={h} className="text-left px-3 py-1 text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)', borderBottom: `1px solid ${accent}22` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cols.map((c: any, ci: number) => (
                    <tr key={ci} style={{ borderBottom: ci < cols.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td className="px-3 py-1 font-mono text-[12px]" style={{ color: 'var(--text-primary)' }}>{safeText(c.name)}</td>
                      <td className="px-3 py-1 font-mono text-[12px]" style={{ color: 'var(--text-secondary)' }}>{safeText(c.type)}</td>
                      <td className="px-3 py-1 font-mono text-[12px]" style={{ color: c.constraint ? accent : 'var(--text-muted)' }}>{c.constraint ? safeText(c.constraint) : '—'}</td>
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
 *  Navy (#1E4D78) = structural/informational. Gold (var(--cam-gold-leaf)) = caution/highlight.
 *  No rainbow. Section type is communicated by label, not hue. */
const LC = {
  // Difficulty pills — semantic meaning, kept intentional
  easy:   { fg: '#3B82B9', bg: 'rgba(59,130,185,0.08)',  border: 'rgba(59,130,185,0.22)' },
  medium: { fg: 'var(--cam-gold-leaf)', bg: 'rgba(255,153,0,0.10)',  border: 'rgba(255,153,0,0.30)' },
  hard:   { fg: 'var(--danger)', bg: 'rgba(219,0,0,0.08)',   border: 'rgba(219,0,0,0.22)' },

  // Brand tokens
  navy:        '#1E4D78',
  gold:        'var(--cam-gold-leaf)',

  // All section accents → navy (informational) or gold (caution/watch-out)
  problem:      '#2B6394',
  examples:     '#2B6394',
  approach:     '#2B6394',
  edge:         'var(--cam-gold-leaf)',  // watch-out → gold
  mistake:      'var(--cam-gold-leaf)',  // watch-out → gold
  followup:     '#2B6394',
  requirements: '#2B6394',
  capacity:     '#2B6394',
  architecture: '#2B6394',
  database:     '#2B6394',
  api:          '#2B6394',
  tradeoffs:    'var(--cam-gold-leaf)',  // trade-off emphasis → gold
  scalability:  '#2B6394',
  clarify:      '#2B6394',

  // STAR — action (the doing) → gold, rest → navy
  star: {
    situation: '#2B6394',
    task:      '#2B6394',
    action:    'var(--cam-gold-leaf)',
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
      className="inline-flex items-center gap-1 text-[12px] font-mono px-2 py-0.5 rounded"
      style={{ background: LC.codeBg, color: LC.codeFg, border: `1px solid ${LC.codeHdr}` }}
    >
      <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: LC.codeMuted }}>
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
        <span className="text-[12px] font-mono font-bold uppercase tracking-wider" style={{ color: LC.codeMuted }}>
          {label}
        </span>
        <span className="text-[12px] font-mono" style={{ color: LC.codeMuted }}>{totalLines} LOC</span>
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
          className="w-full py-1.5 flex items-center justify-center gap-1 text-[12px] font-medium transition-opacity hover:opacity-80"
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
        <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: LC.examples }}>
          Example {index + 1}
        </span>
      </div>
      <div className="px-3 py-2.5 space-y-1.5 text-xs font-mono">
        {example.input && (
          <div className="leading-relaxed">
            <span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.examples }}>Input:</span>
            <span style={{ color: 'var(--text-primary)' }}>{example.input}</span>
          </div>
        )}
        {example.output && (
          <div className="leading-relaxed">
            <span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.examples }}>Output:</span>
            <span style={{ color: 'var(--text-primary)' }}>{example.output}</span>
          </div>
        )}
        {example.explanation && (
          <p className="text-xs mt-1.5 leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
            <span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.examples }}>Explanation:</span>
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
            <div className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: LC.approach }}>Line-by-Line</div>
            <div className="space-y-1">
              {approach.lineByLine.filter((l: any) => l && typeof l === 'object').map((l: any, i: number) => (
                <div key={i} className="grid gap-2 text-xs" style={{ gridTemplateColumns: 'minmax(0, 0.55fr) minmax(0, 1fr)' }}>
                  <code
                    className="font-mono px-2 py-1 rounded text-[12px]"
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
            <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--cam-primary-dk)', color: '#FFFFFF' }}>{i + 1}</span>
            <div className="flex-1 pt-0.5">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {(s.bullets || []).map((b: string, j: number) => (
                  <span key={j}>{j === 0 ? <><strong style={{ color: 'var(--cam-primary)' }}>{safeText(b).split(' ').slice(0, 3).join(' ')}</strong> {safeText(b).split(' ').slice(3).join(' ')}</> : ` ${safeText(b)}`}</span>
                ))}
                {s.title && !s.bullets?.length && <>{safeText(s.title)}</>}
              </p>
              {s.duration && <span className="inline-block mt-1.5 text-[12px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{s.duration}</span>}
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
              <div className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.medium.fg }}>Interview Format</div>
              <div className="text-[13px]" style={{ color: 'var(--text-primary)' }}><Prose value={cc.interviewFormat} /></div>
            </div>
          )}
          {cc.whatTheyLookFor && (
            <div className="rounded-md p-2.5" style={{ background: 'rgba(255,184,0,0.05)', border: 'rgba(255,184,0,0.15) 1px solid' }}>
              <div className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.medium.fg }}>What They Look For</div>
              <div className="text-[13px]" style={{ color: 'var(--text-primary)' }}><Prose value={cc.whatTheyLookFor} /></div>
            </div>
          )}
          {cc.culturalFit && (
            <div className="rounded-md p-2.5" style={{ background: 'rgba(255,184,0,0.05)', border: 'rgba(255,184,0,0.15) 1px solid' }}>
              <div className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.medium.fg }}>Cultural Fit</div>
              <div className="text-[13px]" style={{ color: 'var(--text-primary)' }}><Prose value={cc.culturalFit} /></div>
            </div>
          )}
          {cc.knownQuestions && (
            <div className="rounded-md p-2.5" style={{ background: 'rgba(255,184,0,0.05)', border: 'rgba(255,184,0,0.15) 1px solid' }}>
              <div className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.medium.fg }}>Known Questions</div>
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
                <div className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.medium.fg }}>{fmtKey(k)}</div>
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
                        <span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: 'var(--warning-text)' }}>Why asked:</span>
                        {q.whyTheyAsk}
                      </p>
                    )}
                    {q.whyThisCompanyAsks && (qRendered.add('whyThisCompanyAsks'),
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        <span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: 'var(--warning-text)' }}>Why asked:</span>
                        {q.whyThisCompanyAsks}
                      </p>
                    )}
                    {q.whatTheyTest && (qRendered.add('whatTheyTest'),
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        <span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: 'var(--warning-text)' }}>What they test:</span>
                        {q.whatTheyTest}
                      </p>
                    )}
                    {q.companyConnection && (qRendered.add('companyConnection'),
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        <span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: 'var(--cam-primary)' }}>Connect to:</span>
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
                            <span className="flex-shrink-0 text-[12px] font-bold uppercase tracking-wider" style={{ color: s.accent, minWidth: 64 }}>{s.label}</span>
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
                            <div className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--cam-primary)' }}>{fmtKey(f)}</div>
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
                    <span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.gold }}>Tip:</span>
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
                            <div className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: LC.requirements }}>Functional</div>
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
                            <div className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: LC.scalability }}>Non-Functional</div>
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
                            <div className="text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: LC.capacity }}>Assumptions</div>
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
                            <div className="text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: LC.capacity }}>Calculations</div>
                            <table className="w-full text-xs">
                              <thead><tr style={{ color: LC.capacity }}>
                                <th className="text-left font-bold uppercase text-[12px] tracking-wider pb-1">Metric</th>
                                <th className="text-left font-bold uppercase text-[12px] tracking-wider pb-1">Formula</th>
                                <th className="text-right font-bold uppercase text-[12px] tracking-wider pb-1">Result</th>
                              </tr></thead>
                              <tbody>
                                {calculations.filter((cl: any) => cl && typeof cl === 'object').map((cl: any, ci: number) => (
                                  <tr key={ci} style={{ borderTop: `1px solid ${LC.capacity}15` }}>
                                    <td className="py-1.5 pr-2 font-medium" style={{ color: 'var(--text-primary)' }}>{safeText(cl.metric)}</td>
                                    <td className="py-1.5 pr-2 font-mono text-[12px]" style={{ color: 'var(--text-secondary)' }}>{safeText(cl.calculation)}</td>
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

                {/* Architecture diagram — its own slot so it sits with the
                    architecture discussion instead of falling through to the
                    catch-all, which renders it dead last under a "Diagram Url"
                    heading. The URL is DB-backed (/api/diagram/image/:hash), so
                    it keeps resolving when a saved kit is reopened. */}
                {typeof q.diagramUrl === 'string' && q.diagramUrl && (() => {
                  qRendered.add('diagramUrl'); qRendered.add('diagramDescription');
                  return (
                    <div>
                      <SectionHeading label="Architecture Diagram" color={LC.architecture} />
                      <div className="rounded-lg p-3" style={paperCard(LC.architecture)}>
                        <img
                          src={q.diagramUrl}
                          alt={`Architecture diagram for ${safeText(q.title || q.question || 'this design')}`}
                          loading="lazy"
                          className="max-w-full rounded-lg"
                          style={{ border: '1px solid var(--border)' }}
                        />
                        {q.diagramDescription && (
                          <p className="text-xs leading-relaxed mt-2 italic" style={{ color: 'var(--text-muted)' }}>
                            {safeText(q.diagramDescription)}
                          </p>
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
                          <div className="text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: LC.architecture }}>Overview</div>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{safeText(a.diagramDescription)}</p>
                        </div>
                      )}
                      {components.length > 0 && (
                        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                          {components.filter((c: any) => c && typeof c === 'object').map((c: any, ci: number) => (
                            <div key={ci} className="rounded-lg p-3" style={paperCard(LC.architecture)}>
                              <div className="flex items-baseline justify-between gap-2 mb-1">
                                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{safeText(c.name)}</span>
                                {c.technology && <span className="text-[12px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${LC.architecture}15`, color: LC.architecture }}>{safeText(c.technology)}</span>}
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
                              <div className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.database }}>{fmtKey(k)}</div>
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
                                  <div className="text-[12px] font-sans font-bold uppercase tracking-wider mb-0.5" style={{ color: LC.api }}>Request</div>
                                  {typeof e.request === 'object' ? (
                                    <div className="p-2 rounded" style={{ background: `${LC.api}08`, border: `1px solid ${LC.api}20` }}><KeyValueRows obj={e.request} accent={LC.api} /></div>
                                  ) : (
                                    <div className="font-mono" style={{ color: 'var(--text-primary)' }}>{safeText(e.request)}</div>
                                  )}
                                </div>
                              )}
                              {e.response !== undefined && e.response !== null && (
                                <div>
                                  <div className="text-[12px] font-sans font-bold uppercase tracking-wider mb-0.5" style={{ color: LC.api }}>Response</div>
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
                            {t.chose && <p className="text-sm" style={{ color: 'var(--text-primary)' }}><span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.tradeoffs }}>Chose:</span>{safeText(t.chose)}</p>}
                            {t.reason && <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}><span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.tradeoffs }}>Reason:</span>{safeText(t.reason)}</p>}
                            {t.alternative && <p className="text-xs leading-relaxed mt-1 italic" style={{ color: 'var(--text-muted)' }}><span className="text-[12px] font-bold uppercase tracking-wider mr-1.5 not-italic" style={{ color: LC.tradeoffs }}>Alt:</span>{safeText(t.alternative)}</p>}
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
                            {s.solution && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}><span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.scalability }}>Solution:</span>{safeText(s.solution)}</p>}
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
                      <div className="text-[12px] font-bold uppercase tracking-wider mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {safeText(t.category)}
                      </div>
                    )}
                  </div>
                  {isShortExperience && (
                    <span
                      className="flex-shrink-0 text-[12px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${LC.gold}15`, color: LC.gold, border: `1px solid ${LC.gold}40` }}
                    >
                      {experience}
                    </span>
                  )}
                </div>
                {experience && !isShortExperience && (
                  <p className="text-[14px] leading-snug mb-1.5" style={{ color: LC.gold }}>
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
                              <div className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.followup }}>Follow-ups</div>
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
                              <div className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: LC.mistake }}>Common Mistakes</div>
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
                            <div className="text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: LC.api }}>Best Practice</div>
                            {c.item.practice && <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>✓ {safeText(c.item.practice)}</div>}
                            {c.item.when && <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}><span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.api }}>When:</span>{safeText(c.item.when)}</p>}
                            {c.item.codeExample && <div className="mt-2"><CodeBlock code={String(c.item.codeExample)} language="code" /></div>}
                          </div>
                        ) : (
                          <div key={`ap-${idx}`} className="rounded-lg p-3 mb-2" style={{ ...paperCard(LC.edge), breakInside: 'avoid' }}>
                            <div className="text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: LC.edge }}>Anti-Pattern</div>
                            {c.item.pattern && <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>✗ {safeText(c.item.pattern)}</div>}
                            {c.item.problem && <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}><span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.edge }}>Problem:</span>{safeText(c.item.problem)}</p>}
                            {c.item.solution && <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}><span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.api }}>Fix:</span>{safeText(c.item.solution)}</p>}
                          </div>
                        )
                      )
                    ) : (
                      <>
                        {bps.map((bp: any, bi: number) => (
                          <div key={bi} className="rounded-lg p-3 mb-2" style={{ ...paperCard(LC.api), breakInside: 'avoid' }}>
                            {bp.practice && <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>✓ {safeText(bp.practice)}</div>}
                            {bp.when && <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}><span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.api }}>When:</span>{safeText(bp.when)}</p>}
                            {bp.codeExample && <div className="mt-2"><CodeBlock code={String(bp.codeExample)} language="code" /></div>}
                          </div>
                        ))}
                        {aps.map((ap: any, ai: number) => (
                          <div key={ai} className="rounded-lg p-3 mb-2" style={{ ...paperCard(LC.edge), breakInside: 'avoid' }}>
                            {ap.pattern && <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>✗ {safeText(ap.pattern)}</div>}
                            {ap.problem && <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}><span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.edge }}>Problem:</span>{safeText(ap.problem)}</p>}
                            {ap.solution && <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}><span className="text-[12px] font-bold uppercase tracking-wider mr-1.5" style={{ color: LC.api }}>Fix:</span>{safeText(ap.solution)}</p>}
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
        <div className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: f.color }}>{f.label}</div>
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
        <div className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: f.color }}>{f.label}</div>
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
        <div className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Abbreviations</div>
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

const LUMORA_API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

const IntakeZone = ({ onAdd, onPaste }: { onAdd: (files: File[]) => void; onPaste: () => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      className={`rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-[border-color,background-color] min-h-[112px] ${dragOver ? 'ring-2 ring-[var(--cam-primary)]' : ''}`}
      style={{ background: 'var(--bg-elevated)', border: `1px dashed ${dragOver ? 'var(--cam-primary)' : 'var(--border)'}` }}
      onClick={() => ref.current?.click()}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = Array.from(e.dataTransfer?.files || []); if (f.length) onAdd(f); }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
    >
      <input ref={ref} type="file" multiple accept=".pdf,.docx,.doc,.txt,.md" className="hidden"
        onChange={(e) => { const f = Array.from(e.target.files || []); if (f.length) onAdd(f); e.target.value = ''; }} />
      <svg className="w-6 h-6 mb-2" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Upload JD or Resume or Interview Documents
      </span>
      <span className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
        Drop files or click — PDF, DOCX, TXT, MD
      </span>
      {/* A job description is usually copied out of a posting, not saved as a
          file. Without this the only paste path was a modal nothing opened. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPaste(); }}
        className="mt-2 text-[12px] font-semibold underline underline-offset-2 hover:opacity-80"
        style={{ color: 'var(--cam-primary)' }}
      >
        or paste text
      </button>
    </div>
  );
};

/* One box for every link. A github.com/owner/repo still goes to the repo
   reader, which walks the tree and returns many files; anything else is
   fetched as a single page. Two boxes made the user route that themselves. */
const GITHUB_REPO_RE = /^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+\/?$/i;

const IntakeUrlBox = ({ onDocs, companySlug }: { onDocs: (docs: IntakeDoc[]) => void; companySlug?: string }) => {
  const { token } = useAuth();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const go = async () => {
    const link = url.trim();
    if (!link || busy) return;
    setBusy(true); setMsg(null);
    try {
      if (GITHUB_REPO_RE.test(link)) {
        const res = await fetch(`${LUMORA_API_URL}/api/v1/github/fetch-repo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ url: link }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setMsg({ tone: 'err', text: data.error || 'Could not read that repo' }); return; }
        const docs: IntakeDoc[] = (data.docs || []).map((d: StudyDoc) => ({ ...d, kind: 'other' as DocKind, url: link }));
        if (!docs.length) { setMsg({ tone: 'err', text: 'No readable files in that repo' }); return; }
        onDocs(docs);
        setMsg({ tone: 'ok', text: `Added ${docs.length} files from ${data.repoName || 'the repo'}` });
        setUrl('');
        return;
      }
      /* With a company selected the link is ALSO stored and RAG-indexed, the
         same as a dropped file is — one call does both, and it shows up in
         Research Docs below. Without one there is nowhere to file it, so it
         is only read into the prep state. */
      const endpoint = companySlug ? 'url' : 'fetch-url';
      const res = await fetch(`${API_URL}/api/v1/prep/docs/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify(companySlug ? { url: link, company_slug: companySlug } : { url: link }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ tone: 'err', text: data.error || `Could not open that link (HTTP ${res.status})` }); return; }
      const content: string = data.text || '';
      if (!content.trim()) { setMsg({ tone: 'err', text: 'Nothing readable on that page' }); return; }
      const name: string = data.title || link;
      onDocs([{ name, content, kind: classifyDoc(name, content), url: data.url || link }]);
      setMsg({ tone: 'ok', text: `Added ${name}` });
      setUrl('');
    } catch (e: any) {
      setMsg({ tone: 'err', text: e?.message || 'Network error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 rounded-lg pl-2.5 pr-1.5"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 00-7.07-7.07L10.6 5.34M14 11a5 5 0 00-7.07 0L4.8 13.12a5 5 0 007.07 7.07l1.5-1.5" />
        </svg>
        <input
          type="url"
          value={url}
          onChange={e => { setUrl(e.target.value); setMsg(null); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); go(); } }}
          placeholder="Paste a URL — job posting, a page, or a GitHub repo"
          disabled={busy}
          className="flex-1 min-w-0 bg-transparent h-9 text-[12px] outline-none placeholder:opacity-50"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          type="button"
          onClick={go}
          disabled={!url.trim() || busy}
          className="px-2.5 h-7 rounded-md text-[12px] font-bold uppercase tracking-wide shrink-0 disabled:opacity-40 transition-opacity"
          style={{ background: 'var(--cam-primary-dk)', color: '#fff' }}
        >
          {busy ? '…' : 'Fetch'}
        </button>
      </div>
      {msg && (
        <div className="px-1 pt-1.5 text-[12px]" style={{ color: msg.tone === 'err' ? 'var(--danger)' : 'var(--cam-primary)' }}>
          {msg.text}
        </div>
      )}
    </div>
  );
};

/* A row per document, with what it was classified as. The dropdown is the
   whole reason one box can replace four cards: the guess is visible and
   correctable, so being wrong costs a click instead of a misfiled resume. */
const IntakeRow = ({ doc, onKind, onRemove }: {
  doc: IntakeDoc;
  onKind: (k: DocKind) => void;
  onRemove: () => void;
}) => (
  <li className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
    <span style={{ color: 'var(--cam-primary)', flexShrink: 0 }}>
      {doc.url ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 00-7.07-7.07L10.6 5.34M14 11a5 5 0 00-7.07 0L4.8 13.12a5 5 0 007.07 7.07l1.5-1.5" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
    </span>
    <span className="flex-1 text-[12px] font-medium truncate min-w-0" style={{ color: 'var(--text-primary)' }} data-tip={doc.url || doc.name}>
      {doc.name}
    </span>
    <span className="text-[12px] shrink-0" style={{ color: 'var(--text-muted)' }}>
      {doc.content.length.toLocaleString()} ch
    </span>
    <select
      value={doc.kind}
      onChange={e => onKind(e.target.value as DocKind)}
      aria-label={`What kind of document ${doc.name} is`}
      className="shrink-0 h-7 rounded-md text-[12px] px-1.5 outline-none"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
    >
      {(Object.keys(KIND_LABEL) as DocKind[]).map(k => (
        <option key={k} value={k}>{KIND_LABEL[k]}</option>
      ))}
    </select>
    <button type="button" onClick={onRemove} aria-label={`Remove ${doc.name}`}
      className="shrink-0 w-6 h-6 rounded flex items-center justify-center opacity-60 hover:opacity-100"
      style={{ color: 'var(--text-muted)' }}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </li>
);

/* ── Sidebar action icons ────────────────────────────────────────────────
   A 34px square that states what it does on hover and to a screen reader, so
   the glyph never has to carry the whole meaning on its own. */
const ActionIcon = ({ label, onClick, disabled, busy, tint, children }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  tint: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    data-tip={label}
    className="w-[34px] h-[34px] rounded-lg flex items-center justify-center shrink-0 transition-[opacity,transform] active:scale-[0.94] disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80"
    style={{
      color: tint,
      background: `color-mix(in srgb, ${tint} 10%, var(--bg-elevated))`,
      border: `1px solid color-mix(in srgb, ${tint} 28%, transparent)`,
    }}
  >
    {busy
      ? <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      : children}
  </button>
);

/* A page with the format written on it and an arrow leaving the bottom edge.
   The wordmark is the identifying part — two download arrows side by side say
   "download" twice and never say which is which. */
const FileFormatIcon = ({ format }: { format: 'PDF' | 'DOC' }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M6 2.75h7L18.25 8v8.5a1.75 1.75 0 0 1-1.75 1.75h-9A1.75 1.75 0 0 1 5.75 16.5V4.5A1.75 1.75 0 0 1 7.5 2.75Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
    />
    {/* Folded corner — the one detail that reads as "document" at this size. */}
    <path d="M13 2.75V8h5.25" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <text
      x="12" y="14.6" textAnchor="middle"
      fontSize="5.4" fontWeight="700" letterSpacing="0.1"
      fill="currentColor" stroke="none"
      fontFamily="var(--font-mono), monospace"
    >
      {format}
    </text>
    {/* Down arrow, clear of the page, so the action reads too. */}
    <path d="M12 18.5v3.2m0 0 1.9-1.9M12 21.7l-1.9-1.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ArchiveIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7h18v3H3z" />
    <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
    <path d="M10 14h4" />
  </svg>
);

const RestoreIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 10a9 9 0 1 1 2.5 6.2" />
    <path d="M3 5v5h5" />
  </svg>
);

const TrashIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l.9 12.1A2 2 0 0 0 8.9 21h6.2a2 2 0 0 0 2-1.9L18 7" />
    <path d="M9 7V4.6A1.6 1.6 0 0 1 10.6 3h2.8A1.6 1.6 0 0 1 15 4.6V7" />
  </svg>
);

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
      'linear-gradient(135deg, rgba(0,108,224,0.04) 0%, rgba(255,153,0,0.05) 100%)',
    border: '1px solid var(--cam-gold-leaf)',
    boxShadow:
      '0 1px 0 color-mix(in srgb, var(--cam-gold-leaf) 18%, transparent),' +
      ' 0 8px 24px -16px rgba(0,108,224,0.18),' +
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
                  className="text-[12px] font-extrabold uppercase tracking-[0.14em]"
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
                  <span aria-hidden style={{ fontSize: 12 }}>{icon}</span>
                  {sec.title.replace(/^[a-z]/, (c) => c.toUpperCase())}
                </Chip>
                <span className="flex-1" />
                <span
                  className="text-[12px] font-mono font-bold"
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

export const LumoraDocsPanel = ({
  onClose: _onClose, meetingPlatform, onMeetingPlatformChange, codingPlatform, onCodingPlatformChange,
}: {
  onClose?: () => void;
  /* Interview context, hosted here rather than behind its own rail chip.
     Choosing WHICH interview and working ON it were two destinations for one
     job — you activated a workspace in a modal and then edited its documents
     somewhere else. */
  meetingPlatform?: string;
  onMeetingPlatformChange?: (v: string) => void;
  codingPlatform?: string;
  onCodingPlatformChange?: (v: string) => void;
}) => {
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
  const [generating, setGenerating] = useState(false);
  const [sectionStatus, setSectionStatus] = useState<Record<string, 'pending' | 'generating' | 'done' | 'error'>>({});
  const [selectedSections, setSelectedSections] = useState<string[]>(() => ['pitch', 'hr', 'hiring-manager', 'coding', 'system-design', 'behavioral', 'techstack']);
  const [showArchived, setShowArchived] = useState(false);
  const [showNewCompany, setShowNewCompany] = useState(false);
  /* false = the company list, true = that company's prep. Starts closed so the
     first thing on screen is which interview, not which file. */
  const [prepOpen, setPrepOpen] = useState(false);
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
    // Arriving from /jobs/:id/prepare names the interview, so the list has
    // already been answered — go straight into it rather than showing a
    // picker for the company the URL just chose.
    setPrepOpen(true);
    if (seedJd) autoGenerateRef.current = true;
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  /* No auto-created "My Session" any more. It existed because the page had
     nowhere to start from, and it put back an empty interview every time you
     deleted the last one — the landing list now opens with an explicit
     "Add new interview" chip, so an empty placeholder is just something else
     to delete. */
  useEffect(() => {
    if (!prepData.activeCompany && prepData.companies.length > 0) {
      setPrepData(prev => ({ ...prev, activeCompany: prev.companies[0] }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Active company's doc state, run through migrateStudyDocs so any older
     payload that slipped past the loader still exposes the current shape.
     
     MEMOISED, and that matters more than it looks. This used to run on every
     render, and for any document saved before the intake landed — which is
     every existing one until it is next edited — that is the full migration:
     classifyDoc's regexes over each entry, then deriveFromIntake joining every
     document's text into new strings. With a JD and a résumé that is tens of
     thousands of characters copied per render, on a component that re-renders
     on every keystroke in the composer. It also handed back a new studyDocs
     array each time, so anything keyed on it saw a change that had not
     happened. */
  const activeDoc = prepData.activeCompany ? prepData.data[prepData.activeCompany] : undefined;
  const state = useMemo(
    () => migrateStudyDocs(activeDoc || EMPTY_DOC),
    [activeDoc],
  );
  const setState = (updater: DocState | ((prev: DocState) => DocState)) => {
    const company = prepData.activeCompany;
    if (!company) return;
    setPrepData(prev => {
      const newState = typeof updater === 'function' ? updater(prev.data[company] || EMPTY_DOC) : updater;
      return { ...prev, data: { ...prev.data, [company]: newState } };
    });
  };

  /* The page opens on the list of companies, not on an upload box.
     Landing straight in Materials answered "add a document" before you had
     said which interview it belongs to — and with several companies saved, it
     silently picked one for you. Opening a company, or creating one, is what
     takes you into the prep. */
  const openPrep = (name: string) => {
    setPrepData(prev => ({ ...prev, activeCompany: name }));
    setActiveSection('input');
    setPrepOpen(true);
  };

  const addCompany = () => {
    const name = newCompanyName.trim();
    if (!name) return;
    setPrepOpen(true);
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
    setPrepOpen(true);
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
      // Archived too — an archived interview was unreachable by delete, so the
      // only way out of the archive was to restore it first.
      const newArchived = (prev.archivedCompanies || []).filter(c => c !== name);
      const newData = { ...prev.data };
      delete newData[name];
      const next = {
        ...prev,
        companies: newCompanies,
        archivedCompanies: newArchived,
        data: newData,
        // Only move the active pointer if it was THIS one; deleting an
        // archived entry must not yank you out of the interview you are in.
        activeCompany: prev.activeCompany === name ? (newCompanies[0] || null) : prev.activeCompany,
      };
      if (token) {
        prepAPI.putState(token, next).catch(() => {});
        fetch(`${API_URL}/api/v1/prep/docs/company/${encodeURIComponent(slug)}`, {
          method: 'DELETE',
          headers: getAuthHeaders() as Record<string, string>,
          credentials: 'include',
        }).catch(() => {});
      }
      return next;
    });
  };

  const confirmDelete = async (name: string) => {
    const ok = await dialogConfirm({
      title: 'Delete interview',
      message: `Delete "${name}" and everything in it — documents, generated sections and indexed research docs? This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (ok) deleteCompany(name);
  };

  const uploadToResearchDocs = useCallback((file: File) => {
    const slug = (prepData.activeCompany || 'general')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('company_slug', slug);
    // /prep/docs, not /prep-docs. The router is mounted at the former, so
    // every upload here 404'd into the empty catch below and Research Docs
    // stayed at 0 however many documents you added.
    fetch(`${API_URL}/api/v1/prep/docs/upload`, {
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

  /* Open every section at its beginning. Without this the scroller keeps the
     offset from the section you just left, so clicking a short one after a
     long one lands you past the end of it, on blank space. */
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeSection, prepData.activeCompany]);

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
  /* One slug for both the intake's link indexing and the Research Docs list,
     so a link cannot be filed under a different company than the list reads. */
  const researchSlug = prepData.activeCompany
    ? prepData.activeCompany.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    : 'default';

  // Auto-trigger generation when arriving from a job page with JD pre-seeded
  // and resume is available (either carried over or already saved).
  useEffect(() => {
    if (autoGenerateRef.current && hasRequiredDocs && !generating) {
      autoGenerateRef.current = false;
      handleGenerate();
    }
  }, [hasRequiredDocs, generating, handleGenerate]);



  /* Step one: which interview. Nothing about documents until that is answered. */
  if (!prepOpen) {
    return (
      <div className="h-full flex flex-col overflow-y-auto" style={{ background: 'var(--bg-surface)' }}>
        <div className="p-6 max-w-3xl w-full mx-auto">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
            Interviews
          </h2>
          <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>
            Pick one to open its materials and prep kit.
          </p>

          {prepData.companies.length === 0 && (prepData.archivedCompanies || []).length === 0 && (
            <p className="text-[13px] mb-4 px-4 py-6 rounded-xl text-center"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px dashed var(--border)' }}>
              No interviews yet — add one to start.
            </p>
          )}

          {prepData.companies.length > 0 && (
            <ul className="space-y-2 mb-4">
              {prepData.companies.map(c => {
                const doc = prepData.data[c];
                const docs = doc?.intake?.length ?? 0;
                const made = doc ? Object.keys(doc.sections || {}).length : 0;
                const isActive = c === prepData.activeCompany;
                return (
                  /* The row is a button and the actions sit BESIDE it, not
                     inside it — a button inside a button is invalid and the
                     click would open the interview you meant to delete. */
                  <li key={c} className="flex items-stretch gap-2">
                    <button
                      type="button"
                      onClick={() => openPrep(c)}
                      className="flex-1 min-w-0 text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors"
                      style={{
                        background: 'var(--bg-elevated)',
                        border: `1px solid ${isActive ? 'var(--cam-primary)' : 'var(--border)'}`,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c}</span>
                          {isActive && <Chip variant="success">Active</Chip>}
                        </div>
                        {/* What is actually in it, so the list answers "where
                            did I get to" without opening each one. */}
                        <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {docs === 0 && made === 0
                            ? 'No materials yet'
                            : `${docs} document${docs === 1 ? '' : 's'}${made > 0 ? ` · ${made} section${made === 1 ? '' : 's'} generated` : ''}`}
                        </div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ color: 'var(--text-muted)' }}>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                    {/* Always visible, not revealed on hover — destructive
                        actions you cannot find are worse than ones you can. */}
                    <ActionIcon label={`Archive ${c}`} onClick={() => archiveCompany(c)} tint="var(--text-muted)">
                      <ArchiveIcon />
                    </ActionIcon>
                    <ActionIcon label={`Delete ${c}`} onClick={() => confirmDelete(c)} tint="var(--danger)">
                      <TrashIcon />
                    </ActionIcon>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Archived. It had no delete at all, so the only way out of the
              archive was to restore an interview first and delete it from the
              main list. */}
          {(prepData.archivedCompanies || []).length > 0 && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowArchived(v => !v)}
                aria-expanded={showArchived}
                className="flex items-center gap-1.5 text-[12px] font-semibold mb-2"
                style={{ color: 'var(--text-muted)' }}
              >
                <span style={{ display: 'inline-block', transition: 'transform 0.15s', transform: showArchived ? 'rotate(90deg)' : 'none' }}>▸</span>
                Archived ({(prepData.archivedCompanies || []).length})
              </button>
              {showArchived && (
                <ul className="space-y-2">
                  {(prepData.archivedCompanies || []).map(c => (
                    <li key={c} className="flex items-stretch gap-2">
                      <div className="flex-1 min-w-0 px-4 py-2.5 rounded-xl flex items-center"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <span className="text-[13px] truncate" style={{ color: 'var(--text-muted)' }}>{c}</span>
                      </div>
                      <ActionIcon label={`Restore ${c}`} onClick={() => unarchiveCompany(c)} tint="var(--cam-primary)">
                        <RestoreIcon />
                      </ActionIcon>
                      <ActionIcon label={`Delete ${c}`} onClick={() => confirmDelete(c)} tint="var(--danger)">
                        <TrashIcon />
                      </ActionIcon>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {showNewCompany ? (
            <div className="flex gap-2">
              <input
                ref={newCompanyRef}
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCompany(); if (e.key === 'Escape') setShowNewCompany(false); }}
                placeholder="e.g. Nvidia DevOps"
                className="flex-1 min-w-0 px-3 h-9 rounded-lg text-[13px] outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <button onClick={addCompany} disabled={!newCompanyName.trim()}
                className="px-4 h-9 text-[12px] font-bold rounded-lg disabled:opacity-40"
                style={{ background: 'var(--cam-primary-dk)', color: '#FFFFFF' }}>
                Create
              </button>
              <button onClick={() => setShowNewCompany(false)}
                className="px-3 h-9 text-[12px] rounded-lg" style={{ color: 'var(--text-muted)' }}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setShowNewCompany(true); setTimeout(() => newCompanyRef.current?.focus(), 100); }}
              className="inline-flex items-center gap-2 px-3 h-9 rounded-full text-[12px] font-semibold transition-opacity hover:opacity-85"
              style={{ background: 'color-mix(in srgb, var(--cam-primary) 14%, var(--bg-elevated))', color: 'var(--cam-primary)', border: '1px solid var(--cam-primary)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add new interview
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-surface)' }}>
      {/* Setup first, materials below it — the order you actually work in. */}
      {(onMeetingPlatformChange || onCodingPlatformChange) && (
        <div className="shrink-0 border-b" style={{ borderColor: 'var(--lum-border)' }}>
          <InterviewContextPanel
            meetingPlatform={meetingPlatform}
            onMeetingPlatformChange={onMeetingPlatformChange}
            codingPlatform={codingPlatform}
            onCodingPlatformChange={onCodingPlatformChange}
          />
        </div>
      )}
      {/* The band and the content are SEPARATE now. They shared one scroller,
          so reading a long Elevator Pitch scrolled the section chips off the
          top — the navigation moved with the thing it navigates — and
          switching sections kept the old offset, dropping you into the middle
          of the next one. */}
      <div className="flex-1 min-h-0 flex flex-col">
      {/* Mobile collapsed-sidebar pill — only shows when the sidebar is
          collapsed on phones. Tap to expand. The desktop sidebar at
          sm:w-[180px] stays visible always; this pill is mobile-only. */}

      {/* Sidebar — collapsed-out on mobile by default. Auto-shows on
          ≥sm screens via sm:flex. */}
      <div
        className="flex w-full flex-col shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
      >
        {/* LeetCode-style sidebar header */}
        <div className="px-3 py-3" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
          <div className="flex items-center justify-between mb-2">
            {/* Back to the list — without it, opening a company is a one-way
                door and the only way to reach another is the dropdown. */}
            <button
              type="button"
              onClick={() => setPrepOpen(false)}
              className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider transition-opacity hover:opacity-75"
              style={{ color: 'var(--cam-strip-heading)', fontFamily: 'var(--font-sans)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Interviews
            </button>
            {/* Sync indicator — proves writes are reaching the lumora
                backend (lumora_prep_state). "Saved" means the JD/resume/
                companies have landed in Postgres and will be available
                on the webapp / any other device after sign-in. */}
            <span
              className="text-[12px] font-bold uppercase tracking-wider flex items-center gap-1"
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
                  : syncStatus === 'error'  ? 'var(--danger)'
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
                    : syncStatus === 'error'  ? 'var(--danger)'
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
              className="text-[12px] mt-1 leading-snug break-all"
              style={{ color: 'var(--danger)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
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
                <button onClick={addCompany} className="flex-1 py-1 text-[12px] font-bold rounded" style={{ background: 'var(--cam-primary-dk)', color: '#FFFFFF' }}>Create</button>
                <button onClick={() => setShowNewCompany(false)} className="px-2 py-1 text-[12px] rounded" style={{ color: 'var(--text-muted)' }}>Cancel</button>
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
                  {/* data-overlay-keep is REQUIRED here. In overlay mode
                      globals.css strips background-color from every element
                      inside .lumora-shell-root that is not a button/chip/badge,
                      so without it this menu renders fully transparent and the
                      Prep section list behind it reads straight through the
                      company names. The z-50 was never the problem. */}
                  <div
                    data-overlay-keep
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
                          className="w-full px-3 py-1.5 text-[12px] text-left flex items-center gap-1 opacity-60 hover:opacity-100"
                          style={{ color: 'var(--text-muted)' }}>
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" /></svg>
                          Archived ({(prepData.archivedCompanies || []).length})
                          <span style={{ marginLeft: 'auto' }}>{showArchived ? '▲' : '▼'}</span>
                        </button>
                        {showArchived && (prepData.archivedCompanies || []).map(c => (
                          <button key={c} onClick={(e) => { e.stopPropagation(); unarchiveCompany(c); }}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-[12px] text-left hover:bg-[color-mix(in_oklab,var(--text-primary)_7%,transparent)]"
                            style={{ color: 'var(--text-muted)' }} data-tip="Click to restore">
                            <span className="truncate italic">{c}</span>
                            <span className="text-[12px] opacity-60">Restore</span>
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
              className="w-full py-2 text-xs font-bold rounded-lg" style={{ background: 'var(--cam-primary-dk)', color: '#FFFFFF' }}>
              + Add Company
            </button>
          )}
        </div>
        {/* Navigation — ONLY what can actually be opened.
            It used to list all nine sections with a checkbox on each, so on
            Input Materials you were looking at eight navigable rows for
            content that did not exist yet, and one control doing two unrelated
            jobs: clicking a name navigates, ticking a box queues generation.
            The boxes moved to the Generate card, which is what they are about;
            a section appears here once it has something to show. */}
        {/* Two groups, not one four-column grid. What you PUT IN (materials,
            the JD) and what came OUT of it (the generated sections) were
            landing side by side in the same row purely by index — Input
            Materials, Job Description and Elevator Pitch reading as peers when
            the first two are sources and the third is a result. A rule
            separates them and each group flows on its own line. */}
        <div className="py-1.5 px-2 flex flex-wrap items-center gap-1.5">
          {SIDEBAR_SECTIONS.filter((s) =>
            s.id === 'input' ||
            (s.id === 'jd-view' ? !!state.jd.trim() : (!!state.sections[s.id] || sectionStatus[s.id] === 'generating'))
          ).map((s, i, arr) => {
            // The divider goes in front of the first generated section.
            const isFirstGenerated = !['input', 'jd-view'].includes(s.id) &&
              arr.findIndex(x => !['input', 'jd-view'].includes(x.id)) === i;
            const isActive = s.id === activeSection;
            const hasContent = s.id === 'input' ? hasRequiredDocs : !!state.sections[s.id];
            return (
              <Fragment key={s.id}>
              {isFirstGenerated && (
                <span aria-hidden className="mx-1 self-stretch w-px" style={{ background: 'var(--border)' }} />
              )}
              <button onClick={() => { setActiveSection(s.id); }}
                className="flex items-center gap-2 px-2.5 h-8 rounded-lg transition-colors text-xs font-medium"
                style={isActive
                  ? { background: 'color-mix(in srgb, var(--cam-primary) 14%, var(--bg-elevated))', color: 'var(--cam-primary)', border: '1px solid var(--cam-primary)' }
                  : { background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
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
                <span>{s.label}</span>
                {sectionStatus[s.id] === 'pending' && generating && (
                  <Chip variant="default" className="text-[12px]">queued</Chip>
                )}
              </button>
              </Fragment>
            );
          })}
        </div>

      </div>

      {/* Main content */}
      <div ref={contentRef} className="flex flex-col min-w-0 flex-1 min-h-0 overflow-y-auto">
        {activeSection === 'input' ? (
          /* space-y-8 rather than each card carrying its own margin — the
             blocks were reading as one continuous surface. */
          <div className="p-6 pb-8 max-w-4xl w-full mx-auto space-y-8">
            {/* ONE intake. It was four named cards, then three zones plus two
                URL boxes across Materials, Study Materials and Research Docs —
                five places to add a document, each asking what kind it was
                before it would take it. classifyDoc answers that instead, and
                every row carries a dropdown to correct it. */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--cam-primary)' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Materials</span>
                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {state.intake.length === 0
                    ? 'Drop the job description and your resume to start'
                    : `${state.intake.length} document${state.intake.length === 1 ? '' : 's'}`}
                </span>
              </div>

              <IntakeZone
                onPaste={() => { setJdEditText(''); setJdModalOpen(true); }}
                onAdd={async (files) => {
                  const added: IntakeDoc[] = [];
                  for (const f of files) {
                    try {
                      uploadToResearchDocs(f);
                      const content = await extractFile(f);
                      if (content.trim()) added.push({ name: f.name, content, kind: classifyDoc(f.name, content) });
                    } catch (err) {
                      console.warn('[intake] extract failed', f.name, err);
                    }
                  }
                  if (added.length) setState(p => {
                    const intake = [...p.intake, ...added];
                    return { ...p, intake, ...deriveFromIntake(intake) };
                  });
                }}
              />

              <IntakeUrlBox
                companySlug={researchSlug}
                onDocs={(docs) => setState(p => {
                  const intake = [...p.intake, ...docs];
                  return { ...p, intake, ...deriveFromIntake(intake) };
                })}
              />

              {state.intake.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {state.intake.map((d, i) => (
                    <IntakeRow
                      key={`${d.name}-${i}`}
                      doc={d}
                      onKind={(kind) => setState(p => {
                        const intake = p.intake.map((x, xi) => (xi === i ? { ...x, kind } : x));
                        return { ...p, intake, ...deriveFromIntake(intake) };
                      })}
                      onRemove={() => setState(p => {
                        const intake = p.intake.filter((_, xi) => xi !== i);
                        return { ...p, intake, ...deriveFromIntake(intake) };
                      })}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Research Docs — the RAG-indexed copy of everything added above.
                It has no inputs of its own any more: a dropped file already
                went through uploadToResearchDocs, and a pasted link is indexed
                by the same call that reads it, so its own upload button and
                URL box were a second and third way to do what the one intake
                does. */}
            <div>
              <ResearchDocsCard companySlug={researchSlug} />
            </div>

            {/* Generate — what to make, and the button that makes it.
                These controls were up in the navigation band, which put the
                question "what should I generate" above the documents it is
                generated FROM. It is the last step, so it is the last card. */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="px-4 py-3 flex items-center gap-2"
                style={{ background: 'var(--cam-hero-strip, var(--bg-elevated))', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
                <span className="text-xs font-bold uppercase tracking-wider flex-1" style={{ color: 'var(--text-primary)' }}>
                  Generate
                </span>
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {selectedSections.length}/{GENERATE_SECTIONS.length}
                </span>
              </div>

              {/* The checkboxes, on their own, away from navigation. */}
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {GENERATE_SECTIONS.map((id) => {
                  const label = SIDEBAR_SECTIONS.find(x => x.id === id)?.label || id;
                  const checked = selectedSections.includes(id);
                  const done = !!state.sections[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      disabled={generating}
                      onClick={() => setSelectedSections(prev => checked ? prev.filter(x => x !== id) : [...prev, id])}
                      className="flex items-center gap-2 px-2.5 h-8 rounded-lg text-[12px] font-medium text-left transition-colors disabled:opacity-50"
                      style={checked
                        ? { background: 'color-mix(in srgb, var(--cam-primary) 14%, var(--bg-elevated))', color: 'var(--text-primary)', border: '1px solid var(--cam-primary)' }
                        : { background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    >
                      <span aria-hidden className="shrink-0 flex items-center justify-center"
                        style={{
                          width: 14, height: 14, borderRadius: 4,
                          background: checked ? 'var(--cam-primary)' : 'transparent',
                          border: `1.5px solid ${checked ? 'var(--cam-primary)' : 'var(--border)'}`,
                        }}>
                        {checked && (
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      <span className="flex-1 truncate">{label}</span>
                      {/* Says which ones already exist, so re-running is a
                          deliberate choice rather than a surprise. */}
                      {done && (
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cam-gold-leaf)' }} data-tip="Already generated" />
                      )}
                    </button>
                  );
                })}
              </div>

          {/* Select all / deselect all — under the boxes they act on. */}
          {!generating && (
            <div className="flex gap-1.5 px-3 pt-2 pb-3 justify-center max-w-[220px] mx-auto w-full">
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

          {/* Bottom action panel */}
          <div className="p-3 flex flex-wrap items-center justify-center gap-3"
            style={{ borderTop: '1px solid var(--border)' }}>

            {/* Progress bar — only while generating */}
            {generating && (() => {
              // Clamp: `done` can exceed selectedSections.length (stale/extra
              // section statuses), which showed >100% and a wrong X/Y.
              const done = Object.values(sectionStatus).filter(s => s === 'done').length;
              const total = Math.max(selectedSections.length, done, 1);
              return (
              <div className="w-full">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>Generating…</span>
                  <span className="text-[12px] font-bold tabular-nums" style={{ color: 'var(--cam-primary)' }}>
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
            <div className="flex">
              <CloudProviderSelector variant="compact" />
            </div>


            {/* Generate CTA */}
            <button
              onClick={handleGenerate}
              disabled={!hasRequiredDocs || generating || selectedSections.length === 0}
              className="px-6 py-2.5 text-xs font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-40"
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
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Add JD &amp; Resume to start</p>
            )}

            {/* Export and clear, as one row of icons. These were three stacked
                full-width buttons carrying their own labels — the tallest thing
                in the panel, for actions you press once. The format name stays
                INSIDE the glyph: a page with "PDF" on it is read at a glance,
                and a download arrow alone would make the two indistinguishable. */}
            <div className="flex items-center gap-2">
              {generatedCount > 0 && (
                <>
                  <ActionIcon
                    label={downloading === 'pdf' ? 'Saving…' : 'Download as PDF'}
                    onClick={() => handleDownload('pdf')}
                    disabled={!!downloading}
                    busy={downloading === 'pdf'}
                    tint="var(--danger)"
                  >
                    <FileFormatIcon format="PDF" />
                  </ActionIcon>
                  <ActionIcon
                    label={downloading === 'docx' ? 'Saving…' : 'Download as Word (DOCX)'}
                    onClick={() => handleDownload('docx')}
                    disabled={!!downloading}
                    busy={downloading === 'docx'}
                    tint="var(--cam-primary)"
                  >
                    <FileFormatIcon format="DOC" />
                  </ActionIcon>
                </>
              )}
              {/* Always visible, never hover-only — it is destructive and has to
                  be findable. */}
              <ActionIcon
                label="Clear all materials and generated sections"
                onClick={() => { setState({ ...EMPTY_DOC } as any); setSectionStatus({}); setActiveSection('input'); }}
                tint="var(--danger)"
              >
                <TrashIcon />
              </ActionIcon>
            </div>
            {downloadMsg && <p className="text-[12px] text-center" style={{ color: 'var(--text-muted)' }}>{downloadMsg}</p>}
          </div>
            </div>

            {/* Status */}
            <div className="text-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {hasRequiredDocs ? 'Ready to generate — pick your sections above and click Generate' : 'Add JD & Resume to start'}
              </p>
            </div>
          </div>
        ) : activeSection === 'jd-view' ? (
          /* JD formatted viewer */
          <div className="flex flex-col">
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Job Description</h3>
              <button onClick={() => setActiveSection('input')} className="text-[12px] font-medium px-2 py-1 rounded-lg" style={{ color: 'var(--cam-primary)', background: 'var(--accent-subtle)' }}>Edit</button>
            </div>
            <div className="p-6 max-w-4xl w-full mx-auto select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
              <FormattedJD text={state.jd} />
            </div>
          </div>
        ) : (
          /* Generated section content */
          <div className="flex flex-col">
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
                    className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-40"
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
            <div className="p-6 max-w-4xl w-full mx-auto select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
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
              style={{ background: '#1A1D24', borderBottom: '1px solid rgba(255,153,0,0.35)' }}
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
                  className="px-3 py-1.5 rounded-md text-[12px] font-bold uppercase tracking-wider transition-colors"
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
              <label className="block text-[12px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--text-muted)' }}>Paste job posting URL</label>
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
                  style={{ background: 'var(--cam-primary-dk)', color: '#FFFFFF', boxShadow: (!jdUrl.trim() || jdFetching) ? 'none' : '0 4px 12px rgba(0,108,224,0.32)' }}
                >
                  {jdFetching ? 'Fetching…' : 'Fetch JD'}
                </button>
              </div>
              <p className="text-[12px] mt-2" style={{ color: 'var(--text-muted)' }}>
                Supports Workday, Greenhouse, Lever, Ashby, SmartRecruiters, LinkedIn, and most career pages.
              </p>
              {jdUrlError && <p className="text-[12px] mt-2 font-semibold" style={{ color: 'var(--danger)' }}>{jdUrlError}</p>}

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
                  /* Adds to the intake like any other document, rather than
                     assigning state.jd — that field is derived now, so a direct
                     write is erased by the next intake change. Classified from
                     the text, correctable in the row. */
                  const text = jdEditText.trim();
                  if (text) setState(p => {
                    const intake: IntakeDoc[] = [...p.intake, {
                      name: 'Pasted text',
                      content: text,
                      kind: classifyDoc('', text),
                    }];
                    return { ...p, intake, ...deriveFromIntake(intake) };
                  });
                  closeJdModal();
                }}
                disabled={!jdEditText.trim()}
                className="px-5 py-2 rounded-md text-[12px] font-bold uppercase tracking-wider transition-[opacity,transform] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--cam-primary-dk)', color: '#FFFFFF', boxShadow: jdEditText.trim() ? '0 4px 12px rgba(0,108,224,0.32)' : 'none' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
