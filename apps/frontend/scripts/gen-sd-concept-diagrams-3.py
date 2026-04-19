#!/usr/bin/env python3
"""Generate Graphviz PNG diagrams for remaining SD concept topics (batch 3)."""

import graphviz, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams')
COMMON = dict(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.55', ranksep='0.65', splines='spline')
NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue', fontsize='12', penwidth='1.5', height='0.5', margin='0.18,0.1')
EDGE = dict(fontname='Helvetica Neue', fontsize='10', penwidth='1.5')

C = {
    'blue': ('#dbeafe','#3b82f6','#1e40af'), 'green': ('#dcfce7','#22c55e','#166534'),
    'yellow': ('#fef3c7','#f59e0b','#92400e'), 'purple': ('#e0e7ff','#6366f1','#3730a3'),
    'pink': ('#fce7f3','#ec4899','#9d174d'), 'orange': ('#ffedd5','#f97316','#9a3412'),
    'teal': ('#ccfbf1','#14b8a6','#115e59'), 'gray': ('#f3f4f6','#6b7280','#374151'),
    'red': ('#fee2e2','#ef4444','#991b1b'),
}
def n(g, name, label, c): g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)
def e(g, a, b, label='', color='#475569', style='solid'): g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)
def save(g, subdir, name):
    d = os.path.join(OUT, subdir); os.makedirs(d, exist_ok=True)
    g.render(os.path.join(d, name), cleanup=True)


# ── 1. ACID vs BASE ──
def gen_acid_vs_base():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  ACID vs BASE — Consistency Trade-offs  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    with g.subgraph(name='cluster_acid') as s:
        s.attr(label='ACID (Strong Consistency)', style='filled,rounded', color='#3b82f6',
               fillcolor='#eff6ff', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'a', 'Atomicity\nAll or nothing', 'blue')
        n(s, 'c', 'Consistency\nValid state always', 'blue')
        n(s, 'i', 'Isolation\nConcurrent = serial', 'blue')
        n(s, 'd', 'Durability\nCommit = permanent', 'blue')
    n(g, 'acid_db', 'PostgreSQL, MySQL\nBanking, Payments\nInventory', 'blue')

    with g.subgraph(name='cluster_base') as s:
        s.attr(label='BASE (Eventual Consistency)', style='filled,rounded', color='#22c55e',
               fillcolor='#f0fdf4', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'ba', 'Basically Available\nAlways responds', 'green')
        n(s, 'ss', 'Soft State\nMay be stale', 'green')
        n(s, 'ec', 'Eventually Consistent\nConverges over time', 'green')
    n(g, 'base_db', 'Cassandra, DynamoDB\nSocial feeds, Analytics\nShopping cart', 'green')

    e(g, 'a', 'acid_db', '', '#3b82f6', 'dashed')
    e(g, 'ba', 'base_db', '', '#22c55e', 'dashed')
    save(g, 'acid-vs-base', 'acid-vs-base')
    print('  ✓ acid-vs-base')


# ── 2. CAP & PACELC ──
def gen_cap():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  CAP Theorem — Pick 2 of 3 During Partition  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'cap', 'Network Partition\n(P) happens', 'red')
    g.node('choose', 'Choose:', shape='diamond', style='filled',
           fillcolor='#fef3c7', color='#f59e0b', fontcolor='#92400e',
           fontname='Helvetica Neue', fontsize='11', height='0.6')
    n(g, 'cp', 'CP System\nConsistency + Partition\nReject writes during partition\nHBase, MongoDB, etcd', 'blue')
    n(g, 'ap', 'AP System\nAvailability + Partition\nAccept writes, merge later\nCassandra, DynamoDB, CouchDB', 'green')
    n(g, 'ca', 'CA System\n(No partition tolerance)\nOnly in single-node DB\nTraditional RDBMS', 'gray')

    e(g, 'cap', 'choose', 'during\npartition', '#ef4444')
    e(g, 'choose', 'cp', 'need correct\ndata always', '#3b82f6')
    e(g, 'choose', 'ap', 'need uptime\nalways', '#22c55e')
    e(g, 'choose', 'ca', 'no partition\n(unrealistic)', '#6b7280', 'dashed')
    save(g, 'cap-pacelc-deep-dive', 'cap-theorem')
    print('  ✓ cap-pacelc-deep-dive')


# ── 3. Checksum ──
def gen_checksum():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Checksums — Data Integrity Verification  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'data', 'Original Data\n"Hello World"', 'blue')
    n(g, 'hash', 'Hash Function\nMD5 / SHA-256\nCRC32', 'purple')
    n(g, 'checksum', 'Checksum\na591a6d4...', 'yellow')
    n(g, 'transfer', 'Network\nTransfer / Storage', 'gray')
    n(g, 'verify', 'Recompute Hash\n+ Compare', 'green')
    g.node('match', 'Match?', shape='diamond', style='filled',
           fillcolor='#dcfce7', color='#22c55e', fontcolor='#166534',
           fontname='Helvetica Neue', fontsize='11', height='0.5')
    n(g, 'ok', 'Data Intact', 'green')
    n(g, 'corrupt', 'Data Corrupted!\nRequest retransmit', 'red')

    e(g, 'data', 'hash', 'compute', '#6366f1')
    e(g, 'hash', 'checksum', '', '#f59e0b')
    e(g, 'data', 'transfer', 'send data +\nchecksum', '#6b7280')
    e(g, 'transfer', 'verify', 'received', '#6b7280')
    e(g, 'verify', 'match', '', '#22c55e')
    e(g, 'match', 'ok', 'yes', '#22c55e')
    e(g, 'match', 'corrupt', 'no', '#ef4444')
    save(g, 'checksum', 'checksum-verification')
    print('  ✓ checksum')


# ── 4. Database Indexes ──
def gen_db_indexes():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Database Index Types — B-Tree vs LSM-Tree vs Hash  ', labelloc='t',
           fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    g.node('query', 'Query Pattern?', shape='diamond', style='filled',
           fillcolor='#fef3c7', color='#f59e0b', fontcolor='#92400e',
           fontname='Helvetica Neue', fontsize='11', height='0.7')

    with g.subgraph(name='cluster_btree') as s:
        s.attr(label='B-Tree Index', style='filled,rounded', color='#3b82f6',
               fillcolor='#eff6ff', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'btree', 'Balanced tree\nO(log n) read/write\nRange queries\nPostgreSQL default', 'blue')

    with g.subgraph(name='cluster_lsm') as s:
        s.attr(label='LSM-Tree Index', style='filled,rounded', color='#22c55e',
               fillcolor='#f0fdf4', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'lsm', 'Log-structured merge\nO(1) write (append)\nSlow reads (compaction)\nCassandra, RocksDB', 'green')

    with g.subgraph(name='cluster_hash') as s:
        s.attr(label='Hash Index', style='filled,rounded', color='#f97316',
               fillcolor='#fff7ed', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'hash_idx', 'Hash table\nO(1) exact lookup\nNo range queries\nRedis, Memcached', 'orange')

    e(g, 'query', 'btree', 'range scans +\npoint lookups', '#3b82f6')
    e(g, 'query', 'lsm', 'write-heavy\nworkload', '#22c55e')
    e(g, 'query', 'hash_idx', 'exact key\nlookup only', '#f97316')
    save(g, 'database-indexes', 'index-types')
    print('  ✓ database-indexes')


# ── 5. Heartbeat Mechanism ──
def gen_heartbeat():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Heartbeat Mechanism — Failure Detection  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'node', 'Server Node\n(sends heartbeat\nevery 5s)', 'blue')
    n(g, 'monitor', 'Monitor / Leader\n(tracks last heartbeat\nper node)', 'purple')
    g.node('timeout', 'Timeout?\n(>15s no beat)', shape='diamond', style='filled',
           fillcolor='#fef3c7', color='#f59e0b', fontcolor='#92400e',
           fontname='Helvetica Neue', fontsize='11', height='0.6')
    n(g, 'alive', 'Node Alive\nContinue normal\noperations', 'green')
    n(g, 'dead', 'Node Presumed Dead\nTrigger failover\nRemove from pool\nAlert on-call', 'red')

    e(g, 'node', 'monitor', 'heartbeat\nevery 5s', '#3b82f6')
    e(g, 'monitor', 'timeout', 'check', '#f59e0b')
    e(g, 'timeout', 'alive', 'received\nin time', '#22c55e')
    e(g, 'timeout', 'dead', 'no heartbeat\n>15 seconds', '#ef4444')
    save(g, 'heartbeat-mechanism', 'heartbeat')
    print('  ✓ heartbeat-mechanism')


# ── 6. Latency vs Throughput ──
def gen_latency_throughput():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Latency vs Throughput — The Core Trade-off  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    with g.subgraph(name='cluster_latency') as s:
        s.attr(label='Latency (Time per Request)', style='filled,rounded', color='#3b82f6',
               fillcolor='#eff6ff', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'lat', 'How long ONE\nrequest takes\np50, p95, p99\nTarget: <100ms', 'blue')

    with g.subgraph(name='cluster_throughput') as s:
        s.attr(label='Throughput (Requests per Second)', style='filled,rounded', color='#22c55e',
               fillcolor='#f0fdf4', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'tput', 'How many requests\nper second\nRPS / QPS\nTarget: varies', 'green')

    n(g, 'tradeoff', 'Trade-off:\nBatching increases\nthroughput but adds\nlatency per request', 'yellow')

    n(g, 'optimize', 'Optimize both:\nCaching, CDN,\nConnection pooling,\nAsync processing', 'purple')

    e(g, 'lat', 'tradeoff', '', '#f59e0b')
    e(g, 'tput', 'tradeoff', '', '#f59e0b')
    e(g, 'tradeoff', 'optimize', 'solutions', '#6366f1')
    save(g, 'latency-vs-throughput', 'latency-vs-throughput')
    print('  ✓ latency-vs-throughput')


# ── 7. Leader-Follower ──
def gen_leader_follower():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Leader-Follower Replication  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'writes', 'Write\nRequests', 'orange')
    n(g, 'leader', 'Leader\n(Primary)\nAll writes', 'blue')
    n(g, 'f1', 'Follower 1\n(Read replica)', 'green')
    n(g, 'f2', 'Follower 2\n(Read replica)', 'green')
    n(g, 'f3', 'Follower 3\n(Standby for\nfailover)', 'teal')
    n(g, 'reads', 'Read\nRequests', 'purple')

    e(g, 'writes', 'leader', 'all writes\ngo here', '#f97316')
    e(g, 'leader', 'f1', 'replication\nlog (async)', '#3b82f6', 'dashed')
    e(g, 'leader', 'f2', 'replication\nlog (async)', '#3b82f6', 'dashed')
    e(g, 'leader', 'f3', 'sync\nreplication', '#14b8a6')
    e(g, 'reads', 'f1', 'distribute', '#6366f1')
    e(g, 'reads', 'f2', 'reads', '#6366f1')
    save(g, 'leader-follower', 'leader-follower')
    print('  ✓ leader-follower')


# ── 8. Quorum ──
def gen_quorum():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Quorum Consensus — W + R > N  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'client', 'Client Write\n(or Read)', 'blue')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'n1', 'Node 1\n(ACK)', 'green')
        n(s, 'n2', 'Node 2\n(ACK)', 'green')
        n(s, 'n3', 'Node 3\n(ACK)', 'green')
        n(s, 'n4', 'Node 4\n(slow)', 'yellow')
        n(s, 'n5', 'Node 5\n(down)', 'red')

    n(g, 'quorum', 'Quorum = 3/5\n(majority)\nW=3, R=3\nW+R > N = strong', 'purple')

    e(g, 'client', 'n1', 'write', '#22c55e')
    e(g, 'client', 'n2', 'write', '#22c55e')
    e(g, 'client', 'n3', 'write', '#22c55e')
    e(g, 'client', 'n4', 'write', '#f59e0b', 'dashed')
    e(g, 'client', 'n5', 'write', '#ef4444', 'dashed')
    e(g, 'n1', 'quorum', '', '#6366f1', 'dashed')
    save(g, 'quorum', 'quorum-consensus')
    print('  ✓ quorum')


# ── 9. REST vs RPC ──
def gen_rest_vs_rpc():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  REST vs RPC — API Communication Styles  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    with g.subgraph(name='cluster_rest') as s:
        s.attr(label='REST (Resource-Oriented)', style='filled,rounded', color='#3b82f6',
               fillcolor='#eff6ff', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'rest', 'HTTP + JSON\nGET /users/123\nStateless, cacheable\nHATEOAS (links)', 'blue')
        n(s, 'rest_use', 'Public APIs\nWeb/Mobile clients\nCRUD operations', 'blue')

    with g.subgraph(name='cluster_rpc') as s:
        s.attr(label='RPC (Action-Oriented)', style='filled,rounded', color='#22c55e',
               fillcolor='#f0fdf4', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'rpc', 'gRPC: Protobuf + HTTP/2\nThrift: Binary + TCP\nFunction-call style\ngetUser(123)', 'green')
        n(s, 'rpc_use', 'Microservices internal\nLow-latency comms\nStreaming', 'green')

    e(g, 'rest', 'rest_use', 'best for', '#3b82f6', 'dashed')
    e(g, 'rpc', 'rpc_use', 'best for', '#22c55e', 'dashed')
    save(g, 'rest-vs-rpc', 'rest-vs-rpc')
    print('  ✓ rest-vs-rpc')


# ── 10. Strong vs Eventual Consistency ──
def gen_consistency():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Strong vs Eventual Consistency  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    with g.subgraph(name='cluster_strong') as s:
        s.attr(label='Strong Consistency', style='filled,rounded', color='#3b82f6',
               fillcolor='#eff6ff', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'strong', 'Every read sees\nlatest write\nLinearizable\nHigher latency', 'blue')
        n(s, 'strong_ex', 'Banking balance\nInventory count\nLeader election\nPostgreSQL, etcd', 'blue')

    with g.subgraph(name='cluster_eventual') as s:
        s.attr(label='Eventual Consistency', style='filled,rounded', color='#22c55e',
               fillcolor='#f0fdf4', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'eventual', 'Reads may return\nstale data temporarily\nConverges eventually\nLower latency', 'green')
        n(s, 'eventual_ex', 'Social feed likes\nDNS propagation\nShopping cart\nCassandra, DynamoDB', 'green')

    e(g, 'strong', 'strong_ex', 'use when\ncorrectness\ncritical', '#3b82f6', 'dashed')
    e(g, 'eventual', 'eventual_ex', 'use when\navailability\nmatters more', '#22c55e', 'dashed')
    save(g, 'strong-vs-eventual-consistency', 'consistency-comparison')
    print('  ✓ strong-vs-eventual-consistency')


# ── 11. Synchronous vs Asynchronous ──
def gen_sync_async():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Synchronous vs Asynchronous Communication  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    with g.subgraph(name='cluster_sync') as s:
        s.attr(label='Synchronous (Blocking)', style='filled,rounded', color='#3b82f6',
               fillcolor='#eff6ff', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'sync_a', 'Service A\n(caller)', 'blue')
        n(s, 'sync_b', 'Service B\n(blocks until\nresponse)', 'blue')
    n(g, 'sync_use', 'Simple, predictable\nHTTP REST calls\nCascading failures\nTight coupling', 'gray')

    with g.subgraph(name='cluster_async') as s:
        s.attr(label='Asynchronous (Non-blocking)', style='filled,rounded', color='#22c55e',
               fillcolor='#f0fdf4', fontname='Helvetica Neue Bold', fontsize='10')
        n(s, 'async_a', 'Service A\n(fire & forget)', 'green')
        n(s, 'async_q', 'Message Queue\n(Kafka / SQS)', 'yellow')
        n(s, 'async_b', 'Service B\n(processes later)', 'green')
    n(g, 'async_use', 'Decoupled, resilient\nRetry on failure\nHigher throughput\nEventual consistency', 'gray')

    e(g, 'sync_a', 'sync_b', 'request →\nwait → response', '#3b82f6')
    e(g, 'sync_b', 'sync_use', '', '#6b7280', 'dashed')
    e(g, 'async_a', 'async_q', 'publish\nevent', '#22c55e')
    e(g, 'async_q', 'async_b', 'consume\nlater', '#f59e0b')
    e(g, 'async_b', 'async_use', '', '#6b7280', 'dashed')
    save(g, 'synchronous-vs-asynchronous', 'sync-vs-async')
    print('  ✓ synchronous-vs-asynchronous')


if __name__ == '__main__':
    print('Generating SD concept diagrams (batch 3)...\n')
    gen_acid_vs_base()
    gen_cap()
    gen_checksum()
    gen_db_indexes()
    gen_heartbeat()
    gen_latency_throughput()
    gen_leader_follower()
    gen_quorum()
    gen_rest_vs_rpc()
    gen_consistency()
    gen_sync_async()
    print('\nDone! 11 diagrams generated.')
