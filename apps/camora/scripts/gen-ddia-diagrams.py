#!/usr/bin/env python3
"""Generate DDIA (Designing Data-Intensive Applications) diagrams.
Standalone script — run: python3 apps/camora/scripts/gen-ddia-diagrams.py
Output PNGs: apps/camora/public/diagrams/ddia/
"""
import graphviz
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'ddia')
os.makedirs(OUT, exist_ok=True)

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue',
            fontsize='11', penwidth='1.5', height='0.42', margin='0.14,0.08')
EDGE = dict(fontname='Helvetica Neue', fontsize='9', penwidth='1.5')
C = {
    'navy':   ('#dbeafe', '#3b82f6', '#1e40af'),
    'gold':   ('#fef3c7', '#f59e0b', '#92400e'),
    'green':  ('#dcfce7', '#22c55e', '#166534'),
    'red':    ('#fee2e2', '#ef4444', '#991b1b'),
    'purple': ('#ede9fe', '#7c3aed', '#4c1d95'),
    'teal':   ('#ccfbf1', '#14b8a6', '#115e59'),
    'gray':   ('#f3f4f6', '#6b7280', '#374151'),
    'orange': ('#ffedd5', '#f97316', '#9a3412'),
    'pink':   ('#fce7f3', '#ec4899', '#9d174d'),
    'indigo': ('#e0e7ff', '#6366f1', '#3730a3'),
}


def n(g, name, label, c='navy'):
    g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)


def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '',
           color=color, fontcolor='#475569', style=style, **EDGE)


def base(name, title, rankdir='LR'):
    g = graphviz.Digraph(name, format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.3', nodesep='0.45', ranksep='0.5',
           splines='spline', rankdir=rankdir,
           label=f'  {title}  ', labelloc='t',
           fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    return g


def diag_data_systems_overview():
    g = base('ddia_data_systems', 'Typical Data-Intensive Application Stack')
    n(g, 'client', 'Client\n(browser / mobile)', 'gray')
    n(g, 'app',    'Application Server', 'navy')
    n(g, 'db',     'PostgreSQL\n(primary store,\nACID transactions)', 'navy')
    n(g, 'cache',  'Redis\n(in-memory cache,\nfast reads)', 'green')
    n(g, 'search', 'Elasticsearch\n(full-text search,\nderived index)', 'gold')
    n(g, 'queue',  'Kafka\n(event stream,\ndurable log)', 'orange')
    n(g, 'stream', 'Flink / Spark\n(stream processor,\nderived views)', 'purple')
    n(g, 'dw',     'Snowflake / Redshift\n(data warehouse,\nOLAP analytics)', 'teal')
    e(g, 'client', 'app', 'HTTP request')
    e(g, 'app', 'db', 'read / write')
    e(g, 'app', 'cache', 'cache get / set')
    e(g, 'app', 'search', 'search query')
    e(g, 'app', 'queue', 'publish event')
    e(g, 'db', 'queue', 'CDC / binlog', style='dashed')
    e(g, 'queue', 'search', 'index update', style='dashed')
    e(g, 'queue', 'stream', 'consume', style='dashed')
    e(g, 'queue', 'dw', 'ETL / ELT', style='dashed')
    g.render(os.path.join(OUT, 'data-systems-overview-01'), cleanup=True)
    print('Generated: data-systems-overview-01')


def diag_reliability_scalability():
    g = base('ddia_rsm', 'Twitter Home Timeline — Fan-out Architecture Comparison', rankdir='TB')
    with g.subgraph(name='cluster_a') as s:
        s.attr(label='Approach 1: Pull on Read', style='filled', fillcolor='#f0f9ff',
               color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'tw_a', 'User posts tweet', 'navy')
        n(s, 'db_a', 'tweets table\n(INSERT one row)', 'navy')
        n(s, 'read_a', 'Home timeline read\nJOIN tweets + follows\n300K reads/sec', 'red')
        e(s, 'tw_a', 'db_a', '4.6K writes/sec')
        e(s, 'db_a', 'read_a', 'expensive JOIN')
    with g.subgraph(name='cluster_b') as s:
        s.attr(label='Approach 2: Fan-out on Write (Twitter actual)', style='filled',
               fillcolor='#f0fdf4', color='#22c55e', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'tw_b', 'User posts tweet', 'navy')
        n(s, 'fanout', 'Fan-out worker\nlook up all N followers', 'gold')
        n(s, 'cache', 'Timeline cache\n(Redis list per user)', 'green')
        n(s, 'read_b', 'Home timeline read\nO(1) cache read', 'green')
        n(s, 'celeb', 'Celebrity (30M followers)\nfetched + merged at read', 'orange')
        e(s, 'tw_b', 'fanout', '4.6K writes/sec')
        e(s, 'fanout', 'cache', 'push to N caches')
        e(s, 'cache', 'read_b', '300K reads/sec')
        e(s, 'celeb', 'read_b', 'merge at read', style='dashed')
    g.render(os.path.join(OUT, 'reliability-scalability-01'), cleanup=True)
    print('Generated: reliability-scalability-01')


def diag_percentiles():
    g = base('ddia_percentiles', 'Response Time Percentiles and Tail Latency Amplification')
    n(g, 'p50',  'p50 = 100ms\n(median — half of\nrequests faster)', 'green')
    n(g, 'p95',  'p95 = 300ms\n(5% of requests\nslower than this)', 'gold')
    n(g, 'p99',  'p99 = 1000ms\n(1% of requests\nslower than this)', 'orange')
    n(g, 'p999', 'p999 = 10000ms\n(1 in 1000 —\noften best customers)', 'red')
    n(g, 'tail', 'Tail latency amplification\n100 backend calls:\nP(at least one slow) = 1-(0.99^100) = 63%', 'purple')
    n(g, 'hol',  'Head-of-line blocking\nSlow request holds\nqueue behind it', 'indigo')
    e(g, 'p50', 'p95', 'worse')
    e(g, 'p95', 'p99', 'worse')
    e(g, 'p99', 'p999', 'worse')
    e(g, 'p99', 'tail', 'amplified in\nfan-out calls')
    e(g, 'tail', 'hol', 'causes')
    g.render(os.path.join(OUT, 'percentiles-01'), cleanup=True)
    print('Generated: percentiles-01')


def diag_fan_out():
    g = base('ddia_fanout', 'Twitter Fan-out: Load Parameter Analysis')
    n(g, 'write', 'Tweet write\n4,600 avg / 12,000 peak\nreq/sec', 'navy')
    n(g, 'read',  'Home timeline read\n300,000 req/sec', 'purple')
    n(g, 'ratio', 'Read : Write ratio\n~65x more reads\nthan writes', 'gold')
    n(g, 'pull',  'Pull model\nSELECT + JOIN on read\n→ too slow', 'red')
    n(g, 'push',  'Push model\nFan-out on write:\n4.6K × avg 75 followers\n= 345K cache writes/sec', 'green')
    n(g, 'celeb', 'Celebrity problem\n30M followers × 12K peak\n→ push does not scale', 'orange')
    n(g, 'hybrid','Hybrid (Twitter actual)\nRegular users: push to cache\nCelebrities: pull + merge\nat read time', 'teal')
    e(g, 'write', 'ratio')
    e(g, 'read',  'ratio')
    e(g, 'ratio', 'pull', 'naive approach')
    e(g, 'ratio', 'push', 'better approach')
    e(g, 'push',  'celeb', 'breaks for')
    e(g, 'celeb', 'hybrid', 'solved by')
    e(g, 'pull',  'hybrid', 'partially kept\nfor celebs', style='dashed')
    g.render(os.path.join(OUT, 'fan-out-01'), cleanup=True)
    print('Generated: fan-out-01')


def diag_relational_vs_document():
    g = base('ddia_relational_doc', 'Resume Data: Relational (Normalized) vs Document (JSON)')
    with g.subgraph(name='cluster_rel') as s:
        s.attr(label='Relational Model — 5 normalized tables', style='filled',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'users',     'users\n(id, name, email)', 'navy')
        n(s, 'positions', 'positions\n(id, user_id, title,\ncompany, start, end)', 'navy')
        n(s, 'education', 'education\n(id, user_id, school,\ndegree, year)', 'navy')
        n(s, 'contact',   'contact_info\n(id, user_id, type, value)', 'navy')
        n(s, 'skills',    'skills\n(id, user_id, skill)', 'navy')
        e(s, 'users', 'positions', 'FK 1:N')
        e(s, 'users', 'education', 'FK 1:N')
        e(s, 'users', 'contact',   'FK 1:N')
        e(s, 'users', 'skills',    'FK 1:N')
    with g.subgraph(name='cluster_doc') as s:
        s.attr(label='Document Model — 1 JSON document', style='filled',
               fillcolor='#f0fdf4', color='#22c55e', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'doc', '{ id, name, email,\n  positions: [...],\n  education: [...],\n  contact: [...],\n  skills: [...] }', 'green')
        n(s, 'loc', 'Locality benefit:\nentire resume in\none disk read', 'teal')
        n(s, 'flex','Schema flexibility:\nadd new field without\nALTER TABLE', 'teal')
        e(s, 'doc', 'loc')
        e(s, 'doc', 'flex')
    n(g, 'tradeoff', 'Relational wins for:\nmany-to-many joins\n(e.g. organization shared\nby many users)', 'gold')
    e(g, 'users', 'tradeoff', 'normalized\nduplication avoided', style='dashed')
    g.render(os.path.join(OUT, 'relational-vs-document-01'), cleanup=True)
    print('Generated: relational-vs-document-01')


def diag_graph_data_models():
    g = base('ddia_graph', 'Property Graph — People and Locations (DDIA Chapter 2)')
    n(g, 'alice', 'Alice\n(Person)', 'navy')
    n(g, 'bob',   'Bob\n(Person)', 'navy')
    n(g, 'idaho', 'Idaho\n(Location, State)', 'green')
    n(g, 'usa',   'United States\n(Location, Country)', 'green')
    n(g, 'london','London\n(Location, City)', 'teal')
    n(g, 'europe','Europe\n(Location, Continent)', 'teal')
    n(g, 'lucy',  'Lucy\n(Person)', 'purple')
    e(g, 'alice', 'idaho',  ':BORN_IN')
    e(g, 'bob',   'idaho',  ':BORN_IN')
    e(g, 'alice', 'london', ':LIVES_IN')
    e(g, 'bob',   'london', ':LIVES_IN')
    e(g, 'alice', 'bob',    ':MARRIED_TO')
    e(g, 'idaho', 'usa',    ':WITHIN')
    e(g, 'london','europe', ':WITHIN')
    e(g, 'lucy',  'alice',  ':MOTHER_OF')
    n(g, 'cypher','Cypher query:\nMATCH (p:Person)-[:BORN_IN]->(:Location)-[:WITHIN*0..]->\n(:Country {name:"USA"})\nRETURN p.name', 'gold')
    g.render(os.path.join(OUT, 'graph-data-models-01'), cleanup=True)
    print('Generated: graph-data-models-01')


def diag_lsm_trees():
    g = base('ddia_lsm', 'LSM-Tree: Write Path and Read Path')
    n(g, 'write',    'Client Write\n(key=value)', 'navy')
    n(g, 'wal',      'WAL\n(Write-Ahead Log)\ncrash recovery', 'red')
    n(g, 'memtable', 'Memtable\n(in-memory sorted tree:\nRed-Black / AVL)\n~64MB', 'green')
    n(g, 'l0',       'L0 SSTables\n(flushed from memtable)\n4-8 files, ~64MB each', 'navy')
    n(g, 'l1',       'L1 SSTables\n(compacted)\n~256MB total', 'navy')
    n(g, 'ln',       'Ln SSTables\n(10x each level)\n~TB range', 'purple')
    n(g, 'read',     'Client Read\n(key lookup)', 'teal')
    n(g, 'bloom',    'Bloom Filter\n(key exists in this\nSSTable? maybe/no)', 'gold')
    e(g, 'write', 'wal',      'append (sync)', color='#ef4444')
    e(g, 'write', 'memtable', 'insert (fast)')
    e(g, 'memtable', 'l0',    'flush when full')
    e(g, 'l0', 'l1',          'compact (merge-sort)')
    e(g, 'l1', 'ln',          'compact...')
    e(g, 'read', 'bloom',     'check first')
    e(g, 'bloom', 'memtable', 'check 1st')
    e(g, 'bloom', 'l0',       'check 2nd')
    e(g, 'bloom', 'ln',       'check last\n(worst case)', style='dashed')
    n(g, 'systems', 'Uses: LevelDB, RocksDB,\nCassandra, HBase,\nScyllaDB, TiKV, Lucene', 'gray')
    g.render(os.path.join(OUT, 'lsm-trees-01'), cleanup=True)
    print('Generated: lsm-trees-01')


def diag_b_trees():
    g = base('ddia_btree', 'B-Tree Structure and Write Amplification vs LSM-Tree', rankdir='TB')
    with g.subgraph(name='cluster_btree') as s:
        s.attr(label='B-Tree (4KB pages, branching factor ~500)', style='filled',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'root',  'Root page\n[ref A] [ref B] [ref C]', 'navy')
        n(s, 'int1',  'Internal page\n[ref D] [ref E]', 'navy')
        n(s, 'int2',  'Internal page\n[ref F] [ref G]', 'navy')
        n(s, 'leaf1', 'Leaf page\nkey:val key:val\n(4KB on disk)', 'green')
        n(s, 'leaf2', 'Leaf page\nkey:val key:val\n(doubly linked →)', 'green')
        n(s, 'leaf3', 'Leaf page\nkey:val key:val', 'green')
        e(s, 'root', 'int1')
        e(s, 'root', 'int2')
        e(s, 'int1', 'leaf1')
        e(s, 'int1', 'leaf2')
        e(s, 'int2', 'leaf3')
        e(s, 'leaf1', 'leaf2', 'next →', style='dashed')
        e(s, 'leaf2', 'leaf3', 'next →', style='dashed')
    with g.subgraph(name='cluster_compare') as s:
        s.attr(label='B-Tree vs LSM-Tree Trade-offs', style='filled',
               fillcolor='#fefce8', color='#f59e0b', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'btree_r', 'B-Tree reads:\nFast (1 location per key)\nPredictable O(log n)', 'green')
        n(s, 'btree_w', 'B-Tree writes:\nRandom I/O (overwrite page)\nWAL + page = 2x write amp', 'orange')
        n(s, 'lsm_r',   'LSM reads:\nMay check multiple\nSSTables + Bloom filters', 'orange')
        n(s, 'lsm_w',   'LSM writes:\nSequential I/O (append)\nHigher total WA but fast', 'green')
        e(s, 'btree_r', 'btree_w', 'same structure')
        e(s, 'lsm_r', 'lsm_w', 'same structure')
    g.render(os.path.join(OUT, 'b-trees-01'), cleanup=True)
    print('Generated: b-trees-01')


def diag_indexes():
    g = base('ddia_indexes', 'Index Types: Heap, Clustered, Covering, Composite')
    n(g, 'pk',       'Primary Key\n(unique)', 'gray')
    n(g, 'heap',     'Non-clustered index\n(heap file pointer)\nExtra hop to row data\ne.g. Postgres default', 'navy')
    n(g, 'clustered','Clustered index\nRow stored IN the index\nFast PK reads\ne.g. MySQL InnoDB', 'green')
    n(g, 'covering', 'Covering index\nIncludes extra columns\nIndex-only scan possible\nINCLUDE (col1, col2)', 'teal')
    n(g, 'composite','Composite index\n(last_name, first_name)\nFirst column must match\nEnables prefix queries', 'purple')
    n(g, 'secondary','Secondary index\nNon-unique keys\nUsed by all DBs', 'gold')
    e(g, 'pk', 'heap',      'non-clustered')
    e(g, 'pk', 'clustered', 'clustered')
    e(g, 'heap', 'covering', 'optimization:\nadd columns')
    e(g, 'secondary', 'composite', 'multi-column')
    g.render(os.path.join(OUT, 'indexes-01'), cleanup=True)
    print('Generated: indexes-01')


def diag_olap_vs_oltp():
    g = base('ddia_olap_oltp', 'OLTP vs OLAP and Star Schema (Data Warehouse)')
    with g.subgraph(name='cluster_oltp') as s:
        s.attr(label='OLTP — Online Transaction Processing', style='filled',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'oltp', 'PostgreSQL / MySQL\nSmall reads + writes\nLow latency (<100ms)\nUser-facing, ACID', 'navy')
    with g.subgraph(name='cluster_etl') as s:
        s.attr(label='ETL Pipeline', style='filled', fillcolor='#fefce8',
               color='#f59e0b', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'etl', 'Extract-Transform-Load\nAirflow / dbt / Fivetran\nBatch or CDC-based', 'gold')
    with g.subgraph(name='cluster_dw') as s:
        s.attr(label='Data Warehouse — OLAP Star Schema', style='filled', fillcolor='#f0fdf4',
               color='#22c55e', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'fact',    'fact_sales\n(event: each row = 1 sale)\nbillions of rows', 'green')
        n(s, 'dim_p',   'dim_product\n(what was sold)', 'teal')
        n(s, 'dim_s',   'dim_store\n(where)', 'teal')
        n(s, 'dim_d',   'dim_date\n(when)', 'teal')
        n(s, 'dim_c',   'dim_customer\n(who)', 'teal')
        e(s, 'fact', 'dim_p', 'FK')
        e(s, 'fact', 'dim_s', 'FK')
        e(s, 'fact', 'dim_d', 'FK')
        e(s, 'fact', 'dim_c', 'FK')
    n(g, 'olap_sys', 'Redshift, Snowflake,\nBigQuery, ClickHouse\nSELECT month, SUM(revenue)\nFROM fact_sales GROUP BY month\n→ column scan, not row scan', 'purple')
    e(g, 'oltp', 'etl')
    e(g, 'etl', 'fact')
    e(g, 'fact', 'olap_sys', 'analytical\nqueries')
    g.render(os.path.join(OUT, 'olap-vs-oltp-01'), cleanup=True)
    print('Generated: olap-vs-oltp-01')


def diag_column_storage():
    g = base('ddia_column', 'Row-Oriented vs Column-Oriented Storage Layout', rankdir='TB')
    with g.subgraph(name='cluster_row') as s:
        s.attr(label='Row-Oriented (PostgreSQL, MySQL)', style='filled',
               fillcolor='#fee2e2', color='#ef4444', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'row1', 'Page: [id=1, date=2024-01, prod=69, qty=5, price=9.99]\n         [id=2, date=2024-01, prod=74, qty=2, price=4.99]', 'red')
        n(s, 'row_q', 'Query: SELECT date, SUM(qty) WHERE prod=69\n→ Must load ALL columns even though\nonly date+qty needed — wasteful I/O', 'red')
        e(s, 'row1', 'row_q', 'wasteful I/O')
    with g.subgraph(name='cluster_col') as s:
        s.attr(label='Column-Oriented (Redshift, ClickHouse, Parquet)', style='filled',
               fillcolor='#dcfce7', color='#22c55e', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'col_id',   'date column:\n[2024-01][2024-01][2024-02]...\nCompressed: RLE', 'green')
        n(s, 'col_qty',  'qty column:\n[5][2][1]...\nCompressed: bitmap', 'green')
        n(s, 'col_prod', 'prod column:\n[69][74][69]...\nCompressed: bitmap', 'green')
        n(s, 'col_q', 'Load only date+prod+qty columns.\nVectorized SIMD ops on compressed data.\nSkip price and id entirely.', 'teal')
        e(s, 'col_id',  'col_q', 'load only\nneeded cols')
        e(s, 'col_qty', 'col_q')
        e(s, 'col_prod','col_q')
    g.render(os.path.join(OUT, 'column-storage-01'), cleanup=True)
    print('Generated: column-storage-01')


def diag_encoding_formats():
    g = base('ddia_encoding', 'Encoding Format Comparison — Same Record, Different Wire Sizes')
    n(g, 'record', 'Record:\n{ name: "Martin Kleppmann",\n  favoriteNumber: 1337,\n  interests: ["daydreaming","hacking"] }', 'gray')
    n(g, 'json',   'JSON (text)\n81 bytes\nHuman-readable\nNo schema required\nAmbiguous types', 'red')
    n(g, 'msgpack','MessagePack\n~66 bytes\nCompact binary JSON\nNo schema', 'orange')
    n(g, 'thrift', 'Thrift CompactProtocol\n34 bytes\nField tags (numbers)\nForward/backward compat', 'gold')
    n(g, 'proto',  'Protocol Buffers\n33 bytes\nField tags (numbers)\n.proto schema\nForward/backward compat', 'green')
    n(g, 'avro',   'Avro\n32 bytes\nNo field tags\nMatch by field name\nSchema registry needed', 'teal')
    e(g, 'record', 'json')
    e(g, 'record', 'msgpack')
    e(g, 'record', 'thrift')
    e(g, 'record', 'proto')
    e(g, 'record', 'avro')
    n(g, 'compat', 'Compatibility:\nThrift/Proto: add optional fields\nwith new tag numbers → safe\nAvro: match by name,\ndefaults for missing fields', 'purple')
    e(g, 'thrift', 'compat', style='dashed')
    e(g, 'proto',  'compat', style='dashed')
    e(g, 'avro',   'compat', style='dashed')
    g.render(os.path.join(OUT, 'encoding-formats-01'), cleanup=True)
    print('Generated: encoding-formats-01')


def diag_schema_evolution():
    g = base('ddia_schema_evo', 'Schema Evolution: Forward vs Backward Compatibility')
    n(g, 'writer_old', 'Old Writer (v1 schema)\nFields: {name, age}', 'navy')
    n(g, 'writer_new', 'New Writer (v2 schema)\nFields: {name, age, email}', 'green')
    n(g, 'reader_old', 'Old Reader (v1 schema)\nExpects: {name, age}', 'navy')
    n(g, 'reader_new', 'New Reader (v2 schema)\nExpects: {name, age, email}', 'green')
    n(g, 'fwd', 'Forward compatible:\nOld reader handles new writer output\n→ ignores email field\nProtobuf/Thrift: unknown tags skipped\nAvro: field not in reader schema = ignored', 'teal')
    n(g, 'bwd', 'Backward compatible:\nNew reader handles old writer output\n→ email field missing\nProtobuf/Thrift: optional field = default\nAvro: reader schema has default value', 'gold')
    n(g, 'break', 'BREAKS backward compat:\nAdding REQUIRED field\nChanging field tag number\nChanging field data type', 'red')
    e(g, 'writer_new', 'reader_old', 'forward compat')
    e(g, 'writer_old', 'reader_new', 'backward compat')
    e(g, 'writer_old', 'fwd', style='dashed')
    e(g, 'reader_old', 'fwd', style='dashed')
    e(g, 'writer_new', 'bwd', style='dashed')
    e(g, 'reader_new', 'bwd', style='dashed')
    e(g, 'writer_new', 'break', style='dashed')
    g.render(os.path.join(OUT, 'schema-evolution-01'), cleanup=True)
    print('Generated: schema-evolution-01')


def diag_dataflow_modes():
    g = base('ddia_dataflow', 'Three Modes of Dataflow Between Processes')
    n(g, 'db_mode',  'Via Databases\nWriter encodes, stores\nReader decodes later\nSchema evolution critical\n"Time travel" problem', 'navy')
    n(g, 'svc_mode', 'Via Services (REST / RPC)\nClient sends request\nServer processes + responds\nChallenges: retries, timeouts,\nidempotency, version compat', 'teal')
    n(g, 'msg_mode', 'Via Message Passing\n(Kafka, RabbitMQ, Akka)\nProducer publishes event\nConsumer processes async\nDecoupled, natural fan-out', 'green')
    n(g, 'rest',     'REST\nHTTP verbs + URLs\nStateless, human-readable\nEasy to debug', 'gray')
    n(g, 'rpc',      'RPC (gRPC / Thrift)\nBinary, typed, fast\nStreaming support (gRPC)\nCode generation', 'gray')
    n(g, 'actor',    'Actor model (Akka / Erlang)\nEach actor = mailbox\nNo shared memory\nFault isolation by design', 'purple')
    e(g, 'svc_mode', 'rest', 'implementation')
    e(g, 'svc_mode', 'rpc',  'implementation')
    e(g, 'msg_mode', 'actor','extension')
    g.render(os.path.join(OUT, 'dataflow-modes-01'), cleanup=True)
    print('Generated: dataflow-modes-01')


def diag_single_leader():
    g = base('ddia_single_leader', 'Single-Leader Replication: Sync, Async, Failover')
    n(g, 'client',  'Client', 'gray')
    n(g, 'leader',  'Leader\n(accepts all writes)', 'navy')
    n(g, 'sync_f',  'Sync Follower\n(leader waits for ACK\nbefore confirming write)', 'green')
    n(g, 'async_f1','Async Follower 1\n(leader does not wait\nmay lag seconds-minutes)', 'gold')
    n(g, 'async_f2','Async Follower 2\n(async)', 'gold')
    n(g, 'wal',     'WAL / replication log\n(row-based: most common\nstatement-based: risky\nlogical/CDC: flexible)', 'purple')
    n(g, 'failover','Failover:\n1. Detect leader death (timeout)\n2. Elect new leader\n3. Reconfigure clients\nRisk: split-brain, data loss', 'red')
    e(g, 'client', 'leader',   'write')
    e(g, 'leader', 'wal',      'write to log')
    e(g, 'wal', 'sync_f',      'sync replicate', color='#22c55e')
    e(g, 'wal', 'async_f1',    'async replicate', style='dashed')
    e(g, 'wal', 'async_f2',    'async replicate', style='dashed')
    e(g, 'sync_f', 'leader',   'ACK', color='#22c55e')
    e(g, 'leader', 'client',   'confirm write')
    e(g, 'leader', 'failover', 'on failure', style='dashed')
    e(g, 'failover', 'sync_f', 'promoted to\nnew leader', style='dashed')
    g.render(os.path.join(OUT, 'single-leader-01'), cleanup=True)
    print('Generated: single-leader-01')


def diag_replication_lag():
    g = base('ddia_rep_lag', 'Replication Lag: Three Consistency Anomalies', rankdir='TB')
    with g.subgraph(name='cluster_ryw') as s:
        s.attr(label='Read-Your-Writes Violation', style='filled',
               fillcolor='#fee2e2', color='#ef4444', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'ryw1', 'User writes comment\nto Leader', 'navy')
        n(s, 'ryw2', 'User reads from\nAsync Follower (lags)\n→ comment not visible!', 'red')
        n(s, 'ryw_fix', 'Fix: read from Leader\nfor 1 min after write\nor track replication offset', 'green')
        e(s, 'ryw1', 'ryw2', 'then reads')
        e(s, 'ryw2', 'ryw_fix', 'solution')
    with g.subgraph(name='cluster_mr') as s:
        s.attr(label='Monotonic Reads Violation', style='filled',
               fillcolor='#fef3c7', color='#f59e0b', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'mr1', 'User reads from F1\n(up-to-date)\nsees the post', 'green')
        n(s, 'mr2', 'User reads from F2\n(lags more)\npost has disappeared!', 'red')
        n(s, 'mr_fix', 'Fix: route user to\nsame replica every time\n(hash user ID to replica)', 'green')
        e(s, 'mr1', 'mr2', 'then reads')
        e(s, 'mr2', 'mr_fix', 'solution')
    with g.subgraph(name='cluster_cp') as s:
        s.attr(label='Consistent Prefix Reads Violation', style='filled',
               fillcolor='#ede9fe', color='#7c3aed', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'cp1', 'A writes "How old is Pam?"\nB writes "She is 35"', 'purple')
        n(s, 'cp2', "Observer sees answer\nbefore question!\n(replication reorders writes)", 'red')
        n(s, 'cp_fix', 'Fix: causally related writes\nto same partition\nor version vectors', 'green')
        e(s, 'cp1', 'cp2', 'reorder')
        e(s, 'cp2', 'cp_fix', 'solution')
    g.render(os.path.join(OUT, 'replication-lag-01'), cleanup=True)
    print('Generated: replication-lag-01')


def diag_multi_leader():
    g = base('ddia_multi_leader', 'Multi-Leader Conflict and Leaderless Quorum')
    with g.subgraph(name='cluster_ml') as s:
        s.attr(label='Multi-Leader: Write Conflict', style='filled',
               fillcolor='#fee2e2', color='#ef4444', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'dc1_write', 'Datacenter 1 Leader\nUser A sets title = "B"', 'navy')
        n(s, 'dc2_write', 'Datacenter 2 Leader\nUser B sets title = "C"\n(concurrently)', 'navy')
        n(s, 'conflict',  'CONFLICT\nBoth committed locally\nAsync replication → conflicting versions', 'red')
        n(s, 'resolve',   'Resolution:\n1. LWW (last-write-wins) — data loss\n2. Merge (union) — for sets\n3. CRDT (auto-resolve)\n4. Custom on-write handler', 'gold')
        e(s, 'dc1_write', 'conflict')
        e(s, 'dc2_write', 'conflict')
        e(s, 'conflict', 'resolve')
    with g.subgraph(name='cluster_lless') as s:
        s.attr(label='Leaderless: Quorum (n=3, w=2, r=2)', style='filled',
               fillcolor='#f0fdf4', color='#22c55e', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'client_ll', 'Client', 'gray')
        n(s, 'r1', 'Replica 1\nACK write', 'green')
        n(s, 'r2', 'Replica 2\nACK write', 'green')
        n(s, 'r3', 'Replica 3\nDOWN', 'red')
        n(s, 'read_rep', 'Read r=2 replicas:\nread-repair stale replica\nreturn latest version', 'teal')
        e(s, 'client_ll', 'r1', 'write')
        e(s, 'client_ll', 'r2', 'write')
        e(s, 'client_ll', 'r3', 'write (fails)', style='dashed')
        e(s, 'r1', 'read_rep', 'read')
        e(s, 'r2', 'read_rep', 'read')
    g.render(os.path.join(OUT, 'multi-leader-01'), cleanup=True)
    print('Generated: multi-leader-01')


def diag_consistency_guarantees():
    g = base('ddia_consistency', 'Consistency Guarantees: Spectrum from Weak to Strong')
    n(g, 'eventual',    'Eventual Consistency\n(weakest)\nAll replicas converge\ngiven no new writes\nDynamo, Cassandra (default)', 'red')
    n(g, 'ryw',         'Read-Your-Writes\nYou always see\nyour own writes\nSession consistency', 'orange')
    n(g, 'monotonic_r', 'Monotonic Reads\nTime never goes backward\nfor one user', 'gold')
    n(g, 'consistent_p','Consistent Prefix\nCausally ordered sequence\nNo answer before question', 'green')
    n(g, 'snapshot',    'Snapshot Isolation\nConsistent snapshot\nfrom one point in time\nDefault in PostgreSQL', 'teal')
    n(g, 'linearizable','Linearizability\n(strongest)\nSingle copy illusion\nRecency guarantee\nAll reads see latest write', 'purple')
    e(g, 'eventual',    'ryw',         'stronger')
    e(g, 'ryw',         'monotonic_r', 'stronger')
    e(g, 'monotonic_r', 'consistent_p','stronger')
    e(g, 'consistent_p','snapshot',    'stronger')
    e(g, 'snapshot',    'linearizable','stronger')
    g.render(os.path.join(OUT, 'consistency-guarantees-01'), cleanup=True)
    print('Generated: consistency-guarantees-01')


def diag_partitioning():
    g = base('ddia_partition', 'Partitioning: Key Range vs Consistent Hash Ring')
    with g.subgraph(name='cluster_kr') as s:
        s.attr(label='Key Range Partitioning', style='filled',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'p1', 'Partition 1\n[A — COM]', 'navy')
        n(s, 'p2', 'Partition 2\n[CON — GZZ]', 'navy')
        n(s, 'p3', 'Partition 3\n[H — MZZ]', 'navy')
        n(s, 'p4', 'Partition 4\n[N — ZZZ]', 'navy')
        n(s, 'hot', 'HOT SPOT RISK:\nAll Jan 2024 writes\ngo to timestamp partition', 'red')
        e(s, 'p1', 'p2', 'sorted')
        e(s, 'p2', 'p3', 'sorted')
        e(s, 'p3', 'p4', 'sorted')
        e(s, 'p3', 'hot', style='dashed')
    with g.subgraph(name='cluster_hash') as s:
        s.attr(label='Consistent Hash Ring (Cassandra vnodes)', style='filled',
               fillcolor='#f0fdf4', color='#22c55e', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'ring', 'Hash ring: 0 — 2^64\nVirtual nodes (vnodes):\n256 tokens per physical node', 'green')
        n(s, 'node_a', 'Node A\n(owns multiple\nring positions)', 'teal')
        n(s, 'node_b', 'Node B', 'teal')
        n(s, 'node_c', 'Node C', 'teal')
        n(s, 'hash_key', 'hash(key) → ring position\n→ responsible node\nRange queries: scatter/gather', 'gold')
        e(s, 'ring', 'node_a')
        e(s, 'ring', 'node_b')
        e(s, 'ring', 'node_c')
        e(s, 'hash_key', 'ring')
    g.render(os.path.join(OUT, 'partitioning-01'), cleanup=True)
    print('Generated: partitioning-01')


def diag_secondary_indexes_partitioned():
    g = base('ddia_sec_idx', 'Partitioned Secondary Indexes: Local vs Global')
    with g.subgraph(name='cluster_local') as s:
        s.attr(label='Local (Document-Partitioned) Secondary Index', style='filled',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'lp1', 'Partition 1\nDocs: {id:1..50}\nLocal idx: color:red → [2,10]', 'navy')
        n(s, 'lp2', 'Partition 2\nDocs: {id:51..100}\nLocal idx: color:red → [60]', 'navy')
        n(s, 'scatter', 'READ color=red:\nSCATTER to all partitions\nGATHER and merge\n→ expensive fan-out', 'red')
        n(s, 'write_l', 'WRITE: update only\nown partition index\n→ cheap', 'green')
        e(s, 'lp1', 'scatter')
        e(s, 'lp2', 'scatter')
        e(s, 'write_l', 'lp1')
    with g.subgraph(name='cluster_global') as s:
        s.attr(label='Global (Term-Partitioned) Secondary Index', style='filled',
               fillcolor='#f0fdf4', color='#22c55e', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'gi1', 'Index Partition A-M\ncolor:blue → [doc3, doc75, doc88]', 'green')
        n(s, 'gi2', 'Index Partition N-Z\ncolor:red → [doc2, doc10, doc60]', 'green')
        n(s, 'read_g', 'READ color=red:\nQuery only partition N-Z\n→ targeted read (cheap)', 'teal')
        n(s, 'write_g', 'WRITE: must update\nall relevant index partitions\n→ async, eventual consistency\n(DynamoDB GSI)', 'orange')
        e(s, 'gi1', 'read_g')
        e(s, 'gi2', 'read_g')
        e(s, 'write_g', 'gi1')
        e(s, 'write_g', 'gi2')
    g.render(os.path.join(OUT, 'secondary-indexes-partitioned-01'), cleanup=True)
    print('Generated: secondary-indexes-partitioned-01')


def diag_rebalancing():
    g = base('ddia_rebalance', 'Partition Rebalancing Strategies')
    n(g, 'fixed',    'Fixed number of partitions\nCreate 1000 partitions\nfor 10 nodes (100 each)\nAdd node: steal 100 from each\nKafka, Riak, Elasticsearch', 'navy')
    n(g, 'dynamic',  'Dynamic partitioning\nSplit when partition > max size\n(HBase default 10GB)\nMerge when < min size\nHBase, RethinkDB, MongoDB', 'green')
    n(g, 'prop',     'Proportional to nodes\nFixed N partitions per node\nAdd node: split existing,\nassign half to new node\nCassandra: ~256 vnodes', 'teal')
    n(g, 'auto_vs',  'Automatic vs Manual:\nAutomatic = convenient,\nbut can cascade under load\nManual = safer, predictable\nCassandra: auto but overridable', 'gold')
    e(g, 'fixed', 'auto_vs',   'tradeoff')
    e(g, 'dynamic', 'auto_vs', 'tradeoff')
    e(g, 'prop', 'auto_vs',    'tradeoff')
    g.render(os.path.join(OUT, 'rebalancing-01'), cleanup=True)
    print('Generated: rebalancing-01')


def diag_acid():
    g = base('ddia_acid', 'ACID Properties — What Each Guarantees', rankdir='TB')
    n(g, 'atomicity', 'ATOMICITY\n(not about concurrency)\nAll writes succeed or\nall are rolled back.\nWAL undo log on crash.\n"Abortability"', 'navy')
    n(g, 'consistency','CONSISTENCY\n(application-level invariant)\nNOT a database property —\nDB provides A+I+D as tools.\nApp must enforce:\naccount balance >= 0', 'gold')
    n(g, 'isolation', 'ISOLATION\nConcurrent transactions\nappear to execute serially.\nLevels: Read Committed,\nSnapshot, Serializable.', 'green')
    n(g, 'durability', 'DURABILITY\nCommitted data survives\ncrashes and power loss.\nWAL fsync before ACK.\nReplication to multiple nodes.', 'purple')
    n(g, 'tradeoff', 'Tradeoff:\nStronger isolation → lower throughput\nWeaker isolation → anomalies\nMost DBs default to Read Committed', 'orange')
    e(g, 'atomicity', 'tradeoff')
    e(g, 'isolation', 'tradeoff')
    g.render(os.path.join(OUT, 'acid-01'), cleanup=True)
    print('Generated: acid-01')


def diag_mvcc():
    g = base('ddia_mvcc', 'MVCC — Snapshot Isolation Transaction Timeline')
    n(g, 'txn42',  'Transaction T42\n(writer)\nstarted at t=1', 'navy')
    n(g, 'txn43',  'Transaction T43\n(reader)\nstarted at t=2', 'teal')
    n(g, 'row_v1', 'Row version 1:\ncreated_by=T35\nvalue = "old value"', 'gray')
    n(g, 'row_v2', 'Row version 2:\ncreated_by=T42\nvalue = "new value"\n(uncommitted)', 'orange')
    n(g, 'row_v3', 'Row version 2 (committed):\ncreated_by=T42\ncommitted at t=3', 'green')
    n(g, 't43_sees', 'T43 snapshot at t=2:\nT42 not yet committed\n→ T43 reads "old value"\n(version 1)\nNo lock needed!', 'teal')
    n(g, 'gc',      'Garbage collection:\nold versions cleaned up\nwhen no transaction\nneeds them anymore', 'gray')
    e(g, 'txn42', 'row_v2',  'writes (uncommitted)')
    e(g, 'row_v2', 'row_v3', 'commits at t=3')
    e(g, 'row_v1', 't43_sees','T43 sees this')
    e(g, 'row_v3', 't43_sees','T43 does NOT see\n(started before commit)', style='dashed')
    e(g, 'row_v1', 'gc',      'eventually', style='dashed')
    g.render(os.path.join(OUT, 'isolation-levels-01'), cleanup=True)
    print('Generated: isolation-levels-01')


def diag_write_skew():
    g = base('ddia_write_skew', 'Write Skew and Phantom Reads — Concurrency Anomalies', rankdir='TB')
    with g.subgraph(name='cluster_lost') as s:
        s.attr(label='Lost Update (counter increment)', style='filled',
               fillcolor='#fee2e2', color='#ef4444', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'lu1', 'T1: READ counter = 0', 'navy')
        n(s, 'lu2', 'T2: READ counter = 0', 'navy')
        n(s, 'lu3', 'T1: WRITE counter = 1', 'green')
        n(s, 'lu4', 'T2: WRITE counter = 1\n(overwrites T1)\nResult: 1 not 2!', 'red')
        n(s, 'lu_fix', 'Fix: atomic UPDATE\ncounter = counter+1\nor SELECT FOR UPDATE', 'teal')
        e(s, 'lu1', 'lu3'); e(s, 'lu2', 'lu4')
        e(s, 'lu3', 'lu4', 'T2 overwrites')
        e(s, 'lu4', 'lu_fix')
    with g.subgraph(name='cluster_ws') as s:
        s.attr(label='Write Skew (on-call doctors)', style='filled',
               fillcolor='#fef3c7', color='#f59e0b', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'ws1', 'T1 (Alice): SELECT count(*)\nFROM doctors WHERE on_call=true\n→ count = 2. OK to go off call.', 'navy')
        n(s, 'ws2', 'T2 (Bob): SELECT count(*)\nFROM doctors WHERE on_call=true\n→ count = 2. OK to go off call.', 'navy')
        n(s, 'ws3', 'T1: UPDATE Alice set on_call=false\nT2: UPDATE Bob set on_call=false\nBOTH COMMIT', 'gold')
        n(s, 'ws4', 'Result: 0 doctors on call!\nRead committed + snapshot\nboth allow this!', 'red')
        n(s, 'ws_fix', 'Fix: SELECT FOR UPDATE\nor serializable isolation', 'green')
        e(s, 'ws1', 'ws3'); e(s, 'ws2', 'ws3')
        e(s, 'ws3', 'ws4'); e(s, 'ws4', 'ws_fix')
    g.render(os.path.join(OUT, 'write-skew-01'), cleanup=True)
    print('Generated: write-skew-01')


def diag_serializability():
    g = base('ddia_serial', '2PL vs SSI — Two Approaches to Serializability')
    with g.subgraph(name='cluster_2pl') as s:
        s.attr(label='Two-Phase Locking (2PL) — Pessimistic', style='filled',
               fillcolor='#fee2e2', color='#ef4444', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, '2pl_t1', 'T1: acquires\nshared lock on row\n(read)', 'navy')
        n(s, '2pl_t2', 'T2: wants\nexclusive lock\n(write)', 'navy')
        n(s, '2pl_block', 'T2 BLOCKS\nwaiting for T1\nto release lock', 'red')
        n(s, '2pl_dead', 'Deadlock risk:\nT1 waits for T2\nT2 waits for T1\n→ DB detects + aborts one', 'orange')
        e(s, '2pl_t1', '2pl_block', 'T1 holds lock')
        e(s, '2pl_t2', '2pl_block', 'T2 blocked')
        e(s, '2pl_block', '2pl_dead', 'if circular wait')
    with g.subgraph(name='cluster_ssi') as s:
        s.attr(label='Serializable Snapshot Isolation (SSI) — Optimistic', style='filled',
               fillcolor='#f0fdf4', color='#22c55e', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'ssi_t1', 'T1 proceeds\n(no lock)\ntracks read set', 'green')
        n(s, 'ssi_t2', 'T2 proceeds\n(no lock)\ntracks write set', 'green')
        n(s, 'ssi_chk', 'At commit:\ncheck if T2 write\naffected T1 read set', 'teal')
        n(s, 'ssi_abort','Conflict detected:\nT1 aborts + retries\n(no conflict = both commit)', 'orange')
        n(s, 'ssi_used', 'Used by: PostgreSQL,\nCockroachDB, FoundationDB', 'teal')
        e(s, 'ssi_t1', 'ssi_chk')
        e(s, 'ssi_t2', 'ssi_chk')
        e(s, 'ssi_chk', 'ssi_abort', 'if conflict')
        e(s, 'ssi_abort', 'ssi_used', style='dashed')
    g.render(os.path.join(OUT, 'serializability-01'), cleanup=True)
    print('Generated: serializability-01')


def diag_distributed_transactions():
    g = base('ddia_2pc', 'Two-Phase Commit (2PC) — Happy Path and Coordinator Failure')
    with g.subgraph(name='cluster_happy') as s:
        s.attr(label='2PC Happy Path', style='filled',
               fillcolor='#f0fdf4', color='#22c55e', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'coord',  'Coordinator\n(transaction manager)', 'navy')
        n(s, 'p1',     'Participant 1\n(DB node A)', 'teal')
        n(s, 'p2',     'Participant 2\n(DB node B)', 'teal')
        n(s, 'ph1',    'Phase 1: PREPARE\nCoord sends prepare to all\nEach writes to WAL\nand votes yes/no', 'green')
        n(s, 'ph2',    'Phase 2: COMMIT\nIf all vote yes:\ncoord writes COMMIT\nsends commit to all', 'green')
        e(s, 'coord', 'p1', 'PREPARE')
        e(s, 'coord', 'p2', 'PREPARE')
        e(s, 'p1', 'coord', 'vote YES')
        e(s, 'p2', 'coord', 'vote YES')
        e(s, 'ph1', 'ph2', 'if all yes')
    with g.subgraph(name='cluster_fail') as s:
        s.attr(label='Coordinator Failure — Participants Stuck "In Doubt"', style='filled',
               fillcolor='#fee2e2', color='#ef4444', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'coord_fail', 'Coordinator\nCRASHES after Phase 1\nbefore sending COMMIT', 'red')
        n(s, 'stuck1',     'Participant 1\nWaiting for COMMIT/ABORT\nHolds locks\n"In doubt" state', 'red')
        n(s, 'stuck2',     'Participant 2\nAlso in doubt\nDatabase BLOCKED\nuntil coordinator recovers', 'red')
        n(s, 'recover',    'Recovery:\nCoordinator reads WAL\nafter restart\nResumes last known decision', 'gold')
        e(s, 'coord_fail', 'stuck1', 'no message')
        e(s, 'coord_fail', 'stuck2', 'no message')
        e(s, 'recover', 'stuck1', 'sends decision')
        e(s, 'recover', 'stuck2')
    g.render(os.path.join(OUT, 'distributed-transactions-2pc-01'), cleanup=True)
    print('Generated: distributed-transactions-2pc-01')


def diag_faults_networks():
    g = base('ddia_faults', 'Distributed Systems: Network Faults and Clock Problems')
    with g.subgraph(name='cluster_net') as s:
        s.attr(label='Network Fault Taxonomy — Cannot Distinguish Without Timeout', style='filled',
               fillcolor='#fee2e2', color='#ef4444', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'client_n', 'Client sends request\n(then waits...)', 'gray')
        n(s, 'req_lost', 'Request lost\n(packet dropped)', 'red')
        n(s, 'srv_slow', 'Server alive but slow\n(GC pause, I/O wait)', 'orange')
        n(s, 'srv_dead', 'Server crashed\n(OS down)', 'red')
        n(s, 'resp_lost','Response lost\n(return packet dropped)', 'red')
        n(s, 'timeout',  'ALL LOOK IDENTICAL\nfrom client perspective\n→ must use timeout\nBut timeout = guesswork', 'purple')
        e(s, 'client_n', 'req_lost')
        e(s, 'client_n', 'srv_slow')
        e(s, 'client_n', 'srv_dead')
        e(s, 'client_n', 'resp_lost')
        e(s, 'req_lost', 'timeout')
        e(s, 'srv_slow', 'timeout')
        e(s, 'srv_dead', 'timeout')
        e(s, 'resp_lost', 'timeout')
    with g.subgraph(name='cluster_clock') as s:
        s.attr(label='Clock Unreliability', style='filled',
               fillcolor='#fef3c7', color='#f59e0b', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'ntp',    'NTP accuracy:\n10-100ms typical\nspikes to 1s+ possible\nCan go backward (slew)', 'gold')
        n(s, 'truetime','Google TrueTime:\nGPS + atomic clocks\nBounded uncertainty 0-7ms\nSpanner: global transactions', 'green')
        n(s, 'logical', 'Logical clocks\n(Lamport timestamps):\nMeasure event ordering\nSafe for causality', 'teal')
        e(s, 'ntp', 'truetime', 'improved by')
        e(s, 'ntp', 'logical', 'alternative: avoid\nwall-clock time')
    g.render(os.path.join(OUT, 'faults-networks-01'), cleanup=True)
    print('Generated: faults-networks-01')


def diag_linearizability():
    g = base('ddia_linear', 'Linearizability Test and CAP Theorem')
    with g.subgraph(name='cluster_test') as s:
        s.attr(label='Linearizability Violation Test', style='filled',
               fillcolor='#fee2e2', color='#ef4444', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'write1', 'Client A writes x=1\n(operation overlaps t=0..t=2)', 'navy')
        n(s, 'read1', 'Client B reads x\n→ gets 1 (new value)', 'green')
        n(s, 'read2', 'Client C reads x\n→ gets 0 (old value!)\nVIOLATION: C must also\nsee 1 after B saw 1', 'red')
        e(s, 'write1', 'read1')
        e(s, 'read1', 'read2', 'C reads AFTER\nB already saw new value')
    with g.subgraph(name='cluster_cap') as s:
        s.attr(label='CAP Theorem (Brewer 2000)', style='filled',
               fillcolor='#ede9fe', color='#7c3aed', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'C', 'Consistency\n(Linearizability)\nAll nodes see same\ndata simultaneously', 'purple')
        n(s, 'A', 'Availability\nEvery request\nreceives a response\n(not an error)', 'green')
        n(s, 'P', 'Partition Tolerance\nSystem continues\ndespite network\npartitions', 'navy')
        n(s, 'cap_choice', 'Network partitions\nare UNAVOIDABLE.\nReal choice: C vs A\nduring a partition.\nPACELC: Latency vs\nConsistency trade-off', 'gold')
        e(s, 'P', 'cap_choice', 'must tolerate')
        e(s, 'C', 'cap_choice', 'tradeoff')
        e(s, 'A', 'cap_choice', 'tradeoff')
    g.render(os.path.join(OUT, 'linearizability-01'), cleanup=True)
    print('Generated: linearizability-01')


def diag_ordering_causality():
    g = base('ddia_causality', 'Ordering and Causality: Lamport Clocks and Version Vectors')
    n(g, 'happens_before', 'Happens-before (causal order):\nA happened before B if:\n1. A and B on same node, A before B\n2. A sends message, B receives it\n3. Transitive: A→B, B→C → A→C', 'navy')
    n(g, 'concurrent',     'Concurrent operations:\nNeither A→B nor B→A\nHappened independently\nConflicts in multi-leader systems', 'orange')
    n(g, 'lamport',        'Lamport Timestamps:\nCounter incremented on each event\nMax(local, received) + 1 on receive\nTotal ordering consistent with causality\nBut: cannot tell if two are concurrent', 'gold')
    n(g, 'version_vec',    'Version Vectors:\n{nodeA: 3, nodeB: 2, nodeC: 5}\nOne counter per replica\nDetects concurrent writes\nUsed by Riak, Voldemort', 'teal')
    n(g, 'total_order',    'Total Order Broadcast:\nAll nodes see same order\n= consensus problem\nRaft log is totally ordered\nKafka partition is totally ordered', 'purple')
    e(g, 'happens_before', 'concurrent', 'vs')
    e(g, 'happens_before', 'lamport', 'approximated by')
    e(g, 'concurrent', 'version_vec', 'detected by')
    e(g, 'lamport', 'total_order', 'extended to')
    g.render(os.path.join(OUT, 'ordering-and-causality-01'), cleanup=True)
    print('Generated: ordering-and-causality-01')


def diag_consensus_raft():
    g = base('ddia_raft', 'Raft Consensus: Leader Election and Log Replication')
    with g.subgraph(name='cluster_states') as s:
        s.attr(label='Raft Node State Machine', style='filled',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'follower',   'FOLLOWER\n(default state)\nApplies committed\nlog entries', 'navy')
        n(s, 'candidate',  'CANDIDATE\n(election timeout\nexpired, no heartbeat)', 'gold')
        n(s, 'leader',     'LEADER\n(won election:\nmajority votes)\nSends heartbeats', 'green')
        e(s, 'follower', 'candidate', 'timeout\n(150-300ms random)')
        e(s, 'candidate', 'leader',   'majority\nvotes received')
        e(s, 'candidate', 'follower', 'sees valid\nleader / higher term')
        e(s, 'leader',  'follower',   'new term\nleader found')
    with g.subgraph(name='cluster_log') as s:
        s.attr(label='Log Replication', style='filled',
               fillcolor='#f0fdf4', color='#22c55e', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'client_r', 'Client write', 'gray')
        n(s, 'ldr',      'Leader\nappends to local log\nindex=42, term=3', 'green')
        n(s, 'f1',       'Follower 1\nAppendEntries\n→ ACK', 'teal')
        n(s, 'f2',       'Follower 2\nAppendEntries\n→ ACK', 'teal')
        n(s, 'f3',       'Follower 3\n(slow / partitioned)\nno ACK', 'red')
        n(s, 'commit',   'MAJORITY ACK (2 of 3)\n→ entry committed\n→ leader responds to client', 'green')
        e(s, 'client_r', 'ldr')
        e(s, 'ldr', 'f1', 'AppendEntries')
        e(s, 'ldr', 'f2', 'AppendEntries')
        e(s, 'ldr', 'f3', 'AppendEntries', style='dashed')
        e(s, 'f1', 'commit', 'ACK')
        e(s, 'f2', 'commit', 'ACK')
    g.render(os.path.join(OUT, 'consensus-01'), cleanup=True)
    print('Generated: consensus-01')


def diag_zookeeper():
    g = base('ddia_zk', 'ZooKeeper: Distributed Coordination Service')
    n(g, 'zk',         'ZooKeeper Ensemble\n(3 or 5 nodes, ZAB consensus)\nLinearizable reads/writes\nTotal ordering of operations', 'navy')
    n(g, 'ephemeral',  'Ephemeral nodes:\nauto-deleted when\nsession ends (client dies)\n→ distributed failure detector', 'red')
    n(g, 'watches',    'Watches:\nclient registers watch\non znode path\nZK pushes notification\nwhen znode changes', 'gold')
    n(g, 'leader_el',  'Leader election:\ncreate ephemeral node\n/election/leader\nFirst to create = leader\nOthers watch → re-elect', 'green')
    n(g, 'partition',  'Partition ownership:\nKafka brokers register\npartition assignments\nin ZK (pre-KRaft)', 'teal')
    n(g, 'config',     'Distributed config:\nstore config in znodes\nApplications watch\nfor config changes', 'purple')
    n(g, 'etcd',       'etcd (Raft-based):\nKubernetes uses etcd\nfor all cluster state\nsimpler API, same guarantees', 'orange')
    e(g, 'zk', 'ephemeral')
    e(g, 'zk', 'watches')
    e(g, 'ephemeral', 'leader_el', 'used for')
    e(g, 'watches', 'partition', 'used for')
    e(g, 'watches', 'config', 'used for')
    e(g, 'zk', 'etcd', 'modern alternative')
    g.render(os.path.join(OUT, 'zookeeper-and-coordination-01'), cleanup=True)
    print('Generated: zookeeper-and-coordination-01')


def diag_mapreduce():
    g = base('ddia_mapreduce', 'MapReduce Word Count — Data Flow Through Cluster')
    n(g, 'input',   'HDFS Input\nfile1.txt: "the cat sat"\nfile2.txt: "the cat ate"', 'gray')
    n(g, 'map1',    'Map Task 1\n(the,1)(cat,1)(sat,1)', 'teal')
    n(g, 'map2',    'Map Task 2\n(the,1)(cat,1)(ate,1)', 'teal')
    n(g, 'shuffle', 'Shuffle + Sort\n(network transfer)\nGroup by key:\ncal:[1,1] on:[1]\nsat:[1] the:[1,1]', 'gold')
    n(g, 'red1',    'Reduce Task 1\ncal→2  on→1', 'green')
    n(g, 'red2',    'Reduce Task 2\nsat→1  the→2', 'green')
    n(g, 'output',  'HDFS Output\npart-00000\npart-00001', 'purple')
    n(g, 'limit',   'MapReduce limits:\nEach job = 1 Map+Reduce phase\nChaining → HDFS writes between jobs\nHigh latency batch workloads', 'red')
    e(g, 'input', 'map1'); e(g, 'input', 'map2')
    e(g, 'map1', 'shuffle'); e(g, 'map2', 'shuffle')
    e(g, 'shuffle', 'red1'); e(g, 'shuffle', 'red2')
    e(g, 'red1', 'output'); e(g, 'red2', 'output')
    e(g, 'output', 'limit', style='dashed')
    g.render(os.path.join(OUT, 'mapreduce-01'), cleanup=True)
    print('Generated: mapreduce-01')


def diag_beyond_mapreduce():
    g = base('ddia_spark', 'MapReduce Job Chain vs Spark DAG — Intermediate State')
    with g.subgraph(name='cluster_mr') as s:
        s.attr(label='MapReduce Multi-Step (HDFS writes between every step)', style='filled',
               fillcolor='#fee2e2', color='#ef4444', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'mr_in',   'HDFS Input', 'gray')
        n(s, 'mr_job1', 'Job 1 (Map+Reduce)', 'red')
        n(s, 'mr_hdfs1','HDFS write\n(intermediate)', 'orange')
        n(s, 'mr_job2', 'Job 2 (Map+Reduce)', 'red')
        n(s, 'mr_out',  'HDFS Output', 'gray')
        e(s, 'mr_in', 'mr_job1'); e(s, 'mr_job1', 'mr_hdfs1')
        e(s, 'mr_hdfs1', 'mr_job2'); e(s, 'mr_job2', 'mr_out')
    with g.subgraph(name='cluster_spark') as s:
        s.attr(label='Spark DAG (in-memory pipeline, lineage for fault tolerance)', style='filled',
               fillcolor='#f0fdf4', color='#22c55e', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'sp_in',   'HDFS Input', 'gray')
        n(s, 'sp_rdd1', 'RDD 1: filter()', 'green')
        n(s, 'sp_rdd2', 'RDD 2: map()', 'green')
        n(s, 'sp_rdd3', 'RDD 3: groupByKey()', 'green')
        n(s, 'sp_out',  'Output', 'gray')
        e(s, 'sp_in', 'sp_rdd1'); e(s, 'sp_rdd1', 'sp_rdd2')
        e(s, 'sp_rdd2', 'sp_rdd3'); e(s, 'sp_rdd3', 'sp_out')
    g.render(os.path.join(OUT, 'beyond-mapreduce-01'), cleanup=True)
    print('Generated: beyond-mapreduce-01')


def diag_batch_joins():
    g = base('ddia_batch_joins', 'Batch Join Algorithms: Sort-Merge vs Broadcast Hash vs Partition Hash')
    n(g, 'sort_merge', 'Sort-Merge Join\n(Reducer-side)\n1. Map: tag records with join key\n2. Shuffle: same key → same reducer\n3. Reducer: merge interleaved records\nWorks for any dataset size', 'navy')
    n(g, 'broadcast',  'Broadcast Hash Join\n(Map-side)\n1. Load SMALL dataset into RAM hash table\n2. Send copy to EVERY mapper\n3. Mapper probes hash for each large-side record\nNo reduce phase\nRequires: small side fits in RAM', 'green')
    n(g, 'partition',  'Partition Hash Join\n(Map-side)\n1. Both datasets partitioned same way\n2. Mapper joins matching partitions\nNo shuffle needed\nRequires: both datasets partitioned identically', 'teal')
    n(g, 'skew',       'Hot Key / Skew Handling\nCelebrity key (high volume)\ngoes to one reducer → bottleneck.\nPig "skewed join": sample first,\nsplit hot keys across N reducers', 'orange')
    e(g, 'sort_merge', 'skew', 'skew problem')
    g.render(os.path.join(OUT, 'joins-in-batch-01'), cleanup=True)
    print('Generated: joins-in-batch-01')


def diag_event_streams():
    g = base('ddia_streams', 'Traditional Broker vs Log-Based Broker (Kafka)')
    with g.subgraph(name='cluster_amqp') as s:
        s.attr(label='Traditional Broker (RabbitMQ / ActiveMQ)', style='filled',
               fillcolor='#fee2e2', color='#ef4444', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'prod_a',  'Producer', 'navy')
        n(s, 'broker',  'Broker\n(queue)', 'orange')
        n(s, 'cons_a',  'Consumer\nreceives + ACKs', 'red')
        n(s, 'delete',  'Message DELETED\nafter ACK\nNot replayable\nPush-based', 'red')
        e(s, 'prod_a', 'broker', 'publish')
        e(s, 'broker', 'cons_a', 'push')
        e(s, 'cons_a', 'broker', 'ACK')
        e(s, 'broker', 'delete', 'deletes message')
    with g.subgraph(name='cluster_kafka') as s:
        s.attr(label='Log-Based Broker (Kafka / Kinesis)', style='filled',
               fillcolor='#f0fdf4', color='#22c55e', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'prod_k',  'Producer', 'navy')
        n(s, 'log',     'Partitioned Log\n(append-only)\noffset=0..N\nRetained 7 days or forever', 'green')
        n(s, 'cg1',     'Consumer Group 1\n(offset=450)\n→ analytics', 'teal')
        n(s, 'cg2',     'Consumer Group 2\n(offset=448)\n→ search index', 'teal')
        n(s, 'cg3',     'Consumer Group 3\n(offset=0)\n→ reprocessing', 'purple')
        n(s, 'retain',  'Messages RETAINED\nReplayable from any offset\nPull-based, high throughput', 'green')
        e(s, 'prod_k', 'log', 'append')
        e(s, 'log', 'cg1')
        e(s, 'log', 'cg2')
        e(s, 'log', 'cg3')
        e(s, 'log', 'retain', style='dashed')
    g.render(os.path.join(OUT, 'event-streams-01'), cleanup=True)
    print('Generated: event-streams-01')


def diag_cdc():
    g = base('ddia_cdc', 'Change Data Capture (CDC) Pipeline')
    n(g, 'pg',      'PostgreSQL\n(source of truth)\nACID transactions', 'navy')
    n(g, 'wal',     'WAL / Replication Slot\n(pgoutput or wal2json)\nCaptures INSERT/UPDATE/DELETE', 'gray')
    n(g, 'debezium','Debezium\n(CDC connector)\nReads WAL, publishes\neach change as event', 'gold')
    n(g, 'kafka',   'Kafka Topic\n(one topic per table)\nOrdered within partition\nDurable, replayable', 'orange')
    n(g, 'es',      'Elasticsearch\n(search index)', 'teal')
    n(g, 'redis',   'Redis Cache\n(invalidate / update)', 'green')
    n(g, 'snow',    'Snowflake\n(data warehouse)', 'purple')
    n(g, 'svc',     'Microservice B\n(event-driven)', 'navy')
    n(g, 'compact', 'Compacted Topic\n(only latest value\nper key retained)\nEquivalent to key-value store', 'pink')
    e(g, 'pg', 'wal',      'every write')
    e(g, 'wal', 'debezium', 'streaming')
    e(g, 'debezium', 'kafka', 'publish event')
    e(g, 'kafka', 'es',      'sink connector')
    e(g, 'kafka', 'redis',   'sink connector')
    e(g, 'kafka', 'snow',    'sink connector')
    e(g, 'kafka', 'svc',     'consumer')
    e(g, 'kafka', 'compact', 'log compaction', style='dashed')
    g.render(os.path.join(OUT, 'cdc-01'), cleanup=True)
    print('Generated: cdc-01')


def diag_stream_joins():
    g = base('ddia_stream_joins', 'Stream Join Types: Stream-Stream, Stream-Table, Table-Table')
    n(g, 'ss', 'Stream-Stream Join\n(window join)\nBoth streams windowed (e.g. last 1h)\nBuffer events in state\nExample: match ad click\n+ ad view within 1h window', 'navy')
    n(g, 'st', 'Stream-Table Join\n(stream enrichment)\nStream: event flow\nTable: DB snapshot in state\n(loaded once, slowly refreshed)\nExample: enrich user-click\nwith user profile from DB', 'green')
    n(g, 'tt', 'Table-Table Join\n(materialized view)\nBoth sides are CDC streams\nState = current DB state\nEquivalent to maintaining\na JOIN view reactively', 'teal')
    n(g, 'window', 'Window Types:\nTumbling: [0-5min][5-10min]...\nHopping: [0-5][1-6][2-7]...\nSliding: last 5 min\nSession: activity + idle gap', 'gold')
    n(g, 'late', 'Late Events:\nWatermark = estimate of\nhow far behind events are\nOptions: discard / correct /\nretract-and-reissue', 'orange')
    e(g, 'ss', 'window', 'controlled by')
    e(g, 'ss', 'late',   'must handle')
    g.render(os.path.join(OUT, 'stream-joins-01'), cleanup=True)
    print('Generated: stream-joins-01')


def diag_fault_tolerance_streams():
    g = base('ddia_ft_streams', 'Stream Processing Fault Tolerance: Exactly-Once Semantics')
    n(g, 'atmostonce',  'At-most-once\n(fire and forget)\nMay lose messages\nFastest but wrong for\ncritical data', 'red')
    n(g, 'atleastonce', 'At-least-once\n(retry on failure)\nNo data loss\nMay process duplicates\n→ idempotent sinks needed', 'orange')
    n(g, 'exactlyonce', 'Exactly-once\nNo loss, no duplicates\nRequires: checkpointing\n+ transactional sinks', 'green')
    n(g, 'microbatch',  'Microbatch (Spark Streaming)\nTumbling mini-windows\nExactly-once via\nbatch retry semantics', 'teal')
    n(g, 'checkpoint',  'Flink Checkpointing\n(Chandy-Lamport snapshot)\nInject barrier into stream\nSave operator state\nReplay from checkpoint on failure', 'purple')
    n(g, 'idempotent',  'Idempotent output\nSame result written twice = OK\nCassandra write with\ndeterministic key', 'navy')
    n(g, 'kafka_tx',    'Kafka Transactions\n(2PC to Kafka)\nAtomic write to\nmultiple partitions\nFlink + Kafka Streams', 'green')
    e(g, 'atmostonce', 'atleastonce', 'stronger')
    e(g, 'atleastonce', 'exactlyonce', 'stronger')
    e(g, 'exactlyonce', 'microbatch', 'approach 1')
    e(g, 'exactlyonce', 'checkpoint', 'approach 2 (Flink)')
    e(g, 'exactlyonce', 'idempotent', 'approach 3')
    e(g, 'checkpoint', 'kafka_tx', 'combined with')
    g.render(os.path.join(OUT, 'fault-tolerance-streams-01'), cleanup=True)
    print('Generated: fault-tolerance-streams-01')


def diag_lambda_kappa():
    g = base('ddia_lambda', 'Lambda vs Kappa Architecture')
    with g.subgraph(name='cluster_lambda') as s:
        s.attr(label='Lambda Architecture (Marz 2011) — Two Codepaths', style='filled',
               fillcolor='#fee2e2', color='#ef4444', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'lam_src',   'Event source\n(Kafka)', 'navy')
        n(s, 'lam_batch', 'Batch Layer\n(Hadoop / Spark)\nAll historical data\nHigh latency (hours)', 'orange')
        n(s, 'lam_speed', 'Speed Layer\n(Storm / Flink)\nRecent data only\nLow latency (seconds)', 'gold')
        n(s, 'lam_serve', 'Serving Layer\nMerges batch view +\nspeed view at query time', 'red')
        n(s, 'lam_prob',  'Problem: TWO codepaths\n→ complex merge logic\n→ bugs in batch take\nhours to reprocess', 'red')
        e(s, 'lam_src', 'lam_batch')
        e(s, 'lam_src', 'lam_speed')
        e(s, 'lam_batch', 'lam_serve')
        e(s, 'lam_speed', 'lam_serve')
        e(s, 'lam_serve', 'lam_prob', style='dashed')
    with g.subgraph(name='cluster_kappa') as s:
        s.attr(label='Kappa Architecture (Kreps 2014) — Single Streaming Path', style='filled',
               fillcolor='#f0fdf4', color='#22c55e', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'kap_src',   'Event source\n(Kafka)\nRetain log forever', 'navy')
        n(s, 'kap_stream','Single streaming job\n(Flink / Kafka Streams)\nHandles real-time AND\nhistorical replay', 'green')
        n(s, 'kap_replay','Reprocessing:\nReplay Kafka log\nfrom offset 0\nthrough updated job', 'teal')
        n(s, 'kap_serve', 'Serving Layer\n(single view)', 'green')
        e(s, 'kap_src', 'kap_stream')
        e(s, 'kap_src', 'kap_replay', 'replay\nfrom start', style='dashed')
        e(s, 'kap_stream', 'kap_serve')
        e(s, 'kap_replay', 'kap_serve')
    g.render(os.path.join(OUT, 'lambda-kappa-01'), cleanup=True)
    print('Generated: lambda-kappa-01')


def diag_end_to_end():
    g = base('ddia_e2e', 'End-to-End Argument: Idempotency and Exactly-Once at Each Layer')
    n(g, 'tcp',    'TCP layer\nReliable delivery\nwithin a connection', 'gray')
    n(g, 'http',   'HTTP layer\nRetry on timeout\n(POST not idempotent!)\n→ may duplicate request', 'orange')
    n(g, 'ikey',   'Application layer:\nIdempotency Key\n(UUID in header / body)\nStripe: Idempotency-Key\nGenerated by client', 'green')
    n(g, 'db',     'Database layer:\nUPSERT INTO idempotency_keys\n(id, request_hash, response)\nUnique constraint on id\nSecond attempt: return\ncached response', 'teal')
    n(g, 'result', 'Client gets same result\nwhether 1st or 100th attempt\nExactly-once at application level', 'navy')
    n(g, 'audit',  'Auditability:\nImmutable event log\nCan recompute any\nderived view by replaying', 'purple')
    e(g, 'tcp', 'http',   'runs over')
    e(g, 'http', 'ikey', 'idempotency\nkey solves\nduplicate POST')
    e(g, 'ikey', 'db',   'stored in\ntransaction')
    e(g, 'db', 'result', 'cache hit\nreturns cached response')
    e(g, 'result', 'audit', style='dashed')
    g.render(os.path.join(OUT, 'end-to-end-01'), cleanup=True)
    print('Generated: end-to-end-01')


def diag_unbundling():
    g = base('ddia_unbundle', 'Unbundling the Database: Composing Data Systems')
    n(g, 'monolith',  'Integrated monolith\n(Oracle / SQL Server)\nAll features in one product:\nSQL, full-text, JSON, OLAP\nSimple to operate\nVendor lock-in', 'navy')
    n(g, 'unbundled', 'Unbundled approach:\nBest-of-breed components\nPostgres (OLTP) +\nElasticsearch (search) +\nRedis (cache) +\nKafka (events) +\nClickHouse (OLAP)', 'green')
    n(g, 'challenge', 'Challenge: keeping derived\ndata consistent across\nall components\n→ solved by CDC + event log', 'orange')
    n(g, 'log_center','Event log as integration hub:\nKafka = the write path\nAll derived stores subscribe\nOrdering guaranteed per partition\nReplay enables reprocessing', 'purple')
    n(g, 'federated', 'Federated DB (query):\nUnified query interface\nacross heterogeneous stores\nPrestoSQL / Trino, Calcite', 'teal')
    e(g, 'monolith', 'unbundled', 'vs')
    e(g, 'unbundled', 'challenge', 'creates')
    e(g, 'challenge', 'log_center', 'solved by')
    e(g, 'unbundled', 'federated', 'query layer')
    g.render(os.path.join(OUT, 'unbundling-databases-01'), cleanup=True)
    print('Generated: unbundling-databases-01')


def diag_schema_on_read():
    g = base('ddia_schema_read', 'Schema-on-Write vs Schema-on-Read')
    with g.subgraph(name='cluster_write') as s:
        s.attr(label='Schema-on-Write (Relational DB)', style='filled',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'sw_schema', 'Schema defined upfront\nCREATE TABLE users (\n  id INT,\n  name VARCHAR(100),\n  age INT\n)', 'navy')
        n(s, 'sw_write',  'Write: DB enforces schema\nINSERT fails if\nwrong type / missing NOT NULL', 'navy')
        n(s, 'sw_alter',  'Schema change:\nALTER TABLE ADD COLUMN\nMay lock table\nAll rows updated immediately', 'red')
    with g.subgraph(name='cluster_read') as s:
        s.attr(label='Schema-on-Read (Document DB / Data Lake)', style='filled',
               fillcolor='#f0fdf4', color='#22c55e', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'sr_write',  'Write: any structure accepted\n{"name": "Alice", "age": 30}\n{"name": "Bob", "city": "NYC"}\nNo enforcement', 'green')
        n(s, 'sr_read',   'Read: code handles\nmissing fields\nif doc.get("age"):...', 'green')
        n(s, 'sr_change', 'Schema change:\njust start writing\nnew format\nOld docs read with\ncompat code', 'teal')
    n(g, 'when_write', 'Schema-on-write wins:\nStrong consistency needed\nMany writers, controlled schema', 'gold')
    n(g, 'when_read',  'Schema-on-read wins:\nHeterogeneous data\nExternal data sources\nFrequently changing structure', 'purple')
    e(g, 'sw_schema', 'when_write', style='dashed')
    e(g, 'sr_write', 'when_read', style='dashed')
    g.render(os.path.join(OUT, 'schema-on-read-vs-write-01'), cleanup=True)
    print('Generated: schema-on-read-vs-write-01')


if __name__ == '__main__':
    diag_data_systems_overview()
    diag_reliability_scalability()
    diag_percentiles()
    diag_fan_out()
    diag_relational_vs_document()
    diag_graph_data_models()
    diag_lsm_trees()
    diag_b_trees()
    diag_indexes()
    diag_olap_vs_oltp()
    diag_column_storage()
    diag_encoding_formats()
    diag_schema_evolution()
    diag_dataflow_modes()
    diag_single_leader()
    diag_replication_lag()
    diag_multi_leader()
    diag_consistency_guarantees()
    diag_partitioning()
    diag_secondary_indexes_partitioned()
    diag_rebalancing()
    diag_acid()
    diag_mvcc()
    diag_write_skew()
    diag_serializability()
    diag_distributed_transactions()
    diag_faults_networks()
    diag_linearizability()
    diag_ordering_causality()
    diag_consensus_raft()
    diag_zookeeper()
    diag_mapreduce()
    diag_beyond_mapreduce()
    diag_batch_joins()
    diag_event_streams()
    diag_cdc()
    diag_stream_joins()
    diag_fault_tolerance_streams()
    diag_lambda_kappa()
    diag_end_to_end()
    diag_unbundling()
    diag_schema_on_read()
    print(f'\nDone — 42 DDIA diagrams written to public/diagrams/ddia/')
