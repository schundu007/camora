// AIOps — interview prep covering ML-driven operations: anomaly detection,
// alert correlation, root cause analysis, capacity forecasting, and LLM agents.

export const aiopsCategories = [
  { id: 'aiops-core', name: 'AIOps', icon: 'zap', color: '#d946ef' },
];

export const aiopsTopicCategoryMap = {
  'aiops-fundamentals':              'aiops-core',
  'anomaly-detection-ml':            'aiops-core',
  'alert-correlation-grouping':      'aiops-core',
  'incident-rca-ml':                 'aiops-core',
  'llm-sre-agents':                  'aiops-core',
  'capacity-forecasting-ml':         'aiops-core',
  'aiops-open-source-diy':           'aiops-core',
  'chaos-engineering-observability':  'aiops-core',
  'kubernetes-native-aiops':         'aiops-core',
  'aiops-roi-maturity':              'aiops-core',
};

export const aiopsTopics = [
  {
    id: 'aiops-fundamentals',
    title: 'AIOps',
    icon: 'zap',
    color: '#d946ef',
    questions: 5,
    description: 'Applying ML to operational telemetry — anomaly detection, alert correlation, root-cause assistance, capacity forecasting. Gartner introduced the term in 2016; by 2026 every major APM vendor ships AIOps features and the pure-play vendors have largely consolidated. Honest read on what works (alert grouping, single-metric anomalies) versus what is mostly marketing (true root-cause analysis).',
    visualizations: [
      {
        title: 'AIOps — definition, history, capabilities, the 2026 landscape',
        description: `AIOps stands for "Artificial Intelligence for IT Operations". Gartner coined the term in 2016 (originally "Algorithmic IT Operations") to describe a category of tools that apply machine learning and analytics to operational telemetry. The pitch: shift from reactive dashboards-and-alerts toward predictive, self-healing operations.

Gartner's three-layer AIOps capability model:

Observe — ingest and normalize signals from across the stack. Metrics from Prometheus / Datadog / CloudWatch, logs from Splunk / Elastic / Loki, traces from Jaeger / Tempo / X-Ray, events from CMDB and change-management systems, topology from service mesh / APM.

Engage — interaction layer for humans. Dashboards, incident chat, runbook search, conversational query (the LLM-era addition). PagerDuty AIOps, Datadog Bits AI, ServiceNow Now Assist all live here.

Act — automation that closes the loop. Auto-remediation (restart this pod, scale this group), auto-ticketing, auto-routing of incidents to the right on-call. The ambition is "self-healing"; in practice this layer is the least adopted and most fragile.

History — how the category evolved:

2013-2015: pure-play AIOps vendors form. Moogsoft (founded 2012, focus on alert correlation), BigPanda (founded 2012, also alert correlation), OpsRamp, FixStream. Pitch: SaaS layer above your existing monitoring that de-noises alert storms.

2016: Gartner publishes the AIOps Market Guide and the term sticks.

2017-2019: APM vendors build native AIOps. Dynatrace Davis, Datadog Watchdog (2018), New Relic Applied Intelligence (2019), Splunk ITSI. The pitch shifts from "buy a separate AIOps platform" to "your APM has AIOps built in".

2020-2023: consolidation. Cisco acquires AppDynamics (2017). Moogsoft acquired by Dell in 2023. BigPanda remains independent but pivots from "AIOps" branding toward "incident intelligence".

2023-2026: LLM-era reframing. PagerDuty AIOps ships incident summarization and runbook chat. Datadog's Bits AI (2023, expanded through 2025). New Relic AI, Splunk AI Assistant, ServiceNow Now Assist all do similar. Marketing moves from "ML detects anomalies" to "chatbots over your runbooks and telemetry".

The 2026 landscape:

APM-native (most adoption): Datadog Watchdog + Bits AI, Dynatrace Davis, New Relic AI, Splunk Observability Cloud + AI Assistant, AppDynamics Cognition.

Incident management AIOps: PagerDuty AIOps, OpsGenie (Atlassian), ServiceNow ITOM.

Pure-play / specialized: BigPanda, Anodot, Cisco AIOps. Smaller share than 2018; the bundled APM offerings won by default.

Open source / DIY: Prometheus + custom Python (Prophet, scikit-learn, isolation forest), Grafana ML plugin, open-source forecasting libraries.

Honest read — what works and what does not:

Genuinely valuable in 2026:
- Alert correlation and grouping. 80% noise reduction is achievable.
- Single-metric anomaly detection on well-behaved series.
- Forecasting for capacity (Prophet-class models on predictable seasonal workloads).
- Log pattern mining.
- LLM-era runbook search and incident summarization.

Mostly hype or partial:
- "Root cause analysis" by ML. What these tools do is correlate changes with anomalies. They do not prove causation. The label "RCA" oversells; "root-cause assistance" is closer.
- "Self-healing" autonomous remediation. Outside narrow runbooks, broadly autonomous remediation is a 2018 promise that did not arrive.
- Multivariate anomaly detection across the entire stack. Sounds impressive in demos; in production produces too much noise.

The deeper point. AIOps is a useful umbrella for "ML-augmented ops tooling" but is not a magic productivity multiplier. Teams that get value pick specific capabilities (alert grouping, anomaly detection on key SLIs) and integrate them into existing workflows. Teams that buy "an AIOps platform" expecting the platform to fix observability hygiene problems consistently disappoint themselves.`,
        image: '/diagrams/devops/z1-aiops.png',
      },
      {
        title: 'AIOps capabilities — what each layer actually does',
        description: `1. Anomaly detection on metrics. Instead of static thresholds, the system learns the metric's normal pattern and alerts on deviations.

How it works in production tools (Datadog Watchdog, Dynatrace Davis, New Relic Applied Intelligence): typically a stack of statistical methods — STL or robust seasonal decomposition to model daily / weekly cycles, then 3-sigma or quantile-based bands on the residual. Some products use LSTM / Prophet-style models for series with complex multi-period seasonality.

Where it works: well-behaved request rate / error rate / latency series with clear seasonality.

Where it fails: regime changes (post-deploy the metric shifts permanently), holidays / one-off events, low-volume series, bursty workloads.

2. Alert correlation and grouping. 1 incident → 1000 alerts via cascading dependencies. The platform groups them into one incident.

How it works: clustering on (timestamp, service, alert text) plus topology when available. Temporal clustering, topological clustering, text similarity.

Where it works: organizations with topology data (service mesh, APM auto-discovery, CMDB). 70-90% noise reduction is realistic.

3. Log pattern mining. Surface the N dominant patterns in your logs without you writing regexes.

How it works: token sequence clustering (Drain algorithm and variants), template extraction. Datadog's log patterns view, Splunk Smart Mode, Elastic Categorize text.

4. RCA assistance via correlation. When a metric anomaly fires, the platform tells you what changed. Recent deploys, config changes, infrastructure events, dependent-service anomalies.

How it works: time-aligned correlation across signal sources. Datadog Watchdog Insights surfaces "this metric anomaly correlates with deploy X at 14:32". Dynatrace Davis builds a problem tree using its Smartscape topology. Honeycomb's BubbleUp surfaces dimensions where the anomaly population differs from baseline.

Where it works: when there is a single recent change that lines up.

Where it fails: multi-cause incidents, slow-burn issues with no clean change marker, infrastructure-layer causes invisible to the application APM.

5. Forecasting and capacity prediction. Forecast disk fill rate, traffic growth, queue depth, capacity headroom.

How it works: Prophet, ARIMA, exponential smoothing, sometimes DeepAR. Tools: Datadog Forecasts, Grafana ML plugin, Anodot.

6. Conversational interfaces (LLM-era). Ask a question in natural language, get an answer over your telemetry and runbooks.

How it works: LLM (Claude, GPT-4 family) reads runbook documents, past incidents, optionally runs queries against the observability backend (function calling). RAG over runbook stores. Tools: Datadog Bits AI, PagerDuty AIOps incident summarization, ServiceNow Now Assist, New Relic AI assistant.

Where it works: runbook search ("how do we restart the orders service?"), incident summarization ("summarize what happened in incident #4727"), simple metric queries.

Where it fails: open-ended diagnosis ("why is my service slow?") — the model speculates plausibly but does not actually diagnose. Treating the chatbot's answer as authoritative is the failure mode.

The accuracy reality. Vendor demos make all of these look like end-to-end automation. In production they are best treated as assistants — they propose, the engineer disposes.

Adoption sequence that actually works:

Step 1. Pick one painful alert problem. Usually alert storm reduction or one specific noisy anomaly source. Pilot one capability against it. Measure noise reduction over a month.

Step 2. Tune sensitivity by service. AIOps configs are not one-size-fits-all. Critical services (auth, payments) need tighter thresholds; batch jobs need looser. Per-service tuning is the work.

Step 3. Integrate into existing on-call. Route AIOps-grouped incidents into PagerDuty / OpsGenie alongside your other alerts.

Step 4. Layer on second capability (forecasting, log mining, RCA assistance) only when first is solid.

Common pitfalls:
- Alert sensitivity wrong (too sensitive = noise; too insensitive = missed incidents).
- Trusting RCA suggestions without verification.
- Holiday and one-off events (model has not seen them).
- Regime change after a deploy (baseline is now wrong).
- Buying the platform before adopting the practice (12 months of integration before value).
- "Self-healing" theater (autonomous remediation rare).
- Chatbot as authority (LLM hallucinations propagate).

Measuring AIOps value. Before-and-after metrics: alerts per incident (should drop from N to 1-2 with correlation), time-to-acknowledge, time-to-resolve, false-positive rate, engineer pages per week.

The deeper point. AIOps is operations engineering with ML assistance, not ML engineering with operational data. The teams that succeed treat it as a force multiplier on existing SRE / platform discipline, not a substitute.`,
      },
      {
        title: 'Quick-fire interview answers — AIOps Fundamentals.',
        question: 'Quick-fire interview answers — AIOps Fundamentals.',
        answer: `Rapid-fire facts.

Q: Define AIOps in one line.
A: Applying ML and analytics to operational telemetry — anomaly detection, alert correlation, RCA assistance, forecasting — to augment human SRE / ops work.

Q: Who coined the term?
A: Gartner, 2016. Originally "Algorithmic IT Operations", later relabeled "AI for IT Operations".

Q: Gartner's three layers?
A: Observe (ingest), Engage (human interface), Act (automation).

Q: Pure-play AIOps vendors?
A: Moogsoft, BigPanda, OpsRamp, Anodot. Founded around 2012-2013. Largely consolidated by 2026.

Q: APM-native AIOps?
A: Datadog Watchdog, Dynatrace Davis, New Relic Applied Intelligence, Splunk ITSI, AppDynamics Cognition. Most adopted in practice.

Q: PagerDuty AIOps?
A: Combination of acquired Rundeck automation plus AI features for alert grouping and incident summarization.

Q: What does Datadog Watchdog do?
A: Anomaly detection on customer metrics, plus Watchdog Insights for change correlation.

Q: What does Dynatrace Davis do?
A: Causation engine that builds a problem tree using the Smartscape topology graph.

Q: What is Bits AI?
A: Datadog's LLM-based assistant. Natural language queries over telemetry, incident summaries, runbook search.

Q: Is the chatbot doing the RCA?
A: No. It is summarizing logs, runbooks, and past incidents and presenting a plausible narrative. Engineer still does the actual diagnosis.

Q: Anomaly detection — production implementation?
A: Usually STL or robust seasonal decomposition + 3-sigma or quantile bands on residual.

Q: When does anomaly detection work well?
A: Single metric, clear seasonality, reasonable volume.

Q: When does it fail?
A: Regime changes, holidays, low-volume series, bursty workloads.

Q: Alert correlation in one line?
A: Cluster N alerts that come from one incident into one grouped page.

Q: Realistic noise reduction?
A: 70-90% with topology data; 95% requires investment.

Q: RCA via ML — what is real?
A: Change correlation and dimension surfacing. Datadog Watchdog Insights, Honeycomb BubbleUp, Dynatrace Davis problem trees.

Q: What is hype?
A: "Root cause analysis" — these tools find correlations, not proven causes.

Q: Self-healing autonomous remediation?
A: Largely a 2018 promise that did not arrive.

Q: Forecasting that genuinely works?
A: Disk fill prediction.

Q: BigPanda vs Moogsoft?
A: BigPanda still independent. Moogsoft acquired by Dell in 2023.

Q: Open-source AIOps?
A: Prometheus + custom Python, Grafana ML plugin, statsforecast, NeuralProphet.

Q: Build vs buy?
A: Buy if your APM already includes it. Build for a small set of business-critical metrics. Hybrid is common.

Q: What is the cost shape?
A: Multiplier on observability spend.

Q: What metrics measure AIOps value?
A: Alerts per incident, time-to-acknowledge, time-to-resolve, false-positive rate, engineer pages per week.

Q: Common failure mode?
A: Buying the platform before fixing observability hygiene.

Q: First capability to adopt?
A: Alert correlation and grouping.

Q: Last capability to trust?
A: Autonomous remediation.

Q: When does an LLM chatbot help?
A: Runbook search, incident summarization, simple query translation. Not open-ended diagnosis.

These are answers an AIOps-fluent platform / SRE engineer should give without preparation.`,
      },
    ],
    references: [
      'https://www.gartner.com/en/information-technology/glossary/aiops-artificial-intelligence-operations',
      'https://www.datadoghq.com/product/watchdog/',
      'https://www.dynatrace.com/platform/artificial-intelligence/',
      'https://www.pagerduty.com/platform/aiops/',
      'https://newrelic.com/platform/applied-intelligence',
      'https://www.bigpanda.io/our-product/',
    ],
  },

  {
    id: 'anomaly-detection-ml',
    title: 'Anomaly Detection in Ops',
    icon: 'zap',
    color: '#d946ef',
    questions: 5,
    description: 'Algorithms for catching metric deviations without static thresholds — 3-sigma and ESD on stationary series, STL / Prophet / DeepAR for seasonal forecasting, isolation forest and autoencoders for multivariate. Covers when statistical methods are sufficient, when ML is genuinely needed, and the operational pitfalls.',
    visualizations: [
      {
        title: 'Algorithm families and when each one fits',
        description: `Family 1: simple statistical (single metric, stationary, no seasonality).

3-sigma. Compute rolling mean and standard deviation; alert when value exceeds mean ± 3σ. Fast, interpretable. Fails on seasonal data.

Z-score with rolling window. Same idea, normalized.

ESD (Generalized Extreme Studentized Deviate). Detects up to k outliers in a sample without specifying which ones. Twitter AnomalyDetection R package made it popular in ops.

MAD (Median Absolute Deviation). Robust to outliers in training data. Good when historical data already contains incidents.

Family 2: seasonal decomposition (single metric, seasonal pattern).

STL (Seasonal-Trend decomposition using LOESS). Decomposes a series into trend + seasonal + residual; apply 3-sigma on the residual. Workhorse for daily / weekly seasonal metrics.

Holt-Winters. Triple exponential smoothing — level, trend, seasonality.

Family 3: forecasting models (multi-period seasonality, holidays, events).

Prophet (Meta, 2017). Bayesian additive model: trend + seasonal Fourier + holiday effects + change-points. Standard starting point for capacity forecasting.

NeuralProphet. Prophet-architecture plus neural autoregressive components.

ARIMA / SARIMA. Classical Box-Jenkins. Less popular in ops than Prophet.

DeepAR (Amazon). RNN-based probabilistic forecasting trained jointly across many related series.

Family 4: tree-based and unsupervised (multivariate, no labels).

Isolation Forest (Liu et al, 2008). Tree-based; anomalies are points easy to isolate via random splits. Common choice for multivariate.

Local Outlier Factor (LOF). Density-based.

One-class SVM. Less common in production ops.

Family 5: deep learning (high-dimensional, complex temporal).

LSTM / GRU autoencoders. Train to reconstruct normal sequences; reconstruction error spikes on anomalies.

Transformer-based forecasters (Informer, PatchTST, Temporal Fusion Transformer). State-of-the-art on benchmarks; expensive.

VAE anomaly detection. Probabilistic version of autoencoder.

Picking — the practical hierarchy:
1. Start with STL + 3-sigma residual on a single metric. If this is enough, stop.
2. If holidays / events distort the model, move to Prophet.
3. If you need joint multivariate signal, isolation forest.
4. Only consider deep learning if simpler methods leave real gaps.

Most production ops anomaly detection is solved by Family 1 + Family 2. Family 3 is for forecasting. Families 4 and 5 are for the harder problems that most teams do not have.

Tools — production landscape:

Datadog Watchdog. Automatic anomaly detection across APM and infrastructure. Combines seasonal decomposition with statistical bands. Datadog also exposes anomaly() monitor types: basic (rolling baseline), agile (light seasonal modeling), robust (handles broken seasonality).

Anodot. Independent vendor focused on time-series anomaly detection, especially business KPIs.

Dynatrace Davis. Causation engine plus per-entity anomaly detection. Topology-aware.

Splunk ITSI. Adaptive Thresholding feature uses time-policy-aware baselines.

Sentry. Anomaly detection on error rates, transaction volume, performance metrics.

Grafana Machine Learning plugin. Forecasting and anomaly detection over Prometheus / Loki / Tempo.

Honeycomb BubbleUp. Surfaces dimensions where a failing population differs from baseline. "What is different about the failing slice?"

Open-source / DIY: Prometheus + Python (Prophet, statsforecast, scikit-learn). statsforecast (Nixtla) is production-grade Python with classical methods.

Operational realities:

Problem 1: alert fatigue from sensitivity drift. Mitigations: per-service sensitivity, alert on duration not single points, severity tiers, periodic review.

Problem 2: holidays and one-off events. Mitigations: calendar-aware models, manual mute windows, annotated baselines.

Problem 3: regime changes after a deploy. Mitigations: retraining cadence, deploy-aware baselines, manual re-baseline after planned major changes.

Problem 4: low-volume series. Aggregate, longer windows, rate-based detection, or skip anomaly detection and use absolute thresholds.

Problem 5: bursty workloads. Detect on quantile metrics (p99 duration), rate-of-change instead of value detection, windowed aggregation.

Problem 6: dependent anomalies. Topology-aware grouping at the alerting layer.

Problem 7: multivariate that doesn't work. Restrict to a small hand-picked set of related metrics; don't try the full stack.

The maturity progression that works: SLO-based alerting → anomaly on top 5-10 critical metrics → forecasting for capacity → multivariate on hand-picked clusters → periodic prune.

The deeper point. Anomaly detection's value comes from disciplined sensitivity tuning, calendar awareness, and topology-aware grouping — not algorithmic sophistication.`,
        image: '/diagrams/devops/z2-anomaly.png',
      },
      {
        title: 'Quick-fire interview answers — Anomaly Detection.',
        question: 'Quick-fire interview answers — Anomaly Detection.',
        answer: `Rapid-fire facts.

Q: Define anomaly detection in ops.
A: Identifying metric values or patterns that deviate from expected behavior, replacing or augmenting static thresholds.

Q: When are static thresholds enough?
A: Stable metrics with known operating bounds.

Q: 3-sigma in one line?
A: Alert when value exceeds rolling mean ± 3 standard deviations. Cheap, fails on seasonal data.

Q: STL in one line?
A: Seasonal-Trend decomposition using LOESS. Splits a series into trend + seasonal + residual; apply 3-sigma on residual.

Q: Prophet?
A: Meta open-sourced 2017. Bayesian additive model: trend + Fourier seasonality + holidays + change-points.

Q: NeuralProphet vs Prophet?
A: NeuralProphet adds neural autoregressive components.

Q: DeepAR?
A: Amazon's RNN-based probabilistic forecaster trained jointly across related series.

Q: Isolation Forest?
A: Tree-based unsupervised; anomalies are points easy to isolate via random splits.

Q: LOF?
A: Local Outlier Factor. Density-based.

Q: When do you actually need deep learning?
A: Rarely in pure ops. More common in security UEBA, fraud, IoT predictive maintenance.

Q: Datadog Watchdog?
A: Automatic anomaly detection plus Watchdog Insights for change correlation.

Q: Datadog anomaly() monitor types?
A: basic (rolling baseline), agile (light seasonal), robust (handles broken seasonality).

Q: Anodot?
A: Independent vendor focused on time-series anomaly detection, especially business KPIs.

Q: Dynatrace Davis?
A: Causation engine plus per-entity anomaly detection. Topology-aware.

Q: Honeycomb BubbleUp?
A: Surfaces dimensions where a failing population differs from baseline.

Q: Grafana ML plugin?
A: Grafana Cloud feature for forecasting and anomaly detection over Prometheus / Loki.

Q: When is multivariate anomaly detection worth it?
A: A small hand-picked cluster of related metrics for one service.

Q: Most common anomaly detection mistake?
A: Sensitivity tuned globally instead of per-service.

Q: Holiday handling?
A: Calendar-aware models (Prophet holiday parameter), manual mute windows.

Q: Regime change after deploy?
A: Re-baseline on rolling window. Verify retraining cadence matches deploy frequency.

Q: Low-volume series?
A: 3-sigma cannot get signal at 0.1 RPS. Aggregate, longer windows, or absolute thresholds.

Q: Bursty workloads?
A: Detect on quantile metrics (p99 duration) not instantaneous values.

Q: SLO burn-rate vs anomaly alerts?
A: SLO burn-rate is primary signal. Anomaly alerts are supporting context.

Q: Build vs buy?
A: Buy if your APM includes it. Build for a small set of business-critical metrics.

Q: Maturity progression?
A: SLO alerts on golden signals → anomaly detection on top 5-10 critical metrics → forecasting for capacity → multivariate on hand-picked clusters → periodic prune.

These are answers an anomaly-detection-fluent platform / SRE engineer should give without preparation.`,
      },
    ],
    references: [
      'https://docs.datadoghq.com/monitors/types/anomaly/',
      'https://facebook.github.io/prophet/',
      'https://otexts.com/fpp3/',
      'https://github.com/Nixtla/statsforecast',
      'https://docs.honeycomb.io/investigate/bubbleup/',
      'https://grafana.com/docs/grafana-cloud/alerting-and-irm/machine-learning/',
    ],
  },

  {
    id: 'alert-correlation-grouping',
    title: 'Alert Correlation & Grouping',
    icon: 'zap',
    color: '#d946ef',
    questions: 5,
    description: 'When one incident produces a thousand alerts via cascading dependencies, on-call engineers cannot triage. Correlation strategies (temporal, topological, causal), platforms (PagerDuty AIOps, BigPanda, Moogsoft, Datadog Incidents, ServiceNow ITOM), and what realistic noise reduction (70-90% achievable) looks like in production.',
    visualizations: [
      {
        title: 'The alert storm problem and correlation strategies',
        description: `One incident generates many alerts because dependencies cascade, and humans cannot triage 1000 pages. Concrete example: auth service has DB connection pool exhaustion at 14:32. Within two minutes: auth-service paged for 3 conditions, api-gateway paged for 2, web-frontend, mobile-app, payments, plus 50 downstream services. 80+ pages for one root cause.

Why naive deduplication is not enough: alerts are about different services and symptoms — not duplicates. Real correlation needs more than a dedup hash.

Strategy 1: temporal. Group alerts that fire within a window (typically 1-15 minutes). Simple, vendor-agnostic. Where it works: high-severity, sharp-onset incidents. Where it fails: slow-burn incidents, co-incidental simultaneous incidents.

Strategy 2: topological. Group alerts on services that share a dependency edge in the service map. Topology comes from: APM auto-discovery (Datadog, Dynatrace, New Relic), service mesh (Istio, Linkerd), CMDB (ServiceNow), Kubernetes (NetworkPolicies), or manual YAML. Where it works: organizations with complete and accurate topology. Where it fails: cross-cutting infrastructure failures (shared DB, shared network) where topology doesn't reflect actual coupling.

Strategy 3: causal. Determine that one alert is the upstream cause of another. Produces a tree (one root cause, many downstream effects). How tools approximate: topology + temporal precedence; change correlation; dependency graph traversal. Where it works: tools with strong topology + change data (Dynatrace Davis is canonical).

Strategy 4: text similarity. Cluster alerts by message content via NLP / token similarity. Useful as complement when topology is missing.

Strategy 5: statistical co-occurrence. Learn from history that "alert A and B usually fire together within 5 minutes". Used by ML-based correlation tools.

Mature platforms layer multiple strategies. The output that matters: one incident summarizing all the alerts.

Platforms:

PagerDuty AIOps. Add-on tier above PagerDuty Incident Response. Rules-based grouping, content-based (NLP), or intelligent grouping (ML model learns from history). Strengths: PagerDuty is already the on-call routing system; AIOps lives where the workflow is.

BigPanda. Independent AIOps platform focused on incident intelligence. Founded 2012; remains independent in 2026. Strengths: heterogeneous environments where alerts come from many tools.

Moogsoft. Pure-play AIOps platform. Acquired by Dell in 2023. Less independent product velocity than the standalone years.

Datadog Incidents + Watchdog. Native incident management plus Watchdog correlation. Topology auto-built from APM. Strengths: deep topology because Datadog owns the APM data.

Dynatrace Davis. Causation engine over Smartscape topology. Most-praised AI features in AIOps for RCA assistance.

ServiceNow ITOM. AIOps integrated with ServiceNow CMDB and ITSM workflows.

OpsGenie (Atlassian). Less ML-heavy than PagerDuty AIOps.

Open-source: Karma (alertmanager dashboard) for grouping visualization; Alertmanager itself supports grouping by labels.

Realistic noise reduction figures. Vendor case studies cite 95%+ noise reduction. Real deployments achieve 70-90% in steady state, after months of tuning.

Operating in production:

Alert hygiene is the prerequisite. Service ownership tag, severity, type, source service identifier, runbook link. Symptoms that hygiene is missing: alerts with messages like "Error in service" with no service field; "Critical" severity used for everything.

Topology data quality: auto-discovered (best), service mesh-derived (good), CMDB-curated (mixed), manual YAML (worst). Heuristic: if topology updates within 24 hours of a real architectural change, it's good enough.

Sensitivity tuning. Aggressive grouping risks merging separate real incidents. Conservative leaves residual storm. Start conservative, tune up.

Co-incidental incidents. Tool may merge two real but unrelated problems. On-call must inspect alert list and split if domains are unrelated.

Cross-cutting infrastructure failures. Maintain explicit synthetic alerts on shared infrastructure (AZ health, cache cluster, DNS) so the correlation tool has the actual root in its alert stream.

Change correlation as a forcing function. The most reliable RCA signal is a change event temporally adjacent to the alert. Wire CI / CD pipelines and IaC to emit deploy events.

Anti-pattern 1: "let AIOps fix our alerting". The team has 200 noisy alerts; AIOps is bought instead of pruning. Result: AIOps groups noisy alerts into noisy incidents.

Anti-pattern 2: trusting root-cause designation without verification. Engineer rolls back deploy X because tool said so; actual cause was unrelated.

Measuring success: alerts ingested per day, incidents created per day, mean time to acknowledge, engineer pages per week, false-merge rate, missed-incident rate.

The deeper point. Alert correlation is one of the highest-ROI AIOps capabilities — when the inputs are clean. The work is in alert metadata, topology, and change-event integration. Treat AIOps adoption as 70% data hygiene and 30% tool selection.`,
        image: '/diagrams/devops/z3-alert-correlation.png',
      },
      {
        title: 'Quick-fire interview answers — Alert Correlation.',
        question: 'Quick-fire interview answers — Alert Correlation.',
        answer: `Rapid-fire facts.

Q: The alert storm problem in one line?
A: One incident produces hundreds of alerts via cascading dependencies; correlation collapses them into one incident.

Q: Temporal correlation?
A: Group alerts firing within a window (typically 1-15 minutes).

Q: Topological correlation?
A: Group alerts on services that share a dependency edge in the service map.

Q: Causal correlation?
A: Determine that one alert is the upstream cause of others. Produces a tree (one root, many effects).

Q: Text similarity correlation?
A: Cluster by alert message content using NLP / token similarity.

Q: How do mature platforms combine these?
A: Layered — temporal for the initial group, topological / causal to refine root cause, text similarity as a tiebreaker.

Q: PagerDuty AIOps?
A: Add-on tier above PagerDuty. Rules / content / intelligent grouping plus change correlation plus LLM summarization.

Q: BigPanda?
A: Independent AIOps platform. Best for heterogeneous monitoring estates.

Q: Moogsoft today?
A: Acquired by Dell in 2023.

Q: Datadog Incidents + Watchdog?
A: Native incident management plus Watchdog correlation. Topology auto-built from APM.

Q: Dynatrace Davis?
A: Causation engine over Smartscape topology.

Q: ServiceNow ITOM?
A: AIOps integrated with CMDB and ITSM workflow.

Q: Realistic noise reduction in production?
A: 70-90% in steady state. 95% requires significant investment.

Q: Most important prerequisite?
A: Alert hygiene — service ownership tags, consistent service names, severity discipline, type tags.

Q: How do you get topology data?
A: Best: APM auto-discovery. Good: service mesh logs. Mixed: CMDB. Worst-acceptable: manual YAML.

Q: Topology heuristic?
A: If it updates within 24 hours of a real architectural change, it's good enough.

Q: Aggressive vs conservative grouping?
A: Aggressive risks merging separate incidents; conservative leaves residual storm. Start conservative.

Q: Co-incidental incidents?
A: The tool may merge two real but unrelated problems. On-call must inspect and split.

Q: Cross-cutting infra failure handling?
A: Synthetic health-check alerts on shared infrastructure (AZ, cache, DNS).

Q: Change correlation in one line?
A: Alerts adjacent to recent deploys / config changes get the change as candidate root cause.

Q: How to wire change events?
A: CI / CD pipeline webhooks, Terraform / Pulumi apply hooks, feature-flag platforms.

Q: Most common organizational anti-pattern?
A: Buying AIOps to fix bad alerting instead of doing alert hygiene work.

Q: Trusting the root-cause designation?
A: Always verify before acting. Tools surface candidates; engineers confirm.

Q: Metrics that measure AIOps value?
A: Incidents per day vs alerts per day, mean time to acknowledge, engineer pages per week, false-merge and missed-incident rates.

Q: First step for a team starting from zero?
A: Audit alert hygiene. Standardize service names, ownership tags, severity. Then enable correlation in the platform you already pay for.

These are answers an AIOps-fluent platform / SRE engineer should give without preparation.`,
      },
    ],
    references: [
      'https://www.pagerduty.com/platform/aiops/',
      'https://www.bigpanda.io/our-product/',
      'https://docs.datadoghq.com/service_management/incident_management/',
      'https://www.dynatrace.com/platform/artificial-intelligence/',
      'https://www.servicenow.com/products/it-operations-management.html',
      'https://prometheus.io/docs/alerting/latest/alertmanager/',
    ],
  },

  {
    id: 'incident-rca-ml',
    title: 'ML-Assisted Incident RCA',
    icon: 'zap',
    color: '#d946ef',
    questions: 5,
    description: 'Tools that surface candidate root causes during incidents — pattern matching to past incidents, change correlation, dimension surfacing, LLM-based summarization. Honest read on what works (correlation finders, runbook search) versus what is overclaimed marketing (true causal RCA). The engineer is still doing the actual root-cause reasoning.',
    visualizations: [
      {
        title: 'What ML-assisted RCA actually does, and the disciplined use',
        description: `"Root cause analysis" is the most overclaimed phrase in AIOps. The tools labeled RCA are correlation-finders, dimension-surfacers, and change-correlators. They are useful — they accelerate human RCA — but they do not prove causation, and treating their output as the answer is the most common failure mode.

Capability 1: pattern matching to past incidents. When an incident is declared, search past incident records for similar fingerprints. How: similarity over (alert pattern, affected services, error patterns, time-of-day, recent deploys). Vector embeddings of incident summaries (post LLM era) plus structured fingerprints. Tools: PagerDuty AIOps incident similarity, BigPanda pattern matching, FireHydrant / incident.io similar-incident search.

Capability 2: change correlation. Surface deploys, config changes, infrastructure changes, and feature-flag flips that happened in the temporal window before the incident. How: ingests change events from CI / CD, Terraform / Pulumi, feature-flag platforms, and config management. Tools: Datadog Watchdog Insights, Dynatrace Davis change correlation, PagerDuty AIOps change events, ServiceNow ITOM.

Capability 3: dimension surfacing (the "what is different" pattern). Given a slow / failing population, identify dimensions where the failing population differs from the healthy baseline. "5% of requests are failing — they all have user_agent=X and region=eu-west-1 and feature_flag=Y enabled". How: chi-squared, KL-divergence, or similar comparison across high-cardinality dimensions. Tools: Honeycomb BubbleUp (canonical example), Datadog APM dimensional analysis, Lightstep / ServiceNow Cloud Observability.

Capability 4: causal graph reasoning (Dynatrace-style). Build a real-time topology graph annotated with metric / log anomalies; reason over the graph to find candidate root nodes. How: Dynatrace Smartscape continuously updates the graph from OneAgent observations; the Davis engine traverses upstream from each anomaly looking for the source.

Capability 5: LLM-based incident summarization and runbook chat (2024-2026 wave). Generate human-readable incident summaries from raw alert / log streams. Answer questions about past incidents and runbooks via chat. How: LLM (Claude, GPT-4 family) reads alert payloads, recent log samples, runbook documents. RAG over the org's runbook corpus. Tools: Datadog Bits AI, PagerDuty AIOps incident summarization, ServiceNow Now Assist, New Relic AI assistant.

Where they work and fail:

Pattern matching: works on organizations with 12+ months of incident records and consistent post-mortem hygiene. Fails on novel incidents; tool surfaces closest match even if poor.

Change correlation: works when there's one recent change in the affected service. Fails on slow-burn issues, infrastructure-layer causes invisible to application change feeds, second-order effects.

Dimension surfacing: works on high-cardinality observability data with rich attributes. Fails on low-cardinality data or environments where the relevant dimension isn't instrumented.

Causal graph reasoning: works on monolithic single-vendor APM coverage. Fails on gaps in topology coverage, cross-vendor environments, infrastructure-layer issues.

LLM summarization: works for incident summaries, runbook search, simple metric queries. Fails on open-ended diagnosis — produces confident-sounding plausible answers that may be wrong.

The honest summary: tools surface candidates. The engineer reads, picks the most likely 1-2 to investigate, validates by checking logs / running queries / talking to humans, confirms or rejects. The tools save the candidate-selection step. Steps 2-5 are still human work.

Why "RCA" is misleading marketing:
- Causation is not correlation.
- Multi-cause incidents are common; tools tend to pick one.
- Infrastructure causes are invisible to application APM.
- Recency bias in models.

Pitfalls and disciplined use:

Pitfall 1: trusting the suggested cause without verification. Engineer rolls back deploy X because tool said so; X wasn't the cause. Mitigation: treat output as candidate, not conclusion. Verify with logs / queries before acting.

Pitfall 2: model bias toward recent changes. Tools weighted toward recent events miss slow-burn issues. Mitigation: expand lookback window manually for incidents that started slowly.

Pitfall 3: missing infrastructure-layer causes. Application APM doesn't see AZ degradation, network partitions, noisy neighbors. Mitigation: explicit infrastructure-layer health alerts; manually check infrastructure dashboards during incidents.

Pitfall 4: multi-cause incidents flattened. Real incidents often have 2-3 contributing factors. Tool labels one as "the cause". Mitigation: post-incident review explicitly asks "what other factors contributed".

Pitfall 5: LLM hallucinations in summaries. Mitigation: verify before any external publication. Treat summaries as drafts requiring human edit.

Pitfall 6: pattern matching surfaces poor matches. Mitigation: check actual content of matched incident, not just label.

Pitfall 7: over-reliance leading to skill atrophy. Mitigation: periodic incident drills without RCA-assist tools.

Disciplined use patterns:

Pattern 1: tool-assisted triage, human investigation. Tool surfaces candidates; engineer picks 1-2 to investigate; confirms or rejects.

Pattern 2: change correlation as default first check. When alerted, default first check is "what changed".

Pattern 3: dimension surfacing for unfamiliar patterns. Faced with multi-dimensional problems, use BubbleUp.

Pattern 4: pattern matching for runbook reuse. Validate match, apply runbook for recurring issues.

Pattern 5: LLM summary for external communication, with human edit.

What to instrument for RCA-assist tools to work well: service-tagged golden signals, high-cardinality request attributes, change events flowing in, topology data, consistent past incident records.

The deeper point. ML-assisted RCA is best framed as "candidate surfacing" or "RCA acceleration", not "root cause analysis". The framing matters as much as the tool.`,
        image: '/diagrams/devops/z4-incident-rca.png',
      },
      {
        title: 'Quick-fire interview answers — Incident RCA with ML.',
        question: 'Quick-fire interview answers — Incident RCA with ML.',
        answer: `Rapid-fire facts.

Q: What does ML-assisted RCA actually do?
A: Surfaces candidate root causes — past similar incidents, recent changes, differing dimensions, upstream anomalies, plausible narratives. The engineer still confirms or rejects.

Q: Why is "RCA" misleading marketing?
A: The tools find correlations, not causation. The label oversells; "root-cause assistance" or "candidate surfacing" is closer.

Q: Pattern matching to past incidents?
A: When an incident is declared, search past incident records for similar fingerprints; surface the most similar with its runbook.

Q: Change correlation in one line?
A: Surface deploys, config changes, infra changes, and feature-flag flips that happened in the temporal window before the incident.

Q: Most reliable RCA signal?
A: Recent change events temporally adjacent to anomaly onset.

Q: Datadog Watchdog Insights?
A: Surfaces candidate cause for a Watchdog anomaly — typically a recent deploy or config change with strong temporal correlation.

Q: Dynatrace Davis problem detection?
A: Builds a "Problem" with candidate root entity by traversing the Smartscape topology graph upstream from anomalies.

Q: Honeycomb BubbleUp?
A: Given a slow / failing population, surface dimensions where the bad population differs from the baseline.

Q: PagerDuty AIOps RCA features?
A: Change correlation plus similar-incident matching plus LLM-based incident summarization.

Q: Datadog Bits AI?
A: Natural-language interface over Datadog telemetry — summarize incidents, query metrics, search runbooks.

Q: ServiceNow Now Assist?
A: LLM layer over ServiceNow ITOM. Summarizes incidents, suggests remediation.

Q: When does LLM summarization work?
A: Incident summaries, runbook search, simple metric queries.

Q: When does it fail?
A: Open-ended diagnosis — produces confident-sounding plausible answers that may be wrong.

Q: Most common RCA-assist failure mode?
A: Trusting the suggested cause without verification.

Q: Model bias toward recent changes?
A: Tools weighted toward recent events miss slow-burn issues.

Q: Missing infrastructure-layer causes?
A: Application APM does not see AZ degradation, network partitions, noisy neighbors.

Q: Multi-cause incidents and ML?
A: Tool labels one as "the cause"; real incident has multiple contributors.

Q: LLM hallucination in summaries?
A: Verify before any external publication. Treat as drafts requiring engineer edit.

Q: Skill atrophy from over-reliance?
A: Periodic drills without tool assistance keep skills sharp.

Q: Disciplined use pattern 1?
A: Tool-assisted triage, human investigation.

Q: Default first check during an incident?
A: "What changed". Change correlation feed answers fastest.

Q: When to use dimension surfacing?
A: Multi-dimensional problems — "some users see this, others not".

Q: When to use pattern matching?
A: Recurring issue families. Tool surfaces past incident with runbook.

Q: When to use LLM summaries?
A: Status-page updates, stakeholder communications, post-incident timeline drafts. Always with engineer edit.

Q: What instrumentation makes RCA-assist work?
A: Service-tagged golden signals, high-cardinality request attributes, change events flowing in, topology data, consistent past incident records.

Q: Most useful RCA-assist capability today?
A: Change correlation. Single biggest signal-to-noise win.

Q: Biggest mindset shift for engineers using RCA tools?
A: Treat output as candidates to verify, not conclusions to act on.

These are answers an incident-RCA-fluent platform / SRE engineer should give without preparation.`,
      },
    ],
    references: [
      'https://docs.datadoghq.com/watchdog/',
      'https://www.dynatrace.com/platform/artificial-intelligence/',
      'https://docs.honeycomb.io/investigate/bubbleup/',
      'https://www.pagerduty.com/platform/aiops/',
      'https://newrelic.com/platform/applied-intelligence',
      'https://sre.google/workbook/postmortem-culture/',
    ],
  },

  {
    id: 'llm-sre-agents',
    title: 'LLM SRE Agents',
    icon: 'zap',
    color: '#d946ef',
    questions: 5,
    description: 'How LLM-powered agents operate in SRE — autonomous hypothesis-testing loops, hypermodal AI combining predictive and causal reasoning, MCP tool calling over live telemetry, and the observability maturity required before any autonomy is safe. Covers Datadog Bits AI, Dynatrace Davis 2025, and PagerDuty Auto-Pause in depth.',
    visualizations: [
      {
        title: 'How LLM SRE agents work — the hypothesis loop',
        image: '/diagrams/devops/z5-llm-sre-agents.png',
        description: `LLM SRE agents differ from alert-correlation AIOps in one fundamental way: they act in a reasoning loop, not a single inference pass.

The hypothesis-testing loop (Datadog Bits AI SRE model):

Step 1 — Trigger. An incident fires. The agent receives alert payload, affected services, current SLO status, and recent deployments.

Step 2 — Hypothesis generation. The LLM generates 3-5 candidate hypotheses. "Auth service DB pool exhaustion." "Recent deploy at 14:28 changed connection timeout." "Upstream dependency latency spike propagating."

Step 3 — Tool calling. For each hypothesis, the agent selects a tool: query_metrics(service='auth', metric='db.pool.active', window='30m'), get_recent_deploys(service='auth', hours=2), get_traces(service='auth', status='error', limit=100).

Step 4 — Evidence evaluation. The LLM reads tool results and updates hypothesis confidence. If DB pool hits saturation 3 minutes before alert, that hypothesis gains confidence.

Step 5 — Conclusion or next loop. If confidence is high enough, the agent writes a summary. If ambiguous, it generates refined hypotheses and loops. Datadog reports average 2-3 loops before conclusion.

Results: Datadog claims 2x investigation speed and 90% faster root-cause identification versus manual triage. These numbers come from controlled case studies; your mileage depends on observability coverage.

MCP tool integration. Model Context Protocol (MCP) lets the LLM call tools defined by your observability stack — query metrics, fetch logs, look up runbooks, list recent changes — without bespoke function signatures per vendor. Bits AI SRE uses MCP for tool calling in its 2025 architecture.

The key insight: LLM agents are powerful when observability is clean. Poor metric coverage, missing traces, or noisy alerts make the hypothesis loop thrash — the agent generates hypotheses it cannot validate with available tools.`,
      },
      {
        title: 'Dynatrace Davis hypermodal AI — predictive + causal + generative',
        description: `Dynatrace coined "hypermodal AI" in 2024-2025 to describe Davis combining three AI modes in one reasoning pipeline.

Predictive AI. Watchdog-style anomaly detection on metrics and traces. STL seasonal decomposition, baseline forecasting, deviation scoring. Fires when something is statistically unexpected. Davis has access to Smartscape — the real-time topology graph of every entity (host, process, service, request path) and their dependency relationships, auto-discovered and continuously updated.

Causal AI. When predictive AI fires an anomaly, causal AI traverses Smartscape to identify the root entity. Uses fault-tree analysis (borrowed from NASA/FAA avionics reliability methodology). Traces the dependency graph: frontend anomaly → backend service → database. Davis identifies the database as the root entity and marks the frontend anomaly as a downstream symptom. This is deterministic graph traversal, not ML inference — which is why Dynatrace calls it "deterministic causal AI."

Generative AI (Davis Copilot). LLM layer that reads the causal analysis output and writes natural-language explanations, draft runbook steps, and answers natural-language observability queries ("show me all services with error rate > 1% in the last hour"). Grail — the MPP OLAP query engine — powers sub-second queries over terabytes of telemetry that the LLM tool-calls.

How the three modes combine: Predictive detects → Causal traces to root entity → Generative explains and surfaces actions. The architecture means Dynatrace can say "Auth DB pool exhaustion (96% confidence, root entity: auth-db-prod-01, 3 affected services downstream)" rather than "something is wrong with auth."

Competitive positioning. Dynatrace differentiates on the causal AI + Smartscape combination. Datadog Bits AI is stronger on the agentic loop and MCP extensibility. Neither vendor consistently beats the other across all workloads; choice depends on topology complexity (Dynatrace) vs tool extensibility (Datadog).`,
      },
      {
        title: 'PagerDuty, New Relic, ServiceNow — how other vendors implement LLM SRE',
        description: `PagerDuty AIOps + Auto-Pause. PagerDuty's LLM layer focuses on incident lifecycle, not detection. Incident Summarization: GPT-4 family reads the incident event stream (alerts, ack notes, responder messages) and writes a rolling plain-English summary visible to all stakeholders. Auto-Pause Incidents: when PagerDuty detects that an alert has a high probability of auto-resolving (based on historical patterns for that alert type), it pauses incident creation for 2-15 minutes. If the alert clears, no page was sent. Reduces false-positive pages by up to 30% without changing alert thresholds. Runbook Automation: Rundeck (acquired 2020) integration allows PagerDuty to trigger runbook steps from an incident — restart service, clear cache, scale group — with full audit trail.

New Relic AI. Natural-language query interface over NRQL (New Relic Query Language). "Show me services with p99 latency above 500ms over the last 4 hours" → auto-generated NRQL → rendered chart. Anomaly explanation in plain English attached to Applied Intelligence findings. Particularly strong at multi-signal correlation (APM + infrastructure + browser + synthetics in one interface).

ServiceNow Now Assist for ITOM. LLM layer over the CMDB and ITSM workflow. Reads alert → looks up affected CI in CMDB → finds change records for that CI from the last 48 hours → surfaces probable change-caused incident. Generates draft incident ticket with affected CIs, related changes, and suggested assignment group. Strong in enterprises where ITSM is the source of truth; weaker in cloud-native environments where CMDB coverage is incomplete.

Splunk AI Assistant. Natural-language SPL (Splunk Processing Language) generation. Anomaly summary cards in Splunk Observability Cloud. Primarily augments existing Splunk workflows rather than adding autonomous incident management.

Common pattern across all vendors: LLM layers are strongest at summarization and search. Autonomous remediation remains limited to low-risk, well-defined actions (restart pod, clear cache) with mandatory human approval for anything destructive.`,
      },
      {
        title: 'When to trust LLM SRE agents — and when not to',
        description: `LLM SRE agents produce confident-sounding outputs whether or not those outputs are correct. Managing that risk is the core operational challenge.

What agents do well:
Summarization. Incident timelines, stakeholder updates, postmortem drafts. The LLM reads structured event data and writes prose. Low hallucination risk because the source data is structured.
Runbook search. "Find the runbook for auth DB connection pool exhaustion." RAG over runbook documents with semantic search. Works when runbooks are maintained.
Query generation. Natural-language to NRQL / PromQL / SPL. Saves time, easy to verify by reading the generated query before running it.
Alert grouping context. Explaining why two alerts were correlated — what topology relationship connects them.

What agents do poorly:
Novel incidents. A new failure mode with no historical precedent produces hypothesis loops that thrash or produce plausible-sounding but wrong hypotheses. The agent cannot signal "I don't know."
Sparse observability. If the affected service has no traces, the agent fills gaps with inference. That inference looks like evidence if you are not watching carefully.
Causality vs correlation. Agents surface correlations. They cannot distinguish "A caused B" from "A and B share a common cause" without explicit causal model tooling (DoWhy, causal graphs).
Autonomous remediation. Agents that can execute actions (restart service, roll back deploy) need strict guardrails: change management approval, blast-radius estimation, rollback readiness. Most teams should require human approval for any action that modifies production state.

Maturity prerequisites before enabling any autonomous agent action:
1. Full observability coverage for affected services (metrics, traces, logs).
2. Validated runbooks for the action being automated.
3. Rollback plan tested, not just documented.
4. Approval workflow for first N executions of each action type.
5. Alert hygiene — noisy alert input produces garbage hypothesis output.`,
      },
      {
        title: 'Quick-fire interview answers — LLM SRE Agents.',
        question: 'Quick-fire interview answers — LLM SRE Agents.',
        description: `Q: What is Datadog Bits AI SRE?
A: LLM agent that runs hypothesis-testing loops during incidents — generates candidate root causes, calls observability tools (metrics/traces/deploys) via MCP, evaluates evidence, and iterates until confident or escalates.

Q: What is hypermodal AI (Dynatrace)?
A: Three-mode pipeline — predictive AI detects anomalies, causal AI traverses Smartscape topology to find root entity (deterministic, not ML), generative AI writes explanation and surfaces actions.

Q: What is Smartscape?
A: Dynatrace's real-time topology graph of every monitored entity and dependency, auto-discovered. Used by Davis causal AI to trace anomalies to root entities.

Q: What is MCP in the AIOps context?
A: Model Context Protocol — standard for LLM tool calling. Lets AIOps agents call observability APIs (query metrics, fetch logs, list deploys) without bespoke integration per vendor.

Q: PagerDuty Auto-Pause Incidents?
A: Pauses incident creation 2-15 min for alerts likely to auto-resolve based on historical patterns. Reduces false-positive pages without changing alert thresholds.

Q: What does a Dynatrace Davis finding look like?
A: "Auth DB pool exhaustion (96% confidence, root entity: auth-db-prod-01, 3 affected downstream services)." Deterministic causal graph traversal, not ML inference.

Q: What prerequisite matters most before enabling autonomous remediation?
A: Full observability coverage for the affected service. Agents without evidence produce confident-wrong hypotheses; autonomous actions on wrong hypotheses cause outages.

Q: LLM agents and causality?
A: Agents surface correlations, not causes. "A and B happened together" is not "A caused B." Causal reasoning requires explicit causal models (DoWhy, backdoor criterion, causal graphs) layered on top.

Q: Splunk AI Assistant vs Datadog Bits AI?
A: Splunk augments existing workflows (SPL generation, anomaly summary). Bits AI is an autonomous investigation agent. Different maturity tier — Bits AI is significantly more autonomous.

Q: When should you NOT use LLM SRE agents?
A: Novel failure modes with no historical data, sparse observability coverage, or any remediation action you have not tested rollback for. Agents cannot signal uncertainty — they always produce output.`,
      },
    ],
    references: [
      'https://www.datadoghq.com/blog/bits-ai-sre-deeper-reasoning/',
      'https://www.datadoghq.com/blog/building-bits-ai-sre/',
      'https://docs.dynatrace.com/docs/dynatrace-intelligence/root-cause-analysis/event-analysis-and-correlation',
      'https://www.pagerduty.com/platform/aiops/',
      'https://newrelic.com/platform/applied-intelligence',
    ],
  },

  {
    id: 'capacity-forecasting-ml',
    title: 'Capacity Forecasting',
    icon: 'zap',
    color: '#d946ef',
    questions: 5,
    description: 'ML approaches to predicting resource needs before they become incidents — Prophet for seasonal decomposition, ARIMA/SARIMA for stationary series, STL residual forecasting. Covers Netflix Scryer, Uber Argos scale patterns, confidence intervals for pre-scaling decisions, and connecting forecasts to cloud cost optimization.',
    visualizations: [
      {
        title: 'Why static thresholds fail for capacity and what ML replaces them with',
        image: '/diagrams/devops/z6-capacity-forecasting.png',
        description: `Static capacity alerts: "alert when CPU > 80%." The problems:

Reactive by design. The alert fires when capacity is already constrained. By the time an engineer responds, queues are backing up.

No seasonality awareness. A service that peaks every Monday at 9 AM will alert every Monday. The alert carries no information — it is always true on Monday mornings.

No growth awareness. A service growing 20% month-over-month will start breaching static thresholds even with no incidents. The threshold that was correct six months ago is now wrong.

No lead time. "You have 2 hours before this service hits capacity" is a different operational posture than "you are now at capacity."

What ML-based forecasting replaces this with:

Predictive capacity: "Based on historical patterns and current growth trend, this service will hit 80% CPU on Thursday at 14:00." Response time: two days, not two hours.

Seasonal normalization: "This service peaks at 70% CPU every Monday morning. That is normal. Alert when Monday morning CPU exceeds 90% — which is abnormal even for peak."

Confidence intervals: "CPU will reach 75-85% on Thursday (80% confidence interval)." Wider intervals mean more uncertainty — useful for deciding whether to act now or monitor.

Anomaly-adjusted forecast: "Today's traffic is 15% above forecast for this time of day. If the deviation persists, capacity will be exhausted in 4 hours." Combines forecast with live deviation.

The operational shift is from "react to alerts" to "schedule capacity work based on forecasts." Teams that do this well treat capacity as a planned engineering task, not an on-call emergency.`,
      },
      {
        title: 'Prophet — the standard tool for seasonal capacity forecasting',
        description: `Prophet (Meta, open-sourced 2017) is the most widely adopted forecasting library for operational capacity prediction. It decomposes a time series into three components:

Trend: long-term growth or decay. Prophet fits a piecewise linear or logistic growth model. changepoint_prior_scale controls trend flexibility — 0.05-0.5 for services with regime changes (marketing launches, product growth), 0.001-0.01 for stable services.

Seasonality: periodic patterns. Prophet supports multiple seasonality periods simultaneously — daily (business hours), weekly (Monday peak), yearly (holiday traffic). Each is modeled as a Fourier series. fourier_order controls complexity; higher order fits more complex seasonal shapes but risks overfitting. Default: daily=4, weekly=3, yearly=10.

Holidays: one-off events that break seasonality. Explicitly model Black Friday, product launches, maintenance windows. Without holiday modeling, Prophet's trend component absorbs these as changepoints, corrupting future forecasts.

Key parameters for capacity use:
- seasonality_mode: 'additive' when seasonal swings are constant size; 'multiplicative' when swings grow with the trend (common for growing services).
- interval_width: 0.8 or 0.95 — confidence interval for the forecast. Use 0.8 for pre-scaling decisions (act at 80% confidence), 0.95 for cost planning (need high certainty before committing spend).
- growth: 'linear' for most services; 'logistic' for services approaching physical or business limits (storage filling to quota, users approaching plan limit).

Netflix Scryer extends Prophet with weekly periodicity detection and per-hour contamination adjustment for Isolation Forest — cleaning anomalies from training data before Prophet fits the model. This prevents past incidents from corrupting the forecast baseline.`,
      },
      {
        title: 'ARIMA, STL, and when each algorithm is the right choice',
        description: `Algorithm selection for capacity forecasting follows a decision tree:

Is the series stationary (no trend, no seasonality)?
→ Yes: use ARIMA or simple exponential smoothing. ARIMA(p,d,q): p=autoregressive terms (look back p periods), d=differencing order (1 removes trend, 2 removes trend + curvature), q=moving average terms. Auto-ARIMA (pmdarima library) fits p,d,q automatically via AIC minimization.
→ No: proceed to next question.

Is the seasonality strong and regular?
→ Yes, single season: SARIMA (Seasonal ARIMA). SARIMA(p,d,q)(P,D,Q,s) where s is the seasonality period (24 for hourly data with daily seasonality, 7 for daily data with weekly seasonality).
→ Yes, multiple seasons: STL decomposition + ARIMA on residuals. Or Prophet (handles multiple seasonalities natively).
→ Irregular / complex: Prophet with holiday events.

Is the series too short for seasonal fitting (<2 full seasons)?
→ Use simpler model (exponential smoothing, simple moving average) and collect more data. Do not fit seasonal models with insufficient data — they overfit to noise.

STL (Seasonal and Trend decomposition using Loess) is particularly useful as a preprocessing step: decompose the series into trend + seasonal + remainder, model the trend component with ARIMA or Prophet, add seasonal component back. This separates the forecasting problem into manageable pieces.

Uber Argos (100M+ metrics scale): uses STL decomposition + ML regression with topology-aware correlation. The topology layer is the key differentiator — Argos knows that CPU on host-A correlates with queue depth on service-B because Argos has the service graph. A single-service capacity model misses these upstream relationships.

Practical guidance: start with Prophet for any metric with daily or weekly seasonality. ARIMA is useful for capacity metrics without seasonality (storage growth, cumulative counters). STL is useful when you want interpretable components rather than a black-box forecast.`,
      },
      {
        title: 'Connecting forecasts to pre-scaling and cloud cost decisions',
        description: `A capacity forecast is only valuable if it drives an action. The connection to operations:

Pre-scaling workflow:
1. Forecast generates: "Service auth-api will need 40 pods by Thursday 14:00 (currently running 28)."
2. Capacity system calculates lead time: ASG warm-up is 8 minutes; Kubernetes node provisioning is 4 minutes for pre-warmed nodes, up to 12 for cold.
3. Action: schedule HPA target increase for Thursday 13:45 — 15 minutes of buffer.
4. Measure: compare actual pod count and CPU at 14:00 against forecast. Feed residual back into model.

Cloud cost intersection:
Overprovisioning costs money. Underprovisioning costs reliability. Forecasting lets you right-size: provision at forecast + safety margin, not at peak-ever.
Reserved instance / committed use discount planning: use 12-month forecast with 80% confidence lower bound to decide committed capacity. Buy committed capacity at the lower bound; cover the upper bound with on-demand. This is a standard FinOps pattern.

Confidence intervals as decision thresholds:
- Forecast upper 80% CI breach expected within 24 hours → alert on-call for manual review.
- Forecast upper 95% CI breach expected within 4 hours → auto-trigger scaling action.
- Forecast median breach expected within 1 hour → page immediately.

Feedback loop. Forecasting without measuring accuracy is decoration. Track MAPE (Mean Absolute Percentage Error) per service per week. A service whose forecast MAPE exceeds 20% needs model retuning — new changepoints, updated seasonality, or different algorithm. The forecast is a live model that degrades as traffic patterns evolve.`,
      },
      {
        title: 'Quick-fire interview answers — Capacity Forecasting.',
        question: 'Quick-fire interview answers — Capacity Forecasting.',
        description: `Q: Why do static capacity thresholds fail?
A: Reactive (fire when capacity is already constrained), seasonality-blind (alert every Monday morning even when normal), and growth-blind (threshold correct six months ago may be wrong now).

Q: What is Prophet?
A: Meta's open-source forecasting library. Decomposes time series into trend + seasonality + holidays using additive or multiplicative combination.

Q: Prophet seasonality_mode: additive vs multiplicative?
A: Additive when seasonal swings are constant size (±100 RPS regardless of baseline). Multiplicative when swings grow with the trend (±10% of current baseline).

Q: changepoint_prior_scale in Prophet?
A: Controls trend flexibility. Low (0.001-0.01) = smooth trend, resists overfitting to transient spikes. High (0.05-0.5) = flexible trend, fits regime changes like product launches.

Q: Netflix Scryer?
A: Prophet-based capacity forecasting for Netflix microservices. Adds weekly periodicity detection and per-hour Isolation Forest contamination adjustment to clean anomalies from training data.

Q: When to use ARIMA vs Prophet?
A: ARIMA for stationary or single-season series without complex holiday patterns. Prophet for multiple seasonal periods, explicit holiday events, or growth modeling.

Q: STL decomposition?
A: Seasonal and Trend decomposition using Loess. Splits series into trend + seasonal + remainder. Useful as preprocessing before ARIMA, or to get interpretable components.

Q: How do confidence intervals connect to scaling decisions?
A: Upper 80% CI breach in 24h → manual review alert. Upper 95% CI breach in 4h → auto-scale trigger. Median breach in 1h → immediate page.

Q: MAPE?
A: Mean Absolute Percentage Error — primary accuracy metric for forecasts. Exceeding 20% per service per week indicates the model needs retuning.

Q: FinOps + capacity forecasting?
A: Use 12-month forecast lower bound for committed use discounts (reserved instances). Cover upper bound variation with on-demand. Committed at lower bound minimizes waste; on-demand covers peaks.`,
      },
    ],
    references: [
      'https://facebook.github.io/prophet/docs/quick_start.html',
      'https://netflixtechblog.com/scryer-netflixs-predictive-auto-scaling-engine-a3f8fc922270',
      'https://www.uber.com/blog/argos-the-monitoring-platform/',
      'https://medium.com/@suhasveil/aiops-on-kubernetes-part-2-building-anomaly-detection-on-top-of-prometheus',
    ],
  },

  {
    id: 'aiops-open-source-diy',
    title: 'Open-Source AIOps',
    icon: 'zap',
    color: '#d946ef',
    questions: 5,
    description: 'Building AIOps capability without vendor lock-in — Prometheus anomaly detector (Fourier + Prophet), Grafana three-band PromQL anomaly detection, Robusta enrichment playbooks for Kubernetes context, DoWhy causal graphs for RCA, and the CCF AIOps challenge reference implementations. Honest read on when DIY is worth the maintenance cost.',
    visualizations: [
      {
        title: 'The open-source AIOps stack — how the pieces fit together',
        image: '/diagrams/devops/z7-aiops-open-source.png',
        description: `A production-capable open-source AIOps stack uses components from three layers:

Collection and storage layer:
Prometheus — metrics collection and TSDB storage. Standard pull-based scrape model; supports push via Pushgateway.
Loki — log aggregation (Grafana Labs). LogQL query language mirrors PromQL idioms.
Tempo — distributed tracing (Grafana Labs). Integrates with Prometheus exemplars for trace-to-metrics correlation.
Alertmanager — alert routing, grouping, inhibition, silencing. Receives firing alerts from Prometheus, routes to PagerDuty / Slack / OpsGenie.

Anomaly detection layer:
Prometheus Anomaly Detector (Red Hat / AICoE) — Python service that runs Fourier or Prophet models against Prometheus metrics and writes anomaly scores back as new Prometheus metrics. Deploys on OpenShift/Kubernetes. Integrates with MLflow for model tracking.
Grafana ML plugin — anomaly detection built into Grafana panels. Uses Holt-Winters seasonal model. Limited customization but zero additional infrastructure.
Custom Python service — Prophet / scikit-learn isolation forest / statsmodels ARIMA deployed as a microservice, exposing results via /metrics endpoint for Prometheus to scrape.

Enrichment and remediation layer:
Robusta (open source, CNCF Sandbox) — Kubernetes-native runbook automation. When Prometheus fires an alert, Robusta playbooks auto-attach context (pod logs, Kubernetes events, resource usage, recent deploys) to the alert before routing to PagerDuty or Slack. Dramatically reduces MTTR by eliminating "let me go pull the logs" from the incident workflow.

Causal inference layer:
DoWhy (Microsoft Research, open source) — Python library for causal reasoning. Build a structural causal model of your service graph, then use it to answer "did deploy X cause latency spike Y?" using Pearl's backdoor criterion and do-calculus.

The stack is powerful but requires operational ownership. Each component needs upgrades, tuning, and maintenance. This is the core tradeoff versus vendor AIOps.`,
      },
      {
        title: 'Grafana PromQL three-band anomaly detection — how to implement it',
        description: `Grafana's approach to anomaly detection uses recording rules to compute three bands around a metric, then alerts when the metric exits the outer band. No ML framework required — pure PromQL.

The three bands:

Band 1 — Short-term (current behavior): stddev_over_time(metric[26h]) centered on the rolling mean. Captures recent normal variance.

Band 2 — Long-term seasonal (yesterday-same-time): metric offset 23h30m. Captures the "what was this metric doing at this time yesterday" baseline. The 30-minute offset handles clock drift and avoids exact alignment artifacts.

Band 3 — Margin band (minimum width guarantee): max(short_band, long_band, min_width). Ensures the band never collapses to zero on flat metrics (which would make every tiny fluctuation an anomaly).

Implementation via recording rules (add to prometheus/rules.yml):

\`\`\`yaml
groups:
  - name: anomaly_bands
    interval: 5m
    rules:
      - record: job:http_request_rate:short_band
        expr: stddev_over_time(http_requests_total[26h])
      - record: job:http_request_rate:long_band
        expr: http_requests_total offset 23h30m
      - record: job:http_request_rate:upper_band
        expr: |
          job:http_request_rate:long_band
          + greatest(job:http_request_rate:short_band, 0.1)
\`\`\`

Alert rule: fire when metric > upper_band for > 10m.

Advantages: no external ML service, no model training, no drift, works with any Prometheus metric. Disadvantages: only works for metrics with stable daily seasonality; misses weekly patterns; no multivariate correlation.

The GitHub repository grafana/promql-anomaly-detection contains production-ready recording rule templates for common patterns.`,
      },
      {
        title: 'Robusta — Kubernetes alert enrichment in practice',
        description: `Robusta solves a specific high-value problem: when PagerDuty or Slack receives a Kubernetes alert, it contains almost no context. The on-call engineer's first five minutes are always "let me pull the logs, let me check events, let me look at resource usage." Robusta automates those five minutes.

How it works:
Robusta installs as a Helm chart in your cluster. It watches Prometheus Alertmanager webhooks. When an alert fires, Robusta matches it against a playbook — a Python function that defines what context to gather and where to send it.

Example playbook for OOMKilled pod:

\`\`\`python
@action
def oomkilled_enricher(event: PodEvent, action_params: OOMKilledParams):
    pod = event.get_pod()
    event.add_enrichment([
        LogEnricher(pod, tail_lines=50),           # last 50 log lines
        KubernetesFieldEnricher(pod),               # resource requests/limits
        NodeEnricher(pod.spec.nodeName),            # node memory pressure
        PrometheusEnricher(                          # memory usage trend
            query=f'container_memory_working_set_bytes{{pod="{pod.name}"}}'
        ),
    ])
    event.add_finding(Finding(
        title=f"OOMKilled: {pod.name}",
        severity=FindingSeverity.HIGH,
    ))
\`\`\`yaml

Robusta sinks: Slack (formatted blocks with collapsible log sections), PagerDuty (enrichment as note on the incident), Datadog (event with enrichment payload), OpsGenie.

Built-in playbooks cover: CrashLoopBackOff, OOMKilled, PVC filling, HPA max replicas reached, node pressure, deployment rollout failure. Custom playbooks cover anything reachable from the Kubernetes API.

The result: when PagerDuty fires, the engineer already has logs, events, and resource graphs attached. Investigation starts from evidence, not from "first, let me look at what's happening."`,
      },
      {
        title: 'DoWhy and causal inference for root cause analysis',
        description: `Standard ML correlation-based RCA answers "what happened at the same time." Causal inference answers "what caused what." The difference matters when multiple things change simultaneously — common during incidents.

DoWhy (Microsoft Research, 2018, open source) implements Pearl's causal inference framework for Python. Key concepts:

Structural Causal Model (SCM): a directed acyclic graph (DAG) where nodes are variables and edges represent causal relationships. "Deploy → latency spike → error rate increase." You define the DAG; DoWhy uses it to answer causal questions.

Backdoor criterion: a method to identify confounders — variables that cause both the treatment and the outcome, creating spurious correlation. Example: both CPU load and error rate increase during traffic spikes. Without controlling for traffic, CPU looks like it causes errors. Backdoor criterion identifies traffic as a confounder and removes that path from the analysis.

Do-calculus (Pearl): formal language for interventional queries. "What would error rate be if I set deploy=true, holding all else constant?" Written as P(error_rate | do(deploy=true)). This is fundamentally different from "what is P(error_rate | deploy=true)" — the latter is conditional on observing a deploy; the former simulates what happens if you force a deploy.

Production use: Alibaba OWL combines Drain3 log templating with Granger causality testing + backdoor criterion validation, achieving 65-75% top-1 RCA accuracy on production incidents without requiring ground-truth labels.

Graphical Causal Models (GCM, DoWhy 0.9+): assign causal mechanisms to each node, enabling counterfactual simulation. "If the auth service had not been deployed at 14:28, what would the error rate have been?" Run the SCM forward without the deploy; compare to observed. This is the most direct form of incident counterfactual analysis available in open-source tooling.

Limitations: DoWhy requires a known causal graph. In practice, the graph is partially known (we know our service dependencies) and partially assumed. Incorrect graph structure produces incorrect causal estimates. Graph learning (PC algorithm, FCI algorithm, LiNGAM) can assist but adds complexity.`,
      },
      {
        title: 'Quick-fire interview answers — Open-Source AIOps.',
        question: 'Quick-fire interview answers — Open-Source AIOps.',
        description: `Q: Core open-source AIOps stack components?
A: Collection: Prometheus + Loki + Tempo. Anomaly detection: Prometheus Anomaly Detector or custom Python service. Enrichment: Robusta. Causal analysis: DoWhy. Alerting: Alertmanager → PagerDuty / Slack.

Q: Prometheus Anomaly Detector?
A: Red Hat / AICoE Python service. Runs Fourier or Prophet models against Prometheus metrics, writes anomaly scores back as new Prometheus metrics. Integrates with MLflow. Deploys on OpenShift/Kubernetes.

Q: Grafana three-band anomaly detection?
A: Short-term band (26h stddev), long-term band (metric offset 23h30m for yesterday-same-time), margin band (minimum width). Pure PromQL recording rules — no ML framework.

Q: What does Robusta do?
A: Kubernetes alert enrichment. When Prometheus fires an alert, Robusta playbooks auto-attach pod logs, Kubernetes events, and resource graphs before routing to PagerDuty or Slack. Eliminates the first 5 minutes of "let me pull context."

Q: DoWhy vs standard correlation-based RCA?
A: Correlation: "A and B happened together." DoWhy: "A caused B (holding confounders constant)." DoWhy uses Pearl's backdoor criterion to remove confounder paths from the causal estimate.

Q: What is the backdoor criterion?
A: Method to identify confounders that create spurious correlations. Controls for variables that causally precede both treatment and outcome, removing the non-causal path.

Q: Do-calculus?
A: Pearl's formal language for interventional queries. P(Y | do(X=x)) — "what would Y be if I force X to x" — differs from P(Y | X=x) which is conditional on observing X=x.

Q: When is DIY AIOps worth the cost?
A: When vendor pricing is prohibitive, when your metrics have non-standard semantics vendors don't understand, or when compliance/data-residency requirements prevent sending telemetry to SaaS.

Q: When is DIY AIOps NOT worth it?
A: When the team lacks Python and ML skills to maintain models, when alert tuning will require ongoing effort you cannot staff, or when vendor AIOps is already bundled with your APM (e.g., Datadog Watchdog with an existing Datadog contract).

Q: CCF AIOps Challenge?
A: Cloud Computing Foundation annual AIOps competition. 2024 track focused on log-based anomaly detection and root cause localization. Reference implementations available on GitHub with real production datasets.`,
      },
    ],
    references: [
      'https://github.com/AICoE/prometheus-anomaly-detector',
      'https://github.com/grafana/promql-anomaly-detection',
      'https://docs.robusta.dev/master/playbook-reference/index.html',
      'https://microsoft.github.io/dowhy/',
      'https://grafana.com/blog/how-to-use-prometheus-to-efficiently-detect-anomalies-at-scale/',
    ],
  },

  {
    id: 'chaos-engineering-observability',
    title: 'Chaos + Observability',
    icon: 'zap',
    color: '#d946ef',
    questions: 5,
    description: 'How chaos engineering and AIOps intersect — steady-state hypothesis definition, using AIOps to validate that fault injection produces expected alert groups, AI-guided experiment selection, Chaos Engineering 2.0 with service-mesh-native fault injection and policy-as-code gates. When chaos is premature and observability must come first.',
    visualizations: [
      {
        title: 'Chaos Engineering fundamentals — the hypothesis loop',
        image: '/diagrams/devops/z8-chaos-observability.png',
        description: `Chaos Engineering is the discipline of deliberately injecting failures into a system to find weaknesses before they cause production incidents. The Netflix Chaos Monkey (2011) popularized the concept; the practice has since formalized into a structured experimental method.

The chaos experiment loop:

Step 1 — Define steady state. Identify a measurable output that represents normal system behavior. "p99 latency < 200ms, error rate < 0.1%, throughput > 1000 RPS." Steady state must be observable — if you cannot measure it, you cannot know whether chaos affected it.

Step 2 — Hypothesize. "We believe the system maintains steady state if we terminate one auth service pod." The hypothesis is falsifiable: either steady state holds, or it does not.

Step 3 — Inject fault. Terminate the pod, inject network latency, corrupt a dependency response, exhaust memory. Start with a small blast radius — one pod, one AZ, 10% of traffic.

Step 4 — Measure. Does steady state hold? What changed in metrics, error rates, latency distributions? How long before the system recovered?

Step 5 — Learn and improve. If steady state broke: fix the weakness (add retry logic, improve circuit breaker, fix runbook). If steady state held: increase the blast radius or try a different fault. Document findings in a GameDay report.

The critical prerequisite: observability. A chaos experiment without observability produces one result: "something happened." Metrics, traces, and structured logs must be in place before chaos. Running chaos on a system you cannot observe is not engineering — it is random damage.

Chaos maturity levels:
Level 1: manual fault injection on non-production (GameDays).
Level 2: automated experiments in staging, gated by CI.
Level 3: automated experiments in production, gated by policy-as-code.
Level 4: AI-guided experiment selection based on system topology and coverage gaps.`,
      },
      {
        title: 'AIOps as chaos validation — using correlation to verify fault detection',
        description: `The intersection of chaos engineering and AIOps is bidirectional:

Direction 1 — Chaos validates AIOps. Does your alert correlation system correctly group alerts produced by a known fault? If you terminate a database pod and get 50 alerts, do they correlate to one incident? If your anomaly detection fires, does it fire within the expected time window? Chaos is the ground truth for evaluating AIOps coverage.

Direction 2 — AIOps guides chaos. Which parts of the system have no anomaly detection coverage? Where does alert grouping fail to aggregate related alerts? Topology analysis identifies services with no chaos experiment history — high-value targets for the next GameDay.

Concrete validation workflow:
1. Define expected AIOps behavior for each fault type. "Pod termination on auth-service should produce: (a) anomaly on auth-service error rate within 2 minutes, (b) alert correlation groups all downstream alerts into one incident, (c) PagerDuty fires exactly one page."
2. Inject fault.
3. Measure actual AIOps behavior against expected. Did anomaly detection fire? How fast? Did correlation group correctly? How many pages fired?
4. Gap = places where AIOps failed to detect or correctly group. These are your monitoring improvements backlog.

Chaos Engineering 2.0 adds:
Policy-as-code gates: chaos experiments blocked if SLO burn rate exceeds threshold, if a deployment is in progress, or if on-call is actively triaging an incident.
Service-mesh-native fault injection: Istio fault injection (\`httpFault\` in VirtualService) allows latency and error injection at the proxy layer, without modifying application code and with precise traffic percentage control.
Observability integration requirement: LitmusChaos (CNCF) supports chaos hypothesis validation via ProbeSuccessCriteria — the experiment fails unless Prometheus queries confirm steady state held.`,
      },
      {
        title: 'Tooling — LitmusChaos, Gremlin, Chaos Monkey, Istio fault injection',
        description: `LitmusChaos (CNCF Incubating). Kubernetes-native chaos engineering platform. Chaos experiments defined as ChaosEngine custom resources. Built-in experiments: pod delete, pod CPU hog, pod memory hog, node drain, network latency, disk fill, container kill. Litmus 3.x adds chaos hub for community experiments and ChaosCenter for multi-team governance. Integrates with ArgoCD for GitOps-based chaos delivery. ProbeSuccessCriteria supports Prometheus, HTTP, and cmd probes — experiment is marked failed if steady state breaks.

Gremlin (commercial). SaaS chaos platform with a broad attack library: resource (CPU, memory, disk, IO), network (latency, packet loss, DNS), state (shutdown, process kill, time travel). Gremlin Failure Flags allows application-level fault injection via SDK. Strong on multi-cloud and Windows workloads where Kubernetes-native tools are limited.

Chaos Monkey (Netflix, open source). The original. Randomly terminates EC2 instances in production during business hours. Forces engineers to build resilient services that survive instance loss. Limited fault types compared to LitmusChaos; valuable for the cultural forcing function it creates.

Istio fault injection. VirtualService httpFault spec injects HTTP errors or delays at the Envoy proxy layer. Precise traffic percentage control (inject fault for 10% of traffic to auth-service). No application code changes. Requires Istio service mesh. Useful for testing retry logic and circuit breaker behavior under partial failure.

Chaos Toolkit (open source). Python-based, experiment definitions in JSON/YAML. Drivers for AWS, Kubernetes, Azure, GCP. Integrates with Hypothesis library for property-based testing. Lightweight; good for teams that want to script experiments without a full platform.

Selection guide: Kubernetes-native → LitmusChaos. Multi-cloud / Windows → Gremlin. Network/latency testing with existing Istio mesh → Istio fault injection. Starting simple → Chaos Toolkit or Chaos Monkey.`,
      },
      {
        title: 'GameDay structure and when chaos engineering is premature',
        description: `A GameDay is a structured chaos experiment event. Typical structure for a half-day GameDay:

Pre-GameDay (1 week before):
Define scope: which services, which fault types, which blast radius.
Confirm steady-state metrics are instrumented and dashboards exist.
Define success criteria: "system maintains p99 < 200ms under pod termination for 10 minutes."
Confirm rollback plan and who approves it.
Brief on-call: let them know chaos is running and give a point of contact.

GameDay (4 hours):
Hour 1: review dashboards, confirm steady state is currently met, run a small baseline experiment.
Hours 2-3: inject planned faults, measure, discuss findings in real time.
Hour 4: debrief, document findings, prioritize improvements.

Post-GameDay (1 week after):
File issues for each weakness found.
Prioritize: P0 weaknesses (system failed entirely) get immediate remediation. P1 (degraded but survived) get sprint-level prioritization.
Update chaos coverage map.

When chaos engineering is premature:
The team cannot define steady state. If you do not have SLIs and SLOs, you cannot evaluate whether chaos maintained steady state.
Observability is incomplete. You cannot learn from chaos you cannot observe.
The system has known critical bugs. Fix known issues before discovering new ones.
On-call is overloaded. Chaos that reveals real incidents when the team is already stretched creates compounding harm.
No runbooks exist. Chaos reveals failure modes; runbooks determine response. Without runbooks, chaos just causes unstructured incidents.

A useful readiness test: "If a random pod dies right now, would we know immediately, know which pod, know the impact, and know how to respond?" If no to any of these, fix observability first.`,
      },
      {
        title: 'Quick-fire interview answers — Chaos + Observability.',
        question: 'Quick-fire interview answers — Chaos + Observability.',
        description: `Q: Define Chaos Engineering.
A: Deliberately injecting failures into a system to find weaknesses before they cause production incidents, using the scientific method: hypothesis, inject fault, measure steady state, learn.

Q: What is steady state in Chaos Engineering?
A: A measurable output representing normal behavior — p99 latency < 200ms, error rate < 0.1%, throughput > 1000 RPS. The experiment tests whether steady state holds under fault injection.

Q: Why is observability a prerequisite for chaos?
A: Without observability, you cannot measure whether steady state held. Chaos without measurement is random damage, not engineering.

Q: How does AIOps validate chaos results?
A: Compare expected AIOps behavior (anomaly detection fires within 2 min, alerts correlate to one incident, one page fires) against actual behavior. Gaps = monitoring improvements backlog.

Q: LitmusChaos?
A: CNCF Incubating Kubernetes-native chaos platform. ChaosEngine custom resources, community ChaosHub, ProbeSuccessCriteria for Prometheus-based steady-state validation.

Q: Istio fault injection?
A: VirtualService httpFault spec injects HTTP errors or delays at Envoy proxy layer. No app code changes, precise traffic percentage control, requires Istio.

Q: Chaos Monkey?
A: Netflix tool (2011). Randomly terminates EC2 instances in production during business hours. Original forcing function for resilience engineering.

Q: Policy-as-code chaos gate?
A: Block chaos experiments if SLO burn rate exceeds threshold, deployment in progress, or on-call actively triaging. Prevents chaos from compounding active incidents.

Q: When should you NOT run chaos engineering?
A: No defined SLOs, incomplete observability, known unfixed critical bugs, overloaded on-call, or no runbooks for discovered failure modes.

Q: GameDay debrief outputs?
A: Filed issues per weakness found. P0 (system failed) → immediate remediation. P1 (degraded but survived) → sprint prioritization. Updated chaos coverage map.`,
      },
    ],
    references: [
      'https://litmuschaos.io/',
      'https://principlesofchaos.org/',
      'https://netflixtechblog.com/the-netflix-simian-army-16e57fbab116',
      'https://istio.io/latest/docs/tasks/traffic-management/fault-injection/',
      'https://www.gremlin.com/chaos-engineering/',
    ],
  },

  {
    id: 'kubernetes-native-aiops',
    title: 'Kubernetes AIOps',
    icon: 'zap',
    color: '#d946ef',
    questions: 5,
    description: 'AIOps patterns specific to Kubernetes — kube-state-metrics for cluster health, Prometheus Operator ServiceMonitor pattern, Robusta enrichment playbooks, ML-driven autoscaling (VPA, HPA, KEDA), and cluster-level anomaly detection using pod churn rate, eviction pressure, and topology from owner references.',
    visualizations: [
      {
        title: 'Kubernetes observability foundation — kube-state-metrics and Prometheus Operator',
        image: '/diagrams/devops/z9-k8s-aiops.png',
        description: `Kubernetes-native AIOps builds on two observability primitives:

kube-state-metrics (KSM). A service that watches the Kubernetes API and exposes object state as Prometheus metrics. Unlike cAdvisor (which measures resource usage), KSM measures Kubernetes object health.

Key KSM metrics for AIOps:
kube_pod_status_phase — current phase of every pod (Running, Pending, Failed, Succeeded). "Count of pods in Failed phase" is a cluster health signal.
kube_pod_container_status_restarts_total — restart count per container. High restart rate = CrashLoopBackOff signal.
kube_deployment_status_replicas_available vs kube_deployment_spec_replicas — gap between desired and available replicas. Persistent gap = unhealthy deployment.
kube_node_status_condition — node Ready/NotReady status. NotReady node = potential cascade.
kube_persistentvolumeclaim_status_phase — PVC Pending or Lost = storage issue.
kube_horizontalpodautoscaler_status_current_replicas vs _spec_max_replicas — HPA at max replicas = scaling pressure.

Prometheus Operator. Kubernetes-native way to manage Prometheus instances. Defines CRDs: Prometheus (deploy Prometheus), ServiceMonitor (auto-discover scrape targets by label selector), PodMonitor (scrape pods directly), AlertmanagerConfig (alerts as code). ServiceMonitor pattern: instead of editing prometheus.yml, add a ServiceMonitor object that matches service labels. Prometheus Operator auto-discovers it and adds the scrape config.

The two together: KSM exposes cluster state as metrics; Prometheus Operator collects them with zero manual config. This is the foundation all Kubernetes-native AIOps tools build on.`,
      },
      {
        title: 'Feature engineering for Kubernetes anomaly detection',
        description: `Raw Kubernetes metrics require feature engineering before ML models can use them effectively.

Pod churn rate: rate(kube_pod_created_total[10m]) / count(kube_pod_info). High churn relative to cluster size indicates repeated pod crashes and restarts — CrashLoopBackOff or eviction storms. A sudden spike in churn rate is a leading indicator of cluster instability.

Eviction pressure: kube_node_status_condition{condition="MemoryPressure"} or kube_node_status_condition{condition="DiskPressure"}. Eviction pressure on multiple nodes simultaneously indicates a cluster-wide resource issue, not a single workload problem.

OOM kill rate: container_oom_events_total per namespace per hour. Sustained OOM kills in a namespace indicate memory limit tuning problems or memory leaks.

API server latency: apiserver_request_duration_seconds_bucket. Elevated API server latency affects control plane operations — HPA decisions, rolling deployments, admission webhooks. Often a leading indicator of cluster overload.

Pending pod duration: (kube_pod_status_scheduled_time - kube_pod_created_time) where condition != Scheduled. Pods stuck in Pending indicate scheduling failures — insufficient node resources, failed PV provisioning, or node selector mismatches.

Image pull failure rate: rate(kubelet_image_pull_duration_seconds_count{result="pull_failed"}[5m]). Elevated pull failures indicate registry connectivity issues or credential problems.

Topology from owner references: kube-state-metrics exposes kube_pod_owner (linking pods to ReplicaSets to Deployments), kube_replicaset_owner, kube_job_owner. This owner reference chain is the Kubernetes equivalent of a service topology graph — it allows anomaly detection to distinguish "3 pods of deployment X restarted" (deployment issue) from "3 pods across 3 deployments restarted" (node issue).

Feature matrix for ML: combine these signals into a per-namespace or per-deployment feature vector. Time-series clustering on this vector identifies namespace behavior patterns and anomalies.`,
      },
      {
        title: 'ML-driven autoscaling — HPA, VPA, KEDA, and AI-native approaches',
        description: `Kubernetes offers three native autoscaling mechanisms, each with different ML integration points:

HPA (Horizontal Pod Autoscaler). Scales pod replica count based on metrics. Standard: CPU/memory utilization. Custom metrics (via metrics-server + custom-metrics-apiserver): RPS, queue depth, latency. Predictive HPA: KEDA + Prophet-based custom scaler can pre-scale before load arrives based on forecasted RPS. Limitations: CPU-based HPA reacts to load, not predicts it; minimum 15-second reaction time; cannot scale to zero (use KEDA for that).

VPA (Vertical Pod Autoscaler). Adjusts resource requests/limits for pods based on observed usage. VPA recommendation mode: watches usage, produces right-sizing recommendations without applying them. VPA auto mode: applies recommendations (requires pod restart). Useful for: right-sizing batch jobs that have predictable resource patterns; reducing resource waste from overprovisioned services. Conflict note: VPA and HPA on the same metric (CPU) conflict. Use VPA for memory and HPA for CPU, or use VPA in recommendation-only mode.

KEDA (Kubernetes Event-Driven Autoscaler). Scales deployments (including to zero) based on external event sources: Kafka lag, RabbitMQ queue depth, AWS SQS depth, Prometheus queries, HTTP request rate, Cron (time-based). Key for AIOps: KEDA + Prometheus scaler can trigger scaling on any custom metric, including ML-computed anomaly scores or Prophet forecasts. "Scale up 2 hours before Monday morning traffic peak" expressed as a Cron trigger + HPA min override.

AI-native approaches (2025 era):
Kepler (CNCF): measures per-pod energy consumption. Energy-aware autoscaling — consolidate workloads on fewer nodes during off-peak to reduce carbon footprint.
OpenCost: real-time cloud cost attribution per pod. Feed into autoscaling decisions: "scale down this dev environment if cost > $50/day and no commits in 8 hours."
AIOPS-native HPA (Datadog, Dynatrace): proprietary implementations that scale based on predicted future load, not current observed load.`,
      },
      {
        title: 'Cluster-level anomaly detection and Robusta playbooks in practice',
        description: `Cluster-level anomaly detection operates at a different granularity than service-level. The goal is detecting problems that affect multiple services simultaneously — node failures, control-plane degradation, network partition.

Cluster-level signals to monitor:
Node Ready ratio: count(kube_node_status_condition{condition="Ready",status="true"}) / count(kube_node_info). Drop below 0.9 = more than 10% of nodes unhealthy.
Namespace resource saturation: sum by(namespace)(kube_pod_container_resource_requests{resource="cpu"}) / sum(kube_node_status_allocatable{resource="cpu"}). Cluster-wide CPU request saturation above 80% = scheduling pressure incoming.
Control plane health: etcd_server_is_leader, apiserver_current_inflight_requests, scheduler_pending_pods_count.
Pod scheduling failure rate: rate(kube_pod_status_unschedulable[5m]) above threshold.

Anomaly detection approach for cluster signals:
Simple threshold with seasonality: cluster-level metrics have less seasonality than service metrics. Simple zscore or IQR on a 2-week rolling window works for most cluster signals.
Changepoint detection: PELT (Pruned Exact Linear Time) algorithm for detecting abrupt shifts in cluster resource usage. Useful for detecting cluster growth patterns and sudden change events.

Robusta cluster-level playbooks:
Node not ready playbook: when kube_node_status_condition fires NotReady, auto-run kubectl describe node, check system pods on the node, pull kubelet logs, attach to the PagerDuty alert.
HPA maxed out playbook: when HPA reaches max replicas, attach current CPU/memory usage, recent traffic graph, Kubernetes events for the deployment, and a scaling recommendation.
PVC filling playbook: when PVC usage > 80%, attach current usage, growth rate trend (will it fill in 24h?), and list of pods using the PVC.

Integration pattern: Robusta runs as a Deployment in the cluster, subscribes to Alertmanager webhooks, executes playbooks, and sends enriched findings to configured sinks (Slack, PagerDuty, Datadog). Playbooks are Python functions — any Kubernetes API call, Prometheus query, or external API call is possible.`,
      },
      {
        title: 'Quick-fire interview answers — Kubernetes AIOps.',
        question: 'Quick-fire interview answers — Kubernetes AIOps.',
        description: `Q: What does kube-state-metrics expose?
A: Kubernetes object state as Prometheus metrics — pod phases, restart counts, deployment replica gaps, node conditions, PVC status, HPA scaling state.

Q: kube-state-metrics vs cAdvisor?
A: cAdvisor measures resource usage (CPU, memory bytes used). kube-state-metrics measures Kubernetes object health (pod phase, node ready status, deployment desired vs available replicas).

Q: Prometheus Operator ServiceMonitor?
A: CRD that auto-discovers Prometheus scrape targets by Kubernetes label selector. Eliminates manual prometheus.yml editing. Prometheus Operator watches ServiceMonitor objects and auto-configures scrapes.

Q: Pod churn rate?
A: rate(kube_pod_created_total[10m]) / count(kube_pod_info). High relative churn indicates CrashLoopBackOff or eviction storms — leading indicator of cluster instability.

Q: HPA vs VPA vs KEDA?
A: HPA scales pod count based on metrics. VPA adjusts resource requests/limits per pod. KEDA scales to zero and reacts to external event sources (Kafka lag, queue depth, Prometheus query). Don't run VPA and HPA on the same metric.

Q: KEDA + Prophet for predictive scaling?
A: KEDA custom scaler can consume a Prometheus metric exposing a Prophet forecast. Pre-scale before traffic arrives based on predicted load, not current load.

Q: What is Robusta?
A: Kubernetes alert enrichment platform. When Alertmanager fires, Robusta playbooks auto-attach pod logs, Kubernetes events, resource graphs to the alert before routing to PagerDuty or Slack.

Q: Topology from owner references?
A: kube_pod_owner + kube_replicaset_owner + kube_deployment links pods to their workload hierarchy. Lets anomaly detection distinguish "3 pods of one deployment" (deployment issue) from "3 pods across 3 deployments" (node issue).

Q: Kepler?
A: CNCF project measuring per-pod energy consumption. Enables energy/carbon-aware autoscaling — consolidate workloads during off-peak to reduce power usage.

Q: What cluster signal is the best early warning of scheduling failure?
A: kube_pod_status_unschedulable rate increase. Pods stuck Pending due to insufficient node resources, failed PV provisioning, or node selector mismatches — before services degrade.`,
      },
    ],
    references: [
      'https://github.com/kubernetes/kube-state-metrics',
      'https://robusta.dev/',
      'https://keda.sh/',
      'https://prometheus-operator.dev/',
      'https://medium.com/@suhasveil/aiops-on-kubernetes-part-2-building-anomaly-detection-on-top-of-prometheus',
    ],
  },

  {
    id: 'aiops-roi-maturity',
    title: 'AIOps ROI & Maturity',
    icon: 'zap',
    color: '#d946ef',
    questions: 5,
    description: 'How to measure AIOps value and where organizations sit on the maturity curve — Gartner AIOps maturity model, before/after metrics (MTTA, MTTR, false-positive rate, alerts per incident), 138% ROI case study structure, adoption sequencing, and the org readiness checklist. Common failure modes: buying before adoption, skipping alert hygiene, expecting true RCA from ML.',
    visualizations: [
      {
        title: 'AIOps maturity model — five levels from reactive to autonomous',
        image: '/diagrams/devops/z10-aiops-maturity.png',
        description: `Gartner and practitioner communities have converged on a five-level AIOps maturity model. Most organizations are at level 2 when they start an AIOps initiative; level 4 is rare; level 5 is aspirational.

Level 1 — Reactive / Manual. No AIOps tooling. Alerts are individual; on-call manually correlates. MTTR measured in hours. Alert volume is manageable (or engineers are tolerating pain). Readiness to advance: instrument services with Prometheus + structured logging first.

Level 2 — Monitoring + Basic Alerting. APM in place (Datadog, Dynatrace, New Relic). Static thresholds. Some dashboards. Alert volume starting to cause fatigue. No correlation or grouping. Where most teams are when they first consider AIOps.

Level 3 — Alert Correlation and Anomaly Detection. Alert grouping deployed (PagerDuty AIOps, Datadog alert correlation). ML-based anomaly detection on key SLI metrics (replacing some static thresholds). 70-90% noise reduction achievable. MTTA improved by not waking engineers for auto-resolved alerts. Quick wins: most teams reach meaningful ROI here within 3-6 months.

Level 4 — Predictive and Assisted RCA. Capacity forecasting integrated with scaling. ML-assisted RCA surfacing candidate root causes (change correlation, dimension surfacing). LLM-based incident summarization (PagerDuty AIOps, Datadog Bits AI). MTTR improved by reducing investigation time. Most enterprise AIOps programs reach level 4 in 12-18 months with deliberate effort.

Level 5 — Autonomous and Self-Healing. Auto-remediation for well-defined failure modes (restart pod, scale group, roll back deploy) with policy gates. Proactive incident prevention from capacity forecasting. Chaos engineering integrated with AIOps for continuous validation. Achieved only in organizations with mature SRE, full observability coverage, and change management discipline. Estimated < 5% of enterprises as of 2026.`,
      },
      {
        title: 'Measurement framework — the before/after metrics that prove AIOps value',
        description: `AIOps ROI requires measurement. Without baseline and post-implementation metrics, "AIOps improved things" is anecdote. The measurement framework:

Primary metrics (measure these before deploying AIOps, then monthly after):

Alerts per incident. Before alert correlation: one incident = N alerts (N often 50-200 for cascading failures). After correlation: one incident = 1-3 alert groups. Target: 80%+ reduction in alerts-per-incident. How to measure: (total alerts fired) / (total incidents created) over a 30-day window.

MTTA (Mean Time To Acknowledge). Time from first alert to engineer acknowledgment. AIOps reduces this by eliminating duplicate pages and grouping noise. Measure: average time from PagerDuty alert creation to first ack, per 30-day window.

MTTR (Mean Time To Resolve). Time from incident creation to resolution. AIOps assists via faster RCA (LLM summarization, change correlation). Industry benchmark: 40% MTTR reduction is achievable with mature AIOps (Forrester, 2024). Measure: average time from incident creation to resolution, excluding planned maintenance.

False-positive page rate. Pages that auto-resolve without engineer action / total pages. High false-positive rate (> 20%) means engineers are being woken for non-incidents. After AIOps: auto-resolve detection (PagerDuty Auto-Pause) should bring this below 5%. Measure: (pages with no engineer action) / (total pages).

Engineer pages per week per on-call. Direct measure of operational burden. Industry average: 50 alerts/week per SRE; only 2-5% need human intervention (2025 Gartner survey). Target: reduce to < 10 actionable pages per on-call week.

Secondary metrics: time spent on alert triage per incident (reduces with enrichment tools like Robusta), percentage of incidents with automated runbook execution, capacity forecast accuracy (MAPE < 15%).`,
      },
      {
        title: 'The 138% ROI case study structure — and realistic expectations',
        description: `Industry ROI claims for AIOps range from "138% ROI in 6 months" to "50% MTTR reduction" to "99%+ noise suppression." Understanding the structure behind these numbers prevents overpromising.

The 138% ROI framework (Forrester Total Economic Impact methodology):
Benefits:
- Alert noise reduction: (hours/week of manual alert triage) × (reduction %) × (engineer loaded cost/hour). Example: 200 hours/week × 70% reduction × $150/hour = $21,000/week = $1.09M/year.
- MTTR reduction: (major incidents/year) × (average MTTR hours) × (MTTR reduction %) × (cost/hour of downtime). Example: 50 incidents × 4 hours average × 40% reduction × $10,000/hour = $800,000/year.
- On-call attrition reduction: each SRE who leaves due to burnout costs 1.5x annual salary in hiring + ramp. Reducing pages/week reduces attrition risk.
Costs: AIOps platform license, implementation professional services (typically 3-6 months), ongoing model tuning, integration engineering.

Realistic expectations by maturity level:
Level 2→3 (alert correlation + anomaly detection): achievable in 3-6 months. 70-90% alert noise reduction. Measurable MTTA improvement. Clear positive ROI for organizations with > 5 on-call engineers.
Level 3→4 (RCA assistance + forecasting): 6-12 months additional. 20-40% MTTR reduction. Requires observability investment to see benefit.
Level 4→5 (autonomous remediation): 12+ additional months. ROI is real but requires mature change management and runbook discipline first.

Common ROI killers: platform purchased before alert hygiene (garbage in, garbage out), insufficient time for model tuning (anomaly detection takes 4-8 weeks to baseline), evaluating ROI before steady state is reached (first 60 days are calibration, not production).

The honest benchmark: 99%+ noise suppression is achievable — for APM-native tools like Dynatrace or ServiceNow ITOM in well-instrumented environments. "99% noise suppression" in a poorly instrumented environment means "99% of already-low alert volume" — not meaningful.`,
      },
      {
        title: 'Adoption sequencing and organizational readiness',
        description: `The order in which AIOps capabilities are adopted matters as much as which capabilities are adopted. Organizations that skip steps consistently underachieve on ROI.

The recommended sequence:

Step 1: Alert hygiene (prerequisite, not AIOps). Before any ML, reduce alert count by eliminating noisy, redundant, and low-value alerts. Target: every alert that fires should require human attention. A team that fires 200 alerts/week for 5 real incidents has an alerting problem, not an AIOps opportunity.

Step 2: Alert correlation and grouping (first AIOps investment). Deploy PagerDuty AIOps or Datadog alert correlation. Tune grouping rules for 4-6 weeks. Measure alerts-per-incident. This is the highest-ROI first step because it directly reduces on-call burden with minimal model tuning.

Step 3: Anomaly detection on key SLIs. Replace 2-3 static thresholds on critical SLIs with ML-based anomaly detection. Start with one service, one metric. Tune for 4 weeks before expanding. Success criteria: fewer false positives than the static threshold it replaced.

Step 4: Change correlation and assisted RCA. Integrate change event data (deploys, config changes, feature flag flips) with anomaly alerts. "Anomaly started 8 minutes after deploy X" is high-confidence RCA assistance even without ML.

Step 5: LLM-based incident summarization. Add PagerDuty AIOps incident summarization or Datadog Bits AI. Minimal tuning required; benefit is immediate for complex multi-signal incidents.

Step 6: Capacity forecasting (if scaling is a recurring pain point). Deploy Prophet-based forecasting for services that regularly hit capacity surprises.

Step 7: Auto-remediation (only after steps 1-6 are stable). Start with the most well-defined, lowest-risk action (restart pod). Require human approval for first 20 executions. Expand only after runbook is validated and rollback is tested.

Organizational readiness checklist:
SLOs defined and measurable for all critical services.
Alertmanager / PagerDuty configured with routing and escalation.
On-call runbooks exist for top 10 alert types.
Engineering team understands ML model tuning (or has access to someone who does).
Change management process captures all deploys, config changes, and feature flag flips.`,
      },
      {
        title: 'Quick-fire interview answers — AIOps ROI & Maturity.',
        question: 'Quick-fire interview answers — AIOps ROI & Maturity.',
        description: `Q: AIOps maturity level 3?
A: Alert correlation and anomaly detection deployed. 70-90% noise reduction achievable. MTTA improves. Where most teams should target first-year AIOps investment.

Q: What is MTTA?
A: Mean Time To Acknowledge — time from first alert fire to engineer acknowledgment. AIOps reduces by eliminating duplicate pages and grouping noise before routing.

Q: What is a realistic MTTR reduction from AIOps?
A: 40% MTTR reduction is achievable with mature AIOps per Forrester 2024. Requires level 4 maturity: change correlation, LLM-assisted RCA, and alert enrichment all in place.

Q: What is the first AIOps investment?
A: Alert hygiene first (not AIOps itself). Then alert correlation and grouping — highest ROI, lowest tuning complexity, directly reduces on-call burden.

Q: Why do teams fail to see AIOps ROI?
A: Platform purchased before alert hygiene (garbage in, garbage out). Insufficient tuning time (60-day calibration required). ROI measured too early. Autonomous remediation before runbooks are validated.

Q: 99% noise suppression — realistic?
A: For APM-native tools (Dynatrace, ServiceNow ITOM) in well-instrumented environments, yes. For poorly instrumented systems, it means 99% of an already-low base — not meaningful.

Q: What is the last AIOps capability to implement?
A: Auto-remediation. Requires stable alert correlation, anomaly detection, RCA assistance, and validated runbooks in place first. Start with lowest-risk action (pod restart), require human approval for first 20 executions.

Q: 138% ROI — what drives it?
A: Alert noise reduction (hours of manual triage × engineer cost), MTTR reduction (incident hours × downtime cost), and reduced on-call attrition (replacing burned-out SREs costs 1.5x salary).

Q: How many actionable pages per week should a well-tuned AIOps system produce?
A: < 10 actionable pages per on-call week. Industry average before AIOps: 50 alerts/week, only 2-5% require human intervention.

Q: AIOps level 5 — what does it require?
A: Full observability coverage, validated runbooks for each automated action, tested rollback for every action, change management discipline, SRE maturity, and chaos engineering integration for continuous validation. < 5% of enterprises as of 2026.`,
      },
    ],
    references: [
      'https://www.gartner.com/en/information-technology/glossary/aiops-artificial-intelligence-operations',
      'https://www.forrester.com/report/the-total-economic-impact-of-pagerduty-aiops/',
      'https://www.pagerduty.com/platform/aiops/',
      'https://www.datadoghq.com/blog/bits-ai-sre/',
      'https://sre.google/workbook/alerting-on-slos/',
    ],
  },
];
