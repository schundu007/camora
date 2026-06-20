const KEY_DESCRIPTIONS = {
  // Helm / Argo CD chart keys
  global:          'Cluster-wide settings: domain, image registry, certificates',
  configs:         'Server config: OIDC URL, reconciliation interval, RBAC policy.csv',
  server:          'API server + Web UI — replicas, ingress rules, TLS, resource limits',
  controller:      'Application controller: git→cluster sync engine, shard config',
  repoServer:      'Manifest renderer: git clone, Helm/Kustomize, IRSA service account',
  'redis-ha':      'HA Redis with Sentinel — rendered-manifest cache, 3-replica quorum',
  redis:           'In-memory cache for rendered manifests and application state',
  dex:             'SSO federation broker: OIDC/LDAP/SAML/GitHub OAuth integration',
  applicationSet:  'Dynamic app generator — one CRD creates N Applications via generators',
  notifications:   'Event webhook: Slack/Teams/PagerDuty on sync, health, deploy events',
  // Container / pod keys
  image:           'Container image: repository, tag, pullPolicy, pullSecrets',
  service:         'Kubernetes Service: type (ClusterIP/LoadBalancer/NodePort), ports, annotations',
  ingress:         'HTTP/HTTPS routing: host, TLS, className, backend service',
  persistence:     'PersistentVolumeClaim: storage class, size, access mode',
  serviceAccount:  'K8s ServiceAccount + IRSA: IAM role annotation (eks.amazonaws.com/role-arn)',
  rbac:            'RBAC: ClusterRole/Role + bindings, create flag, rules',
  autoscaling:     'HorizontalPodAutoscaler: min/max replicas, CPU/memory targets',
  resources:       'CPU/memory requests (guaranteed) and limits (ceiling)',
  tolerations:     'Node taint tolerations: allow pod scheduling on tainted nodes',
  affinity:        'Pod affinity/anti-affinity: spread across zones, avoid co-location',
  nodeSelector:    'Schedule pods onto nodes matching these labels',
  securityContext: 'Security: runAsNonRoot, readOnlyRootFilesystem, drop capabilities',
  livenessProbe:   'Health check: kill and restart container if this probe fails',
  readinessProbe:  'Readiness: remove from Service endpoints until this probe passes',
  startupProbe:    'Startup guard: replaces livenessProbe during slow initial boot',
  env:             'Environment variables injected into all containers',
  envFrom:         'Bulk env from ConfigMap or Secret (avoid hardcoding in pod spec)',
  volumes:         'Named volume definitions: emptyDir, PVC, configMap, secret, hostPath',
  volumeMounts:    'Mount volumes into specific container paths',
  replicas:        'Number of pod replicas — set to 3+ for HA across zones',
  strategy:        'Rollout strategy: RollingUpdate (zero-downtime) or Recreate',
  podAnnotations:  'Annotations on pods: Prometheus scrape, Vault inject, Datadog APM',
  podLabels:       'Extra labels on pods (beyond selector labels)',
  nameOverride:    'Override chart name used in resource names',
  fullnameOverride:'Override full resource name prefix',
  commonLabels:    'Labels added to all chart resources',
  commonAnnotations:'Annotations added to all chart resources',
  priorityClassName:'PriorityClass for preemption: system-cluster-critical etc.',
  topologySpreadConstraints: 'Spread pods across zones/nodes for fault tolerance',
  // K8s manifest keys
  apiVersion:      'Kubernetes API group + version (apps/v1, batch/v1, etc.)',
  kind:            'Resource type: Deployment, StatefulSet, DaemonSet, Job, CronJob…',
  metadata:        'Name, namespace, labels, annotations — resource identity',
  spec:            'Desired state: what you want K8s to create/maintain',
  status:          'Observed state: managed by K8s controllers, do not edit',
  containers:      'Container definitions: image, command, ports, probes, resources',
  initContainers:  'Run-to-completion containers before main containers start',
  selector:        'Label selector: which pods this controller/service manages',
  template:        'Pod template: spec for pods this controller creates',
  ports:           'Container port declarations (informational, not enforced by K8s)',
  // CI/CD keys
  on:              'Event triggers: push, pull_request, schedule, workflow_dispatch',
  jobs:            'Parallel job definitions — each runs on its own runner',
  steps:           'Ordered sequence of actions within a job',
  uses:            'Reusable action or workflow reference (actions/checkout@v4)',
  with:            'Input parameters passed to an action',
  needs:           'Dependency chain: this job waits for listed jobs to complete',
  if:              'Conditional expression: skip job/step when false',
  'runs-on':       'Runner label: ubuntu-latest, self-hosted, macos-14',
  permissions:     'GITHUB_TOKEN scope: contents:read, id-token:write (OIDC)',
  secrets:         'Secret variable references from repo/org/environment secrets',
  matrix:          'Matrix of variable combinations to run in parallel',
  stages:          'GitLab CI ordered stage definitions',
  variables:       'GitLab CI pipeline-level variable definitions',
  rules:           'GitLab CI conditional rules (when, if, changes)',
  script:          'Shell commands to run in this job',
  artifacts:       'Files to preserve between stages or expose as downloads',
  cache:           'Paths to cache between pipeline runs (node_modules, .gradle)',
  services:        'Docker services to spin up alongside the job (postgres, redis)',
  // Terraform keys
  resource:        'Infrastructure resource to create/manage',
  data:            'Read-only reference to existing infrastructure',
  variable:        'Declared input variable with type, default, description',
  output:          'Value to expose after apply (ARN, URL, IP)',
  module:          'Reusable module reference with source + inputs',
  locals:          'Computed local values to reduce repetition',
  provider:        'Cloud/service provider plugin configuration',
  backend:         'Remote state storage (S3, GCS, Terraform Cloud)',
  terraform:       'Terraform version constraint and required_providers block',
};

const BASH_CMD_DESCRIPTIONS = {
  'kubectl apply':    'Apply manifest to cluster (create or update resources)',
  'kubectl get':      'List resources and their current state',
  'kubectl create':   'Create a new resource from file or stdin',
  'kubectl delete':   'Delete resources by name, label, or file',
  'kubectl exec':     'Execute a command inside a running container',
  'kubectl logs':     'Stream or tail container logs',
  'kubectl describe': 'Show detailed resource info and events',
  'kubectl patch':    'Patch a resource field in-place',
  'kubectl rollout':  'Manage rollout history and restart deployments',
  'kubectl port-forward': 'Forward a local port to a pod/service',
  'helm install':     'Install a Helm chart as a named release',
  'helm upgrade':     'Upgrade an existing release to a new chart version',
  'helm uninstall':   'Remove a Helm release and its resources',
  'helm repo add':    'Register a new Helm chart repository',
  'helm repo update': 'Refresh the local chart index from all repositories',
  'helm template':    'Render chart templates locally without installing',
  'helm list':        'List all deployed Helm releases',
  'docker build':     'Build an image from a Dockerfile',
  'docker push':      'Push an image to a registry',
  'docker pull':      'Pull an image from a registry',
  'docker run':       'Create and start a container from an image',
  'docker exec':      'Execute a command in a running container',
  'git clone':        'Clone a remote repository locally',
  'git push':         'Push local commits to the remote',
  'git commit':       'Record staged changes as a new commit',
  'git pull':         'Fetch and merge from the remote branch',
  'aws':              'AWS CLI — interact with AWS services',
  'gcloud':           'Google Cloud CLI — interact with GCP services',
  'az':               'Azure CLI — interact with Azure resources',
  'argocd app':       'Manage Argo CD applications via CLI',
  'argocd cluster':   'Register or list clusters in Argo CD',
  'flux':             'Flux CLI — bootstrap, reconcile, suspend GitOps',
  'terraform init':   'Initialize working directory and download providers',
  'terraform plan':   'Preview infrastructure changes before applying',
  'terraform apply':  'Apply the planned infrastructure changes',
  'terraform destroy':'Destroy all infrastructure managed by this config',
};

const KNOWN_SHELLS = new Set([
  'kubectl','helm','docker','git','aws','gcloud','az','argocd','flux',
  'terraform','ansible','vault','consul','eksctl','kustomize','skaffold',
  'istioctl','cilium','linkerd','trivy','snyk',
]);

function parseBashEntries(rawCode) {
  const entries = [];
  const lines = rawCode.split('\n');
  for (const line of lines) {
    const trimmed = line.replace(/^\$\s*/, '').trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const tool = trimmed.split(/\s+/)[0];
    if (!KNOWN_SHELLS.has(tool)) continue;
    const words = trimmed.split(/\s+/).slice(0, 3).join(' ');
    let desc = null;
    // Match longest prefix first
    for (const [pattern, d] of Object.entries(BASH_CMD_DESCRIPTIONS)) {
      if (trimmed.startsWith(pattern) && (!desc || pattern.length > (Object.keys(BASH_CMD_DESCRIPTIONS).find(k => desc === BASH_CMD_DESCRIPTIONS[k]) || '').length)) {
        desc = d;
      }
    }
    if (!desc) {
      const sub = trimmed.split(/\s+/)[1];
      desc = sub ? `${tool} ${sub} operation` : `${tool} CLI command`;
    }
    const key = words.length > 28 ? words.slice(0, 28) + '…' : words;
    if (!entries.find(e => e.key === key)) entries.push({ key, desc });
  }
  return entries;
}

function parseYamlEntries(rawCode) {
  const entries = [];
  const lines = rawCode.split('\n');
  for (const line of lines) {
    const stripped = line.replace(/^\s*```[a-z]*\s*$/, '').trimEnd();
    if (!stripped || stripped.trim().startsWith('#') || stripped.trim() === '---') continue;
    // Only top-level keys (no leading spaces)
    const m = stripped.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)/);
    if (!m) continue;
    const key = m[1];
    const valPreview = m[2].trim();
    const desc = KEY_DESCRIPTIONS[key] || (valPreview ? `Value: ${valPreview}` : null);
    if (!entries.find(e => e.key === key)) entries.push({ key, desc });
  }
  return entries;
}

export default function YamlBreakdown({ code }) {
  if (!code) return null;

  // Detect language from fence
  const fenceMatch = code.match(/^```(\w+)/m);
  const lang = fenceMatch ? fenceMatch[1].toLowerCase() : 'yaml';
  const isBash = lang === 'bash' || lang === 'sh' || lang === 'shell';

  const entries = isBash ? parseBashEntries(code) : parseYamlEntries(code);
  if (entries.length === 0) return null;

  return (
    <div className="mt-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3 landing-mono" style={{ color: 'var(--text-muted)' }}>
        {isBash ? 'COMMAND FLOW' : 'CONFIGURATION FLOW'}
      </p>
      <div className="relative pl-4" style={{ borderLeft: '2px solid var(--border)' }}>
        {entries.map((entry, i) => (
          <div key={i} className="relative flex items-start gap-3 mb-3 last:mb-0">
            {/* Dot on the left rail */}
            <span
              className="absolute flex-shrink-0"
              style={{
                left: '-5px',
                top: '6px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--accent)',
                border: '2px solid var(--bg-elevated)',
              }}
            />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                className="inline-flex self-start text-[11px] font-bold landing-mono px-1.5 py-0.5 rounded"
                style={{
                  color: 'var(--accent)',
                  background: 'color-mix(in oklab, var(--accent) 10%, transparent)',
                  border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)',
                  maxWidth: '100%',
                  wordBreak: 'break-all',
                }}
              >
                {entry.key}
              </span>
              {entry.desc && (
                <span className="text-[12px] leading-snug landing-body" style={{ color: 'var(--text-muted)' }}>
                  {entry.desc}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
