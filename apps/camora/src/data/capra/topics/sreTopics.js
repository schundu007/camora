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
];
