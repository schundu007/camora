#!/usr/bin/env python3
"""Generate missing diagrams for Netflix algorithm approaches."""
import graphviz, os

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue', fontsize='12', penwidth='1.5', height='0.45', margin='0.15,0.08')
EDGE = dict(fontname='Helvetica Neue', fontsize='10', penwidth='1.5')
C = {
    'blue': ('#dbeafe','#3b82f6','#1e40af'), 'green': ('#dcfce7','#22c55e','#166534'),
    'yellow': ('#fef3c7','#f59e0b','#92400e'), 'purple': ('#e0e7ff','#6366f1','#3730a3'),
    'pink': ('#fce7f3','#ec4899','#9d174d'), 'orange': ('#ffedd5','#f97316','#9a3412'),
    'teal': ('#ccfbf1','#14b8a6','#115e59'), 'red': ('#fee2e2','#ef4444','#991b1b'),
}
def n(g, nm, label, c): g.node(nm, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)
def e(g, a, b, label='', color='#475569', style='solid'): g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)
def mk(out_dir, **kw):
    os.makedirs(out_dir, exist_ok=True)
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.6', ranksep='0.7', splines='spline', **kw)
    return g

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams')

# Netflix algo: CDN Routing
def netflix_cdn():
    OUT = os.path.join(BASE, 'netflix')
    g = mk(OUT, rankdir='LR', label='  CDN Node Selection (Consistent Hashing)  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'client', 'Client\nRequest', 'blue')
    n(g, 'steer', 'CDN Steering\n(hash client IP)', 'green')
    n(g, 'oca1', 'OCA 1\n(ISP local)', 'red')
    n(g, 'oca2', 'OCA 2\n(IX point)', 'red')
    n(g, 'oca3', 'OCA 3\n(backup)', 'orange')
    e(g, 'client', 'steer', 'play\nrequest', '#3b82f6')
    e(g, 'steer', 'oca1', 'closest +\nhealthiest', '#ef4444')
    e(g, 'steer', 'oca2', 'fallback', '#f97316', 'dashed')
    e(g, 'steer', 'oca3', 'last resort', '#f97316', 'dashed')
    g.render(os.path.join(OUT, 'algo-cdn-routing'), cleanup=True)

# Netflix algo: Recommendation
def netflix_rec():
    OUT = os.path.join(BASE, 'netflix')
    g = mk(OUT, rankdir='LR', label='  Two-Stage Recommendation Pipeline  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'user', 'User\nProfile', 'blue')
    n(g, 'candidate', 'Candidate\nGeneration\n(1000s)', 'green')
    n(g, 'rank', 'Deep Ranking\nModel', 'purple')
    n(g, 'rerank', 'Business Rules\n+ Diversity', 'orange')
    n(g, 'page', 'Personalized\nHome Page', 'blue')
    e(g, 'user', 'candidate', 'embedding', '#22c55e')
    e(g, 'candidate', 'rank', '~1000', '#6366f1')
    e(g, 'rank', 'rerank', 'scored', '#f97316')
    e(g, 'rerank', 'page', 'final\nranked rows', '#3b82f6')
    g.render(os.path.join(OUT, 'algo-recommendation'), cleanup=True)

# Netflix algo: ABR
def netflix_abr():
    OUT = os.path.join(BASE, 'netflix')
    g = mk(OUT, rankdir='LR', label='  Buffer-Based ABR Algorithm  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'buffer', 'Buffer Level\n(seconds)', 'yellow')
    n(g, 'bw', 'Bandwidth\nEstimate', 'green')
    n(g, 'algo', 'ABR\nDecision\n(quality ↕)', 'purple')
    n(g, 'up', 'Increase\nBitrate', 'green')
    n(g, 'down', 'Decrease\nBitrate', 'red')
    n(g, 'stable', 'Hold\nCurrent', 'blue')
    e(g, 'buffer', 'algo', 'buffer\n> 10s', '#f59e0b')
    e(g, 'bw', 'algo', 'bandwidth\nstable', '#22c55e')
    e(g, 'algo', 'up', 'buffer high\n+ BW good', '#22c55e')
    e(g, 'algo', 'down', 'buffer low\nor BW drop', '#ef4444')
    e(g, 'algo', 'stable', 'steady\nstate', '#3b82f6', 'dashed')
    g.render(os.path.join(OUT, 'algo-abr'), cleanup=True)

# Netflix algo: Matrix Factorization
def netflix_mf():
    OUT = os.path.join(BASE, 'netflix')
    g = mk(OUT, rankdir='LR', label='  Collaborative Filtering (Matrix Factorization)  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'matrix', 'User × Item\nRatings Matrix\n(sparse)', 'blue')
    n(g, 'decompose', 'SVD / ALS\nDecomposition', 'purple')
    n(g, 'user_vec', 'User\nEmbeddings\n(k dims)', 'green')
    n(g, 'item_vec', 'Item\nEmbeddings\n(k dims)', 'orange')
    n(g, 'predict', 'Dot Product\n= Predicted\nRating', 'teal')
    e(g, 'matrix', 'decompose', 'factorize', '#6366f1')
    e(g, 'decompose', 'user_vec', '', '#22c55e')
    e(g, 'decompose', 'item_vec', '', '#f97316')
    e(g, 'user_vec', 'predict', 'user k', '#14b8a6')
    e(g, 'item_vec', 'predict', 'item k', '#14b8a6')
    g.render(os.path.join(OUT, 'algo-matrix-factorization'), cleanup=True)

if __name__ == '__main__':
    for fn in [netflix_cdn, netflix_rec, netflix_abr, netflix_mf]:
        fn(); print(f'OK: {fn.__name__}')
    print('Done — 4 Netflix algorithm diagrams')
