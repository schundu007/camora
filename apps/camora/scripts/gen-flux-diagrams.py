#!/usr/bin/env python3
"""Generate the Flux CD track diagrams. All landscape (LR) Graphviz PNGs.

12 diagrams, one per topic in the Flux CD sub-category of DevOps.
Grounded in https://fluxcd.io/flux/ — GitOps Toolkit controllers, sources,
Kustomization/HelmRelease reconciliation, image automation, notifications,
repo layout, security, monitoring, migration.

Shares the exact node/edge/graph style of gen-devops-diagrams.py so the
Flux track is visually consistent with the rest of the DevOps category.

Output: apps/camora/public/diagrams/devops/flux-*.png
"""
import graphviz
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'devops')
os.makedirs(OUT, exist_ok=True)

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica',
            fontsize='12', penwidth='1.5', height='0.45', margin='0.22,0.12')
EDGE = dict(fontname='Helvetica', fontsize='10', penwidth='1.5')
C = {
    'navy':   ('#dbeafe', '#3b82f6', '#1e40af'),
    'gold':   ('#fef3c7', '#f59e0b', '#92400e'),
    'green':  ('#dcfce7', '#22c55e', '#166534'),
    'red':    ('#fee2e2', '#ef4444', '#991b1b'),
    'purple': ('#e0e7ff', '#6366f1', '#3730a3'),
    'teal':   ('#ccfbf1', '#14b8a6', '#115e59'),
    'cyan':   ('#cffafe', '#06b6d4', '#155e75'),
    'pink':   ('#fce7f3', '#ec4899', '#9d174d'),
    'sky':    ('#e0f2fe', '#0ea5e9', '#075985'),
    'amber':  ('#fef3c7', '#f59e0b', '#92400e'),
    'gray':   ('#f3f4f6', '#6b7280', '#374151'),
}


def n(g, name, label, c='navy'):
    g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)


def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '',
           color=color, fontcolor=color, style=style, **EDGE)


def base_graph(name, title):
    g = graphviz.Digraph(name, format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.5', nodesep='0.7', ranksep='0.65',
           splines='spline', rankdir='LR',
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica', fontcolor='#1e293b')
    return g


def save(g, slug):
    g.render(os.path.join(OUT, slug), cleanup=True)
    print(f'Generated: {slug}')


# ─────────────────────────────────────────────────────────────────────
# 1 — Why Flux: push CI vs pull GitOps
# ─────────────────────────────────────────────────────────────────────
def diag_why():
    g = base_graph('flux_1_why', 'Push CI vs Pull GitOps — why Flux inverts the deploy direction')
    g.attr(rankdir='TB')

    with g.subgraph(name='cluster_push') as s:
        s.attr(label='  PUSH model — CI holds cluster credentials  ', style='rounded',
               color='#ef4444', fontcolor='#991b1b', fontname='Helvetica', fontsize='12')
        n(s, 'p_git', 'Git repo', 'gray')
        n(s, 'p_ci',  'CI runner\nkubeconfig +\ncluster-admin creds', 'red')
        n(s, 'p_k8s', 'Cluster\nno drift detection\nforward-only', 'red')
        e(s, 'p_git', 'p_ci', 'triggers')
        e(s, 'p_ci',  'p_k8s', 'kubectl apply\nhelm upgrade', '#dc2626')

    with g.subgraph(name='cluster_pull') as s:
        s.attr(label='  PULL model — Flux runs inside the cluster  ', style='rounded',
               color='#22c55e', fontcolor='#166534', fontname='Helvetica', fontsize='12')
        n(s, 'l_git',  'Git repo\ndesired state\nsigned commits', 'navy')
        n(s, 'l_flux', 'Flux controllers\nin-cluster\nread-only on git', 'green')
        n(s, 'l_k8s',  'Cluster\ncontinuously\nreconciled', 'green')
        e(s, 'l_flux', 'l_git', 'pulls', '#16a34a')
        e(s, 'l_flux', 'l_k8s', 'applies + self-heals', '#16a34a')
        e(s, 'l_k8s',  'l_flux', 'observed state', '#94a3b8', 'dashed')

    n(g, 'principles', 'OpenGitOps principles\n1 Declarative\n2 Versioned + immutable\n3 Pulled automatically\n4 Continuously reconciled', 'purple')
    e(g, 'l_flux', 'principles', '', '#94a3b8', 'dotted')
    save(g, 'flux-1-why')


# ─────────────────────────────────────────────────────────────────────
# 2 — Bootstrap and self-management
# ─────────────────────────────────────────────────────────────────────
def diag_bootstrap():
    g = base_graph('flux_2_bootstrap', 'flux bootstrap — Flux installs itself, then manages itself')
    n(g, 'cli',  'flux bootstrap github\n--owner --repository\n--path=clusters/prod', 'gold')
    n(g, 'repo', 'Git repository\nclusters/prod/flux-system/\n  gotk-components.yaml\n  gotk-sync.yaml\n  kustomization.yaml', 'navy')
    n(g, 'key',  'Deploy key / PAT\nGitHub App\nwrite access', 'gray')
    n(g, 'inst', 'Install components\ninto flux-system ns\nCRDs + controllers', 'green')
    n(g, 'sync', 'GitRepository +\nKustomization\npointing at itself', 'teal')
    n(g, 'self', 'Self-managing loop\nupgrade = commit a new\ngotk-components.yaml', 'purple')
    e(g, 'cli',  'key',  'creates')
    e(g, 'cli',  'repo', 'commits manifests')
    e(g, 'cli',  'inst', 'kubectl apply')
    e(g, 'inst', 'sync', 'creates')
    e(g, 'sync', 'repo', 'reconciles from', '#0891b2')
    e(g, 'sync', 'self')
    e(g, 'self', 'inst', 'updates itself', '#6366f1', 'dashed')
    save(g, 'flux-2-bootstrap')


# ─────────────────────────────────────────────────────────────────────
# 3 — flux CLI command families
# ─────────────────────────────────────────────────────────────────────
def diag_cli():
    g = base_graph('flux_3_cli', 'flux CLI — command families and what each one touches')
    g.attr(rankdir='TB')
    n(g, 'cli', 'flux CLI', 'gold')

    n(g, 'setup',  'SETUP\nbootstrap · install\ncheck · check --pre\nuninstall', 'gray')
    n(g, 'author', 'AUTHOR\ncreate ... --export\nexport · build\nGitOps-correct: commit it', 'navy')
    n(g, 'observe','OBSERVE\nget all -A\nevents · logs\nstats · tree', 'teal')
    n(g, 'act',    'ACT\nreconcile (force sync)\nsuspend · resume\ndelete', 'green')
    n(g, 'debug',  'DEBUG\ntrace (what commit\nput this here)\ndiff (pre-merge review)', 'purple')

    e(g, 'cli', 'setup')
    e(g, 'cli', 'author')
    e(g, 'cli', 'observe')
    e(g, 'cli', 'act')
    e(g, 'cli', 'debug')

    n(g, 'warn', 'Imperative flux create\nwithout --export drifts\nfrom git — avoid in prod', 'red')
    e(g, 'author', 'warn', '', '#dc2626', 'dashed')
    save(g, 'flux-3-cli')


# ─────────────────────────────────────────────────────────────────────
# 4 — source-controller and the four source kinds
# ─────────────────────────────────────────────────────────────────────
def diag_sources():
    g = base_graph('flux_4_sources', 'source-controller — four source kinds, one artifact model')
    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'git',  'GitRepository\nurl · ref branch/tag/\nsemver/commit\nverify GPG or cosign', 'navy')
        n(s, 'oci',  'OCIRepository\nOCI artifact\ntag/semver/digest\ncosign · notation', 'cyan')
        n(s, 'helm', 'HelmRepository\ntype: default | oci\nindex.yaml or registry', 'gold')
        n(s, 'buck', 'Bucket\nS3 · GCS · Azure\nprovider auth', 'teal')

    n(g, 'sc',  'source-controller\nfetch · verify · checksum\nexpose as artifact', 'green')
    n(g, 'art', 'Artifact\ntar.gz + revision + digest\nserved on in-cluster HTTP', 'purple')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'kc', 'kustomize-controller', 'navy')
        n(s, 'hc', 'helm-controller', 'gold')

    for src in ('git', 'oci', 'helm', 'buck'):
        e(g, src, 'sc')
    e(g, 'sc',  'art', 'produces')
    e(g, 'art', 'kc', 'consumes')
    e(g, 'art', 'hc', 'consumes')

    n(g, 'int', 'spec.interval on the SOURCE\ncontrols git/registry polling.\nLag = source interval +\nconsumer interval', 'gray')
    e(g, 'sc', 'int', '', '#94a3b8', 'dotted')
    save(g, 'flux-4-sources')


# ─────────────────────────────────────────────────────────────────────
# 5 — Kustomization reconciliation loop
# ─────────────────────────────────────────────────────────────────────
def diag_kustomization():
    g = base_graph('flux_5_kustomization', 'Kustomization — the kustomize-controller reconciliation loop')
    # Linear 8-stage pipeline: flow top-to-bottom so the image stays readable.
    g.attr(rankdir='TB')
    n(g, 'art',  'Artifact\nfrom source-controller', 'green')
    n(g, 'build','kustomize build\nat spec.path', 'navy')
    n(g, 'post', 'postBuild\nsubstitute +\nsubstituteFrom', 'cyan')
    n(g, 'dec',  'decryption\nSOPS provider', 'pink')
    n(g, 'ssa',  'Server-side apply\nfieldManager:\nkustomize-controller', 'purple')
    n(g, 'k8s',  'Cluster objects', 'teal')
    n(g, 'health','healthChecks + wait\nReady conditions', 'gold')
    n(g, 'prune','prune: true\ninventory-based GC', 'red')
    n(g, 'stat', 'Status\nReady · lastAppliedRevision\nReconciling', 'gray')

    e(g, 'art',  'build')
    e(g, 'build','post')
    e(g, 'post', 'dec')
    e(g, 'dec',  'ssa')
    e(g, 'ssa',  'k8s', 'applies')
    e(g, 'k8s',  'health')
    e(g, 'health','stat')
    e(g, 'prune','k8s', 'removes deleted', '#dc2626')
    e(g, 'stat', 'art', 'requeue every spec.interval', '#94a3b8', 'dashed')

    n(g, 'drift', 'Drift correction:\ncluster diverges → next\nreconcile re-applies', 'amber')
    e(g, 'k8s', 'drift', '', '#f59e0b', 'dotted')
    save(g, 'flux-5-kustomization')


# ─────────────────────────────────────────────────────────────────────
# 6 — HelmRelease lifecycle and remediation
# ─────────────────────────────────────────────────────────────────────
def diag_helmrelease():
    g = base_graph('flux_6_helmrelease', 'HelmRelease — helm-controller lifecycle and remediation')
    g.attr(rankdir='TB')
    n(g, 'src',  'chart source\nHelmRepository ·\nGitRepository ·\nOCIRepository', 'green')
    n(g, 'hr',   'HelmRelease\nhelm.toolkit.fluxcd.io/v2\nvalues + valuesFrom', 'gold')
    n(g, 'hc',   'helm-controller\nrender chart', 'navy')
    n(g, 'postr','postRenderers\nkustomize patches\nover rendered chart', 'cyan')
    n(g, 'rel',  'Helm release\nstored as Secret\nin storageNamespace', 'purple')
    n(g, 'test', 'test.enable\nhelm test hooks', 'teal')
    n(g, 'ok',   'Ready = True', 'green')
    n(g, 'fail', 'Upgrade failed', 'red')
    n(g, 'rem',  'remediation\nretries: N\nstrategy: rollback\nor uninstall', 'amber')
    n(g, 'drift','driftDetection\nenabled | warn\ncorrects manual edits', 'pink')

    e(g, 'src',  'hc', 'pulls chart')
    e(g, 'hr',   'hc', 'desired release')
    e(g, 'hc',   'postr')
    e(g, 'postr','rel', 'install / upgrade')
    e(g, 'rel',  'test')
    e(g, 'test', 'ok',   'pass', '#16a34a')
    e(g, 'test', 'fail', 'fail', '#dc2626')
    e(g, 'fail', 'rem')
    e(g, 'rem',  'rel', 'rollback', '#f59e0b', 'dashed')
    e(g, 'drift','rel', '', '#ec4899', 'dotted')
    save(g, 'flux-6-helmrelease')


# ─────────────────────────────────────────────────────────────────────
# 7 — Image update automation
# ─────────────────────────────────────────────────────────────────────
def diag_image_automation():
    g = base_graph('flux_7_image_automation', 'Image Update Automation — registry to git, never straight to cluster')
    # 9-stage chain — vertical, otherwise the PNG is 8:1 and unreadable.
    g.attr(rankdir='TB')
    n(g, 'ci',   'CI builds + pushes\nimage tag\nmain-a1b2c3d-1712345678', 'gray')
    n(g, 'reg',  'Container registry\nECR · GCR · ACR · GHCR', 'gold')
    n(g, 'irep', 'ImageRepository\nscans tags\nspec.interval\nprovider auth', 'green')
    n(g, 'ipol', 'ImagePolicy\nsemver | numerical |\nalphabetical\nfilterTags regex', 'cyan')
    n(g, 'iua',  'ImageUpdateAutomation\nupdate.strategy: Setters\ncommit template', 'purple')
    n(g, 'man',  'Manifest in git\nimage: app:v1.2.3\n# {"$imagepolicy":\n#  "flux-system:app"}', 'navy')
    n(g, 'gitc', 'Commit or PR\nto push.branch /\npush.refspec', 'teal')
    n(g, 'flux', 'Normal Flux reconcile\nGitRepository →\nKustomization', 'green')
    n(g, 'k8s',  'Cluster', 'teal')

    e(g, 'ci',   'reg', 'push')
    e(g, 'reg',  'irep','scanned by')
    e(g, 'irep', 'ipol','tag list')
    e(g, 'ipol', 'iua', 'latest selected tag')
    e(g, 'iua',  'man', 'rewrites via setter marker')
    e(g, 'man',  'gitc')
    e(g, 'gitc', 'flux','audit trail preserved', '#16a34a')
    e(g, 'flux', 'k8s')

    n(g, 'guard', 'Guardrail: automate direct\ncommits for dev/staging,\npush.refspec → PR for prod', 'red')
    e(g, 'gitc', 'guard', '', '#dc2626', 'dotted')
    save(g, 'flux-7-image-automation')


# ─────────────────────────────────────────────────────────────────────
# 8 — notification-controller, both directions
# ─────────────────────────────────────────────────────────────────────
def diag_notifications():
    g = base_graph('flux_8_notifications', 'notification-controller — outbound alerts and inbound receivers')
    n(g, 'nc', 'notification-controller', 'purple')

    with g.subgraph(name='cluster_out') as s:
        s.attr(label='  OUTBOUND — events leaving the cluster  ', style='rounded',
               color='#3b82f6', fontcolor='#1e40af', fontname='Helvetica', fontsize='12')
        n(s, 'ev',    'Controller events\nKustomization ·\nHelmRelease · Source', 'gray')
        n(s, 'alert', 'Alert\neventSeverity info|error\neventSources\ninclusion/exclusionList', 'navy')
        n(s, 'prov',  'Provider\nslack · msteams · discord\ngeneric-hmac · pagerduty\nsecretRef: webhook URL', 'teal')
        n(s, 'dest',  'Slack / Teams /\nPagerDuty / Alertmanager', 'green')
        n(s, 'status','github / gitlab provider\ncommit status back on\nthe deploying commit', 'gold')
        e(s, 'ev',    'alert', 'matched by')
        e(s, 'alert', 'prov')
        e(s, 'prov',  'dest')
        e(s, 'prov',  'status')

    with g.subgraph(name='cluster_in') as s:
        s.attr(label='  INBOUND — cutting reconcile lag to seconds  ', style='rounded',
               color='#22c55e', fontcolor='#166534', fontname='Helvetica', fontsize='12')
        n(s, 'hook', 'GitHub / GitLab /\nHarbor / DockerHub\nwebhook', 'gray')
        n(s, 'recv', 'Receiver\ntype + secretRef token\nURL /hook/<sha256>', 'cyan')
        n(s, 'res',  'Annotates listed\nresources → immediate\nreconcile', 'green')
        e(s, 'hook', 'recv', 'POST')
        e(s, 'recv', 'res')

    e(g, 'nc', 'alert', '', '#94a3b8', 'dotted')
    e(g, 'nc', 'recv',  '', '#94a3b8', 'dotted')
    save(g, 'flux-8-notifications')


# ─────────────────────────────────────────────────────────────────────
# 9 — Repository structure and multi-tenancy
# ─────────────────────────────────────────────────────────────────────
def diag_repo_structure():
    g = base_graph('flux_9_repo_structure', 'Repository layout and namespace-per-tenant multi-tenancy')
    g.attr(rankdir='TB')
    n(g, 'repo', 'Fleet repo', 'gray')
    n(g, 'clus', 'clusters/\n  staging/\n  production/', 'navy')
    n(g, 'infra','infrastructure/\ncontrollers · CRDs\ningress · cert-manager', 'gold')
    n(g, 'apps', 'apps/\n  base/\n  overlays/staging/\n  overlays/production/', 'teal')

    n(g, 'kinf', 'Kustomization\ninfrastructure', 'gold')
    n(g, 'kapp', 'Kustomization\napps\ndependsOn: infrastructure', 'teal')

    n(g, 'tenant','Tenant Kustomization\nspec.serviceAccountName\n= tenant SA', 'purple')
    n(g, 'rbac',  'Namespace RBAC\nimpersonation caps\nwhat the tenant can apply', 'green')
    n(g, 'hard',  '--no-cross-namespace-refs\nstops tenants referencing\nanother team source', 'red')

    e(g, 'repo', 'clus')
    e(g, 'repo', 'infra')
    e(g, 'repo', 'apps')
    e(g, 'clus', 'kinf', 'points at')
    e(g, 'clus', 'kapp', 'points at')
    e(g, 'infra','kinf')
    e(g, 'apps', 'kapp')
    e(g, 'kinf', 'kapp', 'must be Ready first', '#f59e0b')
    e(g, 'kapp', 'tenant')
    e(g, 'tenant','rbac', 'impersonates')
    e(g, 'rbac', 'hard', '', '#dc2626', 'dashed')

    n(g, 'subst', 'postBuild substitution\nkeeps one base across\nall clusters', 'cyan')
    e(g, 'apps', 'subst', '', '#94a3b8', 'dotted')
    save(g, 'flux-9-repo-structure')


# ─────────────────────────────────────────────────────────────────────
# 10 — Security: secrets + supply chain
# ─────────────────────────────────────────────────────────────────────
def diag_security():
    g = base_graph('flux_10_security', 'Flux security — secrets in git and supply chain verification')

    with g.subgraph(name='cluster_secrets') as s:
        s.attr(label='  SECRETS — git is not a secret store  ', style='rounded',
               color='#ec4899', fontcolor='#9d174d', fontname='Helvetica', fontsize='12')
        n(s, 'plain', 'Plaintext Secret\nin git', 'red')
        n(s, 'sops',  'SOPS encrypted\nage key or\nAWS/GCP/Azure KMS\n.sops.yaml rules', 'pink')
        n(s, 'kdec',  'Kustomization\nspec.decryption\nprovider: sops\nsecretRef: sops-age', 'navy')
        n(s, 'eso',   'Alternative:\nExternal Secrets Operator\nSealed Secrets', 'teal')
        e(s, 'plain', 'sops', 'encrypt data/stringData only', '#dc2626')
        e(s, 'sops',  'kdec', 'decrypted at apply time')

    with g.subgraph(name='cluster_supply') as s:
        s.attr(label='  SUPPLY CHAIN — verify before you apply  ', style='rounded',
               color='#6366f1', fontcolor='#3730a3', fontname='Helvetica', fontsize='12')
        n(s, 'commit', 'GitRepository\nspec.verify\nGPG or cosign\nsigned commits', 'purple')
        n(s, 'ociv',   'OCIRepository\nspec.verify\ncosign / notation\nkeyless OIDC identity', 'cyan')
        n(s, 'reject', 'Unverified revision\nnever becomes\nan artifact', 'red')
        e(s, 'commit', 'reject', 'fails closed', '#dc2626')
        e(s, 'ociv',   'reject', 'fails closed', '#dc2626')

    n(g, 'rbac', 'Least privilege\ntenant impersonation\nrestricted PodSecurity\nNetworkPolicy on flux-system\nIRSA / Workload Identity', 'green')
    e(g, 'kdec', 'rbac', '', '#94a3b8', 'dotted')
    save(g, 'flux-10-security')


# ─────────────────────────────────────────────────────────────────────
# 11 — Monitoring and troubleshooting
# ─────────────────────────────────────────────────────────────────────
def diag_monitoring():
    g = base_graph('flux_11_monitoring', 'Monitoring and the stuck-reconcile troubleshooting path')
    g.attr(rankdir='TB')

    n(g, 'ctrl', 'Flux controllers\n/metrics endpoint', 'navy')
    n(g, 'prom', 'Prometheus\ngotk_reconcile_condition\ngotk_reconcile_duration_seconds', 'gold')
    n(g, 'graf', 'Grafana\nFlux control plane +\ncluster dashboards', 'teal')
    n(g, 'alrt', 'Alert on\nReady=False sustained\nand on suspended=true', 'red')
    e(g, 'ctrl', 'prom', 'scraped')
    e(g, 'prom', 'graf')
    e(g, 'prom', 'alrt')

    n(g, 'sym', 'Symptom:\nresource not updating', 'red')
    n(g, 's1',  '1. flux check\ncontrollers healthy?', 'gray')
    n(g, 's2',  '2. flux get all -A\n--status-selector ready=false', 'navy')
    n(g, 's3',  '3. flux events\n--for Kustomization/name', 'cyan')
    n(g, 's4',  '4. flux logs --level=error\n--all-namespaces', 'purple')
    n(g, 's5',  '5. flux trace / flux diff\nwhich commit · what changes', 'green')
    e(g, 'sym', 's1'); e(g, 's1', 's2'); e(g, 's2', 's3'); e(g, 's3', 's4'); e(g, 's4', 's5')

    n(g, 'causes', 'Common causes:\nsource auth failure ·\nkustomize build error ·\nvalidation rejection ·\nhealthCheck timeout ·\ndependsOn deadlock ·\nfield manager conflict', 'amber')
    e(g, 's5', 'causes', '', '#f59e0b', 'dashed')
    save(g, 'flux-11-monitoring')


# ─────────────────────────────────────────────────────────────────────
# 12 — Migration and scale
# ─────────────────────────────────────────────────────────────────────
def diag_migration():
    g = base_graph('flux_12_migration', 'Migrating to Flux v2 and operating it at scale')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'v1',   'Flux v1\nannotation-driven\nmonolithic daemon', 'red')
        n(s, 'hop',  'Helm Operator\nHelmRelease v1', 'red')
        n(s, 'push', 'Imperative CI\nhelm upgrade / kubectl', 'gray')

    n(g, 'v2', 'Flux v2 — GitOps Toolkit\nGitRepository + Kustomization\n+ HelmRelease v2', 'green')
    e(g, 'v1',   'v2', 'CRDs replace annotations')
    e(g, 'hop',  'v2', 'HelmRelease v1 → v2 API')
    e(g, 'push', 'v2', 'invert to pull')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'shard', 'Sharding\n--watch-label-selector\nper-controller instances', 'purple')
        n(s, 'conc',  'Tuning\n--concurrent\n--requeue-dependency\nsource-controller memory', 'cyan')
        n(s, 'hook',  'Receivers instead of\nshort intervals\nlower API + git load', 'teal')

    n(g, 'dr', 'Disaster recovery\nre-bootstrap a new cluster\nfrom the same git path', 'gold')
    n(g, 'gap','Not in core:\nno Argo-CD-class UI\nWeave GitOps / Capacitor\nas add-ons', 'amber')

    e(g, 'v2', 'shard')
    e(g, 'v2', 'conc')
    e(g, 'v2', 'hook')
    e(g, 'v2', 'dr')
    e(g, 'v2', 'gap', '', '#f59e0b', 'dashed')
    save(g, 'flux-12-migration')


if __name__ == '__main__':
    diag_why()
    diag_bootstrap()
    diag_cli()
    diag_sources()
    diag_kustomization()
    diag_helmrelease()
    diag_image_automation()
    diag_notifications()
    diag_repo_structure()
    diag_security()
    diag_monitoring()
    diag_migration()
    print('\nAll 12 Flux diagrams generated.')
