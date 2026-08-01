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

/** Canonical situations. */
export const TASK_IDS = ['diagnose', 'fill', 'explore', 'explain', 'template'];

/**
 * Wire-compatible aliases. The client and the server deploy independently, so a
 * browser still running yesterday's bundle keeps sending the old names.
 */
const TASK_ALIASES = {
  review: 'diagnose',
  fix: 'diagnose',
  complete: 'fill',
  solve: 'explore',
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
 * Decide the situation once. `requested` is what the client asked for (already
 * an explicit user choice via the mode chips, or the screenshot classifier's
 * verdict); `isTemplate` is what the code itself proves.
 */
export function resolveTask({ requested, isTemplate }) {
  const asked = normalizeTask(requested);
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
    case 'diagnose':
    default: return DIAGNOSE_BLOCK;
  }
}
