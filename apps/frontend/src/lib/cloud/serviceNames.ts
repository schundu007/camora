/**
 * Cloud service name translations.
 *
 * Camora's system-design content is authored using AWS service names
 * (DynamoDB, S3, Lambda, etc.) because that's where most of the public
 * interview material lives. When a user picks Azure or GCP, we walk the
 * rendered content and substitute equivalents — they shouldn't have to
 * mentally translate every page.
 *
 * Keys are the AWS canonical name (case-sensitive, word-boundary matched).
 * Values are the Azure / GCP equivalents. When a value matches AWS
 * verbatim, the formatter is a no-op for that token on that cloud.
 *
 * Maintenance:
 *   - Add new entries when prose adds a service we haven't covered yet.
 *   - Prefer the marketing name a user would recognize ("Cosmos DB", not
 *     "Microsoft Azure Cosmos DB").
 *   - Multi-word AWS names (e.g. "API Gateway") need word-boundary care.
 *     The formatter handles those with the `multiWord` set below.
 *   - For services with multiple equivalents, pick the closest functional
 *     match — list alternatives in the comment for future readers.
 */

export const CLOUD_SERVICE_MAP: Record<string, { aws: string; azure: string; gcp: string }> = {
  // ── Compute ────────────────────────────────────────────────────────────
  EC2: { aws: 'EC2', azure: 'Azure VMs', gcp: 'Compute Engine' },
  Lambda: { aws: 'Lambda', azure: 'Azure Functions', gcp: 'Cloud Functions' },
  ECS: { aws: 'ECS', azure: 'Container Instances', gcp: 'Cloud Run' },
  EKS: { aws: 'EKS', azure: 'AKS', gcp: 'GKE' },
  Fargate: { aws: 'Fargate', azure: 'Container Apps', gcp: 'Cloud Run' },

  // ── Storage ────────────────────────────────────────────────────────────
  S3: { aws: 'S3', azure: 'Azure Blob Storage', gcp: 'Cloud Storage' },
  EBS: { aws: 'EBS', azure: 'Managed Disks', gcp: 'Persistent Disk' },
  EFS: { aws: 'EFS', azure: 'Azure Files', gcp: 'Filestore' },
  Glacier: { aws: 'Glacier', azure: 'Azure Archive Storage', gcp: 'Archive Storage' },

  // ── Databases ──────────────────────────────────────────────────────────
  DynamoDB: { aws: 'DynamoDB', azure: 'Cosmos DB', gcp: 'Firestore' },
  RDS: { aws: 'RDS', azure: 'Azure SQL Database', gcp: 'Cloud SQL' },
  Aurora: { aws: 'Aurora', azure: 'Azure SQL Hyperscale', gcp: 'Cloud Spanner' },
  ElastiCache: { aws: 'ElastiCache', azure: 'Azure Cache for Redis', gcp: 'Memorystore' },
  Redshift: { aws: 'Redshift', azure: 'Synapse Analytics', gcp: 'BigQuery' },
  DocumentDB: { aws: 'DocumentDB', azure: 'Cosmos DB for MongoDB', gcp: 'Firestore' },
  Neptune: { aws: 'Neptune', azure: 'Cosmos DB Gremlin API', gcp: 'JanusGraph on GKE' },
  Athena: { aws: 'Athena', azure: 'Synapse Serverless', gcp: 'BigQuery' },

  // ── Networking ─────────────────────────────────────────────────────────
  CloudFront: { aws: 'CloudFront', azure: 'Azure Front Door', gcp: 'Cloud CDN' },
  Route53: { aws: 'Route53', azure: 'Azure DNS', gcp: 'Cloud DNS' },
  VPC: { aws: 'VPC', azure: 'VNet', gcp: 'VPC' },
  ELB: { aws: 'ELB', azure: 'Azure Load Balancer', gcp: 'Cloud Load Balancing' },
  ALB: { aws: 'ALB', azure: 'Application Gateway', gcp: 'Cloud Load Balancing' },
  NLB: { aws: 'NLB', azure: 'Azure Load Balancer', gcp: 'Cloud Load Balancing' },

  // ── Messaging / streaming ──────────────────────────────────────────────
  SQS: { aws: 'SQS', azure: 'Service Bus Queues', gcp: 'Pub/Sub' },
  SNS: { aws: 'SNS', azure: 'Event Grid', gcp: 'Pub/Sub' },
  Kinesis: { aws: 'Kinesis', azure: 'Event Hubs', gcp: 'Pub/Sub' },
  MSK: { aws: 'MSK', azure: 'Event Hubs (Kafka)', gcp: 'Confluent on GCP' },
  EventBridge: { aws: 'EventBridge', azure: 'Event Grid', gcp: 'Eventarc' },

  // ── API & app services ────────────────────────────────────────────────
  AppSync: { aws: 'AppSync', azure: 'Azure SignalR', gcp: 'Firestore Realtime' },

  // ── Big data / analytics ───────────────────────────────────────────────
  EMR: { aws: 'EMR', azure: 'HDInsight', gcp: 'Dataproc' },
  Glue: { aws: 'Glue', azure: 'Data Factory', gcp: 'Dataflow' },

  // ── Security / identity / secrets ──────────────────────────────────────
  IAM: { aws: 'IAM', azure: 'Azure AD / Entra', gcp: 'Cloud IAM' },
  KMS: { aws: 'KMS', azure: 'Key Vault', gcp: 'Cloud KMS' },
  Cognito: { aws: 'Cognito', azure: 'Azure AD B2C', gcp: 'Identity Platform' },

  // ── Observability ──────────────────────────────────────────────────────
  CloudWatch: { aws: 'CloudWatch', azure: 'Azure Monitor', gcp: 'Cloud Monitoring' },
  CloudTrail: { aws: 'CloudTrail', azure: 'Activity Log', gcp: 'Cloud Audit Logs' },
  'X-Ray': { aws: 'X-Ray', azure: 'Application Insights', gcp: 'Cloud Trace' },
};

/**
 * Multi-word AWS service names. These need separate handling because a
 * naive `\bX\b` regex won't match a phrase. The formatter walks this list
 * before the single-word map.
 */
export const CLOUD_SERVICE_MULTIWORD: Record<string, { aws: string; azure: string; gcp: string }> = {
  'API Gateway': { aws: 'API Gateway', azure: 'API Management', gcp: 'API Gateway' },
  'Step Functions': { aws: 'Step Functions', azure: 'Logic Apps', gcp: 'Workflows' },
  'Secrets Manager': { aws: 'Secrets Manager', azure: 'Key Vault', gcp: 'Secret Manager' },
  'Auto Scaling': { aws: 'Auto Scaling', azure: 'Virtual Machine Scale Sets', gcp: 'Managed Instance Groups' },
  'Elastic Beanstalk': { aws: 'Elastic Beanstalk', azure: 'App Service', gcp: 'App Engine' },
  'CodePipeline': { aws: 'CodePipeline', azure: 'Azure DevOps Pipelines', gcp: 'Cloud Build' },
  'CodeBuild': { aws: 'CodeBuild', azure: 'Azure Pipelines', gcp: 'Cloud Build' },
  'CodeDeploy': { aws: 'CodeDeploy', azure: 'Azure DevOps Release', gcp: 'Cloud Deploy' },
};
