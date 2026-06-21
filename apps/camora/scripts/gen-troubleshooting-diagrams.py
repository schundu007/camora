#!/usr/bin/env python3
import graphviz, os

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue',
            fontsize='12', penwidth='1.5', height='0.45', margin='0.15,0.08')
EDGE = dict(fontname='Helvetica Neue', fontsize='10', penwidth='1.5')
C = {
    'navy':   ('#dbeafe', '#3b82f6', '#1e40af'),
    'gold':   ('#fef3c7', '#f59e0b', '#92400e'),
    'green':  ('#dcfce7', '#22c55e', '#166534'),
    'red':    ('#fee2e2', '#ef4444', '#991b1b'),
    'purple': ('#e0e7ff', '#6366f1', '#3730a3'),
    'teal':   ('#ccfbf1', '#14b8a6', '#115e59'),
    'cyan':   ('#cffafe', '#06b6d4', '#155e75'),
    'gray':   ('#f3f4f6', '#6b7280', '#374151'),
}
def n(g, name, label, c='navy'):
    g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)
def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)
def base_graph(name, title, rankdir='LR'):
    g = graphviz.Digraph(name, format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.25', nodesep='0.5', ranksep='0.45',
           splines='spline', rankdir=rankdir,
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    return g


OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'troubleshooting')
os.makedirs(OUT, exist_ok=True)


# ─── ts-ec2-unresponsive ──────────────────────────────────────────────────────

def diag_ec2_unresponsive_layers():
    g = base_graph('ec2_unresponsive_layers', 'EC2 Unresponsive — Diagnosis Layers', rankdir='TB')
    n(g, 'start',   'SSH Timeout\nor Refused', 'red')
    n(g, 'sg',      'Layer 1: Network\nSecurity Group / NACL\nRoute Table / EIP', 'navy')
    n(g, 'hw',      'Layer 2: Hardware\nSystem Status Check\n→ stop+start (new host)', 'gold')
    n(g, 'os',      'Layer 3: OS\nSystem Log / Serial Console\nDisk full / OOM / Kernel panic', 'purple')
    n(g, 'rescue',  'Layer 4: Rescue\nDetach EBS → mount on\nrescue instance → fix → reattach', 'teal')
    n(g, 'ok',      'SSH Restored', 'green')
    e(g, 'start', 'sg',    'check first')
    e(g, 'sg',    'hw',    'SG ok')
    e(g, 'hw',    'os',    'check ok')
    e(g, 'os',    'rescue','serial n/a')
    e(g, 'rescue','ok',    'fixed')
    g.render(os.path.join(OUT, 'ec2-unresponsive-layers'), cleanup=True)
    print('Generated: ec2-unresponsive-layers')


def diag_ec2_unresponsive_flow():
    g = base_graph('ec2_unresponsive_flow', 'EC2 Unresponsive — Stop vs Reboot Decision', rankdir='LR')
    n(g, 'issue',   'Instance\nUnreachable', 'red')
    n(g, 'sys',     'System Status\nCheck Failing?', 'gold')
    n(g, 'inst',    'Instance Status\nCheck Failing?', 'gold')
    n(g, 'reboot',  'Reboot\n(same host)', 'navy')
    n(g, 'stopstart','Stop + Start\n(new host)', 'green')
    n(g, 'serial',  'Serial Console\n+ System Log\ndiagnose OS', 'purple')
    n(g, 'sgcheck', 'VPC / SG / NACL\ncheck + VPC\nFlow Logs', 'teal')
    e(g, 'issue',    'sys',      'check AWS console')
    e(g, 'sys',      'stopstart','YES — hardware')
    e(g, 'sys',      'inst',     'NO')
    e(g, 'inst',     'serial',   'YES — OS issue')
    e(g, 'inst',     'sgcheck',  'NO — both ok')
    e(g, 'serial',   'reboot',   'after fix')
    g.render(os.path.join(OUT, 'ec2-unresponsive-flow'), cleanup=True)
    print('Generated: ec2-unresponsive-flow')


# ─── ts-rds-cpu-spike ─────────────────────────────────────────────────────────

def diag_rds_cpu_spike():
    g = base_graph('rds_cpu_spike', 'RDS CPU Spike — Root Cause Taxonomy', rankdir='LR')
    n(g, 'spike',  'RDS CPU\n> 80%', 'red')
    n(g, 'queries','Slow / Missing\nIndex Queries\nperformance_schema\nPG stat_statements', 'navy')
    n(g, 'conns',  'Connection\nBurst\nThreads_running\nvs Threads_connected', 'gold')
    n(g, 'repl',   'Replica\nPromotion /\nReplication Lag\nbinlog replay burst', 'purple')
    n(g, 'maint',  'Maintenance\nEvent\nAWS-managed vacuum,\nstats gather, backup', 'gray')
    n(g, 'fix_q',  'Add Index\nRewrite Query\nRead Replica', 'green')
    n(g, 'fix_c',  'Connection Pool\nLimit App Threads\nRDS Proxy', 'green')
    n(g, 'fix_r',  'Resize / Multi-AZ\nSchedule Failover', 'green')
    e(g, 'spike', 'queries', 'Enhanced Monitoring')
    e(g, 'spike', 'conns',   'CloudWatch\nDatabaseConnections')
    e(g, 'spike', 'repl',    'ReplicaLag metric')
    e(g, 'spike', 'maint',   'RDS Events log')
    e(g, 'queries','fix_q')
    e(g, 'conns',  'fix_c')
    e(g, 'repl',   'fix_r')
    g.render(os.path.join(OUT, 'rds-cpu-spike'), cleanup=True)
    print('Generated: rds-cpu-spike')


# ─── ts-elb-5xx-errors ───────────────────────────────────────────────────────

def diag_elb_5xx():
    g = base_graph('elb_5xx', 'ELB 5xx Errors — Source Attribution', rankdir='LR')
    n(g, 'client',  'Client\nRequest', 'gray')
    n(g, 'elb',     'ALB / NLB', 'navy')
    n(g, 'h502',    '502 Bad Gateway\nELB reached backend;\nbackend sent bad\nHTTP response', 'red')
    n(g, 'h503',    '503 Service\nUnavailable\nNo healthy targets\nin target group', 'red')
    n(g, 'h504',    '504 Gateway\nTimeout\nBackend did not\nrespond in time', 'red')
    n(g, 'h5elb',   '5xx from ELB\nitself\n(ELB config / surge\nqueue overflow)', 'gold')
    n(g, 'tg',      'Target Group\nHealth Checks', 'teal')
    n(g, 'fix',     'Fix Targets\nScale / Fix\nResponse Format\nIncrease Timeout', 'green')
    e(g, 'client', 'elb')
    e(g, 'elb',    'h502',  'backend unhealthy\nresponse')
    e(g, 'elb',    'h503',  'all targets\nunhealthy')
    e(g, 'elb',    'h504',  'idle timeout\nexceeded')
    e(g, 'elb',    'h5elb', 'ELB-side\nerror')
    e(g, 'elb',    'tg',    'health checks')
    e(g, 'h502',   'fix')
    e(g, 'h503',   'fix')
    e(g, 'h504',   'fix')
    g.render(os.path.join(OUT, 'elb-5xx-errors'), cleanup=True)
    print('Generated: elb-5xx-errors')


# ─── ts-dns-failures ─────────────────────────────────────────────────────────

def diag_dns_failures():
    g = base_graph('dns_failures', 'DNS Failure Diagnosis Path', rankdir='TB')
    n(g, 'symptom', 'App: "cannot\nresolve hostname"', 'red')
    n(g, 'local',   'Local DNS Cache\nnslookup / dig @127.0.0.1\nflush cache?', 'navy')
    n(g, 'resolver','VPC Resolver\n169.254.169.253\ndig @169.254.169.253', 'navy')
    n(g, 'r53',     'Route 53\nRecord exists?\nTTL expired?\nAlias target healthy?', 'gold')
    n(g, 'ext',     'External DNS\nUpstream resolver\nNXDOMAIN vs SERVFAIL', 'purple')
    n(g, 'fix_ttl', 'Lower TTL\nbefore changes;\ncheck health-check\nassociation', 'green')
    n(g, 'fix_sg',  'Allow UDP/TCP 53\nin SG + NACL\nto resolver IP', 'green')
    e(g, 'symptom', 'local',    'step 1')
    e(g, 'local',   'resolver', 'local ok')
    e(g, 'resolver','r53',      'resolver ok')
    e(g, 'r53',     'ext',      'R53 ok')
    e(g, 'local',   'fix_sg',   'blocked')
    e(g, 'r53',     'fix_ttl',  'record missing\nor stale')
    g.render(os.path.join(OUT, 'dns-failures'), cleanup=True)
    print('Generated: dns-failures')


# ─── ts-vpc-connectivity ─────────────────────────────────────────────────────

def diag_vpc_connectivity():
    g = base_graph('vpc_connectivity', 'VPC Connectivity Troubleshooting Matrix', rankdir='LR')
    n(g, 'src',    'Source\nInstance / Service', 'navy')
    n(g, 'sg_s',   'Source SG\nAllow outbound\nto dest port?', 'gold')
    n(g, 'nacl_s', 'Source Subnet\nNACL\nAllow outbound\n+ ephemeral return?', 'gold')
    n(g, 'rt_s',   'Route Table\nRoute to dest\nvia IGW/TGW/VPN?', 'gold')
    n(g, 'rt_d',   'Dest Route Table\nReturn route\nback to source?', 'gold')
    n(g, 'nacl_d', 'Dest Subnet\nNACL\nAllow inbound?', 'gold')
    n(g, 'sg_d',   'Dest SG\nAllow inbound\nfrom source?', 'gold')
    n(g, 'dst',    'Destination\nInstance / Service', 'green')
    n(g, 'flowlog','VPC Flow Logs\nACCEPT = SG ok\nREJECT = SG/NACL\nno record = routing', 'teal')
    e(g, 'src',    'sg_s')
    e(g, 'sg_s',   'nacl_s')
    e(g, 'nacl_s', 'rt_s')
    e(g, 'rt_s',   'rt_d')
    e(g, 'rt_d',   'nacl_d')
    e(g, 'nacl_d', 'sg_d')
    e(g, 'sg_d',   'dst')
    e(g, 'flowlog','sg_s', 'diagnose', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'vpc-connectivity'), cleanup=True)
    print('Generated: vpc-connectivity')


# ─── ts-staging-passes-prod-fails ────────────────────────────────────────────

def diag_staging_prod_gap():
    g = base_graph('staging_prod_gap', 'Staging Passes / Prod Fails — Parity Gap Analysis', rankdir='TB')
    n(g, 'center', 'Production\nFailure', 'red')
    n(g, 'config', 'Config / Secrets\nDiff\nenv vars, feature\nflags, API keys', 'navy')
    n(g, 'data',   'Data Volume\n& Shape\nReal load, edge-case\nrows, encoding', 'navy')
    n(g, 'infra',  'Infrastructure\nDiff\ninstance size, AZ,\nVPC peering, IAM', 'navy')
    n(g, 'deps',   'Third-party\nDependencies\nprod API keys,\nrate limits, TLS certs', 'navy')
    n(g, 'timing', 'Timing /\nConcurrency\nhigh concurrency,\nrace conditions', 'navy')
    n(g, 'fix',    'Parity Fixes\nTerraform parity,\n.env audit,\nload test in staging', 'green')
    e(g, 'config', 'center', 'causes')
    e(g, 'data',   'center', 'causes')
    e(g, 'infra',  'center', 'causes')
    e(g, 'deps',   'center', 'causes')
    e(g, 'timing', 'center', 'causes')
    e(g, 'center', 'fix',    'resolve via')
    g.render(os.path.join(OUT, 'staging-prod-gap'), cleanup=True)
    print('Generated: staging-prod-gap')


# ─── ts-zero-downtime-schema-change ──────────────────────────────────────────

def diag_zero_downtime_schema():
    g = base_graph('zero_downtime_schema', 'Zero-Downtime Schema Migration — Expand/Contract Pattern', rankdir='LR')
    n(g, 'p1',   'Phase 1: Expand\nADD column nullable\n(no app change yet)', 'navy')
    n(g, 'p2',   'Phase 2: Migrate\nBackfill data\nin batches (no lock)', 'gold')
    n(g, 'p3',   'Phase 3: Deploy App\nWrite to both old\n+ new column', 'teal')
    n(g, 'p4',   'Phase 4: Verify\nAll rows populated;\nswitch reads to\nnew column', 'purple')
    n(g, 'p5',   'Phase 5: Contract\nDrop old column\n(small ALTER, fast)', 'green')
    n(g, 'risk', 'Anti-pattern\nALTER TABLE\non large table\n→ table lock', 'red')
    e(g, 'p1', 'p2')
    e(g, 'p2', 'p3')
    e(g, 'p3', 'p4')
    e(g, 'p4', 'p5')
    e(g, 'risk', 'p1', 'replace with', '#dc2626', 'dashed')
    g.render(os.path.join(OUT, 'zero-downtime-schema'), cleanup=True)
    print('Generated: zero-downtime-schema')


# ─── ts-alerts-stopped-firing ────────────────────────────────────────────────

def diag_alerts_stopped_firing():
    g = base_graph('alerts_stopped_firing', 'Alerts Stopped Firing — Failure Points', rankdir='TB')
    n(g, 'alert',   'Alert Expected\nbut Silent', 'red')
    n(g, 'metric',  'Metric Gap\nAgent crashed?\nScrape target down?\nMetrics missing?', 'navy')
    n(g, 'rule',    'Alert Rule\nChanged?\nThreshold too high?\nFor: duration missed?', 'gold')
    n(g, 'route',   'AlertManager\nRouting\nInhibit / silence\nroute misconfigured?', 'purple')
    n(g, 'notify',  'Notification\nChannel\nSlack webhook expired?\nPagerDuty key rotated?', 'teal')
    n(g, 'ok',      'Root Cause Found\n+ Remediated', 'green')
    e(g, 'alert',  'metric',  'check data')
    e(g, 'alert',  'rule',    'check rules')
    e(g, 'alert',  'route',   'check routing')
    e(g, 'alert',  'notify',  'check delivery')
    e(g, 'metric', 'ok')
    e(g, 'rule',   'ok')
    e(g, 'route',  'ok')
    e(g, 'notify', 'ok')
    g.render(os.path.join(OUT, 'alerts-stopped-firing'), cleanup=True)
    print('Generated: alerts-stopped-firing')


def diag_alertmanager_pipeline():
    g = base_graph('alertmanager_pipeline', 'Prometheus Alert Pipeline — Scrape to Notification', rankdir='LR')
    n(g, 'target',  'Scrape Target\n(exporter /\napp /metrics)', 'gray')
    n(g, 'prom',    'Prometheus\nScrape + Evaluate\nRecording Rules', 'navy')
    n(g, 'tsdb',    'TSDB\nLocal or\nRemote Write', 'navy')
    n(g, 'rules',   'Alert Rules\nExpr threshold\nfor: 5m labels', 'gold')
    n(g, 'pending', 'PENDING state\n(for: duration\nnot yet met)', 'gold')
    n(g, 'firing',  'FIRING state\nSent to\nAlertmanager', 'red')
    n(g, 'am',      'AlertManager\nGroup → Route\nInhibit → Silence', 'purple')
    n(g, 'recv',    'Receiver\nSlack / PD /\nEmail / Webhook', 'green')
    e(g, 'target', 'prom',    'scrape 15s')
    e(g, 'prom',   'tsdb')
    e(g, 'prom',   'rules',   'evaluate')
    e(g, 'rules',  'pending')
    e(g, 'pending','firing',  'threshold\nmet for duration')
    e(g, 'firing', 'am',      'HTTP POST')
    e(g, 'am',     'recv',    'notify')
    g.render(os.path.join(OUT, 'alertmanager-pipeline'), cleanup=True)
    print('Generated: alertmanager-pipeline')


# ─── ts-slow-queries ─────────────────────────────────────────────────────────

def diag_slow_queries():
    g = base_graph('slow_queries', 'Slow Query Diagnosis — Identify → Analyze → Fix', rankdir='LR')
    n(g, 'detect',  'Detect\nSlow Query Log\npg_stat_statements\nperformance_schema', 'navy')
    n(g, 'explain', 'EXPLAIN ANALYZE\nSeq Scan?\nHash Join cost?\nRows estimate off?', 'gold')
    n(g, 'index',   'Missing Index\nHigh cost\nSeq Scan on\nlarge table', 'red')
    n(g, 'stats',   'Stale Statistics\nPlanner chose\nbad plan\nANALYZE / autovacuum', 'red')
    n(g, 'nplusone','N+1 Query\nORM eager load\nmissing', 'red')
    n(g, 'locks',   'Lock Wait\npg_locks /\ninnodb_trx\nlong-running txn', 'purple')
    n(g, 'fix_idx', 'CREATE INDEX\nCONCURRENTLY\nCovering index', 'green')
    n(g, 'fix_stat','ANALYZE table\nTune autovacuum\ncost thresholds', 'green')
    n(g, 'fix_orm', 'Add .includes()\nor JOIN\nin ORM query', 'green')
    e(g, 'detect',  'explain')
    e(g, 'explain', 'index',   'Seq Scan')
    e(g, 'explain', 'stats',   'bad estimate')
    e(g, 'explain', 'nplusone','many small\nqueries')
    e(g, 'explain', 'locks',   'waiting')
    e(g, 'index',   'fix_idx')
    e(g, 'stats',   'fix_stat')
    e(g, 'nplusone','fix_orm')
    g.render(os.path.join(OUT, 'slow-queries'), cleanup=True)
    print('Generated: slow-queries')


# ─── ts-connection-pool-exhausted ────────────────────────────────────────────

def diag_conn_pool():
    g = base_graph('conn_pool', 'Connection Pool Exhaustion — Causes & Remedies', rankdir='LR')
    n(g, 'symptom','Timeout acquiring\nconnection from\npool', 'red')
    n(g, 'leak',   'Connection Leak\nConn not returned\nafter use (missing\nfinally/close)', 'red')
    n(g, 'burst',  'Traffic Burst\nThread count >\npool max_size', 'gold')
    n(g, 'slow',   'Slow Queries\nConns held while\nDB query runs\n(no timeout set)', 'gold')
    n(g, 'config', 'Wrong Pool Config\nmax_size too small\nfor instance count\n× thread count', 'navy')
    n(g, 'proxy',  'RDS Proxy /\nPgBouncer\nPool at DB layer\nmultiplexing', 'teal')
    n(g, 'fix_lk', 'Fix: Use context\nmanager / try-finally\nvalidate on checkout', 'green')
    n(g, 'fix_sz', 'Fix: Right-size pool\nmax = (cores × 2)+1\nper instance', 'green')
    e(g, 'symptom','leak',   'check idle\nconns > max')
    e(g, 'symptom','burst',  'check thread\nvs pool metrics')
    e(g, 'symptom','slow',   'check query\nduration')
    e(g, 'symptom','config', 'check pool\nconfiguration')
    e(g, 'leak',   'fix_lk')
    e(g, 'burst',  'proxy',  'scale via')
    e(g, 'config', 'fix_sz')
    g.render(os.path.join(OUT, 'connection-pool-exhausted'), cleanup=True)
    print('Generated: connection-pool-exhausted')


# ─── ts-memory-leak-diagnosis ────────────────────────────────────────────────

def diag_memory_leak():
    g = base_graph('memory_leak', 'Memory Leak Diagnosis — Observe → Profile → Fix', rankdir='LR')
    n(g, 'observe', 'Observe\nRSS growing\nHeap not GC-ing\nOOMKilled pods', 'red')
    n(g, 'metrics', 'Metrics\njvm_memory_used\nprocess_resident_memory\nGC pause frequency', 'navy')
    n(g, 'heap',    'Heap Dump\njmap -dump (JVM)\nheapdump (Node)\npy-spy (Python)', 'gold')
    n(g, 'analyze', 'Analyzer\nEclipse MAT (JVM)\nChrome DevTools\nGDB / Valgrind', 'purple')
    n(g, 'root',    'Root Cause\nCache unbounded\nListener not\nremoved\nThread local leak', 'red')
    n(g, 'fix',     'Fix\nBound cache size\nRemove listeners\nWeak references\nSet GC flags', 'green')
    e(g, 'observe', 'metrics',  'instrument')
    e(g, 'metrics', 'heap',     'confirm\ngrowth')
    e(g, 'heap',    'analyze',  'load dump')
    e(g, 'analyze', 'root',     'find\nretained set')
    e(g, 'root',    'fix')
    g.render(os.path.join(OUT, 'memory-leak-diagnosis'), cleanup=True)
    print('Generated: memory-leak-diagnosis')


# ─── ts-pod-crashloopbackoff ─────────────────────────────────────────────────

def diag_crashloopbackoff():
    g = base_graph('crashloopbackoff', 'CrashLoopBackOff — Root Cause Decision Tree', rankdir='TB')
    n(g, 'clbo',   'CrashLoopBackOff\nkubectl describe pod\nkubectl logs --previous', 'red')
    n(g, 'exit1',  'Exit Code 1\nApp error\ncheck logs for\nexception / panic', 'red')
    n(g, 'exit137','Exit Code 137\n(OOMKilled)\nMemory limit\ntoo low', 'gold')
    n(g, 'exit139','Exit Code 139\nSegfault\nC/native library\nbug', 'purple')
    n(g, 'probe',  'Liveness Probe\nFailing\nPath wrong?\nTimeout too short?\nApp startup slow?', 'navy')
    n(g, 'config', 'Bad Config\nMissing env var\nSecret not mounted\nConfigMap typo', 'navy')
    n(g, 'fix_app','Fix App\nCheck startup\nlogs, fix\nconfiguration', 'green')
    n(g, 'fix_mem','Raise memory\nlimit or fix\nmemory leak', 'green')
    n(g, 'fix_prb','Add\ninitialDelaySeconds\nor fix probe path', 'green')
    e(g, 'clbo',   'exit1',   'exit 1')
    e(g, 'clbo',   'exit137', 'exit 137')
    e(g, 'clbo',   'exit139', 'exit 139')
    e(g, 'clbo',   'probe',   'probe fails')
    e(g, 'clbo',   'config',  'env/mount\nerror')
    e(g, 'exit1',  'fix_app')
    e(g, 'config', 'fix_app')
    e(g, 'exit137','fix_mem')
    e(g, 'probe',  'fix_prb')
    g.render(os.path.join(OUT, 'pod-crashloopbackoff'), cleanup=True)
    print('Generated: pod-crashloopbackoff')


# ─── ts-pod-pending-scheduling ───────────────────────────────────────────────

def diag_pod_pending():
    g = base_graph('pod_pending', 'Pod Stuck Pending — Scheduler Failure Points', rankdir='LR')
    n(g, 'pending', 'Pod: Pending\nkubectl describe pod\nEvents section', 'red')
    n(g, 'res',     'Insufficient\nResources\nNo node has\nenough CPU/RAM', 'gold')
    n(g, 'taint',   'Taint /\nToleration\nNode tainted,\npod missing\ntoleration', 'gold')
    n(g, 'aff',     'Node Affinity /\nAnti-affinity\nLabel mismatch\nor pod spread\nconstraint', 'navy')
    n(g, 'pvc',     'PVC Unbound\nNo PV available\nin correct AZ', 'purple')
    n(g, 'fix_res', 'Add node /\nHPA / CA\ncluster-autoscaler\nadd capacity', 'green')
    n(g, 'fix_aff', 'Fix affinity\nlabels or\ntoleration spec', 'green')
    n(g, 'fix_pvc', 'Check StorageClass\n+ AZ for PV\nor use dynamic\nprovisioning', 'green')
    e(g, 'pending', 'res',     'Insufficient cpu')
    e(g, 'pending', 'taint',   'node(s) had\ntaint')
    e(g, 'pending', 'aff',     'affinity\nno match')
    e(g, 'pending', 'pvc',     'pod has\nvolume')
    e(g, 'res',     'fix_res')
    e(g, 'taint',   'fix_aff')
    e(g, 'aff',     'fix_aff')
    e(g, 'pvc',     'fix_pvc')
    g.render(os.path.join(OUT, 'pod-pending-scheduling'), cleanup=True)
    print('Generated: pod-pending-scheduling')


# ─── ts-hpa-not-scaling ──────────────────────────────────────────────────────

def diag_hpa_not_scaling():
    g = base_graph('hpa_not_scaling', 'HPA Not Scaling — Signal → Decision → Action', rankdir='LR')
    n(g, 'hpa',     'HPA Controller\nkubectl describe hpa\ncheck Conditions', 'navy')
    n(g, 'metric',  'Metric Source\nmetrics-server\nor custom adapter\nrunning?', 'gold')
    n(g, 'thresh',  'Threshold Not\nMet\nactual CPU <\ntarget %\ncalculation', 'gold')
    n(g, 'maxrep',  'Already at\nmaxReplicas\nscale ceiling\nhit', 'red')
    n(g, 'cooldown','Scale-down\nCooldown\nstabilizationWindow\ndefault 5min', 'purple')
    n(g, 'noroom',  'No Schedulable\nNodes\nCA not triggered\nor lagging', 'red')
    n(g, 'fix_ms',  'Install metrics-server\nor Prometheus\nAdapter', 'green')
    n(g, 'fix_max', 'Raise maxReplicas\nor add Cluster\nAutoscaler', 'green')
    n(g, 'fix_cd',  'Tune stabilization\nWindow or\nscaleDown behavior', 'green')
    e(g, 'hpa',     'metric',  'AbleToScale\ncondition')
    e(g, 'hpa',     'thresh',  'ScalingActive')
    e(g, 'hpa',     'maxrep',  'at max')
    e(g, 'hpa',     'cooldown','scaling\nsuppressed')
    e(g, 'hpa',     'noroom',  'pods pending')
    e(g, 'metric',  'fix_ms')
    e(g, 'maxrep',  'fix_max')
    e(g, 'cooldown','fix_cd')
    g.render(os.path.join(OUT, 'hpa-not-scaling'), cleanup=True)
    print('Generated: hpa-not-scaling')


if __name__ == '__main__':
    diag_ec2_unresponsive_layers()
    diag_ec2_unresponsive_flow()
    diag_rds_cpu_spike()
    diag_elb_5xx()
    diag_dns_failures()
    diag_vpc_connectivity()
    diag_staging_prod_gap()
    diag_zero_downtime_schema()
    diag_alerts_stopped_firing()
    diag_alertmanager_pipeline()
    diag_slow_queries()
    diag_conn_pool()
    diag_memory_leak()
    diag_crashloopbackoff()
    diag_pod_pending()
    diag_hpa_not_scaling()
    print('All troubleshooting diagrams generated.')
