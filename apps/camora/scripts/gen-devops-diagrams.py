#!/usr/bin/env python3
"""Generate DevOps category diagrams. All landscape (LR) Graphviz PNGs.

~30+ diagrams covering 11 sub-categories. PPT-presentation-style:
short labels, color-coded nodes, primary-source-grounded content.
Output: apps/camora/public/diagrams/devops/*.png
"""
import graphviz
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'devops')
os.makedirs(OUT, exist_ok=True)

# Same shared style as gen-sre-diagrams.py — visual consistency across categories.
NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue',
            fontsize='12', penwidth='1.5', height='0.45', margin='0.15,0.08')
EDGE = dict(fontname='Helvetica Neue', fontsize='10', penwidth='1.5')
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
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.5', nodesep='0.7', ranksep='0.9',
           splines='spline', rankdir='LR',
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    return g


# ─────────────────────────────────────────────────────────────────────
# A — Foundations & Culture
# ─────────────────────────────────────────────────────────────────────
def diag_three_ways():
    g = base_graph('a1_three_ways', 'The Three Ways — Phoenix Project / DevOps Handbook')
    n(g, 'biz',  'Idea / Customer\nrequest', 'gray')
    n(g, 'dev',  'Development', 'navy')
    n(g, 'ops',  'Operations\n+ Production', 'green')
    n(g, 'user', 'User /\nfeedback', 'gold')
    n(g, 'first', '1st Way: FLOW\n(left → right)\nbatch size, automation,\nIaC, CI/CD', 'navy')
    n(g, 'second','2nd Way: FEEDBACK\n(right → left)\ntelemetry, alerts,\npostmortems', 'red')
    n(g, 'third', '3rd Way: LEARNING\n(continual)\nblameless postmortems,\ngame days, kata', 'purple')
    e(g, 'biz',  'dev')
    e(g, 'dev',  'ops')
    e(g, 'ops',  'user')
    e(g, 'first', 'dev', '', '#94a3b8', 'dotted')
    e(g, 'first', 'ops', '', '#94a3b8', 'dotted')
    e(g, 'user', 'dev', 'feedback', '#dc2626')
    e(g, 'second','user','observe', '#94a3b8', 'dotted')
    e(g, 'third','first','meta', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'a1-three-ways'), cleanup=True)
    print('Generated: a1-three-ways')


def diag_dora_metrics():
    g = base_graph('a2_dora_metrics', 'DORA — 4 keys × Elite/High/Medium/Low bands')
    n(g, 'velocity', 'VELOCITY pair', 'navy')
    n(g, 'df', 'Deploy Frequency\nElite: multiple/day\nHigh: daily-weekly\nLow: monthly+', 'green')
    n(g, 'lt', 'Lead Time\nElite: < 1 day\nHigh: 1d-1w\nLow: 1-6 months', 'green')
    n(g, 'stability', 'STABILITY pair', 'navy')
    n(g, 'cfr', 'Change Failure Rate\nElite: 0-15%\nHigh: 16-30%\nLow: 46-60%', 'gold')
    n(g, 'mttr', 'MTTR\nElite: < 1 hour\nHigh: < 1 day\nLow: 1+ weeks', 'gold')
    n(g, 'finding', 'KEY: speed-stability\nis NOT a tradeoff.\nElites win on BOTH.', 'red')
    e(g, 'velocity', 'df')
    e(g, 'velocity', 'lt')
    e(g, 'stability', 'cfr')
    e(g, 'stability', 'mttr')
    e(g, 'velocity', 'finding')
    e(g, 'stability','finding')
    g.render(os.path.join(OUT, 'a2-dora-metrics'), cleanup=True)
    print('Generated: a2-dora-metrics')


def diag_westrum_calms():
    g = base_graph('a3_westrum_calms', 'Westrum + CALMS — culture diagnoses, CALMS prescribes')
    n(g, 'patho', 'Pathological\n(power-driven)\nhide failure\nshoot messengers', 'red')
    n(g, 'bureau', 'Bureaucratic\n(rule-driven)\nsilo defense\nturf wars', 'gold')
    n(g, 'gen', 'Generative\n(performance-driven)\ninfo flows freely\nfailure → learning', 'green')
    n(g, 'calms', 'CALMS:\n• Culture\n• Automation\n• Lean\n• Measurement\n• Sharing', 'navy')
    e(g, 'patho', 'bureau', 'mature')
    e(g, 'bureau','gen', 'mature')
    e(g, 'calms', 'gen', 'practices\nfit', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'a3-westrum-calms'), cleanup=True)
    print('Generated: a3-westrum-calms')


def diag_team_topologies():
    g = base_graph('a4_team_topologies', 'Team Topologies (Skelton & Pais 2019) — 4 types + 3 modes')
    n(g, 'sa', 'Stream-Aligned\n(80% of teams)\nend-to-end product\nownership', 'green')
    n(g, 'en', 'Enabling\n(specialists who teach)\ntime-boxed; withdraw', 'gold')
    n(g, 'cs', 'Complicated Subsystem\n(specialists who own)\nML, video, payments', 'navy')
    n(g, 'pl', 'Platform\n(self-service)\nthinnest viable platform\nproduct mindset', 'purple')
    n(g, 'modes','Interaction modes:\n1. Collaboration (weeks)\n2. X-as-a-Service\n3. Facilitating', 'gray')
    e(g, 'sa', 'en', 'consume\nfacilitating')
    e(g, 'sa', 'cs', 'consume\nas-a-service')
    e(g, 'sa', 'pl', 'consume\nas-a-service')
    e(g, 'modes','sa', 'governs', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'a4-team-topologies'), cleanup=True)
    print('Generated: a4-team-topologies')


def diag_value_stream():
    g = base_graph('a5_value_stream', 'Value Stream — current state vs future state')
    n(g, 'idea', 'Idea', 'gray')
    n(g, 'code', 'Code\n2 weeks (PT)', 'navy')
    n(g, 'review','Review\nLT 3 weeks\nWAIT 95%', 'red')
    n(g, 'qa', 'QA queue\nLT 4 weeks\nWAIT 99%', 'red')
    n(g, 'env', 'Stage env\nLT 1 week\nWAIT 95%', 'red')
    n(g, 'cab', 'CAB approval\nLT 3 weeks\nWAIT 100%', 'red')
    n(g, 'prod', 'Production', 'green')
    n(g, 'fix', 'Fix:\n• small PRs\n• shift-left QA\n• IaC envs\n• policy-as-code', 'gold')
    e(g, 'idea','code')
    e(g, 'code','review')
    e(g, 'review','qa')
    e(g, 'qa', 'env')
    e(g, 'env', 'cab')
    e(g, 'cab', 'prod')
    e(g, 'fix', 'review','target', '#16a34a', 'dashed')
    e(g, 'fix', 'qa',    'target', '#16a34a', 'dashed')
    e(g, 'fix', 'cab',   'target', '#16a34a', 'dashed')
    g.render(os.path.join(OUT, 'a5-value-stream'), cleanup=True)
    print('Generated: a5-value-stream')


# ─────────────────────────────────────────────────────────────────────
# B — CI/CD Fundamentals
# ─────────────────────────────────────────────────────────────────────
def diag_ci():
    g = base_graph('b1_ci', 'Continuous Integration — Fowler\'s canonical loop')
    n(g, 'dev1', 'Dev A', 'navy')
    n(g, 'dev2', 'Dev B', 'navy')
    n(g, 'main', 'main\n(integration target)', 'green')
    n(g, 'ci',   'CI server\nbuild + test\non every push', 'gold')
    n(g, 'red',  'Red build\nteam stops\nuntil green', 'red')
    e(g, 'dev1', 'main', 'commit\ndaily+')
    e(g, 'dev2', 'main', 'commit\ndaily+')
    e(g, 'main', 'ci',   'trigger')
    e(g, 'ci',   'red',  'fail', '#dc2626', 'dashed')
    e(g, 'red',  'main', 'fix fast', '#16a34a')
    g.render(os.path.join(OUT, 'b1-ci'), cleanup=True)
    print('Generated: b1-ci')


def diag_cd_vs_deploy():
    g = base_graph('b2_cd_vs_deploy', 'Continuous Delivery vs Continuous Deployment (Humble & Farley)')
    n(g, 'main',  'main green', 'green')
    n(g, 'cd',    'Continuous Delivery\nready to release\nat any moment\n(MANUAL gate to prod)', 'navy')
    n(g, 'cdep',  'Continuous Deployment\nevery merge\nauto-deploys to prod\n(NO manual gate)', 'gold')
    n(g, 'note',  'CD is the capability;\nCDeploy is the choice\nto exercise it.', 'gray')
    e(g, 'main', 'cd')
    e(g, 'main', 'cdep')
    e(g, 'cd',   'cdep', 'remove the gate', '#94a3b8', 'dashed')
    e(g, 'cdep', 'note', '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'b2-cd-vs-deploy'), cleanup=True)
    print('Generated: b2-cd-vs-deploy')


def diag_pipeline_as_code():
    g = base_graph('b3_pipeline_as_code', 'Pipeline-as-code — declarative YAML or scripted DSL')
    n(g, 'repo', 'Source repo', 'navy')
    n(g, 'cfg',  'Pipeline config\n(.github/workflows/*.yml,\n.gitlab-ci.yml,\nJenkinsfile)', 'gold')
    n(g, 'agent','CI runner\n(GitHub Actions hosted,\nself-hosted, k8s)', 'green')
    n(g, 'stages','Stages:\nbuild → test →\npackage → deploy', 'navy')
    n(g, 'reuse','Reusable workflows\n(GitHub composite,\nGitLab include,\nshared libs)', 'purple')
    e(g, 'repo', 'cfg', 'declares')
    e(g, 'cfg',  'agent','run on')
    e(g, 'agent','stages','executes')
    e(g, 'cfg',  'reuse','imports', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'b3-pipeline-as-code'), cleanup=True)
    print('Generated: b3-pipeline-as-code')


def diag_test_pyramid():
    g = base_graph('b4_test_pyramid', 'Test pyramid (Mike Cohn) — 70/20/10 vs ice-cream cone anti-pattern')
    n(g, 'unit',  'Unit\n70% of tests\n< 100ms\nFAST + cheap', 'green')
    n(g, 'int',   'Integration\n20%\n< 1s\nDB, cache,\nadjacent services', 'gold')
    n(g, 'e2e',   'E2E\n10%\n> 5s\nfull flow\n(Playwright,\nCypress)', 'red')
    n(g, 'anti',  'Ice-cream cone\nanti-pattern:\ntop-heavy E2E\nslow + flaky', 'red')
    n(g, 'extras','Plus:\n• Contract (Pact)\n• Performance (k6)\n• Security (SAST/DAST)', 'navy')
    e(g, 'unit',  'int')
    e(g, 'int',   'e2e')
    e(g, 'anti',  'unit', 'invert', '#dc2626', 'dashed')
    e(g, 'extras','int',  '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'b4-test-pyramid'), cleanup=True)
    print('Generated: b4-test-pyramid')


def diag_monorepo_build():
    g = base_graph('b5_monorepo_build', 'Monorepo build systems — Bazel / Nx / Turborepo / Pants')
    n(g, 'bazel', 'Bazel (Google)\nprecision, hermetic,\n60% build speedup\nat scale.\nLearning curve: high', 'navy')
    n(g, 'nx',    'Nx\nmulti-language,\ncodegen, arch rules\n50+ packages', 'green')
    n(g, 'turbo', 'Turborepo\nJS/TS-only,\nsimple caching,\nVercel integration\n5-50 packages', 'gold')
    n(g, 'pants', 'Pants\npolyglot Py/Go/JVM,\nauto dep inference', 'purple')
    n(g, 'cache', 'Remote caching\n(BuildBuddy,\nNx Cloud,\nVercel)\nshared across CI', 'red')
    e(g, 'bazel', 'cache')
    e(g, 'nx',    'cache')
    e(g, 'turbo', 'cache')
    e(g, 'pants', 'cache')
    g.render(os.path.join(OUT, 'b5-monorepo-build'), cleanup=True)
    print('Generated: b5-monorepo-build')


def diag_trunk():
    g = base_graph('b6_trunk', 'Trunk-based development (Hammant) — vs Git Flow vs GitHub Flow')
    n(g, 'tbd',  'Trunk-based\nshort branches < 24h\nor commit-to-trunk\nfeature flags for WIP', 'green')
    n(g, 'gf',   'Git Flow (legacy)\nlong release branches\nfeature/develop/release/hotfix\nslow integration', 'red')
    n(g, 'ghf',  'GitHub Flow\nPR-based\nlong-lived main\nfeature branches\n(short-lived)', 'gold')
    n(g, 'note', 'Google: 35,000+\ndevelopers on a single\ntrunk in monorepo.\nLow CFR, high deploy freq.', 'navy')
    e(g, 'gf',   'tbd', 'modernize', '#16a34a', 'dashed')
    e(g, 'ghf',  'tbd', 'shorten branches', '#16a34a', 'dashed')
    e(g, 'tbd',  'note', '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'b6-trunk'), cleanup=True)
    print('Generated: b6-trunk')


# ─────────────────────────────────────────────────────────────────────
# C — Continuous Delivery Practices
# ─────────────────────────────────────────────────────────────────────
def diag_progressive_delivery():
    g = base_graph('c1_progressive_delivery', 'Progressive Delivery — canary, blue/green, dark, A/B')
    n(g, 'main', 'main green\n(deployable)', 'green')
    n(g, 'canary','Canary\n5% → 25% → 50% → 100%\nSLO-gated promotions', 'navy')
    n(g, 'bg',   'Blue/Green\n2 envs;\nflip traffic instantly', 'gold')
    n(g, 'dark', 'Dark launch\n(shadow traffic)\nrun in prod\nignore output', 'purple')
    n(g, 'ab',   'A/B test\nbusiness metric;\nnot just safety', 'cyan')
    n(g, 'flag', 'Feature flag\n(decouple deploy\nfrom release)', 'red')
    e(g, 'main', 'canary')
    e(g, 'main', 'bg')
    e(g, 'main', 'dark')
    e(g, 'main', 'ab')
    e(g, 'flag', 'canary', '', '#94a3b8', 'dotted')
    e(g, 'flag', 'bg',     '', '#94a3b8', 'dotted')
    e(g, 'flag', 'ab',     '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'c1-progressive-delivery'), cleanup=True)
    print('Generated: c1-progressive-delivery')


def diag_feature_flags():
    g = base_graph('c2_feature_flags', 'Feature flags landscape — LaunchDarkly / Unleash / Statsig / OpenFeature')
    n(g, 'ld',   'LaunchDarkly\nincumbent, governance,\nenterprise', 'navy')
    n(g, 'st',   'Statsig\nexperimentation-first,\nstats rigor\n(acquired by OpenAI)', 'green')
    n(g, 'unl',  'Unleash\nopen-source\nself-hostable', 'gold')
    n(g, 'fls',  'Flagsmith\nopen-source\nmulti-tenant', 'purple')
    n(g, 'spl',  'Split.io\nA/B + flags\nNew Relic acquired', 'cyan')
    n(g, 'of',   'OpenFeature\n(CNCF spec)\nvendor-neutral SDK', 'red')
    e(g, 'ld',   'of', 'implements')
    e(g, 'st',   'of', 'implements')
    e(g, 'unl',  'of', 'implements')
    e(g, 'fls',  'of', 'implements')
    e(g, 'spl',  'of', 'implements')
    g.render(os.path.join(OUT, 'c2-feature-flags'), cleanup=True)
    print('Generated: c2-feature-flags')


def diag_deployment_strategies():
    g = base_graph('c3_deployment_strategies', 'Deployment strategies — risk vs cost')
    n(g, 'rec',  'Recreate\nstop-replace-start\nDOWNTIME\ncheap', 'red')
    n(g, 'roll', 'Rolling\nreplace pods\ngradually\n(K8s default)', 'gold')
    n(g, 'bg',   'Blue/Green\nflip instantly\nDOUBLE infra cost', 'navy')
    n(g, 'can',  'Canary\nincremental %\nSLO-gated\nlowest risk', 'green')
    n(g, 'shad', 'Shadow\nduplicate traffic\nignore response\nzero user risk', 'purple')
    n(g, 'ab',   'A/B testing\nmeasure business\nmetric, not safety', 'cyan')
    e(g, 'rec',  'roll', 'mature', '#94a3b8', 'dashed')
    e(g, 'roll', 'bg',   'mature', '#94a3b8', 'dashed')
    e(g, 'bg',   'can',  'mature', '#94a3b8', 'dashed')
    e(g, 'can',  'shad', 'pre-prod', '#94a3b8', 'dotted')
    e(g, 'can',  'ab',   'product', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'c3-deployment-strategies'), cleanup=True)
    print('Generated: c3-deployment-strategies')


def diag_db_migrations_cicd():
    g = base_graph('c4_db_migrations', 'DB migrations in CI/CD — expand & contract')
    n(g, 't0',   'T0\nschema v1\napp v1', 'green')
    n(g, 'exp',  'EXPAND\n+ new col (nullable)\nbackward compatible', 'gold')
    n(g, 'fill', 'BACKFILL\npopulate new col\nbackground job', 'navy')
    n(g, 'app2', 'app v2\nreads new col\nfalls back to old', 'green')
    n(g, 'app3', 'app v3\nreads only new col', 'green')
    n(g, 'con',  'CONTRACT\n- drop old col', 'red')
    n(g, 'tools','Tools:\nFlyway, Liquibase,\nAtlas (Ariga),\nBytebase', 'purple')
    e(g, 't0',  'exp')
    e(g, 'exp', 'fill')
    e(g, 'fill','app2')
    e(g, 'app2','app3')
    e(g, 'app3','con')
    e(g, 'tools','exp', 'apply', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'c4-db-migrations'), cleanup=True)
    print('Generated: c4-db-migrations')


def diag_release_engineering():
    g = base_graph('c5_release_engineering', 'Release engineering — SemVer + conventional commits + automation')
    n(g, 'commits','Commit messages\nfix: → PATCH\nfeat: → MINOR\nBREAKING → MAJOR', 'navy')
    n(g, 'cc',   'conventionalcommits.org\nspec', 'gold')
    n(g, 'sr',   'semantic-release\nautomate version,\nchangelog, publish', 'green')
    n(g, 'ver',  'SemVer 2.0\nMAJOR.MINOR.PATCH', 'purple')
    n(g, 'ghr',  'GitHub Release\n+ artifacts\n+ notes', 'red')
    e(g, 'commits','cc',  'follows')
    e(g, 'cc',     'sr',  'parsed by')
    e(g, 'sr',     'ver', 'computes')
    e(g, 'ver',    'ghr', 'tagged')
    g.render(os.path.join(OUT, 'c5-release-engineering'), cleanup=True)
    print('Generated: c5-release-engineering')


# ─────────────────────────────────────────────────────────────────────
# D — Infrastructure as Code
# ─────────────────────────────────────────────────────────────────────
def diag_iac_fundamentals():
    g = base_graph('d1_iac_fundamentals', 'IaC philosophy (Kief Morris) — declarative + idempotent + versioned')
    n(g, 'manual','Manual provisioning\n(snowflakes,\nclick-ops)', 'red')
    n(g, 'iac',   'IaC\n• declarative\n• idempotent\n• version-controlled\n• repeatable\n• audited', 'green')
    n(g, 'flow',  'Flow:\nedit → PR → review →\nplan → apply →\nstate updated', 'navy')
    n(g, 'tools', 'Tools:\nTerraform / OpenTofu\nPulumi / CDK / Bicep\nCrossplane', 'gold')
    e(g, 'manual','iac', 'modernize', '#16a34a', 'dashed')
    e(g, 'iac',   'flow')
    e(g, 'flow',  'tools', 'implemented by', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'd1-iac-fundamentals'), cleanup=True)
    print('Generated: d1-iac-fundamentals')


def diag_terraform_internals():
    g = base_graph('d2_terraform_internals', 'Terraform — init / plan / apply lifecycle')
    n(g, 'code', 'HCL\nresource blocks\nvariables\nmodules', 'navy')
    n(g, 'init', 'terraform init\ndownload providers\ninit backend', 'green')
    n(g, 'plan', 'terraform plan\nshow proposed changes\n(read-only)', 'gold')
    n(g, 'apply','terraform apply\nexecute changes\nupdate state', 'red')
    n(g, 'state','State file\n(S3 + DynamoDB lock,\nTerraform Cloud,\nor local)', 'purple')
    n(g, 'cloud','Provider APIs\nAWS / GCP / Azure /\nKubernetes / GitHub /\n1000+', 'cyan')
    e(g, 'code', 'init')
    e(g, 'init', 'plan')
    e(g, 'plan', 'apply')
    e(g, 'apply','state', 'updates')
    e(g, 'apply','cloud', 'CRUD')
    e(g, 'state','plan',  'reads', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'd2-terraform-internals'), cleanup=True)
    print('Generated: d2-terraform-internals')


def diag_pulumi():
    g = base_graph('d3_pulumi', 'Pulumi — language-native IaC + Automation API')
    n(g, 'lang', 'TypeScript\nPython\nGo\nC# / Java', 'navy')
    n(g, 'sdk',  'Pulumi SDK\nclasses, functions,\ncontrol flow', 'gold')
    n(g, 'graph','Resource graph\n(declarative model)', 'green')
    n(g, 'state','Pulumi Service\n(or self-hosted)\nstate + history', 'purple')
    n(g, 'auto', 'Automation API\nprogrammatic\nstack ops\n→ self-service', 'red')
    e(g, 'lang', 'sdk')
    e(g, 'sdk',  'graph')
    e(g, 'graph','state')
    e(g, 'auto', 'sdk', 'embeds', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'd3-pulumi'), cleanup=True)
    print('Generated: d3-pulumi')


def diag_cloud_native_iac():
    g = base_graph('d4_cloud_native_iac', 'Cloud-native IaC — CDK / Bicep / Crossplane')
    n(g, 'cdk',  'AWS CDK\nTS / Python\n→ CloudFormation\n(L1/L2/L3 constructs)', 'gold')
    n(g, 'bicep','Azure Bicep\nstructured DSL\n→ ARM templates', 'navy')
    n(g, 'cft',  'GCP CFT\nPython modules\npolicy validator', 'green')
    n(g, 'cross','Crossplane\nK8s-native CRDs\n→ multi-cloud\n+ GitOps', 'purple')
    n(g, 'shared','Shared:\nhigher-level abstractions\nover raw cloud APIs', 'gray')
    e(g, 'cdk',  'shared')
    e(g, 'bicep','shared')
    e(g, 'cft',  'shared')
    e(g, 'cross','shared')
    g.render(os.path.join(OUT, 'd4-cloud-native-iac'), cleanup=True)
    print('Generated: d4-cloud-native-iac')


def diag_iac_state():
    g = base_graph('d5_iac_state', 'IaC state at scale — backends + locking + drift')
    n(g, 's3',   'S3 bucket\n(versioned)\n+ DynamoDB table\n(lock)', 'navy')
    n(g, 'tfc',  'Terraform Cloud\nencrypted state,\nrun history,\nSentinel policies', 'gold')
    n(g, 'spc',  'Spacelift /\nEnv0\napproval workflows\ncost gates', 'green')
    n(g, 'atl',  'Atlantis\nself-hosted\nplan-on-PR', 'purple')
    n(g, 'drift','Drift detection\ndriftctl, AWS Config,\nscheduled plans', 'red')
    e(g, 's3',  'drift')
    e(g, 'tfc', 'drift')
    e(g, 'spc', 'drift')
    e(g, 'atl', 'drift')
    g.render(os.path.join(OUT, 'd5-iac-state'), cleanup=True)
    print('Generated: d5-iac-state')


def diag_iac_governance():
    g = base_graph('d6_iac_governance', 'IaC governance — policy-as-code + cost gates')
    n(g, 'plan', 'terraform plan\noutput', 'navy')
    n(g, 'opa',  'OPA + Rego\ngeneral policy', 'green')
    n(g, 'check','Checkov / tfsec\nCIS, PCI, HIPAA\nrules', 'gold')
    n(g, 'sent', 'Sentinel\nTerraform Cloud only', 'purple')
    n(g, 'cost', 'Infracost\nestimate $ delta;\nblock if > threshold', 'red')
    n(g, 'merge','Block merge\nor apply', 'cyan')
    e(g, 'plan', 'opa')
    e(g, 'plan', 'check')
    e(g, 'plan', 'sent')
    e(g, 'plan', 'cost')
    e(g, 'opa',  'merge', 'gate')
    e(g, 'check','merge', 'gate')
    e(g, 'sent', 'merge', 'gate')
    e(g, 'cost', 'merge', 'gate')
    g.render(os.path.join(OUT, 'd6-iac-governance'), cleanup=True)
    print('Generated: d6-iac-governance')


# ─────────────────────────────────────────────────────────────────────
# E — Configuration Management
# ─────────────────────────────────────────────────────────────────────
def diag_ansible():
    g = base_graph('e1_ansible', 'Ansible — push-based agentless model')
    n(g, 'ctrl', 'Control node\n(your laptop / CI)\nansible CLI', 'navy')
    n(g, 'inv',  'Inventory\nstatic YAML\nor dynamic plugin', 'gold')
    n(g, 'pb',   'Playbook\n(YAML)\nplays + tasks', 'green')
    n(g, 'role', 'Role\nreusable\n(Galaxy)', 'purple')
    n(g, 'ssh',  'SSH (Linux) /\nWinRM (Windows)\nno agent required', 'red')
    n(g, 'mods', '5000+ modules\n(yum, apt, systemd,\nkubectl, etc.)', 'cyan')
    e(g, 'ctrl', 'inv', 'reads')
    e(g, 'ctrl', 'pb',  'runs')
    e(g, 'pb',   'role','imports')
    e(g, 'ctrl', 'ssh', 'connects')
    e(g, 'ssh',  'mods','executes')
    g.render(os.path.join(OUT, 'e1-ansible'), cleanup=True)
    print('Generated: e1-ansible')


def diag_pcs():
    g = base_graph('e2_pcs', 'Puppet vs Chef vs Salt — agent and DSL trade-offs')
    n(g, 'pup',  'Puppet\nRuby DSL\npull-based agent\nenterprise RBAC', 'navy')
    n(g, 'chef', 'Chef\nRuby DSL\npull-based agent\n(declining usage)', 'red')
    n(g, 'salt', 'Salt\nPython, ZMQ\nevent-driven\nhigh concurrency', 'green')
    n(g, 'ans',  'Ansible (compare)\npush-based\nagentless', 'gold')
    e(g, 'pup',  'ans', 'agent vs none')
    e(g, 'chef', 'ans', 'agent vs none')
    e(g, 'salt', 'ans', 'event vs cmd')
    g.render(os.path.join(OUT, 'e2-pcs'), cleanup=True)
    print('Generated: e2-pcs')


def diag_immutable():
    g = base_graph('e3_immutable', 'Immutable infrastructure (Fowler 2013) — bake, replace, never modify')
    n(g, 'src',  'Source\n(app + OS)', 'navy')
    n(g, 'pack', 'Packer\n(HashiCorp)\nbake image', 'gold')
    n(g, 'img',  'Golden image\nAMI / Docker /\nVM template\nimmutable', 'green')
    n(g, 'asg',  'Deploy:\nlaunch new instances\nfrom golden image', 'purple')
    n(g, 'old',  'Discard old\ninstances\n(no patching!)', 'red')
    e(g, 'src',  'pack')
    e(g, 'pack', 'img')
    e(g, 'img',  'asg')
    e(g, 'asg',  'old', 'replace')
    g.render(os.path.join(OUT, 'e3-immutable'), cleanup=True)
    print('Generated: e3-immutable')


def diag_drift_remediation():
    g = base_graph('e4_drift_remediation', 'Drift detection + remediation — automated reconciliation')
    n(g, 'desired','Desired state\n(IaC code, K8s spec)', 'green')
    n(g, 'actual', 'Actual state\n(cloud reality)', 'navy')
    n(g, 'diff',   'Drift detected\nsomething changed\noutside of code', 'red')
    n(g, 'tools',  'Tools:\nAWS Config rules,\nDriftctl, Crossplane,\nGCP Asset Inventory', 'gold')
    n(g, 'fix',    'Remediate:\n• reapply IaC\n• alert + ticket\n• continuous reconcile\n  (Crossplane / GitOps)', 'purple')
    e(g, 'desired','diff', 'compare')
    e(g, 'actual', 'diff', 'compare')
    e(g, 'tools',  'diff', 'detect', '#94a3b8', 'dotted')
    e(g, 'diff',   'fix')
    g.render(os.path.join(OUT, 'e4-drift-remediation'), cleanup=True)
    print('Generated: e4-drift-remediation')


# ─────────────────────────────────────────────────────────────────────
# F — Containers & Images
# ─────────────────────────────────────────────────────────────────────
def diag_container_fundamentals():
    g = base_graph('f1_container_fundamentals', 'Container fundamentals — Linux primitives + OCI specs')
    n(g, 'ns', 'Namespaces (7)\npid / ipc / uts /\nnet / mnt / user / cgroup\n→ isolation', 'navy')
    n(g, 'cg', 'Cgroups v2\n→ resource limits\n(CPU, mem, I/O, pids)', 'green')
    n(g, 'fs', 'OverlayFS\n→ layered, CoW\nlayer reuse', 'gold')
    n(g, 'oci','OCI specs:\n• Image (manifest, layers)\n• Runtime (process model)\n• Distribution (registry API)', 'purple')
    n(g, 'rt', 'Runtimes:\nrunc / crun / kata /\ngVisor', 'red')
    e(g, 'ns', 'oci', 'used by')
    e(g, 'cg', 'oci', 'used by')
    e(g, 'fs', 'oci', 'used by')
    e(g, 'oci','rt',  'implemented by')
    g.render(os.path.join(OUT, 'f1-container-fundamentals'), cleanup=True)
    print('Generated: f1-container-fundamentals')


def diag_docker_buildkit():
    g = base_graph('f2_docker_buildkit', 'Docker history + BuildKit (2018)')
    n(g, 'dot',  'dotCloud (2010)\nLXC + union FS', 'gray')
    n(g, 'di',   'Docker Inc. (2013)\nDockerfile DSL', 'navy')
    n(g, 'cd',   'containerd (2016)\nCNCF graduated\nlower-layer runtime', 'green')
    n(g, 'bk',   'BuildKit (2018)\nconcurrent layers\nbetter caching\nsecrets / SSH forwarding', 'gold')
    n(g, 'bx',   'docker buildx\nmulti-platform\n(AMD64 / ARM64\nvia QEMU)', 'red')
    e(g, 'dot',  'di',  'pivot')
    e(g, 'di',   'cd',  'extract')
    e(g, 'cd',   'bk',  'build daemon')
    e(g, 'bk',   'bx',  'plugin')
    g.render(os.path.join(OUT, 'f2-docker-buildkit'), cleanup=True)
    print('Generated: f2-docker-buildkit')


def diag_image_hardening():
    g = base_graph('f3_image_hardening', 'Image hardening — multi-stage, distroless, scratch')
    n(g, 'large','golang:1.23\n800 MB\n(builder stage)', 'red')
    n(g, 'multi','Multi-stage\nFROM golang AS builder\n... build ...\nFROM distroless\nCOPY binary', 'gold')
    n(g, 'distro','distroless/base-debian12\n5 MB\nno shell, no apt', 'green')
    n(g, 'scratch','FROM scratch\n0 MB base\n(static Go binary only)', 'navy')
    n(g, 'scan',  'Scan:\nTrivy / Grype /\nSnyk / Anchore', 'purple')
    e(g, 'large', 'multi', 'reduce')
    e(g, 'multi', 'distro','final stage')
    e(g, 'multi', 'scratch','final stage (Go)')
    e(g, 'distro','scan')
    e(g, 'scratch','scan')
    g.render(os.path.join(OUT, 'f3-image-hardening'), cleanup=True)
    print('Generated: f3-image-hardening')


def diag_buildpacks():
    g = base_graph('f4_buildpacks', 'Build alternatives — Buildpacks / Jib / ko')
    n(g, 'df',   'Dockerfile\nimperative\nlanguage-agnostic', 'gold')
    n(g, 'bp',   'Cloud Native Buildpacks\nauto-detect language\n(Heroku → CNCF)\npack build', 'green')
    n(g, 'jib',  'Jib (Google)\nJava only\nMaven / Gradle plugin\nno Docker daemon', 'navy')
    n(g, 'ko',   'ko (Google)\nGo only\nbuild + push in one\nminimal config', 'purple')
    n(g, 'note', 'Trade-off:\nDeclarative + language-aware\nvs explicit control', 'red')
    e(g, 'df',  'note', '× imperative')
    e(g, 'bp',  'note', '✓ declarative')
    e(g, 'jib', 'note', '✓ declarative')
    e(g, 'ko',  'note', '✓ declarative')
    g.render(os.path.join(OUT, 'f4-buildpacks'), cleanup=True)
    print('Generated: f4-buildpacks')


def diag_container_security():
    g = base_graph('f5_container_security', 'Container security — sign + verify + admission + runtime')
    n(g, 'build','CI build', 'navy')
    n(g, 'cosign','Sigstore + cosign\nkeyless via OIDC', 'green')
    n(g, 'sbom', 'SBOM\nSPDX / CycloneDX\nsyft / grype', 'gold')
    n(g, 'attest','in-toto attestations\nbuild provenance', 'purple')
    n(g, 'reg',  'Registry', 'navy')
    n(g, 'admit','Admission control\nKyverno / OPA Gatekeeper\nverify signatures\nverify SBOM', 'red')
    n(g, 'rt',   'Runtime security\nFalco / Tetragon\n(eBPF)', 'cyan')
    e(g, 'build','cosign')
    e(g, 'build','sbom')
    e(g, 'build','attest')
    e(g, 'cosign','reg')
    e(g, 'sbom','reg')
    e(g, 'attest','reg')
    e(g, 'reg', 'admit', 'on deploy')
    e(g, 'admit','rt',   'allow', '#16a34a')
    g.render(os.path.join(OUT, 'f5-container-security'), cleanup=True)
    print('Generated: f5-container-security')


# ─────────────────────────────────────────────────────────────────────
# G — Orchestration & Kubernetes
# ─────────────────────────────────────────────────────────────────────
def diag_k8s_arch():
    g = base_graph('g1_k8s_arch', 'Kubernetes architecture — control + data plane')
    n(g, 'cp', 'CONTROL PLANE', 'navy')
    n(g, 'api','api-server\n(REST + watch)', 'navy')
    n(g, 'etcd','etcd\n(Raft KV store)', 'gold')
    n(g, 'sch','scheduler', 'green')
    n(g, 'cm', 'controller-manager\n(reconciliation loops)', 'purple')
    n(g, 'dp', 'DATA PLANE\n(per node)', 'red')
    n(g, 'kub','kubelet\n(CRI client)', 'red')
    n(g, 'kp', 'kube-proxy\n(iptables / IPVS / eBPF)', 'red')
    n(g, 'cri','containerd / CRI-O', 'gray')
    e(g, 'cp', 'api')
    e(g, 'cp', 'etcd')
    e(g, 'cp', 'sch')
    e(g, 'cp', 'cm')
    e(g, 'api','etcd', 'persists')
    e(g, 'sch','api',  'binds pod')
    e(g, 'cm', 'api',  'reconciles')
    e(g, 'dp', 'kub')
    e(g, 'dp', 'kp')
    e(g, 'kub','cri',  'CRI')
    g.render(os.path.join(OUT, 'g1-k8s-arch'), cleanup=True)
    print('Generated: g1-k8s-arch')


def diag_k8s_resources():
    g = base_graph('g2_k8s_resources', 'K8s core resources + workload patterns')
    n(g, 'pod', 'Pod\n(smallest unit;\nshared network)', 'navy')
    n(g, 'dep', 'Deployment\nrolling update,\nrollback', 'green')
    n(g, 'sts', 'StatefulSet\nordered, persistent', 'gold')
    n(g, 'ds',  'DaemonSet\n1 per node', 'purple')
    n(g, 'job', 'Job / CronJob\nbatch / scheduled', 'red')
    n(g, 'svc', 'Service\nClusterIP / NodePort /\nLoadBalancer', 'cyan')
    n(g, 'ing', 'Ingress / Gateway API\nHTTP routing', 'pink')
    n(g, 'pat', 'Patterns:\nsidecar / ambassador /\nadapter / init', 'gray')
    e(g, 'dep', 'pod')
    e(g, 'sts', 'pod')
    e(g, 'ds',  'pod')
    e(g, 'job', 'pod')
    e(g, 'svc', 'pod', 'routes')
    e(g, 'ing', 'svc')
    e(g, 'pat', 'pod', 'shapes', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'g2-k8s-resources'), cleanup=True)
    print('Generated: g2-k8s-resources')


def diag_helm_kustomize():
    g = base_graph('g3_helm_kustomize', 'Helm vs Kustomize — package manager vs overlay')
    n(g, 'helm','Helm\nGo templating\nreleases (history)\ndependencies\nOCI registry', 'navy')
    n(g, 'kus', 'Kustomize\nbuilt into kubectl\nstrategic merge\nNO templating\nplain YAML', 'green')
    n(g, 'use1','Use Helm:\n3rd-party charts,\nrelease versioning,\ncomplex configs', 'gold')
    n(g, 'use2','Use Kustomize:\nGitOps,\nminimal overhead,\navoid logic in config', 'purple')
    e(g, 'helm','use1')
    e(g, 'kus', 'use2')
    g.render(os.path.join(OUT, 'g3-helm-kustomize'), cleanup=True)
    print('Generated: g3-helm-kustomize')


def diag_operators():
    g = base_graph('g4_operators', 'Kubernetes Operators — CRD + Controller pattern')
    n(g, 'crd', 'CRD\n(Custom Resource\nDefinition)\n→ extends K8s API', 'navy')
    n(g, 'cr',  'CR instance\nuser submits YAML', 'gold')
    n(g, 'ctrl','Controller\nwatches CR,\nreconciles', 'green')
    n(g, 'real','Real-world resource\n(database, queue,\ncertificate, etc.)', 'purple')
    n(g, 'fw',  'Frameworks:\nKubebuilder,\noperator-sdk,\nKUDO', 'red')
    e(g, 'crd', 'cr',   'instantiates')
    e(g, 'cr',  'ctrl', 'observed by')
    e(g, 'ctrl','real', 'creates / updates')
    e(g, 'fw',  'ctrl', 'scaffold', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'g4-operators'), cleanup=True)
    print('Generated: g4-operators')


def diag_service_mesh():
    g = base_graph('g5_service_mesh', 'Service mesh — Istio / Linkerd / Cilium')
    n(g, 'istio','Istio\n(Google/IBM/Lyft)\nfull-featured\nheavyweight\nAmbient (sidecarless)', 'navy')
    n(g, 'lin', 'Linkerd\n(CNCF graduated)\nlightweight\n10% overhead of Istio', 'green')
    n(g, 'cil', 'Cilium Service Mesh\n(eBPF-native, 2023+)\nkernel-level\nhottest in 2026', 'gold')
    n(g, 'cap', 'Capabilities (all):\n• mTLS\n• retries / timeouts\n• traffic shifting\n• circuit breaking\n• observability', 'purple')
    e(g, 'istio','cap')
    e(g, 'lin', 'cap')
    e(g, 'cil', 'cap')
    g.render(os.path.join(OUT, 'g5-service-mesh'), cleanup=True)
    print('Generated: g5-service-mesh')


def diag_gateway_api():
    g = base_graph('g6_gateway_api', 'Gateway API — replacing Ingress (GA in 1.28, 2024)')
    n(g, 'ing', 'Ingress (legacy)\nsimple HTTP routing\nlimited expressiveness', 'red')
    n(g, 'gw',  'Gateway API\nrole-separated\n(infra vs app team)\nTCP / UDP / gRPC', 'green')
    n(g, 'roles','Roles:\n• cluster admin owns Gateway\n• app team owns HTTPRoute\n• infra owns GatewayClass', 'navy')
    n(g, 'impl','Implementations:\nContour, Envoy Gateway,\nCilium Gateway, Traefik,\nNGINX', 'gold')
    e(g, 'ing', 'gw',  'modernize', '#16a34a', 'dashed')
    e(g, 'gw',  'roles')
    e(g, 'gw',  'impl', 'realized by')
    g.render(os.path.join(OUT, 'g6-gateway-api'), cleanup=True)
    print('Generated: g6-gateway-api')


# ─────────────────────────────────────────────────────────────────────
# H — Platform Engineering
# ─────────────────────────────────────────────────────────────────────
def diag_platform_eng():
    g = base_graph('h1_platform_eng', 'Platform Engineering — CNCF maturity model (2024)')
    n(g, 'l1', 'L1 Provisional\nshared infra\nad-hoc tools', 'red')
    n(g, 'l2', 'L2 Operational\ndedicated platform team\nbasic self-service', 'gold')
    n(g, 'l3', 'L3 Scalable\nproduct mindset\nIDP + golden paths', 'green')
    n(g, 'l4', 'L4 Optimized\nDX metrics drive\ncontinuous platform\nimprovement', 'navy')
    e(g, 'l1', 'l2')
    e(g, 'l2', 'l3')
    e(g, 'l3', 'l4')
    g.render(os.path.join(OUT, 'h1-platform-eng'), cleanup=True)
    print('Generated: h1-platform-eng')


def diag_idp():
    g = base_graph('h2_idp', 'Internal Developer Platform — self-service + cognitive load reduction')
    n(g, 'dev', 'Developer\n(stream-aligned team)', 'navy')
    n(g, 'idp', 'IDP\n(self-service portal)', 'green')
    n(g, 'cap', 'Capabilities:\n• provision env\n• deploy\n• observe\n• debug\n• rollback', 'gold')
    n(g, 'plat','Platform team\n(builds, runs IDP)', 'purple')
    n(g, 'infra','Cloud / K8s / IaC\nunderlying infra', 'red')
    e(g, 'dev', 'idp', 'self-service')
    e(g, 'idp', 'cap')
    e(g, 'idp', 'infra', 'abstracts')
    e(g, 'plat','idp', 'owns', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'h2-idp'), cleanup=True)
    print('Generated: h2-idp')


def diag_backstage():
    g = base_graph('h3_backstage', 'Backstage (Spotify, CNCF 2020) — 3 core modules')
    n(g, 'cat',  'Software Catalog\nmetadata of\nservices, libs,\nresources', 'navy')
    n(g, 'sca',  'Scaffolder\ntemplates\n→ new service\nin minutes', 'green')
    n(g, 'doc',  'TechDocs\nMarkdown-as-docs\nin Git, auto-published', 'gold')
    n(g, 'ext',  'Extensible:\nplugins\n(CI/CD, observability,\nincident, costs)', 'purple')
    e(g, 'cat', 'sca', 'feeds')
    e(g, 'cat', 'doc', 'links')
    e(g, 'cat', 'ext', 'extends')
    g.render(os.path.join(OUT, 'h3-backstage'), cleanup=True)
    print('Generated: h3-backstage')


def diag_golden_paths():
    g = base_graph('h4_golden_paths', 'Golden paths (Spotify) — paved roads, not gated cages')
    n(g, 'gp', 'Golden Path\npre-configured\ntemplated journey', 'green')
    n(g, 'best','Encodes best\npractices\n(observability,\nrate limiting,\nauth, security)', 'navy')
    n(g, 'free','Off-path:\nallowed but unsupported.\nReinvent at your\nown cost.', 'gold')
    n(g, 'wrong','GOLDEN CAGES\n(anti-pattern):\nblock all alternatives,\nkill innovation', 'red')
    e(g, 'gp', 'best', 'embeds')
    e(g, 'gp', 'free', 'permits')
    e(g, 'wrong', 'gp', '× avoid', '#dc2626', 'dashed')
    g.render(os.path.join(OUT, 'h4-golden-paths'), cleanup=True)
    print('Generated: h4-golden-paths')


def diag_dx_metrics():
    g = base_graph('h5_dx_metrics', 'Developer Experience — DORA + SPACE')
    n(g, 'dora', 'DORA (4 keys)\nDeploy Freq,\nLead Time,\nCFR, MTTR\n→ delivery perf', 'navy')
    n(g, 'space','SPACE framework\n(Forsgren 2021)\n• Satisfaction\n• Performance\n• Activity\n• Communication\n• Efficiency', 'green')
    n(g, 'use',  'Use both:\nDORA = throughput\nSPACE = experience\n(counter to gaming)', 'gold')
    e(g, 'dora', 'use')
    e(g, 'space','use')
    g.render(os.path.join(OUT, 'h5-dx-metrics'), cleanup=True)
    print('Generated: h5-dx-metrics')


# ─────────────────────────────────────────────────────────────────────
# I — DevSecOps
# ─────────────────────────────────────────────────────────────────────
def diag_shift_left():
    g = base_graph('i1_shift_left', 'Shift-left security — Lietz / DevSecOps Manifesto')
    n(g, 'old', 'Old: gate at deploy\nsecurity team\nblocks releases', 'red')
    n(g, 'new', 'Shift-left:\nsecurity in PR + CI\ndevelopers own\nsecurity findings', 'green')
    n(g, 'pipe','CI pipeline:\nSAST → SCA →\nIaC scan → SBOM →\nsign + attest', 'navy')
    n(g, 'who', 'Security architect\nteaches + tools\n(does NOT gate)', 'gold')
    e(g, 'old', 'new', 'evolve', '#16a34a', 'dashed')
    e(g, 'new', 'pipe', 'embed in')
    e(g, 'who', 'pipe', 'enables', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'i1-shift-left'), cleanup=True)
    print('Generated: i1-shift-left')


def diag_security_taxonomy():
    g = base_graph('i2_security_taxonomy', 'SAST / DAST / SCA / IaC / Container / Secrets — full taxonomy')
    n(g, 'sast','SAST\n(SonarQube, Semgrep,\nCodeQL, Snyk Code)\nsource scan', 'navy')
    n(g, 'dast','DAST\n(OWASP ZAP, Burp,\nNuclei)\nrunning app scan', 'green')
    n(g, 'sca', 'SCA\n(Snyk, Dependabot,\nRenovate, Mend)\ndep vulnerabilities', 'gold')
    n(g, 'sec', 'Secret scanning\n(gitleaks, trufflehog,\nGitHub native,\nGitGuardian)', 'red')
    n(g, 'iac', 'IaC scan\n(Checkov, tfsec,\nKICS)', 'purple')
    n(g, 'cnt', 'Container scan\n(Trivy, Grype,\nSnyk Container)', 'cyan')
    n(g, 'pipe','CI pipeline\n(all stages)', 'pink')
    e(g, 'sast','pipe')
    e(g, 'dast','pipe')
    e(g, 'sca', 'pipe')
    e(g, 'sec', 'pipe')
    e(g, 'iac', 'pipe')
    e(g, 'cnt', 'pipe')
    g.render(os.path.join(OUT, 'i2-security-taxonomy'), cleanup=True)
    print('Generated: i2-security-taxonomy')


def diag_supply_chain_slsa():
    g = base_graph('i3_supply_chain_slsa', 'Supply chain — SLSA + SBOM + Sigstore')
    n(g, 'src', 'Source\n(GitHub, GitLab)', 'navy')
    n(g, 'build','CI build\n(GitHub Actions OIDC)', 'green')
    n(g, 'sign','Sigstore + cosign\nkeyless signing', 'gold')
    n(g, 'sbom','SBOM\nSPDX / CycloneDX\nsyft + grype', 'purple')
    n(g, 'attest','in-toto attestations\nbuild provenance', 'red')
    n(g, 'slsa','SLSA L2:\nsigned provenance\non managed CI', 'cyan')
    n(g, 'verify','Verify on deploy\nKyverno / Connaisseur', 'pink')
    e(g, 'src', 'build')
    e(g, 'build','sign')
    e(g, 'build','sbom')
    e(g, 'build','attest')
    e(g, 'sign','slsa')
    e(g, 'attest','slsa')
    e(g, 'slsa','verify')
    g.render(os.path.join(OUT, 'i3-supply-chain-slsa'), cleanup=True)
    print('Generated: i3-supply-chain-slsa')


def diag_policy_as_code():
    g = base_graph('i4_policy_as_code', 'Policy as Code — OPA / Kyverno / Cedar / Sentinel')
    n(g, 'opa', 'OPA (CNCF)\nRego language\ngeneral-purpose', 'navy')
    n(g, 'kyv', 'Kyverno\nK8s-native\nYAML policies\nadmission control', 'green')
    n(g, 'ced', 'Cedar (AWS)\nauthorization\n(IAM-style)', 'gold')
    n(g, 'sent','Sentinel\nTerraform Cloud only', 'purple')
    n(g, 'use1','Use cases:\n• admission control\n• Terraform plan gates\n• microservice authz', 'red')
    e(g, 'opa', 'use1')
    e(g, 'kyv', 'use1')
    e(g, 'ced', 'use1')
    e(g, 'sent','use1')
    g.render(os.path.join(OUT, 'i4-policy-as-code'), cleanup=True)
    print('Generated: i4-policy-as-code')


def diag_runtime_security():
    g = base_graph('i5_runtime_security', 'Runtime security — eBPF-based detection')
    n(g, 'app',  'Running container', 'navy')
    n(g, 'falco','Falco (CNCF)\nrules engine\nsyscall monitoring', 'green')
    n(g, 'tet',  'Tetragon (Cilium)\neBPF + observation\n+ enforcement', 'gold')
    n(g, 'tracee','Tracee (Aqua)\neBPF runtime tracing', 'purple')
    n(g, 'siem', 'SIEM / SOC\n(Splunk, Datadog,\nMicrosoft Sentinel)', 'red')
    e(g, 'app', 'falco', 'monitors')
    e(g, 'app', 'tet',   'monitors')
    e(g, 'app', 'tracee','monitors')
    e(g, 'falco','siem', 'alerts')
    e(g, 'tet', 'siem',  'alerts')
    e(g, 'tracee','siem','alerts')
    g.render(os.path.join(OUT, 'i5-runtime-security'), cleanup=True)
    print('Generated: i5-runtime-security')


# ─────────────────────────────────────────────────────────────────────
# J — Cloud Native Patterns
# ─────────────────────────────────────────────────────────────────────
def diag_twelve_factor():
    g = base_graph('j1_twelve_factor', '12-Factor App (Heroku, Adam Wiggins, 2011)')
    n(g, 'one',   '1. Codebase\n2. Dependencies\n3. Config (env)\n4. Backing services\n5. Build/release/run\n6. Processes', 'navy')
    n(g, 'two',   '7. Port binding\n8. Concurrency\n9. Disposability\n10. Dev/prod parity\n11. Logs\n12. Admin processes', 'gold')
    n(g, 'cn',    'Cloud-native\nreadiness checklist:\nstateless, ephemeral,\nconfig externalized', 'green')
    e(g, 'one',   'cn')
    e(g, 'two',   'cn')
    g.render(os.path.join(OUT, 'j1-twelve-factor'), cleanup=True)
    print('Generated: j1-twelve-factor')


def diag_microservices():
    g = base_graph('j2_microservices', 'Microservices design (Sam Newman) — bounded contexts')
    n(g, 'mono', 'Monolith-first\n(default)\nlow coordination cost', 'green')
    n(g, 'bc',   'Bounded contexts\n(DDD)\n→ service boundaries', 'navy')
    n(g, 'ms',   'Microservices\nindependent deploy,\nteam-aligned', 'gold')
    n(g, 'cost', 'Cost:\n• distributed system\n• network failures\n• ops overhead\n• data consistency', 'red')
    n(g, 'when', 'When NOT microservices:\nsmall team,\nfew users,\nclear single domain', 'purple')
    e(g, 'mono', 'bc',   'when scale')
    e(g, 'bc',   'ms',   'extract')
    e(g, 'ms',   'cost', 'pays')
    e(g, 'when', 'mono', 'stay', '#16a34a', 'dashed')
    g.render(os.path.join(OUT, 'j2-microservices'), cleanup=True)
    print('Generated: j2-microservices')


def diag_event_driven():
    g = base_graph('j3_event_driven', 'Event-driven — saga + outbox + CQRS')
    n(g, 'svc',   'Service A', 'navy')
    n(g, 'tx',    'Atomic write:\n(state + outbox row)\nin same DB tx', 'green')
    n(g, 'rel',   'Relay process\n(CDC / poller)\n→ broker', 'gold')
    n(g, 'broker','Kafka / NATS /\nPub/Sub', 'red')
    n(g, 'b',     'Service B\n(idempotent\nconsumer)', 'purple')
    n(g, 'saga',  'Saga (orchestrated\nor choreographed)\nfor multi-step\ndistributed txns', 'cyan')
    e(g, 'svc',   'tx')
    e(g, 'tx',    'rel')
    e(g, 'rel',   'broker')
    e(g, 'broker','b')
    e(g, 'saga',  'svc', 'coordinates', '#94a3b8', 'dotted')
    e(g, 'saga',  'b',   'coordinates', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'j3-event-driven'), cleanup=True)
    print('Generated: j3-event-driven')


def diag_serverless():
    g = base_graph('j4_serverless', 'Serverless — Lambda / Cloud Run / Azure Functions / Workers')
    n(g, 'lam',  'AWS Lambda\nshort runs\ncold-start 100-1000ms', 'navy')
    n(g, 'cr',   'Cloud Run (GCP)\ncontainer-based\nscale to zero', 'green')
    n(g, 'af',   'Azure Functions\nmany triggers\n(HTTP, timer, queue)', 'gold')
    n(g, 'cw',   'Cloudflare Workers\nedge V8 isolates\n< 5ms cold start', 'purple')
    n(g, 'cs',   'Cold-start mitigation:\n• provisioned concurrency\n• warm-up requests\n• keep-warm', 'red')
    n(g, 'when', 'Use when:\n• spiky traffic\n• event-driven\n• short ops\n• cost-elastic', 'cyan')
    e(g, 'lam', 'cs')
    e(g, 'cr',  'cs')
    e(g, 'af',  'cs')
    e(g, 'when','lam', '', '#94a3b8', 'dotted')
    e(g, 'when','cr',  '', '#94a3b8', 'dotted')
    e(g, 'when','af',  '', '#94a3b8', 'dotted')
    e(g, 'when','cw',  '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'j4-serverless'), cleanup=True)
    print('Generated: j4-serverless')


def diag_strangler_fig():
    g = base_graph('j5_strangler_fig', 'Strangler fig (Fowler 2004) — incremental decomposition')
    n(g, 'mono', 'Legacy monolith\n(all routes)', 'red')
    n(g, 'fcd',  'Facade / proxy\n(routing layer)', 'gold')
    n(g, 'new1', 'New /search\n(microservice)', 'green')
    n(g, 'new2', 'New /checkout\n(microservice)', 'green')
    n(g, 'new3', 'New /users\n(microservice)', 'green')
    n(g, 'end',  'Eventually:\nmonolith strangled\n(retired)', 'navy')
    e(g, 'mono', 'fcd', 'wrap')
    e(g, 'fcd',  'mono','old routes')
    e(g, 'fcd',  'new1','migrated')
    e(g, 'fcd',  'new2','migrated')
    e(g, 'fcd',  'new3','migrated')
    e(g, 'mono', 'end',  'retire', '#16a34a', 'dashed')
    g.render(os.path.join(OUT, 'j5-strangler-fig'), cleanup=True)
    print('Generated: j5-strangler-fig')


# ─────────────────────────────────────────────────────────────────────
# K — Database & Data DevOps
# ─────────────────────────────────────────────────────────────────────
def diag_db_migrations():
    g = base_graph('k1_db_migrations', 'Schema migration tools — declarative vs imperative')
    n(g, 'fly',  'Flyway\nSQL-first\nversion-based\n(replay scripts)', 'navy')
    n(g, 'liq',  'Liquibase\nXML / YAML / SQL\nrollback-aware', 'green')
    n(g, 'atl',  'Atlas (Ariga)\ndeclarative HCL\nplan / apply (Terraform-like)', 'gold')
    n(g, 'byt',  'Bytebase\ndeclarative + GUI\ngovernance + audit', 'purple')
    n(g, 'all',  'All support:\nCI/CD pipeline\nzero-downtime deploys', 'red')
    e(g, 'fly', 'all')
    e(g, 'liq', 'all')
    e(g, 'atl', 'all')
    e(g, 'byt', 'all')
    g.render(os.path.join(OUT, 'k1-db-migrations'), cleanup=True)
    print('Generated: k1-db-migrations')


def diag_gitops_dbs():
    g = base_graph('k2_gitops_dbs', 'GitOps for databases — Atlas Cloud / Bytebase')
    n(g, 'git', 'Git repo\nschema as code\n(HCL / SQL / YAML)', 'navy')
    n(g, 'ci',  'CI:\nlint, dry-run,\npolicy check\n(naming, indexes,\ndestructive ops)', 'green')
    n(g, 'rev', 'PR review\n(human DBA approval\nfor risky changes)', 'gold')
    n(g, 'cd',  'CD:\nAtlas Cloud / Bytebase\napply migration\nper environment', 'red')
    n(g, 'br',  'Branch DBs\n(Neon / PlanetScale /\nXata)\nephemeral CI tests', 'purple')
    e(g, 'git', 'ci')
    e(g, 'ci',  'rev')
    e(g, 'rev', 'cd')
    e(g, 'br',  'ci', 'spin up', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'k2-gitops-dbs'), cleanup=True)
    print('Generated: k2-gitops-dbs')


def diag_data_observability():
    g = base_graph('k3_data_observability', 'Data observability + lineage')
    n(g, 'pipe', 'Data pipeline\nETL / ELT', 'navy')
    n(g, 'mc',   'Monte Carlo /\nDatafold / Bigeye /\nSoda\nfreshness, volume,\nschema, lineage', 'gold')
    n(g, 'ol',   'OpenLineage spec\n(open standard)', 'green')
    n(g, 'cat',  'Data catalogs:\nDatahub (LinkedIn),\nOpenMetadata, Atlan,\nCollibra', 'purple')
    n(g, 'slo',  'Data quality SLOs:\n• freshness\n• completeness\n• distribution\n• schema stability', 'red')
    e(g, 'pipe', 'mc',  'monitors')
    e(g, 'mc',   'ol',  'emits')
    e(g, 'ol',   'cat', 'feeds')
    e(g, 'mc',   'slo', 'measures')
    g.render(os.path.join(OUT, 'k3-data-observability'), cleanup=True)
    print('Generated: k3-data-observability')


def diag_mlops():
    g = base_graph('k4_mlops', 'MLOps — train, serve, observe, retrain')
    n(g, 'data', 'Training data\n(feature store:\nFeast, Tecton)', 'navy')
    n(g, 'pipe', 'Training pipeline\n(Kubeflow,\nVertex AI Pipelines,\nSageMaker,\nMLflow)', 'green')
    n(g, 'reg',  'Model registry\n(MLflow,\nWeights & Biases)\nversioned artifacts', 'gold')
    n(g, 'srv',  'Model serving\n(KServe, BentoML,\nTorchServe)', 'purple')
    n(g, 'mon',  'Drift detection\n(input drift,\nprediction drift,\nperformance decay)', 'red')
    n(g, 'rt',   'Retrain trigger\non drift / schedule', 'cyan')
    e(g, 'data', 'pipe')
    e(g, 'pipe', 'reg')
    e(g, 'reg',  'srv')
    e(g, 'srv',  'mon')
    e(g, 'mon',  'rt')
    e(g, 'rt',   'pipe', 'loop', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'k4-mlops'), cleanup=True)
    print('Generated: k4-mlops')


if __name__ == '__main__':
    # Foundations
    diag_three_ways(); diag_dora_metrics(); diag_westrum_calms(); diag_team_topologies(); diag_value_stream()
    # CI/CD
    diag_ci(); diag_cd_vs_deploy(); diag_pipeline_as_code(); diag_test_pyramid(); diag_monorepo_build(); diag_trunk()
    # Continuous Delivery
    diag_progressive_delivery(); diag_feature_flags(); diag_deployment_strategies(); diag_db_migrations_cicd(); diag_release_engineering()
    # IaC
    diag_iac_fundamentals(); diag_terraform_internals(); diag_pulumi(); diag_cloud_native_iac(); diag_iac_state(); diag_iac_governance()
    # Configuration Management
    diag_ansible(); diag_pcs(); diag_immutable(); diag_drift_remediation()
    # Containers
    diag_container_fundamentals(); diag_docker_buildkit(); diag_image_hardening(); diag_buildpacks(); diag_container_security()
    # Orchestration
    diag_k8s_arch(); diag_k8s_resources(); diag_helm_kustomize(); diag_operators(); diag_service_mesh(); diag_gateway_api()
    # Platform
    diag_platform_eng(); diag_idp(); diag_backstage(); diag_golden_paths(); diag_dx_metrics()
    # DevSecOps
    diag_shift_left(); diag_security_taxonomy(); diag_supply_chain_slsa(); diag_policy_as_code(); diag_runtime_security()
    # Cloud Native
    diag_twelve_factor(); diag_microservices(); diag_event_driven(); diag_serverless(); diag_strangler_fig()
    # Data DevOps
    diag_db_migrations(); diag_gitops_dbs(); diag_data_observability(); diag_mlops()
    print('DevOps diagrams complete (51 diagrams across 11 sub-categories).')
