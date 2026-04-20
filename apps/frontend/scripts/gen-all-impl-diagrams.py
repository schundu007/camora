#!/usr/bin/env python3
"""Generate ALL basic/advanced implementation diagrams for every system design topic."""
import graphviz, os

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams')
NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue', fontsize='11', penwidth='1.5', height='0.4', margin='0.12,0.06')
EDGE = dict(fontname='Helvetica Neue', fontsize='9', penwidth='1.5')
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
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.5', ranksep='0.6', splines='spline',
           label=f'  {title}  ', labelloc='t', fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b', **kw)
    return g, os.path.join(out, name)

def gen(topic_dir, name, title, nodes, edges, **kw):
    """Generic diagram generator."""
    OUT = os.path.join(BASE, topic_dir)
    g, path = mk(OUT, name, title, **kw)
    for nd in nodes: n(g, nd[0], nd[1], nd[2])
    for ed in edges: e(g, ed[0], ed[1], ed[2] if len(ed) > 2 else '', ed[3] if len(ed) > 3 else '#475569', ed[4] if len(ed) > 4 else 'solid')
    g.render(path, cleanup=True)
    print(f'  OK {topic_dir}/{name}.png')

# Helper for common patterns
LR = dict(rankdir='LR')
TB = dict(rankdir='TB')

# ═══════════════════════════════════════
# URL SHORTENER
# ═══════════════════════════════════════
gen('url-shortener', 'impl-basic', 'Basic URL Shortener',
    [('client','Client\nPOST /url','blue'),('api','API Server','gray'),('db','Database\n(single)','purple'),('resp','Short URL\nResponse','green')],
    [('client','api','POST','#3b82f6'),('api','db','generate\nBase62 ID','#6366f1'),('db','resp','return','#22c55e')], **LR)

gen('url-shortener', 'impl-advanced', 'Production URL Shortener',
    [('client','Client','blue'),('lb','Load\nBalancer','gray'),('api','API Service\n(Base62)','purple'),('cache','Redis\nCache\n(95% hit)','red'),('db','MySQL\n(sharded)','teal'),('analytics','Analytics\n(Kafka)','orange'),('cdn','CDN\n(301 redirect)','green')],
    [('client','lb','request','#3b82f6'),('lb','api','route','#6b7280'),('api','cache','lookup','#ef4444'),('cache','cdn','hit: redirect','#22c55e'),('api','db','miss: query','#6366f1'),('api','analytics','log click','#f97316','dashed'),('db','cache','backfill','#ef4444','dashed')], **LR)

# ═══════════════════════════════════════
# UBER
# ═══════════════════════════════════════
gen('uber', 'impl-basic', 'Basic Ride Sharing',
    [('rider','Rider\nApp','blue'),('server','App Server','gray'),('postgis','PostgreSQL\n+ PostGIS','purple'),('driver','Driver\nApp','green')],
    [('rider','server','request\nride','#3b82f6'),('server','postgis','find nearby\ndrivers','#6366f1'),('server','driver','notify\nclosest','#22c55e')], **LR)

gen('uber', 'impl-advanced', 'Cell-Based Ride Architecture',
    [('rider','Rider','blue'),('api','API\nGateway','gray'),('trip','Trip\nService','purple'),('geo','Geospatial\nIndex\n(H3 cells)','teal'),('match','Matching\nService','orange'),('driver','Driver\nLocation\n(Redis)','red'),('kafka','Kafka\n(events)','yellow'),('price','Dynamic\nPricing','pink'),('eta','ETA\nService','green')],
    [('rider','api','request','#3b82f6'),('api','trip','create','#6366f1'),('trip','geo','query\ncell','#14b8a6'),('geo','match','candidates','#f97316'),('match','driver','assign','#ef4444'),('trip','kafka','events','#f59e0b','dashed'),('api','price','surge\ncalc','#ec4899','dashed'),('match','eta','compute','#22c55e','dashed')], **LR)

# ═══════════════════════════════════════
# YOUTUBE
# ═══════════════════════════════════════
gen('youtube', 'impl-basic', 'Basic Video Streaming',
    [('user','User\nuploads','blue'),('server','App Server','gray'),('storage','File Storage\n(disk)','purple'),('db','Database\n(metadata)','teal'),('viewer','Viewer\nstreams','green')],
    [('user','server','upload','#3b82f6'),('server','storage','save raw\nvideo','#6366f1'),('server','db','save\nmetadata','#14b8a6'),('viewer','server','GET video','#22c55e'),('server','storage','stream','#6366f1','dashed')], **LR)

gen('youtube', 'impl-advanced', 'Production YouTube Architecture',
    [('user','Creator\nuploads','blue'),('api','API\nGateway','gray'),('transcode','Transcoding\nPipeline\n(FFmpeg farm)','orange'),('s3','Object Store\n(S3)','purple'),('cdn','CDN\n(global edge)','green'),('db','Metadata DB\n(Vitess)','teal'),('search','Search\n(Elasticsearch)','yellow'),('rec','Recommendation\nEngine (ML)','pink'),('viewer','Viewer','blue')],
    [('user','api','upload','#3b82f6'),('api','transcode','encode\n360p-4K','#f97316'),('transcode','s3','store all\nresolutions','#6366f1'),('s3','cdn','distribute','#22c55e'),('api','db','metadata','#14b8a6'),('db','search','index','#f59e0b','dashed'),('db','rec','feed ML','#ec4899','dashed'),('viewer','cdn','stream ABR','#22c55e')], **LR)

# ═══════════════════════════════════════
# DROPBOX
# ═══════════════════════════════════════
gen('dropbox', 'impl-basic', 'Basic File Sync',
    [('client','Desktop\nClient','blue'),('server','Sync Server','gray'),('storage','File Storage','purple'),('db','Metadata DB','teal')],
    [('client','server','upload\nfull file','#3b82f6'),('server','storage','store','#6366f1'),('server','db','save\nmetadata','#14b8a6'),('server','client','notify\nother devices','#22c55e','dashed')], **LR)

gen('dropbox', 'impl-advanced', 'Production Dropbox Architecture',
    [('client','Desktop Client\n(chunking +\ndedup)','blue'),('api','API\nGateway','gray'),('chunk','Block Server\n(4MB chunks)','purple'),('s3','S3\n(content-\naddressed)','teal'),('meta','Metadata\nService','orange'),('notify','Notification\nService\n(long-poll)','yellow'),('sync','Sync Service\n(conflict\nresolution)','green'),('other','Other\nDevices','blue')],
    [('client','api','upload\nchunks','#3b82f6'),('api','chunk','store\nnew blocks','#6366f1'),('chunk','s3','dedup\nwrite','#14b8a6'),('api','meta','update\nfile tree','#f97316'),('meta','notify','broadcast\nchange','#f59e0b'),('notify','sync','resolve\nconflicts','#22c55e'),('sync','other','push\nupdates','#3b82f6','dashed')], **LR)

# ═══════════════════════════════════════
# NETFLIX
# ═══════════════════════════════════════
gen('netflix', 'impl-basic', 'Basic Video Platform',
    [('user','User','blue'),('server','App Server','gray'),('files','Video Files\n(local)','purple'),('db','PostgreSQL\n(catalog)','teal')],
    [('user','server','browse +\nstream','#3b82f6'),('server','db','query\ncatalog','#14b8a6'),('server','files','stream\nvideo','#6366f1')], **LR)

gen('netflix', 'impl-advanced', 'Production Netflix Architecture',
    [('user','User\nDevice','blue'),('api','API Gateway\n(Zuul)','gray'),('catalog','Catalog\nService','purple'),('rec','Recommendation\nEngine\n(ML)','orange'),('cdn','Open Connect\nCDN\n(global edge)','green'),('transcode','Transcoding\nPipeline','yellow'),('s3','S3\n(master\ncopies)','teal'),('chaos','Chaos\nMonkey','red')],
    [('user','api','browse','#3b82f6'),('api','catalog','query','#6366f1'),('api','rec','personalize','#f97316'),('user','cdn','stream\nABR','#22c55e'),('s3','transcode','encode','#f59e0b'),('transcode','cdn','distribute','#22c55e'),('chaos','api','test\nresilience','#ef4444','dashed')], **LR)

# ═══════════════════════════════════════
# E-COMMERCE (Amazon)
# ═══════════════════════════════════════
gen('ecommerce-platform', 'impl-basic', 'Basic E-Commerce',
    [('user','User','blue'),('server','Monolith\nServer','gray'),('db','Database\n(single)','purple'),('payment','Payment\nGateway','green')],
    [('user','server','browse +\norder','#3b82f6'),('server','db','products +\norders','#6366f1'),('server','payment','charge','#22c55e')], **LR)

gen('ecommerce-platform', 'impl-advanced', 'Production E-Commerce Platform',
    [('user','User','blue'),('api','API Gateway','gray'),('catalog','Product\nCatalog\n(Elasticsearch)','purple'),('cart','Cart Service\n(Redis)','red'),('order','Order\nService','orange'),('inventory','Inventory\n(distributed\nlock)','teal'),('payment','Payment\nService\n(Stripe)','green'),('kafka','Kafka\n(events)','yellow'),('warehouse','Warehouse\nFulfillment','pink')],
    [('user','api','request','#3b82f6'),('api','catalog','search +\nbrowse','#6366f1'),('api','cart','add/remove','#ef4444'),('cart','order','checkout','#f97316'),('order','inventory','reserve','#14b8a6'),('order','payment','charge','#22c55e'),('order','kafka','events','#f59e0b','dashed'),('kafka','warehouse','fulfill','#ec4899','dashed')], **LR)

# ═══════════════════════════════════════
# GOOGLE DOCS
# ═══════════════════════════════════════
gen('google-docs', 'impl-basic', 'Basic Collaborative Editor',
    [('user','User A\nedits','blue'),('server','Server\n(last-write-wins)','gray'),('db','Database','purple'),('userb','User B\nsees update','blue')],
    [('user','server','send edit','#3b82f6'),('server','db','overwrite','#6366f1'),('server','userb','broadcast','#22c55e','dashed')], **LR)

gen('google-docs', 'impl-advanced', 'Production Collaborative Editor (OT)',
    [('usera','User A','blue'),('ws','WebSocket\nGateway','gray'),('ot','OT Engine\n(transform\nops)','purple'),('doc','Document\nService','teal'),('redis','Redis\n(active\ncursors)','red'),('storage','Cloud Storage\n(revisions)','green'),('userb','User B','blue')],
    [('usera','ws','send op','#3b82f6'),('ws','ot','transform\nagainst\nconcurrent','#6366f1'),('ot','doc','apply','#14b8a6'),('doc','storage','save\nrevision','#22c55e'),('ot','redis','update\ncursors','#ef4444'),('ws','userb','broadcast\ntransformed\nop','#3b82f6','dashed')], **LR)

# ═══════════════════════════════════════
# SEARCH ENGINE
# ═══════════════════════════════════════
gen('search-engine', 'impl-basic', 'Basic Search Engine',
    [('user','User\nquery','blue'),('server','App Server','gray'),('index','Inverted\nIndex\n(single node)','purple'),('results','Ranked\nResults','green')],
    [('user','server','search','#3b82f6'),('server','index','lookup\nterms','#6366f1'),('index','results','TF-IDF\nranking','#22c55e')], **LR)

gen('search-engine', 'impl-advanced', 'Production Search Engine',
    [('user','User','blue'),('lb','Load\nBalancer','gray'),('query','Query\nParser\n(NLP)','purple'),('index','Distributed\nIndex\n(sharded)','teal'),('rank','ML Ranker\n(BERT +\nPageRank)','orange'),('cache','Result Cache\n(Redis)','red'),('crawler','Web Crawler\n(continuous)','yellow'),('spell','Spell Check\n+ Suggest','green')],
    [('user','lb','query','#3b82f6'),('lb','cache','check\ncache','#ef4444'),('lb','query','parse +\ntokenize','#6366f1'),('query','spell','suggest','#22c55e'),('query','index','fan-out\nto shards','#14b8a6'),('index','rank','merge +\nrank','#f97316'),('crawler','index','update\nindex','#f59e0b','dashed')], **LR)

# ═══════════════════════════════════════
# NOTIFICATION SYSTEM
# ═══════════════════════════════════════
gen('notification-system', 'impl-basic', 'Basic Notification System',
    [('trigger','Event\nTrigger','blue'),('server','Notification\nServer','gray'),('db','Database\n(queue)','purple'),('push','Push Service\n(APNs/FCM)','green')],
    [('trigger','server','send','#3b82f6'),('server','db','persist','#6366f1'),('server','push','deliver','#22c55e')], **LR)

gen('notification-system', 'impl-advanced', 'Production Notification Architecture',
    [('trigger','Event\nSource','blue'),('kafka','Kafka\n(event bus)','orange'),('router','Routing\nService\n(preferences)','purple'),('template','Template\nEngine','teal'),('rate','Rate Limiter\n(per user)','red'),('push','Push (APNs\n/FCM)','green'),('email','Email\n(SES)','yellow'),('sms','SMS\n(Twilio)','pink'),('inbox','In-App\nInbox','cyan')],
    [('trigger','kafka','publish','#f97316'),('kafka','router','consume','#6366f1'),('router','template','render','#14b8a6'),('template','rate','throttle','#ef4444'),('rate','push','mobile','#22c55e'),('rate','email','email','#f59e0b'),('rate','sms','sms','#ec4899'),('rate','inbox','in-app','#06b6d4')], **LR)

# ═══════════════════════════════════════
# RATE LIMITER
# ═══════════════════════════════════════
gen('rate-limiter', 'impl-basic', 'Basic Rate Limiter',
    [('client','Client\nRequest','blue'),('limiter','Rate Limiter\n(in-memory\ncounter)','purple'),('api','API Server','green'),('reject','429 Too\nMany Requests','red')],
    [('client','limiter','check','#3b82f6'),('limiter','api','allow','#22c55e'),('limiter','reject','deny','#ef4444','dashed')], **LR)

gen('rate-limiter', 'impl-advanced', 'Distributed Rate Limiter',
    [('client','Client','blue'),('lb','Load\nBalancer','gray'),('limiter','Rate Limiter\nMiddleware','purple'),('redis','Redis Cluster\n(token bucket\nper key)','red'),('api','API\nServer','green'),('kafka','Kafka\n(analytics)','orange')],
    [('client','lb','request','#3b82f6'),('lb','limiter','check','#6b7280'),('limiter','redis','EVAL lua\ntoken bucket','#ef4444'),('limiter','api','allow\n(within limit)','#22c55e'),('limiter','kafka','log rate\ndata','#f97316','dashed')], **LR)

# ═══════════════════════════════════════
# TICKETMASTER
# ═══════════════════════════════════════
gen('ticketmaster', 'impl-basic', 'Basic Ticket Booking',
    [('user','User\nselects seat','blue'),('server','App Server','gray'),('db','Database\n(row lock)','purple'),('payment','Payment','green')],
    [('user','server','book','#3b82f6'),('server','db','SELECT FOR\nUPDATE','#6366f1'),('server','payment','charge','#22c55e')], **LR)

gen('ticketmaster', 'impl-advanced', 'Production Ticket Platform',
    [('user','User','blue'),('api','API Gateway','gray'),('queue','Virtual Queue\n(waiting room)','orange'),('seat','Seat Map\nService','purple'),('redis','Redis\n(seat locks\n+ inventory)','red'),('order','Order\nService','teal'),('payment','Payment\n(Stripe)','green'),('kafka','Kafka\n(events)','yellow')],
    [('user','api','request','#3b82f6'),('api','queue','throttle\nonSale burst','#f97316'),('queue','seat','show\navailable','#6366f1'),('seat','redis','temp lock\nseat (5 min)','#ef4444'),('redis','order','confirm\nbooking','#14b8a6'),('order','payment','charge','#22c55e'),('order','kafka','emit\nevent','#f59e0b','dashed')], **LR)

# ═══════════════════════════════════════
# TYPEAHEAD / AUTOCOMPLETE
# ═══════════════════════════════════════
gen('typeahead', 'impl-basic', 'Basic Typeahead',
    [('user','User\ntypes','blue'),('server','Server','gray'),('trie','Trie\n(in-memory)','purple'),('results','Top 10\nSuggestions','green')],
    [('user','server','prefix','#3b82f6'),('server','trie','search','#6366f1'),('trie','results','ranked\nmatches','#22c55e')], **LR)

gen('typeahead', 'impl-advanced', 'Production Autocomplete',
    [('user','User\ntypes','blue'),('cdn','CDN Edge\n(cached\nprefixes)','green'),('api','API\nService','gray'),('trie','Distributed\nTrie\n(sharded)','purple'),('redis','Redis\n(hot prefix\ncache)','red'),('analytics','Analytics\n(trending\nqueries)','orange'),('ml','ML Ranker\n(personalize)','yellow')],
    [('user','cdn','1-2 char\nprefixes','#22c55e'),('user','api','3+ char','#3b82f6'),('api','redis','cache\ncheck','#ef4444'),('api','trie','trie\nlookup','#6366f1'),('trie','ml','rank by\nuser context','#f59e0b'),('analytics','trie','update\nweights','#f97316','dashed')], **LR)

# ═══════════════════════════════════════
# CHAT / MESSAGING
# ═══════════════════════════════════════
gen('chat-system', 'impl-basic', 'Basic Chat System',
    [('sender','Sender','blue'),('server','Chat Server\n(single)','gray'),('db','Database','purple'),('receiver','Receiver','blue')],
    [('sender','server','send msg','#3b82f6'),('server','db','persist','#6366f1'),('server','receiver','deliver','#22c55e')], **LR)

gen('chat-system', 'impl-advanced', 'Distributed Chat Architecture',
    [('sender','Sender','blue'),('gateway','WS Gateway\n(stateful)','gray'),('chat','Chat Service\n(stateless)','purple'),('kafka','Kafka\n(message bus)','orange'),('cassandra','Cassandra\n(messages)','teal'),('presence','Presence\n(Redis)','red'),('push','Push Service','yellow'),('receiver','Receiver','blue')],
    [('sender','gateway','WebSocket','#3b82f6'),('gateway','chat','process','#6366f1'),('chat','kafka','publish','#f97316'),('kafka','cassandra','persist','#14b8a6'),('chat','presence','check\nonline?','#ef4444'),('gateway','receiver','WS deliver','#3b82f6'),('chat','push','offline\nnotify','#f59e0b','dashed')], **LR)

# ═══════════════════════════════════════
# PASTEBIN
# ═══════════════════════════════════════
gen('pastebin', 'impl-basic', 'Basic Pastebin',
    [('user','User\npastes text','blue'),('server','Server','gray'),('db','Database\n(text blob)','purple'),('link','Short Link\nResponse','green')],
    [('user','server','POST','#3b82f6'),('server','db','store\ncontent','#6366f1'),('server','link','return\nURL','#22c55e')], **LR)

gen('pastebin', 'impl-advanced', 'Production Pastebin',
    [('user','User','blue'),('api','API Service','gray'),('kgs','Key Gen\nService\n(pre-computed)','purple'),('s3','S3\n(content)','teal'),('cache','Redis Cache','red'),('cdn','CDN','green'),('cleanup','Expiry\nWorker','orange')],
    [('user','api','create','#3b82f6'),('api','kgs','get unique\nkey','#6366f1'),('api','s3','store\ncontent','#14b8a6'),('api','cache','cache hot\npastes','#ef4444'),('cache','cdn','serve','#22c55e'),('cleanup','s3','delete\nexpired','#f97316','dashed')], **LR)

# ═══════════════════════════════════════
# GOOGLE MAPS
# ═══════════════════════════════════════
gen('google-maps', 'impl-basic', 'Basic Mapping System',
    [('user','User\nrequest','blue'),('server','Server','gray'),('graph','Road Graph\n(adjacency\nlist)','purple'),('dijkstra','Dijkstra\nShortest\nPath','green')],
    [('user','server','route\nA → B','#3b82f6'),('server','graph','load\ngraph','#6366f1'),('graph','dijkstra','compute','#22c55e')], **LR)

gen('google-maps', 'impl-advanced', 'Production Maps Platform',
    [('user','User','blue'),('api','API Gateway','gray'),('tiles','Tile Server\n(vector tiles)','purple'),('route','Routing\nEngine\n(contraction\nhierarchies)','orange'),('traffic','Live Traffic\n(GPS probes)','red'),('geo','Geocoding\n(address ↔\ncoords)','teal'),('search','Places\nSearch\n(POI)','green'),('cdn','CDN\n(map tiles)','yellow')],
    [('user','api','request','#3b82f6'),('api','tiles','load map','#6366f1'),('tiles','cdn','cache\ntiles','#f59e0b'),('api','route','navigate','#f97316'),('traffic','route','adjust\nETA','#ef4444'),('api','geo','geocode','#14b8a6'),('api','search','find\nplaces','#22c55e')], **LR)

# ═══════════════════════════════════════
# NEWS AGGREGATOR
# ═══════════════════════════════════════
gen('news-aggregator', 'impl-basic', 'Basic News Aggregator',
    [('feeds','RSS Feeds','blue'),('crawler','Crawler\n(polling)','gray'),('db','Database','purple'),('user','User\nbrowses','green')],
    [('feeds','crawler','poll\nevery hour','#3b82f6'),('crawler','db','store\narticles','#6366f1'),('user','db','query\nrecent','#22c55e')], **LR)

gen('news-aggregator', 'impl-advanced', 'Production News Platform',
    [('feeds','RSS/API\nSources','blue'),('crawler','Distributed\nCrawler','gray'),('dedup','Dedup\nService\n(SimHash)','purple'),('nlp','NLP Pipeline\n(classify,\nsummarize)','orange'),('es','Elasticsearch\n(search)','teal'),('feed','Feed Service\n(personalized)','green'),('cache','Redis\nCache','red'),('user','User','blue')],
    [('feeds','crawler','crawl','#3b82f6'),('crawler','dedup','filter\nduplicates','#6366f1'),('dedup','nlp','classify +\nsummarize','#f97316'),('nlp','es','index','#14b8a6'),('es','feed','personalize','#22c55e'),('feed','cache','cache hot\nstories','#ef4444'),('user','cache','read','#ef4444')], **LR)

# ═══════════════════════════════════════
# HOTEL BOOKING (Airbnb)
# ═══════════════════════════════════════
gen('airbnb', 'impl-basic', 'Basic Property Listing',
    [('host','Host\nlists','blue'),('server','Server','gray'),('db','Database','purple'),('guest','Guest\nsearches','green')],
    [('host','server','create\nlisting','#3b82f6'),('server','db','store','#6366f1'),('guest','server','search\nby location','#22c55e'),('server','db','query','#6366f1','dashed')], **LR)

gen('airbnb', 'impl-advanced', 'Production Airbnb Architecture',
    [('guest','Guest','blue'),('api','API Gateway','gray'),('search','Search\nService\n(Elasticsearch)','purple'),('geo','Geo Index\n(S2 cells)','teal'),('pricing','Dynamic\nPricing\n(ML)','orange'),('booking','Booking\nService','green'),('payment','Payment\n(escrow)','yellow'),('review','Review\nService','pink'),('host','Host','blue')],
    [('guest','api','search','#3b82f6'),('api','search','query','#6366f1'),('search','geo','location\nfilter','#14b8a6'),('search','pricing','price\nadjust','#f97316'),('guest','booking','reserve','#22c55e'),('booking','payment','escrow','#f59e0b'),('guest','review','rate','#ec4899','dashed'),('host','api','manage\nlisting','#3b82f6')], **LR)

# ═══════════════════════════════════════
# HOTEL BOOKING
# ═══════════════════════════════════════
gen('hotel-booking', 'impl-basic', 'Basic Hotel Booking',
    [('user','User','blue'),('server','Server','gray'),('db','Database\n(rooms)','purple'),('payment','Payment','green')],
    [('user','server','search +\nbook','#3b82f6'),('server','db','check\navailability','#6366f1'),('server','payment','charge','#22c55e')], **LR)

gen('hotel-booking', 'impl-advanced', 'Production Booking Platform',
    [('user','User','blue'),('api','API Gateway','gray'),('search','Search\n(Elasticsearch)','purple'),('inventory','Inventory\nService\n(Redis lock)','red'),('booking','Booking\nService','teal'),('payment','Payment\n(idempotent)','green'),('notify','Notifications','orange'),('partner','Partner\nAPI\n(channel mgr)','yellow')],
    [('user','api','search','#3b82f6'),('api','search','query','#6366f1'),('api','inventory','check +\nlock','#ef4444'),('inventory','booking','confirm','#14b8a6'),('booking','payment','charge','#22c55e'),('booking','notify','confirm\nemail','#f97316'),('partner','inventory','sync\navailability','#f59e0b','dashed')], **LR)

# ═══════════════════════════════════════
# WEB CRAWLER
# ═══════════════════════════════════════
gen('web-crawler', 'impl-basic', 'Basic Web Crawler',
    [('seed','Seed URLs','blue'),('crawler','Crawler\n(single thread)','gray'),('parser','HTML Parser','purple'),('storage','Storage','green'),('queue','URL Queue','orange')],
    [('seed','queue','init','#3b82f6'),('queue','crawler','dequeue','#6b7280'),('crawler','parser','parse\nHTML','#6366f1'),('parser','storage','store\ncontent','#22c55e'),('parser','queue','extract\nnew URLs','#f97316')], **LR)

gen('web-crawler', 'impl-advanced', 'Production Web Crawler',
    [('seed','Seed URLs','blue'),('frontier','URL Frontier\n(priority\nqueue)','orange'),('dns','DNS\nResolver\n(cache)','gray'),('fetch','Fetcher Farm\n(distributed)','purple'),('robots','robots.txt\nChecker','red'),('dedup','URL Dedup\n(Bloom filter)','teal'),('parser','Content\nParser','green'),('storage','Distributed\nStorage','yellow')],
    [('seed','frontier','init','#3b82f6'),('frontier','robots','check\npoliteness','#ef4444'),('robots','dns','resolve','#6b7280'),('dns','fetch','GET page','#6366f1'),('fetch','dedup','check\nseen?','#14b8a6'),('fetch','parser','extract','#22c55e'),('parser','storage','store','#f59e0b'),('parser','frontier','new URLs','#f97316','dashed')], **LR)

# ═══════════════════════════════════════
# KEY-VALUE STORE
# ═══════════════════════════════════════
gen('key-value-store', 'impl-basic', 'Basic Key-Value Store',
    [('client','Client','blue'),('server','Server\n(in-memory\nHashMap)','gray'),('wal','Write-Ahead\nLog (disk)','purple')],
    [('client','server','GET/PUT','#3b82f6'),('server','wal','persist\non write','#6366f1')], **LR)

gen('key-value-store', 'impl-advanced', 'Distributed KV Store',
    [('client','Client','blue'),('router','Router\n(consistent\nhashing)','gray'),('node1','Node 1\n(LSM-Tree)','purple'),('node2','Node 2\n(replica)','purple'),('node3','Node 3\n(replica)','purple'),('gossip','Gossip\nProtocol','orange'),('compact','Compaction\nWorker','teal')],
    [('client','router','hash key','#3b82f6'),('router','node1','route to\nowner','#6366f1'),('node1','node2','replicate','#6366f1','dashed'),('node1','node3','replicate','#6366f1','dashed'),('gossip','node1','membership','#f97316','dashed'),('compact','node1','merge\nSSTables','#14b8a6','dashed')], **LR)

# ═══════════════════════════════════════
# UNIQUE ID GENERATOR
# ═══════════════════════════════════════
gen('unique-id-generator', 'impl-basic', 'Single Server ID Generator',
    [('client','Client','blue'),('server','Server\n(auto-increment)','gray'),('db','Database\n(sequence)','purple')],
    [('client','server','get ID','#3b82f6'),('server','db','next\nsequence','#6366f1')], **LR)

gen('unique-id-generator', 'impl-advanced', 'Distributed Snowflake Service',
    [('client','Client','blue'),('lb','Load\nBalancer','gray'),('gen1','ID Generator\n(worker 1)','purple'),('gen2','ID Generator\n(worker 2)','purple'),('gen3','ID Generator\n(worker 3)','purple'),('zk','ZooKeeper\n(worker\nregistration)','orange')],
    [('client','lb','request','#3b82f6'),('lb','gen1','route','#6366f1'),('lb','gen2','route','#6366f1'),('lb','gen3','route','#6366f1'),('zk','gen1','assign\nworker ID','#f97316','dashed'),('zk','gen2','assign','#f97316','dashed')], **LR)

# ═══════════════════════════════════════
# SPOTIFY
# ═══════════════════════════════════════
gen('spotify', 'impl-basic', 'Basic Music Streaming',
    [('user','User','blue'),('server','Server','gray'),('storage','Audio Files','purple'),('db','Database\n(catalog)','teal')],
    [('user','server','play\nsong','#3b82f6'),('server','db','lookup\ntrack','#14b8a6'),('server','storage','stream\naudio','#6366f1')], **LR)

gen('spotify', 'impl-advanced', 'Production Spotify Architecture',
    [('user','User','blue'),('api','API Gateway','gray'),('catalog','Music Catalog\n(Cassandra)','purple'),('rec','Recommendation\n(collaborative\nfiltering)','orange'),('cdn','CDN\n(audio edge)','green'),('transcode','Audio\nTranscoding\n(Ogg Vorbis)','yellow'),('search','Search\n(Elasticsearch)','teal'),('social','Social\n(friend\nactivity)','pink')],
    [('user','api','request','#3b82f6'),('api','catalog','browse','#6366f1'),('api','rec','Discover\nWeekly','#f97316'),('user','cdn','stream\naudio','#22c55e'),('api','search','search','#14b8a6'),('api','social','friend\nfeed','#ec4899','dashed'),('transcode','cdn','distribute','#22c55e','dashed')], **LR)

# ═══════════════════════════════════════
# YELP
# ═══════════════════════════════════════
gen('yelp', 'impl-basic', 'Basic Yelp Architecture',
    [('user','User\nsearches','blue'),('server','Server','gray'),('db','Database\n(PostGIS)','purple'),('results','Nearby\nResults','green')],
    [('user','server','search\nnearby','#3b82f6'),('server','db','geo query','#6366f1'),('db','results','ranked','#22c55e')], **LR)

gen('yelp', 'impl-advanced', 'Production Yelp Architecture',
    [('user','User','blue'),('api','API Gateway','gray'),('geo','Geospatial\nIndex\n(QuadTree)','purple'),('search','Search\n(Elasticsearch)','teal'),('review','Review\nService','orange'),('photo','Photo CDN','green'),('cache','Redis\nCache','red'),('ml','ML Ranker\n(relevance)','yellow')],
    [('user','api','search','#3b82f6'),('api','geo','location\nquery','#6366f1'),('api','search','text\nquery','#14b8a6'),('geo','ml','rank','#f59e0b'),('api','review','reviews','#f97316'),('api','photo','photos','#22c55e'),('api','cache','cache','#ef4444','dashed')], **LR)

# ═══════════════════════════════════════
# FACEBOOK NEWSFEED
# ═══════════════════════════════════════
gen('facebook-newsfeed', 'impl-basic', 'Basic News Feed',
    [('user','User\nposts','blue'),('server','Server','gray'),('db','Database','purple'),('reader','Reader\n(pull feed)','green')],
    [('user','server','post','#3b82f6'),('server','db','store','#6366f1'),('reader','server','GET feed\n(query on\nread)','#22c55e')], **LR)

gen('facebook-newsfeed', 'impl-advanced', 'Production Facebook Feed',
    [('user','User','blue'),('api','API Gateway','gray'),('fanout','Fan-out\nService\n(push to\nfriends)','orange'),('redis','Redis\n(feed cache)','red'),('rank','ML Ranker\n(EdgeRank)','yellow'),('ads','Ad Server','pink'),('tao','TAO Cache\n(social graph)','teal'),('reader','Reader','blue')],
    [('user','api','post','#3b82f6'),('api','fanout','push to\nfriend feeds','#f97316'),('fanout','redis','write to\ncached feeds','#ef4444'),('reader','redis','GET feed','#ef4444'),('redis','rank','ML rank','#f59e0b'),('rank','ads','insert ads','#ec4899'),('api','tao','social\ngraph','#14b8a6','dashed')], **LR)

# ═══════════════════════════════════════
# LINKEDIN
# ═══════════════════════════════════════
gen('linkedin', 'impl-basic', 'Basic Professional Network',
    [('user','User','blue'),('server','Server','gray'),('db','Database','purple'),('search','Search\n(SQL LIKE)','green')],
    [('user','server','profile +\nconnect','#3b82f6'),('server','db','store','#6366f1'),('user','search','search\npeople','#22c55e')], **LR)

gen('linkedin', 'impl-advanced', 'Production LinkedIn Architecture',
    [('user','User','blue'),('api','API Gateway','gray'),('graph','Graph Store\n(100B+ edges\nin-memory)','purple'),('feed','Feed Service\n(Samza)','orange'),('es','Elasticsearch\n(search)','teal'),('kafka','Kafka\n(events)','yellow'),('jobs','Job Rec\nEngine\n(ML)','green'),('espresso','Espresso\n(profiles)','red')],
    [('user','api','request','#3b82f6'),('api','graph','connections\nquery','#6366f1'),('api','feed','news feed','#f97316'),('api','es','search','#14b8a6'),('api','jobs','job recs','#22c55e'),('api','espresso','profile','#ef4444'),('feed','kafka','events','#f59e0b','dashed')], **LR)

# ═══════════════════════════════════════
# DOORDASH
# ═══════════════════════════════════════
gen('doordash', 'impl-basic', 'Basic Food Delivery',
    [('user','User\norders','blue'),('server','Server','gray'),('db','Database','purple'),('driver','Driver\nassigned','green')],
    [('user','server','place\norder','#3b82f6'),('server','db','store\norder','#6366f1'),('server','driver','notify\nnearest','#22c55e')], **LR)

gen('doordash', 'impl-advanced', 'Production Food Delivery',
    [('user','User','blue'),('api','API Gateway','gray'),('order','Order\nService','purple'),('dispatch','Dispatch\nOptimizer\n(ML)','orange'),('driver','Driver\nLocation\n(Redis)','red'),('merchant','Merchant\nService','teal'),('eta','ETA\nService','green'),('payment','Payment','yellow'),('kafka','Kafka','pink')],
    [('user','api','order','#3b82f6'),('api','order','create','#6366f1'),('order','dispatch','assign\ndriver','#f97316'),('dispatch','driver','optimize\nroute','#ef4444'),('order','merchant','notify\nrestaurant','#14b8a6'),('dispatch','eta','compute','#22c55e'),('order','payment','charge','#f59e0b'),('order','kafka','events','#ec4899','dashed')], **LR)

# ═══════════════════════════════════════
# LEADERBOARD
# ═══════════════════════════════════════
gen('leaderboard', 'impl-basic', 'Basic Redis Leaderboard',
    [('user','User\nscores','blue'),('server','Server','gray'),('redis','Redis\nSorted Set','red'),('board','Leaderboard\nResult','green')],
    [('user','server','submit\nscore','#3b82f6'),('server','redis','ZADD','#ef4444'),('server','redis','ZREVRANGE\ntop N','#ef4444'),('redis','board','ranked\nlist','#22c55e')], **LR)

gen('leaderboard', 'impl-advanced', 'Production Leaderboard',
    [('user','User','blue'),('api','API Gateway','gray'),('score','Score\nService','purple'),('redis','Redis Cluster\n(sharded by\ngame/region)','red'),('cache','CDN Cache\n(top 100)','green'),('batch','Batch Job\n(daily/weekly\nreset)','orange'),('kafka','Kafka\n(score events)','yellow')],
    [('user','api','submit','#3b82f6'),('api','score','validate','#6366f1'),('score','redis','ZADD +\nZREVRANK','#ef4444'),('redis','cache','cache\ntop 100','#22c55e'),('score','kafka','event','#f59e0b','dashed'),('batch','redis','reset\nperiodic','#f97316','dashed')], **LR)

# ═══════════════════════════════════════
# TWITTER TRENDS
# ═══════════════════════════════════════
gen('twitter-trends', 'impl-basic', 'Basic Trending Topics',
    [('tweets','Tweet\nStream','blue'),('counter','Counter\n(in-memory)','gray'),('sort','Sort by\nCount','purple'),('display','Top 10\nTrends','green')],
    [('tweets','counter','count\nhashtags','#3b82f6'),('counter','sort','rank','#6366f1'),('sort','display','top 10','#22c55e')], **LR)

gen('twitter-trends', 'impl-advanced', 'Production Twitter Trends',
    [('firehose','Tweet\nFirehose','blue'),('kafka','Kafka\n(stream)','orange'),('flink','Flink\n(sliding\nwindow)','purple'),('cms','Count-Min\nSketch\n(approx count)','teal'),('heap','Min-Heap\n(top K)','red'),('redis','Redis\n(regional\ntrends)','green'),('api','Trends API','yellow')],
    [('firehose','kafka','ingest','#f97316'),('kafka','flink','process\nwindow','#6366f1'),('flink','cms','approx\ncount','#14b8a6'),('cms','heap','maintain\ntop K','#ef4444'),('heap','redis','store per\nregion','#22c55e'),('redis','api','serve','#f59e0b')], **LR)

# ═══════════════════════════════════════
# PAYMENT GATEWAY
# ═══════════════════════════════════════
gen('payment-system', 'impl-basic', 'Basic Payment System',
    [('user','User\npays','blue'),('server','Server','gray'),('stripe','Payment\nProvider','green'),('db','Database','purple')],
    [('user','server','checkout','#3b82f6'),('server','stripe','charge','#22c55e'),('server','db','record\ntransaction','#6366f1')], **LR)

gen('payment-system', 'impl-advanced', 'Production Payment Architecture',
    [('user','User','blue'),('api','API Gateway\n(idempotency\nkey)','gray'),('order','Order\nService','purple'),('payment','Payment\nService\n(saga)','orange'),('ledger','Double-Entry\nLedger','teal'),('provider','Payment\nProvider\n(Stripe)','green'),('webhook','Webhook\nHandler','yellow'),('kafka','Kafka\n(events)','red')],
    [('user','api','checkout','#3b82f6'),('api','order','create','#6366f1'),('order','payment','initiate\npayment','#f97316'),('payment','provider','charge','#22c55e'),('provider','webhook','async\nresult','#f59e0b'),('webhook','ledger','record\ndebit/credit','#14b8a6'),('payment','kafka','event','#ef4444','dashed')], **LR)

print(f'\nDone! Generated diagrams for all topics.')

if __name__ == '__main__':
    print('Generating ALL implementation diagrams...\n')
    # Count
    import inspect
    funcs = [name for name, obj in inspect.getmembers(__import__(__name__)) if callable(obj) and name.startswith('gen')]
    gen('url-shortener', 'impl-basic', 'Basic URL Shortener', [('c','Client','blue'),('s','Server','gray'),('d','DB','purple')], [('c','s','','#3b82f6'),('s','d','','#6366f1')], **LR)  # dummy to trigger
