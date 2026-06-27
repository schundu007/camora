#!/usr/bin/env python3
"""Generate/fix all narrow MLOps Graphviz diagrams."""
import graphviz, os

C = {
    'navy':   ('#dbeafe', '#3b82f6', '#1e40af'),
    'teal':   ('#ccfbf1', '#14b8a6', '#115e59'),
    'green':  ('#dcfce7', '#22c55e', '#166534'),
    'gold':   ('#fef3c7', '#f59e0b', '#92400e'),
    'red':    ('#fee2e2', '#ef4444', '#991b1b'),
    'purple': ('#e0e7ff', '#6366f1', '#3730a3'),
    'gray':   ('#f3f4f6', '#6b7280', '#374151'),
    'cyan':   ('#cffafe', '#06b6d4', '#155e75'),
}
NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica',
            fontsize='12', penwidth='1.5', height='0.5', margin='0.18,0.10')
EDGE = dict(fontname='Helvetica', fontsize='10', penwidth='1.5')
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'mlops')
os.makedirs(OUT, exist_ok=True)

def n(g, name, label, c='navy'):
    g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)

def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '', color=color,
           fontcolor=color, style=style, **EDGE)

def base_graph(name, title, rankdir='LR'):
    g = graphviz.Digraph(name, format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.65', ranksep='0.65',
           splines='spline', rankdir=rankdir,
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica-Bold', fontcolor='#1e293b')
    return g


# ── 1. Azure MLOps Maturity Model ─────────────────────────────────────────────

def gen_azure_mlops_maturity():
    g = base_graph('azure_mlops_maturity', 'Azure MLOps Maturity Model — 5 Levels', rankdir='LR')
    n(g, 'l0', 'Level 0\nManual\nNotebooks only\nNo tracking', 'gray')
    n(g, 'l1', 'Level 1\nML Scripted\nBasic pipelines\nMLflow tracking', 'teal')
    n(g, 'l2', 'Level 2\nML Automated\nAzure ML Pipelines\nData versioning', 'navy')
    n(g, 'l3', 'Level 3\nCI/CD for ML\nAuto train + test\nModel registry', 'purple')
    n(g, 'l4', 'Level 4\nFull MLOps\nAuto retrain\nDrift detection', 'green')
    e(g, 'l0', 'l1'); e(g, 'l1', 'l2'); e(g, 'l2', 'l3'); e(g, 'l3', 'l4')
    g.render(os.path.join(OUT, 'azure-mlops-maturity'), cleanup=True)
    print('Generated: azure-mlops-maturity')


# ── 2. CI/CD Automation ───────────────────────────────────────────────────────

def gen_cicd_automation():
    g = base_graph('cicd_automation', 'MLOps CI/CD Automation Pipeline', rankdir='LR')
    n(g, 'commit',  'Code\nCommit', 'gray')
    n(g, 'test',    'Unit\nTests', 'navy')
    n(g, 'train',   'Model\nTraining', 'teal')
    n(g, 'validate','Model\nValidation', 'green')
    n(g, 'build',   'Container\nBuild', 'navy')
    n(g, 'staging', 'Staging\nDeploy', 'gold')
    n(g, 'itest',   'Integration\nTests', 'teal')
    n(g, 'prod',    'Prod\nDeploy', 'green')
    for a, b in [('commit','test'),('test','train'),('train','validate'),
                 ('validate','build'),('build','staging'),('staging','itest'),
                 ('itest','prod')]:
        e(g, a, b)
    g.render(os.path.join(OUT, 'cicd-automation'), cleanup=True)
    print('Generated: cicd-automation')


# ── 3. Data Lineage Pipeline ──────────────────────────────────────────────────

def gen_data_lineage_pipeline():
    g = base_graph('data_lineage', 'ML Data Lineage Pipeline — Source to Predictions', rankdir='LR')
    n(g, 'src',   'Raw\nSources\n(DB, Files, API)', 'gray')
    n(g, 'ingest','Ingestion\n(Kafka/Spark)', 'navy')
    n(g, 'xform', 'Transform\n(dbt/Spark)', 'teal')
    n(g, 'feat',  'Feature\nStore\n(Feast/Tecton)', 'purple')
    n(g, 'train', 'Training\nDataset', 'navy')
    n(g, 'model', 'Trained\nModel', 'green')
    n(g, 'preds', 'Predictions\n(Online/Batch)', 'gold')
    for a, b in [('src','ingest'),('ingest','xform'),('xform','feat'),
                 ('feat','train'),('train','model'),('model','preds')]:
        e(g, a, b)
    g.render(os.path.join(OUT, 'data-lineage-pipeline'), cleanup=True)
    print('Generated: data-lineage-pipeline')


# ── 4. Deployment Traffic Patterns ────────────────────────────────────────────

def gen_deployment_traffic_patterns():
    g = base_graph('deploy_traffic', 'ML Deployment Traffic Patterns', rankdir='TB')
    n(g, 'bg',     'Blue/Green\n100% traffic\nswitch\nZero downtime', 'navy')
    n(g, 'canary', 'Canary\n1→10→50→100%\nGradual rollout\nAuto rollback', 'teal')
    n(g, 'shadow', 'Shadow Mode\nMirror traffic\nCompare outputs\nNo user impact', 'purple')
    n(g, 'ab',     'A/B Test\nSplit by user\nMeasure KPIs\nStatistical test', 'gold')
    with g.subgraph() as s:
        s.attr(rank='same')
        for x in ['bg', 'canary', 'shadow', 'ab']:
            s.node(x)
    n(g, 'prod', 'Production\nTraffic\nRouter', 'green')
    e(g, 'prod', 'bg'); e(g, 'prod', 'canary')
    e(g, 'prod', 'shadow'); e(g, 'prod', 'ab')
    g.render(os.path.join(OUT, 'deployment-traffic-patterns'), cleanup=True)
    print('Generated: deployment-traffic-patterns')


# ── 5. DevOps to MLOps ────────────────────────────────────────────────────────

def gen_devops_to_mlops():
    g = base_graph('devops_to_mlops', 'DevOps → MLOps Evolution', rankdir='LR')
    n(g, 'dev',   'DevOps\nPractices\nCI/CD + IaC', 'gray')
    n(g, 'data',  'Data\nPipeline\n(ELT/ETL)', 'teal')
    n(g, 'exp',   'Experiment\nTracking\n(MLflow/W&B)', 'navy')
    n(g, 'train', 'Model\nTraining\nPipeline', 'navy')
    n(g, 'reg',   'Model\nRegistry\n(versioning)', 'purple')
    n(g, 'serve', 'Model\nServing\n(REST/gRPC)', 'green')
    n(g, 'mon',   'Monitoring\n+ Retraining\nLoop', 'gold')
    for a, b in [('dev','data'),('data','exp'),('exp','train'),
                 ('train','reg'),('reg','serve'),('serve','mon')]:
        e(g, a, b)
    g.render(os.path.join(OUT, 'devops-to-mlops'), cleanup=True)
    print('Generated: devops-to-mlops')


# ── 6. Experiment Tracking Architecture ───────────────────────────────────────

def gen_experiment_tracking_arch():
    g = base_graph('exp_tracking_arch', 'Experiment Tracking Architecture', rankdir='TB')
    n(g, 'server', 'MLflow / W&B\nTracking Server\n(central store)', 'navy')
    n(g, 'params', 'Parameters\nhyperparams\nconfig.yaml', 'teal')
    n(g, 'metrics','Metrics\nloss, accuracy\nper epoch', 'green')
    n(g, 'arts',   'Artifacts\nmodel.pkl\ndataset hash', 'purple')
    n(g, 'reg',    'Model\nRegistry\ntag + stage', 'gold')
    n(g, 'plots',  'Plots &\nLogs\ncurves, conf matrix', 'cyan')
    with g.subgraph() as s:
        s.attr(rank='same')
        for x in ['params','metrics','arts','reg','plots']:
            s.node(x)
    for leaf in ['params','metrics','arts','reg','plots']:
        e(g, 'server', leaf)
    g.render(os.path.join(OUT, 'experiment-tracking-arch'), cleanup=True)
    print('Generated: experiment-tracking-arch')


# ── 7. Experiment Tracking Flow ───────────────────────────────────────────────

def gen_experiment_tracking():
    g = base_graph('exp_tracking', 'Experiment Tracking Flow', rankdir='LR')
    n(g, 'setup', 'Experiment\nSetup\nrun = mlflow.start_run()', 'navy')
    n(g, 'log_p', 'Log\nParams\nmlflow.log_param()', 'teal')
    n(g, 'log_m', 'Log\nMetrics\nmlflow.log_metric()', 'teal')
    n(g, 'cmp',   'Compare\nRuns\nUI / API', 'purple')
    n(g, 'best',  'Register\nBest Model\nmlflow.register_model()', 'green')
    n(g, 'arts',  'Model\nArtifacts\n.pkl / .onnx', 'gold')
    n(g, 'tags',  'Version\nTags\nstaging / prod', 'navy')
    n(g, 'gate',  'Deployment\nGate\nthreshold check', 'red')
    for a, b in [('setup','log_p'),('log_p','log_m'),('log_m','cmp'),('cmp','best')]:
        e(g, a, b)
    e(g, 'best', 'arts'); e(g, 'arts', 'tags'); e(g, 'tags', 'gate')
    g.render(os.path.join(OUT, 'experiment-tracking'), cleanup=True)
    print('Generated: experiment-tracking')


# ── 8. ML Governance ─────────────────────────────────────────────────────────

def gen_governance():
    g = base_graph('ml_governance', 'ML Governance — Four Pillars', rankdir='TB')
    n(g, 'dg',  'Data\nGovernance\nLineage + Catalog', 'navy')
    n(g, 'mg',  'Model\nGovernance\nRegistry + Audit', 'teal')
    n(g, 'pg',  'Process\nGovernance\nReview + Approval', 'green')
    n(g, 'rg',  'Risk &\nCompliance\nFairness + Bias', 'red')
    with g.subgraph() as s:
        s.attr(rank='same')
        for x in ['dg','mg','pg','rg']:
            s.node(x)
    n(g, 'pol', 'Policy\nEnforcement\n(automated gates)', 'purple')
    n(g, 'rep', 'Audit\nReporting\n+ Alerts', 'gold')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('pol'); s.node('rep')
    for p in ['dg','mg','pg','rg']:
        e(g, p, 'pol')
    e(g, 'pol', 'rep')
    g.render(os.path.join(OUT, 'governance'), cleanup=True)
    print('Generated: governance')


# ── 9. Hyperparameter Tuning Bayesian ─────────────────────────────────────────

def gen_hyperparameter_tuning_bayesian():
    g = base_graph('hp_bayesian', 'Bayesian Hyperparameter Optimization Loop', rankdir='LR')
    n(g, 'space',  'Define\nSearch Space\n(bounds, types)', 'navy')
    n(g, 'surrog', 'Surrogate\nModel\n(Gaussian Process)', 'purple')
    n(g, 'acq',    'Acquisition\nFunction\n(EI / UCB)', 'teal')
    n(g, 'eval',   'Evaluate\nCandidate\n(train + val)', 'gold')
    n(g, 'update', 'Update\nSurrogate\n(new observation)', 'green')
    n(g, 'best',   'Select\nBest HP\n(after N trials)', 'green')
    e(g, 'space', 'surrog')
    e(g, 'surrog', 'acq')
    e(g, 'acq', 'eval')
    e(g, 'eval', 'update')
    e(g, 'update', 'surrog', 'iterate', '#6366f1', 'dashed')
    e(g, 'update', 'best', 'converged', '#22c55e')
    g.render(os.path.join(OUT, 'hyperparameter-tuning-bayesian'), cleanup=True)
    print('Generated: hyperparameter-tuning-bayesian')


# ── 10. Hyperparameter Tuning Strategies ──────────────────────────────────────

def gen_hyperparameter_tuning():
    g = base_graph('hp_tuning', 'Hyperparameter Tuning Strategies', rankdir='TB')
    n(g, 'grid',  'Grid Search\nExhaustive\nAll combinations\nSlow, small spaces', 'navy')
    n(g, 'rand',  'Random Search\nSample randomly\nBetter coverage\nFaster than grid', 'teal')
    n(g, 'bayes', 'Bayesian Opt\nSurrogate model\nSmarter sampling\nFewer evaluations', 'purple')
    n(g, 'hband', 'Hyperband\nEarly stopping\nMulti-fidelity\nFastest at scale', 'green')
    with g.subgraph() as s:
        s.attr(rank='same')
        for x in ['grid','rand','bayes','hband']:
            s.node(x)
    n(g, 'tradeoff', 'Tradeoffs:\nGrid → small spaces\nRandom → medium\nBayes → expensive evals\nHyperband → deep nets', 'gold')
    for x in ['grid','rand','bayes','hband']:
        e(g, x, 'tradeoff')
    g.render(os.path.join(OUT, 'hyperparameter-tuning'), cleanup=True)
    print('Generated: hyperparameter-tuning')


# ── 11. ML Attack Taxonomy ────────────────────────────────────────────────────

def gen_ml_attack_taxonomy():
    g = base_graph('ml_attacks', 'ML Attack Taxonomy — Threats & Mitigations', rankdir='TB')
    n(g, 'threats', 'ML Security\nThreat Landscape', 'red')
    n(g, 'train',   'Training\nTime Attacks', 'red')
    n(g, 'infer',   'Inference\nTime Attacks', 'red')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('train'); s.node('infer')
    n(g, 'poison',   'Data\nPoisoning\nCorrupt training', 'gold')
    n(g, 'backdoor', 'Backdoor\nAttacks\nTrigger patterns', 'gold')
    n(g, 'adv',      'Adversarial\nExamples\nInput perturbation', 'purple')
    n(g, 'extract',  'Model\nExtraction\nStealing weights', 'purple')
    n(g, 'member',   'Membership\nInference\nPrivacy leak', 'teal')
    with g.subgraph() as s:
        s.attr(rank='same')
        for x in ['poison','backdoor','adv','extract','member']:
            s.node(x)
    e(g, 'threats', 'train'); e(g, 'threats', 'infer')
    e(g, 'train', 'poison'); e(g, 'train', 'backdoor')
    e(g, 'infer', 'adv'); e(g, 'infer', 'extract'); e(g, 'infer', 'member')
    g.render(os.path.join(OUT, 'ml-attack-taxonomy'), cleanup=True)
    print('Generated: ml-attack-taxonomy')


# ── 12. ML Infrastructure Stack ───────────────────────────────────────────────

def gen_ml_infrastructure_stack():
    g = base_graph('ml_infra', 'ML Infrastructure Stack — 4 Layers', rankdir='TB')
    # Layer 1: Compute
    n(g, 'gpu',    'GPU Cluster\n(A100 / H100)\nNVIDIA', 'red')
    n(g, 'tpu',    'TPU Pods\n(Google Cloud)', 'red')
    n(g, 'cpu',    'CPU Nodes\n(inference/serving)', 'gray')
    # Layer 2: Orchestration + Storage
    n(g, 'k8s',    'Kubernetes\n(container orch)', 'navy')
    n(g, 'ray',    'Ray Cluster\n(distributed ML)', 'navy')
    n(g, 's3',     'S3 / GCS\n(dataset store)', 'teal')
    n(g, 'feat',   'Feature Store\n(Feast / Tecton)', 'teal')
    n(g, 'mlflow', 'MLflow\nExperiment Tracking', 'purple')
    # Layer 3: Training + Serving
    n(g, 'ddp',    'PyTorch DDP\n(multi-GPU dist)', 'purple')
    n(g, 'spark',  'Spark MLlib\n(big data ML)', 'purple')
    n(g, 'triton', 'NVIDIA Triton\n(multi-framework)', 'green')
    n(g, 'ts',     'TorchServe\n(PyTorch serving)', 'green')
    n(g, 'onnx',   'ONNX Runtime\n(cross-platform)', 'green')
    # Layer 4: Observability
    n(g, 'prom',   'Prometheus\n+ Grafana', 'gold')
    n(g, 'evid',   'Evidently\n(data drift)', 'gold')
    n(g, 'alert',  'PagerDuty\n+ Alerts', 'red')
    with g.subgraph() as s:
        s.attr(rank='same'); s.node('gpu'); s.node('tpu'); s.node('cpu')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('k8s'); s.node('ray'); s.node('s3'); s.node('feat'); s.node('mlflow')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('ddp'); s.node('spark'); s.node('triton'); s.node('ts'); s.node('onnx')
    with g.subgraph() as s:
        s.attr(rank='same'); s.node('prom'); s.node('evid'); s.node('alert')
    e(g, 'gpu', 'k8s'); e(g, 'tpu', 'k8s'); e(g, 'cpu', 'ray')
    e(g, 'k8s', 's3'); e(g, 'ray', 'feat'); e(g, 'k8s', 'mlflow')
    e(g, 's3', 'ddp'); e(g, 'feat', 'ddp'); e(g, 's3', 'spark')
    e(g, 'ddp', 'triton'); e(g, 'spark', 'ts'); e(g, 'ddp', 'onnx')
    e(g, 'triton', 'prom'); e(g, 'ts', 'evid'); e(g, 'onnx', 'alert')
    g.render(os.path.join(OUT, 'ml-infrastructure-stack'), cleanup=True)
    print('Generated: ml-infrastructure-stack')


# ── 13. ML Monitoring & Alerting ──────────────────────────────────────────────

def gen_ml_monitoring_alerting():
    g = base_graph('ml_monitoring', 'ML Monitoring & Alerting Pipeline', rankdir='LR')
    n(g, 'prod',    'Model\nin Production\n(serving)', 'navy')
    n(g, 'ddrift',  'Data Drift\nCheck\n(PSI / KS test)', 'gold')
    n(g, 'cdrift',  'Concept Drift\nCheck\n(accuracy drop)', 'gold')
    n(g, 'perf',    'Performance\nMetrics\n(latency, p99)', 'teal')
    n(g, 'rules',   'Alert\nRules\n(thresholds)', 'red')
    n(g, 'pager',   'PagerDuty\n/ Slack\nalert', 'red')
    n(g, 'retrain', 'Auto\nRetrain\nTrigger', 'green')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('ddrift'); s.node('cdrift'); s.node('perf')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('pager'); s.node('retrain')
    e(g, 'prod', 'ddrift'); e(g, 'prod', 'cdrift'); e(g, 'prod', 'perf')
    e(g, 'ddrift', 'rules'); e(g, 'cdrift', 'rules'); e(g, 'perf', 'rules')
    e(g, 'rules', 'pager'); e(g, 'rules', 'retrain')
    g.render(os.path.join(OUT, 'ml-monitoring-alerting'), cleanup=True)
    print('Generated: ml-monitoring-alerting')


# ── 14. ML Security ───────────────────────────────────────────────────────────

def gen_ml_security():
    g = base_graph('ml_security', 'ML Security — Attacks, Defenses & Mitigations', rankdir='TB')
    n(g, 'title',   'ML Threat\nLandscape', 'red')
    n(g, 'poison',  'Data Poisoning\nCorrupt training set\nDetect: stat tests', 'red')
    n(g, 'adv',     'Adversarial\nExamples\nPerturbed inputs', 'red')
    n(g, 'extract', 'Model\nExtraction\nSteal via API queries', 'red')
    n(g, 'member',  'Membership\nInference\nPrivacy leak', 'red')
    n(g, 'poison_d','Data Validation\n+ Anomaly Detection\nGreat Expectations', 'green')
    n(g, 'adv_t',   'Adversarial\nTraining\n+ Certified Defenses', 'green')
    n(g, 'rate',    'API Rate Limiting\n+ Output Noise\n+ Confidence masking', 'green')
    n(g, 'dp',      'Differential\nPrivacy (DP-SGD)\nε-DP guarantees', 'green')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('poison'); s.node('adv'); s.node('extract'); s.node('member')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('poison_d'); s.node('adv_t'); s.node('rate'); s.node('dp')
    e(g, 'title', 'poison'); e(g, 'title', 'adv')
    e(g, 'title', 'extract'); e(g, 'title', 'member')
    e(g, 'poison', 'poison_d', 'mitigated by')
    e(g, 'adv', 'adv_t', 'mitigated by')
    e(g, 'extract', 'rate', 'mitigated by')
    e(g, 'member', 'dp', 'mitigated by')
    g.render(os.path.join(OUT, 'ml-security'), cleanup=True)
    print('Generated: ml-security')


# ── 15. ML Supply Chain Security ──────────────────────────────────────────────

def gen_ml_supply_chain_security():
    g = base_graph('ml_supply_chain', 'ML Supply Chain Security — End to End', rankdir='LR')
    n(g, 'src',    'Data\nSources\n(provenance)', 'gray')
    n(g, 'valid',  'Data\nValidation\n(schema + stats)', 'teal')
    n(g, 'code',   'Training\nCode\n(SAST scan)', 'navy')
    n(g, 'train',  'Model\nTraining\n(reproducible)', 'navy')
    n(g, 'sign',   'Model\nSigning\n(cosign/notary)', 'purple')
    n(g, 'reg',    'Registry\n(SBOM + scan)', 'purple')
    n(g, 'scan',   'Deployment\nScan\n(CVE check)', 'gold')
    n(g, 'prod',   'Production\n(audit log)', 'green')
    for a, b in [('src','valid'),('valid','code'),('code','train'),
                 ('train','sign'),('sign','reg'),('reg','scan'),('scan','prod')]:
        e(g, a, b)
    g.render(os.path.join(OUT, 'ml-supply-chain-security'), cleanup=True)
    print('Generated: ml-supply-chain-security')


# ── 16. ML Testing Pyramid ────────────────────────────────────────────────────

def gen_ml_testing_pyramid():
    g = base_graph('ml_test_pyramid', 'ML Testing Pyramid — Layers & Coverage', rankdir='TB')
    n(g, 'e2e',    'End-to-End Tests\n(full pipeline, slow)', 'red')
    n(g, 'integ',  'Integration Tests\n(component interfaces)', 'gold')
    n(g, 'shadow', 'Shadow Tests\n(prod traffic replay)', 'gold')
    n(g, 'model_v','Model Validation\n(holdout + metrics)', 'teal')
    n(g, 'data_v', 'Data Validation\n(schema + stats)', 'teal')
    n(g, 'unit_m', 'Model Unit Tests\n(layer outputs)', 'green')
    n(g, 'unit_d', 'Data Unit Tests\n(transform fns)', 'green')
    n(g, 'unit_c', 'Code Unit Tests\n(feature logic)', 'green')
    with g.subgraph() as s:
        s.attr(rank='same'); s.node('integ'); s.node('shadow')
    with g.subgraph() as s:
        s.attr(rank='same'); s.node('model_v'); s.node('data_v')
    with g.subgraph() as s:
        s.attr(rank='same'); s.node('unit_m'); s.node('unit_d'); s.node('unit_c')
    e(g, 'e2e', 'integ'); e(g, 'e2e', 'shadow')
    e(g, 'integ', 'model_v'); e(g, 'shadow', 'data_v')
    e(g, 'model_v', 'unit_m'); e(g, 'data_v', 'unit_d'); e(g, 'data_v', 'unit_c')
    g.render(os.path.join(OUT, 'ml-testing-pyramid'), cleanup=True)
    print('Generated: ml-testing-pyramid')


# ── 17. MLOps Real World Cases AWS ────────────────────────────────────────────

def gen_mlops_real_world_cases_aws():
    g = base_graph('mlops_aws', 'AWS MLOps Reference Architecture', rankdir='LR')
    n(g, 's3',    'Amazon S3\nData Lake\n(raw + processed)', 'navy')
    n(g, 'pipe',  'SageMaker\nPipelines\n(workflow)', 'teal')
    n(g, 'train', 'SageMaker\nTraining\n(spot + dist)', 'navy')
    n(g, 'reg',   'SageMaker\nModel Registry\n(approval flow)', 'purple')
    n(g, 'ep',    'SageMaker\nEndpoints\n(real-time)', 'green')
    n(g, 'cw',    'CloudWatch\nMonitoring\n+ Alarms', 'gold')
    for a, b in [('s3','pipe'),('pipe','train'),('train','reg'),
                 ('reg','ep'),('ep','cw')]:
        e(g, a, b)
    g.render(os.path.join(OUT, 'mlops-real-world-cases-aws'), cleanup=True)
    print('Generated: mlops-real-world-cases-aws')


# ── 18. MLOps Real World Cases Azure ──────────────────────────────────────────

def gen_mlops_real_world_cases_azure():
    g = base_graph('mlops_azure', 'Azure MLOps Reference Architecture', rankdir='LR')
    n(g, 'adl',   'Azure Data\nLake Gen2\n(raw + delta)', 'navy')
    n(g, 'pipe',  'Azure ML\nPipelines\n(yaml-based)', 'teal')
    n(g, 'train', 'AML\nTraining\n(compute cluster)', 'navy')
    n(g, 'reg',   'AML\nModel Registry\n(MLflow compat)', 'purple')
    n(g, 'ep',    'AML\nManaged Endpoints\n(real-time/batch)', 'green')
    n(g, 'mon',   'Azure Monitor\n+ App Insights\nAlerts', 'gold')
    for a, b in [('adl','pipe'),('pipe','train'),('train','reg'),
                 ('reg','ep'),('ep','mon')]:
        e(g, a, b)
    g.render(os.path.join(OUT, 'mlops-real-world-cases-azure'), cleanup=True)
    print('Generated: mlops-real-world-cases-azure')


# ── 19. Model Evaluation Pipeline ─────────────────────────────────────────────

def gen_model_evaluation_pipeline():
    g = base_graph('model_eval_pipe', 'Model Evaluation Pipeline — Test to Deploy Gate', rankdir='LR')
    n(g, 'test',    'Test\nDataset\n(held-out)', 'gray')
    n(g, 'infer',   'Model\nInference\n(batch predict)', 'navy')
    n(g, 'metrics', 'Compute\nMetrics\n(F1, AUC, RMSE)', 'teal')
    n(g, 'thresh',  'Threshold\nCheck\n(> baseline?)', 'gold')
    n(g, 'gate',    'Staging\nGate\n(approve / reject)', 'purple')
    n(g, 'deploy',  'Prod\nDeploy\n(canary)', 'green')
    for a, b in [('test','infer'),('infer','metrics'),('metrics','thresh'),
                 ('thresh','gate'),('gate','deploy')]:
        e(g, a, b)
    g.render(os.path.join(OUT, 'model-evaluation-pipeline'), cleanup=True)
    print('Generated: model-evaluation-pipeline')


# ── 20. Model Packaging Formats ───────────────────────────────────────────────

def gen_model_packaging_formats():
    g = base_graph('model_pkg', 'Model Packaging Formats & Runtime Targets', rankdir='TB')
    n(g, 'model', 'Trained\nModel\n(weights + arch)', 'navy')
    n(g, 'onnx',  'ONNX\nOpen format\ncross-framework', 'teal')
    n(g, 'ts',    'TorchScript\nPyTorch traced\nno Python needed', 'purple')
    n(g, 'saved', 'SavedModel\nTensorFlow\nserving-ready', 'green')
    n(g, 'pmml',  'PMML / MLeap\nclassic ML\n(sklearn/spark)', 'gold')
    with g.subgraph() as s:
        s.attr(rank='same')
        for x in ['onnx','ts','saved','pmml']:
            s.node(x)
    n(g, 'trt',   'TensorRT\n(NVIDIA GPU)', 'teal')
    n(g, 'ort',   'ONNX Runtime\n(CPU/GPU)', 'teal')
    n(g, 'tflite','TFLite\n(mobile/edge)', 'green')
    n(g, 'triton','Triton Server\n(multi-framework)', 'purple')
    with g.subgraph() as s:
        s.attr(rank='same')
        for x in ['trt','ort','tflite','triton']:
            s.node(x)
    e(g, 'model', 'onnx'); e(g, 'model', 'ts')
    e(g, 'model', 'saved'); e(g, 'model', 'pmml')
    e(g, 'onnx', 'trt'); e(g, 'onnx', 'ort')
    e(g, 'saved', 'tflite'); e(g, 'ts', 'triton')
    g.render(os.path.join(OUT, 'model-packaging-formats'), cleanup=True)
    print('Generated: model-packaging-formats')


# ── 21. Online vs Batch Learning ──────────────────────────────────────────────

def gen_online_vs_batch_learning():
    g = base_graph('online_vs_batch', 'Online vs Batch Learning — Trade-offs', rankdir='LR')
    with g.subgraph(name='cluster_batch') as c:
        c.attr(label='Batch Learning', style='rounded,filled',
               fillcolor='#eff6ff', color='#3b82f6',
               fontname='Helvetica-Bold', fontsize='11', fontcolor='#1e40af')
        n(c, 'bc', 'Collect\nDataset', 'navy')
        n(c, 'bt', 'Train\n(full data)', 'navy')
        n(c, 'bd', 'Deploy\nModel', 'navy')
        n(c, 'br', 'Repeat\nWeekly/Monthly', 'gray')
        e(c, 'bc', 'bt'); e(c, 'bt', 'bd'); e(c, 'bd', 'br')
    with g.subgraph(name='cluster_online') as c:
        c.attr(label='Online Learning', style='rounded,filled',
               fillcolor='#f0fdf4', color='#22c55e',
               fontname='Helvetica-Bold', fontsize='11', fontcolor='#166534')
        n(c, 'os', 'Stream\nEvent', 'teal')
        n(c, 'ou', 'Update\nWeights', 'green')
        n(c, 'od', 'Deploy\nContinuously', 'green')
        e(c, 'os', 'ou'); e(c, 'ou', 'od'); e(c, 'od', 'os', 'loop', '#22c55e', 'dashed')
    g.render(os.path.join(OUT, 'online-vs-batch-learning'), cleanup=True)
    print('Generated: online-vs-batch-learning')


# ── 22. Pipeline Tools Comparison ─────────────────────────────────────────────

def gen_pipeline_tools_comparison():
    g = base_graph('pipeline_tools', 'ML Pipeline Tools Comparison', rankdir='TB')
    n(g, 'airflow', 'Apache Airflow\nDAG-centric\nGeneral purpose\nLarge ecosystem', 'navy')
    n(g, 'kubeflow','Kubeflow Pipelines\nK8s-native\nContainerized steps\nGPU support', 'teal')
    n(g, 'prefect', 'Prefect\nPython-native\nDynamic tasks\nCloud + OSS', 'purple')
    n(g, 'metaflow','Metaflow\nData-centric\nNetflix-born\nStep + artifact', 'green')
    n(g, 'dagster', 'Dagster\nAsset-centric\nSoftware-defined\nLineage built-in', 'gold')
    with g.subgraph() as s:
        s.attr(rank='same')
        for x in ['airflow','kubeflow','prefect','metaflow','dagster']:
            s.node(x)
    n(g, 'use',  'Use Case Fit:\nAirflow → batch ETL\nKubeflow → GPU training\nPrefect → dynamic ML\nMetaflow → data science\nDagster → data assets', 'gray')
    for x in ['airflow','kubeflow','prefect','metaflow','dagster']:
        e(g, x, 'use')
    g.render(os.path.join(OUT, 'pipeline-tools-comparison'), cleanup=True)
    print('Generated: pipeline-tools-comparison')


# ── 23. Reproducible ML Pipelines ─────────────────────────────────────────────

def gen_reproducible_ml_pipelines():
    g = base_graph('reproducible_ml', 'Reproducible ML Pipelines — 6 Pillars', rankdir='LR')
    n(g, 'deps',  'Pin\nDependencies\nrequirements.txt\nconda env', 'navy')
    n(g, 'data',  'Version\nData\nDVC / LakeFS\ndata hash', 'teal')
    n(g, 'code',  'Version\nCode\ngit SHA\nexact commit', 'navy')
    n(g, 'cont',  'Containerize\nDocker image\nfrozen base', 'purple')
    n(g, 'log',   'Log\nParams\nMLflow / W&B\nhyperparams', 'gold')
    n(g, 'store', 'Artifact\nStore\nmodels + plots\nS3 / GCS', 'green')
    for a, b in [('deps','data'),('data','code'),('code','cont'),
                 ('cont','log'),('log','store')]:
        e(g, a, b)
    g.render(os.path.join(OUT, 'reproducible-ml-pipelines'), cleanup=True)
    print('Generated: reproducible-ml-pipelines')


# ── 24. Responsible AI Fairness ───────────────────────────────────────────────

def gen_responsible_ai_fairness():
    g = base_graph('resp_ai_fair', 'Responsible AI — Fairness Metrics', rankdir='TB')
    n(g, 'fair',  'Fairness\nObjective\n(choose one)', 'navy')
    n(g, 'dp',    'Demographic\nParity\nP(y=1|A=0)=P(y=1|A=1)', 'teal')
    n(g, 'eo',    'Equal\nOpportunity\nTPR equal across groups', 'green')
    n(g, 'cal',   'Calibration\nP(Y=1|score,A) same', 'purple')
    n(g, 'ind',   'Individual\nFairness\nSimilar → similar output', 'gold')
    n(g, 'cf',    'Counterfactual\nFairness\nP(y|a)=P(y|do(A=a\'))', 'cyan')
    with g.subgraph() as s:
        s.attr(rank='same')
        for x in ['dp','eo','cal','ind','cf']:
            s.node(x)
    for x in ['dp','eo','cal','ind','cf']:
        e(g, 'fair', x)
    g.render(os.path.join(OUT, 'responsible-ai-fairness'), cleanup=True)
    print('Generated: responsible-ai-fairness')


# ── 25. Responsible AI SHAP ───────────────────────────────────────────────────

def gen_responsible_ai_shap():
    g = base_graph('resp_ai_shap', 'SHAP Explainability — Feature Attribution', rankdir='TB')
    n(g, 'pred', 'Model\nPrediction\n(output)', 'navy')
    n(g, 's1', 'SHAP Value\nFeature A\n+0.35 contribution', 'teal')
    n(g, 's2', 'SHAP Value\nFeature B\n-0.12 contribution', 'gold')
    n(g, 's3', 'SHAP Value\nFeature C\n+0.28 contribution', 'green')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('s1'); s.node('s2'); s.node('s3')
    n(g, 'fi',  'Feature\nImportance\nBar Chart', 'purple')
    n(g, 'wf',  'Waterfall\nChart\nper-prediction', 'purple')
    n(g, 'sum', 'Summary\nPlot\nall samples', 'teal')
    n(g, 'dep', 'Dependence\nPlot\ninteraction', 'cyan')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('fi'); s.node('wf'); s.node('sum'); s.node('dep')
    e(g, 'pred', 's1'); e(g, 'pred', 's2'); e(g, 'pred', 's3')
    e(g, 's1', 'fi'); e(g, 's2', 'wf'); e(g, 's3', 'sum')
    e(g, 's1', 'dep')
    g.render(os.path.join(OUT, 'responsible-ai-shap'), cleanup=True)
    print('Generated: responsible-ai-shap')


# ── 26. Retraining Triggers ───────────────────────────────────────────────────

def gen_retraining_triggers():
    g = base_graph('retrain_triggers', 'ML Retraining Triggers — Decision Flow', rankdir='TB')
    n(g, 'decide', 'Retraining\nDecision\nEngine', 'navy')
    n(g, 'ddrift', 'Data Drift\nDetected\n(PSI > threshold)', 'gold')
    n(g, 'acc',    'Model Accuracy\nDrop\n(> 5% degradation)', 'red')
    n(g, 'newdata','New Data\nAvailable\n(> 10% new samples)', 'teal')
    n(g, 'sched',  'Scheduled\nInterval\n(weekly cron)', 'gray')
    with g.subgraph() as s:
        s.attr(rank='same')
        for x in ['ddrift','acc','newdata','sched']:
            s.node(x)
    n(g, 'pipe', 'Retrain\nPipeline\n(automated)', 'purple')
    n(g, 'val',  'Model\nValidation\n(A/B vs baseline)', 'teal')
    n(g, 'promo','Promote /\nRollback\n(registry update)', 'green')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('pipe'); s.node('val')
    for x in ['ddrift','acc','newdata','sched']:
        e(g, x, 'decide')
    e(g, 'decide', 'pipe')
    e(g, 'pipe', 'val')
    e(g, 'val', 'promo')
    g.render(os.path.join(OUT, 'retraining-triggers'), cleanup=True)
    print('Generated: retraining-triggers')


# ── 27. Serving Latency Optimization ──────────────────────────────────────────

def gen_serving_latency_optimization():
    g = base_graph('serving_latency', 'ML Serving Latency Optimization Techniques', rankdir='LR')
    n(g, 'req',    'Incoming\nRequest', 'gray')
    n(g, 'batch',  'Request\nBatching\n(dynamic batch)', 'navy')
    n(g, 'quant',  'Model\nQuantization\n(FP32→INT8)', 'teal')
    n(g, 'hw',     'Hardware\nAccel\n(GPU/TensorRT)', 'purple')
    n(g, 'cache',  'Result\nCaching\n(Redis TTL)', 'gold')
    n(g, 'resp',   'Response\n< 50ms p99', 'green')
    n(g, 'async',  'Async\nPipeline\n(decoupled)', 'cyan')
    n(g, 'edge',   'Edge\nDeployment\n(TFLite/ONNX)', 'teal')
    for a, b in [('req','batch'),('batch','quant'),('quant','hw'),
                 ('hw','cache'),('cache','resp')]:
        e(g, a, b)
    e(g, 'batch', 'async', 'alt path', '#06b6d4', 'dashed')
    e(g, 'quant', 'edge', 'mobile', '#14b8a6', 'dashed')
    g.render(os.path.join(OUT, 'serving-latency-optimization'), cleanup=True)
    print('Generated: serving-latency-optimization')


# ── 28. Data Versioning (improved) ────────────────────────────────────────────

def gen_data_versioning():
    g = base_graph('data_versioning', 'ML Data Versioning — DVC & Table Formats', rankdir='LR')
    n(g, 'raw',     'Raw Data\n(immutable source)', 'gray')
    n(g, 'dvc',     'DVC Pointer\n(.dvc file in git)', 'navy')
    n(g, 'remote',  'Remote Storage\n(S3 / GCS / Azure)', 'teal')
    n(g, 'delta',   'Delta Lake\nACID + Time Travel\nZ-Order clustering', 'green')
    n(g, 'iceberg', 'Apache Iceberg\nHidden Partitioning\nSchema evolution', 'green')
    n(g, 'lakefs',  'LakeFS\nGit Branch Semantics\nCommit + merge data', 'purple')
    n(g, 'ver',     'Version Tag\nv1.0.0 / commit SHA\nreproducible', 'gold')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('delta'); s.node('iceberg'); s.node('lakefs')
    e(g, 'raw', 'dvc'); e(g, 'dvc', 'remote')
    e(g, 'raw', 'delta', 'format'); e(g, 'raw', 'iceberg', 'format')
    e(g, 'raw', 'lakefs', 'branch')
    e(g, 'delta', 'ver'); e(g, 'iceberg', 'ver'); e(g, 'lakefs', 'ver')
    g.render(os.path.join(OUT, 'data-versioning'), cleanup=True)
    print('Generated: data-versioning')


# ── 29. Deployment Strategies (improved) ──────────────────────────────────────

def gen_deployment_strategies():
    g = base_graph('deploy_strat', 'ML Deployment Strategies — Risk Gradient', rankdir='LR')
    n(g, 'shadow',  'Shadow\nMode\nRisk: none\nCompare offline', 'green')
    n(g, 'canary',  'Canary\nRelease\nRisk: low\n1→10→50→100%', 'teal')
    n(g, 'ab',      'A/B Test\nRisk: medium\nSplit by user\nStatistical test', 'gold')
    n(g, 'blue',    'Blue/Green\nRisk: medium\nFull traffic swap\nFast rollback', 'navy')
    n(g, 'rolling', 'Rolling\nUpdate\nRisk: medium\nInstance by instance', 'purple')
    n(g, 'fullcut', 'Full\nCutover\nRisk: high\nInstant switch\nNo overlap', 'red')
    for a, b in [('shadow','canary'),('canary','ab'),('ab','blue'),
                 ('blue','rolling'),('rolling','fullcut')]:
        e(g, a, b, '↑ risk')
    g.render(os.path.join(OUT, 'deployment-strategies'), cleanup=True)
    print('Generated: deployment-strategies')


# ── 30. Pipeline Orchestration (improved) ─────────────────────────────────────

def gen_pipeline_orchestration():
    g = base_graph('pipeline_orch', 'ML Pipeline Orchestration — Tools & Shared Infrastructure', rankdir='TB')
    n(g, 'airflow',  'Apache Airflow\nDAG-centric\nbatch ETL + ML', 'navy')
    n(g, 'kubeflow', 'Kubeflow Pipelines\nK8s-native\nGPU training', 'navy')
    n(g, 'metaflow', 'Metaflow\nData-centric\nstep + artifact', 'navy')
    n(g, 'dagster',  'Dagster\nAsset-centric\nlineage built-in', 'green')
    n(g, 'prefect',  'Prefect\nPython-native\ndynamic tasks', 'green')
    n(g, 'artifact', 'Artifact Store\n(S3 / GCS / Azure Blob)', 'teal')
    n(g, 'compute',  'Compute Layer\n(CPU / GPU / Spark / Ray)', 'red')
    n(g, 'reg',      'Model Registry\n(MLflow / W&B)', 'purple')
    with g.subgraph() as s:
        s.attr(rank='same')
        for x in ['airflow','kubeflow','metaflow','dagster','prefect']:
            s.node(x)
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('artifact'); s.node('compute')
    for orch in ['airflow','kubeflow','metaflow','dagster','prefect']:
        e(g, orch, 'artifact')
        e(g, orch, 'compute')
    e(g, 'artifact', 'reg')
    g.render(os.path.join(OUT, 'pipeline-orchestration'), cleanup=True)
    print('Generated: pipeline-orchestration')


# ── 31. ML Testing Infrastructure (improved) ──────────────────────────────────

def gen_ml_testing_infra():
    g = base_graph('ml_test_infra', 'ML Testing Infrastructure — Test Types & Tools', rankdir='TB')
    n(g, 'schema', 'Schema\nValidation\n(Great Expectations)', 'teal')
    n(g, 'stats',  'Statistical\nProfile\n(Evidently)', 'teal')
    n(g, 'dist',   'Distribution\nShift\n(KS test)', 'teal')
    n(g, 'unit',   'Model\nUnit Tests\n(layer outputs)', 'navy')
    n(g, 'integ',  'Integration\nTests\n(pipeline E2E)', 'navy')
    n(g, 'shadow', 'Shadow\nTests\n(prod replay)', 'navy')
    n(g, 'load',   'Load\nTests\n(latency p99)', 'gold')
    n(g, 'chaos',  'Chaos\nTests\n(fault inject)', 'gold')
    n(g, 'ci',     'CI/CD Gate\n(all tests pass\nbefore deploy)', 'green')
    with g.subgraph() as s:
        s.attr(rank='same')
        for x in ['schema','stats','dist','unit','integ','shadow','load','chaos']:
            s.node(x)
    for x in ['schema','stats','dist','unit','integ','shadow','load','chaos']:
        e(g, x, 'ci')
    g.render(os.path.join(OUT, 'ml-testing-infra'), cleanup=True)
    print('Generated: ml-testing-infra')


if __name__ == '__main__':
    gen_azure_mlops_maturity()
    gen_cicd_automation()
    gen_data_lineage_pipeline()
    gen_deployment_traffic_patterns()
    gen_devops_to_mlops()
    gen_experiment_tracking_arch()
    gen_experiment_tracking()
    gen_governance()
    gen_hyperparameter_tuning_bayesian()
    gen_hyperparameter_tuning()
    gen_ml_attack_taxonomy()
    gen_ml_infrastructure_stack()
    gen_ml_monitoring_alerting()
    gen_ml_security()
    gen_ml_supply_chain_security()
    gen_ml_testing_pyramid()
    gen_mlops_real_world_cases_aws()
    gen_mlops_real_world_cases_azure()
    gen_model_evaluation_pipeline()
    gen_model_packaging_formats()
    gen_online_vs_batch_learning()
    gen_pipeline_tools_comparison()
    gen_reproducible_ml_pipelines()
    gen_responsible_ai_fairness()
    gen_responsible_ai_shap()
    gen_retraining_triggers()
    gen_serving_latency_optimization()
    gen_data_versioning()
    gen_deployment_strategies()
    gen_pipeline_orchestration()
    gen_ml_testing_infra()
    print('\nAll 31 MLOps diagrams generated.')
