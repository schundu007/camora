"""
Generates impl-basic.png and impl-advanced.png for every topic that still
points at a /diagrams/fundamentals/* placeholder in systemDesignTopics.js.
Writes enterprise white-background Graphviz diagrams.
Run with: python3 apps/camora/scripts/gen-impl-diagrams.py
"""
import subprocess, os

BASE = "/Users/chundu/camora/apps/camora/public/diagrams"

PALETTE = {
    "client":  ('fillcolor="#eff6ff"', 'color="#3b82f6"', 'fontcolor="#1e3a5f"'),
    "primary": ('fillcolor="#3b82f6"', 'color="#1e3a5f"', 'fontcolor="#ffffff"'),
    "router":  ('fillcolor="#fef3c7"', 'color="#b45309"', 'fontcolor="#92400e"'),
    "healthy": ('fillcolor="#a7f3d0"', 'color="#047857"', 'fontcolor="#065f46"'),
    "error":   ('fillcolor="#fecdd3"', 'color="#be123c"', 'fontcolor="#9f1239"'),
    "meta":    ('fillcolor="#e9d5ff"', 'color="#7c3aed"', 'fontcolor="#5b21b6"'),
    "done":    ('fillcolor="#dcfce7"', 'color="#047857"', 'fontcolor="#065f46"'),
}

def node_attr(role):
    return " ".join(PALETTE[role])

def make_dot(title, nodes, edges, same_ranks=None):
    safe_title = title.replace('"', '\\"')
    lines = [
        "digraph {",
        f'  graph [rankdir=LR bgcolor="#ffffff" splines=ortho nodesep=1.0 ranksep=1.5 pad="0.8,0.5" fontname="Arial" fontsize=14 label="{safe_title}" labelloc=t fontcolor="#1e293b"]',
        '  node [fontname="Arial" shape=box style="rounded,filled" penwidth=2.0 margin="0.28,0.16" fontsize=11]',
        '  edge [color="#94a3b8" penwidth=1.5 arrowsize=0.8]',
    ]
    for nid, label, role in nodes:
        safe_label = label.replace('"', '\\"').replace('\n', '\\n')
        lines.append(f'  {nid} [label="{safe_label}" {node_attr(role)}]')
    if same_ranks:
        for group in same_ranks:
            lines.append(f'  {{ rank=same; {"; ".join(group)}; }}')
    for e in edges:
        src, dst, style = e[0], e[1], e[2] if len(e) > 2 else ""
        if style:
            lines.append(f'  {src} -> {dst} [{style}]')
        else:
            lines.append(f'  {src} -> {dst}')
    lines.append("}")
    return "\n".join(lines)

def render(dot_src, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    r = subprocess.run(["dot", "-Tpng", "-Gdpi=200", "-o", out_path],
                       input=dot_src.encode(), capture_output=True, timeout=15)
    if r.returncode != 0:
        print(f"ERROR {out_path}: {r.stderr.decode()[:200]}")
    else:
        print(f"OK {out_path}")

# Each entry: (topic_id, basic_title, basic_nodes, basic_edges, basic_same_ranks,
#              advanced_title, advanced_nodes, advanced_edges, advanced_same_ranks)
TOPICS = [
    ("databases",
     "Single-Database Architecture",
     [("App","App Server","client"),("DB","Relational DB\nPostgreSQL / MySQL","primary"),("Idx","Indexes\nB-tree","healthy"),("Cache","Query Cache","router")],
     [("App","DB"),("DB","Idx"),("DB","Cache","style=dashed")], [["Idx","Cache"]],
     "Polyglot Persistence Architecture",
     [("App","App Server","client"),("Router","Data Router","router"),("SQL","PostgreSQL\nTransactions","primary"),("Redis","Redis\nSessions/Cache","healthy"),("Mongo","MongoDB\nDocuments","meta"),("Ana","Cassandra\nAnalytics","error")],
     [("App","Router"),("Router","SQL"),("Router","Redis"),("Router","Mongo"),("Router","Ana")],[["SQL","Redis","Mongo","Ana"]]),

    ("caching",
     "Simple Cache (Cache-Aside)",
     [("App","Application","client"),("Cache","Redis Cache\nTTL: 300s","router"),("DB","Database\nPostgreSQL","healthy"),("Miss","Cache Miss\nFetch + SET","meta")],
     [("App","Cache"),("Cache","Miss","style=dashed"),("Miss","DB"),("DB","Miss","style=dashed"),("Cache","App","style=dashed")],[],
     "Multi-Tier Cache Architecture",
     [("Client","Client","client"),("L1","L1: Local Cache\nIn-process","primary"),("L2","L2: Redis Cluster\nDistributed","router"),("L3","L3: CDN Edge\nGeographic","healthy"),("DB","Origin DB","meta"),("Inv","Cache Invalidation\nPub/Sub","error")],
     [("Client","L1"),("L1","L2","style=dashed"),("L2","L3","style=dashed"),("L2","DB","style=dashed"),("Inv","L1"),("Inv","L2"),("Inv","L3")],[]),

    ("bloom-filters",
     "Bloom Filter — Single Tier",
     [("Client","Client Query","client"),("BF","Bloom Filter\nk hash functions","router"),("Hit","Definite Miss\n(No disk I/O)","done"),("Check","DB Lookup\n(Possible Hit)","primary"),("DB","Database","healthy")],
     [("Client","BF"),("BF","Hit"),("BF","Check","style=dashed"),("Check","DB")],[],
     "Bloom Filter — LSM-Tree Layers",
     [("Write","Write Path","client"),("Mem","MemTable","primary"),("L0","L0 SSTables\n+ Bloom Filter","router"),("L1","L1 SSTables\n+ Bloom Filter","healthy"),("LN","LN SSTables\n+ Bloom Filter","meta"),("Read","Read Path\nFilter first","done"),("Skip","Skip level\nfilter=NO","error")],
     [("Write","Mem"),("Mem","L0"),("L0","L1"),("L1","LN"),("Read","L0"),("L0","Skip","style=dashed"),("L0","L1","style=dashed"),("L1","LN","style=dashed")],[["L0","Skip"]]),

    ("data-partitioning",
     "Range-Based Sharding",
     [("App","App Server","client"),("Router","Shard Router\nRange lookup","router"),("S0","Shard 0\nA-M","primary"),("S1","Shard 1\nN-Z","healthy"),("Meta","Metadata Store\nShard map","meta")],
     [("App","Router"),("Router","Meta"),("Router","S0"),("Router","S1")],[["S0","S1"]],
     "Consistent Hashing with Virtual Nodes",
     [("Client","Client","client"),("Ring","Hash Ring\n360 vnodes","router"),("N1","Node 1\nvnodes 0,120,240","primary"),("N2","Node 2\nvnodes 40,160,280","healthy"),("N3","Node 3\nvnodes 80,200,320","meta"),("Rep","Replication\nN=3 per key","done")],
     [("Client","Ring"),("Ring","N1"),("Ring","N2"),("Ring","N3"),("N1","Rep"),("N2","Rep"),("N3","Rep")],[["N1","N2","N3"]]),

    ("database-indexes",
     "Single-Column B-Tree Index",
     [("Query","SELECT query","client"),("Plan","Query Planner","router"),("Idx","B-Tree Index\nO(log n) seek","primary"),("Heap","Heap File\nFull table rows","healthy"),("Result","Result Set","done")],
     [("Query","Plan"),("Plan","Idx"),("Idx","Heap"),("Heap","Result")],[],
     "Composite + Covering Index",
     [("Query","Complex Query\nWHERE + ORDER BY","client"),("Plan","Query Optimizer","router"),("CIdx","Composite Index\n(col_a, col_b)","primary"),("Cover","Covering Index\nIndex-only scan","meta"),("Heap","Heap File\n(avoided)","error"),("Result","Result Set\nFast path","done")],
     [("Query","Plan"),("Plan","CIdx"),("Plan","Cover","style=dashed"),("CIdx","Heap","style=dashed"),("Cover","Result"),("CIdx","Result","style=dashed")],[["CIdx","Cover"]]),

    ("distributed-file-systems",
     "Single-Node File Storage",
     [("Client","Client","client"),("FS","Local Filesystem\nExt4 / XFS","primary"),("Disk","Disk\nPersistent","healthy"),("Limit","Single point\nof failure","error")],
     [("Client","FS"),("FS","Disk"),("Limit","Disk","style=invis")],[],
     "Distributed File System (HDFS-style)",
     [("Client","Client","client"),("NN","NameNode\nMetadata","router"),("DN1","DataNode 1\nBlock replicas","primary"),("DN2","DataNode 2\nBlock replicas","healthy"),("DN3","DataNode 3\nBlock replicas","meta"),("Rep","Replication\nFactor=3","done")],
     [("Client","NN"),("NN","DN1"),("NN","DN2"),("NN","DN3"),("DN1","Rep"),("DN2","Rep"),("DN3","Rep")],[["DN1","DN2","DN3"]]),

    ("acid-vs-base",
     "ACID Transactions (PostgreSQL)",
     [("App","Application","client"),("TxnMgr","Transaction Manager\nATOMICITY","router"),("WAL","Write-Ahead Log\nDURABILITY","primary"),("Lock","Lock Manager\nISOLATION","meta"),("DB","Database\nCONSISTENCY","healthy"),("Commit","COMMIT / ROLLBACK","done")],
     [("App","TxnMgr"),("TxnMgr","WAL"),("TxnMgr","Lock"),("Lock","DB"),("DB","Commit")],[],
     "BASE System (DynamoDB-style)",
     [("App","Application","client"),("Router","Request Router","router"),("R1","Replica 1\nEventually\nConsistent","primary"),("R2","Replica 2\nEventually\nConsistent","healthy"),("R3","Replica 3\nEventually\nConsistent","meta"),("Sync","Background Sync\nSoft State","done")],
     [("App","Router"),("Router","R1"),("Router","R2"),("Router","R3"),("R1","Sync","style=dashed"),("R2","Sync","style=dashed"),("R3","Sync","style=dashed")],[["R1","R2","R3"]]),

    ("message-queues",
     "Simple Queue (Producer-Consumer)",
     [("P","Producer","client"),("Q","Message Queue\nFIFO","router"),("C1","Consumer 1","primary"),("C2","Consumer 2","healthy"),("DLQ","Dead Letter Queue\nFailed msgs","error")],
     [("P","Q"),("Q","C1"),("Q","C2"),("C1","DLQ","style=dashed"),("C2","DLQ","style=dashed")],[["C1","C2"]],
     "Distributed Messaging (Kafka-style)",
     [("Prod","Producers","client"),("LB","Load Balancer","router"),("B1","Broker 1\nPartitions 0,3","primary"),("B2","Broker 2\nPartitions 1,4","healthy"),("B3","Broker 3\nPartitions 2,5","meta"),("CG1","Consumer Group A","done"),("CG2","Consumer Group B","done"),("ZK","ZooKeeper\nCoordination","error")],
     [("Prod","LB"),("LB","B1"),("LB","B2"),("LB","B3"),("B1","CG1"),("B2","CG1"),("B3","CG1"),("B1","CG2","style=dashed"),("B2","CG2","style=dashed"),("B3","CG2","style=dashed"),("ZK","B1"),("ZK","B2"),("ZK","B3")],[["B1","B2","B3"],["CG1","CG2"]]),

    ("api-design",
     "REST API (CRUD)",
     [("Client","Client","client"),("GW","API Gateway\nAuth + Rate limit","router"),("Svc","REST Service\nStateless","primary"),("DB","Database","healthy"),("Cache","Cache\nGET responses","meta")],
     [("Client","GW"),("GW","Svc"),("Svc","DB"),("Svc","Cache","style=dashed")],[],
     "API Gateway + Versioning + GraphQL",
     [("Client","Client","client"),("GW","API Gateway\nv1 / v2 routing","router"),("REST","REST v2\nResource-based","primary"),("GQL","GraphQL\nQuery-based","healthy"),("Auth","Auth Service\nJWT / OAuth2","meta"),("RL","Rate Limiter\nper key","error"),("BFF","BFF Layer\nMobile/Web","done")],
     [("Client","GW"),("GW","Auth"),("GW","RL"),("GW","REST"),("GW","GQL"),("REST","BFF","style=dashed"),("GQL","BFF","style=dashed")],[["REST","GQL"],["Auth","RL"]]),

    ("proxies",
     "Forward Proxy",
     [("Client","Client\nInternal","client"),("FP","Forward Proxy\nCache + ACL","router"),("Internet","Internet\nOrigin Servers","healthy"),("Filtered","Blocked Sites\n403 Forbidden","error")],
     [("Client","FP"),("FP","Internet"),("FP","Filtered","style=dashed")],[],
     "Reverse Proxy + Service Mesh",
     [("User","External User","client"),("RP","Reverse Proxy\nNginx / Envoy","router"),("SvcA","Service A","primary"),("SvcB","Service B","healthy"),("SvcC","Service C","meta"),("SD","Service Discovery\nConsul","error"),("mTLS","mTLS Sidecar\nSecurity","done")],
     [("User","RP"),("RP","SvcA"),("RP","SvcB"),("RP","SvcC"),("SD","RP"),("mTLS","SvcA","style=dashed"),("mTLS","SvcB","style=dashed"),("mTLS","SvcC","style=dashed")],[["SvcA","SvcB","SvcC"]]),

    ("network-essentials",
     "TCP/IP Request Flow",
     [("App","Application\nHTTP","client"),("TCP","TCP Layer\nReliable delivery","router"),("IP","IP Layer\nRouting","primary"),("Physical","Physical / Link\nEthernet","healthy"),("DNS","DNS Resolution\nIP lookup","meta")],
     [("App","TCP"),("TCP","IP"),("IP","Physical"),("App","DNS","style=dashed")],[],
     "CDN + TLS + HTTP/2 Stack",
     [("Browser","Browser","client"),("DNS","DNS CNAME\nto CDN","meta"),("CDN","CDN Edge POP","router"),("TLS","TLS 1.3\nHandshake","primary"),("H2","HTTP/2\nMultiplexing","healthy"),("Origin","Origin Server","done"),("Cache","Edge Cache\nServe direct","error")],
     [("Browser","DNS"),("DNS","CDN"),("CDN","TLS"),("TLS","H2"),("H2","Cache"),("Cache","Origin","style=dashed"),("Cache","Browser","style=dashed")],[]),

    ("long-polling-websockets-sse",
     "Long Polling",
     [("Client","Client HTTP","client"),("Server","HTTP Server","primary"),("Hold","Hold request\nuntil event","router"),("Event","Event occurs","healthy"),("Resp","Response + new poll","done"),("Timeout","Timeout 204","error")],
     [("Client","Server"),("Server","Hold"),("Hold","Event","style=dashed"),("Event","Resp"),("Hold","Timeout","style=dashed"),("Resp","Client","style=dashed"),("Timeout","Client","style=dashed")],[["Resp","Timeout"]],
     "WebSocket + SSE Architecture",
     [("Client","Client Browser","client"),("LB","Load Balancer\nsticky sessions","router"),("WS","WebSocket Server\nFull-duplex","primary"),("SSE","SSE Server\nServer push","healthy"),("Bus","Message Bus\nRedis Pub/Sub","meta"),("DB","Persistent Store","done")],
     [("Client","LB"),("LB","WS"),("LB","SSE","style=dashed"),("WS","Bus"),("SSE","Bus","style=dashed"),("Bus","DB")],[["WS","SSE"]]),

    ("distributed-messaging",
     "Simple Pub/Sub",
     [("Pub","Publisher","client"),("Topic","Topic / Subject","router"),("Sub1","Subscriber 1","primary"),("Sub2","Subscriber 2","healthy"),("Sub3","Subscriber 3","meta")],
     [("Pub","Topic"),("Topic","Sub1"),("Topic","Sub2"),("Topic","Sub3")],[["Sub1","Sub2","Sub3"]],
     "Kafka-Style Distributed Messaging",
     [("Prod","Producers","client"),("Part","Partitioner\nKey-based","router"),("P0","Partition 0\nLeader","primary"),("P1","Partition 1\nLeader","healthy"),("P2","Partition 2\nLeader","meta"),("Rep","ISR Replicas N=3","done"),("CG","Consumer Groups\nOffset tracking","error")],
     [("Prod","Part"),("Part","P0"),("Part","P1"),("Part","P2"),("P0","Rep"),("P1","Rep"),("P2","Rep"),("Rep","CG","style=dashed")],[["P0","P1","P2"]]),

    ("rest-vs-rpc",
     "REST API",
     [("Client","Client","client"),("HTTP","HTTP Layer\nGET / POST / PUT","router"),("Resource","Resource /users/{id}","primary"),("DB","Database","healthy"),("Cache","HTTP Cache\nETags","meta")],
     [("Client","HTTP"),("HTTP","Resource"),("Resource","DB"),("Resource","Cache","style=dashed")],[],
     "gRPC / RPC Framework",
     [("Client","Client Stub","client"),("Proto","Protobuf\nSerialization","router"),("Chan","HTTP/2 Channel\nMultiplexed","primary"),("Server","Server Handler","healthy"),("Stream","Streaming RPC\nBidi/Server","meta"),("LB","Client-side LB","done")],
     [("Client","Proto"),("Proto","Chan"),("Chan","Server"),("Server","Stream","style=dashed"),("LB","Chan","style=dashed")],[]),

    ("synchronous-vs-asynchronous",
     "Synchronous Request-Response",
     [("Client","Client","client"),("API","API Server\nBlocks until done","router"),("SvcA","Service A","primary"),("SvcB","Service B","healthy"),("DB","Database","meta"),("Resp","Response","done")],
     [("Client","API"),("API","SvcA"),("SvcA","SvcB"),("SvcB","DB"),("DB","Resp"),("Resp","Client","style=dashed")],[],
     "Async + Event-Driven Architecture",
     [("Client","Client","client"),("API","API Server\nAccept + 202","router"),("Queue","Message Queue\nKafka / SQS","primary"),("Worker","Worker Pool\nAsync processing","healthy"),("DB","Database","meta"),("Notify","Notification\nWebhook / SSE","done"),("DLQ","Dead Letter Queue","error")],
     [("Client","API"),("API","Queue"),("Queue","Worker"),("Worker","DB"),("Worker","Notify","style=dashed"),("Notify","Client","style=dashed"),("Worker","DLQ","style=dashed")],[]),

    ("load-balancing",
     "Single Load Balancer (L4/L7)",
     [("Client","Client","client"),("LB","Load Balancer\nRound-robin","router"),("S1","Server 1","primary"),("S2","Server 2","healthy"),("S3","Server 3","meta"),("HC","Health Check","done")],
     [("Client","LB"),("LB","S1"),("LB","S2"),("LB","S3"),("HC","S1","style=dashed"),("HC","S2","style=dashed"),("HC","S3","style=dashed")],[["S1","S2","S3"]],
     "Global Load Balancing (Anycast + GeoDNS)",
     [("User","User","client"),("DNS","GeoDNS\nNearest region","meta"),("GSLB","Global LB\nAnycast IP","router"),("US","US Region\nL7 LB","primary"),("EU","EU Region\nL7 LB","healthy"),("APAC","APAC Region\nL7 LB","error"),("Failover","Failover\nHealth-aware","done")],
     [("User","DNS"),("DNS","GSLB"),("GSLB","US"),("GSLB","EU"),("GSLB","APAC"),("Failover","GSLB","style=dashed")],[["US","EU","APAC"]]),

    ("rate-limiting",
     "Token Bucket Rate Limiter",
     [("Client","Client Request","client"),("RL","Rate Limiter\nToken Bucket","router"),("Pass","Allow 200 OK","done"),("Drop","Throttle 429","error"),("Redis","Redis Token store","primary")],
     [("Client","RL"),("RL","Redis"),("RL","Pass"),("RL","Drop","style=dashed")],[["Pass","Drop"]],
     "Distributed Rate Limiting",
     [("Clients","Clients","client"),("LB","Load Balancer","router"),("RL1","Rate Limiter 1\nSliding window","primary"),("RL2","Rate Limiter 2\nSliding window","healthy"),("Redis","Redis Cluster\nShared counters","meta"),("Pass","Allow","done"),("Deny","Deny 429","error")],
     [("Clients","LB"),("LB","RL1"),("LB","RL2"),("RL1","Redis"),("RL2","Redis"),("RL1","Pass"),("RL2","Pass"),("RL1","Deny","style=dashed"),("RL2","Deny","style=dashed")],[["RL1","RL2"],["Pass","Deny"]]),

    ("microservices",
     "Simple Microservices",
     [("Client","Client","client"),("GW","API Gateway","router"),("UserSvc","User Service","primary"),("OrderSvc","Order Service","healthy"),("DB1","Users DB","meta"),("DB2","Orders DB","done")],
     [("Client","GW"),("GW","UserSvc"),("GW","OrderSvc"),("UserSvc","DB1"),("OrderSvc","DB2")],[["UserSvc","OrderSvc"],["DB1","DB2"]],
     "Service Mesh + Event-Driven Microservices",
     [("Client","Client","client"),("GW","API Gateway + Auth","router"),("US","User Svc","primary"),("OS","Order Svc","healthy"),("PS","Payment Svc","meta"),("Bus","Event Bus Kafka","error"),("Mesh","Envoy Sidecar\nService Mesh","done")],
     [("Client","GW"),("GW","US"),("GW","OS"),("OS","Bus"),("Bus","PS"),("Mesh","US","style=dashed"),("Mesh","OS","style=dashed"),("Mesh","PS","style=dashed")],[["US","OS","PS"]]),

    ("consistent-hashing",
     "Simple Consistent Hashing",
     [("Client","Client Request","client"),("Ring","Hash Ring\n0-359 degrees","router"),("N1","Node A at 90deg","primary"),("N2","Node B at 180deg","healthy"),("N3","Node C at 270deg","meta"),("Key","key hash\nmaps to node","done")],
     [("Client","Ring"),("Ring","Key"),("Key","N1","style=dashed"),("Key","N2","style=dashed"),("Key","N3","style=dashed")],[["N1","N2","N3"]],
     "Consistent Hashing with Virtual Nodes",
     [("Client","Client","client"),("Ring","Hash Ring\nVirtual nodes","router"),("N1","Node 1 150 vnodes","primary"),("N2","Node 2 150 vnodes","healthy"),("N3","Node 3 150 vnodes","meta"),("Remap","Minimal remapping\non add/remove","done"),("Rep","Replication N=3","error")],
     [("Client","Ring"),("Ring","N1"),("Ring","N2"),("Ring","N3"),("N1","Rep"),("Remap","Ring","style=dashed")],[["N1","N2","N3"]]),

    ("cdn-deep-dive",
     "Single CDN Edge Pop",
     [("User","User","client"),("DNS","DNS CNAME to CDN","meta"),("Edge","Edge Server POP","router"),("Hit","Cache HIT\nServe direct","done"),("Miss","Cache MISS\nFetch origin","error"),("Origin","Origin Server","primary")],
     [("User","DNS"),("DNS","Edge"),("Edge","Hit"),("Edge","Miss","style=dashed"),("Miss","Origin"),("Origin","Edge","style=dashed")],[["Hit","Miss"]],
     "Multi-Tier CDN with Origin Shield",
     [("Users","Global Users","client"),("Edge1","Edge POP City-level","router"),("Edge2","Edge POP City-level","router"),("Shield","Origin Shield\nRegional","primary"),("Origin","Origin Server","healthy"),("DNS","Anycast DNS\nNearest POP","meta"),("Prefetch","Prefetch Popular content","done")],
     [("Users","DNS"),("DNS","Edge1"),("DNS","Edge2"),("Edge1","Shield","style=dashed"),("Edge2","Shield","style=dashed"),("Shield","Origin"),("Prefetch","Edge1","style=dashed"),("Prefetch","Edge2","style=dashed")],[["Edge1","Edge2"]]),

    ("latency-vs-throughput",
     "Latency-Optimized Path",
     [("Client","Client","client"),("LB","Load Balancer\nLatency-aware","router"),("Cache","In-Memory Cache\nSub-ms","primary"),("SvcA","Fast Service\nAsync I/O","healthy"),("SLA","SLA: P99 < 50ms","done")],
     [("Client","LB"),("LB","Cache"),("Cache","SvcA","style=dashed"),("SvcA","SLA","style=dashed")],[],
     "Throughput-Optimized Batch Pipeline",
     [("Source","Event Source","client"),("Ingest","Ingestion Kafka","router"),("Batch","Batch Processor\nSpark / Flink","primary"),("Store","Column Store\nParquet / S3","healthy"),("Query","Analytical\nQuery Engine","meta"),("TPut","Throughput\n1M events/sec","done")],
     [("Source","Ingest"),("Ingest","Batch"),("Batch","Store"),("Store","Query"),("Query","TPut","style=dashed")],[]),

    ("security",
     "Session-Based Authentication",
     [("User","User Browser","client"),("Login","Login Endpoint","router"),("Session","Session Store\nRedis","primary"),("Cookie","Cookie session_id","healthy"),("DB","Users DB\nPassword hash","meta")],
     [("User","Login"),("Login","DB"),("DB","Session"),("Session","Cookie"),("Cookie","User","style=dashed")],[],
     "Zero-Trust + Service Mesh Security",
     [("User","External User","client"),("WAF","WAF DDoS protect","router"),("GW","API Gateway\nJWT verify","primary"),("mTLS","mTLS Service Mesh","healthy"),("Authz","AuthZ Service\nOPA policies","meta"),("Audit","Audit Log SIEM","done"),("Enc","Encryption\nat rest + transit","error")],
     [("User","WAF"),("WAF","GW"),("GW","Authz"),("Authz","mTLS"),("mTLS","Audit","style=dashed"),("Enc","GW","style=dashed")],[]),

    ("monitoring",
     "Basic Observability Stack",
     [("App","Application","client"),("Metrics","Metrics\nPrometheus","router"),("Logs","Logs ELK Stack","primary"),("Alert","Alerting\nPagerDuty","error"),("Dash","Dashboard\nGrafana","done")],
     [("App","Metrics"),("App","Logs"),("Metrics","Alert"),("Metrics","Dash"),("Logs","Dash","style=dashed")],[["Metrics","Logs"]],
     "Full Observability: Metrics + Traces + Logs",
     [("Svc","Services","client"),("OTel","OpenTelemetry\nCollector","router"),("MetricsStore","Prometheus\nMetrics","primary"),("TraceStore","Jaeger Traces","healthy"),("LogStore","Elasticsearch\nLogs","meta"),("Dash","Grafana Dashboard","done"),("Alert","AlertManager\nPagerDuty","error")],
     [("Svc","OTel"),("OTel","MetricsStore"),("OTel","TraceStore"),("OTel","LogStore"),("MetricsStore","Dash"),("TraceStore","Dash"),("LogStore","Dash"),("MetricsStore","Alert"),("Alert","Svc","style=dashed")],[["MetricsStore","TraceStore","LogStore"]]),

    ("redundancy-replication",
     "Active-Passive Redundancy",
     [("Client","Client","client"),("LB","Load Balancer","router"),("Primary","Primary Server\n(Active)","primary"),("Standby","Standby Server\n(Passive)","healthy"),("Failover","Failover Healthcheck","error"),("DB","Shared DB","meta")],
     [("Client","LB"),("LB","Primary"),("Primary","Standby","style=dashed"),("Failover","Primary"),("Failover","Standby","style=dashed"),("Primary","DB"),("Standby","DB","style=dashed")],[["Primary","Standby"]],
     "Multi-Region Active-Active Replication",
     [("Users","Global Users","client"),("GDNS","GeoDNS","meta"),("US","US Region Active","primary"),("EU","EU Region Active","healthy"),("APAC","APAC Region Active","error"),("Sync","Async Replication\nConflict resolve","router"),("CRep","Cross-region\nDB replication","done")],
     [("Users","GDNS"),("GDNS","US"),("GDNS","EU"),("GDNS","APAC"),("US","Sync"),("EU","Sync"),("APAC","Sync"),("Sync","CRep")],[["US","EU","APAC"]]),

    ("leader-follower",
     "Single-Leader Replication",
     [("Client","Client","client"),("Leader","Leader\nwrites + reads","primary"),("F1","Follower 1\nread replica","healthy"),("F2","Follower 2\nread replica","meta"),("WAL","Replication Log\nWAL","router"),("Elect","Leader Election\nRaft / Paxos","done")],
     [("Client","Leader"),("Leader","WAL"),("WAL","F1"),("WAL","F2"),("Elect","Leader","style=dashed")],[["F1","F2"]],
     "Leader-Follower with Failover + Read Scaling",
     [("Write","Write Client","client"),("Read","Read Client","client"),("LB","LB / Router","router"),("Leader","Leader\nAll writes","primary"),("F1","Follower 1","healthy"),("F2","Follower 2","healthy"),("F3","Follower 3","meta"),("Monitor","HA Monitor\nAuto failover","error"),("NewLead","New Leader\nelected on fail","done")],
     [("Write","Leader"),("Read","LB"),("LB","F1"),("LB","F2"),("LB","F3"),("Leader","F1"),("Leader","F2"),("Leader","F3"),("Monitor","Leader"),("Monitor","NewLead","style=dashed")],[["F1","F2","F3"]]),

    ("heartbeat-mechanism",
     "Centralized Heartbeat Monitor",
     [("N1","Node 1","primary"),("N2","Node 2","healthy"),("N3","Node 3","meta"),("Monitor","Central Monitor\nHeartbeat tracker","router"),("Alert","Alert Node down","error"),("Interval","Every 1s heartbeat","done")],
     [("N1","Monitor"),("N2","Monitor"),("N3","Monitor"),("Monitor","Alert","style=dashed"),("Interval","Monitor","style=invis")],[["N1","N2","N3"]],
     "Gossip Protocol Heartbeat",
     [("N1","Node 1","primary"),("N2","Node 2","healthy"),("N3","Node 3","meta"),("N4","Node 4","error"),("N5","Node 5","done"),("Gossip","Gossip Random peer","router"),("Suspect","Suspect list\nPHI failure detector","error")],
     [("N1","Gossip"),("Gossip","N2"),("N2","N3","style=dashed"),("N3","N4","style=dashed"),("N4","Suspect","style=dashed"),("Gossip","N5","style=dashed")],[["N1","N2","N3","N4","N5"]]),

    ("checksum",
     "Simple Checksum Verification",
     [("Sender","Sender","client"),("Hash","SHA-256 Checksum","router"),("Network","Network Transmit","primary"),("Receiver","Receiver","healthy"),("Verify","Verify Checksum","meta"),("OK","Data Intact","done"),("Err","Corruption Detected","error")],
     [("Sender","Hash"),("Hash","Network"),("Network","Receiver"),("Receiver","Verify"),("Verify","OK"),("Verify","Err","style=dashed")],[["OK","Err"]],
     "End-to-End Integrity (Merkle Trees)",
     [("Client","Client","client"),("Upload","Upload + SHA-256","router"),("Chunks","File Chunks\nContent-addressed","primary"),("Merkle","Merkle Tree\nRoot hash","meta"),("Replica1","Replica 1","healthy"),("Replica2","Replica 2","done"),("AuditQ","Audit Query\nProof of integrity","error")],
     [("Client","Upload"),("Upload","Chunks"),("Chunks","Merkle"),("Merkle","Replica1"),("Merkle","Replica2"),("AuditQ","Merkle","style=dashed")],[["Replica1","Replica2"]]),

    ("cassandra-deep-dive",
     "Cassandra Single DC Write Path",
     [("Client","Client","client"),("Coord","Coordinator Node","router"),("N1","Node 1 Token owner","primary"),("N2","Node 2 Replica","healthy"),("N3","Node 3 Replica","meta"),("Commit","Commit Log\nDurable","done"),("Mem","MemTable + SSTable","error")],
     [("Client","Coord"),("Coord","N1"),("Coord","N2"),("Coord","N3"),("N1","Commit"),("N1","Mem"),("N2","Commit","style=dashed"),("N3","Commit","style=dashed")],[["N1","N2","N3"]],
     "Cassandra Multi-DC Tunable Consistency",
     [("Client","Client CL=QUORUM","client"),("Coord","Coordinator","router"),("DC1N1","DC1 Node1","primary"),("DC1N2","DC1 Node2","healthy"),("DC2N1","DC2 Node1","meta"),("DC2N2","DC2 Node2","error"),("HH","Hinted Handoff\nOn failure","done"),("Repair","Anti-Entropy Repair","done")],
     [("Client","Coord"),("Coord","DC1N1"),("Coord","DC1N2"),("Coord","DC2N1"),("Coord","DC2N2"),("DC1N1","HH","style=dashed"),("HH","Repair","style=dashed")],[["DC1N1","DC1N2"],["DC2N1","DC2N2"]]),

    ("dynamodb-deep-dive",
     "DynamoDB Single-Table Design",
     [("App","Application","client"),("SDK","DynamoDB SDK AWS","router"),("Table","Single Table\nPK + SK design","primary"),("GSI","GSI Alternate access","healthy"),("DAX","DAX Cache < 1ms","meta"),("Stream","DynamoDB Streams\nChange events","done")],
     [("App","SDK"),("SDK","Table"),("Table","GSI","style=dashed"),("SDK","DAX"),("Table","Stream","style=dashed")],[],
     "DynamoDB Global Tables + Event-Driven",
     [("Client","Client","client"),("GT","Global Tables\nMulti-region","router"),("US","us-east-1 Replica","primary"),("EU","eu-west-1 Replica","healthy"),("AP","ap-south-1 Replica","meta"),("Stream","DynamoDB Streams","error"),("Lambda","Lambda Event handler","done")],
     [("Client","GT"),("GT","US"),("GT","EU"),("GT","AP"),("US","Stream"),("Stream","Lambda"),("Lambda","EU","style=dashed")],[["US","EU","AP"]]),

    ("apache-flink-deep-dive",
     "Flink Batch Processing",
     [("Source","Data Source HDFS/S3","client"),("JM","Job Manager\nOrchestration","router"),("TM1","Task Manager 1\nSlot x4","primary"),("TM2","Task Manager 2\nSlot x4","healthy"),("Sink","Data Sink\nHDFS / DB","done"),("Chk","Checkpoint\nState backup","meta")],
     [("Source","JM"),("JM","TM1"),("JM","TM2"),("TM1","Sink"),("TM2","Sink"),("Chk","TM1","style=dashed"),("Chk","TM2","style=dashed")],[["TM1","TM2"]],
     "Flink Streaming + Exactly-Once",
     [("Kafka","Kafka Source\nPartitioned","client"),("JM","Job Manager\nRecovery","router"),("Op1","Operator 1\nMap/Filter","primary"),("Op2","Operator 2\nWindow Agg","healthy"),("Op3","Operator 3 Join","meta"),("State","RocksDB State\nKeyed","error"),("Chk","Distributed\nCheckpoint","done"),("Sink","Kafka Sink\nIdempotent","done")],
     [("Kafka","JM"),("JM","Op1"),("Op1","Op2"),("Op2","Op3"),("Op3","State"),("State","Chk","style=dashed"),("Op3","Sink"),("Chk","JM","style=dashed")],[["Op1","Op2","Op3"]]),

    ("zookeeper-deep-dive",
     "ZooKeeper Ensemble (Basic)",
     [("Client","Client","client"),("Leader","Leader\nZNode writes","primary"),("F1","Follower 1","healthy"),("F2","Follower 2","meta"),("ZNode","ZNode Tree\n/config /locks","router"),("Watch","Watcher Callback","done")],
     [("Client","Leader"),("Leader","F1"),("Leader","F2"),("Leader","ZNode"),("ZNode","Watch","style=dashed"),("Watch","Client","style=dashed")],[["F1","F2"]],
     "ZooKeeper Distributed Coordination",
     [("Svc1","Service A","client"),("Svc2","Service B","client"),("Leader","ZK Leader","router"),("F1","ZK Follower 1","primary"),("F2","ZK Follower 2","healthy"),("F3","ZK Follower 3","meta"),("Lock","/locks/resource\nEphemeral ZNode","error"),("Config","/config\nShared config","done"),("Elect","/leader-election\nSequential ZNode","done")],
     [("Svc1","Leader"),("Svc2","Leader"),("Leader","F1"),("Leader","F2"),("Leader","F3"),("Leader","Lock"),("Leader","Config"),("Leader","Elect")],[["F1","F2","F3"],["Lock","Config","Elect"]]),

    ("vector-databases-deep-dive",
     "Vector DB — ANN Search",
     [("Query","Query Embedding","client"),("Index","HNSW Index\nGraph-based ANN","router"),("Candidates","Top-K Candidates\nCoarse search","primary"),("Rerank","Re-rank\nExact distance","healthy"),("Results","Top-K Results\n+ metadata","done"),("Store","Vector Store\nFaiss / Pinecone","meta")],
     [("Query","Index"),("Index","Store"),("Store","Candidates"),("Candidates","Rerank"),("Rerank","Results")],[],
     "Vector DB — RAG Pipeline",
     [("Doc","Documents","client"),("Embed","Embedding Model\ntext-embedding-3","router"),("Chunk","Chunk + Index HNSW","primary"),("VDB","Vector DB\nPinecone / Weaviate","healthy"),("Query","User Query","client"),("QEmbed","Query Embed","router"),("Retrieve","Retrieve Top-K chunks","meta"),("LLM","LLM Generate answer","done")],
     [("Doc","Embed"),("Embed","Chunk"),("Chunk","VDB"),("Query","QEmbed"),("QEmbed","Retrieve"),("Retrieve","VDB","style=dashed"),("VDB","LLM"),("LLM","Query","style=dashed")],[]),

    ("cap-pacelc-deep-dive",
     "CP System (Zookeeper / etcd)",
     [("Client","Client","client"),("LB","Load Balancer","router"),("Leader","Leader\nSingle writer","primary"),("F1","Follower 1","healthy"),("F2","Follower 2","meta"),("Quorum","Quorum Ack\nMajority","done"),("Part","Partition\nRefuse writes","error")],
     [("Client","LB"),("LB","Leader"),("Leader","F1"),("Leader","F2"),("F1","Quorum"),("F2","Quorum"),("Part","Leader","style=dashed")],[["F1","F2"]],
     "AP System (DynamoDB / Cassandra)",
     [("Client","Client","client"),("Router","Any Node\nCoordinator","router"),("N1","Node 1","primary"),("N2","Node 2","healthy"),("N3","Node 3","meta"),("Avail","Always Available\nDuring partition","done"),("Repair","Read Repair\nAnti-entropy","error")],
     [("Client","Router"),("Router","N1"),("Router","N2"),("Router","N3"),("N1","Avail"),("Repair","N1","style=dashed"),("Repair","N2","style=dashed"),("Repair","N3","style=dashed")],[["N1","N2","N3"]]),

    ("dns-deep-dive",
     "Recursive DNS Resolution",
     [("Client","Client Browser","client"),("Resolver","Recursive Resolver","router"),("Root","Root DNS 13 servers","primary"),("TLD",".com TLD Nameserver","healthy"),("Auth","Authoritative\nNameserver","meta"),("Cache","Local Cache\nTTL-based","done")],
     [("Client","Resolver"),("Resolver","Cache","style=dashed"),("Resolver","Root"),("Root","TLD"),("TLD","Auth"),("Auth","Resolver","style=dashed"),("Cache","Client","style=dashed")],[],
     "Global Authoritative DNS + Anycast",
     [("User","User","client"),("ISP","ISP Resolver","router"),("Anycast","Anycast IP\nNearest node","primary"),("NS1","NS1 us-east","healthy"),("NS2","NS2 eu-west","meta"),("NS3","NS3 ap-south","error"),("DNSSEC","DNSSEC\nChain of trust","done")],
     [("User","ISP"),("ISP","Anycast"),("Anycast","NS1"),("Anycast","NS2"),("Anycast","NS3"),("DNSSEC","NS1","style=dashed"),("DNSSEC","NS2","style=dashed"),("DNSSEC","NS3","style=dashed")],[["NS1","NS2","NS3"]]),
]

def run_topic(tid, bt, bnodes, bedges, bsame, at, anodes, aedges, asame):
    out_dir = f"{BASE}/{tid}"
    os.makedirs(out_dir, exist_ok=True)
    render(make_dot(bt, bnodes, bedges, bsame), f"{out_dir}/impl-basic.png")
    render(make_dot(at, anodes, aedges, asame), f"{out_dir}/impl-advanced.png")

for row in TOPICS:
    run_topic(row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8])

print("ALL DONE")
