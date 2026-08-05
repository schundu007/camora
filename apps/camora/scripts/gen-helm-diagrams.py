#!/usr/bin/env python3
"""Generate the Helm track diagrams.

helmTopics.js has referenced /diagrams/devops/helm-1-why.png through
helm-12-production.png since the track shipped, but no generator ever
existed and the PNGs were never produced — all 12 topics rendered with a
missing visual. This script creates them.

Each diagram matches the visualization title already declared in
helmTopics.js, so the image and its surrounding prose agree.

Shares the node/edge/graph style of gen-devops-diagrams.py.
Output: apps/camora/public/diagrams/devops/helm-*.png
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
# 1 — The manifest sprawl problem and what Helm solves
# ─────────────────────────────────────────────────────────────────────
def diag_why():
    g = base_graph('helm_1_why', 'Manifest sprawl vs the Helm packaging model')

    with g.subgraph(name='cluster_before') as s:
        s.attr(label='  WITHOUT Helm — kubectl sprawl  ', style='rounded',
               color='#ef4444', fontcolor='#991b1b', fontname='Helvetica', fontsize='12')
        n(s, 'b_dev',  'dev/\ndeployment.yaml · service.yaml\nconfigmap.yaml · secret.yaml\nhpa · pdb · sa · netpol · ingress', 'red')
        n(s, 'b_stg',  'staging/\nsame 9 files,\nhand-edited', 'red')
        n(s, 'b_prd',  'prod/\nsame 9 files,\ndrifted', 'red')
        n(s, 'b_pain', 'No versioned artifact\nNo rollback primitive\nNo parameterization\nNo dependency model\n"What is in prod?" unanswerable', 'red')
        e(s, 'b_dev', 'b_pain', '', '#dc2626', 'dotted')
        e(s, 'b_stg', 'b_pain', '', '#dc2626', 'dotted')
        e(s, 'b_prd', 'b_pain', '', '#dc2626', 'dotted')

    with g.subgraph(name='cluster_after') as s:
        s.attr(label='  WITH Helm — one chart, many releases  ', style='rounded',
               color='#22c55e', fontcolor='#166534', fontname='Helvetica', fontsize='12')
        n(s, 'a_chart', 'Chart\nversioned .tgz\ntemplates/ + values.yaml', 'green')
        n(s, 'a_vals',  'values-dev.yaml\nvalues-staging.yaml\nvalues-prod.yaml', 'cyan')
        n(s, 'a_rel',   'Releases\nmy-app-dev · my-app-staging\nmy-app-prod', 'teal')
        n(s, 'a_life',  'Lifecycle\ninstall · upgrade\nrollback · history\nordered hooks', 'purple')
        e(s, 'a_chart', 'a_rel', 'rendered with')
        e(s, 'a_vals',  'a_rel')
        e(s, 'a_rel',   'a_life')

    save(g, 'helm-1-why')


# ─────────────────────────────────────────────────────────────────────
# 2 — CLI lifecycle commands and release state machine
# ─────────────────────────────────────────────────────────────────────
def diag_cli():
    g = base_graph('helm_2_cli', 'Helm release state machine and the commands that drive it')
    n(g, 'none', 'no release', 'gray')
    n(g, 'pi',   'pending-install', 'amber')
    n(g, 'dep',  'deployed', 'green')
    n(g, 'pu',   'pending-upgrade', 'amber')
    n(g, 'fail', 'failed', 'red')
    n(g, 'pr',   'pending-rollback', 'amber')
    n(g, 'uni',  'uninstalled', 'gray')

    e(g, 'none', 'pi',   'helm install')
    e(g, 'pi',   'dep',  'success', '#16a34a')
    e(g, 'pi',   'fail', 'hook / apply error', '#dc2626')
    e(g, 'dep',  'pu',   'helm upgrade')
    e(g, 'pu',   'dep',  'success', '#16a34a')
    e(g, 'pu',   'fail', 'error', '#dc2626')
    e(g, 'fail', 'pr',   'helm rollback')
    e(g, 'pr',   'dep',  'restored', '#16a34a')
    e(g, 'dep',  'uni',  'helm uninstall')

    n(g, 'read', 'Read-only\nhelm list · history\nstatus · get manifest', 'navy')
    n(g, 'off',  'No cluster contact\nhelm template\nhelm lint · helm pull', 'cyan')
    n(g, 'flags','Key flags\n--atomic (rollback on fail)\n--wait --timeout\n--dry-run · --version\nupgrade --install = idempotent', 'purple')
    e(g, 'dep',  'read', '', '#94a3b8', 'dotted')
    e(g, 'read', 'off',  '', '#94a3b8', 'dotted')
    e(g, 'off',  'flags','', '#94a3b8', 'dotted')
    save(g, 'helm-2-cli')


# ─────────────────────────────────────────────────────────────────────
# 3 — Chart directory structure and file roles
# ─────────────────────────────────────────────────────────────────────
def diag_anatomy():
    # Keep the default LR: root has 7 children, so TB fans them into one very wide row.
    g = base_graph('helm_3_anatomy', 'Anatomy of a chart — every file and what it does')
    n(g, 'root', 'mychart/', 'gold')

    n(g, 'meta',  'Chart.yaml\napiVersion: v2 · name · version\nappVersion · type · dependencies\nkubeVersion constraint', 'navy')
    n(g, 'vals',  'values.yaml\ndefault configuration\noverridden by -f and --set', 'cyan')
    n(g, 'schema','values.schema.json\nJSON Schema validation\nrequired · type · enum · pattern', 'teal')
    n(g, 'tpl',   'templates/\ndeployment.yaml · service.yaml\ningress.yaml · hpa.yaml', 'green')
    n(g, 'help',  'templates/_helpers.tpl\nnamed templates (define)\nunderscore = not rendered', 'purple')
    n(g, 'notes', 'templates/NOTES.txt\npost-install message\nrendered as a template', 'amber')
    n(g, 'tests', 'templates/tests/\nhelm.sh/hook: test\nhelm test target', 'pink')
    n(g, 'crds',  'crds/\napplied first, never templated\nnever upgraded or deleted', 'red')
    n(g, 'deps',  'charts/\nvendored sub-chart .tgz\npopulated by dependency update', 'gold')
    n(g, 'ignore','.helmignore\nexcluded from packaging', 'gray')

    for x in ('meta', 'vals', 'schema', 'tpl', 'crds', 'deps', 'ignore'):
        e(g, 'root', x)
    e(g, 'tpl', 'help')
    e(g, 'tpl', 'notes')
    e(g, 'tpl', 'tests')
    e(g, 'schema', 'vals', 'validates', '#14b8a6', 'dashed')
    save(g, 'helm-3-anatomy')


# ─────────────────────────────────────────────────────────────────────
# 4 — Go template rendering pipeline
# ─────────────────────────────────────────────────────────────────────
def diag_templating():
    g = base_graph('helm_4_templating', 'Go template rendering — inputs, engine, output')
    g.attr(rankdir='TB')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'values', '.Values\nmerged values', 'cyan')
        n(s, 'rel',    '.Release\nName · Namespace\nRevision · IsUpgrade', 'navy')
        n(s, 'chart',  '.Chart\nName · Version\nAppVersion', 'gold')
        n(s, 'cap',    '.Capabilities\nKubeVersion\nAPIVersions.Has', 'teal')
        n(s, 'files',  '.Files\nGet · Glob\nAsConfig · AsSecret', 'gray')

    n(g, 'engine', 'Go text/template engine\n+ Sprig function library\n+ Helm-specific funcs', 'purple')
    n(g, 'ctrl',   'Control structures\nif / else · with · range\ndefine + template + include\ntpl for runtime strings', 'green')
    n(g, 'funcs',  'Common functions\ndefault · quote · toYaml\nnindent · required · b64enc\nsha256sum for config checksums', 'cyan')
    n(g, 'ws',     'Whitespace control\n{{- trims left\n-}} trims right', 'amber')
    n(g, 'out',    'Rendered Kubernetes YAML', 'green')
    n(g, 'apply',  'Applied to cluster\n(or printed by helm template)', 'teal')

    for x in ('values', 'rel', 'chart', 'cap', 'files'):
        e(g, x, 'engine')
    e(g, 'engine', 'ctrl')
    e(g, 'ctrl',   'funcs')
    e(g, 'funcs',  'ws')
    e(g, 'ws',     'out')
    e(g, 'out',    'apply')

    n(g, 'gotcha', 'include beats template:\ninclude is a function so it\npipes into indent / nindent', 'red')
    e(g, 'ctrl', 'gotcha', '', '#dc2626', 'dotted')
    save(g, 'helm-4-templating')


# ─────────────────────────────────────────────────────────────────────
# 5 — Values precedence and schema validation
# ─────────────────────────────────────────────────────────────────────
def diag_values():
    # Six-step precedence chain — vertical, or the PNG comes out ~5:1.
    g = base_graph('helm_5_values', 'Values layering — lowest to highest precedence')
    g.attr(rankdir='TB')
    n(g, 'sub',  '1. Sub-chart values.yaml\nlowest precedence', 'gray')
    n(g, 'own',  '2. Parent chart values.yaml\nchart defaults', 'navy')
    n(g, 'par',  '3. Parent overrides of\nsub-chart values\n(keyed by sub-chart name)', 'cyan')
    n(g, 'f1',   '4. -f values-base.yaml', 'teal')
    n(g, 'f2',   '5. -f values-prod.yaml\nlater -f wins', 'green')
    n(g, 'set',  '6. --set key=value\nhighest precedence', 'gold')
    n(g, 'merged','Merged .Values\npassed to templates', 'purple')

    e(g, 'sub', 'own'); e(g, 'own', 'par'); e(g, 'par', 'f1')
    e(g, 'f1',  'f2');  e(g, 'f2',  'set'); e(g, 'set', 'merged')

    n(g, 'schema', 'values.schema.json\nvalidated before render\nrequired · type · enum · pattern', 'pink')
    n(g, 'reuse',  'Upgrade flags\n--reuse-values (keep old, apply --set)\n--reset-values (back to chart defaults)\nDefault: reuse only if no -f/--set', 'amber')
    n(g, 'trap',   'Merge is deep for maps\nbut lists are REPLACED\nwholesale, never merged', 'red')

    e(g, 'merged', 'schema', 'validated by', '#ec4899', 'dashed')
    e(g, 'merged', 'reuse',  '', '#94a3b8', 'dotted')
    e(g, 'merged', 'trap',   '', '#dc2626', 'dotted')
    save(g, 'helm-5-values')


# ─────────────────────────────────────────────────────────────────────
# 6 — Dependency model and sub-chart values
# ─────────────────────────────────────────────────────────────────────
def diag_dependencies():
    g = base_graph('helm_6_dependencies', 'Chart dependencies — declaration, vendoring, and value scoping')
    g.attr(rankdir='TB')

    n(g, 'decl', 'Chart.yaml dependencies:\n- name: postgresql\n  version: 15.x.x\n  repository: oci://...\n  condition: postgresql.enabled\n  alias: primarydb', 'navy')
    n(g, 'cmd',  'helm dependency update\nresolves + downloads', 'gold')
    n(g, 'lock', 'Chart.lock\npins exact resolved versions\ncommit this file', 'purple')
    n(g, 'vend', 'charts/\npostgresql-15.2.1.tgz\nredis-19.0.2.tgz', 'teal')

    n(g, 'scope','Parent values.yaml\n\npostgresql:\n  enabled: true\n  auth:\n    database: myapp\n\nkeyed by name (or alias)', 'cyan')
    n(g, 'glob', 'global:\n  imageRegistry: ghcr.io\n\nvisible to parent AND\nevery sub-chart', 'green')
    n(g, 'cond', 'condition / tags\ntoggle sub-charts off\nwithout deleting them', 'amber')
    n(g, 'lib',  'type: library\nhelpers only, renders\nnothing on its own', 'pink')

    e(g, 'decl', 'cmd')
    e(g, 'cmd',  'lock', 'writes')
    e(g, 'cmd',  'vend', 'downloads into')
    e(g, 'vend', 'scope', 'configured via')
    e(g, 'scope','glob')
    e(g, 'scope','cond')
    e(g, 'decl', 'lib', '', '#94a3b8', 'dotted')
    save(g, 'helm-6-dependencies')


# ─────────────────────────────────────────────────────────────────────
# 7 — Classic chart repos vs OCI registries
# ─────────────────────────────────────────────────────────────────────
def diag_oci():
    g = base_graph('helm_7_oci', 'Chart distribution — classic HTTP repositories vs OCI registries')

    with g.subgraph(name='cluster_classic') as s:
        s.attr(label='  CLASSIC — HTTP chart repository  ', style='rounded',
               color='#f59e0b', fontcolor='#92400e', fontname='Helvetica', fontsize='12')
        n(s, 'c_srv',  'Static HTTP server\nindex.yaml + .tgz files', 'amber')
        n(s, 'c_idx',  'index.yaml\nlists every chart+version\ngrows unboundedly', 'gold')
        n(s, 'c_cmd',  'helm repo add\nhelm repo update\nhelm install repo/chart', 'gray')
        e(s, 'c_srv', 'c_idx')
        e(s, 'c_idx', 'c_cmd', 'client caches locally')

    with g.subgraph(name='cluster_oci') as s:
        s.attr(label='  OCI — recommended since Helm 3.8 GA  ', style='rounded',
               color='#22c55e', fontcolor='#166534', fontname='Helvetica', fontsize='12')
        n(s, 'o_reg', 'OCI registry\nECR · GHCR · ACR · GAR · Harbor', 'green')
        n(s, 'o_art', 'Chart as an OCI artifact\naddressed by tag or digest\nno index.yaml at all', 'teal')
        n(s, 'o_cmd', 'helm push chart.tgz oci://...\nhelm install rel oci://.../chart\n  --version 1.4.2', 'cyan')
        n(s, 'o_win', 'Same auth, RBAC, replication,\nscanning and retention as images\nsigning via cosign', 'purple')
        e(s, 'o_reg', 'o_art')
        e(s, 'o_art', 'o_cmd')
        e(s, 'o_cmd', 'o_win')

    save(g, 'helm-7-oci')


# ─────────────────────────────────────────────────────────────────────
# 8 — Hook lifecycle phases
# ─────────────────────────────────────────────────────────────────────
def diag_hooks():
    g = base_graph('helm_8_hooks', 'Hook lifecycle — phases, weights, and deletion policies')
    n(g, 'inst', 'helm install', 'gray')
    n(g, 'pre',  'pre-install\nnamespace prep,\ncredential seeding', 'navy')
    n(g, 'main', 'Chart resources applied\nin Helm install order\n(NS, CRD, SA, RBAC, CM,\nSecret, SVC, Deploy, ...)', 'green')
    n(g, 'post', 'post-install\nsmoke check, cache warm', 'teal')

    n(g, 'upg',  'helm upgrade', 'gray')
    n(g, 'preu', 'pre-upgrade\nDB migration Job\nthe canonical use case', 'gold')
    n(g, 'postu','post-upgrade', 'teal')

    n(g, 'test', 'helm test\nhelm.sh/hook: test\nconnectivity assertions', 'purple')

    e(g, 'inst', 'pre'); e(g, 'pre', 'main'); e(g, 'main', 'post'); e(g, 'post', 'test')
    e(g, 'upg', 'preu'); e(g, 'preu', 'main', 'only if hook succeeds', '#f59e0b')
    e(g, 'main', 'postu')

    n(g, 'weight', 'hook-weight\nlower runs first\nnegative to positive\nties broken by name', 'cyan')
    n(g, 'policy', 'hook-delete-policy\nbefore-hook-creation (default-ish)\nhook-succeeded\nhook-failed — omit to keep\nfailed Jobs for debugging', 'amber')
    n(g, 'gotcha', 'Hook resources are NOT\ntracked in release state:\nnever rolled back,\nnot removed by uninstall\nunless a policy says so', 'red')
    e(g, 'preu', 'weight', '', '#94a3b8', 'dotted')
    e(g, 'weight', 'policy', '', '#94a3b8', 'dotted')
    e(g, 'policy', 'gotcha', '', '#dc2626', 'dotted')
    save(g, 'helm-8-hooks')


# ─────────────────────────────────────────────────────────────────────
# 9 — Helm in CI/CD and GitOps
# ─────────────────────────────────────────────────────────────────────
def diag_cicd():
    g = base_graph('helm_9_cicd', 'Helm delivery models — push CI, pull GitOps, and rendered manifests')
    n(g, 'repo', 'Chart + values in git', 'gray')

    with g.subgraph(name='cluster_push') as s:
        s.attr(label='  PUSH — CI runs helm directly  ', style='rounded',
               color='#ef4444', fontcolor='#991b1b', fontname='Helvetica', fontsize='12')
        n(s, 'ci',   'GitHub Actions / GitLab CI\nhelm upgrade --install\n--atomic --wait', 'red')
        n(s, 'creds','CI holds kubeconfig\nno drift detection', 'red')
        e(s, 'ci', 'creds', '', '#dc2626', 'dotted')

    with g.subgraph(name='cluster_pull') as s:
        s.attr(label='  PULL — GitOps controller reconciles  ', style='rounded',
               color='#22c55e', fontcolor='#166534', fontname='Helvetica', fontsize='12')
        n(s, 'argo', 'Argo CD Application\nsource.helm.values', 'green')
        n(s, 'flux', 'Flux HelmRelease\n+ HelmRepository', 'teal')
        n(s, 'recon','Continuous reconciliation\nrollback = git revert', 'green')
        e(s, 'argo', 'recon')
        e(s, 'flux', 'recon')

    n(g, 'tmpl', 'RENDERED MANIFESTS\nhelm template | kubectl apply\nor commit rendered YAML\nplain-YAML diffs in PRs', 'cyan')
    n(g, 'k8s',  'Cluster', 'purple')

    e(g, 'repo', 'ci')
    e(g, 'repo', 'argo')
    e(g, 'repo', 'flux')
    e(g, 'repo', 'tmpl')
    e(g, 'creds','k8s', 'push', '#dc2626')
    e(g, 'recon','k8s', 'pull', '#16a34a')
    e(g, 'tmpl', 'k8s')
    save(g, 'helm-9-cicd')


# ─────────────────────────────────────────────────────────────────────
# 10 — Security layers
# ─────────────────────────────────────────────────────────────────────
def diag_security():
    g = base_graph('helm_10_security', 'Helm security — distribution, runtime, and secrets')
    g.attr(rankdir='TB')

    with g.subgraph(name='cluster_supply') as s:
        s.attr(label='  1. DISTRIBUTION — is this the chart we tested?  ', style='rounded',
               color='#6366f1', fontcolor='#3730a3', fontname='Helvetica', fontsize='12')
        n(s, 'sign', 'helm package --sign\n.prov provenance file\nhelm verify / --verify', 'purple')
        n(s, 'cosign', 'cosign sign / verify\nOCI charts, keyless OIDC', 'cyan')
        n(s, 'pin',  'Pin --version always\nnever track a floating range\nin production', 'navy')

    with g.subgraph(name='cluster_runtime') as s:
        s.attr(label='  2. RUNTIME — least privilege  ', style='rounded',
               color='#22c55e', fontcolor='#166534', fontname='Helvetica', fontsize='12')
        n(s, 'rbac', 'Namespace-scoped Role\nfor the Helm SA\nnever cluster-admin', 'green')
        n(s, 'sec',  'Release state = Secrets\nSecret read access =\nread of all values', 'teal')
        n(s, 'psa',  'Pod Security Admission\nrunAsNonRoot · readOnlyRootFilesystem\nallowPrivilegeEscalation: false', 'green')

    with g.subgraph(name='cluster_secrets') as s:
        s.attr(label='  3. SECRETS — keep them out of values.yaml  ', style='rounded',
               color='#ec4899', fontcolor='#9d174d', fontname='Helvetica', fontsize='12')
        n(s, 'sops', 'helm-secrets + SOPS\nage or cloud KMS', 'pink')
        n(s, 'eso',  'External Secrets Operator\nchart renders a reference,\nnot the value', 'pink')
        n(s, 'never','Never: plaintext secrets\nin values.yaml committed\nto git', 'red')

    n(g, 'scan', 'Scanning\nhelm template | trivy/kubesec\nOPA / Kyverno policy gate in CI\nimage scanning of chart images', 'gold')
    e(g, 'pin',  'rbac', '', '#94a3b8', 'dotted')
    e(g, 'psa',  'sops', '', '#94a3b8', 'dotted')
    e(g, 'never','scan', '', '#94a3b8', 'dotted')
    save(g, 'helm-10-security')


# ─────────────────────────────────────────────────────────────────────
# 11 — Helm 3 vs Helm 4
# ─────────────────────────────────────────────────────────────────────
def diag_migration():
    g = base_graph('helm_11_migration', 'Helm 3 to Helm 4 — what actually changed')
    g.attr(rankdir='TB')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'h3', 'Helm 3\nclient-side apply\n3-way merge from the\nlast-applied-configuration\nannotation', 'gold')
        n(s, 'h4', 'Helm 4 (Nov 2025, KubeCon NA)\nstable 4.2.2\nserver-side apply by default\nfield ownership tracked\nby the API server', 'green')

    e(g, 'h3', 'h4', 'upgrade path')

    n(g, 'ssa',  'Server-side apply\nAPI server owns the merge\nField manager conflicts surface\nas explicit errors', 'navy')
    n(g, 'conf', 'New failure mode\nfields co-owned with a controller\n(HPA replicas, mesh injection)\nnow conflict instead of\nsilently flapping', 'red')
    n(g, 'store','Release storage\nstill Secrets, type\nhelm.sh/release.v1\nunchanged from Helm 3', 'teal')
    n(g, 'ns',   'Improved namespace isolation', 'cyan')

    n(g, 'plan', 'Migration approach\n1. helm template diff old vs new\n2. Upgrade in non-prod first\n3. Watch for field-manager conflicts\n4. Resolve with --force only\n   as a deliberate last resort\n5. Helm 3 charts mostly work as-is', 'purple')

    e(g, 'h4', 'ssa')
    e(g, 'ssa', 'conf', 'main upgrade risk', '#dc2626')
    e(g, 'h4', 'store')
    e(g, 'h4', 'ns')
    e(g, 'conf', 'plan')
    save(g, 'helm-11-migration')


# ─────────────────────────────────────────────────────────────────────
# 12 — Production patterns
# ─────────────────────────────────────────────────────────────────────
def diag_production():
    g = base_graph('helm_12_production', 'Production estates — Helmfile, umbrella charts, and library charts')
    g.attr(rankdir='TB')

    n(g, 'prob', 'Problem at scale\ntens to hundreds of charts,\nmany clusters, shared config,\ncoordinated releases', 'red')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'hf',  'Helmfile\nhelmfile.yaml declares\nmany releases + environments\nhelmfile apply / diff\nreleases stay independent', 'navy')
        n(s, 'umb', 'Umbrella chart\none parent, many sub-charts\nsingle atomic release\nsingle rollback unit\nrisk: one bad sub-chart\nblocks everything', 'gold')
        n(s, 'lib', 'Library chart\ntype: library\nshared _helpers only\nDRY labels, probes,\nsecurity contexts', 'purple')

    n(g, 'pick', 'Choosing\nHelmfile: independent services,\n  per-service rollback\nUmbrella: tightly coupled set\n  released together\nLibrary: cross-cutting template reuse', 'cyan')

    n(g, 'drift','Drift detection\nhelm diff plugin in CI\nGitOps controller reports\nOutOfSync continuously', 'teal')
    n(g, 'roll', 'Rollback at scale\nhelm rollback restores manifests,\nNOT database state\nBackward-compatible migrations\nare a hard requirement', 'amber')
    n(g, 'ver',  'Version discipline\npin every dependency\nChart.lock committed\nappVersion tracks the image tag', 'green')

    e(g, 'prob', 'hf'); e(g, 'prob', 'umb'); e(g, 'prob', 'lib')
    e(g, 'hf', 'pick'); e(g, 'umb', 'pick'); e(g, 'lib', 'pick')
    e(g, 'pick', 'drift'); e(g, 'pick', 'roll'); e(g, 'pick', 'ver')
    save(g, 'helm-12-production')


if __name__ == '__main__':
    diag_why()
    diag_cli()
    diag_anatomy()
    diag_templating()
    diag_values()
    diag_dependencies()
    diag_oci()
    diag_hooks()
    diag_cicd()
    diag_security()
    diag_migration()
    diag_production()
    print('\nAll 12 Helm diagrams generated.')
