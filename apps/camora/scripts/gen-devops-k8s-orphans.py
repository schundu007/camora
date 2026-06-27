#!/usr/bin/env python3
"""Regenerate narrow orphan DevOps diagrams to >= 1400px wide.

Diagrams fixed:
  ct8-bazel.png              Bazel build system
  k8s-ai-ml.png              K8s for AI/ML workloads
  k8s-api-aggregation.png    K8s API aggregation layer
  k8s-core-resources.png     K8s core resources
  k8s-evictions.png          K8s eviction & QoS classes
  k8s-local-setup.png        K8s local dev tools
  k8s-networking-cni.png     K8s networking & CNI plugins (portrait → landscape)
  k8s-security.png           K8s security layers
  f7-dockerfile-reference.png Dockerfile instructions (tall column → 4-col grid)

Output: apps/camora/public/diagrams/devops/
"""
import graphviz
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'devops')
os.makedirs(OUT, exist_ok=True)

C = {
    'navy':   ('#dbeafe', '#3b82f6', '#1e40af'),
    'gold':   ('#fef3c7', '#f59e0b', '#92400e'),
    'green':  ('#dcfce7', '#22c55e', '#166534'),
    'red':    ('#fee2e2', '#ef4444', '#991b1b'),
    'purple': ('#e0e7ff', '#6366f1', '#3730a3'),
    'teal':   ('#ccfbf1', '#14b8a6', '#115e59'),
    'sky':    ('#e0f2fe', '#0ea5e9', '#075985'),
    'amber':  ('#fef3c7', '#f59e0b', '#92400e'),
    'gray':   ('#f3f4f6', '#6b7280', '#374151'),
    'pink':   ('#fce7f3', '#ec4899', '#9d174d'),
}

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica',
            fontsize='12', penwidth='1.5', height='0.55', margin='0.25,0.15')
EDGE = dict(fontname='Helvetica', fontsize='10', penwidth='1.5')


def n(g, name, label, c='gray'):
    g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)


def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '',
           color=color, fontcolor=color, style=style, **EDGE)


def base_graph(name, title, rankdir='LR', size='9,5!',
               nodesep='0.9', ranksep='1.0'):
    g = graphviz.Digraph(name, format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.6',
           nodesep=nodesep, ranksep=ranksep,
           splines='spline', rankdir=rankdir,
           size=size, ratio='fill',
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica', fontcolor='#1e293b')
    return g


# ─────────────────────────────────────────────────────────────────────
# ct8-bazel.png — Bazel Build System
# ─────────────────────────────────────────────────────────────────────
def diag_bazel():
    g = base_graph('ct8_bazel',
                   'Bazel — Workspace, Action Cache & Remote Execution',
                   size='10,5!')

    n(g, 'src', 'Source Files\n.go  .py  .java  .cc\n.proto  .bzl', 'gray')
    n(g, 'ws',  'WORKSPACE\nBUILD / BUILD.bazel\nExternal deps\nbzlmod / WORKSPACE.bazel', 'navy')
    n(g, 'engine', 'Bazel Engine\nLoad → Analyze\n→ Execute phases\nHermetic sandboxing', 'navy')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'local_cache', 'Local Action Cache\n~/.cache/bazel\nContent-addressed\nSHA-256 input hashing\nAvoids re-running actions', 'teal')
        n(s, 'output_base', 'Output Tree\nbazel-out/k8-opt/\nbazel-out/k8-dbg/\nbazel-bin symlink\nExecroot per build', 'green')

    n(g, 'rbe', 'Remote Build Execution\n(RBE API — REAPI)\nBuildbarn / BuildGrid\nEngFlow / Google RBE\nStateless worker pool', 'purple')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'workers', 'Worker Containers\nStateless + hermetic\nParallel action dispatch\nHorizontally scalable\nGPU / cross-compile capable', 'purple')
        n(s, 'remote_cache', 'Remote Cache (CAS)\nContent-Addressable Store\nShared across team/CI\nReduces rebuild cost\nHTTPS + gRPC transport', 'teal')

    n(g, 'artifacts', 'Build Artifacts\nBinaries / container images\nTest results (TRE API)\nRunfiles tree\nCoverage reports', 'gold')

    e(g, 'src', 'ws')
    e(g, 'ws', 'engine', 'parse + load')
    e(g, 'engine', 'local_cache', 'cache\ncheck')
    e(g, 'local_cache', 'output_base', 'cache hit\n→ restore')
    e(g, 'engine', 'rbe', 'remote\nexecution', '#7c3aed', 'dashed')
    e(g, 'rbe', 'workers', 'dispatch\nactions')
    e(g, 'rbe', 'remote_cache', 'fetch / store\nCAS blobs')
    e(g, 'workers', 'artifacts', 'action\nresults')
    e(g, 'output_base', 'artifacts', 'local\nresults')

    g.render(os.path.join(OUT, 'ct8-bazel'), cleanup=True)
    print('  ct8-bazel.png')


# ─────────────────────────────────────────────────────────────────────
# k8s-ai-ml.png — Kubernetes for AI/ML Workloads
# ─────────────────────────────────────────────────────────────────────
def diag_k8s_ai_ml():
    g = base_graph('k8s_ai_ml',
                   'K8s for AI/ML — GPU Scheduling · Training Jobs · Model Serving',
                   size='10,5!', nodesep='1.0', ranksep='1.1')

    n(g, 'gpu_pool', 'GPU Node Pool\nA100 / H100 / V100\nTaint: nvidia.com/gpu=true\nNode labels + selectors', 'navy')
    n(g, 'device_plugin', 'NVIDIA Device Plugin\nExposes GPU as resource\nnvidia.com/gpu: 1\nDaemonSet on GPU nodes', 'navy')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'mig', 'MIG\n(Multi-Instance GPU)\nPartition A100 into slices\n1g.5gb / 2g.10gb / 3g.20gb\nHard isolation per slice', 'purple')
        n(s, 'mps', 'MPS\n(Multi-Process Service)\nTime-multiplex one GPU\nAcross concurrent pods\nSoft isolation, higher util', 'pink')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'pytorchjob', 'PyTorchJob / TFJob\nKubeflow Training Operator\nWorker + Master pods\nDist. training via DDP/NCCL\ntorchrun launcher', 'teal')
        n(s, 'batch', 'Indexed Batch Jobs\nArray / indexed tasks\nbackoffLimit per index\nparallelism + completions\nJob completion modes', 'sky')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'kserve', 'KServe / Triton\nModel inference server\nCanary + shadow rollouts\ngRPC + REST endpoints\nModel versioning', 'green')
        n(s, 'vllm', 'vLLM Serving\nPaged attention\nContinuous batching\nOpenAI-compatible API\nTensor parallelism', 'green')

    n(g, 'autoscale', 'Auto-scaling\nKEDA (queue depth)\nHPA (custom metrics)\nCluster-autoscaler (nodes)\nProvisioner / Karpenter', 'gold')

    e(g, 'gpu_pool', 'device_plugin', 'advertise\nGPU caps')
    e(g, 'device_plugin', 'mig', 'partition\nGPU')
    e(g, 'device_plugin', 'mps', 'share\nGPU')
    e(g, 'mig', 'pytorchjob', 'allocate\nGPU slices')
    e(g, 'mps', 'pytorchjob', 'shared\nGPU time')
    e(g, 'pytorchjob', 'kserve', 'trained\nmodel', '#22c55e')
    e(g, 'batch', 'kserve', 'batch\ninference', '#22c55e')
    e(g, 'pytorchjob', 'vllm', 'LLM\ncheckpoint', '#22c55e')
    e(g, 'autoscale', 'pytorchjob', 'scale\nreplicas', '#f59e0b', 'dashed')
    e(g, 'autoscale', 'kserve', 'scale\nreplicas', '#f59e0b', 'dashed')

    g.render(os.path.join(OUT, 'k8s-ai-ml'), cleanup=True)
    print('  k8s-ai-ml.png')


# ─────────────────────────────────────────────────────────────────────
# k8s-api-aggregation.png — K8s API Aggregation Layer
# ─────────────────────────────────────────────────────────────────────
def diag_k8s_api_aggregation():
    g = base_graph('k8s_api_aggregation',
                   'K8s API Aggregation — Extension API Servers & Webhooks',
                   size='9,5!', nodesep='1.0', ranksep='1.1')

    n(g, 'client', 'kubectl / client-go\nAPI discovery\nOpenAPI v3 schema\nKubeconfig contexts', 'gray')
    n(g, 'apiserver', 'kube-apiserver\nCore API groups\n/api/v1  /apis/*\nEtcd-backed storage\nAuthn + Authz + Admission', 'navy')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'agg_layer', 'Aggregation Layer\nkube-aggregator\nAPIService CRD\nReverse-proxy to extension\n/apis/<group>/<version>', 'teal')
        n(s, 'admission', 'Admission Control\nMutatingWebhookConfig\nValidatingWebhookConfig\nOPA Gatekeeper\nKyverno policies', 'red')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'metrics', 'metrics-server\nCustom Metrics API\nExternal Metrics API\nUsed by HPA / VPA\nPrometheus Adapter', 'green')
        n(s, 'ext_api', 'Extension API Server\n(e.g. cert-manager)\napiregistration.k8s.io\nAPIService object\nDelegated authn/authz', 'purple')
        n(s, 'crd', 'CRD / Custom Resources\nCustomResourceDefinition\nNo extra server process\nOpenAPI schema validation\nPrune unknown fields', 'sky')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'mutate', 'MutatingWebhook\nSidecar inject\nDefault field values\nModify request object\nReinvocation policy', 'amber')
        n(s, 'validate', 'ValidatingWebhook\nPolicy enforcement\nReject on violation\nDry-run supported\nFailurePolicy: Fail/Ignore', 'amber')

    e(g, 'client', 'apiserver', 'HTTPS/TLS\nauthn + authz')
    e(g, 'apiserver', 'agg_layer', 'proxy\n/apis/<group>')
    e(g, 'apiserver', 'admission', 'admission\nchain')
    e(g, 'agg_layer', 'metrics', 'forward\nrequest')
    e(g, 'agg_layer', 'ext_api', 'forward\nrequest')
    e(g, 'apiserver', 'crd', 'built-in\nextension')
    e(g, 'admission', 'mutate', 'webhook\ncall')
    e(g, 'admission', 'validate', 'webhook\ncall')

    g.render(os.path.join(OUT, 'k8s-api-aggregation'), cleanup=True)
    print('  k8s-api-aggregation.png')


# ─────────────────────────────────────────────────────────────────────
# k8s-core-resources.png — K8s Core Resources
# ─────────────────────────────────────────────────────────────────────
def diag_k8s_core_resources():
    g = base_graph('k8s_core_resources',
                   'K8s Core Resources — Workloads · Networking · Config · Storage',
                   size='9,5!', nodesep='1.0', ranksep='1.1')

    n(g, 'deploy', 'Deployment\nDesired replicas\nRolling / Recreate strategy\nRevision history limit\nPaused / scaling triggers', 'navy')
    n(g, 'rs', 'ReplicaSet\nPod template hash\nMaintains pod count\nOwned by Deployment\nOrphan on delete', 'sky')
    n(g, 'pod', 'Pod\nOne+ containers\nShared net namespace\nShared IPC + PID (opt)\nEphemeral IP assigned', 'teal')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'configmap', 'ConfigMap\nNon-secret config data\nMount as volume / file\nenvFrom / valueFrom\nImmutable flag (1.21+)', 'green')
        n(s, 'secret', 'Secret\nBase64-encoded values\nopaque / tls / dockercfg\nEncrypted at rest (KMS)\nenvFrom / volumeMount', 'red')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'svc', 'Service\nClusterIP / NodePort\nLoadBalancer / ExternalName\nkube-proxy: iptables/IPVS\nStable DNS + VIP', 'purple')
        n(s, 'ingress', 'Ingress\nL7 HTTP routing\nHost + path rules\nTLS termination\nAnnotations per controller', 'purple')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'pvc', 'PersistentVolumeClaim\nStorage request\nAccessMode: RWO/RWX/ROX\nStorageClass binding\nvolumeName binding', 'gold')
        n(s, 'pv', 'PersistentVolume\nBacked by EBS/GCE/NFS\nReclaimPolicy: Retain/Delete\nVolumeMode: Block/Filesystem\nCSI driver lifecycle', 'gold')

    e(g, 'deploy', 'rs', 'owns +\ncontrols')
    e(g, 'rs', 'pod', 'creates +\nmaintains')
    e(g, 'configmap', 'pod', 'envFrom\nor volume', '#22c55e', 'dashed')
    e(g, 'secret', 'pod', 'env / vol\nmount', '#ef4444', 'dashed')
    e(g, 'svc', 'pod', 'selects via\nlabel selector')
    e(g, 'ingress', 'svc', 'routes\nHTTP traffic')
    e(g, 'pvc', 'pod', 'volumeMount\nin spec')
    e(g, 'pvc', 'pv', 'binds\nto PV')

    g.render(os.path.join(OUT, 'k8s-core-resources'), cleanup=True)
    print('  k8s-core-resources.png')


# ─────────────────────────────────────────────────────────────────────
# k8s-evictions.png — K8s Eviction & QoS Classes
# ─────────────────────────────────────────────────────────────────────
def diag_k8s_evictions():
    g = base_graph('k8s_evictions',
                   'K8s Eviction — QoS Classes & Kubelet Eviction Flow',
                   size='9,5!', nodesep='1.0', ranksep='1.1')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'guaranteed', 'Guaranteed\nrequests == limits\nfor ALL containers\nOOM score: 0\nLast to be evicted', 'green')
        n(s, 'burstable', 'Burstable\nrequests < limits\nor partial resources\nOOM score: 1–999\nEvicted 2nd', 'gold')
        n(s, 'besteffort', 'BestEffort\nNo requests or limits\nOOM score: 1000\nFirst to be evicted\nHighest kernel priority', 'red')

    n(g, 'kubelet', 'Kubelet\nEviction Manager\nPolls every --housekeeping-interval\n--eviction-hard / --eviction-soft\n--eviction-pressure-transition-period', 'navy')

    n(g, 'signals', 'Eviction Signals\nmemory.available\nnodefs.available\nnodefs.inodesFree\nimagefs.available\npid.available', 'purple')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'soft', 'Soft Eviction\nThreshold + grace period\nPod receives SIGTERM\nGracefulTerminationPeriod\nAllows graceful shutdown', 'teal')
        n(s, 'hard', 'Hard Eviction\nImmediate SIGKILL\neviction-hard config\nNo grace period\nNode pressure condition', 'red')

    n(g, 'oom', 'OOM Killer (kernel)\nActs before kubelet\nOOM score 0–1000\nHigher = killed sooner\nBestEffort pods first', 'red')

    e(g, 'guaranteed', 'kubelet', 'priority 3\n(last resort)', '#22c55e')
    e(g, 'burstable', 'kubelet', 'priority 2\n(mid)', '#f59e0b')
    e(g, 'besteffort', 'kubelet', 'priority 1\n(first)', '#ef4444')
    e(g, 'kubelet', 'signals', 'monitors\ncontinuously')
    e(g, 'signals', 'soft', 'below soft\nthreshold')
    e(g, 'signals', 'hard', 'below hard\nthreshold')
    e(g, 'oom', 'besteffort', 'kills first\n(score 1000)', '#ef4444', 'dashed')
    e(g, 'kubelet', 'oom', 'triggers on\nextreme mem pressure', '#ef4444', 'dashed')

    g.render(os.path.join(OUT, 'k8s-evictions'), cleanup=True)
    print('  k8s-evictions.png')


# ─────────────────────────────────────────────────────────────────────
# k8s-local-setup.png — K8s Local Dev Tools
# ─────────────────────────────────────────────────────────────────────
def diag_k8s_local_setup():
    g = base_graph('k8s_local_setup',
                   'K8s Local Dev — minikube · kind · k3s · Docker Desktop',
                   size='10,4!', nodesep='1.4', ranksep='1.2')

    n(g, 'usecase', 'Local K8s\nDevelopment\nUse Case', 'navy')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'minikube', 'minikube\nSingle-node cluster\nVM / container / bare-metal\nadd-ons: ingress registry dashboard\n`minikube start --driver=docker`', 'teal')
        n(s, 'kind', 'kind\n(K8s in Docker)\nMulti-node in containers\nCI-friendly, fast boot\nHA control-plane support\n`kind create cluster --config f.yaml`', 'green')
        n(s, 'k3s', 'k3s (Rancher)\nLightweight K8s < 100 MB\nArm64 / IoT / Edge\nTraefik + SQLite default\nk3d wraps in Docker\n`curl -sfL get.k3s.io | sh -`', 'purple')
        n(s, 'dd', 'Docker Desktop\nOne-click enable K8s\nmacOS / Windows WSL2\nIntegrated hypervisor\nAutomatic context switch\nContext: docker-desktop', 'sky')

    n(g, 'tools', 'Common Tooling\nkubectl  helm  Tilt\nSkaffold  DevSpace  ctlptl\nkubeconfig: ~/.kube/config\nContext switch: kubectx', 'gold')

    e(g, 'usecase', 'minikube')
    e(g, 'usecase', 'kind')
    e(g, 'usecase', 'k3s')
    e(g, 'usecase', 'dd')
    e(g, 'minikube', 'tools', 'context\nmerge')
    e(g, 'kind', 'tools', 'context\nmerge')
    e(g, 'k3s', 'tools', 'context\nmerge')
    e(g, 'dd', 'tools', 'context\nmerge')

    g.render(os.path.join(OUT, 'k8s-local-setup'), cleanup=True)
    print('  k8s-local-setup.png')


# ─────────────────────────────────────────────────────────────────────
# k8s-networking-cni.png — CNI Plugins (portrait → landscape redesign)
# ─────────────────────────────────────────────────────────────────────
def diag_k8s_networking_cni():
    g = base_graph('k8s_networking_cni',
                   'K8s Networking — CNI Plugins: Calico · Flannel · Cilium',
                   rankdir='LR', size='10,5!', nodesep='1.0', ranksep='1.1')

    n(g, 'pod', 'Pod\nveth pair created\nNetwork namespace\nIP-per-pod model\nPod CIDR per node', 'navy')

    n(g, 'cni_if', 'CNI Interface\n/etc/cni/net.d/\n10-*.conflist\nCalled by kubelet\non pod add / del / check', 'teal')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'calico', 'Calico\nBGP-based routing\nFull NetworkPolicy\neBPF or iptables dataplane\nFelixd + BIRD daemons\nWireGuard encryption opt', 'purple')
        n(s, 'flannel', 'Flannel\nVXLAN overlay\nSimple subnet-per-node\nNo NetworkPolicy built-in\nflanneld DaemonSet\nPair with Calico for policy', 'green')
        n(s, 'cilium', 'Cilium\neBPF native dataplane\nL3/L4/L7 NetworkPolicy\nHubble observability\nGateway API support\nWireGuard + IPsec opt', 'gold')

    n(g, 'overlay', 'Node Network\nVXLAN / BGP peering\nWireGuard tunnels\nPod CIDR: 10.244.0.0/16\nCross-node pod routing', 'sky')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'kube_proxy', 'kube-proxy\niptables / IPVS mode\nService ClusterIP → PodIP\nNodePort / LoadBalancer\nEndpointSlice controller', 'navy')
        n(s, 'coredns', 'CoreDNS\nService discovery\n<svc>.<ns>.svc.cluster.local\nNdots + search domains\nPlugin chain: forward etc', 'gray')

    e(g, 'pod', 'cni_if', 'attach\nveth')
    e(g, 'cni_if', 'calico', 'plugin\nselected')
    e(g, 'cni_if', 'flannel', 'plugin\nselected')
    e(g, 'cni_if', 'cilium', 'plugin\nselected')
    e(g, 'calico', 'overlay', 'BGP\npeering')
    e(g, 'flannel', 'overlay', 'VXLAN\ntunnel')
    e(g, 'cilium', 'overlay', 'eBPF\nroutes')
    e(g, 'overlay', 'kube_proxy', 'service\nrouting', '#475569', 'dashed')
    e(g, 'overlay', 'coredns', 'DNS\nresolution', '#475569', 'dashed')

    g.render(os.path.join(OUT, 'k8s-networking-cni'), cleanup=True)
    print('  k8s-networking-cni.png')


# ─────────────────────────────────────────────────────────────────────
# k8s-security.png — K8s Security Layers
# ─────────────────────────────────────────────────────────────────────
def diag_k8s_security():
    g = base_graph('k8s_security',
                   'K8s Security — RBAC · Network Policies · Pod Security · Encryption',
                   size='9,5!', nodesep='1.0', ranksep='1.1')

    n(g, 'authn', 'Authentication\nX.509 client certs\nServiceAccount JWT (OIDC)\nWebhook token review\nOIDC identity provider\nKubeconfig contexts', 'navy')

    n(g, 'authz', 'Authorization (RBAC)\nRole / ClusterRole\nRoleBinding / ClusterRoleBinding\nVerbs: get list watch create\nLeast-privilege principle', 'navy')

    n(g, 'admission', 'Admission Control\nOPA Gatekeeper\nKyverno policy engine\nPodSecurity admission plugin\nImage signing (cosign / Sigstore)', 'red')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'netpol', 'Network Policies\nIngress + egress rules\nPod / NS selectors\nDefault deny-all baseline\nCNI-enforced (Calico/Cilium)', 'teal')
        n(s, 'psa', 'Pod Security\nPrivileged / Baseline\nRestricted profiles\nrunAsNonRoot: true\ncapabilities drop: ALL', 'gold')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'secrets', 'Secrets Encryption at Rest\nEncryptionConfiguration\nKMS provider (AWS KMS / Vault)\nAES-GCM provider (default)\nSeal secrets (Bitnami)', 'purple')
        n(s, 'audit', 'Audit Logging\nAPI server audit policy\nNone / Metadata / Request\n/ RequestResponse levels\nSIEM / Falco integration', 'sky')

    n(g, 'supply', 'Supply Chain Security\nImage scanning (Trivy / Grype)\nSBOM generation (Syft)\nSLSA provenance attestation\ncosign verify on admission', 'green')

    e(g, 'authn', 'authz', 'identity\nconfirmed')
    e(g, 'authz', 'admission', 'request\npasses')
    e(g, 'admission', 'netpol', 'pod\nallowed')
    e(g, 'admission', 'psa', 'security\nprofile check')
    e(g, 'netpol', 'secrets', 'runtime\ndata protection', '#475569', 'dashed')
    e(g, 'psa', 'audit', 'events\nlogged', '#475569', 'dashed')
    e(g, 'admission', 'supply', 'image\npolicy gate', '#22c55e', 'dashed')

    g.render(os.path.join(OUT, 'k8s-security'), cleanup=True)
    print('  k8s-security.png')


# ─────────────────────────────────────────────────────────────────────
# f7-dockerfile-reference.png — 4-column grid of Dockerfile instructions
# ─────────────────────────────────────────────────────────────────────
def diag_dockerfile_reference():
    """4-column × 4-row grid.  TB rankdir + rank='same' per row.
    Columns: (FROM RUN USER ENTRYPOINT) | (ARG COPY EXPOSE HEALTHCHECK)
             (ENV ADD VOLUME ONBUILD)   | (LABEL WORKDIR CMD SHELL)
    """
    g = graphviz.Digraph('f7_dockerfile', format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.5',
           nodesep='0.55', ranksep='0.75',
           splines='ortho', rankdir='TB',
           size='10,6!', ratio='fill',
           label='  Dockerfile Instruction Reference  ', labelloc='t',
           fontsize='14', fontname='Helvetica', fontcolor='#1e293b')

    NDF = dict(shape='box', style='filled,rounded', fontname='Helvetica',
               fontsize='11', penwidth='1.5', height='0.65', margin='0.22,0.12',
               width='2.9')

    def nd(name, label, c='navy'):
        g.node(name, label,
               fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NDF)

    def inv(a, b):
        g.edge(a, b, style='invis', weight='10')

    def row_arrow(a, b, label=''):
        g.edge(a, b, label=f' {label} ' if label else '',
               color='#94a3b8', style='dashed',
               fontname='Helvetica', fontsize='9',
               fontcolor='#94a3b8', penwidth='1.0',
               constraint='true')

    # ── Row 1: base image & build-time metadata ──────────────────────
    with g.subgraph() as s:
        s.attr(rank='same')
        nd('FROM', 'FROM\nimage[:tag] [AS name]\nBase image / build stage\nMulti-stage: FROM … AS build\nScratch for minimal images', 'navy')
        nd('ARG',  'ARG\nname[=default]\nBuild-time variable only\nNot persisted in image layers\nOverride: --build-arg key=val', 'teal')
        nd('ENV',  'ENV\nkey=value …\nPersisted in final image\nAvailable at build + runtime\nOverride: docker run -e KEY=val', 'green')
        nd('LABEL','LABEL\nkey=value …\nImage metadata / OCI labels\nInspect: docker inspect\norg.opencontainers.image.*', 'gray')

    # ── Row 2: build actions ─────────────────────────────────────────
    with g.subgraph() as s:
        s.attr(rank='same')
        nd('RUN',     'RUN\ncommand / ["exec","arg"]\nCreates new layer on each call\nCache-busted by checksum\nCombine with && to reduce layers', 'navy')
        nd('COPY',    'COPY\n[--from=stage] src dst\nCopy files into layer\nPrefer over ADD for local files\n--chown=user:group', 'teal')
        nd('ADD',     'ADD\nsrc dst\nAuto-extract .tar.gz/.xz\nURL fetch (prefer COPY+curl)\nLess predictable than COPY', 'gold')
        nd('WORKDIR', 'WORKDIR\n/path/in/container\nCreates dir if missing\nRelative to previous WORKDIR\nAffects RUN/COPY/CMD/EP', 'green')

    # ── Row 3: runtime configuration ─────────────────────────────────
    with g.subgraph() as s:
        s.attr(rank='same')
        nd('USER',   'USER\nuser[:group]  or  UID[:GID]\nRun as non-root (security)\nApplies to RUN/CMD/EP after\nno-new-privileges security opt', 'red')
        nd('EXPOSE', 'EXPOSE\nport[/protocol]\nDocumentation only\nDoes NOT publish port\nUse -p PORT or --publish', 'sky')
        nd('VOLUME', 'VOLUME\n["/data"] or /path\nDeclares mount point\nAnonymous volume on docker run\nData persists beyond container', 'purple')
        nd('CMD',    'CMD\n["exec","param"] / shell form\nDefault command or args to EP\nFully overridable at runtime\nOnly last CMD takes effect', 'navy')

    # ── Row 4: entrypoint & advanced ─────────────────────────────────
    with g.subgraph() as s:
        s.attr(rank='same')
        nd('ENTRYPOINT', 'ENTRYPOINT\n["exec","cmd"] / shell form\nFixed container executable\nCMD provides default args\nOverride: --entrypoint flag', 'red')
        nd('HEALTHCHECK','HEALTHCHECK\n--interval --timeout --retries\nCMD curl -f http://localhost/\nExit 0=healthy 1=unhealthy\nCombined with --start-period', 'gold')
        nd('ONBUILD',    'ONBUILD <instruction>\nDeferred trigger instruction\nFires when image used as base\nUseful for base image templates\nNot inherited past one level', 'teal')
        nd('SHELL',      'SHELL\n["powershell","-Command"]\nOverride default shell\n/bin/sh -c on Linux\ncmd /S /C on Windows', 'gray')

    # Invisible ordering edges within each row (left → right columns)
    inv('FROM', 'ARG');   inv('ARG', 'ENV');   inv('ENV', 'LABEL')
    inv('RUN', 'COPY');   inv('COPY', 'ADD');   inv('ADD', 'WORKDIR')
    inv('USER', 'EXPOSE'); inv('EXPOSE', 'VOLUME'); inv('VOLUME', 'CMD')
    inv('ENTRYPOINT', 'HEALTHCHECK'); inv('HEALTHCHECK', 'ONBUILD'); inv('ONBUILD', 'SHELL')

    # Visible column-flow edges (row 1 → 2 → 3 → 4, column 1 only)
    row_arrow('FROM', 'RUN', 'build\nstage')
    row_arrow('RUN',  'USER', 'exec\nsetup')
    row_arrow('USER', 'ENTRYPOINT', 'entry\npoint')

    g.render(os.path.join(OUT, 'f7-dockerfile-reference'), cleanup=True)
    print('  f7-dockerfile-reference.png')


def main():
    print('Generating wide DevOps orphan diagrams...')
    diag_bazel()
    diag_k8s_ai_ml()
    diag_k8s_api_aggregation()
    diag_k8s_core_resources()
    diag_k8s_evictions()
    diag_k8s_local_setup()
    diag_k8s_networking_cni()
    diag_k8s_security()
    diag_dockerfile_reference()
    print(f'\nAll 9 diagrams written to {OUT}')


if __name__ == '__main__':
    main()
