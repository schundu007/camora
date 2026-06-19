# Infrastructure Decisions — Architecture Decision Record

## Decision: Docker Bridge Networks over Firecracker/Cloud Hypervisor

**Status**: Active  
**Date**: June 2026  
**Author**: Sudhakar Chundu

---

## 1. The Question

For the etcd-cluster playground environment, each etcd node needs a distinct hostname
and a routable IP address so it can form real peer-to-peer TCP connections. When
evaluating how to implement this, the question arose:

> Can we use Firecracker or Cloud Hypervisor to give each etcd node a real
> microVM with its own kernel and IP address — the same approach iximiuz Labs uses?

---

## 2. What iximiuz Labs Does

iximiuz Labs is the closest competitor to Camora's playground feature and sets the
quality bar for browser-based infrastructure practice environments.

Their architecture for multi-node cluster environments:

- **Hypervisor**: Firecracker microVMs (AWS open-source, written in Rust)
- **Each VM gets**:
  - A real Linux kernel (6.1.x)
  - 3 vCPU, 3 GB RAM, 40 GB virtual disk
  - A dedicated network interface with a real IP in a private subnet (172.16.0.0/24)
  - Hardware-level isolation from other VMs on the same host
- **Networking**: Each node has its own IP address. DNS resolves `node-01`, `node-02`,
  `node-03` to real IPs. mTLS is configured between all peers using a CA generated
  on node-01 and SCP'd to the others during init.
- **OCI image**: `ghcr.io/sagikazarmark/iximiuz-labs/playgrounds/etcd:live`
- **Init sequence** (systemd units):
  1. `init_wait_ca` — wait for CA certificate from node-01 via shared volume
  2. `init_tls` — generate node certificate signed by the CA
  3. `init_start` — start etcd with TLS peer URLs
- **Helper scripts** at `/usr/share/etcd/`:
  - `generate-pki.sh` — creates CA + node certs
  - `configure.sh` — writes etcd systemd unit with correct peer URLs

This approach gives 100% fidelity: real kernel isolation, real network namespaces,
real hardware-level fault simulation. It is the gold standard.

---

## 3. Infrastructure Investigation

Before deciding, the current worker node was inspected:

```
Worker:   172.104.210.63
Provider: Linode (shared VM plan)
Kernel:   5.15.0-177-generic
CPU:      AMD EPYC 7642 (2 vCPUs visible to the VM)
RAM:      3.8 GB total
Disk:     ~80 GB
```

### KVM availability check

```bash
# On the worker:
ls -la /dev/kvm
# ls: cannot access '/dev/kvm': No such file or directory

grep -E 'vmx|svm' /proc/cpuinfo
# (no output)
```

`/dev/kvm` is absent. The hypervisor that runs the Linode VM strips the `vmx`/`svm`
CPU flags before exposing virtual CPUs to the guest. This is standard behavior for
shared (multi-tenant) VM plans — the cloud provider cannot allow guest VMs to access
the hardware hypervisor extensions because that would expose the host's hypervisor
interface to untrusted tenants.

**Firecracker requires `/dev/kvm`.** It uses KVM directly (no QEMU layer). Without
`/dev/kvm`, Firecracker exits immediately on startup.

**Cloud Hypervisor** (Microsoft's Rust hypervisor, similar to Firecracker) also
requires `/dev/kvm`.

**QEMU with KVM acceleration** requires `/dev/kvm`.

**QEMU without KVM** (TCG software emulation) works without `/dev/kvm` but runs at
roughly 1/10th native CPU speed. A 3-node etcd cluster in QEMU TCG would be
unusably slow for interactive practice.

---

## 4. Options Evaluated

| Option | What | KVM needed | Additional infra cost | Eng effort | Educational fidelity |
|---|---|---|---|---|---|
| **Docker bridge networks** | Docker bridge with DNS aliases, real inter-container TCP | No | $0 | ~1 week | 90% |
| Linode Dedicated CPU | Upgrade current worker to Dedicated plan | Yes (native) | +$36/mo (4 vCPU / 8 GB plan) | 3–4 weeks | 100% |
| Fly.io Machines | Managed Firecracker via Fly.io API — no KVM mgmt required | No (Fly handles it) | ~$0.04–$0.08/session-hour | 1–2 weeks | 95% |
| Hetzner bare-metal | Dedicated server (AX41-NVMe) | Yes (native) | ~$50/mo | 3–4 weeks | 100% |
| Cloud Hypervisor | Run on upgraded dedicated host | Yes (native) | Same as dedicated host | 4–5 weeks | 100% |
| QEMU TCG | Software emulation, no KVM | No | $0 | 2–3 weeks | 85% (slow) |

### Docker bridge networks — detail

Docker's bridge networking provides each container with its own network namespace
and a virtual ethernet interface. Within a named bridge network (`--network pg-net-X`),
containers can reach each other by hostname via Docker's embedded DNS resolver
(127.0.0.11). Assigning `--network-alias etcd1` to a container means any other
container in the same network can resolve `etcd1` to that container's IP.

This gives:
- Real TCP connections between etcd peers (not mocked, not loopback tricks)
- Real Raft consensus running over those TCP connections
- Real leader election, real log replication, real split-brain handling
- Hostnames etcd1/etcd2/etcd3 resolve to distinct IPs

What it does not give (see section 7) is kernel isolation or real hardware
fault simulation.

### Fly.io Machines — detail

Fly.io runs Firecracker under the hood and exposes a Machines API that lets you
start/stop microVMs programmatically. This would be a near-drop-in replacement for
the `nomadClient.js` SSH/Docker layer:

- Replace `sshExec(docker run ...)` with `POST /v1/apps/{appId}/machines`
- Each etcd node gets a real Firecracker VM with its own IP on Fly's WireGuard mesh
- No KVM management required — Fly's infrastructure handles it
- Pricing: ~$0.0000032/vCPU-second, ~$0.0000016/MB-second RAM
  → A 3-node etcd cluster (1 vCPU, 512MB each) costs ~$0.06/hour of session time
- The frontend and session API remain completely unchanged

This is the most attractive upgrade path: no infrastructure to manage, near-100%
fidelity, and the backend swap is contained to `nomadClient.js`.

### Linode/Hetzner dedicated — detail

Upgrading to a dedicated CPU plan (or moving to bare metal) would enable `/dev/kvm`
because the host CPU's virtualization extensions would be available directly to the VM.
From there, either Firecracker or Cloud Hypervisor could run natively.

- **Linode Dedicated 4 CPU / 8 GB**: $36/month. Adds ~$432/year operating cost.
- **Hetzner AX41-NVMe** (bare metal, 6-core Xeon, 64 GB RAM, 2× 512 GB NVMe): €49/month.
  Better hardware for less money, but requires managing OS, Docker, security updates,
  network config from scratch.

Both options require significant engineering to implement Firecracker or Cloud
Hypervisor orchestration, plus ongoing ops burden.

---

## 5. The Decision

**Docker bridge networks are the correct choice for now.**

Reasons:

1. **Zero additional infrastructure cost.** The current Linode shared VM costs ~$20/month.
   Adding Fly.io, a dedicated VM, or bare metal would 2–3× the infrastructure spend
   before the first paying customer has used the feature. For a bootstrapped product,
   this is not viable.

2. **Educational value is 90% identical.** The things etcd interviews actually test —
   Raft consensus behavior, leader election timing, quorum requirements, split-brain
   prevention, member add/remove protocol, snapshot/restore procedure — all work
   identically over Docker bridge TCP as they do over real VM network interfaces. The
   etcd binary does not know or care whether the peer URL resolves to a VM IP or a
   container IP. Raft runs the same protocol either way.

3. **Implementation is in scope for one week.** `createClusterNetwork` and
   `scheduleClusterNode` in `nomadClient.js` are ~30 lines of code. The cluster session
   path in `sessionManager.js` is ~50 lines. The total implementation is already built.
   A Firecracker integration would require weeks of new infrastructure work with no
   user-visible educational benefit for 90% of what users need to learn.

4. **The worker pool architecture is designed for easy upgrade.** `nomadClient.js`
   exports a stable interface. Swapping the implementation to call Fly.io Machines API
   or a Firecracker HTTP API requires changing exactly one file. No routes, no session
   schema, no frontend code changes are needed.

5. **Revenue unlock path is clear.** Two Pro subscribers ($58/month combined) cover a
   Linode Dedicated upgrade. At that point, `/dev/kvm` becomes available and Firecracker
   can run natively on the same worker node, with no migration needed on the session or
   frontend side.

---

## 6. Migration Path

When revenue justifies upgrading to higher-fidelity VM isolation:

### Path A: Linode Dedicated (minimal change)

1. Upgrade Linode worker to Dedicated CPU plan
2. `/dev/kvm` appears in the guest
3. Install Firecracker binary on the worker
4. Replace `scheduleClusterNode()` SSH docker run commands with Firecracker VM launch
   via the Firecracker REST API (or `firectl` CLI)
5. Each VM gets a tap interface bridged to a session-specific bridge
6. Node IPs are deterministic (172.18.{sessionIndex}.{nodeIndex}/24)
7. Update `getTaskAddress()` to wait for ttyd port inside the VM (same polling logic,
   different address resolution)

**Frontend change**: None.  
**Session schema change**: None.  
**API change**: None.

### Path B: Fly.io Machines API (no KVM management)

1. Create a Fly.io app for playground workers
2. Implement `nomadClient.js` adapter that calls `POST /v1/apps/{app}/machines` instead
   of SSH `docker run`
3. Each machine gets a Fly WireGuard IP visible to playground-backend (also on Fly)
4. Cluster networking: create a Fly private network, start machines in it — Fly's
   WireGuard mesh handles inter-machine routing
5. `getTaskAddress()` polls Fly machine status API instead of `docker port`

**Frontend change**: None.  
**Session schema change**: `ttyd_host` stores Fly machine IP instead of worker IP.  
**API change**: None.

### Path C: Cloud Hypervisor (advanced, maximum fidelity)

Same as Path A but using Cloud Hypervisor instead of Firecracker. Cloud Hypervisor
supports virtio-net with macvtap and can provide real hardware-level fault injection
(CPU hot-unplug, memory balloon, etc.) which Firecracker does not support. This is the
iximiuz-level experience. Requires significant engineering and a dedicated host.

---

## 7. What Docker Networks Cannot Do

To be honest about the gaps between Docker bridge and real microVMs:

| Capability | Docker bridge | Firecracker VM |
|---|---|---|
| Real TCP between nodes | Yes | Yes |
| Raft consensus | Yes (identical) | Yes |
| Leader election | Yes (identical) | Yes |
| Split-brain protection | Yes (identical) | Yes |
| Member add/remove | Yes (identical) | Yes |
| Snapshot/restore | Yes (identical) | Yes |
| Kernel-level isolation | No | Yes |
| Custom kernel version | No | Yes |
| `iptables` / network namespace | Shared with host | Dedicated per VM |
| Hardware fault injection | No | Partial (via Firecracker API) |
| NUMA / CPU topology testing | No | Yes (if host supports it) |
| Real disk I/O simulation | No (tmpfs) | Yes (block device) |
| mTLS between peer URLs | Possible but not implemented | iximiuz implements this |
| Port collisions across sessions | Must avoid (single host network) | Not possible (separate VMs) |
| Container escape risk | Present (mitigated by no --privileged) | Mitigated by VM boundary |

The items marked "identical" cover approximately 90% of what SRE and platform engineering
interviews assess. The remaining 10% — kernel internals, real disk I/O paths, hardware
fault simulation — are niche topics unlikely to appear in a technical interview.

---

## 8. Security Posture

Neither approach provides strong multi-tenant isolation at the kernel level. On the
current worker:

- Containers run without `--privileged` and without any `--cap-add` flags
- The `pgrunner` SSH user has Docker socket access but no sudo
- No shared volumes between sessions
- Each session's bridge network is isolated from other sessions' networks by Docker's
  iptables rules
- Container images are controlled (Camora-owned Docker Hub namespace)

This is acceptable for a platform where users are authenticated and the attack surface
is a learning environment, not a production workload. If user-provided images were
supported in `etcd-cluster`, the security model would need re-evaluation before
enabling that.

The planned migration to Firecracker would raise the security bar significantly by
adding a VM boundary between tenant workloads.
