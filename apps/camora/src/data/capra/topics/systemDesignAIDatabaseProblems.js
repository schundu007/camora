// AI-Based Database & Data Infrastructure Design Problems

export const aiDatabaseProblemCategories = [
  { id: 'ai-data', name: 'AI Data Infrastructure', icon: 'database', color: '#0ea5e9' },
];

export const aiDatabaseProblemCategoryMap = {
  'training-data-lake': 'ai-data',
  'knowledge-graph-db': 'ai-data',
  'ai-data-quality': 'ai-data',
  'semantic-cache': 'ai-data',
  'ml-experiment-tracking': 'ai-data',
  'ai-query-optimizer': 'ai-data',
  'realtime-feature-db': 'ai-data',
  'multimodal-data-store': 'ai-data',
  'model-registry': 'ai-data',
  'data-labeling-system': 'ai-data',
  'synthetic-data-generation': 'ai-data',
  'embedding-pipeline': 'ai-data',
};

export const aiDatabaseDesigns = [
  {
    id: 'training-data-lake',
    isNew: true,
    title: 'ML Training Data Lake',
    subtitle: 'Design a Data Lake for AI Training Datasets at Scale',
    icon: 'database',
    color: '#0ea5e9',
    difficulty: 'Hard',
    description: 'Design a petabyte-scale data lake that stores, versions, and serves training datasets for machine learning, supporting reproducible experiments and continuous data ingestion.',

    introduction: `Machine learning models are only as good as the data they are trained on, yet most teams treat training data as a second-class citizen — dumped into S3 with no versioning, no lineage, and no quality guarantees. When a model degrades in production and the team needs to reproduce the training run from six months ago, they find the dataset has been overwritten, the preprocessing script was changed, and no one knows which data split was used. The result is that the model cannot be reproduced or audited.

A proper ML training data lake treats datasets with the same rigor as source code: every dataset version is immutable, every training run records which dataset version it consumed, and every downstream model can be traced back to specific rows of raw data. This is not just good engineering practice — it is a prerequisite for regulatory compliance in domains like healthcare and finance, where auditability of training data is required.

The scale challenges are significant. A single language model pretraining dataset may contain trillions of tokens across hundreds of terabytes. Image datasets for computer vision can reach petabytes. The system must support large sequential reads optimized for GPU training throughput, near-deduplication at massive scale, and continuous ingestion of newly labeled data without disrupting ongoing training jobs.

Beyond storage, the data lake must enforce governance policies — detecting and removing PII before data reaches the training pipeline, managing access controls so that sensitive datasets are not used by unauthorized teams, and providing a searchable catalog so researchers can discover existing datasets rather than recreating work already done.`,

    functionalRequirements: [
      'Store and version datasets with immutable snapshots — once published, a dataset version never changes',
      'Track data lineage: which training run consumed which dataset version, and which model was produced',
      'Support large-scale deduplication of documents using MinHash LSH or exact-hash comparison',
      'Provide a searchable metadata catalog with tags, modality, language, license, and quality annotations',
      'Manage reproducible train/validation/test splits that are stored alongside the dataset version',
      'Support continuous ingestion of newly labeled data without invalidating existing training jobs',
      'Enforce PII detection and removal before data is published to the training-accessible tier',
      'Allow cross-organization data sharing with fine-grained access controls per dataset and per tier',
    ],

    nonFunctionalRequirements: [
      'Training read throughput: sustain 10+ GB/s sequential reads per training job across a GPU cluster',
      'Storage scale: support petabyte-scale datasets with cost-tiered storage (hot SSD, warm S3, cold Glacier)',
      'Deduplication pipeline: process 1 trillion documents within 24 hours using distributed MinHash',
      'Metadata queries: catalog search returns results in under 500ms across 10M+ dataset entries',
      'Ingestion latency: newly labeled data available for training within 1 hour of upload',
      'Audit trail: every data access event logged and queryable for compliance audits',
    ],

    estimation: {
      users: '500 ML researchers and engineers across multiple teams, each running 10-50 training jobs per week',
      storage: '5 PB current; 2 PB/year growth from new training data; Delta Lake format adds 20% metadata overhead',
      bandwidth: '10 GB/s read throughput per large training job; 50 concurrent training jobs peak = 500 GB/s aggregate read',
      qps: '200 catalog search queries/min; 50 dataset version create/publish events/day; 1M file-level read requests/hr during peak training',
    },

    apiDesign: {
      description: 'Dataset registry API for versioning and discovery, plus a data access API for training job consumption',
      endpoints: [
        { method: 'POST', path: '/api/datasets', params: '{ name, modality, language, license, tags[], description }', response: '{ dataset_id, created_at }', description: 'Register a new dataset in the catalog' },
        { method: 'POST', path: '/api/datasets/{id}/versions', params: '{ source_uri, split_config, dedup_config, pii_scan: bool }', response: '{ version_id, status: "processing" | "ready" }', description: 'Publish an immutable new version; triggers dedup and PII scan pipeline' },
        { method: 'GET', path: '/api/datasets/{id}/versions/{version_id}', params: '', response: '{ version_id, row_count, size_bytes, splits, lineage, quality_metrics }', description: 'Retrieve metadata and access credentials for a specific version' },
        { method: 'GET', path: '/api/datasets/search', params: 'modality, language, license, tags, min_rows, max_rows', response: '{ results[{ dataset_id, name, latest_version, tags, row_count }], total }', description: 'Search the metadata catalog for datasets matching filters' },
        { method: 'POST', path: '/api/lineage/record', params: '{ training_run_id, dataset_id, version_id, model_id }', response: '{ lineage_id }', description: 'Record which dataset version was used to train a model' },
        { method: 'GET', path: '/api/lineage/trace', params: 'model_id', response: '{ training_run_id, dataset_version, raw_sources[], pii_scan_results }', description: 'Trace a model back through its full data lineage for audit' },
      ],
    },

    dataModel: {
      description: 'Dataset registry stored in PostgreSQL; actual data files stored in S3 with Delta Lake / Apache Iceberg table format for ACID transactions and time-travel queries',
      schema: `datasets {
  id: uuid PK
  name: varchar(200) unique
  modality: enum(text, image, audio, video, tabular, multimodal)
  description: text
  owner_team_id: uuid FK
  license: varchar(100)
  tags: text[]
  created_at: timestamp
  is_public: boolean
}

dataset_versions {
  id: uuid PK
  dataset_id: uuid FK
  version_number: int
  status: enum(processing, pii_scan, dedup, ready, failed)
  source_uri: text              -- s3://raw-data-bucket/...
  storage_uri: text             -- s3://training-data-lake/dataset_id/version_id/
  row_count: bigint
  size_bytes: bigint
  dedup_removed_count: bigint
  pii_scan_passed: boolean
  schema_json: jsonb            -- column names and types for tabular
  split_config: jsonb           -- { train: 0.8, val: 0.1, test: 0.1, seed: 42 }
  quality_metrics: jsonb
  published_at: timestamp nullable
  published_by: uuid FK
}

dataset_access_grants {
  id: uuid PK
  dataset_id: uuid FK
  grantee_team_id: uuid FK
  access_level: enum(read, write, admin)
  granted_by: uuid FK
  expires_at: timestamp nullable
}

training_lineage {
  id: uuid PK
  training_run_id: varchar(100)
  dataset_id: uuid FK
  version_id: uuid FK
  model_id: varchar(200)
  consumed_at: timestamp
  git_commit: varchar(40)
  framework: varchar(50)
  hyperparams: jsonb
}`,
      examples: [
        { table: 'dataset_versions', label: 'English web text dataset version ready for training', json: '{ "id": "ver-a1b2c3d4", "dataset_id": "ds-9f8e7d6c", "version_number": 3, "status": "ready", "storage_uri": "s3://training-lake/ds-9f8e7d6c/ver-a1b2c3d4/", "row_count": 8420000000, "size_bytes": 2199023255552, "dedup_removed_count": 312000000, "pii_scan_passed": true, "split_config": { "train": 0.95, "val": 0.03, "test": 0.02, "seed": 42 }, "published_at": "2025-06-01T00:00:00Z" }' },
        { table: 'training_lineage', label: 'Lineage record linking a model to the dataset version it used', json: '{ "id": "lin-e5f6a7b8", "training_run_id": "run-20250601-lm-base-v4", "dataset_id": "ds-9f8e7d6c", "version_id": "ver-a1b2c3d4", "model_id": "lm-base-v4-checkpoint-final", "consumed_at": "2025-06-02T08:00:00Z", "git_commit": "3a7f2c1d", "hyperparams": { "lr": 0.0001, "batch_size": 2048, "steps": 500000 } }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Files uploaded directly to S3. A PostgreSQL table tracks dataset metadata and version numbers. Training jobs read directly from S3 paths recorded in the database. No deduplication pipeline — duplicates accumulate. PII scanning is a manual step before upload. No lineage tracking.',
      problems: [
        'No immutability — overwriting a dataset path breaks all training jobs that referenced it',
        'No deduplication means the model memorizes repeated content and quality degrades',
        'Manual PII scanning is skipped under deadline pressure, creating compliance risk',
        'No lineage means a model in production cannot be audited back to its training data',
        'Training throughput is bottlenecked by S3 request rate limits on millions of small files',
        'No catalog means teams recreate datasets already built by other teams',
      ],
    },

    advancedImplementation: {
      title: 'Immutable Versioned Data Lake with Automated Quality Pipeline',
      description: 'Datasets are stored in Apache Iceberg or Delta Lake format on S3, providing ACID transactions, time-travel queries, and schema evolution. Publishing a new version is an atomic metadata commit — the underlying files are never modified. An automated pipeline runs deduplication using distributed MinHash LSH and PII scanning using a fine-tuned NER model before any version is marked ready. Training jobs receive pre-signed S3 URLs with byte-range support for parallel data loading across GPU workers.',
      keyPoints: [
        'Apache Iceberg table format provides ACID commits, time-travel, and schema evolution on top of S3 — a version is just a new metadata snapshot pointing to immutable Parquet files',
        'MinHash LSH deduplication at scale: compute 128-bit MinHash signatures for every document, use LSH banding to group candidate duplicates, exact-compare within bands — processes 1T documents in hours on a Spark cluster',
        'PII detection pipeline: fine-tuned NER model detects names, SSNs, credit card numbers, emails; detected PII is either redacted or causes the document to be dropped; scan results are recorded in the version metadata for compliance',
        'Training-optimized layout: files packed into 128MB Parquet row groups, sorted by a random shuffle seed for uniform sampling, stored in S3 Express One Zone for 10x lower latency vs standard S3',
        'Lineage is recorded automatically by the training framework SDK — it captures dataset version, git commit, hyperparameters, and model checkpoint URI in a single atomic write at job start',
        'Metadata catalog backed by Elasticsearch: full-text search over dataset descriptions, tags, and schema; filter by modality, language, license, row count range — returns results in under 100ms',
        'Access control enforced at the S3 bucket policy level using dataset-specific IAM roles, not just application-layer checks — a misconfigured app cannot accidentally read a restricted dataset',
      ],
      databaseChoice: 'Apache Iceberg on S3 for dataset files (ACID, time-travel, schema evolution); PostgreSQL for the dataset registry (versions, access grants, lineage records); Elasticsearch for full-text catalog search; Redis for caching hot catalog queries and pre-signed URL tokens',
      caching: 'Pre-signed S3 URLs cached in Redis for 1 hour to avoid regenerating on every file access; Elasticsearch catalog results cached for 5 minutes; popular datasets pre-warmed into S3 Express One Zone before scheduled training runs',
    },

    tips: [
      'Clarify immutability early: the most important property of a training data lake is that published versions never change — any mutation creates a new version',
      'Distinguish the raw data zone (untrusted ingestion) from the curated zone (deduped, PII-clean, versioned) — training jobs only read from the curated zone',
      'MinHash LSH is the standard approach for near-deduplication at trillion-document scale — explain the two-step process: hash signatures then LSH banding to find candidates',
      'Training throughput is dominated by storage I/O — discuss file format (Parquet row groups), file size (avoid millions of tiny files), and storage tier (S3 Express vs standard)',
      'Lineage is non-negotiable in regulated industries — the ability to answer "exactly which data trained this production model" is required for FDA, financial regulators, and GDPR audits',
      'PII scanning must happen before data enters the training zone, not after — post-hoc removal from a model is effectively impossible',
      'Dataset catalog discoverability reduces wasted effort — without it, teams recreate datasets that already exist, creating inconsistencies between models',
    ],

    keyQuestions: [
      {
        question: 'How does dataset versioning work and why is immutability important for ML reproducibility?',
        answer: `Why Immutability Matters

If training data can be modified after a model is trained on it, you can never reproduce that training run:
- Bug found in model → need to retrain → dataset has been updated → you are training on different data
- Regulatory audit requires proof of what the model was trained on → impossible if data was overwritten
- Two researchers training "on the same dataset" get different results → dataset was modified between runs

How Iceberg Versioning Works

Apache Iceberg separates metadata from data files:
\`\`\`
S3 layout:
  /datasets/ds-abc123/
    metadata/
      v1.metadata.json  → points to snapshot-1 (100M rows, files A,B,C)
      v2.metadata.json  → points to snapshot-2 (120M rows, files A,B,C,D,E)
    data/
      part-0000.parquet  (never modified)
      part-0001.parquet
      part-0003.parquet  (new in v2)
\`\`\`

Publishing a new version is atomic: write new data files, then atomically commit a new metadata pointer. The old metadata still points to old files — both versions are readable simultaneously.

Training jobs pin to a version ID, not a path:
\`\`\`python
dataset = DataLakeClient.load(dataset_id="ds-abc123", version="v1")
# Returns Parquet reader pointing to exactly the files in v1
# Even if v2 is published mid-training, this job still reads v1
\`\`\`

Time travel lets you query historical state:
\`\`\`sql
SELECT * FROM dataset VERSION AS OF '2025-01-01'
\`\`\``,
      },
      {
        question: 'How do you deduplicate a trillion-document text corpus efficiently?',
        answer: `Why Deduplication Matters

Language models memorize repeated content. A document appearing 100 times in training data is weighted 100x heavier than a unique document. This degrades generalization and causes the model to regurgitate training data verbatim.

MinHash LSH Algorithm

Step 1: MinHash signature per document
\`\`\`
For each document:
  1. Tokenize into k-grams (e.g., 5-word shingles)
  2. Apply K hash functions (e.g., K=128) to each shingle
  3. MinHash[i] = min over all shingles of hash_i(shingle)
  Result: 128-dimensional integer vector = document signature
\`\`\`

Step 2: LSH banding to find candidates
\`\`\`
Split the 128-dimensional signature into B bands of R rows each
  (e.g., 32 bands × 4 rows)

For each band:
  Hash the R-row slice → bucket key
  Documents in the same bucket = candidates for deduplication

Probability two documents with Jaccard similarity J end up in
  the same bucket: 1 - (1 - J^R)^B
  With B=32, R=4: documents with J≥0.8 collide with >99% probability
\`\`\`

Step 3: Exact comparison within candidate pairs
- Compute exact Jaccard similarity for candidate pairs
- If similarity > threshold (e.g., 0.8), mark as near-duplicate
- Keep one document per duplicate cluster (typically the longest)

Scale: 1 trillion documents processed in ~12 hours on a 500-node Spark cluster.

Exact deduplication (identical documents): SHA-256 hash of normalized text → group by hash → keep one. Much cheaper and catches copy-paste duplicates.`,
      },
      {
        question: 'How do you design storage optimized for ML training access patterns?',
        answer: `ML Training Access Pattern vs OLTP

| Property | OLTP (web app) | ML Training |
|----------|---------------|-------------|
| Access | Random row lookup | Sequential scan of all rows |
| Concurrency | Thousands of small queries | Tens of large streaming reads |
| Index usage | Heavy | Never — full scan always |
| File size | Doesn't matter | Critical — avoid millions of tiny files |
| Latency | <10ms per query | Throughput: GB/s matters more |

Storage Optimizations

1. File size: target 128MB–1GB Parquet files
\`\`\`
Bad:  1 million × 1KB files = 1M S3 API calls per training epoch
Good: 1000 × 1GB files = 1000 S3 API calls per epoch
\`\`\`
Pack rows into large Parquet row groups (128MB). Small files kill throughput because each requires a separate S3 GET request with its own latency.

2. Parallel data loading
\`\`\`python
# Each GPU worker loads a non-overlapping shard
dataset = IcebergDataset(version_id)
shard = dataset.shard(num_shards=N_GPUS, index=GPU_RANK)
loader = DataLoader(shard, num_workers=8, prefetch_factor=4)
\`\`\`
Each GPU worker reads different files → N_GPUS × file_throughput aggregate read rate.

3. Storage tier selection
- S3 Express One Zone: 10x lower latency, 8x higher throughput vs standard S3. Use for hot training datasets.
- S3 Standard: active datasets not in current training runs.
- S3 Glacier: archived dataset versions older than 1 year.

4. Shuffle at dataset creation time, not training time
- Shuffling during training requires random access, which destroys sequential read performance.
- Shuffle once when publishing the dataset version (using a fixed random seed for reproducibility).
- Store pre-shuffled — training jobs read sequentially and get a random sample naturally.`,
      },
    ],

    keyDecisions: [
      'Apache Iceberg vs Delta Lake for table format — chose Iceberg because it has better multi-engine support (Spark, Trino, Flink all read natively) and the metadata format is an open standard not controlled by a single vendor',
      'MinHash LSH vs exact deduplication vs no deduplication — chose MinHash LSH because exact hash misses near-duplicates (paraphrased content) which are common in web crawls and still cause memorization',
      'PII scan before ingestion vs after ingestion — chose before: once PII enters the training lake it can leak into model weights, and removing it from a trained model is practically impossible',
      'S3 Express One Zone vs EFS vs HDFS for training storage — chose S3 Express because it provides 10x lower latency than standard S3, is fully managed, and eliminates the operational overhead of running HDFS clusters',
      'PostgreSQL for registry vs a dedicated data catalog tool — chose PostgreSQL with Elasticsearch for search because it gives full control over the schema, lower operational overhead than running a separate catalog service, and easier integration with existing infrastructure',
    ],
  },

  {
    id: 'knowledge-graph-db',
    isNew: true,
    title: 'Knowledge Graph Database',
    subtitle: 'Design a Knowledge Graph for AI Applications — Wikidata / Google KG',
    icon: 'layers',
    color: '#8b5cf6',
    difficulty: 'Hard',
    description: 'Design a distributed knowledge graph database that stores billions of entity relationships, supports transitive inference, and serves as a factual grounding layer for AI applications.',

    introduction: `Knowledge graphs encode structured facts about the world — entities like companies, people, and places, connected by typed relationships like "founded_by", "located_in", and "acquired". Google's Knowledge Graph powers the information boxes in search results. Wikidata contains over 100 million entity-relationship triples. These graphs are increasingly used as grounding layers for large language models: instead of relying on parametric memory that may hallucinate, the LLM queries the knowledge graph to retrieve verified facts before generating a response.

The fundamental data model is the triple: a subject entity, a predicate (relationship type), and an object entity or value. "Apple Inc. — founded_by — Steve Jobs" is one triple. The challenge is that a production knowledge graph contains billions of triples, needs to support complex traversal queries that span multiple relationship hops, and must handle transitive inference (if A is_parent_of B and B is_parent_of C, then A is_ancestor_of C) efficiently without materializing all derived triples.

Entity resolution is one of the hardest subproblems. The same real-world entity is often referenced by different strings: "Apple Inc.", "Apple", "AAPL", "the iPhone maker". Merging these into a single canonical entity without incorrectly merging different entities (Apple the tech company vs. Apple Records) requires a combination of string similarity, embedding similarity, and contextual signals. Errors compound — a wrong merge propagates through the graph to all downstream queries.

Knowledge graphs also have a temporal dimension that is easy to overlook. Facts are not eternally true: Obama was president of the United States from 2009 to 2017, but not before or after. A knowledge graph that ignores time will answer "Who is the president?" with outdated information. Supporting time-valid triples and point-in-time queries is essential for applications that need historically accurate answers.`,

    functionalRequirements: [
      'Store billions of entity-relationship triples with typed relationships and property attributes',
      'Support multi-hop graph traversal queries spanning 3-5 relationship hops in under 200ms',
      'Perform transitive relationship inference for common relationship types such as ancestry and organizational hierarchy',
      'Entity resolution: detect and merge duplicate entities that refer to the same real-world object',
      'Temporal triples: record time ranges during which a fact is valid and support point-in-time queries',
      'Real-time graph updates: add or retract triples while queries continue running without full reindex',
      'Embedding integration: store entity embeddings for ML downstream tasks and similarity search',
      'Factual grounding API for LLMs: given a claim, retrieve supporting or contradicting triples from the graph',
    ],

    nonFunctionalRequirements: [
      'Scale: support 100 billion triples with sub-second single-hop and sub-5s multi-hop queries',
      'Write throughput: ingest 100K new triples per second during bulk import and 1K/s during steady-state updates',
      'Availability: 99.95% uptime — knowledge graphs are often on the critical path of search and AI applications',
      'Inference latency: transitive closure queries over 10M-node subgraphs complete within 2 seconds',
      'Entity resolution pipeline: process 1M candidate pairs per hour',
      'Embedding lookup: retrieve entity embeddings in under 5ms for use in real-time ML inference',
    ],

    estimation: {
      users: '500 internal services querying the graph; 10M end-user requests/day routed through services that use the KG',
      storage: '100B triples × 100 bytes avg triple size = 10TB raw; with indexes 3-5x overhead = 30-50TB; entity embeddings (768-dim float32) for 1B entities = 3TB',
      bandwidth: '10K graph queries/sec peak; avg query touches 1000 triples × 100 bytes = 100KB per query = 1GB/s read throughput',
      qps: '10K read queries/sec; 1K triple write/sec steady-state; 100K/sec during bulk import',
    },

    apiDesign: {
      description: 'SPARQL endpoint for graph queries, REST API for entity CRUD and resolution, and a specialized grounding API for LLM integration',
      endpoints: [
        { method: 'POST', path: '/api/sparql', params: '{ query: "SELECT ?president WHERE { ?president wdt:P39 wd:Q11696 ... }" }', response: '{ results: { bindings: [...] } }', description: 'Execute SPARQL query against the knowledge graph' },
        { method: 'GET', path: '/api/entities/{id}', params: 'include_relations?, depth?', response: '{ id, label, aliases[], type, properties{}, outgoing_relations[], incoming_relations[] }', description: 'Retrieve entity with its immediate neighborhood' },
        { method: 'POST', path: '/api/entities', params: '{ label, type, aliases[], properties{}, source_uri }', response: '{ entity_id, merged_with? }', description: 'Create entity; triggers entity resolution against existing entities' },
        { method: 'POST', path: '/api/triples', params: '{ subject_id, predicate, object_id, valid_from?, valid_until?, confidence?, source }', response: '{ triple_id }', description: 'Add a triple with optional temporal validity and confidence score' },
        { method: 'POST', path: '/api/ground', params: '{ claim: "Apple was founded in 1976", entities?: ["Apple Inc."] }', response: '{ supporting[], contradicting[], confidence, related_triples[] }', description: 'Retrieve triples that support or contradict a claim — for LLM grounding' },
        { method: 'GET', path: '/api/entities/{id}/embedding', params: '', response: '{ entity_id, embedding: float[], model_version }', description: 'Retrieve pre-computed entity embedding for ML downstream tasks' },
      ],
    },

    dataModel: {
      description: 'Core triple store stored in a native graph database (JanusGraph or Apache TinkerPop-compatible) with secondary indexes in Elasticsearch for full-text and property-based search',
      schema: `entities {
  id: varchar(50) PK     -- e.g., "Q312" (Wikidata-style)
  canonical_label: varchar(500)
  type: varchar(100)     -- e.g., "Organization", "Person", "Location"
  aliases: text[]
  description: text
  created_at: timestamp
  updated_at: timestamp
  source: varchar(200)
  confidence: float
  merged_from: varchar(50)[] nullable  -- prior entity IDs merged into this one
}

triples {
  id: bigint PK
  subject_id: varchar(50) FK
  predicate: varchar(200)    -- e.g., "founded_by", "located_in", "parent_org"
  object_id: varchar(50) nullable FK   -- for entity-to-entity relations
  object_value: text nullable           -- for entity-to-literal relations
  valid_from: date nullable
  valid_until: date nullable
  confidence: float default 1.0
  source_uri: text
  created_at: timestamp
  is_retracted: boolean default false
}

entity_embeddings {
  entity_id: varchar(50) FK
  model_version: varchar(50)
  embedding: float[]      -- 768-dim vector stored as array
  computed_at: timestamp
  PRIMARY KEY (entity_id, model_version)
}

entity_resolution_log {
  id: bigint PK
  entity_a_id: varchar(50)
  entity_b_id: varchar(50)
  similarity_score: float
  resolution_outcome: enum(merged, kept_separate, needs_review)
  resolved_by: enum(automatic, human)
  resolved_at: timestamp
}`,
      examples: [
        { table: 'triples', label: 'Temporal triple: Obama was president from 2009 to 2017', json: '{ "id": 982341, "subject_id": "Q76", "predicate": "holds_position", "object_id": "Q11696", "object_value": null, "valid_from": "2009-01-20", "valid_until": "2017-01-20", "confidence": 1.0, "source_uri": "https://www.wikidata.org/wiki/Q76", "is_retracted": false }' },
        { table: 'entities', label: 'Apple Inc. entity with aliases', json: '{ "id": "Q312", "canonical_label": "Apple Inc.", "type": "Organization", "aliases": ["Apple", "Apple Computer", "AAPL", "Apple Computers Inc."], "description": "American multinational technology company", "confidence": 1.0 }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Triples stored in a PostgreSQL table with columns for subject, predicate, object. Multi-hop queries implemented as recursive CTEs or application-level BFS over repeated single-hop SQL queries. No transitive inference. Entity resolution is a manual process.',
      problems: [
        'Multi-hop traversal with recursive CTEs becomes extremely slow beyond 2-3 hops on large graphs due to full table scans at each level',
        'No native graph index means neighbor lookups require full scans of the triples table filtered by subject or object',
        'Transitive inference requires materializing all derived triples, which explodes storage for large hierarchies',
        'No entity resolution means the same entity exists under dozens of variant names, fragmenting the graph and making queries miss relevant facts',
        'Temporal queries require complex date range logic on every query rather than being a first-class feature',
      ],
    },

    advancedImplementation: {
      title: 'Native Graph Store with Distributed Traversal and Learned Entity Resolution',
      description: 'Triples are stored in a native graph database (JanusGraph over Apache Cassandra) that maintains adjacency indexes for O(degree) neighbor lookup rather than O(table_size). Transitive relationships use landmark-based shortest-path indexes rather than full materialization. Entity resolution uses a two-stage pipeline: candidate generation via embedding similarity (ANN search), followed by a fine-tuned cross-encoder classifier to decide merge vs keep-separate. Temporal queries are first-class: the query planner automatically filters to the requested time point.',
      keyPoints: [
        'JanusGraph over Cassandra: each vertex stores its adjacency list directly — finding all outgoing edges from a node is an O(degree) Cassandra row read, not a full index scan',
        'Landmark-based transitive inference: pre-compute shortest paths from K landmark nodes to all other nodes; estimate any-to-any path length via triangle inequality — avoids materializing the full transitive closure',
        'Entity resolution pipeline: (1) generate candidates via cosine similarity in embedding space using ANN search (candidate pairs with similarity > 0.7), (2) run fine-tuned BERT cross-encoder on (entity_A_text, entity_B_text) to classify merge/keep-separate, (3) human review queue for low-confidence decisions',
        'Graph partitioning: community detection (Louvain algorithm) groups densely connected entities into the same Cassandra partition — minimizes cross-partition hops for typical traversal queries',
        'Temporal index: each predicate type that has temporal triples gets a secondary index on (subject_id, predicate, valid_from, valid_until) — point-in-time queries become a range scan, not a full filter',
        'Entity embeddings computed with TransE / RotatE knowledge graph embedding models — capture relational structure in embedding space, enabling tasks like link prediction and entity similarity that cannot be done with text embeddings alone',
        'LLM grounding endpoint: given a natural language claim, entity-link the claim using the knowledge graph, retrieve all triples about the linked entities within 2 hops, classify each triple as supporting or contradicting the claim using a small cross-encoder',
      ],
      databaseChoice: 'JanusGraph over Apache Cassandra for the primary triple store (native graph structure, horizontal scaling); Elasticsearch for full-text entity search and property-based filtering; Redis for caching hot entity neighborhoods and embedding lookups; S3 for bulk import staging and entity resolution training data',
      caching: 'Hot entity neighborhoods (top 1M most-queried entities) cached in Redis with 5-minute TTL; entity embeddings cached in Redis (3TB capacity) — 99% cache hit rate because embedding model updates are infrequent; SPARQL query result cache for common aggregate queries with 1-minute TTL',
    },

    tips: [
      'Distinguish the data model clearly: RDF triple stores (subject-predicate-object) vs property graphs (nodes and edges each have properties) — most production knowledge graphs use property graphs for flexibility',
      'Entity resolution is the hardest operational problem — errors compound because a wrong merge pollutes all downstream queries; always have a human review queue for uncertain cases',
      'Transitive closure is a common trap: do not materialize all inferred triples (the is_ancestor_of relation for a company hierarchy with 1M employees would generate O(n^2) triples); use query-time traversal or landmark indexing instead',
      'Temporal knowledge is almost always needed once the graph is used for real applications — add it to the schema from day one, not as an afterthought',
      'Clarify whether SPARQL or Gremlin/Cypher is needed: SPARQL is the W3C standard for RDF, Gremlin and Cypher are more ergonomic for property graphs — most interviewers accept either as long as you justify the choice',
      'The grounding use case for LLMs is increasingly important — be ready to discuss how you would retrieve the 10-20 most relevant triples to include in a prompt for factual question answering',
    ],

    keyQuestions: [
      {
        question: 'How do you implement transitive relationship inference efficiently on a large graph?',
        answer: `The Problem with Full Materialization

For a relationship like "is_ancestor_of" in an org chart with 1M employees, materializing all transitive pairs is O(n^2) = 1 trillion rows. Not feasible.

Option 1: BFS at query time (for shallow hierarchies)
\`\`\`python
def find_ancestors(entity_id, depth_limit=10):
    visited = set()
    queue = [(entity_id, 0)]
    ancestors = []
    while queue:
        node, depth = queue.pop(0)
        if depth >= depth_limit: continue
        for parent in graph.get_neighbors(node, relation="is_child_of"):
            if parent not in visited:
                visited.add(parent)
                ancestors.append(parent)
                queue.append((parent, depth + 1))
    return ancestors
\`\`\`
Works for trees with max depth ~20 and fan-out ~10. Fails for dense graphs or deep hierarchies.

Option 2: Precomputed closure for specific predicates

For important transitive predicates (e.g., "subsidiary_of" for company hierarchies):
- Run batch job nightly that BFS-expands and materializes the closure
- Store as a separate "derived_triples" table with a "inferred=true" flag
- Trades storage for query latency

Option 3: Landmark-based approximate path

Pre-compute shortest paths from K=1000 landmark nodes to all others.
\`\`\`
For query: is entity A reachable from entity B via relation R?
  dist(A, B) ≈ min over all landmarks L of: dist(A, L) + dist(L, B)
\`\`\`
Exact for landmark queries, approximate for others. O(K × n) storage vs O(n^2).

Best practice: use BFS at query time for depth < 5; precomputed closure for critical high-traffic predicates; landmark index for "is reachable" queries on large graphs.`,
      },
      {
        question: 'How do you do entity resolution when the same real-world entity has thousands of name variations?',
        answer: `The Entity Resolution Pipeline

Stage 1: Blocking (candidate generation)

Without blocking, comparing every pair of entities is O(n^2) — infeasible at 100M entities.

Blocking strategies:
- Exact token match: entities sharing at least one token go into the same block (e.g., "Apple Inc" and "Apple Computer" share "Apple")
- Embedding ANN: embed entity label + description, find nearest neighbors in embedding space
- Phonetic blocking: Soundex/Metaphone groups similar-sounding names

Combine methods to maximize recall (find all true positives) before the expensive comparison step.

Stage 2: Candidate scoring

For each candidate pair (A, B), compute features:
\`\`\`
- String similarity: Levenshtein, Jaro-Winkler, token overlap
- Embedding similarity: cosine(embed(A.label + A.description), embed(B.label + B.description))
- Type compatibility: is A's type the same as B's type?
- Property overlap: do they share founding year, headquarters city, domain name?
- Alias overlap: does A's canonical label appear in B's alias list?
\`\`\`

Stage 3: Classification

Fine-tuned BERT cross-encoder:
\`\`\`
Input: "[CLS] Apple Inc. American tech company [SEP] Apple Records British music label [SEP]"
Output: P(same_entity) = 0.03  → keep separate
\`\`\`
Cross-encoder (reads both entities together) significantly outperforms bi-encoder (embeds separately) for the final classification step.

Stage 4: Clustering and merging

Connected components of "same entity" pairs form clusters. Within each cluster, elect a canonical entity (highest confidence, most complete) and merge others into it, preserving all aliases and source URIs.

Human review queue: pairs with 0.4 < P(same) < 0.7 routed to human annotators — typically 5-10% of candidates.`,
      },
      {
        question: 'How do you shard a knowledge graph across machines while minimizing cross-shard query hops?',
        answer: `The Sharding Challenge

A multi-hop traversal query that starts on node A and follows 3 edges must not cross 3 machine boundaries — each cross-shard hop adds network latency and increases the chance of failure.

Naive sharding (hash on entity ID): randomly distributes entities across shards. A 3-hop traversal is nearly certain to cross 3 different shards. Terrible for graph traversal.

Community-based sharding

Use graph community detection (Louvain algorithm) to find densely connected clusters:
\`\`\`
1. Run Louvain on the full graph → communities of 10K–1M entities
2. Assign each community to a shard
3. For entities at community boundaries (edges crossing shards):
   - Replicate the boundary entities on both shards
   - Accept some write duplication for read locality
\`\`\`

Why it works: most real-world knowledge graphs have community structure — tech companies cluster with other tech companies and their employees, not randomly distributed. A query about Apple's subsidiaries is likely to stay within a "tech industry" shard.

Metrics to optimize: minimize the fraction of edges that cross shard boundaries (cross-edge fraction). Good community detection achieves <15% cross-edge rate.

In practice: JanusGraph uses a "vertex-cut" partitioning that allows a vertex to appear on multiple partitions with writes going to all copies — this avoids single-machine hot spots for highly-connected "hub" entities like country nodes that connect to millions of other entities.`,
      },
    ],

    keyDecisions: [
      'Native graph DB (JanusGraph) vs relational DB with adjacency table vs document DB — chose native graph because adjacency-list lookups are O(degree) vs O(table size) for relational; at 100B triples the difference is 6 orders of magnitude',
      'SPARQL vs Gremlin vs Cypher — chose Gremlin because JanusGraph natively supports it, it handles property graphs better than RDF-centric SPARQL, and most internal use cases are traversal not SPARQL pattern matching',
      'Full transitive closure materialization vs query-time BFS vs landmark index — chose query-time BFS for shallow transitive queries (depth < 5) and pre-computed closure only for the top 10 highest-traffic transitive predicates',
      'String similarity alone vs embedding similarity for entity resolution — chose embedding similarity as primary signal because it captures semantic equivalence ("the iPhone maker" == "Apple Inc.") that string similarity misses',
      'Single global graph vs federated per-domain graphs — chose federated: tech-domain graph, people-domain graph, and geographic graph each managed by domain teams, with cross-domain links maintained via a thin federation layer',
    ],
  },

  {
    id: 'ai-data-quality',
    isNew: true,
    title: 'AI Data Quality and Monitoring System',
    subtitle: 'Design a Data Observability Platform — Great Expectations / Monte Carlo',
    icon: 'shield',
    color: '#ef4444',
    difficulty: 'Medium',
    description: 'Design a data observability platform that automatically profiles data pipelines, detects schema and distribution drift, quarantines bad data before it reaches ML models, and traces quality issues to their root cause.',

    introduction: `Machine learning models fail silently when their input data changes. A feature that was normally distributed during training may develop a bimodal distribution in production, causing the model to make confident but wrong predictions. A schema change upstream — a column renamed, a data type changed, a new null value introduced — can propagate undetected through dozens of downstream tables and ML pipelines before anyone notices the model's predictions have degraded.

Traditional data engineering approaches handle data quality through ad-hoc checks written into ETL scripts. Each engineer writes their own validation logic, checks are inconsistent across pipelines, and there is no centralized visibility into which pipelines are healthy and which are not. When a quality issue is finally detected in production — usually through a business metric alert days after the root cause — it is nearly impossible to trace back through a complex DAG of pipeline dependencies.

A proper data observability platform treats data quality as a first-class concern. Every table and feature has defined expectations (row count should be 10M ± 10%, null rate for user_id must be 0%, order_amount must be positive). The platform runs these checks automatically on every pipeline execution and maintains a historical record of all metrics. Statistical process control techniques detect anomalies that rules cannot anticipate.

The most critical integration is with the ML feature store and model serving infrastructure. When a quality check fails for a feature that is consumed by a production model, the platform must automatically quarantine the bad data, prevent the stale feature from being served to the model, and page the on-call engineer with a pre-populated incident report that includes the lineage graph showing every downstream model affected.`,

    functionalRequirements: [
      'Automatically profile every table in the data warehouse on each pipeline run: row count, null rates, value distributions, min/max/mean/percentiles per column',
      'Detect schema drift: new columns added, existing columns removed, column type changes, nullable status changes',
      'Detect statistical distribution drift using hypothesis tests such as KS test for continuous features and chi-squared test for categorical features',
      'Monitor data freshness: alert when a table has not been updated within the expected refresh window',
      'Execute custom business rule checks defined as SQL expressions or Python functions',
      'Quarantine partitions that fail quality checks to prevent bad data from reaching downstream ML models',
      'Provide lineage-aware impact analysis: show which downstream tables, features, and ML models are affected by a quality failure in a given table',
      'Generate automated incident reports when quality checks fail, pre-populated with root cause candidates and affected downstream systems',
    ],

    nonFunctionalRequirements: [
      'Profiling latency: complete profiling of a 1TB table within 5 minutes using distributed compute',
      'Check evaluation throughput: evaluate 10K quality checks within 10 minutes of each pipeline run completing',
      'Alert latency: notify on-call engineer within 2 minutes of a quality check failure',
      'Historical retention: store quality metrics and check results for at least 90 days for trend analysis',
      'Scale: support 10K tables across 500 pipelines with 100K defined quality checks',
      'False positive rate: keep alert false positive rate below 5% to avoid alert fatigue',
    ],

    estimation: {
      users: '200 data engineers, 100 ML engineers, and 50 data scientists; 500 automated pipeline executions per day triggering quality checks',
      storage: '10K tables × 1K metrics per profile × 90 days retention = 900M metric rows; approximately 500GB in a columnar time-series store',
      bandwidth: '500 pipeline runs/day × 10K checks per run = 5M check evaluations/day; each check result is ~1KB = 5GB/day of check result data',
      qps: '500 check evaluations/sec peak during busy pipeline windows; 50 dashboard queries/sec; 10 lineage trace queries/sec',
    },

    apiDesign: {
      description: 'Rule definition API for engineers to declare quality expectations; monitoring API for automated checks; lineage API for impact analysis',
      endpoints: [
        { method: 'POST', path: '/api/expectations', params: '{ table_id, column?, check_type, params{}, severity: "warn"|"error", owner_team }', response: '{ expectation_id }', description: 'Define a quality expectation for a table or column' },
        { method: 'POST', path: '/api/runs/{pipeline_run_id}/evaluate', params: '{ table_id, partition_key? }', response: '{ run_id, passed: int, failed: int, warnings: int, checks[{ expectation_id, status, actual_value, expected }] }', description: 'Evaluate all expectations for a table after a pipeline run' },
        { method: 'GET', path: '/api/tables/{id}/profile', params: 'date?, lookback_days?', response: '{ row_count, columns[{ name, null_rate, distribution_summary, drift_score, trend[] }] }', description: 'Retrieve current and historical profile for a table' },
        { method: 'GET', path: '/api/tables/{id}/lineage/impact', params: 'check_failure_id', response: '{ affected_tables[], affected_features[], affected_models[], estimated_impact_severity }', description: 'Show all downstream systems affected by a quality failure' },
        { method: 'POST', path: '/api/quarantine', params: '{ table_id, partition_key, reason, check_failure_id }', response: '{ quarantine_id, status }', description: 'Quarantine a partition to prevent it being read by downstream jobs' },
        { method: 'GET', path: '/api/incidents/{id}', params: '', response: '{ root_cause_candidates[], affected_downstream[], suggested_actions[], timeline[] }', description: 'Retrieve auto-generated incident report for a quality failure' },
      ],
    },

    dataModel: {
      description: 'Expectations and check results in PostgreSQL; time-series profile metrics in ClickHouse for fast analytical queries; lineage graph in a graph database',
      schema: `data_assets {
  id: uuid PK
  name: varchar(500)          -- e.g., "prod.ml_features.user_activity_daily"
  asset_type: enum(table, feature, model, pipeline)
  owner_team_id: uuid FK
  schema_hash: varchar(64)    -- changes when schema drifts
  last_profiled_at: timestamp
  freshness_sla_minutes: int nullable
}

quality_expectations {
  id: uuid PK
  asset_id: uuid FK
  column_name: varchar(200) nullable
  check_type: varchar(100)   -- e.g., "null_rate_below", "row_count_range", "no_duplicates", "distribution_stable"
  params: jsonb               -- { "max_null_rate": 0.01 } or { "min_rows": 1000000, "max_rows": 2000000 }
  severity: enum(warn, error)
  is_active: boolean
  owner_team_id: uuid FK
  created_at: timestamp
}

check_results {
  id: bigint PK
  expectation_id: uuid FK
  pipeline_run_id: varchar(200)
  asset_id: uuid FK
  partition_key: varchar(200) nullable
  status: enum(passed, failed, warned, skipped)
  actual_value: jsonb
  expected_value: jsonb
  drift_score: float nullable
  evaluated_at: timestamp
  -- Stored in ClickHouse for analytical queries
}

-- Stored in ClickHouse (columnar, time-series efficient)
column_profiles (
  asset_id uuid,
  column_name varchar(200),
  profile_date date,
  null_rate float,
  distinct_count bigint,
  mean float,
  p25 float,
  p50 float,
  p75 float,
  p99 float,
  top_values jsonb,
  ks_statistic float nullable,   -- vs training distribution
  chi_squared_p_value float nullable
)`,
      examples: [
        { table: 'quality_expectations', label: 'Null rate expectation on a critical feature column', json: '{ "id": "exp-a1b2c3", "asset_id": "tbl-d4e5f6", "column_name": "user_id", "check_type": "null_rate_below", "params": { "max_null_rate": 0.0001 }, "severity": "error", "is_active": true }' },
        { table: 'check_results', label: 'Failed check with drift score', json: '{ "id": 8823041, "expectation_id": "exp-g7h8i9", "pipeline_run_id": "run-2025-06-01-T14:00", "status": "failed", "actual_value": { "ks_statistic": 0.34, "p_value": 0.00001 }, "expected_value": { "max_ks_statistic": 0.05 }, "drift_score": 0.34, "evaluated_at": "2025-06-01T14:07:32Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Data engineers manually add Great Expectations checks to ETL scripts. Checks run as a final step in the pipeline. Results logged to a database. Slack alert sent when a check fails. No lineage tracking, no drift detection, no quarantine mechanism.',
      problems: [
        'Manual check authoring leads to inconsistent coverage — critical tables have no checks while low-importance tables have dozens',
        'No distribution drift detection means statistical shifts go undetected even when all rule-based checks pass',
        'No lineage means engineers cannot determine which downstream models are affected when a check fails',
        'No quarantine mechanism means bad data continues flowing to downstream pipelines and ML models while the incident is being investigated',
        'No centralized dashboard means monitoring quality across hundreds of pipelines requires checking each individually',
        'False alert storm when a transient infrastructure issue causes many pipelines to fail simultaneously — no correlation or deduplication',
      ],
    },

    advancedImplementation: {
      title: 'Automated Observability Platform with Drift Detection and Lineage-Aware Impact Analysis',
      description: 'An automated profiling agent runs after every pipeline completion and computes the full statistical profile of each output table using distributed SQL (Spark or BigQuery). Drift detection compares the current distribution to a reference window (the past 28 days or the training data distribution for ML features) using the KS test for continuous columns and chi-squared for categorical. A lineage graph maintained in a graph database enables immediate impact analysis: when a check fails, the platform traverses the lineage graph to find all downstream tables, features, and production models affected, and generates a pre-populated incident report.',
      keyPoints: [
        'Automated profiling with Spark: after each pipeline completion event (from Airflow or dbt), trigger a Spark job that computes null rates, value distributions, and percentiles over the full table — no sampling bias',
        'KS test for drift: compare the empirical CDF of a column today versus the reference period; a KS statistic above 0.05 with p-value below 0.01 triggers a drift alert; threshold tuned per column based on historical volatility',
        'Reference distribution for ML features: the monitoring system stores the training data distribution snapshot from the most recent model training run; drift is detected against this snapshot, not just recent history',
        'Lineage graph: every pipeline registers its inputs and outputs on startup; the graph is used for both impact analysis (who does this table affect?) and root cause analysis (which upstream changed?)',
        'Quarantine pattern: when a table partition fails a severity=error check, a quarantine flag is written to a fast key-value store (Redis); feature stores and data pipeline readers check this flag before reading and skip quarantined partitions, substituting the last known-good value',
        'Anomaly detection on metrics: in addition to rule-based checks, the platform runs an ARIMA or Prophet model on the time series of each metric (row_count, null_rate, mean) and alerts when the current value falls outside the prediction interval — catches anomalies that rules cannot anticipate',
        'Alert correlation: when 50 pipelines fail at the same time due to a shared upstream dependency, the platform groups all failures into one incident rather than sending 50 separate pages; root cause is identified as the common upstream ancestor in the lineage graph',
      ],
      databaseChoice: 'ClickHouse for column profiles and check result history (columnar, fast aggregation over time ranges); PostgreSQL for expectations, incidents, and quarantine records; Neo4j or JanusGraph for the lineage dependency graph; Redis for the hot quarantine flag cache read by data pipelines on every read',
      caching: 'Quarantine flags cached in Redis with 5-minute TTL — pipeline readers check Redis first to avoid adding latency to the data path; lineage subgraphs for the top 100 most-queried tables cached in application memory; check result summaries cached in Redis for the monitoring dashboard',
    },

    tips: [
      'Distinguish three types of checks: schema checks (structure), rule-based checks (business logic), and statistical checks (distribution) — interviewers expect you to cover all three',
      'The hardest problem is tuning thresholds: too tight and you get alert fatigue from false positives; too loose and real issues go undetected — discuss automatic threshold tuning based on historical volatility',
      'Quarantine is the most operationally important feature for ML teams — preventing bad features from reaching a model is better than detecting the degradation after the fact',
      'Lineage-aware impact analysis is what separates an observability platform from a simple alerting system — be ready to discuss how you represent and traverse the lineage graph',
      'Alert correlation (grouping related failures into one incident) is essential at scale — without it, a single upstream outage generates hundreds of pages',
      'Distribution drift against the training data snapshot is specifically important for ML — drifting from the training distribution even if within normal operational bounds is a model performance risk',
    ],

    keyQuestions: [
      {
        question: 'How do you detect that a feature distribution has drifted enough to affect model performance?',
        answer: `Why Rule-Based Checks Miss Drift

A rule check "null_rate must be below 1%" will pass even if the feature distribution has completely changed shape — all values present, no nulls, but the model is now operating out of distribution.

Kolmogorov-Smirnov Test for Continuous Features

The KS statistic measures the maximum difference between two empirical CDFs:
\`\`\`
KS statistic D = max|F_reference(x) - F_current(x)|

D = 0.0: identical distributions
D = 0.05: small, likely acceptable drift
D = 0.20: significant drift, model performance likely degraded
D = 1.0: completely different distributions
\`\`\`

In practice: use a p-value threshold (p < 0.01) AND a minimum effect size (D > 0.05) to trigger alerts. P-value alone flags trivially small differences as significant in large datasets.

Chi-Squared Test for Categorical Features

\`\`\`
For a categorical feature "device_type":
  Reference:  {mobile: 60%, desktop: 35%, tablet: 5%}
  Current:    {mobile: 45%, desktop: 50%, tablet: 5%}

  chi_squared = sum((observed - expected)^2 / expected)
  If chi_squared > critical_value → reject null hypothesis of same distribution
\`\`\`

Reference Distribution Choice

- Production monitoring: compare against rolling 28-day window
- ML feature monitoring: compare against the training data snapshot stored when the model was trained
- The training snapshot comparison is more meaningful for model performance: a feature that was 60% mobile during training but is now 45% mobile will degrade model accuracy even if current vs last-week is stable

Drift severity scoring: map D statistic to a severity tier for prioritized alerting rather than binary pass/fail. Small drift (D=0.05-0.10) gets a warning; large drift (D>0.20) pages on-call immediately.`,
      },
      {
        question: 'How do you trace a data quality issue upstream to its root cause in a complex DAG pipeline?',
        answer: `The Lineage Graph

Every pipeline registers its input and output datasets on startup:
\`\`\`
Pipeline "user_features_daily" declares:
  inputs: [raw_events, user_profiles, product_catalog]
  outputs: [ml_features.user_activity_daily]
\`\`\`

This builds a directed acyclic graph:
\`\`\`
raw_events → user_features_daily → ml_features.user_activity_daily → model_v2
user_profiles ↗                                                      ↘ predictions
\`\`\`

Root Cause Algorithm (Backward BFS)

When a quality check fails on table T:
\`\`\`
1. Start at T, traverse lineage edges BACKWARD (to inputs)
2. For each upstream table U:
   - Did U's quality checks also fail in this run? YES → add to suspect list
   - Did U's schema change since last run? YES → add to suspect list
   - Did U's row count drop significantly? YES → add to suspect list
3. The earliest upstream node with a quality issue is the likely root cause
\`\`\`

In practice:
\`\`\`
ml_features.user_activity_daily → FAIL (drift in user_id null rate)
  ↑ upstream: user_profiles → FAIL (row count dropped 40%)
    ↑ upstream: raw_events → PASS
    ↑ upstream: crm_sync → FAIL (no data for past 2 hours)

Root cause candidate: crm_sync pipeline stopped ingesting
\`\`\`

Automated incident report generated:
- Failing table: ml_features.user_activity_daily
- Root cause candidate: crm_sync (no data ingested since 14:00)
- Affected models: model_v2 (in production, serving 100% traffic)
- Suggested action: check CRM API connectivity; quarantine today's user_activity_daily partition`,
      },
    ],

    keyDecisions: [
      'Rule-based checks vs statistical anomaly detection vs both — chose both: rules for known constraints (null rates, row count bounds, valid enum values), statistical detection for unknown drift patterns; neither alone is sufficient',
      'KS test vs Population Stability Index (PSI) for drift detection — chose KS test for its statistical rigor and interpretable p-value; PSI is simpler but lacks a principled significance test',
      'Quarantine via metadata flag vs physical data move — chose metadata flag in Redis because physical data movement is slow and prevents recovery; a flag can be cleared instantly when data is re-processed',
      'ClickHouse vs TimescaleDB for profile metrics — chose ClickHouse because its columnar format executes analytical window queries (30-day rolling average per column) 10-50x faster than row-oriented TimescaleDB',
      'Alert per-check vs alert per-incident (correlated) — chose correlated alerting: group all failures with a common upstream ancestor into one incident to prevent alert storms from infrastructure outages',
    ],
  },

  {
    id: 'semantic-cache',
    isNew: true,
    title: 'Semantic Cache System',
    subtitle: 'Cache LLM Responses Using Vector Similarity — GPTCache / Redis Semantic Cache',
    icon: 'database',
    color: '#10b981',
    difficulty: 'Medium',
    description: 'Design a semantic caching layer that reduces LLM API costs and latency by returning cached responses for semantically equivalent queries, using vector similarity instead of exact string matching.',

    introduction: `Large language model API calls are expensive — a single GPT-4 call can cost $0.01 to $0.10 depending on length, and at scale this accumulates to thousands of dollars per day. A significant fraction of these calls are semantically redundant: users ask "What is the capital of France?", "Tell me the capital of France", and "Which city is the capital of France?" — three different strings, one correct answer. A traditional cache keyed on exact string matching misses all of these hits. A semantic cache, by contrast, embeds the incoming query, finds similar past queries in a vector index, and returns the cached response if the similarity exceeds a threshold.

The core challenge in semantic caching is threshold calibration. Set the similarity threshold too high and almost nothing matches — cache hit rate is negligible and costs remain unchanged. Set it too low and semantically different questions get the same answer: "What is the capital of Germany?" and "What is the capital of France?" might have a cosine similarity of 0.82 due to shared syntactic structure, causing the wrong answer to be returned. The threshold must be tuned per-domain and per-application type.

Multi-tenancy introduces a critical isolation requirement. In a SaaS platform where many companies use the same LLM-powered feature, company A's cached responses must never be served to company B. Not only is this a data privacy requirement, it is also a correctness concern: a cached response about company A's internal documents should obviously not leak to company B. The namespace isolation must be enforced at the vector store level, not just the application level.

Cache invalidation in a semantic cache has different semantics than a traditional cache. A semantic cache entry becomes invalid when the underlying facts change (a company was acquired, a policy was updated) or when the LLM model is updated (the new model gives better or different answers). Both require efficient bulk invalidation of related cache entries — something that requires the cache to understand the semantic content, not just a TTL.`,

    functionalRequirements: [
      'Embed incoming queries using a fast embedding model and search the cache for semantically similar past queries',
      'Return cached responses when the similarity to a past query exceeds a configurable per-tenant threshold',
      'Store new query-response pairs in the cache when no similar cached entry is found',
      'Enforce strict per-tenant namespace isolation so cached responses cannot leak between tenants',
      'Support configurable TTLs per cache entry with automatic expiry of stale responses',
      'Provide cache hit rate, latency, and cost savings analytics per tenant and per application',
      'Support bulk invalidation of related cache entries when underlying data changes or the model is updated',
      'Allow threshold configuration per application type (factual QA: strict threshold; creative writing: no semantic caching)',
    ],

    nonFunctionalRequirements: [
      'Cache lookup latency: under 20ms p99 (including embedding + vector search) to be invisible to end-users vs a direct API call',
      'Embedding throughput: sustain 1000 embedding requests per second for the query embedding step',
      'Cache scale: support 100M cached query-response pairs per large tenant',
      'Hit rate target: achieve 30-60% cache hit rate for typical enterprise FAQ and customer support use cases',
      'Isolation guarantee: zero cross-tenant cache hits under any load or fault condition',
      'Availability: 99.9% — a cache miss should gracefully fall through to the LLM, not cause an error',
    ],

    estimation: {
      users: '500 SaaS tenants, each with 10K-100K users; 50M LLM API calls per day across all tenants before caching',
      storage: '100M cached entries × (query embedding 1536-dim float32 = 6KB + response avg 2KB) = ~800GB; vector index overhead 2-3x = 2TB total',
      bandwidth: '50M LLM calls/day → target 40% cache hit rate → 20M cache lookups/day = 230 lookups/sec sustained; each lookup embeds query (1KB input) and searches index',
      qps: '500 embedding requests/sec (1 per LLM call); 500 vector searches/sec; 200 cache writes/sec (for misses)',
    },

    apiDesign: {
      description: 'Transparent proxy API that sits in front of the LLM provider; applications call the semantic cache endpoint instead of the LLM directly',
      endpoints: [
        { method: 'POST', path: '/v1/cache/lookup', params: '{ tenant_id, query, model, threshold? }', response: '{ hit: bool, response?, cached_at?, similarity_score? }', description: 'Look up a semantically similar cached response; returns null if no hit above threshold' },
        { method: 'POST', path: '/v1/cache/store', params: '{ tenant_id, query, response, model, ttl_seconds? }', response: '{ entry_id, stored: bool }', description: 'Store a new query-response pair in the cache after an LLM call' },
        { method: 'DELETE', path: '/v1/cache/invalidate', params: '{ tenant_id, query?, topic?, model? }', response: '{ invalidated_count }', description: 'Invalidate cache entries matching a query, topic cluster, or model version' },
        { method: 'GET', path: '/v1/cache/analytics', params: 'tenant_id, start_date, end_date', response: '{ hit_rate, hits, misses, cost_saved_usd, avg_latency_ms, top_query_clusters[] }', description: 'Retrieve cache performance and cost savings metrics' },
        { method: 'PUT', path: '/v1/cache/config', params: '{ tenant_id, similarity_threshold, ttl_seconds, excluded_topics[] }', response: '{ config_id }', description: 'Update per-tenant cache configuration and threshold' },
      ],
    },

    dataModel: {
      description: 'Cache entries stored in a vector database (Qdrant or Weaviate) with tenant namespace isolation; analytics in ClickHouse',
      schema: `-- Stored in Qdrant / Weaviate (vector DB)
cache_entries {
  id: uuid
  tenant_id: uuid                -- partition key for namespace isolation
  query_text: text
  query_embedding: float[1536]   -- OpenAI text-embedding-3-small or similar
  response_text: text
  model: varchar(100)            -- "gpt-4o", "claude-3-5-sonnet", etc.
  ttl_expires_at: timestamp
  hit_count: int
  created_at: timestamp
  topic_cluster_id: int nullable -- cluster assigned by periodic k-means run
}

-- Stored in ClickHouse for analytics
cache_events {
  tenant_id: uuid,
  event_type: enum(hit, miss, store, invalidate),
  query_hash: varchar(64),
  similarity_score: float nullable,
  latency_ms: int,
  model: varchar(100),
  cost_saved_usd: float nullable,
  timestamp: datetime
}

tenant_cache_config {
  tenant_id: uuid PK
  similarity_threshold: float default 0.92
  default_ttl_seconds: int default 3600
  max_entries: bigint default 10000000
  excluded_models: text[]
  excluded_topics: text[]
  updated_at: timestamp
}`,
      examples: [
        { table: 'cache_entries', label: 'Cached FAQ response with high hit count', json: '{ "id": "ce-a1b2c3", "tenant_id": "t-corp123", "query_text": "What is your refund policy?", "model": "gpt-4o", "response_text": "Our refund policy allows returns within 30 days of purchase...", "ttl_expires_at": "2025-06-02T00:00:00Z", "hit_count": 847, "created_at": "2025-05-26T09:00:00Z" }' },
        { table: 'cache_events', label: 'Cache hit event with similarity score', json: '{ "tenant_id": "t-corp123", "event_type": "hit", "similarity_score": 0.947, "latency_ms": 12, "model": "gpt-4o", "cost_saved_usd": 0.032, "timestamp": "2025-06-01T14:23:11Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A Redis cache with exact-match hashing on query string. The query is lowercased and stripped of punctuation before hashing. Cache TTL of 24 hours. No semantic similarity — only exact string matches hit the cache.',
      problems: [
        'Exact matching misses the vast majority of semantically equivalent queries — cache hit rate under 5% for natural language queries',
        'No namespace isolation in Redis — tenant A can see tenant B entries if they share a Redis cluster and application-layer bugs occur',
        'No analytics on cost savings or hit rate — impossible to demonstrate ROI or tune the cache',
        'TTL-based invalidation cannot invalidate specific topics when data changes',
        'Cache grows unboundedly until Redis OOM; no eviction policy tuned for semantic cache access patterns',
      ],
    },

    advancedImplementation: {
      title: 'Vector Similarity Cache with Tenant Isolation and Adaptive Thresholding',
      description: 'Incoming queries are embedded using a fast low-cost embedding model (text-embedding-3-small at $0.00002/1K tokens vs $0.04 for GPT-4 output). The embedding is searched against the tenant-namespaced vector index using approximate nearest neighbor search. If the top result exceeds the similarity threshold, the cached response is returned. Otherwise, the LLM is called and the result is stored in the cache. A periodic background job clusters cached entries by topic using k-means, enabling topic-level invalidation.',
      keyPoints: [
        'Embedding model selection: use a cheaper, faster embedding model (ada-002 or text-embedding-3-small) for cache lookup — the embedding cost is $0.00002 vs $0.04 per LLM call, so embedding every query is cost-effective even on cache misses',
        'Tenant namespace isolation enforced at the vector DB level: each tenant has a dedicated Qdrant collection (not just a filter on a shared collection) — a misconfigured filter cannot cause cross-tenant leakage',
        'Threshold calibration: collect labeled pairs of (query_a, query_b, should_reuse_response) from human evaluation; fit a logistic regression on cosine similarity → probability of correct reuse; tune threshold to achieve desired precision/recall tradeoff (typically 0.90-0.95 cosine similarity)',
        'Adaptive threshold per query type: factual questions (capitals, dates, definitions) use a high threshold 0.95; procedural questions use 0.92; open-ended creative questions are excluded from caching entirely',
        'Topic clustering for bulk invalidation: nightly k-means clusters all cache entries by embedding; each entry is tagged with a cluster ID; when underlying data changes (product catalog updated), invalidate all entries in the relevant topic clusters',
        'Two-phase cache write: after an LLM response is returned to the user, asynchronously write to the cache — the write does not block the user response and a write failure is non-critical',
        'Cache hit boosting: entries with high hit counts get a small score boost in ANN search results — popular questions are more likely to be returned even if a slightly closer entry exists',
      ],
      databaseChoice: 'Qdrant for the vector cache (supports per-collection tenant isolation, fast HNSW ANN, payload filtering for TTL); Redis for hot-path cache entry deduplication (prevent writing identical entries simultaneously from concurrent requests); ClickHouse for analytics (hit rates, cost savings by tenant, top query clusters)',
      caching: 'The semantic cache IS the cache layer — no additional caching needed on the query lookup path; the embedding model output is cached in application memory for repeated identical queries within the same session (LRU with 10K entry capacity)',
    },

    tips: [
      'State the core tradeoff immediately: similarity threshold calibration is the hardest part — too low returns wrong answers, too high kills hit rate',
      'Tenant isolation is the most important non-functional requirement for multi-tenant SaaS — enforce it at the storage layer, not just application logic',
      'Cost savings are easy to quantify and will impress interviewers: a 40% cache hit rate on 50M GPT-4 calls/day at $0.03 average = $600K/day saved',
      'Discuss what NOT to cache: real-time data questions ("what is the stock price right now?"), personalized responses that depend on user state, and creative writing where variation is desirable',
      'Cache invalidation strategies are interesting to discuss: TTL-based (simple, may serve stale answers), model-version-based (invalidate all on model upgrade), and topic-based (invalidate when underlying knowledge changes)',
      'The embedding call itself adds latency — use a small fast embedding model and parallelize the embed + ANN search if the application architecture allows it',
    ],

    keyQuestions: [
      {
        question: 'How do you choose the similarity threshold between "close enough to reuse" and "different enough to re-query"?',
        answer: `Why the Threshold Matters

At cosine similarity 0.99: nearly identical queries match. High precision, very low recall.
At cosine similarity 0.70: semantically related but different questions match. Low precision, high recall.

"What is the capital of France?" vs "What is the capital of Germany?" often scores 0.82-0.88 because of shared syntactic structure — returning the wrong answer with high confidence.

Empirical Calibration Approach

\`\`\`
1. Collect 1000 pairs of real user queries from your application logs
2. For each pair, a human annotator labels: "would returning the answer to query_A
   for query_B give a correct, helpful response?" (yes/no)
3. Plot precision-recall curve as threshold varies from 0.70 to 0.99
4. Choose threshold that achieves desired precision target (e.g., 98% precision
   = wrong answer rate < 2%)
\`\`\`

Domain-Specific Thresholds

Different question types have different error costs:
\`\`\`
Factual single-answer questions (capitals, dates, definitions):
  Threshold: 0.95 — very low tolerance for wrong answers

Multi-step procedural questions:
  Threshold: 0.92 — slight variation in wording = same procedure

Open-ended analysis questions:
  Threshold: 0.99 or SKIP — even small wording differences may need different analysis

Customer support FAQs:
  Threshold: 0.90 — "how do I cancel?" and "what's the cancellation process?"
  are semantically equivalent for support purposes
\`\`\`

Continuous monitoring: track the "cache hit accuracy rate" by sampling cached hits and evaluating whether the returned response was appropriate (using a lightweight LLM judge or human evaluation). Auto-raise threshold if accuracy drops below 95%.`,
      },
      {
        question: 'How do you prevent the semantic cache from leaking one tenant\'s data to another?',
        answer: `Why Application-Layer Isolation Is Insufficient

If you store all tenants in one shared Qdrant collection and filter by tenant_id at query time:
\`\`\`python
# Dangerous: filter is applied AFTER ANN search pre-selection
results = collection.search(
    query_vector=embedding,
    query_filter=Filter(must=[FieldCondition(key="tenant_id", match=MatchValue(value="tenant_A"))]),
    limit=1
)
\`\`\`

A bug in the filter condition, a query parameter injection, or a library vulnerability could return results from other tenants. The consequences in a B2B SaaS context are severe: company A sees company B's proprietary chatbot responses.

Collection-Level Isolation (Recommended)

\`\`\`python
# Each tenant gets a dedicated Qdrant collection
collection_name = f"cache_{tenant_id}"  # e.g., "cache_t-corp123"

# Search is scoped to the collection — no filter needed
results = client.search(
    collection_name=collection_name,
    query_vector=embedding,
    limit=1
)
\`\`\`

A misconfigured filter cannot leak across collections — they are physically separate indexes.

Tradeoffs:
- 500 tenants × 1 collection each = 500 Qdrant collections
- Qdrant supports thousands of collections — not a scaling concern
- Segment-level memory isolation: each collection uses its own HNSW index, preventing any data mixing at the storage layer

Additional safeguards:
- Tenant ID verified from authenticated JWT before any cache operation — never taken from request body
- Cache entry includes tenant_id in the stored payload as a double-check; log and alert on any retrieval where payload tenant_id != authenticated tenant_id
- Regular automated penetration tests: attempt cross-tenant lookups and verify they return empty results`,
      },
    ],

    keyDecisions: [
      'Vector database (Qdrant) vs Redis with vector search (Redis VSS) — chose Qdrant because it provides collection-level tenant isolation, purpose-built for billion-scale ANN search, and supports payload filtering for TTL without a separate expiry mechanism',
      'Cheap embedding model for cache lookup vs same model as the LLM — chose cheap model (text-embedding-3-small): the embedding is only used for similarity search, not for generation quality; cost is 2000x lower than GPT-4 tokens',
      'Synchronous cache write vs asynchronous — chose asynchronous: writing to the cache is not on the critical path, a write failure should not delay the user response, and async write allows batching multiple cache writes for efficiency',
      'TTL-based invalidation vs topic-based invalidation — chose both: TTL for freshness (answers older than N days may be stale), topic-based for targeted invalidation when known changes occur (product launches, policy updates)',
      'Cache everything vs selective caching — chose selective: exclude real-time data questions, personalized responses keyed on user state, and creative/open-ended prompts where variation has value; caching these would deliver wrong or stale answers',
    ],
  },

  {
    id: 'ml-experiment-tracking',
    isNew: true,
    title: 'ML Experiment Tracking System',
    subtitle: 'Design MLflow / Weights and Biases / Neptune',
    icon: 'git-branch',
    color: '#f59e0b',
    difficulty: 'Medium',
    description: 'Design a system to track ML experiments — logging hyperparameters, metrics, and artifacts for every training run so researchers can compare runs, reproduce results, and trace production models to their training data.',

    introduction: `Machine learning research is inherently experimental. A researcher trains dozens or hundreds of model variants, each with different hyperparameters, architectures, and training data compositions, before finding one that performs well enough to deploy. Without a systematic experiment tracking system, this process devolves into a spreadsheet of manually recorded notes that is inevitably incomplete, inconsistent, and unable to answer the question that matters most in production: exactly how was this model trained, and can we reproduce it?

Experiment tracking systems provide an SDK that researchers instrument into their training code. With a few lines of code, every training run automatically records the hyperparameters used, the loss and accuracy at each training step, GPU utilization and memory consumption, and the model checkpoint files produced. The system provides a web UI for comparing runs side-by-side, filtering by hyperparameter values, and visualizing training curves.

The artifact storage problem is non-trivial at scale. A single model checkpoint for a large language model can be 500GB. If a team runs 1000 experiments per month, naive storage of all checkpoints would require 500TB per month. The system needs intelligent retention policies — keeping only the best checkpoint per run, or only checkpoints for runs that exceeded a certain validation accuracy threshold — while ensuring that production model checkpoints are never deleted regardless of retention policy.

Reproducibility is the deepest requirement. Given a training run ID, a researcher should be able to exactly reproduce the training — same model output given same input data and the same random seed. This requires capturing not just hyperparameters and code, but the exact environment: Python version, library versions, CUDA version, and the random seeds used by each library. Without all of these, the same code on the same data will produce a different model.`,

    functionalRequirements: [
      'Log hyperparameters, metrics per step, and system metrics (GPU, memory, throughput) for every training run',
      'Store and version model artifacts: checkpoints, evaluation outputs, confusion matrices, dataset snapshots',
      'Provide a UI for comparing multiple runs side-by-side on any logged metric',
      'Capture the full reproducibility context: git commit, Python environment, random seeds, hardware spec',
      'Support parallel experiment management: 100 hyperparameter search runs in parallel, all reporting to one experiment',
      'Enable search and filtering: find all runs with learning_rate between 0.001 and 0.01 and val_accuracy above 0.95',
      'Record model lineage: trace a production model deployment back to its training run, dataset version, and git commit',
      'Provide team collaboration features: share experiments, leave comments on runs, compare across team members',
    ],

    nonFunctionalRequirements: [
      'Metric logging throughput: accept 10K metric points per second per training run without blocking the training process',
      'Artifact upload throughput: sustain 1 GB/s upload for model checkpoint files from multiple concurrent runs',
      'Query latency: return run comparison data for 100 runs with 1000 metrics each in under 2 seconds',
      'Storage scale: support 1M runs with 10B metric data points and 100TB of artifact storage',
      'SDK overhead: the experiment tracking SDK must add less than 1% overhead to training wall-clock time',
      'Availability: 99.9% — a tracking system outage should never block training jobs from running',
    ],

    estimation: {
      users: '500 ML researchers running 50 experiments per week each = 25K runs per week; 10 runs active simultaneously per researcher = 5K concurrent logging connections',
      storage: '25K runs/week × 1M metric points/run = 25B metrics/week; columnar storage at 20 bytes/point = 500GB/week metrics; artifacts 25K runs × 10GB avg checkpoint = 250TB/week (with retention policies: keep only top 10% = 25TB/week retained)',
      bandwidth: '5K concurrent training runs × 10K metric points/sec = 50M points/sec peak ingest; artifact uploads 100 concurrent runs × 100 MB/s = 10 GB/s',
      qps: '50M metric ingestion points/sec; 1K artifact uploads/hr; 500 experiment dashboard queries/sec',
    },

    apiDesign: {
      description: 'SDK-first API used by training code to log metrics and artifacts; REST API used by the web UI for querying and comparison',
      endpoints: [
        { method: 'POST', path: '/api/runs', params: '{ experiment_id, name, tags{}, config{} }', response: '{ run_id, artifact_uri }', description: 'Create a new training run and receive a run ID for subsequent logging' },
        { method: 'POST', path: '/api/runs/{run_id}/metrics', params: '{ metrics[{ key, value, step, timestamp }] }', response: '{ logged_count }', description: 'Batch log metric values — SDK batches and sends every 5 seconds' },
        { method: 'POST', path: '/api/runs/{run_id}/artifacts', params: 'multipart: file + { path, description }', response: '{ artifact_id, storage_uri }', description: 'Upload a model checkpoint or evaluation artifact' },
        { method: 'GET', path: '/api/experiments/{id}/runs', params: 'filter_expr?, sort_by?, limit?, offset?', response: '{ runs[{ run_id, status, metrics_summary, params, tags }], total }', description: 'List and filter runs in an experiment' },
        { method: 'POST', path: '/api/runs/compare', params: '{ run_ids[], metrics[] }', response: '{ comparison[{ run_id, metric_histories{} }] }', description: 'Retrieve metric history for multiple runs for side-by-side comparison' },
        { method: 'GET', path: '/api/runs/{run_id}/reproduce', params: '', response: '{ git_commit, conda_env, pip_freeze, docker_image, random_seeds{}, launch_command }', description: 'Retrieve all context needed to exactly reproduce a training run' },
      ],
    },

    dataModel: {
      description: 'Run metadata and parameters in PostgreSQL; metric time series in ClickHouse for efficient analytical queries; artifacts in S3 with content-addressed storage',
      schema: `experiments {
  id: uuid PK
  name: varchar(500)
  team_id: uuid FK
  description: text nullable
  tags: text[]
  artifact_location: text    -- base S3 path for this experiment's artifacts
  created_at: timestamp
  created_by: uuid FK
}

runs {
  id: uuid PK
  experiment_id: uuid FK
  name: varchar(500)
  status: enum(running, completed, failed, killed)
  start_time: timestamp
  end_time: timestamp nullable
  params: jsonb              -- { "learning_rate": 0.001, "batch_size": 32, ... }
  tags: jsonb
  git_commit: varchar(40)
  git_repo: text
  pip_requirements_hash: varchar(64)
  random_seeds: jsonb        -- { "python": 42, "numpy": 42, "torch": 42 }
  hardware: jsonb            -- { "gpu": "A100-80GB", "count": 8, "cuda": "12.1" }
  created_by: uuid FK
}

-- Stored in ClickHouse for fast time-series queries
run_metrics (
  run_id uuid,
  key varchar(200),          -- e.g., "train/loss", "val/accuracy", "gpu/utilization"
  value float64,
  step int64,
  timestamp datetime64
  -- Partitioned by toYYYYMM(timestamp)
)

artifacts {
  id: uuid PK
  run_id: uuid FK
  path: varchar(1000)        -- e.g., "checkpoints/epoch_10.pt"
  storage_uri: text          -- s3://mlflow-artifacts/{content_hash}
  content_hash: varchar(64)  -- SHA-256 of file content
  size_bytes: bigint
  artifact_type: varchar(100)
  description: text nullable
  is_pinned: boolean         -- pinned artifacts never deleted by retention policy
  uploaded_at: timestamp
}`,
      examples: [
        { table: 'runs', label: 'A training run with full reproducibility context', json: '{ "id": "run-a1b2c3d4", "experiment_id": "exp-e5f6", "name": "bert-finetune-lr1e-4-bs32", "status": "completed", "params": { "learning_rate": 0.0001, "batch_size": 32, "epochs": 10, "model": "bert-base-uncased" }, "git_commit": "3a7f2c1d9b", "random_seeds": { "python": 42, "numpy": 42, "torch": 42 }, "hardware": { "gpu": "A100-80GB", "count": 4, "cuda": "12.1" } }' },
        { table: 'artifacts', label: 'Pinned best model checkpoint', json: '{ "id": "art-g7h8i9j0", "run_id": "run-a1b2c3d4", "path": "checkpoints/best_model.pt", "content_hash": "sha256-abc123...", "size_bytes": 438914048, "artifact_type": "model_checkpoint", "is_pinned": true }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A Flask API that receives metric logs and writes them to PostgreSQL. Model files are uploaded to a shared NFS mount. Researchers query the database directly using SQL for run comparison. No artifact versioning — files are overwritten on each run.',
      problems: [
        'PostgreSQL is row-oriented and cannot efficiently execute window queries over millions of metric time series points — run comparison queries time out',
        'NFS shared storage creates write contention when hundreds of runs upload checkpoints simultaneously',
        'No content-addressed artifact storage means two runs training the same model produce duplicate copies of identical checkpoints, wasting storage',
        'No environment capture means a "reproduced" run produces a slightly different model due to library version differences',
        'No retention policy — artifacts accumulate indefinitely until storage is full',
        'Synchronous metric logging blocks the training loop when the API is slow — adds training time overhead',
      ],
    },

    advancedImplementation: {
      title: 'Distributed Experiment Store with Content-Addressed Artifacts and Columnar Metric Storage',
      description: 'Metric ingestion uses an async SDK that buffers metric points in memory and flushes to the server every 5 seconds via a background thread — zero blocking overhead on the training loop. The server writes metrics to ClickHouse, which executes window function queries over billions of metric points in seconds. Artifacts are stored in S3 using content-addressed storage: the S3 key is the SHA-256 hash of the file content. Two runs uploading the same checkpoint upload once and share the storage, reducing artifact storage by 40-70% for hyperparameter searches that explore similar model configurations.',
      keyPoints: [
        'Async SDK design: training code calls mlflow.log_metric() which appends to an in-process queue; a background thread drains the queue and sends batched POST requests every 5 seconds — the training loop is never blocked by logging I/O',
        'ClickHouse for metrics: columnar storage executes "show me the val_loss curve for run X over 100K steps" in milliseconds; the run comparison query for 100 runs × 1K steps each is a vectorized column scan, not 100K row fetches',
        'Content-addressed artifact storage: S3 key = SHA-256 hash of file content; before uploading, check if hash already exists in S3; if yes, record the pointer in the artifacts table without uploading — deduplication at zero cost',
        'Retention policy engine: nightly job evaluates retention rules (keep top-3 checkpoints per run by val_accuracy, always keep pinned artifacts, delete artifacts from failed runs after 7 days); sends pre-delete notifications before irreversible deletion',
        'Reproducibility bundle: the "reproduce" API endpoint fetches git commit, pip requirements, conda environment YAML, Dockerfile, and random seeds from the run metadata and packages them into a tarball — one command to recreate the exact training environment',
        'Experiment hierarchy: project → experiment → run → nested run (for hyperparameter search: one parent run with one child run per configuration) — enables comparing HPO results within a single experiment view',
        'Metric visualization: time-series data streamed from ClickHouse to the browser via WebSocket during active runs — researchers see live loss curves without refreshing the page',
      ],
      databaseChoice: 'ClickHouse for metric time series (columnar, vectorized analytics, excellent compression for sequential float data); PostgreSQL for run metadata, experiment hierarchy, and artifact registry; S3 for artifact storage with content-addressed keys; Redis for active run state cache (which runs are currently training) and live metric aggregations',
      caching: 'Experiment dashboard caches the last-known metric summary per run in Redis (updated every 30s) so page loads are instant even for experiments with 10K runs; metric history for completed runs is immutable and cached aggressively; artifact download URLs are pre-signed S3 URLs cached for 1 hour',
    },

    tips: [
      'The three pillars of experiment tracking are: (1) logging (capturing what happened), (2) comparison (finding what worked), and (3) reproducibility (being able to recreate it) — structure your answer around these',
      'Metric storage is the hardest scaling problem — time series with billions of points per experiment needs a columnar store, not PostgreSQL',
      'Artifact deduplication via content-addressed storage is a clever optimization that also naturally provides artifact immutability — worth highlighting',
      'The SDK design matters: logging must be asynchronous and non-blocking, and must gracefully handle server downtime (buffer locally, retry) without crashing the training job',
      'Retention policy design is a good discussion point: different teams have different needs (researchers want to keep everything; ops wants to limit storage costs)',
      'Lineage from production model deployment back to training run, dataset version, and git commit is the key enterprise requirement — discuss how you would implement this end-to-end chain',
    ],

    keyQuestions: [
      {
        question: 'How do you store millions of metric data points per training run efficiently for fast retrieval and comparison?',
        answer: `The Storage Problem

A typical deep learning training run logs:
\`\`\`
- train/loss: every 10 steps for 100K steps = 10K points
- val/loss: every epoch (100 epochs) = 100 points
- gpu/utilization: every 30 seconds for 24h = 2880 points
- 20 other metrics at various frequencies

Total per run: ~50K metric points
100 concurrent runs: 5M points per run duration
\`\`\`

Why PostgreSQL Fails

Compare 50 runs on val_loss over 100K steps:
\`\`\`sql
SELECT run_id, step, value FROM metrics
WHERE run_id IN ('run-a', 'run-b', ...) AND key = 'val/loss'
ORDER BY run_id, step;
-- 50 runs × 100K steps = 5M row scan
-- PostgreSQL: reads all columns per row even though only (step, value) needed
-- Result: 10-30 second query
\`\`\`

Why ClickHouse Wins

ClickHouse stores each column separately. A query reading only (step, value) reads exactly those two columns from disk — other columns are not touched:
\`\`\`sql
SELECT run_id, step, value FROM run_metrics
WHERE run_id IN ('run-a', ...) AND key = 'val/loss'
ORDER BY run_id, step;
-- Reads only 3 columns out of 5 total
-- Vectorized execution: processes 8192 values per CPU instruction (SIMD)
-- Result: 50-200ms for the same query
\`\`\`

Additional optimizations:
- Partition by month: old data is stored in cold partitions that are rarely queried
- Sort key: (run_id, key, step) — queries for a specific run's specific metric are a sequential scan within the sort key
- Compression: ClickHouse compresses float columns with delta encoding + LZ4 — metric time series that generally decrease (loss) achieve 10-20x compression ratio`,
      },
      {
        question: 'How do you implement content-addressed artifact storage to ensure reproducibility?',
        answer: `Content-Addressed Storage Principle

The storage key is derived from the file content, not from the path or run ID:
\`\`\`python
import hashlib

def content_hash(file_path):
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    return sha256.hexdigest()

# S3 key = "artifacts/{hash[:2]}/{hash[2:4]}/{hash}"
# e.g.: "artifacts/3a/7f/3a7f2c1d9b..."
\`\`\`

Deduplication

Before uploading a 500GB checkpoint:
\`\`\`python
content_hash = compute_hash(checkpoint_path)

# Check if already stored
if s3_client.head_object(Bucket=bucket, Key=f"artifacts/{content_hash}"):
    # Already exists — just record the pointer
    db.insert_artifact(run_id=run_id, content_hash=content_hash)
    return  # Zero upload cost
else:
    # Upload and record
    s3_client.upload_file(checkpoint_path, bucket, f"artifacts/{content_hash}")
    db.insert_artifact(run_id=run_id, content_hash=content_hash)
\`\`\`

In a hyperparameter search with 50 runs all starting from the same pretrained base model checkpoint, only ONE copy of that checkpoint is stored. Typical deduplication savings: 40-70%.

Immutability guarantee

Once a file is written to a content-addressed location, it can never be overwritten — a different file would have a different hash and go to a different key. This guarantees that:
- Any run_id → artifact_id → content_hash chain is permanent
- The artifact retrieved today is byte-for-byte identical to what was uploaded at training time
- Artifact corruption is detectable: re-hash on download and compare

Retention with content-addressed storage

An artifact is only deleted from S3 when NO run references its content_hash — reference counting:
\`\`\`sql
DELETE FROM s3 WHERE content_hash = X
  ONLY IF (SELECT count(*) FROM artifacts WHERE content_hash = X AND is_pinned = false) = 0
\`\`\``,
      },
    ],

    keyDecisions: [
      'ClickHouse vs InfluxDB vs TimescaleDB for metric storage — chose ClickHouse because it executes multi-run comparison queries (the primary access pattern) via vectorized columnar scans; InfluxDB and TimescaleDB are optimized for single-series time range queries, not multi-series analytical comparison',
      'Content-addressed vs path-addressed artifact storage — chose content-addressed because it provides automatic deduplication (critical for HPO runs), immutability guarantees, and corruption detection at no additional complexity cost',
      'Async SDK logging vs synchronous — chose async because a network hiccup or server restart should never interrupt a 24-hour training job; the SDK buffers locally and retries',
      'PostgreSQL for run metadata vs a document database — chose PostgreSQL because run params are structured JSON with known query patterns (filter by learning_rate range, sort by val_accuracy) that benefit from SQL indexing',
      'Single artifact storage bucket vs per-experiment buckets — chose single shared bucket with content-addressed keys to maximize deduplication across experiments; access control enforced via S3 object-level IAM policies rather than bucket boundaries',
    ],
  },

  {
    id: 'ai-query-optimizer',
    isNew: true,
    title: 'AI-Powered Query Optimizer',
    subtitle: 'ML-Based Query Plan Selection — Bao / Neo / PostgreSQL ML Extensions',
    icon: 'cpu',
    color: '#dc2626',
    difficulty: 'Hard',
    description: 'Design an ML-based query optimizer that learns from past query execution history to select better query plans than the heuristic-based optimizer, reducing query latency by 2-10x for complex analytical queries.',

    introduction: `Traditional database query optimizers use a combination of statistics (table cardinalities, column distributions) and cost models to select execution plans. The optimizer estimates how many rows will flow through each operator, multiplies by operator costs, and selects the plan with the lowest total estimated cost. This approach works well for simple queries but systematically fails for complex multi-join analytical queries because cardinality estimation errors compound multiplicatively: if each of 10 join estimates is off by 2x, the final estimate can be off by 1024x, causing the optimizer to choose catastrophically wrong plans.

The key insight behind learned query optimization is that databases accumulate a rich historical record of queries and their actual execution statistics. Instead of relying on simple statistics to estimate plan costs, a learned optimizer can train a model that directly predicts the actual execution time of a candidate plan, given the query structure, table sizes, and database state. The model can learn correlations between query patterns and execution behavior that no heuristic can capture.

The deployment challenge is safety. A traditional optimizer, however suboptimal, is predictable and consistent. A learned optimizer might produce an excellent plan for 99% of queries but a catastrophically slow plan for 1%. In a production database serving thousands of queries per second, that 1% can cause timeouts and cascading failures. The learned optimizer must integrate gracefully with the traditional optimizer: use the ML model's recommendation when confidence is high, fall back to the traditional plan when uncertain, and detect regressions before they impact users.

The system must also handle online learning: as query patterns evolve, new tables are added, and data distributions change, the model must update without taking the database offline. This requires a continuous training pipeline that processes execution feedback asynchronously and deploys model updates without disrupting query processing.`,

    functionalRequirements: [
      'Intercept incoming SQL queries and generate multiple candidate execution plans using the database plan enumeration API',
      'Predict the actual execution latency for each candidate plan using a trained ML model',
      'Select and execute the plan predicted to have the lowest latency; inject optimizer hints or directly substitute the plan',
      'Collect actual execution statistics (rows processed per operator, actual latency) as feedback labels',
      'Continuously retrain the cost model on accumulated query execution history',
      'Fall back to the traditional optimizer plan when ML model confidence is below a threshold',
      'A/B test new model versions before full deployment: route a configurable percentage of queries to the new model',
      'Detect and alert on latency regressions: if ML-chosen plans perform worse than traditional plans, roll back automatically',
    ],

    nonFunctionalRequirements: [
      'Plan selection overhead: ML model inference must complete within 5ms to be acceptable for queries with existing latency under 100ms',
      'Model accuracy: ML-selected plans should have lower latency than traditional plans for at least 70% of complex analytical queries',
      'Safety: ML-chosen plan must never be more than 3x slower than the traditional plan — hard regression limit',
      'Training throughput: process 10K query execution records per minute for continuous model updates',
      'Coverage: the system should provide a plan recommendation for at least 95% of queries, falling back gracefully for the remaining 5%',
      'Zero downtime model updates: new model versions deployed without restarting the database or the query optimizer service',
    ],

    estimation: {
      users: 'One large data warehouse cluster serving 500 analysts and 50 data pipelines; 100K queries per day; peak 20 queries/sec',
      storage: '100K queries/day × 365 days × 10KB per query execution record (plan tree + statistics) = 365GB/year of training data; model size 500MB; plan cache 10GB in Redis',
      bandwidth: '20 queries/sec × 10KB plan features = 200KB/sec to ML inference service; 10K training records/min to training pipeline',
      qps: '20 plan selection requests/sec (one per incoming query); 10K training data writes/min; 1 model deployment per day',
    },

    apiDesign: {
      description: 'Internal API used by the database query router; not exposed to end users. The optimizer is a sidecar service that intercepts queries from the database connection pool.',
      endpoints: [
        { method: 'POST', path: '/api/optimize', params: '{ sql, database_state: { table_stats[] }, candidate_plans[] }', response: '{ selected_plan_id, predicted_latency_ms, confidence, hint_string }', description: 'Select the best plan from candidates; returns hint string to inject into the query' },
        { method: 'POST', path: '/api/feedback', params: '{ query_id, plan_id, actual_latency_ms, operator_stats[{ id, actual_rows, actual_time_ms }] }', response: '{ recorded: bool }', description: 'Record actual execution results as feedback for model training' },
        { method: 'POST', path: '/api/models/deploy', params: '{ model_version, traffic_percentage }', response: '{ deployment_id, active_model, canary_model }', description: 'Deploy a new model version to N% of traffic for A/B testing' },
        { method: 'GET', path: '/api/models/performance', params: 'start_time, end_time, model_version?', response: '{ win_rate, avg_speedup, regression_count, p95_latency_vs_traditional }', description: 'Compare ML model performance against traditional optimizer' },
        { method: 'POST', path: '/api/models/rollback', params: '{ model_version }', response: '{ status }', description: 'Emergency rollback to a previous model version' },
      ],
    },

    dataModel: {
      description: 'Query execution history stored in a time-series-friendly columnar store; model metadata in PostgreSQL; cached plan representations in Redis',
      schema: `query_executions {
  id: uuid PK
  query_fingerprint: varchar(64)    -- normalized query hash
  database_id: varchar(100)
  optimizer_used: enum(traditional, ml_model, ml_fallback)
  model_version: varchar(50) nullable
  traditional_plan_id: varchar(100)
  selected_plan_id: varchar(100)
  predicted_latency_ms: float nullable
  actual_latency_ms: float
  speedup_vs_traditional: float nullable
  rows_examined: bigint
  plan_hint: text
  executed_at: timestamp
}

plan_features {
  id: varchar(100) PK
  query_execution_id: uuid FK
  plan_tree_json: jsonb             -- normalized plan tree with operator types and cardinality estimates
  table_sizes: jsonb                -- { "orders": 50000000, "customers": 1000000 }
  join_order: text[]
  index_usage: jsonb
  estimated_cost: float
}

model_versions {
  id: varchar(50) PK               -- e.g., "v1.2.3"
  training_dataset_size: int
  val_loss: float
  val_win_rate: float              -- fraction of validation queries where model beats traditional optimizer
  training_completed_at: timestamp
  deployed_at: timestamp nullable
  traffic_percentage: int default 0
  is_active: boolean
  regression_alert_threshold_ms: float
}`,
      examples: [
        { table: 'query_executions', label: 'ML-selected plan that outperformed the traditional optimizer', json: '{ "id": "qe-a1b2", "query_fingerprint": "sha256-3f7a...", "optimizer_used": "ml_model", "model_version": "v1.2.3", "predicted_latency_ms": 420.0, "actual_latency_ms": 398.0, "speedup_vs_traditional": 4.7, "rows_examined": 2847382, "executed_at": "2025-06-01T14:00:01Z" }' },
        { table: 'model_versions', label: 'Deployed model version with performance metrics', json: '{ "id": "v1.2.3", "training_dataset_size": 500000, "val_loss": 0.082, "val_win_rate": 0.74, "deployed_at": "2025-06-01T09:00:00Z", "traffic_percentage": 100, "is_active": true }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A post-hoc analysis system: run queries using the traditional optimizer, collect execution statistics, and use them to build a lookup table of query fingerprint to better plan. Apply the better plan as a hint when the same query fingerprint is seen again. No ML model — just a hash map of previously seen queries to their best observed plans.',
      problems: [
        'Lookup table only applies to queries it has seen before — no generalization to new query shapes',
        'The best observed plan for a query on yesterday\'s data distribution may not be best today after bulk inserts change table sizes',
        'No confidence model — the system cannot distinguish between a plan that was observed once vs one observed 1000 times',
        'Cannot handle parameterized queries where the same query template needs different plans depending on the parameter values',
        'No safety net — applying a previously good plan to a different data state can cause catastrophic slowdown',
      ],
    },

    advancedImplementation: {
      title: 'Tree-Structured Neural Cost Model with Online Learning and Regression Safety',
      description: 'The optimizer uses a tree-structured neural network (TCNN or similar) that takes a query plan tree as input and predicts actual latency. The plan tree is first featurized: each operator node is encoded with operator type (hash join, merge join, index scan, seq scan), estimated vs actual cardinality from historical data, and current table statistics. The model predicts latency for each candidate plan (the database generates the top-K plans via its internal plan enumeration) and selects the predicted fastest. Actual execution statistics flow back asynchronously to retrain the model nightly. A shadow mode runs the ML optimizer alongside the traditional optimizer for 10% of queries, comparing predictions to actuals before enabling the ML optimizer for production traffic.',
      keyPoints: [
        'Tree-structured model architecture: query plans are trees of operators; a standard MLP cannot capture this structure; a tree-RNN or tree-CNN processes the plan bottom-up, building a representation of each subtree before combining at the root',
        'Learned cardinality estimation: instead of (or in addition to) learned cost model, predict the actual row count for each join operator; better cardinality estimates fed into the existing cost model can improve plan selection without replacing the cost model entirely',
        'Feature engineering for the cost model: operator type (one-hot), estimated selectivity (from statistics), actual-to-estimated ratio from historical similar queries, index availability, current memory available for hash joins, table size, partition pruning fraction',
        'Plan enumeration: the database exposes an internal API to enumerate the top-K plans by traditional cost without executing them; typically K=5-10 candidate plans are evaluated by the ML model in parallel; total inference time < 3ms for K=10 with a small MLP',
        'Regression safety guard: after executing an ML-selected plan, compare actual latency to the traditional optimizer estimate; if actual exceeds 3x the traditional estimate for more than 0.1% of queries, automatically disable the ML optimizer and page on-call',
        'Canary deployment: new model versions serve 5% traffic for 24 hours; automated regression tests compare win_rate (fraction of queries where ML plan beats traditional) and p99 latency; model is promoted to 100% only if win_rate > 65% and no regressions detected',
        'Cold start handling: for query types or table combinations never seen in training data, fall back to the traditional optimizer with a confidence flag — the model should know what it does not know',
      ],
      databaseChoice: 'ClickHouse for query execution history (columnar, fast for training data extraction queries like "find all executions with hash join operators in the top 2 join levels"); PostgreSQL for model metadata and deployment config; Redis for plan feature cache (avoid re-featurizing identical plan trees seen in rapid succession); S3 for model artifact storage',
      caching: 'Plan features for recently seen query fingerprints cached in Redis with 1-hour TTL (same query template run 1000 times per hour only featurized once); ML model loaded in-process memory for inference — no RPC overhead; traditional plan cached alongside ML plan for instant fallback without re-planning',
    },

    tips: [
      'Clarify the two distinct approaches: learned cardinality estimation (improve inputs to existing cost model) vs learned cost model (replace cost model with ML); the former is lower-risk and a good starting point',
      'Safety is the most important design constraint — discuss regression detection and fallback before discussing model architecture',
      'Plan featurization is where most of the engineering complexity lies: how do you encode a variable-size plan tree as fixed-size ML model input?',
      'Online learning creates a feedback loop: bad plans collected, model retrained, bad plans hopefully fixed — discuss how you prevent the model from training on its own worst predictions',
      'The shadow mode deployment pattern (run ML optimizer alongside traditional, compare offline before enabling) is essential for safe rollout — mention it explicitly',
      'Cardinality estimation errors are the root cause of most optimizer failures — you can get a lot of mileage from focusing on this subproblem alone rather than replacing the entire optimizer',
    ],

    keyQuestions: [
      {
        question: 'How does learned cardinality estimation improve on traditional statistics-based methods?',
        answer: `Why Traditional Cardinality Estimation Fails

Traditional optimizers estimate join output cardinality using the independence assumption:
\`\`\`
|A join B on A.x = B.y| ≈ |A| × |B| × selectivity(A.x) × selectivity(B.y)
\`\`\`

This assumes A.x and B.y are independent — an assumption almost always violated in real data:
\`\`\`
Example: orders join products join categories
  If categories.name = 'Electronics', then products.price is likely high
  Traditional optimizer: ignores this correlation
  Actual result: 10x more rows than estimated → wrong join order chosen
\`\`\`

Errors compound: 5 joins with 2x error each → 32x error on final cardinality.

Learned Cardinality Estimation

Train a model to predict |output| given:
- Query predicates (column, operator, value)
- Table statistics (histograms, column correlations from historical data)
- Historical actual cardinalities for similar query patterns

\`\`\`python
# Training example
features = encode_query(
    "SELECT * FROM orders o JOIN products p ON o.product_id = p.id "
    "WHERE p.category = 'Electronics' AND o.amount > 100"
)
label = actual_row_count_from_execution_log  # 48,291

# Model predicts: 51,203 (vs traditional estimate of 3,200)
\`\`\`

Key techniques:
- Multi-set convolution (MSCN): encode each predicate as a set, combine with set convolution
- Histogram learning: replace coarse histograms with a learned density estimator per column
- Join correlation learning: explicitly model correlations between joined columns using co-occurrence statistics from historical query logs

In practice: learned cardinality estimators reduce estimation error by 10-100x for complex multi-join queries, but require 1M+ historical query executions to train effectively.`,
      },
      {
        question: 'How do you safely A/B test a new query optimizer version without causing production regressions?',
        answer: `The Challenge

An optimizer regression can turn a 100ms query into a 60-second timeout. With 1000 queries/sec, even a 0.1% regression rate is 1 bad query/second — enough to cascade and cause system-wide slowdowns.

Shadow Mode (Pre-Deployment)

\`\`\`
For 1% of production queries:
  1. Execute query using traditional optimizer (production path)
  2. Simultaneously: have new model predict its recommended plan
  3. Do NOT execute the new model's plan
  4. Record: "new model would have chosen plan X; traditional chose plan Y"
  5. Estimate speedup from historical cost model for plan X vs Y

After 7 days: if estimated speedup > 20% for shadow queries → proceed to canary
\`\`\`

Shadow mode costs: 1% extra query optimizer time (milliseconds) per query.

Canary Deployment

\`\`\`
Phase 1: 5% of queries → new optimizer model
  Monitor for 24h:
  - win_rate (new model plan faster than traditional): target > 65%
  - regression_rate (new model plan > 2x slower): must be < 0.1%
  - p99 latency: must not increase

Phase 2: If passing → 25% traffic
  Monitor 12h with same criteria

Phase 3: If passing → 100% traffic
\`\`\`

Automated Rollback

\`\`\`python
if regression_rate > 0.001 or p99_latency_ratio > 1.2:
    # Emergency rollback
    optimizer_service.set_model("previous_stable_version")
    pagerduty.alert("Query optimizer regression detected — rolled back")
    # New model traffic immediately drops to 0%
\`\`\`

Per-query regression protection (defense in depth):

Even after full deployment, each query has a latency budget:
\`\`\`
If actual_latency > 3 × traditional_estimated_latency:
  Log warning
  Next occurrence of same fingerprint → force traditional plan
\`\`\``,
      },
    ],

    keyDecisions: [
      'Learned cost model vs learned cardinality estimation — chose learned cardinality as the primary approach because it integrates with the existing cost model (lower deployment risk) and cardinality errors are the primary failure mode of traditional optimizers',
      'Tree-structured neural network vs simple MLP for plan featurization — chose tree-structured model because query plans are inherently trees and a flat MLP cannot capture the relational structure between operators',
      'Online learning after every query vs nightly batch retraining — chose nightly batch retraining because online learning on individual queries is noisy and prone to catastrophic forgetting; batch retraining on a curated recent window is more stable',
      'Hard regression cutoff (rollback if regression rate > 0.1%) vs soft alerting — chose hard cutoff with automatic rollback because optimizer regressions can cascade quickly; human response time is too slow for a self-healing system',
      'Replacing the query optimizer vs augmenting with hints — chose hint injection into the existing optimizer because it is lower-risk, does not require modifying database internals, and can be disabled instantly',
    ],
  },

  {
    id: 'realtime-feature-db',
    isNew: true,
    title: 'Real-Time Feature Database',
    subtitle: 'Low-Latency Feature Serving for ML Inference — Feast Online Store / DoorDash Sibyl',
    icon: 'zap',
    color: '#0ea5e9',
    difficulty: 'Hard',
    description: 'Design a feature store that serves ML features with sub-10ms latency for real-time model inference while maintaining point-in-time correctness for training data generation.',

    introduction: `When a machine learning model runs in production, it needs features — computed attributes like "number of purchases by this user in the last 30 days" or "average rating of this restaurant" — to be retrieved and assembled within the latency budget of the prediction request. For a fraud detection model with a 100ms latency SLA, feature retrieval must complete in under 10ms, leaving time for model inference, network round trips, and the application logic.

Building feature computation twice — once in Python for training and once in SQL or Java for production serving — is the source of the most common and expensive ML bugs: training-serving skew. The training pipeline computes "30-day purchase count" correctly using historical data, but the serving pipeline computes it slightly differently due to timezone handling, null value treatment, or a subtly different rolling window implementation. The model was trained on one distribution but is served features from a different distribution. The result is degraded model performance that is nearly impossible to debug.

The feature store is the infrastructure that solves this problem by defining features once in a unified feature definition language and computing them both for training (via batch Spark jobs over historical data) and for serving (via streaming Flink jobs that maintain real-time state in an online store). The guarantee is that the feature value seen by the model at inference time is computed by the same logic as the feature value seen during training.

Point-in-time correctness is the most subtle and important property of a feature store used for training. When generating training examples for a model that predicts whether a user will churn, you need the feature values as they existed at the time the training label was generated — not the current values. If you use today's "days_since_last_purchase" for a label generated six months ago, you are leaking future information into training, producing an overoptimistic model that fails in production.`,

    functionalRequirements: [
      'Serve feature vectors for one or more entities (user_id, product_id) within 10ms at p99 for real-time model inference',
      'Compute features using a unified definition that runs both in batch (Spark) and streaming (Flink/Kafka Streams) to eliminate training-serving skew',
      'Generate point-in-time correct training datasets: retrieve feature values as they existed at the time each training label was generated',
      'Support feature versioning: serve features for model v1 and model v2 simultaneously without conflicts',
      'Monitor feature health: detect and alert on null rate increases, distribution drift, and staleness violations',
      'Manage feature freshness SLAs per feature: some features can be hours old, fraud-prevention features must be seconds fresh',
      'Support multi-entity feature retrieval: retrieve features for user, item, and user-item pair simultaneously in one request',
      'Provide a feature discovery catalog with searchable descriptions, owners, and lineage',
    ],

    nonFunctionalRequirements: [
      'Online store read latency: p99 < 10ms for a feature vector with up to 100 features',
      'Online store write throughput: sustain 500K feature updates per second from streaming pipelines',
      'Offline store query throughput: generate a 100M-row training dataset in under 2 hours',
      'Feature freshness: critical features (fraud signals, inventory) refreshed within 30 seconds of underlying event',
      'Availability: 99.99% for the online store serving path — model inference cannot proceed without features',
      'Multi-tenancy: support 50 independent ML teams with namespace isolation and independent feature versioning',
    ],

    estimation: {
      users: '50 ML teams, each with 5-20 production models; 200M model inferences per day requiring feature retrieval',
      storage: '1M entities × 200 features × 50 bytes avg = 10GB online store; offline store: 1M entities × 200 features × 365 days × 50 bytes = 3.65TB/year historical',
      bandwidth: '200M inferences/day = 2300/sec; each retrieves 100 features × 50 bytes = 5KB; total 11.5 MB/sec read throughput from online store; 500K feature updates/sec × 50 bytes = 25 MB/sec write to online store',
      qps: '2300 feature vector reads/sec; 500K feature updates/sec; 100 training dataset generation jobs/day',
    },

    apiDesign: {
      description: 'Feature serving API for real-time inference, feature ingestion API for streaming pipelines, and offline API for training dataset generation',
      endpoints: [
        { method: 'POST', path: '/api/features/get', params: '{ entities: { user_id: "u123", product_id: "p456" }, feature_refs: ["user_features:purchase_count_30d", "product_features:avg_rating"] }', response: '{ features: { "user_features:purchase_count_30d": 14, "product_features:avg_rating": 4.2 }, freshness: { ... } }', description: 'Retrieve feature values for one or more entities — primary serving path' },
        { method: 'POST', path: '/api/features/ingest', params: '{ feature_view: "user_features", entities: [{ user_id: "u123", features: { purchase_count_30d: 14, ... } }], event_timestamp }', response: '{ ingested_count }', description: 'Write feature values from streaming pipeline to online store' },
        { method: 'POST', path: '/api/training-dataset', params: '{ feature_refs[], entity_df_uri: "s3://...", label_timestamp_column, output_uri }', response: '{ job_id, status: "running" }', description: 'Generate a point-in-time correct training dataset by joining entity labels with historical feature values' },
        { method: 'GET', path: '/api/features/freshness', params: 'feature_view, entity_id?', response: '{ last_updated_at, sla_seconds, is_stale, staleness_seconds }', description: 'Check freshness of features for a given entity' },
        { method: 'GET', path: '/api/catalog/features', params: 'search?, owner?, tags?', response: '{ feature_views[{ name, features[], owner, freshness_sla, description }] }', description: 'Search the feature catalog to discover available features' },
      ],
    },

    dataModel: {
      description: 'Online store in Redis (low-latency key-value lookups); offline store in Delta Lake on S3 (time-series of all historical feature values); feature metadata in PostgreSQL',
      schema: `feature_views {
  id: uuid PK
  name: varchar(200) unique           -- e.g., "user_purchase_features"
  team_id: uuid FK
  entity_columns: text[]              -- e.g., ["user_id"]
  feature_columns: jsonb              -- [{ name, dtype, description }]
  freshness_sla_seconds: int          -- max allowed staleness
  batch_source: jsonb                 -- Spark job config for offline computation
  stream_source: jsonb                -- Flink job config for online computation
  ttl_seconds: int                    -- auto-expire online store entries
  version: int
  created_at: timestamp
}

-- Online store: Redis hash per entity
-- Key: "feature_view:{view_name}:{entity_key}"
-- Field: feature_name → serialized value
-- Field: __updated_at → timestamp of last write
-- TTL: feature_view.ttl_seconds

-- Offline store: Delta Lake table on S3
-- Schema: entity_columns + feature_columns + event_timestamp + created_timestamp
-- Partitioned by: toDate(event_timestamp)
-- Example S3 path: s3://feature-store/user_purchase_features/year=2025/month=06/day=01/

feature_monitoring {
  id: bigint PK
  feature_view_name: varchar(200)
  feature_name: varchar(200)
  check_time: timestamp
  null_rate: float
  mean_value: float nullable
  p95_value: float nullable
  distinct_count: bigint nullable
  max_staleness_seconds: int
  is_sla_violated: boolean
}`,
      examples: [
        { table: 'feature_views', label: 'User purchase feature view with streaming and batch sources', json: '{ "id": "fv-a1b2c3", "name": "user_purchase_features", "entity_columns": ["user_id"], "feature_columns": [{"name": "purchase_count_30d", "dtype": "int64"}, {"name": "avg_order_value", "dtype": "float64"}, {"name": "days_since_last_purchase", "dtype": "int64"}], "freshness_sla_seconds": 3600, "ttl_seconds": 86400, "version": 2 }' },
        { table: 'feature_monitoring', label: 'Feature SLA violation alert', json: '{ "id": 992341, "feature_view_name": "user_purchase_features", "feature_name": "purchase_count_30d", "check_time": "2025-06-01T14:00:00Z", "null_rate": 0.23, "max_staleness_seconds": 7200, "is_sla_violated": true }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Features computed directly in the prediction service by running SQL queries against the production database at inference time. No precomputation, no caching. Training pipeline computes features using Python pandas on historical snapshots.',
      problems: [
        'SQL queries at inference time add 50-500ms latency — far exceeding the 10ms SLA for feature retrieval',
        'Production database gets hammered by ML feature queries during peak traffic, degrading transactional workloads',
        'Training uses Python pandas, serving uses SQL — different implementations with subtle differences causing training-serving skew',
        'No point-in-time correctness for training: training features are computed from current data, not the data state at label time — leaks future information',
        'No feature monitoring: when a data pipeline breaks, features silently go stale without alerting on-call',
        'No feature reuse: every model reimplements the same feature computations, creating inconsistency across models',
      ],
    },

    advancedImplementation: {
      title: 'Dual-Store Feature Platform with Unified Compute and Point-in-Time Joins',
      description: 'Feature computation is defined once using a feature definition DSL that transpiles to both Spark SQL (for offline batch computation) and Flink SQL (for online streaming computation). The offline store is a Delta Lake table on S3 that contains the full time-series history of every feature value with event_timestamp and created_timestamp columns. The online store is Redis with one hash per entity, written by the Flink streaming job as new events arrive. Training dataset generation performs a point-in-time join: for each training entity at its label timestamp, retrieve the most recent feature values from the offline store where event_timestamp <= label_timestamp.',
      keyPoints: [
        'Unified feature definition: a single YAML or Python DSL defines the feature logic once; the platform generates both a Spark job for offline computation and a Flink job for online computation from the same definition — training-serving skew is prevented at the infrastructure layer',
        'Online store design: Redis hash per entity, key format "view:{name}:{entity_key}", field per feature; one Redis HGETALL per inference request retrieves all features for an entity in a single round trip',
        'Multi-entity batching: a single inference request may need user features, product features, and user-product pair features; the serving layer batches all Redis lookups into a single pipeline call, keeping total latency under 10ms even for complex feature vectors',
        'Point-in-time join for training: the offline Delta Lake table has both event_timestamp (when the feature value became valid) and created_timestamp (when the row was written); a point-in-time join uses ASOF join semantics: for each training example, find the latest row where event_timestamp <= label_timestamp, preventing any future information from leaking',
        'Feature freshness monitoring: a background job queries each entity\'s __updated_at field in Redis every 5 minutes and compares to the SLA; stale features trigger PagerDuty alerts before models start making predictions with outdated information',
        'Feature versioning: feature_views have a version field; the online store uses the version as part of the Redis key; serving model v1 and model v2 simultaneously just reads from different key prefixes; old versions expire via TTL after the model is retired',
        'Waterfall fallback: if the online store returns null for a feature (entity never seen, or TTL expired), the serving layer falls back to a precomputed default value (median of the feature from training data); the model never receives a null feature that could crash inference',
      ],
      databaseChoice: 'Redis for online store (sub-millisecond latency, native hash data structure maps perfectly to entity-keyed feature vectors, built-in TTL); Delta Lake on S3 for offline store (ACID transactions, time-travel for point-in-time joins, efficient columnar scans for training dataset generation); PostgreSQL for feature metadata, lineage, and monitoring records',
      caching: 'Online store IS the cache — features are precomputed and written to Redis before inference time; serving path has no additional caching layer; Redis is sized to hold the full active entity set (1M entities × 10KB avg = 10GB — fits in a single Redis instance with replication)',
    },

    tips: [
      'Training-serving skew is the core problem the feature store solves — state this clearly and build your design around eliminating it',
      'Point-in-time correctness is the most counterintuitive concept in feature stores — spend time explaining it clearly with a concrete example (label timestamp, historical feature lookup)',
      'The dual-store architecture (offline store for training, online store for serving) is the standard pattern — explain why one store cannot serve both use cases (latency vs scale requirements are incompatible)',
      'Feature freshness SLAs vary dramatically by use case: recommendation features can be hours old; fraud detection features must be seconds fresh — discuss how your architecture handles this heterogeneity',
      'Feature reuse across models is a key business value proposition: define features once, use them in 20 models — quantify the engineering time saved',
      'The waterfall fallback pattern (online store → default value) prevents null features from reaching the model — always mention graceful degradation in the serving path',
    ],

    keyQuestions: [
      {
        question: 'How do you ensure point-in-time correctness when generating training data from feature stores?',
        answer: `Why Point-in-Time Correctness Matters

Imagine training a churn prediction model:
\`\`\`
Training example: user_id=123, label_timestamp=2025-01-01, label=churned (churned in Jan)
Feature: days_since_last_purchase

WRONG: use current value → 180 days (user hasn't bought since churning)
CORRECT: use value at 2025-01-01 → 15 days (user was still somewhat active before churning)
\`\`\`

Using the wrong (current) feature teaches the model: "if days_since_last_purchase is high, the user churned." But in production, you only have access to current features, and users with high days_since_last_purchase may just be infrequent buyers, not churners. The model overestimates churn.

Offline Store Schema

The offline store stores every historical value with timestamps:
\`\`\`
user_purchase_features (Delta Lake table):
  user_id     event_timestamp              days_since_last_purchase
  123         2024-12-20T00:00:00Z         5
  123         2024-12-27T00:00:00Z         12
  123         2025-01-01T00:00:00Z         15      ← correct value at label time
  123         2025-01-15T00:00:00Z         30
  123         2025-02-01T00:00:00Z         47
  123         (current)                    180
\`\`\`

Point-in-Time Join (ASOF Join)

\`\`\`sql
-- Entity dataframe: training labels with timestamps
-- entity_df: (user_id=123, label_timestamp=2025-01-01, label=churned)

SELECT e.user_id, e.label_timestamp, e.label,
       f.days_since_last_purchase
FROM entity_df e
ASOF JOIN user_purchase_features f
  ON e.user_id = f.user_id
  AND f.event_timestamp <= e.label_timestamp  -- only past values
ORDER BY f.event_timestamp DESC               -- most recent before label time
\`\`\`

Result: user_id=123 gets days_since_last_purchase=15 (the value at 2025-01-01), not 180 (the current value).

In Feast/Tecton: this is the \`get_historical_features(entity_df, feature_refs)\` API — it automatically performs the point-in-time join under the hood.`,
      },
      {
        question: 'How do you guarantee the same feature value is computed identically in batch (Spark) and streaming (Flink)?',
        answer: `The Training-Serving Skew Problem

Even with "the same logic," subtle differences cause skew:
\`\`\`
Batch (Spark SQL):
  SELECT user_id, COUNT(*) as purchase_count_30d
  FROM purchases
  WHERE purchase_time >= NOW() - INTERVAL 30 DAYS
  -- Uses query execution time as "now"

Streaming (Flink):
  SELECT user_id, COUNT(*) as purchase_count_30d
  FROM purchases
  WHERE purchase_time >= CURRENT_TIMESTAMP - INTERVAL '30' DAY
  -- Uses event processing time as "now"

Difference: if a purchase arrives 10 seconds late in the stream,
  batch counts it (saw it in the historical table), stream may not
  (event time already outside window).
\`\`\`

Solution: Unified Feature Definition DSL

Define features once in a declarative spec:
\`\`\`python
@feature_view(
    entity=User,
    ttl=timedelta(hours=24),
    freshness_sla=timedelta(hours=1)
)
class user_purchase_features:
    @feature(dtype=Int64)
    def purchase_count_30d(purchases: DataFrame, as_of: datetime) -> int:
        return purchases.filter(
            (purchases.user_id == self.user_id) &
            (purchases.purchase_time >= as_of - timedelta(days=30)) &
            (purchases.purchase_time < as_of)
        ).count()
\`\`\`

The platform transpiles this to:
- Spark SQL for offline: \`WHERE purchase_time BETWEEN label_timestamp - 30 DAYS AND label_timestamp\`
- Flink: watermark-based event-time window with 30-day size
- Both use \`as_of\` as the reference time — same semantics guaranteed

Validation: run shadow evaluation — compute both batch and streaming values for the same entity at the same timestamp, alert when they diverge by more than 1%. Treat any divergence as a P1 bug.`,
      },
    ],

    keyDecisions: [
      'Redis vs DynamoDB for online store — chose Redis because sub-millisecond HGETALL for a full feature vector is critical; DynamoDB adds 2-5ms per call even with single-digit ms p99 SLAs, and Redis hash data structure maps naturally to feature vectors without serialization overhead',
      'Unified DSL that compiles to Spark and Flink vs two separate implementations — chose unified DSL as the primary skew-prevention mechanism; maintaining two implementations always diverges over time despite best intentions',
      'Delta Lake vs Parquet files with manual partitioning for offline store — chose Delta Lake because ACID transactions prevent partial reads during offline feature computation updates, and time-travel enables point-in-time joins without explicit snapshot management',
      'Push-based feature writes (streaming pipeline → Redis) vs pull-based feature reads (model queries source database at serve time) — chose push-based precomputation: pull-based cannot meet sub-10ms latency requirements for complex aggregation features',
      'Separate online and offline stores vs single unified store — chose separate stores because the latency requirements (sub-10ms for online) and scale requirements (petabyte historical for offline) are incompatible in a single system',
    ],
  },

  {
    id: 'multimodal-data-store',
    isNew: true,
    title: 'Multi-Modal Data Store',
    subtitle: 'Store and Query Images, Text, Audio, Video Together for Multi-Modal AI',
    icon: 'layers',
    color: '#8b5cf6',
    difficulty: 'Hard',
    description: 'Design a unified data store for multi-modal AI assets — images, text, audio, and video — that supports cross-modal search, storage tiering for petabyte-scale files, and unified metadata filtering combined with vector similarity search.',

    introduction: `Modern AI systems are increasingly multi-modal: a product recommendation model might use product images, descriptions, and user review text together. A content moderation system needs to analyze video frames, audio, and captions simultaneously. A retrieval system for enterprise knowledge might search across PDFs, images, audio recordings, and video presentations in a single query. Building separate storage systems for each modality creates a fragmented landscape where different teams use different tools, metadata is duplicated and inconsistent, and cross-modal queries require complex application-level federation.

A unified multi-modal data store provides a single logical system where any asset — regardless of modality — is stored, indexed, and retrieved through a common API. Each asset has raw bytes stored in tiered object storage, modality-specific metadata, processing artifacts (transcripts for audio/video, captions for images), and embeddings in a shared multi-modal embedding space like CLIP or ImageBind that enable cross-modal queries: search for images using a text query, or find audio clips similar to a reference image.

The storage problem is uniquely challenging because of the size range. A text document is a few kilobytes. A 4K video file is gigabytes. A single model training dataset may contain petabytes of both. The storage tier must handle 1KB files and 50GB files with the same API, while automatically moving data between hot (SSD-backed), warm (S3 Standard), and cold (S3 Glacier) tiers based on access frequency. File upload for large video files must support resumable chunked uploads with progress tracking, and streaming playback must be possible without downloading the full file first.

The query model combines two traditionally separate paradigms: structured metadata filtering (find all images tagged as "product photography" licensed under CC-BY created after 2024-01-01) and vector similarity search (find images visually similar to this reference image). Efficiently combining these two paradigms — doing the ANN search among only the subset that passes the metadata filter — is one of the core technical problems in multi-modal retrieval systems.`,

    functionalRequirements: [
      'Store assets of any modality (text, image, audio, video) through a unified API with consistent metadata schema',
      'Process uploaded assets through modality-specific pipelines: generate captions for images, transcripts for audio/video, extract keyframes from video',
      'Embed assets into a shared multi-modal embedding space (CLIP or ImageBind) for cross-modal similarity search',
      'Support cross-modal search: text query returns relevant images and videos; image query returns semantically similar audio clips',
      'Combine vector similarity search with structured metadata filtering in a single query',
      'Implement automatic storage tiering: move assets between hot, warm, and cold storage based on access frequency and age',
      'Support resumable chunked uploads for large video files with progress tracking',
      'Manage asset versions: the same asset re-processed with a different model creates a new version, both accessible',
    ],

    nonFunctionalRequirements: [
      'Upload throughput: sustain 1GB/s aggregate upload throughput for concurrent asset ingestion pipelines',
      'Search latency: cross-modal search combining vector similarity and metadata filter returns results in under 500ms for a corpus of 1B assets',
      'Storage efficiency: automatic tiering moves cold assets to Glacier reducing storage cost by 70% without losing accessibility',
      'Processing latency: image caption and embedding generated within 5 minutes of upload; video transcript within 30 minutes',
      'Scale: support 10B assets across all modalities with total storage of 100PB',
      'Streaming: video assets streamable from first byte without full download; adaptive bitrate delivery for variable-bandwidth clients',
    ],

    estimation: {
      users: '1000 ML engineers and data scientists as primary users; consumer-facing queries from 10M end users through applications built on the platform',
      storage: '10B assets: text (1B × 50KB = 50TB), images (5B × 5MB = 25PB), audio (2B × 50MB = 100PB), video (2B × 500MB = 1EB); with tiering: 5% hot (10PB), 25% warm (250PB), 70% cold (7000PB Glacier)',
      bandwidth: '10M end-user queries/day = 115/sec cross-modal search; 1K asset uploads/min from pipelines; 1M streaming video requests/day = 11.5/sec',
      qps: '1K asset upload events/min (with chunked multipart); 115 search queries/sec; 11.5 streaming video requests/sec; 500 embedding lookups/sec from ML inference pipelines',
    },

    apiDesign: {
      description: 'Unified asset API for upload, processing, and search across all modalities',
      endpoints: [
        { method: 'POST', path: '/api/assets/upload/initiate', params: '{ modality, filename, size_bytes, mime_type, metadata{} }', response: '{ asset_id, upload_id, chunk_size, upload_urls[] }', description: 'Initiate a chunked upload for any asset; returns pre-signed S3 URLs for each chunk' },
        { method: 'POST', path: '/api/assets/upload/complete', params: '{ asset_id, upload_id, etags[] }', response: '{ asset_id, status: "processing" }', description: 'Complete a chunked upload; triggers the processing pipeline' },
        { method: 'POST', path: '/api/assets/search', params: '{ query_text?, query_image_url?, query_audio_url?, modalities?: ["image","video"], filters: { tags?, license?, created_after?, created_before? }, limit?, offset? }', response: '{ results[{ asset_id, modality, similarity_score, metadata, thumbnail_url }], total }', description: 'Cross-modal search with optional metadata filters' },
        { method: 'GET', path: '/api/assets/{id}', params: 'version?', response: '{ asset_id, modality, metadata, processing_artifacts{}, storage_tier, access_url, embedding_url }', description: 'Retrieve asset metadata and access URL (pre-signed or streaming)' },
        { method: 'GET', path: '/api/assets/{id}/stream', params: 'quality?, start_byte?', response: 'HTTP 206 Partial Content stream', description: 'Stream video or audio asset with range request support and adaptive bitrate' },
        { method: 'GET', path: '/api/assets/{id}/embedding', params: 'model_version?', response: '{ embedding: float[], model, dimensions, computed_at }', description: 'Retrieve the multi-modal embedding for an asset for downstream ML use' },
      ],
    },

    dataModel: {
      description: 'Asset metadata in PostgreSQL; embeddings and vector index in Qdrant; raw files in S3 with lifecycle policies for automatic tiering; processing artifacts in S3',
      schema: `assets {
  id: uuid PK
  modality: enum(text, image, audio, video, document)
  filename: varchar(1000)
  mime_type: varchar(200)
  size_bytes: bigint
  content_hash: varchar(64)      -- SHA-256, enables deduplication
  storage_tier: enum(hot, warm, cold)
  storage_uri: text              -- s3://multi-modal-store/{content_hash}
  version: int default 1
  parent_asset_id: uuid nullable -- if this is a reprocessed version
  tags: text[]
  license: varchar(200) nullable
  source_uri: text nullable
  uploaded_by: uuid FK
  created_at: timestamp
  last_accessed_at: timestamp
}

asset_processing_results {
  id: uuid PK
  asset_id: uuid FK
  processor_type: varchar(100)   -- "image_captioner", "audio_transcriber", "keyframe_extractor"
  model_version: varchar(50)
  result_uri: text               -- s3 path to processing output
  result_summary: jsonb          -- { "caption": "...", "transcript": "...", "keyframe_count": 120 }
  processing_latency_ms: int
  processed_at: timestamp
}

-- Stored in Qdrant (vector DB)
asset_embeddings {
  asset_id: uuid,
  modality: enum(text, image, audio, video),
  model: varchar(100),           -- "clip-vit-large-patch14", "imagebind-huge"
  embedding: float[1024],
  payload: {                     -- filterable metadata stored alongside embedding
    tags: string[],
    license: string,
    created_at: int,             -- unix timestamp for range filtering
    modality: string,
    size_bytes: int
  }
}`,
      examples: [
        { table: 'assets', label: 'A video asset stored in warm tier with processing complete', json: '{ "id": "ast-a1b2c3", "modality": "video", "filename": "product-demo-q1-2025.mp4", "size_bytes": 2147483648, "content_hash": "sha256-3f7a...", "storage_tier": "warm", "storage_uri": "s3://mm-store/3f/7a/3f7a...", "tags": ["product", "demo", "Q1-2025"], "license": "proprietary", "last_accessed_at": "2025-06-01T14:00:00Z" }' },
        { table: 'asset_processing_results', label: 'Video transcription result', json: '{ "id": "apr-d4e5f6", "asset_id": "ast-a1b2c3", "processor_type": "audio_transcriber", "model_version": "whisper-large-v3", "result_uri": "s3://mm-store-artifacts/ast-a1b2c3/transcript.json", "result_summary": { "word_count": 8420, "language": "en", "duration_seconds": 1847 }, "processing_latency_ms": 93000 }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Separate S3 buckets per modality (images-bucket, videos-bucket, audio-bucket). Each team uses its own metadata database. No unified search — teams query their own SQL databases. Vector search requires downloading assets and embedding them in the application layer.',
      problems: [
        'Cross-modal search is impossible — cannot find images related to an audio clip without custom application-level federation across separate systems',
        'Duplicate storage of the same asset uploaded by different teams — no deduplication via content hashing',
        'No automatic storage tiering — assets stay in expensive hot storage indefinitely until manually moved',
        'Large video uploads fail on network interruptions because there is no chunked resumable upload support',
        'No unified metadata schema — searching for assets by tag or license requires querying multiple databases with different schemas',
        'No processing pipeline — captions, transcripts, and embeddings must be generated manually by each team consuming the asset',
      ],
    },

    advancedImplementation: {
      title: 'Unified Multi-Modal Platform with Cross-Modal Embeddings and Automatic Tiering',
      description: 'All assets are stored in a single content-addressed S3 bucket using the file content hash as the key, providing automatic deduplication across teams and modalities. Upon upload completion, an event triggers a modality-specific processing pipeline: images get captioned and embedded with CLIP, audio gets transcribed with Whisper and embedded with AudioCLIP, video gets keyframes extracted, transcribed, and embedded per keyframe. All embeddings are stored in Qdrant in a unified collection where each vector carries filterable metadata as a payload, enabling combined vector similarity + metadata filter queries in a single ANN search.',
      keyPoints: [
        'Content-addressed storage: S3 key = SHA-256 of file content; two teams uploading the same video pay one storage cost; the deduplication check is a HEAD request to S3 before upload — zero latency overhead',
        'Chunked resumable upload: large files are split into 100MB chunks; each chunk gets a pre-signed S3 URL; client uploads chunks in parallel (8 concurrent); on failure, only incomplete chunks are retried; S3 multipart upload assembly is atomic',
        'Unified CLIP/ImageBind embedding space: CLIP maps images and text to the same 1024-dim space; ImageBind extends this to audio, video, depth, and IMU data; a text query embedded with CLIP can directly search images without any additional bridging',
        'Combined vector + metadata filtering in Qdrant: metadata (tags, license, creation date, modality) stored as payload fields on each vector point; Qdrant performs pre-filtering on payload before ANN search, ensuring the returned results satisfy both the similarity and metadata constraints',
        'Automatic storage tiering via S3 Lifecycle policies: assets not accessed in 30 days move from S3 Standard to S3-IA (60% cost reduction); assets not accessed in 90 days move to S3 Glacier (85% cost reduction); access pattern tracked via last_accessed_at field updated on each retrieval',
        'Video streaming: assets stored as HLS or DASH multi-bitrate streams after transcoding; CloudFront serves byte-range requests directly from S3, enabling adaptive bitrate playback without downloading the full file; CDN caches the most-accessed video segments at edge locations',
        'Processing pipeline orchestration: SNS event on S3 upload → SQS queue per modality → ECS workers with GPU for embedding → results written back to PostgreSQL and Qdrant; each processing step is idempotent with retry on failure',
      ],
      databaseChoice: 'S3 Standard + S3-IA + S3 Glacier for tiered file storage with lifecycle policies; PostgreSQL for asset metadata and processing results; Qdrant for the unified multi-modal embedding index with payload filtering; CloudFront CDN for streaming video delivery with edge caching; Redis for the upload session state (chunk progress tracking)',
      caching: 'CloudFront caches video HLS segments and image thumbnails at edge locations; Qdrant\'s HNSW index is memory-mapped and cached in RAM on each vector search node; PostgreSQL asset metadata cached in Redis for hot assets (top 1M by access frequency); embedding vectors for frequently-searched reference images cached in Redis to avoid re-embedding on every search',
    },

    tips: [
      'The cross-modal embedding space (CLIP, ImageBind) is the key architectural concept — explain clearly how text and image can be compared via cosine similarity in a shared embedding space',
      'Combined vector + metadata filtering is a hard problem: naive approach (ANN search first, then filter) wastes computation on results that will be filtered; pre-filtering approach (filter first, then ANN search within the subset) requires the vector DB to support payload-level indexing',
      'Storage tiering is a cost optimization that deserves explicit mention — petabyte-scale storage in S3 Standard is extremely expensive; automatic tiering to Glacier reduces costs by 80%',
      'Resumable chunked upload is a reliability requirement, not a nice-to-have, for large files — discuss the multipart upload flow and how you handle partial failures',
      'Content-addressed deduplication prevents the silent cost explosion of multiple teams storing the same large video files repeatedly',
      'Processing pipelines should be decoupled from upload completion — discuss async processing with event-driven triggers so uploads return immediately and processing happens in the background',
    ],

    keyQuestions: [
      {
        question: 'How do you implement cross-modal search that lets a text query return relevant images?',
        answer: `The Key Insight: Shared Embedding Space

CLIP (Contrastive Language-Image Pre-training) trains two encoders jointly:
- Text encoder: "a photo of a cat" → float[1024]
- Image encoder: [cat image] → float[1024]

Trained with contrastive loss: the image embedding and text embedding for the same concept should be close in the 1024-dimensional space.

\`\`\`
Text "a photo of a cat" → encoder_T → [0.3, -0.1, 0.8, ...]  ← similar
Image of a cat         → encoder_I → [0.31, -0.09, 0.79, ...] ← similar
Image of a dog         → encoder_I → [-0.5, 0.4, -0.2, ...]   ← different
\`\`\`

Cross-Modal Search Flow

\`\`\`python
# User query: text searching for images
def cross_modal_search(text_query: str, modality_filter: str = "image"):
    # 1. Embed the text query using the CLIP text encoder
    query_embedding = clip_text_encoder.encode(text_query)
    # shape: float[1024]

    # 2. Search the unified Qdrant collection (contains ALL modalities)
    results = qdrant.search(
        collection="multi_modal_assets",
        query_vector=query_embedding,
        query_filter=Filter(must=[
            FieldCondition(key="modality", match=MatchValue(value="image"))
        ]),
        limit=20
    )
    # Returns image vectors closest to the text embedding
    # Even though one is text and one is image — same embedding space!

    return [result.payload for result in results]
\`\`\`

ImageBind Extension

ImageBind extends CLIP to 6 modalities (image, text, audio, video, depth, IMU) all in one shared embedding space:
- Audio query → find visually similar images
- Image query → find audio clips that "sound like" the image
- Text query → find video clips

All using the same vector index, same cosine similarity search.`,
      },
      {
        question: 'How do you combine vector similarity search with structured metadata filters efficiently?',
        answer: `The Two-Paradigm Problem

Traditional databases: filter by structured metadata
\`\`\`sql
SELECT * FROM assets WHERE tags @> '{"product"}' AND license = 'CC-BY' AND created_at > '2024-01-01'
-- Fast: uses B-tree and GIN indexes. Returns exact set of matching rows.
\`\`\`

Vector databases: find k-nearest neighbors by embedding similarity
\`\`\`
ANN search in 1024-dim space → returns top-20 most similar vectors
-- Fast: uses HNSW graph. Returns approximate set of similar items.
\`\`\`

Problem: combining both is non-trivial.

Approach 1: Post-filtering (ANN first, metadata after)
\`\`\`
1. ANN search for top-K=1000 similar vectors
2. Apply metadata filter to the 1000 results
3. Return top-20 that pass the filter

Problem: if only 1% of corpus matches the filter, need K=2000 to get 20 results.
Worst case: need to scan the entire index.
\`\`\`

Approach 2: Pre-filtering (metadata filter limits ANN search space)

Qdrant, Weaviate, and Pinecone support payload indexing:
\`\`\`python
# Qdrant: filter is applied BEFORE the ANN graph traversal
results = qdrant.search(
    query_vector=embedding,
    query_filter=Filter(must=[
        FieldCondition(key="license", match=MatchValue(value="CC-BY")),
        FieldCondition(key="created_at", range=Range(gte=1704067200))  # 2024-01-01
    ]),
    limit=20
)
# Qdrant builds a per-payload BitSet of matching points
# HNSW graph traversal only visits nodes in the BitSet
# Result: correct filtered ANN, not post-hoc filtering
\`\`\`

When pre-filtering is slow: if the filter is very selective (only 100 matching points out of 1B), HNSW graph is useless (the graph is built for the full corpus). Fall back to:
- Brute-force scan of the 100 matching points
- Or partition vectors by common filter values (one HNSW index per license type)

Best practice: store all frequently-filtered metadata fields in the vector payload and use Qdrant's payload index — achieves combined query latency of 50-200ms for 1B vectors with moderate selectivity filters.`,
      },
    ],

    keyDecisions: [
      'Unified single collection in Qdrant vs per-modality collections — chose unified collection with modality as a payload filter because cross-modal search requires comparing vectors across modalities in the same ANN traversal; separate collections cannot do this in a single query',
      'CLIP vs ImageBind for the shared embedding space — chose CLIP initially (text + image only, mature ecosystem, most ML use cases need only text-image cross-modal); ImageBind as an upgrade path for audio and video cross-modal needs',
      'Content-addressed S3 storage vs path-addressed storage — chose content-addressed because it provides automatic deduplication across teams and modalities, immutability guarantees, and corruption detection',
      'S3 multipart upload vs single-part upload — chose multipart for any file over 100MB: enables parallel chunk uploads (3-5x faster), resumability on network failure, and is required by S3 for files over 5GB',
      'Pre-filtering vs post-filtering for combined vector + metadata search — chose pre-filtering via Qdrant payload indexes for most queries; maintain a fallback to brute-force scan for highly selective filters where HNSW graph traversal becomes less efficient than direct comparison',
    ],
  },

  {
    id: 'model-registry',
    isNew: true,
    title: 'Model Registry and Artifact Store',
    subtitle: 'Design MLflow Model Registry / SageMaker Model Registry / Vertex AI',
    icon: 'box',
    color: '#6366f1',
    difficulty: 'Medium',
    description: 'Design a model registry that tracks every trained model version with its lineage, manages the promotion lifecycle from staging to production, and enables safe A/B deployment with instant rollback.',

    introduction: `When a machine learning team trains a new model that outperforms the current production model on evaluation metrics, how does that model safely get deployed to production? Without a model registry, the answer is typically: someone copies a model file to a server, updates a configuration file, and hopes nothing breaks. The old model cannot be recovered if something goes wrong. There is no record of what changed, who approved the deployment, or what the model was trained on.

A model registry is the single source of truth for all trained model artifacts in an organization. Every model that could potentially go to production is registered with full metadata: the training run that produced it, the dataset version it was trained on, the evaluation metrics it achieved, and the person who trained it. Models progress through lifecycle stages (staging → production → archived) through explicit transitions that require passing automated evaluation gates and optionally human approval.

The artifact storage problem is significant. A large language model has billions of parameters, which at float16 precision translates to hundreds of gigabytes per checkpoint. Storing every model version naively would require petabytes. Content-addressed storage — where the S3 key is derived from the file content hash — provides automatic deduplication: a fine-tuned model that shares most of its weights with its base model stores only the differential LoRA adapters and shares the base model weights with all other fine-tunes. This can reduce artifact storage costs by 60-80%.

Safe deployment requires more than just moving a model file. The registry must track which model version is deployed to which endpoint, manage traffic splitting for A/B testing (model v1 gets 90% of requests, model v2 gets 10%), and automatically roll back to the previous version if the new model's production metrics degrade below a threshold. All of this must happen without downtime — users should never experience errors during a model deployment.`,

    functionalRequirements: [
      'Register every trained model version with metadata: training run ID, dataset version, evaluation metrics, git commit, and the person who trained it',
      'Manage model lifecycle stages: staging (ready for evaluation), production (serving live traffic), archived (retired)',
      'Store model artifacts in content-addressed immutable storage with deduplication across versions',
      'Track deployment state: which model version is deployed to which endpoint or serving environment',
      'Support A/B deployment: route a configurable percentage of traffic to a new model version while keeping the incumbent live',
      'Enforce evaluation gates: a model cannot be promoted to production unless it passes defined accuracy and latency thresholds',
      'Enable one-click rollback to any previous production model version',
      'Support multiple model frameworks: PyTorch, TensorFlow, scikit-learn, HuggingFace — with framework-specific serialization and serving',
    ],

    nonFunctionalRequirements: [
      'Deployment latency: promote a model from staging to production within 5 minutes (includes artifact transfer and endpoint warm-up)',
      'Rollback latency: complete rollback to previous model version within 60 seconds of triggering',
      'Artifact storage: support model checkpoints up to 1TB per version; deduplicated storage should reduce cost by at least 50% for fine-tuned model families',
      'API availability: 99.9% uptime for the registry API — model serving infrastructure depends on registry to resolve model versions',
      'Zero downtime deployment: traffic must never drop to zero during a model version transition',
      'Audit trail: all lifecycle transitions, deployments, and evaluations logged with actor, timestamp, and reasoning',
    ],

    estimation: {
      users: '200 ML engineers and data scientists; 50 production model endpoints; 20 new model versions registered per day',
      storage: '20 new versions/day × 10GB avg size × 365 days = 73TB/year raw; with deduplication (fine-tuned models share 90% of base model weights) = 7-15TB/year effective',
      bandwidth: '20 model uploads/day × 10GB = 200GB/day upload; 50 serving instances × 10GB model load on deploy = 500GB/day download; negligible traffic for metadata API',
      qps: '20 model version creations/day; 10 deployment events/day; 10K registry API calls/day from serving infrastructure (version resolution)',
    },

    apiDesign: {
      description: 'Registry API for model version management and deployment control; used by training infrastructure and serving infrastructure',
      endpoints: [
        { method: 'POST', path: '/api/models', params: '{ name, description, tags[] }', response: '{ model_id }', description: 'Register a new model (conceptual entity, not a specific version)' },
        { method: 'POST', path: '/api/models/{model_id}/versions', params: '{ training_run_id, artifact_uri, framework, metrics{}, git_commit, description }', response: '{ version_id, stage: "staging" }', description: 'Register a new trained model version with all lineage metadata' },
        { method: 'POST', path: '/api/models/{model_id}/versions/{version_id}/promote', params: '{ target_stage: "production"|"archived", traffic_percentage?: 10, reason }', response: '{ deployment_id, routing_config }', description: 'Promote model version to production with optional A/B traffic split' },
        { method: 'POST', path: '/api/models/{model_id}/rollback', params: '{ reason }', response: '{ rolled_back_to_version_id, deployment_id }', description: 'Instantly roll back to the previous production version' },
        { method: 'GET', path: '/api/models/{model_id}/versions/{version_id}/artifact', params: 'format?: "pytorch"|"onnx"|"tfjs"', response: 'Redirect to pre-signed S3 URL or streaming download', description: 'Download model artifact, with optional on-the-fly format conversion' },
        { method: 'GET', path: '/api/serving/resolve', params: 'model_name, environment', response: '{ primary_version_id, canary_version_id?, canary_traffic_pct?, artifact_uris{} }', description: 'Resolve which model version(s) to serve for a given model and environment — called by serving infrastructure on startup' },
      ],
    },

    dataModel: {
      description: 'Model metadata and lineage in PostgreSQL; artifact files in content-addressed S3; deployment state in PostgreSQL with Redis cache for hot-path serving resolution',
      schema: `models {
  id: uuid PK
  name: varchar(500) unique      -- e.g., "fraud-detection-v2"
  description: text
  team_id: uuid FK
  tags: text[]
  default_framework: varchar(50)
  created_at: timestamp
  created_by: uuid FK
}

model_versions {
  id: uuid PK
  model_id: uuid FK
  version_number: int            -- auto-incrementing per model
  stage: enum(staging, production, archived)
  training_run_id: varchar(200)
  dataset_version_id: uuid nullable FK
  git_commit: varchar(40)
  framework: varchar(50)         -- "pytorch", "tensorflow", "sklearn", "huggingface"
  artifact_uri: text             -- s3://model-registry/{content_hash}/
  artifact_size_bytes: bigint
  content_hash: varchar(64)
  metrics: jsonb                 -- { "val_accuracy": 0.947, "val_auc": 0.991, "p99_latency_ms": 43 }
  description: text
  registered_by: uuid FK
  registered_at: timestamp
  promoted_at: timestamp nullable
  promoted_by: uuid FK nullable
}

model_deployments {
  id: uuid PK
  model_id: uuid FK
  environment: varchar(100)      -- "production", "staging", "shadow"
  primary_version_id: uuid FK
  canary_version_id: uuid nullable FK
  canary_traffic_pct: int default 0
  status: enum(active, rolling_back, rolled_back)
  deployed_by: uuid FK
  deployed_at: timestamp
  rollback_of: uuid nullable FK  -- if this was a rollback, points to the deployment it rolled back
}

model_evaluation_gates {
  id: uuid PK
  model_id: uuid FK
  gate_name: varchar(200)
  metric_key: varchar(200)       -- e.g., "val_accuracy"
  operator: enum(gte, lte, gt, lt)
  threshold: float
  is_blocking: boolean           -- if true, model cannot promote without passing
}`,
      examples: [
        { table: 'model_versions', label: 'A fraud detection model version ready for production', json: '{ "id": "mv-a1b2c3", "model_id": "m-d4e5f6", "version_number": 7, "stage": "staging", "training_run_id": "run-20250601-fraud-v7", "git_commit": "3a7f2c1d", "framework": "pytorch", "content_hash": "sha256-abc123...", "metrics": { "val_auc": 0.991, "val_precision_at_1pct_fpr": 0.847, "p99_latency_ms": 43 }, "registered_at": "2025-06-01T09:00:00Z" }' },
        { table: 'model_deployments', label: 'A/B deployment with 10% canary traffic', json: '{ "id": "dep-g7h8i9", "model_id": "m-d4e5f6", "environment": "production", "primary_version_id": "mv-j0k1l2", "canary_version_id": "mv-a1b2c3", "canary_traffic_pct": 10, "status": "active", "deployed_at": "2025-06-01T14:00:00Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A shared S3 bucket where engineers upload model files to paths like "model_name/v1/model.pt". A configuration file in S3 records which version is current. Deploying a new version means uploading the new file and updating the config file. Rollback means updating the config file to point back to the old version path.',
      problems: [
        'No immutability — an engineer can accidentally overwrite a model version that was in production',
        'No lineage tracking — there is no record of which dataset trained which model version',
        'No deployment gate — any model file can be put in production without evaluation',
        'Rollback requires manual configuration file editing, which is error-prone under pressure during an incident',
        'No A/B testing — the entire fleet switches to the new model simultaneously, making regressions immediately impact all users',
        'No content-addressed deduplication — each fine-tuned model stores a full copy of the base model weights, consuming 10x more storage than necessary',
      ],
    },

    advancedImplementation: {
      title: 'Immutable Model Lifecycle Manager with Content-Addressed Storage and Safe Canary Deployment',
      description: 'Model artifacts are stored in S3 using content-addressed keys (SHA-256 of the model weights). The registry manages lifecycle stage transitions through an API that enforces evaluation gates before allowing promotion to production. A/B deployments are implemented by storing a routing configuration (primary version ID + canary version ID + traffic percentage) that the serving infrastructure reads on startup and periodically refreshes. Rollback is a one-API-call operation that creates a new deployment record pointing to the previous primary version, with no artifact movement required.',
      keyPoints: [
        'Content-addressed artifact storage: model weights stored at S3 key derived from SHA-256 hash; fine-tuned models that share base weights with their parent store only the adapter weights (LoRA: 1% of full model size) plus a pointer to the base model hash — 99% storage savings for fine-tuned model families',
        'Evaluation gate enforcement: before a model version can transition from staging to production, the registry API checks all configured gates (val_accuracy >= 0.95 AND p99_latency_ms <= 50); blocked promotion returns a structured error listing which gates failed',
        'Zero-downtime promotion: serving instances receive deployment configuration via polling the registry every 30 seconds; when a new deployment is activated, serving instances gradually load the new model and start routing canary traffic without restarting; primary model stays loaded for instant fallback',
        'Traffic splitting at the serving layer: each serving instance reads (primary_version_id, canary_version_id, canary_traffic_pct) from the registry; routes each incoming request independently (consistent hashing on request_id or user_id for sticky routing during A/B evaluation)',
        'Automated promotion based on canary metrics: a monitoring job computes the production metric difference between primary and canary every 5 minutes; if canary outperforms primary for 2 consecutive hours without regression, auto-promote canary to primary (configurable)',
        'Rollback is a registry operation, not a file operation: POST /rollback creates a new deployment record pointing to the previous primary version ID; serving infrastructure sees the updated routing config within 30 seconds; no artifact download required — all serving instances already have the previous model loaded',
        'Model format conversion on demand: registry stores the canonical PyTorch checkpoint; when a serving instance needs ONNX or TensorRT format, the registry triggers an on-demand conversion job and caches the result in S3 with the same content-addressed scheme',
      ],
      databaseChoice: 'PostgreSQL for all model metadata, version lineage, deployment state, and audit logs; S3 for artifact storage with content-addressed keys; Redis for caching the active deployment routing configuration (read by every serving instance every 30 seconds — must be fast and highly available); ClickHouse for production model performance metrics used for automated promotion decisions',
      caching: 'Active deployment routing configuration cached in Redis with 30-second TTL (all serving instances read from Redis, not PostgreSQL, to avoid hot-spotting the registry DB during high-QPS deployments); model version metadata cached for 5 minutes (rarely changes after registration); S3 pre-signed artifact URLs cached for 1 hour in serving infrastructure to avoid re-issuing on every cold start',
    },

    tips: [
      'The lifecycle stage machine (staging → production → archived) is the core abstraction — explain what transitions are allowed and what guardrails exist at each transition',
      'Content-addressed storage is particularly valuable for model registries because fine-tuned models share the vast majority of their weights with the base model — quantify the storage savings',
      'Zero-downtime deployment is the most important operational requirement — describe how serving infrastructure handles the transition without dropping requests',
      'Rollback speed matters: during a production incident, the registry should be able to roll back to the previous model in under 60 seconds, not in 10 minutes',
      'Evaluation gates separate ad-hoc model promotion (any model can go to production) from a disciplined MLOps process (models must earn production by passing defined criteria)',
      'The serving infrastructure polling pattern (check registry every 30s for routing config changes) is simpler and more reliable than a push-based notification approach for model deployments',
    ],

    keyQuestions: [
      {
        question: 'How do you implement atomic model promotion from staging to production to ensure zero-downtime deployment?',
        answer: `The Challenge

At any moment, hundreds of serving instances are processing requests using model_v6.
You want to promote model_v7 to production.
Two failure modes to avoid:
1. A gap where no model is loaded (downtime)
2. A period where some instances serve v6 and others serve v7 without knowing about the split (uncontrolled A/B)

The Deployment State Machine

\`\`\`
Registry database state (atomic transition):
BEFORE: { primary: v6, canary: null, canary_pct: 0 }

Step 1 (start canary): { primary: v6, canary: v7, canary_pct: 10 }
  → 10% of serving instances load v7, route 10% of traffic to it

Step 2 (ramp): { primary: v6, canary: v7, canary_pct: 50 }
  → serving instances that see this config adjust routing to 50/50

Step 3 (promote): { primary: v7, canary: null, canary_pct: 0 }
  → serving instances unload v6, 100% traffic to v7
  → v6 deployment record created with stage=archived
\`\`\`

How Serving Instances Handle This

\`\`\`python
class ModelServer:
    def __init__(self):
        self.loaded_models = {}  # version_id -> model object
        self.routing_config = None

    def refresh_config(self):  # called every 30 seconds
        config = registry.get_deployment_config(model_name, environment)

        # Preload new models before they serve traffic
        for version_id in [config.primary_version_id, config.canary_version_id]:
            if version_id and version_id not in self.loaded_models:
                self.loaded_models[version_id] = load_model(version_id)

        # Atomically update routing config
        self.routing_config = config

        # Unload models no longer in config (after TTL)
        ...

    def serve(self, request):
        config = self.routing_config
        version_id = config.primary_version_id

        if config.canary_version_id and hash(request.id) % 100 < config.canary_traffic_pct:
            version_id = config.canary_version_id

        return self.loaded_models[version_id].predict(request)
\`\`\`

Zero downtime guaranteed: models are loaded BEFORE routing config changes, so every request is served by a model that is already loaded in memory.`,
      },
      {
        question: 'How do you manage model weights that are hundreds of gigabytes in a content-addressed artifact store?',
        answer: `Content-Addressed Storage for Large Model Files

\`\`\`
Traditional (path-addressed):
  s3://registry/fraud-detection/v1/model.pt  (500GB)
  s3://registry/fraud-detection/v2/model.pt  (500GB)  ← identical base, different head
  s3://registry/fraud-detection/v3/model.pt  (500GB)  ← same as v2 but re-exported
  Total: 1.5TB for essentially 500GB of unique data

Content-addressed:
  s3://registry/artifacts/sha256-base-weights  (500GB)  ← base model weights
  s3://registry/artifacts/sha256-v2-head       (10MB)   ← only the classification head
  s3://registry/artifacts/sha256-v3-head       (10MB)   ← different threshold only
  Total: ~500GB, 3x cheaper
\`\`\`

Chunked Upload for Large Files

\`\`\`python
def upload_model(local_path: str) -> str:
    # 1. Compute content hash (streaming, doesn't load full file into RAM)
    content_hash = stream_sha256(local_path)

    # 2. Check if already stored (HEAD request)
    if s3.object_exists(f"artifacts/{content_hash}"):
        return content_hash  # Already stored, zero upload cost

    # 3. Initiate S3 multipart upload
    mpu = s3.create_multipart_upload(Key=f"artifacts/{content_hash}")

    # 4. Upload 100MB chunks in parallel (8 workers)
    chunk_size = 100 * 1024 * 1024
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = []
        for i, chunk in enumerate(read_chunks(local_path, chunk_size)):
            futures.append(executor.submit(upload_chunk, mpu.id, i, chunk))
        etags = [f.result() for f in futures]

    # 5. Complete multipart upload (atomic)
    s3.complete_multipart_upload(mpu.id, etags)
    return content_hash
\`\`\`

LoRA / Adapter Storage for Fine-Tuned Models

\`\`\`
base_model (LLaMA-3-70B): sha256-base → 140GB in S3
fine_tune_v1:
  - base_model_hash: sha256-base  (pointer, not a copy)
  - lora_adapter: sha256-lora-v1  (200MB — the only unique data)
fine_tune_v2:
  - base_model_hash: sha256-base  (same pointer)
  - lora_adapter: sha256-lora-v2  (200MB)

Storing 10 fine-tuned models: 140GB + 10 × 200MB = 142GB (vs 1.4TB naively)
Savings: 90%
\`\`\``,
      },
    ],

    keyDecisions: [
      'Content-addressed storage vs versioned S3 paths — chose content-addressed because it provides automatic deduplication for fine-tuned model families, immutability guarantees, and enables sharing base model weights across all fine-tunes without any coordination',
      'Polling-based config refresh (serving instances poll every 30s) vs push-based webhooks — chose polling because it is more resilient to registry downtime (serving continues on last known config); push requires serving instances to be reachable from the registry (complex in VPC environments)',
      'Registry-enforced evaluation gates vs honor system — chose registry-enforced because manual promotion processes are bypassed under deadline pressure; automated gates that block the API call prevent this',
      'Storing canonical format only (PyTorch) vs storing all serving formats — chose canonical format only with on-demand conversion because storage cost savings exceed the conversion latency cost on the rare deploy event; cached converted artifacts prevent repeated conversion cost',
      'Single production version vs A/B canary deployment — chose canary by default because promoting a new model to 100% of traffic immediately means regressions impact all users simultaneously; 10% canary exposes 10% of users to any regression while keeping 90% on the safe incumbent',
    ],
  },

  {
    id: 'data-labeling-system',
    isNew: true,
    title: 'Data Labeling and Annotation System',
    subtitle: 'Scale AI / Labelbox / Amazon SageMaker Ground Truth',
    icon: 'layers',
    color: '#f59e0b',
    difficulty: 'Medium',
    description: 'Design a data labeling platform that manages the end-to-end workflow of assigning annotation tasks to workers, enforcing quality through consensus and honeypot checks, and integrating an active learning loop to minimize labeling cost.',

    introduction: `Machine learning models learn from labeled data — data where a human has provided the ground truth that the model should predict. Collecting labeled data is expensive: annotating 1 million images with bounding boxes might cost $0.10-$1.00 per image, meaning $100K to $1M for a single dataset. At that cost, every inefficiency in the labeling process has a direct financial impact, and every quality issue has a direct impact on model performance.

Data labeling at scale requires solving several distinct problems simultaneously. First, the task routing problem: given thousands of available annotators and millions of items to label, how do you efficiently assign work, track progress, and handle annotators who abandon tasks without completing them? Second, the quality problem: how do you verify that annotators are doing their jobs correctly without manually reviewing every annotation? Third, the efficiency problem: not all items need human labels — easy items can be auto-labeled by a model with high confidence, and human effort should be concentrated on the hard, ambiguous items where model-provided labels would be wrong.

The active learning loop addresses the efficiency problem. An ML model is trained on the initial labeled set. For each unlabeled item, the model produces a prediction with a confidence score. Items where the model is confident can be auto-labeled and added directly to the training set without human review. Items where the model is uncertain are queued for human labeling. The newly labeled uncertain items are used to retrain the model, which is then applied to the remaining unlabeled items. This cycle can reduce total labeling cost by 40-70% while achieving the same model performance as labeling everything manually.

Annotation quality management is the most operationally complex component. Different annotators have different accuracy rates, different biases, and different expertise. A medical imaging annotation task requires trained radiologists while a sentiment labeling task can use crowd workers. Quality control requires a combination of techniques: consensus labeling (same item labeled by multiple workers, majority vote wins), honeypot items (items with known correct labels inserted into the task queue to detect cheating), and annotator performance tracking with automatic suspension of low-quality workers.`,

    functionalRequirements: [
      'Support multiple annotation task types: image classification, bounding box, polygon segmentation, named entity recognition, text classification, and preference ranking for RLHF',
      'Route tasks to appropriate annotators based on skill requirements, current workload, and historical quality',
      'Implement consensus labeling: send the same item to multiple annotators and aggregate via majority vote or confidence-weighted average',
      'Detect low-quality annotators using honeypot items with known correct labels inserted into the task queue',
      'Active learning loop: automatically send high-confidence model predictions to the training set; queue uncertain predictions for human labeling',
      'Export annotated datasets in standard formats: COCO, Pascal VOC, YOLO, spaCy, and custom JSON',
      'Track inter-annotator agreement metrics per project and per annotator using Cohen\'s kappa and Fleiss\' kappa',
      'Version annotation guidelines: when guidelines change, record which version was used for each annotation to maintain reproducibility',
    ],

    nonFunctionalRequirements: [
      'Task throughput: support 10K simultaneous annotators each completing 20-100 tasks per hour',
      'Task assignment latency: assign a new task to an annotator within 100ms of them completing the previous one',
      'Quality check coverage: every annotation project must have at least 5% honeypot coverage with sub-24hr quality detection',
      'Active learning cycle: model retrain and uncertainty scoring for remaining items completed within 4 hours of new labels being committed',
      'Export latency: generate a 1M-annotation dataset export in standard format within 15 minutes',
      'Annotator availability: platform must maintain 99.5% uptime during business hours when paid annotators are working',
    ],

    estimation: {
      users: '10K simultaneous paid annotators; 100 project managers; 50 ML engineers consuming labeled data',
      storage: '100M labeled items × avg 500 bytes label JSON = 50GB label storage; raw assets (images, audio) stored in separate object store referenced by URI; annotation history log 200GB/year',
      bandwidth: '10K annotators × 100 tasks/hr × 5KB per task (asset URI + annotation form) = 5GB/hr during peak; label submissions 10K annotators × 100/hr × 500 bytes = 500MB/hr',
      qps: '1M task completions/hr = 278/sec label submissions; 10K active sessions polling for next task = 100 task assignment requests/sec; 50 dataset export jobs/day',
    },

    apiDesign: {
      description: 'Annotator-facing API for task retrieval and submission; project management API for ML teams; quality monitoring API for project managers',
      endpoints: [
        { method: 'GET', path: '/api/tasks/next', params: 'annotator_id, project_id?', response: '{ task_id, asset_uri, task_type, annotation_schema, instructions_version, expires_at }', description: 'Get the next available task for an annotator; expires in 10 minutes if not completed' },
        { method: 'POST', path: '/api/tasks/{task_id}/submit', params: '{ annotator_id, annotation_data, time_spent_ms }', response: '{ accepted: bool, quality_feedback? }', description: 'Submit a completed annotation; triggers consensus check if needed' },
        { method: 'POST', path: '/api/projects', params: '{ name, task_type, annotation_schema, consensus_count, honeypot_ratio, active_learning_config? }', response: '{ project_id }', description: 'Create a new labeling project with quality and active learning configuration' },
        { method: 'POST', path: '/api/projects/{id}/items', params: '{ items[{ asset_uri, metadata, is_honeypot?, correct_label? }] }', response: '{ queued_count }', description: 'Upload items to be labeled; honeypot items include the correct label for quality checking' },
        { method: 'GET', path: '/api/projects/{id}/quality', params: 'date_range?', response: '{ honeypot_accuracy, inter_annotator_agreement, flagged_annotators[], consensus_agreement_rate }', description: 'Retrieve quality metrics for a project' },
        { method: 'POST', path: '/api/projects/{id}/export', params: '{ format: "coco"|"yolo"|"spacy"|"json", completed_only: bool }', response: '{ job_id, download_uri? }', description: 'Trigger dataset export in the specified format; async for large datasets' },
      ],
    },

    dataModel: {
      description: 'Task routing and annotation state in PostgreSQL; annotator performance metrics in ClickHouse; raw annotation data in S3 with PostgreSQL references',
      schema: `projects {
  id: uuid PK
  name: varchar(500)
  task_type: varchar(100)         -- "bbox", "classification", "segmentation", "ner", "preference"
  annotation_schema: jsonb        -- defines the structure of valid annotations
  consensus_count: int default 3  -- how many annotators label each item
  honeypot_ratio: float default 0.05
  active_learning_enabled: boolean
  active_learning_model_uri: text nullable
  guidelines_version: int
  status: enum(active, paused, completed, archived)
  team_id: uuid FK
}

items {
  id: uuid PK
  project_id: uuid FK
  asset_uri: text                 -- s3://... or https://...
  metadata: jsonb
  is_honeypot: boolean default false
  honeypot_correct_label: jsonb nullable
  status: enum(pending, in_progress, needs_review, completed, auto_labeled)
  final_annotation: jsonb nullable
  annotation_method: enum(consensus, auto_labeled, single_expert) nullable
  created_at: timestamp
}

annotations {
  id: uuid PK
  item_id: uuid FK
  project_id: uuid FK
  annotator_id: uuid FK
  annotation_data: jsonb
  time_spent_ms: int
  guidelines_version: int
  is_honeypot_check: boolean
  honeypot_passed: boolean nullable
  submitted_at: timestamp
}

annotators {
  id: uuid PK
  name: varchar(200)
  email: varchar(300) unique
  skill_tags: text[]
  status: enum(active, suspended, probation)
  suspension_reason: text nullable
  overall_accuracy: float default 1.0
  tasks_completed: int default 0
  joined_at: timestamp
}`,
      examples: [
        { table: 'items', label: 'A labeled item completed via consensus of 3 annotators', json: '{ "id": "item-a1b2c3", "project_id": "proj-d4e5f6", "asset_uri": "s3://raw-data/images/cat-12345.jpg", "is_honeypot": false, "status": "completed", "final_annotation": { "label": "cat", "confidence": 1.0, "annotator_count": 3, "agreement": 1.0 }, "annotation_method": "consensus" }' },
        { table: 'annotations', label: 'A honeypot annotation that failed quality check', json: '{ "id": "ann-g7h8i9", "item_id": "item-j0k1l2", "annotator_id": "antr-m3n4o5", "annotation_data": { "label": "dog" }, "time_spent_ms": 890, "is_honeypot_check": true, "honeypot_passed": false, "submitted_at": "2025-06-01T14:23:00Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A web form where annotators log in and see a queue of images or text to label. Annotations are written to a database table. A project manager periodically reviews a sample of annotations manually. No consensus, no honeypots, no active learning. Dataset is exported as a CSV when the project is complete.',
      problems: [
        'No quality control — a malicious or careless annotator can submit random labels and get paid without any detection',
        'No consensus — single-annotator labels have no measure of ambiguity and may be systematically wrong for a specific annotator',
        'No active learning — every item is labeled by humans even for items a model could confidently auto-label, wasting budget',
        'No annotator skill tracking — a highly accurate annotator and a barely-passing annotator are assigned the same tasks at the same pay rate',
        'No handling of task abandonment — items claimed by an annotator who stops working are stuck in "in-progress" indefinitely',
        'No inter-annotator agreement metrics — project manager cannot tell whether the labeling task is genuinely ambiguous or just poorly defined',
      ],
    },

    advancedImplementation: {
      title: 'ML-Accelerated Labeling Platform with Active Learning and Automated Quality Control',
      description: 'Task routing uses a matching system that considers annotator skill tags, current task queue depth, historical accuracy per task type, and geographic availability. Each item is sent to N annotators (consensus_count, typically 3) using a work queue with 10-minute expiry; expired tasks are automatically re-queued. Honeypot items (5% of the task queue) have known correct labels — when an annotator submits a honeypot annotation, the system immediately compares against the known label and updates the annotator\'s running accuracy score. Below 80% honeypot accuracy triggers a probation flag; below 60% triggers automatic suspension.',
      keyPoints: [
        'Task queue with expiry: items are assigned to annotators by writing a reservation record with a 10-minute TTL; if the annotation is not submitted before expiry, the reservation is deleted and the item is re-queued — handles annotator dropout without human intervention',
        'Consensus resolution strategies: majority vote for categorical labels; union of bounding boxes with IoU-based merge for detection tasks; weighted vote where weight = annotator\'s historical accuracy on this task type',
        'Honeypot injection: when a new batch of items is uploaded, the platform randomly selects 5% of items as honeypots and inserts known-correct items from the honeypot library into the task queue at the same frequency — annotators cannot distinguish honeypots from real items',
        'Active learning loop: a background job runs the current model on all unlabeled items and scores confidence; items with confidence > 0.95 are auto-labeled and marked status=auto_labeled; items with confidence < 0.60 are promoted to the front of the labeling queue (hard examples teach the model more per labeling dollar)',
        'Inter-annotator agreement: for completed items with multiple annotations, compute pairwise Cohen\'s kappa; low kappa triggers a guidelines review (annotation task may be ambiguous) or expert review queue (edge case items that confuse most annotators)',
        'Annotator skill graph: each annotator has a per-category accuracy score updated after each honeypot; routing prefers annotators with >90% accuracy for high-stakes projects (medical, legal) and distributes more broadly for low-stakes projects (sentiment)',
        'Guidelines versioning: when annotation guidelines are updated (what counts as a "car" in a crowded scene?), the platform records the guidelines version on every annotation; items annotated under old guidelines can be optionally re-annotated under new guidelines without invalidating the full dataset',
      ],
      databaseChoice: 'PostgreSQL for task queue, item state, annotation records, and annotator profiles; Redis for the active task reservation cache (10-minute TTL per reservation — prevents double-assignment of tasks); ClickHouse for annotator performance time-series metrics and project progress analytics; S3 for bulk annotation exports and annotation history archives',
      caching: 'Active task reservations in Redis (fast check for whether an item is claimed, not available); annotator accuracy scores cached in Redis (updated after each honeypot, read on every task assignment); project statistics cached in Redis for dashboard (updated every 5 minutes); annotation schema cached in application memory per project (rarely changes)',
    },

    tips: [
      'Consensus labeling and honeypot quality control are the two most important quality mechanisms — explain both clearly and note that they serve different purposes (consensus catches ambiguous items; honeypots catch lazy or malicious annotators)',
      'Active learning is where the cost savings come from — explain the cycle clearly: train model → score unlabeled items → auto-label confident items → human-label uncertain items → retrain',
      'Task expiry and re-queuing is a critical reliability feature that is easy to overlook — without it, annotator dropout causes items to be permanently stuck',
      'Inter-annotator agreement metrics (Cohen\'s kappa) diagnose whether poor quality is due to bad annotators or ambiguous task definitions — important distinction for project managers',
      'RLHF preference ranking is an increasingly important task type (human labels "response A is better than response B") — mention it to demonstrate awareness of modern AI training pipelines',
      'Guidelines versioning matters for long-running projects where best practices evolve — annotations made under different guidelines cannot always be combined in one training set',
    ],

    keyQuestions: [
      {
        question: 'How does the active learning loop reduce total labeling cost while maintaining dataset quality?',
        answer: `Why Not Label Everything?

If you have 1M images and label them all, you spend:
- 1M × $0.50/label = $500K
- Model trains on 1M examples

But 700K of those images are "easy" — the model would have correctly guessed them after training on the first 300K. You paid $350K to label examples that added little information.

The Active Learning Loop

\`\`\`
Round 0: Hand-label 10K seed examples (random sample)
         Train model_v0 on 10K labels

Round 1: Score all 990K unlabeled images with model_v0
         confidence > 0.95: auto-label 500K images (50% of remaining)
         confidence < 0.60: queue 50K most uncertain for human labeling
         Train model_v1 on 10K + 50K + 500K = 560K examples

Round 2: Score remaining 440K unlabeled images with model_v1
         Auto-label 350K more (higher confidence now, model improved)
         Human-label 50K most uncertain
         Train model_v2 on 560K + 50K + 350K = 960K examples

Round 3: Auto-label remaining 40K with model_v2
         Total human labels needed: 10K + 50K + 50K = 110K (vs 1M)
         Cost: 110K × $0.50 = $55K (vs $500K)
         Savings: 89%
\`\`\`

Quality preservation: the model only auto-labels items it is confident about (threshold 0.95). Misclassification rate on auto-labeled items is typically < 2%, comparable to inter-annotator disagreement rate on the same items. Items where the model is uncertain (0.60-0.95) are queued for human labeling, not auto-labeled.

When to not use active learning: tasks where model confidence is unreliable (subtle medical diagnoses), tasks where false negatives are catastrophic (safety-critical detection), or very early in a project before the model has enough training data to produce reliable confidence scores.`,
      },
      {
        question: 'How do you detect and handle low-quality annotators in a crowdsourced labeling pipeline?',
        answer: `Honeypot Items

A honeypot library is maintained by experts who create items with known-correct labels:
\`\`\`
Library: 10,000 images with expert-verified labels
  - Cat photos always labeled "cat"
  - Borderline cases labeled with the correct resolution and reasoning
\`\`\`

When a new batch is uploaded to the platform, 5% of task slots are filled with honeypot items from the library. Annotators cannot distinguish honeypots from real items — they look identical.

Quality Score Calculation

\`\`\`python
def update_annotator_quality(annotator_id, honeypot_result):
    # Exponential moving average gives more weight to recent performance
    current_accuracy = get_annotator_accuracy(annotator_id)

    result = 1.0 if honeypot_result.passed else 0.0
    new_accuracy = 0.9 * current_accuracy + 0.1 * result

    update_annotator_accuracy(annotator_id, new_accuracy)

    if new_accuracy < 0.60:
        suspend_annotator(annotator_id, reason="honeypot_accuracy")
    elif new_accuracy < 0.80:
        flag_for_probation(annotator_id)
\`\`\`

Multi-Signal Quality Detection

Honeypots alone miss some quality issues:
- Speed cheating: annotator completes tasks in 2 seconds each (minimum is 15s for a bounding box task) → flag for review
- Pattern cheating: annotator always selects the top-left bounding box, or always chooses "Class A" → detect with statistical uniformity test
- Disagreement rate: annotator disagrees with majority consensus more than 30% of the time → flag for review
- Task abandonment: annotator claims tasks but never submits → automatic timeout and suspension

Calibration for Edge Cases

Some items are genuinely ambiguous — even expert annotators disagree. Distinguish:
- Annotator error: honeypot item (unambiguous) labeled wrong
- Genuine ambiguity: item that all annotators disagree on → use majority vote AND add to expert review queue for a definitive label

Track inter-annotator agreement (IAA) per annotator: if one annotator's IAA with others is consistently lower than the project average, they are likely applying different guidelines rather than cheating — trigger a calibration session rather than suspension.`,
      },
    ],

    keyDecisions: [
      'Consensus labeling (N annotators per item) vs single annotation with expert review — chose consensus with honeypot quality control because it scales to thousands of crowdworkers without requiring expert review of every annotation',
      'Active learning uncertainty sampling vs random sampling for human labeling queue — chose uncertainty sampling because it concentrates human effort on the examples that teach the model the most, reducing total labeling cost by 40-70%',
      'Task expiry via Redis TTL vs database-managed expiry — chose Redis TTL because expiry checking at task assignment time is a hot path (10K requests/sec); Redis TTL is a native atomic operation vs a database scan',
      'Majority vote vs weighted vote for consensus resolution — chose weighted vote (weight = annotator accuracy) for high-stakes projects because it captures the quality difference between expert and average annotators; majority vote for commodity annotation tasks where all annotators have similar accuracy',
      'Fixed honeypot library vs dynamically generated honeypots — chose fixed library of expert-verified items because dynamic generation introduces the risk of incorrect honeypot answers; an expert-curated library provides reliable ground truth',
    ],
  },

  {
    id: 'synthetic-data-generation',
    isNew: true,
    title: 'Synthetic Data Generation System',
    subtitle: 'Mostly AI / Gretel AI / Generate Privacy-Safe Training Data',
    icon: 'cpu',
    color: '#ec4899',
    difficulty: 'Hard',
    description: 'Design a system to generate statistically faithful synthetic data from real datasets, enabling ML training on privacy-sensitive data and augmentation of rare classes without exposing PII.',

    introduction: `Many of the most valuable ML training datasets cannot be used directly due to privacy regulations. A hospital cannot share patient records for training a clinical NLP model without violating HIPAA. A bank cannot share transaction data for fraud model training without risking PII exposure. A self-driving car company may have thousands of hours of road footage but only 50 hours of footage involving rare edge cases like tire blowouts or cyclist falls — not enough to train a safe model.

Synthetic data generation addresses both problems. Privacy-sensitive data can be replaced by synthetic data that preserves the statistical properties of the real data while containing no real individuals' information. Rare classes can be augmented with synthetic examples that teach the model the patterns it needs to see. In both cases, the key question is: how do you know the synthetic data is good enough? A synthetic dataset that does not faithfully represent the real data distribution will produce a model that works well on synthetic data but fails on real data — a synthetic version of training-serving skew.

The technical approaches differ by data modality. For tabular data (customer records, transaction logs), generative adversarial networks (CTGAN, CopulaGAN) or variational autoencoders learn the joint distribution of all columns, including correlations between them — a synthetic row should have an age and income that are correlated the same way as in the real data. For text, fine-tuned language models generate synthetic documents with similar linguistic style and domain vocabulary. For images, diffusion models generate photorealistic synthetic examples of underrepresented classes.

The privacy guarantee is the hardest requirement. A synthetic dataset must not memorize and reproduce real individuals' data. If a synthetic generator is trained on a dataset containing a specific person's medical record, can the synthetic generator be prompted to reproduce that record? Differential privacy provides a mathematical privacy guarantee: the synthetic data generator is trained with a privacy budget (epsilon, delta) that bounds the probability of any individual's data being recoverable from the synthetic output. Smaller epsilon means stronger privacy but lower data utility — this tradeoff is the central design tension in privacy-preserving synthetic data generation.`,

    functionalRequirements: [
      'Accept tabular, text, image, and time-series datasets as input and generate synthetic datasets of configurable size',
      'Evaluate statistical fidelity: compare synthetic vs real data using correlation matrices, distribution tests, and an ML utility test',
      'Provide configurable differential privacy guarantees for tabular data with a tunable privacy budget (epsilon)',
      'Support conditional generation: generate synthetic examples with specified properties such as "generate 10,000 fraud transactions with amounts above $10,000"',
      'Combine real and synthetic data in configurable ratios for training dataset augmentation',
      'Detect and report bias amplification: flag if the synthetic generator has amplified demographic biases from the real data',
      'Run membership inference attacks on the synthetic dataset to verify privacy before releasing it',
      'Support incremental generation: add synthetic examples to an existing dataset without regenerating everything from scratch',
    ],

    nonFunctionalRequirements: [
      'Generation throughput: produce 1M synthetic rows from a tabular generator within 1 hour on a GPU cluster',
      'Fidelity target: synthetic data should achieve a Train-on-Synthetic, Test-on-Real (TSTR) accuracy within 5% of Train-on-Real, Test-on-Real',
      'Privacy guarantee: default epsilon = 1.0 for differential privacy; configurable between 0.1 (strong) and 10.0 (weak)',
      'Generator training time: CTGAN model on a 1M-row, 50-column tabular dataset trained within 4 hours on 4 GPUs',
      'Membership inference: resistance to membership inference attack must be verified before any synthetic dataset is released externally',
      'Output scale: support generating synthetic datasets up to 100x the size of the original dataset',
    ],

    estimation: {
      users: '100 data scientists and ML engineers generating synthetic datasets; 20 data privacy officers reviewing and approving releases',
      storage: '50 generators trained per month × avg 5GB model size = 250GB/month generator storage; synthetic datasets 50 × 10GB avg = 500GB/month output storage; original datasets in a separate secure store',
      bandwidth: 'Generator training reads original dataset repeatedly during training (10-50 epochs over 1M rows = 50M row reads); generation produces 1M rows/hr at 100 bytes/row = 100MB/hr',
      qps: '20 generator training jobs/month (long-running, hours each); 100 generation jobs/day (minutes each); 50 fidelity evaluation jobs/day',
    },

    apiDesign: {
      description: 'Async job-based API for generator training and data generation; synchronous API for fidelity evaluation and privacy checks',
      endpoints: [
        { method: 'POST', path: '/api/generators', params: '{ dataset_uri, model_type: "ctgan"|"tvae"|"llm"|"diffusion", privacy_config: { epsilon, delta }, training_config }', response: '{ generator_id, training_job_id, status: "training" }', description: 'Train a synthetic data generator on a real dataset with optional DP guarantees' },
        { method: 'POST', path: '/api/generators/{id}/generate', params: '{ num_rows, conditioning?: { column: value }, output_uri }', response: '{ generation_job_id, status: "running" }', description: 'Generate synthetic data from a trained generator; supports conditional generation' },
        { method: 'POST', path: '/api/evaluate/fidelity', params: '{ real_dataset_uri, synthetic_dataset_uri, metrics: ["correlation", "ks_test", "tstr", "privacy_score"] }', response: '{ job_id }', description: 'Run fidelity evaluation comparing synthetic and real data' },
        { method: 'GET', path: '/api/evaluate/{job_id}/results', params: '', response: '{ correlation_similarity, ks_test_pass_rate, tstr_accuracy_gap, membership_inference_auc, bias_amplification_metrics{} }', description: 'Retrieve evaluation results including privacy and bias metrics' },
        { method: 'POST', path: '/api/datasets/augment', params: '{ real_dataset_uri, generator_id, synthetic_ratio: 0.5, output_uri }', response: '{ augmented_dataset_uri, real_rows, synthetic_rows }', description: 'Create an augmented training dataset combining real and synthetic data' },
        { method: 'GET', path: '/api/generators/{id}', params: '', response: '{ generator_id, status, model_type, privacy_epsilon, training_metrics{}, fidelity_score, approved_for_external_release }', description: 'Get generator status, training metrics, and privacy approval status' },
      ],
    },

    dataModel: {
      description: 'Generator metadata and job state in PostgreSQL; trained generator model files in S3; fidelity evaluation results in PostgreSQL; audit log in append-only table',
      schema: `generators {
  id: uuid PK
  name: varchar(500)
  owner_team_id: uuid FK
  model_type: varchar(100)         -- "ctgan", "tvae", "copulagan", "llm_finetune", "stable_diffusion"
  source_dataset_uri: text         -- s3://... (never the data itself, just a reference)
  model_artifact_uri: text nullable -- s3://... once training is complete
  status: enum(training, ready, failed, deprecated)
  privacy_epsilon: float nullable
  privacy_delta: float nullable
  training_dataset_rows: bigint
  training_columns: jsonb
  training_started_at: timestamp
  training_completed_at: timestamp nullable
  approved_for_external_release: boolean default false
  approved_by: uuid FK nullable
}

generation_jobs {
  id: uuid PK
  generator_id: uuid FK
  status: enum(pending, running, completed, failed)
  num_rows_requested: bigint
  num_rows_generated: bigint nullable
  conditioning: jsonb nullable
  output_uri: text nullable
  gpu_seconds_consumed: int nullable
  started_at: timestamp
  completed_at: timestamp nullable
}

fidelity_evaluations {
  id: uuid PK
  generator_id: uuid FK
  real_dataset_uri: text
  synthetic_dataset_uri: text
  correlation_similarity_score: float
  ks_test_pass_rate: float
  tstr_accuracy_gap: float          -- (TSTR accuracy - TRTR accuracy); closer to 0 is better
  membership_inference_auc: float   -- closer to 0.5 = random = private; 1.0 = perfect inference = not private
  bias_amplification: jsonb         -- { "gender": 0.03, "age_group": -0.01 }
  evaluated_at: timestamp
  evaluator: enum(automated, human_review)
}`,
      examples: [
        { table: 'generators', label: 'A CTGAN generator with differential privacy', json: '{ "id": "gen-a1b2c3", "name": "patient-records-synthetic-v2", "model_type": "ctgan", "status": "ready", "privacy_epsilon": 1.0, "privacy_delta": 1e-5, "training_dataset_rows": 500000, "approved_for_external_release": false }' },
        { table: 'fidelity_evaluations', label: 'Fidelity evaluation showing good synthetic data quality', json: '{ "id": "eval-d4e5f6", "generator_id": "gen-a1b2c3", "correlation_similarity_score": 0.94, "ks_test_pass_rate": 0.91, "tstr_accuracy_gap": -0.03, "membership_inference_auc": 0.53, "bias_amplification": { "gender": 0.01, "age_group": -0.02 } }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A data scientist trains a CTGAN model locally using the open-source library, generates synthetic rows, and uploads the CSV to S3. No fidelity evaluation, no privacy testing, no governance workflow. The synthetic dataset is used in model training without any quality verification.',
      problems: [
        'No fidelity evaluation — synthetic data may not capture column correlations, leading to a model that trains well on synthetic data but fails on real data',
        'No privacy testing — the generator may memorize and reproduce rows from the training data, especially for rare individuals',
        'No governance workflow — synthetic data derived from HIPAA-protected data may be released externally without the appropriate privacy approval',
        'No bias monitoring — the generator may amplify demographic biases from the training data, causing a model trained on synthetic data to be more biased than one trained on real data',
        'No support for conditional generation — generating specific types of rare examples requires custom scripting each time',
        'No auditability — there is no record of which synthetic datasets were generated from which real datasets by whom',
      ],
    },

    advancedImplementation: {
      title: 'Privacy-Certified Synthetic Data Platform with Automated Fidelity and Bias Evaluation',
      description: 'Generator training is managed as a tracked job with metadata stored in the platform database. For tabular data, CTGAN or TVAE is trained with differentially private SGD (DP-SGD) to provide a formal epsilon guarantee. After training, an automated evaluation pipeline runs four tests: correlation matrix similarity (how well synthetic data preserves inter-column correlations), KS test pass rate (do synthetic column distributions match real distributions?), TSTR accuracy gap (does a model trained on synthetic data perform as well as one trained on real data?), and membership inference AUC (can an adversary distinguish training examples from non-training examples in the synthetic data?). Generators that pass all tests at configured thresholds receive a fidelity certificate that allows them to be used in production training pipelines.',
      keyPoints: [
        'DP-SGD for tabular generation: differentially private stochastic gradient descent clips gradient norms and adds calibrated Gaussian noise during generator training; the total privacy budget spent across all training steps bounds how much any individual record influences the generator',
        'Fidelity evaluation pipeline — four complementary tests: (1) correlation matrix Frobenius distance (synthetic column correlations match real); (2) KS test per column (synthetic marginal distributions match real); (3) TSTR test (train classifier on synthetic, evaluate on held-out real data — gap vs real-on-real indicates utility loss); (4) membership inference AUC (adversary guesses whether a row was in the training set — 0.5 = random, 0.5 = private)',
        'Bias amplification detection: compute demographic parity difference for protected attributes (gender, race, age group) in both real and synthetic data; if the synthetic data amplifies the gap beyond a threshold (0.05), flag the generator and report to the privacy officer before release',
        'Conditional generation for class imbalance: GAN conditioning allows specifying values for output columns — generate 10,000 rows where fraud_label=1 and amount > 10000; this augments rare classes without changing the distribution of common classes',
        'Generator versioning: when the source dataset is updated or the model architecture changes, a new generator version is created while the old version continues to serve existing generation requests; each generated dataset records the generator version used for reproducibility',
        'Approval workflow for external release: any synthetic dataset intended for release outside the organization (to regulators, research partners) must pass a stricter privacy review (lower epsilon, membership inference AUC < 0.51) and receive explicit approval from a designated privacy officer before the download URI is activated',
        'Compute cost management: generator training is expensive (GPU hours); the platform maintains a queue with priority (production model training > research experiments > one-off requests) and tracks GPU cost per team for chargeback; partial generation (generate 100K rows for a quick experiment) is offered as a cheaper alternative to full dataset generation',
      ],
      databaseChoice: 'PostgreSQL for generator metadata, job state, evaluation results, and approval records; S3 for generator model artifacts and generated datasets; Redis for job queue management and progress tracking; a separate secure enclave for the original sensitive datasets (never stored in the same system as the synthetic output)',
      caching: 'Fidelity evaluation results cached per (generator_id, synthetic_dataset_uri) — re-evaluation is not needed if neither the generator nor the synthetic dataset has changed; generator model loaded into GPU memory for the duration of a generation job (minutes), then released; frequently-requested generator metadata cached in Redis',
    },

    tips: [
      'The TSTR (Train on Synthetic, Test on Real) evaluation is the most practical quality metric — explain clearly why it measures what actually matters for ML utility',
      'Differential privacy epsilon is often misunderstood — explain the tradeoff: epsilon=0.1 (very private, low utility), epsilon=1.0 (standard, good balance), epsilon=10.0 (weak privacy, high utility)',
      'Membership inference attacks are the gold-standard privacy test for generative models — explain what AUC of 0.5 means (random, fully private) vs 1.0 (perfect inference, not private)',
      'Bias amplification is a subtle but critical risk — a synthetic generator trained on biased data can amplify those biases, making a downstream model trained on synthetic data more biased than if it had been trained on real data',
      'Conditional generation for rare class augmentation is the most commercially valuable use case — explain the business impact: you can generate thousands of fraud examples for training even if you only have 100 real ones',
      'The governance workflow (approval before external release) is essential in regulated industries — data privacy officers need to approve synthetic datasets before they leave the organization',
    ],

    keyQuestions: [
      {
        question: 'How do you evaluate whether synthetic data is statistically faithful to real data?',
        answer: `Why Fidelity Evaluation Matters

A synthetic dataset that does not match the real distribution produces a model trained on the wrong distribution:
- Model learns to predict "high income → likely to default on loan"
- But synthetic income was generated independently of credit score (correlation lost)
- Model misses the real pattern: high-income, low-credit-score is the actual default risk

Four Evaluation Dimensions

1. Marginal Distribution Fidelity (KS Test per column)
\`\`\`python
from scipy.stats import ks_2samp

for column in all_columns:
    statistic, p_value = ks_2samp(real_df[column], synthetic_df[column])
    # p_value < 0.05: distributions are significantly different → flag
    pass_rate = sum(p_value > 0.05) / len(all_columns)
# Target: KS test pass rate > 90%
\`\`\`

2. Correlation Structure Fidelity
\`\`\`python
real_corr = real_df.corr()
synthetic_corr = synthetic_df.corr()

frobenius_distance = np.linalg.norm(real_corr - synthetic_corr, 'fro')
# Normalized to [0, 1]; target < 0.1 (very similar)
\`\`\`

3. ML Utility (TSTR Test)
\`\`\`python
# Train on Synthetic, Test on Real
model_S = train_classifier(X=synthetic_X, y=synthetic_y)
tstr_accuracy = evaluate(model_S, X=real_test_X, y=real_test_y)

# Train on Real, Test on Real (upper bound)
model_R = train_classifier(X=real_train_X, y=real_train_y)
trtr_accuracy = evaluate(model_R, X=real_test_X, y=real_test_y)

accuracy_gap = trtr_accuracy - tstr_accuracy
# Target: accuracy_gap < 0.05 (within 5% of real data utility)
\`\`\`

4. Privacy Score (Membership Inference AUC)
\`\`\`python
# Adversary tries to guess: "was this row in the training set?"
# AUC = 0.5: cannot distinguish (fully private)
# AUC = 1.0: perfect guess (memorized training data, not private)

adversary = train_membership_inference_classifier(synthetic_data, holdout_data)
mi_auc = evaluate_auc(adversary, known_train_rows, known_holdout_rows)
# Target: MI AUC < 0.55
\`\`\``,
      },
      {
        question: 'How do you prevent the synthetic data generator from amplifying biases in the real training data?',
        answer: `The Bias Amplification Problem

If the real training data contains a bias (e.g., women are underrepresented in high-salary rows by 10 percentage points), a naive synthetic generator learns this bias as a feature of the distribution and reproduces it exactly — or amplifies it if the correlation is imperfect.

\`\`\`
Real data:
  Male high-salary: 35%
  Female high-salary: 25%
  Gender pay gap (demographic parity): 10pp

Synthetic data (naive CTGAN):
  Male high-salary: 38%
  Female high-salary: 22%
  Gender pay gap: 16pp   ← AMPLIFIED
\`\`\`

A model trained on the synthetic data learns a stronger gender-salary bias than the real data warranted.

Detection

\`\`\`python
def check_bias_amplification(real_df, synthetic_df, protected_attrs, label_col):
    results = {}
    for attr in protected_attrs:
        # Demographic parity difference: P(Y=1|A=0) - P(Y=1|A=1)
        real_dpd = demographic_parity_difference(real_df[label_col], real_df[attr])
        synthetic_dpd = demographic_parity_difference(synthetic_df[label_col], synthetic_df[attr])

        amplification = synthetic_dpd - real_dpd
        results[attr] = amplification

        if abs(amplification) > 0.05:
            flag_for_review(attr, amplification)  # Significant amplification

    return results
\`\`\`

Mitigation Techniques

1. Fairness constraints during generation: add a fairness regularization term to the GAN loss that penalizes demographic parity differences exceeding the real data baseline

2. Reweighting training examples: upweight underrepresented groups in the training data before fitting the generator so the generator learns a less biased distribution

3. Post-generation resampling: after generating synthetic data, resample to match target demographic distributions (e.g., 50/50 gender split in high-salary rows) — simple but changes the marginal distribution

4. Human review requirement: any generator with bias amplification > 0.05 for a protected attribute requires human review and explicit approval before the synthetic dataset can be used in model training`,
      },
    ],

    keyDecisions: [
      'Differential privacy (DP-SGD) vs no privacy guarantee — chose DP-SGD for sensitive domains (healthcare, finance) because formal epsilon guarantees are required by regulators and auditors; for non-sensitive domains, skip DP to preserve fidelity',
      'CTGAN vs TVAE vs CopulaGAN for tabular generation — chose CTGAN as the default because it handles mixed data types (continuous + categorical) well and is the most widely validated; TVAE as fallback for datasets with many missing values; CopulaGAN for datasets where capturing complex multi-variate dependencies is critical',
      'Single shared generator for all datasets vs per-dataset generators — chose per-dataset generators because each dataset has unique statistical properties; a shared generator cannot capture domain-specific correlations and introduces risk of cross-dataset information leakage',
      'Immediate generation after training vs gated generation requiring approval — chose gated: a generator can train and be tested immediately, but synthetic data derived from sensitive datasets cannot be downloaded or used in external-facing models until a privacy officer reviews the membership inference and bias reports',
      'Measuring fidelity with TSTR vs statistical tests vs both — chose both because statistical tests (KS, correlation) can pass while utility (TSTR) fails if the model fails to capture rare but important patterns; TSTR alone cannot detect whether a generator has memorized specific rows',
    ],
  },

  {
    id: 'embedding-pipeline',
    isNew: true,
    title: 'Embedding Generation Pipeline',
    subtitle: 'Embed Billions of Documents for Semantic Search',
    icon: 'cpu',
    color: '#10b981',
    difficulty: 'Hard',
    description: 'Design a distributed pipeline to embed billions of documents using transformer models, maintain a fresh vector index, and serve embedding lookups with sub-50ms latency for semantic search and RAG applications.',

    introduction: `Semantic search, RAG (Retrieval-Augmented Generation), and recommendation systems all require that every document or item in a corpus be represented as a dense vector embedding — a high-dimensional floating-point array that encodes the semantic meaning of the content. Finding semantically similar items then reduces to finding the nearest neighbors of a query embedding in this high-dimensional space. This is vastly more powerful than keyword search, but it requires solving a hard infrastructure problem: how do you generate and maintain embeddings for a corpus that might contain billions of documents, is constantly growing, and may need to be entirely re-embedded when a better embedding model is released?

The compute requirements are significant. Embedding a single document with a BERT-class model takes about 10ms on CPU and 0.5ms on GPU. Embedding 1 billion documents on a single GPU would take about 138 hours — nearly 6 days. Doing it in a reasonable timeframe (hours, not days) requires a distributed embedding job that parallelizes across dozens of GPUs, each processing batches of documents simultaneously. The job must be fault-tolerant (individual GPUs can fail during a long batch job), resumable (if the job crashes at 80% completion, it should not restart from scratch), and produce embeddings that are consistent in scale and normalization across all workers.

Incremental embedding is the ongoing operational challenge. New documents are added continuously. Each new document needs an embedding generated and added to the vector index. If adding to the index requires rebuilding it from scratch, the operational burden becomes unsustainable. Modern vector databases like Qdrant and Weaviate support incremental inserts into an HNSW index, but doing inserts at high throughput while simultaneously serving ANN search queries requires careful isolation and resource management.

Model versioning creates the most disruptive operational event in an embedding pipeline: switching from one embedding model to another. The new model may produce embeddings in a different dimensional space (768 vs 1536 dimensions), use a different normalization, or simply encode semantics differently. All existing embeddings become incompatible. The entire corpus must be re-embedded using the new model, and the new index must be built in parallel with the old one serving live traffic — with a coordinated cutover at the end.`,

    functionalRequirements: [
      'Embed a corpus of 1 billion documents using GPU-accelerated batch processing across a distributed cluster',
      'Support incremental embedding: new documents added to the corpus are embedded and indexed within 5 minutes of ingestion',
      'Enable model version migration: re-embed the full corpus when switching to a new embedding model with zero downtime cutover',
      'Provide a real-time embedding endpoint: embed a single query document within 50ms for use in live search and RAG pipelines',
      'Normalize all embeddings (L2 normalization) consistently across all workers to enable cosine similarity via dot product',
      'Support multiple embedding models simultaneously (for A/B testing model versions or serving different use cases with different models)',
      'Monitor embedding pipeline health: alert on throughput drops, failed batches, and embedding distribution drift',
      'Deduplicate documents: do not re-embed a document that has already been embedded (check content hash before embedding)',
    ],

    nonFunctionalRequirements: [
      'Batch embedding throughput: embed 1B documents within 8 hours using a 32-GPU cluster',
      'Incremental embedding latency: newly ingested document appears in the searchable index within 5 minutes',
      'Real-time embedding latency: single-document embedding API returns within 50ms at p99',
      'GPU utilization: batch embedding jobs should achieve over 85% GPU utilization to minimize compute cost',
      'Fault tolerance: batch job can recover from any single GPU failure without losing more than 5 minutes of progress',
      'Index freshness: ANN search index reflects documents ingested up to 5 minutes ago during normal operation',
    ],

    estimation: {
      users: '100M end users issuing search queries; 50 ML engineers managing the pipeline; 100 ingestion sources adding new documents',
      storage: '1B documents × 1536-dim float32 = 6TB raw embeddings; vector index overhead 2-3x = 12-18TB; document metadata 1B × 1KB = 1TB; total 13-20TB',
      bandwidth: '1B documents / 8hr batch = 35M docs/hr = 10K docs/sec; each doc 512 tokens average at 10ms GPU time = 100 GPU-hours needed; 32 GPUs in parallel = 3hr compute time with overhead',
      qps: '100M search queries/day = 1157/sec needing real-time embedding; 10K new documents/sec during peak ingestion; 32 GPU workers in batch mode each processing 1000 docs/sec',
    },

    apiDesign: {
      description: 'Embedding API for real-time single-document embedding; pipeline management API for batch jobs and model deployment; served from a stateless embedding service with GPU pools',
      endpoints: [
        { method: 'POST', path: '/api/embed', params: '{ text, model_version?, normalize: bool }', response: '{ embedding: float[], model_version, dim, latency_ms }', description: 'Embed a single document or query; returns L2-normalized vector; used for real-time search' },
        { method: 'POST', path: '/api/embed/batch', params: '{ texts: string[], model_version? }', response: '{ embeddings: float[][], model_version }', description: 'Embed a batch of up to 512 documents; more efficient than 512 single calls' },
        { method: 'POST', path: '/api/jobs/batch-embed', params: '{ corpus_uri, output_uri, model_version, resume_from_checkpoint? }', response: '{ job_id, status: "queued" }', description: 'Start a batch embedding job for a large corpus; supports checkpoint-based resumption' },
        { method: 'GET', path: '/api/jobs/{job_id}', params: '', response: '{ status, docs_processed, docs_total, throughput_docs_per_sec, estimated_completion, gpu_utilization }', description: 'Monitor batch job progress' },
        { method: 'POST', path: '/api/models/activate', params: '{ model_version, traffic_percentage }', response: '{ deployment_id }', description: 'Activate a new embedding model for a percentage of real-time traffic; coordinate with index cutover' },
        { method: 'GET', path: '/api/health', params: '', response: '{ embedding_service_latency_p99_ms, batch_job_throughput, index_freshness_seconds, gpu_pool_available }', description: 'Embedding pipeline health check and monitoring endpoint' },
      ],
    },

    dataModel: {
      description: 'Document registry and embedding job state in PostgreSQL; raw embeddings stored in S3 as Parquet files (for batch processing and index rebuilds); live embeddings in Qdrant vector index; content hashes in Redis for deduplication',
      schema: `document_embeddings {
  document_id: varchar(200) PK
  content_hash: varchar(64)        -- SHA-256 of raw text before embedding
  model_version: varchar(100)      -- "text-embedding-3-large-v1"
  embedding_uri: text              -- s3://embeddings/{model}/{doc_id}/vec.npy
  dim: int                         -- 768, 1024, 1536 depending on model
  is_normalized: boolean
  embedded_at: timestamp
  -- Also stored in Qdrant for ANN search
}

batch_embedding_jobs {
  id: uuid PK
  corpus_uri: text
  output_uri: text
  model_version: varchar(100)
  status: enum(queued, running, completed, failed, cancelled)
  docs_total: bigint
  docs_processed: bigint default 0
  last_checkpoint_offset: bigint default 0
  gpu_count: int
  throughput_avg_docs_per_sec: float nullable
  started_at: timestamp
  completed_at: timestamp nullable
  error_message: text nullable
}

embedding_models {
  version: varchar(100) PK
  provider: varchar(50)            -- "openai", "huggingface", "custom"
  model_name: varchar(200)
  dimensions: int
  max_tokens: int
  cost_per_million_tokens: float nullable
  is_active: boolean
  traffic_percentage: int default 0
  deployed_at: timestamp nullable
}`,
      examples: [
        { table: 'batch_embedding_jobs', label: 'A batch embedding job at 60% completion', json: '{ "id": "job-a1b2c3", "corpus_uri": "s3://docs/corpus-v5/", "model_version": "text-embedding-3-large-v1", "status": "running", "docs_total": 1000000000, "docs_processed": 600000000, "last_checkpoint_offset": 600000000, "gpu_count": 32, "throughput_avg_docs_per_sec": 28000, "started_at": "2025-06-01T00:00:00Z" }' },
        { table: 'embedding_models', label: 'New model being canary-deployed at 10% traffic', json: '{ "version": "text-embedding-3-large-v2", "provider": "openai", "dimensions": 1536, "max_tokens": 8191, "is_active": true, "traffic_percentage": 10, "deployed_at": "2025-06-01T14:00:00Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A Python script that reads documents from S3, calls the embedding API for each document one at a time, and writes the resulting vectors to a CSV file. The CSV is then bulk-loaded into a Qdrant collection. No GPU batching, no parallelism, no fault tolerance. Processing 1B documents at 100ms per call (network + API overhead) would take 3 years.',
      problems: [
        'Single-threaded serial embedding is 1000x slower than what is achievable with GPU batching and parallelism',
        'If the script crashes at any point, it restarts from the beginning with no checkpointing',
        'No deduplication — running the script twice embeds every document twice, doubling storage costs',
        'No normalization consistency — if the embedding API is called across multiple runs using slightly different preprocessing, embeddings are not comparable',
        'No model versioning — when the embedding model is updated, there is no record of which documents were embedded with which model version',
        'The bulk-load approach does not support incremental updates — new documents require another full batch job',
      ],
    },

    advancedImplementation: {
      title: 'Distributed GPU Embedding Pipeline with Checkpoint Recovery and Zero-Downtime Model Migration',
      description: 'The batch embedding job is orchestrated by an Apache Spark or Ray application that partitions the document corpus into chunks of 10,000 documents each and distributes chunks to GPU workers. Each worker loads the embedding model into GPU memory once, then processes its assigned chunks in batches of 512 documents (maximizing GPU memory utilization). After each chunk is processed, the worker writes embedding Parquet files to S3 and records the checkpoint offset in Redis. If any worker fails, the orchestrator reassigns its remaining chunks to healthy workers — recovery time is the re-processing of at most one 10,000-document chunk.',
      keyPoints: [
        'GPU batching: embedding a batch of 512 documents uses the same forward pass as embedding 1 — 512x throughput improvement over one-at-a-time calls; optimal batch size is the largest that fits in GPU memory without out-of-memory errors (typically 256-512 for BERT-class models on an A100)',
        'Content hash deduplication: before embedding any document, compute SHA-256 of the normalized text and check Redis for an existing embedding; skip if already present — handles re-ingestion of the same documents from different sources without duplicate embeddings',
        'Checkpoint-based fault tolerance: each worker writes completed chunk IDs to Redis after writing the Parquet output to S3; on restart, the orchestrator skips chunks with a committed checkpoint — at-least-once semantics with deduplication preventing double insertion',
        'L2 normalization consistency: each worker normalizes every embedding immediately after generation using the same NumPy routine before writing to Parquet; cosine similarity in the ANN search is then equivalent to dot product, which ANN libraries (FAISS) execute with SIMD instructions at maximum speed',
        'Model migration strategy: the new model is deployed to a shadow GPU pool and re-embeds the full corpus in parallel; the old model continues serving live queries; a new Qdrant collection is built from the new embeddings in parallel to the old collection; cutover is an atomic config change that switches the real-time embedding service and ANN search to the new model and collection simultaneously; the old collection is kept for 48 hours for rollback',
        'Incremental index update path: new documents ingested via a Kafka stream are embedded by a streaming embedding service (small GPU pool, always on, processes up to 10K docs/sec) and upserted into the live Qdrant collection using its online insertion API — HNSW supports insertion without full rebuild, with a background merge job that optimizes graph connectivity for inserted nodes',
        'Throughput monitoring and autoscaling: each GPU worker reports its throughput (docs/sec) and GPU utilization every 10 seconds; if average GPU utilization drops below 80% (indicating I/O bottleneck from slow S3 reads or small batches), the orchestrator adjusts batch sizes and I/O prefetch settings; if a worker falls behind, the orchestrator splits its remaining work to faster workers',
      ],
      databaseChoice: 'Apache Spark or Ray for distributed batch job orchestration across GPU workers; S3 for intermediate Parquet embedding storage (bulk batch output before index loading) and for long-term archival of all embeddings; Qdrant for the live ANN search index with online insertion support; Redis for chunk checkpoint state, content hash deduplication cache, and real-time throughput monitoring; PostgreSQL for job metadata and model version registry',
      caching: 'Embedding model weights loaded into GPU HBM memory for the duration of the batch job (no per-batch reload); query embedding results cached in Redis for 60 seconds (the same query issued by 100 users simultaneously is embedded once and served from cache); document embeddings cached in Redis for frequently-accessed documents to avoid ANN search for repeated queries',
    },

    tips: [
      'GPU batching is the key throughput multiplier — explain that embedding 512 documents in one forward pass is as fast as embedding 1, making batch size the most important tuning knob',
      'Content hash deduplication is essential at scale — without it, a single document that appears in multiple datasets gets embedded N times, wasting compute and storage',
      'The model migration scenario is the most interesting architectural challenge in an embedding pipeline — describe the shadow population + parallel index + atomic cutover approach clearly',
      'L2 normalization must be enforced at the pipeline level, not left to each consumer — inconsistent normalization produces embeddings that are not comparable across batches',
      'Incremental indexing (online insertion into HNSW) is a weaker guarantee than full rebuild — discuss the tradeoff: HNSW quality degrades slightly with many insertions (graph connectivity is not globally optimal); periodic full rebuilds restore quality',
      'The cost of batch embedding is significant — 1B documents at $0.0001/1K tokens × avg 500 tokens = $50K for one batch embedding run; mention cost optimization strategies (use smaller models for initial recall, large models only for final reranking)',
    ],

    keyQuestions: [
      {
        question: 'How do you migrate a billion-document embedding index from one model to another without downtime?',
        answer: `Why Migration Is Disruptive

When switching from model A (768-dim) to model B (1536-dim):
- Embeddings from model A and model B are NOT comparable — different dimensions, different semantic spaces
- You cannot mix old and new embeddings in the same index
- You must re-embed ALL 1B documents before the new index is useful
- During re-embedding (hours to days), users still need search to work

The Shadow Population Strategy

\`\`\`
Phase 1: Shadow embedding (no user impact)
  - Deploy new embedding model on a shadow GPU pool
  - Run batch embedding job: embed all 1B docs with new model → S3
  - Build a new Qdrant collection: "index_model_B"
  - Old collection "index_model_A" continues serving all traffic
  - New collection is built in parallel, hidden from users
  - Duration: 8 hours for 1B docs on 32 GPUs

Phase 2: Shadow serving (validation, no user impact)
  - Route 0% of user traffic to new index
  - Route 100% of internal test queries to both indices
  - Compare search quality: precision@10 new vs old
  - Run for 24-48 hours; verify new model improves or matches quality
  - Monitor embedding distribution for anomalies

Phase 3: Canary cutover
  - Configure embedding service: 10% of real-time embeddings → model B
  - Configure search router: 10% of queries → index_model_B
  - Monitor: search quality, latency, user engagement metrics
  - Ramp: 10% → 25% → 50% → 100% over 2-4 days

Phase 4: Full cutover (atomic config change)
  - embedding_service.default_model = "model_B"
  - search_router.default_index = "index_model_B"
  - Keep index_model_A alive for 48 hours (rollback window)
  - Delete index_model_A after rollback window expires
\`\`\`

Key risk: during canary, a user may search with model B embedding but get results from index_model_A (if the config is not consistent per request). Solve by: route the SAME model version to BOTH embedding and index lookup for each request — maintain (user_id → model_version) sticky routing during the canary period.`,
      },
      {
        question: 'How do you optimize GPU batch size for maximum throughput vs minimum memory usage?',
        answer: `The GPU Memory Math

For a BERT-large model (340M params) at float16:
\`\`\`
Model weights: 340M params × 2 bytes = 680MB (fixed overhead)
Available for activations: 80GB (A100) - 680MB ≈ 79GB

Per-token activation memory (approx):
  batch_size × seq_length × hidden_dim × num_layers × 2 bytes
  For seq_length=512, hidden_dim=1024, num_layers=24, float16:
  = batch_size × 512 × 1024 × 24 × 2 = batch_size × 25MB

Max batch size (80GB A100): 79GB / 25MB ≈ 3,160 sequences
Practical batch size (leave 20% headroom): ~2,048 sequences
\`\`\`

Throughput vs Memory Tradeoff

\`\`\`
Batch size 1:   1 forward pass = 1 embedding
Batch size 32:  1 forward pass = 32 embeddings (32x throughput)
Batch size 512: 1 forward pass = 512 embeddings (~512x throughput)
Batch size 2048: 1 forward pass = 2048 embeddings (~2048x throughput)

But: latency per batch increases with batch size
  Batch 1:    50ms → 50ms per doc
  Batch 512:  80ms → 0.16ms per doc (312x improvement)
  Batch 2048: 200ms → 0.10ms per doc (500x improvement)
\`\`\`

Adaptive Batch Sizing

\`\`\`python
def find_optimal_batch_size(model, gpu_memory_gb, target_utilization=0.85):
    # Binary search for max batch that fits in memory
    lo, hi = 1, 4096
    while lo < hi:
        mid = (lo + hi + 1) // 2
        try:
            test_batch = torch.randn(mid, 512, device='cuda')
            model.encode(test_batch)
            lo = mid
        except torch.cuda.OutOfMemoryError:
            hi = mid - 1
        torch.cuda.empty_cache()
    return int(lo * target_utilization)  # Leave headroom
\`\`\`

Variable-length documents: pack documents into batches by total token count (not document count) using a dynamic batching algorithm — prevents one long document from forcing the rest of the batch to be tiny due to padding.`,
      },
    ],

    keyDecisions: [
      'Apache Spark vs Ray vs custom Kubernetes job orchestration for distributed embedding — chose Ray because it provides actor-based GPU worker management, automatic failure recovery, and native support for heterogeneous GPU hardware without the JVM overhead of Spark',
      'Store raw embeddings in S3 Parquet vs load directly into Qdrant from GPU workers — chose S3 Parquet as intermediate storage because it provides a durable checkpoint that survives cluster failures, enables re-loading the index without re-embedding, and decouples embedding speed from index insertion speed',
      'HNSW (Qdrant) vs IVF-PQ (FAISS flat file) for the ANN index — chose HNSW for production serving because it supports online insertion without rebuild, provides better recall at low latency, and Qdrant\'s implementation is production-hardened; IVF-PQ is used as a compressed offline archive for billion-scale datasets where memory cost is the constraint',
      'Shadow population strategy vs in-place model migration — chose shadow population because in-place migration requires a maintenance window or mixed-model index; shadow population allows validation before cutover with instant rollback capability',
      'Redis for deduplication cache vs PostgreSQL — chose Redis because the deduplication check is on the hot ingestion path (10K docs/sec); a SHA-256 hash lookup in Redis is sub-millisecond; PostgreSQL would add 1-5ms per document for the same lookup, creating a bottleneck at 10K docs/sec',
    ],
  },
];
