// MLOps & LLMOps — interview prep covering ML lifecycle, feature stores,
// model registry, serving, drift detection, LLM ops, and evals.

export const mlopsCategories = [
  { id: 'mlops-core', name: 'MLOps & LLMOps', icon: 'cpu', color: '#84cc16' },
];

export const mlopsTopicCategoryMap = {
  'mlops-lifecycle':             'mlops-core',
  'feature-stores':              'mlops-core',
  'model-registry-mlflow':       'mlops-core',
  'model-serving-kserve-bento':  'mlops-core',
  'model-drift-detection':       'mlops-core',
  'llmops-evals-prompts':        'mlops-core',
  'llm-serving-vllm-tgi':        'mlops-core',
};

export const mlopsTopics = [
  {
    id: 'mlops-lifecycle',
    title: 'MLOps Lifecycle',
    icon: 'cpu',
    color: '#84cc16',
    questions: 5,
    description: 'End-to-end machine-learning lifecycle as an engineering discipline — data ingestion, feature engineering, training, evaluation, registration, deployment, monitoring, retraining. Covers CI for ML (data validation, model tests), CD for ML (canary, shadow, A/B), Google MLOps maturity 0/1/2, and 2026 platforms.',
    visualizations: [
      {
        title: 'The eight-stage lifecycle and CI/CD for ML',
        description: `MLOps applies DevOps principles to machine-learning systems. Where DevOps versions code and config, MLOps versions code, data, features, models, and the training pipeline. The lifecycle has eight stages.

1. Data ingestion. Raw data from operational systems (Kafka, CDC, batch dumps, APIs) into a warehouse or lake (Snowflake, BigQuery, Databricks, S3 + Iceberg/Delta). Schema enforced; PII tagged; lineage recorded.

2. Feature engineering. Raw rows become features. Two physical paths: offline features computed in batch (Spark, dbt, Snowflake SQL) for training, online features served at low latency (Redis, DynamoDB, feature store) for inference. Point-in-time correctness — what was this feature's value at training time? — is the core problem feature stores solve.

3. Training. Code + data + hyperparameters produce a model artifact. Tracked in experiment store (MLflow, W&B, Vertex Experiments).

4. Evaluation. Holdout test set, slice-based evaluation (per-segment fairness), business metric proxies. Gate: does this model beat the current production model?

5. Registration. Promote artifact to a model registry (MLflow Registry, W&B Models, Vertex Model Registry, SageMaker Model Registry). Stages: None → Staging → Production → Archived. The registry is the boundary between research and ops.

6. Deployment. Pull registered model into serving environment. Patterns: canary, shadow, A/B, blue/green.

7. Monitoring. Online: latency, throughput, error rate. Offline: data drift, concept drift, prediction distribution shift, performance decay against delayed labels. Tools: Evidently, Arize, Fiddler, WhyLabs, Datadog ML Monitoring.

8. Retraining and iteration. Triggered by schedule, drift threshold, performance decay, or new data. Closed loop is what distinguishes MLOps from "we trained a model once".

CI for ML — what changes vs CI for code:
- Unit tests on training code (still apply).
- Data validation tests (Great Expectations, TFX Data Validation, Deequ) — schema, ranges, null rates, distribution shifts.
- Model tests — minimum metric on a fixed test set, behavioral tests (CheckList-style invariance, directional, MFT), fairness tests across slices.
- Contract tests — input/output schema between training and serving.

CD for ML — three deployment patterns:
- Canary: small percent of real traffic to new model. Watch online metrics. Roll back fast.
- Shadow: 100% mirrored, predictions logged, never returned to user. Best for "is this model behaving sensibly on production traffic?" without risk.
- A/B: split users 50/50, run for statistical power, decide on business metric.

Google's MLOps maturity model:
- Level 0 — manual process. Notebooks, scripts, hand-off between data scientist and engineer. Most companies live here.
- Level 1 — ML pipeline automation. Training pipeline is code, runs on schedule or trigger. Models flow through registry. Continuous training but manual deployment.
- Level 2 — CI/CD pipeline automation. Training pipeline itself ships through CI/CD. New code triggers a pipeline build, which produces a new training pipeline, which produces a new model, deployed automatically.

Most production ML in 2026 is Level 1. Level 2 is the bar for high-volume recommendation, search, ads.

The 2026 platform landscape:
- Databricks (Lakehouse + MLflow + Feature Store + Model Serving) — strong if you use Spark/Delta.
- Vertex AI (GCP) — Pipelines, Feature Store, Model Registry, Endpoints.
- SageMaker (AWS) — Pipelines, Feature Store, Model Registry, Endpoints, Clarify, Model Monitor.
- Azure ML — Pipelines, Feature Store (preview/GA), Endpoints.
- Weights & Biases — experiment tracking + Models registry. Strong UX.
- Open source stack — MLflow + Kubeflow Pipelines + Feast + KServe + Evidently.

The deeper point: MLOps maturity is a function of release cadence, not tooling sophistication. A team retraining quarterly does not need Level 2; a team retraining hourly cannot survive without it.`,
        image: '/diagrams/devops/m1-mlops-lifecycle.png',
      },
      {
        title: 'Quick-fire interview answers — MLOps Lifecycle.',
        question: 'Quick-fire interview answers — MLOps Lifecycle.',
        answer: `Rapid-fire facts.

Q: Define MLOps in one line.
A: DevOps principles applied to ML — versioning code/data/features/models, automating training/deployment/monitoring.

Q: How is it different from DevOps?
A: ML pipelines have three inputs (code, data, hyperparameters) and three outputs (model, metrics, lineage).

Q: The eight lifecycle stages?
A: Ingest, feature engineer, train, evaluate, register, deploy, monitor, retrain.

Q: Google MLOps maturity levels?
A: Level 0 manual, Level 1 pipeline automation, Level 2 CI/CD on the pipeline itself.

Q: Where do most teams sit?
A: Level 0 to Level 1.

Q: Three CD patterns for models?
A: Canary, shadow, A/B.

Q: What is shadow deployment?
A: Mirror production traffic to new model, log predictions, never return them to users.

Q: Why is canary harder for ML?
A: User-level consistency — keep users on same model for the session.

Q: Top experiment trackers in 2026?
A: MLflow (OSS), W&B, Vertex Experiments, Neptune, Comet.

Q: Top model registries?
A: MLflow Registry, W&B Models, Vertex Model Registry, SageMaker Model Registry.

Q: Data validation tools?
A: Great Expectations, TFX Data Validation, Deequ, Soda.

Q: What is point-in-time correctness?
A: Training-time value of a feature must be what it was at the moment the label event occurred.

Q: Behavioral tests?
A: CheckList-style — invariance, directional, minimum functionality. Common in NLP.

Q: What triggers retraining?
A: Schedule, data drift threshold, performance decay, new labeled data, manual.

Q: Reproducibility — what to pin?
A: Dataset hash, git SHA, container digest, package versions, seeds.

Q: Pipeline orchestrators in 2026?
A: Kubeflow Pipelines, Vertex AI Pipelines, SageMaker Pipelines, Airflow, Prefect, Dagster, Metaflow.

Q: Why is rollback hard?
A: Model rolls back instantly; downstream caches, derived features, trained-on data do not.

Q: Databricks vs Vertex AI vs SageMaker?
A: Databricks for Spark/Delta. Vertex on GCP. SageMaker on AWS. Capability parity in 2026.

Q: Open-source MLOps stack?
A: MLflow + Kubeflow Pipelines + Feast + KServe + Evidently.

Q: What is a model card?
A: Documented summary — intended use, training data, metrics, fairness, limitations. Mitchell et al. 2018.

Q: Most common MLOps anti-pattern?
A: Hand-off — data scientist trains in notebook, throws pickle file over the wall, engineer redoes feature pipeline. Two implementations, training-serving skew.

Q: First investment for Level 0 team?
A: Experiment tracking (MLflow) and a model registry. Stops the pickle-file hand-off.

These are answers an MLOps-fluent platform engineer should give without preparation.`,
      },
    ],
    references: [
      'https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning',
      'https://mlflow.org/docs/latest/index.html',
      'https://docs.databricks.com/en/machine-learning/index.html',
      'https://docs.aws.amazon.com/sagemaker/latest/dg/mlops.html',
      'https://cloud.google.com/vertex-ai/docs/start/introduction-mlops',
      'https://ml-ops.org/',
    ],
  },

  {
    id: 'feature-stores',
    title: 'Feature Stores',
    icon: 'cpu',
    color: '#84cc16',
    questions: 5,
    description: 'Centralized service for computing, storing, and serving features for both training and inference — eliminates training-serving skew and enables feature reuse. Feast (OSS), Tecton (commercial), Hopsworks, SageMaker FS, Vertex FS, Databricks FS.',
    visualizations: [
      {
        title: 'Feature stores — what they solve and the 2026 landscape',
        description: `A feature store is a centralized system that computes feature values, stores them, and serves them to two consumers: the training pipeline (offline) and the inference service (online). The problem it solves is training-serving skew.

Training-serving skew — the canonical failure mode. The data scientist computes a feature in a notebook using SQL on the warehouse: "average order value over last 30 days". The engineer reimplements it in the production service using Redis aggregations. Subtle differences (window boundaries, timezone handling, null handling) produce features that disagree by a few percent. The model trained on the warehouse version performs worse in production than in offline evaluation. This is the #1 ML production failure pattern.

Feature stores eliminate this by making feature computation a single definition shared by both paths.

Architecture — four logical components:
1. Feature definition / registry. Defined once as code (Python decorator, SQL transform, YAML spec).
2. Offline store. Historical feature values for training and batch scoring. Warehouse tables (BigQuery, Snowflake, Delta, Iceberg).
3. Online store. Latest feature values for low-latency serving. Key-value store (Redis, DynamoDB, Bigtable, Cassandra). Single-digit-ms reads.
4. Materialization / sync engine. Computes features (batch via Spark/SQL, streaming via Flink/Spark Streaming) and writes both stores consistently.

Point-in-time correctness — the technical heart. When training a model on an event from 14 days ago, every feature value joined to that event must reflect what it was 14 days ago, not now. A naive join leaks future information into the training set; the model overfits to data it would not have at inference time, then collapses in production.

Feature stores implement point-in-time joins (also called "as-of joins"): for each label event at time T, fetch the feature value where the feature timestamp is the latest one ≤ T.

The 2026 vendor landscape:

Feast. OSS, originated at Gojek + Tecton 2019. BYO-infrastructure. Bring offline store (BigQuery/Snowflake/Redshift), online store (Redis/DynamoDB/Bigtable), Feast wires up definitions, materialization, serving. Most popular OSS.

Tecton. Commercial, founded 2020 by Uber Michelangelo team. Managed feature platform. Same conceptual model as Feast (founders also created Feast) but with managed infrastructure, streaming feature support, sub-50ms feature server. Targets enterprises.

Hopsworks. Open-core, originated at Logical Clocks. Strong on data versioning (Apache Hudi internally), notebooks, on-prem deployments. Common in regulated industries.

Databricks Feature Store. Native to Lakehouse — offline is Delta tables, online published to KV store. Default if you live on Databricks.

SageMaker Feature Store (AWS, GA 2020). Offline on S3, online on managed KV. Tight integration with SageMaker. Underwhelming on streaming.

Vertex AI Feature Store (GCP, redesigned 2024). Online store BigQuery-backed via continuous materialization. Sub-50ms reads.

When justified:
- Multiple models share features.
- Online inference at high QPS.
- Streaming features that must be consistent.
- Multiple teams + governance (who owns this feature, what's its SLO).

When over-engineering:
- Single batch model, no online serving.
- One team, three features, no reuse.
- Rapid prototyping phase.

The boundary: more than one team with more than one online model.

Feature monitoring. Should track: freshness (vs SLO), drift, null rate, value range, training-serving consistency. Tools: Evidently, Tecton built-in, Hopsworks built-in.

The deeper point: feature stores are infrastructure for an organizational problem (feature reuse and consistency across teams), not a technical problem.`,
        image: '/diagrams/devops/m2-feature-stores.png',
      },
      {
        title: 'Quick-fire interview answers — Feature Stores.',
        question: 'Quick-fire interview answers — Feature Stores.',
        answer: `Rapid-fire facts.

Q: Define a feature store in one line.
A: Centralized system for computing, storing, and serving ML features consistently to training and inference.

Q: What problem does it solve?
A: Training-serving skew — features computed differently in offline training and online serving.

Q: Two physical stores?
A: Offline store (warehouse/lake — for training) and online store (KV — for low-latency serving).

Q: What is point-in-time correctness?
A: Each label event joins to the feature value as of that event's timestamp, not the current value.

Q: Top OSS feature store?
A: Feast.

Q: Who created Feast?
A: Gojek (2018), open-sourced 2019, now under LF AI & Data.

Q: Top commercial standalone?
A: Tecton.

Q: On-prem / regulated?
A: Hopsworks.

Q: Cloud-native feature stores?
A: Databricks FS, Vertex AI FS, SageMaker FS.

Q: Typical online store backends?
A: Redis, DynamoDB, Bigtable, Cassandra, Cosmos DB.

Q: When justified?
A: Multiple models reusing features, online serving at scale, streaming features, multi-team governance.

Q: When over-engineering?
A: One team, one batch model, three features, no online serving.

Q: What is a feature view in Feast?
A: A logical group of features computed for an entity from a data source.

Q: Streaming features — best support?
A: Tecton, Databricks. Feast has push API but you do more work.

Q: Latency target for online reads?
A: Sub-50ms p99 typical; Tecton claims sub-10ms.

Q: Common operational mistake?
A: Stale online features — TTL not set or materialization lagging.

Q: Build vs buy?
A: Buy / use cloud-native if your platform already includes it. Adopt Feast if you want OSS and BYO. Tecton if you want managed and standalone.

Q: Most overlooked concern?
A: Cost. Online store at high QPS on DynamoDB or managed Redis adds up fast.

These are answers an MLOps-fluent platform engineer should give without preparation.`,
      },
    ],
    references: [
      'https://docs.feast.dev/',
      'https://docs.tecton.ai/docs/introduction',
      'https://docs.hopsworks.ai/',
      'https://docs.databricks.com/en/machine-learning/feature-store/index.html',
      'https://docs.aws.amazon.com/sagemaker/latest/dg/feature-store.html',
      'https://cloud.google.com/vertex-ai/docs/featurestore',
    ],
  },

  {
    id: 'model-registry-mlflow',
    title: 'Model Registry',
    icon: 'cpu',
    color: '#84cc16',
    questions: 5,
    description: 'Centralized versioned store for trained models — the boundary between research and production. Covers staging lifecycle, lineage, model cards, and the 2026 registry landscape (MLflow as default OSS, W&B Models, Vertex/SageMaker registries, Hugging Face Hub for foundation models).',
    visualizations: [
      {
        title: 'Model registry — what it stores and the 2026 landscape',
        description: `A model registry is a versioned catalog of trained model artifacts. It sits between training pipeline and deployment pipeline. Without a registry, "the production model" is whichever pickle file someone uploaded to S3 with a timestamped filename.

What the registry stores:
- Model artifact reference (pointer to actual weights in object storage + hash).
- Version (monotonically increasing per registered model name).
- Stage (None, Staging, Production, Archived).
- Signature (input/output schema; enforced at deploy time).
- Lineage (training run, dataset hash, hyperparameters, metrics, code SHA).
- Model card (intended use, training data, metrics by slice, limitations).
- Tags and metadata.

Lifecycle:
1. Log model — after training.
2. Register — version 1 created in stage None.
3. Promote to Staging — automated tests run.
4. Promote to Production — often gated by human approval. Serving polls registry or receives webhook.
5. Archive — previous Production version moved to Archived but retained for rollback.

The 2026 registry landscape:

MLflow Model Registry. OSS, dominant. Originated at Databricks 2018, donated to LF AI & Data 2020. Tracks models, versions, stages, signatures, aliases. MLflow 2.x added alias system (Production, Staging are now aliases not hard-coded stages). MLflow 3.0 (2024-2025) deepened with Prompts and Evaluation as first-class objects.

W&B Models (Weights & Biases). Commercial. Strong UI for comparing model versions, lineage to W&B runs and datasets, automated lineage graphs. Used heavily in deep learning.

Vertex AI Model Registry (GCP). Native to Vertex. Models flow naturally Vertex Training → Registry → Endpoints. Supports model evaluation as first-class object since 2023.

SageMaker Model Registry (AWS). Within SageMaker. Concept of "model package groups" and "model packages". Approval workflow built in.

Azure ML Model Registry. Same pattern. Less differentiated.

Hugging Face Hub. For foundation models, the de facto registry — open and gated weights, model cards, lineage to datasets.

Comet ML, Neptune.ai. Smaller commercial alternatives.

MLflow in detail. Four components:
1. MLflow Tracking. Logs experiments — runs, parameters, metrics, artifacts. Backed by tracking server with database (Postgres/MySQL) and artifact store (S3/GCS/Azure Blob).
2. MLflow Models. Standardized format ("MLmodel" file plus dependencies) so the same artifact loads via any flavor (sklearn, pytorch, tensorflow, transformers, custom Python function). The "pyfunc" flavor is the lowest common denominator.
3. MLflow Model Registry. Versioned catalog with stages (deprecated in favor of aliases in MLflow 2.x).
4. MLflow Projects. Reproducible packaging format for ML code. Less adopted.

MLflow 3.0 additions: Prompts as first-class, Evaluation as first-class, deeper LangChain/LlamaIndex/OpenAI/Anthropic autologging, improved tracing for agentic workflows.

Lineage in detail. The registry is the consumption point of lineage. Required edges:
- Model → training run.
- Training run → dataset version.
- Training run → git SHA.
- Training run → environment digest.
- Model → previous Production version.

Tools that automate: MLflow autologging, W&B run.use_artifact() / log_artifact(), Vertex Lineage.

Model cards in 2026. Required in regulated industries (EU AI Act high-risk systems must document training data, performance, limitations).

Common failure modes:
- Registry without lineage. Models exist; nobody can reproduce or explain them.
- Stages used inconsistently.
- No archival policy.
- Manual promotion without automated checks.

The deeper point: the registry is governance infrastructure. Its value is auditability and reproducibility — answer "what is in production, why, and what would we roll back to?" in seconds.`,
        image: '/diagrams/devops/m3-mlflow.png',
      },
      {
        title: 'Quick-fire interview answers — Model Registry.',
        question: 'Quick-fire interview answers — Model Registry.',
        answer: `Rapid-fire facts.

Q: Define a model registry in one line.
A: Versioned catalog of trained model artifacts with stages, lineage, and signatures.

Q: Standard stages?
A: None, Staging, Production, Archived. MLflow 2.x prefers aliases.

Q: Top OSS registry?
A: MLflow Model Registry.

Q: Who created MLflow?
A: Databricks (2018). Donated to LF AI & Data 2020.

Q: Top commercial?
A: Weights & Biases Models.

Q: Cloud-native registries?
A: Vertex Model Registry, SageMaker Model Registry, Azure ML Registry.

Q: Foundation model registry?
A: Hugging Face Hub.

Q: What is a model card?
A: Documented summary of intended use, training data, metrics, fairness, limitations. Mitchell et al. 2018.

Q: Why model cards matter in 2026?
A: EU AI Act and other regulations require documentation for high-risk systems.

Q: What is a model signature?
A: Input and output schema — enforced at deploy and serve time.

Q: What's in lineage?
A: Training run, dataset version, git SHA, environment digest, hyperparameters, metrics.

Q: Promotion to Production — what gates?
A: Automated tests (signature, eval on frozen test set, load test) and often human approval.

Q: Rollback strategy?
A: Promote a prior Archived version back to Production.

Q: Four MLflow components?
A: Tracking, Models, Model Registry, Projects.

Q: What is MLflow autologging?
A: Auto-capture of params, metrics, model from popular frameworks.

Q: What is the pyfunc flavor?
A: Lowest-common-denominator model interface — a Python predict function.

Q: MLflow 3.0 additions?
A: Prompts as first-class, Evaluation as first-class, deeper LLM autologging.

Q: MLflow Aliases vs Stages?
A: Aliases (champion, challenger, production-blue) are flexible; legacy Stages are deprecated.

Q: How does W&B Models differ from MLflow?
A: Commercial, polished UI, lineage graphs, integrated with W&B runs and datasets.

Q: Common failure modes?
A: Registry without lineage; inconsistent stage usage; no archival policy; manual promotion without tests.

Q: Storage backends?
A: Tracking DB (Postgres/MySQL) + artifact store (S3/GCS/Azure Blob).

Q: First investment when adopting MLflow?
A: Standardize log_model and register_model in your training pipeline.

These are answers an MLOps-fluent platform engineer should give without preparation.`,
      },
    ],
    references: [
      'https://mlflow.org/docs/latest/model-registry.html',
      'https://docs.wandb.ai/guides/models',
      'https://cloud.google.com/vertex-ai/docs/model-registry/introduction',
      'https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html',
      'https://huggingface.co/docs/hub/models',
      'https://arxiv.org/abs/1810.03993',
    ],
  },

  {
    id: 'model-serving-kserve-bento',
    title: 'Model Serving',
    icon: 'cpu',
    color: '#84cc16',
    questions: 5,
    description: 'Production model serving — low latency, autoscaling, multi-framework, GPU-aware. KServe (CNCF, K8s-native), BentoML (Python framework), Seldon Core, NVIDIA Triton (GPU-optimized), Ray Serve, ONNX Runtime, batch vs online, GPU sharing (MIG, MPS).',
    visualizations: [
      {
        title: 'Production model serving requirements and frameworks',
        description: `A model serving platform takes a registered model and exposes it as an HTTP/gRPC endpoint with predictable latency, autoscaling, and observability. The naive approach (Flask + pickle.load + uvicorn) works for one model at one QPS; production needs more.

What production needs:
- Low predictable latency (p50 and p99 within SLO; cold starts are the enemy).
- Autoscaling (horizontal pod scaling on QPS or GPU utilization; scale-to-zero for low-traffic).
- Multi-framework (sklearn, XGBoost, PyTorch, TensorFlow, ONNX, increasingly LLMs).
- Multi-model on one host (several small models share GPU memory).
- GPU efficiency (batching inflight requests, KV cache, GPU sharing).
- Observability (per-request and per-model metrics, prediction logging).
- Canary and rollout (traffic splitting, shadow, atomic switches).

The 2026 landscape:

KServe (CNCF, originated as KFServing 2019). K8s-native. InferenceService CRD declares model URI, framework, autoscaling, canary in one YAML. KServe v0.13+ supports both ModelMesh (many small models on shared pods) and individual deployments. Serverless mode uses Knative for scale-to-zero. Default in Kubeflow.

BentoML. Python framework. You write a Python class (a "Bento") with @bentoml.api endpoints; BentoML packages it as a Docker image with a runtime. Yatai is BentoML's Kubernetes operator.

Seldon Core. Older K8s-native serving framework, predates KServe. SeldonDeployment CRD with Predictors, Components, Transformers, Combiners. Acquired by HPE 2024. Losing ground to KServe.

NVIDIA Triton Inference Server. GPU-optimized, multi-framework (TensorFlow, PyTorch, ONNX, TensorRT, OpenVINO, Python, FIL for tree models). Dynamic batching, model concurrency, ensemble pipelines. Default for high-throughput GPU inference outside of LLMs.

Ray Serve. Built on Ray. Strongest at deployment graphs (one HTTP request fans out to multiple model calls). Python-native.

ONNX Runtime. Inference runtime for ONNX-format models. Cross-platform (CPU, GPU, mobile, browser via ONNX Runtime Web).

TorchServe (PyTorch's first-party). Maintained by AWS + Meta. Lost mindshare to KServe and Triton.

TensorFlow Serving (Google, original 2016). Still production-quality for TF SavedModels.

Cloud-native managed:
- Vertex AI Endpoints (GCP) — managed, autoscaling, multi-framework.
- SageMaker Endpoints (AWS) — real-time / serverless / async / batch transform variants.
- Azure ML Endpoints — online / batch / streaming.
- Databricks Model Serving — integrated with MLflow registry.

KServe in detail. The mental model: create an InferenceService Custom Resource with a model URI and runtime; KServe pulls the model, spins up pods, exposes HTTP/gRPC, autoscales via Knative or HPA. Concepts: Predictor (model-serving container; sklearn, xgboost, pytorch, tensorflow runtimes), Transformer (pre-/post-processing), Explainer (Alibi, SHAP), ModelMesh (multi-model serving), Inference Graph (multi-step pipelines as CRD).

BentoML in detail. Python-first. Components: Service (Python class with @bentoml.api), Runner (separable inference unit, useful for splitting CPU pre-processing from GPU inference), Bento (packaged artifact — model + code + deps + config; versioned, immutable). bentoml build packages; bentoml containerize produces Docker image. Yatai handles K8s glue.

Architectural patterns:
- Online serving (sync). REST or gRPC, single request → single prediction, sub-100ms.
- Batch serving. Spark / Dask / SageMaker Batch Transform / Vertex Batch Prediction.
- Async / queue-based. SQS / Pub/Sub queue, worker pulls, predicts, posts result.
- Streaming. Kafka / Pulsar in, predictions out.
- Edge. Mobile, IoT, browser via ONNX Runtime Web / TF.js / Core ML / TensorFlow Lite.

GPU sharing primitives:
- MIG (Multi-Instance GPU, NVIDIA A100/H100/B100). Hardware partition — one A100 becomes up to 7 isolated GPU instances.
- MPS (Multi-Process Service). Software-level concurrent process sharing on a GPU.
- Time-slicing. Default kubelet behavior — context switching, no memory isolation.
- Triton model concurrency. Multiple model instances within one process share GPU with controlled batching.

When to pick which:
- K8s-native, varied models, fast iteration: KServe.
- Python-first team, want code over YAML: BentoML.
- Mixed-language org, platform team owning image policy: Triton.
- Heavy customization, system packages: still Dockerfile + BuildKit.

The deeper point: model serving is more about operational characteristics than raw inference speed. Pick the framework that matches your stack.`,
        image: '/diagrams/devops/m4-kserve-bento.png',
      },
      {
        title: 'Quick-fire interview answers — Model Serving.',
        question: 'Quick-fire interview answers — Model Serving.',
        answer: `Rapid-fire facts.

Q: Define model serving requirements in one line.
A: Low predictable latency, autoscaling, multi-framework, GPU-efficient, observable, canary-able.

Q: Top OSS K8s-native?
A: KServe (CNCF).

Q: Top OSS Python-first?
A: BentoML.

Q: Top GPU multi-framework runtime?
A: NVIDIA Triton Inference Server.

Q: KServe origin?
A: KFServing inside Kubeflow, renamed KServe 2021, CNCF incubating.

Q: Seldon Core?
A: Older K8s-native framework, acquired by HPE 2024. Losing ground to KServe.

Q: What is ModelMesh?
A: KServe mode where many small models share pods.

Q: Ray Serve?
A: Built on Ray, strong on deployment graphs and Python-native scaling.

Q: ONNX Runtime?
A: Inference engine for ONNX models, cross-platform.

Q: Cloud-native managed serving?
A: Vertex Endpoints, SageMaker Endpoints, Azure ML Endpoints, Databricks Model Serving.

Q: SageMaker variants?
A: Real-time, Serverless, Asynchronous, Batch Transform, Multi-Model Endpoints.

Q: KServe canary?
A: canaryTrafficPercent on the InferenceService.

Q: Online vs batch serving?
A: Online: sync REST/gRPC, sub-100ms. Batch: Spark / SageMaker Batch / Vertex Batch.

Q: Async serving when?
A: Long-running inference (large transformers, multi-second responses).

Q: GPU sharing primitives?
A: MIG (hardware partition on A100/H100), MPS (process-level sharing), time-slicing (default, no isolation).

Q: Dynamic batching?
A: Wait briefly to coalesce concurrent requests into one GPU forward pass. Throughput up.

Q: V2 / KFServing inference protocol?
A: Standard request/response schema shared by KServe and Triton.

Q: Cold start mitigation?
A: Smaller images, model pre-pulled, warm pools, Knative min-replicas > 0.

Q: Best for multi-team multi-model density?
A: KServe ModelMesh or SageMaker Multi-Model Endpoints.

Q: Best for K8s-shy Python teams?
A: BentoML.

Q: Best for GPU throughput on diverse frameworks?
A: Triton.

Q: Yatai?
A: BentoML's K8s operator.

Q: Where does LLM serving fit?
A: Different stack — vLLM, TGI, TensorRT-LLM, SGLang. Covered separately.

These are answers an MLOps-fluent platform engineer should give without preparation.`,
      },
    ],
    references: [
      'https://kserve.github.io/website/',
      'https://docs.bentoml.com/en/latest/',
      'https://github.com/triton-inference-server/server',
      'https://docs.seldon.io/projects/seldon-core/',
      'https://docs.ray.io/en/latest/serve/index.html',
      'https://onnxruntime.ai/docs/',
    ],
  },

  {
    id: 'model-drift-detection',
    title: 'Model Drift Detection',
    icon: 'cpu',
    color: '#84cc16',
    questions: 5,
    description: 'Detecting when production models degrade — covariate shift, concept drift, label drift, prior probability shift. Detection methods (KS test, PSI, JS divergence, embedding distance), 2026 monitoring vendor landscape (Evidently, Arize, Fiddler, WhyLabs, Datadog, Aporia), retraining triggers, delayed-label problem.',
    visualizations: [
      {
        title: 'Drift types, detection methods, 2026 monitoring landscape',
        description: `A model deployed to production assumes the world it was trained on continues to exist. When the world shifts, predictions become unreliable. "Drift" is the umbrella term; multiple distinct phenomena live under it.

Type 1 — Covariate shift (input data drift). The distribution of input features P(X) changes; the relationship P(Y|X) is unchanged. Example: a fraud model trained on 2024 transaction patterns sees 2026 traffic dominated by mobile payments not present in training. Detection: per-feature distribution tests against a reference. Continuous: Kolmogorov-Smirnov test, Wasserstein distance, Population Stability Index (PSI). Categorical: Chi-squared test, Jensen-Shannon divergence. High-dimensional: embedding-space distance, MMD.

PSI is the workhorse — bins both reference and current, computes a single score. PSI < 0.1 stable, 0.1-0.25 moderate shift, > 0.25 significant.

Type 2 — Concept drift. The relationship P(Y|X) changes. Same inputs, different correct answer. Detection requires labels — hard because labels are often delayed. Methods: performance monitoring against ground truth, Page-Hinkley test, ADWIN, DDM.

Type 3 — Label drift / prior probability shift. The marginal P(Y) changes. Example: fraud rate goes from 1% to 3%; calibrated probabilities are now systematically wrong.

Type 4 — Performance decay. The umbrella outcome — actual model quality degrades. Symptoms; the others are causes.

The delayed-label problem — the hardest practical challenge. Many real systems get labels weeks or months after prediction (loan default 30/60/90 days; churn at billing period; fraud at chargeback). Without recent labels, you cannot compute current performance directly. Mitigations: monitor input drift and predicted distributions; use early proxy signals; maintain manually-labeled reference panel.

Detection methods in detail:
- KS test: Two-sample non-parametric. Sensitive to shifts but throws false positives on tiny samples.
- PSI: Tabular standard.
- Jensen-Shannon Divergence: Symmetric bounded version of KL divergence.
- MMD: Kernel-based test on high-dimensional data.
- Embedding distance: For unstructured inputs, embed and compute centroid drift.
- Domain classifier: Train a classifier to distinguish reference from current; if it succeeds, distributions differ.

The 2026 monitoring vendor landscape:

Evidently AI. Open source + commercial. Strong for tabular; prebuilt drift metrics, dashboards, CI integration. Most-adopted OSS choice.

Arize AI. Commercial. Strong on embeddings and LLM observability — visualize embedding clusters, surface drift in embedding space.

Fiddler AI. Commercial. Explainability + monitoring. Strong in regulated finance.

WhyLabs. Commercial. Founded by AWS Deequ alumni. whylogs OSS library.

Aporia. Commercial. ML monitoring with strong customization.

Datadog ML Monitoring. Datadog's entry, native to existing Datadog deployments.

Cloud-native: Vertex AI Model Monitoring (drift on tabular), SageMaker Model Monitor (data quality, model quality, bias, feature attribution), Azure ML Data Drift Monitor.

Retraining triggers:
- Scheduled: Fixed cadence. Simplest.
- Threshold-based: When drift / performance crosses threshold. Standard pattern.
- Continuous learning: Online retraining. For recommendation, ads, ranking. Demands strong infra.

What to monitor — three layers:
- Operational: latency, throughput, error rate, request volume.
- Input data: per-feature distribution drift, weighted by feature importance, schema validation.
- Model output: predicted probability/class distribution, calibration metrics.
- Performance (when labels arrive): precision, recall, AUC, business metric.

Reference window strategy:
- Static (training set): simple but goes stale.
- Sliding (last N days of production): catches recent drift, misses long-term shift.
- Layered: monitor against both.

Common pitfalls:
- False positives from undertrained sample sizes.
- Drift detected on irrelevant features.
- No feature importance weighting.
- Delayed labels make true performance invisible.
- Reference window stale.
- Retraining without root-cause analysis.

The deeper point: drift detection is alerting infrastructure for ML; like SRE alerting, the real challenge is signal-to-noise.`,
        image: '/diagrams/devops/m5-drift.png',
      },
      {
        title: 'Quick-fire interview answers — Model Drift Detection.',
        question: 'Quick-fire interview answers — Model Drift Detection.',
        answer: `Rapid-fire facts.

Q: Define model drift in one line.
A: Production data or relationships shifting away from training-time conditions, degrading model quality.

Q: Four types?
A: Covariate (input) shift, concept drift, label/prior shift, performance decay (the symptom).

Q: Covariate shift definition?
A: P(X) changes, P(Y|X) constant. Inputs look different.

Q: Concept drift?
A: P(Y|X) changes. Same inputs imply different correct answer.

Q: Label drift?
A: P(Y) marginal shifts. Class rates change.

Q: PSI thresholds?
A: < 0.1 stable, 0.1-0.25 moderate, > 0.25 significant. Tabular convention.

Q: KS test?
A: Two-sample non-parametric on continuous distributions.

Q: JS divergence?
A: Symmetric bounded KL. Good for categorical and binned features.

Q: MMD?
A: Kernel-based two-sample test. Works on high-dim embeddings without binning.

Q: What is the delayed-label problem?
A: Labels arrive weeks/months after prediction, so current performance is unknown.

Q: Mitigations?
A: Input drift monitoring, predicted-distribution monitoring, surrogate metrics, manually-labeled reference panel.

Q: Top OSS tool?
A: Evidently AI.

Q: Top embeddings/LLM monitor?
A: Arize AI.

Q: Top regulated-industry monitor?
A: Fiddler AI.

Q: WhyLabs differentiator?
A: whylogs OSS profiling library, distributed-pipeline-friendly.

Q: Cloud-native monitors?
A: Vertex Model Monitoring, SageMaker Model Monitor, Azure ML Data Drift Monitor.

Q: Three retraining triggers?
A: Scheduled, threshold-based, continuous learning.

Q: When is continuous learning right?
A: High-cadence systems — recommendations, ads, ranking.

Q: How to weight feature drift?
A: By feature importance — drift on low-importance features matters less.

Q: Reference window options?
A: Static (training set), sliding (last N days), or both layered.

Q: What is calibration?
A: Predicted probability vs actual rate. Drift here means probabilities aren't trustworthy.

Q: First investment for new model in production?
A: Operational metrics, then input drift, then output drift, then performance when labels arrive.

These are answers an MLOps-fluent platform engineer should give without preparation.`,
      },
    ],
    references: [
      'https://docs.evidentlyai.com/',
      'https://docs.arize.com/arize',
      'https://docs.fiddler.ai/',
      'https://docs.whylabs.ai/',
      'https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor.html',
      'https://cloud.google.com/vertex-ai/docs/model-monitoring/overview',
    ],
  },

  {
    id: 'llmops-evals-prompts',
    title: 'LLMOps',
    icon: 'cpu',
    color: '#84cc16',
    questions: 5,
    description: 'LLMOps as the LLM-shaped subset of MLOps — prompt versioning, evaluation harnesses, RAG observability, cost/token tracking, output guardrails. 2026 tooling: LangSmith, Promptfoo, Helicone, Patronus, OpenAI Evals, Guardrails AI, NeMo Guardrails.',
    visualizations: [
      {
        title: 'LLMOps — what is new vs MLOps, and the production stack',
        description: `LLMOps is what MLOps becomes when the model is a foundation LLM (GPT-4 / Claude / Gemini / Llama) and the artifact you ship is mostly prompts, retrieval pipelines, and tools — not weights.

What stays the same: versioning and lineage (now of prompts, retrieval configs, tool definitions), registries (MLflow 3 added prompts as first-class objects 2024), monitoring (drift becomes prompt-output drift, retrieval quality, refusal rates), CI/CD gates (now eval suites).

What is new:

1. Prompts as code. A prompt is a versioned artifact with tests. Tools: LangSmith Prompts, MLflow 3 Prompts, PromptLayer, Humanloop, W&B Weave, Pezzo, Mirascope.

2. Evaluation is the central problem. With foundation models, you don't train; you orchestrate. Quality is determined by prompt + retrieval + tool-use design.

Eval methodology:
- Reference-based: compare output to known-correct answer. Works for narrow tasks (extraction, classification).
- LLM-as-judge: use a strong model to rate outputs on rubrics. Cheap, scales, biased, requires careful rubric design. Standard practice 2026.
- Human eval: gold standard. Expensive. Used to validate LLM-as-judge calibration.
- Pairwise preference: judge picks A or B. Reduces absolute-score bias. The technique behind ChatBot Arena.
- Behavioral / red-team: prompts designed to surface failure modes — jailbreaks, hallucinations, PII leakage, bias.

Tools: LangSmith (eval harness with LLM-as-judge), Promptfoo (open-source CLI for CI), OpenAI Evals (OSS), Patronus AI (commercial eval/red-team), DeepEval (Python eval library, pytest-style), Helicone, LangFuse, Inspect (UK AISI), HELM (Stanford).

3. RAG observability. RAG systems have a retrieval pipeline (embedding model, vector store, reranker, chunker) and a generation step. Observability traces the full chain.

What to monitor:
- Retrieval quality: did retrieved chunks contain the answer?
- Context relevance: how much of retrieved context was actually relevant?
- Groundedness: did generated answer cite or rely on retrieved context, or hallucinate?
- Answer relevance: did the answer address the query?
- Per-chunk attribution: which chunks contributed to which parts of the answer?

Tools: LangSmith RAG evals, Ragas (open-source — faithfulness, answer relevance, context precision, context recall), TruLens, Arize AI, Patronus.

4. Cost and token tracking. Per-call cost is meaningful (sub-cent to dollars per call); aggregate cost matters; per-tenant cost matters for multi-tenant SaaS.

Track: tokens in/out per request, cost per request, cost per user/tenant/feature, cache hit rate, cost-per-task. Tools: Helicone, LangSmith, LiteLLM (proxy that routes across models), Datadog LLM Observability.

5. Guardrails — input and output filtering. LLM outputs can leak PII, generate unsafe content, produce malformed structured outputs.

Tools: Guardrails AI (Pythonic schema and rule validation), NVIDIA NeMo Guardrails (programmable rails for input, output, dialog flow), LlamaGuard (Meta fine-tuned safety classifier), Lakera Guard (commercial, prompt injection focus). Cloud-native: Bedrock Guardrails, Azure Content Safety, Vertex Safety Filters.

6. Agentic patterns. Agents (ReAct, plan-execute, multi-agent) introduce new failure modes — infinite tool loops, wrong tool selection, planning errors, accumulating context past limits. Mainstream agent platforms (LangGraph, OpenAI Assistants v2, Anthropic Agents, AutoGen) ship with tracing and eval hooks built in.

The 2026 LLMOps stack:
- Tracing/observability: LangSmith, Helicone, LangFuse, Arize, Datadog LLM Observability.
- Eval: Promptfoo (CI), LangSmith/LangFuse (production), Patronus (commercial).
- Prompt versioning: LangSmith Prompts, MLflow Prompts, PromptLayer.
- Guardrails: Guardrails AI, NeMo, Bedrock/Azure Content Safety.
- Cost tracking: Helicone, LiteLLM proxy.
- Foundation framework: LangChain or LlamaIndex (both maturing past 2023 chaos), DSPy (Stanford compiled prompt optimization).

Reference pipeline: User request → API gateway → LLM proxy (LiteLLM) → application logic → retrieval (vector store + reranker) → prompt assembly → LLM call → guardrail validation → response → tracing → eval sample.

Production discipline patterns:
1. Prompt-as-code in repo. Promptfoo runs eval suites on PRs. Reject regressions.
2. A/B prompts in production. Multiple prompt versions, route by percent, compare on metrics.
3. Continuous eval. Run eval against production sample daily. Track score over time.
4. Shadow agent. New version runs in shadow against production for a week before promotion.
5. Cost guardrails. Per-tenant cost cap, per-feature cap, per-user rate limit.

The deeper point: LLMOps is MLOps with new artifacts and new evaluation challenges. Tools converge on three pillars: prompt versioning, tracing + observability, evaluation.`,
        image: '/diagrams/devops/m6-llmops.png',
      },
      {
        title: 'Quick-fire interview answers — LLMOps.',
        question: 'Quick-fire interview answers — LLMOps.',
        answer: `Rapid-fire facts.

Q: Define LLMOps in one line.
A: MLOps applied to LLM-based applications — prompt versioning, eval, RAG observability, cost tracking, guardrails.

Q: How is it different from MLOps?
A: Artifacts are prompts + retrieval + tools, not weights. Evaluation is subjective. Cost is per-call meaningful.

Q: Top observability platform?
A: LangSmith. LangFuse for self-hosted.

Q: Top proxy-based observability?
A: Helicone.

Q: CI prompt testing tool?
A: Promptfoo.

Q: OSS RAG eval library?
A: Ragas.

Q: Eval methodologies?
A: Reference-based, LLM-as-judge, human eval, pairwise preference, red-team / behavioral.

Q: What is LLM-as-judge?
A: Use a strong model to rate outputs against a rubric. Standard practice 2026.

Q: When does LLM-as-judge fail?
A: Bias toward model family, position bias, verbosity bias.

Q: Pairwise preference advantage?
A: Removes absolute-score bias.

Q: RAG eval metrics?
A: Faithfulness, answer relevance, context precision, context recall, groundedness.

Q: What is groundedness?
A: Whether the answer is supported by the retrieved context — opposite of hallucination.

Q: Top eval/red-team commercial?
A: Patronus AI.

Q: Top guardrail libraries?
A: Guardrails AI, NVIDIA NeMo Guardrails, LlamaGuard, Lakera Guard, Bedrock Guardrails.

Q: Cost tracking proxy?
A: LiteLLM (open source), Helicone, Portkey.

Q: What to track for cost?
A: Tokens in/out, cost per request, per tenant, per feature, cache hit rate, cost per task.

Q: Prompt caching benefit?
A: Hits 90% cost reduction on repeated prompt prefixes (Anthropic, OpenAI 2024-2025).

Q: Prompt registry options?
A: LangSmith Prompts, MLflow 3 Prompts, PromptLayer, Humanloop, W&B Weave.

Q: LangChain in 2026?
A: Matured — LCEL and LangGraph stable. Production-ready for orchestration.

Q: LlamaIndex in 2026?
A: RAG-focused alternative; strong on data connectors and retrieval primitives.

Q: DSPy?
A: Stanford framework for compiled prompt optimization.

Q: Top LLM observability standard?
A: OpenTelemetry GenAI conventions, standardized 2024.

Q: First investment for new LLM app?
A: Tracing day one. Eval suite week one. Prompt versioning week two.

These are answers an MLOps-fluent platform engineer should give without preparation.`,
      },
    ],
    references: [
      'https://docs.smith.langchain.com/',
      'https://langfuse.com/docs',
      'https://www.promptfoo.dev/docs/intro/',
      'https://docs.ragas.io/',
      'https://www.guardrailsai.com/docs',
      'https://docs.nvidia.com/nemo/guardrails/index.html',
    ],
  },

  {
    id: 'llm-serving-vllm-tgi',
    title: 'LLM Serving',
    icon: 'cpu',
    color: '#84cc16',
    questions: 5,
    description: 'LLM inference is unique — KV cache, continuous batching, GPU memory bound. Covers vLLM (PagedAttention), HuggingFace TGI, NVIDIA TensorRT-LLM, SGLang (RadixAttention), llama.cpp, quantization (FP16/FP8/INT8/GPTQ/AWQ/GGUF), throughput-vs-latency, multi-tenant LLM hosting via LiteLLM.',
    visualizations: [
      {
        title: 'Why LLM serving is its own discipline and the 2026 landscape',
        description: `Serving an LLM is not the same as serving any other model. The architecture of autoregressive decoding creates constraints that drove an entire generation of specialized inference engines.

What makes LLM inference unique:

1. Two-phase computation. Prefill (process prompt, produce first token) is parallel and compute-bound; decode (generate one token at a time, autoregressively) is sequential and memory-bound.

2. KV cache dominates memory. For each token generated, the model caches key and value activations from each attention layer. KV cache size scales as 2 × layers × heads × head_dim × sequence_length × batch_size. For a 70B model with 8K context, KV cache is multiple GB per request. GPU memory becomes the throughput bottleneck.

3. Variable sequence length per request. Naive batching wastes massive amounts of compute and memory.

4. Inflight / continuous batching. Modern engines drop completed requests from the batch and add new ones at every decode step, so the GPU stays full. 5-10x over naive batching.

5. Long-context bottlenecks. Past 32K, KV cache grows linearly; attention compute grows quadratically. Optimizations: paged KV cache (vLLM PagedAttention), prefix sharing (RadixAttention), KV cache quantization, sparse attention, sliding window.

6. Quantization is mandatory at scale. Running 70B+ models in FP16 demands huge GPUs; quantization to FP8 / INT8 / 4-bit lets the same model fit on smaller GPUs at small quality reduction.

The 2026 LLM serving landscape:

vLLM (UC Berkeley, 2023). Open source. The dominant OSS LLM serving engine. Key innovations: PagedAttention (KV cache stored in non-contiguous physical pages, eliminating fragmentation), continuous batching, prefix caching, speculative decoding, distributed serving (tensor + pipeline + expert parallelism), wide model support (Llama, Mistral, Mixtral, Gemma, Qwen, DeepSeek, Phi, Falcon). OpenAI-compatible API server.

HuggingFace Text Generation Inference (TGI). Production-grade Rust+Python serving stack. Strong integration with HF Hub. Lost ground to vLLM after 2023. License changed in 2024 then back to permissive — check current license.

NVIDIA TensorRT-LLM. NVIDIA's optimized engine. Compiles a model graph for a specific GPU architecture (A100/H100/B100), applying kernel fusion, quantization, in-flight batching. Fastest on NVIDIA in absolute terms; less flexible (each model needs build step). Often paired with Triton for production.

SGLang (UC Berkeley, late 2023/2024). Open source. Focus on structured generation and prompt programs — first-class support for branching, multi-turn caching, structured outputs (JSON schema, regex constrained decoding). Key innovation: RadixAttention — prefix tree of KV cache enabling shared-prefix reuse across requests (massive win for chatbots with shared system prompts).

llama.cpp. C++ inference engine for CPU and Apple Silicon. Powers most local-LLM tools (Ollama, LM Studio, GPT4All). Not for high-throughput server deployment; ideal for edge, desktop, embedded.

MLC-LLM. Multi-platform compiler for LLMs (CPU, GPU, mobile, web).

Triton Inference Server (NVIDIA). Generic multi-framework inference server; with TensorRT-LLM backend serves LLMs efficiently on NVIDIA.

Cloud-native managed:
- AWS Bedrock — managed API for foundation models (Claude, Llama, Mistral, Cohere, Titan).
- Vertex AI Model Garden — Google's managed open-weight model hosting + Gemini API.
- Azure OpenAI Service.
- AWS SageMaker JumpStart, Bedrock Marketplace.
- Together AI, Anyscale, Fireworks AI, Replicate, Modal, Baseten.
- Groq — custom LPU hardware for fast inference.
- SambaNova, Cerebras — custom AI hardware.

Multi-tenant LLM hosting via proxy: LiteLLM (open-source proxy with unified OpenAI-compatible API across 100+ providers), Portkey, OpenRouter.

Quantization formats:
- FP16/BF16: 2 bytes per parameter. Default unquantized.
- FP8 (E4M3/E5M2): 8-bit float, native on H100/B100. About half FP16 memory.
- INT8: 8-bit integer. Common.
- GPTQ: Post-training 4-bit with calibration data.
- AWQ: Activation-aware 4-bit, often better quality than GPTQ.
- GGUF: Quantization-friendly format used by llama.cpp; 2-, 3-, 4-, 5-, 6-, 8-bit variants.

Throughput vs latency tradeoff:
- High batch size → high throughput, high p99 latency.
- Low batch size → low latency per request, low GPU utilization, high cost per token.
- Continuous batching wins both.
- Speculative decoding (draft model proposes, target verifies) improves latency without throughput cost.

How to choose:
- vLLM: OSS with broad model coverage, varied workloads, fast iteration, prefix caching for chat/RAG.
- TensorRT-LLM + Triton: Stable set of high-traffic models on NVIDIA, max throughput/lowest cost-per-token.
- SGLang: Prompt-program-heavy: structured outputs, multi-turn agents, branching, prefix sharing dominant.
- Managed (Bedrock/Vertex/Together/Anyscale/Fireworks): Don't want to operate GPU infra, need closed-weight models.

The deeper point: LLM serving is constrained by GPU memory and KV cache, not raw compute. The right engine depends on whether you optimize for throughput (vLLM, TensorRT-LLM), prompt program structure (SGLang), absolute latency (TensorRT-LLM, Groq), or cost (managed, quantization).`,
        image: '/diagrams/devops/m7-llm-serving.png',
      },
      {
        title: 'Quick-fire interview answers — LLM Serving.',
        question: 'Quick-fire interview answers — LLM Serving.',
        answer: `Rapid-fire facts.

Q: What makes LLM inference unique?
A: KV cache memory pressure, two-phase prefill/decode, variable sequence length, autoregressive decoding.

Q: Two phases?
A: Prefill (parallel, compute-bound) and decode (sequential, memory-bound).

Q: What is the KV cache?
A: Cached key/value attention activations per generated token. Dominant memory user.

Q: Continuous / inflight batching?
A: Drop finished requests and add new ones at each decode step. Single biggest throughput win.

Q: Top OSS LLM serving engine?
A: vLLM.

Q: vLLM origin and core innovation?
A: UC Berkeley 2023; PagedAttention — non-contiguous KV cache pages.

Q: Top NVIDIA-native engine?
A: TensorRT-LLM.

Q: TensorRT-LLM differentiator?
A: Pre-compiled engine per GPU architecture, fastest on NVIDIA.

Q: SGLang differentiator?
A: RadixAttention — prefix tree of KV cache for cross-request prefix reuse, plus structured generation.

Q: HuggingFace TGI?
A: Production Rust+Python stack; lost ground to vLLM but still deployed.

Q: llama.cpp?
A: C++ inference for CPU and Apple Silicon. Powers Ollama, LM Studio.

Q: GGUF format?
A: Quantization-friendly model format used by llama.cpp.

Q: GPTQ?
A: Post-training 4-bit weight quantization with calibration data.

Q: AWQ?
A: Activation-aware 4-bit quantization. Often better quality than GPTQ.

Q: FP8?
A: 8-bit floating point, native on H100/B100. Half the memory of FP16, minimal quality loss.

Q: Why quantize?
A: KV cache + weights both shrink, more requests fit in GPU memory, throughput rises.

Q: Throughput-latency tradeoff?
A: Larger batch → higher throughput, higher p99 latency. Continuous batching mitigates.

Q: Speculative decoding?
A: Cheap draft model proposes tokens, target verifies. Latency win when draft accurate.

Q: Prefix caching benefit?
A: Shared system prompts and RAG context computed once, reused across requests.

Q: Tensor parallelism?
A: Split a single layer's computation across multiple GPUs.

Q: Top managed APIs?
A: Bedrock, Vertex Model Garden, Azure OpenAI, OpenAI, Anthropic.

Q: Top third-party hosting?
A: Together AI, Fireworks, Anyscale, Replicate, Modal, Baseten, Groq.

Q: Groq?
A: Custom LPU hardware, very fast inference.

Q: LiteLLM?
A: OSS proxy with OpenAI-compatible API across 100+ providers.

Q: When pick vLLM?
A: OSS, varied models, fast iteration, open-weight LLMs, need prefix caching.

Q: When pick TensorRT-LLM?
A: Stable high-traffic models on NVIDIA, need max throughput.

Q: When pick managed?
A: Don't want GPU infra, need closed-weight models.

Q: First investment for self-hosted LLM?
A: Run vLLM behind LiteLLM, prefix caching enabled, on H100 with FP8 or AWQ quantization.

These are answers an MLOps-fluent platform engineer should give without preparation.`,
      },
    ],
    references: [
      'https://docs.vllm.ai/en/latest/',
      'https://github.com/huggingface/text-generation-inference',
      'https://nvidia.github.io/TensorRT-LLM/',
      'https://docs.sglang.ai/',
      'https://github.com/ggerganov/llama.cpp',
      'https://docs.litellm.ai/',
    ],
  },
];
