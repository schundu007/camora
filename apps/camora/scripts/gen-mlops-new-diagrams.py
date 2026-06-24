#!/usr/bin/env python3
"""Generate 8 Graphviz PNG diagrams for new MLOps topics."""

import graphviz
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'mlops')
os.makedirs(OUT, exist_ok=True)


def base(name):
    return graphviz.Digraph(
        name,
        graph_attr={'rankdir': 'LR', 'bgcolor': 'white', 'dpi': '200',
                    'fontname': 'Helvetica', 'pad': '0.4', 'splines': 'ortho'},
        node_attr={'fontname': 'Helvetica', 'fontsize': '11'},
        edge_attr={'fontname': 'Helvetica', 'fontsize': '9'},
    )


def n(g, name, label, shape='box', style='filled', fillcolor='#1e3a5f', fontcolor='white', **kw):
    g.node(name, label=label, shape=shape, style=style, fillcolor=fillcolor, fontcolor=fontcolor, **kw)


def e(g, src, dst, label='', color='#334155', **kw):
    g.edge(src, dst, label=label, color=color, fontcolor='#334155', **kw)


# ── 1. Data Versioning ────────────────────────────────────────────────────────

def gen_data_versioning():
    g = base('data_versioning')
    g.attr(rankdir='LR', label='Data Versioning', labelloc='t',
           fontsize='14', fontcolor='#1e3a5f')

    # Main pipeline
    n(g, 'raw', 'Raw Data', fillcolor='#7c2d12')
    n(g, 'dvc', 'DVC Pointer\n(.dvc file)', fillcolor='#1e3a5f')
    n(g, 'remote', 'Remote Storage\n(S3 / GCS)', fillcolor='#1e3a5f')

    e(g, 'raw', 'dvc')
    e(g, 'dvc', 'remote')

    # Versioning tools cluster
    with g.subgraph(name='cluster_tools') as c:
        c.attr(label='Table Format Options', style='filled', fillcolor='#f0fdf4',
               color='#166534', fontcolor='#166534')
        n(c, 'delta', 'Delta Lake\nACID + Time Travel', fillcolor='#166534')
        n(c, 'iceberg', 'Apache Iceberg\nHidden Partitioning', fillcolor='#166534')
        n(c, 'lakefs', 'LakeFS\nGit Branch Semantics', fillcolor='#166534')

    e(g, 'raw', 'delta', label='format')
    e(g, 'raw', 'iceberg', label='format')
    e(g, 'raw', 'lakefs', label='branch')

    g.render(os.path.join(OUT, 'data-versioning'), format='png', cleanup=True)


# ── 2. Pipeline Orchestration ─────────────────────────────────────────────────

def gen_pipeline_orchestration():
    g = base('pipeline_orchestration')
    g.attr(rankdir='LR', label='ML Pipeline Orchestration', labelloc='t',
           fontsize='14', fontcolor='#1e3a5f')

    with g.subgraph(name='cluster_task') as c:
        c.attr(label='Task-Centric', style='filled', fillcolor='#eff6ff',
               color='#1e3a5f', fontcolor='#1e3a5f')
        n(c, 'airflow', 'Airflow\nDAGs', fillcolor='#1e3a5f')
        n(c, 'kubeflow', 'Kubeflow Pipelines\nK8s Containers', fillcolor='#1e3a5f')
        n(c, 'metaflow', 'Metaflow\nSteps', fillcolor='#1e3a5f')

    with g.subgraph(name='cluster_asset') as c:
        c.attr(label='Asset-Centric', style='filled', fillcolor='#f0fdf4',
               color='#166534', fontcolor='#166534')
        n(c, 'dagster', 'Dagster\nSoftware Assets', fillcolor='#166534')
        n(c, 'prefect', 'Prefect\nFlows', fillcolor='#166534')

    n(g, 'artifact', 'Artifact Store', fillcolor='#1e3a5f')
    n(g, 'compute', 'Compute\n(CPU / GPU / Spark)', fillcolor='#7c2d12')

    for orch in ['airflow', 'kubeflow', 'metaflow', 'dagster', 'prefect']:
        e(g, orch, 'artifact')
        e(g, orch, 'compute')

    g.render(os.path.join(OUT, 'pipeline-orchestration'), format='png', cleanup=True)


# ── 3. Model Evaluation ───────────────────────────────────────────────────────

def gen_model_evaluation():
    g = base('model_evaluation')
    g.attr(rankdir='LR', label='Model Evaluation: Offline vs Online', labelloc='t',
           fontsize='14', fontcolor='#1e3a5f')

    # Center node
    n(g, 'labels', 'Delayed Labels', shape='diamond', fillcolor='#92400e')

    with g.subgraph(name='cluster_offline') as c:
        c.attr(label='Offline Evaluation', style='filled', fillcolor='#eff6ff',
               color='#1e3a5f', fontcolor='#1e3a5f')
        n(c, 'holdout', 'Holdout Set', fillcolor='#1e3a5f')
        n(c, 'metrics', 'Metrics\n(AUC / F1)', fillcolor='#1e3a5f')
        n(c, 'fairness', 'Fairness Slices', fillcolor='#1e3a5f')
        n(c, 'threshold', 'Threshold Selection', fillcolor='#1e3a5f')
        e(c, 'holdout', 'metrics')
        e(c, 'metrics', 'fairness')
        e(c, 'fairness', 'threshold')

    with g.subgraph(name='cluster_online') as c:
        c.attr(label='Online Evaluation', style='filled', fillcolor='#f0fdf4',
               color='#166534', fontcolor='#166534')
        n(c, 'canary', 'Canary\n(1% traffic)', fillcolor='#166534')
        n(c, 'ab', 'A/B Test\n(50/50)', fillcolor='#166534')
        n(c, 'champion', 'Champion /\nChallenger', fillcolor='#166534')
        n(c, 'bandit', 'Multi-Armed\nBandit', fillcolor='#166534')
        e(c, 'canary', 'ab')
        e(c, 'ab', 'champion')
        e(c, 'champion', 'bandit')

    e(g, 'labels', 'threshold', label='ground truth')
    e(g, 'labels', 'bandit', label='reward signal')

    g.render(os.path.join(OUT, 'model-evaluation'), format='png', cleanup=True)


# ── 4. Azure ML Platform ──────────────────────────────────────────────────────

def gen_azure_ml_platform():
    g = base('azure_ml_platform')
    g.attr(rankdir='TB', label='Azure ML Platform', labelloc='t',
           fontsize='14', fontcolor='#1e3a5f')

    n(g, 'workspace', 'Azure ML Workspace', shape='box', fillcolor='#1e3a5f',
      fontsize='13')

    with g.subgraph(name='cluster_core') as c:
        c.attr(label='Core Services', style='filled', fillcolor='#eff6ff',
               color='#1e3a5f', fontcolor='#1e3a5f')
        n(c, 'compute', 'Compute Targets\n(CPU / GPU Clusters)', fillcolor='#1e3a5f')
        n(c, 'tracking', 'Experiment Tracking\n(MLflow)', fillcolor='#1e3a5f')
        n(c, 'registry', 'Model Registry', fillcolor='#1e3a5f')
        n(c, 'endpoints', 'Managed Endpoints\n(Online + Batch)', fillcolor='#1e3a5f')

    with g.subgraph(name='cluster_integrations') as c:
        c.attr(label='Integrations', style='filled', fillcolor='#f0fdf4',
               color='#166534', fontcolor='#166534')
        n(c, 'databricks', 'Databricks\nIntegration', fillcolor='#166534')
        n(c, 'rai', 'Responsible AI\nDashboard', fillcolor='#166534')

    for svc in ['compute', 'tracking', 'registry', 'endpoints']:
        e(g, 'workspace', svc)

    e(g, 'databricks', 'workspace', label='data / feature')
    e(g, 'rai', 'registry', label='fairness audit')

    g.render(os.path.join(OUT, 'azure-ml-platform'), format='png', cleanup=True)


# ── 5. Deployment Strategies ──────────────────────────────────────────────────

def gen_deployment_strategies():
    g = base('deployment_strategies')
    g.attr(rankdir='LR', label='ML Deployment Strategies (Risk Gradient)',
           labelloc='t', fontsize='14', fontcolor='#1e3a5f')

    # Strategy nodes with risk gradient
    n(g, 'shadow', 'Shadow\n(0% traffic)', fillcolor='#166534')
    n(g, 'canary', 'Canary\n(1 → 10%)', fillcolor='#166534')
    n(g, 'ab', 'A/B Test\n(50 / 50)', fillcolor='#92400e')
    n(g, 'blugreen', 'Blue / Green\n(instant switch)', fillcolor='#7c2d12')
    n(g, 'feature', 'Feature Flag\n(per-user)', fillcolor='#7c2d12')

    e(g, 'shadow', 'canary', label='confidence')
    e(g, 'canary', 'ab', label='scale')
    e(g, 'ab', 'blugreen', label='winner')
    e(g, 'blugreen', 'feature', label='segment')

    # Risk labels as invisible nodes below each
    n(g, 'r_shadow', 'Risk: None', shape='plaintext', fillcolor='white',
      fontcolor='#166534')
    n(g, 'r_canary', 'Risk: Low', shape='plaintext', fillcolor='white',
      fontcolor='#166534')
    n(g, 'r_ab', 'Risk: Moderate', shape='plaintext', fillcolor='white',
      fontcolor='#92400e')
    n(g, 'r_blugreen', 'Risk: Fast Rollback', shape='plaintext', fillcolor='white',
      fontcolor='#7c2d12')
    n(g, 'r_feature', 'Risk: Targeted', shape='plaintext', fillcolor='white',
      fontcolor='#7c2d12')

    with g.subgraph() as s:
        s.attr(rank='same')
        for node in ['r_shadow', 'r_canary', 'r_ab', 'r_blugreen', 'r_feature']:
            s.node(node)

    e(g, 'shadow', 'r_shadow', style='dashed', color='#94a3b8')
    e(g, 'canary', 'r_canary', style='dashed', color='#94a3b8')
    e(g, 'ab', 'r_ab', style='dashed', color='#94a3b8')
    e(g, 'blugreen', 'r_blugreen', style='dashed', color='#94a3b8')
    e(g, 'feature', 'r_feature', style='dashed', color='#94a3b8')

    g.render(os.path.join(OUT, 'deployment-strategies'), format='png', cleanup=True)


# ── 6. ML Security ────────────────────────────────────────────────────────────

def gen_ml_security():
    g = base('ml_security')
    g.attr(rankdir='LR', label='ML Security: Attacks & Defenses', labelloc='t',
           fontsize='14', fontcolor='#1e3a5f')

    n(g, 'system', 'ML System\nUnder Attack', shape='doublecircle',
      fillcolor='#1e3a5f', fontsize='12')

    with g.subgraph(name='cluster_attacks') as c:
        c.attr(label='Attacks', style='filled', fillcolor='#fef2f2',
               color='#7c2d12', fontcolor='#7c2d12')
        n(c, 'adv', 'Adversarial\nExamples', fillcolor='#7c2d12')
        n(c, 'poison', 'Data Poisoning', fillcolor='#7c2d12')
        n(c, 'steal', 'Model Stealing', fillcolor='#7c2d12')
        n(c, 'supply', 'Supply Chain\nAttack', fillcolor='#7c2d12')

    with g.subgraph(name='cluster_defenses') as c:
        c.attr(label='Defenses', style='filled', fillcolor='#f0fdf4',
               color='#166534', fontcolor='#166534')
        n(c, 'advtrain', 'Adversarial\nTraining', fillcolor='#166534')
        n(c, 'dp', 'Differential\nPrivacy', fillcolor='#166534')
        n(c, 'preproc', 'Input\nPreprocessing', fillcolor='#166534')
        n(c, 'signed', 'Signed Models\n(SBOM)', fillcolor='#166534')

    for atk in ['adv', 'poison', 'steal', 'supply']:
        e(g, 'system', atk, color='#ef4444')

    for dfs in ['advtrain', 'dp', 'preproc', 'signed']:
        e(g, dfs, 'system', color='#16a34a', label='mitigates')

    e(g, 'adv', 'advtrain', style='dashed', color='#94a3b8', label='countered by')
    e(g, 'poison', 'dp', style='dashed', color='#94a3b8', label='countered by')
    e(g, 'adv', 'preproc', style='dashed', color='#94a3b8')
    e(g, 'supply', 'signed', style='dashed', color='#94a3b8', label='countered by')

    g.render(os.path.join(OUT, 'ml-security'), format='png', cleanup=True)


# ── 7. Continual Learning ─────────────────────────────────────────────────────

def gen_continual_learning():
    g = base('continual_learning')
    g.attr(rankdir='LR', label='Continual Learning Pipeline', labelloc='t',
           fontsize='14', fontcolor='#1e3a5f')

    # Main cycle
    n(g, 'stream', 'Streaming Data', fillcolor='#1e3a5f')
    n(g, 'update', 'Online Update', fillcolor='#1e3a5f')
    n(g, 'model', 'Deployed Model', fillcolor='#1e3a5f')
    n(g, 'drift', 'Drift Detector\n(PSI / KS test)', fillcolor='#1e3a5f')
    n(g, 'no_drift', 'No Drift\nServe as-is', shape='box', fillcolor='#166534')
    n(g, 'retrain', 'Trigger Retrain', shape='box', fillcolor='#92400e')

    e(g, 'stream', 'update')
    e(g, 'update', 'model')
    e(g, 'model', 'drift', label='predictions')
    e(g, 'drift', 'no_drift', label='no')
    e(g, 'drift', 'retrain', label='yes', color='#92400e')
    e(g, 'no_drift', 'stream', label='loop', style='dashed')
    e(g, 'retrain', 'update', label='new weights', color='#92400e')

    # Forgetting inset
    with g.subgraph(name='cluster_forget') as c:
        c.attr(label='Catastrophic Forgetting', style='filled',
               fillcolor='#fef3c7', color='#92400e', fontcolor='#92400e')
        n(c, 'cat_forget', 'Old Task\nForgotten', fillcolor='#92400e')
        n(c, 'ewc', 'EWC\n(Elastic Weight\nConsolidation)', fillcolor='#166534')
        n(c, 'replay', 'Replay Buffer\n(Experience Replay)', fillcolor='#166534')
        e(c, 'cat_forget', 'ewc', label='fix')
        e(c, 'cat_forget', 'replay', label='fix')

    e(g, 'retrain', 'cat_forget', style='dashed', color='#94a3b8', label='risk')

    g.render(os.path.join(OUT, 'continual-learning'), format='png', cleanup=True)


# ── 8. ML Testing Infrastructure ─────────────────────────────────────────────

def gen_ml_testing_infra():
    g = base('ml_testing_infra')
    g.attr(rankdir='TB', label='ML Testing Infrastructure (Pyramid)',
           labelloc='t', fontsize='14', fontcolor='#1e3a5f')

    # Use same-rank groups to simulate pyramid levels from bottom (wide) to top (narrow)
    n(g, 'unit_1', 'Unit: Transform\nFunctions', fillcolor='#166534')
    n(g, 'unit_2', 'Unit: Feature\nEngineering', fillcolor='#166534')
    n(g, 'unit_3', 'Unit: Schema\nValidation', fillcolor='#166534')

    n(g, 'int_1', 'Integration: Pipeline\nEnd-to-End', fillcolor='#1a5c3a')
    n(g, 'int_2', 'Integration: Data\nValidation (Great Exp.)', fillcolor='#1a5c3a')

    n(g, 'beh_1', 'Behavioral: Invariance\nTests', fillcolor='#1e3a5f')
    n(g, 'beh_2', 'Behavioral: Directional\nExpectations', fillcolor='#1e3a5f')

    n(g, 'e2e_1', 'E2E: Latency SLO\n+ Contract Tests', fillcolor='#0f1e3d',
      fontsize='10')

    # Rank groups to force pyramid shape
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('unit_1')
        s.node('unit_2')
        s.node('unit_3')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('int_1')
        s.node('int_2')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('beh_1')
        s.node('beh_2')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('e2e_1')

    # Edges flowing up through pyramid levels
    e(g, 'unit_1', 'int_1', label='pass')
    e(g, 'unit_2', 'int_1')
    e(g, 'unit_3', 'int_2', label='pass')
    e(g, 'int_1', 'beh_1', label='pass')
    e(g, 'int_2', 'beh_2')
    e(g, 'beh_1', 'e2e_1', label='pass')
    e(g, 'beh_2', 'e2e_1')

    g.render(os.path.join(OUT, 'ml-testing-infra'), format='png', cleanup=True)


# ── Run all ───────────────────────────────────────────────────────────────────

diagrams = [
    gen_data_versioning,
    gen_pipeline_orchestration,
    gen_model_evaluation,
    gen_azure_ml_platform,
    gen_deployment_strategies,
    gen_ml_security,
    gen_continual_learning,
    gen_ml_testing_infra,
]

for fn in diagrams:
    fn()

print("Done")
