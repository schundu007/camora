// Helm for Kubernetes — 12-topic learning track
// Sources: helm.sh/docs, Artifact Hub, Learning Helm (O'Reilly),
//          Managing Kubernetes Resources Using Helm (Packt),
//          StackSimplify Helm Masterclass, Linux Foundation LFS244
// Helm 4.2.2 stable (2026); Helm 3 deltas flagged throughout.

export const helmTopics = [

  // ─────────────────────────────────────────────────────────────────────
  // 1. Why Helm — the problem and where it fits
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'helm-why',
    title: 'Why Helm',
    icon: 'package',
    color: '#7c3aed',
    questions: 4,
    description: 'The kubectl-sprawl problem and the package management gap Helm fills. Positions Helm against raw manifests, Kustomize, and Terraform.',
    visualizations: [
      {
        title: 'The manifest sprawl problem and what Helm solves',
        image: '/diagrams/devops/helm-1-why.png',
        description: `Deploying a production-grade app to Kubernetes without tooling means maintaining dozens of YAML files: Deployment, Service, ConfigMap, Secret, HorizontalPodAutoscaler, PodDisruptionBudget, ServiceAccount, NetworkPolicy, Ingress. For three environments (dev/staging/prod) that is 150+ files with subtle per-environment differences.

The kubectl-sprawl problem:
  kubectl apply -f deployment.yaml
  kubectl apply -f service.yaml
  kubectl apply -f configmap-dev.yaml   # where is prod version?
  kubectl apply -f secret.yaml          # how is this versioned?
  ...

Problems this creates:
  No versioning — which set of files deployed release v2.1.3?
  No rollback primitive — kubectl apply is forward-only.
  No parameterization — copy-pasting files per environment creates drift.
  No dependency management — cert-manager must be installed before your chart.
  No lifecycle — pre-install DB migration runs whenever, not before Deployment.

What Helm adds:
  Charts — a single directory becomes a versioned, packageable artifact.
  Releases — every helm install creates a named, tracked instance with revision history.
  Templates — Go templates render environment-specific YAML from one source of truth.
  Values — environment differences live in values files, not in duplicate manifests.
  Hooks — ordered lifecycle phases (pre-install DB migration, post-install smoke test).
  Rollback — helm rollback my-app 2 restores the exact manifests from revision 2.

Helm's position in the ecosystem:
  Helm vs kubectl: kubectl is the imperative driver; Helm adds packaging, templating, and release management on top.
  Helm vs Kustomize: Kustomize patches plain YAML (no templates, no packaging, no release tracking). Helm templates and packages. Production consensus: Helm for third-party software you consume; Kustomize for your own app overlays; hybrid when needed.
  Helm vs Terraform: Terraform owns infrastructure (VPCs, node groups, databases). Helm owns application workloads on Kubernetes. They compose: Terraform provisions the cluster, Helm deploys the apps.
  Helm vs Argo CD: Argo CD is a GitOps controller that can render Helm charts and apply them. They are complementary.`,
      }
    ],
    quickFire: [
      { q: 'What problem does Helm solve that kubectl alone cannot?', a: 'Three problems. First, packaging — kubectl has no concept of a versioned artifact; Helm bundles all manifests into a chart archive. Second, parameterization — Helm templates let one chart render different YAML for dev/staging/prod via values files; kubectl requires maintaining separate manifest copies. Third, release lifecycle — helm install, upgrade, rollback, history, and uninstall form a coherent release model; kubectl apply is stateless and forward-only.' },
      { q: 'When would you use Kustomize instead of Helm?', a: 'Kustomize wins for your own application when you want pure-YAML diffs in PRs with no templating engine, when you need simple per-environment overlays without packaging or distribution, and when you value native kubectl integration (kubectl apply -k). Helm wins for distributing software to others (Bitnami, ingress-nginx, cert-manager all ship as Helm charts) and when you need lifecycle management (hooks, rollback, history).' },
      { q: 'How does Helm fit into a GitOps workflow?', a: 'Two models. In the pull model, Argo CD or Flux watches a Git repo containing the Helm release definition (values, chart reference, version). The controller renders the chart and applies it — no helm CLI in CI. In the push model, a CI pipeline runs helm upgrade --install and applies directly. The pull model is preferred for production: declarative, auditable, continuously reconciled.' },
      { q: 'What is a Helm release?', a: 'A named, tracked instance of a chart installed into a Kubernetes namespace. Each install or upgrade creates a new revision. Helm stores release state as Kubernetes Secrets (kind: helm.sh/release.v1) in the release namespace, enabling rollback and history without external storage.' },
    ],
    introduction: `Helm is the package manager for Kubernetes, a CNCF graduated project maintained by the Helm core team. The central problem it solves is what practitioners call "kubectl sprawl" — the explosion of disconnected YAML files that accumulates when deploying a real application to Kubernetes without any abstraction layer.

A production workload requires many Kubernetes objects: Deployment, Service, ConfigMap, Secret, HorizontalPodAutoscaler, PodDisruptionBudget, ServiceAccount, NetworkPolicy, Ingress or HTTPRoute. Multiply by environments (dev, staging, prod) and services (API, worker, scheduler) and you quickly have hundreds of files. Without tooling there is no way to answer "what exact set of manifests is running in prod right now?" — the answer is "whatever was last applied, probably."

Helm addresses this with four primitives: charts (versioned packages of manifests), releases (named, tracked deployments of a chart), templates (Go template engine that renders YAML from a single source of truth plus environment-specific values), and lifecycle commands (install, upgrade, rollback, history, uninstall with ordered hooks at each phase).

Where Helm sits in the broader landscape matters for interviews. Helm is complementary to, not competitive with, Terraform (which manages infrastructure), Argo CD (which reconciles desired state from Git), and Kustomize (which overlays plain manifests without templating). The 2026 production consensus is: Helm for third-party software distribution, Kustomize for your own app overlays, Argo CD or Flux as the GitOps controller that renders either.

Helm 4 (released November 2025 at KubeCon NA, stable at 4.2.2) introduced server-side apply, changing how field ownership works, and solidified Secrets-based release storage. Helm 3 remains widely deployed; the Helm 3 to 4 migration is covered in its own topic.`,
    whenToUse: [
      'Deploying third-party software onto Kubernetes (cert-manager, ingress-nginx, prometheus-stack all distribute as Helm charts)',
      'Building a platform product that other teams install — Helm charts are the standard distribution format',
      'Any application needing rollback history, ordered lifecycle hooks, or release tracking',
      'Multi-environment deployments where the only difference is configuration values, not manifest structure',
    ],
    keyConcepts: [
      {
        term: 'Chart',
        definition: 'A directory (or .tgz archive) containing Chart.yaml, values.yaml, templates/, and optional charts/ (dependencies). The versionable, distributable unit in Helm. Charts are typed: application (installs workloads) or library (provides reusable helpers only).',
      },
      {
        term: 'Release',
        definition: 'A named, running instance of a chart in a cluster. Each helm install creates a release. Each helm upgrade creates a new revision of the same release. Helm stores release state as Kubernetes Secrets in the target namespace.',
      },
      {
        term: 'Values',
        definition: 'The configuration layer. Chart ships with values.yaml defaults. At install time, users supply overrides via -f myvals.yaml files and --set key=value flags. Templates render against the merged values object.',
      },
      {
        term: 'Revision',
        definition: 'An integer counter incremented on every install or upgrade. helm rollback my-app 3 restores the exact manifests from revision 3. helm history my-app shows all revisions with timestamps, status, and chart version.',
      },
      {
        term: 'Hook',
        definition: 'A Kubernetes resource (usually a Job) annotated with helm.sh/hook to run at a specific lifecycle phase: pre-install, post-install, pre-upgrade, post-upgrade, pre-delete, post-delete, pre-rollback, post-rollback, test. The canonical use case is a pre-upgrade DB migration Job.',
      },
      {
        term: 'Kubectl sprawl',
        definition: 'The anti-pattern of managing dozens of disconnected, unversioned YAML files across environments with no release model, no diff history, and no rollback primitive. The primary problem Helm was designed to solve.',
      },
    ],
    approach: [
      'Identify a workload currently managed with raw kubectl apply — measure how many files exist and how environments differ',
      'Run helm create to generate a starter chart with the conventional directory layout',
      'Move manifest content into templates/, replacing hardcoded values with {{ .Values.key }} references',
      'Capture environment differences in separate values files (values-dev.yaml, values-prod.yaml)',
      'Install with helm install my-release ./chart -f values-dev.yaml and verify with helm status and helm history',
      'Practice rollback: make a breaking change, helm upgrade, then helm rollback my-release to confirm state restores',
    ],
    pitfalls: [
      'Using Helm as a glorified file copier without any templating — negates the entire value proposition',
      'Treating helm upgrade as a one-way door and never testing rollback until a production incident requires it',
      'Installing third-party charts without pinning --version — upstream breaking changes silently enter the cluster',
      'Mixing helm CLI and kubectl apply on the same resources — Helm loses track of what it owns, rollback becomes unreliable',
      'Choosing Helm for a simple single-environment app with no distribution requirement — Kustomize is simpler for that case',
    ],
    keyQuestions: [
      {
        question: 'Explain the difference between a Helm chart, a Helm release, and a Helm revision.',
        answer: `Chart: the package — a directory or .tgz archive containing Chart.yaml, values.yaml, templates/, and optional sub-charts. Think of it like a Docker image or an npm package: it is the artifact you version and distribute. Charts live in OCI registries or chart repositories.

Release: a named, running instance of a chart installed into a specific namespace. Running helm install my-app ./chart creates a release named "my-app". You can have multiple releases of the same chart in the same cluster: my-app-staging and my-app-prod are two releases of the same chart.

Revision: an integer counter on a release. Every helm install starts at revision 1. Every helm upgrade increments it. helm history my-app shows all revisions. helm rollback my-app 2 restores the exact templates+values from revision 2.

The key distinction for interviews: chart = artifact (what you package and ship), release = running deployment (what exists in the cluster), revision = point-in-time snapshot of that deployment (what enables rollback). Getting these three terms precise signals real Helm experience.`,
      },
      {
        question: 'How does Helm compare to Kustomize and when would you use each?',
        answer: `Philosophy: Helm uses Go templating — charts are programs that render YAML from a values file. Kustomize uses structured overlay patching — you start with plain YAML and layer environment-specific patches on top. No templating engine, no release tracking.

When Helm wins:
- Distributing software to others (cert-manager, prometheus-stack, ingress-nginx ship as Helm charts; there is no Kustomize-native distribution model)
- Third-party software you consume — Bitnami Helm charts have 50+ configurable values
- Complex multi-environment configuration with feature toggles (Helm handles conditionals; Kustomize cannot)
- Release lifecycle (rollback, history, ordered hooks)

When Kustomize wins:
- Your own application with simple environment overlays
- Pure-YAML diffs in pull requests — no template rendering step
- Audit-friendly environments where all deployed YAML must be readable in Git as-is
- kubectl native integration (kubectl apply -k)

2026 hybrid consensus: Use Helm charts for third-party deps, Kustomize overlays for your own apps, and a GitOps controller (Argo CD or Flux) that understands both. Both Argo CD and Flux support rendering a Helm chart and then applying Kustomize patches on top.

The anti-answer to avoid: "I use Helm for everything" or "I use Kustomize for everything" — neither is the right answer for a platform engineer. The right answer is knowing which tool fits which job.`,
      },
      {
        question: 'Where does Helm store release state in the cluster, and why does it matter?',
        answer: `Helm stores release state as Kubernetes Secrets in the release namespace. Each Secret has type helm.sh/release.v1 and its name encodes the release name and revision (e.g., sh.helm.release.v1.my-app.v3).

The Secret stores a gzip-compressed, base64-encoded JSON blob containing the chart metadata, rendered templates, applied values, and release status (deployed, failed, pending-upgrade, etc.).

Why this matters:

1. RBAC: Any user or service account that can list or read Secrets in the namespace can read Helm release history — including values, which may contain sensitive configuration. Namespace-scoped RBAC is mandatory; never give wildcard Secret access to Helm operators.

2. Rollback fidelity: Rollback works by replaying the exact stored manifests from the target revision. If the Secret is deleted (accidentally or by a cluster admin), that revision is lost and rollback to it is impossible.

3. helm list permissions: helm list requires Secret list access. A common support request is "helm list returns nothing" — the cause is usually a service account with no Secret read permissions.

4. Helm 2 vs 3: In Helm 2 with Tiller, state was stored in ConfigMaps and Tiller ran with cluster-admin. Helm 3 moved to client-side, Secrets-based storage, scoped per namespace. Helm 4 (2025) retains Secrets-based storage.

Practical: always configure RBAC to give Helm service accounts only the minimum Secret permissions needed in the target namespace, not cluster-wide.`,
      },
      {
        question: 'How does Helm fit into a GitOps workflow?',
        answer: `Two models in production:

Pull-based GitOps (recommended):
Git repo contains the Helm release definition — chart reference, version, and values file. Argo CD (ApplicationSet or Application) or Flux (HelmRelease CRD) watches the repo. When the chart version or values change in Git, the controller renders the chart and applies the diff to the cluster. No helm CLI runs in CI. Every change is a Git commit; rollback is a git revert.

Argo CD HelmRelease approach:
  spec:
    source:
      chart: my-app
      repoURL: oci://ghcr.io/myorg
      targetRevision: 1.4.2
      helm:
        values: |
          replicaCount: 3

Push-based GitOps:
CI pipeline (GitHub Actions, GitLab CI) runs helm upgrade --install after tests pass. Simple to understand; harder to reconcile (cluster drift is not detected). Appropriate for teams early in GitOps adoption.

Helm template + kubectl apply (GitOps-compatible):
helm template my-app ./chart -f values-prod.yaml | kubectl apply -f -
Renders manifests to stdout, applies via kubectl. The rendered YAML can be committed to Git (rendered manifests repo pattern). Useful when you want GitOps benefits without a controller.

For platform engineers, the expected answer is pull-based GitOps with Argo CD or Flux. Push-based is acceptable for smaller teams; template+apply is a useful escape hatch for policy-restricted environments.`,
      },
    ],
    references: [
      'https://helm.sh/docs/',
      'https://helm.sh/docs/topics/charts/',
      'https://artifacthub.io',
      'https://kustomize.io/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 2. Install and CLI Fundamentals
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'helm-cli-fundamentals',
    title: 'Install and CLI Fundamentals',
    icon: 'terminal',
    color: '#7c3aed',
    questions: 5,
    description: 'Getting Helm installed and mastering the core lifecycle commands: install, upgrade, rollback, uninstall, list, history, status, and template.',
    visualizations: [
      {
        title: 'Helm CLI lifecycle commands and release state machine',
        image: '/diagrams/devops/helm-2-cli.png',
        description: `Installation:
  macOS:   brew install helm
  Linux:   curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
  Windows: choco install kubernetes-helm  OR  winget install Helm.Helm
  From source: go install helm.sh/helm/v4/cmd/helm@latest

Verify: helm version

Core release lifecycle commands:

  helm install <release-name> <chart>
    Creates a new release. Fails if a release with that name already exists.
    Common flags:
      -n / --namespace      target namespace (created if --create-namespace is set)
      -f / --values         additional values file (can stack multiple: -f base.yaml -f prod.yaml)
      --set key=value       inline override (highest precedence)
      --version 1.4.2       pin chart version
      --dry-run             render without applying — good for CI diff checking
      --wait                block until all Pods/Services are ready (or --timeout expires)
      --atomic              roll back automatically on failure (implies --wait)

  helm upgrade <release-name> <chart>
    Upgrades an existing release. Creates the release if --install flag is passed.
    helm upgrade --install is the idempotent install-or-upgrade idiom used in CI.

  helm rollback <release-name> [revision]
    Restores the manifests and values from the given revision.
    If revision is omitted, rolls back one revision.
    helm rollback my-app 2   # restore revision 2

  helm uninstall <release-name>
    Removes all resources tracked by the release and deletes the release Secrets.
    --keep-history: delete resources but retain the release history.

  helm list [-n namespace] [-A for all namespaces]
    Lists releases with status, chart version, and app version.

  helm history <release-name>
    Shows all revisions: number, timestamp, status, chart, description.

  helm status <release-name>
    Current state of the release (DEPLOYED, FAILED, PENDING_UPGRADE, etc.) plus NOTES.txt.

  helm template <release-name> <chart> -f values.yaml
    Renders templates to stdout without applying — used for GitOps diffing or policy gating.
    Identical rendering to helm install but no cluster interaction.

  helm get manifest <release-name>
    Shows the manifests that were last applied to the cluster from this release.

  helm lint <chart>
    Validates chart structure and template syntax without rendering.

  helm pull oci://registry/chart --version 1.2.3 --untar
    Downloads and unpacks a chart for local inspection.

Release state machine:
  pending-install -> deployed (success) or failed (hook/apply error)
  deployed -> pending-upgrade -> deployed or failed
  deployed -> uninstalled (helm uninstall)
  failed -> pending-rollback -> deployed or failed`,
      }
    ],
    quickFire: [
      { q: 'What is the difference between helm install and helm upgrade --install?', a: 'helm install fails if the release already exists. helm upgrade --install is idempotent — it creates the release if absent or upgrades it if present. This is the standard CI/CD pattern: one command handles both first deploy and subsequent deploys.' },
      { q: 'What does --atomic do?', a: 'Implies --wait. If the upgrade fails or times out, Helm automatically rolls back to the previous revision. Use in CI to prevent a broken release from being left in a FAILED state. Without --atomic a failed upgrade leaves the release in FAILED state and blocks the next upgrade until you manually rollback.' },
      { q: 'How do you see the manifests currently deployed by a release?', a: 'helm get manifest <release-name> returns the rendered YAML that was last applied. helm get all returns manifest + values + hooks + notes. Useful for debugging drift between what Helm thinks is deployed and what is actually in the cluster.' },
      { q: 'What does --dry-run do and when is it not enough?', a: '--dry-run renders templates and validates them against the Kubernetes OpenAPI schema, but does not apply. It catches template syntax errors and schema violations. It does not catch: missing CRDs (schema unknown), namespace permissions issues, webhook rejections, or resource quota exhaustion. For a full pre-flight check, use helm template piped into kubeval or helm upgrade --dry-run=server (Helm 3.11+) which validates against the live cluster\'s API.' },
      { q: 'How do you roll back a release to a specific revision?', a: 'helm rollback <release-name> <revision-number>. Example: helm rollback my-app 3. Without a revision number it rolls back one step. helm history my-app shows all available revisions. Note: rollback re-runs pre-rollback and post-rollback hooks if defined.' },
      { q: 'How do you delete a release but preserve its history?', a: 'helm uninstall <release-name> --keep-history. The release resources are removed from the cluster but the Secrets containing revision history remain. This lets you helm rollback even after uninstall, or inspect history. Without --keep-history the Secret is deleted and history is gone.' },
    ],
    introduction: `The Helm CLI is a single binary (helm) with around 59 subcommands. In practice, seven commands cover 90% of day-to-day work: install, upgrade, rollback, uninstall, list, history, and template. Understanding exactly what each command does to the cluster and to release state is a prerequisite for both using Helm confidently and answering interview questions precisely.

Installation is straightforward across platforms. Homebrew handles macOS (brew install helm), the official get-helm script handles Linux, and Chocolatey or winget handle Windows. The binary has no daemon component — Helm 3 is fully client-side, connecting to the Kubernetes API directly via your kubeconfig.

The core workflow is: helm install creates a named release at revision 1. helm upgrade increments the revision. helm rollback restores an earlier revision. helm uninstall removes the release. Each command creates or updates a Secret in the target namespace encoding the complete state — chart metadata, rendered manifests, values, and status.

Two flags are important enough to internalize: --atomic makes upgrades self-healing (auto-rollback on failure), and --wait makes commands block until all resources are ready (not just submitted to the API). Without --wait, helm upgrade returns success as soon as the API accepts the objects — before Pods are actually running. In CI, --atomic --timeout 5m is the standard production pattern.

The helm template command is used without --atomic or --wait because it never touches the cluster — it renders manifests to stdout. This is the GitOps-friendly pattern: render in CI, commit rendered YAML or diff it, then apply. helm template combined with kubeval or kubeconform gives schema validation without a live cluster.`,
    whenToUse: [
      'First-time install of any chart: helm install <release> <chart> -f values.yaml --namespace <ns> --create-namespace',
      'Idempotent CI deploy: helm upgrade --install --atomic --wait --timeout 5m',
      'Investigating a production release: helm history, helm get manifest, helm get values',
      'Debugging a failing upgrade: helm status to see current state, helm get manifest to compare with running resources',
      'GitOps-compatible rendering: helm template to stdout for diff or commit',
    ],
    keyConcepts: [
      {
        term: 'helm upgrade --install',
        definition: 'The idempotent form: creates the release if absent, upgrades if present. The standard CI/CD pattern. Avoids the error "cannot re-use a name that is still in use" (install) or "release not found" (upgrade).',
      },
      {
        term: '--atomic',
        definition: 'Implies --wait. On upgrade failure or timeout, automatically runs helm rollback and returns exit code 1. Prevents a broken release from being left in FAILED state. Essential for production CI pipelines.',
      },
      {
        term: '--wait',
        definition: 'Blocks until all Deployment, StatefulSet, DaemonSet, Service, Pod, and PVC resources reach ready state. Default timeout is 5 minutes. Without it, Helm returns success as soon as the API accepts the resources, before Pods are running.',
      },
      {
        term: 'helm template',
        definition: 'Renders chart templates to stdout without connecting to a cluster (except for --dry-run=server). Used for local inspection, CI diffing, GitOps rendered-manifest repos, and piping into validation tools like kubeval.',
      },
      {
        term: 'helm get manifest',
        definition: 'Returns the exact rendered YAML that Helm last applied to the cluster for a release. Essential for debugging drift: compare this output with kubectl get -o yaml to detect out-of-band changes.',
      },
      {
        term: 'Values precedence (highest to lowest)',
        definition: '--set flags > -f values files (rightmost wins) > values.yaml in the chart. Knowing this order prevents surprises when --set and -f conflict.',
      },
    ],
    approach: [
      'Install helm and verify: helm version — confirm you are on 4.x',
      'Add a chart source: helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx && helm repo update',
      'Inspect before installing: helm show values ingress-nginx/ingress-nginx > my-values.yaml, edit the file',
      'Dry-run first: helm install my-ingress ingress-nginx/ingress-nginx -f my-values.yaml --dry-run --debug',
      'Install: helm install my-ingress ingress-nginx/ingress-nginx -f my-values.yaml -n ingress-nginx --create-namespace --wait',
      'Verify: helm list -n ingress-nginx, helm status my-ingress -n ingress-nginx',
      'Practice upgrade: change a value in my-values.yaml, run helm upgrade my-ingress ... --atomic, then helm history my-ingress',
    ],
    pitfalls: [
      'Using helm install in CI instead of helm upgrade --install — fails on the second run when the release already exists',
      'Not using --wait in CI — pipeline reports success while Pods are still crash-looping in the background',
      'Running helm upgrade without --atomic — a failed upgrade leaves the release in FAILED state, blocking all subsequent upgrades until manual rollback',
      'Forgetting to pin --version — a helm repo update followed by helm upgrade can silently pull a new chart version with breaking changes',
      'Running helm uninstall without --keep-history when you might need to roll back — history is destroyed and cannot be recovered',
    ],
    keyQuestions: [
      {
        question: 'What happens when helm upgrade fails mid-way through applying resources?',
        answer: `Without --atomic: Helm marks the release as FAILED. Some resources may have been updated, some may not. The cluster is in a partially upgraded state. The next helm upgrade will fail with "FAILED release status" unless you first run helm rollback or helm upgrade --force. This is dangerous in production.

With --atomic: Helm detects the failure (or --timeout expiration), automatically runs helm rollback to the previous successful revision, and returns exit code 1. The cluster is back to its last known-good state. This is the production-safe pattern.

With --cleanup-on-fail (without --atomic): Helm deletes any new resources created during the failed upgrade, but does not revert updates to existing resources. Less safe than --atomic.

The interview answer: always use --atomic --wait --timeout in CI pipelines. Without it, a failed upgrade leaves the cluster in an undefined state that requires manual intervention. Production incidents from partial upgrades are notoriously hard to diagnose because helm list shows FAILED but some of the new version is actually running.`,
      },
      {
        question: 'How does values precedence work in Helm, and how would you structure values for three environments?',
        answer: `Helm merges values from multiple sources in a defined order, from lowest to highest precedence:

1. values.yaml inside the chart (lowest — chart defaults)
2. Sub-chart values.yaml files
3. -f / --values files, applied left to right (later files win)
4. --set, --set-string, --set-json, --set-file flags (highest — CLI wins)

Structure for three environments:

  values.yaml          # chart defaults: image tag, replica count, resource requests
  values-dev.yaml      # dev overrides: replicas: 1, debug: true, resources.requests.cpu: 50m
  values-staging.yaml  # staging overrides: replicas: 2, resources.requests.cpu: 200m
  values-prod.yaml     # prod overrides: replicas: 5, resources.limits.memory: 2Gi

Install commands:
  dev:     helm upgrade --install myapp ./chart -f values.yaml -f values-dev.yaml
  staging: helm upgrade --install myapp ./chart -f values.yaml -f values-staging.yaml
  prod:    helm upgrade --install myapp ./chart -f values.yaml -f values-prod.yaml

The base values.yaml in the chart should contain safe defaults (non-zero replica count, sane resource requests). Environment files only override what differs. This minimizes drift risk — a new value added to chart defaults is automatically inherited by all environments.

Common mistake: putting environment-specific secrets in values files and committing them to Git. The correct pattern is --set from a CI secret or referencing an External Secrets Operator resource.`,
      },
      {
        question: 'Walk through how you would debug a stuck helm upgrade.',
        answer: `Systematic debugging steps:

1. Check release status: helm status <release-name> -n <namespace>
   Look at STATUS field: DEPLOYED, FAILED, PENDING_UPGRADE. PENDING_UPGRADE means a previous upgrade is still running (or timed out and left dangling — force-release with helm rollback).

2. Check history: helm history <release-name> -n <namespace>
   See which revision is current, which failed, and the descriptions (e.g., "Upgrade failed: timed out waiting for the condition").

3. Get the rendered manifests: helm get manifest <release-name>
   Compare with kubectl get <resource> -o yaml to detect drift — if they differ, something modified resources outside Helm.

4. Check Kubernetes events: kubectl describe pod <pod-name> -n <namespace>
   Image pull errors, resource quota exceeded, scheduling failures, OOMKilled, CrashLoopBackOff.

5. Check hooks: helm get hooks <release-name>
   A hanging pre-upgrade Job blocks the upgrade indefinitely. Check the Job's Pod logs: kubectl logs -n <ns> -l job-name=<hook-job>.

6. Template render diff: helm template <release> ./chart -f values.yaml > new-manifests.yaml
   Then diff against helm get manifest to see what the upgrade would change.

7. Force-release a stuck PENDING state: helm rollback <release> --force

Common root causes: image pull failure, insufficient resource quota, webhook admission rejection, hook Job failure, CRD not present, RBAC preventing resource creation.`,
      },
      {
        question: 'What is the difference between helm template and helm install --dry-run?',
        answer: `helm template:
- No cluster connection required (unless --dry-run=server)
- Renders templates to stdout
- Does NOT validate against the live cluster's API
- Does NOT run admission webhooks
- Fast, works in air-gapped environments
- Use case: local development, GitOps diffing, piping into kubeval/kubeconform, committing rendered manifests

helm install --dry-run:
- Connects to the cluster
- Renders templates AND validates against the Kubernetes OpenAPI schema
- Validates that CRDs referenced in the chart exist in the cluster
- Still does NOT run admission webhooks (MutatingAdmissionWebhook / ValidatingAdmissionWebhook)
- Use case: pre-flight check that catches schema errors and missing CRDs

helm upgrade --dry-run=server (Helm 3.11+):
- Full server-side validation including admission webhooks
- Closest to "what would actually happen" without making changes
- Slowest — connects to cluster and engages the webhook chain
- Use case: policy enforcement checks (OPA/Gatekeeper, Kyverno) before production deploy

For interviews: helm template is for offline rendering and diffing; --dry-run is for schema validation; --dry-run=server is for full admission validation. A mature CI pipeline uses helm template for fast feedback and --dry-run=server for the final gate.`,
      },
      {
        question: 'How do you list all Helm releases across all namespaces, and what permissions are required?',
        answer: `Command: helm list -A (short for --all-namespaces)

This runs helm list against every namespace the current kubeconfig user can access and aggregates the results.

Permissions required: Helm stores release state as Secrets. To list releases in a namespace, the user/service account must have:
  apiGroups: [""]
  resources: ["secrets"]
  verbs: ["list", "get"]

Without Secret list permission in a namespace, helm list shows no releases for that namespace — not an error, just an empty result. This is a common support pitfall: "helm list shows nothing" usually means missing Secret permissions, not that no releases are installed.

Filtering flags:
  helm list -n prod                   # specific namespace
  helm list -A --filter my-app        # regex filter on release name
  helm list -A --failed               # only FAILED releases
  helm list -A --pending              # only PENDING_* releases
  helm list -A -o json                # JSON output for scripting

Service account for CI: a typical CD service account needs:
  Secrets: get, list, create, update, delete (for release state management)
  Plus whatever permissions the chart resources require

For platform engineers: never give a Helm service account cluster-wide Secret access. Namespace-scope it. A pipeline deploying to production should only have Secret access in the production namespace.`,
      },
    ],
    references: [
      'https://helm.sh/docs/helm/',
      'https://helm.sh/docs/intro/install/',
      'https://helm.sh/docs/intro/quickstart/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 3. Anatomy of a Chart
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'helm-chart-anatomy',
    title: 'Anatomy of a Chart',
    icon: 'layers',
    color: '#7c3aed',
    questions: 5,
    description: 'Every file in a Helm chart and what it does. Chart.yaml metadata, values.yaml defaults, templates/, _helpers.tpl named templates, NOTES.txt, CRDs, and chart types.',
    visualizations: [
      {
        title: 'Helm chart directory structure and file roles',
        image: '/diagrams/devops/helm-3-anatomy.png',
        description: `helm create myapp generates this standard layout:

  myapp/
  ├── Chart.yaml             # required: chart metadata
  ├── values.yaml            # required: default configuration values
  ├── values.schema.json     # optional: JSON Schema validation for values
  ├── .helmignore            # optional: files to exclude from the chart archive
  ├── LICENSE                # optional: chart license text
  ├── README.md              # optional: chart documentation
  ├── charts/                # optional: vendored chart dependencies (.tgz or directories)
  ├── crds/                  # optional: CustomResourceDefinitions (plain YAML, not templated)
  └── templates/             # required: Go template files rendered to Kubernetes manifests
      ├── _helpers.tpl       # named templates and shared helpers (not rendered directly)
      ├── deployment.yaml    # Deployment template
      ├── service.yaml       # Service template
      ├── serviceaccount.yaml
      ├── hpa.yaml
      ├── ingress.yaml
      └── NOTES.txt          # post-install instructions (rendered as Go template, printed to CLI)

Chart.yaml — every field that matters:

  apiVersion: v2              # v2 required for Helm 3 and 4; v1 is legacy Helm 2
  name: myapp                 # lowercase, no spaces
  version: 1.4.2              # CHART version (SemVer 2) — bump this on every chart change
  appVersion: "2.1.0"         # application version (informational, quoted string)
  description: My web app
  type: application           # "application" (default) or "library"
  kubeVersion: ">=1.27.0"     # optional: minimum Kubernetes version constraint
  dependencies:               # sub-charts (Helm 3+ only in Chart.yaml; Helm 2 used requirements.yaml)
    - name: postgresql
      version: "13.2.0"
      repository: "oci://registry-1.docker.io/bitnamicharts"
      condition: postgresql.enabled   # values path that enables/disables this dep

Key distinction: chart version (version field) vs app version (appVersion).
  Chart version: increment whenever the chart itself changes (templates, values, helpers).
  App version: the version of the software the chart deploys. Changing the Docker image tag
  bumps appVersion but may or may not require a chart version bump.

templates/ directory rules:
  Files starting with _ are NOT rendered as manifests (they define named templates).
  _helpers.tpl is the conventional location for all named templates and shared helpers.
  NOTES.txt is rendered and printed after install — not a Kubernetes manifest.
  All other .yaml / .json files are rendered and applied to the cluster.
  Subdirectories inside templates/ are supported and rendered recursively.

crds/ directory rules:
  Plain YAML files only — NOT Go templates. Helm renders templates before CRDs.
  CRDs are installed BEFORE templates are rendered (making them available via .Capabilities).
  CRDs are NEVER deleted on helm uninstall (Kubernetes-wide protection).
  CRDs are NEVER reinstalled or upgraded automatically — manage them manually.
  If you need templated CRDs, install them via a separate chart or a pre-install hook.`,
      }
    ],
    quickFire: [
      { q: 'What is the difference between chart version and appVersion?', a: 'Chart version (the version field) is the version of the chart itself — the templates, values, and helpers. It must follow SemVer and must be bumped whenever the chart changes. appVersion is the version of the application the chart deploys — informational only, not used by Helm for logic. A chart at version 3.1.0 might deploy application version 2.4.1.' },
      { q: 'What lives in _helpers.tpl and why does the filename start with underscore?', a: '_helpers.tpl contains named templates defined with {{ define "myapp.fullname" }}...{{ end }}. Files starting with underscore are never rendered directly as Kubernetes manifests — Helm skips them during rendering. They exist solely to be called with {{ include "myapp.fullname" . }} from other template files.' },
      { q: 'What is the difference between charts/ and crds/ directories?', a: 'charts/ holds vendored sub-chart dependencies (from helm dependency update). crds/ holds CustomResourceDefinition YAML files. The key differences: crds/ files cannot be templated and are never deleted on uninstall; charts/ files are full charts with their own templates. CRDs must be plain YAML because they must be installed before templates render — Helm needs them in the cluster for .Capabilities.APIVersions.Has() to work.' },
      { q: 'What does NOTES.txt do?', a: 'NOTES.txt is a Go template file inside templates/ that is rendered and printed to the CLI after a successful helm install or helm upgrade. It is not applied to Kubernetes. Its purpose is to display post-install instructions: service endpoints, next steps, admin credentials, etc. It has access to all template variables (.Values, .Release, etc.).' },
      { q: 'What are the two chart types and when would you use library charts?', a: 'Application charts (type: application, default) deploy workloads to Kubernetes and are installable. Library charts (type: library) contain only named template definitions — no installable resources. You use library charts to share helper templates across multiple application charts without copy-pasting. A library chart cannot be installed directly; it must be listed as a dependency of application charts that call its templates.' },
    ],
    introduction: `A Helm chart is a directory (or .tgz archive) with a strictly defined layout. Knowing every file and its role is the foundation for debugging charts, writing templates correctly, and designing chart structures for your team's needs.

The required files are Chart.yaml and the templates/ directory. Everything else is optional but each file has a specific semantic role that Helm enforces. Understanding which files are rendered as manifests (everything in templates/ except underscore-prefixed files), which are never rendered (crds/), and which are informational (README.md, LICENSE, NOTES.txt) prevents a class of common mistakes.

Chart.yaml has two version fields that confuse nearly every Helm newcomer: version (the chart's own SemVer version, must be incremented on chart changes) and appVersion (the deployed application's version, informational only). Conflating them is a frequent chart-maintenance bug.

The crds/ directory has three critical constraints that differ from everything else in Helm: CRD files cannot use Go template syntax (they must be plain YAML), CRDs are never deleted when the chart is uninstalled, and CRDs are never automatically reinstalled or upgraded. These constraints exist because CRDs are cluster-global resources that Helm cannot safely manage with the same CRUD lifecycle as namespace-scoped objects.

Library charts (type: library) are an advanced feature for platform teams: they package named templates that other charts can consume as dependencies. A library chart cannot be installed directly — it has no resources to apply. The pattern is powerful for large estates where you want standardized helpers (resource naming conventions, standard labels, sidecar injection patterns) shared across dozens of application charts.`,
    whenToUse: [
      'Any time you write or debug a chart — understanding the file layout prevents the class of "file renders when it should not" or "template not found" errors',
      'When building a chart scaffold for a new service — helm create gives the standard layout; know what to keep and what to remove',
      'When deciding between charts/ and crds/ for CRD management — the immutability constraints of crds/ mean manual CRD management in large-cluster estates',
      'When building a library chart for shared helpers across a platform team\'s chart collection',
    ],
    keyConcepts: [
      {
        term: 'Chart.yaml: version vs appVersion',
        definition: 'version is the chart\'s own SemVer version — increment on any chart change. appVersion is the application version the chart deploys — informational only. Helm uses version for dependency resolution; appVersion appears in helm list output but drives no Helm logic.',
      },
      {
        term: 'apiVersion: v2',
        definition: 'The chart API version required for Helm 3 and Helm 4. Enables the dependencies field in Chart.yaml (Helm 2 used a separate requirements.yaml). Also enables the type field (application vs library). A chart with apiVersion: v1 is a Helm 2 legacy chart.',
      },
      {
        term: 'templates/_helpers.tpl',
        definition: 'The conventional file for named template definitions ({{ define }} blocks). Files prefixed with underscore are not rendered as Kubernetes manifests. Named templates are called with {{ include "chart.helper" . }} from other template files. helm create generates _helpers.tpl with common naming and label helpers.',
      },
      {
        term: 'crds/ directory constraints',
        definition: 'CRD YAML files here cannot be templated (plain YAML only), are installed before templates render, are never deleted on helm uninstall, and are never automatically reinstalled or upgraded. Designed to protect cluster-global resources from lifecycle accidents.',
      },
      {
        term: 'NOTES.txt',
        definition: 'A Go template file in templates/ that renders to a human-readable post-install message (not a Kubernetes manifest). Printed to CLI after helm install or helm upgrade. Has access to .Values, .Release, and all template helpers. Use it to show service URLs, next steps, and configuration reminders.',
      },
      {
        term: 'Library charts (type: library)',
        definition: 'Charts containing only named template definitions. Not directly installable. Listed as dependencies in application charts that call their templates. Used for platform-wide helper sharing: standard resource naming, common label sets, sidecar injection boilerplate.',
      },
    ],
    approach: [
      'Run helm create myapp to generate the starter layout and read every generated file',
      'Understand Chart.yaml: fill in version, appVersion, description, and kubeVersion constraints for your chart',
      'Review templates/_helpers.tpl: understand the fullname, labels, and selectorLabels templates that all other templates call',
      'Trace a value from values.yaml through a template to the rendered manifest using helm template myapp ./myapp',
      'Add a NOTES.txt that prints the service URL after install using {{ include "myapp.fullname" . }} and .Release.Namespace',
      'If using CRDs: place plain YAML in crds/, understand they will not be updated on upgrade, and document manual CRD upgrade procedure',
    ],
    pitfalls: [
      'Forgetting to bump chart version after changing templates — helm repo users will pull the old cached version',
      'Putting a Go template in crds/ — Helm panics or silently skips the file',
      'Naming a template file starting with an underscore for a real manifest — it will be skipped and never applied',
      'Confusing appVersion and version — updating only appVersion for a chart change means dependents that pin by chart version get stale content',
      'Placing CRDs in templates/ instead of crds/ — they will be templated, will be deleted on uninstall, and upgrade behavior will be wrong',
    ],
    keyQuestions: [
      {
        question: 'Describe the complete directory structure of a Helm chart and the role of each file.',
        answer: `A Helm chart is a directory named after the chart with this layout:

Chart.yaml (required): chart metadata. Required fields: apiVersion (v2 for Helm 3/4), name, version (SemVer for the chart). Important optional fields: appVersion (application version, informational), type (application or library), kubeVersion (minimum Kubernetes version constraint), dependencies (sub-charts).

values.yaml (conventional): default values for template variables. Users override by passing -f myvals.yaml or --set key=value at install time.

values.schema.json (optional): JSON Schema (draft-07) that validates values at install, upgrade, lint, and template time. Provides error messages when values are wrong type, out of range, or missing required fields.

templates/ (required): Go template files rendered to Kubernetes manifests. Files starting with _ (e.g., _helpers.tpl) are not rendered — they define named templates. NOTES.txt is rendered and printed to CLI but not applied. All other .yaml/.json files are rendered and applied.

charts/ (optional): vendored sub-chart dependencies populated by helm dependency update. Contains .tgz archives or unpacked chart directories.

crds/ (optional): plain YAML CRD definitions installed before templates render. Cannot be templated, never deleted on uninstall, never automatically upgraded.

.helmignore (optional): files to exclude from the chart archive (like .gitignore syntax). Exclude .git, test fixtures, local override files.

LICENSE, README.md (optional): informational files served to users browsing the chart on Artifact Hub.`,
      },
      {
        question: 'What is the purpose of _helpers.tpl and how are named templates called?',
        answer: `_helpers.tpl (or any file starting with _) is not rendered as a Kubernetes manifest. It exists to define reusable named templates using the Go template {{ define }} action:

  {{- define "myapp.fullname" -}}
  {{- if .Values.fullnameOverride }}
  {{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
  {{- else }}
  {{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
  {{- end }}
  {{- end }}

Named templates are called from other template files using {{ include }}:

  metadata:
    name: {{ include "myapp.fullname" . }}
    labels:
      {{- include "myapp.labels" . | nindent 4 }}

{{ include }} vs {{ template }}: Always use {{ include }} in modern charts. {{ template }} does not return a value — it outputs directly. {{ include }} returns a string that can be piped through functions like nindent, trim, or quote. This matters for indentation: {{ include "myapp.labels" . | nindent 4 }} correctly indents the multi-line labels output.

Convention: helm create generates _helpers.tpl with four standard named templates: fullname, chart (chart name + version), labels (standard recommended labels), and selectorLabels. These are called by every generated resource template. Extending _helpers.tpl for project-specific helpers (resource limits, sidecar spec, standard annotations) is the standard library chart pattern.`,
      },
      {
        question: 'Why are CRDs in the crds/ directory, and what are the implications for upgrade management?',
        answer: `Helm installs CRDs before rendering templates so that .Capabilities.APIVersions.Has("my.group.io/v1") works during template rendering. This requires CRDs to be plain YAML (not templates) because Helm cannot render templates that reference types that don't exist yet.

Three immutability constraints for crds/:

1. Never deleted on uninstall: CRDs are cluster-global resources. If Helm deleted them, it would destroy all instances of that custom resource across every namespace — a catastrophic operation. Kubernetes prevents this by policy; Helm aligns with it.

2. Never reinstalled if already present: Running helm install twice does not re-apply the CRD. This prevents version conflicts when multiple charts depend on the same CRD.

3. Never upgraded automatically: helm upgrade does not update CRD definitions. This is intentional — CRD schema changes require careful migration planning. Helm cannot know whether it is safe to update the schema.

Production implications:

For simple charts that ship their own CRDs (cert-manager, prometheus-operator), this is fine — install once, upgrade the chart without touching the CRD.

For platform teams managing many clusters: treat CRDs as infrastructure. Version them separately, apply them via kubectl apply or a dedicated CRD management chart, and keep them outside Helm's lifecycle. Some teams use a separate helm chart (type: application) with CRDs in templates/ instead of crds/ specifically to get Helm's upgrade behavior — trading the safety constraints for lifecycle control.

Interview signal: knowing that crds/ is intentionally constrained, not a Helm limitation, shows architectural understanding of why those constraints exist.`,
      },
      {
        question: 'How does values.schema.json work and what does it validate?',
        answer: `values.schema.json is a JSON Schema (draft-07) document placed at the chart root. Helm validates user-supplied values against this schema at four points: helm install, helm upgrade, helm lint, and helm template.

What it validates:
- Type enforcement: a field expected to be a number cannot be passed as a string
- Required fields: schema can mark fields as required, preventing installs with missing config
- Enum constraints: a field accepting only "ClusterIP", "NodePort", or "LoadBalancer"
- Format validation: email, uri, hostname patterns
- Range constraints: minimum/maximum for numeric values
- Pattern matching: regex for string values

Example:
  {
    "$schema": "https://json-schema.org/draft-07/schema",
    "type": "object",
    "required": ["image"],
    "properties": {
      "replicaCount": {
        "type": "integer",
        "minimum": 1
      },
      "image": {
        "type": "object",
        "required": ["repository", "tag"],
        "properties": {
          "repository": { "type": "string" },
          "tag": { "type": "string" }
        }
      }
    }
  }

Bypassing: helm install --skip-schema-validation bypasses for air-gapped or legacy environments.

Interview angle: values.schema.json is how chart authors enforce correct usage at install time instead of failing at runtime when a misconfigured Pod crashes. It shifts errors left from cluster runtime to helm install. For a platform team distributing internal charts, adding schema validation prevents the class of "wrong values file applied to the wrong environment" incidents.`,
      },
      {
        question: 'What does helm create generate and what would you typically remove or modify?',
        answer: `helm create myapp generates a starter chart deploying an nginx-based application. The generated structure:

Keep and modify:
- Chart.yaml: update name, description, version (0.1.0 to your actual version), appVersion
- values.yaml: replace defaults with your application's actual configuration surface
- templates/_helpers.tpl: keep the generated naming/label helpers; add project-specific helpers
- templates/deployment.yaml: adapt for your container spec, probes, env vars
- templates/service.yaml: usually keep as-is, modify service type default
- templates/NOTES.txt: replace nginx references with your app's service URL and next steps

Usually remove:
- templates/hpa.yaml: remove if you don't need autoscaling (or make it conditional with {{ if .Values.autoscaling.enabled }})
- templates/ingress.yaml: remove if managed separately or handled by a gateway controller
- templates/serviceaccount.yaml: remove if your app uses the default service account
- templates/tests/test-connection.yaml: replace with a meaningful test for your app

Key edits to values.yaml:
Replace the default image with your actual registry and tag. Add your application's environment variables as values. Set resource requests and limits appropriate for your workload. Add any application-specific configuration (database URLs, feature flags) as values rather than hardcoded in the template.

The generated chart is a learning scaffold, not a production-ready deployment. The Helm maintainers intentionally make it simple enough to understand but complex enough to demonstrate the key patterns (conditionals, named templates, helpers, NOTES).`,
      },
    ],
    references: [
      'https://helm.sh/docs/topics/charts/',
      'https://helm.sh/docs/chart_template_guide/getting_started/',
      'https://helm.sh/docs/topics/library_charts/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 4. Go Templating
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'helm-go-templating',
    title: 'Go Templating',
    icon: 'code',
    color: '#7c3aed',
    questions: 6,
    description: 'The Go template engine that powers Helm charts: pipelines, built-in objects, control structures (if/with/range), named templates, tpl function, and whitespace control.',
    visualizations: [
      {
        title: 'Helm Go template syntax reference',
        image: '/diagrams/devops/helm-4-templating.png',
        description: `Built-in objects available in every template:

  .Release.Name          # release name (from helm install <name>)
  .Release.Namespace     # target namespace
  .Release.Service       # "Helm"
  .Release.Revision      # revision number (1 on first install)
  .Release.IsInstall     # true if this is a helm install (not upgrade)
  .Release.IsUpgrade     # true if this is a helm upgrade
  .Chart.Name            # from Chart.yaml name field
  .Chart.Version         # from Chart.yaml version field
  .Chart.AppVersion      # from Chart.yaml appVersion field
  .Values                # merged values object
  .Files                 # access to non-template files in the chart
  .Capabilities.KubeVersion.Major   # Kubernetes major version
  .Capabilities.APIVersions.Has "batch/v1"  # check API availability

Pipelines — chain functions left-to-right, output of each is last arg of next:
  {{ .Values.image.tag | default "latest" | quote }}
  {{ .Values.name | upper | trunc 63 | trimSuffix "-" }}
  {{ .Values.labels | toYaml | nindent 4 }}   # critical for maps

Control structures:

  if / else if / else:
  {{- if .Values.ingress.enabled }}
  apiVersion: networking.k8s.io/v1
  kind: Ingress
  ...
  {{- end }}

  if with string/boolean:
  {{- if and .Values.autoscaling.enabled (gt .Values.autoscaling.minReplicas 1) }}

  with (scopes . to a value):
  {{- with .Values.resources }}
  resources:
    {{- toYaml . | nindent 4 }}
  {{- end }}

  range (iterate over list or map):
  {{- range .Values.extraEnv }}
    - name: {{ .name }}
      value: {{ .value | quote }}
  {{- end }}

  range over map (key, value):
  {{- range $key, $val := .Values.nodeSelector }}
    {{ $key }}: {{ $val | quote }}
  {{- end }}

Whitespace control — the hyphen trims whitespace:
  {{- expr }}   # trim whitespace BEFORE the action
  {{ expr -}}   # trim whitespace AFTER the action
  {{- expr -}}  # trim both sides

Named templates:
  Define (in _helpers.tpl):
  {{- define "myapp.labels" -}}
  app.kubernetes.io/name: {{ include "myapp.name" . }}
  app.kubernetes.io/instance: {{ .Release.Name }}
  {{- end }}

  Call (in deployment.yaml):
  labels:
    {{- include "myapp.labels" . | nindent 4 }}

tpl function — render a value as a template:
  # values.yaml:
  # configData: "host: {{ .Release.Name }}-db"
  data:
    config.yaml: {{ tpl .Values.configData . | quote }}
  Use with caution — values that contain template syntax are unexpected and hard to debug.

Key Sprig functions:
  String:    lower, upper, trim, trunc, replace, contains, hasPrefix, quote, squote
  Default:   default, required, empty
  Type:      toString, toInt, toFloat64
  Encoding:  b64enc, b64dec, toYaml, fromYaml, toJson
  Math:      add, sub, mul, div, mod, max, min
  Logic:     and, or, not, eq, ne, lt, gt, le, ge`,
      }
    ],
    quickFire: [
      { q: 'What is the difference between {{ include }} and {{ template }}?', a: '{{ template "name" . }} outputs directly and returns no value. {{ include "name" . }} returns a string that can be piped to functions like nindent and trim. Always use include in modern charts because nindent is almost always needed for correct YAML indentation.' },
      { q: 'Why is nindent used everywhere instead of indent?', a: 'indent adds n spaces to every line but does NOT add a leading newline. nindent adds a leading newline first, then indents all lines. Since include returns a multi-line string starting at the beginning of the output, calling | indent 4 without a leading newline produces invalid YAML indentation. nindent fixes this by ensuring the first line of the included content starts on its own indented line.' },
      { q: 'What does {{- do?', a: 'The hyphen trims all whitespace (spaces, tabs, newlines) to the left of the action. {{ expr -}} trims to the right. {{- expr -}} trims both sides. This is critical for YAML generation — stray blank lines and leading spaces can produce syntactically invalid YAML or semantically wrong manifests.' },
      { q: 'How do you make a block conditional on a values flag?', a: 'Wrap in {{- if .Values.feature.enabled }} ... {{- end }}. For resources with the condition, add enabled: false to values.yaml as the default, set it to true in the relevant environment values file.' },
      { q: 'What is required and when do you use it?', a: 'required "error message" .Values.someField causes helm install to fail with the given message if the value is empty or null. Use it for values that have no safe default and MUST be provided by the user (e.g., image repository, database host). It shifts the error from a running Pod failing to helm install failing with a clear message.' },
    ],
    introduction: `Helm templates are Go text/template files with two extensions: Sprig (a large library of utility functions) and Helm-specific functions and objects. The Go template engine renders these files against the merged values and built-in objects to produce Kubernetes YAML manifests.

The built-in objects divide into two groups. Release objects (.Release.Name, .Release.Namespace, .Release.Revision) describe the deployment context — who is deploying, where, at what revision. Chart objects (.Chart.Name, .Chart.Version) describe the chart metadata. .Values is the merged user configuration. .Capabilities gives access to Kubernetes cluster capabilities for feature detection. .Files allows reading non-template files bundled in the chart.

Pipelines are the most powerful idiom: {{ .Values.image.tag | default "latest" | quote }} chains default (provide a fallback) and quote (wrap in YAML quotes) left-to-right. Most template complexity comes from three control structures: if (conditionals), with (scope narrowing to avoid repetition), and range (iteration over lists and maps).

Whitespace control is the most common source of chart bugs. YAML is indentation-sensitive and Go templates emit whitespace literally. The {{- -}} hyphen trim syntax and the nindent function are non-negotiable for production charts. Missing a nindent produces valid Go template output that is invalid YAML.

Named templates (defined in _helpers.tpl with {{ define }}, called with {{ include }}) are the primary code-reuse mechanism. A well-structured chart defines all resource naming, labeling, and annotation logic in named templates and calls them from every resource template — ensuring consistency and making global changes (adding a standard annotation, changing the naming scheme) a one-line edit in _helpers.tpl.`,
    whenToUse: [
      'Writing any resource template that varies by environment or feature flag',
      'Creating standard label sets that must be consistent across all resources (define once in _helpers.tpl)',
      'Adding conditional resource blocks (Ingress, HPA, PodDisruptionBudget only when enabled)',
      'Iterating over user-supplied lists (extra environment variables, extra volume mounts, node selectors)',
    ],
    keyConcepts: [
      {
        term: 'Pipelines',
        definition: 'Chain of functions where each function receives the output of the previous as its last argument. {{ .Values.name | upper | trunc 63 | trimSuffix "-" }} — reads a name, uppercases it, truncates to 63 characters (Kubernetes label value limit), removes trailing hyphens. The standard pattern for resource naming.',
      },
      {
        term: 'nindent vs indent',
        definition: 'indent "4" adds 4 spaces to each line but no leading newline. nindent "4" adds a leading newline then indents. Use nindent with {{ include }} because the included content needs to start on a new indented line in the YAML output. Missing nindent is the most common whitespace bug.',
      },
      {
        term: 'Whitespace trimming ({{- / -}})',
        definition: '{{- trims all whitespace before the action (left trim). -}} trims all whitespace after the action (right trim). Critical for control structures like {{- if ... }} where the conditional block itself must not introduce blank lines or extra indentation into the rendered YAML.',
      },
      {
        term: 'with scope narrowing',
        definition: '{{ with .Values.resources }} ... {{ end }} sets . to .Values.resources inside the block. Avoids repeating .Values.resources.requests.cpu etc. If the value is empty/nil, the block is skipped entirely — {{ with }} combines nil-check and scope in one construct.',
      },
      {
        term: 'required function',
        definition: 'required "message" .Values.field causes helm install to fail immediately with the message if the value is empty or nil. Use for values that have no safe default and must be supplied. Shifts failures from runtime (Pod crashes with missing config) to install time (user gets a clear error).',
      },
      {
        term: 'tpl function',
        definition: 'Renders a string value as a Go template. {{ tpl .Values.configData . }} renders a values entry that contains template syntax like {{ .Release.Name }}. Powerful but dangerous: it means user-supplied values can contain arbitrary template code. Use only when explicitly needed for dynamic config generation.',
      },
    ],
    approach: [
      'Start with helm template myapp ./myapp and read the rendered YAML — understand what the templates produce',
      'Add a conditional Ingress: {{ if .Values.ingress.enabled }} ... {{ end }} and verify it appears/disappears with values',
      'Practice nindent: add a labels block using {{ include "myapp.labels" . | nindent 4 }} and verify indentation in rendered output',
      'Write a named template in _helpers.tpl and call it from two resource files — change it once and see the change reflected in both',
      'Use range to iterate over .Values.extraEnv (a list of name/value maps) and generate env entries',
      'Add required to a field that must be set: {{ required "image.repository is required" .Values.image.repository | quote }}',
    ],
    pitfalls: [
      'Using {{ template }} instead of {{ include }} — template cannot be piped, making nindent impossible',
      'Forgetting nindent when using include for multi-line named templates — produces invalid YAML indentation',
      'Missing {{- trim on if/end blocks — stray blank lines in YAML break multi-document configs',
      'Using toYaml without nindent for nested map values — produces YAML at column 0 inside an indented block',
      'Accessing .Values.key directly in a range block where . is now the list element — use $ to access root: $.Values.key',
      'Putting template logic in values.yaml strings and calling tpl without understanding the security implications',
    ],
    keyQuestions: [
      {
        question: 'Explain how named templates work in Helm and why {{ include }} is preferred over {{ template }}.',
        answer: `Named templates are reusable template snippets defined with {{ define "name" }} ... {{ end }} in any file starting with _ (conventionally _helpers.tpl). They are not rendered directly — only when called.

{{ template "name" . }}: evaluates the named template and outputs directly to the rendered file. Returns nothing (void). Cannot be piped.

{{ include "name" . }}: evaluates the named template and RETURNS it as a string. Can be piped to other functions.

Why include is always preferred:

  # Wrong — template cannot be piped to nindent:
  labels:
    {{ template "myapp.labels" . }}   # broken indentation

  # Correct — include returns a string, nindent fixes indentation:
  labels:
    {{- include "myapp.labels" . | nindent 4 }}

The nindent call adds a leading newline then indents all lines 4 spaces. Without nindent, the first line of the named template output starts at the column where include appears (after "labels:"), and subsequent lines are at column 0 — invalid YAML.

Scope: both {{ template }} and {{ include }} accept a second argument (.) that becomes the dot context inside the named template. Passing . gives the template access to .Values, .Release, and .Chart. You can also pass a subset: {{ include "myapp.helper" .Values.config }}.

Convention: helm create generates four named templates in _helpers.tpl — fullname, chart, labels, and selectorLabels. All generated resource templates call these. Extending this file for custom helpers is the standard Helm refactoring pattern.`,
      },
      {
        question: 'How do you handle a nested map value in a template, and what is the toYaml + nindent pattern?',
        answer: `Nested maps (resources, nodeSelector, tolerations, affinity, annotations) cannot be output with simple {{ .Values.resources }} — that would render the Go map representation, not YAML.

The pattern is toYaml | nindent:

  resources:
    {{- toYaml .Values.resources | nindent 4 }}

  # values.yaml:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi

  # Renders to:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi

Why nindent 4? After the resources: key at column 0, the nested content must be indented 2-4 spaces. nindent 4 adds a newline before the content and indents every line 4 spaces. Without the leading newline (using indent instead of nindent), the first key (requests:) would appear on the same line as resources: — invalid YAML.

The with pattern for optional maps:

  {{- with .Values.nodeSelector }}
  nodeSelector:
    {{- toYaml . | nindent 4 }}
  {{- end }}

{{ with }} sets . to .Values.nodeSelector inside the block AND skips the block entirely if the value is empty/nil. This is cleaner than {{ if .Values.nodeSelector }} ... {{ toYaml .Values.nodeSelector }} ... {{ end }} because you avoid repeating the long path.

Lists follow the same pattern:
  tolerations:
    {{- toYaml .Values.tolerations | nindent 8 }}`,
      },
      {
        question: 'How do you implement conditional resources and feature flags in a Helm chart?',
        answer: `The pattern is wrapping entire resource templates in an if block based on a values boolean:

  {{- if .Values.autoscaling.enabled -}}
  apiVersion: autoscaling/v2
  kind: HorizontalPodAutoscaler
  metadata:
    name: {{ include "myapp.fullname" . }}
  spec:
    scaleTargetRef:
      apiVersion: apps/v1
      kind: Deployment
      name: {{ include "myapp.fullname" . }}
    minReplicas: {{ .Values.autoscaling.minReplicas }}
    maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  {{- end }}

  # values.yaml default (disabled):
  autoscaling:
    enabled: false
    minReplicas: 2
    maxReplicas: 10

  # values-prod.yaml (enabled):
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 20

Conditional blocks within a resource (e.g., optional Ingress TLS):
  {{- if .Values.ingress.tls }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}

Compound conditions:
  {{- if and .Values.persistence.enabled (not .Values.persistence.existingClaim) }}

Platform engineering pattern: use a library chart that defines standard feature-flag named templates. Application charts call them with their specific values. This centralizes the conditional logic and ensures consistent behavior across the platform's chart collection.`,
      },
      {
        question: 'What are the most common Go templating mistakes and how do you debug them?',
        answer: `Most common mistakes:

1. Missing nindent after include:
   metadata:
     labels:
       {{ include "myapp.labels" . }}   # wrong — will produce invalid YAML
   Fix: {{- include "myapp.labels" . | nindent 4 }}

2. Stray whitespace from if/end blocks:
   {{if .Values.enabled}}
   key: value
   {{end}}
   Produces blank lines before and after. Fix: {{- if .Values.enabled }} and {{- end }}

3. Accessing root values inside range:
   {{- range .Values.items }}
   annotation: {{ .Values.globalAnnotation }}   # wrong — . is now the list item
   {{- end }}
   Fix: {{ $.Values.globalAnnotation }}  # $ always refers to root context

4. toYaml without nindent on a map value: outputs the map at column 0 inside an indented block.

5. Quoting number values that should be integers: using {{ .Values.port | quote }} produces "8080" (string) where 8080 (integer) is required by Kubernetes. Some fields require integer; quote produces a schema validation error.

Debugging tools:
  helm template myapp ./myapp --debug 2>&1 | head -100
    Shows template execution errors with file and line number.

  helm lint ./myapp
    Catches structural and schema errors.

  helm template ... | kubectl apply --dry-run=client -f -
    Validates rendered YAML against Kubernetes schema.

  Add {{ .Values | toYaml | nindent 0 }} to a template temporarily to inspect the full merged values object.

  fail function for assertions: {{ if not .Values.required.field }}{{ fail "required.field must be set" }}{{ end }}`,
      },
      {
        question: 'Explain the Sprig library and which functions are used most in production charts.',
        answer: `Sprig is a Go library of 100+ template functions that Helm adds to the Go template engine. Without Sprig, Go templates have only basic comparison and control flow. Sprig provides string manipulation, math, encoding, type conversion, date, cryptography, and data structure functions.

Most-used in production charts:

String functions:
  trunc 63           truncate to 63 chars (Kubernetes label value limit)
  trimSuffix "-"     remove trailing hyphen (common after trunc cuts mid-word)
  lower / upper      case normalization
  replace "." "-"    replace characters invalid in resource names
  contains "str"     string contains check
  hasPrefix / hasSuffix

Default and validation:
  default "value"    provide fallback if empty
  required "msg"     fail if empty with message
  empty              check if value is empty/nil/zero

Type conversion:
  toString           convert number to string
  toInt / toFloat64  convert string to number
  int                alias for toInt

YAML/JSON:
  toYaml             convert Go map/slice to YAML string (always used with nindent)
  fromYaml           parse YAML string to map
  toJson / fromJson  JSON equivalents

Encoding:
  b64enc / b64dec    base64 encode/decode (common for Secret data)
  sha256sum          SHA256 of a string (used for config checksums in annotations)

Logic:
  and / or / not     boolean operations in if conditions
  ternary true false val  ternary operator: if val then true else false

Most-used pattern combining multiple Sprig functions:
  name: {{ printf "%s-%s" .Release.Name .Chart.Name | lower | trunc 63 | trimSuffix "-" | quote }}`,
      },
      {
        question: 'How do you use the range action to iterate over a list and a map in Helm templates?',
        answer: `Iterating over a list:

  # values.yaml:
  extraEnv:
    - name: LOG_LEVEL
      value: debug
    - name: FEATURE_FLAG
      value: "true"

  # template:
  env:
    {{- range .Values.extraEnv }}
    - name: {{ .name | quote }}
      value: {{ .value | quote }}
    {{- end }}

Inside the range block, . becomes each list element. Access its fields with .fieldname.

Iterating over a map:

  # values.yaml:
  nodeSelector:
    kubernetes.io/os: linux
    node-type: compute

  # template:
  nodeSelector:
    {{- range $key, $val := .Values.nodeSelector }}
    {{ $key }}: {{ $val | quote }}
    {{- end }}

With maps, use the $key, $val := pattern. The variable $key and $val are explicitly declared and scoped to the range block.

Accessing root context inside range:
Inside range, . is the current element. To access .Values or .Release use $ (root context):

  {{- range .Values.volumes }}
  - name: {{ .name }}
    configMap:
      name: {{ $.Release.Name }}-config   # $ accesses root
  {{- end }}

Range with index:
  {{- range $i, $item := .Values.items }}
  - index: {{ $i }}
    value: {{ $item.value }}
  {{- end }}

Tuple for small lists:
  {{- range list "app" "worker" "scheduler" }}
  - component: {{ . }}
  {{- end }}`,
      },
    ],
    references: [
      'https://helm.sh/docs/chart_template_guide/',
      'https://helm.sh/docs/chart_template_guide/function_list/',
      'https://masterminds.github.io/sprig/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 5. Values and Overrides
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'helm-values-overrides',
    title: 'Values and Overrides',
    icon: 'sliders',
    color: '#7c3aed',
    questions: 5,
    description: 'Layering values files and --set overrides, managing per-environment configuration cleanly, and validating inputs with values.schema.json.',
    visualizations: [
      {
        title: 'Values layering, precedence, and schema validation',
        image: '/diagrams/devops/helm-5-values.png',
        description: `Values precedence (lowest to highest):
  1. values.yaml in the chart (chart defaults)
  2. Parent chart values for sub-chart (when used as a dependency)
  3. -f / --values files, applied left to right (last file wins per key)
  4. --set, --set-string, --set-json, --set-file flags

Example: layered values for three environments:
  values.yaml          # chart defaults — safe for any environment
  values-dev.yaml      # dev overrides only what differs
  values-staging.yaml  # staging overrides
  values-prod.yaml     # prod overrides

Install commands:
  dev:     helm upgrade --install myapp ./chart -f values.yaml -f values-dev.yaml
  prod:    helm upgrade --install myapp ./chart -f values.yaml -f values-prod.yaml -n prod

Multiple -f flags merge deeply (not replace). If both files set image.tag but different values,
the rightmost file wins. If they set different keys, both are present.

--set syntax for nested and complex values:
  --set image.tag=v1.4.2
  --set replicaCount=3
  --set ingress.hosts[0].host=myapp.example.com     # array index
  --set ingress.hosts[0].paths[0].path=/            # nested array
  --set "annotations.kubernetes\\.io/tls=true"      # escaped dots in keys
  --set-string port=8080                            # force string type even for numbers
  --set-json 'tolerations=[{"key":"spot","effect":"NoSchedule"}]'  # raw JSON
  --set-file configData=./my-config.yaml            # read file content as string value

Checking what values are active on a running release:
  helm get values <release>          # user-supplied values only
  helm get values <release> --all    # all values including chart defaults

Retrieving current values for upgrade (common pattern):
  helm get values myapp -o yaml > current-values.yaml
  # edit current-values.yaml, then:
  helm upgrade myapp ./chart -f current-values.yaml

values.schema.json — JSON Schema validation:
  Validated on: helm install, helm upgrade, helm lint, helm template
  Bypass: --skip-schema-validation

  Useful constraints:
    required array:            ensures keys are always provided
    type: integer/string/bool: catches --set port=8080 when 8080 is expected as integer
    enum: [ClusterIP, NodePort, LoadBalancer]:   validates service type
    minimum / maximum:         numeric range for replica count or timeout
    pattern: "^[a-z][-a-z0-9]*$":  validates Kubernetes-safe names`,
      }
    ],
    quickFire: [
      { q: 'What is the highest precedence values source in Helm?', a: '--set (and --set-string, --set-json, --set-file) CLI flags have the highest precedence. They override everything — values.yaml and all -f files. In CI, --set image.tag=$CI_COMMIT_SHA is the standard pattern for injecting the build tag at deploy time.' },
      { q: 'How do multiple -f flags interact?', a: 'They are deep-merged left to right. Each -f file is merged on top of the previous. If the same key appears in multiple files, the rightmost file wins. Different keys coexist without conflict. This enables the base + environment overlay pattern: -f values.yaml -f values-prod.yaml.' },
      { q: 'How do you extract the current values from a running release for a safe upgrade?', a: 'helm get values <release> -o yaml > current.yaml, edit, then helm upgrade <release> ./chart -f current.yaml. This pattern avoids losing values that were set with --set in a previous install (those are stored in the release Secret).' },
      { q: 'What is --set-json useful for?', a: 'Setting array or complex object values that are difficult to express with --set\'s dot-path syntax. Example: --set-json \'tolerations=[{"key":"spot","operator":"Exists","effect":"NoSchedule"}]\' sets a complete tolerations array. Without --set-json you would need multiple --set ingress.hosts[0].paths[0].path=/ flags with escaped characters.' },
      { q: 'What triggers values.schema.json validation?', a: 'helm install, helm upgrade, helm lint, and helm template all validate values against the schema. Values that fail schema validation cause the command to fail before any cluster changes are made. The error message includes the JSON Schema validation error with the path to the failing field.' },
    ],
    introduction: `Values are Helm's configuration layer: the mechanism by which one chart serves many environments and use cases without duplicating templates. Understanding values layering, precedence, and best practices for structuring multi-environment configuration is core to effective Helm use.

The key insight is that values merge, not replace. When you provide multiple -f files, Helm deep-merges them left to right. The result is a single merged values map that templates render against. This means your base values.yaml defines safe defaults for every environment, and environment-specific files contain only what differs — reducing drift and making diffs meaningful.

The four override mechanisms have a strict precedence order: chart defaults (values.yaml) are the lowest precedence. Parent chart values for sub-charts come next. Then -f files in left-to-right order. Then CLI --set flags at the highest precedence. In CI/CD, the standard pattern is: -f values.yaml -f values-\${ENV}.yaml with --set image.tag=\${BUILD_SHA} to pin the exact image at deploy time.

Schema validation via values.schema.json (JSON Schema draft-07) is a feature many charts omit but all public charts should use. It shifts configuration errors from runtime (misconfigured Pod crashes 5 minutes after deploy) to install time (helm install fails immediately with a clear message). For platform teams distributing internal charts, schema validation prevents the class of "wrong values applied to wrong environment" incidents that are otherwise difficult to detect.`,
    whenToUse: [
      'Designing the configuration surface for a new chart: decide what belongs in values.yaml vs what gets hardcoded',
      'Setting up multi-environment deploys: one chart, three values files (dev/staging/prod)',
      'Debugging a release with unexpected behavior: helm get values to see what is actually configured',
      'Adding input validation to a chart: values.schema.json for type checking, required fields, and enum constraints',
    ],
    keyConcepts: [
      {
        term: 'Values precedence order',
        definition: 'Lowest to highest: chart values.yaml defaults, sub-chart parent values, -f files (left-to-right), --set flags. The rightmost source wins on conflicts. Values from all sources are deep-merged, not replaced wholesale.',
      },
      {
        term: '--set vs -f',
        definition: '--set is for point overrides at deploy time (image tag, replica count). -f is for structured environment files. Avoid using --set for complex nested structures — use --set-json or -f. Store --set values in the release Secret, but they are easy to lose track of when inspecting deployments.',
      },
      {
        term: 'helm get values vs helm get values --all',
        definition: 'helm get values shows only user-supplied overrides (not chart defaults). helm get values --all shows the complete merged values including chart defaults. Use --all when debugging to see the full effective configuration.',
      },
      {
        term: 'Deep merge semantics',
        definition: 'When multiple -f files are merged, nested maps are merged recursively. A staging values file can set image.tag without affecting image.repository from the base values.yaml. Only conflicting leaf values are overwritten.',
      },
      {
        term: 'values.schema.json',
        definition: 'JSON Schema (draft-07) file at chart root. Validated on install, upgrade, lint, and template. Enforces types, required fields, enums, patterns, and numeric ranges. Shifts errors from runtime Pod failures to install-time validation errors.',
      },
    ],
    approach: [
      'Design values.yaml with safe defaults for every key: non-zero replica count, sane resource requests, disabled optional features',
      'Create environment files (values-dev.yaml, values-prod.yaml) containing only keys that differ from defaults',
      'Use helm get values --all on a running release to see the full effective configuration',
      'Add values.schema.json after the chart matures: add types for all keys, mark required fields, add enums for fixed-choice fields',
      'In CI, use --set image.tag=$BUILD_SHA as the only --set flag; put everything else in values files committed to Git',
    ],
    pitfalls: [
      'Using --set for more than 2-3 values in CI — long --set chains in CI commands are hard to read and audit',
      'Storing secrets in values.yaml or -f files committed to Git — use helm-secrets, SOPS, or External Secrets Operator instead',
      'Relying on --set for values needed in rollback — helm rollback replays the stored manifests, not your current --set flags',
      'Forgetting that helm get values without --all omits chart defaults — leads to confusion about what is actually active',
      'Not adding values.schema.json to distributed charts — type mismatches manifest as runtime failures that users have to debug',
    ],
    keyQuestions: [
      {
        question: 'How would you structure values files for a service deployed to dev, staging, and production?',
        answer: `Structure:

  chart/
  ├── values.yaml          # chart defaults — safe for all environments
  ├── values-dev.yaml      # dev overrides
  ├── values-staging.yaml  # staging overrides
  └── values-prod.yaml     # prod overrides

values.yaml (chart defaults):
  replicaCount: 1
  image:
    repository: ghcr.io/myorg/myapp
    pullPolicy: IfNotPresent
    tag: ""              # required by schema, set at deploy time via --set
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
  autoscaling:
    enabled: false
  ingress:
    enabled: false

values-dev.yaml:
  replicaCount: 1
  resources:
    requests:
      cpu: 50m
      memory: 64Mi

values-staging.yaml:
  replicaCount: 2
  ingress:
    enabled: true
    hosts:
      - host: staging.myapp.example.com

values-prod.yaml:
  replicaCount: 5
  autoscaling:
    enabled: true
    minReplicas: 5
    maxReplicas: 20
  ingress:
    enabled: true
    hosts:
      - host: myapp.example.com
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 2000m
      memory: 2Gi

Deploy:
  helm upgrade --install myapp ./chart -f values.yaml -f values-prod.yaml --set image.tag=$SHA -n prod --atomic

This structure keeps environment differences explicit and minimal. Any reviewer can diff values-prod.yaml against values-staging.yaml to understand exactly what differs between environments.`,
      },
      {
        question: 'How do you handle secrets in Helm values without committing them to Git?',
        answer: `Three patterns, in order of sophistication:

1. helm-secrets + SOPS (most common for teams already using Git):
helm-secrets is a Helm plugin that integrates with SOPS (Mozilla). SOPS encrypts specific values in a values file using AWS KMS, GCP KMS, Azure Key Vault, or age/GPG keys. The encrypted file is committed to Git; SOPS decrypts at deploy time using IAM role credentials.

  helm secrets upgrade myapp ./chart -f values.yaml -f secrets.yaml
  # secrets.yaml is encrypted by SOPS, decrypted transparently by helm-secrets

2. External Secrets Operator (most cloud-native):
ExternalSecret CRD watches AWS Secrets Manager / GCP Secret Manager / Vault and creates/syncs Kubernetes Secrets. Your Helm chart references the Secret by name (which ESO creates). No secret values ever appear in Helm values files or Git.

  # In the chart template, reference a Secret created by ESO:
  envFrom:
    - secretRef:
        name: {{ include "myapp.fullname" . }}-secrets

3. --set from CI secret (simple, less auditable):
  helm upgrade myapp ./chart --set database.password=$DB_PASSWORD
  # DB_PASSWORD is a CI/CD secret variable, never in Git

What NOT to do:
- values-prod.yaml with plaintext secrets committed to Git
- Kubernetes Secret manifests in the chart templates/ with hardcoded values
- Base64-encoded values in values.yaml (base64 is encoding, not encryption)

Interview answer: the correct answer is "secrets don't belong in values files." Use ESO for cloud-native environments, SOPS+helm-secrets for teams with existing secret management tooling, or CI-injected --set as a minimum. The choice depends on the team's secret management strategy and compliance requirements.`,
      },
      {
        question: 'Describe how values.schema.json improves chart reliability.',
        answer: `values.schema.json is a JSON Schema (draft-07) file that validates all user-supplied and default values before any templates are rendered or any cluster changes are made.

What it catches:

Type errors:
  User sets --set replicaCount=two (string where integer expected)
  Schema: "replicaCount": { "type": "integer", "minimum": 1 }
  Result: helm install fails immediately with a clear error

Missing required fields:
  User forgets to set image.repository
  Schema: "required": ["image"], "image": { "required": ["repository", "tag"] }
  Result: helm install fails with "image.repository is required"

Invalid enum values:
  User sets service.type=LoadBlancer (typo)
  Schema: "type": { "enum": ["ClusterIP", "NodePort", "LoadBalancer"] }
  Result: helm install fails with enum validation error

Range constraints:
  User sets autoscaling.maxReplicas=1 with minReplicas=3
  Schema: custom validation or minimum constraint
  Result: fails at install time rather than HPA rejecting it

Without schema validation, these errors manifest as:
- Pod fails to start because image repository is wrong
- HPA rejected by Kubernetes API because minReplicas > maxReplicas
- Service type typo causes kubectl apply rejection but only after templates render

When validated: install, upgrade, lint, template — all four trigger schema validation.

Bypass: --skip-schema-validation for air-gapped environments or legacy compatibility.

Platform engineering value: when distributing internal charts to 10 application teams, schema validation prevents "wrong values applied" incidents. A PR review of values-prod.yaml is much more effective when the schema enforces what those values mean.`,
      },
      {
        question: 'How do you debug a release where the running behavior does not match your expected values?',
        answer: `Systematic investigation:

Step 1: Check what values Helm actually used:
  helm get values <release> -n <namespace>          # user-supplied only
  helm get values <release> -n <namespace> --all    # all including defaults

If --set was used at install time, those values appear here. Compare against your values files.

Step 2: Check the rendered manifests:
  helm get manifest <release> -n <namespace>

This shows the YAML that was actually applied. Compare specific fields against what you expect. If the manifest has the right values but the Pod is behaving differently, the issue is drift (someone edited the Pod outside Helm) or a Kubernetes admission webhook modified the manifest on apply.

Step 3: Check for drift (out-of-band changes):
  kubectl get deployment <name> -o yaml -n <namespace>

Compare the kubectl output with helm get manifest. Fields differ? Something modified the resource after Helm applied it. Common culprits: Kyverno/OPA mutating webhooks adding sidebars or annotations, ArgoCD or another controller reconciling, or a human ran kubectl edit.

Step 4: Re-render with current values:
  helm template <release> ./chart -f values.yaml -f values-prod.yaml --set image.tag=<current-tag>

Compare the output against helm get manifest. Any difference reveals what changed between the last helm upgrade and now (chart update, values file change, --set change).

Step 5: Check release history for upgrade errors:
  helm history <release> -n <namespace>

Look for FAILED revisions. A failed upgrade can leave some resources at the new version and some at the old version — the most confusing state to debug.

Summary: helm get values -> helm get manifest -> kubectl get -o yaml -> helm template -> helm history. Each step narrows the gap between "what Helm thinks it deployed" and "what is actually running."`,
      },
      {
        question: 'What is the difference between --set, --set-string, --set-json, and --set-file?',
        answer: `All four are CLI flags that override values at highest precedence. They differ in how they handle the value type:

--set key=value: standard override. Helm infers the type: numbers become integers, "true"/"false" become booleans, everything else is a string. Problem: --set port=8080 sets an integer; if the template expects a string (for ConfigMap data), this causes type mismatch.

--set-string key=value: forces the value to be a string regardless of content. --set-string port=8080 sets "8080" as a string. Use when a field must be a string even if it looks like a number or boolean.

--set-json key=jsonValue: sets the value by parsing raw JSON. Useful for arrays and complex objects:
  --set-json 'tolerations=[{"key":"spot","effect":"NoSchedule"}]'
  --set-json 'config={"timeout":30,"retries":3}'
Without --set-json, setting an array requires verbose index notation: --set tolerations[0].key=spot --set tolerations[0].effect=NoSchedule

--set-file key=filepath: reads a file's content as the string value. Useful for long config strings, certificates, or scripts:
  --set-file configData=./application.properties
  --set-file tlsCert=./certs/tls.crt

When to use each:
- --set: simple scalar overrides (image tag, replica count, feature flags)
- --set-string: values that look like numbers but must be strings (port numbers in ConfigMap data, version strings like "1.0" that would be parsed as floats)
- --set-json: arrays, objects, or structured values
- --set-file: file content injection without base64-encoding manually

For more than 2-3 overrides: use a values file instead of chaining --set flags. Long --set chains in CI commands are fragile and hard to review.`,
      },
    ],
    references: [
      'https://helm.sh/docs/chart_template_guide/values_files/',
      'https://helm.sh/docs/topics/charts/#schema-files',
      'https://helm.sh/docs/helm/helm_get_values/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 6. Chart Dependencies
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'helm-chart-dependencies',
    title: 'Chart Dependencies',
    icon: 'gitBranch',
    color: '#7c3aed',
    questions: 4,
    description: 'Declaring and managing sub-chart dependencies in Chart.yaml, running helm dependency update, aliasing sub-charts, and conditionally enabling them.',
    visualizations: [
      {
        title: 'Helm chart dependency model and sub-chart values',
        image: '/diagrams/devops/helm-6-dependencies.png',
        description: `Declaring dependencies in Chart.yaml (apiVersion: v2 required):

  dependencies:
    - name: postgresql
      version: "13.2.0"
      repository: "oci://registry-1.docker.io/bitnamicharts"
      condition: postgresql.enabled      # values path to boolean
      alias: db                          # override sub-chart name in namespace

    - name: redis
      version: "18.4.0"
      repository: "oci://registry-1.docker.io/bitnamicharts"
      condition: redis.enabled

    - name: common
      version: "2.x.x"                  # semver range
      repository: "oci://registry-1.docker.io/bitnamicharts"
      tags:
        - infrastructure                 # group-based enable/disable

Fetching dependencies:
  helm dependency update ./mychart
  # Downloads sub-charts into charts/ as .tgz files
  # Generates Chart.lock with exact resolved versions

  helm dependency list ./mychart
  # Shows dependencies and their status (ok / missing / wrong version)

  helm dependency build ./mychart
  # Uses Chart.lock to restore exact versions (like npm ci)

charts/ directory after update:
  charts/
  ├── postgresql-13.2.0.tgz
  ├── redis-18.4.0.tgz
  └── common-2.19.0.tgz

Sub-chart values — nested under the sub-chart name:
  # values.yaml
  postgresql:
    enabled: true
    auth:
      username: myapp
      database: myappdb
    primary:
      persistence:
        size: 10Gi

  redis:
    enabled: false    # condition: redis.enabled disables this sub-chart

Aliasing — use the same chart twice with different configs:
  dependencies:
    - name: postgresql
      alias: primary-db
      version: "13.2.0"
      repository: "oci://..."
    - name: postgresql
      alias: replica-db
      version: "13.2.0"
      repository: "oci://..."

  # values.yaml — scoped under alias:
  primary-db:
    auth:
      username: writer
  replica-db:
    auth:
      username: reader

Kubernetes object install order:
  All Kubernetes objects from parent + all sub-charts are aggregated, sorted by
  kind (Namespace -> RBAC -> CRD -> ConfigMap -> Secret -> Service -> Deployment),
  then applied in that order.`,
      }
    ],
    quickFire: [
      { q: 'What does helm dependency update do?', a: 'Downloads all dependencies declared in Chart.yaml into the charts/ directory as .tgz files and writes Chart.lock with the exact resolved versions. Must be run before helm install ./chart when working with a chart locally. helm dependency build uses the lockfile to restore exact versions without resolving ranges.' },
      { q: 'What is the difference between condition and tags on a dependency?', a: 'condition is a dot-path to a boolean in values (e.g., postgresql.enabled) — it enables/disables one specific dependency. tags is a list of strings; a dependency with tags: [infra] is enabled when .Values.tags.infra is true. Tags group multiple related sub-charts that are enabled/disabled together.' },
      { q: 'How do you pass configuration to a sub-chart?', a: 'Values for a sub-chart are nested under the sub-chart\'s name (or alias) in the parent values.yaml. If the dependency is named postgresql, its values live under postgresql: in the parent values file. These values override the sub-chart\'s own values.yaml defaults.' },
      { q: 'What is aliasing and why is it useful?', a: 'Aliasing lets you declare the same chart as a dependency twice with different names. In values.yaml, each alias gets its own namespace. This is the pattern for primary/replica database setups (two PostgreSQL instances with different configurations) or multi-region deployments.' },
      { q: 'What is Chart.lock and should it be committed to Git?', a: 'Chart.lock is the lockfile produced by helm dependency update. It records the exact chart versions resolved for each dependency (important when version ranges like "13.x.x" are used). Yes, commit Chart.lock to Git — it ensures reproducible builds across the team. helm dependency build restores exactly the locked versions without re-resolving ranges.' },
    ],
    introduction: `Helm chart dependencies allow composing complex applications from multiple charts. Instead of copying a PostgreSQL or Redis chart into your application, you declare it as a dependency and let Helm manage fetching and lifecycle.

Dependencies are declared in Chart.yaml under the dependencies key (requires apiVersion: v2). The critical workflow is helm dependency update, which downloads declared charts into charts/ as .tgz archives and generates Chart.lock with the exact resolved versions. The lockfile is essential for reproducibility: with version ranges like ">=13.0.0 <14.0.0", different runs might resolve to different patch versions without the lockfile.

The values architecture for dependencies is clean: sub-chart configuration is nested under the sub-chart name (or alias) in the parent values.yaml. This scoping prevents name collisions between parent and sub-chart values and makes it clear which configuration belongs to which component.

Two advanced features matter in production: conditional dependencies (enabled/disabled based on a values boolean) and aliasing (using the same chart multiple times with different configurations). Conditional dependencies are the mechanism for optional components — bundling PostgreSQL with your application chart but making it optional for clusters that use a managed database. Aliasing enables patterns like primary/replica databases or multi-region configurations from a single chart.`,
    whenToUse: [
      'Bundling a database, cache, or messaging component with an application chart for self-contained deploys',
      'Creating an umbrella chart that composes multiple microservices for a development environment',
      'Optional infrastructure components: include PostgreSQL as a dependency but disable it in production (use RDS instead)',
      'Reusing library charts that provide shared named templates across a platform\'s chart collection',
    ],
    keyConcepts: [
      {
        term: 'helm dependency update',
        definition: 'Downloads all Chart.yaml dependencies into charts/ as .tgz archives and writes Chart.lock. Must be run before installing a chart with declared dependencies. Resolves version ranges to specific versions.',
      },
      {
        term: 'helm dependency build',
        definition: 'Restores dependencies from Chart.lock without re-resolving ranges. Use in CI where reproducibility matters. Equivalent to npm ci vs npm install.',
      },
      {
        term: 'Chart.lock',
        definition: 'Lockfile produced by helm dependency update recording exact resolved versions for all dependencies. Commit to Git for reproducible builds. Should be regenerated when dependency versions in Chart.yaml change.',
      },
      {
        term: 'condition vs tags',
        definition: 'condition is a single dot-path to a boolean value — enables/disables one dependency. tags is a list of strings that can enable/disable groups of related dependencies together. Both support the "optional component" pattern.',
      },
      {
        term: 'Alias',
        definition: 'The alias field on a dependency overrides the sub-chart name in the values namespace. Enables using the same chart multiple times with different configurations (e.g., primary-db and replica-db, both pointing to the PostgreSQL chart).',
      },
    ],
    approach: [
      'Add the dependency to Chart.yaml with name, version (pinned or range), and repository',
      'Run helm dependency update to populate charts/ and generate Chart.lock',
      'Add the sub-chart configuration to values.yaml nested under the dependency name',
      'Test with helm template — verify the sub-chart resources appear in the rendered output',
      'Add a condition field and a matching .Values.postgresql.enabled: false default to make the dependency optional',
      'Commit Chart.lock to Git; never commit the charts/ .tgz files themselves (add to .helmignore)',
    ],
    pitfalls: [
      'Forgetting to run helm dependency update before helm install — chart installs but sub-charts are absent',
      'Committing charts/ .tgz files to Git — binary blobs inflate repository size; use helm dependency build in CI instead',
      'Not committing Chart.lock — different developers or CI runs resolve to different sub-chart versions',
      'Configuring sub-chart values at the wrong nesting level — PostgreSQL config must be under postgresql:, not at root level',
    ],
    keyQuestions: [
      {
        question: 'How do you conditionally include a sub-chart dependency based on environment?',
        answer: `Use the condition field in Chart.yaml to point to a values path that controls enablement:

  # Chart.yaml
  dependencies:
    - name: postgresql
      version: "13.2.0"
      repository: "oci://registry-1.docker.io/bitnamicharts"
      condition: postgresql.enabled

  # values.yaml (default: enabled for local dev)
  postgresql:
    enabled: true
    auth:
      username: myapp
      database: myappdb

  # values-prod.yaml (disabled: use external RDS instead)
  postgresql:
    enabled: false

When postgresql.enabled is false, Helm skips the sub-chart entirely — none of its templates are rendered or applied. The parent chart still accesses the database; it just expects the connection string to point to an external instance configured via the parent chart's own values.

Tags alternative: when multiple sub-charts should toggle together, use tags:

  # Chart.yaml
  dependencies:
    - name: postgresql
      tags: [local-infra]
      ...
    - name: redis
      tags: [local-infra]
      ...

  # values.yaml
  tags:
    local-infra: true   # enables all deps tagged local-infra

  # values-prod.yaml
  tags:
    local-infra: false  # disables all of them together

The condition approach is better when each component has independent enablement. The tags approach is better when a group of related components always enable/disable together.`,
      },
      {
        question: 'What happens to sub-chart resources during helm upgrade and rollback?',
        answer: `During upgrade: Helm aggregates resources from all enabled sub-charts and the parent chart into a single resource set. It sorts by Kubernetes object type (Namespace, RBAC, CRDs first; workloads last) and applies changes. Sub-chart resources are upgraded alongside parent resources in the same operation. There is no separate "upgrade the sub-chart" step.

Revision tracking: sub-chart resources are included in the parent release's revision. helm get manifest <parent-release> shows ALL resources including sub-chart resources. The revision counter belongs to the parent release.

During rollback: helm rollback restores the exact manifests from the target revision for ALL resources — parent and sub-charts combined. If revision 3 used postgresql version 13.2.0 and revision 4 used 13.3.0, rolling back to revision 3 restores the postgresql 13.2.0 manifests. Whether the rolling-back PostgreSQL StatefulSet causes data loss is a separate concern from Helm's rollback mechanics.

Sub-chart version upgrade: changing the sub-chart version in Chart.yaml, running helm dependency update, and running helm upgrade creates a new revision where the sub-chart resources reflect the new chart version.

CRD caveat: if a sub-chart includes CRDs (in its own crds/ directory), those CRDs are subject to the same constraints as parent chart CRDs — never deleted on uninstall, never automatically upgraded. Upgrading a sub-chart that ships breaking CRD changes requires manual CRD migration first.

Interview signal: understanding that sub-charts are fully integrated into the parent release lifecycle (not separately tracked) is the key insight. Helm has no per-sub-chart release concept — it's always one release per helm install.`,
      },
      {
        question: 'How do you use aliasing to run the same chart twice with different configurations?',
        answer: `Aliasing is the mechanism for running multiple instances of the same chart as sub-charts of a parent chart. The alias field overrides the dependency name in the values namespace:

  # Chart.yaml
  dependencies:
    - name: postgresql
      alias: primary-db
      version: "13.2.0"
      repository: "oci://registry-1.docker.io/bitnamicharts"
    - name: postgresql
      alias: replica-db
      version: "13.2.0"
      repository: "oci://registry-1.docker.io/bitnamicharts"

  # values.yaml — each instance configured independently
  primary-db:
    auth:
      username: writer
      password: writersecret
      database: myapp
    primary:
      persistence:
        size: 100Gi

  replica-db:
    auth:
      username: reader
      password: readersecret
      database: myapp
    readReplicas:
      replicaCount: 2
      persistence:
        size: 100Gi

Each aliased instance creates separate Kubernetes resources with the alias prefix in resource names, preventing name collisions.

Common use cases:
- Primary/replica database setup within a single chart
- Running two Redis instances (session cache and job queue)
- Multi-region configurations where region-specific settings differ
- Development environment with multiple databases for different microservices

Limitation: all aliased instances must be the same version. For different versions, use separate charts.`,
      },
      {
        question: 'Explain the Helm object install order and why it matters for dependencies.',
        answer: `When helm install renders all resources from the parent chart and all sub-charts, it aggregates them into a single sorted list before applying to Kubernetes. The sort order is:

  Namespace
  NetworkPolicy
  ResourceQuota
  LimitRange
  PodSecurityPolicy (deprecated, still sorted)
  PodDisruptionBudget
  ServiceAccount
  Secret
  SecretList
  ConfigMap
  StorageClass
  PersistentVolume
  PersistentVolumeClaim
  CustomResourceDefinition (crds/ directory, applied even earlier)
  ClusterRole / ClusterRoleList / ClusterRoleBinding / ClusterRoleBindingList
  Role / RoleList / RoleBinding / RoleBindingList
  Service
  DaemonSet
  Pod
  ReplicationController / ReplicaSet
  Deployment
  StatefulSet
  Job / CronJob
  Ingress
  APIService

Why this matters for dependencies:

1. Namespaces are created before workloads.
2. RBAC is applied before workloads — ServiceAccount referenced by a Deployment exists before the Deployment is applied.
3. Secrets and ConfigMaps before Deployments — environment variables that reference Secrets will resolve when the Pod spec is applied.
4. Services before Deployments — the Service object exists before the Pods try to connect to it.

Hooks override this order: pre-install hooks run BEFORE any non-hook resources are applied. This is why pre-install hooks are used for database schema migrations — you need the database schema applied before the application Deployment comes up.

For platform engineers: understanding the install order explains why Helm generally "just works" for simple dependencies but why pre-install hooks are needed for stateful coordination requirements.`,
      },
    ],
    references: [
      'https://helm.sh/docs/topics/charts/#chart-dependencies',
      'https://helm.sh/docs/helm/helm_dependency/',
      'https://helm.sh/docs/topics/library_charts/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 7. Repositories and OCI Distribution
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'helm-repositories-oci',
    title: 'Repositories and OCI Distribution',
    icon: 'archive',
    color: '#7c3aed',
    questions: 4,
    description: 'Classic HTTP chart repositories vs modern OCI registries (ECR, GHCR, ACR, GAR, Harbor). Pushing, pulling, and installing charts as OCI artifacts.',
    visualizations: [
      {
        title: 'Classic chart repos vs OCI registry distribution',
        image: '/diagrams/devops/helm-7-oci.png',
        description: `Classic chart repository (HTTP-based, legacy):
  helm repo add stable https://charts.helm.sh/stable
  helm repo add bitnami https://charts.bitnami.com/bitnami
  helm repo update                          # refresh local index
  helm search repo postgresql               # search across all added repos
  helm install my-pg bitnami/postgresql --version 13.2.0

  Repository structure: serves index.yaml (chart index) + .tgz chart archives over HTTP.
  Helm caches the index.yaml locally. Classic repos require hosting infrastructure.

OCI registry distribution (modern, GA in Helm 3.8):
  Supported registries:
    Amazon ECR
    Azure Container Registry (ACR)
    Google Artifact Registry (GAR)
    Docker Hub
    GitHub Container Registry (GHCR)
    Harbor
    JFrog Artifactory
    Cloudsmith
    RepoFlow

  Authenticate:
    helm registry login ghcr.io -u $GITHUB_USER -p $GITHUB_TOKEN
    helm registry login <account>.dkr.ecr.<region>.amazonaws.com \
      -u AWS -p $(aws ecr get-login-password)

  Package:
    helm package ./mychart                   # produces mychart-1.4.2.tgz

  Push:
    helm push mychart-1.4.2.tgz oci://ghcr.io/myorg/charts
    # Chart name becomes basename of registry path
    # Chart version becomes the OCI tag

  Pull:
    helm pull oci://ghcr.io/myorg/charts/mychart --version 1.4.2
    helm pull oci://ghcr.io/myorg/charts/mychart --version 1.4.2 --untar

  Install directly from OCI (no helm repo add needed):
    helm install myapp oci://ghcr.io/myorg/charts/mychart --version 1.4.2

  Install by digest (immutable reference):
    helm install myapp oci://ghcr.io/myorg/charts/mychart@sha256:abc123...

  Show chart metadata:
    helm show chart oci://ghcr.io/myorg/charts/mychart --version 1.4.2
    helm show values oci://ghcr.io/myorg/charts/mychart --version 1.4.2

OCI manifest structure for a Helm chart:
  mediaType: application/vnd.oci.image.manifest.v1+json
  config: application/vnd.cncf.helm.config.v1+json
  layers:
    - application/vnd.cncf.helm.chart.content.v1.tar+gzip  (chart archive)
    - application/vnd.cncf.helm.chart.provenance.v1.prov   (signature, optional)`,
      }
    ],
    quickFire: [
      { q: 'What replaced classic chart repositories in modern Helm?', a: 'OCI registries. Since Helm 3.8, charts are pushed and pulled as OCI artifacts using the oci:// scheme. Any OCI-compliant registry (ECR, GHCR, ACR, GAR, Harbor, Docker Hub) can serve Helm charts. OCI support is GA and the recommended distribution method. Classic HTTP repos are still supported but require dedicated hosting (a web server serving index.yaml and .tgz files).' },
      { q: 'How do you push a chart to GHCR?', a: 'Three steps. First package: helm package ./mychart (produces mychart-1.4.2.tgz). Then authenticate: helm registry login ghcr.io -u $USER -p $TOKEN. Then push: helm push mychart-1.4.2.tgz oci://ghcr.io/myorg/charts. The chart is accessible at oci://ghcr.io/myorg/charts/mychart:1.4.2.' },
      { q: 'Do OCI-based charts need helm repo add?', a: 'No. helm repo add is for classic HTTP repositories. OCI charts are referenced directly with oci:// in helm install, helm pull, helm show. The registry is authenticated with helm registry login.' },
      { q: 'What is a chart digest and when is it useful?', a: 'The SHA256 content digest of the OCI manifest (e.g., sha256:abc123...). Unlike a version tag, a digest is immutable — it cannot be retagged or overwritten. Installing via digest (helm install myapp oci://registry/chart@sha256:abc) provides supply chain guarantees: you get exactly the same bits every time, even if the tag is later moved.' },
      { q: 'Why is publishing provenance alongside an OCI chart important?', a: 'When helm push uploads a .tgz, it automatically uploads the companion .prov provenance file as an additional OCI layer. Recipients can run helm pull --verify to validate the signature against their keyring. This proves the chart was signed by the expected publisher and was not tampered with after signing.' },
    ],
    introduction: `Helm chart distribution has evolved from a custom HTTP-based index/archive format (classic chart repositories) to modern OCI registries. OCI (Open Container Initiative) registry support was added in Helm 3.8 and reached GA status — today it is the recommended distribution method for Helm charts.

Classic chart repositories serve an index.yaml file and .tgz chart archives over HTTP. You add them with helm repo add, search with helm search repo, and install with bitnami/postgresql syntax. They require dedicated hosting infrastructure and separate tooling to generate and publish the index.

OCI registries require no additional infrastructure: any OCI-compliant registry (Amazon ECR, Azure Container Registry, Google Artifact Registry, GitHub Container Registry, Harbor, Docker Hub, JFrog Artifactory, Cloudsmith) natively stores Helm charts alongside container images. Charts are pushed with helm push and installed with the oci:// scheme directly — no helm repo add step needed.

The OCI approach unlocks significant advantages: immutable references by digest (sha256:abc123) guarantee supply chain integrity; access control uses the same IAM and token mechanisms as container images; provenance files (.prov) upload automatically as additional OCI layers, enabling signature verification. For platform engineering teams distributing internal charts, an existing container registry (ECR, GHCR, ACR) becomes the chart repository with zero additional infrastructure.`,
    whenToUse: [
      'Distributing charts internally across teams: push to the org\'s existing container registry (GHCR, ECR, ACR) using OCI',
      'Public chart distribution: push to Docker Hub or GitHub Container Registry via OCI',
      'Supply chain security: use digest-based installation and provenance verification for production environments',
      'Classic repos: when your tooling (older Argo CD, older Helm versions) does not support OCI; helm-chartmuseum is the standard self-hosted solution',
    ],
    keyConcepts: [
      {
        term: 'OCI (Open Container Initiative) registry',
        definition: 'Container registry standard that Helm 3.8+ uses to distribute charts. Any OCI-compliant registry can store Helm charts. No index.yaml needed; no separate hosting infrastructure required. Charts are stored as OCI artifacts with Helm-specific media types.',
      },
      {
        term: 'helm registry login',
        definition: 'Authenticates Helm to an OCI registry. Credentials are stored in ~/.config/helm/registry/config.json (same credential format as Docker). Must be run before helm push or helm pull from private registries.',
      },
      {
        term: 'oci:// scheme',
        definition: 'The URL scheme for OCI registry references in helm install, helm pull, helm show. Example: oci://ghcr.io/myorg/charts/mychart. No helm repo add step — the registry is referenced directly in the command.',
      },
      {
        term: 'Digest-based installation',
        definition: 'helm install myapp oci://registry/chart@sha256:abc123 installs an exact, immutable chart version. Unlike a version tag that can be moved, a digest reference is cryptographically bound to the exact bytes of the chart artifact. Use for production environments where supply chain integrity is critical.',
      },
      {
        term: 'Provenance file (.prov)',
        definition: 'A GPG/PGP signature file automatically uploaded alongside a chart when using helm push with provenance. Recipients verify with helm pull --verify. The .prov file is stored as an additional OCI layer with its own media type.',
      },
    ],
    approach: [
      'Authenticate: helm registry login ghcr.io -u $GITHUB_USER -p $GITHUB_TOKEN',
      'Package the chart: helm package ./mychart — produces mychart-X.Y.Z.tgz',
      'Push: helm push mychart-X.Y.Z.tgz oci://ghcr.io/myorg/charts',
      'Verify availability: helm show chart oci://ghcr.io/myorg/charts/mychart --version X.Y.Z',
      'Install: helm install myapp oci://ghcr.io/myorg/charts/mychart --version X.Y.Z -f values.yaml',
      'For CI: add the login and push steps after tests pass in the release pipeline',
    ],
    pitfalls: [
      'Referencing classic repo syntax (bitnami/chart) for OCI charts — OCI charts require the full oci://registry/path/chartname syntax',
      'Not pinning --version — an omitted version defaults to "latest" in OCI, which may pull an unintended chart update',
      'Forgetting helm registry login in CI — pipeline fails with authentication error on push/pull',
      'Assuming helm repo update refreshes OCI charts — helm repo update only works for classic HTTP repos; OCI charts are fetched directly from the registry on demand',
    ],
    keyQuestions: [
      {
        question: 'Compare classic Helm chart repositories with OCI-based distribution.',
        answer: `Classic chart repositories:
- Serve index.yaml (JSON/YAML index of all charts) and .tgz archives over HTTP
- Require dedicated hosting: GitHub Pages, S3+CloudFront, ChartMuseum, Nexus, Artifactory (repo mode)
- Workflow: helm repo add -> helm repo update -> helm search repo -> helm install bitnami/chart
- Authentication: basic auth or token in the repo URL or helm repo add --username --password
- No immutable references — a version tag can be republished with different content

OCI registry distribution:
- Charts stored as OCI artifacts in any compliant registry (ECR, GHCR, ACR, GAR, Harbor, Docker Hub)
- No dedicated hosting infrastructure beyond an existing container registry
- Workflow: helm registry login -> helm package -> helm push -> helm install oci://registry/path/chart:version
- Authentication: same IAM/token mechanisms as container images (native registry auth)
- Immutable references by digest: oci://registry/chart@sha256:abc — cryptographically bound

Key differences:

index.yaml: classic repos require generating and publishing an index.yaml on every chart release. OCI uses the registry's native tag/manifest system — no index needed.

helm repo add: required for classic repos, not needed for OCI. OCI charts are referenced directly with oci://.

2026 recommendation: OCI for all new distribution, especially internal charts. Classic repos when working with legacy tooling that predates OCI GA.`,
      },
      {
        question: 'How do you set up a chart distribution pipeline for an internal platform team?',
        answer: `Standard setup for a platform team distributing charts to application teams:

Registry choice: use the organization's existing container registry. If on AWS, use ECR (create a dedicated repository per chart or one helm-charts repository). GitHub organizations use GHCR. Azure uses ACR.

CI pipeline (GitHub Actions example):

  name: Release Chart
  on:
    push:
      tags: ['v*']

  jobs:
    release:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - name: Install Helm
          uses: azure/setup-helm@v3

        - name: Login to GHCR
          run: helm registry login ghcr.io -u \${{ github.actor }} -p \${{ secrets.GITHUB_TOKEN }}

        - name: Lint
          run: helm lint ./charts/myapp

        - name: Package
          run: helm package ./charts/myapp --destination /tmp/charts

        - name: Push
          run: helm push /tmp/charts/myapp-*.tgz oci://ghcr.io/\${{ github.repository_owner }}/charts

Version management: chart version in Chart.yaml matches the Git tag (stripped of "v" prefix). The CI pipeline reads the tag and validates it matches Chart.yaml version before pushing.

Consumer workflow:
  helm install myapp oci://ghcr.io/myorg/charts/myapp --version 1.4.2 -f values-prod.yaml

For supply chain security, add helm package --sign with a GPG key in CI and document key verification for consumers.`,
      },
      {
        question: 'How does OCI digest-based installation improve supply chain security?',
        answer: `A version tag in an OCI registry is a mutable pointer — the tag v1.4.2 can be retagged to point to a different chart artifact if someone pushes a new package with the same version number. This is a vector for supply chain attacks: a malicious actor who gains push access could republish a chart with the same version number containing backdoored templates.

A digest is a SHA256 hash of the OCI manifest content. It cannot be forged, retagged, or modified — it is permanently and cryptographically bound to the exact bytes of the chart artifact.

  # Mutable — tag can be moved:
  helm install myapp oci://ghcr.io/myorg/charts/myapp --version 1.4.2

  # Immutable — digest cannot be changed:
  helm install myapp oci://ghcr.io/myorg/charts/myapp@sha256:a3f1b2c...

In a CI/CD pipeline:
After helm push, capture the digest:
  helm push mychart-1.4.2.tgz oci://ghcr.io/myorg/charts | grep -oP 'sha256:[a-f0-9]+'

Store the digest in the GitOps repo alongside the version to ensure production deploys always use the exact artifact that was tested in CI, even if someone later republishes v1.4.2.

Combined with provenance: the .prov file uploaded alongside the chart provides GPG/PGP signature verification. helm pull --verify checks the signature. Together, digest + provenance proves the chart is unmodified and comes from the expected publisher. This is the recommended supply chain security posture for regulated environments.`,
      },
      {
        question: 'What are the key commands for working with OCI-based Helm charts?',
        answer: `Complete OCI workflow:

Authenticate:
  helm registry login ghcr.io -u USERNAME -p TOKEN
  helm registry login ACCOUNT.dkr.ecr.REGION.amazonaws.com -u AWS -p $(aws ecr get-login-password)
  helm registry logout ghcr.io

Package:
  helm package ./mychart                        # produces mychart-1.4.2.tgz
  helm package ./mychart --sign --key "MyKey"   # with provenance

Push:
  helm push mychart-1.4.2.tgz oci://ghcr.io/myorg/charts
  # Chart becomes oci://ghcr.io/myorg/charts/mychart:1.4.2

Inspect before install:
  helm show chart oci://ghcr.io/myorg/charts/mychart --version 1.4.2
  helm show values oci://ghcr.io/myorg/charts/mychart --version 1.4.2

Pull (download locally):
  helm pull oci://ghcr.io/myorg/charts/mychart --version 1.4.2 --untar
  helm pull oci://ghcr.io/myorg/charts/mychart --version 1.4.2 --verify

Install:
  helm install myapp oci://ghcr.io/myorg/charts/mychart --version 1.4.2 -f values.yaml
  helm install myapp oci://ghcr.io/myorg/charts/mychart@sha256:abc123...  # by digest
  helm upgrade --install myapp oci://ghcr.io/myorg/charts/mychart --version 1.4.2

In Chart.yaml dependencies:
  dependencies:
    - name: mychart
      version: "1.4.2"
      repository: "oci://ghcr.io/myorg/charts"

Note: for OCI dependencies, the repository is the registry path without the chart name. helm dependency update fetches from the OCI registry directly.`,
      },
    ],
    references: [
      'https://helm.sh/docs/topics/registries/',
      'https://helm.sh/docs/topics/provenance/',
      'https://helm.sh/docs/helm/helm_push/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 8. Lifecycle Hooks and Tests
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'helm-hooks-tests',
    title: 'Lifecycle Hooks and Tests',
    icon: 'zap',
    color: '#7c3aed',
    questions: 5,
    description: 'Running ordered actions at specific lifecycle phases with hook annotations, controlling execution order with weights, cleaning up hooks with deletion policies, and validating deployments with helm test.',
    visualizations: [
      {
        title: 'Helm hook lifecycle phases and annotations',
        image: '/diagrams/devops/helm-8-hooks.png',
        description: `Helm hook lifecycle phases and their trigger points:

  pre-install     after templates are rendered, before any resources are created
  post-install    after all resources are loaded into Kubernetes
  pre-upgrade     after templates are rendered, before resources are updated
  post-upgrade    after all resources have been upgraded
  pre-delete      before any resources are deleted (helm uninstall)
  post-delete     after all resources have been deleted
  pre-rollback    before resources are modified during rollback
  post-rollback   after all resources have been modified during rollback
  test            when helm test <release> is explicitly invoked

Hook resource definition (Job example):
  apiVersion: batch/v1
  kind: Job
  metadata:
    name: {{ .Release.Name }}-pre-upgrade-migration
    annotations:
      "helm.sh/hook": pre-upgrade
      "helm.sh/hook-weight": "5"
      "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
  spec:
    template:
      spec:
        restartPolicy: Never
        containers:
          - name: migration
            image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
            command: ["python", "manage.py", "migrate"]

Hook annotations:
  helm.sh/hook: <phase>              # comma-separated phases if multiple
  helm.sh/hook-weight: "5"           # string integer; executed ascending
  helm.sh/hook-delete-policy: ...    # when to clean up

Deletion policy values:
  before-hook-creation   delete the hook resource if it exists before launching (default)
  hook-succeeded         delete after successful completion
  hook-failed            delete after failure

Best practice: use before-hook-creation,hook-succeeded to clean up on success
but retain failed hooks for debugging:
  "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded

Hook lifecycle (helm install example):
  1. Render all templates
  2. Identify pre-install hooks, sort by weight (ascending), execute each
  3. Wait for each hook Job/Pod to complete (or fail)
  4. Apply non-hook resources (Deployment, Service, etc.)
  5. Execute post-install hooks in weight order

For Jobs: Helm waits until the Job's Pod completes (exit 0 = success, non-zero = failure).
A failed hook aborts the install (unless --no-hooks is passed).

test hook example:
  apiVersion: v1
  kind: Pod
  metadata:
    name: {{ .Release.Name }}-connection-test
    annotations:
      "helm.sh/hook": test
  spec:
    restartPolicy: Never
    containers:
      - name: test
        image: curlimages/curl
        command: ['curl', '-f', 'http://{{ include "myapp.fullname" . }}:{{ .Values.service.port }}/health']

Run test: helm test <release-name>`,
      }
    ],
    quickFire: [
      { q: 'What is the most common production use case for Helm hooks?', a: 'A pre-upgrade Job that runs database schema migrations before the new version of the application is deployed. This ensures the database schema is updated before the new application code starts running against it. The Job runs the migration, Helm waits for it to complete successfully, then applies the updated Deployment.' },
      { q: 'What happens if a hook Job fails?', a: 'Helm aborts the current operation (install/upgrade/rollback) and marks the release as FAILED. The non-hook resources (Deployment, Service, etc.) are not applied or rolled back. The failed hook Job remains in the cluster unless the hook-failed deletion policy is set. For pre-upgrade hooks, the previous version remains running since the upgrade was aborted.' },
      { q: 'What is helm.sh/hook-weight?', a: 'A string integer annotation that controls execution order within a hook phase. Hooks with lower weight numbers run first. Multiple hooks with the same weight run in parallel. Default weight is 0. Example: a secrets rotation hook at weight -5 runs before a schema migration hook at weight 5.' },
      { q: 'How is a test hook different from other hooks?', a: 'Test hooks (annotated with "helm.sh/hook": test) only run when explicitly invoked with helm test <release>. They are not triggered during install, upgrade, or delete. Typically implemented as a Pod that runs a connectivity or smoke test against the deployed application and exits 0 on success.' },
      { q: 'Can you have multiple hooks at the same lifecycle phase?', a: 'Yes. Multiple resources can have the same hook phase annotation. They are sorted by hook-weight and executed in ascending weight order. Hooks with the same weight are executed in parallel (for Jobs) or in resource name alphabetical order (for other resource types).' },
    ],
    introduction: `Helm hooks provide lifecycle control — the ability to run ordered actions before or after specific events in a release lifecycle (install, upgrade, delete, rollback). Without hooks, all resources are applied in Helm's fixed sort order with no ability to coordinate stateful operations like database migrations.

Hooks are Kubernetes resources (usually Jobs or Pods) with a helm.sh/hook annotation specifying when they run. The nine hook phases cover the full release lifecycle: pre/post-install, pre/post-upgrade, pre/post-delete, pre/post-rollback, and test (only on explicit helm test invocation).

The most production-critical hook is pre-upgrade with a database migration Job. The typical pattern: when deploying a new application version that requires a schema change, a pre-upgrade hook runs the migration tool (Flyway, Liquibase, Django migrate, Rails db:migrate) as a Job. Helm waits for the Job to complete successfully before applying the updated Deployment. If the migration fails, Helm aborts the upgrade and the old version keeps running — a safe failure mode.

Hook weights (helm.sh/hook-weight) control execution order when multiple hooks target the same lifecycle phase. Negative weights run first. Combined with deletion policies (helm.sh/hook-delete-policy), hooks can clean up after themselves automatically on success while retaining failed hook artifacts for debugging.

The test hook enables helm test — a command that runs validation Pods against a deployed release. Unlike pre/post hooks that run automatically, test hooks only fire when explicitly invoked. They are used for smoke tests, connectivity checks, and integration validation in CI after deployment.`,
    whenToUse: [
      'Pre-upgrade database migrations: run migration Job before Deployment update',
      'Post-install initialization: seed a database, create an admin user, or notify a monitoring system after first install',
      'Pre-delete cleanup: remove data or deregister from a service catalog before resources are deleted',
      'helm test: connectivity smoke tests after every deployment in CI (curl the health endpoint, run an integration test suite)',
    ],
    keyConcepts: [
      {
        term: 'helm.sh/hook annotation',
        definition: 'The Kubernetes annotation that marks a resource as a hook and specifies its lifecycle phase(s). Multiple phases can be comma-separated: "helm.sh/hook": "pre-upgrade,pre-rollback". Resources with this annotation are not applied as part of the normal resource lifecycle — only at the specified phases.',
      },
      {
        term: 'Hook weight (helm.sh/hook-weight)',
        definition: 'String integer controlling hook execution order within a phase. Lower values execute first. Default is 0. Negative values are valid. Hooks with the same weight at the same phase execute in parallel (for Jobs) or alphabetically.',
      },
      {
        term: 'Hook deletion policies',
        definition: 'before-hook-creation deletes the resource before launching the hook (default — prevents "resource already exists" errors on re-run). hook-succeeded deletes after successful completion. hook-failed deletes after failure. Combine: before-hook-creation,hook-succeeded retains failed hooks for debugging while cleaning up successful ones.',
      },
      {
        term: 'Pre-upgrade migration pattern',
        definition: 'A pre-upgrade Job that runs the migration tool (Flyway, Liquibase, Django migrate). Helm waits for Job completion before updating the Deployment. On Job failure, Helm aborts the upgrade — the old application version keeps running against the old schema. Safe failure mode for stateful upgrades.',
      },
      {
        term: 'helm test',
        definition: 'Explicitly invoked command (helm test <release>) that runs test hook resources. Test hooks are Pods that run validation logic and exit 0 on success. Helm reports pass/fail per test Pod. Used for smoke tests, connectivity checks, and integration validation in CI.',
      },
      {
        term: '--no-hooks flag',
        definition: 'Skips all hook execution for the current command. Useful for emergency operations when a hook is broken and blocking progress. helm upgrade --no-hooks is the escape hatch for "the pre-upgrade hook is hanging and the release is stuck in PENDING_UPGRADE."',
      },
    ],
    approach: [
      'Identify lifecycle coordination needs: does the application require DB migration before upgrade?',
      'Create a Job in templates/ with helm.sh/hook: pre-upgrade annotation and restartPolicy: Never',
      'Set appropriate deletion policy: before-hook-creation,hook-succeeded to clean up success but retain failures',
      'Set hook-weight if multiple hooks run at the same phase and order matters',
      'Test the hook in isolation: helm upgrade --dry-run to see the hook manifest, then a real upgrade in a test environment',
      'Add a test hook Pod that validates the application health endpoint and wire into CI: helm upgrade && helm test <release>',
    ],
    pitfalls: [
      'Hook Job without restartPolicy: Never — Kubernetes default is Always, causing the migration Job to restart on failure instead of stopping',
      'Missing hook-delete-policy — the hook resource accumulates across upgrades, eventually filling etcd with old Job objects',
      'Using a Deployment as a hook — Helm waits for Deployments to be "loaded" by Kubernetes (accepted), not for Pods to complete; only Jobs/Pods are waited on for completion',
      'Not testing hook failure mode: a blocking pre-upgrade hook that hangs indefinitely stalls the upgrade until --timeout is reached; plan for --no-hooks as an escape hatch',
      'Assuming test hooks run automatically after deploy — they require explicit helm test invocation',
    ],
    keyQuestions: [
      {
        question: 'How do you implement a safe database migration pattern using Helm hooks?',
        answer: `The pre-upgrade hook pattern:

  # templates/migration-job.yaml
  apiVersion: batch/v1
  kind: Job
  metadata:
    name: {{ .Release.Name }}-db-migrate-{{ .Release.Revision }}
    labels:
      {{- include "myapp.labels" . | nindent 4 }}
    annotations:
      "helm.sh/hook": pre-upgrade
      "helm.sh/hook-weight": "0"
      "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
  spec:
    backoffLimit: 2
    template:
      metadata:
        labels:
          app: {{ .Release.Name }}-migration
      spec:
        restartPolicy: Never
        serviceAccountName: {{ include "myapp.serviceAccountName" . }}
        containers:
          - name: migrate
            image: {{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}
            command: ["python", "manage.py", "migrate", "--noinput"]
            env:
              - name: DATABASE_URL
                valueFrom:
                  secretKeyRef:
                    name: {{ .Release.Name }}-db-secret
                    key: url

Why this is safe:

1. The migration runs BEFORE the Deployment is updated. The old application version is still running.
2. Helm blocks the upgrade until the migration Job completes (exit 0) or fails.
3. On migration failure: Helm aborts the upgrade. The old Deployment remains unchanged. The old application runs against the old schema — safe.
4. On migration success: Helm proceeds to update the Deployment. New code runs against new schema.
5. Deletion policy: before-hook-creation removes the old migration Job before the new one runs. hook-succeeded removes the successful Job. A failed Job remains for log inspection.

Critical details:
- restartPolicy: Never is mandatory for Job Pods. On failure, the Pod stays for log inspection rather than restarting indefinitely.
- Include {{ .Release.Revision }} in the Job name for uniqueness across upgrades.
- Set backoffLimit: 2 for idempotent migrations; set to 0 for non-idempotent migrations where retrying could corrupt data.`,
      },
      {
        question: 'Explain hook execution order with weights and what happens when a hook fails.',
        answer: `Execution order:

Within a lifecycle phase, hooks are sorted by helm.sh/hook-weight (string-to-integer comparison, ascending). Lower weight values run first. Default weight is 0.

Example with three pre-upgrade hooks:
  secrets-rotation-hook   weight: -10   (runs first)
  db-migration-hook       weight: 0     (runs second)
  cache-invalidation-hook weight: 10    (runs third)

Hooks with the same weight at the same phase execute in parallel if they are Jobs/Pods.

Execution flow for helm upgrade:
  1. Render all templates
  2. Sort pre-upgrade hooks by weight
  3. Execute weight=-10 hooks, wait for completion
  4. Execute weight=0 hooks, wait for completion
  5. Execute weight=10 hooks, wait for completion
  6. Apply non-hook resource changes (Deployments, Services, etc.)
  7. Execute post-upgrade hooks by weight

On hook failure:

A hook Job fails when its Pod exits with a non-zero exit code. Helm sees the Job as failed, marks the release as FAILED, and aborts the operation.

For pre-upgrade failure:
- The upgrade is aborted before any resource changes are applied
- The previous Deployment/Service/etc. remains untouched
- The release status becomes FAILED
- The failed Job remains (if hook-failed deletion policy is not set)

For post-install failure:
- The install resources are already applied
- The release status becomes FAILED
- helm rollback can revert the non-hook resources

Escape hatch: helm upgrade --no-hooks skips all hooks. Use when a hook is broken and you need to force a deployment.`,
      },
      {
        question: 'How does helm test work and how do you write effective test hooks?',
        answer: `helm test basics:

helm test <release-name> runs all resources annotated with "helm.sh/hook": test. Helm creates the test Pods, waits for them to complete, reports pass (exit 0) or fail (non-zero exit) for each, then outputs a summary.

  helm test myapp -n production
  helm test myapp -n production --logs    # retain Pod logs after test

Writing effective test hooks:

1. Connectivity test (basic):
  apiVersion: v1
  kind: Pod
  metadata:
    name: {{ .Release.Name }}-test-connection
    annotations:
      "helm.sh/hook": test
  spec:
    restartPolicy: Never
    containers:
      - name: test
        image: curlimages/curl:8.5.0
        command:
          - sh
          - -c
          - >
            curl -f http://{{ include "myapp.fullname" . }}:{{ .Values.service.port }}/healthz &&
            echo "Health check passed"

2. Database connectivity test:
  containers:
    - name: db-test
      image: postgres:16
      command: ['sh', '-c', 'pg_isready -h {{ .Values.postgresql.host }} -p 5432']

Best practices:
- Use lightweight images (curlimages/curl, busybox, minimal language runtimes)
- Test specific application behavior, not just "Pod exists" (curl the health endpoint, not just ping)
- Add helm test to your CI pipeline after every helm upgrade: helm upgrade --install && helm test $RELEASE
- Use restartPolicy: Never to prevent infinite test retry loops

What test hooks cannot replace: unit tests (run in CI before deploy), integration tests (run against a staging cluster), load tests. helm test is a quick post-deploy smoke test.`,
      },
      {
        question: 'What are the hook deletion policies and which combination should you use in production?',
        answer: `Three deletion policy values (can be combined with comma-separation):

before-hook-creation (default when no policy is specified):
Deletes the hook resource if it already exists before creating a new one. This prevents "resource already exists" errors when the same hook runs across multiple upgrades.

hook-succeeded:
Deletes the hook resource after it completes successfully. Cleans up the Job and its Pod(s) from the cluster after a successful run.

hook-failed:
Deletes the hook resource after it fails. Cleans up failed Jobs automatically.

Production combinations:

Recommended for DB migrations and other critical hooks:
  "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded

Why: before-hook-creation ensures clean re-runs across upgrades. hook-succeeded cleans up successful migrations automatically. On failure, the Job is NOT deleted — the Pod logs remain accessible for debugging. This is the "clean up success, preserve failure" pattern.

Acceptable for lightweight hooks (cache warm, audit log):
  "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded,hook-failed

Cleans up everything. Use only when hook failure is non-critical and you don't need to inspect failure logs.

Avoid in production:
  No deletion policy at all — hooks accumulate across every upgrade, filling etcd.

Testing consideration: for test hooks, the default behavior (delete Pods after test) is correct. Use helm test --logs to capture output before the test Pods are cleaned up.`,
      },
      {
        question: 'How do you handle a situation where a pre-upgrade hook is hanging and blocking the upgrade?',
        answer: `A hanging pre-upgrade hook puts the release in PENDING_UPGRADE state and blocks all subsequent upgrades until the timeout is reached (default 5 minutes) or the hook is manually interrupted.

Immediate steps:

1. Check the hook status:
   helm status <release> -n <namespace>
   kubectl get jobs -n <namespace>
   kubectl logs -n <namespace> -l job-name=<hook-job-name> --previous

2. Check why it's hanging: common causes:
   - DB connection failure (wrong credentials, network policy blocking access)
   - Migration is taking too long (large table, missing index)
   - Pod stuck in Pending (node capacity, image pull issue)
   - Infinite migration retry loop (wrong backoffLimit)

3. Let the timeout expire OR force-cancel:
   Manually delete the hook Job: kubectl delete job <hook-job-name> -n <namespace>
   Helm marks the release as FAILED.

4. Bypass hooks for emergency deploy:
   helm upgrade <release> ./chart -f values.yaml --no-hooks -n <namespace>
   --no-hooks skips all hooks entirely. Document this bypass and immediately fix the hook.

5. Fix the root cause: update the hook Job (fix connection, add timeout, fix migration), test in staging, redeploy.

Preventive measures:
- Always set activeDeadlineSeconds on hook Jobs (30s, 60s, 300s depending on expected runtime)
- Use backoffLimit: 0 or 1 for non-idempotent migrations
- Test hooks in a non-production environment before every upgrade that changes migrations
- Include helm upgrade --timeout in CI to prevent pipelines hanging indefinitely`,
      },
    ],
    references: [
      'https://helm.sh/docs/topics/charts_hooks/',
      'https://helm.sh/docs/helm/helm_test/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 9. CI/CD and GitOps Integration
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'helm-cicd-gitops',
    title: 'CI/CD and GitOps Integration',
    icon: 'gitMerge',
    color: '#7c3aed',
    questions: 6,
    description: 'Driving Helm through GitHub Actions and GitLab CI pipelines, integrating with Argo CD and Flux for GitOps, and using helm template for diff-based deployment workflows.',
    visualizations: [
      {
        title: 'Helm in CI/CD pipelines and GitOps controllers',
        image: '/diagrams/devops/helm-9-cicd.png',
        description: `Three deployment models:

MODEL 1 — Push-based CI/CD (simple, non-GitOps):
  CI pipeline builds image -> runs tests -> helm upgrade --install

  GitHub Actions example:
    - name: Deploy
      run: |
        helm upgrade --install myapp ./charts/myapp \
          -f charts/myapp/values.yaml \
          -f charts/myapp/values-prod.yaml \
          --set image.tag=\${{ github.sha }} \
          --namespace production \
          --create-namespace \
          --atomic \
          --wait \
          --timeout 5m

  Pros: simple, no controller infrastructure
  Cons: cluster drift not detected; no continuous reconciliation

MODEL 2 — GitOps with Argo CD (pull-based):
  Git repo has chart reference + values -> Argo CD Application watches it ->
  on change, Argo CD renders chart and applies diff

  Argo CD Application manifest:
    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
      name: myapp
      namespace: argocd
    spec:
      source:
        chart: myapp
        repoURL: oci://ghcr.io/myorg/charts
        targetRevision: 1.4.2
        helm:
          values: |
            replicaCount: 5
            image:
              tag: abc123def
      destination:
        server: https://kubernetes.default.svc
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true

MODEL 3 — GitOps with Flux (pull-based):
  HelmRelease CRD defines the release (chart + version + values)
  helm-controller renders and applies using native Helm SDK semantics

  HelmRelease:
    apiVersion: helm.toolkit.fluxcd.io/v2
    kind: HelmRelease
    metadata:
      name: myapp
      namespace: production
    spec:
      chart:
        spec:
          chart: myapp
          version: "1.4.2"
          sourceRef:
            kind: HelmRepository
            name: myorg-charts
      values:
        replicaCount: 5
        image:
          tag: abc123def
      install:
        remediation:
          retries: 3
      upgrade:
        remediation:
          remediateLastFailure: true

helm template in CI diff workflow:
  helm template myapp ./chart -f values-prod.yaml > new-manifests.yaml
  kubectl diff -f new-manifests.yaml   # shows exactly what will change

  Or with helm diff plugin:
  helm plugin install https://github.com/databus23/helm-diff
  helm diff upgrade myapp ./chart -f values-prod.yaml`,
      }
    ],
    quickFire: [
      { q: 'What is the standard Helm command in a production CI deploy step?', a: 'helm upgrade --install <release> <chart> -f values.yaml -f values-${ENV}.yaml --set image.tag=$SHA --namespace $NS --create-namespace --atomic --wait --timeout 5m. The --atomic --wait combination ensures the pipeline only reports success when the deployment is fully healthy, and auto-rolls back on failure.' },
      { q: 'What is the difference between push-based and pull-based Helm deployment?', a: 'Push-based: a CI pipeline runs helm upgrade directly against the cluster. Simple but provides no continuous reconciliation — if someone manually changes a resource, the pipeline doesn\'t know. Pull-based (GitOps): Argo CD or Flux watches a Git repo containing the desired state (chart reference + values). The controller continuously reconciles the cluster to match the declared state. Drift is automatically corrected.' },
      { q: 'How does Argo CD deploy a Helm chart?', a: 'Argo CD treats Helm as a template renderer, not a package manager. It renders the chart with helm template (server-side) and applies the resulting manifests via kubectl. Argo CD does NOT run helm install — it bypasses Helm\'s release tracking (no helm.sh/release.v1 Secrets). This means helm list on an Argo CD-managed release shows nothing; the "release" is tracked in Argo CD\'s own Application resource.' },
      { q: 'What does helm diff do and why is it useful in CI?', a: 'helm diff (the databus23/helm-diff plugin) shows the diff between the current release state and what helm upgrade would apply — similar to terraform plan. Use it in CI as a preview step before deploying. Run helm diff upgrade <release> ./chart -f values.yaml in a PR check to show reviewers exactly what will change in the cluster.' },
      { q: 'How do you pass the Docker image tag to a Helm chart in CI?', a: '--set image.tag=$CI_COMMIT_SHA or --set image.tag=$GITHUB_SHA. The commit SHA is the canonical immutable reference. In GitOps, commit the tag to the values file in Git: update values.yaml with the new tag, commit, push, and let Argo CD or Flux pick up the change.' },
    ],
    introduction: `Integrating Helm into CI/CD pipelines and GitOps workflows is where theoretical chart knowledge becomes production engineering. Two fundamentally different models exist: push-based (CI pipeline runs helm upgrade against the cluster directly) and pull-based GitOps (Argo CD or Flux watches a Git repository and continuously reconciles the cluster to match the declared state).

The push model is simpler to set up but has a critical limitation: it provides no drift detection or correction. If someone manually edits a Deployment or ConfigMap in the cluster, the pipeline won't notice until the next deploy. The pull/GitOps model continuously reconciles — any drift from the desired state in Git is automatically corrected by the controller.

GitHub Actions and GitLab CI are the dominant CI platforms for push-based Helm deploys. The standard production command is helm upgrade --install with --atomic --wait --timeout to ensure the pipeline only reports success when the deployment is healthy and self-heals on failure. Kubernetes OIDC authentication (no long-lived credentials) is the security best practice for both platforms.

Argo CD and Flux are the dominant GitOps controllers for pull-based Helm management. Both have first-class Helm support: Argo CD uses Application resources that reference a chart source and render with helm template; Flux uses HelmRelease CRDs that the helm-controller reconciles using the Helm SDK. The key distinction for interviews: Argo CD renders with helm template and applies via kubectl (no Helm release tracking); Flux uses native Helm SDK semantics (helm install/upgrade under the hood, full release tracking).`,
    whenToUse: [
      'Push-based CI: smaller teams, simple deploys, when GitOps controller infrastructure is not yet in place',
      'Argo CD GitOps: when drift detection and continuous reconciliation are required, or for multi-cluster management',
      'Flux GitOps: when composable, controller-per-function architecture is preferred or when HelmRelease native semantics matter',
      'helm diff in CI: for preview-before-deploy workflows, particularly for change-averse production environments',
    ],
    keyConcepts: [
      {
        term: 'Push-based deployment',
        definition: 'CI pipeline (GitHub Actions, GitLab CI, Jenkins) runs helm upgrade --install directly. Fast to set up, no controller needed. No continuous reconciliation — drift from manual changes is not detected or corrected.',
      },
      {
        term: 'Pull-based GitOps (Argo CD / Flux)',
        definition: 'A controller watches a Git repository containing the desired state (chart reference, version, values). On change, the controller renders the chart and reconciles the cluster. Drift from the desired state is automatically corrected. Every cluster change is a Git commit — full audit trail.',
      },
      {
        term: 'Argo CD Helm rendering model',
        definition: 'Argo CD renders charts with helm template and applies via kubectl. Does NOT run helm install — no Helm release Secrets are created. helm list shows nothing for Argo CD-managed releases. Helm lifecycle (rollback, history) is replaced by Argo CD sync/rollback.',
      },
      {
        term: 'Flux HelmRelease (native Helm semantics)',
        definition: 'Flux\'s helm-controller uses the Helm SDK (helm install/upgrade under the hood). Full Helm release tracking: helm list shows releases, helm history works. Closer to native Helm semantics than Argo CD. HelmRelease CRD declaratively defines chart, version, and values.',
      },
      {
        term: 'helm diff plugin',
        definition: 'databus23/helm-diff plugin that shows a diff between the current release state and what helm upgrade would apply. Analogous to terraform plan. Used in CI for preview steps and PR checks to show reviewers exactly what cluster changes a values or chart version change would produce.',
      },
      {
        term: 'OIDC for CI authentication',
        definition: 'GitHub Actions and GitLab CI support OIDC (OpenID Connect) to authenticate to Kubernetes clusters and cloud providers without storing long-lived credentials. The CI provider mints a JWT; the cluster or cloud provider validates it. No AWS_ACCESS_KEY_ID or kubeconfig secrets needed in CI.',
      },
    ],
    approach: [
      'Push model: add kubeconfig or OIDC credentials to CI secrets, then helm upgrade --install --atomic --wait in the deploy job',
      'Chart release: on chart changes, run helm package and helm push to OCI registry in a separate release pipeline',
      'GitOps: commit chart version bumps and values changes to the GitOps repo; Argo CD or Flux picks up changes',
      'Pre-deploy diff: add a helm diff upgrade step in CI to preview cluster changes before deploying, especially for production',
      'Post-deploy validation: run helm test after every deployment in CI to confirm the application is healthy',
    ],
    pitfalls: [
      'Using helm install (not helm upgrade --install) in CI — fails on second run when the release already exists',
      'Long-lived kubeconfig credentials in CI secrets — use OIDC or short-lived tokens scoped to deploy permissions',
      'Running helm CLI in CI when Argo CD manages the same release — Argo CD overwrites helm CLI changes on next sync',
      'Forgetting --namespace in CI commands — deploys to the wrong namespace silently',
      'Not verifying the deploy in CI — pipeline reports success while pods are still crash-looping; use --wait or helm test',
    ],
    keyQuestions: [
      {
        question: 'Write a GitHub Actions workflow step that deploys a Helm chart to a Kubernetes cluster securely.',
        answer: `Full production-ready GitHub Actions workflow:

  name: Deploy to Production
  on:
    push:
      branches: [main]

  permissions:
    id-token: write    # required for OIDC
    contents: read

  jobs:
    deploy:
      runs-on: ubuntu-latest
      environment: production    # requires manual approval
      steps:
        - uses: actions/checkout@v4

        - name: Configure AWS credentials (OIDC)
          uses: aws-actions/configure-aws-credentials@v4
          with:
            role-to-assume: arn:aws:iam::123456789:role/GHActionsDeployRole
            aws-region: us-east-1

        - name: Update kubeconfig
          run: aws eks update-kubeconfig --name prod-cluster --region us-east-1

        - name: Set up Helm
          uses: azure/setup-helm@v3
          with:
            version: v4.2.2

        - name: Login to GHCR
          run: helm registry login ghcr.io -u \${{ github.actor }} -p \${{ secrets.GITHUB_TOKEN }}

        - name: Deploy
          run: |
            helm upgrade --install myapp \
              oci://ghcr.io/myorg/charts/myapp \
              --version \${{ needs.build.outputs.chart-version }} \
              -f charts/myapp/values.yaml \
              -f charts/myapp/values-prod.yaml \
              --set image.tag=\${{ github.sha }} \
              --namespace production \
              --create-namespace \
              --atomic \
              --wait \
              --timeout 5m

        - name: Run smoke tests
          run: helm test myapp -n production --logs

Security decisions:
- OIDC: no long-lived AWS credentials stored in GitHub; the JWT is scoped to this workflow
- Namespace: explicit --namespace production, create if absent
- --atomic: self-healing on failure
- environment: production: enables GitHub environment protection rules and manual approval
- No --set with secrets: database passwords come from External Secrets Operator, not CI`,
      },
      {
        question: 'Explain how Argo CD deploys a Helm chart and how it differs from running helm install.',
        answer: `How Argo CD handles Helm:

Argo CD treats Helm as a manifest templating engine, not a package manager. When an Application references a Helm chart, Argo CD:

1. Fetches the chart from the repository or OCI registry
2. Runs helm template with the configured values (via the Application spec)
3. Takes the rendered YAML and computes a diff against the live cluster state
4. Applies only the resources that differ (equivalent to kubectl apply --server-side)
5. Tracks resource state in its own Application resource — not in Helm release Secrets

Key differences from helm install:

No release tracking: Argo CD does NOT create helm.sh/release.v1 Secrets. Running helm list in the target namespace returns nothing for Argo CD-managed releases.

No Helm rollback: helm rollback does not work on Argo CD-managed releases (no history Secrets). Rollback is done via Argo CD sync to a previous Git commit.

No Helm hooks: Argo CD renders hooks as regular manifests. Helm hook lifecycle (pre-upgrade, etc.) is NOT honored. Argo CD has its own hook system via Sync hooks (PreSync, Sync, PostSync annotations).

Coexistence warning: never run helm upgrade on a release that Argo CD manages. Argo CD will overwrite the helm CLI changes on its next sync (typically within 3 minutes).

Interview framing: Argo CD gives you GitOps reconciliation (drift correction, audit trail, sync status) but sacrifices native Helm semantics. Flux preserves native Helm semantics (release tracking, hooks) within a GitOps model.`,
      },
      {
        question: 'How do you update a deployed application\'s image tag in a GitOps workflow?',
        answer: `Two approaches depending on architecture:

Approach 1: Commit to GitOps repo (pure GitOps):
CI builds image -> pushes to registry -> updates image tag in the GitOps values file -> commits -> Argo CD or Flux picks up the change.

GitHub Actions step:
  - name: Update image tag
    run: |
      git config user.email "ci@company.com"
      git config user.name "CI"
      sed -i "s|tag: .*|tag: \${{ github.sha }}|" gitops-repo/production/values.yaml
      git add gitops-repo/production/values.yaml
      git commit -m "ci: update myapp image to \${{ github.sha }}"
      git push

Argo CD polls the repo (default: 3 min) or receives a webhook and syncs.
Flux image-automation-controller can automate this — it watches the registry and commits the new tag to Git automatically.

Approach 2: ArgoCD image updater:
Argo CD Image Updater watches container registries for new tags matching a pattern and writes the tag back to the Git repository or directly to the Application spec.

Approach 3: Push-based for the image tag, pull-based for everything else:
CI pipeline updates the image tag with helm upgrade --set image.tag=$SHA for speed, while all other configuration is managed via GitOps. Common for development environments where fast iteration matters.

Best practice for production: pure GitOps (Approach 1). Every change to the cluster is a Git commit with a full audit trail. PRs require approval before merging the tag bump.`,
      },
      {
        question: 'How does Flux HelmRelease differ from Argo CD Application for Helm deployments?',
        answer: `Flux HelmRelease — native Helm semantics:

Flux's helm-controller uses the actual Helm SDK (calls helm install/upgrade under the hood). This means:
- Helm release Secrets ARE created — helm list works, helm history works
- Helm hooks ARE honored — pre-upgrade Job migrations run correctly
- Helm rollback is available — both Flux-initiated (on upgrade failure) and manual
- Native Helm values files and chart dependencies work exactly as in CLI

HelmRelease CRD:
  spec:
    chart:
      spec:
        chart: myapp
        version: ">=1.4.0 <2.0.0"
        sourceRef:
          kind: HelmRepository
          name: myorg-charts
    values:
      replicaCount: 5
    interval: 5m
    upgrade:
      remediation:
        remediateLastFailure: true  # rollback on upgrade failure

Argo CD Application — render-and-apply model:

Argo CD uses helm template and applies manifests directly:
- No Helm release Secrets — helm list shows nothing
- Hooks not honored in Helm lifecycle sense
- Rollback via Argo CD sync to previous commit, not helm rollback

When to choose Flux HelmRelease:
- Need native Helm hook semantics for DB migrations
- Want helm list / helm history for operator familiarity
- Composable controller architecture

When to choose Argo CD:
- Need unified GitOps UI (Argo CD has an excellent web interface)
- Multi-cluster management at scale (App of Apps, ApplicationSet)
- Mixed chart/Kustomize environment

The 2026 pattern: many organizations run both — Flux for Helm-heavy platform infrastructure, Argo CD for application workloads.`,
      },
      {
        question: 'How do you implement a helm diff step in CI for production safety?',
        answer: `The helm-diff plugin (github.com/databus23/helm-diff) adds terraform-plan-style preview to Helm upgrades.

Install in CI:
  helm plugin install https://github.com/databus23/helm-diff

Usage:
  helm diff upgrade myapp ./chart \
    -f values.yaml \
    -f values-prod.yaml \
    --set image.tag=$SHA \
    --namespace production

Output (similar to kubectl diff):
  - apiVersion: apps/v1
    kind: Deployment
    name: myapp
    spec:
      replicas: 3    # current
  + replicas: 5      # proposed

  # New resource (green):
  + apiVersion: autoscaling/v2
  + kind: HorizontalPodAutoscaler

Integrating into a PR check workflow:

  - name: Helm diff
    run: |
      helm diff upgrade myapp oci://ghcr.io/myorg/charts/myapp \
        --version \${{ steps.version.outputs.chart-version }} \
        -f values-prod.yaml \
        --namespace production \
        --no-color \
        --output yaml 2>&1 | tee helm-diff.txt

  - name: Comment diff on PR
    uses: actions/github-script@v7
    with:
      script: |
        const diff = require('fs').readFileSync('helm-diff.txt', 'utf8')
        github.rest.issues.createComment({
          issue_number: context.issue.number,
          body: '## Helm diff for production\\n\`\`\`yaml\\n' + diff + '\\n\`\`\`'
        })

This automatically posts the Kubernetes resource changes as a PR comment, giving reviewers full visibility into what the deploy will change before they approve the merge.`,
      },
      {
        question: 'What authentication pattern should CI use to deploy to Kubernetes, and why?',
        answer: `Modern answer: OIDC (OpenID Connect) — no stored credentials

GitHub Actions and GitLab CI both support OIDC identity federation with cloud providers and Kubernetes clusters.

AWS EKS + GitHub Actions:
  permissions:
    id-token: write    # request JWT from GitHub

  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789:role/GHActionsDeployRole
      aws-region: us-east-1

  - run: aws eks update-kubeconfig --name prod-cluster --region us-east-1

How it works: GitHub mints a short-lived JWT signed by GitHub. AWS IAM validates the JWT (configured trust policy on the role). No AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY stored anywhere.

Minimum permissions for a Helm deploy service account:
- Namespace: get, list
- Secrets: get, list, create, update, delete (for release tracking)
- Plus permissions for each resource type the chart creates

Scope to the deployment namespace only. Never cluster-admin for a deploy service account.

What NOT to do:
- Long-lived kubeconfig files stored in CI secrets (they expire unexpectedly and cannot be rotated without a manual secret update)
- cluster-admin service accounts for CI (overpowered, dangerous)
- AWS IAM user credentials stored in CI (long-lived, human-owned, not rotated)

OIDC is the standard answer for 2026. If your cloud/cluster supports it, use it.`,
      },
    ],
    references: [
      'https://helm.sh/docs/howto/charts_tips_and_tricks/',
      'https://argo-cd.readthedocs.io/en/stable/user-guide/helm/',
      'https://fluxcd.io/flux/components/helm/helmreleases/',
      'https://github.com/databus23/helm-diff',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 10. Security and Supply Chain
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'helm-security-supply-chain',
    title: 'Security and Supply Chain',
    icon: 'shield',
    color: '#7c3aed',
    questions: 6,
    description: 'Hardening charts and their distribution path: chart signing and provenance, RBAC scoping, secrets management with helm-secrets and External Secrets, and scanning charts and images.',
    visualizations: [
      {
        title: 'Helm security layers — distribution, runtime, and secrets',
        image: '/diagrams/devops/helm-10-security.png',
        description: `Supply chain security layers for Helm:

LAYER 1 — Chart signing and provenance (GPG/PGP):
  Sign at package time:
    gpg --full-generate-key   # generate a signing key pair
    helm package ./mychart --sign --key "My Release Key" --keyring ~/.gnupg/secring.gpg
    # Produces: mychart-1.4.2.tgz AND mychart-1.4.2.tgz.prov

  Verify at install time:
    helm install myapp ./mychart-1.4.2.tgz --verify --keyring /path/to/pubring.gpg
    helm pull oci://ghcr.io/myorg/charts/mychart --version 1.4.2 --verify

  Provenance file (.prov) contains:
    - Chart.yaml contents
    - SHA256 checksum of the .tgz file
    - OpenPGP signature over the above

  OCI + Sigstore (modern alternative):
    helm plugin install https://github.com/sigstore/helm-sigstore
    # Signs with Sigstore's keyless signing (uses OIDC identity, publishes to Rekor transparency log)

LAYER 2 — RBAC scoping for Helm operators:
  Service account for CI deploy (minimum permissions):
    apiVersion: rbac.authorization.k8s.io/v1
    kind: Role
    metadata:
      name: helm-deploy
      namespace: production
    rules:
      - apiGroups: [""]
        resources: ["secrets"]
        verbs: ["get", "list", "create", "update", "delete"]
      - apiGroups: ["apps"]
        resources: ["deployments", "statefulsets", "daemonsets"]
        verbs: ["get", "list", "create", "update", "delete", "patch"]

  Never use cluster-admin for Helm CI service accounts.
  Separate service accounts per environment (dev, staging, prod).

LAYER 3 — Secrets in values (the wrong way vs right way):
  Wrong: values-prod.yaml with database.password: mysecret (committed to Git)
  Wrong: values-prod.yaml with base64-encoded values (encoding != encryption)

  Right — External Secrets Operator (cloud-native):
    ExternalSecret -> pulls from AWS Secrets Manager / Vault / GCP SM
    -> creates Kubernetes Secret automatically
    Chart references the Secret by name (Helm never sees the secret value)

  Right — helm-secrets + SOPS:
    SOPS encrypts specific values in secrets.yaml using KMS key
    Encrypted file committed to Git
    CI: helm secrets upgrade myapp ./chart -f secrets.yaml
    SOPS decrypts using CI IAM role before helm sees the values

LAYER 4 — Image and chart scanning:
  Trivy: scans OCI images AND Helm charts for CVEs
    trivy image ghcr.io/myorg/myapp:$SHA
    trivy config ./mychart                          # scan chart templates for misconfigs

  Kubescape: Kubernetes security posture assessment
    kubescape scan framework nsa --helm-charts ./mychart

  Checkov: IaC security scanning
    checkov -d ./mychart --framework helm

  Integrate into CI: block merge/deploy if HIGH or CRITICAL CVEs found`,
      }
    ],
    quickFire: [
      { q: 'What is a Helm provenance file and what does it prove?', a: 'A .prov file created by helm package --sign contains three things: the Chart.yaml content, a SHA256 checksum of the chart .tgz, and an OpenPGP signature over both. Together these prove: (1) the chart bytes match the checksum (integrity — not corrupted or tampered), and (2) the publisher who signed it is who they say they are (authenticity — assuming you trust their key). helm install --verify or helm pull --verify checks both.' },
      { q: 'Why should Helm CI service accounts never use cluster-admin?', a: 'Cluster-admin gives the service account unrestricted access to all resources in all namespaces. If the CI system is compromised, an attacker has full cluster control. The minimum permissions for a namespace-scoped Helm deploy are: Secrets (for release tracking), plus the specific resource types the chart creates. Scope to the deployment namespace only.' },
      { q: 'What is the difference between helm-secrets + SOPS and External Secrets Operator?', a: 'They solve the same problem (keeping secrets out of plaintext Git) differently. SOPS encrypts secrets at rest in the Git repository — the encrypted file is in Git, decrypted at deploy time using a KMS key the CI role can access. External Secrets Operator never puts secrets in Git at all — it reads from AWS Secrets Manager, Vault, or GCP Secret Manager at runtime and creates Kubernetes Secrets. ESO is more cloud-native; SOPS is more Git-native.' },
      { q: 'How does Sigstore improve on GPG for chart signing?', a: 'GPG requires managing key pairs, distributing public keys, handling key rotation and revocation. Sigstore\'s keyless signing uses the signer\'s OIDC identity (GitHub Actions JWT, Google account) — no GPG key to manage. Signatures are published to Rekor, a tamper-evident transparency log, providing a public audit trail. Anyone can verify a signature without pre-sharing a public key.' },
      { q: 'What does Trivy check when scanning a Helm chart?', a: 'Trivy in Helm chart mode checks for security misconfigurations in the rendered manifests: containers running as root, missing securityContext, privileged containers, hostNetwork or hostPID usage, missing resource limits, dangerous capabilities. It also checks the referenced container images for known CVEs. Run trivy config ./mychart for misconfiguration scanning.' },
    ],
    introduction: `Helm security encompasses three distinct areas: supply chain security (ensuring the chart that reaches production is the one that was tested and signed), runtime security (RBAC scoping and least-privilege for Helm operators and deployed workloads), and secrets management (keeping sensitive configuration out of plaintext YAML and Git).

Supply chain security for Helm charts mirrors the broader container supply chain model. Charts should be signed at build time (GPG/PGP via helm package --sign or Sigstore via helm-sigstore), and consumers should verify signatures at install or pull time. For OCI-based distribution, provenance files are uploaded as additional OCI layers. Sigstore's keyless signing model (OIDC-based, published to the Rekor transparency log) is increasingly preferred over traditional GPG because it eliminates key management complexity.

RBAC scoping is non-negotiable for production Helm deployments. Helm stores release metadata in Kubernetes Secrets, so Helm operators need Secret CRUD access — which is powerful. Every CI service account should be namespace-scoped to its target environment with the minimum set of resource permissions the chart requires. Cluster-admin for a CI deploy account is a critical security misconfiguration.

Secrets in values files is the most common Helm security mistake. Values files are YAML committed to Git; putting passwords, API keys, or TLS certificates in values-prod.yaml creates a permanent record of sensitive data in version control history. The correct patterns are: External Secrets Operator (reads from Secrets Manager/Vault, creates Kubernetes Secrets, Helm chart only references the Secret by name), SOPS+helm-secrets (encrypts values in the file, committed to Git, decrypted by CI), or Sealed Secrets (encrypted Kubernetes Secret CRDs safe to commit to Git).`,
    whenToUse: [
      'Signing charts: any chart distributed to external users or across organizational boundaries',
      'RBAC review: before granting CI deploy permissions — always verify namespace-scope, never cluster-admin',
      'Secrets audit: when onboarding a chart to production — check every values.yaml for plaintext secrets',
      'CVE scanning: gate every chart/image on Trivy or Snyk scan results in the CI pipeline before push and before deploy',
    ],
    keyConcepts: [
      {
        term: 'Provenance file (.prov)',
        definition: 'Generated by helm package --sign. Contains Chart.yaml, SHA256 checksum of the .tgz, and an OpenPGP signature. Proves integrity (not tampered) and authenticity (signed by the expected key). Uploaded automatically by helm push as an additional OCI layer.',
      },
      {
        term: 'Sigstore / helm-sigstore',
        definition: 'Keyless signing alternative to GPG. The signer\'s OIDC identity (GitHub Actions JWT) is the key. Signatures are published to Rekor transparency log. No key management, no key rotation, public audit trail. Increasingly the preferred supply chain signing approach in 2026.',
      },
      {
        term: 'RBAC minimum for Helm CI',
        definition: 'Namespace-scoped Role (not ClusterRole) with: Secrets get/list/create/update/delete (release tracking), plus verbs on each resource type the chart creates. Bound via RoleBinding to the CI ServiceAccount. Never cluster-admin; never cluster-wide Secret access.',
      },
      {
        term: 'External Secrets Operator (ESO)',
        definition: 'Kubernetes controller that syncs secrets from AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, or HashiCorp Vault into Kubernetes Secrets. The chart references the Kubernetes Secret by name; the secret value never appears in Helm values or Git. Cloud-native, GitOps-compatible.',
      },
      {
        term: 'helm-secrets + SOPS',
        definition: 'Helm plugin that integrates with Mozilla SOPS. SOPS encrypts specific values in a YAML file using AWS KMS, GCP KMS, Azure Key Vault, or age/GPG keys. The encrypted file is committed to Git. At deploy time, the CI IAM role decrypts transparently: helm secrets upgrade ... -f secrets.yaml.',
      },
      {
        term: 'Trivy for Helm',
        definition: 'trivy config ./mychart scans rendered Helm templates for security misconfigurations: root containers, missing securityContext, privileged containers, missing resource limits. trivy image scans the referenced container images for CVEs. Both modes integrate into CI as blocking checks.',
      },
    ],
    approach: [
      'Chart signing: generate a GPG key pair, sign in CI with helm package --sign, publish the .prov file alongside the .tgz, document key distribution for consumers',
      'RBAC: create namespace-scoped Role per environment, bind to CI ServiceAccount, never cluster-admin',
      'Secrets audit: grep all values.yaml files for password, secret, key, token patterns; replace any findings with ESO references or SOPS-encrypted files',
      'CVE scanning: add trivy config ./chart and trivy image $IMAGE to CI, block on HIGH/CRITICAL findings',
      'values.schema.json: add pattern validation for fields that accept sensitive names to prevent accidental exposure',
    ],
    pitfalls: [
      'Storing secrets in values-prod.yaml and committing to Git — the value is permanently in Git history even after deletion',
      'Using base64-encoded values in values.yaml — base64 is encoding, not encryption; trivially reversible',
      'Cluster-admin for the CI Helm service account — if CI is compromised, attacker has full cluster control',
      'Not verifying chart signatures before install — a tampered chart in an OCI registry goes undetected',
      'Leaving Helm release Secrets accessible to all namespace users — release Secrets contain rendered values which may include configuration details',
    ],
    keyQuestions: [
      {
        question: 'How do you sign a Helm chart and verify it at install time?',
        answer: `Signing workflow (GPG-based):

1. Generate a GPG key pair (if not already done):
   gpg --full-generate-key

2. Sign at package time:
   helm package ./mychart --sign --key "My Release Key" --keyring ~/.gnupg/secring.gpg
   # Produces: mychart-1.4.2.tgz AND mychart-1.4.2.tgz.prov

3. Publish both files:
   helm push mychart-1.4.2.tgz oci://ghcr.io/myorg/charts
   # .prov file is uploaded automatically as an additional OCI layer

Verification workflow:

At pull time:
   helm pull oci://ghcr.io/myorg/charts/mychart --version 1.4.2 --verify --keyring /path/to/pubring.gpg

At install time:
   helm install myapp ./mychart-1.4.2.tgz --verify --keyring /path/to/pubring.gpg

Verification checks: SHA256 of the .tgz matches the checksum in .prov, and the OpenPGP signature in .prov validates against the provided keyring.

Sigstore alternative (keyless):
   helm plugin install https://github.com/sigstore/helm-sigstore
   # Signs with your OIDC identity (GitHub Actions JWT)
   # Publishes signature to Rekor transparency log
   # Verification requires no pre-distributed key — queries Rekor

In CI:
   - name: Sign and push chart
     run: |
       echo "$GPG_KEY_BASE64" | base64 -d | gpg --import
       helm package ./mychart --sign --key "$GPG_KEY_ID"
       helm push mychart-*.tgz oci://ghcr.io/myorg/charts`,
      },
      {
        question: 'Describe three approaches to secrets management in Helm and their trade-offs.',
        answer: `Approach 1: External Secrets Operator (ESO) — recommended for cloud-native

How it works: ExternalSecret CRD tells ESO where to fetch the secret (AWS Secrets Manager, Vault, GCP Secret Manager). ESO creates/syncs a Kubernetes Secret. The Helm chart references the Kubernetes Secret by name.

In chart template:
  envFrom:
    - secretRef:
        name: {{ .Release.Name }}-db-credentials

Pros: secrets never in Git, never in Helm values, centralized secret management
Cons: requires ESO controller installed in cluster, adds operational complexity

Approach 2: helm-secrets + SOPS — recommended for Git-centric teams

How it works: SOPS encrypts specific keys in a YAML file using KMS. Encrypted file committed to Git. CI decrypts at deploy time.

  helm secrets encrypt secrets.yaml
  git add secrets.yaml.enc && git commit
  helm secrets upgrade myapp ./chart -f values.yaml -f secrets.yaml.enc

Pros: GitOps-friendly (encrypted secrets in Git alongside configs), works with any KMS provider
Cons: requires SOPS setup, CI IAM role needs KMS decrypt permission

Approach 3: Sealed Secrets (Bitnami) — recommended for GitOps with Kubernetes secrets

How it works: SealedSecret CRD is encrypted with the cluster's public key. Only the in-cluster controller can decrypt. Commit SealedSecret YAML to Git.

  kubeseal --cert cluster.pem -f secret.yaml -w sealed-secret.yaml

Pros: pure GitOps (sealed secret manifest in Git), no external dependency at deploy time
Cons: cluster-specific (sealed secret for cluster A cannot be decrypted by cluster B)

The "wrong" approach: base64-encoded values in values-prod.yaml committed to Git. Base64 is encoding, not encryption — anyone with Git access can decode it instantly.`,
      },
      {
        question: 'What RBAC configuration does a Helm CI service account require, and why?',
        answer: `What Helm needs to manage releases:

Helm stores release state as Kubernetes Secrets in the target namespace. Every helm install/upgrade/rollback/uninstall reads and writes these Secrets. Therefore, the minimum RBAC for any Helm deployment service account is:

  apiVersion: rbac.authorization.k8s.io/v1
  kind: Role
  metadata:
    name: helm-deployer
    namespace: production
  rules:
    - apiGroups: [""]
      resources: ["secrets"]
      verbs: ["get", "list", "create", "update", "delete"]

Plus the permissions needed for the specific resources the chart creates:

    - apiGroups: ["apps"]
      resources: ["deployments"]
      verbs: ["get", "list", "create", "update", "delete", "patch"]
    - apiGroups: [""]
      resources: ["services", "configmaps", "serviceaccounts"]
      verbs: ["get", "list", "create", "update", "delete"]
    - apiGroups: ["networking.k8s.io"]
      resources: ["ingresses"]
      verbs: ["get", "list", "create", "update", "delete"]

Bind to the service account:
  apiVersion: rbac.authorization.k8s.io/v1
  kind: RoleBinding
  metadata:
    name: helm-deployer
    namespace: production
  roleRef:
    kind: Role
    name: helm-deployer
  subjects:
    - kind: ServiceAccount
      name: ci-deploy-sa
      namespace: production

Why namespace-scoped (Role + RoleBinding) not cluster-scoped:

A ClusterRole + ClusterRoleBinding grants permissions across ALL namespaces. If the CI system is compromised with namespace-scoped permissions, an attacker can only modify the production namespace. With cluster-scoped permissions, the attacker can modify every namespace, read all Secrets cluster-wide.

Common mistake: giving CI service accounts cluster-admin to make "everything work." This is the Helm 2 + Tiller anti-pattern — Tiller ran with cluster-admin by default, which is why Helm 2 had such a poor security reputation.`,
      },
      {
        question: 'How do you scan a Helm chart for security misconfigurations in CI?',
        answer: `Trivy (most widely used):

  # Scan chart templates for misconfigurations:
  trivy config ./mychart

  Trivy checks:
    - Containers running as root (no runAsNonRoot: true)
    - Missing securityContext
    - Privileged containers (securityContext.privileged: true)
    - Containers with hostNetwork, hostPID, hostIPC
    - Missing resource limits
    - Dangerous capabilities (NET_ADMIN, SYS_ADMIN, etc.)
    - readOnlyRootFilesystem not set

  # Scan container image for CVEs:
  trivy image ghcr.io/myorg/myapp:$SHA --severity HIGH,CRITICAL

  CI integration (block on findings):
    - name: Trivy chart scan
      run: trivy config ./mychart --exit-code 1 --severity HIGH,CRITICAL
    - name: Trivy image scan
      run: trivy image $IMAGE --exit-code 1 --severity CRITICAL

Checkov (Bridgecrew):
  checkov -d ./mychart --framework helm

Kubescape:
  kubescape scan framework nsa ./mychart

In CI pipeline positioning:
  1. helm lint (syntax and structure)
  2. trivy config ./chart (security misconfigs)
  3. helm template | kubeconform (schema validation)
  4. trivy image $IMAGE (CVE scan on container image)
  5. helm upgrade --install --atomic (deploy)
  6. helm test (smoke test)

Steps 1-4 run in PR checks (pre-merge). Steps 5-6 run in CD (post-merge). This pattern shifts security findings as left as possible.`,
      },
      {
        question: 'What are the supply chain security risks specific to using public Helm charts?',
        answer: `Public Helm charts (Artifact Hub, Bitnami, ingress-nginx, cert-manager) introduce supply chain risks that differ from building your own:

Risk 1: Version pinning drift
Unpinned dependencies (version: ">=13.0.0") pull the latest matching version on helm dependency update. A compromised or malicious patch release is pulled automatically.
Mitigation: pin exact versions (version: "13.2.0"), commit Chart.lock, use helm dependency build in CI.

Risk 2: Compromised upstream chart
A maintainer's credentials are stolen; a malicious chart version is published to the upstream repository.
Mitigation: verify chart signatures (helm install --verify), use OCI digest references (@sha256:...), pin versions and review changelogs before upgrading.

Risk 3: Malicious container images in public charts
Public charts reference container images from Docker Hub. Docker Hub image tags are mutable — the same tag can be overwritten with a malicious image.
Mitigation: pin images by digest in your values override (image.digest: sha256:abc instead of image.tag: latest), or use a registry mirror with vulnerability scanning.

Risk 4: Dependency confusion
A public chart references a private registry that doesn't exist. An attacker publishes a malicious package with the same name at a higher version in the public registry.
Mitigation: use OCI-based dependencies with explicit registry URLs, not name-only references.

Risk 5: Abandoned charts
A popular chart's maintainer stops releasing security patches. The chart continues deploying software with known CVEs.
Mitigation: run trivy image on chart container references in CI, track upstream release cadence.

Production practices:
- Maintain a private registry mirror of approved public charts (Harbor, Artifactory)
- Run Trivy scans on all public chart images before allowing into production
- Subscribe to upstream security advisories for critical charts (cert-manager, ingress-nginx)
- Document approved chart versions and require PR review for upgrades`,
      },
      {
        question: 'How does Helm 4\'s server-side apply affect security posture?',
        answer: `Helm 4 (November 2025) switched from client-side apply (kubectl apply) to server-side apply (SSA) by default. This has direct security implications.

Security-positive changes:

1. Conflict detection: if a security policy enforcer (OPA/Gatekeeper, Kyverno) mutates a field that Helm owns, SSA detects the ownership conflict on the next upgrade. Previously with client-side apply, Helm could silently overwrite webhook mutations.

2. Admission webhook always engaged: SSA always triggers admission webhooks. Some edge cases with client-side apply could miss webhook triggers.

3. Better audit trail: SSA field managers appear in the managedFields section of every resource. Security audit tools can see exactly which fields Helm changed (helm field manager) vs other tools.

Security-challenging changes:

1. Field manager conflicts: charts that set fields that security policies also control produce conflicts. In environments where Kyverno or OPA injects fields, SSA makes this explicit as an error rather than a silent overwrite.

2. --force-conflicts flag: when used to resolve conflicts, Helm takes ownership of fields away from security policy controllers. This should require explicit approval.

Migration impact: most Helm 3 charts work in Helm 4 with SSA, but charts that apply the same field twice (common in umbrella chart patterns) may surface conflicts.

For platform engineers: test Helm 4 in staging with SSA enabled, watch for field ownership conflicts with existing admission webhooks and kubectl edit workflows, and update runbooks to use helm upgrade --force-conflicts only when Helm should legitimately take ownership back from a security policy.`,
      },
    ],
    references: [
      'https://helm.sh/docs/topics/provenance/',
      'https://helm.sh/docs/topics/rbac/',
      'https://external-secrets.io/',
      'https://github.com/jkroepke/helm-secrets',
      'https://aquasecurity.github.io/trivy/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 11. Helm 4 Migration
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'helm-4-migration',
    title: 'Helm 4 Migration',
    icon: 'arrowRight',
    color: '#7c3aed',
    questions: 5,
    description: 'What changed in Helm 4 (November 2025): server-side apply, improved Secrets-based release storage, namespace isolation, and breaking changes for migrating from Helm 3.',
    visualizations: [
      {
        title: 'Helm 3 vs Helm 4 — key architectural changes',
        image: '/diagrams/devops/helm-11-migration.png',
        description: `Helm 4 was released at KubeCon NA November 2025. Stable version 4.2.2 as of 2026.

Key changes from Helm 3 to Helm 4:

CHANGE 1 — Server-side apply (SSA) as the default:
  Helm 3: uses client-side apply (kubectl apply --client-side-apply logic)
           Helm merges the current resource state with the new manifest locally
  Helm 4: uses server-side apply (field-manager: helm)
           The Kubernetes API server handles merge logic using managedFields

  Impact:
    + Conflict detection: if another tool modified a field, SSA detects ownership conflict
    + Better validation: admission webhooks always engaged
    + Webhook mutations respected: Helm no longer silently overwrites webhook mutations
    - Field manager conflicts: charts that set the same field twice fail with conflict errors
    - Breaking for multi-owner scenarios: charts and admission webhooks both owning a field

  Migration: audit charts for duplicate field assignments, test in staging with SSA enabled
  Escape hatch: --force-conflicts flag for conflict resolution

CHANGE 2 — Release metadata improvements:
  Helm 3: release state in Secrets (kind: helm.sh/release.v1) per namespace
  Helm 4: same Secret-based storage, but improved namespace isolation and
           release metadata format changes (additional fields for SSA tracking)

  Impact: helm get values / manifest still works; no migration of existing releases needed

CHANGE 3 — Removed deprecated features:
  helm install --use-deprecated-chartapi: removed
  Old Helm 2 chart format (apiVersion: v1 only features): reduced support
  Some deprecated CLI flags removed
  Old ChartMuseum client code removed (OCI is the standard now)

CHANGE 4 — Go SDK and plugin API changes:
  Helm Go SDK (helm.sh/helm/v4): breaking changes from v3 for plugin authors
  Library chart imports: import path changes from helm.sh/helm/v3 to helm.sh/helm/v4

Migration checklist from Helm 3 to Helm 4:
  [ ] Test with SSA enabled in staging (watch for field ownership conflicts)
  [ ] Audit charts for deprecated APIs (apiVersion v1 usage)
  [ ] Update Helm plugins to v4-compatible versions
  [ ] Update Go SDK imports if you maintain internal tools using helm SDK
  [ ] Review CI commands for removed flags
  [ ] Test pre-upgrade hooks with SSA (hook Job field ownership)
  [ ] Upgrade one cluster at a time; run both Helm 3 and 4 in parallel during transition`,
      }
    ],
    quickFire: [
      { q: 'What is the biggest breaking change in Helm 4?', a: 'Server-side apply (SSA) as the default. Helm 4 uses SSA instead of client-side apply, meaning the Kubernetes API server handles field merge logic and tracks field ownership via managedFields. This creates field manager conflicts when another tool (kubectl edit, Argo CD, admission webhook) has set a field that Helm tries to own. Existing Helm 3 charts that set fields in a way that conflicts with SSA semantics need to be updated.' },
      { q: 'Does Helm 4 change how release state is stored?', a: 'No — release state is still stored as Kubernetes Secrets (kind: helm.sh/release.v1) in the target namespace. The Secret format has additional metadata fields for SSA tracking, but the overall storage model is unchanged. Existing Helm 3 releases do not need migration when upgrading the Helm CLI.' },
      { q: 'What is a field manager conflict and how do you resolve it?', a: 'When Helm 4 tries to apply a field that is owned by a different manager (kubectl, another controller, an admission webhook), SSA returns a conflict error: "Apply failed with X conflicts." Resolution options: (1) use --force-conflicts to have Helm take ownership; (2) remove the conflicting manager\'s ownership with kubectl apply --server-side --force-conflicts; (3) restructure the chart to not set that field (let the webhook always control it).' },
      { q: 'Are Helm 3 charts compatible with Helm 4?', a: 'Most Helm 3 charts (apiVersion: v2) work in Helm 4 with no changes. Breaking scenarios: charts that use deprecated Helm 3 CLI flags, charts using Helm 2-only features (apiVersion: v1 with requirements.yaml instead of Chart.yaml dependencies), and charts where the same field is set by both the chart template and an admission webhook (SSA conflict).' },
      { q: 'Should I migrate all clusters to Helm 4 at once?', a: 'No. Migrate one cluster at a time. Test Helm 4 in dev and staging first. Run parallel: keep Helm 3 for existing releases, use Helm 4 for new releases, verify both coexist (they use the same Secret storage format). Upgrade existing releases from Helm 3 to Helm 4 one at a time after verifying compatibility.' },
    ],
    introduction: `Helm 4.0 was released at KubeCon North America in November 2025, with the stable 4.2.2 release available in early 2026. The headline change is the adoption of server-side apply (SSA) as the default, replacing the client-side apply model used since Helm 3.

Server-side apply fundamentally changes how Kubernetes reconciles the resources Helm manages. In Helm 3, Helm computed the three-way merge locally (current state + last applied + new desired) and sent the result to the API. In Helm 4, Helm sends the desired state and the API server handles the merge, tracking field ownership via the managedFields mechanism. This is more correct and aligns with how other Kubernetes controllers (Argo CD, Flux, kubectl) work.

The practical impact is that Helm 4 is more strict about field ownership. Charts that set a field that another manager (a MutatingAdmissionWebhook, kubectl edit, Argo CD) has also set will produce a field manager conflict error. This surfaces problems that Helm 3 silently worked around (overwriting webhook mutations, ignoring drift from manual edits) — now they must be explicitly resolved.

For engineers migrating from Helm 3, the key steps are: audit for field ownership conflicts (test in staging with SSA, watch for conflict errors), update any internal tooling using the Helm Go SDK (import paths changed from v3 to v4), update plugins to v4-compatible versions, and remove usage of deprecated CLI flags. For most teams running standard third-party charts (Bitnami, ingress-nginx, cert-manager) that have already published Helm 4 compatible versions, the migration is largely transparent.`,
    whenToUse: [
      'Planning a Helm version upgrade: understand SSA implications before upgrading production clusters',
      'Debugging conflict errors: understanding field manager ownership is necessary to resolve SSA conflicts',
      'Writing new charts: Helm 4 SSA behavior should inform how you structure chart templates',
      'Evaluating Argo CD + Helm 4 compatibility: both use SSA, which requires careful field manager coordination',
    ],
    keyConcepts: [
      {
        term: 'Server-side apply (SSA)',
        definition: 'Helm 4\'s default apply strategy. The Kubernetes API server handles resource merging using managedFields. Provides conflict detection (another manager owns a field), better admission webhook engagement, and more correct reconciliation semantics than Helm 3\'s client-side apply.',
      },
      {
        term: 'Field manager conflict',
        definition: 'Error produced by SSA when Helm tries to set a field that is tracked as owned by a different manager. Resolved by: --force-conflicts (Helm takes ownership), restructuring the chart to not set the conflicting field, or removing the competing manager\'s ownership.',
      },
      {
        term: 'managedFields',
        definition: 'Kubernetes object metadata field that SSA populates. Records which field manager last set each field. Shows up in kubectl get -o yaml output. Helm 4 sets field-manager: helm. Used by SSA for conflict detection and audit.',
      },
      {
        term: 'Helm SDK v4 (helm.sh/helm/v4)',
        definition: 'The Go SDK import path for Helm 4. Breaking from v3 (helm.sh/helm/v3). Plugin authors and internal tooling that imports the Helm SDK must update import paths. Helm 3 and 4 CLIs can coexist (different binaries); SDK code must pick one.',
      },
      {
        term: 'apiVersion: v2 chart compatibility',
        definition: 'Helm 3 charts using apiVersion: v2 are compatible with Helm 4 for most cases. Charts using apiVersion: v1 (Helm 2 legacy) or requiring Helm 2-specific features (requirements.yaml separate file) require chart updates before Helm 4 deployment.',
      },
    ],
    approach: [
      'Install helm 4 binary alongside helm 3 (rename one, e.g., helm4) for parallel testing',
      'Run helm4 template on existing charts and compare output to helm3 template — check for rendering differences',
      'Deploy to a staging namespace with helm4 upgrade --install and watch for SSA conflict errors',
      'Identify and resolve field ownership conflicts: use --force-conflicts or restructure templates',
      'Update any in-house tools that import helm.sh/helm/v3 to helm.sh/helm/v4',
      'Update Helm plugins to v4 compatible versions before switching production clusters',
    ],
    pitfalls: [
      'Upgrading production clusters to Helm 4 without testing SSA in staging — SSA conflicts surface as hard errors in production',
      'Assuming all third-party charts are Helm 4 ready — verify the chart version supports SSA before upgrading',
      'Running helm diff (databus23/helm-diff) with Helm 4 without verifying plugin compatibility — plugin API changed in v4',
      'Mixing Helm 3 and Helm 4 on the same release — the CLI changed but Secret format is compatible; using both on one release causes confusion about which CLI version to use for rollback',
    ],
    keyQuestions: [
      {
        question: 'Explain server-side apply and how it changes the Helm upgrade behavior.',
        answer: `Client-side apply (Helm 3):
Helm downloads the current resource state, merges it with the last-applied configuration and the new desired state (three-way merge), and sends the merged result to the Kubernetes API via PATCH or CREATE. The merge logic runs in the Helm client, not in the API server.

Problem: if an admission webhook mutated a field after Helm applied it, the next helm upgrade would overwrite the mutation because Helm's local merge didn't know about it.

Server-side apply (Helm 4 default):
Helm sends the desired state to the Kubernetes API server with an Apply operation and its manager name (field-manager: helm). The API server handles the merge using the managedFields ownership model. Each field has exactly one "owner." If Helm owns a field and sends a new value, it applies. If another manager owns a field and Helm tries to set it, the API server returns a conflict error.

Practical differences:

1. Webhook mutation respect: if a MutatingAdmissionWebhook sets securityContext.runAsUser: 1000 and tracks that field, Helm 4 detects the conflict and either errors (safe) or respects the webhook's ownership (correct behavior). Helm 3 would silently overwrite it on next upgrade.

2. Conflict visibility: SSA makes "who owns this field" explicit and debuggable via kubectl get -o yaml (check managedFields). Previously, silent overwrites caused mysterious configuration drift.

3. Admission webhook always runs: SSA always triggers admission webhooks.

--force-conflicts:
helm upgrade myapp ./chart --force-conflicts makes Helm take ownership of all fields it sends, even if another manager currently owns them. Use when you intentionally want Helm to be the authoritative source for a field.

Migration guidance: test SSA in staging before production. Charts that are well-written (don't set fields they don't need to control) are typically unaffected.`,
      },
      {
        question: 'What are the breaking changes in Helm 4 that a platform team needs to address before migrating?',
        answer: `Breaking change 1: Default SSA
All helm upgrade calls use server-side apply. Charts and workflows that depend on client-side apply behavior (e.g., Helm overwriting admission webhook mutations) will break.

Action: test every chart in staging with Helm 4, watch for "Apply failed with X conflicts" errors. Resolve by: --force-conflicts, restructuring charts to not set conflicting fields, or coordinating with webhook policies.

Breaking change 2: Helm SDK import paths
Any Go code importing the Helm SDK must change import paths from helm.sh/helm/v3 to helm.sh/helm/v4. Packages and function signatures may also have changed.

Action: audit all internal tools and CI scripts that use the Helm SDK. Run go mod tidy after updating imports.

Breaking change 3: Plugin API changes
Helm plugins using pre-4 lifecycle hooks or SDK functions need updates. Popular plugins (helm-diff, helm-secrets, helm-push) have v4 compatible versions.

Action: before upgrading clusters, verify every installed plugin has a Helm 4 compatible release. Run helm plugin list and check each plugin's GitHub releases.

Breaking change 4: Removed deprecated CLI flags
Some flags deprecated in Helm 3 are removed in Helm 4. Check CI scripts for any deprecated flags.

Non-breaking (but worth knowing):
- Existing Helm 3 release Secrets are read by Helm 4 (compatible format)
- apiVersion: v2 charts still work
- Chart templates (Go templates, Sprig) unchanged
- Most Bitnami and official charts have Helm 4 compatible releases

Migration timeline recommendation:
Month 1: test in dev cluster, identify chart and plugin issues
Month 2: migrate staging cluster, run full regression
Month 3: migrate production clusters one at a time
Keep Helm 3 binary available for rollback for 3+ months after production migration`,
      },
      {
        question: 'How do you debug and resolve field manager conflicts in Helm 4?',
        answer: `Identifying the conflict:
helm upgrade myapp ./chart produces:
  Error: UPGRADE FAILED: Apply failed with 2 conflicts:
  - conflict with "kubectl-client-side-apply" using apps/v1: .spec.template.spec.containers[0].resources.limits.cpu
  - conflict with "kyverno" using v1: .spec.template.spec.securityContext.runAsUser

The error shows: the conflicting field path and which field manager owns it.

Step 1: Inspect managedFields in the live resource:
  kubectl get deployment myapp -o yaml | grep -A 100 managedFields

This shows which manager (kubectl-client-side-apply, helm, kyverno, argo-cd) owns which fields.

Step 2: Understand why the conflict exists:
- kubectl-client-side-apply: someone ran kubectl edit or kubectl apply on this resource outside of Helm
- kyverno / OPA Gatekeeper: a policy controller is setting the field (intentional)
- argo-cd: Argo CD and Helm are both trying to manage the same resource

Resolution options:

Option A: Helm takes ownership (--force-conflicts):
  helm upgrade myapp ./chart --force-conflicts
  Helm overwrites the conflicting manager's ownership. Use when Helm should be authoritative.

Option B: Remove the competing manager's field ownership:
  kubectl apply --server-side --force-conflicts -f current-resource.yaml --field-manager helm

Option C: Remove the field from the Helm chart template:
  If a webhook should always control securityContext.runAsUser, remove it from the chart template.

Best practice: resolve by removing conflicting fields from chart templates (Option C) rather than force-conflicting (Option A). Force-conflict takes ownership away from policies that may be there for security reasons.`,
      },
      {
        question: 'What does the Helm 4 migration path look like for a team running 50+ charts in production?',
        answer: `Structured migration for a large-scale Helm estate:

Phase 1: Assessment (2-4 weeks)

Inventory:
  helm list -A -o json | jq '.[].chart' | sort | uniq -c | sort -rn
  # List all chart names and versions across all clusters

Plugin inventory:
  helm plugin list
  # Check each plugin against its Helm 4 compatibility matrix

SDK usage audit:
  grep -r "helm.sh/helm/v3" internal-tools/ --include="*.go"

Chart compatibility scan:
  helm4 template <chart> --dry-run for each chart

Phase 2: Staging migration (4-6 weeks)

Upgrade one staging cluster to Helm 4 binary only.
Redeploy each chart using helm4 upgrade --install and capture conflicts.
For each conflict, determine resolution (--force-conflicts, chart update, or policy coordination).

Phase 3: Production migration (rolling, 4-8 weeks)

Migrate clusters one at a time, starting with least-critical.
Keep helm3 binary available in CI alongside helm4 for rollback.
Monitor for 1 week after each cluster migration.
Update runbooks to reference helm4 commands.

Risk mitigation:
- Never upgrade all clusters simultaneously (blast radius)
- Keep Helm 3 binary in CI for at least 3 months after full migration
- Helm 3 and Helm 4 CLIs can both manage the same release (compatible Secret format)
- For charts you own: test each with SSA, fix conflicts, release a "Helm 4 compatible" version
- For third-party charts: most major charts (cert-manager, ingress-nginx, Bitnami) released Helm 4 compatible versions in Q1 2026`,
      },
      {
        question: 'What is the status of Helm 3 and what is the support timeline?',
        answer: `As of 2026, Helm 3 is still actively deployed and widely used. Helm 4 is stable at 4.2.2 but the ecosystem is in a transition period.

Current status:
- Helm 4.2.2: stable, current recommended version for new deployments
- Helm 3.x: still maintained, receiving critical security patches but no new features
- Helm 2: End of Life November 2020 — not supported, known security issues, do not use

Ecosystem adoption:
- Most major charts (Bitnami, ingress-nginx, cert-manager, prometheus-community) have Helm 4 compatible releases
- Argo CD has Helm 4 support in its chart rendering pipeline
- Flux helm-controller added Helm 4 SDK support
- The helm-diff, helm-secrets plugins have Helm 4 compatible versions

What Helm 3 charts do in Helm 4:
- apiVersion: v2 charts: work in Helm 4 (most Helm 3 charts)
- apiVersion: v1 charts (Helm 2 legacy): may work with warnings; test before relying on them

Migration urgency:
For most teams, Helm 3 is still reliable for existing deployments. Helm 4 is the right choice for:
- New clusters being provisioned in 2026
- Charts being actively developed (build for Helm 4 from the start)
- Teams who need SSA benefits (conflict detection, webhook respect)

For existing Helm 3 estates: plan migration but don't rush. Test in staging, migrate methodically.

Interview framing: knowing that Helm 4 exists, what it changed (SSA), and what the migration involves signals current knowledge. Knowing Helm 2 is dead (Tiller removed in Helm 3, EOL 2020) signals security awareness.`,
      },
    ],
    references: [
      'https://helm.sh/docs/',
      'https://helm.sh/blog/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 12. Production Patterns
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'helm-production-patterns',
    title: 'Production Patterns',
    icon: 'server',
    color: '#7c3aed',
    questions: 6,
    description: 'Structuring Helm for real multi-service estates: Helmfile for multi-chart orchestration, umbrella charts, library charts, drift detection, and rollback strategy at scale.',
    visualizations: [
      {
        title: 'Helmfile, umbrella charts, and library charts for production estates',
        image: '/diagrams/devops/helm-12-production.png',
        description: `Pattern 1 — Helmfile (multi-release declarative orchestration):
  Helmfile manages multiple Helm releases as a single unit.
  Single YAML file declares all releases, their charts, versions, and values.
  Commands: helmfile sync, helmfile apply (diff then apply), helmfile diff.

  helmfile.yaml:
    environments:
      production:
        values:
          - production.yaml

    releases:
      - name: ingress-nginx
        namespace: ingress-nginx
        createNamespace: true
        chart: ingress-nginx/ingress-nginx
        version: 4.9.0

      - name: cert-manager
        namespace: cert-manager
        createNamespace: true
        chart: jetstack/cert-manager
        version: v1.14.4
        set:
          - name: installCRDs
            value: true

      - name: myapp
        namespace: production
        chart: oci://ghcr.io/myorg/charts/myapp
        version: 1.4.2
        values:
          - values/myapp-prod.yaml
        needs:
          - ingress-nginx/ingress-nginx    # dependency ordering

  helmfile apply     # diff then apply all releases
  helmfile diff      # show what would change across all releases
  helmfile sync      # apply without diff prompt

Pattern 2 — Umbrella chart (single chart wraps multiple services):
  charts/platform/Chart.yaml:
    name: platform
    version: 1.0.0
    dependencies:
      - name: frontend
        version: ">=1.0.0"
        repository: "oci://ghcr.io/myorg/charts"
      - name: api
        version: ">=2.0.0"
        repository: "oci://ghcr.io/myorg/charts"
      - name: worker
        version: ">=1.0.0"
        repository: "oci://ghcr.io/myorg/charts"

  Single helm install platform ./charts/platform deploys all three services.
  Single helm rollback reverts all three simultaneously.
  Use case: local dev or per-PR review environments.
  Avoid in production for independent services — couples release cycles.

Pattern 3 — Library chart (shared helpers):
  charts/common/
  Chart.yaml: type: library
  templates/_helpers.tpl   # named templates only, no resources

  Application charts declare as dependency:
    dependencies:
      - name: common
        version: "1.2.0"
        repository: "oci://ghcr.io/myorg/charts"

  Use in application templates:
    metadata:
      labels:
        {{- include "common.labels.standard" . | nindent 4 }}

  Platform-wide changes (add a required annotation) = update library chart version,
  bump dependency in all application charts.

Drift detection:
  helm diff upgrade <release> ./chart -f values.yaml   # what changed vs live cluster
  kubectl diff -f <(helm template <release> ./chart -f values.yaml)  # live diff

  For GitOps: Argo CD and Flux report sync status (Synced/OutOfSync) as the drift indicator.
  Proactive: run helmfile diff in a scheduled CI job and alert on unexpected drift.

Rollback strategy:
  Per-service rollback: helm rollback <release> <revision>
  Multi-service: helmfile rollback (reverts all releases to last known good state)
  GitOps rollback: git revert the offending commit; controller reconciles
  Database-aware rollback: rollback application revision, then run reverse migration Job`,
      }
    ],
    quickFire: [
      { q: 'What is Helmfile and when would you use it over plain Helm?', a: 'Helmfile is a declarative configuration tool for managing multiple Helm releases. A single helmfile.yaml declares all releases with their charts, versions, values, and ordering dependencies. helmfile sync deploys all releases, helmfile diff shows pending changes across all, and helmfile apply diffs then deploys. Use it when managing 5+ charts that are deployed together (an environment) and you want a single command to bring up or update the entire stack. Plain Helm is sufficient for individual services deployed independently.' },
      { q: 'What is an umbrella chart and what problem does it create in production?', a: 'An umbrella chart is a parent chart that has multiple application services as sub-chart dependencies. A single helm install deploys all services. It is useful for dev environments (one command to bring up the full stack) or per-PR review environments. In production it is an anti-pattern for independently deployed services because it couples their release cycles — upgrading one service requires upgrading the umbrella, which can pull in other services unintentionally. Use separate releases per service in production.' },
      { q: 'How do library charts help a platform team?', a: 'Library charts (type: library) package reusable named template definitions — standard label sets, resource naming conventions, sidecar injection specs. Application charts declare them as dependencies and call their named templates. When the platform decides to add a required annotation to all workloads, you update the library chart once and bump the dependency version in application charts. Without library charts, the same template code is copy-pasted across every chart and changes require updating each one.' },
      { q: 'What is the GitOps rollback model and how does it differ from helm rollback?', a: 'In GitOps (Argo CD or Flux), rollback is a git revert of the commit that changed the chart version or values. The controller reconciles the cluster to the previous Git state. This is fully auditable and reversible. helm rollback restores the manifests from a release Secret revision without touching Git — useful for emergency rollback but creates a gap between Git state and cluster state that must be reconciled afterward. For GitOps environments, always rollback via Git, not helm rollback.' },
      { q: 'How do you detect drift in a Helm-managed cluster?', a: 'Three methods. First, helm diff upgrade <release> ./chart -f values.yaml shows the diff between the current cluster state and what helm upgrade would apply — any difference indicates drift. Second, for GitOps, Argo CD and Flux report OutOfSync status when the cluster state diverges from the declared state. Third, run kubectl diff -f <(helm template <release> ./chart -f values.yaml) as a scheduled CI job and alert on non-zero output.' },
    ],
    introduction: `Running Helm at scale in production requires patterns that go beyond single-chart deployments. Real platform engineering involves tens to hundreds of charts across multiple clusters, coordinated releases between dependent services, shared configuration that must be consistent across the entire estate, and rollback strategies that account for database state and service dependencies.

Helmfile addresses the "manage multiple releases together" problem. Where Helm manages a single release, Helmfile manages a collection of releases as a unit with explicit dependency ordering, shared environment values, and diff-before-apply workflows. A helmfile.yaml is the declarative description of an entire environment's Helm state.

Umbrella charts solve a different problem: bundling multiple charts into a single installable unit. This is valuable for dev environments (one command to bring up the full stack) but harmful for production services that should have independent release lifecycles. Understanding when to use umbrella charts and when to avoid them is a platform engineering judgment call that frequently comes up in interviews.

Library charts are the platform-level abstraction for shared Helm templates. They eliminate copy-paste across application charts, centralize platform standards (resource naming, required labels, standard sidecar specs), and enable platform-wide changes with a single library chart version bump.

Drift detection and rollback strategy close the operational loop. Knowing that helm diff, Argo CD OutOfSync status, and scheduled kubectl diff all serve the drift detection role — and understanding the difference between helm rollback (from release Secret), git revert (for GitOps), and database-aware rollback sequences — separates practitioners who understand Helm in production from those who understand only the basics.`,
    whenToUse: [
      'Helmfile: managing 5+ charts deployed together as a cohesive environment',
      'Umbrella charts: local dev and per-PR review environments where the full stack is needed',
      'Library charts: platform teams standardizing labeling, naming, sidecar injection across many application charts',
      'Drift detection: as a scheduled CI job for non-GitOps clusters, or via GitOps controller sync status',
    ],
    keyConcepts: [
      {
        term: 'Helmfile',
        definition: 'Declarative multi-release management tool. helmfile.yaml declares all releases with charts, versions, values, and ordering dependencies. helmfile sync/apply/diff operates on the full set. The Helm equivalent of a docker-compose.yml but for Kubernetes releases.',
      },
      {
        term: 'Umbrella chart',
        definition: 'A parent chart that declares multiple application charts as sub-chart dependencies. Useful for dev environment spin-up; harmful for production services with independent release cycles. Couples deployment of unrelated services and inflates blast radius of chart upgrades.',
      },
      {
        term: 'Library chart',
        definition: 'A chart with type: library containing only named template definitions. Not directly installable. Used as a dependency by application charts to share standard template patterns. Platform-wide changes (add a required annotation) require only one library chart update.',
      },
      {
        term: 'Drift detection',
        definition: 'Identifying when the running cluster state diverges from the Helm-declared state. Methods: helm diff upgrade (shows what upgrade would change), Argo CD/Flux OutOfSync status (GitOps), kubectl diff against helm template output (scheduled CI job). Drift indicates manual changes or controller mutations.',
      },
      {
        term: 'GitOps rollback vs helm rollback',
        definition: 'GitOps rollback: git revert the commit that made the change; controller reconciles cluster to previous Git state. Fully auditable, maintains Git as source of truth. helm rollback: restores manifests from a release Secret revision without changing Git — creates Git/cluster divergence. For GitOps environments, always use git revert.',
      },
      {
        term: 'Database-aware rollback',
        definition: 'Rollback strategy that accounts for schema migrations: first rollback the application chart revision (to restore old code), then run a reverse migration Job (to restore the previous schema). Requires forward-compatible migrations or explicit rollback migration scripts.',
      },
    ],
    approach: [
      'For a new environment: start with individual helm upgrade --install commands, graduate to Helmfile when managing 5+ charts',
      'Library charts: identify the top 5 template patterns copy-pasted across your chart collection, extract to a library chart',
      'Umbrella charts: build one for local dev (makes onboarding fast), keep production as individual releases',
      'Drift detection: add a weekly CI job that runs helmfile diff across all releases and pages on unexpected output',
      'Rollback runbook: document the rollback sequence for each service that has a database dependency (app rollback first, migration rollback second)',
    ],
    pitfalls: [
      'Using umbrella charts in production for independently maintained services — couples release cycles and inflates blast radius',
      'Not using needs: ordering in Helmfile — ingress-nginx must be up before app services that declare Ingress resources',
      'Treating helm rollback as the only rollback mechanism in a GitOps environment — it bypasses Git and creates source of truth divergence',
      'Library chart over-abstraction — wrapping every template detail in a library makes individual charts hard to understand without tracing through the library',
      'Not accounting for database state in rollback runbooks — rolling back application code without rolling back the schema produces a mismatched state that neither the old nor new code can handle',
    ],
    keyQuestions: [
      {
        question: 'How does Helmfile improve on plain Helm for managing a full environment?',
        answer: `Plain Helm manages one release at a time. For an environment with 15 charts (ingress-nginx, cert-manager, external-dns, prometheus-stack, grafana, Vault, 8 application services), plain Helm requires 15 separate commands with no coordination.

Helmfile solves this with a single helmfile.yaml that declares all releases:

  releases:
    - name: ingress-nginx
      namespace: ingress-nginx
      chart: ingress-nginx/ingress-nginx
      version: 4.9.0
      needs: []               # no dependencies

    - name: myapp
      namespace: production
      chart: oci://ghcr.io/myorg/charts/myapp
      version: 1.4.2
      needs:
        - ingress-nginx/ingress-nginx    # wait for ingress before app
        - cert-manager/cert-manager      # wait for TLS before app

Commands:
  helmfile sync              # deploy all releases (parallel where dependency allows)
  helmfile diff              # show pending changes for all releases
  helmfile apply             # diff, then prompt before applying
  helmfile destroy           # uninstall all releases
  helmfile -l name=myapp sync   # operate on one release only

Dependency ordering: the needs: field ensures ingress-nginx is healthy before myapp is installed. Without ordering, myapp's Ingress resource would fail admission if the ingress controller isn't ready.

Environment values: Helmfile supports environment-specific values files applied to all or specific releases, keeping per-environment overrides centralized.

Compared to Terraform: Helmfile is for Helm releases what Terraform is for infrastructure — declarative, diff-before-apply, dependency-aware. Many teams use both: Terraform provisions the cluster infrastructure, Helmfile manages the Kubernetes applications.

Limitation: Helmfile is a separate tool from Helm. It must be installed alongside helm. For GitOps with Argo CD or Flux, ApplicationSet (Argo CD) or Kustomize-managed HelmRelease manifests (Flux) can replace Helmfile.`,
      },
      {
        question: 'Design a library chart for a platform team managing 30+ application charts.',
        answer: `Design goals: standardize labeling, resource naming, sidecar injection, and resource defaults across all charts without copy-paste.

Library chart structure (charts/common/):

  Chart.yaml:
    apiVersion: v2
    name: common
    version: 2.1.0
    type: library
    description: Shared Helm templates for the platform

  templates/_labels.tpl:
    {{- define "common.labels.standard" -}}
    app.kubernetes.io/name: {{ .Chart.Name }}
    app.kubernetes.io/instance: {{ .Release.Name }}
    app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
    app.kubernetes.io/managed-by: {{ .Release.Service }}
    platform.myorg.io/team: {{ required "Values.team is required" .Values.team }}
    platform.myorg.io/env: {{ .Values.environment | default "unknown" }}
    {{- end }}

  templates/_naming.tpl:
    {{- define "common.fullname" -}}
    {{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
    {{- end }}

  templates/_securityContext.tpl:
    {{- define "common.securityContext.nonroot" -}}
    runAsNonRoot: true
    runAsUser: 65534
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    capabilities:
      drop: [ALL]
    {{- end }}

Application chart usage:

  # In application Chart.yaml:
  dependencies:
    - name: common
      version: "2.x.x"
      repository: "oci://ghcr.io/myorg/charts"

  # In application deployment.yaml:
  metadata:
    labels:
      {{- include "common.labels.standard" . | nindent 4 }}
  spec:
    template:
      spec:
        containers:
          - name: app
            securityContext:
              {{- include "common.securityContext.nonroot" . | nindent 14 }}

Governance: when a new platform requirement is added (e.g., add environment label to all pods), update common library chart, bump to 2.2.0, and update all application charts' dependency version. One PR to the library, 30 PRs to bump the dependency version. Alternative: use a semver range ("2.x.x") in application charts so helm dependency update pulls the latest compatible version automatically.`,
      },
      {
        question: 'What is your rollback strategy for a Helm deployment that includes a database migration?',
        answer: `The key challenge: database migrations are often not automatically reversible, and rolling back application code without rolling back the schema leaves the system in an inconsistent state.

Forward-compatible migration strategy (best approach):
Design migrations so that both old and new application code work against the new schema:
1. Deploy new schema (add columns, add indexes — never rename/remove in the same deploy as code)
2. Deploy new application code
3. Remove old columns/indexes in a separate subsequent deploy after all instances are on new code

If the new code deploy fails: roll back code to old version. Old code still works against new schema (columns it doesn't know about are ignored). No database rollback needed.

Rollback sequence when migration is not forward-compatible:

Step 1: Roll back application code
  helm rollback myapp <previous-revision>
  # OR in GitOps: git revert the chart/values change and let controller reconcile

Step 2: Run reverse migration
  kubectl run reverse-migration --image=myapp:old-version --restart=Never -- \
    python manage.py migrate myapp 0023  # target the previous migration

Step 3: Verify schema matches old version expectations
  kubectl logs reverse-migration

Pre-rollback hook for automation:
  annotations:
    "helm.sh/hook": pre-rollback
    "helm.sh/hook-weight": "0"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
  # Job that runs the reverse migration before manifests are rolled back

What NOT to do:
- Rollback application code without considering schema state — new schema + old code crashes on startup
- Assume helm rollback handles database state — it only reverts Kubernetes manifest history
- Run destructive migrations (DROP COLUMN) in the same deploy as the code change that stops using the column

Interview answer: always mention the migration strategy before the rollback sequence. Forward-compatible migrations make rollback trivial (no database rollback needed). Non-forward-compatible migrations require a pre-scripted reverse migration and a tested rollback runbook.`,
      },
      {
        question: 'How do you detect and respond to drift in Helm-managed clusters?',
        answer: `Drift occurs when the running cluster state diverges from the Helm-declared state. Causes: manual kubectl edit, admission webhook mutations, autoscaler changing resource fields, another controller reconciling the same resource.

Detection methods:

1. helm diff upgrade (on-demand):
   helm diff upgrade myapp ./chart -f values.yaml --namespace production
   Shows what helm upgrade would change vs current cluster state. Non-zero diff = drift.

2. kubectl diff (CI scheduled):
   kubectl diff -f <(helm template myapp ./chart -f values.yaml) --namespace production
   Runs daily in CI. Alert on non-zero exit code.

3. GitOps controller status (continuous):
   kubectl get application myapp -n argocd -o jsonpath='{.status.sync.status}'
   # Returns: Synced or OutOfSync
   Argo CD and Flux continuously detect drift and optionally self-heal (auto-sync).

Response to drift:

If drift is unintentional (human kubectl edit, misfiring webhook):
  Rerun helm upgrade to restore Helm-declared state.
  For GitOps: the controller auto-corrects if autoSync is enabled.
  Investigate how the drift occurred — add RBAC to prevent unauthorized manual edits.

If drift is intentional (an admission webhook added a required annotation):
  Update the chart template to include the webhook-set field explicitly.
  OR configure SSA field ownership so Helm doesn't fight the webhook.

Prevention:
  In GitOps (Argo CD): enable selfHeal: true in Application spec — automatically reconciles any drift.
  In Flux: enable prune: true — removes resources not in GitOps repo.
  In push-based: schedule a CI drift check job, alert on non-zero diff, treat drift as an incident.

Continuous drift detection is a fundamental difference between GitOps and push-based Helm. GitOps provides drift detection and correction as a built-in property; push-based requires building it as an operational practice.`,
      },
      {
        question: 'When should you use an umbrella chart vs separate Helm releases vs Helmfile?',
        answer: `Umbrella chart (single parent chart with sub-charts):

Use when:
- Local development environment: spin up the complete application stack with one command
- Per-PR review environments: each PR gets its own namespace with the full stack
- Testing: integration tests need the full stack deployed atomically

Avoid when:
- Production services with independent release cadences (API team deploys 5x/day, worker team deploys weekly)
- Services owned by different teams (deployment coupling creates organizational friction)
- Services that need independent rollback (umbrella rollback reverts all services simultaneously)

Separate Helm releases (one helm release per service):

Use for:
- Production microservices with independent release cycles
- Services owned by different teams
- Any case where you need independent rollback

Downside: no coordinated deployment (no dependency ordering), no single command to "deploy everything"

Helmfile (multi-release declarative management):

Use when:
- You have 5+ charts that form an environment and need coordinated deployment
- You want dependency ordering (install ingress before apps, install CRD charts before controllers)
- You want helmfile diff for "show all pending changes" before deploying

Provides coordination without coupling release cycles — each service is still an independent Helm release.

Decision framework:
  Single developer, simple stack: umbrella chart for dev, separate releases for prod
  Small team (1-3 services): separate releases + Helmfile for coordinated deployment
  Platform team (10+ services, multiple teams): separate releases per service + Helmfile for environment management + library chart for shared standards + GitOps controller for production

The maturity progression: individual helm commands -> Helmfile -> Helmfile + GitOps controller (Argo CD ApplicationSet or Flux HelmRelease per service). GitOps provides the continuous reconciliation that Helmfile (a CI/CD tool) cannot.`,
      },
      {
        question: 'How do you structure Helm for a multi-cluster production estate (dev, staging, prod-us, prod-eu)?',
        answer: `Multi-cluster Helm management at the platform engineering level:

Repository structure (GitOps-based):

  gitops-repo/
  ├── charts/                          # internal chart sources (versioned independently)
  │   ├── myapp/
  │   └── common/ (library)
  ├── releases/
  │   ├── dev/
  │   │   ├── helmfile.yaml
  │   │   └── values/
  │   │       └── myapp.yaml
  │   ├── staging/
  │   │   ├── helmfile.yaml
  │   │   └── values/
  │   └── production/
  │       ├── prod-us/
  │       │   ├── helmfile.yaml
  │       │   └── values/
  │       └── prod-eu/
  │           ├── helmfile.yaml
  │           └── values/

Chart version strategy (immutable chart versions):
  dev deploys chart version 1.4.0-alpha.3 (built from feature branch)
  staging promotes to 1.4.0-rc.1 (release candidate after dev validation)
  production promotes to 1.4.0 (after staging sign-off)

Each environment's helmfile.yaml pins specific chart versions. Promotion = update the chart version in the next environment's helmfile.yaml and commit.

Cluster-specific values:
Values that differ across clusters: replica counts, resource sizes, external endpoints, feature flags.

  values/myapp.yaml (dev):        values/myapp.yaml (prod-us):
  replicaCount: 1                 replicaCount: 10
  resources.requests.cpu: 50m    resources.requests.cpu: 500m
  feature.newUI: true             feature.newUI: false  # not yet in prod

With Argo CD ApplicationSet:
  Generate one Argo CD Application per cluster automatically:
    spec:
      generators:
        - list:
            elements:
              - cluster: dev
                url: https://dev.k8s.example.com
              - cluster: prod-us
                url: https://prod-us.k8s.example.com
      template:
        spec:
          source:
            chart: myapp
            repoURL: oci://ghcr.io/myorg/charts

Key principles:
- One values file per cluster per service (not one mega-file)
- Chart versions pinned per environment, promoted explicitly
- Production clusters require PR approval for any change
- Secrets via ESO (cluster-specific SecretStore pointing to cluster-specific secret paths)
- Regular drift detection: Argo CD OutOfSync status or scheduled helmfile diff`,
      },
    ],
    references: [
      'https://helmfile.readthedocs.io/',
      'https://helm.sh/docs/topics/library_charts/',
      'https://helm.sh/docs/chart_template_guide/subcharts_and_globals/',
      'https://github.com/databus23/helm-diff',
    ],
  },
];
