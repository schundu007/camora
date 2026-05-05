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


if __name__ == '__main__':
    diag_sli_slo_sla()
    diag_burn_rate()
    diag_redundancy()
    diag_dr_strategies()
    diag_rto_rpo()
    diag_multi_cloud()
    print('SRE diagrams batches 1-2 complete.')
