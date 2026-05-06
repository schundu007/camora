/**
 * Capra topic + problem ingest manifest.
 *
 * Each entry: {
 *   file:    path relative to apps/camora/src/data/capra/topics/ (default)
 *            or apps/camora/src/data/capra/ when dir: 'data'.
 *   export:  named export holding the data
 *   source:  short slug stamped onto every chunk's `source` column,
 *            used in citations: "Sona referenced: capra-sre/sli-slo-sla"
 *   kind:    'topic' (default) — uses chunker.js shape {introduction,
 *            keyConcepts, questions, ...}
 *            'problem-leetcode' | 'problem-lld' | 'problem-sd' — uses
 *            problemChunker.js with the matching shape
 *   shape:   'array' (default) | 'object' — if 'object', export is
 *            converted via Object.entries -> [{...val, slug: key}]
 *   dir:     'topics' (default) | 'data' — base subdir under
 *            apps/camora/src/data/capra/
 * }
 *
 * Adding a new file = one line here. The indexing script walks this
 * manifest and dispatches to the right chunker based on kind.
 */
export const TOPIC_MANIFEST = [
  { file: 'sreTopics.js',             export: 'sreTopics',             source: 'capra-sre' },
  { file: 'devopsTopics.js',          export: 'devopsTopics',          source: 'capra-devops' },
  { file: 'systemDesignTopics.js',    export: 'systemDesignTopics',    source: 'capra-system-design' },
  { file: 'scalableSystemsTopics.js', export: 'scalableSystemsTopics', source: 'capra-scalable' },
  { file: 'codingTopics.js',          export: 'codingTopics',          source: 'capra-coding' },
  { file: 'codingTopicsExtra.js',     export: 'extraCodingTopics',     source: 'capra-coding' },
  { file: 'lldTopics.js',             export: 'lldTopics',             source: 'capra-lld' },
  { file: 'behavioralTopics.js',      export: 'behavioralTopics',      source: 'capra-behavioral' },
  { file: 'projectTopics.js',         export: 'projectTopics',         source: 'capra-projects' },
  { file: 'databaseTopics.js',        export: 'databaseTopics',        source: 'capra-database' },
  { file: 'sqlTopics.js',             export: 'sqlTopics',             source: 'capra-sql' },
  { file: 'concurrencyTopics.js',     export: 'concurrencyTopics',     source: 'capra-concurrency' },
  { file: 'microservicesPatterns.js', export: 'microservicesPatterns', source: 'capra-microservices' },
  { file: 'engBlogsTopics.js',        export: 'engBlogTopics',         source: 'capra-eng-blogs' },
  { file: 'systemDesignPatterns.js',  export: 'systemDesignPatterns',  source: 'capra-system-design' },
  { file: 'systemDesignTradeoffs.js', export: 'systemDesignTradeoffs', source: 'capra-system-design' },

  // ── Coding-RAG: problem corpora ───────────────────────────────────
  // LeetCode-style problems (PROBLEMS is an object keyed by slug).
  { file: 'problems.js',              export: 'PROBLEMS',              source: 'capra-coding-problems',
    kind: 'problem-leetcode', shape: 'object', dir: 'data' },
  // LLD problems (array).
  { file: 'lldProblems.js',           export: 'lldProblems',           source: 'capra-lld-problems',
    kind: 'problem-lld' },
  // System Design problems (array exported as `systemDesigns`).
  { file: 'systemDesignProblems.js',  export: 'systemDesigns',         source: 'capra-sd-problems',
    kind: 'problem-sd' },
  // SQL problems (.ts file with merged Top50 catalog). Loader uses
  // tsx for TypeScript; run the indexer with: npx tsx scripts/index-capra-kb.js
  { file: 'sqlProblems.ts',           export: 'SQL_PROBLEMS',          source: 'capra-sql-problems',
    kind: 'problem-sql', dir: 'data' },
];
