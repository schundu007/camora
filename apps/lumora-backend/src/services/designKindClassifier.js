/**
 * designKind classifier — partitions "design" questions into archetypes
 * so the prompt + diagram can be tailored.
 *
 *   application    OOP / LLD / API design (LRU cache, parking lot,
 *                  vending machine, REST endpoint, GraphQL schema).
 *                  Cares about classes, methods, data model, design
 *                  patterns, complexity. NOT capacity math.
 *   infrastructure infra component / building block (CDN, message
 *                  queue, distributed cache, rate limiter, load
 *                  balancer, pub/sub, consensus protocol). Cares about
 *                  data plane vs control plane, partitioning,
 *                  replication, consistency model.
 *   system         distributed product system (Twitter, Uber,
 *                  WhatsApp). Cares about full-stack scaling,
 *                  capacity math, multi-service architecture. This is
 *                  the existing default and should never regress on
 *                  questions that fit it.
 *
 * Classification order: infrastructure cues (most specific) →
 * application cues → frontend hint → system fallback. Infrastructure
 * cues trump app cues ("API rate limiter" → infra) because the rate
 * limiter IS the question, the API surface is incidental.
 *
 * The frontend hint is a *fallback*, not an override — so a user on
 * the /lumora/design page typing "design a CDN" still gets the infra
 * archetype, not the page-default 'system'. Hint only wins when the
 * question text gives no signal either way.
 */

const VALID_KINDS = new Set(['application', 'system', 'infrastructure']);

const INFRA_CUES = [
  'cdn', 'content delivery',
  'rate limiter', 'rate limit',
  'message queue', 'kafka', 'rabbitmq', 'pub/sub', 'pubsub',
  'distributed cache', 'memcached', 'redis cluster',
  'load balancer', 'consistent hash', 'consistent hashing',
  'leader election', 'consensus', 'raft', 'paxos',
  'replication protocol', 'gossip protocol',
  'distributed lock', 'distributed transaction',
  'service mesh', 'service discovery',
  'sharding strategy', 'partitioning strategy',
];

const APP_CUES = [
  'lru', 'lfu cache',
  'parking lot', 'vending machine', 'elevator',
  'atm ', 'design an atm',
  'chess', 'tic tac toe', 'snake game', 'connect four',
  'design pattern', 'oop', 'object oriented', 'object-oriented',
  'class diagram', 'state machine',
  'rest api', 'graphql schema', 'design the api', 'design a rest api',
  'design an api', 'design a graphql', 'api endpoint', 'design endpoint',
];

function hasAnyCue(q, cues) {
  return cues.some((kw) => q.includes(kw));
}

/**
 * @param {string} question  raw user question
 * @param {string?} hint     frontend default ('application' | 'system' |
 *                           'infrastructure'); used only when the
 *                           question text gives no cue. NOT an override —
 *                           "design a CDN" beats hint='system'.
 * @returns {'application' | 'system' | 'infrastructure'}
 */
export function classifyDesignKind(question, hint = null) {
  const q = String(question || '').toLowerCase();
  if (hasAnyCue(q, INFRA_CUES)) return 'infrastructure';
  if (hasAnyCue(q, APP_CUES)) return 'application';
  if (hint && VALID_KINDS.has(hint)) return hint;
  return 'system';
}

export const VALID_DESIGN_KINDS = Array.from(VALID_KINDS);
