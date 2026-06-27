import graphviz
import os
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'mlops')
os.makedirs(OUT, exist_ok=True)

BASE_GRAPH = dict(
    bgcolor='white', fontname='Helvetica', fontsize='13',
    rankdir='LR', dpi='200', pad='0.6',
    nodesep='0.65', ranksep='0.85', splines='spline',
)
BASE_NODE = dict(
    fontname='Helvetica', fontsize='12', style='filled',
    margin='0.20,0.12', penwidth='1.5',
)
BASE_EDGE = dict(fontname='Helvetica', fontsize='10', penwidth='1.5', arrowsize='0.8')


def G(name, label, **kw):
    attrs = {**BASE_GRAPH, 'label': label, 'labelloc': 't', 'labeljust': 'c', 'fontsize': '16', **kw}
    g = graphviz.Digraph(name, graph_attr=attrs)
    g.attr('node', **BASE_NODE)
    g.attr('edge', **BASE_EDGE)
    return g


def save(g, filename):
    stem = os.path.join(OUT, filename)
    g.render(stem, format='png', cleanup=True)
    final = stem + '.png'
    img = Image.open(final)
    w, h = img.size
    print(f'Generated: {filename}.png  {w}x{h}')


def gen_azure_mlops_maturity():
    g = G('azure_mlops_maturity', 'Azure MLOps Maturity Model', rankdir='TB')
    levels = [
        ('l0', 'Level 0 — No MLOps\nManual processes, notebooks only\nNo versioning, no CI/CD', '#f1f5f9', '#64748b'),
        ('l1', 'Level 1 — DevOps\nSource control, unit tests\nBasic CI/CD pipeline', '#fef3c7', '#b45309'),
        ('l2', 'Level 2 — Automated Training\nPipeline orchestration (ADF/AML)\nModel registry, experiment tracking', '#dbeafe', '#1d4ed8'),
        ('l3', 'Level 3 — Automated Deployment\nAuto model deployment (AKS)\nA/B testing, canary releases', '#dcfce7', '#15803d'),
        ('l4', 'Level 4 — Full MLOps\nAuto retraining on drift\nFull audit trail, governance', '#f3e8ff', '#7c3aed'),
    ]
    prev = None
    for nid, label, fill, color in levels:
        g.node(nid, label, shape='box', style='filled,rounded',
               fillcolor=fill, color=color, fontcolor='#1e293b',
               width='6', height='0.8')
        if prev:
            g.edge(prev, nid)
        prev = nid
    save(g, 'azure-mlops-maturity')


def gen_bias_mitigation():
    g = G('bias_mitigation', 'Bias Mitigation Pipeline')
    with g.subgraph(name='cluster_pre') as c:
        c.attr(label='Pre-Processing', style='filled,rounded', fillcolor='#eff6ff', color='#3b82f6')
        c.node('resample', 'Data Resampling\n(oversample minority)', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('reweight', 'Sample Reweighting\n(fairness weights)', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('transform', 'Data Transform\n(disparate impact remover)', fillcolor='#dbeafe', color='#1d4ed8')
    with g.subgraph(name='cluster_in') as c:
        c.attr(label='In-Processing', style='filled,rounded', fillcolor='#f0fdf4', color='#22c55e')
        c.node('fair_constr', 'Fairness Constraints\n(equalized odds loss)', fillcolor='#dcfce7', color='#15803d')
        c.node('adv_debias', 'Adversarial Debiasing\n(adversarial network)', fillcolor='#dcfce7', color='#15803d')
    with g.subgraph(name='cluster_post') as c:
        c.attr(label='Post-Processing', style='filled,rounded', fillcolor='#fdf4ff', color='#a855f7')
        c.node('threshold', 'Threshold Adjustment\n(per-group thresholds)', fillcolor='#f3e8ff', color='#7c3aed')
        c.node('eq_odds', 'Equalized Odds\n(ROC calibration)', fillcolor='#f3e8ff', color='#7c3aed')
        c.node('calib', 'Calibration\n(Platt scaling)', fillcolor='#f3e8ff', color='#7c3aed')
    g.node('data', 'Biased\nDataset', shape='cylinder', fillcolor='#fee2e2', color='#dc2626')
    g.node('model', 'Fair\nModel', shape='box', style='filled,rounded', fillcolor='#dcfce7', color='#15803d')
    g.edges([('data', 'resample'), ('data', 'reweight'), ('data', 'transform')])
    g.edges([('resample', 'fair_constr'), ('reweight', 'adv_debias'), ('transform', 'threshold')])
    g.edges([('fair_constr', 'model'), ('adv_debias', 'model')])
    g.edges([('threshold', 'model'), ('eq_odds', 'model'), ('calib', 'model')])
    save(g, 'bias-mitigation')


def gen_cicd_automation():
    g = G('cicd_automation', 'MLOps CI/CD Automation Pipeline')
    stages = [
        ('commit', 'Code Commit\nGit / GitHub', '#dbeafe', '#1d4ed8'),
        ('unit', 'Unit Tests\npytest / tox', '#dbeafe', '#1d4ed8'),
        ('train_ci', 'Model Training CI\nSageMaker / AML', '#fef3c7', '#b45309'),
        ('validate', 'Model Validation\nAccuracy > threshold', '#fef3c7', '#b45309'),
        ('registry', 'Model Registry\nMLflow / AML Registry', '#f3e8ff', '#7c3aed'),
        ('deploy_cd', 'Deployment CD\nKubernetes / ECS', '#dcfce7', '#15803d'),
        ('monitor', 'Production Monitor\nDatadog / CloudWatch', '#ecfdf5', '#059669'),
    ]
    for nid, label, fill, color in stages:
        g.node(nid, label, shape='box', style='filled,rounded', fillcolor=fill, color=color)
    for i in range(len(stages) - 1):
        g.edge(stages[i][0], stages[i + 1][0])
    save(g, 'cicd-automation')


def gen_data_lineage_pipeline():
    g = G('data_lineage', 'Data Lineage Pipeline')
    with g.subgraph(name='cluster_sources') as c:
        c.attr(label='Raw Sources', style='filled,rounded', fillcolor='#f8fafc', color='#94a3b8')
        c.node('db_src', 'Database\n(PostgreSQL)', fillcolor='#dbeafe', color='#1d4ed8', shape='cylinder')
        c.node('logs_src', 'App Logs\n(S3 / GCS)', fillcolor='#dbeafe', color='#1d4ed8', shape='cylinder')
        c.node('events_src', 'Event Stream\n(Kafka)', fillcolor='#dbeafe', color='#1d4ed8', shape='cylinder')
    g.node('ingest', 'Ingestion\n(Spark / Beam)', shape='box', style='filled,rounded', fillcolor='#fef3c7', color='#b45309')
    g.node('feature_eng', 'Feature\nEngineering', shape='box', style='filled,rounded', fillcolor='#fef3c7', color='#b45309')
    g.node('feat_store', 'Feature Store\n(Feast / Tecton)', shape='box', style='filled,rounded', fillcolor='#f3e8ff', color='#7c3aed')
    g.node('train_ds', 'Training\nDataset', shape='box', style='filled,rounded', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('training', 'Model\nTraining', shape='box', style='filled,rounded', fillcolor='#dcfce7', color='#15803d')
    g.node('reg', 'Model\nRegistry', shape='box', style='filled,rounded', fillcolor='#dcfce7', color='#15803d')
    g.node('serving', 'Serving\n(KServe)', shape='box', style='filled,rounded', fillcolor='#ecfdf5', color='#059669')
    g.edges([('db_src', 'ingest'), ('logs_src', 'ingest'), ('events_src', 'ingest')])
    g.edges([('ingest', 'feature_eng'), ('feature_eng', 'feat_store'), ('feat_store', 'train_ds')])
    g.edges([('train_ds', 'training'), ('training', 'reg'), ('reg', 'serving')])
    save(g, 'data-lineage-pipeline')


def gen_deployment_traffic_patterns():
    g = G('deployment_traffic', 'Deployment Traffic Patterns', rankdir='LR', nodesep='0.8', ranksep='1.1')
    with g.subgraph(name='cluster_bg') as c:
        c.attr(label='Blue / Green', style='filled,rounded', fillcolor='#eff6ff', color='#3b82f6')
        c.node('bg_blue', 'Blue Env\n(v1 — 100%)', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('bg_green', 'Green Env\n(v2 — 0% → 100%)', fillcolor='#dcfce7', color='#15803d')
        c.edge('bg_blue', 'bg_green', label='switch')
    with g.subgraph(name='cluster_canary') as c:
        c.attr(label='Canary', style='filled,rounded', fillcolor='#fff7ed', color='#f97316')
        c.node('cn_prod', 'Prod\n(95% traffic)', fillcolor='#fed7aa', color='#ea580c')
        c.node('cn_canary', 'Canary\n(5% traffic)', fillcolor='#fef9c3', color='#ca8a04')
        c.edge('cn_prod', 'cn_canary', label='5%')
    with g.subgraph(name='cluster_shadow') as c:
        c.attr(label='Shadow Mode', style='filled,rounded', fillcolor='#f5f3ff', color='#8b5cf6')
        c.node('sh_live', 'Live Model\n(serves users)', fillcolor='#ddd6fe', color='#7c3aed')
        c.node('sh_shadow', 'Shadow Model\n(logs only)', fillcolor='#f3e8ff', color='#7c3aed')
        c.edge('sh_live', 'sh_shadow', label='mirror', style='dashed')
    save(g, 'deployment-traffic-patterns')


def gen_devops_to_mlops():
    g = G('devops_to_mlops', 'DevOps to MLOps Evolution')
    with g.subgraph(name='cluster_devops') as c:
        c.attr(label='DevOps', style='filled,rounded', fillcolor='#f8fafc', color='#64748b')
        c.node('code', 'Code\nRepository', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('build', 'Build\n& Test', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('deploy_app', 'Deploy\nApp', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('monitor_app', 'Monitor\nApp', fillcolor='#dbeafe', color='#1d4ed8')
        c.edges([('code', 'build'), ('build', 'deploy_app'), ('deploy_app', 'monitor_app')])
    with g.subgraph(name='cluster_devops_ml') as c:
        c.attr(label='DevOps + ML', style='filled,rounded', fillcolor='#fefce8', color='#ca8a04')
        c.node('data', 'Data\nVersioning', fillcolor='#fef3c7', color='#b45309')
        c.node('train_job', 'Training\nJob', fillcolor='#fef3c7', color='#b45309')
        c.node('model_deploy', 'Model\nDeploy', fillcolor='#fef3c7', color='#b45309')
        c.edges([('data', 'train_job'), ('train_job', 'model_deploy')])
    with g.subgraph(name='cluster_mlops') as c:
        c.attr(label='Full MLOps', style='filled,rounded', fillcolor='#f0fdf4', color='#22c55e')
        c.node('feat_store2', 'Feature\nStore', fillcolor='#dcfce7', color='#15803d')
        c.node('registry2', 'Model\nRegistry', fillcolor='#dcfce7', color='#15803d')
        c.node('drift', 'Drift\nDetection', fillcolor='#dcfce7', color='#15803d')
        c.node('retrain', 'Auto\nRetraining', fillcolor='#dcfce7', color='#15803d')
        c.edges([('feat_store2', 'registry2'), ('registry2', 'drift'), ('drift', 'retrain')])
    g.edge('monitor_app', 'data', style='dashed', label='evolve')
    g.edge('model_deploy', 'feat_store2', style='dashed', label='evolve')
    save(g, 'devops-to-mlops')


def gen_experiment_tracking():
    g = G('experiment_tracking', 'Experiment Tracking Architecture', rankdir='TB')
    g.node('mlflow', 'MLflow Tracking Server', shape='box', style='filled,rounded',
           fillcolor='#fef3c7', color='#b45309', width='3', fontsize='13')
    g.node('job1', 'Training Job 1\n(GPU run)', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('job2', 'Training Job 2\n(CPU run)', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('job3', 'Training Job 3\n(Distributed)', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('hp_tuner', 'Hyperparameter\nTuner (Optuna)', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('model_reg', 'Model Registry', fillcolor='#dcfce7', color='#15803d')
    g.node('artifact', 'Artifact Store\n(S3 / GCS)', shape='cylinder', fillcolor='#f3e8ff', color='#7c3aed')
    g.node('exp_db', 'Experiment DB\n(SQLite / Postgres)', shape='cylinder', fillcolor='#f3e8ff', color='#7c3aed')
    g.edges([('job1', 'mlflow'), ('job2', 'mlflow'), ('job3', 'mlflow'), ('hp_tuner', 'mlflow')])
    g.edges([('mlflow', 'model_reg'), ('mlflow', 'artifact'), ('mlflow', 'exp_db')])
    save(g, 'experiment-tracking')


def gen_experiment_tracking_arch():
    g = G('exp_tracking_arch', 'Experiment Tracking System Components')
    g.node('client', 'Tracking Client\n(mlflow.log_metric)', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('server', 'Tracking Server\n(REST API)', fillcolor='#fef3c7', color='#b45309', width='2.5')
    g.node('artifact', 'Artifact Store\n(S3 / GCS / ADLS)', shape='cylinder', fillcolor='#f3e8ff', color='#7c3aed')
    g.node('meta_db', 'Metadata DB\n(PostgreSQL)', shape='cylinder', fillcolor='#f3e8ff', color='#7c3aed')
    g.node('model_reg', 'Model Registry\n(Staging → Production)', fillcolor='#dcfce7', color='#15803d')
    g.edge('client', 'server', label='HTTP log')
    g.edge('server', 'artifact', label='store artifacts')
    g.edge('server', 'meta_db', label='store metadata')
    g.edge('server', 'model_reg', label='register model')
    save(g, 'experiment-tracking-arch')


def gen_governance():
    g = G('ml_governance', 'ML Governance Framework', rankdir='TB')
    g.node('hub', 'ML Governance\nFramework', shape='box', style='filled,rounded',
           fillcolor='#1d4ed8', fontcolor='white', color='#1e40af', width='3', fontsize='14')
    spokes = [
        ('model_card', 'Model Card\n(capabilities, limits)', '#dbeafe', '#1d4ed8'),
        ('data_cat', 'Data Catalog\n(lineage, schema)', '#dcfce7', '#15803d'),
        ('audit_logs', 'Audit Logs\n(predictions, changes)', '#fef3c7', '#b45309'),
        ('access', 'Access Control\n(RBAC, ABAC)', '#fee2e2', '#dc2626'),
        ('compliance', 'Compliance Reports\n(SOC2, GDPR)', '#f3e8ff', '#7c3aed'),
        ('risk', 'Risk Assessment\n(bias, drift, fairness)', '#ecfdf5', '#059669'),
    ]
    for nid, label, fill, color in spokes:
        g.node(nid, label, shape='box', style='filled,rounded', fillcolor=fill, color=color)
        g.edge('hub', nid)
    save(g, 'governance')


def gen_hyperparameter_tuning():
    g = G('hp_tuning', 'Hyperparameter Tuning Overview')
    g.node('search_space', 'Define Search Space\n(LR, depth, layers, dropout)', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('scheduler', 'Trial Scheduler\n(Successive Halving / ASHA)', fillcolor='#fef3c7', color='#b45309')
    with g.subgraph(name='cluster_methods') as c:
        c.attr(label='Search Methods', style='filled,rounded', fillcolor='#f8fafc', color='#64748b')
        c.node('bayesian', 'Bayesian\nOptimization', fillcolor='#dcfce7', color='#15803d')
        c.node('grid', 'Grid\nSearch', fillcolor='#dcfce7', color='#15803d')
        c.node('random', 'Random\nSearch', fillcolor='#dcfce7', color='#15803d')
        c.node('hyperband', 'HyperBand\n(early stopping)', fillcolor='#dcfce7', color='#15803d')
    g.node('best', 'Best Trial\n(top config)', fillcolor='#f3e8ff', color='#7c3aed')
    g.node('final_train', 'Final Model\nTraining', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('eval', 'Evaluation\n(test set)', fillcolor='#ecfdf5', color='#059669')
    g.edge('search_space', 'scheduler')
    g.edges([('scheduler', 'bayesian'), ('scheduler', 'grid'), ('scheduler', 'random'), ('scheduler', 'hyperband')])
    g.edges([('bayesian', 'best'), ('grid', 'best'), ('random', 'best'), ('hyperband', 'best')])
    g.edges([('best', 'final_train'), ('final_train', 'eval')])
    save(g, 'hyperparameter-tuning')


def gen_hyperparameter_tuning_bayesian():
    g = G('hp_bayesian', 'Bayesian Hyperparameter Optimization')
    g.node('prior', 'Prior Distribution\n(initial beliefs over params)', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('acq', 'Acquisition Function\n(EI / UCB / PI)\n[Optuna / Ray Tune]', fillcolor='#fef3c7', color='#b45309', width='2.5')
    g.node('trial', 'Trial Evaluation\n(train + validate)', fillcolor='#dcfce7', color='#15803d')
    g.node('surrogate', 'Update Surrogate Model\n(Gaussian Process / TPE)', fillcolor='#f3e8ff', color='#7c3aed', width='2.5')
    g.node('best_hp', 'Best Hyperparameters\n(converged)', fillcolor='#ecfdf5', color='#059669')
    g.edge('prior', 'acq')
    g.edge('acq', 'trial', label='next candidate')
    g.edge('trial', 'surrogate', label='result')
    g.edge('surrogate', 'acq', label='improved estimate')
    g.edge('surrogate', 'best_hp', label='converged', style='dashed')
    save(g, 'hyperparameter-tuning-bayesian')


def gen_ml_attack_taxonomy():
    g = G('ml_attacks', 'ML Attack Taxonomy', rankdir='TB')
    g.node('root', 'ML System Attacks', shape='box', style='filled,rounded',
           fillcolor='#dc2626', fontcolor='white', color='#991b1b', width='3', fontsize='14')
    attacks = [
        ('evasion', 'Evasion Attacks\nAdversarial examples\nFGSM, PGD, C&W', '#fee2e2', '#dc2626'),
        ('poison', 'Poisoning Attacks\nTraining data corruption\nBackdoor triggers', '#fee2e2', '#dc2626'),
        ('inversion', 'Model Inversion\nPrivacy leakage\nReconstructing training data', '#fef3c7', '#b45309'),
        ('membership', 'Membership Inference\nDetect training membership\nShadow model attack', '#fef3c7', '#b45309'),
        ('extraction', 'Model Extraction\nSteal model params\nQuery-based cloning', '#f3e8ff', '#7c3aed'),
    ]
    for nid, label, fill, color in attacks:
        g.node(nid, label, shape='box', style='filled,rounded', fillcolor=fill, color=color)
        g.edge('root', nid)
    save(g, 'ml-attack-taxonomy')


def gen_ml_infrastructure_stack():
    g = G('ml_infra', 'ML Infrastructure Stack', rankdir='TB')
    layers = [
        ('compute', 'Compute\nGPU Clusters (A100/H100) · TPUs · Spot Instances', '#fee2e2', '#dc2626'),
        ('storage', 'Storage\nFeature Store (Feast) · Artifact Store (S3) · Data Lake (Delta)', '#fef3c7', '#b45309'),
        ('orch', 'Orchestration\nKubeflow Pipelines · Apache Airflow · Prefect', '#dbeafe', '#1d4ed8'),
        ('serving', 'Model Serving\nKServe · BentoML · Triton Inference Server', '#dcfce7', '#15803d'),
        ('monitor', 'Monitoring\nEvidently AI · WhyLogs · Grafana · Prometheus', '#f3e8ff', '#7c3aed'),
    ]
    prev = None
    for nid, label, fill, color in layers:
        g.node(nid, label, shape='box', style='filled,rounded', fillcolor=fill, color=color,
               width='7', height='0.7')
        if prev:
            g.edge(prev, nid, label='builds on')
        prev = nid
    save(g, 'ml-infrastructure-stack')


def gen_ml_monitoring_alerting():
    g = G('ml_monitoring', 'ML Monitoring and Alerting Pipeline')
    g.node('prod_model', 'Production\nModel', fillcolor='#dcfce7', color='#15803d', shape='box', style='filled,rounded')
    g.node('pred_logger', 'Prediction\nLogger', fillcolor='#dbeafe', color='#1d4ed8')
    with g.subgraph(name='cluster_detect') as c:
        c.attr(label='Detectors', style='filled,rounded', fillcolor='#fff7ed', color='#f97316')
        c.node('data_drift', 'Data Drift\nDetector (KS test)', fillcolor='#fed7aa', color='#ea580c')
        c.node('concept_drift', 'Concept Drift\nDetector (PSI)', fillcolor='#fed7aa', color='#ea580c')
        c.node('perf_monitor', 'Performance\nMonitor (F1/AUC)', fillcolor='#fed7aa', color='#ea580c')
    g.node('alert_mgr', 'Alert\nManager', fillcolor='#fee2e2', color='#dc2626', shape='box', style='filled,rounded')
    g.node('slack', 'Slack /\nPagerDuty', fillcolor='#f3e8ff', color='#7c3aed')
    g.node('retrain_trig', 'Retraining\nTrigger', fillcolor='#dcfce7', color='#15803d')
    g.edge('prod_model', 'pred_logger')
    g.edges([('pred_logger', 'data_drift'), ('pred_logger', 'concept_drift'), ('pred_logger', 'perf_monitor')])
    g.edges([('data_drift', 'alert_mgr'), ('concept_drift', 'alert_mgr'), ('perf_monitor', 'alert_mgr')])
    g.edges([('alert_mgr', 'slack'), ('alert_mgr', 'retrain_trig')])
    save(g, 'ml-monitoring-alerting')


def gen_ml_pipeline_orchestration():
    g = G('ml_pipeline_orch', 'ML Pipeline Orchestration')
    stages = [
        ('ingest', 'Data\nIngestion', '#dbeafe', '#1d4ed8'),
        ('validate', 'Data\nValidation', '#dbeafe', '#1d4ed8'),
        ('feat_eng', 'Feature\nEngineering', '#fef3c7', '#b45309'),
        ('train', 'Model\nTraining', '#dcfce7', '#15803d'),
    ]
    for nid, label, fill, color in stages:
        g.node(nid, label, shape='box', style='filled,rounded', fillcolor=fill, color=color)
    for i in range(len(stages) - 1):
        g.edge(stages[i][0], stages[i+1][0])
    with g.subgraph(name='cluster_gate') as c:
        c.attr(label='Evaluation Gate', style='filled,rounded', fillcolor='#fdf4ff', color='#a855f7')
        c.node('eval_gate', 'Model Evaluation\n(metrics check)', fillcolor='#f3e8ff', color='#7c3aed')
        c.node('pass_gate', 'Pass?\n(Acc > threshold)', fillcolor='#f3e8ff', color='#7c3aed', shape='diamond')
        c.edge('eval_gate', 'pass_gate')
    g.node('reg', 'Model\nRegistry', fillcolor='#dcfce7', color='#15803d')
    g.node('deploy_out', 'Deployment\n(KServe / ECS)', fillcolor='#ecfdf5', color='#059669')
    g.edge('train', 'eval_gate')
    g.edge('pass_gate', 'reg', label='yes')
    g.edge('pass_gate', 'train', label='no', style='dashed')
    g.edge('reg', 'deploy_out')
    save(g, 'ml-pipeline-orchestration')


def gen_ml_supply_chain_security():
    g = G('ml_supply_chain', 'ML Supply Chain Security', rankdir='LR', nodesep='0.7', ranksep='1.0')
    g.node('sources', 'Data Sources\n(DB, APIs, S3)', shape='cylinder', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('data_val', 'Data Validation\n(Great Expectations)', fillcolor='#fef3c7', color='#b45309')
    g.node('prov', 'Provenance\nTracking (DVC)', fillcolor='#fef3c7', color='#b45309')
    g.node('training', 'Model Training\n(containerized)', fillcolor='#dcfce7', color='#15803d')
    g.node('signing', 'Model Signing\n(cosign / Notary)', fillcolor='#fee2e2', color='#dc2626')
    g.node('sbom', 'SBOM Generation\n(dependencies list)', fillcolor='#fee2e2', color='#dc2626')
    g.node('registry', 'Model Registry\n(versioned)', fillcolor='#f3e8ff', color='#7c3aed')
    g.node('vuln_scan', 'Vulnerability\nScanner (Trivy)', fillcolor='#fee2e2', color='#dc2626')
    g.node('access_ctrl', 'Access Control\n(RBAC / OPA)', fillcolor='#fee2e2', color='#dc2626')
    g.node('deploy_sc', 'Deployment', fillcolor='#ecfdf5', color='#059669')
    g.node('runtime_mon', 'Runtime Monitor\n(Falco)', fillcolor='#ecfdf5', color='#059669')
    g.node('audit_logs2', 'Audit Logs\n(immutable)', fillcolor='#ecfdf5', color='#059669')
    g.edge('sources', 'data_val')
    g.edge('sources', 'prov')
    g.edges([('data_val', 'training'), ('prov', 'training')])
    g.edges([('training', 'signing'), ('training', 'sbom')])
    g.edges([('signing', 'registry'), ('sbom', 'registry')])
    g.edges([('registry', 'vuln_scan'), ('registry', 'access_ctrl')])
    g.edges([('vuln_scan', 'deploy_sc'), ('access_ctrl', 'deploy_sc')])
    g.edges([('deploy_sc', 'runtime_mon'), ('deploy_sc', 'audit_logs2')])
    save(g, 'ml-supply-chain-security')


def gen_ml_testing_pyramid():
    g = G('ml_test_pyramid', 'ML Testing Pyramid', rankdir='TB')
    with g.subgraph(name='cluster_e2e') as c:
        c.attr(label='E2E Model Tests (few, expensive)', style='filled,rounded',
               fillcolor='#fee2e2', color='#dc2626')
        c.node('e2e_test', 'End-to-End Pipeline Test\nFull train → eval → serve\nFew runs, slow (hours)', fillcolor='#fca5a5', color='#dc2626', width='4')
    with g.subgraph(name='cluster_int') as c:
        c.attr(label='Integration Tests (medium)', style='filled,rounded',
               fillcolor='#fef3c7', color='#b45309')
        c.node('int_test', 'Pipeline Component Tests\nData → Feature → Train steps\nSchema validation, output shapes', fillcolor='#fde68a', color='#b45309', width='5')
    with g.subgraph(name='cluster_unit') as c:
        c.attr(label='Unit Tests (many, fast)', style='filled,rounded',
               fillcolor='#dcfce7', color='#15803d')
        c.node('unit_test', 'Unit Tests: transforms, metrics, preprocessing\nFast (seconds), high coverage, pytest', fillcolor='#bbf7d0', color='#15803d', width='6')
    g.edge('unit_test', 'int_test', label='feeds into')
    g.edge('int_test', 'e2e_test', label='feeds into')
    save(g, 'ml-testing-pyramid')


def gen_mlops_aws():
    g = G('mlops_aws', 'MLOps on AWS — SageMaker Reference Architecture')
    g.node('sm_studio', 'SageMaker\nStudio\n(IDE)', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('sm_pipelines', 'SageMaker\nPipelines\n(orchestration)', fillcolor='#fef3c7', color='#b45309')
    with g.subgraph(name='cluster_store') as c:
        c.attr(label='Data Layer', style='filled,rounded', fillcolor='#f8fafc', color='#94a3b8')
        c.node('s3', 'S3\n(data lake)', shape='cylinder', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('feat_store_aws', 'SageMaker\nFeature Store', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('train_jobs', 'Training Jobs\n(spot instances)', fillcolor='#dcfce7', color='#15803d')
    g.node('sm_registry', 'SageMaker\nModel Registry', fillcolor='#dcfce7', color='#15803d')
    g.node('endpoint', 'Endpoint Deploy\n(real-time / batch)', fillcolor='#f3e8ff', color='#7c3aed')
    g.node('cloudwatch', 'CloudWatch\nMonitor', fillcolor='#ecfdf5', color='#059669')
    g.edge('sm_studio', 'sm_pipelines')
    g.edges([('sm_pipelines', 's3'), ('sm_pipelines', 'feat_store_aws')])
    g.edges([('s3', 'train_jobs'), ('feat_store_aws', 'train_jobs')])
    g.edges([('train_jobs', 'sm_registry'), ('sm_registry', 'endpoint'), ('endpoint', 'cloudwatch')])
    save(g, 'mlops-real-world-cases-aws')


def gen_mlops_azure():
    g = G('mlops_azure', 'MLOps on Azure — Azure ML Reference Architecture')
    g.node('aml_studio', 'Azure ML\nStudio\n(IDE)', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('aml_pipelines', 'Azure ML\nPipelines\n(orchestration)', fillcolor='#fef3c7', color='#b45309')
    with g.subgraph(name='cluster_store_az') as c:
        c.attr(label='Data Layer', style='filled,rounded', fillcolor='#f8fafc', color='#94a3b8')
        c.node('adls', 'ADLS Gen2\n(data lake)', shape='cylinder', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('feat_store_az', 'Azure ML\nFeature Store', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('compute_az', 'Compute Clusters\n(NC / ND VMs)', fillcolor='#dcfce7', color='#15803d')
    g.node('aml_registry', 'Azure ML\nModel Registry', fillcolor='#dcfce7', color='#15803d')
    g.node('aks_deploy', 'AKS Deploy\n(inference)', fillcolor='#f3e8ff', color='#7c3aed')
    g.node('az_monitor', 'Azure Monitor\n+ App Insights', fillcolor='#ecfdf5', color='#059669')
    g.edge('aml_studio', 'aml_pipelines')
    g.edges([('aml_pipelines', 'adls'), ('aml_pipelines', 'feat_store_az')])
    g.edges([('adls', 'compute_az'), ('feat_store_az', 'compute_az')])
    g.edges([('compute_az', 'aml_registry'), ('aml_registry', 'aks_deploy'), ('aks_deploy', 'az_monitor')])
    save(g, 'mlops-real-world-cases-azure')


def gen_model_packaging_formats():
    g = G('model_packaging', 'Model Packaging Formats', rankdir='TB')
    g.node('trained', 'Trained Model\n(weights + architecture)', shape='box', style='filled,rounded',
           fillcolor='#dbeafe', color='#1d4ed8', width='3.5')
    formats = [
        ('onnx', 'ONNX\nCross-platform\nOpenCV, TensorRT, ONNX Runtime', '#dcfce7', '#15803d'),
        ('savedmodel', 'TensorFlow SavedModel\nTF Serving\nTFLite mobile', '#fef3c7', '#b45309'),
        ('torchscript', 'TorchScript\nPyTorch mobile\nC++ inference', '#fee2e2', '#dc2626'),
        ('pmml', 'PMML / MLeap\nClassic ML (sklearn)\nXML interchange', '#f3e8ff', '#7c3aed'),
        ('bento', 'BentoML Archive\nServing + versioning\nDocker-ready', '#ecfdf5', '#059669'),
    ]
    for nid, label, fill, color in formats:
        g.node(nid, label, shape='box', style='filled,rounded', fillcolor=fill, color=color)
        g.edge('trained', nid)
    save(g, 'model-packaging-formats')


def gen_online_vs_batch_learning():
    g = G('online_vs_batch', 'Online vs Batch Learning')
    with g.subgraph(name='cluster_batch') as c:
        c.attr(label='Batch Learning (periodic)', style='filled,rounded', fillcolor='#eff6ff', color='#3b82f6')
        c.node('b_collect', 'Collect Data\n(periodic snapshot)', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('b_train', 'Full Retrain\n(GPU cluster)', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('b_deploy', 'Deploy New\nModel Version', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('b_serve', 'Serve (static\nuntil next batch)', fillcolor='#dbeafe', color='#1d4ed8')
        c.edges([('b_collect', 'b_train'), ('b_train', 'b_deploy'), ('b_deploy', 'b_serve')])
        c.edge('b_serve', 'b_collect', label='next cycle', style='dashed')
    with g.subgraph(name='cluster_online') as c:
        c.attr(label='Online Learning (continuous)', style='filled,rounded', fillcolor='#f0fdf4', color='#22c55e')
        c.node('o_arrive', 'New Data\nArrives', fillcolor='#dcfce7', color='#15803d')
        c.node('o_update', 'Incremental\nUpdate (SGD)', fillcolor='#dcfce7', color='#15803d')
        c.node('o_serve', 'Serve (continuously\nupdated model)', fillcolor='#dcfce7', color='#15803d')
        c.edges([('o_arrive', 'o_update'), ('o_update', 'o_serve')])
        c.edge('o_serve', 'o_arrive', label='feedback loop', style='dashed')
    save(g, 'online-vs-batch-learning')


def gen_pipeline_tools_comparison():
    g = G('pipeline_tools', 'ML Pipeline Tools Comparison', rankdir='TB')
    tools = [
        ('kubeflow', 'Kubeflow Pipelines\nKubernetes-native · DSL-based\nScalable · MLMD tracking\nBest for: large-scale K8s teams', '#dbeafe', '#1d4ed8'),
        ('mlflow', 'MLflow Projects\nLightweight · Git-based\nDocker/Conda envs · Any cluster\nBest for: experiment reproducibility', '#fef3c7', '#b45309'),
        ('zenml', 'ZenML\nStack-agnostic · Python-first\nArtifact versioning · Integrations\nBest for: MLOps standardization', '#dcfce7', '#15803d'),
        ('airflow', 'Apache Airflow\nDAG-based · Mature ecosystem\nBatch-oriented · Strong scheduling\nBest for: data pipelines + ML', '#f3e8ff', '#7c3aed'),
    ]
    for nid, label, fill, color in tools:
        g.node(nid, label, shape='box', style='filled,rounded', fillcolor=fill, color=color, width='4')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('kubeflow')
        s.node('mlflow')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('zenml')
        s.node('airflow')
    save(g, 'pipeline-tools-comparison')


def gen_reproducible_ml_pipelines():
    g = G('reproducible_ml', 'Reproducible ML Pipelines')
    with g.subgraph(name='cluster_source') as c:
        c.attr(label='Version Control', style='filled,rounded', fillcolor='#f8fafc', color='#64748b')
        c.node('git', 'Git\n(code versioning)', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('dvc', 'DVC\n(data versioning)', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('mlflow_exp', 'MLflow\n(experiments)', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('pipeline_def', 'Pipeline Definition\n(YAML / Python DSL)', fillcolor='#fef3c7', color='#b45309')
    g.node('container', 'Containerized Training\n(Docker + pinned deps)', fillcolor='#dcfce7', color='#15803d')
    g.node('reg_repr', 'Model Registry\n(versioned artifact)', fillcolor='#dcfce7', color='#15803d')
    g.node('deploy_repr', 'Deployment\n(immutable image)', fillcolor='#f3e8ff', color='#7c3aed')
    with g.subgraph(name='cluster_verify') as c:
        c.attr(label='Provenance', style='filled,rounded', fillcolor='#ecfdf5', color='#059669')
        c.node('hash_v', 'Hash Verification\n(SHA-256 checksums)', fillcolor='#d1fae5', color='#059669')
        c.node('prov_rec', 'Provenance Record\n(lineage graph)', fillcolor='#d1fae5', color='#059669')
    g.edges([('git', 'pipeline_def'), ('dvc', 'pipeline_def'), ('mlflow_exp', 'pipeline_def')])
    g.edges([('pipeline_def', 'container'), ('container', 'reg_repr'), ('reg_repr', 'deploy_repr')])
    g.edges([('deploy_repr', 'hash_v'), ('deploy_repr', 'prov_rec')])
    save(g, 'reproducible-ml-pipelines')


def gen_responsible_ai_fairness():
    g = G('resp_ai_fairness', 'Responsible AI Fairness Pipeline', rankdir='TB')
    g.node('preds', 'Model Predictions\n(scored outputs)', fillcolor='#dbeafe', color='#1d4ed8', shape='box', style='filled,rounded', width='3')
    with g.subgraph(name='cluster_checks') as c:
        c.attr(label='Fairness Checks', style='filled,rounded', fillcolor='#fff7ed', color='#f97316')
        c.node('dp_check', 'Demographic Parity\n(equal positive rates)', fillcolor='#fed7aa', color='#ea580c')
        c.node('eo_check', 'Equalized Odds\n(equal TPR/FPR)', fillcolor='#fed7aa', color='#ea580c')
        c.node('cal_check', 'Calibration Check\n(score reliability)', fillcolor='#fed7aa', color='#ea580c')
    g.node('report', 'Fairness Report\n(disaggregated metrics)', fillcolor='#f3e8ff', color='#7c3aed')
    g.node('mitigation', 'Bias Mitigation\n(if threshold breached)', fillcolor='#fee2e2', color='#dc2626')
    g.node('fair_model', 'Fair Model\n(approved for deploy)', fillcolor='#dcfce7', color='#15803d')
    g.edges([('preds', 'dp_check'), ('preds', 'eo_check'), ('preds', 'cal_check')])
    g.edges([('dp_check', 'report'), ('eo_check', 'report'), ('cal_check', 'report')])
    g.edge('report', 'mitigation', label='bias detected')
    g.edge('mitigation', 'fair_model')
    g.edge('report', 'fair_model', label='pass', style='dashed')
    save(g, 'responsible-ai-fairness')


def gen_responsible_ai_shap():
    g = G('resp_ai_shap', 'SHAP Explainability Pipeline')
    with g.subgraph(name='cluster_inputs') as c:
        c.attr(label='Inputs', style='filled,rounded', fillcolor='#f8fafc', color='#94a3b8')
        c.node('model_shap', 'Trained Model\n(any framework)', fillcolor='#dcfce7', color='#15803d')
        c.node('input_data', 'Input Data\n(features)', shape='cylinder', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('shap_exp', 'SHAP Explainer\n(TreeSHAP / KernelSHAP\n/ DeepSHAP)', fillcolor='#fef3c7', color='#b45309', width='2.5')
    with g.subgraph(name='cluster_global') as c:
        c.attr(label='Global Explanations', style='filled,rounded', fillcolor='#eff6ff', color='#3b82f6')
        c.node('feat_imp', 'Feature Importance\n(mean |SHAP|)', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('summary_plot', 'Summary Plot\n(beeswarm)', fillcolor='#dbeafe', color='#1d4ed8')
    with g.subgraph(name='cluster_local') as c:
        c.attr(label='Local Explanations', style='filled,rounded', fillcolor='#f0fdf4', color='#22c55e')
        c.node('force_plot', 'Force Plot\n(single prediction)', fillcolor='#dcfce7', color='#15803d')
        c.node('waterfall', 'Waterfall Chart\n(contribution per feature)', fillcolor='#dcfce7', color='#15803d')
    g.edges([('model_shap', 'shap_exp'), ('input_data', 'shap_exp')])
    g.edges([('shap_exp', 'feat_imp'), ('shap_exp', 'summary_plot')])
    g.edges([('shap_exp', 'force_plot'), ('shap_exp', 'waterfall')])
    save(g, 'responsible-ai-shap')


def gen_retraining_triggers():
    g = G('retraining_triggers', 'Model Retraining Triggers', rankdir='TB')
    triggers = [
        ('drift_t', 'Data Drift\n(KS test > threshold)', '#fef3c7', '#b45309'),
        ('perf_t', 'Performance Drop\n(F1 below baseline)', '#fee2e2', '#dc2626'),
        ('sched_t', 'Scheduled\n(weekly / monthly)', '#dbeafe', '#1d4ed8'),
        ('newdata_t', 'New Data\nAvailable', '#dcfce7', '#15803d'),
        ('manual_t', 'Manual Override\n(engineer triggered)', '#f3e8ff', '#7c3aed'),
    ]
    for nid, label, fill, color in triggers:
        g.node(nid, label, shape='box', style='filled,rounded', fillcolor=fill, color=color)
    g.node('decision', 'Retraining\nDecision', shape='diamond', style='filled',
           fillcolor='#1d4ed8', fontcolor='white', color='#1e40af', width='2.5')
    g.node('train_pipe', 'Training\nPipeline', shape='box', style='filled,rounded',
           fillcolor='#ecfdf5', color='#059669', width='2.5')
    g.node('new_model', 'New Model\n(evaluated + staged)', shape='box', style='filled,rounded',
           fillcolor='#dcfce7', color='#15803d')
    for nid, _, _, _ in triggers:
        g.edge(nid, 'decision')
    g.edge('decision', 'train_pipe', label='trigger')
    g.edge('train_pipe', 'new_model')
    save(g, 'retraining-triggers')


def gen_serving_latency_optimization():
    g = G('serving_latency', 'Model Serving Latency Optimization')
    g.node('client', 'Client\nRequest', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('lb', 'Load\nBalancer', fillcolor='#fef3c7', color='#b45309')
    with g.subgraph(name='cluster_cache') as c:
        c.attr(label='Cache Layer', style='filled,rounded', fillcolor='#f0fdf4', color='#22c55e')
        c.node('cache', 'Model Cache\n(Redis / memcached)\nP50: 2ms', fillcolor='#dcfce7', color='#15803d')
        c.node('cache_hit', 'Cache Hit\n→ return result', fillcolor='#dcfce7', color='#15803d')
        c.edge('cache', 'cache_hit', label='hit')
    with g.subgraph(name='cluster_infer') as c:
        c.attr(label='Inference Optimizations', style='filled,rounded', fillcolor='#fff7ed', color='#f97316')
        c.node('infer_server', 'Inference Server\n(Triton)', fillcolor='#fed7aa', color='#ea580c')
        c.node('batching', 'Dynamic Batching\n(GPU throughput)', fillcolor='#fed7aa', color='#ea580c')
        c.node('quant', 'Quantization\nINT8 / FP16', fillcolor='#fed7aa', color='#ea580c')
        c.node('tensorrt', 'TensorRT\n(graph fusion)', fillcolor='#fed7aa', color='#ea580c')
    g.node('response', 'Response\nP99: <50ms', fillcolor='#dcfce7', color='#15803d')
    g.edge('client', 'lb')
    g.edge('lb', 'cache')
    g.edge('lb', 'infer_server', label='miss')
    g.edge('cache_hit', 'response')
    g.edges([('infer_server', 'batching'), ('batching', 'quant'), ('quant', 'tensorrt')])
    g.edge('tensorrt', 'response')
    save(g, 'serving-latency-optimization')


def gen_deployment_strategies():
    g = G('deploy_strategies', 'MLOps Deployment Strategies', nodesep='0.8', ranksep='1.0')
    with g.subgraph(name='cluster_bluegreen') as c:
        c.attr(label='Blue / Green', style='filled,rounded', fillcolor='#eff6ff', color='#3b82f6')
        c.node('bg_v1', 'Blue (v1)\n100% traffic', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('bg_v2', 'Green (v2)\n0% → 100%', fillcolor='#dcfce7', color='#15803d')
        c.edge('bg_v1', 'bg_v2', label='instant switch')
    with g.subgraph(name='cluster_canary2') as c:
        c.attr(label='Canary Release', style='filled,rounded', fillcolor='#fff7ed', color='#f97316')
        c.node('cn_main', 'Production\n90-99% traffic', fillcolor='#fed7aa', color='#ea580c')
        c.node('cn_can', 'Canary\n1-10% traffic', fillcolor='#fef9c3', color='#ca8a04')
        c.edge('cn_main', 'cn_can', label='gradual shift')
    with g.subgraph(name='cluster_shadow2') as c:
        c.attr(label='Shadow Mode', style='filled,rounded', fillcolor='#f5f3ff', color='#8b5cf6')
        c.node('sh_prod', 'Prod Model\n(serves users)', fillcolor='#ddd6fe', color='#7c3aed')
        c.node('sh_shad', 'Shadow Model\n(logs only)', fillcolor='#f3e8ff', color='#7c3aed')
        c.edge('sh_prod', 'sh_shad', label='mirror', style='dashed')
    with g.subgraph(name='cluster_ab') as c:
        c.attr(label='A/B Testing', style='filled,rounded', fillcolor='#ecfdf5', color='#059669')
        c.node('ab_a', 'Model A\n(control)', fillcolor='#d1fae5', color='#059669')
        c.node('ab_b', 'Model B\n(treatment)', fillcolor='#d1fae5', color='#059669')
        c.node('ab_metrics', 'Metrics\nComparison', fillcolor='#d1fae5', color='#059669')
        c.edges([('ab_a', 'ab_metrics'), ('ab_b', 'ab_metrics')])
    save(g, 'deployment-strategies')


def gen_pipeline_orchestration():
    g = G('pipeline_orchestration', 'ML Pipeline Orchestration Full Stack', nodesep='0.8', ranksep='1.0')
    g.node('orchestrator', 'Orchestrator\n(Kubeflow / Airflow\n/ Prefect)', fillcolor='#fef3c7', color='#b45309',
           shape='box', style='filled,rounded', width='2.5')
    with g.subgraph(name='cluster_data_pipe') as c:
        c.attr(label='Data Pipeline', style='filled,rounded', fillcolor='#eff6ff', color='#3b82f6')
        c.node('dp_ingest', 'Ingestion\n(Spark / Beam)', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('dp_validate', 'Validation\n(Great Expectations)', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('dp_features', 'Feature Engineering\n(Feature Store)', fillcolor='#dbeafe', color='#1d4ed8')
        c.edges([('dp_ingest', 'dp_validate'), ('dp_validate', 'dp_features')])
    with g.subgraph(name='cluster_train_pipe') as c:
        c.attr(label='Training Pipeline', style='filled,rounded', fillcolor='#f0fdf4', color='#22c55e')
        c.node('tp_train', 'Model Training\n(GPU cluster)', fillcolor='#dcfce7', color='#15803d')
        c.node('tp_eval', 'Evaluation\n(metrics gate)', fillcolor='#dcfce7', color='#15803d')
        c.edge('tp_train', 'tp_eval')
    with g.subgraph(name='cluster_deploy_pipe') as c:
        c.attr(label='Deployment Pipeline', style='filled,rounded', fillcolor='#fdf4ff', color='#a855f7')
        c.node('dep_pkg', 'Package Model\n(Docker / ONNX)', fillcolor='#f3e8ff', color='#7c3aed')
        c.node('dep_serve', 'Serve\n(KServe / BentoML)', fillcolor='#f3e8ff', color='#7c3aed')
        c.edge('dep_pkg', 'dep_serve')
    g.node('model_reg2', 'Model Registry\n(versioned)', fillcolor='#dcfce7', color='#15803d')
    g.node('prod_monitor', 'Production Monitor\n(drift + perf)', fillcolor='#ecfdf5', color='#059669')
    g.edge('orchestrator', 'dp_ingest', label='trigger')
    g.edge('orchestrator', 'tp_train', label='trigger')
    g.edge('orchestrator', 'dep_pkg', label='trigger')
    g.edge('dp_features', 'tp_train', label='features')
    g.edge('tp_eval', 'model_reg2', label='register')
    g.edge('model_reg2', 'dep_pkg', label='promote')
    g.edge('dep_serve', 'prod_monitor')
    g.edge('prod_monitor', 'orchestrator', label='retrain signal', style='dashed')
    save(g, 'pipeline-orchestration')


def gen_model_evaluation_pipeline():
    g = G('model_eval_pipeline', 'Model Evaluation Pipeline: Offline to Online')
    with g.subgraph(name='cluster_offline') as c:
        c.attr(label='Offline Evaluation', style='filled,rounded', fillcolor='#eff6ff', color='#3b82f6')
        c.node('holdout', 'Holdout Set\n(test split)', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('metrics', 'Core Metrics\n(AUC / F1 / RMSE)', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('fairness', 'Fairness Slices\n(subgroup analysis)', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('threshold', 'Threshold Selection\n(precision-recall trade-off)', fillcolor='#dbeafe', color='#1d4ed8')
        c.edges([('holdout', 'metrics'), ('metrics', 'fairness'), ('fairness', 'threshold')])
    with g.subgraph(name='cluster_online') as c:
        c.attr(label='Online Evaluation', style='filled,rounded', fillcolor='#f0fdf4', color='#22c55e')
        c.node('canary_eval', 'Canary\n(1-5% traffic)', fillcolor='#dcfce7', color='#15803d')
        c.node('ab_eval', 'A/B Test\n(50/50 split)', fillcolor='#dcfce7', color='#15803d')
        c.node('champion', 'Champion /\nChallenger', fillcolor='#dcfce7', color='#15803d')
        c.node('bandit', 'Multi-Armed\nBandit (MAB)', fillcolor='#dcfce7', color='#15803d')
        c.edges([('canary_eval', 'ab_eval'), ('ab_eval', 'champion'), ('champion', 'bandit')])
    g.node('labels', 'Delayed Ground\nTruth Labels', shape='diamond', fillcolor='#fef3c7', color='#b45309')
    g.node('approved', 'Model Approved\nfor Production', fillcolor='#ecfdf5', color='#059669')
    g.edge('threshold', 'canary_eval', label='passes gate')
    g.edge('labels', 'threshold', label='ground truth')
    g.edge('labels', 'bandit', label='reward signal')
    g.edge('bandit', 'approved', label='winner')
    save(g, 'model-evaluation-pipeline')


def gen_data_versioning():
    g = G('data_versioning', 'Data Versioning Architecture')
    with g.subgraph(name='cluster_formats') as c:
        c.attr(label='Table Format Options', style='filled,rounded', fillcolor='#f0fdf4', color='#22c55e')
        c.node('delta', 'Delta Lake\nACID + Time Travel\n(Databricks)', fillcolor='#dcfce7', color='#15803d')
        c.node('iceberg', 'Apache Iceberg\nHidden Partitioning\n(Netflix)', fillcolor='#dcfce7', color='#15803d')
        c.node('lakefs', 'LakeFS\nGit Branch Semantics\n(git-like ops)', fillcolor='#dcfce7', color='#15803d')
    g.node('raw', 'Raw Data\n(files / tables)', shape='cylinder', fillcolor='#fef3c7', color='#b45309')
    g.node('dvc', 'DVC Pointer\n(.dvc file + lock)', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('remote', 'Remote Storage\n(S3 / GCS / Azure)', shape='cylinder', fillcolor='#dbeafe', color='#1d4ed8')
    g.node('feature_store', 'Feature Store\n(Feast / Tecton)', fillcolor='#f3e8ff', color='#7c3aed')
    g.node('train_ready', 'Training-Ready\nDataset (versioned)', fillcolor='#ecfdf5', color='#059669')
    g.edges([('raw', 'dvc'), ('dvc', 'remote')])
    g.edges([('raw', 'delta'), ('raw', 'iceberg'), ('raw', 'lakefs')])
    g.edges([('delta', 'feature_store'), ('iceberg', 'feature_store'), ('lakefs', 'feature_store')])
    g.edge('feature_store', 'train_ready')
    save(g, 'data-versioning')


def gen_ml_testing_infra():
    g = G('ml_testing_infra', 'ML Testing Infrastructure', rankdir='LR', nodesep='0.7', ranksep='1.0')
    with g.subgraph(name='cluster_unit') as c:
        c.attr(label='Unit Tests (fast, many)', style='filled,rounded', fillcolor='#f0fdf4', color='#22c55e')
        c.node('u1', 'Transform\nFunctions', fillcolor='#dcfce7', color='#15803d')
        c.node('u2', 'Feature\nEngineering', fillcolor='#dcfce7', color='#15803d')
        c.node('u3', 'Schema\nValidation', fillcolor='#dcfce7', color='#15803d')
    with g.subgraph(name='cluster_integration') as c:
        c.attr(label='Integration Tests', style='filled,rounded', fillcolor='#eff6ff', color='#3b82f6')
        c.node('i1', 'Pipeline\nEnd-to-End', fillcolor='#dbeafe', color='#1d4ed8')
        c.node('i2', 'Data Validation\n(Great Expectations)', fillcolor='#dbeafe', color='#1d4ed8')
    with g.subgraph(name='cluster_behavioral') as c:
        c.attr(label='Behavioral Tests', style='filled,rounded', fillcolor='#fef3c7', color='#b45309')
        c.node('b1', 'Invariance\nTests', fillcolor='#fef9c3', color='#b45309')
        c.node('b2', 'Directional\nExpectations', fillcolor='#fef9c3', color='#b45309')
    with g.subgraph(name='cluster_e2e') as c:
        c.attr(label='E2E Tests (slow, few)', style='filled,rounded', fillcolor='#fee2e2', color='#dc2626')
        c.node('e1', 'Latency SLO\nContract Tests', fillcolor='#fca5a5', color='#dc2626')
        c.node('e2', 'Full Inference\nPipeline Test', fillcolor='#fca5a5', color='#dc2626')
    g.edges([('u1', 'i1'), ('u2', 'i1'), ('u3', 'i2')])
    g.edges([('i1', 'b1'), ('i2', 'b2')])
    g.edges([('b1', 'e1'), ('b2', 'e2')])
    save(g, 'ml-testing-infra')


def gen_ml_security():
    g = G('ml_security', 'ML Security: Attacks and Defenses', nodesep='0.8', ranksep='1.1')
    g.node('system', 'ML System\nUnder Attack', shape='doublecircle', fillcolor='#1d4ed8',
           fontcolor='white', color='#1e40af', fontsize='13')
    with g.subgraph(name='cluster_attacks') as c:
        c.attr(label='Attack Vectors', style='filled,rounded', fillcolor='#fef2f2', color='#dc2626')
        c.node('adv', 'Adversarial\nExamples', fillcolor='#fee2e2', color='#dc2626')
        c.node('poison', 'Data\nPoisoning', fillcolor='#fee2e2', color='#dc2626')
        c.node('steal', 'Model\nStealing', fillcolor='#fee2e2', color='#dc2626')
        c.node('invert', 'Model\nInversion', fillcolor='#fee2e2', color='#dc2626')
        c.node('member', 'Membership\nInference', fillcolor='#fee2e2', color='#dc2626')
    with g.subgraph(name='cluster_defense') as c:
        c.attr(label='Defenses', style='filled,rounded', fillcolor='#f0fdf4', color='#15803d')
        c.node('adv_train', 'Adversarial\nTraining', fillcolor='#dcfce7', color='#15803d')
        c.node('diff_priv', 'Differential\nPrivacy (DP-SGD)', fillcolor='#dcfce7', color='#15803d')
        c.node('rate_limit', 'Rate Limiting\n+ Query Monitor', fillcolor='#dcfce7', color='#15803d')
        c.node('dp2', 'Output\nPerturbation', fillcolor='#dcfce7', color='#15803d')
        c.node('mem_guard', 'MMIAGuard\n(label smoothing)', fillcolor='#dcfce7', color='#15803d')
    g.edges([('adv', 'system'), ('poison', 'system'), ('steal', 'system'),
             ('invert', 'system'), ('member', 'system')])
    g.edge('system', 'adv_train', label='defend')
    g.edge('system', 'diff_priv', label='defend')
    g.edge('system', 'rate_limit', label='defend')
    g.edge('system', 'dp2', label='defend')
    g.edge('system', 'mem_guard', label='defend')
    save(g, 'ml-security')


if __name__ == '__main__':
    gen_azure_mlops_maturity()
    gen_bias_mitigation()
    gen_cicd_automation()
    gen_data_lineage_pipeline()
    gen_deployment_traffic_patterns()
    gen_devops_to_mlops()
    gen_experiment_tracking()
    gen_experiment_tracking_arch()
    gen_governance()
    gen_hyperparameter_tuning()
    gen_hyperparameter_tuning_bayesian()
    gen_ml_attack_taxonomy()
    gen_ml_infrastructure_stack()
    gen_ml_monitoring_alerting()
    gen_ml_pipeline_orchestration()
    gen_ml_supply_chain_security()
    gen_ml_testing_pyramid()
    gen_mlops_aws()
    gen_mlops_azure()
    gen_model_packaging_formats()
    gen_online_vs_batch_learning()
    gen_pipeline_tools_comparison()
    gen_reproducible_ml_pipelines()
    gen_responsible_ai_fairness()
    gen_responsible_ai_shap()
    gen_retraining_triggers()
    gen_serving_latency_optimization()
    gen_deployment_strategies()
    gen_pipeline_orchestration()
    gen_model_evaluation_pipeline()
    gen_data_versioning()
    gen_ml_testing_infra()
    gen_ml_security()
    print('\nAll 33 MLOps diagrams generated.')
