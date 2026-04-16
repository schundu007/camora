/**
 * Job Role → Topic Mapping
 *
 * Maps job role categories to the most relevant topic IDs for each interview round.
 * Used by DocsPage to filter topics when navigating from a job-specific prepare page.
 *
 * Role detection priority: exact title keywords → fallback to 'general'
 */

export type RoleKey =
  | 'devops'
  | 'sre'
  | 'backend'
  | 'frontend'
  | 'fullstack'
  | 'data'
  | 'ml'
  | 'cloud'
  | 'platform'
  | 'mobile'
  | 'security'
  | 'general';

interface RoleTopics {
  label: string;
  coding: string[];
  systemDesign: string[];
  systemDesignProblems: string[];
  behavioral: string[];
  databases: string[];
  sql: string[];
  microservices: string[];
}

/**
 * Detect the role key from a job title string.
 */
export function detectRoleFromTitle(title: string): RoleKey {
  const t = title.toLowerCase();

  if (t.includes('devops') || t.includes('dev ops')) return 'devops';
  if (t.includes('sre') || t.includes('site reliability')) return 'sre';
  if (t.includes('platform engineer')) return 'platform';
  if (t.includes('cloud') && !t.includes('full')) return 'cloud';
  if (t.includes('security') || t.includes('appsec') || t.includes('infosec')) return 'security';
  if (t.includes('machine learning') || t.includes('ml engineer') || t.includes('ai engineer')) return 'ml';
  if (t.includes('data engineer') || t.includes('data scientist') || t.includes('data analyst') || t.includes('analytics')) return 'data';
  if (t.includes('mobile') || t.includes('ios') || t.includes('android') || t.includes('react native') || t.includes('flutter')) return 'mobile';
  if (t.includes('frontend') || t.includes('front end') || t.includes('front-end') || t.includes('ui engineer')) return 'frontend';
  if (t.includes('full stack') || t.includes('fullstack') || t.includes('full-stack')) return 'fullstack';
  if (t.includes('backend') || t.includes('back end') || t.includes('back-end') || t.includes('server') || t.includes('api engineer')) return 'backend';

  return 'general';
}

/**
 * Maps each role to the topic IDs most relevant for that role's interviews.
 * Topics are ordered by priority (most important first).
 */
export const ROLE_TOPIC_MAP: Record<RoleKey, RoleTopics> = {
  devops: {
    label: 'DevOps Engineer',
    coding: [
      'arrays-hashing', 'graphs', 'trees', 'sorting', 'stacks',
      'search-algorithms', 'greedy', 'recursion', 'topological-sort',
      'shortest-path', 'union-find', 'matrix-graphs',
    ],
    systemDesign: [
      'monitoring', 'load-balancing', 'rate-limiting', 'microservices',
      'message-queues', 'security', 'fundamentals', 'caching',
      'redundancy-replication', 'dns-deep-dive', 'cdn-deep-dive',
      'consistent-hashing', 'proxies', 'network-essentials',
      'distributed-messaging', 'heartbeat-mechanism', 'checksum',
    ],
    systemDesignProblems: [
      'metrics-monitoring', 'notification-system', 'rate-limiter',
      'url-shortener', 'key-value-store', 'web-crawler', 'chat-system',
    ],
    behavioral: [
      'star-framework', 'production-outage', 'problem-solving',
      'debugging-distributed', 'data-driven-debugging', 'tight-deadlines',
      'cross-team-collaboration', 'learning-new-tech', 'simplifying-systems',
      'speed-vs-quality', 'bias-for-action', 'tell-me-about-yourself',
    ],
    databases: [
      'database-replication-strategies', 'database-partitioning-sharding',
      'database-recovery', 'database-storage-engines',
    ],
    sql: ['sql-fundamentals', 'sql-joins'],
    microservices: [
      'api-gateway-pattern', 'service-discovery', 'circuit-breaker',
      'sidecar-pattern', 'configuration-externalization', 'event-driven-architecture',
    ],
  },

  sre: {
    label: 'Site Reliability Engineer',
    coding: [
      'arrays-hashing', 'graphs', 'trees', 'sorting', 'stacks',
      'search-algorithms', 'greedy', 'heaps', 'queues',
      'topological-sort', 'shortest-path', 'union-find',
    ],
    systemDesign: [
      'monitoring', 'load-balancing', 'rate-limiting', 'fundamentals',
      'redundancy-replication', 'heartbeat-mechanism', 'checksum',
      'latency-vs-throughput', 'caching', 'proxies', 'security',
      'network-essentials', 'dns-deep-dive', 'leader-follower',
      'quorum', 'strong-vs-eventual-consistency',
    ],
    systemDesignProblems: [
      'metrics-monitoring', 'rate-limiter', 'notification-system',
      'key-value-store', 'url-shortener', 'web-crawler',
    ],
    behavioral: [
      'star-framework', 'production-outage', 'problem-solving',
      'debugging-distributed', 'data-driven-debugging', 'tight-deadlines',
      'speed-vs-quality', 'cross-team-collaboration', 'bias-for-action',
      'optimizing-performance', 'tell-me-about-yourself', 'simplifying-systems',
    ],
    databases: [
      'database-replication-strategies', 'database-partitioning-sharding',
      'database-recovery', 'concurrency-control',
    ],
    sql: ['sql-fundamentals', 'sql-joins'],
    microservices: [
      'circuit-breaker', 'bulkhead-pattern', 'retry-pattern',
      'sidecar-pattern', 'service-discovery', 'api-gateway-pattern',
    ],
  },

  backend: {
    label: 'Backend Engineer',
    coding: [
      'arrays-hashing', 'binary-search', 'two-pointers', 'sliding-window',
      'trees', 'graphs', 'dynamic-programming', 'stacks', 'queues',
      'linked-lists', 'heaps', 'greedy', 'backtracking', 'tries',
      'sorting', 'recursion', 'topological-sort', 'shortest-path',
      'union-find', 'knapsack-dp', 'string-dp',
    ],
    systemDesign: [
      'fundamentals', 'databases', 'caching', 'message-queues',
      'api-design', 'load-balancing', 'rate-limiting', 'microservices',
      'security', 'consistent-hashing', 'data-partitioning',
      'database-indexes', 'rest-vs-rpc', 'synchronous-vs-asynchronous',
      'long-polling-websockets-sse', 'cap-pacelc-deep-dive',
      'strong-vs-eventual-consistency', 'acid-vs-base',
    ],
    systemDesignProblems: [
      'url-shortener', 'twitter', 'uber', 'whatsapp', 'amazon',
      'payment-system', 'notification-system', 'rate-limiter',
      'chat-system', 'key-value-store', 'search-engine',
      'unique-id-generator', 'ecommerce-platform',
    ],
    behavioral: [
      'star-framework', 'tell-me-about-yourself', 'problem-solving',
      'production-outage', 'cross-team-collaboration', 'leadership',
      'conflict-resolution', 'tight-deadlines', 'speed-vs-quality',
      'explaining-technical', 'achievements', 'proud-project',
      'optimizing-performance', 'debugging-distributed',
    ],
    databases: [
      'database-storage-engines', 'database-indexing-deep-dive',
      'transaction-management', 'concurrency-control', 'sql-isolation-levels',
      'database-partitioning-sharding', 'database-replication-strategies',
      'nosql-internals',
    ],
    sql: [
      'sql-fundamentals', 'sql-joins', 'sql-subqueries',
      'sql-window-functions', 'sql-interview-easy', 'sql-interview-hard',
    ],
    microservices: [
      'api-gateway-pattern', 'service-discovery', 'circuit-breaker',
      'saga-pattern', 'event-driven-architecture', 'cqrs',
      'bff-pattern', 'retry-pattern',
    ],
  },

  frontend: {
    label: 'Frontend Engineer',
    coding: [
      'arrays-hashing', 'trees', 'stacks', 'recursion', 'sorting',
      'binary-search', 'two-pointers', 'sliding-window', 'dynamic-programming',
      'linked-lists', 'graphs', 'greedy', 'matrix',
      'tree-traversal', 'bst',
    ],
    systemDesign: [
      'fundamentals', 'caching', 'cdn-deep-dive', 'api-design',
      'load-balancing', 'rest-vs-rpc', 'long-polling-websockets-sse',
      'dns-deep-dive', 'network-essentials', 'proxies',
      'latency-vs-throughput', 'security',
    ],
    systemDesignProblems: [
      'twitter', 'instagram', 'facebook-newsfeed', 'google-docs',
      'autocomplete-system', 'typeahead', 'news-aggregator',
      'spotify', 'youtube',
    ],
    behavioral: [
      'star-framework', 'tell-me-about-yourself', 'problem-solving',
      'cross-team-collaboration', 'explaining-technical', 'achievements',
      'proud-project', 'learning-new-tech', 'receiving-feedback',
      'tight-deadlines', 'conflict-resolution', 'speed-vs-quality',
    ],
    databases: [],
    sql: [],
    microservices: ['bff-pattern', 'api-gateway-pattern'],
  },

  fullstack: {
    label: 'Full Stack Engineer',
    coding: [
      'arrays-hashing', 'binary-search', 'two-pointers', 'sliding-window',
      'trees', 'graphs', 'dynamic-programming', 'stacks', 'queues',
      'linked-lists', 'heaps', 'greedy', 'backtracking', 'sorting',
      'recursion', 'tries', 'matrix', 'intervals',
    ],
    systemDesign: [
      'fundamentals', 'databases', 'caching', 'api-design',
      'load-balancing', 'rate-limiting', 'cdn-deep-dive',
      'rest-vs-rpc', 'message-queues', 'microservices',
      'long-polling-websockets-sse', 'security',
      'latency-vs-throughput', 'strong-vs-eventual-consistency',
    ],
    systemDesignProblems: [
      'url-shortener', 'twitter', 'whatsapp', 'amazon', 'instagram',
      'notification-system', 'chat-system', 'ecommerce-platform',
      'google-docs', 'typeahead', 'payment-system',
    ],
    behavioral: [
      'star-framework', 'tell-me-about-yourself', 'problem-solving',
      'cross-team-collaboration', 'explaining-technical', 'achievements',
      'proud-project', 'conflict-resolution', 'tight-deadlines',
      'learning-new-tech', 'leadership', 'speed-vs-quality',
    ],
    databases: [
      'database-storage-engines', 'database-indexing-deep-dive',
      'transaction-management', 'database-partitioning-sharding',
      'nosql-internals',
    ],
    sql: [
      'sql-fundamentals', 'sql-joins', 'sql-subqueries',
      'sql-window-functions', 'sql-interview-easy',
    ],
    microservices: [
      'api-gateway-pattern', 'service-discovery', 'circuit-breaker',
      'saga-pattern', 'bff-pattern',
    ],
  },

  data: {
    label: 'Data Engineer',
    coding: [
      'arrays-hashing', 'sorting', 'graphs', 'dynamic-programming',
      'binary-search', 'heaps', 'greedy', 'math-geometry',
      'topological-sort', 'union-find', 'trees', 'stacks',
      'matrix', 'knapsack-dp', 'top-k-elements',
    ],
    systemDesign: [
      'fundamentals', 'databases', 'message-queues', 'data-partitioning',
      'database-indexes', 'distributed-file-systems', 'distributed-messaging',
      'caching', 'consistent-hashing', 'bloom-filters',
      'synchronous-vs-asynchronous', 'latency-vs-throughput',
      'strong-vs-eventual-consistency', 'acid-vs-base',
    ],
    systemDesignProblems: [
      'web-crawler', 'search-engine', 'news-aggregator', 'ad-click-aggregation',
      'key-value-store', 'metrics-monitoring', 'top-k-leaderboard',
    ],
    behavioral: [
      'star-framework', 'tell-me-about-yourself', 'problem-solving',
      'data-driven-debugging', 'explaining-technical', 'achievements',
      'cross-team-collaboration', 'learning-new-tech', 'tight-deadlines',
      'proud-project', 'speed-vs-quality', 'optimizing-performance',
    ],
    databases: [
      'database-storage-engines', 'database-indexing-deep-dive',
      'database-partitioning-sharding', 'database-replication-strategies',
      'nosql-internals', 'specialized-databases', 'transaction-management',
      'concurrency-control',
    ],
    sql: [
      'sql-fundamentals', 'sql-joins', 'sql-subqueries',
      'sql-window-functions', 'sql-set-operations',
      'sql-interview-easy', 'sql-interview-hard',
    ],
    microservices: ['event-driven-architecture', 'cqrs', 'saga-pattern'],
  },

  ml: {
    label: 'ML / AI Engineer',
    coding: [
      'arrays-hashing', 'sorting', 'dynamic-programming', 'graphs',
      'binary-search', 'math-geometry', 'heaps', 'trees',
      'greedy', 'matrix', 'recursion', 'divide-and-conquer',
      'knapsack-dp', 'top-k-elements',
    ],
    systemDesign: [
      'fundamentals', 'databases', 'caching', 'message-queues',
      'distributed-file-systems', 'data-partitioning', 'bloom-filters',
      'distributed-messaging', 'latency-vs-throughput',
      'synchronous-vs-asynchronous', 'load-balancing',
    ],
    systemDesignProblems: [
      'search-engine', 'youtube', 'spotify', 'news-aggregator',
      'typeahead', 'ad-click-aggregation', 'web-crawler',
    ],
    behavioral: [
      'star-framework', 'tell-me-about-yourself', 'problem-solving',
      'explaining-technical', 'achievements', 'proud-project',
      'learning-new-tech', 'cross-team-collaboration', 'innovation',
      'data-driven-debugging', 'tight-deadlines', 'speed-vs-quality',
    ],
    databases: [
      'database-storage-engines', 'nosql-internals',
      'specialized-databases', 'database-indexing-deep-dive',
    ],
    sql: [
      'sql-fundamentals', 'sql-joins', 'sql-subqueries',
      'sql-window-functions', 'sql-interview-easy', 'sql-interview-hard',
    ],
    microservices: ['event-driven-architecture', 'cqrs'],
  },

  cloud: {
    label: 'Cloud Engineer',
    coding: [
      'arrays-hashing', 'graphs', 'trees', 'sorting', 'stacks',
      'greedy', 'recursion', 'search-algorithms', 'topological-sort',
      'shortest-path', 'union-find',
    ],
    systemDesign: [
      'fundamentals', 'load-balancing', 'rate-limiting', 'caching',
      'security', 'monitoring', 'redundancy-replication', 'dns-deep-dive',
      'cdn-deep-dive', 'proxies', 'network-essentials',
      'consistent-hashing', 'microservices', 'distributed-messaging',
      'heartbeat-mechanism', 'latency-vs-throughput',
    ],
    systemDesignProblems: [
      'metrics-monitoring', 'rate-limiter', 'notification-system',
      'key-value-store', 'url-shortener', 'web-crawler',
    ],
    behavioral: [
      'star-framework', 'tell-me-about-yourself', 'production-outage',
      'problem-solving', 'debugging-distributed', 'cross-team-collaboration',
      'learning-new-tech', 'tight-deadlines', 'simplifying-systems',
      'bias-for-action', 'data-driven-debugging', 'speed-vs-quality',
    ],
    databases: [
      'database-replication-strategies', 'database-partitioning-sharding',
      'database-recovery',
    ],
    sql: ['sql-fundamentals', 'sql-joins'],
    microservices: [
      'api-gateway-pattern', 'service-discovery', 'circuit-breaker',
      'sidecar-pattern', 'configuration-externalization',
    ],
  },

  platform: {
    label: 'Platform Engineer',
    coding: [
      'arrays-hashing', 'graphs', 'trees', 'sorting', 'stacks',
      'greedy', 'recursion', 'search-algorithms', 'topological-sort',
      'shortest-path', 'union-find', 'heaps',
    ],
    systemDesign: [
      'fundamentals', 'load-balancing', 'rate-limiting', 'caching',
      'microservices', 'security', 'monitoring', 'api-design',
      'message-queues', 'consistent-hashing', 'proxies',
      'redundancy-replication', 'dns-deep-dive', 'network-essentials',
      'distributed-messaging', 'latency-vs-throughput',
    ],
    systemDesignProblems: [
      'rate-limiter', 'metrics-monitoring', 'notification-system',
      'key-value-store', 'url-shortener', 'unique-id-generator',
    ],
    behavioral: [
      'star-framework', 'tell-me-about-yourself', 'production-outage',
      'problem-solving', 'debugging-distributed', 'cross-team-collaboration',
      'leadership', 'tight-deadlines', 'simplifying-systems',
      'optimizing-performance', 'speed-vs-quality', 'bias-for-action',
    ],
    databases: [
      'database-replication-strategies', 'database-partitioning-sharding',
      'database-storage-engines', 'database-recovery',
    ],
    sql: ['sql-fundamentals', 'sql-joins'],
    microservices: [
      'api-gateway-pattern', 'service-discovery', 'circuit-breaker',
      'sidecar-pattern', 'configuration-externalization',
      'event-driven-architecture', 'strangler-fig',
    ],
  },

  mobile: {
    label: 'Mobile Engineer',
    coding: [
      'arrays-hashing', 'trees', 'stacks', 'recursion', 'sorting',
      'binary-search', 'two-pointers', 'sliding-window', 'linked-lists',
      'dynamic-programming', 'graphs', 'greedy', 'queues',
      'tree-traversal', 'bst',
    ],
    systemDesign: [
      'fundamentals', 'caching', 'api-design', 'cdn-deep-dive',
      'rest-vs-rpc', 'long-polling-websockets-sse', 'security',
      'load-balancing', 'dns-deep-dive', 'network-essentials',
      'synchronous-vs-asynchronous', 'latency-vs-throughput',
    ],
    systemDesignProblems: [
      'instagram', 'uber', 'whatsapp', 'spotify', 'tinder',
      'doordash', 'google-maps', 'notification-system',
    ],
    behavioral: [
      'star-framework', 'tell-me-about-yourself', 'problem-solving',
      'cross-team-collaboration', 'explaining-technical', 'achievements',
      'proud-project', 'learning-new-tech', 'tight-deadlines',
      'receiving-feedback', 'speed-vs-quality', 'conflict-resolution',
    ],
    databases: [],
    sql: [],
    microservices: ['bff-pattern', 'api-gateway-pattern'],
  },

  security: {
    label: 'Security Engineer',
    coding: [
      'arrays-hashing', 'graphs', 'trees', 'stacks', 'sorting',
      'binary-search', 'bit-manipulation', 'recursion', 'greedy',
      'search-algorithms', 'shortest-path',
    ],
    systemDesign: [
      'security', 'fundamentals', 'rate-limiting', 'api-design',
      'network-essentials', 'proxies', 'dns-deep-dive', 'caching',
      'load-balancing', 'monitoring', 'checksum',
      'redundancy-replication', 'long-polling-websockets-sse',
    ],
    systemDesignProblems: [
      'rate-limiter', 'url-shortener', 'payment-system',
      'payment-gateway', 'notification-system', 'key-value-store',
    ],
    behavioral: [
      'star-framework', 'tell-me-about-yourself', 'problem-solving',
      'production-outage', 'cross-team-collaboration', 'explaining-technical',
      'learning-new-tech', 'tight-deadlines', 'conflict-resolution',
      'data-driven-debugging', 'bias-for-action', 'raising-quality-bar',
    ],
    databases: [
      'transaction-management', 'concurrency-control', 'sql-isolation-levels',
    ],
    sql: ['sql-fundamentals', 'sql-joins'],
    microservices: [
      'api-gateway-pattern', 'circuit-breaker', 'sidecar-pattern',
    ],
  },

  general: {
    label: 'Software Engineer',
    coding: [], // empty = show all
    systemDesign: [],
    systemDesignProblems: [],
    behavioral: [],
    databases: [],
    sql: [],
    microservices: [],
  },
};

/**
 * Maps onboarding role IDs (from OnboardingPage JOB_ROLES + MORE_ROLES)
 * to ROLE_TOPIC_MAP keys for content filtering.
 */
export const ONBOARDING_ROLE_TO_TOPIC_KEY: Record<string, RoleKey> = {
  // Primary roles (JOB_ROLES cards)
  backend: 'backend',
  frontend: 'frontend',
  fullstack: 'fullstack',
  devops: 'devops',
  data: 'data',
  ml: 'ml',
  mobile: 'mobile',
  qa: 'backend',
  em: 'general',
  architect: 'backend',
  // Additional roles (MORE_ROLES dropdown)
  cloud: 'cloud',
  platform: 'platform',
  security: 'security',
  sre: 'sre',
  data_scientist: 'data',
  data_analyst: 'data',
  tech_lead: 'backend',
  staff: 'backend',
  principal: 'backend',
  tpm: 'general',
  product_manager: 'general',
  ios: 'mobile',
  android: 'mobile',
  blockchain: 'backend',
  game_dev: 'fullstack',
  embedded: 'backend',
  dba: 'data',
  network: 'cloud',
  ai_researcher: 'ml',
  devsecops: 'devops',
};

/**
 * Get the page key for the DocsPage based on a focus area from the study path.
 */
export function getPageKeyForFocus(focus: string): string {
  const f = focus.toLowerCase();
  if (f.includes('scripting') || f.includes('dsa') || f.includes('algorithm') || f.includes('data structure') || f.includes('coding') || f.includes('javascript') || f.includes('python') || f.includes('problem solving')) return 'coding';
  if (f.includes('system design') || f.includes('architecture') || f.includes('pipeline') || f.includes('monitoring') || f.includes('observability') || f.includes('container') || f.includes('distributed') || f.includes('scalab') || f.includes('performance') || f.includes('cloud')) return 'system-design';
  if (f.includes('behavioral') || f.includes('star') || f.includes('leadership') || f.includes('culture') || f.includes('teamwork') || f.includes('values')) return 'behavioral';
  if (f.includes('microservice')) return 'microservices';
  if (f.includes('database') || f.includes('db ')) return 'databases';
  if (f.includes('sql')) return 'sql';
  return 'coding';
}
