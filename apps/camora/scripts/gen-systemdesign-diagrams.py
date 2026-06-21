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
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.25', nodesep='0.5', ranksep='0.45',
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


# ── Wave 5: residual ASCII cleanup diagrams ───────────────────────

def diag_priority_queue_routing():
    g = base_graph('priority_queue_routing',
                   'Priority queue routing — urgent / normal / batch fanout', rankdir='TB')
    n(g, 'req', 'Incoming Requests', 'gray')
    n(g, 'router', 'Priority Router', 'navy')
    n(g, 'urgent', 'URGENT Queue\n(Kafka)', 'red')
    n(g, 'normal', 'NORMAL Queue\n(Kafka)', 'gold')
    n(g, 'batch',  'BATCH Queue\n(Kafka)', 'green')
    n(g, 'wu', 'Workers (10x)\np99 < 1s', 'red')
    n(g, 'wn', 'Workers (normal)\np99 < 5s', 'gold')
    n(g, 'wb', 'Scheduled Job\nhourly', 'green')
    e(g, 'req', 'router')
    e(g, 'router', 'urgent', 'OTP, alerts')
    e(g, 'router', 'normal', 'order updates')
    e(g, 'router', 'batch', 'marketing')
    e(g, 'urgent', 'wu')
    e(g, 'normal', 'wn')
    e(g, 'batch',  'wb')
    g.render(os.path.join(OUT, 'priority-queue-routing'), cleanup=True)
    print('Generated: priority-queue-routing')


def diag_typeahead_cache():
    g = base_graph('typeahead_cache',
                   'Typeahead cache hierarchy — browser → CDN edge → service')
    n(g, 'browser', 'Browser Cache\n(1 min)', 'gray')
    n(g, 'cdn', 'CDN Edge Cache\n(5 min)', 'navy')
    n(g, 'svc', 'Typeahead Service', 'green')
    e(g, 'browser', 'cdn')
    e(g, 'cdn', 'svc', 'on miss')
    g.render(os.path.join(OUT, 'typeahead-cache'), cleanup=True)
    print('Generated: typeahead-cache')


def diag_audio_streaming_path():
    g = base_graph('audio_streaming_path',
                   'Audio streaming path — client → CDN → origin → S3')
    n(g, 'client', 'Client', 'gray')
    n(g, 'cdn', 'CDN (Edge)', 'navy')
    n(g, 'origin', 'Origin\n(if miss)', 'green')
    n(g, 's3', 'S3\n(Audio)', 'gold')
    e(g, 'client', 'cdn')
    e(g, 'cdn', 'origin', 'miss')
    e(g, 'origin', 's3')
    g.render(os.path.join(OUT, 'audio-streaming-path'), cleanup=True)
    print('Generated: audio-streaming-path')


def diag_spotify_connect():
    g = base_graph('spotify_connect',
                   'Spotify Connect — control device → service → playback device', rankdir='TB')
    n(g, 'phone', 'Phone\n(Control)', 'gray')
    n(g, 'svc',   'Connect Service', 'navy')
    n(g, 'spk',   'Speaker\n(Playback)', 'green')
    n(g, 'state', 'Player State\n{ track, pos, device_id }', 'gold')
    e(g, 'phone', 'svc')
    e(g, 'svc', 'spk')
    e(g, 'svc', 'state', 'persist')
    g.render(os.path.join(OUT, 'spotify-connect'), cleanup=True)
    print('Generated: spotify-connect')


def diag_hybrid_fanout():
    g = base_graph('hybrid_fanout',
                   'Hybrid fan-out — push for normal users, pull for celebrities', rankdir='TB')
    n(g, 'post', 'User Posts', 'gray')
    n(g, 'check', 'Check followers', 'navy')
    n(g, 'normal', '< 10K followers\n(Normal users)', 'green')
    n(g, 'celeb',  '> 10K followers\n(Celebrities)', 'gold')
    n(g, 'push', 'PUSH to feeds\n(async fan-out)', 'green')
    n(g, 'pull', 'PULL at read time\n(merge on query)', 'gold')
    e(g, 'post', 'check')
    e(g, 'check', 'normal')
    e(g, 'check', 'celeb')
    e(g, 'normal', 'push')
    e(g, 'celeb', 'pull')
    g.render(os.path.join(OUT, 'hybrid-fanout'), cleanup=True)
    print('Generated: hybrid-fanout')


def diag_realtime_feed_update():
    g = base_graph('realtime_feed_update',
                   'Real-time feed update — Kafka → fan-out → WebSocket fleet', rankdir='TB')
    n(g, 'src', 'Friend posts\n(Post Service)', 'gray')
    n(g, 'kafka', 'Kafka', 'navy')
    n(g, 'fanout', 'Fan-out Service', 'navy')
    n(g, 'ws1', 'WebSocket Server 1\n(users A-M)', 'green')
    n(g, 'ws2', 'WebSocket Server 2\n(users N-S)', 'green')
    n(g, 'ws3', 'WebSocket Server 3\n(users T-Z)', 'green')
    n(g, 'users', 'Connected Users', 'gold')
    e(g, 'src', 'kafka')
    e(g, 'kafka', 'fanout')
    e(g, 'fanout', 'ws1')
    e(g, 'fanout', 'ws2')
    e(g, 'fanout', 'ws3')
    e(g, 'ws1', 'users')
    e(g, 'ws2', 'users')
    e(g, 'ws3', 'users')
    g.render(os.path.join(OUT, 'realtime-feed-update'), cleanup=True)
    print('Generated: realtime-feed-update')


def diag_consistent_hash_ring():
    g = base_graph('consistent_hash_ring',
                   'Consistent hash ring — keys walk clockwise to nearest node', rankdir='TB')
    g.attr(layout='circo')
    n(g, 'a', 'Node A', 'navy')
    n(g, 'b', 'Node B', 'green')
    n(g, 'c', 'Node C', 'gold')
    n(g, 'k1', 'key1', 'gray')
    n(g, 'k2', 'key2', 'gray')
    n(g, 'k3', 'key3', 'gray')
    e(g, 'k1', 'a', 'walk CW')
    e(g, 'k2', 'b', 'walk CW')
    e(g, 'k3', 'c', 'walk CW')
    e(g, 'a', 'b', '', '#94a3b8', 'dashed')
    e(g, 'b', 'c', '', '#94a3b8', 'dashed')
    e(g, 'c', 'a', '', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'consistent-hash-ring'), cleanup=True)
    print('Generated: consistent-hash-ring')


def diag_write_quorum():
    g = base_graph('write_quorum',
                   'Write path with quorum (N=3, W=2) — coordinator fanout to replicas', rankdir='TB')
    n(g, 'client', 'Client', 'gray')
    n(g, 'coord',  'Coordinator', 'navy')
    n(g, 'r1', 'Replica 1\n(ACK)', 'green')
    n(g, 'r2', 'Replica 2\n(ACK)', 'green')
    n(g, 'r3', 'Replica 3\n(async)', 'gold')
    n(g, 'ok', 'W=2 acks → success\n(R3 eventual)', 'navy')
    e(g, 'client', 'coord')
    e(g, 'coord', 'r1')
    e(g, 'coord', 'r2')
    e(g, 'coord', 'r3', 'async')
    e(g, 'r1', 'ok')
    e(g, 'r2', 'ok')
    g.render(os.path.join(OUT, 'write-quorum'), cleanup=True)
    print('Generated: write-quorum')


def diag_news_ingestion():
    g = base_graph('news_ingestion',
                   'News article ingestion pipeline', rankdir='TB')
    n(g, 'feed', 'Feed Poller\n(scheduled)', 'gray')
    n(g, 'dedup', 'URL Dedup\n(Bloom filter)', 'navy')
    n(g, 'fetch', 'Content Fetcher\n(text, images, meta)', 'green')
    n(g, 'nlp',   'NLP Pipeline\n(entities, embeddings,\nsummarize)', 'purple')
    n(g, 'es',    'Elasticsearch\n(search)', 'gold')
    n(g, 'pg',    'PostgreSQL\n(metadata)', 'gold')
    e(g, 'feed', 'dedup', 'check seen')
    e(g, 'dedup', 'fetch', 'new URLs')
    e(g, 'fetch', 'nlp')
    e(g, 'nlp', 'es')
    e(g, 'nlp', 'pg')
    g.render(os.path.join(OUT, 'news-ingestion'), cleanup=True)
    print('Generated: news-ingestion')


def diag_write_aggregation():
    g = base_graph('write_aggregation',
                   'Leaderboard write aggregation — local buffer per server, flush 1s')
    n(g, 'g1', 'Game Server 1', 'gray')
    n(g, 'g2', 'Game Server 2', 'gray')
    n(g, 'g3', 'Game Server 3', 'gray')
    n(g, 'buf', 'Local Buffer\n(per server,\nkeep highest)', 'navy')
    n(g, 'redis', 'Redis ZADD\n(every 1s)', 'green')
    e(g, 'g1', 'buf')
    e(g, 'g2', 'buf')
    e(g, 'g3', 'buf')
    e(g, 'buf', 'redis', 'flush')
    g.render(os.path.join(OUT, 'write-aggregation'), cleanup=True)
    print('Generated: write-aggregation')


def diag_hotel_search_pipeline():
    g = base_graph('hotel_search_pipeline',
                   'Hotel search — Elasticsearch filter → DB exact availability → ranking', rankdir='TB')
    n(g, 'q', 'User query\n(NYC, dates, guests, price)', 'gray')
    n(g, 'es', 'Phase 1 — Elasticsearch\n(geo, rating, amenities;\n500 candidates)', 'navy')
    n(g, 'db', 'Phase 2 — Database\n(exact room_inventory,\nprices, capacity;\n100 hotels)', 'green')
    n(g, 'rank', 'Phase 3 — Ranking\n(relevance × reviews ×\nprice + personalization +\nbusiness rules)', 'gold')
    e(g, 'q', 'es')
    e(g, 'es', 'db')
    e(g, 'db', 'rank')
    g.render(os.path.join(OUT, 'hotel-search-pipeline'), cleanup=True)
    print('Generated: hotel-search-pipeline')


def diag_booking_state_machine():
    g = base_graph('booking_state_machine',
                   'Booking state machine — HOLD → CONFIRMED → COMPLETED with failure paths')
    n(g, 'hold', 'HOLD\n(10 min TTL)', 'gold')
    n(g, 'conf', 'CONFIRMED', 'navy')
    n(g, 'comp', 'COMPLETED', 'green')
    n(g, 'exp', 'EXPIRED', 'gray')
    n(g, 'canc', 'CANCELLED', 'red')
    e(g, 'hold', 'conf', 'payment ok')
    e(g, 'conf', 'comp', 'stay ends')
    e(g, 'hold', 'exp', 'TTL', '#94a3b8', 'dashed')
    e(g, 'conf', 'canc', 'user cancels', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'booking-state-machine'), cleanup=True)
    print('Generated: booking-state-machine')


def diag_channel_manager():
    g = base_graph('channel_manager',
                   'Hotel channel manager — central inventory hub fans out to OTAs', rankdir='TB')
    n(g, 'pms', 'Hotel PMS', 'gray')
    n(g, 'hub', 'Channel Manager Hub', 'navy')
    n(g, 'b', 'Booking.com', 'green')
    n(g, 'e', 'Expedia', 'green')
    n(g, 'h', 'Hotels.com', 'green')
    n(g, 'd', 'Direct Website', 'green')
    n(g, 'a', 'Airbnb', 'green')
    e(g, 'pms', 'hub')
    e(g, 'hub', 'b')
    e(g, 'hub', 'e')
    e(g, 'hub', 'h')
    e(g, 'hub', 'd')
    e(g, 'hub', 'a')
    g.render(os.path.join(OUT, 'channel-manager'), cleanup=True)
    print('Generated: channel-manager')


def diag_traffic_pipeline():
    g = base_graph('traffic_pipeline',
                   'Real-time traffic pipeline — phone GPS → Flink → traffic DB → tile service', rankdir='TB')
    n(g, 'phone', 'Phone\n(location update)', 'gray')
    n(g, 'kafka', 'Kafka', 'navy')
    n(g, 'flink', 'Stream Processor (Flink)\nmap-match · denoise ·\nagg speed · smooth', 'purple')
    n(g, 'tdb',   'Traffic DB\nsegment_id → speed_ratio', 'gold')
    n(g, 'tiles', 'Traffic Tile Service\ngreen / yellow / red overlay', 'green')
    e(g, 'phone', 'kafka')
    e(g, 'kafka', 'flink')
    e(g, 'flink', 'tdb')
    e(g, 'tdb', 'tiles')
    g.render(os.path.join(OUT, 'traffic-pipeline'), cleanup=True)
    print('Generated: traffic-pipeline')


def diag_sfu_topology():
    g = base_graph('sfu_topology',
                   'SFU topology — each peer uploads 1 stream, SFU forwards to N-1', rankdir='TB')
    n(g, 'sfu', 'SFU\n(Selective Forwarding Unit)', 'navy')
    n(g, 'a', 'Participant A', 'green')
    n(g, 'b', 'Participant B', 'green')
    n(g, 'c', 'Participant C', 'green')
    n(g, 'd', 'Participant D', 'green')
    e(g, 'a', 'sfu', 'upload')
    e(g, 'b', 'sfu', 'upload')
    e(g, 'c', 'sfu', 'upload')
    e(g, 'd', 'sfu', 'upload')
    e(g, 'sfu', 'a', 'B,C,D', '#94a3b8', 'dashed')
    e(g, 'sfu', 'b', 'A,C,D', '#94a3b8', 'dashed')
    e(g, 'sfu', 'c', 'A,B,D', '#94a3b8', 'dashed')
    e(g, 'sfu', 'd', 'A,B,C', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'sfu-topology'), cleanup=True)
    print('Generated: sfu-topology')


def diag_active_speaker_layout():
    g = base_graph('active_speaker_layout',
                   'Active speaker layout — SFU upgrades main feed to HD, others stay LD')
    n(g, 'sfu', 'SFU\n(audio level detection)', 'navy')
    n(g, 'main', 'Active Speaker\n(HD, ~2 Mbps)', 'green')
    n(g, 't1', 'Thumbnail 1\n(LD, ~100 Kbps)', 'gold')
    n(g, 't2', 'Thumbnail 2\n(LD)', 'gold')
    n(g, 't3', 'Thumbnail 3\n(LD)', 'gold')
    e(g, 'sfu', 'main', 'HD')
    e(g, 'sfu', 't1')
    e(g, 'sfu', 't2')
    e(g, 'sfu', 't3')
    g.render(os.path.join(OUT, 'active-speaker-layout'), cleanup=True)
    print('Generated: active-speaker-layout')


def diag_cqrs_vs_traditional():
    g = base_graph('cqrs_vs_traditional',
                   'Single-model vs CQRS — separate read and write models', rankdir='TB')
    with g.subgraph(name='cluster_trad') as s:
        s.attr(label='  Traditional (single model)  ', style='rounded',
               color='#cbd5e1', fontname='Helvetica Neue', fontsize='11')
        n(s, 'app1', 'Application', 'gray')
        n(s, 'db1',  'Single DB\n(reads + writes,\nJOINs on read)', 'navy')
        e(s, 'app1', 'db1', 'read + write')
    with g.subgraph(name='cluster_cqrs') as s:
        s.attr(label='  CQRS (separated models)  ', style='rounded',
               color='#cbd5e1', fontname='Helvetica Neue', fontsize='11')
        n(s, 'app2', 'Application', 'gray')
        n(s, 'wdb',  'Write DB\n(normalized, ACID)', 'green')
        n(s, 'rdb',  'Read Store\n(denormalized,\npre-joined)', 'gold')
        e(s, 'app2', 'wdb', 'commands')
        e(s, 'app2', 'rdb', 'queries')
        e(s, 'wdb', 'rdb', 'event stream', '#6366f1', 'dashed')
    g.render(os.path.join(OUT, 'cqrs-vs-traditional'), cleanup=True)
    print('Generated: cqrs-vs-traditional')


def diag_microservices_mesh():
    g = base_graph('microservices_mesh',
                   'Production microservices — API Gateway, sidecar mesh, message queue', rankdir='TB')
    n(g, 'gw', 'API Gateway', 'navy')
    n(g, 'user', 'User Service\n[sidecar]', 'green')
    n(g, 'order', 'Order Service\n[sidecar]', 'green')
    n(g, 'pay', 'Payment Service\n[sidecar]', 'green')
    n(g, 'udb', 'Users DB', 'gold')
    n(g, 'pdb', 'Payments DB', 'gold')
    n(g, 'mq',  'Message Queue\n(Kafka / SQS)', 'purple')
    n(g, 'an',  'Analytics', 'green')
    n(g, 'em',  'Email', 'green')
    n(g, 'inv', 'Inventory', 'green')
    n(g, 'infra', 'Service Registry (Consul) ·\nConfig (Vault) ·\nTracing (Jaeger) ·\nLogs (ELK)', 'gray')
    e(g, 'gw', 'user')
    e(g, 'gw', 'order')
    e(g, 'gw', 'pay')
    e(g, 'user', 'udb')
    e(g, 'pay', 'pdb')
    e(g, 'order', 'mq', 'events')
    e(g, 'mq', 'an')
    e(g, 'mq', 'em')
    e(g, 'mq', 'inv')
    e(g, 'gw', 'infra', '', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'microservices-mesh'), cleanup=True)
    print('Generated: microservices-mesh')


def diag_zero_trust_services():
    g = base_graph('zero_trust_services',
                   'Zero-trust services — JWT validated at every hop, encrypted store')
    n(g, 'a', 'Service A\nValidate JWT\nCheck scopes\nRBAC checks', 'navy')
    n(g, 'b', 'Service B\nValidate JWT\nCheck scopes\nRBAC checks', 'navy')
    n(g, 'c', 'Service C\nValidate JWT\nCheck scopes\nRBAC checks', 'navy')
    n(g, 'store', 'Encrypted Data Store\nAES-256 at rest · Vault secrets ·\nKey rotation · Audit logs', 'gold')
    e(g, 'a', 'store')
    e(g, 'b', 'store')
    e(g, 'c', 'store')
    g.render(os.path.join(OUT, 'zero-trust-services'), cleanup=True)
    print('Generated: zero-trust-services')


def diag_otel_pipeline():
    g = base_graph('otel_pipeline',
                   'OpenTelemetry pipeline — services emit logs/metrics/traces via Collectors', rankdir='TB')
    n(g, 'a', 'Service A\nOTel SDK\nlogs / metrics / traces', 'gray')
    n(g, 'b', 'Service B\nOTel SDK', 'gray')
    n(g, 'c', 'Service C\nOTel SDK', 'gray')
    n(g, 'col', 'OTel Collectors\n(receive · process · export)', 'navy')
    n(g, 'logs', 'Logs backend\n(Loki / ELK)', 'green')
    n(g, 'metrics', 'Metrics backend\n(Prometheus)', 'gold')
    n(g, 'traces', 'Traces backend\n(Jaeger / Tempo)', 'purple')
    e(g, 'a', 'col')
    e(g, 'b', 'col')
    e(g, 'c', 'col')
    e(g, 'col', 'logs')
    e(g, 'col', 'metrics')
    e(g, 'col', 'traces')
    g.render(os.path.join(OUT, 'otel-pipeline'), cleanup=True)
    print('Generated: otel-pipeline')


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
    # Wave 5 additions
    diag_priority_queue_routing()
    diag_typeahead_cache()
    diag_audio_streaming_path()
    diag_spotify_connect()
    diag_hybrid_fanout()
    diag_realtime_feed_update()
    diag_consistent_hash_ring()
    diag_write_quorum()
    diag_news_ingestion()
    diag_write_aggregation()
    diag_hotel_search_pipeline()
    diag_booking_state_machine()
    diag_channel_manager()
    diag_traffic_pipeline()
    diag_sfu_topology()
    diag_active_speaker_layout()
    diag_cqrs_vs_traditional()
    diag_microservices_mesh()
    diag_zero_trust_services()
    diag_otel_pipeline()
    print('\nAll system-design diagrams generated.')
