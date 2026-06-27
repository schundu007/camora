// AI System Design Problems — Tier B and C

export const aiProblems2Categories = [
  { id: 'ai-ml', name: 'AI & Machine Learning', icon: 'cpu', color: '#7c3aed' },
];

export const aiProblems2CategoryMap = {
  'document-ai-processing': 'ai-ml',
  'time-series-forecasting': 'ai-ml',
  'ai-anomaly-detection': 'ai-ml',
  'automated-tagging': 'ai-ml',
  'voice-assistant-backend': 'ai-ml',
  'ai-tutoring-system': 'ai-ml',
  'customer-support-chatbot': 'ai-ml',
  'code-generation-system': 'ai-ml',
  'text-summarization': 'ai-ml',
  'language-detection': 'ai-ml',
  'ai-analytics-dashboard': 'ai-ml',
  'email-auto-response': 'ai-ml',
};

export const aiProblems2Designs = [
  // ─── B1. Document AI Processing ──────────────────────────────────────────────
  {
    id: 'document-ai-processing',
    isNew: true,
    title: 'Document AI Processing System',
    subtitle: 'AWS Textract / Google Document AI / Adobe Acrobat AI',
    icon: 'layers',
    color: '#3b82f6',
    difficulty: 'Medium',
    description: 'Design a scalable pipeline that ingests unstructured documents (PDFs, scanned images, forms) and extracts structured data using OCR and machine learning.',

    introduction: `Enterprises process millions of documents daily — invoices, contracts, tax forms, insurance claims — most of which arrive as scanned PDFs or images with no machine-readable structure. The core challenge is transforming this unstructured content into structured, queryable data with high accuracy and low latency.

The pipeline must handle wide variation in document quality: high-resolution digital PDFs at one end, faded faxes and smartphone photos at the other. Layout analysis is as important as character recognition — identifying that a block of text is a table cell versus a paragraph heading changes how downstream extraction logic processes it. A single invoice might contain a mix of printed text, handwriting, barcodes, and embedded images.

At scale, the system must handle thousands of pages per minute while maintaining an audit trail for compliance, routing low-confidence extractions to human reviewers without creating a backlog, and continuously improving accuracy through feedback on corrections. The business cost of extraction errors — a misread invoice total, a missed contract clause — makes confidence scoring and human-in-the-loop review non-negotiable for high-stakes documents.`,

    functionalRequirements: [
      'Accept documents via upload API (PDF, PNG, JPEG, TIFF) and async job queue',
      'Perform OCR on scanned images with support for printed and handwritten text',
      'Classify document type (invoice, contract, ID, receipt) and apply type-specific extraction templates',
      'Extract structured fields: key-value pairs, tables, checkboxes, signatures',
      'Return per-field confidence scores and bounding box coordinates',
      'Route low-confidence extractions to a human review queue',
      'Store extraction results as structured JSON alongside original document',
      'Support batch processing for bulk ingestion of historical documents',
    ],

    nonFunctionalRequirements: [
      'Process a 10-page scanned PDF in under 30 seconds end-to-end',
      'Achieve over 95% field-level accuracy on clean digital PDFs, over 85% on poor-quality scans',
      'Support throughput of 10,000 pages per hour in batch mode',
      'Maintain full audit trail of every extraction and human correction',
      'Scale horizontally to handle burst ingestion during business hours',
      'Store documents with encryption at rest and in transit',
    ],

    estimation: {
      users: '500 enterprise customers, each processing 10K-1M documents per month',
      storage: '5 MB avg per document * 50M documents/yr = 250 TB/yr; structured JSON output adds ~5% overhead',
      bandwidth: '5 MB/upload * 100K uploads/day = 500 GB/day inbound; JSON results negligible',
      qps: '~1,200 document submissions/min peak; each spawns async OCR + extraction jobs',
    },

    apiDesign: {
      description: 'Async REST API: submit document, poll or webhook for results',
      endpoints: [
        { method: 'POST', path: '/api/v1/documents', params: '{ file (multipart), document_type?, webhook_url? }', response: '{ job_id, status: "queued", estimated_seconds }', description: 'Submit document for processing; returns job ID immediately' },
        { method: 'GET', path: '/api/v1/documents/:job_id', params: '', response: '{ job_id, status, result: { fields[], tables[], confidence_avg }, pages }', description: 'Poll for extraction results' },
        { method: 'POST', path: '/api/v1/documents/:job_id/corrections', params: '{ field_id, corrected_value }', response: '{ accepted: true }', description: 'Submit human correction to improve future accuracy' },
        { method: 'GET', path: '/api/v1/review-queue', params: 'min_confidence?, document_type?, limit', response: '{ items[{ job_id, page, field, value, confidence }] }', description: 'Fetch items awaiting human review' },
        { method: 'POST', path: '/api/v1/documents/batch', params: '{ document_urls[], document_type?, priority }', response: '{ batch_id, job_ids[] }', description: 'Submit bulk batch of documents' },
      ],
    },

    dataModel: {
      description: 'Jobs, extracted fields, and correction history for audit',
      schema: `document_jobs {
  id: uuid PK
  org_id: bigint FK
  original_filename: varchar
  storage_key: varchar       -- S3 object key
  document_type: varchar     -- invoice | contract | id | receipt | unknown
  status: enum(queued, processing, completed, failed, review_required)
  page_count: int
  confidence_avg: float
  submitted_at: timestamp
  completed_at: timestamp nullable
}

extracted_fields {
  id: uuid PK
  job_id: uuid FK
  page_number: int
  field_name: varchar        -- e.g. invoice_total, vendor_name
  raw_value: text
  normalized_value: text     -- e.g. "1,234.56" normalized to "1234.56"
  confidence: float          -- 0.0 to 1.0
  bbox: jsonb                -- { x, y, width, height } in points
  needs_review: boolean
}

human_corrections {
  id: uuid PK
  field_id: uuid FK
  reviewer_id: bigint FK
  original_value: text
  corrected_value: text
  reviewed_at: timestamp
}`,
      examples: [
        { table: 'document_jobs', label: 'Invoice submitted for processing', json: `{ "id": "job-9f3b", "org_id": 4021, "original_filename": "vendor-invoice-2025-04.pdf", "document_type": "invoice", "status": "completed", "page_count": 2, "confidence_avg": 0.94, "submitted_at": "2025-04-22T09:00:00Z", "completed_at": "2025-04-22T09:00:18Z" }` },
        { table: 'extracted_fields', label: 'Low-confidence total field flagged for review', json: `{ "id": "fld-7a2c", "job_id": "job-9f3b", "page_number": 1, "field_name": "invoice_total", "raw_value": "S1,234.56", "normalized_value": "1234.56", "confidence": 0.61, "bbox": { "x": 420, "y": 310, "width": 90, "height": 18 }, "needs_review": true }` },
        { table: 'human_corrections', label: 'Reviewer fixes OCR misread', json: `{ "id": "cor-3d1e", "field_id": "fld-7a2c", "reviewer_id": 881, "original_value": "S1,234.56", "corrected_value": "$1,234.56", "reviewed_at": "2025-04-22T09:15:00Z" }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Documents are uploaded to S3, a Lambda function triggers Textract OCR, and results are written to a database. A simple confidence threshold routes low-confidence results to a review UI.',
      problems: [
        'AWS Textract is expensive at scale and has no feedback loop — errors repeat indefinitely',
        'No layout analysis means tables are extracted as flat text, losing row/column relationships',
        'Synchronous processing blocks the upload API and times out for large documents',
        'No document type classification — same extraction template applied to all documents',
        'Human review queue has no prioritization — a $1M contract waits behind a $5 receipt',
        'Corrections go into a database but nothing feeds them back into the model',
      ],
    },

    advancedImplementation: {
      title: 'Multi-Stage Pipeline with Layout Analysis and Active Learning',
      description: 'Documents enter an async pipeline: quality assessment and pre-processing (deskew, contrast enhancement, noise reduction), then a layout analysis model segments the page into regions (header, table, body, footer). Each region type routes to a specialized extractor. A confidence ensemble aggregates field-level scores. A fine-tuned model trained on accumulated human corrections replaces the generic cloud OCR for the most common document types.',
      keyPoints: [
        'Image pre-processing: deskew, binarization, and contrast normalization before OCR improves accuracy 10-20% on poor-quality scans',
        'Layout analysis model (LayoutLM or Document Image Transformer) identifies structural regions before character extraction, enabling type-specific parsing',
        'Table reconstruction from detected cell bounding boxes restores row-column relationships lost in flat OCR output',
        'Active learning loop: corrections from human reviewers are queued for weekly fine-tuning of the extraction model on each org\'s document types',
        'Priority-weighted review queue: items are scored by (1 - confidence) * business_value, so high-value low-confidence documents surface first',
        'Embedding-based document clustering groups similar documents so a correction on one propagates as a suggestion to similar unfixed extractions',
        'Incremental indexing into Elasticsearch enables full-text search over extracted content without re-processing',
      ],
      databaseChoice: 'PostgreSQL for job metadata and structured extraction results (JSONB for flexible field schemas per document type); S3 for original documents and page images; Redis for job queue and in-progress status; Elasticsearch for full-text search over extracted content',
      caching: 'Perceptual hash of document image detects exact duplicates and returns cached results without re-processing; layout analysis results cached per page hash; frequently accessed extraction templates cached in memory on worker nodes',
    },

    tips: [
      'Clarify whether the primary challenge is OCR accuracy, throughput, or structured extraction — each points to a different design focus',
      'Distinguish document classification from field extraction — you need to know document type before you can apply the right extraction template',
      'Explain the confidence score threshold strategy: too high floods the review queue, too low lets errors through',
      'Mention the feedback loop — without it, accuracy cannot improve and human review labor grows proportionally with volume',
      'Talk about table extraction specifically — it is the hardest part and interviewers know it',
      'Discuss pre-processing for scan quality — skipped in most naive designs but critical for real-world accuracy',
    ],

    keyQuestions: [
      {
        question: 'How do you handle documents with poor scan quality?',
        answer: `**Pre-processing Pipeline**:
Before OCR, apply these transforms in order:

1. **Deskew**: detect document rotation (Hough line transform) and correct up to ±15 degrees
2. **Binarization**: convert to black-and-white using adaptive thresholding (Sauvola) rather than global — handles uneven lighting from smartphone photos
3. **Noise reduction**: morphological operations (erosion + dilation) remove speckle noise while preserving character strokes
4. **Contrast enhancement**: CLAHE (Contrast Limited Adaptive Histogram Equalization) improves faded or light documents

**Quality Score**:
- Compute a quality score (sharpness via Laplacian variance, contrast ratio, noise level)
- Route extremely poor quality (<0.3) to a "needs rescan" queue before attempting OCR
- Include quality score in the extraction result so downstream consumers can adjust trust

**Model Selection by Quality**:
\`\`\`
quality >= 0.8: fast cloud OCR (Textract)
quality 0.5-0.8: fine-tuned OCR model with beam search decoding
quality < 0.5: ensemble of 3 models + voting + human review flagged
\`\`\``,
      },
      {
        question: 'How do you extract structured data from free-form tables?',
        answer: `**The Challenge**:
Tables in PDFs have no explicit structure — OCR returns a flat list of text fragments with coordinates. You must reconstruct rows and columns from bounding boxes.

**Table Detection**:
1. Use a layout detection model (DETR or TableTransformer) to identify table regions in the page
2. Within the table region, detect cell boundaries from visible ruling lines or whitespace gaps

**Cell Reconstruction Algorithm**:
\`\`\`
1. Collect all text fragments within table bounds
2. Cluster by Y-coordinate (row groups): fragments within 5px of same Y → same row
3. Sort rows by Y ascending; within each row, sort by X ascending → column order
4. Align columns across rows using X-coordinate clustering
5. Handle merged cells: a cell spanning 2 columns has X-extent overlapping 2 column clusters
\`\`\`

**Validation**:
- Check that numeric columns sum correctly (invoice line items → total)
- Flag rows where column count differs from header as extraction errors
- For known document types, validate extracted table schema against expected template`,
      },
      {
        question: 'How does the human review feedback loop work to improve accuracy over time?',
        answer: `**Correction Collection**:
- Every human correction is stored with: original OCR value, corrected value, field name, document type, bounding box, image crop of the field
- Corrections are tagged with confidence level at time of extraction

**Active Learning Loop** (runs weekly per org):
\`\`\`
1. Collect corrections from past week (min 100 per document type to trigger)
2. Create training examples: (image_crop, field_name) → corrected_value
3. Fine-tune org-specific model on top of base model (few-shot fine-tuning, not full retraining)
4. Evaluate on held-out correction set: if accuracy improves, deploy; else retain base model
5. Confidence threshold auto-adjusts: if false positive rate rises, tighten threshold
\`\`\`

**Federated Learning Consideration**:
- Some orgs have privacy requirements preventing document images from leaving their environment
- In this case, gradients (not data) are aggregated to improve the shared base model without exposing document content

**Measuring Improvement**:
- Track correction rate per document type per week — should trend down as model improves
- Track human review queue depth — should shrink or remain stable as volume grows`,
      },
    ],

    keyDecisions: [
      'Cloud OCR (Textract/DocumentAI) vs self-hosted (Tesseract/PaddleOCR) — chose cloud OCR for initial accuracy and coverage, self-hosted fine-tuned model for high-volume common document types to reduce cost',
      'Synchronous vs async processing — chose async for all documents because OCR + layout analysis takes 5-30s depending on page count, which is unacceptable for a synchronous API response',
      'Single confidence threshold vs per-field thresholds — chose per-field because invoice totals require higher confidence than vendor addresses; one threshold either floods the queue or lets critical errors through',
      'Shared model vs per-org fine-tuned model — chose per-org fine-tuning for enterprises above a correction volume threshold; shared model for small customers where there is not enough data to fine-tune',
      'Store original document vs re-extract on demand — chose store original plus extracted JSON; re-extraction is expensive and results may differ after model updates, breaking audit trails',
    ],
  },

  // ─── B2. Time Series Forecasting ─────────────────────────────────────────────
  {
    id: 'time-series-forecasting',
    isNew: true,
    title: 'Time Series Forecasting System',
    subtitle: 'Demand Forecasting / Energy Prediction / Financial Forecasting',
    icon: 'zap',
    color: '#f59e0b',
    difficulty: 'Medium',
    description: 'Design a system that ingests historical time-series data, trains and serves forecasting models, and delivers predictions with confidence intervals at multiple horizons.',

    introduction: `Time series forecasting underpins some of the most financially impactful decisions in modern enterprises: how much inventory to stock, how much electricity to generate, how many cloud instances to pre-provision. A 5% improvement in demand forecast accuracy can translate to tens of millions of dollars in reduced waste or avoided stockouts.

The core challenge is that time series are not i.i.d. data — each observation is correlated with past observations, seasonal patterns, and external signals. A simple ML model that ignores this structure will underfit. Statistical models like ARIMA handle autocorrelation but cannot incorporate external regressors at scale. Modern deep learning approaches (N-BEATS, Temporal Fusion Transformer) can model complex patterns but require substantial training data and careful feature engineering.

Production complexity multiplies when you consider that a single retailer may have hundreds of thousands of SKUs across thousands of locations, each needing its own forecast updated daily. The system must balance model complexity against inference cost and latency, handle missing data and distributional shift gracefully, and provide uncertainty estimates so downstream planners know when to trust the forecast.`,

    functionalRequirements: [
      'Ingest raw time-series data via streaming (Kafka) and batch (S3) APIs',
      'Train forecasting models per series or on grouped series (global models)',
      'Support multiple forecast horizons per series: 1-hour, 1-day, 1-week, 1-month',
      'Return point forecasts and prediction intervals (10th, 50th, 90th percentiles)',
      'Incorporate external regressors: holidays, promotions, weather, price changes',
      'Trigger model retraining when performance degrades beyond threshold',
      'Support backtesting framework to evaluate models on historical data',
      'Expose forecast results via REST API and batch export to data warehouse',
    ],

    nonFunctionalRequirements: [
      'Serve cached point forecasts in under 50ms via REST API',
      'Retrain and update forecasts for 100K series within 4 hours nightly',
      'Achieve MAPE (Mean Absolute Percentage Error) below 10% for daily demand forecasts on stable SKUs',
      'Detect and handle distributional shift (COVID-level disruptions) within 48 hours via retraining',
      'Maintain 12 months of historical forecasts and actuals for backtesting and compliance',
      'Scale training pipeline to 1M series with horizontal worker expansion',
    ],

    estimation: {
      users: '200 enterprise customers; each may have 1K to 500K time series to forecast',
      storage: '1 KB per data point * 500 data points/series/day * 1M series * 365 days = ~182 TB/yr for raw data; pre-computed forecasts add ~10%',
      bandwidth: '~50 GB/day inbound from customer ETL pipelines; forecast API responses are small JSON',
      qps: '~5K forecast reads/sec at peak (downstream systems fetching pre-computed results); training jobs run async off critical path',
    },

    apiDesign: {
      description: 'REST API for forecast retrieval and data ingestion; training is async',
      endpoints: [
        { method: 'POST', path: '/api/v1/series/:series_id/data', params: '{ points: [{ timestamp, value }], regressors?: { holiday, promo } }', response: '{ accepted: N, rejected: 0 }', description: 'Append new observations to a series' },
        { method: 'GET', path: '/api/v1/series/:series_id/forecast', params: 'horizon=1d|1w|1m, percentiles=10,50,90', response: '{ series_id, generated_at, horizon, forecast: [{ timestamp, p10, p50, p90 }] }', description: 'Retrieve latest pre-computed forecast' },
        { method: 'POST', path: '/api/v1/series/:series_id/train', params: '{ model_type?, hyperparams? }', response: '{ job_id, status: "queued" }', description: 'Trigger on-demand model training' },
        { method: 'POST', path: '/api/v1/backtest', params: '{ series_ids[], model_type, cutoff_date, horizon }', response: '{ job_id }', description: 'Run historical backtest to evaluate model accuracy' },
        { method: 'GET', path: '/api/v1/series/:series_id/performance', params: 'from, to', response: '{ metrics: { mape, rmse, bias }, drift_detected: bool }', description: 'Get model performance metrics and drift indicators' },
      ],
    },

    dataModel: {
      description: 'Series metadata, raw observations, model versions, and pre-computed forecasts',
      schema: `time_series {
  id: varchar PK          -- customer-defined identifier e.g. "SKU-123-NYC"
  org_id: bigint FK
  name: varchar
  frequency: enum(hourly, daily, weekly, monthly)
  current_model_id: uuid FK nullable
  last_trained_at: timestamp nullable
  last_forecast_at: timestamp nullable
  mape_last_30d: float nullable
}

observations {
  series_id: varchar FK
  timestamp: timestamp
  value: double precision
  regressors: jsonb nullable   -- { holiday: 1, promo_pct: 0.2 }
  PRIMARY KEY (series_id, timestamp)
  -- partitioned by series_id hash + timestamp range
}

model_versions {
  id: uuid PK
  series_id: varchar FK
  model_type: varchar     -- prophet | nbeats | tft | arima
  hyperparams: jsonb
  trained_at: timestamp
  train_mape: float
  val_mape: float
  artifact_path: varchar  -- S3 key to serialized model
}

forecasts {
  id: uuid PK
  series_id: varchar FK
  model_id: uuid FK
  generated_at: timestamp
  horizon: varchar
  target_timestamp: timestamp
  p10: double precision
  p50: double precision
  p90: double precision
  PRIMARY KEY (series_id, horizon, target_timestamp)
}`,
      examples: [
        { table: 'time_series', label: 'Daily demand series for a retail SKU', json: `{ "id": "SKU-9821-BOS", "org_id": 3012, "name": "Widget Pro - Boston Warehouse", "frequency": "daily", "current_model_id": "mdl-b3c4d5", "last_trained_at": "2025-04-21T02:00:00Z", "mape_last_30d": 0.082 }` },
        { table: 'forecasts', label: 'Tomorrow\'s demand forecast with prediction interval', json: `{ "id": "fcast-a1b2", "series_id": "SKU-9821-BOS", "model_id": "mdl-b3c4d5", "generated_at": "2025-04-22T03:00:00Z", "horizon": "1d", "target_timestamp": "2025-04-23T00:00:00Z", "p10": 142, "p50": 167, "p90": 198 }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Raw data is stored in a time-series database. A nightly cron job trains a separate ARIMA model per series and stores forecasts in a cache. The API reads from the cache.',
      problems: [
        'Training one ARIMA model per series is too slow at scale — 100K series takes days without parallelization',
        'ARIMA cannot incorporate external regressors (holidays, promotions) which are critical for accurate demand forecasting',
        'No prediction intervals — downstream planners cannot distinguish high-confidence from uncertain forecasts',
        'No drift detection — model accuracy silently degrades after distributional shifts (new product launch, supply chain disruption)',
        'Nightly batch means forecasts are up to 24 hours stale when downstream systems need them',
        'No backtesting framework — impossible to compare models or validate before deploying to production',
      ],
    },

    advancedImplementation: {
      title: 'Global Model Architecture with Parallel Training and Automated Retraining',
      description: 'Instead of one model per series, a global model (Temporal Fusion Transformer or N-BEATS) is trained across all series simultaneously. This enables transfer learning across series with similar patterns and dramatically reduces training time. A distributed training cluster processes series in parallel batches. Forecasts are pre-computed nightly and cached. A monitoring service tracks rolling MAPE per series and triggers selective retraining when drift is detected.',
      keyPoints: [
        'Global model training: one TFT model trained across all series with series identifiers as embeddings, enabling knowledge transfer from data-rich to sparse series',
        'Hierarchical forecasting: forecast at aggregate level (product family, region) and reconcile down to SKU level using the MinT reconciliation method for consistency',
        'Conformal prediction intervals: model-agnostic method that produces calibrated intervals with guaranteed coverage (e.g., the true value falls in the 80% interval 80% of the time)',
        'Distributed training via Ray: series partitioned across workers; global model trains with data parallelism on GPU cluster; training time for 100K series under 2 hours',
        'Drift detection: ADWIN or Page-Hinkley test on rolling forecast error; series with sustained MAPE deterioration are queued for retraining with recent data upweighted',
        'Warm-start retraining: fine-tune existing model on recent data (last 30 days) rather than full retraining — 10x faster and handles distributional shift without catastrophic forgetting',
        'Feature engineering as a service: holiday calendars, promotion schedules, and external signals (weather API) enriched automatically at ingestion time',
      ],
      databaseChoice: 'TimescaleDB (Postgres extension) for observations — native time-series compression, continuous aggregates, and time_bucket queries; Redis for serving pre-computed forecast cache with TTL aligned to forecast staleness budget; S3 for model artifacts and full forecast export; ClickHouse for backtesting analytics over historical forecast errors',
      caching: 'Pre-computed forecasts for all horizons stored in Redis keyed by (series_id, horizon, target_date) with TTL matching the forecast frequency; API reads only from cache during business hours; background workers refresh cache off-peak; cache stampede prevention via probabilistic early expiration',
    },

    tips: [
      'Distinguish point forecasting from probabilistic forecasting early — production systems almost always need prediction intervals, not just a single number',
      'Global models vs local models is a key design decision — explain the trade-off between training cost and accuracy for sparse series',
      'Mention conformal prediction as a practical way to produce calibrated intervals without making distributional assumptions',
      'Drift detection and retraining are often overlooked — bring them up proactively as they are critical for production reliability',
      'Hierarchical forecasting is a common real-world requirement (corporate wants regional roll-up, operations wants SKU-level) — having a strategy for reconciliation shows depth',
      'Discuss cold-start for new series: global model can produce reasonable forecasts from day one using similar series patterns',
    ],

    keyQuestions: [
      {
        question: 'How do you handle seasonality and trend decomposition?',
        answer: `**Classical Approach — STL Decomposition**:
\`\`\`
Y(t) = Trend(t) + Seasonal(t) + Residual(t)
\`\`\`
- STL (Seasonal and Trend decomposition using LOESS) fits a non-parametric smoother to isolate each component
- Forecast each component separately; combine for final forecast
- Works well but assumes additive seasonality and one seasonal period

**Multiple Seasonalities**:
- Retail demand has daily, weekly, and annual cycles simultaneously
- Prophet (Facebook) handles multiple Fourier-series seasonalities:
\`\`\`
S(t) = SUM_n [ a_n * sin(2π*n*t/P) + b_n * cos(2π*n*t/P) ]
\`\`\`
- N-BEATS uses learnable Fourier bases — no need to specify seasonal periods manually

**External Regressors for Trend**:
- Holiday indicators (binary feature per day) capture predictable spikes
- Price elasticity (log price as a regressor) explains demand response
- Include as covariates in the model, not hardcoded as seasonal adjustments

**Handling Trend Change Points**:
- A new product launch, competitor entry, or macro event can break historical trend
- Prophet detects change points automatically with a Laplace prior (sparse by default)
- For deep learning models: upweight recent data using exponential time decay in the loss function`,
      },
      {
        question: 'How do you measure and monitor forecast accuracy in production?',
        answer: `**Core Metrics**:
- **MAPE** (Mean Absolute Percentage Error): interpretable, but undefined when actuals = 0
- **sMAPE** (Symmetric MAPE): handles zero actuals, but can be misleading for large errors
- **RMSE**: penalizes large errors more — useful when stockouts are very costly
- **Quantile loss** (pinball loss): evaluates prediction interval calibration — must use this if you are serving intervals

**Coverage Check for Intervals**:
\`\`\`
Expected: 80% interval contains actual value 80% of the time
Actual coverage: count(actual in [p10, p90]) / total_forecasts
If actual < expected coverage: intervals too narrow (overconfident)
If actual >> expected coverage: intervals too wide (useless for planning)
\`\`\`

**Production Monitoring Pipeline**:
\`\`\`
1. On each new observation, compare against all forecast horizons that targeted this timestamp
2. Compute point error and interval coverage
3. Maintain rolling 30-day MAPE per series
4. Alert when MAPE exceeds 2x historical baseline for 3+ consecutive days
5. Enqueue affected series for retraining
\`\`\`

**Tracking Drift vs Bias**:
- Consistent positive bias (forecast always too high) → model is not seeing a downward trend
- Random errors with increasing variance → distribution is widening, model needs retraining
- Step change in error → external shock, consider regime-detection and warm-start fine-tune`,
      },
    ],

    keyDecisions: [
      'Local models (one per series) vs global model (one across all series) — chose global model for series with less than 2 years of history; local models for critical series with long history and unique patterns',
      'Statistical models (ARIMA, Prophet) vs deep learning (TFT, N-BEATS) — chose statistical for fast training and interpretability in regulated industries; deep learning for complex multi-variate series where accuracy gain justifies training cost',
      'Point forecast vs probabilistic forecast — chose probabilistic for all production use cases; point forecasts are derived from the median (p50)',
      'Nightly batch retraining vs online learning — chose nightly batch; online learning introduces instability and is hard to debug; targeted retraining on drift-detected series handles freshness',
      'Pre-compute all forecasts vs on-demand inference — chose pre-compute for all standard horizons; on-demand only for custom horizon requests to avoid cold-path latency',
    ],
  },

  // ─── B3. AI Anomaly Detection ─────────────────────────────────────────────────
  {
    id: 'ai-anomaly-detection',
    isNew: true,
    title: 'AI Anomaly Detection System',
    subtitle: 'Datadog APM / CloudWatch Anomaly / Splunk ITSI',
    icon: 'shield',
    color: '#ef4444',
    difficulty: 'Medium',
    description: 'Design a system that monitors time-series metrics from infrastructure and applications, automatically detects anomalies using ML, and alerts engineers with root cause context.',

    introduction: `Modern cloud systems emit millions of metrics per second — CPU utilization, request latency, error rates, database connections, queue depths. The traditional approach of setting static thresholds for alerts fails in two directions: thresholds set too tight create alert fatigue, while thresholds set too loose miss real incidents until users are impacted.

ML-based anomaly detection addresses this by learning the normal behavior of each metric — including diurnal cycles, weekly patterns, and gradual trend growth — and flagging deviations that fall outside expected bounds. The challenge is that "normal" is not static: a 50% CPU spike at 3am is suspicious, but the same spike at 2pm on a product launch day is expected. The model must adapt baselines continuously without triggering false positives during planned load increases.

Alert fatigue is the primary operational challenge. A production system with 100K metrics will generate thousands of individual anomalies during a single incident — correlating them into a single actionable alert with root cause context is harder than the detection itself. The system must group related anomalies, identify likely root causes from the causal graph of service dependencies, and surface the right information to an on-call engineer at 3am.`,

    functionalRequirements: [
      'Ingest time-series metrics from Prometheus, StatsD, CloudWatch, and custom HTTP push',
      'Learn normal behavior per metric and detect statistical deviations in real time',
      'Suppress alerts during maintenance windows and deployment events',
      'Correlate related anomalies across services into a single incident with root cause hypothesis',
      'Allow operators to tune sensitivity and provide feedback (confirm / dismiss alerts)',
      'Support custom alert routing: PagerDuty, Slack, email, webhook',
      'Provide a historical anomaly timeline for postmortem analysis',
      'Surface metric context (related metrics, recent deployments, similar past incidents) alongside each alert',
    ],

    nonFunctionalRequirements: [
      'Detect anomalies within 30 seconds of the anomalous data point arriving',
      'False positive rate under 5% after a 7-day warm-up period per metric',
      'Support 1 million active metrics per customer cluster',
      'Alert deduplication: a single incident must not generate more than 3 pages',
      'Model baseline should adapt within 2 hours to a sustained load increase (new traffic pattern)',
      '99.9% uptime for the detection pipeline — a blind monitoring system is worse than no monitoring',
    ],

    estimation: {
      users: '10,000 engineering teams monitoring an average of 10K metrics each',
      storage: '1 data point/min/metric * 10K metrics * 10K teams * 1 year = ~5.2 TB/yr raw metrics; anomaly events are much smaller',
      bandwidth: '~100 bytes/point * 100M metrics * 1 point/min = ~10 GB/min inbound at peak',
      qps: '~1.7M metric data points/sec across all customers; detection runs as a streaming job on each point',
    },

    apiDesign: {
      description: 'REST API for configuration and alert management; metric ingestion via high-throughput push endpoint',
      endpoints: [
        { method: 'POST', path: '/api/v1/metrics/ingest', params: '{ metrics: [{ name, value, timestamp, tags }] }', response: '{ accepted: N }', description: 'High-throughput metric ingestion (batched)' },
        { method: 'GET', path: '/api/v1/anomalies', params: 'from, to, severity?, service?, resolved?', response: '{ anomalies[{ id, metric, score, severity, detected_at, status }] }', description: 'List detected anomalies with filters' },
        { method: 'POST', path: '/api/v1/anomalies/:id/feedback', params: '{ verdict: "true_positive" | "false_positive", note? }', response: '{ accepted: true }', description: 'Submit operator feedback to improve model' },
        { method: 'POST', path: '/api/v1/maintenance-windows', params: '{ services[], start_at, end_at, reason }', response: '{ window_id }', description: 'Register maintenance window to suppress alerts' },
        { method: 'GET', path: '/api/v1/incidents/:id', params: '', response: '{ incident_id, root_cause_hypothesis, affected_metrics[], related_deployments[], similar_past_incidents[] }', description: 'Get correlated incident with context' },
      ],
    },

    dataModel: {
      description: 'Metrics, baseline statistics, anomaly events, and incident groups',
      schema: `metrics_metadata {
  id: bigint PK
  org_id: bigint FK
  name: varchar
  tags: jsonb          -- { service, host, region, env }
  frequency_seconds: int
  baseline_updated_at: timestamp
  sensitivity: float   -- operator-tunable, default 3.0 sigma
}

metric_baselines {
  metric_id: bigint FK
  hour_of_week: int    -- 0-167 (24*7)
  p50: double precision
  p75: double precision
  p95: double precision
  stddev: double precision
  updated_at: timestamp
  PRIMARY KEY (metric_id, hour_of_week)
}

anomaly_events {
  id: uuid PK
  metric_id: bigint FK
  detected_at: timestamp
  anomaly_score: float
  observed_value: double precision
  expected_value: double precision
  expected_lower: double precision
  expected_upper: double precision
  severity: enum(warning, critical)
  status: enum(open, acknowledged, resolved, dismissed)
  incident_id: uuid FK nullable
}

incidents {
  id: uuid PK
  org_id: bigint FK
  started_at: timestamp
  resolved_at: timestamp nullable
  root_cause_hypothesis: text
  affected_service_count: int
  alert_sent: boolean
}`,
      examples: [
        { table: 'anomaly_events', label: 'Critical latency spike detected', json: `{ "id": "anom-f2e1", "metric_id": 8821, "detected_at": "2025-04-22T14:32:05Z", "anomaly_score": 4.7, "observed_value": 1850, "expected_value": 120, "expected_lower": 80, "expected_upper": 160, "severity": "critical", "status": "open", "incident_id": "inc-3a9b" }` },
        { table: 'incidents', label: 'Correlated database incident', json: `{ "id": "inc-3a9b", "org_id": 5002, "started_at": "2025-04-22T14:31:58Z", "resolved_at": null, "root_cause_hypothesis": "Database connection pool exhaustion on db-primary-us-east-1 preceded API latency spike by 7 seconds", "affected_service_count": 4, "alert_sent": true }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Metrics stream into a time-series database. A cron job computes rolling averages and flags values more than N standard deviations from the mean. Every flagged point triggers a separate alert.',
      problems: [
        'Static standard deviation thresholds do not account for diurnal or weekly patterns — nighttime low traffic flagged as anomalous every morning',
        'One alert per anomalous data point creates hundreds of pages for a single incident',
        'No correlation between related metrics — API latency and database connection errors generate separate unlinked alerts',
        'No feedback loop — operators cannot tell the system a false positive was dismissed, so it keeps firing',
        'No context in alerts — on-call engineer sees a number but not recent deployments, dependency graph, or similar past incidents',
        'Fixed sensitivity for all metrics — a noisy metric and a stable metric both trigger at 3 sigma, but the noisy one generates 10x more false positives',
      ],
    },

    advancedImplementation: {
      title: 'Streaming Detection with Dynamic Baselines and Incident Correlation',
      description: 'Metrics stream through a Flink topology. Each metric has a per-hour-of-week baseline updated using exponentially weighted statistics. Anomaly scoring uses a robust z-score that is resistant to outliers in the baseline. A correlation engine groups anomalies within a time window across the service dependency graph into incidents and computes a root cause hypothesis using causal ranking. Operator feedback tightens or loosens per-metric sensitivity and feeds an active learning loop.',
      keyPoints: [
        'Dynamic baselines using EWMA (Exponentially Weighted Moving Average) with 7-day seasonality: same-hour-of-week comparisons prevent false positives from daily traffic patterns',
        'Robust anomaly scoring: modified z-score using median and MAD (Median Absolute Deviation) instead of mean and stddev, so a single historical outlier does not inflate the baseline',
        'Suppression during deployments: CI/CD pipeline pushes deployment events to the anomaly detector; a 15-minute suppression window prevents deployment-caused metric fluctuations from generating pages',
        'Temporal correlation: anomalies within 60 seconds across services with an established dependency relationship are grouped into one incident',
        'Root cause ranking: in an incident group, the metric that first spiked and has the highest in-degree in the dependency graph is ranked as most likely root cause',
        'Operator feedback loop: false positive dismissals increase per-metric sensitivity threshold; confirmed true positives decrease it; changes take effect after 10 feedback events',
        'Alert deduplication: incidents suppressed for 30 minutes after first page unless severity escalates (warning → critical) to prevent re-paging on the same incident',
      ],
      databaseChoice: 'Apache Flink for streaming anomaly detection (stateful per-metric windowed aggregations); TimescaleDB for metric storage with native compression; Redis for active baseline cache and suppression window state; Neo4j or PostgreSQL recursive CTEs for service dependency graph traversal; Elasticsearch for incident history full-text search',
      caching: 'Per-metric baselines cached in Flink operator state (in-memory on task managers) for zero-latency comparison during stream processing; Redis caches active suppression windows and current incident state; baseline snapshots written to TimescaleDB every hour as durable backup',
    },

    tips: [
      'Lead with the alert fatigue problem — static thresholds and per-point alerting are universally understood as painful; framing detection as a noise reduction problem resonates with interviewers',
      'Explain diurnal and weekly baseline seasonality early — it is the first thing that breaks naive threshold systems',
      'The correlation and grouping problem is harder than detection itself — spend time on it',
      'Mention the suppression/maintenance window requirement — it shows awareness of real operational workflows',
      'Feedback loops are often forgotten but are critical for a system that is supposed to get smarter over time',
      'Discuss the cold-start problem: new metrics have no baseline history; fall back to peer metrics with similar tags until 2 weeks of data accumulates',
    ],

    keyQuestions: [
      {
        question: 'How do you set dynamic thresholds that adapt to changing baselines without generating false positives?',
        answer: `**Per-Hour-of-Week Baselines**:
- Maintain separate statistics for each of the 168 hours of the week (24 * 7)
- A metric at Monday 9am is compared to its Monday 9am history, not its overall history
- Eliminates the most common false positive: nighttime lows flagged as anomalous at 6am

**EWMA Update Rule**:
\`\`\`
new_baseline = alpha * current_value + (1 - alpha) * old_baseline
alpha = 0.1  -- slow adaptation (10-week half-life)
\`\`\`
- Low alpha: stable baseline, slower to adapt, more false positives after real traffic changes
- High alpha: fast adaptation, fewer false positives, but can miss sustained anomalies

**Robust Z-Score (handles outliers in history)**:
\`\`\`
modified_z = 0.6745 * (x - median) / MAD
where MAD = median(|x_i - median|)
Alert if |modified_z| > sensitivity_threshold (default: 3.5)
\`\`\`
Using median + MAD instead of mean + stddev prevents a single historical spike from widening the band for months.

**Adapting to Sustained Load Changes**:
- If EWMA drift exceeds 20% over 2 hours AND no anomaly is flagged: accept as new normal and update baseline
- Distinguish: "traffic gradually grew by 20%" (baseline drift) vs "traffic spiked 20% suddenly" (anomaly)
- Detection: compare short EWMA (1h) vs long EWMA (7d) — divergence signals a regime change`,
      },
      {
        question: 'How do you reduce alert fatigue and avoid paging on-call for every anomaly?',
        answer: `**The Alert Fatigue Problem**:
A single database failure can cause: database latency high, connection pool exhaustion, API error rate up, API latency up, queue backlog growing, downstream service timeouts — potentially 50+ individual anomalies for one root cause.

**Approach 1: Incident Grouping**
\`\`\`
Within a 60-second window:
  - Group anomalies that share a service dependency path
  - A → B → C means anomalies in A, B, and C are candidates for grouping
  - Temporal ordering: earliest anomaly in the dependency chain = likely root cause

Result: 50 anomalies → 1 incident, 1 page
\`\`\`

**Approach 2: Severity-Gated Paging**
- Warning: anomaly score 3.0-4.0 → write to dashboard, no page
- Critical: anomaly score > 4.0 AND sustained > 2 minutes → page once
- Re-page only if severity escalates or incident is not acknowledged within 15 minutes

**Approach 3: Per-Metric Operator Tuning**
- Operators can mark specific metrics as "noisy" → system auto-increases threshold
- Metrics marked as business-critical → system auto-decreases threshold
- False positive feedback automatically adjusts: 3 FP dismissals → threshold increases by 0.5 sigma

**Approach 4: Time-of-Day Routing**
- Non-critical anomalies during business hours → Slack channel
- Any critical anomaly at night → PagerDuty on-call escalation`,
      },
    ],

    keyDecisions: [
      'Unsupervised (statistical baseline) vs supervised (labeled anomaly classifier) — chose statistical baseline because labels are extremely sparse and expensive; supervised models used only as a secondary layer for well-understood anomaly types with sufficient examples',
      'Point anomaly detection vs contextual detection — chose contextual (per-hour-of-week baselines) because point methods generate too many false positives from normal diurnal patterns',
      'Stream processing (Flink) vs micro-batch (Spark Streaming) — chose Flink for true record-at-a-time processing; 30-second detection latency requirement cannot be met with micro-batches above 5-second windows',
      'Alert per anomaly vs alert per incident — chose alert per incident; per-anomaly alerting is the primary source of alert fatigue and was the explicit design constraint',
      'Centralized correlation engine vs distributed per-service detection — chose centralized correlation with distributed detection; each service detects its own anomalies locally, but a central engine groups them using the global dependency graph',
    ],
  },

  // ─── B4. Automated Tagging ───────────────────────────────────────────────────
  {
    id: 'automated-tagging',
    isNew: true,
    title: 'Automated Content Tagging System',
    subtitle: 'Pinterest / Getty Images / Shutterstock Auto-Tagging',
    icon: 'database',
    color: '#10b981',
    difficulty: 'Medium',
    description: 'Design a system that automatically applies semantic tags to images, videos, and text content using multi-modal ML models, enabling search and discoverability at scale.',

    introduction: `Content platforms live or die on discoverability. A stock photo library with 500 million images is useless if users cannot find what they need. Manual tagging is too slow and too expensive for the volume of content being uploaded daily — a single platform may receive millions of new images per day. Automated tagging is the only viable path.

The tagging problem spans multiple modalities: images require computer vision models, video requires temporal understanding of scenes and actions, text requires NLP, and audio requires acoustic analysis. Each modality has its own taxonomy requirements. A fashion platform needs fine-grained tags (floral dress, V-neck, midi length) that would be irrelevant on a news platform (breaking news, politics, sports).

The key challenge beyond accuracy is the taxonomy itself: it must be comprehensive enough to enable precise search, but not so granular that it becomes unmaintainable. New categories emerge constantly (new trending products, new celebrities, new memes) and the system must handle them without full retraining. Zero-shot classification using CLIP embeddings addresses new categories, but at lower accuracy than fine-tuned models for established categories.`,

    functionalRequirements: [
      'Accept images, videos, and text content via upload and URL ingestion',
      'Apply hierarchical tags from a managed taxonomy (broad category → specific tag)',
      'Support zero-shot tagging for new taxonomy categories not seen during training',
      'Return per-tag confidence scores and route low-confidence items to human review',
      'Provide batch processing API for retroactively tagging existing content libraries',
      'Allow taxonomy administrators to add new tag categories and define relationships',
      'Expose tags via search API enabling multi-tag filtering with boolean operators',
      'Track tag quality via user feedback and correction rates',
    ],

    nonFunctionalRequirements: [
      'Tag a new image within 5 seconds of upload (real-time path)',
      'Process 100,000 images per hour in batch mode',
      'Achieve over 90% precision at 80% recall for established taxonomy categories',
      'Support a taxonomy of up to 50,000 tags across all content types',
      'Human review queue must not exceed 10% of daily ingestion volume',
      'Tags must be available in the search index within 30 seconds of generation',
    ],

    estimation: {
      users: '50 media and e-commerce customers; largest has 500M items, smallest has 1M',
      storage: '5 MB avg image * 10M new images/day across all customers = 50 TB/day; tag metadata is trivial by comparison (~1 KB per item)',
      bandwidth: '50 TB/day inbound for content; tag API responses are small JSON',
      qps: '~1,200 new images/sec real-time peak; batch jobs run off-peak at 30K images/hr',
    },

    apiDesign: {
      description: 'REST API for tagging, tag management, and search',
      endpoints: [
        { method: 'POST', path: '/api/v1/tag', params: '{ content_url, content_type: "image"|"video"|"text", taxonomy_id, min_confidence? }', response: '{ item_id, tags: [{ tag_id, label, confidence, category }] }', description: 'Tag a single content item synchronously (images < 2MB) or return a job_id for async' },
        { method: 'POST', path: '/api/v1/tag/batch', params: '{ items: [{ url, content_type }], taxonomy_id, priority? }', response: '{ batch_id, estimated_minutes }', description: 'Submit batch tagging job for large libraries' },
        { method: 'POST', path: '/api/v1/taxonomies/:id/tags', params: '{ label, parent_tag_id?, description, example_images[]? }', response: '{ tag_id }', description: 'Add new tag to taxonomy (zero-shot mode until training data accumulates)' },
        { method: 'POST', path: '/api/v1/items/:id/tag-feedback', params: '{ tag_id, verdict: "correct"|"incorrect"|"missing", missing_tag_label? }', response: '{ accepted: true }', description: 'Submit end-user feedback on tag quality' },
        { method: 'GET', path: '/api/v1/search', params: 'tags[] (AND/OR), taxonomy_id, content_type?, limit, cursor', response: '{ items[{ id, url, tags[] }], next_cursor }', description: 'Search content by tag combination' },
      ],
    },

    dataModel: {
      description: 'Taxonomy tree, content items, applied tags, and feedback',
      schema: `taxonomies {
  id: uuid PK
  org_id: bigint FK
  name: varchar
  version: int
}

tags {
  id: uuid PK
  taxonomy_id: uuid FK
  label: varchar
  parent_tag_id: uuid FK nullable    -- hierarchical taxonomy
  embedding: vector(512)             -- CLIP text embedding of label for zero-shot
  model_trained: boolean             -- false = zero-shot only
  created_at: timestamp
}

content_items {
  id: uuid PK
  org_id: bigint FK
  content_url: varchar
  content_type: enum(image, video, text)
  ingested_at: timestamp
  tagging_status: enum(queued, processing, tagged, review_required)
}

applied_tags {
  item_id: uuid FK
  tag_id: uuid FK
  confidence: float
  model_version: varchar
  source: enum(model, human_review, user_feedback)
  applied_at: timestamp
  PRIMARY KEY (item_id, tag_id)
}`,
      examples: [
        { table: 'tags', label: 'Fine-grained fashion tag with embedding', json: `{ "id": "tag-8a3f", "taxonomy_id": "tax-fashion", "label": "floral midi dress", "parent_tag_id": "tag-dresses", "model_trained": true }` },
        { table: 'applied_tags', label: 'High-confidence model-applied tag', json: `{ "item_id": "item-9b4c", "tag_id": "tag-8a3f", "confidence": 0.92, "model_version": "fashion-v2.3", "source": "model", "applied_at": "2025-04-22T11:00:05Z" }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Images are uploaded, a ResNet image classifier is called synchronously, and top-5 class labels are stored. Tags are fixed to the ImageNet-1K vocabulary.',
      problems: [
        'ImageNet-1K vocabulary is generic — useless for fashion, medical, or domain-specific content',
        'Synchronous classification blocks the upload API; large images time out',
        'No hierarchical taxonomy — flat list of tags makes search navigation poor',
        'New tag categories require full model retraining — months of turnaround',
        'No human review loop — low-confidence tags are published without validation',
        'No feedback mechanism — users cannot correct wrong tags, so errors persist indefinitely',
      ],
    },

    advancedImplementation: {
      title: 'Multi-Modal Pipeline with CLIP Zero-Shot and Hierarchical Taxonomy',
      description: 'Content flows through an async pipeline. Images are encoded with a CLIP vision encoder. For established tags, a fine-tuned linear probe on CLIP embeddings provides high-accuracy classification. For zero-shot tags (new categories added via taxonomy admin), cosine similarity between the image embedding and the text embedding of the tag label handles classification without retraining. A confidence router directs high-confidence items to auto-publish and low-confidence items to the human review queue. User feedback is logged and triggers fine-tuning once a new tag accumulates enough corrected examples.',
      keyPoints: [
        'CLIP dual-encoder: image and text embeddings share the same space, enabling zero-shot classification by comparing image embedding to tag label embedding without task-specific training',
        'Hierarchical classification: classify at the broad category level first (animals, vehicles, people) then apply category-specific fine-grained classifiers to reduce the label space',
        'Active learning for new tags: system selects the most uncertain images for a new tag and serves them to human reviewers first, accumulating 200-500 examples before scheduled fine-tuning',
        'Confidence calibration: raw model scores are not probabilities; Platt scaling or temperature scaling maps logits to calibrated probabilities aligned with actual precision',
        'Batch vs real-time path: real-time path uses smaller distilled model for sub-5s latency; batch path uses larger ensemble for maximum accuracy on historical library ingestion',
        'Search index integration: Elasticsearch document updated atomically when tagging completes; tag IDs stored as keyword fields enabling fast multi-tag intersection queries',
        'Tag propagation: when a parent tag is applied with high confidence, child tags in the hierarchy are inferred at lower confidence and can be confirmed or rejected at review',
      ],
      databaseChoice: 'PostgreSQL for taxonomy and item metadata; pgvector for CLIP embedding storage and similarity search during zero-shot classification; Elasticsearch for tag-based content search with boolean query support; Redis for real-time tagging job queue and result cache',
      caching: 'CLIP image embeddings cached by content hash — reusable if taxonomy changes require re-classification without re-encoding; zero-shot tag embeddings for all taxonomy labels pre-computed and cached in memory on inference workers; search result pages cached in Redis for popular tag combinations',
    },

    tips: [
      'Explain CLIP zero-shot early — it is the key that makes new taxonomy categories feasible without retraining',
      'Hierarchical taxonomy reduces the classification problem: first classify broad category, then apply category-specific model',
      'Distinguish precision vs recall requirements — a stock photo library needs high recall (miss no relevant tags) while a content moderation system needs high precision (do not false-positive)',
      'Discuss the cold-start for new tags: zero-shot mode first, then active learning to collect examples, then fine-tuning threshold',
      'The human review queue sizing is a key design question — if confidence threshold is too high, queue overflows; if too low, quality suffers',
      'Mention tag consistency across the library: if a model is retrained, old tags may diverge from new tags for the same content type',
    ],

    keyQuestions: [
      {
        question: 'How do you handle a taxonomy with 50,000 tags without training a 50,000-class classifier?',
        answer: `**The Problem with Flat 50K Classification**:
- Softmax over 50K classes: most classes are extremely rare — the model struggles to learn from few examples
- Training time scales poorly; inference cost is high
- Adding one new tag requires full retraining

**Hierarchical Decomposition**:
\`\`\`
Level 1: Broad category classifier (100 categories)
  → Animals, Vehicles, People, Fashion, Food, Nature, ...

Level 2: Category-specific fine-grained classifier (500-2000 tags per category)
  → Animals: Dog breeds (350 breeds), Cat breeds, Birds (800 species)
  → Fashion: Dress types, Sleeve styles, Necklines, Patterns
\`\`\`
Each level-2 model is smaller and faster; only the relevant one fires.

**CLIP Embedding Retrieval for New Tags**:
- Encode all 50K tag labels as text with CLIP text encoder
- At inference: compare image CLIP embedding to all tag embeddings via cosine similarity
- Top-K most similar tags are candidates
- Fine-tuned linear probe re-ranks candidates using task-specific learned weights

**Active Learning for Sparse Tags**:
- Tags with fewer than 50 examples: zero-shot CLIP only, lower confidence
- 50-500 examples: few-shot fine-tuned probe on CLIP features
- 500+ examples: full fine-tuned model with contrastive loss`,
      },
    ],

    keyDecisions: [
      'Fine-tuned image classifier vs CLIP embedding similarity — chose CLIP as base with fine-tuned linear probes on top; CLIP provides zero-shot capability for new categories and strong transfer learning',
      'Synchronous vs async tagging on upload — chose async for all items above 1MB; synchronous only for small images where latency budget allows',
      'Single shared model vs per-customer models — chose per-customer taxonomy with shared backbone; CLIP features are universal but classification heads are trained per taxonomy',
      'Auto-publish all tags vs threshold-gated review — chose threshold-gated; auto-publishing low-confidence tags at scale creates trust issues that are hard to recover from',
      'Flat tag list vs hierarchical taxonomy — chose hierarchical; it enables navigation (browse categories) and improves classification accuracy through coarse-to-fine decomposition',
    ],
  },

  // ─── B5. Voice Assistant Backend ─────────────────────────────────────────────
  {
    id: 'voice-assistant-backend',
    isNew: true,
    title: 'Voice Assistant Backend',
    subtitle: 'Alexa Skills / Google Assistant / Siri Shortcuts',
    icon: 'cpu',
    color: '#8b5cf6',
    difficulty: 'Hard',
    description: 'Design the backend infrastructure for a voice assistant that processes speech, understands intent, manages multi-turn dialog state, and executes actions across connected services.',

    introduction: `Voice assistants turn spoken language into structured actions in near real time. The full pipeline — wake word detection, audio capture, speech-to-text, natural language understanding, action execution, response generation, and text-to-speech — must complete in under 1.5 seconds for the interaction to feel natural. Each stage has its own latency budget, failure modes, and optimization challenges.

The natural language understanding problem is particularly complex. Spoken language is ambiguous in ways that typed language rarely is: homonyms ("two" vs "to"), ellipsis ("set a timer" — for how long?), and contextual references ("cancel it" — cancel what?) all require access to conversation history and user context. A voice assistant must maintain dialog state across multiple turns, track which entities have been mentioned, and resolve ambiguity by asking clarifying questions when necessary.

Privacy is a first-class constraint. Wake word detection must run on-device to avoid streaming audio to the cloud continuously. Even after wake word detection, users expect that audio is processed ephemerally and not retained indefinitely. The system must provide transparency about what was recorded and allow users to review and delete their voice history.`,

    functionalRequirements: [
      'Detect wake word on-device with under 5% false activation rate',
      'Transcribe speech to text with under 500ms end-to-end latency for short utterances',
      'Classify user intent and extract entities (date, location, item, quantity)',
      'Manage multi-turn dialog state: resolve anaphora, track conversation context across turns',
      'Route intents to registered skills and action handlers',
      'Generate natural language responses and synthesize speech',
      'Personalize responses using user preferences, location, and conversation history',
      'Provide voice history transparency: list, playback, and deletion of recordings',
    ],

    nonFunctionalRequirements: [
      'End-to-end latency from end of utterance to start of spoken response under 1.5 seconds at p95',
      'Wake word false accept rate under 1 per 24 hours of continuous listening',
      'Support 100M active devices globally with peak 5M concurrent active sessions',
      'NLU intent classification accuracy over 95% on supported intents',
      'Support 1000+ third-party skills with independent deployment and versioning',
      'Audio never retained beyond the active session without explicit user consent',
    ],

    estimation: {
      users: '100M active devices; peak 5M concurrent; each session averages 3 turns',
      storage: 'Audio: 32KB/sec * 3 sec avg utterance * 500M interactions/day = ~48 TB/day (ephemeral, not retained); NLU logs ~1 KB/interaction * 500M = 500 GB/day',
      bandwidth: '32KB/sec audio * 5M concurrent = 160 GB/sec inbound during peak (mostly device-side; cloud sees bursts at wake word)',
      qps: '~6K new speech sessions/sec at peak; each runs ASR + NLU + skill dispatch + TTS pipeline',
    },

    apiDesign: {
      description: 'Device-to-cloud protocol over WebSocket for streaming audio; REST for skill management',
      endpoints: [
        { method: 'WebSocket', path: '/v1/session', params: 'Authorization: Bearer {device_token}', response: 'Bidirectional: audio chunks in, ASR partial results + final intent + TTS audio out', description: 'Main streaming session protocol for real-time voice interaction' },
        { method: 'POST', path: '/v1/skills', params: '{ name, invocation_phrase, intents[], endpoint_url, oauth_config? }', response: '{ skill_id, status: "pending_review" }', description: 'Register a third-party skill' },
        { method: 'GET', path: '/v1/users/:id/history', params: 'from, to, limit', response: '{ interactions[{ id, transcript, intent, timestamp, skill_id }] }', description: 'Retrieve user voice interaction history' },
        { method: 'DELETE', path: '/v1/users/:id/history/:interaction_id', params: '', response: '{ deleted: true }', description: 'Delete a specific voice interaction record' },
        { method: 'GET', path: '/v1/skills/:id/analytics', params: 'from, to', response: '{ invocations, success_rate, avg_latency_ms, top_intents[] }', description: 'Skill performance analytics for developers' },
      ],
    },

    dataModel: {
      description: 'Users, devices, skills, interactions, and dialog sessions',
      schema: `devices {
  id: uuid PK
  user_id: bigint FK
  device_type: varchar      -- echo_dot | google_home | mobile_app
  wake_word_model_version: varchar
  registered_at: timestamp
}

skills {
  id: uuid PK
  developer_id: bigint FK
  name: varchar
  invocation_phrases: text[]
  endpoint_url: varchar
  status: enum(pending, active, suspended)
  version: int
}

dialog_sessions {
  id: uuid PK
  device_id: uuid FK
  user_id: bigint FK
  started_at: timestamp
  last_turn_at: timestamp
  turn_count: int
  context: jsonb     -- { last_intent, slot_values, referenced_entities }
}

interactions {
  id: uuid PK
  session_id: uuid FK
  turn_number: int
  asr_transcript: text
  intent: varchar
  slots: jsonb       -- { item: "pizza", quantity: 2, location: "downtown" }
  skill_id: uuid FK nullable
  response_text: text
  latency_ms: int
  created_at: timestamp
  -- deleted when user requests history deletion
}`,
      examples: [
        { table: 'dialog_sessions', label: 'Multi-turn order session', json: `{ "id": "sess-3c7d", "device_id": "dev-9a2b", "user_id": 44201, "started_at": "2025-04-22T19:30:00Z", "last_turn_at": "2025-04-22T19:30:45Z", "turn_count": 3, "context": { "last_intent": "food.order.customize", "slot_values": { "restaurant": "Dominos", "item": "pepperoni pizza" }, "referenced_entities": ["pizza"] } }` },
        { table: 'interactions', label: 'Third turn resolving anaphora', json: `{ "id": "int-8b1e", "session_id": "sess-3c7d", "turn_number": 3, "asr_transcript": "make it large", "intent": "food.order.modify_size", "slots": { "item": "pepperoni pizza", "size": "large" }, "skill_id": "skill-dominos", "response_text": "Got it, I\'ve updated your pepperoni pizza to large.", "latency_ms": 1180, "created_at": "2025-04-22T19:30:45Z" }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Audio is streamed from device to cloud, transcribed by a cloud ASR service, classified by a regex-based intent classifier, and routed to a hardcoded skill handler. Each turn is stateless.',
      problems: [
        'Stateless turns cannot resolve "cancel it" or "make it larger" — every utterance must be fully self-contained',
        'Regex-based intent classification fails on paraphrasing — users must use exact invocation phrases',
        'No on-device wake word detection — audio streams continuously to cloud, creating privacy and cost problems',
        'Single-region deployment means 300ms+ network latency for devices far from the data center',
        'No third-party skill framework — every new capability requires platform engineering effort',
        'End-to-end latency exceeds 2 seconds because each pipeline stage is a separate synchronous API call',
      ],
    },

    advancedImplementation: {
      title: 'Streaming NLU Pipeline with On-Device Wake Word and Stateful Dialog Management',
      description: 'Wake word detection runs on-device using a tiny 100KB neural network (RNNoise + keyword spotter). On wake word, audio streams to the nearest edge PoP over WebSocket. ASR runs with streaming partial results using CTC-Attention hybrid model. NLU runs parallel to the final ASR pass. Dialog state manager resolves entity references using the session context store. The skill router dispatches to the appropriate handler with a 500ms timeout. TTS audio begins streaming back before the full response is generated.',
      keyPoints: [
        'On-device wake word detection: 100KB RNN model with 1% false reject rate and less than 1 false accept per day; runs on device DSP without waking the main CPU',
        'Streaming ASR: CTC decoder emits partial hypotheses every 100ms so downstream NLU can begin processing before transcription completes; final hypothesis at end of utterance',
        'Parallel NLU during ASR: NLU model starts processing on each partial transcript update, so intent classification completes within 50ms of final transcript',
        'Dialog state stored in Redis: session context (last intent, slot values, referenced entities) read and written atomically per turn; 30-minute TTL for inactive sessions',
        'Anaphora resolution: slot value from previous turn injected when current turn slots are underspecified (user says "it" → resolver maps to last mentioned entity)',
        'Skill router with failover: skills must respond within 500ms; timeout triggers a "skill is unavailable" response without failing the turn; retried once before circuit breaker opens',
        'Edge-local TTS: text-to-speech runs on edge servers close to the device; audio streams in 100ms chunks to reduce time-to-first-audio below 400ms',
      ],
      databaseChoice: 'Redis for dialog session state (fast read-modify-write per turn, auto-TTL); DynamoDB for user preferences and device registry (low-latency globally distributed reads); S3 for ephemeral audio with 24h TTL lifecycle policy; PostgreSQL for skill catalog and developer accounts; Kafka for interaction event logging and analytics',
      caching: 'ASR language model cached on edge inference nodes; TTS voice model cached on edge TTS nodes; skill manifest (intent schemas, endpoint URLs) cached in memory on skill router with 5-minute TTL; user preferences pre-fetched to edge on device connection',
    },

    tips: [
      'Break the pipeline into stages with explicit latency budgets that sum to 1.5s: ASR 300ms + NLU 100ms + skill 500ms + TTS 300ms + network 200ms = 1.4s buffer',
      'On-device wake word is a must-mention — streaming audio continuously is a privacy and cost non-starter',
      'Dialog state and anaphora resolution are what separate toy assistants from real ones — spend time here',
      'Mention the third-party skill framework pattern (similar to Alexa Skills Kit) — it is architecturally significant',
      'TTS streaming (start speaking before full response is generated) is an important latency optimization',
      'Privacy requirements (audio retention, deletion) are increasingly important in interviews — mention them proactively',
    ],

    keyQuestions: [
      {
        question: 'How do you manage multi-turn dialog state and resolve pronoun references?',
        answer: `**Dialog State Structure** (stored in Redis per session):
\`\`\`json
{
  "session_id": "sess-3c7d",
  "turn_count": 3,
  "active_skill": "food.order",
  "slot_values": {
    "restaurant": "Dominos",
    "item": "pepperoni pizza",
    "size": null
  },
  "entity_stack": [
    { "entity": "pepperoni pizza", "type": "food_item", "turn": 2 },
    { "entity": "Dominos", "type": "restaurant", "turn": 1 }
  ]
}
\`\`\`

**Anaphora Resolution**:
Turn 3 utterance: "make it large"
- NLU detects intent "food.order.modify_size", slot "size"="large", entity "it"=pronoun
- Resolver: look up entity_stack, find most recent entity matching expected slot type (food_item)
- Resolve "it" → "pepperoni pizza"
- Construct full intent: modify pepperoni pizza size to large

**Slot Filling (Clarification Requests)**:
\`\`\`
User: "Order a pizza"
Missing required slots: restaurant, size, toppings
Strategy: ask for most important missing slot first
Response: "Which restaurant would you like to order from?"
User: "Dominos"
Response: "What size pizza would you like?"
\`\`\`

**Session Timeout**:
- Session expires after 30 minutes of inactivity (Redis TTL)
- User returns to fresh context; previous entity_stack is gone
- For longer-lived context (user preferences, past orders) use durable DynamoDB store`,
      },
    ],

    keyDecisions: [
      'On-device wake word vs cloud-side wake word detection — chose on-device; continuous audio streaming to cloud is a privacy violation and cost-prohibitive at 100M devices',
      'Streaming ASR vs batch ASR — chose streaming; batch waits until utterance ends to begin transcription, adding 500ms+ that cannot be recovered',
      'Stateless vs stateful dialog sessions — chose stateful with Redis TTL; stateless requires users to repeat context in every utterance which is unnatural',
      'Skill execution timeout vs synchronous wait — chose 500ms hard timeout with graceful fallback; user experience degrades faster waiting for a slow skill than hearing "that skill is unavailable"',
      'Single global NLU model vs per-skill NLU models — chose global model for intent routing, per-skill models for fine-grained slot extraction within a skill domain',
    ],
  },

  // ─── B6. AI Tutoring System ──────────────────────────────────────────────────
  {
    id: 'ai-tutoring-system',
    isNew: true,
    title: 'AI Tutoring System',
    subtitle: 'Khan Academy Khanmigo / Duolingo Max / Carnegie Learning',
    icon: 'layers',
    color: '#0ea5e9',
    difficulty: 'Medium',
    description: 'Design an adaptive AI tutoring platform that models each student\'s knowledge state, selects optimal practice problems, and generates personalized hints and explanations.',

    introduction: `The promise of AI tutoring is one-to-one instruction quality at internet scale. A skilled human tutor adapts in real time to a student's understanding, selects problems that are neither too easy nor too hard, and explains concepts using analogies the student can connect to. Traditional e-learning platforms cannot do this — they deliver the same content to every student regardless of what they already know.

Knowledge tracing is the foundation: the system must maintain a probabilistic model of each student's mastery of each skill in the curriculum. As students answer questions, the model updates — correct answers increase mastery estimates, incorrect answers (especially on concepts they should know) reveal gaps. This model drives problem selection: assign a problem slightly above the student's current mastery level to keep them in the learning zone.

The hardest problem is hint generation. A good hint guides the student toward the answer without giving it away — it identifies the specific misconception and addresses it without doing the cognitive work for the student. LLMs are well-suited to this task but require careful prompting to avoid leaking answers. The system must also detect when a student has pasted in an AI-generated answer and ensure assessments remain meaningful.`,

    functionalRequirements: [
      'Model each student\'s mastery level per skill using knowledge tracing',
      'Select practice problems adapted to each student\'s current mastery level',
      'Generate Socratic hints that guide without revealing the answer',
      'Explain misconceptions identified from incorrect answer patterns',
      'Schedule spaced repetition reviews for skills approaching forgetting threshold',
      'Provide progress dashboards for students and teachers',
      'Detect copy-paste and AI-generated answer submissions',
      'Support a curriculum graph linking prerequisite skills to dependent skills',
    ],

    nonFunctionalRequirements: [
      'Knowledge state update must complete within 200ms of answer submission',
      'Problem selection must return a recommended problem within 100ms',
      'LLM-generated hints and explanations must complete within 3 seconds',
      'Support 1M concurrent active students during school hours',
      'Knowledge model must remain accurate with as few as 10 practice attempts per skill',
      'Spaced repetition scheduler must process daily review queues for all students nightly',
    ],

    estimation: {
      users: '5M active students; peak 1M concurrent during school hours (9am-3pm)',
      storage: '1 KB per answer event * 50 answers/day/student * 5M students * 200 school days/yr = ~500 GB/yr events; knowledge state vectors are negligible',
      bandwidth: 'Hint/explanation generation: ~2 KB response * 500K requests/day = 1 GB/day LLM output',
      qps: '~6K answer submissions/sec at peak; each triggers knowledge state update + next problem selection',
    },

    apiDesign: {
      description: 'REST API for session management, problem delivery, and hint generation',
      endpoints: [
        { method: 'POST', path: '/api/v1/sessions', params: '{ student_id, curriculum_id, session_type: "practice"|"review"|"assessment" }', response: '{ session_id, next_problem: { id, content, skill_id, difficulty } }', description: 'Start a study session and receive first problem' },
        { method: 'POST', path: '/api/v1/sessions/:id/answers', params: '{ problem_id, answer, time_spent_ms, hint_used: bool }', response: '{ correct: bool, mastery_delta: float, next_problem, review_scheduled_for? }', description: 'Submit answer; returns updated mastery and next problem' },
        { method: 'POST', path: '/api/v1/hints', params: '{ problem_id, student_id, attempt_transcript: [{ answer, feedback }], hint_level: 1|2|3 }', response: '{ hint_text, hint_type: "process"|"concept"|"example" }', description: 'Request an adaptive hint for a specific problem attempt' },
        { method: 'GET', path: '/api/v1/students/:id/mastery', params: 'curriculum_id', response: '{ skills: [{ skill_id, name, mastery: 0.0-1.0, last_practiced, due_for_review: bool }] }', description: 'Get full knowledge map for a student' },
        { method: 'GET', path: '/api/v1/students/:id/review-queue', params: '', response: '{ problems: [{ problem_id, skill_id, skill_name, last_correct_at }] }', description: 'Get today\'s spaced repetition review problems' },
      ],
    },

    dataModel: {
      description: 'Curriculum graph, student knowledge states, problem bank, and answer events',
      schema: `skills {
  id: uuid PK
  curriculum_id: uuid FK
  name: varchar
  description: text
  prerequisite_skill_ids: uuid[]
}

problems {
  id: uuid PK
  skill_id: uuid FK
  content: jsonb          -- { question, answer_type, correct_answer, distractors[] }
  difficulty: float       -- 0.0 to 1.0 (calibrated from historical accuracy)
  avg_time_seconds: int
}

student_skill_mastery {
  student_id: bigint FK
  skill_id: uuid FK
  mastery: float           -- 0.0 to 1.0 (BKT or DKT posterior)
  attempts: int
  correct: int
  last_practiced: timestamp
  next_review_at: timestamp nullable
  PRIMARY KEY (student_id, skill_id)
}

answer_events {
  id: uuid PK
  student_id: bigint FK
  session_id: uuid FK
  problem_id: uuid FK
  skill_id: uuid FK
  answer_given: text
  correct: boolean
  time_spent_ms: int
  hint_used: boolean
  hint_count: int
  submitted_at: timestamp
  -- append-only event log, never updated
}`,
      examples: [
        { table: 'student_skill_mastery', label: 'Partial mastery of algebra skill with upcoming review', json: `{ "student_id": 100821, "skill_id": "skill-linear-equations", "mastery": 0.72, "attempts": 15, "correct": 11, "last_practiced": "2025-04-20T14:00:00Z", "next_review_at": "2025-04-24T08:00:00Z" }` },
        { table: 'answer_events', label: 'Incorrect answer with hint used', json: `{ "id": "evt-5d3c", "student_id": 100821, "session_id": "sess-2b9a", "problem_id": "prob-le-003", "skill_id": "skill-linear-equations", "answer_given": "x=4", "correct": false, "time_spent_ms": 45000, "hint_used": true, "hint_count": 2, "submitted_at": "2025-04-22T14:22:15Z" }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Students receive problems in a fixed curriculum sequence. Correct answers unlock the next problem. Incorrect answers show a written explanation. A percentage score at the end of a module determines whether the student advances.',
      problems: [
        'Fixed sequence does not adapt to prior knowledge — advanced students are bored, struggling students are overwhelmed',
        'Module completion percentage says nothing about which specific skills need more practice',
        'Written explanations are generic — they address the correct answer but not the specific misconception the student demonstrated',
        'No spaced repetition — skills learned weeks ago are not reviewed before assessments',
        'No prerequisite enforcement — students attempt skills before mastering dependencies, causing confusion',
        'Assessment scores are gameable by guessing; no adversarial input detection',
      ],
    },

    advancedImplementation: {
      title: 'Adaptive Knowledge Tracing with LLM-Powered Socratic Hints',
      description: 'Knowledge state is modeled per student per skill using Deep Knowledge Tracing (DKT), a recurrent neural network that takes the sequence of (skill, correct/incorrect) events and outputs mastery probabilities across all skills simultaneously. Problem selection uses Thompson Sampling to balance exploitation (practice skills near the mastery threshold) with exploration (occasionally test adjacent skills). Hints are generated by an LLM with a prompt that includes the problem, the student\'s incorrect attempts, their mastery level for the prerequisite skills, and an explicit instruction to guide without revealing the answer.',
      keyPoints: [
        'Deep Knowledge Tracing: LSTM trained on sequences of (skill_id, correct) events; predicts mastery probability for all skills after each event, capturing skill correlations (mastering addition helps multiplication)',
        'Problem difficulty calibration: Item Response Theory (IRT) parameters (difficulty, discrimination) estimated from population accuracy data; updated weekly with new answers',
        'Thompson Sampling for problem selection: sample mastery from posterior distribution per skill, select problem at difficulty level matching the sampled mastery, providing natural exploration',
        'Spaced repetition scheduling: Ebinghaus forgetting curve models decay; review scheduled when predicted recall probability drops below 0.8; SM-2 algorithm updates interval based on answer quality',
        'Socratic hint generation prompt engineering: three-level hint system (process hint → concept hint → worked example partial), each level revealing slightly more; LLM instructed to identify the specific step where student reasoning went wrong',
        'Anti-cheating: semantic similarity between student answer and known AI-generated responses; unusual time-on-task patterns (too fast for problem complexity); copy-paste event detection via clipboard API',
        'Teacher dashboard: cohort mastery heatmap by skill; students below mastery threshold flagged for intervention; detailed answer event timeline per student',
      ],
      databaseChoice: 'PostgreSQL for student mastery state and answer events (JSONB for flexible problem content); Redis for session state and real-time mastery cache during active sessions; S3 for DKT model artifacts; Kafka for answer event streaming to analytics and model retraining pipeline',
      caching: 'Student mastery vector cached in Redis during active sessions (written through to Postgres on session end); problem difficulty parameters cached in memory on problem selection service; LLM hint responses cached by (problem_id, hint_level, common_misconception_hash) to serve repeat students faster',
    },

    tips: [
      'Explain Bayesian Knowledge Tracing vs Deep Knowledge Tracing early — BKT is simple and interpretable, DKT captures skill correlations but is a black box',
      'The zone of proximal development (Vygotsky) is the pedagogical concept behind problem selection — mention it to show depth',
      'Socratic hints are harder than they sound — the key prompt engineering challenge is instructing the LLM not to reveal the answer',
      'Spaced repetition is often overlooked — it is one of the highest-impact features for long-term retention',
      'Prerequisite graph enforcement prevents a common student frustration: encountering a problem that requires skills not yet mastered',
      'Anti-cheating is sensitive territory — frame it as preserving assessment integrity, not surveillance',
    ],

    keyQuestions: [
      {
        question: 'How does knowledge tracing work and why is it better than simple accuracy tracking?',
        answer: `**Simple Accuracy Tracking (naive)**:
\`\`\`
mastery = correct_answers / total_answers
\`\`\`
Problems: ignores recency (correct 2 weeks ago counts same as correct today), ignores skill correlations, no uncertainty estimate.

**Bayesian Knowledge Tracing (BKT)**:
A hidden Markov model with 4 parameters per skill:
- P(L_0): probability student already knows the skill before first attempt
- P(T): probability of learning the skill per correct attempt (transition)
- P(G): probability of guessing correctly without knowing (slip for wrong)
- P(S): probability of slipping (answering incorrectly despite knowing)

\`\`\`
After each answer, Bayes update:
P(Learned | correct_answer) = P(correct | Learned) * P(Learned) / P(correct)
\`\`\`

**Deep Knowledge Tracing (DKT)**:
LSTM trained on sequences: [(skill_1, 1), (skill_2, 0), (skill_3, 1), ...]
- Input: one-hot encoded (skill_id, correct) pairs
- Output: mastery probability for ALL skills simultaneously
- Captures: "mastering multiplication improves division mastery estimate"
- Cold start: 5-10 answers sufficient because the model generalizes from millions of other students

**Why DKT Wins**:
| Property | Simple Accuracy | BKT | DKT |
|----------|----------------|-----|-----|
| Recency weighting | No | Yes (via forgetting) | Yes |
| Skill correlations | No | No | Yes |
| Cold start | Poor | OK (4 params) | Good (transfers from population) |
| Interpretability | High | Medium | Low |`,
      },
    ],

    keyDecisions: [
      'BKT vs DKT for knowledge modeling — chose DKT for subjects with rich skill dependency graphs; BKT for simple linear curricula where interpretability matters to educators',
      'Fixed curriculum vs fully adaptive — chose adaptive with curriculum graph guardrails; prerequisite skills must be mastered before dependent skills even if the student prefers to skip ahead',
      'Generate hints on demand vs pre-generate for all problems — chose on-demand with caching; pre-generation cannot anticipate the specific misconception shown in a student\'s incorrect attempt',
      'Thompson Sampling vs UCB for problem selection — chose Thompson Sampling; it naturally handles the mastery uncertainty and provides interpretable problem selection rationale',
      'Immediate feedback vs delayed feedback — chose immediate for practice, delayed (end of problem set) for assessment mode; immediate feedback promotes learning, delayed assesses authentic retention',
    ],
  },

  // ─── C1. Customer Support Chatbot ────────────────────────────────────────────
  {
    id: 'customer-support-chatbot',
    isNew: true,
    title: 'Customer Support Chatbot System',
    subtitle: 'Intercom AI / Zendesk AI / Salesforce Einstein',
    icon: 'messageSquare',
    color: '#3b82f6',
    difficulty: 'Medium',
    description: 'Design an AI-powered customer support chatbot that handles common inquiries via RAG over help documentation, escalates complex issues to human agents, and improves through feedback.',

    introduction: `Customer support is one of the highest-ROI applications of conversational AI. A well-designed chatbot can resolve 60-80% of common inquiries without human intervention, reducing support costs while maintaining customer satisfaction. The remaining 20-40% of complex, emotional, or novel issues are escalated to human agents who now handle a more meaningful workload.

The technical core is retrieval-augmented generation: the chatbot searches a knowledge base of help articles, FAQs, product documentation, and past resolved tickets to find relevant context, then generates a response grounded in that context. Without retrieval, the chatbot hallucinates policies and procedures. With good retrieval, it provides accurate, citable answers.

Escalation logic is the most consequential design decision. Escalating too aggressively defeats the purpose of automation. Escalating too conservatively creates frustrated customers who get wrong answers and have no path to a human. The system must detect frustration signals (repeated questions, negative sentiment, explicit requests for a human), complexity signals (multi-issue tickets, account-specific questions requiring data lookup), and policy flags (legal, safety, or high-value transaction issues that humans must own).`,

    functionalRequirements: [
      'Answer customer questions using RAG over help articles, FAQs, and product documentation',
      'Handle multi-turn conversations with context across turns in the same session',
      'Classify intent to route billing, technical, returns, and account inquiries to appropriate knowledge bases',
      'Detect escalation triggers and transfer conversation context to human agents',
      'Create support tickets automatically when an issue cannot be resolved in chat',
      'Collect CSAT scores after each resolved conversation',
      'Support multiple channels: web widget, mobile SDK, email, and WhatsApp',
      'Provide human agent interface showing full conversation history and AI-suggested responses',
    ],

    nonFunctionalRequirements: [
      'First response time under 1 second for the chatbot to begin typing',
      'Resolve over 60% of conversations without human escalation',
      'CSAT score above 4.0/5.0 for bot-resolved conversations',
      'Human escalation handoff must transfer full conversation context within 5 seconds',
      'Redact PII (credit card numbers, SSNs) before storing conversation logs',
      'Support 100K concurrent active conversations',
    ],

    estimation: {
      users: '5,000 business customers; each serves 1K-500K end-user support conversations per month',
      storage: '5 KB avg per conversation * 100M conversations/month = 500 GB/month; knowledge base documents ~10 GB per customer',
      bandwidth: 'Negligible — text-based conversations; knowledge base sync is periodic batch',
      qps: '~2K new chatbot messages/sec at peak across all customers',
    },

    apiDesign: {
      description: 'REST API for conversation management and knowledge base administration; WebSocket for real-time chat streaming',
      endpoints: [
        { method: 'POST', path: '/api/v1/conversations', params: '{ channel, customer_id?, initial_message, metadata: { page_url, product_id? } }', response: '{ conversation_id, bot_response, suggested_articles[] }', description: 'Start a new support conversation' },
        { method: 'POST', path: '/api/v1/conversations/:id/messages', params: '{ content, sender: "customer"|"agent" }', response: '{ message_id, bot_response?, escalation_triggered: bool }', description: 'Send message in conversation; bot responds or escalation fires' },
        { method: 'POST', path: '/api/v1/conversations/:id/escalate', params: '{ reason, priority: "low"|"medium"|"high"|"urgent" }', response: '{ ticket_id, agent_id?, estimated_wait_minutes }', description: 'Escalate conversation to human agent queue' },
        { method: 'POST', path: '/api/v1/knowledge-base/documents', params: '{ title, content, category, url? }', response: '{ doc_id, indexed: true }', description: 'Add or update a knowledge base document' },
        { method: 'POST', path: '/api/v1/conversations/:id/feedback', params: '{ csat: 1-5, comment? }', response: '{ accepted: true }', description: 'Submit post-resolution customer satisfaction rating' },
      ],
    },

    dataModel: {
      description: 'Conversations, messages, knowledge base documents, and escalation tickets',
      schema: `conversations {
  id: uuid PK
  org_id: bigint FK
  customer_id: varchar nullable
  channel: enum(web, mobile, email, whatsapp)
  status: enum(bot_active, escalated, resolved, abandoned)
  intent_category: varchar nullable
  csat_score: int nullable
  started_at: timestamp
  resolved_at: timestamp nullable
  ticket_id: uuid FK nullable
}

messages {
  id: uuid PK
  conversation_id: uuid FK
  sender: enum(customer, bot, agent)
  content: text
  retrieved_doc_ids: uuid[] nullable   -- docs used for RAG
  escalation_score: float nullable
  created_at: timestamp
}

knowledge_base_documents {
  id: uuid PK
  org_id: bigint FK
  title: varchar
  content: text
  category: varchar
  embedding: vector(1536)
  url varchar nullable
  last_updated: timestamp
}

support_tickets {
  id: uuid PK
  conversation_id: uuid FK
  subject: text
  priority: enum(low, medium, high, urgent)
  assigned_agent_id: bigint FK nullable
  status: enum(open, in_progress, resolved)
  created_at: timestamp
}`,
      examples: [
        { table: 'conversations', label: 'Escalated billing conversation', json: `{ "id": "conv-7e3a", "org_id": 8821, "customer_id": "cust-99201", "channel": "web", "status": "escalated", "intent_category": "billing", "csat_score": null, "started_at": "2025-04-22T15:00:00Z" }` },
        { table: 'messages', label: 'Bot response with retrieved document sources', json: `{ "id": "msg-4b2c", "conversation_id": "conv-7e3a", "sender": "bot", "content": "Refunds are processed within 5-7 business days to your original payment method.", "retrieved_doc_ids": ["doc-refund-policy", "doc-payment-methods"], "escalation_score": 0.18, "created_at": "2025-04-22T15:00:08Z" }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A rule-based chatbot matches keywords in customer messages to a hardcoded FAQ list and returns the matching answer. No conversation history is maintained between messages.',
      problems: [
        'Keyword matching cannot handle paraphrasing — "I want my money back" does not match "refund policy" keyword',
        'No conversation context — customer must repeat information in every message',
        'No escalation logic — chatbot keeps suggesting FAQ articles even for urgent account-lockout issues',
        'FAQ list must be manually updated by engineers for every product change',
        'No channel integration — separate implementations required for each channel',
        'No way to measure what percentage of issues the bot actually resolves',
      ],
    },

    advancedImplementation: {
      title: 'RAG-Powered Chatbot with Escalation Scoring and Omni-Channel Routing',
      description: 'Customer messages are classified by intent (billing, technical, returns, account) to restrict retrieval to the relevant knowledge base subset. A hybrid retriever (BM25 + dense embeddings) finds the top-5 most relevant documents. An LLM generates a grounded response citing specific documents. An escalation classifier runs on every message, scoring escalation probability based on sentiment, frustration signals, message complexity, and whether the bot is giving circular answers. Above a threshold, conversation context is serialized and transferred to the next available agent.',
      keyPoints: [
        'Intent classification restricts the retrieval scope: billing queries search billing docs, technical issues search product docs — reducing noise in retrieved context',
        'Hybrid RAG: BM25 matches keywords (product names, error codes) while dense retrieval (sentence-transformers) captures semantic paraphrasing',
        'Citation in responses: bot mentions the source article name, enabling customer trust and agents to verify the answer quickly during handoff',
        'Escalation classifier: trained on historical escalations labeled by agents; features include customer sentiment trend, number of bot turns, whether bot is repeating answers, and explicit escalation phrases',
        'Omni-channel normalization: WhatsApp, email, and web chat converted to a common conversation event model; agent interface shows unified history regardless of channel',
        'Knowledge base auto-sync: product documentation changes trigger re-embedding and index update within 15 minutes via webhook; stale answers are a primary driver of CSAT failure',
        'Feedback loop: low CSAT conversations queued for agent review; agent corrections to bot answers become fine-tuning examples for the retrieval ranking model',
      ],
      databaseChoice: 'PostgreSQL for conversation and ticket metadata; pgvector for knowledge base embeddings; Elasticsearch for BM25 keyword search across knowledge base; Redis for active conversation session state and rate limiting; S3 for conversation transcript archives',
      caching: 'Knowledge base embeddings cached in memory on retrieval workers; popular FAQ answers cached by question embedding hash with 1-hour TTL; conversation context cached in Redis during active session for fast per-message retrieval',
    },

    tips: [
      'Frame the problem as containment rate optimization: what percentage of conversations does the bot resolve without escalation, and how do you improve it',
      'Distinguish RAG from fine-tuning: RAG is preferred here because help docs change frequently and cannot wait for fine-tuning cycles',
      'Escalation logic deserves its own design discussion — it is the most business-critical decision point',
      'Mention the knowledge base freshness problem: a chatbot quoting an outdated refund policy is worse than no chatbot',
      'CSAT feedback loop is the key to continuous improvement — without it, the bot stagnates',
      'PII handling is important for compliance: credit card numbers, account numbers, and SSNs must be masked before logging',
    ],

    keyQuestions: [
      {
        question: 'How do you decide when to escalate to a human agent?',
        answer: `**Escalation Signal Taxonomy**:

**1. Explicit requests** (highest priority, immediate escalation):
- "Let me speak to a human"
- "I want to talk to a real person"
- "Get me to a manager"
Pattern match these — do not make them wait for sentiment analysis.

**2. Frustration signals** (score-based):
- Negative sentiment trend (3 consecutive negative messages)
- Message contains: "this is ridiculous", "completely useless", "unacceptable"
- Customer repeating the same question (semantic similarity > 0.85 between consecutive messages)
- Typing long messages after short bot responses (indicates bot is not answering the actual question)

**3. Complexity signals**:
- More than 5 distinct topics detected across the conversation
- Account-specific question that requires database lookup the bot cannot do (e.g., "why was my specific order #12345 cancelled")
- Legal, safety, or compliance mention (refund dispute, account fraud, data deletion request)

**4. Bot failure signals**:
- Bot confidence below 0.4 on 3 consecutive turns
- Same knowledge base documents retrieved 3+ times in a row (circular retrieval)
- No relevant documents found in last 2 retrieval attempts

**Escalation Score (0-1)**:
\`\`\`python
score = (
  0.35 * frustration_score +
  0.25 * complexity_score +
  0.20 * bot_failure_score +
  0.20 * explicit_request_score
)
escalate if score > 0.65 or explicit_request_score == 1.0
\`\`\`

**Handoff**:
- Serialize full conversation history + intent + escalation reason → agent interface
- Agent receives context without needing customer to repeat themselves
- Bot sends: "I'm connecting you with a team member who can help. They'll have your full conversation history."`,
      },
    ],

    keyDecisions: [
      'Rule-based escalation vs ML-based escalation classifier — chose ML classifier with explicit-request override; rules miss subtle frustration, but ML alone can miss "I want to talk to a human" phrasing variations',
      'RAG vs fine-tuned support model — chose RAG; help documentation changes weekly, fine-tuning cannot keep up without a continuous pipeline',
      'Single agent queue vs intent-routed queues — chose intent-routed; billing specialists should handle billing escalations, technical support should handle product bugs',
      'Real-time streaming response vs full response before display — chose streaming; first token appears within 300ms, improving perceived responsiveness even if full response takes 2 seconds',
      'Store PII in conversation logs vs mask immediately — chose mask immediately at ingestion time; storing PII creates compliance liability that outweighs any debugging benefit',
    ],
  },

  // ─── C2. Code Generation System ──────────────────────────────────────────────
  {
    id: 'code-generation-system',
    isNew: true,
    title: 'Code Generation System',
    subtitle: 'GitHub Copilot / Tabnine / Amazon CodeWhisperer',
    icon: 'code',
    color: '#6366f1',
    difficulty: 'Medium',
    description: 'Design an IDE-integrated code generation system that provides real-time inline completions, docstring-to-code generation, and bug fix suggestions with sub-200ms latency.',

    introduction: `Code generation AI has moved from novelty to core developer workflow in just a few years. Products like GitHub Copilot report 30-40% of shipped code is AI-generated in high-adoption teams. The value is clear: developers spend less time on boilerplate, stay in flow longer, and learn unfamiliar APIs more quickly. The engineering challenge is delivering this value with latency and quality requirements that vary dramatically across use cases.

Inline completion (the primary use case) must feel invisible. A suggestion appearing more than 200ms after a developer stops typing is perceived as a delay rather than assistance. This creates a hard latency budget: context retrieval, model inference, and response delivery must all complete in under 200ms end-to-end. This drives toward smaller, faster models for completions and larger, slower models for chat and generation tasks where latency tolerance is higher.

Context is everything. The same function skeleton is vastly different in the context of a Django ORM model, a FastAPI endpoint, or a standalone utility script. The system must retrieve relevant context from the repository — not just the current file, but imports, related files, test files, and recent edits — and rank context by relevance to the cursor position. Too little context and completions are generic; too much context and the model cannot focus.`,

    functionalRequirements: [
      'Provide inline code completions at cursor position with under 200ms latency',
      'Generate code from natural language comments and docstrings (next-line generation)',
      'Support fill-in-the-middle (FIM) completion where code exists before and after the cursor',
      'Suggest bug fixes and code improvements on demand',
      'Explain selected code in plain English',
      'Retrieve relevant context from the repository beyond the current file',
      'Track suggestion acceptance rate per user and aggregate across the team',
      'Flag generated code that closely matches GPL-licensed training data',
    ],

    nonFunctionalRequirements: [
      'Inline completion latency under 200ms at p95 from keypress to suggestion display',
      'Chat and generation tasks complete within 10 seconds',
      'Suggestion acceptance rate above 25% (industry benchmark for good completion quality)',
      'Zero logging of raw code content without explicit user opt-in',
      'Support all major IDEs: VS Code, JetBrains, Neovim via LSP',
      'Fine-tuning on an organization\'s private codebase must complete within 24 hours of trigger',
    ],

    estimation: {
      users: '2M developers; peak 500K active simultaneously during business hours',
      storage: 'Suggestion logs: 2 KB/event * 200 events/developer/day * 2M devs = 800 GB/day (opt-in only); model weights: 1-70 GB depending on tier',
      bandwidth: '~500 bytes per completion request + response * 500K active devs * 10 req/min = ~2.5 GB/min inbound',
      qps: '~85K completion requests/sec at peak; each requires context assembly + model inference',
    },

    apiDesign: {
      description: 'LSP-compatible completion API used by IDE extensions; REST for management',
      endpoints: [
        { method: 'POST', path: '/v1/completions/inline', params: '{ prefix, suffix, language, file_path, repo_context: [{ path, content }], cursor_position }', response: '{ completions: [{ text, score }], request_id }', description: 'Get inline completion for cursor position; returns top-3 candidates' },
        { method: 'POST', path: '/v1/completions/chat', params: '{ messages: [{ role, content }], file_context?, language? }', response: 'SSE stream of { delta: { content } }', description: 'Multi-turn code chat with streaming response' },
        { method: 'POST', path: '/v1/events/acceptance', params: '{ request_id, accepted: bool, edit_distance?: int }', response: '{ logged: true }', description: 'Report whether a completion was accepted or rejected' },
        { method: 'POST', path: '/v1/fine-tune', params: '{ org_id, repo_urls[], trigger: "manual"|"scheduled" }', response: '{ job_id, estimated_hours }', description: 'Trigger fine-tuning on organization codebase' },
        { method: 'POST', path: '/v1/explain', params: '{ code, language, context? }', response: '{ explanation }', description: 'Explain selected code in plain English' },
      ],
    },

    dataModel: {
      description: 'Completion requests, acceptance events, and organization fine-tune jobs',
      schema: `completion_requests {
  id: uuid PK
  user_id: bigint FK
  org_id: bigint FK
  language: varchar
  model_version: varchar
  prompt_tokens: int
  completion_tokens: int
  latency_ms: int
  created_at: timestamp
  -- no code content stored (privacy)
}

acceptance_events {
  request_id: uuid FK
  accepted: boolean
  edit_distance: int nullable    -- how much user edited before accepting
  logged_at: timestamp
  PRIMARY KEY (request_id)
}

fine_tune_jobs {
  id: uuid PK
  org_id: bigint FK
  status: enum(queued, training, evaluating, deployed, failed)
  base_model_version: varchar
  fine_tuned_model_path: varchar nullable
  repo_count: int
  token_count: bigint
  started_at: timestamp
  completed_at: timestamp nullable
}

license_flags {
  id: uuid PK
  request_id: uuid FK
  similarity_score: float
  matched_license: varchar    -- e.g. GPL-3.0, MIT
  flagged_at: timestamp
}`,
      examples: [
        { table: 'acceptance_events', label: 'Accepted completion with minor edit', json: `{ "request_id": "req-9c3d", "accepted": true, "edit_distance": 5, "logged_at": "2025-04-22T10:00:05Z" }` },
        { table: 'fine_tune_jobs', label: 'Completed org fine-tune job', json: `{ "id": "ft-7a2b", "org_id": 4421, "status": "deployed", "base_model_version": "codegen-7b-v2", "fine_tuned_model_path": "s3://models/ft-7a2b/weights.bin", "repo_count": 42, "token_count": 2800000000, "started_at": "2025-04-21T02:00:00Z", "completed_at": "2025-04-21T14:30:00Z" }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'The IDE extension sends the current file content to a cloud API. A general-purpose code model returns a single completion. No repository context, no FIM, same model for all use cases.',
      problems: [
        'Sending entire current file on every keystroke exceeds the 200ms latency budget',
        'No repository context — completions do not know about project-specific libraries, patterns, or naming conventions',
        'Single large model is too slow for inline completions — same model handles instant completions and long generation tasks',
        'No fill-in-the-middle support — cannot complete code when there is existing code after the cursor',
        'No acceptance tracking — impossible to measure quality or improve model',
        'Code is logged to cloud servers without consent, creating legal risk for enterprises',
      ],
    },

    advancedImplementation: {
      title: 'Two-Tier Model Architecture with Repository Context Retrieval',
      description: 'Inline completions use a small, fast model (1B-3B parameters, quantized to INT4) running on an inference server co-located with the developer region to minimize network latency. Chat and generation use a larger model (7B-70B) with a 10-second latency budget. Repository context is retrieved by a background process that indexes the codebase using BM25 and code embeddings, selecting the top-5 most relevant snippets ranked by semantic similarity to the current file and cursor position. FIM (Fill-in-the-Middle) training enables the model to complete code between prefix and suffix.',
      keyPoints: [
        'Two-tier model routing: completion requests under 100 tokens → small fast model; chat or generation requests → large model; threshold determined per-request based on context length',
        'Fill-in-the-middle training: models trained with special tokens (prefix/suffix/middle) can complete code that has context on both sides of the cursor, not just prefix context',
        'Repository indexer: background process (LSP server plugin) monitors file changes, chunks code into 512-token segments, and maintains a local embedding index for low-latency retrieval without sending code to the cloud',
        'Context ranking: retrieved snippets ranked by (1) semantic similarity to current cursor context, (2) recency of edit (recently modified files are more relevant), (3) import relationship (files imported by current file ranked highest)',
        'Speculative decoding for latency: a draft model generates 5 tokens speculatively; the larger verifier model confirms them in a single forward pass, reducing decode latency by 2-3x',
        'License detection: generated completions compared against a hash index of known GPL/LGPL code segments; matches above similarity threshold surface a warning to the developer',
        'Privacy-preserving telemetry: acceptance events logged without code content; hashed identifiers only; org-level fine-tuning runs on-premises for highest-sensitivity customers',
      ],
      databaseChoice: 'Local SQLite on developer machine for repository code index and embedding cache; remote PostgreSQL for aggregated telemetry and fine-tune job management; S3 for fine-tuned model artifacts; Redis for inference server request deduplication (same prefix from multiple rapid keystrokes)',
      caching: 'Completion results cached by (prefix hash, language, model_version) with 5-second TTL — rapid repeated keystrokes reuse the last completion; repository context cached in memory on LSP server process between requests; model weights hot-loaded into GPU memory at service startup',
    },

    tips: [
      'The two-tier model architecture (fast small for completions, large for chat) is the most important design point — discuss it early',
      'Fill-in-the-middle is a critical feature that requires specific model training — not all code models support it',
      'Repository context retrieval is what separates generic from project-aware completions — explain the ranking strategy',
      'Privacy is a major enterprise concern — discuss what is and is not sent to the cloud',
      'Acceptance rate is the key quality metric — explain how it drives model improvement',
      'License detection is a real commercial requirement — GitHub Copilot has faced lawsuits over this',
    ],

    keyQuestions: [
      {
        question: 'How does fill-in-the-middle (FIM) completion work?',
        answer: `**The Problem with Prefix-Only Completion**:
Traditional language models are trained left-to-right. They can only complete code given a prefix. If a developer places the cursor in the middle of a function body, the model does not know what comes after — it might generate code that conflicts with the existing suffix.

**FIM Training**:
During training, examples are randomly rearranged into FIM format:
\`\`\`
<PRE> {prefix_code} <SUF> {suffix_code} <MID> {middle_code}
\`\`\`
The model learns to predict the middle given both prefix and suffix.

**At Inference**:
\`\`\`
Input to model:
  <PRE>
  def calculate_discount(price, user_tier):
      if user_tier == "premium":
  <SUF>
      return final_price
  <MID>

Model generates:
          discount = 0.20
      elif user_tier == "standard":
          discount = 0.10
      else:
          discount = 0.0
      final_price = price * (1 - discount)
\`\`\`

**Why This Matters**:
- Developer editing in the middle of a file is the most common use case
- Without FIM, model generates code that may not compile or conflicts with existing suffix
- FIM completions have ~15% higher acceptance rate than prefix-only in the same context

**Implementation Note**:
Not all models support FIM. It must be included in the pre-training data mix (typically 50% FIM, 50% prefix-only). Cannot be added post-hoc without significant fine-tuning.`,
      },
    ],

    keyDecisions: [
      'Single model vs two-tier model routing — chose two-tier; a single large model cannot meet 200ms completion latency, a single small model gives poor quality for chat tasks',
      'Cloud-hosted context retrieval vs local repository indexer — chose local indexer; sending entire codebase to cloud on every keystroke has latency, privacy, and cost problems',
      'Fine-tune shared model vs per-org fine-tuned model — chose per-org fine-tuning triggered by opt-in; shared model is good enough for most, but organizations with proprietary frameworks benefit from domain adaptation',
      'Eager completion (trigger on every keystroke) vs debounced completion (wait 150ms after last keystroke) — chose debounced; eager creates too many wasted API calls and perceived flickering',
      'Log code content for model improvement vs privacy-only telemetry — chose privacy-only by default; opt-in telemetry for users who explicitly consent to improve the shared model',
    ],
  },

  // ─── C3. Text Summarization ───────────────────────────────────────────────────
  {
    id: 'text-summarization',
    isNew: true,
    title: 'Text Summarization System',
    subtitle: 'Notion AI / Slack AI Recap / Email TL;DR',
    icon: 'layers',
    color: '#f59e0b',
    difficulty: 'Medium',
    description: 'Design a text summarization service that condenses documents, email threads, meeting transcripts, and chat conversations into concise summaries tailored to the requested length and audience.',

    introduction: `Information overload is a daily reality for knowledge workers. The average professional receives over 100 emails per day, participates in hours of meetings, and must stay current across dozens of Slack channels and shared documents. Text summarization AI addresses this by condensing content into the essential information, reducing reading time while preserving the key points.

The challenge is that "summary" means different things in different contexts. A daily standup recap needs 3 bullet points. An executive briefing on a quarterly report needs two paragraphs with numbers. A legal contract review needs the obligations, deadlines, and risk clauses. The system must adapt output length, format, and emphasis to the use case rather than applying a single summarization template.

Long documents create a specific technical challenge: most LLMs have context windows of 8K-200K tokens. A year of email threads or a 500-page contract may exceed this. The system must intelligently chunk, summarize, and hierarchically merge summaries without losing cross-document context or contradicting itself across chunks.`,

    functionalRequirements: [
      'Summarize single documents up to 500 pages (streaming output for long documents)',
      'Summarize multi-document collections (email threads, Slack channels, meeting series)',
      'Support output formats: bullet points, paragraphs, executive summary, action items',
      'Support length targets: one sentence, 3 bullets, 1 paragraph, 2 pages',
      'Handle multi-turn follow-up questions about the summarized content',
      'Extract and highlight action items, decisions, and open questions from meeting transcripts',
      'Detect and flag factual inconsistencies between summary and source (hallucination guard)',
      'Allow user feedback (thumbs up/down, edit) to improve future summaries',
    ],

    nonFunctionalRequirements: [
      'Summarize a 10-page document within 5 seconds (streaming first token under 1 second)',
      'Summarize a 500-page document within 60 seconds using hierarchical chunking',
      'Factual consistency rate above 95% (no claims in summary that contradict source)',
      'Handle documents in 30+ languages',
      'Process 100K summarization requests per day',
      'PII from summarized content must not leak into shared or cached summaries',
    ],

    estimation: {
      users: '2M business users; 50K requests/day on average; peak 100K/day during business hours',
      storage: 'Source docs: 100 KB avg * 100M docs/yr = 10 TB/yr; summaries: 2 KB avg * 100M = 200 GB/yr',
      bandwidth: '100 KB inbound per request * 100K/day = 10 GB/day; streaming SSE output is negligible',
      qps: '~1,200 new summarization jobs/sec at peak; most are async, immediate streaming for short docs',
    },

    apiDesign: {
      description: 'REST API with SSE streaming for long documents; async job for very large documents',
      endpoints: [
        { method: 'POST', path: '/api/v1/summarize', params: '{ content | url, format: "bullets"|"paragraph"|"executive"|"action_items", length: "brief"|"standard"|"detailed", audience?, language? }', response: 'SSE stream: { delta: { text } } or JSON { summary } for short docs', description: 'Summarize a single document with streaming output' },
        { method: 'POST', path: '/api/v1/summarize/thread', params: '{ messages: [{ sender, content, timestamp }], focus?: "decisions|action_items|all" }', response: '{ summary, action_items[], decisions[], open_questions[] }', description: 'Summarize a multi-message thread (email/Slack)' },
        { method: 'POST', path: '/api/v1/summarize/batch', params: '{ document_urls[], output_format, job_priority? }', response: '{ job_id, estimated_seconds }', description: 'Async batch summarization for large document sets' },
        { method: 'POST', path: '/api/v1/summarize/:id/qa', params: '{ question }', response: 'SSE stream of answer grounded in the summarized document', description: 'Ask follow-up questions about a summarized document' },
        { method: 'POST', path: '/api/v1/summaries/:id/feedback', params: '{ rating: 1-5, edited_summary? }', response: '{ accepted: true }', description: 'Submit user feedback on summary quality' },
      ],
    },

    dataModel: {
      description: 'Summarization jobs, source chunks, generated summaries, and feedback',
      schema: `summarization_jobs {
  id: uuid PK
  user_id: bigint FK
  org_id: bigint FK
  source_type: enum(document, thread, batch)
  source_hash: varchar(64)     -- SHA-256 for deduplication
  output_format: varchar
  length_target: varchar
  status: enum(queued, processing, completed, failed)
  input_tokens: int
  output_tokens: int
  created_at: timestamp
  completed_at: timestamp nullable
}

document_chunks {
  id: uuid PK
  job_id: uuid FK
  chunk_index: int
  content_hash: varchar(64)
  token_count: int
  chunk_summary: text          -- intermediate summary for hierarchical merge
}

summaries {
  id: uuid PK
  job_id: uuid FK
  content: text
  consistency_score: float nullable
  user_rating: int nullable
  user_edit: text nullable
  created_at: timestamp
}`,
      examples: [
        { table: 'summarization_jobs', label: 'Completed email thread summarization', json: `{ "id": "job-3f2a", "user_id": 88201, "org_id": 3311, "source_type": "thread", "source_hash": "sha256:a3b4c5...", "output_format": "action_items", "status": "completed", "input_tokens": 4200, "output_tokens": 380, "completed_at": "2025-04-22T11:00:04Z" }` },
        { table: 'summaries', label: 'Generated summary with consistency score', json: `{ "id": "sum-9e1b", "job_id": "job-3f2a", "content": "Action items: 1) Alice to send contract draft by Friday. 2) Bob to schedule client call for next week. 3) Team to review pricing proposal before Thursday meeting.", "consistency_score": 0.97, "user_rating": 5 }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Documents are sent directly to an LLM with a "summarize this" prompt. The model returns a summary. Documents longer than the context window are truncated.',
      problems: [
        'Truncating long documents loses critical information from the second half',
        'No format control — model produces whatever format it prefers, not what the user needs',
        'No caching — the same popular document is re-summarized for every user who requests it',
        'No factual consistency check — model may hallucinate facts not in the source',
        'Sending full document content on every request is slow and expensive for long documents',
        'No multi-document context — email threads summarized as disconnected messages, not as a coherent conversation',
      ],
    },

    advancedImplementation: {
      title: 'Hierarchical Chunking with Consistency Verification and Semantic Caching',
      description: 'Documents are split into chunks that fit the model context window with 10% overlap to preserve cross-chunk context. Each chunk is summarized independently. Chunk summaries are merged in a second-pass summarization. For very long documents, this hierarchy extends to 3 levels (chunks → sections → document). A factual consistency verifier (a separate model or retrieval-based check) validates that every claim in the final summary can be grounded in the source text. Results are cached by source content hash; identical documents return immediately for any user.',
      keyPoints: [
        'Hierarchical summarization: chunk-level summaries capture local detail; section-level summaries identify themes; document-level summary synthesizes across sections without re-reading all chunks',
        'Overlap between chunks: each chunk shares 10% of its tokens with adjacent chunks to avoid cutting sentences or ideas at boundaries',
        'Map-reduce parallelism: all chunk summaries can run in parallel (map phase); the reduce phase merges them sequentially for coherence',
        'Format-specific prompting: separate prompt templates for each output format (bullets vs executive vs action_items); LLM instruction fine-tuned per format reduces hallucination',
        'Consistency verification: NLI (Natural Language Inference) model checks each sentence in the output against the source; sentences not entailed by any source chunk are flagged or removed',
        'Semantic cache: source document hashed by content; same document (regardless of who requests it) returns cached summary for same format + length; tenant-scoped to prevent cross-org data leakage',
        'Streaming for UX: for short documents, stream tokens as they are generated; for chunked documents, stream each section summary as it completes rather than waiting for full document',
      ],
      databaseChoice: 'PostgreSQL for job metadata and summary storage; Redis for semantic cache keyed by (source_hash, format, length_target, org_id); S3 for source document storage; async Celery/SQS workers for long-running hierarchical summarization jobs',
      caching: 'Content-addressed cache: SHA-256 of source text as cache key; same document returns instantly for any user in the same org; format and length are part of the cache key; cache entries expire after 7 days or on source document update',
    },

    tips: [
      'Hierarchical summarization for long documents is the key algorithmic insight — walk through map-reduce clearly',
      'Format control is as important as content quality — show how prompt templates differ for bullets vs paragraphs vs action items',
      'Semantic caching by content hash is a high-ROI optimization — popular documents are requested by thousands of users',
      'Factual consistency checking separates production-grade systems from demos — mention the NLI verification layer',
      'Chunking strategy matters: semantic chunking at paragraph boundaries produces better summaries than fixed-token splitting',
      'Multi-document summarization (threads, channels) requires a different approach than single-document — mention the temporal ordering and speaker attribution challenges',
    ],

    keyQuestions: [
      {
        question: 'How do you summarize documents longer than the model context window?',
        answer: `**The Problem**:
A 500-page legal contract is ~250,000 tokens. A model with a 32K token window cannot process it at once.

**Approach 1: Truncation** (bad)
- Only read first 32K tokens — misses critical clauses buried in section 40

**Approach 2: Map-Reduce Summarization**
\`\`\`
Step 1 (Map): Split document into N chunks of 4,000 tokens with 400-token overlap
  Chunk 1 → Summary_1 (300 tokens)
  Chunk 2 → Summary_2 (300 tokens)
  ...
  Chunk N → Summary_N (300 tokens)
  [All N chunks run in PARALLEL]

Step 2 (Reduce): Concatenate summaries → second-level summarization
  [Summary_1 + Summary_2 + ... + Summary_N] → Final Summary
  If still too long: apply reduce step recursively
\`\`\`

**Overlap Handling**:
- 10% overlap between chunks prevents cutting mid-sentence
- Deduplication in reduce step removes duplicate content surfaced by overlap

**Semantic Chunking** (better than fixed-token):
- Split at paragraph or section boundaries, not at fixed token counts
- Keeps logical units intact: "Indemnification clause" stays in one chunk
- Uses sentence embeddings to detect topic boundaries (cosine similarity drop = natural split)

**For Structured Documents** (contracts, reports with sections):
- Parse section headers (regex or document structure API)
- Summarize each named section independently
- Assemble: "Section 4 (Termination): Either party may terminate with 30 days notice..."
- Output preserves document structure, easier to navigate than prose`,
      },
    ],

    keyDecisions: [
      'Fixed-token chunking vs semantic chunking — chose semantic chunking at paragraph boundaries; fixed-token chunks often split mid-sentence or mid-concept, reducing chunk summary quality',
      'Sequential summarization vs parallel map-reduce — chose parallel map-reduce; sequential is 10x slower for long documents since each chunk must wait for the previous',
      'Cache at document level vs user level — chose document level (org-scoped); same document requested by multiple users returns from cache, dramatically reducing LLM cost',
      'Include full source in consistency check vs spot check — chose spot check NLI on high-specificity claims (numbers, names, dates); checking every sentence is too slow for real-time streaming',
      'Single model for all formats vs format-specific prompting vs fine-tuned model per format — chose format-specific prompting on a single base model; sufficient quality without the overhead of multiple models',
    ],
  },

  // ─── C4. Language Detection ───────────────────────────────────────────────────
  {
    id: 'language-detection',
    isNew: true,
    title: 'Language Detection System',
    subtitle: 'Google Language Detect / FastText LangID / CLD3',
    icon: 'globe',
    color: '#10b981',
    difficulty: 'Medium',
    description: 'Design a high-throughput language detection service that identifies the language of text inputs in under 10ms, supporting 100+ languages with robust handling of short text and mixed-language content.',

    introduction: `Language detection is a foundational NLP primitive. Before you can translate, moderate, route, or analyze text, you must know what language it is in. At scale — a social platform processing 10 billion posts per day — even a small error rate translates to millions of miscategorized pieces of content. And the failure modes are painful: routing a French complaint to an English-only support team, or applying an English-tuned toxicity model to Arabic text.

The core algorithm is well-understood: character n-gram frequency profiles, calibrated against known language profiles, provide fast and accurate detection for most cases. The challenge lies in the edge cases that represent a significant fraction of real-world content: very short texts (hashtags, one-word comments), mixed-language content (code-switching between English and Spanish), technical content with high proportions of code or URLs, and adversarial inputs designed to evade detection.

Production language detection must also be fast enough to run synchronously on every incoming piece of content without becoming a bottleneck. A 10ms SLA means the model must be extremely lightweight — rule-based or tiny n-gram models, not transformer-based classifiers.`,

    functionalRequirements: [
      'Detect the primary language of text inputs with support for 100+ languages',
      'Return top-3 language candidates with confidence scores',
      'Handle texts as short as 5 characters with graceful degradation in confidence',
      'Detect mixed-language text and identify the dominant language with code-switching flag',
      'Support batch detection for processing large content libraries',
      'Detect script type (Latin, Cyrillic, Arabic, CJK) as a fast pre-filter',
      'Support custom language allowlists per customer (only consider these 10 languages)',
      'Provide per-platform calibration for social media text (hashtags, emoji, abbreviations)',
    ],

    nonFunctionalRequirements: [
      'Single detection under 10ms at p99, including network RTT from customer to nearest PoP',
      'Batch detection throughput of 100,000 texts per second per instance',
      'Detection accuracy above 99% for texts over 30 characters in well-represented languages',
      'Handle texts containing up to 50% URLs, code, and numbers without misclassifying',
      'Uptime of 99.99% — language detection is on the critical path for downstream pipelines',
      'Deploy model update within 1 hour of approval without service interruption',
    ],

    estimation: {
      users: '2,000 API customers; largest customer processes 10B texts/day',
      storage: 'Language profiles: ~50 MB for 100 languages (tiny); detection logs: 100 bytes/request * 50B requests/day = 5 TB/day (optional, sampled)',
      bandwidth: '~200 bytes avg request * 10B requests/day = 2 TB/day inbound at peak across all customers',
      qps: '~115K requests/sec average; peak 500K/sec for batch jobs',
    },

    apiDesign: {
      description: 'REST and gRPC API for single and batch language detection',
      endpoints: [
        { method: 'POST', path: '/v1/detect', params: '{ text, allowlist?: ["en","es","fr"], hint_language?: "en" }', response: '{ detected: [{ language, confidence }], is_mixed: bool, script }', description: 'Detect language of a single text; returns top-3 candidates' },
        { method: 'POST', path: '/v1/detect/batch', params: '{ texts: string[], allowlist? }', response: '{ results: [{ text_index, detected, is_mixed, script }] }', description: 'Detect language for up to 1,000 texts in one request' },
        { method: 'GET', path: '/v1/languages', params: '', response: '{ supported: [{ code, name, script, example_text }] }', description: 'List all supported languages and scripts' },
        { method: 'POST', path: '/v1/calibration', params: '{ org_id, calibration_texts: [{ text, true_language }] }', response: '{ job_id }', description: 'Submit domain-specific calibration data for custom model tuning' },
      ],
    },

    dataModel: {
      description: 'Language profiles, detection logs, and calibration data',
      schema: `language_profiles {
  language_code: varchar(10) PK    -- BCP-47 e.g. "en", "zh-TW", "pt-BR"
  language_name: varchar
  script: varchar                  -- Latin, Cyrillic, Arabic, CJK, Devanagari
  ngram_profile: bytea             -- serialized n-gram frequency map
  training_corpus_size: bigint
  last_updated: timestamp
}

detection_events {
  id: uuid PK
  org_id: bigint FK
  text_hash: varchar(64)           -- SHA-256, not raw text
  text_length: int
  detected_language: varchar(10)
  confidence: float
  is_mixed: boolean
  latency_us: int
  model_version: varchar
  created_at: timestamp
  -- sampled at 1% for monitoring; never store raw text
}

calibration_jobs {
  id: uuid PK
  org_id: bigint FK
  sample_count: int
  accuracy_before: float
  accuracy_after: float nullable
  status: enum(queued, training, deployed, failed)
  submitted_at: timestamp
}`,
      examples: [
        { table: 'language_profiles', label: 'Spanish language profile metadata', json: `{ "language_code": "es", "language_name": "Spanish", "script": "Latin", "training_corpus_size": 2800000000, "last_updated": "2025-03-01T00:00:00Z" }` },
        { table: 'detection_events', label: 'Sampled detection event for monitoring', json: `{ "id": "det-5b3a", "org_id": 1122, "text_hash": "sha256:8d3f2c...", "text_length": 42, "detected_language": "fr", "confidence": 0.98, "is_mixed": false, "latency_us": 850, "model_version": "langid-v3.1", "created_at": "2025-04-22T10:00:01Z" }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A single FastText language identification model accepts text and returns the top predicted language. One model instance handles all requests.',
      problems: [
        'Single instance cannot handle 500K requests/sec — FastText is fast but not infinitely scalable',
        'No script pre-filtering — every text runs through the full n-gram profile comparison even when script makes most languages impossible',
        'No handling for mixed-language text — Spanish-English code-switching classified as one or the other',
        'No customer allowlist support — customers that only care about 5 languages still compare against all 100',
        'No calibration for domain-specific text — social media slang, technical documentation, and legal text have different n-gram distributions',
        'All errors look the same — a 5-character text and a 500-character text get the same confidence-0.3 result, but mean very different things',
      ],
    },

    advancedImplementation: {
      title: 'Multi-Stage Pipeline with Script Pre-Filter and Allowlist Optimization',
      description: 'Incoming text first passes through a Unicode script classifier — an O(n) scan over characters that identifies the writing system (Latin, Cyrillic, Arabic, CJK, Devanagari) and eliminates 90-95% of candidate languages in microseconds. Within the remaining candidates, a character n-gram model (similar to langdetect or FastText langid) computes cosine similarity against each candidate language profile. Allowlists further restrict candidates at the profile lookup stage. Results are post-processed by a confidence calibration layer trained on text-length-specific error rates.',
      keyPoints: [
        'Script classification in one Unicode pass: map each character to its script block; majority script eliminates all languages using other scripts before n-gram matching even starts',
        'N-gram profile matching: build a frequency rank vector of character n-grams (n=1 to 3) for the input; compare cosine similarity against precomputed ranked profiles for each candidate language',
        'Allowlist optimization: when a customer specifies a 5-language allowlist, compare only against those 5 profiles instead of 100 — 20x faster for high-throughput customers with known domain languages',
        'Short text confidence scaling: for texts under 20 characters, return confidence / 2 and set is_reliable=false; caller can decide whether to use or request more context',
        'Mixed-language detection: run detection on 1st and 2nd halves of the text; if results differ significantly, flag as mixed and report both languages with segment offsets',
        'Horizontal scaling: stateless detection workers; language profiles loaded into shared memory on startup; autoscale on QPS with 30-second spin-up for new instances',
        'Model versioning: new language profiles deployed as blue/green switch; old model handles live traffic while new model is validated on shadow traffic',
      ],
      databaseChoice: 'Language profiles stored as memory-mapped files on detection workers (mmap for zero-copy access); Redis for per-customer allowlist caching and rate limiting; PostgreSQL for calibration jobs and aggregated accuracy metrics; sampled detection events written asynchronously to ClickHouse for quality monitoring',
      caching: 'Character n-gram computation cached by text content hash for repeated texts (common in spam or syndicated content); popular short texts (common hashtags, greetings) in a hot cache with 99% hit rate; allowlist profiles pre-computed and cached in worker memory at startup',
    },

    tips: [
      'Script pre-filtering is the most impactful optimization — eliminate 95% of languages before the expensive n-gram comparison',
      'Explain why short texts are fundamentally harder — the n-gram frequency distribution has too little signal, not a model flaw',
      'Code-switching is common in real-world social media content — mention it proactively even if the interviewer has not asked',
      'Allowlist support is a key production feature — customers who only care about their supported locales should not compare against all 100 languages',
      'Confidence calibration by text length is important — a raw 0.6 confidence on a 5-character text and a 300-character text have very different meanings',
      'The system is on the critical path — discuss fallback behavior when latency budget would be exceeded rather than letting requests time out',
    ],

    keyQuestions: [
      {
        question: 'How do you handle very short text and code-switching?',
        answer: `**Short Text (< 20 characters)**:

The fundamental problem: "Hey" is valid in 50+ languages using the Latin script. A 3-character input has almost no discriminating signal in its n-gram profile.

Strategies:
1. **Report uncertainty explicitly**: return is_reliable=false; confidence is downscaled by text_length factor; let callers decide whether to use the result
2. **Hint language**: if context is available (user's previous messages, account locale setting), inject as a prior that biases the probability distribution
3. **Aggregate across session**: do not detect per-message — accumulate text across a conversation before classifying; works for chat support, not for independent posts

\`\`\`python
effective_confidence = raw_confidence * min(1.0, text_length / 30.0)
is_reliable = text_length >= 20 and effective_confidence >= 0.85
\`\`\`

**Code-Switching (mixed-language text)**:

Example: "I love going to the mercado on Sundays, it's muy bonito!"
- Latin script only, so Spanish and English are candidates
- First half: English dominant; second half: Spanish dominant

**Segment Detection Approach**:
\`\`\`
1. Split text into segments at sentence or clause boundaries
2. Run detection independently on each segment
3. If majority language differs between segments: flag is_mixed=true
4. Return: { primary: "en", secondary: "es", primary_ratio: 0.6 }
\`\`\`

**Practical Rule**: flag as mixed only if secondary language confidence > 0.4 and it differs from primary; otherwise just report the primary (many texts have proper nouns or loanwords from other languages without being truly mixed)`,
      },
    ],

    keyDecisions: [
      'Character n-gram model vs neural classifier (BERT-based) — chose n-gram model; neural classifiers add 50-200ms latency that violates the 10ms SLA; n-gram achieves 99%+ accuracy on texts above 30 characters',
      'Script pre-filter vs full comparison against all languages — chose script pre-filter; reduces candidate set from 100 to 5-15 languages at near-zero cost, dramatically improving latency',
      'Store raw text for debugging vs hash-only logging — chose hash-only; raw text storage creates privacy and compliance risk; text hash enables deduplication and monitoring without retaining content',
      'Single shared model vs per-customer calibrated model — chose shared model with optional calibration; calibration is expensive to maintain at per-customer scale and most customers do not need it',
      'Synchronous detection vs async batch — chose synchronous for single requests (10ms SLA); async batch for bulk processing to amortize overhead and enable parallelism across instances',
    ],
  },

  // ─── C5. AI Analytics Dashboard ──────────────────────────────────────────────
  {
    id: 'ai-analytics-dashboard',
    isNew: true,
    title: 'AI Analytics Dashboard',
    subtitle: 'ThoughtSpot / Power BI Copilot / Tableau AI',
    icon: 'database',
    color: '#0ea5e9',
    difficulty: 'Medium',
    description: 'Design an AI-powered analytics platform where users query business data in natural language, receive generated SQL and visualizations, and get proactive AI-generated insights.',

    introduction: `Business intelligence has historically required specialized SQL knowledge, creating a bottleneck where analysts become the only path through which business stakeholders can access data. AI-powered analytics dashboards aim to change this by translating natural language questions into SQL queries, enabling any knowledge worker to explore data directly.

Natural language to SQL (NL2SQL) is the technical core. The model must understand business terminology ("revenue" maps to the sum of order amounts, not a column literally named "revenue"), handle date arithmetic ("last quarter" relative to today), and generate correct SQL for complex joins across multiple tables. It must also explain what it did in plain language so users can verify the query makes sense before trusting the result.

Proactive insight generation moves the system from reactive (answering questions) to active (surfacing relevant patterns the user has not thought to ask about). This requires monitoring key metrics for anomalies, comparing current period to prior periods, and summarizing the findings in business language with appropriate visualizations — essentially automating the routine parts of an analyst's daily work.`,

    functionalRequirements: [
      'Accept natural language questions and generate SQL queries against connected databases',
      'Explain generated SQL in plain English before executing',
      'Display query results as auto-selected chart types (bar, line, pie, table) based on data shape',
      'Support follow-up questions in context ("break that down by region")',
      'Generate proactive insights: trend summaries, anomaly alerts, period-over-period comparisons',
      'Support multiple data sources: PostgreSQL, BigQuery, Snowflake, Redshift',
      'Enforce row-level security: users only see data they are authorized to access',
      'Allow data team to annotate schema with business definitions to improve query accuracy',
    ],

    nonFunctionalRequirements: [
      'NL2SQL generation and query explanation complete within 3 seconds',
      'Query execution SLA depends on data warehouse; dashboard must surface slow-query warnings above 30 seconds',
      'NL2SQL accuracy above 80% on common business questions without query correction',
      'Row-level security must never be bypassable by any AI-generated query',
      'Support multi-tenant isolation: one customer cannot access another\'s schema or data',
      'Proactive insight generation runs nightly without impacting dashboard query latency',
    ],

    estimation: {
      users: '50,000 business users across 1,000 company customers; peak 5,000 concurrent during business hours',
      storage: 'Schema metadata: ~1 MB per customer * 1,000 customers = 1 GB; query logs: 5 KB/query * 5M queries/month = 25 GB/month',
      bandwidth: 'Query results are the main load — vary widely; cached dashboard results are ~1 MB/load; AI response text is negligible',
      qps: '~60 NL2SQL requests/sec at peak; most trigger warehouse queries that run for seconds to minutes',
    },

    apiDesign: {
      description: 'REST API for natural language query, schema management, and insight retrieval',
      endpoints: [
        { method: 'POST', path: '/api/v1/query', params: '{ question, datasource_id, context_history?: [{ question, sql }] }', response: '{ query_id, generated_sql, explanation, chart_type_recommendation }', description: 'Translate natural language to SQL with explanation' },
        { method: 'POST', path: '/api/v1/query/:id/execute', params: '{ confirmed: true }', response: '{ columns[], rows[][], row_count, execution_ms }', description: 'Execute the generated SQL after user review' },
        { method: 'GET', path: '/api/v1/insights', params: 'datasource_id, date_range?, focus_metrics[]?', response: '{ insights: [{ title, summary, chart_data, change_pct, anomaly_score }] }', description: 'Get proactively generated insights for a datasource' },
        { method: 'POST', path: '/api/v1/schema/annotations', params: '{ table, column, business_name, description, example_values[] }', response: '{ annotation_id }', description: 'Annotate schema column with business context to improve NL2SQL' },
        { method: 'GET', path: '/api/v1/query-history', params: 'user_id?, from, to, limit', response: '{ queries[{ id, question, sql, executed_at, row_count }] }', description: 'Retrieve user\'s past queries for replay or sharing' },
      ],
    },

    dataModel: {
      description: 'Datasource schemas, queries, annotations, and generated insights',
      schema: `datasources {
  id: uuid PK
  org_id: bigint FK
  name: varchar
  type: enum(postgres, bigquery, snowflake, redshift)
  connection_config: jsonb   -- encrypted connection string, database, schema
  row_security_policy: jsonb -- { user_column, allowed_values_per_role }
}

schema_annotations {
  id: uuid PK
  datasource_id: uuid FK
  table_name: varchar
  column_name: varchar nullable   -- null = table-level annotation
  business_name: varchar
  description: text
  example_values: text[]
  updated_by: bigint FK
  updated_at: timestamp
}

nl_queries {
  id: uuid PK
  user_id: bigint FK
  datasource_id: uuid FK
  question: text
  generated_sql: text
  explanation: text
  execution_status: enum(pending, executed, rejected, failed)
  row_count: int nullable
  execution_ms: int nullable
  created_at: timestamp
}

ai_insights {
  id: uuid PK
  datasource_id: uuid FK
  generated_at: timestamp
  insight_type: enum(trend, anomaly, period_comparison, top_n)
  title: varchar
  summary: text
  sql_basis: text
  chart_type: varchar
  chart_data: jsonb
  change_pct: float nullable
}`,
      examples: [
        { table: 'nl_queries', label: 'Revenue question with generated SQL', json: `{ "id": "qry-3c9f", "user_id": 44201, "datasource_id": "ds-main", "question": "What was total revenue last quarter broken down by product category?", "generated_sql": "SELECT p.category, SUM(o.amount) as revenue FROM orders o JOIN products p ON o.product_id = p.id WHERE o.created_at >= '2025-01-01' AND o.created_at < '2025-04-01' GROUP BY p.category ORDER BY revenue DESC", "explanation": "Sums order amounts from the orders table joined to products, filtering to Q1 2025 (January through March), grouped by product category.", "execution_status": "executed", "row_count": 12, "execution_ms": 843 }` },
        { table: 'ai_insights', label: 'Proactive anomaly insight', json: `{ "id": "ins-7b2a", "datasource_id": "ds-main", "generated_at": "2025-04-22T06:00:00Z", "insight_type": "anomaly", "title": "Support tickets spiked 340% on April 21", "summary": "Ticket volume on April 21 was 1,820 compared to a 7-day average of 540. The spike began at 2pm UTC and is concentrated in the Payments category (78% of tickets).", "change_pct": 337.0 }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'User types a question, the full database schema is injected into an LLM prompt with the question, and the model returns SQL. The SQL is executed and results are shown in a table.',
      problems: [
        'Injecting the full schema for a database with 500 tables blows the context window and degrades generation quality',
        'No row-level security: generated SQL has no WHERE clause limiting to the user\'s authorized rows',
        'Business terminology mismatch: LLM does not know that "revenue" means orders.amount, not a column named revenue',
        'No query explanation before execution: users blindly execute generated SQL they cannot verify',
        'No follow-up context: each question is independent — "break that down by region" does not know what "that" refers to',
        'No proactive insights: system only responds, never initiates',
      ],
    },

    advancedImplementation: {
      title: 'Schema-Aware RAG with Security Injection and Proactive Insight Engine',
      description: 'Instead of injecting the full schema, a schema retrieval step embeds the user question and retrieves the top-10 most semantically relevant tables and columns from a pre-indexed schema catalog. Business annotations (business_name, description, example_values) are included alongside technical column names. The NL2SQL prompt includes retrieved schema, business context, and explicit row-security policy instructions that must appear in every generated WHERE clause. A query review step checks the generated SQL against the security policy before execution. Proactive insights run nightly as scheduled SQL templates with LLM-generated summaries.',
      keyPoints: [
        'Schema RAG: embed question → retrieve relevant tables/columns from schema index → inject only relevant subset into NL2SQL prompt (reduces prompt size from 50K to 2K tokens for large schemas)',
        'Business annotation injection: schema retrieval includes human-curated business names and descriptions; "what is our revenue?" correctly maps to orders.amount because the annotation says so',
        'Security policy injection: every generated SQL query has a policy-enforced WHERE clause appended post-generation; cannot be overridden by user prompt engineering',
        'SQL validation layer: before execution, the generated SQL is parsed and checked against a permission matrix (table allowlist, column allowlist, prohibited operations like DROP or UPDATE)',
        'Conversation context: last 5 question-SQL pairs stored in session; follow-up questions pass prior SQL as context so "break that down" knows what query to extend',
        'Chart type auto-selection: classify result shape (single value → metric card; time series → line chart; category breakdown → bar chart; top-N → horizontal bar; raw rows → table)',
        'Proactive insight engine: nightly job runs 20 templated queries per datasource (week-over-week for key metrics, top-N changes, anomaly detection via Z-score); LLM generates title and summary for each result',
      ],
      databaseChoice: 'PostgreSQL for query logs, schema annotations, and insight storage; pgvector for schema embedding index (table and column descriptions embedded for semantic retrieval); Redis for session conversation context and result caching; customer data warehouses (BigQuery, Snowflake, etc.) remain in customer infrastructure — we connect via read-only service accounts',
      caching: 'NL2SQL result cached by (question_embedding_hash, datasource_schema_hash, user_role) with 30-minute TTL for identical questions; schema embedding index cached in memory and refreshed when schema annotations are updated; proactive insights cached in DB until next nightly run',
    },

    tips: [
      'Row-level security enforcement is the most critical design point — an AI analytics tool that leaks data across user roles is a legal liability',
      'Schema RAG is the key to scaling beyond small schemas — explain why injecting the full schema fails',
      'Business annotations are what make NL2SQL accurate for real-world data — the column is called "amt" but the business calls it "revenue"',
      'Show query before executing — users need to verify the generated SQL before trusting results, especially for financial reporting',
      'Proactive insights are the high-value feature that justifies adoption — describe how the nightly insight engine works',
      'Disambiguation strategy: when a question is ambiguous, ask a clarifying question rather than guessing and generating wrong SQL',
    ],

    keyQuestions: [
      {
        question: 'How do you generate accurate SQL from natural language while enforcing security?',
        answer: `**NL2SQL Accuracy Challenges**:
1. Schema terminology mismatch: user says "revenue", table has column "order_total_usd"
2. Implicit date math: "last quarter" → compute start/end dates relative to today
3. Ambiguous table joins: "customers who bought X" → which join path through 3 tables?
4. Aggregation intent: "show me sales by region" → SUM or COUNT, what grouping?

**Solution: Schema-Annotated RAG Prompt**:
\`\`\`
AVAILABLE TABLES (retrieved by semantic search on question):
  orders (business name: "Sales Transactions")
    - id: unique order ID
    - amount: order total in USD (business name: "Revenue")
    - created_at: when the order was placed
    - user_id: FK to users.id

  products (business name: "Product Catalog")
    - id: unique product ID
    - category: product category name

SECURITY REQUIREMENT: Every query must include WHERE org_id = 4021

USER QUESTION: What was total revenue last quarter by product category?

Generate SQL:
\`\`\`

**Security Injection** (non-bypassable):
\`\`\`python
# After LLM generates SQL, append security filter
generated_sql = llm_generate(prompt)
# Parse to AST, find all WHERE clauses
# Inject mandatory security predicates
secure_sql = inject_security_predicates(
  generated_sql,
  predicates=["org_id = ?", "user_role IN (?)"],
  params=[user.org_id, user.allowed_roles]
)
# Validate no prohibited operations (DROP, UPDATE, DELETE, INTO)
validate_readonly(secure_sql)
\`\`\`

**Feedback Loop**:
- When users correct generated SQL, log the (question → corrected_sql) pair
- After 1,000 corrections: fine-tune the NL2SQL model on customer's schema and terminology
- Accuracy typically improves from 75% to 90%+ on domain-specific questions after fine-tuning`,
      },
    ],

    keyDecisions: [
      'Full schema injection vs schema RAG retrieval — chose schema RAG; full schema injection exceeds context window for large databases and dilutes the relevant signal',
      'LLM-enforced security vs post-generation security injection — chose post-generation injection; LLM instructions can be overridden by adversarial prompts; security must be enforced in code, not in LLM instructions',
      'Execute immediately vs show query before execution — chose show query before execution for new users and complex queries; experienced users can toggle to auto-execute mode',
      'Build proactive insights on customer warehouse vs replicate data — chose run directly on customer warehouse with read-only service account; data replication creates freshness lag and increases storage cost',
      'Single NL2SQL model vs per-database-type fine-tuned model — chose single model with database dialect specification in the prompt; per-dialect fine-tuning is expensive and the accuracy gain is marginal for standard SQL',
    ],
  },

  // ─── C6. Email Auto-Response ──────────────────────────────────────────────────
  {
    id: 'email-auto-response',
    isNew: true,
    title: 'Email Auto-Response System',
    subtitle: 'Gmail Smart Reply / Superhuman AI / HubSpot AI Email',
    icon: 'messageSquare',
    color: '#8b5cf6',
    difficulty: 'Medium',
    description: 'Design an AI system that classifies incoming emails, generates contextual draft replies matching the user\'s writing style, and provides one-click short reply suggestions.',

    introduction: `Email remains the dominant communication channel in professional settings, and the average knowledge worker spends 2-4 hours per day managing their inbox. AI email assistance attacks this from two directions: triage (which emails need a response at all, and with what priority) and generation (what should the response say, in the sender's voice).

The triage problem is well-understood: multi-class classification trained on email content, sender relationships, and historical response behavior. The generation problem is harder. A generated reply that does not match the sender's tone, vocabulary, or formality level feels obviously robotic and reflects poorly on the sender. Personalization of the generation model to each user's writing style — without requiring them to label examples explicitly — is the key technical challenge.

The system must also handle the privacy implications of sending email content to an AI service. Professional email often contains sensitive business information, client data, and confidential negotiations. The architecture must make clear what is processed, where it is processed, and how it is retained, with appropriate controls for enterprise customers.`,

    functionalRequirements: [
      'Classify incoming emails by action type: action required, meeting request, FYI, newsletter, spam',
      'Score email priority based on sender relationship, content urgency, and response history',
      'Generate contextual draft replies that match the user\'s writing style and formality level',
      'Provide 3 short one-click reply options (accept, decline, acknowledge) for common email patterns',
      'Detect meeting requests and suggest available times from calendar integration',
      'Summarize long email threads before generating a reply suggestion',
      'Flag emails containing sensitive patterns (legal, financial, confidential) for human-only reply',
      'Allow users to provide tone preferences (formal, casual) and custom phrases to preserve',
    ],

    nonFunctionalRequirements: [
      'Triage classification must complete within 500ms of email receipt',
      'Draft reply generation must complete within 3 seconds',
      'Short reply suggestions must display within 1 second of email open',
      'Writing style personalization must update from as few as 20 sent emails',
      'Enterprise customers must be able to opt out of sending email content to shared model infrastructure',
      'Zero email content stored beyond the active session without explicit user consent',
    ],

    estimation: {
      users: '1M professional users; average 50 emails received and 20 replies sent per day',
      storage: 'Style models: ~50 MB per user * 1M users = 50 TB total (model fine-tune artifacts); raw email content not stored',
      bandwidth: '~10 KB avg email * 50M emails/day = 500 GB/day processed (all ephemeral)',
      qps: '~580 new emails/sec at peak; each triggers classification + short-reply generation; draft generation is on-demand',
    },

    apiDesign: {
      description: 'REST API consumed by email client plugins (Gmail, Outlook) for real-time assistance',
      endpoints: [
        { method: 'POST', path: '/api/v1/emails/classify', params: '{ subject, body, sender_email, thread_history? }', response: '{ action_type, priority_score, flags: ["meeting_request","sensitive","newsletter"] }', description: 'Classify email and return triage signals' },
        { method: 'POST', path: '/api/v1/emails/short-replies', params: '{ subject, body, sender_email, user_id }', response: '{ suggestions: [{ text, intent: "accept"|"decline"|"acknowledge" }] }', description: 'Generate 3 one-click reply suggestions' },
        { method: 'POST', path: '/api/v1/emails/draft', params: '{ thread_history[], user_id, tone?: "formal"|"casual", instructions? }', response: 'SSE stream of draft text', description: 'Generate a full draft reply matching user writing style' },
        { method: 'POST', path: '/api/v1/emails/meeting-times', params: '{ email_body, user_id, calendar_token }', response: '{ suggested_slots: [{ start, end, timezone }], meeting_duration_minutes }', description: 'Extract meeting request and suggest available times' },
        { method: 'POST', path: '/api/v1/users/:id/style-update', params: '{ sent_emails: [{ subject, body, recipient_type }] }', response: '{ style_updated: true, sample_count: N }', description: 'Update user writing style model from recent sent emails' },
      ],
    },

    dataModel: {
      description: 'User style profiles, classification events, and feedback',
      schema: `user_style_profiles {
  user_id: bigint PK
  formality_level: float       -- 0.0 (very casual) to 1.0 (very formal)
  avg_sentence_length: float
  signature_phrases: text[]    -- phrases the user commonly uses
  vocabulary_profile: jsonb    -- frequent bigrams/trigrams
  style_sample_count: int
  last_updated: timestamp
}

email_triage_events {
  id: uuid PK
  user_id: bigint FK
  email_hash: varchar(64)      -- SHA-256 of subject + sender + timestamp, not body
  predicted_action_type: varchar
  predicted_priority: float
  flags: text[]
  user_overrode: boolean
  latency_ms: int
  created_at: timestamp
}

reply_feedback {
  id: uuid PK
  user_id: bigint FK
  request_type: enum(short_reply, draft)
  suggestion_index: int nullable
  accepted: boolean
  edit_distance: int nullable   -- chars changed before sending
  created_at: timestamp
}`,
      examples: [
        { table: 'user_style_profiles', label: 'Formal user writing style profile', json: `{ "user_id": 50021, "formality_level": 0.82, "avg_sentence_length": 18.4, "signature_phrases": ["Best regards", "Please let me know if you have any questions", "I hope this message finds you well"], "style_sample_count": 245, "last_updated": "2025-04-22T01:00:00Z" }` },
        { table: 'reply_feedback', label: 'Accepted draft with minor edits', json: `{ "id": "fb-3c7a", "user_id": 50021, "request_type": "draft", "accepted": true, "edit_distance": 38, "created_at": "2025-04-22T10:15:00Z" }` },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A keyword classifier labels emails as actionable or FYI. A prompt-engineered LLM generates a generic draft reply using only the email content. All users get the same generic drafts with no personalization.',
      problems: [
        'Keyword classifier misses context — "let me know" is a call to action in some emails, filler in others',
        'Generic drafts do not match the user\'s writing style — formal users get casual replies, casual users get stiff formal replies',
        'No thread context — reply generated from just the latest email, missing prior conversation history',
        'No meeting detection — user must manually check calendar and paste available times',
        'No sensitivity detection — confidential legal communications get auto-draft suggestions',
        'Style never improves — same generic template for day 1 and day 365 users',
      ],
    },

    advancedImplementation: {
      title: 'Personalized Style-Matched Generation with Thread Summarization and Meeting Integration',
      description: 'Each user has a lightweight writing style profile extracted from their sent email history without storing email content: formality score, average sentence length, signature phrases, and a vocabulary n-gram profile. Incoming emails are classified by a fine-tuned BERT model (trained on labeled email datasets) and scored for priority using sender relationship graph signals (does the sender appear frequently in the user\'s sent folder?). Draft generation uses the style profile to adjust the LLM prompt: formality instruction, sentence length target, and injected signature phrases. Thread summarization condenses long chains before the generation step. A calendar connector retrieves available slots when a meeting request is detected.',
      keyPoints: [
        'Style profiling without raw content storage: extract statistical features (sentence lengths, punctuation patterns, vocabulary frequency) from sent emails; discard content, retain only the feature vector',
        'Sender relationship scoring: senders with frequent prior email exchanges score higher priority; senders in the user\'s address book but with no history score medium; cold senders score lower',
        'Meeting detection as a sub-classifier: trained to detect scheduling intent (proposed times, duration, agenda) and extract structured meeting parameters (duration, preferred days, timezone) for calendar lookup',
        'Style injection in generation prompt: "Reply in a formal tone with average 15-word sentences. Use these phrases naturally if appropriate: [Best regards, Please advise, I hope this message finds you well]"',
        'Thread summarization pre-pass: for threads over 3 messages, summarize the thread first, then generate a reply based on the summary rather than the full thread (avoids context window overflow and improves coherence)',
        'Sensitivity flagging rules engine: regular expressions detect common sensitive patterns (privileged communications, NDA references, financial figures above threshold, PII patterns) before AI processing; flagged emails show a warning and suppress auto-draft',
        'Feedback loop: edit distance between suggested draft and sent email drives style profile updates; low edit distance = style profile is accurate; high edit distance = profile needs adjustment',
      ],
      databaseChoice: 'PostgreSQL for user style profiles and triage event logs; Redis for active session context and rate limiting per user; calendar integration via OAuth2 to Google Calendar / Outlook 365 APIs; email content never persisted — processed in memory only',
      caching: 'Short reply suggestions cached by (subject_embedding_hash, sender_type) for common email patterns (meeting invites, status update requests); style profiles cached in Redis per user with 1-hour TTL; classification model loaded in memory on all workers',
    },

    tips: [
      'Writing style personalization is what differentiates from a generic LLM chatbot — explain how you extract style without storing content',
      'Sender relationship graph is a powerful signal for priority scoring that is often overlooked',
      'Meeting detection and calendar integration is a concrete, high-value feature — walk through it specifically',
      'Sensitivity flagging is important for enterprise adoption — IT and legal teams block AI email tools that do not have it',
      'Short reply suggestions (3 one-click options) are higher-adoption than full draft generation — simpler but very useful',
      'Privacy architecture is critical — explain clearly what is processed ephemerally vs what is retained',
    ],

    keyQuestions: [
      {
        question: 'How do you match the user\'s writing style without storing their emails?',
        answer: `**The Privacy Constraint**:
Email content must not be stored. But writing style requires learning from examples.

**Solution: Extract Statistical Features, Discard Content**

Processing pipeline (runs client-side or on secure ephemeral server):
\`\`\`
For each sent email:
  1. Parse into sentences
  2. Extract features:
     - Sentence lengths (distribution)
     - Punctuation frequency (Oxford comma? Ellipsis? Exclamation points?)
     - Opening phrase (e.g., "Hi [Name]," vs "Dear [Name],")
     - Closing phrase (e.g., "Best," vs "Thanks!" vs "Regards,")
     - First-person frequency (ratio of I/me/my to total words)
     - Paragraph count per email
  3. Update running style profile (no email content retained)
  4. Discard email text
\`\`\`

**Style Profile (stored, not email content)**:
\`\`\`json
{
  "formality_score": 0.78,
  "avg_sentence_length_words": 16.2,
  "sentence_length_variance": 4.1,
  "uses_oxford_comma": true,
  "opening_patterns": {
    "Hi [Name],": 0.6,
    "Hello [Name],": 0.3,
    "Dear [Name],": 0.1
  },
  "closing_patterns": {
    "Best regards,": 0.7,
    "Thanks,": 0.3
  },
  "exclamation_per_email": 0.3
}
\`\`\`

**Injecting Style into Generation**:
\`\`\`
System prompt injection:
"Write in a formal professional style.
Average sentence length: 16 words.
Use "Best regards," as the closing.
Avoid exclamation points.
Match this opening style: 'Hi [Name], I hope this finds you well.'"
\`\`\`

After generation, measure edit distance between suggestion and sent email. Low distance validates style accuracy; high distance triggers style profile adjustment.`,
      },
    ],

    keyDecisions: [
      'Keyword classifier vs fine-tuned BERT for triage — chose fine-tuned BERT; keyword matching cannot handle paraphrasing and misses contextual signals like urgency embedded in polite language',
      'Process email in browser extension vs send to cloud — chose cloud with ephemeral processing and user-controllable opt-out for sensitive accounts; browser processing is too slow for complex classification',
      'Extract style from all sent emails vs sample recent emails — chose rolling window of last 100 sent emails; style evolves over time and old emails may not reflect current communication preferences',
      'Pre-generate drafts on email receipt vs on-demand generation — chose on-demand; pre-generating for every incoming email wastes compute and most users do not reply to most emails',
      'Store generated drafts in email client vs re-generate on open — chose re-generate on open; stored drafts become stale if context changes between receipt and response',
    ],
  },
];
