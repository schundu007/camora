// Production Troubleshooting — interview scenarios and real-world diagnosis.
// Content sourced from AceCloudInterviews.com and production engineering practice.

export const troubleshootingCategories = [
  { id: 'aws-infra',        name: 'AWS Infrastructure',          icon: 'cloud',        color: '#f97316' },
  { id: 'networking',       name: 'Network & Connectivity',       icon: 'globe',        color: '#3b82f6' },
  { id: 'kubernetes-issues',name: 'Kubernetes Issues',           icon: 'gitBranch',    color: '#f59e0b' },
  { id: 'database',         name: 'Database Issues',              icon: 'database',     color: '#8b5cf6' },
  { id: 'performance',      name: 'Performance & Resources',     icon: 'trendingUp',   color: '#ef4444' },
  { id: 'observability',    name: 'Alerting & Observability',    icon: 'activity',     color: '#06b6d4' },
  { id: 'cicd-issues',      name: 'CI/CD & Deployment',          icon: 'gitMerge',     color: '#22c55e' },
];

export const troubleshootingTopicCategoryMap = {
  // AWS Infrastructure
  'ts-ec2-unresponsive':            'aws-infra',
  'ts-lambda-cold-starts':          'aws-infra',
  'ts-ecs-task-failures':           'aws-infra',
  'ts-rds-cpu-spike':               'aws-infra',
  'ts-s3-latency':                  'aws-infra',
  'ts-elb-5xx-errors':              'aws-infra',
  'ts-iam-permission-denied':       'aws-infra',
  // Network & Connectivity
  'ts-multi-region-latency':        'networking',
  'ts-dns-failures':                'networking',
  'ts-vpc-connectivity':            'networking',
  'ts-certificate-expiry':          'networking',
  'ts-packet-loss':                 'networking',
  'ts-nat-gateway-throttling':      'networking',
  // CI/CD & Deployment
  'ts-staging-passes-prod-fails':   'cicd-issues',
  'ts-pipeline-flakiness':          'cicd-issues',
  'ts-zero-downtime-schema-change': 'cicd-issues',
  'ts-rollback-strategies':         'cicd-issues',
  'ts-canary-issues':               'cicd-issues',
  // Alerting & Observability
  'ts-alerts-stopped-firing':       'observability',
  'ts-metrics-gaps':                'observability',
  'ts-alert-fatigue':               'observability',
  'ts-tracing-missing':             'observability',
  'ts-log-volume-explosion':        'observability',
  // Database
  'ts-rds-replication-lag':         'database',
  'ts-slow-queries':                'database',
  'ts-deadlocks':                   'database',
  'ts-connection-pool-exhausted':   'database',
  'ts-database-migrations-prod':    'database',
  // Performance
  'ts-memory-leak-diagnosis':       'performance',
  'ts-cpu-runaway-process':         'performance',
  'ts-disk-iops-saturation':        'performance',
  'ts-network-bandwidth':           'performance',
  'ts-gc-pauses':                   'performance',
  // Kubernetes
  'ts-pod-crashloopbackoff':        'kubernetes-issues',
  'ts-oomkilled-pods':              'kubernetes-issues',
  'ts-pod-pending-scheduling':      'kubernetes-issues',
  'ts-service-not-reachable':       'kubernetes-issues',
  'ts-pvc-mount-failures':          'kubernetes-issues',
  'ts-hpa-not-scaling':             'kubernetes-issues',
  'ts-coredns-failures':            'kubernetes-issues',
};

export const troubleshootingTopics = [
  // ─── AWS INFRASTRUCTURE ────────────────────────────────────────────────────
  {
    id: 'ts-ec2-unresponsive',
    title: 'EC2 Instance Unresponsive',
    icon: 'cloud',
    color: '#f97316',
    questions: 6,
    description: 'SSH unreachable, console output, system logs, kernel panic, disk full, and rescue mode.',
    visualizations: [],
    introduction: `## Overview
An EC2 instance that does not respond to SSH can fail for reasons at multiple layers: network (security group, NACL, routing), OS (kernel panic, OOM kill of sshd, disk full), or hardware (underlying host failure). Diagnosis must start with the layers you can access without SSH — AWS console and EC2 Serial Console.

The first tool: EC2 System Log (Actions > Monitor and troubleshoot > Get system log). This shows the kernel boot messages and early userspace output. Kernel panics, disk errors, and fsck failures are visible here even when the instance is completely unreachable.

EC2 Serial Console (if enabled for the account): provides an interactive terminal to the instance without any network dependency. You can log in and run commands even if the network interface is completely broken.

Instance Status Checks: AWS runs two checks. System Status Check covers the underlying hardware (power, network, hardware). Instance Status Check covers the OS (network config, kernel, sshd). A failing system check usually requires a stop/start (not reboot — stop/start migrates to a new host).

Common causes: security group change removed port 22 rule, disk full prevents sshd from starting (can't write /var/run/sshd.pid), OOM kill terminated sshd, kernel panic from a kernel update, CPU credit exhaustion on T-class instances (the instance throttled and sshd times out).`,
    whenToUse: [
      'SSH to an EC2 instance fails with "Connection timed out" or "Connection refused"',
      'An EC2 instance passed both status checks but applications are not responding',
      'Recovering a Linux instance after a failed kernel upgrade',
      'Instance entered an unreachable state after a disk was full',
    ],
    keyConcepts: [
      { term: 'EC2 System Log', definition: 'Kernel and early boot output captured by the hypervisor. Accessible in the AWS console without network access. Shows kernel panics, fsck, and disk errors.' },
      { term: 'EC2 Serial Console', definition: 'Interactive terminal to the instance bypassing the network. Must be enabled at account level. Login requires OS user password (SSH key auth not available here).' },
      { term: 'Stop vs reboot', definition: 'Reboot restarts on the same host. Stop+Start migrates to a new host — required for System Status Check failures that indicate underlying hardware issues.' },
      { term: 'CPU credit exhaustion (T-class)', definition: 'T2/T3 instances have a baseline CPU and a burst credit pool. When credits run out, CPU is hard-throttled to baseline. Sshd handshakes time out under heavy throttling.' },
      { term: 'Rescue instance', definition: 'Detach the root EBS volume from the broken instance, attach it to a working instance, mount it, fix the issue (disk full, corrupted fstab), re-attach, and restart.' },
    ],
    pitfalls: [
      'Rebooting instead of stop/starting when the system status check fails — a reboot keeps the same host. Only stop+start moves to fresh hardware.',
      'Checking security groups but forgetting NACLs — NACLs are stateless and apply at the subnet level. A NACL deny rule blocks traffic before it reaches the instance security group.',
      'Not enabling EC2 Serial Console before you need it — it must be enabled at the account level in advance. You cannot enable it after an instance becomes unresponsive without network access.',
    ],
    keyQuestions: [
      {
        question: 'An EC2 instance that was running fine is now unreachable via SSH. Walk through your complete diagnosis.',
        answer: `I start with what I can check without SSH, then work toward recovering access.

Step 1 — AWS console checks (1 min):
- Instance status: is it running? Any pending reboot?
- Status checks: System check (hardware) or Instance check (OS) failing?
- Recent changes: check CloudTrail for recent API calls — security group rule removed? EBS detach? User data script re-ran?

Step 2 — Network layer (2 min):
- Security group: does it allow inbound TCP 22 from my IP?
- NACL: does the subnet NACL allow inbound 22 AND outbound ephemeral ports (1024-65535) back?
- Route table: does the subnet route table have a route to an IGW (for public subnet)?
- Elastic IP: if it had an EIP, is it still associated?
- VPC Flow Logs: can I see ACCEPT or REJECT for my source IP on port 22?

Step 3 — Instance system log (1 min):
\`Actions > Get system log\`. Look for:
- "PANIC: VFS: Unable to mount root fs" → disk/filesystem issue
- "Kernel panic" → OS crash, may need to rescue
- "No space left on device" → disk full, sshd can't start
- "Out of memory: Kill process [sshd]" → OOM killed sshd

Step 4 — Serial console (if enabled):
Connect and log in. Run:
\`\`\`bash
df -h                        # disk full?
systemctl status sshd
journalctl -u sshd -n 50
\`\`\`

Step 5 — Rescue mode (if serial console unavailable):
Stop the instance. Detach root EBS volume. Attach it to a rescue instance as \`/dev/xvdf\`.
\`\`\`bash
mount /dev/xvdf1 /mnt
# Fix the issue (delete large files, repair /etc/fstab, re-enable sshd)
# Then: umount /mnt → re-attach volume → start original instance
\`\`\`

Step 6 — Hardware issue (system check failing):
Stop the instance (not reboot). Start it. This migrates to a new host.`,
      },
    ],
    quickFire: [
      { q: 'First thing you check when EC2 SSH fails?', a: 'Security group inbound rule for port 22, then NACL, then route table. These are the most common causes and require no SSH access to verify.' },
      { q: 'What command shows EC2 boot logs without SSH?', a: 'AWS Console: Actions > Monitor and troubleshoot > Get system log. Shows kernel output, fsck errors, and OOM kills from the hypervisor.' },
      { q: 'What does exit code 137 mean on an EC2 process?', a: 'The process received SIGKILL -- either the OOM killer terminated it, or it was forcibly killed. Check dmesg or /var/log/kern.log for the OOM event.' },
      { q: 'Difference between EC2 reboot and stop/start?', a: 'Reboot stays on the same host. Stop/start migrates to a new host -- required when the System Status Check fails (underlying hardware issue).' },
      { q: 'What does a failing System Status Check indicate?', a: 'A problem with the underlying AWS hardware (power, network, hardware). Fix: stop and start the instance to migrate to new hardware.' },
      { q: 'How do you access an EC2 instance with a full disk and broken SSH?', a: 'Use EC2 Serial Console (if pre-enabled) or detach the root EBS volume, attach to a rescue instance, delete large files, re-attach, and restart.' },
      { q: 'What prevents SSH from starting when disk is full?', a: 'sshd cannot write its PID file to /var/run/sshd.pid. Even a few KB of free space is enough to fix it -- find and delete large log files via rescue mode.' },
      { q: 'How do you diagnose CPU credit exhaustion on a T3 instance?', a: 'Check CloudWatch CPUCreditBalance metric. When it reaches zero, CPU is hard-throttled to baseline. SSH handshakes timeout under heavy throttling.' },
      { q: 'What is EC2 Serial Console and when is it useful?', a: 'An interactive terminal to the instance that bypasses all networking. Requires pre-enablement at account level. Essential for diagnosing OS-level issues when the network is broken.' },
    ],
    references: [
      'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-troubleshoot.html',
    ],
  },

  {
    id: 'ts-rds-cpu-spike',
    title: 'RDS CPU at 100%',
    icon: 'cloud',
    color: '#f97316',
    questions: 7,
    description: 'Performance Insights, slow query log, EXPLAIN, missing indexes, autovacuum, and connection storms.',
    visualizations: [],
    introduction: `## Overview
RDS CPU at 100% causes all queries to slow down proportionally and can eventually make the instance unresponsive. The root cause is almost always one of: an expensive query (missing index, full table scan), a sudden increase in query volume (traffic spike), lock contention blocking other queries and causing them to queue, or autovacuum running full scans on bloated PostgreSQL tables.

Performance Insights (available on RDS db.t3.medium and larger) is the first tool. It shows the database load broken down by wait events — what queries are waiting for (CPU, locks, I/O, network). The Top SQL tab shows which queries are consuming the most CPU time. This is the fastest way to identify the offending query.

After identifying the slow query, EXPLAIN ANALYZE shows the execution plan: whether it uses a sequential scan (bad) or an index scan (good), the estimated vs actual row counts, and the time spent at each node. Sequential scans on large tables cause CPU spikes because every row is read and processed. The fix is usually adding an index on the filtered or joined column.

PostgreSQL autovacuum runs in the background to reclaim dead tuples from UPDATE/DELETE operations. A heavily updated table accumulates dead tuples that autovacuum must process. If autovacuum is running aggressive full-table scans, it can spike CPU. Monitor with: SELECT schemaname, relname, n_dead_tup, last_autovacuum FROM pg_stat_user_tables ORDER BY n_dead_tup DESC.

Connection storms: when hundreds of connections all retry simultaneously (exponential backoff with jitter is supposed to prevent this, but often is not implemented). Each new connection has overhead; at scale, connection setup overhead itself saturates CPU.`,
    whenToUse: [
      'Diagnosing a sudden RDS CPU spike during a traffic increase',
      'Finding the slow query responsible for a production performance incident',
      'Explaining why autovacuum causes periodic CPU spikes in PostgreSQL',
      'Designing a database indexing strategy to support a new query pattern',
    ],
    keyConcepts: [
      { term: 'Performance Insights', definition: 'RDS feature showing database load by wait event and top SQL. Identifies which queries use the most CPU, which are waiting on locks or I/O. Available for most instance classes.' },
      { term: 'EXPLAIN ANALYZE', definition: 'Shows the actual execution plan with timing. Look for Seq Scan on large tables (should be Index Scan), high actual rows vs estimated rows (stats out of date), and total cost.' },
      { term: 'pg_stat_statements', definition: 'PostgreSQL extension that aggregates query statistics: total time, calls, mean time. Enable with shared_preload_libraries = pg_stat_statements. Survives until reset.' },
      { term: 'Autovacuum', definition: 'PostgreSQL background process reclaiming dead tuples from UPDATE/DELETE. Bloated tables trigger aggressive autovacuum that competes with production queries for CPU.' },
      { term: 'RDS Proxy', definition: 'Connection multiplexer that pools connections to RDS. Reduces connection establishment overhead and protects against connection storms. Useful for Lambda-heavy architectures.' },
    ],
    pitfalls: [
      'Adding an index on every column to solve slow queries — unused indexes slow down INSERT/UPDATE/DELETE and consume storage. Only add indexes for actual query patterns confirmed by EXPLAIN ANALYZE.',
      'Stopping autovacuum to reduce CPU — without autovacuum, table bloat grows indefinitely, eventually causing table-level locks during VACUUM FULL and complete outages.',
      'Restarting the RDS instance to "fix" CPU — it temporarily relieves the symptom but the query returns the moment traffic resumes. Always fix the root cause (index, query rewrite, connection pool).',
    ],
    keyQuestions: [
      {
        question: 'Your RDS CPU is at 100%. Walk through how you identify and fix the root cause.',
        answer: `Step 1 — Identify the offending query with Performance Insights:
\`RDS Console > Performance Insights > Top SQL tab\`. Look for the query with the highest DB Load. Note the wait event (CPU = compute-bound, locks = contention, io = I/O bound).

Step 2 — Get the execution plan:
\`\`\`sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT ... [the slow query from Performance Insights];
\`\`\`
Look for:
- Seq Scan on a large table → add an index on the filtered column
- Rows estimated: 1000 vs actual: 5000000 → run \`ANALYZE tablename\` to update statistics
- Hash Join with large intermediate sets → consider a query rewrite or partial index
- Nested Loop with a large outer set → check for Cartesian product (missing join condition)

Step 3 — Add the index (carefully):
\`\`\`sql
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);
\`\`\`
\`CONCURRENTLY\` builds the index without locking the table. Monitor CPU during index build — it will spike. Do this during low-traffic hours.

Step 4 — If it is autovacuum:
\`\`\`sql
SELECT schemaname, relname, n_dead_tup, n_live_tup, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC LIMIT 10;
\`\`\`
If \`n_dead_tup\` is very high (millions), autovacuum is doing significant work. Tune per-table:
\`\`\`sql
ALTER TABLE hot_table SET (autovacuum_vacuum_scale_factor = 0.01, autovacuum_vacuum_cost_delay = 2);
\`\`\`

Step 5 — If it is a connection storm:
\`\`\`sql
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
\`\`\`
If hundreds are in "idle" or "idle in transaction", deploy RDS Proxy to pool connections. Implement connection pooling at the application layer (PgBouncer, HikariCP).`,
      },
    ],
    quickFire: [
      { q: 'First tool to open when RDS CPU is at 100%?', a: 'Performance Insights -- Top SQL tab shows which queries are consuming the most DB load, broken down by wait event (CPU, lock, I/O).' },
      { q: 'What does a Seq Scan in EXPLAIN mean?', a: 'PostgreSQL is reading every row in the table. For large tables this is expensive -- add an index on the filtered column to get an Index Scan instead.' },
      { q: 'How do you add an index without locking the table?', a: 'CREATE INDEX CONCURRENTLY idx_name ON table(column) -- builds the index without taking a table lock, allowing concurrent reads and writes.' },
      { q: 'What causes periodic CPU spikes in PostgreSQL with no query change?', a: 'Autovacuum processing dead tuples from UPDATE/DELETE operations. Check pg_stat_user_tables for high n_dead_tup counts.' },
      { q: 'What SQL shows the worst queries by total CPU time?', a: 'SELECT query, total_exec_time, calls FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10 -- requires pg_stat_statements extension.' },
      { q: 'How do you distinguish lock contention from CPU-bound queries in Performance Insights?', a: 'Look at the wait event type. CPU wait = compute-bound query. Lock wait = contention. I/O wait = disk-bound. Each requires a different fix.' },
      { q: 'What does EXPLAIN ANALYZE show that EXPLAIN alone does not?', a: 'Actual row counts and actual timing at each node. Estimated vs actual row discrepancies reveal stale statistics.' },
      { q: 'What is RDS Proxy and when is it needed?', a: 'A connection multiplexer that pools connections to RDS. Reduces connection overhead and prevents connection storms -- especially valuable for Lambda workloads.' },
      { q: 'Should you restart RDS to fix a CPU spike?', a: 'No -- it relieves the symptom temporarily but the slow query returns when traffic resumes. Always fix the root cause: add an index or rewrite the query.' },
    ],
    references: [
      'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.html',
      'https://www.postgresql.org/docs/current/using-explain.html',
    ],
  },

  {
    id: 'ts-elb-5xx-errors',
    title: 'ELB 5xx Errors',
    icon: 'cloud',
    color: '#f97316',
    questions: 6,
    description: 'HTTP 502, 503, 504 from ALB — distinguishing LB errors from backend errors and diagnosing each.',
    visualizations: [],
    introduction: `## Overview
When an ALB returns 5xx errors, the cause can be either the ALB itself (502 Bad Gateway, 503 Service Unavailable) or the backend targets (504 Gateway Timeout, 502 if backend sends an invalid response). Understanding which error code means what determines where to look.

502 Bad Gateway: the ALB established a connection to a backend target but received an invalid response — not a valid HTTP response, a reset (RST), or an incomplete response. Common causes: the backend closed the connection before sending a complete response (application crash, OOM kill mid-request), the backend sent a response the ALB cannot parse, or the Keep-Alive timeout on the backend is shorter than the ALB's Keep-Alive setting causing the backend to close a connection the ALB is trying to reuse.

503 Service Unavailable: the ALB has no healthy targets. All targets in the target group are failing health checks. Check target health in the ALB Target Groups console. Common causes: application not started, health check path returning non-200, deployment in progress, security group blocking health check traffic from the ALB.

504 Gateway Timeout: the ALB established a connection to a backend but the backend did not respond within the timeout period (default 60 seconds for ALB). The backend is alive but slow. Common causes: slow database query, external API call with no timeout, slow CPU-bound operation, GC pause.

ALB access logs are the authoritative source. They show: request processing time (time from request received to response started), backend processing time (time backend took to respond), target status code (backend's response), and elb status code (what the client received). A backend_processing_time of -1 means the backend did not respond at all.`,
    whenToUse: [
      'Diagnosing whether a 502 came from the ALB or the backend application',
      'Determining why all targets in an ALB target group show as unhealthy',
      'Tuning ALB timeout settings for slow downstream dependencies',
      'Reading ALB access logs to find the exact backend processing times',
    ],
    keyConcepts: [
      { term: 'HTTP 502 (Bad Gateway)', definition: 'ALB got a response from the target but it was invalid or the connection was reset. Often an application crash mid-response or Keep-Alive timeout mismatch.' },
      { term: 'HTTP 503 (Service Unavailable)', definition: 'ALB has no healthy targets. Check target group health. Security group blocking health check, wrong health check path, or deployment in progress.' },
      { term: 'HTTP 504 (Gateway Timeout)', definition: 'Backend is alive but did not respond within the idle timeout (default 60s). The backend is slow — check for slow queries, external timeouts, or GC pauses.' },
      { term: 'ALB access logs', definition: 'Per-request logs including request_processing_time, target_processing_time, response_processing_time, target_status_code. Enable in ALB Attributes. Stored in S3. Query with Athena.' },
      { term: 'Target health check', definition: 'ALB sends periodic HTTP requests to target health check path (default /). Expects 200 (or configured 2xx/3xx range). Unhealthy threshold: 2 consecutive failures.' },
    ],
    pitfalls: [
      'Assuming 5xx errors are always the application\'s fault — 502 errors can be ALB-side (Keep-Alive misconfiguration, connection pool reuse of closed connections). Check ALB access logs for elb_status_code vs target_status_code.',
      'Setting health check path to / when the application serves redirects at / — a 301 from / fails the health check. Set the health check path to /healthz or /health that returns a direct 200.',
      'Not enabling ALB access logs — without them, you only have CloudWatch metrics (aggregated). ALB access logs provide per-request data needed to diagnose specific 502/504 events.',
    ],
    keyQuestions: [
      {
        question: 'Users are seeing 502 errors from your ALB. How do you find the root cause?',
        answer: `Step 1 — Distinguish ALB-generated vs backend-generated 502:
AWS ALB access logs have two status codes: \`elb_status_code\` and \`target_status_code\`.
- \`elb_status_code=502, target_status_code=502\`: backend returned a 502. Application bug.
- \`elb_status_code=502, target_status_code=-\`: ALB could not reach the backend or backend closed the connection early. Keep-Alive issue or application crash.

Query access logs with Athena:
\`\`\`sql
SELECT count(*), target_status_code, elb_status_code
FROM alb_logs
WHERE elb_status_code = 502
GROUP BY target_status_code, elb_status_code;
\`\`\`

Step 2 — If target_status_code is - (dash), check Keep-Alive timeout:
ALB reuses backend connections (Keep-Alive). If the backend closes an idle connection before ALB does, ALB tries to reuse it and gets a TCP RST → 502. Fix: set the backend Keep-Alive timeout higher than the ALB's idle timeout (default 60s).
\`\`\`bash
# nginx:
keepalive_timeout 75;
# Node.js:
server.keepAliveTimeout = 65000;
\`\`\`

Step 3 — If application is crashing mid-request:
Check backend logs for OOM kills, exceptions, or crashes correlated with the 502 timestamps.
\`\`\`bash
kubectl logs -n prod pod-name --previous        # if container restarted
journalctl -u myapp --since "2024-01-15 14:30:00"  # systemd service
\`\`\`

Step 4 — Check security groups and connection limits:
Are backend instances hitting file descriptor limits?
\`\`\`bash
ss -s           # shows total TCP connection counts per state
ulimit -n       # check open file descriptor limit
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What does ALB HTTP 502 mean vs 504?', a: '502 = ALB got an invalid or reset response from the backend. 504 = backend is alive but did not respond within the idle timeout (default 60s).' },
      { q: 'What does ALB HTTP 503 mean?', a: 'ALB has no healthy targets -- all targets in the target group are failing health checks. Check target group health in the console.' },
      { q: 'How do you distinguish ALB-generated 502 from backend-generated 502?', a: 'Check ALB access logs: if target_status_code is "-" (dash) the backend never responded. If target_status_code is 502 the backend returned 502.' },
      { q: 'What causes a Keep-Alive 502 on ALB?', a: 'Backend closes idle connections before ALB does. ALB tries to reuse the closed connection and gets a TCP RST. Fix: set backend Keep-Alive timeout higher than ALB idle timeout (65s vs 60s).' },
      { q: 'What is the default ALB idle timeout?', a: '60 seconds. If a backend takes longer than 60s to respond, ALB closes the connection and returns a 504 to the client.' },
      { q: 'Why would all ALB targets show unhealthy?', a: 'Health check path returning non-200, security group blocking health check traffic from ALB, application not started, or deployment in progress.' },
      { q: 'What SQL query finds 502 patterns in ALB Athena logs?', a: 'SELECT count(*), target_status_code FROM alb_logs WHERE elb_status_code = 502 GROUP BY target_status_code -- distinguishes app 502 from connection errors.' },
      { q: 'How do you enable ALB access logs?', a: 'ALB console > Attributes > Access logs > Enable, specify an S3 bucket. Logs are per-request and can be queried with Athena.' },
      { q: 'What health check mistake causes 503 even when the app is running?', a: 'Using "/" as health check path when the app returns a 301 redirect there. Set health check path to /healthz or /health that returns a direct 200.' },
    ],
    references: [
      'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html',
    ],
  },

  // ─── NETWORKING ────────────────────────────────────────────────────────────
  {
    id: 'ts-dns-failures',
    title: 'DNS Failures',
    icon: 'globe',
    color: '#3b82f6',
    questions: 6,
    description: 'NXDOMAIN vs SERVFAIL, TTL propagation, negative caching, Kubernetes CoreDNS failures, and split-horizon issues.',
    visualizations: [],
    introduction: `## Overview
DNS failures manifest as connection errors that look like network failures but are actually name resolution failures. They are among the most common causes of production incidents because they are often invisible until they cause a cascading failure.

The two primary failure modes: NXDOMAIN (the name definitively does not exist in DNS — the authoritative server confirmed this) and SERVFAIL (the resolver encountered an error — nameserver unreachable, DNSSEC validation failed, or the resolver itself is broken). These require very different fixes.

Propagation delay is the most common cause of transient DNS failures after a record change. When a record is updated, resolvers worldwide continue returning the old value until the cached TTL expires. The maximum propagation time equals the TTL of the old record. During this window, some clients see the new record and some see the old — intermittent failures that look like a network issue.

Negative caching causes failures after a record is deleted or before it is created. If you query for a record that does not exist, the NXDOMAIN response is cached for the duration of the SOA minimum TTL (typically 1-5 minutes). Clients that already cached the NXDOMAIN must wait for that cache entry to expire before they can resolve the record.

Kubernetes CoreDNS failure is a frequent cause of widespread pod connectivity loss. If CoreDNS pods crash or are overloaded, all pod-to-pod communication via service names breaks simultaneously. CoreDNS failures show up as SERVFAIL responses for .svc.cluster.local names.`,
    whenToUse: [
      'Diagnosing intermittent "could not resolve host" errors in production services',
      'Explaining why a DNS record change is not immediately visible to all users',
      'Debugging Kubernetes service discovery failures where pods cannot reach each other',
      'Tracing a split-horizon DNS issue where internal and external clients see different records',
    ],
    keyConcepts: [
      { term: 'NXDOMAIN', definition: 'Authoritative denial — the name definitively does not exist. Cached for the SOA minimum TTL. Fix: the record is missing or was deleted.' },
      { term: 'SERVFAIL', definition: 'Resolution failure — the resolver could not complete the query. Fix: the upstream nameserver is unreachable, DNSSEC is failing, or the resolver itself is broken.' },
      { term: 'Negative caching TTL', definition: 'NXDOMAIN responses are cached. Duration is the SOA minimum TTL (often 300-3600 seconds). New records are not visible until this cache expires across all resolvers.' },
      { term: 'CoreDNS', definition: 'Kubernetes cluster DNS server. All service name resolution goes through CoreDNS pods. Pod failure → all .svc.cluster.local resolution fails. Scale CoreDNS replicas for production.' },
      { term: 'ndots', definition: 'Kubernetes /etc/resolv.conf sets ndots:5. Names with fewer than 5 dots are treated as relative, triggering multiple search-domain queries before trying absolute. Can cause excessive CoreDNS load.' },
    ],
    pitfalls: [
      'Changing a DNS record with a 24-hour TTL and expecting instant propagation — propagation takes up to the full TTL. Reduce TTL 24h before any planned DNS change.',
      'Testing DNS from your laptop after a change and seeing the new record, then assuming all users see it — your local resolver may have a fresh cache while ISP resolvers still have the old TTL.',
      'Not watching CoreDNS pod health during cluster scaling events — new nodes and pod bursts can overwhelm CoreDNS if it is not scaled appropriately (HPA or at least 2 replicas for HA).',
    ],
    keyQuestions: [
      {
        question: 'After updating a DNS record, some services are working and some are not. Why and how do you fix it?',
        answer: `This is DNS propagation lag. Different resolvers worldwide have cached the old record with different amounts of remaining TTL. Some resolvers have already fetched the new record; others are still serving the cached old one.

Understanding the timeline:
The old record had a TTL of, say, 3600 seconds (1 hour). Resolvers that cached it 5 minutes ago have 55 minutes of remaining TTL. This is why TTL reduction before a change is critical: if you had set TTL to 60 seconds 24 hours before the change, the maximum propagation time after the change is only 60 seconds.

Diagnosis:
\`\`\`bash
dig @8.8.8.8 api.example.com          # Google's resolver — has it propagated?
dig @1.1.1.1 api.example.com          # Cloudflare — different cache
dig @ns1.example.com api.example.com  # Authoritative — the ground truth
\`\`\`
Also use \`whatsmydns.net\` to check resolution from global vantage points simultaneously.

The authoritative nameserver always returns the new record immediately. If \`dig @authoritative\` shows the new record but clients see the old one, the issue is resolver caching — you must wait for the TTL to expire.

Fix for the current incident: wait for TTL to expire (maximum = old record's TTL). For future: implement a TTL reduction procedure — lower TTL to 60 seconds 24h before any planned DNS change, perform the change, then restore TTL after propagation.`,
      },
    ],
    quickFire: [
      { q: 'Difference between NXDOMAIN and SERVFAIL?', a: 'NXDOMAIN = authoritative confirmation the name does not exist. SERVFAIL = resolver encountered an error (nameserver unreachable, DNSSEC failure, resolver broken).' },
      { q: 'How long does DNS propagation take after a record change?', a: 'Up to the TTL of the old record. Resolvers that cached it keep the old value until their cache expires. Reduce TTL to 60s 24h before a planned change.' },
      { q: 'What command checks a specific DNS resolver?', a: 'dig @8.8.8.8 api.example.com -- the @ flag specifies which resolver to query. Use the authoritative nameserver to get the ground truth.' },
      { q: 'What is ndots in Kubernetes DNS?', a: '/etc/resolv.conf sets ndots:5. Names with fewer than 5 dots are treated as relative, triggering multiple search-domain queries before the absolute lookup -- heavy CoreDNS load.' },
      { q: 'What Kubernetes component handles DNS resolution for pods?', a: 'CoreDNS -- runs as pods in kube-system. If CoreDNS pods crash or are overloaded, all .svc.cluster.local resolution fails for every pod.' },
      { q: 'What does negative caching mean in DNS?', a: 'NXDOMAIN responses are cached for the SOA minimum TTL (often 300-3600s). New records are not visible until this cache expires even after the record is created.' },
      { q: 'How do you flush DNS cache on a Linux host?', a: 'systemctl restart systemd-resolved (systemd) or service nscd restart (older). On Mac: sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder.' },
      { q: 'How do you debug CoreDNS failures in Kubernetes?', a: 'kubectl logs -n kube-system -l k8s-app=kube-dns. Also: kubectl run debug --image=busybox --rm -it -- nslookup kubernetes.default to test resolution.' },
      { q: 'What is split-horizon DNS?', a: 'Serving different DNS records to internal vs external clients for the same hostname -- typically internal clients get private IPs, external clients get public IPs.' },
    ],
    references: [
      'https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/',
    ],
  },

  {
    id: 'ts-vpc-connectivity',
    title: 'VPC Connectivity Failures',
    icon: 'globe',
    color: '#3b82f6',
    questions: 5,
    description: 'Security groups, NACLs, routing, VPC peering, NAT gateway failures, and VPC Flow Logs diagnosis.',
    visualizations: [],
    introduction: `## Overview
VPC connectivity failures are among the most common issues in AWS architectures. They often look like network timeouts but are caused by misconfigured security groups, NACLs, missing routes, or broken peering.

The key distinction between security groups and NACLs: security groups are stateful (return traffic is automatically allowed), operate at the instance level, support only allow rules, and all rules are evaluated. NACLs are stateless (you must explicitly allow return traffic on ephemeral ports), operate at the subnet level, support both allow and deny rules, and rules are evaluated in ascending order — the first matching rule wins.

VPC Flow Logs record every network flow at the ENI level with an ACCEPT or REJECT decision. A REJECT in VPC Flow Logs means either the security group or NACL blocked the traffic. The action field tells you which: security groups generate their own ENI-level log; NACLs generate a log at the subnet boundary.

Common patterns: "Connection timed out" usually means packets are being silently dropped (security group or NACL with DROP semantics). "Connection refused" means the host is reachable but the port is not open (service not listening or security group blocking with REJECT). A security group REJECT generates an ICMP unreachable; a NACL DENY rule can also generate it (or drop silently depending on rule action).

VPC peering requires: (1) peering connection accepted, (2) route added in both VPC route tables (each VPC must have a route to the other VPC's CIDR via the peering connection), (3) security groups updated to allow traffic from the peered VPC's CIDR.`,
    whenToUse: [
      'Diagnosing why a service in one VPC cannot reach a service in a peered VPC',
      'Distinguishing a security group rule issue from a NACL rule issue',
      'Using VPC Flow Logs to confirm whether traffic is reaching the instance',
      'Troubleshooting why Lambda functions cannot reach RDS in a private subnet',
    ],
    keyConcepts: [
      { term: 'Security group (stateful)', definition: 'Instance-level firewall. Return traffic automatically allowed for established connections. Only allow rules. All rules evaluated simultaneously.' },
      { term: 'NACL (stateless)', definition: 'Subnet-level firewall. Must explicitly allow both inbound and outbound for each traffic direction including return traffic on ephemeral ports (1024-65535). Rules evaluated in order.' },
      { term: 'VPC Flow Logs', definition: 'Per-ENI log of network flows with ACCEPT/REJECT decision. Critical for determining whether traffic is blocked by security group (instance-level) or NACL (subnet-level).' },
      { term: 'VPC peering route requirement', definition: 'Both VPCs need a route pointing their CIDR to the peering connection gateway (pcx-xxxx). Security groups in each VPC must allow traffic from the other VPC\'s CIDR.' },
      { term: 'Ephemeral ports', definition: 'Client-side ports 1024-65535 used for TCP return traffic. NACLs must explicitly allow outbound 1024-65535 for return traffic to clients.' },
    ],
    pitfalls: [
      'Forgetting to add routes in both VPCs for VPC peering — peering is not transitive and does not automatically add routes. Each VPC needs a manual route pointing the remote CIDR to the pcx attachment.',
      'Adding a NACL ALLOW for inbound traffic but forgetting the outbound ALLOW for ephemeral ports — NACLs are stateless. Without the outbound ephemeral port rule, TCP responses are dropped at the subnet boundary.',
      'Looking at the source instance security group but not the destination — a connectivity failure requires checking security groups on BOTH ends: source outbound AND destination inbound.',
    ],
    keyQuestions: [
      {
        question: 'You added a new microservice in VPC-B, but services in VPC-A (which is peered) cannot connect. What do you check?',
        answer: `VPC peering connectivity requires four things to all be correct. I check them in order:

1. Peering connection state:
AWS Console > VPC > Peering Connections. Is the peering connection Active (not Pending Acceptance)?

2. Route tables in both VPCs:
VPC-A route table: is there a route to VPC-B's CIDR (e.g., 10.1.0.0/16) via pcx-xxxxxxxx?
VPC-B route table: is there a route to VPC-A's CIDR (e.g., 10.0.0.0/16) via the same pcx?
Missing routes are the most common cause. Add: route 10.1.0.0/16 → pcx-xxxx in VPC-A's route table.

3. Security groups:
VPC-A source security group: does outbound allow traffic to VPC-B's CIDR on the target port?
VPC-B destination security group: does inbound allow traffic from VPC-A's CIDR (or VPC-A's source security group ID) on the target port?

4. NACLs (if custom NACLs are in use):
VPC-A subnet NACL: outbound allow to VPC-B CIDR on target port AND return inbound on ephemeral ports 1024-65535?
VPC-B subnet NACL: inbound allow from VPC-A CIDR on target port AND outbound on ephemeral ports?

5. VPC Flow Logs (if still failing):
Enable on VPC-B's ENI. Look for the source IP from VPC-A. Is the action ACCEPT or REJECT?
REJECT at VPC-B ENI level → security group. REJECT at VPC-B subnet level (NACL) → both NACL and SG must be checked separately.

6. Service binding:
Is the new microservice listening on 0.0.0.0:<port> (all interfaces)? If it binds only to 127.0.0.1, it is not reachable from any network.`,
      },
    ],
    quickFire: [
      { q: 'Key difference between security groups and NACLs?', a: 'Security groups are stateful (return traffic auto-allowed), instance-level, allow-only. NACLs are stateless (must allow return traffic explicitly), subnet-level, allow and deny.' },
      { q: 'Connection timed out vs connection refused -- what does each mean?', a: 'Timed out = packets silently dropped (SG or NACL blocking). Refused = host reachable but port not open (service not listening or SG REJECT).' },
      { q: 'What do VPC Flow Logs tell you?', a: 'Per-ENI log of network flows with ACCEPT or REJECT decision. REJECT confirms traffic is blocked -- helps pinpoint whether it is SG (instance) or NACL (subnet).' },
      { q: 'What four things are required for VPC peering to work?', a: 'Peering connection accepted, route in VPC-A pointing to VPC-B CIDR via pcx, route in VPC-B pointing to VPC-A CIDR via pcx, and security groups allowing traffic from the peered CIDR.' },
      { q: 'Why must NACLs allow ephemeral ports outbound?', a: 'NACLs are stateless. TCP return traffic uses ephemeral ports 1024-65535. Without an outbound allow rule for these ports, responses are dropped at the subnet.' },
      { q: 'What is the most common VPC peering mistake?', a: 'Adding the peering connection but forgetting to add routes in both VPC route tables. Peering does not auto-add routes -- each VPC needs a manual route entry.' },
      { q: 'How do you confirm traffic is reaching an EC2 instance from another VPC?', a: 'Enable VPC Flow Logs on the destination ENI. Look for the source IP. ACCEPT = traffic arrives. REJECT = blocked by SG or NACL. No entry = never reaches the instance.' },
      { q: 'What breaks when a service binds only to 127.0.0.1?', a: 'It is only reachable from the same host. Remote clients and VPC peers get connection refused. Fix: bind to 0.0.0.0 to listen on all interfaces.' },
    ],
    references: [
      'https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html',
      'https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html',
    ],
  },

  // ─── CI/CD ISSUES ──────────────────────────────────────────────────────────
  {
    id: 'ts-staging-passes-prod-fails',
    title: 'Staging Passes, Prod Fails',
    icon: 'gitMerge',
    color: '#22c55e',
    questions: 7,
    description: 'Environment parity, config differences, data volume, external dependencies, feature flags, and infrastructure differences.',
    visualizations: [],
    introduction: `## Overview
"It works in staging but not in production" is one of the most frustrating and common failure patterns. It indicates environment parity problems — staging and production are not equivalent environments. The root causes fall into several categories.

Configuration differences: environment variables, feature flags, secrets, and service URLs that differ between staging and prod. A service URL pointing to a mock in staging but a real dependency in prod. A database connection string with different timeout or pool settings.

Data volume differences: staging typically has a fraction of production data. Queries that complete in 100ms in staging on 10,000 rows take 30 seconds in prod on 100 million rows. Missing indexes are invisible in staging but catastrophic in prod. Performance issues caused by data volume are almost never caught in staging without load testing.

External dependency differences: staging integrates with sandbox payment processors, test email providers, and mock third-party APIs. Production uses real endpoints with rate limits, SLAs, and failure modes that the sandbox never exhibits. A third-party API that is always available in staging but has intermittent 429 (rate limit) responses in prod.

Infrastructure differences: staging may use a single EC2 instance or shared RDS, while prod uses Auto Scaling groups, RDS Multi-AZ, and ElastiCache clusters. Race conditions, caching inconsistencies, and distributed state issues only manifest at production scale.

Feature flags introduce another source of parity loss: if a feature flag is enabled in staging but not prod (or vice versa), testing staging provides false confidence about prod behavior.`,
    whenToUse: [
      'Explaining why identical code behaves differently in staging and production',
      'Designing environment parity improvements in a CI/CD pipeline',
      'Using feature flags safely without creating invisible environment differences',
      'Implementing production load testing to find data-volume-related bugs before they go live',
    ],
    keyConcepts: [
      { term: 'Environment parity', definition: 'The degree to which staging and production match in configuration, data, infrastructure, and external dependencies. Higher parity reduces staging-passes-prod-fails incidents.' },
      { term: 'Config drift', definition: 'Over time, staging and prod configurations diverge as changes are made to one but not the other. Use infrastructure-as-code (Terraform, CDK) to keep configurations in sync.' },
      { term: 'Data volume testing', definition: 'Testing with production-like data volumes. Often requires anonymized production data dumps or synthetic data generators. Catches index and query performance issues invisible on small datasets.' },
      { term: 'Canary deployment', definition: 'Routing a small percentage of production traffic to the new version. Real users test on real data and real external dependencies. Catches prod-specific issues before full rollout.' },
      { term: 'Shadow testing', definition: 'Sending a copy of production traffic to the new version in parallel (without returning the response to the user). Compares responses for correctness without user impact.' },
    ],
    pitfalls: [
      'Using a single-instance database in staging instead of matching the production topology — many production failures (replication lag, Multi-AZ failover behavior, connection pooling under concurrent load) are invisible in single-instance staging.',
      'Not testing with production-representative data volumes — query plans chosen by the optimizer on 1,000 rows are often completely different from plans chosen on 100,000,000 rows.',
      'Leaving feature flags in different states between staging and production — if prod has a flag off that staging has on, testing staging gives false confidence. Audit flag states as part of deployment checklists.',
    ],
    keyQuestions: [
      {
        question: 'A new database query works fine in staging but causes prod to time out. How do you diagnose and fix it without rolling back?',
        answer: `The most common cause is data volume: the query optimizer chooses a different execution plan on prod (sequential scan on 100M rows) vs staging (index scan on 10K rows). Statistics may also be stale.

Immediate mitigation (buy time):
\`\`\`sql
SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE query LIKE '%your_query%';
\`\`\`
If the query is holding locks, cancel it to unblock other operations.

Diagnosis:

1. Run EXPLAIN ANALYZE on production (use a read replica if available):
\`\`\`sql
EXPLAIN (ANALYZE, BUFFERS) SELECT ... [problematic query];
\`\`\`
Look for Seq Scan on large tables, or actual rows wildly different from estimated rows.

2. Check pg_stat_statements for aggregate timing:
\`\`\`sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%table_name%'
ORDER BY mean_exec_time DESC;
\`\`\`

3. If plan differs from staging, statistics may be stale on prod:
\`\`\`sql
ANALYZE table_name;   -- Refreshes statistics without locking
\`\`\`

Fix without rollback:

Option A — Add an index (non-blocking):
\`\`\`sql
CREATE INDEX CONCURRENTLY idx_name ON table(column);
\`\`\`
Takes minutes for large tables. Query will immediately use it once built.

Option B — Rewrite behind a feature flag:
Deploy hotfix with optimized query behind a flag, enable it for 5%, verify latency, then roll to 100%.

Option C — Force index usage for diagnosis:
\`\`\`sql
SET enable_seqscan = OFF;   -- Forces planner to prefer index (diagnostic only, do not leave on)
\`\`\`

Prevent recurrence:
- Add query performance tests to CI using a dataset representative of production volume.
- Run \`EXPLAIN ANALYZE\` as part of staging migration validation.
- Use \`pg_stat_statements\` in staging with production-like data.`,
      },
    ],
    quickFire: [
      { q: 'Most common reason staging passes but prod fails?', a: 'Data volume -- queries that run in 100ms on 10K staging rows take 30s on 100M prod rows. Missing indexes are invisible at small scale.' },
      { q: 'What is environment parity and why does it matter?', a: 'The degree to which staging matches production in config, data, infrastructure, and dependencies. Low parity means staging gives false confidence about prod behavior.' },
      { q: 'How do you test with production-representative data without exposing PII?', a: 'Use anonymized production data dumps (mask emails, names, PII fields) or synthetic data generators that match production cardinality and distributions.' },
      { q: 'What is a canary deployment and how does it help staging-prod gaps?', a: 'Routing a small percentage of real production traffic to the new version. Catches prod-specific failures (real data, real dependencies) before full rollout.' },
      { q: 'How do feature flags cause staging-prod differences?', a: 'If a flag is on in staging but off in prod (or vice versa), testing staging gives false confidence. Audit flag states as part of deployment checklists.' },
      { q: 'What is shadow testing?', a: 'Sending a copy of production traffic to the new version in parallel without returning its response to users. Compares responses for correctness with zero user impact.' },
      { q: 'What infrastructure differences between staging and prod cause hidden bugs?', a: 'Staging often uses a single DB instance; prod uses Multi-AZ, replicas, connection poolers. Race conditions, replication lag, and distributed-state bugs only appear at prod scale.' },
      { q: 'How do you add an index non-blocking to fix a prod-only slow query?', a: 'CREATE INDEX CONCURRENTLY -- builds without locking the table. Run during low traffic; the query will use the index immediately once built.' },
    ],
    references: [
      'https://12factor.net/dev-prod-parity',
    ],
  },

  {
    id: 'ts-zero-downtime-schema-change',
    title: 'Zero-Downtime Schema Changes',
    icon: 'gitMerge',
    color: '#22c55e',
    questions: 6,
    description: 'Expand-contract pattern, online schema changes, column renames, index creation, and backward compatibility.',
    visualizations: [],
    introduction: `## Overview
Database schema migrations that lock tables cause downtime. For high-traffic databases, even a millisecond-level lock on a large table causes connection queue buildup that looks like an outage. Zero-downtime migrations require a disciplined approach.

The expand-contract (two-phase) pattern is the foundation. Phase 1 (expand): add the new structure alongside the old (new column, new table, new index) while keeping the old structure in place. Phase 2 (contract): after all code is deployed and no longer uses the old structure, remove it. This separates the deploy timeline from the migration timeline.

Adding a NOT NULL column with a DEFAULT: in older PostgreSQL (before 11), this required a full table rewrite (table lock). PostgreSQL 11+ can add a NOT NULL column with a constant default without rewriting the table. For computed defaults, use: add the column as NULLABLE first, backfill in batches, then add the NOT NULL constraint (still requires scanning the table but does not lock).

Online schema change tools: pt-online-schema-change (Percona, for MySQL) and pgroll (for PostgreSQL) perform migrations by creating a new table/structure, syncing data in the background with triggers, and performing a hot cutover. gh-ost (GitHub) is another MySQL online schema change tool that uses binary log streaming instead of triggers.

Index creation: CREATE INDEX CONCURRENTLY in PostgreSQL creates an index without taking a table lock. It takes longer but allows concurrent reads and writes. Always use CONCURRENTLY in production. For MySQL, ALTER TABLE ... ALGORITHM=INPLACE avoids full table copy for supported changes.

Column rename is one of the most dangerous migrations: there is no way to rename a column without either a table lock or the expand-contract pattern (add new column, copy data, update application to use new column, drop old column across multiple deployments).`,
    whenToUse: [
      'Planning a schema change for a table with millions of rows in production',
      'Explaining why renaming a column requires multiple deploys',
      'Using the expand-contract pattern to add a NOT NULL column safely',
      'Choosing between pt-osc and gh-ost for a MySQL migration',
    ],
    keyConcepts: [
      { term: 'Expand-contract', definition: 'Add new structure alongside old (expand), deploy code using new structure, remove old structure (contract). Decouples the migration from the deploy. Requires multiple deploy phases.' },
      { term: 'CREATE INDEX CONCURRENTLY', definition: 'PostgreSQL command to create an index without locking the table. Allows concurrent reads/writes. Takes longer. Can fail if a concurrent write conflicts — drop the partial index and retry.' },
      { term: 'Backfill in batches', definition: 'UPDATE in small batches (1000-10000 rows) with sleep between batches to avoid locking the table. UPDATE large_table SET new_col = compute(old_col) WHERE id BETWEEN 1 AND 1000.' },
      { term: 'gh-ost', definition: 'GitHub online schema change for MySQL. Streams binary log (no triggers), creates shadow table, applies changes, does atomic cut-over. Zero writes to the original table during migration.' },
      { term: 'pgroll', definition: 'PostgreSQL online schema change tool. Uses multi-version schema approach — both old and new schema are active simultaneously, allowing multiple application versions during rollout.' },
    ],
    pitfalls: [
      'Running ALTER TABLE ADD COLUMN NOT NULL DEFAULT now() on a large table in production — this locks the table for the duration of the full table rewrite. Pre-PostgreSQL 11 and MySQL without INPLACE algorithm.',
      'Removing a column in the same deploy as the application change that stops using it — if rollback is needed, the old application code tries to read the deleted column and fails.',
      'Creating a unique constraint directly instead of a unique index — unique constraint creation locks the table; CREATE UNIQUE INDEX CONCURRENTLY does not.',
    ],
    keyQuestions: [
      {
        question: 'How do you safely rename a column in a production PostgreSQL table with 500 million rows without downtime?',
        answer: `Column rename cannot be done atomically in PostgreSQL without locking. The safe path requires five phases across several days.

Phase 1 (Deploy v1) — Add the new column:
\`\`\`sql
ALTER TABLE orders ADD COLUMN customer_id BIGINT;
\`\`\`
Instant — adding a nullable column without a default requires no table rewrite.

Phase 2 — Backfill the new column from the old:
\`\`\`sql
UPDATE orders SET customer_id = user_id WHERE id >= :start AND id < :end;
\`\`\`
Run in batches of 10,000 rows with \`sleep(10ms)\` between batches to avoid I/O saturation. Takes hours for 500M rows — run as a background job.

Add a trigger to keep columns in sync during backfill:
\`\`\`sql
CREATE TRIGGER sync_customer_id BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION fn_sync_customer_id();
\`\`\`

Phase 3 (Deploy v2) — Update application to write both columns, read from new:
Application writes both \`user_id\` and \`customer_id\` on insert/update. Reads from \`customer_id\`. Verify the new column has correct data.

Phase 4 — Add NOT NULL constraint (once backfill is complete):
\`\`\`sql
ALTER TABLE orders ADD CONSTRAINT orders_customer_id_not_null
  CHECK (customer_id IS NOT NULL) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT orders_customer_id_not_null;
\`\`\`
\`NOT VALID\` + \`VALIDATE\` scans the table without a full lock (PostgreSQL 9.2+).

Phase 5 (Deploy v3) — Remove the old column:
\`\`\`sql
DROP TRIGGER sync_customer_id ON orders;
ALTER TABLE orders DROP COLUMN user_id;   -- Safe — no code uses it
\`\`\`

This five-phase process takes 3-5 deploys over several days but maintains zero downtime throughout.`,
      },
    ],
    quickFire: [
      { q: 'What is the expand-contract pattern for schema changes?', a: 'Add the new structure alongside the old (expand), deploy code that uses the new structure, then remove the old structure (contract). Decouples migration from deploy.' },
      { q: 'How do you add a NOT NULL column to a large table without downtime?', a: 'Add as NULLABLE first, backfill in batches with sleep between batches, then add NOT NULL constraint using NOT VALID + VALIDATE CONSTRAINT to avoid a full table lock.' },
      { q: 'Why is renaming a column the most dangerous migration?', a: 'No atomic rename without a table lock or multi-phase expand-contract. Requires 3-5 deploys: add new column, write both, backfill, drop old column.' },
      { q: 'What does CREATE INDEX CONCURRENTLY do differently?', a: 'Builds the index without a table lock, allowing concurrent reads and writes throughout. Takes longer but does not block production traffic.' },
      { q: 'What is gh-ost and how does it differ from pt-osc?', a: 'Both are online MySQL schema change tools. gh-ost streams binary log (no triggers) for zero writes to the original table. pt-osc uses triggers which add write overhead.' },
      { q: 'Why should you never drop a column in the same deploy as the code change?', a: 'If rollback is needed, the old code tries to read the deleted column and fails. Remove the column only after the new code is fully deployed and verified stable.' },
      { q: 'What is pgroll?', a: 'A PostgreSQL online schema change tool using a multi-version schema approach -- both old and new schema are active simultaneously, enabling safe multi-version rollouts.' },
      { q: 'How do you create a unique constraint without locking the table?', a: 'Use CREATE UNIQUE INDEX CONCURRENTLY then ADD CONSTRAINT USING INDEX -- never use ADD CONSTRAINT directly, which takes a full table lock.' },
    ],
    references: [
      'https://www.postgresql.org/docs/current/sql-createindex.html',
      'https://github.com/github/gh-ost',
    ],
  },

  // ─── OBSERVABILITY ─────────────────────────────────────────────────────────
  {
    id: 'ts-alerts-stopped-firing',
    title: 'Alerts Not Firing',
    icon: 'activity',
    color: '#06b6d4',
    questions: 6,
    description: 'Alert silence, inhibition, scrape failures, rule misconfiguration, dead man\'s switch, and alertmanager routing.',
    visualizations: [],
    introduction: `## Overview
Silent alerts are an existential threat to reliability — the monitoring system is supposed to tell you when something breaks, but if alerts fail to fire, you discover outages from customers instead. Diagnosing why an expected alert did not fire requires checking the entire pipeline from metric collection through rule evaluation to notification routing.

The Prometheus alert pipeline: Prometheus scrapes metrics from targets, evaluates alerting rules against the scraped data, and sends firing alerts to Alertmanager. Alertmanager routes alerts to receivers (PagerDuty, Slack, email) while applying grouping, inhibition, and silences.

Common failure points:
Target scrape failure: if Prometheus cannot scrape a target, it has no data for that target's metrics. Alerting rules that evaluate to "absent data" may not fire as expected. absent() function explicitly alerts on missing metrics.

Alerting rule misconfiguration: the rule's PromQL query has a typo, references a label that changed, or has a threshold that no longer matches the metric's scale. Test rules with promtool check rules or by running the query directly in the Prometheus UI.

Alertmanager silence: a silence created during a maintenance window may still be active. Check the Alertmanager UI for active silences. Old silences that were never removed are a frequent cause of alerts not reaching on-call.

Inhibition: one alert inhibiting another. If a "cluster down" alert is configured to inhibit all component alerts (to reduce noise), and the cluster is degraded but not fully down, the inhibition may not trigger while individual alerts still need to fire.

Dead man's switch (Watchdog alert): an always-firing alert that confirms the entire alerting pipeline is working. If the Watchdog alert stops firing, the pipeline itself is broken.`,
    whenToUse: [
      'Investigating why an expected alert did not fire during a production incident',
      'Auditing alerting configuration after a postmortem',
      'Setting up a dead man\'s switch to detect alerting pipeline failures',
      'Explaining why an Alertmanager silence from last month is still suppressing alerts',
    ],
    keyConcepts: [
      { term: 'Dead man\'s switch (Watchdog)', definition: 'An always-firing alert (expr: vector(1)) that continuously sends notifications. If it stops, the alerting pipeline is broken. Route it to a separate receiver that triggers if quiet for >5 minutes.' },
      { term: 'Alertmanager inhibition', definition: 'Suppresses alerts matching a target matcher when a source alert is firing. Used to reduce noise (e.g., suppress service alerts when the entire cluster is down). Can cause missing alerts if misconfigured.' },
      { term: 'Alertmanager silence', definition: 'Temporary suppression of alerts matching specific matchers. Created during planned maintenance. Forgotten silences are a common cause of alerts never reaching on-call after maintenance ends.' },
      { term: 'absent() function', definition: 'Prometheus function that returns 1 if no time series match the selector. Use it to alert when a metric disappears (target down, label changed, service stopped exporting).' },
      { term: 'for clause', definition: 'Alert fires only after condition is true for this duration (e.g., for: 5m). If the condition resolves before 5 minutes, the alert never fires. Prevents flapping but can delay detection.' },
    ],
    pitfalls: [
      'Not testing alerting rules after a metric label change — if a service renames a label (env to environment), all alerting rules matching the old label silently stop firing.',
      'Using for: 1h on critical alerts to reduce noise — this means an outage must persist for 1 hour before you are paged. Keep critical alert for durations at 0 or 1-2 minutes.',
      'Creating Alertmanager silences during maintenance and not cleaning them up — a 4-hour silence set at 9pm can still be active at midnight when the next incident occurs.',
    ],
    keyQuestions: [
      {
        question: 'During a postmortem, you discover that an alert should have fired 30 minutes before the outage was detected. How do you diagnose why it did not fire?',
        answer: `I work through each stage of the alerting pipeline backwards:

Stage 1 — Was the alert rule evaluating correctly?
Check \`Prometheus UI > Alerts\`. Find the alert and look at its state at the incident time. Run the alert's PromQL query with a past timestamp:
\`\`\`promql
my_metric{job="api"} @ 2024-01-15T14:30:00Z
\`\`\`
Was the metric above the threshold at that time?

Stage 2 — Was the metric being scraped?
Check \`Status > Targets\`. Was the target UP at the incident time?
\`\`\`promql
up{job="api"} @ 2024-01-15T14:30:00Z
\`\`\`
If 0, Prometheus was not scraping the target — no data means no alert.

Stage 3 — Did the alert reach Alertmanager?
Check \`Alertmanager UI > Alerts\`. Was the alert in firing state there? If not: the \`for\` clause may have prevented it. If the alert condition was true for only 2 of the required 5 minutes, it never transitioned to firing.

Stage 4 — Was there an active silence or inhibition?
Check \`Alertmanager UI > Silences\` for active silences matching the alert's labels. Check \`Inhibitions\` for any suppression rule that matched.

Stage 5 — Did the notification send?
\`\`\`bash
kubectl logs -n monitoring alertmanager-0
\`\`\`
Look for the alert name. Did it attempt delivery? Did the receiver (PagerDuty/Slack) confirm receipt?

Remediation based on finding:
- Metric missing: add \`absent()\` rule as a separate alert
- \`for\` clause too long: reduce it for critical alerts (0 or 1-2 minutes)
- Silence left active: add a process to review and clean up silences after maintenance windows
- Notification failure: check receiver credentials, webhook URL health
- Add a Watchdog/dead man's switch alert routed to a dedicated "always notify" receiver`,
      },
    ],
    quickFire: [
      { q: 'First thing to check when an alert did not fire?', a: 'Prometheus Alerts UI -- was the alert ever in a pending or firing state? Then check if the target was being scraped (up{job="..."} metric).' },
      { q: 'What is a dead man\'s switch alert?', a: 'An always-firing alert (expr: vector(1)) that continuously sends notifications. If it goes quiet, the alerting pipeline itself is broken.' },
      { q: 'What causes an Alertmanager silence to suppress alerts unexpectedly?', a: 'A silence created during maintenance was never removed. Old silences with broad label matchers continue suppressing alerts long after the maintenance window.' },
      { q: 'What does the "for" clause in an alerting rule do?', a: 'Delays the alert from firing until the condition is true for the specified duration. Prevents flapping but delays detection -- keep it short (0-2m) for critical alerts.' },
      { q: 'What is Alertmanager inhibition?', a: 'A rule that suppresses target alerts when a source alert is firing -- e.g., suppress service alerts when the entire cluster is down. Can cause missing alerts if misconfigured.' },
      { q: 'How do you alert on a metric that disappears entirely?', a: 'Use the absent() function: absent(up{job="api"}) returns 1 when no matching time series exist -- fires when a target stops being scraped.' },
      { q: 'How do you test a PromQL alerting rule before deploying?', a: 'Run the query directly in the Prometheus UI. Use promtool check rules to validate syntax. Use @ timestamp modifier to evaluate against historical data.' },
      { q: 'What is the Alertmanager routing tree?', a: 'A hierarchical set of routes that match alerts by label and send them to receivers. The first matching route wins. Misconfigured routes silently drop alerts.' },
      { q: 'Why might an alert have wrong threshold after a metric rename?', a: 'If a service renames a label (env to environment), all rules matching the old label silently stop matching and never fire.' },
    ],
    references: [
      'https://prometheus.io/docs/alerting/latest/alertmanager/',
      'https://prometheus.io/docs/alerting/latest/configuration/#inhibit_rule',
    ],
  },

  // ─── DATABASE ──────────────────────────────────────────────────────────────
  {
    id: 'ts-slow-queries',
    title: 'Slow Query Diagnosis',
    icon: 'database',
    color: '#8b5cf6',
    questions: 7,
    description: 'pg_stat_statements, slow query log, EXPLAIN ANALYZE, missing indexes, N+1 queries, and query rewrites.',
    visualizations: [],
    introduction: `## Overview
Slow queries are one of the most common causes of production performance degradation. They fall into several categories: missing index (full sequential scan), inefficient join (Cartesian product, wrong join type), N+1 query pattern (application code issuing one query per row of a result set), parameter sniffing causing bad plan caching, and lock contention causing queries to queue.

The diagnosis tools depend on the database. For PostgreSQL: pg_stat_statements (aggregated statistics per normalized query), slow query log (queries exceeding log_min_duration_statement milliseconds), EXPLAIN ANALYZE (actual execution plan with timing). For MySQL: slow query log (queries exceeding long_query_time), EXPLAIN FORMAT=JSON, Performance Schema.

EXPLAIN ANALYZE is the definitive tool. It shows: the execution plan (which join algorithms, which indexes, which sort methods were chosen), the estimated row counts vs actual row counts (large discrepancies indicate stale statistics), the actual time spent at each node, and buffer usage (shared hit = from cache, read = from disk).

Red flags in EXPLAIN output: Seq Scan on a large table (should usually be Index Scan for highly selective queries), nested loop with a large outer relation (O(n*m) cost), sort without an index (materializes rows in memory or spills to disk), HashAggregate with large hash tables. These indicate where to add indexes or rewrite the query.

N+1 detection: if your application logs show 1000 database queries for a page that conceptually needs 1, you have an N+1 problem. The fix is a JOIN or a batch load. ORM frameworks (Hibernate, ActiveRecord) have eager-loading options (JOIN FETCH, includes) to preload related entities.`,
    whenToUse: [
      'Finding the slow query causing a p99 latency spike using pg_stat_statements',
      'Using EXPLAIN ANALYZE to determine why a specific query is doing a sequential scan',
      'Identifying N+1 query patterns in an ORM-based application',
      'Planning an index strategy for a new query before deploying to production',
    ],
    keyConcepts: [
      { term: 'pg_stat_statements', definition: 'PostgreSQL extension tracking per-query statistics: total time, calls, mean time, standard deviation. Run SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC to find the worst offenders.' },
      { term: 'EXPLAIN (ANALYZE, BUFFERS)', definition: 'Shows actual execution plan with real timing and buffer usage. "Actual rows" vs "Estimated rows" mismatch means stale statistics — run ANALYZE. Shared hit = cache; read = disk I/O.' },
      { term: 'N+1 query', definition: 'Application issues one query for a list, then one query per item in the list. 1 + N queries instead of 1-2. Fix: JOIN or batch load (SELECT * WHERE id IN (...)).' },
      { term: 'Covering index', definition: 'An index that includes all columns needed by a query (WHERE + SELECT). The database can satisfy the query entirely from the index without accessing the table heap (index-only scan).' },
      { term: 'log_min_duration_statement', definition: 'PostgreSQL config: log queries that take longer than this threshold (in ms). Set to 1000 (1 second) in production. Set to 0 for full logging (very verbose — only for debugging).' },
    ],
    pitfalls: [
      'Running EXPLAIN without ANALYZE — EXPLAIN shows the estimated plan, not the actual plan. The optimizer\'s estimate can be wrong. Always use EXPLAIN ANALYZE to see actual timing and row counts.',
      'Running EXPLAIN ANALYZE on UPDATE/DELETE in production — it actually executes the mutation. Wrap in a transaction and roll back: BEGIN; EXPLAIN ANALYZE UPDATE ...; ROLLBACK;',
      'Adding an index on a low-selectivity column (e.g., a boolean is_active with 90% true) — the optimizer will choose a sequential scan anyway for queries that return a large fraction of rows. Indexes help most on high-selectivity columns.',
    ],
    keyQuestions: [
      {
        question: 'How do you find and fix an N+1 query problem in a production application?',
        answer: `Detection:
1. Enable slow query logging with a low threshold: \`log_min_duration_statement = 10\` (log queries > 10ms).
2. Look for repeating query patterns — the same query executed hundreds of times per second with slightly different parameter values (different ID each time).
3. In APM (Datadog, New Relic, Sentry), look for traces where a single request makes 100+ database queries.
4. In code, search for ORM calls inside loops: \`for order in orders: order.customer.name\` — fetches each customer individually.

Example N+1 in Python SQLAlchemy:
\`\`\`python
orders = session.query(Order).all()
for order in orders:
    print(order.customer.name)   # Issues one SELECT per order!
\`\`\`

Fix — eager loading with JOIN:
\`\`\`python
orders = session.query(Order).options(joinedload(Order.customer)).all()
for order in orders:
    print(order.customer.name)   # No additional queries — already loaded
\`\`\`

The eager load generates:
\`\`\`sql
SELECT orders.*, customers.*
FROM orders LEFT JOIN customers ON orders.customer_id = customers.id;
\`\`\`

For cases where a JOIN is too expensive (very large result sets), use a batch load instead:
\`\`\`python
order_ids = [o.id for o in orders]
customers = {c.id: c for c in session.query(Customer).filter(Customer.id.in_(order_ids)).all()}
for order in orders:
    print(customers[order.customer_id].name)
\`\`\`
This generates exactly two queries: one for orders, one batched customers query.

Prevention: add query count assertions in integration tests (\`assert db.query_count < 5\` for a page load), and use a SQL analyzer in CI that flags N+1 patterns.`,
      },
      {
        question: 'A query that used to take 10ms now takes 30 seconds. Nothing changed in the code. What happened?',
        answer: `Queries that were fast and become slow without code changes are caused by one of three things: data volume crossed a threshold that changed the optimizer's plan, statistics became stale, or a lock is blocking the query.

Check 1 — Is it blocked by a lock?
\`\`\`sql
SELECT pid, query, wait_event_type, wait_event, state
FROM pg_stat_activity
WHERE wait_event_type = 'Lock';
\`\`\`
If your query is waiting on a Lock, find who holds it:
\`\`\`sql
SELECT pg_blocking_pids(<your_pid>);
\`\`\`

Check 2 — Get the current execution plan:
\`\`\`sql
EXPLAIN (ANALYZE, BUFFERS) SELECT ... [the slow query];
\`\`\`
Look for: Seq Scan where you expect Index Scan, or rows estimated: 100 vs actual: 10,000,000 (stale statistics).

Check 3 — Update statistics:
\`\`\`sql
ANALYZE tablename;   -- Refreshes per-table statistics without locking
\`\`\`
If statistics were collected when the table had 100K rows but now has 50M, the optimizer makes wrong plan choices. PostgreSQL autovacuum normally handles this, but heavily written tables can outpace it.

Check 4 — Data volume threshold:
The optimizer uses a cost model. For small tables, sequential scans are cheaper than index scans. As tables grow past the crossover point, the optimizer should switch to index scans — but only if statistics are current.

Force index usage temporarily while you fix statistics:
\`\`\`sql
SET enable_seqscan = OFF;   -- Diagnostic only — do not leave on in production
\`\`\`

Permanent fix: increase autovacuum frequency for hot tables, add BRIN or partial indexes for range-based queries, and consider table partitioning for tables exceeding 100M rows.`,
      },
    ],
    quickFire: [
      { q: 'What is pg_stat_statements?', a: 'A PostgreSQL extension that aggregates per-query stats: total time, calls, mean time. SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC finds the worst offenders.' },
      { q: 'Difference between EXPLAIN and EXPLAIN ANALYZE?', a: 'EXPLAIN shows the estimated plan. EXPLAIN ANALYZE actually executes the query and shows real row counts and timing. Always use ANALYZE to catch wrong optimizer estimates.' },
      { q: 'What is the N+1 query problem?', a: 'An application issues one query for a list, then one query per item. Fix: use a JOIN or batch load (SELECT WHERE id IN (...)) to reduce N+1 queries to 1-2.' },
      { q: 'How do you safely run EXPLAIN ANALYZE on an UPDATE in production?', a: 'Wrap it in a transaction: BEGIN; EXPLAIN ANALYZE UPDATE ...; ROLLBACK; -- this executes the mutation but rolls it back, showing the real plan without committing changes.' },
      { q: 'What does log_min_duration_statement do?', a: 'Logs any query exceeding the threshold in milliseconds. Set to 1000 in production to catch slow queries without excessive log volume.' },
      { q: 'What is a covering index?', a: 'An index that includes all columns needed by a query (WHERE + SELECT columns). The DB satisfies the query entirely from the index without accessing the table heap.' },
      { q: 'Why is adding an index on a boolean column often useless?', a: 'Low selectivity -- a column that is 90% true means the optimizer returns a large fraction of rows and prefers a sequential scan over an index scan.' },
      { q: 'A query was fast and now takes 30s with no code change. What happened?', a: 'Either data volume crossed a threshold changing the optimizer plan, statistics became stale, or a lock is blocking it. Check pg_stat_activity for wait_event_type = Lock first.' },
    ],
    references: [
      'https://www.postgresql.org/docs/current/pgstatstatements.html',
      'https://use-the-index-luke.com/',
    ],
  },

  {
    id: 'ts-connection-pool-exhausted',
    title: 'Connection Pool Exhausted',
    icon: 'database',
    color: '#8b5cf6',
    questions: 5,
    description: 'Connection pool sizing, max_connections, PgBouncer, RDS Proxy, idle connections, and leak detection.',
    visualizations: [],
    introduction: `## Overview
Database connection pools are finite resources. When the pool is exhausted, new requests queue waiting for a connection. If the wait exceeds the timeout, requests fail with "connection pool timeout" or "too many connections" errors. This is one of the most common causes of database-related outages during traffic spikes.

PostgreSQL has a max_connections parameter (default 100 on many RDS instance types). Each connection uses approximately 5-10 MB of RAM on the database server. The total effective connections must stay below max_connections across all application instances.

At scale: if you have 50 app server instances each with a connection pool of 10, that is 500 potential connections — five times the default limit. The solution is a connection pooler: PgBouncer or RDS Proxy sits between the application and the database, multiplexing many application connections onto a smaller number of database connections.

PgBouncer modes: session pooling (one database connection per client session, same as no pooling), transaction pooling (database connection returned to pool after each transaction — can multiplex N app connections onto far fewer database connections, but prepared statements and advisory locks require session mode), statement pooling (most aggressive, limited compatibility).

Connection leaks occur when application code forgets to close a connection (or return it to the pool) on error paths. The pool fills with connections that are open but not being used for queries. Detection: monitor the number of idle connections in pg_stat_activity. If idle connections match pool max, there is likely a leak.`,
    whenToUse: [
      'Diagnosing "too many connections" errors during a traffic spike',
      'Sizing a connection pool for a microservice at scale',
      'Implementing PgBouncer or RDS Proxy to support Lambda or serverless workloads',
      'Finding a connection leak in an application that slowly accumulates idle DB connections',
    ],
    keyConcepts: [
      { term: 'max_connections', definition: 'PostgreSQL hard limit on simultaneous database connections. Exceeding it causes "FATAL: sorry, too many clients already". Each connection uses ~5-10 MB. Increase with caution.' },
      { term: 'PgBouncer transaction mode', definition: 'Assigns a database connection only during a transaction. Allows 100 app connections to share 10 database connections if queries are short. Incompatible with prepared statements and session-level settings.' },
      { term: 'Connection leak', definition: 'Application code that opens a connection but fails to close it on error paths. Connections fill the pool until it is exhausted. Detect with pg_stat_activity: SELECT count(*), state FROM pg_stat_activity GROUP BY state.' },
      { term: 'RDS Proxy', definition: 'AWS-managed connection pooler for RDS/Aurora. Integrates with IAM authentication, Secrets Manager rotation. Particularly valuable for Lambda functions that cannot maintain connection pools between invocations.' },
      { term: 'Pool sizing formula', definition: 'Empirical rule: pool size = ((core_count * 2) + effective_spindle_count). For a 4-core database server with SSDs: pool per app instance = 9. Total connections = 9 * app_instances.' },
    ],
    pitfalls: [
      'Setting a very large connection pool on each application instance without accounting for total connections across all instances — a fleet of 100 app servers with pool size 50 = 5,000 connections, far exceeding RDS max_connections.',
      'Using PgBouncer transaction mode with application code that uses prepared statements or SET LOCAL — these require session-level persistence that transaction mode does not provide. Test thoroughly before switching modes.',
      'Not setting connection idle timeouts — idle connections in the pool hold open database connections. Set both pool idle timeout and database idle_session_timeout to reclaim connections not in use.',
    ],
    keyQuestions: [
      {
        question: 'Your application is getting "too many connections" errors during a traffic spike. How do you resolve it immediately and prevent it long-term?',
        answer: `Immediate triage:

1. Identify how many connections are in use:
\`\`\`sql
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
\`\`\`
If \`count(*)\` equals or exceeds \`max_connections\`, the database is full.

2. Find idle connections that could be reclaimed:
\`\`\`sql
SELECT pid, usename, application_name, state, query_start
FROM pg_stat_activity WHERE state = 'idle' ORDER BY query_start;
\`\`\`
Kill long-idle connections:
\`\`\`sql
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE state = 'idle' AND query_start < now() - interval '5 minutes';
\`\`\`

3. Find connection leaks — idle in transaction connections open too long:
\`\`\`sql
SELECT pid, usename, state, query, now() - state_change AS age
FROM pg_stat_activity
WHERE state = 'idle in transaction' AND state_change < now() - interval '2 minutes';
\`\`\`
These are transactions that were opened but never committed or rolled back — a bug in the application.

4. Temporarily increase \`max_connections\` (requires restart on RDS):
This is a last resort and has RAM implications. Better to route around the problem.

5. Route traffic to a read replica for read-heavy queries immediately to reduce primary load.

Long-term fix:
- Deploy PgBouncer in transaction mode between application and RDS. This multiplexes application connections onto fewer database connections.
- For Lambda/serverless: use RDS Proxy which is designed for ephemeral client connection patterns.
- Tune connection pool settings: pool size per instance should not exceed \`(max_connections - reserved_connections) / number_of_app_instances\`.
- Add idle connection timeout in the pool configuration: \`idleTimeoutMillis: 30000\` (HikariCP, node-postgres, etc.).
- Fix connection leaks: ensure connections are always closed in \`finally\` blocks or use context managers (\`with\` statements).`,
      },
    ],
    quickFire: [
      { q: 'What SQL shows current connection counts by state?', a: 'SELECT count(*), state FROM pg_stat_activity GROUP BY state -- idle in transaction connections are a leak signal.' },
      { q: 'What is PgBouncer transaction mode?', a: 'Assigns a database connection only during an active transaction. Allows many app connections to share few DB connections. Incompatible with prepared statements and session-level settings.' },
      { q: 'How do you calculate the right connection pool size?', a: 'Empirical rule: (core_count * 2) + spindle_count per DB server. Total across all app instances must stay below max_connections minus reserved admin connections.' },
      { q: 'What is a connection leak and how do you detect it?', a: 'App opens connections but fails to close them on error paths. Detect with pg_stat_activity: count of idle or idle-in-transaction connections that grow over time.' },
      { q: 'What is RDS Proxy and why use it with Lambda?', a: 'AWS-managed connection pooler. Lambda cannot maintain persistent connections between invocations -- RDS Proxy multiplexes thousands of Lambda connections onto a small DB connection pool.' },
      { q: 'What is max_connections in PostgreSQL?', a: 'Hard limit on simultaneous DB connections. Exceeding it causes FATAL: sorry, too many clients already. Default is often 100 on smaller RDS instance types.' },
      { q: 'How do you immediately free idle connections during a crisis?', a: 'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = \'idle\' AND query_start < now() - interval \'5 minutes\' -- terminates long-idle connections.' },
      { q: 'What idle timeout settings prevent connection pool buildup?', a: 'Set idleTimeoutMillis in the app pool config (e.g., 30000ms) and idle_session_timeout in PostgreSQL. Both must be configured to reclaim idle connections.' },
    ],
    references: [
      'https://wiki.postgresql.org/wiki/Number_Of_Database_Connections',
      'https://www.pgbouncer.org/config.html',
    ],
  },

  // ─── PERFORMANCE ───────────────────────────────────────────────────────────
  {
    id: 'ts-memory-leak-diagnosis',
    title: 'Memory Leak Diagnosis',
    icon: 'trendingUp',
    color: '#ef4444',
    questions: 7,
    description: 'Container OOMKill events, heap dumps, JVM tuning, Go pprof, Python tracemalloc, and RSS growth patterns.',
    visualizations: [],
    introduction: `## Overview
A memory leak causes a process's RSS (Resident Set Size) to grow continuously over time without a corresponding increase in load. Eventually the process exceeds its memory limit (container limit or OS free memory) and is killed by the OOM killer. In Kubernetes, this manifests as OOMKilled with exit code 137.

Memory leak patterns by type: heap leaks (objects allocated but never garbage collected — common in JS with retained event listeners, Java with collections that grow indefinitely), connection leaks (database/HTTP connections held open), file descriptor leaks (files opened but not closed), and native memory leaks (in JVM: metaspace, off-heap buffers; in Go: CGO allocations).

The diagnostic approach: first confirm it is a leak (not a one-time increase that stabilizes), then identify which memory region is growing, then find the specific allocation site.

Confirming a leak: plot RSS over time. A true leak shows a steady, non-plateauing upward slope. A high but stable RSS is not a leak — it is normal application memory use.

JVM heap analysis: enable -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/heapdump.hprof. Analyze with Eclipse Memory Analyzer (MAT) — look for the dominator tree showing the largest object trees, and the leak suspects report that identifies objects accumulating across multiple snapshots.

Go pprof: import _ "net/http/pprof" to expose /debug/pprof/ endpoint. go tool pprof http://service/debug/pprof/heap grabs a heap profile. Compare two profiles taken minutes apart to see which allocations are growing. allocs vs heap: allocs shows all-time allocations; heap shows live allocations.`,
    whenToUse: [
      'Diagnosing a container that is repeatedly OOMKilled with increasing memory over time',
      'Taking a heap dump from a JVM application at the moment of OOM',
      'Using Go pprof to find which goroutine or allocation is growing',
      'Distinguishing a true memory leak from a large but stable cache',
    ],
    keyConcepts: [
      { term: 'RSS growth over time', definition: 'Definitive sign of a memory leak. Plot container memory usage in Prometheus over 24+ hours. A true leak shows steady slope; a cache fills and stabilizes.' },
      { term: 'Heap dump (JVM)', definition: 'Snapshot of the JVM heap. Enable with -XX:+HeapDumpOnOutOfMemoryError. Analyze with Eclipse MAT. Look for dominator tree and leak suspects report.' },
      { term: 'Go pprof heap', definition: 'Go profiling endpoint: /debug/pprof/heap. Compare two snapshots: go tool pprof -base heap1.out heap2.out. Shows delta allocations — what grew between snapshots.' },
      { term: 'OOMKilled (exit code 137)', definition: 'Kubernetes terminates a container that exceeds its memory limit. kubectl describe pod shows "OOMKilled" in Last State. dmesg on the node shows the OOM kill event with memory stats.' },
      { term: 'finalization vs WeakReference (Java)', definition: 'Objects with finalizers (or held by strong references from caches/listeners) are not garbage collected even when seemingly unreachable. Common source of heap leaks in Java.' },
    ],
    pitfalls: [
      'Increasing container memory limits instead of finding the leak — this buys time but the leak will eventually exhaust any limit. Always investigate the root cause.',
      'Taking a heap dump of a production JVM during peak traffic — heap dumps freeze the JVM for seconds or minutes (STW GC). Schedule for low-traffic periods or capture on a non-production instance.',
      'Confusing RSS with heap — in JVM, RSS includes heap, metaspace, off-heap buffers, JIT code cache, thread stacks, and native libraries. Heap analysis alone will not find off-heap leaks (Netty direct buffers, Unsafe).',
    ],
    keyQuestions: [
      {
        question: 'A Node.js service\'s memory usage grows 50 MB per hour and restarts every 8 hours. How do you find the leak?',
        answer: `Step 1 — Confirm it is a leak, not a cache:
\`\`\`promql
container_memory_working_set_bytes{pod=~"myservice.*"}
\`\`\`
Plot this in Grafana over 24 hours. A true leak grows linearly without plateauing; a cache fills and stabilizes.

Step 2 — Add a heap snapshot endpoint to the service:
\`\`\`js
const v8 = require('v8');
app.get('/debug/heap', (req, res) => {
  const snapshot = v8.writeHeapSnapshot('/tmp/heap.heapsnapshot');
  res.json({ file: snapshot });
});
\`\`\`
Take snapshot1, wait 30 minutes under load, take snapshot2.

Step 3 — Compare snapshots in Chrome DevTools:
Open \`Chrome DevTools > Memory tab\` → load snapshot2 → switch view to "Comparison" → load snapshot1 as baseline → sort by "# Delta" to see objects that grew between snapshots.

Common findings:
- EventEmitter listener leak: listeners added inside a loop or on every request without removal. Check logs for "EventEmitter memory leak detected" warnings.
- Closure capturing outer scope: callbacks holding references to request objects or large arrays.
- Map/Set accumulating entries: a global cache \`Map\` that never evicts old entries.
- Timer without clearInterval: \`setInterval\` that captures a large object in its closure.

Step 4 — Fix and verify:
- \`emitter.removeListener()\` or \`emitter.off()\` when the listener is no longer needed
- \`WeakMap\`/\`WeakRef\` for caches where keys should be garbage-collected
- LRU cache with max size for global caches
- \`clearInterval\`/\`clearTimeout\` when a component unmounts

Deploy the fix and monitor the memory growth curve — it should flatten within the first hour.`,
      },
    ],
    quickFire: [
      { q: 'How do you confirm a memory leak vs a large stable cache?', a: 'Plot RSS over 24+ hours. A true leak shows a steady non-plateauing slope. A cache fills and stabilizes.' },
      { q: 'What does OOMKilled exit code 137 mean in Kubernetes?', a: 'The container exceeded its memory limit and was killed by SIGKILL. kubectl describe pod shows OOMKilled in Last State.' },
      { q: 'How do you take a heap dump from a JVM in production?', a: 'Add -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/heapdump.hprof at JVM startup. Or: jcmd <pid> GC.heap_dump /tmp/dump.hprof at runtime.' },
      { q: 'What Go tool diagnoses a heap memory leak?', a: 'go tool pprof http://service/debug/pprof/heap -- requires importing net/http/pprof. Compare two snapshots with -base flag to see which allocations grew.' },
      { q: 'Common cause of memory leak in Node.js?', a: 'Event listener accumulation -- adding listeners to emitters without a matching removeListener call. Each listener holds a closure reference keeping objects alive.' },
      { q: 'What is the difference between heap and RSS in JVM?', a: 'RSS includes heap plus metaspace, off-heap buffers, JIT code cache, thread stacks, and native libraries. Off-heap leaks (Netty direct buffers) do not appear in heap analysis.' },
      { q: 'What is tracemalloc in Python?', a: 'A stdlib module that tracks memory allocations: tracemalloc.start(), take snapshots, compare with snapshot.compare_to() to find which allocation sites are growing.' },
      { q: 'Wrong fix for a memory leak?', a: 'Increasing the container memory limit. This buys time but the leak eventually exhausts any limit. Always diagnose and fix the root allocation site.' },
    ],
    references: [
      'https://nodejs.org/en/docs/guides/diagnostics/memory/using-heap-profiler',
      'https://pkg.go.dev/net/http/pprof',
    ],
  },

  // ─── KUBERNETES ────────────────────────────────────────────────────────────
  {
    id: 'ts-pod-crashloopbackoff',
    title: 'CrashLoopBackOff',
    icon: 'gitBranch',
    color: '#f59e0b',
    questions: 7,
    description: 'Pod restart loop diagnosis, previous logs, init containers, liveness probes, resource limits, and config errors.',
    visualizations: [],
    introduction: `## Overview
CrashLoopBackOff is a Kubernetes status indicating that a container is crashing repeatedly and Kubernetes is applying exponential backoff before restarting it again. The backoff starts at 10 seconds and doubles (20s, 40s, 80s... up to 5 minutes). It is not an error in itself — it is the container's repeated crashing that is the error.

The container can crash for any reason: application error (panic, exception, non-zero exit code), OOM kill (container exceeded memory limit), liveness probe failure (probe configured with too aggressive thresholds), missing configuration (environment variable or config file not found), dependency not available (service it requires is not running), and permission errors (running as non-root but needing root for file access).

The primary diagnostic command: kubectl logs <pod> --previous. The --previous flag shows the logs from the last terminated container (before it crashed). This is where the crash reason usually appears — an exception stack trace, "file not found," or "connection refused to database." Without --previous, you see logs from the current (restarting) container which may show nothing yet.

kubectl describe pod also shows: the exit code (1 = general error, 137 = OOM killed = SIGKILL, 143 = SIGTERM, 2 = misuse of shell command), the restart count, events at the bottom (image pull failures, volume mount failures, OOM events).

Init containers run to completion before the main container starts. If an init container is crashing, the main container never starts. kubectl logs <pod> -c <init-container-name> shows init container logs.`,
    whenToUse: [
      'Diagnosing why a newly deployed pod is not coming up',
      'Distinguishing between an OOM kill (137), app crash (1), and liveness probe failure',
      'Debugging an init container that is blocking main container startup',
      'Finding the configuration error causing a pod to crash on startup',
    ],
    keyConcepts: [
      { term: 'kubectl logs --previous', definition: 'Shows logs from the last terminated container instance. Essential for CrashLoopBackOff — the current container may have just started and shows no logs yet.' },
      { term: 'Exit code 137', definition: 'Container received SIGKILL — either OOM killed (memory limit exceeded) or forcibly terminated. Check kubectl describe pod for "OOMKilled" in Last State.' },
      { term: 'Exit code 1', definition: 'General application error. Check --previous logs for the exception, panic, or error message that caused the crash.' },
      { term: 'Liveness probe', definition: 'Kubernetes periodically checks if the container is alive. If it fails consecutively (failureThreshold times), the container is restarted. Misconfigured probes (too short initialDelaySeconds) cause CrashLoopBackOff on slow-starting apps.' },
      { term: 'Init container', definition: 'Runs and must complete successfully before the main container starts. Used for setup tasks (schema migration, config generation). If init container crashes, the main container never starts.' },
    ],
    pitfalls: [
      'Looking at kubectl logs without --previous for a CrashLoopBackOff pod — the current container just started and has no logs yet. Always add --previous to see why it crashed.',
      'Setting initialDelaySeconds too short in liveness probes — if the app takes 60 seconds to start but the liveness probe starts checking after 10 seconds, the pod is killed before it has a chance to become ready, causing CrashLoopBackOff on healthy code.',
      'Not checking events in kubectl describe pod — events show image pull errors, volume mount failures, and OOM events that are not in the container logs.',
    ],
    keyQuestions: [
      {
        question: 'A pod is in CrashLoopBackOff. Walk through your complete diagnosis.',
        answer: `Step 1 — Get basic information:
\`\`\`bash
kubectl get pod <pod-name> -o wide   # Node, IP, age, restart count
kubectl describe pod <pod-name>       # Events, resource limits, probe config, exit codes
\`\`\`
In describe output, look for:
- Last State: "OOMKilled" → memory limit too low
- Exit Code: 137 → SIGKILL (OOM or forced), 1 → app error, 143 → SIGTERM
- Events section at the bottom → image pull errors, volume mount failures, node issues

Step 2 — Get the crash logs:
\`\`\`bash
kubectl logs <pod-name> --previous           # Logs from the crashed container
kubectl logs <pod-name> --previous --tail=100  # Last 100 lines
\`\`\`
Look for: exception stack traces, "cannot open config file", "connection refused", "permission denied", "out of memory".

Step 3 — If it is an init container:
\`\`\`bash
kubectl get pod <pod-name> -o jsonpath='{.status.initContainerStatuses}'
kubectl logs <pod-name> -c <init-container-name> --previous
\`\`\`

Step 4 — If exit code is 137 (OOM):
\`\`\`bash
kubectl top pod <pod-name>        # Current memory usage
kubectl describe pod <pod-name> | grep -i oom
\`\`\`
Check \`resources.limits.memory\` in the pod spec. Fix: increase memory limit or find the memory leak.

Step 5 — If liveness probe failure:
\`\`\`bash
kubectl describe pod <pod-name> | grep -A 10 "Liveness"
\`\`\`
Temporarily disable the liveness probe (edit the Deployment) to confirm it is causing restarts. Increase \`initialDelaySeconds\` to match actual startup time.

Step 6 — Run an interactive debug session:
\`\`\`bash
kubectl run debug --image=<same-image> --rm -it -- /bin/sh
\`\`\`
Start the application manually and observe the error. Useful when the crash happens before any logs are emitted.`,
      },
    ],
    quickFire: [
      { q: 'First command for a CrashLoopBackOff pod?', a: 'kubectl logs <pod> --previous -- shows logs from the crashed container. Without --previous you see the current (just-started) container which may have no logs yet.' },
      { q: 'What does exit code 137 mean in a Kubernetes pod?', a: 'OOMKilled -- container exceeded its memory limit. kubectl describe pod shows OOMKilled in Last State. Fix: increase memory limit or find the memory leak.' },
      { q: 'What does exit code 1 mean in a Kubernetes pod?', a: 'General application error. Check --previous logs for the exception stack trace, missing config file, or connection refused error that caused the crash.' },
      { q: 'How does a misconfigured liveness probe cause CrashLoopBackOff?', a: 'If initialDelaySeconds is too short, the probe checks before the app finishes starting, fails consecutively, and Kubernetes kills a healthy container in a loop.' },
      { q: 'How do you debug an init container that is blocking startup?', a: 'kubectl logs <pod> -c <init-container-name> --previous -- init container logs are separate from the main container logs.' },
      { q: 'What does kubectl describe pod show that logs do not?', a: 'Exit codes, restart counts, OOMKilled status, events (image pull errors, volume mount failures, OOM events), and probe configuration.' },
      { q: 'How do you run a debug shell in the same image that is crashing?', a: 'kubectl run debug --image=<same-image> --rm -it -- /bin/sh -- starts the app manually so you can observe the error before the container exits.' },
      { q: 'What is exit code 143 in a Kubernetes container?', a: 'The container received SIGTERM -- graceful termination signal. Usually from a deliberate pod deletion or rolling update, not a crash.' },
    ],
    references: [
      'https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/',
      'https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes',
    ],
  },

  {
    id: 'ts-pod-pending-scheduling',
    title: 'Pods Stuck Pending',
    icon: 'gitBranch',
    color: '#f59e0b',
    questions: 5,
    description: 'Scheduler events, insufficient resources, taints/tolerations, affinity rules, and PVC binding failures.',
    visualizations: [],
    introduction: `## Overview
A pod stuck in Pending state means the Kubernetes scheduler has not been able to find a node to place it on. The scheduler evaluates all nodes against the pod's requirements (resources, taints, affinity, topology constraints) and assigns the pod to the first node that satisfies all constraints. If no node qualifies, the pod remains Pending indefinitely.

kubectl describe pod is the primary diagnostic tool. The Events section at the bottom shows exactly why the scheduler could not place the pod: "0/5 nodes are available: 3 Insufficient cpu, 2 Insufficient memory" is the most common message. It tells you exactly how many nodes failed each constraint.

Resource exhaustion: if all nodes have insufficient CPU or memory to satisfy the pod's resource requests, the pod stays Pending. Note that requests (not limits) are what the scheduler uses for placement. A node can be at 30% actual CPU usage but 100% CPU request allocation — it will still reject new pods with CPU requests.

Taints and tolerations: if all nodes have a taint (e.g., node-role.kubernetes.io/control-plane:NoSchedule) and the pod does not have a matching toleration, no node is schedulable. Check taints on all nodes: kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints.

NodeAffinity and PodAffinity constraints can make pods unschedulable if no nodes match the required labels or if spreading constraints cannot be satisfied.

PVC in Pending: if a pod requires a PersistentVolumeClaim that is also in Pending state (not yet bound to a PV), the pod cannot start. PVCs remain Pending when no PV matches (wrong storage class, insufficient capacity, wrong access mode) or when dynamic provisioning fails.`,
    whenToUse: [
      'Diagnosing why a deployment scales up but new pods stay in Pending state',
      'Explaining why pods are Pending after adding taints to all nodes',
      'Debugging a pod that requires a specific node label that no current node has',
      'Diagnosing why a StatefulSet pod is Pending because its PVC is Pending',
    ],
    keyConcepts: [
      { term: 'Resource requests (scheduling)', definition: 'Scheduler uses requests (not limits) for bin-packing. A node can run pods that exceed its requests in practice, but scheduler will not place a pod on a node where requests exceed allocatable.' },
      { term: 'Taint/toleration', definition: 'Taints on nodes repel pods without matching tolerations. Common: node.kubernetes.io/not-ready, node-role.kubernetes.io/control-plane. Check with kubectl describe node | grep Taint.' },
      { term: 'PodDisruptionBudget (PDB)', definition: 'Minimum number of pods that must be available. If eviction would violate PDB, the scheduler will not evict the pod even during a drain. Can block node drain indefinitely.' },
      { term: 'TopologySpreadConstraints', definition: 'Spread pods across zones, nodes, or other topology keys. If constraints cannot be satisfied (too few nodes in a zone for the required maxSkew), pods are Pending.' },
      { term: 'Cluster Autoscaler', definition: 'Watches for Pending pods and adds nodes to satisfy requests. If CA is enabled but pods remain Pending for >5 minutes, check CA logs for why it is not scaling up.' },
    ],
    pitfalls: [
      'Setting resource requests too high (matching limits) — if requests == limits and limits are set conservatively, the effective scheduler allocation is much higher than actual usage. Nodes fill up on paper while running at low actual utilization.',
      'Not enabling Cluster Autoscaler when using managed node groups — without CA, the cluster does not scale up when nodes are full. Pods remain Pending until manually adding nodes.',
      'Using required NodeAffinity instead of preferred when a label does not need to be mandatory — required affinity makes the pod permanently unschedulable if no node has the label. Use preferredDuringSchedulingIgnoredDuringExecution for non-critical placement preferences.',
    ],
    keyQuestions: [
      {
        question: 'A pod is stuck in Pending and kubectl describe shows "0/3 nodes are available: 3 Insufficient memory." How do you resolve it?',
        answer: `This means all three nodes have less allocatable memory remaining than the pod's memory request.

Step 1 — Understand current allocation:
\`\`\`bash
kubectl describe nodes | grep -A 5 "Allocated resources"
# Look at "Memory Requests" row: 95-100% means the node is fully allocated on paper
\`\`\`

Step 2 — Identify what is consuming allocatable memory:
\`\`\`bash
kubectl top nodes                                                     # Actual memory usage
kubectl get pods -A --field-selector=spec.nodeName=<node> -o wide   # Pods on the full node
kubectl top pods -A                                                   # Actual pod memory usage
\`\`\`

Step 3 — Determine if requests are oversized:
\`\`\`bash
kubectl get pods -A -o custom-columns="NAME:.metadata.name,NS:.metadata.namespace,MEM_REQ:.spec.containers[*].resources.requests.memory"
\`\`\`
If memory request is 4Gi but actual use is 500Mi, requests are oversized — this is a common cause of phantom node fullness.

Options to resolve:

Option A — Reduce memory requests on existing pods:
Right-size requests (\`requests.memory: 256Mi\` instead of 1Gi). Update the Deployment and pods are replaced with lower-request pods.

Option B — Add nodes via Cluster Autoscaler:
\`\`\`bash
kubectl logs -n kube-system -l app=cluster-autoscaler
\`\`\`
If CA is not enabled: scale the node group manually in EKS/GKE console.

Option C — Reduce requests on the Pending pod:
Edit \`resources.requests.memory\` to a value the existing nodes can satisfy.

Option D — Use a node with more memory:
Add \`nodeSelector\` or \`nodeAffinity\` to schedule the pod on a larger instance type. Cluster Autoscaler will provision a larger instance if configured.

Root cause prevention: use VPA (Vertical Pod Autoscaler) in recommendation mode to right-size requests based on actual usage patterns.`,
      },
    ],
    quickFire: [
      { q: 'First command when a pod is stuck Pending?', a: 'kubectl describe pod <name> -- the Events section shows exactly why: "0/3 nodes available: 3 Insufficient memory" or taint mismatch.' },
      { q: 'Does the Kubernetes scheduler use requests or limits for placement?', a: 'Requests only. A node can be at 30% actual CPU but 100% CPU request allocation -- it still rejects new pods even though it has spare actual capacity.' },
      { q: 'What is a taint and toleration?', a: 'Taints on nodes repel pods that lack matching tolerations. Check node taints with: kubectl describe node | grep Taint. Add tolerations to the pod spec to allow scheduling.' },
      { q: 'Why is a pod Pending if its PVC is Pending?', a: 'A pod cannot start until all its PVCs are bound to PVs. PVCs stay Pending when no PV matches the storage class, access mode, or capacity request.' },
      { q: 'What is Cluster Autoscaler and what triggers it?', a: 'Watches for Pending pods and provisions new nodes to satisfy requests. If pods stay Pending for more than a few minutes, check CA logs for why it is not scaling.' },
      { q: 'How do you check how much of a node\'s resources are already allocated?', a: 'kubectl describe node | grep -A 5 "Allocated resources" -- shows CPU/memory requests as a percentage of allocatable capacity.' },
      { q: 'What is TopologySpreadConstraints?', a: 'Spreads pods across zones, nodes, or topology keys. If constraints cannot be satisfied (too few nodes in a zone for the required maxSkew), pods remain Pending.' },
      { q: 'What is the risk of setting resource requests equal to limits?', a: 'Nodes fill up on paper at lower actual utilization. Pods with high requests but low actual usage leave the cluster over-provisioned on paper and under-utilized in practice.' },
    ],
    references: [
      'https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/',
      'https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/',
    ],
  },

  {
    id: 'ts-hpa-not-scaling',
    title: 'HPA Not Scaling',
    icon: 'gitBranch',
    color: '#f59e0b',
    questions: 5,
    description: 'HPA metrics server, custom metrics, stabilization window, scale-down cooldown, and resource request prerequisites.',
    visualizations: [],
    introduction: `## Overview
The Horizontal Pod Autoscaler (HPA) scales a Deployment or StatefulSet based on observed metric values compared to target values. When HPA is configured but not scaling, the reason is usually one of: metrics server not installed or returning errors, no resource requests set (HPA uses requests to compute utilization percentages), metrics below the scale threshold, or the stabilization window delaying scaling.

HPA requires the Kubernetes Metrics Server to be installed and running for CPU/memory-based scaling. Custom metrics (HTTP requests per second, queue depth) require the Prometheus Adapter or KEDA. kubectl get hpa shows the current and target metrics — if the TARGETS column shows unknown/unknown, the metrics server is not returning data.

HPA computes the desired replica count: desiredReplicas = ceil(currentReplicas * (currentMetricValue / desiredMetricValue)). For CPU: currentMetricValue is the average CPU utilisation across all pods (as a percentage of requests). If pods have no CPU requests, HPA cannot compute utilisation — it needs a denominator.

Scale-up: HPA adds replicas when the metric exceeds the target. The default scale-up stabilization window is 0 seconds — it scales up immediately. ScaleUpStabilization can be set to prevent rapid oscillation.

Scale-down: HPA reduces replicas when metrics drop below target. The default scale-down stabilization window is 300 seconds (5 minutes). This means the metric must stay below the threshold for 5 minutes before HPA reduces replicas. This prevents rapid thrashing when load oscillates. Scale-down is also limited by minReplicas.`,
    whenToUse: [
      'Diagnosing why an HPA shows TARGETS as unknown/unknown',
      'Explaining why HPA is not scaling down even though CPU has been low for 10 minutes',
      'Setting up HPA for a stateless service with meaningful resource requests',
      'Configuring KEDA for queue-depth-based scaling instead of CPU',
    ],
    keyConcepts: [
      { term: 'Metrics Server', definition: 'Cluster-wide aggregator of resource usage data. Required for CPU/memory HPA. kubectl top commands also use it. Install with Helm or kubectl apply -f metrics-server.yaml.' },
      { term: 'Resource requests prerequisite', definition: 'HPA CPU/memory targets are percentages of the resource request. Without requests set, HPA cannot compute utilization and shows "unknown." Always set requests on pods using HPA.' },
      { term: 'Scale-down stabilization window', definition: 'Default 300 seconds. Metric must stay below threshold for this long before scale-down occurs. Prevents thrashing. Set in spec.behavior.scaleDown.stabilizationWindowSeconds.' },
      { term: 'KEDA', definition: 'Kubernetes Event-Driven Autoscaler. Scales based on external metrics: SQS queue depth, Kafka consumer lag, Redis list length. Can scale to zero (HPA cannot). More flexible than Prometheus Adapter.' },
      { term: 'HPA min/max replicas', definition: 'HPA will not scale below minReplicas or above maxReplicas regardless of metric values. Ensure maxReplicas is high enough to handle peak load and minReplicas provides baseline availability.' },
    ],
    pitfalls: [
      'Configuring HPA without setting resource requests on the pods — without requests, CPU utilization percentage cannot be computed. HPA shows "unknown" and takes no action.',
      'Expecting HPA to scale down immediately after load drops — the default 5-minute stabilization window means scale-down lags by 5 minutes. This is intentional to prevent thrashing but can be tuned down if needed.',
      'Setting HPA target CPU to 90% — at 90% target, pods are nearly saturated before new ones are added. By the time new pods are scheduled (30-60 seconds), existing pods may be overloaded. Use 50-70% for faster scale-up headroom.',
    ],
    keyQuestions: [
      {
        question: 'Your HPA is configured but the TARGETS column shows unknown/unknown. How do you fix it?',
        answer: `"unknown" means the HPA controller cannot retrieve the metric. The most common causes:

Cause 1 — Metrics Server not installed or not working:
\`\`\`bash
kubectl top nodes                                     # If this fails, Metrics Server is broken
kubectl get pods -n kube-system | grep metrics-server
kubectl logs -n kube-system deploy/metrics-server
\`\`\`
Common Metrics Server fixes:
\`\`\`bash
# Not installed:
helm install metrics-server metrics-server/metrics-server -n kube-system
# TLS error (dev clusters): add --kubelet-insecure-tls to Metrics Server args
# Network policy blocking: metrics-server needs to reach kubelet on port 10250
\`\`\`

Cause 2 — Resource requests not set on the target pods:
\`\`\`bash
kubectl describe hpa <hpa-name>   # Shows "missing request for containers"
kubectl get pods -o jsonpath='{.items[*].spec.containers[*].resources.requests}'
\`\`\`
Add requests to the pod spec:
\`\`\`yaml
resources:
  requests:
    cpu: "250m"
    memory: "128Mi"
\`\`\`

Cause 3 — Custom metrics not configured (for non-CPU/memory HPA):
\`\`\`bash
kubectl get apiservices | grep custom.metrics
kubectl describe apiservice v1beta1.custom.metrics.k8s.io
\`\`\`
Prometheus Adapter must be running and configured to expose the metric to the API server.

After fixing, verify:
\`\`\`bash
kubectl get hpa <name> -w        # Watch TARGETS update live
kubectl describe hpa <name>      # Full conditions including error messages
\`\`\`
The describe output shows \`FailedGetScale\` or \`AbleToScale\` conditions with detailed messages about why metrics are unavailable.`,
      },
    ],
    quickFire: [
      { q: 'What does TARGETS unknown/unknown mean in kubectl get hpa?', a: 'HPA cannot retrieve the metric. Usually Metrics Server is not installed, resource requests are not set on the pods, or a custom metrics adapter is missing.' },
      { q: 'Why must pods have resource requests for CPU-based HPA?', a: 'HPA computes CPU utilization as a percentage of the request. Without a request (the denominator), utilization cannot be calculated -- HPA shows unknown.' },
      { q: 'Why does HPA not scale down immediately when load drops?', a: 'Default scale-down stabilization window is 300 seconds (5 minutes). The metric must stay below threshold for the full window to prevent thrashing.' },
      { q: 'What is KEDA and when is it better than HPA?', a: 'Kubernetes Event-Driven Autoscaler. Scales on external metrics like SQS queue depth, Kafka lag, or Redis list length. Can scale to zero -- HPA cannot.' },
      { q: 'What is the Metrics Server?', a: 'Cluster-wide aggregator of resource usage data, required for kubectl top and CPU/memory HPA. Install with Helm. Without it, kubectl top nodes fails.' },
      { q: 'Why is setting HPA target at 90% CPU dangerous?', a: 'Pods are nearly saturated before new ones are added. By the time new pods are scheduled (30-60s), existing pods are overloaded. Use 50-70% for adequate scale-up headroom.' },
      { q: 'What command watches HPA metrics update in real time?', a: 'kubectl get hpa <name> -w -- shows current vs target metrics live as they update.' },
      { q: 'How do you scale based on a custom business metric with HPA?', a: 'Deploy the Prometheus Adapter to expose Prometheus metrics to the Kubernetes custom metrics API, then reference the metric name in the HPA spec.' },
    ],
    references: [
      'https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/',
      'https://keda.sh/docs/2.12/concepts/',
    ],
  },
  {
    id: 'ts-lambda-cold-starts',
    title: 'Lambda Cold Start Latency',
    icon: 'cloud',
    color: '#f97316',
    questions: 6,
    description: 'Diagnose and eliminate Lambda initialization latency that spikes p99 response times.',
    visualizations: [],
    introduction: `## Overview
Lambda cold starts happen when AWS must provision a new execution environment for your function. The process has three distinct phases: first, AWS downloads your deployment package or container image to the execution host; second, it starts the language runtime (JVM, Node.js process, Python interpreter); third, it runs your initialization code — everything outside the handler function. Only after all three phases complete does your handler receive the first event.

Cold start duration varies dramatically by runtime. Java and Kotlin functions are the worst offenders, often adding 1–10 seconds because the JVM itself takes time to start and class-load. Node.js and Python cold starts typically run 50–500 milliseconds — fast enough that users rarely notice. Go binaries start in under 100 milliseconds because the runtime is compiled into a single binary with no separate interpreter startup.

VPC attachment historically multiplied cold start times by 5–10 seconds because Lambda had to create an Elastic Network Interface in your VPC on every cold start. AWS fixed this with Hyperplane ENIs, which are pre-created and shared across functions. Modern Lambda in VPC has the same cold start profile as non-VPC functions, but you need to verify your function uses the newer Hyperplane model — functions created before 2020 may not.

To diagnose cold starts, open CloudWatch Logs Insights and query for INIT_DURATION in the REPORT line of your function logs. This field only appears on cold starts, so its presence identifies which invocations paid the initialization tax. AWS X-Ray shows initialization as a separate segment before the Invocation segment — the gap between them is your cold start. Lambda Insights, available as a managed Lambda layer, publishes cold_start metrics to CloudWatch with function name and version dimensions.

Fixes exist on a spectrum of cost and effectiveness. Reducing your package size shortens the download phase — remove dev dependencies, use Lambda layers for shared libraries, prefer tree-shaking bundlers like esbuild. Avoiding unnecessary VPC attachment eliminates network-interface setup. For Java specifically, AWS SnapStart captures a snapshot of the initialized JVM state after your init code runs, then restores from that snapshot on cold starts — reducing Java cold starts to under 1 second. Provisioned concurrency is the most reliable fix: you pay for pre-warmed execution environments that are always ready. Scheduled pings are unreliable because Lambda may still choose to start fresh environments.

The core trade-off is cost versus latency guarantee. Provisioned concurrency charges you for idle time, making sense for latency-sensitive production traffic but not for batch jobs or dev environments. SnapStart is free but only helps Java. Package optimization is always worth doing but rarely eliminates the problem entirely.`,
    whenToUse: [
      'Diagnosing p99 latency spikes that correlate with traffic lulls',
      'Explaining Lambda execution model and initialization phases in a system design interview',
      'Designing a Lambda-based service that must meet strict latency SLAs',
    ],
    keyConcepts: [
      { term: 'INIT_DURATION', definition: 'The time Lambda spent initializing the execution environment, printed in the REPORT log line only on cold starts. Includes download, runtime startup, and init code execution.' },
      { term: 'Provisioned Concurrency', definition: 'A Lambda configuration that keeps a specified number of execution environments pre-initialized and ready to respond instantly, eliminating cold starts for those environments at an ongoing hourly cost.' },
      { term: 'SnapStart', definition: 'A Java-specific Lambda feature that takes a snapshot of the initialized execution environment after init code completes, then restores from that snapshot on cold starts instead of re-running initialization.' },
      { term: 'Hyperplane ENI', definition: 'The shared elastic network interface model AWS introduced to fix VPC cold start latency. Hyperplane ENIs are pre-created and reused across function invocations, removing the per-cold-start ENI attachment delay.' },
      { term: 'Execution Environment Lifecycle', definition: 'Lambda environments go through Init, Invoke (one or more times), and Shutdown phases. A cold start only occurs during Init; subsequent invocations reuse the same environment and pay only Invoke time.' },
    ],
    pitfalls: [
      'Assuming VPC is always the cold start culprit — modern Lambda with Hyperplane ENIs has negligible VPC overhead; verify with INIT_DURATION logs before blaming VPC.',
      'Using keep-warm pings on a schedule and assuming they eliminate cold starts — Lambda may still provision new environments for burst traffic, meaning pings only help the pinged instance.',
      'Enabling provisioned concurrency on every function regardless of traffic pattern — low-traffic or bursty batch functions pay for idle warm environments that rarely get used.',
      'Counting total invocation duration as cold start duration — INIT_DURATION and Duration are reported separately; add them to get wall-clock time for a cold start invocation.',
      'Ignoring init code optimization — loading large SDK clients, establishing DB connections, and reading config files at module level all add to every cold start; lazy-loading defers this cost.',
    ],
    keyQuestions: [
      {
        question: 'A customer-facing Lambda API has p99 latency of 800ms during normal traffic but spikes to 8 seconds after a 5-minute quiet period. How do you diagnose and fix this?',
        answer: `The pattern — good latency during active traffic, spikes after a quiet period — is the textbook cold start signature. Lambda recycles execution environments after periods of inactivity, so the first request after a lull pays the full initialization cost.

Diagnosis starts in CloudWatch Logs Insights with a query like: filter @message like /INIT_DURATION/ | stats avg(@initDuration), max(@initDuration), count() by bin(5m). This shows whether INIT_DURATION spikes correlate exactly with the 8-second p99 events. Cross-reference with X-Ray traces to see the initialization segment duration. If you have Lambda Insights, the cold_start metric gives per-invocation visibility without log parsing.

Next, profile the initialization itself. Add timing logs around each major init step — SDK client creation, DB connection pool setup, config loading — to identify which phase dominates. If it is the runtime itself (Java/Kotlin), SnapStart is the right tool. If it is your init code, optimize it: lazy-initialize clients, reduce package size with esbuild, eliminate unused dependencies.

For the fix, provisioned concurrency is the most reliable solution. Set it to cover your expected burst traffic level — if you rarely exceed 50 concurrent requests, 50 provisioned concurrency instances guarantee zero cold starts for that load. Use Application Auto Scaling to schedule provisioned concurrency scaling during known traffic patterns (business hours vs. nights). The cost is roughly the same as keeping an EC2 instance running, so it is economically justified only for latency-sensitive production paths.

If budget is constrained, combining package size reduction with SnapStart (Java) or switching to a faster runtime (Node.js/Python) can bring cold starts under 200ms — a level many users do not notice.`,
      },
      {
        question: 'Why does enabling VPC for a Lambda function affect cold start times, and how do you determine if the Hyperplane fix applies to your function?',
        answer: `Before Hyperplane ENIs, Lambda had to create a new Elastic Network Interface and attach it to your VPC on each cold start. ENI creation required network control-plane operations that added 5–15 seconds to initialization — significantly worse than any runtime overhead.

AWS introduced Hyperplane ENIs as shared, pre-created network interfaces that are reused across function invocations and execution environments. Instead of creating a new ENI per cold start, Lambda borrows from a pool of pre-warmed ENIs maintained by Hyperplane. This reduces VPC cold start overhead to near zero.

To determine if your function benefits from Hyperplane, check the function's creation date — functions created after September 2020 use Hyperplane by default. For older functions, re-saving the VPC configuration (even without changes) migrates them to Hyperplane. You can verify by comparing INIT_DURATION values for VPC vs. non-VPC functions of the same runtime and package size — if VPC adds more than 500ms to INIT_DURATION, the function may not be on Hyperplane.

The practical test: query CloudWatch Logs Insights for INIT_DURATION before and after re-saving the VPC config. If cold start duration drops dramatically, the function was still using the old ENI model.`,
      },
    ],
    quickFire: [
      { q: 'Which Lambda runtime has the worst cold start times?', a: 'Java and Kotlin, due to JVM startup and class loading — typically 1–10 seconds.' },
      { q: 'What CloudWatch log field identifies a cold start invocation?', a: 'INIT_DURATION in the REPORT log line — it only appears on cold start invocations.' },
      { q: 'What is SnapStart and which runtime does it support?', a: 'A Lambda feature that snapshots the initialized JVM state and restores it on cold starts — Java only.' },
      { q: 'Does provisioned concurrency eliminate all cold starts?', a: 'Only for invocations within the provisioned count. Burst traffic beyond that count still causes cold starts.' },
      { q: 'Why should Lambda functions avoid VPC unless necessary?', a: 'Older functions without Hyperplane ENIs pay 5–15 seconds extra per cold start for ENI attachment.' },
      { q: 'What is the fastest way to reduce cold start duration for a Node.js Lambda?', a: 'Reduce deployment package size using esbuild to tree-shake and bundle only used code.' },
      { q: 'How do you measure cold start frequency in production?', a: 'CloudWatch Logs Insights query filtering for INIT_DURATION, or Lambda Insights cold_start metric.' },
    ],
  },
  {
    id: 'ts-ecs-task-failures',
    title: 'ECS Task Failures and Restarts',
    icon: 'cloud',
    color: '#f97316',
    questions: 6,
    description: 'Identify why ECS tasks stop unexpectedly and prevent restart loops from impacting availability.',
    visualizations: [],
    introduction: `## Overview
ECS task failures fall into several distinct categories, each with different diagnostic signals and fixes. The most important first step is always reading the stopped task reason in the ECS console or via the CLI — ECS preserves this reason for a period after the task stops, and it narrows the problem space immediately.

Image pull failures happen when ECS cannot retrieve the container image. Common causes: the ECR repository does not exist, the image tag does not exist, the task execution role lacks ecr:GetAuthorizationToken or ecr:BatchGetImage permissions, or the VPC has no route to ECR endpoints (either via NAT Gateway or VPC endpoints for ECR). The stopped reason will say CannotPullContainerError with the specific ECR error embedded.

OOMKilled means the container exceeded its memory limit and Linux sent SIGKILL. This shows up as exit code 137 in the stopped task details. The fix is either increasing the task memory limit or finding the memory leak. CloudWatch Container Insights tracks MemoryUtilized over time — if memory climbs steadily, you have a leak; if it spikes on specific requests, you have an unbounded operation (e.g., loading a large file into memory).

Health check failures are subtle. The task starts, the container runs, but ECS (or the load balancer) marks the task unhealthy and replaces it. If the health check is configured on the task definition, ECS kills the task after a configured number of failures. If it is on the load balancer target group, the ALB deregisters the target, new tasks replace it, and you get a restart loop if the underlying cause is not fixed. The startPeriod setting in the task definition health check is critical — slow-starting applications (Spring Boot, anything with heavy initialization) need a generous startPeriod (30–120 seconds) to avoid being killed before they are ready.

Essential container configuration controls restart behavior. If a sidecar — like a log router, service mesh proxy (Envoy), or secrets fetcher — is marked essential and exits, ECS stops the entire task including your application container. Conversely, if your application container is marked essential and the sidecar exits first, the same thing happens. Review which containers are marked essential and whether that reflects your actual intent.

Diagnosing requires correlating multiple sources: the ECS console stopped reason, CloudWatch Logs for the specific task, and sometimes CloudTrail for IAM permission failures. When a task restarts repeatedly (ECS sees this as cycling), you should check if the service has a Deployment Circuit Breaker configured — this stops ECS from endlessly replacing failing tasks and surfaces the problem rather than masking it behind restart loops.`,
    whenToUse: [
      'Diagnosing ECS services that show tasks constantly starting and stopping',
      'Explaining ECS health check semantics and essential container behavior in interviews',
      'Designing fault-tolerant ECS services that surface failures rather than hiding them in restart loops',
    ],
    keyConcepts: [
      { term: 'Stopped Task Reason', definition: 'A string ECS preserves after a task stops, describing why. Available in the ECS console under stopped tasks or via aws ecs describe-tasks CLI. Expires after several hours.' },
      { term: 'OOMKilled (Exit Code 137)', definition: 'The Linux kernel killed the container process because it exceeded the container memory limit. Exit code 137 = 128 + SIGKILL signal number (9).' },
      { term: 'startPeriod', definition: 'A health check parameter that gives a container grace time to start before health check failures count toward the unhealthy threshold. Essential for slow-starting applications.' },
      { term: 'Essential Container', definition: 'A container marked essential:true in the task definition. If any essential container exits for any reason, ECS stops the entire task including all other containers.' },
      { term: 'Deployment Circuit Breaker', definition: 'An ECS service setting that detects when a deployment is repeatedly failing and rolls back to the previous stable version automatically, preventing endless restart loops.' },
    ],
    pitfalls: [
      'Not checking the stopped task reason before diving into logs — ECS provides a plain-English explanation that immediately identifies the failure category.',
      'Setting health check startPeriod too low for applications with slow initialization, causing ECS to kill tasks that would have been healthy if given more time.',
      'Marking sidecar containers as essential when they are optional — an Envoy proxy crash should not kill the application container if the app can continue without it.',
      'Ignoring memory trends and only checking the current utilization — steady memory growth over hours is a leak that needs the time-series CloudWatch Container Insights view.',
      'Not enabling the Deployment Circuit Breaker — without it, a broken deployment causes endless task churn that consumes capacity and masks the root cause in logs.',
    ],
    keyQuestions: [
      {
        question: 'An ECS service is stuck in a restart loop. Tasks start, run for 30 seconds, then stop, and new tasks immediately replace them. How do you diagnose this systematically?',
        answer: `Start by reading the stopped task reason. In the ECS console, navigate to the cluster, select the service, click Tasks, then filter by Stopped status. The reason column gives the most actionable signal. Alternatively: aws ecs describe-tasks --cluster <cluster> --tasks <task-arn> and look at the stoppedReason and containers[].reason fields.

If the reason is CannotPullContainerError, the problem is image access. Check that the image tag exists in ECR, the task execution role has ecr:GetAuthorizationToken and ecr:BatchGetImage permissions, and the subnet has either NAT Gateway or ECR VPC endpoints for private subnets.

If the reason is Essential container exited or a container shows exitCode 137, you have two different problems. Exit 137 is OOM — check CloudWatch Container Insights MemoryUtilized, increase the task memory limit, and profile the application for leaks. Essential container exit requires identifying which container exited and why — the CloudWatch Logs for that specific container (via the log driver configured in the task definition) will show the last output before exit.

If the task appears healthy but stops after 30 seconds, look at health check configuration. The 30-second window suggests unhealthyThreshold * interval ≈ 30 seconds (e.g., 3 failures × 10s interval). If startPeriod is not set or is too short, a slow-starting app never passes its first health check.

Enable the Deployment Circuit Breaker if not already on — it stops the loop after a configured number of failed tasks and preserves the stopped task data longer for diagnosis.`,
      },
      {
        question: 'How does ECS health checking interact with ALB health checking, and how do misconfigured thresholds create phantom restart loops?',
        answer: `ECS and ALB have independent health check systems that both affect task lifecycle. The task definition health check (if configured) is evaluated by the ECS agent inside the container host. The ALB target group health check is evaluated by the load balancer making HTTP requests to the task. Both must pass for a task to be considered healthy.

The interaction creates phantom restart loops when the thresholds are misaligned. Suppose the ALB health check has interval 10s and unhealthyThreshold 2 — the ALB marks a target unhealthy after 20 seconds of failed checks and stops routing traffic to it. If ECS service minimum healthy percent is 100%, ECS starts a replacement task. But if the original task is still running (just deregistered from ALB), you now have two tasks consuming capacity, one receiving no traffic.

The more insidious case: an application that passes the ECS task definition health check (checking that the process is running) but fails the ALB HTTP health check (the endpoint returns 500). ECS sees the task as healthy, does not restart it, but ALB never routes traffic to it. The service appears to have running tasks but serves no requests.

To debug, check both health check results separately. In the ECS console, the task detail shows the task-level health status. In the EC2 console under Target Groups, the Targets tab shows ALB health check status per task IP and port. Comparing these reveals which check is failing.

Best practice: use the ALB health check as the source of truth, configure ECS service health check grace period to cover slow starts, and set startPeriod in the task definition health check to match.`,
      },
    ],
    quickFire: [
      { q: 'What exit code indicates OOMKilled in ECS?', a: '137 (128 + SIGKILL signal 9).' },
      { q: 'Where do you find the stopped task reason?', a: 'ECS console stopped tasks list, or aws ecs describe-tasks CLI — stoppedReason field.' },
      { q: 'What is the purpose of startPeriod in a task definition health check?', a: 'Grace period before health check failures count, allowing slow-starting containers time to initialize.' },
      { q: 'What happens when an essential container exits in a multi-container task?', a: 'ECS stops the entire task, including all other containers regardless of their health.' },
      { q: 'How do you stop an ECS service from endlessly restarting a broken deployment?', a: 'Enable the Deployment Circuit Breaker, which rolls back after a configured number of failed tasks.' },
      { q: 'What IAM permissions does the ECS task execution role need to pull from ECR?', a: 'ecr:GetAuthorizationToken, ecr:BatchCheckLayerAvailability, and ecr:BatchGetImage.' },
      { q: 'What ECS CloudWatch metric tracks memory usage per task?', a: 'Container Insights MemoryUtilized metric, with task and service dimensions.' },
    ],
  },
  {
    id: 'ts-s3-latency',
    title: 'S3 High Latency Spikes',
    icon: 'cloud',
    color: '#f97316',
    questions: 6,
    description: 'Diagnose S3 request latency spikes and design prefix strategies to avoid throughput limits.',
    visualizations: [],
    introduction: `## Overview
S3 latency spikes have several distinct root causes that require different fixes. Before optimizing, it is essential to distinguish between two latency components that S3 CloudWatch surfaces separately: FirstByteLatency (time from request receipt to first response byte — pure server-side processing time) and TotalRequestLatency (full round trip including network transfer). High FirstByteLatency points to S3-side issues; high TotalRequestLatency with normal FirstByteLatency points to network or object size issues.

S3 has published throughput limits per prefix: 3,500 PUT/COPY/POST/DELETE requests per second and 5,500 GET/HEAD requests per second, per prefix. A prefix is defined by the characters in the key name up to the first delimiter — so all objects under logs/2024/ share a prefix budget. When applications store all objects under a single prefix and exceed these limits, S3 returns 503 SlowDown errors. The fix is prefix sharding: distribute objects across multiple prefixes using a hash or timestamp component in the key name (e.g., {hash}/{date}/{filename} instead of {date}/{filename}).

LIST operations are a frequent source of unexpected latency. S3 ListObjectsV2 is O(N) — it scans all objects under a prefix in lexicographic order. Listing a prefix with 10 million objects to find the latest file can take seconds. Applications should never use LIST on hot paths. Alternatives: store a pointer object (e.g., latest/manifest.json) that is updated on upload, or use DynamoDB to index S3 object metadata.

For large object uploads, multipart upload is mandatory for objects over 100MB and strongly recommended above 25MB. Without multipart, a single network interruption fails the entire upload. With multipart, you upload in parallel chunks and only retry failed chunks. The AWS SDK handles this automatically when you use the TransferManager in Java or the equivalent high-level upload APIs in other SDKs.

S3 Transfer Acceleration routes uploads through the nearest AWS CloudFront edge location and then uses AWS private backbone to reach the destination bucket. This meaningfully reduces latency for uploads from distant geographic regions. S3 Express One Zone is a newer offering providing sub-millisecond consistent latency for high-throughput workloads in exchange for single-AZ durability — appropriate for caches or scratch storage, not primary data.

When debugging, always capture the x-amz-request-id header from S3 responses. This request ID allows AWS Support to trace the specific request in their internal systems if you open a support case about unexplained latency spikes.`,
    whenToUse: [
      'Diagnosing 503 SlowDown errors or latency spikes in S3-heavy applications',
      'Explaining S3 throughput limits and prefix sharding in system design interviews',
      'Designing high-throughput data pipelines that use S3 as a storage layer',
    ],
    keyConcepts: [
      { term: 'FirstByteLatency', definition: 'CloudWatch S3 metric measuring time from when S3 receives the request to when it sends the first byte of the response. Reflects server-side processing time, excluding network transfer.' },
      { term: 'Prefix Throughput Limit', definition: 'S3 limits request rates per prefix: 3,500 write and 5,500 read requests per second. Exceeding these returns 503 SlowDown errors and requires distributing objects across multiple prefixes.' },
      { term: 'Multipart Upload', definition: 'S3 mechanism to upload large objects as parallel chunks. Enables resumable uploads, parallel throughput, and is required for objects over 5GB; strongly recommended above 25MB.' },
      { term: 'S3 Transfer Acceleration', definition: 'Routes S3 uploads and downloads through CloudFront edge locations, then over AWS private backbone, reducing latency for geographically distant clients.' },
      { term: 'S3 Express One Zone', definition: 'A high-performance S3 storage class offering sub-millisecond consistent latency and higher throughput at the cost of single-AZ durability. Suited for caches, ML training data, and scratch storage.' },
    ],
    pitfalls: [
      'Using S3 LIST on hot paths — ListObjectsV2 is O(N) and will become slow as the prefix grows; use a metadata index or pointer object instead.',
      'Storing all objects under a single prefix and wondering why you hit 503 SlowDown at high request rates — prefix sharding is required at scale.',
      'Treating TotalRequestLatency and FirstByteLatency as the same metric — high total with normal first-byte latency points to large object transfer time or network issues, not S3 processing.',
      'Not using multipart upload for large objects — a single TCP interruption fails a 5GB single-part upload, while multipart only retries the affected chunk.',
      'Routing S3 traffic through NAT Gateway for private subnet resources — S3 Gateway VPC endpoints are free and bypass NAT Gateway costs and bandwidth limits entirely.',
    ],
    keyQuestions: [
      {
        question: 'Your S3-based log storage pipeline starts returning 503 SlowDown errors when log volume triples. The key structure is logs/YYYY-MM-DD/server-id/filename. How do you fix this without changing the data model significantly?',
        answer: `The issue is prefix contention. All objects under logs/2024-06-24/ share a single prefix budget of 3,500 writes per second. When log volume triples, you exceed that budget.

The minimal fix is adding a hash shard prefix before the date: logs/{hash(server-id) % 16}/YYYY-MM-DD/server-id/filename. This distributes writes across 16 prefixes, giving 16 × 3,500 = 56,000 writes per second. The hash of server-id keeps the same server's logs in the same shard prefix, which simplifies per-server queries while distributing load evenly.

For reads, if you need to aggregate across all servers for a given date, you must query all 16 shard prefixes and merge results. If that is too complex, an alternative is a random 2-character hex prefix: {random hex}/{YYYY-MM-DD}/server-id/filename. This distributes writes randomly across 256 prefixes (16 × 16) but means listing by date requires querying all prefixes — acceptable if date-range reads are infrequent.

The key diagnostic step before deciding: enable S3 Server Access Logging and query for 503 status codes grouped by key prefix. This confirms which prefix is throttled and whether the pattern is write-heavy or read-heavy, since they have different limits.

Long term, consider whether S3 is the right primary index for this query pattern. A DynamoDB table with server-id + timestamp as partition+sort key, storing S3 object paths as attributes, gives O(1) lookups by server and date range without prefix sharding complexity.`,
      },
    ],
    quickFire: [
      { q: 'What HTTP status code does S3 return when you exceed prefix throughput limits?', a: '503 Slow Down.' },
      { q: 'What are the S3 throughput limits per prefix?', a: '3,500 PUT/COPY/POST/DELETE per second and 5,500 GET/HEAD per second.' },
      { q: 'What is the minimum object size where multipart upload is required?', a: 'Required above 5GB; strongly recommended above 25MB for reliability.' },
      { q: 'How do you eliminate S3 traffic costs through NAT Gateway for private subnets?', a: 'Create an S3 Gateway VPC Endpoint — free and routes S3 traffic over private AWS network.' },
      { q: 'What does high TotalRequestLatency with normal FirstByteLatency indicate?', a: 'Network transfer time is the bottleneck — large object size or client-side network issues, not S3 processing.' },
      { q: 'What identifier should you capture from every S3 response for AWS support escalation?', a: 'x-amz-request-id response header.' },
      { q: 'Why should you avoid S3 LIST on hot read paths?', a: 'ListObjectsV2 is O(N) — it scans all objects under the prefix in order, taking seconds for large prefixes.' },
    ],
  },
  {
    id: 'ts-iam-permission-denied',
    title: 'IAM Permission Denied Errors',
    icon: 'cloud',
    color: '#f97316',
    questions: 6,
    description: 'Trace IAM AccessDenied errors through policy layers to find the blocking rule.',
    visualizations: [],
    introduction: `## Overview
IAM AccessDenied errors are frustrating because the same error message can have five completely different root causes. AWS returns a generic AccessDenied response regardless of whether the denial came from an explicit Deny statement, a missing Allow, a Service Control Policy at the organization level, a permissions boundary, or a session policy restriction. Understanding the evaluation order is the foundation of effective diagnosis.

AWS evaluates IAM policies in a fixed order. First, it checks for an explicit Deny anywhere in the policy chain — in the identity policy, resource policy, SCP, or permissions boundary. An explicit Deny always wins, overriding any Allow. Second, it checks for an Allow in the relevant policies. If there is no explicit Deny and there is an Allow, the request proceeds. If there is no Allow, the request is implicitly denied. This means there are two types of denials: explicit (a Deny statement exists) and implicit (no Allow statement exists).

Service Control Policies (SCPs) operate at the AWS Organizations level and are the most common source of mysterious permission denials. An SCP restricts what actions are possible in an account, regardless of what IAM policies in that account allow. An administrator in an account cannot do something if the SCP blocks it. SCPs are often applied by a central platform team, meaning application developers may not have visibility into them. To check: aws organizations list-policies-for-target with the account ID, then inspect each SCP for Deny blocks or missing Allow blocks for your action.

Permissions boundaries define the maximum permissions an IAM role or user can have, even if the attached identity policies grant more. This is commonly used in developer self-service environments where developers can create IAM roles but those roles are bounded so developers cannot grant themselves more permissions than they have. The boundary is an IAM policy attached to the principal as a boundary, and the effective permissions are the intersection of the identity policy and the boundary.

The diagnostic workflow starts with CloudTrail. Every IAM-evaluated API call (successful or not) is logged in CloudTrail with the errorCode (AccessDenied) and errorMessage. The errorMessage often includes the specific policy that caused the denial. Searching CloudTrail by eventName, userIdentity.arn, and errorCode gives you the exact context. From there, the IAM Policy Simulator lets you test specific actions against the principal's policies without making real API calls.`,
    whenToUse: [
      'Diagnosing AccessDenied errors in production where the IAM policy looks correct at first glance',
      'Explaining IAM policy evaluation order and the difference between explicit and implicit denials in interviews',
      'Designing IAM architectures with permissions boundaries and SCPs for multi-team AWS environments',
    ],
    keyConcepts: [
      { term: 'Explicit Deny', definition: 'A Deny statement in any policy in the evaluation chain. Explicit denies override all Allow statements — they are the highest-priority rule in IAM evaluation.' },
      { term: 'Implicit Deny', definition: 'The result of no Allow statement existing for the requested action and resource. IAM defaults to deny when no policy explicitly allows an action.' },
      { term: 'Service Control Policy (SCP)', definition: 'An AWS Organizations policy applied at the organization root, organizational unit, or account level. SCPs set the maximum permissions for all principals in an account, overriding even administrator policies.' },
      { term: 'Permissions Boundary', definition: 'An IAM policy attached to a role or user that defines the maximum permissions that identity can have. Effective permissions are the intersection of the identity policy and the boundary — neither can exceed the other.' },
      { term: 'IAM Policy Simulator', definition: 'An AWS tool at policysim.aws.amazon.com that evaluates IAM policies for a specific principal, action, and resource without making real API calls — essential for debugging permission denials.' },
    ],
    pitfalls: [
      'Assuming AccessDenied means a missing Allow — explicit Deny in an SCP or resource policy overrides all Allows and is often the actual cause in multi-account environments.',
      'Checking only the role policy and forgetting the permissions boundary — effective permissions are the intersection, so a full Allow in the role policy is blocked if the boundary does not also allow it.',
      'Not checking SCPs when troubleshooting across accounts — SCPs are invisible from inside the account and require Organizations API access to read.',
      'Using the root user to bypass IAM and "just make it work" — root is not subject to SCPs, which means root tests can falsely confirm that an action should work when SCPs block it for other principals.',
      'Confusing resource-based policies and identity-based policies — S3 bucket policies, KMS key policies, and SQS queue policies are resource-based and evaluated alongside identity policies; a restrictive bucket policy can deny even if the role policy allows.',
    ],
    keyQuestions: [
      {
        question: 'A developer says their IAM role has AdministratorAccess but still gets AccessDenied when trying to create an IAM role in a new AWS account. What are the possible causes and how do you diagnose?',
        answer: `AdministratorAccess is the AWS managed policy granting all actions on all resources — but it is not absolute. Three mechanisms can still block it.

First, check for a Service Control Policy at the organization level. The new account is presumably under an AWS Organization. SCPs can block iam:CreateRole for all principals in the account, including admins. Run aws organizations list-policies-for-target --target-id <account-id> --filter SERVICE_CONTROL_POLICY, then inspect each policy. Look for Deny blocks on iam:* or iam:CreateRole, or an Allow-list SCP that does not include IAM actions.

Second, check if the developer's role itself has a permissions boundary. If the platform team set up the account with a developer role that has a boundary policy, the boundary defines the ceiling. Even if AdministratorAccess is attached, the effective permissions are limited to what the boundary allows. Check aws iam get-role --role-name <developer-role> and look for PermissionsBoundary.

Third, check CloudTrail. The event for the failed CreateRole call will have an errorMessage field. AWS sometimes includes which policy caused the denial in this message — it might say "due to a service control policy" or reference a specific policy ARN. The CloudTrail event also shows the exact principal ARN, confirming you are looking at the right role.

The IAM Policy Simulator cannot evaluate SCPs — it only evaluates identity and resource-based policies. So SCP diagnosis requires direct inspection of the organization policies, not the simulator.`,
      },
    ],
    quickFire: [
      { q: 'What always wins in IAM evaluation — explicit Deny or explicit Allow?', a: 'Explicit Deny — it overrides all Allow statements regardless of where the Allow appears.' },
      { q: 'Can a Service Control Policy block an AWS account root user?', a: 'No — the root user is not subject to SCPs; only IAM users and roles are affected.' },
      { q: 'How do you check which SCPs apply to an AWS account?', a: 'aws organizations list-policies-for-target --target-id <account-id> --filter SERVICE_CONTROL_POLICY' },
      { q: 'What are effective permissions when a role has AdministratorAccess and a permissions boundary that only allows S3?', a: 'Only S3 actions — effective permissions are the intersection of identity policy and boundary.' },
      { q: 'What CloudTrail field identifies IAM permission denials?', a: 'errorCode: AccessDenied — filter CloudTrail events by this field.' },
      { q: 'What tool lets you test IAM policies without making real API calls?', a: 'IAM Policy Simulator at policysim.aws.amazon.com.' },
      { q: 'What is an implicit deny in IAM?', a: 'The default-deny result when no policy explicitly allows an action — no Deny statement needed, just no Allow.' },
    ],
  },
  {
    id: 'ts-multi-region-latency',
    title: 'Multi-Region High Latency',
    icon: 'globe',
    color: '#3b82f6',
    questions: 6,
    description: 'Optimize cross-region latency using AWS backbone routing and data gravity principles.',
    visualizations: [],
    introduction: `## Overview
Multi-region latency has a hard floor set by physics — the speed of light in fiber is approximately 200,000 km/s, meaning a round trip between us-east-1 (Virginia) and ap-southeast-1 (Singapore) has a theoretical minimum of roughly 170ms. Measured RTT is typically 230ms or higher due to routing hops on the public internet. No amount of optimization can beat this ceiling; the question is whether you are close to it or far from it.

Understanding baseline expectations is the first diagnostic step. us-east-1 to us-west-2 is approximately 70ms RTT. us-east-1 to eu-west-1 (Ireland) is approximately 85ms. us-east-1 to ap-southeast-1 is approximately 230ms. us-east-1 to ap-northeast-1 (Tokyo) is approximately 175ms. If your measured latency significantly exceeds these baselines, there is an optimization opportunity. If it matches, the only fix is to move compute or data closer to the user.

AWS Global Accelerator addresses the public internet routing problem. When a client connects to a Global Accelerator endpoint, the connection terminates at the nearest AWS edge location (CloudFront Point of Presence), and traffic then traverses AWS's private backbone network to the origin region. This eliminates unpredictable public internet routing, which often adds 30–60% latency above the theoretical minimum. Global Accelerator also provides anycast IP addresses that remain stable, simplifying DNS and failover. For dynamic content that cannot be cached (API calls, streaming data), Global Accelerator typically provides more benefit than CloudFront.

Amazon Route 53 latency-based routing is different from geolocation routing. Geolocation routing sends traffic based on where the client's IP is physically located — always routing French IPs to eu-west-3. Latency-based routing uses continuously measured RTT data from AWS edge locations to route to the region that will respond fastest — a French user might be routed to us-east-1 if eu-west-3 is experiencing elevated latency. For most use cases, latency-based routing produces better outcomes.

Data gravity is the concept that data is expensive to move — both in latency and cost. Cross-region data transfer in AWS costs $0.02–0.09 per GB and adds round-trip network latency for every query. Applications that send data to a region for processing and return results pay both costs on every request. Architecting to keep processing close to data — or replicating data to the region where processing happens — is more effective than optimizing the network path.`,
    whenToUse: [
      'Diagnosing why a globally-distributed application has unexpectedly high latency between regions',
      'Explaining the trade-offs between Global Accelerator and CloudFront in system design interviews',
      'Designing multi-region architectures that minimize cross-region data transfer',
    ],
    keyConcepts: [
      { term: 'AWS Global Accelerator', definition: 'A networking service that routes client connections to the nearest AWS edge location, then forwards traffic over AWS private backbone. Reduces latency and provides static anycast IPs for stable endpoints.' },
      { term: 'Latency-Based Routing', definition: 'Route 53 routing policy that uses measured RTT data to send each request to the AWS region that will respond fastest, not necessarily the geographically closest one.' },
      { term: 'Data Gravity', definition: 'The principle that large data sets are expensive to move due to transfer costs and latency. Processing should be colocated with data rather than transferring data to processing.' },
      { term: 'Anycast', definition: 'A network routing method where multiple servers share the same IP address and routing infrastructure delivers packets to the topologically nearest one — the mechanism behind Global Accelerator endpoint IPs.' },
      { term: 'Speed of Light Constraint', definition: 'The theoretical minimum latency imposed by physics. Light in fiber travels ~200,000 km/s, setting a floor that no architectural change can beat — moving compute or data closer is the only solution.' },
    ],
    pitfalls: [
      'Trying to optimize cross-region latency without knowing the theoretical minimum — if your measured latency matches the physics baseline, no software change will help.',
      'Using geolocation routing when latency-based routing is available — geolocation routes to geographic proximity, not actual network speed, and can route users to slower regions.',
      'Sending data cross-region for every request in a chatty API design — cross-region transfer costs and latency both accumulate; batch operations or data replication are almost always better.',
      'Choosing CloudFront over Global Accelerator for dynamic, non-cacheable API traffic — CloudFront adds caching infrastructure overhead for traffic that cannot be cached, while Global Accelerator is optimized for dynamic routing.',
      'Not accounting for cross-region data transfer costs when designing multi-region architectures — these charges are often the largest unexpected cost in global deployments.',
    ],
    keyQuestions: [
      {
        question: 'Your API is deployed in us-east-1 and serves users in Southeast Asia who report 600ms average response times. The application processing itself takes under 50ms. What options do you have, and what are the trade-offs?',
        answer: `The physics: us-east-1 to Southeast Asia is roughly 230ms RTT. A request from Singapore to us-east-1 and back means the minimum network time for a round trip is 230ms × 2 = 460ms for request + response propagation alone. At 600ms total with 50ms processing, you are already within 90ms of the theoretical minimum over public internet. There is limited optimization headroom on the existing path.

Option 1: Deploy the application in ap-southeast-1 (Singapore). This is the most effective solution — co-locating compute with users eliminates the cross-region network cost. The complexity is managing two deployments, keeping data synchronized (database replication or region-specific data), and handling failover. For stateless APIs with a read replica in Singapore, this is straightforward. For write-heavy workloads with a single authoritative database, you still pay round-trip latency to us-east-1 for writes.

Option 2: AWS Global Accelerator. This routes Singapore clients through the nearest edge location and then over AWS private backbone instead of public internet. The private backbone is more direct and lower-latency than public internet routing, typically saving 20–50ms for this distance. Total latency might drop from 600ms to 520ms — meaningful but not dramatic.

Option 3: Read replica with write forwarding. For data-heavy read APIs, a read replica in ap-southeast-1 serves reads locally (under 10ms network latency) while writes still go to us-east-1. This works well for content-serving APIs where reads vastly outnumber writes.

The trade-off framing for interviews: Option 1 is the most effective but has the highest operational complexity. Option 2 requires no application changes but provides modest improvement. Option 3 requires database awareness in the application tier. Most production systems use a combination.`,
      },
    ],
    quickFire: [
      { q: 'What is the approximate RTT between us-east-1 and ap-southeast-1?', a: 'Approximately 230ms over public internet.' },
      { q: 'What does AWS Global Accelerator do differently from CloudFront?', a: 'Routes dynamic traffic over AWS private backbone from the nearest edge; CloudFront caches static content at edge — Global Accelerator does not cache.' },
      { q: 'What Route 53 routing policy uses measured network latency to make routing decisions?', a: 'Latency-based routing.' },
      { q: 'What is data gravity?', a: 'The principle that large data sets are expensive to move — keep processing co-located with data rather than transferring data cross-region.' },
      { q: 'What is the theoretical speed limit for network latency?', a: 'Speed of light in fiber, approximately 200,000 km/s — sets a floor that cannot be optimized away.' },
      { q: 'How much does cross-region data transfer typically cost in AWS?', a: 'Approximately $0.02–0.09 per GB depending on regions.' },
      { q: 'When should you prefer Global Accelerator over CloudFront for latency?', a: 'For dynamic, non-cacheable traffic like API calls — CloudFront is optimized for cacheable content.' },
    ],
  },
  {
    id: 'ts-certificate-expiry',
    title: 'TLS Certificate Expiry Incidents',
    icon: 'globe',
    color: '#3b82f6',
    questions: 6,
    description: 'Detect expiring certificates before they cause outages and automate renewal pipelines.',
    visualizations: [],
    introduction: `## Overview
TLS certificate expiry is one of the most preventable causes of production outages, yet it regularly brings down major services. The incident pattern is consistent: certificates are issued, initial monitoring is set up (or not), time passes, and eventually the certificate expires while attention has drifted to other things. Clients begin receiving SSL handshake errors, health checks fail, and what looked like a simple operational task becomes an urgent incident.

What happens on expiry depends on the client. Web browsers show ERR_CERT_DATE_INVALID or a security warning page and block users by default. HTTP clients in code — curl, requests, the AWS SDK — throw certificate validation exceptions and fail. API gateways and load balancers that are configured to verify upstream certificates drop backend connections. Health checks over HTTPS fail, triggering automatic recovery mechanisms that do nothing because the certificate problem affects all instances equally.

AWS Certificate Manager (ACM) handles automatic renewal for certificates it manages and that are used with supported services (ALB, CloudFront, API Gateway, Elastic Beanstalk). ACM certificates renew automatically 60 days before expiry. The renewal is silent and requires no intervention. Certificate expiry incidents in ACM-managed environments happen almost exclusively with imported certificates — certificates obtained outside ACM and imported for use with ACM-compatible services. These do not auto-renew.

Detection requires monitoring the DaysToExpiry CloudWatch metric that ACM publishes for all managed and imported certificates. Set an alarm at 45 days for warning and 14 days for critical. AWS Config rule acm-certificate-expiration-check performs a similar check at a configurable threshold. For non-ACM certificates (on EC2 instances, on-premises, or in containers), you need external monitoring — a cron job using openssl s_client to check certificate expiry against each hostname, or a third-party monitoring service.

For systems still using Let's Encrypt or other ACME protocol certificates, the 90-day certificate lifetime is intentional to enforce automation. Certbot automates renewal with a cron job or systemd timer. The common failure mode is that the cron job was set up initially and ran for months, then the server was replaced or rebooted and the cron job did not survive the migration. Verifying the cron is still active is a common runbook item for expiry incidents.

Emergency response when a certificate has already expired: for ACM, import a new certificate immediately (this takes under a minute) and associate it with the ALB or CloudFront distribution. For non-ACM, issue a new certificate from Let's Encrypt with certbot certonly, update the service configuration, and reload the service. The full recovery including issue detection typically takes 15–30 minutes.`,
    whenToUse: [
      'Building a certificate lifecycle monitoring system for a fleet of services',
      'Explaining TLS certificate management and ACM auto-renewal in infrastructure design interviews',
      'Diagnosing SSL handshake errors that users or health checks are reporting',
    ],
    keyConcepts: [
      { term: 'ACM Managed Certificate', definition: 'A TLS certificate issued and managed by AWS Certificate Manager. Auto-renews 60 days before expiry when used with ALB, CloudFront, or API Gateway. Does not auto-renew for imported certificates.' },
      { term: 'DaysToExpiry', definition: 'CloudWatch metric published by ACM for each certificate, showing days remaining until expiry. Use it to create alarms at 45-day warning and 14-day critical thresholds.' },
      { term: 'Certificate Import', definition: 'Uploading a certificate issued outside ACM into ACM for use with ACM-compatible services. Imported certificates do not auto-renew and must be manually replaced before expiry.' },
      { term: 'ACME Protocol', definition: 'The protocol used by Let\'s Encrypt and other CAs to automate certificate issuance and renewal. Certbot is the standard ACME client that handles DNS or HTTP challenges to prove domain ownership.' },
      { term: 'Certificate Pinning', definition: 'A practice where clients hard-code the expected certificate or public key. When certificates are rotated, pinned clients break until updated — makes emergency certificate replacement harder.' },
    ],
    pitfalls: [
      'Assuming ACM auto-renews all certificates — ACM only auto-renews certificates it issued; imported certificates must be manually renewed and replaced before expiry.',
      'Setting monitoring only on the primary domain certificate and missing subdomains or internal service certificates that share different expiry dates.',
      'Not testing the renewal process before the first expiry — certbot renew --dry-run should be part of initial setup verification, not something discovered to be broken during an incident.',
      'Replacing a certificate in ACM but forgetting to update the association — importing a new cert does not automatically update ALB listeners or CloudFront distributions pointing to the old cert.',
      'Rotating certificates during peak traffic — even zero-downtime certificate rotations deserve off-peak scheduling in case something goes wrong.',
    ],
    keyQuestions: [
      {
        question: 'Users are reporting SSL errors on your production site. The ALB and CloudFront use ACM certificates. How do you quickly diagnose whether this is a certificate expiry and what do you do?',
        answer: `First, confirm the symptom. Use curl -v https://yourdomain.com and look for SSL routines:ssl3_read_bytes:sslv3 alert certificate expired or similar in the output. Alternatively, openssl s_client -connect yourdomain.com:443 </dev/null shows the Not After field in the certificate details, showing whether expiry is the cause.

In the AWS console, open ACM and look at all certificates. Sort by expiry date. Expired certificates are visible immediately. The DaysToExpiry metric in CloudWatch would show this as 0 or negative — if you have alarms, check why they did not fire (alarm in insufficient data state, wrong threshold, email not received).

If the certificate is an ACM-managed certificate (not imported) and it is expired, this is unusual — ACM should have auto-renewed it. Check whether the certificate is associated with the ALB listener or CloudFront distribution. ACM only auto-renews if it can validate domain ownership, which requires either DNS validation (CNAME in Route 53) or email validation. If DNS validation was set up but the Route 53 CNAME was deleted, renewal fails silently and the cert expires.

Resolution: if using DNS validation, add the CNAME back and ACM will attempt renewal. For immediate relief, issue a new certificate and associate it with the ALB. In the ACM console, click Request Certificate → public certificate → DNS validation → add to Route 53 (one click if the domain is in Route 53). Once issued (typically 2–5 minutes), go to the ALB listener → edit listener → change the certificate. This takes under 60 seconds to take effect.

Post-incident: enable ACM DaysToExpiry CloudWatch alarms for all certificates at 45 and 14 days. Add the AWS Config rule acm-certificate-expiration-check. Add a runbook item to verify DNS validation CNAMEs are present whenever Route 53 changes are made.`,
      },
    ],
    quickFire: [
      { q: 'How many days before expiry does ACM auto-renew managed certificates?', a: '60 days before expiry.' },
      { q: 'Do ACM imported certificates auto-renew?', a: 'No — imported certificates must be manually replaced before expiry.' },
      { q: 'What CloudWatch metric shows days until a certificate expires?', a: 'DaysToExpiry, published by ACM for each certificate.' },
      { q: 'What AWS Config rule checks for expiring certificates?', a: 'acm-certificate-expiration-check, configurable expiry threshold.' },
      { q: 'Why do Let\'s Encrypt certificates expire after 90 days?', a: 'By design, to enforce automated renewal — short lifetimes mean manual processes will always fail eventually.' },
      { q: 'What is the fastest way to replace an expired cert on an ALB?', a: 'Import a new certificate into ACM, then update the ALB listener to use the new certificate — takes under 60 seconds.' },
      { q: 'What can cause ACM DNS validation renewal to silently fail?', a: 'The Route 53 CNAME record for DNS validation was deleted — ACM cannot prove domain ownership and renewal fails.' },
    ],
  },
  {
    id: 'ts-packet-loss',
    title: 'Packet Loss and Network Degradation',
    icon: 'globe',
    color: '#3b82f6',
    questions: 6,
    description: 'Distinguish packet loss from latency using retransmission metrics and MTU diagnostics.',
    visualizations: [],
    introduction: `## Overview
Packet loss is particularly deceptive because TCP's reliability guarantees mean applications often do not see errors — they just see degraded throughput and increased latency as TCP retransmits lost packets and backs off its congestion window. A 1% packet loss rate can reduce TCP throughput by up to 50% on high-bandwidth connections due to retransmission timeouts and window reduction. Applications appear to work but are slow, with no obvious error to trace.

The first diagnostic challenge is distinguishing packet loss from high latency. Both cause slow transfers, but they have different signals. Packet loss causes bursty retransmissions — you see normal throughput interrupted by pauses while TCP times out and retransmits. High latency causes uniformly slow transfers. The netstat -s command on Linux shows TcpExt:TCPRetransFail and TcpExt:TCPTimeouts counters — increasing values indicate retransmissions. You can also watch ss -tin to see retransmission counters per connection in real time.

MTU mismatch is a common and hard-to-diagnose cause of packet loss. EC2 instances within a VPC support 9001-byte jumbo frames. External connections (internet, VPN, Direct Connect) typically use standard 1500-byte MTU. Path MTU Discovery (PMTUD) is supposed to automatically negotiate the correct MTU along a path by using the ICMP "fragmentation needed" message, but many firewalls and security groups block ICMP, causing PMTUD to fail silently. The result: packets above 1500 bytes are dropped on the external segment, while packets below 1500 bytes (small requests, short responses) work fine. This manifests as applications that work for small payloads but fail or hang for large ones.

Security group and NACL misconfiguration is the most common cause of asymmetric packet loss in AWS. Security groups are stateful — the return traffic is automatically permitted for an allowed inbound connection. NACLs are stateless — you must explicitly allow both inbound and outbound traffic. A NACL that allows inbound port 443 but does not allow outbound ephemeral ports (1024–65535) drops all return traffic for HTTPS connections. This is invisible in the security group view but kills connections.

For enhanced networking on EC2, the Elastic Network Adapter (ENA) driver supports up to 100 Gbps but must be enabled on the instance type and present as a driver. Use ethtool -i eth0 to check the driver name — ena driver means enhanced networking is active. Without ENA on instances that support it, you cap at 1 Gbps even on instance types rated for higher throughput.

VPC Flow Logs record accepted and rejected traffic at the network interface level. Filtering for REJECT action shows which connections are being dropped by security groups or NACLs before they reach the application. Flow Logs do not capture application-level issues, but they are definitive for network-level drops.`,
    whenToUse: [
      'Diagnosing applications that are slow without obvious errors, suggesting TCP retransmissions',
      'Explaining the difference between security group and NACL behavior in networking interviews',
      'Investigating MTU mismatches causing failures for large payloads only',
    ],
    keyConcepts: [
      { term: 'TCP Retransmission', definition: 'TCP\'s mechanism for recovering lost packets — if an acknowledgment is not received within the retransmit timeout (RTO), TCP resends the segment and halves the congestion window, dramatically reducing throughput.' },
      { term: 'Path MTU Discovery (PMTUD)', definition: 'The process by which TCP determines the maximum packet size the network path supports. Relies on ICMP "fragmentation needed" messages — blocking ICMP causes PMTUD failures and silent packet drops for large payloads.' },
      { term: 'Stateful vs Stateless Firewall', definition: 'Security groups track connection state and automatically allow return traffic. NACLs are stateless and require explicit allow rules for both directions — asymmetric NACL rules are a common source of mysterious packet drops.' },
      { term: 'Jumbo Frames', definition: 'Ethernet frames with MTU up to 9001 bytes, supported within EC2 VPCs. Using jumbo frames between instances within a VPC improves throughput for large transfers but requires MTU to drop to 1500 for external connections.' },
      { term: 'ENA (Elastic Network Adapter)', definition: 'The enhanced networking driver for EC2 that enables high-bandwidth networking up to 100 Gbps. Required to achieve the full bandwidth of instance types rated above 10 Gbps.' },
    ],
    pitfalls: [
      'Checking only latency metrics when diagnosing slow transfers — packet loss causes slow throughput with normal ping latency; check netstat retransmission counters independently.',
      'Blocking ICMP at the security group or NACL level — ICMP is required for PMTUD to work; blocking it causes large-payload failures that appear intermittent and are hard to correlate.',
      'Diagnosing NACL rules only for inbound traffic — NACLs are stateless and require separate outbound rules allowing ephemeral port ranges (1024–65535) for return traffic.',
      'Testing connectivity with small payloads (ping, curl of a small endpoint) and declaring networking healthy — MTU issues only manifest with large payloads above 1500 bytes.',
      'Not enabling VPC Flow Logs before an incident — flow logs must be configured in advance; they cannot be retroactively collected for traffic that already happened.',
    ],
    keyQuestions: [
      {
        question: 'A service running on EC2 can reach an external API for small requests but hangs or times out when sending payloads larger than about 1400 bytes. Small GET requests work fine. What is the likely cause and how do you verify?',
        answer: `The symptom — works for small payloads, fails for large ones, with a cutoff around 1400 bytes — is the classic PMTUD failure signature. The internal VPC uses 9001-byte MTU (jumbo frames), but the external path through the internet gateway or a VPN uses standard 1500 bytes. PMTUD should negotiate this automatically, but it relies on ICMP Type 3 Code 4 (Fragmentation Needed) messages getting back to the sender. If ICMP is blocked by a security group or NACL, the sender never learns that packets above 1500 bytes are being dropped.

Verification: use ping with explicit packet sizes. ping -M do -s 1400 <external-ip> sends a 1400-byte payload with the Don't Fragment bit set. If this succeeds but ping -M do -s 1450 <external-ip> fails or shows host unreachable, you have confirmed the MTU boundary. Alternatively, use tracepath <external-ip> which discovers the path MTU automatically using TTL expiry.

On the EC2 instance, check the current MTU: ip link show eth0. Check if ICMP is being blocked by querying VPC Flow Logs for REJECT on protocol 1 (ICMP) for traffic to/from the instance.

Fix options, in order of preference: (1) Clamp TCP MSS at the interface level using iptables: iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu. This forces TCP connections to negotiate a safe payload size during the handshake, avoiding large packets. (2) Lower the MTU on the EC2 instance interface: ip link set eth0 mtu 1500 — safe but eliminates jumbo frame benefit within the VPC. (3) Allow ICMP in security groups so PMTUD works correctly.`,
      },
    ],
    quickFire: [
      { q: 'What Linux command shows TCP retransmission statistics?', a: 'netstat -s | grep -i retrans, or ss -tin for per-connection retransmission counters.' },
      { q: 'What is the EC2 VPC maximum MTU for jumbo frames?', a: '9001 bytes.' },
      { q: 'Why must you allow ICMP in security groups for reliable networking?', a: 'ICMP carries Path MTU Discovery messages — blocking it causes large-payload packet drops with no application error.' },
      { q: 'What is the key difference between security groups and NACLs regarding return traffic?', a: 'Security groups are stateful (return traffic automatic); NACLs are stateless (require explicit outbound rules for return traffic).' },
      { q: 'What ethtool command verifies enhanced networking (ENA) is active?', a: 'ethtool -i eth0 — look for driver: ena in the output.' },
      { q: 'What VPC Flow Logs action value indicates dropped packets?', a: 'REJECT — indicates traffic dropped by a security group or NACL rule.' },
      { q: 'How do you force TCP to negotiate safe payload sizes without changing MTU?', a: 'TCP MSS clamping with iptables --clamp-mss-to-pmtu, which adjusts the MSS in SYN packets.' },
    ],
  },
  {
    id: 'ts-nat-gateway-throttling',
    title: 'NAT Gateway Bandwidth and Throttling',
    icon: 'globe',
    color: '#3b82f6',
    questions: 6,
    description: 'Identify NAT Gateway connection limits and eliminate unnecessary NAT costs with VPC endpoints.',
    visualizations: [],
    introduction: `## Overview
NAT Gateway is one of the most used and least understood services in AWS networking. It enables private subnet resources to initiate outbound internet connections while blocking inbound connections — essential for EC2 instances, ECS tasks, and Lambda functions in private subnets. But NAT Gateway has specific limits that, when exceeded, cause connectivity failures that look like general network outages.

NAT Gateway supports up to 45 Gbps of bandwidth, which is usually not the binding constraint. The more common limits are connection-based: 55,000 simultaneous connections per destination IP and port combination, and 900 new connections per second to the same destination. These limits exist per NAT Gateway instance. Applications that make many short-lived connections to the same destination (common with microservices calling shared databases or APIs) can hit the connections-per-second limit before hitting the bandwidth limit.

When NAT Gateway is throttled, the CloudWatch metric ErrorPortAllocation increases — this counter tracks connection allocation failures when NAT Gateway cannot accept new connections. ActiveConnectionCount shows the current number of active connections, which you can trend against the 55,000 limit. PacketDropCount tracks packets dropped, which appears after connection limits are exceeded.

The most impactful optimization is routing AWS service traffic through VPC endpoints instead of NAT Gateway. Every byte sent to S3, DynamoDB, SQS, SNS, CloudWatch, and other AWS services through a NAT Gateway costs $0.045 per GB for processing, plus incurs NAT Gateway bandwidth charges. S3 and DynamoDB Gateway Endpoints are free — they route traffic through the AWS network backbone with no data processing charge and no NAT Gateway involvement. Interface Endpoints (PrivateLink) for other services have hourly charges but eliminate NAT Gateway costs and often reduce latency.

For organizations with multiple workloads, a single NAT Gateway in a shared services VPC quickly becomes a bottleneck. Best practice is one NAT Gateway per AZ — this provides both higher total capacity (55,000 connections × number of NAT Gateways) and AZ resilience (if one AZ loses its NAT Gateway, only that AZ is affected). The cost increase is proportional to the number of AZs, but the availability improvement justifies it for production workloads.

NAT Gateway data processing costs are consistently the largest surprise on AWS bills. Every byte leaving a private subnet to the internet passes through NAT Gateway and incurs processing charges. Diagnosing high NAT Gateway costs requires looking at which resources are sending the most traffic — VPC Flow Logs sorted by bytes transferred, filtered for traffic going through the NAT Gateway ENI, identifies the top talkers.`,
    whenToUse: [
      'Diagnosing private subnet resources that can no longer reach the internet or AWS services',
      'Explaining NAT Gateway limits and VPC endpoint cost optimization in AWS architecture interviews',
      'Designing private subnet networking that minimizes NAT Gateway costs and connection bottlenecks',
    ],
    keyConcepts: [
      { term: 'ErrorPortAllocation', definition: 'CloudWatch metric counting times NAT Gateway failed to allocate a connection port, indicating the 55,000 simultaneous connections or 900 new connections per second limits were exceeded.' },
      { term: 'VPC Gateway Endpoint', definition: 'A free VPC endpoint for S3 and DynamoDB that routes traffic through the AWS network backbone, bypassing NAT Gateway entirely. Eliminates NAT processing costs and improves throughput for these services.' },
      { term: 'VPC Interface Endpoint (PrivateLink)', definition: 'An ENI-based endpoint for most AWS services that creates a private IP address in your VPC for the service. Routes traffic over AWS network, bypassing NAT Gateway at the cost of an hourly endpoint charge.' },
      { term: 'NAT Gateway Connection Limits', definition: '55,000 simultaneous connections per destination IP/port combination and 900 new connections per second to the same destination. Exceeded limits cause ErrorPortAllocation errors and dropped connections.' },
      { term: 'NAT Gateway Data Processing Cost', definition: '$0.045 per GB of traffic processed by NAT Gateway (varies by region). Every byte from private subnets to the internet or non-endpoint AWS services incurs this charge.' },
    ],
    pitfalls: [
      'Running a single NAT Gateway for all AZs — if it becomes a bottleneck or the AZ has issues, all private subnet resources lose internet access; use one NAT Gateway per AZ.',
      'Routing S3 and DynamoDB traffic through NAT Gateway when free Gateway Endpoints are available — this is pure waste; S3 and DynamoDB Gateway Endpoints should be created in every VPC.',
      'Diagnosing NAT Gateway throttling only by watching bandwidth metrics — ErrorPortAllocation and ActiveConnectionCount are the relevant metrics, not BytesInFromDestination.',
      'Not tracking NAT Gateway costs separately — they blend into VPC costs in the bill; use Cost Explorer filtered by service:AmazonVPC and usage type containing NatGateway to isolate them.',
      'Assuming more NAT Gateways only adds cost — the capacity and availability benefits of one-per-AZ justify the cost for production workloads with meaningful traffic.',
    ],
    keyQuestions: [
      {
        question: 'A batch job that downloads large files from S3 via ECS tasks in a private subnet is generating a $3,000 monthly NAT Gateway bill. How do you fix this?',
        answer: `This is a textbook case for an S3 Gateway VPC Endpoint. Traffic from the private subnet ECS tasks to S3 is currently routing through the NAT Gateway, incurring $0.045 per GB in processing charges plus data transfer charges. At $3,000 per month, that is roughly 67 TB of data per month going through NAT Gateway to reach S3 — entirely avoidable.

S3 Gateway Endpoints are free and take about two minutes to create. In the VPC console, navigate to Endpoints, create a new endpoint, select the com.amazonaws.region.s3 service, choose Gateway type, and associate it with the route tables used by the private subnets. AWS automatically adds a route entry to those route tables directing S3 traffic through the endpoint instead of the NAT Gateway.

After creating the endpoint, verify by running a test download from an ECS task or EC2 instance in the private subnet and monitoring NAT Gateway BytesInFromDestination — it should drop to near zero for S3 traffic. The CloudWatch NAT Gateway metrics should reflect reduced usage within minutes.

The monthly savings: $3,000 in NAT processing costs goes to $0 for S3 traffic. There may also be inter-AZ data transfer savings if the NAT Gateway and S3 buckets were in different AZs.

Beyond this specific fix, audit all AWS service traffic going through NAT Gateway. DynamoDB has a free Gateway Endpoint too. Other services like SQS, SNS, ECR, CloudWatch, and Secrets Manager have Interface Endpoints (PrivateLink) with hourly charges, but if the data volume is large enough, the hourly cost is less than the NAT processing cost. Use VPC Flow Logs to identify the top destination IPs and cross-reference with AWS IP ranges to identify which are AWS services.`,
      },
    ],
    quickFire: [
      { q: 'What is the NAT Gateway simultaneous connection limit per destination?', a: '55,000 connections per destination IP and port combination.' },
      { q: 'What CloudWatch metric shows NAT Gateway connection allocation failures?', a: 'ErrorPortAllocation.' },
      { q: 'What is the NAT Gateway new connections per second limit?', a: '900 new connections per second to the same destination.' },
      { q: 'What is the cost of an S3 VPC Gateway Endpoint?', a: 'Free — no hourly charge and no data processing charge.' },
      { q: 'Why should you deploy one NAT Gateway per AZ?', a: 'Higher total connection capacity and AZ-level resilience — a single NAT Gateway failure loses internet for all private subnets.' },
      { q: 'How do you identify which resources are generating the most NAT Gateway traffic?', a: 'VPC Flow Logs filtered for the NAT Gateway ENI, sorted by bytes transferred.' },
      { q: 'What is the NAT Gateway data processing charge per GB?', a: 'Approximately $0.045 per GB (varies by region).' },
    ],
  },
  {
    id: 'ts-pipeline-flakiness',
    title: 'Flaky CI/CD Pipeline Failures',
    icon: 'gitMerge',
    color: '#22c55e',
    questions: 6,
    description: 'Systematically identify and eliminate flaky tests and infrastructure failures that erode CI trust.',
    visualizations: [],
    introduction: `## Overview
Flaky CI/CD pipelines are more damaging than they appear. When developers learn that CI failures are sometimes spurious, they start merging anyway. The pipeline stops being a quality gate and becomes an annoyance. This is the worst possible outcome — the infrastructure, cost, and time cost of CI continues while the reliability benefit disappears entirely. Fixing flakiness is therefore not just a convenience improvement but a correctness requirement for the CI investment to pay off.

Flakiness falls into three categories with different remediation strategies. Test flakiness means the test code itself has non-deterministic behavior — the test passes some runs and fails others on the same commit. Infrastructure flakiness means the runner environment is unreliable — network timeouts, disk full, resource contention on shared runners. Dependency flakiness means the test relies on external services (third-party APIs, staging databases) that behave inconsistently.

Test flakiness root causes: shared mutable state between tests (a test pollutes global state that a later test depends on — test ordering matters when it should not), race conditions in async code (a test does not properly await an async operation and asserts on intermediate state), hardcoded ports conflicting when tests run in parallel (port 5432 is already in use), time-dependent assertions (test asserts a timestamp equals "now" but clock has moved), and non-deterministic ordering of sets or maps in assertion comparisons.

Detection requires more than looking at the last run. You need test pass rate over time — if a test has a 90% pass rate over 100 runs, it is flaky even though 9 runs out of 10 would suggest it is fine. Most CI systems can export test results as JUnit XML. Aggregating these in a database or using a tool like Buildkite Test Analytics, Datadog CI Visibility, or a simple script to track per-test pass rates reveals flaky tests that appear fine on any single run.

Infrastructure flakiness often comes from shared resources between parallel jobs. Parallel jobs on the same runner sharing a Docker socket can create port conflicts. Shared network namespaces mean one job's traffic affects another's packet counts. The fix is using service containers or Docker-in-Docker for isolation, and avoiding global state (environment variables, host ports) that bleeds between jobs.

Dependency flakiness is best fixed by not having dependencies in tests. Unit tests should mock external services. Integration tests should use local containers (Testcontainers library) instead of shared staging environments. End-to-end tests that must call real external APIs should run in a separate suite, on a longer schedule, with explicit tolerance for failures — they are smoke tests, not quality gates.`,
    whenToUse: [
      'Diagnosing CI pipelines where failures seem random and do not reproduce locally',
      'Explaining test isolation and hermetic testing principles in engineering interviews',
      'Designing CI infrastructure that maintains trust even as the test suite grows',
    ],
    keyConcepts: [
      { term: 'Flaky Test', definition: 'A test that produces different results (pass or fail) on the same code without any changes to the code under test. The defining characteristic is non-determinism in test outcome.' },
      { term: 'Hermetic Test Environment', definition: 'A test environment that is fully self-contained — all dependencies are controlled and deterministic, with no reliance on external network resources, shared state, or real-world timing.' },
      { term: 'Test Quarantine', definition: 'A CI practice of disabling a flaky test from blocking merges while tracking it as known-flaky. The test continues to run but its failure does not fail the build, preventing CI trust erosion while the flake is fixed.' },
      { term: 'Testcontainers', definition: 'A library for Java, Go, Python, and other languages that starts real Docker containers for databases, message queues, and other dependencies during test runs, providing isolation without mocking.' },
      { term: 'Test Pass Rate', definition: 'The percentage of runs where a test passes, measured over time. A test with a 95% pass rate that never failed before today is flaky and should be quarantined even though it usually passes.' },
    ],
    pitfalls: [
      'Adding retry logic to flaky tests and calling it fixed — retries mask flakiness rather than fixing it, and the underlying cause continues degrading and affecting users.',
      'Only looking at the most recent CI run to determine if tests are flaky — flakiness requires historical pass rate data, not a single run result.',
      'Sharing a staging database or external API across all CI runs — contention and test data conflicts between parallel runs cause failures that are impossible to reproduce in isolation.',
      'Declaring a flaky test fixed after one successful run — a test with 80% reliability will pass once on demand; verify with at least 20 consecutive passes before removing the quarantine flag.',
      'Not instrumenting CI failure modes separately from test failures — runner OOM kills, network timeouts, and Docker daemon crashes are infrastructure issues that need different remediation than flaky tests.',
    ],
    keyQuestions: [
      {
        question: 'Your CI pipeline has a 70% success rate over the past month, with failures seemingly random. How do you systematically identify whether the cause is test flakiness, infrastructure issues, or real bugs?',
        answer: `Start by classifying failures, not just counting them. Export all CI run results for the past month — most CI systems provide this via API or webhook. For each failure, categorize: does the failure reproduce on re-run without code changes? If yes, it is a real bug or persistent infrastructure issue. If the re-run passes, it is flakiness.

For flaky failures, identify which tests fail. If the same 3 tests appear in 80% of failures, you have a small set of flaky tests to fix. If different tests fail each time, you might have infrastructure issues (runner instability causing random test failures) or shared state problems (test order dependency).

Infrastructure flakiness signals: failures that show no specific test failure but runner-level errors (OOM kill, exit code 137, network timeout downloading dependencies), failures that cluster in time (all failures between 2pm–4pm when runners are busy), or failures that correlate with runner type or size.

Shared state signals: tests that fail in CI parallel mode but pass when run sequentially, failures involving port conflicts (address already in use), database constraint violations from concurrent test data insertion, or file permission errors from concurrent writes to shared paths.

For each identified root cause: flaky tests → analyze the test code for non-determinism (async issues, time dependencies, port conflicts) or add Testcontainers for isolation; infrastructure → upgrade runner size, use dedicated runners, or switch to container-based isolation per job; shared state → add per-test database teardown, use randomized port allocation, or containerize test dependencies.

Track the fix: after remediation, monitor the pass rate for two weeks. The 70% success rate should improve to 95%+ if the root cause is addressed.`,
      },
    ],
    quickFire: [
      { q: 'What defines a flaky test?', a: 'A test that produces different pass/fail results on the same code without code changes — non-deterministic behavior.' },
      { q: 'Why is adding retry logic to flaky tests harmful?', a: 'It masks the flakiness without fixing the root cause, and the underlying issue continues affecting reliability.' },
      { q: 'What library provides real Docker containers for database dependencies in tests?', a: 'Testcontainers — available for Java, Go, Python, Node.js, and other languages.' },
      { q: 'What is a test quarantine?', a: 'Marking a flaky test so its failure does not block CI builds while the root cause is investigated and fixed.' },
      { q: 'How do you detect test flakiness in historical data?', a: 'Track per-test pass rate over many runs — tests with less than 100% pass rate on unchanged code are flaky.' },
      { q: 'What is the most common cause of test port conflicts in parallel CI?', a: 'Hardcoded ports in test setup — tests bind to fixed ports that conflict when multiple test suites run simultaneously.' },
      { q: 'When should you re-enable a quarantined flaky test?', a: 'After 10 consecutive passing runs without modification — or after fixing the identified root cause and verifying stability.' },
    ],
  },
  {
    id: 'ts-rollback-strategies',
    title: 'Deployment Rollback Strategies',
    icon: 'gitMerge',
    color: '#22c55e',
    questions: 6,
    description: 'Design rollback-capable deployment pipelines and untangle database migrations from code deployments.',
    visualizations: [],
    introduction: `## Overview
Rollback is often treated as an edge case to handle when something goes wrong, but the most reliable systems are designed from the start so rollback is fast, tested, and almost automatic. The fundamental challenge is that code and data have different rollback properties: code can be swapped instantly, but database schema changes are often difficult or impossible to reverse safely.

Code rollback has two approaches: deploy a previous artifact, or git revert and deploy the new commit. Deploying a previous artifact is faster and lower-risk — you are deploying something that was previously validated in production, not creating a new commit that could introduce its own issues. Most CI/CD systems store build artifacts for a configurable period; the rollback is just pointing the deployment system at an older artifact. Git revert creates a new commit that undoes previous changes, which is correct for long-lived branches but adds unnecessary risk in a rollback scenario where speed matters.

Database rollback is the genuinely hard problem. Schema migrations that add columns, create tables, or add indexes are generally reversible. Migrations that drop columns or tables are not reversible once executed and data exists. The industry-accepted solution is forward-only migrations: never write rollback scripts for destructive changes; instead, design migrations so that both the old and new code can run against the same schema simultaneously. This requires several practices: expand/contract pattern (add the new column and keep the old one, migrate code to use the new column, then drop the old column in a separate migration after the code change is stable), and never removing columns in the same deployment that removes the last code reference to them.

Feature flags are the ultimate decoupling mechanism for rollbacks. When a feature is behind a flag, the database migration can land weeks before the code change, and the code change can deploy to production without activating the feature. Rollback becomes turning off the flag rather than reverting code or migrating data. The flag becomes the release mechanism, separate from the deployment.

Blue/green deployment makes code rollback instant: you maintain two identical environments (blue = current production, green = new version), switch traffic, and if green has problems, switch back. The rollback is a single DNS change or ALB weight shift. The cost is maintaining two full production environments simultaneously.

Canary deployment is the easiest to roll back from: set the canary traffic weight to 0 and the canary is gone. The difficulty is knowing when to roll back — which metrics trigger automatic rollback, and what are the thresholds? Error rate increase of more than 0.5% versus stable? p99 latency regression of more than 20%? Business metric (revenue per request) drop of more than 2%? These thresholds should be defined and automated before the deployment, not improvised during an incident.`,
    whenToUse: [
      'Designing a deployment pipeline that can roll back within 5 minutes of detecting a regression',
      'Explaining the expand/contract database migration pattern in system design interviews',
      'Choosing between blue/green, canary, and rolling deployment strategies for different risk profiles',
    ],
    keyConcepts: [
      { term: 'Expand/Contract Pattern', definition: 'A database migration approach where schema changes are made in two phases: expand (add new structure alongside old) while both versions run, then contract (remove old structure) after the new version is stable and the old is no longer referenced.' },
      { term: 'Forward-Only Migration', definition: 'A database migration philosophy where rollback scripts are not written for destructive changes — instead, migrations are designed so old and new code versions can both run against the migrated schema.' },
      { term: 'Blue/Green Deployment', definition: 'Maintaining two identical production environments, with traffic switched between them. Rollback is instant — return traffic to the previous environment — but requires running two environments simultaneously.' },
      { term: 'Feature Flag', definition: 'A runtime configuration that enables or disables a feature without deploying code. Separates deployment (code is in production) from release (users can access the feature), enabling instant rollback by disabling the flag.' },
      { term: 'Automatic Rollback Threshold', definition: 'Pre-defined metric thresholds (error rate, latency, business metrics) that trigger an automated rollback without human intervention, typically targeting rollback within 5 minutes of anomaly detection.' },
    ],
    pitfalls: [
      'Writing rollback scripts for destructive database migrations and trusting them to work — testing rollback scripts requires staging data that mirrors production, and they are almost never tested adequately.',
      'Dropping a column in the same deployment that removes the code reference — the old code version running during rollout still reads the dropped column and fails.',
      'Designing blue/green without a data synchronization plan — if green writes new data during the window before rollback, rolling back to blue loses that data.',
      'Setting canary rollback thresholds as absolute error rates instead of deltas versus stable — absolute thresholds trigger false positives on baseline error rates and miss regressions on low-error services.',
      'Not testing the rollback path in staging — rollback procedures that have never been exercised will fail at the worst possible moment during a production incident.',
    ],
    keyQuestions: [
      {
        question: 'You need to rename a column in a high-traffic PostgreSQL table from user_name to username. How do you do this safely with zero downtime and the ability to roll back?',
        answer: `Renaming a column in a single ALTER TABLE statement breaks any code currently running that references the old column name. The safe approach is expand/contract, which takes three separate deployments.

Phase 1 — Expand: Add the new column username alongside the existing user_name. Create a trigger that keeps both columns synchronized: INSERT and UPDATE on user_name also writes to username, and INSERT and UPDATE on username also writes to user_name. Run a background job to backfill username for all existing rows. Now both columns exist and contain the same data. This migration is fully reversible — drop the new column and trigger to revert.

Phase 2 — Migrate code: Deploy the application change that reads and writes username instead of user_name. Both columns still exist and are synchronized, so if you need to roll back the code to the version using user_name, the trigger ensures the old column still has current data. The rollback is a code-only operation with no data risk.

Phase 3 — Contract (after Phase 2 is stable for at least one release cycle): Remove the trigger and drop user_name. This is intentionally irreversible — if you need to go back to user_name after this point, you repeat Phase 1 in the reverse direction.

The key principle: code rollback and schema rollback are separate operations. You must be able to roll back code without rolling back the schema, which means the schema must be compatible with both the old and new code versions simultaneously.

For the trigger in PostgreSQL: CREATE OR REPLACE FUNCTION sync_username() RETURNS TRIGGER AS $$ BEGIN NEW.username := NEW.user_name; NEW.user_name := NEW.username; RETURN NEW; END; $$ LANGUAGE plpgsql; then attach as a BEFORE INSERT OR UPDATE trigger.`,
      },
    ],
    quickFire: [
      { q: 'Why is deploying a previous artifact safer than git revert for emergency rollback?', a: 'Previous artifact was already validated in production; git revert creates a new commit that could introduce new issues.' },
      { q: 'What is the expand/contract migration pattern?', a: 'Add new schema alongside old (expand), migrate code to use new schema, then remove old schema (contract) after code is stable.' },
      { q: 'Why is dropping a column in the same deployment as removing the code reference dangerous?', a: 'Old code running during rollout still references the dropped column and will fail with column not found errors.' },
      { q: 'How do feature flags improve rollback capability?', a: 'They decouple deployment from release — rolling back is disabling a flag, not reverting code or data.' },
      { q: 'What is the rollback mechanism for canary deployments?', a: 'Set canary traffic weight to 0 — the canary version stops receiving traffic immediately.' },
      { q: 'What should automatic rollback thresholds measure?', a: 'Delta versus the stable baseline (error rate increase, latency regression percentage), not absolute values.' },
      { q: 'What is blue/green deployment\'s main disadvantage versus canary?', a: 'Requires maintaining two full production environments simultaneously, doubling infrastructure cost during the deployment window.' },
    ],
  },
  {
    id: 'ts-canary-issues',
    title: 'Canary Deployment Problems',
    icon: 'gitMerge',
    color: '#22c55e',
    questions: 6,
    description: 'Fix canary traffic routing, statistical validity, and monitoring gaps that make canaries unreliable.',
    visualizations: [],
    introduction: `## Overview
Canary deployments are one of the most powerful techniques for reducing deployment risk, but they require more sophistication to implement correctly than most teams expect. A naive canary — send 5% of traffic to the new version, watch it for 10 minutes, then promote — often fails silently. The canary passes, the full rollout proceeds, and the bug that the canary was supposed to catch hits 100% of traffic.

The statistical validity problem is the most common unrecognized issue. Detecting a 1% increase in error rate with 95% confidence requires roughly 7,000 requests per version to reach statistical significance. At a 1% canary weight, getting 7,000 canary requests requires 700,000 total requests. A service handling 1,000 requests per minute needs 700 minutes — 11 hours — for the canary to have meaningful statistical power. Most teams observe canaries for 10–30 minutes. The canary period is too short to detect the regression, so the canary passes regardless of whether the new version is buggy.

Solutions to the statistical validity problem: increase canary weight to 10–20% (reduces observation time by 10–20×), implement sequential testing algorithms (like the Wald sequential probability ratio test) that can make decisions with fewer samples when the effect size is large, or define the canary threshold as "no detected regression at all" rather than "significantly different" — a conservative posture that does not require statistical significance.

User cohort consistency matters for canaries with session state. If a user's first request goes to the canary and their second request goes to stable, they may see inconsistent application state. Authentication tokens generated by the new version might not be valid for the old version. Sticky sessions — routing a user to the same version for their entire session — prevent this. Implement via cookie-based routing (set a sticky cookie on first request) or by using consistent hashing on a user identifier.

Monitoring must compare canary versus stable, not canary versus static thresholds. A canary error rate of 0.3% looks fine if your static threshold is 1% — but if stable is at 0.05%, the canary represents a 6× regression. Relative comparison is the correct signal. Calculate the error rate ratio (canary / stable) and alarm when it exceeds 2× or 3×. Same logic applies to p99 latency — measure the latency ratio, not absolute values.

A canary stuck in partial rollout is a dangerous state. If the deployment system cannot decide whether to promote or roll back — perhaps because the health check is intermittently passing and failing — you end up with two versions of the code running simultaneously indefinitely. This is problematic for session state, for debugging (which version caused this bug?), and for database migration compatibility. Implement a maximum canary duration: after X minutes with no decision, the deployment system must either promote or roll back, not continue observing.`,
    whenToUse: [
      'Diagnosing why a canary that passed did not prevent a production regression',
      'Explaining statistical sampling requirements for meaningful canary analysis in system design interviews',
      'Designing a canary deployment system with automated promotion and rollback decisions',
    ],
    keyConcepts: [
      { term: 'Statistical Significance in Canaries', definition: 'The minimum sample size required to detect a given regression with a given confidence. For 1% error rate regression at 95% confidence, approximately 7,000 requests per variant are needed — often requiring hours at low canary weights.' },
      { term: 'Relative Error Rate Comparison', definition: 'Comparing the canary error rate against the stable version\'s error rate (as a ratio), rather than against a static absolute threshold. Detects regressions even when baseline error rates are low.' },
      { term: 'Sticky Session Routing', definition: 'A canary routing mechanism that ensures a user consistently sees the same version (canary or stable) throughout their session, preventing state inconsistency from mixed-version request handling.' },
      { term: 'Header-Based Canary', definition: 'Routing specific requests (identified by header values) to the canary version, regardless of traffic percentage. Used for beta user groups or internal testing without affecting random traffic sampling.' },
      { term: 'Maximum Canary Duration', definition: 'A deployment safety circuit breaker that forces a promotion or rollback decision after a maximum observation period, preventing indefinite mixed-version running states.' },
    ],
    pitfalls: [
      'Setting canary weight at 1% and observing for 10 minutes — this provides essentially no statistical power to detect typical regression sizes and gives false confidence.',
      'Comparing canary error rate to a static absolute threshold instead of to the simultaneous stable error rate — stable may have a 0.05% baseline, making a 0.3% canary error rate a 6× regression that static thresholds miss.',
      'Not implementing sticky sessions for canaries involving authentication, session tokens, or client-side state — mixed-version requests cause user-visible inconsistencies.',
      'Leaving a canary in partial rollout indefinitely when health checks are borderline — two versions running indefinitely causes debugging confusion and migration compatibility risks.',
      'Using only error rate to judge canary health and ignoring latency and business metrics — a change can be error-free but introduce a 40% latency regression or a conversion rate drop that only business metrics reveal.',
    ],
    keyQuestions: [
      {
        question: 'You run a canary at 5% traffic for 15 minutes and see no elevated error rates, so you promote to 100%. Immediately after full rollout, error rates spike to 2%. How could the canary have passed while the version was actually broken?',
        answer: `Several factors could cause the canary to miss the regression. The most likely is statistical power. At 5% canary weight for 15 minutes, if your service handles 200 requests per minute total, the canary received 5% × 200 × 15 = 150 requests. Detecting a statistically significant increase in error rate with 150 samples requires the true error rate to be roughly 3–4% higher than baseline. If the bug causes a 1–2% error rate increase, 150 samples has almost no power to detect it.

Second possibility: the bug is path-dependent. Canary traffic is a random 5% sample, but if the bug only manifests for specific user types, request patterns, or data states that are rare in the random sample, the 15-minute canary window may simply not have encountered the triggering condition. Full rollout reaches 100% of users including the ones with the triggering condition.

Third possibility: load-dependent. The bug might only manifest above a certain concurrency or request rate. At 5% traffic, the canary processes 1/20th the requests of a full deployment. If the bug is a race condition that occurs when 50 concurrent requests hit a shared resource, the canary at 1/20th load almost never triggers the condition.

Fixes: increase canary weight to 20% to get more samples faster, extend observation time until you have at least 5,000 canary requests before deciding, implement relative error rate monitoring (canary error rate / stable error rate) with an alarm at 1.5× ratio, and add latency comparison. Also implement automatic rollback triggered by the post-full-rollout error rate spike — even if the canary misses a regression, automatic rollback can limit the blast radius to minutes rather than the time it takes an on-call engineer to notice and respond.`,
      },
      {
        question: 'How do you implement a canary that is statistically meaningful for a service handling only 10 requests per minute?',
        answer: `At 10 requests per minute total, even a 50% canary weight gives you 5 canary requests per minute — roughly 75 requests in 15 minutes. That provides almost no statistical power for detecting small regressions.

The fundamental problem is that percentage-based canary weight is poorly suited to low-traffic services. Several alternative approaches work better.

Header-based canary targeting: instead of random traffic sampling, route all traffic from a specific cohort to the canary — internal employees, beta users, or specific API clients. This gives you real user behavior without diluting the sample across time. A company with 50 employees testing an internal tool at 10 req/min can route all 50 employees to the canary and get meaningful coverage.

Synthetic load during canary: run a load test against the canary alongside real traffic. This artificially increases the sample size for the canary version without affecting real users. Synthetic requests must closely match real traffic patterns to be meaningful — use recorded production traffic replayed against the canary.

Extended observation: for low-traffic services, accept that canary periods need to be days, not minutes. A canary running for 3 days at 50% weight on a 10 req/min service gives you roughly 21,600 canary requests — sufficient statistical power.

Conservative promotion criteria: for low-traffic services, require zero canary errors rather than a statistical comparison. A single error in a canary period triggers investigation. This is overly conservative but appropriate when sample sizes are too small for ratio-based statistical tests.

For genuinely low-traffic internal services, consider whether the risk profile justifies the canary overhead at all — a feature flag with a quick toggle and 5-minute rollback time may be more practical than a statistically rigorous canary deployment.`,
      },
    ],
    quickFire: [
      { q: 'How many requests per variant are needed to detect a 1% error rate regression at 95% confidence?', a: 'Approximately 7,000 requests per variant.' },
      { q: 'Why should canary health be measured as a ratio versus stable rather than against a static threshold?', a: 'Stable may have a low baseline error rate — a ratio detects relative regressions that absolute thresholds miss.' },
      { q: 'What is a header-based canary?', a: 'Routing requests with a specific header value to the canary version, enabling targeted rollout to specific user groups without random traffic sampling.' },
      { q: 'What is sticky session routing in canary deployments?', a: 'Ensuring a user consistently sees the same version throughout their session, preventing state inconsistency from mixed-version requests.' },
      { q: 'What problem does a maximum canary duration solve?', a: 'Prevents indefinite mixed-version running states when deployment health checks cannot make a clear promote/rollback decision.' },
      { q: 'At 1% canary weight on a service handling 1,000 req/min, how long to get 7,000 canary requests?', a: '700 minutes — approximately 11.7 hours.' },
      { q: 'What business metric signals complement error rate and latency in canary monitoring?', a: 'Conversion rate, revenue per request, or any metric that reflects user outcomes — technical metrics can be healthy while user experience degrades.' },
    ],
  },
{
    id: 'ts-metrics-gaps',
    title: 'Metrics Gaps in Dashboards',
    icon: 'activity',
    color: '#06b6d4',
    questions: 6,
    description: 'Diagnose and resolve missing data points in Prometheus, CloudWatch, and Grafana dashboards.',
    visualizations: [],
    introduction: `## Overview
A gap in a dashboard graph is not always the same thing as a zero value — and treating them as equivalent is a common diagnostic mistake that wastes hours of on-call time. Understanding what actually causes a gap is the first step to resolving it.

Gaps in Prometheus graphs come from one of four main sources. The first is a scrape failure: the Prometheus server tried to scrape the target and got a connection error, timeout, or non-200 HTTP response. When this happens for long enough, Prometheus injects a staleness marker into the time series — a special sentinel value that tells the storage engine "this series has gone away." A staleness-marked gap renders as a broken line in Grafana, not a flat zero.

The second source is network partition. If Prometheus can reach the target's /metrics endpoint but packet loss is high, individual scrape cycles fail while others succeed, producing intermittent gaps rather than a clean break. This is common in cross-VPC or cross-AZ monitoring setups where route tables are misconfigured.

The third source is clock skew. Prometheus stores samples with the timestamp of when the scrape completed. If the target's system clock is more than a few seconds ahead of the Prometheus server's clock, samples arrive out of order and the storage engine silently drops them. A gap that appears in Grafana but not in the raw /metrics output on the target is a strong signal of clock skew. Check with chronyc tracking or timedatectl on both hosts.

The fourth source is series staleness from label changes. If a pod restarts with a new uid label or an auto-scaling group replaces an instance, the old label set disappears and a new one appears. Dashboard queries that hardcode old label values show a gap for the new series even though the underlying metric is being scraped correctly.

Diagnosing Prometheus gaps starts with the up metric: up{job="myjob"} == 0 means the target is being scraped but the scrape is failing. No result at all means the target is not in Prometheus's discovery output. The Prometheus /targets UI page (port 9090) shows all discovered targets, their last scrape time, and the error if the scrape failed. scrape_duration_seconds approaching the scrape_timeout value (default 10s) means scrapes are timing out intermittently.

In CloudWatch, gaps appear when the CloudWatch agent stops sending metrics — this happens on instance termination, agent crashes, or network ACL changes that block outbound traffic to the CloudWatch endpoint. Use FILL(m1, 0) in CloudWatch Metric Math to visually distinguish a true gap from a legitimate zero value in trend graphs.

For alerting on gaps, the absent() PromQL function fires when a series completely disappears from the metric store. For series that are intermittent by design (batch jobs, cron), use absent_over_time(metric[30m]) to avoid false positives on short gaps.`,
    whenToUse: [
      'Diagnosing broken lines or missing data points in Grafana dashboards',
      'Explaining why a Prometheus alert fired on absence of a metric series',
      'Investigating why CloudWatch dashboards show gaps after a deployment',
      'Designing monitoring systems resilient to pod restarts and label changes',
      'Debugging clock skew issues between scrape targets and Prometheus server',
    ],
    keyConcepts: [
      { term: 'Staleness Marker', definition: 'A special sentinel value Prometheus injects into a time series when a scrape target disappears, causing Grafana to render a gap rather than interpolating zero.' },
      { term: 'Scrape Failure', definition: 'A failed HTTP request from Prometheus to a target\'s /metrics endpoint, recorded in the up metric as value 0.' },
      { term: 'absent()', definition: 'PromQL function that returns 1 when a metric series does not exist in the current evaluation window — used to alert on missing series.' },
      { term: 'Clock Skew', definition: 'A difference between the system clocks of the Prometheus server and a scrape target that causes samples to arrive out of order and be dropped.' },
      { term: 'FILL()', definition: 'CloudWatch Metric Math function that replaces missing data points with a specified value (commonly 0) to distinguish gaps from zeros in visualizations.' },
    ],
    pitfalls: [
      'Treating a gap (staleness marker) as equivalent to a zero value — they have different causes and different fixes.',
      'Forgetting to check the Prometheus /targets page, which shows the exact scrape error message.',
      'Not accounting for label changes after pod restarts — hardcoded label selectors in dashboards will show gaps for new pods with changed labels.',
      'Setting scrape_timeout equal to scrape_interval — any slow scrape causes gaps; timeout should be less than interval.',
      'Using absent() on high-cardinality series without label matchers — it matches any series with that metric name.',
    ],
    keyQuestions: [
      {
        question: 'How does a Prometheus staleness marker differ from a zero value, and how do you tell them apart in a dashboard?',
        answer: `A staleness marker is a special non-numeric sentinel that Prometheus writes into the time series when it detects a scrape target has gone away — specifically, when a target disappears from service discovery or when a scrape returns a stale marker directly. It tells the storage engine and query layer that no data was collected, rather than that the metric had a value of zero.

In Grafana, a staleness marker renders as a broken line — the graph literally has no line segment between the last known point and the next scraped point after the target returned. A zero value, by contrast, renders as a flat line at y=0. This distinction matters for diagnosis: a broken line means the scrape itself failed or the target disappeared, while a flat zero means the metric was successfully scraped and the value happened to be zero.

To confirm which situation you are dealing with, query the up metric for that target in Prometheus. If up{job="your-job", instance="your-host:port"} == 0, the target is reachable by Prometheus discovery but the scrape is failing. If there is no result at all for up{...}, the target has been removed from discovery entirely — check your service discovery config (file_sd, kubernetes_sd, etc.). If up == 1 but the graph shows a gap, you likely have a clock skew problem causing out-of-order sample rejection.`
      },
      {
        question: 'How do you alert when a critical metric series disappears entirely from Prometheus?',
        answer: `Use the absent() function in a Prometheus alerting rule. The expression absent(up{job="critical-service"}) returns a result (value 1) only when no time series matching that selector exists in the current evaluation window. When the series is present, absent() returns no data, so the alert does not fire.

For series that appear intermittently — such as metrics from batch jobs or cron processes — use absent_over_time() instead. The expression absent_over_time(job_completion_total{job="nightly-backup"}[1h]) fires only if the metric has been absent for the entire look-back window, preventing false positives from short gaps between job runs.

A common pattern is to combine absence alerting with a for duration to avoid flapping on single failed scrapes. Set for: 5m on a 1-minute scrape interval job — this requires three consecutive missed scrapes before the alert fires, filtering out transient network blips. Add a runbook annotation to the alert with a link to the Prometheus /targets page and the specific diagnostic steps for that job.`
      },
      {
        question: 'What causes intermittent metrics gaps in a cross-AZ Prometheus setup?',
        answer: `In a setup where Prometheus runs in one AWS availability zone and scrape targets run in another, intermittent gaps are almost always caused by one of three things: network ACL rules that rate-limit or occasionally block traffic on the metrics port, route table misconfiguration that sends traffic through a NAT gateway with connection tracking limits, or security group rules that allow traffic in aggregate but reject individual scrape requests due to connection state timeouts.

Diagnose by correlating the timestamps of gaps in Grafana with VPC flow log entries for the metrics port (default 9090 or your custom port). If flow logs show REJECT entries or RST packets during the gap windows, the problem is network-layer.

The fix depends on the cause: correct the ACL or security group rules if traffic is being blocked, switch to a Prometheus federation model where a local Prometheus per AZ scrapes targets and a global Prometheus scrapes the local instances, or deploy Prometheus closer to its targets using EKS node affinity rules to co-locate the Prometheus pod with the services it monitors.`
      },
    ],
    quickFire: [
      { q: 'What metric tells you if a Prometheus scrape target is being scraped successfully?', a: 'The up metric — value 1 means the last scrape succeeded, value 0 means it failed.' },
      { q: 'What PromQL function alerts when a metric series disappears?', a: 'absent() — returns a value when the series does not exist, fires no result when it does.' },
      { q: 'What causes a gap in Grafana vs a flat zero line?', a: 'A gap means no data was collected (staleness marker or scrape failure); a flat zero means the metric was scraped and had value 0.' },
      { q: 'Where do you look first when investigating a Prometheus scrape failure?', a: 'The /targets page at port 9090 — it shows the last scrape time, status, and exact error for every target.' },
      { q: 'How does clock skew cause metrics gaps?', a: 'If the target clock is ahead of the Prometheus server clock, samples arrive out-of-order and are silently dropped by the storage engine.' },
    ],
  },

  {
    id: 'ts-alert-fatigue',
    title: 'Alert Fatigue and On-Call Burnout',
    icon: 'activity',
    color: '#06b6d4',
    questions: 6,
    description: 'Identify, measure, and systematically reduce alert noise to restore effective on-call rotations.',
    visualizations: [],
    introduction: `## Overview
Alert fatigue is the state where on-call engineers have been conditioned by noisy, low-signal alerts to treat pages as background noise rather than urgent signals. It is one of the most dangerous failure modes in reliability engineering because it silently degrades your incident response capability — often without anyone explicitly deciding to stop responding to alerts.

The symptoms of alert fatigue are measurable: mean time to acknowledge (MTTA) trends upward over weeks even as alert volume stays constant, engineers acknowledge alerts without opening runbooks or investigating root cause, multiple alerts fire for the same underlying issue and engineers respond to none, and on-call rotations become the most dreaded assignment in the team.

The root causes fall into four categories. Static thresholds set too conservatively generate pages during normal traffic patterns — a CPU alert at 70% that fires every afternoon during peak hours teaches engineers to ignore CPU alerts. No alert priority tier means everything is equally urgent, which is the same as nothing being urgent; a database connection pool at 95% and a single 500 error response are not the same severity. Alerts without runbooks force the on-call engineer to figure out the same diagnostic steps from scratch every time, increasing cognitive load and discouraging investigation. Redundant alerts covering the same failure from multiple angles create alert storms where a single root cause generates 20 simultaneous pages.

The Google SRE approach, documented in Site Reliability Engineering, addresses this at the design level: alert on symptoms that users can feel (SLO burn rate, error rate, latency p99), not on causes that may or may not affect users (CPU usage, memory usage, disk I/O). A CPU spike that does not affect response latency should log a metric but should not page anyone.

The practical fix for an existing alert setup is a weekly alert audit. For every alert that fired in the past week, ask three questions: did this alert require human action, was the action documented, and could the action have been automated. Any alert that answers no to all three should be either deleted, downgraded to a ticket, or automated. Maintain a target of less than five pages per on-call shift, with each page corresponding to a genuine user-facing issue.

SLO-based alerting using burn rate is the most effective structural fix. A 1-hour 14.4x burn rate alert means you are burning your 30-day error budget fast enough to exhaust it in about 2 hours — this is urgent and requires a page. A 6-hour 6x burn rate alert means you will exhaust the budget in about 5 hours — urgent but allows a slightly calmer response. These alerts are specific, actionable, and tied directly to user impact.`,
    whenToUse: [
      'Diagnosing why on-call engineers are slow to respond despite receiving pages',
      'Redesigning an alert hierarchy to separate critical pages from informational notifications',
      'Explaining the SRE approach to symptom-based vs cause-based alerting',
      'Auditing an existing alert set to identify and eliminate noise',
      'Setting up SLO burn rate alerting to replace threshold-based pages',
    ],
    keyConcepts: [
      { term: 'Alert Fatigue', definition: 'The desensitization of on-call engineers to alerts due to excessive volume or noise, resulting in slow or absent responses to genuine incidents.' },
      { term: 'MTTA', definition: 'Mean Time To Acknowledge — the average time from an alert firing to an engineer acknowledging it; a leading indicator of alert fatigue when trending upward.' },
      { term: 'SLO Burn Rate', definition: 'The rate at which error budget is being consumed relative to the target rate — the foundation of Google\'s multi-window, multi-burn-rate alerting approach.' },
      { term: 'Symptom-Based Alerting', definition: 'Alerting on user-visible impact (high error rate, high latency) rather than internal causes (CPU, memory) — the core SRE principle for reducing noise.' },
      { term: 'Alert Hierarchy', definition: 'A tiered structure classifying alerts by urgency and required response: page (immediate action), ticket (next business day), log (no action needed).' },
    ],
    pitfalls: [
      'Alerting on causes (CPU, disk) rather than symptoms (error rate, latency) — causes often have no user impact and generate noise.',
      'Setting thresholds without reviewing historical data — a threshold that fires 20 times per week during normal operations is not a valid alert.',
      'Creating alerts without runbooks — undocumented alerts have higher cognitive load and lower response rates.',
      'Not auditing old alerts when adding new ones — alert debt accumulates and is rarely paid down without a deliberate process.',
      'Using the same notification channel and severity for all alerts — when everything is critical, nothing is critical.',
    ],
    keyQuestions: [
      {
        question: 'What is the Google SRE recommendation for what to alert on, and why does it reduce noise?',
        answer: `The Google SRE recommendation is to alert on symptoms — things that users directly experience, such as high error rates, elevated latency, or complete service unavailability — rather than on causes like CPU utilization, memory usage, or disk I/O.

The reason this reduces noise is that causes are only relevant when they actually affect users, and most of the time they do not. A CPU spike during a batch job on a weekend morning does not affect interactive latency if the service has adequate headroom. An alert on that CPU spike wakes someone up for no reason. But an elevated p99 latency always means users are waiting longer, so an alert on that is always actionable.

The implementation is through SLO burn rate alerting. You define a target (for example, 99.9% of requests succeed within 500ms over a 30-day window). You then set multi-window burn rate alerts: if you are burning error budget at 14.4x the sustainable rate for 1 hour, page immediately. If you are burning at 6x for 6 hours, page with medium urgency. If you are burning at 3x for 3 days, create a ticket. This structure naturally covers all user-impacting failures while remaining silent for everything else.`
      },
      {
        question: 'How do you run an alert audit to systematically reduce noise in an existing alerting system?',
        answer: `An alert audit is a weekly or biweekly review of every alert that fired in the period, answering a structured set of questions for each alert to decide its fate.

For each alert, ask: did this alert require a human to take action (if no, it should not be a page), was the action taken documented in a runbook (if no, the runbook is missing and must be added or the alert downgraded), could the action have been automated (if yes, automate it and remove the alert), and did the alert correlate with user-visible impact (if no, consider converting to a metric or ticket instead of a page).

Categorize each alert into one of three dispositions: keep as a page, downgrade to a ticket or Slack notification, or delete. Be ruthless about deletion — an alert that provides no signal is worse than no alert because it trains engineers to ignore the alerting channel.

Track the total page count per on-call shift week over week. A healthy team receives fewer than five pages per shift. If you are above that, the audit is not optional — it is a reliability requirement. Some teams implement an alert freeze: no new alerts can be added until existing ones are audited and the page rate is below the target.`
      },
      {
        question: 'How do suppression windows and alert grouping help reduce on-call burden without losing signal?',
        answer: `Alert suppression windows temporarily silence alerts during known-noisy periods — scheduled maintenance, deployment windows, or predictable traffic spikes like end-of-month batch processing. They are different from silencing alerts permanently because the suppression is time-bounded and intentional. PagerDuty and Alertmanager both support scheduled overrides that suppress pages for a defined window.

Alert grouping (called inhibition in Prometheus Alertmanager) prevents alert storms where a single root cause fires dozens of alerts. The classic example is a database going down: this causes connection errors in ten microservices, each of which fires an alert. Without grouping, the on-call engineer receives ten pages simultaneously. With inhibition rules, a database-down alert suppresses all dependent service alerts, leaving a single actionable page.

The configuration in Alertmanager uses inhibit_rules: if the source alert (database down) is firing, suppress the target alerts (service connection errors) that match the database label. This requires consistent labeling across your alerts — services must label which database they depend on so the inhibition rule can match correctly. The investment in consistent labeling pays dividends in reduced noise during every incident.`
      },
    ],
    quickFire: [
      { q: 'What does MTTA trending upward over time usually indicate?', a: 'Alert fatigue — engineers are being conditioned to respond slowly or not at all to pages due to excessive noise.' },
      { q: 'Should you alert on CPU exceeding 80%?', a: 'Not as a page — only if it correlates with user-facing impact like latency degradation. Alert on symptoms, not causes.' },
      { q: 'What is the target page count per on-call shift according to SRE best practices?', a: 'Fewer than five pages per shift, each requiring genuine human action.' },
      { q: 'What PromQL function implements SLO burn rate alerting?', a: 'A ratio of error rate over a short window to error budget rate, compared against burn rate multipliers (14.4x for 1h, 6x for 6h).' },
      { q: 'What is Alertmanager inhibition?', a: 'A rule that suppresses dependent alerts when a root-cause alert is firing, preventing alert storms from a single failure.' },
    ],
  },

  {
    id: 'ts-tracing-missing',
    title: 'Missing Traces in Distributed Tracing',
    icon: 'activity',
    color: '#06b6d4',
    questions: 6,
    description: 'Diagnose why traces are incomplete or missing in Jaeger, Zipkin, or OpenTelemetry-based systems.',
    visualizations: [],
    introduction: `## Overview
Distributed tracing is only valuable when traces are complete — a trace that shows three of seven service hops provides misleading latency attribution and can send you debugging the wrong service. Missing traces and broken trace chains are among the most frustrating debugging experiences in distributed systems, and they have a surprisingly small number of root causes once you know where to look.

The first and most common cause is sampling. Most production tracing systems sample a fraction of requests to control storage costs and overhead. Head-based sampling — where the decision to trace is made at the entry point before the trace is complete — typically samples 1% to 10% of traffic. This means rare events, errors that occur in 0.1% of requests, and slow outlier traces are almost never sampled. If you are trying to debug a specific error and the trace is missing, sampling is often the answer. Tail-based sampling solves this by buffering complete traces at a collector and then making the sampling decision based on trace characteristics (errors, high latency) — but it requires a stateful collector like the OpenTelemetry Collector with the tail sampling processor.

The second cause is broken context propagation. A distributed trace works by passing a trace context — a trace ID, span ID, and sampling flag — from service to service in request headers. The W3C Trace Context standard uses the traceparent header. Zipkin B3 uses X-B3-TraceId and related headers. When any service in the chain fails to forward these headers — including load balancers, API gateways, AWS Lambda event sources, and background queue consumers — the trace chain breaks. The downstream service starts a new root span with a new trace ID, and the connection between the upstream and downstream work is lost.

The third cause is instrumentation gaps. If a service is not instrumented with a tracing library at all, it cannot create spans or forward trace context. This creates a visible gap in the waterfall diagram — you see span A complete, then span C start much later, with no span B in between, and no explanation for where the latency went.

The fourth cause is exporter misconfiguration. The tracing SDK generates spans in memory, but those spans must be exported to a backend (Jaeger, Zipkin, Tempo) via an exporter. Misconfigured endpoints, TLS certificate failures, wrong port numbers, or batch processor queue saturation all cause spans to be dropped silently. The application continues to run, traces appear to be configured, but nothing arrives at the backend.

Diagnosis starts with the OTel Collector's zPages endpoint (/tracez) which shows span counts, latency distributions, and error rates for spans flowing through the collector. From there, check the exporter logs for connection errors and verify span counts are increasing.`,
    whenToUse: [
      'Diagnosing incomplete waterfall diagrams in Jaeger or Zipkin',
      'Explaining why traces for error requests are never captured despite tracing being enabled',
      'Debugging context propagation breaks at API gateways, load balancers, or message queues',
      'Choosing between head sampling and tail sampling for a production tracing deployment',
      'Investigating why spans are generated in the application but never appear in the tracing backend',
    ],
    keyConcepts: [
      { term: 'Head Sampling', definition: 'A sampling strategy where the decision to trace a request is made at the entry point before the trace completes — fast and stateless but misses rare events.' },
      { term: 'Tail Sampling', definition: 'A sampling strategy where a stateful collector buffers complete traces and makes the sampling decision based on trace characteristics like errors or high latency.' },
      { term: 'Context Propagation', definition: 'The mechanism for passing trace context (trace ID, span ID, sampling flag) between services via HTTP headers or message metadata.' },
      { term: 'traceparent', definition: 'The W3C Trace Context standard HTTP header carrying trace ID, parent span ID, and trace flags — the modern standard for context propagation.' },
      { term: 'zPages', definition: 'A debug endpoint built into the OpenTelemetry Collector that exposes span counts, latency distributions, and errors for in-flight tracing data.' },
    ],
    pitfalls: [
      'Assuming tracing is configured correctly because the SDK is imported — the exporter endpoint may be wrong and spans are silently dropped.',
      'Using head sampling at 1% and then wondering why error traces are missing — errors are also sampled at 1%.',
      'Not forwarding trace headers through API gateways — AWS API Gateway does not automatically propagate X-Ray or W3C headers to Lambda by default.',
      'Setting the OTel Collector batch processor queue too small — under high load, spans are dropped when the queue fills.',
      'Mixing B3 and W3C trace context headers in the same system — services using different propagation formats cannot join the same trace.',
    ],
    keyQuestions: [
      {
        question: 'What is the difference between head sampling and tail sampling, and when should you use each?',
        answer: `Head sampling makes the trace-or-not decision at the very beginning of a request, before any spans are created downstream. The common implementation is probabilistic: flip a coin weighted at 1% or 10%. The decision is encoded in the traceflags byte of the traceparent header and propagated to all downstream services, which honor it without making their own decision. This is stateless, requires no buffering, and adds negligible latency.

The fundamental problem with head sampling is that it is blind to the eventual outcome of the trace. An error request that would have been invaluable for debugging has the same 1% chance of being captured as a successful request. Rare slow requests that represent the p99 latency you are trying to debug are almost never captured.

Tail sampling solves this by buffering spans from all requests in a collector, waiting for the trace to complete (or a timeout), and then making the sampling decision based on the complete trace: keep all traces with errors, keep all traces with latency above 500ms, sample 1% of everything else. This requires a stateful collector with memory proportional to the trace volume times the timeout window — typically gigabytes of memory for high-traffic services.

Use head sampling when storage cost is the primary constraint and you care about representative latency distributions. Use tail sampling when you need to capture all errors and outliers for debugging — which is almost always the right choice for production services where debugging is difficult.`
      },
      {
        question: 'How do you debug context propagation breaks in a microservices tracing setup?',
        answer: `Context propagation breaks leave a characteristic signature: the trace waterfall shows an upstream span completing, then a downstream span appearing with a completely different trace ID rather than as a child span of the upstream. In Jaeger, this looks like two separate traces that you know should be connected, with a timestamp gap between them.

The debugging process is methodical. Start at the service where the trace chain breaks — typically the downstream service that shows up as a new root span. Examine the incoming HTTP headers at that service and check whether traceparent (W3C) or X-B3-TraceId (Zipkin) is present. If the header is absent, the problem is the upstream service or an intermediary not forwarding it.

Common intermediaries that silently strip trace headers: AWS ALB (does not strip headers by default, but custom header forwarding rules can cause issues), AWS API Gateway (does not propagate custom headers to Lambda by default — you must configure integration request header mappings), message queue consumers (SQS, Kafka consumers must manually extract trace context from message attributes and recreate the span context), and service mesh sidecars (Envoy/Istio require explicit header propagation config).

The fix is to add explicit header forwarding at the break point. For SQS consumers, use OTel's propagator.extract() against message attributes. For API Gateway to Lambda, add mapping templates that forward the traceparent header. For custom HTTP clients, ensure the OTel instrumentation library is wrapping the HTTP client (not just the server side).`
      },
      {
        question: 'What are the most common reasons spans are generated by the application but never appear in Jaeger or Zipkin?',
        answer: `The most common reason is exporter endpoint misconfiguration. The OTel SDK generates spans in memory and exports them via gRPC (default port 4317) or HTTP (default port 4318) to an OTel Collector or directly to a backend. If the endpoint URL is wrong, points to localhost in a container (where there is no collector), or uses HTTP when the collector expects gRPC, spans are dropped. The exporter fails silently in most default configurations to avoid impacting application performance.

The second reason is batch processor queue saturation. The OTel SDK batches spans before exporting to reduce overhead. The batch processor has a maximum queue size (default 2048 spans). Under high load, if the exporter cannot drain the queue fast enough (slow collector, network latency, TLS handshake overhead), the queue fills and new spans are dropped. This shows up as a sudden plateau in span counts even as traffic increases.

The third reason is TLS certificate failure. If the collector endpoint uses TLS and the certificate is expired, self-signed without a trusted CA, or hostname-mismatched, the exporter will fail every connection attempt. Enable SDK debug logging (OTEL_LOG_LEVEL=debug) to see connection errors in the application logs.

To verify spans are being generated but not exported, use the zPages endpoint on the OTel Collector (/tracez) which shows span counts at each pipeline stage — if spans appear in received but not exported, the problem is in the exporter. If received count is zero, the problem is in the application SDK configuration.`
      },
    ],
    quickFire: [
      { q: 'Why are traces for error requests missing even though tracing is enabled with 5% sampling?', a: 'Head sampling at 5% samples errors at the same rate as successes — use tail sampling to capture all errors.' },
      { q: 'What HTTP header carries trace context in the W3C standard?', a: 'traceparent — carries version, trace ID, parent span ID, and trace flags.' },
      { q: 'What OTel Collector endpoint shows span counts and pipeline health?', a: '/tracez (zPages) — shows received, processed, and exported span counts with error breakdown.' },
      { q: 'What causes the OTel batch processor to drop spans?', a: 'Queue saturation — if the export rate is slower than the span generation rate, the queue fills and new spans are dropped.' },
      { q: 'Why does a message queue consumer start a new root trace instead of continuing the upstream trace?', a: 'The consumer did not extract the trace context from message attributes and create a child span — context propagation must be done manually for async messaging.' },
    ],
  },

  {
    id: 'ts-log-volume-explosion',
    title: 'Log Volume Explosion and Cost Runaway',
    icon: 'activity',
    color: '#06b6d4',
    questions: 6,
    description: 'Identify and eliminate runaway log volume that drives unexpected observability cost spikes.',
    visualizations: [],
    introduction: `## Overview
Log volume explosions are one of the most common causes of unexpected cloud cost spikes — and they are almost always avoidable. A single misconfigured service or a new code path logging at the wrong level can increase your observability bill by 10x in hours, and the problem compounds because most teams only notice when the monthly bill arrives.

The most common causes follow a predictable pattern. The first is deploying to production with DEBUG logging enabled. Debug log levels are designed for development: they log every function call, every database query parameter, every HTTP header. In production under load, a service that makes 1,000 requests per second with debug logging enabled can generate tens of thousands of log lines per second. A single misconfigured environment variable is all it takes.

The second cause is retry storms. When a downstream service is degraded, upstream services retry — and log each retry attempt. If service A retries 5 times on failure and calls service B which calls service C, a failure in service C generates O(N^2) log lines across the call chain. During an incident, this is exactly when your log volume spikes — making it harder to find the relevant error logs in the noise.

The third cause is verbose ORM or database query logging. ORMs like Hibernate, SQLAlchemy, and ActiveRecord have query logging modes that print the full SQL statement for every query. At query rates of hundreds per second, this is catastrophic for log volume. The logs are useful during development and essentially worthless in production.

The fourth cause is health check logging. Load balancers and Kubernetes probes typically send health check requests every 5-30 seconds. If the application logs these at INFO level, that is 2-12 log lines per minute per pod from health checks alone — negligible for one pod, significant for hundreds.

The cost impact is real and large. CloudWatch Logs charges $0.50 per GB ingested. A service generating 100GB per day of logs costs $50/day or $1,500/month from that one service. Datadog log management uses a similar pricing model. The fix is always the same in structure: reduce at the source, then filter at the pipeline.

Source reduction means implementing a dynamic log level API — an HTTP endpoint that changes the log level without restarting the service. Pair this with sampling for high-volume low-value logs: log 1% of successful health check responses, log 100% of 5xx responses. Log routing sends DEBUG logs to cheap cold storage (S3 via Firehose at $0.08/GB) while sending ERROR logs to expensive indexed storage (CloudWatch Logs, Datadog).`,
    whenToUse: [
      'Investigating an unexpected spike in CloudWatch Logs or Datadog log management costs',
      'Diagnosing why a deployed service is generating more log volume than expected',
      'Designing a log pipeline that balances observability with cost at scale',
      'Explaining log sampling strategies that preserve signal while reducing volume',
      'Setting up dynamic log level control for production services',
    ],
    keyConcepts: [
      { term: 'Dynamic Log Level', definition: 'An HTTP endpoint or configuration mechanism that changes the log verbosity of a running service without restart, enabling DEBUG mode for specific investigations without a deployment cycle.' },
      { term: 'Log Sampling', definition: 'Emitting only a fraction of log lines of a specific type — for example, logging 1% of successful health check responses — to reduce volume while preserving statistical visibility.' },
      { term: 'Log Routing', definition: 'Directing log lines to different storage backends based on level or pattern — DEBUG to cheap cold storage, ERROR to indexed hot storage — to optimize cost vs. query speed.' },
      { term: 'Fluent Bit', definition: 'A lightweight log processor and forwarder that can filter, transform, and route log streams using rewrite_tag and filter_grep plugins.' },
      { term: 'Log Ingestion Cost', definition: 'The per-GB fee for writing logs to a managed service — CloudWatch Logs charges $0.50/GB ingested, with additional charges for storage and queries.' },
    ],
    pitfalls: [
      'Deploying with DEBUG log level enabled via an environment variable that was not reset from a development deployment.',
      'Not logging health check requests to /dev/null or filtering them at the agent level — they add constant background volume.',
      'Enabling ORM query logging in production — full SQL with parameters at every request rate is extremely high volume.',
      'Not setting up log volume dashboards and alerts — cost spikes go undetected until the monthly bill.',
      'Routing all logs to the same high-cost indexed storage regardless of level — most DEBUG logs are never queried in production.',
    ],
    keyQuestions: [
      {
        question: 'How do you identify which log group or service is responsible for a log volume spike?',
        answer: `In CloudWatch, navigate to CloudWatch Logs → Log Groups and sort by IncomingBytes or IncomingLogEvents for the time period in question. The top offenders are immediately visible. Click into the log group and examine log streams sorted by last event time to find which instances or pods are generating the most data.

In Datadog, use the Log Management → Patterns view which automatically clusters similar log lines and shows volume counts per pattern. This immediately highlights the single log line type that represents 90% of the volume — often something like "Processing request to /health" repeated millions of times.

Once you identify the log group and service, examine recent deployments to that service in the same timeframe. A configuration change, new code path, or changed environment variable almost always explains a sudden spike. If the spike is gradual rather than sudden, look for a growing process — an increasing number of pods, increasing traffic, or an ORM query count growing with data size.

After identifying the source, add a CloudWatch alarm on IncomingBytes for that log group with a threshold at 2x the baseline — this catches future spikes within minutes rather than at end of month.`
      },
      {
        question: 'How do you implement log routing to reduce cost while preserving full ERROR log visibility?',
        answer: `Log routing sends different log levels to different storage backends based on cost and query requirements. The typical configuration is: ERROR and WARN logs go to CloudWatch Logs or Datadog for full-text search and alerting, INFO logs go to S3 via Kinesis Firehose for cost-efficient storage with Athena for occasional queries, and DEBUG logs are either dropped entirely or sent to a short-retention (1 day) S3 prefix.

The implementation uses Fluent Bit or the OpenTelemetry Collector as the log processing layer between the application and storage backends. In Fluent Bit, use rewrite_tag to create separate streams based on the log level field, then route each stream to its destination. A filter_grep plugin can suppress specific patterns like health check endpoints before routing.

The cost impact is significant. At $0.50/GB for CloudWatch ingestion vs $0.023/GB for S3 storage, routing INFO logs from CloudWatch to S3 reduces the per-GB cost by 95%. For a service generating 50GB/day of INFO logs, this saves roughly $700/month from ingestion costs alone. Athena queries on S3 data cost $5/TB scanned — for occasional queries into INFO logs, this is far cheaper than indexed log management pricing.

The operational tradeoff is that S3-stored logs require a query step (Athena) rather than instant full-text search. Ensure your team understands which logs are in which backend before an incident — this is not the time to discover that the relevant log line is in S3 rather than CloudWatch.`
      },
      {
        question: 'What is a dynamic log level API and how does it work in practice?',
        answer: `A dynamic log level API is an HTTP endpoint on the service that changes the minimum log level for the running process without requiring a restart or redeployment. The most common implementation is a simple POST endpoint that updates the global logger configuration at runtime.

In a Node.js service using Winston or Pino, this is a few lines: expose a POST /admin/log-level endpoint, parse the requested level from the request body, and call logger.level = newLevel. In a Java service using Logback, the Spring Boot Actuator's /actuator/loggers endpoint provides this out of the box — a POST to /actuator/loggers/com.example.myservice with body {"configuredLevel": "DEBUG"} enables debug logging for that package namespace without touching others.

The operational pattern is: under normal operations, INFO is the production log level. When investigating a specific issue, a developer or SRE calls the endpoint to raise the level to DEBUG for the affected service, investigates, then returns to INFO. This avoids the log volume explosion of permanent DEBUG logging while making detailed logs available on demand.

Combine the dynamic level API with a timer: automatically revert to INFO after 30 minutes unless explicitly extended. This prevents the "someone forgot to turn off DEBUG" scenario that causes log volume spikes. Add the endpoint to your runbooks as the first step in diagnosing complex issues in production.`
      },
    ],
    quickFire: [
      { q: 'What is the CloudWatch Logs ingestion cost per GB?', a: '$0.50 per GB ingested.' },
      { q: 'What is the fastest way to identify the top log volume contributor in CloudWatch?', a: 'Sort log groups by IncomingBytes in the CloudWatch Logs console for the relevant time period.' },
      { q: 'Why does a retry storm multiply log volume?', a: 'Each retry attempt is logged separately — a 5x retry chain creates 5x the log lines, and nested retries multiply further.' },
      { q: 'What Fluent Bit plugin routes logs by level to different backends?', a: 'rewrite_tag — creates separate tagged streams by log level, each routable to a different output plugin.' },
      { q: 'How do you prevent health check logs from inflating production log volume?', a: 'Filter them at the log agent (Fluent Bit filter_grep) or suppress them at the application framework level for the health check path.' },
    ],
  },

  {
    id: 'ts-rds-replication-lag',
    title: 'RDS Read Replica Replication Lag',
    icon: 'database',
    color: '#8b5cf6',
    questions: 6,
    description: 'Diagnose and reduce replication lag on RDS read replicas to ensure data freshness for reads.',
    visualizations: [],
    introduction: `## Overview
RDS read replica replication lag is a measure of how far behind the replica is from the primary database, expressed in seconds. It is one of the most important metrics for applications that rely on read replicas for query offloading — because a lagging replica serves stale data, which can cause user-visible inconsistencies and subtle application bugs.

The fundamental cause of replication lag is the difference in throughput between the primary and the replica's ability to apply changes. MySQL replication is asynchronous: the primary writes binlog events and the replica applies them independently. By default in older MySQL versions, replication is single-threaded — the replica's SQL thread applies events from the binlog one at a time, serially. If the primary executes a large bulk INSERT that takes 60 seconds, the replica also takes approximately 60 seconds to apply it — and during those 60 seconds, every subsequent write on the primary queues up behind the bulk operation on the replica. Lag spikes dramatically.

This is the most common cause of RDS replica lag: a large transaction or schema change on the primary. A single ALTER TABLE on a 100-million-row table with default MySQL settings can cause 10-30 minutes of replication lag during the copy phase, and every write during that period falls further behind. The fix for schema changes is to use online schema change tools that do the copy in small chunks: pt-online-schema-change (Percona Toolkit) or gh-ost (GitHub Online Schema Change) for MySQL, and CREATE INDEX CONCURRENTLY for PostgreSQL.

The monitoring baseline is the CloudWatch ReplicaLag metric on the replica instance, measured in seconds. What constitutes "acceptable" lag depends entirely on the use case: for reporting and analytics queries, seconds or even minutes of lag is fine. For read-your-writes consistency — where a user writes data and immediately reads it back — any lag greater than zero can cause the user to see stale state.

For read-your-writes consistency without reading from primary for everything, the pattern is: after a write, store the write timestamp in the session or cache. When routing a subsequent read, check the replica's ReplicaLag. If lag is less than the time since the write, route to replica. Otherwise, route to primary. This keeps primary read traffic low while ensuring consistency.

Parallel replication reduces steady-state lag on multi-table workloads. MySQL 5.7+ supports multi-threaded slave replication with slave_parallel_workers and slave_parallel_type=LOGICAL_CLOCK — this parallelizes apply of transactions that were committed in the same binlog group on the primary, providing meaningful throughput gains on workloads with multiple independent tables being written concurrently.`,
    whenToUse: [
      'Diagnosing why read replicas are serving stale data inconsistently',
      'Explaining the impact of large transactions and ALTER TABLE on replica lag',
      'Designing read-your-writes consistency patterns using RDS replicas',
      'Choosing between pt-online-schema-change and gh-ost for zero-downtime schema changes',
      'Configuring parallel replication to reduce steady-state replication lag',
    ],
    keyConcepts: [
      { term: 'ReplicaLag', definition: 'CloudWatch metric on RDS read replicas measuring the time in seconds between the latest transaction applied on the primary and the latest transaction applied on the replica.' },
      { term: 'Parallel Replication', definition: 'A MySQL and PostgreSQL feature that allows the replica to apply binlog events from multiple threads simultaneously, reducing lag on multi-table write workloads.' },
      { term: 'pt-online-schema-change', definition: 'A Percona Toolkit utility that executes MySQL schema changes by copying the table in chunks with triggers to sync concurrent writes, avoiding long table locks.' },
      { term: 'gh-ost', definition: 'GitHub Online Schema Change — uses binlog streaming instead of triggers to sync a shadow table during schema migrations, creating lower load on the primary than pt-osc.' },
      { term: 'Read-Your-Writes Consistency', definition: 'A consistency guarantee ensuring that after a user writes data, their subsequent reads always reflect that write — requires careful routing when using read replicas.' },
    ],
    pitfalls: [
      'Running ALTER TABLE directly on a large RDS production table — this takes an exclusive lock and causes minutes to hours of replication lag on replicas.',
      'Routing all reads to a replica without checking ReplicaLag — stale reads cause subtle application bugs that are hard to reproduce.',
      'Assuming parallel replication is the fix for lag caused by large single transactions — parallelism helps multi-table workloads but a single large transaction is still serial.',
      'Not monitoring ReplicaLag with a CloudWatch alarm — lag spikes go unnoticed until users report data inconsistencies.',
      'Using replicas for reads immediately after writes without a read-your-writes consistency strategy — users see their own writes disappear.',
    ],
    keyQuestions: [
      {
        question: 'Why does a single large transaction cause a replica lag spike, and what is the correct fix?',
        answer: `MySQL and PostgreSQL replication both replay transactions as a unit. When the primary executes a large bulk INSERT or UPDATE — say, inserting 10 million rows in a single transaction — the replica must apply the entire transaction before it can move to the next event in the binlog. During this apply time, all subsequent binlog events queue up, and the ReplicaLag metric grows at the rate of incoming writes times the time the large transaction takes.

The fundamental issue is that the replica must do the same work as the primary, but cannot start the next operation until the current one completes. If the primary took 120 seconds for the bulk INSERT and 500 more transactions arrived during those 120 seconds, the replica is 120+ seconds behind when it finishes the INSERT and must then catch up while the primary continues to generate new events.

The correct fix depends on the operation type. For schema changes, use pt-online-schema-change or gh-ost — both tools break the migration into small chunks (default 1,000 rows per chunk), each chunk is a small transaction that replicates quickly, and lag remains near zero throughout the migration. For application-level bulk operations (data migrations, batch imports), break them into smaller transactions with sleep intervals between chunks. A 10-million-row insert done as 10,000 transactions of 1,000 rows each, with 10ms sleep between transactions, replicates with near-zero lag and completes in roughly the same wall-clock time.`
      },
      {
        question: 'How do you implement read-your-writes consistency when using RDS read replicas?',
        answer: `Read-your-writes consistency means that after a user submits a write, their next read always sees that write reflected — even if the read is routed to a replica that might be lagging. Violating this guarantee causes users to see their own actions "disappear" — they submit a form, the page reloads showing the old data, and they think their action failed.

The simplest implementation is a sticky primary window: after any write, record the write timestamp in the user's session (Redis or cookie). For the next N seconds (where N is your maximum acceptable replica lag, typically 5-10 seconds), route all reads from that session to the primary. After the window expires, route back to replicas. This requires no knowledge of actual replication lag but sacrifices replica offloading for a window after every write.

A more precise implementation reads the actual replication lag. After a write, record the write timestamp in the session. When routing a subsequent read, call the CloudWatch GetMetricStatistics API or query the replica's ReplicaLag from a monitoring system. If lag < (now - writeTimestamp), the write has replicated and you can route to the replica. If lag >= (now - writeTimestamp), route to primary.

A third approach uses MySQL's WAIT_UNTIL_SQL_THREAD_AFTER_GTIDS() function — after a write on the primary, the application calls this on the replica with the GTID of the write, and the call blocks until the replica has applied that specific transaction. This provides precise per-write consistency at the cost of a blocking call on the replica.`
      },
      {
        question: 'What is the difference between pt-online-schema-change and gh-ost, and when should you use each?',
        answer: `pt-online-schema-change (pt-osc) works by creating a shadow table with the new schema, copying existing data in chunks using INSERT INTO new_table SELECT FROM old_table with LIMIT, and creating triggers on the old table to sync concurrent writes to the shadow table. At the end, it renames the shadow table to the original name atomically. The triggers add 5-20% write overhead to the primary during the migration.

gh-ost (GitHub Online Schema Change) replaces triggers with binlog streaming. It connects to the MySQL binlog as a replica, reads DML events in real time, and applies them to the shadow table. It also controls its own copy rate by watching replica lag and backing off if lag increases — making it self-throttling. Because it uses binlog reading instead of triggers, the write overhead on the primary is lower (typically 2-5%). gh-ost also has a safer cut-over mechanism using lock/rename and can be paused and resumed.

Use pt-osc when: the table is smaller (under 50GB), the write rate is low, and you want simplicity — pt-osc has been production-proven for longer and has simpler debugging. Use gh-ost when: the table is large (50GB+), the write rate is high, you need the self-throttling based on replica lag, or you have had trigger-related issues with pt-osc. gh-ost's cut-over is also safer on tables with foreign keys in some configurations. GitHub runs gh-ost on their largest MySQL tables (>1TB) in production.`
      },
    ],
    quickFire: [
      { q: 'What CloudWatch metric measures RDS read replica lag?', a: 'ReplicaLag — measured in seconds on the replica instance.' },
      { q: 'Why does ALTER TABLE cause replication lag on replicas?', a: 'The replica must replay the full ALTER TABLE operation serially before processing any subsequent events, queuing all writes behind it.' },
      { q: 'What MySQL setting enables parallel replication?', a: 'slave_parallel_workers (MySQL 5.7+) with slave_parallel_type=LOGICAL_CLOCK.' },
      { q: 'What tool does GitHub use for zero-downtime MySQL schema changes?', a: 'gh-ost — uses binlog streaming instead of triggers to sync the shadow table during migration.' },
      { q: 'What is the simplest read-your-writes consistency strategy?', a: 'Route all reads to primary for N seconds after a write (sticky primary window), then revert to replica routing.' },
    ],
  },

  {
    id: 'ts-deadlocks',
    title: 'Database Deadlock Diagnosis',
    icon: 'database',
    color: '#8b5cf6',
    questions: 6,
    description: 'Detect, interpret, and eliminate database deadlocks in PostgreSQL and MySQL production systems.',
    visualizations: [],
    introduction: `## Overview
A deadlock occurs when two or more database transactions each hold a lock that the other needs to proceed, creating a circular dependency that neither can break without external intervention. The database engine detects this cycle and resolves it by aborting one of the transactions — the "victim" — allowing the other to complete. The aborted transaction receives an error and must be retried by the application.

PostgreSQL's deadlock detection runs every deadlock_timeout milliseconds (default 1 second). When two transactions have been waiting longer than this threshold, the engine checks for circular lock dependencies. When a deadlock is detected, PostgreSQL aborts the transaction with the lower cost estimate (typically the one that has done less work) and logs the event at ERROR level with a detailed DETAIL section showing exactly which processes were waiting for which locks.

The most common deadlock pattern in web applications is two concurrent transactions updating the same rows in different order. Transaction A acquires a row lock on user record 1, then tries to lock order record 1. Transaction B acquires a row lock on order record 1, then tries to lock user record 1. Both are now waiting for each other — a classic deadlock. The fix is straightforward: enforce a consistent lock acquisition order in application code. If transactions always lock user records before order records, this deadlock cannot occur.

Reading PostgreSQL deadlock logs requires understanding the format. The ERROR line names the process number. The DETAIL section lists two or more wait relationships: "Process X waits for ShareLock on transaction Y; blocked by process Z." Reading this as a graph, you can trace the circular dependency. The HINT line typically suggests the fix: "See server log for query details."

MySQL uses a different diagnostic path. The command SHOW ENGINE INNODB STATUS outputs a large block of text that includes a LATEST DETECTED DEADLOCK section near the top. This section shows the SQL statements from both transactions and the locks each held and was waiting for. Enabling innodb_print_all_deadlocks (MySQL 5.6.15+) writes every deadlock to the error log, making it persistent across restarts for post-incident analysis.

Beyond consistent lock ordering, the other key mitigation is reducing transaction scope. Long-running transactions hold locks for their duration, dramatically increasing the window for deadlock. Any transaction that acquires locks and then makes a network call (HTTP request, queue send) is a deadlock waiting to happen — the lock is held for the duration of the network call latency. Extract external calls from transactions: acquire locks, make database changes, commit, then make the external call.`,
    whenToUse: [
      'Diagnosing sporadic transaction rollback errors in production with message "deadlock detected"',
      'Explaining the lock acquisition order fix to prevent recurring deadlocks',
      'Reading and interpreting PostgreSQL deadlock error logs or MySQL INNODB STATUS',
      'Designing transaction boundaries to minimize deadlock probability',
      'Choosing between SELECT FOR UPDATE, NOWAIT, and SKIP LOCKED for concurrent row processing',
    ],
    keyConcepts: [
      { term: 'Deadlock', definition: 'A circular lock dependency between two or more transactions where each holds a lock the other needs, requiring the database to abort one transaction to break the cycle.' },
      { term: 'deadlock_timeout', definition: 'PostgreSQL configuration parameter (default 1s) controlling how long a transaction waits before the engine checks for deadlock cycles.' },
      { term: 'Lock Acquisition Order', definition: 'The principle that all transactions must acquire locks on the same resources in the same order, eliminating the possibility of circular wait conditions.' },
      { term: 'NOWAIT', definition: 'A SELECT FOR UPDATE modifier that causes the query to immediately fail with an error rather than blocking if the requested lock is held by another transaction.' },
      { term: 'SKIP LOCKED', definition: 'A SELECT FOR UPDATE modifier that causes the query to skip rows that are currently locked by other transactions, useful for queue-style processing patterns.' },
    ],
    pitfalls: [
      'Acquiring locks inside transactions in application-code-dependent order (e.g., by user input or query result order) rather than a consistent canonical order like ascending primary key.',
      'Holding database locks across external network calls — locks held for 500ms+ during HTTP calls dramatically increase deadlock probability.',
      'Not enabling innodb_print_all_deadlocks (MySQL) or not checking pg_stat_activity for lock waits — deadlocks become invisible without persistent logging.',
      'Retrying transactions on deadlock without exponential backoff — immediate retries can recreate the deadlock immediately.',
      'Using table-level locks to prevent deadlocks — this eliminates concurrency, which is worse than the occasional deadlock.',
    ],
    keyQuestions: [
      {
        question: 'How do you read a PostgreSQL deadlock log entry to identify the root cause?',
        answer: `PostgreSQL logs deadlock events at ERROR level with a structured format. The key information is in the DETAIL section, which lists the circular wait chain as a series of process wait relationships.

A typical log entry looks like: ERROR: deadlock detected. DETAIL: Process 12345 waits for ShareLock on transaction 67890; blocked by process 11111. Process 11111 waits for ShareLock on transaction 12345; blocked by process 12345. HINT: See server log for query details.

To interpret this, draw the wait graph: Process 12345 → waiting for Process 11111's lock → Process 11111 → waiting for Process 12345's lock. The cycle is the deadlock. The HINT line directs you to the query detail log entries for both process IDs, which show the exact SQL statements and which rows were locked.

With log_lock_waits = on and deadlock_timeout set appropriately, PostgreSQL also logs the lock waits leading up to the deadlock, which shows you the sequence of lock acquisitions. Cross-reference the SQL statements with your application code to find the transaction that acquires locks in an inconsistent order — this is almost always the root cause. Then enforce consistent ordering: if two transactions touch both table A and table B, both must lock table A before table B, always.`
      },
      {
        question: 'What is the difference between SELECT FOR UPDATE, NOWAIT, and SKIP LOCKED, and when should you use each?',
        answer: `SELECT FOR UPDATE acquires an exclusive row-level lock on the selected rows, preventing other transactions from modifying or locking those rows until the current transaction commits. The standard behavior is to block and wait if another transaction holds a conflicting lock — the waiting transaction queues until the lock is released or a deadlock is detected.

SELECT FOR UPDATE NOWAIT changes the behavior to fail immediately with an error (ERROR: could not obtain lock on row in relation) if the requested lock is held by another transaction. This is useful when you want to detect contention rather than wait for it, giving the application the opportunity to retry with exponential backoff or show a "please try again" message rather than stacking up blocked transactions. NOWAIT is appropriate for user-facing operations where latency matters and contention is rare but not impossible.

SELECT FOR UPDATE SKIP LOCKED skips rows that are currently locked rather than blocking or failing. Rows that are locked by another transaction are simply not returned in the result set. This is the correct pattern for job queue implementations: multiple workers query for available jobs with SKIP LOCKED — each worker sees only unlocked rows, so they naturally distribute work without contention. Workers do not deadlock with each other because they never compete for the same rows.

Use plain FOR UPDATE when correctness requires that no other transaction can modify the row during processing. Use NOWAIT when detecting contention quickly is more important than waiting for the lock. Use SKIP LOCKED for queue-style concurrent processing where any available row is acceptable.`
      },
      {
        question: 'What is the canonical application-code fix for deadlocks caused by row lock ordering?',
        answer: `The canonical fix is to enforce a consistent, canonical lock acquisition order in application code, specifically by sorting the rows to be locked by their primary key before acquiring locks.

Consider a payments service that transfers money between accounts. Transaction T1 transfers from account 100 to account 200: it locks account 100, then account 200. Transaction T2 transfers from account 200 to account 100: it locks account 200, then account 100. These two transactions deadlock because they acquire the locks in opposite order.

The fix: before starting any transfer transaction, sort the accounts by ID ascending and always acquire locks in that order. For a transfer from account 100 to 200, lock 100 first, then 200. For a transfer from account 200 to 100, still lock 100 first (the lower ID), then 200. Now both transactions acquire locks in the same order and cannot deadlock.

In SQL: SELECT id FROM accounts WHERE id IN (100, 200) ORDER BY id FOR UPDATE. This single query acquires both locks in ascending ID order regardless of which direction the transfer is flowing. The ORDER BY id is load-bearing — without it, the database may return rows in any order, and the application might process them in different sequences on different executions.

Combine this with a reduced transaction scope: execute the SELECT FOR UPDATE, do the arithmetic and validation, execute the UPDATE statements, and commit — all without making any network calls between the lock acquisition and the commit. If you need to send a notification after the transfer, do it after the transaction has committed.`
      },
    ],
    quickFire: [
      { q: 'Which transaction does PostgreSQL abort when resolving a deadlock?', a: 'The transaction with the lower cost estimate — typically the one that has done less work.' },
      { q: 'What MySQL command shows the most recent deadlock with full SQL and lock details?', a: 'SHOW ENGINE INNODB STATUS — look for the LATEST DETECTED DEADLOCK section.' },
      { q: 'How do you prevent deadlocks from row lock ordering in application code?', a: 'Always acquire locks in a consistent canonical order — typically ascending primary key — regardless of business logic direction.' },
      { q: 'What SELECT FOR UPDATE modifier skips locked rows instead of blocking?', a: 'SKIP LOCKED — used for queue-style processing where any available row is acceptable.' },
      { q: 'Why should you avoid holding database locks across network calls?', a: 'Network call latency (50-500ms) extends lock hold time dramatically, increasing the probability that another transaction conflicts and a deadlock forms.' },
    ],
  },

  {
    id: 'ts-database-migrations-prod',
    title: 'Database Migrations in Production',
    icon: 'database',
    color: '#8b5cf6',
    questions: 6,
    description: 'Execute zero-downtime database schema changes safely in production PostgreSQL and MySQL systems.',
    visualizations: [],
    introduction: `## Overview
Database migrations are one of the highest-risk operations in production engineering. A naive ALTER TABLE on a large table can take an exclusive lock for minutes or hours, blocking all reads and writes and causing a complete service outage. Understanding how databases execute DDL and which operations are safe at what scale is essential for running migrations without downtime.

PostgreSQL uses an access control system based on lock modes for DDL operations. Most DDL operations — ALTER TABLE ADD COLUMN with a default, ALTER TABLE SET NOT NULL, and CREATE INDEX — require an AccessExclusiveLock, which conflicts with every other lock type including SELECT statements. On a table with 100 million rows, a migration that requires scanning the full table (backfilling a default, validating a NOT NULL constraint, building an index) can hold this lock for 10-30 minutes, preventing any reads or writes on that table for the entire duration.

The solution is the expand-contract pattern, which breaks a migration into multiple phases coordinated with application deployments. The sequence for adding a NOT NULL column with a default value safely is: first, add the column as nullable with no default — this is instantaneous because PostgreSQL only needs to update the table catalog, not the actual rows. Second, deploy application code that writes to both the old and new column (or at minimum writes the new column). Third, backfill the new column for existing rows in batches with sleep intervals between batches to avoid I/O saturation. Fourth, add the NOT NULL constraint using ALTER TABLE table ALTER COLUMN col SET NOT NULL VALIDATE — in PostgreSQL 12+, you can first validate the constraint in a non-locking way using ALTER TABLE table ADD CONSTRAINT col_not_null CHECK (col IS NOT NULL) NOT VALID followed by ALTER TABLE table VALIDATE CONSTRAINT col_not_null, which only takes a ShareUpdateExclusiveLock. Fifth, deploy code reading from the new column. Sixth, drop the old column.

PostgreSQL's CREATE INDEX CONCURRENTLY builds an index without holding a table lock. It does this in three phases: first pass scans the table and builds the initial index while blocking only write operations to the index; subsequent passes scan for changes since the first pass; finally, the index is marked valid. The trade-off is that CONCURRENTLY takes longer (2-3x a normal index build) and can fail partway through, leaving an INVALID index that must be dropped and rebuilt. Always verify with SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'your_index_name' and ensure the index is not marked INVALID after the build.

For MySQL, the gh-ost and pt-online-schema-change tools implement online schema changes by creating a shadow table, copying data in batches, syncing concurrent writes, and performing an atomic rename at the end. These tools make virtually any MySQL schema change safe for production regardless of table size.

Every migration should have a rollback plan before it runs. The simplest rollback plan is to verify that the application code can function correctly without the migration having run — if you are adding a column that the code optionally uses, rolling back is straightforward. If the migration is not reversible (dropping a column, removing a unique constraint), you need a point-in-time backup immediately before the migration and a tested restore procedure.`,
    whenToUse: [
      'Planning a schema change on a large production table without taking downtime',
      'Explaining the expand-contract migration pattern for zero-downtime schema evolution',
      'Choosing between pg_repack, pt-osc, and gh-ost for online schema changes',
      'Diagnosing why an ALTER TABLE is blocking production reads and writes',
      'Designing the backfill phase of a multi-phase migration safely',
    ],
    keyConcepts: [
      { term: 'AccessExclusiveLock', definition: 'PostgreSQL lock mode required by most DDL operations that conflicts with all other lock types, blocking reads and writes on the target table for the migration duration.' },
      { term: 'Expand-Contract Pattern', definition: 'A zero-downtime migration strategy that adds new schema elements (expand), migrates data and code, then removes old schema elements (contract) across multiple coordinated deployments.' },
      { term: 'CREATE INDEX CONCURRENTLY', definition: 'A PostgreSQL DDL command that builds an index without holding a table lock, allowing reads and writes to continue — at the cost of longer build time and the possibility of leaving an INVALID index.' },
      { term: 'NOT VALID Constraint', definition: 'A PostgreSQL constraint option that adds a constraint to the catalog without scanning existing rows, followed by VALIDATE CONSTRAINT to check existing rows under a lower-impact lock.' },
      { term: 'Backfill', definition: 'The process of populating a new column with computed values for existing rows, done in batches with sleep intervals to avoid I/O saturation and replication lag.' },
    ],
    pitfalls: [
      'Running ALTER TABLE ADD COLUMN col TEXT NOT NULL DEFAULT \'value\' on a large table — in PostgreSQL <11, this rewrites the entire table; in PG11+, it is fast but you still need care with constraints.',
      'Not having a rollback plan before running a migration — migrations that remove columns or change types are very difficult to reverse without a backup.',
      'Running CREATE INDEX without CONCURRENTLY on a production table — acquires a lock that blocks all writes for the index build duration.',
      'Backfilling in a single large UPDATE statement — this creates a huge transaction, causes replication lag, and locks many rows for an extended period.',
      'Forgetting to check for INVALID indexes after CREATE INDEX CONCURRENTLY fails — the invalid index consumes space and can cause confusion.',
    ],
    keyQuestions: [
      {
        question: 'Walk through the safe zero-downtime migration sequence for adding a NOT NULL column with a default to a 500-million-row PostgreSQL table.',
        answer: `Phase 1 — Schema change (fast, non-blocking): ALTER TABLE orders ADD COLUMN status_v2 TEXT. This adds the column as nullable with no default. In PostgreSQL 11+, this is instantaneous — it updates only the catalog, not the table rows. A default value can be added if you set it as a constant, but NOT NULL with a constant default in PG11+ is also instant because PG stores the default separately.

Phase 2 — Deploy application code that writes both old and new column. The code must continue writing the old column (for backward compatibility if a rollback is needed) and also write the new column with its value. This phase runs with the new column nullable, so all existing rows remain valid.

Phase 3 — Backfill existing rows in batches. Use a loop that updates chunks of rows by primary key range: UPDATE orders SET status_v2 = derive_status(old_column) WHERE id BETWEEN batch_start AND batch_end AND status_v2 IS NULL. Use batches of 1,000-10,000 rows with a 10-50ms sleep between batches. Monitor replica lag and slow down or pause if lag exceeds your threshold.

Phase 4 — Add NOT NULL constraint non-locking. First: ALTER TABLE orders ADD CONSTRAINT orders_status_v2_not_null CHECK (status_v2 IS NOT NULL) NOT VALID. This is instant — does not scan existing rows. Second: ALTER TABLE orders VALIDATE CONSTRAINT orders_status_v2_not_null. This scans the table for violating rows but only takes a ShareUpdateExclusiveLock, allowing reads and writes to continue (it only blocks other DDL). When this completes without error, the backfill is verified complete.

Phase 5 — Deploy code reading the new column. Phase 6 — Drop the old column after confirming no reads reference it.`
      },
      {
        question: 'What happens when CREATE INDEX CONCURRENTLY fails partway through, and how do you recover?',
        answer: `When CREATE INDEX CONCURRENTLY fails — due to a unique constraint violation, timeout, cancellation, or crash — it leaves an INVALID index in the catalog. The INVALID index has a real presence in pg_indexes and pg_class, consumes disk space proportional to how far the build progressed, and will not be used by the query planner. However, it does not prevent reads or writes on the table.

To detect invalid indexes: SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE tablename = 'your_table' followed by checking pg_index: SELECT indexname FROM pg_index JOIN pg_class ON pg_index.indexrelid = pg_class.oid WHERE pg_class.relname = 'your_index_name' AND NOT pg_index.indisvalid. An invalid index will show indisvalid = false.

Recovery requires dropping the invalid index and rebuilding: DROP INDEX CONCURRENTLY invalid_index_name. The DROP INDEX CONCURRENTLY is also non-blocking. After dropping, investigate the failure cause (a unique violation means duplicate data in the column — fix the data before rebuilding; a timeout means the build window was too long and you should run it during lower-traffic periods or increase statement_timeout for the session).

Then rebuild: CREATE INDEX CONCURRENTLY new_index_name ON your_table (column). Monitor pg_stat_progress_create_index (PostgreSQL 12+) to watch progress: SELECT phase, blocks_done, blocks_total, tuples_done FROM pg_stat_progress_create_index. The three phases are initializing, scanning table, and building index. The third phase is typically the longest.`
      },
      {
        question: 'How do you safely backfill a large column in PostgreSQL without causing replication lag or I/O saturation?',
        answer: `A safe backfill processes rows in small batches with explicit sleep intervals between batches, using a primary key range iteration rather than OFFSET pagination. OFFSET-based pagination becomes progressively slower as OFFSET increases because PostgreSQL must scan all preceding rows — at 100-million-row scale, high-OFFSET queries take minutes. Primary key range iteration avoids this entirely.

The batch pattern: find the minimum and maximum primary key values. Iterate from min to max in increments of your batch size (typically 1,000-10,000 rows). Execute UPDATE table SET new_column = compute(old_column) WHERE id BETWEEN batch_start AND batch_end AND new_column IS NULL. Sleep for 10-50ms between batches. Check replica lag after each batch — if lag exceeds your threshold, sleep longer or pause.

The AND new_column IS NULL predicate is important: it makes the backfill idempotent. If the job is interrupted and restarted, it skips already-processed rows without duplicating work. It also limits the lock scope to rows that still need updating, reducing conflict with application writes.

The sleep interval is calibrated based on your replication lag tolerance and I/O headroom. Start with 50ms sleep for batches of 1,000 rows and monitor CloudWatch EBS VolumeWriteOps and the RDS ReplicaLag metric. If lag stays below 1 second and IOPS are below 80% of provisioned, you can reduce the sleep or increase batch size. If lag is growing, increase the sleep.

Run the backfill from an application-level job or a database-side DO block with pg_sleep, never from a single long-running UPDATE statement. A single UPDATE on 500 million rows creates a transaction that holds row locks for hours and generates a replication event that takes hours to replay on replicas.`
      },
    ],
    quickFire: [
      { q: 'What PostgreSQL lock does ALTER TABLE usually acquire and what does it block?', a: 'AccessExclusiveLock — blocks all reads and writes on the table for the duration of the DDL operation.' },
      { q: 'How do you add a NOT NULL constraint to a large table without blocking reads?', a: 'ADD CONSTRAINT ... CHECK (...) NOT VALID (instant), then VALIDATE CONSTRAINT (ShareUpdateExclusiveLock, allows reads/writes).' },
      { q: 'What is the risk of CREATE INDEX CONCURRENTLY failing?', a: 'It leaves an INVALID index that must be dropped with DROP INDEX CONCURRENTLY and rebuilt.' },
      { q: 'Why should backfills iterate by primary key range rather than OFFSET?', a: 'OFFSET pagination scans all preceding rows and becomes progressively slower — primary key range iteration stays constant time.' },
      { q: 'What is the expand-contract pattern?', a: 'A multi-phase migration: add new schema (expand), migrate data and code, then remove old schema (contract), spread across multiple deployments.' },
    ],
  },

  {
    id: 'ts-cpu-runaway-process',
    title: 'CPU Runaway Process Investigation',
    icon: 'trendingUp',
    color: '#ef4444',
    questions: 6,
    description: 'Identify and fix runaway CPU consumers using profiling tools across Python, JVM, Go, and Node.js.',
    visualizations: [],
    introduction: `## Overview
A CPU runaway process is one that consumes CPU resources far beyond what is expected for its workload — often pinning one or more cores at 100% utilization, degrading co-located services, and eventually triggering OOM kills or instance failures. Unlike memory leaks, CPU runaways are often intermittent and triggered by specific input patterns, making them harder to reproduce in development.

The first step is identification. The top command (or htop for a more visual interface) shows per-process CPU usage updated every 2 seconds. Sort by CPU with the P key. The ps aux --sort=-%cpu | head -20 command gives a point-in-time snapshot suitable for logging or scripting. In Kubernetes, kubectl top pods and kubectl top pods --containers break down CPU usage at pod and container level respectively. In CloudWatch, the CloudWatch agent can ship per-process metrics using the procstat configuration, allowing you to build dashboards and alarms on CPU usage for specific processes by name or PID file.

CPU profiling — sampling what the process is actually doing when it consumes CPU — is the key diagnostic step. Different languages have different profiling tools. For Python, py-spy is a sampling profiler that attaches to a running Python process without modifying the code or restarting: py-spy top --pid 12345 shows a live top-like view of the hottest Python functions. For JVM applications, async-profiler samples the native call stack (not just Java code) and captures both CPU-bound and wall-clock time accurately — java -jar async-profiler.jar -d 30 -f profile.html $(pgrep java) generates a flame graph. For Go, pprof is built in — if the service imports net/http/pprof, you can fetch http://localhost:6060/debug/pprof/profile?seconds=30 and analyze the resulting profile with go tool pprof. For Node.js, the v8 profiler via --prof flag or Chrome DevTools protocol via --inspect can generate CPU profiles.

Common causes follow patterns. An infinite loop (recursive function without a correct base case, or an event loop that feeds itself) pegs one CPU core at 100% immediately. Hot lock contention manifests as many threads spinning in tight loops waiting for a mutex — identifiable in the profiler as high time spent in synchronization primitives. Catastrophic regex backtracking is a common culprit in web applications: a regex like (a+)+ applied to a carefully crafted input string causes exponential time complexity and pins the CPU. JSON parsing or serialization of very large objects in a hot path can also cause CPU spikes.

Container CPU throttling adds an important dimension in Kubernetes. The Linux CFS (Completely Fair Scheduler) enforces CPU limits using a quota mechanism: if a container's cpu.cfs_quota_us is set (which it is when you specify resources.limits.cpu), the container is throttled when it exhausts its quota in a period, even if the host has idle CPUs. A container with a 0.5 CPU limit can be throttled while the host runs at 10% utilization. Check container_cpu_cfs_throttled_seconds_total in Prometheus or cat /sys/fs/cgroup/cpu/cpu.stat inside the container.`,
    whenToUse: [
      'Diagnosing a process pinning CPU at 100% with no obvious cause',
      'Profiling a Python, JVM, Go, or Node.js service to identify CPU hotspots',
      'Explaining why a container is slow despite the host having available CPU (CFS throttling)',
      'Investigating catastrophic regex backtracking or N+1 queries causing CPU spikes',
      'Setting up CloudWatch or Prometheus alarms for per-process CPU usage',
    ],
    keyConcepts: [
      { term: 'CPU Flame Graph', definition: 'A visualization of profiler samples showing which code paths consume CPU — width represents time spent, and the call stack is shown bottom-up, making hotspots immediately visible.' },
      { term: 'CFS Throttling', definition: 'Linux kernel enforcement of CPU limits in containers — when a container exhausts its CFS quota in a scheduling period, it is throttled even if the host has idle CPUs.' },
      { term: 'Catastrophic Backtracking', definition: 'A regex execution failure mode where ambiguous alternation or repetition patterns cause exponential time complexity on certain inputs, pinning the CPU.' },
      { term: 'py-spy', definition: 'A sampling profiler for Python that attaches to a running process without code modification or restart, showing live CPU usage by function.' },
      { term: 'async-profiler', definition: 'A low-overhead sampling profiler for JVM applications that captures native stack traces accurately for both CPU and wall-clock time analysis.' },
    ],
    pitfalls: [
      'Profiling only Java stack traces with jstack instead of native stack — JVM CPU profiling with async-profiler or similar tools captures GC and JIT compilation overhead that jstack misses.',
      'Increasing CPU limits to fix CFS throttling without profiling — you may be masking a real CPU regression rather than fixing a misconfigured limit.',
      'Not considering lock contention as a CPU cause — threads spinning on a contested mutex appear CPU-busy but the actual problem is the lock design.',
      'Running production profiling at too high a frequency (every 1ms) — profiler overhead becomes significant; 10ms sampling frequency is usually sufficient.',
      'Diagnosing regex catastrophic backtracking only after an incident — use regex complexity analysis in code review to catch exponential-time patterns before deployment.',
    ],
    keyQuestions: [
      {
        question: 'How do you profile a running Java application for CPU hotspots without restarting it?',
        answer: `async-profiler is the tool of choice for profiling running JVM applications in production. It uses AsyncGetCallTrace — a JVM API designed for accurate CPU profiling — combined with Linux perf_events for native stack sampling. This captures the full picture: Java code, JVM internals (GC, JIT compilation), and native library calls.

To attach to a running process: download async-profiler, then run java -jar profiler.jar -d 30 -e cpu -f flamegraph.html $(pgrep -f myapp). The -d 30 flag profiles for 30 seconds, -e cpu samples CPU usage, and -f flamegraph.html generates an interactive SVG flame graph. The process continues running normally during profiling — async-profiler overhead is typically 1-3% CPU.

The flame graph output shows all CPU samples stacked by call chain. Look for wide blocks near the top of the flame graph — these represent functions where significant CPU time is spent. A function that is 50% of all samples wide is your primary hotspot. Click into it to see the full call chain from the top-level entry point.

For intermittent CPU spikes, use continuous profiling: async-profiler can run in a loop or use JFR (Java Flight Recorder) for low-overhead always-on profiling. JFR is built into OpenJDK 11+ and can be started without restart if -XX:+UnlockCommercialFeatures was set, or using jcmd: jcmd $(pgrep java) JFR.start duration=60s filename=recording.jfr.`
      },
      {
        question: 'What is CFS throttling in Kubernetes and how do you diagnose whether it is affecting your service?',
        answer: `CFS (Completely Fair Scheduler) throttling is the Linux kernel mechanism that enforces CPU limits on containers. When you set resources.limits.cpu in a Kubernetes pod spec, the kubelet translates this to cgroup parameters: cpu.cfs_quota_us (how many microseconds of CPU time the container can use per period) and cpu.cfs_period_us (the length of the period, default 100ms). If a container uses its entire quota before the period ends, the kernel suspends all its threads until the next period begins.

The key insight is that CFS throttling can happen even when the host has abundant idle CPUs. A container with a 0.5 CPU limit gets 50ms of CPU time per 100ms period. If it needs 70ms in one period (a burst), it is throttled for 20ms — even if the host is at 5% overall utilization. This manifests as latency spikes and request timeouts that seem random and are not correlated with overall host CPU usage.

Diagnosis using Prometheus: query container_cpu_cfs_throttled_periods_total / container_cpu_cfs_periods_total for your pod. A value above 25% indicates significant throttling. This metric is collected by cAdvisor (which runs as part of the kubelet on every node) and is available in most Kubernetes monitoring setups.

Diagnosis at the OS level: exec into the container with kubectl exec -it pod -- bash, then cat /sys/fs/cgroup/cpu/cpu.stat. The throttled_time field (in nanoseconds) shows total throttled time since container start. Watch it over time with watch -n 1 'cat /sys/fs/cgroup/cpu/cpu.stat'.

The fix is to increase the CPU limit — but first profile the application to confirm the CPU usage is legitimate (not a regression or bug). If the usage is legitimate, raise the limit. If it is a regression, fix the code.`
      },
      {
        question: 'How do you identify and fix catastrophic regex backtracking?',
        answer: `Catastrophic backtracking occurs when a regex engine uses a backtracking algorithm (most traditional NFA-based engines, including Python re, Java java.util.regex, and Node.js built-in regex) and encounters a pattern with ambiguous alternation or nested quantifiers applied to inputs where no match is found.

The canonical dangerous pattern is (a+)+ applied to a string like aaaaab. The engine tries every way to partition the a's across the nested group repetitions, and when the final b causes a mismatch, it backtracks through an exponential number of combinations. On a string of 30 a's followed by a non-matching character, this can take minutes.

Detection in code review: flag any regex containing nested quantifiers ((x+)+, (x*)*), alternation inside quantifiers ((a|b)+), or groups with multiple ways to match the same string. Tools like safe-regex (npm), vuln-regex-detector (Python), and RegexBuddy's complexity analysis can automatically identify problematic patterns.

Detection in production: a CPU spike that correlates with specific request inputs, specifically inputs that are long strings of repetitive characters. py-spy top will show the Python regex module consuming 99% CPU with a stack trace pointing to the specific regex.

Fixes: rewrite the regex to eliminate ambiguity (use possessive quantifiers like a++ if your engine supports them, or atomic groups), switch to a linear-time regex engine (RE2, Rust's regex crate, hyperscan), add input length limits before applying the regex, or replace the regex with a state machine for the specific parsing task. Google's RE2 library guarantees O(n) matching time for all inputs and is available for Python (google-re2), Java (com.google.re2j), Go (built-in regexp), and Node.js (re2 npm package).`
      },
    ],
    quickFire: [
      { q: 'What command shows the top CPU-consuming processes on Linux with a live view?', a: 'htop (or top with P to sort by CPU) — or ps aux --sort=-%cpu | head -20 for a point-in-time snapshot.' },
      { q: 'What profiler attaches to a running Python process without code changes?', a: 'py-spy — run py-spy top --pid <PID> for a live view or py-spy record for a flame graph.' },
      { q: 'How do you check if a container is being CPU-throttled by CFS?', a: 'Check container_cpu_cfs_throttled_periods_total / container_cpu_cfs_periods_total in Prometheus, or cat /sys/fs/cgroup/cpu/cpu.stat inside the container.' },
      { q: 'What regex pattern structure causes catastrophic backtracking?', a: 'Nested quantifiers like (a+)+ or alternation inside repetition like (a|ab)* — these create exponential backtracking paths on non-matching inputs.' },
      { q: 'What Go tool fetches a CPU profile from a running pprof-enabled service?', a: 'go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30 — then use web or top commands in the pprof shell.' },
    ],
  },

  {
    id: 'ts-disk-iops-saturation',
    title: 'Disk IOPS Saturation',
    icon: 'trendingUp',
    color: '#ef4444',
    questions: 6,
    description: 'Diagnose and resolve disk IOPS bottlenecks on EBS volumes and database instances under load.',
    visualizations: [],
    introduction: `## Overview
Disk IOPS saturation occurs when the storage layer cannot service read and write requests as fast as the application generates them, creating a queue of pending I/O operations. The visible symptoms are high I/O wait in the CPU stats (the wa column in top), slow query times in databases, and elevated disk latency that manifests as application timeouts. Unlike CPU saturation, which users often experience as high latency only, disk I/O saturation can cause cascading failures as write buffers fill and threads block waiting for I/O completion.

The most useful tool for diagnosing disk saturation is iostat -x 1, which outputs per-device I/O statistics every second. The key metrics are: await (average time in milliseconds that I/O requests wait before being serviced — high values indicate saturation), svctm (deprecated but often still shown — average service time per I/O), %util (percentage of time the device is busy — values consistently above 80-90% indicate saturation), and r/s and w/s (read and write I/O operations per second).

AWS EBS volume performance varies significantly by volume type and configuration. gp2 volumes use a credit-based burst model: baseline is 3 IOPS per GB (a 100GB volume gets 300 IOPS baseline), with burst to 3,000 IOPS while credits are available. gp3 volumes have a fixed baseline of 3,000 IOPS regardless of size, with configurable throughput up to 1,000 MB/s. IOPS can be provisioned up to 16,000 at an additional cost on gp3. io2 volumes offer up to 64,000 IOPS with consistent sub-millisecond latency — designed for I/O-intensive databases like Oracle, SQL Server, and high-transaction-rate PostgreSQL.

Understanding I/O patterns is critical for selecting the right storage configuration. OLTP workloads (web application databases, API backends) generate random I/O — small reads and writes scattered across the volume. These workloads are IOPS-bound: they need high IOPS with low latency per operation. Analytical and reporting workloads generate sequential I/O — reading large contiguous ranges of data. These are throughput-bound: they need high MB/s, and IOPS count is less important.

Database tuning can reduce effective IOPS requirements substantially. Connection pooling prevents each application thread from opening its own database connection, reducing the number of concurrent I/O paths. Write-ahead log (WAL) configuration in PostgreSQL — specifically synchronous_commit = off for non-critical writes, wal_compression = on, and checkpoint_completion_target = 0.9 — can reduce write I/O significantly. Read replicas distribute read I/O across multiple volumes, reducing IOPS pressure on the primary. Query optimization that eliminates full table scans (adding appropriate indexes) converts random multi-page I/O into single-page lookups.

RDS storage autoscaling prevents write failures from disk full conditions. Enable it with a maximum allocation that is 3-4x the current allocation, and ensure the free storage CloudWatch alarm fires at 20% free to give time for autoscaling to complete before hitting the limit.`,
    whenToUse: [
      'Diagnosing slow database queries that correlate with high disk await times',
      'Explaining the difference between gp2 burst IOPS and gp3 provisioned IOPS',
      'Investigating why RDS instance CPU is low but queries are slow (storage bottleneck)',
      'Choosing the right EBS volume type for a specific database workload profile',
      'Designing a storage architecture that distributes I/O across read replicas',
    ],
    keyConcepts: [
      { term: 'IOPS', definition: 'Input/Output Operations Per Second — the number of read or write operations a storage device can service per second; the primary capacity metric for random I/O workloads.' },
      { term: 'await', definition: 'The average time in milliseconds that I/O requests spend waiting in the device queue plus the service time — the key saturation indicator in iostat output.' },
      { term: 'BurstBalance', definition: 'CloudWatch metric for gp2 EBS volumes tracking remaining IOPS burst credits as a percentage — when it reaches 0, the volume is throttled to the baseline rate.' },
      { term: 'gp3', definition: 'The current-generation AWS general-purpose SSD EBS volume type with a fixed 3,000 IOPS baseline (not credit-based like gp2), configurable to 16,000 IOPS independently of volume size.' },
      { term: 'I/O Wait', definition: 'The percentage of time CPU cores are idle waiting for pending I/O operations to complete — shown as the wa column in top; consistently above 20-30% indicates I/O saturation.' },
    ],
    pitfalls: [
      'Using gp2 volumes for database workloads and not monitoring BurstBalance — burst credits can deplete silently, throttling the database to 300-600 IOPS without any obvious error.',
      'Diagnosing slow queries as a database performance issue without checking iostat first — many "database problems" are actually storage problems.',
      'Provisioning IOPS on the RDS instance but not the storage volume — the bottleneck moves to wherever the limit is lower.',
      'Not enabling RDS storage autoscaling — a disk-full condition causes immediate write failures and is preventable.',
      'Assuming SSD means unlimited I/O performance — EBS SSD volumes still have hard IOPS limits that are easy to exceed under load.',
    ],
    keyQuestions: [
      {
        question: 'How do you diagnose disk I/O saturation on a Linux server and identify the bottleneck?',
        answer: `The diagnosis follows a layered approach moving from symptoms to root cause. Start with the CPU I/O wait metric in top — the wa column shows the percentage of CPU time spent idle waiting for I/O. Values consistently above 20% suggest I/O saturation. Note that a single-CPU system with 80% I/O wait is more concerning than a 64-CPU system with 20% I/O wait — normalize by the number of CPUs and workload type.

Move to iostat -x 1 for device-level detail. Run it for at least 30 seconds and look at multiple samples. The await column is the most important: normal values for NVMe SSDs are 0.1-0.5ms, for EBS gp3 are 0.5-2ms, and for magnetic storage are 5-20ms. Values significantly above these baselines indicate either saturation or a storage performance issue. The %util column reaching 100% means the device is always busy and requests are queuing.

Identify which process is generating the I/O with iotop -o (shows only processes with active I/O) or lsof -n -p $(pgrep myprocess) | grep /var/lib to see which files a specific process has open.

In AWS, correlate with CloudWatch EBS metrics: VolumeReadOps and VolumeWriteOps show the actual IOPS, VolumeQueueLength shows the number of I/O requests waiting (values above 1 sustained indicate saturation), and VolumeReadBytes plus VolumeWriteBytes show throughput. For gp2 volumes, check BurstBalance — when it hits 0, the volume is being throttled to its baseline rate, which is often far below what the workload requires.`
      },
      {
        question: 'When should you use gp3 vs io2 EBS volumes for a database workload?',
        answer: `The decision hinges on the IOPS requirement, latency sensitivity, and throughput needs of the specific database workload.

gp3 is the right choice for most web application databases and development environments. It provides a fixed 3,000 IOPS baseline — no burst credits to manage — with configurable IOPS up to 16,000 and throughput up to 1,000 MB/s, all independently adjustable from volume size. A 100GB gp3 volume can be provisioned with 10,000 IOPS without changing its size, which was impossible with gp2. gp3 is cost-effective: the base cost is $0.08/GB/month with additional cost for provisioned IOPS above 3,000. For PostgreSQL, MySQL, and MongoDB instances handling up to ~5,000 queries per second with moderate data sizes, gp3 with provisioned IOPS covers the requirement at reasonable cost.

io2 is appropriate for high-throughput databases with sustained IOPS requirements above 16,000, where consistent sub-millisecond latency is critical, or where multi-attach capability is needed (io2 volumes can be attached to multiple instances simultaneously, which is required for some clustered database configurations). Oracle RAC, high-transaction-rate SQL Server, and large PostgreSQL instances handling financial workloads are typical io2 use cases. io2 Block Express offers up to 256,000 IOPS and 4,000 MB/s throughput at substantially higher cost ($0.125/GB/month plus $0.065/provisioned IOPS/month above 32,000).

The practical decision process: start with gp3 and provision IOPS based on your peak workload measurement (VolumeReadOps + VolumeWriteOps at peak). If you consistently saturate 16,000 IOPS or require latency guarantees below 1ms, move to io2. Migrating from gp3 to io2 is a live volume modification in AWS — no downtime required.`
      },
      {
        question: 'How does PostgreSQL WAL configuration affect disk IOPS and what settings reduce write I/O?',
        answer: `PostgreSQL's write-ahead log is a sequential log of all database changes. Before any modification is written to the actual data files, the change is first written to the WAL. This ensures durability: if the server crashes, WAL records are replayed to reconstruct the committed state. The WAL is the primary source of write I/O on a PostgreSQL primary.

synchronous_commit controls when the server acknowledges a transaction to the client. With the default synchronous_commit = on, PostgreSQL waits for the WAL record to be flushed to disk before returning success. Each commit triggers a synchronous write — an I/O operation that must complete before the transaction is considered durable. Setting synchronous_commit = off allows PostgreSQL to acknowledge the transaction immediately and flush the WAL asynchronously (up to 200ms later with the default wal_writer_delay). This can reduce write IOPS by 50-90% for high-commit-rate workloads. The risk: a crash during the 200ms window can lose the most recent transactions — acceptable for non-critical data like sessions and analytics, unacceptable for financial transactions.

wal_compression = on (PostgreSQL 9.5+) compresses WAL records using LZ4 or zstd (PG 15+). This reduces both WAL write volume (fewer bytes written per transaction) and WAL replication bandwidth. The CPU cost for compression is typically under 5% and is well worth the I/O savings on write-heavy workloads with compressible data.

checkpoint_completion_target = 0.9 (default is 0.5 in older versions) tells PostgreSQL to spread the dirty buffer writes of a checkpoint over 90% of the checkpoint interval rather than front-loading them. This smooths the write I/O pattern — avoiding periodic I/O spikes caused by intensive checkpointing — at the cost of keeping dirty buffers in memory slightly longer.`
      },
    ],
    quickFire: [
      { q: 'What iostat column indicates disk saturation?', a: 'await — high values (much above baseline for the storage type) indicate requests are queuing; %util near 100% confirms the device is fully utilized.' },
      { q: 'What happens to a gp2 EBS volume when BurstBalance reaches 0?', a: 'The volume is throttled to its baseline IOPS rate (3 IOPS per GB provisioned), which for a 100GB volume is only 300 IOPS.' },
      { q: 'What is the maximum provisioned IOPS for a gp3 volume?', a: '16,000 IOPS, configurable independently of volume size.' },
      { q: 'What PostgreSQL setting reduces write IOPS at the cost of potential data loss on crash?', a: 'synchronous_commit = off — allows async WAL flushing, potentially losing up to 200ms of committed transactions on crash.' },
      { q: 'What is the difference between IOPS-bound and throughput-bound I/O workloads?', a: 'IOPS-bound workloads (OLTP, random I/O) need many small I/O operations per second; throughput-bound workloads (analytics, backups) need high MB/s for sequential data streaming.' },
    ],
  },

  {
    id: 'ts-network-bandwidth',
    title: 'Network Bandwidth Saturation',
    icon: 'trendingUp',
    color: '#ef4444',
    questions: 6,
    description: 'Detect and resolve network bandwidth saturation on EC2 instances and container workloads.',
    visualizations: [],
    introduction: `## Overview
Network bandwidth saturation occurs when a host, instance, or network path reaches its maximum capacity for data transfer, causing packet drops, increased latency, and connection timeouts. Unlike CPU and memory saturation, which are well-understood and closely monitored, network bandwidth limits are often invisible until they cause failures — because many monitoring setups track metrics rather than absolute bandwidth consumption.

EC2 instances have both baseline and burst network bandwidth limits that vary by instance type and size. A t3.medium has a baseline of 0.5 Gbps with burst to 5 Gbps. A c5.xlarge has a baseline of 10 Gbps with burst to 10 Gbps (no burst distinction on higher performance instances). Instances in the same family scale bandwidth with size: a c5.4xlarge has up to 10 Gbps, c5.9xlarge up to 12 Gbps, c5.18xlarge up to 25 Gbps. The c5n and m5n families (the "n" denotes network-optimized) offer 25 to 100 Gbps and are designed specifically for network-intensive workloads. Exceeding the baseline on a burstable instance depletes a network credit bucket — sustained high bandwidth that exhausts the bucket throttles to baseline.

Detection requires looking at both directions. CloudWatch NetworkOut and NetworkIn metrics for EC2 instances show bytes per period. Divide by the period length to get bytes per second and compare against the instance type's documented limit. The instance-level view does not show per-process breakdown, which is where sar -n DEV 1 and iftop come in. sar -n DEV 1 shows per-second per-interface bytes and packets — run for 60 seconds during a traffic spike. iftop (with sudo on most systems) shows real-time bandwidth by connection pair, making it immediately obvious if a single destination is consuming the bandwidth.

For per-process breakdown, nethogs groups network usage by process. It shows which processes are sending and receiving the most data, allowing you to identify whether the saturation is from a single application or distributed across many. In Kubernetes environments, the Weave, Cilium, or similar CNI plugins instrument network traffic at the pod level — check kubectl top pods if available, or use node-level iftop filtered by pod IP ranges.

VPC Flow Logs provide retrospective analysis of which IP pairs transferred the most data. Enable flow logs to CloudWatch Logs or S3, then query with Athena or CloudWatch Insights for top-N by bytes transferred: SELECT srcaddr, dstaddr, SUM(bytes) as total_bytes FROM flow_logs GROUP BY srcaddr, dstaddr ORDER BY total_bytes DESC LIMIT 20. This identifies unexpected data transfers — cross-region data copies, log shipping to unexpected destinations, or traffic amplification from large response payloads.

The fixes depend on the cause. If the saturation is from legitimate traffic that has outgrown the instance, upgrade to a network-optimized instance type or enable enhanced networking (ENA). If the saturation is from inefficient data transfer, compression reduces byte count: enabling HTTP gzip compression for API responses can reduce bandwidth by 60-80% for JSON payloads. Moving processing close to data (running transformations in the same AZ as the data source, using S3 Select to filter data server-side rather than downloading full objects) reduces transfer volume. Multipart uploads parallelize large object uploads without increasing per-connection bandwidth usage.`,
    whenToUse: [
      'Diagnosing intermittent connection timeouts that correlate with high network traffic',
      'Identifying which process or service is consuming disproportionate network bandwidth',
      'Explaining EC2 network baseline vs burst limits and when they cause throttling',
      'Using VPC Flow Logs to find unexpected data transfers between services',
      'Designing a content compression and data locality strategy to reduce bandwidth consumption',
    ],
    keyConcepts: [
      { term: 'EC2 Network Baseline', definition: 'The guaranteed minimum network bandwidth for an EC2 instance type — smaller instances can burst above this but are throttled back to baseline when network credits are exhausted.' },
      { term: 'Enhanced Networking', definition: 'An EC2 feature (enabled via the ENA adapter) that provides higher packet-per-second performance and lower latency for supported instance types.' },
      { term: 'VPC Flow Logs', definition: 'Per-ENI records of all IP traffic including source/destination IP, port, protocol, and byte count — used for security analysis and identifying top bandwidth consumers.' },
      { term: 'iftop', definition: 'A real-time network bandwidth monitor that shows data transfer rates by connection pair — useful for quickly identifying which remote hosts are consuming the most bandwidth.' },
      { term: 'Bandwidth Amplification', definition: 'When a small request triggers a disproportionately large response — for example, a query that returns megabytes of JSON where kilobytes would suffice — a common hidden cause of bandwidth saturation.' },
    ],
    pitfalls: [
      'Not checking the instance type network bandwidth limit when scaling up — upgrading from c5.xlarge to c5.4xlarge does not increase network bandwidth proportionally.',
      'Enabling flow logs but not querying them regularly — the data is only useful if you analyze it before and after incidents.',
      'Not compressing JSON API responses — HTTP gzip compression is a one-line change that reduces bandwidth by 60-80% for most API traffic.',
      'Running data-intensive batch jobs on application instances — isolate large data transfers to dedicated instances or use S3 direct transfer instead of routing through application hosts.',
      'Forgetting that cross-AZ traffic is metered — transferring data between AZs in the same region costs $0.01/GB each direction and is a common unexpected cost driver.',
    ],
    keyQuestions: [
      {
        question: 'How do you identify the root cause of network bandwidth saturation on an EC2 instance?',
        answer: `Start with the CloudWatch NetworkOut and NetworkIn metrics for the instance over the past hour. If you see values approaching the documented instance bandwidth limit, saturation is confirmed. Compare the absolute values against the instance type's network performance specification in the AWS documentation (search for "EC2 instance network bandwidth").

For real-time diagnosis on the instance, run sar -n DEV 1 30 to get per-interface bytes and packets per second for 30 samples. The eth0 interface (or the primary ENI interface, which may have a different name with enhanced networking) shows the aggregate. If the aggregate is near the limit, use iftop or nethogs to break down by connection or process.

iftop (sudo iftop -i eth0) shows a live view sorted by bandwidth consumption, grouped by connection pair. The display immediately reveals if a single destination (an S3 bucket in another region, a Kafka cluster, a backup target) is consuming the bandwidth. Hit the S key to sort by cumulative traffic rather than peak rate.

nethogs (sudo nethogs eth0) groups by process, showing which application is responsible. If your application server is sending 400 Mbps of data, nethogs will show you whether it is your web process, a log shipping daemon, or a background job.

Cross-reference the timing with recent deployments or scheduled jobs. A batch job that runs at 2 AM and saturates network until 4 AM is a candidate for S3 Transfer Acceleration or moving to a dedicated data transfer instance that does not share bandwidth with the production application.`
      },
      {
        question: 'How do VPC Flow Logs help diagnose bandwidth saturation and unexpected data transfers?',
        answer: `VPC Flow Logs capture metadata about every IP flow that passes through a network interface, including source address, destination address, source port, destination port, protocol, number of bytes transferred, number of packets, and whether the traffic was accepted or rejected. They are captured per-ENI (Elastic Network Interface) and can be sent to CloudWatch Logs or S3.

The power for bandwidth diagnosis comes from aggregation. Using CloudWatch Logs Insights, you can query: fields @timestamp, srcAddr, dstAddr, bytes | filter bytes > 1000000 | stats sum(bytes) as total_bytes by srcAddr, dstAddr | sort total_bytes desc | limit 20. This query shows the top 20 source-destination pairs by total bytes transferred, immediately identifying the heaviest data flows.

Common findings: cross-region data transfers that should be routed internally (application code using the public S3 endpoint instead of the VPC endpoint, resulting in internet-routed traffic at full cost and through a bandwidth-constrained path), NAT Gateway traffic for instances that could use VPC endpoints directly (NAT Gateway charges $0.045/GB and adds a bandwidth bottleneck), and backup or replication jobs that were scoped to run during low-traffic windows but have grown to overlap with peak hours.

For security-relevant findings, flow logs also show REJECT entries — traffic that was blocked by security groups or NACLs. A pattern of rejected traffic from unexpected source IPs can indicate a scan or connection attempt that is not yet causing incidents but is generating noise and consuming connection table entries.

Enable flow logs at the VPC level (not per-ENI) to capture all traffic with minimal configuration. Use S3 as the destination and partition logs by date for efficient Athena queries. Athena queries on S3 flow logs cost $5/TB scanned — run queries with date range filters to minimize scan cost.`
      },
      {
        question: 'What compression and data locality strategies most effectively reduce network bandwidth consumption?',
        answer: `HTTP response compression is the highest-leverage change for API-heavy services. Enable gzip or brotli compression for JSON, HTML, CSS, and JavaScript responses. Most frameworks support this with a single middleware addition — Express: app.use(compression()), FastAPI: add GZipMiddleware. JSON compresses at 70-85% for typical API responses, meaning 1GB of API traffic becomes 150-300MB. The CPU cost for compression at the server is trivial compared to the bandwidth savings, and decompression is fast on the client.

For internal service-to-service communication, protobuf or MessagePack serialization instead of JSON reduces payload size by 40-60% without adding compression overhead. This is particularly effective for high-frequency microservice calls where every byte matters.

S3 Select allows you to filter and transform S3 object data server-side before it is transferred to your application. Instead of downloading a 500MB CSV to filter 1,000 rows, S3 Select runs a SQL-like filter at S3 and returns only the matching rows. This can reduce data transfer by 99% for selective queries on large objects. Athena (and its Iceberg table format support) takes this further for analytical workloads — queries execute in-place on S3 data without moving it to an application instance.

Data locality means processing data in the same AZ where it lives, avoiding cross-AZ transfer costs ($0.01/GB each direction). For EKS workloads, use pod topology spread constraints or node affinity rules to co-locate compute with data sources. For batch processing, use EMR or Glue in the same AZ as the S3 bucket or RDS instance.

Content delivery optimization: serving static assets (images, videos, large files) from CloudFront instead of origin servers removes the bandwidth load from EC2 entirely. CloudFront's edge caching means most static asset requests never reach the origin, and CloudFront-to-client bandwidth is charged separately at lower rates than EC2 data transfer.`
      },
    ],
    quickFire: [
      { q: 'Which EC2 instance family provides up to 100 Gbps network bandwidth?', a: 'c5n and m5n (network-optimized instances) — the "n" suffix denotes enhanced network performance.' },
      { q: 'What Linux tool shows real-time network bandwidth grouped by connection pair?', a: 'iftop — shows source/destination pairs with bits per second in real time.' },
      { q: 'What Linux tool shows network bandwidth broken down by process?', a: 'nethogs — groups network usage by PID/process name.' },
      { q: 'What S3 feature reduces data transfer by filtering object content server-side?', a: 'S3 Select — runs SQL-like filter expressions at S3 and returns only matching data.' },
      { q: 'What is a common bandwidth amplification pattern in microservices?', a: 'Returning full JSON objects when only a few fields are needed — the client requests one field and receives megabytes of data.' },
    ],
  },

  {
    id: 'ts-gc-pauses',
    title: 'JVM Garbage Collection Pauses',
    icon: 'trendingUp',
    color: '#ef4444',
    questions: 6,
    description: 'Diagnose and reduce JVM GC pause times that cause latency spikes and health check failures.',
    visualizations: [],
    introduction: `## Overview
JVM garbage collection pauses are one of the most common causes of latency spikes in Java, Kotlin, and Scala services. During a Stop-The-World garbage collection pause, all application threads are suspended — the JVM literally stops the world to find and reclaim unreachable objects. From the caller's perspective, the service stops responding for the duration of the pause. This can trigger connection timeouts, health check failures, SLO violations, and cascading failures in upstream services.

Understanding GC algorithm selection is the foundation of GC tuning. The Parallel GC (-XX:+UseParallelGC) was the default in Java 8 and prioritizes throughput — it uses multiple threads for collection but still stops the world for all major collections. G1GC (-XX:+UseG1GC) became the default in Java 9 and is designed for low-latency balanced throughput — it divides the heap into regions, collects the most garbage-dense regions first (the "Garbage First" in the name), and targets a configurable pause time goal (-XX:MaxGCPauseMillis=200). ZGC (-XX:+UseZGC, available since Java 11, production-quality since Java 15) uses a concurrent, colored-pointer approach to achieve sub-millisecond pause times even on heaps of hundreds of gigabytes — it does almost all GC work concurrently with application threads. Shenandoah GC (from Red Hat, available in OpenJDK builds) also achieves concurrent compaction with low pause times, similar to ZGC in design goals but with different implementation trade-offs.

GC logging is the primary diagnostic tool. Enable it with -Xlog:gc*:file=/var/log/app/gc.log:time,uptime:filecount=5,filesize=20m — this writes GC events to a log file with timestamps, rolls after 20MB (keeping 5 files), and includes both minor and major GC events with pause durations. The GC log shows you exactly when pauses occurred, how long they lasted, how much memory was reclaimed, and which GC phase caused the pause.

GC log analysis tools make sense of the raw log data. GCEasy (gcease.io) accepts uploaded GC logs and produces visualizations of pause time distributions, heap utilization over time, and recommendations. GCViewer is an open-source desktop tool. Prometheus can expose JVM GC metrics via the JVM metrics library (Micrometer + jvm.gc.pause metric with cause tag).

Heap sizing profoundly impacts GC behavior. An undersized heap (too small -Xmx) causes frequent minor GCs that still complete quickly but increase GC overhead, and eventually triggers frequent major GCs as the old generation fills. An oversized heap (very large -Xmx) reduces GC frequency but makes each major GC pause proportionally longer (in old Parallel/Serial GC) and can cause very long single full GC pauses on a single garbage event. For G1GC, the target is to keep heap occupancy at 60-70% after each major GC — this leaves headroom for the next allocation wave before the next major GC cycle.

The most important rule for JVM services running in containers: always set -Xmx explicitly. Without an explicit -Xmx, the JVM may size the heap based on the host's memory rather than the container's memory limit (this was fixed in Java 10+ with container awareness, but older JVMs running in containers without the -XX:+UseContainerSupport flag will allocate heap based on host RAM and immediately get OOM killed by the container runtime when the heap exceeds the container limit).`,
    whenToUse: [
      'Diagnosing periodic latency spikes in a Java service that correlate with GC events',
      'Choosing between G1GC, ZGC, and Shenandoah for a specific latency and heap size requirement',
      'Analyzing GC logs to identify the phase causing long pause times',
      'Explaining JVM heap sizing for container environments to avoid OOM kills',
      'Setting up JVM GC metrics in Prometheus for continuous GC pause monitoring',
    ],
    keyConcepts: [
      { term: 'Stop-The-World Pause', definition: 'A GC event that suspends all application threads while the collector performs its work — the direct cause of latency spikes observed by callers.' },
      { term: 'G1GC', definition: 'The default JVM GC since Java 9 — divides heap into regions, collects highest-garbage regions first, and targets a configurable pause time goal.' },
      { term: 'ZGC', definition: 'A concurrent garbage collector (Java 15+ production) that achieves sub-millisecond pause times on heaps up to 16TB by performing most GC work concurrently with the application.' },
      { term: '-Xmx', definition: 'JVM flag setting the maximum heap size — must be set explicitly in containers to prevent the JVM from using host RAM as the reference for auto-sizing.' },
      { term: 'GCEasy', definition: 'A web-based GC log analyzer that parses JVM GC logs and produces pause time distributions, heap utilization charts, and tuning recommendations.' },
    ],
    pitfalls: [
      'Running a JVM in a container without -Xmx — the JVM sizes heap to 25% of host RAM (not container limit), leading to OOM kills when heap approaches the container memory limit.',
      'Setting -Xmx equal to the container memory limit — leaves no room for JVM native memory (code cache, metaspace, thread stacks), causing OOM even when heap is under limit.',
      'Using G1GC with a very large heap (>16GB) and default pause time goal — major GCs can still cause 1-5 second pauses on large heaps with a high garbage rate.',
      'Not enabling GC logging in production — GC pause events are invisible without logs, making latency spike diagnosis impossible.',
      'Tuning GC without profiling heap allocation — most GC problems come from too many short-lived large object allocations that can be fixed in application code.',
    ],
    keyQuestions: [
      {
        question: 'How do you enable and analyze GC logs to identify the cause of a latency spike?',
        answer: `Enable GC logging at JVM startup with the Unified Logging framework (Java 9+): -Xlog:gc*:file=/var/log/app/gc.log:time,uptime:filecount=5,filesize=20m. The gc* pattern captures all GC-related log tags. The time decorator adds wall-clock timestamps (critical for correlating with application latency spikes), and uptime adds JVM uptime. The filecount and filesize options implement log rotation to prevent the GC log from filling the disk.

A typical G1GC log entry for a pause looks like: [2026-06-24T14:23:01.234+0000][123456ms] GC(42) Pause Young (Normal) (G1 Evacuation Pause) 512M->256M(2048M) 45.123ms. Parsing this: the timestamp aligns with the latency spike, GC(42) is the GC event number, the pause type is Young (short, good) vs Mixed or Full (longer, bad), the memory line shows heap before -> after (total), and 45.123ms is the pause duration.

Correlate GC timestamps with your application monitoring. If you have Prometheus metrics with millisecond granularity, plot GC pause times alongside p99 latency and service error rate. Pauses that correlate with latency spikes confirm GC as the cause. A 45ms pause is significant but not catastrophic — a 3000ms Full GC pause will cause health check failures and connection timeouts.

Use GCEasy (upload the gc.log file to gcease.io) for automatic analysis. It identifies the longest pauses, classifies them by GC type, shows the heap utilization trend leading to each major GC, and provides specific tuning recommendations. The Longest Pause Duration chart is the most useful — look for outlier pauses that are 10x the typical pause time, which often indicate heap pressure events.`
      },
      {
        question: 'How should you size JVM heap for a containerized Java application to avoid both GC overhead and OOM kills?',
        answer: `The sizing calculation must account for all JVM memory consumers, not just the heap. Total JVM memory = heap (Xmx) + metaspace + code cache + thread stacks + direct buffers + JVM overhead. The non-heap components typically consume 200-500MB on a typical Spring Boot application.

The recommended formula: set -Xmx to 75% of the container memory limit. This leaves 25% for non-heap JVM memory and some headroom for allocation bursts. For a container with a 4GB memory limit, set -Xmx3g. For a 2GB limit, -Xmx1500m.

Do not set -Xms (initial heap) too high. A common antipattern is setting -Xms and -Xmx to the same value to avoid heap resizing. While this eliminates resizing overhead, it means the container immediately claims the full heap from the OS at startup. This reduces container density (multiple services on the same node all claiming their full heap upfront) and eliminates the ability for the JVM to return memory to the OS during low-load periods. Better: set -Xms to 50% of -Xmx and let the heap grow as needed.

For G1GC-specific tuning: set -XX:MaxGCPauseMillis=200 as the pause time goal. G1 will attempt to keep pauses under this target by adjusting region collection frequency and concurrency. For heaps above 4GB, reduce the region size from the default: -XX:G1HeapRegionSize=16m (default is auto-computed; 16MB is often better for larger heaps).

If you are using ZGC on Java 17+: set -Xmx generously. ZGC's concurrent nature means it benefits from extra headroom — the concurrent collector needs space to accommodate new allocations while concurrently collecting the old garbage. A ZGC application that would use 2GB with G1GC may need 3GB with ZGC, but pause times drop from 50-200ms to under 1ms.`
      },
      {
        question: 'When should you choose ZGC or Shenandoah over G1GC?',
        answer: `G1GC is the right default for most Java applications running in containers with heap sizes up to 8-16GB. It provides a good balance between throughput and latency, is well-understood, has extensive tooling support, and achieves pause times of 50-200ms on typical workloads — which is acceptable for most web services.

Switch to ZGC when your latency SLO is strict enough that even G1GC's 50-200ms pauses cause SLO violations. ZGC targets sub-millisecond pauses and typically achieves consistent pause times under 5ms even on 100GB heaps. It does this by performing almost all GC work concurrently — marking, relocation, and compaction happen while application threads run. The trade-off is slightly higher CPU overhead (3-5% more CPU usage than G1GC) and a requirement for more heap headroom (the concurrent collection needs space to accommodate allocation during GC). ZGC is ideal for: trading systems with strict p99 latency SLOs, interactive APIs where 200ms pauses create noticeable user impact, and services running on large heaps (16GB+) where G1GC major pauses become longer.

Shenandoah (available in Red Hat's OpenJDK builds and standard OpenJDK since Java 15) achieves similar goals to ZGC through a different mechanism — concurrent compaction using load barriers. Shenandoah tends to perform slightly better than ZGC on medium heap sizes (4-16GB) in throughput, while ZGC has the edge on very large heaps and at very high allocation rates. In practice, the choice between them for a new deployment is often based on availability in your JDK distribution and familiarity with tuning parameters.

The decision matrix: CPU-constrained service → G1GC (lowest overhead). Latency-sensitive with moderate heap → G1GC with tuned pause target. Latency-critical with any heap size → ZGC (Java 17 LTS is the recommended minimum). Very large heap (>16GB) + latency sensitive → ZGC with generational mode (Java 21+).`
      },
    ],
    quickFire: [
      { q: 'What JVM flag enables unified GC logging with timestamps?', a: '-Xlog:gc*:file=gc.log:time,uptime — the time decorator is essential for correlating GC events with application latency spikes.' },
      { q: 'What is the recommended -Xmx value relative to container memory limit?', a: '75% of the container memory limit — leaves room for non-heap JVM memory (metaspace, code cache, thread stacks).' },
      { q: 'What GC collector achieves sub-millisecond pause times?', a: 'ZGC (Java 15+ production) — performs marking, relocation, and compaction concurrently with application threads.' },
      { q: 'What G1GC flag sets the target maximum pause time?', a: '-XX:MaxGCPauseMillis=200 — G1 adjusts collection frequency to try to stay under this target.' },
      { q: 'What JVM flag must be set in containers to prevent heap auto-sizing from using host RAM?', a: '-Xmx with an explicit value — or ensure -XX:+UseContainerSupport is enabled (default Java 10+) so the JVM respects cgroup memory limits.' },
    ],
  },

  {
    id: 'ts-oomkilled-pods',
    title: 'OOMKilled Pod Diagnosis',
    icon: 'gitBranch',
    color: '#f59e0b',
    questions: 6,
    description: 'Diagnose OOMKilled container failures in Kubernetes using metrics, heap dumps, and memory profiling.',
    visualizations: [],
    introduction: `## Overview
OOMKilled (Out Of Memory Killed) is a Kubernetes pod termination state caused by the Linux kernel's OOM killer terminating a container that exceeded its memory limit. The pod exits with reason OOMKilled and exit code 137 (128 + SIGKILL). Understanding the distinction between the kernel's OOM killer and application-level out-of-memory errors is critical: the container process receives no warning, no graceful shutdown signal, and no opportunity to write error logs — the process simply stops, and Kubernetes restarts the pod.

The first diagnostic step is confirming the cause. kubectl describe pod pod-name shows the last and current container state. The Last State section reads: State: Terminated, Reason: OOMKilled, Exit Code: 137. This confirms the OOM kill. A different exit code (like 1 or 143) means the process crashed or was gracefully terminated, not OOM-killed.

Understanding the difference between memory limit and memory request is essential. The request (resources.requests.memory) is used by the Kubernetes scheduler to find a node with sufficient free memory — it is a reservation. The limit (resources.limits.memory) is enforced by the Linux kernel via cgroup memory.limit_in_bytes — the container is killed if it exceeds this. Setting the limit too close to the request (for example, request: 512Mi, limit: 512Mi) means any memory usage spike above 512Mi triggers an OOM kill. A safer approach is to set the limit 25-50% above the request to absorb spikes.

Kubernetes memory metrics show how close a container is running to its limit. kubectl top pod pod-name --containers shows current memory usage per container. The more useful metric for trend analysis is container_memory_working_set_bytes in Prometheus — this is the metric Kubernetes uses for eviction decisions and is the actual memory the container is using that cannot be freed without application action (as opposed to page cache which is reclaimable). A container running at 90% of its limit is OOM-kill-prone.

The causes of OOM kills fall into four categories. Memory leaks — the application allocates objects and never releases them, causing working set to grow monotonically over time until it hits the limit. This is the classic leak pattern and shows as a sawtooth or rising slope in memory time-series graphs, with OOM kills occurring at the same absolute memory value. Bulk data processing — the application loads a full dataset into memory (reading an entire CSV, unmarshaling a complete JSON document) rather than streaming it. This causes sudden memory spikes proportional to input size. Connection pool growth — database connections, gRPC channels, or HTTP clients accumulate over time without bounds on pool size. Each connection holds buffers and state. JVM native memory exceeding container limit — JVM heap (-Xmx) set correctly but the total JVM memory (heap + metaspace + code cache + thread stacks) exceeds the container limit.

For JVM applications, setting -Xmx to 75% of the container limit (as described in the GC pauses section) is essential, but this alone is not sufficient — add -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/heapdump.hprof to capture a heap dump on OOM. Analyze with Eclipse Memory Analyzer (MAT) or VisualVM to identify the object type holding the most retained heap.`,
    whenToUse: [
      'Diagnosing pods that restart repeatedly with OOMKilled status',
      'Distinguishing between memory leaks, bulk processing spikes, and misconfigured limits',
      'Setting memory requests and limits correctly to absorb spikes without frequent OOM kills',
      'Configuring JVM heap settings to prevent native memory from exceeding container limits',
      'Using heap dumps to identify the root cause of memory growth in JVM applications',
    ],
    keyConcepts: [
      { term: 'OOMKilled', definition: 'A Kubernetes pod termination state (exit code 137) caused by the Linux kernel OOM killer terminating a container that exceeded its cgroup memory limit.' },
      { term: 'container_memory_working_set_bytes', definition: 'The Prometheus metric used by Kubernetes for memory accounting and eviction decisions — represents memory that cannot be freed without application action, excluding reclaimable page cache.' },
      { term: 'Memory Limit', definition: 'The hard ceiling on container memory usage enforced by Linux cgroups — exceeding this limit triggers an immediate SIGKILL from the kernel OOM killer with no warning.' },
      { term: 'HeapDumpOnOutOfMemoryError', definition: 'JVM flag (-XX:+HeapDumpOnOutOfMemoryError) that causes the JVM to write a heap dump to disk when the application runs out of heap memory, enabling post-mortem analysis.' },
      { term: 'Memory Leak', definition: 'A pattern where allocated memory is not released after use, causing working set to grow monotonically until it hits the container limit, triggering repeated OOM kills at regular intervals.' },
    ],
    pitfalls: [
      'Setting memory limit equal to request — any spike beyond the exact request amount causes an OOM kill; limit should be 25-50% above request.',
      'Setting JVM -Xmx to the container memory limit — leaves no room for non-heap JVM memory, causing OOM kills even when heap is within target.',
      'Not configuring -XX:+HeapDumpOnOutOfMemoryError — losing the heap dump means post-mortem memory leak analysis is impossible.',
      'Confusing OOMKilled with application crashes — exit code 137 is SIGKILL (OOM), while application-level OOM throws an exception with exit code 1.',
      'Increasing limits without profiling the root cause — a memory leak will continue consuming memory until it hits the new limit, just more slowly.',
    ],
    keyQuestions: [
      {
        question: 'How do you distinguish between a memory leak and a legitimate memory spike causing OOM kills?',
        answer: `The distinction is in the memory growth pattern over time. A memory leak shows as monotonically increasing memory usage — a graph of container_memory_working_set_bytes slopes upward continuously with no plateau. The OOM kill occurs when the slope reaches the memory limit. After the pod restarts, the process starts from a low baseline and the slope repeats, creating a sawtooth pattern of rising memory followed by restart. The period between OOM kills may be consistent (the leak has a constant rate tied to traffic) or variable (the leak rate depends on specific operations that happen periodically).

A legitimate memory spike is characterized by sudden jumps in memory usage that correlate with specific events: a large file upload, a batch job starting, a burst of concurrent requests, or a deployment that brought in a new code path. The memory usage jumps and then may decrease as garbage is collected or data is processed. The OOM kill occurs at the peak of the spike, not at a consistent upper bound.

To confirm a leak: correlate memory growth with request rate. If memory grows linearly with requests (each request adds a constant delta to working set and never releases it), it is a leak. If memory is roughly proportional to current concurrent connections or request rate (uses memory while requests are active, frees when complete), it is likely legitimate usage under load.

For JVM applications, enable -XX:+HeapDumpOnOutOfMemoryError and analyze the heap dump with Eclipse MAT. The "Leak Suspects" report identifies object types with unexpectedly high retained heap percentages. A Map or List that holds references to other objects constitutes the classic leak — find what is holding the root reference and trace back to where in the code it is never released.`
      },
      {
        question: 'What is the correct approach to setting memory requests and limits in Kubernetes to handle both baseline and spike usage?',
        answer: `The request-to-limit ratio should be calibrated based on the variability of memory usage, not set to equal values. Start by establishing a baseline: monitor container_memory_working_set_bytes for a week under normal load. Note the typical baseline (P50), the P95 (handles most traffic spikes), and the absolute maximum observed (P99.9).

Set memory request to the P95 value of observed memory usage — this is what the scheduler uses for placement and what you need guaranteed. The Kubernetes scheduler ensures the node has at least this much free memory before scheduling the pod. Underscaling the request (setting it below P95) causes the pod to be evicted during node memory pressure when the actual usage exceeds what was promised.

Set memory limit to 150-200% of the memory request (1.5x to 2x). This gives headroom for spikes beyond P95 while still bounding the maximum a misbehaving pod can consume. A limit that is too close to the request (1.0x, 1.1x) causes OOM kills during normal spike events. A limit that is too high (5x, 10x) allows a memory leak to consume the node before being detected.

For stateless services under variable load, consider setting the request at 60-70% of the limit and accepting that some requests will cause memory-based scheduling decisions — this improves bin-packing efficiency on nodes. For stateful services or JVM applications with warm caches, set request higher (80-90% of limit) because the memory usage is more predictable.

After setting request and limit, add a Prometheus alert: (container_memory_working_set_bytes / container_spec_memory_limit_bytes) > 0.85 for 5 minutes. This fires when the container consistently uses more than 85% of its limit — early warning that an OOM kill is likely and adjustment is needed.`
      },
      {
        question: 'How do you configure a JVM containerized application to avoid OOM kills from native memory exceeding the container limit?',
        answer: `The total JVM memory footprint is the sum of several components that all count against the container memory limit: heap (Xmx), metaspace (class definitions, grows with number of loaded classes), code cache (compiled JIT code), thread stacks (one stack per thread, default 512KB-1MB each), and direct byte buffers (used by NIO, network I/O, and many libraries).

The calculation for a Spring Boot application: heap (Xmx) + metaspace (typically 100-300MB) + code cache (64-256MB) + thread stacks (num_threads * stack_size, often 100-200 threads * 256KB = 25-50MB) + overhead = total. For a 2GB container limit, a safe -Xmx is 1200-1400MB.

Specific JVM flags for container environments:

-Xmx[75% of container limit]: explicit heap max.
-XX:MaxMetaspaceSize=256m: caps metaspace growth to prevent runaway class loading.
-XX:ReservedCodeCacheSize=64m: limits JIT code cache if not many compiled methods are needed.
-Xss256k: reduces thread stack size from the default (512KB-1MB) to 256KB — valid for most non-recursive web applications.
-XX:+UseContainerSupport (Java 10+, default on): makes the JVM respect cgroup memory limits for auto-sizing.
-XX:MaxRAMPercentage=75.0: if you prefer a percentage-based -Xmx instead of a fixed value, this sets it to 75% of detected container RAM.

Enable heap dump on OOM: -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/heapdump.hprof. Mount an emptyDir or PVC at /tmp for the heap dump file — without this mount, the dump may fail if the root filesystem has insufficient space.

Monitor native memory with -XX:NativeMemoryTracking=summary and jcmd PID VM.native_memory summary — this shows the breakdown of JVM memory by category and helps identify which component is growing unexpectedly.`
      },
    ],
    quickFire: [
      { q: 'What exit code indicates a pod was OOMKilled by the kernel?', a: '137 — which is 128 + SIGKILL (signal 9), the signal sent by the kernel OOM killer.' },
      { q: 'What kubectl command shows the last termination reason for a pod\'s container?', a: 'kubectl describe pod pod-name — look for the Last State section showing Terminated: OOMKilled.' },
      { q: 'What Prometheus metric does Kubernetes use for memory accounting and eviction?', a: 'container_memory_working_set_bytes — represents non-reclaimable memory usage.' },
      { q: 'What JVM flag captures a heap dump when the application runs out of heap memory?', a: '-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/heapdump.hprof' },
      { q: 'What is the typical memory limit-to-request ratio recommendation to handle spikes without frequent OOM kills?', a: '1.5x to 2x — set limit at 150-200% of request to absorb spikes beyond P95 baseline.' },
    ],
  },

  {
    id: 'ts-service-not-reachable',
    title: 'Kubernetes Service Not Reachable',
    icon: 'gitBranch',
    color: '#f59e0b',
    questions: 6,
    description: 'Systematically debug Kubernetes Service connectivity failures using endpoints, selectors, and DNS.',
    visualizations: [],
    introduction: `## Overview
"Service not reachable" in Kubernetes covers a range of failure modes that share the same user-visible symptom — connection refused or connection timeout when trying to reach a service — but have very different root causes and fixes. Approaching this systematically with a layered diagnostic process is far more effective than random investigation.

The Kubernetes Service resource is a virtual IP (ClusterIP) with associated iptables or eBPF rules (managed by kube-proxy or Cilium) that forward traffic to pods matching the Service's selector. Several things must work correctly for a Service to route traffic: the Service selector must match at least one pod's labels, that pod must be in a Ready state (readiness probe passing), kube-proxy must be running and have programmed the iptables rules, and if NetworkPolicies are in use, they must allow the traffic.

The diagnostic order matters because later steps assume earlier ones pass. Start with the most basic: is the pod running and ready? kubectl get pods -l app=myapp -n mynamespace shows pods matching the selector. If no pods appear or all are not Ready, the issue is not the Service — it is the pods themselves. Look at pod events (kubectl describe pod pod-name) and logs (kubectl logs pod-name).

If pods are running and Ready, check whether the Service selector matches the pods. kubectl describe svc myservice -n mynamespace shows the selector. Then kubectl get pods -l app=myapp -n mynamespace using the same selector labels verifies that it matches the intended pods. A label typo — app=myApp vs app=myapp (case-sensitive) — is the single most common cause of empty endpoint lists.

The endpoints object is the critical intermediary. kubectl get endpoints myservice -n mynamespace shows the IPs and ports that the Service is actually routing to. If this shows none, either no pods match the selector, no pods are Ready, or no pods have the container port matching the Service's targetPort. An empty endpoint list means no traffic can reach any pod, regardless of how the Service is configured.

If endpoints are populated but traffic still fails, the problem is below the Service level: kube-proxy rules not synchronized (rare but possible after a kube-proxy restart), NetworkPolicy objects blocking traffic, or the pod process not actually listening on the configured port. Verify the pod is listening with kubectl exec -it pod-name -- ss -tlnp or netstat -tlnp.

DNS resolution is a separate layer. kubectl exec -it debug-pod -- nslookup myservice.mynamespace.svc.cluster.local tests whether CoreDNS can resolve the Service. If DNS fails but the ClusterIP works, CoreDNS is the problem. If both DNS and ClusterIP fail, the issue is kube-proxy or the pod layer.`,
    whenToUse: [
      'Diagnosing connection refused or connection timeout errors when calling a Kubernetes Service',
      'Explaining why kubectl get endpoints shows empty output for a Service',
      'Debugging selector mismatch between a Service and its target pods',
      'Investigating NetworkPolicy rules that may be blocking service-to-service traffic',
      'Troubleshooting CoreDNS resolution failures for Kubernetes service names',
    ],
    keyConcepts: [
      { term: 'Endpoints', definition: 'A Kubernetes object automatically maintained by the endpoints controller, listing the IP addresses and ports of pods that match a Service\'s selector and are in Ready state.' },
      { term: 'kube-proxy', definition: 'A per-node DaemonSet that watches Services and Endpoints and programs iptables or IPVS rules to forward traffic from ClusterIP to pod IPs.' },
      { term: 'Selector', definition: 'A label matcher on a Service that determines which pods receive traffic — it must exactly match pod labels (case-sensitive) for Endpoints to be populated.' },
      { term: 'NetworkPolicy', definition: 'A Kubernetes resource that restricts pod-to-pod and pod-to-external traffic by namespace, label selector, and port — when present, traffic is denied by default unless explicitly allowed.' },
      { term: 'ClusterIP', definition: 'A virtual IP address assigned to a Kubernetes Service that is stable across pod restarts — traffic to this IP is forwarded to pod IPs by kube-proxy rules.' },
    ],
    pitfalls: [
      'Checking Service configuration before verifying pod Ready status — an empty endpoints list always means pods are not ready or selectors do not match.',
      'Assuming DNS and ClusterIP routing are the same layer — they can fail independently (DNS works but kube-proxy rules are stale, or vice versa).',
      'Not checking NetworkPolicies when traffic fails between namespaces — cross-namespace traffic requires explicit NetworkPolicy allow rules in most CNI configurations.',
      'Using kubectl get pods without -l selector-label to check selector match — the -l flag with the exact Service selector labels is the definitive test.',
      'Ignoring the targetPort in the Service spec — the port value is what the Service exposes, but targetPort must match the port the container actually listens on.',
    ],
    keyQuestions: [
      {
        question: 'Walk through the complete diagnostic sequence for a Kubernetes Service returning connection refused.',
        answer: `Layer 1 — Pod existence and readiness: kubectl get pods -n mynamespace -l app=myapp. If no pods appear, the selector is wrong or pods are not deployed. If pods show as NotReady, the readiness probe is failing — kubectl describe pod pod-name shows which probe is failing and the error message.

Layer 2 — Service selector match: kubectl describe svc myservice -n mynamespace. Note the Selector field. Copy it and run kubectl get pods -n mynamespace -l selector-key=selector-value. The pods returned by this command are exactly the pods the Service will route to. If this list is empty or wrong, fix the selector or the pod labels.

Layer 3 — Endpoints populated: kubectl get endpoints myservice -n mynamespace. The Subsets section shows the actual IPs and ports being routed. Empty Subsets means the Service has no healthy backend — check pod Ready state and selector match. Populated Subsets that do not include an expected pod usually means that pod's readiness probe is failing.

Layer 4 — Pod is actually listening: kubectl exec -it pod-name -n mynamespace -- ss -tlnp | grep PORT. Verifies the process is bound to the expected port inside the container. If not, the container is misconfigured or the process crashed silently.

Layer 5 — NetworkPolicy check: kubectl get networkpolicy -n mynamespace. If policies exist, kubectl describe networkpolicy policy-name shows which ingress/egress is allowed. A missing allow rule for the client's namespace or CIDR blocks all traffic silently.

Layer 6 — DNS resolution test: kubectl run debug --rm -it --image=busybox --restart=Never -n mynamespace -- nslookup myservice.mynamespace.svc.cluster.local. DNS failure with working ClusterIP points to CoreDNS; both failing points to kube-proxy or pod issues.`
      },
      {
        question: 'How does a NetworkPolicy affect Service routing and what is the default behavior when policies exist?',
        answer: `Kubernetes NetworkPolicy objects implement a default-deny behavior per-namespace. Without any NetworkPolicy in a namespace, all pod-to-pod traffic is allowed in all directions (this depends on the CNI plugin — some CNIs do not enforce NetworkPolicies at all without additional configuration). Once any NetworkPolicy object exists in a namespace, it applies to the pods selected by that policy. Traffic is only allowed if a matching allow rule exists.

The critical point is that NetworkPolicy default-deny is additive per-pod. A pod that is selected by a NetworkPolicy with only ingress rules is not affected by the policy for its egress traffic — only for ingress. A pod that is selected by no NetworkPolicy at all is not restricted at all. This creates a confusing situation where different pods in the same namespace may have different effective policies.

For a Service to receive traffic from another pod in a different namespace, two conditions must be met: the receiving pod's namespace must have an ingress NetworkPolicy that allows traffic from the source namespace (identified by namespace labels or CIDR), and if the receiving namespace has egress policies on the calling pod, those must also allow traffic to the target namespace.

To debug: check for NetworkPolicy objects in both the source and destination namespaces. For the destination service's namespace, look for policies that select the target pods (kubectl get networkpolicy -n destination-ns -o yaml and look at spec.podSelector and spec.ingress). For cross-namespace traffic, the ingress rule must either allow from specific namespace labels (namespaceSelector) or specific pod labels in the source namespace (podSelector combined with namespaceSelector).

A common fix is to add an ingress rule allowing traffic from a specific namespace: ingress from namespaceSelector matching kubernetes.io/metadata.name: source-namespace. If you need to allow traffic from anywhere temporarily for debugging, add an ingress rule with an empty from: [] which allows all sources — but remove this before production.`
      },
      {
        question: 'What are the most common selector mismatch patterns that cause empty Kubernetes Service endpoints?',
        answer: `The selector mismatch is the single most common cause of empty Kubernetes Service endpoints and is almost always a small typo or structural difference between the Service spec and the pod template in the Deployment.

Case sensitivity mismatch: Kubernetes label values are case-sensitive. app=myApp in the Service selector will not match app=myapp in the pod labels. This is extremely common because the same service name is often typed differently in YAML files written by different team members.

Template label vs pod label: the Service selector must match the pod's actual labels, which come from the Deployment's spec.template.metadata.labels, not from the Deployment's own metadata.labels. A common mistake is setting the selector to match Deployment-level labels (like version or team) that are not propagated to the pod template.

Namespace mismatch: a Service only routes to pods in the same namespace by default. If you create a Service in the default namespace and try to route to pods in the application namespace, the endpoints will be empty. The Service and its target pods must be in the same namespace, or you need a headless Service or ExternalName Service to cross namespaces.

Port vs targetPort: the Service ports field has both port (what clients use) and targetPort (what the container listens on). If targetPort is set to a port the container is not listening on, traffic arrives at the pod but is immediately rejected with connection refused — this can look like a selector issue but the endpoints are actually populated.

Missing required labels: if a Deployment adds additional label selectors after the initial deployment (Kubernetes does not allow changing Deployment selectors after creation), the new selector may not match old pods. This requires deleting and recreating the Deployment.

The definitive verification: kubectl get pods -n namespace -l key1=val1,key2=val2 using the exact selectors from the Service spec. This returns exactly the pods that will appear in the Endpoints — if it returns the wrong set, fix the labels.`
      },
    ],
    quickFire: [
      { q: 'What kubectl command shows which pod IPs a Service is routing traffic to?', a: 'kubectl get endpoints service-name -n namespace — shows the actual IP:port pairs in the Endpoints subsets.' },
      { q: 'What is the #1 cause of empty Kubernetes Service endpoints?', a: 'Selector mismatch — the Service selector labels do not exactly match the pod labels (case-sensitive).' },
      { q: 'How do you test DNS resolution for a Kubernetes Service from inside the cluster?', a: 'kubectl exec -it pod -- nslookup service-name.namespace.svc.cluster.local' },
      { q: 'What is the default traffic behavior when a NetworkPolicy exists in a namespace?', a: 'Pods selected by the policy have default-deny for the policy direction (ingress/egress) — traffic is only allowed by explicit allow rules.' },
      { q: 'What kubectl flag lets you filter pods by the same labels as a Service selector?', a: '-l key=value — for example kubectl get pods -l app=myapp returns the same pods the Service would route to.' },
    ],
  },

  {
    id: 'ts-pvc-mount-failures',
    title: 'PVC Mount Failures in Kubernetes',
    icon: 'gitBranch',
    color: '#f59e0b',
    questions: 6,
    description: 'Resolve PersistentVolumeClaim mount failures including Multi-Attach errors and CSI provisioning issues.',
    visualizations: [],
    introduction: `## Overview
PersistentVolumeClaim (PVC) mount failures are a common and disruptive problem in Kubernetes clusters that use persistent storage. When a pod cannot mount its PVC, it stays in ContainerCreating state indefinitely, and the describe output contains one of several characteristic error messages that point to different root causes.

The most impactful and frequently misunderstood failure mode is the Multi-Attach error: "Multi-Attach error for volume X: volume is already exclusively attached to one node and can't be attached to another." This error occurs when a PVC uses a ReadWriteOnce (RWO) access mode — which means the volume can only be mounted by pods on a single node — and Kubernetes tries to mount it on a second node while it is still "attached" to the first.

The Multi-Attach error typically happens in these scenarios: a pod is rescheduled to a different node (during a node failure, node draining, or pod disruption), but the volume detach from the old node has not completed. The old node may be unreachable (if the node failed) making it impossible for the control plane to confirm detachment. Or the pod was deleted ungracefully (no graceful termination, immediate SIGKILL) and the volume controller did not process the detach event before the new pod was scheduled.

EBS volumes are RWO by design — an EBS volume can only be attached to one EC2 instance at a time. This is a fundamental hardware/OS constraint, not a Kubernetes limitation. EFS volumes (and other NFS-based storage) support ReadWriteMany (RWX) and can be mounted by pods on multiple nodes simultaneously.

Dynamic provisioning of PVCs requires the CSI (Container Storage Interface) driver for the storage class to be running and healthy. When a PVC is created, the storageclass provisioner creates the backing volume (an EBS volume, an NFS share) and binds it to the PVC. If the CSI driver pods are not running, the PVC stays in Pending state with an error in its events.

Node-volume zone affinity is a subtle but common failure. EBS volumes are created in a specific availability zone. If a PVC was previously used by a pod that ran in us-east-1a, the EBS volume exists in us-east-1a. If the new pod is scheduled on a node in us-east-1b, the mount will fail because the volume cannot be attached across AZs. StatefulSets solve this by maintaining pod-to-PVC binding across restarts, ensuring the pod always returns to the same node zone where its volume exists. For Deployments with PVCs, zone conflicts require careful topology constraints.

The practical fix for most PVC mount failures involves either removing the orphaned attachment (by force-deleting the old pod), using StatefulSets for stateful workloads, or configuring pod topology spread constraints to keep pods in the same AZ as their volumes.`,
    whenToUse: [
      'Diagnosing pods stuck in ContainerCreating with PVC mount errors',
      'Explaining and resolving Multi-Attach errors for RWO EBS volumes',
      'Choosing between RWO and RWX access modes for specific workload patterns',
      'Debugging CSI driver provisioning failures that leave PVCs in Pending state',
      'Designing StatefulSet storage configurations for high-availability databases in Kubernetes',
    ],
    keyConcepts: [
      { term: 'ReadWriteOnce (RWO)', definition: 'A PVC access mode allowing the volume to be mounted by pods on a single node at a time — enforced at the storage driver level (EBS) and the Kubernetes volume controller.' },
      { term: 'Multi-Attach Error', definition: 'A volume mount failure when a Kubernetes controller tries to attach an RWO volume to a second node while the volume is still considered attached to the first.' },
      { term: 'CSI Driver', definition: 'A Container Storage Interface plugin that implements volume provisioning, attachment, and mounting for a specific storage backend (aws-ebs-csi-driver, efs-csi-driver, etc.).' },
      { term: 'StorageClass', definition: 'A Kubernetes resource that defines a volume provisioner and parameters — the provisioner is called when a PVC is created, creating and binding the backing storage volume.' },
      { term: 'StatefulSet', definition: 'A Kubernetes workload type that provides stable pod identity and stable PVC-to-pod binding across restarts, ensuring a pod always returns to the same persistent volume.' },
    ],
    pitfalls: [
      'Using Deployment (instead of StatefulSet) for stateful workloads — Deployments may schedule replacement pods on different nodes, causing Multi-Attach errors on RWO volumes.',
      'Force-deleting pods without understanding whether the node is healthy — on an unhealthy node, force deletion does not guarantee volume detachment.',
      'Creating PVCs in a deployment without zone topology constraints — an EBS volume created in us-east-1a cannot be mounted by a pod running in us-east-1b.',
      'Not checking CSI driver pod health when a PVC stays Pending — a crashed or missing CSI driver silently prevents all new volume provisioning.',
      'Using ReadWriteOnce when multiple pods need access to shared storage — EFS or other NFS-backed RWX storage is required for multi-pod access.',
    ],
    keyQuestions: [
      {
        question: 'What causes the Multi-Attach error and what is the safe way to resolve it?',
        answer: `The Multi-Attach error occurs when the Kubernetes volume controller receives a request to attach an RWO volume to a node, but the volume is still registered as attached to a different node in the cloud provider's API. This happens most commonly in two scenarios.

The first is a node failure. When a node fails, the pods on that node are eventually evicted and rescheduled to other nodes. But the cloud provider (AWS in the case of EBS) still shows the volume as attached to the failed node's EC2 instance. The volume controller cannot detach from an unreachable node without confirmation that the node is truly gone — this is the "node fencing" problem in distributed storage. Kubernetes waits for the node to either recover or be formally marked as unreachable and deleted from the cluster before forcibly detaching the volume.

The second is an ungraceful pod deletion. If a pod is deleted with --force --grace-period=0, Kubernetes removes the pod object immediately without waiting for the kubelet to gracefully unmount volumes. The volume controller may not have processed the detach event before the new pod is scheduled.

Safe resolution depends on the node state. If the node is healthy: the old pod should be cleanly deleted (not force-deleted) and the kubelet will unmount the volume. The detach process takes 60-90 seconds after the pod terminates. Verify with kubectl describe pv pv-name and look for the node attachment annotation.

If the node is unhealthy or unreachable: force delete the stuck pod (kubectl delete pod pod-name --force --grace-period=0) to remove the pod object. Then verify the node is removed from the cluster or confirmed dead. The volume controller will then detach the volume from the dead node's record. Alternatively, manually detach the EBS volume via the AWS console or API — this forces the cloud provider to update the attachment state.

For prevention: use StatefulSets for stateful workloads, which handle pod-to-PVC binding correctly and maintain ordered restarts that respect volume attachment state.`
      },
      {
        question: 'How do you debug a PVC that stays in Pending state without a bound volume?',
        answer: `A PVC stuck in Pending means one of three things: no PersistentVolume exists that satisfies the claim (static provisioning without a matching PV), the dynamic provisioner has not created the volume yet (or failed to), or there is no StorageClass set as default and the PVC did not specify one.

Start with kubectl describe pvc pvc-name -n namespace. The Events section at the bottom will usually contain the specific error message. Common messages: "no persistent volumes available for this claim and no storage class is set" means no StorageClass — check kubectl get storageclass for a default (marked with (default)) and verify the PVC spec includes storageClassName. "waiting for a volume to be created, either by external provisioner or manually" means a StorageClass was found but the provisioner has not responded.

For dynamic provisioning failures, check the CSI driver pods: kubectl get pods -n kube-system -l app=ebs-csi-controller (for AWS EBS CSI). If these pods are not running, provisioning is blocked. Check their logs with kubectl logs -n kube-system deployment/ebs-csi-controller ebs-plugin for provisioning errors — common issues are missing IAM permissions for the node role (cannot create EBS volumes), API throttling, or AZ capacity constraints.

For EBS-specific provisioning: the aws-ebs-csi-driver requires the node's IAM role to have ec2:CreateVolume, ec2:AttachVolume, ec2:DescribeVolumes, and related permissions. Missing these permissions results in a clear error in the CSI controller logs.

Check volume topology constraints: if the StorageClass has volumeBindingMode: WaitForFirstConsumer (recommended for AZ-aware storage), the PVC stays Pending until a pod that uses it is scheduled. The provisioner waits to create the volume in the same AZ as the pod's node — this is the correct behavior, not a failure. The PVC will bind once the consuming pod is scheduled.`
      },
      {
        question: 'How do StatefulSets handle PVC binding differently from Deployments, and why does it matter for stateful workloads?',
        answer: `A Deployment creates pods that are interchangeable — any pod in the Deployment is equivalent to any other, and there is no stable identity or guaranteed binding between a pod and a specific PVC. If you create a Deployment with a PVC, all pods in the Deployment share the same PVC, which requires ReadWriteMany (RWX) access mode. This is problematic for databases and other stateful applications where each replica needs its own independent storage.

A StatefulSet creates pods with stable identities (myapp-0, myapp-1, myapp-2) and manages PVCs through volumeClaimTemplates — a PVC template that creates one PVC per pod with a deterministic name (data-myapp-0, data-myapp-1, data-myapp-2). Each pod is always bound to its own specific PVC and vice versa, regardless of which node the pod runs on. This binding persists through restarts, rescheduling, and even pod deletion (the PVC is not deleted when the pod is deleted — it must be explicitly deleted).

The ordering guarantees are also critical for stateful workloads. StatefulSets start pods in order (0, 1, 2...) and stop them in reverse order (2, 1, 0...). Before a pod is started, all lower-indexed pods must be Running and Ready. This means a StatefulSet for a database cluster reliably starts the primary (index 0) before the replicas, allowing the replicas to connect to an already-running primary.

For databases running in Kubernetes — PostgreSQL, MySQL, Cassandra, Kafka — always use StatefulSets, not Deployments. Use a headless Service (clusterIP: None) with the StatefulSet to provide stable DNS names for each pod (myapp-0.myservice.namespace.svc.cluster.local) that persist even when the pod is rescheduled to a different node. This is how cluster members find each other in etcd, Kafka, and similar systems.`
      },
    ],
    quickFire: [
      { q: 'What does the Multi-Attach error mean?', a: 'An RWO volume is still registered as attached to one node while Kubernetes is trying to attach it to a different node.' },
      { q: 'How do you fix a Multi-Attach error when the original node is healthy?', a: 'Wait for the old pod to gracefully terminate (60-90 seconds) — do not force delete unless the node is unreachable.' },
      { q: 'What Kubernetes workload type should you use for databases that need per-pod PVCs?', a: 'StatefulSet — it creates one PVC per pod via volumeClaimTemplates and maintains stable pod-to-PVC binding.' },
      { q: 'What StorageClass field prevents volume provisioning until a pod is scheduled?', a: 'volumeBindingMode: WaitForFirstConsumer — ensures the volume is created in the same AZ as the pod\'s node.' },
      { q: 'What access mode is required for an EBS volume to be mounted by pods on multiple nodes simultaneously?', a: 'EBS does not support this — EBS is RWO only. Use EFS (or other NFS) with ReadWriteMany (RWX) for multi-node access.' },
    ],
  },

  {
    id: 'ts-coredns-failures',
    title: 'CoreDNS Failures in Kubernetes',
    icon: 'gitBranch',
    color: '#f59e0b',
    questions: 6,
    description: 'Diagnose and fix CoreDNS failures that cause cascading service-to-service connectivity failures in Kubernetes.',
    visualizations: [],
    introduction: `## Overview
CoreDNS is the cluster DNS server in Kubernetes — it resolves service names (myservice.namespace.svc.cluster.local), pod DNS names, and external hostnames for all pods in the cluster. When CoreDNS fails or becomes overloaded, the impact is immediate and severe: every service-to-service call that uses a DNS name fails. This is typically the entire cluster's internal communication, since Kubernetes best practice is to use service names rather than hardcoded IPs. The resulting failure pattern looks like a complete application outage, even though the pods themselves and the Kubernetes control plane may be healthy.

CoreDNS runs as a Deployment in the kube-system namespace, typically with two replicas for redundancy. It is exposed by the kube-dns Service (historically named kube-dns regardless of whether you use CoreDNS or the original kube-dns), and its ClusterIP is the DNS server address injected into every pod's /etc/resolv.conf via the kubelet's clusterDNS configuration.

Distinguishing DNS failure from other failures: a pod that can reach services by ClusterIP but not by DNS name has a DNS problem. Run kubectl exec -it pod -- nslookup kubernetes.default.svc.cluster.local from any pod. If this fails, CoreDNS is the problem. If this succeeds but a specific service name fails, the service does not exist in DNS (possibly wrong namespace or service was deleted).

The most common cause of CoreDNS failures is CPU throttling. CoreDNS pods in many cluster configurations have a CPU limit of 100m (0.1 CPU). Under heavy DNS load (many pods doing service discovery, high pod churn creating DNS cache misses), CoreDNS processes thousands of queries per second, and the 100m limit is aggressively throttled. Throttled CoreDNS introduces latency on every DNS query — 50-500ms instead of the normal 1-5ms. Applications with short DNS resolution timeouts start failing.

The ndots:5 configuration amplifies DNS load. The default Kubernetes pod /etc/resolv.conf contains ndots:5 and a list of search domains. When a pod resolves the hostname myservice, the resolver tries all search domain suffixes before trying the name as-is: myservice.mynamespace.svc.cluster.local, myservice.svc.cluster.local, myservice.cluster.local, myservice in the first two options before finding a match. A single DNS lookup for an unqualified name generates 3-6 actual DNS queries to CoreDNS. At scale (hundreds of pods making hundreds of DNS lookups per second), the query amplification effect is significant.

NodeLocal DNSCache is the most effective solution for high-scale clusters. It deploys a DaemonSet running on every node that caches DNS responses locally, intercepting DNS queries before they reach CoreDNS. Cache hits (the common case for service names that are queried repeatedly) are served locally with microsecond latency and no query sent to CoreDNS. Cache misses are forwarded to CoreDNS and the response is cached. This reduces CoreDNS query volume by 70-90% in practice, eliminating throttling and reducing the blast radius of CoreDNS failures.`,
    whenToUse: [
      'Diagnosing cluster-wide service connectivity failures that resolve when using ClusterIP instead of service names',
      'Investigating intermittent DNS timeouts that correlate with high pod counts or frequent deployments',
      'Explaining the ndots:5 amplification effect and how to mitigate it',
      'Configuring NodeLocal DNSCache to reduce CoreDNS load at scale',
      'Scaling CoreDNS replicas and adjusting CPU limits to handle peak cluster DNS load',
    ],
    keyConcepts: [
      { term: 'CoreDNS', definition: 'The cluster DNS server deployed as a Deployment in kube-system — resolves Kubernetes service names, pod DNS names, and external hostnames for all cluster pods.' },
      { term: 'ndots:5', definition: 'The default Kubernetes resolver configuration that causes short hostnames to be tried with 5 search domain suffixes before being resolved as absolute names, amplifying DNS query volume.' },
      { term: 'NodeLocal DNSCache', definition: 'A DaemonSet that runs a DNS cache on every node, serving cached responses locally and reducing CoreDNS query volume by 70-90% in high-scale clusters.' },
      { term: 'Search Domains', definition: 'The DNS suffix list in /etc/resolv.conf (namespace.svc.cluster.local, svc.cluster.local, cluster.local, etc.) that the resolver appends to unqualified hostnames before querying DNS.' },
      { term: 'FQDN', definition: 'Fully Qualified Domain Name — a DNS name ending with a dot (myservice.mynamespace.svc.cluster.local.) that bypasses ndots search domain expansion and sends one DNS query instead of many.' },
    ],
    pitfalls: [
      'Setting CoreDNS CPU limits too low (100m) in large clusters — DNS is a high-frequency operation and throttling introduces latency on every inter-service call.',
      'Not using FQDNs in service-to-service calls — unqualified names trigger multiple DNS queries due to ndots:5 search domain expansion.',
      'Not scaling CoreDNS replicas proportionally to cluster pod count — a 2-replica CoreDNS deployment cannot handle a 1,000-pod cluster\'s DNS load.',
      'Running CoreDNS on the same nodes as high-churn workloads without anti-affinity rules — a node being drained that hosts a CoreDNS pod can cause a DNS outage.',
      'Forgetting to check CoreDNS ConfigMap for syntax errors after making changes — a malformed Corefile silently causes CoreDNS pods to fail to start.',
    ],
    keyQuestions: [
      {
        question: 'How do you diagnose whether CoreDNS is causing a service connectivity failure?',
        answer: `The key diagnostic is whether the failure is DNS-specific or a general network failure. Run these commands from a debug pod inside the cluster.

First, test by service name: kubectl exec -it debug-pod -- wget -O- http://myservice.mynamespace:8080/health. If this fails, proceed to the next test.

Test by ClusterIP directly: kubectl get svc myservice -n mynamespace -o jsonpath='{.spec.clusterIP}' to get the ClusterIP, then kubectl exec -it debug-pod -- wget -O- http://CLUSTERIP:8080/health. If this succeeds but the name-based request fails, DNS is the problem. If both fail, the issue is the Service/Endpoint layer (wrong selector, pod not ready, NetworkPolicy).

Test DNS resolution directly: kubectl exec -it debug-pod -- nslookup myservice.mynamespace.svc.cluster.local. If this times out or returns an error, CoreDNS is not serving responses. Check CoreDNS pod status: kubectl get pods -n kube-system -l k8s-app=coredns. If pods are Running, check their CPU usage: kubectl top pods -n kube-system — CPU at or near the limit indicates throttling.

Check CoreDNS logs: kubectl logs -n kube-system -l k8s-app=coredns --tail=100. Error messages like SERVFAIL or NXDOMAIN for internal service names indicate CoreDNS cannot resolve names it should be authoritative for. This can happen if the CoreDNS ConfigMap is misconfigured.

Check CoreDNS ConfigMap for syntax: kubectl get configmap coredns -n kube-system -o yaml. The Corefile must have correct syntax — a syntax error causes CoreDNS to crash on startup. Verify the kubernetes plugin is configured with the cluster's domain name (usually cluster.local).`
      },
      {
        question: 'What is the ndots:5 amplification problem and how do you fix it?',
        answer: `The ndots:5 setting in /etc/resolv.conf controls when the DNS resolver adds search domain suffixes before querying the server. When ndots is 5, the resolver checks whether a hostname has fewer than 5 dots. If it does, the resolver tries the name with each search domain suffix first before trying it as an absolute name.

For a Kubernetes pod resolving redis.cache (a Redis service in the cache namespace), the resolution sequence is: redis.cache.mynamespace.svc.cluster.local (fails, NXDOMAIN), redis.cache.svc.cluster.local (fails), redis.cache.cluster.local (fails), redis.cache (succeeds, if it exists externally) or redis.cache.mynamespace.svc.cluster.local (this match was first — but the FQDN redis.cache.mynamespace.svc.cluster.local has only 5 dots so it also goes through the expansion). A single DNS lookup in a Kubernetes pod generates 3-6 actual DNS queries to CoreDNS.

In a cluster with 200 pods each making 100 DNS lookups per minute, this creates 60,000-120,000 DNS queries per minute — 5-10x the "logical" lookup rate. This is why CoreDNS becomes a bottleneck at scale even for clusters that are not particularly DNS-heavy at the application level.

Three fixes. First, use FQDNs with trailing dots in application configuration: redis.cache.svc.cluster.local. (trailing dot = absolute name). The dot tells the resolver this is already fully qualified — skip all search domain expansion, send one query, get one answer.

Second, reduce ndots in pod spec: spec.dnsConfig.options with name: ndots and value: "2". With ndots:2, a hostname with 2 or more dots (like myservice.mynamespace) is tried as absolute first (one query), found, done. Only hostnames with fewer dots (like redis) get the search expansion.

Third, deploy NodeLocal DNSCache — it caches responses locally on each node, so even with ndots:5, repeated queries for the same name hit the local cache (microsecond response) rather than CoreDNS. The first query still does the expansion, but every subsequent query for the same name within the cache TTL is served locally.`
      },
      {
        question: 'How does NodeLocal DNSCache work and what are the operational steps to deploy it?',
        answer: `NodeLocal DNSCache is a DaemonSet that runs a DNS caching process (typically based on CoreDNS) on every node in the cluster. It binds to a link-local IP address (169.254.20.10 in the standard deployment — a non-routable address that exists only on the local node) and intercepts DNS queries from pods on the same node before they are forwarded to the cluster's CoreDNS.

The mechanism works through iptables rules applied by the DaemonSet on each node. DNS queries from pods (directed to the kube-dns ClusterIP) are intercepted and redirected to the node-local cache IP (169.254.20.10). The node-local cache checks its cache — if the response is cached and fresh, it responds immediately with sub-millisecond latency. If the cache misses, the node-local cache forwards the query to CoreDNS, receives the response, caches it, and returns it to the pod. Future queries for the same name from any pod on that node hit the cache.

The operational benefits are substantial: DNS latency drops from 1-10ms (CoreDNS round-trip) to under 0.1ms for cache hits. CoreDNS receives 70-90% fewer queries. A CoreDNS failure or slowdown affects only cache misses, not the vast majority of repeated lookups.

Deployment steps: apply the NodeLocal DNSCache DaemonSet manifest from the Kubernetes repository (kubernetes/kubernetes/blob/master/cluster/addons/dns/nodelocaldns/nodelocaldns.yaml). Update the KUBEDNS_SVC_IP variable to match your kube-dns ClusterIP (kubectl get svc kube-dns -n kube-system -o jsonpath='{.spec.clusterIP}'). Apply the manifest. Verify the daemonset pods are running on all nodes: kubectl get pods -n kube-system -l k8s-app=node-local-dns -o wide.

After deployment, verify resolution is faster: kubectl exec -it pod -- time nslookup kubernetes.default.svc.cluster.local should show sub-millisecond resolution for cached names. Monitor CoreDNS CPU to confirm the load reduction.`
      },
    ],
    quickFire: [
      { q: 'How do you verify that DNS is the cause of service connectivity failures?', a: 'Test by ClusterIP (wget http://CLUSTERIP:port) — if that works but service name fails, DNS is the problem.' },
      { q: 'What is the default Kubernetes ndots setting and what does it cause?', a: 'ndots:5 — causes unqualified names to be tried with 5 search domain suffixes, amplifying DNS query volume by 3-6x.' },
      { q: 'How do you make a DNS name in Kubernetes resolve with a single query?', a: 'Use a fully qualified domain name with a trailing dot: myservice.namespace.svc.cluster.local. — the dot tells the resolver it is absolute.' },
      { q: 'What Kubernetes add-on reduces CoreDNS query volume by 70-90%?', a: 'NodeLocal DNSCache — a DaemonSet that caches DNS responses locally on each node.' },
      { q: 'What kubectl command scales CoreDNS to handle higher query load?', a: 'kubectl scale deployment coredns -n kube-system --replicas=4 — adjust replicas based on cluster size and query rate.' },
    ],
  },
];
