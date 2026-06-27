#!/usr/bin/env python3
"""Generate 16 Graphviz PNG diagrams for AIOps topics — improved quality."""

import graphviz
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'aiops')
os.makedirs(OUT, exist_ok=True)

# ── Color palette ─────────────────────────────────────────────────────────────
C_DETECT   = '#7c2d12'   # Detection / Alert
C_INVEST   = '#1e3a5f'   # Investigation / Analysis
C_DIAG     = '#4c1d95'   # Diagnosis / RCA
C_REMED    = '#14532d'   # Remediation / Action
C_VERIFY   = '#0c4a6e'   # Verification / Check
C_POSTM    = '#374151'   # Post-mortem / Learning
C_LLM      = '#6d28d9'   # LLM / AI layer
C_PLATFORM = '#1e3a5f'   # Platform / Tool

# Cluster bg fills (light tints)
BG_DETECT  = '#fef2f2'
BG_INVEST  = '#eff6ff'
BG_DIAG    = '#f5f3ff'
BG_REMED   = '#f0fdf4'
BG_VERIFY  = '#ecfeff'
BG_POSTM   = '#f9fafb'
BG_LLM     = '#faf5ff'
BG_PLAT    = '#eff6ff'


def base(name, rankdir='LR'):
    return graphviz.Digraph(
        name,
        graph_attr={
            'rankdir': rankdir,
            'bgcolor': 'white',
            'dpi': '200',
            'fontname': 'Helvetica',
            'pad': '0.4',
            'splines': 'spline',
        },
        node_attr={'fontname': 'Helvetica', 'fontsize': '11'},
        edge_attr={'fontname': 'Helvetica', 'fontsize': '9'},
    )


def n(g, name, label, shape='box', style='filled',
      fillcolor=C_INVEST, fontcolor='white', **kw):
    g.node(name, label=label, shape=shape, style=style,
           fillcolor=fillcolor, fontcolor=fontcolor, **kw)


def e(g, src, dst, label='', color='#334155', **kw):
    g.edge(src, dst, label=label, color=color, fontcolor='#334155', **kw)


def render(g, filename):
    g.render(os.path.join(OUT, filename), format='png', cleanup=True)
    print(f'  ✓ {filename}.png')


# ── 1. AgentOps Incident Lifecycle ───────────────────────────────────────────

def gen_agentops_lifecycle():
    g = base('agentops_lifecycle', rankdir='LR')
    g.attr(label='AgentOps Incident Lifecycle', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    # LLM Orchestrator at top
    n(g, 'llm', 'LLM Agent\nOrchestrator', shape='doublecircle',
      fillcolor=C_LLM, fontsize='12')

    # Lifecycle stages
    stages = [
        ('detect',  'Detection\n& Alerting',       C_DETECT),
        ('invest',  'Investigation\n& Triage',      C_INVEST),
        ('diag',    'Diagnosis\n& RCA',             C_DIAG),
        ('remed',   'Remediation\n& Action',        C_REMED),
        ('verify',  'Verification\n& Validation',   C_VERIFY),
        ('postm',   'Post-mortem\n& Learning',      C_POSTM),
    ]

    for name, label, color in stages:
        n(g, name, label, fillcolor=color)

    # Lifecycle chain
    pairs = list(zip(stages, stages[1:]))
    for (a, _, _), (b, _, _) in pairs:
        e(g, a, b)

    # Feedback loop
    e(g, 'postm', 'detect', label='feedback', style='dashed',
      color='#64748b', constraint='false')

    # LLM orchestrates each stage
    for name, _, _ in stages:
        e(g, 'llm', name, style='dashed', color=C_LLM, arrowhead='open')

    render(g, 'agentops-lifecycle')


# ── 2. AIOps Maturity Model ───────────────────────────────────────────────────

def gen_aiops_maturity_model():
    g = base('aiops_maturity_model', rankdir='LR')
    g.attr(label='AIOps Maturity Model (5 Levels)', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    levels = [
        ('l0', 'Level 0\nManual',      '#374151', 'Manual runbooks\nSiloed monitoring\nReactive only'),
        ('l1', 'Level 1\nReactive',    '#7c2d12', 'Alert aggregation\nOn-call rotation\nBasic dashboards'),
        ('l2', 'Level 2\nProactive',   '#92400e', 'Anomaly detection\nCorrelation engine\nSLA tracking'),
        ('l3', 'Level 3\nPredictive',  '#1e3a5f', 'Capacity forecasting\nPredictive alerting\nML-driven RCA'),
        ('l4', 'Level 4\nAutonomous',  '#14532d', 'Self-healing systems\nAuto-remediation\nContinuous learning'),
    ]

    for node_id, title, color, caps in levels:
        label = f'{title}\n─────────\n{caps}'
        n(g, node_id, label, fillcolor=color, fontsize='10')

    for a, b in zip(levels, levels[1:]):
        e(g, a[0], b[0], label='evolve')

    render(g, 'aiops-maturity-model')


# ── 3. CI/CD with Canary + Config Change Control ──────────────────────────────

def gen_cicd_cmcc_pipeline():
    g = base('cicd_cmcc_pipeline', rankdir='LR')
    g.attr(label='CI/CD with Canary + Config Change Control', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    # Main pipeline
    pipeline = [
        ('code',    'Code\nCommit',        C_INVEST),
        ('build',   'Build\n& Lint',       C_INVEST),
        ('test',    'Automated\nTests',    C_INVEST),
        ('canary',  'Canary\nDeploy (5%)', C_DETECT),
        ('monitor', 'Monitor\n& Validate', C_VERIFY),
        ('full',    'Full\nDeploy (100%)', C_REMED),
    ]

    for node_id, label, color in pipeline:
        n(g, node_id, label, fillcolor=color)

    for a, b in zip(pipeline, pipeline[1:]):
        e(g, a[0], b[0])

    # Rollback
    e(g, 'monitor', 'canary', label='rollback', style='dashed',
      color='#ef4444', constraint='false')

    # Config change control cluster
    with g.subgraph(name='cluster_ccc') as c:
        c.attr(label='Config Change Control', style='filled',
               fillcolor='#f5f3ff', color=C_DIAG, fontcolor=C_DIAG)
        n(c, 'ccc_gate', 'Change Approval\nGate',    fillcolor=C_DIAG)
        n(c, 'ccc_cmdb', 'CMDB\nSnapshot',           fillcolor=C_DIAG)
        n(c, 'ccc_audit', 'Audit Log\n& Diff',       fillcolor=C_DIAG)
        e(c, 'ccc_gate', 'ccc_cmdb')
        e(c, 'ccc_cmdb', 'ccc_audit')

    e(g, 'code', 'ccc_gate', label='triggers', style='dashed', color=C_DIAG)
    e(g, 'ccc_gate', 'build', label='approved', color=C_DIAG)

    render(g, 'cicd-cmcc-pipeline')


# ── 4. CI/CD with Continuous Testing + Change Management ─────────────────────

def gen_cicd_ct_cm_pipeline():
    g = base('cicd_ct_cm_pipeline', rankdir='LR')
    g.attr(label='CI/CD with Continuous Testing + Change Management', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    # Main flow
    for node_id, label, color in [
        ('commit', 'Code\nCommit',     C_INVEST),
        ('ci',     'CI Pipeline\nRun', C_INVEST),
        ('stage',  'Staging\nDeploy',  C_INVEST),
        ('prod',   'Production\nDeploy', C_REMED),
    ]:
        n(g, node_id, label, fillcolor=color)

    e(g, 'commit', 'ci')
    e(g, 'ci', 'stage')
    e(g, 'stage', 'prod')

    # Test pyramid cluster
    with g.subgraph(name='cluster_tests') as c:
        c.attr(label='Test Pyramid', style='filled',
               fillcolor=BG_INVEST, color=C_INVEST, fontcolor=C_INVEST)
        n(c, 'unit',    'Unit Tests\n(fast, isolated)',      fillcolor=C_REMED)
        n(c, 'integ',   'Integration Tests\n(API + DB)',     fillcolor=C_INVEST)
        n(c, 'e2e',     'E2E / Contract\nTests',             fillcolor=C_DETECT)
        n(c, 'perf',    'Performance\nBaseline',             fillcolor=C_DIAG)
        e(c, 'unit', 'integ')
        e(c, 'integ', 'e2e')
        e(c, 'e2e', 'perf')

    # Change management cluster
    with g.subgraph(name='cluster_cm') as c:
        c.attr(label='Change Management', style='filled',
               fillcolor=BG_DIAG, color=C_DIAG, fontcolor=C_DIAG)
        n(c, 'rfc',    'RFC\nCreation',       fillcolor=C_DIAG)
        n(c, 'cab',    'CAB Review\n& Approve', fillcolor=C_DIAG)
        n(c, 'window', 'Change\nWindow',       fillcolor=C_DIAG)
        e(c, 'rfc', 'cab')
        e(c, 'cab', 'window')

    e(g, 'ci', 'unit', label='runs', style='dashed', color=C_INVEST)
    e(g, 'commit', 'rfc', label='triggers', style='dashed', color=C_DIAG)
    e(g, 'window', 'prod', label='gated by', color=C_DIAG)

    render(g, 'cicd-ct-cm-pipeline')


# ── 5. Cloud AIOps Platform Landscape ─────────────────────────────────────────

def gen_cloud_aiops_platforms():
    g = base('cloud_aiops_platforms', rankdir='TB')
    g.attr(label='Cloud AIOps Platform Landscape', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    n(g, 'top', 'AIOps Platform\nLandscape', shape='diamond',
      fillcolor=C_LLM)

    # AWS cluster
    with g.subgraph(name='cluster_aws') as c:
        c.attr(label='AWS', style='filled', fillcolor='#fff7ed',
               color='#c2410c', fontcolor='#c2410c')
        aws_color = '#c2410c'
        n(c, 'cw',      'CloudWatch\nMetrics + Logs',         fillcolor=aws_color)
        n(c, 'xray',    'X-Ray\nDistributed Tracing',         fillcolor=aws_color)
        n(c, 'devops',  'DevOps Guru\nML Anomalies',          fillcolor=aws_color)
        n(c, 'ssm',     'Systems Manager\nAutomation',        fillcolor=aws_color)

    # Azure cluster
    with g.subgraph(name='cluster_azure') as c:
        c.attr(label='Azure', style='filled', fillcolor=BG_INVEST,
               color='#1d4ed8', fontcolor='#1d4ed8')
        azure_color = '#1d4ed8'
        n(c, 'monitor', 'Azure Monitor\nMetrics + Logs',      fillcolor=azure_color)
        n(c, 'appins',  'App Insights\nAPM',                  fillcolor=azure_color)
        n(c, 'sentinel','Microsoft Sentinel\nSIEM + SOAR',    fillcolor=azure_color)
        n(c, 'automation', 'Azure Automation\nRunbooks',      fillcolor=azure_color)

    # GCP cluster
    with g.subgraph(name='cluster_gcp') as c:
        c.attr(label='GCP', style='filled', fillcolor='#f0fdf4',
               color='#15803d', fontcolor='#15803d')
        gcp_color = '#15803d'
        n(c, 'ops',     'Cloud Operations\nSuite (Stackdriver)', fillcolor=gcp_color)
        n(c, 'trace',   'Cloud Trace\n+ Profiler',             fillcolor=gcp_color)
        n(c, 'error',   'Error Reporting\n+ Logging',          fillcolor=gcp_color)
        n(c, 'scc',     'Security Command\nCenter',            fillcolor=gcp_color)

    for svc in ['cw', 'xray', 'devops', 'ssm']:
        e(g, 'top', svc, color='#c2410c')
    for svc in ['monitor', 'appins', 'sentinel', 'automation']:
        e(g, 'top', svc, color='#1d4ed8')
    for svc in ['ops', 'trace', 'error', 'scc']:
        e(g, 'top', svc, color='#15803d')

    render(g, 'cloud-aiops-platforms')


# ── 6. Cross-Cloud AIOps Architecture ─────────────────────────────────────────

def gen_cross_cloud_aiops():
    g = base('cross_cloud_aiops', rankdir='LR')
    g.attr(label='Cross-Cloud AIOps Architecture', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    # Federation layer
    with g.subgraph(name='cluster_fed') as c:
        c.attr(label='AIOps Federation Layer', style='filled',
               fillcolor=BG_LLM, color=C_LLM, fontcolor=C_LLM)
        n(c, 'norm',   'Signal\nNormalization',     fillcolor=C_LLM)
        n(c, 'corr',   'Cross-Cloud\nCorrelation',  fillcolor=C_LLM)
        n(c, 'policy', 'Unified Policy\nEngine',    fillcolor=C_LLM)
        e(c, 'norm', 'corr')
        e(c, 'corr', 'policy')

    # Cloud sources
    with g.subgraph(name='cluster_clouds') as c:
        c.attr(label='Cloud Sources', style='filled',
               fillcolor='#f8fafc', color='#64748b', fontcolor='#334155')
        n(c, 'aws',    'AWS\nCloudWatch',       fillcolor='#c2410c')
        n(c, 'azure',  'Azure\nMonitor',        fillcolor='#1d4ed8')
        n(c, 'gcp',    'GCP\nOperations',       fillcolor='#15803d')
        n(c, 'onprem', 'On-Prem\nPrometheus',   fillcolor=C_POSTM)

    # Actions
    with g.subgraph(name='cluster_actions') as c:
        c.attr(label='Unified Actions', style='filled',
               fillcolor=BG_REMED, color=C_REMED, fontcolor=C_REMED)
        n(c, 'alert',  'Unified\nAlerting',     fillcolor=C_REMED)
        n(c, 'dash',   'Cross-Cloud\nDashboard', fillcolor=C_REMED)
        n(c, 'auto',   'Auto-Remediation\nPlaybooks', fillcolor=C_REMED)

    for src in ['aws', 'azure', 'gcp', 'onprem']:
        e(g, src, 'norm')

    e(g, 'policy', 'alert')
    e(g, 'policy', 'dash')
    e(g, 'policy', 'auto')

    render(g, 'cross-cloud-aiops')


# ── 7. Error Budget Management with AIOps ────────────────────────────────────

def gen_error_budget_aiops():
    g = base('error_budget_aiops', rankdir='LR')
    g.attr(label='Error Budget Management with AIOps', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    n(g, 'slo',    'SLO Definition\n(99.9% target)',    fillcolor=C_INVEST)
    n(g, 'budget', 'Error Budget\n(0.1% allowance)',    fillcolor=C_INVEST)
    n(g, 'burn',   'Burn Rate\nMonitor',                fillcolor=C_DETECT,
      shape='diamond')
    n(g, 'ok',     'Budget OK\nContinue shipping',      fillcolor=C_REMED)
    n(g, 'warn',   'Burn Rate High\nSlow deploys',      fillcolor='#92400e')
    n(g, 'exhaust','Budget Exhausted\nFreeze changes',  fillcolor=C_DETECT)
    n(g, 'postm',  'Reliability\nPost-mortem',          fillcolor=C_POSTM)
    n(g, 'llm',    'LLM RCA\nAssistant',                fillcolor=C_LLM)

    e(g, 'slo',    'budget')
    e(g, 'budget', 'burn',   label='tracks')
    e(g, 'burn',   'ok',     label='< 1x')
    e(g, 'burn',   'warn',   label='1–5x')
    e(g, 'burn',   'exhaust', label='> 5x')
    e(g, 'exhaust', 'postm')
    e(g, 'postm',  'slo',    label='update', style='dashed', color='#64748b')
    e(g, 'llm',    'burn',   label='monitors', style='dashed', color=C_LLM)
    e(g, 'llm',    'postm',  label='generates', style='dashed', color=C_LLM)

    render(g, 'error-budget-aiops')


# ── 8. Event → Alert → Incident Funnel ───────────────────────────────────────

def gen_event_alert_incident_funnel():
    g = base('event_alert_incident_funnel', rankdir='LR')
    g.attr(label='Event → Alert → Incident Funnel', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    # Funnel stages with width decreasing
    stages = [
        ('events',   'Raw Events\n(millions/day)',   C_POSTM, '2.5'),
        ('filter',   'Noise\nFiltering',             C_INVEST, '2.0'),
        ('dedup',    'Deduplication\n& Suppression', C_INVEST, '1.6'),
        ('corr',     'Correlation\n& Grouping',      C_DIAG,   '1.2'),
        ('alerts',   'Qualified\nAlerts',            C_DETECT, '0.9'),
        ('triage',   'Automated\nTriage',            C_LLM,    '0.7'),
        ('incident', 'Incidents\n(tens/day)',         C_REMED, '0.5'),
    ]

    for node_id, label, color, width in stages:
        n(g, node_id, label, fillcolor=color, width=width, height='0.8')

    for a, b in zip(stages, stages[1:]):
        e(g, a[0], b[0])

    # Feedback
    e(g, 'incident', 'filter', label='tune rules', style='dashed',
      color='#64748b', constraint='false')

    render(g, 'event-alert-incident-funnel')


# ── 9. Event Correlation Pipeline ─────────────────────────────────────────────

def gen_event_correlation_pipeline():
    g = base('event_correlation_pipeline', rankdir='LR')
    g.attr(label='Event Correlation Pipeline', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    # Sources
    with g.subgraph(name='cluster_sources') as c:
        c.attr(label='Event Sources', style='filled',
               fillcolor='#f8fafc', color='#64748b', fontcolor='#334155')
        for node_id, label in [
            ('src_infra', 'Infrastructure\nMetrics'),
            ('src_app',   'Application\nLogs'),
            ('src_apm',   'APM Traces'),
            ('src_sec',   'Security\nEvents'),
        ]:
            n(c, node_id, label, fillcolor=C_POSTM)

    # Pipeline stages
    for node_id, label, color in [
        ('enrich', 'Enrichment\n(CMDB / topology)', C_INVEST),
        ('norm',   'Normalization\n(schema mapping)', C_INVEST),
        ('dedup',  'Deduplication\n(fingerprinting)', C_INVEST),
        ('corr',   'ML Correlation\n(temporal + spatial)', C_LLM),
        ('group',  'Incident\nGrouping',              C_DIAG),
        ('alert',  'Alert\nFiring',                   C_DETECT),
    ]:
        n(g, node_id, label, fillcolor=color)

    for src in ['src_infra', 'src_app', 'src_apm', 'src_sec']:
        e(g, src, 'enrich')

    for a, b in [('enrich', 'norm'), ('norm', 'dedup'),
                 ('dedup', 'corr'), ('corr', 'group'), ('group', 'alert')]:
        e(g, a, b)

    render(g, 'event-correlation-pipeline')


# ── 10. LLM Automation Levels in AIOps ───────────────────────────────────────

def gen_llm_automation_levels():
    g = base('llm_automation_levels', rankdir='LR')
    g.attr(label='LLM Automation Levels in AIOps', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    levels = [
        ('l1', 'Level 1\nSummarize',
         'Alert → Human-readable\nsummary + context',
         C_INVEST),
        ('l2', 'Level 2\nRecommend',
         'RCA → Ranked\nremediation steps\nfor human approval',
         C_DIAG),
        ('l3', 'Level 3\nExecute',
         'Human-approved plan\nexecuted by LLM\nvia tool calls',
         C_REMED),
        ('l4', 'Level 4\nAutonomous',
         'Detect → Diagnose\n→ Remediate → Verify\nwithout human gates',
         C_LLM),
    ]

    for node_id, title, caps, color in levels:
        label = f'{title}\n──────\n{caps}'
        n(g, node_id, label, fillcolor=color, fontsize='10')

    for a, b in zip(levels, levels[1:]):
        e(g, a[0], b[0], label='more\nautomation')

    # Human-in-the-loop annotation
    n(g, 'human', 'Human\nIn the Loop', shape='ellipse',
      fillcolor='#f8fafc', fontcolor='#334155', style='filled')
    e(g, 'human', 'l1', style='dashed', color='#64748b')
    e(g, 'human', 'l2', style='dashed', color='#64748b')
    e(g, 'human', 'l3', style='dashed', color='#64748b',
      label='gates L3')

    render(g, 'llm-automation-levels')


# ── 11. MLOps / AIOps Intersection ────────────────────────────────────────────

def gen_mlops_aiops_intersection():
    g = base('mlops_aiops_intersection', rankdir='LR')
    g.attr(label='MLOps / AIOps Intersection', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    # MLOps domain
    with g.subgraph(name='cluster_mlops') as c:
        c.attr(label='MLOps', style='filled',
               fillcolor=BG_INVEST, color=C_INVEST, fontcolor=C_INVEST)
        n(c, 'data',    'Data\nVersioning',      fillcolor=C_INVEST)
        n(c, 'train',   'Model\nTraining',        fillcolor=C_INVEST)
        n(c, 'registry','Model\nRegistry',        fillcolor=C_INVEST)
        n(c, 'serve',   'Model\nServing',         fillcolor=C_INVEST)
        e(c, 'data', 'train')
        e(c, 'train', 'registry')
        e(c, 'registry', 'serve')

    # Shared center
    with g.subgraph(name='cluster_shared') as c:
        c.attr(label='Shared / Overlap', style='filled',
               fillcolor=BG_LLM, color=C_LLM, fontcolor=C_LLM)
        n(c, 'obs',    'Observability\n(metrics/logs/traces)', fillcolor=C_LLM)
        n(c, 'drift',  'Drift &\nAnomaly Detection',          fillcolor=C_LLM)
        n(c, 'auto',   'Automated\nRemediation',              fillcolor=C_LLM)
        e(c, 'obs', 'drift')
        e(c, 'drift', 'auto')

    # AIOps domain
    with g.subgraph(name='cluster_aiops') as c:
        c.attr(label='AIOps', style='filled',
               fillcolor=BG_DETECT, color=C_DETECT, fontcolor=C_DETECT)
        n(c, 'ingest',  'Multi-source\nEvent Ingestion',   fillcolor=C_DETECT)
        n(c, 'corr',    'Event\nCorrelation',              fillcolor=C_DETECT)
        n(c, 'rca',     'Root Cause\nAnalysis',            fillcolor=C_DETECT)
        n(c, 'remed',   'Incident\nRemediation',           fillcolor=C_DETECT)
        e(c, 'ingest', 'corr')
        e(c, 'corr', 'rca')
        e(c, 'rca', 'remed')

    # Cross-domain edges
    e(g, 'serve', 'obs',   label='feeds', color=C_LLM, style='dashed')
    e(g, 'obs',   'ingest', label='pipes', color=C_DETECT, style='dashed')
    e(g, 'auto',  'serve',  label='retrain', color=C_INVEST, style='dashed')

    render(g, 'mlops-aiops-intersection')


# ── 12. OpenTelemetry Pipeline ────────────────────────────────────────────────

def gen_otel_pipeline():
    g = base('otel_pipeline', rankdir='LR')
    g.attr(label='OpenTelemetry Pipeline', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    # SDK sources
    with g.subgraph(name='cluster_sdk') as c:
        c.attr(label='OTel SDKs (Instrumentation)', style='filled',
               fillcolor='#f8fafc', color='#64748b', fontcolor='#334155')
        for node_id, label in [
            ('traces', 'Traces\n(spans, context)'),
            ('metrics', 'Metrics\n(counters, gauges)'),
            ('logs',   'Logs\n(structured events)'),
        ]:
            n(c, node_id, label, fillcolor=C_POSTM)

    # Collector
    n(g, 'collector', 'OTel Collector\n(receive/process/export)',
      shape='box', fillcolor=C_INVEST, fontsize='11')

    with g.subgraph(name='cluster_proc') as c:
        c.attr(label='Collector Processors', style='filled',
               fillcolor=BG_INVEST, color=C_INVEST, fontcolor=C_INVEST)
        n(c, 'batch',  'Batch\nProcessor',    fillcolor=C_INVEST)
        n(c, 'sample', 'Tail Sampling',       fillcolor=C_INVEST)
        n(c, 'filter', 'Attribute\nFilter',   fillcolor=C_INVEST)

    # Backends
    with g.subgraph(name='cluster_backends') as c:
        c.attr(label='Observability Backends', style='filled',
               fillcolor=BG_REMED, color=C_REMED, fontcolor=C_REMED)
        for node_id, label in [
            ('jaeger',  'Jaeger\n(traces)'),
            ('prom',    'Prometheus\n(metrics)'),
            ('loki',    'Loki / ELK\n(logs)'),
        ]:
            n(c, node_id, label, fillcolor=C_REMED)

    for src in ['traces', 'metrics', 'logs']:
        e(g, src, 'collector')

    e(g, 'collector', 'batch')
    e(g, 'batch', 'sample')
    e(g, 'sample', 'filter')

    for dst in ['jaeger', 'prom', 'loki']:
        e(g, 'filter', dst)

    render(g, 'otel-pipeline')


# ── 13. PyRCA Algorithm Types ─────────────────────────────────────────────────

def gen_pyrca_algorithms():
    g = base('pyrca_algorithms', rankdir='TB')
    g.attr(label='PyRCA Algorithm Taxonomy', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    n(g, 'pyrca', 'PyRCA\nLibrary', shape='doublecircle',
      fillcolor=C_LLM, fontsize='12')

    # Causal Discovery
    with g.subgraph(name='cluster_causal') as c:
        c.attr(label='Causal Discovery', style='filled',
               fillcolor=BG_DIAG, color=C_DIAG, fontcolor=C_DIAG)
        n(c, 'pc',   'PC Algorithm\n(constraint-based)',   fillcolor=C_DIAG)
        n(c, 'ges',  'GES\n(score-based search)',          fillcolor=C_DIAG)
        n(c, 'lingam','LiNGAM\n(non-Gaussian)',            fillcolor=C_DIAG)

    # Score-based
    with g.subgraph(name='cluster_score') as c:
        c.attr(label='Score-Based RCA', style='filled',
               fillcolor=BG_DETECT, color=C_DETECT, fontcolor=C_DETECT)
        n(c, 'rht',  'Random Walk\nHypothesis Test',       fillcolor=C_DETECT)
        n(c, 'epsilon', 'ε-Diagnosis\n(metric anomaly)',   fillcolor=C_DETECT)

    # ML-based
    with g.subgraph(name='cluster_ml') as c:
        c.attr(label='ML-Based RCA', style='filled',
               fillcolor=BG_REMED, color=C_REMED, fontcolor=C_REMED)
        n(c, 'bayesian', 'Bayesian\nNetwork RCA',          fillcolor=C_REMED)
        n(c, 'llmrca',  'LLM-Assisted\nRCA',              fillcolor=C_LLM)

    for node in ['pc', 'ges', 'lingam', 'rht', 'epsilon', 'bayesian', 'llmrca']:
        e(g, 'pyrca', node)

    render(g, 'pyrca-algorithms')


# ── 14. RCA Taxonomy ──────────────────────────────────────────────────────────

def gen_rca_taxonomy():
    g = base('rca_taxonomy', rankdir='LR')
    g.attr(label='Root Cause Analysis Taxonomy', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    # Symptoms
    with g.subgraph(name='cluster_symp') as c:
        c.attr(label='Observable Symptoms', style='filled',
               fillcolor='#f8fafc', color='#64748b', fontcolor='#334155')
        for node_id, label in [
            ('s_lat',  'High\nLatency'),
            ('s_err',  'Error Rate\nSpike'),
            ('s_cpu',  'CPU\nSaturation'),
        ]:
            n(c, node_id, label, fillcolor=C_POSTM)

    n(g, 'hyp',  'Hypothesis\nGeneration',   fillcolor=C_DETECT, shape='diamond')
    n(g, 'ev',   'Evidence\nCollection',     fillcolor=C_INVEST)

    # Root cause types
    with g.subgraph(name='cluster_rc') as c:
        c.attr(label='Root Cause Types', style='filled',
               fillcolor=BG_DIAG, color=C_DIAG, fontcolor=C_DIAG)
        for node_id, label in [
            ('rc_code',  'Code\nDefect'),
            ('rc_cfg',   'Config\nChange'),
            ('rc_dep',   'Dependency\nFailure'),
            ('rc_infra', 'Infrastructure\nFault'),
            ('rc_cap',   'Capacity\nLimit'),
        ]:
            n(c, node_id, label, fillcolor=C_DIAG)

    # Remediation cluster
    with g.subgraph(name='cluster_action') as c:
        c.attr(label='Actions', style='filled',
               fillcolor=BG_REMED, color=C_REMED, fontcolor=C_REMED)
        n(c, 'rollback', 'Rollback\nDeploy',      fillcolor=C_REMED)
        n(c, 'patch',    'Hotfix /\nPatch',        fillcolor=C_REMED)
        n(c, 'scale',    'Scale Out\nResources',   fillcolor=C_REMED)

    for s in ['s_lat', 's_err', 's_cpu']:
        e(g, s, 'hyp')
    e(g, 'hyp', 'ev',        label='test')
    for rc in ['rc_code', 'rc_cfg', 'rc_dep', 'rc_infra', 'rc_cap']:
        e(g, 'ev', rc,        label='confirms')
    e(g, 'rc_code', 'rollback')
    e(g, 'rc_code', 'patch')
    e(g, 'rc_cfg',  'rollback')
    e(g, 'rc_cap',  'scale')

    render(g, 'rca-taxonomy')


# ── 15. Observability Signal Types ────────────────────────────────────────────

def gen_signal_types():
    g = base('signal_types', rankdir='TB')
    g.attr(label='Observability Signal Types', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    n(g, 'obs', 'Observability\nPlatform', shape='doublecircle',
      fillcolor=C_LLM, fontsize='12')

    # The three pillars
    with g.subgraph(name='cluster_metrics') as c:
        c.attr(label='Metrics', style='filled',
               fillcolor=BG_INVEST, color=C_INVEST, fontcolor=C_INVEST)
        n(c, 'm_counter', 'Counters\n(requests, errors)',   fillcolor=C_INVEST)
        n(c, 'm_gauge',   'Gauges\n(CPU, memory %)',        fillcolor=C_INVEST)
        n(c, 'm_hist',    'Histograms\n(latency p99)',      fillcolor=C_INVEST)

    with g.subgraph(name='cluster_logs') as c:
        c.attr(label='Logs', style='filled',
               fillcolor=BG_DETECT, color=C_DETECT, fontcolor=C_DETECT)
        n(c, 'l_struct',  'Structured\nJSON Logs',          fillcolor=C_DETECT)
        n(c, 'l_audit',   'Audit /\nAccess Logs',           fillcolor=C_DETECT)
        n(c, 'l_error',   'Error &\nException Logs',        fillcolor=C_DETECT)

    with g.subgraph(name='cluster_traces') as c:
        c.attr(label='Traces', style='filled',
               fillcolor=BG_DIAG, color=C_DIAG, fontcolor=C_DIAG)
        n(c, 't_span',    'Spans\n(start/end/duration)',    fillcolor=C_DIAG)
        n(c, 't_ctx',     'Context\nPropagation (W3C)',     fillcolor=C_DIAG)
        n(c, 't_bag',     'Baggage\n(trace attributes)',    fillcolor=C_DIAG)

    # Additional signals
    with g.subgraph(name='cluster_extra') as c:
        c.attr(label='Additional Signals', style='filled',
               fillcolor=BG_REMED, color=C_REMED, fontcolor=C_REMED)
        n(c, 'events',   'Events\n(state changes)',         fillcolor=C_REMED)
        n(c, 'profiles', 'Continuous\nProfiling',           fillcolor=C_REMED)

    for node in ['m_counter', 'm_gauge', 'm_hist',
                 'l_struct', 'l_audit', 'l_error',
                 't_span', 't_ctx', 't_bag',
                 'events', 'profiles']:
        e(g, 'obs', node)

    render(g, 'signal-types')


# ── 16. SRE + AIOps Integration ───────────────────────────────────────────────

def gen_sre_aiops_integration():
    g = base('sre_aiops_integration', rankdir='LR')
    g.attr(label='SRE + AIOps Integration', labelloc='t',
           fontsize='15', fontcolor='#1e3a5f')

    # SRE practices
    with g.subgraph(name='cluster_sre') as c:
        c.attr(label='SRE Practices', style='filled',
               fillcolor=BG_INVEST, color=C_INVEST, fontcolor=C_INVEST)
        n(c, 'slo',      'SLO / SLA\nDefinition',           fillcolor=C_INVEST)
        n(c, 'errorb',   'Error Budget\nTracking',           fillcolor=C_INVEST)
        n(c, 'oncall',   'On-Call\nRotation',                fillcolor=C_INVEST)
        n(c, 'postm',    'Blameless\nPost-mortems',          fillcolor=C_INVEST)
        n(c, 'toil',     'Toil\nReduction',                  fillcolor=C_INVEST)
        e(c, 'slo', 'errorb')
        e(c, 'errorb', 'oncall')
        e(c, 'oncall', 'postm')
        e(c, 'postm', 'toil')

    # Integration / shared layer
    with g.subgraph(name='cluster_int') as c:
        c.attr(label='Integration Layer', style='filled',
               fillcolor=BG_LLM, color=C_LLM, fontcolor=C_LLM)
        n(c, 'obs',    'Shared\nObservability',              fillcolor=C_LLM)
        n(c, 'policy', 'Automation\nPolicy Engine',          fillcolor=C_LLM)
        n(c, 'kb',     'Knowledge\nBase (runbooks)',         fillcolor=C_LLM)

    # AIOps automation
    with g.subgraph(name='cluster_aiops') as c:
        c.attr(label='AIOps Automation', style='filled',
               fillcolor=BG_DETECT, color=C_DETECT, fontcolor=C_DETECT)
        n(c, 'detect',  'Anomaly\nDetection',                fillcolor=C_DETECT)
        n(c, 'corr',    'Event\nCorrelation',                fillcolor=C_DETECT)
        n(c, 'auto_rca','Automated\nRCA',                    fillcolor=C_DETECT)
        n(c, 'heal',    'Self-Healing\nActions',             fillcolor=C_REMED)
        e(c, 'detect', 'corr')
        e(c, 'corr', 'auto_rca')
        e(c, 'auto_rca', 'heal')

    # Cross-domain connections
    e(g, 'slo',    'obs',    label='feeds',   style='dashed', color=C_LLM)
    e(g, 'errorb', 'obs',    label='feeds',   style='dashed', color=C_LLM)
    e(g, 'obs',    'detect', label='pipes',   color=C_DETECT)
    e(g, 'kb',     'auto_rca', label='guides', style='dashed', color=C_LLM)
    e(g, 'policy', 'heal',   label='governs', color=C_LLM)
    e(g, 'heal',   'toil',   label='reduces', color=C_INVEST)
    e(g, 'auto_rca', 'postm', label='informs', style='dashed',
      color='#64748b', constraint='false')

    render(g, 'sre-aiops-integration')


# ── Run all ───────────────────────────────────────────────────────────────────

diagrams = [
    ('agentops-lifecycle',          gen_agentops_lifecycle),
    ('aiops-maturity-model',        gen_aiops_maturity_model),
    ('cicd-cmcc-pipeline',          gen_cicd_cmcc_pipeline),
    ('cicd-ct-cm-pipeline',         gen_cicd_ct_cm_pipeline),
    ('cloud-aiops-platforms',       gen_cloud_aiops_platforms),
    ('cross-cloud-aiops',           gen_cross_cloud_aiops),
    ('error-budget-aiops',          gen_error_budget_aiops),
    ('event-alert-incident-funnel', gen_event_alert_incident_funnel),
    ('event-correlation-pipeline',  gen_event_correlation_pipeline),
    ('llm-automation-levels',       gen_llm_automation_levels),
    ('mlops-aiops-intersection',    gen_mlops_aiops_intersection),
    ('otel-pipeline',               gen_otel_pipeline),
    ('pyrca-algorithms',            gen_pyrca_algorithms),
    ('rca-taxonomy',                gen_rca_taxonomy),
    ('signal-types',                gen_signal_types),
    ('sre-aiops-integration',       gen_sre_aiops_integration),
]

print(f'Generating {len(diagrams)} AIOps diagrams → {os.path.abspath(OUT)}')
for name, fn in diagrams:
    fn()

print(f'\nDone — {len(diagrams)} PNGs written.')
