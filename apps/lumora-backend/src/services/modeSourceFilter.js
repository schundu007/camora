/**
 * Mode → KB-source filter map.
 *
 * When the frontend tells inference what kind of question this is
 * (set by which page is asking — coding playground, design page, SQL
 * playground, behavioral track), we bias retrieval toward sources that
 * are known to be relevant.
 *
 * 'general' or any unknown mode → null → no filter, full hybrid search
 * over the whole KB. Fail-open: a typo in the frontend never starves
 * retrieval, it just falls back to the broader (but still useful)
 * default.
 *
 * Sources are the same slugs that appear in lumora_kb_chunks.source —
 * see scripts/topic-manifest.js for the canonical list.
 */

const MODE_SOURCES = Object.freeze({
  coding: [
    'capra-coding',           // algorithm + DS topic concepts
    'capra-coding-problems',  // LeetCode-style problem statements + reference solutions
    'capra-lld',              // low-level design topics
    'capra-lld-problems',     // LLD problems w/ keyQuestions
    'capra-concurrency',      // concurrency / threading topics
  ],
  design: [
    'capra-system-design',    // SD topics + patterns + tradeoffs
    'capra-sd-problems',      // SD problem statements
    'capra-microservices',    // microservices patterns
    'capra-scalable',         // scalable systems topics
    'capra-eng-blogs',        // real-world architecture posts
    'capra-database',         // SD-adjacent storage choices
  ],
  sql: [
    'capra-sql',              // SQL topics
    'capra-sql-problems',     // SQL problem statements + solutions
    'capra-database',         // db design context
  ],
  behavioral: [
    // Behavioral answers ground ONLY on the candidate's own resume / JD /
    // cover letter (user-tier docs) + their saved STAR stories (injected
    // separately by storyAnchor). No generic Capra KB: the tip-sheet topic
    // "Failures & Mistakes" (capra-behavioral) and project write-ups like
    // "ChatGPT Clone" (capra-projects) polluted personalized answers and the
    // Sources panel. Empty list → `WHERE source = ANY('{}')` returns zero KB
    // rows, and warm-kit gating keeps only tier==='user' chunks.
  ],
  sre: [
    'capra-sre',              // SLI/SLO/SLA, incident, on-call
    'capra-devops',           // CI/CD, observability, IaC
  ],
  // Company/role-specific study material. Grounded in public repos only —
  // see apps/camora/src/data/capra/topics/amdCiTopics.js for provenance
  // rules (every claim traceable; unverified things stay framed as
  // questions to ask). Reachable ONLY through this explicit mode; see
  // STUDY_ONLY_SOURCES for why it must never surface in an unfiltered search.
  'amd-ci': [
    'capra-amd-ci',           // TheRock/ROCm CI, GPU fleet ops, OSDU multi-cloud
    'capra-devops',           // shared CI/CD + IaC grounding
    'capra-sre',              // fleet health, incident framing
  ],
});

/**
 * Sources that must NEVER be reachable from an unfiltered search.
 *
 * These are company/role-specific study decks written for ONE interview. They
 * describe a company's systems in the first person-adjacent voice of study
 * notes, so when they leak into a personal answer the model reports them as the
 * candidate's own job: grounding a behavioral answer on the AMD ROCm/CI deck
 * produced "I work at AMD" for a candidate who had only interviewed there, and
 * pulled every unrelated question toward CI/CD.
 *
 * A comment used to assert this exclusion existed. It did not — 'general'
 * returned null, meaning no filter, meaning the whole KB. Now it is enforced.
 */
export const STUDY_ONLY_SOURCES = Object.freeze(['capra-amd-ci']);

export const KNOWN_MODES = Object.freeze(Object.keys(MODE_SOURCES));

/**
 * @returns {string[]|null} allow-list of sources, or null for "no allow-list".
 *   An EMPTY array is meaningful and distinct from null: it means ground on no
 *   generic KB at all (behavioral). Callers must not collapse [] to null.
 */
export function sourcesForMode(mode) {
  if (!mode || mode === 'general') return null;
  const arr = MODE_SOURCES[mode];
  return arr ? [...arr] : null;
}

/**
 * Sources to subtract from a search. Only meaningful when there is no explicit
 * allow-list — an allow-list already can't reach anything it doesn't name.
 */
export function excludedSourcesForMode(mode) {
  return sourcesForMode(mode) === null ? [...STUDY_ONLY_SOURCES] : [];
}
