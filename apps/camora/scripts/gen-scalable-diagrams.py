#!/usr/bin/env python3
"""Generate Scalable Systems category diagrams. Landscape (LR) Graphviz PNGs.

Outputs to apps/camora/public/diagrams/scalable/. Mirrors the style of
gen-sre-diagrams.py.
"""
import graphviz
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'scalable')
os.makedirs(OUT, exist_ok=True)

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
    g.attr(bgcolor='#ffffff', dpi='120', pad='0.25', nodesep='0.5', ranksep='0.45',
           splines='spline', rankdir=rankdir,
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    return g


# ── ssys-001: Negative caching — penetration vs protection ──────────
def diag_negative_caching():
    g = base_graph('negative_caching',
                   'Cache penetration — without vs with negative caching')
    # Top row: penetration
    n(g, 'c1', 'Client', 'gray')
    n(g, 'cache1', 'Cache\n(no entry)', 'navy')
    n(g, 'db1', 'Database', 'red')
    n(g, 'na1', 'NOT FOUND\n(every request)', 'red')
    e(g, 'c1', 'cache1', 'request')
    e(g, 'cache1', 'db1', 'MISS', '#ef4444')
    e(g, 'db1', 'na1', '404', '#ef4444')

    # Bottom row: with negative caching
    n(g, 'c2', 'Client', 'gray')
    n(g, 'cache2', 'Cache\n(stores sentinel\nNOT_FOUND, TTL=60s)', 'green')
    n(g, 'db2', 'Database\n(hit only on first\nrequest in window)', 'gold')
    n(g, 'ok2', 'NOT FOUND\nfrom cache\n(backend protected)', 'green')
    e(g, 'c2', 'cache2', 'request')
    e(g, 'cache2', 'db2', '1st MISS only', '#f59e0b', 'dashed')
    e(g, 'cache2', 'ok2', 'subsequent HIT', '#22c55e')

    # Force two ranks
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('c1'); s.node('cache1'); s.node('db1'); s.node('na1')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('c2'); s.node('cache2'); s.node('db2'); s.node('ok2')

    g.render(os.path.join(OUT, 'negative-caching'), cleanup=True)
    print('Generated: negative-caching')


# ── ssys-022: Sticky sessions — three mechanisms ───────────────────
def diag_sticky_sessions():
    g = base_graph('sticky_sessions',
                   'Sticky sessions — cookie / IP-hash / consistent-hash')

    # Cookie-based
    n(g, 'cb_c', 'Client', 'gray')
    n(g, 'cb_lb', 'Load Balancer\nreads SERVERID cookie', 'navy')
    n(g, 'cb_a', 'Server A\n(pinned)', 'green')
    e(g, 'cb_c', 'cb_lb', 'cookie: SERVERID=A')
    e(g, 'cb_lb', 'cb_a', 'route by cookie', '#22c55e')

    # IP-hash
    n(g, 'ip_c', 'Client\n10.0.1.42', 'gray')
    n(g, 'ip_lb', 'Load Balancer\nhash(IP) % N', 'navy')
    n(g, 'ip_b', 'Server C\n(index 2)', 'gold')
    e(g, 'ip_c', 'ip_lb', 'TCP connection')
    e(g, 'ip_lb', 'ip_b', 'deterministic by IP', '#f59e0b')

    # URL/header-based
    n(g, 'h_c', 'Client\n/api/user/42', 'gray')
    n(g, 'h_lb', 'Load Balancer\nhash(user_id)', 'navy')
    n(g, 'h_d', 'Server B\n(owns user 42)', 'purple')
    e(g, 'h_c', 'h_lb', 'request URL')
    e(g, 'h_lb', 'h_d', 'consistent hash', '#6366f1')

    g.render(os.path.join(OUT, 'sticky-sessions'), cleanup=True)
    print('Generated: sticky-sessions')


# ── ssys-056: Idempotency across microservices ─────────────────────
def diag_idempotency_microservices():
    g = base_graph('idempotency_microservices',
                   'Idempotency keys propagated across microservices')
    n(g, 'cli', 'Client\nIdempotency-Key:\nreq_abc123', 'gray')
    n(g, 'gw', 'API Gateway\n(propagates key)', 'navy')
    n(g, 'order', 'Order Service\norder_abc123', 'green')
    n(g, 'pay', 'Payment Service\npay_abc123', 'gold')
    n(g, 'inv', 'Inventory Service\ninv_abc123', 'purple')
    n(g, 'notif', 'Notification Service\nnotif_abc123', 'teal')
    n(g, 'odb', 'Orders DB\n(dedup table)', 'navy')
    n(g, 'stripe', 'Stripe API\n(Idempotency-Key)', 'gold')

    e(g, 'cli', 'gw', 'POST /orders')
    e(g, 'gw', 'order', 'derive')
    e(g, 'order', 'odb', 'check dedup')
    e(g, 'order', 'pay', 'derive')
    e(g, 'pay', 'stripe', 'forward key')
    e(g, 'order', 'inv', 'derive')
    e(g, 'order', 'notif', 'derive')

    g.render(os.path.join(OUT, 'idempotency-microservices'), cleanup=True)
    print('Generated: idempotency-microservices')


# ── ssys-094: Delivery semantics — three guarantees ────────────────
def diag_delivery_semantics():
    g = base_graph('delivery_semantics',
                   'Delivery semantics — at-most / at-least / exactly once')

    # At-most-once
    n(g, 'amo_p', 'Producer\nsend()\n(no ack)', 'gray')
    n(g, 'amo_b', 'Broker', 'navy')
    n(g, 'amo_c', 'Consumer\n(may miss)', 'red')
    e(g, 'amo_p', 'amo_b', 'fire & forget', '#ef4444')
    e(g, 'amo_b', 'amo_c', 'maybe deliver', '#ef4444', 'dashed')

    # At-least-once
    n(g, 'alo_p', 'Producer\nretries until ACK', 'gray')
    n(g, 'alo_b', 'Broker', 'navy')
    n(g, 'alo_c', 'Consumer\n(may dupe)', 'gold')
    e(g, 'alo_p', 'alo_b', 'retry on no-ack', '#f59e0b')
    e(g, 'alo_b', 'alo_c', 'deliver, ACK', '#f59e0b')

    # Exactly-once
    n(g, 'eo_p', 'Producer\n(idempotent)', 'gray')
    n(g, 'eo_b', 'Broker\n(transactional\ndedup)', 'navy')
    n(g, 'eo_c', 'Consumer\n(idempotent\nprocessing)', 'green')
    e(g, 'eo_p', 'eo_b', 'producer epoch', '#22c55e')
    e(g, 'eo_b', 'eo_c', 'commit transaction', '#22c55e')

    g.render(os.path.join(OUT, 'delivery-semantics'), cleanup=True)
    print('Generated: delivery-semantics')


# ── Wave 2: comprehensive sweep diagrams ───────────────────────────

def diag_bloom_filter_gate():
    g = base_graph('bloom_filter_gate',
                   'Bloom filter cache gate — definitely-not vs possibly-exists')
    n(g, 'cli', 'Client request\n(key=X)', 'gray')
    n(g, 'bf', 'Bloom Filter\n(in-memory)', 'navy')
    n(g, 'cache', 'Cache', 'gold')
    n(g, 'db', 'Database', 'red')
    n(g, 'r404', 'Return 404\n(no cache or DB lookup)', 'green')
    n(g, 'rval', 'Return value', 'green')
    n(g, 'rfound', 'Cache + return', 'green')
    n(g, 'rneg', 'Negative cache\n+ return 404', 'green')
    e(g, 'cli', 'bf', 'lookup')
    e(g, 'bf', 'r404', '"definitely not"', '#22c55e')
    e(g, 'bf', 'cache', '"possibly exists"', '#f59e0b')
    e(g, 'cache', 'rval', 'HIT', '#22c55e')
    e(g, 'cache', 'db', 'MISS', '#ef4444')
    e(g, 'db', 'rfound', 'found', '#22c55e')
    e(g, 'db', 'rneg', 'not found', '#ef4444')
    g.render(os.path.join(OUT, 'bloom-filter-gate'), cleanup=True)
    print('Generated: bloom-filter-gate')


def diag_layered_defense():
    g = base_graph('layered_defense',
                   'Layered defense against cache penetration')
    n(g, 'cli', 'Client', 'gray')
    n(g, 'rl', 'Rate Limiter\n>100 misses/s → 429', 'red')
    n(g, 'bf', 'Bloom Filter\nnot in set → 404', 'navy')
    n(g, 'cache', 'Cache\nHIT → return value', 'gold')
    n(g, 'db', 'Database', 'purple')
    n(g, 'cpos', 'Cache (positive)\nTTL=300s', 'green')
    n(g, 'cneg', 'Cache (negative)\nTTL=60s', 'green')
    e(g, 'cli', 'rl', 'request')
    e(g, 'rl', 'bf', 'pass')
    e(g, 'bf', 'cache', 'pass')
    e(g, 'cache', 'db', 'MISS', '#ef4444')
    e(g, 'db', 'cpos', 'found', '#22c55e')
    e(g, 'db', 'cneg', 'not found', '#f59e0b')
    g.render(os.path.join(OUT, 'layered-defense'), cleanup=True)
    print('Generated: layered-defense')


def diag_multi_layer_stampede():
    g = base_graph('multi_layer_stampede',
                   'Multi-layer stampede protection')
    n(g, 'cli', 'Client', 'gray')
    n(g, 'l1', 'Layer 1: CDN/Edge\nTTL=30s, SWR=300s', 'navy')
    n(g, 'l2', 'Layer 2: In-process\nCaffeine, TTL=10s\nsingleflight', 'teal')
    n(g, 'l3', 'Layer 3: Redis\nXFetch + lock\nTTL=300s', 'gold')
    n(g, 'l4', 'Layer 4: Origin\nProduct microservice\n500ms, 1000 RPS', 'red')
    e(g, 'cli', 'l1', 'request')
    e(g, 'l1', 'l2', 'CDN miss')
    e(g, 'l2', 'l3', 'L1 miss\n(coalesced)')
    e(g, 'l3', 'l4', 'lock acquired')
    g.render(os.path.join(OUT, 'multi-layer-stampede'), cleanup=True)
    print('Generated: multi-layer-stampede')


def diag_geodns_flow():
    g = base_graph('geodns_flow',
                   'GeoDNS resolution — Tokyo vs London users')
    n(g, 'tk', 'User in Tokyo', 'gray')
    n(g, 'tkr', 'Local resolver\n103.x.x.x', 'navy')
    n(g, 'auth1', 'GeoDNS authoritative\nGeoIP: 103.x → Japan', 'gold')
    n(g, 'tkdc', 'api.example.com\n→ 13.x.x.x\n(Tokyo DC)', 'green')

    n(g, 'lon', 'User in London', 'gray')
    n(g, 'lonr', 'Local resolver\n81.x.x.x', 'navy')
    n(g, 'auth2', 'GeoDNS authoritative\nGeoIP: 81.x → UK', 'gold')
    n(g, 'londc', 'api.example.com\n→ 52.x.x.x\n(London DC)', 'green')

    e(g, 'tk', 'tkr', 'DNS query')
    e(g, 'tkr', 'auth1', 'forward')
    e(g, 'auth1', 'tkdc', 'return')
    e(g, 'lon', 'lonr', 'DNS query')
    e(g, 'lonr', 'auth2', 'forward')
    e(g, 'auth2', 'londc', 'return')
    g.render(os.path.join(OUT, 'geodns-flow'), cleanup=True)
    print('Generated: geodns-flow')


def diag_anycast_routing():
    g = base_graph('anycast_routing',
                   'Anycast routing — same IP, three PoPs, BGP picks nearest')
    n(g, 'ua', 'User A\n(New York)', 'gray')
    n(g, 'ub', 'User B\n(London)', 'gray')
    n(g, 'uc', 'User C\n(Tokyo)', 'gray')
    n(g, 'nyc', 'NYC PoP\n1.2.3.4', 'navy')
    n(g, 'lon', 'London PoP\n1.2.3.4', 'navy')
    n(g, 'tok', 'Tokyo PoP\n1.2.3.4', 'navy')
    e(g, 'ua', 'nyc', '2 BGP hops', '#22c55e')
    e(g, 'ub', 'lon', '1 BGP hop', '#22c55e')
    e(g, 'uc', 'tok', '3 BGP hops', '#22c55e')
    g.render(os.path.join(OUT, 'anycast-routing'), cleanup=True)
    print('Generated: anycast-routing')


def diag_gslb_multiregion():
    g = base_graph('gslb_multiregion',
                   'Multi-region GSLB architecture (Aurora Global Database)')
    n(g, 'r53', 'Route 53\nGeoDNS + latency', 'navy')
    n(g, 'us', 'US-EAST-1 (Virginia)\nCloudFront + ALB\nECS/EKS (3 AZ)\nAurora PRIMARY\nElastiCache', 'green')
    n(g, 'eu', 'EU-WEST-1 (Ireland)\nCloudFront + ALB\nECS/EKS (3 AZ)\nAurora READ\nElastiCache', 'gold')
    n(g, 'ap', 'AP-SOUTHEAST-1\n(Singapore)\nCloudFront + ALB\nAurora READ\nElastiCache', 'purple')
    n(g, 'agdb', 'Aurora Global Database\n<1s replication lag', 'teal')
    e(g, 'r53', 'us', 'latency-routed')
    e(g, 'r53', 'eu', 'latency-routed')
    e(g, 'r53', 'ap', 'latency-routed')
    e(g, 'us', 'agdb', 'replicate', '#22c55e')
    e(g, 'agdb', 'eu', 'replicate', '#22c55e')
    e(g, 'agdb', 'ap', 'replicate', '#22c55e')
    g.render(os.path.join(OUT, 'gslb-multiregion'), cleanup=True)
    print('Generated: gslb-multiregion')


def diag_wal_write_path():
    g = base_graph('wal_write_path',
                   'WAL write path — durability via fsync before page flush')
    n(g, 'cli', 'Client INSERT', 'gray')
    n(g, 's1', '1. Write WAL record\n(append to buffer)\nin memory, fast', 'navy')
    n(g, 's2', '2. Fsync WAL to disk\n(or group commit)\ncommit point', 'red')
    n(g, 's3', '3. Update buffer pool\n(page in RAM)\nfast, not durable', 'gold')
    n(g, 's4', '4. Background flush\n(checkpoint writes\ndirty pages to disk)', 'green')
    e(g, 'cli', 's1', '')
    e(g, 's1', 's2', '')
    e(g, 's2', 's3', 'after fsync')
    e(g, 's3', 's4', 'eventually')
    g.render(os.path.join(OUT, 'wal-write-path'), cleanup=True)
    print('Generated: wal-write-path')


def diag_wal_replication():
    g = base_graph('wal_replication',
                   'PostgreSQL WAL streaming replication')
    n(g, 'cli', 'Client writes', 'gray')
    n(g, 'lead', 'Leader\nWAL → Pages', 'navy')
    n(g, 'r1', 'Replica 1\n(read-only)\nReplays WAL', 'green')
    n(g, 'r2', 'Replica 2\n(read-only)\nReplays WAL', 'green')
    e(g, 'cli', 'lead', '')
    e(g, 'lead', 'r1', 'WAL stream\n(continuous)', '#3b82f6')
    e(g, 'lead', 'r2', 'WAL stream\n(continuous)', '#3b82f6')
    g.render(os.path.join(OUT, 'wal-replication'), cleanup=True)
    print('Generated: wal-replication')


def diag_atleast_once_dedup():
    g = base_graph('atleast_once_dedup',
                   'At-least-once delivery with idempotent consumer + dedup store')
    n(g, 'app', 'Producer\n(retries on timeout)', 'gray')
    n(g, 'q', 'Message Queue\nKafka / SQS / RabbitMQ', 'navy')
    n(g, 'cons', 'Consumer\n+ dedup check', 'green')
    n(g, 'ds', 'Dedup Store\nRedis / DB', 'gold')
    e(g, 'app', 'q', 'retry on timeout', '#f59e0b')
    e(g, 'q', 'cons', 'deliver')
    e(g, 'cons', 'ds', 'check msg.id', '#22c55e')
    e(g, 'ds', 'cons', 'seen?', '#22c55e')
    g.render(os.path.join(OUT, 'atleast-once-dedup'), cleanup=True)
    print('Generated: atleast-once-dedup')


def diag_transactional_outbox():
    g = base_graph('transactional_outbox',
                   'Transactional outbox pattern — DB tx + relay or CDC to Kafka')
    n(g, 'app', 'Application\nPOST /orders', 'gray')
    n(g, 'tx', 'DB Transaction:\nINSERT orders\nINSERT outbox\nCOMMIT', 'navy')
    n(g, 'db', 'Database', 'purple')
    n(g, 'relay', 'Outbox Relay\npoll pending\npublish to Kafka', 'gold')
    n(g, 'cdc', 'Debezium (CDC)\nreads WAL', 'teal')
    n(g, 'kafka', 'Kafka', 'green')
    e(g, 'app', 'tx', '')
    e(g, 'tx', 'db', 'atomic write')
    e(g, 'db', 'relay', 'pending rows', '#f59e0b')
    e(g, 'db', 'cdc', 'WAL stream', '#14b8a6')
    e(g, 'relay', 'kafka', 'publish')
    e(g, 'cdc', 'kafka', 'publish')
    g.render(os.path.join(OUT, 'transactional-outbox'), cleanup=True)
    print('Generated: transactional-outbox')


def diag_split_brain():
    g = base_graph('split_brain',
                   'Split-brain — partitioned primary keeps writing')
    n(g, 'p', 'Primary\n(R+W)', 'red')
    n(g, 's', 'New Primary\n(R+W, promoted)', 'red')
    n(g, 'cla', 'Client A\n(routes to old)', 'gray')
    n(g, 'clb', 'Client B\n(routes to new)', 'gray')
    e(g, 'cla', 'p', 'writes', '#ef4444')
    e(g, 'clb', 's', 'writes', '#ef4444')
    e(g, 'p', 's', 'partition →\nno heartbeat', '#ef4444', 'dashed')
    g.render(os.path.join(OUT, 'split-brain'), cleanup=True)
    print('Generated: split-brain')


def diag_fencing_token():
    g = base_graph('fencing_token',
                   'Fencing token / quorum prevents split-brain writes')
    n(g, 'p', 'Old Primary\nepoch=5', 'red')
    n(g, 'zk', 'ZooKeeper\n(3-node quorum)', 'navy')
    n(g, 's', 'Standby → New Primary\nepoch=6', 'green')
    n(g, 'storage', 'Storage layer\nrejects epoch < current', 'purple')
    e(g, 'p', 'zk', 'renew lock\n(epoch=5)', '#f59e0b')
    e(g, 'zk', 's', 'lock expired →\ngrant epoch=6', '#22c55e')
    e(g, 'p', 'storage', 'write epoch=5', '#ef4444')
    e(g, 'storage', 'p', 'REJECTED', '#ef4444', 'dashed')
    e(g, 's', 'storage', 'write epoch=6', '#22c55e')
    g.render(os.path.join(OUT, 'fencing-token'), cleanup=True)
    print('Generated: fencing-token')


def diag_global_active_passive():
    g = base_graph('global_active_passive',
                   'Global active-passive: writes US-EAST-1, reads everywhere')
    n(g, 'r53', 'Route 53\nlatency-based', 'navy')
    n(g, 'us', 'US-EAST-1\nALB → App (R+W)\nAurora PRIMARY\nRedis', 'green')
    n(g, 'eu', 'EU-WEST-1\nALB → App (R)\nAurora READ\nRedis', 'gold')
    n(g, 'ap', 'AP-SOUTHEAST\nALB → App (R)\nAurora READ\nRedis', 'gold')
    e(g, 'r53', 'us', 'writes + reads')
    e(g, 'r53', 'eu', 'reads only')
    e(g, 'r53', 'ap', 'reads only')
    e(g, 'us', 'eu', 'replicate', '#22c55e')
    e(g, 'us', 'ap', 'replicate', '#22c55e')
    g.render(os.path.join(OUT, 'global-active-passive'), cleanup=True)
    print('Generated: global-active-passive')


if __name__ == '__main__':
    diag_negative_caching()
    diag_sticky_sessions()
    diag_idempotency_microservices()
    diag_delivery_semantics()
    # Wave 2
    diag_bloom_filter_gate()
    diag_layered_defense()
    diag_multi_layer_stampede()
    diag_geodns_flow()
    diag_anycast_routing()
    diag_gslb_multiregion()
    diag_wal_write_path()
    diag_wal_replication()
    diag_atleast_once_dedup()
    diag_transactional_outbox()
    diag_split_brain()
    diag_fencing_token()
    diag_global_active_passive()
