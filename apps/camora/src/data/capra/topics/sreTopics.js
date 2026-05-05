// Site Reliability Engineering — interview prep topics.
//
// Sourced from primary references only — every topic carries a
// `references` array of URLs. Quotes attributed verbatim from:
//   • Google SRE Book      — https://sre.google/sre-book/
//   • The SRE Workbook     — https://sre.google/workbook/
//   • OpenTelemetry, Prometheus, Loki, Tempo, Honeycomb, Cilium,
//     Argo CD, Flux, Kubernetes, AWS Well-Architected, GCP, Azure docs
//   • Sridharan, Majors, Wilkie, Gregg (canonical observability voices)
//
// Diagrams are landscape Graphviz PNGs at /diagrams/sre/*.png; the
// matching gen script lives at apps/camora/scripts/gen-sre-diagrams.py.

export const sreCategories = [
  { id: 'foundations',   name: 'SRE Foundations & Principles',   icon: 'book',         color: '#3b82f6' },
  { id: 'reliability',   name: 'System Reliability',             icon: 'shield',       color: '#22c55e' },
  { id: 'observability', name: 'Observability & Monitoring',     icon: 'activity',     color: '#06b6d4' },
  { id: 'incidents',     name: 'Incident Management & Response', icon: 'alertTriangle', color: '#ef4444' },
  { id: 'automation',    name: 'Automation & Toil Reduction',    icon: 'zap',          color: '#f59e0b' },
  { id: 'capacity',      name: 'Capacity Planning & Performance', icon: 'trendingUp',  color: '#8b5cf6' },
  { id: 'patterns',      name: 'Reliability Patterns',           icon: 'gitBranch',    color: '#ec4899' },
  { id: 'oncall',        name: 'On-call & SRE Operations',       icon: 'clock',        color: '#14b8a6' },
  { id: 'security',      name: 'Reliability + Security',         icon: 'lock',         color: '#6366f1' },
];

export const sreTopicCategoryMap = {
  // Foundations
  'sre-what-is-it':            'foundations',
  'sli-slo-sla':               'foundations',
  'error-budgets':             'foundations',
  'risk-velocity-tradeoff':    'foundations',
  'toil-50-percent-cap':       'foundations',
  'critical-user-journeys':    'foundations',
  'aspirational-vs-enforced':  'foundations',
  // Reliability
  'high-availability':         'reliability',
  'disaster-recovery':         'reliability',
  'rto-rpo':                   'reliability',
  'multi-cloud-active-active': 'reliability',
  'scaling-bottlenecks':       'reliability',
  'performance-optimization':  'reliability',
  'distributed-consensus':     'reliability',
  // Observability
  'three-pillars':             'observability',
  'red-use-golden-signals':    'observability',
  'sli-types':                 'observability',
  'modern-observability-stack':'observability',
  'logging-best-practices':    'observability',
  'distributed-tracing':       'observability',
  'alerting-philosophy':       'observability',
  'dashboards-design':         'observability',
  'cardinality-cost':          'observability',
};

export const sreTopics = [
  // ─────────────────────────────────────────────────────────────────────
  // A. SRE Foundations & Principles
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'sre-what-is-it',
    title: 'What is SRE? Origins, Definition, vs DevOps',
    icon: 'book',
    color: '#3b82f6',
    questions: 4,
    description: 'The Treynor definition, the relationship to DevOps, and the eight SRE principles.',
    introduction: `Site Reliability Engineering (SRE) was created at Google in 2003 by Ben Treynor Sloss. Treynor's one-line definition — quoted verbatim across the SRE Book — is "what happens when you ask a software engineer to design an operations team." That framing is load-bearing: SRE is not "ops with code on the side." It's an engineering discipline whose product happens to be production reliability.

The relationship to DevOps is best summarised by the SRE Workbook's chapter title: \`class SRE implements interface DevOps\`. DevOps is the broad cultural philosophy (no silos, change should be gradual, accidents are normal, measurement is crucial); SRE is one prescriptive implementation of that philosophy with opinionated, measurable artifacts: SLOs, error budgets, a 50% toil cap, blameless postmortems.

The eight SRE principles you should be able to recite: (1) operations is a software problem; (2) manage by SLOs, not by uptime; (3) minimize toil (the 50% cap); (4) the wisdom of production (be near it, not above it); (5) automate this year's job away; (6) move fast by reducing the cost of failure; (7) share ownership with developers; (8) use the same tooling regardless of function.`,
    whenToUse: [
      '"Tell me about SRE" — opens with Treynor\'s definition, then differentiates from DevOps',
      'Distinguishing SRE from a renamed-ops team — point at SLO-with-consequences as the test',
      'Justifying the 50% cap to skeptical product or engineering leadership',
      'Explaining why SREs write code and have SWE-tier hiring bars',
    ],
    keyConcepts: [
      { term: 'SRE', definition: '"What happens when you ask a software engineer to design an operations team." (Ben Treynor Sloss, Google)' },
      { term: 'DevOps', definition: 'The cultural philosophy SRE implements (no silos, gradual change, blameless culture, measurement).' },
      { term: '50% cap', definition: 'Hard ceiling on aggregate ops work per SRE; the rest must be engineering that reduces future toil.' },
      { term: 'Wisdom of production', definition: 'SRE staffing pattern: 50–60% standard SWEs + 40–50% engineers with deep UNIX/networking. Both write code; both go on-call.' },
      { term: 'class SRE implements interface DevOps', definition: 'SRE Workbook Ch 1 framing — DevOps is the interface, SRE is one concrete class implementing it.' },
    ],
    pitfalls: [
      'Confusing SRE with "ops with a Slack channel" — without SLOs and an error-budget policy, it isn\'t SRE.',
      'Renaming ops to "SRE" (or "DevOps") to fix a culture problem.',
      'Assuming SRE only works at Google scale — Workbook Ch 20 explicitly rejects this.',
    ],
    keyQuestions: [
      {
        question: 'Define SRE in one sentence and contrast it with DevOps.',
        answer: `SRE is **"what happens when you ask a software engineer to design an operations team"** — Ben Treynor's verbatim definition. DevOps is a *philosophy* (no silos, accidents are normal, measurement is crucial); SRE is one *prescriptive implementation* of that philosophy with opinionated artifacts: **SLOs with consequences**, the **50% toil cap**, **blameless postmortems**, **error budgets** that gate launches.

The Workbook formalises the relationship as **\`class SRE implements interface DevOps\`** — DevOps is the interface, SRE is one concrete class. You can do DevOps without SRE; you cannot do SRE without DevOps.`,
      },
      {
        question: 'What\'s the 50% rule and why does it exist?',
        answer: `**50% of an SRE\'s aggregate operational work is the cap; the remaining 50% must be engineering** that reduces future toil. It exists for three reasons:

1. **Prevents devolution to traditional ops** — without the cap, the easiest path is to absorb every page and ticket, which scales linearly with service growth. Engineering investment is the only way to break that linear curve.
2. **Career development** — SREs with software-engineering backgrounds will leave a team that becomes 90% ticket-shoveling. The cap is a retention mechanism.
3. **Forces automation** — when on-call burns through the cap, leadership *temporarily hands paging duties back to dev teams* until the SRE team recovers. That\'s the relief valve, and it\'s by design.`,
      },
      {
        question: 'Why does SRE care so much about reliability vs feature velocity, instead of just maximising uptime?',
        answer: `Because **100% is the wrong reliability target** (verbatim, SRE Book Ch 3). Three reasons:

- **Opportunity cost**: every additional 9 of reliability comes at non-linear engineering cost. Past the user\'s perceptible threshold, you\'re spending money that produces no business value.
- **User-side limits**: a 99.99% service running on a 99.9% smartphone is bottlenecked by the smartphone. The chain of reliability cannot exceed the weakest link.
- **Innovation tax**: maximising stability "limits how fast new features can be developed and dramatically increases costs."

The SRE response is **error budgets** — convert the dev/SRE tension into a math problem. When budget is healthy, launches proceed. When budget is depleted, freeze launches and shift to reliability work. Both teams optimise the same number; conflict disappears.`,
      },
      {
        question: 'Why is "rename our ops team to SRE" not a real adoption strategy?',
        answer: `Because the **SRE structure** is what produces the outcomes, not the title. The Workbook calls this anti-pattern out explicitly. Without:

- **SLOs with consequences** (Workbook Ch 20 principle 1) — there\'s no signal for when to ship vs when to halt;
- **The 50% toil cap** with leadership enforcement (give pages back to dev when breached);
- **Software-engineering hiring bar** for the SRE team — without code production, automation never happens;
- **Blameless postmortems** baked into the culture from day one;

…you have a renamed ops team that will collapse under the same operational load it had before. The Workbook flags "rename-and-shame" as one of the two top patterns that kill SRE adoption (the other is hiring "a DevOp" to fix culture).`,
      },
    ],
    references: [
      'https://sre.google/sre-book/introduction/',
      'https://sre.google/workbook/how-sre-relates/',
      'https://sre.google/workbook/team-lifecycles/',
    ],
  },

  {
    id: 'sli-slo-sla',
    title: 'SLI / SLO / SLA — Definitions & the Consequence Test',
    icon: 'activity',
    color: '#3b82f6',
    questions: 5,
    description: 'The three measurements every SRE conversation orbits — verbatim definitions, the differentiator test, and the canonical good/total form.',
    visualizations: [
      {
        title: 'SLI vs SLO vs SLA — measurement → target → contract',
        description: 'How an observed event becomes an SLI (measurement), gets compared to an SLO (internal target), and only sometimes graduates to an SLA (external contract with consequences).',
        image: '/diagrams/sre/a2-sli-slo-sla.png',
      },
    ],
    introduction: `These three are the most-tested SRE definitions in interviews. Get them precise; the differences are load-bearing.

From the Google SRE Book Ch 4, **verbatim**:

- **SLI (Service Level Indicator)** — *"a carefully defined quantitative measure of some aspect of the level of service that is provided."*
- **SLO (Service Level Objective)** — *"a target value or range of values for a service level that is measured by an SLI."*
- **SLA (Service Level Agreement)** — *"an explicit or implicit contract with your users that includes consequences of meeting (or missing) the SLOs they contain."*

The **differentiator test** (also verbatim from Ch 4): *"An easy way to tell the difference between an SLO and an SLA is to ask 'what happens if the SLOs aren't met?': if there is no explicit consequence, then you are almost certainly looking at an SLO."*

The Workbook (Ch 2) refines the SLI into a canonical form: SLIs are **ratios of good events to total events** — \`good_requests / total_valid_requests\` over a window. This shape has a natural error budget (\`1 − SLO\`), aggregates cleanly, and resists the "fix the average, ignore the tail" failure mode.`,
    whenToUse: [
      'Every reliability conversation starts here — get the three definitions right or the rest falls apart',
      'Designing a new service\'s reliability targets — pick CUJ → SLI spec (good/total) → SLO threshold',
      'Distinguishing internal targets (SLOs) from contractual obligations with refunds attached (SLAs)',
      'Explaining to product why "always available" is not a measurable SLO',
    ],
    keyConcepts: [
      { term: 'SLI', definition: '"A carefully defined quantitative measure of some aspect of the level of service that is provided." (SRE Book Ch 4)' },
      { term: 'SLO', definition: '"A target value or range of values for a service level that is measured by an SLI." (SRE Book Ch 4)' },
      { term: 'SLA', definition: '"An explicit or implicit contract with your users that includes consequences of meeting (or missing) the SLOs they contain." (SRE Book Ch 4)' },
      { term: 'Good / total form', definition: 'Canonical SLI shape from Workbook Ch 2: ratio of successful events to all valid events over a window. e.g. successful_http_requests / total_http_requests, or completed_grpc_calls_under_100ms / total_grpc_requests.' },
      { term: 'Differentiator test', definition: '"What happens if the SLOs aren\'t met?" — if there\'s no explicit consequence, it\'s an SLO, not an SLA. SLAs always have refunds, credits, or other defined penalties.' },
      { term: 'SLI menu by service type', definition: 'Workbook Ch 2: request-driven services → availability + latency + quality; pipeline → freshness + correctness + coverage; storage → durability.' },
    ],
    approach: [
      'Identify the Critical User Journey (CUJ) — what end-to-end task actually matters to the user?',
      'Write the SLI specification first, in good/total form, before deciding *how* to measure it',
      'Pick a threshold with stakeholder sign-off: Product (users satisfied here?), Dev (accept the velocity tradeoff?), SRE (defensible without excessive toil?)',
      'Use a 4-week rolling window (Workbook recommendation) for steady tracking + weekly summaries',
      'Use percentiles (p50/p95/p99), never means — averages hide the tail; "1% of requests might easily take 5 seconds" even when the mean is 100ms (SRE Book Ch 6)',
      'SLA target should be looser than internal SLO — gives engineering headroom before contractual penalties trigger',
    ],
    pitfalls: [
      'Setting an SLO at *current* observed performance — locks in pre-existing slop, gives no headroom for risk.',
      'Using mean latency in your SLI — hides the tail; switch to percentile histograms with exponentially-bucketed boundaries.',
      'Confusing SLI (the measurement) with SLO (the target on it) — interviewers specifically test this.',
      'Picking too many SLOs — the Workbook explicitly says fewer SLOs with better coverage beats a comprehensive list.',
      'Using absolutes like "always available" or "infinite scaling" — unmeasurable, untestable.',
    ],
    keyQuestions: [
      {
        question: 'What\'s the difference between SLI, SLO and SLA — and what\'s the test that separates SLO from SLA?',
        answer: `**SLI** = the *measurement* (a ratio: good events / total events).
**SLO** = the *target* on that measurement (e.g. 99.9% over 30 days).
**SLA** = the *contract* with consequences if the SLO is missed (refunds, credits, penalty clauses).

The canonical test from Google SRE Book Ch 4: *"What happens if the SLOs aren\'t met?"* If the answer is "we have a meeting and decide what to fix," it\'s an SLO. If the answer is "the customer gets 10% of their monthly bill back," it\'s an SLA.

Most internal services have **SLOs but no SLAs** — SLAs are explicit, expensive contracts and you don\'t hand one out unless the user is paying for it. SLAs are also almost always **looser than the internal SLO** — your internal target is 99.95% so you have headroom before the 99.9% SLA triggers refunds.`,
      },
      {
        question: 'Walk me through implementing an SLO for a brand-new web service.',
        answer: `Workbook Ch 2 gives the canonical sequence:

1. **Find the Critical User Journey** — what does the user actually try to do? Don\'t SLO the homepage if the CUJ is "complete a checkout."
2. **Write the SLI specification** in good/total form, before you decide how to measure it. e.g. \`successful_checkout_completions / valid_checkout_attempts\`. The spec is what users care about; the implementation is how you get the numbers.
3. **Pick the threshold with three-stakeholder sign-off**:
   - **Product**: Are users satisfied at this threshold? (no point at 99.99% if they\'re happy at 99.5%)
   - **Dev**: Do they accept the velocity tradeoff implied by the matching error-budget policy?
   - **SRE**: Is the threshold defensible without excessive toil?
4. **Choose the window** — 4-week rolling is the Workbook default. Weekly summaries for ops prioritisation, quarterly for strategy.
5. **Derive the error budget**: \`1 − SLO\`. For 99.9% over 4 weeks with 3M requests, that\'s **3,000 allowed errors** (Workbook\'s worked example). A single outage producing 1,500 errors burns 50% of the budget.
6. **Write the error-budget policy** that turns the budget into binding action — when to halt launches, when to resume, who escalates.

Get those six steps right and the rest of the reliability conversation has a foundation.`,
      },
      {
        question: 'Why measure with percentiles instead of averages?',
        answer: `Because **averages hide the tail**, and the tail is what users feel.

Direct quote from SRE Book Ch 6: *"if mean latency averages 100ms at 1,000 requests/second, 1% of requests might easily take 5 seconds."* The mean looks fine. The 99th percentile is catastrophic.

Standard practice (Workbook Ch 4): always look at p50 (typical case), p95 (most users feel this on a bad day), p99 (the actual tail), p99.9 (the customers who are about to leave). For SLI implementation, use **histograms with exponentially-bucketed boundaries** (factors of ~3) so the bucket layout preserves precision through the tail.

**Tom Wilkie\'s pithy version (RED method post)**: *"the RED Method is about caring about your users and how happy they are."* Caring requires looking at the slowest users, not the average user.`,
      },
      {
        question: 'I\'m told to set the SLO at "100%" — what do I say?',
        answer: `The SRE Book is unambiguous: **"100% reliability is the wrong target for basically everything."** Three reasons to push back:

1. **Cost grows non-linearly** with each additional 9. The marginal engineering investment to go from 99.99% → 99.999% is enormous.
2. **The user\'s side is the bottleneck**. The Book\'s example: *"a user on a 99% reliable smartphone cannot tell the difference between 99.99% and 99.999% service reliability."* You can\'t ship past the chain\'s weakest link.
3. **Without an error budget you can\'t ship safely**. Every change has *some* probability of incident; if your target is 100%, you have zero headroom for change. You\'re forced to choose: cap the rate of change to near-zero (kills feature velocity) or break the SLO (loses credibility).

The pragmatic answer: pick the lowest 9-count that satisfies the user, then use the resulting error budget as permission to ship. Quote Workbook Ch 2: *"100% reliability is the wrong target."* Then have the conversation about what the right target actually is.`,
      },
      {
        question: 'Who owns the SLO — SRE, dev, or product?',
        answer: `**All three, with explicit sign-off.** Workbook Ch 2 names the triad:

- **Product** owns the user-experience question: "are users satisfied at this threshold?"
- **Dev** owns the velocity question: "do we accept the launch-freeze policy that comes with this SLO?"
- **SRE/Ops** owns the operability question: "can we defend this threshold without excessive toil?"

The SRE *runs* the measurement; the SRE does *not* unilaterally set the target. If only SRE owns it, dev resents the freezes; if only dev owns it, the SLO drifts toward "whatever we already do." Three-way ownership is the structural reason error-budget policy survives organisational pressure.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/service-level-objectives/',
      'https://sre.google/workbook/implementing-slos/',
      'https://sre.google/sre-book/monitoring-distributed-systems/',
      'https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/',
    ],
  },

  {
    id: 'error-budgets',
    title: 'Error Budgets — Math, Policy, and the 4-Week Halt Rule',
    icon: 'gauge',
    color: '#3b82f6',
    questions: 5,
    description: 'How to derive the budget from the SLO, what an error-budget policy looks like, and when to actually halt launches.',
    visualizations: [
      {
        title: 'Error-budget burn rate — multi-window multi-burn-rate alerting',
        description: 'How a steady-state burn rate of 1× would just exhaust the budget over the SLO window. Faster burn rates trigger alerts at multiple severities, paired with a short window to confirm "still burning" before paging.',
        image: '/diagrams/sre/a3-burn-rate.png',
      },
    ],
    introduction: `An error budget is the operational expression of an SLO. The math is one line: **error_budget = 1 − SLO**, applied over the SLO\'s measurement window.

For a 99.9% SLO measured over a 30-day window with 3 million requests (Workbook Ch 2 worked example), the budget is **3,000 allowed errors**. A single incident producing 1,500 errors **burns 50% of the quarterly budget**. That\'s the lever.

The **error-budget policy (EBP)** is the org-level contract that turns the budget into binding action — quoted verbatim from Workbook Ch 3:

> *"If the service has exceeded its error budget for the preceding four-week window, we will halt all changes and releases other than P0 issues or security fixes until the service is back within its SLO."*

The policy is **permission**, not punishment. The Workbook is explicit: it exists *"not to serve as punishment for missing SLOs"* but rather to *"give teams permission to focus exclusively on reliability when data indicates that reliability is more important."*

Disagreements between dev and SRE on whether the budget is exhausted, or whether a particular incident counts, escalate **to the CTO**. That\'s a deliberate choice — it forces the org to take the policy seriously.`,
    whenToUse: [
      'Designing the launch-vs-reliability decision rule for a service',
      'Justifying a launch freeze to dev teams who feel the SRE is being arbitrary',
      'Sizing the impact of a single incident — "how much of the budget did this burn?"',
      'Tuning alerting thresholds via burn rate (see C8 multi-window multi-burn-rate)',
    ],
    keyConcepts: [
      { term: 'Error budget formula', definition: 'budget = 1 − SLO, applied over a rolling measurement window. For 99.9% over 30 days at 3M req: 3,000 errors allowed.' },
      { term: 'Burn rate', definition: 'How fast you\'re consuming budget vs the steady-state rate that would exhaust it exactly over the window. 1× means you\'d use it all up over 30 days; 14.4× means you\'d use 2% in 1 hour.' },
      { term: 'Error-Budget Policy (EBP)', definition: 'Org-level contract specifying what happens when the budget is exhausted. The Workbook template includes signatories, halt rules, exceptions, and escalation to CTO.' },
      { term: '4-week halt rule', definition: '"If the service has exceeded its error budget for the preceding four-week window, we will halt all changes and releases other than P0 issues or security fixes until the service is back within its SLO." (Workbook Ch 3, verbatim)' },
      { term: 'Postmortem trigger', definition: 'Any single incident that consumes >20% of the quarterly budget gets a postmortem. (Workbook Ch 3 template)' },
      { term: 'Permission, not punishment', definition: 'The framing that prevents EBP from becoming an SRE-vs-dev weapon. A team using all of its budget is doing the right thing; a team consistently *under*-spending it is being too cautious.' },
    ],
    approach: [
      'Compute the budget at SLO definition time — every SLO must yield a budget you can hand to product',
      'Track burn weekly + quarterly so the policy has signal at both cadences',
      'Write the EBP as a real document with signatories, halt conditions, exceptions, and an escalation path (Workbook provides the template)',
      'Carve out exceptions for company-wide infra outages, out-of-scope users, miscategorised errors with no actual user impact',
      'Bake P0 + security exceptions into the halt rule — production safety always trumps the policy',
      'Tie 20%-of-budget incidents to mandatory postmortems — that\'s how a single bad week gets analysed even when the overall window is healthy',
    ],
    pitfalls: [
      'Treating EBP as a weapon dev wields against SRE (or vice versa) — the framing must be permission, not punishment.',
      'No escalation path — when dev and SRE disagree on whether the budget is exhausted, you need a tie-breaker (Workbook says CTO).',
      'Halting the *wrong* changes — security fixes and P0s are explicitly carved out for a reason. A halt that blocks security pages is its own outage.',
      'Setting the policy without product sign-off — when the freeze costs revenue, product needs to have already agreed.',
      'Conflating budget *consumption* with success or failure. A team that consistently under-spends its budget is being too cautious.',
    ],
    keyQuestions: [
      {
        question: 'Walk me through the error-budget policy at a service level.',
        answer: `The Workbook template (Ch 3) has six sections:

1. **Metadata header** — Status, Author, Date, Reviewers, Approvers, Approval Date, Revisit Date.
2. **Service Overview** — what the service does and who relies on it.
3. **Goals & Non-Goals** — what the policy will and won\'t enforce.
4. **SLO Miss Policy** — the verbatim halt rule: *"If the service has exceeded its error budget for the preceding four-week window, we will halt all changes and releases other than P0 issues or security fixes until the service is back within its SLO."*
5. **Outage Policy** — handling for incidents that consume >20% of the quarterly budget (mandatory postmortem).
6. **Escalation Policy** — *"In the event of a disagreement between parties regarding the calculation of the error budget or the specific actions it defines, the issue should be escalated to the CTO to make a decision."*

Plus exceptions: outages from company-wide infra, external teams, out-of-scope users, miscategorised errors with no actual user impact.

The policy is signed by SRE lead, dev lead, and product lead — that\'s the structure that survives org pressure during a freeze.`,
      },
      {
        question: 'A team is at 110% of budget consumed. What should happen?',
        answer: `The 4-week halt rule fires: *"halt all changes and releases other than P0 issues or security fixes until the service is back within its SLO."*

Concretely:
- All non-P0 / non-security launches stop. CI/CD pipelines may still merge but deploys are gated.
- The team shifts engineering effort to reliability work — fixing the root causes of the incidents that ate the budget, paying down monitoring debt, hardening the riskiest paths.
- Product is notified — a freeze affecting a product launch means scope or timeline conversations.
- A retrospective on the period happens at unfreeze: what burnt the budget, what work cleared it, what would prevent a repeat.

If dev disagrees that the budget is actually exhausted — for example, claiming an incident was infra-wide and shouldn\'t count — escalation goes to the CTO. That\'s deliberate: forcing the executive level to make the call prevents either side from gaming the math.

Remember the framing: this is **permission for the team to focus on reliability**, not a punishment. The team using the freeze well comes out the other side with a more reliable service and a faster baseline velocity.`,
      },
      {
        question: 'My team consistently never burns more than 30% of our budget. Is that good?',
        answer: `**No — that\'s a sign you\'re being too cautious and shipping too slowly.** The error budget exists to give you permission to take risk. A team that consistently under-spends it is leaving feature velocity on the table.

Two responses:
- **Tighten the SLO** — if you\'re comfortably hitting 99.99% but the SLO is 99.9%, raise it to 99.95%. The budget shrinks, and any incident now actually impacts your ship rate. The math stays interesting.
- **Spend the budget on velocity** — accelerate launches, run more A/B tests, take more chaos-engineering risks, deprecate carefully-built fallback paths you no longer need. Use the headroom.

The Workbook is explicit on this: a healthy budget is one that gets spent. A consistently-untouched budget is a misconfiguration.`,
      },
      {
        question: 'Why is the halt rule based on a 4-week rolling window specifically?',
        answer: `The Workbook (Ch 2) recommends *"a four-week rolling window to be a good general-purpose interval."* The reasoning:

- **Long enough to absorb noise** — a single bad day shouldn\'t trigger a freeze if the rest of the month was fine.
- **Short enough to be actionable** — a quarterly window would lag too far behind real reliability problems.
- **Aligns with sprint cadences** — most teams plan in 2- or 4-week chunks, so the window matches the unit they actually plan against.

Some teams pair the 4-week window with **weekly summaries** for tactical prioritisation and **quarterly summaries** for strategy. The halt rule fires on the 4-week window; the slower windows just inform.

Critically, the window is **rolling, not calendar-based**. A team that spent its January budget can\'t reset on Feb 1 — the rolling window is still showing them in the red.`,
      },
      {
        question: 'How does an error budget interact with burn-rate alerting?',
        answer: `Burn rate is *how fast you\'re consuming the budget*, expressed as a multiple of the rate that would exhaust it exactly over the window. The Workbook Ch 5 multi-window multi-burn-rate table:

| Severity | Long window | Short window | Burn rate | Budget consumed if sustained |
|---|---|---|---|---|
| Page    | 1 hour | 5 min  | 14.4× | 2%  |
| Page    | 6 hour | 30 min | 6×    | 5%  |
| Ticket  | 3 day  | 6 hour | 1×    | 10% |

You can derive 14.4 from "consume 2% of a 30-day budget in 1 hour": **0.02 × 30 × 24 / 1 = 14.4**.

Alerts fire when **both** the long-window AND short-window thresholds are exceeded. The short window is the "still happening?" gate that drives reset time down.

Ties to budget: a 14.4× sustained burn would eat the whole 30-day budget in just over 2 days. That\'s why it pages immediately — at that rate the freeze trigger isn\'t weeks away, it\'s days. A 1× burn is the steady-state level the SLO expects; only sustained over 3 days does it justify a ticket.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/embracing-risk/',
      'https://sre.google/workbook/error-budget-policy/',
      'https://sre.google/workbook/implementing-slos/',
      'https://sre.google/workbook/alerting-on-slos/',
    ],
  },

  {
    id: 'risk-velocity-tradeoff',
    title: 'Risk vs Feature Velocity — Why 100% is Wrong',
    icon: 'trendingUp',
    color: '#3b82f6',
    questions: 3,
    description: 'The economic + UX argument for setting reliability targets below 100%, and how to make the tradeoff legible to product.',
    introduction: `Maximising reliability and maximising feature velocity are in tension. The SRE response is not to pick a winner — it\'s to make the tradeoff *quantitative* via SLOs and error budgets so both sides can negotiate against the same number.

The headline argument from SRE Book Ch 3, verbatim: *"Extreme reliability comes at a cost: maximizing stability limits how fast new features can be developed and dramatically increases costs."* And Ch 1\'s epigraph: **"Hope is not a strategy."**

The economic shape of the curve: each additional 9 of reliability costs roughly 10× the engineering investment of the previous one (this is industry rule-of-thumb, not a Google quote). Past the user\'s perceptible threshold, that investment produces no business value.

The user-side limit (Ch 3, verbatim): *"a user on a 99% reliable smartphone cannot tell the difference between 99.99% and 99.999% service reliability."* The chain of reliability cannot exceed its weakest link. Investing in five 9s on a service whose users are on flaky mobile networks just spends money to no effect.

The risk-tolerance decision is **product\'s, with SRE input** — not SRE\'s alone. Risk tolerance is a business question (how much downtime can we afford? what\'s the cost of a 30-min outage?) and SRE provides the operational reality (what\'s achievable without burning out the team?).`,
    whenToUse: [
      'Pushing back on "we need 100%" from product or executive leadership',
      'Defending the velocity tradeoff implied by a tighter SLO',
      'Sizing a service\'s SLO based on user perceptibility rather than abstract perfection',
      'Setting expectations during dependency-chain reliability conversations',
    ],
    keyConcepts: [
      { term: 'Hope is not a strategy', definition: 'SRE Book epigraph. The discipline replaces hope with measurable targets and explicit policies.' },
      { term: 'Cost of a 9', definition: 'Each additional 9 of availability costs roughly an order of magnitude more than the previous (industry rule-of-thumb). 99.9% → 99.99% is much cheaper than 99.99% → 99.999%.' },
      { term: 'Chain of reliability', definition: 'A service\'s effective reliability is bounded by the reliability of every component in the request path. A 99.99% service running on a 99.9% smartphone is a 99.9% experience.' },
      { term: 'Reliability tax on innovation', definition: 'Every reliability investment is engineering time NOT spent on features. The cost is not just dollars; it\'s velocity.' },
      { term: 'Risk-tolerance ownership', definition: 'Set jointly by product (business cost of downtime) and SRE (operational sustainability), not by SRE alone.' },
    ],
    approach: [
      'Start from the user — what reliability do they actually perceive? What\'s their network / device / geography baseline?',
      'Identify the chain of dependencies and bound your SLO by the weakest link upstream',
      'Frame the tradeoff to product as: "every additional 9 = X engineer-quarters that won\'t go to features"',
      'Use error budgets to make the tradeoff visible at every release decision, not just at SLO-setting time',
      'Revisit annually — user expectations and dependency reliability both shift over time',
    ],
    pitfalls: [
      'Setting the SLO at the maximum the team can hit on a good day — leaves zero headroom for change.',
      'Setting a tighter SLO than your hardest dependency can support — physically unachievable.',
      'Letting SRE unilaterally pick the SLO — product needs to own the velocity tradeoff explicitly.',
      'Ignoring the "perceptibility ceiling" — five 9s for a service whose users are on 3G phones is wasted spend.',
    ],
    keyQuestions: [
      {
        question: 'Why is 100% reliability not the right target?',
        answer: `Quoting SRE Book Ch 3 verbatim: **"100% is the wrong reliability target for basically everything."** Three reasons:

1. **Cost grows non-linearly.** Each additional 9 costs roughly an order of magnitude more than the previous. Going from 99% → 99.9% might cost weeks; 99.99% → 99.999% costs years and squad-equivalents. Past the user\'s perceptibility threshold, that investment produces zero business value.

2. **Users can\'t tell the difference.** Ch 3\'s example: *"a user on a 99% reliable smartphone cannot tell the difference between 99.99% and 99.999% service reliability."* The chain of reliability is bounded by its weakest link, and for most consumer products that link is the user\'s device + network, not your service.

3. **Without a budget, you can\'t ship.** Every change carries some failure probability. Targeting 100% means accepting zero change — which kills feature velocity AND, paradoxically, kills reliability (your codebase rots, dependencies go unpatched, security CVEs accumulate).

The pragmatic answer: pick the lowest 9-count that satisfies the user\'s perception, then use the resulting error budget as **permission to ship**.`,
      },
      {
        question: 'Product wants 99.999% on a service that has dependencies running at 99.9%. What do you say?',
        answer: `It\'s **physically impossible**. The chain of reliability multiplies through dependencies — quoting the SRE Book\'s framing: *"the reliability of a service can never exceed the reliability of its critical dependencies."*

Concretely: if your service makes a critical call to a 99.9% dependency, your effective availability is bounded at 99.9% no matter what you do. Adding 99.999% inside your own service is wasted engineering — every fifth nine you build is invisible to the user because the dependency takes it back.

The conversation with product:

1. Identify the critical-path dependencies and their advertised reliability.
2. Compute the achievable upper bound (multiply the availabilities together).
3. Set the SLO **below** that bound to leave error budget for *your own* failures.
4. If product genuinely needs five 9s, the work is upstream: redundancy in the dependencies, fallback paths that don\'t hit them, caching that hides their availability. Make that scope explicit.

Don\'t accept an SLO you can\'t physically meet — you\'ll spend the next year explaining why you missed it.`,
      },
      {
        question: 'How do you make the reliability-vs-velocity tradeoff legible to product or executive leadership?',
        answer: `The SRE Book\'s answer is to convert the abstract tradeoff into a **concrete number** — the error budget — and surface it at every release decision.

Three concrete framings I use:

- **"Each launch carries X% probability of impacting Y users for Z minutes."** This is the actual risk math behind every change. Make it visible.
- **"Tightening the SLO from 99.9% to 99.95% halves your error budget. That\'s roughly N% fewer launches per quarter."** Shows the velocity cost in launches, not in abstract 9s.
- **"At our current burn rate, we have W weeks of budget left this quarter. Here\'s the launch queue and which ones fit."** Makes the budget a planning tool, not just a SRE-internal metric.

The goal: product sees that SRE is not arbitrarily blocking launches — SRE is enforcing a budget that product itself signed off on. When the budget is healthy, ship. When it\'s exhausted, freeze. Both teams optimise the same number; the conflict disappears.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/embracing-risk/',
      'https://sre.google/sre-book/introduction/',
      'https://sre.google/workbook/implementing-slos/',
    ],
  },

  {
    id: 'toil-50-percent-cap',
    title: 'The 50% Toil Cap — What Counts and What Doesn\'t',
    icon: 'zap',
    color: '#3b82f6',
    questions: 4,
    description: 'The six characteristics of toil, the 50% cap as floor-on-engineering, and the four-step legacy lifecycle.',
    introduction: `Toil is the SRE\'s anti-feature. Quoting SRE Book Ch 5 verbatim:

> *"Toil is the kind of work tied to running a production service that tends to be manual, repetitive, automatable, tactical, devoid of enduring value, and that scales linearly as a service grows."*

The **six characteristics** — manual, repetitive, automatable, tactical/interrupt-driven, devoid of enduring value, scales linearly with growth — form a checklist for classifying any piece of work.

Critically, toil is **not the same as overhead**. Overhead (meetings, training, HR paperwork, goal-setting) is necessary work that doesn\'t produce production value but isn\'t toil. Grungy long-term-value work like cleaning up alert configs or migrating to a new database is also not toil — it has enduring value.

The **50% cap** is the structural mechanism that prevents an SRE team from devolving into traditional ops: aggregate operational work — *all* of it: tickets, on-call, manual tasks — must stay ≤ 50% of an SRE\'s time. The other 50% must be engineering. The Workbook treats this as **"a guarantee, not just a cap"** — a floor on engineering time, not a ceiling on ops.

When a team breaches the cap, leadership\'s response is **temporarily handing paging duties back to the dev team** until the SRE team recovers. That\'s the explicit relief valve, and it\'s a feature, not a punishment.`,
    whenToUse: [
      'Classifying a piece of work — is this toil, overhead, or engineering?',
      'Defending engineering time against operational pressure',
      'Justifying the temporary "give pages back to dev" lever when an SRE team is overloaded',
      'Designing the legacy-replacement strategy for a manual process (Avoid → Encapsulate → Replace → Retire)',
    ],
    keyConcepts: [
      { term: 'Toil', definition: '"The kind of work tied to running a production service that tends to be manual, repetitive, automatable, tactical, devoid of enduring value, and that scales linearly as a service grows." (SRE Book Ch 5)' },
      { term: 'Six characteristics', definition: 'manual / repetitive / automatable / tactical (interrupt-driven) / devoid of enduring value / scales linearly with service growth.' },
      { term: 'Toil vs overhead vs engineering', definition: 'Toil = bad, eliminate. Overhead = necessary (meetings, HR), manage. Engineering = good, invest. Cleaning alert configs is engineering, not toil — it has enduring value.' },
      { term: '50% cap', definition: 'Aggregate operational work ≤ 50% of an SRE\'s time. The other 50% MUST be engineering that reduces future toil.' },
      { term: 'Legacy lifecycle', definition: 'Workbook Ch 6: Avoidance → Encapsulation → Replacement → Retirement. The four-step pattern for replacing a manual process.' },
      { term: 'Engineer at source', definition: 'The Workbook\'s preferred remediation: fix the cause of the toil, not the symptom. Don\'t script around the bug; fix the bug.' },
    ],
    approach: [
      'Run every operational task through the six-characteristic checklist — what\'s actually toil vs overhead vs engineering?',
      'Track toil objectively: hours, tickets, patches, manual ops — pick a unit and measure continuously',
      'Apply the cost-benefit rule: automation must show time saved > time invested over its lifetime (counting morale, fewer human-error outages, less context switching)',
      'Use the Workbook\'s 10 toil-reduction strategies: engineer at source, reject the toil, use SLOs to ignore non-violating tasks, human-backed interfaces, self-service, manager support, couple to desirable goals (security/scalability), start small, increase uniformity, assess automation risk',
      'Apply the legacy lifecycle: Avoidance (don\'t do it) > Encapsulation (script around it) > Replacement (build the right thing) > Retirement (turn off the manual path)',
    ],
    pitfalls: [
      'Treating boring engineering work as toil — alert-config cleanup or migration tooling is *engineering*, not toil. The "enduring value" check is what separates them.',
      'Automating the workaround instead of fixing the cause. The Workbook is explicit: engineer at source.',
      'Letting the 50% cap drift quietly — without leadership enforcement (handing pages back to dev when breached), the cap is a wish.',
      'Conflating on-call with toil. On-call IS toil only when it\'s reactive firefighting without engineering follow-up. Pages that drive the next sprint\'s engineering are not toil.',
      'Big-bang automation projects. Start small, iterate.',
    ],
    keyQuestions: [
      {
        question: 'What\'s the difference between toil, overhead, and engineering?',
        answer: `From SRE Book Ch 5 + Workbook Ch 6:

- **Toil**: manual, repetitive, automatable, interrupt-driven, no enduring value, scales linearly. *Bad — eliminate.* Examples: running a script manually every Monday, handling non-urgent service emails, urgent-but-non-novel on-call response.
- **Overhead**: necessary work that doesn\'t produce production value but isn\'t toil. *Necessary — manage.* Examples: meetings, HR paperwork, training, goal-setting.
- **Engineering**: produces enduring value. *Good — invest.* Examples: writing automation tooling, configuring monitoring, designing for robustness, even cleaning alert configs (looks grungy but produces enduring value because the cleaner config keeps paying off).

The differentiator is **enduring value + linear scaling**. Cleaning alert configs is grungy but pays off forever. Restarting a service every Monday is also grungy but the value vanishes the next Monday.`,
      },
      {
        question: 'My SRE team is at 70% operational work. What does the Workbook say?',
        answer: `**The 50% cap has been breached and leadership has to act.** The Workbook\'s explicit response is to **temporarily hand paging duties back to the dev team** until the SRE team recovers.

That\'s not a punishment — it\'s a structural feature. Without the relief valve, the SRE team has no way to invest in the engineering that would *reduce* the operational load. They get stuck at 70%, then 80%, then 100% ops, and the team collapses.

Concretely:
1. Acknowledge the breach in a retrospective. Don\'t hide it; surface it.
2. Hand the pager back to dev for a defined period (e.g. one quarter).
3. SRE uses that quarter to engineer the toil out — automate the runbooks, fix the alert noise, kill the source bugs.
4. Post-quarter retrospective: did toil drop? If yes, take the pager back with new safeguards. If no, escalate or shrink the SRE team\'s scope.

The Workbook is explicit that this is the *correct* response, not a sign of failure. Failure is letting the cap silently rot.`,
      },
      {
        question: 'Walk me through the legacy-replacement pattern.',
        answer: `Workbook Ch 6 names four sequential strategies, each preferred over the next:

1. **Avoidance** — don\'t do the manual process at all. Often the right answer is "this work shouldn\'t exist." Question whether the underlying need is real before you script around it.
2. **Encapsulation** — wrap the manual steps in a script. Cheap, fast, but it\'s a band-aid: you\'re still running the bad process, just faster. Useful as a stopgap while you build (3).
3. **Replacement** — design and build a system that replaces the manual process entirely. This is engineering investment that pays off over the lifetime of the service.
4. **Retirement** — turn off the manual / encapsulated path so nobody can fall back to it. Without this step, the old process zombies along forever.

The interview-relevant point: **"engineer at source"** — fix the cause that *makes* the toil necessary, don\'t just script around the symptom. If you\'re manually restarting a service every Monday, the answer isn\'t a cron-runner that restarts it for you; it\'s fixing the leak that makes the restart necessary in the first place.`,
      },
      {
        question: 'How do you measure toil?',
        answer: `The Workbook\'s three-step pattern (Ch 6):

1. **Identify** via stakeholder input — survey the team, look at on-call logs, ask "what do you spend time on that you wish you didn\'t?"
2. **Pick an objective unit** — hours, ticket count, manual ops, repeated patches per week. The unit doesn\'t matter as long as it\'s consistent.
3. **Track continuously** — before, during, after any automation effort. The cost-benefit story for the next automation project lives in this data.

Sources of toil to look for (Workbook taxonomy): business processes, production interrupts, release shepherding, migrations, cost engineering & capacity planning, troubleshooting opaque architectures.

The cost-benefit rule for automation: **time saved over the automation\'s lifetime must exceed time invested in building it.** Counting indirect benefits — morale, fewer human-error outages, less context switching — is legitimate; the Workbook explicitly endorses it.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/eliminating-toil/',
      'https://sre.google/workbook/eliminating-toil/',
      'https://sre.google/sre-book/being-on-call/',
    ],
  },

  {
    id: 'critical-user-journeys',
    title: 'Critical User Journeys (CUJs) and Good/Total SLI Form',
    icon: 'users',
    color: '#3b82f6',
    questions: 3,
    description: 'How to find what to actually measure — the multi-step user task whose end-to-end success defines the service.',
    introduction: `An SLO measured at the wrong layer is worse than no SLO. A service can hit 99.99% on individual API calls while 30% of *user checkouts* fail because the calls compose into a path that breaks somewhere in the middle. The thing that matters is the **end-to-end user task**, not the per-call success rate.

The Workbook (Ch 2) names this the **Critical User Journey (CUJ)** — *"a multi-step user task whose end-to-end success is what really matters."* For an e-commerce site, the CUJ is "complete a checkout," not "API responds 200 on individual route." For a streaming service, it\'s "start watching this title within 5 seconds of clicking play," not "metadata service responds."

Once you have the CUJ, the SLI takes the canonical good/total form: \`successful CUJ completions / valid CUJ attempts\` over a window. That ratio is the actual user-visible reliability.

The SLI menu by service type (Workbook Ch 2):
- **Request-driven services** → availability, latency, quality
- **Pipeline services** → freshness, correctness, coverage
- **Storage services** → durability

Pick the dimension that maps to your CUJ\'s success criterion. A 200 OK with the wrong content is still an error if "wrong content" is what the user noticed.`,
    whenToUse: [
      'Designing the SLI for a new service — start from the CUJ, not from the API surface',
      'Diagnosing an SLO that\'s green while users are unhappy — the SLI is at the wrong layer',
      'Picking which dimension to SLO (availability vs latency vs quality vs durability)',
      'Reviewing a service\'s SLO suite — does it actually cover the user\'s end-to-end experience?',
    ],
    keyConcepts: [
      { term: 'Critical User Journey (CUJ)', definition: 'A multi-step user task whose end-to-end success is what really matters. e.g. "complete a checkout," "play a video within 5s," "load a feed under 2s."' },
      { term: 'Good / total form', definition: 'Canonical SLI shape: ratio of successful events to all valid events over a window. e.g. successful_checkout_completions / valid_checkout_attempts.' },
      { term: 'SLI specification vs implementation', definition: 'Specification = what users care about (measurement-independent). Implementation = how you actually measure it (specification + how you collect data). Write the spec first; pick the implementation second.' },
      { term: 'SLI menu by service type', definition: 'Request-driven: availability + latency + quality. Pipeline: freshness + correctness + coverage. Storage: durability.' },
      { term: 'Quality SLI', definition: '"200 OK with the wrong content" still counts as a failure if the wrong content is what the user noticed. Quality is the often-missed dimension.' },
    ],
    approach: [
      'Identify the user — who is this service for, and what are they trying to do?',
      'Trace the CUJ end-to-end — every API call, every backend hop, every dependency the user depends on for success',
      'Pick the success criterion — what makes the journey "good" in the user\'s view? (Successful return? Under N seconds? Correct content?)',
      'Write the SLI specification: \`good_journey_completions / valid_journey_attempts\`',
      'Pick the implementation — log-based, metric-based, RUM-based, synthetic — closest to where the user actually feels success/failure',
      'Validate the SLI catches the *known* user-pain incidents — if a past outage burnt the budget at the same rate users felt it, the SLI is well-calibrated',
    ],
    pitfalls: [
      'SLO\'ing individual API calls instead of the CUJ. APIs at 99.99% can compose into a 99% user experience.',
      'Measuring server-side success when the failure happens in the browser (third-party CDN, JS bundle parse error, hydration failure).',
      'Skipping quality. A 200 with empty results is success at the HTTP layer but failure at the user layer.',
      'Writing the implementation before the specification. Spec defines what users care about; implementation defines how you measure. Inverting the order locks you into measuring the wrong thing.',
      'Picking too many SLOs to cover all CUJs. Workbook explicitly favours fewer SLOs with better coverage.',
    ],
    keyQuestions: [
      {
        question: 'What\'s a Critical User Journey and why does it matter for SLO design?',
        answer: `A **CUJ** is the multi-step user task whose end-to-end success defines the service\'s value. For an e-commerce site: "complete a checkout." For a video service: "start watching within 5 seconds." For a search service: "return a relevant result for a query in under 200ms."

It matters because **per-API SLOs lie**. A checkout might call: cart-service (99.95%), inventory-service (99.95%), payment-service (99.99%), confirmation-service (99.95%). Each looks great. Multiplied: 99.95 × 99.95 × 99.99 × 99.95 = ~99.84%. About 1.6% of *checkouts* fail even though every individual service is fine.

CUJ-level SLOs catch this. They directly measure what the user feels — \`completed_checkouts / valid_checkout_attempts\`. When that drops, the budget burns even if every component is in the green.

This is why the Workbook insists you start SLO design from the CUJ, not the API surface.`,
      },
      {
        question: 'Walk me through SLI specification vs implementation.',
        answer: `**Specification** = what users care about, in plain English, *measurement-independent*.

Example spec: *"99.5% of valid checkout attempts complete successfully within 5 seconds end-to-end, measured over a 4-week rolling window."*

**Implementation** = the spec + how you actually collect the data.

Example implementations of the same spec:

- **Server logs**: \`count(checkout_complete events with success=true and duration<5000ms) / count(checkout_complete events)\` from the load balancer access logs.
- **Browser RUM**: \`count(onCheckoutSuccess fired within 5s of onCheckoutStart) / count(onCheckoutStart)\` from the JS SDK.
- **Synthetic prober**: a scripted bot performs a checkout every minute; success = "got the confirmation page within 5s."

All three measure the same spec, but each has tradeoffs:
- Server logs miss browser-side failures.
- RUM depends on user traffic; low-traffic pages have noisy data.
- Synthetic catches outages but doesn\'t reflect real user diversity.

Best practice: pick the implementation closest to where the user actually feels success/failure, with a fallback. RUM + synthetic is a common combo.

**Always write the spec first.** Inverting the order — picking the implementation first, then describing it as a spec — locks you into measuring whatever was easy, which is rarely what users care about.`,
      },
      {
        question: 'Quality is in the SLI menu but most teams skip it. Why does it matter?',
        answer: `Because **a 200 OK with the wrong content is still a failure**. The Workbook lists quality alongside availability and latency for a reason: a service can be 100% available, fast, and silently wrong.

Examples:
- A search service returns 200 OK with empty results when the index is corrupt.
- A recommendation service returns 200 OK with the *previous* user\'s recommendations because of a cache-key bug.
- A pricing service returns 200 OK with stale prices because the freshness pipeline is broken.

In each case, availability and latency look fine; the user is unhappy. A quality SLI (correctness, freshness, coverage) catches this.

Implementing quality SLIs is harder than availability — you usually need application-level checks: "is the result non-empty?", "is the price within X% of upstream?", "is the recommendation tagged for THIS user?" That difficulty is why many teams skip it. The teams that don\'t skip it catch entire classes of incidents that availability SLOs miss completely.`,
      },
    ],
    references: [
      'https://sre.google/workbook/implementing-slos/',
      'https://sre.google/sre-book/service-level-objectives/',
    ],
  },

  {
    id: 'aspirational-vs-enforced',
    title: 'Aspirational vs Enforced SLOs — When to Use Which',
    icon: 'gauge',
    color: '#3b82f6',
    questions: 3,
    description: 'The middle path between "no SLO" and "halt-the-launches SLO" — and when to graduate from one to the other.',
    introduction: `Not every SLO needs to gate launches on day one. The Workbook (Ch 2) explicitly recognises **aspirational SLOs** — targets you track but don\'t enforce. The point is to start measuring, build instrumentation, calibrate the SLI, then graduate to enforcement when the data is trustworthy.

The progression is roughly:

1. **No SLO** — service has no quantitative reliability target. (The starting state for most services.)
2. **Aspirational SLO** — target is published, measured, dashboarded; budget burn is visible; but no error-budget policy halts launches when it\'s missed. Used to gather signal and tune the SLI.
3. **Enforced SLO** — full error-budget policy with halt rules, escalation, signed by SRE/dev/product.

You graduate from aspirational to enforced when:
- The SLI implementation is trustworthy (it actually fires on real user-pain incidents and stays quiet on non-issues)
- The threshold is calibrated (not at the absolute max the team can hit on a good day, not so loose it never triggers)
- All three stakeholders have signed off on the policy
- The team has at least one quarter of clean burn data

Going straight to enforced without an aspirational period is a common failure mode. The team gets a freeze on month two from an SLI implementation that was measuring the wrong thing, dev and SRE end up shouting at each other, and the policy never recovers credibility.`,
    whenToUse: [
      'Setting up reliability targets for a brand-new service',
      'Building a new instrumentation pipeline (logs/metrics/RUM) — start aspirational while validating',
      'Service has had visible reliability issues but no SRE engagement yet — aspirational gives signal without immediate political cost',
      'Migrating from one SLI implementation to another — keep the new one aspirational until confidence is established',
    ],
    keyConcepts: [
      { term: 'Aspirational SLO', definition: 'A target tracked and dashboarded but not enforced — no error-budget policy, no launch halt. Used to validate the SLI implementation before graduating.' },
      { term: 'Enforced SLO', definition: 'A target with a binding error-budget policy. Missing it triggers documented consequences (launch halts, postmortems, etc.).' },
      { term: 'Graduation criteria', definition: 'When to promote from aspirational to enforced: trustworthy SLI, calibrated threshold, three-stakeholder sign-off, ≥ 1 quarter of clean burn data.' },
      { term: 'Three corrective paths', definition: 'When the SLI is wrong (Workbook Ch 2): tighten/loosen thresholds, improve the implementation (measure closer to the user), or downgrade to aspirational while you fix it.' },
    ],
    approach: [
      'Start aspirational by default for any new SLO',
      'Dashboard the SLO + budget burn from day one — visibility is what tunes the SLI',
      'Run for at least one quarter — long enough to see normal weekly variation, holiday spikes, deploy-day patterns',
      'At the quarter mark: was the SLI well-calibrated? Did it fire on the incidents that mattered? Stay quiet on the ones that didn\'t?',
      'If yes → graduate to enforced with full error-budget policy. If no → fix the SLI, keep aspirational for another quarter.',
      'You can also downgrade — if an enforced SLO is firing on noise, drop back to aspirational while you fix the implementation rather than gaming the threshold.',
    ],
    pitfalls: [
      'Going straight to enforced without an aspirational period — you\'ll get a freeze from a buggy SLI in week 3 and the policy will lose credibility.',
      'Staying aspirational forever — without enforcement, the SLO becomes wallpaper. Set a graduation date.',
      'Tightening the threshold during the aspirational period to "make it interesting" — the point is to calibrate against reality, not against a desired vibe.',
      'Skipping the graduation conversation with product and dev — they need to be in the room when "we\'re going from tracked to enforced" happens.',
    ],
    keyQuestions: [
      {
        question: 'When would you use an aspirational SLO instead of going straight to enforced?',
        answer: `Three scenarios where aspirational is the correct first step:

1. **New service, no historical data.** You don\'t know what reliability is achievable yet. Setting an enforced SLO based on a guess is how you get a freeze in month two from an SLI that turns out to be miscalibrated. Run aspirational for a quarter to see how the SLI behaves under real traffic.

2. **New SLI implementation.** You\'re measuring availability via a new RUM SDK, or you swapped from server logs to a tracing-based implementation. The numbers will be noisy until you tune them. Aspirational lets you validate without political cost.

3. **First SRE engagement on an existing service.** The team has visible reliability issues but has never had quantitative targets. Going from "no SLO" to "halt the launches" in week one is a culture shock that breeds resistance. Aspirational gives the team a quarter to see the data, then graduate.

In all three cases, the alternative — enforced from day one — produces a freeze on noise and the policy never recovers credibility. Aspirational is the de-risking step.`,
      },
      {
        question: 'How do you know when to graduate from aspirational to enforced?',
        answer: `Workbook Ch 2 frames this as four checkboxes:

- **Trustworthy SLI implementation** — when real user-pain incidents fire the alert, AND non-incidents stay quiet. Walk back through the past quarter\'s actual outages: did the SLI catch them? What was the false-positive rate?
- **Calibrated threshold** — not set at the absolute maximum the team hits on a good day (zero headroom), not so loose it never triggers (no signal). The aspirational period is what tunes this.
- **Three-stakeholder sign-off** — SRE / dev / product all agree on the threshold AND the error-budget policy. If product hasn\'t agreed, the freeze trigger will surface as a surprise during a launch and the policy collapses.
- **≥1 quarter of clean burn data** — a window long enough to absorb normal variation, holiday spikes, deploy-day patterns, dependency outages.

When all four are checked, write the EBP, get it signed, announce the graduation date. Until they\'re all checked, stay aspirational and keep tuning.`,
      },
      {
        question: 'My enforced SLO keeps firing on noise. What should I do?',
        answer: `**Downgrade it back to aspirational while you fix it.** The Workbook gives three corrective paths (Ch 2):

1. **Tighten or loosen the threshold** — if it\'s firing on noise that doesn\'t correspond to real user pain, the threshold is too tight. If it\'s missing real incidents, too loose.
2. **Improve the implementation** — measure closer to the user. Maybe you\'re measuring at the load balancer when the failure happens in the browser. Maybe you\'re aggregating across regions when the user only feels their own region.
3. **Make it aspirational while you fix it** — the policy escape hatch.

The wrong answer is to **game the threshold to stop the noise**. That destroys the policy\'s credibility — dev learns "if SRE doesn\'t like the freeze, they just move the goalposts," and the next freeze will be ignored.

Concretely: announce in the next reliability review that the SLO is going aspirational pending calibration, document why, set a graduation deadline. The team gets relief; the policy keeps its credibility; the SLI gets fixed properly.`,
      },
    ],
    references: [
      'https://sre.google/workbook/implementing-slos/',
      'https://sre.google/workbook/error-budget-policy/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // B. System Reliability (HA, fault tolerance, DR, scaling, multi-cloud)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'high-availability',
    title: 'High Availability — Redundancy Patterns and the Math',
    icon: 'shield',
    color: '#22c55e',
    questions: 4,
    description: 'N+1, N+2, the redundant-component formula, and why a single 99.9% box stays a single 99.9% box.',
    visualizations: [
      {
        title: 'High Availability — N + spares',
        description: 'Three serving replicas behind a load balancer with one (N+1) or two (N+2) idle spares. The math next to it: redundant 99.9% components multiply into 99.9999%.',
        image: '/diagrams/sre/b1-redundancy.png',
      },
    ],
    introduction: `High availability is *not* "buy a more reliable box." A single 99.9% server is a 99.9% server. The only way to push availability past the per-component reliability is **redundancy + automated failover**, and the math is unforgiving.

The formula from the AWS Well-Architected Reliability Pillar:

- **Hard-dependency math** — components in series multiply their availabilities. Three independent 99.99% components in a request path = 99.99³ ≈ 99.97% effective.
- **Redundant-component math** — components in parallel reduce failure exponentially. \`Avail = 1 − failure_rate^N\`. Two redundant 99.9% replicas → 1 − 0.001² = **99.9999%**. The duplication is what buys the 9s.

The canonical patterns:

- **N**: minimum replicas needed to serve normal load. No redundancy — one replica failure = capacity loss.
- **N+1**: one spare. Tolerates one replica failure with no capacity loss. Industry baseline.
- **N+2**: two spares. Tolerates a failure *during a maintenance window* (one replica out for upgrade, another fails) without capacity loss. Required for tight SLOs.

What makes redundancy actually work (the SRE Book\'s Ch 23 caution): the components must have **independent failure domains**. Two replicas in the same rack share power, network, cooling, and noisy neighbours. They\'re not really independent. Redundancy across availability zones, regions, and providers is what produces the math you actually want.`,
    whenToUse: [
      'Designing for an SLO above ~99.95% — single-machine reliability won\'t reach it',
      'Writing the capacity-planning doc — N+1 is the floor, N+2 for any meaningful SLO',
      'Justifying multi-AZ / multi-region cost to product or finance',
      'Reviewing an architecture proposal — does the redundancy actually have independent failure domains?',
    ],
    keyConcepts: [
      { term: 'Hard-dependency math', definition: 'Components in series: Avail = ∏ Avail_i. Three 99.99% deps → 99.97% effective. Series chains REDUCE availability.' },
      { term: 'Redundant-component math', definition: 'Components in parallel: Avail = 1 − failure_rate^N. Two 99.9% replicas → 99.9999%. Parallel INCREASES availability — this is why redundancy works.' },
      { term: 'N / N+1 / N+2', definition: 'N = minimum replicas. N+1 = one spare (tolerates one failure). N+2 = two spares (tolerates failure during maintenance). Industry baseline is N+1; tight SLOs need N+2.' },
      { term: 'Independent failure domain', definition: 'Two redundant components must not share power, network, cooling, software bugs, or operator error. Two replicas in one rack are NOT independent.' },
      { term: 'AWS availability table (canonical)', definition: '99% = 3d 15h/yr · 99.9% = 8h 45m · 99.95% = 4h 22m · 99.99% = 52 min · 99.999% = 5 min downtime per year.' },
    ],
    pitfalls: [
      'Redundancy without independent failure domains. Two replicas behind one switch fail together when the switch fails.',
      'Forgetting maintenance windows. With only N+1, taking a replica out for upgrade leaves zero spares — a single failure during upgrade is an outage.',
      'Counting replicas without counting writes. Read replicas multiply read availability; the write-master is still a SPOF unless you have multi-master / consensus.',
      'Adding redundancy below the SLO\'s critical dependency. A 99.99% service with a 99.9% required dependency is bounded at 99.9% no matter how much you replicate yourself.',
    ],
    keyQuestions: [
      {
        question: 'A service has three independent dependencies, each 99.99% available. What\'s its effective availability?',
        answer: `**99.97%** (≈3 nines, not 4).

The hard-dependency math: when components are in series — every request needs every dependency to succeed — availabilities multiply. **0.9999³ = 0.99970**.

This is why "we depend on three reliable services" is not the same as being reliable. Each dependency taxes you. To hit 99.99% effective on a service that calls three deps, the deps each need to be ≥ 99.997% — or you need to break the hard dependency (cache, fallback path, async write-behind, graceful degradation).

The framing on whiteboards: if your downstream is the bottleneck, no amount of work *inside* your service moves the number. The fix is upstream.`,
      },
      {
        question: 'Why does N+1 redundancy not always give you "two 9s more"?',
        answer: `Because the math assumes **independent failure domains**, and most real-world redundancy doesn\'t actually have them.

The formula: \`Avail = 1 − failure_rate^N\`. Two 99.9% replicas should give 1 − 0.001² = 99.9999% — *if* the replicas fail independently.

In reality:
- **Same rack** → shared power supply, top-of-rack switch, cooling. Single rack-level failure takes both out.
- **Same AZ** → shared cooling, networking, sometimes power. AZ-level events take both out.
- **Same region** → shared control plane, shared DNS, shared software dependencies. Regional events take both out.
- **Same software version** → shared bugs. A bad release rolled to all replicas takes them all out simultaneously.

For the redundancy math to actually deliver:
- Spread replicas across at least two AZs (catches single-AZ outages).
- Spread across regions for regional disaster recovery.
- Stagger software rollouts (canary first, then a cohort, then the rest) so a bad version doesn\'t take down all replicas in one push.

The SRE Book Ch 23 quote is the warning: *"two instances of your app will have common dependencies, common failure domains, shared fate, and global control planes—all of which can cause an outage in both systems, no matter how carefully it is designed."*`,
      },
      {
        question: 'When do you actually need N+2 instead of N+1?',
        answer: `**When you need to handle a failure during a planned maintenance.** The math:

- **N+1**: one replica down for upgrade leaves you at exactly N capacity. Any failure during the maintenance window = outage.
- **N+2**: one replica out for upgrade + one unplanned failure = still at N. No capacity loss.

The decision rule: if your SLO budget can\'t absorb the unavailability of "one bad upgrade window per quarter," you need N+2. Most services running tight SLOs (≥ 99.95%) end up at N+2 because:
- Upgrades happen monthly or more often.
- Each upgrade window is hours-long.
- Failure rates of ~0.1%/hour mean a non-trivial probability of a second failure during any given window.

For loose SLOs (99% or below), N+1 is usually fine — the budget can absorb the rare double-fail.`,
      },
      {
        question: 'Recite the AWS availability-to-downtime table.',
        answer: `From the AWS Well-Architected Reliability Pillar (verbatim):

| Availability | Max unavailability/year |
|---|---|
| 99% | 3 days 15 hours |
| 99.9% | 8 hours 45 minutes |
| 99.95% | 4 hours 22 minutes |
| 99.99% | 52 minutes |
| 99.999% | 5 minutes |

Memorising this is interview hygiene — interviewers will say "design for 99.99%" and expect you to know it\'s a ~52-minutes-per-year budget, which translates to a per-month budget of ~4 minutes. That tells you whether your incident response can even meet the SLO.

Also useful: the rough rule that **each additional 9 costs ~10× the engineering investment** of the previous. 99% → 99.9% is mostly redundancy + monitoring. 99.99% → 99.999% needs cell-level isolation, formal failover, no SPOFs anywhere. Past five 9s, you\'re solving problems Google has, not problems your service has.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/availability.html',
      'https://sre.google/sre-book/managing-critical-state/',
      'https://sre.google/sre-book/embracing-risk/',
    ],
  },

  {
    id: 'disaster-recovery',
    title: 'Disaster Recovery — The Four AWS Strategies',
    icon: 'lifeBuoy',
    color: '#22c55e',
    questions: 4,
    description: 'Backup-restore vs pilot-light vs warm-standby vs multi-site active-active — cost, RTO, RPO, when to pick each.',
    visualizations: [
      {
        title: 'DR strategies — cost vs RTO/RPO trade-off',
        description: 'The canonical AWS taxonomy. Each step right increases cost ~10× and decreases RTO/RPO ~10×. Pick based on the cost of downtime, not on engineering preference.',
        image: '/diagrams/sre/b2-dr-strategies.png',
      },
    ],
    introduction: `Disaster recovery is the discipline of *getting back to a working state* after a region, AZ, or whole-cloud failure. Every workload needs a DR strategy; the question is *which one*, and the answer is driven by the cost of downtime, not by engineering preference.

The AWS Well-Architected Reliability Pillar names four strategies, in increasing order of cost and decreasing order of RTO/RPO. Each is roughly 10× the cost of the previous and gives roughly 10× faster recovery.

**1. Backup and Restore (cheapest, slowest)**
Replicate data to another Region. At failover, redeploy infra/code into that Region. Verbatim AWS framing: *"replicate your data from one Region to another and provision a copy of your core workload infrastructure"* — only at the moment of disaster.
- RTO: hours to days. RPO: hours.
- Cost: $ — only data egress + storage.
- Right when: downtime tolerance is hours+ AND the workload is tolerant to data lag.

**2. Pilot Light**
Replicate data continuously. Provision and keep on the *core* infrastructure (databases, object storage). Application servers are loaded with code + config but **switched off**. AWS verbatim: *"Other elements, such as application servers, are loaded with application code and configurations, but are 'switched off.'"*
- RTO: 10s of minutes. RPO: minutes.
- Cost: $$ — pay for storage, minimal compute.
- Right when: downtime tolerance is minutes-to-an-hour AND data must survive.

**3. Warm Standby**
A scaled-down but **fully functional** copy of production in another Region. Verbatim: *"can handle traffic (at reduced capacity levels) immediately."*
- RTO: minutes. RPO: seconds.
- Cost: $$$ — running compute at reduced scale.
- Right when: downtime budget is minutes AND you can tolerate degraded capacity briefly.

**4. Multi-site Active/Active (most expensive, fastest)**
Both regions serve traffic continuously. Verbatim: *"run your workload simultaneously in multiple Regions."*
- RTO: ~0. RPO: 0 or near-0.
- Cost: $$$$ — full duplicate infrastructure.
- Right when: every minute of downtime costs more than running two copies forever.

Note: even multi-site active/active has non-zero RTO/RPO for **data corruption disasters** — you have to restore from backup regardless of how many regions are running. RTO=0 only applies to region-level failure.`,
    whenToUse: [
      'Setting an RTO/RPO target with product/finance — the choice maps directly to one of these four',
      'Reviewing a DR plan — does the strategy actually match the SLO\'s downtime budget?',
      'Cost-optimisation reviews — multi-site active/active is real money; downgrade to warm standby if RTO/RPO allows',
      'Disaster Recovery testing — different strategies need different drills',
    ],
    keyConcepts: [
      { term: 'Backup and Restore', definition: 'Cheapest. Data replicated; infra rebuilt at failover. RTO: hours-days. Cost: $.' },
      { term: 'Pilot Light', definition: '"Data replication and backup, such as databases and object storage, are always on. Other elements, such as application servers, are loaded with application code and configurations, but are switched off." (AWS verbatim)' },
      { term: 'Warm Standby', definition: '"A scaled down, but fully functional, copy of your production environment in another Region." Can serve at reduced capacity immediately. (AWS verbatim)' },
      { term: 'Multi-site Active/Active', definition: '"Run your workload simultaneously in multiple Regions." Full duplicate. RTO ≈ 0. (AWS verbatim)' },
      { term: 'RTO / RPO data-corruption caveat', definition: 'RTO=0 from active/active only covers REGION failure. Data corruption (bad code push, malicious actor) requires restore-from-backup → non-zero RTO regardless of strategy.' },
    ],
    approach: [
      'Get product/finance to put a number on the cost of downtime — $/minute, $/hour, or "we lose the customer if we\'re down longer than X"',
      'Compute the RTO budget that matches that cost — if downtime costs $100k/hour and we tolerate $200k of pain, RTO = 2 hours',
      'Pick the cheapest DR strategy that meets the RTO/RPO target',
      'Test the strategy at least twice a year via game-days. An untested DR plan is a non-existent DR plan.',
      'For active/active, *also* maintain a backup-restore path — handles data corruption that active/active cannot',
    ],
    pitfalls: [
      'Choosing multi-site active/active because it sounds best — pay 10× for capability the SLO doesn\'t justify.',
      'Building a DR plan and never testing it. The first time you find out the IAM policy is wrong is during a real disaster.',
      'Forgetting the control plane. AWS\'s automated failover features depend on regional control planes that can themselves fail. Use Route 53 ARC for data-plane failover when the control plane is down.',
      'Confusing region-failure RTO with corruption-RTO. Active/active doesn\'t protect against bad data being replicated to all regions instantly.',
      'Not maintaining the secondary. The pilot-light infrastructure has IAM, secrets, package versions that drift over time and break the failover.',
    ],
    keyQuestions: [
      {
        question: 'Walk me through the four AWS DR strategies and their trade-offs.',
        answer: `In increasing cost / decreasing RTO order:

1. **Backup & Restore** — replicate data to another Region; redeploy infra/code at failover. RTO: hours-days. RPO: hours. Cost: $. Use when: downtime tolerance is hours+, workload tolerates data lag, infra is reproducible from IaC.

2. **Pilot Light** — *data* and *core infra* always on (databases, object storage). Application servers loaded but **switched off**. RTO: 10s of minutes. RPO: minutes. Cost: $$. Use when: downtime budget is "less than an hour" and data must survive.

3. **Warm Standby** — *scaled-down but fully functional* copy in another Region. Can serve at reduced capacity immediately. RTO: minutes. RPO: seconds. Cost: $$$. Use when: downtime budget is minutes and degraded capacity briefly is acceptable.

4. **Multi-site Active/Active** — both regions serve traffic; full duplicate. RTO: ~0. RPO: 0 or near-0. Cost: $$$$. Use when: every minute of downtime costs more than the duplicate infrastructure.

Each step right is roughly 10× the cost and 10× faster recovery. Pick based on the **business cost of downtime**, not on what feels architecturally pure.`,
      },
      {
        question: 'My SLO is 99.99% (52 min/yr). What DR strategy do I need?',
        answer: `**Warm standby at minimum, possibly multi-site active/active.**

The math: 52 minutes is your annual downtime budget. A single regional incident eats it in one event. Per-month budget is ~4 minutes — too small for backup-restore (hours) or pilot-light (10s of minutes).

- **Backup and Restore** is out — RTO is hours, would blow the annual budget in one event.
- **Pilot Light** is borderline — RTO of 20 min uses 40% of the annual budget per event. Workable if you have <2 regional events/year, otherwise out.
- **Warm Standby** fits — RTO of 5 min eats 10% of annual budget per event. Multiple events tolerable.
- **Multi-site Active/Active** is the safe answer — RTO ~0 means region failure consumes effectively zero budget.

The follow-up question: how often do regions fail? AWS region failures happen, but they\'re rare (a few per year industry-wide). If your service has *other* sources of downtime (deploys, dependency outages, capacity issues), those eat the budget faster than regional disasters do. Sometimes the right answer is **warm standby + better deploys** rather than active/active + bad deploys.`,
      },
      {
        question: 'Active-active sounds best. Why isn\'t it always the answer?',
        answer: `Three reasons:

1. **It\'s ~10× the cost** of warm standby. You\'re running a full duplicate of production. For a $1M/year infrastructure bill, that\'s $9M/year for the second region. Justify against the cost of downtime.

2. **Cross-region writes are hard.** Active/active means both regions accept writes. The hard problem: how do they reconcile?
   - **Write-global** (Aurora Global DB): all writes go to one region. The "active" region for writes is single. Other regions read replicas only. Simple but loses some active/active benefit.
   - **Write-local** (DynamoDB Global Tables): writes go to the nearest region; conflicts resolved by last-writer-wins. Fast but conflict resolution is by-fiat.
   - **Write-partitioned**: partition key determines which region a row writes to. Eliminates conflicts but adds routing complexity.

   None of these is free; each has ergonomic costs.

3. **It doesn\'t protect against data corruption.** Bad code push? Replicates to all regions instantly. Active/active gives you region-failure RTO=0 but corruption-RTO is exactly the same as backup-restore. You still need backups.

The pragmatic stack: **warm standby + offline backups** is often better than **active/active + no backups**. Active/active without a backup story is a category mistake.`,
      },
      {
        question: 'How do I decide between pilot-light and warm-standby?',
        answer: `Cost-driven, with one practical filter:

- If you can tolerate **20-30 minutes** of downtime, pilot-light is enough. The "warm-up" period is how long it takes to scale application servers from zero. Fine if you have time.
- If you need **under 10 minutes**, you need warm-standby. The application servers must already be running and serving traffic at reduced scale.

Practical filter: **warm-up time is dominated by the slowest dependency**. A pilot-light environment that has to load 200GB of cache from cold start might take an hour even if the application servers boot in 30 seconds. If your service has heavy state, pilot-light\'s RTO can balloon — at which point warm-standby (which keeps the cache hot) is the right choice regardless of the headline RTO target.

Also consider: warm-standby costs roughly 30-50% of full production (you\'re scaled down but everything\'s running). Pilot-light is closer to 10-20%. The gap is real but smaller than the gap between pilot-light and backup-restore.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html',
      'https://docs.cloud.google.com/architecture/disaster-recovery',
      'https://learn.microsoft.com/en-us/azure/well-architected/reliability/',
    ],
  },

  {
    id: 'rto-rpo',
    title: 'RTO vs RPO — Definitions and Trade-offs',
    icon: 'clock',
    color: '#22c55e',
    questions: 3,
    description: 'How long until I\'m up vs how much data can I lose. The two numbers that drive every DR decision.',
    visualizations: [
      {
        title: 'RTO vs RPO timeline',
        description: 'Disaster at T0. RPO is the gap between "last good backup" and the disaster — data lost in that window. RTO is the gap between disaster and "service back online."',
        image: '/diagrams/sre/b3-rto-rpo.png',
      },
    ],
    introduction: `RTO and RPO are the two numbers every DR conversation orbits. Verbatim from Google Cloud\'s DR documentation:

- **RTO (Recovery Time Objective)**: *"How long after a disaster before I\'m up and running."*
- **RPO (Recovery Point Objective)**: *"How much data can I afford to lose in the event of a disaster."*

Different things. Easy to confuse. Get them precise.

A worked example: imagine your service has hourly database backups. At 09:30 the database is destroyed. RPO = the window between the last backup (09:00) and the failure (09:30) → **30 minutes of data lost**. RTO = the time to spin up a replacement database, restore from the 09:00 backup, redirect traffic → **say, 60 minutes**. From the user\'s perspective, the service is down for 60 minutes AND any writes between 09:00–09:30 are gone.

The numbers drive the architecture:
- **Tighter RPO** → more frequent replication / synchronous replication / streaming changelogs to a standby. The tightest RPO is "0" — synchronous multi-region replication, every write durable in two regions before the client sees ACK. That\'s expensive (RTT cost on every write) and complex (consensus protocols).
- **Tighter RTO** → warmer standby / faster failover / pre-staged infra / automated traffic shifting. The tightest RTO is "0" — multi-site active/active with traffic already split. That\'s also expensive.

Neither RTO nor RPO can be 0 without spending real money. Both can be 0 only with fully synchronous active/active multi-region — the most expensive DR posture.`,
    whenToUse: [
      'Every DR conversation — set RTO and RPO before you debate strategy',
      'Cost reviews — "we have RPO=0" is a budget claim; verify it matches what\'s actually paid for',
      'Incident retrospectives — did the actual recovery match the stated RTO/RPO?',
      'Database technology choice — sync vs async replication is an RPO decision',
    ],
    keyConcepts: [
      { term: 'RTO (Recovery Time Objective)', definition: '"How long after a disaster before I\'m up and running." (GCP) The max acceptable time from disaster to service restored.' },
      { term: 'RPO (Recovery Point Objective)', definition: '"How much data can I afford to lose in the event of a disaster." (GCP) The max acceptable gap between the last good data and the disaster moment.' },
      { term: 'Synchronous replication', definition: 'Every write durable in two regions before client ACK. RPO=0 but adds inter-region RTT to every write. Used for extremely tight RPO.' },
      { term: 'Asynchronous replication', definition: 'Writes ACK from primary; replicate to secondary in background. Cheap but RPO = replication lag (seconds to minutes typical).' },
      { term: 'Streaming changelogs', definition: 'CDC / WAL streaming to a remote store. Continuous replication with bounded lag — middle-ground RPO, cheaper than synchronous.' },
    ],
    pitfalls: [
      'Stating an RTO/RPO target without measuring actual recovery time in drills. The stated numbers and the real numbers are usually wildly different.',
      'Conflating regional-failure RPO with corruption-RPO. A bad code push replicates to all regions; corruption RPO = the time since your last clean backup, not your replication lag.',
      'Setting RPO=0 without budgeting for synchronous replication. RPO=0 with async replication is a marketing claim, not a technical one.',
      'Forgetting that DR drills must include RPO measurement. "We restored in 10 min" is RTO; what data did you lose between the disaster and the restore?',
    ],
    keyQuestions: [
      {
        question: 'Define RTO and RPO and give an example.',
        answer: `From GCP\'s DR documentation, verbatim:

- **RTO (Recovery Time Objective)**: *"How long after a disaster before I\'m up and running."*
- **RPO (Recovery Point Objective)**: *"How much data can I afford to lose in the event of a disaster."*

Example. Your DB has hourly backups. At 09:30 the database is destroyed.
- The **last good backup** is 09:00. Writes between 09:00 and 09:30 (30 min) are lost. **RPO = 30 minutes.**
- You spin up a replacement DB, restore from the 09:00 backup, redirect traffic. Total: 60 minutes. **RTO = 60 minutes.**

Two distinct measurements: how long users were down (60 min) and how much data they lost (30 min of writes). Both must hit their respective objectives.`,
      },
      {
        question: 'How do you reduce RPO toward zero?',
        answer: `Three architectural options, in order of increasing cost:

1. **More frequent backups / streaming backups.** Hourly → 5-minute → continuous CDC streaming. RPO drops from "60 min worst case" to "minutes" to "seconds."

2. **Asynchronous replication to a standby.** Every write streams to the standby with sub-second lag in the steady state. RPO = replication lag at the moment of failure, typically seconds. Used by most managed databases (RDS Multi-AZ, Cloud SQL HA).

3. **Synchronous replication.** Every write is durable on the primary AND the standby before the client gets ACK. RPO = 0. Cost: every write pays the network RTT to the standby, which limits write throughput and increases tail latency. Spanner, Aurora Global Database (with sync mode), CockroachDB use this.

The cost curve: option 1 is nearly free (just storage). Option 2 adds standby compute. Option 3 adds latency on every write — the user\'s critical path now includes a cross-DC or cross-region hop. RPO=0 is *expensive*; quote it carefully.

For most services, the right answer is option 2 (async replication, RPO of seconds) — the latency cost of RPO=0 is harder to swallow than the rare event of losing a few seconds of writes.`,
      },
      {
        question: 'Can RTO=0 and RPO=0 both be achieved simultaneously?',
        answer: `**Yes — but only with fully synchronous multi-site active/active**, which is the most expensive DR posture.

The recipe:
- Multi-region deployment, both regions serving traffic.
- Synchronous cross-region replication (every write durable in both regions before ACK).
- Traffic-management layer that fails over instantly on region health-check failure.

The costs:
- ~10× the infrastructure (full duplicate).
- Cross-region RTT on every write — adds 50-150ms to write latency.
- Conflict resolution complexity (write-global / write-local / write-partitioned).
- Operational complexity — you\'re running two production environments; both need to be at the same patch level, same secrets, same configs.

Even Spanner — Google\'s purpose-built RTO=0/RPO=0 system — requires accepting the latency cost. Most products don\'t actually need it. The standard pattern for tight-but-not-extreme requirements is **warm standby + async replication** (RTO ~5min, RPO ~seconds), which is dramatically cheaper.

Also: as called out earlier, **RTO=0 for region failure is not RTO=0 for data corruption**. Bad code push corrupts data in both regions instantly; recovery requires restore-from-backup like everyone else. RTO=0 is regional-failure-RTO.`,
      },
    ],
    references: [
      'https://docs.cloud.google.com/architecture/disaster-recovery',
      'https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/',
      'https://learn.microsoft.com/en-us/azure/well-architected/reliability/',
    ],
  },

  {
    id: 'multi-cloud-active-active',
    title: 'Multi-cloud Active-Active — Write Strategies',
    icon: 'globe',
    color: '#22c55e',
    questions: 3,
    description: 'Write-global, write-local, write-partitioned. The three real choices for cross-region writes.',
    visualizations: [
      {
        title: 'Multi-cloud active/active — write strategies',
        description: 'Global LB splits traffic by latency or percentage. Each region serves locally. The hard question is what to do with writes — three patterns from the AWS DR whitepaper.',
        image: '/diagrams/sre/b4-multi-cloud.png',
      },
    ],
    introduction: `True multi-cloud active/active is rare; most "multi-cloud" deployments are one primary cloud + one DR target. When you do go fully active/active, the hard problem isn\'t the traffic split — global load balancers (AWS Global Accelerator, GCP Global LB, Azure Front Door, Cloudflare) handle that. The hard problem is **writes**: every region accepts writes; how do they reconcile?

The AWS DR whitepaper names three strategies. None is free. Pick the one that matches your data model.

**1. Write-global** — all writes go to one Region. Other regions are read-only. The single "active for writes" region simplifies consistency (no conflicts). Used by **Aurora Global Database** and similar. The trade-off: writers in the non-primary region pay cross-region RTT.

**2. Write-local** — writes go to the nearest region. Replication is **last-writer-wins (LWW)**. Used by **DynamoDB Global Tables** and similar. The trade-off: concurrent writes to the same key in different regions silently overwrite each other based on timestamp. Acceptable for use cases where conflicts are rare or LWW is a fine resolution policy; unacceptable for critical state.

**3. Write-partitioned** — each partition key has a designated home region. All writes for that key route to its home region. Conflicts impossible; routing layer must know the partition→region mapping. Used by sharded multi-region setups. The trade-off: the routing layer becomes the SPOF; cross-partition transactions are expensive or impossible.

For the cross-region traffic management itself, three primitives:
- **Global LBs / Anycast**: AWS Global Accelerator, GCP Global LB, Azure Front Door, Cloudflare. IP-level anycast routes the user to the nearest healthy region.
- **DNS-based failover**: Route 53 with health checks; AWS ARC for **data-plane failover** (avoids dependency on the regional control plane during a regional incident).
- **CDN origin failover**: CloudFront origin failover routes around bad origins automatically.`,
    whenToUse: [
      'Every active/active design — pick the write strategy before drawing diagrams',
      'Data model reviews — does the application tolerate LWW conflicts? If no, write-local is wrong.',
      'Cost reviews of multi-cloud — multi-region write infra is the biggest line item, validate the choice',
      'Capacity planning — write-global means write capacity is bottlenecked by one region',
    ],
    keyConcepts: [
      { term: 'Write-global', definition: 'All writes to one region; others read-only. Conflict-free, cross-region writers pay RTT. e.g. Aurora Global Database.' },
      { term: 'Write-local', definition: 'Writes go to nearest region; conflict resolution by last-writer-wins. Fast but lossy on concurrent writes. e.g. DynamoDB Global Tables.' },
      { term: 'Write-partitioned', definition: 'Partition key determines write region. No conflicts, routing layer becomes SPOF. Used by sharded deployments.' },
      { term: 'Anycast / Global LB', definition: 'IP-level traffic routing to nearest healthy region. AWS Global Accelerator, GCP Global LB, Cloudflare. The transport layer; doesn\'t solve writes.' },
      { term: 'AWS Application Recovery Controller (ARC)', definition: 'Data-plane failover service. Avoids dependency on regional control plane during incidents — critical because the control plane itself can be the thing that\'s failing.' },
    ],
    pitfalls: [
      'Picking write-local without auditing whether your data model tolerates LWW. A counter or balance silently goes wrong; ledger entries get lost.',
      'Picking write-global without quantifying cross-region write RTT. Writers in the non-primary region see 100-200ms added latency on every write.',
      'Forgetting cross-partition transactions in write-partitioned. Two keys in different home regions can\'t be updated atomically.',
      'Relying on automatic regional failover. The AWS guidance: *"Automatically initiated failover based on health checks or alarms should be used with caution... If you fail over when you don\'t need to (false alarm), then you incur those losses."*',
      'Treating multi-region as if it solves data corruption. It doesn\'t. Bad code propagates instantly to every region.',
    ],
    keyQuestions: [
      {
        question: 'Walk me through the three multi-cloud write strategies and when you\'d pick each.',
        answer: `From the AWS DR whitepaper:

1. **Write-global** — all writes go to one region; others are read-replicas. **Conflict-free** (single writer source of truth). Cross-region writers pay RTT (50-200ms added latency on every write). Pick when: write conflicts are unacceptable AND most writes come from one region anyway. Example: financial ledgers, billing systems. Implemented by Aurora Global Database, Spanner.

2. **Write-local** — writes go to the nearest region; cross-region replication uses **last-writer-wins** (timestamp-based). Lowest write latency. Conflicts are silent. Pick when: writes are partitioned naturally (each user mostly writes from one region) AND occasional LWW conflicts are acceptable. Example: user profiles, social posts where concurrent edits are rare. Implemented by DynamoDB Global Tables, Cassandra multi-DC.

3. **Write-partitioned** — partition key (user_id, tenant_id, etc.) determines the home region for that key. Writes for that key always route to its home region. **Conflict-free**, full write throughput per partition. Routing layer becomes the SPOF; cross-partition transactions need 2PC or distributed transactions. Pick when: data partitions naturally (multi-tenant SaaS, B2B) AND you can avoid cross-partition transactions.

The decision tree:
- **Conflicts unacceptable?** → write-global or write-partitioned.
- **Latency-critical writes?** → write-local or write-partitioned.
- **Both?** → write-partitioned (with the routing-layer cost).`,
      },
      {
        question: 'Why is automatic regional failover dangerous?',
        answer: `Quote from AWS DR guidance: *"Automatically initiated failover based on health checks or alarms should be used with caution... If you fail over when you don\'t need to (false alarm), then you incur those losses."*

The problem: **failovers are not free**. A regional failover incurs:
- Cache cold-start in the new region.
- DNS propagation lag (TTL-bound).
- Connection-pool resets across all clients.
- Replication-lag-bound data inconsistency briefly.
- Operational paging to verify the failover landed cleanly.

If the original region was actually fine and the failover was triggered by a noisy health check or a transient blip, you\'ve taken voluntary downtime to no benefit. Worse, the "fixed" region thinks it\'s healthy too — now you have brain-split conflicts.

The pattern most enterprises use: **automatic failure DETECTION, manual failover EXECUTION**. Health checks page on-call; on-call validates the failure is real (network probes from independent vantage, status page from the cloud provider, customer reports) THEN flips the traffic. Adds a few minutes to RTO but eliminates false-positive failovers.

Critical exception: services with extremely tight RTO (sub-minute) need automatic failover. Compensate with very high health-check thresholds (sustained failure across multiple probes) and smart failover-back logic (don\'t auto-fail-back until the original region has been clean for 15+ min).`,
      },
      {
        question: 'How do you handle the regional control plane being the thing that\'s failing?',
        answer: `**Use data-plane failover services** that don\'t depend on the regional control plane.

The problem: AWS\'s automated services — Route 53 health checks, CloudWatch alarms, Auto Scaling — depend on the regional control plane. When us-east-1\'s control plane is having a bad day, those services fail or lag. Your "automated failover" stops working *exactly when you most need it*.

The fix: **AWS Application Recovery Controller (ARC)** is purpose-built for this. ARC routing controls operate via a separate data plane that doesn\'t share fate with the regional control plane. You can flip ARC controls during a regional incident even when the rest of the region is non-functional.

The pattern:
1. Build the failover *mechanism* via ARC (data-plane controlled).
2. Build the failover *trigger* via Route 53 / CloudWatch (control-plane services) — these can fail without breaking the mechanism.
3. Have an out-of-band emergency path (a manually-runnable runbook with explicit AWS API calls or CLI commands) that operates against ARC directly.

Multi-cloud is a related answer: if your DR strategy depends on AWS being up to fail over to GCP, you\'re fine. If it depends on AWS\'s control plane being up to fail away from AWS, you have a circular dependency.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html',
      'https://docs.aws.amazon.com/r53recovery/latest/dg/welcome.html',
      'https://docs.cloud.google.com/architecture/framework/reliability',
    ],
  },

  {
    id: 'scaling-bottlenecks',
    title: 'Identifying & Removing Scaling Bottlenecks',
    icon: 'trendingUp',
    color: '#22c55e',
    questions: 3,
    description: 'Amdahl\'s Law, the NALSD method, and how Google does back-of-envelope on a whiteboard.',
    introduction: `Scaling problems usually don\'t look like "we need bigger machines." They look like "this design works at 10K QPS but breaks at 100K." The bottleneck is some component whose growth pattern the original design didn\'t anticipate.

Google\'s framework for this — from SRE Workbook Ch 12 — is **Non-Abstract Large System Design (NALSD)**: *"the ability to assess, design, and evaluate large systems."* The thesis: *"all systems will eventually have to run on real computers in real datacenters using real networks."* You can\'t hand-wave the math.

The four-question loop:
1. **Is it possible?** (basic design)
2. **Can we do better?** (basic design — refine)
3. **Is it feasible?** (scale design — does it survive 10× / 100×?)
4. **Is it resilient?** (scale design — does it survive failures?)

The Workbook\'s worked example (Ch 12) is the AdWords CTR dashboard at 500K search QPS. The single-machine design fails: at 2KB per query event, that\'s **86.4 TB of data per day** before indexes. With 64GB RAM machines you\'d need 1,563 of them just for storage — and the disk I/O alone needs 2,500 disks. Iteration 2 (MapReduce) breaks the 5-minute freshness SLO. Iteration 3 (sharded LogJoiner) survives at single-DC scale. Iteration 4 (multi-DC, Paxos) handles regional failure.

The general method: **separate components by their growth pattern**. Storage grows differently from compute, which grows differently from join-state, which grows differently from replication bandwidth. Each component scales independently if you let it; merged together, the slowest component caps the whole system.

Amdahl\'s Law is the framing for one specific bottleneck: serial fraction. If 5% of your work is serial, you can\'t parallelize past 20× speedup *no matter how many cores you throw at it*. Find the serial fraction; eliminate it; repeat.`,
    whenToUse: [
      'System-design interviews — NALSD\'s four-question loop is the canonical interview answer scaffold',
      'Capacity planning — when does the current architecture stop working?',
      'Pre-launch reviews — has the design been stress-tested past expected load?',
      'Performance investigations — what\'s the actual bottleneck under load?',
    ],
    keyConcepts: [
      { term: 'NALSD (Non-Abstract Large System Design)', definition: 'Workbook Ch 12 method: "the ability to assess, design, and evaluate large systems" using actual numbers — KB per event, RTT per RPC, ops/sec per host.' },
      { term: 'Four-question loop', definition: 'Possible? Better? Feasible (at scale)? Resilient (under failure)? — the scaffolding for any system-design conversation.' },
      { term: 'Amdahl\'s Law', definition: 'Speedup limit = 1 / (serial_fraction + parallel_fraction/N). With 5% serial, max speedup is 20× regardless of N. The serial fraction is the real bottleneck.' },
      { term: 'Separate components by growth pattern', definition: 'Storage / compute / join-state / replication-BW each have their own scaling curve. Merging them creates a single slowest-growing component that caps the system.' },
      { term: 'Hot shards', definition: 'Power-law distributions are everywhere — 80% of traffic to 20% of keys. Hash partitioning alone doesn\'t solve hot shards; you need consistent hashing + bounded-load or virtual nodes.' },
    ],
    approach: [
      'Quantify the load — exact numbers, not "many." 500K QPS, 2KB/event, 86.4 TB/day.',
      'Sketch the simplest design that *might* work; immediately apply NALSD\'s feasibility math',
      'Find the bottleneck component — usually I/O or memory, occasionally CPU',
      'Separate that component into its own scalable subsystem (e.g. extract storage into a sharded service)',
      'Apply Amdahl: what\'s the residual serial fraction? Can it be eliminated or moved off the critical path?',
      'Test under realistic peak load AND under a failure of one of your dependencies',
    ],
    pitfalls: [
      'Whiteboard adequacy ≠ real-world adequacy. Quote NALSD: *"All systems will eventually have to run on real computers in real datacenters using real networks."* Numbers always.',
      'Adding more machines without checking what bottleneck you\'re actually hitting. CPU vs memory vs network vs disk — each has a different fix.',
      'Assuming uniform key distribution. Power laws are the rule; hot shards eat your cluster.',
      'Forgetting tail latency. Mean QPS at 500K can hide that p99 latency exceeds the SLO at 50K.',
      'Optimising past the bottleneck. If your DB is 5× the cost of the LB, halving the LB cost is irrelevant.',
    ],
    keyQuestions: [
      {
        question: 'How do you approach a scaling-bottleneck question on a whiteboard?',
        answer: `Use NALSD\'s four-question loop:

1. **Is it possible?** Sketch the simplest design that solves the functional problem. Don\'t scale yet.
2. **Can we do better?** Refine for clarity, separation of concerns. Still on a single conceptual machine.
3. **Is it feasible?** Apply real numbers. Storage = events/sec × bytes/event × seconds/day. Bandwidth = output rate × replication factor × cross-DC RTT. Compute = ops/sec × CPU per op. If the math doesn\'t fit in a real datacenter, decompose.
4. **Is it resilient?** What happens when a host dies? An AZ goes down? A region fails? A dependency 5×s its latency? If the system collapses on any of those, redesign.

The worked example (Workbook Ch 12 AdWords CTR):
- 500K search QPS × 2KB/event × 86,400 sec/day = 86.4 TB/day raw, ~100 TB with indexes.
- 64GB RAM hosts → 1,563 hosts just for memory; 2,500 disks for I/O.
- Iteration 1 (single machine) — fails feasibility.
- Iteration 2 (MapReduce) — fails SLO (5-min freshness).
- Iteration 3 (sharded LogJoiner) — survives at single-DC scale.
- Iteration 4 (multi-DC Paxos) — handles regional failures, ~64 machines/DC, 4 TB RAM, 256 Mbps/host.

The interview scoring: did you do real arithmetic, or did you wave hands and say "we\'ll scale horizontally"? NALSD answers score on the math.`,
      },
      {
        question: 'How does Amdahl\'s Law apply to scaling bottlenecks?',
        answer: `Amdahl\'s Law: \`Speedup ≤ 1 / (serial_fraction + parallel_fraction/N)\`.

The brutal lesson: **the serial fraction caps you regardless of N**. With 5% serial work, the max speedup is 20× no matter how many cores or replicas you throw at it.

Concretely: if 5% of every request takes a global lock or hits a central service, that 5% is serial. Adding 100× hardware moves you from 5× speedup to 19× speedup — diminishing returns instantly.

The fix is always the same: **find the serial fraction and eliminate it**. Common sources:
- A central counter / sequence generator (replace with sharded counters; reconcile periodically).
- A single write master (shard the data; route writes to the right shard).
- A cache fill / lock acquisition path that everyone hits.
- A logging or metrics pipeline that\'s synchronous in the request path (move it async).
- A schema migration that requires lock on the entire table (chunk it; use Online DDL).

The optimisation order: identify the largest serial fraction, eliminate or shard it, measure the new speedup, repeat. Stop when remaining serial fractions are below the cost of eliminating them.`,
      },
      {
        question: 'I\'ve scaled my service horizontally and one shard is overloaded. Why?',
        answer: `Almost certainly **a hot shard** caused by power-law key distribution.

Real-world key distributions are rarely uniform:
- 80% of users\' API traffic comes from 20% of users.
- 80% of feed reads are for 20% of authors.
- 80% of cache misses are for 20% of trending items.

Naive hash partitioning gives you uniform shard *count* but not uniform shard *load*. Hot shards collapse first.

Fixes:
1. **Consistent hashing + virtual nodes** — each physical node owns N "virtual" positions on the ring. Hot keys spread across many virtual nodes, statistically smoothing load.
2. **Bounded-load consistent hashing** — Vimpression\'s extension. When a shard exceeds X% of mean load, the routing layer overflows extra requests to the next replica. Caps the worst-shard load at a multiple of mean.
3. **Application-level partition splits for known hot keys** — celebrity authors get their own shard; promotional items get pre-warmed cache.
4. **Replication for read amplification** — hot read keys replicate to N shards; reads round-robin across them. Doesn\'t help writes.

For writes, the structural fix is **write-partitioning at a finer grain** (e.g. shard by user-action-timestamp instead of just user-id) or **introduce a per-shard buffer** (Kafka in front of the DB) to absorb spikes.

The diagnostic: if your monitoring shows uniform CPU across most shards but one shard at 95%, you have a hot shard. Identify the keys responsible — usually a small set — and decide whether to split, replicate, or rate-limit.`,
      },
    ],
    references: [
      'https://sre.google/workbook/non-abstract-design/',
      'https://sre.google/sre-book/handling-overload/',
      'https://sre.google/sre-book/addressing-cascading-failures/',
    ],
  },

  {
    id: 'performance-optimization',
    title: 'Performance Optimization — Latency Budgets, Caching, Deadlines',
    icon: 'zap',
    color: '#22c55e',
    questions: 3,
    description: 'Where the latency goes, where to put cache, how deadlines propagate, and the SRE Book\'s rules for not making it worse.',
    introduction: `Performance optimization is the discipline of making something faster *without* breaking it. The non-discipline is what most engineering teams do — making changes that are faster *most of the time* and creating subtle correctness or reliability issues at the tail.

The SRE Book\'s framing (Ch 21 + 22): performance isn\'t a single number. The interesting question is the **tail** — p99 and p99.9 — because that\'s what users feel. A change that improves the median by 20% but adds 5× to the p99 is usually a regression.

The canonical optimization toolkit:

**Latency budgets.** Every request has a budget — say 500ms — apportioned across components. *"DB lookup: 100ms. Cache check: 5ms. RPC fan-out: 50ms each parallel. Render: 30ms."* If you exceed any budget, you fail fast — better to return a degraded result than the right result too late. Latency budgets are how you keep a 95th-percentile-good system from becoming a 99th-percentile-bad one.

**Deadline propagation.** RPCs inherit and decrease deadlines as they descend the stack. From SRE Book Ch 22: a server doesn\'t waste cycles on a request whose caller already gave up. A typical pattern: client sets 500ms deadline, sends to A (100ms used) → A sends to B with 400ms deadline (B is now bounded). When B exceeds its budget, it fails immediately rather than completing work that\'ll be discarded.

**Caching.** Four levels, each with different cost and consistency properties:
1. **CPU cache / page cache** — free, automatic.
2. **In-process memory** — microseconds, eviction logic in your hands.
3. **Distributed cache (Redis, Memcached)** — sub-millisecond, network hop, consistency = best-effort.
4. **CDN edge** — milliseconds, geographic distribution, cache-control headers required.

Pick the level that matches the hit rate and tolerable staleness. The SRE Book\'s caution: **caches can become "capacity caches"** — load-bearing — and a cold cache after restart can prevent the service from handling normal load.

**Bimodal latency.** When 5% of requests never complete, mean latency looks fine but p99 explodes and threads exhaust. Monitor distributions, not means.

**GC death spiral** (Java case from SRE Book Ch 22): insufficient CPU → more GC → more CPU consumed → more in-flight requests → more memory pressure → more GC. The fix is usually capacity, but the diagnostic is recognizing the spiral.`,
    whenToUse: [
      'Pre-launch performance reviews — does the request budget actually add up?',
      'Latency-regression investigations — what changed at the tail, not the mean?',
      'Cache-tier design — picking which level matches the actual access pattern',
      'Production incidents involving timeouts — almost always a deadline-propagation problem',
    ],
    keyConcepts: [
      { term: 'Latency budget', definition: 'Per-request deadline apportioned across components. Sum-of-budgets ≤ total deadline; each component fails fast when over budget.' },
      { term: 'Deadline propagation', definition: 'RPCs inherit and decrease their parent\'s deadline. SRE Book Ch 22 verbatim: "RPCs inherit and decrease deadlines as they descend the stack so a server doesn\'t waste cycles on a request whose caller already gave up."' },
      { term: 'Bimodal latency', definition: '5% of requests never complete → mean looks fine, p99 explodes. Monitor distributions; mean latency hides bimodal failure.' },
      { term: 'Capacity cache', definition: 'A cache that becomes load-bearing — service can\'t handle normal load without it. Cold-start after restart is an outage. SRE Book Ch 22 warning.' },
      { term: 'Tail tolerance', definition: 'The fundamental SRE position: optimize for p99 and p99.9. Mean-improving changes that hurt the tail are regressions.' },
      { term: 'GC death spiral', definition: 'Java case: insufficient CPU → more GC → more CPU → more in-flight → more memory pressure → more GC. Diagnostic: sustained GC % > 30% under load.' },
    ],
    approach: [
      'Start with measurement — p50, p95, p99, p99.9 — never a single mean',
      'Compute the latency budget for the user-visible request; apportion across components',
      'Add deadline propagation everywhere — every RPC carries the remaining budget',
      'Identify cache opportunities by access pattern (high-hit, tolerable staleness, expensive to compute)',
      'Avoid making caches load-bearing — design for cold-start to still meet the SLO',
      'Test under failure: what happens when one component is 5× slower than expected? Does the deadline propagate? Do downstream components correctly cancel?',
    ],
    pitfalls: [
      'Optimizing the mean while regressing the tail. A change that improves p50 by 20% and worsens p99 by 50% is a regression.',
      'Adding caches without invalidation strategy. The fastest, most consistent cache hit is the one that returned wrong data.',
      'No deadline propagation. A 5-second-deadline client request fans out into RPCs that don\'t know about the deadline; downstream services keep working on requests that were abandoned upstream.',
      'Capacity caches with no warm-start. Service restart triggers a cold-cache slow-start storm that recreates the original outage.',
      'Synchronous monitoring/logging in the hot path. Pushing metrics to a remote system blocks request handling; the diagnostic adds the disease.',
    ],
    keyQuestions: [
      {
        question: 'What\'s deadline propagation and why does it matter?',
        answer: `Quote from SRE Book Ch 22: *"RPCs inherit and decrease deadlines as they descend the stack so a server doesn\'t waste cycles on a request whose caller already gave up."*

Concretely: client sets a 500ms deadline. Service A receives the request, uses 100ms. A calls service B — passes a deadline of 400ms (the remainder). B uses 200ms. B calls C with a 200ms deadline. C realises after 100ms that it\'s going to take 300ms — **C should fail fast** because the deadline is going to expire before the work completes. The user is going to see a timeout regardless.

Why it matters:
- Without propagation, downstream services keep working after the client has given up. CPU is wasted on responses no one will read. Under load, this snowballs into capacity exhaustion.
- With propagation, services proactively fail when they can\'t meet the deadline. The capacity goes to requests that *can* still succeed.
- Plus: deadlines are observable. You can monitor "% of requests that exceeded their deadline" as a leading indicator of capacity problems before they become user-visible.

Implementation: every RPC framework worth using supports it (gRPC, Thrift, custom HTTP). The discipline: set deadlines at the edge, propagate religiously, instrument deadline-exceeded as a separate error class.`,
      },
      {
        question: 'How do you decide which caching tier to use?',
        answer: `Pick by **access pattern × tolerable staleness × cost of miss**.

The four tiers, with trade-offs:

1. **CPU / page cache (free, automatic)**: Optimize for cache-friendly data layouts. Almost always worth it. No invalidation problem.

2. **In-process memory (microseconds)**: Best for small, hot data with bounded staleness tolerance. Limited to one process; restart loses it. Use when: hit rate > 80%, data fits in RAM, eviction logic is simple (LRU usually).

3. **Distributed cache (Redis, Memcached)**: Sub-millisecond, network hop, shared across instances. Best for medium data sets where multiple workers benefit. Use when: hit rate > 70%, data is seconds-stale-tolerable, network round trip is acceptable. Pitfall: a Redis outage can take down the application if cache is load-bearing.

4. **CDN edge**: Milliseconds, geographic, requires cache-control headers. Best for read-heavy public data. Use when: data is bytes-old-tolerable (minutes to hours), users are geographically distributed, content can be addressed by URL.

The SRE Book\'s caution: **don\'t make caches load-bearing**. If your service can\'t handle normal load without the cache, a cold-start (after restart, deploy, network blip) becomes an outage. Test cold-start; if it can\'t meet SLO, you\'ve built a fragile system.

For invalidation: TTL (simplest, lazy), write-through (keeps cache fresh, doubles writes), write-behind (lossy on crash). The right answer depends on what "stale" costs your users.`,
      },
      {
        question: 'What\'s bimodal latency and why does it matter?',
        answer: `Bimodal latency is when latency distribution has **two peaks** — most requests complete fast, a small fraction (often 1-5%) take dramatically longer (or never complete).

Why it\'s dangerous: **mean latency hides it**. Imagine 95% of requests at 50ms and 5% at 5000ms. Mean = 297.5ms, looks fine on a dashboard. But:
- p99 is 5000ms — half your top-1% users are seeing 5-second responses.
- The 5% that never completes consume resources (memory, threads, connections) until they timeout. Under load, those resources exhaust.
- Each "stuck" request blocks a worker thread; if you have 100 worker threads and 5 stuck, you\'re running at 95% capacity. Two more bad requests per stuck and you\'re saturated.

Common sources:
- One slow downstream that 1% of requests hit.
- A path that triggers GC (rare allocation pattern).
- A cache miss path that\'s 100× slower than the hit path.
- A retry storm that times out after 5s.

The fix is always to **make the slow path bounded**:
- Aggressive timeouts on the slow downstream.
- Circuit breakers when the slow downstream fails.
- Bounded queues for slow paths so the bad path doesn\'t exhaust workers.

The detection: use **histograms with exponentially-bucketed boundaries** (Prometheus\'s default approach). They preserve the tail. Don\'t use single-summary "average latency" metrics — they lie.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/addressing-cascading-failures/',
      'https://sre.google/sre-book/handling-overload/',
      'https://sre.google/sre-book/monitoring-distributed-systems/',
    ],
  },

  {
    id: 'distributed-consensus',
    title: 'Distributed Consensus — Paxos, Raft, and When You Need It',
    icon: 'lock',
    color: '#22c55e',
    questions: 3,
    description: 'When you actually need consensus, the algorithms (Paxos / Raft / Zab), and the CAP framing.',
    introduction: `Distributed consensus is the protocol problem at the heart of every reliable distributed system: **how do N machines agree on a value when some of them might fail or be partitioned?** It\'s not a footnote — it\'s a foundation.

You need consensus when (SRE Book Ch 23): leader election, group membership, lease/lock validity, reliable distributed queuing, message commitment, datastore values. Anywhere a single piece of state must be consistent across multiple machines, you need consensus underneath.

The named algorithms (in roughly chronological order):
- **Paxos** (Lamport, 1989) — the original. Proven correct, notoriously hard to implement. Most "Paxos in production" is actually **Multi-Paxos** (a leader-elected variant for sequences of values).
- **Raft** (2014) — designed for understandability. Same guarantees as Paxos; clearer leader-election. The default choice for new systems.
- **Zab** — ZooKeeper\'s protocol. Similar to Multi-Paxos in spirit.
- **Mencius** — geo-distributed variant of Paxos with rotating leadership.

The **FLP impossibility result** (Fischer, Lynch, Paterson, 1985) is the theoretical floor: in an asynchronous network with even a single faulty process, no deterministic consensus algorithm can guarantee both safety AND liveness. Real systems navigate around it via timeouts and randomized backoffs — accepting that consensus may sometimes block briefly.

**CAP theorem framing** (Ch 23 framing): in a partition, you choose between consistency and availability. The naive read is "pick C or A"; the SRE-correct read is "partitions are inevitable, so the real choice is between C and A *during* a partition." Chubby and Spanner choose C (refuse to serve when can\'t reach quorum). DynamoDB defaults to A (eventual consistency, last-writer-wins).

**When NOT to use consensus**: read-heavy services that can tolerate stale reads (cache, content delivery), eventually-consistent stores where users tolerate "you saw your write a few seconds later," append-only logs that don\'t need ordering. Consensus is expensive — every operation pays multiple round trips. Don\'t pay if you don\'t need to.`,
    whenToUse: [
      'Designing a system that needs leader election, distributed locks, or coordinated state across machines',
      'Choosing between strongly-consistent (Spanner, Cockroach) and eventually-consistent (DynamoDB, Cassandra) datastores',
      'Reviewing an architecture proposal that uses heartbeats for leader election (red flag — heartbeats don\'t prevent split-brain)',
      'Capacity planning for a consensus-backed system — every op pays N round trips',
    ],
    keyConcepts: [
      { term: 'Distributed consensus', definition: 'Protocol problem: N machines agree on a value despite failures or partitions. Required for leader election, distributed locks, coordinated state.' },
      { term: 'Paxos', definition: 'Lamport, 1989. Proven correct, hard to implement. Most "Paxos in production" is Multi-Paxos with a stable leader optimization.' },
      { term: 'Raft', definition: 'Designed for understandability (2014). Same guarantees as Paxos. Default choice for new systems. Used by etcd, Consul, CockroachDB.' },
      { term: 'FLP impossibility', definition: 'Async network + 1 faulty process → no deterministic algorithm guarantees safety AND liveness. Real systems navigate via timeouts.' },
      { term: 'Quorum', definition: 'Majority of replicas (⌊N/2⌋ + 1). 3 replicas tolerate 1 failure; 5 tolerate 2; 7 tolerate 3. Latency vs fault-tolerance trade-off.' },
      { term: 'CAP — partitions are inevitable', definition: 'The real choice is C vs A *during* a partition. Spanner / Chubby choose C. DynamoDB / Cassandra choose A.' },
    ],
    pitfalls: [
      'Heartbeat-based leader election (without consensus). Network blips cause split-brain — two replicas both think they\'re leader. Use formal consensus instead.',
      'Treating consensus as too slow without measuring. Modern impls amortize via batching/pipelining; Spanner uses it on hot paths.',
      'Using consensus where eventual consistency is fine. Counters that don\'t need exact agreement, caches, log shipping — none need consensus.',
      'Geo-distributing consensus blindly. Cross-region RTT (50-200ms) becomes the floor for every consensus op. Local-leader patterns help.',
      'Forgetting consensus has cold-start dependencies. Bootstrapping a new cluster requires consensus; consensus requires a cluster. Document the bootstrap.',
    ],
    keyQuestions: [
      {
        question: 'When do you actually need distributed consensus?',
        answer: `From SRE Book Ch 23, the use cases are precise:

- **Leader election** — pick one of N replicas to be the master. Without consensus, network blips cause split-brain (two leaders).
- **Group membership** — agree on who\'s in the cluster. Joins / leaves must be consistent across replicas.
- **Distributed locks / leases** — granting a lock to one client out of many concurrent requesters. Must be exclusive.
- **Reliable distributed queues** — exactly-once delivery requires consensus on what\'s been delivered.
- **Datastore values that need linearizability** — every reader sees writes in the same order.

When you DON\'T need consensus:
- **Read-heavy caches** — stale reads are fine; consistency comes from TTL.
- **Eventually-consistent stores** — when "you saw your write a few seconds later" is acceptable.
- **Append-only logs without strict ordering** — Kafka-style, where you don\'t care about cross-partition order.
- **Counters or aggregations where exact agreement isn\'t needed** — eventually-consistent counters with periodic reconciliation.

The cost question: consensus operations pay N round trips (typically 2-3 for stable-leader Multi-Paxos / Raft). On a single-DC cluster, that\'s sub-millisecond. Geo-distributed, you\'re paying inter-region RTT (50-200ms) on every consensus op — which is why geo-distributed consensus is rare for hot paths.`,
      },
      {
        question: 'Why is heartbeat-based leader election dangerous?',
        answer: `**Because it doesn\'t prevent split-brain.** The classic STONITH-style failover: replica A sends heartbeats; if replica B doesn\'t see them, B promotes itself to leader. Sounds reasonable. Fails badly under partial network failure.

Failure scenario: a network partition isolates A from B but A is still serving clients. A doesn\'t know it\'s partitioned. B doesn\'t hear A\'s heartbeats and promotes itself. **Now both A and B think they\'re leader**. Clients in A\'s partition write to A; clients in B\'s partition write to B. When the partition heals, the data conflicts — and conflict resolution is silent or lossy (last-writer-wins).

This is the canonical split-brain. Real-world incidents: there have been multi-hour outages caused by exactly this pattern.

**Formal consensus prevents it** by requiring quorum agreement before promotion. B can\'t become leader unless a majority of replicas agree it should. If A is partitioned but a majority is on A\'s side of the partition, B fails to get quorum and stays a follower. Only if A is genuinely unreachable from a majority does B successfully promote.

The pragmatic implication: for any system where leader election matters (databases, queues, locks), use a battle-tested consensus implementation (etcd, Consul, ZooKeeper, raw Raft). Heartbeats are a leader-detection signal, not a leader-election protocol.

SRE Book Ch 23 quote: *"Whenever you see leader election, critical shared state, or distributed locking, we recommend using distributed consensus systems that have been formally proven and tested thoroughly."*`,
      },
      {
        question: 'How do you decide between 3-replica and 5-replica consensus?',
        answer: `**3 replicas tolerate 1 failure. 5 tolerate 2.** The math:

- 3-replica quorum = 2. Lose any 1 → still have a quorum. Lose 2 → no progress.
- 5-replica quorum = 3. Lose any 2 → still have a quorum. Lose 3 → no progress.
- 7 → tolerate 3. Pattern: ⌊(N-1)/2⌋ failures.

Trade-offs:
- **Latency**: each consensus op needs to wait for quorum. With 5 replicas, you wait for the slowest of 3 (instead of 2 of 3). Spread of latencies is wider.
- **Bandwidth**: every op replicates to all N (in most implementations). 5 replicas is 67% more bandwidth than 3.
- **Cost**: 5 hosts vs 3.

Decision rule:
- **3 replicas**: standard for single-DC consensus. Plenty for most use cases. The 1-failure tolerance covers common cases (host crash, planned maintenance).
- **5 replicas**: cross-AZ or geo-distributed deployments where you might lose an AZ AND have an unrelated host failure. Or services with extremely tight SLOs where any unavailability is unacceptable.
- **7+**: very rare in practice. Diminishing returns past 5 — you\'re paying linearly more for tolerating 1 more failure.

Practical pattern: 5-replica clusters spread across 3 AZs (e.g. 2-2-1). Loss of any single AZ leaves you with at least 3 replicas and a quorum. Combined with proper anti-affinity rules to spread replicas across racks within each AZ.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/managing-critical-state/',
      'https://raft.github.io/',
      'https://research.google/pubs/the-chubby-lock-service-for-loosely-coupled-distributed-systems/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // C. Observability & Monitoring
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'three-pillars',
    title: 'Three Pillars of Observability — Metrics, Logs, Traces',
    icon: 'activity',
    color: '#06b6d4',
    questions: 3,
    description: 'What each pillar is for, where they fail, and the unified-via-OpenTelemetry shift.',
    visualizations: [
      {
        title: 'Three pillars + OpenTelemetry',
        description: 'Metrics (numerical, aggregated, alert-driving), logs (structured events, debug-driving), traces (causality across services). OpenTelemetry instruments once and routes to all three.',
        image: '/diagrams/sre/c1-three-pillars.png',
      },
    ],
    introduction: `**Observability** is the property of a system that lets you understand its internal state from its external outputs. Sounds abstract; the practical decomposition has been the same for ~10 years: **metrics, logs, traces** — the "three pillars."

Each pillar has a specific job:

**Metrics** — numerical, time-series, aggregated. Cheap to store at scale. *"How many requests per second? What\'s the p99 latency? How full is the disk?"* Drives alerts and dashboards. Tools: Prometheus, Mimir, Cortex, Datadog, CloudWatch.

**Logs** — structured (or semi-structured) events, one per occurrence. Expensive to store at scale (volume × retention). *"What did this specific request do? What was the exception stack trace?"* Drives debugging and audit. Tools: Loki, Elasticsearch/OpenSearch, Splunk, Datadog Logs.

**Traces** — causality across services. A trace is a tree of spans, each span representing one unit of work. *"This 5-second user request — where did the time go?"* Drives latency investigations and dependency discovery. Tools: Jaeger, Tempo, Honeycomb, X-Ray.

The 2020s shift: **OpenTelemetry (OTel)** unified the instrumentation. Before OTel, each pillar had its own SDK, its own wire format, its own collector. Now: instrument once with OTel SDK; the OTel Collector routes metrics to Prometheus, logs to Loki, traces to Tempo (or your vendor of choice). OTel is now CNCF\'s second-most-active project after Kubernetes.

**Charity Majors\' challenge** to the three-pillar framing (founder of Honeycomb): the pillars view treats observability as three siloed datasets. Real debugging needs to *correlate* across them — a metric spike → click into the logs from that time range → see a slow trace. Modern stacks (Honeycomb, Datadog, Grafana LGTM) build the correlation in. The three-pillars view is correct as a mental model but limited as an architecture.

Beyond the pillars, two newer signals:
- **Profiles** (continuous profiling — Pyroscope, Parca) — CPU/memory profiles aggregated over time. Find which function is consuming resources, not just which service.
- **Events** (deploy markers, feature-flag flips, scaling events) — discrete things that happened, correlated against the other signals.`,
    whenToUse: [
      'Designing observability for a new service — pick which pillars you need (usually all three)',
      'Cost reviews — logs are usually the biggest spend; metrics are cheapest',
      '"What\'s wrong with this service" investigations — start with metrics, drill into logs/traces',
      'Picking a vendor or stack — open-source LGTM vs Datadog vs Honeycomb has different ergonomic and cost profiles',
    ],
    keyConcepts: [
      { term: 'Metrics', definition: 'Numerical, time-series, aggregated. Cheap. Drives alerts and dashboards. Counter, gauge, histogram, summary types.' },
      { term: 'Logs', definition: 'Structured events. Expensive. Drives debugging and audit. JSON-formatted preferred over plain text for queryability.' },
      { term: 'Traces', definition: 'Span trees showing causality across services. Drives latency investigations. Span = unit of work; trace = tree of spans sharing a trace_id.' },
      { term: 'OpenTelemetry (OTel)', definition: 'CNCF standard for instrumentation. One SDK emits metrics + logs + traces; OTel Collector routes to backends. The default for new services.' },
      { term: 'Continuous profiling', definition: 'CPU/memory profiles aggregated over time (Pyroscope, Parca). Adds the "which function" dimension that traces and logs lack.' },
      { term: 'Correlation', definition: 'The point of unified observability. Click from a metric spike into the logs from that range, into the slow trace within those logs.' },
    ],
    pitfalls: [
      'Logging everything at INFO level. Generates 10x the storage cost without proportional debug value. Be discriminating.',
      'Metrics with high cardinality. user_id as a label = exploding time series. Cardinality bombs are a leading cause of Prometheus OOMs.',
      'Tracing only some services. Traces with gaps are nearly useless — the gap is exactly the part you wanted to understand.',
      'Choosing one pillar over the others. Each answers different questions; needing only one is rare.',
      'No retention strategy. Storing logs forever is a budget mistake; archive cold data to S3 / GCS at TTL.',
    ],
    keyQuestions: [
      {
        question: 'When do you reach for metrics vs logs vs traces?',
        answer: `Each answers a different question:

**Metrics**: *"Is the service healthy right now? What\'s the trend?"* Use when you need numbers — request rate, error rate, latency percentiles, resource utilisation. Pre-aggregated, cheap, queryable in milliseconds. Drives alerts because they\'re fast and stable.

**Logs**: *"What did this specific request do? Why did it fail?"* Use when you need the *event* — the exception, the parameter values, the audit trail. Stored per-event, expensive at volume, queryable in seconds-to-minutes. Drives root-cause investigation and audit/compliance.

**Traces**: *"This request was slow — where did the time go?"* Use when you need the *latency breakdown across services*. Stored per-span, expensive at full sample rate (so most teams sample 1-10%). Drives latency investigations and dependency mapping.

The typical workflow:
1. Alert fires from a metric (error rate spiked).
2. Open the dashboard, see which service is unhealthy.
3. Pull logs from that service for the spike window.
4. Find a slow request in the logs; click into its trace.
5. Trace shows the slow span is in a downstream DB call.

If any pillar is missing or has a gap, the investigation stops there. That\'s why you instrument all three even though the cost looks high — the cost of NOT having them during an incident is higher.`,
      },
      {
        question: 'What is OpenTelemetry and why does it matter?',
        answer: `**OpenTelemetry (OTel)** is a CNCF project providing a unified, vendor-neutral standard for instrumenting metrics, logs, and traces. Before OTel, each pillar had its own SDK (Prometheus client lib for metrics, Logback / log4j for logs, OpenTracing or Jaeger SDK for traces) and each vendor had its own. Switching vendors meant re-instrumenting.

OTel\'s architecture:
- **OTel SDK**: language-specific library you embed in your service. Generates spans, metrics, log events.
- **OTel Collector**: separate process (sidecar / DaemonSet / standalone) that receives data from SDKs and routes it to backends.
- **OTLP wire format**: vendor-neutral protocol between SDK and Collector.
- **Receivers / Processors / Exporters**: collector pipeline pieces. Receive from OTLP, batch / sample / enrich, export to Prometheus / Loki / Tempo / Datadog / wherever.

Why it matters:
1. **Switch vendors without re-instrumenting.** Change exporter config; code unchanged.
2. **One SDK to learn instead of three.** Reduces friction for engineers.
3. **Correlated signals out of the box.** Trace IDs propagate to logs automatically; metrics get exemplars (sample trace IDs that hit that bucket).
4. **Auto-instrumentation libraries.** Java agent, Python opentelemetry-instrument CLI, Node SDK auto-attach — instrument popular frameworks (Express, Spring, Flask, Rails) with zero code changes.

Adoption: as of 2026 OTel is the de-facto standard for new services. Datadog, New Relic, Honeycomb, Grafana, AWS, GCP all accept OTLP natively. Greenfield service in 2026 = OTel SDK by default.`,
      },
      {
        question: 'What\'s wrong with the "three pillars" mental model?',
        answer: `Charity Majors (Honeycomb co-founder) has been the loudest critic. The argument:

**The pillars treat observability as three separate datasets**, each with its own tooling, its own query language, its own retention policy, its own UI. Engineers context-switch between them, struggling to correlate. *"Looking at the metrics dashboard, then opening Splunk to find the logs, then Jaeger to find the trace — and the timestamps are off by seconds, the trace IDs aren\'t in the logs."*

**Real debugging needs correlation across pillars**, instantly. The unit of debugging isn\'t a metric or a log; it\'s a *failed user request*, which has a metric impact, multiple log lines, and a trace. The three-pillar architecture makes that hard.

The Honeycomb / structured-events alternative: **wide structured events** as the primitive. Every "thing that happens" is a single event with rich attributes (200+ columns common). You query the events directly. Metrics are derived (count of events grouped by status). Logs are events. Traces are events linked by trace_id. Correlation is just SQL.

The pragmatic stack today (most teams): use the three-pillar tools but invest in *correlation infrastructure* — exemplars in Prometheus that link to traces, trace IDs in log entries, unified UI (Grafana, Datadog, Honeycomb). The pillars survive as data shapes; the user experience is unified.

Worth knowing: the pillars view is fine as a starting mental model. The "wide events" view is more sophisticated and starts to matter at scale (>100 services, >100 engineers). Be prepared to discuss both.`,
      },
    ],
    references: [
      'https://opentelemetry.io/docs/concepts/observability-primer/',
      'https://www.honeycomb.io/blog/observability-101-terminology-and-concepts',
      'https://sre.google/sre-book/monitoring-distributed-systems/',
    ],
  },

  {
    id: 'red-use-golden-signals',
    title: 'RED, USE, and the Four Golden Signals',
    icon: 'activity',
    color: '#06b6d4',
    questions: 3,
    description: 'Three named methodologies for what to measure. Pick by what you\'re monitoring.',
    visualizations: [
      {
        title: 'RED vs USE vs Four Golden Signals',
        description: 'RED for request-driven services (rate, errors, duration). USE for resources (utilization, saturation, errors). Four Golden Signals — Google\'s superset.',
        image: '/diagrams/sre/c2-red-use.png',
      },
    ],
    introduction: `Three named methods exist for "what to measure," and engineers conflate them constantly. The interview-clean version:

**RED Method (Tom Wilkie, formerly Weaveworks, now Grafana)** — for **services**:
- **R**ate — requests per second
- **E**rrors — count or % of failed requests
- **D**uration — distribution of response latencies (p50, p95, p99)

If you can answer those three for any service, you can tell whether it\'s healthy. Used widely in microservice monitoring; maps cleanly onto Prometheus histogram metrics.

**USE Method (Brendan Gregg, Netflix → Intel)** — for **resources** (CPU, memory, disk, network, queue):
- **U**tilization — % busy / % full
- **S**aturation — queue depth or wait time (work backlog beyond utilization)
- **E**rrors — error counts

The USE method matches resource-level observability. CPU utilization tells you the average; CPU saturation (load average / runnable threads) tells you the queue beyond. A 80%-utilized CPU with 0 saturation is fine; a 80%-utilized CPU with deep saturation is overloaded.

**Four Golden Signals (Google SRE Book Ch 6)** — Google\'s superset:
- **Latency** — time to serve a request (success vs error latency separated)
- **Traffic** — demand on the system (req/sec, MB/sec)
- **Errors** — explicit failures, plus implicit failures (slow successes that miss SLO)
- **Saturation** — how full the service is (queue depth, memory headroom)

Quote (verbatim, Ch 6): *"If you can only measure four metrics of your user-facing system, focus on these four."*

How to choose:
- **User-facing service** → Four Golden Signals (or RED + saturation).
- **Backend resource (DB host, message broker)** → USE.
- **Microservice mesh** → RED everywhere; USE on each underlying host.
- **Anything else** → Four Golden Signals; they generalize.

These methods are about **completeness**, not about exact metrics. The point is to make sure you haven\'t missed a category — if you have rate but not errors, you\'ll learn about an outage from the customer.`,
    whenToUse: [
      'Designing dashboards or alerts for a new service — pick the appropriate method',
      'Reviewing existing observability — checking that all four (or three) signals are actually instrumented',
      'Capacity planning — saturation is the leading indicator',
      'Interview answers about "what would you monitor for a service like X"',
    ],
    keyConcepts: [
      { term: 'RED Method', definition: 'For services. Rate, Errors, Duration. Tom Wilkie. Maps to Prometheus histograms.' },
      { term: 'USE Method', definition: 'For resources. Utilization, Saturation, Errors. Brendan Gregg. Resource-level observability.' },
      { term: 'Four Golden Signals', definition: 'Google SRE Book. Latency, Traffic, Errors, Saturation. The superset; generalizes to most systems.' },
      { term: 'Saturation', definition: 'Queue depth or wait time beyond utilization. Leading indicator: 80% CPU might be fine, 80% CPU + load average 30 means overload.' },
      { term: 'Latency: success vs error separated', definition: 'Don\'t average them. Errors often fail fast; mixing them with successes makes the latency distribution lie.' },
    ],
    pitfalls: [
      'Reporting only mean latency. Tail (p99) is what users feel; mean hides bimodal distributions.',
      'Mixing success and error latency. Errors often fail in 5ms; successes take 200ms; the average is meaningless.',
      'Watching utilization without saturation. 80% CPU is fine if no queue; same number with deep queue is overload.',
      'Forgetting traffic. An "error rate of 0%" with 0 traffic is silent failure — the service stopped getting requests.',
      'Picking USE for a service. Services are request-driven; USE is resource-level.',
    ],
    keyQuestions: [
      {
        question: 'Walk me through RED, USE, and the Four Golden Signals — when do you use each?',
        answer: `**RED** (Tom Wilkie) — for services:
- Rate: req/sec
- Errors: count or fraction failed
- Duration: latency percentiles (p50, p95, p99)

Use for: any request-driven service. The three numbers tell you if it\'s healthy.

**USE** (Brendan Gregg) — for resources:
- Utilization: % busy
- Saturation: queue depth or wait time
- Errors: error counts

Use for: hosts, disks, networks, queues. Resource-level diagnosis. Saturation is the leading indicator that "fully utilized" is becoming "overloaded."

**Four Golden Signals** (Google) — superset:
- Latency
- Traffic
- Errors
- Saturation

Quote: *"If you can only measure four metrics of your user-facing system, focus on these four."* Generalizes RED + adds saturation, which RED leaves implicit.

Decision rule:
- Service-level monitoring → Four Golden Signals (or RED if your culture uses it).
- Host / resource monitoring → USE.
- Microservice fleet → RED on each service + USE on each host.
- Mixed system → Four Golden Signals (most flexible).

The methods aren\'t about specific metrics; they\'re about *completeness categories*. The check: for any service, can you answer all four signals? If no, you\'re flying blind on that signal.`,
      },
      {
        question: 'Why is saturation so often missed?',
        answer: `Because **utilization is easy and saturation is hard**.

Utilization = "what % of the resource is busy" — directly observable. CPU is 70% used. RAM is 60% full. These come "free" from the OS.

Saturation = "what work is queued or delayed beyond what the resource can serve" — needs explicit measurement. CPU run queue depth. Disk I/O wait time. Network packet drops or retries. Memory pressure (page faults, swapping).

Engineers look at the easy one and miss the leading indicator:
- A CPU at 80% util with run-queue depth 0 is fine.
- A CPU at 80% util with run-queue depth 30 is *very* not fine — there\'s 30 threads waiting, latency spikes are imminent.

The fix:
- **Linux**: \`load average\` is your CPU saturation; \`vmstat\` for memory; \`iostat -x\` for disk \`%util\` AND \`avgqu-sz\` (queue size).
- **node_exporter**: exposes node_load1, node_load5, node_load15, plus pressure metrics (node_pressure_*) for newer kernels. Pressure metrics are the modern saturation signal.
- **Application-level**: thread pool queue depth, semaphore wait counts, connection pool saturation.

Why it matters: saturation often *plateaus utilization at 100% but the queue keeps growing*. By the time utilization "looks bad," the queue is already so deep that latency has been awful for minutes. Saturation gives you 5-30 minutes of warning that utilization doesn\'t.`,
      },
      {
        question: 'Why must success and error latency be tracked separately?',
        answer: `Because **errors usually fail fast**, and mixing them with successes hides the actual user latency.

Concrete example: imagine a service that serves 100 req/sec. 95% succeed in 200ms (p50). 5% fail with a connection-refused after 5ms.

If you report only "average latency," you get **(0.95 × 200ms) + (0.05 × 5ms) = 190.25ms**. Looks fine!

But the user-experience reality:
- Successful users are seeing 200ms — same as before.
- 5% of users are seeing instant errors — bad experience but not "slow."
- The 95% figure dominates real latency; the average is artificially pulled down.

Now imagine the failure mode flips: errors start taking 30 seconds (timeout). Same 5% fail. Average becomes \`(0.95 × 200ms) + (0.05 × 30000ms) = 1690ms\`. Looks terrible, fires alerts.

But the user reality is mostly unchanged — successful users still see 200ms. The 5% that fail now wait 30s to fail, which is bad, but the *successful* user experience didn\'t degrade.

If you alert on "p99 latency exceeded 500ms," you alert in the second case but not the first — even though the percentage of failures is the same.

The fix: emit two histograms. \`http_request_duration_seconds{status="success"}\` and \`{status="error"}\`. Alert on each separately. SLOs are usually success-only ("99.9% of successful requests under 500ms"); errors get their own SLO ("error rate under 0.1%").

Google SRE Book Ch 6 quote: *"It\'s important to distinguish between the latency of successful requests and the latency of failed requests."*`,
      },
    ],
    references: [
      'https://sre.google/sre-book/monitoring-distributed-systems/',
      'https://www.brendangregg.com/usemethod.html',
      'https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/',
    ],
  },

  {
    id: 'sli-types',
    title: 'Choosing the Right SLI — Availability, Latency, Quality, Freshness',
    icon: 'target',
    color: '#06b6d4',
    questions: 3,
    description: 'The SRE Workbook\'s SLI taxonomy and how to pick which to measure for which service.',
    introduction: `Picking the right SLI is the single most consequential observability decision. A bad SLI makes a service look healthy when users are unhappy; a good SLI fires when users feel pain.

The SRE Workbook (Ch 2) names six SLI types, each appropriate for a different kind of work:

**1. Availability** — *"% of valid requests served successfully."*
For request/response services. \`good = HTTP 2xx (or 5xx attributable to client). bad = HTTP 5xx.\` Computed as \`good_events / valid_events\`. Example: 99.9% of HTTP requests return success.

**2. Latency** — *"% of valid requests served faster than threshold."*
For request/response services where speed matters. \`good = duration < 500ms.\` Critical: pick the threshold from user expectations, not engineering convenience. Often **two SLIs**: 90% under 100ms (typical) and 99% under 1s (acceptable).

**3. Quality** — for graceful degradation.
"% of requests served at full quality" — degraded responses count as bad. Used for services that can serve a degraded response (cached results, partial answers) under load.

**4. Freshness** — for data pipelines.
"% of data elements that were updated within Y." Example: 99% of search index entries were updated within the last 5 minutes. This is what you want for batch jobs, replication pipelines, ETL.

**5. Coverage** — for batch and stream pipelines.
"% of data that was processed." Example: 99% of input records made it through the pipeline. Catches "the pipeline is up but it\'s dropping records."

**6. Throughput** — for streaming systems.
"% of time the system meets minimum throughput." Example: Kafka consumer lag stays under 1000 messages 99% of the time.

The unifying formula (from the Workbook): **SLI = good_events / valid_events**. Note "valid" — you exclude things you can\'t serve (e.g., requests for nonexistent endpoints — those aren\'t your fault). Counter-example: don\'t exclude 5xx by classifying them as "client error" — that\'s gaming the SLI.

How to pick:
- **HTTP service** → availability + latency.
- **Batch pipeline** → freshness + coverage.
- **Streaming consumer** → freshness (lag) + throughput.
- **Best-effort cache** → availability with quality (degraded responses count).
- **Database** → availability + latency, sometimes durability (probabilistic).

The Workbook\'s framing rule: **start with the user\'s journey**. What does success look like to them? Translate that into events; the SLI should be the fraction of events that succeed.`,
    whenToUse: [
      'Defining a new service\'s SLO — pick the SLI types first',
      'Auditing an existing SLO — does it actually track user experience, or is it a vanity metric?',
      'Reviewing batch pipelines — availability is wrong here, freshness/coverage are right',
      'Designing degraded-response paths — quality SLI captures partial-failure correctly',
    ],
    keyConcepts: [
      { term: 'Availability SLI', definition: 'good = success / valid. For request/response services. The default.' },
      { term: 'Latency SLI', definition: '% of requests under threshold. Often two thresholds: typical-fast and acceptable-slow.' },
      { term: 'Quality SLI', definition: '% of requests served at full (non-degraded) quality. For services with graceful degradation.' },
      { term: 'Freshness SLI', definition: '% of data updated within window. For pipelines, replication, batch jobs.' },
      { term: 'Coverage SLI', definition: '% of input data that completed processing. For pipelines that can drop records.' },
      { term: 'Throughput SLI', definition: '% of time minimum throughput is met. For streaming systems.' },
    ],
    keyQuestions: [
      {
        question: 'How do you choose an SLI for a service?',
        answer: `Start with the **user\'s journey**, not the service\'s internals. Ask: what does the user need to succeed? Translate to events; SLI = fraction of events that succeed.

Map by service type:

- **Request/response API** → availability (success rate) + latency (% under threshold).
- **Batch pipeline (ETL)** → freshness (% of data updated within Y) + coverage (% of input records processed).
- **Streaming consumer (Kafka, Kinesis)** → freshness (lag bounded) + throughput (min ops/sec maintained).
- **Cache** → availability, plus quality (degraded responses on miss count as bad if user-visible).
- **Storage** → availability + latency, plus durability (probabilistic — "P(data loss) < 10⁻¹¹").

The SRE Workbook\'s formula: \`SLI = good_events / valid_events\`. Two traps:
1. **"valid" is gameable.** Excluding requests as "invalid" is how teams hit fake SLOs. Be strict — only exclude things genuinely outside your responsibility (404s for nonexistent endpoints, requests with malformed input that the LB rejected before reaching you).
2. **Multiple SLIs per service.** A typical web service has 2-4 SLIs. Latency at p99 < 500ms AND availability > 99.9%. Don\'t collapse them; they fail differently.

Final check: when this SLI fires (drops below SLO), is a user actually unhappy? If you can\'t imagine a real customer feeling the impact, the SLI is wrong.`,
      },
      {
        question: 'For a Kafka consumer, what SLIs do you use?',
        answer: `**Freshness (consumer lag) + Throughput (ops/sec)**. Availability is wrong — consumers are pull-based; their "uptime" is measured indirectly via lag.

**Freshness SLI**: % of time consumer lag is under threshold. Example: "99% of measurements show lag under 60 seconds." If lag exceeds 60s, the consumer is falling behind producers — users see stale data.

**Throughput SLI**: % of time min messages/sec is sustained. Example: "99.5% of measurements show throughput >= 1000 msg/sec." Catches the "consumer is technically up but processing one message per minute" silent-failure mode.

Why availability isn\'t enough:
- A Kafka consumer can be "running" (process up, partitions assigned) but lag is growing because it\'s processing slowly. Availability SLI says 100%; users see stale data.
- A consumer can be "running" with low lag but processing only the easy messages and silently dropping the hard ones. Availability is fine; coverage is failing.

Add a **coverage SLI** if dropping records is possible: "99.99% of input messages are committed (processed) within Y minutes." Detects silent drops.

Common mistake: alerting only on "consumer is down" / restart count. Misses the "consumer is technically up but lag is growing exponentially" case, which is the more common failure.

Real-world dashboards: lag-by-partition + throughput-by-partition + commit-rate. All three needed because partition rebalances, dead consumers, and slow processing show up differently.`,
      },
      {
        question: 'What\'s the difference between latency and quality SLIs?',
        answer: `**Latency** measures HOW LONG. **Quality** measures WHAT YOU RETURNED.

Concrete example: a search service.
- **Latency SLI**: "99% of searches return within 500ms." Doesn\'t care what was returned, only timing.
- **Quality SLI**: "99% of searches return the full top-100 results from the live index (not cached / not partial)."

You need both because they fail differently:
- A search that returns in 200ms with 50 cached results from 10 minutes ago hits latency but fails quality.
- A search that returns in 5 seconds with the correct full results hits quality but fails latency.

Quality SLIs matter most for services with **graceful degradation paths**:
- Search engine that falls back to cached results on backend failure.
- Recommendation service that returns a static fallback list when the model is down.
- Feed that returns a smaller window of items when the full join is slow.

Without a quality SLI, the degraded response is invisible — users complain "the recommendations look off" and the engineering team sees "100% availability."

Implementation: emit a tag on every response indicating quality level (\`quality="full" | "degraded" | "fallback"\`). The quality SLI is the fraction of full-quality responses out of valid responses. This naturally aligns with feature-flag rollouts and circuit-breaker activations.

Pragmatic guidance: most services don\'t need a quality SLI explicitly. But any service with a \`return cached_result\` fallback path should have one — that path will activate eventually, and you want to know.`,
      },
    ],
    references: [
      'https://sre.google/workbook/implementing-slos/',
      'https://sre.google/workbook/slo-engineering-case-studies/',
    ],
  },

  {
    id: 'modern-observability-stack',
    title: 'Modern Observability Stack — LGTM, Datadog, Honeycomb',
    icon: 'layers',
    color: '#06b6d4',
    questions: 3,
    description: 'Grafana LGTM (Loki/Grafana/Tempo/Mimir), Datadog, Honeycomb, eBPF — the 2026 landscape.',
    visualizations: [
      {
        title: 'Grafana LGTM stack with OpenTelemetry',
        description: 'OTel Collector ingests; Mimir for metrics, Loki for logs, Tempo for traces; Grafana for visualization; Alertmanager for routing.',
        image: '/diagrams/sre/c4-prom-stack.png',
      },
    ],
    introduction: `The 2026 observability landscape has consolidated around three commercial-grade options:

**1. Grafana LGTM stack (open-source, self-hosted)**
- **L**oki — log aggregation, label-indexed (cheaper than Elastic).
- **G**rafana — visualization, dashboards, unified UI.
- **T**empo — distributed traces, scales horizontally.
- **M**imir — metrics (Prometheus-compatible, horizontally scalable).
Plus **OpenTelemetry Collector** for ingestion, **Alertmanager** for alert routing.
Strengths: open-source, vendor-neutral, scales horizontally, cheap at high volume. Weaknesses: ops burden — you run it.

**2. Datadog (SaaS, comprehensive)**
The dominant commercial vendor. APM + logs + metrics + traces + RUM (real-user monitoring) + synthetics + database monitoring + security all in one. Strengths: minimal setup, deep integrations, polished UI. Weaknesses: cost — Datadog is famously expensive at scale; teams over $1M ARR routinely face $200K+/year Datadog bills.

**3. Honeycomb (SaaS, traces-first)**
Charity Majors\' company. Built around wide structured events instead of three pillars. Best-in-class for "why is this request slow?" investigations via BubbleUp (automatically finds outlier dimensions). Strengths: phenomenal for debugging, especially traces. Weaknesses: less comprehensive than Datadog (lighter on logs/metrics-only use cases), pricing model is event-based.

Other notable players:
- **New Relic** — older, mature APM, repositioned in 2020 to consumption-based pricing.
- **Splunk** — enterprise log juggernaut, expensive, big in compliance/security.
- **Dynatrace** — APM-first, AI/automation-positioned.
- **AWS CloudWatch / GCP Cloud Operations / Azure Monitor** — cloud-native, integrated, but usually paired with one of the above for serious monitoring.

The 2024-2026 trends:
- **eBPF-based observability** (Pixie, Cilium Hubble, Parca, Pyroscope) — kernel-level instrumentation without code changes. Continuous profiling becoming standard.
- **OpenTelemetry as default** — every new vendor accepts OTLP; instrumentation code is portable.
- **Cost optimization pressure** — high-cardinality metrics + logs at scale + APM traces add up; teams rebuilding observability for cost (sampling, aggregation, tiered storage) is a major industry theme.
- **AI-assisted root cause analysis** — Datadog Watchdog, Honeycomb Bubble Up, New Relic AI Anomaly Detection. Most are still "anomaly detection lite," but improving.

How to pick:
- **Startup, <50 engineers** → Datadog (or Honeycomb if you trace a lot). Pay for the time saved.
- **Mid-market, 50-500 engineers** → Datadog or LGTM. The crossover where self-hosting LGTM starts saving money.
- **Large enterprise** → LGTM (or split: Datadog for traces, LGTM for cheap metrics). Cost optimization dominates.
- **Compliance-heavy** → Splunk for logs, plus a separate metrics/traces tool.`,
    whenToUse: [
      'Choosing or migrating an observability stack — the 3-vendor decision',
      'Cost-reduction projects — moving from Datadog to LGTM is a common path',
      'New-service instrumentation — defaulting to OTel + LGTM = vendor-neutral starting point',
      'Hiring — different stacks have different operational profiles',
    ],
    keyConcepts: [
      { term: 'LGTM stack', definition: 'Loki / Grafana / Tempo / Mimir. Grafana Labs\' open-source observability suite. Horizontally scalable, OTel-native.' },
      { term: 'Datadog APM', definition: 'Dominant commercial vendor. All-in-one. Famously expensive at scale; $200K+/year is normal for mid-sized teams.' },
      { term: 'Honeycomb', definition: 'Wide structured events instead of three pillars. Best-in-class for trace-driven debugging via BubbleUp automatic dimension analysis.' },
      { term: 'eBPF observability', definition: 'Kernel-level instrumentation without code changes. Pixie, Cilium Hubble, Parca, Pyroscope. Becoming standard for continuous profiling.' },
      { term: 'OTel as default', definition: 'OpenTelemetry is now the de-facto instrumentation standard. Every major vendor accepts OTLP; your code is portable.' },
    ],
    keyQuestions: [
      {
        question: 'How do you choose between Datadog and the LGTM stack?',
        answer: `Three axes:

**1. Cost vs ops burden trade-off.**
- Datadog: minimal ops, expensive at scale. Most teams: $50K-$500K/year. Heavy users (high-cardinality metrics, long retention): $1M+.
- LGTM: open-source, you operate it. Infrastructure cost (compute + S3) is 5-10× cheaper at the same volume. But you pay 1-2 SREs to run it.
- Crossover point: roughly 50-100 engineers / $100K Datadog bill. Below: Datadog wins on ROI. Above: LGTM saves real money if you have the SRE capacity.

**2. Engineering culture and feature breadth.**
- Datadog: best-in-class polish, integrations (300+), mobile RUM, synthetic monitoring, Database Monitoring (DBM), Continuous Profiling, security. Buying a stack, not a tool.
- LGTM: focused on metrics + logs + traces + dashboards. RUM, security, profiling exist as separate Grafana products but are less mature than Datadog\'s.
- Pick Datadog if you want one-vendor cohesion. LGTM if you want best-of-breed and don\'t mind composition.

**3. Cloud lock-in tolerance.**
- Datadog: vendor lock-in is real. Custom dashboards, monitors, runbooks are Datadog-specific. Migration effort = months.
- LGTM: open-source, OTel-native. Move from self-hosted to Grafana Cloud to AWS Managed Grafana without rewriting.

The pragmatic 2026 stack many teams converge to: **OpenTelemetry SDK + LGTM for cheap signals + Datadog for premium debugging**. OTel makes the split possible; you get the best of both at moderate cost.`,
      },
      {
        question: 'When does Honeycomb make sense over Datadog?',
        answer: `**When trace-driven debugging is the bottleneck**, especially for complex microservice architectures.

Honeycomb\'s superpower is **BubbleUp** — feed it a slow trace, click the slow span, and BubbleUp automatically tells you which dimension(s) (user_id, region, request_type, etc.) explain the slowness. Datadog can do this with explicit groupings; Honeycomb does it automatically across all dimensions.

The argument:
- Most of your incidents are "X% of requests for some-cohort-of-users got slow." Honeycomb finds the cohort fast.
- You have 50+ services and a request hits 10+ of them. Honeycomb\'s wide-event model preserves all the dimensions; Datadog\'s aggregated metrics often lose them to cardinality.

When NOT Honeycomb:
- Logs-heavy use cases (Honeycomb is event-store-shaped, not log-shaped — works but isn\'t the natural fit).
- Compliance-heavy logging where you need raw log retention.
- Server / host monitoring (Honeycomb cares less about CPU/memory metrics than about request behavior).
- Tight budgets — Honeycomb is event-priced; high-traffic services with rich attributes get expensive fast.

Common pattern at mid-to-large companies: **Honeycomb for traces and request-level debugging + Datadog or LGTM for metrics/logs/infra**. Each tool used where it\'s strongest. Cost-bearable because you sample traces (typically 1-10%) into Honeycomb and aggregate metrics into the cheaper system.`,
      },
      {
        question: 'What is eBPF observability and why is it relevant?',
        answer: `**eBPF (extended Berkeley Packet Filter)** lets you run sandboxed programs in the Linux kernel that observe and modify kernel behavior without changing kernel source or loading kernel modules. For observability, this means: **instrument any system call, any network packet, any function entry/exit, without changing application code**.

What this unlocks:
- **Continuous profiling without overhead** — Parca and Pyroscope use eBPF to sample stack traces of every running process, building a rolling CPU profile of production. Find which function is consuming CPU without re-deploying.
- **Network observability without service mesh** — Cilium Hubble watches every packet at the kernel level. See which services talk to which, with latencies and error counts, without adding sidecars.
- **Auto-instrumentation without SDK** — Pixie and similar tools instrument HTTP, gRPC, MySQL, Postgres, Redis, Kafka calls *automatically* by intercepting at the kernel. Zero code change to get golden-signals on any service running on the host.
- **Security observability** — Falco, Tetragon use eBPF to monitor syscalls for security policy violations (e.g., a process executing /bin/sh is suspicious in production).

Why it\'s shifting the landscape:
- **No-instrumentation observability** for legacy / third-party code where you can\'t add OTel SDK.
- **Lower overhead** than userspace agents — eBPF programs run inside the kernel\'s sandbox.
- **Kernel-level visibility** — see what *actually* happens (syscalls, packets), not just what the application reports.

State in 2026:
- Pyroscope (continuous profiling) is mainstream — Grafana acquired it; many teams run it as default.
- Cilium / Hubble (network) is standard for Kubernetes networking.
- Tetragon / Falco (security) are widespread in regulated industries.
- Pixie (auto-APM) is less common but growing.

Trade-offs: eBPF requires a recent kernel (4.18+ for most features, 5.x preferred). Mac/Windows are non-options. Cloud-managed Kubernetes (EKS/GKE/AKS) all support it.`,
      },
    ],
    references: [
      'https://grafana.com/oss/',
      'https://docs.datadoghq.com/',
      'https://www.honeycomb.io/blog/',
      'https://ebpf.io/applications/',
    ],
  },

  {
    id: 'logging-best-practices',
    title: 'Logging Best Practices — Structured, Sampled, Correlated',
    icon: 'fileText',
    color: '#06b6d4',
    questions: 3,
    description: 'Structured JSON over text, log levels, sampling, correlation IDs, and the cost reality.',
    introduction: `Logging is the most expensive of the three pillars at scale and the most often abused. Two engineers logging "everything at INFO" can quintuple a service\'s log spend without proportional debug value.

**Rules that hold up in production:**

**1. Structured (JSON) over plain-text.** Plain-text logs require regex to query; structured logs are queryable as data. The line:
\`{"ts":"2026-05-04T12:00:00Z","level":"warn","service":"api","trace_id":"abc","user_id":12345,"event":"rate_limited","limit":100}\`
beats:
\`2026-05-04 12:00:00 WARN api: user 12345 rate-limited (limit=100)\`
Every modern log tool (Loki, Elasticsearch, CloudWatch, Datadog) treats JSON natively.

**2. Levels matter — calibrate them.** A canonical scale:
- **TRACE** — hot-path step-by-step (rarely enabled in prod).
- **DEBUG** — useful for debugging but noisy (off by default in prod).
- **INFO** — discrete events of interest (request handled, job started). Default for "this happened."
- **WARN** — handled but suspicious (retry, fallback, deprecated path).
- **ERROR** — handled but bad (caught exception, rejected request).
- **FATAL** — crashing now.
The mistake is "log everything at INFO." Be discriminating: INFO should be 1-3 lines per request, not 50.

**3. Sample at the source for high-volume services.** Logging every request at 100K req/sec is 8.6 billion events/day. Sample to 1-10% based on the trace context. Keep 100% sampling for errors and slow requests. Most modern frameworks (OpenTelemetry, Sentry) support this natively.

**4. Correlation IDs everywhere.** Every log line should carry the **trace_id** of the request that produced it. The query "show me everything that happened during this user\'s slow request" becomes \`trace_id="abc"\` and instantly correlates logs + traces + metrics (via exemplars). Without trace_id, you grep timestamps and pray.

**5. Don\'t log secrets.** PII, tokens, passwords, full request bodies. The cost of an accidental leak is much larger than the cost of "I have less context to debug." Use redaction libraries; whitelist what to log, not blacklist what to omit.

**6. Retention is a budget knob.** Hot retention (queryable) for 7-30 days; cold archive (S3/GCS) for compliance / forensics. Loki + S3 makes this cheap; Datadog\'s default 15-day hot retention adds up.

**Cost reality:** at 10 KB / log entry × 10K req/sec × 10 lines/request × 86400 sec/day = ~86 GB/day. A 30-day hot retention is 2.5 TB. Datadog charges around $1.7-$3/GB ingested + storage. That\'s $4K-$8K/month for one moderately-busy service. Multiply by 50 services and you see why log cost dominates observability budgets.

The optimization stack:
1. Sample low-value requests at the source.
2. Drop fields you don\'t query (debug fields, full bodies).
3. Tier hot vs cold retention.
4. Aggregate at ingestion (counts of "rate_limited" events per minute, not every event).`,
    whenToUse: [
      'Designing logging strategy for a new service — set the levels, structured format, and sampling rate up front',
      'Cost reviews — logs are usually the biggest line item; sampling/retention are the levers',
      'Incident-response gaps — "we couldn\'t find the right log" is fixed by structure + correlation IDs',
      'Compliance / audit — separate audit-log path with longer retention, no sampling',
    ],
    keyConcepts: [
      { term: 'Structured logging', definition: 'JSON or key-value lines instead of plain text. Queryable as data. Standard in 2026.' },
      { term: 'Log levels', definition: 'TRACE / DEBUG / INFO / WARN / ERROR / FATAL. Calibrate so INFO is rare; "everything at INFO" is a smell.' },
      { term: 'Sampling at source', definition: '1-10% of requests for high-volume services; 100% for errors / slow requests. Decide at the SDK, not the backend.' },
      { term: 'Correlation ID (trace_id)', definition: 'Propagated through every log line in a request. Lets you join logs to traces and metrics. OTel propagates automatically.' },
      { term: 'Log retention tiering', definition: 'Hot (queryable, days-weeks) + cold (archived, months-years). Major cost lever; tune per service.' },
    ],
    pitfalls: [
      'Logging full request/response bodies — explodes cost and risks PII leakage.',
      'Plain-text logs that require regex to query — slow incident response, unfriendly to indexing.',
      'No correlation ID — "find all logs for this user\'s session" requires timestamp guessing.',
      'Sampling at the backend (after ingestion) — you paid for ingestion before the drop. Sample at the SDK.',
      'Ignoring retention — Datadog default 15-day hot retention with no lifecycle = budget surprise.',
    ],
    keyQuestions: [
      {
        question: 'What\'s a good logging policy for a new service?',
        answer: `Five rules I\'d set on day 1:

**1. Structured JSON only.** No plain-text. Most languages have a logger that supports it: Python\'s structlog, Go\'s slog, Java\'s logback with JSON encoder, Node\'s pino.

**2. Calibrated levels.**
- ERROR: caught exceptions, request rejections, business-rule violations that propagate to user.
- WARN: handled but interesting (retries, fallbacks, deprecation).
- INFO: 1-3 lines per request — request received + request completed + 1 business-event.
- DEBUG: off in prod by default; toggleable per-request via header for live debugging.

**3. Correlation IDs propagated.** Every log line carries trace_id, span_id, user_id (if authenticated), request_id. OTel auto-propagates trace_id; the rest are explicit.

**4. Source-side sampling.**
- Errors and slow requests (>p95): 100%.
- Normal successful requests at high volume (>1000 req/sec): 1-10% based on trace_id (consistent across services for the same trace).
- Health checks: 0%.

**5. PII redaction.** Wrap fields known to contain PII (email, phone, address, token, password) with redaction at the logging layer. Whitelist of safe fields > blacklist of unsafe fields.

Plus: 7-day hot retention by default; longer retention for audit logs (separate stream); compress + tier to S3 after 7 days for the rest.

Cost-control fence: budget per service per day for log ingestion; alert when exceeded. Forces engineers to think before adding INFO.log() in a hot path.`,
      },
      {
        question: 'How do correlation IDs work in distributed systems?',
        answer: `Every request gets a **trace_id** (typically 128-bit random) generated at the entry point. The trace_id propagates with the request through every service it touches. Every log line written for that request includes the trace_id.

The mechanism:
1. **Entry point** (load balancer, gateway, or first service) generates trace_id, attaches to the request as an HTTP header — typically \`traceparent\` (W3C standard) or \`x-b3-traceid\` (Zipkin standard).
2. **Each service** reads the header, attaches it to its logger context (e.g., Python\'s contextvar, Go\'s context.Context, Java MDC). Every log line inside that request automatically gets the trace_id.
3. **When calling downstream services**, the service propagates the same header. Downstream services receive it and continue the chain.
4. **OpenTelemetry SDKs** do all of this automatically — auto-instrument the HTTP/gRPC client to inject the header outbound, auto-instrument the server to extract it inbound.

The query: \`trace_id="abc-123"\` → every log line from every service that touched this request, in time order. Combined with the trace itself (span tree showing where time went) and metrics (request counters tagged with the same trace_id via exemplars), you get a unified picture.

Without trace_id propagation:
- "Find all logs for this user complaint" requires guessing timestamps and grepping by user_id (if logged).
- Latency investigations stop at the first service boundary.
- Multi-service errors are stitched together by humans, slowly.

W3C \`traceparent\` is the modern standard — version + trace_id + span_id + flags. Format: \`00-<32-hex-trace-id>-<16-hex-span-id>-<2-hex-flags>\`. Adopted by every major OTel SDK.`,
      },
      {
        question: 'How do you reduce log costs without losing visibility?',
        answer: `Six levers, in rough order of impact:

**1. Sample at the source.** 1-10% of normal requests + 100% of errors / slow requests. Implement at the SDK level so you don\'t pay for ingestion. Most teams\' biggest single saving (50%+).

**2. Drop high-cardinality fields you don\'t query.** Fields like full request body, response body, internal IDs that aren\'t in any dashboard query — drop at the OTel collector before exporting.

**3. Aggregate at ingestion.** "rate_limited" events for the same user → metric counter, not per-event log. Vector and OTel collectors support log-to-metric conversion.

**4. Tier retention.** Hot (Loki / Datadog): 7-14 days for active debugging. Cold (S3 / GCS): 90+ days for compliance and forensics. Loki\'s tiered storage makes this nearly free.

**5. Sample DEBUG/INFO at higher rates than WARN/ERROR.** A 10% sample of INFO + 100% of WARN+ catches errors fully while cutting routine noise.

**6. Log levels as runtime config.** Default to INFO in prod; toggleable to DEBUG per-service or per-request when debugging. Some services run at WARN-only and only see logs when something\'s actually wrong.

Numbers: a $50K/month log bill, applying these typically gets you to $15K-$25K/month. The constraint isn\'t the technology; it\'s engineering discipline. The team that says "log everything, we\'ll worry about cost later" pays 5× what a cost-aware team pays.

Final guardrail: budget alerts per service. If service X\'s logs spike 2× overnight, page the team — usually it\'s a verbose stack trace in a hot path that someone added without sampling.`,
      },
    ],
    references: [
      'https://opentelemetry.io/docs/specs/otel/logs/',
      'https://grafana.com/docs/loki/latest/best-practices/',
      'https://www.honeycomb.io/blog/structured-events-basis-observability',
    ],
  },

  {
    id: 'distributed-tracing',
    title: 'Distributed Tracing — Spans, Sampling, OpenTelemetry',
    icon: 'gitBranch',
    color: '#06b6d4',
    questions: 3,
    description: 'How traces work, head vs tail sampling, and why traces are the highest-leverage signal for microservice debugging.',
    visualizations: [
      {
        title: 'Distributed trace — span tree across services',
        description: 'A trace is a tree of spans. Root span is the entry point; child spans are work done by downstream services. Parent-child links carry trace_id.',
        image: '/diagrams/sre/c6-trace.png',
      },
    ],
    introduction: `**Distributed tracing** answers a question metrics and logs can\'t: *"this user request took 5 seconds — where did the time go across our 12 services?"*

The mechanics:
- A **trace** represents one user request crossing service boundaries.
- A **span** represents one unit of work — typically one service handling part of the request, or one outbound RPC call.
- Spans share a **trace_id** and have **parent-child links** via **span_id** and **parent_span_id**.
- Each span carries: name, start time, duration, status (OK / error), and **attributes** (key-value annotations like http.method, db.statement, user.id).

A trace is the **tree of spans** for one request. Visualised, it\'s a "waterfall" showing the request entering at the root, fanning out to downstream services, with each span\'s duration drawn as a horizontal bar. The slowest span on the critical path is the bottleneck.

**The hard part: sampling.**
Tracing every request at full detail is prohibitively expensive at scale (10K req/sec × hundreds of attributes per span × tens of spans per trace = TB/day). Two strategies:

**Head sampling (decide at trace start)**
- Easy to implement: decide at the gateway "this trace is sampled at 10%."
- Problem: errors and slow requests are usually rare. A 10% head sample catches 10% of errors, missing the things you most want to see.

**Tail sampling (decide at trace end)**
- Wait for the trace to complete; sample 100% of error traces, 100% of slow traces, 1% of normal traces.
- Far more useful but more complex: requires a tail-sampling collector (e.g., OpenTelemetry tailsampling processor or a dedicated service like Honeycomb\'s sampler).
- Cost: hold every span in memory for ~30 seconds before deciding to keep or drop.

The 2026 best practice is **tail sampling for error / slow traces + head sampling for normal traces**. Or use Honeycomb\'s "dynamic sampling" which is similar.

**OpenTelemetry tracing** is now ubiquitous. The auto-instrumentation packages (otel-instrumentation-http, otel-instrumentation-pg, etc.) generate spans for HTTP, gRPC, database, and message-broker calls without code changes. Custom spans for business logic get added explicitly. Trace context propagates via W3C \`traceparent\` headers.

**What traces are great at:**
- Latency investigations — exact breakdown of where time went.
- Dependency mapping — which services call which, in what order.
- Root-cause analysis for distributed failures — see exactly which downstream call failed.
- N+1 query detection — see 50 sequential DB spans where 1 batched call would suffice.

**What traces are bad at:**
- High-volume aggregation (use metrics).
- Long-running processes (a 1-hour batch job has too many spans).
- Anomaly detection across populations (use metrics or wide events).`,
    whenToUse: [
      'Latency investigations across services — find the slow span',
      'Microservice dependency mapping — trace shows the actual graph, not the diagram',
      'New-service rollouts — verify the request path matches your design',
      'N+1 / chatty-pattern detection — sequential identical spans are the smell',
    ],
    keyConcepts: [
      { term: 'Trace', definition: 'One user request\'s end-to-end journey across services. Identified by a single trace_id.' },
      { term: 'Span', definition: 'One unit of work (a service\'s handling of part of a request, or an outbound call). Has name, start, duration, status, attributes.' },
      { term: 'Parent-child link', definition: 'Spans form a tree via parent_span_id. The root span is the entry point; child spans are downstream work.' },
      { term: 'Head sampling', definition: 'Decide at trace start (e.g., 10% of all requests). Easy but misses error / slow traces proportionally.' },
      { term: 'Tail sampling', definition: 'Decide at trace end. 100% of errors / slow + 1% of normal. More useful, requires hold-and-decide infrastructure.' },
      { term: 'W3C traceparent', definition: 'HTTP header standard for trace propagation. Every OTel SDK supports it; cross-vendor compatible.' },
    ],
    pitfalls: [
      'Head sampling at 10% missing 90% of errors. Combine with tail sampling or 100% sample errors.',
      'Spans without attributes — knowing "request hit service X" without knowing which user, which endpoint, what status is half-useful.',
      'No baggage propagation — trace_id propagates but business attributes (user_id, tenant_id) don\'t. Add them as resource attributes.',
      'Spans for hot loops — a span per loop iteration explodes data volume. Span the loop, count iterations as attribute.',
      'Storage retention too short. 1-3 days makes "investigate yesterday\'s slowness" impossible. 7-14 days is the typical good balance.',
    ],
    keyQuestions: [
      {
        question: 'How does head sampling differ from tail sampling — and which should I use?',
        answer: `**Head sampling**: decide at the gateway whether to record this trace. 10% sampled = 10% of requests have full traces, 90% are dropped. Simple — random decision based on trace_id.

**Tail sampling**: hold all spans in a buffer (typically 30s); when the trace completes, decide whether to keep based on properties. Common policy:
- 100% of traces with any error span.
- 100% of traces over Xms total duration.
- 1-5% of normal traces.

The use case difference:
- **Head sampling** is efficient (no buffering, decides instantly) but blind. Errors and slow requests have the same sampling rate as normal — you miss the interesting cases proportionally.
- **Tail sampling** preserves interesting traces at 100% and discards uninteresting ones aggressively. Better signal-to-noise but more complex (buffer memory, longer paths).

What I\'d use:
- **Low traffic (< 100 req/sec)**: 100% head sample. Storage is cheap at this volume.
- **Medium (100-10K req/sec)**: head sample at 100%, store traces 1-3 days only. OR head sample at 10-20% with errors at 100% via downstream filter.
- **High (10K+ req/sec)**: tail sample. 100% errors / slow + 1-5% normal. OpenTelemetry tail-sampling processor or Honeycomb dynamic sampling.

The biggest mistake is naive 1-10% head sample at high traffic — you\'ll consistently miss the rare bad-trace patterns that are the real reason you wanted tracing.`,
      },
      {
        question: 'What\'s the difference between a span attribute and a baggage item?',
        answer: `**Span attribute**: key-value attached to a single span. Lives in that span only. Available when querying the trace store. Example: \`http.method=GET, http.status_code=500, db.statement="SELECT * FROM users WHERE id=?"\`.

**Baggage**: key-value attached to the *trace context* and propagated automatically across service boundaries. Every service downstream sees the same baggage. Example: \`user.id=12345\`, \`tenant.id=acme\`, \`feature_flag.experiment_a=on\`.

Why both:
- **Attributes** describe what THIS span did. Specific to one service\'s work.
- **Baggage** describes properties of the request that all services should know. Authentication context, tenant ID, feature flag values, debug flags.

Practical use: \`debug=true\` baggage flag set by an internal user → every service sees it → every service logs at DEBUG and traces at 100% for that request. Powerful for live troubleshooting.

Caveat: baggage adds overhead to every outbound RPC (extra HTTP header bytes). Don\'t put large values in baggage — keep it to small identifiers and flags. The W3C standard limits baggage to 8KB total and 4KB per item.

Another caveat: baggage often is **not** automatically applied to spans as attributes. You have to explicitly read baggage and set it as a span attribute if you want it queryable in the trace store. Some libraries (Honeycomb\'s) do this automatically; OTel doesn\'t by default.`,
      },
      {
        question: 'Distributed tracing has overhead. How do you minimise it?',
        answer: `Three categories of overhead and their fixes:

**1. CPU overhead in the SDK** (typically 1-5% of request CPU).
- Use OTel SDKs in their async/batched mode (default). Synchronous spans block the request.
- Don\'t span hot loops — span the outer operation, count iterations as attribute.
- Avoid expensive attribute computation. Don\'t serialize a 10MB struct as an attribute.
- For ultra-hot paths: opt out (no spans for the literal hottest endpoint) and rely on metrics + sampling.

**2. Network overhead** (small per request, large in aggregate).
- Tracing data goes to the OTel collector (usually localhost). Local UDP / Unix socket = sub-microsecond.
- Collector batches and exports to backend. Batch interval is 1-10s; tune based on memory/latency tradeoff.
- Compression (gRPC default) makes the export bandwidth ~10× smaller.

**3. Storage and processing overhead** (the dominant cost).
- Sampling (head + tail) is the main lever. 100% sample is rarely necessary.
- Drop low-value attributes at the collector before export. Common candidates: full URL paths (use the route template instead), large request/response bodies, internal IDs.
- Tier hot vs cold storage. Tempo and Honeycomb support this; Datadog charges flat.

What I\'d tell a team setting up tracing: aim for **<5% CPU overhead, <2% additional network, and 1-5% sampling at scale**. Anything more and you\'re paying for visibility you\'re not using; anything less and traces start to lie.`,
      },
    ],
    references: [
      'https://opentelemetry.io/docs/concepts/signals/traces/',
      'https://www.honeycomb.io/blog/distributed-tracing-cheat-sheet',
      'https://www.w3.org/TR/trace-context/',
    ],
  },

  {
    id: 'alerting-philosophy',
    title: 'Alerting Philosophy — Page on Symptoms, Not Causes',
    icon: 'alertTriangle',
    color: '#06b6d4',
    questions: 3,
    description: 'The SRE Book\'s alerting principles, multi-window multi-burn-rate, and avoiding alert fatigue.',
    introduction: `Alerting is where observability meets human attention. Bad alerting is the leading cause of SRE burnout. Good alerting is rare and load-bearing.

**The SRE Book\'s core principle (Ch 6, paraphrased):** alert on **symptoms**, not on **causes**. *"Did something break?" is a better question than "Is the database CPU above 90%?"*

Why: most causes don\'t matter. The DB at 90% CPU might be perfectly serving traffic. Pager you for a cause-based threshold and you wake up an SRE for nothing. Pager you only when **users are actually affected** (latency spike, error rate spike) and the page reflects a real problem.

**The five qualities of a good alert** (from SRE Book Ch 6 + workbook):
1. **Actionable** — someone can do something. Information-only "FYI, X happened" belongs on a dashboard, not a page.
2. **Precise** — the alert itself tells you what\'s broken and where. "p99 latency on checkout-service > 500ms in us-east-1" beats "something is slow."
3. **Timely** — fires fast enough to mitigate before users notice (or get worse).
4. **Not noisy** — false-positive rate is low; SREs don\'t snooze it reflexively.
5. **Linked to a runbook** — the page is paired with documented investigation steps.

**The fundamental tension**: speed vs precision. Fast alerts have more false positives; precise alerts come too late. **Multi-window multi-burn-rate** alerting is the canonical solution from SRE Workbook Ch 5:

- **Long window** (e.g., 1 hour) catches the trend with high precision but is slow.
- **Short window** (e.g., 5 min) confirms the trend is current.
- **AND-gate them**: both must fire to page.

The math: if 30 days of error budget burns at 14.4× normal, you exhaust 2% of budget in 1 hour. That\'s actionable now. Pair it with a 5-minute window confirming "still burning."

Recommended setup (Workbook):
- **Page-rate-fast**: 14.4× burn over 1h AND over 5m → PAGE (fast, urgent).
- **Page-rate-medium**: 6× burn over 6h AND over 30m → PAGE (slower, sustained).
- **Ticket-rate-slow**: 1× burn over 3d AND over 6h → TICKET (no page, long-term issue).

This catches three different incident shapes: explosive (immediate), sustained (a few hours), slow-creep (days). All three need response; only the first deserves a page.

**Alert fatigue** is the practical failure mode. Symptoms:
- SREs reflexively dismiss pages.
- New SREs don\'t know which pages matter.
- "Always firing" alerts that never get fixed.
The fix is brutal: every alert must be actionable; every page must have a runbook; track noisy-alert metrics and kill alerts that fire >3× without action.

Postmortem hygiene: every alert that fires should be reviewed weekly. Was it actionable? Did the runbook help? Does it need to fire faster, slower, or be deleted?`,
    whenToUse: [
      'Designing alerts for a new service — start from SLOs, derive burn-rate alerts',
      'Reviewing on-call burden — count pages/week, identify noisy alerts to kill',
      'Postmortems — was the alert that fired the right one? Did it page early enough?',
      'On-call handbook — every page should link to a runbook',
    ],
    keyConcepts: [
      { term: 'Alert on symptoms', definition: '"Did something break for the user?" beats "is some internal metric over a threshold?". Symptoms = SLI deviation; causes = internal saturation.' },
      { term: 'Multi-window multi-burn-rate', definition: 'Long window for trend (precision) + short window for currency (speed) + burn-rate threshold based on error budget. SRE Workbook Ch 5 canonical formula.' },
      { term: 'Page vs ticket', definition: 'Page = wake someone now. Ticket = work item for next business day. Slow burns get tickets; fast burns get pages.' },
      { term: 'Actionable', definition: 'A first quality of any alert — someone can do something. If no action, it\'s a dashboard, not a page.' },
      { term: 'Runbook', definition: 'Investigation + mitigation steps for an alert. Every alert links to one. SRE\'s test: a new on-call could resolve from the runbook alone.' },
      { term: 'Alert fatigue', definition: 'SREs ignore pages because too many fire without merit. Cure: kill noisy alerts, every alert actionable.' },
    ],
    pitfalls: [
      'Cause-based alerts — DB CPU, JVM heap, queue depth — page at thresholds that don\'t map to user pain.',
      'Single-window alerts that fire on transient blips. 5 minutes of error spike is noise; 1 hour is real.',
      'Pages without runbooks. New on-call is paralyzed when paged at 3am.',
      'Alerts that always fire and are always ignored. Either fix the underlying issue or delete the alert.',
      'Page on every minor SLO breach. SLOs are 30-day budgets; minor 1-hour burns are normal noise.',
    ],
    keyQuestions: [
      {
        question: 'Walk me through multi-window multi-burn-rate alerting.',
        answer: `From SRE Workbook Ch 5. The intuition: error budget = 1 - SLO. A 99.9% SLO over 30 days = 0.1% × 30 × 24 × 60 = ~43 minutes of allowable badness per month. The "burn rate" is how fast you\'re consuming that budget.

A burn rate of 1× means you\'re using budget at the steady-state rate (43 min over 30 days = 1.4 sec/min). At this rate, you exhaust budget at exactly day 30. Sustainable.

A burn rate of 14.4× means you\'re using budget 14.4× faster — you\'d exhaust the entire 30-day budget in **2 hours**. That\'s an emergency.

The canonical alert recipe:
- **Fast (14.4× over 1h AND over 5m)**: would burn 2% of budget per hour. Page immediately. Catches explosive incidents.
- **Medium (6× over 6h AND over 30m)**: would burn 5% of budget over 6 hours. Page. Catches sustained incidents.
- **Slow (1× over 3d AND over 6h)**: would burn 10% of budget over 3 days. Ticket (no page). Catches slow-burn problems.

Why the AND-gate: the long window (1h, 6h, 3d) gives you statistical precision — confirms the burn is real, not a 30-second blip. The short window (5m, 30m, 6h) gives you currency — confirms you\'re still burning right now, not that it ended an hour ago.

Without the short-window gate: a brief 30-second outage produces a 1-hour burn rate that fires for the next 60 minutes after the outage is resolved.

Without the long-window gate: a 30-second blip from a noisy collector pages on-call for nothing.

Together: the alert is precise AND timely. This is the alerting canon for SLO-based monitoring.`,
      },
      {
        question: 'Why is "DB CPU > 90%" usually a bad page?',
        answer: `Because **CPU usage isn\'t a user symptom** — it\'s an internal cause that may or may not correlate with user impact.

Concrete failure modes:
- **DB at 90% CPU + user latency = fine**: query optimizer is well-tuned, server has spare resources, p99 latency is unchanged. Pager fires; SRE looks at dashboards; nothing wrong; SRE goes back to bed. Noise.
- **DB at 30% CPU + user latency = catastrophic**: a pathological query is taking 30 seconds; only one query is running but it\'s blocking everyone. Cause-based monitor doesn\'t fire because CPU is fine. Users complain. SRE didn\'t get paged.

The pattern: **causes are weakly correlated with effects**. A given cause might be fine (90% CPU with optimized queries) or might be catastrophic (90% CPU with lock contention saturating worker threads). Without seeing the *user effect*, the page tells you nothing actionable.

The fix: alert on the **symptom** ("p99 latency on the database > 500ms") which captures the user effect regardless of root cause. Then, as a debugging aid, dashboards show the causes — when a symptom alert fires, the SRE looks at CPU, memory, lock waits, query plans, etc. to figure out the cause.

Cause-based alerts have *one valid use*: predictive paging on **leading indicators that cannot be detected via symptoms**. Disk-full at 95% is a cause but you want to page before disk-full at 100% causes write failures (the symptom). For these, cause-based alerts are right.

The rule of thumb: **only page on a cause if the symptom hasn\'t shown up yet but is imminent**. Otherwise: page on the symptom; debug the cause.`,
      },
      {
        question: 'How do you fix alert fatigue on an on-call team?',
        answer: `**Audit, kill, and rebuild from SLOs.**

The diagnostic step:
- Pull alert history for the last 30-90 days. Count pages per alert.
- Categorize each alert: actionable on-page (SRE took action), self-resolved (page fired but issue went away), false-positive (page fired with no underlying issue).
- The 80/20: usually 5-10 alerts produce 50%+ of pages. Of those, 30-50% are non-actionable.

The brutal kill list:
- **Self-resolving alerts**: change the trigger so they don\'t fire on transient blips. Add longer windows; add deduplication.
- **False-positive alerts**: either fix the alert (often by switching from cause to symptom) or delete it.
- **Always-firing alerts that everyone ignores**: delete. They\'re training people to ignore the pager.
- **Cause-based alerts duplicating symptom alerts**: keep symptom, kill cause. (If you have "DB CPU high" AND "DB latency high," kill the CPU one.)

The rebuild from SLOs:
- For each user-facing service, define 1-3 SLOs (availability + latency, sometimes quality).
- Create the multi-window multi-burn-rate alerts off those SLOs (3-6 alerts per SLO).
- Every alert has a runbook. No runbook = not a real alert.
- Promote pages to ticket-only when they don\'t need 3am attention; promote tickets to pages only when they do.

The cultural fix:
- Page-rate dashboard visible to the team. Track alerts/oncall-shift; aim for <5/week per engineer (industry healthy benchmark).
- Weekly alert review meeting. Every alert that fired the prior week reviewed: was it correct? Did the runbook help? Should it be tuned, killed, or kept?
- Rotation reviews after every shift: was that a sustainable load?

The first month is painful — you\'re killing alerts and people are nervous. The result is on-call shifts where pages reflect real problems, and engineers want to be on the rotation instead of dreading it.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/monitoring-distributed-systems/',
      'https://sre.google/workbook/alerting-on-slos/',
    ],
  },

  {
    id: 'dashboards-design',
    title: 'Dashboards — Hierarchy, Heatmaps, USE/RED Layouts',
    icon: 'layout',
    color: '#06b6d4',
    questions: 3,
    description: 'Dashboard hierarchy (overview → service → resource), heatmaps for tail latency, and what NOT to put on a dashboard.',
    introduction: `Dashboards are how humans consume metrics. Bad dashboards are noise; great dashboards orient on-call instantly.

**The hierarchy that works:**

**1. Overview / executive dashboard** — top-level health for the whole product or company.
- 5-15 panels, all SLO-derived.
- Each panel = one user-facing SLO ("Checkout availability 30d", "Search latency p99 p99").
- Color: green/yellow/red against SLO target.
- Used by: leadership, engineering directors, on-call entry point.

**2. Service-level dashboards** — one per service, RED-method or Four Golden Signals layout.
- Top row: Rate, Errors, Duration (or Traffic, Errors, Latency, Saturation).
- Middle: per-endpoint or per-route breakdowns.
- Bottom: dependency health (downstream service latencies, DB query rates).
- Used by: service team, on-call SRE during incidents.

**3. Resource dashboards** — per-host or per-resource USE-method layout.
- CPU utilization + saturation; memory; disk; network.
- Used by: infrastructure / platform team, deep debugging.

The rule: **drill down from overview → service → resource**. Overview alert fires → SRE lands on overview dashboard → identifies which service is unhealthy → drills into service dashboard → identifies which dependency or which host → drills into resource dashboard. Each level\'s purpose is to **point you at the next level\'s right view**.

**What goes on a dashboard:**
- ✓ SLO-relevant metrics for the time window.
- ✓ Histograms for latency (heatmap with p50/p95/p99 lines).
- ✓ Recent deployment markers (overlay events on timelines).
- ✓ Counts grouped by relevant dimension (errors by endpoint, latencies by route).

**What does NOT go on a dashboard:**
- ✗ Internal cause-based metrics that don\'t correlate to user pain (random JVM gauges).
- ✗ "Everything we have" (clutter — link to detail dashboards instead).
- ✗ Single-data-point gauges that should be alerts ("disk full!" — make it an alert).
- ✗ Stale metrics nobody looks at (delete; revive when needed).

**Heatmaps for latency.**
A line graph of "average latency" hides bimodality. A **heatmap** plots each request\'s latency on the Y-axis vs time on the X-axis, with color showing density. You instantly see:
- Most requests are at 50ms (dense band there).
- 5% are at 5000ms (faint band there).
- The bimodality is visible; the average lies.

Good observability tools (Grafana, Datadog, Honeycomb) have heatmap widgets out of the box. Use them on every latency panel.

**Alert overlays.**
Show alerts that fired during the time window as horizontal bands or markers on the time axis. During an incident review, you see "alert X fired at 2:15pm" overlaid with the metric trend — saves correlation effort.

**Dashboard-as-code.**
Don\'t click-build dashboards in the UI; check them into version control. Grafana JSON, Datadog Terraform provider, Honeycomb terraform module. Reviews catch bad metrics before they ship; rollback is git revert.`,
    whenToUse: [
      'Designing dashboards for a new service or product',
      'Reviewing existing dashboards — are they still aligned with current SLOs?',
      'On-call handover — does the dashboard set let a new on-call orient in <5 minutes?',
      'Postmortems — could the dashboards have surfaced this incident faster?',
    ],
    keyConcepts: [
      { term: 'Three-tier hierarchy', definition: 'Overview (SLO-driven) → Service (RED/Golden) → Resource (USE). Each tier points to the next.' },
      { term: 'Heatmap', definition: 'Latency density over time. Reveals bimodality that means / percentile lines hide. Standard widget in Grafana, Datadog, Honeycomb.' },
      { term: 'Deployment markers', definition: 'Overlay deploy events on metric timelines. "Did the deploy at 2pm cause the latency spike at 2:01pm?" — visible at a glance.' },
      { term: 'Dashboard-as-code', definition: 'Dashboards in git (JSON / Terraform). Reviewable, rollback-able, reusable across services.' },
      { term: 'Cardinality cost', definition: 'Per-user or per-request dashboards mean huge cardinality on the metrics layer. Aggregate at the metric level; drill down via traces or logs.' },
    ],
    pitfalls: [
      'Dashboards full of "everything" — too much to read at a glance, useless under pressure.',
      'Mean / median latency only — hides tail and bimodality. Always include p99 and a heatmap.',
      'No deployment markers — incident timelines miss the "did the deploy cause this" question.',
      'Stale dashboards. "We refactored that service 6 months ago, this dashboard is wrong" → delete it.',
      'Click-built one-off dashboards. Lost when person leaves; not reviewable.',
    ],
    keyQuestions: [
      {
        question: 'How would you design dashboards for a new service?',
        answer: `Three-tier hierarchy:

**Tier 1: Overview** (1 dashboard, used by everyone)
- 5-10 panels, each one SLO. Color-coded green/yellow/red against target.
- "Service X — 30-day availability: 99.92% (target 99.9%)" + sparkline.
- Latency SLO panel: "p99 latency 30d: 387ms (target 500ms)" + sparkline.
- Error budget remaining: "94% / 30d remaining (35h consumed)".
- Designed for 30-second glance during a stand-up or incident triage.

**Tier 2: Service health** (1 per service, used by service team + on-call)
- RED-method top row: Rate (req/sec graph), Errors (% errors graph), Duration (heatmap with p50/p95/p99 lines).
- Per-endpoint breakdown: top 5 endpoints by request volume, each with rate + error rate + latency.
- Dependency latencies: latency to each downstream service (DB, cache, external API).
- Saturation: thread pool utilization, queue depths, connection pool usage.
- Recent deployment markers as event overlays.

**Tier 3: Resource / host** (1 per fleet, used by platform team)
- USE-method per-host panel grid: CPU util + saturation (load avg), memory used + page faults, disk %util + queue size, network errors.
- Pressure metrics (PSI on Linux 5.x+): CPU, memory, IO pressure as % time stalled.
- Annotated with autoscaling events.

The drill-down workflow: Overview alert fires → SRE lands on tier 1 → identifies which service → drills to tier 2 → identifies which dependency or which host → drills to tier 3 (or to logs / traces). Each tier is purpose-built for a different question.

Plus: every dashboard has a brief title text panel: "What this is for, what to look at first, what to drill into when X happens." Acts as inline runbook.`,
      },
      {
        question: 'Why are heatmaps better than "average latency" for tail-latency monitoring?',
        answer: `Because **averages and percentile lines hide bimodality**.

Concrete: imagine 95% of requests at 50ms and 5% at 5000ms. The mean is 297ms; the p99 is 5000ms. Show both on a line chart and you see two lines moving over time — informative.

But a heatmap shows the **distribution of every request**: a dense band at 50ms (where most requests live) AND a faint band at 5000ms (where the slow ones are). You see at a glance that the latency is **bimodal**, not "everyone is at the average."

Why this matters:
- A change that "improves the mean by 10%" by making the 50ms band tighter while keeping the 5000ms band the same has no user benefit.
- A change that "improves the mean by 10%" by eliminating the 5000ms band is a major win.
- Both look identical on a mean-latency chart. The heatmap distinguishes them.

Other things heatmaps reveal:
- **Daily traffic patterns**: peak hours produce a heavier band; off-peak is lighter. Visible at a glance.
- **Slow-burn regressions**: a deploy that adds 20ms to the slow band is invisible in p99 (already 5000ms ± noise) but visible as a band shift in the heatmap.
- **Latency regimes**: cache hits at 5ms, cache misses at 200ms — visible as two distinct bands.

Implementation: Grafana\'s heatmap panel + Prometheus histogram metrics is the standard. Datadog has \`avg\` / \`p99\` / "distribution" — pick distribution. Honeycomb shows distribution natively because the underlying data is event-shaped.

The mistake to avoid: heatmaps with too few buckets look discrete and lose the "see the distribution" benefit. Use exponentially-bucketed histograms (Prometheus default) for good resolution at low and high latencies.`,
      },
      {
        question: 'What\'s the right way to put deployment markers on dashboards?',
        answer: `**Treat deploys as discrete events; overlay them on metric timelines as vertical lines or shaded bands.**

The mechanism:
- Every deploy emits an event to your metrics backend at deploy-start and deploy-finish. Most CI systems (GitHub Actions, GitLab, Jenkins, ArgoCD) have plugins for this; OTel events / Prometheus events also work.
- The dashboard\'s graph widgets render these events as vertical markers on the time axis with a hover-tooltip showing version, deployer, link to the diff.

The use case (the killer one): incident triage at 2am.
- Pager fires: "p99 latency spiked on checkout-service."
- SRE opens dashboard. Sees the latency spike at 2:01am.
- Sees a deployment marker at 2:00am — labeled "v3.2.1, deployed by alice, link to PR".
- Click → diff is visible. Often the cause is obvious from the diff.
- **Roll back. Investigate fully tomorrow.**
- Total time from page to mitigation: <5 minutes.

Without deployment markers: SRE sees the spike, opens 15 different dashboards looking for what changed, eventually checks the deploy log, finds the deployment from an hour ago, decides to roll back. Takes 30+ minutes.

Other event types worth overlaying:
- Feature flag flips (tied to flag-management tool).
- Autoscaling events (HPA scaled up / scaled down).
- Cloud provider incidents (overlay AWS Health events for the relevant region).
- Database migrations / schema changes.

The principle: **anything that COULD cause a metric change should be visible on the dashboard at the time it happened**. The minute saved during incidents is worth the minute spent setting it up.`,
      },
    ],
    references: [
      'https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/',
      'https://www.brendangregg.com/HeatMaps/',
      'https://sre.google/workbook/monitoring/',
    ],
  },

  {
    id: 'cardinality-cost',
    title: 'Cardinality, Volume, and the Cost of Observability',
    icon: 'database',
    color: '#06b6d4',
    questions: 3,
    description: 'Why cardinality blows up Prometheus, the math behind log/trace cost, and how to control them.',
    introduction: `Observability is one of the largest line items in modern infrastructure budgets. Datadog's S-1 reveals customers spending double-digit percentages of cloud spend on observability alone. Understanding the cost levers is now an SRE-grade skill.

**Cardinality** is the number of distinct combinations of label values for a metric. \`http_requests_total{service, route, status, method}\` with 5 services × 100 routes × 10 statuses × 5 methods = **25,000 time series**. Add \`user_id\` as a label and your 100K-user system becomes 25,000 × 100,000 = **2.5 billion time series**. Prometheus chokes on millions; billions are an OOM.

The rule: **labels are dimensions, not data**. \`user_id\` is data; it doesn\'t belong as a metric label. Use logs or traces (which are event-shaped, naturally high-cardinality) instead.

**Cardinality bombs** are the leading cause of Prometheus / observability outages:
- Unbounded label values: \`{path="/users/12345"}\` instead of \`{route="/users/:id"}\`.
- User IDs, session IDs, request IDs, IP addresses as labels.
- Free-form labels from clients that you don\'t sanitize.

**Logs and traces are inherently high-cardinality** — that's the design. But they cost more:

**The math for logs.**
Per-event size × event rate × retention.
- 2 KB / event (structured, ~20 fields) × 5K events/sec × 86,400 sec/day = 864 GB/day raw.
- Compressed (gzip / zstd ~5×): ~170 GB/day stored.
- 30-day hot retention: 5 TB.
- At Datadog\'s ~$2/GB ingest + $0.25/GB/month storage: **$1,725 ingest + $1,250 storage = ~$3,000/month** for one mid-sized service.

**The math for traces.**
Per-span size × spans/trace × trace rate × sampling.
- 500 bytes / span (compressed) × 10 spans / trace × 1K traces/sec sampled at 10% × 86,400 sec/day = 4.3 GB/day.
- 7-day retention: 30 GB. Cheap... unless you sample at 100%, which makes it 43 GB/day = 300 GB/week.

**The math for metrics.**
Series count × scrape interval × cardinality × retention.
- 10,000 series × 4 bytes/sample × 60 samples/min × 1440 min/day = 3.5 GB/day raw.
- Prometheus's WAL + compression: ~250 MB/day.
- 30-day retention: 7.5 GB. Cheap.
- BUT: blow cardinality to 10M series and you've multiplied by 1000× → 250 GB/day. OOM.

**The optimization stack:**
1. **Bound cardinality at the SDK.** Strip user_id from metric labels; use it in logs/traces only.
2. **Sample at the source.** 1-10% of normal requests; 100% of errors / slow.
3. **Tier retention.** Hot 7-14d (queryable in seconds), cold 30-365d (S3/GCS, queryable in minutes).
4. **Drop high-cost fields you don't query.** Full request bodies, debug fields, internal IDs.
5. **Pre-aggregate.** Counter "rate-limited events per user-hour" instead of one log per event.
6. **Per-service budgets.** $X/month/service ceiling; alert on 2× spike.

**The 2026 observability cost trend:** every team I see at >50 services has a "cost optimization" workstream. Common moves: leaving Datadog for LGTM (5-10× cheaper), aggressive tail sampling, retention tier-down, killing duplicate metrics.`,
    whenToUse: [
      'Designing observability for a new service — set cardinality and sampling policy upfront',
      'Cost-reduction projects — almost every observability cost optimization starts with cardinality and sampling audit',
      'Capacity planning — Prometheus / Tempo / Loki sizing depends on these numbers',
      'Vendor evaluation — pricing models map to these dimensions',
    ],
    keyConcepts: [
      { term: 'Cardinality', definition: 'Number of distinct label combinations on a metric. Linear in label distinct-values; multiplicative across labels.' },
      { term: 'Cardinality bomb', definition: 'A label that takes unbounded values (user_id, request_id, IP) explodes the time-series count and OOMs Prometheus.' },
      { term: 'Sampling policy', definition: 'Head sampling at gateway (% of all traces) + tail sampling at collector (% by error / latency). Standard 1-10% + 100% errors.' },
      { term: 'Retention tiering', definition: 'Hot (queryable, days) + cold (archived, months/years). Loki, Tempo, Mimir support tiered storage natively.' },
      { term: 'Pre-aggregation', definition: 'Convert per-event logs to per-time-window metrics. "rate_limited per user per hour" instead of per-event log.' },
    ],
    pitfalls: [
      'user_id, IP, request_id, path-with-args as metric labels. Cardinality bombs.',
      'Logging 100% of requests at 10K req/sec without sampling.',
      'Storing all observability data hot indefinitely.',
      'Not measuring per-service cost. Without per-service attribution, you can\'t prioritize where to optimize.',
      'Datadog default 15-day hot retention without lifecycle. Bills compound silently.',
    ],
    keyQuestions: [
      {
        question: 'I added a metric label and Prometheus is OOMing. Why?',
        answer: `**Cardinality explosion.** You added a label whose value space is too large.

The math: cardinality = product of distinct values across all labels. \`http_requests_total{service, route, status, user_id}\` with 5 services × 100 routes × 10 statuses × 100,000 users = **500 million time series**. Each series is a few bytes in Prometheus's internal index but the index itself becomes huge — and every scrape generates thousands of new series for new user_ids.

How to identify the bad label:
- Run \`topk(20, count by (__name__)({}))\` to find your most-cardinal metrics.
- For a suspected metric, check distinct label-values: \`count(count by (user_id) (http_requests_total))\`.
- The offender is usually obvious from the count.

The fix:
1. **Drop the bad label.** \`relabel_config\` or rewrite at the SDK to drop \`user_id\` from the metric.
2. **Replace with a lower-cardinality dimension.** "user_tier" (free / pro / team) is bounded; "user_id" is not.
3. **Move that dimension to logs/traces.** Logs and traces handle high cardinality well; metrics don't.

Recovery:
- The bad time series are still in Prometheus storage. Restart with \`--storage.tsdb.head-chunks-write-queue-size\` increased; let Prometheus drop them after retention.
- For acute OOM: drop the time series with \`tsdb delete\`-style API, or cycle the Prometheus instance with the bad metric blocked at the scrape-config relabel.

Prevention:
- Lint metric definitions in CI. Datadog and Honeycomb have linters; for Prometheus, write your own (regex-check for \`*_id\` suffixes in label names).
- Set \`scrape_config\` cardinality limits — Prometheus will refuse to scrape series beyond a limit.
- Use \`metricsstats\` from Grafana to find leaking metrics.`,
      },
      {
        question: 'How do you decide on a trace sampling rate?',
        answer: `Two-stage sampling, calibrated to volume and cost:

**Stage 1: Head sampling at the gateway.**
- Decide trace_id-deterministically (so all services for the same trace agree). Use the last byte of trace_id; if < N, sample.
- For low-volume services (<100 req/sec): 100% head sample. Cost is fine.
- For mid-volume (100-10K req/sec): 10-50% head sample. Balance visibility and cost.
- For high-volume (10K+ req/sec): 1-10% head sample. Combined with stage 2.

**Stage 2: Tail sampling at the collector.**
The OTel tail-sampling processor (or Honeycomb's dynamic sampling, or AWS X-Ray's adaptive sampling).
- 100% of traces with any error span — always keep.
- 100% of traces with duration > Xms (e.g., > p99 SLO target) — always keep.
- 1-10% of "normal" traces — based on traffic pattern.

The combined effect: you drop ~95% of normal traces; keep 100% of bad ones. Storage drops 10-20×; signal-to-noise improves dramatically.

Calibration knobs:
- **Cost target**: I want to spend $X/month on traces. Work backward from $X to GB to events to sampling rate.
- **Visibility target**: I want to be able to investigate any 1-second-or-slower request. Tail-sample 100% of traces > 1s.
- **Error coverage target**: 100% of error traces always.

Example for a 10K req/sec service:
- 10% head sample → 1K traces/sec.
- Tail sampling: 5% of normal + 100% errors (~0.5%) + 100% slow (~0.5%) → ~1% effective sample.
- 100 traces/sec stored × 10 spans × 500B = 500 KB/sec = 43 GB/day.
- 7-day retention: 300 GB. Manageable.

Without sampling: 10K traces/sec × 10 spans × 500B = 50 MB/sec = 4.3 TB/day. Untenable.`,
      },
      {
        question: 'How would you cut a $200K/month Datadog bill?',
        answer: `Five-step playbook, in priority order:

**1. Audit cardinality and kill the bombs (typically 10-20% savings).**
- Find metrics with the highest cardinality; identify why. Often: a few metrics with user_id or path-with-args labels causing the bulk of the cost.
- Fix at the SDK; drop the bad labels.

**2. Sample logs aggressively (typically 30-50% savings).**
- Identify the verbose services (top 20% of log volume produce 80% of cost).
- Add source-side sampling: 1-10% of normal events + 100% of errors.
- Drop fields you don't query (full bodies, debug fields).

**3. Tier retention (typically 10-20% savings).**
- Datadog has retention tiers; most teams accept the default 15-day hot. Drop to 7-day hot + 30-day flex (cheaper).
- Logs you must retain for compliance: route to S3 directly via Datadog Forwarder; pay S3 prices, not Datadog prices.

**4. Reduce custom metrics (typically 5-15% savings).**
- Datadog charges per-custom-metric. 100 custom metrics × $0.05/metric/month × 1000 hosts = $5K/month. Audit the list; many "we'll need this" metrics never get queried.

**5. Tail sample traces (typically 5-10% savings if APM is used heavily).**
- Datadog APM is per-span priced. Tail-sample at the OTel collector level (or Datadog's dynamic-sampling) to keep 100% errors, 5-10% normal.

**The bigger move: hybrid stack.** For teams in the $100K+/month range, the cost-effective architecture is **OpenTelemetry instrumentation + LGTM for cheap signals (metrics, logs) + Datadog for premium debugging (APM traces, RUM)**. The OTel layer makes the split transparent. Typical result: 50-70% bill reduction with same or better visibility.

The hardest part is engineering buy-in: people are attached to the tools they know. But $200K/year is a senior SRE; the math usually wins.`,
      },
    ],
    references: [
      'https://prometheus.io/docs/practices/naming/',
      'https://opentelemetry.io/docs/concepts/sampling/',
      'https://www.honeycomb.io/blog/cost-of-observability',
    ],
  },
];
