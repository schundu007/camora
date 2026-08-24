export const devopsExtraTopicCategoryMap = {
  'chaos-engineering': 'cloudnative',
  'finops-cloud-cost': 'cloudnative',
  'developer-productivity-space': 'foundations',
  'sigstore-supply-chain-security': 'devsecops',
  'webassembly-cloud-native': 'cloudnative',
  'ai-augmented-devops': 'foundations',
  'dev-containers-environments': 'containers',
  'openfeature-feature-flags': 'delivery',
  'cncf-landscape-navigation': 'cloudnative',
  'toil-reduction-automation': 'foundations',
  'k8s-pod-networking': 'k8s-networking',
  'k8s-network-policy-guide': 'k8s-networking',
  'k8s-traffic-flow-deep': 'k8s-networking',
  'k8s-deployment-strategies-guide': 'k8s-workloads',
  'k8s-pod-troubleshooting-guide': 'k8s-cluster-admin',
  'ansible-roles-vs-collections': 'config',
  'ansible-project-structure': 'config',
  'terraform-cicd-pipeline': 'iac',
  'terraform-count-vs-for-each': 'iac',
  'terraform-remote-state': 'iac',
  'jenkins-controller-vs-agent': 'cicdtools',
  'jenkinsfile-pipeline-code': 'cicdtools',
  'devsecops-pipeline-architecture': 'devsecops',
  'high-availability-system-design': 'cloudnative',
  'overlay-underlay-networking-deep': 'cloudnative',
  'internal-developer-platform': 'cloudnative',
  'gitops-pull-model': 'cicd',
  'slsa-supply-chain': 'devsecops',
  'dora-metrics-advanced': 'foundations',
  'karpenter-node-autoscaling': 'k8s-cluster-admin',
  'crossplane-cloud-control': 'cloudnative',
  'external-secrets-operator': 'devsecops',
  'dora-four-keys-implementation': 'foundations',
  'platform-engineering-idp-design': 'cloudnative',
  'grpc-protobuf-services': 'foundations',
};

export const devopsExtraTopics = [
  {
    id: 'k8s-pod-networking',
    title: 'Kubernetes Pod Networking & CNI',
    icon: 'gitBranch',
    color: '#14b8a6',
    questions: 5,
    description: 'How every Pod gets a unique routable IP via CNI plugins. Pod-to-Pod communication on the same node (via Linux bridge) and across nodes (via VXLAN/BGP). kube-proxy vs Cilium eBPF for Service IP routing.',
    visualizations: [
      {
        title: 'Pod networking — same-node vs cross-node communication',
        description: 'Same-node: Pod A connects through the Linux bridge (cbr0) to Pod B without needing a CNI tunnel. Cross-node: Pod A encapsulates the packet via VXLAN tunnel (managed by the CNI plugin) to reach Pod B on Node 2. CNI is triggered by kubelet when a pod starts and assigns an IP from the pod CIDR.',
        image: '/diagrams/linkdiags/k8s-pod-networking.png',
      },
      {
        title: 'kube-proxy and Service IP routing',
        description: 'Service gives stable IP; kube-proxy writes iptables/IPVS rules to forward Service IP traffic to actual pod IPs. CoreDNS resolves service names to Service IPs. Pod IPs are ephemeral and change on restart — never hardcode them.',
        image: '/diagrams/linkdiags/k8s-kube-proxy.png',
      },
    ],
    topics: [
      {
        title: 'The networking model, and what CNI actually does',
        content: `Kubernetes does not implement networking. It specifies a **contract** and delegates the implementation, which is why the answer to most networking questions begins with "which CNI".

The contract has three clauses, and they are worth stating precisely because almost every design decision follows from them:

1. Every Pod gets its own IP address.
2. Every Pod can reach every other Pod **without NAT**, and each sees the other's real IP.
3. Agents on a node — kubelet, daemons — can reach all Pods on that node.

The second clause is the consequential one. Docker's default model NATs container traffic behind the host, so a container sees a rewritten source address and ports must be mapped. Kubernetes forbids that, which is what makes service discovery, mutual TLS, network policy and IP-based audit logging tractable — a Pod's identity on the wire is its own address.

**CNI** is the plugin interface that delivers it. When kubelet has a Pod to start, it creates the network namespace and calls the configured CNI binary with ADD; the plugin allocates an address from the node's pod CIDR, creates a veth pair with one end in the Pod namespace and one on the host, sets routes, and returns the result. On teardown kubelet calls DEL. The full sequence: the API server accepts the Pod, the scheduler binds it to a node, that node's kubelet starts it, kubelet invokes CNI, CNI allocates and wires, and the Pod joins the network.

Two consequences that show up constantly in practice. **Pod IPs are ephemeral** — they change on every restart or reschedule, so nothing should ever be configured with one; Services exist to provide the stable name and address. And **IPAM is per node**: each node holds a slice of the cluster pod CIDR, which means the node's slice size caps Pods per node, and exhausting it produces pending Pods with a failed sandbox creation rather than an obvious address error.

**Same node** needs no encapsulation: both veth host-ends attach to a bridge, the bridge switches the frame, and the packet never leaves the machine.

**Across nodes** is where implementations diverge. **Overlay** mode wraps the Pod packet in an outer UDP header — VXLAN typically — so the underlay only ever sees node-to-node traffic and needs to know nothing about pod addressing. It works on any network, which is why it is the default nearly everywhere, and it costs an encapsulation header (reducing usable MTU) plus the CPU to add and strip it. **Native routing** mode instead advertises pod routes into the underlay, usually with BGP, so packets travel unencapsulated at full MTU. It is faster and far easier to troubleshoot with ordinary tools, but requires an underlay that will accept those routes — which rules it out on most cloud VPCs without additional integration.

**MTU is the classic failure.** VXLAN adds 50 bytes; if the CNI MTU is not lowered to match, large packets are dropped or fragmented and the symptom is maddening: small requests succeed, TLS handshakes hang, and large responses stall. Any "works for curl, breaks for real traffic" report should start with an MTU check.`,
      },
      {
        title: 'Service routing — kube-proxy, IPVS, and the eBPF replacement',
        content: `A Service ClusterIP is a **virtual address**: nothing listens on it and no interface owns it. It exists only as a set of forwarding rules on every node, and understanding that removes most confusion about why Services behave the way they do.

**kube-proxy in iptables mode** is the traditional implementation. It watches Services and EndpointSlices, and writes rules that DNAT the ClusterIP to one of the ready backend Pod IPs, choosing randomly with statistical probability. The rules live in a chain per Service; the kernel evaluates them as a **linear list**, so cost grows with the number of Services, and every change rewrites and reloads a large ruleset. On a cluster with thousands of Services this becomes visibly slow both in the data path and in how long a change takes to converge — the practical reason large clusters move off it.

**IPVS mode** replaces the linear chains with a kernel hash table, so lookup is effectively constant time regardless of Service count, and it offers real balancing algorithms — round robin, least connection, source hashing — rather than random selection. It still uses iptables for some auxiliary cases, so it reduces rather than eliminates that surface.

**Cilium in eBPF mode** removes kube-proxy entirely. Programs attached at the socket and driver layers perform the translation, so a connection from a Pod to a ClusterIP is rewritten **at connect time in the socket layer** — the packet is addressed to the backend from the outset, and there is no per-packet DNAT and no conntrack entry for it. That eliminates the linear scaling, and it also removes an entire class of conntrack-exhaustion incidents. The same datapath provides identity-based policy and, through **Hubble**, flow-level observability that is genuinely difficult to obtain otherwise.

The trade is operational: eBPF requires a sufficiently recent kernel, and debugging moves from readable iptables rules to bpftool and Cilium's own tooling. That is a real learning cost, and it is why the migration is usually driven by a scaling problem rather than by preference.

**Choosing a CNI**, in practice:

- **Flannel** — VXLAN overlay, minimal, and importantly **no NetworkPolicy support at all**, so a cluster on Flannel cannot enforce policy no matter what manifests it applies. That surprise is worth knowing before it is discovered during an audit.
- **Calico** — BGP or overlay, mature policy engine with useful extensions beyond the standard API, and eBPF available as an option.
- **Cilium** — eBPF datapath, kube-proxy replacement, L7-aware policy, Hubble, and cluster mesh. The most capable and the most to learn.
- **Cloud-native plugins** (AWS VPC CNI, Azure CNI, GKE) — give the Pod a real VPC address, so cloud security groups and native load balancers apply directly and there is no overlay at all. The constraint is address space: pods consume VPC addresses, and per-node pod density is capped by the instance's ENI limits, which is a capacity-planning matter rather than a networking one.`,
      },
    ],
    introduction: `## Overview
Every Pod in Kubernetes receives its own unique, routable IP address — this is the fundamental networking contract of the platform. Pod IPs are ephemeral: they change whenever a Pod restarts or is rescheduled. Services provide the stable IP and DNS name that the rest of the cluster uses.

The Container Network Interface (CNI) is the plugin layer that implements this contract. When kubelet starts a new Pod, it calls the configured CNI plugin, which allocates an IP from the pod CIDR and wires up the network namespace.

Same-node communication: Two Pods on the same node communicate through the Linux virtual bridge (commonly named cbr0 or similar). The bridge acts like a virtual switch. No tunnel or encapsulation is needed — packets travel at wire speed within the node.

Cross-node communication: When Pod A on Node 1 needs to reach Pod B on Node 2, the CNI plugin handles encapsulation. The most common approach is VXLAN — the original Layer 3 packet is wrapped in a UDP outer header that carries it over the real (underlay) network to Node 2, where the CNI decapsulates it. Calico in BGP mode skips encapsulation entirely and programs real routes, which is faster but requires the underlay to support BGP peering.

Six-step IP assignment flow: Pod Creation request arrives at API server → Scheduler assigns Pod to a Node → kubelet on that Node starts the Pod → kubelet calls CNI plugin → CNI allocates IP from pod CIDR and configures veth pair → Pod joins the cluster network with its unique IP.

kube-proxy runs on every node and watches the API server for Service and Endpoint objects. When a Service is created, kube-proxy writes iptables or IPVS rules that DNAT the stable Service ClusterIP to one of the healthy pod IPs. Cilium in eBPF mode replaces kube-proxy entirely with faster kernel-level forwarding.

CNI plugins to know: Flannel (simple, VXLAN only, minimal features), Calico (BGP or VXLAN, supports NetworkPolicy), Cilium (eBPF dataplane, replaces kube-proxy, deep observability, Hubble).`,
    whenToUse: [
      'Designing multi-node Kubernetes clusters and choosing a CNI plugin',
      'Debugging pod-to-pod connectivity failures across nodes',
      'Explaining why Service IPs are stable but Pod IPs are not',
      'Interview questions about how Kubernetes networking is implemented at the kernel level',
      'Evaluating kube-proxy vs eBPF-based forwarding for high-throughput workloads',
    ],
    keyConcepts: [
      {
        term: 'CNI (Container Network Interface)',
        definition: 'Plugin specification that Kubernetes uses to set up Pod networking. kubelet calls the CNI binary when a Pod starts; the plugin allocates an IP from the pod CIDR and creates the veth pair connecting the pod network namespace to the node bridge.',
      },
      {
        term: 'Pod CIDR',
        definition: 'A non-overlapping IP range assigned to each node. All Pods on that node receive IPs within the node\'s pod CIDR. The cluster-wide pod CIDR is set at cluster creation (e.g., 10.244.0.0/16).',
      },
      {
        term: 'VXLAN encapsulation',
        definition: 'Virtual Extensible LAN — wraps the original pod-to-pod Layer 3 packet inside a UDP outer header so it can traverse the physical network between nodes. The CNI agent on the destination node strips the outer header and delivers the original packet.',
      },
      {
        term: 'kube-proxy',
        definition: 'Runs on every node and programs iptables/IPVS rules to DNAT Service ClusterIP traffic to actual pod IPs. Watches the API server and updates rules whenever Services or Endpoints change.',
      },
      {
        term: 'CoreDNS',
        definition: 'The in-cluster DNS server. Resolves <service>.<namespace>.svc.cluster.local to the Service ClusterIP. Pods use CoreDNS as their default nameserver.',
      },
      {
        term: 'Pod IP is ephemeral — Service IP is stable',
        definition: 'Core Kubernetes principle. Never hardcode Pod IPs in config or code. Always use the Service name or ClusterIP which remains constant across Pod restarts and rescheduling.',
      },
    ],
    approach: [
      'Understand the three levels: Pod IP (ephemeral, CNI-assigned), Service IP (stable, iptables/IPVS-managed), DNS name (CoreDNS)',
      'Same-node traffic flows through the Linux bridge — no tunneling overhead',
      'Cross-node traffic is encapsulated by the CNI plugin (VXLAN is the default for Flannel and Calico overlay mode)',
      'Service traffic is DNAT\'d by kube-proxy rules on the destination node\'s iptables or IPVS table',
      'Choose CNI based on requirements: Flannel for simplicity, Calico for NetworkPolicy + BGP, Cilium for eBPF performance and observability',
      'Debug with: kubectl describe pod (check IP), kubectl exec -- curl, kubectl exec -- nslookup, kubectl get endpoints',
    ],
    pitfalls: [
      'Hardcoding Pod IPs — they change on every restart; always use Service names',
      'Choosing Flannel for a cluster that needs NetworkPolicy — Flannel does not support it',
      'pod CIDR and service CIDR overlapping with the host network — causes routing chaos',
      'Forgetting that kube-proxy iptables rules are written on every node — a stale node misses Service endpoints',
      'Assuming VXLAN encapsulation has zero overhead — it adds ~50 bytes per packet and has CPU cost at scale',
    ],
    keyQuestions: [
      {
        question: 'How does a Pod get its IP address in Kubernetes?',
        answer: `When the scheduler assigns a Pod to a node, kubelet starts the Pod and immediately calls the configured CNI plugin binary. The CNI plugin allocates an IP from the node\'s pod CIDR subnet, creates a veth pair (one end in the Pod\'s network namespace, one end on the node\'s bridge), and configures routing. The Pod then has a routable IP within the cluster network.

Six-step flow: Pod created (API server) → Scheduler picks Node → kubelet starts pod → kubelet calls CNI plugin → CNI assigns IP from pod CIDR → Pod joins cluster network.

Key point: the IP is ephemeral. If the Pod is deleted and recreated, the CNI allocates a new IP from the available pool. This is why Services exist — they provide a stable virtual IP that doesn\'t change.`,
      },
      {
        question: 'Compare kube-proxy iptables mode vs Cilium eBPF mode.',
        answer: `kube-proxy iptables mode: For every Service, kube-proxy writes a chain of iptables DNAT rules on every node. When a packet arrives destined for a ClusterIP, the kernel walks the iptables chain, randomly selects a backend pod IP, and rewrites the destination. Works well up to a few thousand Services; at 10k+ Services the iptables chain becomes very long and rule updates (O(n) rewrites) add latency to the control plane.

Cilium eBPF mode: Replaces kube-proxy entirely. Service-to-Pod mapping is stored in eBPF maps in the kernel. Lookups are O(1) hash table operations regardless of the number of Services. Rule updates are atomic and don\'t require flushing/rewriting entire chains. Also supports DSR (Direct Server Return) to avoid hairpin NAT. Additionally provides L7 observability via Hubble without a sidecar proxy.

When to choose Cilium: large clusters (hundreds of nodes, thousands of Services), high throughput workloads sensitive to NAT overhead, teams that want Hubble/observability without a service mesh sidecar.`,
      },
      {
        question: 'What happens at the network level when Pod A on Node 1 sends a packet to Pod B on Node 2?',
        answer: `With a VXLAN-based CNI (e.g., Flannel, Calico overlay):

1. Pod A creates a packet: src=PodA-IP, dst=PodB-IP.
2. The packet leaves the Pod network namespace via the veth pair, arriving at the node bridge (cbr0).
3. The bridge looks up the destination. PodB-IP is not on this node — it belongs to Node 2\'s pod CIDR.
4. The CNI agent (e.g., flannel daemon) has a VXLAN tunnel device (flannel.1). The kernel forwards the packet to this device.
5. The CNI wraps the original IP packet in a UDP outer header: src=Node1-IP:VXLAN-port, dst=Node2-IP:VXLAN-port, with a VXLAN network identifier.
6. This encapsulated packet travels over the physical/cloud network (the underlay) to Node 2.
7. The CNI agent on Node 2 receives the UDP packet on the VXLAN port, strips the outer header, and delivers the original packet to cbr0 on Node 2.
8. cbr0 forwards to Pod B\'s veth pair. Pod B receives the original packet.

With Calico BGP mode: Steps 4–7 are replaced by real BGP routes. No encapsulation; the physical routers know each node\'s pod CIDR. Requires underlay support.`,
      },
    ],
    quickFire: [
      { q: 'What does CNI stand for and what does it do?', a: 'Container Network Interface -- a plugin spec that kubelet calls when a Pod starts to allocate an IP and wire up the network namespace.' },
      { q: 'Why is a Pod IP considered ephemeral?', a: 'When a Pod is deleted and recreated it gets a new IP from the CNI pool. Always use a Service ClusterIP or DNS name instead.' },
      { q: 'What is the pod CIDR and who assigns it?', a: 'A non-overlapping IP range per node (e.g., 10.244.1.0/24). The cluster-wide CIDR is set at cluster creation; the CNI allocates individual IPs from it.' },
      { q: 'How do two Pods on the same node communicate?', a: 'Through the Linux virtual bridge (cbr0). Packets go veth --> bridge --> veth with no encapsulation overhead.' },
      { q: 'How do two Pods on different nodes communicate with VXLAN?', a: 'The CNI wraps the pod-to-pod Layer 3 packet in a UDP outer header (VXLAN), sends it across the physical network, and the destination CNI agent strips the header.' },
      { q: 'What is the difference between Calico BGP mode and overlay mode?', a: 'BGP mode programs real routes into physical routers -- no encapsulation, faster, but requires underlay BGP support. Overlay mode uses VXLAN and works on any network.' },
      { q: 'What does kube-proxy actually do?', a: 'It watches the API server and writes iptables or IPVS DNAT rules on every node to forward Service ClusterIP traffic to healthy pod IPs.' },
      { q: 'How does Cilium replace kube-proxy?', a: 'Cilium stores Service-to-Pod mappings in eBPF maps for O(1) hash lookups, replacing the O(n) iptables chain walk and enabling atomic rule updates.' },
      { q: 'What CNI plugin does NOT support NetworkPolicy?', a: 'Flannel. It only provides basic overlay networking. Use Calico, Cilium, or Antrea if you need NetworkPolicy enforcement.' },
      { q: 'What is Hubble in the Cilium ecosystem?', a: 'Hubble is Cilium\'s observability layer -- it provides real-time network flow visibility and L7 metrics without requiring a sidecar proxy.' },
    ],
    references: [
      'https://kubernetes.io/docs/concepts/cluster-administration/networking/',
      'https://www.cni.dev/docs/',
      'https://docs.cilium.io/en/stable/network/kubernetes/concepts/',
      'https://github.com/flannel-io/flannel',
      'https://docs.projectcalico.org/networking/overview',
    ],
  },

  {
    id: 'k8s-network-policy-guide',
    title: 'Kubernetes Network Policies',
    icon: 'shield',
    color: '#14b8a6',
    questions: 4,
    description: 'NetworkPolicy resources control which Pods can communicate. Ingress rules restrict incoming traffic; Egress rules restrict outgoing. Default: all traffic allowed. With policy: only explicitly allowed traffic permitted. Requires CNI with NetworkPolicy support (Calico, Cilium, Weave).',
    visualizations: [
      {
        title: 'NetworkPolicy — default allow vs default deny with explicit rules',
        description: 'Without any NetworkPolicy: all pod-to-pod traffic is allowed. Once a NetworkPolicy selects a Pod, only traffic matching an ingress or egress rule is permitted. Example: frontend pods can reach backend on TCP 8080; all other traffic to backend is blocked by a default-deny policy.',
        image: '/diagrams/linkdiags/k8s-network-policy.png',
      },
    ],
    topics: [
      {
        title: 'Default-allow, and the selector model that replaces it',
        content: `The single most important fact: **a Kubernetes cluster is default-allow.** With no NetworkPolicy present, every Pod can reach every other Pod in every namespace. There is no implicit segmentation between environments, tenants or tiers, and a compromised front-end Pod can open a connection straight to a database Pod in another namespace.

Policy is **additive and allow-only**. There is no deny rule. The model is:

- A Pod is **unaffected** by policy until at least one NetworkPolicy selects it. It remains fully reachable.
- The moment any policy selects a Pod for a direction, that Pod becomes **default-deny for that direction**, and only traffic matching some policy is permitted.
- Multiple policies **union**: if any policy allows a flow, it is allowed. You cannot write a policy that subtracts from another.

That last point is the one that trips people up. Adding a broad policy to "fix" a connectivity problem does not override a narrow one — it widens the permitted set, permanently, and the narrow policy's intent is quietly lost.

Direction is explicit and independent. \`policyTypes\` lists Ingress, Egress, or both, and **omitting it is a common mistake**: a policy with only an ingress rule leaves egress entirely unrestricted, so a compromised Pod can still exfiltrate freely. Note also the asymmetry — restricting egress from A to B does nothing to ingress at B, and both sides must permit a flow for it to work. Debugging "why is this blocked" always means checking both ends.

The standard baseline is an explicit default-deny per namespace, then narrow allows on top:

    apiVersion: networking.k8s.io/v1
    kind: NetworkPolicy
    metadata: { name: default-deny-all, namespace: prod }
    spec:
      podSelector: {}          # every Pod in the namespace
      policyTypes: [Ingress, Egress]
      # no rules — so nothing is allowed

An empty podSelector selects everything in the namespace; an empty rules list allows nothing.

**Three selector types**, and the distinction matters:

- **podSelector** — Pods in the *same namespace* as the policy.
- **namespaceSelector** — all Pods in namespaces matching labels. Kubernetes automatically sets \`kubernetes.io/metadata.name\` on every namespace, which is the reliable way to name one.
- **ipBlock** — CIDR ranges, with optional \`except\`. This is the only way to express external destinations, and it is the mechanism for allowing egress to a managed database or a third-party API.

The trap that produces the most confusion: a \`from\` entry containing both podSelector and namespaceSelector as **one list item** means "pods matching X **in** namespaces matching Y" — an intersection. Written as **two list items**, it means "pods matching X in this namespace **or** anything in namespaces matching Y" — a union, and almost always far broader than intended. The difference is a single dash in YAML.`,
      },
      {
        title: 'DNS, egress, and the limits of the standard API',
        content: `**Blocking DNS is the classic self-inflicted outage.** The moment a default-deny egress policy applies, Pods can no longer reach CoreDNS, so every hostname lookup fails. The symptom is universally misread as an application or Service problem because nothing appears blocked — resolution simply times out. Every namespace with egress policy needs an explicit DNS allowance:

    - to:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: kube-system }
          podSelector:
            matchLabels: { k8s-app: kube-dns }
      ports:
        - { protocol: UDP, port: 53 }
        - { protocol: TCP, port: 53 }

TCP/53 matters as well as UDP: large responses and DNSSEC fall back to TCP, so a UDP-only rule produces intermittent failures on exactly the queries that are hardest to reproduce.

**Egress is where the security value is**, and it is the half most often skipped. Ingress policy limits who can reach a Pod; egress policy limits what a compromised Pod can do — reaching the cloud metadata endpoint to steal credentials, calling an internal admin API, or exfiltrating data. Two rules are worth applying almost universally: block \`169.254.169.254/32\` unless the workload genuinely needs instance metadata, and restrict egress to the internet to the services that actually require it.

**The API's real limits**, which decide when a mesh or a CNI extension is needed:

- **It is L3/L4 only.** Selection is by IP, port and protocol. You cannot express "GET but not DELETE", or restrict by HTTP path or gRPC method. Cilium and Istio both extend to L7; the standard API does not.
- **It cannot select by DNS name.** Rules resolve to IP ranges, so "allow egress to api.stripe.com" is not expressible in the standard API — a serious practical gap, since third-party endpoints sit behind rotating CDN addresses. Calico and Cilium both add DNS-aware egress rules for exactly this reason.
- **Enforcement depends entirely on the CNI.** The API is inert unless the plugin implements it — Flannel does not, and applying policy there produces no error and no enforcement. Verify with a test, not with a successful \`kubectl apply\`.
- **Policies are namespaced**, so a cluster-wide baseline means one policy per namespace and a mechanism to keep it there — a policy engine (Kyverno, Gatekeeper) generating a default-deny per new namespace is the usual answer. Calico and Cilium also offer genuinely cluster-scoped policy types.

**How to roll this out without an outage.** Never begin by applying default-deny in production. Start by observing actual flows — Hubble, Calico flow logs, or a service mesh's telemetry — and derive the allow set from what really happens rather than from the architecture diagram, which is invariably incomplete. Apply the resulting policy in a staging namespace first, then to one production namespace, watching connection errors. **Then** add default-deny. And test policies as code: a small job that attempts each permitted and each forbidden connection, run in CI, is the only way to know a policy still does what it claimed after six months of edits.`,
      },
    ],
    introduction: `## Overview
Kubernetes NetworkPolicy resources act as firewall rules for Pods inside the cluster. They are the primary tool for implementing the principle of least privilege at the network layer.

Default behavior: without any NetworkPolicy, every Pod can talk to every other Pod in the cluster on any port. This is intentional for ease of getting started but unsuitable for production.

How policies work: A NetworkPolicy selects a group of Pods using a podSelector (label-based). Once at least one NetworkPolicy selects a Pod, the Pod enters a "deny by default" posture for the policy types (Ingress, Egress) covered by that policy. Only traffic explicitly permitted by a rule is allowed.

Ingress rules: control traffic entering a selected Pod. You can allow traffic from specific Pods (podSelector), Namespaces (namespaceSelector), or IP blocks (ipBlock), on specific ports and protocols.

Egress rules: control traffic leaving a selected Pod. Same selectors apply. Important: if you restrict Egress, you must explicitly allow DNS (UDP 53 to kube-dns) or Pod DNS lookups will break.

Five-step adoption pattern: Start with all traffic allowed → Add labels to pods → Create a default-deny-all NetworkPolicy for the namespace → Add fine-grained allow rules for required traffic → Validate with kubectl exec + curl/nslookup.

Critical prerequisite: NetworkPolicy is enforced by the CNI plugin, not by Kubernetes itself. If you create NetworkPolicy objects with a CNI that does not support them (e.g., Flannel), the objects are stored but silently ignored — all traffic continues to flow. Use Calico, Cilium, Weave Net, Antrea, or Amazon VPC CNI for enforcement.`,
    whenToUse: [
      'Implementing zero-trust network posture inside a Kubernetes cluster',
      'Isolating namespaces from each other in a multi-tenant cluster',
      'Restricting a compromised Pod from lateral movement to other services',
      'Meeting compliance requirements (PCI-DSS, SOC2, HIPAA) that require network segmentation',
      'Any production cluster — the default allow-all posture is not appropriate for sensitive workloads',
    ],
    keyConcepts: [
      {
        term: 'podSelector',
        definition: 'Label selector within a NetworkPolicy that determines which Pods the policy applies to. An empty podSelector ({}) selects all Pods in the namespace — useful for a namespace-wide default-deny policy.',
      },
      {
        term: 'namespaceSelector',
        definition: 'Allows traffic from/to all Pods in namespaces matching the given labels. Must label the namespace (kubectl label namespace <ns> name=<ns>) for this to work.',
      },
      {
        term: 'policyTypes',
        definition: 'Declares whether the policy governs Ingress, Egress, or both. If Ingress is listed, the Pod gets a deny-all-ingress posture modified only by the ingress rules in this policy. Same for Egress.',
      },
      {
        term: 'Default deny all',
        definition: `A NetworkPolicy with an empty podSelector and no ingress/egress rules drops all traffic in that direction for all Pods in the namespace. Standard pattern: apply one default-deny, then add fine-grained allow policies on top.`,
      },
      {
        term: 'CNI enforcement requirement',
        definition: 'NetworkPolicy objects have no effect if the CNI does not implement them. Flannel does NOT support NetworkPolicy. Calico, Cilium, Weave Net, Antrea, and Amazon VPC CNI do.',
      },
      {
        term: 'DNS egress allow',
        definition: 'Any Egress NetworkPolicy must explicitly allow UDP/TCP port 53 to the kube-dns Service or all DNS lookups will fail — apps break with confusing errors that look like service connectivity issues, not DNS.',
      },
    ],
    approach: [
      'Label all Pods and Namespaces with meaningful labels before writing policies',
      'Start with a default-deny-all Ingress + Egress policy for the namespace',
      'Add explicit allow rules for each required traffic flow (frontend→backend, backend→database, all→kube-dns)',
      'Test each allow rule with kubectl exec -it <pod> -- curl / nslookup before applying default-deny to production',
      'Use a CNI that supports NetworkPolicy (Calico, Cilium, Antrea)',
      'Document every policy with comments explaining the business reason — policies become unmanageable without context',
    ],
    pitfalls: [
      'Using a CNI that does not enforce NetworkPolicy (Flannel) — policies are silently ignored',
      'Forgetting to allow DNS egress — apps break in confusing ways with no network connectivity error',
      'Overly broad namespaceSelector rules that allow cross-namespace traffic you didn\'t intend',
      'Not testing deny rules — easy to create a policy that accidentally allows everything due to empty selectors',
      'Applying default-deny to kube-system namespace — breaks cluster-level components',
    ],
    keyQuestions: [
      {
        question: 'What happens when you create a NetworkPolicy for a Pod that previously had no policy?',
        answer: `Before: the Pod accepts all ingress and egress traffic (default allow-all).

After creating a NetworkPolicy that selects the Pod: Kubernetes marks the Pod\'s Ingress and/or Egress as "managed." The CNI plugin now enforces a default-deny posture for the declared policyTypes. Only traffic explicitly permitted by the ingress/egress rules in any NetworkPolicy selecting that Pod is allowed through.

If multiple NetworkPolicies select the same Pod, the rules are additive (union). A packet is allowed if it matches ANY rule in ANY NetworkPolicy selecting that Pod.

Important: the policy only affects the policyTypes listed. If you create an Ingress-only policy, Egress is still open. You need a separate Egress policy (or list both types) to restrict outbound traffic.`,
      },
      {
        question: 'Write a NetworkPolicy that allows only frontend pods to reach backend pods on port 8080.',
        answer: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-allow-frontend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080

This policy selects all Pods with app=backend and allows ingress only from Pods with app=frontend on TCP 8080. All other ingress to backend is denied.

You also need a default-deny policy in the same namespace to close other ingress paths. And if backend makes outbound calls, an Egress policy allowing that traffic plus DNS (UDP 53).`,
      },
      {
        question: 'Why might a NetworkPolicy not be working even though you applied it correctly?',
        answer: `The most common root causes:

1. CNI does not support NetworkPolicy. Flannel silently ignores policies. Check: kubectl describe networkpolicy <name> — if no "Events" section shows enforcement, verify your CNI supports it.

2. Selector mismatch. The podSelector uses labels that don\'t match any Pod. Check: kubectl get pods -l app=backend in the namespace. If it returns nothing, the policy selects nothing.

3. Namespace not labeled. If you use namespaceSelector to allow traffic from another namespace, that namespace must have matching labels. Labels on namespaces are not set by default.

4. DNS blocked. Egress policy exists but doesn\'t allow UDP 53 to kube-dns. Apps appear broken even for reachable services because DNS resolution fails.

5. Policy applied to wrong namespace. NetworkPolicy is namespace-scoped. Applying it to namespace A does not affect Pods in namespace B.

6. Missing allow for both directions. If Pod A needs to reach Pod B, you may need Egress policy on A AND Ingress policy on B, depending on what default-deny policies exist.`,
      },
      {
        question: 'How do you implement a zero-trust network posture in a Kubernetes namespace?',
        answer: `Zero-trust means: deny everything by default, then explicitly allow only the minimum required traffic.

Step 1 — Label everything: pods, namespaces, and services with meaningful labels (app, tier, env).

Step 2 — Apply default-deny-all:
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress

Step 3 — Allow DNS for all pods (Egress to kube-dns):
Egress rule: to kube-system pods with k8s-app=kube-dns on UDP/TCP 53.

Step 4 — Add per-service allow rules:
frontend → backend on 8080, backend → database on 5432, monitoring → all pods on 9090.

Step 5 — Validate with kubectl exec -- curl and kubectl exec -- nslookup before deploying workloads.

Step 6 — Use Calico/Cilium for enforcement and enable audit logging to catch unexpected denies.`,
      },
    ],
    quickFire: [
      { q: 'What is the default network posture in a Kubernetes cluster?', a: 'Allow-all. Every Pod can reach every other Pod on any port until at least one NetworkPolicy selects it.' },
      { q: 'What happens when a NetworkPolicy selects a Pod for the first time?', a: 'The Pod enters deny-by-default for the declared policyTypes; only traffic matching an explicit ingress or egress rule is permitted.' },
      { q: 'How do multiple NetworkPolicies targeting the same Pod combine?', a: 'Rules are additive (union). A packet is allowed if it matches any rule in any policy selecting that Pod.' },
      { q: 'Why must you explicitly allow DNS in an Egress NetworkPolicy?', a: 'Restricting egress blocks UDP/TCP 53 to kube-dns, breaking all DNS lookups and making apps fail in confusing ways unrelated to the intended restriction.' },
      { q: 'What does an empty podSelector ({}) mean in a NetworkPolicy?', a: 'It selects all Pods in the namespace -- useful for a namespace-wide default-deny policy.' },
      { q: 'Which CNI plugins enforce NetworkPolicy?', a: 'Calico, Cilium, Weave Net, Antrea, and Amazon VPC CNI. Flannel does NOT -- policies are silently ignored.' },
      { q: 'What is a namespaceSelector and when does it require namespace labels?', a: 'It allows traffic from Pods in namespaces matching given labels. The target namespace must be labeled first; labels are not set by default.' },
      { q: 'How do you create a default-deny-all policy for a namespace?', a: 'Apply a NetworkPolicy with empty podSelector and policyTypes: [Ingress, Egress] and no rules. This denies all traffic in both directions for every Pod.' },
      { q: 'If a NetworkPolicy has only policyTypes: [Ingress], is egress also restricted?', a: 'No. Only the declared policyTypes are affected. Egress remains open unless a separate Egress policy also selects the Pod.' },
      { q: 'How do you debug a NetworkPolicy that appears to have no effect?', a: 'Check CNI supports policies, verify pod labels match the selector, confirm namespace labels exist for namespaceSelector rules, and check DNS egress is allowed.' },
    ],
    references: [
      'https://kubernetes.io/docs/concepts/services-networking/network-policies/',
      'https://docs.projectcalico.org/security/kubernetes-network-policy',
      'https://docs.cilium.io/en/stable/security/policy/',
      'https://github.com/ahmetb/kubernetes-network-policy-recipes',
    ],
  },

  {
    id: 'k8s-traffic-flow-deep',
    title: 'How User Requests Travel in Kubernetes',
    icon: 'gitBranch',
    color: '#14b8a6',
    questions: 4,
    description: 'End-to-end flow: User browser → DNS → Load Balancer → Ingress Controller → Kubernetes Service → kube-proxy/IPVS/iptables → Application Pod → Response. Covers each component role and common debugging points.',
    visualizations: [
      {
        title: 'Eight-step request journey — from browser to pod and back',
        description: 'User/Browser → DNS resolves domain to public endpoint → Load Balancer receives the packet → Ingress Controller applies host/path routing + TLS termination → Kubernetes Service (stable virtual IP) → kube-proxy/IPVS/iptables selects a healthy Pod → Application Pod processes request → Response travels back through the same path.',
        image: '/diagrams/linkdiags/k8s-traffic-flow.png',
      },
    ],
    topics: [
      {
        title: 'Following a request from client to container',
        content: `Tracing the full path is the fastest way to build an accurate mental model, and it is a common interview exercise because each hop is a place things break.

**External client to the cluster edge.** DNS resolves the hostname to a load balancer address — with an Ingress or Gateway, that is typically a cloud load balancer created by a Service of type LoadBalancer belonging to the ingress controller. The cloud LB forwards to a node, at a NodePort or directly to a Pod address depending on the mode.

**Arrival at the node.** For a NodePort, kube-proxy's rules DNAT the connection to a backend Pod, which may be on a **different** node — one extra hop, and the source address is rewritten to the node's, so the application sees the node rather than the client. Setting \`externalTrafficPolicy: Local\` prevents that second hop and preserves the client address, at the cost that a node with no local backend fails its health check and is removed from the LB's rotation. That is the correct trade for most ingress controllers and the reason they are usually deployed as a DaemonSet.

**The ingress controller.** This is a real Pod running a proxy — Envoy, NGINX, HAProxy. It terminates TLS, evaluates routing rules from Ingress or HTTPRoute objects, and picks a backend. Note that a mature controller resolves **EndpointSlices directly and load-balances itself**, bypassing the Service ClusterIP entirely. This matters: session affinity, retry and circuit-breaking configured on the Service have no effect, and the controller's own configuration governs.

**Controller to application Pod.** If the ClusterIP path is used, kube-proxy or eBPF translates it; otherwise the controller connects straight to a Pod address. In a service mesh, the connection is intercepted by the sidecar or node proxy, which applies mTLS, policy, retries and telemetry before forwarding.

**Into the container.** The packet arrives on the veth, enters the Pod's network namespace, and reaches the listening process. **A container listening on 127.0.0.1 is reachable only from inside its own Pod** — a frequent cause of a Pod that passes its liveness probe (kubelet uses the Pod IP) while all Service traffic fails, or the reverse.

**East-west between Pods** is the simpler case: DNS resolves \`service.namespace.svc.cluster.local\` to the ClusterIP, and the local node translates it to a backend. Worth knowing that \`ndots: 5\` in the default resolv.conf means a name with fewer than five dots is tried against every search domain first, so an external hostname costs several failed lookups before the correct one — a measurable latency and DNS-load problem that is fixed by a trailing dot on fully-qualified names or a tuned dnsConfig.`,
      },
      {
        title: 'Where traffic actually breaks, and how to isolate it',
        content: `Almost every "the Service is not working" report resolves to one of a small set of causes. Working through them in order is faster than reading manifests.

**The selector matches nothing.** A Service selects Pods by label; a typo or a changed template label produces a Service with no endpoints and connections that hang or refuse. \`kubectl get endpointslices\` is the direct check, and an empty result ends the investigation immediately. This is the single most common cause.

**The Pod is not Ready.** Endpoints only include ready Pods, so a failing readiness probe silently removes a backend. If every replica is unready the Service has no endpoints at all — same symptom, different cause, and the probe status distinguishes them.

**Port confusion.** A Service has three: \`port\` (the Service's own), \`targetPort\` (the container's), and \`nodePort\`. A mismatch between targetPort and the container's actual listening port produces connection refused from the backend while everything looks correctly configured. Named ports help, because the name is resolved against the Pod spec.

**Listening on localhost.** As above — binding 127.0.0.1 rather than 0.0.0.0 makes the process unreachable from outside its namespace.

**Policy.** A NetworkPolicy blocking the flow, very often the DNS case described in the network-policy topic. The signature is name resolution timing out rather than connections being refused.

**MTU.** Small requests succeed, large ones or TLS handshakes hang. Almost always an overlay MTU that was not lowered for the encapsulation header.

**Conntrack exhaustion.** On iptables-mode kube-proxy under high connection churn, the table fills and new connections are dropped with no useful error. \`nf_conntrack_count\` against \`nf_conntrack_max\` on the node is the check, and it explains failures that appear random and node-correlated.

**A graceful-shutdown race.** Endpoint removal and the Pod's SIGTERM happen concurrently, so in-flight requests can be routed to a Pod that has already begun shutting down. This shows up as a burst of 502s on every deploy. The remedy is a \`preStop\` sleep of a few seconds so the Pod keeps serving while endpoint removal propagates, plus a \`terminationGracePeriodSeconds\` long enough to cover it.

**Isolating a fault, in order.** Work from the inside out, which halves the search space at each step:

1. \`kubectl exec\` into the Pod and curl \`localhost:<containerPort>\`. If this fails, it is the application, not the network.
2. From another Pod, curl the **Pod IP** directly. Failure here means CNI, policy or MTU.
3. Curl the **ClusterIP**. Failure means kube-proxy, endpoints or the selector.
4. Curl the **Service DNS name**. Failure means CoreDNS or the search-domain configuration.
5. Only then look at the ingress controller, the load balancer and DNS outside the cluster.

An ephemeral debug container (\`kubectl debug\`) attaches tooling to a distroless Pod's namespaces without rebuilding the image, which is what makes step 1 possible on a production image with no shell.`,
      },
    ],
    introduction: `## Overview
Understanding how a user request travels from a browser to a Kubernetes Pod and back is essential for both architecture decisions and incident debugging. Seven components participate in the journey, each with a distinct role.

Step 1 — DNS: The user\'s browser resolves the domain name (e.g., api.example.com) to an IP address. That IP belongs to a cloud load balancer or an Ingress Controller\'s Service of type LoadBalancer.

Step 2 — Load Balancer: The cloud provider\'s load balancer (AWS ALB, GCP GLBC, Azure Application Gateway) distributes incoming TCP/HTTP connections across the nodes running the Ingress Controller pods.

Step 3 — Ingress Controller: An Ingress Controller (nginx-ingress, Traefik, AWS ALB Ingress, Istio Gateway) runs as a Pod. It reads Ingress objects from the Kubernetes API and programs its routing table. It handles: TLS termination (certificate from cert-manager/ACM), virtual host routing (host: api.example.com), path-based routing (/v1 → service-v1, /v2 → service-v2), and rate limiting/auth headers.

Step 4 — Kubernetes Service: The Ingress Controller forwards to a ClusterIP Service. The Service is a stable abstraction — it does not run the application. It tracks healthy Pods via Endpoint objects updated by the Endpoints controller.

Step 5 — kube-proxy / IPVS / iptables: kube-proxy programs DNAT rules. When a packet arrives with the Service ClusterIP as destination, iptables/IPVS rewrites the destination to one of the healthy Pod IPs (random or round-robin selection). This happens in kernel space on the receiving node.

Step 6 — Application Pod: The Pod\'s container receives the request, processes it, and sends back a response. The response path reverses through the same iptables/IPVS SNAT rules.

Critical insight: the user never connects directly to a Pod. The Pod IP is ephemeral. The chain of abstractions (LB → Ingress → Service → Pod) exists to decouple stable access points from volatile compute.

Debugging order: Pod running? → Labels match Service selector? → Service has Endpoints? → DNS resolves Service? → Ingress configured correctly? → Cloud LB healthy?`,
    whenToUse: [
      'Debugging "my app is not reachable" incidents systematically without guessing',
      'Architecture review of a new Kubernetes deployment — ensuring each layer is correctly configured',
      'Interview questions about Kubernetes networking from the application perspective',
      'Explaining to a developer why changing a Pod label broke their deployment\'s traffic',
      'Choosing between Ingress, Gateway API, and Service of type LoadBalancer',
    ],
    keyConcepts: [
      {
        term: 'Ingress Controller',
        definition: 'A Pod running a reverse proxy (nginx, Traefik, HAProxy) that reads Ingress objects and programs its own routing table. It provides TLS termination, virtual hosting, path routing, and often auth/rate-limiting. It is NOT built into Kubernetes — you deploy it separately.',
      },
      {
        term: 'Kubernetes Service',
        definition: 'A stable virtual IP (ClusterIP) and DNS name. Does NOT run the application — it is a load balancing abstraction that selects healthy backend Pods by label. The Endpoints controller keeps the list of Pod IPs current.',
      },
      {
        term: 'Endpoints object',
        definition: 'Automatically maintained by Kubernetes. Lists the IP:port of every ready Pod matching the Service selector. kube-proxy reads this to program iptables/IPVS. If no Endpoints, the Service has no backends and traffic fails.',
      },
      {
        term: 'kube-proxy DNAT',
        definition: 'Destination Network Address Translation. kube-proxy writes iptables/IPVS rules that rewrite the Service ClusterIP to a real Pod IP when a packet arrives. Happens in kernel space, transparent to the application.',
      },
      {
        term: 'TLS termination at Ingress',
        definition: 'The Ingress Controller decrypts HTTPS traffic using a TLS certificate (from Kubernetes Secret, cert-manager, or cloud ACM). Traffic from Ingress to the backend Service is typically plain HTTP inside the cluster.',
      },
      {
        term: 'Gateway API',
        definition: 'The successor to Ingress in Kubernetes. More expressive: HTTPRoute, TCPRoute, GRPCRoute resources with richer traffic policies. Supported by Istio, Envoy Gateway, Cilium. Not yet universally adopted but the direction for new clusters.',
      },
    ],
    approach: [
      'Map all seven layers before debugging: DNS → LB → Ingress → Service → Endpoints → Pod',
      'Start from the Pod and work outward — confirm Pod is Running and Healthy first',
      'Check Service Endpoints: kubectl get endpoints <service> — if empty, label mismatch or no ready Pods',
      'Test DNS inside cluster: kubectl exec -it <pod> -- nslookup <service>.<namespace>',
      'Check Ingress rules: kubectl describe ingress <name> — look for backend Service and port',
      'Use kubectl port-forward to bypass Ingress/LB and test Pod directly when isolating issues',
    ],
    pitfalls: [
      'Pod label not matching Service selector — Service has zero Endpoints, traffic drops silently',
      'Ingress Controller not deployed or in a different namespace from the Ingress object',
      'TLS Secret not found by Ingress Controller — HTTPS fails but HTTP works',
      'kube-proxy sync lag — after scaling up pods, iptables rules take a few seconds to update; brief 503s are normal',
      'Service port vs containerPort mismatch — Service forwards to wrong port, app never receives the request',
      'Forgetting that LoadBalancer Services provision a cloud LB with a cost — use Ingress + one LB Service for the controller instead',
    ],
    keyQuestions: [
      {
        question: 'Trace a user request step by step from browser to Kubernetes pod.',
        answer: `Eight-step journey:

1. User browser performs DNS lookup for api.example.com. DNS returns the IP of the cloud Load Balancer (or Ingress Controller\'s external IP).

2. Browser connects to the Load Balancer IP on port 443. The cloud LB forwards the TCP connection to one of the nodes running the Ingress Controller pods.

3. The Ingress Controller pod receives the TLS connection. It terminates TLS using the certificate stored in a Kubernetes Secret. It reads the Host header and path, looks up its routing table (built from Ingress objects), and selects the target Service.

4. The Ingress Controller sends an HTTP request to the ClusterIP of the backend Service (e.g., 10.96.0.50:8080).

5. The packet with dst=10.96.0.50 hits iptables/IPVS on the node. kube-proxy\'s DNAT rule rewrites the destination to a real Pod IP (e.g., 10.244.3.7:8080).

6. The packet is routed to the node hosting that Pod (via CNI). The Pod\'s container receives the HTTP request.

7. The application processes the request and sends back an HTTP response.

8. The response travels back through iptables (SNAT restores the original ClusterIP), to the Ingress Controller, through the cloud LB, and back to the browser.

The user never touched a Pod IP directly. The entire chain exists to make ephemeral Pods reachable via stable addresses.`,
      },
      {
        question: 'Why does a Service with a correct selector still show no Endpoints?',
        answer: `Four root causes:

1. No Pods are Ready. Pods exist but fail readiness probes. kubectl get pods -l <selector> — look for Ready=0/1. Fix the readiness probe issue or the app startup problem.

2. Label mismatch. The selector in the Service spec does not exactly match the labels on the Pods. kubectl get pods --show-labels and compare to the Service selector precisely. Labels must match all key-value pairs in the selector.

3. Namespace mismatch. The Service and the Pods are in different namespaces. A Service can only select Pods in the same namespace (for ClusterIP/NodePort). Use ExternalName or multi-cluster routing for cross-namespace.

4. Endpoints controller lag. In a rapidly changing cluster, Endpoints can be stale for a few seconds after Pod deletion/creation. Usually self-corrects but can cause brief 503s.

Debug: kubectl describe service <name> — look at the Selector field and the Endpoints line. kubectl get endpoints <name> -o yaml to see the full list of IPs.`,
      },
      {
        question: 'What is the difference between a Service of type LoadBalancer and an Ingress?',
        answer: `Service LoadBalancer: Provisions one cloud load balancer per Service. The load balancer gets a dedicated public IP and forwards TCP traffic directly to node ports. Simple but expensive — each Service costs a cloud LB. Good for non-HTTP protocols (gRPC, TCP services, game servers).

Ingress: A single Ingress Controller pod (backed by one cloud LB or NodePort) handles many HTTP/HTTPS services. Traffic routing is done at Layer 7 (HTTP Host header, URL path). One cloud LB per cluster, multiplexed across many Services. Supports TLS termination, path routing, virtual hosting, canary weights (on supported controllers like nginx-ingress).

Rule of thumb: Use one LoadBalancer Service for the Ingress Controller itself, and Ingress objects for all HTTP/HTTPS services. Use LoadBalancer Services directly only for non-HTTP protocols that Ingress cannot route.

Gateway API: The next generation — HTTPRoute, TCPRoute, GRPCRoute resources replace Ingress with more expressive routing rules and better multi-team support.`,
      },
    ],
    quickFire: [
      { q: 'What is the path of a request from a client to a Pod?', a: 'Client --> DNS --> Ingress controller (L7 routing) --> Service (ClusterIP, load-balanced) --> Pod IP via kube-proxy DNAT or eBPF.' },
      { q: 'What is the difference between a ClusterIP and a NodePort Service?', a: 'ClusterIP is cluster-internal only. NodePort exposes a static port on every node, allowing external traffic to reach the Service.' },
      { q: 'What does an Ingress resource do that a Service cannot?', a: 'Ingress provides host-based and path-based HTTP/HTTPS routing, TLS termination, and a single external IP for multiple services.' },
      { q: 'What is the difference between iptables mode and IPVS mode in kube-proxy?', a: 'iptables uses sequential rules (O(n) lookup). IPVS uses kernel hash tables (O(1)) and supports more load-balancing algorithms; better at scale.' },
      { q: 'What is a headless Service and when would you use it?', a: 'A Service with clusterIP: None. DNS returns the individual Pod IPs instead of a VIP -- used for StatefulSets and direct pod addressing.' },
      { q: 'How does an Ingress controller differ from an Ingress resource?', a: 'The Ingress resource is the config object. The Ingress controller (e.g., nginx-ingress, Traefik) is the actual proxy that reads it and handles traffic.' },
      { q: 'What is the Kubernetes Gateway API and how does it improve on Ingress?', a: 'Gateway API is the next-gen replacement for Ingress. It is role-oriented (GatewayClass, Gateway, HTTPRoute), supports TCP/UDP, and has richer traffic shaping semantics.' },
      { q: 'How does kube-proxy handle Service endpoint changes?', a: 'It watches the EndpointSlice API. When Pods are added or removed, kube-proxy rewrites iptables/IPVS rules within seconds to reflect the current healthy set.' },
      { q: 'What does ExternalTrafficPolicy: Local do on a NodePort Service?', a: 'It preserves the client source IP by only routing to Pods on the same node. Pods on nodes without a local endpoint get no traffic -- avoids extra hop but can cause imbalance.' },
    ],
    references: [
      'https://kubernetes.io/docs/concepts/services-networking/ingress/',
      'https://kubernetes.io/docs/concepts/services-networking/service/',
      'https://gateway-api.sigs.k8s.io/',
      'https://kubernetes.io/docs/tasks/debug/debug-application/',
    ],
  },

  {
    id: 'k8s-deployment-strategies-guide',
    title: 'Kubernetes Deployment Strategies',
    icon: 'gitBranch',
    color: '#14b8a6',
    questions: 5,
    description: 'Six deployment strategies for zero-downtime releases: Canary (gradual %), Blue-Green (instant switch), A/B Testing (user segment), Rolling Update (pod-by-pod), Recreate (delete all then create), Shadow (mirror traffic). Each has distinct downtime and rollback characteristics.',
    visualizations: [
      {
        title: 'Six deployment strategies — tradeoffs at a glance',
        description: 'Canary: 80/20 traffic split, gradual shift, no downtime, instant rollback. Blue-Green: full parallel environment, instant switch, no downtime, expensive (double infra). A/B Testing: route by user segment (mobile/desktop/geography). Rolling Update: pod-by-pod replacement, default Kubernetes, no downtime, slower rollback. Recreate: delete all V1 then create V2, downtime yes, simplest. Shadow: copy of prod traffic to V2 in parallel, users see V1.',
        image: '/diagrams/linkdiags/k8s-deployment-strategies.png',
      },
    ],
    topics: [
      {
        title: 'What a rolling update really does, and the knobs that control it',
        content: `A Deployment does not update Pods. It creates a **new ReplicaSet** and shifts replicas between old and new, which is why rollback is instant — the old ReplicaSet is still there, scaled to zero, and rolling back scales it back up rather than rebuilding anything.

Two parameters govern the shift, and they are the whole of the strategy:

- **maxUnavailable** — how many replicas may be unavailable during the update. As an absolute number or a percentage of desired.
- **maxSurge** — how many replicas may exist above desired.

The defaults are 25% each, which is a reasonable general answer and wrong at both extremes. With \`maxUnavailable: 0\` the update always adds capacity before removing any, so serving capacity never dips — the right choice for a latency-sensitive service, at the cost of needing headroom for the surge. With \`maxSurge: 0\` the update never exceeds the replica count, which is what a fixed licence pool or a constrained node group requires, at the cost of running below capacity mid-update. **Both cannot be zero**, since that permits no progress at all, and the API rejects it.

Three further fields decide how the rollout behaves when something is wrong:

- **minReadySeconds** — how long a Pod must be ready before counting as available. Without it, a Pod that becomes ready and crashes two seconds later still counts, and the rollout marches on destroying every healthy replica. This is the single most valuable field for catching a bad image, and it is usually unset.
- **progressDeadlineSeconds** — after this long without progress the Deployment is marked failed. Note that it **does not roll back**; it stops and reports, so a human or an automated check must act. Assuming it self-heals is a common and costly misreading.
- **revisionHistoryLimit** — how many old ReplicaSets to retain. Keep enough to roll back more than one revision.

**Readiness probes are what make the whole mechanism safe.** Rolling update correctness depends entirely on "ready" meaning "can serve". A probe that returns 200 unconditionally converts a rolling update into a rolling outage, because Kubernetes faithfully removes healthy old Pods in exchange for new ones that cannot serve. The probe should check the dependencies the request path needs — and specifically **should not** check downstream services whose blip would take the whole fleet out of rotation simultaneously.

Distinguish the three probes, since conflating them causes real incidents: **liveness** restarts a wedged container (make it cheap and local, or a slow dependency triggers mass restarts), **readiness** gates traffic, and **startup** suspends the other two while a slow application boots — which is the correct fix for a JVM that needs ninety seconds, rather than inflating the liveness threshold and thereby delaying real failure detection for the container's whole life.`,
      },
      {
        title: 'Blue-green, canary, and choosing between them',
        content: `Rolling update is the default because it needs no extra infrastructure. The other strategies buy properties it cannot provide.

**Blue-green** runs two complete environments and switches traffic atomically, usually by repointing a Service selector or a Gateway route. Its properties are the appeal: the cutover is instantaneous, so no request is served by a mixed fleet, and rollback is equally instantaneous because blue is still running and untouched. The costs are double the resources for the overlap window, and — the part usually underestimated — **both versions must be able to share the database simultaneously**, since a rollback after a schema change is only possible if the schema supports both. Expand-and-contract migrations are a prerequisite, not an optimisation.

**Canary** sends a small share of traffic to the new version, watches, and increases progressively. It is the only strategy that gives **real production signal before full exposure**, which is what makes it the right default for anything risky. It requires traffic splitting — a service mesh, or Gateway API weighted backendRefs — and, critically, per-version metrics: a canary you cannot measure separately from the baseline is just a slow rollout.

Automating it is what makes canary practical. **Argo Rollouts** and **Flagger** both replace the Deployment with a controller that steps the weight up on a schedule, queries a metrics provider at each step, and rolls back automatically when an analysis fails. The analysis should compare canary against baseline rather than against a fixed threshold, because absolute thresholds fail during unrelated traffic changes and comparison does not.

Two adjacent techniques worth knowing:

- **Shadow / mirror traffic** copies live requests to the new version and discards the responses, so real production traffic exercises it with zero user risk. Ideal for validating a rewrite or a performance change; unsafe where the request has side effects, unless writes are stubbed.
- **Feature flags** decouple release from deploy entirely, and can target by user or cohort rather than by traffic percentage. They complement rather than replace the above — the deploy is a rolling update, and the release is a flag flip.

**Choosing.** Rolling update for stateless services where a brief mixed fleet is acceptable — most services. Blue-green when mixed versions are genuinely unacceptable, or when a fast, certain rollback is worth double the infrastructure. Canary when the change is risky and per-version metrics exist to judge it. Note also what none of these solve: **a stateful workload does not fit any of them cleanly**, because a StatefulSet updates in ordinal order with its own guarantees, and data migration governs the sequence rather than traffic shifting does.

Finally, the property that matters more than the choice: **every strategy needs a defined rollback trigger and an owner.** A canary without automated analysis, or a blue-green without a decision rule, is a manual judgement made under pressure at the worst possible moment.`,
      },
    ],
    introduction: `## Overview
Choosing the right deployment strategy determines how much risk you accept per release and how quickly you can recover from a bad deployment.

Rolling Update (default Kubernetes): Kubernetes replaces pods one by one. New pods start, pass readiness probes, then old pods are terminated. maxSurge controls how many extra pods can exist during rollout; maxUnavailable controls how many old pods can be removed before new ones are ready. No downtime, but V1 and V2 run simultaneously during rollout — if V2 has backward-incompatible API or DB changes, this is a problem.

Recreate: Terminate ALL old pods first, then create new pods. There is a window of downtime. Only appropriate for development, stateful workloads that cannot run two versions simultaneously, or cases where the new version requires a clean DB migration.

Canary: Deploy V2 alongside V1 but route only a small percentage of traffic (5–20%) to V2. Monitor error rates, latency, and business metrics. Gradually shift traffic to 100% if healthy. Rollback = reduce V2 traffic weight to 0%. Requires an Ingress controller or service mesh that supports traffic weighting (nginx-ingress, Istio, Flagger).

Blue-Green: Run V2 (green) on a completely separate set of pods while V1 (blue) handles all traffic. When green is ready, switch the load balancer/Ingress in a single step. Rollback = switch back instantly. Downside: requires double the infrastructure while both environments run.

A/B Testing: Route traffic based on user attributes (header, cookie, geography, account tier) rather than a percentage. V1 for mobile users, V2 for desktop. Used for feature experiments. Requires a smart Ingress or service mesh with header-based routing.

Shadow (Traffic Mirroring): Send a copy of every real request to V2 in parallel. V2 processes requests but users receive V1\'s response. Validates V2 behavior and performance under real load without any user impact. Requires support from the service mesh or proxy (Istio, Envoy).`,
    whenToUse: [
      'Canary: risk-averse teams rolling out to a fraction of users before full release',
      'Blue-Green: mission-critical services where instant rollback is required and infra cost is acceptable',
      'Rolling Update: standard releases of stateless services with backward-compatible changes',
      'Recreate: stateful apps that cannot tolerate two versions running simultaneously',
      'A/B Testing: product experiments where different user segments should see different behavior',
      'Shadow: load testing a new version without any user risk before any canary traffic is shifted',
    ],
    keyConcepts: [
      {
        term: 'maxSurge',
        definition: 'Rolling Update parameter. Maximum number of extra pods above the desired count that can exist during rollout. Default: 25%. Higher = faster rollout but more resource usage.',
      },
      {
        term: 'maxUnavailable',
        definition: 'Rolling Update parameter. Maximum number of pods that can be unavailable during rollout. Default: 25%. Lower = safer (more capacity maintained) but slower rollout.',
      },
      {
        term: 'Canary weight',
        definition: 'The percentage of traffic routed to the new version. Implemented via Ingress annotations (nginx.ingress.kubernetes.io/canary-weight) or Istio VirtualService weight fields. Flagger automates canary progression and rollback.',
      },
      {
        term: 'Blue-Green switch',
        definition: 'The act of changing the Ingress or Service selector to point from blue (old) to green (new) pods. In Kubernetes: update the Service spec.selector to match green pod labels, or update Ingress backend Service name.',
      },
      {
        term: 'Traffic mirroring (Shadow)',
        definition: 'Envoy/Istio feature that duplicates every inbound request and forwards a copy to a second cluster or Service. The mirrored traffic is "fire-and-forget" — responses from the shadow are discarded. Real users only see responses from the primary.',
      },
      {
        term: 'Flagger',
        definition: 'Kubernetes operator that automates canary deployments. Integrates with Istio, nginx-ingress, AWS ALB. Automatically shifts traffic, queries Prometheus metrics, and rolls back if error rate or latency thresholds are breached.',
      },
    ],
    approach: [
      'Default to Rolling Update for stateless services with backward-compatible changes',
      'Use Canary for any release that carries meaningful business or technical risk',
      'Use Blue-Green when instant rollback is a hard requirement and infra budget permits',
      'Use Recreate only when two versions truly cannot coexist (schema incompatibility, file locks)',
      'Automate canary with Flagger or Argo Rollouts to get automatic metric-based rollback',
      'Combine strategies: Shadow test before Canary, Canary before Blue-Green go-live',
    ],
    pitfalls: [
      'Rolling Update with backward-incompatible DB schema changes — V1 and V2 pods share the same DB and one version crashes',
      'Canary without traffic weighting support in the Ingress — naive Canary just runs two Deployments with no weight control',
      'Blue-Green with stateful sessions tied to blue pods — session data lost when switching to green',
      'Recreate in production without a change freeze and user communication — surprise downtime',
      'Shadow traffic doubling backend DB/service load — shadow pods use the same downstream services as production',
    ],
    keyQuestions: [
      {
        question: 'Compare rolling update vs blue-green vs canary deployment.',
        answer: `Rolling Update — default Kubernetes strategy. Pods replaced one at a time. V1 and V2 run simultaneously during rollout. No downtime. Rollback is slower (rolls back pod by pod). Best for: standard stateless service releases with backward-compatible changes.

Blue-Green — two identical environments. V2 (green) deployed in full; switch happens instantly by updating the load balancer/Ingress. No downtime. Instant rollback (flip back). Expensive: double infrastructure. Best for: mission-critical services needing instant rollback or zero mixed-version window.

Canary — small percentage of traffic to V2, rest to V1. Gradual shift as confidence grows. Instant rollback (reduce V2 weight to 0). Low blast radius for issues. Requires traffic-weighted routing (Ingress annotation or service mesh). Best for: high-risk releases, new features, performance-sensitive changes.

Choosing rule: Canary for risk-averse gradual rollout, Blue-Green for instant switchback requirement, Rolling for routine releases, Recreate when versions can\'t coexist.`,
      },
      {
        question: 'How do you implement a canary deployment in Kubernetes without a service mesh?',
        answer: `With nginx-ingress controller:

1. Deploy V2 as a separate Deployment with a different label (e.g., version: v2) but same app label.

2. Create a second Service targeting v2 pods only.

3. Create a canary Ingress resource for the same host:
   annotation: nginx.ingress.kubernetes.io/canary: "true"
   annotation: nginx.ingress.kubernetes.io/canary-weight: "20"
   backend: service-v2

4. nginx-ingress routes 20% of requests to service-v2, 80% to the original service-v1.

5. Monitor error rates. To increase: kubectl annotate ingress <canary> nginx.ingress.kubernetes.io/canary-weight=50 --overwrite.

6. To roll back: delete the canary Ingress and scale down V2 Deployment.

With Argo Rollouts: declare a Rollout resource with canarySteps (setWeight, pause, analysis) instead of a Deployment. Argo Rollouts manages the traffic split and integrates with Prometheus for automated rollback on metric breach.`,
      },
    ],
    quickFire: [
      { q: 'What is the default Kubernetes deployment strategy?', a: 'RollingUpdate. It gradually replaces old Pods with new ones, keeping the application available throughout. Controlled by maxUnavailable and maxSurge.' },
      { q: 'What does maxSurge and maxUnavailable control in a rolling update?', a: 'maxSurge is the max extra Pods above desired count. maxUnavailable is the max Pods that can be down simultaneously. Both accept absolute or percentage values.' },
      { q: 'How does a Recreate strategy differ from RollingUpdate?', a: 'Recreate terminates all old Pods first, then starts new ones -- causes a downtime window. Use only when old and new versions cannot run simultaneously.' },
      { q: 'How is Blue-Green deployment implemented in Kubernetes?', a: 'Run two identical Deployments (blue and green). Switch the Service selector between them for instant traffic cutover. Rollback is instant by switching back.' },
      { q: 'How does a Canary deployment work in Kubernetes?', a: 'Deploy a small Replica of the new version alongside the old. Gradually shift traffic (via Argo Rollouts, Flagger, or weighted Services). Monitor metrics before fully cutting over.' },
      { q: 'What is HPA and what metric does it use by default?', a: 'Horizontal Pod Autoscaler scales a Deployment replica count based on observed CPU utilization (default) or custom metrics. It polls metrics every 15 seconds.' },
      { q: 'What is the difference between HPA and VPA?', a: 'HPA scales horizontally (replica count). VPA scales vertically (CPU/memory requests per Pod). They should not both manage the same resource simultaneously.' },
      { q: 'What tool enables progressive traffic shifting for canary deployments?', a: 'Argo Rollouts or Flagger. Both integrate with a service mesh or Ingress to split traffic by percentage and automate promotion/rollback based on metrics.' },
      { q: 'How do you trigger a rollback in Kubernetes?', a: 'kubectl rollout undo deployment/<name>. Use --to-revision=<n> to target a specific revision. Kubernetes keeps a configurable revisionHistoryLimit of ReplicaSets.' },
      { q: 'When would you choose Blue-Green over Canary?', a: 'Blue-Green for instant, full-traffic cutover with zero partial state (e.g., breaking schema changes). Canary for gradual validation with a subset of users before full rollout.' },
    ],
    references: [
      'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy',
      'https://argoproj.github.io/argo-rollouts/',
      'https://flagger.app/docs/',
      'https://istio.io/latest/docs/tasks/traffic-management/traffic-shifting/',
    ],
  },

  {
    id: 'k8s-pod-troubleshooting-guide',
    title: 'Kubernetes Pod Troubleshooting — 30 Common Issues',
    icon: 'gitBranch',
    color: '#14b8a6',
    questions: 5,
    description: 'Systematic kubectl commands for 30 common Kubernetes problems: pod not running, CrashLoopBackOff, ImagePullBackOff, pending pods, OOMKilled, DNS failures, service not reachable, ingress issues, volume problems, network policy blocks, and deployment rollbacks.',
    visualizations: [
      {
        title: 'Kubernetes troubleshooting command reference',
        description: '30 problems mapped to precise kubectl commands. Core principle: always run kubectl describe first — the Events section tells you what Kubernetes is actually doing. kubectl describe is a superpower.',
        image: '/diagrams/devops/k8s-networking-cni.png',
      },
    ],
    topics: [
      {
        title: 'Reading the state — what each phase and reason actually means',
        content: `Diagnosis starts with reading the state precisely, because each one narrows the cause to a specific subsystem. \`kubectl describe pod\` is the first command, and the Events at the bottom usually contain the answer.

**Pending** — the Pod exists in the API but no kubelet has started it. This is nearly always **scheduling**, and describe names the reason: insufficient CPU or memory on every node, a taint with no matching toleration, a node selector or affinity rule nothing satisfies, or a PersistentVolumeClaim that is unbound. A Pod pending with no scheduling message at all usually means the scheduler itself is unhealthy or the pod CIDR is exhausted.

**ContainerCreating** — scheduled, but the sandbox is not up. Causes are image pull in progress, a volume that will not mount (very often a cloud disk attached to the wrong zone, or an RWO volume still attached to another node), a missing Secret or ConfigMap referenced by the spec, or a CNI failure allocating an address.

**ImagePullBackOff / ErrImagePull** — the registry rejected or could not serve the image. A wrong tag or repository, missing \`imagePullSecrets\`, a private registry the node cannot reach, or rate limiting. The Events line states which.

**CrashLoopBackOff** is the most misread of all. **It is not an error — it is a back-off timer.** The container starts, exits, and kubelet restarts it with exponential delay up to five minutes. The status tells you the container keeps exiting; it says nothing about why. The cause is in the logs of the **previous** run, which is what \`kubectl logs --previous\` retrieves — the current container may not have started yet, so plain \`kubectl logs\` frequently returns nothing and sends people down the wrong path.

The exit code narrows it further: **0** means the process completed, which for a long-running service usually means the command was wrong or a config error caused a clean exit; **1** is a generic application error; **137** is SIGKILL, which for a container almost always means **OOMKilled** — confirm in the container's \`lastState\`; **139** is a segfault; **143** is SIGTERM, a normal shutdown. A liveness probe that fails repeatedly also produces a restart loop, and describe shows the probe failures explicitly, which distinguishes it from an application crash.

**OOMKilled** deserves its own note because the fix is often wrong. The container exceeded its memory **limit** and the kernel killed it. Raising the limit is right if the workload genuinely needs more; it is wrong if there is a leak, which merely delays the kill. For the JVM and other runtimes with their own heap management, the actual cause is frequently a heap sized without reference to the container limit — the runtime sizes itself against the visible machine and is then killed for using what it was told it had.

**Evicted** means kubelet reclaimed resources under node pressure — memory, disk or inodes. The Pod is not restarted in place; it is deleted and rescheduled, and the fix is usually a resource request that reflects reality, since Guaranteed and Burstable Pods are evicted after BestEffort ones.

**Terminating and stuck** — a Pod that will not delete is nearly always a **finalizer** waiting on something, or a node that is unreachable so kubelet cannot confirm termination. Force deletion removes the API object without confirming the container stopped, which for a StatefulSet risks two instances writing at once; it should be the last resort, not the first.`,
      },
      {
        title: 'A working procedure, and the tools for images with no shell',
        content: `A repeatable order matters more than knowing every command, because it converges instead of wandering.

1. **\`kubectl get pod -o wide\`** — phase, restart count, age, node. Restart count and age together tell you whether this is a new failure or a long-running loop.
2. **\`kubectl describe pod\`** — read Events from the bottom up. Scheduling failures, probe failures, image pulls, volume mounts and evictions all report here, and roughly half of all cases end at this step.
3. **\`kubectl logs --previous\`** for a restarting container, then current logs. For multi-container Pods, \`-c\` per container, and remember init containers have their own logs — a Pod stuck in Init is an init container failing, and its logs are the only place that shows.
4. **\`kubectl get events --sort-by=.lastTimestamp\`** for namespace-wide context. A single Pod's failure is often a symptom of node pressure or a controller problem visible only here.
5. **Exec in** and check from inside: is the process listening on the expected address and port, are the mounted files present, are the environment variables correct.
6. **Check the node** if several Pods on one node are unhealthy — \`kubectl describe node\` for pressure conditions and allocatable capacity.

**When the image has no shell.** Distroless and scratch images are correct for production and defeat \`kubectl exec\`. **\`kubectl debug\`** solves this in two forms, and knowing both is the point:

- \`kubectl debug -it <pod> --image=busybox --target=<container>\` attaches an **ephemeral container** sharing the target's process and network namespaces, so its tooling can inspect the running process and its network without restarting anything. This is the one to reach for.
- \`kubectl debug <pod> --copy-to=<name> --set-image=*=<image>\` creates a **copy** of the Pod with a different image or command — for when the container will not start at all, so there is nothing to attach to. Overriding the command with a sleep lets you inspect the filesystem and configuration of a Pod that otherwise crashes immediately.

\`kubectl debug node/<node>\` gives a privileged Pod in the node's namespaces, which is how you inspect a node without SSH access.

**A note on the most common false trail.** A Pod that is Running and Ready but receives no traffic is not a Pod problem at all — it is a Service, endpoint or policy problem, and the checks belong in the traffic-flow procedure. Confirm the Pod is genuinely serving with a localhost curl from inside it before investigating the Pod any further; if that works, the fault is somewhere between the client and the Pod, and time spent reading the Pod spec is time wasted.`,
      },
    ],
    introduction: `## Overview
Kubernetes is a complex distributed system but it exposes rich diagnostic information. Nearly every problem can be diagnosed with kubectl if you know which command to run and what to look for. The Events section in kubectl describe output is the single most valuable source of truth.

Taxonomy of common failures:

Pod lifecycle failures: Pod not running, CrashLoopBackOff, ContainerCreating, ImagePullBackOff, Pending. These are diagnosed with kubectl get pods, kubectl describe pod, and kubectl logs.

Resource failures: OOMKilled (container exceeded memory limit), CPU throttling, node not ready, insufficient resources. Diagnosed with kubectl top and kubectl describe node.

Networking failures: Service not reachable, DNS not resolving, Ingress 404/502, no endpoints. Diagnosed with kubectl get svc, kubectl get endpoints, kubectl exec -- nslookup, kubectl describe ingress.

Storage failures: Volume mount issues, PVC Pending, PV not available, storage full. Diagnosed with kubectl describe pod (look for VolumeMountError events), kubectl describe pvc, kubectl get pv.

Policy failures: Network policy blocking unexpected traffic, RBAC denying actions. Diagnosed with kubectl get networkpolicy, kubectl auth can-i.

Rollout failures: Bad deployment rollout, need to roll back. Diagnosed and fixed with kubectl rollout history, kubectl rollout undo.

Golden rule: kubectl describe <resource> <name> shows the Events field, which is the chronological log of what Kubernetes tried to do. If a pod is stuck, the answer is almost always in Events.`,
    whenToUse: [
      'On-call incident response — first 5 minutes of any Kubernetes issue',
      'CI/CD pipeline debugging when pods fail to start after deployment',
      'Interview preparation for Kubernetes operations and SRE roles',
      'Runbook construction for common production scenarios',
      'Onboarding new engineers to Kubernetes operational patterns',
    ],
    keyConcepts: [
      {
        term: 'CrashLoopBackOff',
        definition: 'Container starts, crashes immediately, Kubernetes restarts it with exponential backoff. Almost always means the application itself is failing (bad config, missing env var, port conflict, out of memory). Diagnose with: kubectl logs <pod> --previous to see the crash logs.',
      },
      {
        term: 'ImagePullBackOff',
        definition: 'Kubernetes cannot pull the container image. Causes: image name/tag typo, private registry without ImagePullSecret, rate limiting (Docker Hub), registry unreachable. Diagnose with: kubectl describe pod | grep -i image.',
      },
      {
        term: 'OOMKilled',
        definition: 'The Linux OOM killer terminated the container because it exceeded its memory limit. Kubernetes exit code 137. Diagnose with kubectl describe pod | grep -i oom. Fix: increase memory limit in the container spec or fix a memory leak.',
      },
      {
        term: 'kubectl logs --previous',
        definition: 'Shows logs from the previous (crashed) container instance. Essential for CrashLoopBackOff because the current container may have crashed before writing any logs. Add -c <container-name> for multi-container pods.',
      },
      {
        term: 'kubectl rollout undo',
        definition: 'Rolls back a Deployment to the previous revision. kubectl rollout undo deployment <name>. Add --to-revision=<n> for a specific version. Check history first: kubectl rollout history deployment <name>.',
      },
      {
        term: 'kubectl get all -A',
        definition: 'Shows all core resources (pods, services, deployments, replicasets, statefulsets) across all namespaces. Good first command during an incident to get a broad picture. Add -o wide for node/IP columns.',
      },
    ],
    approach: [
      'Step 1: kubectl get pods -A — get the broad picture; identify which pods are not Running/Ready',
      'Step 2: kubectl describe pod <name> -n <ns> — read the Events section; this tells you what is wrong',
      'Step 3: kubectl logs <name> -n <ns> (add --previous for crashed containers) — read the application output',
      'Step 4: kubectl get endpoints <service> — if Service has 0 endpoints, labels are mismatched or pods are not Ready',
      'Step 5: kubectl exec -it <pod> -- sh then curl/nslookup for network diagnostics from inside the cluster',
      'Step 6: kubectl top pods/nodes for resource pressure, kubectl get events for cluster-level issues',
    ],
    pitfalls: [
      'Looking at kubectl get pods and seeing "Running" but ignoring READY column — 0/1 Running means container runs but fails readiness probe',
      'Checking current logs for a CrashLoopBackOff pod — the container crashed; use --previous',
      'Forgetting -n <namespace> — default namespace commands miss issues in other namespaces',
      'Assuming DNS is working — always test with kubectl exec -- nslookup before assuming connectivity is the issue',
      'Skipping kubectl describe and going straight to logs — Events often reveal the root cause faster',
    ],
    keyQuestions: [
      {
        question: 'Walk through your troubleshooting approach for a CrashLoopBackOff pod.',
        answer: `CrashLoopBackOff means the container keeps starting and crashing. Kubernetes is backing off restarts exponentially (10s, 20s, 40s, 80s, 160s, capped at 5 minutes).

Step 1: kubectl describe pod <name> -n <namespace>
Look at the Events section. You will often see the OOM kill message, a non-zero exit code, or a failed readiness probe. Look at the State field under Containers — it shows Last State with the exit code and reason.

Step 2: kubectl logs <name> -n <namespace> --previous
The --previous flag is critical — it shows logs from the crashed (previous) container instance. The current container may not have logged anything before crashing.

Common exit codes:
- Exit 1: application error (check application logs)
- Exit 137: OOM killed (kubectl describe pod | grep -i oom, increase memory limit)
- Exit 139: segfault (container binary issue)
- Exit 1 with "no such file or directory": image issue or entrypoint path wrong

Step 3: Check env vars and mounts. Missing required env var or misconfigured ConfigMap/Secret is a top cause.

Step 4: kubectl exec -it <pod> -- sh (if the container stays up long enough) to inspect the filesystem and environment.`,
      },
      {
        question: 'A Service has correct labels but users get connection refused. How do you debug?',
        answer: `Connection refused means the request is reaching the pod network but nothing is listening on that port — or the service isn\'t routing to a pod at all.

Step 1: kubectl get endpoints <service> -n <namespace>
If Endpoints shows "<none>", the Service has no backends. Either no Pods are Ready, or label mismatch.

Step 2: kubectl get pods -l <service-selector> -n <namespace>
Check if pods exist and are Ready. If 0/1 or not Running, fix the pod first.

Step 3: kubectl describe pod — check readiness probe. A pod can be Running but fail readiness, which removes it from Endpoints.

Step 4: If Endpoints shows pod IPs, test from inside the cluster:
kubectl exec -it <any-pod> -- curl http://<service>:<port>
Then test directly to pod IP:
kubectl exec -it <any-pod> -- curl http://<pod-ip>:<container-port>
This tells you if the issue is Service routing or the app itself.

Step 5: Check Service spec.ports. The service port and targetPort must match what the container is listening on.

Step 6: Check NetworkPolicy. kubectl get networkpolicy -n <namespace>. A policy may be blocking ingress to the pod.`,
      },
    ],
    quickFire: [
      { q: 'What causes CrashLoopBackOff and how do you diagnose it?', a: 'The container starts, crashes, and Kubernetes retries with exponential back-off. Check logs with kubectl logs --previous and kubectl describe pod for the exit code.' },
      { q: 'What does exit code 137 mean in a crashed container?', a: 'OOMKilled -- the container exceeded its memory limit and was killed by the Linux OOM killer. Increase the memory limit or fix the memory leak.' },
      { q: 'What causes a Pod to stay in Pending state?', a: 'Common causes: insufficient CPU/memory on any node, taint/toleration mismatch, PVC not bound, or no nodes matching a nodeSelector/affinity rule.' },
      { q: 'What is ImagePullBackOff and how do you fix it?', a: 'Kubernetes cannot pull the container image. Check the image name/tag for typos, verify registry credentials exist as an imagePullSecret, and confirm network access to the registry.' },
      { q: 'How do you check why a specific container exited?', a: 'kubectl logs <pod> --previous shows the last run\'s stdout/stderr. kubectl describe pod shows the Last State exit code and reason.' },
      { q: 'What does kubectl describe pod tell you that kubectl get pod does not?', a: 'Events (scheduling failures, image pull errors, OOM kills), container resource limits/requests, volume mounts, conditions (PodScheduled, Ready), and probe results.' },
      { q: 'How do you debug a Pod that exits immediately on start?', a: 'Override the entrypoint: kubectl run debug --image=<img> --command -- sleep 3600, then exec in. Or add command: ["sleep", "3600"] in the spec temporarily.' },
      { q: 'What does the Terminating state mean and when does a Pod get stuck there?', a: 'Pod is being deleted. Gets stuck when a finalizer is not removed or the node is unreachable. Force-delete with kubectl delete pod --grace-period=0 --force.' },
      { q: 'What is a liveness probe vs a readiness probe?', a: 'Liveness: if it fails, Kubernetes restarts the container. Readiness: if it fails, the Pod is removed from Service endpoints but not restarted.' },
      { q: 'How do you check node resource pressure causing Pending Pods?', a: 'kubectl describe node shows Conditions (MemoryPressure, DiskPressure, PIDPressure) and Allocated/Capacity for CPU and memory.' },
    ],
    references: [
      'https://kubernetes.io/docs/tasks/debug/debug-application/',
      'https://kubernetes.io/docs/tasks/debug/debug-pod/',
      'https://kubernetes.io/docs/reference/kubectl/cheatsheet/',
      'https://learnk8s.io/troubleshooting-deployments',
    ],
  },

  {
    id: 'ansible-roles-vs-collections',
    title: 'Ansible Roles vs Collections',
    icon: 'settings',
    color: '#8b5cf6',
    questions: 4,
    description: 'Roles organize tasks within a project into reusable units (tasks/handlers/templates/vars/defaults/files). Collections are distributable packages containing roles + modules + plugins + playbooks + documentation. Role = small reusable component inside a project. Collection = complete automation package shared across projects and teams.',
    visualizations: [
      {
        title: 'Role vs Collection — structure and scope',
        description: 'Role directory: roles/webserver/tasks/ handlers/ templates/ files/ vars/ defaults/. Collection directory: ansible_collections/company/infra/roles/ plugins/ modules/ playbooks/ docs/. Hierarchy: Collection contains Roles which contain Tasks.',
        image: '/diagrams/linkdiags/ansible-roles-collections.png',
      },
    ],
    introduction: `## Overview
Ansible provides two levels of reuse: Roles (within a project) and Collections (across projects and teams).

A Role is a standard way to organize a set of related Ansible tasks, handlers, templates, files, variables, and defaults into a named directory structure. Roles make playbooks cleaner by moving complexity into reusable, testable units. A role like "webserver" encapsulates everything needed to install, configure, and manage Nginx — the playbook simply says "apply role webserver to these hosts."

Role directory structure:
roles/webserver/
  tasks/main.yml — the task list
  handlers/main.yml — handlers triggered by notify
  templates/ — Jinja2 templates (.j2 files)
  files/ — static files copied to managed hosts
  vars/main.yml — variables (high precedence)
  defaults/main.yml — default values (lowest precedence, easily overridden)
  meta/main.yml — role metadata, dependencies

A Collection is a distributable package that bundles roles, modules, plugins, playbooks, and documentation together. Collections are the modern Ansible standard for sharing automation across organizations. Published on Ansible Galaxy or Automation Hub, they are versioned, can declare dependencies, and can contain custom Python modules and filter plugins that roles cannot.

Collection directory structure:
ansible_collections/company/infra/
  roles/ — bundled roles
  plugins/modules/ — custom Python modules
  plugins/filter/ — custom Jinja2 filters
  playbooks/ — bundled playbooks
  docs/ — documentation

The hierarchy: Collections contain Roles which contain Tasks.

Real-world example: A "webserver" Role installs and configures Nginx. An "infra" Collection contains: the Nginx role, custom AWS modules, monitoring playbooks, and deployment documentation — everything a team needs to manage infrastructure, packaged as a single installable unit.

When to use each: Roles — when organizing automation within a single project. Collections — when sharing automation across multiple projects, teams, or the community. Modern Ansible heavily emphasizes Collections; all official Ansible content ships as Collections.`,
    whenToUse: [
      'Structuring a new Ansible project — always use Roles to keep playbooks clean',
      'Building reusable automation for multiple teams — package as a Collection',
      'Installing community automation from Galaxy (ansible-galaxy collection install community.general)',
      'Building custom Python modules that multiple projects need — ship in a Collection',
      'Versioning and releasing automation as an artifact — Collections support semantic versioning',
    ],
    keyConcepts: [
      {
        term: 'Role',
        definition: 'A named directory structure (tasks/handlers/templates/vars/defaults/files) that encapsulates a piece of automation. Used within a playbook via the roles: keyword. Copied manually or installed via ansible-galaxy role install.',
      },
      {
        term: 'Collection',
        definition: 'A distributable package installed via ansible-galaxy collection install <namespace.name>. Can contain roles, modules, plugins, playbooks, and docs. Versioned with semantic versioning. The standard for sharing Ansible content in Ansible 2.10+.',
      },
      {
        term: 'ansible-galaxy',
        definition: 'CLI tool for installing roles and collections. ansible-galaxy role install <name>, ansible-galaxy collection install <namespace.name>. requirements.yml can list all dependencies for a project.',
      },
      {
        term: 'tasks/main.yml',
        definition: 'Entry point for a Role\'s task list. Ansible automatically looks for this file when the role is applied. Can include other task files with include_tasks or import_tasks.',
      },
      {
        term: 'defaults vs vars',
        definition: 'defaults/main.yml has the lowest variable precedence — easily overridden by the playbook or inventory. vars/main.yml has higher precedence. Use defaults for values users should be able to override; use vars for values the role needs to enforce.',
      },
      {
        term: 'FQCN (Fully Qualified Collection Name)',
        definition: 'The format namespace.collection.module for referencing modules in Collections (e.g., amazon.aws.ec2_instance). Required when multiple collections have modules with the same short name. Recommended practice in all modern playbooks.',
      },
    ],
    approach: [
      'Create roles with ansible-galaxy role init <name> to get the standard directory scaffold',
      'Keep each role focused on one concern: one role for Nginx, one for MySQL, one for users',
      'Use defaults/main.yml for all configurable values with sensible defaults',
      'Test roles independently with Molecule before including in playbooks',
      'Package related roles + custom modules for a technology area into a Collection',
      'Declare all collection dependencies in requirements.yml and install with ansible-galaxy collection install -r requirements.yml',
    ],
    pitfalls: [
      'Putting all tasks in a single playbook instead of roles — playbooks become unreadable at scale',
      'Using vars/main.yml for values users should override — use defaults/main.yml for those',
      'Not pinning collection versions in requirements.yml — upstream changes break your automation unexpectedly',
      'Referencing modules by short name instead of FQCN — causes conflicts when multiple collections define the same module name',
      'Writing custom modules as standalone scripts instead of Collection plugins — they become impossible to distribute',
    ],
    keyQuestions: [
      {
        question: 'What is the difference between an Ansible Role and a Collection?',
        answer: `A Role is an organizational unit within a single Ansible project. It groups tasks, handlers, templates, files, and variables into a standard directory structure (tasks/ handlers/ templates/ files/ vars/ defaults/). You use a role in a playbook with: roles: - webserver. Roles can be shared via Galaxy but are just directory structures — they cannot contain Python modules or filter plugins.

A Collection is a distributable package that can contain roles, Python modules, filter plugins, playbooks, and documentation. Collections are installed with ansible-galaxy collection install <namespace.name> and versioned with semantic versioning. They are the modern standard for sharing Ansible automation across teams and with the community. All official Red Hat and community content ships as Collections (community.general, amazon.aws, kubernetes.core, etc.).

Hierarchy: Collection > Role > Task.

Analogy: a Role is like a Python module. A Collection is like a Python package (pip install) that can contain multiple modules and their dependencies.`,
      },
      {
        question: 'How do you structure an Ansible project for a multi-tier application?',
        answer: `Standard project structure:

ansible-project/
  inventory/
    production      — production host groups
    staging         — staging host groups
  group_vars/
    all.yml         — variables for all hosts
    webservers.yml  — variables for webserver group
    databases.yml   — variables for database group
  host_vars/
    web01.yml       — host-specific vars for web01
  roles/
    common/         — base OS setup, users, packages
    webserver/      — Nginx install, config, service
    database/       — MySQL/PostgreSQL install, config
    app/            — application deployment
  playbooks/
    site.yml        — master playbook: import all roles for all tiers
    web.yml         — playbook for webserver tier only
    db.yml          — playbook for database tier only
  templates/        — shared Jinja2 templates
  files/            — shared static files
  ansible.cfg       — project config (inventory path, remote_user, etc.)
  requirements.yml  — collections and roles to install

Run the full stack: ansible-playbook playbooks/site.yml -i inventory/production
Run just the web tier: ansible-playbook playbooks/web.yml -i inventory/production`,
      },
    ],
    quickFire: [
      { q: 'What is the standard directory structure of an Ansible Role?', a: 'tasks/, handlers/, templates/, files/, vars/, defaults/, meta/, and tests/. Only tasks/main.yml is required; the rest are optional.' },
      { q: 'What is the difference between vars/ and defaults/ in a Role?', a: 'defaults/ has the lowest variable precedence -- easily overridden by inventory or playbook vars. vars/ has higher precedence and is harder to override.' },
      { q: 'What is an Ansible Collection?', a: 'A distribution format packaging roles, modules, plugins, and playbooks together under a namespace.name format (e.g., community.general). Installed via ansible-galaxy collection install.' },
      { q: 'When should you use a Role vs a Collection?', a: 'Role: single reusable unit of configuration (install nginx). Collection: bundle multiple roles, custom modules, and plugins for distribution across teams or via Galaxy.' },
      { q: 'How do you install a Role from Ansible Galaxy?', a: 'ansible-galaxy role install geerlingguy.nginx, or declare it in requirements.yml and run ansible-galaxy install -r requirements.yml.' },
      { q: 'What is meta/main.yml used for in a Role?', a: 'Declares role metadata: author, license, supported platforms, and role dependencies (other roles that must run first).' },
      { q: 'How do you test an Ansible Role in isolation?', a: 'With Molecule -- it spins up a container or VM, applies the role, runs assertions (via testinfra or ansible assertions), then destroys the environment.' },
      { q: 'What is the purpose of handlers/ in a Role?', a: 'Handlers run only when notified by a task (e.g., restart nginx after config change). They run once at the end of the play regardless of how many tasks notify them.' },
      { q: 'How do you pin a specific version of a Collection in requirements.yml?', a: 'Use the version key: - name: community.general version: ">=6.0.0,<7.0.0". This prevents breaking changes from upstream updates.' },
    ],
    references: [
      'https://docs.ansible.com/ansible/latest/user_guide/playbooks_reuse_roles.html',
      'https://docs.ansible.com/ansible/latest/dev_guide/developing_collections.html',
      'https://galaxy.ansible.com/',
      'https://ansible.readthedocs.io/projects/molecule/',
    ],
  },

  {
    id: 'ansible-project-structure',
    title: 'Ansible Project Structure',
    icon: 'settings',
    color: '#8b5cf6',
    questions: 3,
    description: 'Standard Ansible project layout with 21 explained components: inventory (production/staging), group_vars (all.yml/webservers.yml), host_vars (server1.yml), roles (common/webserver/database), playbooks (site.yml/web.yml/db.yml), templates (Jinja2), files (static assets), ansible.cfg, requirements.yml.',
    visualizations: [
      {
        title: 'Ansible project directory tree — all 21 components explained',
        description: 'ansible-project/ root with inventory/production + staging, group_vars/all.yml + webservers.yml, host_vars/server1.yml, roles/common + webserver + database, playbooks/site.yml + web.yml + db.yml, templates/ (Jinja2), files/ (static), ansible.cfg (config), requirements.yml (dependencies).',
        image: '/diagrams/linkdiags/ansible-architecture.png',
      },
    ],
    introduction: `## Overview
A well-structured Ansible project is self-documenting, easy to test, and scales to hundreds of hosts without becoming unmanageable. The standard layout separates concerns: inventory (where), variables (what values), roles (how), and playbooks (when and for whom).

The 21 components and their roles:

ansible-project/ — the project root. Usually a Git repository.

inventory/ — defines target hosts and groups them logically.
  production — the production hosts file (INI or YAML format). Lists hostnames/IPs and group memberships.
  staging — staging/test hosts. Same structure, different IPs.

group_vars/ — variables that apply to a host group, shared automatically.
  all.yml — applies to every host in every group. Good for: ansible_user, common package lists, org-wide settings.
  webservers.yml — applies only to hosts in the [webservers] group. Good for: http_port, nginx_version, ssl settings.

host_vars/ — variables specific to a single host.
  server1.yml — overrides for server1 only. Good for: unique IP, custom listen port, host-specific cert paths.

roles/ — the core automation. Each role is a self-contained unit.
  common/ — baseline setup run on every host: OS updates, users, SSH hardening, monitoring agents.
  webserver/ — Nginx/Apache install, configuration templates, service management.
  database/ — MySQL/PostgreSQL install, DB/user creation, backup config.

playbooks/ — orchestration layer that ties roles to hosts.
  site.yml — master playbook. Imports web.yml and db.yml. Running this applies the full stack.
  web.yml — runs webserver and common roles against the [webservers] group.
  db.yml — runs database and common roles against the [databases] group.

templates/ — Jinja2 templates (.j2 extension). Processed by Ansible to inject variable values before copying to managed hosts. Example: nginx.conf.j2 with {{ server_name }} and {{ http_port }}.

files/ — static files copied to managed hosts unchanged. No templating. Example: CA certificates, pre-built binaries.

ansible.cfg — project-level configuration that overrides /etc/ansible/ansible.cfg. Typically sets: inventory path, remote_user, private_key_file, roles_path, host_key_checking=False.

requirements.yml — lists external roles and collections. ansible-galaxy install -r requirements.yml installs everything. Pin versions here to prevent unexpected upgrades.`,
    whenToUse: [
      'Starting any new Ansible project — use this structure from day one',
      'Onboarding team members — the standard layout is self-explanatory',
      'Scaling a monolithic playbook that has outgrown a single file',
      'Setting up CI/CD for infrastructure automation (test staging, then production)',
      'Preparing for Red Hat RHCE/EX294 exam — this structure is the exam standard',
    ],
    keyConcepts: [
      {
        term: 'Variable precedence',
        definition: 'Ansible merges variables from many sources. Precedence order (lowest to highest): role defaults → inventory group_vars/all → inventory group_vars/<group> → inventory host_vars → playbook group_vars → playbook host_vars → task vars → extra vars (-e). Host vars override group vars; -e overrides everything.',
      },
      {
        term: 'ansible.cfg',
        definition: 'Project-level configuration file. Ansible searches: ANSIBLE_CONFIG env var → ./ansible.cfg → ~/.ansible.cfg → /etc/ansible/ansible.cfg. Having ansible.cfg in the project root ties configuration to the project, avoiding surprises from system-wide settings.',
      },
      {
        term: 'Jinja2 templates',
        definition: 'Ansible uses the Jinja2 templating engine. Variables are referenced with {{ variable_name }}. Conditionals: {% if condition %} ... {% endif %}. Loops: {% for item in list %} ... {% endfor %}. Templates in templates/ are rendered and deployed with the template module.',
      },
      {
        term: 'Dynamic inventory',
        definition: 'Instead of static host files, inventory can be a Python script or plugin that queries a source of truth (AWS EC2, GCP, VMware, Netbox). Returns JSON with host groups and variables. Essential for cloud environments where hosts change dynamically.',
      },
      {
        term: 'requirements.yml',
        definition: 'Declares external dependencies. Can list both collections and roles:\n---\ncollections:\n  - name: amazon.aws\n    version: ">=5.0.0"\n  - name: community.general\nroles:\n  - name: geerlingguy.nginx\n    version: "3.2.0"',
      },
    ],
    approach: [
      'Create the full directory structure before writing any tasks — use ansible-galaxy role init for each role',
      'Put all configurable values in defaults/main.yml with documented default values',
      'Write site.yml as the master playbook that imports all tier-specific playbooks',
      'Test with --check (dry run) and --diff flags before applying to production',
      'Use separate inventory files for production and staging; never mix them',
      'Store vault-encrypted secrets in group_vars or host_vars alongside regular vars',
    ],
    pitfalls: [
      'All tasks in a single playbook.yml — becomes a 3000-line file that nobody wants to touch',
      'Hardcoding hostnames and IPs in playbooks — they belong in inventory',
      'Using the same inventory for production and staging — a typo runs tasks on wrong hosts',
      'Missing ansible.cfg — Ansible falls back to system config, causing unexpected behavior on developer machines',
      'Not using requirements.yml — team members install different role/collection versions and get different behavior',
    ],
    keyQuestions: [
      {
        question: 'Explain Ansible variable precedence and where you would define each type of variable.',
        answer: `Ansible has 22 levels of variable precedence. The practical ones, from lowest to highest:

1. Role defaults (roles/<role>/defaults/main.yml) — lowest priority. Override-friendly defaults.
2. Inventory group_vars/all.yml — applies to every host. Good for: common settings.
3. Inventory group_vars/<group>.yml — applies to a host group. Good for: group-specific settings.
4. Inventory host_vars/<host>.yml — host-specific. Good for: unique overrides.
5. Playbook vars — declared in the playbook. Higher than inventory.
6. Task vars (vars: in a task) — applies to that task only.
7. Extra vars (ansible-playbook -e "key=value") — highest priority. Overrides everything.

Practical rules:
- Role defaults: anything the role user should be able to override (ports, package versions).
- group_vars/all.yml: org-wide settings (ansible_user, ssh key path, common packages).
- group_vars/webservers.yml: web tier settings (http_port=80, https_port=443).
- host_vars/server1.yml: server-specific overrides (custom listen address, unique cert).
- Extra vars (-e): emergency overrides in CI/CD or one-time commands.

Never put secrets in plain-text vars files — use Ansible Vault to encrypt them.`,
      },
    ],
    quickFire: [
      { q: 'What is the purpose of group_vars/ in an Ansible project?', a: 'Stores variable files named after inventory groups. group_vars/webservers.yml applies to all hosts in the [webservers] group automatically.' },
      { q: 'What is host_vars/ used for?', a: 'Stores per-host variable files named after the host. host_vars/web01.yml applies only to the host named web01, overriding group_vars for that host.' },
      { q: 'What is the Ansible variable precedence order (high to low)?', a: 'Extra vars (-e) > task vars > block vars > role vars > set_fact > host_vars > group_vars > role defaults. Extra vars always win.' },
      { q: 'What is an Ansible inventory and what formats does it support?', a: 'The inventory defines which hosts to manage and their groups. Supports INI, YAML, and dynamic inventory scripts/plugins (AWS EC2, GCP, Azure).' },
      { q: 'What is the site.yml playbook convention?', a: 'site.yml is the top-level playbook that imports all other playbooks (webservers.yml, dbservers.yml). It orchestrates the entire infrastructure in one run.' },
      { q: 'How do handlers differ from regular tasks in execution order?', a: 'Handlers run once at the end of a play, not inline. Multiple tasks can notify the same handler but it only runs once -- prevents duplicate service restarts.' },
      { q: 'What is ansible-vault and when should you use it?', a: 'ansible-vault encrypts sensitive files or variables (passwords, API keys). Use it for any secret stored in the repo; decrypt at runtime with --vault-password-file or --ask-vault-pass.' },
      { q: 'How does Ansible determine the order of hosts within a group?', a: 'Alphabetical by default within an INI inventory. Use serial or order: shuffle/reverse_sorted at the play level to control execution order.' },
      { q: 'What is the difference between import_tasks and include_tasks?', a: 'import_tasks is static (parsed at playbook load, supports tags on all tasks). include_tasks is dynamic (evaluated at runtime, supports conditional includes with when).' },
    ],
    references: [
      'https://docs.ansible.com/ansible/latest/tips_tricks/ansible_tips_tricks.html',
      'https://docs.ansible.com/ansible/latest/reference_appendices/config.html',
      'https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_variables.html',
      'https://www.redhat.com/en/blog/ansible-best-practices-essentials',
    ],
  },

  {
    id: 'terraform-cicd-pipeline',
    title: 'Terraform in CI/CD Pipelines',
    icon: 'codepen',
    color: '#f59e0b',
    questions: 4,
    description: 'Production-level Terraform CI/CD: Code Commit → Validate → Format Check → Terraform Init → Plan → Policy Check (Sentinel/OPA) → Manual Approval → Apply. Remote state in S3 + DynamoDB lock. GitHub Actions flow, folder structure, and best practices for safe infrastructure automation.',
    visualizations: [
      {
        title: 'Nine-step Terraform CI/CD pipeline',
        description: 'Code Commit → Validate (syntax) → Format Check (terraform fmt) → Terraform Init → Terraform Plan (generate execution plan) → Policy/Security Check (Sentinel/OPA/Checkov) → Manual Approval gate → Terraform Apply → Production Cloud infrastructure.',
        image: '/diagrams/linkdiags/terraform-cicd.png',
      },
    ],
    introduction: `## Overview
Running Terraform manually is fine for experiments. Running it in production without a CI/CD pipeline is dangerous: no peer review, no audit trail, no policy enforcement, and no protection against two people applying simultaneously.

Why CI/CD for Terraform: Consistent (same pipeline runs every time), Collaborative (changes reviewed via PR), Auditable (full history in CI logs), Safe (policy gates and manual approval before Apply).

Nine-step pipeline:

1. Code Commit: engineer raises a PR with .tf changes.
2. Validate: terraform validate checks syntax and references.
3. Format Check: terraform fmt -check fails if code is not formatted. Enforces a single style.
4. Terraform Init: downloads providers and configures the backend (S3 remote state).
5. Terraform Plan: generates the execution plan showing exactly what will be created/modified/destroyed. Plan output is uploaded as a CI artifact for reviewers.
6. Policy/Security Check: Sentinel (enterprise), OPA (open-source), or Checkov scans the plan for policy violations (no public S3 buckets, instance type allowlist, tagging requirements).
7. Manual Approval: a human reviews the plan and policy check results before Apply runs. Critical gate for production.
8. Terraform Apply: applies the approved plan. Uses the exact plan artifact from step 5 to avoid drift between plan and apply.
9. Production Cloud: resources are created/modified as planned.

Remote state management: terraform.tfstate stored in S3. DynamoDB table provides state locking — only one operation can modify state at a time. S3 versioning allows state recovery.

GitHub Actions implementation: Two workflows — pr.yml (runs Validate through Plan, posts plan as PR comment) and apply.yml (triggered by merge to main after approval, runs Apply with the saved plan).

Folder structure for production: modules/ (reusable components — vpc, ec2, alb), envs/dev and envs/prod (environment-specific configurations calling modules), backend.tf (S3 backend config), provider.tf, variables.tf, outputs.tf, main.tf.`,
    whenToUse: [
      'Any team running Terraform in production — manual apply is not acceptable at scale',
      'Meeting compliance requirements for infrastructure changes (SOC2, PCI-DSS require change control)',
      'Multi-engineer teams where two people could accidentally apply conflicting changes',
      'Organizations that need an audit trail of every infrastructure change',
      'Implementing GitOps for infrastructure — Terraform state follows Git as the source of truth',
    ],
    keyConcepts: [
      {
        term: 'terraform plan artifact',
        definition: 'The binary plan file generated by terraform plan -out=tfplan. Using this artifact in the Apply step guarantees exactly what was reviewed gets applied — no drift between plan and apply due to code changes or timing.',
      },
      {
        term: 'DynamoDB state locking',
        definition: 'Terraform writes a lock entry to a DynamoDB table when it starts plan or apply. If another operation tries to run simultaneously, it sees the lock and fails with an error. Prevents race conditions in CI/CD and concurrent manual runs.',
      },
      {
        term: 'Sentinel / OPA policy as code',
        definition: 'Policy engines that evaluate the Terraform plan against rules. Example rules: EC2 instances must be in the allowed_instance_types list, S3 buckets must have encryption enabled, all resources must have required tags. Violations fail the pipeline before Apply.',
      },
      {
        term: 'Manual approval gate',
        definition: 'A required human review step in the pipeline between Plan and Apply. In GitHub Actions: environment protection rules with required reviewers. In GitLab CI: manual job trigger. Ensures a human eyes the plan before infrastructure is modified.',
      },
      {
        term: 'Workspace vs environment folders',
        definition: 'Terraform Workspaces allow multiple state files per configuration (dev/staging/prod). Environment folders (envs/dev/, envs/prod/) are separate directories with separate backend configs — more explicit and easier to review. Both approaches are valid; environment folders are preferred for large teams.',
      },
      {
        term: 'Checkov',
        definition: 'Open-source static analysis tool for Terraform and other IaC. Scans .tf files for security misconfigurations before plan (faster than Sentinel/OPA which operate on the plan). Run as a CI step: checkov -d . — fails on high/critical findings.',
      },
    ],
    approach: [
      'Store state in S3 + DynamoDB backend — never use local state for any environment beyond a personal experiment',
      'Run terraform fmt, validate, and a security scanner on every PR before plan',
      'Post the plan output as a PR comment so reviewers can inspect changes without running Terraform locally',
      'Use environment protection rules in GitHub Actions / GitLab environments for manual approval',
      'Apply using the saved plan artifact — prevents apply from picking up code changes between plan and apply',
      'Separate modules (reusable) from environment configs (specific) — modules live in modules/, environments in envs/',
    ],
    pitfalls: [
      'terraform apply --auto-approve in production — skips human review; one misconfiguration destroys infrastructure',
      'Local state in CI/CD — state file lost when the runner is recycled; next run sees no existing state and tries to create everything again',
      'Not pinning provider versions — provider upgrade breaks resources mid-sprint',
      'Plan and Apply running from different code versions — a force push between plan and apply causes unexpected changes',
      'Missing DynamoDB lock — concurrent applies corrupt the state file, requiring manual recovery',
    ],
    keyQuestions: [
      {
        question: 'How do you safely run Terraform in a CI/CD pipeline?',
        answer: `Safe Terraform CI/CD has four requirements: remote state, locking, plan review, and policy enforcement.

Remote state: backend in S3 (or Terraform Cloud). Never local state. S3 config: bucket (versioned, encrypted), key (env/resource/terraform.tfstate), region, dynamodb_table.

State locking: DynamoDB table with LockID as the hash key. Terraform init creates the table if it doesn\'t exist. Concurrent plan/apply attempts fail with "Error acquiring the state lock."

Pipeline structure:
PR phase: fmt check → validate → security scan (Checkov) → init → plan → upload plan artifact → post plan to PR comment.
Merge phase: require PR approval → init → apply with saved plan artifact (never re-plan).

Policy enforcement: Checkov or OPA/Conftest on PR; Sentinel on apply in Terraform Enterprise.

Manual approval: GitHub Actions environment protection rules. Set required reviewers on the production environment. The apply job only runs after approval.

Never: terraform apply --auto-approve in production. Always use -target sparingly (it hides the full blast radius).`,
      },
      {
        question: 'Describe Terraform remote state with S3 and DynamoDB.',
        answer: `Remote state is the production-grade alternative to terraform.tfstate on disk.

S3 role: stores the terraform.tfstate file centrally. Configuration:
terraform {
  backend "s3" {
    bucket         = "my-org-terraform-state"
    key            = "prod/vpc/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}

DynamoDB role: provides distributed locking. Table name: terraform-state-lock. Hash key: LockID (String). When Terraform starts plan or apply, it writes a lock record to DynamoDB. Any concurrent operation sees the record and fails with a descriptive error including who holds the lock and when it was acquired. Lock is released when the operation completes.

State versioning: enable S3 versioning on the state bucket. If a bad apply corrupts state, you can recover the previous version.

State security: state contains sensitive values (DB passwords, private IPs). Enable S3 server-side encryption (KMS). Apply strict IAM policies — only CI/CD roles and senior engineers need s3:GetObject and s3:PutObject.

Multi-env pattern: use different S3 keys per environment (dev/vpc/terraform.tfstate vs prod/vpc/terraform.tfstate). Separate buckets per environment is even more secure.`,
      },
    ],
    quickFire: [
      { q: 'Why must you never run terraform apply directly in CI without a plan step?', a: 'Without a plan step, you cannot review or gate what changes will be applied. Always run plan first, store the plan file, then apply that exact file.' },
      { q: 'How do you prevent concurrent terraform apply runs corrupting state?', a: 'State locking -- S3 backend uses a DynamoDB table to acquire a lock before any write. A second apply blocks until the lock is released.' },
      { q: 'What is a PR preview plan in a Terraform CI workflow?', a: 'Running terraform plan on a PR branch and posting the output as a PR comment so reviewers can see infrastructure changes before merge.' },
      { q: 'How do you pass a saved plan file from plan to apply in CI?', a: 'terraform plan -out=tfplan saves the binary plan. terraform apply tfplan applies exactly that plan with no re-evaluation -- prevents drift between steps.' },
      { q: 'What is Checkov and what does it check?', a: 'A static analysis tool for IaC. It scans Terraform files for security misconfigurations (e.g., open S3 buckets, unencrypted disks) before apply.' },
      { q: 'How do you handle Terraform secrets in CI pipelines?', a: 'Inject via environment variables (TF_VAR_name) from the CI secret store (GitHub Actions secrets, Vault, AWS SSM). Never hardcode secrets in .tf files.' },
      { q: 'What is the ATLANTIS workflow?', a: 'A Terraform pull request automation tool. It runs plan on PR open, posts results as a comment, and runs apply when a reviewer comments "atlantis apply".' },
      { q: 'How do Terraform workspaces help in a CI/CD pipeline?', a: 'Workspaces provide separate state files within one backend config -- useful for per-environment (dev/staging/prod) isolation without duplicating backend config.' },
      { q: 'What does terraform init -backend-config do in CI?', a: 'Injects backend configuration at runtime without storing credentials in code. Used to pass bucket/region/key values from CI environment variables.' },
    ],
    references: [
      'https://developer.hashicorp.com/terraform/language/settings/backends/s3',
      'https://developer.hashicorp.com/terraform/tutorials/automation/automate-terraform',
      'https://www.checkov.io/',
      'https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement',
    ],
  },

  {
    id: 'terraform-count-vs-for-each',
    title: 'Terraform count vs for_each',
    icon: 'codepen',
    color: '#f59e0b',
    questions: 3,
    description: 'count creates indexed copies (aws_instance.web[0], [1], [2]). for_each creates named resources by key (aws_instance.web["dev"], ["prod"]). Production rule: use count for identical copies, for_each for named/environment resources because changing list ORDER with count destroys and recreates resources — for_each uses stable keys, safer for production.',
    visualizations: [
      {
        title: 'count (index-based) vs for_each (key-based) resource creation',
        description: 'count=3 creates aws_instance.web[0][1][2] using count.index. for_each={dev="t3.micro", prod="t3.medium"} creates aws_instance.web["dev"] and aws_instance.web["prod"] using each.key/each.value. Key danger: reordering a count list may destroy the wrong resource. for_each keys are stable — only new keys create new resources.',
        image: '/diagrams/linkdiags/terraform-count-for-each.png',
      },
    ],
    introduction: `## Overview
Both count and for_each create multiple instances of a resource or module, but they differ fundamentally in how they identify each instance — and that difference has major production safety implications.

count — number-based, creates indexed resources:
resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-12345"
  instance_type = "t3.micro"
  tags = { Name = "web-\${count.index}" }
}
Creates: aws_instance.web[0], aws_instance.web[1], aws_instance.web[2].

The critical count danger: Terraform identifies instances by index. If you use a list variable — count = length(var.environments) where var.environments = ["dev", "test", "prod"] — and someone reorders the list to ["prod", "dev", "test"], Terraform sees that index [0] should now be "prod" (was "dev"), so it plans to destroy web[0] and recreate it. In production, this means destroying a real instance just because someone changed the order of a list.

for_each — map/set-based, creates named resources:
resource "aws_instance" "web" {
  for_each      = { dev = "t3.micro", test = "t3.small", prod = "t3.medium" }
  ami           = "ami-12345"
  instance_type = each.value
  tags = { Name = each.key }
}
Creates: aws_instance.web["dev"], aws_instance.web["test"], aws_instance.web["prod"].

for_each uses the map key as the stable resource identifier. Adding a new key ("staging") creates only that new resource. Removing a key destroys only that resource. Changing the map in any other way does not affect other resources. There is no reordering danger.

Production rule: use for_each for any resource that represents a named environment, team, region, or tenant. Use count only for purely identical, anonymous resources (e.g., count = 3 worker nodes with no individual identity).

Converting count to for_each: requires moving state entries (terraform state mv) — not trivial. Get it right from the start.`,
    whenToUse: [
      'for_each: creating resources per environment (dev/staging/prod), per region, per team, per service',
      'count: creating N identical, anonymous resources with no individual identity (batch worker nodes, identical EC2 in an ASG supplement)',
      'for_each with toset(): iterating over a set of strings where you need one resource per value',
      'for_each with a map: when each resource needs different configuration (instance_type, size, name)',
    ],
    keyConcepts: [
      {
        term: 'count.index',
        definition: 'The zero-based index of the current resource instance when using count. Used to create unique names: Name = "web-\${count.index}". Danger: index depends on position in the list, not the value.',
      },
      {
        term: 'each.key / each.value',
        definition: 'Available inside a for_each resource. each.key is the map key or set element. each.value is the map value (for maps) or same as each.key (for sets). Used to configure each instance differently.',
      },
      {
        term: 'toset()',
        definition: 'Converts a list to a set for use with for_each. toset(["dev", "prod"]) creates resources named by the string values. Removes duplicates. Use when you have a list of unique strings and want stable for_each keys.',
      },
      {
        term: 'Resource address',
        definition: 'How Terraform identifies a specific resource instance. count: aws_instance.web[0]. for_each: aws_instance.web["dev"]. Matters for: terraform state mv, terraform import, and understanding plan output.',
      },
      {
        term: 'Index stability',
        definition: 'The core difference. count uses positional index — fragile with list reordering. for_each uses named key — stable regardless of what other keys are added or removed. Key stability = safer production changes.',
      },
    ],
    approach: [
      'Default to for_each in production — safer, more readable, easier to extend',
      'Use count only for genuinely identical resources with no individual identity or naming requirement',
      'When you need for_each over a list of strings: for_each = toset(var.environment_names)',
      'When migrating from count to for_each: use terraform state mv to rename state entries without destroying resources',
      'In plan output: look for "forces replacement" — this is the warning that a change will destroy and recreate',
    ],
    pitfalls: [
      'Using count with a list of strings and reordering the list — Terraform plans to destroy/recreate resources at wrong indexes',
      'Using count.index for resource names then removing one from the middle — all higher-indexed resources are renamed',
      'Using for_each with a list instead of a map/set — for_each requires a map or set, not a list (use toset())',
      'Mixing count and for_each on the same resource — not allowed; choose one meta-argument',
      'Adding a new element to a counted list in the middle — shifts all subsequent indexes, causing unnecessary replacements',
    ],
    keyQuestions: [
      {
        question: 'Why is for_each safer than count for production resources?',
        answer: `count identifies resource instances by their position (index) in the list. If you have count = length(["dev", "test", "prod"]) and reorder the list to ["prod", "dev", "test"], Terraform sees: index 0 was "dev" (has existing state), should now be "prod" (different config). It plans to destroy the existing dev instance and create a new "prod" instance at index 0. This destroys production infrastructure because someone changed list order.

for_each identifies instances by their map key. If your map is {dev="t3.micro", test="t3.small", prod="t3.large"} and you add staging="t3.medium", Terraform plans only to create the new "staging" resource. Existing dev/test/prod resources are identified by their stable keys and are not touched.

Production rule: for_each for any resource with a name/identity (environments, regions, teams). count for anonymous identical resources where order never changes (3 worker nodes that you\'d be fine replacing).

Interview one-liner: count is index-based and fragile with reordering; for_each is key-based with stable identity — safer for production infrastructure.`,
      },
    ],
    quickFire: [
      { q: 'What is the key difference between count and for_each?', a: 'count uses an integer index; for_each uses a map or set of strings as keys. for_each produces stable resource addresses when items are added or removed.' },
      { q: 'Why is for_each preferred over count for most resources?', a: 'Adding an item to the middle of a count list shifts all subsequent indexes, causing Terraform to destroy and recreate those resources. for_each keys are stable.' },
      { q: 'How do you reference the current item inside a for_each block?', a: 'Use each.key for the map key and each.value for the map value. For a set of strings each.key == each.value.' },
      { q: 'How do you convert a list to a set for use with for_each?', a: 'Use toset(var.my_list). for_each does not accept lists directly because lists allow duplicate values and have no stable key.' },
      { q: 'How does terraform taint work and what replaced it?', a: 'taint marked a resource for forced replacement on the next apply. It was deprecated in Terraform 0.15.2 and replaced by terraform apply -replace=<resource_address>.' },
      { q: 'What happens to state when you switch a resource from count to for_each?', a: 'Terraform sees the old count-indexed resources (aws_instance.web[0]) and new for_each-keyed resources (aws_instance.web["prod"]) as different -- it destroys and recreates unless you use terraform state mv.' },
      { q: 'How do you reference a resource created with for_each from another resource?', a: 'Use aws_instance.web["key"].id or use a for expression: [for k, v in aws_instance.web : v.id].' },
      { q: 'Can for_each iterate over a list of objects?', a: 'Not directly -- convert to a map first using { for obj in var.list : obj.name => obj }. The key must be unique per resource.' },
      { q: 'What does count = 0 effectively do?', a: 'It destroys the resource if it exists, without removing the block from the configuration. Useful for conditionally creating a resource based on a boolean variable.' },
    ],
    references: [
      'https://developer.hashicorp.com/terraform/language/meta-arguments/count',
      'https://developer.hashicorp.com/terraform/language/meta-arguments/for_each',
      'https://developer.hashicorp.com/terraform/language/functions/toset',
    ],
  },

  {
    id: 'terraform-remote-state',
    title: 'Terraform Remote State — S3 + DynamoDB',
    icon: 'codepen',
    color: '#f59e0b',
    questions: 4,
    description: 'Terraform state file (terraform.tfstate) records real infrastructure. Remote state in AWS S3 prevents local machine dependency and enables team collaboration. DynamoDB state locking prevents two people applying simultaneously. Single source of truth, versioning via S3, lock table with LockID/Status/Info.',
    visualizations: [
      {
        title: 'Remote state architecture — S3 + DynamoDB',
        description: 'Developer A starts plan → DynamoDB checked → lock acquired (LockID written) → terraform.tfstate read from S3 → operations run → state written back to S3 → lock released. Developer B must wait if lock is held. S3 versioning provides state recovery.',
        image: '/diagrams/linkdiags/terraform-architecture.png',
      },
    ],
    introduction: `## Overview
Terraform state is a JSON file (terraform.tfstate) that records the real infrastructure Terraform manages. It maps .tf resource definitions to actual cloud resource IDs, attributes, and dependencies. Without accurate state, Terraform cannot plan or destroy correctly.

What state tracks: resource ID (aws_instance.web → i-0abc12345), all attributes returned by the cloud API (public IP, ARN, created_at), dependencies between resources (security group must exist before EC2), and metadata (Terraform version, provider versions).

Why remote state is required for teams:

Problem 1 — Single machine dependency: if state is local, only the engineer on that machine can run Terraform. Their laptop becomes a single point of failure for all infrastructure operations.

Problem 2 — No collaboration: two engineers can\'t work on infrastructure from different machines if state only exists locally.

Problem 3 — No audit trail: local state changes are not visible to anyone else; no history.

Problem 4 — Race conditions: two engineers run terraform apply simultaneously from different machines with separate local state files. Both see the same "current state" (pre-apply), both generate plans, both apply. Result: duplicate resources, inconsistent state, corruption.

S3 backend: centralized, durable, highly available. Supports server-side encryption (KMS). S3 versioning allows rolling back to a previous state version if an apply corrupts it. IAM policies control who can read/write state.

DynamoDB locking: when Terraform starts plan or apply, it writes a record to a DynamoDB table with LockID (unique identifier), Status, Info (who is running, from where), and Created timestamp. If another operation checks and finds an existing lock, it fails immediately with the lock holder\'s details. Lock is released when the operation finishes (normal or error).

Complete workflow: terraform init (configures S3 backend, creates DynamoDB table if needed) → terraform plan (acquires DynamoDB lock, reads state from S3, generates plan, releases lock) → manual review → terraform apply (acquires lock, reads state, applies, writes new state to S3, releases lock).`,
    whenToUse: [
      'Any Terraform project with more than one engineer — remote state is mandatory',
      'CI/CD pipelines for infrastructure — runners need shared state; local state is destroyed with the runner',
      'Multiple environments (dev/staging/prod) sharing modules — separate state keys per environment',
      'Compliance requirements for infrastructure change audit trails',
      'Cross-stack references — terraform_remote_state data source reads outputs from another state file',
    ],
    keyConcepts: [
      {
        term: 'terraform.tfstate',
        definition: 'JSON file mapping Terraform resource addresses to real cloud resource IDs and attributes. The ground truth for what Terraform currently manages. Corrupted or lost state = Terraform can no longer manage existing resources.',
      },
      {
        term: 'S3 backend configuration',
        definition: `terraform { backend "s3" { bucket = "my-org-tf-state"; key = "prod/vpc/terraform.tfstate"; region = "us-east-1"; dynamodb_table = "terraform-lock"; encrypt = true } }. Set key uniquely per environment/resource group to prevent state file collisions.`,
      },
      {
        term: 'DynamoDB lock table',
        definition: 'A DynamoDB table with hash key LockID (String). Terraform creates one record per active operation. The record contains who holds the lock, when it was acquired, and what operation is running. Prevents concurrent applies that would corrupt state.',
      },
      {
        term: 'terraform_remote_state',
        definition: 'Data source that reads outputs from another Terraform state file in S3. Enables cross-stack references: the networking stack exports vpc_id; the application stack reads it. Decouples stacks while sharing values.',
      },
      {
        term: 'State encryption',
        definition: 'State files often contain sensitive values (database passwords, private keys). S3 server-side encryption (SSE-KMS) encrypts state at rest. Additionally, Terraform 1.7+ supports provider-level state encryption to encrypt sensitive values within the state file itself.',
      },
      {
        term: 'State locking danger: stale lock',
        definition: 'If a Terraform operation crashes without releasing the lock, the DynamoDB lock record remains. Subsequent operations fail with "lock held." Fix: terraform force-unlock <lock-id> — use with extreme caution after confirming no operation is running.',
      },
    ],
    approach: [
      'Create the S3 bucket and DynamoDB table before running terraform init in any new project',
      'Use a separate S3 key per environment and per resource group: envs/prod/networking/terraform.tfstate',
      'Enable S3 versioning on the state bucket — provides state history and recovery capability',
      'Apply least-privilege IAM: CI/CD role gets s3:GetObject+PutObject+ListBucket and dynamodb:GetItem+PutItem+DeleteItem; read-only roles get s3:GetObject only',
      'Never run terraform apply directly on production; always go through the CI/CD pipeline with plan review',
      'Use terraform state list and terraform state show for inspecting state without making changes',
    ],
    pitfalls: [
      'Deleting the S3 bucket or DynamoDB table manually — Terraform loses state and lock capability; cannot manage existing resources',
      'Using the same S3 key for dev and prod — both environments share state; a prod apply destroys dev resources (or vice versa)',
      'Not enabling S3 versioning — no recovery if state is corrupted by a bad apply',
      'Running terraform apply locally against production while CI/CD is also running — DynamoDB lock helps, but the first one through wins; establish a policy',
      'Storing secrets in Terraform outputs and referencing via remote_state — outputs are stored unencrypted in state; use Vault or SSM for secrets',
    ],
    keyQuestions: [
      {
        question: 'What is Terraform state and why does remote state matter?',
        answer: `Terraform state (terraform.tfstate) is a JSON file that maps every resource in your .tf code to a real cloud resource. It stores the resource ID, all attributes, dependencies, and metadata. Terraform uses it to compute the difference (plan) between desired config and real world.

Without state, Terraform cannot know that aws_instance.web in your code corresponds to EC2 instance i-0abc12345 — it would try to create a new one on every apply.

Why remote state:

1. Team collaboration: multiple engineers can run Terraform from any machine because state lives in S3, not on one laptop.

2. CI/CD safety: pipeline runners are ephemeral; local state is lost when the runner terminates. S3 state persists across pipeline runs.

3. Concurrent operation safety: DynamoDB locking prevents two applies from running simultaneously and corrupting state.

4. Audit and recovery: S3 versioning provides a full history of state changes; you can roll back to a previous state version.

5. Cross-stack references: terraform_remote_state data source lets the application stack read outputs from the networking stack without coupling the two codebases.

The combination of S3 (durable central storage) + DynamoDB (distributed locking) provides the reliability guarantees Terraform needs for production infrastructure management.`,
      },
      {
        question: 'What happens if a Terraform apply crashes mid-run and the DynamoDB lock is not released?',
        answer: `The DynamoDB lock record remains in the table indefinitely. The LockID, Status, Info (who ran it, from where), and Created timestamp are all preserved.

Subsequent terraform plan or apply operations fail immediately with an error like:
"Error: Error locking state: Error acquiring the state lock"
followed by the lock holder details.

Recovery steps:
1. Confirm the original operation is truly dead (not just slow). Check CI/CD logs, AWS console for the runner that was executing.
2. If confirmed dead: terraform force-unlock <lock-id>
   The lock ID is shown in the error message.
3. After unlocking: inspect the state carefully. A mid-run crash may have partially applied changes.
   Run terraform plan — the plan should show only the resources that were not applied yet.
4. If state is corrupted: restore the previous state version from S3 versioning.
   aws s3api list-object-versions --bucket <bucket> --key <key>
   aws s3api get-object --version-id <version> ... terraform.tfstate.backup

Prevention: use Terraform Cloud or Enterprise, which handles lock management with better visibility. Alternatively, set appropriate timeouts and retry logic in CI/CD so crashes are surfaced quickly.`,
      },
    ],
    quickFire: [
      { q: 'What two AWS resources implement the Terraform S3 backend?', a: 'An S3 bucket stores the state file. A DynamoDB table (with a LockID partition key) provides state locking to prevent concurrent writes.' },
      { q: 'What happens if two engineers run terraform apply simultaneously without locking?', a: 'Both reads stale state, apply conflicting changes, and one overwrites the other\'s state -- causing resource drift and potentially destroying infrastructure.' },
      { q: 'How does state locking work with DynamoDB?', a: 'Before any write, Terraform puts a conditional item in DynamoDB (LockID = state path). If the item already exists, the apply fails with a lock error until the first run completes.' },
      { q: 'What is terraform_remote_state and when is it used?', a: 'A data source that reads outputs from another stack\'s state file. Enables cross-stack references (e.g., networking stack exports vpc_id, app stack reads it) without coupling codebases.' },
      { q: 'What is the risk of using terraform_remote_state for cross-stack references?', a: 'It creates a tight read dependency on another stack\'s state. If that stack\'s outputs change, the consuming stack can break silently. Some teams prefer SSM Parameter Store instead.' },
      { q: 'How do Terraform workspaces provide environment isolation?', a: 'Each workspace maintains a separate state file in the backend (S3 key includes the workspace name). The same code can deploy to dev/staging/prod by switching workspaces.' },
      { q: 'How do you force-unlock a stuck state?', a: 'terraform force-unlock <lock-id>. Only do this when certain no apply is actually running -- a stale lock from a crashed process is the safe use case.' },
      { q: 'How do you move a resource in state without destroying it?', a: 'terraform state mv <old_address> <new_address>. Used after renaming a resource block or switching from count to for_each.' },
      { q: 'Why should the Terraform state S3 bucket have versioning enabled?', a: 'Versioning allows rollback to a previous state file if a bad apply corrupts state. It is a critical safety net alongside locking.' },
    ],
    references: [
      'https://developer.hashicorp.com/terraform/language/settings/backends/s3',
      'https://developer.hashicorp.com/terraform/language/state',
      'https://developer.hashicorp.com/terraform/cli/commands/state',
      'https://developer.hashicorp.com/terraform/language/state/locking',
    ],
  },

  {
    id: 'jenkins-controller-vs-agent',
    title: 'Jenkins Controller vs Agent Architecture',
    icon: 'tool',
    color: '#16a34a',
    questions: 4,
    description: 'Jenkins Controller manages the CI/CD system (job scheduling, pipeline orchestration, credentials, plugins, user access). Jenkins Agents execute the actual build work (build, test, scan, deploy) on separate machines. Controller assigns work; Agents run it. Scales by adding more agents.',
    visualizations: [
      {
        title: 'Jenkins Controller-Agent distributed architecture',
        description: 'Developer pushes code → GitHub triggers webhook → Jenkins Controller receives it → Controller schedules and assigns pipeline stages to agents → Build Agent (compile, unit test), Docker Agent (image build and push), Deploy Agent (deploy to K8s/cloud) → results returned to Controller → status posted back to GitHub.',
        image: '/diagrams/linkdiags/jenkins-architecture.png',
      },
    ],
    introduction: `## Overview
Jenkins uses a Controller-Agent (formerly Master-Slave) architecture to distribute work across machines. Understanding this split is foundational to designing scalable Jenkins deployments.

The Controller:
- Stores all Jenkins configuration, job definitions, and build history
- Schedules jobs and assigns them to available agents based on labels
- Manages credentials, plugins, and user access (RBAC)
- Hosts the Jenkins web UI and REST API
- Runs the Pipeline DSL logic (Groovy code in Jenkinsfiles)
- The Controller does NOT run build executors by default in modern Jenkins (security best practice: set executors to 0)

The Agent:
- A separate JVM process (or Docker container / Kubernetes pod) that connects to the Controller
- Runs the actual build steps: compile, test, static analysis, Docker build, deploy
- Has a workspace directory where source code is checked out
- Can have labels to represent capabilities (e.g., linux, docker, gpu, nodejs)
- Can be permanent (always-on VM) or ephemeral (Kubernetes pod, Docker container spun up per build)

Connection methods:
- JNLP (Java Network Launch Protocol): agent initiates outbound connection to Controller on port 50000. Works through firewalls.
- SSH: Controller initiates SSH connection to agent. Simpler but requires Controller network access to agent.

Scaling model: The Controller stays lean (no build work). Add agents to increase parallelism. Each agent can have multiple executors (parallel build slots). A Kubernetes plugin spins up a new pod per build — infinite horizontal scaling.

Agent types in practice:
- Build Agent: JDK + Maven/Gradle, runs compile and unit tests
- Docker Agent: Docker daemon access, builds and pushes images
- Deploy Agent: kubectl, helm, cloud CLI tools, deploys to environments

Key interview answer: "Controller manages the CI/CD system — scheduling, credentials, plugins, UI. Agents execute the actual build work. Controller assigns, Agent runs. You scale Jenkins by adding agents, not by upgrading the Controller."`,
    whenToUse: [
      'Understanding Jenkins architecture for interviews and system design',
      'Designing a new Jenkins deployment: how many agents, what labels, Controller sizing',
      'Debugging Jenkins build failures that may be agent-related (missing tool, wrong OS, no disk space)',
      'Scaling Jenkins to handle more concurrent builds',
      'Migrating from monolithic Jenkins to Kubernetes-based ephemeral agents',
    ],
    keyConcepts: [
      {
        term: 'Controller (formerly Master)',
        definition: 'The central Jenkins server. Schedules jobs, manages config and credentials, serves the UI, runs pipeline orchestration logic. Should have 0 executors in production — all build work goes to agents.',
      },
      {
        term: 'Agent (formerly Slave)',
        definition: 'A machine or container that connects to the Controller and runs build work. Has executors (parallel build slots), a workspace, and labels. Can be permanent or ephemeral.',
      },
      {
        term: 'Executor',
        definition: 'A slot on an agent that runs one build at a time. An agent with 2 executors can run 2 builds in parallel. Executors = parallelism. Total capacity = sum of executors across all agents.',
      },
      {
        term: 'Agent label',
        definition: 'A string tag on an agent (e.g., "linux", "docker", "aws"). Jenkinsfile uses agent { label "docker" } to require a specific capability. Controller only assigns the build to agents with matching labels.',
      },
      {
        term: 'Kubernetes plugin (ephemeral agents)',
        definition: 'Jenkins plugin that spins up a Kubernetes pod as an agent for each build, then destroys it. Provides: clean build environment per job, infinite scale (pods), no idle resource cost. Defined with podTemplate in Jenkinsfile.',
      },
      {
        term: 'JNLP port (50000)',
        definition: 'The TCP port the Controller listens on for agent connections. Agents initiate outbound connections to this port. Must be accessible from agent network to Controller. Configurable in Jenkins global security settings.',
      },
    ],
    approach: [
      'Set Controller executors to 0 in production — forces all builds to agents, keeps Controller stable',
      'Label agents by capability (os, docker, gpu, cloud) and use agent { label } in Jenkinsfiles',
      'Use Kubernetes plugin for ephemeral agents — clean environment per build, no snowflake agents',
      'Put tools (JDK, Maven, Node) in agent Docker images — reproducible, versionable tooling',
      'Monitor agent queue depth — long queues mean you need more agents',
      'Use shared libraries to centralize common pipeline code across teams',
    ],
    pitfalls: [
      'Running builds on the Controller (non-zero executors) — security risk and stability risk; Controller crash kills all builds',
      'Not labeling agents — all builds run on any agent, mixing build environments and causing flaky tests',
      'Permanent agents that accumulate state between builds (dirty workspaces, cached artifacts from old branches)',
      'Controller serving as a single point of failure without HA setup — no high availability = any Controller restart is downtime',
      'JNLP port 50000 blocked by firewall — agents cannot connect; builds never start, queue grows',
    ],
    keyQuestions: [
      {
        question: 'Explain Jenkins Controller-Agent architecture and why it matters for scalability.',
        answer: `The Controller is the brain: it stores all job configurations, build history, and credentials. It schedules builds, assigns them to available agents based on labels, runs the Groovy pipeline orchestration logic, and serves the web UI. In production, the Controller should have 0 executors — it never runs build commands itself.

The Agent is the worker: a separate JVM process (or container) that receives work from the Controller via JNLP (TCP 50000) or SSH, runs the build steps (compile, test, Docker build, deploy) in a workspace, and returns results to the Controller.

Why this matters for scalability: the Controller has a fixed capacity (CPU, memory, threads). If builds ran on the Controller, it would become the bottleneck. By delegating all build work to agents, you can scale horizontally — add an agent, add capacity. With the Kubernetes plugin, each build gets its own pod (ephemeral agent): infinite scale, clean environment per build, zero idle cost.

Practical: a 100-engineer org might have one Controller and 20-50 ephemeral agents in Kubernetes. The Controller handles scheduling and policy; Kubernetes handles compute.`,
      },
      {
        question: 'How do you set up Jenkins with Kubernetes for ephemeral agents?',
        answer: `Jenkins Kubernetes plugin creates a Pod per build, runs the stages in containers within that pod, and destroys the pod when done.

1. Install the Kubernetes plugin in Jenkins.
2. Configure a Kubernetes cloud in Manage Jenkins → Clouds: set the Kubernetes API URL and Jenkins URL.
3. Define agent pods in the Jenkinsfile:
pipeline {
  agent {
    kubernetes {
      yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: maven
    image: maven:3.9-jdk-17
    command: [cat]
    tty: true
  - name: docker
    image: docker:24
    command: [cat]
    tty: true
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
"""
    }
  }
  stages {
    stage("Build") { steps { container("maven") { sh "mvn package" } } }
    stage("Docker") { steps { container("docker") { sh "docker build ." } } }
  }
}

Benefits: clean environment per build, no agent maintenance, parallel builds scale with Kubernetes capacity.`,
      },
    ],
    quickFire: [
      { q: 'What is the role of the Jenkins Controller?', a: 'The Controller manages the web UI, configuration, job scheduling, and build history. It delegates actual build execution to Agents -- it should not run builds itself.' },
      { q: 'What is a Jenkins Agent and how does it connect to the Controller?', a: 'An Agent executes build steps. It connects via JNLP (Java Web Start, inbound) or SSH (outbound from Controller). Each Agent has an executor count for concurrent builds.' },
      { q: 'What is JNLP in the Jenkins context?', a: 'Java Network Launch Protocol -- the Agent initiates an outbound TCP connection to the Controller. Useful when the Agent is behind a firewall and the Controller cannot reach it directly.' },
      { q: 'What are dynamic agents and why are they preferred over static agents?', a: 'Dynamic agents are provisioned on demand (via the Kubernetes plugin, EC2 plugin, etc.) and destroyed after the build. They eliminate idle agent cost and provide clean build environments.' },
      { q: 'How does the Jenkins Kubernetes plugin create dynamic agents?', a: 'The plugin calls the Kubernetes API to create a Pod per build. The Pod runs a JNLP container that connects back to the Controller, executes the pipeline, then the Pod is deleted.' },
      { q: 'What is a Jenkins Executor?', a: 'A slot on an Agent that can run one build at a time. An Agent with 4 executors can run 4 concurrent builds. The Controller executor count should be set to 0 in production.' },
      { q: 'Why should the Jenkins Controller executor count be 0?', a: 'Running builds on the Controller wastes Controller resources, degrades UI/API responsiveness, and is a security risk since builds have access to Controller filesystem and credentials.' },
      { q: 'How do you label Agents for workload routing in a pipeline?', a: 'Assign labels to Agents (e.g., linux, docker, gpu). Use agent { label \'docker\' } in the Jenkinsfile to route the pipeline to a matching Agent.' },
      { q: 'What is the Jenkins Shared Library and why is it used?', a: 'A Git repository of reusable Groovy pipeline code (steps, utilities). Referenced with @Library in Jenkinsfiles to avoid duplicating pipeline logic across hundreds of jobs.' },
    ],
    references: [
      'https://www.jenkins.io/doc/book/architecture/',
      'https://plugins.jenkins.io/kubernetes/',
      'https://www.jenkins.io/doc/book/managing/nodes/',
    ],
  },

  {
    id: 'jenkinsfile-pipeline-code',
    title: 'Jenkinsfile — Pipeline as Code',
    icon: 'tool',
    color: '#16a34a',
    questions: 4,
    description: `Jenkinsfile defines CI/CD pipeline as code (pipeline { agent any; stages { stage("Build") { steps {...} } } post { success/failure } }). Declarative pipeline = easy, structured, uses predefined syntax. Scripted pipeline = Groovy-based, flexible, handles complex logic. 7 main keywords: pipeline, agent, stages, stage, steps, post, environment.`,
    visualizations: [
      {
        title: 'Jenkinsfile structure — declarative pipeline anatomy',
        description: 'pipeline { agent + environment } → stages block → stage("Build") { steps } + stage("Test") { steps } + stage("Deploy") { when + steps } → post { success/failure/always }. Pipeline as code lives in the repo, is version-controlled, and drives CI/CD automatically.',
        image: '/diagrams/linkdiags/jenkins-architecture.png',
      },
    ],
    introduction: `## Overview
A Jenkinsfile is a text file checked into the source repository that defines the entire CI/CD pipeline as code. Jenkins reads it automatically when a build triggers. Having the pipeline definition in the repository provides version control, peer review, and reproducibility.

Declarative Pipeline (recommended):
A structured, opinionated syntax with predefined blocks. Easier to read and write. Jenkins validates the structure before running. Supports a visual pipeline editor. Most teams should use Declarative.

pipeline {
  agent any
  environment {
    APP_ENV = "production"
    IMAGE_TAG = "\${env.BUILD_NUMBER}"
  }
  stages {
    stage("Build") {
      steps {
        sh "mvn clean package -DskipTests"
      }
    }
    stage("Test") {
      steps {
        sh "mvn test"
        junit "target/surefire-reports/*.xml"
      }
    }
    stage("Docker Build") {
      steps {
        sh "docker build -t myapp:\${IMAGE_TAG} ."
      }
    }
    stage("Deploy") {
      when {
        branch "main"
      }
      steps {
        sh "helm upgrade --install myapp ./chart --set image.tag=\${IMAGE_TAG}"
      }
    }
  }
  post {
    success { slackSend message: "Build \${env.BUILD_NUMBER} succeeded" }
    failure { slackSend message: "Build \${env.BUILD_NUMBER} failed" }
    always { cleanWs() }
  }
}

Scripted Pipeline:
Groovy-based, free-form. More powerful for complex logic (loops, conditionals, error handling) but harder to read. No validation before run.

node {
  stage("Build") { sh "mvn package" }
  stage("Deploy") {
    if (env.BRANCH_NAME == "main") { sh "helm upgrade --install ..." }
  }
}

Seven main keywords:
1. pipeline — top-level wrapper block (Declarative only)
2. agent — where stages run (any, none, specific node label, Kubernetes pod)
3. stages — contains one or more stage blocks
4. stage — a named phase (Build, Test, Deploy). Appears in the Jenkins UI.
5. steps — the actual commands (sh, echo, script, bat, withCredentials, stash, unstash)
6. post — actions after pipeline completes (success, failure, always, unstable, changed)
7. environment — key-value env vars available to all stages

Additional powerful blocks:
- when: conditionally run a stage (branch name, environment variable, expression)
- tools: install JDK, Maven, Node.js via Jenkins Tool config
- parallel: run multiple stages concurrently to speed up pipelines
- withCredentials: inject secrets from Jenkins Credentials store without exposing in logs`,
    whenToUse: [
      'Every Jenkins CI/CD pipeline — Jenkinsfile should always be in the repository, never configured only in the UI',
      'Writing pipeline logic for build, test, scan, package, deploy stages',
      'Implementing conditional deployments (only deploy from main branch)',
      'Running stages in parallel (test + lint + security scan simultaneously)',
      'Injecting secrets from Jenkins Credentials store safely into build steps',
    ],
    keyConcepts: [
      {
        term: 'Declarative vs Scripted',
        definition: 'Declarative: structured, validated, recommended for most pipelines. Uses predefined blocks. Scripted: Groovy, flexible, handles complex logic (dynamic stage generation, loops). Choose Declarative unless you need scripted\'s power.',
      },
      {
        term: 'agent directive',
        definition: `Defines where the pipeline or a stage runs. agent any: any available agent. agent none: no default (each stage must declare its own). agent { label "docker" }: agents labeled "docker". agent { kubernetes { ... } }: Kubernetes pod spec.`,
      },
      {
        term: 'post block',
        definition: 'Runs after all stages complete. Conditions: always (always runs), success (only on success), failure (only on failure), unstable (test failures), changed (result changed vs previous build). Good for notifications, cleanup, artifact archiving.',
      },
      {
        term: 'withCredentials',
        definition: `Injects secrets from Jenkins Credentials store into the build environment without logging them. withCredentials([usernamePassword(credentialsId: "docker-hub", usernameVariable: "DOCKER_USER", passwordVariable: "DOCKER_PASS")]) { sh "docker login -u $DOCKER_USER -p $DOCKER_PASS" }`,
      },
      {
        term: 'parallel stages',
        definition: `Run multiple stages concurrently. stages { stage("Parallel Tests") { parallel { stage("Unit") { steps { sh "mvn test" } } stage("Lint") { steps { sh "eslint ." } } } } }. Reduces total pipeline time.`,
      },
      {
        term: 'when directive',
        definition: `Conditionally execute a stage. when { branch "main" } — only on main branch. when { environment name: "DEPLOY_ENV", value: "prod" }. when { expression { return params.DEPLOY == true } }. Prevents deploy stages from running on feature branches.`,
      },
    ],
    approach: [
      'Always check in Jenkinsfile to the repository root — never configure pipelines only in the Jenkins UI',
      'Use Declarative pipeline as the default; switch to scripted only when Declarative cannot express the logic',
      'Define all secrets in Jenkins Credentials store and inject with withCredentials — never hardcode in Jenkinsfile',
      'Use parallel to run independent stages (test, lint, security scan) concurrently',
      'Use post { always { cleanWs() } } to clean the workspace after builds — prevents disk fill',
      'Store Jenkinsfile in the same repository as the code it builds — single source of truth',
    ],
    pitfalls: [
      'Hardcoding credentials in Jenkinsfile — they appear in build logs and version history forever',
      'Not using when directives — every branch triggers deploys to production',
      'Long sequential stages when stages are independent — wastes time; use parallel',
      'Putting all logic in a single Jenkinsfile — use shared libraries for org-wide patterns',
      'Not archiving test reports — test failures are invisible in the Jenkins UI; use junit and archiveArtifacts',
    ],
    keyQuestions: [
      {
        question: 'Write a Jenkinsfile with Build, Test, Docker Build, and Deploy stages.',
        answer: `pipeline {
  agent any
  environment {
    REGISTRY = "registry.example.com"
    IMAGE = "myapp"
    TAG = "\${env.BUILD_NUMBER}"
  }
  stages {
    stage("Build") {
      steps {
        sh "mvn clean package -DskipTests"
        archiveArtifacts artifacts: "target/*.jar"
      }
    }
    stage("Test") {
      steps {
        sh "mvn test"
        junit "target/surefire-reports/*.xml"
      }
    }
    stage("Docker Build & Push") {
      steps {
        withCredentials([usernamePassword(
          credentialsId: "registry-creds",
          usernameVariable: "DOCKER_USER",
          passwordVariable: "DOCKER_PASS"
        )]) {
          sh """
            docker build -t \${REGISTRY}/\${IMAGE}:\${TAG} .
            docker login \${REGISTRY} -u \${DOCKER_USER} -p \${DOCKER_PASS}
            docker push \${REGISTRY}/\${IMAGE}:\${TAG}
          """
        }
      }
    }
    stage("Deploy") {
      when { branch "main" }
      steps {
        sh "helm upgrade --install \${IMAGE} ./chart --set image.tag=\${TAG}"
      }
    }
  }
  post {
    success { echo "Pipeline succeeded — \${IMAGE}:\${TAG} deployed" }
    failure { echo "Pipeline failed — check logs" }
    always { cleanWs() }
  }
}`,
      },
      {
        question: 'What is the difference between declarative and scripted Jenkins pipelines?',
        answer: `Declarative Pipeline: uses a predefined, opinionated syntax with structured blocks (pipeline, agent, stages, stage, steps, post). Jenkins validates the structure before running — syntax errors caught immediately. Supports the Blue Ocean visual pipeline editor. All common CI/CD patterns (parallel, when, withCredentials, post) are supported. Recommended for 95% of pipelines.

Scripted Pipeline: Groovy-based, free-form. Wrapped in node { } block. No predefined structure — everything is a Groovy script. More powerful for dynamic pipeline generation (e.g., creating stages from a list at runtime), complex error handling with try/catch/finally, or conditional logic that doesn\'t fit Declarative\'s when syntax.

Choosing:
Use Declarative when: standard linear or parallel pipeline, conditional stages by branch/param, inject credentials, notify on failure.
Use Scripted when: dynamic stage generation from a config file or API, complex Groovy logic, legacy pipeline migration.

You can mix both: Declarative pipeline with a script { ... } block inside a stage\'s steps for complex Groovy.`,
      },
    ],
    quickFire: [
      { q: 'What is the difference between Declarative and Scripted Pipeline?', a: 'Declarative uses a structured pipeline {} block with strict syntax -- easier to read and validate. Scripted is arbitrary Groovy inside node {} -- more flexible but harder to maintain.' },
      { q: 'What are the mandatory sections in a Declarative Pipeline?', a: 'pipeline {}, agent {}, and at least one stage inside stages {}. The steps {} block inside each stage contains the actual commands.' },
      { q: 'What does the post {} block do in a Declarative Pipeline?', a: 'Defines steps that run after the pipeline or stage completes. Conditions: always, success, failure, unstable, changed. Used for notifications and cleanup.' },
      { q: 'How do you run pipeline stages in parallel?', a: 'Use the parallel directive inside a stage: stage("Test") { parallel { stage("Unit") {...} stage("Integration") {...} } }.' },
      { q: 'What is a Shared Library in Jenkins and how do you reference it?', a: 'A Git repo of reusable Groovy code. Reference with @Library("my-lib") at the top of the Jenkinsfile and call its vars/steps by name.' },
      { q: 'How do you access Jenkins credentials in a pipeline?', a: 'Use withCredentials([usernamePassword(credentialsId: "my-cred", ...)]) or the credentials() helper in environment {}. Never hardcode secrets in the Jenkinsfile.' },
      { q: 'What does stash/unstash do in a Jenkins pipeline?', a: 'stash saves files from one stage; unstash retrieves them in a later stage or on a different agent. Used to pass build artifacts between stages running on different nodes.' },
      { q: 'How do you parameterize a Jenkins pipeline?', a: 'Use the parameters {} block in Declarative Pipeline (string, booleanParam, choice). Access values with params.MY_PARAM. Parameters appear as input fields in the UI.' },
      { q: 'What is the when {} directive used for?', a: 'Conditionally executes a stage based on branch name, environment, expression, or other criteria. Example: only deploy when branch == "main".' },
      { q: 'What is the difference between a Multibranch Pipeline and a regular Pipeline job?', a: 'Multibranch Pipeline auto-discovers branches and PRs in a repo and creates a pipeline job for each. Regular Pipeline is a single job pointing to one branch.' },
    ],
    references: [
      'https://www.jenkins.io/doc/book/pipeline/',
      'https://www.jenkins.io/doc/book/pipeline/syntax/',
      'https://www.jenkins.io/doc/book/pipeline/jenkinsfile/',
      'https://plugins.jenkins.io/workflow-aggregator/',
    ],
  },

  {
    id: 'devsecops-pipeline-architecture',
    title: 'DevSecOps Architecture & Pipeline',
    icon: 'shield',
    color: '#ef4444',
    questions: 5,
    description: 'Security embedded in every CI/CD stage: Developer → GitHub → [Build & Test → SAST Scan → Dependency Scan → Docker Build → Image Scan → Security Gates] → Registry → GitOps (ArgoCD) → Kubernetes Cluster → Production Monitoring. Secrets via Vault/K8s Secrets. RBAC + Network Policies + Alerting.',
    visualizations: [
      {
        title: 'DevSecOps pipeline — security gates at every stage',
        description: 'Developer → GitHub → CI pipeline: Build/Test → SAST (SonarQube) → Dependency Scan (Snyk/OWASP) → Docker Build → Image Scan (Trivy/Aqua) → Policy Check (OPA/Gatekeeper) → Container Registry → GitOps (Argo CD) → Kubernetes Cluster → Runtime Security (Falco) + Monitoring.',
        image: '/diagrams/linkdiags/devsecops-pipeline.png',
      },
    ],
    introduction: `## Overview
DevSecOps integrates security practices into every stage of the software development lifecycle rather than treating security as a phase at the end. The principle: "shift left" — find and fix security issues when they are cheapest, at the code commit stage, not in production.

The three pillars of DevSecOps: People (security champions, shared responsibility), Process (security gates in every pipeline stage), Tools (automated scanning — no human can manually review every commit).

Security at each CI/CD stage:

Pre-commit: developer workstation hooks (git-secrets, gitleaks) catch secrets before they are committed. IDE plugins (Snyk) highlight vulnerabilities in real time.

Build stage: SAST (Static Application Security Testing) analyzes source code without running it. Tools: SonarQube (Java/C#/Python/JavaScript), Semgrep (multi-language, custom rules), Checkmarx. Catches: SQL injection, XSS, hardcoded credentials, insecure crypto, path traversal.

Dependency scan: identifies known vulnerabilities (CVEs) in open-source libraries. Tools: Snyk, OWASP Dependency-Check, npm audit, safety (Python). Output: list of CVE IDs with severity (Critical/High/Medium) and fixed versions.

Docker Build: the image is built from source. No secrets in image layers (use multi-stage builds, build args, not ENV for secrets).

Image scan: scans the container image filesystem for CVEs in OS packages and application libraries. Tools: Trivy (free, fast, comprehensive), Grype, Aqua Security, Twistlock/Prisma. Critical findings should fail the build (configurable thresholds).

Policy/Security gates: OPA (Open Policy Agent) / Conftest / Checkov evaluate the container image or IaC against organizational policies. Example policies: no root user in container, image must come from approved registry, resource limits required, no privileged containers.

Registry: store signed, scanned images. Use Sigstore/cosign for image signing. Only signed images pass policy gates in the cluster.

GitOps deployment (Argo CD): declarative Kubernetes manifests in Git. Argo CD syncs cluster state to Git. Security: Git is the audit trail for every deployment; no ad-hoc kubectl apply in production.

Kubernetes cluster security: RBAC (who can do what), NetworkPolicy (network segmentation), Pod Security Standards (restrict privileged containers), OPA Gatekeeper (admission control policies), Secrets management (Vault, External Secrets Operator).

Runtime security: Falco watches kernel system calls and alerts on suspicious behavior (unexpected network connection, binary execution outside expected paths, privilege escalation). Provides a last line of defense after all static checks.`,
    whenToUse: [
      'Designing a new CI/CD pipeline — incorporate security from day one',
      'Security audit of existing pipelines — identify missing security gates',
      'Meeting compliance requirements (SOC2, PCI-DSS, FedRAMP) for software supply chain security',
      'Interview questions about DevSecOps, shift-left, or supply chain security',
      'Onboarding security champions in engineering teams',
    ],
    keyConcepts: [
      {
        term: 'Shift Left',
        definition: 'Move security checks earlier in the development lifecycle. Finding a SQL injection in a static scan (cost: seconds, no prod impact) vs finding it in a pen test (cost: hours) vs finding it after a breach (cost: catastrophic). Each stage to the left is orders of magnitude cheaper.',
      },
      {
        term: 'SAST (Static Application Security Testing)',
        definition: 'Analyzes source code without execution. Finds: injection flaws, hardcoded secrets, insecure functions, logic errors. Tools: SonarQube, Semgrep, Checkmarx, Veracode. Runs in CI on every PR. Fast (seconds to minutes).',
      },
      {
        term: 'SCA (Software Composition Analysis)',
        definition: 'Identifies CVEs in open-source dependencies. Generates an SBOM (Software Bill of Materials). Tools: Snyk, OWASP Dependency-Check, Dependabot, Grype. Critical: most enterprise software is 70–90% open-source by line count.',
      },
      {
        term: 'Image scanning',
        definition: 'Scans container image layers for CVEs in OS packages (Ubuntu/Alpine base) and language runtime packages. Trivy is the de facto standard: free, fast, OCI-compliant, integrates with CI/CD, registries, and Kubernetes admission. Fail builds on Critical/High findings.',
      },
      {
        term: 'OPA Gatekeeper',
        definition: 'Kubernetes admission controller that evaluates every resource create/update request against Rego policies. Policies: require resource limits, block hostPath mounts, require image digest (not mutable tags), require security labels. Provides guardrails so misconfigured manifests never reach the cluster.',
      },
      {
        term: 'Falco',
        definition: 'CNCF runtime security tool. Monitors Linux kernel syscalls via eBPF. Detects: unexpected outbound connections, shell spawned in a container, file read in /etc/shadow, privilege escalation. Sends alerts to SIEM/Slack. Complements static scanning by catching attacks that bypass pre-deployment checks.',
      },
    ],
    approach: [
      'Map every CI/CD stage and add at least one security check: pre-commit, build, package, deploy, runtime',
      'Start with the highest-impact, lowest-friction tools: Trivy for image scanning, Dependabot for dependency updates, gitleaks for secret detection',
      'Set failure thresholds: Critical CVEs fail the build; High CVEs create tickets; Medium/Low are informational',
      'Never hardcode secrets — use Vault, AWS Secrets Manager, or Kubernetes Secrets with External Secrets Operator',
      'Sign images with cosign and require signature verification in OPA Gatekeeper admission policy',
      'Treat security tool findings like test failures — they block merge and require remediation, not suppression',
    ],
    pitfalls: [
      'Running security scans but not failing the build on findings — scans become noise, findings are never fixed',
      'Scanning only the application code and ignoring base image CVEs — base images are often the most vulnerable layer',
      'Storing secrets in environment variables in Docker images or Kubernetes Deployments (unencrypted) — use Vault or K8s Secrets + RBAC',
      'No runtime security monitoring — static checks find known patterns; novel attacks require runtime detection',
      'Treating security as a separate team\'s responsibility — DevSecOps requires shared ownership; developers must triage and fix findings',
    ],
    keyQuestions: [
      {
        question: 'Design a DevSecOps CI/CD pipeline for a containerized application.',
        answer: `Eight-stage secure pipeline:

Stage 1 — Pre-commit: gitleaks or git-secrets hook prevents secret commits. Developer IDE shows Snyk vulnerability highlights.

Stage 2 — PR Build: checkout code → SAST (Semgrep + SonarQube quality gate) → SCA (Snyk: fail on Critical CVEs) → lint + unit tests.

Stage 3 — Docker Build: multi-stage Dockerfile (builder stage discards dev tools). No secrets in ENV or layers. Build args for credentials.

Stage 4 — Image Scan: Trivy scans the built image. Threshold: Critical = fail build, High = warn + create Jira ticket.

Stage 5 — Policy Check: Conftest/Checkov validates Kubernetes manifests against OPA policies (no latest tags, resource limits required, no privileged containers, correct labels).

Stage 6 — Image Signing: cosign signs the image with OIDC-based keyless signing. Signature stored in registry.

Stage 7 — GitOps Deploy: PR merged to deploy manifest repo → Argo CD detects change → syncs to Kubernetes. OPA Gatekeeper validates every manifest on admission: rejects unsigned images, missing limits, or policy violations.

Stage 8 — Runtime: Falco monitors syscalls in production. Alerts on: reverse shell, crypto miner spawn, unexpected outbound connections. PagerDuty/SIEM integration.

Secrets throughout: Vault provides dynamic secrets to CI/CD (short-lived credentials). External Secrets Operator syncs Vault secrets to Kubernetes Secrets.`,
      },
      {
        question: 'What is the difference between SAST, DAST, and SCA?',
        answer: `SAST (Static Application Security Testing): analyzes source code or bytecode without executing the application. Runs at build time. Finds: injection flaws, hardcoded secrets, insecure API calls, logic errors. Fast (seconds to minutes). Zero runtime risk. Cannot find issues that only appear at runtime (authentication bypass, business logic flaws). Tools: SonarQube, Semgrep, Checkmarx, CodeQL.

DAST (Dynamic Application Security Testing): interacts with the running application like an attacker would. Sends malformed inputs, fuzzes endpoints, tests authentication. Finds: injection that only appears at runtime, IDOR, authentication failures, server misconfigurations. Slower (minutes to hours). Requires a running environment. Tools: OWASP ZAP, Burp Suite, Nuclei.

SCA (Software Composition Analysis): inventories open-source dependencies and maps them to CVE databases. Finds: known vulnerabilities in third-party libraries. Generates SBOM. Tools: Snyk, OWASP Dependency-Check, Dependabot, Grype. Runs at build time.

Use all three: SAST + SCA in every PR (fast, automated). DAST in staging after deployment (slower, needs running app). Together they cover code, dependencies, and runtime behavior.`,
      },
    ],
    quickFire: [
      { q: 'What is the difference between SAST and DAST?', a: 'SAST (Static Application Security Testing) analyzes source code without running it. DAST (Dynamic Application Security Testing) attacks a running application to find runtime vulnerabilities.' },
      { q: 'What is SCA and what does it scan?', a: 'Software Composition Analysis scans third-party dependencies for known CVEs. Tools: Snyk, Dependabot, Trivy --dependency-check. Catches Log4Shell-style supply chain issues.' },
      { q: 'What does Trivy scan in a CI pipeline?', a: 'Container images, filesystems, and IaC files for OS package CVEs, language dependency CVEs, misconfigurations, and secrets. It is the most widely used open-source container scanner.' },
      { q: 'What is OPA (Open Policy Agent) used for in a DevSecOps pipeline?', a: 'OPA evaluates policy-as-code rules (written in Rego) to gate deployments. Example: block any Kubernetes deployment that lacks resource limits or runs as root.' },
      { q: 'What is secrets scanning and which tools do it?', a: 'Scanning Git history and code for accidentally committed credentials, API keys, and tokens. Tools: truffleHog, Gitleaks, GitHub secret scanning. Should run on every PR.' },
      { q: 'What is image signing and why does it matter?', a: 'Signing a container image (with Cosign/Sigstore) proves it was built by a trusted pipeline and has not been tampered with. Admission controllers can reject unsigned images.' },
      { q: 'What is Falco and when does it run?', a: 'Falco is a runtime threat detection tool for Kubernetes. It uses eBPF to watch syscalls and generates alerts when containers behave unexpectedly (shell spawn, sensitive file read, network connect).' },
      { q: 'What is the shift-left security principle?', a: 'Moving security checks earlier in the SDLC -- into developer IDEs, PR checks, and CI -- rather than only at deployment time. Earlier detection is cheaper and faster to fix.' },
      { q: 'What is a Software Bill of Materials (SBOM) and why is it required?', a: 'A machine-readable inventory of all components in a software artifact. Required by US Executive Order 14028 for federal software. Generated by Syft or Trivy --format cyclonedx.' },
      { q: 'How does policy-as-code differ from manual security review?', a: 'Policy-as-code (OPA, Kyverno) enforces rules automatically on every commit/deploy with zero reviewer fatigue. Manual review is inconsistent, slow, and does not scale.' },
    ],
    references: [
      'https://owasp.org/www-project-devsecops-guideline/',
      'https://aquasecurity.github.io/trivy/',
      'https://falco.org/docs/',
      'https://www.openpolicyagent.org/',
      'https://docs.sigstore.dev/',
    ],
  },

  {
    id: 'high-availability-system-design',
    title: 'High Availability System Design',
    icon: 'cloud',
    color: '#0ea5e9',
    questions: 4,
    description: 'HA eliminates single points of failure: Load Balancer → Multiple App Servers in different AZs → Primary DB + Replica + Backup/Monitoring/Failover. No single point of failure, multi-zone deployment, automatic failover, health checks. HA vs single server: shared traffic, multi-zone, DB replica, health checks trigger failover, better uptime.',
    visualizations: [
      {
        title: 'HA vs single-server architecture',
        description: 'Single Server (bad): User → One Server → One Database. One failure stops the app, no failover, limited scaling. HA Design: User Traffic → Load Balancer → App Server Zone A + Zone B + Zone C → Primary DB + Replica → Backup + Monitoring + Failover. Shared traffic, multi-zone, automatic failover via health checks.',
        image: '/diagrams/linkdiags/high-availability.png',
      },
    ],
    introduction: `## Overview
High Availability (HA) means designing a system to operate continuously with minimal downtime, even when individual components fail. Production systems are designed to SURVIVE failure, not avoid it.

The core principle: eliminate every single point of failure (SPOF). Any component that, if it fails, takes down the entire system is a SPOF. HA means every critical component has redundancy.

Single server anti-pattern:
User → One Server → One Database
Failure modes: server crash (CPU/memory/OS), deployment gone wrong, disk full, network partition, datacenter power event. Any one of these = full outage.

HA architecture:
User Traffic → DNS / Global Load Balancer → Regional Load Balancer → App Server (Zone A) + App Server (Zone B) + App Server (Zone C) → Primary Database + Read Replica(s) → Backup + Monitoring + Automatic Failover

Five HA components:

1. Load Balancer: distributes incoming traffic across healthy instances. Performs health checks — removes unhealthy instances from rotation. Itself is redundant (active-active LB pairs or cloud-managed LB with built-in HA). AWS ALB, GCP GLBC, Azure Application Gateway are all multi-AZ by default.

2. Multiple App Servers in multiple Availability Zones: if one AZ has a power event, the other AZs continue serving traffic. The load balancer detects the unhealthy AZ and stops routing to it. App servers are stateless (no local session state) — any server can handle any request.

3. Database Primary + Read Replica: Primary handles writes. Replica handles reads (reducing load on Primary) and can be promoted to Primary on failure. Multi-AZ RDS: automatic failover to the replica in under 60 seconds on Primary failure.

4. Backup and Point-in-Time Recovery: automated daily snapshots + transaction log shipping for minutes-granularity recovery. RTO (Recovery Time Objective): how fast to recover. RPO (Recovery Point Objective): how much data loss is acceptable.

5. Monitoring and Alerting: health checks at each layer. CloudWatch / Datadog / Prometheus alert on: instance CPU/memory, error rates, latency p99, database replication lag. Alerting triggers automatic failover or pages on-call.

SLA math: 99.9% uptime = 8.7 hours downtime/year. 99.99% = 52 minutes/year. 99.999% = 5 minutes/year. Each 9 requires increasingly redundant architecture.`,
    whenToUse: [
      'Designing any production system that must meet an uptime SLA',
      'Architecture review of a system that currently has SPOFs',
      'Interview questions about system design for reliability',
      'Planning multi-AZ or multi-region deployments',
      'Presenting infrastructure design to a CTO or technical leadership',
    ],
    keyConcepts: [
      {
        term: 'Single Point of Failure (SPOF)',
        definition: 'A component whose failure causes the entire system to fail. Eliminating SPOFs is the primary task of HA design. Audit every component: if it fails, does the system go down? If yes, add redundancy.',
      },
      {
        term: 'RTO (Recovery Time Objective)',
        definition: 'Maximum acceptable time to restore service after a failure. Example: RTO = 30 minutes means the system must be back online within 30 minutes of any failure. Drives: how fast failover must be, whether warm standby or cold standby is sufficient.',
      },
      {
        term: 'RPO (Recovery Point Objective)',
        definition: 'Maximum acceptable data loss measured in time. RPO = 5 minutes means you can lose at most 5 minutes of transactions. Drives: backup frequency, replication lag limits, whether synchronous or asynchronous replication is required.',
      },
      {
        term: 'Active-Active vs Active-Passive',
        definition: 'Active-Active: all instances serve traffic simultaneously; failure of one reduces capacity but system stays up. Active-Passive: one instance is hot standby, receives no traffic until the primary fails; faster failover than cold standby. Active-Active is preferred for web tier; Active-Passive for database Primary.',
      },
      {
        term: 'Health checks',
        definition: 'Load balancers and orchestrators continuously probe instances (HTTP /health endpoint). Failed checks remove the instance from rotation. Kubernetes liveness/readiness probes are the K8s equivalent. Without health checks, traffic continues to a failed instance.',
      },
      {
        term: 'Availability Zone (AZ)',
        definition: 'Physically separate datacenter within a cloud region with independent power, cooling, and networking. Deploying across 3 AZs means a full AZ outage (which AWS/GCP/Azure SLA for) only takes down 1/3 of capacity, not the whole system.',
      },
    ],
    approach: [
      'Draw the architecture diagram and circle every component — ask "if this fails, does the system go down?"',
      'Deploy app servers across at least 3 AZs behind an auto-scaling group',
      'Use cloud-managed databases (RDS Multi-AZ, Cloud SQL, Aurora) for automatic failover',
      'Implement /health endpoints on every service; configure load balancer health checks',
      'Define RTO and RPO with the business before designing — they drive architectural decisions',
      'Test failover regularly: terminate an instance, simulate an AZ failure, kill the database Primary',
    ],
    pitfalls: [
      'HA app tier with a single-instance database — the database is a SPOF; the app tier HA is worthless',
      'Storing session state on app servers — when a server is removed from the LB, in-flight requests fail; use Redis/Memcached for shared session state',
      'Active-Active databases with synchronous replication — cross-AZ latency adds 5-20ms to every write; benchmark before adopting',
      'Not testing failover — HA designs that have never been tested often don\'t work correctly when needed',
      'Ignoring the load balancer as a SPOF — use cloud-managed LBs (AWS ALB is multi-AZ by design) or deploy an LB pair',
    ],
    keyQuestions: [
      {
        question: 'Design a highly available web application on AWS.',
        answer: `Three-tier HA design:

DNS Layer: Route53 with health checks. Latency-based or failover routing. Points to the ALB.

Load Balancer: AWS Application Load Balancer (multi-AZ by default). Listens on 443 (TLS cert from ACM). Health check: GET /health every 30s, 2 failures = unhealthy. Targets the Auto Scaling Group.

Compute Layer: EC2 Auto Scaling Group across 3 AZs (us-east-1a, 1b, 1c). Minimum: 3 instances (1 per AZ). Desired: 6. Maximum: 18. Scale-out policy: CPU > 70% for 5 minutes. Scale-in policy: CPU < 30% for 15 minutes. Launch Template: latest hardened AMI, no public IP, private subnet. Stateless: no local session storage.

Session State: Elasticache Redis (cluster mode, multi-AZ). Session data survives instance termination.

Database Layer: RDS Aurora MySQL with Multi-AZ enabled. Writer endpoint for writes, Reader endpoint for reads. Automated failover to replica: under 60 seconds. Backup retention: 7 days. Point-in-time recovery. Encrypted at rest (KMS).

Storage: S3 for static assets and uploads. S3 is inherently HA (11 nines durability, 99.99% availability SLA). CloudFront CDN in front of S3.

Monitoring: CloudWatch metrics + alarms. Datadog APM. PagerDuty for on-call. Application-level health: error rate, latency p50/p95/p99.

Estimated SLA: ~99.99% (four nines) per AWS SLA for the combination of ALB + EC2 + RDS Multi-AZ.`,
      },
      {
        question: 'What is the difference between RTO and RPO and how do they drive architectural decisions?',
        answer: `RTO (Recovery Time Objective): maximum acceptable time the system can be down before recovery is complete. Business sets this: "we can tolerate 15 minutes of downtime per incident."

RPO (Recovery Point Objective): maximum acceptable data loss measured in time. Business sets this: "we can tolerate losing up to 5 minutes of transactions."

How they drive architecture:

RTO = 15 minutes: warm standby (pre-provisioned replica, promoted in under 15 minutes). RDS Multi-AZ failover (~60 seconds) satisfies this. Cold standby from backup does not (restore takes longer).

RTO = 1 minute: active-active with automatic failover. Aurora Global Database, RDS Multi-AZ, Redis Sentinel. No human in the loop.

RTO = 10 seconds: requires traffic already flowing to the standby before failover (active-active). Multiple regions with Route53 health checks.

RPO = 5 minutes: automated backups every 5 minutes OR synchronous replication (ensures replica is always current). RDS automated backups with 5-minute transaction log shipping satisfies this.

RPO = 0 (zero data loss): synchronous replication required. Every write is committed to the primary AND at least one replica before acknowledging. Adds write latency. Required for financial transactions.

RPO = 24 hours: daily backups sufficient. Acceptable for dev/test environments or low-criticality data.

The conversation: always ask the business for RTO and RPO before designing. Stricter requirements cost exponentially more (active-active multi-region is 3-5x the cost of single-region HA).`,
      },
    ],
    quickFire: [
      { q: 'What is the difference between Active-Active and Active-Passive HA?', a: 'Active-Active: all nodes serve traffic simultaneously -- higher throughput, instant failover. Active-Passive: standby takes over on failure -- simpler but wastes standby capacity.' },
      { q: 'What does N+2 redundancy mean?', a: 'Provision N+2 capacity: enough nodes to handle full load with 2 nodes simultaneously failed. N+1 handles one failure; N+2 is required for maintenance windows during incidents.' },
      { q: 'What is RTO and RPO?', a: 'RTO (Recovery Time Objective) is the maximum tolerated downtime. RPO (Recovery Point Objective) is the maximum tolerated data loss window. Both drive HA architecture decisions.' },
      { q: 'What is split-brain in a distributed system?', a: 'When a network partition causes two nodes to both believe they are the primary and accept writes independently, leading to data divergence. Prevented by quorum-based consensus (Raft, Paxos).' },
      { q: 'How do health checks differ from liveness probes in a load balancer context?', a: 'Load balancer health checks remove unhealthy backends from rotation. They are typically HTTP GET or TCP checks on a /health endpoint at a configurable interval.' },
      { q: 'What is a circuit breaker pattern?', a: 'A proxy that tracks failure rates to a downstream service. When failures exceed a threshold, it opens the circuit and returns errors immediately without calling the failing service, preventing cascade failures.' },
      { q: 'What is the difference between failover and fallback?', a: 'Failover switches traffic to a redundant replica of the same service. Fallback serves a degraded but functional response (cached data, static page) when the primary is unavailable.' },
      { q: 'How do you achieve database HA in AWS?', a: 'RDS Multi-AZ: synchronous replication to a standby in another AZ with automatic failover in 60-120 seconds. Aurora: 6-way replication across 3 AZs with faster failover (~30s).' },
      { q: 'What is a bulkhead pattern?', a: 'Isolating components into separate resource pools (thread pools, connection pools) so that failure or overload in one service does not exhaust resources for others.' },
      { q: 'What metrics indicate a system needs more redundancy?', a: 'MTTR (Mean Time to Recover) exceeding SLA, single points of failure in dependency map, availability below target (e.g., 99.9% = 8.7h downtime/year), or recent incident post-mortems citing cascades.' },
    ],
    references: [
      'https://aws.amazon.com/architecture/well-architected/',
      'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html',
      'https://cloud.google.com/architecture/infra-reliability-guide',
      'https://learn.microsoft.com/en-us/azure/architecture/framework/resiliency/',
    ],
  },

  {
    id: 'overlay-underlay-networking-deep',
    title: 'Overlay vs Underlay Networking',
    icon: 'cloud',
    color: '#0ea5e9',
    questions: 4,
    description: 'Underlay = real physical/cloud network that carries actual packets (routers, switches, data center, cloud VPC). Overlay = virtual network built on top using encapsulation/tunnels (VXLAN, Geneve, GRE). Kubernetes CNI uses overlay (VXLAN) to connect pods across nodes without changing physical network. Both work together: overlay needs healthy underlay.',
    visualizations: [
      {
        title: 'Overlay vs Underlay — encapsulation flow',
        description: 'Pod A → build packet → CNI encapsulates (VXLAN outer header added) → transmitted via real IP routing over underlay (physical/cloud network) → CNI on destination node decapsulates (removes outer header) → Original packet delivered to Pod B. Think: overlay is a virtual private road built on the physical highway.',
        image: '/diagrams/linkdiags/overlay-underlay.png',
      },
    ],
    introduction: `## Overview
Every modern cloud and Kubernetes networking stack uses the overlay-underlay model. Understanding it explains how pods on different nodes communicate, why there are two IP headers in a packet trace, and what happens when VXLAN breaks.

Underlay Network — the physical/cloud foundation:
The underlay is the real network: physical routers, switches, cloud VPC routing tables, ISP links. It carries actual IP packets between machines. It knows nothing about containers or Kubernetes. Its only job is to deliver packets from Node A to Node B based on real IP addresses.

Examples: AWS VPC (routes between EC2 instances), data center fabric (BGP between ToR switches), GCP VPC (software-defined but still the underlay from Kubernetes\'s perspective).

Analogy: the underlay is the highway system. It exists independently of the vehicles using it.

Overlay Network — the virtual layer on top:
The overlay is a virtual network constructed on top of the underlay using encapsulation. Workloads (containers, VMs) get addresses in the overlay address space (e.g., 10.244.0.0/16 for pods), which are different from the underlay addresses (e.g., 172.16.0.0/16 for nodes).

When a pod sends a packet to another pod on a different node: the source CNI agent wraps the pod packet in an outer IP/UDP packet with node IPs as source and destination (VXLAN encapsulation). The underlay routes this outer packet to the destination node. The destination CNI agent strips the outer header and delivers the original pod packet.

Common overlay technologies:
- VXLAN (Virtual Extensible LAN): most widely used. Encapsulates Layer 2 frames in UDP. Standard port: 4789. Used by Flannel, Calico (overlay mode), Cilium (overlay mode), OpenShift SDN.
- Geneve: more extensible than VXLAN, same encapsulation concept. Used by OVN-Kubernetes, NSX-T.
- GRE (Generic Routing Encapsulation): older, simpler, point-to-point tunnels. Less common in K8s.
- IP-in-IP: minimal overhead, tunnels IPv4 packets inside IPv4. Used by Calico in certain modes.

No-overlay alternative (Calico BGP mode): Instead of VXLAN, Calico programs BGP routes so the physical routers know how to reach each pod CIDR directly. No encapsulation overhead. Requires underlay BGP support. Faster but more complex to operate.

Kubernetes uses: Flannel/Calico use VXLAN overlay by default. Cloud providers (EKS, GKE, AKS) often use native VPC routing (no overlay) for better performance. Cilium supports both.

Critical dependency: if the underlay has issues (packet loss, high latency, MTU mismatch), the overlay will fail too. VXLAN adds ~50 bytes of header; if the underlay MTU is 1500 and pods try to send 1500-byte packets, the VXLAN packet exceeds MTU and gets fragmented or dropped. Always configure MTU = underlay MTU - 50 bytes for VXLAN overlays.`,
    whenToUse: [
      'Choosing a Kubernetes CNI plugin and understanding the performance implications',
      'Debugging pod-to-pod connectivity across nodes — knowing that two IP headers exist in VXLAN traffic',
      'Interview questions about cloud networking, SDN, or Kubernetes networking internals',
      'Designing multi-cloud or hybrid cloud networking where overlay connects networks with incompatible addressing',
      'Troubleshooting MTU-related packet drops in containerized environments',
    ],
    keyConcepts: [
      {
        term: 'Underlay',
        definition: 'The real physical or cloud network. Carries actual IP packets between machines. Knows only node/VM IP addresses. Examples: AWS VPC, data center routers/switches, ISP backbone. Stable, managed by infrastructure team or cloud provider.',
      },
      {
        term: 'Overlay',
        definition: 'A virtual network built on top of the underlay using encapsulation. Workloads get overlay IP addresses (pod IPs). Packets between overlay addresses are wrapped in outer packets with underlay (node) addresses for transit. Managed by CNI plugins or SDN controllers.',
      },
      {
        term: 'VXLAN',
        definition: 'Virtual Extensible LAN. Encapsulates Layer 2 frames (or Layer 3 packets, in practice) in UDP datagrams. Standard UDP port 4789. Adds approximately 50 bytes of overhead per packet. The dominant overlay technology for Kubernetes CNI plugins.',
      },
      {
        term: 'MTU (Maximum Transmission Unit)',
        definition: 'Maximum packet size a network link can carry. Standard Ethernet MTU: 1500 bytes. VXLAN adds ~50 bytes of encapsulation overhead. Pod MTU should be set to underlay MTU minus 50 (typically 1450) to prevent fragmentation. MTU mismatch causes mysterious packet drops for large payloads.',
      },
      {
        term: 'Encapsulation',
        definition: 'Wrapping an inner packet (pod-to-pod payload) with an outer header (node-to-node routing header). The inner packet is the "cargo"; the outer header is the "shipping label." CNI agent on the source node adds the outer header; CNI agent on the destination node removes it.',
      },
      {
        term: 'BGP underlay mode (no overlay)',
        definition: 'Calico can advertise pod CIDRs as BGP routes to physical routers. Pods get routable IPs on the underlay — no encapsulation needed. Higher performance (no encap overhead, no MTU penalty) but requires BGP support from the underlay (not available on all cloud VPCs without additional config).',
      },
    ],
    approach: [
      'Identify the underlay first (AWS VPC, bare metal fabric, cloud VPC) — what MTU does it support?',
      'Set overlay (pod) MTU = underlay MTU minus 50 for VXLAN (e.g., 1450 if underlay is 1500)',
      'For performance-critical workloads: evaluate Calico BGP mode (no overlay) or Cilium native routing if the VPC supports it',
      'Debug VXLAN issues with tcpdump on the VXLAN interface (flannel.1, vxlan.calico) — look for outer UDP port 4789 traffic',
      'Check that VPC security groups / firewall rules allow UDP 4789 between all nodes (VXLAN encapsulated traffic)',
      'Monitor encap/decap overhead with CNI metrics; compare throughput with and without overlay for your workload',
    ],
    pitfalls: [
      'MTU mismatch — setting pod MTU to 1500 on a 1500-byte underlay with VXLAN; large packets are silently dropped (TCP throughput collapses, small requests work fine)',
      'Firewall blocking UDP 4789 between nodes — VXLAN traffic is dropped; cross-node pod communication fails entirely',
      'Using VXLAN overlay on a cloud VPC that supports native routing — paying encap overhead + complexity for no benefit',
      'BGP mode on a cloud VPC that doesn\'t support arbitrary BGP routes — requires Transit Gateway, BGP peer config, or cloud-provider-specific peering',
      'Ignoring underlay instability — packet loss at 0.1% on the underlay causes proportionally higher loss at the overlay; distributed systems are not resilient to sustained packet loss at the network layer',
    ],
    keyQuestions: [
      {
        question: 'Explain the difference between overlay and underlay networking in Kubernetes.',
        answer: `Underlay: the real network — AWS VPC, data center routers, cloud fabric. It routes packets between node IP addresses. It knows nothing about pods or containers. Its job is simple: deliver a packet from Node1-IP to Node2-IP.

Overlay: a virtual network built on top of the underlay using encapsulation. Pods get IP addresses in the overlay address space (e.g., 10.244.0.0/16), completely separate from node IPs. When Pod A (10.244.1.5) on Node 1 sends a packet to Pod B (10.244.2.7) on Node 2, the CNI plugin wraps the pod packet in a VXLAN header with src=Node1-IP, dst=Node2-IP. The underlay routes this outer packet to Node 2. Node 2\'s CNI decapsulates it and delivers the original pod packet.

Why overlays: they decouple the pod address space from the physical network. You can run any pod CIDR regardless of what the VPC uses. You can add nodes without reconfiguring routers. The CNI handles all addressing — infrastructure teams don\'t need to know about pod CIDRs.

Tradeoff: encapsulation adds overhead (~50 bytes per packet), reduces effective MTU, and adds CPU cost at scale. For performance-critical workloads, native routing (Calico BGP or VPC-native CNI) eliminates the overlay.`,
      },
      {
        question: 'How does VXLAN encapsulation work and what can go wrong?',
        answer: `VXLAN flow step by step:

1. Pod A (10.244.1.5) sends a packet to Pod B (10.244.2.7). The packet leaves Pod A\'s network namespace via its veth pair.

2. The packet arrives at the VXLAN tunnel interface (flannel.1 or vxlan.calico) on Node 1. The CNI agent knows that 10.244.2.0/24 is on Node 2 (IP: 192.168.1.2) because it learned this from the CNI\'s routing database (etcd, BGP, or VXLAN FDB).

3. The CNI wraps the inner packet:
   Outer UDP: src=192.168.1.1:random, dst=192.168.1.2:4789
   VXLAN header: VNI (network identifier)
   Inner IP: src=10.244.1.5, dst=10.244.2.7

4. The outer packet is routed by the VPC to Node 2.

5. Node 2\'s kernel receives the UDP packet on port 4789. The VXLAN driver decapsulates, extracts the inner packet, and delivers it to the bridge, then to Pod B.

What can go wrong:

MTU mismatch: inner packet is 1500 bytes, VXLAN adds 50 bytes = 1550, but underlay MTU is 1500. Large packets are fragmented or dropped. Fix: set CNI MTU to 1450.

Firewall blocking UDP 4789: cross-node pod traffic completely fails. Fix: add security group / iptables rule allowing UDP 4789 between all cluster nodes.

ARP/FDB cache stale: CNI\'s VTEP (VXLAN Tunnel Endpoint) FDB entry for a node is wrong. Cross-node packets go to the wrong node. Fix: restart CNI daemonset to resync.

VXLAN kernel module missing: rare, but some stripped-down OS images lack the vxlan kernel module. Fix: install linux-modules-extra or switch to a CNI that uses eBPF instead of VXLAN.`,
      },
    ],
    quickFire: [
      { q: 'What is the difference between an overlay and an underlay network?', a: 'The underlay is the physical or cloud network that carries actual packets. The overlay is a virtual network built on top by encapsulating tenant traffic inside underlay packets.' },
      { q: 'What is VXLAN and what problem does it solve?', a: 'Virtual Extensible LAN (RFC 7348) encapsulates Layer 2 frames inside UDP packets, extending Layer 2 segments across a Layer 3 underlay. Supports up to 16 million segments (24-bit VNI vs VLAN\'s 12-bit).' },
      { q: 'What is a VTEP?', a: 'VXLAN Tunnel Endpoint -- the device (physical NIC or software) that encapsulates outgoing VXLAN frames and decapsulates incoming ones. Each hypervisor/node has a VTEP.' },
      { q: 'How does Geneve differ from VXLAN?', a: 'Geneve (Generic Network Virtualization Encapsulation) has a variable-length options header allowing metadata to be carried with packets. Used by OVN and some cloud providers for richer SDN signaling.' },
      { q: 'What is a spine-leaf topology and why is it used in data centers?', a: 'A two-tier Clos fabric where every leaf switch connects to every spine switch. Provides predictable, equal-cost multipath (ECMP) latency between any two servers and eliminates spanning tree.' },
      { q: 'What is ECMP and why does it matter for overlays?', a: 'Equal-Cost Multipath routes packets across multiple parallel paths simultaneously. In spine-leaf, ECMP across spine switches maximizes bandwidth and provides link-level redundancy.' },
      { q: 'What is IP-in-IP encapsulation (IPIP)?', a: 'A simpler overlay than VXLAN -- wraps an IP packet inside another IP packet with no L2 header. Lower overhead but limited to L3 routing; used by Calico in IPIP mode.' },
      { q: 'How does Calico choose between VXLAN and BGP mode?', a: 'BGP mode programs real routes in the underlay -- no encapsulation overhead, best performance. VXLAN mode works on any network without BGP support. Choose BGP when the underlay supports it.' },
      { q: 'What is the MTU impact of VXLAN encapsulation?', a: 'VXLAN adds 50 bytes of overhead (VXLAN header + UDP + outer IP + Ethernet). If the underlay MTU is 1500, inner packets must be capped at 1450 or the underlay must support jumbo frames (MTU 9000+).' },
      { q: 'What is BUM traffic in VXLAN overlays?', a: 'Broadcast, Unknown unicast, and Multicast -- traffic that must be flooded to all VTEPs because the destination MAC is unknown. Handled via multicast groups or ingress replication (unicast to all VTEPs).' },
    ],
    references: [
      'https://www.rfc-editor.org/rfc/rfc7348',
      'https://docs.projectcalico.org/networking/vxlan-ipip',
      'https://docs.cilium.io/en/stable/network/concepts/routing/',
      'https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md',
    ],
  },

  // ── Chaos Engineering ────────────────────────────────────────────
  {
    id: 'chaos-engineering',
    title: 'Chaos Engineering',
    icon: 'zap',
    color: '#f97316',
    questions: 5,
    description: 'Deliberately injecting failures into production-like systems to uncover weaknesses before they cause outages.',
    visualizations: [],
    introduction: `## Overview
Chaos Engineering is the practice of deliberately introducing failures into a system to build confidence in its ability to withstand turbulent conditions. Pioneered by Netflix with Chaos Monkey in 2011, the discipline has evolved into a rigorous experimental science: form a hypothesis about steady-state behavior, run a controlled experiment, observe deviations, and fix weaknesses before incidents find them first.

The core insight is that distributed systems fail in unexpected ways. You cannot reason about resilience from architecture diagrams alone — you must observe the system under stress. A 30-minute planned game day that kills a pod is infinitely preferable to an unplanned 3 AM outage that kills revenue.

Chaos experiments follow a scientific method: (1) define the steady-state metric (requests per second, error rate, p99 latency); (2) hypothesize that the steady state continues during the failure; (3) inject the failure (kill a pod, add network latency, exhaust memory); (4) observe whether the hypothesis holds; (5) improve the system if it does not. Always have an abort condition defined before starting.

Blast radius control is the key engineering discipline: start with a single container in a dev namespace, expand to staging, then to a small percentage of production traffic. Never inject failures into a degraded system — chaos experiments run on healthy systems to find latent weaknesses, not to compound existing problems.

Common failure primitives: process kills (pod/VM termination), network failures (latency, packet loss, blackholes, DNS failures), resource exhaustion (CPU saturation, memory pressure, disk fill), clock skew, and dependency outages (external API unavailability). Tools like Chaos Monkey, Litmus Chaos, Chaos Mesh, Gremlin, and AWS Fault Injection Simulator automate injection at different layers.

GameDays are structured team exercises — an SRE or chaos team coordinates injecting a realistic failure scenario (e.g., "one AZ goes dark") while the on-call team responds as if it were a real incident. GameDays build muscle memory, surface runbook gaps, and improve alert quality before a real event.`,
    whenToUse: [
      'Validating that circuit breakers, retries, and fallbacks work as designed under real failure',
      'Preparing for a major product launch by stress-testing dependencies',
      'Building confidence before migrating a stateful system to a new region',
      'Improving on-call readiness by running GameDay exercises with realistic failure scenarios',
      'Interview questions about how you ensure high availability beyond architecture diagrams',
    ],
    keyConcepts: [
      { term: 'Steady-state hypothesis', definition: 'A measurable, quantified description of normal system behavior (e.g., "error rate < 0.1%, p99 < 200ms"). A chaos experiment validates that this hypothesis holds during the injected failure.' },
      { term: 'Blast radius', definition: 'The scope of impact of a chaos experiment. Start small (one pod, one AZ) and expand only after confirming the system handles the smaller failure correctly.' },
      { term: 'Chaos Monkey', definition: 'Netflix open-source tool that randomly terminates VM instances in production during business hours, forcing engineers to design for instance failure from day one.' },
      { term: 'Litmus Chaos', definition: 'CNCF-incubating Kubernetes-native chaos framework. Provides ChaosExperiment and ChaosEngine CRDs. Runs experiments as Kubernetes Jobs with built-in observability.' },
      { term: 'GameDay', definition: 'A structured, pre-announced failure injection exercise where a team deliberately breaks a system while on-call engineers respond, revealing runbook gaps and alert quality issues.' },
      { term: 'Fault injection', definition: 'Programmatically introducing a specific failure (latency, packet loss, error code) into a request path. Service meshes (Istio, Linkerd) support HTTP fault injection natively via traffic management rules.' },
    ],
    approach: [
      'Define the steady-state metric first — if you cannot measure normal behavior, you cannot detect deviation',
      'Start in a non-production environment and prove the experiment is safe before running in prod',
      'Document the abort condition before starting — what signals mean "stop immediately"',
      'Expand blast radius incrementally: single pod → node → AZ → region',
      'Run experiments during business hours when your best engineers are online, not at 2 AM',
      'Automate recurring experiments in CI/CD to prevent resilience regressions',
    ],
    pitfalls: [
      'Running chaos without steady-state metrics — you cannot tell if the experiment impacted anything',
      'Starting with a large blast radius (regional failure) before validating smaller failures work',
      'Chaos without informed consent — production chaos must be approved by stakeholders and ops teams',
      'Running chaos on an already-degraded system — experiments compound real problems',
      'Fixing symptoms instead of root causes — if circuit breaker saves you, investigate why the downstream failed',
    ],
    keyQuestions: [
      {
        question: 'How would you design a chaos engineering program from scratch at a company with no existing practice?',
        answer: `Start with culture, not tools. Chaos engineering requires executive buy-in and team alignment that breaking things intentionally is how you prevent unintentional breaks.

Phase 1 — Baseline observability: You cannot run chaos without knowing what "normal" looks like. Define steady-state metrics for your critical services: error rate, latency p99, throughput. Make sure your monitoring actually reflects these.

Phase 2 — Start non-production: Run your first experiments in staging. Kill a pod. Does the load balancer reroute? Does the circuit breaker open? Fix what fails before touching production.

Phase 3 — Production, small blast radius: Begin with non-critical services. Inject a single pod kill during business hours. Have an abort condition defined: if error rate crosses 1%, roll back immediately.

Phase 4 — GameDays: Schedule a quarterly GameDay. Announce it in advance ("Next Thursday at 2 PM we will simulate an AZ failure"). On-call team responds as if real. Debrief with a blameless post-mortem.

Phase 5 — Automate in CI: Add chaos experiments to your deployment pipeline. Every deployment to production runs a 5-minute chaos soak: pod kill, 100ms network latency. Fail the deployment if steady-state deviates.

Success metrics: number of weaknesses discovered via chaos vs discovered via real incidents. Over time this ratio should shift toward proactive discovery.`,
      },
      {
        question: 'What is the difference between chaos engineering and load testing?',
        answer: `Load testing validates performance under expected or peak traffic volume — it asks "does the system handle N requests per second?" It increases a known dimension (request rate) and measures degradation.

Chaos engineering validates resilience under unexpected failure conditions — it asks "does the system behave correctly when component X fails?" It injects unknown failure modes and measures whether steady-state is maintained.

Load testing is deterministic: ramp up RPS, observe latency, find saturation point. Chaos engineering is experimental: form a hypothesis, inject a failure, observe deviation, learn.

They are complementary. Load testing tells you where your capacity ceiling is. Chaos engineering tells you what happens when a node dies at 80% of that ceiling. You need both. A system can pass load testing and completely fail at chaos engineering (no retries, no circuit breakers, no fallbacks).`,
      },
    ],
    quickFire: [
      { q: 'What company pioneered chaos engineering?', a: 'Netflix, with Chaos Monkey in 2011, which randomly terminated EC2 instances in production.' },
      { q: 'What is a steady-state hypothesis?', a: 'A measurable description of normal system behavior that the chaos experiment hypothesizes will hold during failure injection.' },
      { q: 'Name three CNCF chaos tools.', a: 'Litmus Chaos (incubating), Chaos Mesh, and Chaosblade. AWS Fault Injection Simulator is cloud-managed but not CNCF.' },
      { q: 'What is blast radius in chaos engineering?', a: 'The scope of impact — how many users, services, or instances are affected by the experiment. Always start small and expand.' },
      { q: 'How does Istio support fault injection?', a: 'Via VirtualService resources: httpFault.delay injects latency; httpFault.abort returns error codes. Applies to a percentage of matching requests.' },
      { q: 'What is a GameDay?', a: 'A scheduled, announced chaos exercise where engineers inject a realistic failure while on-call responds, revealing runbook gaps and alert quality issues.' },
      { q: 'What is the difference between chaos engineering and penetration testing?', a: 'Chaos engineering tests resilience to infrastructure and dependency failures. Penetration testing tests security vulnerabilities. Both are proactive, but different threat models.' },
    ],
    references: [
      'https://principlesofchaos.org/',
      'https://litmuschaos.io/',
      'https://chaos-mesh.org/',
      'https://aws.amazon.com/fis/',
    ],
  },

  // ── FinOps / Cloud Cost Engineering ──────────────────────────────
  {
    id: 'finops-cloud-cost',
    title: 'FinOps & Cloud Cost Engineering',
    icon: 'dollarSign',
    color: '#10b981',
    questions: 5,
    description: 'The practice of bringing financial accountability to the variable spend model of cloud computing through cross-functional collaboration.',
    visualizations: [],
    introduction: `## Overview
FinOps (Financial Operations) is a cloud financial management discipline that brings together engineering, finance, and product teams to make data-driven spending decisions. As cloud bills scale from thousands to millions of dollars per month, unmanaged cloud cost becomes a critical engineering problem — not just a finance problem.

The FinOps Foundation defines three phases: Inform (understand what you're spending and why), Optimize (eliminate waste and right-size resources), and Operate (continuous cost governance embedded in engineering workflow). Most organizations loop through these phases iteratively rather than completing them sequentially.

Cost visibility is the foundation. Without tagging — consistent resource tags like team, environment, service, cost-center — cloud bills are opaque. The first engineering action is to enforce tag policies at provisioning time (via Terraform required_tags, AWS SCPs, or Azure Policy) and build a cost allocation dashboard by service and team.

The three pillars of cloud cost optimization: (1) Eliminate waste — stop idle resources (forgotten dev instances, orphaned snapshots, zero-traffic load balancers); (2) Right-size — match instance type to actual CPU/memory utilization (move a consistently-30%-utilized m5.2xlarge to an m5.large); (3) Commitment-based discounts — Reserved Instances (RI) and Savings Plans on AWS, Committed Use Discounts on GCP give 30-72% discount for 1-3 year commitments on baseline workload.

Unit economics translate cloud cost into business metrics engineers can optimize against: cost per API request, cost per user, cost per inference call. Unit cost makes abstract bills concrete — a 2x inference cost increase shows immediately in $/query even if total bill doesn't spike yet because traffic is low.

FinOps tooling: AWS Cost Explorer, Cost and Usage Report (CUR) + Athena for raw billing analysis, CloudHealth, Kubecost (Kubernetes-native cost allocation), Infracost (CI integration — shows cost diff per Terraform PR), and OpenCost (CNCF project for Kubernetes cost monitoring).`,
    whenToUse: [
      'Engineering interview questions about managing cloud cost at scale',
      'Designing cost allocation and chargeback systems for platform teams',
      'Evaluating which workloads should use Spot/Preemptible vs On-Demand instances',
      'Building cost guardrails into CI/CD pipelines via Infracost',
      'Explaining trade-offs between Reserved Instances vs Savings Plans',
    ],
    keyConcepts: [
      { term: 'FinOps Foundation phases', definition: 'Inform (visibility), Optimize (waste elimination + right-sizing + commitments), Operate (embed cost governance in engineering workflow). Iterative, not sequential.' },
      { term: 'Reserved Instances (RI)', definition: 'AWS commitment to use a specific instance type in a region for 1 or 3 years, yielding up to 72% savings vs On-Demand. Convertible RIs allow instance family changes. Zonal RIs provide capacity reservation.' },
      { term: 'Savings Plans', definition: 'AWS flexible commitment to spend $/hour (compute or EC2) for 1 or 3 years. Applies across instance families, sizes, OS, and regions automatically. Simpler than RIs for mixed workloads.' },
      { term: 'Spot/Preemptible instances', definition: 'AWS Spot Instances / GCP Preemptible VMs: spare cloud capacity sold at 70-90% discount. Can be reclaimed with 2-minute notice. Suitable for fault-tolerant batch, CI runners, and ML training with checkpointing.' },
      { term: 'Unit economics', definition: 'Cost per unit of business value: cost per API call, per user, per inference, per GB processed. Makes aggregate cloud spend actionable for engineers.' },
      { term: 'Kubecost / OpenCost', definition: 'Tools that break Kubernetes costs down to namespace, deployment, and pod level by allocating node cost proportionally to CPU/memory requests. OpenCost is the CNCF-incubating open standard.' },
    ],
    approach: [
      'Enforce tagging at provisioning time — use Terraform required_tags or cloud policy; retroactive tagging never gets done',
      'Build a cost anomaly alert: if any service spends >150% of its 7-day average in a single day, page the team',
      'Right-size first, then commit: analyze 2 weeks of utilization before buying RIs or Savings Plans',
      'Move CI/CD runners and batch jobs to Spot Instances — these workloads are purpose-built for interruption tolerance',
      'Review orphaned resources monthly: unattached EBS volumes, idle load balancers, forgotten dev RDS instances',
      'Add Infracost to PR pipelines: show cost delta for every Terraform change before merge',
    ],
    pitfalls: [
      'Buying Reserved Instances before right-sizing — committing to the wrong (too large) instance type',
      'Tagging enforcement after the fact — teams resist retroactive tagging; enforce at creation time via policy',
      'Optimizing for cost in dev environments while ignoring production — cost waste lives in prod, not dev',
      'Using Savings Plans to cover Spot usage — Savings Plans apply only to On-Demand; Spot is already discounted',
      'Treating cloud cost as finance team\'s problem — cost awareness must be embedded in engineering workflow',
    ],
    keyQuestions: [
      {
        question: 'How do you reduce Kubernetes cloud costs without sacrificing reliability?',
        answer: `Kubernetes cost optimization has three levers: waste elimination, right-sizing, and commitment discounts — applied in that order.

1. Eliminate waste first: Find over-provisioned namespaces with Kubecost. Look for deployments with zero traffic in non-prod — delete or scale to zero. Enable cluster autoscaler to remove idle nodes automatically. Use VPA in recommendation mode to surface right-sizing opportunities without auto-applying.

2. Right-size workloads: Compare resource requests to actual utilization. A deployment requesting 4 CPU / 8GB but using 0.5 CPU / 1GB is wasting node capacity. Set requests at p95 actual utilization, not at peak theoretical. Avoid setting requests = limits (that prevents burstable scheduling).

3. Spot/Preemptible node pools: Run stateless workloads (web servers, API replicas, batch jobs) on Spot node groups. Use Pod Disruption Budgets and multiple replicas to tolerate interruption. On AWS, use diversified instance types in the Spot fleet to reduce simultaneous reclamation risk.

4. Commitment discounts: After 2-3 months of stable right-sized utilization data, purchase Savings Plans for the baseline load. Never commit before you have utilization data.

5. Namespace cost allocation: Assign costs to teams via Kubecost labels. Engineers who see their team's bill act differently than engineers who see an aggregate org bill.

Result: typically 30-50% cost reduction in 60-90 days through these levers alone.`,
      },
      {
        question: 'What is the difference between Reserved Instances and Savings Plans on AWS?',
        answer: `Reserved Instances (RIs) are commitments to a specific EC2 instance configuration: instance type, region, tenancy, and optionally AZ. Standard RIs give the highest discount (up to 72%) but are inflexible — you're locked to a family and size. Convertible RIs allow you to exchange to different instance families, sizes, or OS but give a lower discount (~54%). Zonal RIs additionally reserve capacity in a specific AZ.

Savings Plans are a newer, more flexible commitment model. You commit to spending a specific $/hour amount (e.g., $10/hour) for 1 or 3 years. Compute Savings Plans apply automatically to any EC2 usage regardless of family, size, region, or OS, and also cover Fargate and Lambda. EC2 Instance Savings Plans are restricted to a specific instance family in a region but give higher discounts.

When to use which:
— Large fleet, homogeneous instance types (e.g., all m5.xlarge): Standard RIs give max savings.
— Mixed instance families, frequent right-sizing: Compute Savings Plans — flexibility beats the small discount advantage of RIs.
— Fargate or Lambda workloads: Compute Savings Plans only (RIs don't apply).
— New workload, unknown utilization: neither — buy after 2-3 months of data.

The key mental model: RIs are "I commit to a specific SKU," Savings Plans are "I commit to a spend rate."`,
      },
    ],
    quickFire: [
      { q: 'What are the three FinOps phases?', a: 'Inform (visibility), Optimize (waste + right-size + commitments), Operate (embed cost governance in engineering workflow).' },
      { q: 'What is the typical discount for a 1-year Savings Plan vs On-Demand?', a: 'Approximately 30-40% for Compute Savings Plans; up to 72% for 3-year standard Reserved Instances.' },
      { q: 'What is Kubecost?', a: 'A Kubernetes cost monitoring tool that allocates cluster costs to namespaces, deployments, and pods based on resource requests and actual node pricing.' },
      { q: 'What is OpenCost?', a: 'CNCF-incubating open specification and implementation for real-time cost monitoring of Kubernetes workloads. The open standard underlying Kubecost.' },
      { q: 'What is Infracost?', a: 'A CLI and CI/CD integration that shows the cloud cost impact of Terraform changes in pull request comments before merge.' },
      { q: 'When should you NOT buy Reserved Instances?', a: 'Before right-sizing — you risk committing to the wrong instance type. Buy only after 2-3 months of stable, right-sized utilization data.' },
      { q: 'What workloads are best suited for Spot Instances?', a: 'Stateless, fault-tolerant workloads: CI runners, batch processing, ML training with checkpointing, stateless web servers with multiple replicas.' },
    ],
    references: [
      'https://www.finops.org/introduction/what-is-finops/',
      'https://www.opencost.io/',
      'https://www.kubecost.com/',
      'https://www.infracost.io/',
    ],
  },

  // ── Developer Productivity — SPACE Framework ──────────────────────
  {
    id: 'developer-productivity-space',
    title: 'Developer Productivity — SPACE Framework',
    icon: 'users',
    color: '#8b5cf6',
    questions: 5,
    description: 'The SPACE framework for measuring developer productivity across Satisfaction, Performance, Activity, Communication, and Efficiency — beyond DORA metrics.',
    visualizations: [],
    introduction: `## Overview
Developer productivity is one of the most debated topics in engineering leadership. For decades, organizations tried to measure it with lines of code or tickets closed — proxies that incentivize the wrong behaviors. The SPACE framework (2021, from Microsoft Research and GitHub) provides a multidimensional model that captures the full complexity of productive developer work.

SPACE stands for: Satisfaction and well-being, Performance, Activity, Communication and collaboration, and Efficiency and flow. The critical insight is that no single dimension captures productivity — you need at least three dimensions from different parts of the framework to avoid perverse incentives.

Satisfaction and well-being: developer job satisfaction, burnout risk, perceived productivity. Measured via surveys (quarterly pulse checks, Net Promoter Score for developers). Low satisfaction predicts attrition before performance metrics drop. Engineers who feel productive are more productive.

Performance: outcomes, not output. Does the software do what it's supposed to? Quality metrics (reliability, change failure rate from DORA), customer satisfaction with the feature. Performance is the hardest dimension to measure at the individual level — at team level it's more tractable.

Activity: the volume of engineering actions — commits, PRs, code reviews, deployments, incident responses. Activity is easy to measure but dangerous in isolation (gaming, Goodhart's Law). Valid when correlated with the other four dimensions.

Communication and collaboration: how well engineers work together. Code review turnaround time, PR comment quality, meeting load, documentation contributions. Measured via collaboration analytics and team surveys.

Efficiency and flow: minimal interruptions, work that flows without context switches. Measured by uninterrupted coding time (calendar analysis), deployment frequency, number of PRs requiring re-review. High interrupt load is the most predictable cause of perceived low productivity.

DORA metrics (deployment frequency, lead time, change failure rate, MTTR) fit within the Performance and Efficiency dimensions of SPACE. DORA measures the delivery pipeline; SPACE measures the whole developer experience including the human dimensions DORA ignores.`,
    whenToUse: [
      'Designing engineering productivity programs or platform engineering success metrics',
      'Interview questions about how to measure developer productivity without using lines of code',
      'Explaining why DORA metrics alone are insufficient for understanding team health',
      'Evaluating developer tooling investments (IDE plugins, CI speed, local dev environments)',
      'Presenting engineering metrics to non-technical leadership in a meaningful way',
    ],
    keyConcepts: [
      { term: 'SPACE dimensions', definition: 'Satisfaction & well-being, Performance, Activity, Communication & collaboration, Efficiency & flow. Use at least 3 dimensions together; single-dimension measurement causes gaming.' },
      { term: 'Goodhart\'s Law', definition: '"When a measure becomes a target, it ceases to be a good measure." Applies directly to developer productivity — measuring commit count causes commit flooding; measuring ticket velocity causes ticket splitting.' },
      { term: 'Flow state / uninterrupted time', definition: 'Blocks of focused coding time without meetings or Slack interruptions. Studies show context switches from flow cost 15-20 minutes of recovery. Efficiency dimension of SPACE.' },
      { term: 'DORA metrics', definition: 'Deployment Frequency, Lead Time for Changes, Change Failure Rate, Mean Time to Restore. Measures delivery pipeline health; fits within the Performance and Efficiency dimensions of SPACE.' },
      { term: 'Developer NPS (dNPS)', definition: 'Net Promoter Score adapted for internal developer tools: "How likely are you to recommend this tool to a colleague?" Rapid pulse measure of tool satisfaction.' },
      { term: 'Cognitive load', definition: 'Team Topologies concept — the mental effort required to understand and operate a system. High cognitive load from internal platforms is the primary cause of low developer efficiency.' },
    ],
    approach: [
      'Pick 2-3 metrics from different SPACE dimensions — never optimize a single dimension',
      'Combine quantitative (DORA, PR cycle time) with qualitative (developer surveys) — each exposes what the other hides',
      'Survey developers quarterly on satisfaction, perceived productivity, and friction points',
      'Measure PR cycle time (open → merge) and code review wait time — these directly impact flow',
      'Audit calendar data for uninterrupted coding blocks — less than 2 hours/day of focus time is a productivity crisis',
      'Report metrics at team level, not individual — individual productivity metrics destroy psychological safety',
    ],
    pitfalls: [
      'Measuring only Activity (commits, PRs, tickets) — trivially gamed and doesn\'t reflect value delivered',
      'Using individual-level productivity metrics for performance reviews — causes gaming and destroys trust',
      'Treating DORA as the complete picture — DORA misses satisfaction, collaboration, and cognitive load',
      'Ignoring well-being until attrition spikes — satisfaction metrics predict attrition months before it appears',
      'Survey fatigue — quarterly pulse > monthly survey; long surveys get low response rates and noisy data',
    ],
    keyQuestions: [
      {
        question: 'How do you measure developer productivity without using lines of code or ticket counts?',
        answer: `Lines of code and ticket counts are activity metrics — they measure volume, not value, and are trivially gamed. The right approach uses the SPACE framework to combine multiple complementary dimensions.

Concrete metrics I would track:

Efficiency and flow: PR cycle time (time from PR open to merge). Uninterrupted focus blocks (calendar analysis — how many 2-hour windows per week does each engineer have without meetings). CI feedback time (time from push to test result). Fast feedback is the most direct input to flow.

Performance: Change failure rate (percentage of deployments causing incidents). Feature adoption rate (do users actually use what was shipped?). These measure outcomes, not output.

Satisfaction: Quarterly developer pulse survey (5 questions, NPS for internal tools, one open-ended). Net Promoter Score for your internal developer platform. Turnover intent (single question: "Do you plan to stay at this company for the next 12 months?").

Communication: Code review turnaround time (time from PR creation to first review comment). Onboarding time for new engineers to first production deployment.

The key discipline: never report a single metric in isolation. Always show at least three dimensions together. A team with high deployment frequency (good Performance) but low satisfaction (bad Satisfaction) and high oncall interrupt load (bad Efficiency) is burning out.`,
      },
    ],
    quickFire: [
      { q: 'What does SPACE stand for?', a: 'Satisfaction & well-being, Performance, Activity, Communication & collaboration, Efficiency & flow.' },
      { q: 'Why should you use at least 3 SPACE dimensions together?', a: 'Single-dimension metrics are easily gamed (Goodhart\'s Law). Multiple dimensions from different quadrants create a system that\'s harder to optimize in isolation.' },
      { q: 'Where do DORA metrics fit in SPACE?', a: 'Primarily in Performance (change failure rate, MTTR) and Efficiency (deployment frequency, lead time).' },
      { q: 'What is cognitive load in the context of developer productivity?', a: 'The mental effort required to understand and operate a system. High cognitive load from internal platforms is the primary cause of low developer efficiency (Team Topologies concept).' },
      { q: 'What does developer NPS measure?', a: 'How likely developers are to recommend an internal tool to a colleague — a rapid pulse measure of tool satisfaction in the Satisfaction dimension.' },
      { q: 'What is Goodhart\'s Law?', a: 'When a measure becomes a target, it ceases to be a good measure. The core risk of single-dimension developer productivity metrics.' },
    ],
    references: [
      'https://queue.acm.org/detail.cfm?id=3454124',
      'https://dora.dev/research/',
      'https://itrevolution.com/articles/space-framework/',
    ],
  },

  // ── Sigstore Supply Chain Security ────────────────────────────────
  {
    id: 'sigstore-supply-chain-security',
    title: 'Sigstore & Software Supply Chain Security',
    icon: 'shield',
    color: '#ef4444',
    questions: 5,
    description: 'Signing, verifying, and attesting software artifacts using Sigstore (Cosign, Fulcio, Rekor), SBOM, and SLSA to secure the software supply chain.',
    visualizations: [],
    introduction: `## Overview
The software supply chain — every tool, dependency, build step, and artifact that contributes to your production software — is a major attack surface. The SolarWinds breach (2020), Log4Shell (2021), and XZ Utils backdoor (2024) demonstrated that attackers increasingly target the build and distribution process rather than the running application.

Sigstore is an open-source project (OpenSSF, Linux Foundation) that makes cryptographic signing of software artifacts free and accessible. The three components work together: Cosign signs container images and arbitrary blobs; Fulcio is a certificate authority that issues short-lived signing certificates tied to OIDC identity (your GitHub, Google, or Microsoft identity); Rekor is an immutable, append-only transparency log that records all signing events publicly.

The key innovation is keyless signing. Traditional artifact signing required long-lived private keys to be generated, stored securely, and rotated — complex key management that most teams never did. Sigstore's keyless flow: (1) authenticate to your OIDC provider (GitHub Actions, Google, Microsoft); (2) Fulcio issues a certificate valid for only 10 minutes, tied to your OIDC identity; (3) Cosign signs the artifact using that ephemeral certificate; (4) the signing event is recorded in Rekor. Verifiers check Rekor to confirm the signature was made by a certificate issued to the expected identity, at a timestamp matching the pipeline.

SBOM (Software Bill of Materials) is a machine-readable inventory of every component in a software artifact: packages, versions, licenses, and provenance. SPDX and CycloneDX are the two dominant formats. SBOM enables rapid impact assessment when a vulnerability is disclosed — query the SBOM to know which services depend on the affected component.

SLSA (Supply-chain Levels for Software Artifacts, pronounced "salsa") is a security framework defining four levels of supply chain integrity: L1 (provenance exists), L2 (provenance is signed and hosted by CI), L3 (hardened CI — no manual inputs, signed provenance from a trusted builder), L4 (hermetic, reproducible builds). Most organizations target L2 as the first meaningful milestone.

In-toto attestations are the glue: structured statements signed by a trusted party that assert facts about the build ("this container was built from this Git commit by this pipeline"). SLSA provenance is a specific in-toto attestation schema.`,
    whenToUse: [
      'Designing secure CI/CD pipelines for containers deployed to production Kubernetes',
      'Implementing image signing policies in Kubernetes via admission controllers',
      'Responding to supply chain vulnerability incidents with SBOM-based impact analysis',
      'Interview questions about securing the software supply chain beyond SAST/DAST',
      'Meeting compliance requirements (FedRAMP, NIST SP 800-218) for software provenance',
    ],
    keyConcepts: [
      { term: 'Cosign', definition: 'Sigstore tool for signing and verifying container images and other artifacts. Supports keyless signing via Fulcio and traditional key-based signing. "cosign sign" / "cosign verify" are the primary commands.' },
      { term: 'Fulcio', definition: 'Sigstore certificate authority. Issues short-lived (10-minute) X.509 certificates tied to OIDC identity. Eliminates long-lived key management by making certificates ephemeral and identity-bound.' },
      { term: 'Rekor', definition: 'Sigstore\'s immutable, append-only transparency log. Records all signing events publicly. Verifiers check Rekor to confirm a signature was made at the expected time by the expected identity.' },
      { term: 'Keyless signing', definition: 'Signing artifacts without managing long-lived private keys. Uses OIDC identity (GitHub Actions, Google) to obtain a short-lived certificate from Fulcio. The certificate proves who signed and when.' },
      { term: 'SBOM (Software Bill of Materials)', definition: 'Machine-readable inventory of all components in a software artifact. SPDX and CycloneDX are the dominant formats. Required by US Executive Order 14028 for federal software vendors.' },
      { term: 'SLSA levels', definition: 'L1: provenance exists. L2: signed provenance from CI. L3: hardened CI with no manual inputs. L4: hermetic reproducible builds. Most teams target L2 as the first meaningful goal.' },
    ],
    approach: [
      'Sign all container images at build time in CI using Cosign keyless signing with GitHub Actions OIDC',
      'Enforce image signature verification in Kubernetes via Kyverno or OPA/Gatekeeper policy — reject unsigned images',
      'Generate SBOM for every container build using Syft (Anchore) or Docker BuildKit --sbom flag; attach to image',
      'Store SBOM as an OCI artifact alongside the image in your registry (Cosign can attach it)',
      'Scan SBOMs against vulnerability databases (Grype) as part of the CI pipeline gate',
      'Target SLSA L2: CI-generated, signed provenance for all production builds within 6 months',
    ],
    pitfalls: [
      'Signing images but not enforcing verification at admission time — signing without policy enforcement is theater',
      'Generating SBOMs but not using them for vulnerability response — SBOM value is in the query time, not generation time',
      'Conflating SBOM and SLSA — SBOM lists what\'s in the artifact; SLSA attests how the artifact was built',
      'Using long-lived Cosign key pairs without rotation — defeats the purpose; prefer keyless signing',
      'Ignoring transitive dependencies in SBOM — vulnerabilities in transitive deps are the most common blind spot',
    ],
    keyQuestions: [
      {
        question: 'How does Sigstore\'s keyless signing work, and why is it better than traditional key-based signing?',
        answer: `Traditional code signing requires a long-lived private key: generate it, store it securely (HSM or secrets manager), protect it from leakage, rotate it periodically. Most teams skip signing entirely because key management is complex and risky.

Sigstore keyless signing replaces the long-lived key with a short-lived certificate bound to an OIDC identity:

Step-by-step:
1. The CI pipeline (e.g., GitHub Actions) runs. It requests an OIDC token from the identity provider (GitHub in this case) — a JWT proving "this job is running in repo X, triggered by commit Y, on branch Z."

2. The pipeline sends this OIDC token to Fulcio (Sigstore's CA). Fulcio validates the token, then issues a short-lived X.509 certificate valid for only 10 minutes. The certificate's Subject Alternative Name encodes the OIDC identity (e.g., the GitHub Actions workflow URI).

3. Cosign uses this ephemeral certificate to sign the container image. The certificate's short lifetime means there's no long-lived private key to protect — it expires before an attacker could meaningfully misuse it.

4. The signing event (certificate, artifact digest, timestamp) is recorded in Rekor, the public transparency log.

Verification: a verifier runs "cosign verify --certificate-identity WORKFLOW_URI --certificate-oidc-issuer https://token.actions.githubusercontent.com IMAGE". Cosign fetches the entry from Rekor, verifies the certificate chain to Fulcio's root CA, confirms the OIDC identity matches expectations, and confirms the signature is valid.

Why it's better: no key management, no key rotation, no key leakage risk. The identity of the signer (which GitHub Actions workflow, which repo, which commit) is embedded in the certificate and publicly auditable in Rekor.`,
      },
    ],
    quickFire: [
      { q: 'What are the three Sigstore components?', a: 'Cosign (signing/verification tool), Fulcio (OIDC-based certificate authority), Rekor (immutable transparency log).' },
      { q: 'What is an SBOM?', a: 'Software Bill of Materials — a machine-readable inventory of all components, packages, versions, and licenses in a software artifact. SPDX and CycloneDX are the dominant formats.' },
      { q: 'What does SLSA L2 require?', a: 'Signed provenance generated by a CI system — proves the artifact was built by CI from the stated source, and the provenance cannot be forged by developers.' },
      { q: 'How long are Fulcio certificates valid?', a: '10 minutes. Short lifetime eliminates the key management problem — the certificate expires before it can be meaningfully misused.' },
      { q: 'What Kubernetes admission controller enforces image signing policies?', a: 'Kyverno (native Kubernetes, CNCF) or OPA/Gatekeeper (Rego policies). Both can reject images that lack a valid Cosign signature from a trusted signer.' },
      { q: 'What is the difference between SBOM and SLSA?', a: 'SBOM lists what\'s in the artifact (components, versions). SLSA attests how the artifact was built (which CI system, which source commit, which build steps). Complementary, not competing.' },
      { q: 'Name a tool to generate SBOMs from container images.', a: 'Syft (Anchore open-source) — generates SBOM in SPDX or CycloneDX format from container images, filesystems, or source directories.' },
    ],
    references: [
      'https://www.sigstore.dev/',
      'https://slsa.dev/',
      'https://spdx.dev/',
      'https://github.com/anchore/syft',
    ],
  },

  // ── WebAssembly in Cloud Native ───────────────────────────────────
  {
    id: 'webassembly-cloud-native',
    title: 'WebAssembly (Wasm) in Cloud Native',
    icon: 'cpu',
    color: '#6366f1',
    questions: 5,
    description: 'Running WebAssembly workloads on Kubernetes and serverless platforms for near-native performance, instant cold starts, and sandboxed multi-tenancy.',
    visualizations: [],
    introduction: `## Overview
WebAssembly (Wasm) was designed for the browser but its properties — compact binary format, near-native execution speed, sandboxed security model, and language agnosticism — make it increasingly attractive for server-side and cloud-native workloads.

WASI (WebAssembly System Interface) is the key enabler for server-side Wasm. It provides a standardized, capability-based interface to OS resources (file system, networking, clocks) without exposing the underlying OS directly. A Wasm module compiled for WASI runs on any runtime that implements the interface — portability that even containers don't fully achieve (containers are Linux-specific).

The cloud-native Wasm runtime landscape: Wasmtime (Bytecode Alliance, used by Fastly and AWS Lambda), WasmEdge (CNCF sandbox, CNCF-incubating, optimized for edge and cloud), Spin (Fermyon's application framework built on Wasmtime), and WASM-Workers-Server. The OCI working group is standardizing Wasm module distribution via OCI registries — a Wasm module can be pushed and pulled like a container image.

Three cloud-native use cases where Wasm excels over containers: (1) Near-instant cold starts — Wasm modules initialize in microseconds vs 100ms–1s for containers; critical for scale-to-zero serverless; (2) Multi-tenant sandboxing — each Wasm module runs in its own memory sandbox with no shared state; safer multi-tenancy than containers sharing a kernel; (3) Edge computing — tiny binary size (single-digit MB vs hundreds of MB for containers) makes Wasm ideal for CDN edge nodes (Fastly, Cloudflare Workers).

Kubernetes + Wasm integration via containerd shims: the crun runtime supports Wasm workloads, and the runwasi project provides containerd shims for Wasmtime and WasmEdge. A Pod can declare "runtimeClassName: wasmtime" and the Wasm binary runs directly as a container workload — no JVM, no interpreter, no full OS image.

Wasm is not a container replacement today. It lacks mature networking, persistent storage, and GPU access. The sweet spot is short-lived, stateless, latency-sensitive workloads: API middleware, plugin systems, edge inference, and policy enforcement (OPA uses Wasm for policy evaluation, Envoy uses Wasm for HTTP filter plugins).`,
    whenToUse: [
      'Evaluating Wasm vs containers for edge, serverless, or multi-tenant plugin architectures',
      'Interview questions about emerging cloud-native runtimes beyond Docker and containerd',
      'Understanding why Cloudflare Workers and Fastly Compute use Wasm instead of containers',
      'Designing plugin systems that need safe multi-tenant code execution (e.g., Envoy Wasm filters)',
      'Exploring scale-to-zero serverless patterns where container cold start latency is prohibitive',
    ],
    keyConcepts: [
      { term: 'WASI (WebAssembly System Interface)', definition: 'Capability-based API for Wasm modules to access OS resources (files, network, clocks) in a sandboxed, portable way. WASI Preview 2 (2024) introduces a component model for composable Wasm modules.' },
      { term: 'Wasmtime', definition: 'Bytecode Alliance Wasm runtime written in Rust. Used by Fastly Compute, AWS Lambda (Rust runtime uses Cranelift, Wasmtime\'s JIT). Reference implementation for WASI.' },
      { term: 'WasmEdge', definition: 'CNCF-incubating Wasm runtime optimized for cloud and edge. Supports WASI, Kubernetes via containerd shim, and has extensions for networking and AI/ML inference.' },
      { term: 'Spin (Fermyon)', definition: 'Framework for building serverless Wasm applications. Provides HTTP triggers, key-value storage, SQLite, and Redis bindings. Runs on Wasmtime; deployable to Kubernetes via SpinKube.' },
      { term: 'runwasi', definition: 'CNCF project providing containerd shims for Wasm runtimes. Enables Kubernetes to run Wasm workloads alongside container workloads using runtimeClassName in Pod specs.' },
      { term: 'Component model', definition: 'WASI Preview 2 feature: composable Wasm modules with typed interfaces (WIT — WebAssembly Interface Types). Enables building applications from independently-compiled, language-agnostic Wasm components.' },
    ],
    approach: [
      'Use Wasm for stateless, short-lived workloads (HTTP handlers, middleware, edge inference) — not long-running stateful services',
      'Evaluate SpinKube for running Spin applications on existing Kubernetes clusters via containerd shim',
      'For Envoy/WASM filters: use the proxy-wasm SDK (C++, Rust, Go, AssemblyScript) to write HTTP middleware as Wasm modules',
      'Distribute Wasm modules via OCI registries — same tooling as container images',
      'Use WasmEdge for multi-language support; Wasmtime for Rust-native performance-critical paths',
      'Test cold start latency vs container cold start for your target workload — measure first, optimize second',
    ],
    pitfalls: [
      'Expecting containers to be replaced by Wasm today — Wasm lacks mature networking, storage, and GPU access',
      'Ignoring WASI version compatibility — Preview 1 and Preview 2 have different APIs; most ecosystems are still on Preview 1',
      'Using Wasm for CPU-bound ML training — Wasm has no GPU access; containers + CUDA is the right stack',
      'Assuming all languages compile to Wasm equally — Rust and C compile cleanly; Go and Java have large runtime overhead; Python is impractical',
      'Deploying Wasm in production without understanding the runtime security model — Wasm sandbox is strong but not equivalent to VM isolation',
    ],
    keyQuestions: [
      {
        question: 'What advantages does WebAssembly offer over containers for edge and serverless computing?',
        answer: `Three concrete advantages where Wasm beats containers:

1. Cold start latency: Wasm modules initialize in microseconds (50–200µs). Containers, even with pre-pulled images, take 100ms–1s due to process creation, namespace setup, and application startup (JVM warm-up, etc.). For scale-to-zero serverless where every request might be a cold start, Wasm dramatically reduces tail latency. Cloudflare Workers advertise sub-millisecond cold starts for this reason.

2. Security isolation model: Each Wasm module runs in its own memory sandbox — memory is linear and bounded, the module cannot access anything outside its sandbox unless explicitly granted via WASI capabilities. Multiple tenants can run Wasm modules in the same process with strong isolation. Containers share a kernel and require namespaces, cgroups, and seccomp profiles to isolate; a kernel vulnerability can escape container isolation. The Wasm sandbox operates at the language runtime level, not the OS level.

3. Binary portability: A Wasm module compiled from Rust or C runs identically on x86, arm64, and RISC-V without recompilation — the runtime provides the CPU abstraction. Container images are Linux-specific (amd64 or arm64); you need separate image layers for each architecture. This matters at the CDN edge where hardware varies.

Where containers still win: stateful long-running services (databases, message queues), GPU-accelerated workloads, applications requiring network-level isolation, and workloads using languages that don't compile cleanly to Wasm (Python, Java JVM with large runtime).

The near-term model: Wasm for stateless edge handlers and plugin systems; containers for persistent services. Not either/or.`,
      },
    ],
    quickFire: [
      { q: 'What is WASI?', a: 'WebAssembly System Interface — a capability-based API standard for Wasm modules to access OS resources (files, network) portably and securely without exposing the underlying OS.' },
      { q: 'What is the cold start advantage of Wasm over containers?', a: 'Wasm modules initialize in microseconds (50–200µs). Containers take 100ms–1s. Critical for scale-to-zero serverless workloads.' },
      { q: 'Name two CNCF Wasm projects.', a: 'WasmEdge (CNCF incubating runtime) and runwasi (containerd shims for Wasm runtimes).' },
      { q: 'What is Spin by Fermyon?', a: 'A framework for building serverless Wasm microservices. Runs on Wasmtime with HTTP triggers, key-value storage, and SQLite bindings. Deployable to Kubernetes via SpinKube.' },
      { q: 'How does OPA use WebAssembly?', a: 'OPA compiles Rego policies to Wasm for high-performance policy evaluation in Envoy sidecars and other latency-sensitive environments.' },
      { q: 'Which languages compile best to WebAssembly?', a: 'Rust and C/C++ compile cleanly with minimal overhead. Go compiles but has larger binary size. Python and Java have significant runtime overhead making them impractical.' },
    ],
    references: [
      'https://wasi.dev/',
      'https://wasmtime.dev/',
      'https://wasmedge.org/',
      'https://www.fermyon.com/spin',
      'https://github.com/containerd/runwasi',
    ],
  },

  // ── AI-Augmented DevOps ───────────────────────────────────────────
  {
    id: 'ai-augmented-devops',
    title: 'AI-Augmented DevOps',
    icon: 'cpu',
    color: '#0ea5e9',
    questions: 5,
    description: 'Using large language models and ML to accelerate DevOps workflows: AI code review, intelligent incident response, predictive CI, and AIOps patterns.',
    visualizations: [],
    introduction: `## Overview
AI is being integrated into every layer of the DevOps toolchain — not to replace engineers, but to handle the low-signal, high-volume tasks that consume disproportionate attention. The categories where AI adds measurable value today are code review assistance, incident response acceleration, test generation, and build failure diagnosis.

AI code review tools (GitHub Copilot Code Review, CodeRabbit, Sourcery) analyze pull requests and flag security vulnerabilities, logic errors, and style violations before a human reviewer sees the PR. Effectiveness data from GitHub shows that AI-assisted review reduces time-to-merge by 20-30% in teams that adopt it, primarily by eliminating trivial review cycles on automated findings. The critical design principle: AI review is a first-pass filter, not a replacement for human review of design decisions.

AIOps — applying ML to operations data — addresses the alert fatigue problem that plagues large systems. Raw alert volume in a 1000-node cluster can easily exceed human triage capacity. ML-based noise reduction (Moogsoft, BigPanda, Dynatrace Davis) correlates related alerts into incidents, identifies root cause patterns, and ranks by likely customer impact. The key metric is alert-to-incident ratio: reducing 1000 raw alerts to 50 actionable incidents.

Intelligent incident response uses LLMs to accelerate on-call diagnosis: surface relevant runbooks, recent related deployments, similar past incidents, and code changes in the blast radius. Tools like FireHydrant AI, PagerDuty's Copilot, and Slack-native bots augment human on-call with context retrieval that would take 10-15 manual minutes.

Predictive CI uses ML to prioritize test selection and predict build failure probability. Google pioneered this at scale — instead of running all 100,000 tests on every commit, ML models predict which tests are likely to fail given the changed files, running only the high-probability subset first. This reduces CI feedback time dramatically while maintaining coverage.

LLMOps is the emerging practice of treating LLM pipelines as software systems that require versioned prompts, evaluation frameworks, CI for prompt changes, A/B testing of model versions, and monitoring for drift and degradation.`,
    whenToUse: [
      'Evaluating AI tools for code review, incident management, or test optimization at your organization',
      'Interview questions about how AI is changing DevOps and SRE workflows',
      'Designing LLMOps pipelines: versioning prompts, evaluating model outputs, deploying LLM applications',
      'Understanding AIOps vs traditional alerting and when ML-based correlation adds value',
      'Explaining the risks and limitations of AI-augmented automation in production systems',
    ],
    keyConcepts: [
      { term: 'AIOps', definition: 'Application of ML to IT operations data to reduce alert noise, correlate related events into incidents, predict failures, and surface root causes. Not a product category — a practice. Key metric: alert-to-incident ratio reduction.' },
      { term: 'LLMOps', definition: 'MLOps practices applied to LLM-based applications: versioned prompts, systematic evaluation (evals), CI/CD for prompt and model changes, A/B testing, and monitoring for output drift.' },
      { term: 'Predictive test selection', definition: 'ML models that predict which tests are likely to fail given a set of changed files. Reduces CI time by running high-risk tests first without sacrificing coverage. Used at scale by Google and Meta.' },
      { term: 'AI code review', definition: 'LLM-powered analysis of pull request diffs to flag security issues, bugs, and style violations before human review. Tools: GitHub Copilot Code Review, CodeRabbit, Sourcery.' },
      { term: 'Evaluation (evals)', definition: 'Systematic testing of LLM outputs against a benchmark dataset. Analogous to unit tests for traditional software. Required before deploying prompt or model changes to production.' },
      { term: 'Prompt versioning', definition: 'Treating prompts as code artifacts with version control, peer review, and CI validation. Changes to production prompts go through the same review process as application code.' },
    ],
    approach: [
      'Start AI code review as a non-blocking advisory — AI flags issues, humans decide. Avoid auto-blocking on AI findings until you have calibrated its false-positive rate',
      'Build evals before deploying LLM features — define what "good output" looks like and automate measurement',
      'For AIOps: measure alert-to-incident ratio before and after ML correlation — clear ROI metric',
      'Treat prompts as code: version control, peer review, and eval gates before production deployment',
      'Use AI for incident context retrieval (surface runbooks, recent PRs) — high value, low risk',
      'Instrument LLM pipelines like any service: latency, error rate, token cost per request, output quality score',
    ],
    pitfalls: [
      'Auto-blocking CI on AI code review findings without calibrating false-positive rate — will block legitimate PRs',
      'Deploying LLM features without evals — no way to detect regressions when model or prompt changes',
      'Treating AIOps as a cost reduction tool — the value is reliability improvement (fewer missed incidents), not FTE reduction',
      'Using AI incident response without human verification — LLM-suggested root causes can be plausible but wrong; always verify before actioning',
      'Ignoring token cost in LLM pipelines — uncapped token usage can create runaway cloud costs',
    ],
    keyQuestions: [
      {
        question: 'How would you integrate AI into an existing DevOps pipeline without increasing risk?',
        answer: `The key principle is AI as advisory, not gatekeeping, until you have calibrated confidence data.

Code review: Start with an AI reviewer that posts comments but does not block merge. Run for 60 days. Measure: what percentage of AI findings are accepted vs dismissed by human reviewers? If acceptance rate is >60%, consider blocking on high-severity findings. If <40%, tune the prompts or switch tools.

CI/CD: Add AI-based build failure diagnosis that surfaces likely root cause and links to similar past failures. Non-blocking — engineers get context faster but CI is not dependent on AI response. This is pure upside with no risk.

Incident response: Deploy an AI Slack bot that surfaces runbooks, recent deployments, and related incidents automatically when a PagerDuty alert fires. Engineers still diagnose; AI saves the 10-minute context-gathering phase. Monitor whether MTTR improves.

Predictive test selection: Implement in shadow mode first — run all tests, but record which tests the ML model predicted would fail. After 1000 builds, measure precision/recall. Only activate test skipping after confirming the model has high recall (does not miss real failures).

What not to do: deploy AI auto-remediation (automated rollback, auto-scaling decisions) without extensive shadow mode testing and gradual rollout. AI errors in automated remediation can compound incidents rather than resolve them.

Governance: log all AI suggestions and their outcomes. Review monthly. This data is what justifies expanding AI scope (from advisory to enforcement) with evidence.`,
      },
    ],
    quickFire: [
      { q: 'What is AIOps?', a: 'Application of ML to IT operations to reduce alert noise, correlate related events into incidents, and surface root causes. Key metric: alert-to-incident ratio.' },
      { q: 'What is LLMOps?', a: 'MLOps practices for LLM applications: versioned prompts, evaluation frameworks, CI/CD for model/prompt changes, monitoring for output drift.' },
      { q: 'What are evals in LLM deployment?', a: 'Systematic tests of LLM outputs against a benchmark dataset — analogous to unit tests. Required before deploying prompt or model changes to production.' },
      { q: 'What is predictive test selection?', a: 'ML models that predict which tests are likely to fail given changed files, enabling CI to run high-risk tests first and reduce feedback time without sacrificing coverage.' },
      { q: 'Name two AIOps platforms.', a: 'Moogsoft and BigPanda (alert correlation); Dynatrace Davis (ML-driven incident detection). PagerDuty and OpsRamp also have AIOps capabilities.' },
      { q: 'What is the risk of AI auto-remediation in production?', a: 'AI errors in automated remediation can compound incidents. Deploy in shadow mode with human verification before enabling automatic actions.' },
    ],
    references: [
      'https://www.pagerduty.com/resources/learn/aiops/',
      'https://openai.com/research/scaling-laws',
      'https://github.blog/2024-04-09-how-to-build-an-enterprise-llm-application-lessons-from-github-copilot/',
    ],
  },

  // ── Dev Containers & Development Environments ──────────────────────
  {
    id: 'dev-containers-environments',
    title: 'Dev Containers & Reproducible Dev Environments',
    icon: 'terminal',
    color: '#059669',
    questions: 5,
    description: 'Standardizing development environments with Dev Containers spec, Devbox, Nix shells, and cloud IDEs to eliminate "works on my machine" problems.',
    visualizations: [],
    introduction: `## Overview
"It works on my machine" is one of the most persistent problems in software development. Reproducible development environments close the gap between a developer's local setup and CI/production, eliminating entire categories of bugs that exist only in specific configurations.

The Dev Containers specification (Microsoft, open standard, used by VS Code, GitHub Codespaces, and JetBrains) defines a JSON-based format for declaring a development environment as a Docker container. The devcontainer.json file at the repo root specifies the base image, extensions, port forwarding, and lifecycle scripts. Any developer who opens the repo gets the same environment — same runtime version, same tools, same extensions — in seconds via VS Code or Codespaces.

Devbox (Jetify, built on Nix) takes a different approach: instead of a container, it creates a reproducible shell environment with isolated, declarative package dependencies. "devbox.json" lists the packages (Node 20, Python 3.12, go 1.22, postgresql 15) and "devbox shell" drops you into an environment with exactly those versions — without Docker, without VM, with instant activation. Devbox is particularly strong for polyglot repositories and systems development where container overhead is undesirable.

Nix (the package manager and functional language) is the underlying engine that makes Nix shells and Devbox possible. Nix ensures bit-for-bit reproducibility: a "flake.nix" lock file pins every dependency's exact hash. The Nix store is immutable and content-addressed — two projects using different versions of the same library coexist without conflict.

Cloud IDEs (GitHub Codespaces, Gitpod, Daytona, Google Cloud Workstations) move the development environment into the cloud entirely. Benefits: onboarding from zero to running code in <60 seconds, no local compute requirements, enterprise security (code never leaves the cloud), and instant branch-switching without local checkout. The cost tradeoff: per-user cloud compute billing and latency for developers accustomed to local IDEs.

For platform engineering teams, standardized dev environments reduce onboarding time from days to hours, eliminate cross-platform bugs (Windows vs macOS vs Linux), and enable developers to contribute to any service without manually installing language runtimes and toolchains.`,
    whenToUse: [
      'Platform engineering initiative to standardize developer environments across a polyglot engineering org',
      'Interview questions about reducing "works on my machine" problems at scale',
      'Evaluating GitHub Codespaces vs local dev containers vs Devbox for your team\'s needs',
      'Designing a fast onboarding experience for a complex microservices repository',
      'Ensuring CI environment parity with local development to eliminate environment-specific bugs',
    ],
    keyConcepts: [
      { term: 'Dev Containers spec', definition: 'Open standard for defining development environments as Docker containers via devcontainer.json. Supported by VS Code, GitHub Codespaces, JetBrains, and Daytona. Specifies image, extensions, ports, and lifecycle scripts.' },
      { term: 'Devbox', definition: 'CLI tool by Jetify that creates reproducible development shells using Nix under the hood. devcontainer.json equivalent is devbox.json — lists packages by name and version. No Docker required for the dev shell.' },
      { term: 'Nix flakes', definition: 'Reproducible, composable Nix expressions with a lock file (flake.lock) that pins every dependency\'s exact cryptographic hash. The foundation of bit-for-bit reproducible builds and environments.' },
      { term: 'GitHub Codespaces', definition: 'Cloud-hosted VS Code development environments running on Azure VMs. Opens any repo as a dev container in <60 seconds. Billed per compute-hour; pre-builds speed up launch time.' },
      { term: 'Gitpod', definition: 'Cloud development environment platform (open-source self-hostable). Defines environments in .gitpod.yml. Supports VS Code, JetBrains Gateway, and browser-based Theia IDE.' },
      { term: 'Pre-build', definition: 'A pre-computed dev container image that runs setup steps (npm install, go build, etc.) ahead of time so developers start with a warm environment. GitHub Codespaces prebuilds are triggered on push to main branches.' },
    ],
    approach: [
      'Start with devcontainer.json: base image + devcontainer features (github.com/devcontainers/features) for common tools — zero custom Dockerfile needed for most repos',
      'Add postCreateCommand to run first-time setup (npm install, go mod download) so the environment is ready to code immediately on open',
      'For polyglot repos with native dependencies: evaluate Devbox — avoids container overhead while still providing reproducible package versions',
      'Set up Codespaces prebuilds on pushes to main — reduces environment startup from 3-5 minutes to <60 seconds',
      'Mirror CI environment (Docker image or Nix packages) to dev environment — same package versions means CI failures reproduce locally',
      'Document the expected dev environment in CONTRIBUTING.md with a "one-click launch" Codespaces badge',
    ],
    pitfalls: [
      'Devcontainer image drift — not pinning the base image tag means "latest" changes and breaks the reproducibility promise',
      'Heavy containers with 5GB images — increases Codespaces startup time; prefer layered images with slim base + features over monolithic custom images',
      'Forgetting to sync CI environment with dev container — if CI uses Go 1.22 and dev uses 1.20, tests pass locally but fail in CI',
      'Nix flakes learning curve — the Nix language is unfamiliar to most engineers; provide a devbox.json wrapper if Nix expertise is limited',
      'Cloud IDE latency — developers doing high-frequency compile-run cycles may find network round-trips frustrating; ensure at least 2-core Codespaces for heavy workloads',
    ],
    keyQuestions: [
      {
        question: 'How do you standardize development environments across a 500-person engineering org?',
        answer: `The goal is to make the correct environment the path of least resistance, not a mandate engineers will work around.

Strategy: Dev Containers as the baseline, with Devbox for teams that prefer Nix-based shells.

Execution:

1. Template library: Create an org-wide devcontainer feature library (internal GitHub registry) with approved versions of Node, Python, Go, Java. Teams add features from the library — no manual runtime installation, no version drift.

2. Platform team maintains base images: The platform team owns the base devcontainer images and builds them weekly (pinned to specific package versions). Teams inherit from these bases rather than building from scratch.

3. CI parity: CI uses the same container image as the devcontainer. The same npm install, go build, python test commands run identically locally and in CI. Environment-specific bugs disappear.

4. Codespaces prebuilds: Enable prebuilds for all repositories via GitHub org policy. Any push to the default branch triggers a prebuild. Developers get a warm environment in <60 seconds — the onboarding experience is open browser, click "Open in Codespace," write code.

5. Escape hatch: For developers who need local environments (offline work, GPU access, proprietary IDEs), Devbox provides the same package versions without containers. Same devbox.json in the repo as a parallel option.

6. Measurement: Track time-from-git-clone-to-first-commit for new engineers. Target: <2 hours. Alert on repos where this exceeds 1 day.`,
      },
    ],
    quickFire: [
      { q: 'What file defines a Dev Container?', a: 'devcontainer.json in the .devcontainer/ directory (or repo root). Specifies base image, VS Code extensions, ports, lifecycle commands, and devcontainer features.' },
      { q: 'What is Devbox and how does it differ from Dev Containers?', a: 'Devbox (Jetify) creates reproducible development shells using Nix — no Docker container required. Packages are declared in devbox.json and activated via "devbox shell". Better for native/polyglot workloads.' },
      { q: 'What are devcontainer features?', a: 'Reusable, composable installation scripts for common tools (Node.js, Python, Docker-in-Docker, AWS CLI) that add capabilities to a devcontainer without modifying the Dockerfile.' },
      { q: 'What is a Codespaces prebuild?', a: 'A pre-computed devcontainer state (with dependencies installed) triggered by pushes to default branches. Reduces environment startup from 3-5 minutes to under 60 seconds.' },
      { q: 'What makes Nix reproducible?', a: 'Content-addressed, immutable Nix store. Every package is identified by a cryptographic hash of its inputs. flake.lock pins exact hashes. Same flake.lock → identical build on any machine.' },
      { q: 'Name two cloud IDE platforms.', a: 'GitHub Codespaces (Azure-backed, VS Code) and Gitpod (open-source, self-hostable, supports VS Code and JetBrains).' },
    ],
    references: [
      'https://containers.dev/',
      'https://www.jetify.com/devbox/',
      'https://nixos.org/manual/nix/stable/command-ref/new-cli/nix3-flake',
      'https://docs.github.com/en/codespaces',
    ],
  },

  // ── OpenFeature & Feature Flag Management ─────────────────────────
  {
    id: 'openfeature-feature-flags',
    title: 'OpenFeature & Feature Flag Governance',
    icon: 'toggleLeft',
    color: '#f59e0b',
    questions: 5,
    description: 'The OpenFeature standard for feature flagging, flag lifecycle management, technical debt from long-lived flags, and progressive rollout governance.',
    visualizations: [],
    introduction: `## Overview
Feature flags (also called feature toggles) allow teams to deploy code to production without activating it for users — decoupling deployment from release. This is a foundational capability for trunk-based development, A/B testing, progressive delivery, and dark launching. But without governance, feature flags accumulate into technical debt that degrades system maintainability.

OpenFeature is an open standard (CNCF sandbox) that defines a vendor-neutral API for feature flag evaluation. Instead of coupling your application code to a specific vendor (LaunchDarkly, Split.io, Unleash, Flagsmith), you code against the OpenFeature SDK. Switching vendors requires only changing the provider implementation, not the application code. This portability is particularly valuable for large organizations evaluating different flag systems or migrating between vendors.

The OpenFeature architecture: the SDK (available in Go, Java, Node.js, Python, .NET, PHP) provides a standard evaluation API ("getBooleanValue", "getStringValue", etc.). A provider implements the SDK interface for a specific backend (LaunchDarkly provider, Unleash provider, in-memory provider for testing). Hooks intercept the evaluation lifecycle for logging, tracing, and metrics.

Feature flag governance addresses the accumulation problem. Flags that are never cleaned up after a feature fully rolls out become permanent conditional branches — each one increasing cognitive load for every developer who reads the code. Studies find that teams with no flag hygiene policy accumulate flags at 10-15x the rate they remove them. The result: hundreds of flags, many stale, creating a maintenance burden and obscuring the actual code logic.

Flag lifecycle management policies: (1) every flag has an owner and expiry date at creation time; (2) flags that have been 100% on or 100% off for 30 days trigger an automated cleanup ticket; (3) flag evaluation metrics (what percentage of requests evaluate each flag state) surface stale flags automatically; (4) permanent flags for kill switches and ops controls are explicitly labeled and exempt from expiry policies.

Progressive rollout patterns with feature flags: percentage rollout (start 1% → 10% → 50% → 100%), canary (flag targets only canary user cohort), ring deployment (internal → beta → production), and geographic rollout (US first, then EU). Flags combined with SLO monitoring enable automatic rollback: if error rate crosses threshold at 5% rollout, automatically flip the flag back to 0%.`,
    whenToUse: [
      'Designing progressive rollout systems for new features without requiring separate deployment pipelines',
      'Evaluating or migrating between feature flag vendors (LaunchDarkly, Unleash, Split)',
      'Building a flag governance policy to prevent flag accumulation and technical debt',
      'Interview questions about decoupling deployment from release, dark launches, and A/B testing infrastructure',
      'Implementing kill switches for critical features without requiring a deployment',
    ],
    keyConcepts: [
      { term: 'OpenFeature SDK', definition: 'CNCF-sandbox vendor-neutral SDK for feature flag evaluation. Available in 8+ languages. Application code evaluates flags via a standard API; the provider implements the backend. Switching vendors requires no application code changes.' },
      { term: 'Feature flag provider', definition: 'OpenFeature component that implements flag resolution for a specific backend (LaunchDarkly, Unleash, Flagsmith, environment variables). Swappable without changing evaluation call sites.' },
      { term: 'Flag lifecycle', definition: 'Create (with owner, expiry, jira ticket) → gradual rollout → 100% on → cleanup (remove flag + conditional code). Without an explicit lifecycle policy, flags accumulate indefinitely.' },
      { term: 'Targeting rules', definition: 'Logic that determines which flag variant to serve based on context (user ID, email domain, geography, plan tier). Enables percentage rollouts, beta programs, and canary releases without code changes.' },
      { term: 'Kill switch', definition: 'A permanent-intent feature flag designed to disable a feature quickly in production without a deployment. Labeled explicitly as long-lived and exempt from expiry policies.' },
      { term: 'Dark launch', definition: 'Running new code in production without exposing the results to users — useful for load testing new infrastructure, validating correctness of shadow path, or warming caches before a feature launch.' },
    ],
    approach: [
      'Adopt OpenFeature SDK in application code from day one — avoid hard-coding to LaunchDarkly or Unleash client directly',
      'Every flag created must include: owner (team), Jira ticket, and expiry date — enforce at creation time via API hook',
      'Set automated staleness alerts: flags at 100% on or 100% off for 30+ days trigger a cleanup reminder to the owner',
      'Use flag evaluation metrics to detect stale flags — a flag where 99.99% of evaluations return the same value for 30 days is ready to remove',
      'For kill switches: use a separate namespace or tag that exempts them from expiry policies',
      'Combine flags with SLO monitoring for automated rollback: error rate spike at N% rollout → auto-flip to 0%',
    ],
    pitfalls: [
      'No expiry date at creation time — flags accumulate without governance; removing them later requires archaeology',
      'Flags evaluated in hot paths without caching — flag evaluation adds latency; providers should cache evaluations and use streaming updates',
      'Nested flags (flag A checks flag B) — creates combinatorial complexity that defeats the purpose of isolated rollouts',
      'Removing flag code without removing the flag from the backend — orphaned flags in the dashboard obscure the real flag inventory',
      'Using flags as configuration — flags for business logic rollout should not become permanent configuration knobs (use proper config management instead)',
    ],
    keyQuestions: [
      {
        question: 'How do you design a feature flag governance policy for a 200-engineer organization?',
        answer: `The problem is entropy: flags are easy to create and painful to delete. Without policy, you accumulate hundreds of stale flags that developers fear removing. The governance policy must make cleanup easier than accumulation.

Policy components:

1. Creation requirements: Every flag created in the system must have an owner (team Slack channel), a linked Jira ticket, and an expiry date (max 90 days, extendable for releases > 90 days). Enforced via API hook on the flag management platform — flags missing these fields are rejected.

2. Automated staleness detection: A daily job queries flag evaluation metrics. Any flag that has been ≥98% on or ≥98% off for 30 consecutive days is classified as stale. The owner team receives a Jira ticket and a Slack message: "Flag XYZ has been 100% on for 30 days. Remove the conditional code and delete the flag."

3. Ring of responsibility: The flag owner team is responsible for cleanup. Platform team handles cleanup only if the owning team dissolves. No orphaned flags.

4. Cleanup workflow: The Jira ticket links to a runbook: (1) grep the codebase for the flag key, (2) remove the conditional code (keep the new behavior), (3) open a PR, (4) after merge, delete the flag from the backend. The PR description must include the flag key so it's searchable in git history.

5. Exempt flags: Kill switches and ops controls are labeled permanent and exempt from expiry. Require explicit renewal every 12 months with documented justification.

6. Metrics and accountability: Monthly report to engineering leadership: total flags, stale flags, median age, cleanup velocity. Teams with high stale flag counts are flagged (no pun intended) in the report.

Result: flag inventory stays manageable because cleanup is a scheduled, automated process rather than a heroic manual effort.`,
      },
    ],
    quickFire: [
      { q: 'What is OpenFeature?', a: 'A CNCF-sandbox open standard defining a vendor-neutral SDK for feature flag evaluation. Allows switching flag backends without changing application code.' },
      { q: 'What is a feature flag provider in OpenFeature?', a: 'An implementation of the OpenFeature provider interface for a specific backend (LaunchDarkly, Unleash, Flagsmith). Swappable without changing flag evaluation call sites in application code.' },
      { q: 'What is a kill switch?', a: 'A permanent-intent flag designed to disable a feature in production without a deployment. Labeled as long-lived and exempt from expiry/cleanup policies.' },
      { q: 'What is a dark launch?', a: 'Running new code in production without exposing results to users — used to validate correctness, load test, or warm caches before a feature launch.' },
      { q: 'What is the main risk of flag accumulation?', a: 'Stale conditional code increases cognitive load, obscures business logic, and creates maintenance burden. Each flag branch must be mentally traced by every developer reading the code.' },
      { q: 'Name two popular feature flag platforms.', a: 'LaunchDarkly (commercial) and Unleash (open-source, self-hostable). Both have OpenFeature providers.' },
    ],
    references: [
      'https://openfeature.dev/',
      'https://martinfowler.com/articles/feature-toggles.html',
      'https://launchdarkly.com/',
      'https://getunleash.io/',
    ],
  },

  // ── CNCF Landscape Navigation ─────────────────────────────────────
  {
    id: 'cncf-landscape-navigation',
    title: 'CNCF Landscape & Cloud Native Ecosystem',
    icon: 'cloud',
    color: '#0284c7',
    questions: 5,
    description: 'Navigating the CNCF landscape, understanding project maturity levels (sandbox/incubating/graduated), and selecting cloud native tools by category.',
    visualizations: [],
    introduction: `## Overview
The Cloud Native Computing Foundation (CNCF) landscape contains over 1,000 projects, making it the most comprehensive map of the cloud native ecosystem — and one of the most overwhelming documents in technology. Understanding how to navigate it, what the maturity levels mean, and how to evaluate projects for production use is a core skill for platform engineers and architects.

CNCF project maturity has three tiers: Sandbox (experimental, early-stage — high innovation risk), Incubating (growing adoption, stable API, formal governance — acceptable for early adopters), and Graduated (production-proven, broad adoption, formal security audit — safe for enterprise use). The graduation requirements are strict: demonstrated production use by at least three independent organizations, committer diversity, formal governance, and completion of a third-party security audit.

The CNCF Trail Map provides an opinionated learning path across nine capability areas: Containerization → CI/CD → Orchestration → Observability & Analysis → Service Proxy → Networking & Policy → Distributed Database & Storage → Messaging & Streaming → Container Registry & Runtime. Each area has recommended starting points (Kubernetes for orchestration, Prometheus for monitoring, Envoy for service proxy).

Choosing between CNCF projects and commercial alternatives requires evaluating four dimensions: operational maturity (do you have the expertise to run it?), community health (commit velocity, maintainer diversity, response time to issues), vendor lock-in risk (is the open-source version crippled vs the commercial version?), and total cost of ownership (cloud managed vs self-hosted includes SRE time to operate).

Key graduated projects to know in depth: Kubernetes, Prometheus, Envoy, CoreDNS, Fluentd, Jaeger, Vitess, Argo (CD, Workflows, Rollouts), Flux, OPA, Falco, Thanos, Cert-Manager, Cilium, OpenTelemetry (metrics/traces framework), Backstage (CNCF incubating), Crossplane.

The CNCF Technical Oversight Committee (TOC) evaluates projects for advancement. The annual KubeCon + CloudNativeCon conferences and the CNCF survey are the primary signals of which projects are gaining real-world adoption vs hype.`,
    whenToUse: [
      'Evaluating which CNCF projects to adopt for a given capability (observability, networking, security)',
      'Interview questions about cloud native ecosystem knowledge and how to avoid lock-in',
      'Designing a technology radar for your engineering organization',
      'Comparing sandbox vs incubating vs graduated projects when deciding production readiness',
      'Understanding the relationship between CNCF projects (Prometheus → Thanos → Cortex for scalable metrics)',
    ],
    keyConcepts: [
      { term: 'Sandbox', definition: 'CNCF maturity level for early-stage projects. High innovation value, high risk. Not recommended for production without significant internal expertise. Projects graduate to Incubating if adoption grows.' },
      { term: 'Incubating', definition: 'CNCF projects with growing adoption, stable APIs, and formal governance. Suitable for early adopters and teams with operational expertise. Required: 3+ production users, diversity of maintainers.' },
      { term: 'Graduated', definition: 'CNCF highest maturity level. Requires: broad production adoption, committer diversity, formal governance, and third-party security audit. Safe for enterprise production use.' },
      { term: 'CNCF Trail Map', definition: 'An opinionated 9-step learning path across cloud native capability areas. Starting points: containerization (Docker) → CI/CD → Kubernetes → Prometheus → Envoy → service mesh → storage → messaging → registry.' },
      { term: 'Technical Oversight Committee (TOC)', definition: 'CNCF governance body that evaluates and votes on project admission and graduation. TOC members represent diverse companies (Google, Red Hat, Apple, Bloomberg, etc.).' },
      { term: 'Technology radar', definition: 'An internal artifact (inspired by ThoughtWorks Radar) that classifies technologies as Adopt, Trial, Assess, or Hold for an organization. Used to standardize tool selection and communicate platform team recommendations.' },
    ],
    approach: [
      'Start with Graduated projects for production infrastructure — they have security audits and enterprise adoption',
      'Use Incubating for new capability areas where you have internal expertise to manage early-stage risks',
      'Evaluate project health via: GitHub commit velocity (last 90 days), number of active maintainers, issue response time, CNCF Security Audit report',
      'Check the CNCF Annual Survey for adoption signals — which projects are being adopted by organizations similar to yours',
      'Build a technology radar for your org: Adopt (standardized), Trial (controlled experimentation), Assess (research only), Hold (do not start new projects)',
      'For each CNCF tool category, understand the 2-3 leading options and their trade-offs before selecting',
    ],
    pitfalls: [
      'Treating "CNCF project" as a quality signal alone — Sandbox projects are experimental; being CNCF does not mean production-ready',
      'Adopting every CNCF project that sounds useful — operational complexity compounds; standardize on fewer, deeper tools',
      'Ignoring the security audit requirement — Graduated projects have had independent security audits; Sandbox projects have not',
      'Choosing based on hype at KubeCon — new announcements are Sandbox by definition; production adoption follows 2-3 years later',
      'Not evaluating maintainer diversity — a project with 90% commits from one company faces abandonment risk if that company pivots',
    ],
    keyQuestions: [
      {
        question: 'How do you evaluate a CNCF project for production adoption?',
        answer: `Evaluation framework across five dimensions:

1. Maturity level: Graduated is the baseline for production infrastructure. Incubating requires internal expertise to operate. Sandbox is for experimentation only.

2. Security posture: Has the project completed a CNCF-sponsored security audit? (Required for Graduation.) Review the audit report — what were the findings and are they resolved? Check CVE history and patch response time.

3. Community health: Open GitHub in the last 90 days — how many commits? How many active contributors from how many organizations? A project with 80% commits from one company is one strategic pivot away from abandonment. Check open issue response time — more than 2 weeks is a support risk.

4. Production adoption: Who is actually running this in production? Look for case studies on the CNCF blog and KubeCon talk recordings. "Used by Netflix, Shopify, and Datadog" is a different signal than "used by two startups." The CNCF Annual Survey shows adoption percentages by category.

5. Operational complexity and TCO: What does it take to run this reliably? Does the vendor offer a managed version (lower TCO, higher lock-in)? Do you have internal expertise? A technically superior project you cannot operate reliably is worse than a simpler one you can.

Final decision gate: Can you patch it yourself if a critical CVE drops? If yes, self-host. If no, use the managed version or choose a project where managed options exist.`,
      },
    ],
    quickFire: [
      { q: 'What are the three CNCF project maturity levels?', a: 'Sandbox (experimental), Incubating (growing adoption, stable API), Graduated (production-proven, security audit, broad adoption).' },
      { q: 'What is required for CNCF Graduation?', a: 'Broad production use by 3+ independent organizations, committer diversity, formal governance, and a completed third-party security audit.' },
      { q: 'Name five CNCF Graduated projects.', a: 'Kubernetes, Prometheus, Envoy, Argo (CD/Workflows), Flux, OPA, Falco, Cilium, CoreDNS, Jaeger — all graduated.' },
      { q: 'What is the CNCF Trail Map?', a: 'An opinionated 9-capability-area learning path for cloud native adoption, from containerization through Kubernetes to observability, networking, and storage.' },
      { q: 'What is a technology radar?', a: 'An internal artifact (ThoughtWorks-inspired) classifying technologies as Adopt, Trial, Assess, or Hold. Used to standardize tool selection across engineering teams.' },
      { q: 'How do you assess community health for a CNCF project?', a: 'Check GitHub commit velocity (last 90 days), maintainer diversity (% commits from top company), open issue response time, and security audit status.' },
    ],
    references: [
      'https://www.cncf.io/projects/',
      'https://landscape.cncf.io/',
      'https://github.com/cncf/toc/blob/main/process/graduation_criteria.md',
      'https://radar.cncf.io/',
    ],
  },

  // ── Toil Reduction & Automation ───────────────────────────────────
  {
    id: 'toil-reduction-automation',
    title: 'Toil Reduction & Automation Strategy',
    icon: 'settings',
    color: '#64748b',
    questions: 5,
    description: 'Identifying, measuring, and eliminating toil — manual, repetitive, automatable operations work — to reclaim engineering time for lasting improvements.',
    visualizations: [],
    introduction: `## Overview
Toil is a specific type of work defined by Google SRE: work that is manual, repetitive, automatable, tactical (not strategic), devoid of enduring value, and O(n) with service growth. The word "toil" is precise — not all operational work is toil. Responding thoughtfully to a novel incident is not toil. Running the same manual DB backup script every Friday is.

The SRE team commitment model caps toil at 50% of engineer time, with the remaining 50% reserved for engineering work that reduces future toil (automation, reliability improvements, scalability work). When toil exceeds 50%, the team is in a reactive death spiral: more toil → less time to automate → more toil accumulates. Measuring current toil percentage is the first step to breaking the cycle.

Identifying toil: the most reliable method is the toil diary — each team member tracks their tasks for two weeks, classifying each as toil or engineering work. Common toil categories: manual deployments, certificate renewals, access provisioning requests, recurring data dumps, manual scaling actions, weekly report generation, and recurring alert investigation that always resolves the same way.

Toil prioritization: not all toil is equally worth automating. Use the automation ROI matrix: (1) frequency (daily >> weekly >> monthly); (2) time cost per occurrence; (3) error risk (high human-error risk tasks get highest priority); (4) automation difficulty (trivial scripts first). The highest-value target: frequent, time-consuming, high-error-risk tasks that are technically straightforward to automate.

Automation patterns for common toil: Runbook automation (PagerDuty Process Automation, Rundeck) converts manual runbooks into push-button or auto-triggered workflows. Self-service portals (Backstage scaffolder, internal Slack bots) eliminate access provisioning and environment creation requests. GitOps (ArgoCD, Flux) eliminates manual deployment steps entirely. Auto-remediation (triggered by alerts) handles known failure patterns without pager wakeups.

The toil reduction loop: measure current toil (diary → percentage) → prioritize by ROI → automate → re-measure → repeat. The goal is not zero toil (impossible) but sustainable toil below 30% so engineers have 70% time for strategic work.`,
    whenToUse: [
      'Interview questions about how SRE teams prioritize work and balance operational vs engineering time',
      'Designing an automation strategy for an ops team drowning in manual work',
      'Building a toil measurement framework for engineering leadership reporting',
      'Evaluating which manual tasks to automate first using ROI prioritization',
      'Explaining the difference between toil and other types of operational work',
    ],
    keyConcepts: [
      { term: 'Toil (SRE definition)', definition: 'Work that is manual, repetitive, automatable, tactical, devoid of enduring value, and scales linearly with service growth. Distinct from operational overhead or project work.' },
      { term: '50% toil cap', definition: 'Google SRE organizational commitment: toil must not exceed 50% of any team\'s time. When exceeded, leadership intervention is required to reduce service load or add capacity.' },
      { term: 'Toil diary', definition: 'Two-week time-tracking exercise where engineers classify each task as toil or engineering work. The most reliable method for measuring actual toil percentage before designing automation strategy.' },
      { term: 'Automation ROI matrix', definition: 'Prioritization framework: score tasks by frequency × time cost × error risk ÷ automation difficulty. High-frequency, high-cost, high-risk, low-difficulty tasks are automated first.' },
      { term: 'Runbook automation', definition: 'Converting manual step-by-step runbooks into push-button or trigger-based automated workflows using tools like PagerDuty Process Automation, Rundeck, or custom scripts. The lowest-risk form of auto-remediation.' },
      { term: 'Self-service portal', definition: 'Developer-facing interface (Backstage, Slack bot, internal web app) that handles access provisioning, environment creation, and routine ops requests without SRE involvement. Eliminates the largest source of interrupt-driven toil.' },
    ],
    approach: [
      'Run a toil diary for two weeks across the whole team — measure first, automate second',
      'Calculate current toil percentage: toil hours / total working hours × 100. If >50%, escalate to leadership before choosing what to automate',
      'Build the automation ROI matrix: list all identified toil, score each on frequency, time, error risk, automation difficulty',
      'Automate highest-ROI toil first — typically daily manual operations that take 30+ minutes each',
      'For human-error-prone tasks: automate even if infrequent — the error cost outweighs the frequency calculation',
      'After automation, re-measure toil percentage to confirm reduction and track drift over time',
    ],
    pitfalls: [
      'Automating low-frequency, low-cost toil first — feels productive but doesn\'t move the toil percentage needle',
      'Automated toil without monitoring — broken automation that silently fails becomes worse than manual toil',
      'Automating before understanding — rushing to script a process before understanding it fully embeds bugs permanently',
      'Counting project work as toil reduction — project features that happen to require automation are not toil reduction; they are new capabilities',
      'One-time automation without maintenance — automation that is not updated as the system changes becomes technical debt',
    ],
    keyQuestions: [
      {
        question: 'You join an SRE team where engineers spend 70% of their time on manual operations. What is your plan?',
        answer: `70% toil means the team is in a reactive spiral — they have almost no time to do the engineering work that would reduce toil. This is a management and engineering problem simultaneously.

Immediate action (week 1-2): Run a toil diary. Have every team member track and classify every task for two weeks. This gives you the actual data: which tasks consume the most time, which are most frequent, which are highest error risk.

Classification (week 3): Build the toil inventory and the automation ROI matrix. Calculate current toil percentage formally. Present to leadership: "Our team spends 70% on toil. The SRE model says 50% is the intervention threshold. We need either reduced service load or dedicated engineering time to automate."

Negotiate capacity: Leadership needs to understand that 70% toil is an organizational risk, not just an engineering inconvenience. The ask: freeze new feature work for the next sprint to allow the team to reduce toil by 20 percentage points. If refused, escalate the risk: "At 70% toil, we cannot improve reliability — incidents will continue at the same rate."

Top 3 automation targets (based on ROI matrix): typically manual deployments (if not already GitOps), access provisioning requests (self-service portal), and recurring alert investigation that always resolves the same way (auto-remediation script or runbook automation).

Re-measure at week 6 and week 12. Target: below 50% in 60 days. If successful, establish the 50% cap as a standing team commitment with monthly measurement.

Long-term: build toil metrics into the team's quarterly OKRs — toil percentage is a health metric like error rate.`,
      },
    ],
    quickFire: [
      { q: 'What are the six characteristics of toil?', a: 'Manual, repetitive, automatable, tactical (not strategic), devoid of enduring value, and O(n) with service growth.' },
      { q: 'What is Google SRE\'s toil cap?', a: '50% — toil must not exceed half of any SRE team\'s time. When exceeded, leadership intervention is required.' },
      { q: 'What is a toil diary?', a: 'A two-week time-tracking exercise where engineers classify each task as toil or engineering work — the most reliable way to measure actual toil percentage.' },
      { q: 'Is incident response toil?', a: 'Not necessarily. Novel incidents requiring judgment are not toil. Repetitive alerts that always resolve the same way are toil — they should be auto-remediated.' },
      { q: 'What is the difference between toil and overhead?', a: 'Overhead (meetings, planning, hiring) is not toil because it is not O(n) with service growth and often has strategic value. Toil specifically scales with service size and is automatable.' },
      { q: 'What is runbook automation?', a: 'Converting manual step-by-step runbooks into push-button or trigger-based automated workflows using tools like PagerDuty Process Automation or Rundeck.' },
    ],
    references: [
      'https://sre.google/sre-book/eliminating-toil/',
      'https://sre.google/workbook/eliminating-toil/',
      'https://rundeck.com/',
      'https://docs.pagerduty.com/docs/automation-actions',
    ],
  },

  {
    id: 'internal-developer-platform',
    title: 'Internal Developer Platforms (IDPs) & Backstage',
    icon: 'layers',
    color: '#8b5cf6',
    questions: 5,
    description: 'IDPs abstract infrastructure complexity from developers via golden paths. Backstage (CNCF) is the leading open-source IDP framework: software catalog, templates, plugins, TechDocs. Reduces cognitive load; accelerates onboarding.',
    visualizations: [],
    introduction: `## Overview
An Internal Developer Platform (IDP) is a self-service layer built by platform engineering teams to reduce cognitive load on application developers. Rather than requiring developers to understand Kubernetes, Terraform, IAM, and CI/CD pipelines in depth, an IDP presents golden paths — opinionated, pre-approved workflows for common operations.

Backstage, open-sourced by Spotify and now a CNCF incubating project, is the leading framework for building IDPs. Its core components:

Software Catalog: centralized registry of all services, libraries, websites, and data pipelines. Each entity is defined by a catalog-info.yaml file in the service repo. The catalog tracks ownership, dependencies, API contracts, and links to runbooks and dashboards.

Software Templates (Scaffolder): opinionated project templates that create new services via a form-based UI. A template defines the golden path — which language, framework, CI pipeline, and Kubernetes manifests are pre-configured. Running a template creates the repo, CI pipeline, and initial deployment in one click.

TechDocs: docs-as-code. Write documentation in Markdown alongside code; Backstage renders it centrally with search.

Plugins: Backstage's extension model. Integrates existing tools (PagerDuty, GitHub Actions, ArgoCD, Grafana) into one developer portal.`,
    whenToUse: [
      'Platform engineering teams standardizing developer workflows across 10+ services',
      'Onboarding new engineers who need to create production-ready services without deep infrastructure knowledge',
      'Replacing scattered wikis with a searchable software catalog',
      'Implementing CNCF platform engineering maturity model stage 2+',
    ],
    keyConcepts: [
      { term: 'Golden Path', definition: 'The opinionated, platform-supported way to complete a common developer task. Removes decision fatigue and ensures consistency. Teams can deviate, but the golden path is what the platform team supports and optimizes.' },
      { term: 'Software Catalog', definition: 'Backstage registry of all software entities. Each service has a catalog-info.yaml declaring its kind, owner, lifecycle, dependencies, and links. Enables discoverability and dependency mapping.' },
      { term: 'Scaffolder Templates', definition: 'Parameterized project templates in Backstage that create new services via a form UI. Generates the repo, CI config, and Kubernetes manifests. Enforces consistency without copy-paste from existing repos.' },
      { term: 'Cognitive Load', definition: 'The mental effort required for a developer to ship a feature. IDPs reduce intrinsic cognitive load (infrastructure concepts) and extraneous cognitive load (navigating multiple tools) so developers focus on the actual product problem.' },
      { term: 'Developer Portal', definition: 'The developer-facing UI of an IDP. Backstage is the most common open-source framework. Commercial alternatives: Cortex, Port, OpsLevel.' },
    ],
    approach: [
      'Start with the Software Catalog — register all existing services via catalog-info.yaml before building anything else',
      'Add golden path templates for the most common service types (REST API, async worker)',
      'Integrate existing tools via plugins instead of replacing them',
      'Measure adoption: percentage of new services using scaffold templates, catalog entries with owners and runbooks',
    ],
    pitfalls: [
      'Building without developer input — interview developers, identify their top pain points, solve those first',
      'Over-engineering before proving value — start with catalog + one template',
      'Letting the catalog rot — stale entries erode trust in the platform',
    ],
    keyQuestions: [
      { question: 'What is the difference between an IDP and a developer portal?', answer: 'A developer portal is the UI — the website developers interact with (Backstage). An Internal Developer Platform (IDP) is the broader system: the portal plus the underlying infrastructure automations, golden paths, self-service workflows. The portal is how developers access the IDP, not the IDP itself.' },
      { question: 'How does Backstage Software Catalog work?', answer: 'Each service has a catalog-info.yaml committed alongside its code declaring entity kind, owner, lifecycle, and dependencies. A Backstage discovery processor scans configured locations (GitHub orgs) for catalog-info.yaml files and registers entities in the catalog database. Developers query the catalog to discover services, find owners, and check health via integrated plugins.' },
    ],
    quickFire: [
      { q: 'What is a golden path?', a: 'The opinionated, platform-supported way to complete a common developer task -- reduces decision fatigue and enforces consistency.' },
      { q: 'What CNCF project is the leading IDP framework?', a: 'Backstage, open-sourced by Spotify.' },
      { q: 'What does Backstage Scaffolder do?', a: 'Creates new services from opinionated templates -- generates the repo, CI config, and Kubernetes manifests in one workflow.' },
    ],
    references: [
      'https://backstage.io/docs/',
      'https://tag-app-delivery.cncf.io/whitepapers/platforms/',
    ],
  },

  {
    id: 'gitops-pull-model',
    title: 'GitOps — Pull-Based Deployment Model',
    icon: 'gitBranch',
    color: '#14b8a6',
    questions: 4,
    description: 'OpenGitOps 4 principles: declarative, versioned+immutable, pulled automatically, continuously reconciled. ArgoCD and Flux implement the pull model — in-cluster agents watch Git and reconcile desired vs actual state.',
    visualizations: [],
    introduction: `## Overview
GitOps is a set of practices where the desired state of infrastructure and applications is stored in Git and an automated operator continuously reconciles actual state to match desired state.

OpenGitOps (CNCF) defines GitOps through four core principles:

1. Declarative: the entire system state is described declaratively — WHAT it should look like, not HOW to get there. Kubernetes YAML manifests are declarative; imperative kubectl commands are not GitOps.

2. Versioned and Immutable: desired state is stored in Git. All changes are tracked, auditable, and reversible. No direct cluster changes — everything goes through Git.

3. Pulled Automatically: software agents pull desired state from Git and apply it to the system. This is the key distinction from push-based CI/CD where the pipeline pushes kubectl apply from outside the cluster. The agent runs inside the cluster.

4. Continuously Reconciled: agents continuously observe actual state and reconcile any drift. If someone manually runs kubectl delete pod, the GitOps operator detects drift and recreates the pod.

ArgoCD and Flux are the two dominant GitOps operators implementing these principles.`,
    whenToUse: [
      'Kubernetes deployments requiring auditability, rollback, and drift detection',
      'Multi-cluster environments with a central Git repo as source of truth',
      'Compliance environments requiring every infrastructure change to have a PR review',
      'Platform engineering teams separating application code repos from deployment config repos',
    ],
    keyConcepts: [
      { term: 'Pull vs Push Model', definition: 'Push: CI pipeline authenticates to Kubernetes and runs kubectl apply — credentials stored in CI, outside-in. Pull: an agent inside the cluster watches Git and pulls changes — cluster needs no external credentials. Pull model is more secure.' },
      { term: 'ArgoCD', definition: 'Declarative GitOps operator for Kubernetes. Watches Git repos, Helm charts, or Kustomize overlays and syncs the cluster. Provides a UI showing sync status, health, and diff. Supports ApplicationSets for managing many clusters.' },
      { term: 'Flux', definition: 'CNCF-graduated GitOps toolkit. Modular controllers for Git sources, Helm releases, Kustomizations. More lightweight than ArgoCD; no built-in UI.' },
      { term: 'Drift Detection', definition: 'GitOps operator continuously compares actual cluster state to desired state in Git. When drift is detected (manual kubectl change), the operator alerts or automatically reconciles back.' },
    ],
    approach: [
      'Separate deployment manifest repos from application code repos',
      'Install ArgoCD or Flux with minimal RBAC',
      'Set sync policy: automated sync with self-heal for non-production; require manual approval for production',
      'Use External Secrets Operator or Sealed Secrets — never commit plaintext secrets to Git',
    ],
    pitfalls: [
      'Committing secrets to Git — always encrypt (Sealed Secrets) or reference externally (External Secrets Operator)',
      'Auto-sync in production without blast radius analysis — a bad commit with auto-sync can instantly break production',
      'No environment promotion strategy — without dev → staging → prod promotion, changes go directly to all clusters',
    ],
    keyQuestions: [
      { question: 'What are the four OpenGitOps principles?', answer: '1. Declarative: desired state described declaratively (YAML, not scripts)\n2. Versioned and Immutable: state stored in Git; all changes tracked and auditable\n3. Pulled Automatically: in-cluster agent pulls from Git (not pushed from CI)\n4. Continuously Reconciled: agent detects and corrects drift back to Git state\n\nThe pull model is the key architectural distinction from traditional CI/CD push deployment.' },
      { question: 'How does ArgoCD implement GitOps?', answer: 'ArgoCD runs controllers inside the cluster (argocd-application-controller, argocd-repo-server). The controller polls Git repos (default 3min) or responds to webhooks. When it detects a difference between Git state and cluster state, it marks the Application as OutOfSync.\n\nWith auto-sync + self-heal: immediately applies the Git state. With manual sync: waits for human approval.\n\nArgoCD never needs external cluster credentials — it uses in-cluster service account RBAC. The cluster reaches out to Git, not the reverse.' },
    ],
    quickFire: [
      { q: 'Key difference between push and pull GitOps?', a: 'Push: CI authenticates to cluster and applies changes (credentials in CI). Pull: in-cluster agent watches Git (credentials never leave cluster).' },
      { q: 'Name the two dominant GitOps operators.', a: 'ArgoCD (built-in UI, App-of-Apps) and Flux (CNCF-graduated, modular controllers).' },
      { q: 'How do you handle secrets in GitOps?', a: 'Never commit plaintext. Use Sealed Secrets (cluster-encrypted before commit) or External Secrets Operator (reference from Vault/AWS Secrets Manager).' },
    ],
    references: [
      'https://opengitops.dev/',
      'https://argo-cd.readthedocs.io/',
      'https://fluxcd.io/flux/concepts/',
    ],
  },

  {
    id: 'slsa-supply-chain',
    title: 'SLSA — Software Supply Chain Security',
    icon: 'shield',
    color: '#ef4444',
    questions: 4,
    description: 'SLSA defines 3 levels of supply chain integrity. Level 1: provenance. Level 2: hosted build + signed provenance. Level 3: hardened build + non-falsifiable provenance. Sigstore (Cosign, Rekor, Fulcio) implements keyless signing.',
    visualizations: [],
    introduction: `## Overview
SLSA (Supply-chain Levels for Software Artifacts, pronounced "salsa") is a security framework from Google (now OpenSSF) defining graduated levels of software supply chain integrity. Created in response to attacks like SolarWinds and Log4Shell where the build pipeline or dependency chain was compromised.

SLSA v1.0 defines three levels:

Level 1 — Provenance: the build generates a signed attestation describing how the artifact was built (source, builder, inputs). Basic auditability.

Level 2 — Hosted Build + Signed Provenance: the build runs on a trusted hosted platform (GitHub Actions, Google Cloud Build) and provenance is signed by that platform's identity. Consumers can verify the build platform.

Level 3 — Hardened Build + Non-Falsifiable Provenance: the build environment is hardened (isolated, ephemeral, no network egress), and provenance is generated by the platform such that even the build script cannot forge it.

Sigstore is the open-source ecosystem implementing SLSA signing: Cosign (sign images and attestations), Rekor (immutable transparency log), Fulcio (OIDC-based CA for keyless signing).`,
    whenToUse: [
      'Securing CI/CD pipelines against build-time tampering',
      'Verifying deployed images were built by your CI system and not modified',
      'NIST SSDF or Executive Order 14028 software supply chain compliance',
      'Kubernetes admission control: only allow images with valid provenance',
    ],
    keyConcepts: [
      { term: 'Provenance Attestation', definition: 'A signed, machine-readable document (in-toto attestation) describing how an artifact was built: source repo, commit hash, builder identity, build environment. Allows consumers to verify "this image was built by GitHub Actions from commit abc123 of repo org/myapp."' },
      { term: 'Cosign (Sigstore)', definition: 'CLI tool for signing and verifying container images and attestations. Supports keyless signing (OIDC-based ephemeral certificates from Sigstore PKI) and key-based signing. Adds signatures to the OCI registry alongside the image digest.' },
      { term: 'Rekor (Sigstore)', definition: 'Immutable, append-only transparency log for software signatures. Every Cosign signature is recorded in Rekor. Consumers query Rekor to verify a signature exists and was recorded at a specific time.' },
      { term: 'Keyless Signing', definition: 'Sign without managing long-lived key pairs. CI job gets a short-lived certificate from Fulcio CA based on OIDC identity (GitHub Actions workload identity). The signature is tied to the workflow identity. No secrets to rotate; certificates expire in 10 minutes.' },
    ],
    approach: [
      'Start with SLSA Level 1: add provenance generation using slsa-github-generator GitHub Action',
      'Sign container images with Cosign keyless signing in CI',
      'Advance to Level 2 by using hosted builders with platform-generated provenance',
      'Add Kyverno or OPA admission policies to reject images without valid signatures',
    ],
    pitfalls: [
      'Generating provenance without verifying it — provenance only helps if verified at deploy time',
      'Long-lived signing keys in CI secrets — use keyless signing to eliminate key management entirely',
      'Confusing SLSA levels — Level 2 is about build platform identity; Level 3 is about hardening the build environment',
    ],
    keyQuestions: [
      { question: 'What problem does SLSA solve and what are its three levels?', answer: 'SLSA addresses software supply chain attacks where the build pipeline or artifact distribution is compromised (SolarWinds, XZ Utils).\n\nLevel 1: build generates signed provenance. Basic auditability.\nLevel 2: build runs on trusted hosted platform; provenance signed by platform identity. Consumers can verify the build platform.\nLevel 3: hardened build environment (isolated, ephemeral); provenance non-falsifiable even by the build script itself.' },
      { question: 'How does keyless signing with Sigstore work?', answer: '1. CI job requests OIDC token from provider (GitHub Actions)\n2. Cosign sends token to Sigstore Fulcio CA\n3. Fulcio verifies OIDC token, issues short-lived X.509 cert (10min TTL) bound to OIDC subject (github.com/org/repo/workflow@refs/heads/main)\n4. Cosign signs artifact with ephemeral private key\n5. Signature + certificate uploaded to Rekor transparency log\n6. Ephemeral key discarded\n\nVerification: cosign verify checks signature in Rekor, cert from Fulcio, OIDC subject matches expected workflow.' },
    ],
    quickFire: [
      { q: 'What does SLSA stand for?', a: 'Supply-chain Levels for Software Artifacts.' },
      { q: 'What is Cosign?', a: 'Sigstore tool for signing and verifying container images and attestations.' },
      { q: 'What is Rekor?', a: 'Immutable transparency log for software signatures -- non-repudiation.' },
      { q: 'What is keyless signing?', a: 'Sign with OIDC-based ephemeral certs (Sigstore Fulcio) instead of long-lived private keys.' },
    ],
    references: [
      'https://slsa.dev/',
      'https://docs.sigstore.dev/',
      'https://github.com/sigstore/cosign',
    ],
  },

  {
    id: 'dora-metrics-advanced',
    title: 'DORA Four Keys — Deep Dive',
    icon: 'activity',
    color: '#22c55e',
    questions: 4,
    description: 'DORA Four Keys: Deployment Frequency, Lead Time for Changes, Change Failure Rate, Time to Restore. Elite: deploy on-demand, <1h MTTR, <15% CFR. Speed and stability are positively correlated — not a tradeoff.',
    visualizations: [],
    introduction: `## Overview
The DORA (DevOps Research and Assessment) Four Keys are the industry-standard metrics for measuring software delivery performance. Derived from six years of research across 32,000+ professionals in the annual State of DevOps reports.

The four metrics measure delivery speed and stability:

Deployment Frequency: how often code deploys to production. Elite: multiple times per day. High: once per day to once per week. Medium: once per week to once per month. Low: less than once per month.

Lead Time for Changes: commit to production. Elite: under 1 hour. High: 1 day to 1 week. Medium: 1 week to 1 month. Low: 1 to 6 months.

Change Failure Rate: percentage of deployments causing a production failure. Elite/High: 0-15%. Medium: 16-30%. Low: 16-30%.

Time to Restore Service (MTTR): how long to recover from a failure. Elite: under 1 hour. High: under 1 day. Medium: 1 day to 1 week. Low: 1 week to 1 month.

Critical insight: elite teams achieve HIGH speed AND HIGH stability simultaneously. Speed and stability are positively correlated — not a tradeoff.`,
    whenToUse: [
      'Establishing a baseline before a DevOps transformation initiative',
      'Tracking impact of CI/CD improvements over time',
      'Identifying bottlenecks: high frequency + high CFR = test coverage gap; low frequency + low CFR = batch release risk aversion',
      'Executive reporting on engineering effectiveness with industry benchmarks',
    ],
    keyConcepts: [
      { term: 'Deployment Frequency', definition: 'How often a team releases to production. Best predictor of lead time — frequent deploys mean smaller batches, lower risk per deployment, faster feedback loops. Trunk-based development and feature flags enable high frequency.' },
      { term: 'Lead Time for Changes', definition: 'Clock starts at commit; clock stops when live in production. Includes code review + CI build + deployment pipeline + manual approval gates. Reveals where time is spent between code-complete and delivery.' },
      { term: 'Change Failure Rate', definition: 'Percentage of deployments causing a production incident. Measures deployment quality. Reduced by: comprehensive automated testing, canary deployments, feature flags for instant rollback.' },
      { term: 'Time to Restore (MTTR)', definition: 'Incident detection to full service recovery. Key enablers: good observability (fast detection), runbooks, feature flags, canary rollbacks, on-call engineers with authority to act.' },
      { term: 'Elite Profile', definition: 'Deploy multiple times per day, <1h lead time, <15% CFR, <1h MTTR. Elite teams prove speed and stability are mutually reinforcing, not a tradeoff.' },
    ],
    approach: [
      'Instrument deployment events: every production deployment emits a timestamp event',
      'Instrument incidents: link incidents to causative deployments to calculate CFR automatically',
      'Measure lead time: timestamp when commit merges to main + timestamp when deployed to production',
      'Display on a shared dashboard visible to all engineers, not just leadership',
    ],
    pitfalls: [
      'Gaming metrics — teams evaluated on DORA metrics optimize the metric not the outcome (deploy trivial commits to inflate frequency)',
      'Comparing across teams — most useful for tracking one team\'s improvement over time, not cross-team benchmarking',
      'Ignoring 2024 additions — documentation quality and reliability are now as predictive as the four keys',
    ],
    keyQuestions: [
      { question: 'What are the DORA Four Keys and elite benchmarks?', answer: '1. Deployment Frequency — Elite: multiple times per day\n2. Lead Time for Changes — Elite: less than 1 hour\n3. Change Failure Rate — Elite: 0-15%\n4. Time to Restore — Elite: less than 1 hour\n\nCritical finding: elite performers achieve high speed AND high stability simultaneously. The research disproves the conventional belief that speed and quality trade off.' },
      { question: 'How do you measure Lead Time for Changes in practice?', answer: 'Lead Time = time from code commit merged to main → same commit running in production.\n\nImplementation:\n1. Record timestamp when commit merges to main branch\n2. Record timestamp when deployment containing that commit reaches production\n3. Lead time = production timestamp - commit timestamp\n\nTools: DORA Four Keys open-source project (BigQuery + Looker), Datadog CI Visibility, LinearB, Jellyfish.\n\nCommon bottlenecks: long PR review cycles, slow CI (>15min builds), manual approval gates, restricted deployment windows.' },
    ],
    quickFire: [
      { q: 'What are the DORA Four Keys?', a: 'Deployment Frequency, Lead Time for Changes, Change Failure Rate, Time to Restore Service.' },
      { q: 'Elite MTTR benchmark?', a: 'Less than 1 hour to restore after a production incident.' },
      { q: 'Do elite teams trade speed for stability?', a: 'No -- research shows they are positively correlated. Elite teams achieve high frequency AND low failure rates.' },
    ],
    references: [
      'https://dora.dev/research/',
      'https://github.com/dora-team/fourkeys',
    ],
  },




  {
    id: 'karpenter-node-autoscaling',
    title: 'Karpenter — Node Autoscaling',
    icon: 'zap',
    color: '#f59e0b',
    description: 'Just-in-time node provisioning for Kubernetes — Karpenter watches unschedulable pods and provisions the optimal EC2 instance type directly, replacing Cluster Autoscaler.',
    introduction: `## Overview
Karpenter is an open-source node autoscaler for Kubernetes that provisions new nodes in response to unschedulable pods. Unlike Cluster Autoscaler (which manages predefined node groups), Karpenter directly calls the cloud provider API to launch the optimal instance type for the pending workload.

How Karpenter works:
1. A pod cannot be scheduled — no node has enough CPU, memory, or GPU, or no node matches the required node affinity.
2. Karpenter watches for unschedulable pods via the Kubernetes scheduler.
3. Karpenter evaluates the pod resource requests and scheduling constraints and computes the cheapest or fastest instance type that satisfies all constraints.
4. Karpenter calls the EC2 RunInstances API directly — no Auto Scaling Group required. The new node registers with the cluster and the pod is scheduled.

NodePool: defines constraints on nodes Karpenter can provision — allowed instance families, capacity types (On-Demand or Spot), zones, and resource limits (max total CPU and memory across all Karpenter nodes).

EC2NodeClass: specifies the AMI family, subnet selector, security group selector, and instance store configuration. Decouples cloud-specific configuration from the generic NodePool.

Consolidation: Karpenter continuously evaluates whether the cluster is using nodes efficiently. If a node is underutilized and its workloads can fit on other nodes, Karpenter drains and terminates it. This runs proactively — Karpenter does not wait for scale-down delay timers.

Drift detection: if a NodePool or EC2NodeClass is updated (new AMI, changed instance requirements), Karpenter detects that existing nodes are drifted from the desired spec and replaces them through a rolling process.

Karpenter vs. Cluster Autoscaler: Cluster Autoscaler requires pre-defined node groups (ASGs) and can only scale within those group boundaries. Karpenter selects the best instance type dynamically, can mix On-Demand and Spot in a single NodePool, and consolidates nodes proactively. Karpenter is the recommended approach for new EKS clusters.`,
    whenToUse: [
      'Replacing Cluster Autoscaler in EKS clusters for better cost efficiency and speed',
      'Interview questions about Kubernetes node autoscaling strategies',
      'Mixing Spot and On-Demand instances dynamically based on workload requirements',
      'Reducing cluster costs by automatically consolidating underutilized nodes',
      'Designing EKS clusters that scale from zero for batch or ML workloads',
    ],
    keyConcepts: [
      { term: 'NodePool', definition: 'Karpenter CRD that defines what kinds of nodes Karpenter can provision: allowed instance families, capacity types (On-Demand/Spot), availability zones, and resource limits (max total CPU/memory for all Karpenter nodes).' },
      { term: 'EC2NodeClass', definition: 'AWS-specific Karpenter CRD that defines the AMI family, subnet selector (by tag), security group selector, and block device configuration for nodes Karpenter launches.' },
      { term: 'Consolidation', definition: 'Karpenter feature that continuously evaluates whether underutilized nodes can be emptied and terminated. Workloads are rescheduled onto remaining nodes. Reduces cluster costs proactively without waiting for CPU or memory thresholds.' },
      { term: 'Disruption Budget', definition: 'Constraint on how many nodes Karpenter can disrupt simultaneously during consolidation or drift replacement. Set via NodePool disruption settings to prevent consolidation from causing service outages.' },
      { term: 'Drift Detection', definition: 'Karpenter detects when existing nodes no longer match their NodePool or EC2NodeClass spec (e.g., AMI changed) and proactively replaces them via rolling node replacements.' },
      { term: 'Topology Spread Constraints', definition: 'Kubernetes scheduling constraint that distributes pods across zones or nodes. Karpenter respects these constraints when selecting which AZ to launch new nodes in.' },
    ],
    pitfalls: [
      { title: 'No disruption budget with Spot nodes', description: 'Karpenter consolidation and Spot interruption can both trigger pod rescheduling simultaneously. Without a PodDisruptionBudget on your workload and a NodePool disruption budget, Karpenter may drain multiple nodes at once, removing more replicas than your availability allows.' },
      { title: 'Unlimited NodePool resource limits', description: 'Without a resource limit on the NodePool, a misconfigured HPA or workload requesting unbounded resources can cause Karpenter to provision hundreds of nodes and generate a large unexpected EC2 bill. Always set NodePool resource limits.' },
      { title: 'Missing Spot interruption handling', description: 'Karpenter does not automatically handle Spot interruption notices. Deploy the AWS Node Termination Handler or enable Karpenter native interruption handling via SQS to cordon and drain Spot nodes when AWS sends a 2-minute interruption warning.' },
    ],
    keyQuestions: [
      { q: 'How does Karpenter differ from Cluster Autoscaler?', a: 'Cluster Autoscaler works by scaling pre-defined Auto Scaling Groups (node groups). It can only provision the instance type defined in the ASG. To support multiple instance types you need multiple ASGs. Karpenter eliminates node groups entirely — it directly calls the EC2 API to launch any instance type that satisfies the pending pod constraints. This means Karpenter can always select the cheapest available instance type, mix On-Demand and Spot without separate node groups, and consolidate underutilized nodes proactively. Karpenter also provisions nodes faster — typically under 60 seconds vs. 2-3 minutes for Cluster Autoscaler. For new EKS clusters, Karpenter is the recommended approach.' },
      { q: 'How does Karpenter handle Spot Instance interruptions?', a: 'Karpenter supports two interruption handling mechanisms. The AWS Node Termination Handler (NTH) is a DaemonSet that watches the EC2 instance metadata endpoint for Spot interruption notices. On a notice, NTH cordons the node and drains it, giving pods 2 minutes to reschedule before AWS terminates the instance. Karpenter native interruption handling uses an SQS queue and EventBridge rules that receive Spot interruption notices. Karpenter watches the SQS queue and drains the node when a notice arrives. The native handler is preferred for clusters where Karpenter manages all nodes. Both approaches require PodDisruptionBudgets on workloads to ensure Kubernetes does not evict too many replicas simultaneously.' },
      { q: 'What is Karpenter consolidation and when would you disable it?', a: 'Consolidation is Karpenter continuously evaluating whether underutilized nodes can be emptied and terminated to save cost. When a node is underutilized, Karpenter checks if its pods can fit on other existing nodes. If yes, it cordons the node, evicts the pods (respecting PDBs), and terminates the node. This runs proactively and significantly reduces cluster costs for variable workloads. When to limit consolidation: for latency-sensitive stateful workloads where pod rescheduling causes disruption even with PDBs; for batch jobs that should run to completion without interruption (use consolidationPolicy: WhenEmpty to only consolidate empty nodes); and when GPU node warm-up time is significant, because consolidation would repeatedly terminate and recreate expensive nodes for periodic workloads.' },
    ],
    references: [
      'https://karpenter.sh/docs/',
      'https://docs.aws.amazon.com/eks/latest/best-practices/karpenter.html',
    ],
    visualizations: [
      { title: 'Karpenter Node Provisioning Flow', caption: 'Unschedulable pod -> Karpenter evaluates resource requirements -> selects cheapest EC2 instance type (On-Demand or Spot) -> calls EC2 RunInstances API directly (no ASG) -> node joins cluster -> pod scheduled. Consolidation loop runs continuously to remove underutilized nodes.', image: '/diagrams/linkdiags/karpenter-autoscaling.png' },
    ],
  },
  {
    id: 'crossplane-cloud-control',
    title: 'Crossplane — Cloud Control Plane',
    icon: 'layers',
    color: '#6366f1',
    description: 'Kubernetes-native cloud infrastructure management — Crossplane turns your Kubernetes cluster into a universal control plane that provisions cloud resources via CRDs and continuous reconciliation.',
    introduction: `## Overview
Crossplane is an open-source CNCF project that extends Kubernetes with the ability to manage cloud infrastructure (AWS, GCP, Azure) using native Kubernetes primitives — CRDs, controllers, and RBAC.

The core idea: instead of running Terraform CLI or CloudFormation stacks, you declare the desired state of cloud resources as Kubernetes manifests, and Crossplane controllers reconcile actual cloud state to match.

Provider: a Crossplane package that installs CRDs and a controller for a specific cloud (provider-aws, provider-gcp, provider-azure). Each managed resource type becomes a Kubernetes CRD.

Managed Resources (MR): Kubernetes objects that directly map to cloud resources. An RDSInstance object creates an actual AWS RDS instance. The controller watches the object and calls AWS APIs to create or update or delete the resource to match the spec.

Compositions and CompositeResourceDefinitions (XRDs): XRDs define new abstract resource types (e.g., PostgreSQLDatabase) that hide cloud-specific details. Compositions map XRDs to one or more underlying managed resources. A developer creates a PostgreSQLDatabase object; the Composition provisions an RDSInstance, a SecurityGroup, and a SubnetGroup automatically. Platform teams define Compositions; developers consume abstract XRDs.

Claims: namespace-scoped objects created by developers to request infrastructure from a Composition. Claims hide underlying cloud complexity and can be quota-controlled per namespace.

Crossplane vs. Terraform: Terraform uses plan/apply CLI operations with external state files. Crossplane continuously reconciles state like a Kubernetes controller — if someone manually changes a cloud resource outside Crossplane, the controller corrects it automatically. No drift. Crossplane also enables GitOps workflows and integrates with Kubernetes RBAC for infrastructure access control.`,
    whenToUse: [
      'Building a self-service platform where developers request infrastructure via Kubernetes manifests',
      'Implementing GitOps for cloud infrastructure provisioning',
      'Interview questions about Kubernetes-native IaC and platform engineering',
      'Replacing Terraform for teams that are already Kubernetes-native',
      'Enabling multi-cloud resource management from a single Kubernetes cluster',
    ],
    keyConcepts: [
      { term: 'Managed Resource (MR)', definition: 'Kubernetes CRD representing a single cloud resource (e.g., RDSInstance, S3Bucket). Crossplane controllers watch MRs and call cloud APIs to make actual resources match the spec. Deletion of an MR deletes the cloud resource by default.' },
      { term: 'CompositeResourceDefinition (XRD)', definition: 'Defines a new abstract API type (e.g., XPostgreSQLServer). Platform teams create XRDs so developers work with cloud-agnostic APIs instead of raw managed resources.' },
      { term: 'Composition', definition: 'Defines how an XR maps to one or more Managed Resources. A single XPostgreSQLServer Composition might create an RDSInstance plus a SecurityGroup plus a SubnetGroup on AWS.' },
      { term: 'Claim', definition: 'Namespace-scoped proxy for a Composite Resource. Developers create Claims in their namespace; Crossplane creates a cluster-scoped XR and binds the Claim to it. Claims enforce namespace isolation and quota control.' },
      { term: 'Provider', definition: 'Crossplane package (OCI image plus CRDs plus controller) for a specific cloud. provider-aws installs CRDs for every AWS service. Providers authenticate via ProviderConfig (IAM role, IRSA).' },
      { term: 'Continuous Reconciliation', definition: 'Unlike Terraform (one-shot apply), Crossplane controllers continuously compare actual cloud state with desired state. If a resource is modified outside Crossplane, the controller reverts it on the next reconcile cycle.' },
    ],
    pitfalls: [
      { title: 'Deleting managed resources deletes cloud infrastructure', description: 'Crossplane managed resources have deletionPolicy: Delete by default — deleting the Kubernetes object also deletes the actual cloud resource. Set deletionPolicy: Orphan on production resources before deleting the object, or you will accidentally delete databases and buckets.' },
      { title: 'Compositions are complex to debug', description: 'A failed Composition shows errors on the XR or MR objects, not on the Claim the developer submitted. Developers must understand the XR/Claim/MR layering to debug. Provide clear status conditions and document the object hierarchy for platform users.' },
      { title: 'Full provider-aws bloats etcd', description: 'provider-aws installs hundreds of CRDs. Large CRD count increases API server load and etcd memory usage. Use family-specific provider packages such as provider-aws-s3 or provider-aws-rds instead of the full provider-aws when you only need a subset of services.' },
    ],
    keyQuestions: [
      { q: 'How does Crossplane differ from Terraform for infrastructure management?', a: 'Terraform uses a CLI plan/apply workflow with external state files. Drift correction requires a manual terraform apply. Crossplane uses the Kubernetes controller pattern: a reconcile loop continuously compares actual cloud state with the desired state in Kubernetes objects and corrects drift automatically. Crossplane is fully GitOps-compatible — Flux or ArgoCD syncs manifests and Crossplane reconciles cloud resources. RBAC controls which teams can create which resource types. Crossplane is better when you are already Kubernetes-native and want infrastructure as a first-class Kubernetes API. Terraform is better for complex provisioning workflows, existing module ecosystems, and multi-team setups with strong Terraform expertise.' },
      { q: 'What is the purpose of Crossplane Compositions and XRDs?', a: 'Compositions and XRDs implement the platform abstraction layer. An XRD defines a new cloud-agnostic API such as XRelationalDatabase with fields for engine, size, and storageGB. A Composition defines how to realize that XRD on a specific cloud: create an RDSInstance, a SecurityGroup, and a SubnetGroup, mapping XR field values to each managed resource. Platform teams own XRDs and Compositions and hide cloud-specific complexity. Developers only see XRelationalDatabase and create Claims against it. This means platform teams can change the underlying cloud implementation without changing the developer-facing API.' },
      { q: 'How does Crossplane handle drift in cloud resources?', a: 'Crossplane controllers implement a continuous reconcile loop. Every reconcile interval (default 10 minutes), the controller reads the current state of the cloud resource via the provider API and compares it to the desired state in the Kubernetes object. If they differ, the controller calls the cloud API to reconcile actual state back to desired. For example, if someone manually modifies an RDS instance size in the AWS console, the Crossplane controller detects the drift on the next reconcile and reverts the size to match the MR spec. This is a stronger guarantee than Terraform drift detection, which requires running terraform plan explicitly. The trade-off is that Crossplane generates continuous API calls to cloud providers — factor in API rate limits for large fleets of managed resources.' },
    ],
    references: [
      'https://docs.crossplane.io/',
      'https://www.cncf.io/projects/crossplane/',
    ],
    visualizations: [
      { title: 'Crossplane Architecture', caption: 'Developer creates Claim (namespace-scoped) -> Crossplane creates XR -> Composition maps XR to Managed Resources -> Provider controller calls AWS/GCP/Azure APIs -> Cloud resources created. GitOps: ArgoCD syncs manifests, Crossplane reconciles cloud state continuously.', image: '/diagrams/linkdiags/crossplane-architecture.png' },
    ],
  },
  {
    id: 'external-secrets-operator',
    title: 'External Secrets Operator',
    icon: 'lock',
    color: '#ef4444',
    description: 'Sync secrets from AWS Secrets Manager, Vault, GCP Secret Manager, and other stores into Kubernetes Secrets — the standard pattern for secrets management in Kubernetes.',
    introduction: `## Overview
The External Secrets Operator (ESO) is a Kubernetes operator that reads secrets from external secret stores (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager, Azure Key Vault, and others) and synchronizes them into native Kubernetes Secrets.

The problem ESO solves: storing secrets directly in Kubernetes Secrets is insecure by default because Secret values are base64-encoded (not encrypted) in etcd. ESO bridges external secret stores — which handle access control, audit logging, rotation, and versioning — with Kubernetes applications that need secrets as environment variables or volume mounts.

SecretStore (namespace-scoped): defines how to authenticate to an external secrets backend within a namespace. References an IAM role (via IRSA), a Vault token, or a GCP service account.

ClusterSecretStore (cluster-scoped): same as SecretStore but available to all namespaces. Use for centrally managed backends like a shared Vault cluster.

ExternalSecret: declares which keys to read from the external store and how to write them as a Kubernetes Secret. References a SecretStore or ClusterSecretStore and maps external key paths to Kubernetes Secret keys. ESO reconciles the Kubernetes Secret to stay in sync with the external store.

IRSA (IAM Roles for Service Accounts): ESO on EKS uses a Kubernetes service account annotated with an IAM role ARN. The ESO pod assumes this role via OIDC federation to call AWS Secrets Manager APIs — no long-term AWS credentials needed.

Secret rotation: when a secret is rotated in AWS Secrets Manager, ESO detects the change on the next reconcile interval and updates the Kubernetes Secret. Pods that read secrets from environment variables require a restart to pick up new values — use the Reloader operator or reference secrets as volumes for seamless rotation.`,
    whenToUse: [
      'Syncing secrets from AWS Secrets Manager or Vault into Kubernetes without storing them in Git',
      'Interview questions about secrets management patterns in Kubernetes',
      'Implementing automatic secret rotation without manual pod restarts',
      'Centralizing secret storage and access control across multiple Kubernetes clusters',
      'Replacing manually created Kubernetes Secrets with GitOps-compatible external sync',
    ],
    keyConcepts: [
      { term: 'ExternalSecret', definition: 'ESO CRD that defines which secret to read from the external store and how to write it into a Kubernetes Secret. Specifies the SecretStore reference, remote key paths, and target secret name and keys.' },
      { term: 'SecretStore', definition: 'ESO CRD defining the connection and authentication to a specific secrets backend. Namespace-scoped — only ExternalSecrets in the same namespace can reference it.' },
      { term: 'ClusterSecretStore', definition: 'Cluster-scoped SecretStore. Any ExternalSecret in any namespace can reference it. Use for shared backends like a central Vault cluster or organization-wide AWS Secrets Manager account.' },
      { term: 'IRSA (IAM Roles for Service Accounts)', definition: 'EKS mechanism where a Kubernetes service account is annotated with an IAM role ARN. The kubelet exchanges the service account token for AWS credentials via OIDC federation. ESO uses IRSA to call AWS Secrets Manager without static credentials.' },
      { term: 'refreshInterval', definition: 'ExternalSecret field that controls how often ESO polls the external store for changes. Default is 1 hour. Lower values catch secret rotations faster but generate more API calls against the external store.' },
      { term: 'Secrets Store CSI Driver', definition: 'Alternative to ESO — mounts secrets directly as files in the pod filesystem using a CSI volume mount, bypassing Kubernetes Secrets entirely. Better for compliance environments that prohibit storing secrets in etcd; ESO is simpler for teams that need standard Kubernetes Secret compatibility.' },
    ],
    pitfalls: [
      { title: 'Env vars do not pick up rotated secrets', description: 'When a Kubernetes Secret is updated by ESO after rotation, pods that read the secret as environment variables continue using the old values — env vars are injected at pod startup and do not update. Deploy the Reloader operator to watch Secrets and trigger rolling restarts on updates, or mount secrets as volumes which update in place within about one minute.' },
      { title: 'Too-low refreshInterval hitting rate limits', description: 'Setting refreshInterval to 1m across hundreds of ExternalSecrets generates hundreds of AWS Secrets Manager API calls per minute. AWS Secrets Manager has per-secret and per-account rate limits. Set refreshInterval to 15-60 minutes for stable secrets; use higher frequency only for rapidly rotating credentials.' },
      { title: 'Deleting ExternalSecret deletes the Kubernetes Secret', description: 'By default, deleting an ExternalSecret also deletes the synced Kubernetes Secret. Set spec.target.deletionPolicy: Retain to keep the Kubernetes Secret when the ExternalSecret is deleted. Important during migrations and debugging.' },
    ],
    keyQuestions: [
      { q: 'How does External Secrets Operator compare to storing secrets directly in Kubernetes Secrets?', a: 'Native Kubernetes Secrets store values as base64-encoded data in etcd. Without etcd encryption at rest, anyone with etcd access or kubectl get secret permission can read the values. Secrets committed to Git for GitOps are base64-encoded plaintext in the repository. ESO keeps the source of truth in a purpose-built secret store like AWS Secrets Manager which provides encryption at rest by default, fine-grained IAM access control per secret, full audit logging of every read and rotation, and automated rotation. ESO syncs these secrets into Kubernetes Secrets for pod consumption. The Kubernetes Secret is ephemeral and recreatable; the actual secret value lives in the external store. This follows the principle that Kubernetes Secrets are a delivery mechanism, not the authoritative store.' },
      { q: 'How do you implement zero-downtime secret rotation with ESO?', a: 'Rotation without downtime requires ESO sync and pod-level handling together. Configure the ExternalSecret with an appropriate refreshInterval such as 5 minutes for frequently rotated credentials. Mount the secret as a volume rather than env vars — Kubernetes updates projected volumes in place within about one minute, so pods see the new value without restart. For env var consumers, deploy the Reloader operator which watches Kubernetes Secrets and triggers rolling restarts of Deployments that reference them when values change. With Reloader, pod restart happens automatically after ESO syncs the new secret. Also ensure the application handles the transition period — most secret stores support dual-active credentials during rotation so both old and new credentials are valid for a grace period.' },
      { q: 'What is IRSA and why is it important for ESO on EKS?', a: 'IRSA (IAM Roles for Service Accounts) federates Kubernetes service account identities with AWS IAM. Each EKS cluster has an OIDC provider endpoint. You create an IAM role with a trust policy that allows the EKS OIDC provider to assume the role for a specific Kubernetes service account. Annotate the service account with the role ARN. The kubelet exchanges the service account JWT token for short-lived AWS credentials via the OIDC endpoint when the pod starts. ESO uses IRSA to call AWS Secrets Manager with pod-scoped IAM permissions — no static AWS_ACCESS_KEY_ID needed. This is more secure than node-level instance profiles which grant all pods on the node the same permissions, and more secure than static credentials that need manual rotation.' },
    ],
    references: [
      'https://external-secrets.io/latest/',
      'https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html',
    ],
    visualizations: [
      { title: 'External Secrets Operator Flow', caption: 'ExternalSecret references ClusterSecretStore -> ESO controller reads from AWS Secrets Manager (via IRSA) -> writes Kubernetes Secret -> Pod mounts Secret. On rotation: AWS Secrets Manager updates -> ESO detects on next reconcile -> Kubernetes Secret updated -> Pod gets new value via volume mount or Reloader-triggered restart.', image: '/diagrams/linkdiags/external-secrets-operator.png' },
    ],
  },
  {
    id: 'dora-four-keys-implementation',
    title: 'DORA Four Keys — Implementation',
    icon: 'bar-chart-2',
    color: '#22c55e',
    description: 'Implementing DORA 4 Keys in practice — measuring deployment frequency, lead time, change failure rate, and MTTR using real tooling, data pipelines, and dashboards.',
    introduction: `## Overview
The DORA Four Keys are the most widely validated metrics for measuring software delivery performance. Identified by the DevOps Research and Assessment team (now at Google Cloud) and validated across 7+ years of the State of DevOps Report, they predict organizational performance and team well-being.

The four metrics and how to measure them:

Deployment Frequency: how often code is deployed to production. Measure by counting production deployment events in your CI/CD system. Elite: multiple times per day. High: once per day to once per week. Medium: once per week to once per month. Low: less than once per month. Instrument by counting successful pipeline runs tagged with environment=production, grouped by day or week.

Lead Time for Changes: time from a code commit being merged to that commit running in production. Measure the delta between commit timestamp and deployment timestamp for every commit in each release. Elite: less than one hour. High: one day to one week. Instrument by tracking commit hashes in each deployment and calculating deployment_timestamp minus commit_timestamp for each included commit.

Change Failure Rate (CFR): percentage of deployments that cause a production incident, rollback, or service degradation. Elite: 0-15%. High: 16-30%. Instrument by linking incidents and rollbacks to the triggering deployment. CFR = incidents_linked_to_deployments divided by total_deployments.

Mean Time to Restore (MTTR): how long it takes to restore service after a production failure. Elite: less than one hour. High: less than one day. Export from PagerDuty or OpsGenie: MTTR = mean(resolved_at minus triggered_at) for all production incidents.

Tooling options:
- DORA Quick Check at dora.dev: free self-assessment survey.
- Four Keys open-source project (Google): BigQuery plus Looker Studio dashboard pulling from GitHub or GitLab and PagerDuty.
- Sleuth, LinearB, Faros AI: commercial platforms with automatic integration.
- Custom: GitHub Actions plus CloudWatch or Datadog metrics with a custom dashboard.

A fifth metric, Reliability (meeting SLOs), was added to the DORA model in 2023.`,
    whenToUse: [
      'Setting up engineering metrics programs for DevOps teams',
      'Interview questions about measuring software delivery performance',
      'Demonstrating data-driven DevOps improvement to engineering leadership',
      'Benchmarking team performance against DORA elite or high or medium or low clusters',
      'Identifying bottlenecks in the software delivery pipeline',
    ],
    keyConcepts: [
      { term: 'Deployment Frequency', definition: 'How often code is successfully released to production. The primary velocity metric. Elite performers deploy multiple times per day. Measured by counting successful production deployment events in the CI/CD pipeline.' },
      { term: 'Lead Time for Changes', definition: 'Time from code commit to that commit running in production. Measures the speed of the full delivery pipeline. Calculate as deployment_timestamp minus commit_timestamp for all commits in each release.' },
      { term: 'Change Failure Rate (CFR)', definition: 'Percentage of deployments causing a production incident, rollback, or hotfix. The quality and stability counter-balance to deployment frequency. Link incidents and rollbacks to the triggering deployment to calculate.' },
      { term: 'Mean Time to Restore (MTTR)', definition: 'Average time from production incident detected to service restored. Measures team responsiveness and system recoverability. Export from incident management tools as resolved_at minus triggered_at.' },
      { term: 'DORA Performance Clusters', definition: 'DORA research classifies teams into Elite, High, Medium, and Low clusters based on the four key values. Elite teams have far more frequent deployments, faster lead time, lower CFR, and faster MTTR than Low performers.' },
      { term: 'DORA 5th Key: Reliability', definition: 'Added in 2023. Measures whether teams are meeting their user-facing SLOs. Operationalized as the percentage of time a service meets its SLO. Captures operational stability alongside velocity.' },
    ],
    pitfalls: [
      { title: 'Measuring non-production deployments as deployment frequency', description: 'Deployment frequency measures production deployments only. Counting staging or dev deployments inflates the metric and misrepresents actual value delivery. Filter strictly to production environment deployments in your instrumentation.' },
      { title: 'Gaming metrics instead of improving the system', description: 'Teams measured on DORA metrics may find ways to improve numbers without improving the system. Splitting a weekly deployment into 7 daily no-op deployments inflates frequency without improving lead time. Pair metrics with leading indicators such as PR cycle time and test pass rates to detect gaming.' },
      { title: 'Using MTTR for performance reviews', description: 'MTTR is a learning metric, not a compliance metric. Using it for performance reviews incentivizes closing incidents quickly (marking as resolved) rather than actually restoring service and learning from failure. Use MTTR for trend analysis and process improvement only.' },
    ],
    keyQuestions: [
      { q: 'What are the DORA Four Keys and what does each measure?', a: 'The DORA Four Keys measure software delivery performance across two dimensions: speed and stability. Speed: Deployment Frequency measures how often you deploy to production (elite: multiple per day); Lead Time for Changes measures time from code commit to production deployment (elite: under 1 hour). Stability: Change Failure Rate measures the percentage of deployments that cause incidents or rollbacks (elite: under 15%); MTTR measures time to restore service after a production failure (elite: under 1 hour). DORA research shows that elite performers achieve high velocity AND high stability simultaneously — these are not trade-offs. A fifth metric, Reliability (meeting SLOs), was added in 2023.' },
      { q: 'How would you instrument Deployment Frequency for a team using GitHub Actions and ArgoCD?', a: 'Two instrumentation points for a GitOps pipeline. First, in GitHub Actions, listen for the workflow_run event with conclusion=success and filter for workflows that target the production environment. Emit a CloudWatch metric or push a Datadog event with service name and deployment timestamp. Second, in ArgoCD, use ArgoCD notifications or webhook integration to capture successful sync events for production Applications. Filter by destination environment label. For lead time, capture the list of commits in each sync by comparing old and new revision hashes with git log old_rev..new_rev. For each commit, lead_time equals sync_timestamp minus commit authored_date. Store in BigQuery or a time-series database and build a Grafana or Looker Studio dashboard segmented by service and team.' },
      { q: 'How are Deployment Frequency and Lead Time for Changes different from each other?', a: 'Both measure speed but from different angles. Deployment Frequency measures how often releases reach production — it captures batch size and release cadence. A team that deploys once per week has low frequency even if each deployment runs fast through the pipeline. Lead Time measures the duration of the full delivery pipeline from code commit to production — it captures cycle time and pipeline efficiency. A team could have high frequency (daily deploys) but slow lead time (4 days from commit to production) if their pipeline has long queues, slow tests, or manual approval gates. Ideally both improve together: small frequent deployments with short pipeline stages. If frequency is high but lead time is long, investigate pipeline bottlenecks. If frequency is low, examine batch size, branching strategy, and deployment fear caused by high change failure rate.' },
    ],
    references: [
      'https://dora.dev/research/',
      'https://github.com/dora-team/fourkeys',
    ],
    visualizations: [
      { title: 'DORA Four Keys Performance Clusters', caption: 'Elite: deploy multiple times per day, lead time under 1 hour, CFR under 15%, MTTR under 1 hour. High: deploy daily to weekly, lead time under 1 week. Medium: weekly to monthly. Low: less than monthly. Elite teams achieve high velocity and high stability simultaneously.', image: '/diagrams/linkdiags/dora-four-keys.png' },
    ],
  },
  {
    id: 'platform-engineering-idp-design',
    title: 'Platform Engineering & IDP Design',
    icon: 'layout',
    color: '#8b5cf6',
    description: 'Designing Internal Developer Platforms — golden paths, thinnest viable platform, Backstage, cognitive load reduction, and the CNCF Platform Engineering maturity model.',
    introduction: `## Overview
Platform Engineering is the discipline of building and operating Internal Developer Platforms (IDPs) that reduce cognitive load on development teams and provide self-service infrastructure capabilities. It applies product thinking to internal tooling.

Platform as a Product: the platform team treats development teams as customers. Define a product roadmap, collect feedback, measure adoption, and iterate based on developer needs — not on what the platform team finds technically interesting.

Thinnest Viable Platform (TVP): start with the smallest set of capabilities that delivers real value to development teams. Resist building a comprehensive platform before validating demand. Expand based on measured developer pain points.

Golden Paths: opinionated, paved paths for the most common developer use cases — deploy a containerized service, create a PostgreSQL database, add monitoring to a service. Golden paths are not the only way; they are the easy default. Teams can go off-path with justification. Golden paths reduce cognitive load by eliminating decision fatigue.

Cognitive Load: the mental effort required to understand, build, and operate a service. Platform engineering reduces cognitive load so teams can focus on product logic. Too many tools, undocumented APIs, and manual steps increase cognitive load and slow delivery.

Internal Developer Portal: the UI and API surface of a platform. Backstage (CNCF graduated project) is the most common IDP framework. Backstage provides a Software Catalog (inventory of services, owners, dependencies), Templates (self-service scaffolding), TechDocs (docs-as-code), and a Plugin ecosystem.

CNCF Platform Engineering Maturity Model — 5 levels:
Level 0: no platform team; each team manages its own infrastructure.
Level 1: provisional — platform team exists, provides some shared services ad-hoc.
Level 2: operational — defined platform with documented golden paths and SLAs.
Level 3: scalable — platform-as-product, self-service capabilities, measured developer adoption.
Level 4: optimizing — platform drives competitive advantage, industry-leading developer experience.

Team Topologies context: the Platform team is one of the four team types. Platform teams exist to reduce cognitive load on stream-aligned teams through X-as-a-service interfaces.`,
    whenToUse: [
      'Designing or evaluating an Internal Developer Platform for an engineering organization',
      'Interview questions about platform engineering, developer experience, and team topologies',
      'Explaining Backstage, golden paths, and platform-as-product to engineering leadership',
      'Building a roadmap for a new platform team',
      'Measuring platform engineering success with developer experience metrics',
    ],
    keyConcepts: [
      { term: 'Internal Developer Platform (IDP)', definition: 'The full set of tools, workflows, and self-service capabilities provided by a platform team to development teams. Includes infrastructure provisioning, deployment pipelines, observability, and golden path templates.' },
      { term: 'Golden Path', definition: 'An opinionated, documented, well-maintained set of tools and workflows for common use cases. A golden path for deploying a new microservice includes Helm chart templates, CI/CD setup, monitoring dashboards, and alerting in a single scaffolding command.' },
      { term: 'Thinnest Viable Platform', definition: 'The smallest set of platform capabilities that provides measurable value. Platform teams should start thin and expand based on validated developer needs, not engineer judgment.' },
      { term: 'Backstage', definition: 'CNCF graduated open-source IDP framework from Spotify. Core features: Software Catalog (service registry with ownership and dependency tracking), Software Templates (self-service scaffolding), TechDocs (Markdown docs rendered in the portal), and a plugin ecosystem.' },
      { term: 'Cognitive Load', definition: 'Mental effort required to understand and operate a system. Platform engineering reduces cognitive load on stream-aligned teams by handling infrastructure complexity. Team Topologies identifies three types: intrinsic (inherent problem complexity), extraneous (accidental complexity from poor tools), germane (learning that builds expertise).' },
      { term: 'Platform SLOs', definition: 'Service Level Objectives defined by the platform team for platform services: API availability, provisioning latency, support response time. Platforms are internal services — they need SLOs to be accountable to developer customers.' },
    ],
    pitfalls: [
      { title: 'Building a comprehensive platform before validating demand', description: 'Platform teams sometimes build elaborate self-service portals that developers do not use because they solved problems developers did not have. Start with the thinnest viable platform: identify the top 3 developer pain points from surveys or support tickets and build only for those. Measure adoption before expanding.' },
      { title: 'Forcing all teams onto golden paths', description: 'Golden paths should reduce friction for the common case, not mandate conformance. If golden paths become mandatory, teams with unusual requirements spend months getting exceptions approved instead of building product. Communicate that golden paths are the default, not the only option.' },
      { title: 'No customer feedback loop', description: 'A platform team without a product manager and regular developer feedback tends to build what engineers find interesting, not what developers need. Run quarterly developer experience surveys, review support tickets weekly, and measure adoption rates per capability.' },
    ],
    keyQuestions: [
      { q: 'What is the difference between an Internal Developer Platform and an Internal Developer Portal?', a: 'An Internal Developer Platform (IDP) is the full set of capabilities and services provided to development teams — CI/CD pipelines, infrastructure provisioning, service mesh, observability, golden path templates. It is the platform itself. An Internal Developer Portal is the UI layer of the IDP — the web application developers use to interact with the platform. Backstage is the most common developer portal framework. The portal provides a Software Catalog (all services, owners, SLOs), Software Templates (one-click service scaffolding), TechDocs (integrated documentation), and plugin-based integrations. An IDP can exist without a portal. A portal without underlying platform capabilities is just a dashboard.' },
      { q: 'How do you measure the success of a platform engineering initiative?', a: 'Platform success has two dimensions: developer adoption and business impact. Adoption metrics: active users of each capability per month, percentage of new services using golden paths, self-service request ratio. Developer experience metrics using the SPACE framework: Satisfaction from developer NPS surveys, Performance from DORA metrics for platform-using vs. non-using teams, Activity from deployments per week, Communication from PR review time, Efficiency from onboarding time for new services. Business impact: platform-using teams show faster deployment frequency, lower CFR, and shorter lead time than teams not using it. Survey teams on cognitive load reduction annually.' },
      { q: 'What is Backstage and what problems does it solve?', a: 'Backstage is an open-source IDP framework from Spotify, now a CNCF graduated project. It solves three problems common in growing engineering organizations. First, discoverability — engineers do not know what services exist, who owns them, or how they are deployed. The Software Catalog aggregates all services, owners, runbooks, and deployment details in one searchable UI. Second, self-service provisioning — creating a new service requires coordination with many teams. Software Templates provide one-click scaffolding: enter service name and choose options, and Backstage creates the GitHub repo, CI/CD pipeline, Kubernetes manifests, and monitoring setup automatically. Third, documentation fragmentation — docs live in Confluence, Notion, and GitHub. TechDocs renders Markdown from the service repo directly in the portal so docs are version-controlled with the code.' },
    ],
    references: [
      'https://backstage.io/',
      'https://tag-app-delivery.cncf.io/whitepapers/platforms/',
      'https://teamtopologies.com/key-concepts',
    ],
    visualizations: [
      { title: 'Platform Engineering Maturity Model', caption: 'Level 0: no platform team. Level 1: provisional shared services. Level 2: operational platform with SLAs. Level 3: scalable self-service, platform-as-product. Level 4: optimizing, competitive advantage. Most organizations target Level 2-3.', image: '/diagrams/linkdiags/platform-engineering-idp.png' },
    ],
  },
  {
    id: 'grpc-protobuf-services',
    title: 'gRPC & Protocol Buffers',
    icon: 'radio',
    color: '#14b8a6',
    description: 'High-performance RPC framework using Protocol Buffers — unary and streaming RPCs, HTTP/2 multiplexing, schema evolution, service mesh integration, and REST transcoding.',
    introduction: `## Overview
gRPC is an open-source, high-performance Remote Procedure Call (RPC) framework developed by Google. It uses HTTP/2 as the transport and Protocol Buffers (Protobuf) as the interface definition language and wire format.

Why gRPC over REST: REST uses HTTP/1.1 text-based JSON with no schema enforcement. gRPC uses HTTP/2 (multiplexing, header compression, binary framing) with Protobuf (binary wire format, strict schema, forward and backward compatible). gRPC is typically 5-10x faster and more bandwidth-efficient than JSON over REST for the same payload.

Protocol Buffers: define service contracts in .proto files. The protoc compiler generates strongly-typed client and server code in any supported language (Go, Java, Python, Node.js, C++). Protobuf binary encoding is compact — a JSON object is roughly 3x larger than the equivalent Protobuf encoding.

gRPC call types:
Unary RPC: single request, single response. Equivalent to a REST API call. Most common pattern.
Server-side streaming: client sends one request, server streams multiple responses. Use for real-time data feeds or large result sets.
Client-side streaming: client streams multiple requests, server sends one response. Use for file uploads or batch input.
Bidirectional streaming: both sides stream simultaneously over one HTTP/2 connection. Use for real-time collaborative features or interactive protocols.

Schema evolution: Protobuf fields have numbers that persist across schema versions. Never change a field number or its type. Adding new fields with new numbers is backward and forward compatible. Removing fields: mark as reserved, never reuse the number.

gRPC in Kubernetes: gRPC uses HTTP/2, which is not compatible with layer-4 load balancers that do not understand HTTP/2 stream multiplexing. Use a service mesh (Istio, Linkerd) or a gRPC-aware load balancer (NGINX, Envoy, AWS ALB) that terminates HTTP/2 and properly load-balances at the request level.

gRPC-Gateway: generates a reverse proxy from Protobuf annotations that translates HTTP/JSON REST calls to gRPC. Enables one backend to serve both REST (for browsers) and gRPC (for internal services) from the same .proto definition.`,
    whenToUse: [
      'Designing high-throughput microservice-to-microservice communication',
      'Interview questions about inter-service communication protocols and trade-offs',
      'Replacing REST APIs for internal services where performance and schema safety matter',
      'Building streaming APIs for real-time data feeds or bidirectional communication',
      'Enforcing contract-first API development with generated client and server stubs',
    ],
    keyConcepts: [
      { term: 'Protocol Buffers (Protobuf)', definition: 'Binary serialization format and IDL. Define message and service schemas in .proto files. protoc compiles them to language-specific stubs. Binary encoding is 3-10x smaller than equivalent JSON for typical API payloads.' },
      { term: 'HTTP/2 Transport', definition: 'gRPC uses HTTP/2 which provides multiplexing (multiple requests over one TCP connection), header compression (HPACK), binary framing, and server push. This eliminates HTTP/1.1 head-of-line blocking and connection overhead.' },
      { term: 'Bidirectional Streaming', definition: 'Both client and server send a stream of messages over a single long-lived HTTP/2 connection. Used for real-time applications, collaborative features, and interactive protocols where latency matters.' },
      { term: 'Field Numbers', definition: 'Every Protobuf field has a unique integer tag encoded in the binary wire format (not the field name). Never change a field number once published — it breaks backward compatibility. Adding new fields with new numbers is safe.' },
      { term: 'gRPC-Gateway', definition: 'Protobuf plugin that generates an HTTP/JSON reverse proxy from .proto annotations. Allows a single gRPC service to serve REST clients (browsers) and gRPC clients (microservices) from one codebase.' },
      { term: 'gRPC Load Balancing', definition: 'HTTP/2 multiplexing means all streams go to one backend with L4 load balancing. Use L7 load balancers (Envoy, NGINX, AWS ALB with gRPC protocol) or client-side load balancing with a headless Kubernetes service for proper request distribution.' },
    ],
    pitfalls: [
      { title: 'Using gRPC with L4 load balancers', description: 'A gRPC client opens one HTTP/2 connection and multiplexes all calls on it. An L4 (TCP) load balancer routes the connection to one backend at connection setup. All subsequent RPC calls on that connection go to the same backend — effectively no load balancing. Use an L7 load balancer or service mesh that understands HTTP/2 frames and distributes individual RPCs.' },
      { title: 'Reusing field numbers for different fields', description: 'If you remove a field and reuse its number for a new field with a different type, old clients will misinterpret the new field as the old type — causing silent data corruption, not an error. Mark removed fields as reserved and never reuse the number.' },
      { title: 'No deadline or timeout propagation', description: 'gRPC supports per-call deadlines. Without deadlines, a slow downstream RPC blocks the caller indefinitely, causing cascading timeouts. Always set a deadline on gRPC calls and propagate the remaining deadline from incoming requests to outgoing calls.' },
    ],
    keyQuestions: [
      { q: 'Why would you choose gRPC over REST for internal microservice communication?', a: 'gRPC offers several advantages over REST for internal services. Performance: HTTP/2 binary framing with Protobuf binary encoding is 5-10x more efficient than HTTP/1.1 JSON — lower latency and bandwidth for high-throughput services. Strong typing: .proto files define the contract and the compiler generates type-safe client and server stubs in any language. REST relies on informal OpenAPI specs with runtime type errors. Streaming: gRPC natively supports server, client, and bidirectional streaming over one connection — REST requires WebSockets or SSE as separate protocols. Code generation: one .proto file generates clients in Go, Python, Java simultaneously. For public APIs consumed by browsers, REST is still preferable because browser support for gRPC requires the grpc-web proxy layer.' },
      { q: 'How do Protocol Buffers handle backward and forward compatibility?', a: 'Protobuf is designed for schema evolution. Rules: never change a field number — it is the identity of the field in the binary format. Never change the type of an existing field. Adding new fields with new numbers is safe — old clients ignore unknown fields (forward compatibility) and new clients receive zero values for missing fields from old servers (backward compatibility). Remove fields by marking them reserved using the reserved keyword so the number and name cannot be accidentally reused. Enums: adding new values is forward-compatible; old clients receive the default (0) for unknown enum values. These rules mean Protobuf services can evolve their schemas without API versioning as long as the rules are followed.' },
      { q: 'How do you load-balance gRPC services in Kubernetes?', a: 'gRPC over HTTP/2 requires L7 (application-layer) load balancing for proper request distribution. Options in Kubernetes: a service mesh like Istio or Linkerd intercepts gRPC connections via a sidecar proxy and load-balances at the individual RPC level — each pod gets a share of requests regardless of connection count. This is best for polyglot environments. Headless Service plus client-side load balancing: create a Kubernetes Headless Service (clusterIP: None). DNS resolution returns all pod IPs. Use the gRPC built-in round-robin resolver in the client to distribute RPCs across all pod IPs — fast with no proxy overhead. L7 Ingress or Gateway: AWS ALB or NGINX with gRPC protocol support terminates HTTP/2 at the load balancer and distributes individual RPCs to backends — use this for north-south gRPC traffic from external clients.' },
    ],
    references: [
      'https://grpc.io/docs/',
      'https://protobuf.dev/',
    ],
    visualizations: [
      { title: 'gRPC vs REST Architecture', caption: 'REST: HTTP/1.1 plus JSON, no schema enforcement, one connection per request. gRPC: HTTP/2 plus Protobuf binary encoding, generated typed stubs, multiple RPCs multiplexed over one connection. Bidirectional streaming: both client and server push messages asynchronously over one HTTP/2 connection.', image: '/diagrams/linkdiags/grpc-protobuf.png' },
    ],
  },
];
