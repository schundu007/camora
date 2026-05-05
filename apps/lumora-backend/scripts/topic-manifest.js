/**
 * Capra topic ingest manifest.
 *
 * Each entry: {
 *   file:    path relative to apps/camora/src/data/capra/topics/
 *   export:  named export holding the topic array
 *   source:  short slug stamped onto every chunk's `source` column,
 *            used in citations: "Sona referenced: capra-sre/sli-slo-sla"
 * }
 *
 * Adding a new topic file = one line here. The indexing script walks
 * this manifest and is otherwise file-agnostic.
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
];
