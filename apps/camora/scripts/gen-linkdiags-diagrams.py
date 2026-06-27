#!/usr/bin/env python3
import graphviz, os

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica',
            fontsize='12', penwidth='1.5', height='0.45', margin='0.15,0.08')
EDGE = dict(fontname='Helvetica', fontsize='10', penwidth='1.5')
C = {
    'navy':   ('#dbeafe', '#3b82f6', '#1e40af'),
    'gold':   ('#fef3c7', '#f59e0b', '#92400e'),
    'green':  ('#dcfce7', '#22c55e', '#166534'),
    'red':    ('#fee2e2', '#ef4444', '#991b1b'),
    'purple': ('#e0e7ff', '#6366f1', '#3730a3'),
    'teal':   ('#ccfbf1', '#14b8a6', '#115e59'),
    'cyan':   ('#cffafe', '#06b6d4', '#155e75'),
    'gray':   ('#f3f4f6', '#6b7280', '#374151'),
}
def n(g, name, label, c='navy'):
    g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)
def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)
def base_graph(name, title, rankdir='LR'):
    g = graphviz.Digraph(name, format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.25', nodesep='0.5', ranksep='0.45',
           splines='spline', rankdir=rankdir,
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica Bold', fontcolor='#1e293b')
    return g


OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'linkdiags')
os.makedirs(OUT, exist_ok=True)


# ─── ansible-architecture ─────────────────────────────────────────────────────

def diag_ansible_architecture():
    g = base_graph('ansible_arch', 'Ansible Architecture — Agentless Automation via SSH', rankdir='LR')
    n(g, 'ctrl',  'Control Node\n(Ansible Server)\nPlaybooks, Inventory\nAnsible installed here', 'navy')
    n(g, 'inv',   'Inventory\n(hosts.ini / YAML)\nGroup hosts by role', 'gold')
    n(g, 'pb',    'YAML Playbook\nTasks, Handlers\nVariables, Roles', 'purple')
    n(g, 'ssh',   'SSH Connection\n(no agent needed)\nPort 22 / key auth', 'teal')
    n(g, 'n1',    'Managed Node 1\nLinux Server\n(any distro)', 'green')
    n(g, 'n2',    'Managed Node 2\nWeb Server\n(nginx/apache)', 'green')
    n(g, 'n3',    'Managed Node 3\nDB Server\n(postgres/mysql)', 'green')
    n(g, 'idem',  'Idempotent\nRun multiple times\n= same result', 'gray')

    e(g, 'inv',  'ctrl',  'defines targets')
    e(g, 'pb',   'ctrl',  'executes')
    e(g, 'ctrl', 'ssh',   'connects via')
    e(g, 'ssh',  'n1',    'push modules')
    e(g, 'ssh',  'n2',    'push modules')
    e(g, 'ssh',  'n3',    'push modules')
    e(g, 'ctrl', 'idem',  'guarantees', '#6b7280', 'dashed')

    g.render(os.path.join(OUT, 'ansible-architecture'), cleanup=True)
    print('Generated: ansible-architecture')


# ─── ansible-modules ──────────────────────────────────────────────────────────

def diag_ansible_modules():
    g = base_graph('ansible_mods', 'Ansible Modules — Common Tasks & Use Cases', rankdir='TB')
    n(g, 'core',    'Ansible Module\n(python script\npushed to node)', 'navy')
    n(g, 'ping',    'ping\nCheck connectivity\nverify Python', 'green')
    n(g, 'command', 'command\nRun Linux commands\n(no shell expansion)', 'teal')
    n(g, 'shell',   'shell\nExecute scripts\n(pipes, redirects OK)', 'teal')
    n(g, 'copy',    'copy\nTransfer files\nsrc → dest on node', 'gold')
    n(g, 'service', 'service\nstart / stop\nenable / restart', 'purple')
    n(g, 'user',    'user\nCreate/delete users\nset shell/group/home', 'purple')
    n(g, 'pkg',     'apt / yum / dnf\nInstall packages\nstate: present/absent', 'red')
    n(g, 'tmpl',    'template\nJinja2 → rendered file\nvars injected at run', 'cyan')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('ping')
        s.node('command')
        s.node('shell')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('copy')
        s.node('service')
        s.node('user')
        s.node('pkg')
        s.node('tmpl')

    e(g, 'core', 'ping')
    e(g, 'core', 'command')
    e(g, 'core', 'shell')
    e(g, 'core', 'copy')
    e(g, 'core', 'service')
    e(g, 'core', 'user')
    e(g, 'core', 'pkg')
    e(g, 'core', 'tmpl')

    g.render(os.path.join(OUT, 'ansible-modules'), cleanup=True)
    print('Generated: ansible-modules')


# ─── ansible-roles-vs-collections ─────────────────────────────────────────────

def diag_ansible_roles_vs_collections():
    g = base_graph('ansible_roles', 'Ansible Roles vs Collections — Reuse & Sharing', rankdir='TB')
    n(g, 'role',     'Role\n(project-level reuse)\ntasks/handlers/templates\nvars/defaults/files', 'navy')
    n(g, 'rt',       'tasks/\nmain.yml', 'teal')
    n(g, 'rh',       'handlers/\nmain.yml', 'teal')
    n(g, 'rv',       'vars/ defaults/\ntemplates/ files/', 'teal')
    n(g, 'coll',     'Collection\n(shareable package)\nroles + modules\n+ plugins + playbooks', 'purple')
    n(g, 'cr',       'roles/', 'purple')
    n(g, 'cm',       'plugins/\nmodules/', 'purple')
    n(g, 'cd',       'docs/\nREADME', 'purple')
    n(g, 'flow',     'Collection\n→ contains Roles\n→ contain Tasks\n(Galaxy / Automation Hub)', 'gold')

    e(g, 'role', 'rt')
    e(g, 'role', 'rh')
    e(g, 'role', 'rv')
    e(g, 'coll', 'cr')
    e(g, 'coll', 'cm')
    e(g, 'coll', 'cd')
    e(g, 'cr',   'role',  'includes', '#6366f1', 'dashed')
    e(g, 'coll', 'flow',  'distributes as')
    e(g, 'role', 'flow',  'bundled in')

    g.render(os.path.join(OUT, 'ansible-roles-collections'), cleanup=True)
    print('Generated: ansible-roles-collections')


# ─── k8s-architecture ─────────────────────────────────────────────────────────

def diag_k8s_architecture():
    g = base_graph('k8s_arch', 'Kubernetes Architecture — Control Plane & Worker Nodes', rankdir='TB')
    n(g, 'user',    'User / DevOps\nkubectl apply -f', 'gray')
    n(g, 'api',     'kube-apiserver\nAll cluster communication\nREST API gateway', 'navy')
    n(g, 'etcd',    'etcd\nCluster state store\nDistributed key-value', 'gold')
    n(g, 'sched',   'kube-scheduler\nAssigns pods to nodes\nbased on resources', 'purple')
    n(g, 'ctrl',    'controller-manager\nReplicaSet / Deployment\nNode / Endpoint ctrl', 'purple')
    n(g, 'kubelet', 'kubelet\nNode agent\nRuns + monitors pods', 'teal')
    n(g, 'proxy',   'kube-proxy\nNetwork rules\nService routing', 'teal')
    n(g, 'pod',     'Pod\n(1+ containers)\nshared network/storage', 'green')
    n(g, 'cri',     'Container Runtime\n(containerd / CRI-O)', 'green')

    with g.subgraph(name='cluster_cp') as cp:
        cp.attr(label='Control Plane', style='dashed', color='#3b82f6')
        cp.node('api')
        cp.node('etcd')
        cp.node('sched')
        cp.node('ctrl')
    with g.subgraph(name='cluster_wn') as wn:
        wn.attr(label='Worker Node', style='dashed', color='#14b8a6')
        wn.node('kubelet')
        wn.node('proxy')
        wn.node('pod')
        wn.node('cri')

    e(g, 'user',    'api',     'kubectl')
    e(g, 'api',     'etcd',    'read/write state')
    e(g, 'api',     'sched',   'watch unscheduled pods')
    e(g, 'api',     'ctrl',    'watch resources')
    e(g, 'sched',   'kubelet', 'bind pod to node')
    e(g, 'ctrl',    'api',     'reconcile loop')
    e(g, 'kubelet', 'cri',     'start containers')
    e(g, 'cri',     'pod',     'manages')
    e(g, 'proxy',   'pod',     'routes traffic')

    g.render(os.path.join(OUT, 'k8s-architecture'), cleanup=True)
    print('Generated: k8s-architecture')


# ─── k8s-cluster-node-pod ─────────────────────────────────────────────────────

def diag_k8s_cluster_node_pod():
    g = base_graph('k8s_hier', 'Kubernetes Hierarchy — Cluster → Node → Pod', rankdir='TB')
    n(g, 'cluster', 'Cluster\n(Apartment Complex)\nAll nodes + resources', 'navy')
    n(g, 'node1',   'Node 1\n(Building A)\nWorker machine\nVM or bare metal', 'purple')
    n(g, 'node2',   'Node 2\n(Building B)\nWorker machine', 'purple')
    n(g, 'node3',   'Node 3\n(Building C)\nWorker machine', 'purple')
    n(g, 'pod1a',   'Pod\n(Apartment 1A)\nApp container\n10.244.1.2', 'green')
    n(g, 'pod1b',   'Pod\n(Apartment 1B)\nSidecar + App\n10.244.1.3', 'green')
    n(g, 'pod2a',   'Pod\n(Apartment 2A)\nApp container\n10.244.2.2', 'teal')
    n(g, 'pod3a',   'Pod\n(Apartment 3A)\nApp container\n10.244.3.2', 'gold')
    n(g, 'pod3b',   'Pod\n(Apartment 3B)\nApp container\n10.244.3.3', 'gold')

    e(g, 'cluster', 'node1')
    e(g, 'cluster', 'node2')
    e(g, 'cluster', 'node3')
    e(g, 'node1',   'pod1a')
    e(g, 'node1',   'pod1b')
    e(g, 'node2',   'pod2a')
    e(g, 'node3',   'pod3a')
    e(g, 'node3',   'pod3b')

    g.render(os.path.join(OUT, 'k8s-cluster-node-pod'), cleanup=True)
    print('Generated: k8s-cluster-node-pod')


# ─── k8s-pod-networking ───────────────────────────────────────────────────────

def diag_k8s_pod_networking():
    g = base_graph('k8s_podnet', 'Kubernetes Pod Networking — CNI & Cross-Node Traffic', rankdir='LR')
    n(g, 'poda',  'Pod A\n10.244.1.2\nNode 1', 'green')
    n(g, 'podb',  'Pod B\n10.244.1.3\nNode 1', 'green')
    n(g, 'cni1',  'CNI Plugin\n(Node 1 veth/bridge)\nflannel / calico', 'teal')
    n(g, 'tun',   'VXLAN / IP-IP\nTunnel / Overlay\nCross-node routing', 'purple')
    n(g, 'cni2',  'CNI Plugin\n(Node 2 veth/bridge)', 'teal')
    n(g, 'podc',  'Pod C\n10.244.2.2\nNode 2', 'navy')
    n(g, 'podd',  'Pod D\n10.244.2.3\nNode 2', 'navy')
    n(g, 'svc',   'Service\nStable Virtual IP\n10.96.0.10\nkube-proxy routes', 'gold')
    n(g, 'dns',   'CoreDNS\nResolves service names\nmy-svc.default.svc\n.cluster.local', 'cyan')

    e(g, 'poda',  'cni1')
    e(g, 'podb',  'cni1')
    e(g, 'cni1',  'tun',   'cross-node')
    e(g, 'tun',   'cni2')
    e(g, 'cni2',  'podc')
    e(g, 'cni2',  'podd')
    e(g, 'svc',   'cni1',  'kube-proxy iptables')
    e(g, 'svc',   'cni2',  'kube-proxy iptables')
    e(g, 'dns',   'svc',   'name → ClusterIP')

    g.render(os.path.join(OUT, 'k8s-pod-networking'), cleanup=True)
    print('Generated: k8s-pod-networking')


# ─── k8s-kube-proxy ───────────────────────────────────────────────────────────

def diag_k8s_kube_proxy():
    g = base_graph('k8s_kproxy', 'kube-proxy — Service Traffic Routing via iptables/IPVS', rankdir='LR')
    n(g, 'client',  'Client Pod\n(caller)', 'navy')
    n(g, 'svcip',   'Service IP\nClusterIP\n10.96.0.10:80', 'gold')
    n(g, 'kproxy',  'kube-proxy\n(watches API Server)\nSets iptables/IPVS rules', 'purple')
    n(g, 'ipt',     'iptables / IPVS\nNAT rules\nLoad balance across\nendpoints', 'teal')
    n(g, 'pa',      'Pod A\n10.244.1.2:8080', 'green')
    n(g, 'pb',      'Pod B\n10.244.1.3:8080', 'green')
    n(g, 'pc',      'Pod C\n10.244.2.2:8080', 'green')
    n(g, 'api',     'kube-apiserver\nService + Endpoint\nchange events', 'gray')

    e(g, 'client',  'svcip',  'send to ClusterIP')
    e(g, 'svcip',   'ipt',    'intercepted')
    e(g, 'ipt',     'pa',     'DNAT 1/3')
    e(g, 'ipt',     'pb',     'DNAT 1/3')
    e(g, 'ipt',     'pc',     'DNAT 1/3')
    e(g, 'api',     'kproxy', 'watch events')
    e(g, 'kproxy',  'ipt',    'update rules')

    g.render(os.path.join(OUT, 'k8s-kube-proxy'), cleanup=True)
    print('Generated: k8s-kube-proxy')


# ─── k8s-service-discovery ────────────────────────────────────────────────────

def diag_k8s_service_discovery():
    g = base_graph('k8s_svcdisc', 'Kubernetes Service Discovery — DNS Resolution Flow', rankdir='LR')
    n(g, 'poda',    'Pod A\n(caller)', 'navy')
    n(g, 'coredns', 'CoreDNS\n(cluster DNS)\npayment-service\n.default.svc\n.cluster.local', 'purple')
    n(g, 'svcip',   'Service\nClusterIP\n(stable endpoint)', 'gold')
    n(g, 'eps',     'EndpointSlice\n(live pod IPs\n+ ports)', 'teal')
    n(g, 'bp1',     'Backend Pod 1\n10.244.1.4', 'green')
    n(g, 'bp2',     'Backend Pod 2\n10.244.2.5', 'green')
    n(g, 'bp3',     'Backend Pod 3\n10.244.1.7', 'green')

    e(g, 'poda',    'coredns', 'DNS query:\npayment-service\n.default.svc\n.cluster.local')
    e(g, 'coredns', 'svcip',   'returns ClusterIP')
    e(g, 'svcip',   'eps',     'finds backends')
    e(g, 'eps',     'bp1',     'route')
    e(g, 'eps',     'bp2',     'route')
    e(g, 'eps',     'bp3',     'route')

    g.render(os.path.join(OUT, 'k8s-service-discovery'), cleanup=True)
    print('Generated: k8s-service-discovery')


# ─── k8s-network-policy ───────────────────────────────────────────────────────

def diag_k8s_network_policy():
    g = base_graph('k8s_netpol', 'Kubernetes Network Policy — Ingress & Egress Rules', rankdir='LR')
    n(g, 'fe',      'FRONTEND Pod\nlabel: app=frontend\nNamespace: production', 'green')
    n(g, 'be',      'BACKEND Pod\nlabel: app=backend\nNamespace: production', 'navy')
    n(g, 'db',      'DATABASE Pod\nlabel: app=postgres\nNamespace: production', 'gold')
    n(g, 'unk',     'UNKNOWN Pod\n(no allowed label)\nor different namespace', 'red')
    n(g, 'ing',     'Ingress Rule\n(incoming traffic)\npodSelector: app=backend\nallow from: frontend', 'teal')
    n(g, 'egr',     'Egress Rule\n(outgoing traffic)\npodSelector: app=backend\nallow to: postgres', 'purple')

    e(g, 'fe',   'be',  'ALLOWED', '#22c55e')
    e(g, 'be',   'db',  'ALLOWED', '#22c55e')
    e(g, 'unk',  'be',  'BLOCKED', '#ef4444')
    e(g, 'ing',  'be',  'controls inbound', '#6b7280', 'dashed')
    e(g, 'egr',  'be',  'controls outbound', '#6b7280', 'dashed')

    g.render(os.path.join(OUT, 'k8s-network-policy'), cleanup=True)
    print('Generated: k8s-network-policy')


# ─── k8s-ingress-vs-lb ────────────────────────────────────────────────────────

def diag_k8s_ingress_vs_lb():
    g = base_graph('k8s_ingvslb', 'LoadBalancer vs Ingress — When to Use Each', rankdir='TB')
    n(g, 'user',    'User / Internet\nTraffic', 'gray')
    n(g, 'clb',     'Cloud Load Balancer\n(L4: TCP/UDP)\n$1 per LB', 'red')
    n(g, 'csvc',    'K8s Service\n(ClusterIP)', 'navy')
    n(g, 'cpods',   'Pods\n(single service)', 'green')
    n(g, 'ing',     'Ingress Controller\n(nginx/traefik/haproxy)\nL7: HTTP rules', 'purple')
    n(g, 'rules',   'Routing Rules\nhost: api.example.com\npath: /v1 → svc-a\npath: /v2 → svc-b', 'gold')
    n(g, 'svca',    'Service A\n(payment-api)', 'teal')
    n(g, 'svcb',    'Service B\n(user-api)', 'teal')
    n(g, 'pa',      'Pods A', 'green')
    n(g, 'pb',      'Pods B', 'green')
    n(g, 'note',    'LoadBalancer: simple external access\n1 service = 1 LB (costly)\nIngress: smart HTTP routing\nmany services = 1 LB (efficient)', 'gray')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('clb')
        s.node('ing')

    e(g, 'user',  'clb',   'L4 traffic')
    e(g, 'clb',  'csvc')
    e(g, 'csvc', 'cpods')
    e(g, 'user',  'ing',   'L7 HTTP/HTTPS')
    e(g, 'ing',  'rules',  'host/path match')
    e(g, 'rules','svca')
    e(g, 'rules','svcb')
    e(g, 'svca', 'pa')
    e(g, 'svcb', 'pb')

    g.render(os.path.join(OUT, 'k8s-ingress-vs-lb'), cleanup=True)
    print('Generated: k8s-ingress-vs-lb')


# ─── k8s-traffic-flow ─────────────────────────────────────────────────────────

def diag_k8s_traffic_flow():
    g = base_graph('k8s_traffic', 'Kubernetes End-to-End Traffic Flow', rankdir='LR')
    n(g, 'user',  'User\n(browser/client)', 'gray')
    n(g, 'dns',   'DNS\nResolves domain\nto LB IP', 'gold')
    n(g, 'lb',    'Load Balancer\n(cloud / MetalLB)\nExternal entry point', 'navy')
    n(g, 'ingc',  'Ingress Controller\nnginx / traefik\nTLS termination', 'purple')
    n(g, 'svc',   'K8s Service\n(ClusterIP)\nStable virtual IP', 'teal')
    n(g, 'kp',    'kube-proxy\nIPTables / IPVS\nEndpoint selection', 'cyan')
    n(g, 'pod',   'Application Pod\n(your container)\nProcesses request', 'green')
    n(g, 'ret',   'Response\nReturn path:\nPod → Svc → Ingress\n→ LB → User', 'gray')

    e(g, 'user', 'dns',  'lookup')
    e(g, 'dns',  'lb',   'resolves to')
    e(g, 'lb',   'ingc', 'forward')
    e(g, 'ingc', 'svc',  'route by rules')
    e(g, 'svc',  'kp',   'iptables NAT')
    e(g, 'kp',   'pod',  'to pod IP')
    e(g, 'pod',  'ret',  'response', '#22c55e', 'dashed')

    g.render(os.path.join(OUT, 'k8s-traffic-flow'), cleanup=True)
    print('Generated: k8s-traffic-flow')


# ─── k8s-deployment-strategies ────────────────────────────────────────────────

def diag_k8s_deployment_strategies():
    g = base_graph('k8s_deploy', 'Kubernetes Deployment Strategies — 6 Patterns', rankdir='TB')
    n(g, 'rolling',  'Rolling Update\nGradual pod replace\nV1 → V2 one by one\nDowntime: No', 'green')
    n(g, 'recreate', 'Recreate\nDelete all V1 pods\nthen create V2\nDowntime: Yes', 'red')
    n(g, 'canary',   'Canary\n80% traffic → V1\n20% traffic → V2\nMonitor, then shift\nDowntime: No', 'gold')
    n(g, 'bluegreen','Blue-Green\nBlue = V1 (live)\nGreen = V2 (staged)\nSwitch LB → instant\nDowntime: No', 'navy')
    n(g, 'ab',       'A/B Testing\nUser segment routing\nCookies / headers\nN/A downtime', 'purple')
    n(g, 'shadow',   'Shadow\nMirror 100% traffic\nto shadow cluster\nNo user impact\nDowntime: No', 'teal')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('rolling')
        s.node('recreate')
        s.node('canary')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('bluegreen')
        s.node('ab')
        s.node('shadow')

    g.render(os.path.join(OUT, 'k8s-deployment-strategies'), cleanup=True)
    print('Generated: k8s-deployment-strategies')


# ─── terraform-architecture ───────────────────────────────────────────────────

def diag_terraform_architecture():
    g = base_graph('tf_arch', 'Terraform Architecture — Config to Infrastructure', rankdir='LR')
    n(g, 'cfg',    'Config Files\n(.tf / .tfvars)\nmain.tf, variables.tf\noutputs.tf', 'navy')
    n(g, 'core',   'Terraform Core\nplan / apply / destroy\nstate management\ndependency graph', 'purple')
    n(g, 'state',  'State File\n(terraform.tfstate)\nremembers existing\nresources', 'gold')
    n(g, 'prov',   'Providers\n(AWS / GCP / Azure\nnginx / k8s / vault)\nplugin binary', 'teal')
    n(g, 'api',    'Cloud APIs\n(REST/gRPC calls\nto cloud control plane)', 'gray')
    n(g, 'infra',  'Infrastructure\nEC2 / VPC / RDS\nContainers / DNS', 'green')
    n(g, 'wf',     'Workflow:\nwrite .tf\n→ init → plan\n→ apply → verify', 'cyan')

    e(g, 'cfg',   'core',  'parsed by')
    e(g, 'core',  'state', 'reads/writes')
    e(g, 'core',  'prov',  'calls provider')
    e(g, 'prov',  'api',   'API requests')
    e(g, 'api',   'infra', 'creates/updates')
    e(g, 'infra', 'state', 'recorded in', '#f59e0b', 'dashed')
    e(g, 'wf',    'core',  'drives', '#6b7280', 'dashed')

    g.render(os.path.join(OUT, 'terraform-architecture'), cleanup=True)
    print('Generated: terraform-architecture')


# ─── terraform-cicd ───────────────────────────────────────────────────────────

def diag_terraform_cicd():
    g = base_graph('tf_cicd', 'Terraform CI/CD Pipeline — GitOps Infrastructure', rankdir='LR')
    n(g, 'commit',  'Code Commit\n(.tf pushed\nto git)', 'gray')
    n(g, 'val',     'Validate\nterraform validate\nsyntax check', 'navy')
    n(g, 'fmt',     'Format Check\nterraform fmt -check\nconsistency', 'navy')
    n(g, 'init',    'Terraform Init\ndownload providers\nset up backend', 'teal')
    n(g, 'plan',    'Terraform Plan\nshow what changes\nwill happen', 'purple')
    n(g, 'policy',  'Policy Check\nSentinel / OPA\nsecurity gates', 'red')
    n(g, 'approve', 'Manual Approval\n(for prod)\nor auto for dev', 'gold')
    n(g, 'apply',   'Terraform Apply\ncreate/update/delete\nreal resources', 'green')
    n(g, 'cloud',   'Cloud\nInfrastructure\nprovisioned', 'green')
    n(g, 's3',      'Remote State\nS3 (tfstate)\nDynamoDB (lock)', 'gold')

    e(g, 'commit', 'val')
    e(g, 'val',    'fmt')
    e(g, 'fmt',    'init')
    e(g, 'init',   'plan')
    e(g, 'plan',   'policy')
    e(g, 'policy', 'approve')
    e(g, 'approve','apply')
    e(g, 'apply',  'cloud')
    e(g, 'apply',  's3',   'update state')
    e(g, 's3',     'plan', 'read state', '#f59e0b', 'dashed')

    g.render(os.path.join(OUT, 'terraform-cicd'), cleanup=True)
    print('Generated: terraform-cicd')


# ─── terraform-count-for-each ─────────────────────────────────────────────────

def diag_terraform_count_for_each():
    g = base_graph('tf_count', 'Terraform count vs for_each — Indexed vs Named Resources', rankdir='TB')
    n(g, 'count',   'count = 3\nNumeric index\nresource[0][1][2]\nChanging list\nreorders/destroys', 'red')
    n(g, 'c0',      'aws_instance[0]', 'navy')
    n(g, 'c1',      'aws_instance[1]', 'navy')
    n(g, 'c2',      'aws_instance[2]', 'navy')
    n(g, 'foreach', 'for_each = {dev, test, prod}\nNamed stable keys\nresource["dev"]\nSafe for production', 'green')
    n(g, 'fdev',    'aws_instance["dev"]', 'teal')
    n(g, 'ftst',    'aws_instance["test"]', 'teal')
    n(g, 'fprd',    'aws_instance["prod"]', 'teal')
    n(g, 'note',    'count = indexed copies\nfor_each = stable named resources\nUse for_each in production', 'gold')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('count')
        s.node('foreach')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('c0')
        s.node('c1')
        s.node('c2')
        s.node('fdev')
        s.node('ftst')
        s.node('fprd')

    e(g, 'count',   'c0')
    e(g, 'count',   'c1')
    e(g, 'count',   'c2')
    e(g, 'foreach', 'fdev')
    e(g, 'foreach', 'ftst')
    e(g, 'foreach', 'fprd')

    g.render(os.path.join(OUT, 'terraform-count-for-each'), cleanup=True)
    print('Generated: terraform-count-for-each')


# ─── ci-vs-cd ─────────────────────────────────────────────────────────────────

def diag_ci_vs_cd():
    g = base_graph('ci_vs_cd', 'CI vs CD — Continuous Integration & Delivery/Deployment', rankdir='LR')
    n(g, 'push',   'Code Push\ngit commit + push\ndeveloper action', 'gray')
    n(g, 'build',  'Build\ncompile / lint\ndependency install', 'navy')
    n(g, 'test',   'Test\nunit / integration\ncoverage check', 'navy')
    n(g, 'merge',  'Merge Ready\nPR approved\n(CI gate passed)', 'green')
    n(g, 'ci',     'CI\n(Jenkins / GitHub Actions\nCircleCI / GitLab CI)\nchecks code quality', 'teal')
    n(g, 'art',    'Artifact\n(Docker image\nor build package)', 'gold')
    n(g, 'stage',  'Staging\ndeploy + smoke\ntests', 'navy')
    n(g, 'appr',   'Approval\n(manual gate)\nor auto deploy', 'purple')
    n(g, 'prod',   'Production\nLive environment\nvalue delivered', 'green')
    n(g, 'cd',     'CD\n(ArgoCD / Spinnaker\nFlux / Jenkins CD)\ndelivers value', 'purple')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('build')
        s.node('test')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('stage')
        s.node('appr')

    e(g, 'push',  'build')
    e(g, 'build', 'test')
    e(g, 'test',  'merge')
    e(g, 'ci',    'merge',  'gates', '#6b7280', 'dashed')
    e(g, 'merge', 'art',    'package')
    e(g, 'art',   'stage')
    e(g, 'stage', 'appr')
    e(g, 'appr',  'prod')
    e(g, 'cd',    'prod',   'automates', '#6b7280', 'dashed')

    g.render(os.path.join(OUT, 'ci-vs-cd'), cleanup=True)
    print('Generated: ci-vs-cd')


# ─── jenkins-architecture ─────────────────────────────────────────────────────

def diag_jenkins_architecture():
    g = base_graph('jenkins_arch', 'Jenkins Architecture — Controller & Distributed Agents', rankdir='TB')
    n(g, 'dev',    'Developer\ngit push / PR', 'gray')
    n(g, 'gh',     'GitHub / GitLab\n(SCM webhook\ntriggers build)', 'navy')
    n(g, 'ctrl',   'Jenkins Controller\njob scheduling\npipeline orchestration\ncredentials + plugins\nuser access control', 'purple')
    n(g, 'ba',     'Build Agent\ncompile\nunit tests\n(Java/Node/Python)', 'teal')
    n(g, 'da',     'Docker Agent\nbuild image\npush to registry', 'teal')
    n(g, 'dpa',    'Deploy Agent\nkubectl apply\nor cloud deploy', 'teal')
    n(g, 'flow',   'Pipeline:\nCode → Build → Test\n→ Scan → Package\n→ Deploy', 'gold')
    n(g, 'reg',    'Container Registry\n(ECR / DockerHub\n/ Nexus)', 'green')

    e(g, 'dev',  'gh',   'push')
    e(g, 'gh',   'ctrl', 'webhook trigger')
    e(g, 'ctrl', 'ba',   'dispatch job')
    e(g, 'ctrl', 'da',   'dispatch job')
    e(g, 'ctrl', 'dpa',  'dispatch job')
    e(g, 'ba',   'flow',  'executes')
    e(g, 'da',   'reg',   'push image')
    e(g, 'dpa',  'flow',  'deploys')

    g.render(os.path.join(OUT, 'jenkins-architecture'), cleanup=True)
    print('Generated: jenkins-architecture')


# ─── docker-architecture ──────────────────────────────────────────────────────

def diag_docker_architecture():
    g = base_graph('docker_arch', 'Docker Architecture — Client, Daemon & Registry', rankdir='LR')
    n(g, 'user',    'User\ndocker commands\n(CLI)', 'gray')
    n(g, 'client',  'Docker Client\n(docker CLI)\nTranslates commands\nto REST API calls', 'navy')
    n(g, 'api',     'REST API\n/var/run/docker.sock\nHTTP over Unix socket', 'teal')
    n(g, 'daemon',  'Docker Daemon\n(dockerd)\norchestrates all\nDocker objects', 'purple')
    n(g, 'img',     'Images\n(read-only layers\nUFS overlay)', 'gold')
    n(g, 'ctr',     'Containers\n(image + writable\nlayer + namespaces)', 'green')
    n(g, 'net',     'Networks\n(bridge/host/overlay\nveth pairs)', 'teal')
    n(g, 'vol',     'Volumes\n(persistent data\nmanaged by docker)', 'cyan')
    n(g, 'reg',     'Docker Registry\n(Docker Hub /\nECR / private\nGHCR)', 'gray')

    e(g, 'user',   'client',  'docker run/build/pull')
    e(g, 'client', 'api',     'REST calls')
    e(g, 'api',    'daemon')
    e(g, 'daemon', 'img',     'manage')
    e(g, 'daemon', 'ctr',     'manage')
    e(g, 'daemon', 'net',     'manage')
    e(g, 'daemon', 'vol',     'manage')
    e(g, 'daemon', 'reg',     'push/pull images')
    e(g, 'img',    'ctr',     'instantiate')

    g.render(os.path.join(OUT, 'docker-architecture'), cleanup=True)
    print('Generated: docker-architecture')


# ─── docker-networking ────────────────────────────────────────────────────────

def diag_docker_networking():
    g = base_graph('docker_net', 'Docker Networking Modes — Bridge, Host & None', rankdir='TB')
    n(g, 'bridge',  'Bridge (default)\nPrivate internal IP\n172.17.0.x\nInternal DNS\nPort mapping required\n-p 8080:80', 'navy')
    n(g, 'host',    'Host\nShares host network\nNo network isolation\nBetter performance\nNo port mapping needed', 'green')
    n(g, 'none',    'None\nLoopback only\n(127.0.0.1)\nMaximum isolation\nNo external access', 'red')
    n(g, 'overlay', 'Overlay\n(Docker Swarm)\nMulti-host networking\nVXLAN encapsulation', 'purple')
    n(g, 'usage',   'Bridge: apps/APIs\n(isolated containers)\nHost: monitoring agents\n(need host metrics)\nNone: security testing\n(air-gap isolation)', 'gold')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('bridge')
        s.node('host')
        s.node('none')
        s.node('overlay')

    g.render(os.path.join(OUT, 'docker-networking'), cleanup=True)
    print('Generated: docker-networking')


# ─── docker-volumes ───────────────────────────────────────────────────────────

def diag_docker_volumes():
    g = base_graph('docker_vols', 'Docker Volumes vs Bind Mounts — Data Persistence', rankdir='TB')
    n(g, 'ctra',   'Container A\n(writes data)', 'navy')
    n(g, 'ctrb',   'Container B\n(reads data)', 'navy')
    n(g, 'vol',    'Docker Volume\n(managed by Docker)\n/var/lib/docker/volumes/\noutside container FS\npersistent across restart', 'green')
    n(g, 'bind',   'Bind Mount\nHost directory\nmounted directly\n-v /host/path:/ctr/path\ndev-friendly', 'gold')
    n(g, 'hdir',   'Host Directory\n/home/user/data', 'gray')
    n(g, 'note',   'Volumes: production databases\npersistent app data\nBind Mounts: dev/config files\nsource code hot-reload', 'teal')

    e(g, 'ctra',  'vol',   'write to volume')
    e(g, 'ctrb',  'vol',   'read from volume')
    e(g, 'ctra',  'bind',  'write via bind')
    e(g, 'hdir',  'bind',  'host path')
    e(g, 'ctrb',  'bind',  'read via bind')
    e(g, 'vol',   'note',  'use for')
    e(g, 'bind',  'note',  'use for')

    g.render(os.path.join(OUT, 'docker-volumes'), cleanup=True)
    print('Generated: docker-volumes')


# ─── docker-compose ───────────────────────────────────────────────────────────

def diag_docker_compose():
    g = base_graph('docker_comp', 'Docker Compose — Multi-Container App Orchestration', rankdir='LR')
    n(g, 'yml',    'docker-compose.yml\nservices:\n  frontend:\n  backend:\n  db:', 'navy')
    n(g, 'dc',     'Docker Compose\ndocker compose up\ndocker compose down\norchestrates all', 'purple')
    n(g, 'fe',     'Frontend Container\nnginx / React\nport: 3000:80', 'teal')
    n(g, 'be',     'Backend Container\nNode/Python/Go\nport: 8080:8080', 'teal')
    n(g, 'db',     'Database Container\npostgres:15\nport: 5432:5432', 'gold')
    n(g, 'disc',   'Service Discovery\nContainers connect\nby service name:\ndb:5432 (not IP)', 'green')
    n(g, 'cmds',   'Commands:\ndocker compose up -d\ndocker compose logs -f\ndocker compose ps\ndocker compose build', 'gray')

    e(g, 'yml',  'dc',   'parsed by')
    e(g, 'dc',   'fe',   'create')
    e(g, 'dc',   'be',   'create')
    e(g, 'dc',   'db',   'create')
    e(g, 'be',   'db',   'db:5432')
    e(g, 'fe',   'be',   'backend:8080')
    e(g, 'disc', 'be',   'service name DNS', '#6b7280', 'dashed')
    e(g, 'disc', 'db',   'service name DNS', '#6b7280', 'dashed')

    g.render(os.path.join(OUT, 'docker-compose'), cleanup=True)
    print('Generated: docker-compose')


# ─── devsecops-pipeline ───────────────────────────────────────────────────────

def diag_devsecops_pipeline():
    g = base_graph('devsecops', 'DevSecOps Pipeline — Security Integrated into CI/CD', rankdir='LR')
    n(g, 'dev',    'Developer\ngit commit + push', 'gray')
    n(g, 'gh',     'GitHub / GitLab\nSCM + webhook', 'navy')
    n(g, 'build',  'Build & Test\ncompile, unit tests\ncoverage report', 'teal')
    n(g, 'sast',   'SAST Scan\nSemgrep / Bandit\nSonarQube\nstatic analysis', 'red')
    n(g, 'dep',    'Dependency Scan\nSnyk / OWASP\nDependency-Check\nvuln in libs', 'red')
    n(g, 'dbld',   'Docker Build\noptimized layers\nmin base image', 'navy')
    n(g, 'iscan',  'Image Scan\nTrivy / Grype\nCVE in image layers', 'red')
    n(g, 'gate',   'Security Gates\nfail on CRITICAL\nautomated policy', 'purple')
    n(g, 'reg',    'Container\nRegistry\nECR / GHCR', 'gold')
    n(g, 'gitops', 'GitOps\n(Argo CD)\ndeploy from git', 'teal')
    n(g, 'k8s',    'Kubernetes\nCluster\nProduction', 'green')
    n(g, 'mon',    'Production\nMonitoring\nDatadog / Prometheus', 'cyan')
    n(g, 'vault',  'Secrets Management\nVault / K8s Secrets\nno secrets in code', 'gold')

    e(g, 'dev',   'gh')
    e(g, 'gh',    'build')
    e(g, 'build', 'sast')
    e(g, 'sast',  'dep')
    e(g, 'dep',   'dbld')
    e(g, 'dbld',  'iscan')
    e(g, 'iscan', 'gate')
    e(g, 'gate',  'reg',   'push on pass')
    e(g, 'reg',   'gitops','trigger sync')
    e(g, 'gitops','k8s',   'deploy')
    e(g, 'k8s',   'mon',   'observe')
    e(g, 'vault', 'k8s',   'inject secrets', '#f59e0b', 'dashed')

    g.render(os.path.join(OUT, 'devsecops-pipeline'), cleanup=True)
    print('Generated: devsecops-pipeline')


# ─── overlay-underlay ─────────────────────────────────────────────────────────

def diag_overlay_underlay():
    g = base_graph('overlay_under', 'Overlay vs Underlay Networks — Virtual over Physical', rankdir='TB')
    n(g, 'pa',     'Pod A\n10.244.1.2\n(virtual IP)', 'green')
    n(g, 'pb',     'Pod B\n10.244.1.3\n(virtual IP)', 'green')
    n(g, 'va',     'VM A\n192.168.0.10\n(virtual host)', 'teal')
    n(g, 'vb',     'VM B\n192.168.0.11\n(virtual host)', 'teal')
    n(g, 'vxlan',  'VXLAN Tunnel\n(Overlay)\nEncapsulate packet\nin UDP frame', 'purple')
    n(g, 'phy',    'Physical Servers\n(real hardware)\n10.0.1.x / 10.0.2.x', 'gray')
    n(g, 'sw',     'Physical Switch\n(underlay L2/L3)', 'gray')
    n(g, 'router', 'Router\n(underlay routing)', 'navy')
    n(g, 'inet',   'Internet\n(underlay WAN)', 'gray')
    n(g, 'tech',   'Overlay Technologies:\nVXLAN (UDP 4789)\nGeneve, GRE\nIP-in-IP, WireGuard', 'gold')
    n(g, 'flow',   'End-to-End:\nBuild packet\n→ Encapsulate (VXLAN)\n→ Route via underlay\n→ Decapsulate\n→ Deliver to pod', 'cyan')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('pa')
        s.node('pb')
        s.node('va')
        s.node('vb')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('phy')
        s.node('sw')

    e(g, 'pa',    'vxlan',  'overlay traffic')
    e(g, 'pb',    'vxlan',  'overlay traffic')
    e(g, 'va',    'vxlan',  'overlay traffic')
    e(g, 'vb',    'vxlan',  'overlay traffic')
    e(g, 'vxlan', 'phy',    'encapsulated in UDP')
    e(g, 'phy',   'sw',     'physical link')
    e(g, 'sw',    'router', 'L3 routing')
    e(g, 'router','inet',   'WAN')

    g.render(os.path.join(OUT, 'overlay-underlay'), cleanup=True)
    print('Generated: overlay-underlay')


# ─── high-availability ────────────────────────────────────────────────────────

def diag_high_availability():
    g = base_graph('ha_arch', 'High Availability Architecture — Multi-Zone, No SPOF', rankdir='TB')
    n(g, 'user',   'User Traffic\n(internet)', 'gray')
    n(g, 'lb',     'Load Balancer\n(health checks\nauto failover)', 'navy')
    n(g, 'za',     'App Server\nZone A\n(us-east-1a)', 'green')
    n(g, 'zb',     'App Server\nZone B\n(us-east-1b)', 'green')
    n(g, 'zc',     'App Server\nZone C\n(us-east-1c)', 'green')
    n(g, 'pdb',    'Primary DB\n(read/write)\nMulti-AZ RDS', 'navy')
    n(g, 'rdb',    'Replica DB\n(read-only\nstandby failover)', 'teal')
    n(g, 'bk',     'BACKUP\n(S3 / snapshots\ndaily + on-demand)', 'gold')
    n(g, 'mon',    'MONITORING\n(CloudWatch /\nPrometheus alerts)', 'purple')
    n(g, 'fo',     'FAILOVER\n(auto-promote\nreplica on failure)', 'red')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('za')
        s.node('zb')
        s.node('zc')

    e(g, 'user', 'lb',   'all traffic')
    e(g, 'lb',   'za',   'round-robin')
    e(g, 'lb',   'zb',   'round-robin')
    e(g, 'lb',   'zc',   'round-robin')
    e(g, 'za',   'pdb',  'read/write')
    e(g, 'zb',   'pdb',  'read/write')
    e(g, 'zc',   'pdb',  'read/write')
    e(g, 'pdb',  'rdb',  'async replication')
    e(g, 'rdb',  'bk',   'feeds')
    e(g, 'rdb',  'mon',  'feeds')
    e(g, 'rdb',  'fo',   'triggers', '#ef4444', 'dashed')
    e(g, 'fo',   'pdb',  'promotes replica', '#ef4444', 'dashed')

    g.render(os.path.join(OUT, 'high-availability'), cleanup=True)
    print('Generated: high-availability')


# ─── aws-12-concepts ──────────────────────────────────────────────────────────

def diag_aws_concepts():
    g = base_graph('aws_12', 'AWS Core Concepts — 12 Essential Services', rankdir='TB')
    n(g, 'iam',   'IAM\nUsers, Roles, Policies\nWho can do what', 'navy')
    n(g, 'ec2',   'EC2\nVirtual Machines\nScalable compute', 'navy')
    n(g, 's3',    'S3\nObject Storage\nUnlimited, durable', 'navy')
    n(g, 'vpc',   'VPC\nIsolated network\nSubnets, routing', 'navy')
    n(g, 'sg',    'Security Groups\nStateful firewall\ninbound/outbound rules', 'red')
    n(g, 'alb',   'Load Balancer\nALB (L7) / NLB (L4)\nDistribute traffic', 'gold')
    n(g, 'asg',   'Auto Scaling\nScale in/out on metrics\nmin/max/desired', 'green')
    n(g, 'rds',   'RDS\nManaged SQL DB\nMySQL/Postgres/Aurora', 'teal')
    n(g, 'lmb',   'Lambda\nServerless functions\nEvent-driven, ms billing', 'purple')
    n(g, 'cw',    'CloudWatch\nLogs, Metrics, Alarms\nMonitor everything', 'cyan')
    n(g, 'r53',   'Route 53\nDNS + Health checks\nGeolocation routing', 'gold')
    n(g, 'cf',    'CloudFront\nCDN (edge caching)\nGlobal low latency', 'teal')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('iam')
        s.node('ec2')
        s.node('s3')
        s.node('vpc')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('sg')
        s.node('alb')
        s.node('asg')
        s.node('rds')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('lmb')
        s.node('cw')
        s.node('r53')
        s.node('cf')

    g.render(os.path.join(OUT, 'aws-12-concepts'), cleanup=True)
    print('Generated: aws-12-concepts')


# ─── iaas-paas-saas ───────────────────────────────────────────────────────────

def diag_iaas_paas_saas():
    g = base_graph('iaas_paas', 'IaaS vs PaaS vs SaaS — Cloud Service Models', rankdir='TB')
    n(g, 'iaas',  'IaaS\n(Infrastructure as a Service)\nRent servers\nEC2, GCP Compute\nAzure VMs, DigitalOcean', 'navy')
    n(g, 'paas',  'PaaS\n(Platform as a Service)\nRent platform/runtime\nHeroku, App Engine\nRailway, Render', 'purple')
    n(g, 'saas',  'SaaS\n(Software as a Service)\nUse software directly\nGmail, Slack, Zoom\nSalesforce, GitHub', 'teal')
    n(g, 'idet',  'IaaS: YOU manage\nOS + runtime\n+ middleware + app\nProvider: hardware', 'navy')
    n(g, 'pdet',  'PaaS: YOU manage\napp + data only\nProvider: OS\n+ runtime + platform', 'purple')
    n(g, 'sdet',  'SaaS: YOU just\nuse the app\nProvider manages\neverything', 'teal')
    n(g, 'rule',  'More control → IaaS\nMore convenience → SaaS\nBalance → PaaS', 'gold')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('iaas')
        s.node('paas')
        s.node('saas')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('idet')
        s.node('pdet')
        s.node('sdet')

    e(g, 'iaas', 'idet')
    e(g, 'paas', 'pdet')
    e(g, 'saas', 'sdet')

    g.render(os.path.join(OUT, 'iaas-paas-saas'), cleanup=True)
    print('Generated: iaas-paas-saas')


# ─── ecs-vs-eks ───────────────────────────────────────────────────────────────

def diag_ecs_vs_eks():
    g = base_graph('ecs_vs_eks', 'AWS ECS vs EKS — Container Orchestration Options', rankdir='TB')
    n(g, 'ecs',   'ECS\n(Elastic Container Service)\nAWS-native, simpler\nTasks + Services + Clusters\nAWS-specific API', 'navy')
    n(g, 'eks',   'EKS\n(Elastic Kubernetes Service)\nKubernetes standard\nPods + Deployments + Services\nMulti-cloud portable', 'purple')
    n(g, 'ewhen', 'Use ECS when:\nSimple AWS workloads\nLess ops overhead\nFargate serverless\nSmaller teams', 'teal')
    n(g, 'kwhen', 'Use EKS when:\nKubernetes standardization\nComplex microservices\nMulti-cloud portability\nExisting K8s expertise', 'gold')
    n(g, 'alb',   'ALB\n(Application\nLoad Balancer)', 'green')
    n(g, 'cw',    'CloudWatch\n(Logs + Metrics)', 'green')
    n(g, 'ecr',   'ECR\n(Container Registry)', 'green')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('ecs')
        s.node('eks')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('ewhen')
        s.node('kwhen')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('alb')
        s.node('cw')
        s.node('ecr')

    e(g, 'ecs',   'ewhen')
    e(g, 'eks',   'kwhen')
    e(g, 'ecs',   'alb',   'integrates')
    e(g, 'ecs',   'cw',    'integrates')
    e(g, 'ecs',   'ecr',   'pulls from')
    e(g, 'eks',   'alb',   'integrates')
    e(g, 'eks',   'cw',    'integrates')
    e(g, 'eks',   'ecr',   'pulls from')

    g.render(os.path.join(OUT, 'ecs-vs-eks'), cleanup=True)
    print('Generated: ecs-vs-eks')


# ─── microservices-design ─────────────────────────────────────────────────────

def diag_microservices_design():
    g = base_graph('ms_design', 'Microservices Design — 10-Step Process', rankdir='TB')
    n(g, 's1',  '1. Define Business\nCapabilities\nMap domain bounded\ncontexts (DDD)', 'navy')
    n(g, 's2',  '2. Identify Service\nBoundaries\nSingle responsibility\nlow coupling', 'navy')
    n(g, 's3',  '3. Choose Service\nGranularity\nnot too fine/coarse\n(team ownership)', 'purple')
    n(g, 's4',  '4. Design APIs First\nREST / gRPC / GraphQL\nOpenAPI contracts\nbefore coding', 'purple')
    n(g, 's5',  '5. Assign Data\nOwnership\neach service owns\nits own DB', 'gold')
    n(g, 's6',  '6. Plan Service\nCommunication\nsync REST/gRPC vs\nasync events/queues', 'gold')
    n(g, 's7',  '7. Handle Failures\nEarly\ncircuit breakers\nretry + timeout', 'red')
    n(g, 's8',  '8. Add Observability\nlogs + metrics + traces\nPrometheus, Jaeger\nDatadog', 'teal')
    n(g, 's9',  '9. Secure Every\nService\nmTLS, JWT, OAuth2\nzero-trust network', 'red')
    n(g, 's10', '10. Automate\nDeployment\nCI/CD per service\nDocker + K8s + GitOps', 'green')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('s1')
        s.node('s2')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('s3')
        s.node('s4')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('s5')
        s.node('s6')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('s7')
        s.node('s8')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('s9')
        s.node('s10')

    e(g, 's1', 's3')
    e(g, 's2', 's3')
    e(g, 's3', 's5')
    e(g, 's4', 's5')
    e(g, 's5', 's7')
    e(g, 's6', 's7')
    e(g, 's7', 's9')
    e(g, 's8', 's9')
    e(g, 's9', 's10')

    g.render(os.path.join(OUT, 'microservices-design'), cleanup=True)
    print('Generated: microservices-design')


# ─── router-vs-switch ─────────────────────────────────────────────────────────

def diag_router_vs_switch():
    g = base_graph('rtr_vs_sw', 'Router vs Switch — Layer 3 vs Layer 2 Networking', rankdir='TB')
    n(g, 'rtr',    'Router\nLayer 3 (Network)\nIP address based\nConnects DIFFERENT\nnetworks\nRoutes packets', 'navy')
    n(g, 'neta',   'Network A\n192.168.1.0/24\nHome / Office LAN', 'green')
    n(g, 'netb',   'Network B\n192.168.2.0/24\nServer VLAN', 'green')
    n(g, 'sw',     'Switch\nLayer 2 (Data Link)\nMAC address based\nConnects devices in\nSAME network\nForwards frames', 'purple')
    n(g, 'lap',    'Laptop\n192.168.1.10\nMAC: aa:bb:cc:..', 'teal')
    n(g, 'desk',   'Desktop\n192.168.1.20\nMAC: dd:ee:ff:..', 'teal')
    n(g, 'prnt',   'Printer\n192.168.1.30\nMAC: 11:22:33:..', 'teal')
    n(g, 'tbl',    'Layer: 3 vs 2\nAddress: IP vs MAC\nConnects: networks vs devices\nFunction: route vs switch', 'gold')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('rtr')
        s.node('sw')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('neta')
        s.node('netb')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('lap')
        s.node('desk')
        s.node('prnt')

    e(g, 'neta',  'rtr',  'gateway route')
    e(g, 'rtr',   'netb', 'route packets')
    e(g, 'sw',    'lap',  'MAC forward')
    e(g, 'sw',    'desk', 'MAC forward')
    e(g, 'sw',    'prnt', 'MAC forward')
    e(g, 'rtr',   'tbl',  'comparison')
    e(g, 'sw',    'tbl',  'comparison')

    g.render(os.path.join(OUT, 'router-vs-switch'), cleanup=True)
    print('Generated: router-vs-switch')


if __name__ == '__main__':
    diag_ansible_architecture()
    diag_ansible_modules()
    diag_ansible_roles_vs_collections()
    diag_k8s_architecture()
    diag_k8s_cluster_node_pod()
    diag_k8s_pod_networking()
    diag_k8s_kube_proxy()
    diag_k8s_service_discovery()
    diag_k8s_network_policy()
    diag_k8s_ingress_vs_lb()
    diag_k8s_traffic_flow()
    diag_k8s_deployment_strategies()
    diag_terraform_architecture()
    diag_terraform_cicd()
    diag_terraform_count_for_each()
    diag_ci_vs_cd()
    diag_jenkins_architecture()
    diag_docker_architecture()
    diag_docker_networking()
    diag_docker_volumes()
    diag_docker_compose()
    diag_devsecops_pipeline()
    diag_overlay_underlay()
    diag_high_availability()
    diag_aws_concepts()
    diag_iaas_paas_saas()
    diag_ecs_vs_eks()
    diag_microservices_design()
    diag_router_vs_switch()
    print('All linkdiags diagrams generated.')
