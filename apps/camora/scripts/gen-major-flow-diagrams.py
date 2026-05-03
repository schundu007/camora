#!/usr/bin/env python3
"""Generate createFlow/redirectFlow diagrams for Tinder, Twitter, Instagram."""
import graphviz, os

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams')

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue', fontsize='12', penwidth='1.5', height='0.45', margin='0.15,0.08')
EDGE = dict(fontname='Helvetica Neue', fontsize='10', penwidth='1.5')
C = {
    'blue': ('#dbeafe','#3b82f6','#1e40af'), 'green': ('#dcfce7','#22c55e','#166534'),
    'yellow': ('#fef3c7','#f59e0b','#92400e'), 'purple': ('#e0e7ff','#6366f1','#3730a3'),
    'pink': ('#fce7f3','#ec4899','#9d174d'), 'orange': ('#ffedd5','#f97316','#9a3412'),
    'teal': ('#ccfbf1','#14b8a6','#115e59'), 'gray': ('#f3f4f6','#6b7280','#374151'),
    'red': ('#fee2e2','#ef4444','#991b1b'), 'cyan': ('#cffafe','#06b6d4','#155e75'),
}
def n(g, nm, label, c): g.node(nm, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)
def e(g, a, b, label='', color='#475569', style='solid'): g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)
def mk(out, name, title, **kw):
    os.makedirs(out, exist_ok=True)
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.6', ranksep='0.7', splines='spline',
           label=f'  {title}  ', labelloc='t', fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b', **kw)
    return g, os.path.join(out, name)

# ═══════════════════════════════════════════
# TINDER
# ═══════════════════════════════════════════
def tinder_swipe():
    OUT = os.path.join(BASE, 'tinder')
    g, path = mk(OUT, 'flow-swipe-match', 'Swipe & Match Detection Flow', rankdir='LR')
    n(g, 'user', 'User\nSwipes Right', 'pink')
    n(g, 'api', 'API Gateway\n(rate limit)', 'gray')
    n(g, 'swipe', 'Swipe Service\n(record action)', 'blue')
    n(g, 'redis', 'Redis\n(check reciprocal\nSISMEMBER)', 'red')
    n(g, 'match', 'Match Service\n(create match\nrecord)', 'green')
    n(g, 'notify', 'Push\nNotification\n(both users)', 'orange')
    n(g, 'kafka', 'Kafka\n(async persist\nto Cassandra)', 'purple')
    n(g, 'recs', 'Rec Engine\n(remove from\nstacks)', 'teal')
    e(g, 'user', 'api', '1 POST /swipe', '#ec4899')
    e(g, 'api', 'swipe', '2 validate', '#6b7280')
    e(g, 'swipe', 'redis', '3 SADD +\nSISMEMBER', '#ef4444')
    e(g, 'redis', 'match', '4 mutual!\ncreate match', '#22c55e')
    e(g, 'match', 'notify', '5 push to\nboth users', '#f97316')
    e(g, 'swipe', 'kafka', '6 persist\nswipe log', '#6366f1', 'dashed')
    e(g, 'match', 'recs', '7 remove\nfrom stacks', '#14b8a6', 'dashed')
    g.render(path, cleanup=True)
    print(f'  OK {path}.png')

def tinder_recs():
    OUT = os.path.join(BASE, 'tinder')
    g, path = mk(OUT, 'flow-recommendation', 'Recommendation Pipeline', rankdir='LR')
    n(g, 'trigger', 'Batch Trigger\n(every 4 hours\nor stack empty)', 'gray')
    n(g, 's2', 'S2 Geo Index\n(find nearby\nusers in cells)', 'blue')
    n(g, 'filter', 'Preference\nFilter\n(age, gender,\ndistance)', 'teal')
    n(g, 'dedup', 'Bloom Filter\n(exclude\nalready swiped)', 'purple')
    n(g, 'rank', 'ML Ranker\n(ELO score,\ndistance, activity)', 'orange')
    n(g, 'diverse', 'Diversity\nRules\n(mix tiers,\ntypes)', 'yellow')
    n(g, 'cache', 'Redis Cache\n(store top 100\nper user)', 'red')
    n(g, 'serve', 'Serve to App\n(pre-load\nphotos)', 'green')
    e(g, 'trigger', 's2', '1 query\nregion', '#3b82f6')
    e(g, 's2', 'filter', '2 ~10K\ncandidates', '#14b8a6')
    e(g, 'filter', 'dedup', '3 remove\nseen', '#6366f1')
    e(g, 'dedup', 'rank', '4 score\n~2K profiles', '#f97316')
    e(g, 'rank', 'diverse', '5 apply\nrules', '#f59e0b')
    e(g, 'diverse', 'cache', '6 cache\ntop 100', '#ef4444')
    e(g, 'cache', 'serve', '7 GET /recs\n<100ms', '#22c55e')
    g.render(path, cleanup=True)
    print(f'  OK {path}.png')

# ═══════════════════════════════════════════
# TWITTER
# ═══════════════════════════════════════════
def twitter_post():
    OUT = os.path.join(BASE, 'twitter')
    os.makedirs(OUT, exist_ok=True)
    g, path = mk(OUT, 'flow-create-tweet', 'Post Tweet Flow', rankdir='LR')
    n(g, 'user', 'User\nposts tweet', 'blue')
    n(g, 'api', 'API Gateway\n(rate limit)', 'gray')
    n(g, 'validate', 'Validate\n(280 chars,\nspam check)', 'green')
    n(g, 'snowflake', 'Snowflake ID\n(time-sortable)', 'purple')
    n(g, 'db', 'Tweet DB\n(MySQL sharded)', 'teal')
    n(g, 'fanout', 'Fan-out Service\n(hybrid: push\nfor <10K)', 'orange')
    n(g, 'timeline', 'Follower\nTimelines\n(Redis)', 'yellow')
    n(g, 'index', 'Search Index\n+ Trends', 'pink')
    e(g, 'user', 'api', '1 POST', '#3b82f6')
    e(g, 'api', 'validate', '2 check', '#22c55e')
    e(g, 'validate', 'snowflake', '3 gen ID', '#6366f1')
    e(g, 'snowflake', 'db', '4 persist', '#14b8a6')
    e(g, 'db', 'fanout', '5 trigger', '#f97316')
    e(g, 'fanout', 'timeline', '6 push to\nfollower feeds', '#f59e0b')
    e(g, 'db', 'index', '7 index +\ntrend count', '#ec4899', 'dashed')
    g.render(path, cleanup=True)
    print(f'  OK {path}.png')

def twitter_read():
    OUT = os.path.join(BASE, 'twitter')
    g, path = mk(OUT, 'flow-read-timeline', 'Read Timeline Flow', rankdir='LR')
    n(g, 'user', 'User opens\nHome Feed', 'blue')
    n(g, 'api', 'Timeline\nService', 'gray')
    n(g, 'redis', 'Redis\n(pre-built\ntimeline)', 'red')
    n(g, 'merge', 'Merge\nService\n(add celebs\non-the-fly)', 'purple')
    n(g, 'rank', 'ML Ranker\n(relevance,\nrecency)', 'orange')
    n(g, 'hydrate', 'Hydration\nService\n(user profiles,\nmedia URLs)', 'teal')
    n(g, 'render', 'Return\nRanked Feed', 'green')
    e(g, 'user', 'api', '1 GET /home', '#3b82f6')
    e(g, 'api', 'redis', '2 fetch\npre-built', '#ef4444')
    e(g, 'redis', 'merge', '3 add celeb\ntweets (pull)', '#6366f1')
    e(g, 'merge', 'rank', '4 rank by\nrelevance', '#f97316')
    e(g, 'rank', 'hydrate', '5 fetch\nprofiles +\nmedia', '#14b8a6')
    e(g, 'hydrate', 'render', '6 return\nranked feed', '#22c55e')
    g.render(path, cleanup=True)
    print(f'  OK {path}.png')

# ═══════════════════════════════════════════
# INSTAGRAM
# ═══════════════════════════════════════════
def instagram_post():
    OUT = os.path.join(BASE, 'instagram')
    os.makedirs(OUT, exist_ok=True)
    g, path = mk(OUT, 'flow-create-post', 'Create Post Flow', rankdir='LR')
    n(g, 'user', 'User uploads\nphoto/reel', 'pink')
    n(g, 'api', 'API Gateway', 'gray')
    n(g, 'upload', 'Media Service\n(S3 upload,\ngenerate sizes)', 'blue')
    n(g, 'nsfw', 'ML Filter\n(NSFW check,\ncopyright)', 'red')
    n(g, 'db', 'Post DB\n(Cassandra)', 'purple')
    n(g, 'fanout', 'Fan-out\nService\n(push to\nfollower feeds)', 'orange')
    n(g, 'cdn', 'CDN\n(CloudFront\nedge cache)', 'teal')
    n(g, 'notify', 'Notifications\n(followers,\nmentions)', 'yellow')
    e(g, 'user', 'api', '1 upload', '#ec4899')
    e(g, 'api', 'upload', '2 process\nmedia', '#3b82f6')
    e(g, 'upload', 'nsfw', '3 ML check', '#ef4444')
    e(g, 'nsfw', 'db', '4 persist\npost', '#6366f1')
    e(g, 'upload', 'cdn', '5 cache on\nedge', '#14b8a6')
    e(g, 'db', 'fanout', '6 fan-out\nto feeds', '#f97316')
    e(g, 'fanout', 'notify', '7 push\nnotifications', '#f59e0b', 'dashed')
    g.render(path, cleanup=True)
    print(f'  OK {path}.png')

def instagram_feed():
    OUT = os.path.join(BASE, 'instagram')
    g, path = mk(OUT, 'flow-load-feed', 'Load Feed Flow', rankdir='LR')
    n(g, 'user', 'User opens\nInstagram', 'pink')
    n(g, 'feed', 'Feed Service\n(aggregation)', 'blue')
    n(g, 'cache', 'Feed Cache\n(Redis\npre-built)', 'red')
    n(g, 'rank', 'ML Ranker\n(interest,\nrecency,\nrelationship)', 'orange')
    n(g, 'hydrate', 'Hydration\n(profiles,\nmedia URLs,\nlikes count)', 'teal')
    n(g, 'ads', 'Ad Server\n(insert\nsponsored)', 'yellow')
    n(g, 'render', 'Return\nRanked Feed\n+ Stories', 'green')
    e(g, 'user', 'feed', '1 GET /feed', '#ec4899')
    e(g, 'feed', 'cache', '2 fetch\npre-built', '#ef4444')
    e(g, 'cache', 'rank', '3 ML rank\n~500 posts', '#f97316')
    e(g, 'rank', 'hydrate', '4 enrich\nmetadata', '#14b8a6')
    e(g, 'hydrate', 'ads', '5 insert\nads', '#f59e0b')
    e(g, 'ads', 'render', '6 return\nfeed', '#22c55e')
    g.render(path, cleanup=True)
    print(f'  OK {path}.png')

if __name__ == '__main__':
    print('Generating flow diagrams...')
    tinder_swipe()
    tinder_recs()
    twitter_post()
    twitter_read()
    instagram_post()
    instagram_feed()
    print('Done! 6 diagrams generated.')
