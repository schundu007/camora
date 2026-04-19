#!/usr/bin/env python3
"""Generate Connection Request Flow and Job Recommendation Pipeline diagrams for LinkedIn."""
import graphviz, os

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams')

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue', fontsize='12', penwidth='1.5', height='0.45', margin='0.15,0.08')
EDGE = dict(fontname='Helvetica Neue', fontsize='10', penwidth='1.5')
C = {
    'blue': ('#dbeafe','#3b82f6','#1e40af'), 'green': ('#dcfce7','#22c55e','#166534'),
    'yellow': ('#fef3c7','#f59e0b','#92400e'), 'purple': ('#e0e7ff','#6366f1','#3730a3'),
    'pink': ('#fce7f3','#ec4899','#9d174d'), 'orange': ('#ffedd5','#f97316','#9a3412'),
    'teal': ('#ccfbf1','#14b8a6','#115e59'), 'gray': ('#f3f4f6','#6b7280','#374151'),
    'red': ('#fee2e2','#ef4444','#991b1b'),
}
def n(g, nm, label, c): g.node(nm, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)
def e(g, a, b, label='', color='#475569', style='solid'): g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)
def mk(out, name, title, **kw):
    os.makedirs(out, exist_ok=True)
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.6', ranksep='0.7', splines='spline',
           label=f'  {title}  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b', **kw)
    return g, os.path.join(out, name)

# ── CONNECTION REQUEST FLOW ──
def connection_request():
    OUT = os.path.join(BASE, 'linkedin')
    g, path = mk(OUT, 'flow-connection-request', 'Connection Request Flow', rankdir='LR')
    n(g, 'member_a', 'Member A\nClicks Connect', 'blue')
    n(g, 'spam', 'Spam Check\n(100/week limit,\nmessage quality)', 'red')
    n(g, 'notify', 'Notification\nService\n(push + inbox)', 'orange')
    n(g, 'member_b', 'Member B\nAccepts', 'blue')
    n(g, 'graph', 'Graph Store\n(add bidirectional\nedge A↔B)', 'purple')
    n(g, 'merge', 'Network Merge\n(update 2nd-degree\nconnections)', 'teal')
    n(g, 'feed', 'Feed Service\n(A and B see\neach other\'s posts)', 'green')
    n(g, 'pymk', 'PYMK Refresh\n(re-compute\nPeople You\nMay Know)', 'yellow')
    e(g, 'member_a', 'spam', '① send request', '#3b82f6')
    e(g, 'spam', 'notify', '② passes check', '#ef4444')
    e(g, 'notify', 'member_b', '③ notify B', '#f97316')
    e(g, 'member_b', 'graph', '④ accept', '#3b82f6')
    e(g, 'graph', 'merge', '⑤ update graph', '#6366f1')
    e(g, 'merge', 'feed', '⑥ merge networks', '#14b8a6')
    e(g, 'merge', 'pymk', '⑦ async refresh', '#f59e0b', 'dashed')
    g.render(path, cleanup=True)
    print(f'  ✓ {path}.png')

# ── JOB RECOMMENDATION PIPELINE ──
def job_recommendation():
    OUT = os.path.join(BASE, 'linkedin')
    g, path = mk(OUT, 'flow-job-recommendation', 'Job Recommendation Pipeline', rankdir='LR')
    n(g, 'profile', 'Member Profile\n(skills, experience,\nlocation, industry)', 'blue')
    n(g, 'extract', 'Feature\nExtraction\n(NLP + embeddings)', 'purple')
    n(g, 'candidate', 'Candidate\nGeneration\n(retrieve 1000\njobs from index)', 'teal')
    n(g, 'ml', 'ML Scoring\n(predict apply +\nhire probability)', 'orange')
    n(g, 'social', 'Social Boost\n(boost jobs at\nconnection companies)', 'green')
    n(g, 'diversity', 'Diversity Filter\n(mix of industries,\ncompany sizes)', 'yellow')
    n(g, 'cache', 'Cache Top 100\n(per-member cache,\nrefresh daily)', 'pink')
    e(g, 'profile', 'extract', '① extract features', '#3b82f6')
    e(g, 'extract', 'candidate', '② query index', '#6366f1')
    e(g, 'candidate', 'ml', '③ score 1000\ncandidates', '#f97316')
    e(g, 'ml', 'social', '④ apply social\nsignals', '#22c55e')
    e(g, 'social', 'diversity', '⑤ diversity\nconstraints', '#f59e0b')
    e(g, 'diversity', 'cache', '⑥ cache ranked\nresults', '#ec4899')
    g.render(path, cleanup=True)
    print(f'  ✓ {path}.png')

if __name__ == '__main__':
    print('Generating LinkedIn diagrams...')
    connection_request()
    job_recommendation()
    print('Done!')
