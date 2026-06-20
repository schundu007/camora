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


# ─────────────────────────────────────────────────────────────────────
# CT — CI/CD Tools (Practical Deep Dives)
# ─────────────────────────────────────────────────────────────────────
def diag_gha():
    g = base_graph('ct1_gha', 'GitHub Actions — runner architecture')
    n(g, 'gh',   'github.com\nworkflow events\n(push, PR, cron)', 'navy')
    n(g, 'wf',   'Workflow YAML\n.github/workflows/*\nmatrix · reusable\nworkflow_call', 'green')
    n(g, 'sched','Scheduler\nqueues jobs', 'purple')
    n(g, 'host', 'Hosted runners\nubuntu/macos/windows\n(GitHub-managed)', 'gold')
    n(g, 'self', 'Self-hosted runners\nephemeral / ARC\n(your infra, GPU)', 'cyan')
    n(g, 'job',  'Job execution\nsetup-* actions\ncomposite/reusable', 'green')
    n(g, 'oidc', 'OIDC token\n→ AWS/GCP/Azure\nno long-lived secrets', 'red')
    e(g, 'gh',   'wf')
    e(g, 'wf',   'sched')
    e(g, 'sched','host')
    e(g, 'sched','self')
    e(g, 'host', 'job')
    e(g, 'self', 'job')
    e(g, 'job',  'oidc')
    g.render(os.path.join(OUT, 'ct1-gha'), cleanup=True)
    print('Generated: ct1-gha')


def diag_gha_workflow():
    g = base_graph('ct1b_gha_workflow', 'GitHub Actions — typical PR pipeline')
    n(g, 'pr',   'Pull request\nopened', 'navy')
    n(g, 'lint', 'Lint + format\n(actionlint, eslint)\n~30s', 'green')
    n(g, 'test', 'Unit tests\nmatrix [node, py, go]\n~3-8min', 'green')
    n(g, 'sec',  'Security scans\nSAST (Semgrep)\nSCA (Dependabot)\nIaC (Checkov)', 'red')
    n(g, 'build','Build + cache\nbuildx bake\nactions/cache@v4', 'gold')
    n(g, 'docker','Docker build + push\nGHCR\nSHA-pinned tag', 'gold')
    n(g, 'deploy','Deploy to staging\nOIDC → AWS\nkubectl/helm', 'cyan')
    n(g, 'gate', 'Required reviews\nbranch protection\nmerge queue', 'purple')
    e(g, 'pr',   'lint')
    e(g, 'pr',   'test')
    e(g, 'pr',   'sec')
    e(g, 'lint', 'build')
    e(g, 'test', 'build')
    e(g, 'sec',  'build')
    e(g, 'build','docker')
    e(g, 'docker','deploy')
    e(g, 'deploy','gate')
    g.render(os.path.join(OUT, 'ct1b-gha-workflow'), cleanup=True)
    print('Generated: ct1b-gha-workflow')


def diag_jenkins():
    g = base_graph('ct2_jenkins', 'Jenkins — controller / agent / Jenkinsfile')
    n(g, 'gh',   'SCM\n(git, GHE, GitLab)', 'navy')
    n(g, 'ctrl', 'Jenkins controller\nweb UI · scheduler\nplugin manager', 'green')
    n(g, 'jcasc','JCasC config\nas-code seed', 'cyan')
    n(g, 'jf',   'Jenkinsfile\nDeclarative\nor Scripted (Groovy)', 'gold')
    n(g, 'lib',  'Shared libraries\n(@Library)\nreusable steps', 'purple')
    n(g, 'k8s',  'k8s agent pods\nephemeral · scaled\n(kubernetes plugin)', 'cyan')
    n(g, 'vm',   'Static agent VMs\nWindows / mac / GPU', 'red')
    e(g, 'gh',   'ctrl')
    e(g, 'jcasc','ctrl')
    e(g, 'ctrl', 'jf',  'reads')
    e(g, 'jf',   'lib', 'imports')
    e(g, 'ctrl', 'k8s', 'spawns')
    e(g, 'ctrl', 'vm',  'dispatches')
    g.render(os.path.join(OUT, 'ct2-jenkins'), cleanup=True)
    print('Generated: ct2-jenkins')


def diag_gitlab_ci():
    g = base_graph('ct3_gitlab_ci', 'GitLab CI — stages, runners, includes')
    n(g, 'mr',   'Merge request /\npush event', 'navy')
    n(g, 'gl',   '.gitlab-ci.yml\nstages · jobs\ninclude · extends\nrules: if/changes', 'green')
    n(g, 'rule', 'Workflow rules\nbranch pipelines\nMR pipelines\nscheduled', 'purple')
    n(g, 'shared','Shared runners\n(GitLab.com)\nfree minutes', 'gold')
    n(g, 'group','Group runners\nself-hosted\nk8s executor', 'cyan')
    n(g, 'env',  'Environments\nDeploy track\nrollback button', 'red')
    n(g, 'reg',  'Container registry\nbuilt-in (GHCR-equiv)\nDependency Proxy', 'gold')
    e(g, 'mr',   'gl')
    e(g, 'gl',   'rule')
    e(g, 'rule', 'shared')
    e(g, 'rule', 'group')
    e(g, 'group','reg')
    e(g, 'group','env')
    g.render(os.path.join(OUT, 'ct3-gitlab-ci'), cleanup=True)
    print('Generated: ct3-gitlab-ci')


def diag_circleci():
    g = base_graph('ct4_circleci', 'CircleCI — orbs, executors, parallelism')
    n(g, 'cfg',  '.circleci/config.yml\nworkflows + jobs', 'green')
    n(g, 'orbs', 'Orbs\nversioned reusable\norb registry', 'purple')
    n(g, 'exec', 'Executors\ndocker · machine\nmacOS · windows\nGPU', 'gold')
    n(g, 'par',  'Parallelism\nsplit by timing\ntest reports', 'cyan')
    n(g, 'cache','Layer cache\nDependency cache\nCDN-backed', 'navy')
    e(g, 'cfg',  'orbs', 'imports')
    e(g, 'cfg',  'exec', 'declares')
    e(g, 'exec', 'par')
    e(g, 'par',  'cache')
    g.render(os.path.join(OUT, 'ct4-circleci'), cleanup=True)
    print('Generated: ct4-circleci')


def diag_tekton():
    g = base_graph('ct5_tekton', 'Tekton — Kubernetes-native pipelines as CRDs')
    n(g, 'task', 'Task CRD\nsteps + params\nworkspaces', 'green')
    n(g, 'pipe', 'Pipeline CRD\nordered tasks\nDAG', 'navy')
    n(g, 'pr',   'PipelineRun\nexecution instance\nstatus tracking', 'gold')
    n(g, 'pod',  'Pod per Task\nsidecar pattern\nresults emitted', 'cyan')
    n(g, 'tk',   'Tekton Catalog\ngit-clone, kaniko\nbuildah, cosign', 'purple')
    e(g, 'tk',   'task', 'reuses')
    e(g, 'task', 'pipe', 'composes')
    e(g, 'pipe', 'pr',   'instantiates')
    e(g, 'pr',   'pod',  'spawns')
    g.render(os.path.join(OUT, 'ct5-tekton'), cleanup=True)
    print('Generated: ct5-tekton')


def diag_argo_workflows():
    g = base_graph('ct6_argo_wf', 'Argo Workflows — DAG template fan-out / fan-in')
    n(g, 'cron', 'CronWorkflow\nscheduled batch\ncron expression', 'purple')
    n(g, 'evt',  'Argo Events\nSensor + EventSource\nKafka / webhook / S3', 'red')
    n(g, 'user', 'kubectl / REST API\nCI/CD system\nmanual submit', 'gray')
    n(g, 'wf',   'Workflow CRD\nentrypoint + arguments\ntemplates + state', 'navy')
    n(g, 'wft',  'WorkflowTemplate\nreusable definitions\nnamespace-scoped', 'sky')
    n(g, 'dag',  'DAG template\ndeclared dependencies\nwithSequence fan-out', 'green')
    n(g, 'art',  'Artifact Repository\nS3 / GCS / MinIO\nstep outputs → next inputs', 'gold')
    n(g, 'param','Parameters\ninputs.parameters\noutputs.parameters', 'cyan')
    n(g, 'exit', 'Exit Handler\nonExit: notify-team\nalways runs', 'amber')
    e(g, 'cron', 'wf',   'creates')
    e(g, 'evt',  'wf',   'creates')
    e(g, 'user', 'wf',   'kubectl apply')
    e(g, 'wf',   'wft',  'templateRef', '#94a3b8', 'dashed')
    e(g, 'wf',   'dag',  'entrypoint')
    e(g, 'dag',  'art',  'upload / download')
    e(g, 'dag',  'param','outputs.parameters')
    e(g, 'dag',  'exit', 'on completion')
    g.render(os.path.join(OUT, 'ct6-argo-wf'), cleanup=True)
    print('Generated: ct6-argo-wf')


def diag_argo_workflows_arch():
    g = base_graph('ct6_argo_wf_arch', 'Argo Workflows — Control Plane Architecture')
    g.attr(rankdir='TB', ranksep='1.0', nodesep='0.9')

    # Row 1: Triggers
    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'cron',  'CronWorkflow\nscheduled batch\ncron expression', 'purple')
        n(s, 'evt',   'Argo Events\nSensor + EventSource\nKafka / webhook / S3', 'red')
        n(s, 'user',  'kubectl / REST API\nCI/CD systems\nmanual submit', 'gray')

    # Row 2: CRDs
    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'wf',    'Workflow CRD\nruntime state + template\nentrypoint / arguments', 'navy')
        n(s, 'wft',   'WorkflowTemplate\nreusable definitions\nnamespace-scoped', 'sky')
        n(s, 'cwft',  'ClusterWorkflowTemplate\ncluster-wide reuse\nno namespace limit', 'sky')

    # Row 3: Control plane
    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'ctrl',  'workflow-controller\nwatches Workflow CRDs\ncreates Pods · retries · timeout', 'green')
        n(s, 'srv',   'argo-server\nREST + gRPC + UI\nlog stream · auth · RBAC', 'teal')

    # Row 4: Execution + RBAC
    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'pod',   'Worker Pods\n+ argoexec sidecar\nemissary / pns / k8sapi', 'sky')
        n(s, 'sa',    'ServiceAccount\nargo-workflows-sa\n+ ClusterRoleBinding', 'cyan')

    # Row 5: Artifact storage
    n(g, 'art',   'Artifact Repository\nS3 / GCS / MinIO / Azure Blob\nstep outputs → next step inputs', 'gold')

    # Triggers → Workflow CRD
    e(g, 'cron',  'wf',   'creates')
    e(g, 'evt',   'wf',   'creates')
    e(g, 'user',  'wf',   'kubectl apply')

    # CRD cross-references
    e(g, 'wf',    'wft',  'templateRef', '#94a3b8', 'dashed')
    e(g, 'wf',    'cwft', 'templateRef', '#94a3b8', 'dashed')

    # Controller watches & acts
    e(g, 'ctrl',  'wf',   'watches', '#22c55e', 'dashed')
    e(g, 'ctrl',  'pod',  'creates Pods')

    # Pod ↔ controller feedback loop
    e(g, 'pod',   'ctrl', 'status updates', '#0ea5e9', 'dashed')
    e(g, 'pod',   'art',  'upload / download')

    # Server reads
    e(g, 'srv',   'wf',   'reads status', '#14b8a6', 'dashed')
    e(g, 'srv',   'pod',  'streams logs', '#14b8a6', 'dashed')

    # RBAC
    e(g, 'ctrl',  'sa',   'runs as')
    e(g, 'srv',   'sa',   'runs as')

    g.render(os.path.join(OUT, 'ct6-argo-wf-arch'), cleanup=True)
    print('Generated: ct6-argo-wf-arch')


def diag_buildkite():
    g = base_graph('ct7_buildkite', 'Buildkite — hybrid SaaS + self-hosted agents')
    n(g, 'bk',   'Buildkite SaaS\norchestrator + UI\n(no code runs)', 'navy')
    n(g, 'agent','Self-hosted agents\nyour infra · scaling\nclusters per team', 'green')
    n(g, 'pl',   'pipeline.yml\nsteps · plugins\ndynamic generation', 'gold')
    n(g, 'plug', 'Plugins ecosystem\nbuildkite-plugins.com', 'purple')
    n(g, 'aws',  'AWS / GCP\nfull control\nany compute', 'cyan')
    e(g, 'bk',   'agent', 'orchestrates')
    e(g, 'pl',   'agent', 'executes on')
    e(g, 'pl',   'plug',  'uses')
    e(g, 'agent','aws',   'runs in')
    g.render(os.path.join(OUT, 'ct7-buildkite'), cleanup=True)
    print('Generated: ct7-buildkite')


# ─────────────────────────────────────────────────────────────────────
# G — GitOps
# ─────────────────────────────────────────────────────────────────────
def diag_gitops_principles():
    g = base_graph('g1_gitops_principles', 'GitOps — 4 OpenGitOps principles')
    n(g, 'p1', '1. Declarative\nentire system\nas code', 'navy')
    n(g, 'p2', '2. Versioned\n+ Immutable\n(Git is source of truth)', 'green')
    n(g, 'p3', '3. Pulled\nautomatically\n(agents reconcile)', 'gold')
    n(g, 'p4', '4. Continuously\nreconciled\n(drift → repair)', 'cyan')
    n(g, 'git','Git repository\nthe ONLY way\nto change prod', 'purple')
    n(g, 'cluster','Cluster state\nactual = desired\nor agent fixes it', 'red')
    e(g, 'p1', 'git')
    e(g, 'p2', 'git')
    e(g, 'git','p3')
    e(g, 'p3', 'cluster')
    e(g, 'p4', 'cluster')
    e(g, 'cluster','p4', 'observes', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'g1-gitops-principles'), cleanup=True)
    print('Generated: g1-gitops-principles')


def diag_argocd():
    g = base_graph('g2_argocd', 'Argo CD — controller / repo-server / app-controller')
    n(g, 'git', 'Git repo\nmanifests / Helm /\nKustomize', 'navy')
    n(g, 'rs',  'argocd-repo-server\nclones, renders\ncaches outputs', 'green')
    n(g, 'ac',  'argocd-application\n-controller\nreconciles', 'gold')
    n(g, 'api', 'argocd-server\nAPI + UI\nRBAC + SSO', 'purple')
    n(g, 'redis','Redis\ncache layer', 'cyan')
    n(g, 'app', 'Application CRD\nsource + dest\nsync policy', 'red')
    n(g, 'k8s', 'Target cluster(s)\nin-cluster or remote\nApplicationSet', 'navy')
    e(g, 'git', 'rs')
    e(g, 'rs',  'redis', 'caches', '#94a3b8', 'dashed')
    e(g, 'rs',  'ac')
    e(g, 'app', 'ac',   'declares')
    e(g, 'ac',  'k8s',  'applies')
    e(g, 'api', 'app')
    g.render(os.path.join(OUT, 'g2-argocd'), cleanup=True)
    print('Generated: g2-argocd')


def diag_fluxcd():
    g = base_graph('g3_fluxcd', 'Flux v2 — GOTK controllers')
    n(g, 'sc',   'source-controller\nGitRepository\nHelmRepository\nOCIRepository', 'green')
    n(g, 'kc',   'kustomize-controller\nKustomization CRD\nrenders + applies', 'navy')
    n(g, 'hc',   'helm-controller\nHelmRelease CRD\nupgrade · rollback', 'gold')
    n(g, 'nc',   'notification-controller\nReceiver / Provider\nwebhooks → Slack', 'purple')
    n(g, 'ic',   'image-automation\n+ image-reflector\nauto-PR on new tag', 'cyan')
    n(g, 'git',  'Git repo\nmanifests', 'navy')
    n(g, 'k8s',  'Target cluster\n(in-cluster only,\nmulti-cluster via\nflux-cd-bootstrap)', 'red')
    e(g, 'git',  'sc',  'pulls')
    e(g, 'sc',   'kc')
    e(g, 'sc',   'hc')
    e(g, 'kc',   'k8s', 'applies')
    e(g, 'hc',   'k8s', 'releases')
    e(g, 'kc',   'nc',  'events')
    e(g, 'ic',   'git', 'PRs')
    g.render(os.path.join(OUT, 'g3-fluxcd'), cleanup=True)
    print('Generated: g3-fluxcd')


def diag_app_of_apps():
    g = base_graph('g4_app_of_apps', 'App-of-Apps + ApplicationSet')
    n(g, 'root','Root Application\n"bootstrap"', 'navy')
    n(g, 'apps','apps/* directory\nin Git\n(child manifests)', 'green')
    n(g, 'tea1','team-payments\nApplication', 'gold')
    n(g, 'tea2','team-search\nApplication', 'gold')
    n(g, 'tea3','team-checkout\nApplication', 'gold')
    n(g, 'as',  'ApplicationSet\ngit/cluster/list/matrix\ngenerator', 'purple')
    n(g, 'tmpl','template\n{{name}}, {{cluster}}\n→ N Applications', 'cyan')
    e(g, 'root','apps')
    e(g, 'apps','tea1')
    e(g, 'apps','tea2')
    e(g, 'apps','tea3')
    e(g, 'as',  'tmpl')
    e(g, 'tmpl','tea1', 'generates', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'g4-app-of-apps'), cleanup=True)
    print('Generated: g4-app-of-apps')


def diag_multi_cluster_gitops():
    g = base_graph('g5_multi_cluster', 'Multi-cluster GitOps — hub & spoke')
    n(g, 'git', 'Git repo\nclusters/{name}/\napps/* per cluster', 'navy')
    n(g, 'hub', 'Argo CD hub\n(or Flux mgmt cluster)\nsecret per cluster', 'green')
    n(g, 'as',  'ApplicationSet\nlist generator\n→ N apps', 'purple')
    n(g, 'c1',  'prod-us-east-1\nspoke cluster', 'gold')
    n(g, 'c2',  'prod-eu-west-1\nspoke cluster', 'gold')
    n(g, 'c3',  'staging-us\nspoke cluster', 'cyan')
    e(g, 'git', 'hub',  'reconciled')
    e(g, 'as',  'hub')
    e(g, 'hub', 'c1',   'kubeconfig')
    e(g, 'hub', 'c2',   'kubeconfig')
    e(g, 'hub', 'c3',   'kubeconfig')
    g.render(os.path.join(OUT, 'g5-multi-cluster'), cleanup=True)
    print('Generated: g5-multi-cluster')


def diag_gitops_drift_recon():
    g = base_graph('g6_gitops_drift', 'GitOps reconciliation — drift detect & repair')
    n(g, 'git', 'Git desired\nstate', 'navy')
    n(g, 'agent','GitOps agent\n(Argo CD / Flux)\npolls every 3min', 'green')
    n(g, 'live','Live cluster state\n(actual)', 'red')
    n(g, 'diff','Diff engine\ndesired ≠ actual', 'gold')
    n(g, 'sync','Sync action\nself-heal: true\nautoSync: prune', 'cyan')
    n(g, 'alert','Alert if\nout-of-sync\n> N minutes', 'purple')
    e(g, 'git', 'agent')
    e(g, 'live','agent')
    e(g, 'agent','diff')
    e(g, 'diff','sync',  'remediate')
    e(g, 'diff','alert', 'page')
    e(g, 'sync','live',  'kubectl apply')
    g.render(os.path.join(OUT, 'g6-gitops-drift'), cleanup=True)
    print('Generated: g6-gitops-drift')


# ─────────────────────────────────────────────────────────────────────
# O — Observability & Telemetry
# ─────────────────────────────────────────────────────────────────────
def diag_otel():
    g = base_graph('o1_otel', 'OpenTelemetry — signals, SDK, collector')
    n(g, 'app',  'Application\nOTel SDK\n(traces, metrics, logs)', 'navy')
    n(g, 'auto', 'Auto-instrumentation\nbyte-code agents\nlanguage SDKs', 'green')
    n(g, 'col',  'OTel Collector\nreceiver → processor\n→ exporter', 'gold')
    n(g, 'trc',  'Tracing backend\nJaeger / Tempo /\nHoneycomb / DDog', 'purple')
    n(g, 'met',  'Metrics backend\nPrometheus / Mimir /\nDDog', 'cyan')
    n(g, 'log',  'Log backend\nLoki / OpenSearch /\nDDog', 'red')
    e(g, 'app',  'col',  'OTLP gRPC')
    e(g, 'auto', 'col')
    e(g, 'col',  'trc')
    e(g, 'col',  'met')
    e(g, 'col',  'log')
    g.render(os.path.join(OUT, 'o1-otel'), cleanup=True)
    print('Generated: o1-otel')


def diag_distributed_tracing():
    g = base_graph('o2_tracing', 'Distributed tracing — spans, context, sampling')
    n(g, 'gw',   'Gateway\nspan: GET /checkout\ntraceID: abc...', 'navy')
    n(g, 'auth', 'auth-svc\nchild span\nparentID: gw', 'green')
    n(g, 'cart', 'cart-svc\nchild span', 'green')
    n(g, 'pay',  'payment-svc\nchild span\nDB query span', 'gold')
    n(g, 'db',   'db query\nleaf span\n(slow!)', 'red')
    n(g, 'samp', 'Tail sampling\nin Collector\nkeep slow + errors', 'cyan')
    n(g, 'be',   'Backend\nJaeger / Tempo\nflame graph UI', 'purple')
    e(g, 'gw',   'auth', 'context')
    e(g, 'gw',   'cart')
    e(g, 'cart', 'pay')
    e(g, 'pay',  'db')
    e(g, 'gw',   'samp', 'export')
    e(g, 'samp', 'be')
    g.render(os.path.join(OUT, 'o2-tracing'), cleanup=True)
    print('Generated: o2-tracing')


def diag_prom_grafana():
    g = base_graph('o3_prom_grafana', 'Prometheus + Grafana stack')
    n(g, 'app',  'Apps expose\n/metrics\n(prom-client SDK)', 'navy')
    n(g, 'sd',   'Service discovery\nkubernetes_sd\nconsul / file_sd', 'cyan')
    n(g, 'prom', 'Prometheus\nscrape interval 15s\nTSDB local (15d)', 'gold')
    n(g, 'rem',  'Remote write\n→ Mimir / Thanos /\nVictoriaMetrics\n(long-term, HA)', 'green')
    n(g, 'am',   'Alertmanager\nrules + routes\ndedup + silence', 'red')
    n(g, 'gf',   'Grafana\ndashboards · alerts\n(Grafana 10+)', 'purple')
    e(g, 'app',  'sd')
    e(g, 'sd',   'prom', 'targets')
    e(g, 'prom', 'rem')
    e(g, 'prom', 'am',   'fires')
    e(g, 'prom', 'gf',   'PromQL')
    e(g, 'rem',  'gf')
    g.render(os.path.join(OUT, 'o3-prom-grafana'), cleanup=True)
    print('Generated: o3-prom-grafana')


def diag_log_aggregation():
    g = base_graph('o4_log_agg', 'Log aggregation — Loki / ELK / OpenSearch')
    n(g, 'pod',  'App pods\nstdout / stderr', 'navy')
    n(g, 'agent','Agent\nfluent-bit /\nvector / promtail\n(DaemonSet)', 'green')
    n(g, 'loki', 'Grafana Loki\nlabel-indexed\nlow-cost storage', 'gold')
    n(g, 'es',   'Elastic / OpenSearch\nfull-text indexed\nhigher cost · richer', 'purple')
    n(g, 'ddog', 'Datadog Logs /\nNew Relic /\nHoneycomb', 'cyan')
    n(g, 'lifecycle','Retention\nhot 7d → S3 30d\n→ Glacier 1y', 'red')
    e(g, 'pod',  'agent', 'tail')
    e(g, 'agent','loki')
    e(g, 'agent','es')
    e(g, 'agent','ddog')
    e(g, 'loki', 'lifecycle')
    e(g, 'es',   'lifecycle')
    g.render(os.path.join(OUT, 'o4-log-agg'), cleanup=True)
    print('Generated: o4-log-agg')


def diag_apm():
    g = base_graph('o5_apm', 'APM platforms — Datadog / NewRelic / Honeycomb')
    n(g, 'app',  'App + agent\n(per-language\nor OTel)', 'navy')
    n(g, 'rum',  'Real User Monitoring\nbrowser SDK\nperf + errors', 'green')
    n(g, 'syn',  'Synthetic checks\nuptime + journey\nmulti-region', 'gold')
    n(g, 'apm',  'APM service\ntraces + metrics +\nerrors + profiling', 'purple')
    n(g, 'svcmap','Service map\nauto-discovery\ndep graph', 'cyan')
    n(g, 'slo',  'SLO tracking\nerror-budget burn\nalert routing', 'red')
    e(g, 'app',  'apm')
    e(g, 'rum',  'apm')
    e(g, 'syn',  'apm')
    e(g, 'apm',  'svcmap')
    e(g, 'apm',  'slo')
    g.render(os.path.join(OUT, 'o5-apm'), cleanup=True)
    print('Generated: o5-apm')


def diag_ebpf_obs():
    g = base_graph('o6_ebpf', 'eBPF observability — Pixie / Cilium Hubble / Pyroscope')
    n(g, 'kern', 'Linux kernel\neBPF programs\nXDP / kprobes /\nuprobes', 'navy')
    n(g, 'cil',  'Cilium / Hubble\nflow logs\nL3-L7 visibility\nno sidecar', 'green')
    n(g, 'pix',  'Pixie\nauto-tracing\nprotocol parsing\n(HTTP/MySQL/Redis)', 'gold')
    n(g, 'pyr',  'Pyroscope /\nParca\ncontinuous profiling\nflame graphs', 'purple')
    n(g, 'fal',  'Falco / Tetragon\nruntime security\nsyscall events', 'red')
    n(g, 'app',  'Apps untouched\nzero code change\nzero sidecar', 'cyan')
    e(g, 'kern', 'cil')
    e(g, 'kern', 'pix')
    e(g, 'kern', 'pyr')
    e(g, 'kern', 'fal')
    e(g, 'app',  'kern', 'observed', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'o6-ebpf'), cleanup=True)
    print('Generated: o6-ebpf')


def diag_slo_dashboards():
    g = base_graph('o7_slo', 'SLO / error-budget dashboards')
    n(g, 'sli',  'SLI definition\navailability / latency /\nfreshness', 'navy')
    n(g, 'slo',  'SLO target\n99.9% / 30d', 'green')
    n(g, 'eb',   'Error budget\n0.1% × 30d\n= 43min', 'gold')
    n(g, 'mw',   'Multi-window\nmulti-burn-rate\n(SRE Workbook Ch 5)', 'purple')
    n(g, 'page', 'Fast burn\n→ page on-call', 'red')
    n(g, 'tick', 'Slow burn\n→ ticket', 'cyan')
    n(g, 'review','Quarterly\nbudget review\n+ SLO retro', 'navy')
    e(g, 'sli',  'slo')
    e(g, 'slo',  'eb')
    e(g, 'eb',   'mw')
    e(g, 'mw',   'page')
    e(g, 'mw',   'tick')
    e(g, 'eb',   'review')
    g.render(os.path.join(OUT, 'o7-slo'), cleanup=True)
    print('Generated: o7-slo')


# ─────────────────────────────────────────────────────────────────────
# M — MLOps & LLMOps
# ─────────────────────────────────────────────────────────────────────
def diag_mlops_lifecycle():
    g = base_graph('m1_mlops_lifecycle', 'MLOps lifecycle (Google ML CI/CD level 2)')
    n(g, 'd',    'Data ingestion\n+ validation\n(TFDV / Great Expectations)', 'navy')
    n(g, 'fe',   'Feature engineering\nfeature store\n(Feast / Tecton)', 'green')
    n(g, 'tr',   'Training pipeline\nhyperparam tuning\nXGBoost / PyTorch / TF', 'gold')
    n(g, 'ev',   'Model evaluation\noffline metrics\nslice analysis', 'purple')
    n(g, 'reg',  'Model registry\n(MLflow / W&B /\nSageMaker)', 'cyan')
    n(g, 'srv',  'Serving\n(KServe / SageMaker /\nVertex AI)', 'red')
    n(g, 'mon',  'Monitoring\ninput/pred drift\nperf decay\n→ retrain trigger', 'navy')
    e(g, 'd',    'fe')
    e(g, 'fe',   'tr')
    e(g, 'tr',   'ev')
    e(g, 'ev',   'reg')
    e(g, 'reg',  'srv')
    e(g, 'srv',  'mon')
    e(g, 'mon',  'tr',  'retrain', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'm1-mlops-lifecycle'), cleanup=True)
    print('Generated: m1-mlops-lifecycle')


def diag_feature_stores():
    g = base_graph('m2_feature_stores', 'Feature store — online + offline parity')
    n(g, 'src',  'Sources\nKafka / DB / S3', 'navy')
    n(g, 'tx',   'Transform jobs\n(Spark / dbt /\nFlink)', 'green')
    n(g, 'off',  'Offline store\nS3 / BigQuery /\nSnowflake\n(training data)', 'gold')
    n(g, 'on',   'Online store\nRedis / DynamoDB\n(low-latency reads)', 'cyan')
    n(g, 'reg',  'Feature registry\nFeast / Tecton\nschema + lineage', 'purple')
    n(g, 'tr',   'Training\nbatch reads\nfrom offline', 'green')
    n(g, 'inf',  'Inference\nlow-latency reads\nfrom online', 'red')
    e(g, 'src',  'tx')
    e(g, 'tx',   'off')
    e(g, 'tx',   'on',   'mat. view')
    e(g, 'off',  'tr')
    e(g, 'on',   'inf')
    e(g, 'reg',  'off',  'governs', '#94a3b8', 'dashed')
    e(g, 'reg',  'on',   'governs', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'm2-feature-stores'), cleanup=True)
    print('Generated: m2-feature-stores')


def diag_mlflow():
    g = base_graph('m3_mlflow', 'MLflow — tracking, registry, projects, models')
    n(g, 'tr',   'Tracking server\nruns + metrics +\nparams + artifacts', 'navy')
    n(g, 'reg',  'Model registry\nstage: dev / staging /\nprod / archived', 'green')
    n(g, 'proj', 'MLflow Projects\nMLproject yaml\nreproducible runs', 'gold')
    n(g, 'model','Model format\nmlflow.pyfunc\nframework-agnostic', 'purple')
    n(g, 'srv',  'mlflow models serve\nor → SageMaker /\nKServe / Triton', 'cyan')
    n(g, 'eval', 'mlflow.evaluate\noffline validation\nbefore promotion', 'red')
    e(g, 'proj', 'tr',   'logs to')
    e(g, 'tr',   'reg',  'register')
    e(g, 'reg',  'eval')
    e(g, 'eval', 'srv',  'promote')
    e(g, 'reg',  'model','versioned')
    e(g, 'model','srv')
    g.render(os.path.join(OUT, 'm3-mlflow'), cleanup=True)
    print('Generated: m3-mlflow')


def diag_kserve_bento():
    g = base_graph('m4_kserve_bento', 'Model serving — KServe / BentoML / Triton')
    n(g, 'reg',  'Model registry\n(MLflow / S3 URI)', 'navy')
    n(g, 'k',    'KServe\nInferenceService CRD\nKubernetes-native', 'green')
    n(g, 'b',    'BentoML\nbentofile.yaml\ncontainerized service', 'gold')
    n(g, 't',    'NVIDIA Triton\nGPU-optimized\nTensorRT / ONNX', 'purple')
    n(g, 'tr',   'Transformer\npre/post-processing\n(KServe pattern)', 'cyan')
    n(g, 'auto', 'Autoscaling\nKnative / KEDA\nGPU-aware\nscale-to-zero', 'red')
    n(g, 'gw',   'API gateway\nkserve.io/v1beta1\nHTTP + gRPC + REST', 'navy')
    e(g, 'reg',  'k',    'pulls')
    e(g, 'reg',  'b')
    e(g, 'reg',  't')
    e(g, 'tr',   'k')
    e(g, 'k',    'auto')
    e(g, 'k',    'gw')
    g.render(os.path.join(OUT, 'm4-kserve-bento'), cleanup=True)
    print('Generated: m4-kserve-bento')


def diag_drift_detection():
    g = base_graph('m5_drift', 'Model drift detection — input / prediction / performance')
    n(g, 'base','Reference window\n(training distribution)', 'navy')
    n(g, 'live','Live inference\nrolling window\n(last 1h / 1d)', 'green')
    n(g, 'in',  'Input drift\nKS test / PSI /\nWasserstein\nper-feature', 'gold')
    n(g, 'pr',  'Prediction drift\nclass distribution\n(no labels needed)', 'cyan')
    n(g, 'perf','Performance drift\nlabels arrive late\n(Evidently AI / NannyML)', 'purple')
    n(g, 'alert','Alert /\nretrain trigger\nshadow new model', 'red')
    e(g, 'base','in',  'compare')
    e(g, 'live','in')
    e(g, 'base','pr',  'compare')
    e(g, 'live','pr')
    e(g, 'live','perf')
    e(g, 'in',  'alert')
    e(g, 'pr',  'alert')
    e(g, 'perf','alert')
    g.render(os.path.join(OUT, 'm5-drift'), cleanup=True)
    print('Generated: m5-drift')


def diag_llmops():
    g = base_graph('m6_llmops', 'LLMOps — prompts, evals, guardrails, observability')
    n(g, 'prompt','Prompt registry\nversioned templates\n(LangSmith / Helicone)', 'navy')
    n(g, 'eval', 'Eval harness\nGolden set\nLLM-as-judge\nRagas / Promptfoo', 'green')
    n(g, 'rag',  'RAG pipeline\nembed → vector DB →\nretrieve → rerank', 'gold')
    n(g, 'guard','Guardrails\nNemo Guardrails /\nGuardrails AI /\noutput validation', 'red')
    n(g, 'obs',  'LLM observability\ntrace inputs/outputs\ntoken cost · latency\n(Langfuse / Helicone)', 'purple')
    n(g, 'agent','Agent orchestration\nLangGraph / DSPy /\nLlamaIndex', 'cyan')
    e(g, 'prompt','agent')
    e(g, 'rag', 'agent')
    e(g, 'agent','guard')
    e(g, 'guard','obs')
    e(g, 'obs', 'eval', 'feeds')
    e(g, 'eval','prompt','iterate', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'm6-llmops'), cleanup=True)
    print('Generated: m6-llmops')


def diag_llm_serving():
    g = base_graph('m7_llm_serving', 'LLM serving — vLLM / TGI / TensorRT-LLM')
    n(g, 'model','HF model\nmeta-llama-3 /\nMistral / Qwen', 'navy')
    n(g, 'vllm', 'vLLM\nPagedAttention\ncontinuous batching\nhighest throughput', 'green')
    n(g, 'tgi',  'TGI (HuggingFace)\nproduction-ready\nspeculative decoding', 'gold')
    n(g, 'trt',  'TensorRT-LLM\nNVIDIA optimized\nFP8 / INT4', 'purple')
    n(g, 'gpu',  'GPU pool\nA100 / H100 / B100\nmulti-tenant', 'cyan')
    n(g, 'gw',   'Inference gateway\nrouting + batch\nrate limit · auth', 'red')
    n(g, 'cache','Prefix cache\nKV cache reuse\n(repeated system\nprompts)', 'navy')
    e(g, 'model','vllm')
    e(g, 'model','tgi')
    e(g, 'model','trt')
    e(g, 'vllm', 'gpu')
    e(g, 'tgi',  'gpu')
    e(g, 'trt',  'gpu')
    e(g, 'gw',   'vllm', 'route')
    e(g, 'cache','vllm')
    g.render(os.path.join(OUT, 'm7-llm-serving'), cleanup=True)
    print('Generated: m7-llm-serving')


# ─────────────────────────────────────────────────────────────────────
# Z — AIOps
# ─────────────────────────────────────────────────────────────────────
def diag_aiops_fundamentals():
    g = base_graph('z1_aiops', 'AIOps — Gartner definition + capabilities')
    n(g, 'data', 'Operational data\nmetrics + logs +\ntraces + events +\ntickets', 'navy')
    n(g, 'ml',   'ML / statistical\nmodels\nunsupervised /\nsupervised', 'green')
    n(g, 'an',   'Anomaly detection\nbaseline + outlier\n(Prophet / DDog Watchdog)', 'gold')
    n(g, 'corr', 'Event correlation\ntime + topology +\nseverity clustering', 'purple')
    n(g, 'rca',  'Root cause analysis\ndep graph + traces\n→ likely culprit', 'red')
    n(g, 'auto', 'Automated response\nrunbook execution\nticket dispatch', 'cyan')
    e(g, 'data', 'ml')
    e(g, 'ml',   'an')
    e(g, 'ml',   'corr')
    e(g, 'corr', 'rca')
    e(g, 'rca',  'auto')
    g.render(os.path.join(OUT, 'z1-aiops'), cleanup=True)
    print('Generated: z1-aiops')


def diag_anomaly_detection():
    g = base_graph('z2_anomaly', 'Anomaly detection — methods')
    n(g, 'ts',   'Time series\nmetric stream', 'navy')
    n(g, 'thr',  'Threshold\nstatic / dynamic\n(p99 + N×stddev)', 'green')
    n(g, 'fc',   'Forecast\nProphet / Holt-Winters\nseasonal residual', 'gold')
    n(g, 'iso',  'Isolation forest /\nDBSCAN\nmultivariate', 'purple')
    n(g, 'ae',   'Autoencoder /\nLSTM\ndeep learning', 'cyan')
    n(g, 'eval', 'Eval: precision /\nrecall vs labeled\nincidents', 'red')
    e(g, 'ts',   'thr')
    e(g, 'ts',   'fc')
    e(g, 'ts',   'iso')
    e(g, 'ts',   'ae')
    e(g, 'thr',  'eval')
    e(g, 'fc',   'eval')
    e(g, 'iso',  'eval')
    e(g, 'ae',   'eval')
    g.render(os.path.join(OUT, 'z2-anomaly'), cleanup=True)
    print('Generated: z2-anomaly')


def diag_alert_correlation():
    g = base_graph('z3_alert_correlation', 'Alert correlation — dedup, suppress, group')
    n(g, 'src',  'Alert sources\nProm / DDog /\nPagerDuty / Splunk', 'navy')
    n(g, 'in',   'Alert ingest\nnormalize\ncommon schema', 'green')
    n(g, 'dedup','Dedup\nfingerprint\n(rule + host + label)', 'gold')
    n(g, 'sup',  'Suppression\ndependency\n("DB down →\nsuppress 50 app alerts")', 'red')
    n(g, 'grp',  'Grouping\ntime + topology\n→ single incident', 'purple')
    n(g, 'inc',  'Incident\nopened in PD /\nOpsGenie\nrouted to oncall', 'cyan')
    e(g, 'src',  'in')
    e(g, 'in',   'dedup')
    e(g, 'dedup','sup')
    e(g, 'sup',  'grp')
    e(g, 'grp',  'inc')
    g.render(os.path.join(OUT, 'z3-alert-correlation'), cleanup=True)
    print('Generated: z3-alert-correlation')


def diag_incident_rca():
    g = base_graph('z4_incident_rca', 'AI-assisted RCA — change correlation + topology')
    n(g, 'inc',  'Active incident\nuser-impact alert', 'red')
    n(g, 'chg',  'Recent changes\nGitHub deploys /\nfeature flags /\nIaC applies\n(last 1h)', 'navy')
    n(g, 'top',  'Service topology\ndep graph from\ntraces + service map', 'green')
    n(g, 'sig',  'Anomalous signals\nelevated err / latency\nin which services?', 'gold')
    n(g, 'cand', 'Candidate causes\nranked by\nrecency + topology +\nseverity', 'purple')
    n(g, 'oncall','Oncall view\n"Most likely:\ndeploy of payment-svc\n@14:32"', 'cyan')
    e(g, 'inc',  'sig')
    e(g, 'sig',  'top')
    e(g, 'top',  'cand')
    e(g, 'chg',  'cand')
    e(g, 'cand', 'oncall')
    g.render(os.path.join(OUT, 'z4-incident-rca'), cleanup=True)
    print('Generated: z4-incident-rca')


def diag_llm_sre_agents():
    g = base_graph('z5_llm_sre_agents', 'LLM SRE Agent — hypothesis-testing loop')
    n(g, 'trigger', 'Incident trigger\nalert + affected\nservices + SLO', 'red')
    n(g, 'hyp',    'Hypothesis gen\nLLM: 3-5 candidate\nroot causes', 'purple')
    n(g, 'tools',  'MCP tool calls\nquery_metrics /\nget_deploys /\nget_traces', 'navy')
    n(g, 'eval',   'Evidence eval\nupdate hypothesis\nconfidence scores', 'gold')
    n(g, 'done',   'Conclusion\nor next loop\n(avg 2-3 loops)', 'green')
    n(g, 'auto',   'Auto-remediation\n(human approval\nrequired)', 'cyan')
    e(g, 'trigger','hyp')
    e(g, 'hyp',    'tools')
    e(g, 'tools',  'eval')
    e(g, 'eval',   'hyp',   'low confidence', '#94a3b8', 'dashed')
    e(g, 'eval',   'done',  'high confidence')
    e(g, 'done',   'auto',  'if action safe')
    g.render(os.path.join(OUT, 'z5-llm-sre-agents'), cleanup=True)
    print('Generated: z5-llm-sre-agents')


def diag_capacity_forecasting():
    g = base_graph('z6_capacity_forecasting', 'Capacity forecasting — Prophet pipeline')
    n(g, 'raw',    'Raw metric\ntime series\n(weeks of history)', 'navy')
    n(g, 'clean',  'Anomaly removal\nIsolation Forest\nclean training set', 'gray')
    n(g, 'decomp', 'Decompose\ntrend + seasonality\n+ holidays (Prophet)', 'gold')
    n(g, 'fc',     'Forecast + CI\n80% / 95%\nconfidence bands', 'green')
    n(g, 'thresh', 'Threshold check\nCI upper bound\nvs capacity limit', 'purple')
    n(g, 'scale',  'Pre-scale action\nHPA target /\nASG warm-up', 'cyan')
    n(g, 'fb',     'Feedback loop\nMAPE tracking\nmodel retuning', 'red')
    e(g, 'raw',    'clean')
    e(g, 'clean',  'decomp')
    e(g, 'decomp', 'fc')
    e(g, 'fc',     'thresh')
    e(g, 'thresh', 'scale',  'breach expected')
    e(g, 'scale',  'fb',     '', '#94a3b8', 'dashed')
    e(g, 'fb',     'decomp', 'retune', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'z6-capacity-forecasting'), cleanup=True)
    print('Generated: z6-capacity-forecasting')


def diag_aiops_open_source():
    g = base_graph('z7_aiops_open_source', 'Open-source AIOps stack')
    n(g, 'prom',   'Prometheus\n+ kube-state-metrics\n+ cAdvisor', 'navy')
    n(g, 'loki',   'Loki + Tempo\nlogs + traces', 'sky')
    n(g, 'anom',   'Anomaly detection\nPrometheus AD\n(Prophet/Fourier)\nor Grafana ML', 'gold')
    n(g, 'bands',  'Grafana 3-band\nPromQL rules\nshort+long+margin', 'green')
    n(g, 'robusta','Robusta\nenrichment\nlogs+events+graphs', 'purple')
    n(g, 'am',     'Alertmanager\nroute + group\n+ silence', 'red')
    n(g, 'sink',   'PagerDuty /\nSlack /\nOpsGenie', 'cyan')
    e(g, 'prom',   'anom')
    e(g, 'prom',   'bands')
    e(g, 'loki',   'robusta')
    e(g, 'anom',   'am')
    e(g, 'bands',  'am')
    e(g, 'am',     'robusta')
    e(g, 'robusta','sink')
    g.render(os.path.join(OUT, 'z7-aiops-open-source'), cleanup=True)
    print('Generated: z7-aiops-open-source')


def diag_chaos_observability():
    g = base_graph('z8_chaos_observability', 'Chaos engineering — experiment loop')
    n(g, 'ss',     'Define steady state\nSLI: p99 < 200ms\nerr rate < 0.1%', 'green')
    n(g, 'hyp',    'Hypothesis\n"system holds under\npod termination"', 'navy')
    n(g, 'inject', 'Inject fault\nLitmusChaos /\nIstio httpFault /\nGremlin', 'red')
    n(g, 'aiops',  'AIOps measures\nanomaly detected?\nalerts correlated?\npages correct?', 'gold')
    n(g, 'held',   'Steady state held\nIncrease blast\nradius or change\nfault type', 'cyan')
    n(g, 'broke',  'Steady state broke\nFile weakness issue\nfix + retest', 'purple')
    n(g, 'cov',    'Update coverage map\nrecord validated\nfailure modes', 'gray')
    e(g, 'ss',     'hyp')
    e(g, 'hyp',    'inject')
    e(g, 'inject', 'aiops')
    e(g, 'aiops',  'held',   'steady state ✓')
    e(g, 'aiops',  'broke',  'steady state ✗')
    e(g, 'held',   'hyp',    'next experiment', '#94a3b8', 'dashed')
    e(g, 'broke',  'cov')
    e(g, 'cov',    'ss',     'improved system', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'z8-chaos-observability'), cleanup=True)
    print('Generated: z8-chaos-observability')


def diag_k8s_aiops():
    g = base_graph('z9_k8s_aiops', 'Kubernetes AIOps — stack and data flow')
    n(g, 'ksm',    'kube-state-metrics\npod phase / restarts\nHPA state / PVC', 'navy')
    n(g, 'cadv',   'cAdvisor\ncpu / mem usage\nper container', 'sky')
    n(g, 'smon',   'Prometheus Operator\nServiceMonitor\nauto-discovery', 'green')
    n(g, 'feat',   'Feature engineering\nchurn rate / OOM /\neviction pressure /\npending pods', 'gold')
    n(g, 'anom',   'Anomaly detection\nper-namespace\nor per-deployment', 'purple')
    n(g, 'rob',    'Robusta playbooks\nlogs + events +\nresource graphs\nattached to alert', 'red')
    n(g, 'sink',   'PagerDuty /\nSlack enriched\nalert', 'cyan')
    e(g, 'ksm',    'smon')
    e(g, 'cadv',   'smon')
    e(g, 'smon',   'feat')
    e(g, 'feat',   'anom')
    e(g, 'anom',   'rob')
    e(g, 'rob',    'sink')
    g.render(os.path.join(OUT, 'z9-k8s-aiops'), cleanup=True)
    print('Generated: z9-k8s-aiops')


def diag_aiops_maturity():
    g = base_graph('z10_aiops_maturity', 'AIOps maturity model — 5 levels')
    n(g, 'l1', 'Level 1 — Reactive\nno AIOps, manual\nalert triage\nMTTR: hours', 'gray')
    n(g, 'l2', 'Level 2 — Monitoring\nAPM + static\nthresholds\nalert fatigue', 'red')
    n(g, 'l3', 'Level 3 — Correlation\nalert grouping +\nanomaly detection\n70-90% noise ↓', 'gold')
    n(g, 'l4', 'Level 4 — Predictive\ncapacity forecast +\nLLM-assisted RCA\nMTTR 40% ↓', 'green')
    n(g, 'l5', 'Level 5 — Autonomous\nauto-remediation\nwith policy gates\n< 5% of orgs', 'purple')
    n(g, 'pre', 'Prerequisites\nalert hygiene +\nSLOs defined +\nrunbooks exist', 'navy')
    e(g, 'l1',  'l2')
    e(g, 'l2',  'l3')
    e(g, 'l3',  'l4')
    e(g, 'l4',  'l5')
    e(g, 'pre', 'l1',  '', '#94a3b8', 'dotted')
    e(g, 'pre', 'l3',  'required for', '#94a3b8', 'dotted')
    e(g, 'pre', 'l5',  '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'z10-aiops-maturity'), cleanup=True)
    print('Generated: z10-aiops-maturity')


# ─────────────────────────────────────────────────────────────────────
# NEW TOPICS — eBPF, containerd, Firecracker, Dagger, Linux Storage,
# Linux Networking, K8s Hard Way, K8s Storage, K8s Scheduling, Runtime Security
# ─────────────────────────────────────────────────────────────────────

def diag_ebpf_arch():
    g = base_graph('ebpf_arch', 'eBPF Program Lifecycle — compile → verify → JIT → attach')
    n(g, 'src',    'Source (.c)\nbpf_prog.c\nlibbpf skeleton', 'navy')
    n(g, 'clang',  'LLVM / Clang\n--target=bpf\n-O2 -g', 'sky')
    n(g, 'obj',    'BPF ELF object\n.bpf.o\nBTF debug info', 'teal')
    n(g, 'load',   'bpf() syscall\nBPF_PROG_LOAD\nlibbpf / skeleton', 'purple')
    n(g, 'ver',    'Verifier\nDAG walk\nbounded loops\npointer safety\ntype checker', 'red')
    n(g, 'jit',    'JIT compiler\nBPF bytecode\n→ native x86-64', 'green')
    n(g, 'hooks',  'Kernel attach points', 'gray')
    n(g, 'kp',     'kprobe / kretprobe\nfunction entry/exit', 'navy')
    n(g, 'tp',     'tracepoint\nstable ABI\nsched:sched_switch', 'navy')
    n(g, 'xdp',    'XDP hook\npre-stack\nhighest perf', 'gold')
    n(g, 'tc',     'TC (cls_bpf)\ningress / egress\npost-XDP', 'gold')
    n(g, 'sock',   'sock_ops / sk_msg\nL4 visibility', 'teal')
    n(g, 'maps',   'BPF Maps\nhash / array / LRU\nringbuf / percpu', 'purple')
    e(g, 'src',   'clang')
    e(g, 'clang', 'obj')
    e(g, 'obj',   'load')
    e(g, 'load',  'ver')
    e(g, 'ver',   'jit',   'pass')
    e(g, 'jit',   'hooks')
    e(g, 'hooks', 'kp')
    e(g, 'hooks', 'tp')
    e(g, 'hooks', 'xdp')
    e(g, 'hooks', 'tc')
    e(g, 'hooks', 'sock')
    e(g, 'kp',    'maps',  'read/write', '#94a3b8', 'dashed')
    e(g, 'xdp',   'maps',  'read/write', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'ebpf-programming-arch'), cleanup=True)
    print('Generated: ebpf-programming-arch')


def diag_ebpf_flow():
    g = base_graph('ebpf_flow', 'eBPF CO-RE + Map Data Flow — user space to kernel and back')
    n(g, 'kern',   'Linux kernel\nBTF vmlinux.h\ntype info embedded', 'navy')
    n(g, 'core',   'CO-RE relocation\nlibbpf rewrites\noffsets at load time\nruns on any 4.15+ kernel', 'purple')
    n(g, 'skel',   'libbpf skeleton\nprog__open()\nprog__load()\nprog__attach()', 'teal')
    n(g, 'rb',     'Ring buffer map\nbpf_ringbuf_submit()\nzero-copy to user', 'green')
    n(g, 'poll',   'ring_buffer__poll()\nuser-space consumer\ncallback per event', 'sky')
    n(g, 'hash',   'Hash map\nbpf_map_lookup_elem()\nbpf_map_update_elem()', 'gold')
    n(g, 'uread',  'User-space read\nbpf_map_lookup_elem()\nvia fd', 'navy')
    n(g, 'bpftrace','bpftrace one-liners\ntracepoint:syscalls\n{ @[comm] = count() }', 'red')
    n(g, 'out',    'Output\nmetrics / traces\ntelemetry sink', 'green')
    e(g, 'kern',  'core',   'BTF type info')
    e(g, 'core',  'skel',   'portable object')
    e(g, 'skel',  'rb',     'attach to hook')
    e(g, 'rb',    'poll')
    e(g, 'poll',  'out')
    e(g, 'skel',  'hash',   'attach to hook')
    e(g, 'hash',  'uread')
    e(g, 'uread', 'out')
    e(g, 'bpftrace','out',  'scripted path', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'ebpf-programming-flow'), cleanup=True)
    print('Generated: ebpf-programming-flow')


def diag_containerd_arch():
    g = base_graph('containerd_arch', 'Container Runtime Stack — OCI layers and CRI integration')
    n(g, 'dock',   'dockerd / nerdctl\nclient daemon', 'sky')
    n(g, 'kubelet','kubelet\nCRI gRPC client', 'navy')
    n(g, 'cri',    'containerd\nCRI plugin\ngRPC server\n:10010', 'teal')
    n(g, 'ctrd',   'containerd daemon\ncontent store\nsnapshotter\nevents bus', 'purple')
    n(g, 'shim',   'containerd-shim\n-runc-v2\nper container\nreaping / IO mux', 'gold')
    n(g, 'runc',   'runc\nlibcontainer\nOCI runtime spec\nexecutes once exits', 'red')
    n(g, 'ns',     'Linux kernel\nnamespaces + cgroups\nmount / net / pid\nuser / uts / ipc', 'green')
    n(g, 'snap',   'Snapshotter\noverlayfs\ndevmapper\nnative', 'gray')
    n(g, 'content','Content store\nOCI image layers\ncontent-addressed\nblobs', 'gray')
    e(g, 'dock',   'ctrd',  'gRPC / Unix socket')
    e(g, 'kubelet','cri',   'CRI gRPC')
    e(g, 'cri',    'ctrd')
    e(g, 'ctrd',   'shim',  'start shim')
    e(g, 'ctrd',   'snap',  'layer mgmt', '#94a3b8', 'dashed')
    e(g, 'ctrd',   'content','image pull', '#94a3b8', 'dashed')
    e(g, 'shim',   'runc',  'exec once')
    e(g, 'runc',   'ns',    'create namespaces')
    e(g, 'shim',   'ns',    'monitor / IO', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'containerd-deep-dive-arch'), cleanup=True)
    print('Generated: containerd-deep-dive-arch')


def diag_containerd_flow():
    g = base_graph('containerd_flow', 'CRI Call Sequence — kubelet to running container')
    n(g, 'kl',   'kubelet\nwatches PodSpec\nassigned to node', 'navy')
    n(g, 's1',   '1. RunPodSandbox\npause container\nnetwork namespace\nCNI ADD call', 'teal')
    n(g, 's2',   '2. PullImage\ncontent store check\nregistry pull if miss\nlayer unpack + snap', 'sky')
    n(g, 's3',   '3. CreateContainer\nOCI spec built\nsnapshot prepared\nshim process started', 'purple')
    n(g, 's4',   '4. StartContainer\nrunc create\nrunc start\nprocess running', 'green')
    n(g, 's5',   '5. ExecSync\n(health / readiness)\nrunc exec\nstdout + exit code', 'gold')
    n(g, 's6',   '6. StopContainer\nSIGTERM grace\nSIGKILL fallback\nsnapshot released', 'red')
    n(g, 'kern', 'Linux kernel\nnamespaces / cgroups\noverlayfs mount', 'gray')
    e(g, 'kl',  's1')
    e(g, 's1',  's2')
    e(g, 's2',  's3')
    e(g, 's3',  's4')
    e(g, 's4',  's5',  'probe loop', '#94a3b8', 'dashed')
    e(g, 's4',  's6',  'terminate',  '#94a3b8', 'dashed')
    e(g, 's4',  'kern','runs in')
    g.render(os.path.join(OUT, 'containerd-deep-dive-flow'), cleanup=True)
    print('Generated: containerd-deep-dive-flow')


def diag_firecracker_arch():
    g = base_graph('firecracker_arch', 'Firecracker microVM architecture — KVM + jailer isolation')
    n(g, 'api',    'REST API server\nUnix Domain Socket\nPUT /machine-config\nPUT /drives\nPUT /actions', 'sky')
    n(g, 'vmm',    'Firecracker VMM\n(Rust process)\ndevice emulation\nmemory mapping\nvCPU management', 'navy')
    n(g, 'kvm',    'KVM hypervisor\n/dev/kvm\nhardware-assisted\nvirtualization', 'purple')
    n(g, 'guest',  'Guest kernel\nminimal linux 5.x\n+ guest OS / init\ninitrd optional', 'green')
    n(g, 'vnet',   'virtio-net\nTAP device\nhost bridge\nnetworking', 'teal')
    n(g, 'vblk',   'virtio-blk\nsquashfs / ext4\nrootfs image\nread-only option', 'teal')
    n(g, 'vsock',  'vsock\nCID addressing\nhost to guest\ncommunication', 'gold')
    n(g, 'jailer', 'jailer binary\ncgroup v2 limits\nseccomp BPF filter\nchroot + netns\nUID 1000', 'red')
    n(g, 'snap',   'Snapshot\nmem + vmstate dump\n< 8ms restore\nclone semantics', 'gray')
    e(g, 'api',    'vmm',    'configure')
    e(g, 'jailer', 'vmm',    'sandboxes', '#dc2626')
    e(g, 'vmm',    'kvm',    'ioctl KVM_RUN')
    e(g, 'kvm',    'guest',  'executes vCPUs')
    e(g, 'vmm',    'vnet')
    e(g, 'vmm',    'vblk')
    e(g, 'vmm',    'vsock')
    e(g, 'vnet',   'guest',  '', '#94a3b8', 'dashed')
    e(g, 'vblk',   'guest',  '', '#94a3b8', 'dashed')
    e(g, 'vmm',    'snap',   'snapshot', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'firecracker-microvms-arch'), cleanup=True)
    print('Generated: firecracker-microvms-arch')


def diag_firecracker_flow():
    g = base_graph('firecracker_flow', 'Firecracker boot sequence and serverless invocation model')
    n(g, 'orch',   'Orchestrator\nserverless control plane\nfunc invocation received', 'navy')
    n(g, 'jail',   'jailer\n--id func-123\n--uid 1000\n--cgroup-version 2\nisolates process', 'red')
    n(g, 'cfg',    'PUT /machine-config\nvCPUs: 1\nmem_size_mib: 512\nht_enabled: false', 'sky')
    n(g, 'root',   'PUT /drives/rootfs\npath_on_host: /img\nis_root_device: true\nread_only: true', 'teal')
    n(g, 'net',    'PUT /network-interfaces\niface_id: eth0\nguest_mac assigned\nhost_dev_name: tap0', 'teal')
    n(g, 'start',  'PUT /actions\naction_type:\nInstanceStart\ntriggers boot', 'purple')
    n(g, 'boot',   'Guest kernel loads\ninit process\n< 125ms total\nboot time', 'green')
    n(g, 'fn',     'Function handler\nexecutes workload\nresult returned\nvia vsock', 'gold')
    n(g, 'snap2',  'Snapshot saved\nnext invocation\nrestores in < 8ms\nmem warm', 'gray')
    e(g, 'orch',  'jail',  'fork jailer')
    e(g, 'jail',  'cfg')
    e(g, 'cfg',   'root')
    e(g, 'root',  'net')
    e(g, 'net',   'start')
    e(g, 'start', 'boot',  'KVM_RUN')
    e(g, 'boot',  'fn')
    e(g, 'fn',    'snap2', 'on idle', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'firecracker-microvms-flow'), cleanup=True)
    print('Generated: firecracker-microvms-flow')


def diag_dagger_arch():
    g = base_graph('dagger_arch', 'Dagger engine architecture — Buildkit-backed pipeline DAG')
    n(g, 'sdk',    'Dagger SDK\nGo / Python\nTypeScript / Java\n@func decorated', 'navy')
    n(g, 'gql',    'GraphQL API\nDagger Engine API\nlocal socket\nor remote engine', 'sky')
    n(g, 'eng',    'Dagger Engine\n(containerized)\nautoscales to\nconcurrency needs', 'purple')
    n(g, 'bk',     'Buildkit\nLLB DAG evaluation\ncontent-addressed\ncache backend', 'teal')
    n(g, 'cache',  'Local cache\ncontent store\n~/.local/share\n/dagger/cache', 'gold')
    n(g, 'cloud',  'Dagger Cloud\ndistributed cache\nteam-shared\nCI + local parity', 'green')
    n(g, 'oci',    'OCI registry\nimage push/pull\ndocker.io / ghcr', 'gray')
    n(g, 'svc',    'Services\nlong-running containers\nDB / Redis / mock API\nhealth-checked', 'red')
    n(g, 'mod',    'Dagger Modules\nDaggerverse\nreusable functions\ncross-language', 'teal')
    e(g, 'sdk',   'gql',    'calls')
    e(g, 'gql',   'eng')
    e(g, 'eng',   'bk',     'LLB ops')
    e(g, 'bk',    'cache',  'read/write')
    e(g, 'cache', 'cloud',  'sync', '#94a3b8', 'dashed')
    e(g, 'bk',    'oci',    'pull base images', '#94a3b8', 'dashed')
    e(g, 'eng',   'svc',    'spawn')
    e(g, 'mod',   'sdk',    'imported by', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'dagger-ci-arch'), cleanup=True)
    print('Generated: dagger-ci-arch')


def diag_dagger_flow():
    g = base_graph('dagger_flow', 'Dagger pipeline execution — DAG caching and in-pipeline Services')
    n(g, 'fn',    'dagger call\nbuild --src=.\ntest --db=postgres', 'navy')
    n(g, 'dag',   'DAG construction\nfunc to nodes\ndeps resolved\nlazy evaluation', 'purple')
    n(g, 'chk',   'Cache check\naction digest\nBuildkit cache key\ninputs hash', 'sky')
    n(g, 'hit',   'Cache HIT\nfetch artifact\nskip execution\nsub-second retrieval', 'green')
    n(g, 'miss',  'Cache MISS\nexecute action\nin container\nsandboxed env', 'gold')
    n(g, 'svc',   'Service startup\npostgres:16\nwait for health\n:5432 exposed', 'teal')
    n(g, 'test',  'Test container\nconnects to svc\nruns test suite\nexit 0 = pass', 'navy')
    n(g, 'write', 'Write cache\noutput digest\nlocal + Cloud\nnext run hits', 'green')
    e(g, 'fn',   'dag')
    e(g, 'dag',  'chk')
    e(g, 'chk',  'hit',   'digest match')
    e(g, 'chk',  'miss',  'no match')
    e(g, 'miss', 'svc',   'start dep service')
    e(g, 'svc',  'test',  'healthy + reachable')
    e(g, 'test', 'write', 'success')
    e(g, 'hit',  'write', '', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'dagger-ci-flow'), cleanup=True)
    print('Generated: dagger-ci-flow')


def diag_linux_storage_arch():
    g = base_graph('linux_storage_arch', 'Linux storage stack — application to physical media')
    n(g, 'app',   'Application\nread() / write()\nopen() / fsync()', 'navy')
    n(g, 'vfs',   'VFS\nVirtual File System\nunified inode iface\ndentry + page cache', 'purple')
    n(g, 'ext4',  'ext4\njournal (ordered)\nextents / HTree\n4K blocks default', 'teal')
    n(g, 'xfs',   'XFS\nallocation groups\ndelayed allocation\nreflink / CoW', 'sky')
    n(g, 'btrfs', 'btrfs\nCoW always\nsubvolumes\nbuilt-in snapshots', 'green')
    n(g, 'block', 'Block layer\nI/O scheduler\nmq-deadline / none\nrequest merging', 'gold')
    n(g, 'lvm',   'LVM device mapper\nPV to VG to LV\nthin provisioning\nsnapshots', 'red')
    n(g, 'nvme',  'NVMe / PCIe\n/dev/nvme0n1\nGen 4: 7 GB/s\nqueue depth 64k', 'gray')
    n(g, 'hdd',   'SATA HDD\n/dev/sda\n150 MB/s\nrotational latency', 'gray')
    e(g, 'app',   'vfs')
    e(g, 'vfs',   'ext4')
    e(g, 'vfs',   'xfs')
    e(g, 'vfs',   'btrfs')
    e(g, 'ext4',  'block')
    e(g, 'xfs',   'block')
    e(g, 'btrfs', 'block')
    e(g, 'block', 'lvm',   'optional', '#94a3b8', 'dashed')
    e(g, 'block', 'nvme')
    e(g, 'block', 'hdd')
    e(g, 'lvm',   'nvme',  '', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'linux-storage-deep-dive-arch'), cleanup=True)
    print('Generated: linux-storage-deep-dive-arch')


def diag_linux_storage_flow():
    g = base_graph('linux_storage_flow', 'LVM architecture and overlayfs container layer model')
    n(g, 'pd1',  'Physical disk 1\n/dev/sdb\npvcreate /dev/sdb', 'gray')
    n(g, 'pd2',  'Physical disk 2\n/dev/sdc\npvcreate /dev/sdc', 'gray')
    n(g, 'vg',   'Volume Group\nvgcreate data-vg\n/dev/sdb /dev/sdc\ncombined pool', 'gold')
    n(g, 'lv1',  'LV: data\nlvcreate -L 100G\nmkfs.xfs /dev/data-vg/data\nmount /data', 'teal')
    n(g, 'lv2',  'LV: logs\nlvcreate -L 20G\nmkfs.ext4\nmount /var/log', 'teal')
    n(g, 'snap', 'LV snapshot\nlvcreate --snapshot\nCoW on write\nbackup / rollback', 'purple')
    n(g, 'img',  'Container image\nlayer 1: base OS\nlayer 2: runtime\nlayer 3: app code', 'sky')
    n(g, 'ov',   'overlayfs mount\nlowerdir: image layers\nupperdir: writable\nworkdir: CoW staging', 'navy')
    n(g, 'cont', 'Running container\nwrites to upperdir\nunion view via VFS\nrm container discards upper', 'green')
    e(g, 'pd1',  'vg')
    e(g, 'pd2',  'vg')
    e(g, 'vg',   'lv1')
    e(g, 'vg',   'lv2')
    e(g, 'lv1',  'snap',  'snapshot', '#94a3b8', 'dashed')
    e(g, 'img',  'ov',    'lowerdir')
    e(g, 'ov',   'cont',  'union mount')
    g.render(os.path.join(OUT, 'linux-storage-deep-dive-flow'), cleanup=True)
    print('Generated: linux-storage-deep-dive-flow')


def diag_linux_net_arch():
    g = base_graph('linux_net_arch', 'Linux container networking — veth, bridge, iptables, NAT')
    n(g, 'ceth',  'Container\neth0\n172.17.0.2/16\nnetwork namespace', 'navy')
    n(g, 'veth',  'veth pair\nvethXXX (host end)\neth0 (container end)\nkernel virtual wire', 'teal')
    n(g, 'br',    'Linux bridge\ndocker0 / cni0\n172.17.0.1/16\nL2 switch in kernel', 'sky')
    n(g, 'ipt',   'iptables FORWARD\nfilter table\nACCEPT policy\nconntrack state', 'purple')
    n(g, 'nat',   'iptables NAT\nPOSTROUTING\nMASQUERADE rule\nsrc IP replaced', 'red')
    n(g, 'nic',   'Host NIC eth0\npublic / VPC IP\n10.0.0.5\npacket on wire', 'gold')
    n(g, 'inet',  'Internet / VPC\nreturn traffic\nconntrack unDNAT\ndelivered back', 'green')
    n(g, 'ns',    'ip netns exec\nisolated routing\ntable + ARP cache\nper container', 'gray')
    e(g, 'ceth',  'veth',  'kernel pair')
    e(g, 'veth',  'br',    'plug into bridge')
    e(g, 'br',    'ipt',   'FORWARD chain')
    e(g, 'ipt',   'nat')
    e(g, 'nat',   'nic',   'masquerade')
    e(g, 'nic',   'inet')
    e(g, 'ns',    'ceth',  'owns', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'linux-networking-l2l3-arch'), cleanup=True)
    print('Generated: linux-networking-l2l3-arch')


def diag_linux_net_flow():
    g = base_graph('linux_net_flow', 'Packet path through iptables chains — outbound container traffic')
    n(g, 'cpkt',  'Container sends\nsrc: 172.17.0.2:45678\ndst: 93.184.216.34:443\nTCP SYN', 'navy')
    n(g, 'pre',   'PREROUTING\nnat table\nDNAT rules checked\nno match: pass through', 'purple')
    n(g, 'rt',    'Routing decision\nip route lookup\ngateway: 172.17.0.1\nfwd to bridge', 'sky')
    n(g, 'fwd',   'FORWARD chain\nfilter table\nACCEPT (conntrack\nnew + established)', 'teal')
    n(g, 'post',  'POSTROUTING\nnat table\nMASQUERADE match\nsrc 172.17.0.2 to 10.0.0.5', 'red')
    n(g, 'wire',  'Host NIC\nsrc: 10.0.0.5:41231\ndst: 93.184.216.34:443\non physical wire', 'gold')
    n(g, 'reply', 'Return SYN-ACK\nconntrack match\nMASQ reversed\ndelivered to container', 'green')
    e(g, 'cpkt',  'pre')
    e(g, 'pre',   'rt')
    e(g, 'rt',    'fwd')
    e(g, 'fwd',   'post')
    e(g, 'post',  'wire')
    e(g, 'wire',  'reply',  'response path', '#94a3b8', 'dashed')
    e(g, 'reply', 'cpkt',   'delivered', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'linux-networking-l2l3-flow'), cleanup=True)
    print('Generated: linux-networking-l2l3-flow')


def diag_k8s_hardway_arch():
    g = base_graph('k8s_hardway_arch', 'Kubernetes control + data plane — component-by-component view')
    n(g, 'etcd',  'etcd cluster\n3 or 5 nodes\nRaft consensus\nstrongly consistent\nall k8s state', 'red')
    n(g, 'api',   'kube-apiserver\nREST + Watch API\nauthn / authz\nadmission chain\netcd client', 'navy')
    n(g, 'sched', 'kube-scheduler\nfilter predicates\nscore priorities\nbind to node', 'purple')
    n(g, 'ctrl',  'kube-controller-manager\nNode / RS / Deploy\nEndpoint / Job\nGC controllers', 'teal')
    n(g, 'kubelet','kubelet\npod lifecycle loop\nCRI / CNI / CSI\nnode status heartbeat', 'green')
    n(g, 'proxy', 'kube-proxy\niptables / ipvs\nService ClusterIP\nEndpointSlice watch', 'gold')
    n(g, 'cri',   'CRI runtime\ncontainerd / CRI-O\ngRPC :10010', 'sky')
    n(g, 'cni',   'CNI plugin\nCalico / Cilium\nFlannel / Weave\npod IP + routes', 'sky')
    n(g, 'csi',   'CSI driver\next-provisioner\next-attacher\nPV lifecycle', 'sky')
    e(g, 'api',   'etcd',    'read/write state')
    e(g, 'sched', 'api',     'watch unscheduled\nbind nodeName')
    e(g, 'ctrl',  'api',     'watch + reconcile')
    e(g, 'kubelet','api',    'watch bound pods\nstatus updates')
    e(g, 'kubelet','cri',    'CRI gRPC')
    e(g, 'kubelet','cni',    'ADD / DEL')
    e(g, 'kubelet','csi',    'NodeStage\nNodePublish')
    e(g, 'proxy', 'api',     'watch endpointslices', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'kubernetes-the-hard-way-arch'), cleanup=True)
    print('Generated: kubernetes-the-hard-way-arch')


def diag_k8s_hardway_flow():
    g = base_graph('k8s_hardway_flow', 'kubectl apply to running pod — full request path')
    n(g, 'kc',    'kubectl apply -f\nclient-side auth\nkubeconfig cert\nRESTMapper lookup', 'navy')
    n(g, 'authn', 'authn\ncert / token\nOIDC / webhook\nidentity resolved', 'sky')
    n(g, 'authz', 'RBAC authz\nClusterRoleBinding\nverb: create\nresource: pods', 'purple')
    n(g, 'adm',   'Admission chain\nMutating webhooks\nValidating webhooks\nResourceQuota check', 'red')
    n(g, 'store', 'etcd write\nobject stored\nresourceVersion set\nwatch event emitted', 'gold')
    n(g, 'sched2','Scheduler watch\nPending pod event\nfilter + score\nnodeName bound', 'teal')
    n(g, 'kbl',   'kubelet watch\nnodeName matches\nCRI: RunPodSandbox\nCRI: StartContainer', 'green')
    n(g, 'cni2',  'CNI ADD\npod IP assigned\nveth + route set\nreadiness probe starts', 'sky')
    n(g, 'run',   'Pod Running\nstatus: Running\ncontainerStatuses\nready: true', 'green')
    e(g, 'kc',    'authn')
    e(g, 'authn', 'authz')
    e(g, 'authz', 'adm')
    e(g, 'adm',   'store')
    e(g, 'store', 'sched2', 'watch event')
    e(g, 'sched2','store',  'bind write')
    e(g, 'store', 'kbl',    'watch event')
    e(g, 'kbl',   'cni2')
    e(g, 'cni2',  'run')
    g.render(os.path.join(OUT, 'kubernetes-the-hard-way-flow'), cleanup=True)
    print('Generated: kubernetes-the-hard-way-flow')


def diag_k8s_storage_arch():
    g = base_graph('k8s_storage_arch', 'Kubernetes storage — CSI architecture and PV lifecycle')
    n(g, 'sc',    'StorageClass\nprovisioner: ebs.csi\nreclaimPolicy: Delete\nWaitForFirstConsumer', 'navy')
    n(g, 'pvc',   'PersistentVolumeClaim\nstorage: 50Gi\naccessModes: RWO\nstorageClassName: ebs', 'sky')
    n(g, 'prov',  'external-provisioner\nwatches unbound PVCs\ncalls CSI driver\nCreateVolume RPC', 'purple')
    n(g, 'csi',   'CSI driver\ncontroller pod\n(Deployment)\n+ node pod (DaemonSet)', 'teal')
    n(g, 'cloud', 'Cloud storage\nEBS gp3 50 GiB\n3000 IOPS baseline\nVolumeId returned', 'gold')
    n(g, 'pv',    'PersistentVolume\nreclaimPolicy: Delete\nvolumeMode: Filesystem\nBound to PVC', 'green')
    n(g, 'att',   'external-attacher\nControllerPublish\nVolume RPC\nnode attach op', 'purple')
    n(g, 'node',  'node-driver-registrar\nCSI node plugin\nNodeStageVolume\nNodePublishVolume', 'red')
    n(g, 'pod',   'Pod\n/data mounted\nfs ready to use\nRWO: single node', 'green')
    e(g, 'pvc',   'sc',    'references StorageClass')
    e(g, 'sc',    'prov',  'triggers provisioner')
    e(g, 'prov',  'csi',   'CreateVolume RPC')
    e(g, 'csi',   'cloud', 'provision volume')
    e(g, 'cloud', 'pv',    'PV object created')
    e(g, 'pv',    'pvc',   'Bound')
    e(g, 'pvc',   'att',   'attach on pod schedule', '#94a3b8', 'dashed')
    e(g, 'att',   'csi',   'ControllerPublish RPC')
    e(g, 'node',  'pod',   'NodePublish to mount point')
    g.render(os.path.join(OUT, 'kubernetes-storage-arch'), cleanup=True)
    print('Generated: kubernetes-storage-arch')


def diag_k8s_storage_flow():
    g = base_graph('k8s_storage_flow', 'Dynamic provisioning and VolumeSnapshot restore flow')
    n(g, 'pvc2',  'PVC created\naccessModes: RWO\nresources:\nstorage: 100Gi', 'navy')
    n(g, 'wff',   'WaitForFirstConsumer\nbinding deferred\nuntil pod scheduled\navoids zone mismatch', 'gold')
    n(g, 'sched', 'Pod scheduled\nto us-east-1b\nbinding mode fires\nprovision in zone', 'teal')
    n(g, 'vol',   'CSI CreateVolume\nin us-east-1b\ngp3 100 GiB\nVolumeId returned', 'purple')
    n(g, 'bound', 'PV created + Bound\nphase: Bound\nresourceVersion set\nPVC ready', 'green')
    n(g, 'snap',  'VolumeSnapshot\nsnapshotClassName\nCSI CreateSnapshot\nSnapHandle stored', 'sky')
    n(g, 'resto', 'Restore PVC\ndataSource:\nkind: VolumeSnapshot\nnew PV from snapshot', 'teal')
    n(g, 'pod2',  'Pod mounts\nnew PVC\ndata intact\nRTO under 2 min', 'green')
    e(g, 'pvc2',  'wff')
    e(g, 'wff',   'sched',  'pod scheduled')
    e(g, 'sched', 'vol')
    e(g, 'vol',   'bound')
    e(g, 'bound', 'snap',   'snapshot op', '#94a3b8', 'dashed')
    e(g, 'snap',  'resto',  'restore from snapshot')
    e(g, 'resto', 'pod2')
    g.render(os.path.join(OUT, 'kubernetes-storage-flow'), cleanup=True)
    print('Generated: kubernetes-storage-flow')


def diag_k8s_scheduling_arch():
    g = base_graph('k8s_scheduling_arch', 'Kubernetes scheduler pipeline — filter, score, bind')
    n(g, 'pend',  'Pending Pod\nnodeName: empty\nactive queue\nPriorityClass sort', 'navy')
    n(g, 'filt',  'Filter phase\nPodFitsResources\nNodeAffinity\nTaintToleration\nTopologySpread\nPodAntiAffinity', 'red')
    n(g, 'feasible','Feasible nodes\nsubset passes\nall predicates\nmay be 0', 'sky')
    n(g, 'score', 'Score phase\nLeastAllocated\nBalancedResource\nImageLocality\n0-100 per plugin', 'purple')
    n(g, 'best',  'Highest scored\nnode selected\nties: random\nshuffle', 'teal')
    n(g, 'bind',  'Bind\nAPI server call\nnodeName set\nPod: Scheduled', 'green')
    n(g, 'pre',   'Preemption\n0 feasible nodes\nevict lower-priority\npods and retry', 'red')
    n(g, 'tsc',   'TopologySpread\nmaxSkew: 1\ntopologyKey: zone\nwhenUnsatisfiable:\nDoNotSchedule', 'gold')
    n(g, 'aff',   'Node/Pod Affinity\nrequired / preferred\nmatchExpressions\ntopologyKey', 'gold')
    e(g, 'pend',  'filt')
    e(g, 'filt',  'feasible', 'nodes pass')
    e(g, 'filt',  'pre',      '0 nodes fit', '#dc2626')
    e(g, 'feasible','score')
    e(g, 'score', 'best')
    e(g, 'best',  'bind')
    e(g, 'tsc',   'filt',    'constraint check', '#94a3b8', 'dotted')
    e(g, 'aff',   'filt',    'constraint check', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'kubernetes-pod-scheduling-arch'), cleanup=True)
    print('Generated: kubernetes-pod-scheduling-arch')


def diag_k8s_scheduling_flow():
    g = base_graph('k8s_scheduling_flow', 'Topology spread, QoS eviction order, and PriorityClass preemption')
    n(g, 'goal',  'Goal: 9 pods\nacross 3 zones\nmaxSkew: 1\nminDomains: 3', 'navy')
    n(g, 'za',    'Zone A (us-east-1a)\n3 pods running\nzone count: 3', 'teal')
    n(g, 'zb',    'Zone B (us-east-1b)\n3 pods running\nzone count: 3', 'teal')
    n(g, 'zc',    'Zone C (us-east-1c)\n3 pods running\nzone count: 3', 'teal')
    n(g, 'new',   '10th pod\nscheduled to any zone\nall equal: skew stays 1\ntopology balanced', 'sky')
    n(g, 'qos',   'OOM / Memory pressure\neviction order', 'red')
    n(g, 'be',    '1st: BestEffort\nno requests or limits\ncheapest to evict', 'red')
    n(g, 'burst', '2nd: Burstable\nrequests set\nbut less than limits', 'gold')
    n(g, 'guar',  'Last: Guaranteed\nreq == limits\nall containers', 'green')
    n(g, 'preem', 'PriorityClass\nhigh-priority pod\npreempts low-priority\nrescheduled on freed node', 'purple')
    e(g, 'goal',  'za')
    e(g, 'goal',  'zb')
    e(g, 'goal',  'zc')
    e(g, 'new',   'za',    'eligible', '#94a3b8', 'dashed')
    e(g, 'new',   'zb',    'eligible', '#94a3b8', 'dashed')
    e(g, 'new',   'zc',    'eligible', '#94a3b8', 'dashed')
    e(g, 'qos',   'be')
    e(g, 'be',    'burst')
    e(g, 'burst', 'guar')
    e(g, 'preem', 'guar',  'may preempt\nif priority higher', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'kubernetes-pod-scheduling-flow'), cleanup=True)
    print('Generated: kubernetes-pod-scheduling-flow')


def diag_runtime_security_arch():
    g = base_graph('runtime_security_arch', 'Kubernetes runtime security — Falco, Kubescape, PSS, seccomp')
    n(g, 'kern',  'Linux kernel\nsystem calls\nexecve / open\nnetwork / mount', 'gray')
    n(g, 'ebpf',  'eBPF probe\nFalco driver\nkprobe on syscalls\nzero-copy events', 'purple')
    n(g, 'falco', 'Falco rules engine\ncondition + output\npriority: CRITICAL\nMITRE tag: T1059', 'red')
    n(g, 'sk',    'Falco Sidekick\nalert router\nSlack / PagerDuty\nElastic / S3', 'gold')
    n(g, 'kscape','Kubescape\nNSA hardening guide\nMITRE ATT&CK\nRBAC risk score\nCI gate mode', 'navy')
    n(g, 'pss',   'Pod Security\nStandards\nPrivileged\nBaseline\nRestricted', 'teal')
    n(g, 'adm',   'PodSecurity\nadmission controller\nnamespace label\nenforce level', 'sky')
    n(g, 'opa',   'OPA / Gatekeeper\nConstraintTemplate\nvalidating webhook\npolicy-as-code', 'teal')
    n(g, 'kyv',   'Kyverno\nClusterPolicy\nmutating +\nvalidating\nresource generator', 'teal')
    n(g, 'sec',   'seccomp\nRuntimeDefault\n300+ syscalls\nallowlist kernel', 'green')
    e(g, 'kern',  'ebpf',   'hook attach')
    e(g, 'ebpf',  'falco',  'events stream')
    e(g, 'falco', 'sk',     'fire alert')
    e(g, 'kscape','adm',    'risk gate', '#94a3b8', 'dashed')
    e(g, 'adm',   'pss',    'enforce level')
    e(g, 'opa',   'adm',    'webhook', '#94a3b8', 'dashed')
    e(g, 'kyv',   'adm',    'webhook', '#94a3b8', 'dashed')
    e(g, 'sec',   'kern',   'filter syscalls', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'kubescape-runtime-security-arch'), cleanup=True)
    print('Generated: kubescape-runtime-security-arch')


def diag_runtime_security_flow():
    g = base_graph('runtime_security_flow', 'Falco detection and PSS enforcement flow')
    n(g, 'atk',   'Attacker\nexec into pod\nbash shell spawned\nnon-interactive check fails', 'red')
    n(g, 'sc2',   'syscall: execve\nbash pid=1234\ncontainer: web-api\nnode: worker-3', 'gray')
    n(g, 'probe', 'Falco eBPF probe\ncaptures syscall\nenriches with k8s\nnamespace + pod name', 'purple')
    n(g, 'rule',  'Rule: Terminal shell\nin container\ncondition matches\npriority: CRITICAL', 'red')
    n(g, 'route', 'Falco Sidekick\nformat JSON payload\nroute to outputs', 'gold')
    n(g, 'pd',    'PagerDuty\nP1 incident\nauto-assign\non-call engineer', 'red')
    n(g, 'slack', 'Slack alert\n#security-alerts\npod + container\nkubectl kill steps', 'teal')
    n(g, 'pss2',  'PSS Restricted\nnamespace enforce:\npod-security.k8s.io\n/enforce: restricted', 'navy')
    n(g, 'deny',  'Admission denied\nrunAsNonRoot: true\nallowPrivilegeEsc: false\ncapabilities drop ALL', 'red')
    e(g, 'atk',   'sc2')
    e(g, 'sc2',   'probe')
    e(g, 'probe', 'rule')
    e(g, 'rule',  'route',  'alert fired')
    e(g, 'route', 'pd')
    e(g, 'route', 'slack')
    e(g, 'pss2',  'deny',   'blocks at\nadmission time')
    g.render(os.path.join(OUT, 'kubescape-runtime-security-flow'), cleanup=True)
    print('Generated: kubescape-runtime-security-flow')


if __name__ == '__main__':
    # Foundations
    diag_three_ways(); diag_dora_metrics(); diag_westrum_calms(); diag_team_topologies(); diag_value_stream()
    # CI/CD
    diag_ci(); diag_cd_vs_deploy(); diag_pipeline_as_code(); diag_test_pyramid(); diag_monorepo_build(); diag_trunk()
    # CI/CD Tools (NEW)
    diag_gha(); diag_gha_workflow(); diag_jenkins(); diag_gitlab_ci(); diag_circleci(); diag_tekton(); diag_argo_workflows(); diag_argo_workflows_arch(); diag_buildkite()
    # Continuous Delivery
    diag_progressive_delivery(); diag_feature_flags(); diag_deployment_strategies(); diag_db_migrations_cicd(); diag_release_engineering()
    # GitOps (NEW)
    diag_gitops_principles(); diag_argocd(); diag_fluxcd(); diag_app_of_apps(); diag_multi_cluster_gitops(); diag_gitops_drift_recon()
    # IaC
    diag_iac_fundamentals(); diag_terraform_internals(); diag_pulumi(); diag_cloud_native_iac(); diag_iac_state(); diag_iac_governance()
    # Configuration Management
    diag_ansible(); diag_pcs(); diag_immutable(); diag_drift_remediation()
    # Containers
    diag_container_fundamentals(); diag_docker_buildkit(); diag_image_hardening(); diag_buildpacks(); diag_container_security()
    # Orchestration
    diag_k8s_arch(); diag_k8s_resources(); diag_helm_kustomize(); diag_operators(); diag_service_mesh(); diag_gateway_api()
    # Observability (NEW)
    diag_otel(); diag_distributed_tracing(); diag_prom_grafana(); diag_log_aggregation(); diag_apm(); diag_ebpf_obs(); diag_slo_dashboards()
    # Platform
    diag_platform_eng(); diag_idp(); diag_backstage(); diag_golden_paths(); diag_dx_metrics()
    # DevSecOps
    diag_shift_left(); diag_security_taxonomy(); diag_supply_chain_slsa(); diag_policy_as_code(); diag_runtime_security()
    # Cloud Native
    diag_twelve_factor(); diag_microservices(); diag_event_driven(); diag_serverless(); diag_strangler_fig()
    # Data DevOps
    diag_db_migrations(); diag_gitops_dbs(); diag_data_observability(); diag_mlops()
    # MLOps & LLMOps (NEW)
    diag_mlops_lifecycle(); diag_feature_stores(); diag_mlflow(); diag_kserve_bento(); diag_drift_detection(); diag_llmops(); diag_llm_serving()
    # AIOps (NEW)
    diag_aiops_fundamentals(); diag_anomaly_detection(); diag_alert_correlation(); diag_incident_rca()
    diag_llm_sre_agents(); diag_capacity_forecasting(); diag_aiops_open_source(); diag_chaos_observability(); diag_k8s_aiops(); diag_aiops_maturity()
    # New topics — eBPF, containerd, Firecracker, Dagger, Linux Storage/Networking, K8s Hard Way, K8s Storage, K8s Scheduling, Runtime Security
    diag_ebpf_arch(); diag_ebpf_flow()
    diag_containerd_arch(); diag_containerd_flow()
    diag_firecracker_arch(); diag_firecracker_flow()
    diag_dagger_arch(); diag_dagger_flow()
    diag_linux_storage_arch(); diag_linux_storage_flow()
    diag_linux_net_arch(); diag_linux_net_flow()
    diag_k8s_hardway_arch(); diag_k8s_hardway_flow()
    diag_k8s_storage_arch(); diag_k8s_storage_flow()
    diag_k8s_scheduling_arch(); diag_k8s_scheduling_flow()
    diag_runtime_security_arch(); diag_runtime_security_flow()
    print('DevOps diagrams complete (~105 diagrams across 16 sub-categories).')
