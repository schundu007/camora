// Kubernetes — Architecture & the API.
//
// Sourced from kubernetes.io/docs/concepts/architecture/ and
// /docs/concepts/overview/components/ (CC BY 4.0, paraphrased), fetched
// 2026-08-24. Category wiring: 'k8s-architecture' in devopsCategories.
//
// Topics here were Shape C stubs in devopsTopics.js — diagram captions with no
// overview, deep dive or quick-fire. Prose from those captions is carried
// forward into topics[] rather than discarded; it was good writing sitting in
// a field that renders as a caption.

export const k8sArchitectureTopics = [
  {
    id: 'kubernetes-architecture',
    title: 'Kubernetes Architecture',
    icon: 'gitBranch',
    color: '#14b8a6',
    questions: 20,
    description:
      'How a cluster is wired: a control plane (kube-apiserver, etcd, scheduler, controller-manager, cloud-controller-manager) coordinating worker nodes (kubelet, kube-proxy, container runtime) through the pluggable CRI, CNI and CSI interfaces. Covers etcd Raft consensus, HA control-plane sizing, and managed offerings versus self-managed installers.',
    introduction: `Almost every "how does X work in Kubernetes" question resolves to the same answer, and it is worth learning that answer once rather than memorising the surface of each feature.

Kubernetes is a closed reconciliation loop. A client writes *desired* state to the API server. The API server validates it, persists it to etcd, and emits a watch event. Controllers observe that event, compare desired state against what they observe in the world, and write back the next step. Nothing in the system pushes commands at nodes; nodes pull the work that has been assigned to them. That is why Kubernetes recovers from a control-plane outage without losing running workloads, why a deleted Pod comes back, and why "it eventually converged" is the normal failure mode rather than a hard error.

The control plane is five processes and the node is three, plus three plugin interfaces that vendors implement. Once you can name each one, say what it owns, and describe what breaks when it stops, you can reason about most cluster behaviour from first principles. This topic covers those components, how they talk to each other, and how the whole thing is laid out for high availability.

One structural note worth carrying: the API server is the only component that talks to etcd. Every other component — controllers, scheduler, kubelet, your kubectl — goes through the API. That single chokepoint is what makes authentication, authorization, admission control and audit tractable, and it is why an API server outage looks like "nothing can change" rather than "everything falls over".`,
    topics: [
      {
        title: 'Control plane components — kube-apiserver, etcd, scheduler, controller-manager, CCM',
        content: `A Kubernetes cluster is a control plane plus a fleet of worker nodes. The control plane is five processes; everything in the system is reducible to "client writes object to apiserver, controller reconciles".

**kube-apiserver.** The only component that talks to etcd. Stateless and horizontally scalable; production runs 3+ replicas behind a load balancer. Responsibilities: authentication (x509, OIDC, service-account tokens, webhook), authorization (RBAC, ABAC, Node and Webhook authorizers chained), admission (mutating and validating webhooks, ValidatingAdmissionPolicy CEL since v1.30 GA), schema validation against the OpenAPI spec, and persistence to etcd. Every kubectl call, every controller, every kubelet heartbeat goes through the apiserver.

**etcd.** A distributed key-value store using Raft consensus, and the single source of truth for cluster state — every Pod, Node, Secret, ConfigMap and custom resource lives here. Production runs 3 or 5 etcd nodes, tolerating floor((N-1)/2) failures: 5 nodes tolerate 2, 3 nodes tolerate 1. Even numbers are wasteful — they need the same quorum as the next smaller odd cluster while adding write latency. Backed up with \`etcdctl snapshot save\`; restore is the only meaningful disaster-recovery story for a cluster. It is latency-sensitive: fsync p99 below 25ms is the well-known SLO, which means SSDs are mandatory.

**kube-scheduler.** Watches for Pods whose \`spec.nodeName\` is empty and assigns one. Two phases: filter (predicates — does it fit, taints and tolerations, affinity, topology spread) then score (priorities — least-requested, image locality, inter-pod affinity). Pluggable via the Scheduler Framework. Multiple schedulers can run side by side, with \`spec.schedulerName\` routing Pods between them.

**kube-controller-manager.** A single binary running roughly thirty built-in controllers as goroutines: Deployment, ReplicaSet, StatefulSet, DaemonSet, Job, CronJob, EndpointSlice, ServiceAccount, Node lifecycle, garbage collection, namespace, PV binder and more. Each watches its resource type, computes desired versus observed, and issues writes. Leader-elected via a Lease, so only one replica is active at a time. The controllers are logically separate but compiled together for operational simplicity.

**cloud-controller-manager (CCM).** Optional — it runs only on clusters backed by a cloud provider, and not at all on-premises. It holds the cloud-specific controllers that were extracted from kube-controller-manager in v1.16: the Node controller (annotating Nodes with provider ID, instance type and zone, and reacting when an instance is deleted in the cloud), the Service controller (provisioning ELB/NLB/GCLB/Azure LB for \`type: LoadBalancer\`), and the Route controller (adding VPC routes for Pod CIDRs). Each cloud ships its own CCM binary.

Together these form the closed loop: clients write desired state to the apiserver, the apiserver persists to etcd and emits watch events, and controllers and the scheduler observe those events and write back the next state.`,
        image: '/diagrams/devops/g1-k8s-arch.png',
      },
      {
        title: 'Node components and the CRI / CNI / CSI plugin model',
        content: `Every worker node runs three components plus the pluggable interfaces.

**kubelet.** The node agent, and required on every node. Watches the apiserver for Pods bound to its own node via \`spec.nodeName\`. For each Pod it pulls images, starts containers through the CRI, sets up volumes through the CSI, configures networking through the CNI, runs liveness, readiness and startup probes, and reports Pod status back. It also reports Node status — capacity, conditions, allocatable — every 10 seconds by default. The Node lease, added in v1.17, reduced apiserver load: the kubelet updates a lightweight Lease object every 40 seconds as a heartbeat and writes full Node status only on change. Note that the kubelet manages only containers Kubernetes created; containers you start directly on the node are invisible to it.

**kube-proxy.** Implements the Service abstraction on each node — and the docs now list it as **optional**, because a network plugin that provides equivalent packet forwarding can replace it entirely. Three modes:

- *iptables* — the default in most distributions. Programs iptables NAT rules; every Service gets a chain and every endpoint a rule. O(N) lookup, and rule sync gets slow above roughly 5,000 Services.
- *IPVS* — kernel-level load balancing with O(1) lookup, scaling to around 50,000 Services. Worth switching to above ~1,000 Services.
- *nftables* — the modern replacement for iptables, beta in v1.29.

The Cilium kube-proxy replacement bypasses it altogether: the Cilium agent programs eBPF maps in the kernel to handle Services directly. This is common in 2026 production clusters and is exactly the "optional" case the docs describe.

**Container runtime.** Required on every node, implementing the Container Runtime Interface. dockershim was removed in v1.24 (April 2022); containerd is dominant in 2026 with CRI-O (the OpenShift default) the major alternative. Both delegate low-level container lifecycle to runc — or alternatives like crun, gVisor or Kata Containers — through the OCI Runtime Spec.

**The three plugin interfaces:**

*CRI (Container Runtime Interface).* The gRPC API the kubelet uses to talk to the runtime, split into RuntimeService (Pod sandbox and container lifecycle) and ImageService (pull, list, remove images).

*CNI (Container Network Interface).* A CNCF spec. On Pod create and delete, the kubelet — via the runtime — calls CNI plugins to set up the network namespace: assign an IP from IPAM, configure routes, and wire the veth pair into the Pod netns. By adoption in 2026: Cilium (eBPF, roughly 40% of new clusters), Calico (BGP and eBPF, broad enterprise base), AWS VPC CNI (the EKS default, giving each Pod a real VPC IP from an ENI), Azure CNI and Azure CNI overlay, GKE alias IPs, and Flannel for simple cases. Weave Net was deprecated in 2024. NetworkPolicy enforcement requires a CNI that implements it — Cilium or Calico, not Flannel.

*CSI (Container Storage Interface).* The spec for storage drivers. A CSI driver runs as a Deployment (the controller plugin: provision and attach) plus a DaemonSet (the node plugin: mount). Major drivers include AWS EBS CSI, GCP PD CSI, Azure Disk and File CSI, Ceph CSI, Portworx, Longhorn, Rook and OpenEBS. In-tree volume plugins were removed from v1.27 onward; CSI is the only path.

The architectural payoff is that the control plane stays small, generic and cloud-agnostic. Vendor differentiation lives in the CRI, CNI and CSI plugins and in the cloud-controller-manager. Swapping CNI is non-disruptive by design — in practice you cordon and drain a node, swap the DaemonSet, and uncordon.`,
      },
      {
        title: 'How the components talk — the hub-and-spoke API pattern',
        content: `All communication runs through the API server, and the direction each connection is opened matters for firewalling and for understanding failure modes.

**Node to control plane.** Every node-originated connection terminates at the apiserver on HTTPS 443. The kubelet authenticates with a client certificate issued at bootstrap (or rotated via the CSR API), and is authorized by the Node authorizer plus the NodeRestriction admission plugin, which together limit a kubelet to reading and writing only the objects relevant to its own node. This is the direction you want: nodes dial out, the control plane does not need inbound reach into the node network.

**Control plane to node.** Two paths run the other way, and both are the ones to scrutinise:

- *apiserver to kubelet* — used by \`kubectl logs\`, \`kubectl exec\`, \`kubectl attach\` and port-forward. By default the apiserver does not verify the kubelet's serving certificate, which leaves this path open to man-in-the-middle on an untrusted network. Set \`--kubelet-certificate-authority\`, and do not expose the kubelet port publicly.
- *apiserver to nodes, Pods and Services* — plain HTTP by default, so neither authenticated nor encrypted.

**Konnectivity.** The supported way to close this. The Konnectivity service runs a proxy on the control-plane network and agents on the node network; agents dial out to establish the tunnel, and all control-plane-to-node traffic rides it. This removes the need for any inbound path from control plane to nodes, which is what makes managed offerings able to keep the control plane in a separate VPC.

**Why this shape.** Because the apiserver is the only chokepoint, authentication, authorization, admission and audit are implemented once rather than per-component. It also means an apiserver outage stops *changes* but not running workloads: kubelets keep their assigned Pods running, kube-proxy keeps its rules, and traffic continues to flow. What stops is scheduling, scaling, rollouts, and anything else that requires writing to the API.`,
      },
      {
        title: 'High-availability topologies, addons, and managed versus self-managed',
        content: `**Stacked etcd.** Each control-plane node runs an apiserver, scheduler, controller-manager *and* an etcd member. This is the kubeadm default. It is simpler and needs fewer machines, but couples control-plane and etcd failure domains: losing a node loses both an apiserver and an etcd member. Fine to roughly 50 nodes.

**External etcd.** etcd runs on its own dedicated machines, separate from the control plane. More hardware and more to operate, but the failure domains are independent and etcd gets dedicated disks — which matters, because the single most common HA mistake is running etcd on the same disk as the host OS. etcd needs a dedicated SSD.

**Sizing.** Run 3 or 5 etcd members and 3 or more apiserver replicas behind a load balancer. The apiserver is stateless so it scales horizontally; scheduler and controller-manager run as many replicas but only one of each is active, arbitrated by leader election through a Lease.

**Addons.** Cluster-level features deployed as ordinary Kubernetes resources in \`kube-system\`, not as control-plane processes. Cluster DNS is effectively required — it is CoreDNS in practice, and container DNS search paths are configured to use it automatically. The others are genuinely optional: the Dashboard web UI, container resource monitoring, cluster-level logging, and the network plugin itself.

**Managed control planes.** EKS, GKE, AKS, DOKS, LKE, OKE and ACK run the control plane for you — you do not see the apiserver processes or etcd, and you do not patch them. You still own the nodes, the CNI choice in most cases, and everything above.

**Self-managed installers.** kubeadm is the canonical, official bootstrapper and the one worth understanding. K3s (Rancher) strips and substitutes components for edge use, defaulting to SQLite instead of etcd. K0s (Mirantis) ships clean upstream Kubernetes as a single binary. kops targets AWS specifically, and kubespray drives kubeadm through Ansible.

Linux nodes also typically need systemd to supervise the local components — the kubelet and the container runtime run as systemd units rather than being managed by Kubernetes itself, which is the bootstrap chicken-and-egg the static-Pod mechanism exists to solve.`,
      },
    ],
    quickFire: [
      { q: "What's the only component that talks to etcd?", a: 'kube-apiserver. Every other control-plane and node component goes through the API.' },
      { q: 'What consensus algorithm does etcd use?', a: 'Raft. Quorum is floor(N/2)+1 — 3 nodes tolerate 1 failure, 5 tolerate 2.' },
      { q: 'Why 3 or 5 etcd nodes, not 4?', a: 'An even-numbered cluster needs the same quorum as the next smaller odd cluster but adds write latency. No fault-tolerance benefit.' },
      { q: "What's the etcd disk SLO?", a: 'fsync p99 under 25ms. That means SSD only.' },
      { q: 'What are the two phases of the scheduler?', a: 'Filter (predicates: node fit, taints, affinity, topology spread), then score (priorities: least-requested, image locality, spread).' },
      { q: 'How is a non-default scheduler selected?', a: 'spec.schedulerName on the Pod. The default is "default-scheduler".' },
      { q: 'What does cloud-controller-manager own?', a: 'The cloud-specific controllers — Node lifecycle annotation, Service type=LoadBalancer provisioning, and the Route controller for Pod CIDRs. It is optional and does not run on-premises.' },
      { q: 'Which components does the documentation list as optional?', a: 'cloud-controller-manager and kube-proxy. A CNI that provides equivalent packet forwarding can replace kube-proxy entirely.' },
      { q: 'What are the three kube-proxy modes?', a: 'iptables (default, slows above ~5k Services), IPVS (O(1), scales to ~50k), and nftables (beta in v1.29).' },
      { q: 'What replaces kube-proxy with eBPF?', a: 'The Cilium kube-proxy replacement. It programs eBPF maps directly and bypasses iptables.' },
      { q: "What's the status of dockershim?", a: 'Removed in v1.24 (April 2022). containerd or CRI-O are the runtimes now.' },
      { q: 'containerd versus CRI-O?', a: 'Both are CRI-compliant and both delegate to runc. containerd is dominant; CRI-O is the OpenShift default.' },
      { q: 'Which CNIs lead in 2026?', a: 'Cilium (eBPF, ~40% of new clusters), Calico, AWS VPC CNI (EKS default), Azure CNI, and GKE alias IPs.' },
      { q: "What's CSI?", a: 'The Container Storage Interface. A controller plugin (provision and attach) plus a node plugin DaemonSet (mount).' },
      { q: 'Are in-tree volume plugins still supported?', a: 'No — removed from v1.27 onward. CSI is the only path.' },
      { q: "What's a Node lease?", a: 'A lightweight Lease object the kubelet updates every 40 seconds as a heartbeat, so full Node status writes are only needed on change. It cuts apiserver load.' },
      { q: 'What happens to running workloads if the apiserver goes down?', a: 'They keep running. Kubelets maintain their assigned Pods and kube-proxy keeps its rules. What stops is change — scheduling, scaling, rollouts.' },
      { q: 'Which control-plane-to-node paths are insecure by default?', a: 'apiserver to kubelet does not verify the kubelet serving cert unless --kubelet-certificate-authority is set; apiserver to nodes/Pods/Services is plain HTTP. Konnectivity tunnels both.' },
      { q: 'Stacked versus external etcd?', a: 'Stacked runs etcd on the control-plane nodes (kubeadm default) — simpler, coupled failure domains, fine to ~50 nodes. External runs etcd separately — more hardware, independent failure domains, preferred at scale.' },
      { q: "What's the most common HA control-plane mistake?", a: 'Running etcd on the same disk as the host OS. etcd needs a dedicated SSD.' },
      { q: 'Managed versus self-managed options?', a: 'Managed: EKS, GKE, AKS, DOKS, LKE, OKE, ACK — the provider runs the control plane. Self-managed: kubeadm (canonical), K3s (edge, SQLite default), K0s (single binary), kops (AWS), kubespray (Ansible over kubeadm).' },
    ],
    references: [
      'https://kubernetes.io/docs/concepts/architecture/',
      'https://kubernetes.io/docs/concepts/overview/components/',
      'https://kubernetes.io/docs/concepts/architecture/nodes/',
      'https://kubernetes.io/docs/concepts/architecture/control-plane-node-communication/',
      'https://kubernetes.io/docs/concepts/architecture/controller/',
      'https://etcd.io/docs/v3.5/op-guide/hardware/',
      'https://github.com/container-storage-interface/spec',
      'https://github.com/containernetworking/cni/blob/main/SPEC.md',
      'https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/',
    ],
  },
];

export const k8sArchitectureTopicCategoryMap = {
  'kubernetes-architecture': 'k8s-architecture',
};
