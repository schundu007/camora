#!/usr/bin/env python3
"""Generate architecture diagrams for Instagram system design topic."""
import graphviz, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'instagram')
os.makedirs(OUT, exist_ok=True)

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue', fontsize='12', penwidth='1.5', height='0.45', margin='0.15,0.08')
EDGE = dict(fontname='Helvetica Neue', fontsize='10', penwidth='1.5')
C = {
    'blue': ('#dbeafe','#3b82f6','#1e40af'), 'green': ('#dcfce7','#22c55e','#166534'),
    'yellow': ('#fef3c7','#f59e0b','#92400e'), 'purple': ('#e0e7ff','#6366f1','#3730a3'),
    'pink': ('#fce7f3','#ec4899','#9d174d'), 'orange': ('#ffedd5','#f97316','#9a3412'),
    'teal': ('#ccfbf1','#14b8a6','#115e59'), 'gray': ('#f3f4f6','#6b7280','#374151'),
}
def n(g, name, label, c): g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)
def e(g, a, b, label='', color='#475569', style='solid'): g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)

# 1. Photo Upload Flow
def upload_flow():
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.6', ranksep='0.7', splines='spline',
           rankdir='LR', label='  Photo Upload Pipeline  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'user', 'User uploads\nphoto', 'blue')
    n(g, 'api', 'API Gateway', 'gray')
    n(g, 'upload', 'Upload Service\n(pre-signed URL)', 'green')
    n(g, 's3', 'S3\n(original)', 'purple')
    n(g, 'resize', 'Image Processor\n(thumbnail, medium,\nfull — 3 sizes)', 'orange')
    n(g, 'cdn', 'CDN\n(CloudFront)', 'teal')
    n(g, 'post', 'Post Service\n(store metadata)', 'green')
    n(g, 'db', 'Posts DB\n(Cassandra)', 'purple')
    n(g, 'fanout', 'Fan-out\nto followers', 'yellow')
    e(g, 'user', 'api', '① upload', '#3b82f6')
    e(g, 'api', 'upload', '② pre-signed\nURL', '#22c55e')
    e(g, 'upload', 's3', '③ store\noriginal', '#6366f1')
    e(g, 's3', 'resize', '④ trigger\nresizing', '#f97316')
    e(g, 'resize', 'cdn', '⑤ push to\nedge', '#14b8a6')
    e(g, 'upload', 'post', '⑥ create\npost record', '#22c55e')
    e(g, 'post', 'db', '⑦ persist\nmetadata', '#6366f1')
    e(g, 'post', 'fanout', '⑧ fan-out\nto feeds', '#f59e0b')
    g.render(os.path.join(OUT, 'flow-photo-upload'), cleanup=True)

# 2. Feed Generation
def feed_flow():
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.6', ranksep='0.7', splines='spline',
           rankdir='LR', label='  Feed Generation (Push + Pull Hybrid)  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'user', 'User opens\nfeed', 'blue')
    n(g, 'feed', 'Feed Service', 'green')
    n(g, 'prebuilt', 'Pre-built Feed\n(Redis list)', 'yellow')
    n(g, 'ranking', 'ML Ranking\nService', 'purple')
    n(g, 'celeb', 'Celebrity Posts\n(pull on demand)', 'orange')
    n(g, 'ads', 'Ads Injection\nService', 'pink')
    n(g, 'response', 'Ranked Feed\nwith media URLs', 'blue')
    e(g, 'user', 'feed', '① GET /feed', '#3b82f6')
    e(g, 'feed', 'prebuilt', '② fetch\ncached feed', '#f59e0b')
    e(g, 'feed', 'celeb', '③ pull celeb\nposts', '#f97316')
    e(g, 'prebuilt', 'ranking', 'merge', '#6366f1')
    e(g, 'celeb', 'ranking', 'merge', '#6366f1')
    e(g, 'ranking', 'ads', '④ inject\nsponsored', '#ec4899')
    e(g, 'ads', 'response', '⑤ return\nranked feed', '#3b82f6')
    g.render(os.path.join(OUT, 'flow-feed-generation'), cleanup=True)

# 3. Key Decisions
def key_decisions():
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.5', nodesep='0.7', ranksep='0.9', splines='spline',
           rankdir='TB', label='  Instagram — Key Design Decisions  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'client', 'Mobile App\n(iOS/Android)', 'blue')
    n(g, 'api', 'API Gateway\n+ CDN', 'gray')
    n(g, 'upload', 'Upload Service\n(S3 pre-signed URLs\nfor direct upload)', 'green')
    n(g, 'post', 'Post Service\n(Cassandra\nwrite-optimized)', 'purple')
    n(g, 'fanout', 'Fan-out Service\n(push for <10K\npull for celebrities)', 'orange')
    n(g, 'feed', 'Feed Cache\n(Redis sorted sets\npre-built timelines)', 'yellow')
    n(g, 'media', 'Media Pipeline\n(3 sizes + CDN\nCloudFront global)', 'teal')
    n(g, 'search', 'Search + Explore\n(Elasticsearch\n+ ML ranking)', 'pink')
    e(g, 'client', 'api', 'HTTP/2', '#3b82f6')
    e(g, 'api', 'upload', 'photos', '#22c55e')
    e(g, 'api', 'post', 'metadata', '#6366f1')
    e(g, 'post', 'fanout', 'new post\nevent', '#f59e0b')
    e(g, 'fanout', 'feed', 'update\nfollower feeds', '#f59e0b')
    e(g, 'upload', 'media', 'process\n+ distribute', '#14b8a6')
    e(g, 'post', 'search', 'index', '#ec4899')
    g.render(os.path.join(OUT, 'key-decisions'), cleanup=True)

if __name__ == '__main__':
    for fn in [upload_flow, feed_flow, key_decisions]:
        fn(); print(f'Generated: {fn.__name__}')
