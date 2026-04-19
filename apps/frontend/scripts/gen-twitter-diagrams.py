#!/usr/bin/env python3
"""Generate architecture diagrams for Twitter system design topic."""
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

# 1. Tweet Post Flow
def tweet_flow():
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.6', ranksep='0.7', splines='spline',
           rankdir='LR', label='  Tweet Post Flow  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'user', 'User\nposts tweet', 'blue')
    n(g, 'api', 'API Gateway\n(rate limit)', 'gray')
    n(g, 'write', 'Tweet Service\n(write path)', 'green')
    n(g, 'db', 'Tweets DB\n(MySQL sharded)', 'purple')
    n(g, 'cache', 'Tweet Cache\n(Redis)', 'pink')
    n(g, 'fanout', 'Fan-out Service\n(async)', 'orange')
    n(g, 'timeline', 'Follower\nTimelines\n(Redis lists)', 'yellow')
    n(g, 'notify', 'Notification\nService', 'teal')
    e(g, 'user', 'api', '① POST\n/tweets', '#3b82f6')
    e(g, 'api', 'write', '② validate\n+ store', '#22c55e')
    e(g, 'write', 'db', '③ persist', '#6366f1')
    e(g, 'write', 'cache', '④ cache', '#ec4899')
    e(g, 'write', 'fanout', '⑤ trigger\nfan-out', '#f59e0b')
    e(g, 'fanout', 'timeline', '⑥ prepend to\nfollower feeds', '#f59e0b')
    e(g, 'fanout', 'notify', '⑦ push\nnotifications', '#14b8a6', 'dashed')
    g.render(os.path.join(OUT, 'flow-tweet-post'), cleanup=True)

# 2. Feed Generation Flow
def feed_flow():
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.6', ranksep='0.7', splines='spline',
           rankdir='LR', label='  Home Feed Generation  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'user', 'User opens\nhome feed', 'blue')
    n(g, 'api', 'Feed Service', 'green')
    n(g, 'timeline', 'Pre-computed\nTimeline\n(Redis list)', 'yellow')
    n(g, 'celeb', 'Celebrity\nTweets\n(on-demand pull)', 'orange')
    n(g, 'merge', 'Merge +\nRank\n(ML model)', 'purple')
    n(g, 'cache', 'Feed Cache\n(Redis)', 'pink')
    n(g, 'response', 'Return\npaginated feed', 'blue')
    e(g, 'user', 'api', '① GET /feed', '#3b82f6')
    e(g, 'api', 'timeline', '② fetch pre-built\ntimeline', '#f59e0b')
    e(g, 'api', 'celeb', '③ pull celebrity\ntweets (fan-out\non read)', '#f97316')
    e(g, 'timeline', 'merge', 'regular\ntweets', '#f59e0b')
    e(g, 'celeb', 'merge', 'celeb\ntweets', '#f97316')
    e(g, 'merge', 'cache', '④ cache\nresult', '#ec4899')
    e(g, 'merge', 'response', '⑤ ranked\nfeed', '#3b82f6')
    g.render(os.path.join(OUT, 'flow-feed-generation'), cleanup=True)

# 3. Key Decisions
def key_decisions():
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.5', nodesep='0.7', ranksep='0.9', splines='spline',
           rankdir='TB', label='  Twitter — Key Design Decisions  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    n(g, 'client', 'Mobile/Web\nClient', 'blue')
    n(g, 'api', 'API Gateway\n(rate limiting)', 'gray')
    n(g, 'tweet_svc', 'Tweet Service\n(write path)', 'green')
    n(g, 'fanout', 'Fan-out Service\n(hybrid: write\nfor <10K followers\nread for celebrities)', 'orange')
    n(g, 'timeline', 'Timeline Cache\n(Redis sorted sets)', 'yellow')
    n(g, 'tweets_db', 'Tweets DB\n(MySQL sharded\nby tweetId)', 'purple')
    n(g, 'search', 'Search Index\n(Elasticsearch\nnear real-time)', 'teal')
    n(g, 'media', 'Media Store\n(S3 + CDN)', 'pink')
    n(g, 'trends', 'Trends Service\n(Apache Storm\nreal-time)', 'red')
    e(g, 'client', 'api', 'HTTP/WS', '#3b82f6')
    e(g, 'api', 'tweet_svc', 'write', '#22c55e')
    e(g, 'tweet_svc', 'tweets_db', 'persist', '#6366f1')
    e(g, 'tweet_svc', 'fanout', 'async\nfan-out', '#f59e0b')
    e(g, 'fanout', 'timeline', 'prepend\nto feeds', '#f59e0b')
    e(g, 'tweet_svc', 'search', 'index', '#14b8a6')
    e(g, 'tweet_svc', 'media', 'upload', '#ec4899')
    e(g, 'tweet_svc', 'trends', 'stream\nhashtags', '#ef4444')
    g.render(os.path.join(OUT, 'key-decisions'), cleanup=True)

if __name__ == '__main__':
    for fn in [tweet_flow, feed_flow, key_decisions]:
        fn(); print(f'Generated: {fn.__name__}')
