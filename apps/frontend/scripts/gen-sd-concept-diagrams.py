#!/usr/bin/env python3
"""Generate professional Graphviz PNG diagrams for system design concept topics.
Same visual style as gen-whatsapp-diagrams.py — bright colors, clean layout."""

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


# ═══════════════════════════════════════════════════════════
# CACHING DIAGRAMS
# ═══════════════════════════════════════════════════════════

def gen_caching_layers():
    out = os.path.join(OUT_BASE, 'caching')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Caching Layers — From Client to Database  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'client', 'Client\n(Browser)', 'blue')
    n(g, 'cdn', 'CDN Cache\n(Edge PoP)', 'green')
    n(g, 'lb', 'Load Balancer', 'gray')
    n(g, 'app_cache', 'Application Cache\n(Redis / Memcached)', 'pink')
    n(g, 'app', 'Application\nServer', 'purple')
    n(g, 'db_cache', 'DB Query Cache\n(Buffer Pool)', 'orange')
    n(g, 'db', 'Database\n(PostgreSQL)', 'blue')

    e(g, 'client', 'cdn', 'HTTP GET', '#3b82f6')
    e(g, 'cdn', 'lb', 'cache miss', '#22c55e', 'dashed')
    e(g, 'lb', 'app', 'route', '#6b7280')
    e(g, 'app', 'app_cache', 'check cache\nfirst', '#ec4899')
    e(g, 'app_cache', 'app', 'hit → return\n(skip DB)', '#ec4899', 'dashed')
    e(g, 'app', 'db_cache', 'cache miss', '#f97316')
    e(g, 'db_cache', 'db', 'buffer miss', '#3b82f6')

    save(g, out, 'caching-layers')
    print('  ✓ caching/caching-layers.png')


def gen_cache_aside():
    out = os.path.join(OUT_BASE, 'caching')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Cache-Aside (Lazy Loading) Pattern  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'app', 'Application', 'purple')
    n(g, 'cache', 'Cache\n(Redis)', 'pink')
    n(g, 'db', 'Database', 'blue')

    g.node('hit', 'Cache Hit?', shape='diamond', style='filled',
           fillcolor='#fef3c7', color='#f59e0b', fontcolor='#92400e',
           fontname='Helvetica Neue', fontsize='11', height='0.6')

    e(g, 'app', 'cache', '1. Check cache', '#ec4899')
    e(g, 'cache', 'hit', '', '#f59e0b')
    e(g, 'hit', 'app', 'Yes → return\ncached data', '#22c55e')
    e(g, 'hit', 'db', 'No → query DB', '#3b82f6')
    e(g, 'db', 'app', '2. Return data', '#3b82f6', 'dashed')
    e(g, 'app', 'cache', '3. Populate cache\n(SET + TTL)', '#ec4899', 'dashed')

    save(g, out, 'cache-aside-flow')
    print('  ✓ caching/cache-aside-flow.png')


def gen_cache_failures():
    out = os.path.join(OUT_BASE, 'caching')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Cache Failure Patterns — Stampede, Penetration, Avalanche  ', labelloc='t',
           fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    with g.subgraph(name='cluster_stampede') as s:
        s.attr(label='Cache Stampede', style='filled,rounded', color='#ef4444',
               fillcolor='#fef2f2', fontname='Helvetica Neue Bold', fontsize='11', fontcolor='#991b1b')
        n(s, 's_cause', 'Hot key expires', 'red')
        n(s, 's_effect', '1000s of requests\nhit DB simultaneously', 'red')
        n(s, 's_fix', 'Fix: Mutex lock\n+ stale-while-revalidate', 'green')

    with g.subgraph(name='cluster_penetration') as s:
        s.attr(label='Cache Penetration', style='filled,rounded', color='#f59e0b',
               fillcolor='#fffbeb', fontname='Helvetica Neue Bold', fontsize='11', fontcolor='#92400e')
        n(s, 'p_cause', 'Query for key\nthat never exists', 'yellow')
        n(s, 'p_effect', 'Every request\nbypasses cache → DB', 'yellow')
        n(s, 'p_fix', 'Fix: Bloom filter\n+ cache NULL values', 'green')

    with g.subgraph(name='cluster_avalanche') as s:
        s.attr(label='Cache Avalanche', style='filled,rounded', color='#6366f1',
               fillcolor='#eef2ff', fontname='Helvetica Neue Bold', fontsize='11', fontcolor='#3730a3')
        n(s, 'a_cause', 'Many keys expire\nat same time', 'purple')
        n(s, 'a_effect', 'Massive DB load\nspike', 'purple')
        n(s, 'a_fix', 'Fix: Jitter TTL\n+ circuit breaker', 'green')

    e(g, 's_cause', 's_effect', '', '#ef4444')
    e(g, 's_effect', 's_fix', '', '#22c55e')
    e(g, 'p_cause', 'p_effect', '', '#f59e0b')
    e(g, 'p_effect', 'p_fix', '', '#22c55e')
    e(g, 'a_cause', 'a_effect', '', '#6366f1')
    e(g, 'a_effect', 'a_fix', '', '#22c55e')

    save(g, out, 'cache-failure-patterns')
    print('  ✓ caching/cache-failure-patterns.png')


# ═══════════════════════════════════════════════════════════
# LOAD BALANCING DIAGRAMS
# ═══════════════════════════════════════════════════════════

def gen_lb_architecture():
    out = os.path.join(OUT_BASE, 'load-balancing')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Load Balancer Architecture — L4 vs L7  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'clients', 'Clients\n(millions)', 'blue')

    with g.subgraph(name='cluster_l4') as s:
        s.attr(label='L4 Load Balancer (TCP/UDP)', style='filled,rounded', color='#3b82f6',
               fillcolor='#eff6ff', fontname='Helvetica Neue Bold', fontsize='10', fontcolor='#1e40af')
        n(s, 'l4', 'L4 LB\nIP + Port routing\n(NGINX Stream, HAProxy)', 'blue')

    with g.subgraph(name='cluster_l7') as s:
        s.attr(label='L7 Load Balancer (HTTP)', style='filled,rounded', color='#7c3aed',
               fillcolor='#f5f3ff', fontname='Helvetica Neue Bold', fontsize='10', fontcolor='#4c1d95')
        n(s, 'l7', 'L7 LB\nURL/Header routing\nSSL termination\n(NGINX, Envoy)', 'purple')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 's1', 'Server 1', 'green')
        n(s, 's2', 'Server 2', 'green')
        n(s, 's3', 'Server 3', 'green')

    n(g, 'health', 'Health Check\n(/health every 10s)', 'yellow')

    e(g, 'clients', 'l4', 'TCP/UDP', '#3b82f6')
    e(g, 'l4', 'l7', 'forward', '#6366f1')
    e(g, 'l7', 's1', '/api/*', '#22c55e')
    e(g, 'l7', 's2', '/web/*', '#22c55e')
    e(g, 'l7', 's3', '/static/*', '#22c55e')
    e(g, 'health', 's1', 'ping', '#f59e0b', 'dashed')
    e(g, 'health', 's2', 'ping', '#f59e0b', 'dashed')
    e(g, 'health', 's3', 'ping', '#f59e0b', 'dashed')

    save(g, out, 'lb-architecture')
    print('  ✓ load-balancing/lb-architecture.png')


def gen_lb_algorithms():
    out = os.path.join(OUT_BASE, 'load-balancing')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Load Balancing Algorithms  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'request', 'Incoming Request', 'blue')
    g.node('algo', 'Algorithm?', shape='diamond', style='filled',
           fillcolor='#fef3c7', color='#f59e0b', fontcolor='#92400e',
           fontname='Helvetica Neue', fontsize='11', height='0.6')

    n(g, 'rr', 'Round Robin\nSimple rotation\nO(1)', 'green')
    n(g, 'wrr', 'Weighted Round Robin\nCapacity-aware\nMore to stronger', 'green')
    n(g, 'lc', 'Least Connections\nSend to least busy\nBest for long requests', 'teal')
    n(g, 'hash', 'IP/URL Hash\nConsistent routing\nSession affinity', 'purple')
    n(g, 'random', 'Random\n+ Power of 2 Choices\nNear-optimal', 'orange')

    e(g, 'request', 'algo', '', '#f59e0b')
    e(g, 'algo', 'rr', 'simple\nstateless', '#22c55e')
    e(g, 'algo', 'wrr', 'varied\ncapacity', '#22c55e')
    e(g, 'algo', 'lc', 'long-lived\nconnections', '#14b8a6')
    e(g, 'algo', 'hash', 'sticky\nsessions', '#6366f1')
    e(g, 'algo', 'random', 'large\npool', '#f97316')

    save(g, out, 'lb-algorithms')
    print('  ✓ load-balancing/lb-algorithms.png')


def gen_l4_vs_l7():
    out = os.path.join(OUT_BASE, 'load-balancing')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  L4 vs L7 Load Balancing  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    with g.subgraph(name='cluster_l4') as s:
        s.attr(label='Layer 4 (Transport)', style='filled,rounded', color='#3b82f6',
               fillcolor='#eff6ff', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'l4_in', 'TCP/UDP\nPackets', 'blue')
        n(s, 'l4_route', 'Route by\nIP + Port\n(no inspection)', 'blue')
        n(s, 'l4_perf', 'Speed: Very fast\nNo SSL termination\nNo content awareness', 'gray')

    with g.subgraph(name='cluster_l7') as s:
        s.attr(label='Layer 7 (Application)', style='filled,rounded', color='#7c3aed',
               fillcolor='#f5f3ff', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'l7_in', 'HTTP/HTTPS\nRequests', 'purple')
        n(s, 'l7_route', 'Route by\nURL, Headers,\nCookies, Body', 'purple')
        n(s, 'l7_perf', 'SSL termination\nContent caching\nA/B testing\nRate limiting', 'gray')

    e(g, 'l4_in', 'l4_route', '', '#3b82f6')
    e(g, 'l7_in', 'l7_route', '', '#6366f1')

    save(g, out, 'l4-vs-l7')
    print('  ✓ load-balancing/l4-vs-l7.png')


# ═══════════════════════════════════════════════════════════
# DATABASE DIAGRAMS
# ═══════════════════════════════════════════════════════════

def gen_sql_vs_nosql():
    out = os.path.join(OUT_BASE, 'databases')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  SQL vs NoSQL — Decision Framework  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    g.node('decision', 'What does your\ndata look like?', shape='diamond', style='filled',
           fillcolor='#fef3c7', color='#f59e0b', fontcolor='#92400e',
           fontname='Helvetica Neue', fontsize='11', height='0.7')

    with g.subgraph(name='cluster_sql') as s:
        s.attr(label='SQL (Relational)', style='filled,rounded', color='#3b82f6',
               fillcolor='#eff6ff', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'sql', 'PostgreSQL / MySQL\nACID transactions\nStrong consistency\nComplex joins', 'blue')
        n(s, 'sql_use', 'Banking, E-commerce\nUser accounts\nInventory, Billing', 'blue')

    with g.subgraph(name='cluster_nosql') as s:
        s.attr(label='NoSQL (Non-relational)', style='filled,rounded', color='#22c55e',
               fillcolor='#f0fdf4', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'doc', 'Document DB\n(MongoDB)\nFlexible schema', 'green')
        n(s, 'kv', 'Key-Value\n(Redis, DynamoDB)\nUltra-fast lookups', 'teal')
        n(s, 'wide', 'Wide-Column\n(Cassandra)\nWrite-heavy', 'orange')
        n(s, 'graph_db', 'Graph DB\n(Neo4j)\nRelationship queries', 'purple')

    e(g, 'decision', 'sql', 'Structured +\nrelationships +\nACID needed', '#3b82f6')
    e(g, 'decision', 'doc', 'Flexible schema\n+ nested data', '#22c55e')
    e(g, 'decision', 'kv', 'Simple lookups\n+ caching', '#14b8a6')
    e(g, 'decision', 'wide', 'High write\nthroughput', '#f97316')
    e(g, 'decision', 'graph_db', 'Complex\nrelationships', '#6366f1')
    e(g, 'sql', 'sql_use', 'best for', '#3b82f6', 'dashed')

    save(g, out, 'sql-vs-nosql')
    print('  ✓ databases/sql-vs-nosql.png')


def gen_sharding():
    out = os.path.join(OUT_BASE, 'databases')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Database Sharding Strategies  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'data', 'All Data\n(too large for 1 DB)', 'blue')

    g.node('strategy', 'Shard Key\nStrategy?', shape='diamond', style='filled',
           fillcolor='#fef3c7', color='#f59e0b', fontcolor='#92400e',
           fontname='Helvetica Neue', fontsize='11', height='0.6')

    n(g, 'range', 'Range-Based\nuserIds 1-1M → Shard A\n1M-2M → Shard B', 'green')
    n(g, 'hash_s', 'Hash-Based\nhash(userId) % N\nEven distribution', 'purple')
    n(g, 'geo', 'Geographic\nUS → Shard US\nEU → Shard EU', 'orange')
    n(g, 'dir', 'Directory-Based\nLookup table\nMost flexible', 'teal')

    e(g, 'data', 'strategy', '', '#f59e0b')
    e(g, 'strategy', 'range', 'ordered\nqueries', '#22c55e')
    e(g, 'strategy', 'hash_s', 'even load\ndistribution', '#6366f1')
    e(g, 'strategy', 'geo', 'data locality\nrequired', '#f97316')
    e(g, 'strategy', 'dir', 'complex\nrouting', '#14b8a6')

    save(g, out, 'sharding-strategies')
    print('  ✓ databases/sharding-strategies.png')


def gen_replication():
    out = os.path.join(OUT_BASE, 'databases')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Database Replication — Leader-Follower  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'writes', 'Write\nRequests', 'orange')
    n(g, 'primary', 'Primary DB\n(Leader)\nAll writes here', 'blue')
    n(g, 'replica1', 'Replica 1\n(Follower)\nRead-only', 'green')
    n(g, 'replica2', 'Replica 2\n(Follower)\nRead-only', 'green')
    n(g, 'replica3', 'Replica 3\n(Follower)\nRead-only', 'green')
    n(g, 'reads', 'Read\nRequests', 'teal')

    e(g, 'writes', 'primary', 'all writes', '#f97316')
    e(g, 'primary', 'replica1', 'replication\nlog (async)', '#3b82f6', 'dashed')
    e(g, 'primary', 'replica2', 'replication\nlog (async)', '#3b82f6', 'dashed')
    e(g, 'primary', 'replica3', 'replication\nlog (sync)', '#3b82f6')
    e(g, 'reads', 'replica1', 'distribute\nreads', '#14b8a6')
    e(g, 'reads', 'replica2', '', '#14b8a6')

    save(g, out, 'replication')
    print('  ✓ databases/replication.png')


# ═══════════════════════════════════════════════════════════
# MESSAGE QUEUES DIAGRAMS
# ═══════════════════════════════════════════════════════════

def gen_pubsub():
    out = os.path.join(OUT_BASE, 'message-queues')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Pub/Sub Pattern — Decoupled Communication  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'pub1', 'Producer 1\n(Order Service)', 'blue')
    n(g, 'pub2', 'Producer 2\n(Payment Service)', 'blue')
    n(g, 'topic', 'Topic / Exchange\n(Kafka / RabbitMQ)', 'yellow')
    n(g, 'sub1', 'Consumer 1\nNotification Svc', 'green')
    n(g, 'sub2', 'Consumer 2\nAnalytics Svc', 'purple')
    n(g, 'sub3', 'Consumer 3\nInventory Svc', 'orange')

    e(g, 'pub1', 'topic', 'publish\nevent', '#3b82f6')
    e(g, 'pub2', 'topic', 'publish\nevent', '#3b82f6')
    e(g, 'topic', 'sub1', 'subscribe', '#22c55e')
    e(g, 'topic', 'sub2', 'subscribe', '#6366f1')
    e(g, 'topic', 'sub3', 'subscribe', '#f97316')

    save(g, out, 'pubsub-pattern')
    print('  ✓ message-queues/pubsub-pattern.png')


def gen_dead_letter():
    out = os.path.join(OUT_BASE, 'message-queues')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Dead Letter Queue — Handling Failed Messages  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'producer', 'Producer', 'blue')
    n(g, 'queue', 'Main Queue', 'yellow')
    n(g, 'consumer', 'Consumer\n(processes)', 'green')
    g.node('success', 'Success?', shape='diamond', style='filled',
           fillcolor='#dcfce7', color='#22c55e', fontcolor='#166534',
           fontname='Helvetica Neue', fontsize='11', height='0.5')
    n(g, 'retry', 'Retry Queue\n(3 attempts\nwith backoff)', 'orange')
    n(g, 'dlq', 'Dead Letter Queue\n(manual review\nafter 3 failures)', 'red')
    n(g, 'done', 'Done\n(ack)', 'green')

    e(g, 'producer', 'queue', 'message', '#3b82f6')
    e(g, 'queue', 'consumer', 'deliver', '#22c55e')
    e(g, 'consumer', 'success', '', '#22c55e')
    e(g, 'success', 'done', 'yes', '#22c55e')
    e(g, 'success', 'retry', 'no', '#f97316')
    e(g, 'retry', 'queue', 'retry after\nbackoff', '#f97316', 'dashed')
    e(g, 'retry', 'dlq', '3 failures\n→ dead letter', '#ef4444')

    save(g, out, 'dead-letter-queue')
    print('  ✓ message-queues/dead-letter-queue.png')


# ═══════════════════════════════════════════════════════════
# API DESIGN DIAGRAMS
# ═══════════════════════════════════════════════════════════

def gen_rest_vs_graphql_grpc():
    out = os.path.join(OUT_BASE, 'api-design')
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  REST vs GraphQL vs gRPC  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'client', 'Client\nApplication', 'blue')

    with g.subgraph(name='cluster_rest') as s:
        s.attr(label='REST', style='filled,rounded', color='#3b82f6',
               fillcolor='#eff6ff', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'rest', 'HTTP + JSON\nResource-based URLs\nGET /users/:id\nStateless, cacheable', 'blue')

    with g.subgraph(name='cluster_graphql') as s:
        s.attr(label='GraphQL', style='filled,rounded', color='#ec4899',
               fillcolor='#fdf2f8', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'gql', 'Single endpoint\nClient specifies fields\nNo over/under-fetching\nStrong typed schema', 'pink')

    with g.subgraph(name='cluster_grpc') as s:
        s.attr(label='gRPC', style='filled,rounded', color='#22c55e',
               fillcolor='#f0fdf4', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'grpc', 'HTTP/2 + Protobuf\nBinary serialization\nBidirectional streaming\nService-to-service', 'green')

    e(g, 'client', 'rest', 'Public APIs\nWeb/Mobile', '#3b82f6')
    e(g, 'client', 'gql', 'Complex UIs\nMobile apps', '#ec4899')
    e(g, 'client', 'grpc', 'Microservices\nInternal comms', '#22c55e')

    save(g, out, 'rest-vs-graphql-vs-grpc')
    print('  ✓ api-design/rest-vs-graphql-vs-grpc.png')


if __name__ == '__main__':
    print('Generating SD concept diagrams...\n')

    print('CACHING:')
    gen_caching_layers()
    gen_cache_aside()
    gen_cache_failures()

    print('\nLOAD BALANCING:')
    gen_lb_architecture()
    gen_lb_algorithms()
    gen_l4_vs_l7()

    print('\nDATABASES:')
    gen_sql_vs_nosql()
    gen_sharding()
    gen_replication()

    print('\nMESSAGE QUEUES:')
    gen_pubsub()
    gen_dead_letter()

    print('\nAPI DESIGN:')
    gen_rest_vs_graphql_grpc()

    print('\nDone! All SD concept diagrams generated.')
