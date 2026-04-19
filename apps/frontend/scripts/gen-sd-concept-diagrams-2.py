#!/usr/bin/env python3
"""Generate Graphviz PNG diagrams for additional SD concept topics (batch 2)."""

import graphviz
import os

OUT_BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams')

COMMON = dict(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.55', ranksep='0.65', splines='spline')
NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue', fontsize='12', penwidth='1.5', height='0.5', margin='0.18,0.1')
EDGE = dict(fontname='Helvetica Neue', fontsize='10', penwidth='1.5')

C = {
    'blue':   ('#dbeafe', '#3b82f6', '#1e40af'),
    'green':  ('#dcfce7', '#22c55e', '#166534'),
    'yellow': ('#fef3c7', '#f59e0b', '#92400e'),
    'purple': ('#e0e7ff', '#6366f1', '#3730a3'),
    'pink':   ('#fce7f3', '#ec4899', '#9d174d'),
    'orange': ('#ffedd5', '#f97316', '#9a3412'),
    'teal':   ('#ccfbf1', '#14b8a6', '#115e59'),
    'gray':   ('#f3f4f6', '#6b7280', '#374151'),
    'red':    ('#fee2e2', '#ef4444', '#991b1b'),
}

def n(g, name, label, c):
    g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)

def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)

def save(g, out_dir, name):
    os.makedirs(out_dir, exist_ok=True)
    g.render(os.path.join(out_dir, name), cleanup=True)


# ── Consistent Hashing ──
def gen_consistent_hashing():
    out = os.path.join(OUT_BASE, 'consistent-hashing')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Consistent Hashing — Minimal Remapping on Scale  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'key', 'Data Key\nhash(key)', 'blue')
    n(g, 'ring', 'Hash Ring\n(0 to 2^32-1)', 'yellow')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'n1', 'Node A\n(range 0-99)', 'green')
        n(s, 'n2', 'Node B\n(range 100-199)', 'green')
        n(s, 'n3', 'Node C\n(range 200-299)', 'green')

    n(g, 'vnodes', 'Virtual Nodes\n150 per server\n→ even distribution', 'purple')
    n(g, 'scale', 'Add Node D\nonly 1/N keys move\n(minimal disruption)', 'teal')

    e(g, 'key', 'ring', 'hash', '#3b82f6')
    e(g, 'ring', 'n1', 'clockwise\nto nearest', '#22c55e')
    e(g, 'ring', 'n2', '', '#22c55e')
    e(g, 'ring', 'n3', '', '#22c55e')
    e(g, 'ring', 'vnodes', 'uses', '#6366f1', 'dashed')
    e(g, 'vnodes', 'scale', 'enables', '#14b8a6', 'dashed')

    save(g, out, 'consistent-hashing')
    print('  ✓ consistent-hashing/consistent-hashing.png')


# ── Bloom Filter ──
def gen_bloom_filter():
    out = os.path.join(OUT_BASE, 'bloom-filters')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Bloom Filter — Probabilistic Set Membership  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'input', 'Element X\nto check', 'blue')
    n(g, 'hash', '3 Hash Functions\nh1(X), h2(X), h3(X)', 'purple')
    n(g, 'bits', 'Bit Array\n[0,1,0,1,1,0,1,0,...]\nm bits total', 'yellow')

    g.node('check', 'All bits = 1?', shape='diamond', style='filled',
           fillcolor='#fef3c7', color='#f59e0b', fontcolor='#92400e',
           fontname='Helvetica Neue', fontsize='11', height='0.6')

    n(g, 'maybe', 'Probably in set\n(false positive\npossible)', 'orange')
    n(g, 'no', 'Definitely NOT\nin set\n(100% certain)', 'green')

    e(g, 'input', 'hash', 'apply', '#6366f1')
    e(g, 'hash', 'bits', 'check 3\npositions', '#f59e0b')
    e(g, 'bits', 'check', '', '#f59e0b')
    e(g, 'check', 'maybe', 'Yes', '#f97316')
    e(g, 'check', 'no', 'No\n(any bit = 0)', '#22c55e')

    save(g, out, 'bloom-filter')
    print('  ✓ bloom-filters/bloom-filter.png')


def gen_bloom_use_cases():
    out = os.path.join(OUT_BASE, 'bloom-filters')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Bloom Filter Use Cases  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'bf', 'Bloom Filter\nO(k) lookup\nk = hash count', 'purple')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'cache', 'Cache Penetration\nFilter invalid keys\nbefore hitting DB', 'pink')
        n(s, 'spell', 'Spell Check\nIs this word\nin dictionary?', 'blue')
        n(s, 'dedup', 'URL Dedup\nHas crawler\nseen this URL?', 'green')
        n(s, 'bigtable', 'BigTable/LSM\nSkip SSTables that\ndon\'t contain key', 'orange')

    e(g, 'bf', 'cache', '', '#ec4899')
    e(g, 'bf', 'spell', '', '#3b82f6')
    e(g, 'bf', 'dedup', '', '#22c55e')
    e(g, 'bf', 'bigtable', '', '#f97316')

    save(g, out, 'bloom-use-cases')
    print('  ✓ bloom-filters/bloom-use-cases.png')


# ── Data Partitioning ──
def gen_partitioning_strategies():
    out = os.path.join(OUT_BASE, 'data-partitioning')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Data Partitioning Strategies  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'data', 'Large Dataset\n(too big for 1 node)', 'blue')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'horiz', 'Horizontal\n(Sharding)\nSplit rows across\nnodes by key', 'green')
        n(s, 'vert', 'Vertical\nSplit columns\ninto separate\ntables/services', 'purple')
        n(s, 'func', 'Functional\nSplit by feature\n(users DB, orders DB,\nanalytics DB)', 'orange')

    e(g, 'data', 'horiz', 'most\ncommon', '#22c55e')
    e(g, 'data', 'vert', 'column\ngroups', '#6366f1')
    e(g, 'data', 'func', 'by service\nboundary', '#f97316')

    save(g, out, 'partitioning-strategies')
    print('  ✓ data-partitioning/partitioning-strategies.png')


# ── Long Polling vs WebSocket vs SSE ──
def gen_realtime_comparison():
    out = os.path.join(OUT_BASE, 'long-polling-websockets-sse')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Real-Time Communication — Long Polling vs WebSocket vs SSE  ', labelloc='t',
           fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    with g.subgraph(name='cluster_lp') as s:
        s.attr(label='Long Polling', style='filled,rounded', color='#3b82f6',
               fillcolor='#eff6ff', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'lp', 'Client holds HTTP\nconnection open\nServer responds on\nchange or timeout', 'blue')
        n(s, 'lp_use', 'Dropbox sync\nSimple chat\nFirewall-friendly', 'blue')

    with g.subgraph(name='cluster_ws') as s:
        s.attr(label='WebSocket', style='filled,rounded', color='#22c55e',
               fillcolor='#f0fdf4', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'ws', 'Full-duplex TCP\nBidirectional\nPersistent connection\nLow overhead', 'green')
        n(s, 'ws_use', 'Chat apps\nLive tracking\nCollaboration\nGaming', 'green')

    with g.subgraph(name='cluster_sse') as s:
        s.attr(label='Server-Sent Events', style='filled,rounded', color='#f97316',
               fillcolor='#fff7ed', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'sse', 'Server → Client only\nHTTP-based\nAuto-reconnect\nText-only', 'orange')
        n(s, 'sse_use', 'News feeds\nStock tickers\nNotifications\nLog streaming', 'orange')

    e(g, 'lp', 'lp_use', 'best for', '#3b82f6', 'dashed')
    e(g, 'ws', 'ws_use', 'best for', '#22c55e', 'dashed')
    e(g, 'sse', 'sse_use', 'best for', '#f97316', 'dashed')

    save(g, out, 'realtime-comparison')
    print('  ✓ long-polling-websockets-sse/realtime-comparison.png')


# ── Proxies ──
def gen_proxy_types():
    out = os.path.join(OUT_BASE, 'proxies')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Forward Proxy vs Reverse Proxy  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    with g.subgraph(name='cluster_forward') as s:
        s.attr(label='Forward Proxy', style='filled,rounded', color='#3b82f6',
               fillcolor='#eff6ff', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'clients', 'Clients\n(in network)', 'blue')
        n(s, 'fproxy', 'Forward Proxy\nMasks client IP\nContent filtering\nCaching', 'blue')

    n(g, 'internet', 'Internet', 'gray')

    with g.subgraph(name='cluster_reverse') as s:
        s.attr(label='Reverse Proxy', style='filled,rounded', color='#22c55e',
               fillcolor='#f0fdf4', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'rproxy', 'Reverse Proxy\nSSL termination\nLoad balancing\nCaching + WAF', 'green')
        n(s, 'servers', 'Origin Servers\n(hidden from client)', 'green')

    e(g, 'clients', 'fproxy', 'request', '#3b82f6')
    e(g, 'fproxy', 'internet', 'forward', '#6b7280')
    e(g, 'internet', 'rproxy', 'request', '#6b7280')
    e(g, 'rproxy', 'servers', 'route', '#22c55e')

    save(g, out, 'proxy-types')
    print('  ✓ proxies/proxy-types.png')


# ── DNS ──
def gen_dns_resolution():
    out = os.path.join(OUT_BASE, 'dns-deep-dive')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  DNS Resolution — From Domain to IP  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'browser', 'Browser\nexample.com', 'blue')
    n(g, 'local', 'Local DNS\nCache\n(OS + Browser)', 'gray')
    n(g, 'resolver', 'Recursive\nDNS Resolver\n(ISP / 8.8.8.8)', 'purple')
    n(g, 'root', 'Root DNS\n(. → .com NS)', 'yellow')
    n(g, 'tld', 'TLD DNS\n(.com → NS)', 'orange')
    n(g, 'auth', 'Authoritative DNS\nexample.com\n→ 93.184.216.34', 'green')

    e(g, 'browser', 'local', '1. check\ncache', '#3b82f6')
    e(g, 'local', 'resolver', '2. cache\nmiss', '#6b7280', 'dashed')
    e(g, 'resolver', 'root', '3. ask root', '#f59e0b')
    e(g, 'root', 'resolver', '4. refer\nto .com', '#f59e0b', 'dashed')
    e(g, 'resolver', 'tld', '5. ask .com', '#f97316')
    e(g, 'tld', 'resolver', '6. refer to\nauthoritative', '#f97316', 'dashed')
    e(g, 'resolver', 'auth', '7. ask NS', '#22c55e')
    e(g, 'auth', 'browser', '8. return IP\n93.184.216.34', '#22c55e')

    save(g, out, 'dns-resolution')
    print('  ✓ dns-deep-dive/dns-resolution.png')


if __name__ == '__main__':
    print('Generating SD concept diagrams (batch 2)...\n')
    gen_consistent_hashing()
    gen_bloom_filter()
    gen_bloom_use_cases()
    gen_partitioning_strategies()
    gen_realtime_comparison()
    gen_proxy_types()
    gen_dns_resolution()
    print('\nDone! 7 additional diagrams generated.')
