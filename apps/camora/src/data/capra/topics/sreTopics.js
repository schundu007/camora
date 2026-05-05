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
  // Incidents
  'incident-command':          'incidents',
  'mttr-mttd-mttf':            'incidents',
  'incident-severity':         'incidents',
  'blameless-postmortems':     'incidents',
  'five-whys':                 'incidents',
  'incident-comms':            'incidents',
  'gamedays-chaos':            'incidents',
  // Automation
  'toil-quantified':           'automation',
  'iac-terraform-pulumi':      'automation',
  'cicd-progressive-delivery': 'automation',
  'gitops':                    'automation',
  'self-healing-systems':      'automation',
  // Capacity
  'capacity-planning-method':  'capacity',
  'forecasting-models':        'capacity',
  'load-testing':              'capacity',
  'autoscaling-strategies':    'capacity',
  'cost-vs-reliability':       'capacity',
  'database-capacity':         'capacity',
  // Reliability Patterns
  'circuit-breakers':          'patterns',
  'cascading-failure':         'patterns',
  'graceful-degradation':      'patterns',
  'retry-jitter-backoff':      'patterns',
  'load-shedding':             'patterns',
  'idempotency':               'patterns',
  'bulkheads':                 'patterns',
  'timeouts-deadlines':        'patterns',
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

  // ─────────────────────────────────────────────────────────────────────
  // D. Incident Management & Response
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'incident-command',
    title: 'Incident Command — IC, Ops Lead, Comms Lead',
    icon: 'alertTriangle',
    color: '#ef4444',
    questions: 4,
    description: 'The Google IRT structure (modeled on FEMA ICS): three roles, why "IC does not type," and when to escalate.',
    visualizations: [
      {
        title: 'Incident Command roles',
        description: 'IC delegates to Ops Lead (mitigation), Comms Lead (status updates). Planning Lead joins for incidents > 4h. SMEs are pulled in by Ops Lead, not the IC directly.',
        image: '/diagrams/sre/d1-incident-roles.png',
      },
    ],
    introduction: `Google's incident response framework (SRE Book Ch 14) is **modeled on FEMA's Incident Command System (ICS)** — the same structure US wildland firefighters and emergency responders use. The core idea: **separate command from execution.**

Three roles, always:

**1. Incident Commander (IC)** — coordinates the response.
- Decides priorities ("we mitigate first, investigate later").
- Delegates work; *does not type commands themselves.*
- Runs the bridge / call.
- Decides escalation.
- Ends the incident when it's mitigated.

The "IC does not type" rule is load-bearing. If the IC is also fixing the issue, they can't see the bigger picture, can't coordinate other people, and can't communicate. Famous war story: an IC trying to debug while running the call missed a parallel issue that compounded the outage. The role is full-time during an incident.

**2. Operations Lead (Ops Lead / Incident Response Lead)** — executes the technical mitigation.
- Reads dashboards, runs commands, makes changes.
- Pulls in SMEs (database expert, network expert, the team that owns the broken service).
- Reports findings to the IC.

**3. Communications Lead (Comms Lead)** — updates everyone outside the response.
- Posts on the status page (if customer-impacting).
- Updates internal Slack channel every 15-30 minutes.
- Briefs executives.
- Drafts the customer comms.

For incidents that go past 4 hours, a **fourth role**: **Planning Lead** — manages handoffs between shifts, owns the timeline document, makes sure context isn't lost when the IC changes.

**The handoff structure (verbatim from SRE Book Ch 14):**
- **Always declare an incident** when more than one engineer is involved, or when the issue impacts users.
- **The first responder becomes IC by default** — until handed off.
- **Hand off explicitly**: "John, you are now IC. I am no longer IC." Acknowledged. Otherwise two people think they're IC and decisions don't get made.

**Communication channels.** Every incident has its own:
- **Bridge / video call** for active discussion.
- **Slack / chat channel** for written status, links, error messages, runbook references.
- **Document / Google Doc** for the running timeline (who did what, when).

Don't mix them. Voice is for discussion; chat is for the durable record; doc is for the timeline. Engineers asking "what's the latest?" should be able to read chat or the doc and catch up without joining the bridge.

**Escalation.** Page-the-IC is itself an escalation. The IC's escalation toolkit:
- Page another IC (peer support; rare).
- Page a senior engineer (deep technical knowledge).
- Page leadership (financial-impact incidents).
- Activate vendor support (cloud incidents — AWS, GCP, Datadog).

**End of incident.** The IC declares "incident resolved" when the symptom is mitigated. **This is not the same as "root cause identified."** Mitigation first; root cause later in the postmortem.`,
    whenToUse: [
      'Active incident — assigning IC + Ops Lead + Comms Lead is the first 60 seconds',
      'On-call training — every new SRE should have shadowed an IC and run an exercise',
      'Postmortem — was the incident command structure correct? Were roles confused?',
      'Designing the on-call rotation — who can be IC? It is a learned skill, not all SREs are ready.',
    ],
    keyConcepts: [
      { term: 'Incident Commander (IC)', definition: 'Coordinates the response; does not execute mitigations themselves. The "does not type" role.' },
      { term: 'Ops Lead', definition: 'Executes the mitigation. Reads dashboards, runs commands, pulls in SMEs.' },
      { term: 'Comms Lead', definition: 'Updates status page, Slack, executives, customers. Owns the external narrative during the incident.' },
      { term: 'Explicit handoff', definition: '"John, you are now IC. I am no longer IC." Acknowledged. Otherwise two ICs and unclear decisions.' },
      { term: 'Mitigation before root cause', definition: 'IC declares "resolved" when symptom is mitigated, not when root cause is found. Root cause goes into the postmortem.' },
      { term: 'FEMA ICS lineage', definition: 'Google\'s IRT framework is modeled on the US wildland firefighting Incident Command System — same structure, same separation of roles.' },
    ],
    pitfalls: [
      'IC also fixing the issue. They miss the bigger picture; communication suffers; parallel issues compound.',
      'No explicit handoff. Two people both think they\'re IC; conflicting decisions; nobody making decisions.',
      'Mixing voice / chat / doc. Engineers join late and can\'t catch up because the durable record is in voice.',
      'Comms Lead missing during a customer-impacting incident. Status page doesn\'t update; customers explode on Twitter.',
      'IC declaring "resolved" because the team thinks it\'s under control, before symptom is actually mitigated. Embarrassing if it re-fires.',
    ],
    keyQuestions: [
      {
        question: 'Walk me through the incident roles and why each exists.',
        answer: `Three roles in any meaningful incident:

**Incident Commander (IC)**: coordinates. Decides priorities ("mitigate first, investigate later"). Delegates work to Ops Lead and Comms Lead. **Does not type commands themselves.** Runs the bridge. Decides escalation. Ends the incident.

**Operations Lead (Ops Lead)**: executes the technical mitigation. Reads dashboards, runs commands, pulls in subject-matter experts. Reports findings up to IC. The "hands on the keyboard" role.

**Communications Lead (Comms Lead)**: updates everyone outside the response. Posts to status page, updates internal Slack every 15-30 min, briefs executives. Drafts customer comms. The external face of the incident.

For incidents > 4 hours: add a **Planning Lead** to manage shift handoffs and the timeline document.

The why:
- **IC does not type** because if they do, they lose situational awareness. They can't see the parallel issue brewing, they can't coordinate other responders, they can't decide priorities. The first lesson new ICs learn the hard way.
- **Comms Lead is separate** because comms is high-leverage and full-time. Every minute the status page is wrong is a minute customers are confused. An engineer juggling fixing AND updating the status page does both badly.
- **Ops Lead pulls in SMEs**, not the IC, because SMEs are interruptions to coordination. The Ops Lead absorbs the interruption; the IC stays focused.

Modeled on FEMA's ICS — the same structure US firefighters use. Battle-tested across decades and disciplines.`,
      },
      {
        question: 'When should you escalate vs handle it yourself?',
        answer: `Three triggers for escalation:

**1. Severity beyond your authority.** If the incident has high financial impact (e.g., > $X/min revenue loss) or affects a major customer/contract, page leadership. They need to know in real-time, not after the fact.

**2. Technical complexity beyond your knowledge.** If you've been at it 30 minutes and you don't know what's happening, page someone deeper. New on-call engineers especially: "I don't know how to fix this" is a valid trigger; trying to figure it out solo while the impact grows is not.

**3. Time exceeded.** Most teams have a "soft escalation" rule: if a P1 incident has been ongoing for X minutes (often 30-60), the on-call leader / manager is paged. Not because they take over, but because they know it's happening and can decide whether to call in more help.

Plus: vendor escalation. If the issue is cloud-side (AWS API errors, Datadog ingestion outage), file the support case immediately. Don't wait. Cloud vendors prioritize tickets by severity, and "we have an active incident" gets faster response than "we noticed something."

The discipline: **escalating early is rarely punished; escalating late is.** If you escalate and it turns out to be minor, the leader says "thanks for keeping me informed." If you don't escalate and it turns out to be major, the question is "why didn't you tell me?" — much worse.

The IC's escalation tools (above the standard on-call):
- Page another IC for peer support during a complex incident.
- Page a senior engineer / staff engineer for technical escalation.
- Page the SVP / CTO for high-financial-impact incidents.
- Activate vendor support (premium support contracts often have a 15-min response SLA for sev-1).`,
      },
      {
        question: 'You\'re paged at 3am as IC. Walk me through the first 5 minutes.',
        answer: `Standard playbook:

**0:00-0:30**: Acknowledge the page. Open laptop, join the bridge or open the incident Slack channel. Read the page text. Confirm I'm IC: "I have the IC role; if anyone disagrees, speak now."

**0:30-1:00**: Verify the incident exists. Check the dashboard the alert points to. Is the symptom real? Is it customer-facing? If yes, this is a real incident; continue. If the alert is bogus, mark it as such and go back to bed.

**1:00-2:00**: Assign roles.
- "Bob, you're Ops Lead. Drive the investigation. Pull in SMEs as needed."
- "Alice, you're Comms Lead. Post a status page incident now. Update Slack every 15 minutes."
- "I'm IC. Decisions go through me."

**2:00-3:00**: Set the cadence.
- "We'll hold a status check every 15 minutes."
- "Comms Lead: update the status page now with 'investigating, customer impact unknown'."
- "Ops Lead: what's our hypothesis? What are you trying first?"
- Open the incident timeline doc; pin the link in Slack.

**3:00-5:00**: Decide priorities and constraints.
- "Mitigation first. We can do a partial rollback even if we don't know why yet."
- "If this hits 30 minutes without progress, I'm escalating to the staff engineer."
- "Ops Lead: what's the blast radius if we roll back?"

The mindset: **I am not fixing this. I am making sure the right people are fixing it correctly.** The first 5 minutes is about establishing structure so the next hour goes smoothly.`,
      },
      {
        question: 'When does IC declare an incident resolved?',
        answer: `**When the symptom is mitigated** — not when the root cause is identified, not when everyone is happy with the explanation.

The criteria:
- The user-visible problem is gone (latency back to normal, error rate back to baseline).
- The mitigation is stable (the underlying condition isn't going to re-fire in 5 minutes).
- The fix is documented well enough that the next on-call shift can pick it up.

What happens after "resolved":
- Comms Lead posts final update on status page ("Resolved: at 03:42 UTC, the incident was mitigated by rolling back deploy v3.2.1...").
- IC initiates the postmortem. Often: assigns the postmortem owner (usually Ops Lead).
- IC asks: "anything to monitor in the next 24h?" Usually a few specific dashboards or alerts.

What does NOT happen:
- Root cause isn't required for resolution. We mitigated. Root cause analysis can take days.
- Postmortem isn't required for resolution. The postmortem is async; resolution is now.
- "Definitely understanding what happened" isn't required. We can mitigate without understanding. Investigate later.

The cultural risk: declaring resolved too early. The symptom blip back, customers complain, and now we're re-fired with an embarrassed team. The fix is to **wait long enough to be confident**. After mitigation, watch the relevant dashboard for ~15 minutes. If the metric is stable, declare resolved. If it twitches, keep the incident open.

Quote from SRE Book Ch 14: *"The first priority is incident resolution... root-cause analysis should not block incident resolution."* Mitigate first, understand later.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/managing-incidents/',
      'https://response.pagerduty.com/training/incident_commander/',
      'https://www.fema.gov/emergency-managers/nims/components',
    ],
  },

  {
    id: 'mttr-mttd-mttf',
    title: 'Incident Metrics — MTTD, MTTR, MTBF, MTTF',
    icon: 'clock',
    color: '#ef4444',
    questions: 3,
    description: 'The four canonical incident metrics, what each measures, and which actually matter for SRE.',
    introduction: `The incident lifecycle has four canonical time measurements. They\'re used inconsistently across the industry; getting them precise matters in interviews and postmortems.

**MTTD — Mean Time To Detect.**
From "the issue starts" to "monitoring detects it." A measure of **observability quality**. If MTTD is 30 minutes, your monitoring is detecting issues 30 minutes after they begin — users are seeing them long before you know.

**MTTR — Mean Time To Resolve (or Recovery, or Repair, depending on source).**
From "the issue starts" (or "is detected" — definitions vary) to "the issue is resolved." A measure of **incident response quality**. The most-cited metric. Definitions vary:
- **TTR from incident start**: includes detection time. The "real" user-experienced duration.
- **TTR from detection**: excludes the undetected period. The response-time-only metric.
Be explicit about which you mean.

**MTBF — Mean Time Between Failures.**
Average time between consecutive failures of a *repairable* system. \`uptime + downtime / number_of_failures\`. Useful for planning maintenance windows and reliability budgets. Not actionable on a per-service basis.

**MTTF — Mean Time To Failure.**
Average time to failure for a *non-repairable* component (e.g., disk drives). Used for hardware reliability calculations. Less common in software contexts.

**Reliability formula:**
\`Availability = MTTF / (MTTF + MTTR)\` — for non-repairable.
\`Availability = MTBF / (MTBF + MTTR)\` — for repairable.

So: to improve availability, you can either **make failures less frequent** (raise MTBF) or **recover faster** (lower MTTR). For most modern services, lowering MTTR is the higher-leverage lever — failures are inevitable, but minutes-to-recover beats hours-to-recover dramatically on the availability number.

**Which metrics matter for SRE?**

The SRE-correct framing: **MTTR is the primary metric**, broken into MTTD + MTT-Mitigate + MTT-Resolve.

- **MTTD** drives observability investment (better alerts, more sensitive thresholds, synthetic monitoring).
- **MTT-Mitigate** (detection → mitigation) drives runbook quality, automation, on-call training.
- **MTT-Resolve** (detection → full resolution) drives root-cause-fix speed.

The SRE Book\'s Ch 14 argument: optimize for MTT-Mitigate over MTT-Resolve. Users care about whether the symptom is gone; they don\'t care that you found the root cause. Mitigation first; root cause in the postmortem.

**The metrics that DON\'T matter (or matter less):**
- **MTBF as a target** is misleading. Targeting "longer time between failures" without context can incentivize hiding small failures.
- **Hours-of-uptime** can be gamed by classifying outages narrowly.
- **Single-incident MTTR** is noise; only the trend over many incidents matters.

**Healthy benchmarks (from industry surveys):**
- MTTD: < 5 minutes for symptom-driven alerts; < 15 minutes for slow burns.
- MTT-Mitigate: < 30 minutes for P1 incidents; < 1 hour for P2.
- MTT-Resolve: 4-24 hours common; depends on root-cause complexity.
- MTBF: highly service-dependent; tracked for trends, not absolute targets.`,
    whenToUse: [
      'Postmortem analysis — break down each incident\'s MTTD / MTT-Mitigate / MTT-Resolve',
      'On-call program review — track MTTR trend over months; investigate regressions',
      'Observability investment — slow MTTD is the metric that justifies more monitoring',
      'Setting SLOs — availability math from MTBF / MTTR informs the SLO target',
    ],
    keyConcepts: [
      { term: 'MTTD', definition: 'Mean Time To Detect. Issue start → monitoring fires. Drives observability investment.' },
      { term: 'MTTR', definition: 'Mean Time To Resolve / Recovery. Definition varies; specify "from issue start" or "from detection." The most-cited metric.' },
      { term: 'MTT-Mitigate', definition: 'Sub-component of MTTR: detection → symptom mitigated (regardless of root cause). The user-experienced duration. SRE-correct optimization target.' },
      { term: 'MTBF', definition: 'Mean Time Between Failures. For repairable systems. Tracked for trend; rarely a useful target.' },
      { term: 'MTTF', definition: 'Mean Time To Failure. For non-repairable hardware (disks, etc.). Less common in software.' },
      { term: 'Availability formula', definition: 'Availability = MTBF / (MTBF + MTTR). Improving MTTR is usually the higher-leverage lever.' },
    ],
    keyQuestions: [
      {
        question: 'Define MTTD, MTTR, MTBF — and which matters most for SRE?',
        answer: `**MTTD (Mean Time To Detect)**: from issue start to monitoring detection. Measures observability.

**MTTR (Mean Time To Resolve / Recovery)**: from issue start (or from detection — be specific) to full resolution. Most-cited but ambiguous.

**MTBF (Mean Time Between Failures)**: average time between consecutive failures of a repairable system. \`uptime / failure_count\`.

The SRE-correct framing: **MTTR matters most**, broken into:
- **MTTD** — how long before we knew?
- **MTT-Mitigate** — how long from detection until symptom mitigated?
- **MTT-Resolve** — how long until fully resolved?

User-facing: **MTT-Mitigate** is what users feel. They don't care about your root cause — they care that the symptom is gone.

Why MTTR > MTBF as an optimization target:
- Modern services have unavoidable failure sources (deploys, dependencies, autoscaling events).
- Reducing MTBF requires reducing change velocity — usually unaffordable.
- Reducing MTTR is a win regardless of failure rate.

The math: availability = MTBF / (MTBF + MTTR). If MTBF is 30 days and MTTR is 1 hour, availability is 99.86%. Halve MTTR to 30 minutes → 99.93%. Same change to MTBF (60 days) → 99.93%. Equivalent gain, but halving MTTR is usually 10× cheaper than doubling MTBF.

The actionable program: invest in alerting (MTTD), runbooks + automation (MTT-Mitigate), and only tackle MTBF for the chronic-failure services where the failure mode itself is fixable.`,
      },
      {
        question: 'My MTTR is 4 hours. How do I diagnose it?',
        answer: `Decompose by stage and find the bottleneck.

For each recent incident, measure:
1. **Issue start to detection (MTTD)** — when did the symptom begin? When did the alert fire?
2. **Detection to acknowledgment** — alert fired → human on-call pages, opens laptop.
3. **Acknowledgment to investigation start** — laptop open → first useful dashboard / log query.
4. **Investigation to mitigation** — first useful query → symptom is gone.
5. **Mitigation to full resolution** — symptom gone → root cause fixed.

Plot the breakdown across, say, 20 incidents. The mode is usually obvious:
- **MTTD-heavy** (e.g., 90 of 240 minutes is just detection): observability gap. Symptom monitoring isn't sensitive enough; deploy markers missing; cause-based alerts firing late.
- **Acknowledgment-heavy** (e.g., 30 of 240 in ack): on-call pager isn't set up well; engineers asleep through pages; flaky pager apps.
- **Investigation-heavy** (e.g., 120 of 240 in investigation): runbooks missing or bad; dashboards not designed for incident triage; logs hard to query.
- **Mitigation-heavy** (e.g., 60 of 240 in mitigate): rollback is slow; mitigations aren\'t scripted; fear of running mitigation without IC permission.
- **Resolution-heavy**: the symptom is mitigated but the root-cause fix takes hours. This is fine — declare incident resolved at mitigation; root cause goes to postmortem follow-up.

The fix per category:
- MTTD-heavy → invest in alerting; symptom-based monitors; faster scrape intervals on critical metrics.
- Investigation-heavy → invest in runbooks and dashboards. The "5-minute orient" test.
- Mitigation-heavy → automate common mitigations (one-click rollback, one-click traffic-shift, one-click feature-flag-flip).

Healthy targets: MTTD < 5min, ack < 5min, investigation start < 5min, mitigation 5-30min for known-pattern incidents.`,
      },
      {
        question: 'What\'s the relationship between availability targets and MTTR?',
        answer: `\`Availability = MTBF / (MTBF + MTTR)\`

Worked example: target 99.99% availability (52 min/year of allowed downtime).
- If MTBF is 1 month (1 incident/month, 12/year), each incident must average **52 min / 12 = 4.33 min** to fit in the budget. Aggressive.
- If MTBF is 1 week (52 incidents/year), each must average **52 / 52 = 1 min**. Practically requires automated mitigation.
- If MTBF is 1 quarter (4/year), each can average **13 min**. Achievable with good response.

The implication: **availability targets imply MTTR targets**. If you target 99.99% but every incident takes 30 minutes to mitigate, you can only afford 1.7 incidents per year. Most services have more than that.

The two levers:
1. **Reduce incident frequency** (raise MTBF) — better testing, gradual deploys, dependency hardening, capacity buffers.
2. **Reduce time-to-mitigate** (lower MTTR) — automation, runbooks, on-call training, observability.

For most teams, lever 2 is cheaper. You can\'t prevent every incident; you CAN make every incident shorter.

Practical setting:
- Target 99.9% (8h 45min/year): MTTR can be 30-60 min, ~12-20 incidents/year. Comfortable.
- Target 99.95% (4h 22min/year): MTTR ~15-30 min, ~10 incidents/year. Tight.
- Target 99.99% (52 min/year): MTTR ~5-15 min, ~5-10 incidents/year. Hard. Requires automation.
- Target 99.999% (5 min/year): MTTR < 1 min. Practically requires automated failover and zero human-in-the-loop. Reserve for systems with truly catastrophic downtime cost.

The interview-quality framing: every "we want N nines" claim should come with an MTTR commitment. Otherwise it\'s aspirational, not engineered.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/managing-incidents/',
      'https://www.atlassian.com/incident-management/kpis/common-metrics',
    ],
  },

  {
    id: 'incident-severity',
    title: 'Severity Levels — SEV1/2/3/4 Definitions',
    icon: 'alertCircle',
    color: '#ef4444',
    questions: 3,
    description: 'Industry-standard SEV definitions, who responds at each level, and how to avoid sev-creep.',
    introduction: `Severity levels triage incident response. Get them wrong and you either page the on-call SRE for cosmetic UI bugs (alert fatigue) or wait business hours to fix a billing outage (career-limiting).

**Industry-standard four-tier model** (used by Google, Meta, Atlassian, PagerDuty, most major tech companies):

**SEV-1 (Critical) — major customer impact, all hands.**
- Service unavailable for many users; data loss occurring; revenue impact > $X/min.
- Response: page IC immediately, full incident command structure activated, status page updated within minutes, leadership informed.
- Example: full outage of the checkout flow; customer-data breach in progress; major region down.

**SEV-2 (Major) — significant customer impact, urgent.**
- Service degraded for many users; key feature unavailable; revenue impact present but not catastrophic.
- Response: page on-call immediately, IC may or may not be needed, status page updated, internal Slack-channel updates.
- Example: search latency spiked across the fleet; a major feature is returning errors; one of three regions is degraded.

**SEV-3 (Minor) — limited customer impact, business hours.**
- Affects some users or some features; workarounds available; not user-blocking for most.
- Response: ticket the on-call team; investigate during business hours; status page may not be needed.
- Example: a non-critical feature is slow; small subset of users hitting an edge-case error; degraded performance on a secondary feature.

**SEV-4 (Cosmetic / minor) — no real customer impact.**
- Visual bugs, internal tooling issues, things that look bad but don't block anyone.
- Response: open a ticket; standard backlog priority.
- Example: dashboard widget displays wrong tooltip; internal admin tool has a typo.

**The classification framework:**

For each incident, the IC asks:
1. **How many users affected?** Few / many / most / all.
2. **What's the user impact?** Cosmetic / degraded / blocked / data-loss.
3. **Is there a workaround?** Yes / no.
4. **What's the revenue / SLA impact?** None / minor / major / catastrophic.

The combination maps to a SEV level. The SRE Book\'s framing: be **conservative when escalating** (page even if unsure) but **aggressive when declassifying** (drop SEV when impact is contained).

**Sev-creep** is the failure mode where every issue gets classified as SEV-2 because nobody wants to be wrong. Result: pager fires on cosmetic bugs; SREs burn out; real SEV-1s get lost in the noise. Combat with:
- **Quarterly SEV-distribution review.** A healthy team has 1-2 SEV-1s/year, 5-15 SEV-2s/year, more SEV-3+. If you have 30 SEV-1s/year, you\'re sev-creeping.
- **Promote/demote during the incident.** If it starts as SEV-2 and turns out to be only one customer affected, demote to SEV-3. If it starts as SEV-3 and you discover data loss, promote to SEV-1.
- **SEV definitions reviewed annually.** Customer base, revenue, contract obligations change; SEV thresholds need updating.

**Rate-of-fire framing.** A 5-minute SEV-1 once a quarter is fine. A 5-minute SEV-1 once a week is a SEV-1 in disguise — the underlying brittleness IS the SEV-1.`,
    whenToUse: [
      'Active incident — assigning SEV in the first 60 seconds dictates response',
      'On-call training — every new SRE needs to know the SEV ladder',
      'Quarterly review — SEV distribution is a team-health metric',
      'Customer SLA negotiations — what a SEV-1 means is partly contractual',
    ],
    keyConcepts: [
      { term: 'SEV-1', definition: 'Critical. Many users blocked, data loss, or major revenue impact. Page immediately, full IC structure, status page.' },
      { term: 'SEV-2', definition: 'Major. Many users degraded, key feature unavailable. Page on-call, partial IC structure.' },
      { term: 'SEV-3', definition: 'Minor. Some users affected, workarounds available. Ticket; investigate during business hours.' },
      { term: 'SEV-4', definition: 'Cosmetic. No real user impact. Standard backlog ticket.' },
      { term: 'Sev-creep', definition: 'Tendency to classify incidents at higher SEV than warranted. Causes alert fatigue. Combat with regular distribution reviews.' },
      { term: 'Promote/demote during incident', definition: 'SEV is not fixed. If impact narrows, demote. If impact widens or data loss is discovered, promote.' },
    ],
    pitfalls: [
      'Static SEV definitions that don\'t evolve with the business. A revenue-cap that made sense 2 years ago is wrong now.',
      'Sev-creep: every incident is SEV-2 because nobody wants to be the person who under-called it.',
      'Mismatched on-call response. A SEV-1 paged to the engineer who can\'t mitigate is just delayed escalation.',
      'No demotion path. Incident starts as SEV-1 (correctly), impact narrows to one user, but stays SEV-1 → wastes responder energy.',
      'Conflating SEV with incident management complexity. A SEV-3 can be a 4-hour debug; a SEV-1 can be a 5-minute rollback.',
    ],
    keyQuestions: [
      {
        question: 'Walk me through SEV-1 to SEV-4 and how you classify.',
        answer: `Standard four-tier model:

**SEV-1**: critical user impact. Many users completely blocked, data loss in progress, or major revenue/contractual impact. Page IC, full incident command, status page, leadership informed. Example: checkout flow down, region-wide outage, customer-data breach.

**SEV-2**: significant impact. Many users degraded, a key feature unavailable, but workarounds may exist. Page on-call, status page often updated. Example: search latency spike, one feature returning errors, one of three regions degraded.

**SEV-3**: limited impact. Some users or features affected; workarounds available. Ticket and investigate during business hours. Example: non-critical feature slow, small subset of users with an edge case.

**SEV-4**: cosmetic. No real user impact. Standard backlog. Example: visual bug, internal tooling issue.

Classification framework:
1. How many users? (few → SEV-3/4; many → SEV-2; most/all → SEV-1)
2. What\'s the user impact? (cosmetic → SEV-4; degraded → SEV-3; blocked → SEV-2; data-loss → SEV-1)
3. Is there a workaround? (yes → drop one SEV; no → keep)
4. Revenue / SLA impact? (high → bump SEV up)

When in doubt: **err on the high side initially**. You can demote later. But don\'t under-call when paging.

The discipline is in **demoting**. Many incidents start as SEV-1 because we don\'t know the scope yet. As we learn it\'s narrower than feared, demote. A team that never demotes has sev-creep.`,
      },
      {
        question: 'How do you decide whether an incident is SEV-1 vs SEV-2?',
        answer: `Three discriminators:

**1. Blast radius.**
- SEV-1: most or all users affected.
- SEV-2: many users affected, but a substantial fraction unaffected.

If 100% of users see errors, it's SEV-1. If 30% see errors and 70% are fine, it's SEV-2. The dividing line varies by service; rule of thumb: if the *majority* of users are blocked, SEV-1.

**2. Severity of user impact.**
- SEV-1: blocked or experiencing data loss / corruption / billing errors.
- SEV-2: degraded but functional.

Even with smaller blast radius, if the impact is data-loss or financial (e.g., one customer is being billed wrong amounts), promote to SEV-1.

**3. Revenue / contract impact.**
- SEV-1: revenue loss is significant ($X/min, configurable per company), or a contractually-obligated customer is impacted.
- SEV-2: revenue impact present but small.

If the customer is a major enterprise account with a 99.99% SLA they\'re actively burning, that's a SEV-1 even if blast radius is small (one customer).

The rule: **if any one of the three is at SEV-1 level, the incident is SEV-1**. They're independent triggers.

Edge cases to watch:
- "Slow but working" — usually SEV-2; promotes to SEV-1 if latency is so bad that it's effectively blocking (e.g., 30-second response times during a checkout flow).
- "Errors but workaround available" — usually SEV-3; promotes to SEV-2 if the workaround isn't obvious or requires support contact.
- "Critical feature down for one customer" — depends on contract. Free-tier customer: SEV-3. Enterprise contract: SEV-2 or SEV-1 based on contract.`,
      },
      {
        question: 'How do you prevent sev-creep?',
        answer: `Three controls:

**1. Quarterly SEV-distribution review.**
- Pull all incidents from the quarter. Plot by SEV.
- Healthy distribution: ~5% SEV-1, ~25% SEV-2, ~50% SEV-3, ~20% SEV-4.
- If 40% are SEV-1, you have sev-creep. Audit the SEV-1s; demote retroactively if they shouldn\'t have been; track patterns.

**2. SEV-definition document with concrete thresholds.**
- "SEV-1 = >50% of active users see errors OR revenue loss > $5K/min OR data loss/corruption."
- Concrete numbers prevent "feels like a SEV-1" subjective calls.
- Reviewed annually; updated as business changes.

**3. Promote/demote culture.**
- Train on-call to demote during the incident if scope narrows. "Update: only 3 customers actually affected, this is now SEV-2."
- Cultural normalization: demoting isn\'t weakness; it\'s correct sev management.
- Make SEV change visible in the incident channel: "/sev demote SEV-2" with reason.

**4. Cost analysis of false-SEV-1.**
- Calculate "what does a SEV-1 page cost?" — engineer time, leadership distraction, status page update, customer comms, postmortem effort.
- For most companies: $5K-$20K of opportunity cost per SEV-1 page. False SEV-1s cost real money.
- Tracking and surfacing this number changes behavior.

**5. Lessons from postmortems.**
- Every SEV-1 postmortem includes "was this correctly classified?"
- A pattern of "in retrospect, this should have been a SEV-2" is the signal of sev-creep.

The cultural fix that works: leadership publicly demotes incidents that were over-classified. "Last week's SEV-1 was actually a SEV-2; here\'s what we learned about classification." Removes the political risk of correct classification.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/managing-incidents/',
      'https://response.pagerduty.com/before/severity_levels/',
      'https://www.atlassian.com/incident-management/kpis/severity-levels',
    ],
  },

  {
    id: 'blameless-postmortems',
    title: 'Blameless Postmortems — Format and Discipline',
    icon: 'fileText',
    color: '#ef4444',
    questions: 4,
    description: 'The Google SRE Book postmortem template, what "blameless" really means, and how to extract action items that ship.',
    visualizations: [
      {
        title: 'Postmortem flow — incident to action items',
        description: 'Incident resolved → draft within 5 days → cross-team blameless review → final published → action items with owners → tracked to completion.',
        image: '/diagrams/sre/d5-postmortem.png',
      },
    ],
    introduction: `**Blameless postmortems** are the SRE Book's most-quoted contribution to industry practice. The thesis: if humans fear blame, they\'ll hide failures, mitigate without disclosure, and the organization can\'t learn. Blameless culture is a prerequisite for honest incident analysis.

**"Blameless" doesn\'t mean "no consequences."** It means: focus on *systems*, not *individuals*. The framing: *"how did our system, our processes, and our tools make this failure possible?"* — not *"who pushed the bad code?"*. The action items are systemic fixes (better testing, better monitoring, better deploy gates), not "Bob will be more careful."

**The Google SRE Book postmortem template** (Ch 15) has stable structure:

**1. Title** — concise, descriptive. *"Checkout 50% error rate for 23 minutes due to deploy v3.2.1"*. Searchable.

**2. Authors** — typically the IC + Ops Lead.

**3. Status** — Draft / In Review / Final.

**4. Summary** — 1-3 sentences. What broke, when, who was affected, how we fixed it.

**5. Impact** — quantified. Number of users affected, revenue impact, SLO budget consumed, customer SLA implications.

**6. Detection** — how the incident was detected. Who noticed first (monitoring? customer report? engineer?). Time gap between issue start and detection.

**7. Root Causes** — *what specifically caused the failure*. Often multiple contributing factors. Use Five Whys (next topic). Avoid "user error" as a root cause; ask why the system permitted the user error.

**8. Resolution** — what stopped the bleeding. The mitigation step.

**9. Lessons Learned**:
- **What went well** — celebrate the good. Maybe detection was fast; maybe rollback was scripted; maybe comms were excellent.
- **What went poorly** — the painful list. Each item links to an action item.
- **Where we got lucky** — the underrated section. "If the on-call had been at lunch, we'd have been down for an hour." These are systemic vulnerabilities masked by good fortune.

**10. Timeline** — minute-by-minute, with timestamps. T-zero is incident detection (or, sometimes, incident start). Pulled from chat logs, alert history, dashboard screenshots. Disciplined timelines are the backbone of the postmortem.

**11. Action Items** — specific, owned, dated. Each is one of three categories:
- **Prevention** — make this failure mode impossible / harder.
- **Detection** — find this failure faster next time.
- **Mitigation** — recover faster next time.

Each action item: ticket number, owner, target date, priority.

**12. Supporting Information** — links to dashboards, logs, charts, screenshots, related postmortems.

**The publishing discipline:**
- **Time-bound**: draft within 5 business days; final within 10. Postmortem decay: people forget the details quickly.
- **Cross-team review**: stakeholders read the draft. Add missed perspectives.
- **Searchable**: postmortems live in a wiki, queryable by service, date, root cause. Ten years later, the next on-call should find it.
- **Linked from runbooks**: when a runbook covers a known failure pattern, link the seminal postmortem.

**The 1:1 ratio rule:** every incident → one postmortem. Even small ones. The discipline of writing teaches you more than the act of fixing.

**The SRE Book\'s postmortem inflation point:** Google publishes postmortems internally for any incident over a threshold (typically: customer impact > X minutes, revenue impact > $X, security event, novel failure mode). Below the threshold: lightweight "incident note" sufficient. Above: full postmortem.`,
    whenToUse: [
      'After every meaningful incident — within 5 business days, draft published',
      'Onboarding new SREs — read 5-10 postmortems from the team\'s history',
      'Before major migrations — review postmortems from similar past migrations',
      'Quarterly retrospectives — pattern-match across postmortems for systemic issues',
    ],
    keyConcepts: [
      { term: 'Blameless', definition: 'Focus on systems and processes, not on the person who pushed the change. Action items are systemic fixes.' },
      { term: 'Five Whys', definition: 'Iterative why-chain to find root cause. Each "why" peels back another layer; usually 5 is enough to reach systemic factors.' },
      { term: 'Where we got lucky', definition: 'Underrated postmortem section. The vulnerabilities that didn\'t bite this time but could have. Often the most learning.' },
      { term: 'Action item categorization', definition: 'Prevention / Detection / Mitigation. Categorizes investments and prevents over-prevention bias.' },
      { term: 'Time-bound publication', definition: 'Draft within 5 business days; final within 10. Detail decay is fast.' },
      { term: 'Postmortem index', definition: 'Searchable repository of past postmortems. Ten years later, the next on-call should find it.' },
    ],
    pitfalls: [
      '"Root cause: human error." The postmortem failed if the root cause is a person. Ask why the system permitted the error.',
      'Action items without owners or due dates. Become wishful thinking; never ship.',
      'Postmortem published 6 weeks after the incident. Memory has decayed; lessons less precise.',
      'No "where we got lucky" section. The cheap learning is left on the table.',
      'Postmortems read only by the team. The whole org needs to learn; cross-team distribution is part of the process.',
    ],
    keyQuestions: [
      {
        question: 'What does "blameless" really mean in a postmortem?',
        answer: `**Focus on systems, not individuals.** The framing shift: from *"who pushed the bad code?"* to *"how did our processes allow a bad change to reach production?"*

What blameless does NOT mean:
- **No accountability** — there\'s still ownership. Action items have owners.
- **No consequences** — repeated patterns of poor judgment can have HR consequences. Postmortems are the wrong forum for that, but the issue is real.
- **Hiding what happened** — postmortems are direct about what went wrong.

What blameless DOES mean:
- **Action items are systemic fixes**, not "Bob will be more careful." The system permitted the bad change; fix the system.
- **Names appear factually** ("Alice deployed v3.2.1 at 14:30") but not judgmentally ("Alice carelessly deployed v3.2.1"). The verb describes the action, not the human.
- **Multiple contributing factors are acknowledged.** Almost no incident has a single cause. "Bob pushed bad code" is one factor; the missing CI check, the lack of canary, the alerting gap are others.
- **Hindsight bias is called out.** The reviewer asks: "given what Bob knew at the time, was the action reasonable?" Often yes. The system failure is what we fix.

The SRE Book quote: *"Postmortems with finger-pointing and reproachful tone... drive the engineers involved to obscure their actions."* If engineers fear postmortems, they\'ll hide failures, mitigate quietly, and the organization can\'t learn.

Cultural enforcement: senior engineers and leaders model the behavior. When the writeup names them in a failure, they accept it without defensiveness. When juniors reach for blameful language, they correct gently.`,
      },
      {
        question: 'Walk me through the structure of a good postmortem.',
        answer: `Standard Google SRE Book structure:

**1. Title** — concise, searchable. "Checkout 50% error rate for 23 min from deploy v3.2.1."

**2. Summary** — 1-3 sentences: what broke, when, who was affected, how we fixed it.

**3. Impact** — quantified. Users affected (count and %), revenue, SLO budget consumed, customer SLA exposure.

**4. Detection** — how was the incident detected? Time from issue-start to detection. Alert that fired; who got paged.

**5. Root Causes** — what *specifically* caused the failure. Often multiple. Use Five Whys to peel back layers. Avoid "user error."

**6. Resolution** — what stopped the bleeding. Specific mitigation step (rollback, traffic shift, capacity scale-up).

**7. Lessons Learned** — three sub-sections:
- **What went well**: detection speed, rollback automation, comms, etc.
- **What went poorly**: each item maps to an action item.
- **Where we got lucky**: the masked vulnerabilities. Most learning is here.

**8. Timeline** — minute-by-minute, timestamped. From issue start (or detection) to resolution. Pulled from chat history, alerts, dashboard screenshots. The backbone of the postmortem.

**9. Action Items** — specific, owned, dated. Each categorized:
- **Prevention** (make this impossible / harder)
- **Detection** (find faster next time)
- **Mitigation** (recover faster next time)

Each: ticket number, owner, target date, priority.

**10. Supporting Information** — dashboard links, log queries, charts, related postmortems.

The discipline:
- Draft within 5 business days; final within 10.
- Cross-team review before final.
- Published in a searchable wiki.
- Linked from relevant runbooks.
- Reviewed in a meeting with the broader org so learning spreads.`,
      },
      {
        question: 'How do you make sure action items actually ship?',
        answer: `Five mechanisms:

**1. Specific, owned, dated.**
- Bad: "improve monitoring."
- Good: "Add an alert for checkout p99 latency > 500ms in 5-min window. Owner: Bob. Due: 2026-05-20. Ticket: SRE-1234."
- Specificity is action-forcing. Vague items languish.

**2. Categorize and prioritize.**
- Each action item is **Prevention**, **Detection**, or **Mitigation**.
- Each has priority: P0 (must ship before another similar incident is acceptable), P1 (next sprint), P2 (this quarter).
- P0s get tracked aggressively; P1s and P2s get sprint-planned.

**3. Tracker integration.**
- Action items become tickets in the team's normal tracking system (Jira, Linear, GitHub Issues).
- They're not separate from regular work; they compete for sprint capacity.
- The postmortem links to the tickets; the tickets link back to the postmortem.

**4. Monthly action-item review.**
- A standing meeting reviews all open postmortem action items.
- Stale items (>30 days past due) escalated.
- Items consistently slipping → re-evaluate priority and owner.
- Cancelled items: explicitly closed with a reason.

**5. Recurrence accountability.**
- If a similar incident re-fires before the action items shipped, the postmortem cites the un-shipped action items by reference.
- This creates the right incentive: ship the work or face it again.

The cultural reinforcement: leadership uses the action-item-completion rate as a team-health metric. Teams that ship < 50% of P0/P1 items get attention; teams that ship > 80% get praised.

The opposite anti-pattern: "we wrote great postmortems, no one shipped any of them." Symptom: the next on-call shift has the same incident with the same surprises.`,
      },
      {
        question: 'When is a postmortem NOT needed?',
        answer: `Two cases:

**1. Below the impact threshold.**
- Most teams have a threshold: customer-visible impact for > X minutes, revenue > $X, security event, novel failure mode.
- Below: a lightweight "incident note" — 1 paragraph, what happened, what we did, links — suffices.
- Above: full postmortem.

The threshold prevents postmortem burnout. If every 5-minute alert fires triggers a 4-hour postmortem write-up, engineers stop responding to alerts.

Typical threshold: customer impact > 5 min OR SLO budget consumed > 10% OR security event OR novel failure mode (no prior postmortem matches).

**2. Trivially-known cause with no novel learning.**
- A duplicate of an incident you postmortem'd 3 times in the last year. The action items from the prior postmortems are still un-shipped. There's nothing new to learn.
- The right move: re-cite the prior postmortem; escalate the un-shipped action items; don\'t write a new one.
- Caveat: do this rarely. If you find yourself "duplicating" a lot, the underlying problem is "we know what to do but we\'re not shipping it" — a process problem worth its own postmortem.

When postmortems ARE needed even though they feel unnecessary:
- **Near-misses with no actual customer impact.** A bug shipped to canary, was caught, rolled back. No customer impact. Postmortem still valuable: how was the bug introduced? Why did normal review miss it? The "we got lucky" section is the whole postmortem.
- **Self-inflicted incidents.** A planned maintenance went wrong. People want to brush past these. Postmortem: what was wrong with the plan? With the rehearsal? With the execution?
- **Root-cause-unknown incidents.** Symptom went away; we don\'t know why. Tempting to skip. Postmortem the unknown cause — it'll likely re-fire eventually.

The general rule: when in doubt, do the postmortem. The cost of writing one for a non-event is small; the cost of NOT writing one for a real learning is large.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/postmortem-culture/',
      'https://response.pagerduty.com/after/post_mortem_process/',
      'https://github.com/dastergon/postmortem-templates',
    ],
  },

  {
    id: 'five-whys',
    title: 'Five Whys — Root Cause vs Contributing Factors',
    icon: 'helpCircle',
    color: '#ef4444',
    questions: 3,
    description: 'The Toyota technique adapted for SRE: where it works, where it lies, and "contributing factors" as the modern alternative.',
    introduction: `**Five Whys** is a root-cause analysis technique from Toyota's manufacturing process, adapted into SRE postmortem practice. The mechanic: ask "why?" five times, each time peeling back a layer.

Worked example (a checkout outage):
1. **Why did checkout go down?** Service returned 500 errors.
2. **Why?** Connection-pool exhaustion to the order DB.
3. **Why?** A new query path opened too many connections without releasing them.
4. **Why?** The retry loop didn\'t close connections on each retry.
5. **Why?** The retry library doesn\'t implement context cancellation correctly.

By "why" 5, you\'ve moved from "the symptom" (500 errors) to a "systemic cause" (a library bug). Action items at the systemic level are higher-leverage than action items at the symptom level.

**Where Five Whys works:**
- **Linear causal chains** — each effect has one obvious cause.
- **Manufacturing defects** — Toyota's domain. Physical components have well-defined failure modes.
- **Single-component failures** — a bad disk, a bad config push, a bad query.

**Where Five Whys breaks:**
- **Multiple contributing factors** — most software incidents have 3-5 independent factors that combined to cause the failure. Five Whys forces a tree into a list.
- **Hindsight bias** — the "why" you ask in retrospect is shaped by what you already know. You ask the question that fits the answer.
- **False precision** — five layers feels rigorous but the choice of which "why" to follow at each step is subjective.
- **Stop conditions are arbitrary** — sometimes the right answer is at "why 2"; sometimes at "why 8". The "five" is convention, not science.

**The modern alternative: contributing factors.**
Instead of one root-cause chain, list **all the factors that needed to be true for the incident to happen.** Most incidents are 3-7 factors:
1. The bad code was introduced in commit X.
2. The CI test for connection-leak was disabled (legacy).
3. Canary deployment didn\'t cover the slow-path code.
4. The connection-pool alert was at 90% but the pool was 95%-saturated for hours before page firing.
5. The on-call runbook didn\'t list "check connection pool" as a debug step.
6. The retry library has known bugs (since 2024) but we\'re still on the old version.

Each factor is independently fixable. **Cause is plural; the postmortem reflects that.**

The Sidney Dekker school (human factors): every incident has *multiple* contributing factors that aligned. Pulling on the one labeled "root cause" misses the systemic vulnerability that allowed many factors to align simultaneously.

**Pragmatic guidance:**
- Use Five Whys as a *brainstorming technique* during the postmortem. It\'s good for surfacing layers.
- Document the result as **multiple contributing factors**, not as "the root cause." This more honest framing prevents narrow fixes.
- Action items target *several* factors, not just the deepest one. The library bug needs fixing AND the missing CI check AND the runbook gap.

**Honest postmortems use both:**
- Five Whys for exploration: "let's keep asking why until we run out."
- Contributing-factor list for documentation: "here are the seven things that all had to be true."`,
    whenToUse: [
      'During the postmortem review meeting — Five Whys as a brainstorming technique',
      'When documenting root cause — favor "contributing factors" over a single "root cause"',
      'Action item generation — each factor is its own action item',
      'Recurring incidents — the contributing-factor list is more useful than a single root cause for finding patterns',
    ],
    keyConcepts: [
      { term: 'Five Whys', definition: 'Iterative why-chain. Toyota origin. Useful for brainstorming; lying as a sole technique.' },
      { term: 'Contributing factors', definition: 'Multiple things that combined to cause the incident. Modern human-factors approach. More accurate.' },
      { term: 'Hindsight bias', definition: 'In retrospect, the cause is "obvious." Ask "given what was known at the time, was the decision reasonable?" to combat.' },
      { term: 'Linear vs systemic causation', definition: 'Five Whys assumes linear chain; reality is usually networked — multiple causes aligned.' },
      { term: 'Sidney Dekker school', definition: 'Human factors approach to incidents: multiple factors must align for failure. Eliminating one factor breaks the chain.' },
    ],
    keyQuestions: [
      {
        question: 'Walk me through Five Whys for this scenario: a deploy caused a 30-minute outage.',
        answer: `Worked example:

**1. Why did the deploy cause an outage?**
Because v3.2.1 introduced a bug in the cache-invalidation path that caused 50% of requests to return stale data, which broke checkout.

**2. Why didn't the bug get caught before deploy?**
Because the integration tests covered the happy path but not the cache-invalidation path. The unit test for the changed function passed; integration coverage was thin.

**3. Why was integration coverage thin?**
Because the cache-invalidation logic was added 2 years ago by a different team, and they wrote unit tests but didn't add integration tests. Subsequent changes to the function didn\'t add coverage either.

**4. Why didn't the canary catch it?**
Because the canary ran for 5 minutes; the cache-invalidation path is hit at most once per 30 minutes per user; no canary user hit the broken path.

**5. Why is the canary window so short?**
Because we time-box deploys to 1 hour total to ship 5x/day, and a longer canary would slow shipping. The trade-off was made 18 months ago when the cache-invalidation path was less critical.

The output: the systemic cause is "the canary policy is mismatched to the actual code paths' invocation rates." The fix isn't "tell engineers to write better tests"; it's "make the canary policy adaptive to the path being changed" or "instrument cache-invalidation telemetry so the canary can detect path-specific health."

This is good Five-Whys output: by Why 5, we've moved from a single bug to a class of vulnerability.

The honest follow-up: **list the other contributing factors** that Five Whys missed:
- The cache-invalidation path didn't have a feature flag (could have been gated).
- The on-call playbook didn't include "check cache hit rate" as a step.
- The alert that fired (high error rate) didn't link to the deploy event automatically.

Five Whys gave us one chain; the real picture has 5-7 chains.`,
      },
      {
        question: `What's wrong with Five Whys, and what's the alternative?`,
        answer: `Three problems:

**1. Hindsight bias.** Each "why" you ask in retrospect is shaped by knowing the outcome. You\'re finding paths that fit the answer, not exploring the space.

**2. False precision.** "5" is a convention from manufacturing, not a scientific stopping point. Sometimes the right answer is at Why 2; sometimes at Why 10.

**3. Linear-causation assumption.** Most incidents are *networks* of causes, not chains. Five Whys forces the network into one chain, picking arbitrarily which thread to follow.

The modern alternative: **contributing factors**. List ALL the conditions that had to be true for the incident to happen.

Example: instead of "root cause: bad library version," list:
1. The library has a known bug since 2024.
2. We\'re on a version with the bug because the upgrade was deferred.
3. The upgrade was deferred because of a low-priority dependency conflict.
4. The dependency conflict is unresolved because the team that owned it moved.
5. The team moved without documenting the conflict.
6. The conflict was caught in an audit but the audit ticket was never re-prioritized.

Each factor is independently fixable. Fixing any one breaks the chain. The postmortem now has 6 action items, each targeting a real systemic gap, vs Five Whys' single "fix the library bug."

The pragmatic synthesis I'd advocate:
- Use **Five Whys as brainstorming** in the postmortem review meeting. It's good for prompting "what else?"
- Document as **contributing factors** in the final postmortem.
- Action items target multiple factors, not just the deepest one.

This is what Google's recent postmortems and the Atlassian / Etsy / Honeycomb practice look like. Pure Five Whys is largely seen as a 1990s technique that's been refined by modern human-factors work.`,
      },
      {
        question: 'Why is "user error" rarely a valid root cause?',
        answer: `Because **the system permitted the user error**. Stopping at "user error" misses the systemic vulnerability.

Concrete example: an SRE typed the wrong command and deleted a production database.

Bad postmortem: "Root cause: user error. Action item: be more careful."

Good postmortem: "Contributing factors:
1. The deletion command had no confirmation prompt.
2. The shell history showed similar safe commands; muscle memory triggered.
3. The user was on prod credentials; staging credentials would have been safer for the planned task.
4. The deletion didn\'t require multi-party approval despite being a destructive operation.
5. There was no immediate restore path; backups existed but restore took 4 hours.
6. The terminal didn't visually distinguish prod from staging.
7. The runbook for the planned task didn't include the safe alternative command."

Each factor is a system or process gap. Each has a fix:
1. Add confirmation prompt to destructive commands.
2. (Inherent to muscle memory; not directly fixable, but #6 helps.)
3. Default credentials to staging; require explicit prod opt-in.
4. Add multi-party approval for destructive prod operations.
5. Faster restore path (warm standby, point-in-time recovery).
6. Color-code terminals by environment (prod = red).
7. Update runbook.

The user "error" was a single act; the system\'s vulnerability was 7 different things. Fixing them lowers the probability of *any* future user from making this kind of mistake.

The framing principle: **humans will make errors; systems are designed to absorb them**. Aviation, medicine, and nuclear power figured this out decades ago. Software is catching up. The postmortem question is: "how did our system not absorb this human error?"

Quote from the SRE Book Ch 15: *"User error" is too convenient an explanation. It\'s a symptom of insufficient analysis.*`,
      },
    ],
    references: [
      'https://sre.google/sre-book/postmortem-culture/',
      'https://www.adaptivecapacitylabs.com/STELLA-Report.pdf',
      'https://sidneydekker.com/the-field-guide-to-understanding-human-error/',
    ],
  },

  {
    id: 'incident-comms',
    title: 'Incident Communications — Status Pages and Stakeholder Updates',
    icon: 'megaphone',
    color: '#ef4444',
    questions: 3,
    description: 'Status page discipline, the 15-minute update cadence, and the structure of executive briefs.',
    introduction: `Communications during an incident is high-leverage and underinvested. Customers, executives, and internal teams all need updates; the cost of doing it badly is reputational. The good news: it\'s a learnable skill with clear patterns.

**The audiences and their needs:**

**Customers** — want to know:
1. Are we aware of the issue?
2. What\'s the impact?
3. When will it be fixed?

They DON\'T want:
- Technical jargon ("the etcd cluster is partitioned").
- Speculative root cause ("we believe a deploy may have...").
- Status updates that say "investigating" for 2 hours.

The status page is the customer-facing channel. Update it within 5-10 minutes of incident detection; cadence every 15-30 minutes during the incident. Use a fixed structure:
- **Identifier**: "We are investigating reports of degraded checkout performance."
- **Impact**: "Some customers may experience slow checkouts."
- **Mitigation**: "We have identified the cause and are deploying a fix. ETA: 30 minutes."
- **Resolution**: "Resolved at 14:23 UTC. No data was lost. Postmortem will be published within 5 business days."

**Executives** — want to know:
1. How bad is it?
2. What\'s the financial / customer / brand impact?
3. What\'s being done?
4. When will it be over?

Format: tight, factual, 5-10 lines. Updated every 15-30 minutes during a SEV-1.
> *Update 14:30 UTC: Checkout outage now at 23 min. Estimated 15K affected users. Mitigation in progress (rollback v3.2.1). ETA resolution: 14:45. No known customer-data impact. IC: Alice. Comms: Bob.*

**Internal teams** — want to know:
1. Should I drop what I\'m doing?
2. Is there a way I can help?
3. What\'s the latest status?

Channel: incident-specific Slack channel. Cadence: pinned status update at the top, updated every 15 minutes. Free-form discussion in-thread.

**Status page best practices:**
- **Prefer "investigating" over silence**. Customers panic at silence; "investigating" buys time.
- **Don\'t speculate.** "We believe X" can be wrong; "we are investigating Y" can\'t. If you must hypothesize, label it ("Initial hypothesis: ...").
- **Update on a fixed cadence.** Even "no new information" is information.
- **Post-resolution: detailed final update.** Customers want to know what happened, not just "resolved."
- **Postmortem published within 5 business days for major incidents.** Public-facing version often shorter than the internal one.

**Status page providers:** Statuspage (Atlassian), Statusgator, Instatus, BetterStack. Most offer multi-channel notifications (email, SMS, RSS, webhook). A self-hosted page in your prod region is dangerous — if your prod is down, your status page is down too. **Status page MUST be hosted independently from the systems it\'s reporting on.**

**The 15-minute rule.** Even if there\'s no progress, post an update every 15 minutes during a SEV-1. *"No new information; investigation continues; next update at HH:MM."* Silence breeds anxiety; updates de-escalate.

**Comms Lead is full-time.** During a SEV-1, the Comms Lead doesn\'t debug; they communicate. Engineers asking the IC "what should I tell the customer" is a smell — that\'s the Comms Lead\'s job.`,
    whenToUse: [
      'Active SEV-1 / SEV-2 — Comms Lead is named and has a runbook',
      'Onboarding the Comms Lead role — there\'s a real skill ladder here',
      'Designing the status page — independent hosting, structured updates, customer-friendly language',
      'Postmortem — comms is part of the timeline; what could be improved',
    ],
    keyConcepts: [
      { term: 'Comms Lead', definition: 'Dedicated role during a SEV-1. Owns customer + executive + internal communications. Full-time during the incident.' },
      { term: 'Status page', definition: 'Customer-facing single source of truth during an incident. Independently hosted from production.' },
      { term: '15-minute update cadence', definition: 'Even with no new information, update every 15 minutes during a SEV-1. Silence breeds anxiety.' },
      { term: 'Identifier / Impact / Mitigation / Resolution', definition: 'Standard structure for status page updates. Predictable for customers.' },
      { term: 'Don\'t speculate', definition: 'Public statements should be facts ("we are investigating") not hypotheses ("we believe X caused..."). Hypotheses can be wrong.' },
      { term: 'Independent hosting', definition: 'Status page MUST NOT depend on the production it\'s reporting. Statuspage / Instatus / similar third-party.' },
    ],
    pitfalls: [
      'Status page hosted on the same infrastructure that\'s down. Customers see "this site can\'t be reached" instead of an outage notice.',
      'Speculation in customer-facing comms. "We believe a network issue may be causing..." that turns out to be wrong erodes trust.',
      'Long silences. Updating every 2 hours during an active incident sends "we don\'t care" signal.',
      'Comms Lead also fixing the issue. Both jobs done badly. Separate roles always.',
      'No post-resolution comms. Customers don\'t know it\'s over; some keep complaining for hours.',
    ],
    keyQuestions: [
      {
        question: 'What goes on a status page during an incident?',
        answer: `Standard structure, kept simple for customers:

**Identifier (required)**: "We are investigating reports of [observable symptom]."
- Examples: "elevated error rates on checkout," "slow page loads," "intermittent 500 errors."
- Use customer language, not technical jargon.

**Impact (required)**: "[Who is affected, what they\'re seeing.]"
- "Some customers may experience slow page loads."
- "Customers attempting to check out may see errors and need to retry."

**Mitigation (when in progress)**: "[What we\'re doing.]"
- "Engineers are deploying a fix."
- "Traffic is being failed over to a backup region."

**ETA (when known, otherwise "investigating")**:
- "Estimated resolution: 14:45 UTC."
- If unknown: "Investigation continues; next update at 14:30."

**Resolution (after fix)**: "Resolved at HH:MM UTC. [Brief description of what happened.]"
- Mention any data implications (none, or specific): "No customer data was lost."
- Reference upcoming postmortem: "A detailed postmortem will be published within 5 business days."

What NOT to put:
- Internal service names ("etcd," "kafka," "postgresql"). Use customer-facing language.
- Hypothetical root causes that may turn out wrong.
- Complete technical detail. Save for the postmortem.
- Apologies that sound formal/PR-ish ("We sincerely regret..."). Be human and matter-of-fact.

The cadence: post initial update within 5-10 min of detection. Update every 15-30 min during the incident. Final resolution update with summary. Postmortem follow-up within 5 business days for major incidents.

Status page providers: Statuspage (Atlassian), Statusgator, Instatus, BetterStack. Cost: $50-$500/month. Cheaper than the alternative (customers angry at silent outages).`,
      },
      {
        question: 'How do you write an executive update during a SEV-1?',
        answer: `Format: tight, factual, 5-8 lines. Send every 15-30 minutes. Include:

1. **Service / outage name** — one line.
2. **Duration so far** — "23 min ongoing" or "resolved at 14:45, 32 min total."
3. **Customer impact** — quantified. Number of affected users, affected features, geographic / segment breakdown.
4. **Revenue / SLA exposure** — quantified. "$X/min revenue impact" or "burning customer SLA budget."
5. **Mitigation status** — "in progress: rolling back deploy" or "complete: deploy reverted at 14:42."
6. **ETA** — when known.
7. **IC + Comms Lead names** — so executives know who to contact.

Example:

> **SEV-1 Update — Checkout Outage — 14:30 UTC**
> Duration: 23 min ongoing.
> Impact: 50% error rate on /checkout. Estimated 15K affected users. Mostly US-East customers.
> Revenue: ~$12K/min lost based on average run-rate.
> Mitigation: rolling back deploy v3.2.1; in progress, ETA 14:45.
> No known customer-data impact.
> IC: Alice (alice@). Comms: Bob (bob@).
> Next update: 14:45 or on resolution, whichever first.

What executives need:
- **Quick orientation** — first line tells them what\'s happening.
- **Quantified impact** — they\'re thinking about brand and money.
- **Confidence in handling** — naming IC + Comms reassures them it\'s being handled.
- **Predictable cadence** — they know when the next update comes.

What executives don\'t need:
- Technical detail (saved for postmortem).
- Speculation about root cause.
- Justification ("we are sorry").
- Uncertainty ("we hope to resolve soon").

Format consistency matters. If every SEV-1 has the same structure, executives know exactly where to look for the impact number, the ETA, the names. Reduces their cognitive load during a stressful event.`,
      },
      {
        question: 'Why is independent hosting of the status page non-negotiable?',
        answer: `Because **if your prod is down, anything sharing fate with prod is also down** — including the status page. Customers reach for the status page exactly when prod is broken; if it\'s broken too, they get nothing.

Real failure modes I\'ve seen:
- Status page hosted in the same AWS region as prod. Region-wide AWS outage takes both down.
- Status page using the same DNS provider. DNS provider outage (e.g., the 2021 Akamai issue) takes both down.
- Status page authentication via the same SSO that\'s down. Engineers can\'t even update the status page.
- Status page on the same Kubernetes cluster as prod. Cluster control-plane issue: both down.

The pattern: **the status page is exactly the system you most need when prod is down**. Coupling fate is a category error.

The right architecture:
- **Third-party hosted** (Statuspage, Statusgator, Instatus, BetterStack). Separate vendor, separate infrastructure, separate region.
- **DNS via separate provider** from prod. If prod\'s DNS goes down, status page DNS still resolves.
- **Authentication separate from prod\'s SSO.** Statuspage has its own login. Use it.
- **Multi-channel notifications** (email, SMS, webhook, RSS). If status page is up but customers don\'t know to look at it, you\'ve still failed at comms.

Self-hosted is acceptable IF:
- Hosted in a different cloud / region from prod.
- Has its own domain / DNS.
- Has its own deploys (not blocked by your prod CI/CD when prod is broken).
- Tested under "prod is fully down" scenarios.

Most teams aren\'t set up for this; that\'s why third-party status page providers dominate. The $50-$500/month cost is trivial vs the cost of customers seeing "this site is unreachable" during your outage.

The bonus: a third-party status page also lets you communicate during incidents that affect *your* infrastructure but not the third-party (e.g., if your auth provider is down, your engineers can still update the status page).`,
      },
    ],
    references: [
      'https://sre.google/sre-book/managing-incidents/',
      'https://www.atlassian.com/incident-management/incident-communication',
      'https://response.pagerduty.com/training/incident_commander/',
    ],
  },

  {
    id: 'gamedays-chaos',
    title: 'Game Days, Chaos Engineering, and DiRT',
    icon: 'shield',
    color: '#ef4444',
    questions: 3,
    description: 'Practicing failure deliberately. Google\'s DiRT, Netflix Chaos Monkey, modern chaos engineering tools.',
    introduction: `**Practicing failure** is the SRE discipline that separates "we hope it works" from "we know it works." Three related practices:

**1. Game Days** — scheduled, full-team incident simulations.
The team picks a date; runs a realistic incident scenario; treats it like a real incident (page on-call, run command structure, mitigate, postmortem). Originated at Amazon ~2003; Google formalized it as DiRT (Disaster Recovery Testing) week.

**2. Chaos Engineering** — continuous, targeted failure injection in production (or production-like) environments.
Originated at Netflix with Chaos Monkey (2010). Random instance termination on weekday business hours. Forces engineers to build for "instances die at any time." Now extends to network failures, latency injection, region outages, dependency failures.

**3. DiRT (Google\'s Disaster Recovery Testing)** — annual, company-wide week of failure exercises.
Documented in the SRE Book and Workbook. Engineers across teams plan and execute realistic failure scenarios: power outages, network partitions, regional failures, leadership-loss scenarios. Discovers the gaps that monthly game days miss.

**Why practice failure deliberately:**

- **Untested failover doesn\'t work.** Even with detailed runbooks, the first time you fail over to the DR region, something will be misconfigured (IAM, secrets, DNS). Game days find these in a controlled setting.
- **Knowledge transfer.** New on-call engineers need to feel a real incident response without real customer impact. Simulated incidents are how.
- **Process gaps surface.** "Where\'s the contact list?" "Who can approve a rollback?" "How do I update the status page?" — these gaps are uncovered in simulated incidents.
- **Hidden dependencies discovered.** Chaos engineering finds "we depend on service X but didn\'t know it" — usually because someone\'s legacy code calls it directly.

**Chaos engineering principles (from the Principles of Chaos Engineering manifesto, 2017):**

1. **Build a hypothesis around steady-state behavior.** "Under normal load, p99 latency is < 500ms."
2. **Vary real-world events.** Inject failure: kill instances, slow networks, partition regions.
3. **Run experiments in production.** Or as close to production as possible. Staging is a different system.
4. **Automate experiments to run continuously.** Chaos Monkey runs every weekday.
5. **Minimize blast radius.** Limit the experiment\'s scope; have a kill switch.

**Modern chaos engineering tools:**

- **Chaos Monkey / Simian Army (Netflix)** — open-source. Random instance kill, region drain, etc.
- **AWS Fault Injection Simulator (FIS)** — managed; integrates with AWS resources.
- **Gremlin** — commercial; broad failure-injection capabilities.
- **Chaos Mesh** — open-source for Kubernetes.
- **LitmusChaos** — open-source for Kubernetes; CNCF project.
- **Istio fault injection** — service-mesh-level latency / error injection.

**Game Day structure:**

- **Plan** (1-2 weeks ahead): pick scenario, define success criteria, choose participants.
- **Brief** (day-of): walk through the scenario without revealing the trigger; assign roles.
- **Execute**: trigger the failure; let the team respond as if real.
- **Observe**: a "white-team" observer takes notes; doesn\'t interfere.
- **Debrief**: postmortem-style review of what went well / poorly.
- **Action items**: process gaps, missing runbooks, broken automation.

**The hardest cultural step**: getting buy-in to inject failure into production. Engineers fear breaking things; leadership fears customer impact. The argument: **untested failure paths break worse, with worse customer impact**. Inject controlled failure now to avoid uncontrolled failure later.

Successful programs start with **non-prod chaos** (staging-only), graduate to **prod chaos with limited blast radius** (single instance, single AZ), then extend to **larger experiments** (region drains).`,
    whenToUse: [
      'Pre-launch — game day for the new service before it carries real traffic',
      'After major architectural changes — verify failure modes still work',
      'Quarterly cadence — game days as a recurring practice',
      'Team training — new on-call engineers run a game day before going on rotation',
    ],
    keyConcepts: [
      { term: 'Game Day', definition: 'Scheduled team-wide incident simulation. Realistic failure scenario; respond as if real; postmortem.' },
      { term: 'Chaos Engineering', definition: 'Continuous, automated failure injection in production. Netflix Chaos Monkey origin (2010).' },
      { term: 'DiRT', definition: 'Google\'s annual Disaster Recovery Testing week. Company-wide simulated disasters.' },
      { term: 'Steady-state hypothesis', definition: 'Define normal behavior before chaos experiment. "p99 < 500ms under normal load."' },
      { term: 'Minimize blast radius', definition: 'Chaos experiments scope tight initially; expand only after success. Kill switch always available.' },
      { term: 'White team', definition: 'Game day observers who watch the response without interfering. Take notes for the debrief.' },
    ],
    keyQuestions: [
      {
        question: 'How would you run a game day for a new service?',
        answer: `Six-stage process, ~2 weeks total:

**Week 1: Plan.**
- Pick the scenario. Realistic and high-impact: "the primary database fails over to standby." Or: "the payment processor returns 503 for 30 minutes." Aim for failures the team should be able to handle but hasn\'t practiced.
- Define success criteria. "Mitigation within 15 minutes; status page updated within 10 minutes; no actual customer impact."
- Choose participants. The team that owns the service; ideally an external observer (an SRE from another team).
- Pre-write the runbook IF it doesn\'t exist. Game day reveals runbook gaps; pre-writing what you can helps focus.

**Day before: Brief.**
- Walk through the scenario without revealing the trigger. Assign on-call IC, Comms Lead, Ops Lead.
- Confirm: when the page fires, treat it as real. No "wait, is this the test?" allowed.

**Day of: Execute.**
- Trigger the failure. Could be: SSH into a host and \`systemctl stop service\`, or use AWS FIS to terminate an instance, or update a DNS record to a bad target.
- The team responds: page fires, IC is assigned, debug, mitigate.
- White-team observer takes notes: timeline, what was searched, what wasn\'t obvious, where the team got stuck.

**Day of: Observe.**
- Don\'t interfere. Don\'t answer questions ("how would you debug this?"). Let the team work.
- Note process gaps, missing runbooks, broken automation, slow paths.

**Day of: Debrief.**
- Postmortem-style review. What went well? What went poorly? What would have happened in production?
- Document action items.

**Week 2: Action items.**
- Treat as you would real-incident action items: own them, prioritize them, ship them.
- Common outputs: missing runbook, alert too slow, automation script broken, on-call list out of date.

The cultural setup: leadership endorses game days as productive use of time. Without that, engineers feel game days are theater.

Frequency: monthly per team is the gold standard. Quarterly is a good floor.`,
      },
      {
        question: 'How do you run chaos engineering safely in production?',
        answer: `Five-step graduated approach:

**1. Start in staging.** First chaos experiments in a non-prod environment. Find your tooling gaps, your kill switches, your blast radius limits without risk.

**2. Single-instance prod chaos.** Pick one instance; kill it. The system should recover (autoscaling spins up replacement, traffic drains automatically). If anything goes wrong, the impact is bounded to that one instance.

**3. AZ-level chaos.** Drain one AZ. The system should fail traffic to other AZs. If it doesn\'t, you found a critical bug in your multi-AZ design before a real AZ failure exposes it.

**4. Region-level chaos.** Drain one region. The system should fail over to another region. This is where "we have multi-region active/active" gets validated. Many teams discover their multi-region story doesn\'t actually work at this stage.

**5. Compound failures.** Multiple things at once: AZ failure + dependency latency spike + traffic spike. Real incidents are usually compound; chaos should match.

**Safety mechanisms throughout:**
- **Kill switch.** Every experiment has an immediate stop. \`kubectl delete chaos-experiment\` style.
- **Blast radius limits.** Experiment touches < X% of traffic / instances. Auto-stop if SLO is being burned.
- **Steady-state guardrails.** Watch the SLI in real-time. If error rate > threshold, auto-stop the experiment.
- **Time-bounded.** Experiments have a max duration (e.g., 30 minutes). Auto-stop at the limit.
- **On-call awareness.** The on-call team knows when experiments are running and can pause them.

**Communication:**
- Pre-experiment: announce in #incidents Slack. "Running chaos experiment: kill 1 instance of checkout service at 14:00 UTC. ETA 30 min. Kill switch: [link]."
- Post-experiment: results posted. What was the steady-state hypothesis? Did it hold? Anything broken?

The cultural setup: chaos engineering must be **visibly endorsed by leadership** and **rewarded when it finds bugs**. If teams are blamed for "you broke prod with your chaos," the practice dies. The framing: every chaos finding is a real-incident bug we caught early.

Tooling: AWS FIS (managed, AWS-only), Chaos Mesh (Kubernetes), LitmusChaos (Kubernetes / CNCF), Gremlin (commercial, multi-cloud), Istio fault injection (service mesh).`,
      },
      {
        question: 'What\'s the difference between game days and chaos engineering?',
        answer: `Both practice failure; the differences are in **frequency, automation, and audience**.

**Game Days**:
- **Scheduled**, manual events. "We\'re running a game day next Tuesday at 10am."
- **Whole-team participation**. The team responds as if it\'s a real incident; everyone has a role.
- **Realistic, complex scenarios**. "Database failover" or "payment provider outage."
- **Educational**. New on-calls learn; veterans test process.
- **Postmortem-grade output**: detailed action items, runbook updates.

**Chaos Engineering**:
- **Continuous, automated**. Chaos Monkey kills instances every weekday business hours.
- **Single-injection**. One failure at a time, limited blast radius.
- **Simple failures**. Kill instance, slow network, return errors.
- **Verification-grade**. The system should handle this without humans; chaos engineering verifies.
- **Bug-finding output**: when chaos finds a real bug, fix it.

The complementary use:
- **Game days** find the *people-and-process* gaps: missing runbooks, unclear roles, slow comms, untested escalations.
- **Chaos engineering** finds the *technical* gaps: services that don\'t handle their own dependency failures, single-points-of-failure, missing retries, broken auto-scaling.

A mature SRE program runs both:
- Chaos Monkey-style continuous experiments — verifies basic resilience.
- Quarterly game days — verifies the team-and-process layer.
- Annual DiRT-style company-wide week — verifies cross-team and tail scenarios.

Each layer catches different categories of failure. Skipping any leaves you exposed in that category.

Practical staging: most companies start with chaos engineering (technical, automatable). Game days come later (cultural shift required, more leadership investment). DiRT comes last (only worth it at scale, > 50 services).`,
      },
    ],
    references: [
      'https://sre.google/sre-book/managing-incidents/',
      'https://principlesofchaos.org/',
      'https://netflix.github.io/chaosmonkey/',
      'https://aws.amazon.com/fis/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // E. Automation & Toil Reduction
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'toil-quantified',
    title: 'Toil — Definition, Measurement, the 50% Cap',
    icon: 'zap',
    color: '#f59e0b',
    questions: 3,
    description: 'The SRE Book\'s definition of toil, why measuring it is hard, and how the 50% cap actually works.',
    introduction: `**Toil** is one of the SRE Book\'s most precise terms. Verbatim definition (Ch 5):

*"Toil is the kind of work tied to running a production service that tends to be manual, repetitive, automatable, tactical, devoid of enduring value, and that scales linearly as a service grows."*

Each adjective matters; mis-applying any of them includes work that isn\'t toil:

1. **Manual** — done by hand. (Not toil: tasks already automated.)
2. **Repetitive** — same task multiple times. (Not toil: novel design or one-off projects.)
3. **Automatable** — could be automated. (Not toil: irreducibly human work — design, judgment calls, customer interactions.)
4. **Tactical** — interrupt-driven, not strategic. (Not toil: planned engineering projects.)
5. **Devoid of enduring value** — service is unchanged after you do it. (Not toil: code changes that improve the system.)
6. **Linear scaling with service growth** — as the service grows, the toil grows. (Not toil: bounded work.)

**Examples of toil:**
- Manually restarting flaky services.
- Manually granting database access on Slack request.
- Manually rotating expired certificates.
- Manually scaling instances before traffic spikes.
- Manually resolving false-positive alerts.
- Manually onboarding new services to monitoring.

**Examples that are NOT toil:**
- **Overhead** (administrative, not service-related): meetings, planning, training.
- **Engineering work**: writing code, designing systems.
- **Investigation**: debugging novel problems (one-off, not repetitive).
- **Customer interactions**: handling support escalations.

**The 50% cap (SRE Book Ch 5).** Google\'s rule: SRE teams cap their toil at 50% of total time. The other 50% is engineering work: automation, monitoring improvements, capacity planning, postmortem follow-ups. Why:

- **Engineering work compounds.** Hours spent on automation save hours forever.
- **Toil grows linearly with service scale.** Without the cap, growth eats SRE capacity until 100% is toil — a death spiral.
- **Toil burns out engineers.** SREs who do nothing but toil leave or disengage.

**Measuring toil:**
- **Self-report time tracking**: SREs categorize their time weekly. Honest but imprecise.
- **Ticket-based**: every interrupt-driven request is a ticket; count tickets and average resolution time. Misses untracked work.
- **Surveys**: quarterly survey asking "what % of last week was toil?" Directional.

The 50% cap is a *team-wide rolling average*, not a per-person, per-week target. Some weeks are heavy on toil (incidents); others are heavy on projects. The trend over a quarter is what matters.

**When the cap is exceeded:**
- **Reduce toil**: identify the largest sources, automate them.
- **Shift toil**: hand back to the dev team that owns the underlying problem (this is leverage; SRE\'s threat power is "if you keep producing toil for us, we hand the pager back to you").
- **Reduce service ownership**: if toil can\'t be reduced, drop the service.

**The 2026 evolution.** Original SRE Book had toil as a manual measurement. Modern teams instrument toil sources directly: count of "manual restart" actions, count of "manual cert rotation" actions, count of "false-positive alerts dismissed." Time-spent-on-toil derived from these counters. More objective.`,
    whenToUse: [
      'Quarterly SRE team review — what % of capacity went to toil?',
      'Capacity planning — which services produce the most toil? Engineer those down first',
      'Hand-back conversations — when toil is unfixable, the SRE team hands the service back to dev',
      'Hiring justification — toil at 70% means we need automation investment, not more SREs',
    ],
    keyConcepts: [
      { term: 'Toil definition (verbatim)', definition: '"Manual, repetitive, automatable, tactical, devoid of enduring value, and scales linearly as a service grows." — SRE Book Ch 5.' },
      { term: '50% toil cap', definition: 'SRE team-wide rolling average. Other 50% is engineering. Without the cap, growth eats SRE capacity — death spiral.' },
      { term: 'Linear scaling', definition: 'Toil grows with the service. 10× the service = 10× the toil. The signature property — bounded work isn\'t toil.' },
      { term: 'Engineering work', definition: 'The 50% that isn\'t toil. Automation, monitoring, capacity planning, design. Compounds over time.' },
      { term: 'Hand-back', definition: 'When toil is unfixable, SRE returns ownership to dev. SRE\'s leverage: "produce more toil for us → take the pager back."' },
    ],
    keyQuestions: [
      {
        question: 'Define toil and walk me through the six properties.',
        answer: `From SRE Book Ch 5 verbatim: *"Toil is the kind of work tied to running a production service that tends to be manual, repetitive, automatable, tactical, devoid of enduring value, and that scales linearly as a service grows."*

The six properties:

**1. Manual** — done by hand. Already-automated tasks aren\'t toil.

**2. Repetitive** — same task done many times. Novel one-offs aren\'t toil; repetitive 100× is.

**3. Automatable** — could be automated. If a task irreducibly requires human judgment (design decision, customer call), it\'s not toil.

**4. Tactical** — interrupt-driven, reactive. Pages, urgent requests, "fix this now." Not strategic / planned work.

**5. Devoid of enduring value** — when you finish, the service is in the same state it was before (just temporarily working). Code changes that improve the system aren\'t toil.

**6. Scales linearly with the service** — as the service grows, the toil grows. The signature property. If a task is bounded (e.g., "configure the new region once"), it\'s not toil even if the other five apply.

The classification: a task is toil only if it\'s ALL six. Some tasks look like toil but fail one of the criteria:
- Customer escalations: manual + tactical, but irreducibly judgment-based, so not automatable → not toil.
- One-time setup: manual + tactical, but not repetitive or scaling-linearly → not toil.
- Complex debugging: manual + tactical, but novel each time → not repetitive → not toil.

Why precision matters: the 50% toil cap depends on this definition. Misclassifying engineering work as toil (or vice versa) breaks the metric.`,
      },
      {
        question: 'How does the 50% toil cap actually work in practice?',
        answer: `**Team-wide rolling average over a quarter.** Not per-engineer, not per-week.

Mechanics:
- Each SRE estimates % of weekly time spent on toil. Self-report or ticket-derived.
- Aggregate across the team; average over the rolling quarter.
- If the team-quarter average exceeds 50%, action is required.

What it\'s NOT:
- Not a hard per-week limit. Pager-heavy weeks may be 80% toil; that\'s fine if other weeks are lower.
- Not a per-person limit. The on-call rotation has spikier toil; balance across team.
- Not a precise number. It\'s a guideline; 55% one quarter is a yellow flag, 70% is a red flag.

What happens when the cap is exceeded:

**Step 1: Identify largest toil sources.**
- Common: false-positive alerts (kill the alert), manual cert rotation (automate), manual onboarding (self-service), manual access grants (RBAC + policy).
- Pareto: usually the top 3 sources are 70-80% of toil.

**Step 2: Engineer them away.**
- Build the automation. The 50% engineering time pays for this.
- The win is exponential: removing a source of toil saves the time forever.

**Step 3: Hand back if unfixable.**
- If a service\'s toil is structural (bad design, tech debt the dev team won\'t fix), SRE has leverage: "you produce this toil; you can have the pager back if you keep producing it." This is the contract.

**Step 4: Renegotiate scope.**
- If toil grew because services grew, maybe drop a service from SRE ownership. "Tier 2" services with lower SLOs and dev-team primary on-call.

The cultural enforcement: leadership endorses the cap as a non-negotiable team-health metric. SRE managers track it. If exceeded, action is required, not optional.

The failure mode without enforcement: toil creeps to 80%+. Engineers leave. Hiring more SREs only delays the death spiral because new SREs absorb the existing toil.`,
      },
      {
        question: 'Give me a concrete example of identifying and eliminating toil.',
        answer: `**Concrete example: certificate rotation.**

The toil:
- Each service has TLS certs that expire annually.
- Renewal is manual: SRE files a request, certs come back, SRE deploys them.
- 50 services × 1 rotation/year × 2 hours per rotation = 100 hours/year of toil.
- Plus: occasionally a cert expires unnoticed → SEV-1 outage. ~2 incidents/year × 4 hours each = 8 hours of crisis work.
- Total: ~108 hours/year, growing linearly with service count.

The classification:
- Manual ✓
- Repetitive ✓
- Automatable ✓
- Tactical ✓ (often interrupt-driven by impending expiry)
- Devoid of enduring value ✓ (service is the same after as before)
- Scales linearly ✓ (more services = more rotations)

Six-of-six → toil.

The fix:
1. **Adopt cert-manager** (Kubernetes) or **AWS Certificate Manager** (managed). Automatically renew via ACME (Let\'s Encrypt) or AWS API.
2. **Set up alerts on impending expiry** as a backstop (auto-renewal failure → page).
3. **One-time effort**: ~1 SRE-week to set up cert-manager, migrate the first 5 services, document the migration.
4. **Migration cost per service**: ~30 min (vs 2 hours/year for the rotation).
5. **Annual cost after**: ~0 for renewals + occasional cert-manager debug.

ROI:
- One-time investment: 40 hours (set up) + 50 × 30 min (migrate) = 65 hours.
- Annual savings: 108 hours/year forever.
- Payback: < 1 year.

The pattern: identify the toil, classify it, build the automation, migrate, retire the manual process. The math is always lopsided — automation pays back fast.

**The other classic toil targets:**
- **Manual access grants** → RBAC + policy-as-code (OPA, Cedar).
- **Manual scaling** → autoscaling (HPA, Karpenter, predictive scaling).
- **Manual deploys** → CI/CD with canary + auto-promote.
- **Manual log queries** → dashboards + alerts.
- **Manual incident comms** → status page automation, exec brief templates.

Each is a 1-3 month project that returns hundreds of hours/year. The 50% engineering time exists to fund these.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/eliminating-toil/',
    ],
  },

  {
    id: 'iac-terraform-pulumi',
    title: 'Infrastructure as Code — Terraform, OpenTofu, Pulumi, Crossplane',
    icon: 'codepen',
    color: '#f59e0b',
    questions: 3,
    description: 'The IaC landscape, declarative vs imperative, and why state management is the hard part.',
    introduction: `**Infrastructure as Code (IaC)** treats infrastructure provisioning as software: version-controlled, code-reviewed, deployed via automation. Has been the SRE standard since ~2015; the question now is which tool, not whether.

**The major players:**

**Terraform / OpenTofu**
- HashiCorp Terraform (commercial open-source); OpenTofu is the community fork (2023) after Terraform\'s license change.
- Declarative HCL configuration. State file tracks what\'s deployed.
- Universal: supports AWS, GCP, Azure, plus 1000+ provider integrations.
- The de-facto standard for multi-cloud IaC.

**Pulumi**
- Same model (declarative, state-driven), but uses real programming languages (Python, Go, TypeScript, C#).
- Better for teams that prefer code abstractions over HCL.
- Smaller ecosystem than Terraform but rapidly growing.

**AWS CDK**
- AWS-native. Define infrastructure in TypeScript / Python / Java. Synthesizes to CloudFormation.
- Best for AWS-only teams; tight AWS integration.

**Crossplane**
- Kubernetes-native. Define infrastructure as Kubernetes Custom Resources.
- "Everything as Kubernetes objects." Useful in K8s-heavy organizations.
- Less universal than Terraform but cleaner GitOps integration.

**The fundamental architecture (shared by all of these):**

1. **Declarative configuration.** "I want a VPC with these subnets, an RDS instance with these specs, an EKS cluster with these node groups." Not: "create a VPC, then a subnet, then..."

2. **State file.** The tool tracks what\'s deployed. Diff between code and state determines changes.

3. **Plan / apply cycle.** \`terraform plan\` shows what would change; \`terraform apply\` makes it so. Always plan before apply in production.

4. **Provider abstraction.** AWS provider, GCP provider, Cloudflare provider. Each provider exposes resources; your config references them.

**Why state management is the hardest problem:**

The state file is the source of truth for "what does the tool think is deployed." Misalignment between state and reality breaks everything:
- **Drift**: someone clicks in the AWS console; the state thinks resource is unchanged. Next \`apply\` may try to re-create or modify unexpectedly.
- **State corruption**: state file gets damaged or out of sync; recovering requires manual reconciliation.
- **Concurrent modification**: two engineers running apply simultaneously; one\'s changes overwrite the other\'s.

**State management best practices:**
- **Remote state backend** (S3, GCS, Azure Blob, Terraform Cloud). Never local-only state.
- **State locking** (DynamoDB for AWS S3 backend, Cloud Storage for GCS). Prevents concurrent applies.
- **State backups** (S3 versioning + lifecycle, Terraform Cloud automatic).
- **Workspace-per-environment** (dev / staging / prod) to avoid accidental cross-env applies.
- **No manual cloud-console changes** (or detect drift via continuous \`terraform plan\`).

**Module design:**
- **Reusable modules** for common patterns (VPC, RDS, EKS) — invoked by environment-specific configs.
- **Composition over inheritance** — modules call other modules.
- **Versioned modules** — tag releases so prod uses different module versions than dev.

**The OpenTofu split (2023).** HashiCorp changed Terraform\'s license to BUSL (non-OSI). The community forked OpenTofu under MPL. Most public Terraform usage is moving to OpenTofu; commercial users may stay on Terraform for support contracts. Compatibility maintained for now; divergence likely over 2-3 years.

**Crossplane vs Terraform:**
- Terraform: imperative-feeling apply cycle. Engineer runs commands.
- Crossplane: continuous reconciliation in Kubernetes. Submit a YAML; Crossplane works toward it indefinitely.
- Crossplane fits GitOps models well; Terraform usually wraps with Atlantis or Terraform Cloud for GitOps.`,
    whenToUse: [
      'Greenfield infrastructure project — IaC from day 1, never click-ops',
      'Migration from manual to IaC — incremental import; \`terraform import\` for existing resources',
      'Multi-cloud or vendor-portable infrastructure — Terraform / OpenTofu (Pulumi second)',
      'Kubernetes-heavy, GitOps-driven shop — Crossplane is a natural fit',
    ],
    keyConcepts: [
      { term: 'Declarative IaC', definition: 'Describe desired state; tool figures out how to reach it. Standard pattern across Terraform, Pulumi, CDK.' },
      { term: 'State file', definition: 'Tool\'s record of what\'s deployed. Drift between state and reality is the leading source of IaC bugs.' },
      { term: 'Plan / apply', definition: 'Plan shows proposed changes; apply executes them. Production-grade discipline: always plan first.' },
      { term: 'Remote state + locking', definition: 'State stored in S3/GCS with DynamoDB/equivalent for concurrent-apply prevention. Never local-only state.' },
      { term: 'OpenTofu fork', definition: 'Community fork (2023) after HashiCorp BUSL license change. Compatibility maintained; gradual divergence expected.' },
      { term: 'Crossplane', definition: 'Kubernetes-native IaC. Resources are CRDs; controller reconciles continuously. Fits GitOps cleanly.' },
    ],
    keyQuestions: [
      {
        question: 'Compare Terraform, Pulumi, and Crossplane.',
        answer: `Three different shapes of the same problem.

**Terraform / OpenTofu**:
- HCL declarative configuration.
- State-driven; plan/apply cycle.
- Multi-cloud universal — 1000+ providers.
- The de-facto standard. Pick this if you want maximum hireability and ecosystem.
- OpenTofu is the open fork; pick it if license matters.

**Pulumi**:
- Same architecture as Terraform (declarative, state-driven), but uses **real programming languages** (Python, Go, TypeScript, C#).
- Better for teams that want loops, conditionals, abstractions, type checking — things HCL handles awkwardly.
- Smaller ecosystem than Terraform; learning curve for cloud engineers more comfortable in HCL.
- Pick this if your team is software-engineering-heavy and writes a lot of complex infra.

**Crossplane**:
- Kubernetes-native. Resources defined as Custom Resources (CRDs).
- Continuous reconciliation, not plan/apply. Submit YAML; Crossplane works toward it.
- Fits GitOps perfectly — Argo CD / Flux can manage infrastructure exactly like apps.
- Less universal than Terraform; provider ecosystem smaller.
- Pick this if you\'re Kubernetes-heavy and want infrastructure managed in the same way as apps.

**AWS CDK** (and similar): real-language IaC for one cloud (AWS / Azure Bicep / GCP Cloud Foundation Toolkit). Tighter integration with that cloud than Terraform; vendor-locks you in.

**Decision:**
- **Multi-cloud OR you want maximum portability**: Terraform / OpenTofu.
- **AWS-only OR you trust AWS\'s long-term direction**: AWS CDK.
- **Heavy programmability needed**: Pulumi.
- **Kubernetes-first, GitOps-first**: Crossplane.

Most large companies end up with **Terraform for the foundation + Crossplane for K8s-managed runtime services**. Different layers, different tools.`,
      },
      {
        question: 'Why is state management the hardest IaC problem?',
        answer: `Because **state is the truth, and the truth drifts**.

The state file tracks what the IaC tool *thinks* is deployed. Every \`plan\` and \`apply\` reads the state, compares it to your code, and computes the diff. When state and reality disagree, the diff is wrong → applies do unexpected things.

Common drift sources:
- **Click-ops**: someone modifies a resource in the AWS console. State unchanged. Next plan thinks the resource is still as-coded; doesn\'t see the manual change.
- **Out-of-band tools**: another automation (a custom Lambda, a deploy script) modifies a resource. State unchanged.
- **Manual recovery**: during an incident, someone modifies infrastructure to mitigate. State unchanged.
- **Provider bugs**: occasionally Terraform providers fail to update state correctly after an apply.

Failure modes:
- **"This resource already exists"**: state says doesn\'t exist; cloud says exists; apply tries to create and fails.
- **"Plan shows changes to a resource I didn\'t modify"**: state vs. reality drift; plan tries to "fix" the manual change.
- **State corruption**: state file gets damaged or partially written; recovery requires manual reconciliation via \`terraform import\` and \`terraform state rm\`.
- **Concurrent applies overwriting state**: without locking, two engineers running apply simultaneously corrupt state.

Best practices to avoid:
1. **Remote state with locking** (S3 + DynamoDB; GCS native locking; Terraform Cloud).
2. **Workspaces per environment** to avoid accidental cross-env applies.
3. **State backups** (S3 versioning, automated daily snapshots).
4. **Continuous drift detection**: scheduled \`terraform plan\` (Atlantis, Terraform Cloud, custom CI). Reports drift before next apply hits it.
5. **Forbid click-ops**: IAM policies that prevent humans from modifying production resources directly. All changes via IaC.
6. **\`terraform import\` discipline**: when a resource is created out-of-band, import to state immediately rather than letting drift accumulate.

The cultural fix: "infrastructure changes only via code review." Even small fixes go through PR. Slower but eliminates the drift category.`,
      },
      {
        question: 'How do you organize Terraform code at scale?',
        answer: `Three-layer structure:

**1. Modules (reusable building blocks)**
- Each module encapsulates a pattern: VPC, EKS cluster, RDS database, monitoring stack.
- Versioned: \`modules/vpc/v1.2.0\`. Allows independent module upgrades.
- Inputs (variables) and outputs documented.
- Private module registry (S3, Terraform Cloud) for distribution.

**2. Configurations (environment-specific)**
- \`environments/dev/\`, \`environments/staging/\`, \`environments/prod/\` — each its own state.
- Configurations import modules; provide environment-specific inputs.
- Workspaces sometimes used for variations within an env (us-east-1 vs us-west-2 within prod).

**3. Stacks / Layers**
- Within each environment, separate concerns into stacks: \`network\`, \`data\`, \`platform\`, \`apps\`.
- Each stack has its own state file. Smaller blast radius; faster planning.
- Stacks reference each other\'s outputs via \`terraform_remote_state\` data source.
- Order: network applied first (VPC, subnets), then data (RDS, S3), then platform (EKS), then apps (services).

**State organization:**
- One state file per stack per environment. So: \`prod-network.tfstate\`, \`prod-data.tfstate\`, etc.
- Smaller state = faster plans, smaller blast radius if state corrupted.
- Avoid the monolithic state file with 5000 resources — plan time becomes 30+ minutes.

**CI/CD:**
- PR opens → CI runs \`terraform plan\` and posts the diff as a comment.
- Reviewer reads the diff; approves or requests changes.
- Merge → CI runs \`terraform apply\` automatically (or with manual approval for prod).
- Atlantis or Terraform Cloud is the standard tool for this workflow.

**Drift detection:**
- Scheduled job runs \`terraform plan\` in all environments daily.
- Reports drift to a Slack channel or as a Jira ticket.
- Forces team to investigate when reality diverges from code.

**Anti-patterns:**
- One giant state file for everything.
- Modules with too many inputs (becomes its own configuration language).
- Configs that don\'t use modules (copy-paste of patterns).
- Click-ops "just this one time" that breaks the pattern.

The discipline: "everything via code review, modules versioned, state isolated by environment and stack." Slower than ad-hoc but scales to thousands of resources without falling over.`,
      },
    ],
    references: [
      'https://developer.hashicorp.com/terraform/language',
      'https://opentofu.org/docs/',
      'https://www.pulumi.com/docs/',
      'https://docs.crossplane.io/',
    ],
  },

  {
    id: 'cicd-progressive-delivery',
    title: 'CI/CD and Progressive Delivery — Canary, Blue/Green, Feature Flags',
    icon: 'gitMerge',
    color: '#f59e0b',
    questions: 3,
    description: 'The deployment-strategy spectrum, when to use each, and SLO-gated automated rollback.',
    visualizations: [
      {
        title: 'Progressive delivery CI/CD pipeline',
        description: 'PR → main → staging → canary (1-5%, SLO-gated) → progressive rollout (10%, 50%, 100%) → auto-rollback on SLI breach.',
        image: '/diagrams/sre/e3-cicd.png',
      },
    ],
    introduction: `Deployment is where most production incidents are born. ~60-80% of incidents trace to recent deploys (across multiple industry surveys). The discipline of *how* you deploy is more impactful than what code you ship.

**The deployment-strategy spectrum (lowest risk to highest):**

**1. Feature Flags (lowest risk)**
- Code is deployed but inactive. Flag controls who sees it.
- Roll out by user cohort: internal users → 1% of users → 10% → 100%.
- Rollback = flip the flag. Instant.
- Tools: LaunchDarkly, Unleash, Flagsmith, Statsig.

**2. Canary Deployment**
- New version deployed to a small fraction of traffic (1-5%).
- Monitored against SLOs for a "bake period" (10-30 min).
- If SLOs healthy: progressively promote (10% → 50% → 100%).
- If SLOs degrade: auto-rollback.
- Tools: Argo Rollouts, Flagger (Flux), service-mesh primitives (Istio).

**3. Blue/Green Deployment**
- Two production environments (Blue running v1; Green is a replacement v2).
- Traffic flips from Blue to Green at a single moment.
- Rollback: flip back to Blue.
- Faster than canary but requires duplicate capacity during the cutover.

**4. Rolling Update**
- Gradually replace instances; new version slowly takes over (e.g., Kubernetes default).
- Cheaper than blue/green (no duplicate capacity).
- Slower rollback than blue/green; can\'t instantly revert.

**5. Big-Bang / Recreate**
- Stop everything; deploy new version; start everything.
- Mandatory downtime. Used for breaking changes that can\'t coexist.
- Avoid for any service that should stay up.

**Choosing strategy:**
- **Stateless service with good observability**: Canary + feature flags. Standard 2026.
- **Stateful service or shared schema**: Feature flags + careful migration.
- **Old monolith**: Blue/green if you can afford the capacity; rolling otherwise.
- **Database schema changes**: Always feature-flagged at the application layer; expand-and-contract migration pattern.

**SLO-gated automated rollback:**
- During the canary bake, monitor the new version\'s SLI vs the baseline (old version).
- If new version\'s error rate / latency exceeds the old by some threshold (often 1.5×), auto-rollback.
- This is the modern standard. Tools (Argo Rollouts, Flagger) implement directly.
- Removes "engineer notices something\'s wrong" from the critical path.

**The expand-and-contract pattern (DB migrations):**
1. **Expand**: add new column / table. Old code unaffected.
2. **Migrate**: backfill new column from old.
3. **Dual-write**: both old code and new code write to both columns.
4. **Switch reads**: new code reads from new column. Old code still works.
5. **Switch writes**: only new code writes; new column is source of truth.
6. **Contract**: drop old column.
Each step is independently deployable; rollback at any step is safe.

**Deploy frequency vs reliability** (Accelerate / DORA research findings):
- High-performing teams deploy **multiple times per day**, MTTR is **< 1 hour**, change-failure rate is **< 15%**.
- Low-performing teams deploy **monthly to weekly**, MTTR is **> 1 day**, change-failure rate is **> 45%**.

The non-obvious finding: **frequent small deploys are MORE reliable** than infrequent large ones. Smaller surface area, easier rollback, less cumulative risk.`,
    whenToUse: [
      'Designing the deployment pipeline for a new service — start with canary + feature flags',
      'Reviewing existing pipeline — does it have SLO-gated auto-rollback?',
      'Database schema changes — expand-and-contract is required, not optional',
      'Post-incident — was the deploy strategy a contributing factor? Often yes',
    ],
    keyConcepts: [
      { term: 'Feature flags', definition: 'Runtime toggles for new code paths. Decouple deploy from release. Instant rollback (flip flag).' },
      { term: 'Canary deployment', definition: 'Small fraction of traffic to new version; bake period; SLO-gated promotion. Standard for stateless services.' },
      { term: 'Blue/Green', definition: 'Two complete environments; instant cutover. Fast rollback; needs duplicate capacity.' },
      { term: 'SLO-gated rollback', definition: 'Auto-rollback if canary\'s SLI exceeds baseline by threshold. Removes human-in-loop from rollback decision.' },
      { term: 'Expand-and-contract', definition: 'DB migration pattern: add column → backfill → dual-write → switch reads → switch writes → drop. Each step independently rollbackable.' },
      { term: 'DORA metrics', definition: 'Deploy frequency, lead time, MTTR, change-failure rate. Industry benchmark for delivery performance.' },
    ],
    keyQuestions: [
      {
        question: 'Walk me through canary deployment with SLO-gated rollback.',
        answer: `Standard pipeline:

**1. Pre-canary**: deploy to staging; smoke tests pass.

**2. Canary phase**: deploy v_new to 1-5% of production traffic. The remaining 95-99% still hits v_old.

**3. Bake period**: 10-30 minutes (longer for low-traffic services). During this:
   - Monitor canary\'s SLI metrics: error rate, latency p95/p99, business KPIs.
   - Compare canary vs baseline (the v_old population).
   - If canary\'s error rate is, say, 1.5× baseline, that\'s a regression.

**4. Decision point**:
   - **SLI healthy**: promote canary to next percentage (10%, 50%, 100%).
   - **SLI degraded**: auto-rollback. Drop canary to 0%; v_old serves all traffic.

**5. Progressive promotion**: 1% → 10% → 50% → 100%, with bake period at each step.

**The SLO gate**:
- Defined ratios: \`canary_error_rate / baseline_error_rate < 1.5\`.
- Defined absolute thresholds: \`canary_p99_latency < 1000ms\` regardless of baseline.
- Defined time windows: must hold for full bake period; transient blips don\'t fail.

**Tooling**:
- **Argo Rollouts** (Kubernetes): integrates with Prometheus / Datadog for SLI checks; auto-rollback on threshold breach.
- **Flagger** (Flux / service mesh): similar; checks Prometheus or Honeycomb metrics.
- **Spinnaker**: older, widely-deployed. Same model.
- **Cloud-native**: AWS CodeDeploy + CloudWatch alarms, GCP Deploy + Cloud Monitoring.

**The win**:
- Bad deploys caught in 10-30 min instead of hours.
- Customer impact bounded to ~5% of traffic for ~10 min, not 100% for 1 hour.
- Engineer doesn\'t need to manually monitor; automation handles the rollback decision.

**Pitfalls**:
- Bake period too short: a canary that "looks fine" for 5 min may have issues that surface at 15 min (slow leaks, batch jobs, GC pauses).
- Wrong SLI: alerting on infrastructure metrics (CPU) instead of user-facing metrics (errors, latency).
- No baseline comparison: just absolute thresholds miss "this version is 2× slower than the last but still under target."
- Sticky cohort: routing 5% of users (consistent across requests) is more representative than 5% of requests; use cookies or user-IDs for canary cohort.`,
      },
      {
        question: 'How do you handle a database schema change safely?',
        answer: `**Expand-and-contract** (also called "parallel change"). Every step is independently deployable and rollbackable.

Worked example: renaming column \`old_name\` to \`new_name\`.

**Step 1: Expand schema** (deploy SQL migration only)
- \`ALTER TABLE users ADD COLUMN new_name TEXT;\`
- Old code unaffected. Reads from old_name; writes to old_name.
- Rollback: drop the new column.

**Step 2: Backfill** (run a migration job)
- Copy old_name to new_name for all existing rows. Often done in batches over hours/days for large tables.
- Old code unaffected.
- Rollback: ignore new_name (still empty for rows after the backfill stops).

**Step 3: Dual-write** (deploy app v2 behind feature flag)
- App writes to BOTH old_name and new_name on every update.
- App reads from old_name (still source of truth).
- Rollback: flip flag → back to single-write.

**Step 4: Switch reads** (deploy app v3 / flip another flag)
- App reads from new_name; writes to BOTH (still dual-write).
- Verify reads work correctly via canary.
- Rollback: flip flag → reads from old_name.

**Step 5: Switch writes** (deploy app v4 / flip another flag)
- App writes only to new_name. Reads from new_name. New_name is source of truth.
- Old_name no longer maintained.
- Rollback: flip flag → re-enable dual-write. Old_name re-syncs over time.

**Step 6: Contract** (deploy SQL migration)
- \`ALTER TABLE users DROP COLUMN old_name;\`
- Only after weeks of confidence at step 5.
- Rollback: now expensive — re-add column, re-backfill from new_name.

**The principle**: at every step, the system can run with a mix of old and new code, and rollback to the previous step is a flag flip or a small migration. No "big bang" cutover.

**Time investment**: a "rename column" change might span 2-4 weeks. For non-critical services, this feels overengineered. For revenue-critical services, it\'s the only safe path.

**Shortcuts** (when acceptable):
- Tiny tables (<10K rows): can sometimes do online cutover with brief lock.
- Tables not in critical path: shorter dual-write window.
- Read-only changes: just add the column; no migration needed.

The pattern is widely covered in books (Refactoring Databases, Database Reliability Engineering) and is the default for high-availability services at scale.`,
      },
      {
        question: 'What does the DORA research say about deploy frequency vs reliability?',
        answer: `The Accelerate / DORA research (Forsgren, Humble, Kim, 2018-2024 annual reports) identifies four key metrics — **deploy frequency, lead time, MTTR, change-failure rate** — and finds **high-performing teams excel on all four simultaneously**.

The non-obvious finding: high-performing teams deploy **MORE frequently** AND have **LOWER failure rates** AND have **SHORTER MTTR**. The intuition that "more deploys = more risk" is wrong.

The 2024 numbers (rough, from the State of DevOps report):

| Metric | Low | Medium | High | Elite |
|---|---|---|---|---|
| Deploy frequency | < monthly | weekly-monthly | weekly-daily | multiple/day |
| Lead time | months | weeks-months | days-weeks | < 1 day |
| MTTR | > 1 week | < 1 week | < 1 day | < 1 hour |
| Change-failure rate | > 45% | 15-45% | < 15% | < 15% |

Why frequent small deploys are MORE reliable:

1. **Smaller change set per deploy.** A deploy with 5 commits has bounded risk; a deploy with 500 commits is a wildcard.
2. **Faster rollback.** Small changes are easier to revert. Big changes have entanglements.
3. **Better SLI signal.** If the canary degrades, you know which deploy caused it. With monthly deploys, "which of the 200 changes is to blame?" is hard.
4. **Practiced muscle memory.** Teams that deploy daily have battle-tested pipelines; teams that deploy monthly have unrehearsed pipelines that break unexpectedly.
5. **Smaller blast radius.** Smaller changes typically have smaller user impact even when they fail.

The implication for SRE: **invest in pipeline reliability** (canary, SLO-gated rollback, fast CI) to *enable* high deploy frequency. Don\'t suppress deploy frequency to "manage risk."

The mistake low-performing teams make: "we\'ll deploy carefully, once a month, with extensive testing." This produces the opposite of what they want — large-batch high-risk deploys with rusty pipelines. Industry data is unambiguous on this.`,
      },
    ],
    references: [
      'https://argoproj.github.io/argo-rollouts/',
      'https://flagger.app/',
      'https://cloud.google.com/devops/state-of-devops',
      'https://martinfowler.com/bliki/ParallelChange.html',
    ],
  },

  {
    id: 'gitops',
    title: 'GitOps — Argo CD, Flux, and the Pull Model',
    icon: 'gitBranch',
    color: '#f59e0b',
    questions: 3,
    description: 'Git as the source of truth for infrastructure and applications, the pull model, and reconciliation loops.',
    introduction: `**GitOps** is a deployment philosophy: **Git is the source of truth for desired state; agents continuously reconcile actual state to match Git.** Coined by Weaveworks (2017); widely adopted in Kubernetes shops.

**The four GitOps principles** (from gitops.tech):

1. **Declarative** — system state described declaratively (YAML, HCL, etc.). Not imperative scripts.
2. **Versioned and immutable** — desired state stored in Git; full audit trail; rollback via revert.
3. **Pulled automatically** — agents in the cluster pull from Git; no external CD pushes.
4. **Continuously reconciled** — agents constantly compare actual to desired; correct drift.

**Pull vs push:**

The traditional CI/CD model is **push**: CI/CD service has cluster credentials, runs \`kubectl apply\` from outside the cluster.
- Risk: CI/CD service holds production credentials. Compromise = production compromise.
- Risk: failed pushes can leave inconsistent state. CI/CD has no view of "what\'s actually deployed now."

The GitOps **pull** model: an agent INSIDE the cluster watches Git and applies changes.
- Cluster credentials never leave the cluster.
- Agent has continuous view of actual state; corrects drift.
- Audit trail: every change is a Git commit; \`git log\` is the deploy history.

**Tools:**

**Argo CD** (CNCF): the most popular. Web UI showing sync status, diffs, history. Multi-cluster support. Extensive RBAC.

**Flux** (CNCF): pioneered GitOps. Lightweight; integrates with Helm and Kustomize natively. v2 added multi-tenancy improvements.

Both:
- Watch Git repos.
- Pull state on a schedule (typically every 1-5 min).
- Apply via Kubernetes API.
- Detect and report drift.
- Auto-correct (if configured) or alert.

**The repository structure (canonical):**

\`\`\`
gitops-repo/
├── apps/
│   ├── checkout/
│   │   ├── base/         # base manifests
│   │   └── overlays/     # per-env Kustomize overlays
│   │       ├── dev/
│   │       ├── staging/
│   │       └── prod/
│   └── ...
├── infrastructure/
│   ├── monitoring/
│   ├── ingress/
│   └── ...
└── clusters/
    ├── dev/              # cluster-level config
    ├── staging/
    └── prod/
\`\`\`

Each cluster has an Argo CD / Flux installation that watches the corresponding path. Promotion (dev → staging → prod) is a Git operation: bump the image tag in the env\'s overlay.

**Integration with progressive delivery:**

GitOps + Argo Rollouts (or Flagger) is the standard 2026 stack.
- Git holds the desired image version.
- Argo CD pulls; deploys to the cluster.
- Argo Rollouts (or Flagger) handles the canary / progressive rollout / SLO-gated rollback.
- Successful rollout → no Git change needed; rollback via Argo Rollouts auto-reverts (Argo CD won\'t re-apply unless Git changes).

**Where GitOps shines:**
- Multi-cluster, multi-environment deployments — central Git, per-cluster agents.
- Auditability — every change is a commit.
- Rollback — revert the commit.
- Drift detection / correction — agents constantly verify actual = desired.

**Where it struggles:**
- Stateful operations (database migrations, one-time jobs) — GitOps is for declarative state; imperative ops awkwardly fit.
- Secrets — Git isn\'t a secrets store. Use Sealed Secrets, External Secrets, Vault integration.
- Large monorepo size — Argo CD struggles with very large repos; sometimes split into multiple.

**The Crossplane intersection.** Crossplane + GitOps is "everything is a Kubernetes resource managed by Git." Even cloud infrastructure (RDS, S3) becomes K8s objects that Argo CD reconciles. Powerful but more complex than Terraform-for-infra-and-K8s-for-apps.`,
    whenToUse: [
      'Multi-cluster Kubernetes deployments',
      'Auditability / compliance requirements — Git log as deploy log',
      'Drift-prone environments — continuous reconciliation prevents surprise',
      'Teams transitioning from manual deploys to automation — GitOps + PR-based reviews',
    ],
    keyConcepts: [
      { term: 'GitOps four principles', definition: 'Declarative + Versioned & Immutable + Pulled Automatically + Continuously Reconciled. Coined by Weaveworks.' },
      { term: 'Pull model', definition: 'Agent inside cluster watches Git; applies changes. Opposite of push (external CI/CD does kubectl apply).' },
      { term: 'Argo CD', definition: 'CNCF GitOps tool with Web UI. Multi-cluster, RBAC, sync status, diff view. Most popular GitOps in 2026.' },
      { term: 'Flux', definition: 'CNCF GitOps tool. Lightweight; native Helm + Kustomize. v2 has multi-tenancy.' },
      { term: 'Drift correction', definition: 'Agents continuously compare actual vs desired; either auto-correct or alert. Eliminates "someone clicked in the cluster" problem.' },
      { term: 'Promotion via Git', definition: 'dev → staging → prod is a Git operation: change the image tag. PRs review the change.' },
    ],
    keyQuestions: [
      {
        question: 'What is GitOps and why does it matter?',
        answer: `GitOps treats **Git as the source of truth for desired infrastructure / application state**, with **agents in the cluster continuously reconciling actual state to match**.

Four principles (Weaveworks):
1. **Declarative**: state in YAML / HCL, not imperative scripts.
2. **Versioned & immutable**: state in Git; revert = rollback.
3. **Pulled automatically**: agent in the cluster watches Git.
4. **Continuously reconciled**: agent corrects drift in real-time.

Why it matters:

**1. Security**: cluster credentials never leave the cluster. CI/CD doesn\'t have prod kubeconfig. A compromised CI runner can\'t push to prod.

**2. Auditability**: every change is a Git commit. Who, what, when, why (PR description). \`git log\` is your deploy log. Compliance teams love it.

**3. Rollback**: \`git revert\` and the agent applies the previous state. Faster than chasing kubectl history.

**4. Drift correction**: someone runs \`kubectl edit\` on a resource; the agent re-applies the Git state on the next sync (1-5 min later). Eliminates the "someone modified it manually six months ago and we forgot" problem.

**5. Multi-cluster scale**: each cluster has its own agent. One Git repo can drive 50 clusters; you don\'t have to maintain 50 CD pipelines.

**6. Disaster recovery**: cluster destroyed? Bootstrap a new one; install agent; point at Git. Cluster auto-rebuilds itself.

The shift from "I deploy by running kubectl" to "I deploy by merging a PR" is the cultural change. PRs review infrastructure the same way they review code; deploys are auditable and reversible.

The trade-off: imperative operations (one-time migrations, ad-hoc fixes) become awkward. They want imperative scripts; GitOps wants declarative state. Most teams handle these via Argo CD\'s "sync hooks" or out-of-band tooling.`,
      },
      {
        question: 'Argo CD vs Flux — how do you choose?',
        answer: `Both are CNCF-graduated, both implement GitOps well. The differences:

**Argo CD**:
- **Web UI** is excellent. Visualize app health, sync status, diffs, rollback history. Engineers can see what\'s deployed without kubectl.
- **Multi-tenancy** via Projects. Built-in RBAC. Multi-cluster from one Argo CD installation.
- **App-of-apps** pattern: one app deploys other apps. Hierarchical org structure.
- **Larger community**, more enterprise adopters. Easier to hire for.
- Heavier (UI + controller + multiple components).

**Flux**:
- **No built-in UI** (Web UI exists via "Weave GitOps" addon, less polished than Argo).
- **Lighter** (just controllers).
- **Native Helm and Kustomize support** out of the box.
- **Notification controller** built-in (alerts to Slack, Teams, etc.).
- **Image automation**: Flux can scan Docker registries and bump versions automatically (Argo can with separate Argo Image Updater).
- v2 has multi-tenancy improvements but still less polished than Argo.

**Decision criteria**:

Choose **Argo CD** if:
- You want a polished UI for app status / sync.
- You have multiple teams sharing GitOps; need RBAC.
- You\'re running at scale (50+ apps, 10+ clusters).
- Hireability matters (Argo skills are more common).

Choose **Flux** if:
- You want minimal moving parts.
- Helm-heavy stacks (Flux has very clean Helm support).
- You want image-automation built-in.
- You\'re already CNCF / cloud-native culture and don\'t need a UI.

In 2026, Argo CD is more popular (~70/30 split in surveys); Flux is the "principled minimalist" choice. Both are excellent.

Hybrid: some teams run both. Argo CD for app teams (UI valuable); Flux for platform team\'s low-level configurations.`,
      },
      {
        question: 'How do GitOps and progressive delivery fit together?',
        answer: `They\'re complementary layers. **GitOps drives the desired state; progressive delivery handles HOW the state change is rolled out.**

Worked example:

**1. Engineer pushes a code change.**
- CI builds new container image: \`checkout:v3.2.1\`.
- CI updates the GitOps repo: bumps image tag in \`apps/checkout/overlays/prod/kustomization.yaml\` from \`v3.2.0\` to \`v3.2.1\`.
- Bot opens PR; engineer reviews and merges.

**2. Argo CD detects the Git change.**
- Within 1-5 min, syncs the cluster to the new state.
- Tells the cluster: "the desired Deployment image is \`checkout:v3.2.1\`."

**3. Argo Rollouts takes over** (instead of plain Deployment).
- Sees the new image; starts a canary rollout instead of rolling update.
- Routes 5% of traffic to v3.2.1; bake for 10 min.
- Monitors SLI metrics from Prometheus.

**4. SLI healthy → progressive promotion.**
- Argo Rollouts moves to 25%, 50%, 100% with bake periods.

**5. SLI degrades → auto-rollback.**
- Argo Rollouts pauses or reverses the rollout.
- The old version (v3.2.0) keeps serving.
- Argo CD will see "actual ≠ desired" but Argo Rollouts owns the rollout state, so it doesn\'t fight.
- Engineer is alerted; investigates; either fixes forward (new commit) or accepts rollback (Git revert).

The win: **safety + auditability**. Every change is a Git commit (audit trail); but the actual rollout is gradual and SLO-gated (safety).

The same pattern works with Flagger (canaries via service mesh), Linkerd Traffic Split, or KEDA-driven rollouts.

What this replaces: the old model of "engineer SSHs to a host and runs deploy.sh." That had no audit, no canary, no auto-rollback. GitOps + progressive delivery has all three with full automation.

In 2026, this stack (GitOps + canary + SLO-gated rollback) is the modern standard. Greenfield Kubernetes services should default to it.`,
      },
    ],
    references: [
      'https://opengitops.dev/',
      'https://argo-cd.readthedocs.io/',
      'https://fluxcd.io/',
      'https://www.weave.works/blog/what-is-gitops-really',
    ],
  },

  {
    id: 'self-healing-systems',
    title: 'Self-healing — Auto-restart, Auto-scale, Auto-remediate',
    icon: 'refreshCw',
    color: '#f59e0b',
    questions: 3,
    description: 'Kubernetes liveness probes, autoscaling, automated runbooks, and the limits of self-healing.',
    introduction: `**Self-healing** is the discipline of building systems that recover from failures without human intervention. The fewer pages, the fewer mistakes; the higher the availability per engineer-hour invested.

**Layers of self-healing:**

**Layer 1: Process-level (auto-restart)**
- Process crashes → supervisor restarts it.
- systemd, Docker restart policies, Kubernetes liveness probes.
- Catches: memory leaks, deadlocks, panics, transient bugs.
- Limits: doesn\'t fix the underlying cause; if crash-loop, supervisor enters back-off.

**Layer 2: Instance-level (auto-replace)**
- Instance fails health check → load balancer removes it; orchestrator launches replacement.
- Kubernetes Deployment + readiness probe; AWS ASG with health checks.
- Catches: bad host, network issue, instance hardware failure.
- Limits: doesn\'t fix capacity issues if the underlying problem is "all instances overloaded."

**Layer 3: Capacity-level (autoscaling)**
- Load increases → autoscaler adds instances; load decreases → removes.
- Kubernetes HPA (CPU/memory), VPA, Karpenter (cluster), KEDA (event-driven), AWS ASG with target tracking.
- Catches: traffic spikes, slow ramp.
- Limits: doesn\'t fix bugs; doesn\'t fix the dependency that\'s overloaded.

**Layer 4: Topology-level (auto-failover)**
- Region / AZ fails → traffic routes to healthy region.
- Route 53 health checks, AWS Global Accelerator, Cloudflare Load Balancer, Cilium.
- Catches: AZ outages, network partitions, regional failures.
- Limits: doesn\'t fix data corruption; doesn\'t fix application bugs.

**Layer 5: Application-level (graceful degradation)**
- Dependency fails → service serves cached / partial / fallback response.
- Circuit breakers, fallback methods, feature flags.
- Catches: slow / failing downstream dependencies.
- Limits: needs application-level work; not a free win.

**Layer 6: Runbook automation (auto-remediate)**
- Alert fires → automated runbook runs mitigation.
- Tools: PagerDuty Rundeck, StackStorm, custom Lambda + alert webhooks.
- Catches: known patterns ("disk full → expand volume"; "queue backed up → scale workers"; "stuck process → restart").
- Limits: only handles patterns you\'ve seen before.

**Kubernetes self-healing primitives:**

- **Liveness probe**: "is the process alive?" Failure → kill and restart.
- **Readiness probe**: "is the process ready to serve?" Failure → remove from service endpoints.
- **Startup probe**: "has the process finished initializing?" Used for slow-starting apps.
- **PodDisruptionBudget**: "minimum healthy pods during voluntary disruption." Prevents auto-scaling from breaking the service.
- **HPA**: scales pods based on metric (CPU, custom).
- **Karpenter / Cluster Autoscaler**: scales nodes when pod requests exceed cluster capacity.

**Key insight: probes are critical AND dangerous.**

A liveness probe that\'s too aggressive kills healthy pods (false-positive crash-loop). A liveness probe that\'s too lenient lets dead pods linger. Tune carefully:

- **Liveness should test "the process is functional," not "the request can be served."** A liveness probe that hits a database and fails when the DB is slow will kill all your pods → cascading outage.
- **Readiness can be more aggressive.** Removing from service endpoints is reversible; killing is not.
- **Startup probes for slow-starting apps.** Don\'t kill a Java app that takes 3 minutes to warm up because the liveness probe fails at second 30.

**Limits of self-healing:**

- **Doesn\'t fix design errors.** A service that crashes on every 1000th request gets restarted forever; nobody fixes the bug because the symptom is mitigated.
- **Hides failure modes.** Auto-remediation can mask developing problems until they\'re catastrophic.
- **Adds debugging complexity.** "The pod restarted twice; the metric spiked; what was the cause?" — automation has erased the evidence.

**The discipline**: every auto-remediation should **alert the humans** even if it succeeds, so the underlying pattern is reviewed. "Auto-restart succeeded" is information; investigate the cause.`,
    whenToUse: [
      'Designing a new service — set up probes, autoscaling, replication from day 1',
      'Reviewing pages — which pages could be auto-remediated? Likely 50%+',
      'Capacity planning — autoscaling parameters for traffic patterns',
      'Postmortems — was a self-healing layer not in place that should have been?',
    ],
    keyConcepts: [
      { term: 'Liveness vs readiness probe', definition: 'Liveness = "kill if failing"; readiness = "remove from endpoints if failing." Liveness more dangerous; tune carefully.' },
      { term: 'Autoscaler', definition: 'Adjust capacity based on signal. HPA (pod-level), VPA (resource-tuning), Karpenter (node-level), KEDA (event-driven).' },
      { term: 'Circuit breaker', definition: 'Stop calling a failing dependency for X minutes; serve fallback. Prevents cascading failure.' },
      { term: 'Auto-remediation', definition: 'Automated runbook fires on alert. "Disk full → expand"; "queue backed up → scale." Saves pages.' },
      { term: 'Probes can amplify outages', definition: 'A probe that hits a database fails when DB is slow → kills all pods → outage. Probes should test process health, not full system.' },
      { term: 'Auto-remediation alerts', definition: 'Even when auto-remediation succeeds, log/alert that it fired. Otherwise patterns are invisible until catastrophic.' },
    ],
    keyQuestions: [
      {
        question: 'How do you design Kubernetes probes correctly?',
        answer: `Three rules learned from production failures:

**1. Liveness probes must test PROCESS health, not SYSTEM health.**
- ✅ Good: liveness hits an in-process \`/healthz\` endpoint that returns 200 if the goroutine pool is alive, the request handler can answer.
- ❌ Bad: liveness hits the database. When the DB is slow, every pod\'s liveness fails. Kubernetes kills every pod. Now you have an outage AND no service.

The pattern: liveness should be testing "is this Go process / Java process alive and able to serve requests in principle?" Not "is the entire path through database working?"

**2. Readiness probes can be more aggressive than liveness.**
- Readiness failures remove from service endpoints (reversible).
- Liveness failures kill the pod (irreversible during the kill).
- Readiness can include "is my downstream dependency healthy?" — pulling out of rotation when downstream is broken is fine.
- Liveness should NOT include downstream — the pod is healthy in itself, even if the downstream is broken.

**3. Tune timing carefully.**
- **initialDelaySeconds**: how long to wait before starting probes. Set to "longer than your typical startup time." For a Java app: 60-180s.
- **periodSeconds**: how often to probe. Default 10s is usually fine.
- **failureThreshold**: how many failures before declaring failed. Default 3 is fine.
- **timeoutSeconds**: how long each probe waits. Default 1s is often too short for cold paths; 5-10s is safer.

**Use a startup probe for slow-starting apps.**
- Newer Kubernetes feature. Before the startup probe succeeds, liveness/readiness aren\'t checked.
- Solves the "Java takes 3 min to warm up; liveness kills it at 30s" problem.

**Worked example for a Java service:**
\`\`\`yaml
startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  failureThreshold: 30      # 30 × 10s = 5 min total
  periodSeconds: 10
livenessProbe:
  httpGet:
    path: /healthz          # in-process check
    port: 8080
  periodSeconds: 30
  timeoutSeconds: 5
readinessProbe:
  httpGet:
    path: /ready            # includes downstream dep checks
    port: 8080
  periodSeconds: 10
  timeoutSeconds: 5
\`\`\`

The takeaway: **probes are load-bearing AND dangerous**. A misconfigured probe doesn\'t protect — it can take you down.`,
      },
      {
        question: 'When does auto-remediation HELP and when does it HURT?',
        answer: `**Helps** when:
- The pattern is well-understood and the fix is reliable.
- The fix is reversible if applied incorrectly.
- The alert is high-frequency (auto-remediation eliminates pages).
- Failure of the auto-remediation is detectable (will alert humans).

Examples that work:
- **Disk full** → expand volume (cloud-native, fully automated, reversible).
- **Queue backed up** → scale up consumers (autoscaling on queue depth).
- **Stuck process** → restart (Kubernetes liveness probe).
- **Failed deploy** → auto-rollback (Argo Rollouts SLO-gated).
- **Cert expiry** → auto-renew (cert-manager).

**Hurts** when:
- The pattern is masked by the remediation; underlying bug never gets fixed.
- The remediation has side effects you don\'t notice.
- The remediation can make things worse if applied incorrectly.
- The remediation hides developing problems.

Examples that have hurt:
- **Auto-restart on crash** without alerting → the bug that causes crashes once an hour stays in production for years; users just see brief outages.
- **Auto-scale on CPU** without circuit breakers → if downstream is the bottleneck, scaling up just hammers the downstream more, making it worse.
- **Auto-clear stuck tasks** → an underlying bug in task processing is masked; data inconsistency develops silently.
- **Auto-recover databases** without verification → silent corruption propagates because the "recovered" replica was actually bad.

**The discipline:**
1. **Auto-remediate the symptom; alert on the cause.** When auto-restart fires, log it. When the count crosses a threshold, page someone. Pattern visible.
2. **Don\'t auto-remediate things you don\'t understand.** A new alert pattern shouldn\'t get auto-remediation in the first week; observe it first, build the runbook, automate after.
3. **Make remediation idempotent and bounded.** Auto-restart with exponential back-off (Kubernetes does this); doesn\'t infinite-loop.
4. **Test the auto-remediation in staging.** A broken auto-remediation can do real damage; test like any other code.
5. **Track auto-remediation rate as a metric.** If "disk-expand" fires 5× in a week, the underlying disk-fill pattern needs investigation, not silence.

The right framing: **auto-remediation buys you time; it doesn\'t fix the problem**. Use the time to fix the underlying pattern.`,
      },
      {
        question: 'How do you design autoscaling policies?',
        answer: `Four-step process:

**1. Pick the right signal.**
- **CPU**: works for CPU-bound services. Default Kubernetes HPA.
- **Memory**: tricky — memory usage doesn\'t always correlate with load.
- **Custom metric**: usually better. Examples: queue depth (scale by backlog), request rate, p95 latency.
- **External event**: Kafka lag, SQS depth, Pub/Sub messages → KEDA (Kubernetes Event-Driven Autoscaling).
- **Predictive**: time-of-day, day-of-week patterns → AWS predictive scaling, scheduled HPA.

The pattern: **scale on the metric that\'s closest to user impact**. For request-driven services: request rate. For background workers: queue depth. CPU is a fallback when nothing better is available.

**2. Set thresholds with hysteresis.**
- **Scale-up threshold**: e.g., scale up when CPU > 70% for 1 min.
- **Scale-down threshold**: e.g., scale down when CPU < 50% for 5 min.
- **Cooldown**: 5-10 min after each action; prevents thrash.

The asymmetry is intentional: scale up fast (users wait), scale down slow (avoid premature shrinking → re-scaling cycle).

**3. Set sensible bounds.**
- **min replicas**: enough to handle baseline load with N+1 redundancy. 2-3 minimum for any production service.
- **max replicas**: bounded by what your dependency can handle. If your DB has 100 connections and each pod uses 5, max replicas is 20 (with safety margin).

**4. Test under load and during scale events.**
- Synthetic load test that ramps from baseline to 5× baseline. Watch: did autoscaling react in time? Did the system stay within SLO?
- Watch what happens at the autoscaling LIMIT. Does the service degrade gracefully or fall over?
- Watch what happens during scale-down. Are draining-aware shutdowns working? Are sticky sessions broken?

**Common failures:**
- **Thrash**: scale up + scale down cycling rapidly. Fix: longer cooldowns, more hysteresis.
- **Slow scale**: CPU spike to 100%, autoscaler reacts, pods take 5 min to start. By the time they\'re ready, traffic spike is over. Fix: predictive scaling, faster pod startup, lower scale-up threshold.
- **Downstream saturation**: scaling up the service pushes more traffic to a DB that\'s already at limits → DB collapses → service collapses. Fix: bounds on max replicas.
- **No min replicas during low-traffic**: scaled to 0; first request hits cold-start. Fix: min replicas of 2-3.

The right framing: autoscaling is a TOOL, not a SUBSTITUTE for capacity planning. Reserve capacity for baseline; autoscale for spikes; alert when you\'re at the bounds repeatedly.`,
      },
    ],
    references: [
      'https://kubernetes.io/docs/concepts/workloads/pods/disruptions/',
      'https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/',
      'https://keda.sh/',
      'https://karpenter.sh/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // F. Capacity Planning & Performance
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'capacity-planning-method',
    title: 'Capacity Planning Method — Forecast, Provision, Reconcile',
    icon: 'trendingUp',
    color: '#8b5cf6',
    questions: 3,
    description: 'The Google SRE Book\'s capacity planning model: predict demand, allocate resources, validate against reality.',
    introduction: `**Capacity planning** is the SRE discipline of ensuring you have the right amount of resources for current and future load — not too much (waste money) and not too little (outages).

The SRE Book Ch 18 framework: capacity planning is **predictive**, not reactive. By the time you\'re scaling under load, it\'s already too late for non-trivial provisioning (rack-scale, contract-scale, region-scale). Plan ahead.

**The three-step loop:**

**1. Forecast demand.**
- Historical traffic data + business projections.
- Per-resource, per-region, per-time-window. Peak-hour traffic differs from off-hour.
- Account for events: marketing campaigns, holiday spikes, product launches, pre-emptive client onboarding.
- Forecast horizon: 1 month for tactical, 1 quarter for normal planning, 1 year for hardware procurement.

**2. Provision capacity.**
- Translate forecast into resource requirements: instance count, CPU, memory, network bandwidth, storage IOPS.
- Order or reserve. Cloud: reserved capacity, savings plans, or just-in-time. On-prem: hardware ordering with lead times of weeks-months.
- Buffer for forecast error (typically 1.5×-2× the forecast for unbounded ranges; tighter for confident forecasts).

**3. Reconcile actual vs forecast.**
- Track actual usage vs forecast over time.
- Adjust the model when reality differs.
- Build forecast skill iteratively.

**Two key concepts (from SRE Book Ch 18):**

**Resource fungibility** — can you swap underutilized capacity from one workload to another? Cloud: easy (instances are fungible). Multi-tenant Kubernetes: easy (pods reschedule). Dedicated machines per service: hard. Higher fungibility = less buffer needed.

**Critical resource** — the one resource that becomes the bottleneck first. CPU? Memory? Network? Disk IOPS? Database connections? Provision based on the critical resource; everything else is over-provisioned by the same ratio.

**Demand drivers (what to forecast):**

- **Organic growth** — your user base is growing X%/quarter. Project linearly or with growth model.
- **Engagement** — existing users are using more. Project from per-user metrics.
- **Product launches** — new feature opens new traffic patterns. Estimate from staging tests + pilot.
- **External events** — sales, holidays, news cycles. Often have prior-year data.
- **Migration / consolidation** — bringing a new service into the platform. Estimate from source.

**Confidence intervals**: any forecast is a range, not a number. Provision for the upper bound; alert if you\'re tracking toward it; rebudget if you\'re consistently above.

**The "buffer for the unknown":**
- Tight forecast (well-understood traffic, daily granularity): 10-20% headroom.
- Medium forecast (quarterly, mixed traffic types): 30-50% headroom.
- Wide forecast (new product, unknown adoption): 100%+ headroom; commit only as needed.

**Common failures:**
- **No forecast at all** — "we\'ll buy more when we run out." Works at small scale; fails at scale because procurement / provisioning has lead time.
- **Forecasting only on average** — peak hour matters more than average. Plan for peak.
- **Ignoring failure-mode capacity** — N+1 redundancy means you need 1.5× peak-hour capacity (in 3-replica config) to survive a replica loss during peak.
- **Forecasting too far out** — beyond 1 year is mostly noise. Re-plan quarterly.`,
    whenToUse: [
      'Quarterly capacity reviews — what does the next 3 months look like?',
      'Pre-launch — does the new service have provisioned capacity?',
      'Pre-event — black friday, product launch, marketing campaign',
      'Cost optimization — am I over-provisioned?',
    ],
    keyConcepts: [
      { term: 'Forecast / provision / reconcile', definition: 'Three-step loop. Forecast demand; provision resources; reconcile actual vs forecast; iterate.' },
      { term: 'Resource fungibility', definition: 'Can spare capacity be swapped between workloads? Cloud: easy. Dedicated hosts: hard. Higher fungibility = lower buffer.' },
      { term: 'Critical resource', definition: 'The first resource that becomes the bottleneck. Plan based on this; over-provision the rest.' },
      { term: 'Headroom / buffer', definition: 'Capacity beyond peak forecast. 10-20% for tight forecasts; 100%+ for unknowns.' },
      { term: 'Failure-mode capacity', definition: 'N+1 redundancy needs 1.5× peak (in 3-replica). Plan for peak DURING failure, not steady-state peak.' },
    ],
    keyQuestions: [
      {
        question: 'Walk me through capacity planning for a service.',
        answer: `Three-step loop, applied iteratively:

**Step 1: Forecast demand.**
- Pull last 90 days of traffic. Identify peak hour, peak day, growth rate.
- Layer business inputs: marketing campaigns, holiday seasonality, product launches, sales projections.
- Build a model: \`peak_qps_at_T = current_peak * (1 + growth_rate)^(T - now) + event_lifts\`.
- Output: per-month forecast for the next quarter.

**Step 2: Translate to resources.**
- Identify the **critical resource**: CPU, memory, DB connections, network egress.
- Per the critical resource: \`required_instances = forecast_peak_qps / qps_per_instance + buffer\`.
- Buffer: 1.2-2.0×, depending on forecast confidence.
- Account for **failure-mode capacity**: if you need to survive losing 1 of N replicas, multiply by N/(N-1). For 3 replicas: 1.5×.

**Step 3: Provision and reconcile.**
- Provision the resources (cloud: scale up the autoscaler max, reserve instances; on-prem: order hardware).
- Track actual usage vs forecast monthly.
- When actual diverges from forecast >20%, revisit the model.

**Example (worked):**
- Service runs at 1000 QPS peak, on 5 instances of 200 QPS each.
- Forecast: 50% growth over the next quarter → 1500 QPS peak.
- Required instances: 1500 / 200 = 7.5 → 8.
- Buffer (medium forecast confidence, 1.5×): 12 instances.
- Failure mode (survive 1-of-3 AZ failure): each AZ needs to handle 12/2 = 6 instances; total 18 instances across 3 AZs.
- Provisioned: 18-instance autoscaler max; current min 12; reserved capacity for 12.

This is the math; the discipline is doing it BEFORE you need it. Reactive capacity planning is "scale up after the page fires" — too late for region-scale decisions.`,
      },
      {
        question: 'What\'s the difference between average load and peak load capacity planning?',
        answer: `**Plan for peak. Always.** Average is for cost forecasting; peak is for SLO survival.

The math: most services have peak/average ratios of 2-10×. A service averaging 1000 QPS might peak at 5000 QPS during business hours. If you provision for 1000, you\'ll fall over at 1500.

The peak that matters:
- **Peak hour during peak day** — the busiest hour. For most consumer services, that\'s evening or lunch hour.
- **Peak event** — Black Friday, product launch, news cycle. Can be 5-50× normal peak.
- **Failure-mode peak** — peak hour during a partial outage. If 1 of 3 AZs is down during peak, the other 2 AZs see 1.5× their normal peak.

The discipline: the SLO must hold during all of these. So capacity must support:
- **Steady-state peak** (the regular peak hour): ~50% headroom typical.
- **Event peak** (rare, planned events): pre-scaled for the event.
- **Failure-mode peak** (what if we lose a region during peak): N+1 or N+2 redundancy with capacity to absorb.

The cost trade-off: provisioning for peak means most of the time you\'re at 30-50% utilization. Cloud autoscaling helps — scale up at the start of peak, scale down at the end. But cloud has limits:
- **Scale-up speed** — autoscaling reacts in minutes; sudden spikes (slashdot effect, viral content) outpace scaling.
- **Reservation cost** — fully on-demand is expensive. Reserved instances or savings plans for the predictable baseline; on-demand for spikes.
- **Dependency saturation** — you can scale your service, but if your DB has 100 connections max, scaling doesn\'t help past that.

The pragmatic stack:
- **Reserved capacity** for steady-state peak (predictable, cost-optimized).
- **On-demand autoscaling** for daily peak hours (moderate cost).
- **Pre-scaling** before known events (Black Friday, marketing pushes).
- **Buffer** for the unknown.`,
      },
      {
        question: 'How do you calculate "failure-mode capacity"?',
        answer: `The principle: **plan capacity for the worst-case scenario where one replica / AZ / region is unavailable.**

Concrete: I have 3 AZs, traffic split evenly. Each AZ has 4 instances. Total 12 instances serve peak load.

If 1 AZ fails:
- The remaining 2 AZs absorb all traffic.
- Each must now handle 1.5× its normal load.
- If each AZ\'s instances were at 60% utilization before, they\'re now at 90%. Tolerable.
- If each AZ\'s instances were at 80% before, they\'re now at 120%. Outage.

The math:
- **N+1 redundancy** (3 replicas, lose 1): \`per_replica_load = total_load / (N - 1)\`. So peak-hour utilization must be ≤ \`(N-1)/N\` = 67% for N=3.
- **N+2 redundancy** (3 replicas, lose 2): peak utilization must be ≤ \`(N-2)/N\` = 33% for N=3. Aggressive.
- For N=2: lose 1 → remaining handles all → utilization must be ≤ 50%. (Common reason 3 replicas is the standard minimum, not 2.)

**Practical capacity sizing for SLO targets:**

Target 99.99% availability (52 min/year). Loss of 1 AZ during peak should not breach SLO.

Recipe:
1. Identify peak QPS.
2. Pick replica topology: 3 replicas across 3 AZs (typical).
3. Each replica must handle 1.5× steady-state peak (to absorb a single AZ failure).
4. Each replica is provisioned at 60-67% utilization at steady-state peak (so 1.5× still fits).
5. Failure of the AZ pages the on-call but doesn\'t breach SLO; re-balance happens automatically (autoscaling, traffic shifting).

**For tighter SLO** (99.999%): plan for 2-AZ-loss simultaneously. 3 replicas isn\'t enough; need 5+ across more AZs/regions. Per-replica utilization ≤ 33%. Much more expensive — the cost of an extra 9.

**Hidden trap**: dependencies. Your service has N+1; does your database? Cache? Message broker? The weakest link in the dependency chain is the actual capacity. Surveying every dependency for failure-mode capacity is part of the discipline.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/software-engineering-in-sre/',
      'https://sre.google/workbook/managing-load/',
    ],
  },

  {
    id: 'forecasting-models',
    title: 'Forecasting Models — Linear, Seasonal, ML-based',
    icon: 'lineChart',
    color: '#8b5cf6',
    questions: 3,
    description: 'How to forecast service load: simple growth, seasonal decomposition, Prophet / ARIMA, and when ML is overkill.',
    introduction: `Capacity planning needs forecasts. Forecasting is its own discipline. The good news: most production services don\'t need fancy models — simple ones work.

**The forecast hierarchy (lowest to highest sophistication):**

**1. Linear extrapolation.**
- "Last quarter we grew 20%. Forecast 20% next quarter."
- Works for steady, organic-growth services.
- Fails when growth is sub-linear (saturation), super-linear (viral), or seasonal.

**2. Linear with seasonality.**
- "Last quarter we grew 20%. But also: peak hour is 5× off-peak. Black Friday is 3× a normal day. Forecast: 20% growth applied to the same daily/weekly/yearly seasonality."
- Works for most consumer services.
- Standard in capacity planning sheets.

**3. Exponential smoothing (Holt-Winters).**
- Statistical model: trend + seasonality + level, weighted by recency.
- Available in most spreadsheets and Python (statsmodels).
- Better than naive linear when trends shift.

**4. ARIMA / SARIMA.**
- Auto-Regressive Integrated Moving Average. Statistical time-series modeling.
- Captures correlations, seasonality, trends formally.
- Requires care with stationarity and parameter selection.

**5. Prophet (Facebook).**
- Designed for business forecasting at scale. Handles holidays, multiple seasonalities, trend changes.
- Good middle ground: more sophisticated than linear, less effort than custom ML.
- Industry standard for "I want better than linear without learning ARIMA."

**6. ML models (LSTM, Transformer, custom).**
- Best for complex patterns, many input variables, large datasets.
- Heavyweight: needs training data, infrastructure, validation.
- Almost always overkill for capacity planning. Use for fraud detection, recommendation, demand forecasting in retail — not for "how many servers next month."

**The 80/20 of forecasting for SRE:**
- Linear-with-seasonality covers 80% of capacity-planning needs.
- Prophet covers another 15% (irregular events, complex seasonality).
- ML covers 5% (unusual patterns, business-critical accuracy needed).

**Forecast accuracy metrics:**
- **MAPE (Mean Absolute Percentage Error)**: average of \`|actual - forecast| / actual\`. Standard metric.
- **MAE (Mean Absolute Error)**: average of \`|actual - forecast|\` in absolute units.
- **Forecast bias**: \`mean(forecast - actual)\`. Persistent positive bias = consistently over-forecasting.

For capacity planning: aim for MAPE < 20% on a quarterly horizon. Anything tighter is noise; anything looser is unhelpful.

**Drivers vs naive trends:**

A naive linear model predicts based on past traffic. A **driver-based model** predicts based on **leading indicators**:
- "MAU forecast says 10% growth in users next month → projects to 10% growth in QPS."
- "Marketing has $X campaign spend in Q3 → projects to Y conversion lift → Z QPS lift."

Driver-based forecasts are more accurate when you have good leading indicators. Less accurate when business indicators are themselves uncertain.

**Capacity-specific gotchas:**
- **Forecasting averages misses peaks.** Forecast peak QPS, not average QPS.
- **Compositional changes.** Adding a new feature changes the distribution of work; old QPS forecasts undercount the new feature\'s cost.
- **Failure-mode shifts.** Peak shifted from 8pm to 6am because you onboarded an APAC customer. Region-level forecasts matter.
- **Non-stationarity.** Past patterns may not hold. After a major product change, retrain.`,
    whenToUse: [
      'Quarterly capacity planning — model the next 90 days',
      'Pre-event sizing — Black Friday, marketing campaign',
      'Post-launch capacity tracking — actual vs forecast for new features',
      'Cost forecasting — predict cloud spend',
    ],
    keyConcepts: [
      { term: 'Linear with seasonality', definition: '80% of SRE capacity needs. Daily/weekly/yearly cycles + linear growth trend.' },
      { term: 'Prophet (Facebook)', definition: 'Open-source forecasting for business time series. Handles holidays, multiple seasonalities. Industry standard middle-ground.' },
      { term: 'MAPE', definition: 'Mean Absolute Percentage Error. Standard accuracy metric for forecasts. < 20% is good for quarterly capacity.' },
      { term: 'Driver-based forecast', definition: 'Predict from leading indicators (MAU, marketing spend, business projections), not from past traffic alone.' },
      { term: 'Forecast bias', definition: 'Persistent over- or under-forecasting. mean(forecast - actual) over a window. Should trend to 0.' },
    ],
    keyQuestions: [
      {
        question: 'When should I use Prophet vs simple linear forecasting?',
        answer: `**Use linear-with-seasonality first; reach for Prophet when it falls short.**

Linear-with-seasonality works when:
- Growth is steady (constant rate).
- Seasonality is straightforward (daily peak, weekly cycle, annual holiday).
- No major regime changes.
- You can compute it in a spreadsheet in 10 minutes.

Reach for Prophet when:
- **Multiple, irregular events** (sales, marketing campaigns, product launches) need to be modeled. Prophet handles holiday-style events well.
- **Complex seasonality** (multiple cycles overlapping, e.g., daily + weekly + yearly).
- **Trend changes** (growth rate shifted at a specific date — Prophet has changepoint detection).
- **Forecast accuracy matters** more than analyst time.

Prophet costs:
- Python install + ~30 min to learn.
- Some art in tuning changepoints, holiday calendars, seasonality components.
- Output is a dataframe; you have to integrate into your reporting.

Don\'t reach for Prophet when:
- You don\'t understand your data well enough to tune Prophet. Garbage in, garbage out.
- The forecast quality matters less than the time saved by linear-with-seasonality.
- Pattern is so complex it actually needs ML (rare).

Other middle-ground: **statsmodels Holt-Winters** (exponential smoothing) — older, simpler than Prophet, often comparable accuracy. Good if Prophet feels heavyweight.

ML models: **almost never the right tool for capacity planning**. They\'re overkill for the accuracy gain. Reserve for cases where prediction accuracy is directly revenue-driving (e.g., capacity for an ad-targeting service where over/under-provisioning has measurable cost).`,
      },
      {
        question: 'How do you incorporate marketing campaigns or product launches into a forecast?',
        answer: `**Two paths**: as **events** in a time-series model, or as **scenarios** layered on top.

**Path 1: Events in a model.**
- Prophet supports holidays / events natively. \`holidays = pd.DataFrame({"ds": dates, "holiday": names})\`.
- Each event has a window (campaign runs 5 days; impact lasts 7 days).
- The model learns the shape and magnitude of past similar events; projects forward.
- Works well when you have history of similar events.

**Path 2: Scenarios.**
- Build a base forecast without events.
- Layer on event-specific lift estimates: "Black Friday adds 5× peak for 1 day, and 1.5× residual the following week."
- Sum: total = base_forecast + event_lifts.
- Better when events are novel and you have to estimate from first principles.

**Lift estimation for novel events:**

If you have no prior event data:
- **Pre-launch testing**: load test the affected service at the projected peak. Validate it can handle.
- **Pilot estimation**: small-scale launch to a subset; measure conversion / engagement; project to full population.
- **Industry benchmarks**: marketing teams have rough numbers for campaign lift; talk to them.
- **Expert estimate**: a senior PM\'s gut feel. Used when nothing better is available; bounded by buffer.

The discipline: for any non-trivial event, build a **scenario table**:
- Base forecast (no event).
- Pessimistic (event lift is 50% of estimate).
- Expected (point estimate).
- Optimistic (event lift is 150% of estimate).

Provision for the optimistic scenario. Track actual against forecast post-event; update your model.

**Common event multipliers (anecdotal industry numbers):**
- Black Friday / Cyber Monday: 3-10× normal traffic for 24-48 hours.
- Major product launch: 2-5× initial spike, settles to 1.5-2× over weeks.
- News cycle / viral content: unbounded; can be 100×+. Plan for Slashdot effect on top services.
- Marketing campaign (TV): depends on campaign size, often 1.2-2× for the duration.

For "campaign-driven" services (e.g., e-commerce), capacity planning is mostly event planning. The base load is predictable; the events drive 80% of risk.`,
      },
      {
        question: 'What\'s a good MAPE for capacity-planning forecasts?',
        answer: `**Quarterly horizon: MAPE < 20% is good; < 10% is excellent.** Tighter than that is suspect (probably overfitting).

By forecast horizon:
- **Daily forecast**: MAPE < 5% is achievable for steady services. Daily traffic is highly predictable.
- **Weekly forecast**: MAPE < 10% reasonable.
- **Monthly forecast**: MAPE 10-20% reasonable for normal services.
- **Quarterly forecast**: MAPE 15-30% is the realistic range. Some services are highly seasonal/event-driven; harder to forecast 3 months out.
- **Annual forecast**: MAPE 30-50%+. Mostly useful for budgeting, not provisioning.

What MAPE doesn\'t tell you:
- **Direction matters**. Over-forecasting by 20% means you over-provisioned (waste $$, no outage). Under-forecasting by 20% means outage. Asymmetric cost.
- **Tail matters**. A model with MAPE 10% but huge errors on rare events isn\'t useful for capacity (those events are when you fail).
- **Bias matters**. A model with low MAPE but consistent bias (always over- or under-forecasting) needs adjustment.

The capacity-specific framing: don\'t optimize for MAPE; optimize for **avoided incidents per dollar over-provisioned**. A forecast that\'s 80% accurate but always slightly under-forecasting is dangerous; one that\'s 80% accurate but always over-forecasting is just expensive.

**Track quarterly:**
- Forecast vs actual for the past 4 quarters.
- Over- vs under-forecast distribution.
- Largest miss and root cause (what event did we not anticipate?).

The cultural finding: most teams\' forecasts are **systematically optimistic** about growth and **systematically pessimistic** about peaks. Result: under-provisioned at peak. Counter by forecasting peak QPS, not average QPS, and weighting peak with appropriate buffer.`,
      },
    ],
    references: [
      'https://facebook.github.io/prophet/',
      'https://www.statsmodels.org/stable/tsa.html',
      'https://otexts.com/fpp3/',
    ],
  },

  {
    id: 'load-testing',
    title: 'Load Testing — Methodology, Tools, Production Mirror',
    icon: 'activity',
    color: '#8b5cf6',
    questions: 3,
    description: 'Baseline / ramp / soak / spike / stress test methodology, tools (k6, Locust, JMeter), and production traffic replay.',
    visualizations: [
      {
        title: 'Load testing methodology — types of tests',
        description: 'Baseline establishes normal. Ramp finds the knee. Soak finds leaks. Spike tests autoscaling. Stress finds the failure mode.',
        image: '/diagrams/sre/f3-load-testing.png',
      },
    ],
    introduction: `**Load testing** is how you validate that capacity planning is real, not aspirational. Without load testing, capacity numbers are guesses.

**Five test types, each answering a different question:**

**1. Baseline test.** Normal load for an extended period (15-30 min). Establishes:
- What does p50 / p95 / p99 latency look like under normal conditions?
- What\'s the CPU / memory / network / disk profile?
- What\'s the error rate?
This is the reference. All other tests compare against it.

**2. Ramp / load test.** Gradually increase load from baseline to 5-10× over 30-60 min. Finds:
- The "knee" of the curve where latency starts climbing.
- The capacity ceiling where errors start appearing.
- The bottleneck (CPU? Memory? DB connections? Network?).
The output: "this service starts degrading at 5000 QPS; fails at 7000 QPS." Compare to forecast peak.

**3. Soak test.** Sustained load (above baseline) for hours-to-days. Finds:
- **Memory leaks** that are invisible in 30-min tests.
- **Connection-pool exhaustion** that takes hours.
- **Disk-fill** issues from slow-growing logs or temp files.
- **Cache pollution** that changes performance over time.
- **Long-running goroutine / thread accumulation** in concurrent code.
Often run weekly or pre-major-release. Catches defects unit/integration tests miss.

**4. Spike test.** Sudden jump from baseline to 5-10× in seconds, hold for 5-15 min, drop. Finds:
- Autoscaling reaction time. Did the service degrade during the ramp-up window?
- Cold-start performance. Did new instances handle traffic immediately?
- Connection-pool resize speed. Did the DB connections scale?
- Cache behavior. Did the cold cache cause a downstream surge?

**5. Stress test.** Beyond capacity. 2-5× the projected limit. Finds the **failure mode**:
- Graceful: 5xx errors with sane retry-after, autoscaling continues, no cascading damage.
- Cascading: one failure triggers another; the system enters a death spiral.
The point isn\'t to "pass" the stress test; it\'s to verify the failure mode is graceful.

**Tools:**

**k6 (Grafana Labs)** — modern, JavaScript-based, CLI + cloud. Industry favorite for HTTP/gRPC load testing. Easy CI integration.

**Locust** — Python-based. Distributed via "swarm" workers. Good for dynamic / scripted load. Slower than k6 per-worker but easier for complex test logic.

**JMeter** — Java GUI. Older. Heavyweight. Good for enterprise environments where Java is preferred.

**Gatling** — Scala-based. Very high-performance. Best for hyperscale tests.

**Vegeta** — Go-based, simple HTTP load tester. Fast for basic tests; less programmable than k6.

**Wrk / wrk2** — minimal C-based HTTP tester. Highest performance per worker; least feature-rich.

**Production mirror / shadow traffic.**

The most realistic test: replay real production traffic at the staging service. Tools:
- **AWS Application Mirroring (gray-launch)** for HTTP traffic.
- **Kafka mirror-maker** for event streams.
- **Custom shadow services** that subscribe to prod traffic and route to staging.

Shadow traffic catches issues synthetic load misses:
- **Real header / cookie patterns**.
- **Real key distribution** (hot users, hot products, fat-tail patterns).
- **Real time-of-day variability**.
- **Real edge cases** (malformed requests, deprecated paths).

Cost: significant infrastructure (shadow service must keep up with prod). Reserved for services where load-test fidelity matters most.

**The discipline:**
- **Test regularly**, not just pre-launch. Weekly soak tests; monthly ramp tests; pre-event stress tests.
- **Test in a prod-like environment**. Same instance types, same data sizes, same dependencies. Staging-with-100-rows-of-data is not a load test.
- **Test the failure mode**. Don\'t avoid stress tests. The system WILL hit them in production sooner or later; better to find the failure mode in a controlled setting.
- **Automate**. Load tests in CI for every release; comparing against last release\'s baseline.`,
    whenToUse: [
      'Pre-launch — verify capacity claims',
      'Pre-event — Black Friday, product launch',
      'Post-architecture-change — did the new design hold up?',
      'Quarterly — regression tests; new bottlenecks emerging',
    ],
    keyConcepts: [
      { term: 'Baseline / ramp / soak / spike / stress', definition: 'Five test types. Each finds different bugs. Run all of them periodically.' },
      { term: 'k6', definition: 'Modern JavaScript-based load tester. CLI + cloud. Industry favorite for HTTP/gRPC. Easy CI integration.' },
      { term: 'Knee of the curve', definition: 'Load level where latency starts climbing nonlinearly. Capacity planning aims to keep peak below the knee.' },
      { term: 'Soak test bugs', definition: 'Memory leaks, connection-pool exhaustion, disk-fill, slow accumulation issues. Invisible in 30-min tests.' },
      { term: 'Production traffic replay', definition: 'Replay real prod traffic at staging. Highest-fidelity load test. Catches real-world distribution issues.' },
      { term: 'Stress test goal', definition: 'NOT "pass" — verify failure mode is GRACEFUL. Cascade vs graceful is the distinction.' },
    ],
    keyQuestions: [
      {
        question: 'Walk me through the load test types and what each finds.',
        answer: `Five tests, five different bug categories:

**1. Baseline** (15-30 min at normal load): establishes the reference. p50/p95/p99 latency, CPU/memory profile, error rate. All other tests compare against this.

**2. Ramp** (gradual increase from baseline to 5-10× over 30-60 min): finds the **knee of the curve** — where latency starts climbing nonlinearly. Tells you the capacity ceiling and the bottleneck (CPU? Memory? DB? Network?).

**3. Soak** (sustained above-baseline load for hours/days): finds **slow-accumulation bugs**:
- Memory leaks (0.1% growth/hour invisible at 30-min, lethal at 24h).
- Connection-pool exhaustion (works initially; fails at hour 6).
- Disk-fill (logs, temps, caches).
- Cache pollution (performance drift over time).
- Long-running goroutine/thread accumulation.

**4. Spike** (sudden 5-10× jump for 5-15 min, then drop): finds **transient response bugs**:
- Autoscaling reaction time (did the service degrade during ramp-up?).
- Cold-start latency on newly-launched instances.
- Connection-pool resize.
- Cache cold-start surge.

**5. Stress** (beyond capacity, 2-5× projected limit): finds the **failure mode**:
- Graceful: 5xx with retry-after; autoscaling continues; no cascade.
- Cascading: one failure causes another; death spiral.
The goal is NOT to pass — it\'s to verify graceful failure.

The cadence:
- **Baseline**: every CI run.
- **Ramp**: weekly or monthly.
- **Soak**: weekly or before releases.
- **Spike**: before launches and major events.
- **Stress**: quarterly + before high-risk releases.

The test that\'s most often skipped: **soak tests**. They take hours; engineers find them inconvenient. They also find the bugs that destroy production at hour 8 of a real incident. Run them anyway.`,
      },
      {
        question: 'How do you set up production-realistic load tests?',
        answer: `Three layers of fidelity:

**Layer 1: Synthetic traffic at high volume.**
- k6 / Locust scripts that simulate user paths.
- Configured QPS and concurrency.
- Same endpoints, same payloads as prod.
- Easy to set up; misses real-world distribution.

**Layer 2: Recorded traffic replay.**
- Capture real prod traffic for a window (e.g., 1 hour at peak).
- Replay against staging at variable speed (1×, 2×, 5×).
- Captures real key distribution, real header patterns, real timing.
- Tools: tcpcopy, GoReplay, custom AWS replay solutions.

**Layer 3: Live shadow traffic.**
- In production, every request is also routed to staging.
- Staging serves it but discards the response.
- Real-time, full-fidelity, continuous.
- Catches anything the prior layers miss.
- Cost: staging must scale with prod; complex to set up.

**Production-mirror best practices:**

- **Same data shape**. If prod\'s tables have 100M rows, staging\'s tables must too. Synthetic 100k-row staging doesn\'t exercise the slow-query paths.
- **Same dependency versions**. If prod uses postgres 14.5, staging must too. Behavior changes across versions.
- **Same instance types**. \`m5.large\` and \`c5.large\` have different perf characteristics; don\'t mix.
- **Same network topology**. Cross-AZ latency matters; staging in one AZ misses cross-AZ slow paths.
- **Real feature flag values**. Different flag mixes activate different code paths.

**What you\'ll discover with each layer:**
- Layer 1 (synthetic): basic capacity (QPS ceiling, latency curve).
- Layer 2 (replay): hot-key issues, distribution-dependent latency, cache behavior.
- Layer 3 (shadow): edge cases, deprecated paths, real-time SLI tracking.

Most teams operate at Layer 1 + occasional Layer 2. Layer 3 is high-investment; worth it for high-stakes services (payments, search, content delivery).`,
      },
      {
        question: 'I ran a stress test and the service crashed. Is that a failure?',
        answer: `**Possibly not. It depends on HOW it crashed.**

Stress tests are designed to find the failure mode, not to "pass." The scoring criterion isn\'t "did the service stay up at 5× capacity"; it\'s "when the service hit its limit, did it fail GRACEFULLY?"

**Graceful failure** (acceptable):
- Returns 5xx errors with appropriate retry-after headers.
- Drops new connections cleanly; existing connections finish.
- Autoscaling kicks in (even if too slow to fully save you, the direction is right).
- Logs and alerts fire correctly so the team knows.
- No data corruption.
- Recovery: when load drops, service returns to normal without intervention.

**Cascading failure** (real failure):
- The service\'s symptoms cause downstream services to also fail.
- Retries amplify load (a slow service triggers more retries, increasing load).
- GC death spiral: out-of-memory triggers more GC, which uses more CPU, which slows requests.
- Recovery requires manual intervention (restart, drain, scale-up).
- Data corruption, unflushed writes, transaction abandonment.

**The diagnostic:**
- Plot latency, error rate, downstream latency, downstream error rate during the stress test.
- Graceful: errors localized to your service; downstream unaffected; recovery < 1 min after load drops.
- Cascading: errors propagate; downstream sees increased latency / errors; recovery takes 5+ min.

**If cascading, fix:**
- **Circuit breakers** between this service and downstream (stop calling on consecutive failures).
- **Bulkheads** (fixed thread pool / connection pool — bounded resource consumption).
- **Bounded retries** (no exponential backoff retry storms).
- **Load shedding** (drop low-priority requests when overloaded; reject before service degrades fully).
- **Graceful degradation** (return cached / partial / fallback responses).

The stress test\'s value isn\'t in "passing" — it\'s in **identifying the cascade in a controlled environment** so you can fix it before it happens in production. A stress test that crashes the service AND reveals the failure mode is a successful stress test, IF you act on the findings.`,
      },
    ],
    references: [
      'https://k6.io/docs/test-types/',
      'https://locust.io/',
      'https://goreplay.org/',
    ],
  },

  {
    id: 'autoscaling-strategies',
    title: 'Autoscaling Strategies — HPA, VPA, KEDA, Karpenter, Predictive',
    icon: 'maximize',
    color: '#8b5cf6',
    questions: 3,
    description: 'The Kubernetes autoscaling toolkit, when each fits, and predictive vs reactive scaling.',
    introduction: `**Autoscaling** automates capacity decisions. It\'s never the whole story (you still need capacity planning) but it absorbs predictable variance and rare spikes.

**The Kubernetes autoscaling toolkit:**

**1. HPA (Horizontal Pod Autoscaler)** — scales pod count based on metric.
- Default metrics: CPU, memory.
- **Custom metrics**: any Prometheus-exposed metric (request rate, queue depth, latency).
- **External metrics**: cloud-provider metrics (CloudWatch, Azure Monitor).
- The most common autoscaler.

**2. VPA (Vertical Pod Autoscaler)** — adjusts pod resource requests.
- Watches actual usage; recommends or applies new requests/limits.
- Useful for right-sizing services with unpredictable resource needs.
- Less common than HPA; sometimes restricts autoscaling decisions (can\'t scale pod up while it\'s running without restart in some modes).

**3. KEDA (Kubernetes Event-Driven Autoscaling)** — scales based on external event sources.
- Kafka lag, SQS depth, Pub/Sub messages, RabbitMQ queue, PostgreSQL row count, custom HTTP triggers.
- 60+ built-in scalers.
- Standard for event-driven workloads (worker pools, batch processors).

**4. Karpenter (AWS, now CNCF graduated)** — node-level autoscaler.
- Replaces Cluster Autoscaler for AWS.
- Can spin up specific instance types matched to pending pods\' resource requests.
- Faster than CA (provisions in 30-60s vs 5-10 min).
- Aggressive bin-packing reduces cost.

**5. Cluster Autoscaler (CA)** — older node-level autoscaler.
- Generic across clouds (AWS, GCP, Azure).
- Slower than Karpenter on AWS; comparable on other clouds.

**6. Predictive autoscaling** — uses ML to scale before load arrives.
- AWS Predictive Scaling; GCP Compute predictive autoscaling; custom solutions.
- Best for predictable patterns (daily peak, weekly cycle).
- Combines with reactive scaling for unpredictable spikes.

**Scaling strategies:**

**Reactive scaling**: scale based on current metrics. Standard HPA.
- Pros: responds to any load pattern.
- Cons: lag time. Spike at T0; HPA reacts at T+30s; new pods ready at T+90s. During those 90s, users see degraded performance.

**Predictive scaling**: scale based on forecasted load.
- Pros: capacity in place before load arrives.
- Cons: only works for predictable patterns; bad forecast = wrong capacity.

**Scheduled scaling**: cron-based scale up/down at known times.
- "Scale to 50 pods at 8am Monday-Friday."
- Pros: simple, predictable.
- Cons: doesn\'t adapt to actual load.

**Step scaling**: scale by N pods when threshold crossed; cool down for X minutes.
- Pros: smooth, low-thrash.
- Cons: slow to react to large spikes.

**Target tracking**: scale to maintain a target metric (e.g., 50% CPU).
- Default in HPA, AWS, GCP.
- Pros: stable, simple to reason about.
- Cons: assumes target metric correlates with load.

**Common autoscaling failures:**

- **Slow scale-up vs spike**: spike in 30s, HPA reacts in 90s. Use predictive + faster scrape intervals.
- **Thrashing**: scale up + down repeatedly. Tune cooldowns and hysteresis.
- **Downstream saturation**: scaling app servers when DB is the bottleneck. Worse, not better.
- **Cold start**: new pods take 30-180s to be ready. Plan for ramp-up.
- **Scaling without dependencies**: scaling backend services but not the load balancer / message broker / DB.

**The metric that scales matters:**

- **CPU**: works for CPU-bound work. Default. Often misleading (a service can be 100% CPU on JIT compilation while idle on actual work).
- **Memory**: tricky. Doesn\'t correlate with load for many services.
- **Request rate**: better. Direct measurement of work coming in.
- **Queue depth**: best for async work. KEDA-friendly.
- **p95 latency**: scales when service is degrading, not when it\'s busy. Lagging indicator; better as a guard rail than primary signal.

**The 2026 best practice**: predictive + reactive layered. Predictive handles the daily peak baseline; reactive handles the unpredictable spikes. Both layers active simultaneously.`,
    whenToUse: [
      'Designing autoscaling for a new service — pick metric, set bounds, test',
      'Cost optimization — am I over-provisioned at off-peak?',
      'Pre-event prep — can autoscaling react fast enough?',
      'Postmortem — was scale-up too slow?',
    ],
    keyConcepts: [
      { term: 'HPA', definition: 'Horizontal Pod Autoscaler. Scales pod count based on metric (CPU default; custom metrics common).' },
      { term: 'KEDA', definition: 'Event-driven autoscaler. 60+ built-in scalers (Kafka, SQS, PubSub, etc.). Standard for event-driven workloads.' },
      { term: 'Karpenter', definition: 'Faster, more aggressive node autoscaler for AWS. Provisions in 30-60s vs Cluster Autoscaler\'s 5-10 min.' },
      { term: 'Predictive scaling', definition: 'ML-driven scaling ahead of forecasted load. Best for predictable patterns; combines with reactive.' },
      { term: 'Target tracking', definition: 'Scale to maintain target metric (e.g., 50% CPU). Default for HPA, AWS, GCP.' },
      { term: 'Cooldown / hysteresis', definition: 'Cooldown between scale events; asymmetric thresholds (scale up at 70%, down at 50%). Prevents thrashing.' },
    ],
    keyQuestions: [
      {
        question: 'When do you use HPA, KEDA, and Karpenter together?',
        answer: `These operate at different layers:

**Karpenter** (or Cluster Autoscaler): **node level**. Adds nodes to the cluster when pods can\'t be scheduled.

**HPA**: **pod count for request-driven services**. Scales pods based on CPU / memory / request rate.

**KEDA**: **pod count for event-driven workloads**. Scales pods based on queue depth, message lag, custom external events.

**Together** (typical workflow):

1. Traffic spike causes HPA to detect high CPU on a Deployment.
2. HPA increases replica count from 5 to 15.
3. Kubernetes scheduler tries to place the new pods.
4. Cluster doesn\'t have enough capacity → pods are pending.
5. Karpenter sees pending pods; provisions new nodes (right-sized for the pending pods).
6. New nodes join cluster (30-60 seconds with Karpenter).
7. Pods schedule and start serving traffic.
8. Load eventually drops; HPA scales pods back down; Karpenter consolidates and removes empty nodes.

For event-driven backends: same pattern, but KEDA replaces HPA. KEDA watches Kafka lag; scales worker pods; Karpenter provisions nodes.

**The discipline:**
- HPA / KEDA configured per service.
- Karpenter / CA configured at cluster level (one config drives everything).
- Bounds set carefully: HPA min replicas (for redundancy + warm cache), HPA max (to avoid downstream saturation), Karpenter max nodes (to bound cost).

**Real-world numbers:**
- HPA reaction time: ~30s (default scrape interval) + ~30s (decision) = 60s before scale-up event.
- Karpenter node provisioning: 30-60s.
- Pod startup: 10-180s depending on app.
- **Total time from spike to capacity ready**: 90-300 seconds.

This is why you can\'t rely on autoscaling alone for sudden 10× spikes. Combine with predictive scaling (capacity already in place) or buffer (over-provision the baseline).`,
      },
      {
        question: 'How do you avoid autoscaling thrashing?',
        answer: `Five techniques:

**1. Asymmetric thresholds (hysteresis).**
- Scale UP when metric > 70%.
- Scale DOWN when metric < 50%.
- The gap between thresholds means the metric must move significantly to flip directions; prevents oscillation around a single threshold.

**2. Cooldown periods.**
- After any scale event, wait N minutes before allowing another.
- Common: 3-5 min after scale-up, 5-15 min after scale-down.
- Asymmetric: shorter cooldown after scale-up (you want to react if needed), longer after scale-down (you don\'t want to immediately re-scale-up).

**3. Stabilization windows.**
- Aggregate metric over a window before deciding. Kubernetes HPA has \`behavior.scaleDown.stabilizationWindowSeconds\` and \`scaleUp.stabilizationWindowSeconds\`.
- Default: 0 for scale-up (react fast), 300s for scale-down (don\'t shrink prematurely).
- Tune based on workload variance.

**4. Larger step sizes.**
- If scaling 1 pod at a time causes thrashing, scale 5 at a time. Less granular but smoother.
- HPA \`behavior.scaleUp.policies\` and \`scaleDown.policies\` allow tuning.

**5. Smoother metrics.**
- A high-variance metric (request count per 30s) causes more thrashing than a smooth one (rolling average over 5 min).
- Use percentiles or rolling windows in the autoscaling metric.

**Diagnostic workflow:**
- Plot HPA replica count over time.
- Identify oscillation pattern (e.g., scale up to 15 → down to 8 → up to 15 → down to 8, repeating every 5 min).
- The metric that\'s causing it: usually CPU on a service that has bursty work, or request rate that follows a fast oscillating pattern.
- Apply the techniques above; iterate.

**The cultural mistake**: tuning autoscaling to "react instantly to every change." This produces thrashing. Slightly delayed reaction with smooth scaling is far better than instant reaction with oscillation.`,
      },
      {
        question: 'When does predictive scaling help vs reactive?',
        answer: `**Predictive helps for predictable patterns; reactive handles the unpredictable.**

**Predictive scaling shines when:**
- **Daily traffic patterns are predictable**: peak at 9am every weekday, off-peak overnight.
- **Weekly patterns**: heavy weekdays, light weekends.
- **Seasonal patterns**: Black Friday, Cyber Monday, holiday season.
- **Long ramp-up time**: cold-start of new pods is 60+ seconds; you want capacity in place before load arrives.

**Reactive scaling handles:**
- **Unexpected spikes**: news cycle, viral content, marketing surprise.
- **Within-the-hour variance**: minor fluctuations around the predicted pattern.
- **Backstop**: if predictive forecast is wrong, reactive saves you.

**The combined approach:**
- **Predictive** sets the baseline: at 8am Monday, ensure 50 pods are running.
- **Reactive** layers on top: if metric exceeds 80%, scale up further.

**AWS implementation**: Predictive Scaling is a built-in feature of AWS Auto Scaling Groups. Provide a CloudWatch metric history; AWS\'s ML model forecasts; ASG scales to the forecast.

**Kubernetes implementation**: less standardized. Options:
- **Custom HPA with forecast-based metric**: use Prophet or a simple seasonal model; output predicted load; HPA scales based on it.
- **Scheduled scaling**: \`kubectl scale\` from a CronJob at known times.
- **AWS-on-EKS**: use AWS Predictive Scaling at the ASG layer; HPA at pod layer.
- **Cloud-native**: GKE Predictive Vertical Pod Autoscaling; AKS predictive scaling.

**Cost-benefit:**
- Predictive scaling **costs nothing extra** beyond the compute it provisions; the forecasting is free (cloud-managed).
- The win: capacity ready when load arrives. No 90-second window of degradation during scale-up.
- Risk: forecast is wrong → over- or under-provisioned briefly. Reactive backs you up.

**When NOT to use predictive:**
- Service has no clear pattern (e.g., bursty event-driven workload). Use KEDA.
- Service is rarely active (e.g., batch jobs once a day). Scheduled scaling is simpler.
- Forecast inputs are unreliable (e.g., new service with no history). Wait for 4-8 weeks of data.`,
      },
    ],
    references: [
      'https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/',
      'https://keda.sh/',
      'https://karpenter.sh/',
      'https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-predictive-scaling.html',
    ],
  },

  {
    id: 'cost-vs-reliability',
    title: 'Cost vs Reliability — The Diminishing Returns Curve',
    icon: 'dollarSign',
    color: '#8b5cf6',
    questions: 3,
    description: 'Why each additional 9 costs 10×, FinOps for SRE, and the right cost-of-downtime conversation with finance.',
    introduction: `**Reliability has a cost curve. Each additional 9 of availability roughly costs 10× the engineering investment of the previous.** Understanding the curve is essential to setting SLOs that match business reality.

**The cost-of-9s reality** (from SRE Workbook Ch 4 + industry data):

- **99% (3.65 days/year of downtime)**: basic redundancy, monitoring, response. Cheap. Most startups operate here for non-critical services.
- **99.9% (8h 45min/year)**: serious redundancy (multi-AZ), dedicated SRE function, basic automation. Affordable for any company that takes uptime seriously.
- **99.95% (4h 22min/year)**: tighter dependencies, faster detection, well-practiced response. ~3-5× the cost of 99.9%.
- **99.99% (52 min/year)**: multi-region active/active or warm standby, deep automation, 24/7 NOC, formal incident command. ~10× the cost of 99.9%.
- **99.999% (5 min/year)**: cell-level isolation, formal failover, no SPOFs anywhere, dedicated reliability engineering at scale. ~100× the cost of 99.9%. Reserved for systems where downtime is catastrophic (financial settlement, life-safety, telecom).
- **Beyond five 9s**: bespoke engineering. Specialized hardware, formal verification, redundant control planes. Only worth it for systems like undersea cables, nuclear control, large-scale financial infrastructure.

**The reliability vs cost trade-off conversation:**

The right framing for product / finance:

1. **What\'s the cost of downtime?** $/minute, $/hour. Per the SRE Workbook: revenue × (downtime/total time) for direct revenue; plus indirect cost (customer churn, brand damage, SLA penalties).

2. **What\'s the cost of an additional 9?** 10× the previous engineering investment. Concrete numbers: going from 99.9% to 99.99% might cost $1M/year in additional infrastructure + 2-3 senior SRE FTEs.

3. **What\'s the threshold where it\'s worth it?** When the saved downtime cost exceeds the engineering cost.

Worked example:
- Service revenue: $100M/year. Per-hour revenue: ~$11K.
- 99.9% (8h 45min downtime/year): $96K downtime cost.
- 99.99% (52 min downtime/year): $9.5K downtime cost.
- Savings from 99.9% → 99.99%: $86K/year in saved downtime.
- Engineering cost of the move: ~$1M/year + 2-3 FTEs ($600K).
- **Conclusion: don\'t do it.** Stay at 99.9%; absorb the downtime cost.

For services with much higher revenue:
- $1B/year revenue: per-hour ~$114K.
- 99.9% downtime cost: ~$1M/year.
- 99.99% downtime cost: ~$98K/year.
- Savings: ~$900K/year.
- Engineering cost: same $1M-$1.5M.
- **Marginal call.** Consider the indirect costs (customer trust, SLA penalties).

**FinOps for SRE:**

Beyond reliability cost, the cloud bill itself is an SRE concern. The 2024-2026 FinOps movement names common patterns:

- **Right-sizing**: matching instance types to actual usage. Often 20-40% savings.
- **Reserved capacity / Savings Plans**: 1-3 year commitments for 30-70% discounts on baseline.
- **Spot / preemptible instances**: 60-80% discount for interruptible workloads (batch, dev/test).
- **Storage tiering**: hot vs cool vs archive. Often 10× cost difference between tiers.
- **Network egress**: surprising for new teams. Cross-region, cross-cloud, public-internet egress all priced differently.
- **Idle resources**: forgotten dev clusters, orphan volumes, untagged resources. Auditing finds 5-15% savings.

**The Bezos test**: if cost reduces customer pain, do it. If cost adds capability, only if the value > cost.

**Cost monitoring discipline:**
- Per-service cost attribution (tagging, namespace-based billing).
- Monthly cost reviews per service.
- Anomaly detection on cost (sudden 2× spike usually means runaway autoscaling or runaway logs).
- Cost as a budget; SRE owns it like SLOs.`,
    whenToUse: [
      'Setting SLO targets — pick the SLO that matches business cost-of-downtime',
      'Annual budgeting — plan reliability investments against revenue impact',
      'Cost reviews — am I paying for reliability we don\'t need?',
      'Finance conversations — translate reliability investments to dollar terms',
    ],
    keyConcepts: [
      { term: 'Cost of 9s curve', definition: 'Each additional 9 costs ~10× the previous. From 99.9% to 99.99% is a 10× investment.' },
      { term: 'Cost of downtime', definition: 'Direct revenue lost + indirect costs (churn, brand, SLA penalties). The metric that justifies reliability investment.' },
      { term: 'FinOps', definition: 'Discipline of cloud-cost management. Right-sizing, reserved capacity, spot instances, tiered storage.' },
      { term: 'Bezos test', definition: 'Cost that reduces customer pain: do it. Cost that adds capability: only if value > cost.' },
      { term: 'Reserved capacity', definition: 'Commitment to specific instance types for 1-3 years. 30-70% discount vs on-demand. For predictable baseline.' },
      { term: 'Spot / preemptible instances', definition: '60-80% discount; can be reclaimed at any time. For interruptible workloads (batch, dev/test, ML training).' },
    ],
    keyQuestions: [
      {
        question: 'How do you decide whether to target 99.9% vs 99.99%?',
        answer: `Three-step business case:

**Step 1: Quantify cost of downtime.**
- Direct: revenue × (downtime / total time) for revenue-generating services.
- Indirect: customer churn risk, SLA credits, brand impact, support cost, internal productivity loss.
- Per-hour or per-minute number.

For a $100M/year revenue service: ~$11K/hour direct.
For a $1B/year service: ~$114K/hour direct.
Indirect: typically 1-3× the direct.

**Step 2: Calculate annual downtime cost.**
- 99% = 87.6h/year. At $11K/hour = $964K/year direct.
- 99.9% = 8.76h/year. At $11K/hour = $96K/year direct.
- 99.99% = 0.87h/year. At $11K/hour = $9.6K/year direct.
- 99.999% = 0.087h/year. At $11K/hour = $1K/year direct.

**Step 3: Compare to engineering cost of getting there.**

Rough industry numbers:
- 99% → 99.9%: basic SRE practices. ~1-2 FTEs (~$300K/year).
- 99.9% → 99.99%: multi-AZ, automation, deeper observability. ~$500K-$1M/year (2-3 FTEs + infra).
- 99.99% → 99.999%: multi-region active/active, formal verification, dedicated reliability engineering. ~$5M-$20M/year.

**Decision**:
- $100M revenue, 99.9% → 99.99%: save $86K/year, cost $700K-$1.5M/year. **Don\'t do it.**
- $1B revenue, 99.9% → 99.99%: save $900K/year, cost $700K-$1.5M/year. **Maybe**, depends on indirect costs.
- $10B revenue, 99.9% → 99.99%: save $9M/year, cost $1-$1.5M/year. **Yes.**

**The framing for finance**:
- "We\'re currently at 99.9% with $96K/year of downtime cost. To reach 99.99%, we\'d need $1M/year in additional engineering. The math says stay at 99.9% unless customer/brand impact changes the calculus."

This is the kind of conversation product teams find clarifying — reliability becomes a quantifiable trade-off, not a vague aspiration.`,
      },
      {
        question: 'What\'s the most common cloud-cost mistake SRE teams make?',
        answer: `**Forgetting to retire unused resources.** Surveys consistently find 20-30% of cloud spend is on resources that aren\'t actively used.

Common offenders:
- **Dev / test clusters** that were created and forgotten.
- **Orphan EBS volumes** from terminated instances (default: not deleted with instance).
- **Old AMIs / snapshots** taking up storage.
- **Legacy load balancers** that no service uses.
- **Reserved capacity** for instance types no longer used.
- **Idle databases** (RDS, Aurora) for projects that ended.
- **NAT gateway-hour charges** in VPCs that don\'t need them.

**Diagnostic workflow** (every quarter):
1. Pull cost reports per resource type. Which is the largest line item?
2. For top 5 line items: list resources; check usage in past 30 days; flag idle.
3. Auto-tag policy: every resource must have an "owner" tag. Untagged resources to be deleted after 30-day notice.
4. Periodic audit (monthly or quarterly): review the top spenders; question necessity.

**Other major savings opportunities:**

**Right-sizing**: instance types matched to actual usage.
- Pull last-30-day CPU + memory utilization per instance. If utilization is < 30%, downsize.
- For Kubernetes: VPA recommendations + tighter limits.
- Typically 20-40% savings.

**Reserved capacity / Savings Plans**:
- Predictable baseline → 1-3 year commitment → 30-70% discount.
- Most teams under-commit (leaves savings on the table).
- Compute Savings Plans are most flexible (cover EC2, Lambda, Fargate).

**Spot / preemptible instances**:
- Interruptible workloads (batch, dev/test, ML training) → 60-80% discount.
- Add interruption handling (graceful shutdown, work checkpointing).
- Karpenter on AWS supports spot bin-packing well.

**Storage tiering**:
- S3 Intelligent-Tiering (auto-tier based on access).
- Manual tiering for known patterns: hot in S3 Standard, warm in S3 IA, cold in Glacier.
- 10× cost difference between tiers.

**Network egress**:
- Cross-region, cross-cloud, public internet — all expensive.
- VPC peering, PrivateLink, CloudFront for CDN-able content.
- Often 5-10% of total bill; reducible.

**The $200K Datadog playbook** (from earlier topic): observability cost is its own category; can be 10-30% of total infra cost.

The cultural pattern: most teams don\'t look at the cloud bill until it\'s an emergency. The right discipline: monthly cost reviews; per-service cost attribution; alerts on anomalies.`,
      },
      {
        question: 'How do you set up cloud-cost attribution per team?',
        answer: `Three-layer approach:

**Layer 1: Mandatory tags.**
- Every resource gets tags: \`team\`, \`service\`, \`environment\`, \`cost-center\`.
- Enforced at creation: IaC (Terraform / Crossplane) requires tags; cloud SCPs / Azure Policy / GCP Org Policies reject untagged resources.
- Compliance dashboard showing % of resources tagged.

**Layer 2: Cost reports per tag.**
- AWS Cost Explorer / GCP Billing / Azure Cost Management with tag-based filtering.
- Daily/weekly/monthly reports per team or service.
- Sent to team Slack channels automatically.

**Layer 3: Showback / chargeback.**
- **Showback**: visibility only. Teams see their cost; don\'t directly pay it.
- **Chargeback**: actual budget allocation. Team\'s cost charged to their P&L.
- Showback is easier to start; chargeback creates stronger incentives but requires more org buy-in.

**Tools:**

- **Native cloud tools**: AWS Cost Explorer, GCP Billing Reports, Azure Cost Management. Free, native to each cloud.
- **CloudHealth / Apptio Cloudability / Flexera**: enterprise FinOps. Multi-cloud, more sophisticated reporting, anomaly detection.
- **Kubecost**: Kubernetes-specific. Per-namespace, per-pod cost attribution. Good for multi-tenant clusters.
- **OpenCost**: open-source alternative to Kubecost.

**Common challenges:**

- **Shared resources**: load balancers, NAT gateways, DNS — used by everyone. Allocation: usage-based (proportional to traffic) or flat-share.
- **Untagged resources**: legacy infrastructure that pre-dates the tagging policy. Migration path: audit, tag, repeat. Often the longest-tail item.
- **Inferred ownership**: when tagging is incomplete, infer ownership from naming conventions, IAM roles, deploy history. Tools like Cloud Custodian + Spacelift can automate this.

**The win:**
- Each team sees their cost in real time.
- Anomalies (sudden spike) page the responsible team.
- Cost optimization becomes a team-level KPI, not an SRE problem.

**Cultural shift**: from "cloud cost is finance\'s problem" to "cloud cost is part of every team\'s P&L." Takes 6-18 months of ongoing tagging discipline + reporting + leadership endorsement.`,
      },
    ],
    references: [
      'https://www.finops.org/',
      'https://sre.google/workbook/managing-load/',
      'https://aws.amazon.com/aws-cost-management/',
      'https://kubecost.com/',
    ],
  },

  {
    id: 'database-capacity',
    title: 'Database Capacity — Connections, Replication, Sharding',
    icon: 'database',
    color: '#8b5cf6',
    questions: 3,
    description: 'The connection-pool ceiling, read replicas, write throughput, and sharding strategies.',
    introduction: `Databases are usually the **first thing to break under load** and the **hardest thing to scale**. Database capacity planning is its own subspecialty.

**The connection-pool ceiling.**

Most databases have a hard limit on concurrent connections:
- **PostgreSQL** default: 100. Production typically 200-500.
- **MySQL** default: 151. Production typically 500-2000.
- **Aurora**: scales somewhat with instance size; up to ~5000.
- Each connection costs memory (5-15 MB for Postgres backend processes).

Application-side:
- Each app instance has a connection pool (5-50 connections per instance is typical).
- 100 app instances × 20 connections each = 2000 connections to the DB.

If your DB max is 500 and your apps want 2000, you have a problem. The fix:
1. **Connection pooler in front of DB**: PgBouncer for Postgres, ProxySQL for MySQL, RDS Proxy. Pools many app connections into few DB connections.
2. **Stricter app-side pooling**: smaller pools, more sharing.
3. **DB scaling**: bigger instance class (more RAM, more allowed connections).

**Replication for read scaling.**

Most read-heavy workloads scale by adding **read replicas**:
- Writes go to primary; replication propagates to replicas.
- Reads can go to any replica → read capacity scales horizontally.
- Replication lag: typically sub-second async, can spike under load.

Trade-offs:
- **Stale reads**: replicas may be behind primary by ms-to-seconds. Use cases tolerant of sub-second staleness work; "read your own write" requires routing back to primary or to a session-aware replica.
- **Write amplification**: more replicas = more replication bandwidth.
- **Failover complexity**: when primary fails, one replica gets promoted. Manage carefully (don\'t write to two primaries simultaneously).

**Write capacity is the harder problem.**

Adding replicas helps reads, not writes. To scale writes:

**1. Vertical scaling**: bigger primary instance. Easy but capped (you eventually buy the biggest available; often $20K+/month at the top).

**2. Sharding**: partition data across multiple primaries. Each shard is independent.
- **Hash-based sharding**: partition by hash(key). Even distribution, but range queries cross shards.
- **Range-based sharding**: partition by key ranges. Good for time-series; "hot shard" risk if recent data is the hot data.
- **Directory-based sharding**: explicit mapping of key → shard. Flexible; routing layer overhead.

**3. CQRS (Command Query Responsibility Segregation)**: separate write store and read store. Writes go to one DB optimized for writes; async pipeline projects to read store(s) optimized for queries. High flexibility; complex.

**4. Distributed databases**: Spanner, Cockroach, YugabyteDB, Aurora. Built-in sharding + replication. Higher cost; eliminate ops complexity.

**Sharding gotchas:**

- **Cross-shard transactions**: hard. Often need 2PC or a saga pattern.
- **Joins across shards**: also hard. Either denormalize, replicate dimension tables, or accept N+1 queries.
- **Re-sharding**: painful. Plan for double-write + backfill + cut-over (months-long).
- **Hot shards**: power-law distributions create skew. Consistent hashing + virtual nodes help.

**The capacity-planning cycle for databases:**

1. **Forecast write rate, read rate, query latency targets.**
2. **Match to instance class, replica count, sharding strategy.**
3. **Test under load** (load testing with realistic key distribution).
4. **Plan failover scenarios** (single primary fail, AZ fail, region fail).
5. **Reconcile actual vs forecast** (DB metrics: CPU, IOPS, connections, latency).

**Modern alternatives:**

- **Managed databases** (RDS, Aurora, Cloud SQL, Cloud Spanner, Cosmos DB): operational overhead reduced; capacity scaling more automatic.
- **Serverless databases** (Aurora Serverless, Cloud SQL Auto-scaling, Cosmos DB): scale automatically based on load.
- **Distributed SQL** (CockroachDB, Spanner, YugabyteDB): horizontal scaling with SQL semantics.

The lesson: most teams scale apps horizontally easily but hit DB limits painfully. Plan DB capacity first; let app capacity follow.`,
    whenToUse: [
      'Pre-launch — DB capacity planning for new service',
      'High-traffic events — does the DB hold up at peak forecast?',
      'Scaling pain — when current architecture hits its DB ceiling',
      'Cost optimization — am I right-sized? Reserved DB capacity?',
    ],
    keyConcepts: [
      { term: 'Connection pool ceiling', definition: 'Hard cap on concurrent DB connections. Use a connection pooler (PgBouncer, ProxySQL, RDS Proxy) when app pools exceed it.' },
      { term: 'Read replicas', definition: 'Async copies of primary. Scale reads horizontally; writes still go to primary. Sub-second replication lag typical.' },
      { term: 'Sharding', definition: 'Partition data across primaries. Hash, range, or directory based. Re-sharding is expensive; plan carefully.' },
      { term: 'CQRS', definition: 'Separate write store and read store. Writes optimized for ingestion; reads optimized for queries. High flexibility, complex.' },
      { term: 'Distributed SQL', definition: 'Spanner, Cockroach, YugabyteDB. Built-in sharding + replication with SQL semantics. Higher cost; less ops.' },
      { term: 'Hot shard', definition: 'Power-law distributions create skew. One shard at 95% load while others at 30%. Consistent hashing + virtual nodes mitigate.' },
    ],
    keyQuestions: [
      {
        question: 'My Postgres is hitting connection limits. What do I do?',
        answer: `Three options, in order of preference:

**1. Add a connection pooler (preferred).**
- **PgBouncer** for Postgres; **ProxySQL** for MySQL; **RDS Proxy** (managed) for AWS.
- Sits between apps and DB. Pools many app-side connections into a few DB-side connections.
- Modes:
  - **Session pooling**: client gets a dedicated DB connection for its session (similar to direct connection).
  - **Transaction pooling**: client gets a DB connection only for the duration of a transaction. After commit, connection returned to pool. Allows many more app connections per DB connection.
  - **Statement pooling**: even tighter; rarely used (breaks many ORMs).

Transaction pooling typically gets you 10× the effective connection capacity. 1000 app connections → ~50 active DB connections (because most clients are idle most of the time).

**2. Tune app-side connection pools.**
- Smaller pool per instance (e.g., 5 instead of 20).
- Aggressive idle timeout (close connections sooner).
- Auto-scaling-aware pool sizing (scale pool to active instance count).

**3. Bigger DB instance.**
- More RAM allows more connections (each Postgres backend is ~5-15 MB).
- Doubling RAM might double allowed connections.
- Cost scales linearly; eventually you hit max instance size.

**4. Architectural fixes (longer term):**
- **Separate read and write workloads**: writes to primary (small connection pool), reads to replica (separate pool).
- **Stateless connection model**: serverless platforms (Aurora Serverless v2) auto-scale connections.

**Common mistake**: ignoring idle connections. Apps that hold connections during long-running operations (slow query, file upload, external API call) waste DB connections. Move expensive operations off the DB connection or use shorter transaction boundaries.

**Concrete example**: a service with 100 app instances × 20-connection pool = 2000 connections wanted. With PgBouncer in transaction mode + average txn duration of 10ms, ~200 active DB connections suffice. Postgres at 500-connection limit comfortably handles this with overhead.`,
      },
      {
        question: 'When do you shard a database vs scale up?',
        answer: `**Scale up first; shard when you must.**

The order of operations:

1. **Vertical scale**: bigger instance. Easy, low-risk. Effective up to the largest available instance class. Often gets you to single-digit-millions of QPS.

2. **Read replicas**: async copies for read traffic. Scales reads. Writes still on primary.

3. **Vertical scale of replicas + writes still on primary**: gets you further.

4. **Eventually**: writes hit the primary\'s ceiling. Now you shard.

The signs that you must shard:
- **Write QPS exceeds primary capacity** even at biggest instance class.
- **Single-table size** approaches DB limits (terabytes for Postgres; billions of rows).
- **Index sizes** exceed available memory; query plans become slow due to disk reads.
- **Row contention** (lock waits) becomes the latency bottleneck.

**Sharding strategies:**

**Hash-based**:
- \`shard_id = hash(user_id) % num_shards\`.
- Even distribution.
- Range queries cross shards (slow).
- Re-sharding is painful (every key moves).

**Range-based**:
- \`shard_id = lookup_in_range_table(user_id)\`.
- Good for time-series (recent data on hot shard, older data on cold shards).
- Hot-shard risk if recent data is the high-traffic data.
- Re-sharding is easier (split the busy range).

**Directory-based**:
- Explicit mapping in a separate routing layer.
- Most flexible; routing layer becomes critical infrastructure.
- Used by very large systems (Vitess, Citus).

**The sharding gotchas (worth saying explicitly in interviews):**

- **Cross-shard transactions**: 2PC, sagas, or eventual consistency. None easy.
- **Joins across shards**: denormalize, broadcast joins, or N+1 queries.
- **Re-sharding**: months of double-write, backfill, cut-over per shard split.
- **Operational complexity**: each shard is its own primary (and its own backups, monitoring, replication, failover).

**The escape hatch: distributed SQL.**

Tools like CockroachDB, Spanner, YugabyteDB do sharding for you while preserving SQL semantics. You write SQL; the database handles partitioning, replication, transactions across shards. Higher infrastructure cost but eliminates 90% of the sharding complexity.

If your team isn\'t Vitess-experienced and your scale is plausibly served by Spanner, Spanner is usually the right answer.`,
      },
      {
        question: 'How do you plan for database failover during peak load?',
        answer: `Three layers of preparation:

**Layer 1: Failover mechanism.**
- Managed database services do automatic failover (RDS Multi-AZ, Aurora, Cloud SQL HA): primary fails → standby promoted in 30-90 seconds.
- Self-managed: requires explicit setup (Postgres + Patroni, MySQL + Orchestrator, MongoDB ReplicaSet).
- DNS / endpoint update: app reconnects to new primary.

**Layer 2: Capacity at the new primary.**
- The standby/replica that gets promoted must be **the same instance class as the primary**, or the failover is "successful" but undersized.
- Standard pattern: standby is sized identically; promoted; resumes serving at full capacity.
- If standbys are smaller (cost optimization), failover might succeed but with reduced capacity → degraded service.

**Layer 3: Application resilience.**
- **Connection-retry logic**: when DB connection breaks, retry with backoff.
- **Idempotent writes**: if a write happens twice (during retry), no corruption.
- **Read-fallback**: if primary is unavailable, can the app serve cached or replica reads?
- **Graceful degradation**: some features go offline gracefully (e.g., write features) while others continue (read features).

**The failover-during-peak scenario:**
- Primary fails at 8pm (peak hour).
- Standby promoted in 60 seconds.
- During those 60 seconds, all writes fail (or are queued, depending on the architecture).
- Apps need to retry; users see "try again" errors briefly.
- New primary picks up; replication lag may make some recent writes unavailable for a minute.

The validations:
- **Test failover in staging at peak load**. Don\'t discover the problem in production.
- **Game-day**: scheduled failover test in production during off-peak (read-only or write-buffer mode).
- **Monitor failover time** as an SLI. If your stated RTO is 60s, your failovers should consistently complete in 30-45s; alert if any exceed 90s.

**Common mistakes:**
- **Standby in same AZ as primary**: AZ failure takes both out. Standby must be in different AZ.
- **Asymmetric instance classes**: cost-optimized standby; failover succeeds but capacity halves.
- **No connection retry in apps**: failover happens; apps stuck with broken connections; humans must manually restart.
- **Replication lag at moment of failure**: standby is missing 10 seconds of writes when promoted. Document this RPO.

The discipline: failover should be a **practiced, automated, tested procedure**, not a once-a-year emergency. Test quarterly.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/managing-critical-state/',
      'https://www.pgbouncer.org/',
      'https://www.cockroachlabs.com/docs/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // G. Reliability Patterns
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'circuit-breakers',
    title: 'Circuit Breakers — Hystrix, resilience4j, Service Mesh',
    icon: 'zap',
    color: '#ec4899',
    questions: 3,
    description: 'The three-state machine, why fail-fast beats hanging, and how circuit breakers prevent cascading failures.',
    visualizations: [
      {
        title: 'Circuit breaker — three-state machine',
        description: 'CLOSED (normal) → OPEN (failing, fast-fail) → HALF-OPEN (probing) → CLOSED. Failure rate threshold trips to OPEN; timeout transitions to HALF-OPEN; probe results determine next state.',
        image: '/diagrams/sre/g1-circuit-breaker.png',
      },
    ],
    introduction: `**Circuit breaker** is a software pattern from Michael Nygard\'s *Release It!* (2007) that became canonical via Netflix Hystrix and now ships in service meshes (Istio, Linkerd) by default.

The principle: **when a downstream dependency is failing, stop calling it for a while.** Counterintuitive but powerful — the failing dependency gets a chance to recover, and your service stops wasting threads/CPU on doomed calls.

**The three-state machine:**

**CLOSED** (normal operation):
- Requests pass through to the dependency.
- Track failure rate (errors + timeouts).
- If failure rate exceeds threshold (e.g., 50% over a 1-minute window), trip to OPEN.

**OPEN** (failing):
- Requests **fail fast** — return an error or fallback immediately, don\'t call the dependency.
- After a timeout (e.g., 30 seconds), transition to HALF-OPEN.

**HALF-OPEN** (probing):
- Allow a small number of requests through to test the dependency.
- If they succeed, transition back to CLOSED (resume normal).
- If they fail, transition back to OPEN (continue avoiding).

**Why fail-fast beats hanging:**

Without circuit breaker, a failing dependency hangs your service:
- Request waits for the timeout (often 5-30 seconds).
- Threads / connections remain allocated to that hung request.
- Under load, your service exhausts threads / connections within minutes.
- Now your service is unavailable too — **cascading failure.**

With circuit breaker, a failing dependency trips the breaker quickly:
- Failure rate exceeds 50% → OPEN.
- Subsequent requests fast-fail (< 1ms).
- Threads / connections aren\'t consumed waiting.
- Your service stays healthy; users see a degraded response (cached / fallback) instead of a hung response.

**Implementations:**

**Netflix Hystrix** (Java) — the original. Now in maintenance mode (Netflix\'s recommendation: use resilience4j).

**resilience4j** (Java) — modern replacement for Hystrix. Lighter, functional, integrates with Spring and Reactor.

**Polly** (.NET) — equivalent for .NET ecosystem.

**Service mesh circuit breakers** (Istio, Linkerd) — implemented at the proxy layer; no application code changes required.
- Istio: \`outlierDetection\` setting on DestinationRule. Configure failure threshold, ejection time.
- Linkerd: similar via "service profile" config.
- Pros: no code change; per-service configuration; observable.
- Cons: less granular than per-call breakers in code; only HTTP/gRPC, not in-process calls.

**Configuration parameters:**

- **Failure threshold**: % of requests that must fail to trip. Common: 50% over a 1-min window.
- **Trip threshold**: minimum number of requests before tripping (avoid tripping on 1 of 1 failing). Common: 20+ requests.
- **Open timeout**: how long to stay OPEN before HALF-OPEN. Common: 30-60 seconds.
- **Half-open requests**: how many probes during HALF-OPEN. Common: 1-5.

**Common mistakes:**

- **No fallback when OPEN**: returning a 5xx is better than hanging, but a useful fallback (cached response, default value, partial result) is better.
- **Per-instance breaker, not per-dependency**: each instance has its own breaker; if dependency is failing, all instances eventually trip. That\'s usually fine.
- **Tripping too aggressively**: thresholds too low → breaker oscillates. Thresholds too high → cascading failure isn\'t prevented.
- **No observability**: instrument breaker state changes as metrics; alert on OPEN/HALF-OPEN transitions.

**The pattern in practice:**

Circuit breakers should wrap every external call: database, cache, downstream HTTP/gRPC service, queue, third-party API. Best when paired with:
- **Timeouts** (the call must time out before the breaker can detect failure).
- **Bounded retries** (don\'t retry-storm a failing dependency).
- **Fallbacks** (graceful degradation when breaker is OPEN).
- **Bulkheads** (isolate resources per dependency).`,
    whenToUse: [
      'Every external dependency call — DB, cache, HTTP/gRPC service, third-party API',
      'Service mesh deployments — enable per-service circuit breaker policies',
      'Reviewing a postmortem with cascading failure — was a circuit breaker missing?',
      'Designing a new microservice — circuit breakers around every external call by default',
    ],
    keyConcepts: [
      { term: 'Three-state machine', definition: 'CLOSED (normal) → OPEN (failing fast-fail) → HALF-OPEN (probing) → CLOSED. Standard since Hystrix.' },
      { term: 'Fail-fast', definition: 'When OPEN, return error/fallback in <1ms instead of hanging on timeout. Saves threads, prevents cascading failure.' },
      { term: 'resilience4j', definition: 'Modern Java circuit-breaker library; replacement for Hystrix (which is in maintenance mode).' },
      { term: 'Istio outlierDetection', definition: 'Service-mesh-level circuit breaker. No app code changes; configured per DestinationRule.' },
      { term: 'Failure threshold + min requests', definition: 'Trip on 50% failure over 1m, min 20 requests. Both required to avoid false-positive trips.' },
      { term: 'Fallback', definition: 'What to return when breaker is OPEN. Cached response, default value, partial result. Better than 5xx.' },
    ],
    pitfalls: [
      'No timeouts on the underlying call — circuit breaker can\'t detect "slow" without timeout.',
      'Tripping too easily — thresholds set so low that transient blips trip the breaker repeatedly.',
      'Tripping too late — thresholds so high that cascading failure has already happened.',
      'No fallback on OPEN — returning 5xx is barely better than hanging.',
      'No observability — breaker state changes invisible; debugging cascading failure is hard.',
    ],
    keyQuestions: [
      {
        question: 'Walk me through the circuit breaker state machine.',
        answer: `Three states with explicit transitions:

**CLOSED** (normal):
- All requests go through to the dependency.
- The breaker tracks the recent failure rate (errors + timeouts) over a sliding window.
- If failure rate exceeds threshold (typically 50%) AND a minimum number of requests have been observed (typically 20), trip to **OPEN**.

**OPEN** (dependency is broken):
- Requests fail fast — return an error or fallback immediately.
- After a configured timeout (typically 30-60s), transition to **HALF-OPEN**.

**HALF-OPEN** (probing):
- A small number of requests (e.g., 1-5) are allowed through.
- If they succeed: dependency has recovered → back to **CLOSED**.
- If they fail: dependency still broken → back to **OPEN** (timer resets).

The key insight: **OPEN protects you AND protects the dependency**. By stopping requests, you give the dependency a chance to recover from its overload / GC / restart. Hammering a sick dependency makes it sicker.

Configuration parameters:
- **Failure threshold** (50%): tunable. Lower = more sensitive; higher = more tolerant.
- **Min request volume** (20): prevents tripping on 1-of-1.
- **Open timeout** (30s): how long to wait before probing.
- **Half-open requests** (3): how many probes.
- **Sliding window**: time-based (e.g., last 60 seconds) or count-based (e.g., last 100 requests).

**Worked example:**
- Service A calls service B, normally 1000 req/sec, 0.1% error rate.
- Service B starts failing: 70% error rate.
- Within 1-2 seconds, A\'s breaker for B detects 50% failure → trips to OPEN.
- A\'s requests to B fast-fail; A serves cached / fallback for users.
- 30 seconds later: A enters HALF-OPEN. Sends 3 probes to B.
- If B is recovered: probes succeed, breaker → CLOSED. Resume normal.
- If B still failing: probes fail, breaker → OPEN. Wait another 30s.

This pattern keeps A healthy through B\'s outage. Without the breaker, A\'s threads pile up waiting for B; A becomes unavailable too.`,
      },
      {
        question: 'How does Istio\'s circuit breaker compare to Hystrix?',
        answer: `Two completely different layers, both valid.

**Hystrix / resilience4j (in-process)**:
- Implemented in application code as a library.
- Per-call granularity: different breakers for different calls (DB vs cache vs API).
- Custom fallback logic (return cached value, return default, partial result).
- Works for in-process calls (e.g., to a thread pool) AND network calls.
- Cons: every service must adopt the library; language-specific.

**Istio outlierDetection (service mesh)**:
- Implemented at the Envoy proxy sidecar.
- No application code changes — config-only.
- Per-destination granularity (you set a policy per upstream service).
- Detects unhealthy instances and ejects them from the load balancer pool.
- Cons: only HTTP/gRPC; no fallback logic (proxy can only return errors, not custom responses); coarser than in-process.

**Decision:**
- **Service mesh-heavy team**: use Istio for the basic pattern; supplement with in-process for critical paths needing custom fallback.
- **Mixed-language fleet**: Istio is more practical (single config vs per-language libraries).
- **Critical paths needing fallback**: in-process (resilience4j etc.) for the rich fallback logic.

**Hybrid common pattern:**
- Istio handles the basic detection and ejection of bad instances (per-destination).
- Application-level libraries handle the rich fallback logic (return cached data, return default, etc.).

Both layers can coexist; they\'re not redundant.

**Istio config example:**
\`\`\`yaml
trafficPolicy:
  outlierDetection:
    consecutive5xxErrors: 5
    interval: 30s
    baseEjectionTime: 60s
    maxEjectionPercent: 50
\`\`\`
After 5 consecutive 5xx, eject the unhealthy instance for 60s; up to 50% of pool can be ejected.

**resilience4j config example** (Java):
\`\`\`java
CircuitBreakerConfig.custom()
  .failureRateThreshold(50)
  .slidingWindowSize(20)
  .waitDurationInOpenState(Duration.ofSeconds(30))
  .build();
\`\`\`

Both target the same outcome via different mechanisms.`,
      },
      {
        question: 'When does a circuit breaker hurt instead of help?',
        answer: `Three scenarios:

**1. Configured too aggressively.**
- Failure threshold 10% → breaker trips on transient blips.
- Constant oscillation between CLOSED and OPEN; users see intermittent errors.
- Worse than no breaker because of the ping-pong UX.

Fix: set threshold based on dependency\'s normal error rate + buffer. If dependency is normally 0.1% errors, breaker tripping at 5% is fine; tripping at 1% is too aggressive.

**2. No fallback for OPEN state.**
- Breaker trips → all requests return 5xx.
- User sees full outage even though dependency is "just" slow.
- A useful fallback (cached value, partial result, default) would mask the dependency outage from users.

Fix: every breaker has a fallback path. Even "return last-known-good cached value with stale=true header" is better than 5xx.

**3. Inadequate timeout on the underlying call.**
- Dependency is slow but not failing (responses take 30s).
- Without timeout: requests hang, threads exhaust, your service degrades.
- The breaker waits for "failure" — but slow != failure unless there\'s a timeout.
- Even with breaker, you cascade.

Fix: every external call MUST have a timeout (1-5 seconds typical). The breaker layer detects timeout = failure. Together they prevent cascading failure.

**4. Per-instance vs per-dependency confusion.**
- Each app instance has its own breaker for the same dependency.
- If dependency is sick: instance A\'s breaker trips, instance B\'s breaker trips, etc. Each on its own schedule.
- The aggregate effect is fine (all instances eventually fast-fail).
- But: half-open probes from many instances simultaneously hit the dependency at once → re-overload.

Fix: stagger the open timeout (e.g., 30s ± 20% jitter) so instances probe at different times.

**5. False sense of security.**
- "We have circuit breakers, so cascading failure can\'t happen."
- Reality: breakers prevent ONE class of cascade. Other classes (memory pressure, GC, retry storms, slow shared resource) still happen.
- Circuit breakers + retries + backoff + timeouts + bulkheads + load shedding all work together. Skipping any leaves a cascade vector.

The pragmatic truth: circuit breakers are necessary but not sufficient. Layer the patterns.`,
      },
    ],
    references: [
      'https://martinfowler.com/bliki/CircuitBreaker.html',
      'https://resilience4j.readme.io/',
      'https://istio.io/latest/docs/concepts/traffic-management/#circuit-breakers',
    ],
  },

  {
    id: 'cascading-failure',
    title: 'Cascading Failure — How Systems Die in Production',
    icon: 'alertOctagon',
    color: '#ec4899',
    questions: 3,
    description: 'The four canonical cascading-failure patterns from the SRE Book and how to prevent each.',
    visualizations: [
      {
        title: 'Cascading failure — anatomy',
        description: 'Slow dependency causes thread pool exhaustion in calling service; users retry, doubling load; GC death spiral amplifies. Each step makes the previous worse.',
        image: '/diagrams/sre/g2-cascade.png',
      },
    ],
    introduction: `**Cascading failure** is the SRE Book Ch 22\'s deepest material. The pattern: one component fails or slows; it triggers a series of compounding effects that bring down the whole system. Every SRE has seen it; many architectures don\'t survive their first one.

**The four canonical cascading failure patterns** (SRE Book Ch 22):

**1. Server overload**
- Capacity insufficient for load.
- Latency increases; threads/connections exhaust.
- Health checks fail; load balancer removes nodes.
- Remaining nodes get more load; their latency increases; they drop out.
- **Death spiral.**

**2. Resource exhaustion**
- One resource (memory, CPU, file descriptors, connections) becomes constrained.
- Subsidiary effects: GC pressure, thread starvation, connection-pool exhaustion.
- Each subsidiary effect amplifies the original problem.
- Without intervention, the system collapses.

**3. Service unavailability**
- A dependency goes down; calling service hangs (no timeout / no breaker).
- Calling service\'s threads exhaust waiting on the dead dependency.
- Calling service becomes unavailable too.
- **Propagation up the stack.**

**4. Retry amplification**
- A request fails; client retries.
- Retry succeeds → fine.
- Retry fails → client retries again (exponential backoff hopefully).
- Multiplied by every retrying client: a "small" failure becomes a load multiplier.
- **2-5× the load on a system that\'s already failing.**

**Prevention pattern stack** (each layer prevents specific failure modes):

- **Circuit breakers** (G1): prevent service-unavailability propagation.
- **Bulkheads** (G7): prevent one bad dependency from exhausting all your threads.
- **Timeouts** (G8): prevent hung calls from accumulating.
- **Bounded retries with jitter** (G4): prevent retry amplification.
- **Load shedding** (G5): drop low-priority requests before the system collapses.
- **Graceful degradation** (G3): serve degraded results instead of failing.
- **Capacity planning + autoscaling** (F): provision for failure-mode peak.

**The GC death spiral** (SRE Book Ch 22 quoted at length):

In Java systems, insufficient CPU triggers more GC, which uses more CPU, which leaves less for actual work. Requests queue. The queue grows. More memory pressure → more GC → less CPU → more queue. Eventually OOM or full saturation.

Recovery: usually requires a restart (the GC spiral is too far in to recover from). Prevention: heap headroom + GC tuning + bounded queue depths.

**The retry storm** (verbatim from SRE Book Ch 22):

Quote: *"Retries can amplify load, particularly during cascading failures."* When a service is degraded, automatic retries from clients double or triple the load — exactly when the service can least handle it.

The fix:
- **Bounded retries** (max 2-3 attempts).
- **Exponential backoff** (each retry waits longer).
- **Jitter** (random component prevents synchronized retries).
- **Idempotent requests** (retries are safe).

**The thundering herd**:

Pattern: 10,000 clients all retry at exactly the same time after a brief outage.
- The "brief outage" might have been 5 seconds; the retry storm at second 6 takes another minute to subside.
- Without jitter, retries are synchronized; with jitter, they spread out.

The classic mitigation: **jittered exponential backoff**. \`wait = base * 2^attempt * (0.5 + random())\`. AWS\'s "Full Jitter" formula: \`wait = random(0, base * 2^attempt)\`.

**The "metastable failure" framing** (modern):

A 2021 paper by Bronson et al. introduced "metastable failures" — systems that have two stable states: healthy (low load, low latency) and degraded (high load, high latency, retries amplifying). A small perturbation moves them from healthy to degraded; they don\'t recover without intervention. This is cascading failure formalized.`,
    whenToUse: [
      'Postmortem analysis — was a cascading failure pattern present? Which one?',
      'Architecture review — does the design have all the prevention layers?',
      'Pre-launch — load test specifically for cascading-failure scenarios',
      'Incident response — when responding to a cascade, identify which pattern is active',
    ],
    keyConcepts: [
      { term: 'Server overload spiral', definition: 'Capacity insufficient → latency up → nodes drop out → remaining nodes overloaded → more drop out → collapse.' },
      { term: 'Resource exhaustion', definition: 'One resource (memory, threads, connections) constrained; subsidiary effects amplify.' },
      { term: 'Service unavailability propagation', definition: 'Dependency dies; caller\'s threads exhaust waiting; caller dies; propagates up the stack.' },
      { term: 'Retry amplification', definition: 'Client retries multiply load on a failing service. Without jitter and backoff, 2-5× load multiplier.' },
      { term: 'GC death spiral', definition: 'Insufficient CPU → more GC → more CPU consumed → less for work → more queue → more memory pressure → more GC.' },
      { term: 'Metastable failure', definition: 'System has two stable states; small perturbation moves it from healthy to degraded; doesn\'t auto-recover.' },
    ],
    keyQuestions: [
      {
        question: 'Walk me through a real cascading-failure scenario.',
        answer: `Worked example, common in microservice architectures:

**T+0**: Dependency service B is normally 50ms p99. Something happens — bad deploy, slow query, GC pause — and B\'s p99 jumps to 5 seconds.

**T+30s**: Service A calls B with a 30-second timeout. A\'s requests pile up waiting on B. A\'s thread pool fills.

**T+60s**: A\'s thread pool exhausted. A starts rejecting incoming requests. A\'s users see 503.

**T+90s**: A\'s users retry (browser auto-retry, JS retry, mobile app retry). The retries arrive at A; A still can\'t serve them; rejected.

**T+120s**: The retry rate at A doubles the original load. Even if A had spare capacity, it can\'t process them.

**T+150s**: A\'s health checks fail (maybe because the health-check endpoint also calls B). Load balancer removes A instances. The remaining instances get more load.

**T+180s**: A is fully unavailable. Users on A\'s downstream see no response. Their retries hammer A.

**T+240s**: B is no longer the problem; B is sick but recoverable. A is fully cascaded; needs full restart.

**Why it happens this way:**
- No timeout (or timeout too long): A\'s threads hang on B for 5+ seconds.
- No circuit breaker: A keeps calling B even though B is failing.
- No bounded retries: clients retry endlessly.
- No load shedding: A accepts requests it can\'t serve.
- No bulkhead: B\'s problem exhausts A\'s entire thread pool, not just B-related threads.

**Each prevention layer:**
- **Timeout** (1s instead of 30s): A\'s threads free up faster.
- **Circuit breaker**: A stops calling B once B\'s error rate exceeds threshold.
- **Bounded retries with jitter**: client retries 2× max, with random delay; spread out.
- **Load shedding**: A drops low-priority requests when overloaded.
- **Bulkhead**: A has a separate thread pool for B-related calls; B\'s problem doesn\'t exhaust A\'s overall capacity.
- **Graceful degradation**: A\'s response shows cached data when B is unavailable instead of 503.

The point: **none of these alone are sufficient**. You need them all in layers.`,
      },
      {
        question: 'How do you recover from a live cascading failure?',
        answer: `**Stop the bleeding first; understand later.**

The mitigation sequence:

**Step 1: Reduce load immediately.**
- Load shed: drop low-priority requests at the LB level (rate limit, queue length cap).
- Block expensive paths: feature-flag off the slow code path causing the issue.
- Cap concurrency: lower max in-flight requests.

**Step 2: Block retry amplification.**
- Set retry-after on errors so clients wait longer.
- Disable client-side automatic retries via config / response headers.
- If clients are mobile apps with hardcoded retry: emergency message to wait.

**Step 3: Isolate the failing dependency.**
- If the cause is identified (slow downstream), aggressively trip circuit breakers — manually if needed.
- Disable optional features that depend on the slow path.
- Route around the failing component if possible.

**Step 4: Add capacity.**
- Scale up the affected services if possible. Won\'t fix the root cause but may help absorb residual load.
- Move traffic to healthy regions.

**Step 5: Restart cascaded components.**
- Cascaded services often need restart (GC spiral, exhausted thread pools, leaked resources).
- Rolling restart, with circuit breakers OPEN to prevent re-cascade.

**Step 6: Verify recovery.**
- Watch SLI metrics. Latency back to normal? Error rate dropped?
- Slowly close circuit breakers; observe.
- Increase traffic gradually if you load-shed.

**Step 7: Postmortem.**
- What was the trigger?
- What prevention layers were missing?
- What enabled the cascade (no timeout, no breaker, etc.)?

**The mental model**: cascading failures are positive-feedback systems. Once the spiral starts, simply "fixing" the trigger isn\'t enough — you have to break the feedback loops (load shed, restart, circuit-break) to return to a stable state.

The recovery template: **load shed → trip breakers → restart cascaded services → gradually restore**. In that order.`,
      },
      {
        question: 'What\'s the GC death spiral and how do you prevent it?',
        answer: `**Quote from SRE Book Ch 22**: *"Insufficient CPU triggers more GC, which uses more CPU, which leaves less for actual work."*

The spiral mechanics (Java specifically, also applies to other GC\'d languages):

1. Service is busy; processing more requests than usual.
2. Memory allocation rate is high; eventually heap is full.
3. GC runs to free memory. GC consumes CPU.
4. Less CPU for actual request processing → requests queue.
5. The queue grows; queued objects consume memory; heap fills faster.
6. GC runs more often / for longer.
7. Less CPU for work → larger queue → more memory pressure → more GC.

The endpoint: usually OOM (out of memory) or full saturation (request times out faster than service can process).

**Recovery from a GC spiral typically requires restart.** The system is too far gone to recover on its own — every cycle of work makes the spiral worse.

**Prevention:**

**1. Heap headroom.**
- Don\'t run at >70% heap utilization at steady state.
- The other 30% is for spikes and avoid GC pressure.
- Prometheus/Grafana: monitor JVM heap, alert at 80%.

**2. GC tuning.**
- Modern JVM: G1GC or ZGC (low pause). Avoid CMS (deprecated).
- Tune young-generation size for allocation patterns.
- Concurrent GC algorithms can do work in parallel with the application; reduces pause times.

**3. Bounded queues.**
- Don\'t use unbounded request queues. The queue itself becomes the source of memory pressure.
- Bounded queue + reject when full → load shedding.

**4. Bulkheads.**
- Separate thread pools per dependency. One bad dependency shouldn\'t fill all threads.
- Bulkheads also bound memory: each pool has its own queue depth.

**5. Profiling.**
- Continuous profiling (Pyroscope, Parca) shows where allocation is happening.
- Find the hot allocation path; optimize.

**6. Off-heap storage for caches.**
- Large caches on heap = constant GC. Off-heap (e.g., Chronicle, OHC) bypasses GC.

**7. Watch for memory leaks.**
- Slow leaks accumulate; GC works harder over time; eventually a spiral.
- Soak tests catch most leaks.

**The discipline**: GC death spirals usually have warning signs. Heap usage trending up; GC time as % of CPU growing; latency creeping. Alert on these before the spiral kicks in.

Other-language equivalents:
- **Go**: similar dynamics with the goroutine + GC system. Off-heap not as common; bounded channels matter.
- **Python**: GIL contention is the analogous issue; CPython\'s reference counting + cycle GC less prone to death spirals than tracing GC, but possible.
- **Node.js**: V8 GC similar to JVM; same dynamics.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/addressing-cascading-failures/',
      'https://www.usenix.org/conference/srecon21asia/presentation/bronson',
    ],
  },

  {
    id: 'graceful-degradation',
    title: 'Graceful Degradation — Serving Less, Not Nothing',
    icon: 'minimize',
    color: '#ec4899',
    questions: 3,
    description: 'The art of returning a partial / cached / fallback response instead of failing.',
    introduction: `**Graceful degradation** is the discipline of "serve less when you can\'t serve everything" instead of "fail completely." Often the difference between an outage and a recoverable incident.

**The three patterns:**

**1. Cached fallback.**
When a downstream is unavailable, return the last-known-good cached value. Often with a header indicating staleness (\`Cache-Control: max-age=0, stale-if-error=86400\`). Examples:
- Search service: when the index is unavailable, return cached results from 5 minutes ago.
- User profile: when the profile DB is down, return cached profile (acceptable for many features).
- Pricing service: return last-known prices (with a notice the data may be stale).

**2. Partial response.**
Return what you have; omit what you don\'t. Examples:
- Feed service: when the recommendations engine is down, return the chronological feed without recs.
- Product page: when reviews service is down, render the page without reviews.
- Search results: when one index shard is down, return results from the others with a note.

**3. Default / generic response.**
Return a sensible default when personalized data is unavailable.
- Recommendations: serve the global "most popular" list.
- A/B test: serve the control variant.
- Feature flag: default to the safe value.

**The decision framework**:

For each downstream call, ask: **what should we do when it fails?**

Three options:
- **Fail the request entirely**: appropriate for security checks, payment authorization, anything user-critical.
- **Degrade**: appropriate for enrichment data, recommendations, optional features.
- **Skip**: appropriate for logging, analytics, audit (failure-isolated to non-user-facing).

Most user-facing services have a mix. **Auth check** must succeed; **recommendations** can degrade; **analytics** can skip silently.

**Implementation patterns:**

**Try / fallback structure:**
\`\`\`
result = try_call_dependency()
if result.failed:
    result = fallback_function()
return result
\`\`\`

**Circuit breaker + fallback (resilience4j, Polly):**
\`\`\`
@CircuitBreaker(fallbackMethod = "getFallbackData")
public Data getData() { return upstream.fetch(); }

public Data getFallbackData(Exception e) { return cachedData; }
\`\`\`

**Service mesh + sidecar fallback:**
- Istio + Envoy can return a default response on upstream failure.
- Useful for "return 200 with empty body" patterns; not for rich fallbacks.

**Response header signaling:**
- \`X-Degraded: recommendations\` — tells clients which features are degraded.
- \`X-Cache-Hit: true; X-Stale: true\` — indicates cached / stale data.
- Allows client UIs to show "Some data may be outdated" notices.

**The instrumentation discipline:**

Every degraded path should be **observable**:
- Metric: \`requests_total{quality="full|degraded|fallback"}\`.
- SLI: % of requests served at full quality (vs. degraded).
- Alert: when degraded > 10% of traffic for sustained period.

Without instrumentation, you don\'t know how often degradation kicks in. A service that\'s "degrading silently" 50% of the time gives users a much worse experience than the SLO claims.

**The product / engineering boundary:**

Engineering can implement degradation; product needs to define **what counts as acceptable**. Some products demand "no degradation, period — fail loud" (e.g., financial settlement). Others welcome "show what you can" (e.g., feed apps).

Have the conversation explicitly. Document per-feature: full quality, acceptable degradation, unacceptable failure.

**Anti-pattern**: silent degradation that customers detect before you do. "Why are my search results so bad lately?" — turns out the index has been stale for a week. Always alert on degradation.`,
    whenToUse: [
      'Designing every external call — what\'s the fallback?',
      'Reviewing user-facing services — does the experience degrade gracefully?',
      'Postmortem — could degradation have prevented this outage?',
      'Product conversations — explicit per-feature degradation policy',
    ],
    keyConcepts: [
      { term: 'Cached fallback', definition: 'Return last-known-good cached value when downstream is unavailable. With staleness headers.' },
      { term: 'Partial response', definition: 'Return what you have; omit what you don\'t. Better than complete failure for non-essential data.' },
      { term: 'Default response', definition: 'Sensible fallback when personalized data unavailable. "Most popular" lists, control variants.' },
      { term: 'Quality SLI', definition: '% of requests served at full quality vs degraded. Captures partial-failure invisible to availability SLI.' },
      { term: 'Header signaling', definition: 'Response headers (X-Degraded, X-Stale) tell clients about degraded state; UIs can show notices.' },
      { term: 'Per-feature policy', definition: 'Product + engineering decide per feature: must succeed, can degrade, can skip silently. Documented.' },
    ],
    keyQuestions: [
      {
        question: 'Walk me through how you\'d design a feature with graceful degradation.',
        answer: `Worked example: a product page with reviews, recommendations, inventory, and pricing.

**Step 1: Categorize each downstream by criticality.**
- **Pricing**: must succeed. Wrong price is fraud.
- **Inventory**: must succeed. Selling out-of-stock is a customer-trust issue.
- **Reviews**: can degrade. Showing the page without reviews is fine.
- **Recommendations**: can degrade. Default to "most popular" if personalized fails.
- **Analytics tracking**: can skip silently. Don\'t fail user request because tracking failed.

**Step 2: Define the fallback per category.**
- **Pricing**: no fallback. Fail the request if pricing fails.
- **Inventory**: no fallback for "in stock" (fail). Fallback for inventory count: show "available" without exact number.
- **Reviews**: serve cached reviews from last hour. If cache is also down, omit the section.
- **Recommendations**: serve global "best sellers" list.
- **Analytics**: best-effort send; don\'t block.

**Step 3: Implement with circuit breakers + fallbacks.**
- Each dependency wrapped in a circuit breaker.
- Each circuit breaker has a fallback method.
- Fallback methods are pure (no further external calls) so they can\'t cascade.

**Step 4: Instrument quality.**
- Metric: \`product_page_request{quality="full|degraded_reviews|degraded_recs|...}\`.
- Quality SLI: % of requests served at full quality.
- Dashboard tracks degraded-quality events over time.

**Step 5: Tell the user.**
- Header: \`X-Degraded: reviews,recommendations\`.
- UI: subtle notice ("Some content may be stale") when degraded.

**Step 6: Monitor.**
- Alert if any quality drops below 90% sustained.
- Alert if cached fallback is hit > 10% (suggests upstream is unhealthy).

**The result:**
- Pricing failure → 503 (acceptable; rare).
- Inventory failure → 503 (acceptable).
- Reviews failure → page renders without reviews; SLI flag fires; users still buy.
- Recommendations failure → page shows generic recs; users still buy.
- Analytics failure → user unaware; engineers see metric.

The key insight: **most "failures" are partial failures**. Pricing usually works; reviews usually work. The architecture that handles partial failures gracefully has dramatically higher availability than one that requires every dep to succeed.`,
      },
      {
        question: 'When should a service NOT degrade gracefully?',
        answer: `Three categories:

**1. Security-critical decisions.**
- Authentication: if the auth service is down, you cannot serve the user. Don\'t fall back to "trust the client; let them in."
- Authorization: same. A "fallback" allows-all permission is a security disaster.
- Payment processing: if the payment gateway fails, the transaction must fail (or be queued for retry); never assume success.
- Fraud check: if fraud-scoring is down, reject or delay; don\'t fall back to "approve."

The principle: a degraded **security** decision is worse than a failed request. Better to fail loud.

**2. Financial / legal correctness.**
- Pricing: showing wrong prices is fraud. Don\'t fall back to "last seen" pricing for a customer\'s order.
- Inventory: claiming items in stock when they aren\'t is a customer-trust failure.
- Tax calculation: must use the current rate. Stale tax rates cause compliance issues.
- Order placement: must succeed atomically. Don\'t "queue and assume" without explicit confirmation.

**3. Auditable / compliance work.**
- Audit logging: must succeed. If you can\'t log who did what, the action shouldn\'t be allowed.
- Compliance checks (KYC, AML): cannot be skipped or fallback.
- Legal-mandated calculations (sales tax, regulatory limits): must use authoritative source.

**The pragmatic test**: would the customer be unhappy / the business be at legal risk if this degraded? If yes, fail loud.

Even within these categories, distinguish read vs write:
- **Read of pricing**: degrade carefully (cached for sub-minute is sometimes OK; depends on volatility).
- **Write of pricing in an order**: never. Use authoritative price.
- **Read of fraud score**: maybe degrade for non-purchase contexts.
- **Write of fraud-flagged decision**: never degrade.

The discipline is product + engineering deciding explicitly. Default to "fail loud" and only degrade where the product team has signed off.`,
      },
      {
        question: 'How do you avoid "silent degradation"?',
        answer: `**Make degradation visible at every layer.**

The three layers:

**1. Service-level metrics.**
- Every service emits a quality counter: \`requests_total{quality="full|degraded|fallback"}\`.
- Quality SLI in the SLO doc: "% of requests served at full quality."
- Dashboard widget: time-series of quality breakdown.

**2. Alerts on degradation.**
- Quality drops below threshold (e.g., 90% full quality) → alert.
- Specific fallback path triggered (e.g., the "global recommendations fallback") at high rate → alert.
- These are different from "is the service up" alerts; they catch "the service is up but degraded."

**3. Client signaling.**
- Response headers indicate degradation: \`X-Degraded: reviews\`.
- UI shows subtle indicator when degraded (e.g., "Some data may be outdated" badge).
- Clients can opt out of degraded responses if they want consistency.

**The diagnostic for a "silent degradation" pattern:**
- Run a quality query: "what fraction of last week\'s requests were degraded?"
- If the number is surprising (e.g., 15% of requests degraded, but no one knew), that\'s silent degradation.
- Common causes:
  - The downstream is sick but breaker is tripping → fallback is silent because it "works."
  - The downstream\'s slow path is slow enough to time out → fallback fires.
  - The cache is being served as fallback because the upstream rarely succeeds.

**Fix the silent degradation:**
- Add the alerts (immediate fix).
- Investigate why the upstream is returning fallbacks so often (capacity, code path, dependency).
- Either fix the upstream or accept the degradation (and tell product, who may not have signed off on 15% degraded).

**Cultural rule**: degradation that\'s instrumented and accepted is engineering. Degradation that\'s silent and unbeknownst is incompetence. The instrumentation is non-negotiable.

**Common pitfall**: SREs build sophisticated graceful degradation, then never look at the quality metric. Months later, customers complain about "the search seems off." Investigation: 30% of search responses have been degraded for 3 months due to a downstream change no one fixed. Quality SLI would have surfaced this in week 1.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/addressing-cascading-failures/',
      'https://learn.microsoft.com/en-us/azure/architecture/patterns/health-endpoint-monitoring',
    ],
  },

  {
    id: 'retry-jitter-backoff',
    title: 'Retry, Jitter, and Backoff — AWS Full-Jitter and the Retry Storm',
    icon: 'refreshCw',
    color: '#ec4899',
    questions: 3,
    description: 'The exponential-backoff formula, why jitter is mandatory, and AWS\'s "full jitter" recommendation.',
    introduction: `**Retries** are the most common cause of cascading failure. The intuition is fine ("if a request fails, try again"); the implementation is subtle.

**The three knobs:**

**1. Retry count.**
- Bounded. Typically 2-3 attempts.
- Unlimited retries are a source of retry storms.

**2. Backoff (delay between retries).**
- Linear: wait N seconds × attempt. Slow ramp.
- Exponential: wait \`base × 2^attempt\`. Standard.
- Fixed: same delay each time. Rarely correct.

**3. Jitter (random component).**
- Without jitter: all retrying clients retry at the same time → thundering herd.
- With jitter: retries spread out → less load spike.

**The classic exponential backoff formula:**
\`wait = base × 2^attempt\`

E.g., base=100ms: 100ms, 200ms, 400ms, 800ms, 1600ms.

**Adding jitter (AWS\'s "Full Jitter" recommendation):**
\`wait = random(0, base × 2^attempt)\`

E.g., base=100ms: \`random(0, 100ms)\`, \`random(0, 200ms)\`, \`random(0, 400ms)\`, ...

The reasoning (from AWS Architecture Blog, "Exponential Backoff and Jitter"): under load, simple "retry at random offset" produces a distribution that decreases load on the failing service. Full jitter is mathematically optimal for spreading retries.

**Equal Jitter (alternative):**
\`wait = (base × 2^attempt / 2) + random(0, base × 2^attempt / 2)\`

E.g., 50-100ms, 100-200ms, 200-400ms. Slower than full jitter; same spreading effect.

**Decorrelated Jitter** (also AWS):
\`wait = min(cap, random(base, prev × 3))\`

E.g., 100, then 100-300, then 100-900. Slightly faster than full jitter but harder to reason about.

**The retry-storm anti-pattern:**

A service is briefly degraded (5 seconds of high error rate). 10,000 clients with naive exponential backoff (no jitter) all retry at exactly the same time at T+200ms, then T+400ms, etc.

The result: 10,000 simultaneous retries every 200ms × 2^attempt seconds. The pulses of retry traffic are larger than the original load. The service can\'t recover because every backoff window ends with another tsunami of requests.

With full jitter: retries spread uniformly. Service sees small constant retry traffic; can absorb and recover.

**Idempotency requirement:**

Retries are only safe for **idempotent** operations.
- Idempotent: can be performed multiple times with the same result. \`PUT /users/123\` (set state); \`GET\` (read).
- Non-idempotent: each call has a side effect. \`POST /payments\` (charge once); \`POST /tweets\` (post once).

Retrying a non-idempotent operation can cause duplicate side effects (charging twice). Solutions:
- **Idempotency keys**: client generates a unique key; server deduplicates by key.
- **Conditional updates**: \`If-Match\` headers; only proceed if state hasn\'t changed.
- **Don\'t retry**: for some operations (financial), reject silently and let the user retry manually.

**Where to retry:**

- **Client-side** (browser, mobile, internal microservice client): retry network failures, 5xx, 429.
- **Service-side** (proxies, gateways): retry transient errors (network, timeout) but NOT application errors (400 series typically).
- **Don\'t retry on the same proxy that did the original**: amplifies load on the same path.

**HTTP retry guidance:**

- **5xx (except 501, 505)**: retry. Server says it\'s temporary.
- **429 (Too Many Requests)**: retry per Retry-After header.
- **408 (Request Timeout)**: retry.
- **4xx (other)**: do NOT retry. Client error; retrying produces same error.
- **Network errors (ECONNRESET, timeout)**: retry.
- **3xx redirects**: follow, don\'t retry.

**The maximum retry budget:**

A service should have a global "retry budget": max N retries per second across all clients. Without this, retries during an incident can saturate even healthy capacity.

Implementation: token bucket; retries cost tokens; tokens refill at a rate.`,
    whenToUse: [
      'Designing every retry policy — explicit jitter is non-negotiable',
      'Reviewing existing retries — are they bounded, jittered, idempotent?',
      'Postmortem with retry-storm component — was the policy correct?',
      'Service mesh / API gateway config — global retry settings affect every service',
    ],
    keyConcepts: [
      { term: 'Exponential backoff', definition: 'wait = base × 2^attempt. Standard formula. NEVER use without jitter.' },
      { term: 'Full Jitter (AWS)', definition: 'wait = random(0, base × 2^attempt). Mathematically optimal for spreading retries. Industry standard.' },
      { term: 'Retry storm', definition: 'Synchronized retries multiply load on a recovering service; prevent it from recovering. Solved by jitter.' },
      { term: 'Idempotency', definition: 'Operation can be retried safely. Required for retries; non-idempotent ops need idempotency keys or no retry.' },
      { term: 'Retry budget', definition: 'Global cap on retries per second. Token bucket. Prevents retry waves from exhausting healthy capacity.' },
      { term: 'Bounded retries', definition: '2-3 attempts max. Unbounded is the canonical retry-storm cause.' },
    ],
    keyQuestions: [
      {
        question: 'Why is jitter mandatory for retries?',
        answer: `**Without jitter, retries from many clients are SYNCHRONIZED — and synchronized retries are a thundering herd that prevents the service from recovering.**

Worked example: 10,000 clients all calling service X. X has a 5-second hiccup at T0; all 10,000 requests fail.

Without jitter:
- All clients retry at T+200ms (the first exponential backoff step).
- 10,000 simultaneous retries hit X at T+200ms.
- X is still recovering; can\'t serve all 10,000; some succeed, some fail.
- Failed clients retry at T+600ms (next backoff step).
- 5,000 retries arrive at T+600ms. Same pattern.
- Each backoff window ends with another wave; X stays sick longer.

With full jitter (\`wait = random(0, base × 2^attempt)\`):
- Clients\' retries are spread uniformly between T+0 and T+200ms.
- ~50 clients retry per millisecond (10000 / 200).
- X handles a manageable steady stream; recovers.
- The "bursts of synchronized retry" pattern doesn\'t exist.

**The math** (from the AWS blog):

Without jitter: all clients fire at the same time → load = N × baseline at retry instants.
With jitter: load distributed → load = N / (interval / step) per step ≈ baseline.

Difference: a factor of N (10,000 in this example).

**The critical pitfall**: people often think "exponential backoff" = "backoff with jitter" and get only the first part. They write \`wait = 2^attempt × 100ms\` and ship. Production retry storm a few months later. The fix is one line: \`wait = random(0, 2^attempt × 100ms)\`.

**The AWS decorrelated jitter** is sometimes preferred: \`wait = min(cap, random(base, prev × 3))\`. Slightly tighter retry interval (less time spent waiting); same spreading. Used by AWS SDKs.

**When to skip jitter**: never. There\'s no scenario where deterministic backoff is better than jittered. Always jitter.`,
      },
      {
        question: 'How do you handle retries for non-idempotent operations?',
        answer: `**Idempotency keys + server-side deduplication.**

The pattern:
1. Client generates a unique idempotency key for each operation (UUID).
2. Client sends the key with the request: \`Idempotency-Key: abc-123\`.
3. Server receives the request:
   - First time seeing the key: process normally; store \`(key, result)\` in a dedup table.
   - Already seen this key: return the stored result; don\'t re-process.
4. Client retries with the same key:
   - Server detects: returns the same response as the first time.
   - No duplicate side effect.

**Where the dedup state lives:**
- **Cache** (Redis, Memcached): fast but bounded TTL. Good for short-lived ops.
- **Database table**: durable. Good for financial / regulatory operations. Index on the key.
- **Both**: cache for hot keys, DB for durability.

**Key generation:**
- Client-side: UUID per logical operation. Same UUID across retries.
- Server-side: hash of (request body + user_id + timestamp_window). If client doesn\'t provide a key, server can derive one for HTTP idempotent methods.

**TTL for the idempotency key:**
- Match the retry window: if clients retry up to 24 hours, key should live 24+ hours.
- Stripe uses 24 hours; AWS varies by service.

**Patterns for specific use cases:**

**Payment processing (Stripe-style):**
- Client sends \`Idempotency-Key: payment-2024-01-15-userid-amount\`.
- Server stores \`(key, payment_result)\` in DB after processing.
- Retry with same key → return original result; no double-charge.
- Different key → new payment.

**Tweet / post / message-send:**
- Client generates UUID per message.
- Server stores message + key.
- Retry → return original tweet; no duplicate post.

**Ledger / transactional write:**
- Client supplies sequence number.
- Server checks for the sequence; if seen, returns previous result.

**The "no retry" alternative:**

For some operations, the right answer is **don\'t retry**. The user retries manually if the operation didn\'t succeed.
- Banking transfers (single-shot intent-confirmed flow).
- Critical destructive operations (delete account).
- Anything where double-side-effect is unacceptable AND idempotency keys would be complex.

The discipline: every API endpoint declares its idempotency. Either "idempotent (retries safe)" or "not idempotent (use idempotency key)" or "not idempotent (no retries)."`,
      },
      {
        question: 'What\'s a "retry budget" and when do you need one?',
        answer: `**Retry budget = a global token bucket limiting total retry RPS across all clients.**

The problem it solves: retries are useful for transient errors but **dangerous during sustained outages**. A service that\'s 50% degraded for an hour will see 2× normal traffic from retries, prolonging the outage.

The retry budget caps the damage:
- E.g., "max 10% of total RPS can be retries."
- During normal operation: retries are rare; budget barely consumed.
- During an outage: retries grow until they hit the budget; further retries are suppressed.

**Implementation (token bucket):**
- Budget: 10% of total RPS = 100 retries/sec for a 1000 RPS service.
- Token bucket: 100 tokens, refills at 100/sec.
- Each retry costs 1 token.
- If bucket is empty: retry is rejected at the proxy/gateway; client gets the original error.

**Where to implement:**
- **Service mesh** (Istio, Linkerd): retry policy with budget config.
- **API gateway** (Kong, AWS API Gateway, Azure APIM): retry budget per service.
- **Client-side libraries**: per-client local budget (less effective; can\'t coordinate across instances).

**When you need it:**
- High-traffic services with many client retrying.
- Services with critical SLOs where extending an outage by retries is unacceptable.
- Microservices fleets where one service\'s retries can saturate downstream.

**Without a retry budget:**
- A 30-second blip causes 30 seconds of outage + 60 seconds of retry storm = 90 seconds of degradation.
- With budget: 30 seconds of outage + retries cap at 10% = ~30 seconds of degradation.

**Trade-off**: budget rejects some retries that would have succeeded. For most services, this is fine — the retry was a duplicate of the original, and the original might succeed on its own anyway.

**Service-mesh example (Istio):**
\`\`\`yaml
trafficPolicy:
  tcp:
    maxConnections: 1000
  http:
    h2UpgradePolicy: UPGRADE
  outlierDetection:
    consecutiveErrors: 5
    interval: 30s
\`\`\`

(Istio doesn\'t have a direct "retry budget" knob; the combination of \`outlierDetection\` + retry policy + maxConnections approximates one.)

**Better implementation**: service-mesh + custom logic via Envoy filters. Or use the gRPC retry policy with retry-budget extension.

**The cultural framing**: retries help individual requests; retry budget protects the system. Both are needed.`,
      },
    ],
    references: [
      'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/',
      'https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html',
      'https://stripe.com/docs/api/idempotent_requests',
    ],
  },

  {
    id: 'load-shedding',
    title: 'Load Shedding — Drop Before You Die',
    icon: 'minus',
    color: '#ec4899',
    questions: 3,
    description: 'How and when to deliberately reject requests so the rest succeed. Priority-based shedding, queue management, the AWS framing.',
    introduction: `**Load shedding** is the discipline of **rejecting some requests so that others succeed**. Counterintuitive — engineers want to serve every request. The right reframe: serving 70% of requests successfully is much better than failing 100% of requests because the system collapsed.

The SRE Book Ch 21 (Handling Overload) is the canonical treatment. Quote: *"Avoid serving requests that you can\'t serve gracefully. The point of load shedding is to reduce the load on the server such that it can return to a healthy state and serve the rest of its load."*

**The three load-shedding patterns:**

**1. Reject incoming connections (LB level).**
- Load balancer / API gateway with concurrent-request cap.
- When cap reached: new connections get 503 immediately.
- Existing requests continue.
- Fast; no resource consumed for shed requests.

**2. Drop in-flight requests (queue management).**
- Service has bounded request queue.
- When queue exceeds threshold: reject new requests with 503.
- Or: drop oldest requests in the queue (CoDel-style).
- Prevents queue from growing without bound.

**3. Priority-based shedding.**
- Requests tagged by priority (premium customer, paid feature, internal vs external).
- When overloaded: drop low-priority first; preserve high-priority.
- Standard for tiered services (free, pro, enterprise).

**The decision: when to start shedding.**

Sheding too early: rejecting requests you could have served. Wasted capacity, unhappy customers.
Sheding too late: system has already degraded; cascading failure starting; recovery hard.

The sweet spot: **shed when system would otherwise enter degradation**. Indicators:
- Queue depth > threshold.
- p99 latency > target.
- CPU > saturation point.
- Memory > headroom.
- Connection pool > 90%.

Best practice: shed **before** the SLI breaches. If your latency SLO is "p99 < 500ms," shed when p99 starts climbing toward 500ms (e.g., at 300ms with growing trend), not when it\'s already at 600ms.

**The "health check" trap:**

Common mistake: when health check returns "unhealthy," LB removes the instance. Now remaining instances get more load → they get unhealthy → outage.

Better: when health check returns "unhealthy," instance enters **quarantine** (rejecting low-priority traffic) but stays in the pool for high-priority. Sheds load gradually instead of bouncing instances.

**The AWS pattern (from architecture blogs):**

AWS services use a four-level shedding scheme:
1. **All requests served**: normal.
2. **Background work deprioritized**: cron jobs, async tasks paused; user-facing reads/writes prioritized.
3. **Read-only mode**: writes rejected; reads served.
4. **Critical-only mode**: only health checks and admin commands; all user traffic rejected.

Each level has alerting; engineers know what mode the service is in.

**Coordinated shedding via priority headers:**

Internal microservices propagate a priority header (\`X-Priority: critical | high | normal | low\`). Service shedding uses this to decide which to drop.

**Practical example:**
- API call from logged-in user: critical.
- API call from anonymous user: normal.
- Background job request: low.
- Health check from LB: critical (so the LB doesn\'t remove the instance).

When overloaded: drop "low" first; then "normal"; then "high"; never "critical."

**Anti-patterns:**

- **Unbounded queues**: requests accumulate; eventually OOM or timeout-cascade.
- **Synchronous full-thread-pool**: every thread waiting on something; new requests can\'t even be acknowledged. Needs request-rejection logic before threads.
- **No metric for shed rate**: you don\'t know if shedding is happening or how much.
- **Shedding only based on error rate**: by the time errors are happening, you\'re too late. Shed on load indicators (queue depth, latency).

**Useful libraries:**
- **Netflix concurrency-limits**: adaptive concurrency limiting; calculates the optimal in-flight request count.
- **Hystrix / resilience4j**: bulkhead pattern enforces concurrency limits per dependency.
- **Envoy / Istio**: rate-limit filters; concurrency caps.
- **AWS API Gateway / Cloudflare**: rate limit at the edge.`,
    whenToUse: [
      'Pre-launch — bound the request queue; configure shedding before you need it',
      'Reviewing capacity plans — what happens at 1.5× peak? Shed gracefully or collapse?',
      'Postmortem with cascade involved — was shedding configured? Did it kick in?',
      'Critical events (Black Friday, viral moments) — pre-tune shedding aggressiveness',
    ],
    keyConcepts: [
      { term: 'Load shedding', definition: '"Reduce the load on the server such that it can return to a healthy state" — SRE Book Ch 21. Reject some so others succeed.' },
      { term: 'Priority-based shedding', definition: 'Requests tagged by priority; drop low first. Standard for tiered services.' },
      { term: 'Bounded queue', definition: 'Hard cap on request queue depth; reject when full. Prevents OOM cascade.' },
      { term: 'Quarantine mode', definition: 'Health-check-failed instance rejects low-priority traffic but stays in pool for critical. Better than removing it.' },
      { term: 'AWS shedding levels', definition: 'Normal → background-deprioritized → read-only → critical-only. Explicit modes; engineers know the state.' },
      { term: 'Adaptive concurrency limit', definition: 'Calculate optimal in-flight count from latency / throughput data (Netflix concurrency-limits). Auto-tunes.' },
    ],
    keyQuestions: [
      {
        question: 'Why is "serve all requests" worse than "drop some requests"?',
        answer: `Because trying to serve all requests at overload **eventually leads to serving none**.

The mechanics:
- 1000 requests arrive at a service that can handle 800.
- Service tries to serve all 1000.
- Latency for all requests increases (queueing).
- Threads/connections fill up; new requests can\'t be accepted.
- Health checks fail (the service can\'t respond fast enough to the LB).
- LB removes the instance.
- Remaining instances now get more load.
- Cascade.

vs:
- 1000 requests arrive at a service that can handle 800.
- Service rejects 200 with 503 immediately.
- 800 requests served at normal latency.
- System stays healthy.

The math: serving 80% of requests successfully gives 80% successful UX. Trying to serve 100% and degrading gives 0% successful UX (everyone times out).

**SRE Book Ch 21 quote**: *"It is better to provide a degraded experience to a fraction of users than to deliver a poor experience to all users."*

The "rejected 503" is fast; the user can retry. With idempotency keys, the retry succeeds. Some users see brief errors; the alternative is everyone seeing extended outages.

**Real-world example (the SRE Book\'s framing):**
A service can normally handle 1000 RPS. Load spikes to 1500 RPS. Without shedding: latency climbs from 100ms to 5s; thread pool fills; service stops responding entirely. 0% success rate.
With shedding: 500 RPS rejected with 503; 1000 RPS served at 100ms. 67% success rate (1000/1500). Plus the rejected clients retry; many of those succeed in subsequent windows.

The framing for non-engineers: **shedding is triage**. In an emergency room, you don\'t treat everyone simultaneously to the same degree; you triage. Shedding is the same principle for software.`,
      },
      {
        question: 'How would you implement priority-based shedding?',
        answer: `Three components:

**Component 1: Tag every request with a priority.**

At the edge (LB or gateway), set a header: \`X-Priority: critical | high | normal | low\`.

Examples:
- **Critical**: health checks (LB needs them); admin commands; payment confirmations; login auth checks.
- **High**: paid customer requests; latency-critical user actions.
- **Normal**: free-tier user requests; standard browsing.
- **Low**: prefetch, analytics, nice-to-have features, background sync.

The tag is propagated through every internal service via header (\`X-Request-Priority\`).

**Component 2: Per-service shed thresholds.**

Each service has thresholds:
- "Up to 70% load: serve everything."
- "70-80% load: drop low priority."
- "80-90% load: drop normal and below."
- "90%+ load: drop everything except critical."

Implementation: in the request handler, check the priority and the current load metric. Reject with 503 if the request is below the threshold for current load.

**Component 3: Observable.**

- Metric: \`shed_requests_total{priority="...", reason="overload"}\`.
- Alert: when high-priority shedding > 0.
- Dashboard: shed rate per priority over time.

**Example of priority enforcement:**
\`\`\`
def handle_request(req):
    load = get_current_load()  # 0.0 to 1.0
    priority = req.headers.get('X-Priority', 'normal')

    threshold_map = {
        'critical': 1.0,   # never shed critical
        'high':     0.95,  # shed only when very overloaded
        'normal':   0.85,
        'low':      0.70,
    }

    if load > threshold_map[priority]:
        return 503, "Shed: priority too low for current load"

    return process(req)
\`\`\`

**The discipline:**
- **Only the gateway sets priority** (avoid clients lying about their priority).
- **Priority bound to authentication / business rules**: paid customer = high; anonymous = normal.
- **Critical is rare**: only ~1% of traffic. Reserve for things that genuinely cannot fail.
- **Test under load**: verify shedding actually engages and the right priorities are preserved.

**The Netflix pattern (from a 2024 blog):**

Netflix uses a priority queue model:
- Each request has a priority and an expected SLA.
- When overloaded, drop requests whose SLA can\'t be met.
- High-priority requests with tight SLAs are preserved; low-priority with loose SLAs are first to drop.

This is a more sophisticated version of the basic priority shedding above; uses a SLA-deadline model.`,
      },
      {
        question: 'What\'s the difference between rate limiting and load shedding?',
        answer: `**Rate limiting** is per-client; **load shedding** is global.

**Rate limiting**:
- "Each client gets max X requests/sec."
- Implemented via token bucket or leaky bucket per client identifier (user, API key, IP).
- Returns 429 Too Many Requests.
- Used to enforce quotas, prevent abuse, fair-share limits.
- The client knows: "I\'m being throttled; back off."

**Load shedding**:
- "Service can\'t handle current load; some requests rejected regardless of who sent them."
- Implemented based on overall system health (queue depth, latency, CPU).
- Returns 503 Service Unavailable.
- Used to protect the system from collapse.
- Decision is made server-side based on aggregate state, not per-client.

**They\'re complementary:**

- Rate limiting prevents one greedy client from monopolizing the service.
- Load shedding handles the sum of all traffic exceeding capacity (legitimate or not).

**Practical setup:**
- Rate limit at the edge: each customer has their tier\'s rate limit (free=100/min, pro=10000/min). Per-key, per-IP, per-user.
- Load shed at the service: when overall load exceeds capacity, drop low-priority requests regardless of rate-limit status.

**Example scenarios:**

**Scenario 1**: 10 customers each at their rate limit (legitimate traffic). Total exceeds service capacity.
- Rate limiting: doesn\'t help (each customer is within their limit).
- Load shedding: kicks in; drops some requests. Service stays healthy.

**Scenario 2**: 1 customer trying to abuse with 10× their rate limit.
- Rate limiting: kicks in; drops most of their requests.
- Load shedding: not needed (rate limiting handles it).

**Scenario 3**: Service has a bug and is using 2× the CPU per request.
- Rate limiting: doesn\'t help (the customers aren\'t over limit; the issue is service-side).
- Load shedding: kicks in; reduces load until service recovers or restarts.

**HTTP status code distinction:**
- 429 (rate limited): "you are sending too much; back off." Client is at fault; client should obey.
- 503 (overloaded): "we are too busy; try again." Server is at fault; client should retry-with-backoff.

Both should include \`Retry-After\` header to tell clients when to retry.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/handling-overload/',
      'https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/',
      'https://github.com/Netflix/concurrency-limits',
    ],
  },

  {
    id: 'idempotency',
    title: 'Idempotency — Making Retries Safe',
    icon: 'repeat',
    color: '#ec4899',
    questions: 3,
    description: 'What idempotency means precisely, idempotency keys, and the financial-systems pattern.',
    introduction: `**Idempotent** = an operation that can be performed multiple times with the same result. \`f(x) = f(f(x))\`. Critical for retries: if an operation isn\'t idempotent, retries cause duplicate side effects.

**Idempotent operations:**
- \`PUT /users/123\` with body \`{name: "Alice"}\` — sets state. Multiple calls = same state.
- \`DELETE /users/123\` — removes resource. Multiple calls = no-op after the first.
- \`GET /users/123\` — read. Idempotent by definition.

**Non-idempotent operations:**
- \`POST /payments\` — creates a charge. Multiple calls = multiple charges.
- \`POST /tweets\` — creates a tweet. Multiple calls = duplicate tweets.
- \`PATCH /users/123/credits +10\` — increments by 10. Multiple calls = wrong total.

**The retry problem:**

If a non-idempotent request fails, you can\'t safely retry. Did the request fail before processing (safe to retry) or after processing but before responding (NOT safe to retry)? You don\'t know.

**The solution: idempotency keys.**

Client generates a unique key per logical operation. Server deduplicates on the key.

**The pattern (Stripe-style):**

1. Client decides to perform a non-idempotent operation. Generates UUID: \`abc-123\`.
2. Client sends: \`POST /payments\` with header \`Idempotency-Key: abc-123\` and body.
3. Server processes. Stores in dedup table: \`(key="abc-123", result=<processed>, ttl=24h)\`.
4. Server responds.
5. If client doesn\'t see response (network failure, timeout): client retries with same key.
6. Server: looks up the key. Found! Returns the original response. No double-processing.

**Implementation details:**

**The dedup table:**
- Key: idempotency key (UUID).
- Value: response body + status code.
- TTL: matches retry window (typically 24 hours).
- Storage: Redis (fast, cap on memory) or DB (durable).

**Concurrency:**
- Two simultaneous requests with the same key: the second one waits for the first.
- Lock per key: pessimistic lock or "INSERT IF NOT EXISTS" pattern.
- After the first completes, the second returns the same result (or detects "in progress; come back later").

**Edge cases:**
- **Different request body, same key**: should be a 409 Conflict. The key represents an operation; if the operation is different, key is being misused.
- **Long-running operation**: client retries before first completes. Server: return 409 ("already in progress; same key"). Client should poll or wait.
- **TTL expired**: idempotency key is no longer in the table. Treat as a fresh request. The client should respect the TTL.

**Where idempotency lives:**

- **Application layer**: most common. Keep dedup in Redis or DB; check at the start of every non-idempotent handler.
- **API gateway**: less common; needs to know which endpoints are non-idempotent.
- **Library**: Stripe SDK handles it client-side automatically.

**Idempotent vs idempotent-by-design:**

Some APIs make idempotency mandatory. AWS\'s API for state machines, Stripe\'s payment APIs, and most cloud services\' write operations.

Others (like Twitter\'s tweet API) require client-supplied idempotency tokens for every write — by design, can\'t do non-idempotent operations.

**Financial systems pattern:**

Payment processing requires strict idempotency. The pattern:
1. **Client generates transaction ID** (sometimes called "intent ID" or "operation ID").
2. **Send to processor with the ID**.
3. **Processor stores ID + result; retries return same result**.
4. **Client confirms**: "did the transaction succeed?" by looking up the ID.

Stripe\'s docs: *"Stripe\'s API has built-in support for idempotency for safely retrying API requests without accidentally performing the same operation twice."*

**The exception: distributed sagas.**

Long-running multi-step operations (saga pattern) need different handling. Each step in the saga is idempotent; if a step fails, the saga retries from that step. Compensation actions handle rollbacks. More complex than single-call idempotency; needed for cross-service transactions.`,
    whenToUse: [
      'Designing every non-idempotent API — idempotency keys are mandatory',
      'Reviewing existing retry logic — are retries safe?',
      'Postmortem with duplicate side effects (double charges, duplicate posts) — was idempotency missing?',
      'Cross-service workflows — saga pattern with idempotent steps',
    ],
    keyConcepts: [
      { term: 'Idempotent', definition: 'Multiple calls = same result. f(x) = f(f(x)). Required for safe retries.' },
      { term: 'Idempotency key', definition: 'Client-generated unique ID per operation. Server deduplicates by key. Standard for non-idempotent APIs.' },
      { term: 'Dedup table', definition: 'Storage of (key, result) for retried operations. Redis (fast) or DB (durable). TTL matches retry window.' },
      { term: 'Concurrency on same key', definition: 'Second simultaneous request with same key: lock or 409 Conflict. Don\'t process twice.' },
      { term: 'Stripe / AWS API pattern', definition: 'Idempotency built into the API. Client provides key; server handles dedup. The standard for write APIs.' },
      { term: 'Saga pattern', definition: 'Multi-step distributed workflow; each step idempotent; compensations for rollback. For cross-service transactions.' },
    ],
    keyQuestions: [
      {
        question: 'Walk me through implementing idempotent payment processing.',
        answer: `Stripe-style implementation:

**1. API design.**
- \`POST /charges\` with header \`Idempotency-Key: <UUID>\`.
- Body contains the charge details (amount, currency, customer, etc.).

**2. Server handler:**

\`\`\`
def create_charge(request):
    key = request.headers.get('Idempotency-Key')
    if not key:
        return 400, "Idempotency-Key required"

    # Try to acquire lock for this key
    lock = redis.lock(f"idem:{key}", timeout=30s)
    if not lock.acquire(blocking=True, blocking_timeout=10s):
        return 409, "Operation in progress; retry later"

    try:
        # Check if already processed
        existing = dedup_db.get(key)
        if existing:
            # Verify the request matches
            if existing.request_hash != hash(request.body):
                return 409, "Idempotency-Key reused for different request"
            return existing.status, existing.body

        # First time seeing this key; process the charge
        result = process_payment(request.body)

        # Store the result
        dedup_db.set(key, {
            'request_hash': hash(request.body),
            'status': result.status,
            'body': result.body,
            'created_at': now(),
        }, ttl=24h)

        return result.status, result.body
    finally:
        lock.release()
\`\`\`

**3. Storage (dedup table):**
- Schema: \`(key, request_hash, response_status, response_body, created_at)\`.
- Primary key: idempotency key.
- TTL: 24 hours (Stripe\'s default).
- Storage: Postgres for durability, with Redis cache for speed.

**4. Client behavior:**
- Generate UUID per logical operation.
- Send request; if response received, done.
- If no response (network timeout): retry with same UUID.
- Server returns same result; no double-charge.

**5. Error handling:**

Cases:
- **Key not found** (TTL expired or first call): process normally.
- **Key found, same request**: return cached response.
- **Key found, different request body**: 409 Conflict (don\'t silently process; bad client behavior).
- **Lock contention**: 409 Conflict; client should retry after a delay.

**6. Observability:**
- Metric: \`charges_idempotent_returned\` (cache hits) vs \`charges_processed\` (new).
- Cache hits are good; high rate suggests clients retrying often.
- Alert: lock contention rate (suggests bug or high concurrency on same key).

**7. Testing:**
- Send same request twice rapidly → second should return cached response.
- Send same key with different body → 409.
- Sleep 25 hours; send same key → processed as new (TTL expired).

The result: clients can retry safely; no double-charges; the API behaves correctly even under network failures.`,
      },
      {
        question: 'How do you handle idempotency for long-running operations?',
        answer: `Two patterns: **synchronous with status polling**, or **asynchronous with operation IDs**.

**Pattern 1: Sync with status (for ops that take seconds to minutes).**

\`\`\`
POST /reports/generate
Idempotency-Key: report-abc-123
\`\`\`

- Server starts processing; stores key with status="in_progress".
- If processing fits within the request timeout (say, 30s): respond with the result.
- If client retries during processing: server sees "in_progress" → returns 202 Accepted with location header to poll.
- Eventually: server completes; updates dedup entry to "completed".
- Client can poll the operation by key for the result.

**Pattern 2: Async with operation IDs (for ops that take minutes to hours).**

\`\`\`
POST /imports/start
Idempotency-Key: import-xyz-456
\`\`\`

- Server creates an "operation" entity with ID.
- Returns 202 Accepted with the operation ID immediately.
- Client polls \`GET /operations/{op_id}\` to check status.
- Operation states: pending, in_progress, completed, failed.

The idempotency key ensures: if client retries the create, server returns the same operation ID instead of starting a new one.

**Implementation specifics:**

**The dedup entry stores the operation reference**, not the result:
\`\`\`
{
  key: "import-xyz-456",
  operation_id: "op_789",
  status: "completed" | "in_progress" | "failed",
  result_url: "/operations/op_789"
}
\`\`\`

**Timeouts:**
- Per the dedup TTL: 24 hours typically.
- Per the operation TTL: longer (week or month) so clients can poll old operations.

**Failure handling:**
- If the operation fails: dedup entry shows status="failed"; client retry with same key returns the failure.
- Client must use a NEW idempotency key for a retry attempt; the original failed.
- This is by design: idempotency means "same result"; "succeed despite failure" requires a new key.

**Saga pattern (multi-step):**

For workflows spanning multiple services:
- Each step has its own idempotency key.
- If a step fails: retry the failed step (idempotent).
- If a step succeeds and a later step fails: compensate by undoing earlier steps.
- The whole saga is identified by a saga_id; each step references it.

Tools that help:
- **AWS Step Functions**: built-in idempotency for state machines.
- **Temporal / Cadence**: workflow engines designed for long-running, idempotent operations.
- **Camunda**: BPMN-based workflows.

These tools embed idempotency into the framework, so application code doesn\'t need to handle it explicitly.

The pattern: **synchronous idempotency for short ops; async with operation IDs for long ops; saga for multi-service**.`,
      },
      {
        question: 'When can you skip idempotency keys?',
        answer: `Three cases where idempotency keys aren\'t needed:

**1. The operation is already idempotent.**
- \`PUT /users/123\` with full state body. Always sets to that state. No key needed.
- \`DELETE /users/123\`. Multiple calls = no-op after first. No key needed.
- \`GET\` (read). Always idempotent. No key.

**2. The system has another deduplication mechanism.**
- **Unique constraints in DB**: \`INSERT INTO emails (user_id, message_id) VALUES (...)\` with PK on (user_id, message_id). Duplicate inserts fail with constraint violation; client treats as success.
- **Conditional updates**: \`If-Match: <etag>\` headers. Update only if state hasn\'t changed.
- **Append-only logs with sequence numbers**: client supplies a sequence number; server rejects out-of-order or duplicate.

**3. The cost of duplication is acceptable.**
- **Analytics events**: a duplicate page-view is no big deal. Better to deduplicate downstream than to add idempotency complexity.
- **Logs**: duplicate log entries are usually fine.
- **Metrics**: the metric system itself handles dedup (counter increment is idempotent enough; counter-of-events is not, but acceptable for non-critical signals).

**Cases where idempotency keys are MANDATORY:**

- **Money operations**: payments, transfers, refunds, charges.
- **Asset creation**: tweets, posts, comments, messages where duplicates are user-visible bad.
- **Stateful actions**: triggering a workflow, sending an email, posting to social.
- **External effects**: anything that calls a third-party API with side effects.

**Pragmatic guidance:**

For new APIs, default to **requiring idempotency keys for all non-idempotent operations**. Cost: small (one header, one dedup table). Benefit: retries are safe; no class of "duplicate" bugs.

For existing APIs without idempotency: if you see duplicate-related bugs in production, retrofit. Otherwise: deferred.

Stripe\'s opinion (from their docs): "Idempotency is fundamental to building reliable distributed systems." They require keys for all writes and consider it a missing feature on competitor APIs that don\'t.`,
      },
    ],
    references: [
      'https://stripe.com/docs/api/idempotent_requests',
      'https://docs.aws.amazon.com/general/latest/gr/api-retries.html',
      'https://temporal.io/blog/why-idempotency',
    ],
  },

  {
    id: 'bulkheads',
    title: 'Bulkheads — Isolating Resource Pools',
    icon: 'package',
    color: '#ec4899',
    questions: 3,
    description: 'Per-dependency thread pools, the ship-bulkhead analogy, and how Hystrix popularized the pattern.',
    introduction: `**Bulkheads** are an isolation pattern from Michael Nygard\'s *Release It!* (2007). The analogy: ship hulls are divided into watertight compartments (bulkheads); a hole in one compartment doesn\'t flood the entire ship.

In software: **isolate resource pools so a failure in one can\'t exhaust the whole service\'s capacity**.

**The pattern:**

Without bulkheads:
- Service A has one global thread pool of 100 threads.
- A calls services B, C, D.
- B becomes slow (5s response instead of 50ms).
- 100 threads waiting on B; A can\'t serve C or D either.
- One sick dependency (B) → A is fully unavailable.

With bulkheads:
- A has separate thread pools per dependency: 30 for B, 30 for C, 30 for D, 10 reserve.
- B becomes slow.
- 30 threads (the B-pool) are blocked.
- C-pool and D-pool still have full capacity; calls to C and D succeed.
- A is partially degraded (B-features down) but not fully unavailable.

**The Hystrix popularization:**

Netflix Hystrix (2012) made the pattern famous via two implementations:
- **Thread isolation**: each dependency has its own thread pool.
- **Semaphore isolation**: lighter-weight; counts concurrent calls instead of using separate threads.

Today (Hystrix is in maintenance mode), **resilience4j** and **service-mesh layers** implement the same patterns.

**Thread vs semaphore isolation:**

**Thread isolation:**
- Separate thread pool per dependency.
- Pros: full isolation; one slow dep can\'t block others.
- Cons: thread overhead; each thread is 1-2 MB of stack; more threads = more context switching.

**Semaphore isolation:**
- Same threads; counted concurrent permits per dependency.
- Pros: lightweight; no thread overhead.
- Cons: doesn\'t isolate from CPU contention or thread blocking on other resources.

**Best practice:**
- **Thread isolation** for slow / blocking dependencies (DB, external APIs, anything that might hang).
- **Semaphore isolation** for fast in-memory or trusted-fast operations.

**The connection-pool bulkhead (database):**

Common DB pattern:
- Without bulkhead: one connection pool of 100 connections shared across all use cases.
- A slow query path consumes 100 connections waiting on a hung query.
- Other use cases (dashboards, admin) starve.

With bulkhead:
- Separate pools per use case: 30 for user requests, 30 for admin, 30 for batch jobs, 10 reserve.
- Slow query consumes only the user-request pool; admin and batch continue.

**The cost: more pools = more memory.**

- Each pool has overhead (idle connections, monitoring threads).
- Trade-off: granularity vs efficiency.
- Practical limit: 5-10 pools per service.

**Bulkheads in service mesh:**

- Istio: \`maxConnections\` per destination + \`maxRequestsPerConnection\`.
- Linkerd: similar via service profiles.
- Both: per-destination concurrency caps act as bulkheads.

**The discipline:**

Identify the dependencies that can plausibly fail or slow down. For each:
1. Allocate a dedicated pool.
2. Size it: just enough for the dependency\'s normal throughput + buffer.
3. Monitor: track pool saturation. Alert when a specific pool is exhausted.

**Anti-patterns:**

- **Single global pool for everything**: the canonical anti-pattern. One bad actor blocks everyone.
- **Per-pool configuration drift**: different pools with inconsistent timeouts/limits become hard to reason about.
- **Over-bulkheading**: too many pools, each too small, total capacity reduced. 5-10 pools is enough.

**Combined with circuit breakers:**

Circuit breakers + bulkheads layer:
- Bulkhead: isolate the bad dependency to its own pool.
- Circuit breaker: stop calling the bad dependency to free its pool.
- Together: one bad dep can\'t cascade AND its pool gets recycled fast.

This is the standard reliability pattern stack.`,
    whenToUse: [
      'Designing a service with multiple downstream dependencies',
      'Reviewing for cascading-failure resilience — does one bad dep take down the whole service?',
      'DB connection pool design — separate pools per workload type',
      'Service mesh policy — per-destination concurrency caps',
    ],
    keyConcepts: [
      { term: 'Bulkhead pattern', definition: 'Per-dependency resource pool. One bad dependency can\'t exhaust the whole service. From Nygard\'s Release It!.' },
      { term: 'Thread isolation', definition: 'Separate thread pool per dependency. Strongest isolation; thread overhead.' },
      { term: 'Semaphore isolation', definition: 'Same threads, counted permits per dependency. Lightweight; less full isolation.' },
      { term: 'Connection-pool bulkheads', definition: 'Separate DB pools per workload (user, admin, batch). Slow query in one pool doesn\'t starve others.' },
      { term: 'Hystrix legacy', definition: 'Popularized bulkhead pattern in microservices. resilience4j is modern replacement.' },
      { term: 'Combined with circuit breaker', definition: 'Bulkhead isolates; breaker stops calling. Together they prevent cascade and recover quickly.' },
    ],
    keyQuestions: [
      {
        question: 'How do bulkheads differ from circuit breakers?',
        answer: `Different problems, complementary solutions.

**Bulkheads** isolate **resources** so one bad dependency can\'t consume them all.
- "Even if dep X goes bad, only its pool of resources is affected."
- Implementation: separate thread pools, connection pools, semaphores per dependency.
- Effect: a slow dep blocks its own pool only.

**Circuit breakers** stop **calling** a bad dependency once you detect it\'s broken.
- "Once dep X has a high error rate, stop calling it for a while."
- Implementation: state machine that fast-fails when OPEN.
- Effect: spend zero resources on a broken dep; let it recover.

**Together, they\'re a layered defense:**

1. Dep X starts failing (slow responses).
2. Bulkhead: only the X-pool is blocked; other deps continue.
3. Circuit breaker: detects the high error/timeout rate; trips OPEN.
4. Fast-fail: subsequent X requests return immediately (don\'t block the X-pool).
5. X-pool drains; threads return to available state.
6. Service is fully functional except for X-related features.

Without bulkhead: X\'s problem blocks the entire service.
Without circuit breaker: X-pool stays blocked even after X recovers (next-call-to-X-still-takes-5s).
Without both: cascading failure within minutes.

**Practical implementation order:**
1. **First add timeouts** to every external call.
2. **Then add bulkheads** (per-dep pools).
3. **Then add circuit breakers** (fast-fail when failure rate high).
4. **Then add retries with jitter** (cautious retry of failed calls).
5. **Then add fallbacks** (degraded responses when all of above fail).

Each layer prevents a different class of cascade.`,
      },
      {
        question: 'Walk me through configuring a bulkhead for a database connection pool.',
        answer: `Worked example: a service with mixed workloads.

**Step 1: Identify the workload categories.**
- **User requests**: latency-sensitive; high throughput. Most of the traffic.
- **Admin / dashboard queries**: fewer requests; can tolerate more latency.
- **Batch jobs**: occasional large queries; less time-sensitive.
- **Health checks / monitoring**: very small queries; constant rate.

**Step 2: Create separate pools per category.**

PgBouncer or HikariCP example:
\`\`\`
pool.user_requests.max_connections = 50
pool.user_requests.idle_timeout = 60s

pool.admin.max_connections = 10
pool.admin.idle_timeout = 300s

pool.batch.max_connections = 5
pool.batch.idle_timeout = 600s

pool.health.max_connections = 5
pool.health.idle_timeout = 60s
\`\`\`

**Step 3: Route each query to the right pool.**

Application code categorizes:
\`\`\`python
def query_user_data(user_id):
    return user_pool.execute(query, [user_id])

def query_admin_dashboard():
    return admin_pool.execute(complex_query)

def run_batch_job():
    return batch_pool.execute(batch_query)
\`\`\`

The categorization usually maps to API path or annotation.

**Step 4: Monitor and alert per pool.**
- Pool saturation: how many connections in use vs max.
- Pool wait time: how long requests wait for a connection.
- Pool errors: how often pool is exhausted.

Alerts:
- "User pool > 90% saturated" → page (user-facing impact).
- "Admin pool exhausted" → ticket (less critical).
- "Batch pool exhausted" → ticket; consider scaling DB or reducing batch concurrency.

**Step 5: Handle pool exhaustion gracefully.**

When a pool is exhausted, don\'t hang waiting:
- **Bounded wait** (e.g., 100ms timeout to acquire connection).
- **Reject and retry** (return 503; client retries).
- **Fall back to a degraded path** (if available).

**Sizing the pools:**

The math: \`pool_size = (concurrent_users × queries_per_request × query_duration) / acceptable_latency\`.

For user pool: 1000 RPS × 1 query/request × 50ms / 100ms acceptable wait = 500 connections. But DB max is 100. So actually: 50 connections per app instance × 10 instances = 500. Tune.

**The win:**

A slow batch query consumes 5 connections (the batch pool). The batch pool is full. New batch jobs block; user requests proceed normally.

Without bulkhead: the slow batch query consumes 50 of the 50-connection pool; user requests starve; service degrades.

Result: bulkhead + monitoring → graceful degradation in the right places.`,
      },
      {
        question: 'When are bulkheads NOT worth it?',
        answer: `Three cases:

**1. Single-dependency services.**
- A service that only calls one downstream. Bulkheading "the only call" doesn\'t isolate anything.
- Use timeout + circuit breaker; bulkhead adds complexity without benefit.

**2. Internal in-process operations.**
- Bulkheading purely-CPU work doesn\'t prevent cascading; CPU is already shared.
- Useful for I/O-bound operations (network, disk); less useful for pure compute.

**3. Tiny services (< 10 RPS).**
- Per-pool overhead (idle connections, threads) might exceed the cost of failure.
- Use a single pool; rely on circuit breaker + timeout for resilience.

**Cost-benefit framing:**

Bulkheads add:
- Configuration complexity (multiple pools to size and tune).
- Memory overhead (multiple connection pools, multiple thread pools).
- Operational overhead (more metrics to monitor, more alerts).

They\'re worth it when:
- Service has multiple downstream dependencies.
- Failure of any one dependency would otherwise cascade.
- The cost of cascade > the cost of bulkhead overhead.

For most production microservices: yes, worth it.
For monoliths with one DB and one cache: maybe overkill; rely on connection-pool sizing + circuit breakers.

**Anti-pattern: over-bulkheading.**

Some teams create 50 different pools, each tiny. Result: every pool is constantly saturated; total useful capacity reduced; configuration complexity high.

The right granularity: 5-10 logical categories per service. Not per-endpoint, not per-method.

**Modern alternative: virtual threads (Java 21+, Go goroutines).**

For services with abundant lightweight threads (Java\'s Project Loom, Go), thread-isolation bulkheads are less critical because threads are cheap. Semaphore-style limits per dependency still useful; thread-pool partitioning becomes obsolete.

In 2026 with Java 21 virtual threads being mainstream, the bulkhead pattern is shifting toward "concurrency permits per dependency" rather than "thread pool per dependency." The IDEA stays the same; the implementation becomes lighter.`,
      },
    ],
    references: [
      'https://docs.microsoft.com/en-us/azure/architecture/patterns/bulkhead',
      'https://resilience4j.readme.io/docs/bulkhead',
      'https://martinfowler.com/articles/microservices.html#DesignForFailure',
    ],
  },

  {
    id: 'timeouts-deadlines',
    title: 'Timeouts and Deadlines — The Universal Discipline',
    icon: 'clock',
    color: '#ec4899',
    questions: 3,
    description: 'Why every external call needs a timeout, deadline propagation across services, and choosing the right values.',
    introduction: `**Every external call must have a timeout.** This is non-negotiable. A call without a timeout is a call that can hang forever; under load, hung calls are how services collapse.

The SRE Book Ch 22 quote: *"RPCs inherit and decrease deadlines as they descend the stack so a server doesn\'t waste cycles on a request whose caller already gave up."*

**The default-no-timeout problem:**

Many libraries default to "no timeout" or "very long timeout." HTTP clients in Python, Java, Node — many require explicit timeout configuration. Without it, the call might wait minutes or hours.

In a request-handling thread pool: each hung call holds a thread. Hold 100 threads for 30 minutes; service is unavailable.

**Timeout values:**

The right timeout is **just longer than the call\'s p99 latency**, with a small buffer.

If the dep\'s p99 is 200ms, set timeout at 500ms-1s. Tight enough to detect hangs; lax enough that legitimate slow calls succeed.

**Common ranges:**
- DB query: 1-5 seconds.
- Cache lookup: 50-200 ms.
- Internal microservice RPC: 100ms-2s depending on call.
- External third-party API: 5-30 seconds.
- Long-running batch operation: 30-300 seconds (or async with status).

**The timeout pyramid (the deadline-propagation rule):**

When service A calls B, A\'s timeout must be > B\'s timeout to all of B\'s downstreams. Otherwise A times out before B can detect its own failure.

If A times out at 1s and B has timeouts of 0.5s to its 5 downstream services, B might accumulate 0.5s × 5 = 2.5s of downstream waits + processing — exceeding A\'s 1s timeout. A retries while B is still working; double the work.

The "deadline propagation" approach:
- A sets a 1-second deadline.
- A passes the deadline to B as part of the request.
- B sees: "I have 0.9s remaining (after network latency)." Adjusts its timeouts accordingly.
- B passes the remaining deadline to its downstreams.
- Each layer respects the original deadline; no work happens after the user has given up.

**Implementation patterns:**

**gRPC**: built-in deadline propagation via context. \`grpc.WithDeadline(time.Now().Add(1 * time.Second))\`. Server reads the deadline and uses it for downstream calls.

**HTTP**: less standard; some implementations use \`X-Deadline\` header with absolute timestamp.

**OpenTelemetry**: trace context can carry deadline information; emerging standard.

**The "hard timeout" vs "soft timeout":**

**Hard timeout**: kill the operation at the deadline. The call returns an error.
- Used for synchronous operations.
- Risk: the operation might have actually succeeded but the response didn\'t arrive in time.

**Soft timeout**: cancel the operation but it might still complete in the background.
- Useful for some async patterns.
- Combined with idempotency keys: even if a "timed out" operation completed, retrying with same key returns the same result.

**The cancellation cascade:**

When a call times out, **cancel all downstream calls**. Don\'t leave them dangling. Goroutines / coroutines / cancellable threads pattern.

In practice: pass a cancellation context. Downstream calls check cancellation periodically; abort if canceled.

**Timeout-related cascading failure:**

Pattern: A times out at 5s. A\'s downstream calls (B, C, D) don\'t time out at all. When A times out, the calls to B, C, D continue running in the background, holding threads.

Even though A returns to the user with an error, A\'s thread pool is still consuming resources on the abandoned calls. Service degrades.

The fix: **propagate cancellation**. When A times out, cancel the in-flight calls to B, C, D. Threads return to the pool.

**Reading the timeout from a config:**

Best practice: timeouts as configuration, not hard-coded constants. Tunable per environment, per dependency, per release.

\`\`\`yaml
dependencies:
  user-service:
    timeout: 500ms
  recommendations-service:
    timeout: 200ms
  fraud-service:
    timeout: 2000ms
\`\`\`

When the dep changes characteristics (faster, slower, new version), tune without redeploying.

**Common mistakes:**

- **No timeout** (the most common): defaults of "no timeout" in HTTP clients.
- **Timeout too long** (5 minutes): not really protecting; threads still hang minutes.
- **Timeout too short** (50ms when dep p99 is 100ms): false-positive timeouts; retries amplify load.
- **Same timeout for every dependency**: ignores that deps have different characteristics.
- **No cancellation propagation**: timed-out calls still consume resources downstream.`,
    whenToUse: [
      'Every single external call — timeouts are mandatory',
      'Reviewing existing code — search for HTTP clients without timeout config',
      'Postmortem with hung-thread component — was timeout missing or wrong?',
      'Microservice design — propagate deadlines via gRPC or context',
    ],
    keyConcepts: [
      { term: 'No timeout = no protection', definition: 'A call without timeout can hang forever; threads exhaust; service collapses. Mandatory.' },
      { term: 'Right timeout value', definition: 'Just longer than dep\'s p99, with buffer. Tight enough to detect hangs; lax enough for legitimate slow calls.' },
      { term: 'Deadline propagation', definition: 'Caller passes deadline; downstream services use it for their own timeouts. SRE Book Ch 22 verbatim.' },
      { term: 'Cancellation cascade', definition: 'When a call times out, cancel all downstream in-flight calls. Free resources immediately.' },
      { term: 'Hard vs soft timeout', definition: 'Hard: kill operation. Soft: cancel but allow background completion. Idempotency keys make soft safe.' },
      { term: 'Timeout pyramid rule', definition: 'A\'s timeout > sum of B\'s downstream waits. Otherwise A times out while B is still working.' },
    ],
    keyQuestions: [
      {
        question: 'Walk me through deadline propagation in a microservice call.',
        answer: `Worked example: user request flowing through 3 services.

**Initial request:**
- User\'s browser sends request to API gateway with 2-second timeout.
- Gateway converts to internal call with deadline: \`now() + 2 seconds\`.

**Hop 1: Gateway → Service A.**
- Gateway calls A with the deadline in context.
- 50ms network latency consumed.
- A receives request with \`remaining_deadline = 1.95s\`.

**Hop 2: Service A → Service B.**
- A processes for 100ms; remaining = 1.85s.
- A wants to call B. Sets B\'s timeout to \`min(1.85s, our_default_for_B)\`.
- If A\'s default for B is 500ms: timeout = 500ms (use the smaller).
- A passes deadline to B: \`absolute_deadline = original_deadline\`.

**Hop 3: Service B → Service C.**
- B processes for 50ms; remaining = 1.8s.
- B calls C with deadline propagated.
- C\'s timeout: \`min(1.8s, c_default)\`.

**The principle:**
- Every service\'s effective timeout for its callees = \`min(remaining_deadline, default_timeout_for_callee)\`.
- The original deadline cascades down.
- No service waits past the original user-given-up time.

**Without deadline propagation:**

- Gateway\'s 2s timeout is local.
- A\'s timeout to B is 500ms (config default).
- B\'s timeout to C is 500ms.
- Total potential time spent: 500ms (B) + 500ms (C) = 1000ms... but actually, the client (gateway) timed out at 2s.

Looks fine in nominal case. Pathological case:
- Gateway calls A. A is slow; takes 1.9s.
- A calls B. A\'s timeout to B is 500ms — it WAITS 500ms before timing out.
- But the gateway already timed out the entire chain at 2s.
- A\'s wait of 500ms is wasted; the user already gave up.

With deadline propagation: A sees \`remaining = 0.1s\`; sets B\'s timeout to 0.1s; B fails fast or A times out without waiting full 500ms. Resources freed immediately.

**Implementation:**
- **gRPC**: built-in via \`context.Context\` with deadline. Standard pattern.
- **HTTP**: not standardized; common conventions use \`X-Deadline-Timestamp\` or \`Grpc-Timeout\` header.
- **OpenTelemetry baggage**: deadline can ride in trace context.

**The cultural ask**: every microservice framework should default to deadline propagation. Many do (gRPC). HTTP is more inconsistent.`,
      },
      {
        question: 'How do you choose a timeout value?',
        answer: `**Look at the call\'s p99 latency in production and add buffer.**

The formula: \`timeout = p99_latency × 1.5\` to \`p99_latency × 3\`.

If a dep\'s p99 is 200ms, set timeout to 300-600ms.

**Why this range:**
- Tighter than p99 (e.g., timeout = p95): you\'d false-positive on legitimate p99 calls.
- Way looser than p99 (e.g., timeout = 10× p99): protection is weak; long-tailed slow calls hold threads.

**The data you need:**
- p50, p95, p99 latency for each dep over the last 7-30 days.
- p99 during peak load (the relevant target).
- Trend over time (latency can drift).

**Common values for reference:**

- **In-memory cache hit**: p99 ~1-5ms; timeout 50-100ms.
- **Local DB query (simple)**: p99 ~10-50ms; timeout 200ms-1s.
- **Local DB query (complex)**: p99 ~100-500ms; timeout 1-5s.
- **Internal RPC (sync)**: p99 ~50-500ms; timeout 200ms-2s.
- **External third-party API**: p99 highly variable; timeout 5-30s.
- **Long-running operation (export, ML inference)**: p99 1-30s; timeout 30-300s; consider async.

**When the timeout should be tighter:**
- High-traffic path: false-positive timeout costs less than holding threads.
- Critical-latency service: 500ms target SLO requires tight timeouts everywhere.
- Bulkheaded pool with limited threads: timeouts must be tight or pool exhausts.

**When the timeout should be looser:**
- Low-traffic path: false-positive timeout is more expensive.
- Long-tailed dependency: p99 includes legitimate slow calls; cutting them hurts more than it helps.
- Backend-only path: not in user\'s critical path; can wait longer.

**Adaptive timeouts:**

The Netflix concurrency-limits library and similar adaptive systems calculate optimal timeouts from real-time data. Adjust based on current latency distribution.

For most teams: hand-tuned timeouts based on observed p99 work fine. Adaptive is fancy; rarely needed.

**The check:**
- Plot dep\'s latency distribution.
- Mark the timeout line.
- Verify: most p99 calls are below the timeout (legitimate calls succeed).
- Verify: hung calls (>>>p99) hit the timeout fast (don\'t wait minutes).

**Update timeouts on:**
- Dep upgrade (might be faster or slower).
- Traffic increase (latency might shift).
- Postmortem finding (timeout was wrong).`,
      },
      {
        question: 'I\'ve added timeouts everywhere. What ELSE is needed?',
        answer: `Five complementary patterns:

**1. Cancellation propagation.**
- When a timeout fires, cancel all downstream in-flight calls.
- Without this: A times out; A returns error; but A\'s downstream calls keep running, holding resources.
- Implementation: cancellation context (Go\'s context.Context, JS AbortController, Java Future.cancel).

**2. Bounded retries with jitter.**
- Don\'t retry timed-out calls indefinitely.
- 2-3 attempts max; exponential backoff with jitter.
- Without this: timeout + retry = 2× the load on the failing service.

**3. Circuit breakers.**
- After repeated timeouts, stop calling.
- Without breaker: every request waits the timeout; even after dep is broken, service degrades for the timeout duration per request.
- With breaker: calls fast-fail after threshold; service stays responsive.

**4. Bulkheads.**
- Per-dependency thread pool (or semaphore).
- One slow dep doesn\'t exhaust the entire service\'s threads.

**5. Graceful degradation / fallbacks.**
- Timeout fires → fallback path (cached value, default, partial response).
- Better UX than just an error.

**Typical layered stack:**

\`\`\`
result = circuit_breaker(dep_X).execute(
    bulkhead(dep_X_pool).execute(
        timeout(500ms,
            dep_X.call_with_idempotency_key()
        )
    ),
    fallback=cached_x_value
)
\`\`\`

Each layer prevents a different failure mode:
- **Timeout**: hangs.
- **Bulkhead**: resource exhaustion.
- **Circuit breaker**: cascading failure.
- **Retry**: transient errors.
- **Fallback**: degraded UX.

**Without the full stack:**

Just timeout: prevents hangs but cascading failure still possible.
Timeout + retry: now retry storms.
Timeout + retry + circuit breaker: now you\'re catching most cases.
Timeout + retry + circuit breaker + bulkhead: production-grade.
Add fallback: graceful degradation.

The pragmatic order to add (each gives marginal returns):
1. Timeout (mandatory; prevents the worst).
2. Retry with jitter (low cost; high benefit).
3. Circuit breaker (medium cost; high benefit at scale).
4. Bulkhead (medium cost; needed for multi-dep services).
5. Fallback (high cost — requires designing the fallback; high UX benefit).

Skipping any leaves a failure mode open. The mature production service has all five.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/addressing-cascading-failures/',
      'https://grpc.io/blog/deadlines/',
    ],
  },
];
