# Known Issues and Limitations

Current as of June 2026. Items are ordered roughly by user impact.

---

## 1. Single Worker RAM Constraint

**What**: The worker node has 3.8 GB total RAM. A 3-node etcd cluster consumes
approximately 1.5 GB (3 × 512 MB limit) plus the host OS and Docker daemon overhead
(~600 MB). That leaves roughly 1.7 GB for other concurrent sessions.

**Impact**: Running two simultaneous etcd-cluster sessions is possible but tight. Three
simultaneous etcd-cluster sessions will push the worker into memory pressure and cause
the OOM killer to terminate containers.

**Workaround**: The memory limits (`MEMORY_MB` in `nomadClient.js`) enforce per-container
caps, but Docker does not prevent the total across all containers from exceeding physical
RAM. The cleanup sweep runs every 5 minutes, which means zombie containers from expired
sessions may still be consuming RAM.

**Planned fix**: When concurrent paid users grow to ~10, upgrade the Linode worker to
a higher-RAM plan (16 GB) or add a second worker node. The `WORKER_HOST` environment
variable is already abstracted — pointing it at a different IP is all that is needed
to switch workers.

---

## 2. Docker Pull Delay on Cold Start

**What**: Every `docker run` call passes `--pull=always`. If the image has been updated
since the last pull, Docker fetches the new layers before starting the container.

**Impact**: First launch of an environment can take 5–15 seconds longer than expected
if the image was recently pushed. Users see a stalled progress indicator during this
period.

**Workaround**: Subsequent sessions on the same image are fast because the layer cache
is warm on the worker (Docker only pulls changed layers). The progress log stream via
`docker logs -f` will be silent during the pull phase, which can look like the session
has stalled.

**Planned fix**: Pre-pull images on the worker via a scheduled `docker pull` cron job
(e.g., every 30 minutes) so the cache is always fresh and `--pull=always` never has
to download at session creation time. Alternatively, switch to `--pull=missing` and
manage cache invalidation manually on image push.

---

## 3. No /dev/kvm — Firecracker Impossible on Current Worker

**What**: The Linode shared VM plan does not expose `/dev/kvm` or CPU virtualization
flags to the guest. Firecracker and Cloud Hypervisor both require `/dev/kvm`.

**Impact**: Each etcd "node" is a Docker container sharing the host kernel, not a
true VM. There is no kernel-level isolation between nodes. Hardware fault simulation
and custom kernel versions are not possible.

**Educational impact**: Low. Raft consensus, leader election, member management, and
snapshot/restore all behave identically over Docker bridge TCP. The 10% of educational
fidelity that is missing covers kernel internals and hardware fault paths unlikely to
appear in technical interviews.

**Planned fix**: See `infrastructure-decisions.md` — migration path A (Linode Dedicated)
or path B (Fly.io Machines). Two Pro subscribers fund the Dedicated CPU upgrade.

---

## 4. Session TTL: Data Lost on Expiry

**What**: Sessions expire after 1 hour (extendable once by 15 minutes). When a session
is destroyed — whether by expiry, user action, or the cleanup sweep — all container
data is gone. etcd data, shell history, installed packages, and any files created
inside the container do not persist.

**Impact**: Users who are mid-lab when their session expires lose all work. The
15-minute extend mitigates this but only once per session.

**Workaround**: etcd labs that involve snapshot exercises teach users to save state
to `/tmp/etcd-backup.db`. Users can copy the snapshot out via the IDE (code-server)
file manager before the session ends.

**Planned fix**: The `playground_saved_vms` table and `vmSaver.js` / `r2Client.js`
modules are scaffolded for snapshotting container filesystems to R2 object storage.
When implemented, Pro users will be able to save and restore their container state
across sessions.

---

## 5. No TLS Between Cluster Nodes

**What**: etcd peer URLs in the cluster environment use `http://` not `https://`.
Traffic between nodes (Raft log replication, heartbeats) is unencrypted.

**Impact**: None in practice. All three containers run on the same host and communicate
over a Docker bridge network interface (`docker0` or a named bridge). This traffic never
leaves the host machine and is not exposed to any external network.

**Educational gap**: Real production etcd clusters use mTLS between peers (iximiuz
implements this). Users practicing here will not see the TLS configuration that
Kubernetes clusters use in production.

**Planned fix**: Add a CA generation step to the cluster bootstrap (node etcd1 generates
a CA and etcd certificate, etcd2 and etcd3 generate CSRs and get certificates signed
before starting). This is purely a container image and configure.sh change — no
backend or frontend changes needed.

---

## 6. Port Exhaustion Under High Load

**What**: Docker maps container ports to random host ports from the kernel's ephemeral
port range (`net.ipv4.ip_local_port_range`, default 32768–60999). That is ~28,000
available ports. Each single-container session uses 2 ports; each cluster session uses 6.

**Impact**: At ~10,000 concurrent single-container sessions or ~4,600 concurrent cluster
sessions, the ephemeral port range would exhaust. At current scale this is not a concern,
but it is a hard ceiling.

**Workaround**: Check current ephemeral range on the worker:
```bash
cat /proc/sys/net/ipv4/ip_local_port_range
# 32768   60999
```

If needed, expand it:
```bash
sysctl -w net.ipv4.ip_local_port_range="1024 65535"
```

Adding a second worker node is the correct fix at scale, as port exhaustion on one
worker would not affect the other.

---

## 7. Single Point of Failure

**What**: There is one worker node (`172.104.210.63`). All container sessions run on it.

**Impact**: If the worker goes down (kernel panic, Linode hardware failure, OOM,
accidental reboot), all active sessions terminate immediately. Users lose all in-progress
work with no warning.

**Current mitigation**: None. The cleanup sweep and TTL system handle normal expiry,
but there is no failover worker.

**Planned fix**: The `WORKER_HOST` environment variable in `nomadClient.js` is the only
place the worker IP is referenced. Adding a second worker requires:
1. Provision a second VM, install Docker, add the SSH key for `pgrunner`
2. Implement worker selection in `scheduleJob` / `scheduleClusterNode` (round-robin or
   least-loaded)
3. Store which worker a session is on in `playground_sessions.ttyd_host` (already done —
   `ttyd_host` stores the worker IP and is used for all proxy connections)

This is a ~1 day backend change when needed.

---

## 8. etcd-cluster Formation Timing

**What**: All three cluster node containers must start and be able to communicate within
the etcd bootstrap timeout. If any node takes too long to start (e.g., due to image
pull or host CPU contention), the other nodes may time out waiting for quorum during
initial bootstrap.

**Impact**: Rare but observed during high-load periods or immediately after an image
push (cold pull on all three containers). The session is created successfully (ports
resolve), but when the user opens the terminal, etcd is in an error state or has not
finished forming the cluster.

**Workaround**: The backend starts all three containers with `Promise.all()`, which
fires the docker run commands in parallel (good). The bottleneck is the worker's ability
to start three containers simultaneously. If the worker is under memory pressure from
other sessions, container startup can be delayed.

**Workaround for users**: If the cluster shows etcd errors on first open, wait 10–15
seconds and run `etcdctl member list` to check status. If it still fails, destroy the
session and create a new one.

**Planned fix**: The primary node (etcd1) should emit `__PROGRESS__:{"step":"cluster-ready","status":"done"}` only after polling `etcdctl endpoint health --cluster` and confirming all 3 nodes are healthy. This requires adding a health-check loop to the container's init script, which is an image-level change.

---

## 9. code-server /pg-ide WebSocket Upgrade Leaks Headers

**What**: The WebSocket upgrade handler for `/pg-ide` (IDE proxy) uses a raw `net.connect`
TCP tunnel and forwards all original HTTP headers verbatim, including hop-by-hop headers
like `connection`, `upgrade`, and `sec-websocket-*`. This is correct for the upgrade
handshake but means any proxy-specific headers from Railway's load balancer are also
forwarded upstream to code-server.

**Impact**: Currently benign — code-server ignores unknown headers. If code-server
adds strict header validation in a future version, this could break the WebSocket
connection.

**Planned fix**: Filter hop-by-hop headers in the WebSocket upgrade path, same as the
`HOP_BY_HOP` set used in the HTTP proxy path.

---

## 10. Session History Shows Provisioning Status for Failed Starts

**What**: If `scheduleJob()` or `getTaskAddress()` throws after `createSessionRecord()`
has already inserted a row, the session record is left in `status='provisioning'`
permanently. The cleanup sweep only destroys sessions where `expires_at < NOW() -
INTERVAL '2 minutes'`, which means a failed session with a future `expires_at` will
stay in `provisioning` state until its TTL expires naturally (up to 1 hour).

**Impact**: The session history UI (`GET /api/v1/playground/sessions`) may show ghost
sessions in provisioning state. Low severity.

**Planned fix**: Wrap the full `scheduleJob → getTaskAddress → createSessionRecord`
sequence in a try/catch that marks the session as `destroyed` on any error, or skip
persisting until the container is confirmed ready.
