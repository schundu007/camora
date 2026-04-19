#!/usr/bin/env python3
"""Generate ALL missing diagrams for Netflix topic."""
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
def n(g, nm, label, c): g.node(nm, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)
def e(g, a, b, label='', color='#475569', style='solid'): g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)
def mk(**kw):
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.6', ranksep='0.7', splines='spline', **kw)
    return g

# Flowchart: Content Ingestion
def flow_ingest():
    g = mk(rankdir='LR', label='  Content Ingestion Pipeline  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'studio', 'Content\nStudio', 'blue')
    n(g, 'upload', 'Upload\nService', 'green')
    n(g, 'raw', 'S3\n(Raw Master)', 'purple')
    n(g, 'transcode', 'Transcoding\nPipeline\n(1,200+ profiles)', 'orange')
    n(g, 'encoded', 'S3\n(Encoded)', 'purple')
    n(g, 'oc', 'Open Connect\nCDN\n(push to ISPs)', 'red')
    n(g, 'catalog', 'Content\nCatalog', 'teal')
    e(g, 'studio', 'upload', '① upload\nmaster', '#3b82f6')
    e(g, 'upload', 'raw', '② store', '#6366f1')
    e(g, 'raw', 'transcode', '③ encode\nall profiles', '#f97316')
    e(g, 'transcode', 'encoded', '④ store\nversions', '#6366f1')
    e(g, 'encoded', 'oc', '⑤ push to\nedge', '#ef4444')
    e(g, 'upload', 'catalog', '⑥ metadata', '#14b8a6')
    g.render(os.path.join(OUT, 'flow-content-ingestion'), cleanup=True)

# DD1: ABR Streaming
def dd_abr():
    g = mk(rankdir='LR', label='  Adaptive Bitrate Streaming  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'client', 'Netflix\nClient', 'blue')
    n(g, 'manifest', 'Manifest\n(DASH/HLS)\nbitrate ladder', 'green')
    n(g, 'monitor', 'Bandwidth\nMonitor\n(client-side)', 'yellow')
    n(g, 'select', 'Quality\nSelector\n(buffer-based)', 'orange')
    n(g, 'chunk', 'Request next\nchunk at\noptimal bitrate', 'purple')
    n(g, 'oc', 'Open Connect\nAppliance', 'red')
    e(g, 'client', 'manifest', '① get\nmanifest', '#22c55e')
    e(g, 'manifest', 'monitor', '② available\nbitrates', '#f59e0b')
    e(g, 'monitor', 'select', '③ measured\nbandwidth', '#f97316')
    e(g, 'select', 'chunk', '④ pick\nquality', '#6366f1')
    e(g, 'chunk', 'oc', '⑤ fetch\nchunk', '#ef4444')
    e(g, 'oc', 'client', '⑥ video\ndata', '#3b82f6', 'dashed')
    g.render(os.path.join(OUT, 'deep-dive-abr'), cleanup=True)

# DD2: Transcoding Pipeline
def dd_transcode():
    g = mk(rankdir='LR', label='  Video Encoding Pipeline  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'master', 'Master File\n(4K/8K source)', 'blue')
    n(g, 'analyze', 'Shot-level\nAnalysis\n(complexity)', 'green')
    n(g, 'encode', 'Per-shot\nEncoding\n(optimal bitrate)', 'orange')
    n(g, 'profiles', '1,200+\nOutput Profiles\n(resolution ×\nbitrate × codec)', 'purple')
    n(g, 'validate', 'Quality\nValidation\n(VMAF score)', 'teal')
    n(g, 'store', 'S3 + OC\nDistribution', 'red')
    e(g, 'master', 'analyze', '① split into\nshots', '#22c55e')
    e(g, 'analyze', 'encode', '② per-shot\nbitrate', '#f97316')
    e(g, 'encode', 'profiles', '③ generate\nall versions', '#6366f1')
    e(g, 'profiles', 'validate', '④ VMAF\ncheck', '#14b8a6')
    e(g, 'validate', 'store', '⑤ distribute', '#ef4444')
    g.render(os.path.join(OUT, 'deep-dive-transcoding'), cleanup=True)

# DD3: Open Connect CDN
def dd_oc():
    g = mk(rankdir='TB', label='  Open Connect CDN Architecture  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'aws', 'AWS Control Plane\n(API, auth, catalog,\nrecommendations)', 'blue')
    n(g, 'steer', 'CDN Steering\nService\n(pick best OCA)', 'green')
    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'oca1', 'OCA at ISP 1\n(hardware at\nISP datacenter)', 'red')
        n(s, 'oca2', 'OCA at ISP 2', 'red')
        n(s, 'oca3', 'OCA at IX\n(exchange point)', 'red')
    n(g, 'user', 'Viewer\n(streams from\nclosest OCA)', 'blue')
    e(g, 'aws', 'steer', 'routing\ndecision', '#22c55e')
    e(g, 'aws', 'oca1', 'push content\n(overnight)', '#ef4444')
    e(g, 'aws', 'oca2', 'push', '#ef4444')
    e(g, 'aws', 'oca3', 'push', '#ef4444')
    e(g, 'steer', 'user', 'redirect to\nbest OCA', '#3b82f6')
    e(g, 'oca1', 'user', 'stream', '#ef4444', 'dashed')
    g.render(os.path.join(OUT, 'deep-dive-open-connect'), cleanup=True)

# DD4: Recommendations
def dd_rec():
    g = mk(rankdir='LR', label='  Recommendation Engine  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'signals', 'User Signals\n(watch history,\nratings, time)', 'blue')
    n(g, 'collab', 'Collaborative\nFiltering\n(similar users)', 'green')
    n(g, 'content', 'Content-Based\n(genre, actors,\ntags)', 'yellow')
    n(g, 'deep', 'Deep Learning\n(session-based\nsequence model)', 'purple')
    n(g, 'merge', 'Ensemble\nBlender\n(weighted mix)', 'orange')
    n(g, 'page', 'Personalized\nHome Page\n(rows × ranked)', 'blue')
    e(g, 'signals', 'collab', '', '#22c55e')
    e(g, 'signals', 'content', '', '#f59e0b')
    e(g, 'signals', 'deep', '', '#6366f1')
    e(g, 'collab', 'merge', '', '#f97316')
    e(g, 'content', 'merge', '', '#f97316')
    e(g, 'deep', 'merge', '', '#f97316')
    e(g, 'merge', 'page', '80% of\ncontent watched', '#3b82f6')
    g.render(os.path.join(OUT, 'deep-dive-recommendations'), cleanup=True)

# DD5: Chaos Engineering
def dd_chaos():
    g = mk(rankdir='TB', label='  Chaos Engineering (Simian Army)  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'monkey', 'Chaos Monkey\n(kill random\ninstances)', 'red')
    n(g, 'gorilla', 'Chaos Kong\n(take down\nentire region)', 'orange')
    n(g, 'latency', 'Latency\nMonkey\n(inject delays)', 'yellow')
    n(g, 'prod', 'Production\nServices', 'blue')
    n(g, 'fallback', 'Graceful\nDegradation\n(cache, static)', 'green')
    n(g, 'learn', 'Learn +\nHarden\n(fix weak points)', 'purple')
    e(g, 'monkey', 'prod', 'kill\ninstances', '#ef4444')
    e(g, 'gorilla', 'prod', 'region\nfailover', '#f97316')
    e(g, 'latency', 'prod', 'slow\nrequests', '#f59e0b')
    e(g, 'prod', 'fallback', 'survive?', '#22c55e')
    e(g, 'prod', 'learn', 'crash?\nfix it', '#6366f1', 'dashed')
    g.render(os.path.join(OUT, 'deep-dive-chaos'), cleanup=True)

# Discussion diagrams
def disc_oc():
    g = mk(rankdir='LR', label='  Open Connect Overview  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'aws', 'AWS\n(control plane)', 'blue')
    n(g, 'oca', 'OCA Appliances\n(at ISPs)', 'red')
    n(g, 'user', 'Viewer', 'blue')
    e(g, 'aws', 'oca', 'push\ncontent', '#ef4444')
    e(g, 'oca', 'user', 'stream\nlocally', '#3b82f6')
    g.render(os.path.join(OUT, 'discuss-open-connect'), cleanup=True)

def disc_abr():
    g = mk(rankdir='LR', label='  Adaptive Bitrate  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'monitor', 'Bandwidth\nMonitor', 'yellow')
    n(g, 'select', 'Quality\nSwitch', 'orange')
    n(g, 'buffer', 'Buffer\n(2-5 sec)', 'green')
    n(g, 'play', 'Smooth\nPlayback', 'blue')
    e(g, 'monitor', 'select', 'bandwidth\nchange', '#f59e0b')
    e(g, 'select', 'buffer', 'new\nbitrate', '#22c55e')
    e(g, 'buffer', 'play', 'no\nbuffering', '#3b82f6')
    g.render(os.path.join(OUT, 'discuss-abr'), cleanup=True)

def disc_rec():
    g = mk(rankdir='LR', label='  Recommendation Personalization  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'user', 'User\nProfile', 'blue')
    n(g, 'model', 'ML Models\n(collaborative +\ncontent-based)', 'purple')
    n(g, 'rows', 'Personalized\nRows\n(genre, mood)', 'orange')
    n(g, 'art', 'Custom\nArtwork\n(per user)', 'pink')
    e(g, 'user', 'model', 'watch\nhistory', '#6366f1')
    e(g, 'model', 'rows', 'rank\ntitles', '#f97316')
    e(g, 'model', 'art', 'select\nimage', '#ec4899')
    g.render(os.path.join(OUT, 'discuss-recommendations'), cleanup=True)

def disc_chaos():
    g = mk(rankdir='LR', label='  Resilience & Chaos  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'chaos', 'Chaos\nMonkey', 'red')
    n(g, 'prod', 'Production', 'blue')
    n(g, 'fallback', 'Graceful\nFallback', 'green')
    e(g, 'chaos', 'prod', 'break\nthings', '#ef4444')
    e(g, 'prod', 'fallback', 'survive', '#22c55e')
    g.render(os.path.join(OUT, 'discuss-chaos'), cleanup=True)

if __name__ == '__main__':
    fns = [flow_ingest, dd_abr, dd_transcode, dd_oc, dd_rec, dd_chaos, disc_oc, disc_abr, disc_rec, disc_chaos]
    for fn in fns:
        fn(); print(f'OK: {fn.__name__}')
    print(f'\nGenerated {len(fns)} Netflix diagrams')
