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
    'capra-behavioral',       // STAR / archetype prompts
    'capra-projects',         // project narratives + framing
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
