// AI System Design Problems — Tier D and E

export const aiProblems3Categories = [
  { id: 'ai-ml', name: 'AI & Machine Learning', icon: 'cpu', color: '#7c3aed' },
];

export const aiProblems3CategoryMap = {
  'sentiment-analysis': 'ai-ml',
  'video-understanding': 'ai-ml',
  'ai-surveillance': 'ai-ml',
  'ai-product-recommendation': 'ai-ml',
  'resume-screening': 'ai-ml',
  'healthcare-ai-triage': 'ai-ml',
  'ai-flashcard': 'ai-ml',
  'music-generation': 'ai-ml',
  'ai-art-generation': 'ai-ml',
  'npc-dialogue': 'ai-ml',
  'ocr-system': 'ai-ml',
  'ai-agriculture-advisory': 'ai-ml',
};

export const aiProblems3Designs = [
  // ─── 1. Sentiment Analysis ──────────────────────────────────────────────────
  {
    id: 'sentiment-analysis',
    isNew: true,
    title: 'Sentiment Analysis System',
    subtitle: 'Brand Monitoring / Social Listening / Review Analysis',
    icon: 'layers',
    color: '#f59e0b',
    difficulty: 'Medium',
    description: 'Design a real-time sentiment analysis platform that ingests social media and review content, classifies sentiment at the aspect level, and surfaces actionable brand health signals.',

    introduction: `Sentiment analysis sits at the intersection of NLP, streaming data pipelines, and business intelligence. Unlike a simple positive/negative classifier, a production system must handle aspect-based sentiment — a phone review can be negative about battery life while positive about the camera, and treating the whole review as one sentiment destroys signal value for product teams.

At the scale of brand monitoring, you are ingesting millions of posts per hour from Twitter, Reddit, news sites, and review platforms. The streaming pipeline must detect a sudden sentiment shift within minutes — not hours — so PR teams can respond before a crisis spirals. This requires low-latency ML inference embedded directly in the stream processor, not a nightly batch job.

The business users of this system — marketing, product, and support — are not data scientists. They need dashboards showing trend lines, threshold-based alerts, and drill-down into the raw source posts. The system must be accurate enough to trust for business decisions yet explainable enough to debug when the model makes obvious errors.

Building this system teaches the candidate about streaming ML inference, aspect extraction, entity disambiguation (multiple brands with similar names), and the feedback loop between human review of misclassified samples and model retraining.`,

    functionalRequirements: [
      'Ingest posts from Twitter, Reddit, news APIs, and review platforms in real time',
      'Classify overall sentiment as positive, negative, neutral, or mixed per document',
      'Extract aspects (product features, service dimensions) and assign sentiment per aspect',
      'Identify which brand or product entity is being mentioned within each post',
      'Aggregate sentiment scores into time-series metrics per brand or entity',
      'Alert stakeholders when sentiment drops below a configurable threshold within a rolling window',
      'Support bulk historical ingestion for trend analysis and model backtesting',
      'Provide a query API for downstream dashboards and BI tools',
    ],

    nonFunctionalRequirements: [
      'End-to-end latency from post publish to dashboard update under 60 seconds',
      'Throughput of at least 100,000 posts per minute at peak',
      'Model inference latency under 20ms per document on CPU for real-time path',
      'Dashboard query response under 500ms for pre-aggregated metrics',
      '99.5% availability for the ingestion pipeline',
      'Support at least 50 languages with language-specific models',
    ],

    estimation: {
      users: '500 enterprise customers, each monitoring 10–50 brand keywords, 10,000 analyst users querying dashboards',
      storage: '~2KB avg per post * 100M posts/day = ~200GB/day raw; aggregated metrics ~5GB/day; 90-day retention = ~18TB total',
      bandwidth: '~200GB/day ingest from social APIs; dashboard queries ~50GB/day outbound',
      qps: '~1,200 posts/sec average, 10,000/sec peak; dashboard queries ~500 QPS',
    },

    apiDesign: {
      description: 'REST API for submitting text, querying sentiment results, and managing alert rules',
      endpoints: [
        { method: 'POST', path: '/api/v1/analyze', params: '{ text, language?, entities[], aspects[] }', response: '{ sentiment, score, aspects[{name, sentiment, score}], entities[{name, type}] }', description: 'Synchronous single-document sentiment analysis for ad-hoc queries' },
        { method: 'POST', path: '/api/v1/analyze/batch', params: '{ documents[{id, text}], callback_url }', response: '{ job_id, estimated_seconds }', description: 'Async batch analysis; results posted to callback_url on completion' },
        { method: 'GET', path: '/api/v1/metrics', params: 'entity_id, start, end, granularity=hour, aspect?', response: '{ series[{timestamp, score, volume, breakdown}] }', description: 'Time-series sentiment metrics for a brand entity with optional aspect filter' },
        { method: 'POST', path: '/api/v1/alerts', params: '{ entity_id, threshold, window_minutes, channel }', response: '{ alert_id }', description: 'Create a threshold alert rule for a brand entity' },
        { method: 'GET', path: '/api/v1/posts', params: 'entity_id, sentiment?, start, end, limit, cursor', response: '{ posts[], next_cursor }', description: 'Paginated list of raw posts matching filters for drill-down investigation' },
      ],
    },

    dataModel: {
      description: 'Raw posts, sentiment results, entity registry, and aggregated time-series metrics',
      schema: `posts {
  id: varchar(64) PK           -- platform:platform_post_id
  platform: enum(twitter, reddit, news, review)
  text: text
  language: varchar(10)
  author_id: varchar(128)
  published_at: timestamp
  ingested_at: timestamp
  -- Partitioned by published_at date
}

sentiment_results {
  post_id: varchar(64) FK
  overall_sentiment: enum(positive, negative, neutral, mixed)
  overall_score: float           -- -1.0 to 1.0
  aspects: jsonb                 -- [{name, sentiment, score, span}]
  entities: jsonb                -- [{id, name, type, confidence}]
  model_version: varchar(32)
  processed_at: timestamp
}

entities {
  id: uuid PK
  name: varchar(256)
  aliases: text[]               -- alternate spellings and abbreviations
  type: enum(brand, product, person, topic)
  org_id: uuid FK               -- which customer owns this entity definition
}

sentiment_metrics {
  entity_id: uuid FK
  bucket: timestamp             -- truncated to granularity (hour/day)
  granularity: enum(hour, day)
  avg_score: float
  post_count: int
  positive_count: int
  negative_count: int
  neutral_count: int
  aspect_breakdown: jsonb
  -- Unique on (entity_id, bucket, granularity)
}`,
      examples: [
        { table: 'sentiment_results', label: 'Aspect-level result for a phone review', json: `{ "post_id": "review:B09G3HRMVB:104", "overall_sentiment": "mixed", "overall_score": -0.12, "aspects": [{"name": "battery_life", "sentiment": "negative", "score": -0.78, "span": "battery drains in 4 hours"}, {"name": "camera", "sentiment": "positive", "score": 0.82, "span": "photos look stunning"}], "entities": [{"id": "ent-001", "name": "Pixel 9 Pro", "type": "product", "confidence": 0.97}], "model_version": "absa-v3.2", "processed_at": "2025-05-01T14:22:10Z" }` },
        { table: 'sentiment_metrics', label: 'Hourly aggregate for a brand', json: `{ "entity_id": "ent-001", "bucket": "2025-05-01T14:00:00Z", "granularity": "hour", "avg_score": 0.23, "post_count": 4821, "positive_count": 2810, "negative_count": 890, "neutral_count": 1121, "aspect_breakdown": {"camera": 0.71, "battery_life": -0.34, "price": 0.18} }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A cron job polls social APIs every 5 minutes, runs each post through a single sentiment classification model, stores results in PostgreSQL, and a nightly job computes aggregate metrics for the dashboard.',
      problems: [
        '5-minute polling introduces up to 10-minute lag — crisis alerts arrive far too late',
        'Single sentiment label per document misses aspect-level signals that product teams need',
        'Nightly aggregation means dashboards show yesterday\'s data, not today\'s trend',
        'No entity disambiguation — mentions of "Apple" the company and "apple" the fruit get mixed together',
        'Single model handles all languages poorly — accuracy degrades sharply for non-English content',
        'No feedback loop — model errors are never surfaced for retraining',
      ],
    },

    advancedImplementation: {
      title: 'Streaming ABSA Pipeline with Entity Disambiguation and Adaptive Alerting',
      description: 'Social API webhooks and RSS feeds push to Kafka. A Flink job performs language detection, entity linking, and routes documents to language-specific aspect-based sentiment models running on a model serving cluster. Results are written to Cassandra for post-level storage and to ClickHouse for real-time metric aggregation. Alert rules are evaluated per-bucket by a Flink CEP (complex event processing) job that triggers PagerDuty or Slack webhooks when thresholds are crossed.',
      keyPoints: [
        'Webhook-first ingestion with Kafka as the backbone eliminates polling lag and gives at-least-once delivery with offset tracking',
        'Language detection runs in under 2ms using FastText; routes to one of 10 language-specific ABSA models to maintain accuracy across languages',
        'Entity linking uses a combination of string matching against the entity alias table and a small NER model to distinguish brand mentions from homonyms',
        'Aspect-based sentiment analysis (ABSA) uses a fine-tuned BERT variant with aspect category prompting; extracts both the aspect name and the opinion span from the text',
        'ClickHouse materialized views pre-aggregate metrics at hourly and daily granularity; dashboard queries hit pre-computed results for sub-100ms response',
        'Flink CEP evaluates sliding-window alert rules in-stream — a 10% drop in score over 30 minutes triggers an alert with the top negative posts attached as evidence',
        'Human review queue surfaces random samples and low-confidence predictions to analysts; corrections feed back to weekly fine-tuning runs',
      ],
      databaseChoice: 'Kafka for ingestion stream; Apache Flink for stream processing; Cassandra for raw post and sentiment result storage (high write throughput, time-series access pattern); ClickHouse for metric aggregation and dashboard queries (columnar, fast aggregation); PostgreSQL for entity registry and alert rules; Redis for deduplication bloom filter',
      caching: 'Redis bloom filter for deduplication (reject already-seen post IDs before Kafka); ClickHouse materialized views as the primary cache for dashboard metrics; entity alias lookup cached in Flink operator state to avoid DB round trips per document',
    },

    tips: [
      'Clarify whether the interviewer wants document-level or aspect-level sentiment — they test very different system designs',
      'Lead with the streaming pipeline architecture before the ML model details — most candidates jump to the model and forget the ingestion and aggregation layers',
      'Discuss entity disambiguation early — it is a harder problem than sentiment classification and interviewers appreciate candidates who raise it',
      'Mention the feedback loop between human review and model retraining — it shows you think about production ML, not just model accuracy in a notebook',
      'Alert fatigue is a real concern — explain how you would use a minimum volume threshold to suppress alerts on low-traffic entities with noisy sentiment',
      'ClickHouse vs ElasticSearch is a common design tradeoff here — ClickHouse wins for metric aggregation; ElasticSearch wins if you need full-text post search',
    ],

    keyQuestions: [
      {
        question: 'How does aspect-based sentiment analysis work, and how is it different from standard sentiment classification?',
        answer: `**Standard sentiment classification** assigns a single label (positive/negative/neutral) to an entire document. It cannot distinguish "I love the screen but hate the battery" — the overall score might average out to neutral, losing both signals.

**Aspect-Based Sentiment Analysis (ABSA)** identifies:
1. **Aspect categories** — what feature is being discussed (battery_life, screen, price, customer_service)
2. **Opinion polarity per aspect** — positive, negative, or neutral for each aspect found

**How it works (modern approach)**:
\`\`\`
Input: "The camera is stunning but battery drains in 4 hours."

Step 1 — Aspect detection:
  Span: "camera" → category: CAMERA
  Span: "battery drains" → category: BATTERY_LIFE

Step 2 — Polarity classification per aspect:
  CAMERA: "is stunning" → positive (0.88)
  BATTERY_LIFE: "drains in 4 hours" → negative (-0.76)

Output: [{aspect: "camera", sentiment: "positive"}, {aspect: "battery_life", sentiment: "negative"}]
\`\`\`

**Training approach**: Fine-tune a BERT-class model with aspect-category prompting — prepend "[ASPECT: battery_life]" to the text, then classify polarity. Train one classifier that handles all aspects via the prompt, rather than one model per aspect.

**Why this matters for the system design**: ABSA outputs are significantly richer than document-level scores, which drives the data model (jsonb aspects array per result), the aggregation schema (aspect_breakdown in metrics), and the dashboard UI. Candidates who raise ABSA early signal product thinking, not just NLP implementation.`,
      },
      {
        question: 'How do you detect a sentiment crisis in real time while avoiding false alarms?',
        answer: `**The naive alert**: "alert when score drops below X" produces too many false alarms — a single viral negative post can spike the volume temporarily, then recover. A threshold on absolute score triggers at the wrong moment.

**Better approach: Flink CEP sliding-window alert**:
\`\`\`
Rule: "score drops by more than 15 percentage points compared to the 7-day baseline
       AND post volume is above 500 in the past hour
       AND condition persists for at least 20 minutes"
\`\`\`

**Components**:
- **Baseline computation**: 7-day rolling average score per entity, pre-computed by the hourly aggregation job
- **Flink CEP pattern**: sliding window of 20 minutes; evaluate score vs baseline on each new metric bucket; alert only if the drop persists (not a spike-and-recover)
- **Volume gating**: suppress alerts for entities with fewer than N posts per hour — small volumes make sentiment scores noisy and unreliable
- **Deduplication**: a single crisis generates many individual negative posts; deduplicate alerts by entity + time window so the same crisis does not fire 50 alerts

**Alert payload**: Include the delta (score before vs now), top 5 negative posts driving the shift, and a link to the drill-down dashboard. Ops teams need context, not just a number.

**Suppression window**: After an alert fires, suppress re-alerts on the same entity for 2 hours unless the severity increases — prevents alert fatigue during an ongoing crisis.`,
      },
      {
        question: 'How do you handle entity disambiguation when multiple brands have similar names?',
        answer: `**The problem**: A post mentioning "Apple" could be about Apple Inc., an apple orchard, or the FANG stock ticker. A post mentioning "Delta" could be Delta Air Lines, Delta Dental, or the COVID variant.

**Three-layer disambiguation**:

**Layer 1 — String matching against alias table**:
- Each entity has a curated list of aliases: ["Apple", "Apple Inc.", "AAPL", "$AAPL", "Apple Computer"]
- Exact match against this list returns high-confidence attribution (confidence > 0.9)
- Fast: O(1) hash lookup; covers ~70% of mentions

**Layer 2 — Context-based NER model**:
- For ambiguous matches, a lightweight NER model classifies entity type: ORG vs PRODUCT vs LOCATION vs OTHER
- Input: post text + surrounding context window
- "Apple released a new iPhone" → ORG (Apple Inc.)
- "I picked a fresh apple from the tree" → OTHER (not a brand mention)

**Layer 3 — Embedding similarity**:
- For long-tail or misspelled mentions, compute embedding similarity against pre-computed entity embeddings
- "Appel stock surged" → closest entity: Apple Inc. (spelling error)
- Threshold: only attribute if similarity > 0.85 to avoid false positives

**Multi-entity posts**: A single post can mention multiple entities ("Comparing Apple and Samsung cameras"). Extract all entities independently, then split the sentiment analysis into per-entity attribution using dependency parsing to identify which opinion spans relate to which entity.`,
      },
    ],

    keyDecisions: [
      'Webhook ingestion vs polling — chose webhooks because polling introduces 5-10 minute lag that makes crisis detection useless; webhooks reduce lag to under 60 seconds',
      'Aspect-level vs document-level sentiment — chose aspect-level because product teams need feature-specific signals; document-level averages out opposing sentiments and destroys value',
      'ClickHouse vs PostgreSQL for metrics — chose ClickHouse because dashboard queries aggregate billions of rows across time ranges; ClickHouse columnar storage is 100x faster for this pattern',
      'Language-specific models vs multilingual model — chose language-specific because multilingual models (mBERT, XLM-R) underperform by 8-15% on non-English ABSA; separate models per language group maintain quality',
      'Flink CEP vs periodic batch alerts — chose Flink CEP because batch alerting on 5-minute windows introduces too much lag; Flink evaluates conditions continuously as new metric buckets arrive',
    ],
  },

  // ─── 2. Video Understanding ─────────────────────────────────────────────────
  {
    id: 'video-understanding',
    isNew: true,
    title: 'Video Understanding System',
    subtitle: 'YouTube Auto-Chapters / TikTok Scene Detection / Surveillance Analytics',
    icon: 'cpu',
    color: '#ef4444',
    difficulty: 'Medium',
    description: 'Design a video understanding platform that extracts semantic structure from video — scenes, objects, actions, transcripts, and chapters — to power search, recommendation, and content moderation at scale.',

    introduction: `Video is the fastest-growing content format on the internet, yet it remains largely opaque to machines. A text document can be indexed by keyword search in milliseconds; a one-hour video requires complex temporal reasoning to answer even simple questions like "what happens in the first ten minutes" or "find all scenes where someone mentions pricing."

Video understanding systems decompose this challenge into a pipeline: frame extraction, scene boundary detection, per-frame visual understanding (objects, faces, text in frame), audio transcription, and temporal alignment that ties all signals together into a structured representation of the video. Each stage has different compute requirements — scene detection is cheap and runs on CPU, while action recognition requires GPU inference at high temporal resolution.

The scale challenge is severe. YouTube ingests 500 hours of video per minute. Processing every frame of every video with expensive models is economically infeasible. The system must make intelligent decisions about sampling rates, which models to run on which content, and how to route content to different processing tiers based on predicted value (a verified creator's new video gets faster processing than an obscure upload).

For interviewers, this problem tests knowledge of asynchronous job pipelines, ML model selection and cost optimization, streaming vs batch processing tradeoffs, and how to build index structures that support downstream applications like search and recommendation.`,

    functionalRequirements: [
      'Process uploaded videos to extract scene boundaries and timestamps',
      'Recognize objects, faces, and on-screen text in representative frames',
      'Transcribe speech to text with word-level timestamps and speaker labels',
      'Classify video content into topics and categories for recommendation routing',
      'Generate automatic chapter titles aligned to scene changes and topic shifts',
      'Support video search queries such as "find the segment about database indexing"',
      'Flag potentially policy-violating content for moderation review',
      'Export structured metadata (scenes, transcript, entities) via API for downstream consumers',
    ],

    nonFunctionalRequirements: [
      'Process a 10-minute video within 3 minutes of upload completion',
      'Support 50,000 concurrent video processing jobs during peak upload periods',
      'Video search query response under 300ms for indexed content',
      'Transcript accuracy above 90% word error rate on clean speech',
      '99.9% job completion rate with automatic retry on transient failures',
    ],

    estimation: {
      users: '50M content creators uploading 10M videos/day; 2B viewers searching and watching',
      storage: '10M videos/day * 200MB avg compressed = ~2PB/day for video; metadata and transcripts ~5GB/day',
      bandwidth: '2PB/day ingest; ~100TB/day metadata reads for search and recommendation APIs',
      qps: '~115 video uploads/sec; ~50,000 search queries/sec on video content index',
    },

    apiDesign: {
      description: 'REST API for job submission and retrieval of video understanding results',
      endpoints: [
        { method: 'POST', path: '/api/v1/videos/{video_id}/process', params: '{ tiers: ["scene", "transcript", "objects", "chapters"] }', response: '{ job_id, estimated_seconds }', description: 'Submit a video for processing; specify which understanding tiers to run' },
        { method: 'GET', path: '/api/v1/videos/{video_id}/metadata', params: '', response: '{ scenes[], transcript{segments[]}, chapters[], entities[], categories[], moderation_flags[] }', description: 'Retrieve all extracted metadata for a processed video' },
        { method: 'GET', path: '/api/v1/videos/{video_id}/transcript', params: 'format=json|vtt|srt', response: '{ segments[{start_ms, end_ms, speaker, text, words[]}] }', description: 'Retrieve timestamped transcript with word-level alignment' },
        { method: 'POST', path: '/api/v1/search', params: '{ query, filters: {category?, duration_range?}, cursor }', response: '{ results[{video_id, title, matched_segment, timestamp_ms, score}], next_cursor }', description: 'Semantic search over video content using transcript and visual embeddings' },
        { method: 'GET', path: '/api/v1/jobs/{job_id}', params: '', response: '{ status, progress_pct, completed_tiers[], error? }', description: 'Poll job status for progress tracking' },
      ],
    },

    dataModel: {
      description: 'Videos, processing jobs, extracted scenes, transcripts, and search indexes',
      schema: `videos {
  id: varchar(64) PK
  uploader_id: bigint FK
  duration_seconds: int
  resolution: varchar(16)
  upload_completed_at: timestamp
  processing_status: enum(pending, processing, completed, failed)
  priority: enum(high, normal, low)
}

video_scenes {
  id: uuid PK
  video_id: varchar(64) FK
  start_ms: int
  end_ms: int
  scene_index: int
  keyframe_url: varchar(512)
  visual_labels: jsonb        -- top object/scene labels with confidence
  embedding: vector(768)      -- CLIP embedding of keyframe for visual search
}

transcript_segments {
  id: uuid PK
  video_id: varchar(64) FK
  start_ms: int
  end_ms: int
  speaker_label: varchar(32)
  text: text
  words: jsonb                -- [{word, start_ms, end_ms, confidence}]
  embedding: vector(768)      -- text embedding for semantic search
}

video_chapters {
  id: uuid PK
  video_id: varchar(64) FK
  start_ms: int
  title: varchar(256)
  chapter_index: int
}`,
      examples: [
        { table: 'video_scenes', label: 'Scene with visual labels and embedding', json: `{ "id": "sc-001", "video_id": "yt-dQw4w9WgXcQ", "start_ms": 42000, "end_ms": 58500, "scene_index": 3, "keyframe_url": "https://cdn.example.com/frames/dQw4w9WgXcQ/sc-001.jpg", "visual_labels": [{"label": "person", "confidence": 0.98}, {"label": "stage", "confidence": 0.91}, {"label": "microphone", "confidence": 0.87}], "embedding": "[0.023, -0.041, ...]" }` },
        { table: 'transcript_segments', label: 'Transcript segment with word alignment', json: `{ "id": "ts-047", "video_id": "yt-dQw4w9WgXcQ", "start_ms": 42100, "end_ms": 45300, "speaker_label": "SPEAKER_0", "text": "So let me show you how database indexing works", "words": [{"word": "database", "start_ms": 43200, "end_ms": 43650, "confidence": 0.99}] }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A worker pool pulls video jobs from a queue, downloads each video, runs sequential analysis steps (FFmpeg for frames, Whisper for transcript, ResNet for object detection), and writes results to a relational database. Creators wait for a single processing result.',
      problems: [
        'Sequential processing means a 60-minute video occupies a worker for 30+ minutes, blocking other jobs',
        'Running heavy models (Whisper, object detection) on every frame of every video is extremely expensive and slow',
        'No priority system — a breaking news video from a major channel waits behind obscure uploads',
        'Transcript and visual processing cannot run in parallel on the same worker, wasting GPU idle time',
        'Single database table for all extracted data does not support efficient semantic search at scale',
      ],
    },

    advancedImplementation: {
      title: 'Tiered Parallel Processing Pipeline with Adaptive Sampling',
      description: 'Videos enter a priority queue on upload. A scene detection service runs first (fast, CPU-only) and splits the video into scenes. Each scene becomes an independent unit of work, enabling parallel processing across a GPU cluster. Transcript extraction (Whisper) and visual analysis (CLIP + object detection) run in parallel per scene. Chapter generation uses an LLM that receives the completed transcript and scene labels. Embeddings for scenes and transcript segments are indexed in a vector store for semantic search.',
      keyPoints: [
        'Scene-first decomposition enables scene-level parallelism — 100 scenes in a video become 100 independent jobs that saturate a GPU cluster rather than occupying one worker serially',
        'Adaptive frame sampling: sample 1 frame per second for action-dense content, 1 frame per 5 seconds for talking-head content detected by the scene classifier — 5x cost reduction',
        'Priority tiers: verified creator or trending upload goes to high-priority queue; new creator upload goes to normal queue processed within SLA; historical backfill goes to low-priority spot-instance pool',
        'Transcript and visual processing run on separate GPU pools optimized for each workload: Whisper on A10 GPUs (memory bandwidth bound), CLIP on T4s (compute bound)',
        'Embedding index (pgvector or Weaviate) stores scene and transcript segment embeddings; semantic search at query time retrieves the top-K segments matching the query embedding, then re-ranks with a cross-encoder',
        'Chapter generation calls an LLM once per video with the full transcript and scene labels as context — this runs after all other tiers complete and requires only a single API call per video',
      ],
      databaseChoice: 'S3 for raw video and keyframe storage; PostgreSQL for job tracking and video metadata; Cassandra or DynamoDB for high-volume scene and transcript records (write-heavy, time-series access); pgvector or Weaviate for embedding-based search; Elasticsearch for keyword-based transcript search; Redis for job queue and worker coordination',
      caching: 'CDN for keyframe images served to dashboard and player; Redis for hot video metadata (trending videos queried millions of times per day); pre-computed chapter and scene data cached at the CDN edge for popular videos; query result cache in Redis for repeated identical search queries',
    },

    tips: [
      'Start by clarifying the primary use case — search, recommendation, or moderation — because it changes which processing tiers are highest priority',
      'Adaptive sampling is a key insight interviewers look for — explain why you would not process every frame and how you decide the sampling rate',
      'The scene decomposition into parallel units is the central architectural insight for meeting latency SLAs — lead with it',
      'Discuss the two-stage search architecture: fast ANN search for candidate retrieval, cross-encoder reranking for precision — this pattern is common across ML-powered search systems',
      'Mention chapter generation as the one step that requires the full video to be processed first — it creates a natural dependency graph in your job DAG',
      'Cost optimization is often the follow-up question: spot instances for low-priority jobs, CPU-only processing for scene detection, and batching short videos together to reduce GPU startup overhead',
    ],

    keyQuestions: [
      {
        question: 'How do you detect scene boundaries efficiently without processing every frame?',
        answer: `**Scene boundary detection** identifies moments where the visual content changes significantly — a cut from an interview to a chart, or a transition between speakers.

**Efficient approach — histogram difference**:
\`\`\`
Sample 1 frame per second (not every frame at 30fps)
For each pair of consecutive frames:
  Compute per-channel color histogram
  Compute histogram intersection distance
  If distance > threshold → scene boundary

Cost: ~1/30th of processing every frame
Accuracy: detects ~85% of hard cuts
\`\`\`

**Handling gradual transitions** (fades, dissolves):
- Hard cuts: single large distance spike
- Fades: sustained distance increase over multiple frames
- Use a sliding window detector to distinguish spike (cut) from sustained rise (fade)

**ML-based refinement**:
- Run a lightweight CNN (MobileNet-class) on boundary candidates to confirm they are real transitions vs camera flash or motion blur
- Only run the expensive model on the ~5% of frames flagged by the histogram detector

**Practical parameters**:
- 1 frame/second gives second-level precision, sufficient for chapters
- 2 frames/second for sports or action content (faster cuts)
- Threshold tuned per content category: music videos have many fast cuts; lectures have few

This two-stage approach (cheap detector → expensive confirmer) reduces GPU cost by ~20x compared to running the CNN on all frames.`,
      },
      {
        question: 'How do you implement semantic video search — a user types "explain indexing" and gets the right 30-second segment?',
        answer: `**The challenge**: Video content is not naturally indexed for text search. The solution is to build a segment-level embedding index over transcripts and visual labels.

**Offline indexing (at processing time)**:
\`\`\`
For each transcript segment (e.g., 30-second chunks):
  1. Embed the segment text with a text encoder (e.g., E5-large or OpenAI embeddings)
  2. Embed the keyframe visual labels concatenated with surrounding context
  3. Store both embeddings in a vector index (Weaviate or pgvector)
  4. Record (video_id, start_ms, end_ms) as the payload
\`\`\`

**Online search (at query time)**:
\`\`\`
Query: "explain database indexing"
  Step 1 — Embed query: encode query text with the same text encoder
  Step 2 — ANN search: retrieve top-50 candidate segments by cosine similarity
  Step 3 — Re-rank: run a cross-encoder (BERT fine-tuned for relevance) on query + each candidate text
  Step 4 — Deduplicate: if multiple segments from the same video are in top-5, keep only the highest
  Step 5 — Return: (video_id, title, start_ms, matched_text, score)
\`\`\`

**Hybrid search** (often better than pure semantic):
- Run BM25 keyword search and vector semantic search in parallel
- Merge results using Reciprocal Rank Fusion (RRF)
- Keyword search catches exact term matches ("B-tree index") that semantic search might miss

**Latency breakdown**:
- Query embedding: ~10ms (GPU)
- ANN retrieval from vector index: ~20ms
- Cross-encoder re-ranking (top 50): ~80ms on GPU
- Total: ~110ms — within the 300ms budget`,
      },
      {
        question: 'How do you generate video chapters automatically?',
        answer: `**Automatic chapter generation** identifies natural topic boundaries and creates titled segments that help viewers navigate long videos.

**Inputs available after other tiers complete**:
- Full timestamped transcript
- Scene list with visual labels per scene
- Topic classification per scene

**Approach — LLM with structured context**:
\`\`\`
Prompt (simplified):
  "Here is a transcript of a video with scene timestamps and labels.
   Identify 5-8 major topic shifts and generate a short chapter title for each.
   Return JSON: [{start_ms: int, title: string}]"

Context injected:
  - Transcript segments with timestamps (truncated to fit context window)
  - Per-scene visual labels ("slide: database architecture diagram")
  - Detected topic segments from topic model

Output:
  [{start_ms: 0, title: "Introduction"},
   {start_ms: 142000, title: "What is Database Indexing?"},
   {start_ms: 389000, title: "B-Tree vs Hash Index Comparison"},
   ...]
\`\`\`

**For long videos (> 2 hours)**:
- Context window exceeded → hierarchical summarization
- Split into 20-minute chunks, generate sub-chapters per chunk
- Second LLM call merges sub-chapters into top-level chapters

**Quality signals**:
- Chapter titles that are too generic ("Introduction", "Conclusion") are penalized
- Use ROUGE similarity against transcript text to ensure titles are grounded in content
- A/B test: auto-generated chapters vs creator-written chapters for viewer engagement`,
      },
    ],

    keyDecisions: [
      'Scene-level job decomposition vs whole-video processing — chose scene-level because it enables parallelism across the GPU cluster; a 100-scene video saturates 100 workers simultaneously',
      'Adaptive frame sampling vs uniform sampling — chose adaptive because action content requires 2fps for accuracy while lecture content needs only 0.2fps; fixed rate either wastes compute or misses cuts',
      'Vector search vs keyword search for video — chose hybrid (BM25 + vector) because keyword search catches exact technical terms, vector search catches semantic variations; RRF fusion outperforms either alone',
      'LLM for chapter generation vs rule-based topic segmentation — chose LLM because topic boundary rules require manual tuning per content category; LLM generalizes across genres with a single prompt',
      'Cassandra vs PostgreSQL for transcript storage — chose Cassandra because at 10M videos/day with 500 segments each, write throughput exceeds what a single PostgreSQL cluster can handle; Cassandra scales horizontally',
    ],
  },

  // ─── 3. AI Surveillance ─────────────────────────────────────────────────────
  {
    id: 'ai-surveillance',
    isNew: true,
    title: 'AI Surveillance System',
    subtitle: 'Retail Analytics / Smart City / Security Camera AI',
    icon: 'shield',
    color: '#dc2626',
    difficulty: 'Medium',
    description: 'Design an AI-powered surveillance platform that processes video feeds from thousands of cameras in real time to detect anomalies, recognize events, and trigger alerts while respecting privacy regulations.',

    introduction: `AI surveillance sits at the uncomfortable intersection of powerful computer vision technology and serious civil liberties concerns. A well-designed system can meaningfully improve safety in high-risk environments — detecting shoplifting in retail, identifying abandoned packages in transit hubs, or tracking crowd density to prevent stampedes at events. A poorly designed system can enable mass surveillance, racial profiling, and chilling effects on public behavior.

The engineering challenge is formidable independent of the ethical dimensions. Processing 1,000 camera streams at 30 frames per second is 30,000 frames per second — far too much for centralized GPU clusters to handle economically. The solution requires edge computing: lightweight models run on-camera or on nearby edge devices for initial filtering, and only events (not raw video) are sent to the cloud. This edge-first architecture is both economically necessary and privacy-enhancing.

The system must handle a diversity of environments — indoor retail lighting vs outdoor nighttime parking lots vs crowded public spaces — with dramatically different visual conditions. Model robustness across these conditions, combined with calibration of false positive rates per environment, is a core technical challenge that separates research-grade models from production-ready systems.

Regulatory compliance is non-negotiable in most jurisdictions. GDPR requires purpose limitation, data minimization, and the right to erasure. Some states ban facial recognition entirely. The system architecture must support configurable privacy modes — blurring faces in non-security zones, automatic deletion after retention periods, and audit logs of every access to video footage.`,

    functionalRequirements: [
      'Process live video feeds from thousands of IP cameras simultaneously',
      'Detect anomalous events: loitering, abandoned objects, crowd density thresholds, and unauthorized zone entry',
      'Recognize license plates for vehicle management in parking and access control use cases',
      'Track individuals across multiple camera views within a single facility using re-identification',
      'Send real-time alerts to security personnel with annotated video clips as evidence',
      'Store video footage with configurable retention periods per zone and regulatory requirement',
      'Provide analytics dashboards for crowd flow, dwell time, and heat maps for retail and venue operators',
      'Support configurable privacy zones where face detection and tracking are disabled',
    ],

    nonFunctionalRequirements: [
      'Alert latency from event occurrence to notification under 10 seconds',
      'False positive rate for anomaly alerts below 5% after calibration per environment',
      'Support 10,000 simultaneous camera streams without degradation',
      'Video retention storage optimized via event-based archiving — full video only for flagged periods',
      '99.9% uptime for the alert delivery pipeline; camera stream outages should not cascade',
    ],

    estimation: {
      users: '500 enterprise customers (malls, cities, transit authorities), each with 20–2,000 cameras; 5,000 security operators monitoring dashboards',
      storage: '10,000 cameras * 1GB/hour compressed video = 10TB/hour raw; event-based archiving retains only 2% of footage = 200GB/hour; 30-day retention = ~144TB',
      bandwidth: '10,000 streams * 2Mbps (edge-compressed) = 20Gbps inbound; event clips to operators ~100Mbps',
      qps: '10,000 camera streams; ~500 anomaly events/minute requiring alert generation; ~50 operator queries/sec',
    },

    apiDesign: {
      description: 'REST and WebSocket APIs for camera registration, alert streaming, and analytics queries',
      endpoints: [
        { method: 'POST', path: '/api/v1/cameras', params: '{ stream_url, location_id, zone_type, privacy_mode, detection_rules[] }', response: '{ camera_id, edge_agent_config }', description: 'Register a camera and receive edge agent configuration for on-site deployment' },
        { method: 'GET', path: '/api/v1/alerts', params: 'location_id?, event_type?, start, end, status=open|resolved, cursor', response: '{ alerts[{id, camera_id, event_type, timestamp, clip_url, confidence, thumbnail_url}], next_cursor }', description: 'List alerts with optional filters; clip_url is pre-signed S3 URL' },
        { method: 'GET', path: '/api/v1/analytics/heatmap', params: 'location_id, start, end, zone_id?', response: '{ grid[{x, y, dwell_seconds, count}] }', description: 'Crowd heatmap for a location over a time period' },
        { method: 'POST', path: '/api/v1/alerts/{alert_id}/resolve', params: '{ resolution: "true_positive"|"false_positive", notes? }', response: '{ ok }', description: 'Security operator resolves an alert; false-positive labels feed model retraining' },
        { method: 'WS', path: '/ws/v1/alerts/stream', params: 'auth token in header', response: 'stream of {alert_id, event_type, camera_id, timestamp, thumbnail_url}', description: 'WebSocket stream of real-time alerts for operator monitoring dashboard' },
      ],
    },

    dataModel: {
      description: 'Cameras, detection events, alert records, and aggregated analytics',
      schema: `cameras {
  id: uuid PK
  location_id: uuid FK
  stream_url: varchar(512)      -- RTSP or HLS URL
  zone_type: enum(public, restricted, private)
  privacy_mode: enum(full, blur_faces, anonymize)
  detection_rules: jsonb        -- [{rule_type, threshold, zone_polygon}]
  edge_agent_version: varchar(32)
  last_heartbeat_at: timestamp
}

detection_events {
  id: uuid PK
  camera_id: uuid FK
  event_type: varchar(64)       -- loitering, crowd_density, abandoned_object, zone_breach
  detected_at: timestamp
  confidence: float
  bounding_boxes: jsonb         -- [{object_id, class, x1, y1, x2, y2, track_id}]
  clip_s3_key: varchar(512)     -- 30-second clip around event
  thumbnail_s3_key: varchar(512)
  processed_at: timestamp
  -- Partitioned by detected_at date
}

alerts {
  id: uuid PK
  event_id: uuid FK
  status: enum(open, acknowledged, resolved)
  assigned_to: uuid nullable FK
  resolution: enum(true_positive, false_positive) nullable
  created_at: timestamp
  resolved_at: timestamp nullable
}

crowd_analytics {
  location_id: uuid FK
  zone_id: uuid FK
  bucket: timestamp             -- hourly
  avg_count: float
  peak_count: int
  avg_dwell_seconds: float
  entry_count: int
  exit_count: int
}`,
      examples: [
        { table: 'detection_events', label: 'Loitering event with bounding box', json: `{ "id": "evt-a1b2c3", "camera_id": "cam-029", "event_type": "loitering", "detected_at": "2025-05-01T22:14:33Z", "confidence": 0.88, "bounding_boxes": [{"object_id": 1, "class": "person", "x1": 312, "y1": 148, "x2": 467, "y2": 589, "track_id": "T042", "dwell_seconds": 187}], "clip_s3_key": "clips/2025-05-01/evt-a1b2c3.mp4", "thumbnail_s3_key": "thumbs/2025-05-01/evt-a1b2c3.jpg" }` },
        { table: 'crowd_analytics', label: 'Hourly crowd metric for a retail zone', json: `{ "location_id": "loc-mall-01", "zone_id": "zone-food-court", "bucket": "2025-05-01T12:00:00Z", "avg_count": 234, "peak_count": 412, "avg_dwell_seconds": 820, "entry_count": 1840, "exit_count": 1797 }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Each camera streams raw video to a central cloud server. A pool of GPU workers pull frames, run object detection, apply rule checks, and write events to a database. Security operators poll the database for new alerts.',
      problems: [
        'Streaming raw video from 10,000 cameras to cloud requires 20Gbps sustained bandwidth — prohibitively expensive',
        'Cloud GPU processing of every frame at 30fps cannot keep up with the volume without hundreds of GPUs',
        'Alert latency from event to operator notification can exceed 60 seconds due to processing queue depth',
        'No edge filtering means truly anomalous events compete with normal frames for GPU time',
        'Full video stored for all cameras regardless of activity — storage costs scale linearly with camera count',
      ],
    },

    advancedImplementation: {
      title: 'Edge-First Architecture with Cloud Orchestration and Privacy Zones',
      description: 'Each camera site runs an edge agent (NVIDIA Jetson or similar) that performs real-time inference locally. Lightweight models (YOLOv8-nano, MobileNet) run at the edge for object detection and motion filtering. Only detected events — annotated clips of 30 seconds around the anomaly — are uploaded to cloud. The cloud handles re-identification across cameras, alert routing, analytics aggregation, and storage management. Privacy zones are enforced at the edge before any data leaves the site.',
      keyPoints: [
        'Edge inference runs YOLOv8-nano at 15fps on a Jetson Orin NX — detects persons, vehicles, and objects with 90ms latency; only frames with relevant objects are processed further',
        'Motion gating: frames where no motion is detected by a cheap frame differencer are skipped entirely, reducing inference load by 60-80% for static scenes',
        'Privacy enforcement at the edge: face pixels are blurred in the video buffer before the clip is uploaded to cloud; the cloud never receives unblurred footage from privacy zones — compliance is architectural, not procedural',
        'Person re-identification across cameras uses an OSNet-class embedding model: each detected person gets a 512-dimensional appearance embedding; cosine similarity matching tracks the same individual across camera handoffs without storing facial recognition data',
        'Event-based storage: edge agent uploads only 30-second clips around detected events; full continuous video is stored locally on a 72-hour rolling NVR buffer; cloud retains event clips for the configured retention period',
        'Alert routing: events above the confidence threshold publish to a Redis Pub/Sub channel; a notification service fans out to WebSocket connections for the relevant location\'s operators',
        'Operator feedback on false positives flows back as training labels; a weekly fine-tuning run on the edge model improves per-location calibration over time',
      ],
      databaseChoice: 'PostgreSQL for camera registry, alert records, and configuration; TimescaleDB (PostgreSQL extension) for crowd analytics time-series; S3 for event clips and thumbnails; Redis for real-time alert pub/sub and operator presence; local NVR (network video recorder) storage at each site for continuous buffer',
      caching: 'CDN pre-signed URLs for event clip delivery to operators; Redis caching of active alert counts and camera status for dashboard; edge model weights cached locally on Jetson devices — updates pushed during maintenance windows',
    },

    tips: [
      'Lead with the edge-vs-cloud processing split — this is the central architectural decision and interviewers expect you to raise it proactively',
      'Raise privacy compliance early, not as an afterthought — explain that face blurring at the edge is an architectural choice that makes compliance enforceable rather than just a policy',
      'Re-identification is a technical alternative to facial recognition — it tracks people across cameras using appearance (clothing, body shape) rather than biometric face data; know the distinction',
      'False positive rate is more important than detection rate in most use cases — a system that alerts 50 times per hour burns out operators; explain how per-environment calibration addresses this',
      'Event-based storage vs continuous recording is a key cost question — interviewers often ask how you would reduce storage costs and this is the answer',
      'Discuss the feedback loop: operator resolution labels feed retraining, which improves the per-location model — this shows you think about the full production ML lifecycle',
    ],

    keyQuestions: [
      {
        question: 'How does person re-identification work across cameras without using facial recognition?',
        answer: `**The problem**: A shoplifter detected by camera 1 walks off screen. Camera 2 picks up a person nearby. Are they the same person? Without facial recognition, how do you link them?

**Re-identification (Re-ID) approach**:
Re-ID uses full-body appearance features (clothing color, texture, body proportions, gait) rather than face biometrics.

**How it works**:
\`\`\`
Step 1 — Feature extraction (per detected person, per camera):
  Input: cropped bounding box image of person
  Model: OSNet or BoT-Net (lightweight Re-ID model)
  Output: 512-dimensional embedding vector

Step 2 — Gallery management:
  Maintain a gallery of active person embeddings seen in the last 10 minutes
  Each entry: {embedding, camera_id, last_seen_timestamp, track_id}

Step 3 — Cross-camera matching:
  New person detected on camera 2
  Compute cosine similarity against all gallery embeddings
  If best match > 0.85 threshold AND last seen < 5 minutes ago:
    Assign same person_id → link the sightings
  Else:
    New person_id

Step 4 — Temporal filtering:
  Only match against cameras within plausible walking distance
  Camera 1 and camera 2 at opposite ends of building: filter by time needed to walk between them
\`\`\`

**Limitations vs facial recognition**:
- Accuracy degrades when clothing changes or two people have similar appearance
- Works best within a single session (same clothing); does not work across days
- Acceptable for most security use cases; does not meet forensic standards

**Privacy advantage**: Re-ID embeddings cannot be reverse-engineered to reconstruct a face or identify an individual outside the system — GDPR considers this pseudonymous rather than biometric data in most interpretations.`,
      },
      {
        question: 'How do you reduce false positive alerts to avoid operator fatigue?',
        answer: `**The problem**: An uncalibrated loitering detector will alert every time someone waits for a friend, checks their phone, or stands in a queue. 50 false alerts per hour per location means operators stop trusting the system.

**Multi-layer false positive reduction**:

**Layer 1 — Confidence threshold tuning per environment**:
- Retail store: loitering threshold 0.85 (high precision needed)
- Parking lot at night: threshold 0.70 (accept more sensitivity, lower foot traffic)
- Transit hub: suppress loitering alerts near benches (expected behavior)

**Layer 2 — Context-aware rules**:
\`\`\`
Rule: loitering = person in zone for > 5 minutes
Suppression contexts:
  - Near seating areas → suppress
  - Business hours vs after-hours → different thresholds
  - Queue zones → suppress (expected to wait in line)
  - Staff zones → suppress for badged employees
\`\`\`

**Layer 3 — Alert deduplication**:
- Same person loitering generates one alert, not one per minute
- Alert stays open until person leaves the zone or operator resolves it
- Cooldown window: no new alert for same zone within 15 minutes of a resolved false positive

**Layer 4 — Feedback-driven calibration**:
- Operators mark alerts as true/false positive
- After 50 false positives for a specific rule+location, system auto-raises threshold by 0.05
- Weekly fine-tuning run on local false-positive data improves the edge model for that site

**Measurement**: Track precision (TP / (TP+FP)) per location per rule type. Surface to operations manager. Target: above 80% precision per alert type.`,
      },
      {
        question: 'How do you handle the bandwidth cost of 10,000 camera streams?',
        answer: `**Raw cost**:
\`\`\`
10,000 cameras * 5Mbps (1080p30 H.264) = 50Gbps continuous
50Gbps * 3600s/hr * $0.02/GB egress = ~$3.6M/hour in cloud egress alone
\`\`\`
This is obviously infeasible. The solution is edge-first processing.

**Edge filtering reduces bandwidth by ~99%**:
\`\`\`
At the edge (Jetson Orin NX per camera cluster):
  - Motion gating: skip frames with no motion detected → 60-80% frame reduction
  - Object detection: only process frames where relevant objects are found
  - Event detection: only when an anomaly rule fires, start buffering a 30s clip

Upload to cloud:
  - 30-second event clip at 4Mbps = ~90MB per event
  - 5 events/camera/day = 450MB/camera/day
  - 10,000 cameras = 4.5TB/day (vs 50Gbps raw)
  - Bandwidth: ~450Mbps sustained vs 50,000Mbps raw → 99.1% reduction
\`\`\`

**Continuous recording stays local**:
- Full video written to local NVR (72-hour rolling buffer)
- Only accessible by on-site staff with physical access or over authenticated VPN
- If an event requires forensic review of non-flagged footage, operator requests on-site pull

**Heartbeat and health telemetry**:
- Edge agent sends 1KB heartbeat every 30 seconds (camera health, event count, model confidence stats)
- Total telemetry: 10,000 cameras * 1KB * 120/hour = 1.2GB/hour — negligible`,
      },
    ],

    keyDecisions: [
      'Edge inference vs cloud-only inference — chose edge because cloud-only requires 50Gbps bandwidth and hundreds of GPUs; edge reduces bandwidth by 99% and alert latency from 60s to under 10s',
      'Re-identification vs facial recognition — chose Re-ID because facial recognition is banned in many jurisdictions and raises biometric data classification issues; Re-ID achieves acceptable cross-camera tracking without face biometrics',
      'Event-based storage vs continuous cloud archiving — chose event-based to reduce storage cost by ~50x; continuous video retained locally on NVR for forensic access without cloud storage cost',
      'Per-environment model calibration vs single global model — chose per-environment calibration because false positive rates vary dramatically across environments; a parking lot at night behaves nothing like a mall food court',
      'WebSocket push vs polling for alerts — chose WebSocket because polling introduces 5-30 second alert lag; push delivers within 1 second of event upload',
    ],
  },

  // ─── 4. AI Product Recommendation ───────────────────────────────────────────
  {
    id: 'ai-product-recommendation',
    isNew: true,
    title: 'AI Product Recommendation System',
    subtitle: 'Amazon / Shopify / Etsy Product Suggestions',
    icon: 'database',
    color: '#10b981',
    difficulty: 'Medium',
    description: 'Design a real-time product recommendation system that personalizes suggestions across homepage, product detail pages, and email campaigns using collaborative filtering, content signals, and live session context.',

    introduction: `Product recommendation is one of the highest-ROI applications of machine learning in e-commerce. Amazon attributes 35% of its revenue to its recommendation engine. At a fundamental level, the problem is: given everything we know about a user (purchase history, browsing behavior, demographics, context) and our product catalog (attributes, co-purchase patterns, ratings), what products are they most likely to want to see next?

The challenge is operating at the intersection of real-time and offline ML. Offline, you train collaborative filtering models on months of interaction data to discover latent patterns like "users who buy power drills tend to also buy drill bits." Online, you must incorporate the user's current session — they just added a laptop to their cart, so show them laptop bags, not headphones. This session context changes every page load and cannot wait for a model retrain.

Scale is severe: Amazon has 300M products, 300M users, and billions of interactions per day. Generating recommendations for every user for every page surface (homepage, product page, checkout, email) is a two-stage problem: candidate generation (reduce 300M products to a few thousand plausible candidates quickly) followed by ranking (score those thousands with a rich feature set to pick the top 20 to show).

Business constraints layer on top of the ML: promote high-margin products, exclude out-of-stock items, respect exclusion lists (a user who returned a product should not see it again), and inject sponsored products. The recommendation system must be a platform that exposes these knobs to business stakeholders without requiring retraining.`,

    functionalRequirements: [
      'Serve personalized product recommendations for homepage, product detail page, and cart page surfaces',
      'Incorporate real-time session signals: currently viewed product, items in cart, recent clicks in this session',
      'Support item-to-item recommendations for the "customers also bought" pattern',
      'Exclude out-of-stock items and products the user has recently purchased or returned',
      'Allow business rules to boost or bury specific products or categories',
      'Generate recommendation batches for email campaigns based on user history',
      'A/B test different recommendation models and surfaces with traffic splitting',
      'Track recommendation impressions and clicks for offline model evaluation',
    ],

    nonFunctionalRequirements: [
      'Homepage recommendation API latency under 50ms at p99',
      'Product detail page recommendations served within 30ms',
      'Support 500,000 recommendation API requests per second at peak',
      'Cold start recommendations for new users within their first session',
      '99.99% availability for the recommendation serving tier',
    ],

    estimation: {
      users: '200M monthly active users, 30M daily active, 5M concurrent at peak',
      storage: '200M users * 50 feature fields = ~10GB for user feature store; 50M products * 100 fields = ~5GB item feature store; interaction log ~500GB/day',
      bandwidth: '500K recommendation QPS * 5KB avg response = ~2.5GB/sec serving bandwidth',
      qps: '500K recommendation requests/sec; 50K feature store reads/sec; 10K model inference/sec (batched)',
    },

    apiDesign: {
      description: 'REST API for recommendation serving, feedback collection, and experiment management',
      endpoints: [
        { method: 'GET', path: '/api/v1/recommendations', params: 'user_id, surface=homepage|pdp|cart, context_item_id?, limit=20, experiment_id?', response: '{ recommendations[{item_id, score, reason_code}], model_version, experiment_group }', description: 'Primary recommendation serving endpoint; context_item_id for PDP surface' },
        { method: 'GET', path: '/api/v1/similar-items/{item_id}', params: 'limit=10, exclude_item_ids[]?', response: '{ similar[{item_id, similarity_score, shared_attributes[]}] }', description: 'Item-to-item similarity for "customers also viewed" widgets' },
        { method: 'POST', path: '/api/v1/events', params: '{ user_id, event_type: impression|click|purchase|return, item_ids[], surface, timestamp }', response: '{ ok }', description: 'Track recommendation interactions for model training and online metrics' },
        { method: 'POST', path: '/api/v1/batch/email', params: '{ user_ids[], campaign_id, limit=5 }', response: '{ job_id }', description: 'Async batch recommendation generation for email campaign; results available via job polling' },
        { method: 'GET', path: '/api/v1/experiments/{experiment_id}/metrics', params: 'start, end', response: '{ groups[{name, ctr, cvr, revenue_per_user, sample_size}] }', description: 'A/B experiment metrics for comparing recommendation models' },
      ],
    },

    dataModel: {
      description: 'User and item features, interaction logs, recommendation logs, and experiment assignments',
      schema: `user_features {
  user_id: bigint PK
  segment: varchar(32)
  age_bucket: varchar(16)
  preferred_categories: text[]
  avg_order_value: float
  last_purchase_at: timestamp
  feature_vector: vector(256)   -- pre-computed user embedding
  updated_at: timestamp
}

item_features {
  item_id: bigint PK
  category_path: text[]
  brand: varchar(128)
  price: float
  avg_rating: float
  review_count: int
  in_stock: boolean
  margin_tier: enum(high, medium, low)
  embedding: vector(256)        -- item content embedding
  cf_embedding: vector(256)     -- collaborative filtering embedding
  updated_at: timestamp
}

interactions {
  id: bigint PK
  user_id: bigint FK
  item_id: bigint FK
  event_type: enum(view, click, add_to_cart, purchase, return, wishlist)
  surface: varchar(32)
  session_id: varchar(64)
  timestamp: timestamp
  -- Partitioned by timestamp month
}

recommendation_logs {
  id: uuid PK
  user_id: bigint FK
  surface: varchar(32)
  model_version: varchar(32)
  experiment_group: varchar(32)
  recommended_item_ids: bigint[]
  served_at: timestamp
}`,
      examples: [
        { table: 'user_features', label: 'User profile with embedding', json: `{ "user_id": 8291037, "segment": "home_improvement", "age_bucket": "35-44", "preferred_categories": ["power_tools", "hardware", "outdoor"], "avg_order_value": 87.50, "last_purchase_at": "2025-04-28T11:30:00Z", "feature_vector": "[0.12, -0.34, ...]", "updated_at": "2025-05-01T06:00:00Z" }` },
        { table: 'interactions', label: 'Purchase event', json: `{ "id": 4920183742, "user_id": 8291037, "item_id": 702913, "event_type": "purchase", "surface": "pdp", "session_id": "sess-abc123", "timestamp": "2025-04-28T11:30:00Z" }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A nightly job runs matrix factorization on interaction data and writes user-item score matrices to a database. The recommendation API queries this matrix directly to find top-scored items for each user.',
      problems: [
        'Nightly batch means recommendations do not reflect anything the user did today — a user who just bought a drill still sees drills',
        'Matrix factorization scores go stale within hours for rapidly changing inventory (items go out of stock, prices change)',
        'No session context — the system cannot react to what the user is browsing in the current session',
        'Cold start failure for new users with no history — they receive generic bestsellers with no personalization',
        'No business rule layer — out-of-stock items and previously purchased products are not excluded',
      ],
    },

    advancedImplementation: {
      title: 'Two-Stage Real-Time Recommendation with Session Context and Business Rules',
      description: 'Recommendations are generated in two stages. Candidate generation retrieves hundreds of candidate items using pre-computed embeddings from ANN search (covers collaborative filtering signals) combined with item-to-item co-purchase similarity (covers session context). Ranking applies a neural ranker with rich features including real-time session signals, business rules, and personalization. The entire pipeline completes within 50ms by pre-computing heavy features offline and performing only lightweight online scoring.',
      keyPoints: [
        'Candidate generation from three sources: (1) user embedding ANN search in item space for collaborative filtering recall, (2) item-to-item co-purchase similarity for the context item (PDP surface), (3) trending items in the user\'s preferred categories — merged and deduplicated to ~500 candidates',
        'Real-time session context: Redis stores the current session\'s viewed and carted items; these are injected as features into the ranker within 1ms of the request',
        'Neural ranker: a lightweight two-tower model (user tower + item tower) scores each candidate; features include user history embeddings, item attributes, session context, and contextual signals (time of day, device type); runs on CPU in under 10ms for 500 candidates',
        'Business rules applied post-ranking as hard filters: remove out-of-stock, remove recently purchased, remove items the user returned, apply category exclusions from user preferences',
        'Promoted items (sponsored or high-margin) injected into the final result set at configurable positions without displacing organic recommendations below minimum CTR thresholds',
        'Feature store serves user and item features with sub-millisecond latency from Redis (online store); features updated in batch from DynamoDB (offline store) every 15 minutes for user features, every 5 minutes for inventory/price changes',
      ],
      databaseChoice: 'Redis as the online feature store for user session context and hot user/item features (sub-millisecond reads); DynamoDB as the offline feature store for full user and item features (warm reads); Faiss or Weaviate for ANN candidate generation from embedding indexes; Kafka for interaction event streaming to model training pipeline; S3 + Spark for offline training data; PostgreSQL for experiment configuration and A/B test assignment',
      caching: 'Homepage recommendations pre-computed and cached in Redis for anonymous users (no personalization) and low-activity users (refreshed every 30 minutes); item-to-item similarity cached aggressively since these change only when the underlying model retrains; CDN caching for product image thumbnails in recommendation widgets',
    },

    tips: [
      'Always draw the two-stage architecture first: candidate generation and ranking — this is expected for any recommendation problem at scale',
      'Cold start is a standard follow-up: explain the transition from content-based (new user, use demographics and onboarding category preferences) to collaborative filtering (after 5+ interactions)',
      'Session context is what separates good from great recommendation systems — explain how Redis stores session state and how it feeds the ranker',
      'Mention the feedback loop: impression and click logging feeds offline model evaluation; good candidates that are never clicked get demoted over time',
      'Business rules as post-ranking filters is the right architecture — do not try to encode business rules into the model itself; they change too frequently',
      'A/B testing discussion is expected: explain how you split traffic by user ID hash, measure CTR and conversion rate per group, and use statistical significance tests before declaring a winner',
    ],

    keyQuestions: [
      {
        question: 'How do you handle the cold start problem for new users?',
        answer: `**Cold start** occurs when a new user has no interaction history — collaborative filtering has nothing to work with.

**Three-phase approach as the user accumulates history**:

**Phase 1 — Anonymous (0 interactions)**:
- Serve popularity-based recommendations: bestsellers in broad categories
- Inject contextual signals: device type, location (infer from IP for regional products), time of day
- If user came from a search query or ad, use the query/ad category as a strong signal
- Show diverse items to gather initial engagement signals

**Phase 2 — Early session (1–5 interactions)**:
- After the first click or purchase, use item-to-item similarity immediately
- User viewed a power drill → "customers also bought" candidates feed the next recommendation
- No CF model needed yet — item similarity is effective with a single data point
- Onboarding quiz (optional): "What are you shopping for?" — user-selected categories seed the candidate pool

**Phase 3 — Enough history (5+ interactions)**:
- User embedding computed from the interaction sequence using a session model (e.g., BERT4Rec or SASRec)
- This embedding is used for ANN retrieval in the full CF space
- Full personalization kicks in

**New item cold start** (new product with no purchase history):
- Content-based embedding from product title, description, images (CLIP for images, text encoder for description)
- Find similar items in the content embedding space
- Surface to users whose history contains similar items
- After 50+ interactions, the CF embedding takes over from content embedding`,
      },
      {
        question: 'How does the two-stage candidate generation and ranking pipeline work end to end?',
        answer: `**Why two stages?** Scoring all 50M products for every user at every page load is impossible. The two-stage approach reduces the problem from 50M to ~500 candidates for the expensive ranker.

**Stage 1 — Candidate Generation (target: < 10ms, retrieve ~500 items)**:
\`\`\`
Source A — Collaborative Filtering (user embedding ANN):
  Retrieve user embedding from feature store (1ms Redis read)
  ANN search in item embedding index (Faiss): top-200 nearest items
  These are items "users like you also bought"

Source B — Item-to-Item (context item co-purchase):
  Only for PDP surface where context_item_id is provided
  Pre-computed co-purchase list for each item (top-200 co-purchased items)
  Retrieved in <1ms from Redis hash

Source C — Category trending:
  User's top 2-3 preferred categories
  Top-50 trending items per category (refreshed hourly)
  Retrieved from Redis sorted set

Merge + Deduplicate: union of A+B+C, remove seen items → ~400-500 candidates
\`\`\`

**Stage 2 — Ranking (target: < 30ms, score 500 candidates)**:
\`\`\`
Features assembled per candidate (in parallel):
  - User features: embedding, segment, recency (from Redis, 2ms)
  - Item features: price, rating, margin, inventory (from Redis, 2ms)
  - Session features: recently viewed, cart contents (from Redis session, 1ms)
  - Cross features: category match, price range overlap

Neural ranker inference:
  - Batch score all 500 candidates in a single forward pass
  - Two-tower: 128-dim user tower + 128-dim item tower → dot product score
  - Runtime: ~8ms on CPU for 500 candidates (batched matrix multiply)

Business rule filters (post-ranking):
  Remove out-of-stock → check inventory flag in item features
  Remove recently purchased → user purchase history, last 90 days
  Remove returned items → exclusion list from user features
  Cap per-category diversity (max 3 items from same sub-category)

Result: top-20 items by score after filters → serve to user
\`\`\`

**Total latency**: 1ms (user embedding) + 5ms (ANN + co-purchase + trending) + 8ms (ranker) + 2ms (filters) + 5ms (network/serialization) = ~21ms → well within 50ms SLA.`,
      },
    ],

    keyDecisions: [
      'Two-stage retrieval+ranking vs single-stage ranking of all items — chose two-stage because scoring 50M items at 500K QPS is computationally impossible; candidate generation reduces the problem by 100,000x',
      'Real-time session context via Redis vs including session in offline model — chose Redis because the session changes every page load; the offline model cannot capture what happened in the last 30 seconds',
      'Neural ranker vs gradient boosted trees (LightGBM) — chose neural ranker because it learns embedding interactions implicitly; LightGBM requires manual feature engineering for interaction signals',
      'Business rules as post-ranking filters vs in-model constraints — chose post-ranking because business rules change weekly and should not require model retraining; filters are deterministic and auditable',
      'Pre-computed item-to-item vs online computation — chose pre-computed because online co-purchase matrix computation at 500K QPS is infeasible; daily recomputation on Spark covers 99% of the catalog',
    ],
  },

  // ─── 5. Resume Screening ────────────────────────────────────────────────────
  {
    id: 'resume-screening',
    isNew: true,
    title: 'AI Resume Screening System',
    subtitle: 'LinkedIn Recruiter AI / Workday AI / Greenhouse AI',
    icon: 'layers',
    color: '#6366f1',
    difficulty: 'Medium',
    description: 'Design an AI-powered resume screening platform that parses resumes, matches candidates to job requirements using semantic similarity, ranks applicants, and surfaces potential bias for recruiter review.',

    introduction: `Resume screening is the highest-volume, most repetitive task in recruiting. A popular job posting at a large company receives 5,000 to 50,000 applications. Human recruiters physically cannot review all of them — they typically spend 6-10 seconds per resume before making a shortlist decision. AI screening can apply consistent, documented criteria at scale, but it introduces new risks: historical biases in hiring data get encoded into the model, and candidates have learned to game keyword-based systems with resume stuffing.

The core technical challenge is moving beyond keyword matching to semantic understanding. A candidate with "machine learning engineering" experience matches a job requirement for "ML infrastructure" even though neither exact phrase appears in the other document. This requires embedding-based matching using models trained on professional language, not general text.

Bias detection and mitigation is not optional — it is legally required in many jurisdictions and ethically essential. Disparate impact analysis must show that the screening system does not disproportionately reject candidates from protected classes. This requires careful feature selection (exclude name, which often signals gender/ethnicity; exclude graduation year, which signals age), regular auditing of acceptance rates across demographic groups, and explainability so recruiters can understand why a candidate was ranked highly or poorly.

The feedback loop is what separates a screening system from a scoring system. When a recruiter advances a candidate who scored poorly, or rejects a candidate who scored highly, that signal must flow back to improve the model. But the feedback is noisy — recruiters make biased decisions too — so the feedback loop needs careful curation.`,

    functionalRequirements: [
      'Parse resumes in PDF, Word, and text formats into structured candidate profiles',
      'Match candidates to job description requirements using semantic similarity, not just keyword matching',
      'Rank applicants by match score with explanations of why each candidate was ranked as they were',
      'Detect and flag potential bias signals including name, photo, graduation year, and address',
      'Generate tailored screening questions based on gaps between the candidate\'s profile and job requirements',
      'Integrate with ATS (Applicant Tracking Systems) via standard APIs and webhooks',
      'Provide recruiter feedback capture to support model improvement over time',
      'Export audit logs showing screening decisions with reasoning for compliance review',
    ],

    nonFunctionalRequirements: [
      'Process a 10,000-application job posting within 4 hours of the job closing',
      'Resume parsing accuracy above 95% for standard structured resumes',
      'Semantic matching recall above 90% — qualified candidates should not be silently filtered out',
      'Screening decisions explainable to candidates and auditable by legal and HR teams',
      'System must not produce statistically significant disparate impact across protected classes',
    ],

    estimation: {
      users: '10,000 enterprise recruiter users; 50M job seekers submitting applications; 1M new job postings per month',
      storage: '1M job postings * 50KB JD text = 50GB/month JD storage; 50M resumes * 200KB average = 10TB resume storage; structured profiles ~2GB/month',
      bandwidth: 'Bulk resume processing: 5,000 resumes/posting * 200KB = 1GB per job closing; 10,000 jobs closing/day = 10TB/day ingest during peak',
      qps: 'Peak 500 resumes/sec during batch processing windows; recruiter API queries 2,000 QPS; screening question generation 200 QPS',
    },

    apiDesign: {
      description: 'REST API for job management, application processing, and recruiter workflow',
      endpoints: [
        { method: 'POST', path: '/api/v1/jobs', params: '{ title, description, requirements[], nice_to_haves[], screening_criteria }', response: '{ job_id, embedding_id }', description: 'Create a job posting and trigger JD embedding for candidate matching' },
        { method: 'POST', path: '/api/v1/jobs/{job_id}/applications', params: '{ resume_file (multipart), candidate_email, source }', response: '{ application_id, processing_status }', description: 'Submit an application; resume parsed asynchronously' },
        { method: 'GET', path: '/api/v1/jobs/{job_id}/candidates', params: 'min_score?, status?, limit, cursor, sort=score|applied_at', response: '{ candidates[{application_id, score, match_reasons[], flags[], status}], next_cursor }', description: 'Ranked candidate list for recruiter review' },
        { method: 'GET', path: '/api/v1/applications/{application_id}/screening-questions', params: '', response: '{ questions[{question, rationale, required_skill}] }', description: 'Get tailored screening questions highlighting candidate gaps' },
        { method: 'POST', path: '/api/v1/applications/{application_id}/decision', params: '{ decision: advance|reject, reason_code, feedback_notes? }', response: '{ ok }', description: 'Recruiter records decision; feeds model improvement pipeline' },
      ],
    },

    dataModel: {
      description: 'Job postings, candidate profiles, match scores, and bias audit records',
      schema: `job_postings {
  id: uuid PK
  org_id: uuid FK
  title: varchar(256)
  description: text
  requirements: jsonb           -- [{skill, required: true/false, weight}]
  embedding: vector(768)        -- JD semantic embedding
  status: enum(open, closed, filled)
  created_at: timestamp
}

candidate_profiles {
  id: uuid PK
  application_id: uuid FK
  raw_resume_s3_key: varchar(512)
  parsed: jsonb                 -- {name_redacted, skills[], experience[], education[]}
  skills: text[]
  years_experience: float
  education_level: enum(high_school, bachelors, masters, phd)
  embedding: vector(768)        -- candidate semantic embedding
  bias_flags: jsonb             -- [{flag_type, value, action: redacted|flagged}]
  parsed_at: timestamp
}

match_scores {
  id: uuid PK
  job_id: uuid FK
  candidate_id: uuid FK
  overall_score: float          -- 0.0 to 1.0
  skill_match_score: float
  experience_match_score: float
  match_reasons: jsonb          -- [{factor, score, matched_text}]
  computed_at: timestamp
}

screening_decisions {
  id: uuid PK
  match_score_id: uuid FK
  recruiter_id: uuid FK
  decision: enum(advance, reject, hold)
  reason_code: varchar(64)
  model_score: float            -- score at time of decision (for drift detection)
  decided_at: timestamp
}`,
      examples: [
        { table: 'match_scores', label: 'Candidate match with explanations', json: `{ "id": "ms-001", "job_id": "job-sde-2025", "candidate_id": "cand-8291", "overall_score": 0.87, "skill_match_score": 0.92, "experience_match_score": 0.81, "match_reasons": [{"factor": "skill_match", "score": 0.95, "matched_text": "PyTorch deep learning" }, {"factor": "experience_gap", "score": 0.60, "matched_text": "Required 5+ years, candidate has 3"}], "computed_at": "2025-05-01T09:00:00Z" }` },
        { table: 'candidate_profiles', label: 'Parsed profile with bias flags', json: `{ "id": "cand-8291", "skills": ["Python", "PyTorch", "distributed systems", "Kubernetes"], "years_experience": 3.2, "education_level": "masters", "bias_flags": [{"flag_type": "graduation_year", "value": "2022", "action": "redacted"}, {"flag_type": "name_gender_signal", "value": "high", "action": "redacted"}] }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A keyword extraction job parses each resume for skill mentions and scores them against a keyword list extracted from the job description. Resumes with more matching keywords rank higher.',
      problems: [
        'Keyword matching misses semantically equivalent skills: "ML engineering" and "machine learning infrastructure" score zero similarity despite being the same skill',
        'Candidates optimize for keyword stuffing rather than genuine qualifications, gaming the system',
        'No bias detection — names, photos, graduation years, and addresses directly influence the ranking',
        'No explanation for scores — recruiter cannot understand why a candidate ranked 47th vs 3rd',
        'No feedback mechanism — model never learns from recruiter decisions, so systematic errors persist indefinitely',
      ],
    },

    advancedImplementation: {
      title: 'Semantic Matching with Bias Mitigation and Explainable Ranking',
      description: 'Resumes are parsed by a specialized NLP pipeline that extracts structured entities (skills with proficiency levels, company names, roles, dates, education). A bias mitigation step redacts or hashes identifiers that correlate with protected classes before scoring. Job descriptions and candidate profiles are embedded using a professional-domain fine-tuned model. Match scores combine semantic embedding similarity with structured rule-based checks. An explanation module maps the score back to specific skill matches and gaps. Recruiter decisions flow into a weekly retraining pipeline with disparate impact monitoring.',
      keyPoints: [
        'Domain-specific embedding model: general-purpose BERT underperforms on professional text; fine-tune on job description / resume pairs from the platform\'s own data to learn that "ML engineer" and "deep learning practitioner" are near-synonyms in this domain',
        'Structured parsing extracts skills with context: "led a team of 8 ML engineers for 3 years" yields skill=team_leadership, seniority=senior, years=3 — richer than keyword extraction',
        'Bias mitigation layer redacts: name tokens with gender or ethnicity signal (classifier assigns probability), graduation year (correlated with age), address beyond country level, and any photo detected in the resume; redacted profiles used for scoring, full profiles shown to recruiter only after ranking',
        'Score explanation maps to specific job requirements: "Required: distributed systems experience (5 years). Candidate has: 3 years Kafka + 2 years Flink = strong match (0.91). Required: people management. Not found in resume: gap (0.20)"',
        'Disparate impact monitoring runs weekly on all decisions: compute acceptance rate per demographic group inferred from name/address signals; alert if any group\'s acceptance rate is below 80% of the highest group\'s rate (4/5ths rule from EEOC guidelines)',
        'Recruiter feedback as a curriculum signal: when a recruiter advances a candidate with model score 0.45, this becomes a positive training example; reject decisions on high-scoring candidates flag potential model error for human review before inclusion in training data',
      ],
      databaseChoice: 'S3 for raw resume storage; PostgreSQL for job postings, applications, decisions, and audit logs; pgvector for embedding storage and ANN candidate retrieval; Elasticsearch for full-text search over parsed resumes; Redis for processing job queue and hot ranking results; ClickHouse for bias monitoring analytics queries',
      caching: 'Job description embeddings cached in Redis for the lifetime of the job posting (recomputed only on JD edits); ranking results cached per job for 15 minutes to handle bursts of recruiter sessions accessing the same job; frequently requested candidate profiles cached at the application layer',
    },

    tips: [
      'Bias detection and mitigation should be raised proactively — it demonstrates legal and ethical awareness that interviewers in HR tech especially value',
      'Explain the difference between keyword matching and semantic matching with a concrete example like "ML engineer" vs "deep learning practitioner" — it makes the value of embeddings tangible',
      'The 4/5ths rule is the standard US EEOC metric for disparate impact — knowing it shows domain knowledge',
      'Explainability is not optional in HR tech — regulators in the EU (AI Act) require it for high-risk AI systems; mentioning this shows awareness of the regulatory landscape',
      'The feedback loop from recruiter decisions to model retraining is where this system either gets better or stays mediocre — it is worth spending a minute on how you handle noisy labels',
      'Discuss precision vs recall tradeoff: a high-recall system surfaces all qualified candidates but creates more review work; a high-precision system reduces recruiter workload but may miss good candidates; the choice depends on the organization\'s hiring culture',
    ],

    keyQuestions: [
      {
        question: 'How do you detect and mitigate bias in resume screening without removing useful signals?',
        answer: `**The bias problem**: Historical hiring data reflects historical biases. If historically a company hired fewer women into engineering, a model trained on "good hire" data will score women's resumes lower, perpetuating the bias at machine speed and scale.

**Two-stage approach: redaction then monitoring**

**Stage 1 — Pre-scoring redaction**:
Remove signals that correlate with protected class without adding legitimate job-relevant information:
\`\`\`
Name → hash (preserves deduplication, removes gender/ethnicity signal)
Photo → detect and remove (photos in resumes are common in some countries)
Graduation year → remove (strongly correlated with age; years of experience is sufficient)
Address → strip to country level (local candidates get no bonus; remote work makes address irrelevant)
Schools → optional: redact if "prestigious school" correlates with socioeconomic status
\`\`\`

**What to keep** (relevant signals that overlap with demographics but are legitimate):
- Skills, experience, and accomplishments (relevant even if correlated)
- Employment gaps (relevant for recent activity; explain in interview)
- Certifications (legitimate qualifications)

**Stage 2 — Outcome monitoring** (4/5ths rule):
\`\`\`
Weekly: compute acceptance rate by inferred demographic group
  (inferred from name tokens that were not redacted from logs, or from self-reported EEO data)

Disparate impact ratio = lowest_group_rate / highest_group_rate
If ratio < 0.80 (4/5ths rule) for any protected class → alert compliance team

Actions on violation:
  - Audit recent decisions for systematic pattern
  - Adjust scoring weights
  - Temporarily require human review for affected group
\`\`\`

**The nuance**: Redaction removes bias sources at input; monitoring catches bias that leaks through proxy features. Both layers are necessary because redacting name does not remove bias encoded in educational institution or zip code.`,
      },
      {
        question: 'How do you explain why a candidate was ranked 47th rather than 3rd?',
        answer: `**Explainability is required** for recruiter trust, regulatory compliance (EU AI Act), and candidate appeals.

**Score decomposition approach**:
\`\`\`
Overall score = weighted sum of component scores:
  Skill match:       weight 0.40, score 0.92 → contribution 0.37
  Experience level:  weight 0.30, score 0.81 → contribution 0.24
  Domain relevance:  weight 0.20, score 0.75 → contribution 0.15
  Education match:   weight 0.10, score 0.60 → contribution 0.06
  Overall: 0.82
\`\`\`

**Per-requirement match explanations**:
\`\`\`
For each job requirement, compute match score and cite the resume span:

Required: "5+ years distributed systems experience"
  → Matched: "Led infrastructure team using Kafka and Kubernetes (2019–2024)"
  → Match score: 0.89 (strong match — 5 years, relevant technologies)

Required: "Experience with people management"
  → Matched: nothing found
  → Match score: 0.15 (gap — no management experience detected in resume)

Required: "Python or Go proficiency"
  → Matched: "Python" (explicit), "Go microservices" (explicit)
  → Match score: 1.0 (exact match)
\`\`\`

**Counterfactual explanations** (why NOT in top 10?):
"This candidate ranked 47th because 46 candidates had stronger people management signals. If this candidate had shown team leadership experience, their score would increase from 0.82 to an estimated 0.94, placing them in the top 5."

**Implementation**: Integrated gradients or SHAP values attribute the neural ranker's score to input features. For the embedding similarity component, cosine similarity breakdown by skill sub-embedding provides the cited evidence spans.`,
      },
    ],

    keyDecisions: [
      'Semantic embedding vs keyword matching — chose embedding because keyword matching misses synonyms and fails when candidates use different but equivalent terminology for the same skill',
      'Pre-scoring redaction vs in-model fairness constraints — chose redaction as the primary mechanism because it prevents bias from entering the model; fairness constraints in the objective function are harder to audit and can cause unexpected tradeoffs',
      'Structured parsing vs raw text embedding — chose structured parsing first because extracted structured features (skills, years of experience, education level) enable interpretable scoring; raw text embedding alone produces a black box',
      'Asynchronous batch processing vs real-time per-application scoring — chose batch because scoring 50,000 applications for a single job benefits from batched embedding inference; recruiter reviews happen hours after application deadline anyway',
      'Recruiter feedback as direct training labels vs held-out audit — chose curated inclusion because recruiter decisions contain bias; random sample of high-discrepancy decisions is reviewed by an HR expert before entering the training set',
    ],
  },

  // ─── 6. Healthcare AI Triage ─────────────────────────────────────────────────
  {
    id: 'healthcare-ai-triage',
    isNew: true,
    title: 'Healthcare AI Triage System',
    subtitle: 'Symptom Checker / Emergency Triage / Telemedicine AI',
    icon: 'shield',
    color: '#ef4444',
    difficulty: 'Medium',
    description: 'Design an AI-powered triage system that assesses patient symptoms through a conversational interface, recommends care level urgency, and routes patients to appropriate care while remaining within strict regulatory and safety guardrails.',

    introduction: `Healthcare AI triage sits at the highest-stakes end of AI applications. Unlike a recommendation system where a wrong answer means a suboptimal movie suggestion, a triage system that under-estimates severity can delay care for a patient having a heart attack. The system must be calibrated to err heavily on the side of caution — it is always better to recommend urgent care unnecessarily than to tell someone with appendicitis to wait until Monday.

The primary use case is pre-visit triage: a patient calls or messages describing symptoms, and the system determines urgency (emergency room now, urgent care today, primary care appointment, home care) and prepares structured symptom information for the receiving clinician. This reduces unnecessary ER visits while ensuring high-acuity patients are identified and directed appropriately.

Regulatory constraints are the dominant architectural driver. In the US, FDA classifies symptom checkers as Software as a Medical Device (SaMD) under Class II or III depending on severity scope. This requires clinical validation studies, documented risk management (ISO 14971), and quality management systems (ISO 13485). In the EU, the Medical Device Regulation applies. The system cannot claim to diagnose — it can only triage to a care level and present differential considerations for clinician review.

The conversational interface must handle the full spectrum of patient communication: a health-literate professional describing symptoms precisely, an elderly patient using lay terminology, a parent describing symptoms on behalf of a child, and a patient whose first language is not English. The NLU layer must extract clinical meaning from all of these inputs.`,

    functionalRequirements: [
      'Conduct a structured symptom assessment through a conversational interface, asking appropriate follow-up questions',
      'Classify urgency into four tiers: emergency (call 911), urgent care (same day), primary care (next few days), and home care (self-care guidance)',
      'Present differential considerations — possible conditions to explore — for clinician review, not for patient consumption',
      'Integrate with patient health records when available to incorporate chronic conditions, medications, and allergy history',
      'Generate a structured clinical handoff note summarizing the assessment for the receiving provider',
      'Support multiple input channels: web chat, SMS, voice call via speech-to-text, and mobile app',
      'Detect crisis situations (suicidal ideation, abuse indicators, severe allergic reaction) and route immediately to emergency services or crisis lines',
      'Provide post-triage follow-up messages to check whether symptoms resolved or worsened',
    ],

    nonFunctionalRequirements: [
      'Assessment completion time under 5 minutes for typical presentations',
      'False negative rate for emergency-level urgency below 1% — missing a true emergency is the highest-risk failure mode',
      'HIPAA compliance for all patient data handling, storage, and transmission',
      'System availability 99.99% — patients may need triage at any hour',
      'Full audit trail of all assessments with version-locked model ID for regulatory and legal review',
    ],

    estimation: {
      users: '5M registered patients; 500K assessments per day; 50K concurrent sessions at peak (weekday mornings)',
      storage: '500K assessments/day * 20KB structured data = 10GB/day; voice recordings for audit ~50GB/day; 7-year HIPAA retention = ~22TB total',
      bandwidth: 'Chat: 500K sessions * 5KB/message * 10 messages = 25GB/day; voice: 500K sessions * 3MB = 1.5TB/day if stored',
      qps: '50K concurrent sessions, ~5 messages/minute each = 4,200 NLU classification requests/sec; 500 LLM inference requests/sec for follow-up question generation',
    },

    apiDesign: {
      description: 'REST and WebSocket APIs for session management, assessment submission, and EHR integration',
      endpoints: [
        { method: 'POST', path: '/api/v1/sessions', params: '{ patient_id?, channel: web|sms|voice, chief_complaint? }', response: '{ session_id, initial_question, crisis_check_passed }', description: 'Start a triage session; crisis screening runs immediately on the chief complaint' },
        { method: 'POST', path: '/api/v1/sessions/{session_id}/messages', params: '{ content: text or {audio_url} }', response: '{ response_text, follow_up_question?, assessment_complete, partial_urgency? }', description: 'Submit patient response; returns next question or completion signal' },
        { method: 'GET', path: '/api/v1/sessions/{session_id}/assessment', params: '', response: '{ urgency_tier, urgency_confidence, differentials[], recommended_action, handoff_note, model_version, session_id }', description: 'Retrieve completed assessment results; differentials visible to providers only' },
        { method: 'GET', path: '/api/v1/sessions/{session_id}/handoff', params: 'format=fhir|plain', response: '{ structured FHIR R4 QuestionnaireResponse or plain text summary }', description: 'Export assessment as clinical handoff for EHR integration' },
        { method: 'POST', path: '/api/v1/sessions/{session_id}/clinician-override', params: '{ actual_urgency, notes }', response: '{ ok }', description: 'Clinician records the actual urgency after seeing patient; feeds model calibration' },
      ],
    },

    dataModel: {
      description: 'Assessment sessions, symptom exchanges, urgency outcomes, and audit records',
      schema: `triage_sessions {
  id: uuid PK
  patient_id: uuid nullable FK   -- null for anonymous sessions
  channel: enum(web, sms, voice, mobile)
  chief_complaint: text
  started_at: timestamp
  completed_at: timestamp nullable
  model_version: varchar(32)     -- locked at session start for audit
  status: enum(in_progress, completed, abandoned, crisis_escalated)
}

symptom_exchanges {
  id: uuid PK
  session_id: uuid FK
  turn_index: int
  patient_input: text
  extracted_symptoms: jsonb      -- [{symptom, severity, duration, body_part}]
  system_question: text
  created_at: timestamp
}

triage_assessments {
  id: uuid PK
  session_id: uuid FK
  urgency_tier: enum(emergency, urgent_care, primary_care, home_care)
  urgency_confidence: float
  differentials: jsonb           -- [{condition, probability, evidence[]}] -- PROVIDER ONLY
  recommended_action: text       -- plain language instruction for patient
  handoff_note: text
  risk_flags: jsonb              -- [{flag_type, trigger_text}]
  clinician_actual_urgency: enum nullable  -- set by clinician override
  assessed_at: timestamp
}

audit_log {
  id: uuid PK
  session_id: uuid FK
  actor_type: enum(patient, clinician, system)
  actor_id: uuid nullable
  action: varchar(128)
  data_accessed: jsonb           -- what PHI was accessed/modified
  timestamp: timestamp
  ip_address: varchar(45)
}`,
      examples: [
        { table: 'triage_assessments', label: 'Completed assessment for chest pain', json: `{ "id": "asmt-001", "session_id": "sess-abc", "urgency_tier": "emergency", "urgency_confidence": 0.97, "recommended_action": "Call 911 or go to the emergency room immediately. Do not drive yourself.", "risk_flags": [{"flag_type": "cardiac_emergency_indicator", "trigger_text": "chest pain radiating to left arm with sweating"}], "assessed_at": "2025-05-01T08:22:15Z", "model_version": "triage-v4.2.1" }` },
        { table: 'audit_log', label: 'Clinician accessing assessment results', json: `{ "id": "audit-003", "session_id": "sess-abc", "actor_type": "clinician", "actor_id": "dr-59201", "action": "view_assessment_with_differentials", "data_accessed": {"fields": ["differentials", "handoff_note", "risk_flags"]}, "timestamp": "2025-05-01T09:15:03Z", "ip_address": "10.22.1.45" }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A decision tree of symptom questions is presented to the patient. Answers map to urgency tiers via a lookup table built by clinical staff. The system routes to the matching urgency recommendation when enough answers are collected.',
      problems: [
        'Decision trees cannot handle the infinite variety of symptom presentations and their combinations',
        'No ability to ask contextual follow-up questions — a fixed tree asks about fever whether or not the patient mentioned respiratory symptoms',
        'Cannot process free-text descriptions — patients must answer structured multiple-choice questions that do not match how they describe symptoms',
        'Missing symptoms cause silent failures — the tree routes down a default path rather than identifying the gap as uncertainty',
        'Cannot be updated without redeployment — adding a new condition or symptom pattern requires changing the tree logic and retesting all paths',
      ],
    },

    advancedImplementation: {
      title: 'Conversational NLU Pipeline with Calibrated Urgency Classifier and Safety Guardrails',
      description: 'The system uses a conversational NLU pipeline to extract clinical entities from free-text patient input. A medical NER model identifies symptoms, duration, severity, and body parts. A question selection model chooses the next most informative question based on the current symptom graph and remaining uncertainty. An urgency classifier trained on clinical triage datasets produces a calibrated probability distribution over urgency tiers. Safety guardrails run in parallel on every input — detecting crisis keywords, high-acuity symptom combinations, and out-of-scope requests before the main classifier runs.',
      keyPoints: [
        'Medical NER model extracts structured clinical entities: symptom names normalized to SNOMED CT codes, severity (mild/moderate/severe), duration, onset (sudden vs gradual), and associated body systems — this structured representation is more reliable than embedding the raw text',
        'Dynamic question selection uses information gain: the next question is chosen to maximally reduce uncertainty in the urgency classification given the current symptom set; this mimics how experienced triage nurses focus their assessment',
        'Urgency classifier is calibrated using Platt scaling to produce reliable probability scores, not just class labels; a 0.97 confidence for emergency must mean 97% of such cases are genuine emergencies, not just a high softmax output',
        'Red flag detection runs as a parallel fast-path before the main classifier: if any input matches patterns for cardiac emergency, stroke, anaphylaxis, or suicidal ideation, the session is immediately escalated regardless of the classifier output',
        'Model version is locked at session start and stored immutably in the assessment record; if a model is later found to have systematic errors, all affected sessions can be identified and their recommendations reviewed',
        'Differential considerations are generated using a retrieval-augmented approach: the symptom set is matched against a clinical knowledge base to surface the top likely conditions; these are shown only to providers in the handoff note, never to the patient, to avoid self-diagnosis',
      ],
      databaseChoice: 'PostgreSQL for all session and assessment data (HIPAA BAA available, encryption at rest); S3 with server-side encryption for voice recordings and document storage; Redis for active session state (short-lived, purged on completion); Elasticsearch for searching audit logs; a separate read replica for analytics and model monitoring queries',
      caching: 'Medical NER model served from GPU inference cluster with connection pooling — no per-session caching since PHI must not be cached outside the session boundary; question selection model pre-warms common symptom combinations; urgency classifier outputs not cached since each session has unique context',
    },

    tips: [
      'Lead with the safety-first calibration requirement — emphasize that false negatives on emergency urgency are the primary failure mode and explain how you design to minimize them',
      'Distinguish clearly between triage (routing to a care level) and diagnosis (identifying a specific condition) — the system must never claim to diagnose, which is a regulatory requirement and a key design constraint',
      'The model version lock is a subtle but important detail for regulatory compliance — interviewers in healthcare IT will notice if you mention it',
      'Mention HIPAA requirements explicitly: encryption at rest and in transit, audit logging, minimum necessary data access, and Business Associate Agreements with all third-party services',
      'Discuss the clinician override feedback loop as the mechanism for catching systematic errors — if 20% of emergency-triaged patients turn out to be primary care at the clinic, that is a calibration problem that needs investigation',
      'The crisis detection fast-path is an important safety feature — if a patient mentions suicidal thoughts while asking about a headache, the main triage flow must pause and route to crisis resources immediately',
    ],

    keyQuestions: [
      {
        question: 'How do you prevent the AI from missing a genuine emergency?',
        answer: `**The core risk**: A patient describes chest tightness as "a little pressure, probably nothing." The system scores it as primary care. The patient is having a heart attack.

**Defense in depth approach**:

**Layer 1 — Red flag hard rules** (highest priority, override all model outputs):
\`\`\`
Patterns that trigger immediate emergency escalation:
  "chest pain" + any of: radiation, sweating, nausea, jaw pain → EMERGENCY
  "shortness of breath" + any of: sudden onset, blue lips, confusion → EMERGENCY
  "stroke symptoms": face drooping, arm weakness, speech difficulty → EMERGENCY
  "anaphylaxis": throat swelling, bee sting history, hives → EMERGENCY
  Any mention of loss of consciousness, uncontrolled bleeding → EMERGENCY
\`\`\`
These run as a fast-path pattern matcher before the neural classifier, with zero tolerance for false negatives.

**Layer 2 — Conservative classifier calibration**:
- Set the decision threshold asymmetrically: classify as emergency if P(emergency) > 0.30, not > 0.50
- Accepting higher false positive rate (unnecessary ER visits) to guarantee low false negative rate
- Clinical target: emergency sensitivity > 99%, accepting specificity of 85-90%

**Layer 3 — Uncertainty escalation**:
- If classifier uncertainty is high (entropy > threshold), default to the more urgent tier
- "I'm not sure whether this is urgent care or emergency" → route to urgent care, not primary care

**Layer 4 — Calibration monitoring**:
- Track clinician override rates: if clinicians upgrade 15% of "urgent care" assessments to emergency on arrival, that is a signal the threshold needs adjustment
- Weekly model calibration review with clinical oversight committee`,
      },
      {
        question: 'How do you handle regulatory requirements for AI in healthcare?',
        answer: `**US FDA — Software as a Medical Device (SaMD)**:
A triage system that influences clinical care decisions is Class II SaMD at minimum (Class III if it recommends specific treatments).

**Key requirements**:
\`\`\`
Pre-market:
  510(k) clearance: demonstrate substantial equivalence to a predicate device
  Clinical validation study: prospective data showing sensitivity/specificity vs clinician triage
  Risk management plan (ISO 14971): document all failure modes and mitigations
  Software documentation (IEC 62304): architecture, change control, version history

Post-market:
  Adverse event reporting: any patient harm linked to system output reported to FDA within 30 days
  Post-market surveillance: ongoing monitoring of real-world performance
  Algorithm change protocol: some changes require new 510(k) submission
\`\`\`

**HIPAA technical safeguards**:
\`\`\`
Encryption at rest: AES-256 for all PHI in databases and S3
Encryption in transit: TLS 1.3 minimum for all API calls
Access controls: role-based, minimum necessary principle
Audit logs: immutable record of all PHI access, retained 6 years
Business Associate Agreements: required with AWS, any third-party AI provider
\`\`\`

**Architectural implications**:
- Model version locked at session start and stored with every assessment for recall traceability
- Differential suggestions gated to providers only — patients see care level recommendation, not disease guesses
- No training on patient data without explicit consent and IRB approval
- All PHI must be encrypted before sending to any external LLM API; use on-premise or HIPAA-BAA-covered AI services only`,
      },
    ],

    keyDecisions: [
      'Conversational NLU vs structured decision tree — chose conversational NLU because patients describe symptoms in natural language; forcing multiple-choice questions loses clinical nuance and frustrates patients who cannot find their symptom in the options',
      'Medical NER model vs general-purpose LLM for entity extraction — chose specialized medical NER because it normalizes to SNOMED CT codes enabling downstream knowledge base lookups; general LLM produces inconsistent terminology',
      'Asymmetric classification threshold vs symmetric — chose asymmetric because the cost of missing an emergency vastly exceeds the cost of an unnecessary ER visit; threshold set to favor sensitivity over specificity for emergency tier',
      'Red flag hard rules vs purely ML-based escalation — chose hard rules as the primary safety mechanism because ML models can fail on unusual presentations; deterministic rules provide a non-bypassable safety net for known high-acuity patterns',
      'Differential suggestions visible to providers only vs patients — chose provider-only because patient-visible differentials encourage self-diagnosis and anxiety, and regulatory guidance prohibits AI systems from diagnosing patients',
    ],
  },

  // ─── 7. AI Flashcard ────────────────────────────────────────────────────────
  {
    id: 'ai-flashcard',
    isNew: true,
    title: 'AI Flashcard System',
    subtitle: 'Anki AI / Quizlet AI / Duolingo Stories',
    icon: 'layers',
    color: '#0ea5e9',
    difficulty: 'Easy',
    description: 'Design an AI-powered flashcard system that automatically generates high-quality question-answer cards from study materials and schedules reviews using spaced repetition to maximize long-term retention.',

    introduction: `Spaced repetition is one of the most evidence-backed learning techniques in cognitive science. The core insight is that the optimal time to review a memory is just before you would forget it — reviewing too soon is wasteful, reviewing too late means relearning from scratch. Traditional flashcard systems like Anki implement this with the SM-2 algorithm, which schedules each card individually based on past recall performance.

The AI layer transforms a passive system (you must create the cards) into an active one (the system generates cards from your notes, PDFs, lectures, and textbooks). This removes the largest friction point in adoption: the card creation bottleneck. A student who imports a 200-page textbook PDF should have a usable deck within minutes.

The quality of AI-generated flashcards is highly variable. Simple factual questions ("What is the capital of France?") are trivial to generate. Deep conceptual questions that test understanding rather than memorization ("Why does increasing interest rates slow inflation, and what are the conditions under which it might not?") require understanding the pedagogical intent, the student's learning level, and the subject domain. This is where the AI generation challenge lies.

Spaced repetition scheduling can also be improved beyond SM-2 by incorporating signals unavailable to the original algorithm: the time of day the user typically performs best, predicted forgetting curves based on the student's personal memory characteristics, and correlation between card performance within the same concept cluster.`,

    functionalRequirements: [
      'Generate flashcards automatically from uploaded PDFs, text documents, videos (via transcript), and web URLs',
      'Allow users to review, edit, approve, or delete AI-generated cards before adding them to a deck',
      'Schedule card reviews using spaced repetition based on the student\'s recall performance on each card',
      'Support multiple card types: basic question-answer, cloze deletion, image occlusion, and definition cards',
      'Track learning progress per deck including retention rate, due card count, and mastery percentage',
      'Enable deck sharing and collaborative editing among students',
      'Support offline review with sync when connectivity is restored',
      'Export decks in Anki-compatible format for users who want to use other review tools',
    ],

    nonFunctionalRequirements: [
      'Card generation from a 50-page PDF completed within 3 minutes',
      'Review session load time under 2 seconds, including fetching the next due card',
      'Spaced repetition scheduling decisions computed client-side for offline support',
      'Support 10 million daily card reviews across all users',
      '99.9% data durability — students must not lose review history or earned retention state',
    ],

    estimation: {
      users: '5M active students; 10M daily card reviews; 500K document uploads per day',
      storage: '500K uploads * 5MB avg = 2.5TB/day raw; 10M reviews/day * 0.5KB = 5GB/day review logs; deck data 100GB total',
      bandwidth: '500K uploads inbound; 10M review sessions * 2KB response = 20GB/day outbound for review API',
      qps: '500 document uploads/sec peak; 5,000 review QPS sustained; 200 card generation requests/sec',
    },

    apiDesign: {
      description: 'REST API for document upload, deck management, card review, and scheduling',
      endpoints: [
        { method: 'POST', path: '/api/v1/generate', params: '{ source_type: pdf|text|url|video_id, source_url_or_content, card_types[], difficulty_level?, subject_area? }', response: '{ job_id, estimated_seconds }', description: 'Submit a document for AI card generation; results available via job polling' },
        { method: 'GET', path: '/api/v1/jobs/{job_id}/cards', params: 'status=pending_review|approved|rejected', response: '{ cards[{id, front, back, type, topic_cluster, quality_score}], total }', description: 'Retrieve generated cards for user review and approval' },
        { method: 'POST', path: '/api/v1/decks/{deck_id}/review', params: 'limit=20', response: '{ cards[{id, front, back, scheduled_at, interval_days, ease_factor}] }', description: 'Fetch cards due for review today, ordered by scheduling priority' },
        { method: 'POST', path: '/api/v1/cards/{card_id}/response', params: '{ rating: 0|1|2|3|4|5, response_time_ms }', response: '{ next_review_at, new_interval_days, new_ease_factor }', description: 'Submit review response; SM-2 scheduling computed and returned' },
        { method: 'GET', path: '/api/v1/decks/{deck_id}/stats', params: 'period=7d|30d|90d', response: '{ retention_rate, reviews_completed, due_count, mature_card_count, forecast[{date, due_count}] }', description: 'Deck statistics and upcoming review forecast' },
      ],
    },

    dataModel: {
      description: 'Decks, cards, scheduling state, and review history',
      schema: `decks {
  id: uuid PK
  owner_id: uuid FK
  title: varchar(256)
  subject_area: varchar(64)
  card_count: int
  shared: boolean
  created_at: timestamp
}

cards {
  id: uuid PK
  deck_id: uuid FK
  front: text
  back: text
  card_type: enum(basic, cloze, image_occlusion, definition)
  topic_cluster: varchar(128)    -- grouping for related cards
  source_s3_key: varchar(512)    -- original document the card was generated from
  generated_by_ai: boolean
  quality_score: float           -- AI self-assessed quality (0-1)
  created_at: timestamp
}

card_schedules {
  card_id: uuid FK
  user_id: uuid FK
  interval_days: int             -- current scheduled interval
  ease_factor: float             -- SM-2 ease factor (default 2.5)
  repetitions: int               -- number of successful reviews
  due_at: timestamp              -- next scheduled review time
  last_reviewed_at: timestamp nullable
  PRIMARY KEY (card_id, user_id)
}

review_history {
  id: uuid PK
  card_id: uuid FK
  user_id: uuid FK
  rating: smallint               -- 0=blackout to 5=perfect
  response_time_ms: int
  interval_before: int           -- interval before this review
  interval_after: int            -- interval assigned after this review
  reviewed_at: timestamp
  -- Partitioned by reviewed_at month
}`,
      examples: [
        { table: 'card_schedules', label: 'Card due for review with schedule state', json: `{ "card_id": "card-092", "user_id": "user-8210", "interval_days": 14, "ease_factor": 2.65, "repetitions": 4, "due_at": "2025-05-03T08:00:00Z", "last_reviewed_at": "2025-04-19T09:22:15Z" }` },
        { table: 'review_history', label: 'Successful recall review', json: `{ "id": "rev-4829", "card_id": "card-092", "user_id": "user-8210", "rating": 4, "response_time_ms": 3200, "interval_before": 7, "interval_after": 14, "reviewed_at": "2025-04-19T09:22:15Z" }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A single LLM prompt submits the full document text and asks the model to generate 20 question-answer pairs. The results are stored as cards and scheduled with a fixed daily review interval.',
      problems: [
        'Full document in a single prompt exceeds context limits for textbooks and long PDFs',
        'Fixed daily review interval ignores individual recall performance — cards that are easy get reviewed at the same rate as hard ones, wasting study time',
        'No quality filtering means the LLM generates trivial or misleading questions that confuse learners',
        'No topic clustering means related cards are not grouped or scheduled together, missing the interleaving benefits of related concept review',
        'No offline support — students cannot review during commutes or without connectivity',
      ],
    },

    advancedImplementation: {
      title: 'Chunked Generation Pipeline with SM-2 Scheduling and Client-Side Offline Review',
      description: 'Documents are chunked into 500-1000 token segments with semantic boundary detection. Each chunk is processed by an LLM with a card quality scoring prompt that filters out trivial or unanswerable questions. Cards are clustered by topic using embedding similarity. A server-side SM-2 scheduler determines due cards, with the full scheduling algorithm replicated on the client for offline operation. Review results sync to the server when connectivity is restored.',
      keyPoints: [
        'Semantic chunking respects paragraph and section boundaries rather than cutting mid-sentence; heading text is injected as context into each chunk prompt so the LLM generates questions about the right topic',
        'Quality scoring prompt asks the LLM to rate each generated card on specificity, answerability, and learning value; cards scoring below 0.7 are held for human review rather than auto-added to the deck',
        'Topic clustering groups cards by embedding similarity; related cards are scheduled together in the review session (interleaving within topics) which improves discrimination between similar concepts',
        'SM-2 algorithm fully replicated in the mobile client (TypeScript/Swift): review responses update local scheduling state immediately, and a sync job reconciles with the server when online; conflicts resolved by taking the more conservative (shorter) interval',
        'Cloze generation creates fill-in-the-blank cards from sentences with key terms; proven more effective than basic Q&A for vocabulary and definition learning',
        'Forgetting curve prediction uses the user\'s historical ease factors across all cards to estimate their personal memory retention rate; adjusts scheduling for students who forget faster or slower than the SM-2 default',
      ],
      databaseChoice: 'PostgreSQL for decks, cards, and scheduling state; S3 for uploaded documents and generated audio (TTS for language learning cards); Redis for session state and due card queue pre-computation; SQLite on device for offline scheduling state; Kafka for review event streaming to analytics pipeline',
      caching: 'Due card list pre-computed into Redis 30 minutes before typical review session times for each user; card content cached in the mobile app for offline access; deck statistics cached for 15 minutes since exact counts are not critical',
    },

    tips: [
      'Spaced repetition scheduling is the core algorithm — be prepared to explain SM-2 in detail including how interval and ease factor update on each response rating',
      'Chunking strategy for long documents is a real engineering challenge — explain how you handle a 500-page textbook without hitting context limits',
      'Quality filtering is what separates a good AI flashcard system from a toy — explain why you would not just accept all LLM output and how you score quality',
      'Offline support is expected for a mobile learning app — describe the client-side SM-2 implementation and the sync conflict resolution strategy',
      'The card creation UX is as important as the algorithm — explain the approval workflow where users review AI-generated cards before they enter the deck',
      'Mention the forgetting curve as a potential improvement beyond vanilla SM-2 — it shows familiarity with the research literature',
    ],

    keyQuestions: [
      {
        question: 'How does the SM-2 spaced repetition algorithm work?',
        answer: `**SM-2** (SuperMemo 2) was developed by Piotr Wozniak in 1987 and is the basis for most modern spaced repetition tools including Anki.

**Core idea**: Schedule each card's next review based on how well you recalled it. Good recall → longer interval before next review. Poor recall → shorter interval, review again soon.

**Parameters per card**:
\`\`\`
interval (I):    days until next review
ease_factor (EF): multiplier for interval (default 2.5, range 1.3–3.0)
repetitions (n):  number of successful reviews
\`\`\`

**Algorithm on each review**:
\`\`\`
Student rates response: 0=total blackout, 1=wrong, 2=hard, 3=ok, 4=good, 5=perfect

If rating < 3 (failed):
  reset n = 0
  I = 1  (review tomorrow)

If rating >= 3 (passed):
  if n = 0: I = 1
  if n = 1: I = 6
  if n > 1: I = round(I_prev * EF)
  n += 1

Update ease factor:
  EF = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  where q is the rating (0-5)
  EF never goes below 1.3
\`\`\`

**Example progression for a card**:
\`\`\`
Review 1: rating=4 → I=1 day, EF=2.50
Review 2: rating=4 → I=6 days, EF=2.50
Review 3: rating=4 → I=15 days, EF=2.50
Review 4: rating=3 → I=37 days, EF=2.36  (harder, EF drops)
Review 5: rating=5 → I=93 days, EF=2.46  (perfect recall, EF recovers)
\`\`\`

**Why this works**: Cards with high recall rate get exponentially longer intervals (6 → 15 → 37 → 93 days). Hard cards get frequent reviews. The EF per-card captures individual difficulty, so the hardest concept you have stays on a shorter cycle.`,
      },
      {
        question: 'How do you generate high-quality flashcards from an unstructured document?',
        answer: `**The pipeline: chunk → extract → generate → score → cluster**

**Step 1 — Semantic chunking**:
\`\`\`
Split document at paragraph and section boundaries
Target: 400-600 tokens per chunk
Prepend section heading to each chunk for context:
  "Section: Photosynthesis — [chunk text here]"
\`\`\`

**Step 2 — LLM card generation prompt**:
\`\`\`
System: You are an expert flashcard creator. Generate 3-5 high-quality
  question-answer flashcards from the following text. Focus on:
  - Key definitions and concepts
  - Cause-and-effect relationships
  - Comparisons between related ideas
  Avoid: trivial facts, yes/no questions, questions answerable without reading

User: [chunk text]
Output: JSON array of {front, back, card_type, difficulty}
\`\`\`

**Step 3 — Quality scoring**:
\`\`\`
Second LLM call rates each card on:
  specificity (0-1): Is the question specific enough to have one correct answer?
  answerability (0-1): Can the question be answered from the provided back text?
  learning_value (0-1): Does this test understanding or just memorization?

Average score < 0.7 → flag for human review
Score < 0.5 → reject automatically
\`\`\`

**Step 4 — Duplicate detection**:
\`\`\`
Embed all generated cards
Cosine similarity > 0.90 between two cards → keep higher-scored one, discard duplicate
\`\`\`

**Step 5 — Topic clustering**:
\`\`\`
K-means on card embeddings (k = num_cards / 10)
Assign cluster label as topic_cluster field
Review sessions interleave cards from different clusters to improve discrimination
\`\`\`

**Result**: From a 50-page PDF, generate 200-300 raw cards, filter to ~150 high-quality approved cards, organized into 15-20 topic clusters.`,
      },
    ],

    keyDecisions: [
      'SM-2 vs ML-based scheduling — chose SM-2 as the default because it is interpretable, works offline, and has 35 years of evidence; ML-based scheduling (like FSRS) is available as an opt-in for users with enough review history',
      'Client-side vs server-side scheduling — chose client-side with server sync because offline review is a core use case; the algorithm is simple enough to run in TypeScript or Swift without a network call',
      'Full document LLM prompt vs chunked generation — chose chunked because textbooks exceed context windows; chunking with section heading injection preserves context without truncation',
      'Auto-approve generated cards vs human review step — chose human review step because LLM quality is inconsistent; the review step also educates users on the card content as they approve it, creating a first-pass learning experience',
      'Proprietary format vs Anki export — chose Anki-compatible export because interoperability reduces lock-in concerns and Anki has the largest review community; our value-add is in generation and analytics, not in owning the review format',
    ],
  },

  // ─── 8. Music Generation ─────────────────────────────────────────────────────
  {
    id: 'music-generation',
    isNew: true,
    title: 'Music Generation System',
    subtitle: 'Suno / Udio / Google MusicLM',
    icon: 'cpu',
    color: '#ec4899',
    difficulty: 'Medium',
    description: 'Design a text-to-music generation platform that converts natural language prompts into full audio tracks, supports style conditioning, manages GPU-heavy async generation jobs, and enforces copyright and content safety.',

    introduction: `AI music generation represents a significant shift from the previous generation of algorithmic composition tools. Rather than defining melodies through MIDI rules or recombining sample libraries, modern systems like Suno and Udio generate audio waveforms directly from text descriptions using diffusion models or autoregressive transformers. A user can request "upbeat jazz piano with walking bass, 120 BPM, 60s Birdland style" and receive a novel composition within seconds.

The engineering challenges center on the asymmetry between generation and playback. Generating a 30-second audio track with a diffusion model takes 5-30 seconds of GPU computation — fast enough to seem reasonable, but far too slow for a synchronous API response. The system must be built around an asynchronous job queue where generation requests are queued, processed by GPU workers, and results are delivered via polling or webhooks.

GPU cost and capacity planning are existential business questions. Unlike text generation where an A100 GPU can handle dozens of simultaneous streaming requests, audio generation is extremely memory-bandwidth intensive. A single A100 can process only 2-4 concurrent 30-second generation jobs. Demand is bursty — a viral moment where many people want to generate music in a particular style can create sudden spike demand. Auto-scaling on GPU clusters has 5-10 minute latency for new instance availability, which is too slow for real-time demand spikes. Pre-warming strategies and demand forecasting are essential.

Copyright is the third major challenge. AI music generation systems have been sued by major labels for training on copyrighted recordings. The system design must include a similarity detection layer that flags generated tracks that are too similar to known copyrighted songs, both to manage legal risk and to provide value to users who want original content.`,

    functionalRequirements: [
      'Generate audio tracks (30 seconds to 4 minutes) from natural language text prompts',
      'Support style conditioning: genre, tempo, instruments, mood, era, and reference to style of a named artist',
      'Enable continuation generation to extend an existing clip with compatible style',
      'Allow stem separation in the generated output: vocals, drums, bass, and melody as separate tracks',
      'Detect similarity to copyrighted recordings and flag or block outputs above a similarity threshold',
      'Manage a user library of generated tracks with playback, sharing, and download capabilities',
      'Apply a credit and rate-limiting system to control compute costs per user tier',
      'Support customization via melody conditioning: user hums or uploads a reference melody, system generates accompaniment',
    ],

    nonFunctionalRequirements: [
      'Generation queue wait time under 30 seconds for paid tier users at normal load',
      'Generated audio quality at 44.1kHz stereo, minimum 128kbps MP3 for standard tier',
      'Copyright similarity check completed before delivery; outputs with similarity above 0.85 to known tracks blocked',
      'Storage for generated tracks with 90-day retention for free tier, unlimited for paid',
      '99.9% job completion rate; failed jobs retried automatically before notifying the user',
    ],

    estimation: {
      users: '2M monthly active users; 500K generations per day; 5K concurrent generation jobs at peak',
      storage: '500K tracks/day * 5MB avg (3 min MP3) = 2.5TB/day; 90-day free-tier retention requires ~225TB rolling; indefinite paid retention ~2PB cumulative',
      bandwidth: '500K downloads/day * 5MB = 2.5TB/day CDN outbound; inbound audio reference uploads ~100GB/day',
      qps: '500K/day = ~6 generation requests/sec average; 5K concurrent jobs at peak; 50K playback API requests/sec',
    },

    apiDesign: {
      description: 'REST API for generation jobs, library management, and audio delivery',
      endpoints: [
        { method: 'POST', path: '/api/v1/generate', params: '{ prompt, duration_seconds, style_tags[], bpm?, key?, reference_audio_url?, continuation_of? }', response: '{ job_id, queue_position, estimated_seconds, credits_charged }', description: 'Submit a generation job; returns immediately with job_id for polling' },
        { method: 'GET', path: '/api/v1/jobs/{job_id}', params: '', response: '{ status: queued|processing|completed|failed, progress_pct, audio_url?, waveform_url?, metadata }', description: 'Poll job status; audio_url available when completed' },
        { method: 'GET', path: '/api/v1/library', params: 'cursor, limit=20, sort=created_at|plays', response: '{ tracks[{id, title, prompt, duration, audio_url, created_at, play_count}], next_cursor }', description: 'User\'s generated track library' },
        { method: 'POST', path: '/api/v1/tracks/{track_id}/stems', params: '{ stems: ["vocals", "drums", "bass", "melody"] }', response: '{ job_id }', description: 'Request stem separation for a generated track; async job' },
        { method: 'GET', path: '/api/v1/tracks/{track_id}/similarity', params: '', response: '{ flagged: boolean, max_similarity: float, matches[{title, artist, similarity}] }', description: 'Copyright similarity report for a track' },
      ],
    },

    dataModel: {
      description: 'Generation jobs, track library, credit ledger, and copyright match records',
      schema: `generation_jobs {
  id: uuid PK
  user_id: uuid FK
  prompt: text
  duration_seconds: int
  style_tags: text[]
  bpm: int nullable
  reference_audio_s3_key: varchar(512) nullable
  continuation_of_track_id: uuid nullable FK
  status: enum(queued, processing, completed, failed, blocked_by_copyright)
  gpu_instance_id: varchar(64) nullable
  model_version: varchar(32)
  credits_charged: int
  created_at: timestamp
  completed_at: timestamp nullable
}

tracks {
  id: uuid PK
  user_id: uuid FK
  job_id: uuid FK
  title: varchar(256)
  prompt: text
  duration_seconds: int
  audio_s3_key: varchar(512)
  waveform_s3_key: varchar(512)  -- precomputed waveform JSON for player display
  stems: jsonb nullable           -- {vocals_s3_key, drums_s3_key, ...}
  audio_fingerprint: varchar(256) -- acoustic fingerprint for similarity lookup
  play_count: int
  is_public: boolean
  expires_at: timestamp nullable  -- null for paid tier
  created_at: timestamp
}

credit_ledger {
  id: uuid PK
  user_id: uuid FK
  delta: int                      -- positive = credit, negative = charge
  reason: varchar(64)
  reference_job_id: uuid nullable FK
  balance_after: int
  created_at: timestamp
}

copyright_checks {
  id: uuid PK
  track_id: uuid FK
  checked_at: timestamp
  max_similarity: float
  matches: jsonb                  -- [{title, artist, isrc, similarity, segment_start_sec}]
  blocked: boolean
}`,
      examples: [
        { table: 'generation_jobs', label: 'Completed generation job', json: `{ "id": "job-a1b2", "user_id": "usr-9012", "prompt": "upbeat 80s synthwave with pulsing bass and neon vibes, 128 BPM", "duration_seconds": 120, "style_tags": ["synthwave", "80s", "electronic"], "bpm": 128, "status": "completed", "model_version": "musicgen-v3.1", "credits_charged": 10, "created_at": "2025-05-01T14:00:00Z", "completed_at": "2025-05-01T14:00:22Z" }` },
        { table: 'copyright_checks', label: 'Copyright check result', json: `{ "id": "cc-001", "track_id": "trk-abc", "checked_at": "2025-05-01T14:00:25Z", "max_similarity": 0.34, "matches": [{"title": "Running Up That Hill", "artist": "Kate Bush", "isrc": "GBARL8500100", "similarity": 0.34, "segment_start_sec": 12}], "blocked": false }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A REST endpoint accepts generation requests, runs the model synchronously on a single GPU server, and returns the audio file URL in the API response after the model finishes.',
      problems: [
        'Synchronous generation blocks the API server thread for 10-30 seconds per request, limiting throughput to a handful of concurrent users',
        'A single GPU server becomes a single point of failure — any hardware issue brings down the entire service',
        'No queue means demand spikes cause API timeouts rather than graceful degradation',
        'No copyright check before delivery — legally risky and requires post-delivery recall if similar to a copyrighted track',
        'No credit system means a single user can exhaust all GPU capacity with bulk requests',
      ],
    },

    advancedImplementation: {
      title: 'Async GPU Job Queue with Copyright Pipeline and Adaptive Capacity',
      description: 'Generation requests are enqueued immediately and processed by a pool of GPU workers (auto-scaling A100 cluster). Each worker pulls a job, runs the generation model, runs copyright similarity check, and writes the result to S3. A WebSocket or polling endpoint notifies the client when the job completes. GPU capacity pre-warms based on historical demand patterns and scales to handle spikes using a combination of reserved instances and on-demand GPU spot instances.',
      keyPoints: [
        'Redis-based job queue with priority lanes: paid users go to the high-priority lane, free users to the standard lane; jobs within each lane are FIFO; paid users see under 30-second waits while free users may wait up to 5 minutes during peak',
        'GPU worker pool uses NVIDIA A100s with each worker handling one generation job at a time due to the model\'s memory requirements; 4 parallel jobs per GPU is possible with smaller models but reduces quality',
        'Copyright detection uses acoustic fingerprinting (similar to Shazam\'s technique): generate a fingerprint of the output audio, query a database of known song fingerprints, block outputs with similarity above 0.85; this runs in under 1 second and is appended to the generation pipeline before the result is made available',
        'Waveform pre-computation runs as a side effect of job completion: a lightweight job computes the visual waveform data (amplitude per 10ms bucket) and stores it alongside the audio file; the player displays this without streaming the full audio file',
        'Predictive auto-scaling: historical traffic shows a 3x spike on weekday evenings and after viral moments; the scaling controller pre-provisions 30% extra GPU capacity 15 minutes before predicted peak using demand forecasting',
        'Stem separation is a separate async job that runs on the completed track using a source separation model (like Demucs); charged as a separate credit operation since it requires a second GPU pass',
      ],
      databaseChoice: 'PostgreSQL for jobs, tracks, users, and credit ledger; Redis for job queue (sorted sets for priority lanes) and hot track metadata; S3 for audio files and waveform data with CloudFront CDN for delivery; a fingerprint database (custom inverted index or commercial service like ACRCloud) for copyright checking',
      caching: 'CloudFront CDN for generated audio delivery (single-use pre-signed URLs expire after 1 hour for download; permanent URLs for the user\'s own library with auth check); waveform JSON cached at CDN edge since it is static after generation; user credit balance cached in Redis with write-through on every transaction',
    },

    tips: [
      'Lead with the async job queue architecture — this is the defining architectural decision for any GPU-heavy generation service',
      'Discuss GPU cost explicitly: a single A100 GPU costs $2-3 per hour to rent; with 2-4 generations per GPU per hour, each generation costs $0.50-$1.50 in GPU cost — explain how the credit system maps to this cost',
      'Copyright detection is a legal necessity, not an optional feature — interviewers in this domain expect you to raise it and describe the fingerprinting approach',
      'Stem separation is a good follow-up feature to discuss because it demonstrates you understand that the output of generation is not just an audio file but a platform for further production work',
      'Predictive auto-scaling matters because GPU instances take 5-10 minutes to provision — reactive scaling alone cannot handle sudden demand spikes; forecasting is necessary',
      'Discuss the quality vs speed tradeoff: fewer diffusion steps = faster generation but lower quality; premium tier users get full-quality generation, free tier gets a faster lower-quality model',
    ],

    keyQuestions: [
      {
        question: 'How does the generation model work and why is it GPU-intensive?',
        answer: `**Modern music generation models** use one of two approaches:

**Approach 1 — Diffusion models** (e.g., Google MusicLM, Stability Audio):
\`\`\`
Start with random noise in the audio latent space
Iteratively denoise over N steps (typically 50-200 steps)
At each step, a large transformer predicts the noise component to remove
Text prompt conditions each denoising step via cross-attention

GPU intensity:
  - Each step = one forward pass through a 1B+ parameter transformer
  - 100 steps * 1B params * float16 = ~100GB of computation per track
  - Memory: model weights 2-4GB, activations 8-16GB → fills an A100 80GB
  - Time: ~5-15 seconds on A100 for 30-second audio at 50 steps
\`\`\`

**Approach 2 — Autoregressive token generation** (e.g., Suno, Audiocraft):
\`\`\`
Encode audio as discrete tokens using a neural codec (EnCodec)
Generate token sequences autoregressively like a language model
Decode tokens back to audio waveform

GPU intensity:
  - 30-second audio at 24kHz = ~750 tokens per second × 8 codebook layers = 6000 tokens
  - At 1000 tokens/sec generation speed → 6 seconds per 30s audio
  - Faster than diffusion but still requires large GPU for quality
\`\`\`

**Why this matters for system design**:
- Low parallelism per GPU: 1-4 jobs max per GPU vs 50+ for text generation
- Cold model loading time: loading 4GB weights from disk takes 30-60 seconds → keep workers warm
- No token streaming like text LLMs: audio must be fully generated before it can play (or use progressive generation with chunked delivery)`,
      },
      {
        question: 'How do you detect copyright infringement in AI-generated audio?',
        answer: `**The legal risk**: If the generation model memorized copyrighted songs during training, it might reproduce them — even if the user did not ask for a specific song. The system must detect this before delivering the output.

**Acoustic fingerprinting approach** (similar to how Shazam identifies songs):

**Offline indexing** (pre-built database):
\`\`\`
For every song in the protected catalog (millions of songs):
  Extract acoustic fingerprint:
    Compute spectrogram of the audio
    Identify landmark points (local maxima in time-frequency space)
    Create hash pairs: (freq1, freq2, time_delta) → song_id + timestamp
  Store in an inverted index: hash → [(song_id, timestamp), ...]
\`\`\`

**Online checking** (for each generated track):
\`\`\`
Generate acoustic fingerprint of the new track
Query the inverted index for each fingerprint hash
Count matches by (song_id, time_offset): consistent matches = similarity hit
Compute similarity score: (matching hashes) / (total fingerprint hashes)

If similarity > 0.85 to any known song → block delivery
If similarity 0.60-0.85 → flag for human review
If similarity < 0.60 → clear for delivery
\`\`\`

**Limitations and mitigations**:
- Pitch-shifted versions may evade fingerprinting → add pitch-invariant features (chroma features)
- New releases not in database yet → use a music distributor API to keep database current
- Melodies can be similar without copyright violation (12-bar blues is not copyrightable) → threshold tuning with legal guidance

**Why not use embedding similarity**:
Fingerprinting is faster (milliseconds vs seconds) and more precise for exact/near-exact matches. Embedding similarity is better for semantic similarity but produces too many false positives for copyright detection where only substantial similarity matters.`,
      },
    ],

    keyDecisions: [
      'Async job queue vs synchronous API — chose async because GPU generation takes 5-30 seconds; synchronous calls would time out or block server threads; async enables graceful queue management and priority lanes',
      'A100 GPUs vs T4 for generation — chose A100 because music generation models require 16-40GB VRAM for quality output; T4s (16GB) cannot run the full model; A100s deliver 2-3x faster generation despite higher cost per hour',
      'Acoustic fingerprinting vs neural similarity for copyright detection — chose fingerprinting because it is 100x faster, highly precise for near-exact matches, and has established legal precedent (Shazam\'s fingerprinting is court-accepted); neural similarity adds recall for paraphrased melodies but produces legal ambiguity',
      'Predictive auto-scaling vs reactive scaling — chose predictive because GPU provisioning takes 5-10 minutes; reactive scaling cannot absorb sudden viral demand spikes; historical patterns make prediction reliable for known peaks',
      'Per-user credit system vs flat subscription — chose credits because generation cost varies dramatically by duration and quality; credits map directly to GPU cost and prevent individual users from consuming disproportionate cluster resources',
    ],
  },

  // ─── 9. AI Art Generation ────────────────────────────────────────────────────
  {
    id: 'ai-art-generation',
    isNew: true,
    title: 'AI Art Generation System',
    subtitle: 'Midjourney / Adobe Firefly / Stable Diffusion API',
    icon: 'cpu',
    color: '#8b5cf6',
    difficulty: 'Medium',
    description: 'Design an AI image generation platform that converts text prompts into high-quality images, supports multiple model styles and customization via reference images, handles bursty GPU demand, and enforces content safety at scale.',

    introduction: `AI image generation has compressed the time from creative concept to visual artifact from hours (for a skilled illustrator) to seconds. Platforms like Midjourney have demonstrated that millions of users will pay for this capability, generating over 2.5 billion images per month at peak. The engineering behind this is a complex fusion of GPU cluster management, async job pipelines, and content safety systems that must operate at the speed of creative exploration.

Unlike most software services where requests complete in milliseconds, image generation takes 3-30 seconds depending on resolution, number of diffusion steps, and model size. This fundamentally changes the API design: the service cannot respond synchronously. Instead, every generation request creates an asynchronous job, the client polls or receives a webhook notification, and the generated image is delivered via a CDN URL after completion.

The product experience users expect — generating four variants of an image simultaneously, then upscaling the chosen one — creates interesting system design challenges. Generating four images in parallel requires four concurrent GPU slots. Upscaling requires a different, lighter model that runs on the output of the first generation step. The system must manage these dependency chains across distributed workers without the user experiencing coordination complexity.

Content safety is non-negotiable. Users will attempt to generate not-safe-for-work images, images of real people in inappropriate contexts, and content that violates platform terms of service. A multi-layer safety system must run on both the input prompt (before generation wastes GPU) and the output image (before delivery to the user), fast enough to not materially increase latency.`,

    functionalRequirements: [
      'Generate images from text prompts with configurable resolution (512px to 2048px), aspect ratio, and quality settings',
      'Support image-to-image generation using a reference image to guide style and composition',
      'Generate four variant images per prompt by default; user selects one to upscale to full resolution',
      'Apply LoRA adapters for custom style fine-tuning (e.g., specific art style, brand style guide)',
      'Perform inpainting (edit a selected region) and outpainting (extend image beyond borders)',
      'Filter prompts and output images for NSFW content, real person likeness, and brand trademark violations',
      'Track per-user generation history with ability to re-run or vary any past generation',
      'Provide a watermarking and provenance system to identify AI-generated images',
    ],

    nonFunctionalRequirements: [
      'Queue wait time under 15 seconds for paid users during normal load; under 5 seconds for premium tier',
      'Standard 512px generation completed within 8 seconds of reaching a GPU worker',
      'Content safety checks completed within 500ms on both prompt and output image',
      'GPU cluster utilization above 75% to control cost while maintaining latency SLAs',
      '99.9% job completion rate with automatic retry and failure notification',
    ],

    estimation: {
      users: '3M daily active users; 20M images generated per day; 50K concurrent generation jobs at peak',
      storage: '20M images/day * 1MB avg = 20TB/day; 7-day active storage + 90-day archive = ~1.8PB rolling',
      bandwidth: '20M downloads/day * 1MB = 20TB/day CDN outbound; input reference images ~2TB/day inbound',
      qps: '20M/day = ~230 generation requests/sec average; 50K concurrent jobs at peak; 500K image view QPS via CDN',
    },

    apiDesign: {
      description: 'REST API for generation, variation, editing, and delivery',
      endpoints: [
        { method: 'POST', path: '/api/v1/generate', params: '{ prompt, negative_prompt?, width, height, steps=30, model_id, reference_image_url?, strength?, lora_id?, seed? }', response: '{ job_id, queue_position, estimated_seconds }', description: 'Submit generation job; negative_prompt for exclusion guidance; reference image for img2img' },
        { method: 'GET', path: '/api/v1/jobs/{job_id}', params: '', response: '{ status, images[{url, width, height, seed}], nsfw_filtered_count, credits_used }', description: 'Poll job status; images array populated when completed' },
        { method: 'POST', path: '/api/v1/upscale', params: '{ source_image_url, scale_factor: 2|4, model: real_esrgan|latent_diffusion }', response: '{ job_id }', description: 'Upscale a selected variant to 2x or 4x resolution' },
        { method: 'POST', path: '/api/v1/inpaint', params: '{ image_url, mask_url, prompt, strength }', response: '{ job_id }', description: 'Edit a masked region of an existing image guided by the prompt' },
        { method: 'POST', path: '/api/v1/loras', params: '{ name, training_images: [url], style_description, base_model_id }', response: '{ lora_id, training_job_id }', description: 'Train a custom LoRA adapter from user-provided style reference images' },
      ],
    },

    dataModel: {
      description: 'Generation jobs, image records, LoRA adapters, and safety records',
      schema: `generation_jobs {
  id: uuid PK
  user_id: uuid FK
  prompt: text
  negative_prompt: text nullable
  model_id: varchar(64)
  lora_id: uuid nullable FK
  reference_image_s3_key: varchar(512) nullable
  width: int
  height: int
  steps: int
  seed: bigint
  batch_size: int                -- typically 4 for variant generation
  status: enum(queued, safety_check, processing, upscaling, completed, failed, blocked)
  gpu_worker_id: varchar(64) nullable
  credits_charged: int
  created_at: timestamp
  completed_at: timestamp nullable
}

generated_images {
  id: uuid PK
  job_id: uuid FK
  user_id: uuid FK
  s3_key: varchar(512)
  cdn_url: varchar(512)
  width: int
  height: int
  seed: bigint
  is_upscaled: boolean
  watermark_id: varchar(64)      -- C2PA provenance credential ID
  nsfw_score: float
  nsfw_flagged: boolean
  created_at: timestamp
}

lora_adapters {
  id: uuid PK
  user_id: uuid FK
  name: varchar(128)
  base_model_id: varchar(64)
  weights_s3_key: varchar(512)
  status: enum(training, ready, failed)
  training_image_count: int
  created_at: timestamp
}

safety_checks {
  id: uuid PK
  job_id: uuid FK
  check_type: enum(prompt, output)
  nsfw_score: float
  real_person_detected: boolean
  trademark_detected: boolean
  action_taken: enum(allowed, filtered, blocked)
  checked_at: timestamp
}`,
      examples: [
        { table: 'generation_jobs', label: 'Completed 4-variant generation job', json: `{ "id": "job-9a1b", "user_id": "usr-4028", "prompt": "cyberpunk cityscape at dusk, neon reflections on wet streets, cinematic, 8k", "model_id": "sdxl-v1.0", "width": 1024, "height": 768, "steps": 30, "seed": 418293741, "batch_size": 4, "status": "completed", "credits_charged": 4, "created_at": "2025-05-01T16:00:00Z", "completed_at": "2025-05-01T16:00:18Z" }` },
        { table: 'safety_checks', label: 'Prompt-level safety check result', json: `{ "id": "sc-001", "job_id": "job-9a1b", "check_type": "prompt", "nsfw_score": 0.03, "real_person_detected": false, "trademark_detected": false, "action_taken": "allowed", "checked_at": "2025-05-01T16:00:01Z" }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A single GPU server processes one image generation request at a time synchronously. The REST API holds the HTTP connection open until the image is ready, then returns the image URL.',
      problems: [
        'Holding HTTP connections open for 8-30 seconds per generation depletes connection pool and causes timeouts at scale',
        'Single GPU server cannot handle 230 requests per second — it becomes an immediate bottleneck',
        'No content safety check means NSFW content is generated and delivered before detection',
        'Generating four variants synchronously means the API holds a connection for 4x the generation time',
        'No job persistence means server restart loses all in-progress generations with no recovery path',
      ],
    },

    advancedImplementation: {
      title: 'Async GPU Pipeline with Safety Layers, Batched Variant Generation, and CDN Delivery',
      description: 'Generation requests are validated by a prompt safety classifier, then enqueued to a priority-tiered Redis job queue. GPU workers pull batches of four variant seeds per job and generate all four images in a single batched forward pass through the diffusion model. Output images pass through an image safety classifier before being written to S3. A CloudFront CDN serves images with pre-signed URLs. Upscaling runs on a separate lightweight GPU pool to avoid blocking the main generation queue.',
      keyPoints: [
        'Prompt safety classifier runs synchronously on the API server before enqueuing: a fine-tuned text classifier rejects prompts that violate policy within 50ms, saving GPU resources on jobs that would be blocked anyway',
        'Four-image batch generation: diffusion models support batched inference natively; generating 4 images in a single forward pass uses only ~30% more GPU memory than generating 1 image but reduces job overhead by 4x',
        'Output image safety uses a vision classifier (CLIP-based for NSFW detection, face recognition for real person detection) on all four output images before any are made available; images with nsfw_score > 0.7 are individually filtered without blocking the entire job',
        'C2PA (Coalition for Content Provenance and Authenticity) watermarking embeds an invisible cryptographic credential in each generated image identifying it as AI-generated, the model version, and timestamp — provides provenance without visible watermark',
        'LoRA adapter caching on GPU workers: frequently used LoRA adapters are kept loaded in GPU memory; loading a LoRA takes 2-3 seconds from cold storage, so hot LoRAs are pre-loaded at worker startup with an LRU eviction policy',
        'Separate upscaling GPU pool: upscaling (Real-ESRGAN, latent diffusion) is lighter than generation (fits on T4 GPUs); keeping a separate pool prevents upscaling requests from blocking generation capacity',
        'Demand-based auto-scaling: the GPU cluster auto-scales based on job queue depth and average wait time; spot instances fill burst capacity at 60-70% cost reduction during normal demand; reserved instances provide baseline capacity',
      ],
      databaseChoice: 'PostgreSQL for jobs, images, users, and LoRA records; Redis for job queue (sorted sets per priority tier) and worker job assignment; S3 for image storage with intelligent tiering (SSD tier for recent, standard for archive); CloudFront CDN for image delivery; Weaviate or pgvector for semantic similarity search over generation history',
      caching: 'CloudFront CDN serves all generated images; cache-control headers set to immutable since image content never changes after generation; user generation history paginated and cached in Redis for 5 minutes; model weights and LoRA adapters cached in GPU memory with LRU eviction per worker',
    },

    tips: [
      'The async job queue with polling is the cornerstone of this design — lead with it and explain why synchronous is not feasible',
      'Batch generation of four variants in one pass is a key insight — most candidates suggest four sequential jobs rather than a single batched job, missing the efficiency gain',
      'Content safety has two stages: prompt classification (before GPU) and image classification (after GPU) — both are necessary for different reasons and interviewers notice if you only mention one',
      'C2PA provenance is an emerging industry standard that interviewers from tech-forward companies appreciate — it shows you follow developments in the space',
      'The LoRA fine-tuning feature is architecturally interesting because it requires a training pipeline in addition to the inference pipeline — discuss how training jobs are isolated from serving capacity',
      'GPU utilization targeting (75%+ target) shows you understand the economics: too low wastes money, too high means queue wait time spikes',
    ],

    keyQuestions: [
      {
        question: 'How does latent diffusion work, and why can you generate 4 images nearly as fast as 1?',
        answer: `**Latent Diffusion Models (LDMs)** — the architecture behind Stable Diffusion — operate in a compressed latent space rather than pixel space, making them 8-16x more memory-efficient than pixel-space diffusion.

**How it works**:
\`\`\`
Step 1 — Encode: image (512x512x3 pixels) → latent (64x64x4)
  Compression by VAE encoder: 8x spatial reduction, 3→4 channels
  Latents are ~200x smaller than pixel space

Step 2 — Diffusion in latent space (the expensive part):
  Start with random noise in latent space
  Repeat N=30-50 times:
    UNet predicts noise conditioned on text prompt (via cross-attention with CLIP text embedding)
    Remove predicted noise from current latent
  Each step: one UNet forward pass on (64x64x4) latent

Step 3 — Decode: latent (64x64x4) → image (512x512x3)
  VAE decoder reconstructs full-resolution pixel image
\`\`\`

**Why 4 images barely costs more than 1**:
\`\`\`
Each diffusion step = one UNet forward pass
Batch inference: process N latents in parallel on GPU
  Batch=1: 30 forward passes × 1ms each = 30ms GPU time
  Batch=4: 30 forward passes × 1.3ms each = 39ms GPU time (30% overhead)
  → 4 images take only 30% more time than 1 image!

Memory: each latent = 64*64*4*2bytes = 128KB
  4 latents = 512KB → negligible vs model weights (4-8GB)
\`\`\`

**Practical implication for system design**:
Never generate images one at a time if the user wants variants. Schedule batch_size=4 jobs as a single GPU task. The user gets 4 options for the marginal cost of 30% extra GPU time, dramatically improving UX while keeping costs nearly the same per-job.`,
      },
      {
        question: 'How do you enforce content safety without blocking legitimate creative requests?',
        answer: `**The challenge**: "sunset over the ocean" is clearly safe. "explicit adult content" is clearly blocked. Between these extremes is a large gray zone: fantasy violence, artistic nudity, dark themes, political satire, and horror — all of which have legitimate creative applications.

**Multi-stage safety system**:

**Stage 1 — Prompt classification** (before GPU, synchronous, <50ms):
\`\`\`
Binary classifier (fine-tuned BERT or LLM):
  Input: prompt text + negative_prompt
  Outputs: nsfw_score, violence_score, real_person_score, trademark_score

Action thresholds:
  nsfw_score > 0.90 → block immediately, return 400 "prompt policy violation"
  nsfw_score 0.60-0.90 → require "adult content" toggle in account settings
  real_person_score > 0.80 → verify no "depicting in harmful scenario" context, else block
  trademark_score > 0.80 → allow generation but watermark as "may contain trademark"
\`\`\`

**Stage 2 — Output image classification** (after GPU, <200ms per image):
\`\`\`
Vision classifier on each generated image:
  CLIP-based NSFW detector: compare image embedding to NSFW concept embeddings
  Face detector: if faces detected, check against known public figure database

Action thresholds:
  image_nsfw_score > 0.85 → filter this specific image variant (others in batch still delivered)
  All 4 images filtered → return error "content policy violation" and refund credits
\`\`\`

**Avoiding over-blocking legitimate requests**:
- Artist mode toggle for professional accounts (unlocks more latitude on violence/gore for horror/game art)
- False positive reporting: users appeal blocked prompts; human reviewer checks and adjusts thresholds
- Monthly calibration: review precision/recall of both classifiers; adjust thresholds to maintain <1% false positive rate for safe content

**What the system does NOT block**:
- Artistic nudity in classical/fine art style (threshold calibrated against historical art datasets)
- Fantasy violence in clearly non-photorealistic styles (cartoon/animated)
- Political satire of public figures in clearly satirical contexts`,
      },
    ],

    keyDecisions: [
      'Async polling vs WebSocket for job completion notification — chose polling for simplicity at scale; WebSocket requires maintaining millions of persistent connections; polling with 2-second interval is acceptable UX for 8-30 second jobs',
      'Batch 4 variants in one GPU job vs 4 separate jobs — chose single batched job because batch inference costs only 30% more GPU time vs 4x for sequential; this insight is central to the unit economics of the platform',
      'Separate upscaling GPU pool vs shared pool — chose separate pool because upscaling workload profile (lighter, T4-compatible) is different from generation (heavy, A100 required); mixing them either wastes A100 capacity or blocks upscaling during generation peaks',
      'C2PA invisible watermarking vs visible logo — chose C2PA because visible watermarks degrade image quality and users remove them; cryptographic provenance survives image editing and is machine-verifiable',
      'LoRA hot-loading vs load-on-demand per job — chose hot-loading with LRU eviction because loading a LoRA from S3 takes 3-5 seconds; popular LoRAs are used in 60%+ of jobs and should never have a cold-load penalty',
    ],
  },

  // ─── 10. NPC Dialogue ────────────────────────────────────────────────────────
  {
    id: 'npc-dialogue',
    isNew: true,
    title: 'NPC Dialogue System',
    subtitle: 'AI NPCs / Inworld AI / Convai Game Characters',
    icon: 'messageSquare',
    color: '#f59e0b',
    difficulty: 'Easy',
    description: 'Design an AI-powered NPC (non-player character) dialogue system that gives game characters persistent personalities, long-term memory, and contextually aware conversation capabilities without breaking immersion.',

    introduction: `Traditional game NPCs follow scripted dialogue trees — a predetermined set of branches and responses that players quickly exhaust. Modern AI-powered NPCs can engage in open-ended conversation, remember previous player interactions, react to in-game events, and maintain consistent personality across a session. This creates fundamentally new possibilities for game storytelling but introduces serious engineering constraints.

The critical difference from a standard chatbot application is the real-time latency requirement. A chatbot user waiting 3 seconds for a response on a web page finds it slightly annoying. A player in a game world who asks an NPC a question and waits 3 seconds with no feedback breaks immersion entirely. NPC dialogue systems must complete response generation within 1-2 seconds, including model inference, memory retrieval, and character filtering.

Scale is also unusual. A single game world might have hundreds of NPCs, each capable of holding simultaneous conversations with different players. During peak hours, a popular MMORPG might have 100,000 simultaneous player-NPC conversations. At 5 API calls per minute per conversation, that is over 8,000 LLM inference requests per second — a significant serving challenge.

Character consistency is the hardest quality problem. An NPC blacksmith should not suddenly forget their backstory, start using modern slang, or break character to explain they are an AI. The system must enforce the character's persona, knowledge boundaries (an NPC who lives in a small village should not know about events happening in a distant kingdom unless told by the player), and emotional state (if the player just insulted the NPC, they should be less helpful).`,

    functionalRequirements: [
      'Maintain persistent character persona including backstory, personality traits, relationships, and knowledge scope for each NPC',
      'Remember past player interactions across game sessions, including player name, relationship level, and key events shared',
      'React to in-game world context: current location, time of day in game world, active quests, and recent world events',
      'Enforce knowledge boundaries — NPCs only know what they plausibly could know given their role and location',
      'Manage emotional state: NPCs react to how the player treats them, affecting their helpfulness and tone',
      'Support hundreds of simultaneous NPCs each holding conversations with potentially different players',
      'Provide developer tooling to define NPC personas, knowledge domains, and behavioral constraints without AI expertise',
      'Fall back to canned responses gracefully when the AI service is unavailable, maintaining partial immersion',
    ],

    nonFunctionalRequirements: [
      'Response generation under 1.5 seconds end-to-end for the player',
      'Support 100,000 simultaneous NPC conversations during peak game hours',
      'Character persona consistency above 95% as measured by human evaluators reviewing conversation samples',
      'Offline fallback responses available for all NPCs within 100ms when AI service is unavailable',
      '99.9% uptime for the dialogue service; game worlds must not freeze if the AI backend is degraded',
    ],

    estimation: {
      users: '500K concurrent players at peak; 100K simultaneous NPC conversations; 5,000 unique NPCs across all game worlds',
      storage: '5,000 NPCs * 50KB persona = 250MB persona storage; 100K active conversations * 10KB context = 1GB active context; long-term memory ~10GB total',
      bandwidth: '100K conversations * 3 messages/min * 1KB = 300MB/min sustained; 5GB/hr',
      qps: '100K conversations * 5 messages/min / 60 = 8,300 inference requests/sec peak',
    },

    apiDesign: {
      description: 'REST API for conversation management and NPC configuration; WebSocket for real-time in-game dialogue',
      endpoints: [
        { method: 'POST', path: '/api/v1/conversations', params: '{ npc_id, player_id, world_context: {location, time_of_day, active_quests[], recent_events[]} }', response: '{ conversation_id, opening_line }', description: 'Start a conversation with an NPC; returns opening greeting based on relationship history' },
        { method: 'POST', path: '/api/v1/conversations/{conv_id}/messages', params: '{ player_text, emotion_hint? }', response: '{ npc_text, emotion: neutral|friendly|hostile|scared, memory_updates[], quest_triggers[] }', description: 'Send player message; returns NPC response with state updates' },
        { method: 'GET', path: '/api/v1/npcs/{npc_id}/memory/{player_id}', params: '', response: '{ relationship_level, shared_events[], last_interaction_at, player_known_facts[] }', description: 'Retrieve NPC\'s memory of a specific player' },
        { method: 'PUT', path: '/api/v1/npcs/{npc_id}', params: '{ persona: {name, role, backstory, personality_traits[], knowledge_domains[], forbidden_topics[]} }', response: '{ ok, validation_warnings[] }', description: 'Developer API to create or update NPC persona definition' },
        { method: 'POST', path: '/api/v1/npcs/{npc_id}/world-event', params: '{ event_type, description, affects_npc_knowledge: boolean }', response: '{ ok }', description: 'Notify NPC of a world event that may affect their knowledge or emotional state' },
      ],
    },

    dataModel: {
      description: 'NPC personas, conversation state, player-NPC memory, and dialogue history',
      schema: `npc_personas {
  id: uuid PK
  game_world_id: uuid FK
  name: varchar(128)
  role: varchar(128)
  backstory: text
  personality_traits: text[]
  knowledge_domains: text[]
  forbidden_topics: text[]        -- topics the NPC cannot discuss
  emotional_baseline: enum(friendly, neutral, gruff, fearful)
  system_prompt: text             -- compiled prompt from persona fields
  fallback_responses: jsonb       -- canned responses for offline mode
  updated_at: timestamp
}

player_npc_memory {
  npc_id: uuid FK
  player_id: uuid FK
  relationship_level: float        -- -1.0 (hostile) to 1.0 (ally)
  shared_events: jsonb             -- [{event, timestamp, emotional_impact}]
  player_revealed_facts: text[]    -- what player has told this NPC about themselves
  current_emotional_state: enum(neutral, friendly, hostile, wary)
  last_interaction_at: timestamp
  total_conversations: int
  PRIMARY KEY (npc_id, player_id)
}

active_conversations {
  id: uuid PK
  npc_id: uuid FK
  player_id: uuid FK
  world_context: jsonb             -- location, time, active quests
  message_history: jsonb           -- last N messages for context window
  started_at: timestamp
  last_message_at: timestamp
  -- TTL: auto-expire after 10 minutes of inactivity
}

dialogue_history {
  id: uuid PK
  conversation_id: uuid FK
  turn_index: int
  speaker: enum(player, npc)
  text: text
  emotion: varchar(32)
  timestamp: timestamp
  -- Partitioned by timestamp month; retained 90 days for quality review
}`,
      examples: [
        { table: 'player_npc_memory', label: 'Player who helped NPC with a past quest', json: `{ "npc_id": "npc-blacksmith-001", "player_id": "player-8291", "relationship_level": 0.72, "shared_events": [{"event": "helped_rescue_daughter", "timestamp": "2025-04-15", "emotional_impact": 0.8}], "player_revealed_facts": ["name is Aldric", "is a warrior class", "seeking the lost sword of Vaelthar"], "current_emotional_state": "friendly", "last_interaction_at": "2025-04-28T18:30:00Z", "total_conversations": 7 }` },
        { table: 'npc_personas', label: 'Village blacksmith persona', json: `{ "id": "npc-blacksmith-001", "name": "Garrett Ironforge", "role": "village blacksmith", "personality_traits": ["gruff", "honest", "proud of craftsmanship", "suspicious of outsiders"], "knowledge_domains": ["smithing", "local village gossip", "local roads and dangers"], "forbidden_topics": ["events in the capital", "magic and sorcery", "the king's court"] }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Each NPC has a fixed script of responses stored in a lookup table. Player input is matched to the closest scripted response by keyword matching, and the matching response is returned.',
      problems: [
        'Scripted trees are exhausted within minutes — experienced players quickly find the edge of the conversation space',
        'No memory of past conversations — the player saved the NPC\'s daughter last session and the NPC has no recollection of it this session',
        'No personality consistency — all NPCs respond from the same pool of generic game phrases',
        'Cannot handle any question outside the scripted set — unexpected player inputs return a generic "I don\'t understand" response',
        'Cannot react to world context — an NPC gives the same response whether it is peacetime or the village is currently under siege',
      ],
    },

    advancedImplementation: {
      title: 'LLM-Powered NPC with Persona Enforcement, Long-Term Memory, and Latency Budget',
      description: 'Each NPC has a compiled system prompt encoding persona, knowledge boundaries, emotional state, and current world context. Short-term conversation history (last 8 turns) is maintained in a Redis active conversation. Long-term player-NPC memory is retrieved from a database and injected into the prompt for returning players. A fast model (Haiku-class) is used for standard responses with a latency budget of 1 second. Guardrails check every response before delivery. Offline fallback responses are pre-generated for common scenarios.',
      keyPoints: [
        'Compiled system prompt: persona fields (backstory, traits, knowledge domains, forbidden topics) are compiled once into a compact system prompt at NPC creation; per-conversation context (world state, relationship, recent memory) is appended as a user-turn prefix — this minimizes token usage while maintaining full character context',
        'Latency budget enforcement: the system prompt is limited to 400 tokens; context window to 800 tokens; a fast model (Claude Haiku or GPT-4o-mini) completes generation in 600-900ms on average, fitting the 1.5-second budget',
        'Long-term memory injection: at conversation start, retrieve the top-3 most emotionally significant shared events and key player-revealed facts; inject as a brief "what I remember about this player" prefix; avoids injecting the full history which would overflow the context window',
        'Response guardrail: a lightweight classifier checks every NPC response for character breaks (NPC referring to themselves as an AI, using anachronistic modern language, discussing forbidden topics); if a break is detected, the response is regenerated with an explicit instruction',
        'Emotion state machine: relationship_level tracks trust/hostility accumulated over sessions; current_emotional_state can change within a conversation (player insults NPC → state shifts to hostile → tone of subsequent responses changes); emotional state is included in the context prefix',
        'Offline fallback: pre-generate 20 canned responses per NPC covering common interaction types (greeting, trade request, quest discussion, dismissal); served from Redis with sub-millisecond latency if the AI backend is unavailable; maintains partial immersion even during outages',
      ],
      databaseChoice: 'PostgreSQL for NPC personas and player-NPC memory (persistent, relational); Redis for active conversations with TTL expiry (auto-cleanup after inactivity) and offline fallback response cache; S3 for compiled system prompts and dialogue history archive; Kafka for world event broadcasting to all affected NPCs',
      caching: 'Compiled NPC system prompts cached in Redis per NPC (evicted only on persona update); active conversation context cached in Redis with 10-minute TTL; frequently used NPC personas pinned in application memory for the hottest NPCs in popular game areas; player-NPC memory cached in Redis for active players (cache miss on first conversation after long absence)',
    },

    tips: [
      'The latency budget is the most important constraint — lead with it and explain every design decision in terms of how it fits within 1.5 seconds',
      'Explain the difference between short-term context (in-conversation, Redis) and long-term memory (cross-session, database) — this distinction is what makes NPCs feel like they remember you',
      'Character consistency guardrails are a practical necessity, not a nice-to-have — LLMs do break character, and a blacksmith who says "as an AI language model..." destroys immersion',
      'The offline fallback is an important operational concern — game worlds cannot pause if the AI backend is down; pre-generated canned responses maintain the game experience during degradation',
      'Mention that the NPC knowledge boundary is a design choice that creates interesting gameplay — an NPC who admits they do not know something outside their domain feels more real than one who answers everything',
      'Developer tooling for non-technical game designers is an underappreciated product requirement — the persona definition API should require no understanding of prompting or ML',
    ],

    keyQuestions: [
      {
        question: 'How do you maintain character consistency when LLMs tend to drift from the persona?',
        answer: `**Character drift** is when an NPC starts responding in ways inconsistent with their persona — using modern slang, breaking the fourth wall, discussing topics outside their knowledge, or becoming universally helpful regardless of relationship level.

**Prevention — strong system prompt structure**:
\`\`\`
System prompt (compiled once per NPC persona):
"You are Garrett Ironforge, a village blacksmith in the medieval town of Ashford.
PERSONALITY: gruff, honest, proud of your craft, suspicious of strangers.
KNOWLEDGE: You know about smithing, local village gossip, the roads within 10 miles of Ashford.
YOU DO NOT KNOW: events in the capital, magic, anything outside your village experience.
FORBIDDEN RESPONSES: Never refer to yourself as an AI. Never use modern expressions like 'definitely', 'awesome', 'no problem'. Never break character.
RELATIONSHIP: This player has a FRIENDLY relationship level with you. Treat them with cautious respect.
EMOTIONAL STATE: Currently NEUTRAL. You have no strong feelings about this player at this moment."
\`\`\`

**Detection — post-generation classifier**:
\`\`\`
After each NPC response, run a fast binary classifier:
  "Does this response break character for [NPC name] given their persona?"
  Input: system_prompt summary + generated response
  If break detected → regenerate with explicit instruction:
    "Your previous response broke character. Stay in character as Garrett.
     Do not mention modern concepts. Respond only from Garrett's perspective."
  Max 1 retry to stay within latency budget
\`\`\`

**Emotional state enforcement**:
\`\`\`
Hostile state → response must not offer help proactively
Friendly state → response can share more information
Fear state → response must show hesitation and short answers

After response, classify the emotional tone:
  Did the response match the required state?
  If mismatched → rewrite the emotional framing (not the content)
\`\`\`

**Quality monitoring**: Sample 1% of NPC conversations for human review weekly. Track character consistency score per NPC. Flag NPCs with consistency below 90% for prompt revision.`,
      },
      {
        question: 'How do you scale to 100,000 simultaneous NPC conversations?',
        answer: `**The math**:
\`\`\`
100,000 conversations × 5 messages/min = 500,000 messages/min = 8,333 LLM requests/sec
At $0.001 per request = $8.33/sec = $30K/hour at peak
\`\`\`
This is why cost and latency optimization are both critical.

**Architecture for 8,333 requests/sec**:

**Tier 1 — Fast model routing**:
\`\`\`
Standard NPC responses → fast model (Haiku/GPT-4o-mini): 700ms, $0.0003/request
Important story NPCs → full model (Sonnet/GPT-4o): 1.5s, $0.003/request
Route by NPC importance tier set in persona definition
\`\`\`

**Tier 2 — Request batching**:
\`\`\`
Aggregate NPC requests every 50ms
Send batches of 20-50 requests per API call
Batch inference is 3-5x more GPU-efficient than individual requests
\`\`\`

**Tier 3 — Response caching for common questions**:
\`\`\`
Question: "What do you sell?"
This question asked to the blacksmith NPC 50 times in the last hour
Cache the response for 10 minutes (varies only slightly by relationship level)
Cache key: hash(npc_id + question_embedding_bucket + relationship_tier)
Cache hit rate: ~30% for generic questions
\`\`\`

**Tier 4 — Conversation TTL and cleanup**:
\`\`\`
Active conversations in Redis with 10-minute TTL
Inactive conversations auto-expired: no cleanup job needed
Player leaves the NPC → conversation ends → Redis key expires
Prevents memory accumulation from abandoned conversations
\`\`\`

**Result**: With fast model routing (60% of traffic) + 30% cache hit rate, effective cost is ~$0.0005/request average → ~$4.20/sec at 8,333 rps → $15K/hour. Still significant, but 2x cheaper than naive routing.`,
      },
    ],

    keyDecisions: [
      'Fast model vs quality model for NPC responses — chose fast model as default because 1.5-second latency budget leaves little room for larger models; quality model reserved for story-critical NPCs where immersion is highest-value',
      'Redis for active conversations vs database — chose Redis with TTL expiry because active conversations are short-lived and high-volume; auto-expiry on abandonment avoids a cleanup service; database would add 20-50ms per round trip',
      'Compiled system prompt vs dynamic assembly per request — chose compiled prompt because assembling persona from raw fields per request adds latency and increases token count; compiled prompt is shorter and cached',
      'Per-NPC canned fallbacks vs generic game fallbacks — chose per-NPC canned responses because generic responses ("I don\'t know what you mean") are visibly robotic; NPC-specific canned responses can maintain voice even in fallback mode',
      'LLM-based response guardrails vs rule-based filters — chose lightweight classifier because rule-based filters would need exhaustive modern-slang lists and cannot catch nuanced character breaks; a classifier generalizes from examples',
    ],
  },

  // ─── 11. OCR System ──────────────────────────────────────────────────────────
  {
    id: 'ocr-system',
    isNew: true,
    title: 'OCR System (Text Recognition)',
    subtitle: 'Google Vision OCR / AWS Textract / Tesseract',
    icon: 'search',
    color: '#10b981',
    difficulty: 'Easy',
    description: 'Design a scalable optical character recognition system that extracts text from images and documents with high accuracy across diverse document types, languages, and image quality conditions.',

    introduction: `Optical character recognition is one of the oldest computer vision applications, yet it remains deeply relevant as organizations digitize paper records, extract data from forms, and process receipts, invoices, and identity documents at scale. Modern deep learning-based OCR has dramatically improved on classic approaches — where rule-based systems struggled with handwriting and poor scan quality, neural networks handle these cases with significantly higher accuracy.

A production OCR system serves two fundamentally different workloads. Real-time OCR is needed for mobile apps where a user photographs a receipt and expects the text extracted within seconds. Batch OCR is needed for document digitization pipelines where millions of historical records are processed overnight. These two workloads have different latency, throughput, and cost optimization requirements.

The challenge of document OCR extends beyond simple text recognition. Modern documents are complex: a PDF invoice might contain tables, line items, totals, and header blocks that need to be understood as structured data, not just as a flat sequence of recognized characters. The layout analysis problem — understanding that a column of numbers belongs to a table, that a block of text is a heading vs body copy — is as important as the character recognition problem for business document processing.

Accuracy in adversarial conditions — poor scan quality, skewed pages, low-contrast handwriting, non-standard fonts, mixed languages within a document — is what separates enterprise-grade OCR from consumer demos. The system must detect when it is uncertain and provide confidence scores that downstream applications can use to route low-confidence extractions to human review.`,

    functionalRequirements: [
      'Extract text from images and PDFs with bounding box coordinates per word or line',
      'Support batch processing for high-volume document digitization workloads',
      'Detect and correct common image quality issues: skew, noise, low contrast, and blur',
      'Identify document structure: headers, paragraphs, tables with row and column boundaries, and form fields',
      'Recognize text in at least 50 languages including Latin, CJK (Chinese, Japanese, Korean), Arabic, and Devanagari scripts',
      'Output confidence scores per character, word, and block to enable downstream quality gating',
      'Support handwriting recognition in addition to printed text',
      'Provide searchable PDF output where original image is preserved with extracted text as an invisible layer',
    ],

    nonFunctionalRequirements: [
      'Real-time single-image OCR within 2 seconds end-to-end',
      'Batch processing throughput of at least 1,000 pages per minute across the processing cluster',
      'Printed text recognition accuracy above 99% on clean documents, above 95% on moderately degraded scans',
      'API availability 99.9%; batch job processing availability 99.5% (batch can tolerate brief outages)',
      'Horizontal scalability: add processing capacity without API downtime',
    ],

    estimation: {
      users: '50,000 enterprise API customers; 10M document pages processed per day',
      storage: '10M pages/day * 200KB avg image = 2TB/day input; extracted text ~10KB per page = 100GB/day; 30-day retention = 3TB images + 3GB text',
      bandwidth: '2TB/day inbound for document uploads; 100GB/day outbound for JSON results; batch outputs to customer S3 buckets',
      qps: '10M/day = ~115 pages/sec average; peak 2,000 pages/sec during batch job bursts; real-time API ~500 QPS',
    },

    apiDesign: {
      description: 'REST API for real-time OCR and batch job submission; webhook for batch completion',
      endpoints: [
        { method: 'POST', path: '/api/v1/ocr', params: '{ image_url or base64_image, language_hints[], output_format: json|hocr|pdf, features: ["text", "tables", "forms", "handwriting"] }', response: '{ text_blocks[{text, confidence, bounding_box, block_type}], tables[], forms[], full_text }', description: 'Synchronous real-time OCR for single images or short PDFs' },
        { method: 'POST', path: '/api/v1/batch', params: '{ source_bucket, source_prefix, destination_bucket, destination_prefix, features[], callback_url? }', response: '{ job_id, estimated_minutes }', description: 'Async batch OCR for an S3 prefix of documents; results written to destination bucket' },
        { method: 'GET', path: '/api/v1/batch/{job_id}', params: '', response: '{ status, pages_total, pages_completed, pages_failed, estimated_completion_at }', description: 'Poll batch job progress' },
        { method: 'POST', path: '/api/v1/improve', params: '{ image_url, corrections[{original_text, corrected_text, bounding_box}] }', response: '{ ok }', description: 'Submit human corrections for model improvement; feeds retraining pipeline' },
        { method: 'GET', path: '/api/v1/languages', params: '', response: '{ supported[{code, script, accuracy_tier: high|medium|experimental}] }', description: 'List supported languages with accuracy tier information' },
      ],
    },

    dataModel: {
      description: 'OCR jobs, extraction results, correction history, and language model registry',
      schema: `ocr_jobs {
  id: uuid PK
  customer_id: uuid FK
  job_type: enum(realtime, batch)
  source_s3_keys: text[]
  features: text[]
  language_hints: text[]
  status: enum(queued, processing, completed, failed)
  pages_total: int
  pages_completed: int
  pages_failed: int
  model_version: varchar(32)
  created_at: timestamp
  completed_at: timestamp nullable
}

ocr_results {
  id: uuid PK
  job_id: uuid FK
  source_s3_key: varchar(512)
  page_number: int
  full_text: text
  confidence_avg: float
  blocks: jsonb            -- [{text, confidence, bbox, block_type, language}]
  tables: jsonb            -- [{rows: [[cell_text, cell_confidence]], bbox}]
  forms: jsonb             -- [{field_name, field_value, confidence, bbox}]
  processing_ms: int
  processed_at: timestamp
}

human_corrections {
  id: uuid PK
  result_id: uuid FK
  original_text: varchar(512)
  corrected_text: varchar(512)
  confidence_at_time: float
  corrected_by: uuid FK
  corrected_at: timestamp
  -- Used as training signal for model improvement
}`,
      examples: [
        { table: 'ocr_results', label: 'Invoice page with table extraction', json: `{ "id": "res-001", "job_id": "job-batch-2025", "page_number": 1, "full_text": "INVOICE #10482\nDate: 2025-05-01\nItem: Cloud Storage - 500GB\nAmount: $49.99", "confidence_avg": 0.97, "tables": [{"rows": [["Item", "Qty", "Price"], ["Cloud Storage - 500GB", "1", "$49.99"]], "bbox": {"x1": 50, "y1": 200, "x2": 550, "y2": 320}}], "processing_ms": 843 }` },
        { table: 'human_corrections', label: 'Low-confidence extraction corrected by reviewer', json: `{ "id": "corr-042", "result_id": "res-088", "original_text": "3niom", "corrected_text": "Snion", "confidence_at_time": 0.42, "corrected_at": "2025-05-01T11:20:00Z" }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Each API request runs Tesseract OCR directly on the received image and returns the extracted text as a plain string without structural information or confidence scores.',
      problems: [
        'Tesseract processes one image per thread — cannot scale to handle 2,000 pages per second without an unmanageable number of threads',
        'No image preprocessing means skewed or low-contrast documents have dramatically higher error rates',
        'No batch job management — customers must submit pages one by one and poll each result individually',
        'No table or form structure extraction — all text is returned as a flat string losing layout context',
        'No confidence scores — downstream applications cannot distinguish high-confidence extractions from error-prone ones',
      ],
    },

    advancedImplementation: {
      title: 'Multi-Stage OCR Pipeline with Layout Analysis and Confidence-Based Routing',
      description: 'Documents enter an image preprocessing pipeline (deskew, denoise, binarize, contrast enhance) before OCR inference. A layout analysis model identifies regions as text blocks, tables, forms, or figures before recognition runs, enabling specialized models per region type. A language identification step routes to the optimal recognition model per script. Confidence scoring is calibrated per model and region type. Human review is triggered for pages or fields below configurable confidence thresholds. Batch jobs use a Celery or similar task queue with horizontal GPU worker scaling.',
      keyPoints: [
        'Image preprocessing pipeline runs on CPU and corrects the most common quality issues: deskew using Hough transform line detection, binarization with adaptive thresholding (handles variable page lighting), noise removal with median filter, and contrast normalization',
        'Layout analysis runs a lightweight object detection model (fine-tuned on document regions) before recognition: classifying regions as text, table, figure, or form field enables routing each region to the specialized model that performs best on that type',
        'Text recognition uses a CRNN (Convolutional Recurrent Neural Network) with CTC loss for scene text; a transformer-based model for handwriting; both use beam search decoding with a language model for post-processing correction',
        'Confidence calibration: the raw softmax probabilities from the recognition model are poorly calibrated for real-world confidence estimates; Platt scaling is applied per model to produce reliable confidence scores (a 0.95 confidence score means 95% of such recognitions are correct in held-out testing)',
        'Language model post-processing applies beam search with an N-gram language model conditioned on the detected language; this corrects OCR errors that violate word-level or phrase-level patterns, improving word accuracy by 2-3 percentage points',
        'Human review queue: pages with average confidence below 0.80 or any form field below 0.75 are flagged and routed to a human review interface; corrections feed back into the training pipeline via the human_corrections table',
      ],
      databaseChoice: 'PostgreSQL for job tracking and metadata; S3 for raw images and processed results (JSON and searchable PDF); Redis for job queue and active job status; ClickHouse for processing analytics and accuracy metrics over time; GPU inference cluster (NVIDIA T4s for batch, A10s for real-time to meet latency SLA)',
      caching: 'Preprocessing pipeline output cached in S3 with content-addressable keys so identical documents are not reprocessed; language identification model cached in application memory (200MB model, called on every page); common font embeddings and character templates cached in GPU memory for recognition warmup',
    },

    tips: [
      'Image preprocessing is the most impactful step for accuracy — interviewers often focus on the ML model but preprocessing quality determines whether the model has a fair chance',
      'Layout analysis before recognition is the key architectural insight for structured document processing — without it, tables and forms are just blobs of text',
      'Confidence scores are a product feature, not just a quality metric — they determine which extractions get auto-processed vs routed to human review, directly affecting customer cost',
      'The two workloads (real-time and batch) have different GPU requirements — real-time needs consistently low latency (premium GPUs, small batches), batch needs high throughput (commodity GPUs, large batches)',
      'Language model post-processing is often overlooked but provides meaningful accuracy gains — it catches character-level OCR errors that produce invalid words',
      'The human correction feedback loop is what enables continuous improvement in production — raw model accuracy has a ceiling, but corrections from the customer\'s own document types can improve significantly over time',
    ],

    keyQuestions: [
      {
        question: 'How does the OCR recognition pipeline work end to end?',
        answer: `**Modern neural OCR pipeline**:

**Step 1 — Text Detection** (where is text on the page?):
\`\`\`
Model: CRAFT (Character Region Awareness For Text) or DBNet
Input: full page image
Output: word-level bounding boxes
Key insight: detect individual characters first, then group into words and lines
Runs on GPU: ~50ms for a standard page
\`\`\`

**Step 2 — Region Cropping**:
\`\`\`
Extract each detected text region as a cropped image patch
Normalize to fixed height (32px) preserving aspect ratio
These patches are the input to the recognition model
\`\`\`

**Step 3 — Text Recognition** (what does the text say?):
\`\`\`
Model: CRNN (CNN + BiLSTM + CTC Loss)
  CNN: extract visual features from the 32px-height patch
  BiLSTM: model sequential dependencies between character positions
  CTC decoder: map variable-length feature sequence to character sequence

Output: character sequence with per-character log probabilities

Beam search decoding:
  Standard: take argmax at each timestep
  With language model: use beam search with 5-gram LM to prefer valid words
  Example: "3niom" → "Snion" vs standard argmax might produce "3niom"
\`\`\`

**Step 4 — Post-processing**:
\`\`\`
Word-level language model scoring: does this word exist in the vocabulary?
  Low-probability word + similar high-probability alternative → substitute
Punctuation and spacing restoration for languages without spaces
Confidence aggregation: min(char confidences) is a good word confidence estimate
\`\`\`

**Handwriting vs printed text**:
- Separate model branches: handwriting uses transformer architecture (TrOCR) rather than CRNN
- Route by detected handwriting probability from the text detection model
- Handwriting is 5-10x more compute intensive and 10-20 points lower accuracy than printed text`,
      },
      {
        question: 'How do you extract structured data from tables in scanned documents?',
        answer: `**Table extraction** is a two-sub-problem: (1) detect and segment the table, (2) parse it into a structured grid.

**Step 1 — Table detection**:
\`\`\`
Object detection model (fine-tuned on document datasets):
  Input: full document page
  Output: bounding boxes of table regions, column header rows
  Models: TableNet, CascadeTabNet, or TATR (Table Transformer)
  Accuracy: 95%+ on well-structured printed tables
\`\`\`

**Step 2 — Cell segmentation**:
\`\`\`
For each detected table region:
  Line detection (Hough transform): find horizontal and vertical table rules
  Cell identification: intersections of rows and columns define cells

For tables without visible lines (whitespace-separated columns):
  Projection profiles: column boundaries inferred from vertical whitespace gaps
  Row boundaries inferred from horizontal whitespace gaps
\`\`\`

**Step 3 — Per-cell OCR**:
\`\`\`
Run recognition model on each cropped cell
Align cells into a grid by (row_index, col_index)
Handle merged cells: cells that span multiple rows or columns need special handling
  Detect via row/column span analysis from bounding boxes

Output:
[
  ["Item", "Quantity", "Unit Price", "Total"],
  ["Widget A", "10", "$5.00", "$50.00"],
  ["Widget B", "3", "$12.00", "$36.00"],
]
\`\`\`

**Confidence per cell**:
- Cells with low OCR confidence flagged for human review
- Critical cells in financial documents (totals, amounts) have lower acceptance thresholds
- Customer-configurable confidence threshold per field type via API parameter

**Verification check**: For invoice tables, sum columns and verify against extracted total — if the sum of extracted line items matches the extracted total, both are validated; discrepancy flags for human review.`,
      },
    ],

    keyDecisions: [
      'Deep learning OCR vs Tesseract — chose deep learning because Tesseract accuracy on degraded documents is 5-15 points lower; deep learning handles fonts, image quality, and handwriting that Tesseract cannot',
      'Layout analysis before recognition vs end-to-end model — chose pipeline with separate layout analysis because specialized models per region type (table model, text model, form model) each outperform a single end-to-end model on their specific region type',
      'Beam search with language model vs greedy decoding — chose beam search because language model post-processing improves word accuracy by 2-3 points; the cost is 3x inference time, which is acceptable for the accuracy gain',
      'Separate real-time and batch processing queues — chose separate queues because batch jobs should not starve real-time API requests; separate queues with different GPU pool priorities ensure real-time SLA is met regardless of batch load',
      'Human correction feedback loop vs pure model accuracy — chose feedback loop because model accuracy plateaus at ~97-98% on generic documents but can reach 99%+ on customer-specific document types with 50-100 corrections; corrections are the highest-ROI improvement mechanism',
    ],
  },

  // ─── 12. AI Agriculture Advisory ─────────────────────────────────────────────
  {
    id: 'ai-agriculture-advisory',
    isNew: true,
    title: 'AI Agriculture Advisory System',
    subtitle: 'Climate.ai / Taranis / John Deere Operations Center',
    icon: 'globe',
    color: '#16a34a',
    difficulty: 'Easy',
    description: 'Design an AI-powered agriculture advisory platform that integrates satellite imagery, IoT soil sensors, and weather data to provide crop disease detection, yield prediction, and irrigation scheduling recommendations to farmers.',

    introduction: `Agriculture faces a critical productivity challenge: global food demand is projected to grow 50-70% by 2050 while arable land expands only marginally. Precision agriculture — applying data-driven insights to optimize inputs (water, fertilizer, pesticides) and maximize yields — is essential to closing this gap. AI makes precision agriculture accessible to smallholder farmers who previously lacked access to agronomists and laboratory analysis.

The data sources available to a modern agriculture advisory system are remarkable in their diversity. Satellite imagery at 10-meter resolution updates every 5 days, enabling NDVI (Normalized Difference Vegetation Index) monitoring of crop health across every field. IoT soil sensors measure moisture, temperature, pH, and nutrient levels at 15-minute intervals. Weather station networks provide hyperlocal forecasts. Pest and disease databases encode the visual and environmental signatures of hundreds of crop diseases.

The population this system serves is unique. Smallholder farmers in emerging markets — who constitute most of the world's farming community — often have limited literacy, inconsistent internet connectivity, and conduct most transactions on basic smartphones. The system must work offline when connectivity is unavailable, provide advice in local languages, and be usable via voice interface for farmers who are more comfortable speaking than reading on a screen.

The advisory system also must be conservative in its recommendations. Unlike a recommendation system where a wrong movie suggestion has no consequence, an irrigation advice error or a misidentified crop disease could lead to crop failure and food insecurity for a family. The system should express uncertainty clearly and recommend consulting local extension officers for ambiguous diagnoses rather than providing confident-sounding incorrect advice.`,

    functionalRequirements: [
      'Monitor crop health across registered fields using satellite NDVI imagery updated every 5 days',
      'Detect crop diseases from photos taken by farmers using smartphone cameras, with treatment recommendations',
      'Predict crop yields 4-8 weeks before harvest based on current growth stage, weather forecast, and soil data',
      'Generate irrigation scheduling recommendations based on soil moisture sensor readings and evapotranspiration models',
      'Alert farmers to pest and disease outbreaks spreading in their geographic region',
      'Provide market price feeds and planting recommendations based on expected price trends and input cost analysis',
      'Support offline access to recent recommendations and disease identification with sync when connectivity resumes',
      'Offer advice in local languages via text and voice interface to support low-literacy users',
    ],

    nonFunctionalRequirements: [
      'Disease photo diagnosis within 5 seconds on a standard 4G connection',
      'Offline disease identification functional for the 50 most common local diseases without internet',
      'Satellite imagery refresh within 24 hours of new satellite data availability',
      'Recommendations available in 20 languages across the service regions',
      '99% uptime for the alert notification pipeline; farmers must receive disease outbreak alerts within 2 hours',
    ],

    estimation: {
      users: '5M registered farmers; 100K active users per day; 10M fields monitored',
      storage: '10M fields * 50KB satellite patch/update * 72 updates/year = 36TB/year satellite; IoT: 500K sensors * 96 readings/day * 100B = 5GB/day; disease photos 100K/day * 2MB = 200GB/day',
      bandwidth: 'Satellite data pull from provider ~100MB/day per field region; photo uploads 200GB/day; advisory responses 5GB/day to mobile apps',
      qps: '100K active users * 5 API calls/day = 500K calls/day = ~6 QPS average; disease diagnosis bursts 1,000 QPS during outbreak events',
    },

    apiDesign: {
      description: 'REST API for field monitoring, disease diagnosis, and advisory recommendations',
      endpoints: [
        { method: 'POST', path: '/api/v1/fields', params: '{ name, boundary_geojson, crop_type, planting_date, soil_type }', response: '{ field_id, monitoring_started }', description: 'Register a field for satellite monitoring and advisory services' },
        { method: 'GET', path: '/api/v1/fields/{field_id}/health', params: '', response: '{ ndvi_current, ndvi_trend, health_status: good|watch|alert, satellite_image_url, last_updated_at }', description: 'Current crop health assessment from latest satellite imagery' },
        { method: 'POST', path: '/api/v1/diagnose', params: '{ photo_url or base64_image, field_id?, crop_type, symptoms_description? }', response: '{ diagnosis[{disease, confidence, treatment, severity}], requires_expert_review: boolean }', description: 'Diagnose crop disease from farmer photo; multi-label if multiple diseases detected' },
        { method: 'GET', path: '/api/v1/fields/{field_id}/recommendations', params: 'type=irrigation|fertilizer|pest_control', response: '{ recommendations[{action, reason, urgency, best_date_range}], forecast_used }', description: 'AI-generated actionable recommendations for the field' },
        { method: 'GET', path: '/api/v1/alerts', params: 'lat, lon, radius_km, crop_type?', response: '{ alerts[{type, severity, description, affected_radius_km, detected_at}] }', description: 'Regional pest and disease alerts near the farmer\'s location' },
      ],
    },

    dataModel: {
      description: 'Fields, satellite imagery records, sensor readings, disease diagnoses, and recommendations',
      schema: `fields {
  id: uuid PK
  farmer_id: uuid FK
  name: varchar(128)
  boundary: geometry(POLYGON, 4326)   -- PostGIS field boundary
  area_hectares: float
  crop_type: varchar(64)
  planting_date: date
  soil_type: varchar(64)
  region_id: uuid FK
  created_at: timestamp
}

satellite_observations {
  id: uuid PK
  field_id: uuid FK
  observed_at: date
  ndvi_mean: float
  ndvi_std: float
  cloud_cover_pct: float
  image_s3_key: varchar(512)
  source: varchar(32)                 -- sentinel2, planet, etc.
  processed_at: timestamp
}

soil_sensor_readings {
  sensor_id: varchar(64)
  field_id: uuid FK
  reading_at: timestamp
  moisture_pct: float
  temperature_c: float
  ph: float
  nitrogen_ppm: float nullable
  -- Partitioned by reading_at week
  PRIMARY KEY (sensor_id, reading_at)
}

disease_diagnoses {
  id: uuid PK
  field_id: uuid FK nullable
  farmer_id: uuid FK
  photo_s3_key: varchar(512)
  crop_type: varchar(64)
  diagnoses: jsonb                    -- [{disease, confidence, treatment, severity}]
  requires_expert_review: boolean
  expert_correction: jsonb nullable
  model_version: varchar(32)
  diagnosed_at: timestamp
}`,
      examples: [
        { table: 'disease_diagnoses', label: 'Multi-label disease diagnosis from photo', json: `{ "id": "diag-001", "field_id": "field-farm01-n", "crop_type": "maize", "diagnoses": [{"disease": "Northern Leaf Blight", "confidence": 0.89, "severity": "moderate", "treatment": "Apply mancozeb fungicide at 2.5kg/ha. Remove and destroy heavily infected leaves. Ensure adequate spacing for air circulation."}, {"disease": "Common Rust", "confidence": 0.54, "severity": "mild", "treatment": "Monitor closely. Apply fungicide if infection spreads to upper canopy."}], "requires_expert_review": false, "model_version": "cropnet-v2.3" }` },
        { table: 'satellite_observations', label: 'Satellite observation with NDVI metrics', json: `{ "id": "obs-20250501", "field_id": "field-farm01-n", "observed_at": "2025-05-01", "ndvi_mean": 0.71, "ndvi_std": 0.08, "cloud_cover_pct": 5.2, "source": "sentinel2", "processed_at": "2025-05-02T03:22:00Z" }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Farmers submit disease photos via a mobile app. The photos are sent to an API that runs a single image classification model and returns the top disease prediction. Irrigation advice is based on a lookup table of crop-specific watering schedules.',
      problems: [
        'Single label disease classification misses co-occurring infections, which are common in the field',
        'Fixed irrigation schedules ignore actual soil moisture measurements and local weather conditions',
        'No satellite monitoring means field-level crop stress is only detected when the farmer notices and reports it',
        'No offline functionality means the app is useless during common rural connectivity outages',
        'No regional alert system means disease outbreaks spreading from neighboring farms are not proactively communicated',
      ],
    },

    advancedImplementation: {
      title: 'Multi-Source Fusion Platform with Offline Disease Identification and Regional Alert System',
      description: 'Satellite imagery is automatically processed for all registered fields every 5 days. A multi-label disease classifier provides diagnoses with confidence scores from farmer photos. An evapotranspiration model combines soil sensor data, weather forecasts, and crop growth stage to generate irrigation schedules. A regional outbreak detection system aggregates disease reports across neighboring farms and triggers proactive alerts. The mobile app includes an offline disease identification model (TensorFlow Lite) covering the 50 most common local diseases.',
      keyPoints: [
        'Multi-label disease classification using a CNN fine-tuned on 500,000 annotated crop disease images across 100+ disease classes; multi-label output captures co-occurring infections which are common when crops are stressed',
        'NDVI time-series analysis detects field-specific anomalies: a sudden drop in NDVI compared to the seasonal baseline for that crop type and region triggers a health alert before the farmer would visually notice the problem',
        'Evapotranspiration-based irrigation model combines Penman-Monteith equation (crop water demand from temperature, humidity, wind, and solar radiation) with soil moisture sensor readings (actual water available) and 7-day weather forecast to produce day-by-day irrigation volume recommendations',
        'Offline disease model: TFLite-compressed model (15MB) downloaded to device covers the 50 most economically significant local diseases; device-local inference returns diagnosis in under 2 seconds without connectivity; results are queued for sync and cloud re-analysis when connectivity is restored',
        'Regional outbreak detection aggregates disease diagnoses across all farms within a 50km radius; if disease X exceeds N diagnoses within 7 days with a geographic cluster pattern, a regional alert is generated and pushed to all farmers growing that crop in the affected area',
        'Voice interface for low-literacy users: text recommendations are converted to audio using a TTS model fine-tuned for local language varieties; farmer can also submit voice descriptions of symptoms which are transcribed and processed by the disease identification pipeline',
      ],
      databaseChoice: 'PostgreSQL with PostGIS extension for field boundary storage and geographic queries; TimescaleDB for soil sensor time-series data; S3 for satellite images and disease photos; Redis for alert broadcasting and offline sync queue; Celery with Redis broker for satellite processing jobs; regional weather API integration (OpenWeather, Tomorrow.io) for forecast data',
      caching: 'Satellite imagery CDN-cached at regional edge nodes (farmers in the same region pull from local CDN rather than origin); NDVI trend data cached per field for 24 hours (refreshed on new satellite observation); disease treatment recommendations cached in the mobile app for offline access; regional alerts cached in Redis with 2-hour TTL and push via Firebase Cloud Messaging',
    },

    tips: [
      'Emphasize the offline-first mobile design early — connectivity is often poor in agricultural regions, and offline capability is not optional but a core product requirement',
      'NDVI satellite monitoring as an anomaly detection system is a key insight — proactive alerts before the farmer notices are more valuable than reactive diagnosis',
      'The conservative confidence threshold for disease diagnosis is an important design choice — explain why you would rather say "requires expert review" than provide a confident-sounding wrong diagnosis',
      'Regional outbreak alerting is an emergent feature from aggregating individual diagnoses — it turns individual user data into a community benefit and justifies data collection',
      'The evapotranspiration model is the agricultural domain-specific knowledge — know the inputs (weather + soil + crop stage) and why a simple lookup table is insufficient',
      'Voice interface is a product feature with significant technical complexity — explain the ASR + TTS pipeline and how you handle dialect variation in local languages',
    ],

    keyQuestions: [
      {
        question: 'How does the disease detection model work, and how do you handle low-quality field photos?',
        answer: `**Disease detection from crop photos** is a multi-label image classification task trained on annotated disease images.

**Model architecture**:
\`\`\`
Base: EfficientNet-B4 or ViT-B/16 fine-tuned on PlantVillage + PlantDoc datasets
  + private labeled data from platform users (annotated by agronomists)

Head: Multi-label binary classification
  Output: sigmoid scores for each of 100+ disease classes
  NOT softmax — a plant can have multiple diseases simultaneously

Threshold per class:
  confidence > 0.80 → report disease as primary finding
  confidence 0.50-0.80 → report as "possible, monitor closely"
  confidence < 0.50 → do not report
\`\`\`

**Handling low-quality field photos**:
\`\`\`
Image quality assessment (runs first, before disease classification):
  Blur detection: Laplacian variance < threshold → "Photo is blurry, please retake"
  Lighting assessment: mean pixel value too dark/bright → "Move to shade/avoid direct sun"
  Field coverage: ensure leaf tissue fills >50% of frame → "Move closer to affected leaves"

If quality is acceptable, run disease classification
If quality is marginal, run classification but add: "requires_expert_review: true"
\`\`\`

**Agronomist confidence calibration**:
- Model trained to match agronomist confidence levels, not just binary correct/wrong
- If 5 agronomists review an image and 3 say Northern Blight (60%), 2 say uncertain (40%):
  model should output confidence ~0.60, not 0.95 or 0.20
- Calibration prevents the system from being overconfident on ambiguous images

**On-device model** (offline mode):
- TFLite INT8 quantized model: 15MB, covers 50 most common diseases
- Inference: 1.5 seconds on mid-range Android (Snapdragon 660)
- Accuracy: ~5% lower than cloud model but sufficient for common high-prevalence diseases`,
      },
      {
        question: 'How do you generate irrigation recommendations that account for both soil moisture and weather forecasts?',
        answer: `**The problem with simple schedules**: "Water every 3 days" ignores whether it rained yesterday (field is already saturated) or whether a heat wave is coming (field will dry faster than normal).

**Evapotranspiration (ET) model approach**:

**Step 1 — Calculate crop water demand (ET0)**:
\`\`\`
Penman-Monteith equation inputs (from weather API + local sensor):
  Temperature (max, min, mean)
  Humidity (relative)
  Wind speed
  Solar radiation (can be estimated from sunshine hours or cloud cover)

ET0 = reference evapotranspiration in mm/day
  A standard metric: water demand for a well-watered grass reference surface

Crop coefficient (Kc) adjusts for specific crop and growth stage:
  Maize at vegetative stage: Kc = 0.7
  Maize at silking stage: Kc = 1.2 (peak water demand)

Crop ET (ETc) = ET0 × Kc → actual crop water need per day
\`\`\`

**Step 2 — Compare with soil moisture**:
\`\`\`
Soil moisture sensor reading: 28% volumetric water content
Field capacity for this soil type: 35%
Wilting point: 18%
Available water: (28% - 18%) / (35% - 18%) = 59% of available water remaining

Threshold: if available water < 50%, irrigation is recommended
Deficit: (35% - 28%) * root_zone_depth_mm = irrigation amount needed
\`\`\`

**Step 3 — Incorporate 7-day forecast**:
\`\`\`
Forecast shows 15mm rain on Day 3
Adjusted recommendation:
  Today: no irrigation (current moisture is adequate)
  Tomorrow: no irrigation (forecast rain approaching)
  Day 3: 15mm rain expected → skip irrigation
  Day 4-5: re-evaluate after rain; likely no irrigation needed
  Day 6: forecast is dry; check sensor reading; if < 50% threshold, irrigate
\`\`\`

**Output to farmer**:
"Do not irrigate for the next 3 days. Rain of 15mm is forecast on [date].
On [Day 6], check your soil moisture. If the reading is below 25%, apply 30mm of water.
Your maize is at peak water demand (silking stage), so do not let soil moisture drop below 50% of field capacity."

This is far more useful than "water every Tuesday."`,
      },
    ],

    keyDecisions: [
      'Multi-label vs single-label disease classification — chose multi-label because co-occurring infections are common when crops are stressed; single-label forces a wrong exclusive choice and misses secondary infections that also need treatment',
      'On-device TFLite model vs cloud-only — chose on-device as fallback because connectivity is unreliable in agricultural areas; the 50-disease on-device model covers 80%+ of economically significant cases even if it lacks the full 100+ disease cloud model coverage',
      'Evapotranspiration model vs soil moisture threshold only — chose ET model because soil moisture alone misses timing: even with adequate current moisture, an upcoming heat wave changes when irrigation is needed; combining ET forecast with current moisture provides better timing',
      'PostGIS for field boundaries vs simple lat/lon — chose PostGIS because agricultural queries are inherently geographic: finding all farms within 50km of an outbreak, computing which fields intersect a drought-affected region, requires polygon operations that PostGIS handles natively',
      'Voice interface vs text only — chose voice interface because literacy rates in target markets can be below 50% for smallholder farmers; voice is not a convenience feature but an accessibility necessity for the majority of the user base',
    ],
  },
];
