/**
 * Interview situations — the single source of truth for "what is the candidate
 * actually being asked to do?".
 *
 * Before this module the situation was inferred in five different places that
 * did not agree (detectPlatformTemplate in cofix, singleSolution/ioUnknown in
 * solve, `task` in the extractor, `mode` on the stream, reviewRequest in the
 * client), and each case was bolted onto one monolithic prompt as an override
 * block shouting "HIGHEST PRIORITY — OVERRIDES EVERY RULE BELOW". Stacked
 * overrides are why an explicit "do not add any new lines" lost to the
 * EXECUTION CONTRACT sitting further down the same prompt.
 *
 * Here a situation is SELECTED, never layered: the prompt is a shared core plus
 * EXACTLY ONE situation block. Two situations can no longer contradict each
 * other, because two situations can no longer both be present.
 */

/**
 * Canonical situations.
 *
 * The first five are SCREEN situations: they answer "what is on the candidate's
 * editor right now?" and are classified from a screenshot. The rest are
 * UTTERANCE situations: the code is already on screen and settled, and the
 * INTERVIEWER has just asked something about it. A screenshot cannot tell you
 * the difference between "why a hash map and not a tree?" and "can we do
 * better?" — only the question can — so the two are classified separately and
 * resolved into this one registry.
 */
export const TASK_IDS = [
  // Screen situations — what the editor holds.
  'diagnose', 'fill', 'explore', 'explain', 'template',
  // Utterance situations — what the interviewer just asked.
  'clarify', 'optimize', 'justify', 'hint', 'refactor', 'trace', 'edge', 'extend',
];

/** Situations a SCREENSHOT can establish. */
export const SCREEN_TASKS = Object.freeze(['diagnose', 'fill', 'explore', 'explain', 'template']);

/** Situations only the INTERVIEWER'S QUESTION can establish. */
export const UTTERANCE_TASKS = Object.freeze(
  TASK_IDS.filter(t => !['diagnose', 'fill', 'explore', 'explain', 'template'].includes(t)),
);

/**
 * Situations whose deliverable is an ANSWER, not an edit. They reproduce the
 * input code byte-for-byte, return no changes[], and put everything in the
 * walkthrough — the contract EXPLAIN already established. Keeping them on that
 * shape means the CoFix response schema needs no new fields: a situation that
 * answers a question simply declines to touch the code.
 */
export const ANSWER_ONLY_TASKS = Object.freeze([
  'explain', 'clarify', 'justify', 'hint', 'trace', 'edge',
]);

/** True when this situation must return the input code unchanged. */
export const isAnswerOnly = (task) => ANSWER_ONLY_TASKS.includes(task);

/**
 * Wire-compatible aliases. The client and the server deploy independently, so a
 * browser still running yesterday's bundle keeps sending the old names.
 */
const TASK_ALIASES = {
  review: 'diagnose',
  fix: 'diagnose',
  complete: 'fill',
  solve: 'explore',
  // Utterance aliases — the words that actually come out of an interviewer's
  // mouth, mapped to the situation that answers them.
  clarifying: 'clarify',
  questions: 'clarify',
  bottleneck: 'optimize',
  faster: 'optimize',
  better: 'optimize',
  why: 'justify',
  compare: 'justify',
  tradeoff: 'justify',
  nudge: 'hint',
  stuck: 'hint',
  clean: 'refactor',
  dry: 'refactor',
  modular: 'refactor',
  dryrun: 'trace',
  walkthrough: 'trace',
  edgecases: 'edge',
  worstcase: 'edge',
  followup: 'extend',
  scale: 'extend',
  concurrency: 'extend',
};

/** → canonical id, or null when the value is not a situation we know. */
export function normalizeTask(value) {
  if (typeof value !== 'string') return null;
  const v = value.toLowerCase().trim();
  if (TASK_IDS.includes(v)) return v;
  return TASK_ALIASES[v] || null;
}

/**
 * How many walkthrough steps each situation gets. Explaining code IS the
 * deliverable, so it earns more room; everywhere else the candidate is reading
 * this aloud mid-interview and fewer, sharper points win.
 */
export const WALKTHROUGH_BUDGET = {
  diagnose: { min: 3, max: 5 },
  fill: { min: 3, max: 5 },
  explore: { min: 3, max: 5 },
  template: { min: 3, max: 5 },
  explain: { min: 5, max: 8 },
  // Utterance situations: the walkthrough IS the answer the candidate speaks,
  // so they get explain-sized room. `trace` is the exception in the other
  // direction — a dry-run is one row per step and the step count is set by the
  // input, not by us.
  clarify: { min: 4, max: 7 },
  optimize: { min: 4, max: 7 },
  justify: { min: 4, max: 6 },
  hint: { min: 3, max: 5 },
  refactor: { min: 3, max: 6 },
  trace: { min: 4, max: 10 },
  edge: { min: 4, max: 7 },
  extend: { min: 4, max: 7 },
};

/**
 * The situation menu handed to the vision model when it reads a screenshot, so
 * the classifier and the prompts can never drift apart. Emitted with the legacy
 * wire names, which normalizeTask() maps back.
 */
export const CLASSIFIER_SPEC = `    'review'   → the editor holds FULLY-WRITTEN code that looks WRONG or the screen is asking the candidate to find faults: a visible error/traceback/failing-test panel, red squiggles or error gutter marks, an instruction like "find the bug" / "what is wrong" / "debug", or code you can see contains mistakes (wrong operator such as = for ==, stray or unbalanced characters, broken indentation, a call to a function/method/import that is not defined anywhere on screen).
    'complete' → the editor holds a TEMPLATE or PARTIAL solution to be filled in: an empty or pass/return-only body, a TODO / "your code here" / "implement this" marker, or a signature with no body.
    'explain'  → code is present, has no visible faults, and no problem statement is asking for new work; the candidate wants to understand it.
    'solve'    → a problem statement is present and there is no meaningful code in the editor yet.
  If genuinely torn between 'review' and 'complete', choose 'complete' when any body is empty/stubbed, otherwise 'review'.`;

/**
 * The menu handed to the classifier that reads the INTERVIEWER'S QUESTION.
 *
 * This is deliberately separate from CLASSIFIER_SPEC above. That one reads a
 * screenshot and can only report what the editor holds; this one reads what was
 * said. The same screen — a finished, correct solution — is the setting for
 * "can we do better?", "why a hash map?", "trace it for me", and "what if it
 * doesn't fit in memory?", and those want four different answers.
 *
 * Order matters: the first match wins, so the narrow intents are listed before
 * the broad ones.
 */
export const UTTERANCE_SPEC = `    'clarify'  → the problem statement is deliberately thin and the candidate is expected to ASK BACK before coding: no input size, no type, no empty/duplicate behaviour, no stated output format. Also any explicit "what questions do you have?" / "anything you want to know before you start?".
    'optimize' → asks for a BETTER version of an approach that already works: "can we do better?", "what's the bottleneck?", "can you get this under O(n log n)?", "that's O(n squared) — improve it".
    'justify'  → asks the candidate to DEFEND a choice against a named alternative: "why a hash map and not a balanced tree?", "why recursion here?", "why did you sort first?".
    'extend'   → changes the CONDITIONS the solution runs under and asks it to survive: input no longer fits in memory, 1000x the data, duplicates now allowed, input is now a stream, N threads call it at once, it is now an API used by 50 teams, unlimited memory but make it faster.
    'trace'    → asks the candidate to DRY-RUN the code on a specific input, step by step, or to prove the loop terminates.
    'edge'     → asks what INPUTS BREAK it: "what's the worst case?", "what if the array is empty / has one element / is all duplicates / is already sorted?".
    'refactor' → the code WORKS and the ask is about its shape, not its correctness: "make this cleaner", "that logic is repeated — pull it out", "why concatenate instead of a string builder?", "how would you make this more modular?".
    'hint'     → the interviewer is NUDGING rather than asking: a Socratic pointer ("what property of a sorted array are we not using?"), a counter-example aimed at a flaw ("what happens with duplicates?"), or a redirection ("let's go back to your first assumption").
  'refactor' vs 'diagnose': if anything is genuinely WRONG it is 'diagnose'. 'refactor' is only for code that already produces correct output.
  'hint' vs 'optimize': a QUESTION pointing at an unused property is 'hint'; a direct instruction to improve complexity is 'optimize'.`;

// ── Rules that belong to ONE situation ────────────────────────────────────
// Moved verbatim out of the old monolith's RULES list, so behaviour that was
// already tuned is preserved — what changed is that they are now selected
// rather than all present at once.

const HARNESS_READONLY = `- The \`if __name__ == '__main__':\` block is READ-ONLY platform boilerplate (HackerRank/CoderPad/etc). NEVER modify anything inside it — not os.environ[...] refs, not file handles, not input() calls. Copy it character-for-character into fixed_code.
- NEVER replace os.environ[...] with a hardcoded string. Environment variables are correct by design on the platform.`;

const MINIMAL_WHEN_WRITING = `- MINIMAL LINES + MINIMAL IMPORTS: write the SHORTEST correct, idiomatic solution the candidate could hand-type in an interview. Favour comprehensions, unpacking, built-ins, and collections/itertools over boilerplate; do NOT add dataclasses, wrapper classes, extra helpers, or verbose try/except the problem doesn't require — a clean 5-15 line solution beats a 40-line one. Import ONLY modules the code actually uses.`;

const DIAGNOSE_BLOCK = `══════════════════════════════════════════════════════════════════════════
SITUATION: DIAGNOSE — this code is believed to CONTAIN FAULTS. Find them all.
══════════════════════════════════════════════════════════════════════════
The interviewer handed the candidate existing code and asked what is wrong with
it. The deliverable is the LIST OF DEFECTS plus the same program with each one
corrected in place. It is NOT a better program.

Audit every line before answering and correct each defect you find, including:
  • wrong operators — = for ==, / for //, < for <=, and/or mixed up, += for =;
  • stray or extra characters — unbalanced brackets/quotes, a duplicated token, a
    semicolon or comma that should not be there, a smart quote pasted from a PDF;
  • indentation faults — a line inside the wrong block, tabs mixed with spaces,
    a body that is not indented under its def/if/for;
  • calls to things that DO NOT EXIST — a function, method, attribute, module or
    variable that is never defined or imported anywhere in this file. Either
    define it or replace the call with the real one.
  • off-by-one bounds, missing return, shadowed names, unreachable code.

YOU ARE FORBIDDEN TO REWRITE. There is no execution contract here and no harness
to satisfy — the code runs exactly as the candidate showed it. Specifically you
may NOT:
  • wrap loose top-level statements in a function, or add/rename parameters;
  • convert print() output into a return value, or a return into a print;
  • introduce ANY new variable, list, accumulator, helper, guard condition or
    early exit that was not already there — no output=[], no "!= sentinel";
  • reorder, merge or split statements, or swap the algorithm, built-in or idiom
    for one you prefer. all() stays all(), any() stays any(), a loop stays a loop;
  • restyle anything: variable names, indentation style, string quotes and
    f-string prefixes are preserved exactly as written.

fixed_code is the SAME PROGRAM with each defect corrected IN PLACE: same
statements, same order, same names, same I/O style, and the SAME NUMBER OF LINES
as the input — unless the defect itself is a missing or a duplicated line.
Correcting \`<=\` to \`<\` or re-indenting a line is a fix; rewriting the program
is not. Edit the minimum number of characters needed.

Emit ONE changes[] entry per distinct defect, each naming the defect in its label
(e.g. "wrong operator", "stray bracket", "undefined helper"). If after a careful
audit the code is genuinely correct, return changes: [] and fixed_code identical
to the input — do not invent faults.

TAG EACH DEFECT with the category it belongs to, as the first word of its label,
from exactly this list:
  boundary       off-by-one, slice end, first/last element, empty collection
  null_type      None/null handling, int vs float division, silent coercion
  state          mutation while iterating, mutable default arg, stale cache
  error_handling swallowed exception, bare except, error path returning success
  concurrency    check-then-act race, unsynchronised shared counter, shared client
  resource       unclosed file/connection, missing timeout, unbounded retry/growth
  security       input into a query or shell, hardcoded secret, unvalidated input,
                 over-broad permission
  performance    linear lookup inside a loop, repeated sort, accidental quadratic

ORDER THE DEFECTS BY SEVERITY, worst first: wrong answers and crashes, then
security, then resource leaks, then performance, then everything else. The
candidate is speaking under time pressure and gets through the first two — those
must be the ones that matter. A nitpick listed above a wrong result is a worse
answer even when both are correct findings.

EVERY defect needs three things, and is incomplete without all three:
  1. WHERE — the line, and the identifier on it.
  2. WHY IT IS WRONG — the rule being broken, not a restatement of the code.
  3. WHAT BREAKS AT RUNTIME — the observable failure. "IndexError on the last
     iteration when len(items) is even", not "this could cause problems". If you
     cannot say what an input does to it, you have not found a defect yet.

FIX THE CAUSE, NEVER THE SYMPTOM. Wrapping a failing block in try/except,
catching the exception a bug raises, clamping an index that should never have
been out of range, or defaulting away a None that should never have been None
are all SUPPRESSION — they hide the defect while leaving it in place. If a fix
looks like one of those, say so explicitly in the walkthrough and fix the actual
cause instead. This is the distinction the round is testing: the interviewer
already knows where the bug is and is watching HOW you find it.
${HARNESS_READONLY}`;

const FILL_BLOCK = `══════════════════════════════════════════════════════════════════════════
SITUATION: FILL — the code below is UNFINISHED. Write only the missing part.
══════════════════════════════════════════════════════════════════════════
The interviewer handed the candidate a working file with a hole in it and asked
them to fill it. Everything already present is THEIRS and is correct.

FIND THE GAP FIRST. It is the empty / \`pass\` / \`return\`-only body, the
"TODO" / "your code here" / "implement this" marker, the declared-but-unwritten
class or function, or the signature with nothing under it. An empty body is NOT
"already correct" — it is precisely the thing you must write.

Then:
- Keep EVERY existing line VERBATIM — imports, class/def signatures, docstrings,
  real comments, and any partial logic already present. Reproduce them character
  for character, in the same order. Do NOT re-express, restyle or "improve" a
  line that is already there, and do NOT touch code outside the gap.
- The PLACEHOLDER ITSELF IS NOT CONTENT TO KEEP. The "TODO" / "your code here"
  marker, the \`pass\`, the \`...\`, the \`raise NotImplementedError\` — those lines
  ARE the hole. Your implementation REPLACES them; they must not appear anywhere
  in fixed_code.
- ADD ONLY the missing implementation, and only where the gap is. Mark every
  line you write type "added".
- Return the COMPLETE file: everything you were given plus what you wrote.
${MINIMAL_WHEN_WRITING}
${HARNESS_READONLY}`;

const EXPLORE_BLOCK = `══════════════════════════════════════════════════════════════════════════
SITUATION: EXPLORE — write the program that solves the PROBLEM STATEMENT above.
══════════════════════════════════════════════════════════════════════════
The CODE block below may be empty, a placeholder comment, or a bare skeleton —
there is nothing there to "preserve". Write the COMPLETE, correct solution to
the problem statement.
${MINIMAL_WHEN_WRITING}
- EXECUTION CONTRACT: this code is run by a test harness that parses each test
  Input into arguments, CALLS the top-level function, and compares its RETURN
  VALUE to the expected output. If the code reads stdin (input()/sys.stdin),
  prints its answer instead of returning it, or returns None, it is NOT
  harness-compatible — in that case you SHOULD restructure it into a clean
  function that takes the parsed inputs as PARAMETERS and RETURNS the answer,
  then set hackerrank_compatible:true.
- Every changes[] entry references a line you wrote (type "added").`;

const EXPLAIN_BLOCK = `══════════════════════════════════════════════════════════════════════════
SITUATION: EXPLAIN — describe this code. Change NOTHING.
══════════════════════════════════════════════════════════════════════════
The candidate wants to UNDERSTAND this code, not change it. You MUST:
  • set "fixed_code" to the input code EXACTLY as given, byte for byte;
  • set "changes" to [] — you are changing nothing;
  • put the whole explanation in "walkthrough": what the code does, the key
    idea, how the main data structure and loop work, what it returns, and the
    complexity.
Still first-person, still ≤ 15 words per step, still real variable names in
backticks. If you notice a genuine bug, say so in a walkthrough step — but do
NOT fix it here.`;

// ── Utterance situations ──────────────────────────────────────────────────
// The code on screen is settled. The interviewer just asked something about it.
// These do not compete with the screen situations above — one is selected per
// request, exactly as before.

/** Shared tail for every situation whose deliverable is an answer, not an edit. */
const ANSWER_ONLY_CONTRACT = `
YOU ARE CHANGING NOTHING. Set "fixed_code" to the input code EXACTLY as given,
byte for byte, and set "changes" to []. The entire deliverable goes in
"walkthrough". If you believe the code should change, SAY SO in a walkthrough
step — do not edit it here.

Every step is FIRST PERSON, ≤ 15 words, and names real identifiers from the code
in backticks. The candidate reads these aloud to the interviewer, so they must
sound like a person talking, not like documentation.`;

const CLARIFY_BLOCK = `══════════════════════════════════════════════════════════════════════════
SITUATION: CLARIFY — the prompt is thin on purpose. Ask before you code.
══════════════════════════════════════════════════════════════════════════
The interviewer gave a deliberately underspecified problem to see whether the
candidate defines it before solving it. Jumping to an algorithm here is the
mistake being tested for.

The deliverable is the QUESTIONS TO ASK BACK, ordered by how much each one would
change the solution. A question whose answer does not change the code is noise —
leave it out. Cover only what is genuinely unspecified, drawing from:
  • size and range — how large is n, how big can a single value get;
  • types — integers or floats, ASCII or Unicode, signed or unsigned;
  • degenerate inputs — empty, one element, all identical, already sorted;
  • duplicates — allowed, and if so does the answer count them separately;
  • ordering — must output be sorted, is input order meaningful, ties broken how;
  • resources — memory ceiling, whether the input fits in RAM, latency budget;
  • output shape — return a value or print, index or the element itself, 0- or 1-based.

For EACH question, state in the same step what you would ASSUME if the
interviewer says "you choose" — a candidate who asks and then stalls scores
worse than one who never asked. End with the single assumption you would state
out loud before writing the first line.${ANSWER_ONLY_CONTRACT}`;

const OPTIMIZE_BLOCK = `══════════════════════════════════════════════════════════════════════════
SITUATION: OPTIMIZE — it works. The interviewer wants it faster or smaller.
══════════════════════════════════════════════════════════════════════════
The code below is CORRECT. The ask is a better one, and the answer is graded on
whether the candidate can NAME THE BOTTLENECK before replacing it.

Lead with the bottleneck: the exact line or nested structure that dominates, and
the operation count it costs. "It's O(n squared)" is not an answer — "the inner
scan on line 4 re-walks the whole list for every element, so n times n" is.

Then give the improvement, and be honest about which of these it is:
  • a genuinely better complexity class (nested scan → hash lookup, linear scan
    of sorted data → binary search, repeated recomputation → memoisation);
  • the same complexity with a smaller constant (fewer passes, cheaper inner op);
  • a space-for-time trade, which you must label as such.
A constant-factor win presented as an asymptotic one is the most common way
candidates lose this question.

State the NEW time and space cost explicitly, and say what you gave up to get
it. If the current solution is already optimal for the stated constraints, say
that plainly and prove it with the lower bound — inventing a fake optimisation
to look responsive is worse than defending correct work.

fixed_code is the IMPROVED implementation. Keep the original's I/O style,
function signature, and naming so the interviewer can diff the two in their head.`;

const JUSTIFY_BLOCK = `══════════════════════════════════════════════════════════════════════════
SITUATION: JUSTIFY — defend this choice against the alternative named.
══════════════════════════════════════════════════════════════════════════
The interviewer named a specific alternative and asked why the candidate did not
use it. A one-directional answer — listing only why the chosen thing is good —
is the failure mode this question exists to expose.

The answer MUST cut both ways:
  • what the CHOSEN option buys, in the terms that matter for THIS problem;
  • what the ALTERNATIVE would buy that the chosen one gives up — state a real
    advantage, not a strawman. If the alternative has none, the interviewer
    picked a bad example and you should say why;
  • the condition that FLIPS the decision: the input size, distribution, ordering
    requirement, memory ceiling, or access pattern under which you would switch.
That flip condition is the whole answer. A candidate who cannot name it is
reciting a table rather than reasoning.

Ground every claim in the actual code: cite the operations THIS solution
performs on the structure, not textbook averages. If the chosen structure's
advantage never materialises here (a hash map's O(1) lookup in code that only
ever iterates), admit it — that is the honest answer and it scores better than a
confident irrelevance.${ANSWER_ONLY_CONTRACT}`;

const HINT_BLOCK = `══════════════════════════════════════════════════════════════════════════
SITUATION: HINT — the interviewer is nudging, not asking. Take the hint.
══════════════════════════════════════════════════════════════════════════
This is not a question to answer literally. It is a Socratic pointer, a
counter-example aimed at a flaw, or a redirection away from a dead end. The
interviewer already knows where this goes and is measuring whether the candidate
is TEACHABLE.

Do three things, in order:
1. NAME WHAT THE HINT IS POINTING AT, explicitly. "You're right — I'm not using
   the fact that the array is sorted." Acknowledging beats pretending you were
   already there; the interviewer watched you not be there.
2. FOLLOW IT to the consequence. If it is a counter-example, run it against the
   current code and say exactly where the code gives the wrong answer. If it is a
   property being pointed at, say what that property unlocks.
3. STATE THE PIVOT — the concrete next move, in one sentence.

NEVER argue with the hint, and never answer the surface words while ignoring the
subtext. If the hint genuinely does not apply, say what you think it points at
and ask one clarifying question rather than dismissing it.${ANSWER_ONLY_CONTRACT}`;

const REFACTOR_BLOCK = `══════════════════════════════════════════════════════════════════════════
SITUATION: REFACTOR — nothing is broken. Improve the SHAPE of this code.
══════════════════════════════════════════════════════════════════════════
This code PRODUCES CORRECT OUTPUT. Do not hunt for defects and do not change
behaviour — the deliverable is the same program, better expressed. If you find a
genuine bug while reading, mention it in a walkthrough step but still keep
fixed_code behaviour-identical.

Work only on what the interviewer actually asks about, from:
  • REPEATED LOGIC — the same lines in two branches or two loops, lifted into one
    named helper. Name it for what it means, not what it does mechanically.
  • DOING TOO MUCH — one function that parses, computes, and formats, split at
    its real seams. Do not split for the sake of a line count.
  • NAMING — identifiers that describe the type (\`arr\`, \`tmp\`, \`data2\`) replaced
    by ones that describe the meaning. This is usually the highest-value change
    and the one candidates skip.
  • NESTING — guard clauses and early returns to flatten an arrow of ifs.
  • THE LANGUAGE'S OWN IDIOM — the construct a fluent reader would expect here:
    accumulating into a builder rather than re-allocating a string in a loop, a
    comprehension over a manual append loop, the standard-library call that
    already does this.

For every change, NAME THE PRINCIPLE in its walkthrough step. "Pulled the
duplicated bounds check into \`in_range\`" is worth more than a diff, because the
interviewer is grading whether the candidate knows WHY, not whether they can
rename things. Never trade real clarity for cleverness: if the shorter form takes
longer to read, it is worse and you should say so.

fixed_code is the refactored program. Same inputs, same outputs, same complexity
unless the interviewer asked for a change.`;

const TRACE_BLOCK = `══════════════════════════════════════════════════════════════════════════
SITUATION: TRACE — dry-run this code by hand, step by step.
══════════════════════════════════════════════════════════════════════════
The interviewer wants to watch the candidate execute their own code without a
debugger. Guessing the output is the failure; showing the state transitions is
the deliverable.

Use the EXACT input the interviewer named. If none was named, use the problem's
first example, and say which you chose in the first step.

Each walkthrough step is ONE meaningful state change — a loop iteration, a
branch taken, a mutation — and reports the variables that ACTUALLY CHANGED, as
\`name=value\`. Do not re-list state that did not move; do not collapse three
iterations into "and so on" unless the pattern is genuinely established, and if
you do, say which iteration you resumed at. End on the returned or printed value
and confirm whether it matches what was expected.

Trace the code AS WRITTEN, not as intended. If the trace diverges from the
expected output, you have found a real bug — report the exact step where they
part company and stop. That divergence is the most valuable thing you can
produce here, and smoothing over it to reach the "right" answer is the one
unforgivable error in this situation.

IF ASKED TO PROVE TERMINATION instead: name the quantity that strictly decreases
on every iteration, its lower bound, and why the loop condition must therefore
fail in finite steps. For recursion, name the measure that shrinks toward the
base case and confirm every path reaches it.${ANSWER_ONLY_CONTRACT}`;

const EDGE_BLOCK = `══════════════════════════════════════════════════════════════════════════
SITUATION: EDGE — what inputs break this code? Be specific and be honest.
══════════════════════════════════════════════════════════════════════════
The interviewer is probing for inputs the candidate did not consider. Reciting a
generic checklist scores nothing — every case must be run against THIS CODE and
reported with its ACTUAL behaviour.

For each case, give the concrete input, then what this code does on it: the
returned value, or the exception and the line that raises it, or "handled
correctly" — and never claim the last one without having traced it.

Draw from the shapes that actually break code:
  • empty, and exactly one element;
  • all elements identical; all elements distinct;
  • already sorted, and sorted in reverse;
  • the target absent entirely, or present at the first and last position;
  • boundaries — zero, negative numbers, the maximum value, integer overflow;
  • types — floats where integers are assumed, unicode where ASCII is, null;
  • the largest input the stated constraints permit, for timeout risk.

Rank by SEVERITY: cases that crash or return silently-wrong answers come before
cases that are merely slow, which come before cases that are already handled.
The candidate has limited time to speak — the first thing out of their mouth
should be the one that fails hardest.

Say plainly which cases this code gets WRONG. A candidate who finds a real hole
in their own solution is demonstrating exactly the skill being measured; one who
declares everything fine is not believed.${ANSWER_ONLY_CONTRACT}`;

const EXTEND_BLOCK = `══════════════════════════════════════════════════════════════════════════
SITUATION: EXTEND — the conditions changed. Make the solution survive them.
══════════════════════════════════════════════════════════════════════════
The interviewer altered the world the code runs in — the data grew, a
requirement moved, the caller became concurrent, or this is production now. The
answer must be derived from THE CODE BELOW, naming its actual structures. A
generic essay about sharding is a non-answer.

Answer in FOUR PARTS, in this order, and do not skip the fourth:
  (a) WHAT STILL HOLDS — the part of the current design that survives unchanged.
      Starting here proves you understood the change's blast radius.
  (b) WHAT BREAKS, AND WHY — the specific line, structure, or assumption that
      fails, and the mechanism of failure. Not "it won't scale" but "the dict
      holds every key in memory, so at 1000x it exceeds RAM and the process is
      killed".
  (c) THE FIX — the concrete change, named at the level of a real technique:
      external merge sort, streaming with bounded state, sharding by key,
      a bounded LRU, per-shard locks, an idempotency key.
  (d) THE NEW COST AND WHAT YOU ACCEPTED FOR IT — the new time and space, plus
      the price: added latency, weaker consistency, more moving parts, higher
      operational burden.

PART (d) IS WHERE THIS ANSWER IS WON OR LOST. Naming only the upside is the
single most common senior-level miss, and an answer without an explicitly
accepted trade-off is incomplete no matter how good parts (a) to (c) are. Every
real fix costs something; if you cannot name the cost, you have not understood
the fix.

Match the technique to the change actually named — do not reach for distributed
systems when the interviewer asked about duplicates, and do not answer with a
one-line tweak when they asked about a thousandfold increase.

fixed_code is the ADAPTED implementation under the new conditions. If the change
is architectural and no single file can express it, keep fixed_code as the
closest honest local version and carry the rest in the walkthrough.`;

/** The platform-stub case: a locked editor template that must be reproduced
 *  byte-for-byte with only the body filled. Text preserved from the tuned
 *  TEMPLATE-SOLVE block it replaces. */
const templateBlock = (templateShape) => `══════════════════════════════════════════════════════════════════════════
SITUATION: PLATFORM TEMPLATE — locked editor skeleton. Fill the body ONLY.
══════════════════════════════════════════════════════════════════════════
The CODE below is a LOCKED editor template from a coding platform (HackerRank /
Codility / CoderPad). EVERYTHING already present is uneditable and MUST be
reproduced BYTE-FOR-BYTE; you only ADD the missing implementation.

${templateShape}

SOLVE, don't just fix: an empty body — or a bare imports-only skeleton — is NOT "already correct" — it is precisely the thing you must complete so the program solves the PROBLEM STATEMENT above (or, if none is given, what the template + harness clearly imply). Produce the value/output the harness (or the problem) expects.

${MINIMAL_WHEN_WRITING}

fixed_code MUST satisfy ALL of these:
1. Reproduce every import / package / using / shebang line, every comment, every class and function SIGNATURE, and the ENTIRE input-output harness (\`if __name__ == '__main__':\`, input()/sys.stdin/print(), Scanner/BufferedReader/System.out, cin/cout/scanf/printf, readline, bufio, bash readarray + wrapper call + exit 0) CHARACTER-FOR-CHARACTER, in the same order, as given.
2. Do NOT rename functions, change parameter lists, reorder lines, restructure into a stdin-reading script, or replace the platform's stdin-reading / printing with your own. The candidate pastes fixed_code straight back into the locked editor and it must run unmodified.
3. Add ONLY the missing implementation, per TEMPLATE SHAPE above: fill the stub body(ies) if the template defines a function (fill EVERY one), or append the inline script under the imports if it defines none. Add nothing else except an import your implementation strictly needs — placed exactly where the template's existing imports are. Never introduce a wrapper function the template does not already declare.
4. Return the COMPLETE file: the untouched template PLUS your added implementation — never a bare function with the harness stripped off.
5. Set "hackerrank_compatible": true — this IS the platform's own template, so it is submission-ready as-is; do NOT tell the candidate to strip I/O.
Every changes[] entry MUST reference a line you ADDED — a filled function body, or an inline line you appended under the imports — never a harness/import/signature line (those are unchanged).
${HARNESS_READONLY}`;

/**
 * Ordered rules for reading an interviewer's question. First match wins, so the
 * narrow intents sit above the broad ones — "unlimited memory, make it faster"
 * is a resource trade (extend), not a plain optimise, and only the earlier rule
 * can catch it.
 *
 * This is deliberately a heuristic and not a model call. It runs while the
 * candidate is live on a call with the interviewer mid-sentence, so a 400 ms
 * round-trip to classify before the real request even starts is latency the
 * product cannot spend. It also makes every routing decision reproducible in a
 * unit test instead of resting on a model's mood — the same reasoning behind
 * detectMcq() and inferIoContract() in the coding route.
 */
const UTTERANCE_RULES = [
  ['clarify', /\b(what|any)\s+(other\s+)?questions?\b|anything (you want|else you'?d like) to know|before you (start|begin|code)|what (would|do) you (want to |need to )?(ask|know)|assumptions? (would|do) you make/i],
  // Nudge lead-ins outrank the topic they are wrapped around. "Have you
  // considered what happens with duplicates?" is worded like an edge-case
  // question, but the interviewer named ONE case and is pointing at a flaw —
  // the answer is to take the hint and run that case, not to enumerate twelve
  // others. The MODE OF ADDRESS decides the answer shape; the topic does not.
  ['hint', /what property|are we not using|aren'?t (we|you) using|have you considered|did you consider|let'?s (go |come )?back to|look again at|is there another way|what about the fact|notice anything|does that always/i],
  ['trace', /\btrace\b|\bdry[- ]run\b|walk me through (the |your )?(code|it|this)|step through|line[- ]by[- ]line|what does (it|this|your code) (print|return|output) (for|with|on)|run (it|this|your code) (with|on)|prove .{0,30}(terminat|halts)|never (loop|run) forever|infinite loop/i],
  ['edge', /\bedge case|\bcorner case|worst[- ]case input|what (happens|does it do).{0,30}\b(if|when|with)\b.{0,45}(empty|null|nil|none|duplicate|negative|zero|single|one element|already sorted)|what (inputs?|test cases?) (would |could )?break|break your (code|solution)|absolute worst/i],
  ['extend', /(doesn'?t|does not|won'?t|can'?t|cannot|couldn'?t) fit (in(to)? )?(memory|ram)|too (large|big) to fit|\b(1000x|100x|10x)\b|\b(a )?(billion|million|trillion)\b|instead of (a )?(batch|hundred)|now (a )?stream|streaming instead|as a stream\b|\bconcurren|\bthreads?\b|thread[- ]safe|\brace condition|simultaneously|\bin production\b|used by \d+ teams|now an api|unlimited memory|if (i|we) gave you (unlimited|infinite)|duplicates? (are |were )?(now )?allowed|case[- ]insensitive|\bshard|distributed/i],
  ['justify', /why (did|do|would) you (use|choose|pick|prefer|go with)|why not (a |an |use )?|why .{0,40}\b(instead of|over|rather than)\b|what made you (choose|pick)|justify your (choice|decision)|why is (a|an) .{0,30} better/i],
  ['refactor', /\bcleaner\b|clean (this|it) up|more readable|\brefactor|\bDRY\b|repeated logic|duplicat(e|ed) (logic|code)|more modular|extract .{0,20}(helper|function|method)|pull (this|that|it) (out|into)|better (name|naming)|string ?builder/i],
  ['optimize', /can (we|you) do better|\bbottleneck\b|make it faster|more efficient|optimi[sz]e|speed (this|it) up|reduce the (time|space|complexity)|get (this|it) (down |under )|improve the (time|space|complexity|performance|runtime)|better than o\(/i],
];

/**
 * Read the interviewer's question and name the situation it creates.
 * Returns null when the text is not a recognisable interview probe, so the
 * caller falls back to whatever the screen says.
 */
export function classifyUtterance(text) {
  if (typeof text !== 'string') return null;
  const t = text.trim();
  // Too short to carry intent; matching on a fragment misroutes more than it
  // helps, and the screen classifier is the safer default.
  if (t.length < 8) return null;
  for (const [task, pattern] of UTTERANCE_RULES) {
    if (pattern.test(t)) return task;
  }
  return null;
}

/**
 * Decide the situation once. `requested` is what the client asked for (already
 * an explicit user choice via the mode chips, or the screenshot classifier's
 * verdict); `isTemplate` is what the code itself proves; `asked` is the
 * interviewer's question, when one came in with the request.
 *
 * Precedence, highest first:
 *   1. The interviewer's QUESTION. If they asked something, answering it is the
 *      situation — what happens to be on screen does not override a direct
 *      question. "Why a hash map?" is `justify` even when the editor holds a
 *      locked template.
 *   2. A locked platform skeleton, which carries rules plain fill/explore lack.
 *   3. Whatever the screen classifier reported.
 *   4. `diagnose` — never a rewrite. Unchanged from the original default.
 */
export function resolveTask({ requested, isTemplate, utterance }) {
  // `utterance` is either an explicit situation id (a mode chip the candidate
  // clicked) or the interviewer's raw question. Try it as an id first so an
  // explicit choice is never second-guessed by the heuristic.
  const spoken = normalizeTask(utterance) || classifyUtterance(utterance);
  if (spoken && !SCREEN_TASKS.includes(spoken)) return spoken;

  const asked = normalizeTask(requested);
  if (spoken && !asked) return spoken;
  // A locked platform skeleton is the more specific situation: writing into one
  // has rules that plain "fill"/"explore" do not carry.
  if (isTemplate && (!asked || asked === 'fill' || asked === 'explore')) return 'template';
  if (asked) return asked;
  return isTemplate ? 'template' : 'diagnose';
}

/** The ONE situation block for this request. Never more than one. */
export function buildSituationBlock({ task, templateShape = '' }) {
  switch (task) {
    case 'template': return templateBlock(templateShape);
    case 'fill': return FILL_BLOCK;
    case 'explore': return EXPLORE_BLOCK;
    case 'explain': return EXPLAIN_BLOCK;
    case 'clarify': return CLARIFY_BLOCK;
    case 'optimize': return OPTIMIZE_BLOCK;
    case 'justify': return JUSTIFY_BLOCK;
    case 'hint': return HINT_BLOCK;
    case 'refactor': return REFACTOR_BLOCK;
    case 'trace': return TRACE_BLOCK;
    case 'edge': return EDGE_BLOCK;
    case 'extend': return EXTEND_BLOCK;
    case 'diagnose':
    default: return DIAGNOSE_BLOCK;
  }
}
