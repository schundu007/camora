#!/usr/bin/env python3
"""Generate basic/advanced implementation diagrams for ALL systemDesignProblemsExtra topics."""
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
def mk(out, name, title):
    os.makedirs(out, exist_ok=True)
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.5', ranksep='0.6', splines='spline',
           label=f'  {title}  ', labelloc='t', fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b', rankdir='LR')
    return g, os.path.join(out, name)

def gen(d, name, title, nodes, edges):
    OUT = os.path.join(BASE, d)
    g, path = mk(OUT, name, title)
    for nd in nodes: n(g, *nd)
    for ed in edges: e(g, *ed)
    g.render(path, cleanup=True)

# === ALL 33 TOPICS ===

TOPICS = {
  'slack': {
    'basic': ('Basic Slack', [('u','User','blue'),('ws','WebSocket\nServer','gray'),('db','PostgreSQL','purple'),('r','Recipient','blue')],
              [('u','ws','send msg','#3b82f6'),('ws','db','persist','#6366f1'),('ws','r','deliver','#22c55e')]),
    'advanced': ('Distributed Slack', [('u','User','blue'),('lb','Load\nBalancer','gray'),('gw','WS Gateway\n(sticky)','purple'),('chat','Channel\nService','teal'),('kafka','Kafka','orange'),('search','Elasticsearch','green'),('redis','Redis\n(presence)','red'),('s3','S3\n(files)','yellow')],
                [('u','lb','connect','#3b82f6'),('lb','gw','sticky\nsession','#6b7280'),('gw','chat','route','#14b8a6'),('chat','kafka','publish','#f97316'),('chat','redis','presence','#ef4444'),('gw','search','search','#22c55e','dashed'),('gw','s3','upload','#f59e0b','dashed')]),
  },
  'tiktok': {
    'basic': ('Basic Short Video', [('creator','Creator\nuploads','pink'),('server','Server','gray'),('storage','Storage','purple'),('viewer','Viewer','blue')],
              [('creator','server','upload','#ec4899'),('server','storage','store','#6366f1'),('viewer','server','feed','#3b82f6')]),
    'advanced': ('Production TikTok', [('creator','Creator','pink'),('api','API','gray'),('transcode','Transcode\nFarm','orange'),('cdn','CDN','green'),('rec','ML Rec\nEngine','yellow'),('feed','Feed\nService','purple'),('redis','Redis\n(interactions)','red'),('viewer','Viewer','blue')],
                [('creator','api','upload','#ec4899'),('api','transcode','encode','#f97316'),('transcode','cdn','distribute','#22c55e'),('api','feed','post','#6366f1'),('feed','rec','rank','#f59e0b'),('viewer','cdn','stream','#22c55e'),('viewer','redis','like/share','#ef4444')]),
  },
  'reddit': {
    'basic': ('Basic Reddit', [('user','User','blue'),('server','Server','gray'),('db','Database','purple')],
              [('user','server','post/vote','#3b82f6'),('server','db','store','#6366f1')]),
    'advanced': ('Production Reddit', [('user','User','blue'),('api','API','gray'),('post','Post\nService','purple'),('vote','Vote\nService\n(Redis)','red'),('rank','Ranking\nService','orange'),('search','Elasticsearch','teal'),('cache','CDN +\nCache','green'),('kafka','Kafka','yellow')],
                [('user','api','request','#3b82f6'),('api','post','CRUD','#6366f1'),('api','vote','upvote','#ef4444'),('vote','rank','update\nhot/top','#f97316'),('post','search','index','#14b8a6','dashed'),('rank','cache','cache\nhot posts','#22c55e'),('post','kafka','events','#f59e0b','dashed')]),
  },
  'twitch': {
    'basic': ('Basic Live Stream', [('streamer','Streamer\n(OBS)','pink'),('ingest','Ingest\nServer','gray'),('viewer','Viewer','blue'),('chat','Chat\nServer','purple')],
              [('streamer','ingest','RTMP','#ec4899'),('ingest','viewer','HLS\nstream','#3b82f6'),('viewer','chat','messages','#6366f1')]),
    'advanced': ('Production Twitch', [('streamer','Streamer','pink'),('pop','Ingest PoP\n(GPU transcode)','gray'),('cdn','Multi-Tier\nCDN','green'),('chat_gw','Chat WS\nCluster','purple'),('redis','Redis\nPub/Sub','red'),('cassandra','Cassandra\n(chat log)','teal'),('meta','Metadata\nService','orange'),('viewer','Viewer','blue')],
                [('streamer','pop','RTMP\ningest','#ec4899'),('pop','cdn','HLS\nsegments','#22c55e'),('viewer','cdn','ABR\nstream','#22c55e'),('viewer','chat_gw','WebSocket','#6366f1'),('chat_gw','redis','broadcast','#ef4444'),('redis','cassandra','persist','#14b8a6','dashed'),('pop','meta','stream\nstatus','#f97316','dashed')]),
  },
  'gmail': {
    'basic': ('Basic Email', [('sender','Sender','blue'),('smtp','SMTP\nServer','gray'),('store','Mailbox\nStorage','purple'),('recipient','Recipient','blue')],
              [('sender','smtp','send','#3b82f6'),('smtp','store','deliver','#6366f1'),('recipient','store','fetch\n(IMAP)','#22c55e')]),
    'advanced': ('Production Gmail', [('sender','Sender','blue'),('api','API\nGateway','gray'),('smtp','SMTP\nRelay','purple'),('store','Bigtable\n(mailbox)','teal'),('search','Search\nIndex','orange'),('spam','Spam ML\nFilter','red'),('push','Push\nNotify','yellow'),('recipient','Recipient','blue')],
                [('sender','api','compose','#3b82f6'),('api','spam','filter','#ef4444'),('api','smtp','relay','#6366f1'),('smtp','store','deliver','#14b8a6'),('store','search','index','#f97316','dashed'),('store','push','notify','#f59e0b'),('recipient','api','fetch','#3b82f6')]),
  },
  'google-drive': {
    'basic': ('Basic File Sync', [('client','Client','blue'),('server','Server','gray'),('storage','Storage','purple')],
              [('client','server','upload','#3b82f6'),('server','storage','store','#6366f1')]),
    'advanced': ('Production Drive', [('client','Client\n(chunking)','blue'),('api','API','gray'),('chunk','Block\nServer','purple'),('s3','S3\n(content-\naddressed)','teal'),('meta','Metadata\nService','orange'),('notify','Sync\nNotify','yellow'),('collab','Collab\nService','green')],
                [('client','api','upload\nchunks','#3b82f6'),('api','chunk','dedup\nblocks','#6366f1'),('chunk','s3','store','#14b8a6'),('api','meta','update\ntree','#f97316'),('meta','notify','broadcast','#f59e0b'),('notify','collab','conflict\nresolve','#22c55e','dashed')]),
  },
  'shopify': {
    'basic': ('Basic E-Commerce', [('merchant','Merchant','blue'),('server','Monolith','gray'),('db','Database','purple'),('buyer','Buyer','green')],
              [('merchant','server','setup\nstore','#3b82f6'),('buyer','server','browse +\nbuy','#22c55e'),('server','db','all data','#6366f1')]),
    'advanced': ('Multi-Tenant Shopify', [('merchant','Merchant','blue'),('api','API\nGateway','gray'),('pod','Tenant Pod\n(isolated)','purple'),('storefront','Storefront\nCDN','green'),('payment','Payment\nService','teal'),('inventory','Inventory','orange'),('kafka','Kafka','yellow'),('buyer','Buyer','blue')],
                [('merchant','api','manage','#3b82f6'),('api','pod','route to\ntenant','#6366f1'),('buyer','storefront','browse','#22c55e'),('storefront','pod','API','#6366f1'),('pod','payment','checkout','#14b8a6'),('pod','inventory','reserve','#f97316'),('pod','kafka','events','#f59e0b','dashed')]),
  },
  'flash-sale': {
    'basic': ('Basic Flash Sale', [('user','User','blue'),('server','Server','gray'),('db','DB\n(row lock)','purple')],
              [('user','server','buy','#3b82f6'),('server','db','check +\ndecrement','#6366f1')]),
    'advanced': ('Production Flash Sale', [('user','User','blue'),('queue','Virtual\nQueue','orange'),('api','API','gray'),('redis','Redis\n(atomic\ncounter)','red'),('order','Order\nService','purple'),('payment','Payment','green'),('kafka','Kafka','yellow')],
                [('user','queue','enqueue','#f97316'),('queue','api','dequeue','#6b7280'),('api','redis','DECR\nstock','#ef4444'),('redis','order','if > 0\ncreate','#6366f1'),('order','payment','charge','#22c55e'),('order','kafka','event','#f59e0b','dashed')]),
  },
  'digital-wallet': {
    'basic': ('Basic Wallet', [('user','User','blue'),('server','Server','gray'),('db','Database\n(balance)','purple')],
              [('user','server','transfer','#3b82f6'),('server','db','UPDATE\nbalance','#6366f1')]),
    'advanced': ('Event-Sourced Wallet', [('user','User','blue'),('api','API\n(idempotent)','gray'),('ledger','Event\nLedger\n(append-only)','purple'),('balance','Balance\nProjection\n(Redis)','red'),('audit','Audit\nService','teal'),('kafka','Kafka','orange')],
                [('user','api','transfer','#3b82f6'),('api','ledger','append\nevent','#6366f1'),('ledger','balance','project\nbalance','#ef4444'),('ledger','audit','audit\ntrail','#14b8a6'),('api','kafka','publish','#f97316','dashed')]),
  },
  'stock-exchange': {
    'basic': ('Basic Matching', [('trader','Trader','blue'),('engine','Matching\nEngine','gray'),('orderbook','Order Book\n(in-memory)','purple')],
              [('trader','engine','place\norder','#3b82f6'),('engine','orderbook','match','#6366f1')]),
    'advanced': ('Production Exchange', [('trader','Trader','blue'),('gw','Gateway\n(FIX protocol)','gray'),('seq','Sequencer\n(total order)','orange'),('engine','Matching\nEngine\n(in-memory)','purple'),('raft','Raft\nReplica','red'),('market','Market Data\nFeed','green'),('risk','Risk\nEngine','teal')],
                [('trader','gw','FIX\nmessage','#3b82f6'),('gw','seq','sequence','#f97316'),('seq','engine','ordered\nmatch','#6366f1'),('engine','raft','replicate','#ef4444'),('engine','market','publish\ntrades','#22c55e'),('gw','risk','pre-trade\ncheck','#14b8a6')]),
  },
  'api-gateway': {
    'basic': ('Basic Reverse Proxy', [('client','Client','blue'),('proxy','Nginx\nProxy','gray'),('svc','Backend\nService','purple')],
              [('client','proxy','request','#3b82f6'),('proxy','svc','forward','#6366f1')]),
    'advanced': ('Production API Gateway', [('client','Client','blue'),('gw','API Gateway\n(Kong/Envoy)','gray'),('auth','Auth\nPlugin','red'),('rate','Rate Limit\n(Redis)','orange'),('route','Dynamic\nRouter','purple'),('svc1','Service A','teal'),('svc2','Service B','teal'),('metrics','Metrics','yellow')],
                [('client','gw','request','#3b82f6'),('gw','auth','authenticate','#ef4444'),('gw','rate','throttle','#f97316'),('gw','route','route','#6366f1'),('route','svc1','','#14b8a6'),('route','svc2','','#14b8a6'),('gw','metrics','log','#f59e0b','dashed')]),
  },
  'distributed-cache': {
    'basic': ('Basic Cache', [('client','Client','blue'),('cache','Cache\n(single node)','red'),('db','Database','purple')],
              [('client','cache','GET','#ef4444'),('cache','db','miss:\nfetch','#6366f1')]),
    'advanced': ('Distributed Cache', [('client','Client','blue'),('router','Consistent\nHash Router','gray'),('n1','Cache Node 1','red'),('n2','Cache Node 2','red'),('n3','Cache Node 3','red'),('db','Database','purple')],
                [('client','router','hash key','#3b82f6'),('router','n1','route','#ef4444'),('router','n2','route','#ef4444'),('n1','n3','replicate','#ef4444','dashed'),('n1','db','miss','#6366f1','dashed')]),
  },
  'cdn': {
    'basic': ('Basic CDN', [('user','User','blue'),('dns','DNS','gray'),('edge','Edge Server','green'),('origin','Origin\nServer','purple')],
              [('user','dns','resolve','#3b82f6'),('dns','edge','route to\nnearest','#22c55e'),('edge','origin','cache miss:\nfetch','#6366f1','dashed')]),
    'advanced': ('Multi-Tier CDN', [('user','User','blue'),('anycast','Anycast\nDNS','gray'),('edge','Edge PoP','green'),('shield','Origin\nShield','orange'),('origin','Origin','purple'),('purge','Purge\nService','red')],
                [('user','anycast','resolve','#3b82f6'),('anycast','edge','nearest\nedge','#22c55e'),('edge','shield','miss','#f97316'),('shield','origin','miss','#6366f1'),('purge','edge','invalidate','#ef4444','dashed')]),
  },
  'object-storage': {
    'basic': ('Basic Object Store', [('client','Client','blue'),('api','API','gray'),('disk','Local Disk','purple')],
              [('client','api','PUT object','#3b82f6'),('api','disk','write','#6366f1')]),
    'advanced': ('Distributed Object Storage', [('client','Client','blue'),('api','API\nGateway','gray'),('meta','Metadata\nService','orange'),('erasure','Erasure\nCoding','purple'),('node1','Storage\nNode 1','teal'),('node2','Storage\nNode 2','teal'),('node3','Storage\nNode 3','teal')],
                [('client','api','PUT','#3b82f6'),('api','meta','store\nmetadata','#f97316'),('api','erasure','encode','#6366f1'),('erasure','node1','shard 1','#14b8a6'),('erasure','node2','shard 2','#14b8a6'),('erasure','node3','parity','#14b8a6')]),
  },
  'time-series-db': {
    'basic': ('Basic TSDB', [('sensor','Sensor\nData','blue'),('server','Server','gray'),('db','Database\n(append)','purple')],
              [('sensor','server','write','#3b82f6'),('server','db','INSERT','#6366f1')]),
    'advanced': ('Production TSDB', [('sensor','Sensors','blue'),('ingest','Ingest\nRouter','gray'),('wal','WAL +\nMemtable','purple'),('compactor','Compactor\n(LSM merge)','orange'),('disk','Columnar\nStorage','teal'),('query','Query\nEngine','green'),('downsample','Downsample\nWorker','yellow')],
                [('sensor','ingest','write','#3b82f6'),('ingest','wal','buffer','#6366f1'),('wal','compactor','flush','#f97316'),('compactor','disk','merge','#14b8a6'),('query','disk','scan','#22c55e'),('downsample','disk','rollup','#f59e0b','dashed')]),
  },
  'distributed-lock': {
    'basic': ('Basic Redis Lock', [('client','Client','blue'),('redis','Redis\nSETNX','red'),('resource','Resource','purple')],
              [('client','redis','SETNX\n+ TTL','#ef4444'),('client','resource','if locked:\naccess','#6366f1')]),
    'advanced': ('Consensus Lock (ZooKeeper)', [('client','Client','blue'),('zk1','ZK Node 1\n(leader)','purple'),('zk2','ZK Node 2','purple'),('zk3','ZK Node 3','purple'),('resource','Resource','green')],
                [('client','zk1','create\nephemeral\nnode','#6366f1'),('zk1','zk2','replicate','#6366f1','dashed'),('zk1','zk3','replicate','#6366f1','dashed'),('client','resource','if lock\nheld: access','#22c55e')]),
  },
  'job-scheduler': {
    'basic': ('Basic Scheduler', [('api','API','blue'),('poller','Poller\n(cron)','gray'),('db','Job DB','purple'),('worker','Worker','green')],
              [('api','db','create job','#3b82f6'),('poller','db','poll due\njobs','#6366f1'),('poller','worker','execute','#22c55e')]),
    'advanced': ('Distributed Scheduler', [('api','API','blue'),('wheel','Time Wheel\n(O(1) trigger)','gray'),('partition','Partition\nManager','purple'),('queue','Priority\nQueue','orange'),('worker','Worker\nPool','green'),('redis','Redis\n(dedup)','red')],
                [('api','wheel','schedule','#3b82f6'),('wheel','queue','trigger\nat time','#f97316'),('partition','queue','assign','#6366f1'),('queue','worker','execute','#22c55e'),('worker','redis','exactly-once\ncheck','#ef4444')]),
  },
  'ci-cd-pipeline': {
    'basic': ('Basic CI/CD', [('dev','Developer\npushes','blue'),('ci','CI Server','gray'),('test','Test\nRunner','purple'),('deploy','Deploy\nTarget','green')],
              [('dev','ci','git push','#3b82f6'),('ci','test','run tests','#6366f1'),('test','deploy','if pass:\ndeploy','#22c55e')]),
    'advanced': ('Production CI/CD', [('dev','Developer','blue'),('git','Git\nWebhook','gray'),('queue','Build\nQueue','orange'),('runner','Container\nRunner','purple'),('registry','Artifact\nRegistry','teal'),('canary','Canary\nDeploy','green'),('monitor','Monitor\n(rollback)','red')],
                [('dev','git','push','#3b82f6'),('git','queue','enqueue','#f97316'),('queue','runner','build +\ntest','#6366f1'),('runner','registry','publish\nartifact','#14b8a6'),('registry','canary','deploy\n5%','#22c55e'),('canary','monitor','check\nmetrics','#ef4444')]),
  },
  'calendar-system': {
    'basic': ('Basic Calendar', [('user','User','blue'),('server','Server','gray'),('db','Database','purple')],
              [('user','server','create\nevent','#3b82f6'),('server','db','store','#6366f1')]),
    'advanced': ('Production Calendar', [('user','User','blue'),('api','API','gray'),('event','Event\nService\n(RRULE)','purple'),('freebusy','Free/Busy\nService','teal'),('notify','Reminder\nService','orange'),('caldav','CalDAV\nSync','green')],
                [('user','api','CRUD','#3b82f6'),('api','event','expand\nrecurrence','#6366f1'),('event','freebusy','materialize','#14b8a6'),('api','notify','schedule\nreminder','#f97316'),('api','caldav','sync\nexternal','#22c55e','dashed')]),
  },
  'online-chess': {
    'basic': ('Basic Chess Server', [('p1','Player 1','blue'),('server','Game\nServer','gray'),('p2','Player 2','blue')],
              [('p1','server','move','#3b82f6'),('server','p2','broadcast','#3b82f6')]),
    'advanced': ('Distributed Chess', [('p1','Player 1','blue'),('mm','Matchmaking\n(ELO)','gray'),('game','Game Server\n(stateful)','purple'),('clock','Clock\nService','orange'),('replay','Replay\nStore','teal'),('p2','Player 2','blue')],
                [('p1','mm','find\nmatch','#3b82f6'),('mm','game','create\ngame','#6366f1'),('game','clock','start\ntimer','#f97316'),('p1','game','move','#3b82f6'),('game','p2','broadcast','#3b82f6'),('game','replay','persist','#14b8a6','dashed')]),
  },
  'recommendation-engine': {
    'basic': ('Basic Recommendations', [('user','User','blue'),('server','Server','gray'),('db','DB\n(collaborative\nfilter)','purple')],
              [('user','server','get recs','#3b82f6'),('server','db','query\nsimilar','#6366f1')]),
    'advanced': ('ML Recommendation Pipeline', [('user','User','blue'),('api','API','gray'),('candidate','Candidate\nGen\n(retrieve 1K)','purple'),('rank','ML Ranker\n(deep model)','orange'),('filter','Business\nRules','teal'),('cache','Redis\nCache','red'),('train','Training\nPipeline','yellow')],
                [('user','api','get recs','#3b82f6'),('api','cache','check\ncache','#ef4444'),('api','candidate','retrieve','#6366f1'),('candidate','rank','score','#f97316'),('rank','filter','apply\nrules','#14b8a6'),('train','rank','update\nmodel','#f59e0b','dashed')]),
  },
  'chatgpt-llm-system': {
    'basic': ('Basic LLM Serving', [('user','User','blue'),('api','API','gray'),('gpu','GPU\n(inference)','purple'),('model','Model\nWeights','teal')],
              [('user','api','prompt','#3b82f6'),('api','gpu','forward\npass','#6366f1'),('gpu','model','load','#14b8a6')]),
    'advanced': ('Production LLM', [('user','User','blue'),('lb','Load\nBalancer','gray'),('batch','Continuous\nBatcher','purple'),('gpu','GPU Cluster\n(KV Cache)','orange'),('rag','RAG\nRetriever','teal'),('guard','Safety\nFilter','red'),('stream','SSE\nStreamer','green')],
                [('user','lb','prompt','#3b82f6'),('lb','guard','safety\ncheck','#ef4444'),('lb','rag','retrieve\ncontext','#14b8a6'),('lb','batch','enqueue','#6366f1'),('batch','gpu','batch\ninference','#f97316'),('gpu','stream','token\nstream','#22c55e')]),
  },
  'deployment-system': {
    'basic': ('Basic Deploy', [('dev','Developer','blue'),('server','Deploy\nScript','gray'),('target','Server','purple')],
              [('dev','server','deploy','#3b82f6'),('server','target','scp +\nrestart','#6366f1')]),
    'advanced': ('Progressive Delivery', [('dev','Developer','blue'),('pipeline','Pipeline','gray'),('canary','Canary\n(5%)','orange'),('analysis','Auto\nAnalysis','red'),('promote','Full\nRollout','green'),('rollback','Rollback','red')],
                [('dev','pipeline','trigger','#3b82f6'),('pipeline','canary','deploy\n5%','#f97316'),('canary','analysis','check\nmetrics','#ef4444'),('analysis','promote','if OK:\n100%','#22c55e'),('analysis','rollback','if bad:\nrevert','#ef4444','dashed')]),
  },
  'distributed-search': {
    'basic': ('Basic Search', [('user','User','blue'),('server','Server','gray'),('index','Index\n(single)','purple')],
              [('user','server','query','#3b82f6'),('server','index','search','#6366f1')]),
    'advanced': ('Distributed Search', [('user','User','blue'),('coord','Coordinator','gray'),('s1','Shard 1','purple'),('s2','Shard 2','purple'),('s3','Shard 3','purple'),('indexer','Indexer\n(NRT)','orange')],
                [('user','coord','query','#3b82f6'),('coord','s1','fan-out','#6366f1'),('coord','s2','fan-out','#6366f1'),('coord','s3','fan-out','#6366f1'),('indexer','s1','index\ndocs','#f97316','dashed')]),
  },
  'blob-store': {
    'basic': ('Basic Blob Store', [('client','Client','blue'),('api','API','gray'),('disk','Disk','purple')],
              [('client','api','PUT blob','#3b82f6'),('api','disk','write','#6366f1')]),
    'advanced': ('Distributed Blob Store', [('client','Client','blue'),('api','API','gray'),('meta','Metadata\n(Raft)','orange'),('erasure','Erasure\nCoding','purple'),('tier_hot','Hot Tier\n(SSD)','red'),('tier_cold','Cold Tier\n(HDD/Glacier)','teal')],
                [('client','api','PUT','#3b82f6'),('api','meta','store key','#f97316'),('api','erasure','encode','#6366f1'),('erasure','tier_hot','store','#ef4444'),('tier_hot','tier_cold','age out','#14b8a6','dashed')]),
  },
  'distributed-task-scheduler': {
    'basic': ('Basic Task Scheduler', [('api','API','blue'),('db','DB\n(poll)','purple'),('worker','Worker','green')],
              [('api','db','create\ntask','#3b82f6'),('db','worker','poll +\nexecute','#22c55e')]),
    'advanced': ('Distributed Scheduler', [('api','API','blue'),('queue','Priority\nQueue','orange'),('assign','Assigner\n(consistent\nhash)','gray'),('w1','Worker 1','green'),('w2','Worker 2','green'),('redis','Redis\n(dedup)','red')],
                [('api','queue','enqueue','#f97316'),('queue','assign','dequeue','#6b7280'),('assign','w1','assign','#22c55e'),('assign','w2','assign','#22c55e'),('w1','redis','exactly-once','#ef4444')]),
  },
  'leetcode-online-judge': {
    'basic': ('Basic Online Judge', [('user','User','blue'),('server','Server','gray'),('sandbox','Sandbox\n(exec)','purple')],
              [('user','server','submit\ncode','#3b82f6'),('server','sandbox','run +\ncompare','#6366f1')]),
    'advanced': ('Production Judge', [('user','User','blue'),('api','API','gray'),('queue','Job Queue','orange'),('runner','Container\nRunner\n(isolated)','purple'),('testcases','Test Case\nStore','teal'),('leaderboard','Leaderboard\n(Redis)','red')],
                [('user','api','submit','#3b82f6'),('api','queue','enqueue','#f97316'),('queue','runner','execute\nin sandbox','#6366f1'),('runner','testcases','fetch\ncases','#14b8a6'),('runner','leaderboard','update\nrank','#ef4444')]),
  },
  'strava-fitness-tracking': {
    'basic': ('Basic Fitness Tracker', [('app','Mobile\nApp','blue'),('server','Server','gray'),('db','Database','purple')],
              [('app','server','upload\nGPS','#3b82f6'),('server','db','store\nactivity','#6366f1')]),
    'advanced': ('Production Fitness', [('app','Mobile\nApp','blue'),('api','API','gray'),('ingest','GPS Ingest\n(batch)','orange'),('segment','Segment\nMatcher','purple'),('social','Social\nFeed','teal'),('ml','ML\n(route rec)','yellow'),('leaderboard','Leaderboard','red')],
                [('app','api','upload','#3b82f6'),('api','ingest','batch\nGPS points','#f97316'),('ingest','segment','match\nsegments','#6366f1'),('segment','leaderboard','update\nKOM','#ef4444'),('api','social','post\nactivity','#14b8a6'),('api','ml','suggest\nroutes','#f59e0b','dashed')]),
  },
  'online-auction': {
    'basic': ('Basic Auction', [('bidder','Bidder','blue'),('server','Server','gray'),('db','DB\n(highest bid)','purple')],
              [('bidder','server','place bid','#3b82f6'),('server','db','if > current:\nupdate','#6366f1')]),
    'advanced': ('Production Auction', [('bidder','Bidder','blue'),('ws','WebSocket\nGateway','gray'),('bid','Bid Service\n(optimistic\nlock)','purple'),('redis','Redis\n(current\nhighest)','red'),('notify','Notification','orange'),('timer','Auction\nTimer','teal')],
                [('bidder','ws','bid','#3b82f6'),('ws','bid','validate','#6366f1'),('bid','redis','atomic\ncompare','#ef4444'),('bid','notify','outbid\nalert','#f97316'),('timer','bid','close\nauction','#14b8a6')]),
  },
  'fb-live-comments': {
    'basic': ('Basic Live Comments', [('viewer','Viewer','blue'),('server','Server','gray'),('stream','Comment\nStream','purple')],
              [('viewer','server','post\ncomment','#3b82f6'),('server','stream','broadcast','#6366f1')]),
    'advanced': ('Production Live Comments', [('viewer','Viewer','blue'),('gw','WS Gateway','gray'),('sampler','Message\nSampler\n(1:N ratio)','purple'),('redis','Redis\nPub/Sub','red'),('moderate','ML\nModeration','orange'),('store','Comment\nStore','teal')],
                [('viewer','gw','comment','#3b82f6'),('gw','moderate','filter','#f97316'),('moderate','redis','publish','#ef4444'),('redis','sampler','sample\nfor scale','#6366f1'),('sampler','gw','fan-out','#3b82f6'),('moderate','store','persist','#14b8a6','dashed')]),
  },
  'fb-post-search': {
    'basic': ('Basic Social Search', [('user','User','blue'),('server','Server','gray'),('db','DB\n(LIKE query)','purple')],
              [('user','server','search','#3b82f6'),('server','db','SELECT\n... LIKE','#6366f1')]),
    'advanced': ('Production Social Search', [('user','User','blue'),('api','API','gray'),('es','Elasticsearch\n(sharded)','purple'),('rank','Social\nRanker','orange'),('type','Type Router\n(posts/people/\ngroups)','teal'),('privacy','Privacy\nFilter','red')],
                [('user','api','query','#3b82f6'),('api','type','route by\ntype','#14b8a6'),('type','es','search\nshards','#6366f1'),('es','rank','social\nsignal','#f97316'),('rank','privacy','filter\nvisibility','#ef4444')]),
  },
  'price-tracking-service': {
    'basic': ('Basic Price Tracker', [('crawler','Crawler','blue'),('server','Server','gray'),('db','Database','purple'),('user','User','green')],
              [('crawler','server','scrape\nprice','#3b82f6'),('server','db','store','#6366f1'),('user','server','check\nprice','#22c55e')]),
    'advanced': ('Production Price Tracker', [('scheduler','Scheduler','gray'),('crawler','Distributed\nCrawler','blue'),('parser','Price\nParser','purple'),('tsdb','Time-Series\nDB','teal'),('alert','Alert\nService','orange'),('user','User','green')],
                [('scheduler','crawler','trigger','#3b82f6'),('crawler','parser','extract\nprice','#6366f1'),('parser','tsdb','store\nhistory','#14b8a6'),('tsdb','alert','price\ndrop?','#f97316'),('alert','user','notify','#22c55e')]),
  },
  'youtube-top-k-trending': {
    'basic': ('Basic Trending', [('events','View\nEvents','blue'),('counter','Counter','gray'),('sort','Sort','purple'),('display','Top K','green')],
              [('events','counter','count','#3b82f6'),('counter','sort','rank','#6366f1'),('sort','display','top K','#22c55e')]),
    'advanced': ('Production Trending', [('events','Event\nStream','blue'),('kafka','Kafka','orange'),('flink','Flink\n(sliding\nwindow)','purple'),('cms','Count-Min\nSketch','teal'),('heap','Min-Heap\n(top K)','red'),('cache','Redis\nCache','green')],
                [('events','kafka','ingest','#f97316'),('kafka','flink','window','#6366f1'),('flink','cms','approx\ncount','#14b8a6'),('cms','heap','maintain\ntop K','#ef4444'),('heap','cache','serve','#22c55e')]),
  },
}

if __name__ == '__main__':
    print(f'Generating {len(TOPICS) * 2} diagrams for {len(TOPICS)} topics...\n')
    for topic_id, diagrams in TOPICS.items():
        gen(topic_id, 'impl-basic', diagrams['basic'][0], diagrams['basic'][1], diagrams['basic'][2])
        gen(topic_id, 'impl-advanced', diagrams['advanced'][0], diagrams['advanced'][1], diagrams['advanced'][2])
        print(f'  OK {topic_id}')
    print(f'\nDone! {len(TOPICS) * 2} diagrams generated.')
