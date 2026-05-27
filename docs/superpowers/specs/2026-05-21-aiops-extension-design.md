# AIOps Category Extension — Design Spec

**Date:** 2026-05-21  
**File:** `apps/camora/src/data/capra/topics/devopsTopics.js`  
**Scope:** Add 6 new topic entries to the existing AIOps category (currently 4 topics → 10 topics)

---

## Context

The AIOps category was filled on May 5, 2026 with 4 topics (754 lines). On May 21, 2026, parallel research agents compiled 50+ authoritative sources on AIOps (obs 2760, 2763) covering LLM SRE agents, capacity forecasting, open-source tooling, chaos engineering, Kubernetes-native AIOps, and ROI measurement. This spec covers adding 6 new topics using that research.

---

## Topics to Add

### 1. `llm-sre-agents`
**Title:** LLM SRE Agents  
**Focus:** How LLM-powered agents operate in an SRE context — hypothesis-driven investigation loops (Datadog Bits AI), hypermodal AI combining predictive+causal+generative (Dynatrace Davis 2025+), MCP tool integration for live telemetry queries, autonomous vs assisted operational modes, and the organizational maturity required before automation is safe.  
**Key content:** Bits AI 2x speed / 90% faster RCA claims, Dynatrace Smartscape+Grail+Davis stack, PagerDuty auto-pause incidents, New Relic AI assistant, ServiceNow Now Assist. Honest read: LLM agents excel at summarization and runbook search; autonomous remediation requires mature observability + change management discipline first.

### 2. `capacity-forecasting-ml`
**Title:** Capacity Forecasting  
**Focus:** ML approaches to predicting resource needs — Prophet (Meta's open-source, additive trend+seasonality+holidays), ARIMA/SARIMA for stationary series, STL for seasonal decomposition before forecasting, Netflix Scryer weekly-periodicity approach, Uber Argos scale (100M+ metrics). Connects to cloud cost optimization and pre-scaling decisions.  
**Key content:** Prophet parameters (changepoint_prior_scale, seasonality_mode additive vs multiplicative, Fourier order), confidence intervals for capacity planning, multi-service aggregation, alert thresholds from forecasts, feedback loop from actual vs predicted.

### 3. `aiops-open-source-diy`
**Title:** Open-Source AIOps  
**Focus:** Building an AIOps capability without vendor lock-in — Prometheus anomaly detector (Fourier + Prophet, OpenShift/MLflow deployment), Grafana PromQL three-band anomaly approach (short-term stddev, long-term seasonal offset, margin band), Robusta enrichment playbooks for Kubernetes context injection, DoWhy + GCM for causal inference in RCA, CCF AIOps Challenge 2024 reference implementations.  
**Key content:** When DIY is worth it (cost, customization, no vendor) vs when it isn't (maintenance burden, alert fatigue tuning). Stack: Prometheus + Grafana + Alertmanager + Robusta + Python anomaly service.

### 4. `chaos-engineering-observability`
**Title:** Chaos + Observability  
**Focus:** How chaos engineering and AIOps intersect — steady-state hypothesis definition, chaos as observability validation (does your AIOps detect injected faults?), AI-guided experiment selection (LitmusChaos, Chaos Monkey, Gremlin), service-mesh-native fault injection (Istio fault injection + Envoy), policy-as-code chaos gates in CI/CD. Chaos Engineering 2.0 framing.  
**Key content:** Steady-state hypothesis → inject fault → measure → learn loop. Using AIOps correlation to validate that fault injection produces expected alert groups. GameDays structure. When chaos is premature (observability must come first).

### 5. `kubernetes-native-aiops`
**Title:** Kubernetes AIOps  
**Focus:** AIOps patterns specific to Kubernetes — kube-state-metrics for cluster health, Prometheus Operator ServiceMonitor pattern, Robusta enrichment playbooks (auto-attach pod logs + events to PagerDuty alerts), Kepler for energy/carbon-aware autoscaling, VPA vs HPA vs KEDA for ML-driven autoscaling, node anomaly detection (DaemonSet-level vs cluster-level).  
**Key content:** Feature engineering for k8s metrics (pod churn rate, eviction pressure, OOM kill rate, API server latency), per-namespace vs per-cluster anomaly models, topology graph using kube-state-metrics owner references, Robusta sink integrations (Slack, PagerDuty, Datadog).

### 6. `aiops-roi-maturity`
**Title:** AIOps ROI & Maturity  
**Focus:** How to measure AIOps value and where organizations sit on the maturity curve — Gartner AIOps maturity model (levels 1-5), before/after metrics (alerts per incident, MTTA, MTTR, false-positive rate, pages per engineer per week), 138% ROI case study structure, adoption sequencing (alert correlation first, anomaly detection second, RCA assistance third, auto-remediation last and only after the others are stable). Common failure modes: buying before adoption, skipping alert hygiene, expecting RCA from ML.  
**Key content:** Concrete measurement framework, 40% MTTR reduction benchmarks, 99%+ noise suppression achievable range, org readiness checklist (observability maturity, change management, SRE runbooks).

---

## Schema (same as existing 4 topics)

```js
{
  id: '<topic-id>',
  title: '<Title>',
  icon: 'zap',
  color: '#d946ef',
  questions: 5,
  description: '<2-3 sentence summary>',
  visualizations: [
    { title: '...', description: `...` },  // 4-5 blocks, deep narratives
    // ...
    { title: 'Quick-fire interview answers — <Title>.', question: '...', description: `Q/A format` },
  ],
  references: ['url1', 'url2', ...],
}
```

## Category Map Additions

Lines 141-144 (current):
```js
'aiops-fundamentals':             'aiops',
'anomaly-detection-ml':           'aiops',
'alert-correlation-grouping':     'aiops',
'incident-rca-ml':                'aiops',
```

Lines 141-150 (after):
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

---

## Implementation

- **Approach:** Single agent writes all 6 topics in one pass using research from obs 2763/2760
- **File:** `apps/camora/src/data/capra/topics/devopsTopics.js` only
- **Volume:** ~150-200 lines per topic, ~1000 lines total
- **Position:** After `incident-rca-ml` topic (currently ends ~line 29918)
- **No other files changed**

---

## Success Criteria

- 6 new topic IDs appear in `devopsTopicCategoryMap` under `'aiops'`
- 6 new topic objects added to the topics array
- Each topic has: `questions: 5`, 4-5 visualization blocks, quick-fire Q&A block, 2-5 references
- `npx vite build` passes with no errors
- AIOps category shows 10 topics in the UI
