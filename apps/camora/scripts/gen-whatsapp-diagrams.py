#!/usr/bin/env python3
"""Generate professional sequence diagram PNGs for WhatsApp system design topic."""

import graphviz
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'whatsapp')
os.makedirs(OUT_DIR, exist_ok=True)

# Shared styling
GRAPH_ATTRS = {
    'rankdir': 'LR',
    'bgcolor': '#ffffff',
    'fontname': 'Helvetica Neue',
    'pad': '0.4',
    'nodesep': '0.6',
    'ranksep': '0.8',
    'dpi': '200',
    'splines': 'spline',
}

PARTICIPANT_STYLE = {
    'shape': 'box',
    'style': 'filled,rounded',
    'fontname': 'Helvetica Neue',
    'fontsize': '12',
    'penwidth': '1.5',
    'height': '0.5',
    'margin': '0.15,0.08',
}

STEP_STYLE = {
    'shape': 'plaintext',
    'fontname': 'Helvetica Neue',
    'fontsize': '10',
    'fontcolor': '#64748b',
}

EDGE_STYLE = {
    'fontname': 'Helvetica Neue',
    'fontsize': '10',
    'penwidth': '1.8',
}

# Color palette
COLORS = {
    'client':  {'fill': '#dbeafe', 'border': '#3b82f6', 'font': '#1e40af'},
    'gateway': {'fill': '#dcfce7', 'border': '#22c55e', 'font': '#166534'},
    'queue':   {'fill': '#fef3c7', 'border': '#f59e0b', 'font': '#92400e'},
    'cache':   {'fill': '#fce7f3', 'border': '#ec4899', 'font': '#9d174d'},
    'db':      {'fill': '#e0e7ff', 'border': '#6366f1', 'font': '#3730a3'},
    'push':    {'fill': '#ffedd5', 'border': '#f97316', 'font': '#9a3412'},
    'group':   {'fill': '#f0fdf4', 'border': '#16a34a', 'font': '#166534'},
}


def make_participant(g, name, label, color_key):
    c = COLORS[color_key]
    g.node(name, label, fillcolor=c['fill'], color=c['border'], fontcolor=c['font'], **PARTICIPANT_STYLE)


def make_edge(g, src, dst, label, color='#475569', style='solid', dir_='forward'):
    g.edge(src, dst, label=f'  {label}  ', color=color, fontcolor=color, style=style, dir=dir_, **EDGE_STYLE)


# ─── Diagram 1: Send Message Flow (Both Online) ────────────────────────────
def gen_send_flow():
    g = graphviz.Digraph('send_flow', format='png')
    g.attr(**{**GRAPH_ATTRS, 'label': '  Send Message Flow (Both Users Online)  ', 'labelloc': 't',
              'fontsize': '14', 'fontname': 'Helvetica Neue Bold', 'fontcolor': '#1e293b'})

    # Participants
    make_participant(g, 'A', 'User A\n(Sender)', 'client')
    make_participant(g, 'GW1', 'Chat\nGateway 1', 'gateway')
    make_participant(g, 'redis', 'Redis\n(Sessions)', 'cache')
    make_participant(g, 'kafka', 'Kafka\n(Message Bus)', 'queue')
    make_participant(g, 'cass', 'Cassandra\n(Messages)', 'db')
    make_participant(g, 'GW2', 'Chat\nGateway 2', 'gateway')
    make_participant(g, 'B', 'User B\n(Recipient)', 'client')

    # Flow arrows
    make_edge(g, 'A', 'GW1', '① Encrypted msg\nvia WebSocket', '#3b82f6')
    make_edge(g, 'GW1', 'A', '② ACK ✓ Sent', '#22c55e', 'dashed')
    make_edge(g, 'GW1', 'redis', '③ Lookup:\nUser B location', '#ec4899')
    make_edge(g, 'GW1', 'kafka', '④ Publish to\nrouting topic', '#f59e0b')
    make_edge(g, 'GW1', 'cass', '⑤ Persist\n(async)', '#6366f1', 'dashed')
    make_edge(g, 'kafka', 'GW2', '⑥ Route to\nGateway 2', '#f59e0b')
    make_edge(g, 'GW2', 'B', '⑦ Deliver via\nWebSocket', '#3b82f6')
    make_edge(g, 'B', 'GW2', '⑧ ACK ✓✓\nDelivered', '#22c55e', 'dashed')
    make_edge(g, 'GW2', 'A', '⑨ ✓✓ Blue\n(Read)', '#3b82f6', 'dashed')

    path = os.path.join(OUT_DIR, 'flow-send-message')
    g.render(path, cleanup=True)
    print(f'Generated: {path}.png')


# ─── Diagram 2: Offline Message Delivery ───────────────────────────────────
def gen_offline_flow():
    g = graphviz.Digraph('offline_flow', format='png')
    g.attr(**{**GRAPH_ATTRS, 'label': '  Offline Message Delivery (Store-and-Forward)  ', 'labelloc': 't',
              'fontsize': '14', 'fontname': 'Helvetica Neue Bold', 'fontcolor': '#1e293b'})

    make_participant(g, 'A', 'User A\n(Sender)', 'client')
    make_participant(g, 'GW1', 'Chat\nGateway 1', 'gateway')
    make_participant(g, 'redis', 'Redis\n(Sessions)', 'cache')
    make_participant(g, 'queue', 'Offline\nQueue', 'queue')
    make_participant(g, 'cass', 'Cassandra\n(Messages)', 'db')
    make_participant(g, 'push', 'Push Service\n(FCM/APNs)', 'push')
    make_participant(g, 'GW2', 'Chat\nGateway 2', 'gateway')
    make_participant(g, 'B', 'User B\n(Offline→Online)', 'client')

    make_edge(g, 'A', 'GW1', '① Send message\nvia WebSocket', '#3b82f6')
    make_edge(g, 'GW1', 'A', '② ACK ✓ Sent', '#22c55e', 'dashed')
    make_edge(g, 'GW1', 'redis', '③ Lookup:\nUser B OFFLINE', '#ec4899')
    make_edge(g, 'GW1', 'queue', '④ Store in\noffline queue', '#f59e0b')
    make_edge(g, 'GW1', 'cass', '⑤ Persist\n(status=SENT)', '#6366f1')
    make_edge(g, 'GW1', 'push', '⑥ Push\nnotification', '#f97316')
    make_edge(g, 'B', 'GW2', '⑦ Reconnect\n(new WebSocket)', '#3b82f6', 'dashed')
    make_edge(g, 'GW2', 'queue', '⑧ Flush\npending msgs', '#f59e0b')
    make_edge(g, 'GW2', 'B', '⑨ Deliver\nbatch', '#3b82f6')

    path = os.path.join(OUT_DIR, 'flow-offline-delivery')
    g.render(path, cleanup=True)
    print(f'Generated: {path}.png')


# ─── Diagram 3: Group Message Fan-out ──────────────────────────────────────
def gen_group_flow():
    g = graphviz.Digraph('group_flow', format='png')
    g.attr(**{**GRAPH_ATTRS, 'label': '  Group Message Fan-out (Hybrid Approach)  ', 'labelloc': 't',
              'fontsize': '14', 'fontname': 'Helvetica Neue Bold', 'fontcolor': '#1e293b',
              'rankdir': 'TB'})

    # Use subgraphs for layout control
    with g.subgraph() as s:
        s.attr(rank='same')
        make_participant(s, 'sender', 'Sender', 'client')
        make_participant(s, 'GW', 'Chat\nGateway', 'gateway')
        make_participant(s, 'GS', 'Group\nService', 'group')

    make_participant(g, 'cass', 'Cassandra\n(Group Partition)', 'db')
    make_participant(g, 'kafka', 'Kafka\n(Group Topic)', 'queue')

    with g.subgraph() as s:
        s.attr(rank='same')
        make_participant(s, 'GW1', 'Gateway\n(Member 1)', 'gateway')
        make_participant(s, 'GW2', 'Gateway\n(Member 2)', 'gateway')
        make_participant(s, 'GWn', 'Gateway\n(Member N)', 'gateway')

    with g.subgraph() as s:
        s.attr(rank='same')
        make_participant(s, 'M1', 'Member 1\n(Online)', 'client')
        make_participant(s, 'M2', 'Member 2\n(Online)', 'client')
        make_participant(s, 'Mn', 'Member N\n(Offline)', 'push')

    make_edge(g, 'sender', 'GW', '① Send group\nmessage', '#3b82f6')
    make_edge(g, 'GW', 'GS', '② Get members\nlist', '#16a34a')
    make_edge(g, 'GW', 'cass', '③ Store once\nin group partition', '#6366f1')
    make_edge(g, 'GW', 'kafka', '④ Publish to\ngroup topic', '#f59e0b')
    make_edge(g, 'kafka', 'GW1', '⑤ Fan-out', '#f59e0b')
    make_edge(g, 'kafka', 'GW2', '⑤ Fan-out', '#f59e0b')
    make_edge(g, 'kafka', 'GWn', '⑤ Fan-out', '#f59e0b')
    make_edge(g, 'GW1', 'M1', '⑥ WebSocket\npush', '#3b82f6')
    make_edge(g, 'GW2', 'M2', '⑥ WebSocket\npush', '#3b82f6')
    make_edge(g, 'GWn', 'Mn', '⑦ Queue +\npush notif', '#f97316', 'dashed')

    path = os.path.join(OUT_DIR, 'flow-group-fanout')
    g.render(path, cleanup=True)
    print(f'Generated: {path}.png')


if __name__ == '__main__':
    gen_send_flow()
    gen_offline_flow()
    gen_group_flow()
    print('All WhatsApp flow diagrams generated!')
