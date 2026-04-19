#!/usr/bin/env python3
"""
Generate research-informed diagrams for Ad Click Aggregation topic.
Based on Uber, Meta, Google ad infrastructure patterns.
"""
import graphviz
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'ad-click-aggregation')
os.makedirs(OUT, exist_ok=True)

# Modern style constants
NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue', fontsize='11',
            penwidth='1.5', height='0.5', margin='0.15,0.1')
EDGE = dict(fontname='Helvetica Neue', fontsize='10', penwidth='1.5')

C = {
    'client':  ('#dbeafe', '#3b82f6', '#1e40af'),   # blue — clients/users
    'service': ('#dcfce7', '#22c55e', '#166534'),    # green — services
    'queue':   ('#fef3c7', '#f59e0b', '#92400e'),    # yellow — queues/streams
    'db':      ('#e0e7ff', '#6366f1', '#3730a3'),    # purple — databases
    'cache':   ('#fce7f3', '#ec4899', '#9d174d'),    # pink — cache/state
    'process': ('#ffedd5', '#f97316', '#9a3412'),    # orange — processing
    'output':  ('#ccfbf1', '#14b8a6', '#115e59'),    # teal — output/results
    'alert':   ('#fee2e2', '#ef4444', '#991b1b'),    # red — alerts/fraud
    'gray':    ('#f3f4f6', '#6b7280', '#374151'),    # gray — infra
}

def n(g, name, label, color_key):
    fill, border, font = C[color_key]
    g.node(name, label, fillcolor=fill, color=border, fontcolor=font, **NODE)

def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)

def new_graph(title, direction='LR'):
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.5', nodesep='0.7', ranksep='0.8',
           splines='spline', rankdir=direction,
           label=f'  {title}  ', labelloc='t',
           fontsize='15', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    return g


# ═══════════════════════════════════════════════════════════════════
# 1. CLICK PROCESSING PIPELINE (main architecture)
# ═══════════════════════════════════════════════════════════════════
def click_pipeline():
    g = new_graph('Click Processing Pipeline (Lambda Architecture)')

    # Ingestion
    n(g, 'user', 'User clicks ad\non publisher page', 'client')
    n(g, 'edge', 'CDN Edge\n(regional, <50ms)\nHMAC verify', 'gray')
    n(g, 'ingest', 'Ingestion Service\nvalidate + stamp\nHTTP 302 redirect', 'service')
    n(g, 'kafka', 'Apache Kafka\n(clicks topic)\n1000+ partitions\n7-day retention', 'queue')

    # Dual path
    n(g, 'flink', 'Apache Flink\n(stream processing)\ndedup → window → agg\nexactly-once', 'process')
    n(g, 'spark', 'Apache Spark\n(batch, hourly)\nfull dedup + fraud ML\nbilling truth', 'process')

    # Storage
    n(g, 'clickhouse', 'ClickHouse\n(OLAP, hot)\n<50ms queries\n30-day retention', 'db')
    n(g, 'warehouse', 'Data Warehouse\n(BigQuery/Snowflake)\nbilling authority\n3+ year retention', 'db')
    n(g, 's3', 'S3 Archive\n(raw events)\nParquet/ORC\n20TB/day', 'db')

    # Output
    n(g, 'dashboard', 'Real-time\nDashboard\n(1-5s fresh)', 'output')
    n(g, 'billing', 'Billing\nReports\n(24hr SLA)', 'output')
    n(g, 'recon', 'Reconciliation\n(daily)\nstream vs batch\n<1% drift', 'alert')

    # Flow
    e(g, 'user', 'edge', '① click event', '#3b82f6')
    e(g, 'edge', 'ingest', '② validate\n+ HMAC check', '#22c55e')
    e(g, 'ingest', 'kafka', '③ publish\n(at-least-once)', '#f59e0b')
    e(g, 'kafka', 'flink', '④ stream\npath', '#f97316')
    e(g, 'kafka', 's3', '⑤ archive\nraw events', '#6366f1', 'dashed')
    e(g, 's3', 'spark', '⑥ batch\npath (hourly)', '#f97316')
    e(g, 'flink', 'clickhouse', '⑦ upsert\naggregates', '#6366f1')
    e(g, 'spark', 'warehouse', '⑧ write\nbilling truth', '#6366f1')
    e(g, 'clickhouse', 'dashboard', '⑨ query', '#14b8a6')
    e(g, 'warehouse', 'billing', '⑩ reports', '#14b8a6')
    e(g, 'clickhouse', 'recon', 'compare', '#ef4444', 'dashed')
    e(g, 'warehouse', 'recon', 'compare', '#ef4444', 'dashed')

    g.render(os.path.join(OUT, 'flow-click-pipeline'), cleanup=True)


# ═══════════════════════════════════════════════════════════════════
# 2. FRAUD DETECTION FLOW (two-stage)
# ═══════════════════════════════════════════════════════════════════
def fraud_detection():
    g = new_graph('Two-Stage Fraud Detection Pipeline')

    n(g, 'click', 'Incoming\nClick Event', 'client')

    # Stage 1: Real-time
    n(g, 'hmac', 'HMAC Token\nVerification\n(prevent forgery)', 'service')
    n(g, 'dedup', 'Redis Dedup\n(click_id, 5min TTL)\ncatch SDK retries', 'cache')
    n(g, 'rules', 'Real-time Rules\n(velocity check,\nIP reputation,\nbot fingerprint)', 'process')
    n(g, 'score', 'Fraud Score\n(0-100)\nthreshold: 70', 'alert')

    # Stage 2: Batch
    n(g, 'ml', 'Offline ML Model\n(XGBoost, hourly)\nclick patterns,\ndevice clusters', 'process')
    n(g, 'reclassify', 'Reclassify\n(upgrade/downgrade\nfraud flags)', 'alert')

    # Output
    n(g, 'clean', 'Clean Events\n→ aggregation\n→ billing', 'output')
    n(g, 'flagged', 'Flagged Events\n→ quarantine\n→ investigation', 'alert')

    e(g, 'click', 'hmac', '① verify\ntoken', '#22c55e')
    e(g, 'hmac', 'dedup', '② check\nduplicate', '#ec4899')
    e(g, 'dedup', 'rules', '③ apply\nrules', '#f97316')
    e(g, 'rules', 'score', '④ compute\nscore', '#ef4444')
    e(g, 'score', 'clean', 'score < 70\n(legitimate)', '#14b8a6')
    e(g, 'score', 'flagged', 'score ≥ 70\n(suspicious)', '#ef4444')
    e(g, 'flagged', 'ml', '⑤ batch\nreview', '#f97316', 'dashed')
    e(g, 'ml', 'reclassify', '⑥ ML\nverdict', '#ef4444')
    e(g, 'reclassify', 'clean', 'false\npositive', '#14b8a6', 'dashed')

    g.render(os.path.join(OUT, 'flow-fraud-detection'), cleanup=True)


# ═══════════════════════════════════════════════════════════════════
# 3. EXACTLY-ONCE PROCESSING (Flink checkpointing)
# ═══════════════════════════════════════════════════════════════════
def exactly_once():
    g = new_graph('Exactly-Once Semantics (Three-Part Recipe)', 'TB')

    n(g, 'kafka', 'Kafka\n(source)\noffset tracking', 'queue')
    n(g, 'flink', 'Flink Job\n(stateful processing)\nRocksDB state backend', 'process')
    n(g, 'checkpoint', 'Checkpoint\n(every 60s)\nstate + offsets\n→ S3/HDFS', 'db')
    n(g, 'sink', 'Idempotent Sink\n(ClickHouse upsert)\nsame input → same output', 'output')
    n(g, 'stable_id', 'Stable Event IDs\n(click_id + source\n+ timestamp)\nclient-generated', 'service')
    n(g, 'recovery', 'On Failure:\nrestore from\nlast checkpoint\nreplay from Kafka', 'alert')

    e(g, 'kafka', 'flink', '① consume\nevents', '#f59e0b')
    e(g, 'flink', 'checkpoint', '② snapshot\nstate + offsets', '#6366f1')
    e(g, 'flink', 'sink', '③ write\naggregates', '#14b8a6')
    e(g, 'stable_id', 'flink', 'dedup key', '#22c55e', 'dashed')
    e(g, 'checkpoint', 'recovery', 'on crash', '#ef4444', 'dashed')
    e(g, 'recovery', 'kafka', 'replay from\nsaved offset', '#ef4444', 'dashed')

    g.render(os.path.join(OUT, 'deep-dive-exactly-once'), cleanup=True)


# ═══════════════════════════════════════════════════════════════════
# 4. LAMBDA ARCHITECTURE (speed + batch layers)
# ═══════════════════════════════════════════════════════════════════
def lambda_arch():
    g = new_graph('Lambda Architecture — Dual Accuracy Tiers', 'TB')

    n(g, 'source', 'Click Events\n(Kafka)', 'queue')

    # Speed layer
    with g.subgraph(name='cluster_speed') as s:
        s.attr(label='  Speed Layer (real-time, ~1% error)  ', style='filled,rounded',
               color='#f97316', fillcolor='#fff7ed', fontname='Helvetica Neue Bold',
               fontsize='11', fontcolor='#9a3412')
        n(s, 'flink', 'Apache Flink\n(1-min windows)\nHLL for uniques\napproximate counts', 'process')
        n(s, 'hot', 'ClickHouse\n(hot OLAP)\n<50ms queries', 'db')

    # Batch layer
    with g.subgraph(name='cluster_batch') as s:
        s.attr(label='  Batch Layer (hourly, <0.01% error)  ', style='filled,rounded',
               color='#6366f1', fillcolor='#eef2ff', fontname='Helvetica Neue Bold',
               fontsize='11', fontcolor='#3730a3')
        n(s, 'spark', 'Apache Spark\n(full dedup)\nexact counts\nfraud reclassification', 'process')
        n(s, 'cold', 'BigQuery\n(warehouse)\nbilling authority', 'db')

    n(g, 'dashboard', 'Dashboard\n(1-5s freshness\n~1% tolerance)', 'output')
    n(g, 'billing', 'Billing\n(24hr SLA\n<0.01% error)', 'output')
    n(g, 'recon', 'Reconciliation\n(daily comparison)\nalert if drift > 1%', 'alert')

    e(g, 'source', 'flink', 'stream', '#f97316')
    e(g, 'source', 'spark', 'batch\n(via S3)', '#6366f1')
    e(g, 'flink', 'hot', 'upsert', '#f97316')
    e(g, 'spark', 'cold', 'write', '#6366f1')
    e(g, 'hot', 'dashboard', 'query', '#14b8a6')
    e(g, 'cold', 'billing', 'report', '#14b8a6')
    e(g, 'hot', 'recon', '', '#ef4444', 'dashed')
    e(g, 'cold', 'recon', '', '#ef4444', 'dashed')

    g.render(os.path.join(OUT, 'deep-dive-lambda'), cleanup=True)


# ═══════════════════════════════════════════════════════════════════
# 5. CLICK FRAUD DETECTION PIPELINE (deep dive)
# ═══════════════════════════════════════════════════════════════════
def fraud_pipeline_deep():
    g = new_graph('Multi-Layer Click Fraud Detection')

    n(g, 'click', 'Click\nEvent', 'client')
    n(g, 'l1', 'Layer 1: Edge\nHMAC + replay\nprotection\n(<10ms)', 'service')
    n(g, 'l2', 'Layer 2: Streaming\nVelocity rules\nIP reputation\nDevice fingerprint\n(<100ms)', 'process')
    n(g, 'l3', 'Layer 3: Batch ML\nXGBoost model\nClick patterns\nNetwork analysis\n(hourly)', 'process')
    n(g, 'legit', 'Legitimate\n→ count\n→ bill', 'output')
    n(g, 'suspect', 'Suspicious\n→ quarantine\n→ manual review', 'alert')
    n(g, 'bot', 'Bot/Fraud\n→ block IP\n→ exclude\nfrom billing', 'alert')

    e(g, 'click', 'l1', '① verify', '#22c55e')
    e(g, 'l1', 'l2', '② rules', '#f97316')
    e(g, 'l2', 'legit', 'pass\n(~95%)', '#14b8a6')
    e(g, 'l2', 'suspect', 'flag\n(~4%)', '#ef4444')
    e(g, 'suspect', 'l3', '③ ML\nanalysis', '#f97316', 'dashed')
    e(g, 'l3', 'legit', 'false\npositive', '#14b8a6', 'dashed')
    e(g, 'l3', 'bot', 'confirmed\nfraud (~1%)', '#ef4444')

    g.render(os.path.join(OUT, 'deep-dive-fraud'), cleanup=True)


# ═══════════════════════════════════════════════════════════════════
# 6. TIME-WINDOW AGGREGATION WITH WATERMARKS
# ═══════════════════════════════════════════════════════════════════
def time_windows():
    g = new_graph('Time-Window Aggregation with Watermarks', 'TB')

    n(g, 'events', 'Click Event\nStream\n(event-time based)', 'queue')
    n(g, 'window', 'Tumbling Window\n(1-minute buckets)\nkeyed by ad_id', 'process')
    n(g, 'watermark', 'Watermark\n(tracks event-time\nprogress, allows\n10-min lateness)', 'service')
    n(g, 'late', 'Late Events\n(arrive after\nwindow closed)', 'alert')
    n(g, 'side', 'Side Output\n(late events routed\nto separate topic\nfor batch correction)', 'process')
    n(g, 'aggregate', 'Aggregated\nResult\n(count, spend,\nHLL unique users)', 'output')

    e(g, 'events', 'window', '① assign to\n1-min bucket', '#f97316')
    e(g, 'events', 'watermark', '② advance\nwatermark', '#22c55e')
    e(g, 'watermark', 'window', '③ trigger\nwindow close', '#22c55e')
    e(g, 'window', 'aggregate', '④ emit\nresult', '#14b8a6')
    e(g, 'events', 'late', '⑤ event arrives\nafter window', '#ef4444', 'dashed')
    e(g, 'late', 'side', '⑥ route to\nside output', '#ef4444', 'dashed')

    g.render(os.path.join(OUT, 'deep-dive-windows'), cleanup=True)


if __name__ == '__main__':
    fns = [click_pipeline, fraud_detection, exactly_once, lambda_arch, fraud_pipeline_deep, time_windows]
    for fn in fns:
        fn()
        print(f'OK: {fn.__name__}')
    print(f'\nGenerated {len(fns)} ad-click-aggregation diagrams')
