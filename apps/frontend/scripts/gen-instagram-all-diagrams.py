#!/usr/bin/env python3
"""Generate ALL missing diagrams for Instagram topic."""
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
def mk(**kw):
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.6', ranksep='0.7', splines='spline', **kw)
    return g

# Deep Dive 1: Image Processing Pipeline
def dd_image():
    g = mk(rankdir='LR', label='  Image Processing Pipeline  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'upload', 'Raw Photo\nUpload', 'blue')
    n(g, 'moderate', 'Content\nModeration\n(ML scan)', 'pink')
    n(g, 'resize', 'Resize Engine\n150px thumb\n640px medium\n1080px full', 'orange')
    n(g, 's3', 'S3\n(3 versions)', 'purple')
    n(g, 'cdn', 'CDN Edge\n(CloudFront)', 'teal')
    n(g, 'blur', 'BlurHash\nPlaceholder\n(20 bytes)', 'yellow')
    e(g, 'upload', 'moderate', '① scan', '#ec4899')
    e(g, 'moderate', 'resize', '② approved', '#f97316')
    e(g, 'resize', 's3', '③ store\n3 sizes', '#6366f1')
    e(g, 'resize', 'blur', '④ generate\nplaceholder', '#f59e0b')
    e(g, 's3', 'cdn', '⑤ distribute', '#14b8a6')
    g.render(os.path.join(OUT, 'deep-dive-image-pipeline'), cleanup=True)

# Deep Dive 2: CDN Multi-Tier
def dd_cdn():
    g = mk(rankdir='LR', label='  CDN Multi-Tier Caching  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'client', 'Mobile\nClient', 'blue')
    n(g, 'edge', 'CDN Edge\n(L1 — city)', 'green')
    n(g, 'regional', 'Regional\nPOP (L2)', 'yellow')
    n(g, 'origin', 'Origin S3\n(L3)', 'purple')
    n(g, 'shield', 'Origin Shield\n(collapse\nredundant\nrequests)', 'orange')
    e(g, 'client', 'edge', 'request\nimage', '#3b82f6')
    e(g, 'edge', 'regional', 'L1 miss', '#f59e0b', 'dashed')
    e(g, 'regional', 'shield', 'L2 miss', '#f97316', 'dashed')
    e(g, 'shield', 'origin', 'L3 miss\n(rare)', '#6366f1', 'dashed')
    e(g, 'edge', 'client', 'cache hit\n(~95%)', '#22c55e')
    g.render(os.path.join(OUT, 'deep-dive-cdn'), cleanup=True)

# Deep Dive 3: Hybrid Fan-out
def dd_fanout():
    g = mk(rankdir='TB', label='  Hybrid Fan-out for Feed  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'post', 'New Post', 'blue')
    g.node('check', 'Follower\nCount?', shape='diamond', style='filled', fillcolor='#fef3c7', color='#f59e0b', fontcolor='#92400e', fontname='Helvetica Neue', fontsize='12', height='0.7')
    n(g, 'push', 'Push to\nfollower feeds\n(Redis ZADD)', 'green')
    n(g, 'cache', 'Celebrity\ncache only', 'orange')
    n(g, 'feed', 'Feed Service\nmerges at\nread time', 'purple')
    e(g, 'post', 'check', '', '#f59e0b')
    e(g, 'check', 'push', '< 10K', '#22c55e')
    e(g, 'check', 'cache', '≥ 10K', '#f97316')
    e(g, 'cache', 'feed', 'pull on\ndemand', '#6366f1', 'dashed')
    g.render(os.path.join(OUT, 'deep-dive-fanout'), cleanup=True)

# Deep Dive 4: Stories Architecture
def dd_stories():
    g = mk(rankdir='LR', label='  Stories Ephemeral Architecture  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'user', 'User posts\nstory', 'blue')
    n(g, 'store', 'Hot Storage\n(Redis + SSD)\nTTL: 24 hours', 'orange')
    n(g, 'ring', 'Story Ring\n(ordered by\nrecency)', 'yellow')
    n(g, 'viewer', 'Viewers\n(swipe through)', 'blue')
    n(g, 'expire', 'Auto-Delete\nafter 24h\n(Cassandra TTL)', 'pink')
    n(g, 'archive', 'Optional\nArchive\n(Highlights)', 'purple')
    e(g, 'user', 'store', '① upload', '#f97316')
    e(g, 'store', 'ring', '② prepend', '#f59e0b')
    e(g, 'ring', 'viewer', '③ serve', '#3b82f6')
    e(g, 'store', 'expire', '④ TTL\nexpiry', '#ec4899', 'dashed')
    e(g, 'expire', 'archive', '⑤ save to\nhighlights?', '#6366f1', 'dashed')
    g.render(os.path.join(OUT, 'deep-dive-stories'), cleanup=True)

# Deep Dive 5: Explore ML
def dd_explore():
    g = mk(rankdir='LR', label='  Explore Page Recommendations  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'signals', 'User Signals\n(likes, saves,\nfollows, time)', 'blue')
    n(g, 'candidate', 'Candidate\nGeneration\n(1000s of posts)', 'green')
    n(g, 'rank', 'ML Ranking\n(engagement\nprediction)', 'purple')
    n(g, 'filter', 'Content Filter\n(quality, safety,\ndiversity)', 'pink')
    n(g, 'explore', 'Explore Grid\n(top 50 posts)', 'orange')
    e(g, 'signals', 'candidate', 'user\nembedding', '#22c55e')
    e(g, 'candidate', 'rank', '~1000\ncandidates', '#6366f1')
    e(g, 'rank', 'filter', 'scored', '#ec4899')
    e(g, 'filter', 'explore', 'final\nselection', '#f97316')
    g.render(os.path.join(OUT, 'deep-dive-explore'), cleanup=True)

# Discussion 1: Feed Ranking
def disc_ranking():
    g = mk(rankdir='LR', label='  Feed Ranking Algorithm  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'candidates', 'Candidate\nPosts', 'blue')
    n(g, 'features', 'Features\n(author, content,\nuser affinity)', 'green')
    n(g, 'model', 'ML Model\n(predict\nP(like|share|save))', 'purple')
    n(g, 'rank', 'Ranked\nFeed', 'orange')
    e(g, 'candidates', 'features', '', '#22c55e')
    e(g, 'features', 'model', '', '#6366f1')
    e(g, 'model', 'rank', 'score ×\nrecency', '#f97316')
    g.render(os.path.join(OUT, 'discuss-ranking'), cleanup=True)

# Discussion 2: Celebrity Problem
def disc_celebrity():
    g = mk(rankdir='LR', label='  Celebrity Post Handling  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'celeb', 'Celebrity\nposts (100M+\nfollowers)', 'orange')
    n(g, 'cache', 'Hot Tweet\nCache (L1)', 'pink')
    n(g, 'pull', 'Pull on Read\n(no fan-out)', 'yellow')
    n(g, 'approx', 'Approximate\nCounters\n(batch every 5s)', 'purple')
    n(g, 'cdn', 'CDN Pre-warm\nfor media', 'teal')
    e(g, 'celeb', 'cache', 'store once', '#ec4899')
    e(g, 'celeb', 'pull', 'no fan-out\nto 100M feeds', '#f59e0b')
    e(g, 'celeb', 'approx', 'batch like\ncounters', '#6366f1')
    e(g, 'celeb', 'cdn', 'pre-warm\nedge', '#14b8a6')
    g.render(os.path.join(OUT, 'discuss-celebrity'), cleanup=True)

# Discussion 3: Stories Architecture
def disc_stories():
    g = mk(rankdir='LR', label='  Stories Architecture  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'create', 'Create\nStory', 'blue')
    n(g, 'hot', 'Hot Cache\n(24h TTL)', 'orange')
    n(g, 'ring', 'Story Ring\nUI', 'green')
    n(g, 'expire', 'Auto\nExpire', 'pink')
    e(g, 'create', 'hot', 'store', '#f97316')
    e(g, 'hot', 'ring', 'serve', '#22c55e')
    e(g, 'hot', 'expire', 'TTL', '#ec4899', 'dashed')
    g.render(os.path.join(OUT, 'discuss-stories'), cleanup=True)

# Discussion 4: Image Optimization
def disc_image():
    g = mk(rankdir='LR', label='  Image Optimization Pipeline  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'raw', 'Raw Upload\n(10-20 MB)', 'blue')
    n(g, 'compress', 'JPEG/WebP\nCompression\n(quality 85%)', 'green')
    n(g, 'resize', 'Resize\n150/640/1080px', 'orange')
    n(g, 'blur', 'BlurHash\n(20 byte\nplaceholder)', 'yellow')
    n(g, 'serve', 'Adaptive\nServing\n(WebP if supported)', 'purple')
    e(g, 'raw', 'compress', '10→2 MB', '#22c55e')
    e(g, 'compress', 'resize', '3 sizes', '#f97316')
    e(g, 'compress', 'blur', '20 bytes', '#f59e0b')
    e(g, 'resize', 'serve', 'content\nnegotiation', '#6366f1')
    g.render(os.path.join(OUT, 'discuss-image-opt'), cleanup=True)

# Story lifecycle flow
def flow_story():
    g = mk(rankdir='LR', label='  Story Lifecycle Flow  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'user', 'User creates\nstory', 'blue')
    n(g, 'upload', 'Upload +\nProcess', 'green')
    n(g, 'store', 'Hot Storage\n(Redis + SSD)', 'orange')
    n(g, 'notify', 'Notify\nfollowers\n(story ring)', 'yellow')
    n(g, 'view', 'Viewers\nwatch', 'blue')
    n(g, 'expire', '24h TTL\nauto-delete', 'pink')
    e(g, 'user', 'upload', '① create', '#22c55e')
    e(g, 'upload', 'store', '② store', '#f97316')
    e(g, 'store', 'notify', '③ push', '#f59e0b')
    e(g, 'notify', 'view', '④ serve', '#3b82f6')
    e(g, 'store', 'expire', '⑤ expire', '#ec4899', 'dashed')
    g.render(os.path.join(OUT, 'flow-story-lifecycle'), cleanup=True)

if __name__ == '__main__':
    fns = [dd_image, dd_cdn, dd_fanout, dd_stories, dd_explore, disc_ranking, disc_celebrity, disc_stories, disc_image, flow_story]
    for fn in fns:
        fn(); print(f'OK: {fn.__name__}')
    print(f'\nGenerated {len(fns)} Instagram diagrams')
