#!/usr/bin/env python3
"""Generate System Design Trade-offs + Patterns diagrams.

All landscape (LR) Graphviz PNGs, output to
apps/camora/public/diagrams/systemdesign/.

These cover the architectural / topology diagrams referenced inline by
systemDesignTradeoffs.js and systemDesignPatterns.js after the ASCII-art
sweep. Sequence-style flows live as prose in the topic files; only true
multi-node topologies become PNGs here.
"""
import graphviz
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'systemdesign')
os.makedirs(OUT, exist_ok=True)

# Shared style — matches the rest of the topic diagrams.
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


def base_graph(name, title, rankdir='LR'):
    g = graphviz.Digraph(name, format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.5', nodesep='0.7', ranksep='0.9',
           splines='spline', rankdir=rankdir,
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    return g


# ── Layered cache topology (cache-read-write-strategies) ───────────
def diag_layered_cache():
    g = base_graph('cache_layers', 'Layered cache architecture — L1 edge → L2 app → L3 distributed', rankdir='TB')
    n(g, 'client', 'Client', 'gray')
    n(g, 'cdn', 'CDN / Edge Cache (L1)\nstatic assets, API responses\nwith Cache-Control', 'navy')
    n(g, 'app', 'Application Cache (L2)\nin-process (Caffeine,\nnode-cache) hot data', 'green')
    n(g, 'redis', 'Distributed Cache (L3)\nRedis / Memcached for\nshared state across instances', 'purple')
    n(g, 'db', 'Database\nsource of truth', 'gold')
    e(g, 'client', 'cdn')
    e(g, 'cdn', 'app', 'miss')
    e(g, 'app', 'redis', 'miss')
    e(g, 'redis', 'db', 'miss')
    g.render(os.path.join(OUT, 'cache-layers'), cleanup=True)
    print('Generated: cache-layers')


# ── EVCache zone topology ──────────────────────────────────────────
def diag_evcache():
    g = base_graph('evcache', 'Netflix EVCache — multi-zone Memcached, write-through + zone-local reads')
    n(g, 'app', 'Client App', 'gray')
    n(g, 'lib', 'EVCache Client Library', 'navy')
    n(g, 'za', 'Zone A Cache\n(Memcached cluster)', 'green')
    n(g, 'zb', 'Zone B Cache\n(Memcached cluster)', 'green')
    n(g, 'zc', 'Zone C Cache\n(Memcached cluster)', 'green')
    e(g, 'app', 'lib')
    e(g, 'lib', 'za', 'write-through\n+ local read')
    e(g, 'lib', 'zb', 'write-through')
    e(g, 'lib', 'zc', 'write-through')
    e(g, 'za', 'zb', 'cross-zone\nfallback', '#94a3b8', 'dashed')
    e(g, 'zb', 'zc', '', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'evcache'), cleanup=True)
    print('Generated: evcache')


# ── Facebook TAO graph-aware cache ─────────────────────────────────
def diag_tao():
    g = base_graph('tao', 'Facebook TAO — graph-aware follower / leader cache over MySQL')
    n(g, 'app', 'Application', 'gray')
    n(g, 'fc', 'Follower Cache\n(read path,\nper region)', 'navy')
    n(g, 'lc', 'Leader Cache\n(write path,\nauthoritative)', 'green')
    n(g, 'db', 'MySQL\n(objects + edges)', 'gold')
    e(g, 'app', 'fc', 'read')
    e(g, 'fc', 'lc', 'miss / invalidate')
    e(g, 'lc', 'db', 'load / persist')
    e(g, 'lc', 'fc', 'graph-aware\ninvalidation', '#6366f1', 'dashed')
    g.render(os.path.join(OUT, 'tao'), cleanup=True)
    print('Generated: tao')


# ── Cross-service cache invalidation via CDC ───────────────────────
def diag_cache_cdc():
    g = base_graph('cache_cdc', 'Microservices cache consistency — CDC fan-out invalidation')
    n(g, 'a', 'Service A\n(writer)', 'navy')
    n(g, 'db', 'Database', 'gold')
    n(g, 'cdc', 'CDC stream\n(Debezium / WAL tail)', 'teal')
    n(g, 'bus', 'Event Bus\n(Kafka)', 'purple')
    n(g, 'sa', 'Service A\nlocal cache', 'green')
    n(g, 'sb', 'Service B\nlocal cache', 'green')
    n(g, 'sc', 'Service C\nlocal cache', 'green')
    e(g, 'a', 'db', 'UPDATE')
    e(g, 'db', 'cdc')
    e(g, 'cdc', 'bus')
    e(g, 'bus', 'sa', 'invalidate')
    e(g, 'bus', 'sb', 'invalidate')
    e(g, 'bus', 'sc', 'invalidate')
    g.render(os.path.join(OUT, 'cache-cdc'), cleanup=True)
    print('Generated: cache-cdc')


# ── Lambda architecture (batch + stream) ───────────────────────────
def diag_lambda_arch():
    g = base_graph('lambda_arch', 'Lambda architecture — batch + speed layers reconciled at the serving layer')
    n(g, 'src', 'Event source\n(logs, app events)', 'gray')
    n(g, 'lake', 'Data lake\n(S3 / HDFS)', 'navy')
    n(g, 'batch', 'Batch layer\n(Spark / Hive)\nhours-old, exact', 'green')
    n(g, 'speed', 'Speed layer\n(Flink / Kafka Streams)\nsec-old, approx', 'teal')
    n(g, 'serve', 'Serving layer\n(Druid / DynamoDB)\nmerged view', 'gold')
    n(g, 'q', 'Query', 'purple')
    e(g, 'src', 'lake')
    e(g, 'src', 'speed', 'tee')
    e(g, 'lake', 'batch')
    e(g, 'batch', 'serve', 'overwrite')
    e(g, 'speed', 'serve', 'patch')
    e(g, 'q', 'serve')
    g.render(os.path.join(OUT, 'lambda-arch'), cleanup=True)
    print('Generated: lambda-arch')


# ── Kappa architecture (stream-only) ───────────────────────────────
def diag_kappa_arch():
    g = base_graph('kappa_arch', 'Kappa architecture — single stream pipeline with replay for backfills')
    n(g, 'src', 'Event source', 'gray')
    n(g, 'log', 'Durable log\n(Kafka, retention\nlong enough to replay)', 'navy')
    n(g, 'stream', 'Stream processor\n(Flink)', 'teal')
    n(g, 'serve', 'Serving store\n(Druid / Pinot / KV)', 'gold')
    n(g, 'q', 'Query', 'purple')
    e(g, 'src', 'log')
    e(g, 'log', 'stream', 'live + replay')
    e(g, 'stream', 'serve')
    e(g, 'q', 'serve')
    g.render(os.path.join(OUT, 'kappa-arch'), cleanup=True)
    print('Generated: kappa-arch')


# ── Monolith vs microservices topology ─────────────────────────────
def diag_monolith_vs_micro():
    g = base_graph('monolith_vs_micro', 'Monolith vs microservices — deployment unit and data ownership')
    with g.subgraph(name='cluster_mono') as s:
        s.attr(label='Monolith', style='rounded', color='#3b82f6')
        s.node('m_app', 'Single deployable\n(all modules in one process)',
               fillcolor=C['navy'][0], color=C['navy'][1], fontcolor=C['navy'][2], **NODE)
        s.node('m_db', 'Shared DB\n(one schema)',
               fillcolor=C['gold'][0], color=C['gold'][1], fontcolor=C['gold'][2], **NODE)
        s.edge('m_app', 'm_db')
    with g.subgraph(name='cluster_micro') as s:
        s.attr(label='Microservices', style='rounded', color='#10b981')
        for sv, db in [('users', 'users_db'), ('orders', 'orders_db'), ('billing', 'billing_db')]:
            s.node(sv, sv.title() + ' service',
                   fillcolor=C['green'][0], color=C['green'][1], fontcolor=C['green'][2], **NODE)
            s.node(db, db,
                   fillcolor=C['gold'][0], color=C['gold'][1], fontcolor=C['gold'][2], **NODE)
            s.edge(sv, db)
        s.edge('users', 'orders', label='RPC', color='#475569')
        s.edge('orders', 'billing', label='RPC', color='#475569')
    g.render(os.path.join(OUT, 'monolith-vs-micro'), cleanup=True)
    print('Generated: monolith-vs-micro')


# ── Strangler-fig migration ────────────────────────────────────────
def diag_strangler():
    g = base_graph('strangler', 'Strangler-fig migration — gateway routes new endpoints to extracted services')
    n(g, 'client', 'Client', 'gray')
    n(g, 'gw', 'API Gateway\n(routing rules)', 'navy')
    n(g, 'mono', 'Legacy monolith\n(shrinking surface)', 'gold')
    n(g, 'svc1', 'New service: Users', 'green')
    n(g, 'svc2', 'New service: Orders', 'green')
    e(g, 'client', 'gw')
    e(g, 'gw', 'mono', '/legacy/*')
    e(g, 'gw', 'svc1', '/v2/users/*')
    e(g, 'gw', 'svc2', '/v2/orders/*')
    g.render(os.path.join(OUT, 'strangler'), cleanup=True)
    print('Generated: strangler')


# ── Serverless request path ────────────────────────────────────────
def diag_serverless():
    g = base_graph('serverless', 'Serverless request path — API Gateway + Lambda + managed data')
    n(g, 'client', 'Client', 'gray')
    n(g, 'apigw', 'API Gateway / CloudFront', 'navy')
    n(g, 'auth', 'Auth (Cognito / JWT)', 'purple')
    n(g, 'fn', 'Lambda function\n(cold start: 200ms–2s,\nwarm: <50ms)', 'green')
    n(g, 'ddb', 'DynamoDB / RDS Proxy', 'gold')
    n(g, 's3', 'S3 / SQS / SNS', 'teal')
    e(g, 'client', 'apigw')
    e(g, 'apigw', 'auth', 'verify')
    e(g, 'apigw', 'fn', 'invoke')
    e(g, 'fn', 'ddb', 'data')
    e(g, 'fn', 's3', 'side-effects')
    g.render(os.path.join(OUT, 'serverless'), cleanup=True)
    print('Generated: serverless')


# ── Polling vs WebSockets vs Webhooks ──────────────────────────────
def diag_realtime_channels():
    g = base_graph('realtime_channels', 'Real-time delivery — polling vs WebSockets vs webhooks')
    n(g, 'cli', 'Client', 'gray')
    n(g, 'srv', 'Server', 'navy')
    n(g, 'peer', 'Other system\n(receiver)', 'green')
    e(g, 'cli', 'srv', 'poll: GET /updates\n(repeat every N s)', '#3b82f6')
    e(g, 'srv', 'cli', 'WebSocket frames\n(persistent, bidir)', '#10b981')
    e(g, 'srv', 'peer', 'webhook: POST URL\n(server → server,\non event)', '#f59e0b')
    g.render(os.path.join(OUT, 'realtime-channels'), cleanup=True)
    print('Generated: realtime-channels')


# ── Primary-replica vs peer-to-peer ────────────────────────────────
def diag_replication_topology():
    g = base_graph('replication_topology', 'Replication topology — single-leader vs peer-to-peer (multi-leader)')
    with g.subgraph(name='cluster_pr') as s:
        s.attr(label='Primary-replica', style='rounded', color='#3b82f6')
        s.node('p', 'Primary\n(writes)',
               fillcolor=C['navy'][0], color=C['navy'][1], fontcolor=C['navy'][2], **NODE)
        for r in ('r1', 'r2', 'r3'):
            s.node(r, 'Replica\n(reads)',
                   fillcolor=C['green'][0], color=C['green'][1], fontcolor=C['green'][2], **NODE)
            s.edge('p', r, label='replicate', color='#475569')
    with g.subgraph(name='cluster_p2p') as s:
        s.attr(label='Peer-to-peer (multi-leader)', style='rounded', color='#10b981')
        for p in ('a', 'b', 'c'):
            s.node(p, f'Peer {p.upper()}\n(read + write)',
                   fillcolor=C['purple'][0], color=C['purple'][1], fontcolor=C['purple'][2], **NODE)
        s.edge('a', 'b', dir='both', color='#475569')
        s.edge('b', 'c', dir='both', color='#475569')
        s.edge('a', 'c', dir='both', color='#475569')
    g.render(os.path.join(OUT, 'replication-topology'), cleanup=True)
    print('Generated: replication-topology')


# ── CDN edge → origin ──────────────────────────────────────────────
def diag_cdn():
    g = base_graph('cdn', 'CDN — edge PoPs cache, origin shield consolidates fills')
    n(g, 'user', 'User', 'gray')
    n(g, 'pop', 'Edge PoP\n(closest to user)', 'navy')
    n(g, 'shield', 'Origin shield\n(regional collapsing tier)', 'teal')
    n(g, 'origin', 'Origin\n(application servers,\nobject store)', 'gold')
    e(g, 'user', 'pop')
    e(g, 'pop', 'shield', 'miss')
    e(g, 'shield', 'origin', 'miss')
    g.render(os.path.join(OUT, 'cdn'), cleanup=True)
    print('Generated: cdn')


# ── Read scaling — replicas + cache + sharding ─────────────────────
def diag_read_scaling():
    g = base_graph('read_scaling', 'Read scaling stack — cache, read replicas, sharding')
    n(g, 'app', 'Application', 'gray')
    n(g, 'cache', 'Cache\n(Redis / CDN)', 'navy')
    n(g, 'router', 'Router\n(read/write split)', 'purple')
    n(g, 'primary', 'Primary\n(writes)', 'gold')
    n(g, 'r1', 'Replica\n(reads)', 'green')
    n(g, 'r2', 'Replica\n(reads)', 'green')
    n(g, 'shard1', 'Shard 1', 'teal')
    n(g, 'shard2', 'Shard 2', 'teal')
    e(g, 'app', 'cache', 'read')
    e(g, 'cache', 'router', 'miss')
    e(g, 'router', 'primary', 'write')
    e(g, 'router', 'r1', 'read')
    e(g, 'router', 'r2', 'read')
    e(g, 'primary', 'shard1', '', '#94a3b8', 'dashed')
    e(g, 'primary', 'shard2', '', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'read-scaling'), cleanup=True)
    print('Generated: read-scaling')


# ── Write scaling — sharding + queueing ────────────────────────────
def diag_write_scaling():
    g = base_graph('write_scaling', 'Write scaling — async queue + shard router across DB partitions')
    n(g, 'app', 'Application', 'gray')
    n(g, 'q', 'Queue\n(Kafka / SQS,\nabsorb spikes)', 'navy')
    n(g, 'worker', 'Workers\n(idempotent)', 'purple')
    n(g, 'router', 'Shard router\n(by user_id hash)', 'teal')
    n(g, 's1', 'Shard 1\nprimary', 'gold')
    n(g, 's2', 'Shard 2\nprimary', 'gold')
    n(g, 's3', 'Shard 3\nprimary', 'gold')
    e(g, 'app', 'q', 'enqueue')
    e(g, 'q', 'worker')
    e(g, 'worker', 'router')
    e(g, 'router', 's1')
    e(g, 'router', 's2')
    e(g, 'router', 's3')
    g.render(os.path.join(OUT, 'write-scaling'), cleanup=True)
    print('Generated: write-scaling')


# ── Outbox pattern ─────────────────────────────────────────────────
def diag_outbox():
    g = base_graph('outbox', 'Outbox pattern — atomic DB write + outbox row, relay drains to bus')
    n(g, 'svc', 'Service', 'navy')
    n(g, 'db', 'DB\n(business table\n+ outbox table)', 'gold')
    n(g, 'relay', 'Outbox relay\n(poll or CDC)', 'teal')
    n(g, 'bus', 'Event bus\n(Kafka / SNS)', 'purple')
    n(g, 'sub', 'Subscribers', 'green')
    e(g, 'svc', 'db', 'TX:\nwrite row +\noutbox event')
    e(g, 'relay', 'db', 'read unsent')
    e(g, 'relay', 'bus', 'publish')
    e(g, 'bus', 'sub')
    g.render(os.path.join(OUT, 'outbox'), cleanup=True)
    print('Generated: outbox')


# ── Saga / multi-step process ──────────────────────────────────────
def diag_saga():
    g = base_graph('saga', 'Saga — orchestrated multi-step transaction with compensations')
    n(g, 'orch', 'Orchestrator\n(workflow engine,\nTemporal / Step Fns)', 'navy')
    n(g, 's1', 'Step 1: Reserve inventory', 'green')
    n(g, 's2', 'Step 2: Charge payment', 'green')
    n(g, 's3', 'Step 3: Create shipment', 'green')
    n(g, 'c1', 'Compensate:\nrelease inventory', 'red')
    n(g, 'c2', 'Compensate:\nrefund payment', 'red')
    e(g, 'orch', 's1')
    e(g, 's1', 's2', 'ok')
    e(g, 's2', 's3', 'ok')
    e(g, 's3', 'c2', 'fail', '#ef4444', 'dashed')
    e(g, 'c2', 'c1', '', '#ef4444', 'dashed')
    g.render(os.path.join(OUT, 'saga'), cleanup=True)
    print('Generated: saga')


# ── Large-blob upload (presigned + multipart) ──────────────────────
def diag_blob_upload():
    g = base_graph('blob_upload', 'Large-blob upload — presigned URL + multipart, client → object store')
    n(g, 'client', 'Client', 'gray')
    n(g, 'api', 'API server\n(issues presigned URL)', 'navy')
    n(g, 'auth', 'Auth / quota check', 'purple')
    n(g, 's3', 'Object store\n(S3 / GCS,\nmultipart upload)', 'gold')
    n(g, 'cdn', 'CDN', 'teal')
    n(g, 'meta', 'Metadata DB', 'green')
    e(g, 'client', 'api', '1 request URL')
    e(g, 'api', 'auth')
    e(g, 'api', 'meta', 'reserve key')
    e(g, 'api', 'client', '2 presigned URL', '#475569', 'dashed')
    e(g, 'client', 's3', '3 PUT bytes\n(multipart, parallel)')
    e(g, 's3', 'cdn', 'serve via CDN')
    g.render(os.path.join(OUT, 'blob-upload'), cleanup=True)
    print('Generated: blob-upload')


# ── Wave 4 (topic files) — additional diagrams ─────────────────────


# Concurrency: thread pool
def diag_thread_pool():
    g = base_graph('thread_pool', 'Thread pool — submitter, queue, workers, results')
    n(g, 'sub', 'Task submitter\n(main thread)', 'gray')
    n(g, 'q',   'Task queue\n[T1][T2][T3]…', 'navy')
    n(g, 'w1',  'Worker 1\n(busy)', 'green')
    n(g, 'w2',  'Worker 2\n(idle)', 'gold')
    n(g, 'w3',  'Worker 3\n(busy)', 'green')
    n(g, 'w4',  'Worker 4\n(idle)', 'gold')
    n(g, 'res', 'Completed results\nFuture1 / Future2 …', 'purple')
    e(g, 'sub', 'q', 'submit')
    for w in ('w1', 'w2', 'w3', 'w4'):
        e(g, 'q', w, 'dispatch')
        e(g, w, 'res', 'complete')
    g.render(os.path.join(OUT, 'thread-pool'), cleanup=True)
    print('Generated: thread-pool')


# Primary-replica replication topology
def diag_primary_replica():
    g = base_graph('primary_replica',
                   'Primary-replica replication — writes to primary, reads from replicas')
    n(g, 'w', 'Writes', 'gray')
    n(g, 'p', 'Primary', 'navy')
    n(g, 'r1', 'Replica 1', 'green')
    n(g, 'r2', 'Replica 2', 'green')
    n(g, 'rd1', 'Reads', 'gray')
    n(g, 'rd2', 'Reads', 'gray')
    e(g, 'w', 'p')
    e(g, 'p', 'r1', 'WAL / binlog')
    e(g, 'p', 'r2', 'WAL / binlog')
    e(g, 'r1', 'rd1')
    e(g, 'r2', 'rd2')
    g.render(os.path.join(OUT, 'primary-replica'), cleanup=True)
    print('Generated: primary-replica')


# Distributed cache cluster (sharded with replicas)
def diag_distributed_cache():
    g = base_graph('distributed_cache',
                   'Distributed cache — sharded cluster with replicas behind app servers')
    with g.subgraph(name='cluster_app') as c:
        c.attr(label='App servers (with L1 cache)', style='rounded',
               color='#cbd5e1', fontname='Helvetica Neue', fontsize='11')
        for i in (1, 2, 3):
            c.node(f'app{i}', f'Server {i}\nL1 cache',
                   fillcolor=C['gray'][0], color=C['gray'][1],
                   fontcolor=C['gray'][2], **NODE)
    with g.subgraph(name='cluster_cache') as c:
        c.attr(label='Cache cluster (consistent hashing)', style='rounded',
               color='#bfdbfe', fontname='Helvetica Neue', fontsize='11')
        c.node('n1', 'Node 1\nslots 0-5460',
               fillcolor=C['navy'][0], color=C['navy'][1],
               fontcolor=C['navy'][2], **NODE)
        c.node('n2', 'Node 2\nslots 5461-10922',
               fillcolor=C['navy'][0], color=C['navy'][1],
               fontcolor=C['navy'][2], **NODE)
        c.node('n3', 'Node 3\nslots 10923-16383',
               fillcolor=C['navy'][0], color=C['navy'][1],
               fontcolor=C['navy'][2], **NODE)
        c.node('rep1', 'Replica 1',
               fillcolor=C['green'][0], color=C['green'][1],
               fontcolor=C['green'][2], **NODE)
        c.node('rep2', 'Replica 2',
               fillcolor=C['green'][0], color=C['green'][1],
               fontcolor=C['green'][2], **NODE)
        c.node('rep3', 'Replica 3',
               fillcolor=C['green'][0], color=C['green'][1],
               fontcolor=C['green'][2], **NODE)
    for i in (1, 2, 3):
        e(g, f'app{i}', 'n1', '' if i != 1 else 'hash slot')
        e(g, f'app{i}', 'n2')
        e(g, f'app{i}', 'n3')
    e(g, 'n1', 'rep1', 'replicate')
    e(g, 'n2', 'rep2', 'replicate')
    e(g, 'n3', 'rep3', 'replicate')
    g.render(os.path.join(OUT, 'distributed-cache'), cleanup=True)
    print('Generated: distributed-cache')


# Dead letter queue
def diag_dlq():
    g = base_graph('dlq',
                   'Dead letter queue — retries exhausted → DLQ → alert + manual replay')
    n(g, 'prod', 'Producer', 'gray')
    n(g, 'main', 'Main queue', 'navy')
    n(g, 'cons', 'Consumer\n(retries 1, 2, 3)', 'gold')
    n(g, 'dlq',  'DLQ', 'red')
    n(g, 'al',   'Alerting\n(PagerDuty)', 'red')
    n(g, 'rp',   'Manual replay', 'purple')
    e(g, 'prod', 'main')
    e(g, 'main', 'cons', 'deliver')
    e(g, 'cons', 'dlq', 'all retries fail')
    e(g, 'dlq', 'al')
    e(g, 'dlq', 'rp')
    g.render(os.path.join(OUT, 'dlq'), cleanup=True)
    print('Generated: dlq')


# CQRS + event sourcing read models
def diag_cqrs_event_sourcing():
    g = base_graph('cqrs_event_sourcing',
                   'CQRS + event sourcing — command side, event log, projected read models')
    n(g, 'cmd',  'Command handler', 'navy')
    n(g, 'es',   'Event store', 'gold')
    n(g, 'k',    'Kafka topic\n(order-events)', 'purple')
    n(g, 'rm1',  'Read model\nPostgres\n(lists)', 'green')
    n(g, 'rm2',  'Read model\nElasticsearch\n(search)', 'green')
    e(g, 'cmd', 'es', 'append')
    e(g, 'es', 'k', 'publish')
    e(g, 'k', 'rm1', 'project')
    e(g, 'k', 'rm2', 'project')
    g.render(os.path.join(OUT, 'cqrs-event-sourcing'), cleanup=True)
    print('Generated: cqrs-event-sourcing')


# Saga (choreography) flow — distinct slug to avoid clashing with diag_saga (orchestration)
def diag_saga_choreography():
    g = base_graph('saga_choreography',
                   'Saga (choreography) — events flow service-to-service; compensation on failure')
    n(g, 'o', 'Order service', 'navy')
    n(g, 'p', 'Payment service', 'gold')
    n(g, 'i', 'Inventory service', 'green')
    n(g, 'd', 'Done', 'gray')
    e(g, 'o', 'p', 'OrderCreated')
    e(g, 'p', 'i', 'PaymentCharged')
    e(g, 'i', 'd', 'InventoryReserved')
    e(g, 'p', 'o', 'PaymentFailed (compensate)', '#dc2626', 'dashed')
    g.render(os.path.join(OUT, 'saga-choreography'), cleanup=True)
    print('Generated: saga-choreography')


# Messaging — point-to-point queue
def diag_pubsub_queue():
    g = base_graph('pubsub_queue',
                   'Point-to-point queue — competing consumers, each message processed once')
    n(g, 'prod', 'Producer', 'gray')
    n(g, 'q',    'Queue', 'navy')
    n(g, 'a',    'Consumer A\n(message 1)', 'green')
    n(g, 'b',    'Consumer B\n(message 2)', 'green')
    n(g, 'c',    'Consumer C\n(message 3)', 'green')
    e(g, 'prod', 'q')
    e(g, 'q', 'a')
    e(g, 'q', 'b')
    e(g, 'q', 'c')
    g.render(os.path.join(OUT, 'pubsub-queue'), cleanup=True)
    print('Generated: pubsub-queue')


# Messaging — pub/sub topic fanout
def diag_pubsub_topic():
    g = base_graph('pubsub_topic',
                   'Pub/Sub topic — each subscriber gets every message independently')
    n(g, 'prod', 'Producer', 'gray')
    n(g, 't',    'Topic', 'navy')
    n(g, 'an',   'Analytics service', 'green')
    n(g, 'no',   'Notification service', 'gold')
    n(g, 'au',   'Audit service', 'purple')
    e(g, 'prod', 't')
    e(g, 't', 'an', 'all')
    e(g, 't', 'no', 'all')
    e(g, 't', 'au', 'all')
    g.render(os.path.join(OUT, 'pubsub-topic'), cleanup=True)
    print('Generated: pubsub-topic')


# Messaging — Kafka consumer groups
def diag_consumer_groups():
    g = base_graph('consumer_groups',
                   'Kafka consumer groups — pub/sub between groups, queue within group')
    n(g, 'prod', 'Producer', 'gray')
    n(g, 't',    'Topic\n(partitioned)', 'navy')
    n(g, 'a1',   'Consumer 1\n(group A)', 'green')
    n(g, 'a2',   'Consumer 2\n(group A)', 'green')
    n(g, 'b3',   'Consumer 3\n(group B)', 'gold')
    e(g, 'prod', 't')
    e(g, 't', 'a1', 'partition 0')
    e(g, 't', 'a2', 'partition 1')
    e(g, 't', 'b3', 'all partitions')
    g.render(os.path.join(OUT, 'consumer-groups'), cleanup=True)
    print('Generated: consumer-groups')


if __name__ == '__main__':
    diag_layered_cache()
    diag_evcache()
    diag_tao()
    diag_cache_cdc()
    diag_lambda_arch()
    diag_kappa_arch()
    diag_monolith_vs_micro()
    diag_strangler()
    diag_serverless()
    diag_realtime_channels()
    diag_replication_topology()
    diag_cdn()
    diag_read_scaling()
    diag_write_scaling()
    diag_outbox()
    diag_saga()
    diag_blob_upload()
    # Wave 4 additions
    diag_thread_pool()
    diag_primary_replica()
    diag_distributed_cache()
    diag_dlq()
    diag_cqrs_event_sourcing()
    diag_saga_choreography()
    diag_pubsub_queue()
    diag_pubsub_topic()
    diag_consumer_groups()
    print('\nAll system-design diagrams generated.')
