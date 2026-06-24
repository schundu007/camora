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
    introduction: `MLOps is the discipline of applying DevOps principles to machine-learning systems. Where DevOps versions code and configuration, MLOps versions code, data, features, models, and the training pipeline itself. The goal is to shorten the cycle from idea to production model and then keep that model performing reliably over time.

## Why MLOps exists

A model trained once and never retouched will degrade. Data distributions shift, labels become stale, upstream schemas change, and business rules evolve. Without systematic processes, teams discover model failures from user complaints rather than monitoring dashboards. MLOps builds the discipline that catches these failures early and closes the loop from detection back to retraining.

## The eight-stage lifecycle

The lifecycle begins at data ingestion -- raw data from operational sources (Kafka, CDC, batch exports, REST APIs) flows into a data lake or warehouse where schema is enforced and lineage is recorded. Feature engineering transforms raw rows into model inputs across two physical paths: offline batch computation for training and low-latency online serving for inference, which is exactly the problem feature stores were built to solve.

Training produces an artifact tracked in an experiment store with full reproducibility metadata -- dataset hash, git SHA, container digest, random seeds. Evaluation gates this artifact against a frozen holdout set, per-segment fairness slices, and business-metric proxies before it is registered in a model registry with stage, signature, and lineage attached.

Deployment moves the registered artifact into a serving environment using one of three patterns: canary (small real traffic), shadow (mirrored traffic, predictions never returned), or A/B (split users for statistical comparison). Monitoring watches both operational signals (latency, error rate) and model-quality signals (input drift, output distribution, delayed performance). When signals cross thresholds, retraining is triggered, completing the closed loop that distinguishes MLOps from one-off model training.

## Google MLOps maturity levels

Google's three-level maturity model is the standard framework for assessing an organization's MLOps sophistication. Level 0 is manual -- data scientists work in notebooks, hand off pickle files, and engineers re-implement feature pipelines. Most companies live at Level 0. Level 1 automates the training pipeline: code runs on schedule or data trigger, models flow through a registry, and continuous training happens with manual deployment gates. Level 2 automates the pipeline itself through CI/CD -- new code triggers a pipeline build, which produces a new training pipeline, which produces a new registered model, which deploys automatically. Level 2 is the operating standard for high-volume recommendation, search, and ads systems.

## The 2026 platform landscape

Databricks (Lakehouse + MLflow + Feature Store + Model Serving) dominates teams on Spark and Delta Lake. Vertex AI (GCP), SageMaker (AWS), and Azure ML each provide integrated managed pipelines for their respective clouds. The open-source stack -- MLflow, Kubeflow Pipelines, Feast, KServe, Evidently -- remains popular for cloud-agnostic setups. Weights and Biases occupies the experiment tracking and model registry space with strong UX for deep learning teams.

The key insight: MLOps maturity is a function of release cadence, not tooling sophistication. A team retraining quarterly does not need Level 2 automation; a team retraining hourly cannot survive without it.`,
    quickFire: [
      { q: 'Define MLOps in one sentence.', a: 'DevOps principles applied to ML -- versioning code, data, features, and models while automating training, deployment, and monitoring.' },
      { q: 'What are the eight MLOps lifecycle stages?', a: 'Data ingestion, feature engineering, training, evaluation, registration, deployment, monitoring, retraining.' },
      { q: 'What are Google MLOps maturity levels 0, 1, and 2?', a: 'Level 0 is manual notebooks; Level 1 automates the training pipeline; Level 2 automates CI/CD on the pipeline itself.' },
      { q: 'What is shadow deployment?', a: 'Mirror 100% of production traffic to the new model, log predictions, but never return them to users -- safe validation without risk.' },
      { q: 'How does CD for ML differ from CD for software?', a: 'Model deployments must also manage data consistency, feature pipeline versions, and model rollback -- not just code artifacts.' },
      { q: 'What triggers retraining in production?', a: 'A schedule, a drift-threshold crossing, performance decay against delayed labels, or arrival of a significant new data batch.' },
      { q: 'What must you pin for full ML reproducibility?', a: 'Dataset hash, git SHA, container image digest, package versions, random seeds, and training hyperparameters.' },
      { q: 'What is training-serving skew?', a: 'Features computed differently in the training pipeline vs the production serving path, causing offline metrics to overstate real performance.' },
      { q: 'Name the main pipeline orchestrators used in 2026.', a: 'Kubeflow Pipelines, Vertex AI Pipelines, SageMaker Pipelines, Airflow, Prefect, Dagster, and Metaflow.' },
      { q: 'What is the most common MLOps anti-pattern?', a: 'The hand-off: a data scientist trains in a notebook, throws a pickle file over the wall, and the engineer re-implements the feature pipeline, creating two divergent code paths.' },
      { q: 'What is a model card?', a: 'A documented summary of a model covering intended use, training data, performance metrics, fairness evaluation, and known limitations. Formalized by Mitchell et al. 2018.' },
      { q: 'Why is ML rollback harder than software rollback?', a: 'The model artifact rolls back instantly but downstream caches, derived features, and training data history do not, potentially causing silent inconsistencies.' },
    ],
    keyQuestions: [
      {
        question: 'Walk me through the full MLOps lifecycle from raw data to a monitored production model.',
        answer: `The lifecycle has eight stages that form a closed loop. It starts at data ingestion: raw events from Kafka topics, database CDC streams, or batch exports land in a data lake or warehouse (Snowflake, BigQuery, Delta on Databricks, or S3 with Iceberg). Schema is enforced, PII is tagged, and lineage is recorded so every downstream artifact can trace back to its source data.

Feature engineering transforms raw rows into model inputs. Two physical paths exist: an offline batch path (Spark, dbt, Snowflake SQL) that produces historical feature tables for training, and an online path (Redis, DynamoDB, or a feature store) that serves features at low latency during inference. Point-in-time correctness -- ensuring training features reflect what was known at label time -- is the central correctness concern here.

Training runs with tracked parameters, metrics, and artifacts (MLflow, W&B, Vertex Experiments). The resulting model artifact goes through evaluation: holdout-set metrics, per-segment fairness checks, and business-proxy comparisons against the current production model. Only if the new model clears all gates does it get registered in the model registry with full lineage.

Deployment pulls the registered artifact into a serving environment using canary, shadow, or A/B patterns. Monitoring watches operational signals (latency, error rate) and model-quality signals (input drift, output distribution, delayed performance). When a signal crosses a threshold, the retraining loop fires and the cycle begins again. The closed loop -- monitoring feeding back into retraining -- is what makes this MLOps rather than a one-time model launch.`,
      },
      {
        question: 'What is the difference between the three Google MLOps maturity levels and when does each apply?',
        answer: `Level 0 is the manual process most companies actually operate at. Data scientists work in notebooks, produce a trained model artifact (often a pickle or SavedModel), and hand it off to engineers who re-implement the feature pipeline in production code. There is no version control for data, no automated tests on the model, and deployment is a manual copy-paste operation. The cost is high human time, persistent training-serving skew, and no ability to retrain quickly.

Level 1 automates the training pipeline. Training is packaged as code that runs on a schedule or data trigger (not ad-hoc in a notebook). Models flow from training into a registry, then into deployment with defined stages. Continuous training happens but deployment still has human approval gates. This is the right target for teams that retrain weekly or monthly. The main investment is standardizing the training code into a pipeline and adopting an experiment tracker and model registry.

Level 2 adds CI/CD to the pipeline itself. A code change (new feature, new hyperparameter) triggers a CI pipeline that builds a new training pipeline, which runs to produce a new registered model, which deploys automatically after evaluation gates pass. This is a factory -- the output of CI/CD is not a deployed service but a deployed trained model. Level 2 is justified when retraining cadence is daily or faster (recommendation systems, ad ranking, fraud) and when the team is large enough that manual approval is the bottleneck. Most ML systems do not need Level 2 and over-investing there before achieving Level 1 discipline is a common mistake.`,
      },
      {
        question: 'How do you implement CI/CD for ML? What tests replace or augment standard unit tests?',
        answer: `CI for ML runs on every code or data change and gates promotion through a series of checks beyond standard software unit tests. Standard unit tests still apply to training code logic. What is added is a layer of data validation, model validation, and contract tests.

Data validation tests (Great Expectations, TFX Data Validation, Deequ, Soda) run on the training dataset: schema conformance, feature range checks, null-rate thresholds, and distribution shift versus a reference dataset. These catch upstream data pipeline failures before they produce a silently degraded model.

Model tests include a minimum-metric gate on a frozen holdout test set -- if AUC drops below X, the run fails. Behavioral tests (CheckList-style) verify invariance (identical inputs with protected attribute changed should produce similar output), directional tests (increasing X should increase predicted Y), and minimum functionality tests. Fairness tests run per-segment metrics against thresholds.

Contract tests verify the model's input and output signature matches what the serving layer expects -- catching breaking changes to feature schemas.

CD for ML adds deployment automation. After a model passes the CI gate and is registered, the CD pipeline promotes it through environments (staging, canary, production) with automated traffic shifting. Canary releases route a small percentage of real traffic to the new model and watch latency and prediction distribution before completing the rollout. Shadow runs give a risk-free view of new model behavior on production traffic. Rollback is a registry promotion of the previous archived version, ideally automated when monitoring alerts fire within a defined window.`,
      },
      {
        question: 'What platforms would you choose for MLOps in 2026 and why?',
        answer: `The right choice depends on cloud commitment, existing data stack, and team size. For teams already on Databricks with Spark and Delta Lake, the integrated Lakehouse stack (MLflow, Databricks Feature Store, Model Serving, Workflows) avoids context switching and covers the full lifecycle with native lineage. Databricks is the strongest single-vendor option for large-scale batch ML.

For teams on GCP, Vertex AI provides Pipelines, Feature Store, Model Registry, and Endpoints with strong Kubeflow Pipelines compatibility. For AWS teams, SageMaker Pipelines, Feature Store, Model Registry, and Model Monitor form the equivalent managed stack, with the advantage of tight IAM integration. Azure ML is structurally similar but less differentiated.

For cloud-agnostic or multi-cloud setups, the OSS stack is mature: MLflow for experiment tracking and model registry, Kubeflow Pipelines or Prefect/Dagster for orchestration, Feast for feature store, KServe for serving, Evidently for monitoring. This stack runs on any Kubernetes cluster and avoids vendor lock-in at the cost of more operational burden.

Weights and Biases is the right choice when the team prioritizes experiment tracking UX, visual comparison of model versions, and deep learning workflows -- it layers on top of any training infrastructure.

The practical rule: if your cloud provider's native stack covers your needs, use it -- managed infrastructure reduces operational overhead substantially. Adopt the OSS stack when portability, cost control, or specific capabilities (e.g., Feast's point-in-time joins) are the driving constraint.`,
      },
      {
        question: 'What is the difference between canary, shadow, and A/B deployment for models?',
        answer: `The three patterns differ in how much production traffic they expose to the new model and whether they return predictions to users, which determines the risk profile and the signal they produce.

Canary deployment sends a small percentage of real traffic (typically 1-10%) to the new model and returns those predictions to users. The rest of the traffic continues to the production model. You watch online metrics -- latency, error rate, prediction distribution, downstream business metrics. If metrics hold, you gradually increase the canary percentage. If they degrade, you roll back by setting the canary percentage to zero. Canary surfaces real user impact early but exposes some users to potentially worse predictions.

Shadow deployment mirrors 100% of production traffic to the new model but discards the new model's predictions -- users always see the production model's output. The shadow model's predictions are logged for offline comparison. Shadow is the lowest-risk pattern for validating behavior on production traffic: you learn whether the new model behaves sensibly, whether latency is acceptable, and whether outputs are well-formed, without any user impact. The cost is running the new model at full traffic cost without revenue benefit.

A/B testing splits users into groups (often 50/50 but can be any split) and returns each group's dedicated model's predictions. The experiment runs until statistical significance is achieved on a business metric. A/B requires larger traffic volumes and longer run times than canary to produce significant results. It is the right pattern when you need a business-metric decision (click rate, conversion, revenue per user) rather than just operational stability.

In practice, many teams use shadow first (validate behavior), then canary (validate stability at scale), then A/B (validate business impact) as a three-phase promotion protocol for high-stakes model changes.`,
      },
    ],
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
    introduction: `A feature store is a centralized system that computes, stores, and serves ML features consistently to two consumers: the training pipeline (offline) and the inference service (online). It exists to solve a single critical problem -- training-serving skew -- and then earns its keep over time by enabling feature reuse across teams and models.

## The core problem: training-serving skew

Training-serving skew is the most common ML production failure. A data scientist computes a feature in SQL on the warehouse -- average transaction value over the last 30 days. An engineer re-implements it in the production service using streaming aggregations. Subtle differences in window boundaries, timezone handling, or null semantics produce features that disagree by a few percent. The model, trained on the warehouse version, performs worse in production than in offline evaluation. The performance gap is real but nearly invisible in logs because no one is comparing feature values across environments.

Feature stores eliminate this by making feature computation a single shared definition that materializes to both the offline warehouse and the online key-value store from the same code path.

## Architecture: four components

Every feature store has four logical components. The feature definition registry stores feature logic as code -- a Python decorator, SQL transform, or YAML spec -- that is versioned and shared. The offline store holds historical feature values for training and batch scoring in a warehouse or lake (BigQuery, Snowflake, Delta Lake, Iceberg on S3). The online store holds the latest feature values for low-latency serving in a key-value store (Redis, DynamoDB, Bigtable, Cassandra) at single-digit-millisecond read latency. The materialization engine computes features (batch via Spark or dbt, streaming via Flink or Spark Streaming) and writes both stores consistently.

## Point-in-time correctness

Point-in-time correctness is the technical heart of feature store design. When training a model on a label event from 14 days ago, every feature value joined to that event must reflect what it was at that moment -- not its current value. A naive join leaks future information into the training set. The model appears to perform well on a test set because it saw data it would not have had at inference time; then it collapses in production. Feature stores implement point-in-time joins (also called as-of joins): for each label event at time T, fetch the feature row with the latest timestamp less than or equal to T.

## The 2026 vendor landscape

Feast is the dominant open-source option, originated at Gojek in 2018 and open-sourced in 2019. It follows a bring-your-own-infrastructure model -- you supply the offline store (BigQuery, Snowflake, Redshift) and online store (Redis, DynamoDB), and Feast provides the definition layer, materialization, and serving SDK.

Tecton is the leading commercial option, founded in 2020 by the team that built Uber Michelangelo. It manages infrastructure for you and adds sub-50ms feature serving, streaming feature support, and built-in monitoring. Hopsworks is strong in regulated and on-premises deployments. Cloud-native options (Databricks Feature Store, Vertex AI Feature Store, SageMaker Feature Store) are the default for teams already committed to those platforms.

## When to use a feature store

A feature store is justified when multiple models share features, when online inference runs at high QPS with latency SLOs, when streaming features must be consistent, or when multiple teams need shared governance. It is over-engineering for a single team with one batch model and three features. The boundary: more than one team with more than one online model.`,
    quickFire: [
      { q: 'What is a feature store and what problem does it solve?', a: 'A centralized system for computing, storing, and serving ML features consistently -- it solves training-serving skew and enables feature reuse across teams.' },
      { q: 'What are the two physical stores in a feature store?', a: 'Offline store (warehouse or lake for training data) and online store (key-value store for low-latency inference serving).' },
      { q: 'What is point-in-time correctness?', a: 'Each training label event joins to the feature value as it existed at the event timestamp, not the current value -- prevents future data leakage.' },
      { q: 'What is an as-of join?', a: 'For each label event at time T, fetch the feature row with the latest timestamp less than or equal to T.' },
      { q: 'Name the top OSS feature store.', a: 'Feast, originated at Gojek in 2018, open-sourced 2019, now under LF AI and Data.' },
      { q: 'What is Tecton and how does it differ from Feast?', a: 'Commercial managed feature platform founded by the Uber Michelangelo team. Managed infra, sub-50ms serving, streaming support -- Feast is BYO-infrastructure.' },
      { q: 'What are typical online store backends?', a: 'Redis, DynamoDB, Bigtable, Cassandra, Cosmos DB. Single-digit-millisecond read latency required.' },
      { q: 'When is a feature store over-engineering?', a: 'One team, one batch model, three features, no online serving, no cross-team reuse.' },
      { q: 'What is a feature view in Feast?', a: 'A logical group of features for an entity type, computed from a registered data source.' },
      { q: 'What is the materialization engine?', a: 'The component that computes feature values (batch or streaming) and writes them to both offline and online stores consistently.' },
      { q: 'What operational concern is most commonly overlooked?', a: 'Cost -- high-QPS online reads on DynamoDB or managed Redis can add up quickly; TTL and cache strategies matter.' },
      { q: 'Which feature store is best for regulated or on-premises deployments?', a: 'Hopsworks, which supports on-prem and has strong data versioning via Apache Hudi internally.' },
    ],
    keyQuestions: [
      {
        question: 'Explain training-serving skew. Why does it happen and how does a feature store prevent it?',
        answer: `Training-serving skew is the divergence between feature values computed during model training and feature values served at inference time, caused by two separate implementations of the same feature logic. A data scientist writes a SQL query on the data warehouse to compute "average purchase value over the last 30 days." An engineer re-implements this logic in the production service using a streaming aggregation on Redis. Differences in window boundary definitions (does "30 days" mean calendar days or rolling 24-hour windows?), timezone handling, how NULLs are treated, or rounding behavior produce features that disagree by a few percent on real data.

The model trains on the warehouse version, evaluates well on the warehouse holdout set, then performs noticeably worse in production -- but nobody sees the discrepancy because no monitoring compares offline features to online features. This is the canonical failure mode in production ML; studies suggest it accounts for a large fraction of the gap between offline and online model performance.

A feature store prevents this by making feature logic a single shared definition. You define the feature once as code (a Python function or SQL transform in the feature registry). The feature store materializes this definition to both the offline store (warehouse tables for training) and the online store (Redis for serving) using the same computation logic. When the training pipeline requests features for a batch of label events, it reads from the offline store. When the serving layer requests features for a live inference request, it reads from the online store. Both stores were populated from the same definition, so the values agree by construction.

The additional benefit is reuse: once a feature is registered, any model can use it. The "number of failed logins in the last hour" feature computed for a fraud model is available to the account security model without a second implementation.`,
      },
      {
        question: 'How does point-in-time correctness work and what happens if it is violated?',
        answer: `Point-in-time correctness (also called as-of joins or temporal correctness) requires that when training on a historical label event, every feature value joined to that event must reflect what was known at the event's timestamp -- not the current value and not any value from after the event.

Consider a loan application model trained on applications from the past two years. One feature is "customer credit score at application time." If you join the current credit score to each historical application, you violate point-in-time correctness: some customers improved their credit scores after applying, some defaulted and saw scores drop. The training set now contains future information the model would not have had when those applications were processed. The model appears to predict defaults well on the training set because it has signal (the score change) that preceded the default -- but in production, at application time, that future score change has not happened yet. The model's offline AUC looks excellent; its production performance is systematically worse.

Feature stores implement this via as-of joins: for each label event at timestamp T, fetch the latest feature row with event timestamp less than or equal to T. This requires the feature store to store feature values with timestamps (not just overwrite on update) and to support range queries by entity key and time.

Practical consequences of violating it: offline metrics overstate production performance (sometimes dramatically), the model uses signals it would not have in production, and A/B test results look worse than offline evaluation predicted. Debugging is hard because the skew is silent -- there is no error, just a metrics gap. The rule of thumb: any time you run a retrospective join for training, confirm the join is point-in-time safe.`,
      },
      {
        question: 'Compare Feast, Tecton, and cloud-native feature stores. When would you choose each?',
        answer: `Feast is the right choice when you want open-source, vendor-neutral infrastructure and your team is willing to operate the pieces. You bring your own offline store (BigQuery, Snowflake, Redshift, Delta on S3) and your own online store (Redis, DynamoDB, Bigtable), and Feast provides the feature definition registry, point-in-time join logic, materialization SDK, and serving API. The operational cost is non-trivial -- you manage Redis, handle materialization scheduling, and own the pipeline that keeps offline and online in sync. Best for organizations that are cloud-agnostic, have existing infrastructure preferences, or cannot commit to a commercial feature platform.

Tecton is the right choice when you want a managed platform with strong streaming support, SLA-backed serving, and enterprise governance features. Tecton manages the infrastructure (you do not operate Redis directly) and adds sub-50ms feature serving latency, streaming feature support (features updated in seconds from Kafka, not hours from batch), and built-in monitoring for freshness and drift. The founders built Uber Michelangelo, so the design reflects high-scale production experience. Cost is substantial; justified for organizations where feature reliability directly impacts revenue (e-commerce ranking, financial fraud, ads).

Cloud-native feature stores (Databricks Feature Store, Vertex AI Feature Store, SageMaker Feature Store) are the pragmatic choice when your team already operates on that cloud and wants to avoid adding a new vendor. Databricks Feature Store is the best of these if you use Delta Lake -- offline is a Delta table, online is published to a key-value store, and lineage flows naturally through the Lakehouse. Vertex AI Feature Store was redesigned in 2024 with BigQuery-backed continuous materialization. SageMaker Feature Store is tightly integrated with SageMaker but has historically had weaker streaming support.

The selection rule: if you are single-cloud and the native option meets your latency and streaming requirements, use it. If you need streaming at sub-minute freshness and cannot operate infrastructure, Tecton. If you need open-source and portability, Feast.`,
      },
      {
        question: 'How would you design a feature store for a real-time fraud detection system serving 10,000 QPS?',
        answer: `The design must satisfy three requirements: sub-10ms feature read latency at 10K QPS, consistent offline and online features for training, and freshness requirements on the order of minutes for streaming behavioral features.

For the online store, I would use Redis Cluster with read replicas. A 10K QPS workload is manageable with Redis -- it handles hundreds of thousands of reads per second per node. I would keep feature entities as Redis hash maps keyed by customer ID or card number, with TTLs set to match feature freshness SLOs. Redis Cluster distributes load across shards by key hash. Read replicas handle read spikes without hitting the primary.

For freshness, fraud features are mostly behavioral aggregations (failed login count last hour, transaction count last 10 minutes, new device flag). These must be updated from the event stream in near-real-time. I would run Flink or Spark Structured Streaming to consume the transaction Kafka topic, compute sliding window aggregations, and write results to Redis. The pipeline latency target is under two minutes -- meaning feature values are at most two minutes stale relative to events, which is acceptable for most fraud signals.

For training data, the offline store stores feature snapshots in a partitioned Delta or Parquet table with event timestamps. At training time, a point-in-time join fetches the feature value as of each labeled fraud event's timestamp. This ensures the model trains on what was known at decision time, not on features recomputed with post-event data.

Operationally, I would monitor: online store read latency at p50/p99, materialization lag (difference between event time and feature write time), null rate per feature, and per-feature PSI against the training distribution weekly. If materialization lag grows, scale the Flink job or add partitions. If Redis latency spikes, check hotspot keys (popular card numbers) and add local in-process caching with short TTL for the serving pods.`,
      },
      {
        question: 'What is the difference between batch materialization and streaming features, and when does each apply?',
        answer: `Batch materialization computes feature values by running a job (Spark, dbt, SQL) over historical data on a schedule -- hourly, daily, or weekly. The feature store writes the results to both offline storage (for training) and online storage (for serving). Batch is appropriate for features that change slowly: customer lifetime value, 30-day purchase history, account age, demographic data. Latency from event to feature update is hours, which is acceptable when the underlying signals change slowly.

Streaming features compute values continuously from an event stream (Kafka, Kinesis, Pub/Sub) using a streaming processing engine (Flink, Spark Structured Streaming, Materialize). Feature values are updated within seconds of the underlying events. Streaming is required for behavioral signals that must be fresh for the model to be accurate: number of failed login attempts in the last 10 minutes, number of transactions at this merchant in the last hour, whether this device is new for this user. For fraud detection, a feature that is two hours stale is nearly useless -- fraudsters complete their work in minutes.

The tradeoff: streaming features are operationally complex. You need a Flink or Spark Streaming cluster, careful exactly-once semantics, watermarking and late-data handling, and thorough testing to ensure streaming aggregations match the batch historical computation. Correctness is hard to verify.

The practical decision: start with batch materialization for all features. Add streaming only when latency requirements cannot be met by batch -- typically for use cases where the event-to-prediction window is under an hour (fraud, real-time recommendations, session-based models). Even in these cases, many features (account-level, demographic, historical) remain batch; only the recency signals need streaming. Tecton and Databricks have the strongest production-grade streaming feature support as of 2026.`,
      },
    ],
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
    introduction: `A model registry is a versioned catalog of trained model artifacts that serves as the formal boundary between the research environment and the production deployment pipeline. Without a registry, "the production model" is whatever pickle file an engineer last uploaded to S3 with a timestamped filename -- there is no authoritative source of truth, no promotion workflow, and no audit trail.

## What a registry stores

Every model version in a registry carries: an artifact reference (pointer to weights in object storage plus a cryptographic hash), a monotonically increasing version number, a lifecycle stage (None, Staging, Production, Archived), a model signature (input and output schema enforced at deploy time), full lineage (training run, dataset version, git SHA, hyperparameters, metrics, environment digest), a model card (intended use, training data, performance by slice, limitations), and arbitrary tags and metadata.

## The promotion lifecycle

A model enters the registry after training with stage None. After automated tests pass (signature verification, evaluation on a frozen holdout set, behavioral tests), it is promoted to Staging. Human approval or an additional automated gate promotes it to Production, where the serving layer polls for the current production version or receives a webhook notification. The previous Production version moves to Archived -- retained for rollback but not actively served.

## MLflow in depth

MLflow is the dominant open-source registry, originated at Databricks in 2018 and donated to the Linux Foundation AI and Data in 2020. It has four components: Tracking (experiments, runs, parameters, metrics, artifacts), Models (the MLmodel standardized format that packages weights and their loading flavor), Model Registry (versioned catalog with stages), and Projects (reproducible code packaging, less widely adopted). The pyfunc flavor is the lowest-common-denominator interface -- any MLflow model can be called as a Python predict function regardless of the underlying framework.

MLflow 2.x deprecated hard-coded stages in favor of aliases (champion, challenger, production-blue), which are more flexible for teams running multiple concurrent production versions. MLflow 3.0 added Prompts and Evaluation as first-class objects and deepened autologging for LLM frameworks including LangChain, LlamaIndex, and Anthropic.

## The 2026 landscape

Weights and Biases Models offers the strongest deep-learning workflow -- lineage graphs, visual comparison of model versions, native integration with W&B experiment runs and datasets. Cloud-native registries (Vertex AI Model Registry, SageMaker Model Registry, Azure ML) are the pragmatic default for cloud-committed teams. Hugging Face Hub is the de facto registry for foundation model weights -- open and gated models, model cards as a standard, and dataset lineage links.

The deeper point: the registry is governance infrastructure. Its value is auditability and reproducibility -- an organization should be able to answer "what is in production, why, and what would we roll back to?" in seconds.`,
    quickFire: [
      { q: 'What is a model registry in one sentence?', a: 'A versioned catalog of trained model artifacts with lifecycle stages, lineage, signatures, and model cards -- the boundary between research and production.' },
      { q: 'What are the standard model registry stages?', a: 'None, Staging, Production, Archived. MLflow 2.x replaced hard-coded stages with flexible aliases like champion and challenger.' },
      { q: 'What is a model signature?', a: 'The declared input and output schema for a model, enforced at deployment and serving time to catch breaking changes.' },
      { q: 'Who created MLflow and what are its four components?', a: 'Databricks in 2018, donated to LF AI and Data in 2020. Components: Tracking, Models, Model Registry, Projects.' },
      { q: 'What is the pyfunc flavor in MLflow?', a: 'The lowest-common-denominator model interface -- any MLflow model loadable as a Python predict function regardless of underlying framework.' },
      { q: 'What is a model card?', a: 'A documented summary of intended use, training data, performance metrics by slice, fairness evaluation, and known limitations. Formalized by Mitchell et al. 2018.' },
      { q: 'What does model lineage include?', a: 'Training run ID, dataset version hash, git SHA, environment digest, hyperparameters, metrics, and pointer to the prior production version.' },
      { q: 'What gates promotion from Staging to Production?', a: 'Automated tests (signature check, holdout evaluation, load test) and often a human approval step or a CI/CD gate.' },
      { q: 'How is rollback performed using a model registry?', a: 'Promote a prior Archived version back to Production -- the serving layer picks it up via registry poll or webhook.' },
      { q: 'What is the de facto registry for foundation model weights?', a: 'Hugging Face Hub -- open and gated model weights, standardized model cards, and dataset lineage.' },
      { q: 'What did MLflow 3.0 add?', a: 'Prompts and Evaluation as first-class objects, plus deeper autologging for LangChain, LlamaIndex, OpenAI, and Anthropic.' },
      { q: 'What are MLflow aliases and why replace stages?', a: 'Flexible string labels (champion, challenger, production-blue) that allow multiple concurrent production versions instead of a single Production slot.' },
    ],
    keyQuestions: [
      {
        question: 'What does a model registry store and why is it the critical boundary between research and production?',
        answer: `A model registry stores everything needed to identify, reproduce, deploy, and audit a trained model. At minimum this includes: the artifact reference (a pointer to weights in object storage plus a hash for integrity verification), a version number, a lifecycle stage, and lineage metadata -- training run ID, dataset version, git SHA, Docker image digest, hyperparameters, and evaluation metrics. Richer registries also store the model signature (input/output schema), a model card documenting intended use and known limitations, and arbitrary tags for filtering and governance.

The registry is the boundary between research and production because it enforces a formal handoff. Before the registry, a data scientist emails a pickle file to an engineer who uploads it to a shared S3 path and hopes the serving code still works with it. With a registry, the trained model must be registered (asserting a version), must pass automated checks before promotion to Staging (asserting quality), and must receive explicit approval before reaching Production (asserting accountability). The serving layer reads the current Production version from the registry rather than from a hard-coded path, so rollback is a registry operation -- promote the previous Archived version -- rather than a manual file swap.

The auditing value is equally important in regulated industries. The EU AI Act requires high-risk AI systems to maintain documentation of training data, evaluation results, and limitations. A registry with complete lineage makes this audit trail automatic rather than reconstructed after the fact. The question "what model is in production, trained on what data, with what performance?" should be answerable in seconds from the registry UI.`,
      },
      {
        question: 'Walk through an MLflow workflow from training to production promotion.',
        answer: `The workflow starts in the training script with MLflow Tracking. The script calls mlflow.start_run() to open a run, logs parameters (hyperparameters), logs metrics (AUC, F1) at each epoch or fold, and at the end calls mlflow.sklearn.log_model() or mlflow.pytorch.log_model() to serialize the model artifact to the artifact store (S3 or GCS) and record the MLmodel metadata file. mlflow.autolog() handles most of this automatically for supported frameworks.

After training completes, the CI pipeline calls mlflow.register_model() passing the run's artifact URI and a registered model name. This creates Version 1 (or increments the version) in the Model Registry with stage None. An automated evaluation job loads the model with mlflow.pyfunc.load_model(), runs it on the frozen test set, and if metrics pass the threshold, calls client.transition_model_version_stage(name, version, stage="Staging").

In Staging, more thorough tests run: signature validation, load testing, integration tests with the serving layer, and behavioral tests. A deployment pipeline or a human reviewer inspects the results and calls transition_model_version_stage with stage="Production". The serving layer -- KServe, BentoML, a custom FastAPI service, or Databricks Model Serving -- polls the registry for the current Production version via the MLflow client or REST API and loads the new artifact.

The previous Production version is automatically or manually transitioned to Archived, where it remains accessible for rollback. In MLflow 2.x you would instead use client.set_registered_model_alias(name, "champion", version) to point the serving alias at the new version, which the serving layer resolves by alias name at load time.`,
      },
      {
        question: 'How do you handle model versioning for a team releasing multiple models daily?',
        answer: `High-cadence teams need a registry design that avoids promotion bottlenecks while maintaining safety gates. The key patterns are automated promotion pipelines, alias-based serving, and parallel version slots.

Automated promotion pipelines remove human approval as the bottleneck. A CI/CD pipeline triggered by a training run completion runs a suite of automated tests: signature check, evaluation on a frozen holdout, behavioral invariance tests, and a load test. If all pass, the pipeline automatically promotes the model to Production with no human in the loop. Human review is reserved for special cases (new model architecture, fairness-sensitive change, significant distribution shift detected by automated tests).

Alias-based serving (MLflow 2.x aliases, W&B aliases) removes the single-Production-slot constraint. You can have champion (current production), challenger-a (canary serving 10%), and challenger-b (shadow) as active aliases simultaneously. The serving layer resolves the alias at request time, enabling multiple concurrent versions without overwriting the production pointer.

For model governance at scale, tag every version with the triggering PR number, the training data range, and the CI run ID. These tags let you correlate a production incident with a specific code change and training data window without manual archaeology. A registry webhook notifies the serving layer of a new production alias so deployments are instantaneous rather than polling-dependent.

The operational checklist for a daily-release team: automated evaluation gate, automated promotion if gate passes, alias-based serving for A/B/canary, version retention policy (keep last N versions, archive the rest), and a monitoring signal that correlates each production version with post-deployment metrics for accountability.`,
      },
      {
        question: 'When would you choose W&B Models over MLflow? When would you use Hugging Face Hub?',
        answer: `W&B Models is the right choice when your team is already using W&B for experiment tracking and wants a unified workflow where experiment runs, datasets, and model artifacts share a lineage graph. Its standout feature is the visual lineage graph -- you can navigate from a production model back through the training run to the exact dataset version and code commit without querying APIs. The comparison UX for model versions (side-by-side metric charts, confusion matrix diffs) is substantially richer than MLflow's default UI. It is the right choice for deep learning teams doing frequent architecture comparisons and for organizations where data scientists are the primary interface, not platform engineers writing automation scripts. The cost is commercial pricing and vendor lock-in relative to MLflow.

MLflow remains the right choice when you want open-source, self-hosted, and automation-first. Its REST API and Python client are mature; it integrates with every major training framework and serving layer; and it is the default in the Databricks ecosystem. It is the better foundation for platform engineering teams building internal tools on top.

Hugging Face Hub is not a replacement for either -- it is the distribution layer for foundation model weights. Use it when you are fine-tuning a base model (Llama, Mistral, Gemma, Qwen) and want to version and share the fine-tuned weights with lineage back to the base model and training dataset. The Hub's model card standard is now the de facto format for documenting foundation models, and many downstream tools (vLLM, TGI, Ollama) load models directly from Hub paths. For enterprise teams, the Hub's private repository model with access control and gated models handles IP protection. Combine Hub for weight storage and distribution with an internal registry (MLflow or W&B) for deployment lifecycle management of your fine-tuned models.`,
      },
      {
        question: 'What are the most common model registry anti-patterns and how do you fix them?',
        answer: `The most damaging anti-pattern is registry without lineage -- models exist as versioned artifacts but the training run, dataset, and environment that produced them were never recorded. The fix is to enforce logging at training time via a CI gate that rejects model registration without a valid run ID, dataset hash, and git SHA attached.

The second anti-pattern is inconsistent stage usage. Teams where some models are in Production because someone manually set the stage and others are in Production because the pipeline auto-promoted produce a registry where stage has no reliable meaning. The fix is to automate every stage transition and remove direct human write access to the registry -- all promotions go through the CI/CD pipeline, which enforces tests and records the reason.

The third anti-pattern is no archival policy. Registries accumulate thousands of versions over months. Storage costs grow, and the UI becomes unusable. The fix is a retention policy: keep the current Production, the prior three Archived versions (for rollback), and a rolling window of Staging versions. Everything else is garbage-collected.

The fourth anti-pattern is manual promotion without automated checks. A model is promoted from Staging to Production by an engineer who eyeballs the metrics and clicks a button. The fix is a mandatory CI gate that runs signature validation, evaluation on a frozen test set, and a load test before the promotion API call is made, with the test results logged as model tags.

The fifth anti-pattern is registry as the only documentation. The registry has a version number and some metrics but no model card, no description of intended use, no known failure modes. In 2026, with EU AI Act compliance requirements for high-risk systems, this is not just a hygiene issue but a legal risk. The fix is a model card template enforced at registration time -- the CI pipeline rejects registration without a populated card.`,
      },
    ],
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
    introduction: `Production model serving is the discipline of taking a registered model artifact and exposing it as a reliable, low-latency HTTP or gRPC endpoint that handles real traffic. The naive solution -- a Flask app that loads a pickle file at startup -- works for one model at single-digit QPS. Production needs autoscaling, multi-framework support, GPU efficiency, observability, and controlled deployment patterns.

## What production serving requires

The requirements cluster into six areas. Low and predictable latency means meeting p50 and p99 SLOs with cold-start mitigation. Autoscaling means horizontal pod scaling on request rate or GPU utilization, with scale-to-zero for cost efficiency during low-traffic periods. Multi-framework support means the same serving infrastructure handles sklearn, XGBoost, PyTorch, TensorFlow, ONNX, and increasingly LLMs without bespoke solutions for each. GPU efficiency means batching inflight requests, sharing GPU memory across multiple small models, and using hardware partitioning. Observability means per-request latency, per-model throughput, prediction logging, and canary-level traffic splitting. Controlled rollout means canary, shadow, and A/B traffic management at the serving layer.

## KServe

KServe (formerly KFServing) is the dominant Kubernetes-native model serving framework. It defines an InferenceService Custom Resource Definition (CRD) that declares the model URI, framework runtime, autoscaling configuration, and canary split in a single YAML manifest. KServe v0.13 supports two modes: individual deployments (one pod per model) and ModelMesh (many small models share a pool of pods, reducing overhead for large catalogs). Serverless mode uses Knative for scale-to-zero. KServe is the default serving layer in Kubeflow and is CNCF-incubating.

## BentoML

BentoML is a Python-first framework where developers write a Python class with decorated API endpoints, and BentoML handles packaging and deployment. A Bento is the versioned, immutable artifact -- model weights, code, and dependencies combined. Yatai is BentoML's Kubernetes operator. BentoML is the right choice for Python-native teams who want to stay in Python and avoid writing YAML-heavy serving configurations.

## NVIDIA Triton

NVIDIA Triton Inference Server is the GPU-optimized multi-framework runtime. It supports TensorFlow, PyTorch, ONNX, TensorRT-optimized models, OpenVINO, and Python backends. Key features are dynamic batching (coalescing concurrent requests into one GPU forward pass), model concurrency (multiple model instances within one Triton process), and ensemble pipelines (multi-step inference graphs). Triton is the default for high-throughput GPU inference outside of LLM workloads.

## GPU sharing primitives

Three mechanisms exist for sharing GPU resources. MIG (Multi-Instance GPU) is a hardware-level partition on NVIDIA A100 and H100 GPUs -- one A100 becomes up to seven isolated GPU instances each with guaranteed memory and compute, preventing noisy-neighbor problems. MPS (Multi-Process Service) is software-level concurrent process sharing on a GPU without hardware isolation. Time-slicing is the default Kubernetes GPU sharing -- context switching between processes with no memory isolation, leading to unpredictable latency. For multi-tenant serving, MIG is the correct production choice when hardware supports it.`,
    quickFire: [
      { q: 'What is KServe and what does InferenceService provide?', a: 'CNCF-incubating Kubernetes-native model serving framework. InferenceService CRD declares model URI, framework, autoscaling, and canary split in a single manifest.' },
      { q: 'What is BentoML and when is it the right choice?', a: 'Python-first serving framework -- you write Python classes with API decorators and BentoML packages and deploys them. Right for Python-native teams who want code over YAML.' },
      { q: 'What is NVIDIA Triton Inference Server?', a: 'GPU-optimized multi-framework inference server with dynamic batching, model concurrency, and ensemble pipelines. Default for high-throughput GPU inference outside LLMs.' },
      { q: 'What is ModelMesh in KServe?', a: 'A mode where many small models share a pool of pods rather than having dedicated pods per model, reducing overhead for large model catalogs.' },
      { q: 'What is dynamic batching?', a: 'Coalescing multiple concurrent inference requests into a single GPU forward pass, increasing throughput without changing the model.' },
      { q: 'What is the difference between MIG, MPS, and time-slicing for GPU sharing?', a: 'MIG is hardware-level partitioning (A100/H100) with isolation. MPS is software-level process sharing. Time-slicing is context switching with no memory isolation -- lowest quality.' },
      { q: 'What are the three main model serving patterns?', a: 'Online (sync REST/gRPC, sub-100ms), batch (Spark/SageMaker Batch), async/queue-based (SQS/Pub-Sub worker).' },
      { q: 'What is Yatai?', a: 'BentoML\'s Kubernetes operator that manages deployments of Bento artifacts on a K8s cluster.' },
      { q: 'What are the cloud-managed serving options in 2026?', a: 'Vertex AI Endpoints (GCP), SageMaker Endpoints (AWS, with real-time/serverless/async variants), Azure ML Endpoints, Databricks Model Serving.' },
      { q: 'What is canaryTrafficPercent in KServe?', a: 'A field on the InferenceService spec that routes a percentage of traffic to a new model version while the rest goes to the stable version.' },
      { q: 'How do you mitigate cold starts in model serving?', a: 'Smaller container images, model pre-pulled to node, Knative min-replicas greater than zero, and warm pools.' },
      { q: 'When would you use Ray Serve over KServe?', a: 'When you need deployment graphs where one HTTP request fans out to multiple model calls, or when your team is already deep in the Ray ecosystem.' },
    ],
    keyQuestions: [
      {
        question: 'Compare KServe, BentoML, and NVIDIA Triton. When would you choose each?',
        answer: `KServe is the right choice for Kubernetes-native environments where the platform team wants a unified serving layer across multiple model frameworks and multiple teams. The InferenceService CRD is declarative -- a team owns a YAML manifest describing their model, framework, autoscaling policy, and canary split, and KServe handles the Kubernetes mechanics. ModelMesh is a strong differentiator for organizations with large catalogs of small models (hundreds of sklearn or XGBoost models) where dedicated pods per model would waste resources. KServe integrates naturally with Kubeflow Pipelines, Argo Workflows, and Knative for scale-to-zero. The tradeoff is that it is YAML-heavy and requires K8s operational maturity.

BentoML is the right choice for Python-native teams where the model developers own the serving code. Rather than separating the model from its API definition, BentoML keeps them together -- the same team that trains the model writes the service class and packages it. bentoml build produces a versioned immutable Bento artifact; bentoml containerize produces a Docker image. This is faster to iterate on than KServe for small teams. The tradeoff is less native K8s integration (Yatai fills this but adds operational overhead) and weaker multi-framework and GPU serving compared to Triton.

Triton is the right choice for high-throughput GPU inference at scale with a stable set of model frameworks. Its dynamic batching, model concurrency, and ensemble pipeline features are purpose-built for GPU efficiency. TensorRT-compiled backends on Triton achieve the highest throughput per GPU-dollar of any open-source option. Triton is less flexible for iteration (each model needs a model repository configuration file) but is the standard for production-grade GPU serving outside of LLMs. The combination of TensorRT-LLM plus Triton is NVIDIA's recommended stack for LLM serving on their hardware.`,
      },
      {
        question: 'How would you set up canary and A/B deployments for a model serving system on Kubernetes?',
        answer: `On KServe, canary deployment is native to the InferenceService spec. You define two predictors (stable and canary) with a canaryTrafficPercent field, and KServe uses Istio or Knative traffic splitting to route requests accordingly. Incrementing the percentage and monitoring metrics is a kubectl patch or Argo Rollout step. Rollback is setting canaryTrafficPercent to 0. This approach handles user-session stickiness by routing the same user to the same model for the session duration using a consistent hash on a user ID cookie.

For A/B testing with business metrics, you need a user-split that persists across requests and correlates prediction identifiers with downstream conversion events. The standard pattern: assign users to experiment groups via a feature flag service (LaunchDarkly, Statsig, or a custom hash-based assignment) that is stable across sessions. Pass the experiment group as a request header to the serving layer. The serving layer routes to model A or model B based on the header. Prediction logs include the experiment group ID. A downstream analytics pipeline joins prediction logs with conversion events to compute group-level business metrics.

The operational checklist for a canary release: define success criteria before starting (latency p99 within X% of baseline, prediction distribution PSI below 0.1, no increase in error rate), set a time window (minimum 24 hours to cover diurnal traffic patterns), automate rollback if criteria are violated, and log every prediction with its model version so post-hoc analysis is possible. For safety-critical models, always run shadow first -- mirror 100% of traffic to the new model, log predictions, and compare offline before routing any real traffic to it.`,
      },
      {
        question: 'What are the GPU sharing options for multi-tenant model serving and when does each apply?',
        answer: `The three options trade isolation, overhead, and hardware requirements against each other in distinct ways.

MIG (Multi-Instance GPU) is the highest-quality option and requires NVIDIA A100, H100, or B100 hardware. MIG partitions the physical GPU into up to seven isolated instances at the hardware level -- each instance has its own dedicated memory, compute, and bandwidth, with no cross-contamination between tenants. A100 80GB can be partitioned into MIG profiles ranging from 1g.10gb (one seventh of the GPU) to 7g.80gb (the whole GPU). The isolation is absolute -- a memory-intensive model in one partition cannot starve another. MIG is the right choice for multi-tenant SaaS where you are serving different customers' models on shared hardware and need predictable latency guarantees. The cost is that partitions are fixed in size and must be reconfigured to change allocation, and not all GPU families support MIG.

MPS (Multi-Process Service) is a software-level approach that allows multiple CUDA processes to share a single GPU context, reducing launch overhead. Memory isolation is not enforced -- a buggy process can corrupt another's memory. MPS improves throughput when many small processes each use the GPU lightly, but is not suitable for true multi-tenant isolation.

Time-slicing is the default Kubernetes GPU sharing behavior. Multiple pods are scheduled to one GPU and the CUDA driver context-switches between them. There is no memory isolation, no bandwidth guarantee, and context-switching adds latency. It is acceptable for development workloads but inappropriate for production serving with latency SLOs.

The practical recommendation for 2026: use MIG for production multi-tenant serving on A100/H100. Use dedicated GPU pods (one model per GPU) when models are large enough to fill the GPU. Use time-slicing only for internal batch workloads and development.`,
      },
      {
        question: 'How do you handle serving multiple model versions simultaneously and ensure graceful rollback?',
        answer: `The serving architecture needs to separate three concerns: the registry (authoritative source of which version is canonical), the traffic routing layer (which version receives which percentage of requests), and the serving instances (the running model servers).

In KServe, the InferenceService CRD manages all three. The spec references a model URI (pointing to the registered version in the registry), a canaryTrafficPercent for traffic split, and Knative for instance lifecycle. Rollback is a registry-side operation: promote the previous Production version, and update the InferenceService URI to point to it. KServe health-checks the new pods before routing traffic, providing zero-downtime rollback.

For rollback to be safe, two conditions must hold. First, the previous model version must still be in the registry and accessible (this is why the Archived stage exists -- never delete recent production versions). Second, the serving code must be backward compatible with the previous model's input/output schema. If the new model added a required input feature that the old model did not use, the serving layer needs to handle both schemas. This is why model signatures in the registry are critical -- signature mismatch between registry version and serving layer expectations should fail fast at deployment time, not at inference time.

Automated rollback adds monitoring integration: a post-deployment monitor watches latency, error rate, and prediction distribution for a defined window (15 minutes to 2 hours depending on traffic volume). If any metric crosses a threshold, the rollback pipeline fires automatically -- re-promotes the previous archived version and updates the InferenceService. All of this should be logged with the decision metrics so the post-mortem has the full context.`,
      },
      {
        question: 'Walk through the operational concerns for a model serving platform at 10,000 QPS.',
        answer: `At 10K QPS the concerns shift from "does this work" to "does this stay working under load with predictable characteristics." The key areas are capacity planning, latency SLO management, cost efficiency, and failure isolation.

Capacity planning starts with profiling: measure the p50 and p99 latency per model at various batch sizes and replica counts, and measure throughput at which latency SLOs break. Extrapolate to traffic projections with a 2x safety margin. For GPU models, measure GPU memory usage per request under concurrency to set the model instance limit correctly -- running out of GPU memory during a traffic spike causes OOM errors that are worse than throttling.

Latency SLO management requires three layers of instrumentation: per-request timing logged with model version and feature computation time broken out; pod-level metrics (GPU utilization, GPU memory, inference time histogram) via Triton metrics endpoint or KServe's Prometheus metrics; and cluster-level metrics (request queue depth, pod scale events, cold start frequency). Set up HPA (Horizontal Pod Autoscaler) on custom metrics (inference queue depth) rather than CPU utilization -- CPU is a poor proxy for model serving load because GPU is the bottleneck.

Cost efficiency at scale requires GPU bin-packing. For models that do not fill a full GPU, use KServe ModelMesh or SageMaker Multi-Model Endpoints to co-host multiple models on one GPU. Enable prefix caching if models share common prompt prefixes (for LLMs). Use spot/preemptible instances for batch inference and reserve on-demand for real-time SLO-bound paths.

Failure isolation means each model version should have health checks that return 503 on load failure, circuit breakers (KServe supports this via Istio) that prevent cascading failures when one model is slow, and request timeouts that return a fast error rather than holding connections during GPU contention.`,
      },
    ],
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
    introduction: `A model deployed to production assumes the world it was trained on continues to exist. When the world shifts -- user behavior changes, upstream schemas evolve, economic conditions move -- predictions degrade. "Drift" is the umbrella term for this family of distribution shifts, and detecting it before users notice is the central monitoring challenge in production ML.

## The four drift types

Covariate shift is the most common: the distribution of input features P(X) changes while the relationship P(Y|X) remains constant. A fraud model trained on 2024 transaction patterns sees 2026 traffic dominated by mobile payments not present in training. The model's internal logic is still valid but it has never seen these inputs before. Detection is statistical comparison of current vs reference feature distributions.

Concept drift is the more dangerous type: the relationship P(Y|X) itself changes. The same inputs that previously indicated benign behavior now correlate with fraud because fraudsters have adapted. Concept drift cannot be detected from input features alone -- it requires ground truth labels, which leads to the delayed-label problem.

Label drift (prior probability shift) means the marginal distribution P(Y) changes. Fraud rate goes from 1% to 3%; the model's calibrated probabilities, tuned for 1%, now systematically underestimate risk. Performance metrics shift even if the model's learned relationship is still technically correct.

Performance decay is the outcome symptom: model quality degrades against ground truth. The other three are causes. Monitoring should detect causes early, before decay becomes visible to users.

## Detection methods

Population Stability Index (PSI) is the standard tabular metric. Bins the reference and current distributions, computes a weighted divergence score. PSI below 0.1 is stable, 0.1-0.25 is moderate shift warranting investigation, above 0.25 is significant shift requiring action. PSI applies per feature.

The Kolmogorov-Smirnov test is a two-sample non-parametric test on continuous distributions. Jensen-Shannon divergence is a symmetric bounded version of KL divergence, suitable for categorical and binned features. Maximum Mean Discrepancy (MMD) is a kernel-based test that works on high-dimensional data without binning, making it appropriate for embedding vectors.

The domain classifier approach trains a binary classifier to distinguish reference from current data. If the classifier achieves high accuracy, the distributions are separable -- drift is present. It identifies which features drive the difference.

## The 2026 monitoring landscape

Evidently AI (open source) is the most widely adopted OSS choice for tabular drift monitoring with prebuilt dashboards and CI integration. Arize AI leads on embedding and LLM observability. Fiddler AI is strong in regulated finance with explainability integration. WhyLabs provides whylogs, a lightweight profiling library that works in distributed pipeline stages. Cloud-native options (SageMaker Model Monitor, Vertex AI Model Monitoring, Azure ML Data Drift Monitor) are the pragmatic default for cloud-committed teams.

The delayed-label problem is the hardest practical challenge: many real systems receive labels weeks or months after prediction (loan default at 60 days, churn at billing period). Without recent labels you cannot compute current performance directly. Mitigations are input drift monitoring, predicted-distribution monitoring, early proxy signals, and a manually-labeled reference panel.`,
    quickFire: [
      { q: 'What is covariate shift?', a: 'P(X) changes -- input feature distributions shift -- while P(Y|X) remains constant. Detectable from input data without labels.' },
      { q: 'What is concept drift?', a: 'P(Y|X) changes -- the same inputs map to different correct outputs. Requires labels to detect directly.' },
      { q: 'What is label drift?', a: 'The marginal P(Y) changes -- class rates shift, causing calibrated probabilities to be systematically wrong.' },
      { q: 'What are PSI thresholds?', a: 'Below 0.1 is stable, 0.1 to 0.25 is moderate shift, above 0.25 is significant. Standard tabular monitoring convention.' },
      { q: 'What is the KS test?', a: 'Two-sample Kolmogorov-Smirnov test -- non-parametric comparison of continuous feature distributions between reference and current data.' },
      { q: 'What is MMD?', a: 'Maximum Mean Discrepancy -- kernel-based two-sample test that works on high-dimensional embeddings without binning.' },
      { q: 'What is the delayed-label problem?', a: 'Labels arrive weeks or months after prediction (e.g., loan default at 60 days), making current performance unknown and uncomputable in real time.' },
      { q: 'What is the domain classifier approach to drift detection?', a: 'Train a binary classifier to distinguish reference from current data. High accuracy means the distributions are separable -- drift is present and contributing features are identifiable.' },
      { q: 'What is the top OSS drift monitoring tool?', a: 'Evidently AI -- prebuilt drift metrics, dashboards, and CI integration for tabular and text data.' },
      { q: 'What are the three retraining trigger strategies?', a: 'Scheduled (fixed cadence), threshold-based (drift or performance metric crossing), and continuous learning (online retraining for high-cadence systems).' },
      { q: 'How should feature drift be weighted?', a: 'By feature importance -- drift on low-importance features matters less than drift on high-importance features.' },
      { q: 'What is a reference window and what are the options?', a: 'The baseline distribution for drift comparison. Options: static (training set), sliding (last N days of production), or both layered.' },
    ],
    keyQuestions: [
      {
        question: 'Explain the four types of drift and how you would detect each in production.',
        answer: `Covariate shift is the shift in P(X) -- the distribution of input features changes while the mapping from features to labels remains correct. It is the most common and most easily detected type because no labels are required. Detection runs statistical tests comparing the current feature distribution against a reference (typically the training set or a recent stable window): PSI per feature for tabular data, KS test or Wasserstein distance for continuous features, chi-squared or Jensen-Shannon divergence for categorical features. High-dimensional features (embeddings, images) use MMD or a domain classifier. Weight drift severity by feature importance -- drift in a feature with 0.01 importance share matters far less than drift in the top feature.

Concept drift is the shift in P(Y|X) -- the correct answer for a given input changes. This is the most dangerous type because the model cannot detect it from inputs alone, and it can persist silently for weeks before performance decay becomes visible. Detection requires ground truth labels and performance monitoring: track AUC, precision, recall, and calibration against labels as they arrive. Sequential tests (ADWIN, Page-Hinkley, DDM) detect concept drift online as a change point in error rate. When labels are delayed (the common case), you can use early proxy signals (chargebacks at 7 days as a proxy for fraud at 60 days) or a manually-labeled panel reviewed weekly.

Label drift (prior shift) is the shift in P(Y) -- class rates change. Detection is straightforward on predicted scores: monitor the distribution of predicted probabilities over time. If a fraud model was calibrated at 1% positive rate and the predicted probability distribution shifts toward higher values, prior shift has likely occurred. Recalibrate the model's output layer or decision threshold rather than always retraining from scratch.

Performance decay is the observable outcome of the other three. Monitor accuracy metrics against ground truth with whatever label lag your system has. Set thresholds: if AUC drops below the minimum acceptable value, trigger investigation and potentially automated retraining. In practice, the full monitoring stack watches all three layers -- input drift as an early warning, predicted distribution as a proxy, and performance against labels as the ultimate truth.`,
      },
      {
        question: 'What is Population Stability Index and how do you use it in a production monitoring pipeline?',
        answer: `Population Stability Index (PSI) is a scalar measure of distribution shift between two datasets for a single feature. It bins both distributions using the same bin edges (determined from the reference dataset), computes the proportion of observations in each bin, and sums a weighted log-ratio: PSI = sum over bins of (current proportion - reference proportion) * ln(current proportion / reference proportion). The result is a non-negative scalar: below 0.1 means negligible shift, 0.1 to 0.25 means moderate shift worth investigating, above 0.25 means significant shift that warrants model review.

PSI is widely used because it is a single interpretable number per feature, works on both continuous (binned) and categorical features, and is easy to implement in Spark or SQL for large-scale feature monitoring. Its limitation is that it is insensitive to the direction of shift -- a mean shift and a variance change can produce similar PSI values -- and it requires representative bin edges from the reference set, which can produce misleading results if the reference has limited tail coverage.

In a production monitoring pipeline, PSI runs as a scheduled job (daily for most systems, hourly for high-cadence systems) against the prior N days of production features compared to the training set reference. The results feed into a monitoring dashboard (Evidently, Grafana, or a custom dashboard) with alerting thresholds. Feature importance weighting adjusts alert thresholds: allow PSI up to 0.25 for low-importance features, trigger alerts at 0.1 for high-importance features.

PSI should be computed across the full feature vector but also broken out by user segment, traffic source, or time-of-day cohort. A global PSI of 0.05 can mask a PSI of 0.4 in a specific segment that has drifted significantly. Segmented monitoring catches the silent failures that aggregate metrics miss.`,
      },
      {
        question: 'How do you handle the delayed-label problem for a model monitoring system?',
        answer: `The delayed-label problem is that many production ML systems receive ground truth labels days, weeks, or months after the prediction was made. A fraud model makes a decision at transaction time; the chargeback that confirms fraud arrives 30 to 90 days later. A churn model predicts at month start; the actual churn outcome is observed at month end. Without recent labels, you cannot compute current performance metrics and therefore cannot detect concept drift through performance monitoring.

The practical mitigations form a layered defense. Input drift monitoring (PSI, KS test per feature) runs with zero label delay and provides the earliest warning. If inputs are drifting significantly, performance will likely degrade even if you cannot yet measure it. Predicted probability distribution monitoring tracks the model's output distribution -- a systematic shift in predicted scores often precedes measurable performance decay and requires no labels. These two layers give you days to weeks of advance warning.

Early proxy signals substitute for the final label when available. In fraud detection, declined transaction flags and customer-reported fraud arrive within hours and correlate with the 60-day chargeback label. In churn prediction, support ticket rates, engagement dropoffs, and cancellation intent signals arrive before the billing-period confirmation. Track the correlation between proxies and true labels on historical data and use proxies for real-time monitoring.

A manually-labeled reference panel is the gold standard for concept drift detection: maintain a small but fresh set of labeled examples (sampled from current production traffic and labeled by human reviewers or a fast-turnaround labeling pipeline). Even 500-1000 fresh labels per week is enough to run a performance estimate with confidence intervals. This panel also validates whether LLM-based monitoring is working correctly for LLM applications.

Finally, separate the monitoring architecture into tiers by label availability: real-time monitoring (input features, predicted outputs, operational metrics), near-real-time monitoring (proxy labels, fast-arriving signals), and delayed-label monitoring (full performance metrics once labels arrive, used for trend analysis and retraining triggers on schedule).`,
      },
      {
        question: 'Compare Evidently, Arize, and Fiddler as monitoring platforms. When would you choose each?',
        answer: `Evidently AI is the right choice for tabular ML monitoring when you want open source, CI integration, and cost control. Its core is a Python library that computes drift reports (PSI, KS test, JS divergence across all features), data quality reports (nulls, ranges, schema), and model performance reports. Reports render as interactive HTML or JSON and can run in a notebook, a CI pipeline, or a scheduled job. Evidently also has a commercial platform (Evidently Cloud) for production dashboards. It is the most widely adopted OSS option for teams monitoring classical ML models (sklearn, XGBoost, LightGBM). Its weakness is limited native support for unstructured data and embeddings.

Arize AI is the right choice when your models include embeddings, image data, or LLM outputs. Its differentiator is the embedding visualization and monitoring capability: embed your production vectors, compute cluster drift in embedding space, and visualize which clusters of inputs are drifting away from training. For LLM applications, Arize provides prompt and response observability, hallucination detection, and retrieval quality monitoring. The commercial pricing is significant but the embedding monitoring tooling has no strong OSS equivalent as of 2026. Choose Arize when your organization has already moved beyond tabular models into deep learning or LLMs at scale.

Fiddler AI is the right choice for regulated industries where explainability and fairness monitoring are requirements alongside drift detection. Fiddler integrates SHAP-based feature importance into every monitoring dashboard, so you can see not just that drift occurred but which features drove the prediction change and how that maps to fairness slices. It is well-established in financial services, healthcare, and insurance where model explainability is a regulatory requirement. The tradeoff is higher cost and less flexibility compared to Evidently for straightforward drift monitoring.

For cloud-committed teams, the native options (SageMaker Model Monitor, Vertex AI Model Monitoring) are reasonable starting points -- they require no additional infrastructure and integrate with existing pipelines. Switch to a specialized platform when the native tooling's drift detection capabilities (typically limited to per-feature PSI and basic statistics) are insufficient for your use case.`,
      },
      {
        question: 'Design a complete model monitoring system for a fraud detection model with 60-day label delay.',
        answer: `The monitoring system must provide early warning without labels, final performance assessment when labels arrive, and automated retraining triggers. I would structure it in three tiers operating on different time horizons.

Tier 1 -- real-time operational monitoring (seconds to minutes). Every inference request logs: request timestamp, model version, input feature hash (for deduplication), predicted probability, and serving latency. A streaming pipeline (Flink or Spark Structured Streaming) computes per-minute metrics: request rate, error rate, p50/p99 latency, null rate per feature, and predicted probability mean and standard deviation. Alerts fire in Datadog or PagerDuty if error rate exceeds 0.1% or latency p99 exceeds SLO.

Tier 2 -- daily drift monitoring (hours, no labels required). A scheduled Spark job runs nightly on the past 24 hours of production features. For each feature, compute PSI against the training set reference. Weight alerts by feature importance. Compute Jensen-Shannon divergence on the predicted probability distribution against the training-time distribution. Flag any feature with PSI above 0.15 (moderate) for human review, above 0.25 (significant) for automated alert. Track the 7-day-chargeback proxy label rate as an early performance signal -- if it moves by more than 20% from baseline, escalate.

Tier 3 -- delayed performance assessment (monthly, labels available). When 60-day labels arrive, join them to the prediction log by transaction ID. Compute AUC, precision at top 1% risk, calibration curve (expected calibration error), and per-segment performance (by transaction type, merchant category, geography). Compare to the baseline performance from the previous 60-day cohort. If AUC drops more than 3 absolute points, trigger the retraining pipeline.

Retraining is triggered by: a Tier 2 PSI alert (covariate shift confirmed), a Tier 3 AUC drop (performance decay confirmed), or a scheduled quarterly retrain as a baseline. The retraining pipeline runs the standard MLOps lifecycle -- train on updated data window, evaluate on frozen test set, register in MLflow, deploy via canary. The monitoring system attaches post-deployment metrics for each new version so accountability is automatic.`,
      },
    ],
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
    introduction: `LLMOps is what MLOps becomes when the artifact you ship is not a set of learned weights but a system built on top of foundation models -- prompts, retrieval pipelines, tool definitions, and orchestration logic. The core principles (versioning, testing, monitoring, CD) transfer directly; the artifacts and failure modes are different.

## What changes compared to classical MLOps

In classical MLOps the primary artifact is a trained model; the training pipeline produces it; deployment puts it behind an endpoint. In LLMOps the primary artifacts are prompts and retrieval configuration; you orchestrate a foundation model rather than train from scratch; quality is determined by prompt design and retrieval quality, not weight optimization. This shifts the entire evaluation problem: you cannot use a standard holdout set with deterministic metrics because LLM outputs are open-ended text.

The three pillars of LLMOps are prompt versioning (prompts as code, versioned and tested in CI), evaluation (subjective quality measurement at scale), and observability (tracing full chain from query through retrieval through generation).

## Prompts as code

A prompt is a versioned artifact with tests. It lives in a repository, is reviewed in PRs, and is tested before merging. Tools -- LangSmith Prompts, MLflow 3 Prompts, PromptLayer, Humanloop, W&B Weave -- provide a registry for prompt versions with lineage back to eval results. Promptfoo is the leading open-source CLI for running eval suites against prompts in CI, catching regressions before they reach production.

## Evaluation methodology

Five approaches exist. Reference-based evaluation compares outputs to known-correct answers using string match or semantic similarity -- practical for narrow tasks like extraction or classification. LLM-as-judge uses a strong model (GPT-4o, Claude Opus) to rate outputs on rubrics; it scales cheaply but carries biases (verbosity bias, position bias, bias toward same-family models). Human evaluation is the ground truth but is expensive and slow, primarily used to calibrate LLM-as-judge. Pairwise preference (judge picks A or B) reduces absolute-score bias and is the technique behind ChatBot Arena. Behavioral and red-team evaluation uses adversarial prompts designed to surface jailbreaks, hallucinations, PII leakage, and bias.

## RAG observability and cost tracking

RAG systems add a retrieval layer whose quality directly determines answer quality. The four Ragas metrics are faithfulness (is the answer grounded in retrieved context?), answer relevance (does it address the query?), context precision (are retrieved chunks relevant?), and context recall (did retrieval find the answer?). LangSmith, LangFuse, and Arize provide tracing at the chain level. For cost, per-call token spend is significant at scale; LiteLLM and Helicone provide proxy-level cost tracking across providers. Prompt caching (Anthropic, OpenAI 2024-2025) reduces cost by 80-90% on repeated prompt prefixes.

## Guardrails

LLM outputs can leak PII, generate unsafe content, or produce malformed structured outputs. Guardrails AI provides a Pythonic schema-and-rule validation layer. NVIDIA NeMo Guardrails adds programmable dialog flow control. LlamaGuard (Meta) is a fine-tuned safety classifier. Cloud-native options (Bedrock Guardrails, Azure Content Safety) are the default for managed deployments.`,
    quickFire: [
      { q: 'What is LLMOps and how does it differ from MLOps?', a: 'MLOps applied to LLM-based applications -- the artifacts are prompts, retrieval configs, and tools rather than trained weights, so evaluation and versioning concerns are different.' },
      { q: 'What are the three pillars of LLMOps?', a: 'Prompt versioning (prompts as code with CI tests), evaluation (quality measurement at scale), and observability (full-chain tracing through retrieval and generation).' },
      { q: 'What is LLM-as-judge evaluation?', a: 'Using a strong LLM (GPT-4o, Claude) to rate outputs against rubrics at scale. Standard practice in 2026 but subject to verbosity bias, position bias, and model-family bias.' },
      { q: 'What is pairwise preference evaluation?', a: 'A judge picks between output A and output B rather than assigning an absolute score, which reduces absolute-score bias. The technique behind ChatBot Arena.' },
      { q: 'Name the four Ragas RAG evaluation metrics.', a: 'Faithfulness, answer relevance, context precision, and context recall.' },
      { q: 'What is groundedness?', a: 'Whether the generated answer is supported by retrieved context -- the opposite of hallucination.' },
      { q: 'What is Promptfoo?', a: 'Open-source CLI for running LLM eval suites in CI -- catches prompt regressions before they reach production.' },
      { q: 'What is LangSmith?', a: 'LangChain\'s commercial tracing and evaluation platform -- traces full LLM chain executions, stores prompt versions, and runs LLM-as-judge evals.' },
      { q: 'What is LangFuse?', a: 'Open-source self-hosted alternative to LangSmith for LLM tracing and evaluation.' },
      { q: 'What does LiteLLM provide?', a: 'An open-source proxy with a unified OpenAI-compatible API across 100+ LLM providers, with per-provider cost tracking and rate limiting.' },
      { q: 'What is prompt caching and what cost reduction does it provide?', a: 'Caching repeated prompt prefixes (system prompts, RAG context) at the API level -- Anthropic and OpenAI support it, reducing costs by 80-90% on cache hits.' },
      { q: 'What are the main guardrail libraries for LLM output validation?', a: 'Guardrails AI (Pythonic schema/rule validation), NVIDIA NeMo Guardrails (dialog flow control), LlamaGuard (safety classification), Lakera Guard (prompt injection focus).' },
    ],
    keyQuestions: [
      {
        question: 'How would you set up a CI/CD pipeline for an LLM application with prompt versioning and eval gates?',
        answer: `The pipeline treats prompts as code artifacts that must pass automated quality gates before reaching production, analogous to how MLOps treats model training as a pipeline with evaluation gates.

Prompts live in the application repository as versioned files (YAML or JSON with metadata: prompt text, model, temperature, expected output schema). A change to a prompt opens a PR. The CI pipeline runs a Promptfoo eval suite against the changed prompt: it sends the prompt against a curated set of test cases with known expected behaviors, uses LLM-as-judge to score outputs on rubrics (relevance, faithfulness, safety, format compliance), and compares aggregate scores to the current production baseline. If any metric regresses by more than a threshold (e.g., faithfulness drops from 0.91 to 0.85), the CI check fails and the PR cannot merge without explicit override.

A test case library is the foundation. It contains: golden examples with reference answers for reference-based scoring; adversarial examples for robustness (prompt injections, off-topic queries, edge cases); few-shot coverage examples that cover the distribution of real user inputs sampled and labeled from production traffic. This library is itself versioned and grows over time as production incidents surface new failure modes.

For CD, after merge the new prompt is deployed to a staging environment where it serves shadow traffic alongside the production prompt. A monitoring job compares output quality distributions (via LLM-as-judge on a sample) between the staging and production prompts for 24 hours. If staging quality is higher or equal, the deployment pipeline promotes the new prompt to production via a registry update (LangSmith Prompts, MLflow 3, or a custom registry). All production prompt versions are retained for rollback. The serving layer resolves the current production prompt version by alias at request time.`,
      },
      {
        question: 'Explain evaluation methodology for LLMs. What are the tradeoffs of each approach?',
        answer: `Reference-based evaluation compares model outputs to ground-truth answers using string matching (exact match, F1 on token overlap, ROUGE) or semantic similarity (embedding cosine similarity, BERTScore). It is objective, fast, and reproducible. The critical limitation is coverage: it only works when correct answers are well-defined and exhaustively enumerated. It is appropriate for narrow tasks (named entity extraction, document classification, structured data extraction) but breaks down for open-ended generation where many valid paraphrases exist.

LLM-as-judge uses a strong model to evaluate outputs on qualitative rubrics: relevance (does the answer address the question?), faithfulness (is it grounded in context?), coherence (is it well-structured?), safety (does it contain harmful content?). It scales to arbitrary task types without curating reference answers, costs pennies per evaluation, and can score on nuanced dimensions that string matching cannot capture. The well-documented biases are verbosity bias (longer answers rated higher), position bias (first option in pairwise comparisons favored), and model-family bias (GPT-4o-based judges favor GPT-4o outputs). Mitigation: use multiple judges, swap pairwise order and average, calibrate against human ratings.

Human evaluation is the ground truth. Human raters score outputs on task-specific rubrics. It is expensive (dollars per evaluation), slow (days), and subject to inter-rater variance. Use it to validate LLM-as-judge calibration, establish baseline metrics for new task types, and audit high-stakes decisions. A well-designed human eval study uses 3+ raters per item, a clear rubric, and Cohen's kappa to verify agreement.

Pairwise preference (A/B comparison) asks a judge to choose between two outputs rather than assign an absolute score. It reduces scale and anchor effects present in absolute scoring and produces relative rankings. This is the method behind ChatBot Arena (Elo ratings from user preferences) and is often more reliable than absolute scoring for subjective quality dimensions.

Behavioral testing uses adversarial test suites: prompt injections, jailbreak attempts, PII leakage tests, bias probes (demographic parity across protected attributes), and minimum-functionality tests (does the model correctly handle the simplest version of the task?). These tests are binary pass/fail and are cheapest to automate. They are the first thing to add to a CI pipeline.`,
      },
      {
        question: 'How do you monitor a RAG pipeline in production? What metrics matter and what tools do you use?',
        answer: `A RAG pipeline has two quality-determining stages: retrieval (did we fetch the right context?) and generation (did we use that context correctly?). Monitoring must cover both, plus the operational characteristics of the full chain.

For retrieval quality, the key metrics are context relevance (what fraction of retrieved chunks are actually relevant to the query, measurable by LLM-as-judge on a sample), context recall (was the information needed to answer the query present in the retrieved set, measurable when ground truth answers exist), and retrieval latency at p50 and p99 (vector store query time + reranker time). A decline in context relevance without a change in query distribution often points to embedding model drift or a vector index that has grown stale relative to the knowledge base.

For generation quality, the key metrics are faithfulness (does the answer make claims supported by the retrieved context -- the anti-hallucination metric), answer relevance (does the answer address the query), and refusal rate (fraction of queries the system declines to answer, which can indicate over-triggering safety filters). Faithfulness and answer relevance are measured via LLM-as-judge or the Ragas library on a sampled fraction of production traffic.

Operationally, every request should be traced end-to-end: query embedding time, vector store retrieval time and scores, reranker scores (if used), prompt assembly time, LLM call time (including streaming first-token latency), and total response time. LangSmith and LangFuse both provide this chain-level tracing with per-step latency breakdown. Arize AI provides the embedding-space visualization layer for understanding retrieval drift.

Cost monitoring matters at scale: track input tokens, output tokens, and cost per request broken down by component (embedding calls, reranker calls, LLM generation). LiteLLM as a proxy layer captures this automatically. Set per-user and per-feature cost caps with circuit breakers.

A/B testing prompt variants in RAG is more complex than classical ML A/B because the retrieval and generation steps interact -- a better retrieval configuration can make a weaker prompt perform better. The cleanest approach is to test the full RAG pipeline as a unit, not components in isolation.`,
      },
      {
        question: 'What are guardrails for LLMs and how would you implement an input/output validation layer?',
        answer: `Guardrails are validation and filtering layers that sit around LLM calls to prevent unsafe, malformed, or policy-violating inputs and outputs from reaching users or downstream systems. They address four failure categories: harmful content generation (violence, CSAM, extremism), PII leakage (model echoing PII from context or training), prompt injection (user instructions overriding system instructions), and structural output failures (model not following the JSON schema or format specified in the prompt).

The implementation has two enforcement points. Input guardrails run before the LLM call. They scan user queries for policy violations (Lakera Guard specializes in prompt injection detection), validate that inputs conform to expected schema, and enforce rate limits and content policy. NVIDIA NeMo Guardrails adds dialog flow control -- you define a Colang specification of allowed conversation paths, and NeMo enforces that the conversation stays within bounds. This is particularly valuable for customer service bots that should not be redirected into off-topic discussions.

Output guardrails run after the LLM call and before the response is returned. Guardrails AI provides a Python library where you declare a Guard with Validators: PII detection and redaction, toxicity classification, JSON schema adherence (retry if the output does not parse), fact-checking against a knowledge base, and custom regex rules. If validation fails, the Guard can retry with a correction prompt, return a safe fallback response, or escalate to a human review queue. LlamaGuard (Meta) is a fine-tuned LLaMA model specialized for safety classification -- it runs as a fast inference call and adds 50-100ms to the response path.

For structured output specifically (JSON, function arguments, SQL), constrained decoding at the inference level (vLLM and SGLang both support JSON schema constrained decoding via guidance or outlines) is more reliable than post-hoc validation because it prevents syntactically invalid outputs at generation time rather than catching them after. For cloud-native deployments, AWS Bedrock Guardrails and Azure Content Safety provide managed filtering as API calls without operational overhead.`,
      },
      {
        question: 'How do you manage cost and token spend for a multi-tenant LLM application at scale?',
        answer: `Cost management for LLM applications requires per-request metering, per-tenant attribution, policy enforcement, and model routing -- all operating at API call time with sub-millisecond overhead.

The foundation is a proxy layer. LiteLLM (open source) or Portkey (commercial) sits between your application and all LLM providers, providing a unified OpenAI-compatible API regardless of the backend (Anthropic, OpenAI, Google, Mistral, Bedrock). The proxy captures every API call with: timestamp, tenant ID (from JWT or API key), model name, input tokens, output tokens, latency, and computed cost (model-specific per-token pricing). This data writes to a metrics store (Postgres for billing, InfluxDB or Prometheus for real-time dashboards).

Per-tenant cost caps enforce a maximum spend. The proxy checks the running cost against the tenant's plan tier before forwarding the request. If a tenant hits their daily cap, the proxy returns a 429 with a clear error rather than allowing unbounded spend. This is critical for SaaS products where a single high-volume tenant should not generate a surprise five-figure API bill.

Prompt caching is the highest-leverage cost reduction. Anthropic and OpenAI both support prefix caching as of 2024-2025 -- if you mark the static portion of your prompt (system prompt, RAG context) as cacheable, cache hit reads cost 80-90% less than fresh tokens. For a RAG application where the system prompt is hundreds of tokens and the retrieved context adds thousands more, caching the prefix on every turn of a multi-turn conversation reduces cost per turn by 70-85%.

Model routing assigns requests to the cheapest model that can handle them satisfactorily. Simple classification tasks route to Claude Haiku or GPT-4o-mini; complex synthesis routes to Claude Sonnet or GPT-4o. The routing logic can be static (by task type), dynamic (route based on query complexity score), or an LLM-as-router (use a cheap model to classify the query and select the serving model). LiteLLM supports routing with fallbacks. Track cost-per-task across routing strategies to tune the accuracy-cost tradeoff.`,
      },
    ],
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
