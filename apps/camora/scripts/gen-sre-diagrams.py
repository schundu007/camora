#!/usr/bin/env python3
"""Generate SRE category diagrams. All landscape (LR) Graphviz PNGs.

17 diagrams total, generated to apps/camora/public/diagrams/sre/.
This file is built up across the SRE Phase 2 batches; each batch adds
the diagrams it needs.
"""
import graphviz
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'sre')
os.makedirs(OUT, exist_ok=True)

# Shared style — matches the rest of the topic diagrams (gen-netflix-diagrams etc.)
NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue',
            fontsize='12', penwidth='1.5', height='0.45', margin='0.15,0.08')
EDGE = dict(fontname='Helvetica Neue', fontsize='10', penwidth='1.5')
C = {
    'navy':   ('#dbeafe', '#3b82f6', '#1e40af'),
    'gold':   ('#fef3c7', '#f59e0b', '#92400e'),
    'green':  ('#dcfce7', '#22c55e', '#166534'),
    'red':    ('#fee2e2', '#ef4444', '#991b1b'),
    'purple': ('#e0e7ff', '#6366f1', '#3730a3'),
    'teal':   ('#ccfbf1', '#14b8a6', '#115e59'),
    'gray':   ('#f3f4f6', '#6b7280', '#374151'),
}


def n(g, name, label, c='navy'):
    g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)


def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '',
           color=color, fontcolor=color, style=style, **EDGE)


def base_graph(name, title):
    g = graphviz.Digraph(name, format='png')
    g.attr(bgcolor='#ffffff', dpi='120', pad='0.25', nodesep='0.5', ranksep='0.45',
           splines='spline', rankdir='LR',
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    return g


# ── A2: SLI / SLO / SLA hierarchy ───────────────────────────────────
def diag_sli_slo_sla():
    g = base_graph('a2_sli_slo_sla', 'SLI vs SLO vs SLA — measurement → target → contract')
    n(g, 'evt', 'User-visible event\n(HTTP request,\nstorage read, etc.)', 'gray')
    n(g, 'sli', 'SLI\n(measurement)\ngood / total', 'navy')
    n(g, 'slo', 'SLO\n(internal target)\ne.g. 99.9% / 30 days', 'green')
    n(g, 'sla', 'SLA\n(external contract)\nrefunds, credits, etc.', 'gold')
    n(g, 'eb', 'Error budget\n= 1 − SLO\n(permission to ship)', 'purple')
    e(g, 'evt', 'sli', 'observe')
    e(g, 'sli', 'slo', 'compared to')
    e(g, 'slo', 'sla', 'looser than')
    e(g, 'slo', 'eb', 'derives')
    g.render(os.path.join(OUT, 'a2-sli-slo-sla'), cleanup=True)
    print('Generated: a2-sli-slo-sla')


# ── A3: Error budget burn rate ──────────────────────────────────────
def diag_burn_rate():
    g = base_graph('a3_burn_rate', 'Error-budget burn rate — multi-window multi-burn-rate alerts')
    # Steady-state vs fast-burn vs slow-burn columns
    n(g, 'budget', 'Error budget\nfor 30-day window\n(e.g. 0.1% × 30d)', 'gray')
    n(g, 'fast', 'FAST burn\n14.4× rate\n→ 2% in 1 hour\nPAGE', 'red')
    n(g, 'med',  'MEDIUM burn\n6× rate\n→ 5% in 6 hours\nPAGE', 'gold')
    n(g, 'slow', 'SLOW burn\n1× rate\n→ 10% in 3 days\nTICKET', 'green')
    n(g, 'short', 'Short window\n(5m / 30m / 6h)\n"still burning?"', 'navy')
    e(g, 'budget', 'fast',  'rule 1')
    e(g, 'budget', 'med',   'rule 2')
    e(g, 'budget', 'slow',  'rule 3')
    e(g, 'fast',  'short',  'AND')
    e(g, 'med',   'short',  'AND')
    e(g, 'slow',  'short',  'AND')
    g.render(os.path.join(OUT, 'a3-burn-rate'), cleanup=True)
    print('Generated: a3-burn-rate')


# ── B1: N+1 / N+2 redundancy ────────────────────────────────────────
def diag_redundancy():
    g = base_graph('b1_redundancy', 'High Availability — N + spares (redundant-component math)')
    n(g, 'lb', 'Load Balancer\n(health checks)', 'navy')
    n(g, 'a', 'Replica A\n(serving)', 'green')
    n(g, 'b', 'Replica B\n(serving)', 'green')
    n(g, 'c', 'Replica C\n(serving)', 'green')
    n(g, 's1', 'Spare 1\n(N+1)', 'gold')
    n(g, 's2', 'Spare 2\n(N+2)', 'purple')
    n(g, 'math', 'Redundant math:\nAvail = 1 − (failure_rate)^N\nTwo 99.9% replicas\n→ 99.9999%', 'gray')
    e(g, 'lb', 'a')
    e(g, 'lb', 'b')
    e(g, 'lb', 'c')
    e(g, 'lb', 's1', 'failover', '#f59e0b', 'dashed')
    e(g, 'lb', 's2', 'second loss', '#6366f1', 'dashed')
    e(g, 'a', 'math', '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'b1-redundancy'), cleanup=True)
    print('Generated: b1-redundancy')


# ── B2: DR strategies (4-tier AWS taxonomy) ─────────────────────────
def diag_dr_strategies():
    g = base_graph('b2_dr_strategies', 'Disaster Recovery — 4 strategies, cost vs RTO/RPO')
    g.attr(rankdir='LR')
    n(g, 'br', 'Backup & Restore\nRTO: hours – days\nRPO: hours\nCost: $\n(restore from S3)', 'gray')
    n(g, 'pl', 'Pilot Light\nRTO: 10s of min\nRPO: minutes\nCost: $$\n(data on; compute off)', 'green')
    n(g, 'ws', 'Warm Standby\nRTO: minutes\nRPO: seconds\nCost: $$$\n(scaled-down full env)', 'gold')
    n(g, 'aa', 'Multi-site Active/Active\nRTO: ~0\nRPO: 0 or near-0\nCost: $$$$\n(both regions serve)', 'red')
    e(g, 'br', 'pl', 'increase\nreadiness')
    e(g, 'pl', 'ws')
    e(g, 'ws', 'aa')
    g.render(os.path.join(OUT, 'b2-dr-strategies'), cleanup=True)
    print('Generated: b2-dr-strategies')


# ── B3: RTO vs RPO ──────────────────────────────────────────────────
def diag_rto_rpo():
    g = base_graph('b3_rto_rpo', 'RTO vs RPO — what each measures')
    n(g, 'normal', 'Normal\nOperation', 'green')
    n(g, 'disaster', '⚡ DISASTER\n(t = T0)', 'red')
    n(g, 'lastbk', 'Last good backup\n(t = T0 − RPO)\n→ data after this is LOST', 'gold')
    n(g, 'recovery', 'Service restored\n(t = T0 + RTO)\n→ users back online', 'navy')
    n(g, 'defs', 'RPO: how much data\ncan I afford to lose?\nRTO: how long until\nI\'m up and running?', 'gray')
    e(g, 'normal', 'lastbk', 'continuous\nbackups')
    e(g, 'lastbk', 'disaster', 'data lost\nin between')
    e(g, 'disaster', 'recovery', 'restore + traffic\nshift takes RTO')
    e(g, 'defs', 'lastbk', '', '#94a3b8', 'dotted')
    e(g, 'defs', 'recovery', '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'b3-rto-rpo'), cleanup=True)
    print('Generated: b3-rto-rpo')


# ── B4: Multi-cloud active/active ───────────────────────────────────
def diag_multi_cloud():
    g = base_graph('b4_multi_cloud', 'Multi-cloud active/active — write strategies')
    n(g, 'gslb', 'Global LB / Anycast\n(traffic split by\nlatency or %)', 'navy')
    n(g, 'rA', 'Region A\n(serving + writing)', 'green')
    n(g, 'rB', 'Region B\n(serving + writing)', 'green')
    n(g, 'wg', 'Write-global:\nall writes → 1 region\n(Aurora Global DB)', 'purple')
    n(g, 'wl', 'Write-local:\nwrites go to nearest\n(DynamoDB Global Tables\n— LWW)', 'gold')
    n(g, 'wp', 'Write-partitioned:\npartition key →\nspecific region', 'teal')
    e(g, 'gslb', 'rA')
    e(g, 'gslb', 'rB')
    e(g, 'rA', 'rB', 'replicate')
    e(g, 'rB', 'rA', 'replicate')
    e(g, 'rA', 'wg', 'option', '#94a3b8', 'dotted')
    e(g, 'rA', 'wl', 'option', '#94a3b8', 'dotted')
    e(g, 'rA', 'wp', 'option', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'b4-multi-cloud'), cleanup=True)
    print('Generated: b4-multi-cloud')


# ── C1: Three pillars of observability ──────────────────────────────
def diag_three_pillars():
    g = base_graph('c1_three_pillars', 'Observability — three pillars (metrics, logs, traces)')
    n(g, 'sys', 'Production system\n(services, infra,\nuser requests)', 'gray')
    n(g, 'm', 'Metrics\n(numerical, time-series)\nPrometheus, Mimir\n→ aggregates, alerts', 'navy')
    n(g, 'l', 'Logs\n(structured events)\nLoki, Elastic\n→ debug, audit', 'green')
    n(g, 't', 'Traces\n(distributed spans)\nTempo, Jaeger\n→ causality, latency', 'purple')
    n(g, 'otel', 'OpenTelemetry\n(unified collector +\nstandard wire format)', 'gold')
    e(g, 'sys', 'otel', 'instrument')
    e(g, 'otel', 'm', 'metrics')
    e(g, 'otel', 'l', 'logs')
    e(g, 'otel', 't', 'traces')
    g.render(os.path.join(OUT, 'c1-three-pillars'), cleanup=True)
    print('Generated: c1-three-pillars')


# ── C2: RED vs USE methods ──────────────────────────────────────────
def diag_red_use():
    g = base_graph('c2_red_use', 'RED (services) vs USE (resources) vs Four Golden Signals')
    n(g, 'svc', 'Service-level\n(request-driven)', 'navy')
    n(g, 'red', 'RED\n• Rate (req/sec)\n• Errors (% failed)\n• Duration (latency p50/p99)', 'green')
    n(g, 'gold', 'Four Golden Signals\n• Latency\n• Traffic\n• Errors\n• Saturation', 'gold')
    n(g, 'res', 'Resource-level\n(host / disk / network)', 'gray')
    n(g, 'use', 'USE\n• Utilization (% busy)\n• Saturation (queue depth)\n• Errors (counter)', 'red')
    e(g, 'svc', 'red', 'measure with')
    e(g, 'svc', 'gold', 'or measure with')
    e(g, 'res', 'use', 'measure with')
    g.render(os.path.join(OUT, 'c2-red-use'), cleanup=True)
    print('Generated: c2-red-use')


# ── C4: Prometheus + Grafana stack ──────────────────────────────────
def diag_prom_stack():
    g = base_graph('c4_prom_stack', 'Modern observability stack (Prometheus, OTel, Grafana LGTM)')
    n(g, 'app', 'Application\n(instrumented)', 'gray')
    n(g, 'otel', 'OpenTelemetry\nCollector', 'gold')
    n(g, 'prom', 'Prometheus /\nMimir\n(metrics)', 'navy')
    n(g, 'loki', 'Loki\n(logs)', 'green')
    n(g, 'tempo', 'Tempo / Jaeger\n(traces)', 'purple')
    n(g, 'graf', 'Grafana\n(dashboards +\nalerts + correlation)', 'red')
    n(g, 'am', 'Alertmanager\n(routing,\nde-dup, silence)', 'teal')
    e(g, 'app', 'otel')
    e(g, 'otel', 'prom')
    e(g, 'otel', 'loki')
    e(g, 'otel', 'tempo')
    e(g, 'prom', 'graf')
    e(g, 'loki', 'graf')
    e(g, 'tempo', 'graf')
    e(g, 'prom', 'am', 'alert rules')
    e(g, 'am', 'graf', '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'c4-prom-stack'), cleanup=True)
    print('Generated: c4-prom-stack')


# ── C6: Distributed trace waterfall ─────────────────────────────────
def diag_trace_waterfall():
    g = base_graph('c6_trace', 'Distributed trace — span tree across services')
    g.attr(rankdir='TB')
    n(g, 'gw',  'Gateway\n[span 1] 200ms', 'navy')
    n(g, 'auth','Auth service\n[span 2] 30ms', 'green')
    n(g, 'api', 'API service\n[span 3] 150ms', 'gold')
    n(g, 'db',  'Database\n[span 4] 80ms', 'red')
    n(g, 'cache','Cache\n[span 5] 5ms', 'purple')
    n(g, 'ext', 'External API\n[span 6] 50ms', 'teal')
    e(g, 'gw',  'auth', 'parent → child')
    e(g, 'gw',  'api',  'parent → child')
    e(g, 'api', 'db',   'parent → child')
    e(g, 'api', 'cache','parent → child')
    e(g, 'api', 'ext',  'parent → child')
    g.render(os.path.join(OUT, 'c6-trace'), cleanup=True)
    print('Generated: c6-trace')


# ── D1: Incident Command roles ──────────────────────────────────────
def diag_incident_roles():
    g = base_graph('d1_incident_roles', 'Incident Command roles (IMAG / Google IRT structure)')
    n(g, 'ic',  'Incident Commander (IC)\n• decides priorities\n• delegates work\n• runs the call', 'red')
    n(g, 'ops', 'Ops Lead\n• executes mitigations\n• reads dashboards\n• drives investigation', 'navy')
    n(g, 'comm','Communications Lead\n• status page + Slack\n• exec updates\n• customer comms', 'gold')
    n(g, 'plan','Planning Lead\n(long incidents only)\n• shift handoffs\n• timeline owner', 'green')
    n(g, 'sme', 'Subject Matter Experts\n• deep technical knowledge\n• called in by Ops Lead', 'purple')
    e(g, 'ic', 'ops',  'directs')
    e(g, 'ic', 'comm', 'directs')
    e(g, 'ic', 'plan', 'directs (>4h)')
    e(g, 'ops', 'sme', 'pulls in')
    g.render(os.path.join(OUT, 'd1-incident-roles'), cleanup=True)
    print('Generated: d1-incident-roles')


# ── D5: Postmortem flow ─────────────────────────────────────────────
def diag_postmortem_flow():
    g = base_graph('d5_postmortem', 'Blameless Postmortem flow — incident to action items')
    n(g, 'inc',   'INCIDENT\n(detected, mitigated)', 'red')
    n(g, 'draft', 'Draft postmortem\n(within 5 business days)\n• timeline\n• impact\n• root causes', 'gold')
    n(g, 'review','Review meeting\n(blameless, cross-team)\n• Five Whys\n• contributing factors', 'navy')
    n(g, 'final', 'Final postmortem\n• published\n• searchable\n• linked from runbooks', 'green')
    n(g, 'ai',    'Action items\n(owners + due dates)\n• prevent recurrence\n• detect faster\n• mitigate faster', 'purple')
    n(g, 'track', 'Tracker / sprint planning\n(close the loop)', 'teal')
    e(g, 'inc',    'draft',  'within 5d')
    e(g, 'draft',  'review', 'cross-team\nattendance')
    e(g, 'review', 'final',  'incorporate\ndiscussion')
    e(g, 'final',  'ai',     'extract')
    e(g, 'ai',     'track',  'commit to\nbacklog')
    g.render(os.path.join(OUT, 'd5-postmortem'), cleanup=True)
    print('Generated: d5-postmortem')


# ── E3: CI/CD pipeline with progressive delivery ────────────────────
def diag_cicd_pipeline():
    g = base_graph('e3_cicd', 'Progressive delivery CI/CD pipeline (canary → blue-green → rolling)')
    n(g, 'pr',     'Pull Request\n• tests\n• lint\n• security scan', 'gray')
    n(g, 'main',   'Merge to main\n• build\n• image tag', 'navy')
    n(g, 'stg',    'Staging\n• smoke tests\n• integration', 'green')
    n(g, 'canary', 'Canary (1-5%)\n• 10-30 min bake\n• SLO-gated', 'gold')
    n(g, 'rollout','Progressive rollout\n10% → 50% → 100%\nor blue/green flip', 'purple')
    n(g, 'rollback','Auto-rollback\nif SLI breaches', 'red')
    e(g, 'pr', 'main', 'CI green')
    e(g, 'main', 'stg')
    e(g, 'stg', 'canary')
    e(g, 'canary', 'rollout', 'SLI healthy')
    e(g, 'canary', 'rollback', 'SLI breach', '#dc2626', 'dashed')
    e(g, 'rollout', 'rollback', 'SLI breach\nat any %', '#dc2626', 'dashed')
    g.render(os.path.join(OUT, 'e3-cicd'), cleanup=True)
    print('Generated: e3-cicd')


# ── F3: Load testing methodology ────────────────────────────────────
def diag_load_testing():
    g = base_graph('f3_load_testing', 'Load testing methodology — baseline → ramp → soak → spike')
    n(g, 'base',  'Baseline\n(steady-state load)\nestablish normal\nmetrics', 'green')
    n(g, 'ramp',  'Ramp test\n(gradual increase)\nfind knee of curve\n(latency / errors)', 'navy')
    n(g, 'soak',  'Soak test\n(sustained load,\nhours)\nfind memory leaks,\nresource exhaustion', 'gold')
    n(g, 'spike', 'Spike test\n(sudden 5-10× burst)\ntest autoscaling,\ngraceful degradation', 'red')
    n(g, 'stress','Stress test\n(beyond capacity)\nfind failure mode\n(graceful or cascade?)', 'purple')
    n(g, 'tools', 'Tools:\nk6 / Locust / JMeter\n/ Vegeta / Gatling', 'gray')
    e(g, 'base',  'ramp')
    e(g, 'ramp',  'soak')
    e(g, 'soak',  'spike')
    e(g, 'spike', 'stress')
    e(g, 'tools', 'base', 'execute', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'f3-load-testing'), cleanup=True)
    print('Generated: f3-load-testing')


# ── G1: Circuit breaker state machine ───────────────────────────────
def diag_circuit_breaker():
    g = base_graph('g1_circuit_breaker', 'Circuit breaker — three-state machine (Hystrix / resilience4j)')
    n(g, 'closed', 'CLOSED\n(normal)\nrequests pass\nthrough', 'green')
    n(g, 'open',   'OPEN\n(failing)\nfast-fail\nor fallback', 'red')
    n(g, 'half',   'HALF-OPEN\n(probing)\nlimited requests\nallowed', 'gold')
    e(g, 'closed', 'open',   'failure rate\n> threshold\n(e.g., 50% in 1m)', '#dc2626')
    e(g, 'open',   'half',   'after timeout\n(e.g., 30s)', '#0066cc')
    e(g, 'half',   'closed', 'probes succeed\n→ resume', '#16a34a')
    e(g, 'half',   'open',   'probes fail\n→ keep open', '#dc2626', 'dashed')
    g.render(os.path.join(OUT, 'g1-circuit-breaker'), cleanup=True)
    print('Generated: g1-circuit-breaker')


# ── G2: Cascading failure ───────────────────────────────────────────
def diag_cascading_failure():
    g = base_graph('g2_cascade', 'Cascading failure — one slow dependency takes down the system')
    n(g, 'user', 'Users\n(retry on slow)', 'navy')
    n(g, 'lb',   'Load Balancer', 'navy')
    n(g, 'svc',  'Service\n(thread pool\nexhausted)', 'red')
    n(g, 'dep',  'Slow Dependency\n(p99 from\n50ms → 5s)', 'gold')
    n(g, 'gc',   'GC death spiral\n(memory pressure\n→ more GC →\nmore CPU →\nmore queueing)', 'purple')
    e(g, 'user', 'lb',  'request')
    e(g, 'lb',   'svc')
    e(g, 'svc',  'dep', 'blocking call')
    e(g, 'user', 'lb',  'retry storm\n(2× load)', '#dc2626', 'dashed')
    e(g, 'svc',  'gc',  'amplifies', '#9333ea', 'dotted')
    e(g, 'gc',   'svc', 'feedback', '#9333ea', 'dotted')
    g.render(os.path.join(OUT, 'g2-cascade'), cleanup=True)
    print('Generated: g2-cascade')


# ── H1: On-call rotation flow ───────────────────────────────────────
def diag_oncall_rotation():
    g = base_graph('h1_oncall', 'On-call rotation — primary, secondary, escalation')
    n(g, 'page',  'Page fires\n(SLO breach,\nalert, incident)', 'red')
    n(g, 'pri',   'Primary on-call\n(acknowledge\nwithin 5 min)', 'navy')
    n(g, 'sec',   'Secondary on-call\n(if primary doesn\'t\nacknowledge in 10 min)', 'gold')
    n(g, 'mgr',   'Manager / Lead\n(escalation if\nincident severity\nor duration warrants)', 'purple')
    n(g, 'sme',   'Subject Matter Expert\n(pulled in by IC\nfor deep technical issue)', 'green')
    n(g, 'ic',    'Incident Commander\n(if SEV-1 / SEV-2)', 'red')
    e(g, 'page', 'pri',   'route to\nprimary')
    e(g, 'pri',  'sec',   'no ack\nin 10 min', '#dc2626', 'dashed')
    e(g, 'pri',  'ic',    'declare\nincident')
    e(g, 'sec',  'ic',    'if escalates')
    e(g, 'ic',   'mgr',   'escalate\nseverity / duration')
    e(g, 'ic',   'sme',   'pull in for\ntechnical depth')
    g.render(os.path.join(OUT, 'h1-oncall-rotation'), cleanup=True)
    print('Generated: h1-oncall-rotation')


# ── A2.1: SLI formula breakdown ─────────────────────────────────────
def diag_sli_formula():
    g = base_graph('a2_1_sli_formula', 'SLI formula — good events / valid events (with concrete examples)')
    n(g, 'all',   'All events\n(every request, read,\nwrite, etc.)', 'gray')
    n(g, 'valid', 'Valid events\n= events your service\nis responsible for\n\n(exclude 4xx client errors,\nrequests for missing endpoints)', 'navy')
    n(g, 'good',  'Good events\n= valid AND succeeded\nper SLI definition\n\n(2xx + 3xx for availability,\nlatency < 500ms for latency)', 'green')
    n(g, 'sli',   'SLI = good / valid\n\n99,890 / 100,000 = 99.89%', 'gold')
    n(g, 'ex',    'Worked example:\n100,000 requests/30d\n95 client errors (excluded)\n15 server errors (counted)\n\n→ valid: 99,985\n→ good: 99,970\n→ SLI: 99.985%', 'purple')
    e(g, 'all',   'valid', 'filter')
    e(g, 'valid', 'good',  'count successes')
    e(g, 'good',  'sli',   'divide')
    e(g, 'ex',    'sli',   'apply', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'a2_1-sli-formula'), cleanup=True)
    print('Generated: a2_1-sli-formula')


# ── A2.2: SLO tier decision matrix ──────────────────────────────────
def diag_slo_tiers():
    g = base_graph('a2_2_slo_tiers', 'SLO tier decision matrix — pick the target that matches business cost')
    n(g, 't1', '99% SLO\n3.65 days/year down\nCost: $\nUse: internal tools,\nbatch jobs, dev', 'gray')
    n(g, 't2', '99.9% SLO\n8h 45min/year\nCost: $$\nUse: most B2B SaaS,\nstandard customer-facing', 'green')
    n(g, 't3', '99.95% SLO\n4h 22min/year\nCost: $$$\nUse: revenue-critical\nflows (checkout, billing)', 'gold')
    n(g, 't4', '99.99% SLO\n52 min/year\nCost: $$$$\nUse: enterprise SLAs,\npayment processing,\nfinancial settlement', 'red')
    n(g, 't5', '99.999% SLO\n5 min/year\nCost: $$$$$\nUse: telecom, life-safety,\ncritical infrastructure\n(rare; reserved)', 'purple')
    e(g, 't1', 't2', 'each step ~10x cost')
    e(g, 't2', 't3')
    e(g, 't3', 't4')
    e(g, 't4', 't5')
    g.render(os.path.join(OUT, 'a2_2-slo-tiers'), cleanup=True)
    print('Generated: a2_2-slo-tiers')


# ── A2.3: SLI/SLO/SLA worked example for an HTTP service ───────────
def diag_sli_slo_sla_example():
    g = base_graph('a2_3_sli_slo_sla_example', 'Worked example — HTTP checkout service: SLI -> SLO -> SLA')
    n(g, 'svc',  'HTTP checkout service\n10,000 RPS peak\n100M requests / 30 days', 'gray')
    n(g, 'sli',  'SLI definition\n"% of HTTP requests\nthat return 2xx in < 500ms"\n\n(success-and-fast)', 'navy')
    n(g, 'slo',  'SLO target\n99.95% over 30 days\n\n(internal target;\nteam-owned)', 'green')
    n(g, 'eb',   'Error budget\n= 1 - 99.95%\n= 0.05% of 30 days\n= 21.6 minutes/month\nor ~50,000 requests', 'gold')
    n(g, 'sla',  'SLA contract\n99.9% availability\nor refund 10% credit\n\n(external; legal-owned;\nlooser than SLO by 1x9)', 'purple')
    n(g, 'cust', 'Customer\n(reads SLA;\nfiles credit if violated)', 'gray')
    e(g, 'svc',  'sli',  'measure')
    e(g, 'sli',  'slo',  'compare to')
    e(g, 'slo',  'eb',   'derives')
    e(g, 'slo',  'sla',  'tighter than')
    e(g, 'sla',  'cust', 'binds')
    g.render(os.path.join(OUT, 'a2_3-sli-slo-sla-example'), cleanup=True)
    print('Generated: a2_3-sli-slo-sla-example')


# ── A4.1: Error budget calculation worked example ──────────────────
def diag_error_budget_calc():
    g = base_graph('a4_1_error_budget_calc', 'Error budget — calculation in minutes AND requests (worked example)')
    n(g, 'inp',  'Inputs:\nSLO = 99.9%\nWindow = 30 days\nTraffic = 10,000 RPS', 'gray')
    n(g, 'fmla', 'Formula:\nbudget % = 1 - SLO\n\nbudget time = budget % × window\nbudget requests = budget % × total_requests', 'navy')
    n(g, 'mins', 'Time budget:\n0.1% × 30d × 24h × 60min\n= 0.1% × 43,200 min\n= 43.2 min/month\n= 1.44 min/day\n= 8.6 sec/hour', 'green')
    n(g, 'reqs', 'Request budget:\n0.1% × 10,000 RPS × 86,400 s/d × 30 d\n= 0.1% × 25.92 billion\n= 25.92 million failed\nrequests/month allowed', 'gold')
    n(g, 'split','Split between:\n• Planned outages (deploys)\n• Unplanned outages\n• Latency over threshold\n• Test traffic (non-prod\nrequests)', 'purple')
    e(g, 'inp',  'fmla')
    e(g, 'fmla', 'mins', 'time')
    e(g, 'fmla', 'reqs', 'requests')
    e(g, 'mins', 'split', 'allocate', '#94a3b8', 'dotted')
    e(g, 'reqs', 'split', 'allocate', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'a4_1-error-budget-calc'), cleanup=True)
    print('Generated: a4_1-error-budget-calc')


# ── A4.2: Error budget policy zones ─────────────────────────────────
def diag_error_budget_policy():
    g = base_graph('a4_2_error_budget_policy', 'Error budget policy — 4 zones, 4 actions')
    n(g, 'p1',  '> 50% remaining\n(healthy)\nShip features freely\nNormal velocity', 'green')
    n(g, 'p2',  '25-50% remaining\n(yellow)\nReview risky deploys\nAdd canary bake time', 'gold')
    n(g, 'p3',  '< 25% remaining\n(red)\nFreeze new features\nFocus on reliability fixes', 'red')
    n(g, 'p4',  '0% (exhausted)\n(emergency)\nAll-hands reliability\nNo feature work\nuntil budget recovers', 'purple')
    e(g, 'p1', 'p2', 'budget burns')
    e(g, 'p2', 'p3')
    e(g, 'p3', 'p4')
    e(g, 'p4', 'p1', 'recovers\n(time + fixes)', '#16a34a', 'dashed')
    g.render(os.path.join(OUT, 'a4_2-error-budget-policy'), cleanup=True)
    print('Generated: a4_2-error-budget-policy')


# ── D2.1: MTTR / MTTD / MTBF on the incident timeline ───────────────
def diag_mttr_timeline():
    g = base_graph('d2_1_mttr_timeline', 'Incident lifecycle — MTTD / MTT-Mitigate / MTT-Resolve / MTBF')
    g.attr(rankdir='LR')
    n(g, 't0', 'Last good state\n(steady)', 'green')
    n(g, 'inc', 'INCIDENT START\n(symptom appears)', 'red')
    n(g, 'det', 'Detected\n(alert fires)\n← MTTD →', 'gold')
    n(g, 'ack', 'Acknowledged\n+ on-call paged', 'navy')
    n(g, 'mit', 'MITIGATED\n(symptom gone,\nroot cause not yet known)', 'navy')
    n(g, 'res', 'RESOLVED\n(root cause fixed)\n← MTT-Resolve →', 'green')
    n(g, 'next','Next incident\n(MTBF = time between\nthese two)', 'red')
    e(g, 't0',  'inc',  'failure', '#dc2626')
    e(g, 'inc', 'det',  'MTTD')
    e(g, 'det', 'ack',  'page latency')
    e(g, 'ack', 'mit',  'MTT-Mitigate')
    e(g, 'mit', 'res',  'fix')
    e(g, 'res', 'next', 'MTBF\n(stable run)', '#16a34a', 'dashed')
    g.render(os.path.join(OUT, 'd2_1-mttr-timeline'), cleanup=True)
    print('Generated: d2_1-mttr-timeline')


# ── D2.2: Availability formula visualization ────────────────────────
def diag_availability_formula():
    g = base_graph('d2_2_availability', 'Availability formula — Avail = MTBF / (MTBF + MTTR), worked')
    n(g, 'fmla', 'Availability\n= MTBF / (MTBF + MTTR)\n\n(time service is up\n/ total time)', 'navy')
    n(g, 'a1', 'Example A:\nMTBF = 30 days = 720 h\nMTTR = 1 hour\n\n720 / 721 = 99.86%\n(~12 hr down/yr)', 'gold')
    n(g, 'a2', 'Example B:\nMTBF = 30 days = 720 h\nMTTR = 30 min = 0.5 h\n\n720 / 720.5 = 99.93%\n(~6 hr down/yr)\n← halved MTTR =\n2x improvement', 'green')
    n(g, 'a3', 'Example C:\nMTBF = 60 days = 1440 h\nMTTR = 1 hour\n\n1440 / 1441 = 99.93%\n(~6 hr down/yr)\n← doubled MTBF =\nsame improvement\nbut harder to achieve', 'purple')
    n(g, 'lever','Lever rule:\nReducing MTTR is\ntypically 5-10x cheaper\nthan increasing MTBF\n→ invest in observability,\nrunbooks, automation', 'red')
    e(g, 'fmla', 'a1')
    e(g, 'fmla', 'a2')
    e(g, 'fmla', 'a3')
    e(g, 'a2',   'lever', 'apply')
    e(g, 'a3',   'lever', 'apply', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'd2_2-availability'), cleanup=True)
    print('Generated: d2_2-availability')


# ── A1: SRE vs DevOps Venn ──────────────────────────────────────────
def diag_sre_vs_devops():
    g = base_graph('a1_sre_vs_devops', 'SRE vs DevOps — class SRE implements interface DevOps')
    n(g, 'devops', 'DevOps (philosophy)\n• no silos\n• gradual change\n• accidents normal\n• measure everything\n• tooling = leverage', 'navy')
    n(g, 'sre', 'SRE (Google implementation)\n• 50% engineering cap\n• SLO-driven\n• error budgets\n• blameless postmortems\n• toil reduction', 'gold')
    n(g, 'shared', 'Shared:\nReliability via\nengineering, not ops', 'green')
    e(g, 'devops', 'sre', 'class SRE\nimplements')
    e(g, 'sre', 'shared', 'achieves')
    e(g, 'devops', 'shared', 'aims at')
    g.render(os.path.join(OUT, 'a1-sre-vs-devops'), cleanup=True)
    print('Generated: a1-sre-vs-devops')

# ── A4: CUJ → SLI selection ─────────────────────────────────────────
def diag_cuj():
    g = base_graph('a4_cuj', 'Critical User Journey → SLI selection (Workbook Ch 2)')
    n(g, 'user', 'User intent\n("complete checkout")', 'gray')
    n(g, 'cuj', 'CUJ steps\n1. Add to cart\n2. Enter payment\n3. Submit order\n4. Confirmation', 'navy')
    n(g, 'sli', 'Pick SLIs:\n• availability (each step works)\n• latency (each <500ms)\n• freshness (cart accurate)', 'green')
    n(g, 'slo', 'SLO threshold\n99.95% successful\nend-to-end CUJ\n/30 days', 'gold')
    e(g, 'user', 'cuj', 'decompose')
    e(g, 'cuj', 'sli', 'measure each')
    e(g, 'sli', 'slo', 'set target')
    g.render(os.path.join(OUT, 'a4-cuj'), cleanup=True)
    print('Generated: a4-cuj')

# ── A5: Toil 50/50 split ────────────────────────────────────────────
def diag_toil_split():
    g = base_graph('a5_toil_split', 'SRE Book 50% rule — toil ceiling forces engineering investment')
    n(g, 'team', 'SRE team weekly time\n(rolling avg)', 'gray')
    n(g, 'eng',  'Engineering work\n≥ 50%\n\n• automation\n• new SLOs\n• capacity plans\n• postmortem fixes\n• observability projects', 'green')
    n(g, 'toil', 'Toil\n≤ 50%\n\n• manual restarts\n• cert rotation\n• access grants\n• alert triage\n• capacity tweaks', 'red')
    n(g, 'overflow','If toil > 50%:\n1. reduce toil\n2. shift toil back to dev\n3. drop service ownership', 'gold')
    e(g, 'team', 'eng',  'cap')
    e(g, 'team', 'toil', 'cap')
    e(g, 'toil', 'overflow', 'when exceeded', '#dc2626', 'dashed')
    g.render(os.path.join(OUT, 'a5-toil-split'), cleanup=True)
    print('Generated: a5-toil-split')

# ── A6: Risk vs velocity tradeoff ──────────────────────────────────
def diag_risk_velocity():
    g = base_graph('a6_risk_velocity', 'Risk vs Velocity — error budget as the negotiation frame')
    n(g, 'low', 'Too cautious\n(99.999%, 30% budget used)\n→ shipping too slowly\n→ tighten SLO or accelerate', 'red')
    n(g, 'mid', 'Balanced\n(99.95%, ~80% budget used)\n→ ship aggressively\n→ healthy budget burn', 'green')
    n(g, 'hi',  'Over-aggressive\n(99.95%, 110% budget used)\n→ launch freeze\n→ focus on reliability', 'gold')
    e(g, 'low', 'mid', 'increase\nrisk tolerance')
    e(g, 'mid', 'hi',  'sustained\nover-spend')
    e(g, 'hi',  'mid', 'EBP halt\nrecovers', '#16a34a', 'dashed')
    g.render(os.path.join(OUT, 'a6-risk-velocity'), cleanup=True)
    print('Generated: a6-risk-velocity')

# ── B5: NALSD method ────────────────────────────────────────────────
def diag_nalsd():
    g = base_graph('b5_nalsd', 'NALSD — Non-Abstract Large System Design loop (Workbook Ch 12)')
    n(g, 'q1', 'Is it possible?\n(basic design)', 'navy')
    n(g, 'q2', 'Can we do better?\n(refine design)', 'green')
    n(g, 'q3', 'Is it feasible?\n(scale 10x / 100x?)', 'gold')
    n(g, 'q4', 'Is it resilient?\n(failure modes survived?)', 'red')
    n(g, 'maths','Use real numbers:\n• KB / event\n• RPC RTT\n• ops/sec/host\n• disk I/O', 'gray')
    e(g, 'q1', 'q2')
    e(g, 'q2', 'q3')
    e(g, 'q3', 'q4')
    e(g, 'q4', 'q1', 'iterate', '#94a3b8', 'dashed')
    e(g, 'maths','q3', 'feed', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'b5-nalsd'), cleanup=True)
    print('Generated: b5-nalsd')

# ── B6: Latency budget waterfall ────────────────────────────────────
def diag_latency_budget():
    g = base_graph('b6_latency_budget', 'Latency budget waterfall — apportion 500ms across components')
    n(g, 'total','Total budget\n500 ms', 'navy')
    n(g, 'auth', 'Auth\n50 ms', 'green')
    n(g, 'cache','Cache\n5 ms', 'green')
    n(g, 'db',   'DB query\n100 ms', 'gold')
    n(g, 'fanout','Fan-out RPCs\n200 ms (parallel)', 'gold')
    n(g, 'render','Render\n30 ms', 'green')
    n(g, 'overhead','Overhead +\nbuffer\n115 ms', 'gray')
    e(g, 'total', 'auth')
    e(g, 'total', 'cache')
    e(g, 'total', 'db')
    e(g, 'total', 'fanout')
    e(g, 'total', 'render')
    e(g, 'total', 'overhead')
    g.render(os.path.join(OUT, 'b6-latency-budget'), cleanup=True)
    print('Generated: b6-latency-budget')

# ── B7: Raft state machine ──────────────────────────────────────────
def diag_raft():
    g = base_graph('b7_raft', 'Raft consensus — leader election state machine')
    n(g, 'flw', 'FOLLOWER\n• receives heartbeat\n• votes on request', 'navy')
    n(g, 'cnd', 'CANDIDATE\n• timed out\n• requests votes', 'gold')
    n(g, 'lead','LEADER\n• has majority\n• sends heartbeats', 'green')
    e(g, 'flw', 'cnd', 'timeout\n→ start election')
    e(g, 'cnd', 'lead','majority votes')
    e(g, 'cnd', 'flw', 'higher term seen')
    e(g, 'lead','flw', 'higher term seen', '#dc2626', 'dashed')
    g.render(os.path.join(OUT, 'b7-raft'), cleanup=True)
    print('Generated: b7-raft')

# ── C3: 6 SLI types ─────────────────────────────────────────────────
def diag_sli_types():
    g = base_graph('c3_sli_types', '6 SLI types (Workbook Ch 2) by service shape')
    n(g, 'req', 'REQUEST/RESPONSE\n• availability (success %)\n• latency (% under threshold)\n• quality (full vs degraded)', 'navy')
    n(g, 'pipe','DATA PIPELINE\n• freshness (age of newest data)\n• correctness (rate of right outputs)\n• coverage (% inputs processed)', 'green')
    n(g, 'store','STORAGE\n• durability (P(data loss) < 1e-11)\n• availability + latency\n  (tail-sensitive)', 'gold')
    e(g, 'req',  'pipe', 'differ by\nworkload type', '#94a3b8', 'dashed')
    e(g, 'pipe', 'store')
    g.render(os.path.join(OUT, 'c3-sli-types'), cleanup=True)
    print('Generated: c3-sli-types')

# ── C5: Logs cost decomposition ─────────────────────────────────────
def diag_logs_cost():
    g = base_graph('c5_logs_cost', 'Logs cost — sample at source, drop fields, tier retention')
    n(g, 'app', 'Service\n10K events/sec\n2 KB each\n→ 1.7 GB/min', 'navy')
    n(g, 'sample','Source sampling\n10% normal +\n100% errors\n→ 175 MB/min', 'green')
    n(g, 'drop','Drop fields\n(full bodies, IDs)\n→ 80 MB/min', 'gold')
    n(g, 'tier','Hot tier 7d\n+ Cold S3 90d\n(10x cheaper)', 'purple')
    e(g, 'app', 'sample')
    e(g, 'sample', 'drop')
    e(g, 'drop', 'tier')
    g.render(os.path.join(OUT, 'c5-logs-cost'), cleanup=True)
    print('Generated: c5-logs-cost')

# ── C7: Symptoms vs causes alerting ────────────────────────────────
def diag_symptom_alert():
    g = base_graph('c7_symptom_alert', 'Alert on SYMPTOMS, not causes (SRE Book Ch 6)')
    n(g, 'cause','Cause-based alert\nDB CPU > 90%\n\n→ may not impact users\n→ false positives\n→ alert fatigue', 'red')
    n(g, 'sym',  'Symptom-based alert\np99 latency > 500ms\n\n→ user feels it\n→ actionable\n→ multi-window burn rate', 'green')
    n(g, 'rule', 'Rule:\nWake humans on\nuser pain only.\nDebug causes via\ndashboards.', 'gold')
    e(g, 'cause','rule', 'avoid', '#dc2626', 'dashed')
    e(g, 'sym',  'rule', 'use', '#16a34a')
    g.render(os.path.join(OUT, 'c7-symptom-alert'), cleanup=True)
    print('Generated: c7-symptom-alert')

# ── C8: Dashboard hierarchy ─────────────────────────────────────────
def diag_dashboard_hierarchy():
    g = base_graph('c8_dashboard_hierarchy', 'Dashboard hierarchy — overview → service → resource')
    n(g, 't1', 'Tier 1: Overview\n• SLO panels\n• 30s glance\n• exec / on-call entry', 'navy')
    n(g, 't2', 'Tier 2: Service\n• RED / Golden Signals\n• per-endpoint\n• deploy markers', 'green')
    n(g, 't3', 'Tier 3: Resource\n• USE method\n• per-host CPU/mem\n• PSI pressure metrics', 'gold')
    e(g, 't1', 't2', 'drill into')
    e(g, 't2', 't3', 'drill into')
    g.render(os.path.join(OUT, 'c8-dashboard-hierarchy'), cleanup=True)
    print('Generated: c8-dashboard-hierarchy')

# ── C9: Cardinality bomb ────────────────────────────────────────────
def diag_cardinality_bomb():
    g = base_graph('c9_cardinality_bomb', 'Cardinality bomb — labels × values multiply (Prometheus OOM)')
    n(g, 'safe', 'Safe metric\n{service, route, status, method}\n5 × 100 × 10 × 5\n= 25,000 series', 'green')
    n(g, 'bomb', 'Cardinality bomb\nadd label: user_id\n25,000 × 100,000 users\n= 2.5 BILLION series\n→ Prometheus OOM', 'red')
    n(g, 'fix',  'Fix:\n• drop user_id from metric\n• move to logs / traces\n• use bucketed dimensions\n  (user_tier vs user_id)', 'gold')
    e(g, 'safe', 'bomb', 'add high-cardinality\nlabel', '#dc2626')
    e(g, 'bomb', 'fix',  'mitigate')
    g.render(os.path.join(OUT, 'c9-cardinality-bomb'), cleanup=True)
    print('Generated: c9-cardinality-bomb')

# ── D3: SEV decision tree ───────────────────────────────────────────
def diag_sev_tree():
    g = base_graph('d3_sev_tree', 'SEV1/2/3/4 — quick decision tree')
    n(g, 'q1', 'Many users blocked\nor data loss?', 'navy')
    n(g, 's1', 'SEV-1\nFull IC structure\nStatus page\nLeadership notified', 'red')
    n(g, 'q2', 'Many degraded\nor key feature down?', 'navy')
    n(g, 's2', 'SEV-2\nPage on-call\nStatus page\nIC if needed', 'gold')
    n(g, 'q3', 'Some users / features\naffected (workaround)?', 'navy')
    n(g, 's3', 'SEV-3\nTicket\nBusiness hours fix', 'green')
    n(g, 's4', 'SEV-4\nCosmetic / tooling\nBacklog', 'gray')
    e(g, 'q1', 's1', 'YES')
    e(g, 'q1', 'q2', 'NO')
    e(g, 'q2', 's2', 'YES')
    e(g, 'q2', 'q3', 'NO')
    e(g, 'q3', 's3', 'YES')
    e(g, 'q3', 's4', 'NO (cosmetic)')
    g.render(os.path.join(OUT, 'd3-sev-tree'), cleanup=True)
    print('Generated: d3-sev-tree')

# ── D4: Five Whys vs Contributing Factors ──────────────────────────
def diag_five_whys():
    g = base_graph('d4_five_whys', 'Five Whys vs Contributing Factors — modern human-factors view')
    n(g, '5w', 'Five Whys (Toyota, 1970s)\n5 layers of "why?"\n→ ONE root cause\n→ linear chain\n\nLimits: hindsight bias,\nfalse precision', 'gold')
    n(g, 'cf', 'Contributing Factors\n(Sidney Dekker 2014+)\nList ALL conditions that\nhad to be true:\n• bad code\n• missing CI test\n• alert too late\n• runbook gap\n• capacity buffer thin', 'green')
    n(g, 'use','Pragmatic use:\n• Five Whys for brainstorming\n• Document as factors\n• Action items target\n  multiple factors', 'navy')
    e(g, '5w', 'cf', 'evolves to')
    e(g, '5w', 'use', 'as input')
    e(g, 'cf', 'use', 'as output')
    g.render(os.path.join(OUT, 'd4-five-whys'), cleanup=True)
    print('Generated: d4-five-whys')

# ── D6: Status page comm cadence ────────────────────────────────────
def diag_status_cadence():
    g = base_graph('d6_status_cadence', 'Incident comm — 15-min cadence + structured updates')
    n(g, 't0',  'T+0 detection\n• Identifying\n• Acknowledged in 5 min', 'red')
    n(g, 't15', 'T+15 update\n• Investigating\n• Hypothesis: X\n• ETA: TBD', 'gold')
    n(g, 't30', 'T+30 update\n• Cause identified\n• Mitigation in progress\n• ETA: 14:45', 'navy')
    n(g, 'res', 'Resolved\n• Final status\n• No data loss\n• Postmortem in 5d', 'green')
    e(g, 't0',  't15', 'every 15 min')
    e(g, 't15', 't30')
    e(g, 't30', 'res')
    g.render(os.path.join(OUT, 'd6-status-cadence'), cleanup=True)
    print('Generated: d6-status-cadence')

# ── D7: Game day → Chaos maturity ───────────────────────────────────
def diag_chaos_maturity():
    g = base_graph('d7_chaos_maturity', 'Failure-practice maturity — game day → chaos → DiRT')
    n(g, 'l1', 'Level 1: Tabletop\nWalk through scenarios.\nNo prod impact.', 'gray')
    n(g, 'l2', 'Level 2: Game day\nManual fail injection\nin staging.', 'green')
    n(g, 'l3', 'Level 3: Chaos Monkey\nRandom prod kill\n(Netflix, 2010).', 'gold')
    n(g, 'l4', 'Level 4: Tail experiments\nRegion drains, AZ failure,\ncompound failures.', 'red')
    n(g, 'l5', 'Level 5: DiRT week\nCompany-wide annual\ndisaster sim.', 'purple')
    e(g, 'l1', 'l2')
    e(g, 'l2', 'l3')
    e(g, 'l3', 'l4')
    e(g, 'l4', 'l5')
    g.render(os.path.join(OUT, 'd7-chaos-maturity'), cleanup=True)
    print('Generated: d7-chaos-maturity')

# ── E1: Toil 6 properties ───────────────────────────────────────────
def diag_toil_six():
    g = base_graph('e1_toil_six', 'Toil — 6 properties (all must be true)')
    n(g, 'toil', 'TOIL =', 'navy')
    n(g, 'p1', 'manual', 'gold')
    n(g, 'p2', 'repetitive', 'gold')
    n(g, 'p3', 'automatable', 'gold')
    n(g, 'p4', 'tactical\n(reactive)', 'gold')
    n(g, 'p5', 'no enduring\nvalue', 'gold')
    n(g, 'p6', 'scales linearly\nwith service', 'gold')
    e(g, 'toil', 'p1', 'AND')
    e(g, 'toil', 'p2', 'AND')
    e(g, 'toil', 'p3', 'AND')
    e(g, 'toil', 'p4', 'AND')
    e(g, 'toil', 'p5', 'AND')
    e(g, 'toil', 'p6', 'AND')
    g.render(os.path.join(OUT, 'e1-toil-six'), cleanup=True)
    print('Generated: e1-toil-six')

# ── E2: IaC tool comparison ─────────────────────────────────────────
def diag_iac_compare():
    g = base_graph('e2_iac_compare', 'IaC landscape — Terraform vs Pulumi vs Crossplane vs CDK')
    n(g, 'tf', 'Terraform / OpenTofu\nHCL declarative\nState file\nMulti-cloud\nDe-facto standard', 'navy')
    n(g, 'pl', 'Pulumi\nReal languages\n(TS, Go, Python)\nState file\nFor code-heavy teams', 'green')
    n(g, 'cx', 'Crossplane\nKubernetes-native\nCRDs as IaC\nGitOps-friendly\nContinuous reconcile', 'gold')
    n(g, 'cdk','AWS CDK\nTypeScript / Python\nSynthesizes CloudFormation\nAWS-only\nTight integration', 'purple')
    e(g, 'tf', 'pl', 'similar model,\nreal language')
    e(g, 'tf', 'cx', 'K8s-native\nGitOps')
    e(g, 'tf', 'cdk','single-cloud\nlock-in')
    g.render(os.path.join(OUT, 'e2-iac-compare'), cleanup=True)
    print('Generated: e2-iac-compare')

# ── E4: GitOps 4 principles ─────────────────────────────────────────
def diag_gitops():
    g = base_graph('e4_gitops', 'GitOps 4 principles (Weaveworks 2017)')
    n(g, 'p1', 'Declarative\nstate as YAML/HCL', 'green')
    n(g, 'p2', 'Versioned & immutable\ngit log = audit', 'navy')
    n(g, 'p3', 'Pulled automatically\nagent in cluster\n(not pushed)', 'gold')
    n(g, 'p4', 'Continuously\nreconciled\n(drift correction)', 'red')
    n(g, 'tools','Tools:\nArgo CD (Web UI)\nFlux (lightweight)', 'purple')
    e(g, 'p1', 'p2')
    e(g, 'p2', 'p3')
    e(g, 'p3', 'p4')
    e(g, 'p4', 'tools', 'implemented by')
    g.render(os.path.join(OUT, 'e4-gitops'), cleanup=True)
    print('Generated: e4-gitops')

# ── E5: Self-healing layers ─────────────────────────────────────────
def diag_self_healing():
    g = base_graph('e5_self_healing', 'Self-healing layers — 6 levels of automated recovery')
    n(g, 'l1', 'L1 Process\nliveness probe\nauto-restart', 'green')
    n(g, 'l2', 'L2 Instance\nhealth check\nLB removes / replaces', 'green')
    n(g, 'l3', 'L3 Capacity\nautoscaler\n(HPA / Karpenter / KEDA)', 'navy')
    n(g, 'l4', 'L4 Topology\nregion / AZ failover\nDNS / Anycast', 'gold')
    n(g, 'l5', 'L5 Application\ncircuit breakers\nbulkheads / fallback', 'gold')
    n(g, 'l6', 'L6 Runbook automation\nauto-remediate known\npatterns (Rundeck, Lambda)', 'red')
    e(g, 'l1', 'l2')
    e(g, 'l2', 'l3')
    e(g, 'l3', 'l4')
    e(g, 'l4', 'l5')
    e(g, 'l5', 'l6')
    g.render(os.path.join(OUT, 'e5-self-healing'), cleanup=True)
    print('Generated: e5-self-healing')

# ── F1: Capacity planning loop ──────────────────────────────────────
def diag_capacity_loop():
    g = base_graph('f1_capacity_loop', 'Capacity planning — forecast → provision → reconcile')
    n(g, 'fc', 'Forecast\n(historic + business inputs)\nperiod, growth, events', 'navy')
    n(g, 'pv', 'Provision\nresources, reservations,\nbuffer for failure-mode', 'green')
    n(g, 'rc', 'Reconcile\nactual vs forecast\nadjust model', 'gold')
    e(g, 'fc', 'pv')
    e(g, 'pv', 'rc')
    e(g, 'rc', 'fc', 'iterate', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'f1-capacity-loop'), cleanup=True)
    print('Generated: f1-capacity-loop')

# ── F2: Forecasting hierarchy ───────────────────────────────────────
def diag_forecast():
    g = base_graph('f2_forecast', 'Forecasting hierarchy — fit complexity to need')
    n(g, 'l1', 'Linear extrapolation\n(steady growth)', 'green')
    n(g, 'l2', 'Linear + seasonality\n(daily / weekly / yearly)\n← 80% of cases', 'green')
    n(g, 'l3', 'Holt-Winters / ARIMA\n(statistical TS)', 'navy')
    n(g, 'l4', 'Prophet (Facebook)\n(holidays + trend changes)', 'gold')
    n(g, 'l5', 'ML (LSTM, Transformer)\n(rarely needed)', 'red')
    e(g, 'l1', 'l2')
    e(g, 'l2', 'l3')
    e(g, 'l3', 'l4')
    e(g, 'l4', 'l5')
    g.render(os.path.join(OUT, 'f2-forecast'), cleanup=True)
    print('Generated: f2-forecast')

# ── F4: Autoscaling layers ──────────────────────────────────────────
def diag_autoscale_layers():
    g = base_graph('f4_autoscale', 'Autoscaling — pick layer by signal')
    n(g, 'pod', 'HPA (pod count)\nCPU / memory /\ncustom metric', 'navy')
    n(g, 'res', 'VPA (resources)\nrightsize requests/limits', 'green')
    n(g, 'event','KEDA (event-driven)\nKafka lag, SQS depth,\nPub/Sub messages', 'gold')
    n(g, 'node','Karpenter (nodes)\nspin up specific\ninstance types\nin 30-60s', 'red')
    n(g, 'pred','Predictive (AWS / GCP)\nML-driven pre-scaling\nfor known peaks', 'purple')
    e(g, 'pod', 'event', 'switch for\nasync work')
    e(g, 'pod', 'node', 'pod pressure\n→ node pressure')
    e(g, 'pod', 'pred', 'combine for\npredictable peaks')
    g.render(os.path.join(OUT, 'f4-autoscale'), cleanup=True)
    print('Generated: f4-autoscale')

# ── F5: Cost-of-9s curve ────────────────────────────────────────────
def diag_cost_curve():
    g = base_graph('f5_cost_curve', 'Cost-of-9s — each additional 9 ~= 10x engineering investment')
    n(g, 'n1', '99%\n3.65 d/yr down\nbase cost', 'green')
    n(g, 'n2', '99.9%\n8h 45m\n~10x', 'navy')
    n(g, 'n3', '99.95%\n4h 22m\n~30x', 'gold')
    n(g, 'n4', '99.99%\n52 min\n~100x', 'red')
    n(g, 'n5', '99.999%\n5 min\n~1000x\n(rare; reserved)', 'purple')
    e(g, 'n1', 'n2', '×10')
    e(g, 'n2', 'n3', '×3')
    e(g, 'n3', 'n4', '×3')
    e(g, 'n4', 'n5', '×10')
    g.render(os.path.join(OUT, 'f5-cost-curve'), cleanup=True)
    print('Generated: f5-cost-curve')

# ── F6: DB connection pool ──────────────────────────────────────────
def diag_db_pool():
    g = base_graph('f6_db_pool', 'DB connection pool — bulkhead per workload')
    n(g, 'app', 'App tier\n(many instances)', 'gray')
    n(g, 'pgb', 'PgBouncer / RDS Proxy\n(transaction pooling\n10-50x effective\nconnection multiplier)', 'navy')
    n(g, 'user','User pool\n50 conn\n(latency-critical)', 'green')
    n(g, 'admin','Admin pool\n10 conn\n(reports, dashboards)', 'gold')
    n(g, 'batch','Batch pool\n5 conn\n(ETL, exports)', 'purple')
    n(g, 'db',  'Postgres\nmax_connections=100', 'red')
    e(g, 'app', 'pgb')
    e(g, 'pgb', 'user')
    e(g, 'pgb', 'admin')
    e(g, 'pgb', 'batch')
    e(g, 'user','db')
    e(g, 'admin','db')
    e(g, 'batch','db')
    g.render(os.path.join(OUT, 'f6-db-pool'), cleanup=True)
    print('Generated: f6-db-pool')

# ── G3: Retry storm vs jitter ───────────────────────────────────────
def diag_retry_storm():
    g = base_graph('g3_retry_storm', 'Retry storm — without vs with jittered backoff')
    n(g, 'fail', 'Service blip\n5s outage\n10K clients hit error', 'red')
    n(g, 'sync', 'WITHOUT jitter\nall 10K retry @ T+200ms\n→ thunder herd\n→ outage extends', 'red')
    n(g, 'jitter','WITH AWS Full Jitter\nwait = random(0, base × 2^n)\n→ retries spread\n→ service recovers', 'green')
    e(g, 'fail', 'sync',  '× synchronized', '#dc2626')
    e(g, 'fail', 'jitter','✓ spread out', '#16a34a')
    g.render(os.path.join(OUT, 'g3-retry-storm'), cleanup=True)
    print('Generated: g3-retry-storm')

# ── G4: Load shedding levels ────────────────────────────────────────
def diag_load_shed():
    g = base_graph('g4_load_shed', 'Load shedding — tag by priority, drop low first')
    n(g, 'norm', 'Normal\nall served', 'green')
    n(g, 'lvl1', '70-80% load\nshed LOW priority\n(prefetch, analytics)', 'gold')
    n(g, 'lvl2', '80-90% load\nshed NORMAL\n(anonymous users)', 'red')
    n(g, 'lvl3', '90%+ load\nshed HIGH\nKEEP CRITICAL\n(auth, payment confirm)', 'purple')
    e(g, 'norm', 'lvl1')
    e(g, 'lvl1', 'lvl2')
    e(g, 'lvl2', 'lvl3')
    g.render(os.path.join(OUT, 'g4-load-shed'), cleanup=True)
    print('Generated: g4-load-shed')

# ── G5: Idempotency key sequence ────────────────────────────────────
def diag_idempotency():
    g = base_graph('g5_idempotency', 'Idempotency key — Stripe-style payment dedup')
    n(g, 'cli', 'Client\ngenerates UUID\nfor operation', 'navy')
    n(g, 'srv', 'Server', 'green')
    n(g, 'lkup','Dedup table\n(Redis / DB)\nTTL 24h', 'gold')
    n(g, 'pay', 'Payment\nprocessor', 'red')
    e(g, 'cli', 'srv', 'POST /charges\nIdempotency-Key:\nabc-123')
    e(g, 'srv', 'lkup','lookup key')
    e(g, 'lkup','srv', 'not found →\nprocess')
    e(g, 'srv', 'pay', 'charge')
    e(g, 'srv', 'lkup','store result\n(key, response)', '#94a3b8', 'dashed')
    e(g, 'srv', 'cli', 'response')
    g.render(os.path.join(OUT, 'g5-idempotency'), cleanup=True)
    print('Generated: g5-idempotency')

# ── G6: Bulkhead thread pools ───────────────────────────────────────
def diag_bulkhead():
    g = base_graph('g6_bulkhead', 'Bulkhead — per-dependency thread pool')
    n(g, 'svc', 'Service A\n100 threads', 'navy')
    n(g, 'pb',  'Pool B\n30 threads', 'green')
    n(g, 'pc',  'Pool C\n30 threads', 'green')
    n(g, 'pd',  'Pool D\n30 threads', 'green')
    n(g, 'rsv', 'Reserve\n10 threads', 'gold')
    n(g, 'depB','Dep B\n(slow!)', 'red')
    n(g, 'depC','Dep C\nfast', 'green')
    n(g, 'depD','Dep D\nfast', 'green')
    e(g, 'svc', 'pb')
    e(g, 'svc', 'pc')
    e(g, 'svc', 'pd')
    e(g, 'svc', 'rsv', 'spare')
    e(g, 'pb',  'depB','blocks pool', '#dc2626')
    e(g, 'pc',  'depC','OK', '#16a34a')
    e(g, 'pd',  'depD','OK', '#16a34a')
    g.render(os.path.join(OUT, 'g6-bulkhead'), cleanup=True)
    print('Generated: g6-bulkhead')

# ── G7: Graceful degradation patterns ──────────────────────────────
def diag_graceful_deg():
    g = base_graph('g7_graceful_deg', 'Graceful degradation — 3 patterns')
    n(g, 'cache','Cached fallback\n"return last-known-good"\nwith stale=true', 'green')
    n(g, 'partial','Partial response\n"omit recommendations,\nshow product page"', 'gold')
    n(g, 'default','Default response\n"return generic\nbest-sellers list"', 'navy')
    n(g, 'fail','vs Hard fail\n5xx\n(reserved for\nauth, payment, integrity)', 'red')
    e(g, 'cache',  'fail', '× when needed')
    e(g, 'partial','fail', '× when needed')
    e(g, 'default','fail', '× when needed')
    g.render(os.path.join(OUT, 'g7-graceful-deg'), cleanup=True)
    print('Generated: g7-graceful-deg')

# ── G8: Deadline propagation ────────────────────────────────────────
def diag_deadline():
    g = base_graph('g8_deadline', 'Deadline propagation — gRPC context (SRE Book Ch 22)')
    n(g, 'usr', 'User\n2.0s timeout', 'navy')
    n(g, 'gw',  'Gateway\nuses 50ms\nremaining: 1.95s', 'green')
    n(g, 'svcA','Service A\nuses 100ms\nremaining: 1.85s', 'gold')
    n(g, 'svcB','Service B\nremaining: 1.8s\n(declines if work\nwon\'t fit budget)', 'red')
    e(g, 'usr', 'gw',  'deadline 2.0s')
    e(g, 'gw',  'svcA','deadline 1.95s')
    e(g, 'svcA','svcB','deadline 1.85s')
    g.render(os.path.join(OUT, 'g8-deadline'), cleanup=True)
    print('Generated: g8-deadline')

# ── H2: SRE team models ─────────────────────────────────────────────
def diag_team_models():
    g = base_graph('h2_team_models', 'SRE team models — pick by scale')
    n(g, 'em', 'Embedded SRE\n1-3 SREs/product\nDeep context\n10-50 eng', 'green')
    n(g, 'cn', 'Centralized SRE\n1 team many products\nConsistent practice\n50-200 eng', 'navy')
    n(g, 'pl', 'Platform SRE\nOwns K8s, observability,\nCI/CD foundations\n200+ eng', 'gold')
    n(g, 'hy', 'Hybrid (most common)\nPlatform + embedded for\ncritical + central for\ncross-cutting\n500+ eng', 'red')
    e(g, 'em', 'cn', 'scale up')
    e(g, 'cn', 'pl', 'scale up')
    e(g, 'pl', 'hy', 'scale up')
    g.render(os.path.join(OUT, 'h2-team-models'), cleanup=True)
    print('Generated: h2-team-models')

# ── H3: Runbook structure ───────────────────────────────────────────
def diag_runbook():
    g = base_graph('h3_runbook', 'Runbook structure — scannable at 3am')
    n(g, '1', '1. One-line summary\n(searchable, in alert)', 'navy')
    n(g, '2', '2. Pre-conditions\n(when this fires)', 'gold')
    n(g, '3', '3. Initial diagnosis\n(60-second triage)', 'green')
    n(g, '4', '4. Decision tree\n(if X → A, if Y → B)', 'navy')
    n(g, '5', '5. Mitigation\n(copy-paste commands)', 'red')
    n(g, '6', '6. Verification\n(metric returned to normal)', 'green')
    n(g, '7', '7. Escalation\n(who to page; what to share)', 'gold')
    e(g, '1', '2')
    e(g, '2', '3')
    e(g, '3', '4')
    e(g, '4', '5')
    e(g, '5', '6')
    e(g, '6', '7')
    g.render(os.path.join(OUT, 'h3-runbook'), cleanup=True)
    print('Generated: h3-runbook')

# ── H4: Pager protocol 10-min ───────────────────────────────────────
def diag_pager_protocol():
    g = base_graph('h4_pager_protocol', 'Pager protocol — first 10 minutes')
    n(g, 't0', 'T+0\nack via PD app\n(stops escalation)', 'red')
    n(g, 't1', 'T+1-2\nopen incident channel\n"got it; investigating"', 'gold')
    n(g, 't2', 'T+2-5\ndashboard + runbook\nverify alert is real', 'navy')
    n(g, 't5', 'T+5-7\ndecision:\nmitigate / IC / escalate', 'green')
    n(g, 't7', 'T+7-10\nexecute path\nstatus update Slack', 'green')
    e(g, 't0', 't1')
    e(g, 't1', 't2')
    e(g, 't2', 't5')
    e(g, 't5', 't7')
    g.render(os.path.join(OUT, 'h4-pager-protocol'), cleanup=True)
    print('Generated: h4-pager-protocol')

# ── H5: On-call sustainability ──────────────────────────────────────
def diag_oncall_health():
    g = base_graph('h5_oncall_health', 'On-call sustainability — measure + remediate')
    n(g, 'm', 'Measure\npages/shift\nincident time %\nattrition signals', 'navy')
    n(g, 'a', 'Audit\ntop noisy services\n(80% pages from\n20% services)', 'gold')
    n(g, 'k', 'Kill noisy alerts\n(>3x w/o action\n→ delete)', 'red')
    n(g, 'r', 'Reduce recurrences\n(ship postmortem\naction items)', 'green')
    n(g, 'h', 'Hand-back valve\n(SRE refuses services\nbelow quality bar)', 'purple')
    e(g, 'm', 'a')
    e(g, 'a', 'k')
    e(g, 'a', 'r')
    e(g, 'r', 'h', 'if structural', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'h5-oncall-health'), cleanup=True)
    print('Generated: h5-oncall-health')

# ── I1: Reliability + Security overlap ─────────────────────────────
def diag_rel_sec():
    g = base_graph('i1_rel_sec', 'Reliability + Security — shared engineering primitives')
    n(g, 'rel', 'Reliability\n• capacity\n• failure recovery\n• graceful degrade', 'green')
    n(g, 'shared','Shared\n• Defense in depth\n• Least privilege\n• Audit logging\n• Incident command\n• Game days', 'gold')
    n(g, 'sec', 'Security\n• confidentiality\n• threat models\n• adversaries', 'red')
    e(g, 'rel', 'shared')
    e(g, 'sec', 'shared')
    g.render(os.path.join(OUT, 'i1-rel-sec'), cleanup=True)
    print('Generated: i1-rel-sec')

# ── I2: Secret management — dynamic ────────────────────────────────
def diag_dynamic_secrets():
    g = base_graph('i2_dynamic_secrets', 'Dynamic secrets — Vault DB plugin pattern')
    n(g, 'svc', 'Service\nstartup', 'navy')
    n(g, 'v',   'Vault\n(brokers credentials)', 'gold')
    n(g, 'db',  'Postgres\n(creates short-lived\nrole per request)', 'green')
    n(g, 'leak','Compromise window\n= 1 hour max\n(vs static creds:\nyear+)', 'red')
    e(g, 'svc', 'v',   'request creds')
    e(g, 'v',   'db',  'CREATE USER\nsvc-abc\n(TTL 1h)')
    e(g, 'v',   'svc', 'creds + cert')
    e(g, 'db',  'leak','expires after 1h')
    g.render(os.path.join(OUT, 'i2-dynamic-secrets'), cleanup=True)
    print('Generated: i2-dynamic-secrets')

# ── I3: Zero Trust BeyondCorp ───────────────────────────────────────
def diag_zero_trust():
    g = base_graph('i3_zero_trust', 'Zero Trust — BeyondCorp identity-aware proxy')
    n(g, 'usr', 'User\n+ MFA\n+ Device cert', 'navy')
    n(g, 'iap', 'Identity-Aware Proxy\n(IAP / Verified Access /\nCloudflare Access)\nVerifies on EVERY request', 'gold')
    n(g, 'svc', 'Service\n(no VPN, no perimeter)', 'green')
    n(g, 'ms',  'Service mesh (mTLS)\n+ microsegmentation', 'green')
    n(g, 'audit','Audit log\n(immutable)', 'red')
    e(g, 'usr', 'iap', 'request')
    e(g, 'iap', 'svc', 'authorized')
    e(g, 'svc', 'ms',  'service-to-service')
    e(g, 'iap', 'audit','log every check')
    g.render(os.path.join(OUT, 'i3-zero-trust'), cleanup=True)
    print('Generated: i3-zero-trust')

# ── I4: SLSA supply chain levels ────────────────────────────────────
def diag_slsa():
    g = base_graph('i4_slsa', 'SLSA — Supply chain levels for software artifacts')
    n(g, 'l1', 'L1 Documented\nbuild process\n(any modern CI)', 'gray')
    n(g, 'l2', 'L2 Tamper resistant\nsigned provenance\n(GitHub Actions + Sigstore)', 'green')
    n(g, 'l3', 'L3 Hermetic build\nisolated runners\nfull metadata', 'gold')
    n(g, 'l4', 'L4 Two-party review\n+ reproducible build\n(highest assurance)', 'red')
    n(g, 'tools','Tools:\nSigstore (cosign)\nin-toto attestations\nSBOM (syft / grype)', 'navy')
    e(g, 'l1', 'l2')
    e(g, 'l2', 'l3')
    e(g, 'l3', 'l4')
    e(g, 'l2', 'tools', 'implemented via')
    g.render(os.path.join(OUT, 'i4-slsa'), cleanup=True)
    print('Generated: i4-slsa')

# ── I5: NIST 4 phases ───────────────────────────────────────────────
def diag_nist_phases():
    g = base_graph('i5_nist_phases', 'NIST 800-61 — Security incident response')
    n(g, 'p1', '1. Preparation\nplan, tools, runbooks,\ngame days, contacts', 'navy')
    n(g, 'p2', '2. Detection &\nAnalysis\nSIEM, EDR, IDS', 'gold')
    n(g, 'p3', '3. Containment /\nEradication /\nRecovery', 'red')
    n(g, 'p4', '4. Post-incident\nlessons learned,\ndisclosure', 'green')
    e(g, 'p1', 'p2')
    e(g, 'p2', 'p3')
    e(g, 'p3', 'p4')
    e(g, 'p4', 'p1', 'iterate', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'i5-nist-phases'), cleanup=True)
    print('Generated: i5-nist-phases')


if __name__ == '__main__':
    diag_sli_slo_sla()
    diag_burn_rate()
    diag_redundancy()
    diag_dr_strategies()
    diag_rto_rpo()
    diag_multi_cloud()
    diag_three_pillars()
    diag_red_use()
    diag_prom_stack()
    diag_trace_waterfall()
    diag_incident_roles()
    diag_postmortem_flow()
    diag_cicd_pipeline()
    diag_load_testing()
    diag_circuit_breaker()
    diag_cascading_failure()
    diag_oncall_rotation()
    diag_sli_formula()
    diag_slo_tiers()
    diag_sli_slo_sla_example()
    diag_error_budget_calc()
    diag_error_budget_policy()
    diag_mttr_timeline()
    diag_availability_formula()
    diag_sre_vs_devops()
    diag_cuj()
    diag_toil_split()
    diag_risk_velocity()
    diag_nalsd()
    diag_latency_budget()
    diag_raft()
    diag_sli_types()
    diag_logs_cost()
    diag_symptom_alert()
    diag_dashboard_hierarchy()
    diag_cardinality_bomb()
    diag_sev_tree()
    diag_five_whys()
    diag_status_cadence()
    diag_chaos_maturity()
    diag_toil_six()
    diag_iac_compare()
    diag_gitops()
    diag_self_healing()
    diag_capacity_loop()
    diag_forecast()
    diag_autoscale_layers()
    diag_cost_curve()
    diag_db_pool()
    diag_retry_storm()
    diag_load_shed()
    diag_idempotency()
    diag_bulkhead()
    diag_graceful_deg()
    diag_deadline()
    diag_team_models()
    diag_runbook()
    diag_pager_protocol()
    diag_oncall_health()
    diag_rel_sec()
    diag_dynamic_secrets()
    diag_zero_trust()
    diag_slsa()
    diag_nist_phases()
    print('SRE diagrams complete (62 diagrams across 9 sub-categories).')
