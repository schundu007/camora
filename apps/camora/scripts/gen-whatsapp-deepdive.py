#!/usr/bin/env python3
"""Generate 6 deep dive diagrams for WhatsApp topic."""
import graphviz, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'whatsapp')
os.makedirs(OUT, exist_ok=True)

COMMON = dict(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.6', ranksep='0.7', splines='spline')
NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue', fontsize='11', penwidth='1.5', height='0.45', margin='0.15,0.08')
EDGE = dict(fontname='Helvetica Neue', fontsize='10', penwidth='1.5')

C = {
    'blue': ('#dbeafe','#3b82f6','#1e40af'), 'green': ('#dcfce7','#22c55e','#166534'),
    'yellow': ('#fef3c7','#f59e0b','#92400e'), 'purple': ('#e0e7ff','#6366f1','#3730a3'),
    'pink': ('#fce7f3','#ec4899','#9d174d'), 'orange': ('#ffedd5','#f97316','#9a3412'),
    'teal': ('#ccfbf1','#14b8a6','#115e59'), 'gray': ('#f3f4f6','#6b7280','#374151'),
}
def n(g, name, label, c): g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)
def e(g, a, b, label='', color='#475569', style='solid'): g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)

# 1. Message Ordering
def ordering():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Message Ordering — Sequence Numbers  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'a', 'User A\nsends msgs', 'blue')
    n(g, 'gw', 'Chat Gateway', 'green')
    n(g, 'redis', 'Redis INCR\nseq:{convId}', 'pink')
    n(g, 'cass', 'Cassandra\nCLUSTERING KEY\n(seq DESC)', 'purple')
    n(g, 'b', 'User B\nreceives in order', 'blue')
    e(g, 'a', 'gw', 'msg1, msg2, msg3\n(may arrive\nout of order)', '#3b82f6')
    e(g, 'gw', 'redis', 'atomic\nINCR', '#ec4899')
    e(g, 'redis', 'gw', 'seq=1,2,3', '#ec4899', 'dashed')
    e(g, 'gw', 'cass', 'store with\nsequenceNum', '#6366f1')
    e(g, 'gw', 'b', 'deliver sorted\nby seq number', '#22c55e')
    g.render(os.path.join(OUT, 'deep-dive-ordering'), cleanup=True)

# 2. Presence at Scale
def presence():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Presence at 33M QPS  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'clients', '1B Online\nClients', 'blue')
    n(g, 'gw', 'Chat Gateways\n(batch heartbeats)', 'green')
    n(g, 'redis', 'Redis Cluster\nSET + TTL 45s', 'pink')
    n(g, 'pubsub', 'Pub/Sub\n(status changes)', 'yellow')
    n(g, 'contacts', 'Active\nContacts', 'blue')
    e(g, 'clients', 'gw', 'heartbeat\nevery 30s', '#3b82f6')
    e(g, 'gw', 'redis', '33M QPS\n(batched)', '#ec4899')
    e(g, 'redis', 'pubsub', 'online/offline\nevent', '#f59e0b')
    e(g, 'pubsub', 'contacts', 'notify\nsubscribers', '#3b82f6')
    g.render(os.path.join(OUT, 'deep-dive-presence'), cleanup=True)

# 3. Hot/Cold Storage
def hot_cold():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Hot / Warm / Cold Storage Tiering  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'new', 'New Messages\n(< 7 days)', 'green')
    n(g, 'hot', 'HOT\nCassandra SSD\nfast reads', 'orange')
    n(g, 'warm', 'WARM\nCassandra HDD\n7-90 days', 'yellow')
    n(g, 'cold', 'COLD\nS3 Glacier\n> 90 days', 'blue')
    n(g, 'client', 'Client\nSQLite cache', 'teal')
    e(g, 'new', 'hot', 'write path', '#f97316')
    e(g, 'hot', 'warm', 'age-off\n(7 days)', '#f59e0b')
    e(g, 'warm', 'cold', 'archive\n(90 days)', '#3b82f6')
    e(g, 'hot', 'client', 'sync on\napp open', '#14b8a6')
    e(g, 'cold', 'client', 'restore\n(10s delay)', '#14b8a6', 'dashed')
    g.render(os.path.join(OUT, 'deep-dive-hot-cold'), cleanup=True)

# 4. Group Fan-out Strategies
def group_fanout():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Group Fan-out Decision Tree  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'msg', 'Group Message\nReceived', 'blue')
    n(g, 'check', 'Group Size?', 'yellow')
    n(g, 'small', '< 100 members\nFan-out on Write\n(instant delivery)', 'green')
    n(g, 'large', '> 100 members\nFan-out on Read\n(lazy pull)', 'orange')
    n(g, 'online', 'Online?\nPush via WS', 'green')
    n(g, 'offline', 'Offline?\nQueue + Push', 'orange')
    g.node('check', 'Group Size?', shape='diamond', style='filled', fillcolor='#fef3c7', color='#f59e0b', fontcolor='#92400e', fontname='Helvetica Neue', fontsize='11', height='0.6')
    e(g, 'msg', 'check', '', '#f59e0b')
    e(g, 'check', 'small', '≤ 100', '#22c55e')
    e(g, 'check', 'large', '> 100', '#f97316')
    e(g, 'small', 'online', 'each member', '#22c55e')
    e(g, 'small', 'offline', 'each member', '#f97316', 'dashed')
    g.render(os.path.join(OUT, 'deep-dive-group-fanout'), cleanup=True)

# 5. Cross-Region Delivery
def cross_region():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Cross-Region Message Delivery  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    with g.subgraph(name='cluster_us') as s:
        s.attr(label='US Region', style='filled,rounded', color='#3b82f6', fillcolor='#eff6ff', fontname='Helvetica Neue Bold', fontsize='10', fontcolor='#1e40af')
        n(s, 'us_gw', 'Gateway US', 'green')
        n(s, 'us_kafka', 'Kafka US', 'yellow')
        n(s, 'us_cass', 'Cassandra US', 'purple')

    with g.subgraph(name='cluster_eu') as s:
        s.attr(label='EU Region', style='filled,rounded', color='#22c55e', fillcolor='#f0fdf4', fontname='Helvetica Neue Bold', fontsize='10', fontcolor='#166534')
        n(s, 'eu_gw', 'Gateway EU', 'green')
        n(s, 'eu_kafka', 'Kafka EU', 'yellow')
        n(s, 'eu_cass', 'Cassandra EU', 'purple')

    n(g, 'mirror', 'MirrorMaker\n(cross-region\nreplication)', 'orange')
    n(g, 'user_a', 'User A\n(US)', 'blue')
    n(g, 'user_b', 'User B\n(EU)', 'blue')

    e(g, 'user_a', 'us_gw', 'send', '#3b82f6')
    e(g, 'us_gw', 'us_kafka', 'publish', '#f59e0b')
    e(g, 'us_kafka', 'us_cass', 'persist', '#6366f1')
    e(g, 'us_kafka', 'mirror', 'replicate', '#f97316')
    e(g, 'mirror', 'eu_kafka', '150-300ms\nlatency', '#f97316')
    e(g, 'eu_kafka', 'eu_gw', 'consume', '#f59e0b')
    e(g, 'eu_gw', 'user_b', 'deliver', '#3b82f6')
    g.render(os.path.join(OUT, 'deep-dive-cross-region'), cleanup=True)

# 6. Resumable Media Upload
def media_upload():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Resumable Media Upload Pipeline  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'device', 'Sender\nDevice', 'blue')
    n(g, 'encrypt', 'AES-256\nEncrypt', 'purple')
    n(g, 'chunk', 'Chunked Upload\n256KB chunks\n+ upload token', 'yellow')
    n(g, 's3', 'S3 Blob\nStorage', 'teal')
    n(g, 'dedup', 'Content-Hash\nDeduplication', 'pink')
    n(g, 'cdn', 'CDN Edge\n(CloudFront)', 'orange')
    n(g, 'chat', 'Send mediaId\nvia Chat Server', 'green')
    n(g, 'recv', 'Recipient\nDownloads', 'blue')
    e(g, 'device', 'encrypt', 'raw file', '#6366f1')
    e(g, 'encrypt', 'chunk', 'encrypted\nblob', '#f59e0b')
    e(g, 'chunk', 's3', 'resumable\n(retry from\nlast chunk)', '#14b8a6')
    e(g, 's3', 'dedup', 'hash check', '#ec4899', 'dashed')
    e(g, 'chunk', 'chat', 'mediaId +\nthumbnail', '#22c55e')
    e(g, 's3', 'cdn', 'serve', '#f97316')
    e(g, 'cdn', 'recv', 'signed URL\ndownload', '#3b82f6')
    g.render(os.path.join(OUT, 'deep-dive-media-upload'), cleanup=True)

if __name__ == '__main__':
    for fn in [ordering, presence, hot_cold, group_fanout, cross_region, media_upload]:
        fn(); print(f'Generated: {fn.__name__}')
    print('All 6 deep dive diagrams generated!')
