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


OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'comparisons')
os.makedirs(OUT, exist_ok=True)


# ── EC2 vs Lambda ─────────────────────────────────────────────────────────────
def diag_ec2_vs_lambda():
    g = base_graph('ec2_vs_lambda', 'EC2 vs Lambda — When to Use Each', rankdir='TB')

    with g.subgraph(name='cluster_ec2') as s:
        s.attr(label='EC2 — Always-On VMs', style='filled,rounded', fillcolor='#eff6ff',
               color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'ec2_long', 'Long-running workloads\n(web servers, background jobs)', 'navy')
        n(s, 'ec2_ctrl', 'Full OS control\n(custom runtimes, GPU, NVMe)', 'navy')
        n(s, 'ec2_state', 'Stateful processes\n(in-memory state, persistent conn)', 'navy')
        n(s, 'ec2_cost', 'Predictable cost\n(Reserved: up to 72% off)', 'green')

    with g.subgraph(name='cluster_lambda') as s:
        s.attr(label='Lambda — Event-Driven Functions', style='filled,rounded', fillcolor='#fefce8',
               color='#f59e0b', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'lam_event', 'Event-driven triggers\n(S3, API GW, SQS, DynamoDB streams)', 'gold')
        n(s, 'lam_scale', 'Instant auto-scale\n(0 → 10K concurrency)', 'gold')
        n(s, 'lam_cost', 'Pay per invocation\n(first 1M req/mo free)', 'green')
        n(s, 'lam_limit', 'Limits: 15 min timeout\n512 MB–10 GB RAM, 250 MB pkg', 'red')

    n(g, 'trigger', 'Traffic / Workload', 'gray')
    e(g, 'trigger', 'ec2_long', 'sustained load')
    e(g, 'trigger', 'lam_event', 'bursty / sporadic')

    g.render(os.path.join(OUT, 'cmp-ec2-vs-lambda-decision'), cleanup=True)


# ── ECS vs EKS ────────────────────────────────────────────────────────────────
def diag_ecs_vs_eks():
    g = base_graph('ecs_vs_eks', 'ECS vs EKS — Container Orchestration Tradeoffs', rankdir='LR')

    with g.subgraph(name='cluster_ecs') as s:
        s.attr(label='ECS — AWS Native', style='filled,rounded', fillcolor='#eff6ff',
               color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'ecs_simple', 'Simple setup\n(no control plane to manage)', 'navy')
        n(s, 'ecs_fargate', 'Fargate serverless mode\n(no EC2 node management)', 'navy')
        n(s, 'ecs_aws', 'Deep AWS integration\n(IAM, ALB, CloudWatch native)', 'green')
        n(s, 'ecs_lock', 'AWS vendor lock-in\n(not portable to GCP/Azure)', 'red')

    with g.subgraph(name='cluster_eks') as s:
        s.attr(label='EKS — Kubernetes Standard', style='filled,rounded', fillcolor='#f5f3ff',
               color='#6366f1', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'eks_k8s', 'Full Kubernetes API\n(Helm, Operators, CRDs)', 'purple')
        n(s, 'eks_port', 'Multi-cloud portable\n(GKE / AKS compatible manifests)', 'purple')
        n(s, 'eks_complex', 'Higher operational cost\n(control plane: $0.10/hr)', 'gold')
        n(s, 'eks_eco', 'Rich ecosystem\n(Istio, Argo, Karpenter, etc.)', 'green')

    n(g, 'choose', 'Team decides…', 'gray')
    e(g, 'choose', 'ecs_simple', 'small team / AWS only')
    e(g, 'choose', 'eks_k8s', 'k8s expertise / multi-cloud')

    g.render(os.path.join(OUT, 'cmp-ecs-vs-eks-tradeoffs'), cleanup=True)


# ── Containers vs Serverless ──────────────────────────────────────────────────
def diag_containers_vs_serverless():
    g = base_graph('containers_vs_serverless', 'Containers vs Serverless — Architecture Spectrum', rankdir='TB')

    with g.subgraph(name='cluster_containers') as s:
        s.attr(label='Containers (ECS / EKS / Docker)', style='filled,rounded',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'c_runtime', 'You own: runtime\nOS libs, process lifecycle', 'navy')
        n(s, 'c_start', 'Cold start: seconds\n(image pull + container init)', 'gold')
        n(s, 'c_state', 'Long-lived processes\n(WebSocket, gRPC, cron)', 'green')
        n(s, 'c_cost', 'Cost: per-hour node\n(underutil = waste)', 'red')

    with g.subgraph(name='cluster_serverless') as s:
        s.attr(label='Serverless (Lambda / Fargate / Cloud Run)', style='filled,rounded',
               fillcolor='#fefce8', color='#f59e0b', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 's_runtime', 'Cloud owns: runtime\ninfra, scaling, patching', 'gold')
        n(s, 's_start', 'Cold start: ms–2s\n(SnapStart / Provisioned CC)', 'navy')
        n(s, 's_state', 'Stateless functions\n(max 15 min, ephemeral /tmp)', 'red')
        n(s, 's_cost', 'Cost: per-request\n(idle = $0)', 'green')

    g.render(os.path.join(OUT, 'cmp-containers-vs-serverless-spectrum'), cleanup=True)


# ── S3 vs EFS vs EBS ──────────────────────────────────────────────────────────
def diag_s3_efs_ebs():
    g = base_graph('s3_efs_ebs', 'S3 vs EFS vs EBS — AWS Storage Decision Tree', rankdir='LR')

    n(g, 'q1', 'Need shared\naccess?', 'gray')
    n(g, 'q2', 'Object or\nFile?', 'gray')
    n(g, 'ebs', 'EBS\nBlock storage\nSingle EC2 attach\n<1ms latency', 'navy')
    n(g, 'q3', 'App files or\nstatic assets?', 'gray')
    n(g, 'efs', 'EFS\nNFS shared filesystem\nMulti-EC2 / Lambda\nElastic capacity', 'purple')
    n(g, 's3', 'S3\nObject store\nUnlimited scale\n$0.023/GB-mo', 'green')

    e(g, 'q1', 'ebs', 'No — single instance\n(DB, boot volume)')
    e(g, 'q1', 'q2', 'Yes — shared')
    e(g, 'q2', 'q3', 'File (POSIX)')
    e(g, 'q2', 's3', 'Object (HTTP GET/PUT)')
    e(g, 'q3', 'efs', 'Shared app files\n(CMS, ML datasets)')
    e(g, 'q3', 's3', 'Static assets\n(images, backups, logs)')

    g.render(os.path.join(OUT, 'cmp-s3-vs-efs-vs-ebs-decision'), cleanup=True)


# ── RDS vs DynamoDB ───────────────────────────────────────────────────────────
def diag_rds_vs_dynamodb():
    g = base_graph('rds_vs_dynamodb', 'RDS vs DynamoDB — Database Selection', rankdir='TB')

    with g.subgraph(name='cluster_rds') as s:
        s.attr(label='RDS / Aurora — Relational', style='filled,rounded',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'rds_acid', 'ACID transactions\nJOINs, foreign keys, triggers', 'navy')
        n(s, 'rds_schema', 'Fixed schema\nNormalized data model', 'navy')
        n(s, 'rds_scale', 'Vertical scale + Read Replicas\n(Aurora: 15 replicas)', 'gold')
        n(s, 'rds_use', 'Use: ERP, e-commerce\nfinance, analytics', 'green')

    with g.subgraph(name='cluster_dynamo') as s:
        s.attr(label='DynamoDB — Key-Value / Document', style='filled,rounded',
               fillcolor='#fdf4ff', color='#a855f7', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'dyn_key', 'PK + Sort Key access pattern\nNo ad-hoc JOINs', 'purple')
        n(s, 'dyn_schema', 'Schemaless JSON\nSingle-table design', 'purple')
        n(s, 'dyn_scale', 'Auto-scale to millions TPS\n<10ms at any scale', 'green')
        n(s, 'dyn_use', 'Use: gaming, IoT, sessions\nuser profiles, leaderboards', 'green')

    g.render(os.path.join(OUT, 'cmp-rds-vs-dynamodb-selection'), cleanup=True)


# ── SQL vs NoSQL ──────────────────────────────────────────────────────────────
def diag_sql_vs_nosql():
    g = base_graph('sql_vs_nosql', 'SQL vs NoSQL — Data Model Tradeoffs', rankdir='LR')

    with g.subgraph(name='cluster_sql') as s:
        s.attr(label='SQL (PostgreSQL / MySQL / Aurora)', style='filled,rounded',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'sql_schema', 'Strict schema\nRelations + Constraints', 'navy')
        n(s, 'sql_query', 'Rich ad-hoc queries\nJOINs, aggregations, CTEs', 'navy')
        n(s, 'sql_acid', 'ACID guarantees\nSerializable isolation', 'green')
        n(s, 'sql_scale', 'Scale: vertical + sharding\n(harder to shard)', 'red')

    with g.subgraph(name='cluster_nosql') as s:
        s.attr(label='NoSQL — Document / KV / Column / Graph', style='filled,rounded',
               fillcolor='#fdf4ff', color='#a855f7', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'nosql_flex', 'Flexible schema\nJSON / BSON / wide-column', 'purple')
        n(s, 'nosql_query', 'Access by primary key\nLimited secondary indexes', 'gold')
        n(s, 'nosql_cons', 'Eventual consistency\n(BASE model)', 'gold')
        n(s, 'nosql_scale', 'Horizontal sharding\nnative, elastic scaling', 'green')

    n(g, 'decision', 'Choose based on…', 'gray')
    e(g, 'decision', 'sql_schema', 'complex relations\nstrong consistency')
    e(g, 'decision', 'nosql_scale', 'massive scale\nsimple access patterns')

    g.render(os.path.join(OUT, 'cmp-sql-vs-nosql-tradeoffs'), cleanup=True)


# ── SQS vs SNS ────────────────────────────────────────────────────────────────
def diag_sqs_vs_sns():
    g = base_graph('sqs_vs_sns', 'SQS vs SNS — Messaging Patterns', rankdir='LR')

    n(g, 'producer', 'Producer\n(microservice / Lambda)', 'gray')

    with g.subgraph(name='cluster_sqs') as s:
        s.attr(label='SQS — Queue (Pull)', style='filled,rounded',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'sqs_q', 'SQS Queue\n(FIFO or Standard)', 'navy')
        n(s, 'sqs_c1', 'Consumer 1\n(polls & deletes)', 'green')

    with g.subgraph(name='cluster_sns') as s:
        s.attr(label='SNS — Topic (Push / Fan-out)', style='filled,rounded',
               fillcolor='#fefce8', color='#f59e0b', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'sns_t', 'SNS Topic', 'gold')
        n(s, 'sns_s1', 'Subscriber: Lambda', 'green')
        n(s, 'sns_s2', 'Subscriber: SQS queue', 'navy')
        n(s, 'sns_s3', 'Subscriber: Email/SMS', 'teal')

    e(g, 'producer', 'sqs_q', 'send msg')
    e(g, 'sqs_q', 'sqs_c1', 'poll / delete\n(exactly-once FIFO)')
    e(g, 'producer', 'sns_t', 'publish')
    e(g, 'sns_t', 'sns_s1', 'push')
    e(g, 'sns_t', 'sns_s2', 'push')
    e(g, 'sns_t', 'sns_s3', 'push')

    g.render(os.path.join(OUT, 'cmp-sqs-vs-sns-patterns'), cleanup=True)


# ── Kafka vs SQS ──────────────────────────────────────────────────────────────
def diag_kafka_vs_sqs():
    g = base_graph('kafka_vs_sqs', 'Kafka vs SQS — Stream vs Queue', rankdir='TB')

    with g.subgraph(name='cluster_kafka') as s:
        s.attr(label='Apache Kafka / MSK — Log Streaming', style='filled,rounded',
               fillcolor='#f5f3ff', color='#6366f1', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'k_ret', 'Durable log retention\n(replay from any offset)', 'purple')
        n(s, 'k_cg', 'Consumer groups\n(independent, parallel reads)', 'purple')
        n(s, 'k_tp', 'High throughput\n(millions msg/sec, partitioned)', 'green')
        n(s, 'k_ops', 'Ops burden\n(brokers, ZK/KRaft, tuning)', 'red')

    with g.subgraph(name='cluster_sqs') as s:
        s.attr(label='AWS SQS — Managed Queue', style='filled,rounded',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'sqs_del', 'At-least-once delivery\n(msg deleted after ack)', 'navy')
        n(s, 'sqs_vis', 'Visibility timeout\n(retry on failure, DLQ)', 'navy')
        n(s, 'sqs_man', 'Fully managed\n(no brokers, serverless)', 'green')
        n(s, 'sqs_rep', 'No replay\n(msg gone after consume)', 'red')

    n(g, 'use1', 'Use Kafka when:\nEvent sourcing, audit log\nmulti-consumer replay', 'purple')
    n(g, 'use2', 'Use SQS when:\nTask queues, decoupling\nno replay needed', 'navy')
    e(g, 'k_ret', 'use1', '')
    e(g, 'sqs_del', 'use2', '')

    g.render(os.path.join(OUT, 'cmp-kafka-vs-sqs-stream-vs-queue'), cleanup=True)


# ── GitHub Actions vs Jenkins ──────────────────────────────────────────────────
def diag_github_actions_vs_jenkins():
    g = base_graph('gh_actions_vs_jenkins', 'GitHub Actions vs Jenkins — CI/CD Platform', rankdir='LR')

    with g.subgraph(name='cluster_gha') as s:
        s.attr(label='GitHub Actions — Cloud-Native CI/CD', style='filled,rounded',
               fillcolor='#dcfce7', color='#22c55e', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'gha_yaml', 'YAML workflows\n(.github/workflows/*.yml)', 'green')
        n(s, 'gha_runners', 'Managed runners\n(ubuntu/macos/windows)', 'green')
        n(s, 'gha_market', '20K+ Marketplace actions\n(npm, Docker, cloud deploys)', 'green')
        n(s, 'gha_cost', 'Free for public repos\n(2K min/mo private)', 'gold')

    with g.subgraph(name='cluster_jenkins') as s:
        s.attr(label='Jenkins — Self-Hosted Automation Server', style='filled,rounded',
               fillcolor='#fef3c7', color='#f59e0b', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'j_pipe', 'Jenkinsfile (Groovy)\nDeclarative or Scripted', 'gold')
        n(s, 'j_agents', 'Self-managed agents\n(full control, any OS)', 'navy')
        n(s, 'j_plugin', '1800+ plugins\n(legacy system integrations)', 'navy')
        n(s, 'j_ops', 'Ops overhead\n(upgrades, security, HA setup)', 'red')

    n(g, 'choose', 'Team needs…', 'gray')
    e(g, 'choose', 'gha_yaml', 'GitHub-native\nlow ops burden')
    e(g, 'choose', 'j_pipe', 'on-prem\nenterprise compliance')

    g.render(os.path.join(OUT, 'cmp-github-actions-vs-jenkins-cicd'), cleanup=True)


# ── CloudWatch vs Datadog ──────────────────────────────────────────────────────
def diag_cloudwatch_vs_datadog():
    g = base_graph('cloudwatch_vs_datadog', 'CloudWatch vs Datadog — Observability Platforms', rankdir='TB')

    with g.subgraph(name='cluster_cw') as s:
        s.attr(label='CloudWatch — AWS Native', style='filled,rounded',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'cw_native', 'Automatic AWS integration\n(EC2, Lambda, RDS, ECS)', 'navy')
        n(s, 'cw_logs', 'Log Insights SQL queries\nAlarms → SNS → PagerDuty', 'navy')
        n(s, 'cw_cost', 'Ingestion: $0.50/GB logs\n$0.30/metric/mo (custom)', 'gold')
        n(s, 'cw_limit', 'AWS-only\nLimited APM, no traces OOTB', 'red')

    with g.subgraph(name='cluster_dd') as s:
        s.attr(label='Datadog — Unified Observability', style='filled,rounded',
               fillcolor='#fdf4ff', color='#a855f7', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'dd_apm', 'APM + distributed tracing\nService map, profiling', 'purple')
        n(s, 'dd_dash', 'Custom dashboards\nML anomaly detection', 'purple')
        n(s, 'dd_cloud', 'Multi-cloud + on-prem\n(AWS + GCP + k8s + on-prem)', 'green')
        n(s, 'dd_cost', 'Costly at scale\n($15–23/host/mo + log ingest)', 'red')

    n(g, 'choose', 'Decision factor', 'gray')
    e(g, 'choose', 'cw_native', 'AWS-only workload\nminimize tooling cost')
    e(g, 'choose', 'dd_apm', 'multi-cloud / full APM\nenterprise observability')

    g.render(os.path.join(OUT, 'cmp-cloudwatch-vs-datadog-observability'), cleanup=True)


# ── Blue-Green vs Canary ───────────────────────────────────────────────────────
def diag_blue_green_vs_canary():
    g = base_graph('blue_green_vs_canary', 'Blue-Green vs Canary — Deployment Risk Strategies', rankdir='LR')

    n(g, 'lb', 'Load Balancer\n/ Traffic Router', 'gray')

    with g.subgraph(name='cluster_bg') as s:
        s.attr(label='Blue-Green — Full Cutover', style='filled,rounded',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'blue', 'Blue (Live v1)\n100% traffic', 'navy')
        n(s, 'green', 'Green (New v2)\n0% → 100% (instant swap)', 'green')
        n(s, 'bg_rb', 'Rollback: flip back to Blue\n(seconds, no code change)', 'gold')

    with g.subgraph(name='cluster_canary') as s:
        s.attr(label='Canary — Gradual Traffic Shift', style='filled,rounded',
               fillcolor='#fefce8', color='#f59e0b', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'stable', 'Stable (v1)\n90% → 0% traffic', 'navy')
        n(s, 'canary', 'Canary (v2)\n5% → 100% traffic', 'gold')
        n(s, 'can_mon', 'Monitor: error rate\nlatency p99, business KPIs', 'teal')
        n(s, 'can_rb', 'Rollback: reduce canary\n% instantly', 'red')

    e(g, 'lb', 'blue', '100%')
    e(g, 'lb', 'stable', '90%')
    e(g, 'lb', 'canary', '10%')
    e(g, 'canary', 'can_mon', 'observe')
    e(g, 'can_mon', 'can_rb', 'error spike', color='#ef4444')

    g.render(os.path.join(OUT, 'cmp-blue-green-vs-canary-strategies'), cleanup=True)


# ── Rolling vs Blue-Green ──────────────────────────────────────────────────────
def diag_rolling_vs_blue_green():
    g = base_graph('rolling_vs_blue_green', 'Rolling vs Blue-Green — Instance Update Patterns', rankdir='TB')

    with g.subgraph(name='cluster_rolling') as s:
        s.attr(label='Rolling — Replace Instances Incrementally', style='filled,rounded',
               fillcolor='#ccfbf1', color='#14b8a6', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'r_v1a', 'i-1: v1 → v2', 'teal')
        n(s, 'r_v1b', 'i-2: still v1', 'gray')
        n(s, 'r_v1c', 'i-3: still v1', 'gray')
        n(s, 'r_note', 'Mixed versions\nbriefly in prod\nLower infra cost', 'gold')
        s.edge('r_v1a', 'r_v1b', style='invis')
        s.edge('r_v1b', 'r_v1c', style='invis')

    with g.subgraph(name='cluster_bg') as s:
        s.attr(label='Blue-Green — Full Parallel Environments', style='filled,rounded',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'bg_blue', 'Blue: 3× v1 (live)', 'navy')
        n(s, 'bg_green', 'Green: 3× v2 (standby)', 'green')
        n(s, 'bg_note', 'Clean cutover\n2× infra cost briefly\nInstant rollback', 'gold')

    e(g, 'r_note', 'bg_note', 'vs', style='dashed', color='#94a3b8')

    g.render(os.path.join(OUT, 'cmp-rolling-vs-blue-green-patterns'), cleanup=True)


# ── ALB vs NLB ────────────────────────────────────────────────────────────────
def diag_alb_vs_nlb():
    g = base_graph('alb_vs_nlb', 'ALB vs NLB — AWS Load Balancer Selection', rankdir='LR')

    n(g, 'client', 'Client\n(browser / app)', 'gray')

    with g.subgraph(name='cluster_alb') as s:
        s.attr(label='ALB — Application (L7)', style='filled,rounded',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'alb_l7', 'Layer 7: HTTP/HTTPS\nWebSocket, gRPC', 'navy')
        n(s, 'alb_route', 'Path-based routing\n/api/* → svc-a\n/app/* → svc-b', 'navy')
        n(s, 'alb_tg', 'Target: EC2, Lambda\nECS, IP, containers', 'green')
        n(s, 'alb_ssl', 'SSL termination\nWAF integration\nSticky sessions', 'teal')

    with g.subgraph(name='cluster_nlb') as s:
        s.attr(label='NLB — Network (L4)', style='filled,rounded',
               fillcolor='#dcfce7', color='#22c55e', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'nlb_l4', 'Layer 4: TCP/UDP/TLS\nExtreme low latency (<1ms)', 'green')
        n(s, 'nlb_static', 'Static IP per AZ\nElastic IP support', 'green')
        n(s, 'nlb_tg', 'Use: gaming, VoIP\nfinancial, IoT, DNS', 'gold')
        n(s, 'nlb_pass', 'Pass-through TLS\n(client IP preserved)', 'teal')

    e(g, 'client', 'alb_l7', 'HTTP/S request')
    e(g, 'client', 'nlb_l4', 'TCP/UDP packet')

    g.render(os.path.join(OUT, 'cmp-alb-vs-nlb-selection'), cleanup=True)


# ── Helm vs Kustomize ─────────────────────────────────────────────────────────
def diag_helm_vs_kustomize():
    g = base_graph('helm_vs_kustomize', 'Helm vs Kustomize — Kubernetes Config Management', rankdir='LR')

    with g.subgraph(name='cluster_helm') as s:
        s.attr(label='Helm — Package Manager (Templating)', style='filled,rounded',
               fillcolor='#fdf4ff', color='#a855f7', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'h_chart', 'Chart: templates/\n+ values.yaml', 'purple')
        n(s, 'h_templ', 'Go templates\n{{ .Values.replicaCount }}', 'purple')
        n(s, 'h_repo', 'Artifact Hub\n(pre-built charts for\nPrometheus, Nginx, etc.)', 'green')
        n(s, 'h_life', 'Release lifecycle\ninstall / upgrade / rollback', 'navy')

    with g.subgraph(name='cluster_kust') as s:
        s.attr(label='Kustomize — Overlay Patching (kubectl native)', style='filled,rounded',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'k_base', 'base/ manifests\n(plain YAML, no syntax)', 'navy')
        n(s, 'k_overlay', 'overlays/\ndev / staging / prod', 'navy')
        n(s, 'k_patch', 'Strategic merge patch\njsonpatch, nameprefix', 'teal')
        n(s, 'k_native', 'Built into kubectl\nkubectl apply -k', 'green')

    n(g, 'combo', 'Often combined:\nHelm fetch chart\nKustomize patch values', 'gold')
    e(g, 'h_chart', 'combo', '', style='dashed', color='#94a3b8')
    e(g, 'k_overlay', 'combo', '', style='dashed', color='#94a3b8')

    g.render(os.path.join(OUT, 'cmp-helm-vs-kustomize-k8s-config'), cleanup=True)


# ── Prometheus vs Datadog ──────────────────────────────────────────────────────
def diag_prometheus_vs_datadog():
    g = base_graph('prom_vs_datadog', 'Prometheus vs Datadog — Metrics & Alerting', rankdir='TB')

    with g.subgraph(name='cluster_prom') as s:
        s.attr(label='Prometheus — Open Source Pull-Based', style='filled,rounded',
               fillcolor='#fef3c7', color='#f59e0b', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'p_pull', 'Pull model\nscrape /metrics every 15s', 'gold')
        n(s, 'p_tsdb', 'Local TSDB\n(Thanos/Cortex for HA scale)', 'gold')
        n(s, 'p_ql', 'PromQL\n(powerful, steep learning curve)', 'navy')
        n(s, 'p_graf', 'Grafana dashboards\nAlertmanager → PagerDuty', 'teal')
        n(s, 'p_cost', 'Self-hosted: free\nOps burden for HA setup', 'green')

    with g.subgraph(name='cluster_dd') as s:
        s.attr(label='Datadog — SaaS All-in-One', style='filled,rounded',
               fillcolor='#fdf4ff', color='#a855f7', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'd_agent', 'Agent push model\n500+ integrations OOTB', 'purple')
        n(s, 'd_apm', 'APM + traces + logs\nunified platform', 'purple')
        n(s, 'd_ml', 'ML anomaly detection\nSLO tracking, forecasting', 'green')
        n(s, 'd_cost', 'Costly at scale\n$15–23/host/mo + overages', 'red')

    n(g, 'decision', 'Cost vs capability', 'gray')
    e(g, 'decision', 'p_cost', 'budget-sensitive\nk8s-native team')
    e(g, 'decision', 'd_agent', 'enterprise\nfull observability stack')

    g.render(os.path.join(OUT, 'cmp-prometheus-vs-datadog-metrics'), cleanup=True)


if __name__ == '__main__':
    diag_ec2_vs_lambda()
    diag_ecs_vs_eks()
    diag_containers_vs_serverless()
    diag_s3_efs_ebs()
    diag_rds_vs_dynamodb()
    diag_sql_vs_nosql()
    diag_sqs_vs_sns()
    diag_kafka_vs_sqs()
    diag_github_actions_vs_jenkins()
    diag_cloudwatch_vs_datadog()
    diag_blue_green_vs_canary()
    diag_rolling_vs_blue_green()
    diag_alb_vs_nlb()
    diag_helm_vs_kustomize()
    diag_prometheus_vs_datadog()
    print('All comparisons diagrams generated.')
