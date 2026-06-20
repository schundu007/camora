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
    g.attr(bgcolor='#ffffff', dpi='120', pad='0.25', nodesep='0.5', ranksep='0.45',
           splines='spline', rankdir=rankdir,
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    return g


OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'war-stories')
os.makedirs(OUT, exist_ok=True)


# ─────────────────────────────────────────────────────────────────────
# ws-cascading-failure
# ─────────────────────────────────────────────────────────────────────
def diag_cascading_failure_flow():
    g = base_graph('cascading_failure_flow', 'Cascading Failure — Thread Pool Exhaustion Chain', rankdir='LR')
    n(g, 'user',    'Users\n(incoming traffic)', 'gray')
    n(g, 'svcA',    'Service A\n(upstream caller)', 'navy')
    n(g, 'svcB',    'Service B\n(checkout API)', 'red')
    n(g, 'svcC',    'Service C\n(upstream caller)', 'navy')
    n(g, 'payment', 'Payment Processor\n(slow: 8s responses)', 'gold')
    n(g, 'poolB',   'Thread Pool B\nFULL — exhausted\n(30s timeout × N threads)', 'red')
    n(g, 'cb',      'Circuit Breaker\n(missing — should open)', 'purple')
    n(g, 'fix1',    'FIX: short timeouts\n(200–500ms)', 'green')
    n(g, 'fix2',    'FIX: bulkhead pools\nper downstream', 'green')
    n(g, 'fix3',    'FIX: circuit breaker\n+ jittered retry', 'green')
    e(g, 'user',    'svcA')
    e(g, 'user',    'svcC')
    e(g, 'svcA',    'svcB')
    e(g, 'svcC',    'svcB')
    e(g, 'svcB',    'payment', 'calls', '#ef4444')
    e(g, 'payment', 'poolB',   'slow response\nbacks up threads', '#ef4444')
    e(g, 'poolB',   'svcB',    '503 back-pressure', '#ef4444')
    e(g, 'poolB',   'svcA',    'timeout cascade', '#ef4444', 'dashed')
    e(g, 'poolB',   'svcC',    'timeout cascade', '#ef4444', 'dashed')
    e(g, 'cb',      'payment', 'fast-fail\nafter N errors', '#22c55e', 'dashed')
    e(g, 'fix1',    'svcB',    '', '#94a3b8', 'dotted')
    e(g, 'fix2',    'svcB',    '', '#94a3b8', 'dotted')
    e(g, 'fix3',    'cb',      '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'cascading-failure-flow'), cleanup=True)
    print('Generated: cascading-failure-flow')


def diag_cascading_failure_recovery():
    g = base_graph('cascading_failure_recovery', 'Cascading Failure — Recovery Order & Circuit Breaker States', rankdir='TB')
    n(g, 'detect',  'Step 1: Detect\nthread pool metrics\ndistributed traces', 'navy')
    n(g, 'break',   'Step 2: Break Loop\n503 + Retry-After\nstop retry amplification', 'gold')
    n(g, 'root',    'Step 3: Fix Root\npayment processor\nrecovers / is bypassed', 'green')
    n(g, 'drain',   'Step 4: Drain Queues\nbackoff + jitter\nretry queue clears', 'teal')
    n(g, 'probe',   'Step 5: Half-Open\ncircuit breaker probes\nhealth of dependency', 'purple')
    n(g, 'restore', 'Step 6: Restore Traffic\ncircuit closes\nnormal operation', 'green')
    e(g, 'detect',  'break')
    e(g, 'break',   'root')
    e(g, 'root',    'drain')
    e(g, 'drain',   'probe')
    e(g, 'probe',   'restore')
    g.render(os.path.join(OUT, 'cascading-failure-recovery'), cleanup=True)
    print('Generated: cascading-failure-recovery')


# ─────────────────────────────────────────────────────────────────────
# ws-region-outage
# ─────────────────────────────────────────────────────────────────────
def diag_region_outage():
    g = base_graph('region_outage', 'Single-Region Auth Dependency — Global Outage from us-east-1 Failure', rankdir='TB')
    with g.subgraph(name='cluster_global') as sg:
        sg.attr(label='4 AWS Regions (compute running)', style='dashed', color='#94a3b8')
        n(sg, 'ue1', 'us-east-1\ncompute OK', 'navy')
        n(sg, 'uw2', 'us-west-2\ncompute OK', 'navy')
        n(sg, 'eu1', 'eu-west-1\ncompute OK', 'navy')
        n(sg, 'ap1', 'ap-southeast-1\ncompute OK', 'navy')
    n(g, 'auth',  'Auth Introspection\nEndpoint\n(us-east-1 ONLY)', 'red')
    n(g, 'iam',   'us-east-1 IAM\n(degraded)', 'red')
    n(g, 'fail',  'ALL 4 REGIONS\nauth failures\n(15s timeout per req)', 'red')
    n(g, 'fix1',  'FIX: offline JWT\nRS256 local validation\nno network call', 'green')
    n(g, 'fix2',  'FIX: regional auth\nendpoint per region\n+ circuit breaker', 'green')
    e(g, 'ue1',  'auth', 'introspect', '#ef4444')
    e(g, 'uw2',  'auth', 'introspect', '#ef4444')
    e(g, 'eu1',  'auth', 'introspect', '#ef4444')
    e(g, 'ap1',  'auth', 'introspect', '#ef4444')
    e(g, 'iam',  'auth', 'IAM degraded\nblocks ALB', '#ef4444')
    e(g, 'auth', 'fail', 'all regions\ntimeout', '#ef4444')
    e(g, 'fix1', 'auth', '', '#94a3b8', 'dotted')
    e(g, 'fix2', 'auth', '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'region-outage-dependency'), cleanup=True)
    print('Generated: region-outage-dependency')


# ─────────────────────────────────────────────────────────────────────
# ws-thundering-herd
# ─────────────────────────────────────────────────────────────────────
def diag_thundering_herd():
    g = base_graph('thundering_herd', 'Thundering Herd — Cold Cache → Database Overload', rankdir='LR')
    n(g, 'maint',   'Cache Cluster\nRestart (3 AM)\nall keys evicted', 'gold')
    n(g, 'apps',    'Application Fleet\n(all 40 nodes)\ncache miss = 100%', 'red')
    n(g, 'rds',     'RDS Primary\n47x normal query rate\nmax_connections hit', 'red')
    n(g, 'replicas','Read Replicas\npool exhausted\nqueue growing', 'red')
    n(g, 'warm',    'FIX A: Blue-Green Cache\nwarm new cluster first\nthen switch endpoint', 'green')
    n(g, 'rolling', 'FIX B: Rolling Node Replace\n1/N keyspace cold at a time\nconsistent hashing', 'green')
    n(g, 'coalesce','FIX C: Request Coalescing\ncollapse concurrent misses\n1 DB call per key', 'teal')
    e(g, 'maint',    'apps',    'cold start', '#ef4444')
    e(g, 'apps',     'rds',     '47x queries\nsimultaneous', '#ef4444')
    e(g, 'apps',     'replicas','read traffic\nspills over', '#ef4444', 'dashed')
    e(g, 'warm',     'maint',   '', '#94a3b8', 'dotted')
    e(g, 'rolling',  'maint',   '', '#94a3b8', 'dotted')
    e(g, 'coalesce', 'apps',    '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'thundering-herd-cold-cache'), cleanup=True)
    print('Generated: thundering-herd-cold-cache')


# ─────────────────────────────────────────────────────────────────────
# ws-cache-stampede
# ─────────────────────────────────────────────────────────────────────
def diag_cache_stampede():
    g = base_graph('cache_stampede', 'Cache Stampede — Synchronized TTL Expiry at Flash Sale', rankdir='LR')
    n(g, 'noon',   'Noon Flash Sale\nAll TTLs expire\nsimultaneously', 'red')
    n(g, 'servers','200 App Servers\nall cache miss\nfor same keys', 'red')
    n(g, 'db',     'PostgreSQL DB\n4,000 concurrent queries\n600 queue depth', 'red')
    n(g, 'retry',  'Retry Loop\nservers timeout\nretry → 8,000 queries', 'red')
    n(g, 'jitter', 'FIX A: TTL Jitter\nbase_ttl + rand(0, 10%)\nstagger expiry', 'green')
    n(g, 'stale',  'FIX B: Stale-While-Revalidate\nserve stale, refresh async\nno sync miss latency', 'green')
    n(g, 'lock',   'FIX C: Cache Lock\nfirst miss holds lock\nothers serve stale', 'teal')
    n(g, 'prewarm','FIX D: Pre-Warm\nbatch seed before\nflash sale starts', 'purple')
    e(g, 'noon',    'servers',  'simultaneous\nexpiry', '#ef4444')
    e(g, 'servers', 'db',       '200x queries\nper key', '#ef4444')
    e(g, 'db',      'retry',    'timeout → retry', '#ef4444')
    e(g, 'jitter',  'noon',     '', '#94a3b8', 'dotted')
    e(g, 'stale',   'servers',  '', '#94a3b8', 'dotted')
    e(g, 'lock',    'servers',  '', '#94a3b8', 'dotted')
    e(g, 'prewarm', 'noon',     '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'cache-stampede-flash-sale'), cleanup=True)
    print('Generated: cache-stampede-flash-sale')


# ─────────────────────────────────────────────────────────────────────
# ws-accidental-delete
# ─────────────────────────────────────────────────────────────────────
def diag_accidental_delete():
    g = base_graph('accidental_delete', 'Accidental DELETE — Recovery Path via PITR', rankdir='LR')
    n(g, 'script',  'Cleanup Script\nruns against prod\n(wrong DSN env var)', 'red')
    n(g, 'delete',  'DELETE 2.3M rows\nuser_preferences\n4.1 seconds', 'red')
    n(g, 'detect',  'Health Check Fails\nzero rows found\nalert fires', 'gold')
    n(g, 'pitr',    'RDS PITR\nrestore to T-5min\nnew DB instance', 'navy')
    n(g, 'extract', 'Extract Deleted Rows\nfrom recovered instance\nINSERT ON CONFLICT', 'teal')
    n(g, 'prod',    'Production DB\nrows restored\nservice healthy', 'green')
    n(g, 'prevent', 'Prevention\nsoft delete + PITR\nenabled + DSN guard', 'purple')
    e(g, 'script',  'delete',  'wrong env var', '#ef4444')
    e(g, 'delete',  'detect')
    e(g, 'detect',  'pitr',    'initiate PITR', '#3b82f6')
    e(g, 'pitr',    'extract')
    e(g, 'extract', 'prod',    'replay rows', '#22c55e')
    e(g, 'prevent', 'prod',    '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'accidental-delete-recovery'), cleanup=True)
    print('Generated: accidental-delete-recovery')


def diag_rto_rpo():
    g = base_graph('rto_rpo', 'RPO vs RTO — Backup Strategy Tradeoffs', rankdir='LR')
    n(g, 'incident', 'Incident\n(data loss event)', 'red')
    n(g, 'rpo',      'RPO\n(Recovery Point Objective)\nmax data loss window\ne.g. 1 hour', 'gold')
    n(g, 'rto',      'RTO\n(Recovery Time Objective)\nmax downtime allowed\ne.g. 4 hours', 'navy')
    n(g, 'snap',     'Automated Snapshots\nRPO: up to 24h\nRTO: 15-30 min', 'gray')
    n(g, 'pitr_node','PITR (WAL replay)\nRPO: seconds\nRTO: longer (replay time)', 'teal')
    n(g, 'softdel',  'Soft Delete\nRPO: near-zero\nRTO: one UPDATE stmt', 'green')
    e(g, 'incident', 'rpo')
    e(g, 'incident', 'rto')
    e(g, 'snap',     'rpo', 'worst-case 24h', '#f59e0b', 'dashed')
    e(g, 'pitr_node','rpo', 'near-zero', '#22c55e', 'dashed')
    e(g, 'softdel',  'rpo', 'near-zero', '#22c55e', 'dashed')
    g.render(os.path.join(OUT, 'accidental-delete-rto-rpo'), cleanup=True)
    print('Generated: accidental-delete-rto-rpo')


# ─────────────────────────────────────────────────────────────────────
# ws-data-corruption-migration
# ─────────────────────────────────────────────────────────────────────
def diag_data_corruption_migration():
    g = base_graph('data_corruption_migration', 'Silent Data Corruption — Off-By-One Migration Error', rankdir='LR')
    n(g, 'legacy',  'Legacy Column\nfloat (dollars)\n19.999...', 'gray')
    n(g, 'script',  'Python Migration\namount / 100\n(floor division bug)', 'red')
    n(g, 'corrupt', 'Corrupted Column\nint (cents)\n1999 instead of 2000', 'red')
    n(g, 'recon',   'Reconciliation\n11 days later\n$847k discrepancy', 'gold')
    n(g, 'events',  'Event Store\noriginal transactions\nimmutable log', 'purple')
    n(g, 'replay',  'Replay Events\nrecalculate amounts\nfrom source of truth', 'green')
    n(g, 'fix',     'Correct Fix\nint(round(amount * 100))\nnot / 100', 'teal')
    e(g, 'legacy',  'script',  'migration input')
    e(g, 'script',  'corrupt', 'truncation error', '#ef4444')
    e(g, 'corrupt', 'recon',   '11 days silent', '#ef4444', 'dashed')
    e(g, 'events',  'replay',  'source of truth', '#6366f1')
    e(g, 'replay',  'corrupt', 'overwrite with\ncorrect values', '#22c55e')
    e(g, 'fix',     'script',  'should have been', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'data-corruption-migration-flow'), cleanup=True)
    print('Generated: data-corruption-migration-flow')


def diag_migration_safe_process():
    g = base_graph('migration_safe_process', 'Safe Data Migration — 6-Step Verification Process', rankdir='TB')
    n(g, 's1', '1. Dry Run on Replica\ncompare before/after\nsum, min, max, sample', 'navy')
    n(g, 's2', '2. Invariant Assertions\npost-migration SQL checks\nfail if violated', 'navy')
    n(g, 's3', '3. Partial Run First\nWHERE id % 100 = 0\nverify 1% before full', 'gold')
    n(g, 's4', '4. Rename, Not Drop\nkeep old column\nuntil app verified', 'teal')
    n(g, 's5', '5. Batch + Sleep\n1000-row batches\navoid lock contention', 'green')
    n(g, 's6', '6. Post-Migration Diff\ncompare sums vs event store\nalert on mismatch', 'purple')
    e(g, 's1', 's2')
    e(g, 's2', 's3')
    e(g, 's3', 's4')
    e(g, 's4', 's5')
    e(g, 's5', 's6')
    g.render(os.path.join(OUT, 'data-corruption-migration-safe-steps'), cleanup=True)
    print('Generated: data-corruption-migration-safe-steps')


# ─────────────────────────────────────────────────────────────────────
# ws-credential-leak
# ─────────────────────────────────────────────────────────────────────
def diag_credential_leak():
    g = base_graph('credential_leak', 'AWS Credential Leak — Attack Timeline & Response', rankdir='LR')
    n(g, 'commit',   'Commit to Public Repo\nAWS key in config file\nT+0 min', 'red')
    n(g, 'scanner',  'Automated Scanner\nfinds key in 4 min\nT+4 min', 'red')
    n(g, 'attacker', 'Attacker Launches\n400 GPU instances\n12 new IAM users\nT+8 min', 'red')
    n(g, 'detect',   'Dev Notices\n3 hours later\nT+180 min', 'gold')
    n(g, 'revoke',   'Step 1: Revoke Key\niam delete-access-key\nIMMEDIATELY', 'green')
    n(g, 'audit',    'Step 2: CloudTrail Audit\nall actions with key\nsince T+0', 'navy')
    n(g, 'purge',    'Step 3: Purge Resources\ndelete rogue IAM users\nterminate EC2', 'navy')
    n(g, 'prevent',  'Prevention\nOIDC roles + Secrets Manager\npre-commit detect-secrets', 'purple')
    e(g, 'commit',   'scanner',  '4 min window', '#ef4444')
    e(g, 'scanner',  'attacker', 'key exploited', '#ef4444')
    e(g, 'attacker', 'detect',   '$34k charges', '#ef4444', 'dashed')
    e(g, 'detect',   'revoke')
    e(g, 'revoke',   'audit')
    e(g, 'audit',    'purge')
    e(g, 'prevent',  'commit',   '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'credential-leak-timeline'), cleanup=True)
    print('Generated: credential-leak-timeline')


def diag_credential_prevention():
    g = base_graph('credential_prevention', 'Secrets Management — OIDC vs Long-Lived Keys', rankdir='TB')
    n(g, 'bad',    'Long-Lived IAM Key\nstored in CI secret\nblast radius: unlimited\nrotation: manual', 'red')
    n(g, 'good',   'OIDC Token\nGitHub → AWS STS\nscoped + short-lived\nauto-revoked after job', 'green')
    n(g, 'sm',     'Secrets Manager\napp fetches at runtime\nrotated automatically\nno code/config storage', 'teal')
    n(g, 'hook',   'Pre-commit Hook\ndetect-secrets scan\nblock before push', 'navy')
    n(g, 'audit',  'CloudTrail + GuardDuty\ncontinuous anomaly detection\nalert on unexpected regions', 'purple')
    e(g, 'bad',    'good',  'replace with', '#22c55e')
    e(g, 'good',   'sm',    'pairs with')
    e(g, 'hook',   'sm',    'enforce no\nstored secrets', '#3b82f6', 'dashed')
    e(g, 'audit',  'good',  'monitor\nusage', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'credential-leak-prevention'), cleanup=True)
    print('Generated: credential-leak-prevention')


# ─────────────────────────────────────────────────────────────────────
# ws-memory-leak-production
# ─────────────────────────────────────────────────────────────────────
def diag_memory_leak():
    g = base_graph('memory_leak', 'Node.js Memory Leak — Event Listener Accumulation', rankdir='LR')
    n(g, 'req',      'HTTP Request\narrives', 'gray')
    n(g, 'handler',  'Request Handler\nadds close listener\nto Redis client', 'red')
    n(g, 'redis',    'Redis Client\n(shared singleton)\neventEmitter', 'navy')
    n(g, 'listeners','Listener Array\ngrows: +1 per request\n10,000 req → 10,000 listeners', 'red')
    n(g, 'heap',     'Heap Growth\n40 MB/hour\nOOM at 3 AM', 'red')
    n(g, 'snap1',    'Heap Snapshot T=0', 'gray')
    n(g, 'snap2',    'Heap Snapshot T+4h\ncompare in DevTools', 'gold')
    n(g, 'fix',      'FIX: removeListener\nin response end handler\n+ maxListeners warning', 'green')
    e(g, 'req',      'handler')
    e(g, 'handler',  'redis',    'adds listener\n(no remove)', '#ef4444')
    e(g, 'redis',    'listeners','accumulates', '#ef4444')
    e(g, 'listeners','heap',     'closure refs\nprevent GC', '#ef4444')
    e(g, 'snap1',    'snap2',    'Comparison\nview', '#6366f1', 'dashed')
    e(g, 'snap2',    'listeners','identifies\ngrowing objects', '#f59e0b', 'dashed')
    e(g, 'fix',      'handler',  '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'memory-leak-event-listeners'), cleanup=True)
    print('Generated: memory-leak-event-listeners')


def diag_memory_leak_diagnosis():
    g = base_graph('memory_leak_diag', 'Memory Leak Diagnosis — Heap Snapshot Workflow', rankdir='TB')
    n(g, 'metric',  'Alert: heapUsed > 80%\nor OOM restart detected', 'red')
    n(g, 'snap_a',  'Snapshot A\nprocess start\n(baseline)', 'navy')
    n(g, 'snap_b',  'Snapshot B\nafter N hours traffic\n(observe growth)', 'navy')
    n(g, 'compare', 'DevTools Comparison\nobject count delta\nfind growing type', 'gold')
    n(g, 'retainer','Retainer Tree\nfind what holds refs\nevent arrays / closures', 'purple')
    n(g, 'patch',   'Apply Fix\nremoveListener / LRU\nclearInterval in cleanup', 'green')
    n(g, 'monitor', 'Monitor heapUsed\nas CloudWatch metric\nalert before OOM', 'teal')
    e(g, 'metric',  'snap_a')
    e(g, 'snap_a',  'snap_b',   'traffic period')
    e(g, 'snap_b',  'compare')
    e(g, 'compare', 'retainer')
    e(g, 'retainer','patch')
    e(g, 'patch',   'monitor')
    g.render(os.path.join(OUT, 'memory-leak-diagnosis-steps'), cleanup=True)
    print('Generated: memory-leak-diagnosis-steps')


# ─────────────────────────────────────────────────────────────────────
# ws-bad-deploy-rollback
# ─────────────────────────────────────────────────────────────────────
def diag_bad_deploy_rollback():
    g = base_graph('bad_deploy_rollback', 'Deploy + Migrate Coupling — The Rollback Trap', rankdir='LR')
    n(g, 'old_app',  'Old App v1\nreads orders.status', 'gray')
    n(g, 'new_app',  'New App v2\nreads orders.fulfillment_status', 'navy')
    n(g, 'db_old',   'DB: orders.status\n(original column)', 'green')
    n(g, 'db_new',   'DB: fulfillment_status\n(renamed — committed)', 'red')
    n(g, 'trap',     'ROLLBACK TRAP\nv1 refs old column\nnew column already committed', 'red')
    n(g, 'expand',   'FIX: Expand Phase\nadd new column\nwrite both columns', 'green')
    n(g, 'contract', 'FIX: Contract Phase\ndrop old column\nafter all traffic on v2', 'teal')
    e(g, 'old_app',  'db_old',   'reads status', '#22c55e')
    e(g, 'new_app',  'db_new',   'reads new col', '#3b82f6')
    e(g, 'db_new',   'trap',     'v1 rollback\nbreaks queries', '#ef4444')
    e(g, 'expand',   'db_old',   'keep old col\nduring transition', '#22c55e', 'dashed')
    e(g, 'expand',   'db_new',   'add new col', '#22c55e', 'dashed')
    e(g, 'expand',   'contract', 'deploy order', '#94a3b8')
    g.render(os.path.join(OUT, 'bad-deploy-rollback-trap'), cleanup=True)
    print('Generated: bad-deploy-rollback-trap')


def diag_expand_contract():
    g = base_graph('expand_contract', 'Expand-Contract Pattern — Safe Schema Migration', rankdir='LR')
    n(g, 'p0',  'Deploy 0\nOld column only\nv1 app reads it', 'gray')
    n(g, 'p1',  'Phase 1: Expand\nAdd new column\nv2 writes both cols', 'navy')
    n(g, 'p2',  'Phase 2: Backfill\nbatch copy old → new\nverify completeness', 'gold')
    n(g, 'p3',  'Phase 3: Cut Over\nv2 reads new col only\nboth cols exist', 'teal')
    n(g, 'p4',  'Phase 4: Contract\ndrop old column\nsafe — nothing reads it', 'green')
    n(g, 'rb',  'Rollback Safe\nany phase → go back\nold col always present', 'purple')
    e(g, 'p0', 'p1')
    e(g, 'p1', 'p2')
    e(g, 'p2', 'p3')
    e(g, 'p3', 'p4')
    e(g, 'rb', 'p1', '', '#94a3b8', 'dotted')
    e(g, 'rb', 'p2', '', '#94a3b8', 'dotted')
    e(g, 'rb', 'p3', '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'bad-deploy-expand-contract'), cleanup=True)
    print('Generated: bad-deploy-expand-contract')


# ─────────────────────────────────────────────────────────────────────
# ws-dns-cache-poisoning
# ─────────────────────────────────────────────────────────────────────
def diag_dns_cache_poisoning():
    g = base_graph('dns_cache_poisoning', 'Internal DNS Cache Poisoning — Attack & Mitigation', rankdir='LR')
    n(g, 'svc',    'Microservices\nresolve\npayments-api.internal', 'navy')
    n(g, 'bind',   'BIND Resolver\n(DNSSEC disabled\nduring upgrade)', 'red')
    n(g, 'rogue',  'Rogue Resolver\nforged A record:\npayments-api.internal\n→ stale IP', 'red')
    n(g, 'stale',  'Stale IP\n(decommissioned\ninstance)\nconnection refused', 'red')
    n(g, 'ttl',    'Forged TTL: 7200s\n2 hours of poisoning\nall services affected', 'gold')
    n(g, 'dnssec', 'FIX A: DNSSEC\ncryptographic record\nverification', 'green')
    n(g, 'short',  'FIX B: Short TTLs\n30-60 seconds internal\nlimits poison duration', 'green')
    n(g, 'sd',     'FIX C: Service Discovery\nConsul / Cloud Map\nhealth-checked IPs', 'teal')
    e(g, 'svc',    'bind',    'DNS query')
    e(g, 'bind',   'rogue',   'accepts forged\nresponse', '#ef4444')
    e(g, 'rogue',  'bind',    'poisons cache\nTTL 7200s', '#ef4444')
    e(g, 'svc',    'stale',   'traffic sent\nto wrong IP', '#ef4444', 'dashed')
    e(g, 'ttl',    'bind',    '2h impact', '#f59e0b', 'dashed')
    e(g, 'dnssec', 'bind',    '', '#94a3b8', 'dotted')
    e(g, 'short',  'ttl',     '', '#94a3b8', 'dotted')
    e(g, 'sd',     'svc',     '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'dns-cache-poisoning-flow'), cleanup=True)
    print('Generated: dns-cache-poisoning-flow')


def diag_dns_service_discovery():
    g = base_graph('dns_service_discovery', 'Resilient Service Discovery — Health-Checked DNS', rankdir='TB')
    n(g, 'svc_a',   'Service A\n(caller)', 'navy')
    n(g, 'cloud_map','AWS Cloud Map\nor Consul\nservice registry', 'teal')
    n(g, 'hc',      'Health Checks\nevery 10 seconds\nper instance', 'green')
    n(g, 'ip_ok',   'Healthy IP Pool\n[10.0.1.5, 10.0.1.6]\nreturned in DNS', 'green')
    n(g, 'ip_bad',  'Unhealthy Instance\n10.0.1.7 (removed\nfrom pool in 10s)', 'red')
    n(g, 'static',  'Static DNS Record\nstale IP persists\nuntil TTL expires', 'red')
    e(g, 'svc_a',   'cloud_map', 'resolve hostname')
    e(g, 'hc',      'cloud_map', 'health status\nfeed', '#22c55e')
    e(g, 'cloud_map','ip_ok',    'returns only\nhealthy IPs', '#22c55e')
    e(g, 'ip_bad',  'cloud_map', 'fails health check\nauto-removed', '#ef4444')
    e(g, 'static',  'ip_bad',   'vs static DNS:\nstale for TTL duration', '#ef4444', 'dashed')
    g.render(os.path.join(OUT, 'dns-cache-poisoning-service-discovery'), cleanup=True)
    print('Generated: dns-cache-poisoning-service-discovery')


if __name__ == '__main__':
    diag_cascading_failure_flow()
    diag_cascading_failure_recovery()
    diag_region_outage()
    diag_thundering_herd()
    diag_cache_stampede()
    diag_accidental_delete()
    diag_rto_rpo()
    diag_data_corruption_migration()
    diag_migration_safe_process()
    diag_credential_leak()
    diag_credential_prevention()
    diag_memory_leak()
    diag_memory_leak_diagnosis()
    diag_bad_deploy_rollback()
    diag_expand_contract()
    diag_dns_cache_poisoning()
    diag_dns_service_discovery()
    print('All war-stories diagrams generated.')
