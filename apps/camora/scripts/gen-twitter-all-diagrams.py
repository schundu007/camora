#!/usr/bin/env python3
"""Generate ALL missing diagrams for Twitter topic."""
import graphviz, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'twitter')
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
def mk(name, **kw):
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.6', ranksep='0.7', splines='spline', **kw)
    return g

# ── FLOWCHART: Search Flow ──
def search_flow():
    g = mk('search', rankdir='LR', label='  Tweet Search Flow (Earlybird)  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'user', 'User\nsearches', 'blue')
    n(g, 'api', 'Search API\n(parse query)', 'gray')
    n(g, 'scatter', 'Scatter to\nEarlybird shards\n(time-partitioned)', 'orange')
    n(g, 'shard1', 'Shard 1\n(recent)', 'yellow')
    n(g, 'shard2', 'Shard 2\n(older)', 'yellow')
    n(g, 'shardn', 'Shard N\n(archive)', 'yellow')
    n(g, 'gather', 'Gather + Merge\nBM25 × recency\n× engagement', 'purple')
    n(g, 'result', 'Top results\npaginated', 'blue')
    e(g, 'user', 'api', '① query', '#3b82f6')
    e(g, 'api', 'scatter', '② fan-out', '#f97316')
    e(g, 'scatter', 'shard1', '', '#f59e0b')
    e(g, 'scatter', 'shard2', '', '#f59e0b')
    e(g, 'scatter', 'shardn', '', '#f59e0b')
    e(g, 'shard1', 'gather', 'partial\nresults', '#6366f1')
    e(g, 'shard2', 'gather', '', '#6366f1')
    e(g, 'shardn', 'gather', '', '#6366f1')
    e(g, 'gather', 'result', '③ ranked', '#3b82f6')
    g.render(os.path.join(OUT, 'flow-search'), cleanup=True)

# ── DEEP DIVE: Hybrid Fan-out ──
def dd_fanout():
    g = mk('fanout', rankdir='TB', label='  Hybrid Fan-out Strategy  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'tweet', 'New Tweet\nPosted', 'blue')
    g.node('check', 'Follower\nCount?', shape='diamond', style='filled', fillcolor='#fef3c7', color='#f59e0b', fontcolor='#92400e', fontname='Helvetica Neue', fontsize='12', height='0.7')
    n(g, 'push', 'Fan-out on Write\nPush to all follower\ntimeline caches', 'green')
    n(g, 'store', 'Celebrity Cache\nStore tweet only\n(no fan-out)', 'orange')
    n(g, 'redis', 'Redis ZADD\nto each follower\nsorted set', 'pink')
    n(g, 'read', 'Pull on Read\nMerge at feed\nrequest time', 'yellow')
    e(g, 'tweet', 'check', '', '#f59e0b')
    e(g, 'check', 'push', '< 10K followers\n(99.9% of users)', '#22c55e')
    e(g, 'check', 'store', '≥ 10K followers\n(celebrities)', '#f97316')
    e(g, 'push', 'redis', 'N writes', '#ec4899')
    e(g, 'store', 'read', 'on demand', '#f59e0b', 'dashed')
    g.render(os.path.join(OUT, 'deep-dive-fanout'), cleanup=True)

# ── DEEP DIVE: Earlybird Search ──
def dd_search():
    g = mk('earlybird', rankdir='LR', label='  Earlybird Search Architecture  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'tweet', 'New Tweet', 'blue')
    n(g, 'kafka', 'Kafka\n(tweet stream)', 'yellow')
    n(g, 'index', 'Earlybird\nIndexer\n(inverted index)', 'green')
    n(g, 'realtime', 'Real-time\nSegment\n(in-memory)', 'orange')
    n(g, 'archive', 'Archive\nSegments\n(on-disk)', 'purple')
    n(g, 'query', 'Search Query', 'blue')
    n(g, 'blender', 'Blender\n(scatter-gather\nacross shards)', 'teal')
    e(g, 'tweet', 'kafka', 'publish', '#f59e0b')
    e(g, 'kafka', 'index', '~10s delay', '#22c55e')
    e(g, 'index', 'realtime', 'recent\ntweets', '#f97316')
    e(g, 'index', 'archive', 'age-off', '#6366f1', 'dashed')
    e(g, 'query', 'blender', 'search', '#14b8a6')
    e(g, 'blender', 'realtime', 'fan-out', '#14b8a6')
    e(g, 'blender', 'archive', 'fan-out', '#14b8a6')
    g.render(os.path.join(OUT, 'deep-dive-earlybird'), cleanup=True)

# ── DEEP DIVE: Snowflake ID ──
def dd_snowflake():
    g = mk('snowflake', rankdir='LR', label='  Snowflake ID Generation  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'req', 'ID Request\n(any service)', 'blue')
    n(g, 'worker', 'Snowflake\nWorker\n(per machine)', 'green')
    n(g, 'bits', '64-bit ID:\n1 sign + 41 timestamp\n+ 10 machine\n+ 12 sequence', 'purple')
    n(g, 'sort', 'Time-sortable\n(most significant\nbits = timestamp)', 'yellow')
    n(g, 'unique', 'Globally Unique\n(no coordination\nrequired)', 'teal')
    e(g, 'req', 'worker', 'generate', '#22c55e')
    e(g, 'worker', 'bits', 'compose\n64-bit ID', '#6366f1')
    e(g, 'bits', 'sort', 'enables\nrange queries', '#f59e0b')
    e(g, 'bits', 'unique', '4096 IDs/ms\nper worker', '#14b8a6')
    g.render(os.path.join(OUT, 'deep-dive-snowflake'), cleanup=True)

# ── DEEP DIVE: Timeline Ranking ──
def dd_ranking():
    g = mk('ranking', rankdir='LR', label='  Timeline Ranking ML Pipeline  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'candidates', 'Candidate\nTweets\n(from timeline\n+ celebrities)', 'blue')
    n(g, 'features', 'Feature\nExtraction\n(user, tweet,\ncontext)', 'green')
    n(g, 'model', 'ML Model\n(predict\nengagement\nprobability)', 'purple')
    n(g, 'score', 'Score +\nRe-rank\n(relevance ×\nrecency)', 'orange')
    n(g, 'filter', 'Filter\n(muted, blocked,\nNSFW)', 'pink')
    n(g, 'feed', 'Ranked\nFeed', 'blue')
    e(g, 'candidates', 'features', '~500\ncandidates', '#22c55e')
    e(g, 'features', 'model', '100+\nfeatures', '#6366f1')
    e(g, 'model', 'score', 'engagement\nscores', '#f97316')
    e(g, 'score', 'filter', 'top 50', '#ec4899')
    e(g, 'filter', 'feed', 'top 20\nreturned', '#3b82f6')
    g.render(os.path.join(OUT, 'deep-dive-ranking'), cleanup=True)

# ── DEEP DIVE: Trends Detection ──
def dd_trends():
    g = mk('trends', rankdir='LR', label='  Trending Topics (Stream Processing)  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'tweets', 'Tweet Stream\n(500K/sec)', 'blue')
    n(g, 'extract', 'Extract\nHashtags +\nKeywords', 'green')
    n(g, 'kafka', 'Kafka\n(hashtag topic)', 'yellow')
    n(g, 'storm', 'Stream Processor\n(sliding window\ncounters)', 'orange')
    n(g, 'velocity', 'Velocity Score\n(rate of change\n> absolute count)', 'purple')
    n(g, 'cache', 'Redis Cache\n(TTL: 30s)\nper-geo trends', 'pink')
    n(g, 'antibot', 'Anti-gaming\nFilter\n(bot detection)', 'red')
    e(g, 'tweets', 'extract', 'every\ntweet', '#22c55e')
    e(g, 'extract', 'kafka', 'publish', '#f59e0b')
    e(g, 'kafka', 'storm', '5-min / 1-hr\nwindows', '#f97316')
    e(g, 'storm', 'velocity', 'compute\ntrending score', '#6366f1')
    e(g, 'velocity', 'antibot', 'filter bots', '#ef4444')
    e(g, 'antibot', 'cache', 'cache\nresults', '#ec4899')
    g.render(os.path.join(OUT, 'deep-dive-trends'), cleanup=True)

# ── DISCUSSION: Search Arch ──
def disc_search():
    g = mk('disc_search', rankdir='LR', label='  Search Architecture  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'query', 'Search\nQuery', 'blue')
    n(g, 'blender', 'Blender\n(router)', 'gray')
    n(g, 'rt', 'Real-time\nIndex', 'orange')
    n(g, 'full', 'Full Archive\nIndex', 'purple')
    n(g, 'rank', 'Rank +\nBlend\nResults', 'green')
    e(g, 'query', 'blender', '', '#3b82f6')
    e(g, 'blender', 'rt', 'recent', '#f97316')
    e(g, 'blender', 'full', 'all time', '#6366f1')
    e(g, 'rt', 'rank', '', '#22c55e')
    e(g, 'full', 'rank', '', '#22c55e')
    g.render(os.path.join(OUT, 'discuss-search'), cleanup=True)

# ── DISCUSSION: Trending ──
def disc_trending():
    g = mk('disc_trending', rankdir='LR', label='  Trending Topics Pipeline  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'stream', 'Tweet\nStream', 'blue')
    n(g, 'extract', 'Hashtag\nExtractor', 'green')
    n(g, 'counter', 'Sliding Window\nCounters\n(5m/1h/24h)', 'orange')
    n(g, 'geo', 'Geo Filter\n(city/country)', 'purple')
    n(g, 'cache', 'Trends\nCache', 'pink')
    e(g, 'stream', 'extract', '', '#22c55e')
    e(g, 'extract', 'counter', 'per tag', '#f97316')
    e(g, 'counter', 'geo', 'velocity\nscore', '#6366f1')
    e(g, 'geo', 'cache', 'TTL 30s', '#ec4899')
    g.render(os.path.join(OUT, 'discuss-trending'), cleanup=True)

# ── DISCUSSION: Media Storage ──
def disc_media():
    g = mk('disc_media', rankdir='LR', label='  Media Storage Pipeline  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'upload', 'Media\nUpload', 'blue')
    n(g, 'process', 'Image/Video\nProcessor\n(resize, transcode)', 'green')
    n(g, 's3', 'S3\n(multiple sizes)', 'purple')
    n(g, 'cdn', 'CDN\n(global edge)', 'orange')
    n(g, 'tweet', 'Tweet stores\nmediaId only', 'teal')
    e(g, 'upload', 'process', 'raw file', '#22c55e')
    e(g, 'process', 's3', 'thumb +\nfull size', '#6366f1')
    e(g, 's3', 'cdn', 'distribute', '#f97316')
    e(g, 'upload', 'tweet', 'mediaId\nreference', '#14b8a6', 'dashed')
    g.render(os.path.join(OUT, 'discuss-media'), cleanup=True)

if __name__ == '__main__':
    for fn in [search_flow, dd_fanout, dd_search, dd_snowflake, dd_ranking, dd_trends, disc_search, disc_trending, disc_media]:
        fn(); print(f'OK: {fn.__name__}')
    print(f'\nGenerated {9} diagrams in {OUT}')
