#!/usr/bin/env python3
"""Generate the Platform Control Plane track diagrams.

12 diagrams, one per topic in the 'controlplane' sub-category of DevOps:
Go for control planes, writing K8s operators, Vault, event-driven automation,
ChatOps, MCP APIs, bare-metal provisioning, ephemeral environments,
lease/reservation systems, Cluster API, PCI/SOC 2, and AI-assisted engineering.

Shares the node/edge/graph style of gen-devops-diagrams.py.
Output: apps/camora/public/diagrams/devops/cp-*.png

Aspect-ratio rule: long linear chains use rankdir='TB', wide fan-outs keep 'LR'.
Anything past ~3:1 is unreadable at page width.
"""
import graphviz
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'devops')
os.makedirs(OUT, exist_ok=True)

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica',
            fontsize='12', penwidth='1.5', height='0.45', margin='0.22,0.12')
EDGE = dict(fontname='Helvetica', fontsize='10', penwidth='1.5')
C = {
    'navy':   ('#dbeafe', '#3b82f6', '#1e40af'),
    'gold':   ('#fef3c7', '#f59e0b', '#92400e'),
    'green':  ('#dcfce7', '#22c55e', '#166534'),
    'red':    ('#fee2e2', '#ef4444', '#991b1b'),
    'purple': ('#e0e7ff', '#6366f1', '#3730a3'),
    'teal':   ('#ccfbf1', '#14b8a6', '#115e59'),
    'cyan':   ('#cffafe', '#06b6d4', '#155e75'),
    'pink':   ('#fce7f3', '#ec4899', '#9d174d'),
    'sky':    ('#e0f2fe', '#0ea5e9', '#075985'),
    'amber':  ('#fef3c7', '#f59e0b', '#92400e'),
    'gray':   ('#f3f4f6', '#6b7280', '#374151'),
    'slate':  ('#e2e8f0', '#475569', '#1e293b'),
}


def n(g, name, label, c='navy'):
    g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)


def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '',
           color=color, fontcolor=color, style=style, **EDGE)


def base_graph(name, title, rankdir='LR'):
    g = graphviz.Digraph(name, format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.5', nodesep='0.7', ranksep='0.65',
           splines='spline', rankdir=rankdir,
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica', fontcolor='#1e293b')
    return g


def save(g, slug):
    g.render(os.path.join(OUT, slug), cleanup=True)
    print(f'Generated: {slug}')


# 1 ──────────────────────────────────────────────────────────────────
def d1_go():
    g = base_graph('cp1', 'Go for control planes — the features that made it the infrastructure language', 'TB')
    n(g, 'why', 'Why infrastructure is written in Go\nOne static binary, no runtime to install\nFast compile keeps the edit loop tight\nGoroutines make concurrent I/O ordinary\nstdlib already speaks HTTP, TLS, JSON\nThe whole K8s ecosystem is Go, so the\nclient libraries are first-class', 'slate')

    n(g, 'conc', 'Concurrency\ngo f()  cheap, thousands of them\nchannels for handoff\nselect for multiplexing +\n  timeout + cancellation\nsync.Mutex / WaitGroup / errgroup', 'navy')
    n(g, 'ctx',  'context.Context\nThe cancellation and deadline\nmechanism threaded through EVERY\nK8s client call.\nctx, cancel := context.WithTimeout(...)\ndefer cancel()\nDrop the ctx and you leak goroutines\nand hang on a dead API server.', 'purple')
    n(g, 'err',  'Errors are values\nif err != nil { return fmt.Errorf(\n  "reconcile: %w", err) }\nerrors.Is / errors.As to inspect\nPanic is for programmer bugs,\nnot for control flow.\nA panicking controller crashloops.', 'cyan')
    n(g, 'iface','Interfaces\nImplicit satisfaction, no "implements"\nAccept interfaces, return structs\nSmall interfaces (io.Reader) compose;\nthis is what makes fakes trivial\nin controller tests.', 'teal')

    n(g, 'ops',  'Operational surface\n-race in CI catches data races\nnet/http/pprof for live CPU/heap\nsignal.NotifyContext + srv.Shutdown\n  for graceful termination on SIGTERM\n  (K8s sends it before SIGKILL)\nTable-driven tests + t.Run subtests', 'green')

    n(g, 'bugs', 'The bugs that actually bite\nGoroutine leak: a goroutine blocked\n  on a channel nobody will write to\nUnbuffered channel deadlock\nForgetting to cancel a context\nCapturing the loop variable\n  (fixed by the Go 1.22 semantics,\n  still present in older codebases)', 'red')

    e(g, 'why', 'conc'); e(g, 'why', 'ctx'); e(g, 'why', 'err'); e(g, 'why', 'iface')
    e(g, 'conc', 'ops'); e(g, 'ctx', 'ops'); e(g, 'err', 'ops'); e(g, 'iface', 'ops')
    e(g, 'ops', 'bugs', '', '#dc2626', 'dashed')
    save(g, 'cp-1-go')


# 2 ──────────────────────────────────────────────────────────────────
def d2_operators():
    g = base_graph('cp2', 'Writing an operator — controller-runtime and the reconcile loop', 'TB')
    n(g, 'crd',  'Your CRD\napi/v1/zone_types.go\nSpec (desired) + Status (observed)\n+kubebuilder markers generate the\nOpenAPI schema and the RBAC rules', 'gold')
    n(g, 'mgr',  'Manager\nowns the shared Cache, the Client,\nthe Scheme, leader election,\nmetrics and health endpoints', 'purple')
    n(g, 'cache','Cache (shared informers)\nWatches the API server, keeps a local\nstore. Client reads hit the CACHE,\nnot the API server — which is why\nreads are cheap and why they can be\nSTALE. Use APIReader to force a\nlive read when you truly need one.', 'cyan')
    n(g, 'queue','Workqueue\nDedupes and rate-limits.\nMany events for one object collapse\ninto ONE queued key.', 'teal')
    n(g, 'rec',  'Reconcile(ctx, req) (Result, error)\nreq carries only a NamespacedName —\nNOT the object, and NOT the event.\nYou fetch current state yourself.', 'navy')
    n(g, 'act',  'Compare desired vs actual,\nmake ONE step toward desired,\nupdate .status', 'green')

    e(g, 'crd', 'mgr'); e(g, 'mgr', 'cache'); e(g, 'cache', 'queue')
    e(g, 'queue', 'rec'); e(g, 'rec', 'act')
    e(g, 'act', 'queue', 'return Result{RequeueAfter: 30s}\nor return err → backoff', '#f59e0b', 'dashed')

    n(g, 'level', 'LEVEL-TRIGGERED, not edge-triggered\nYou are NOT guaranteed to see every\nevent. You may see the same key twice.\nTherefore Reconcile MUST be idempotent\nand must derive everything from current\nstate — never from "what just changed".', 'red')
    n(g, 'own',   'Ownership and cleanup\nOwns() + ownerReferences → the\n  garbage collector deletes children\nfinalizers → your chance to clean up\n  EXTERNAL resources before deletion\nA finalizer you never remove deadlocks\ndeletion forever. That is the classic\n"namespace stuck Terminating".', 'amber')
    n(g, 'conf',  'Optimistic concurrency\nUpdate fails with a Conflict if\nresourceVersion moved. That is normal —\nreturn the error, let the queue requeue.\nDo not retry in a tight loop.', 'pink')
    n(g, 'test',  'Testing\nenvtest runs a real API server +\netcd binary, no cluster required.\nFake client for pure unit tests.\nmake manifests regenerates CRDs\nand RBAC from the markers.', 'sky')

    e(g, 'rec',  'level', '', '#dc2626')
    e(g, 'act',  'own',   '', '#f59e0b', 'dotted')
    e(g, 'act',  'conf',  '', '#ec4899', 'dotted')
    e(g, 'level','test',  '', '#94a3b8', 'dotted')
    save(g, 'cp-2-operators')


# 3 ──────────────────────────────────────────────────────────────────
def d3_vault():
    g = base_graph('cp3', 'Vault — auth in, secrets out, everything leased')
    n(g, 'app', 'Workload\n(pod / CI job / VM)', 'gray')

    with g.subgraph(name='cluster_auth') as s:
        s.attr(label='  1. AUTHENTICATE — prove who you are  ', style='rounded',
               color='#3b82f6', fontcolor='#1e40af', fontname='Helvetica', fontsize='12')
        n(s, 'k8s',  'Kubernetes auth\npresent the pod ServiceAccount JWT;\nVault calls TokenReview to verify it', 'navy')
        n(s, 'jwt',  'JWT / OIDC\nCI pipeline identity', 'navy')
        n(s, 'appr', 'AppRole\nrole_id + secret_id', 'navy')
        n(s, 'iam',  'AWS / Azure / GCP IAM', 'navy')

    n(g, 'tok', 'Vault token\n+ attached POLICIES\n+ TTL', 'purple')
    n(g, 'pol', 'Policy (HCL)\npath "db/creds/reporting" {\n  capabilities = ["read"]\n}\nDeny by default. Path-based.', 'slate')

    with g.subgraph(name='cluster_engines') as s:
        s.attr(label='  2. READ FROM A SECRET ENGINE  ', style='rounded',
               color='#22c55e', fontcolor='#166534', fontname='Helvetica', fontsize='12')
        n(s, 'kv',  'KV v2\nstatic secrets, versioned\n(note: API path is\n secret/data/foo, not secret/foo)', 'green')
        n(s, 'db',  'Database engine\nDYNAMIC creds — Vault CREATES a\nreal DB user on demand with a TTL,\nthen DROPs it. No shared password\nfor an attacker to steal.', 'teal')
        n(s, 'pki', 'PKI engine\nissues short-lived X.509 certs', 'green')
        n(s, 'tr',  'Transit engine\nencryption as a service —\nVault never stores the data,\nthe key never leaves Vault', 'teal')

    n(g, 'lease', 'LEASE\nEvery dynamic secret has a lease:\nrenew it, or it is REVOKED.\nThis is what makes a leaked\ncredential expire on its own.', 'gold')

    e(g, 'app', 'k8s'); e(g, 'app', 'jwt'); e(g, 'app', 'appr'); e(g, 'app', 'iam')
    e(g, 'k8s', 'tok'); e(g, 'jwt', 'tok'); e(g, 'appr', 'tok'); e(g, 'iam', 'tok')
    e(g, 'tok', 'pol', 'authorized by')
    e(g, 'pol', 'kv'); e(g, 'pol', 'db'); e(g, 'pol', 'pki'); e(g, 'pol', 'tr')
    e(g, 'db', 'lease'); e(g, 'pki', 'lease')

    n(g, 'seal', 'Operational reality\nVault starts SEALED. Unseal with\nShamir key shares, or auto-unseal\nvia a cloud KMS (do this).\nRaft integrated storage for HA;\none active node, the rest standby.\nIf Vault is down, apps holding a\nvalid lease keep working — apps\nneeding a NEW secret do not.', 'red')
    n(g, 'k8sint','Getting secrets into pods\nVault Agent Injector (sidecar,\n  renders to a file)\nVault Secrets Operator (syncs to\n  a native K8s Secret)\nExternal Secrets Operator (same,\n  vendor-neutral)\nCSI provider (mounts a volume)', 'cyan')
    e(g, 'lease', 'seal', '', '#dc2626', 'dotted')
    e(g, 'lease', 'k8sint', '', '#94a3b8', 'dotted')
    save(g, 'cp-3-vault')


# 4 ──────────────────────────────────────────────────────────────────
def d4_event_driven():
    g = base_graph('cp4', 'Event-driven automation — sensor to trigger to rule to action', 'TB')
    n(g, 'ext', 'External world\nalert fires · webhook arrives ·\nqueue message · file appears ·\nAPI poll returns something new', 'gray')
    n(g, 'sen', 'SENSOR\nlong-running process that watches\none source and emits TriggerInstances', 'navy')
    n(g, 'trg', 'TRIGGER\na typed event\n(e.g. datadog.alert)', 'cyan')
    n(g, 'rule','RULE\nif trigger matches criteria\n  → run this action\nThe if-this-then-that layer', 'purple')
    n(g, 'act', 'ACTION\nPython/shell/HTTP, or an\nOrquesta WORKFLOW for multi-step\nwith branching, retries, error paths', 'teal')
    n(g, 'eff', 'Effect\nrestart · scale · failover ·\nopen a ticket · post to Slack', 'green')

    e(g, 'ext', 'sen'); e(g, 'sen', 'trg'); e(g, 'trg', 'rule')
    e(g, 'rule', 'act'); e(g, 'act', 'eff')
    e(g, 'eff', 'ext', 'the world changed — which may\nfire the sensor again', '#f59e0b', 'dashed')

    n(g, 'safe', 'SAFETY — the hard part, not the plumbing\nIdempotent actions: running twice must\n  be harmless\nRate limits + circuit breakers: an\n  automation storm must not AMPLIFY\n  an incident (the loop above is real)\nDry-run mode before it is ever armed\nApproval gate for destructive actions\nFull audit trail: who/what/when/why\nA kill switch a human can reach', 'red')
    e(g, 'act', 'safe', '', '#dc2626')

    n(g, 'vs', 'Versus a Kubernetes operator\nOperator: declarative, in-cluster,\n  continuously reconciles toward a\n  desired state it can always observe\nEvent automation: imperative, external,\n  reacts to things that HAPPEN\nUse the operator for cluster state.\nUse this for the world outside it.', 'amber')
    n(g, 'tools','The landscape\nStackStorm — packs, sensors, rules,\n  Orquesta workflows, datastore\nEvent-Driven Ansible — rulebooks,\n  sources, conditions, playbook actions\nRundeck / PagerDuty Process Automation\n  — job-and-runbook oriented', 'sky')
    e(g, 'rule', 'vs', '', '#f59e0b', 'dotted')
    e(g, 'safe', 'tools', '', '#94a3b8', 'dotted')
    save(g, 'cp-4-event-driven')


# 5 ──────────────────────────────────────────────────────────────────
def d5_chatops():
    g = base_graph('cp5', 'ChatOps — a deploy button in a chat window is a production credential', 'TB')
    n(g, 'user', 'Engineer types\n/deploy checkout staging', 'gray')
    n(g, 'slack','Slack\nslash command → HTTP POST\nto your endpoint', 'navy')
    n(g, 'verify','VERIFY THE REQUEST\nCheck the signing secret over the\nraw body + timestamp. Reject replays.\nAn unverified endpoint is an open\ndeploy API on the internet.', 'red')
    n(g, 'ack',  'ACK WITHIN 3 SECONDS\nSlack times out. Return 200 now,\ndo the work async, post the result\nvia response_url or chat.postMessage.', 'amber')
    n(g, 'authz','AUTHORIZE\nMap Slack user → your identity system\n→ a real permission decision.\nNEVER trust the display name.\nSlack identity is an INPUT, not proof.', 'red')
    n(g, 'plan', 'Show the diff FIRST\nWhat image, what config changed,\nwhat is currently running.\nBlock Kit buttons: Confirm / Cancel', 'cyan')
    n(g, 'appr', 'Approval\nSecond human for prod.\nRequester cannot self-approve.', 'purple')
    n(g, 'run',  'Execute via the SAME control-plane\nAPI the CI system uses.\nThe bot is a client, never a\nsecond code path.', 'teal')
    n(g, 'log',  'Audit\nThe channel is the human-readable\nrecord. The real audit log lives\nOUTSIDE Slack — Slack retention is\na business setting, not a control.', 'green')

    e(g, 'user','slack'); e(g, 'slack','verify'); e(g, 'verify','ack')
    e(g, 'ack','authz'); e(g, 'authz','plan'); e(g, 'plan','appr')
    e(g, 'appr','run'); e(g, 'run','log')

    n(g, 'fail', 'Failure modes to design for\nSlack is down during an incident —\n  there must be a CLI/API path too\nAccidental prod deploy from a phone\nChannel noise burying the one\n  message that mattered\nBot token scope creep until the bot\n  can do more than any human', 'red')
    n(g, 'trans','Transport choice\nSocket Mode — outbound only, no\n  public endpoint, good behind a firewall\nHTTP endpoint — needs a public URL\n  and request verification', 'sky')
    e(g, 'log', 'fail', '', '#dc2626', 'dotted')
    e(g, 'slack','trans', '', '#94a3b8', 'dotted')
    save(g, 'cp-5-chatops')


# 6 ──────────────────────────────────────────────────────────────────
def d6_mcp():
    g = base_graph('cp6', 'MCP — one protocol instead of N bespoke integrations')
    with g.subgraph(name='cluster_before') as s:
        s.attr(label='  BEFORE — N x M glue  ', style='rounded', color='#ef4444',
               fontcolor='#991b1b', fontname='Helvetica', fontsize='12')
        n(s, 'b', 'Each AI client needs a custom\nintegration with each system.\n3 clients x 8 systems = 24\nbespoke connectors to maintain.', 'red')

    n(g, 'client', 'MCP client\n(Claude Code, an IDE agent,\nyour own application)', 'navy')
    n(g, 'proto',  'MCP\nJSON-RPC 2.0\ninitialize → capability negotiation\nTransports: stdio (local)\n  streamable HTTP (remote)', 'purple')
    n(g, 'server', 'MCP server\nyou write one per system', 'teal')

    with g.subgraph(name='cluster_prims') as s:
        s.attr(label='  PRIMITIVES  ', style='rounded', color='#0ea5e9',
               fontcolor='#075985', fontname='Helvetica', fontsize='12')
        n(s, 'tools', 'Tools\nMODEL-invoked actions.\nname + description +\nJSON Schema for inputs.\nThis IS your API design —\nthe description is the\ndocs the model reads.', 'sky')
        n(s, 'res',   'Resources\nAPPLICATION-controlled context\n(files, records, logs)', 'cyan')
        n(s, 'prompt','Prompts\nUSER-selected templates', 'cyan')

    n(g, 'sys', 'Your systems\ndeploy API · cluster state ·\nincident tickets · metrics', 'green')

    e(g, 'b', 'client', '', '#dc2626', 'dashed')
    e(g, 'client', 'proto'); e(g, 'proto', 'server')
    e(g, 'server', 'tools'); e(g, 'server', 'res'); e(g, 'server', 'prompt')
    e(g, 'tools', 'sys')

    n(g, 'sec', 'A server exposing infrastructure actions\nneeds the same rigor as any control-plane API\nOAuth 2.1 for remote servers — the model is\n  not the principal, the USER is\nScope tools narrowly: restart_service beats\n  run_arbitrary_command\nPrompt injection travels through TOOL OUTPUT —\n  a log line can carry an instruction\nConfused deputy: the server acts with ITS\n  credentials, not the caller\'s, unless you\n  deliberately propagate identity\nReturn structured errors the model can act on', 'red')
    e(g, 'tools', 'sec', '', '#dc2626')
    save(g, 'cp-6-mcp')


# 7 ──────────────────────────────────────────────────────────────────
def d7_bare_metal():
    g = base_graph('cp7', 'Bare metal — from a racked machine to a cluster node', 'TB')
    n(g, 'rack', 'A machine arrives\nno OS, no agent, powered off', 'gray')
    n(g, 'oob',  'OUT-OF-BAND management\nBMC on its own network.\nIPMI (legacy) / Redfish (REST).\nPower on/off, set boot device,\nmount virtual media, read sensors.\nThis is the ONLY way in before\nthere is an OS.', 'slate')
    n(g, 'boot', 'NETWORK BOOT chain\nDHCP offers option 66 (server)\n  + 67 (bootfile)\n→ TFTP loads a small NBP\n→ iPXE chainloads\n→ HTTP fetches the real kernel\n  (or UEFI HTTP Boot, skipping TFTP)', 'navy')
    n(g, 'insp', 'INSPECTION / discovery\nBoot a ramdisk, enumerate the truth:\nCPU, RAM, NICs + MACs, disks,\nGPUs, firmware versions.\nThe inventory is DISCOVERED,\nnot typed into a spreadsheet.', 'cyan')
    n(g, 'img',  'IMAGE the disk\nWrite a prebuilt image (fast,\n  deterministic) or run an installer\n  (kickstart / preseed / autoinstall)\nImage-based wins for fleets.', 'purple')
    n(g, 'cfg',  'CONFIGURE\ncloud-init / Ignition for first boot,\nthen Ansible for the rest.\nBIOS + firmware settings are\nCONFIGURATION — version them.\nFor GPU nodes: SR-IOV, above-4G\ndecoding, IOMMU, power profile.', 'teal')
    n(g, 'join', 'JOIN the cluster\nkubeadm / Cluster API + Metal3', 'green')

    e(g, 'rack','oob'); e(g, 'oob','boot'); e(g, 'boot','insp')
    e(g, 'insp','img'); e(g, 'img','cfg'); e(g, 'cfg','join')

    n(g, 'tools', 'The tool landscape\nOpenStack Ironic — the mature engine\nCanonical MAAS — full lifecycle + UI\nTinkerbell — CNCF, workflow-based\nMetal3 — bridges Ironic to Cluster API\n  so bare metal becomes a Machine', 'gold')
    n(g, 'real',  'What is different from cloud\nYou cannot autoscale what is not racked.\nLead time is WEEKS, not seconds.\nFailures are physical: a node that will\n  not POST, a bad DIMM, a NIC that\n  renamed itself, thermal throttling.\nCapacity planning becomes procurement.\nAlways-on cost, so utilization is the\n  metric that matters.', 'red')
    e(g, 'insp', 'tools', '', '#94a3b8', 'dotted')
    e(g, 'join', 'real',  '', '#dc2626', 'dotted')
    save(g, 'cp-7-bare-metal')


# 8 ──────────────────────────────────────────────────────────────────
def d8_ephemeral():
    g = base_graph('cp8', 'Ephemeral environments — tie the environment to the pull request', 'TB')
    n(g, 'old', 'The shared staging problem\nOne long-lived environment.\nIt drifts from prod. Teams queue for it.\nNobody owns it. A broken deploy blocks\neveryone. "It worked in staging" stops\nmeaning anything.', 'red')

    n(g, 'open', 'PR opened\n→ provision environment', 'green')
    n(g, 'push', 'PR updated\n→ redeploy in place', 'navy')
    n(g, 'close','PR merged / closed\n→ DESTROY', 'purple')
    n(g, 'ttl',  'TTL reaper\nfor the ones that leak.\nWithout it you pay forever.', 'amber')

    e(g, 'old', 'open', '', '#dc2626', 'dashed')
    e(g, 'open', 'push'); e(g, 'push', 'close'); e(g, 'close', 'ttl', '', '#f59e0b', 'dotted')

    n(g, 'iso', 'Isolation models, cheapest first\nNamespace per PR — cheap, shares the\n  control plane and CRDs\nvcluster — virtual control plane, so\n  each PR can have its own CRDs and\n  cluster-scoped objects\nFull cluster per environment — highest\n  fidelity, highest cost\n+ Crossplane/Terraform for the cloud\n  resources each environment needs', 'cyan')

    n(g, 'data', 'DATA IS THE HARD PART\nSchema migrations run per environment\nSeed fixtures — fast, unrealistic\nAnonymized prod snapshot — realistic,\n  and a compliance decision (PII must\n  be masked BEFORE it leaves prod)\nSynthetic generation — scales, needs\n  maintenance\nPer-environment DB: a real instance,\n  a schema in a shared server, or a\n  branched database', 'gold')

    n(g, 'dep',  'Things you cannot clone per PR\nThird-party APIs → sandbox or mock\nGPU / hardware → a shared POOL with\n  leases, not one each\nLicensed software → a license server\nService virtualization for the rest', 'teal')

    n(g, 'net',  'Make it usable\nAutomatic DNS + TLS + ingress so each\nenvironment gets a real working URL,\nposted back on the PR.\nIf a developer has to port-forward,\nthey will not use it.', 'sky')

    n(g, 'par',  'Parity as a MEASURED thing\nKeep an explicit list of accepted\ndeltas from prod (scale, data volume,\nsome third-party stubs).\nAnything not on the list is a bug.\n"Prod-like" is otherwise just a claim.', 'slate')

    e(g, 'open', 'iso',  '', '#94a3b8', 'dotted')
    e(g, 'iso',  'data')
    e(g, 'data', 'dep')
    e(g, 'push', 'net',  '', '#94a3b8', 'dotted')
    e(g, 'dep',  'par')
    save(g, 'cp-8-ephemeral-envs')


# 9 ──────────────────────────────────────────────────────────────────
def d9_lease():
    g = base_graph('cp9', 'Leases — time-bounded ownership of a scarce, non-fungible resource', 'TB')
    n(g, 'prob', 'The resource\nA GPU zone, a hardware bench, a\ntest cluster. Not fungible, not\nautoscalable, more demand than supply.', 'slate')

    n(g, 'req',  'Request\nwho · what class · how long ·\npriority · queue if unavailable', 'navy')
    n(g, 'sched','Scheduler\nmatch request to a free resource,\nor enqueue', 'purple')
    n(g, 'lease','LEASE granted\nholder + resource + expiry +\nfencing token (monotonic counter)', 'green')
    n(g, 'work', 'Holder does the work\nand RENEWS the lease\n(heartbeat)', 'teal')
    n(g, 'rel',  'Release — explicitly,\nor by letting it EXPIRE', 'cyan')

    e(g, 'prob','req'); e(g, 'req','sched'); e(g, 'sched','lease')
    e(g, 'lease','work'); e(g, 'work','rel'); e(g, 'rel','sched', 'resource returns to the pool', '#16a34a', 'dashed')

    n(g, 'why',  'Why a lease and not a lock\nThe holder WILL crash, get OOM-killed,\nor be network-partitioned, and will\nnever call release. A permanent lock\nstrands the resource forever.\nExpiry is the recovery mechanism.', 'red')
    n(g, 'fence','Why the fencing token\nA holder can pause (GC, VM freeze),\nlose its lease, resume, and act while\nSOMEONE ELSE holds it. The resource\nmust reject work stamped with an old\ntoken. A lock without fencing is not\nsafe, only usually-safe.', 'red')
    n(g, 'k8s',  'Kubernetes already does this\ncoordination.k8s.io/v1 Lease\nholderIdentity + leaseDurationSeconds\n  + renewTime\nkubelet heartbeats and controller\nleader election are both built on it.', 'sky')
    n(g, 'fair', 'Fairness and starvation\nFIFO is fair but ignores urgency.\nStrict priority starves low priority.\nWeighted fair share / per-team quota\n  is the usual answer.\nPreemption: only with a grace period\n  and a checkpoint, or you corrupt work.\nCap max lease duration — an unbounded\n  lease is squatting.', 'amber')
    n(g, 'api',  'Model it as a CRD + controller\nDeclarative, auditable, reuses RBAC.\nExpose self-service. Emit metrics:\nutilization, queue depth, wait time,\nand who holds what right now.', 'gold')

    e(g, 'lease','why',   '', '#dc2626')
    e(g, 'why',  'fence', '', '#dc2626', 'dashed')
    e(g, 'work', 'k8s',   '', '#94a3b8', 'dotted')
    e(g, 'sched','fair',  '', '#f59e0b', 'dotted')
    e(g, 'fair', 'api')
    save(g, 'cp-9-lease-reservation')


# 10 ─────────────────────────────────────────────────────────────────
def d10_cluster_api():
    g = base_graph('cp10', 'Cluster API — clusters as Kubernetes resources', 'TB')
    n(g, 'mgmt', 'MANAGEMENT CLUSTER\nruns the CAPI controllers.\nHolds the desired state of every\nother cluster in the fleet.', 'purple')

    n(g, 'crds', 'The CRDs deliberately mirror\nworkload primitives you already know\n\nCluster          ~ the app\nMachineDeployment ~ Deployment\nMachineSet        ~ ReplicaSet\nMachine           ~ Pod\nMachineHealthCheck ~ liveness probe', 'navy')

    n(g, 'prov', 'Three provider kinds plug in', 'slate')
    n(g, 'infra','Infrastructure provider\nAWS · Azure · GCP · vSphere ·\nMetal3 (bare metal)\nCreates the actual machine', 'cyan')
    n(g, 'boot', 'Bootstrap provider\nusually kubeadm\nTurns a blank machine into a node', 'teal')
    n(g, 'cp',   'Control-plane provider\nKubeadmControlPlane\nManages etcd + apiserver members', 'green')

    n(g, 'wl',   'WORKLOAD CLUSTERS\ncreated, upgraded, scaled and\nrepaired by the controllers above', 'gold')

    e(g, 'mgmt', 'crds'); e(g, 'crds', 'prov')
    e(g, 'prov', 'infra'); e(g, 'prov', 'boot'); e(g, 'prov', 'cp')
    e(g, 'infra', 'wl'); e(g, 'boot', 'wl'); e(g, 'cp', 'wl')

    n(g, 'ops',  'What you get\nRolling control-plane and node upgrades\n  by changing a version field\nMachineHealthCheck auto-replaces a\n  node that stops being Ready\nClusterClass templates the whole shape\n  so 40 clusters share one definition\nGitOps: commit a Cluster manifest,\n  Flux/Argo applies it, a cluster appears', 'sky')

    n(g, 'boots','The bootstrap paradox\nWho creates the management cluster?\nclusterctl + a temporary kind cluster,\nthen PIVOT the CAPI resources into the\nnew cluster so it manages itself.', 'amber')
    n(g, 'risk', 'The management cluster is now a\nsingle point of failure for FLEET\nOPERATIONS. Workload clusters keep\nrunning without it, but you cannot\nupgrade, scale or repair. Back it up,\nand practise restoring it.', 'red')
    n(g, 'when', 'When it earns the complexity\nMany clusters, multiple infrastructures,\nespecially on-prem or bare metal.\nFor three EKS clusters, Terraform plus\nthe managed service is simpler and\nyou should say so in an interview.', 'pink')

    e(g, 'wl',   'ops')
    e(g, 'mgmt', 'boots', '', '#f59e0b', 'dotted')
    e(g, 'boots','risk',  '', '#dc2626')
    e(g, 'ops',  'when',  '', '#94a3b8', 'dotted')
    save(g, 'cp-10-cluster-api')


# 11 ─────────────────────────────────────────────────────────────────
def d11_pci_soc2():
    g = base_graph('cp11', 'PCI-DSS and SOC 2 on Kubernetes — scope first, controls second')
    with g.subgraph(name='cluster_what') as s:
        s.attr(label='  TWO DIFFERENT THINGS  ', style='rounded', color='#6366f1',
               fontcolor='#3730a3', fontname='Helvetica', fontsize='12')
        n(s, 'pci',  'PCI-DSS\nPRESCRIPTIVE. A fixed list of\nrequirements for cardholder data.\nSomeone tells you what to do.\nAssessed against the standard.', 'purple')
        n(s, 'soc',  'SOC 2\nATTESTATION against the Trust\nServices Criteria. YOU define the\ncontrols; an auditor tests whether\nthey work.\nType I  = design, at a point in time\nType II = operating effectiveness,\n          over a PERIOD (6-12 months)\nType II is the one customers want.', 'purple')

    n(g, 'scope', 'SCOPE IS THE HIGHEST-LEVERAGE DECISION\nEverything that stores, processes or\ntransmits cardholder data is in scope —\nAND anything that can affect its security.\nA flat cluster puts EVERYTHING in scope.\nSegment hard: separate cluster or\nstrictly enforced network policy, so the\nCDE is small and provable.', 'red')

    n(g, 'map', 'Mapping controls onto Kubernetes', 'slate')
    n(g, 'seg', 'Segmentation\nNetworkPolicy default-deny,\nnamespace + node isolation,\nmTLS between services', 'navy')
    n(g, 'enc', 'Encryption\nin transit: TLS everywhere\nat rest: etcd encryption provider,\n  encrypted volumes, KMS-backed keys', 'cyan')
    n(g, 'acc', 'Access control\nRBAC least privilege, no wildcard,\nSSO + MFA to the API server,\nshort-lived credentials,\nno shared kubeconfigs', 'teal')
    n(g, 'prev','Preventive controls\nAdmission control (OPA/Kyverno)\nblocks a violation instead of\nreporting it later.\nImage scanning + a patch SLA.', 'green')
    n(g, 'aud', 'Audit and change management\nAPI audit logging, shipped off-cluster,\nretained per policy.\nGitOps means the PR IS the change\nrecord: proposed, reviewed, approved,\napplied, revertible. Auditors love it.', 'gold')

    e(g, 'pci', 'scope'); e(g, 'soc', 'scope')
    e(g, 'scope', 'map')
    for x in ('seg', 'enc', 'acc', 'prev', 'aud'):
        e(g, 'map', x)

    n(g, 'cont', 'Continuous, not annual\nPolicy-as-code both ENFORCES the control\nand PRODUCES the evidence.\nCIS benchmark scans on a schedule.\nDashboards that show control status now.\nThe alternative is a two-month scramble\nbefore every audit, every year.', 'amber')
    e(g, 'prev', 'cont'); e(g, 'aud', 'cont')
    save(g, 'cp-11-pci-soc2')


# 12 ─────────────────────────────────────────────────────────────────
def d12_ai_assisted():
    g = base_graph('cp12', 'AI-assisted engineering — where it helps, where it does not', 'TB')
    n(g, 'tools', 'Three different shapes\nInline completion (Copilot) — finishes\n  the line you are typing\nIDE agent (Cursor) — multi-file edits\n  inside the editor\nTerminal agent (Claude Code) — reads,\n  edits, runs commands, iterates on\n  a whole task', 'slate')

    with g.subgraph(name='cluster_good') as s:
        s.attr(label='  RELIABLY USEFUL  ', style='rounded', color='#22c55e',
               fontcolor='#166534', fontname='Helvetica', fontsize='12')
        n(s, 'g1', 'Boilerplate with a known shape\n(an operator scaffold, a Terraform\nmodule, table-driven tests)', 'green')
        n(s, 'g2', 'Translation between forms\nTerraform to Pulumi, bash to Python,\nan error message to an explanation', 'green')
        n(s, 'g3', 'Reading unfamiliar code\n"where does this get called from"\nacross a repo you did not write', 'green')
        n(s, 'g4', 'Large mechanical refactors\nand first-draft docs/runbooks', 'green')

    with g.subgraph(name='cluster_bad') as s:
        s.attr(label='  RELIABLY WEAK  ', style='rounded', color='#ef4444',
               fontcolor='#991b1b', fontname='Helvetica', fontsize='12')
        n(s, 'b1', 'Novel architecture decisions\nIt has no stake in the tradeoff.', 'red')
        n(s, 'b2', 'Anything needing org context\nyour incident history, why that\nservice is weird, who owns what', 'red')
        n(s, 'b3', 'Plausible-but-wrong config\nYAML and IaC that LOOKS right is the\ndangerous output — it passes review\nby vibes and fails in production.', 'red')

    n(g, 'skill', 'The actual skill: context engineering\nRepo conventions file so the model knows\n  your patterns\nScope the task — a whole subsystem in\n  one prompt produces mush\nGive it the right files, and the failing\n  test, not a paraphrase\nMake it verify: run the tests, read the\n  output, iterate', 'cyan')
    n(g, 'rev',   'Review AI-written infra code MORE\ncarefully, not less. It is plausible\nby construction, which is exactly the\nproperty that defeats a skim.', 'amber')
    n(g, 'gov',   'What a platform team must decide\nWhich model endpoints are approved\nSecrets never enter a prompt\nCode provenance and licensing\nAudit: what did agents change\nMCP as the safe, scoped way to give\n  these tools access to internal systems', 'purple')
    n(g, 'meas',  'Measure honestly\nDORA and SPACE, not lines of code.\nIf it generates more code that takes\nlonger to review and fails more often,\nthat is a regression wearing a costume.', 'gold')

    e(g, 'tools', 'g1'); e(g, 'tools', 'b1')
    e(g, 'g4', 'skill'); e(g, 'b3', 'skill')
    e(g, 'skill', 'rev'); e(g, 'rev', 'gov'); e(g, 'gov', 'meas')
    save(g, 'cp-12-ai-assisted')


if __name__ == '__main__':
    d1_go(); d2_operators(); d3_vault(); d4_event_driven(); d5_chatops()
    d6_mcp(); d7_bare_metal(); d8_ephemeral(); d9_lease(); d10_cluster_api()
    d11_pci_soc2(); d12_ai_assisted()
    print('\nAll 12 control-plane diagrams generated.')
