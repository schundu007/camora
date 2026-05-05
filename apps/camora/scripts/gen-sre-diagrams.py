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


if __name__ == '__main__':
    diag_sli_slo_sla()
    diag_burn_rate()
    print('SRE diagrams batch 1 complete.')
