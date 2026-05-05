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
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.5', nodesep='0.7', ranksep='0.9',
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
    print('SRE diagrams batches 1-9 complete (24 diagrams).')
