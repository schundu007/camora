import type { ParsedBlock } from '@/types';
import { cleanText } from '@/lib/text-utils';
import { rankApproaches } from '@/lib/lumora/complexity-rank';

export type BookBlock =
  | { kind: 'prose'; text: string }
  | { kind: 'callout'; label: string; items: string[] }
  /* `twoUp` opts a list into two columns. Explicit rather than inferred: a
   * length heuristic put the Solution card's bullets into two columns, and with
   * a few short bullets they piled into the left one and left the right half of
   * a full-width card empty. Only scan-and-tick lists want this. */
  | { kind: 'list'; items: string[]; twoUp?: boolean }
  | { kind: 'code'; lang: string; code: string }
  // layout 'inline' (default) packs pairs onto shared rows — right for short
  // values like `Time O(n)`. 'rows' gives each pair its own row with the key in
  // a fixed left column, which is the only readable shape once the value is a
  // 2-3 sentence answer rather than a token.
  | { kind: 'kv'; pairs: [string, string][]; layout?: 'inline' | 'rows' }
  | { kind: 'trace'; rows: { step: number; action: string; state: string }[] }
  | { kind: 'walk'; rows: { line?: number; code?: string; explanation: string }[] }
  // Every approach on one grid, so "why this one" is answerable at a glance
  // instead of by flipping between three tabs and holding two bounds in memory.
  | { kind: 'matrix'; rows: MatrixRow[]; activeIndex?: number };

export type MatrixRow = {
  name: string;
  pattern?: string;
  time?: string;
  space?: string;
  /** Derivations — shown on hover rather than spent as columns. */
  timeWhy?: string;
  spaceWhy?: string;
  verdict?: 'best' | 'baseline';
  /** Constraints say this bound times out, from optimality.tleRisk. */
  tleRisk?: boolean;
  note?: string;
};

export type BookSection = { id: string; heading: string; blocks: BookBlock[] };
export type BookDoc = { title?: string; sections: BookSection[] };

/** Heading text per section id. Headings live here, never inside content strings. */
export const SECTION_TITLES: Record<string, string> = {
  problem: 'Problem',
  identification: 'How to spot it',
  budget: 'Constraint budget',
  signals: 'Signals in the statement',
  topic: 'Topic & review',
  probes: 'Interviewer will ask',
  approach: 'Solution',
  code: 'Code',
  complexity: 'Complexity',
  walkthrough: 'Walkthrough',
  trace: 'Dry-run trace',
  tradeoffs: 'Tradeoffs',
  comparison: 'Approach comparison',
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

/**
 * One row per approach, ranked. Null for a single-solution answer — a
 * comparison of one is a table with nothing to compare.
 */
const matrixOrNull = (sd: any, activeIndex: number): BookBlock | null => {
  const sols = Array.isArray(sd?.solutions) ? sd.solutions : [];
  if (sols.length < 2) return null;

  const { bestIdx, worstIdx } = rankApproaches(
    sols.map((s: any) => ({ time: s?.complexity?.time, space: s?.complexity?.space })),
  );

  const rows: MatrixRow[] = sols.map((s: any, i: number) => ({
    name: txt(s?.name) || `Solution ${i + 1}`,
    pattern: txt(s?.patternTag) || undefined,
    time: txt(s?.complexity?.time) || undefined,
    space: txt(s?.complexity?.space) || undefined,
    timeWhy: txt(s?.complexity?.timeWhy) || undefined,
    spaceWhy: txt(s?.complexity?.spaceWhy) || undefined,
    verdict: i === bestIdx ? 'best' : i === worstIdx ? 'baseline' : undefined,
    tleRisk: s?.optimality?.tleRisk === true,
    // submittableReason is the sharper of the two — it says what actually
    // breaks — so it wins when both are present.
    note: txt(s?.submittableReason) || txt(s?.optimality?.why) || undefined,
  }));

  return { kind: 'matrix', rows, activeIndex };
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
  /* How the pattern was identified. The technique name alone is the half an
   * interviewer already assumes; what they actually ask is "how did you know?".
   * The backend walks a decision chart and validates the path against it, so
   * each step here is a real question with the words from THIS statement that
   * settled it. Rendered first, because it is the order the reasoning happened.
   *
   * Optional by design: answers cached before the field existed, and any walk
   * the backend rejected, simply render no section. */
  const ident = sd.identification;
  if (ident && Array.isArray(ident.path) && ident.path.length) {
    /* Only the decisive steps. A full walk is mostly "no" — Trapping Rain Water
     * answers no twelve times before the two that matter — and a wall of
     * negatives buries the reasoning it was meant to show. The yes answers ARE
     * the derivation; the rest is the chart's shape, not this problem's.
     *
     * Fallback: a path can legitimately end on a no-branch, so if nothing was
     * answered yes, keep the last step — that is the one that picked the leaf. */
    const steps = ident.path.filter((st: any) => txt(st?.question) && txt(st?.answer));
    const decisive = steps.filter((st: any) => txt(st.answer).toLowerCase() === 'yes');
    const shown = decisive.length ? decisive : steps.slice(-1);

    const trail: [string, string][] = shown.map((st: any) => {
      const ev = txt(st?.evidence);
      return [`${txt(st.question)} — ${txt(st.answer)}`, ev || '—'] as [string, string];
    });

    const verdict: [string, string][] = [];
    if (txt(ident.dataStructure)) verdict.push(['Data structure', txt(ident.dataStructure)]);
    if (txt(ident.technique)) verdict.push(['Technique', txt(ident.technique)]);

    push(sections, 'identification', [
      verdict.length ? { kind: 'kv', pairs: verdict } : null,
      trail.length ? { kind: 'kv', pairs: trail, layout: 'rows' } : null,
      strList(ident.ruledOut).length
        ? { kind: 'callout', label: 'Ruled out', items: strList(ident.ruledOut) }
        : null,
    ]);
  }

  /* Interview cards. The backend has already dropped anything it could check and
   * disprove — a quoted signal absent from the statement, a topic section we do
   * not have — so whatever arrives here is renderable as-is. */
  const iv = sd.interview;
  if (iv && typeof iv === 'object') {
    // Constraint budget: the bound, the ceiling it forces, and whether this
    // solution clears it. The TLE verdict is the point of the card.
    const bPairs: [string, string][] = [];
    if (txt(iv.budget?.n)) bPairs.push(['Input bound', txt(iv.budget.n)]);
    if (txt(iv.budget?.ceiling)) bPairs.push(['Forces', txt(iv.budget.ceiling)]);
    if (txt(iv.budget?.verdict)) bPairs.push(['This solution', txt(iv.budget.verdict)]);
    push(sections, 'budget', [bPairs.length ? { kind: 'kv', pairs: bPairs } : null]);

    const sigs: [string, string][] = Array.isArray(iv.signals)
      ? iv.signals
          .map((g: any) => [txt(g?.phrase), txt(g?.implies)] as [string, string])
          .filter(([a, b]: [string, string]) => Boolean(a && b))
      : [];
    push(sections, 'signals', [sigs.length ? { kind: 'kv', pairs: sigs, layout: 'rows' } : null]);

    const tPairs: [string, string][] = [];
    if (txt(iv.topic?.section)) tPairs.push(['Pattern', txt(iv.topic.section)]);
    const review = Array.isArray(iv.topic?.review)
      ? iv.topic.review
          .map((r: any) => (txt(r?.lesson) ? `${txt(r.lesson)}${txt(r?.section) ? ` — ${txt(r.section)}` : ''}` : ''))
          .filter(Boolean)
      : [];
    push(sections, 'topic', [
      tPairs.length ? { kind: 'kv', pairs: tPairs } : null,
      review.length ? { kind: 'callout', label: 'Review', items: review } : null,
    ]);

    const probes: [string, string][] = Array.isArray(iv.probes)
      ? iv.probes
          .map((q: any) => [txt(q?.q), txt(q?.a)] as [string, string])
          .filter(([a, b]: [string, string]) => Boolean(a && b))
      : [];
    push(sections, 'probes', [
      probes.length ? { kind: 'kv', pairs: probes, layout: 'rows' } : null,
      strList(iv.pitfalls).length
        ? { kind: 'callout', label: 'Common mistakes', items: strList(iv.pitfalls) }
        : null,
    ]);
  }

  const keyPoints = strList(pitchObj?.keyPoints);
  const narration = txt(sol?.narration);
  const solApproach = txt(sol?.approach);
  // Bullets, not a wall of paragraphs. These four sources are already four
  // separate statements — narration, the terse written approach, and the two
  // pitch fields — and only read as an essay because they were rendered as
  // consecutive <p>s. As a list the card is scannable mid-interview, which is
  // the only way it is ever actually read.
  //
  // Dedupe on exact text: the sources overlap often (narration and
  // pitch.approach frequently restate each other), and paragraphs hid that in a
  // way bullets would put on display as two near-identical points.
  const solutionPoints = [
    narration,
    solApproach,
    pitchStr || txt(pitchObj?.opener),
    txt(pitchObj?.approach),
  ].filter((s): s is string => !!s);
  const points = [...new Set(solutionPoints)];
  push(sections, 'approach', [
    points.length ? { kind: 'list', items: points } : null,
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

  push(sections, 'tradeoffs', [listOrNull(pitchObj?.tradeoffs)]);

  // Approach comparison. The three solutions already carry everything this
  // needs — name, patternTag, both bounds with their derivations, and (when the
  // constraints were known) optimality.tleRisk — so the matrix costs no extra
  // generation and appears on answers that were cached before it existed.
  //
  // "Best" is computed from the bounds rather than taken as solutions[2]: the
  // model is asked to order simplest → most optimal, and mostly does, but a
  // badge that just trusts the ordering is a badge that lies when it doesn't.
  push(sections, 'comparison', [matrixOrNull(sd, solIdx)]);

  const trace = Array.isArray(sol?.trace)
    ? sol.trace
        .map((r: any) => ({ step: r.step, action: txt(r.action), state: txt(r.state) }))
        .filter((r: any) => r.action || r.state)
    : [];
  push(sections, 'trace', [trace.length ? { kind: 'trace', rows: trace } : null]);

  // Edge cases come from two places the model fills independently: pitch.edgeCases
  // (always present) and the top-level edgeScenarios (only when inputTrust was
  // inferred). edgeScenarios was being generated and then dropped on the floor
  // here — it never had a section, so it never reached the candidate.
  const edgeItems = [...strList(pitchObj?.edgeCases), ...strList(sd.edgeScenarios)];
  push(sections, 'edgecases', [edgeItems.length ? { kind: 'list', items: dedupeStrings(edgeItems), twoUp: true } : null]);

  // Follow-ups: what the interviewer asks AFTER the solution is accepted. Q and A
  // are a kv pair rather than prose so the question stays scannable — mid-interview
  // the candidate is looking for one of these, not reading the set.
  const followups = Array.isArray(sd.followups)
    ? sd.followups
        .map((f: any) => [txt(f?.q), txt(f?.a)] as [string, string])
        .filter(([q, a]: [string, string]) => q && a)
    : [];
  push(sections, 'followup', [followups.length ? { kind: 'kv', pairs: followups, layout: 'rows' } : null]);

  return { title: txt(sol?.name) || undefined, sections: orderSections(sections) };
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

/**
 * The order a candidate needs these in during an interview.
 *
 * Sections were emitted in whatever order the builder happened to push them,
 * which put reference material above the answer. The sequence here follows how
 * the conversation actually goes: how you recognised the pattern, what you are
 * going to do, the code, what it costs, then the line-by-line, then the material
 * you reach for when questioned.
 *
 * Ids not listed keep their original relative order at the end, so other doc
 * builders (CoFix, design) are unaffected.
 */
const SECTION_ORDER = [
  'problem',
  // Reading order, not answer order: you read the statement and notice the
  // trigger phrases, and those are what send you down the chart. Signals first
  // means the card that comes first is the one you look at first.
  'signals',
  'identification',   // how to spot it — the walk those signals led to
  // What it costs and how the approaches compare, side by side above the
  // Solution: both are short tables, and they are what an interviewer asks
  // about first once you have named the pattern.
  'complexity',
  'comparison',
  'approach',         // Solution
  'code',
  'walkthrough',
  'trace',
  'budget',           // constraint budget
  'edgecases',
  'testcases',
  'tradeoffs',
  'probes',           // interviewer will ask
  'followup',
  'topic',            // what to review afterwards
];

export function orderSections(sections: BookSection[]): BookSection[] {
  const rank = (id: string) => {
    const i = SECTION_ORDER.indexOf(id);
    return i === -1 ? SECTION_ORDER.length : i;
  };
  // Stable: equal ranks (including all unlisted ids) keep their original order.
  return sections
    .map((section, i) => ({ section, i }))
    .sort((a, b) => rank(a.section.id) - rank(b.section.id) || a.i - b.i)
    .map(({ section }) => section);
}
