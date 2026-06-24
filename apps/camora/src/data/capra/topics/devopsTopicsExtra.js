export const devopsExtraTopicCategoryMap = {
  'k8s-pod-networking': 'orchestration',
  'k8s-network-policy-guide': 'orchestration',
  'k8s-traffic-flow-deep': 'orchestration',
  'k8s-deployment-strategies-guide': 'orchestration',
  'k8s-pod-troubleshooting-guide': 'orchestration',
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
    introduction: `Every Pod in Kubernetes receives its own unique, routable IP address — this is the fundamental networking contract of the platform. Pod IPs are ephemeral: they change whenever a Pod restarts or is rescheduled. Services provide the stable IP and DNS name that the rest of the cluster uses.

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
    introduction: `Kubernetes NetworkPolicy resources act as firewall rules for Pods inside the cluster. They are the primary tool for implementing the principle of least privilege at the network layer.

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
    introduction: `Understanding how a user request travels from a browser to a Kubernetes Pod and back is essential for both architecture decisions and incident debugging. Seven components participate in the journey, each with a distinct role.

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
    introduction: `Choosing the right deployment strategy determines how much risk you accept per release and how quickly you can recover from a bad deployment.

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
    introduction: `Kubernetes is a complex distributed system but it exposes rich diagnostic information. Nearly every problem can be diagnosed with kubectl if you know which command to run and what to look for. The Events section in kubectl describe output is the single most valuable source of truth.

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
    introduction: `Ansible provides two levels of reuse: Roles (within a project) and Collections (across projects and teams).

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
    introduction: `A well-structured Ansible project is self-documenting, easy to test, and scales to hundreds of hosts without becoming unmanageable. The standard layout separates concerns: inventory (where), variables (what values), roles (how), and playbooks (when and for whom).

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
    introduction: `Running Terraform manually is fine for experiments. Running it in production without a CI/CD pipeline is dangerous: no peer review, no audit trail, no policy enforcement, and no protection against two people applying simultaneously.

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
    introduction: `Both count and for_each create multiple instances of a resource or module, but they differ fundamentally in how they identify each instance — and that difference has major production safety implications.

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
    introduction: `Terraform state is a JSON file (terraform.tfstate) that records the real infrastructure Terraform manages. It maps .tf resource definitions to actual cloud resource IDs, attributes, and dependencies. Without accurate state, Terraform cannot plan or destroy correctly.

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
    introduction: `Jenkins uses a Controller-Agent (formerly Master-Slave) architecture to distribute work across machines. Understanding this split is foundational to designing scalable Jenkins deployments.

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
    introduction: `A Jenkinsfile is a text file checked into the source repository that defines the entire CI/CD pipeline as code. Jenkins reads it automatically when a build triggers. Having the pipeline definition in the repository provides version control, peer review, and reproducibility.

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
    introduction: `DevSecOps integrates security practices into every stage of the software development lifecycle rather than treating security as a phase at the end. The principle: "shift left" — find and fix security issues when they are cheapest, at the code commit stage, not in production.

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
    introduction: `High Availability (HA) means designing a system to operate continuously with minimal downtime, even when individual components fail. Production systems are designed to SURVIVE failure, not avoid it.

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
    introduction: `Every modern cloud and Kubernetes networking stack uses the overlay-underlay model. Understanding it explains how pods on different nodes communicate, why there are two IP headers in a packet trace, and what happens when VXLAN breaks.

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
];
