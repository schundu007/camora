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
];
