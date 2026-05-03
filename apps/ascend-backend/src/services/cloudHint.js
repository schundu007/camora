/**
 * Cloud-platform prompt fragment.
 *
 * The frontend has a single source of truth for the user's cloud choice
 * (apps/frontend/src/hooks/useCloudProvider.ts). Passing that value into
 * the LLM prompt lets the model generate cloud-aware code/architecture
 * up-front, instead of relying on the render-time service-name
 * substitution as a safety net.
 *
 * The fragment is short and authoritative — it goes BEFORE the rest of
 * the system prompt so the model treats cloud naming as a hard constraint
 * rather than a suggestion. AWS gets a no-op (the existing prompts are
 * already AWS-flavored, so reinforcing AWS would just bloat tokens).
 *
 * Usage:
 *   const cloudHint = buildCloudHint(req.body.cloudProvider);
 *   const systemPrompt = `${cloudHint}\n\n${rest}`;
 *
 * Keep the wording in sync with apps/lumora-backend/src/services/cloudHint.js
 * — both backends share users so divergence would surface as oddly inconsistent
 * answers between Lumora and Capra.
 */
export function buildCloudHint(provider) {
  const p = (provider || '').toLowerCase();
  if (p === 'azure') {
    return [
      'CLOUD PLATFORM: Microsoft Azure.',
      'Use Azure service names exclusively in any architecture, code, or component reference:',
      '  • Azure Blob Storage (NOT S3) for object storage',
      '  • Cosmos DB (NOT DynamoDB) for NoSQL',
      '  • Azure SQL / Hyperscale (NOT RDS / Aurora) for relational',
      '  • Azure Functions (NOT Lambda) for serverless',
      '  • Azure Cache for Redis (NOT ElastiCache)',
      '  • Service Bus / Event Grid / Event Hubs (NOT SQS / SNS / Kinesis)',
      '  • API Management (NOT API Gateway), Azure Front Door (NOT CloudFront)',
      '  • Azure AD / Entra (NOT IAM), Key Vault (NOT KMS / Secrets Manager)',
      '  • Azure Monitor (NOT CloudWatch), AKS (NOT EKS)',
      'If a concept has no clean Azure equivalent, name the AWS service and add "(no first-party Azure equivalent)".',
    ].join('\n');
  }
  if (p === 'gcp') {
    return [
      'CLOUD PLATFORM: Google Cloud (GCP).',
      'Use GCP service names exclusively in any architecture, code, or component reference:',
      '  • Cloud Storage (NOT S3) for object storage',
      '  • Firestore (NOT DynamoDB) for NoSQL; Bigtable for wide-column',
      '  • Cloud SQL / Spanner (NOT RDS / Aurora) for relational',
      '  • Cloud Functions (NOT Lambda) for serverless',
      '  • Memorystore (NOT ElastiCache)',
      '  • Pub/Sub (NOT SQS / SNS / Kinesis)',
      '  • API Gateway, Cloud CDN (NOT CloudFront)',
      '  • Cloud IAM (NOT AWS IAM), Cloud KMS / Secret Manager',
      '  • Cloud Monitoring (NOT CloudWatch), GKE (NOT EKS)',
      '  • BigQuery (NOT Redshift) for warehousing',
      'If a concept has no clean GCP equivalent, name the AWS service and add "(no first-party GCP equivalent)".',
    ].join('\n');
  }
  // 'aws' or 'auto' or unknown — leave the existing AWS-flavored prompt
  // intact. We don't reinforce AWS because that wastes tokens on the
  // happy path, and 'auto' means "let the model pick" which AWS already
  // implicitly does.
  return '';
}
