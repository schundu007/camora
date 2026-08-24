// Kubernetes — Bare Metal & Production Setup.
//
// Tier 1: kubernetes.io /docs/setup/production-environment/ (CC BY 4.0,
// paraphrased), fetched 2026-08-24. Tier 2: metallb.io, kube-vip.io.
// Tier 3: practitioner reporting on etcd disk latency and storage trade-offs,
// corroborated across independent authors per the spec's source-tier rule.
//
// Category wiring: 'k8s-baremetal' in devopsCategories.

export const k8sBareMetalTopics = [
  {
    id: 'k8s-baremetal-end-to-end',
    title: 'Deploying Kubernetes on Bare Metal — End to End',
    icon: 'hardDrive',
    color: '#ea580c',
    questions: 18,
    description:
      'The whole build in order, from racked hardware to running workloads: node baseline and containerd, an API-server VIP with kube-vip, a kubeadm HA control plane, CNI, workers, MetalLB and ingress, storage, an observability baseline, and the day-2 drills that decide whether the cluster survives. Real commands and manifests, not prose about them.',
    introduction: `Every piece of this exists as its own topic. What does not exist anywhere — including on kubernetes.io — is the order, and the order is most of the difficulty. The docs are organised by concept; a build is organised by dependency. Get the sequence wrong and you discover it late: you cannot add a control-plane VIP after \`kubeadm init\` without regenerating certificates, and you cannot change a node's cgroup driver without rebuilding the node.

There is one fact that reframes the whole exercise, stated plainly in the kubeadm HA guide: a bare-metal kubeadm cluster **does not support Service objects of type LoadBalancer, and does not support dynamic PersistentVolumes**. On a cloud provider, the cloud-controller-manager supplies both. On bare metal there is no CCM, so a cluster that has completed \`kubeadm init\` and installed a CNI is *not yet usable* — every \`type: LoadBalancer\` Service sits in \`<pending>\` forever and every PVC stays \`Pending\`. Steps 7 and 8 below are not enhancements; they replace a component you do not have.

The second thing to internalise is that etcd is the cluster. Practitioner consensus, and the reason on-premises clusters most often go unstable, is disk latency: etcd is deliberately sensitive to it, and a leader that cannot fsync its Raft log in time loses leadership. Past a threshold that becomes a leader-election storm where no leader holds the lease long enough to make progress, and the visible symptom is \`kubectl\` hanging. Give etcd a dedicated SSD or NVMe device, never the OS disk. This is the single most common bare-metal HA mistake.

Work through the ten steps in order. Each links to the topic that covers its subject in depth; this one is the spine.`,
    topics: [
      {
        title: 'Steps 1–2 — Hardware, network, and the node baseline',
        content: `**Step 1 — Hardware and network prep.** Decide these before touching an OS, because several are painful to change later.

- *Out-of-band management.* BMC/IPMI/iDRAC/iLO reachable on a separate management VLAN. You will need console access to a node that will not boot, and you do not want that to require a trip to the rack.
- *NICs and bonding.* LACP bond across two switches where possible. Keep cluster traffic, storage traffic and management on separate VLANs — distributed storage will saturate a shared link and the first symptom will look like a Kubernetes problem.
- *MTU.* Pick it now and make it consistent end to end. Overlay CNIs encapsulate, so a 1500 MTU underlay leaves ~1450 usable inside the Pod network. Mismatched MTU produces the worst class of bug: small packets work, large ones hang.
- *DNS and NTP.* Both must work before anything else. Certificate validation fails on clock skew, and etcd is intolerant of it.
- *Disk layout.* Separate devices: OS, etcd (dedicated SSD/NVMe), and storage-node capacity. This is the etcd latency point above, in hardware form.
- *IP plan.* Reserve, from outside the DHCP range: the control-plane VIP, and a contiguous block for MetalLB. Write them down now — both appear in later steps.

**Step 2 — Node baseline.** Identical on every node, control plane and worker.

Kernel modules and sysctls. \`br_netfilter\` makes bridged traffic traverse iptables, which is how Service rules apply to Pod traffic; \`overlay\` backs the container filesystem:

\`\`\`bash
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
sudo modprobe overlay && sudo modprobe br_netfilter

cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF
sudo sysctl --system
\`\`\`

Swap. Historically disabled outright; swap support is now a supported configuration, but unless you have deliberately opted into it, disable swap and remove the fstab entry so it does not return on reboot.

Container runtime and the cgroup driver — the step most often got wrong. The kubelet and the runtime **must** use the same cgroup driver; two cgroup managers make the node unstable. kubeadm has defaulted to \`systemd\` since v1.22, and \`systemd\` is what you want on any systemd host, especially under cgroup v2. For containerd:

\`\`\`bash
containerd config default | sudo tee /etc/containerd/config.toml >/dev/null
# containerd 1.x
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl restart containerd
\`\`\`

On containerd 2.x the key lives under \`[plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes.runc.options]\` rather than the 1.x \`io.containerd.grpc.v1.cri\` path — check which you have before editing. Also confirm \`cri\` is **not** in \`disabled_plugins\`; a default config from some distributions disables it, and the node then fails to register with an opaque error.

Two constraints worth knowing now rather than later: from Kubernetes v1.26 only **CRI v1** is supported, so a runtime that only speaks the older API will fail node registration outright. And changing a node's cgroup driver after the fact requires reinstalling or replacing the node — it is not a live change.`,
      },
      {
        title: 'Steps 3–4 — API-server VIP and the kubeadm HA control plane',
        content: `**Step 3 — The API-server VIP, before \`kubeadm init\`.** The control plane needs a single stable endpoint that survives losing a node. Ordering matters: the VIP must exist *before* \`kubeadm init\`, because the endpoint is baked into the certificates and the kubeconfigs generated during init. Retrofitting it means regenerating certificates.

Two options:

- **kube-vip** — runs as a **static pod** on the control-plane nodes. That is the mechanism that makes it work at bootstrap: static pods are started by the kubelet from a manifest directory via the container runtime, with no API server involved, so the VIP is up before the API server it fronts exists. Leader election decides which node owns the VIP. ARP mode has one node answer ARP for the VIP on the local L2 segment; BGP mode advertises it to the fabric, which crosses subnet boundaries and suits larger or routed networks.
- **HAProxy + keepalived** — a pair of daemons on each control-plane node, keepalived holding the VRRP VIP and HAProxy doing TCP forwarding to port 6443.

Whichever you pick, the kubeadm guide is specific about the load balancer: **TCP forwarding** (not HTTP), a health check against port 6443, traffic distributed to all healthy control-plane nodes, and a resolvable DNS name rather than a bare IP. Verify before proceeding — this check costs nothing and saves a confusing init failure:

\`\`\`bash
nc -zv -w 2 <VIP_OR_DNS> 6443
\`\`\`

**Step 4 — Bootstrap the control plane.** Use a config file rather than a wall of flags: it is reviewable, diffable and reproducible, which matters when you rebuild this cluster in eighteen months.

\`\`\`yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
kubernetesVersion: v1.34.0
controlPlaneEndpoint: "k8s-api.example.internal:6443"   # the VIP from step 3
networking:
  podSubnet: "10.244.0.0/16"      # must match what the CNI expects
  serviceSubnet: "10.96.0.0/12"
apiServer:
  certSANs:                        # every name or IP clients may use
    - "k8s-api.example.internal"
    - "192.168.10.240"
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cgroupDriver: systemd
\`\`\`

\`certSANs\` is the field people forget. Anything not listed here — a second DNS name, the VIP, a NAT address — produces TLS errors later that read as authentication problems.

\`\`\`bash
sudo kubeadm init --config kubeadm-config.yaml --upload-certs
\`\`\`

\`--upload-certs\` stores the control-plane certificates in a \`kubeadm-certs\` Secret so the other control-plane nodes can pull them during join. That Secret is **deleted after two hours**; if you are slow, re-upload:

\`\`\`bash
sudo kubeadm init phase upload-certs --upload-certs
\`\`\`

Join the remaining control-plane nodes with the \`--control-plane\` form of the printed command, which carries both the token and the \`--certificate-key\`. Treat that key as a credential — it grants control-plane membership.

**Stacked or external etcd?** Stacked (the default) puts an etcd member on each control-plane node: fewer machines, but a node loss takes an API server and an etcd member together. External etcd runs on its own machines with its own disks: more hardware and more to operate, independent failure domains, and — the practical reason — etcd gets dedicated spindles. Stacked is fine to roughly 50 nodes provided etcd still has its own device. External becomes necessary when etcd I/O is heavy enough to starve the API server sharing the box. Either way, run 3 or 5 members; an even count needs the same quorum as the next lower odd count while adding write latency.`,
      },
      {
        title: 'What kubeadm init actually does — the phase breakdown',
        content: `\`kubeadm init\` is not a black box. It decomposes into named phases, each runnable on its own with \`kubeadm init phase <name>\`, which is how you customise a bootstrap without forking the tool. Knowing the phases is also how you debug a failed init: the error tells you which phase, and the phase tells you where to look.

In order:

**preflight** — checks system requirements: swap state, required ports free, container runtime responding, kernel modules loaded (\`br_netfilter\`, \`overlay\`). Most step-2 mistakes surface here, which is the good case — the alternative is a node that joins and then misbehaves.

**certs** — generates the PKI into \`/etc/kubernetes/pki/\`. This is the same certificate set you would create by hand in Kubernetes the Hard Way. **The CA key lives here and must be backed up**: lose it and every component certificate has to be regenerated, which means rebuilding the cluster's trust from scratch.

**kubeconfig** — writes kubeconfig files for admin, controller-manager and scheduler into \`/etc/kubernetes/\`.

**control-plane** — writes static pod manifests for kube-apiserver, kube-controller-manager and kube-scheduler into \`/etc/kubernetes/manifests/\`. The kubelet watches that directory and starts them. This is the same static-pod mechanism kube-vip uses in step 3, and it is what resolves the bootstrap chicken-and-egg: the components that serve the API are themselves started without the API.

**etcd** — writes \`/etc/kubernetes/manifests/etcd.yaml\` for a local (stacked) member, or skips entirely when external etcd is configured.

**wait-control-plane** — polls until the API server answers health checks. An init that hangs here usually means the kubelet cannot start the static pods: check \`journalctl -u kubelet\` and the cgroup driver from step 2.

**upload-config** — uploads the kubeadm and kubelet configuration to a ConfigMap in \`kube-system\`, so later joins and upgrades read the same settings.

**upload-certs** — optional; encrypts the control-plane certificates into a Secret for HA join. This is the two-hour Secret described above.

**mark-control-plane** — applies the \`node-role.kubernetes.io/control-plane:NoSchedule\` taint. On a single-node or small cluster you can remove it deliberately:

\`\`\`bash
kubectl taint nodes --all node-role.kubernetes.io/control-plane-
\`\`\`

**bootstrap-token** — creates the token workers use to join.

**kubelet-finalize** — switches the kubelet to client-certificate rotation, so its credentials renew themselves rather than expiring silently.

**addon** — deploys CoreDNS and kube-proxy. Note what is *not* here: no CNI. That is step 5, and it is why nodes are NotReady when init finishes successfully.`,
      },
      {
        title: 'Steps 5–6 — CNI and workers',
        content: `**Step 5 — Install a CNI.** Until this lands, nodes report \`NotReady\` and CoreDNS sits \`Pending\`. That is expected, not a fault — the kubelet reports NotReady precisely because no network plugin is configured.

The Pod CIDR must agree with what you set in \`kubeadm-config.yaml\`. Disagreement here is a classic silent failure: Pods get addresses from a range nothing routes, and cross-node traffic vanishes.

Choosing, on bare metal specifically:

- **Cilium** — eBPF dataflow, and it can replace kube-proxy outright rather than sitting alongside it. Strong observability (Hubble) and a mature NetworkPolicy implementation. The common 2026 default for new bare-metal clusters.
- **Calico** — BGP-native, which is a real advantage when you already run BGP to top-of-rack; can advertise Pod and Service routes into the fabric with no overlay and no encapsulation MTU cost.
- **Flannel** — simple, and does **not** enforce NetworkPolicy. Fine for a lab, wrong for anything with tenancy or compliance requirements.

If you take Cilium's kube-proxy replacement, note that it changes step 7: MetalLB's strict-ARP requirement is a kube-proxy IPVS concern, and with kube-proxy gone the interaction is different — check the Cilium LB documentation instead of applying the MetalLB IPVS guidance blindly.

Verify before moving on:

\`\`\`bash
kubectl get nodes                       # every node Ready
kubectl -n kube-system get pods         # CoreDNS Running, not Pending
kubectl run t --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default
\`\`\`

**Step 6 — Join workers and label them.** Plain \`kubeadm join\` with the token form (no \`--control-plane\`, no certificate key). Tokens expire after 24 hours by default; mint a fresh one with \`kubeadm token create --print-join-command\`.

Then label and taint deliberately, because scheduling decisions you do not make explicitly get made for you:

\`\`\`bash
kubectl label node worker-01 node-role.kubernetes.io/worker=
kubectl label node storage-01 node.example.com/storage=true
# keep general workloads off dedicated storage nodes
kubectl taint node storage-01 dedicated=storage:NoSchedule
\`\`\`

Control-plane nodes carry a \`NoSchedule\` taint by default. Removing it to reclaim capacity is a legitimate choice on a small cluster and a bad one on a large one — a workload that pressures memory on a control-plane node pressures etcd and the API server with it.`,
      },
      {
        title: 'Steps 7–8 — Service LoadBalancer, ingress, and storage (the missing CCM)',
        content: `These two steps exist because there is no cloud-controller-manager. The kubeadm HA guide says it directly: this setup does not work with \`type: LoadBalancer\` Services or dynamic PersistentVolumes. You are supplying both yourself.

**Step 7 — MetalLB and ingress.** Without it every \`type: LoadBalancer\` Service stays \`<pending>\` indefinitely.

If kube-proxy runs in **IPVS** mode you must enable strict ARP first, or MetalLB's L2 mode will not answer for the VIPs:

\`\`\`bash
kubectl get configmap kube-proxy -n kube-system -o yaml | \\
  sed -e "s/strictARP: false/strictARP: true/" | \\
  kubectl apply -f - -n kube-system
\`\`\`

Install (FRR-K8s mode is the recommended variant; pin the version rather than tracking a branch):

\`\`\`bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.16.1/config/manifests/metallb-frr-k8s.yaml
\`\`\`

MetalLB starts **idle** until you give it an address pool and an advertisement — a common "it installed but nothing happens" moment:

\`\`\`yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata: { name: prod-pool, namespace: metallb-system }
spec:
  addresses: ["192.168.10.200-192.168.10.239"]   # outside DHCP, from step 1
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata: { name: prod-l2, namespace: metallb-system }
spec:
  ipAddressPools: [prod-pool]
\`\`\`

L2 versus BGP: L2 mode is the shortest path to something working, but every VIP is owned by a single node at a time, so it gives failover rather than load distribution and that node is a bandwidth chokepoint. BGP mode advertises to your routers and spreads traffic properly — the right answer at scale, and it requires cooperation from whoever runs the network. The common production split is kube-vip for the control-plane VIP (step 3) and MetalLB for application Services.

Then one ingress controller with a single \`type: LoadBalancer\` Service, so you consume one address from the pool rather than one per application.

**Step 8 — Storage.** Without a CSI driver and a default StorageClass, every PVC stays \`Pending\` and no StatefulSet starts.

- **local-path-provisioner** — node-local directories. Trivial to run, no replication: if the node dies, the data is gone. Legitimate for CI, caches and anything reconstructible.
- **Longhorn** — replicated block storage, straightforward to operate, good throughput. Reported weak spot is latency, and it wants a reasonably modern kernel.
- **Rook/Ceph** — the most capable and the most demanding. Rook abstracts Ceph's surface but not its operational model: placement groups, CRUSH maps and OSD tuning remain yours. It expects multiple nodes, multiple disks per node, dedicated OSDs and fast networking. On a small cluster it costs more than it returns, and small-block low-latency workloads are where practitioners report it struggling most.

Mark one class default, or every PVC without an explicit \`storageClassName\` hangs:

\`\`\`bash
kubectl patch storageclass longhorn \\
  -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
\`\`\``,
      },
      {
        title: 'Steps 9–10 — Observability baseline and the day-2 drills',
        content: `**Step 9 — Observability, before you need it.** Install this while the cluster is healthy, so you know what healthy looks like.

- **metrics-server** — not optional in practice: \`kubectl top\` and every HPA depend on it. On bare metal with self-signed kubelet certificates you will likely need \`--kubelet-insecure-tls\`, or better, fix the kubelet serving certificates properly.
- **kube-prometheus-stack** — Prometheus, Alertmanager, Grafana and the standard exporters. Give Prometheus a PVC from step 8; the default emptyDir loses history on every restart.
- **Logs** — Loki with Promtail, or your existing aggregator.

The alerts that actually matter on bare metal, and which no default bundle emphasises enough:

- **etcd disk fsync p99** — the leading indicator for the failure mode described in the introduction. Alert well before it becomes a leader-election storm. \`etcd_disk_wal_fsync_duration_seconds\` is the metric; p99 under 25 ms is the working SLO.
- **etcd leader changes** — a rising rate is the storm beginning.
- **Certificate expiry** — see step 10.
- **Node disk pressure** — bare metal has no autoscaler to hide behind.

**Step 10 — Day 2. The drills that decide whether this cluster survives.**

*Certificate expiry.* kubeadm control-plane certificates are valid for **one year**. They renew automatically on a control-plane upgrade, which is fine for clusters that get upgraded and fatal for the cluster nobody touched for thirteen months. Check and renew explicitly:

\`\`\`bash
kubeadm certs check-expiration
sudo kubeadm certs renew all      # then restart the control-plane static pods
\`\`\`

*etcd backup — and restore.* A backup you have never restored is not a backup:

\`\`\`bash
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-$(date +%F).db \\
  --endpoints=https://127.0.0.1:2379 \\
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \\
  --cert=/etc/kubernetes/pki/etcd/server.crt \\
  --key=/etc/kubernetes/pki/etcd/server.key
\`\`\`

Rehearse \`etcdctl snapshot restore\` on a scratch cluster. Time it. That number is your true RTO, and it is usually longer than anyone guessed.

*Upgrades.* \`kubeadm upgrade plan\`, then one control-plane node at a time, then \`kubectl drain\` each worker before upgrading its kubelet. Kubernetes supports a skew of one minor version between control plane and kubelets — you cannot jump two minors, so a cluster left three releases behind needs sequential upgrades.

*Node replacement.* Practise \`kubectl drain --ignore-daemonsets --delete-emptydir-data\`, rebuild, rejoin. On bare metal this is the operation you will perform most, and the first attempt should not be during an incident.

*Smoke test.* Keep a manifest that exercises the whole stack in one go — a Deployment, a \`type: LoadBalancer\` Service, a PVC and an Ingress. If all four become ready, steps 5 through 8 are genuinely working. Run it after every upgrade.`,
      },
      {
        title: 'Managed and semi-managed bare metal — EKS Anywhere, AKS Arc, and the distributions',
        content: `Most organisations do not hand-roll kubeadm. Knowing where the alternatives sit is usually more interview-relevant than the manual build.

**EKS Anywhere on bare metal (AWS).** Automates provisioning from bare hardware through cluster operation, built on **Tinkerbell** and Cluster API. The Tinkerbell components are worth knowing by name: *Boots* handles DHCP and network boot — handing out addresses, serving iPXE over HTTP and TFTP, delivering the iPXE script and running a syslog server; *Hegel* serves instance metadata; *Rufio* drives BMC power and boot-device control; *Tink* executes the provisioning workflows. You supply a hardware inventory CSV plus a cluster YAML:

\`\`\`bash
eksctl anywhere create cluster --hardware-csv hardware.csv -f eksa-mgmt-cluster.yaml
\`\`\`

The appeal is a single support relationship — EKS Anywhere Subscriptions cover the cluster components and the bundled open-source tooling, instead of you supporting MetalLB, Longhorn and a CNI separately.

**AKS enabled by Azure Arc (Microsoft).** Extends AKS to on-premises hardware, available on Azure Local, Windows Server and edge SKUs; AKS on bare metal deploys onto an Arc-enabled machine. Clusters connect to Arc automatically, which brings Azure Policy, Azure Monitor and GitOps to on-premises clusters. The **Arc Resource Bridge** is the lightweight Kubernetes VM linking on-premises resources to Azure control. Positioned for edge and remote sites where full hyperconverged infrastructure is overkill, and for sovereign or regulated environments — AKS on Azure Local can now run **entirely offline**, deploying, managing and updating without continuous Azure connectivity and syncing when it returns. Note the bare-metal variant is in preview; check status before designing around it.

**Distributions worth knowing.**

- **Talos Linux** — an immutable, API-driven OS with no shell and no SSH. Configuration is declarative and applied over an API. Eliminates most configuration drift by construction; the trade-off is that familiar Linux debugging does not apply.
- **RKE2 (SUSE/Rancher)** — FIPS-capable, CIS-hardened defaults, security-focused. Common where compliance drives the decision.
- **k3s** — single binary, low footprint, defaults to SQLite rather than etcd. Excellent at the edge; the datastore default is the thing to check before treating it as an HA control plane.
- **Cluster API bare-metal providers** — Metal³ and Tinkerbell, letting you manage bare-metal clusters declaratively with the same Cluster API primitives used in the cloud.

**How to choose.** kubeadm when you need to understand and control every layer or have unusual constraints. A distribution when you want opinionated defaults and less to assemble. A managed offering when the operational burden matters more than the control, or when a support contract is a requirement rather than a preference.`,
      },
    ],
    quickFire: [
      { q: 'What two things does a bare-metal kubeadm cluster NOT support out of the box?', a: 'Service type=LoadBalancer and dynamic PersistentVolumes. The kubeadm HA guide states both. There is no cloud-controller-manager, so you supply MetalLB (or equivalent) and a CSI driver yourself.' },
      { q: 'Why must the control-plane VIP exist before kubeadm init?', a: 'The endpoint is baked into the generated certificates and kubeconfigs. Adding it afterwards means regenerating certificates.' },
      { q: 'How does kube-vip provide a VIP before the API server exists?', a: 'It runs as a static pod. The kubelet starts static pods from a manifest directory via the container runtime with no API server involved, so the VIP is up before the API server it fronts.' },
      { q: "What's the single most common bare-metal HA mistake?", a: 'Running etcd on the same disk as the host OS. etcd needs a dedicated SSD or NVMe.' },
      { q: 'Why is etcd disk latency so dangerous?', a: 'etcd is deliberately latency-sensitive. A leader that cannot fsync its Raft log in time loses leadership; past a threshold this becomes a leader-election storm where no leader holds the lease long enough to progress. Hanging kubectl on-prem points here first.' },
      { q: "What's the etcd fsync SLO and which metric tracks it?", a: 'p99 under 25 ms, via etcd_disk_wal_fsync_duration_seconds. Alert on it before it becomes an election storm.' },
      { q: 'What happens if the kubelet and container runtime use different cgroup drivers?', a: 'Two cgroup managers make the node unstable. They must match — systemd on any systemd host. kubeadm has defaulted to systemd since v1.22.' },
      { q: 'Can you change a node\'s cgroup driver in place?', a: 'No. It requires reinstalling or replacing the node.' },
      { q: 'Which containerd setting is required, and where does it live?', a: 'SystemdCgroup = true. Under io.containerd.grpc.v1.cri on containerd 1.x, and io.containerd.cri.v1.runtime on 2.x. Also confirm cri is not in disabled_plugins.' },
      { q: 'What CRI version is required from Kubernetes v1.26?', a: 'CRI v1 only. A runtime supporting only the older API fails node registration.' },
      { q: 'Which kernel modules and sysctls does a node need?', a: 'Modules overlay and br_netfilter; sysctls net.ipv4.ip_forward=1 and bridge-nf-call-iptables/ip6tables=1. br_netfilter is what makes Service iptables rules apply to bridged Pod traffic.' },
      { q: 'Why are nodes NotReady immediately after kubeadm init?', a: 'No CNI yet. The kubelet reports NotReady until a network plugin is configured, and CoreDNS stays Pending. Expected, not a fault.' },
      { q: 'What does --upload-certs do, and what is the catch?', a: 'Stores control-plane certs in a kubeadm-certs Secret so other control-plane nodes can pull them on join. The Secret is deleted after two hours; re-upload with kubeadm init phase upload-certs --upload-certs.' },
      { q: 'What is certSANs for and what breaks without it?', a: 'Every DNS name or IP clients may use to reach the API server. A name not listed produces TLS errors that read like authentication failures.' },
      { q: 'When does MetalLB need strict ARP?', a: 'When kube-proxy runs in IPVS mode — set strictARP: true in the kube-proxy ConfigMap, or L2 mode will not answer for the VIPs. Unnecessary with kube-router, and different again if a CNI has replaced kube-proxy.' },
      { q: 'MetalLB L2 versus BGP mode?', a: 'L2 is the fastest path to working, but one node owns each VIP at a time — failover, not load distribution, and that node is a bandwidth chokepoint. BGP advertises to your routers and spreads traffic; it needs network-team cooperation.' },
      { q: 'Why does MetalLB do nothing after install?', a: 'It starts idle. It needs an IPAddressPool plus an L2Advertisement or BGPAdvertisement before it allocates anything.' },
      { q: 'How long are kubeadm certificates valid, and when do they renew?', a: 'One year. They renew automatically on a control-plane upgrade — so the cluster nobody upgrades is the one that expires. Check with kubeadm certs check-expiration.' },
      { q: 'What version skew does Kubernetes allow between control plane and kubelets?', a: 'One minor version. You cannot skip a minor release, so a cluster three releases behind needs sequential upgrades.' },
      { q: 'What are the Tinkerbell components in EKS Anywhere bare metal?', a: 'Boots (DHCP, iPXE over HTTP/TFTP, syslog), Hegel (instance metadata), Rufio (BMC power and boot control), Tink (provisioning workflows). Driven from a hardware CSV plus a cluster YAML via eksctl anywhere create cluster.' },
      { q: 'What is the Arc Resource Bridge?', a: 'The lightweight Kubernetes VM connecting on-premises Azure Local resources to Azure, enabling AKS enabled by Azure Arc — including fully offline operation for sovereign or disconnected sites.' },
      { q: 'When would you pick Talos over kubeadm?', a: 'When configuration drift is the main risk. Talos is immutable and API-driven with no shell or SSH, so drift is eliminated by construction — at the cost of losing familiar Linux debugging.' },
      { q: 'Longhorn versus Rook/Ceph on a small cluster?', a: 'Longhorn — simpler to operate and fast on most measures except latency. Rook abstracts Ceph\'s surface but not its operational model (placement groups, CRUSH maps, OSD tuning), and expects many nodes, many disks and fast networking; on small clusters it costs more than it returns.' },
      { q: 'Why does every PVC hang on a fresh bare-metal cluster?', a: 'No default StorageClass. Annotate one with storageclass.kubernetes.io/is-default-class=true, or every PVC without an explicit storageClassName stays Pending.' },
    ],
    references: [
      'https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/',
      'https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/',
      'https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/',
      'https://kubernetes.io/docs/setup/production-environment/container-runtimes/',
      'https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/',
      'https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/',
      'https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/',
      'https://metallb.io/installation/',
      'https://metallb.io/configuration/',
      'https://kube-vip.io/docs/',
      'https://longhorn.io/docs/',
      'https://rook.io/docs/rook/latest/Getting-Started/intro/',
      'https://anywhere.eks.amazonaws.com/docs/getting-started/baremetal/overview/',
      'https://anywhere.eks.amazonaws.com/docs/getting-started/baremetal/tinkerbell-overview/',
      'https://learn.microsoft.com/en-us/azure/aks/aksarc/aks-bare-metal-overview',
      'https://learn.microsoft.com/en-us/azure/aks/aksarc/cluster-architecture',
      'https://etcd.io/docs/v3.5/op-guide/hardware/',
      'https://www.talos.dev/latest/introduction/what-is-talos/',
    ],
  },
];

export const k8sBareMetalTopicCategoryMap = {
  'k8s-baremetal-end-to-end': 'k8s-baremetal',
};
