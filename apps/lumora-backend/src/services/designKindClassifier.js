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
 * Classification order:
 *   1. Known-problem lookup (systemDesignProblemCategoryMap) — highest
 *      precedence. If the question names a problem we have authoritative
 *      typology for ("design Twitter" → social → system; "design rate
 *      limiter" → infrastructure), use that.
 *   2. Infrastructure cues (more specific than app cues — "API rate
 *      limiter" → infra because the rate limiter IS the question).
 *   3. Application cues.
 *   4. Frontend hint (fallback for ambiguous questions; e.g. "design
 *      Twitter" on the /lumora/design page → step 1 already routed it,
 *      but for novel questions hint applies).
 *   5. System fallback.
 *
 * The frontend hint is a *fallback*, not an override — so a user on
 * the /lumora/design page typing "design a CDN" still gets the infra
 * archetype, not the page-default 'system'.
 */

const VALID_KINDS = new Set(['application', 'system', 'infrastructure', 'multi_cloud']);

// Multi-cloud / heterogeneous-CSP cues. Highest precedence among cue
// lists — when the question explicitly spans cloud providers (k8s on
// arbitrary CSPs, multi-cloud failover, hybrid bare-metal + cloud), a
// single-provider AWS-icon-stack diagram misrepresents the answer. The
// multi_cloud prompt switches to a horizontal grouped-cluster layout
// with provider-agnostic shapes side-by-side.
const MULTI_CLOUD_CUES = [
  'multi-cloud', 'multi cloud', 'multicloud',
  'multi-csp', 'multi csp',
  'cross-cloud', 'cross cloud',
  'heterogeneous cloud', 'heterogeneous csp', 'heterogeneous cloud provider',
  'arbitrary cloud', 'arbitrary csp', 'arbitrary cloud provider',
  'multiple cloud providers', 'multiple csps',
  'csp a', 'csp b', 'csp c',
  'cloud-agnostic', 'cloud agnostic', 'provider-agnostic',
  'hybrid cloud', 'on-prem and cloud', 'on prem and cloud',
  'aws and gcp', 'aws and azure', 'gcp and azure',
  'aws gcp azure', 'eks and gke', 'eks gke aks',
];

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

// Authoritative typology for known interview problems. Sourced from
// apps/camora/src/data/capra/topics/systemDesignProblems.js
// (systemDesignProblemCategoryMap). Duplicated here so the backend
// classifier doesn't reach into frontend code at runtime.
//
// Categories collapse to archetypes:
//   social / streaming / communication / ecommerce / storage → system
//     (these are distributed product-system designs)
//   infrastructure → infrastructure
//
// Add a problem here when adding it to the frontend map.
const KNOWN_PROBLEM_KIND = Object.freeze({
  // social
  twitter: 'system', instagram: 'system', 'facebook-newsfeed': 'system',
  linkedin: 'system', tinder: 'system',
  // streaming
  youtube: 'system', netflix: 'system', spotify: 'system',
  // communication
  whatsapp: 'system', 'chat-system': 'system', zoom: 'system',
  'notification-system': 'system', 'messaging-app': 'system',
  // ecommerce
  amazon: 'system', airbnb: 'system', doordash: 'system', yelp: 'system',
  ticketmaster: 'system', 'hotel-booking': 'system', uber: 'system',
  'ecommerce-platform': 'system', 'proximity-service': 'system',
  // storage products (product systems whose differentiator is storage)
  dropbox: 'system', pastebin: 'system', 'web-crawler': 'system',
  'news-aggregator': 'system', 'search-engine': 'system',
  'payment-system': 'system', 'payment-gateway': 'system',
  // infrastructure components
  'url-shortener': 'infrastructure', 'rate-limiter': 'infrastructure',
  'unique-id-generator': 'infrastructure', typeahead: 'infrastructure',
  'google-maps': 'infrastructure', leaderboard: 'infrastructure',
  'twitter-trends': 'infrastructure', 'google-docs': 'infrastructure',
  'ad-click-aggregation': 'infrastructure', 'autocomplete-system': 'infrastructure',
  'metrics-monitoring': 'infrastructure', 'tiny-url': 'infrastructure',
  'top-k-leaderboard': 'infrastructure', 'key-value-store': 'infrastructure',
});

// Pre-sort slugs by length DESC so a question containing both
// "twitter" and "twitter trends" matches the longer slug first.
const KNOWN_SLUGS_BY_LENGTH = Object.freeze(
  Object.keys(KNOWN_PROBLEM_KIND).sort((a, b) => b.length - a.length),
);

/**
 * Match the question text against a known problem slug. Tries both
 * the slug as-is ("url-shortener") and the slug with dashes replaced
 * by spaces ("url shortener") so a free-form question hits.
 * Returns the archetype or null.
 */
function lookupKnownProblemKind(q) {
  for (const slug of KNOWN_SLUGS_BY_LENGTH) {
    const dashed = slug;
    const spaced = slug.replace(/-/g, ' ');
    if (q.includes(dashed) || q.includes(spaced)) {
      return KNOWN_PROBLEM_KIND[slug];
    }
  }
  return null;
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
  // 1. Multi-cloud cues win over EVERYTHING (including known-problem
  //    lookup). When the user explicitly frames a question as multi-CSP /
  //    cross-cloud / heterogeneous, the diagram needs the side-by-side
  //    grouped-cluster layout, even when the underlying problem is one
  //    we have a typology for ("design twitter for multi-cloud failover"
  //    is a multi-cloud question, not a stock Twitter system).
  if (hasAnyCue(q, MULTI_CLOUD_CUES)) return 'multi_cloud';
  // 2. Authoritative typology for known problems.
  const known = lookupKnownProblemKind(q);
  if (known) return known;
  // 3-5. Cues, then hint.
  if (hasAnyCue(q, INFRA_CUES)) return 'infrastructure';
  if (hasAnyCue(q, APP_CUES)) return 'application';
  if (hint && VALID_KINDS.has(hint)) return hint;
  return 'system';
}

export const VALID_DESIGN_KINDS = Array.from(VALID_KINDS);
