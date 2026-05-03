export interface Topic {
  slug: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  body: string;
}

export interface Category {
  key: string;
  title: string;
  description: string;
  topics: Topic[];
}

export const CATEGORIES: Category[] = [
  {
    key: 'dsa',
    title: 'Data Structures & Algorithms',
    description: 'Patterns that show up across most technical-screening problems.',
    topics: [
      {
        slug: 'two-pointers',
        title: 'Two pointers',
        summary: 'Walk a sorted array (or string) from both ends to hit O(n) on problems that look O(n²).',
        estimatedMinutes: 12,
        body: `Two pointers replace a nested loop with two indices that move toward each other or in the same direction. The trick is recognising when the input is sorted (or can be sorted cheaply) and the answer depends on a relationship between two elements.

When to reach for it
- Sorted array, find a pair / triplet matching a target sum.
- Removing duplicates in-place.
- Reversing a string or array.
- Container With Most Water — the canonical "shrink toward the better side" example.

Template
  let l = 0, r = arr.length - 1;
  while (l < r) {
    if (good(arr[l], arr[r])) { /* record answer */ l++; r--; }
    else if (tooSmall(arr[l], arr[r])) l++;
    else r--;
  }

Common interviewer follow-up: "what if the input isn't sorted?" — sort first (O(n log n)) and explain the tradeoff. If the array can't be modified, sort a copy of indices so the original ordering is preserved.`,
      },
      {
        slug: 'sliding-window',
        title: 'Sliding window',
        summary: 'Maintain a moving range over a sequence so you visit each element O(1) amortised times.',
        estimatedMinutes: 14,
        body: `Sliding window converts "longest / shortest / count of subarrays satisfying X" problems from O(n²) into O(n). The window expands on the right and contracts from the left when the constraint is broken.

When to reach for it
- Longest substring with at most K distinct characters.
- Smallest subarray with sum ≥ S.
- Number of substrings with exactly K vowels.

Template (variable-size window)
  let l = 0, best = 0;
  const counts = new Map();
  for (let r = 0; r < s.length; r++) {
    counts.set(s[r], (counts.get(s[r]) ?? 0) + 1);
    while (windowInvalid(counts)) {
      counts.set(s[l], counts.get(s[l]) - 1);
      if (counts.get(s[l]) === 0) counts.delete(s[l]);
      l++;
    }
    best = Math.max(best, r - l + 1);
  }

The state inside the window is the part you almost always get wrong on a whiteboard — write it down before you start coding.`,
      },
      {
        slug: 'binary-search',
        title: 'Binary search',
        summary: 'Beyond "find an element in a sorted array" — most uses are searching the answer space.',
        estimatedMinutes: 13,
        body: `90% of interview binary search isn't searching an array — it's searching the *answer space*. "What's the smallest capacity such that we can ship in D days?" or "What's the minimum eating speed Koko needs to finish all bananas in H hours?"

Pattern
  let lo = minPossibleAnswer, hi = maxPossibleAnswer;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (feasible(mid)) hi = mid;     // mid works, try smaller
    else lo = mid + 1;                // mid too small, go bigger
  }
  return lo;

Off-by-one defences:
- Use lo + ((hi - lo) >> 1) to avoid integer overflow on huge ranges.
- After the loop, lo === hi — return either, but make sure your invariant ("the answer is in [lo, hi]") holds at every iteration.

Always sketch the predicate function on paper first. The bug is almost never in the binary search; it's in feasible().`,
      },
      {
        slug: 'recursion-and-backtracking',
        title: 'Recursion & backtracking',
        summary: 'Generate / explore / count by trying every choice and undoing it.',
        estimatedMinutes: 16,
        body: `Backtracking is recursion plus an "undo" step. Every recursive call makes a choice, recurses, then undoes the choice before trying the next one. This is what powers permutations, combinations, N-queens, sudoku, word search.

Skeleton
  function backtrack(state) {
    if (isSolution(state)) { record(state); return; }
    for (const choice of choicesFrom(state)) {
      apply(state, choice);
      backtrack(state);
      undo(state, choice);
    }
  }

Pruning is what turns 10⁹ from "infeasible" to "fast enough." Two cheap pruning moves: (1) bail out when the partial state can't improve the current best, (2) skip duplicate choices when generating sets where order doesn't matter — sort first, then "if (i > 0 && nums[i] === nums[i-1] && !used[i-1]) continue".

Time complexity is rarely tight — it's "exponential in the depth, ish" for backtracking. Don't try to give a clean Big-O on a whiteboard; describe the branching factor and depth.`,
      },
      {
        slug: 'graphs-bfs-dfs',
        title: 'Graphs — BFS & DFS',
        summary: 'Shortest path on unweighted graphs (BFS), connectivity / cycle detection (DFS).',
        estimatedMinutes: 18,
        body: `Both BFS and DFS visit every node once — O(V + E). The pick depends on what you need:

BFS — shortest path on an unweighted graph
  const q = [start]; const dist = { [start]: 0 };
  while (q.length) {
    const node = q.shift();
    for (const next of adj[node]) if (dist[next] === undefined) {
      dist[next] = dist[node] + 1;
      q.push(next);
    }
  }

DFS — connected components, cycle detection, topological sort
  function dfs(node) {
    visited.add(node);
    for (const next of adj[node]) if (!visited.has(next)) dfs(next);
  }

For grids: don't build an explicit adjacency list — generate neighbours inline ([0,1],[0,-1],[1,0],[-1,0]) inside the loop.

Recursive DFS hits stack overflow on deep graphs (>10k nodes in JS). Convert to an explicit stack: while (stack.length) { ... stack.push(next); }. Worth knowing in case the interviewer presses on inputs at scale.`,
      },
      {
        slug: 'dynamic-programming',
        title: 'Dynamic programming',
        summary: 'Cache subproblem answers so an exponential brute-force becomes polynomial.',
        estimatedMinutes: 22,
        body: `DP is just memoised recursion that you eventually flatten into iteration. Three steps every time:

1. Define the state. "dp[i][j] = the answer to the subproblem starting at i with budget j." Write this in plain English first — it's where every DP bug originates.
2. Write the recurrence. "dp[i][j] depends on dp[i+1][j] and dp[i+1][j-cost[i]]." Draw the dependency graph if it isn't obvious.
3. Order the iteration. Compute dp[i][j] only after the cells it depends on are filled. For 2-D DPs this usually means iterating i from high to low and j from low to high.

Common state shapes
- 1-D: index → answer (Fibonacci, climbing stairs, house robber)
- 2-D: index × index (longest common subsequence, edit distance, palindrome partitioning)
- index × boolean (states where you can / can't take the next item)
- index × count (knapsack-style)

When asked about space, almost every 2-D DP can be reduced to two rows (current + previous) since dp[i] only reads dp[i-1].

Don't chase a clever bottom-up version on a whiteboard. Write the top-down memoised version first — it directly mirrors the recurrence — and convert if there's time.`,
      },
    ],
  },
  {
    key: 'system-design',
    title: 'System Design',
    description: 'High-level architecture topics for senior-level evaluations.',
    topics: [
      {
        slug: 'design-framework',
        title: 'A framework for any system design question',
        summary: 'Five steps you walk every design discussion through, regardless of the prompt.',
        estimatedMinutes: 18,
        body: `1. Clarify requirements (functional + non-functional). Ask about scale, read/write ratios, latency targets, consistency needs. Write them on the board — interviewers grade on whether you re-check assumptions later.

2. Estimate. Back-of-envelope: QPS, storage per year, peak vs average. Don't dive into numbers without a target — "100M DAU, each posting 2 messages/day → 200M writes/day → 2,300 writes/sec average, 5x peak ≈ 12k writes/sec."

3. API design. Two or three core endpoints with request/response shapes. This forces concrete thinking and gives the interviewer something to poke at.

4. Data model + storage choice. Pick a primary store and justify (relational for transactions + joins, document for semi-structured + horizontal scale, KV for raw speed). Mention what doesn't go in the primary store (search → Elasticsearch, blobs → S3, hot reads → Redis cache).

5. Architecture diagram. Boxes for client, load balancer, app servers, queue, store, cache. Identify the single bottleneck and explain how you'd scale past it (sharding, read replicas, CDC).

Save 5 minutes at the end for non-functional concerns: monitoring, deployment, security, multi-region failover. Interviewers always ask "what would you do differently for 10× scale?" — have one answer ready.`,
      },
      {
        slug: 'caching',
        title: 'Caching strategies',
        summary: 'Cache-aside vs write-through vs write-behind, and where each one breaks.',
        estimatedMinutes: 14,
        body: `Cache-aside (lazy)
- App reads cache first; on miss, read from DB and populate cache.
- Pro: simple, only caches what's actually read.
- Con: stale reads possible (race between DB write and cache invalidation), cold-start penalty.

Write-through
- App writes to cache and DB synchronously.
- Pro: cache always fresh.
- Con: write latency = DB latency + cache latency, useless data clogs cache.

Write-behind (write-back)
- App writes to cache; cache flushes to DB asynchronously.
- Pro: very fast writes.
- Con: data loss on cache crash, complex consistency story.

Cache invalidation: TTL is the lazy way and almost always correct. Active invalidation (publish "key changed" events) is required when staleness has business impact (account balance, role changes).

The two hard problems in caching: cache stampede (many requests miss simultaneously and all hit the DB) — fix with locks or "request collapsing." And cache penetration (many requests for keys that don't exist) — fix with a bloom filter or a negative-result cache with short TTL.`,
      },
      {
        slug: 'database-sharding',
        title: 'Sharding & partitioning',
        summary: 'Splitting one logical database across many physical machines without losing your sanity.',
        estimatedMinutes: 16,
        body: `Why shard: a single Postgres node tops out around 100k QPS read / 10k QPS write on commodity hardware. When throughput or storage exceeds that, you split.

Sharding strategies
- Range-based: rows 0–999 on shard 1, 1000–1999 on shard 2. Easy range queries, hot spots when traffic is skewed.
- Hash-based: shard = hash(user_id) % N. Even distribution, painful to add new shards (most rows move).
- Consistent hashing: shard = position on a hash ring. Adding/removing a shard only moves 1/N of the data. Used by Cassandra, DynamoDB, memcached clients.
- Directory-based: lookup table maps key → shard. Most flexible, but the directory is a new bottleneck.

Cross-shard queries are the hard part. Common patterns:
- Denormalise so the hot query never crosses shards (write the answer to multiple shards on insert).
- Run scatter-gather only when you must, and cap the fan-out.
- Move multi-shard analytical queries to a separate OLAP store (Snowflake, BigQuery) fed by CDC.

Re-sharding in production is the largest source of downtime in scaled systems. Plan for it from day one — keep schemas additive, version your sharding function, and run dual-writes during migration.`,
      },
      {
        slug: 'message-queues',
        title: 'Message queues & event-driven architecture',
        summary: 'Decoupling producers from consumers with Kafka / SQS / RabbitMQ.',
        estimatedMinutes: 15,
        body: `A queue between two services lets the producer write and move on, while the consumer processes at its own rate. Trades latency for throughput, decoupling, and back-pressure tolerance.

Picking a broker
- Kafka: high-throughput, ordered, retains messages for days, replay-friendly. Pick for log streaming, event sourcing, analytics pipelines.
- SQS / RabbitMQ: lower throughput, push/pull semantics, dead-letter queues. Pick for task queues where each message is processed once and discarded.
- Redis Streams / Pub-Sub: good for low-latency in-memory, fragile for durability.

Delivery guarantees
- At-most-once: producer fires and forgets (fast, lossy on broker outage).
- At-least-once: producer retries until ack (the default — design consumers to be idempotent).
- Exactly-once: requires transactional broker support (Kafka transactions) and is rarely worth the complexity. Almost always faked with at-least-once + idempotency keys on the consumer.

Back-pressure: when consumers can't keep up, the queue grows. Without a cap, you OOM the broker. Set queue length alerts and apply load shedding upstream.`,
      },
      {
        slug: 'rate-limiting',
        title: 'Rate limiting',
        summary: 'Token bucket vs leaky bucket vs sliding window, and where each lives in your stack.',
        estimatedMinutes: 12,
        body: `Token bucket: bucket holds N tokens, refills at R/sec. Each request consumes one. Allows bursts up to N. Most public APIs use this.

Leaky bucket: requests enter a queue, leak out at constant rate. Smooths bursts at the cost of latency. Used inside payment processors and other systems where downstream can't tolerate bursts.

Fixed window: count requests per minute, reset on minute boundary. Simple, but a 2-second burst at the boundary can hit 2× the rate.

Sliding window: maintain a rolling count. Most accurate, more memory.

Where to enforce
- Edge (CDN / WAF): cheapest, blocks bots before they touch your servers.
- API gateway: per-API-key limits, easier to manage than per-IP.
- Application: per-user-action limits ("you can post 10 comments/hour").

Distributed rate limiting needs a shared counter. Redis with INCR + EXPIRE is the canonical implementation. For huge scale, sharded counters or probabilistic algorithms (CountMinSketch).`,
      },
      {
        slug: 'consistency-vs-availability',
        title: 'CAP, PACELC, and what consistency you actually need',
        summary: 'When to pick a CP store, when to pick AP, and the often-overlooked latency tradeoff.',
        estimatedMinutes: 16,
        body: `CAP says: under network partition, you choose between consistency (CP) and availability (AP). PACELC adds: even when there's no partition, you trade latency vs consistency.

CP systems (Spanner, etcd, ZooKeeper, MongoDB with majority writes): every read sees the most recent committed write. Useful for configuration, locks, leader election. Slower under contention.

AP systems (DynamoDB eventual, Cassandra, Riak): read may see stale data, but the system stays up under partition. Useful for shopping carts, social feeds, anything where stale reads are recoverable.

The interviewer wants to hear:
- Which guarantee does THIS feature need? Account balance = CP. "People you may know" = AP.
- What's the staleness window in your AP store? Single-digit seconds is fine for feeds, terrible for billing.
- Read-your-own-writes consistency is the cheap middle ground — pin reads to the same replica that took the write.

Quorum reads/writes (R + W > N) give tunable consistency. Cassandra exposes this directly. Most app developers should pick LOCAL_QUORUM and never touch the knob again.`,
      },
    ],
  },
  {
    key: 'behavioral',
    title: 'Behavioral',
    description: 'Stories you tell about yourself, structured for any professional conversation.',
    topics: [
      {
        slug: 'star-method',
        title: 'STAR — structuring your stories',
        summary: 'Situation, Task, Action, Result. The standard frame the interviewer is grading you against.',
        estimatedMinutes: 10,
        body: `Every behavioral question is asking for a story. STAR forces you to land all four parts so the interviewer can score you cleanly.

S — Situation: 1–2 sentences of context. What was the company, the team, the timeframe, what was at stake. Don't ramble — interviewers want enough to follow, not the org chart.

T — Task: what specifically were you responsible for? "I was the only backend engineer on a 4-person team" is more useful than "we needed to ship a feature." This is where the interviewer separates owners from passengers.

A — Action: the bulk of the answer (60% of your time). What did YOU do, what was the alternative, why this approach. Use "I", not "we" — interviewers downgrade candidates who talk about team actions instead of personal ones.

R — Result: quantified if possible (latency dropped X%, $Y saved, N users), reflected on if not. End with what you learned — even successful stories should have a "what I'd do differently" beat to show self-awareness.

Time budget: 90 seconds for short questions, 3 minutes max for big ones. Practice with a stopwatch — most candidates blow past 5 minutes and lose the room.`,
      },
      {
        slug: 'tell-me-about-yourself',
        title: '"Tell me about yourself"',
        summary: 'The first 90 seconds set the frame for the whole conversation.',
        estimatedMinutes: 8,
        body: `This isn't an autobiography — it's a pitch. Three beats, 90 seconds total:

1. Who you are now (15s). Current role, team, what you ship. "I'm a senior backend engineer at X, working on the payments platform team."

2. The arc that got you here (40s). Two or three stops, picked to align with the job you're interviewing for. If interviewing for a distributed-systems role, lean on the projects where you scaled something. If interviewing for a startup, lean on the projects where you wore many hats. Don't recite your resume — they have it.

3. Why this role, why now (35s). Connect what you've done to what they're hiring for. "I want to go deeper on real-time systems, and your team is shipping the kind of low-latency ingestion I've been studying — that's why I reached out."

What to avoid: starting with your hometown, your college major, your high school. The interviewer wants context for the next 45 minutes, not your life story.`,
      },
      {
        slug: 'conflict-stories',
        title: 'Disagreement & conflict stories',
        summary: 'How you talk about disagreement reveals more than how you talk about success.',
        estimatedMinutes: 12,
        body: `"Tell me about a time you disagreed with a coworker / your manager." The trap is to pick a story where you were obviously right and your coworker obviously wrong — that lands as inflexible.

Pick a story where:
- The stakes were real (a technical decision that affected a customer or shipped product).
- The other person had a genuine point.
- You changed your mind, OR you persuaded them, OR you escalated and accepted the outcome.

Structure
- Frame the disagreement neutrally: "We were debating whether to add a cache between service A and service B. I argued yes, my staff engineer argued no."
- Show how you sought to understand their reasoning — read their RFC, asked questions, pulled in data.
- Describe the resolution mechanism. "We agreed to spike both for a week and pick based on p99 latency." Mechanisms beat opinions.
- End with what you learned, especially if you were wrong. "Their concern about cache invalidation was correct — we ended up not caching."

Avoid stories about disagreements that turned personal, or where leadership / HR got involved. Those signal you're hard to work with even if you weren't.`,
      },
      {
        slug: 'leadership-without-authority',
        title: 'Leadership without authority',
        summary: 'How to show senior-level impact when you don\'t have direct reports.',
        estimatedMinutes: 11,
        body: `Senior+ interviews always probe leadership, but most ICs don't manage people. The question is whether you've moved a team without being its boss.

What counts
- Driving a multi-team initiative (you wrote the proposal, got buy-in, shipped it).
- Mentoring more junior engineers — concrete examples of unblocking someone.
- Owning an oncall rotation, post-mortem culture, or code-review standards.
- Leading a migration / refactor that crossed team boundaries.

What doesn't count
- "I was the tech lead on a 3-person sprint" — too small, doesn't differentiate.
- "I gave a tech talk" — speaking is leadership-adjacent, not leadership.
- "I trained the new grad" — table stakes, not a story.

Frame the story around the *system* you built or the *practice* you established, not the heroic individual contribution. "I noticed we shipped four near-identical Slack notifiers in six months, so I proposed a shared library, wrote an RFC, paired with three teams during adoption, and it's now used by 12 services." That's leadership without authority — concrete artefact, measurable adoption, multi-team.`,
      },
      {
        slug: 'failure-stories',
        title: 'Failure stories',
        summary: 'They are checking for self-awareness, not screening out people who have failed.',
        estimatedMinutes: 10,
        body: `"Tell me about a time you failed." Two failure modes when answering: (1) the humblebrag fake-failure ("I worked too hard"), (2) the genuine failure that makes the interviewer wince.

Pick a failure that:
- Was clearly your call (not "the project failed because leadership shifted priorities").
- Had a meaningful consequence (a delayed launch, a service outage, a lost customer).
- Has a clean lesson you've since acted on.

Structure
- Own the call directly. "I made the wrong technical choice — I picked a NoSQL store for a workload that needed transactions, and we paid for it for two years."
- Explain why you made the call (so it's clear you were reasoning, not negligent).
- Describe the consequence honestly. Don't soften it.
- Show what changed in how you make decisions now. The interviewer is checking for growth, not penance.

Don't pick a story where the lesson is "I should have followed the established process." That signals you're willing to let outcomes slide as long as you have process cover.`,
      },
      {
        slug: 'questions-to-ask',
        title: 'Questions to ask back',
        summary: 'The questions you ask reveal what you actually care about — they are graded too.',
        estimatedMinutes: 9,
        body: `Have 6+ questions ready, pick 2–3 per round based on who's interviewing.

Ask the hiring manager
- "What does success look like for this role at the 6-month mark?"
- "What's the biggest challenge facing the team right now?"
- "How does the team make decisions when there's disagreement on a technical direction?"

Ask the senior engineer
- "What's the most frustrating part of the codebase right now, and what would it take to fix?"
- "How do you onboard new engineers — what do they typically get stuck on?"
- "What's the deployment frequency for this service? How long from PR open to production?"

Ask the cross-functional partner (PM / designer)
- "What's the typical lifecycle from idea to shipped feature here?"
- "How much engineer input shapes the product roadmap?"

Ask the recruiter or hiring committee chair
- "What's the timeline for next steps?"
- "Is there anything in my background you'd like me to clarify?"

Don't ask things you can find on the website (mission, products, headcount). Don't ask compensation in technical rounds — wait for the offer call. Always have one question ready that signals you've thought about the role specifically — generic questions get generic energy back.`,
      },
    ],
  },
  {
    key: 'company',
    title: 'Company-specific notes',
    description: 'How different companies set their bar, and how to study for each.',
    topics: [
      {
        slug: 'amazon-leadership-principles',
        title: 'Amazon — Leadership Principles',
        summary: 'The 16 LPs are graded explicitly. Have a story for each.',
        estimatedMinutes: 18,
        body: `Amazon interviewers fill out a rubric tied to specific Leadership Principles. Each principle gets a "data point" — a story you told that they map to Strong Yes / Yes / No / Strong No on that LP.

Most-asked LPs (cover these first)
- Customer Obsession
- Ownership
- Invent and Simplify
- Are Right, A Lot
- Bias for Action
- Deliver Results
- Earn Trust
- Dive Deep

Less-asked but still graded
- Learn and Be Curious
- Hire and Develop the Best
- Insist on the Highest Standards
- Think Big
- Frugality
- Have Backbone; Disagree and Commit
- Strive to Be Earth's Best Employer (relatively new)
- Success and Scale Bring Broad Responsibility (relatively new)

Build a 2-D matrix: LPs as columns, your stories as rows. Each story should hit 2–3 LPs. You want at least one story per LP, and your strongest 6–8 stories should cover 12+ LPs between them.

Use STAR. Quantify the result. Use "I" not "we." Pick stories where the stakes were real — "I fixed a bug" doesn't land. "I noticed our checkout was failing for 2% of EU users due to a currency rounding bug, traced it to a third-party tax service, drove a workaround in 48 hours" lands.`,
      },
      {
        slug: 'google-engineering-excellence',
        title: 'Google — engineering excellence + scope',
        summary: 'Coding rigor, system design at scale, "Googleyness".',
        estimatedMinutes: 15,
        body: `Google interviews lean heavily on coding correctness + edge cases. Three signals they grade:

1. Coding (2–3 rounds). Write production-quality code on a whiteboard or shared editor. Edge cases and error handling matter. Variable names matter. The interviewer is taking notes on your code style, not just the algorithm. Talk through your reasoning before you write — silence is graded as "thinking unclear."

2. System design (1–2 rounds for L4+). Scale numbers are real: assume Google-scale traffic. They want to hear about sharding, replication, cache invalidation, monitoring. Also strongly weighted: API design, data modeling, identifying the right storage primitive (Spanner vs Bigtable vs Colossus). Don't bring up specific Google internal systems unless invited — say "I'd use a globally-consistent SQL store like Spanner" rather than "I'd use Spanner."

3. Googleyness + leadership (1 round). Behavioral. Specific things they probe: navigating ambiguity, working across teams, dealing with disagreement, growth mindset. Not the same as Amazon LPs — less rubric-driven, more conversational, but the interviewer is still grading on specific signals.

Hiring committee makes the final call from packet, not the interviewers. Each round needs to land cleanly on its own — interviewers can't "vouch for you" outside their packet.`,
      },
      {
        slug: 'meta-product-engineering',
        title: 'Meta — product + execution speed',
        summary: 'Coding rigor + product sense + the bar for shipping.',
        estimatedMinutes: 14,
        body: `Meta (Facebook) interview signals are coding, system design, and behavioral — same shape as Google but with a heavier emphasis on shipping speed and product instincts.

Coding (2 rounds, 2 problems each, 45 min). Aim for one problem per 20 min including talking through. Edge cases probed hard — interviewer will silently watch for missed null/empty/single-element cases. They're as much testing your communication while coding as the algorithm itself.

System design (1 round, 60 min). Lean toward product systems (news feed, messenger, notifications) over infra (search, payments). Scale numbers always assume Meta-scale (billions of users). They want to hear about feed ranking, push fan-out, real-time updates, mobile constraints. Don't get stuck on database choice — pick one quickly and move on.

Behavioral (1 round). Two themes they probe: (1) "move fast" — when did you ship something quickly under uncertainty, (2) "impact" — quantified results from your work. Stories with clean before/after metrics land best. Stories where you blocked on perfectionism are red flags.

For senior+ (E5+): expect a "tell me about a project" round that goes deep into one project for 30+ minutes. They'll probe technical decisions, tradeoffs, what you'd change. Pick a project where you had real ownership and can defend every choice.`,
      },
      {
        slug: 'startup-conversations',
        title: 'Startups — generalist signal + culture fit',
        summary: 'Less rubric, more "would I want to work with you tomorrow."',
        estimatedMinutes: 12,
        body: `Startup interviews vary wildly by stage. Three rough buckets:

Seed / Series A (founders interviewing). Founder bandwidth is the constraint. They want to know: can you ship without supervision, will you wear non-engineering hats when needed, do you understand the business. Coding rounds are loose; system design is "tell me how you'd build X for our use case."

Series B / C (early structure). They have engineers who interview. Standard coding + system design but smaller scope (don't design Twitter, design our actual system). Behavioral focuses on "have you operated without process" since they don't have much yet.

Series D+ / pre-IPO. Looks more like Google/Meta. Some have full leveling and rubrics. Coding bar approaches FAANG.

Common signals across stages
- Curiosity about the company (have you read the blog, tried the product, read the founders' Twitter).
- Generalist instinct (can you debug across the stack, do you have opinions on product decisions).
- Energy level. Startup interviewers downgrade candidates who seem to be "just looking for a job."
- Honesty about what you don't know. The "I don't know but here's how I'd find out" answer beats a confident wrong answer every time.

Comp negotiation is often more flexible than at FAANG — equity slices and titles are negotiable. Cash usually isn't.`,
      },
      {
        slug: 'late-stage-companies',
        title: 'Late-stage / pre-IPO companies (Stripe, Databricks, etc.)',
        summary: 'Rigor of FAANG with the urgency of a startup.',
        estimatedMinutes: 13,
        body: `Late-stage private companies (Stripe, Databricks, Anthropic, OpenAI, Notion, Figma in earlier days) have the strictest interview bars in the industry — often more selective than FAANG.

What's similar to FAANG
- Multi-round technical loop (4–6 rounds).
- System design at scale.
- Behavioral with specific signals (varies by company).

What's different
- Coding problems are often longer and more open-ended. Stripe's API design round, Databricks' performance debugging round, Anthropic's research-engineering round — these are 90+ minute deep dives.
- Pair-programming round on a real codebase. They're testing whether you can navigate unfamiliar code, ask the right questions, and make sound changes.
- Take-home assignment in some cases (24–72 hours). Treat as a serious commitment — sloppy take-homes get rejected cleanly.
- Onsite (or "virtual onsite") usually includes lunch / coffee with future teammates that IS being graded, even if "informal."

Comp at late-stage privates often uses tender-offer or annual liquidity windows, not RSU vests like public companies. Confirm liquidity terms before negotiating equity heavily.

Specific to AI labs (OpenAI, Anthropic, DeepMind): expect a research round even for ML engineering roles. They probe whether you can read recent papers and have opinions on the field. "I read the Constitutional AI paper, here's what I found surprising" lands much better than "I've used the API."`,
      },
      {
        slug: 'remote-and-async',
        title: 'Remote / async-first companies (GitLab, Zapier, Shopify)',
        summary: 'They hire for written communication and self-direction.',
        estimatedMinutes: 11,
        body: `Async-first companies grade on dimensions FAANG doesn't probe heavily.

Written communication (graded constantly).
- Application essays often replace cover letters. Treat them as an interview round, not a formality.
- Take-home + written write-up is common. The write-up is graded as much as the code.
- Async interviews (Loom recording instead of live call) for some rounds. Practice your delivery.

Self-direction (asked explicitly).
- "Tell me about a project you scoped and shipped end-to-end without daily oversight." This is a screening question — if you don't have one, the rest of the loop won't go well.
- "How do you stay productive without an office?" Have a real answer (not "I'm just disciplined") — concrete habits, tools, signals you use.

Cross-timezone collaboration.
- "How do you handle disagreement when you can't get on a quick call?" The answer they want involves writing a doc, sharing it async, giving people 24+ hours to react.
- Long-form ADRs (Architecture Decision Records) are common. If you've written one, mention it.

Remote loops are often shorter (3–4 rounds) than in-office FAANG (6–8). But each round goes deeper. Expect long pauses while interviewers take notes — that's not awkwardness, that's the format.`,
      },
    ],
  },
];

export function findCategory(key: string): Category | undefined {
  return CATEGORIES.find(c => c.key === key);
}

export function findTopic(categoryKey: string, topicSlug: string): Topic | undefined {
  return findCategory(categoryKey)?.topics.find(t => t.slug === topicSlug);
}
