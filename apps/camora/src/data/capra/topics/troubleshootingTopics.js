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
    introduction: `An EC2 instance that does not respond to SSH can fail for reasons at multiple layers: network (security group, NACL, routing), OS (kernel panic, OOM kill of sshd, disk full), or hardware (underlying host failure). Diagnosis must start with the layers you can access without SSH — AWS console and EC2 Serial Console.

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
    introduction: `RDS CPU at 100% causes all queries to slow down proportionally and can eventually make the instance unresponsive. The root cause is almost always one of: an expensive query (missing index, full table scan), a sudden increase in query volume (traffic spike), lock contention blocking other queries and causing them to queue, or autovacuum running full scans on bloated PostgreSQL tables.

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
    introduction: `When an ALB returns 5xx errors, the cause can be either the ALB itself (502 Bad Gateway, 503 Service Unavailable) or the backend targets (504 Gateway Timeout, 502 if backend sends an invalid response). Understanding which error code means what determines where to look.

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
    introduction: `DNS failures manifest as connection errors that look like network failures but are actually name resolution failures. They are among the most common causes of production incidents because they are often invisible until they cause a cascading failure.

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
    introduction: `VPC connectivity failures are among the most common issues in AWS architectures. They often look like network timeouts but are caused by misconfigured security groups, NACLs, missing routes, or broken peering.

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
    introduction: `"It works in staging but not in production" is one of the most frustrating and common failure patterns. It indicates environment parity problems — staging and production are not equivalent environments. The root causes fall into several categories.

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

**Option A — Add an index (non-blocking):**
\`\`\`sql
CREATE INDEX CONCURRENTLY idx_name ON table(column);
\`\`\`
Takes minutes for large tables. Query will immediately use it once built.

**Option B — Rewrite behind a feature flag:**
Deploy hotfix with optimized query behind a flag, enable it for 5%, verify latency, then roll to 100%.

**Option C — Force index usage for diagnosis:**
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
    introduction: `Database schema migrations that lock tables cause downtime. For high-traffic databases, even a millisecond-level lock on a large table causes connection queue buildup that looks like an outage. Zero-downtime migrations require a disciplined approach.

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
    introduction: `Silent alerts are an existential threat to reliability — the monitoring system is supposed to tell you when something breaks, but if alerts fail to fire, you discover outages from customers instead. Diagnosing why an expected alert did not fire requires checking the entire pipeline from metric collection through rule evaluation to notification routing.

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
    introduction: `Slow queries are one of the most common causes of production performance degradation. They fall into several categories: missing index (full sequential scan), inefficient join (Cartesian product, wrong join type), N+1 query pattern (application code issuing one query per row of a result set), parameter sniffing causing bad plan caching, and lock contention causing queries to queue.

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
    introduction: `Database connection pools are finite resources. When the pool is exhausted, new requests queue waiting for a connection. If the wait exceeds the timeout, requests fail with "connection pool timeout" or "too many connections" errors. This is one of the most common causes of database-related outages during traffic spikes.

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
    introduction: `A memory leak causes a process's RSS (Resident Set Size) to grow continuously over time without a corresponding increase in load. Eventually the process exceeds its memory limit (container limit or OS free memory) and is killed by the OOM killer. In Kubernetes, this manifests as OOMKilled with exit code 137.

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
- **EventEmitter listener leak:** listeners added inside a loop or on every request without removal. Check logs for "EventEmitter memory leak detected" warnings.
- **Closure capturing outer scope:** callbacks holding references to request objects or large arrays.
- **Map/Set accumulating entries:** a global cache \`Map\` that never evicts old entries.
- **Timer without clearInterval:** \`setInterval\` that captures a large object in its closure.

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
    introduction: `CrashLoopBackOff is a Kubernetes status indicating that a container is crashing repeatedly and Kubernetes is applying exponential backoff before restarting it again. The backoff starts at 10 seconds and doubles (20s, 40s, 80s... up to 5 minutes). It is not an error in itself — it is the container's repeated crashing that is the error.

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
    introduction: `A pod stuck in Pending state means the Kubernetes scheduler has not been able to find a node to place it on. The scheduler evaluates all nodes against the pod's requirements (resources, taints, affinity, topology constraints) and assigns the pod to the first node that satisfies all constraints. If no node qualifies, the pod remains Pending indefinitely.

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

**Option A — Reduce memory requests on existing pods:**
Right-size requests (\`requests.memory: 256Mi\` instead of 1Gi). Update the Deployment and pods are replaced with lower-request pods.

**Option B — Add nodes via Cluster Autoscaler:**
\`\`\`bash
kubectl logs -n kube-system -l app=cluster-autoscaler
\`\`\`
If CA is not enabled: scale the node group manually in EKS/GKE console.

**Option C — Reduce requests on the Pending pod:**
Edit \`resources.requests.memory\` to a value the existing nodes can satisfy.

**Option D — Use a node with more memory:**
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
    introduction: `The Horizontal Pod Autoscaler (HPA) scales a Deployment or StatefulSet based on observed metric values compared to target values. When HPA is configured but not scaling, the reason is usually one of: metrics server not installed or returning errors, no resource requests set (HPA uses requests to compute utilization percentages), metrics below the scale threshold, or the stabilization window delaying scaling.

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

**Cause 1 — Metrics Server not installed or not working:**
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

**Cause 2 — Resource requests not set on the target pods:**
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

**Cause 3 — Custom metrics not configured (for non-CPU/memory HPA):**
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
];
