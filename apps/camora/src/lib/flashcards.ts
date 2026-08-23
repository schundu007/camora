/**
 * Flashcards — client-side spaced-repetition (SM-2-lite).
 *
 * Fenzo-inspired active-recall layer for Capra. Retrieval practice (testing
 * yourself, then spacing the review) is the single highest-leverage study
 * technique — this module is the scheduler + persistence behind the
 * /capra/flashcards page.
 *
 * Storage: localStorage, keyed per user so decks don't leak across accounts on
 * a shared machine. No backend yet — a future sync layer can POST the same
 * shape to ascend-backend without touching the review logic.
 */
export type CardRating = 'again' | 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string;
  deck: string;          // deck id (e.g. 'system-design', 'behavioral')
  front: string;         // the prompt shown first
  back: string;          // the answer revealed on flip
  tags?: string[];
  source?: string;       // where the card came from (starter | quiz | prep)
  // ── SM-2 scheduling state ──
  ease: number;          // ease factor, starts 2.5, floor 1.3
  intervalDays: number;  // current interval in days
  reps: number;          // consecutive successful reviews
  dueAt: number;         // epoch ms when the card is next due
  createdAt: number;
  lastReviewedAt?: number;
}

export interface DeckMeta {
  id: string;
  title: string;
  accent: string;        // hex for chips / rings
  blurb: string;
}

const STORAGE_PREFIX = 'camora_flashcards_v1';
const MS_PER_DAY = 86_400_000;

/** New cards are due immediately; a fresh card has these defaults. */
function freshSchedule(now: number): Pick<Flashcard, 'ease' | 'intervalDays' | 'reps' | 'dueAt' | 'createdAt'> {
  return { ease: 2.5, intervalDays: 0, reps: 0, dueAt: now, createdAt: now };
}

/**
 * SM-2-lite. Returns the next scheduling state for a card given a rating.
 * `again` resets the card to be re-seen within the same session (~1 min);
 * the others grow the interval, with `easy` growing fastest.
 */
export function schedule(card: Flashcard, rating: CardRating, now = Date.now()): Flashcard {
  let { ease, intervalDays, reps } = card;

  if (rating === 'again') {
    ease = Math.max(1.3, ease - 0.2);
    reps = 0;
    // Re-queue inside this session — one minute out, not a full day.
    return { ...card, ease, intervalDays: 0, reps, dueAt: now + 60_000, lastReviewedAt: now };
  }

  if (rating === 'hard') {
    ease = Math.max(1.3, ease - 0.15);
    intervalDays = reps === 0 ? 1 : Math.max(1, Math.round(intervalDays * 1.2));
  } else if (rating === 'good') {
    intervalDays = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(1, Math.round(intervalDays * ease));
  } else {
    // easy
    ease = ease + 0.15;
    intervalDays = reps === 0 ? 2 : Math.max(1, Math.round(intervalDays * ease * 1.3));
  }
  reps += 1;
  return { ...card, ease, intervalDays, reps, dueAt: now + intervalDays * MS_PER_DAY, lastReviewedAt: now };
}

/** Card lifecycle bucket, derived from schedule state. */
export type CardStatus = 'new' | 'learning' | 'due' | 'scheduled';
export function statusOf(card: Flashcard, now = Date.now()): CardStatus {
  if (card.reps === 0 && !card.lastReviewedAt) return 'new';
  if (card.dueAt <= now) return card.reps === 0 ? 'learning' : 'due';
  return 'scheduled';
}

/** Cards ready to review right now (new + anything past its due time). */
export function dueCards(cards: Flashcard[], now = Date.now()): Flashcard[] {
  return cards
    .filter((c) => c.dueAt <= now)
    // New/learning first, then oldest-due first — keeps sessions moving.
    .sort((a, b) => a.dueAt - b.dueAt);
}

export function countByStatus(cards: Flashcard[], now = Date.now()): Record<CardStatus, number> {
  const out: Record<CardStatus, number> = { new: 0, learning: 0, due: 0, scheduled: 0 };
  for (const c of cards) out[statusOf(c, now)] += 1;
  return out;
}

/* ── Persistence ──────────────────────────────────────────────────────── */

const keyFor = (userId: string | null | undefined) => `${STORAGE_PREFIX}:${userId || 'anon'}`;

export function loadCards(userId: string | null | undefined): Flashcard[] {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return seedDeck(Date.now());
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return seedDeck(Date.now());
    return parsed as Flashcard[];
  } catch {
    return seedDeck(Date.now());
  }
}

export function saveCards(userId: string | null | undefined, cards: Flashcard[]): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(cards));
  } catch { /* quota / private mode — non-fatal */ }
}

/** Merge new cards into the deck, de-duped by (deck, front). Returns merged list. */
export function addCards(existing: Flashcard[], incoming: Omit<Flashcard, keyof ReturnType<typeof freshSchedule>>[], now = Date.now()): Flashcard[] {
  const seen = new Set(existing.map((c) => `${c.deck}::${c.front.trim().toLowerCase()}`));
  const merged = [...existing];
  for (const inc of incoming) {
    const k = `${inc.deck}::${inc.front.trim().toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push({ ...inc, ...freshSchedule(now) } as Flashcard);
  }
  return merged;
}

/* ── Decks + starter content ──────────────────────────────────────────── */

export const DECKS: DeckMeta[] = [
  { id: 'system-design', title: 'System Design', accent: 'var(--accent)', blurb: 'Scaling, storage, consistency, and the tradeoffs interviewers probe.' },
  { id: 'behavioral', title: 'Behavioral', accent: 'var(--accent)', blurb: 'STAR framework, leadership, conflict, and failure stories.' },
  { id: 'dsa', title: 'DSA Patterns', accent: 'var(--accent)', blurb: 'The recurring patterns behind most coding-round questions.' },
  { id: 'cloud-devops', title: 'Cloud & DevOps', accent: 'var(--accent)', blurb: 'Kubernetes, CI/CD, IaC, and reliability fundamentals.' },
];

interface SeedCard { deck: string; front: string; back: string; tags?: string[] }

const SEED: SeedCard[] = [
  // ── System Design ──
  { deck: 'system-design', front: 'When do you shard a database, and what breaks when you do?', back: 'Shard when a single primary can no longer hold the data or serve the write throughput. What breaks: cross-shard joins and transactions, unique/global secondary indexes, and rebalancing hot shards. Pick a shard key with even distribution and query locality; avoid keys that create hotspots (e.g. timestamp).' },
  { deck: 'system-design', front: 'CAP theorem: what are you actually choosing between during a network partition?', back: 'During a partition you choose Consistency (reject/limit requests so no node returns stale data) OR Availability (every node answers, possibly with stale data). You never "give up P" — partitions happen. Most internet systems pick AP with eventual consistency; financial ledgers lean CP.' },
  { deck: 'system-design', front: 'What does a cache-aside (lazy loading) strategy look like, and its main failure mode?', back: 'App checks cache; on miss, reads DB and populates cache. Simple and only caches what is used. Failure modes: stale data after writes (mitigate with TTL or write-through/invalidation) and thundering-herd on a cold/expired hot key (mitigate with request coalescing or a short lock).' },
  { deck: 'system-design', front: 'Idempotency: why do payment/checkout APIs need it and how is it implemented?', back: 'Clients retry on timeouts; without idempotency a retry double-charges. Implement with a client-supplied idempotency key stored server-side: first request processes and records the result keyed by that id; retries return the stored result instead of re-executing.' },
  { deck: 'system-design', front: 'How do you keep a search index consistent with the source-of-truth database?', back: 'Do not dual-write from the app (partial-failure skew). Use the DB as source of truth and stream changes (CDC / outbox pattern) to the index asynchronously. Accept eventual consistency; expose "indexed a moment ago" semantics rather than read-your-writes on search.' },
  { deck: 'system-design', front: 'Load balancing: difference between L4 and L7, and when to use each?', back: 'L4 (transport) routes by IP/port, is fast and protocol-agnostic, no payload inspection. L7 (application) can route by path/header/cookie, do TLS termination, retries, and sticky sessions, at higher cost. Use L4 for raw throughput/TCP, L7 when you need content-based routing or HTTP-aware features.' },

  // ── Behavioral ──
  { deck: 'behavioral', front: 'What is the STAR framework and the most common mistake using it?', back: 'Situation, Task, Action, Result. Most common mistake: spending 80% on Situation/Task and rushing Action/Result. Interviewers score the Action (what YOU specifically did) and the quantified Result. Keep S/T to two sentences; make A first-person and specific; end with a metric.' },
  { deck: 'behavioral', front: '"Tell me about a time you failed." — what are they actually testing?', back: 'Ownership and learning, not the failure itself. Structure: pick a real failure with real stakes, own your specific contribution (no blaming), state what you learned, and show the concrete change you made afterward that prevented a repeat. Avoid humble-brags ("I worked too hard").' },
  { deck: 'behavioral', front: '"Tell me about a conflict with a coworker." — what signals a strong answer?', back: 'Disagree-and-commit maturity: you sought to understand their view, argued with data not ego, escalated appropriately, and preserved the relationship. Strong answers end with the working relationship intact and a decision the team could move forward on — not "I was right."' },
  { deck: 'behavioral', front: 'How do you quantify impact when your work had no obvious number?', back: 'Translate to a proxy metric: time saved (hours/week × people), incidents avoided, review latency, onboarding time, cost/infra reduction, adoption (%, count), or risk reduced. "Cut deploy time from 40 to 8 minutes for a 30-person team" beats "improved the pipeline."' },

  // ── DSA Patterns ──
  { deck: 'dsa', front: 'When should you reach for two pointers vs a hash map?', back: 'Two pointers: the input is sorted (or can be) and you need pairs/triples or to partition in O(1) space — e.g. two-sum on a sorted array, container-with-most-water. Hash map: unsorted input and you need O(1) lookup of "have I seen X / complement" — e.g. two-sum unsorted, dedup, frequency counts.' },
  { deck: 'dsa', front: 'What problem shape signals a sliding window, and fixed vs dynamic?', back: 'Contiguous subarray/substring with a constraint (max sum of size k, longest substring without repeats). Fixed window: size k given — slide and update. Dynamic window: expand right until the constraint breaks, then shrink left — track best. O(n) instead of O(n²) brute force.' },
  { deck: 'dsa', front: 'BFS vs DFS: how do you decide on a graph/tree problem?', back: 'BFS (queue) for shortest path in an unweighted graph and level-order traversal. DFS (stack/recursion) for connectivity, cycle detection, topological sort, and exhaustive path/backtracking search. Shortest-path-by-edges → BFS; "explore all / does a path exist" → DFS.' },
  { deck: 'dsa', front: 'When is a heap the right data structure?', back: 'Top-K / k-th largest, streaming medians (two heaps), merging k sorted lists, and Dijkstra. Signal words: "k largest/smallest", "closest k", "schedule by priority". A size-k min-heap gives top-k in O(n log k) without sorting everything.' },
  { deck: 'dsa', front: 'How do you recognize a dynamic-programming problem?', back: 'Overlapping subproblems + optimal substructure, usually asking for a count, min/max, or "is it possible". Signals: "number of ways", "min cost to", choices at each step that depend on earlier choices. Define the state, the recurrence, and the base case; memoize (top-down) or tabulate (bottom-up).' },

  // ── Cloud & DevOps ──
  { deck: 'cloud-devops', front: 'Kubernetes: difference between a liveness and a readiness probe?', back: 'Liveness: "is the container wedged?" — failing it restarts the pod. Readiness: "can it serve traffic right now?" — failing it removes the pod from the Service endpoints without restarting. Mixing them up causes restart loops (readiness logic in liveness) or sending traffic to a warming pod (missing readiness).' },
  { deck: 'cloud-devops', front: 'Blue-green vs canary deployment — the tradeoff?', back: 'Blue-green: run two full environments, flip all traffic at once — instant rollback, but double the resources and a big-bang cutover. Canary: shift a small % of traffic to the new version, watch metrics, ramp up — safer for catching real-traffic regressions, but slower and needs good observability + automated rollback.' },
  { deck: 'cloud-devops', front: 'What makes infrastructure-as-code "idempotent", and why does it matter?', back: 'Applying the same config repeatedly converges to the same state instead of stacking changes. Terraform/declarative tools diff desired vs actual and only act on drift. It matters because it makes deploys repeatable and reviewable, and lets you recover an environment from code rather than tribal knowledge.' },
  { deck: 'cloud-devops', front: 'The four golden signals of monitoring (SRE)?', back: 'Latency (time to serve a request, split success vs error), Traffic (demand — RPS/QPS), Errors (rate of failed requests), and Saturation (how full the system is — CPU/mem/queue depth). Alert on symptoms users feel (latency/errors) rather than every low-level cause.' },
];

/** Build the initial deck with fresh scheduling. Called on first load. */
export function seedDeck(now: number): Flashcard[] {
  return SEED.map((s, i) => ({
    id: `seed-${i}`,
    deck: s.deck,
    front: s.front,
    back: s.back,
    tags: s.tags,
    source: 'starter',
    ...freshSchedule(now),
  }));
}
