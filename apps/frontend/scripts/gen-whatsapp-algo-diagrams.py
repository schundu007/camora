#!/usr/bin/env python3
"""Generate diagrams for WhatsApp Algorithm Approaches + Discussion Points."""

import graphviz
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'whatsapp')
os.makedirs(OUT_DIR, exist_ok=True)

COMMON = {
    'bgcolor': '#ffffff', 'dpi': '200',
    'pad': '0.3', 'nodesep': '0.5', 'ranksep': '0.6', 'splines': 'spline',
}
NODE = {'shape': 'box', 'style': 'filled,rounded', 'fontname': 'Helvetica Neue', 'fontsize': '12', 'penwidth': '1.5', 'height': '0.45', 'margin': '0.15,0.08'}
EDGE = {'fontname': 'Helvetica Neue', 'fontsize': '10', 'penwidth': '1.5'}

C = {
    'blue':   {'fill': '#dbeafe', 'border': '#3b82f6', 'font': '#1e40af'},
    'green':  {'fill': '#dcfce7', 'border': '#22c55e', 'font': '#166534'},
    'yellow': {'fill': '#fef3c7', 'border': '#f59e0b', 'font': '#92400e'},
    'purple': {'fill': '#e0e7ff', 'border': '#6366f1', 'font': '#3730a3'},
    'pink':   {'fill': '#fce7f3', 'border': '#ec4899', 'font': '#9d174d'},
    'orange': {'fill': '#ffedd5', 'border': '#f97316', 'font': '#9a3412'},
    'teal':   {'fill': '#ccfbf1', 'border': '#14b8a6', 'font': '#115e59'},
    'gray':   {'fill': '#f3f4f6', 'border': '#6b7280', 'font': '#374151'},
}

def n(g, name, label, c): g.node(name, label, fillcolor=C[c]['fill'], color=C[c]['border'], fontcolor=C[c]['font'], **NODE)
def e(g, a, b, label='', color='#475569', style='solid'): g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)


# ── 1. Consistent Hashing ──
def gen_consistent_hashing():
    g = graphviz.Digraph('consistent_hash', format='png')
    g.attr(**COMMON, rankdir='TB', label='  Consistent Hashing — Connection Routing  ', labelloc='t', fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'user', 'User connects', 'blue')
    n(g, 'lb', 'Load Balancer\n(L4)', 'gray')
    n(g, 'hash', 'hash(userId)\nmod ring', 'purple')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 's1', 'Server A\n(range 0-99)', 'green')
        n(s, 's2', 'Server B\n(range 100-199)', 'green')
        n(s, 's3', 'Server C\n(range 200-299)', 'green')

    n(g, 'redis', 'Redis\nuserId→serverId', 'pink')
    n(g, 'vnodes', 'Virtual nodes\nmin remapping\non scale', 'yellow')

    e(g, 'user', 'lb', 'TCP connect', '#3b82f6')
    e(g, 'lb', 'hash', 'route', '#6366f1')
    e(g, 'hash', 's1', 'userId=42', '#22c55e')
    e(g, 'hash', 's2', 'userId=150', '#22c55e')
    e(g, 'hash', 's3', 'userId=250', '#22c55e')
    e(g, 'hash', 'redis', 'store mapping', '#ec4899', 'dashed')
    e(g, 'hash', 'vnodes', 'uses', '#f59e0b', 'dashed')

    g.render(os.path.join(OUT_DIR, 'algo-consistent-hashing'), cleanup=True)


# ── 2. Fan-out Strategies ──
def gen_fanout():
    g = graphviz.Digraph('fanout', format='png')
    g.attr(**COMMON, rankdir='TB', label='  Fan-out on Write vs Read (Group Messages)  ', labelloc='t', fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    # Write side
    with g.subgraph(name='cluster_write') as s:
        s.attr(label='Fan-out on Write (<100 members)', style='filled,rounded', color='#22c55e', fillcolor='#f0fdf4', fontname='Helvetica Neue Bold', fontsize='10', fontcolor='#166534')
        n(s, 'w_msg', 'Message', 'blue')
        n(s, 'w_copy', 'Copy to each\nmember inbox', 'green')
        n(s, 'w_m1', 'Inbox 1', 'green')
        n(s, 'w_m2', 'Inbox 2', 'green')
        n(s, 'w_mn', 'Inbox N', 'green')

    e(g, 'w_msg', 'w_copy', 'N writes', '#22c55e')
    e(g, 'w_copy', 'w_m1', '', '#22c55e')
    e(g, 'w_copy', 'w_m2', '', '#22c55e')
    e(g, 'w_copy', 'w_mn', '', '#22c55e')

    # Read side
    with g.subgraph(name='cluster_read') as s:
        s.attr(label='Fan-out on Read (>100 members)', style='filled,rounded', color='#3b82f6', fillcolor='#eff6ff', fontname='Helvetica Neue Bold', fontsize='10', fontcolor='#1e40af')
        n(s, 'r_msg', 'Message', 'blue')
        n(s, 'r_store', 'Store once in\ngroup partition', 'purple')
        n(s, 'r_pull', 'Members pull\non open', 'blue')

    e(g, 'r_msg', 'r_store', '1 write', '#6366f1')
    e(g, 'r_pull', 'r_store', 'fetch on read', '#3b82f6', 'dashed')

    g.render(os.path.join(OUT_DIR, 'algo-fanout'), cleanup=True)


# ── 3. ACK-based Delivery ──
def gen_ack_delivery():
    g = graphviz.Digraph('ack_delivery', format='png')
    g.attr(**COMMON, rankdir='LR', label='  ACK-based Guaranteed Delivery  ', labelloc='t', fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'sender', 'Sender', 'blue')
    n(g, 'server', 'Chat Server', 'green')
    n(g, 'cassandra', 'Cassandra\n+ offline_queue', 'purple')
    n(g, 'recipient', 'Recipient', 'blue')
    n(g, 'retry', 'Retry\n(30s timeout)', 'orange')
    n(g, 'dedup', 'Client dedup\n(UUID set)', 'yellow')

    e(g, 'sender', 'server', '① send msg', '#3b82f6')
    e(g, 'server', 'cassandra', '② persist +\nenqueue', '#6366f1')
    e(g, 'server', 'recipient', '③ deliver\nvia WS', '#22c55e')
    e(g, 'recipient', 'server', '④ ACK', '#22c55e', 'dashed')
    e(g, 'server', 'cassandra', '⑤ dequeue\non ACK', '#6366f1', 'dashed')
    e(g, 'server', 'retry', 'no ACK?', '#f97316', 'dashed')
    e(g, 'retry', 'recipient', 'retry 3x', '#f97316')
    e(g, 'recipient', 'dedup', 'drop dupes', '#f59e0b', 'dashed')

    g.render(os.path.join(OUT_DIR, 'algo-ack-delivery'), cleanup=True)


# ── 4. Double Ratchet ──
def gen_double_ratchet():
    g = graphviz.Digraph('double_ratchet', format='png')
    g.attr(**COMMON, rankdir='LR', label='  Double Ratchet (Signal Protocol)  ', labelloc='t', fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'alice', 'Alice', 'blue')
    n(g, 'x3dh', 'X3DH\nKey Agreement', 'purple')
    n(g, 'shared', 'Shared Secret', 'pink')
    n(g, 'dh_ratchet', 'DH Ratchet\n(new keys\nper round-trip)', 'green')
    n(g, 'sym_ratchet', 'Symmetric\nRatchet\n(KDF chain)', 'yellow')
    n(g, 'msg_key', 'Unique key\nper message', 'orange')
    n(g, 'bob', 'Bob', 'blue')

    e(g, 'alice', 'x3dh', 'identity +\npre-keys', '#6366f1')
    e(g, 'x3dh', 'shared', 'initial\nhandshake', '#6366f1')
    e(g, 'shared', 'dh_ratchet', 'seed', '#22c55e')
    e(g, 'dh_ratchet', 'sym_ratchet', 'chain key', '#f59e0b')
    e(g, 'sym_ratchet', 'msg_key', 'derive', '#f97316')
    e(g, 'msg_key', 'bob', 'encrypted\nmessage', '#3b82f6')
    e(g, 'bob', 'dh_ratchet', 'new DH\npublic key', '#22c55e', 'dashed')

    g.render(os.path.join(OUT_DIR, 'algo-double-ratchet'), cleanup=True)


# ── 5. E2E Encryption Discussion ──
def gen_e2e_encryption():
    g = graphviz.Digraph('e2e', format='png')
    g.attr(**COMMON, rankdir='LR', label='  End-to-End Encryption Flow  ', labelloc='t', fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'sender', 'Sender\nDevice', 'blue')
    n(g, 'encrypt', 'Encrypt\n(Signal Protocol)', 'green')
    n(g, 'server', 'WhatsApp\nServer', 'gray')
    n(g, 'decrypt', 'Decrypt\n(private key)', 'green')
    n(g, 'recipient', 'Recipient\nDevice', 'blue')

    e(g, 'sender', 'encrypt', 'plaintext', '#3b82f6')
    e(g, 'encrypt', 'server', 'ciphertext\n(opaque blob)', '#6b7280')
    e(g, 'server', 'decrypt', 'routes only\n(cannot read)', '#6b7280')
    e(g, 'decrypt', 'recipient', 'plaintext', '#3b82f6')

    g.render(os.path.join(OUT_DIR, 'discuss-e2e-encryption'), cleanup=True)


# ── 6. Group Messaging Architecture ──
def gen_group_arch():
    g = graphviz.Digraph('group_arch', format='png')
    g.attr(**COMMON, rankdir='TB', label='  Group Messaging Architecture  ', labelloc='t', fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'sender', 'Sender', 'blue')
    n(g, 'gateway', 'Chat Gateway', 'green')
    n(g, 'group_svc', 'Group Service\n(MySQL)', 'purple')
    n(g, 'kafka', 'Kafka\n(group topic)', 'yellow')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'online', 'Online Members\n→ WebSocket push', 'green')
        n(s, 'offline', 'Offline Members\n→ Queue + Push', 'orange')

    n(g, 'sender_keys', 'Sender Keys\n(encrypt once\nfor group)', 'pink')

    e(g, 'sender', 'gateway', '① message', '#3b82f6')
    e(g, 'gateway', 'group_svc', '② get members', '#6366f1')
    e(g, 'gateway', 'kafka', '③ publish', '#f59e0b')
    e(g, 'kafka', 'online', '④a deliver', '#22c55e')
    e(g, 'kafka', 'offline', '④b queue', '#f97316')
    e(g, 'gateway', 'sender_keys', 'encrypt once', '#ec4899', 'dashed')

    g.render(os.path.join(OUT_DIR, 'discuss-group-messaging'), cleanup=True)


# ── 7. Media Handling Pipeline ──
def gen_media_pipeline():
    g = graphviz.Digraph('media', format='png')
    g.attr(**COMMON, rankdir='LR', label='  Media Handling Pipeline  ', labelloc='t', fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'device', 'Sender\nDevice', 'blue')
    n(g, 'compress', 'Compress +\nEncrypt', 'green')
    n(g, 'upload', 'Chunked\nUpload', 'yellow')
    n(g, 's3', 'S3\n(Blob Store)', 'purple')
    n(g, 'thumb', 'Generate\nThumbnail', 'pink')
    n(g, 'msg', 'Send mediaId\nvia Chat', 'blue')
    n(g, 'cdn', 'CDN\n(CloudFront)', 'orange')
    n(g, 'recipient', 'Recipient\nDownloads', 'blue')

    e(g, 'device', 'compress', 'raw media', '#3b82f6')
    e(g, 'compress', 'upload', 'encrypted\nchunks', '#22c55e')
    e(g, 'upload', 's3', 'resumable', '#f59e0b')
    e(g, 's3', 'thumb', 'generate', '#ec4899', 'dashed')
    e(g, 'upload', 'msg', 'mediaId +\nthumbnail', '#3b82f6')
    e(g, 's3', 'cdn', 'serve', '#f97316')
    e(g, 'cdn', 'recipient', 'download\nvia signed URL', '#3b82f6')

    g.render(os.path.join(OUT_DIR, 'discuss-media-pipeline'), cleanup=True)


# ── 8. Presence System ──
def gen_presence():
    g = graphviz.Digraph('presence', format='png')
    g.attr(**COMMON, rankdir='LR', label='  Presence & Typing Indicators  ', labelloc='t', fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'client', 'Client\nDevice', 'blue')
    n(g, 'gateway', 'Chat\nGateway', 'green')
    n(g, 'redis', 'Redis Cluster\nTTL: 45s', 'pink')
    n(g, 'pubsub', 'Pub/Sub\n(presence events)', 'yellow')
    n(g, 'contacts', 'Active\nContacts', 'blue')

    e(g, 'client', 'gateway', 'heartbeat\nevery 30s', '#3b82f6')
    e(g, 'gateway', 'redis', 'SET presence\n+ refresh TTL', '#ec4899')
    e(g, 'redis', 'pubsub', 'status change\n(online/offline)', '#f59e0b')
    e(g, 'pubsub', 'contacts', 'notify\nsubscribers', '#3b82f6')
    e(g, 'client', 'gateway', 'typing...\n(ephemeral)', '#22c55e', 'dashed')
    e(g, 'gateway', 'contacts', 'typing relay\n(no persist)', '#22c55e', 'dashed')

    g.render(os.path.join(OUT_DIR, 'discuss-presence'), cleanup=True)


if __name__ == '__main__':
    for fn in [gen_consistent_hashing, gen_fanout, gen_ack_delivery, gen_double_ratchet,
               gen_e2e_encryption, gen_group_arch, gen_media_pipeline, gen_presence]:
        fn()
        print(f'Generated: {fn.__name__}')
    print('All algorithm + discussion diagrams generated!')
