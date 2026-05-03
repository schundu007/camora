#!/usr/bin/env python3
"""Generate a Key Design Decisions architecture diagram for WhatsApp."""

import graphviz
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'whatsapp')
os.makedirs(OUT_DIR, exist_ok=True)

g = graphviz.Digraph('decisions', format='png')
g.attr(
    bgcolor='#ffffff', dpi='200', pad='0.5', nodesep='0.7', ranksep='0.9',
    splines='spline', rankdir='TB',
    label='  WhatsApp — Key Design Decisions  ', labelloc='t',
    fontsize='16', fontname='Helvetica Neue Bold', fontcolor='#1e293b',
)

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue', fontsize='11', penwidth='1.5', height='0.5', margin='0.15,0.08')
EDGE = dict(fontname='Helvetica Neue', fontsize='9', penwidth='1.5')

C = {
    'blue':   ('#dbeafe', '#3b82f6', '#1e40af'),
    'green':  ('#dcfce7', '#22c55e', '#166534'),
    'yellow': ('#fef3c7', '#f59e0b', '#92400e'),
    'purple': ('#e0e7ff', '#6366f1', '#3730a3'),
    'pink':   ('#fce7f3', '#ec4899', '#9d174d'),
    'orange': ('#ffedd5', '#f97316', '#9a3412'),
    'teal':   ('#ccfbf1', '#14b8a6', '#115e59'),
    'gray':   ('#f3f4f6', '#6b7280', '#374151'),
}

def n(name, label, c):
    fill, border, font = C[c]
    g.node(name, label, fillcolor=fill, color=border, fontcolor=font, **NODE)

def e(a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)

# Central: User/Client
n('client', 'Mobile Client\n(iOS / Android / Web)', 'blue')

# Decision 1: WebSocket
n('ws', 'WebSocket\n(persistent, bidirectional)', 'green')
n('ws_alt', 'HTTP Polling\n(fallback only)', 'gray')

# Decision 2: Kafka
n('kafka', 'Apache Kafka\n(cross-server routing\npartitioned by recipientId)', 'yellow')

# Decision 3: Store-and-forward
n('offline', 'Offline Queue\n(store-and-forward\n+ ACK guarantee)', 'orange')

# Decision 4: Sequence numbers
n('seq', 'Redis INCR\n(monotonic sequence\nnumbers per conversation)', 'pink')

# Decision 5: Signal Protocol
n('e2e', 'Signal Protocol\n(Double Ratchet + X3DH\nforward secrecy)', 'purple')

# Decision 6: Cassandra
n('cass', 'Cassandra\n(write-heavy, 580K+ WPS\npartitioned by conversationId)', 'teal')

# Decision 7: Consistent hashing
n('hash', 'Consistent Hashing\n(user → server routing\nvirtual nodes)', 'green')

# Decision 8: Hybrid fan-out
n('fanout', 'Hybrid Fan-out\n(write <100 members\nread >100 members)', 'yellow')

# Central gateway
n('gateway', 'Chat Gateway\n(10,000+ servers)', 'blue')

# Connections from client
e('client', 'ws', '① Real-time\ntransport', '#22c55e')
e('client', 'e2e', '⑤ Encrypt\nbefore send', '#6366f1')

# WebSocket to gateway
e('ws', 'gateway', 'persistent\nconnection', '#22c55e')
e('ws_alt', 'gateway', 'fallback', '#6b7280', 'dashed')

# Gateway decisions
e('gateway', 'hash', '⑦ Route user\nto server', '#22c55e')
e('gateway', 'kafka', '② Route across\nservers', '#f59e0b')
e('gateway', 'seq', '④ Assign\nsequence #', '#ec4899')
e('gateway', 'offline', '③ Queue if\noffline', '#f97316')
e('gateway', 'fanout', '⑧ Group\ndelivery', '#f59e0b')

# Storage
e('kafka', 'cass', '⑥ Persist\nmessages', '#14b8a6')
e('offline', 'cass', 'persist\nqueue', '#14b8a6', 'dashed')

path = os.path.join(OUT_DIR, 'key-decisions')
g.render(path, cleanup=True)
print(f'Generated: {path}.png')
