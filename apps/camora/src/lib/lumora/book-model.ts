import type { ParsedBlock } from '@/types';
import { cleanText } from '@/lib/text-utils';

export type BookBlock =
  | { kind: 'prose'; text: string }
  | { kind: 'callout'; label: string; items: string[] }
  | { kind: 'list'; items: string[] }
  | { kind: 'code'; lang: string; code: string }
  // layout 'inline' (default) packs pairs onto shared rows — right for short
  // values like `Time O(n)`. 'rows' gives each pair its own row with the key in
  // a fixed left column, which is the only readable shape once the value is a
  // 2-3 sentence answer rather than a token.
  | { kind: 'kv'; pairs: [string, string][]; layout?: 'inline' | 'rows' }
  | { kind: 'trace'; rows: { step: number; action: string; state: string }[] }
  | { kind: 'walk'; rows: { line?: number; code?: string; explanation: string }[] };

export type BookSection = { id: string; heading: string; blocks: BookBlock[] };
export type BookDoc = { title?: string; sections: BookSection[] };

/** Heading text per section id. Headings live here, never inside content strings. */
export const SECTION_TITLES: Record<string, string> = {
  problem: 'Problem',
  approach: 'Solution',
  code: 'Code',
  complexity: 'Complexity',
  walkthrough: 'Walkthrough',
  trace: 'Dry-run trace',
  tradeoffs: 'Tradeoffs',
  edgecases: 'Edge cases',
  testcases: 'Test cases',
  followup: 'Follow-up Q&A',
  requirements: 'Requirements',
  scalemath: 'Scale math',
  deepdesign: 'Layer design',
  apidesign: 'API design',
  datamodel: 'Data model',
  technologies: 'Technologies',
  cloudservices: 'Cloud services',
  changes: 'Changes',
  concepts: 'Concepts',
  steps: 'Step by step',
};

const txt = (v: unknown): string => (typeof v === 'string' ? cleanText(v) : '');

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(txt).filter(Boolean) : [];

/** Split a block body into bullet lines. Strips leading `-`/`•` markers; stray `*` is removed by cleanText(). */
const bullets = (content: string): string[] =>
  content
    .split('\n')
    .map(l => cleanText(l.replace(/^\s*[-•]\s*/, '')))
    .filter(Boolean);

/** `Time: O(n)` / `Space: O(1)` → kv pairs. Lines without a colon become a trailing list block. */
const parseKv = (content: string): BookBlock[] => {
  const pairs: [string, string][] = [];
  const rest: string[] = [];
  for (const raw of content.split('\n')) {
    const line = cleanText(raw.replace(/^\s*[-•]\s*/, ''));
    if (!line) continue;
    const i = line.indexOf(':');
    if (i > 0) pairs.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    else rest.push(line);
  }
  const out: BookBlock[] = [];
  if (pairs.length) out.push({ kind: 'kv', pairs });
  if (rest.length) out.push({ kind: 'list', items: rest });
  return out;
};

/** Append a section only when it has at least one block. */
const push = (out: BookSection[], id: string, blocks: (BookBlock | null)[]) => {
  const kept = blocks.filter(Boolean) as BookBlock[];
  if (kept.length) out.push({ id, heading: SECTION_TITLES[id] ?? id, blocks: kept });
};

const proseOrNull = (v: unknown): BookBlock | null => {
  const t = txt(v);
  return t ? { kind: 'prose', text: t } : null;
};

/** Case-insensitive dedupe that keeps first-seen order. */
const dedupeStrings = (items: string[]): string[] => {
  const seen = new Set<string>();
  return items.filter(s => {
    const k = s.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const listOrNull = (v: unknown): BookBlock | null => {
  const items = strList(v);
  return items.length ? { kind: 'list', items } : null;
};

/** Live Coding: the parsed `jsonSolution` object. */
export function docFromSolution(sd: any, solIdx = 0): BookDoc {
  const sections: BookSection[] = [];
  if (!sd) return { sections };

  const sol = Array.isArray(sd.solutions) ? sd.solutions[solIdx] ?? sd.solutions[0] : null;
  const pitch = sd.pitch;
  const pitchObj = pitch && typeof pitch === 'object' ? pitch : null;
  const pitchStr = typeof pitch === 'string' ? txt(pitch) : '';

  // Solution — narration is the spoken script and reads best; sol.approach is the
  // terse written approach (schema-distinct from narration, shown alongside it when
  // they differ); pitch.opener/approach are the object-pitch summary paragraphs.
  const keyPoints = strList(pitchObj?.keyPoints);
  const narration = txt(sol?.narration);
  const solApproach = txt(sol?.approach);
  push(sections, 'approach', [
    narration ? { kind: 'prose', text: narration } : null,
    solApproach && solApproach !== narration ? { kind: 'prose', text: solApproach } : null,
    pitchStr ? { kind: 'prose', text: pitchStr } : proseOrNull(pitchObj?.opener),
    proseOrNull(pitchObj?.approach),
    keyPoints.length ? { kind: 'callout', label: 'Key points', items: keyPoints } : null,
  ]);

  const time = txt(sol?.complexity?.time);
  const space = txt(sol?.complexity?.space);
  const pairs: [string, string][] = [];
  if (time) pairs.push(['Time', time]);
  if (space) pairs.push(['Space', space]);
  // The bound alone is the half the interviewer already assumes; the derivation
  // is what they ask for next. The backend has emitted timeWhy/spaceWhy on the
  // CoFix path for a while and this dropped them on the floor, rendering a bare
  // "Time O(n log n)" with no reasoning anywhere on screen.
  // Optional by design: answers cached before the field existed simply fall back
  // to the bounds alone rather than rendering an empty aside.
  const whys = [
    txt(sol?.complexity?.timeWhy) ? `Time — ${txt(sol?.complexity?.timeWhy)}` : null,
    txt(sol?.complexity?.spaceWhy) ? `Space — ${txt(sol?.complexity?.spaceWhy)}` : null,
  ].filter(Boolean) as string[];
  push(sections, 'complexity', [
    pairs.length ? { kind: 'kv', pairs } : null,
    whys.length ? { kind: 'callout', label: 'Why these bounds', items: whys } : null,
  ]);

  const walk = Array.isArray(sol?.explanations)
    ? sol.explanations
        .map((e: any) => ({ line: e.line, code: e.code, explanation: txt(e.explanation) }))
        .filter((r: any) => r.explanation || r.code)
    : [];
  push(sections, 'walkthrough', [walk.length ? { kind: 'walk', rows: walk } : null]);

  const trace = Array.isArray(sol?.trace)
    ? sol.trace
        .map((r: any) => ({ step: r.step, action: txt(r.action), state: txt(r.state) }))
        .filter((r: any) => r.action || r.state)
    : [];
  push(sections, 'trace', [trace.length ? { kind: 'trace', rows: trace } : null]);

  push(sections, 'tradeoffs', [listOrNull(pitchObj?.tradeoffs)]);

  // Edge cases come from two places the model fills independently: pitch.edgeCases
  // (always present) and the top-level edgeScenarios (only when inputTrust was
  // inferred). edgeScenarios was being generated and then dropped on the floor
  // here — it never had a section, so it never reached the candidate.
  const edgeItems = [...strList(pitchObj?.edgeCases), ...strList(sd.edgeScenarios)];
  push(sections, 'edgecases', [edgeItems.length ? { kind: 'list', items: dedupeStrings(edgeItems) } : null]);

  // Follow-ups: what the interviewer asks AFTER the solution is accepted. Q and A
  // are a kv pair rather than prose so the question stays scannable — mid-interview
  // the candidate is looking for one of these, not reading the set.
  const followups = Array.isArray(sd.followups)
    ? sd.followups
        .map((f: any) => [txt(f?.q), txt(f?.a)] as [string, string])
        .filter(([q, a]: [string, string]) => q && a)
    : [];
  push(sections, 'followup', [followups.length ? { kind: 'kv', pairs: followups, layout: 'rows' } : null]);

  return { title: txt(sol?.name) || undefined, sections };
}

/** Block types the history renderer supports, in reading order. */
const BLOCK_ORDER = [
  'PROBLEM', 'APPROACH', 'CODE', 'COMPLEXITY', 'WALKTHROUGH',
  'REQUIREMENTS', 'SCALEMATH', 'DEEPDESIGN', 'APIDESIGN', 'DATAMODEL',
  'TECHNOLOGIES', 'CLOUDSERVICES', 'TRADEOFFS', 'EDGECASES', 'TESTCASES', 'FOLLOWUP',
] as const;

/** Saved sessions: the tag-block array. */
export function docFromBlocks(blocks: ParsedBlock[]): BookDoc {
  const byType: Record<string, ParsedBlock> = {};
  for (const b of blocks || []) {
    if (b && typeof b.content === 'string' && b.content.trim()) byType[b.type] = b;
  }

  const sections: BookSection[] = [];
  for (const type of BLOCK_ORDER) {
    const b = byType[type];
    if (!b) continue;
    const id = type.toLowerCase();
    const body = b.content;

    if (type === 'CODE') {
      push(sections, id, [{ kind: 'code', lang: b.lang || 'python', code: body }]);
    } else if (type === 'COMPLEXITY') {
      push(sections, id, parseKv(body));
    } else if (type === 'WALKTHROUGH') {
      const rows = bullets(body).map(explanation => ({ explanation }));
      push(sections, id, [rows.length ? { kind: 'walk', rows } : null]);
    } else if (type === 'PROBLEM' || type === 'APPROACH') {
      push(sections, id, [proseOrNull(body)]);
    } else {
      const items = bullets(body);
      push(sections, id, [items.length ? { kind: 'list', items } : null]);
    }
  }
  return { sections };
}

/** CoFix: the fix answer (changes + walkthrough) plus an optional problem analysis. */
export function docFromCoFix(
  answer: { changes?: any[]; walkthrough?: any[] },
  analysis?: {
    title?: string;
    problem?: string;
    concepts?: string[];
    steps?: { code?: string; text?: string }[];
    input_format?: string;
    output_format?: string;
    examples?: { input?: string; output?: string; explanation?: string }[];
  },
  view: 'all' | 'problem' | 'learn' = 'all',
): BookDoc {
  const sections: BookSection[] = [];

  if (analysis && (view === 'all' || view === 'problem')) {
    const inputFmt = txt(analysis.input_format);
    const outputFmt = txt(analysis.output_format);
    const ioPairs: [string, string][] = [];
    if (inputFmt) ioPairs.push(['Input format', inputFmt]);
    if (outputFmt) ioPairs.push(['Output format', outputFmt]);

    const exampleItems = (analysis.examples || [])
      .map(ex => {
        const input = txt(ex.input);
        const output = txt(ex.output);
        const base = [input, output].filter(Boolean).join(' → ');
        if (!base) return '';
        const explanation = txt(ex.explanation);
        return explanation ? `${base} — ${explanation}` : base;
      })
      .filter(Boolean);

    push(sections, 'problem', [
      proseOrNull(analysis.problem),
      ioPairs.length ? { kind: 'kv', pairs: ioPairs } : null,
      exampleItems.length ? { kind: 'list', items: exampleItems } : null,
    ]);
  }

  if (analysis && (view === 'all' || view === 'learn')) {
    push(sections, 'concepts', [listOrNull(analysis.concepts)]);

    const steps = (analysis.steps || [])
      .map(s => ({ code: s.code, explanation: txt(s.text) }))
      .filter(s => s.explanation || s.code);
    push(sections, 'steps', [steps.length ? { kind: 'walk', rows: steps } : null]);
  }

  if (view === 'all') {
    const walk = (answer.walkthrough || [])
      .map((w: any) => ({
        explanation: [txt(w.context) && `(${txt(w.context)})`, txt(w.text)].filter(Boolean).join(' '),
        code: typeof w.lines === 'string' ? `L${w.lines}` : undefined,
      }))
      .filter((r: any) => r.explanation);
    push(sections, 'walkthrough', [walk.length ? { kind: 'walk', rows: walk } : null]);

    const changes = (answer.changes || [])
      .map((c: any) => [txt(c.label), txt(c.note)].filter(Boolean).join(' — '))
      .filter(Boolean);
    push(sections, 'changes', [changes.length ? { kind: 'list', items: changes } : null]);
  }

  return { title: txt(analysis?.title) || undefined, sections };
}
