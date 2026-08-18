import type { ParsedBlock } from '@/types';
import { cleanText, sentenceCase, sentenceCaseAll } from '@/lib/text-utils';
import { notAlreadyIn } from '@/lib/lumora/analysis-parse';
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
  /** Stated requirements this approach breaks, from requirementCheck.violates. */
  violates?: string[];
};

export type BookSection = { id: string; heading: string; blocks: BookBlock[] };
export type BookDoc = { title?: string; sections: BookSection[] };

/** Heading text per section id. Headings live here, never inside content strings. */
export const SECTION_TITLES: Record<string, string> = {
  problem: 'Problem',
  identification: 'How to spot it',
  ruledout: 'Ruled out',
  mandates: 'What the statement demands',
  budget: 'Constraint budget',
  signals: 'Signals in the statement',
  probes: 'Interview questions',
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

/**
 * Probes that just ask what the bounds are.
 *
 * The Complexity card states both and derives each one, so this probe is the
 * same answer printed twice — and it displaces a question the reader has not
 * already been handed.
 *
 * Deliberately scoped to questions ASKING FOR the complexity. A question about
 * changing it ("could you get this under O(n) space?", "what would you trade to
 * make it faster?") is a different question with a different answer, and stays.
 */
const ASKS_FOR_COMPLEXITY =
  /^\s*(?:what|what's|whats|can you (?:state|give)|tell me|explain)\b[^?]*\b(?:time|space|runtime|big[-\s]?o)\b[^?]*\bcomplexit|^\s*what[^?]*\bbig[-\s]?o\b/i;

const txt = (v: unknown): string => (typeof v === 'string' ? cleanText(v) : '');

/* Every bullet the book renders goes through one of these two, so sentence case
 * is applied once here rather than per card. Prose, kv values and code are
 * deliberately untouched: a kv value continues its label grammatically, and
 * code is code. */
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(x => sentenceCaseAll(txt(x))).filter(Boolean) : [];

/** Split a block body into bullet lines. Strips leading `-`/`•` markers; stray `*` is removed by cleanText(). */
const bullets = (content: string): string[] =>
  content
    .split('\n')
    .map(l => sentenceCaseAll(cleanText(l.replace(/^\s*[-•]\s*/, ''))))
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
  // Book style all the way down: a paragraph's every sentence opens with a
  // capital, not just the one the model happened to start with.
  const t = sentenceCaseAll(txt(v));
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
 * The stated requirements THIS solution breaks.
 *
 * A statement's prose carries requirements the constraints never mention: a
 * mandated bound ("must run in O(n) time"), a banned operation ("without using
 * the division operation"), and the target named in a Follow-up line. The
 * backend reads them into interview.requirements and marks each solution
 * against them; this is the per-solution half of that.
 *
 * Absent on answers generated before the field existed, which read as "meets
 * everything" — the same as before, rather than a wall of false warnings.
 */
const violationsOf = (sol: any): string[] | undefined => {
  if (sol?.requirementCheck?.ok === true) return undefined;
  const items = strList(sol?.requirementCheck?.violates);
  return items.length ? items : undefined;
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
    violates: violationsOf(s),
    // submittableReason is the sharper of the two — it says what actually
    // breaks — so it wins when both are present.
    note: txt(s?.submittableReason) || txt(s?.optimality?.why) || undefined,
  }));

  return { kind: 'matrix', rows, activeIndex };
};

/**
 * What this solution costs, deep enough to defend out loud — as a beat for the
 * comment header above the code (see prependWalkthrough).
 *
 * Complexity used to be a card in the book AND one spoken line in that header:
 * the same two bounds written twice, a pane apart, and neither copy sat beside
 * the loops being counted. The card is gone and this is what replaced it, so it
 * has to carry everything the card carried and then the parts the card never
 * had room for:
 *
 *   - the bound, and under it the derivation the model already emits
 *     (timeWhy / spaceWhy — the arithmetic, naming the real loops);
 *   - what the alternatives would have cost, which is the answer to "why not
 *     just sort it?" — asked far more often than a request to restate the bound;
 *   - what the constraints demand, and whether this clears that bar, because a
 *     bound only means something next to the size of n it has to survive.
 *
 * Assembled from the structured fields rather than from the model's spoken beat:
 * it costs no extra generation, it cannot drift from the matrix beside it, and
 * it appears on answers cached long before any of this existed.
 *
 * Newlines are load-bearing — the header wraps each line separately and keeps
 * its indent, so a two-space indent renders as a note nested under its bound.
 */
export function complexityBeat(sd: any, solIdx = 0): [string, string] | null {
  const sols = Array.isArray(sd?.solutions) ? sd.solutions : [];
  const sol = sols[solIdx] ?? sols[0] ?? null;
  const time = txt(sol?.complexity?.time);
  const space = txt(sol?.complexity?.space);
  // No bound, no beat: a header that says "Complexity" and then nothing is
  // worse than one that skips the subject.
  if (!time && !space) return null;

  const lines: string[] = [];
  if (time) {
    lines.push(`Time — ${time}`);
    if (txt(sol?.complexity?.timeWhy)) lines.push(`  ${txt(sol.complexity.timeWhy)}`);
  }
  if (space) {
    lines.push(`Space — ${space}`);
    if (txt(sol?.complexity?.spaceWhy)) lines.push(`  ${txt(sol.complexity.spaceWhy)}`);
  }

  // The alternatives, by name and bound. Only the ones that are not this
  // solution, and only when they actually state a cost.
  const others = sols
    .map((s: any, i: number) => ({ s, i }))
    .filter(({ s, i }: any) => i !== solIdx && (txt(s?.complexity?.time) || txt(s?.complexity?.space)))
    .map(({ s, i }: any) =>
      `${txt(s?.name) || `Solution ${i + 1}`}: ${txt(s?.complexity?.time) || '?'} time, ${txt(s?.complexity?.space) || '?'} space`);
  if (others.length) {
    lines.push('', 'Against the alternatives —');
    others.forEach((o: string) => lines.push(`  ${o}`));
  }

  // What the STATEMENT demanded and this approach does not do. Placed above the
  // constraint check because it is the harder failure: too slow is a submission
  // that scores badly, while "the statement said no division" is a submission
  // that does not count at all.
  const violates = violationsOf(sol);
  if (violates?.length) {
    lines.push('', 'Does not meet the statement —');
    violates.forEach((v: string) => lines.push(`  ${v}`));
  }

  // optimality is only filled when the statement gave constraints, so this
  // whole paragraph is absent rather than empty on a problem that gave none.
  const required = txt(sol?.optimality?.required);
  if (required) {
    const achieved = txt(sol?.optimality?.achieved) || time || space;
    const verdict = sol?.optimality?.tleRisk === true
      ? `${achieved} is over that budget, so the biggest inputs time out`
      : `${achieved} fits`;
    lines.push('', `The constraints demand ${required} — ${verdict}.`);
    if (txt(sol?.optimality?.why)) lines.push(`  ${txt(sol.optimality.why)}`);
  }

  return ['Complexity', lines.join('\n')];
}

/**
 * Content generated per-solution AFTER the answer, folded into the cards it
 * belongs in rather than shown in a panel of its own.
 *
 * The Deep Dive chip names the follow-ups coming next; that is the same thing
 * "Interviewer will ask" holds. The Issues chip names what an interviewer would
 * stop you on; that is "Common mistakes". Keeping them apart meant reading the
 * same subject in two panes and noticing neither was complete.
 */
export type SolutionExtras = {
  probes?: [string, string][];
  pitfalls?: string[];
  /** The Explain chip: the spoken walk-through, as labelled beats. */
  explain?: [string, string][];
};

/**
 * Spoken filler, at the head of a sentence only.
 *
 * The model is asked for the candidate's own voice, and a person warming up
 * says "So, basically, what I'd do here is…". Read aloud that is natural; read
 * off a card mid-interview it is three words before the sentence starts, on
 * every bullet, and it is the first thing the eye has to skip past.
 *
 * Two groups, because half these words are also ordinary sentence openers in
 * this domain. "So" and "basically" begin nothing else, so they go bare; "right"
 * and "now" must be punctuated to count, or "Right pointer moves inward" loses
 * its pointer and "Now walk the array" loses its instruction.
 */
const FILLER_OPENER =
  /^(?:(?:so|ok|okay|alright|basically|essentially|honestly|i mean)\b[,:]?\s+|(?:right|well|now|look|clearly|obviously)\s*[,:]\s*)/i;

/** "The obvious approach here is to just X" → "X". Hedges that carry no fact. */
const HEDGE =
  /^(?:the (?:obvious|simple|naive|first|straightforward) (?:approach|idea|thing|way)(?: here)? (?:is|would be) to (?:just )?|my (?:first )?(?:instinct|thought|approach)(?: here)? (?:is|was) to (?:just )?|what i(?:'d| would) do(?: here)? is (?:to )?(?:just )?|the (?:key )?idea (?:here )?is (?:to |that )?)/i;

/** Sentence-ish split that does not break on O(n log n) or 1e5. */
const SENTENCES = /(?<=[.!?])\s+(?=[A-Z"'`(])/;

/**
 * The Solution card's bullets: same facts, fewer words, nothing said twice.
 *
 * Its sources overlap by construction — narration is the spoken version of
 * approach, and both are written from the same notes — so exact-text dedupe
 * caught almost none of it: the repeats came back as the same sentence inside
 * two different paragraphs. Deduping at SENTENCE level is what actually removes
 * them, and it lets a bullet keep the half of itself that is new instead of
 * being dropped or kept whole.
 *
 * Then the openers go. Filler and hedges are the only words cut — every clause
 * that states a fact survives, because the alternative is a card that quietly
 * loses the reason an approach was chosen.
 *
 * The sentences come back split, one per entry, so the caller can decide what
 * each source becomes: the spoken narration reads as a paragraph, and the terse
 * written sources become one bullet per statement.
 */
export const condensePoints = (raw: string[]): string[][] => {
  const seen = new Set<string>();
  const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();

  // A rhetorical question belongs with its answer. "Why two passes?" on its own
  // line is a bullet that asks the reader something instead of telling them.
  const joinQuestions = (parts: string[]): string[] =>
    parts.reduce<string[]>((acc, part) => {
      const prev = acc[acc.length - 1];
      if (prev?.endsWith('?')) acc[acc.length - 1] = `${prev} ${part}`;
      else acc.push(part);
      return acc;
    }, []);

  // Grouped by source, not flattened: the caller renders the FIRST group (the
  // spoken narration) as a paragraph and the rest as bullets, and it cannot do
  // that if every sentence arrives in one undifferentiated list.
  return raw.map(point =>
    joinQuestions((point || '').split(SENTENCES).map(part => part.trim()))
      .filter(part => {
        const k = key(part);
        // Anything with no letters or digits left after normalising is
        // punctuation debris, not a statement. Length is deliberately NOT a
        // test: "Use a heap." is eleven characters and is the whole answer.
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map(part => {
        // Looped: they stack. "So, basically, what I'd do here is…" is three
        // markers deep before the sentence starts. Bounded so a pathological
        // string cannot spin.
        let trimmed = part;
        for (let i = 0; i < 3 && FILLER_OPENER.test(trimmed); i++) trimmed = trimmed.replace(FILLER_OPENER, '');
        trimmed = trimmed.replace(HEDGE, '').trim();
        // Never strip a sentence down to nothing: if the hedge WAS the
        // sentence, the original said something the cut version does not.
        return sentenceCaseAll(trimmed || part);
      }),
  );
};

/** Live Coding: the parsed `jsonSolution` object. */
export function docFromSolution(sd: any, solIdx = 0, extras?: SolutionExtras): BookDoc {
  const sections: BookSection[] = [];
  if (!sd) return { sections };

  const sol = Array.isArray(sd.solutions) ? sd.solutions[solIdx] ?? sd.solutions[0] : null;
  // Filled from sd.interview when present, then topped up from the Deep Dive /
  // Issues chips below. Declared here so the card exists either way.
  const probes: [string, string][] = [];
  const pitfalls: string[] = [];
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
      const ev = sentenceCaseAll(txt(st?.evidence));
      return [`${sentenceCaseAll(txt(st.question))} — ${txt(st.answer)}`, ev || '—'] as [string, string];
    });

    const verdict: [string, string][] = [];
    if (txt(ident.dataStructure)) verdict.push(['Data structure', txt(ident.dataStructure)]);
    if (txt(ident.technique)) verdict.push(['Technique', txt(ident.technique)]);

    push(sections, 'identification', [
      verdict.length ? { kind: 'kv', pairs: verdict } : null,
      // Sentences, both halves: the key is the chart's question and the value is
      // the words in the statement that answered it.
      trail.length ? { kind: 'kv', pairs: trail, layout: 'rows' } : null,
    ]);

    /* Ruled out is its own card, directly above the Solution.
     *
     * It was a callout at the foot of "How to spot it", which is where it was
     * written but not where it is read: the techniques you did NOT pick are the
     * answer to "why not a heap?", and that question comes when the interviewer
     * is looking at the approach — not while they are still following how you
     * recognised the pattern. As a card of its own it sits where the question
     * gets asked, and it stops the identification card ending on a list of
     * things the answer is not.
     */
    push(sections, 'ruledout', [
      strList(ident.ruledOut).length ? { kind: 'list', items: strList(ident.ruledOut) } : null,
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
    if (txt(iv.budget?.verdict)) bPairs.push(['This solution', sentenceCaseAll(txt(iv.budget.verdict))]);
    push(sections, 'budget', [bPairs.length ? { kind: 'kv', pairs: bPairs } : null]);

    /* Both halves sentence-cased. The phrase is quoted from the statement, so it
     * arrives however the statement wrote it — mid-sentence, lowercase ("unique
     * integers") — and its reading is a sentence of its own. Rendered as a
     * row's key and value they are the card's two columns of prose, and house
     * style is a capital at the start of each. */
    const sigs: [string, string][] = Array.isArray(iv.signals)
      ? iv.signals
          .map((g: any) => [sentenceCaseAll(txt(g?.phrase)), sentenceCaseAll(txt(g?.implies))] as [string, string])
          .filter(([a, b]: [string, string]) => Boolean(a && b))
      : [];
    push(sections, 'signals', [sigs.length ? { kind: 'kv', pairs: sigs, layout: 'rows' } : null]);

    /* What the statement DEMANDS, as opposed to what it merely allows.
     *
     * The constraint budget reads the numbers — n <= 1e5, therefore O(n log n)
     * or better. It never read the prose, and the prose is where the hard
     * requirements live: "must run in O(n) time", "without using the division
     * operation", "in place", and the bound named in a Follow-up line. Those
     * rule out approaches outright, which is a different thing from being slow,
     * and nothing on screen used to say so — the answer would offer prefix and
     * suffix arrays for a problem whose follow-up asks for O(1) extra space and
     * never mention the mismatch.
     *
     * The per-solution half of this is the Approach comparison's Requirements
     * column; this card is the list being checked against.
     */
    push(sections, 'mandates', [
      strList(iv.requirements).length ? { kind: 'list', items: strList(iv.requirements) } : null,
    ]);

    /* No "Topic & review" card.
     *
     * It was the one card in the book that was not for the live 45 minutes: a
     * curriculum section name and up to five lesson titles to read AFTERWARDS.
     * Its Pattern line already appeared twice on screen — as Technique on "How
     * to spot it" and as the tag in the approach-comparison matrix — and the
     * lesson list is a study plan, which is not what someone with an
     * interviewer watching is scrolling for.
     *
     * The backend still emits interview.topic (section + concepts, matched to
     * real lessons by matchLessons); nothing renders it. Left in place rather
     * than ripped out of the schema, so the study-plan links can be picked up
     * elsewhere without regenerating anything.
     */

    probes.push(...(Array.isArray(iv.probes)
      ? iv.probes
          .map((q: any) => [txt(q?.q), txt(q?.a)] as [string, string])
          .filter(([a, b]: [string, string]) => Boolean(a && b))
      : []));
    pitfalls.push(...strList(iv.pitfalls));
  }

  /* The probes card is pushed out here, not inside the `interview` block, so
   * the Deep Dive and Issues chips can fill it on an answer that has no
   * interview object at all — every answer cached before those cards existed. */
  {
    /* One card, not two. "Interviewer will ask" and "Follow-up Q&A" were the
     * same thing under different names — questions this interviewer asks about
     * this solution — split only by which field of the answer they arrived in.
     * Reading them meant checking two places and noticing neither was complete.
     * Everything is appended in the order it becomes relevant (during the
     * solution, then after it), deduped on the question. */
    const followups: [string, string][] = Array.isArray(sd.followups)
      ? sd.followups
          .map((f: any) => [txt(f?.q), txt(f?.a)] as [string, string])
          .filter(([q, a]: [string, string]) => Boolean(q && a))
      : [];
    const allProbes: [string, string][] = [];
    const seenQ = new Set<string>();
    for (const [q, a] of [...probes, ...(extras?.probes || []), ...followups]) {
      const k = q.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!k || seenQ.has(k)) continue;
      if (ASKS_FOR_COMPLEXITY.test(q)) continue;
      seenQ.add(k);
      allProbes.push([sentenceCaseAll(q), sentenceCaseAll(a)]);
    }
    const dedupePitfalls = notAlreadyIn(pitfalls);
    const allPitfalls = dedupeStrings([
      ...pitfalls,
      ...(extras?.pitfalls || []).map(sentenceCase).filter(dedupePitfalls),
    ]);
    push(sections, 'probes', [
      allProbes.length ? { kind: 'kv', pairs: allProbes, layout: 'rows' } : null,
      allPitfalls.length
        ? { kind: 'callout', label: 'Common mistakes', items: allPitfalls }
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
  //
  // The two pitch fields describe the SET of approaches, not the one on screen —
  // `pitch` is top-level, so the same "start with the brute force, then the hash
  // map" paragraph was appended to every solution's card, twice over once its
  // opener restated it. Where there are alternatives, that comparison is the
  // Approach comparison card's job and it is dropped here; on a single-solution
  // answer the pitch IS about this solution, so it stays.
  const multi = Array.isArray(sd.solutions) && sd.solutions.length > 1;
  const [spokenSentences, ...writtenGroups] = condensePoints([
    narration,
    solApproach,
    ...(multi ? [] : [pitchStr || txt(pitchObj?.opener), txt(pitchObj?.approach)]),
  ]);
  // Book format: the paragraph you SAY, then the bullets you scan.
  //
  // The narration is continuous speech — it is meant to be read aloud in one
  // breath — and chopping it into bullets made the card look like a checklist
  // of four unrelated facts. It is a paragraph. Everything after it is terse
  // written material (the one-line approach, and on a single-solution answer
  // the pitch), which is what bullets are for.
  const spoken = spokenSentences?.join(' ') ?? '';
  const points = (writtenGroups ?? []).flat();
  push(sections, 'approach', [
    spoken ? { kind: 'prose', text: spoken } : null,
    points.length ? { kind: 'list', items: points } : null,
    keyPoints.length ? { kind: 'callout', label: 'Key points', items: keyPoints } : null,
  ]);

  /* No Complexity card.
   *
   * The bounds were on screen twice: a kv strip with a "Why these bounds" aside
   * here, and a COMPLEXITY beat in the comment header above the code. Two copies
   * of one fact, a pane apart, and the copy in the book was the one you could not
   * read beside the loops it was counting.
   *
   * The card is the copy that goes. complexityBeat() below carries the same
   * fields — and considerably more of them — into the code header, where the
   * derivation sits next to the lines it derives from and travels with the
   * solution when the candidate copies it out. The approach-comparison matrix
   * keeps its Time/Space columns: that table exists to compare the alternatives,
   * which is a different question from what THIS solution costs.
   */

  /* The line-by-line, but ONLY for a diagnose answer.
   *
   * On a normal solve `explanations` is one entry per meaningful line, and as a
   * card it was a second copy of the program: every row restated the line's
   * source text so you could find it again in the editor beside it. Those words
   * now ride on the line itself (annotateSolutionCode), so the card would be a
   * third copy.
   *
   * Diagnose is a different array with the same name — one entry per DEFECT,
   * keyed to lines of the code the candidate wrote, most of which are correct
   * and get no entry. There is nowhere else for that list to go, so it keeps
   * its card. */
  if (sd.type === 'diagnose') {
    const walk = Array.isArray(sol?.explanations)
      ? sol.explanations
          .map((e: any) => ({ line: e.line, code: e.code, explanation: sentenceCaseAll(txt(e.explanation)) }))
          .filter((r: any) => r.explanation || r.code)
      : [];
    push(sections, 'walkthrough', [walk.length ? { kind: 'walk', rows: walk } : null]);
  }

  /* The spoken walk-through, in the reader's hands rather than behind a chip.
   * It is the answer to "walk me through your solution" — the thing said out
   * loud straight after naming the approach, which is where it now sits. */
  /* No 'explain' card. The spoken walk-through is written above the code as a
   * comment header instead (prependWalkthrough) — read beside the lines it
   * describes rather than in a pane next to them, and it travels with the code
   * when the candidate copies it out. */

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

  // No 'followup' section: sd.followups is merged into the single interview-questions
  // card above, where the reader looks for any question an interviewer might ask.

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
        explanation: sentenceCaseAll([txt(w.context) && `(${txt(w.context)})`, txt(w.text)].filter(Boolean).join(' ')),
        code: typeof w.lines === 'string' ? `L${w.lines}` : undefined,
      }))
      .filter((r: any) => r.explanation);
    push(sections, 'walkthrough', [walk.length ? { kind: 'walk', rows: walk } : null]);

    const changes = (answer.changes || [])
      .map((c: any) => sentenceCaseAll([txt(c.label), txt(c.note)].filter(Boolean).join(' — ')))
      .filter(Boolean);
    push(sections, 'changes', [changes.length ? { kind: 'list', items: changes } : null]);
  }

  return { title: txt(analysis?.title) || undefined, sections };
}

/**
 * The order a candidate needs these in during an interview.
 *
 * Chronological, in the sense that matters here: the order the WORK happens in,
 * from reading the statement to the questions that come after the code runs. A
 * reader who starts at the top and keeps going is walking their own solve, so
 * nothing they have not needed yet appears above something they have.
 *
 *   read it        problem → signals → identification
 *   decide         approach → comparison (what you weighed, and its cost)
 *   write it       code → walkthrough → trace
 *   prove it       testcases → edgecases
 *   defend it      tradeoffs + budget → probes → followup
 *
 * There is no 'complexity' entry any more: that card is gone, and its content
 * lives in the code header instead (see complexityBeat).
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
  'mandates',         // what the statement demands — the bar every approach below is held to
  'ruledout',         // what you considered and dropped — asked about the moment the approach is on screen
  // The answer itself, straight after how you found it, with the alternatives
  // you weighed against it directly underneath.
  'approach',         // Solution
  'comparison',       // approach comparison — the only table of bounds left in the book
  'code',
  'walkthrough',
  'trace',            // the dry run: the code, executed by hand
  // Proof, then defence. Test cases and edge cases are what you run; the rest
  // is what you say when the interviewer starts pushing.
  'testcases',
  'edgecases',
  // Tradeoffs and the constraint budget are one thought — what you gave up, and
  // the ceiling that made you give it up — so they are stacked into a single
  // cell (STACKED_SECTION_IDS in AnswerBook) and read as two rows of one column.
  // That pairing is why budget sits here rather than up with identification,
  // where the order of the WORK would otherwise put it.
  'tradeoffs',
  'budget',           // constraint budget — the ceiling the tradeoff was made against
  'probes',           // interviewer will ask
  'followup',
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
