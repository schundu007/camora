#!/usr/bin/env python3
"""Generate architecture diagrams for Netflix system design topic."""
import graphviz, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'netflix')
os.makedirs(OUT, exist_ok=True)

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue', fontsize='12', penwidth='1.5', height='0.45', margin='0.15,0.08')
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

# 1. Video Upload + Transcoding Pipeline
def transcode_flow():
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.6', ranksep='0.7', splines='spline',
           rankdir='LR', label='  Video Upload + Transcoding Pipeline  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'studio', 'Content\nStudio', 'blue')
    n(g, 'upload', 'Upload Service\n(chunked)', 'green')
    n(g, 's3_raw', 'S3\n(raw master)', 'purple')
    n(g, 'transcode', 'Transcoding\nPipeline\n(1,200+ formats)', 'orange')
    n(g, 's3_encoded', 'S3\n(encoded files)', 'purple')
    n(g, 'oc', 'Open Connect\nCDN\n(push to ISPs)', 'red')
    n(g, 'catalog', 'Content\nCatalog DB', 'teal')
    e(g, 'studio', 'upload', '① upload\nmaster file', '#3b82f6')
    e(g, 'upload', 's3_raw', '② store\noriginal', '#6366f1')
    e(g, 's3_raw', 'transcode', '③ encode\n1,200+ profiles', '#f97316')
    e(g, 'transcode', 's3_encoded', '④ store\nall versions', '#6366f1')
    e(g, 's3_encoded', 'oc', '⑤ push to\nedge servers', '#ef4444')
    e(g, 'upload', 'catalog', '⑥ update\nmetadata', '#14b8a6')
    g.render(os.path.join(OUT, 'flow-transcoding'), cleanup=True)

# 2. Streaming Playback Flow
def playback_flow():
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.6', ranksep='0.7', splines='spline',
           rankdir='LR', label='  Video Streaming Playback  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'user', 'User clicks\nPlay', 'blue')
    n(g, 'api', 'Playback\nService', 'green')
    n(g, 'drm', 'DRM License\nServer', 'purple')
    n(g, 'steering', 'CDN Steering\n(pick closest\nOC appliance)', 'yellow')
    n(g, 'oc', 'Open Connect\nAppliance\n(at ISP)', 'red')
    n(g, 'abr', 'Adaptive\nBitrate\n(client-side)', 'orange')
    n(g, 'player', 'Video Player\n(buffer 2-5s)', 'blue')
    e(g, 'user', 'api', '① play\nrequest', '#3b82f6')
    e(g, 'api', 'drm', '② get\nlicense key', '#6366f1')
    e(g, 'api', 'steering', '③ find\nbest CDN', '#f59e0b')
    e(g, 'steering', 'oc', '④ redirect\nto edge', '#ef4444')
    e(g, 'oc', 'abr', '⑤ stream\nchunks', '#f97316')
    e(g, 'abr', 'player', '⑥ adjust\nquality', '#3b82f6')
    g.render(os.path.join(OUT, 'flow-playback'), cleanup=True)

# 3. Key Decisions
def key_decisions():
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.5', nodesep='0.7', ranksep='0.9', splines='spline',
           rankdir='TB', label='  Netflix — Key Design Decisions  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'client', 'Client Device\n(Smart TV, Mobile,\nBrowser)', 'blue')
    n(g, 'api', 'API Gateway\n(Zuul)', 'gray')
    n(g, 'rec', 'Recommendation\nEngine\n(ML: 80% of\ncontent watched)', 'purple')
    n(g, 'catalog', 'Content Catalog\n(Cassandra\n17K+ titles)', 'teal')
    n(g, 'transcode', 'Transcoding\n(1,200+ profiles\nper title)', 'orange')
    n(g, 'oc', 'Open Connect\nCDN\n(own hardware\nat ISPs)', 'red')
    n(g, 'abr', 'Adaptive Bitrate\n(client selects\nbest quality)', 'yellow')
    n(g, 'chaos', 'Chaos Engineering\n(Chaos Monkey\nresilience)', 'pink')
    e(g, 'client', 'api', 'HTTPS', '#3b82f6')
    e(g, 'api', 'rec', 'personalize\nhome page', '#6366f1')
    e(g, 'api', 'catalog', 'browse\ntitles', '#14b8a6')
    e(g, 'catalog', 'transcode', 'encode all\nformats', '#f97316')
    e(g, 'transcode', 'oc', 'push to\nedge', '#ef4444')
    e(g, 'oc', 'client', 'stream\nvia ABR', '#f59e0b')
    e(g, 'client', 'abr', 'quality\nadaptation', '#f59e0b', 'dashed')
    e(g, 'api', 'chaos', 'resilience\ntesting', '#ec4899', 'dashed')
    g.render(os.path.join(OUT, 'key-decisions'), cleanup=True)

if __name__ == '__main__':
    for fn in [transcode_flow, playback_flow, key_decisions]:
        fn(); print(f'Generated: {fn.__name__}')
