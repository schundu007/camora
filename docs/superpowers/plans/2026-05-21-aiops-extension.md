# AIOps Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 new AIOps topics to `devopsTopics.js`, expanding the AIOps category from 4 → 10 topics.

**Architecture:** All changes in one file — `apps/camora/src/data/capra/topics/devopsTopics.js`. Six topic objects inserted at line 29917 (before `devops-coding-challenges`). Six category map entries appended after `incident-rca-ml` at line 144.

**Tech Stack:** Plain JavaScript data file, React 19 + Vite 8 (build verification only).

---

## File Map

- **Modify:** `apps/camora/src/data/capra/topics/devopsTopics.js`
  - Lines 141-144: add 6 entries to `devopsTopicCategoryMap`
  - Lines 29917: insert 6 new topic objects before `devops-coding-challenges`

---

### Task 1: Add 6 entries to `devopsTopicCategoryMap`

**Files:**
- Modify: `apps/camora/src/data/capra/topics/devopsTopics.js:144`

- [ ] **Step 1: Add the 6 new topic→category mappings**

In `devopsTopics.js`, find this block (around line 141):

```js
  'aiops-fundamentals':             'aiops',
  'anomaly-detection-ml':           'aiops',
  'alert-correlation-grouping':     'aiops',
  'incident-rca-ml':                'aiops',
```

Replace with:

```js
  'aiops-fundamentals':             'aiops',
  'anomaly-detection-ml':           'aiops',
  'alert-correlation-grouping':     'aiops',
  'incident-rca-ml':                'aiops',
  'llm-sre-agents':                 'aiops',
  'capacity-forecasting-ml':        'aiops',
  'aiops-open-source-diy':          'aiops',
  'chaos-engineering-observability': 'aiops',
  'kubernetes-native-aiops':        'aiops',
  'aiops-roi-maturity':             'aiops',
```

- [ ] **Step 2: Verify the map change**

Run:
```bash
grep -A 14 "'aiops-fundamentals'" apps/camora/src/data/capra/topics/devopsTopics.js | head -14
```

Expected: all 10 aiops entries visible.

---

### Task 2: Write topic — `llm-sre-agents`

**Files:**
- Modify: `apps/camora/src/data/capra/topics/devopsTopics.js:29917` (insert before `devops-coding-challenges`)

- [ ] **Step 1: Insert the `llm-sre-agents` topic object**

Find the line `  {` that starts `devops-coding-challenges` (currently line 29918). Insert immediately before it:

```js
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

```yaml
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
```

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

```python
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
```

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
Service-mesh-native fault injection: Istio fault injection (`httpFault` in VirtualService) allows latency and error injection at the proxy layer, without modifying application code and with precise traffic percentage control.
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
☐ SLOs defined and measurable for all critical services.
☐ Alertmanager / PagerDuty configured with routing and escalation.
☐ On-call runbooks exist for top 10 alert types.
☐ Engineering team understands ML model tuning (or has access to someone who does).
☐ Change management process captures all deploys, config changes, and feature flag flips.`,
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

```

- [ ] **Step 2: Verify the 6 topic IDs exist in the file**

Run:
```bash
grep "id: 'llm-sre-agents'\|id: 'capacity-forecasting-ml'\|id: 'aiops-open-source-diy'\|id: 'chaos-engineering-observability'\|id: 'kubernetes-native-aiops'\|id: 'aiops-roi-maturity'" apps/camora/src/data/capra/topics/devopsTopics.js
```

Expected: 6 lines, one per topic ID.

---

### Task 3: Build verification and commit

**Files:**
- Verify: `apps/camora/src/data/capra/topics/devopsTopics.js`

- [ ] **Step 1: Run Vite build**

```bash
cd apps/camora && npx vite build 2>&1 | tail -20
```

Expected: `✓ built in` with no errors. If syntax error appears, fix the JavaScript in devopsTopics.js (likely a missing comma or unclosed template literal).

- [ ] **Step 2: Confirm AIOps category now has 10 topics**

```bash
grep "'aiops'" apps/camora/src/data/capra/topics/devopsTopics.js | grep -v "id:\|name:\|color:\|icon:"
```

Expected: 10 lines mapping topic IDs to 'aiops'.

- [ ] **Step 3: Pull, commit, push**

```bash
git pull && git add apps/camora/src/data/capra/topics/devopsTopics.js && git commit -m "feat(devops): add 6 AIOps topics — LLM SRE agents, capacity forecasting, open-source, chaos, k8s-native, ROI" && git push
```

---

## Success Criteria

- [ ] `devopsTopicCategoryMap` contains 10 entries mapped to `'aiops'`
- [ ] 6 new topic objects exist with `id`, `title`, `icon: 'zap'`, `color: '#d946ef'`, `questions: 5`
- [ ] Each topic has 4 content visualization blocks + 1 quick-fire Q&A block
- [ ] Each topic has `references` array with 4-5 URLs
- [ ] `npx vite build` passes with no errors
- [ ] Committed and pushed to main
