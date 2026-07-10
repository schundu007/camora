import type { ParsedBlock } from '@/types';
import { cleanText } from '@/lib/text-utils';

export type BookBlock =
  | { kind: 'prose'; text: string }
  | { kind: 'callout'; label: string; items: string[] }
  | { kind: 'list'; items: string[] }
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'kv'; pairs: [string, string][] }
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
};

const txt = (v: unknown): string => (typeof v === 'string' ? cleanText(v) : '');

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(txt).filter(Boolean) : [];

/** Split a block body into bullet lines, tolerating `-`, `*`, and bare lines. */
const bullets = (content: string): string[] =>
  content
    .split('\n')
    .map(l => cleanText(l.replace(/^\s*[-•]\s*/, '')))
    .filter(Boolean);

/** `Time: O(n)` / `Space: O(1)` → kv pairs. Lines without a colon become bullets. */
const parseKv = (content: string): BookBlock => {
  const pairs: [string, string][] = [];
  const rest: string[] = [];
  for (const raw of content.split('\n')) {
    const line = cleanText(raw.replace(/^\s*[-•]\s*/, ''));
    if (!line) continue;
    const i = line.indexOf(':');
    if (i > 0) pairs.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    else rest.push(line);
  }
  return pairs.length ? { kind: 'kv', pairs } : { kind: 'list', items: rest };
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

  // Solution — narration is the spoken script and reads best; fall back to approach.
  const keyPoints = strList(pitchObj?.keyPoints);
  push(sections, 'approach', [
    proseOrNull(sol?.narration || sol?.approach),
    pitchStr ? { kind: 'prose', text: pitchStr } : proseOrNull(pitchObj?.opener),
    keyPoints.length ? { kind: 'callout', label: 'Key points', items: keyPoints } : null,
  ]);

  const time = txt(sol?.complexity?.time);
  const space = txt(sol?.complexity?.space);
  const pairs: [string, string][] = [];
  if (time) pairs.push(['Time', time]);
  if (space) pairs.push(['Space', space]);
  push(sections, 'complexity', [pairs.length ? { kind: 'kv', pairs } : null]);

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
  push(sections, 'edgecases', [listOrNull(pitchObj?.edgeCases)]);

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
      push(sections, id, [parseKv(body)]);
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
