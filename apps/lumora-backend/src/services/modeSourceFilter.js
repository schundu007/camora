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
});

export const KNOWN_MODES = Object.freeze(Object.keys(MODE_SOURCES));

export function sourcesForMode(mode) {
  if (!mode || mode === 'general') return null;
  const arr = MODE_SOURCES[mode];
  return arr ? [...arr] : null;
}
