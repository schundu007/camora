#!/usr/bin/env node
/**
 * Specs for the 33 diagrams referenced by topic data but never generated.
 * Run: node scripts/missing-diagram-specs.mjs
 */
import { generate } from './gen-missing-diagrams.mjs';

const n = (id, label, color, col, row) => ({ id, label, color, col, row });

export const SPECS = [
  // ── devops ────────────────────────────────────────────────────────────────
  {
    file: '/diagrams/devops/k8s-services-flow.png',
    title: 'Why Services Exist — The Pod IP Problem',
    nodes: [
      n('client', 'Client Pod\nwants to reach\nthe backend', 'navy', 0, 0),
      n('svc', 'Service\nbackend.default\n.svc.cluster.local\nStable ClusterIP', 'teal', 1, 0),
      n('eps', 'EndpointSlice\nTracks ready Pod IPs\nUpdated by the\nendpoints controller', 'gold', 2, 0),
      n('p1', 'Pod A\n10.244.1.7\nReady', 'green', 3, 0),
      n('p2', 'Pod B\n10.244.2.4\nReady', 'green', 3, 1),
      n('p3', 'Pod C\n10.244.1.9\nTerminating — removed\nfrom the EndpointSlice', 'red', 3, 2),
    ],
    edges: [
      ['client', 'svc', 'DNS name'],
      ['svc', 'eps', 'resolves via'],
      ['eps', 'p1', 'load balances'],
      ['eps', 'p2', ''],
      ['eps', 'p3', 'drops', { color: '#ef4444', dashed: true }],
    ],
  },
  {
    file: '/diagrams/devops/k8s-service-types.png',
    title: 'Service Types — ClusterIP, NodePort, LoadBalancer',
    nodes: [
      n('ext', 'External client\nInternet', 'gray', 0, 1),
      n('lb', 'LoadBalancer\nCloud LB or MetalLB\nAllocates external IP\nSuperset of NodePort', 'purple', 1, 0),
      n('np', 'NodePort\nOpens 30000-32767\non every node\nSuperset of ClusterIP', 'gold', 1, 1),
      n('ci', 'ClusterIP (default)\nInternal virtual IP\nUnreachable from\noutside the cluster', 'teal', 2, 1),
      n('pods', 'Backing Pods\nSelected by label\nselector', 'green', 3, 1),
      n('hl', 'Headless\nclusterIP: None\nDNS returns Pod IPs\ndirectly — StatefulSets', 'cyan', 2, 2),
    ],
    edges: [
      ['ext', 'lb', ''],
      ['ext', 'np', 'node IP:port'],
      ['lb', 'np', 'builds on'],
      ['np', 'ci', 'builds on'],
      ['ci', 'pods', 'kube-proxy'],
      ['hl', 'pods', 'no proxy', { dashed: true }],
    ],
  },

  // ── linkdiags ─────────────────────────────────────────────────────────────
  {
    file: '/diagrams/linkdiags/aws-concepts.png',
    title: 'AWS 3-Tier Web Architecture',
    nodes: [
      n('users', 'Users', 'gray', 0, 0),
      n('r53', 'Route 53\nDNS + health checks', 'purple', 1, 0),
      n('cf', 'CloudFront\nCDN, TLS termination\nWAF at the edge', 'cyan', 2, 0),
      n('alb', 'Application\nLoad Balancer\nPublic subnets, multi-AZ', 'navy', 3, 0),
      n('web', 'Web / App tier\nEC2 or ECS in an\nAuto Scaling Group\nPrivate subnets', 'teal', 4, 0),
      n('rds', 'RDS Multi-AZ\nPrimary + standby\nSynchronous replication', 'green', 5, 0),
      n('cache', 'ElastiCache\nSession and query cache', 'gold', 5, 1),
    ],
    edges: [
      ['users', 'r53', ''], ['r53', 'cf', ''], ['cf', 'alb', 'cache miss'],
      ['alb', 'web', 'health-checked'], ['web', 'rds', 'writes'], ['web', 'cache', 'reads'],
    ],
  },
  {
    file: '/diagrams/linkdiags/aws-control-tower.png',
    title: 'AWS Control Tower Landing Zone',
    nodes: [
      n('ct', 'Control Tower\nOrchestrates the\nlanding zone', 'purple', 0, 1),
      n('org', 'AWS Organizations\nAccount hierarchy\nService control policies', 'navy', 1, 1),
      n('sec', 'Security OU\nLog Archive account\nAudit account', 'red', 2, 0),
      n('work', 'Workloads OU\nProd, staging and dev\naccounts per team', 'teal', 2, 1),
      n('sand', 'Sandbox OU\nRelaxed guardrails\nHard billing caps', 'gold', 2, 2),
      n('guard', 'Guardrails\nPreventive: SCPs\nDetective: AWS Config\nProactive: CloudFormation hooks', 'green', 3, 1),
    ],
    edges: [
      ['ct', 'org', 'provisions'], ['org', 'sec', ''], ['org', 'work', ''], ['org', 'sand', ''],
      ['work', 'guard', 'enforced by'],
    ],
  },
  {
    file: '/diagrams/linkdiags/aws-dr-strategies.png',
    title: 'AWS DR Strategy Spectrum — RTO/RPO vs Cost',
    nodes: [
      n('bk', 'Backup & Restore\nRTO: hours\nRPO: hours\nLowest cost', 'gray', 0, 0),
      n('pl', 'Pilot Light\nRTO: 10s of minutes\nRPO: minutes\nData replicated, compute off', 'gold', 1, 0),
      n('wm', 'Warm Standby\nRTO: minutes\nRPO: seconds\nScaled-down copy running', 'teal', 2, 0),
      n('aa', 'Multi-Site Active/Active\nRTO: near zero\nRPO: near zero\nHighest cost', 'green', 3, 0),
      n('cost', 'Cost and operational complexity increase →', 'navy', 1, 1),
      n('rto', '← RTO and RPO increase', 'red', 2, 1),
    ],
    edges: [['bk', 'pl', ''], ['pl', 'wm', ''], ['wm', 'aa', '']],
  },
  {
    file: '/diagrams/linkdiags/karpenter-autoscaling.png',
    title: 'Karpenter Node Provisioning Flow',
    nodes: [
      n('pend', 'Pending Pod\nUnschedulable —\nno node fits', 'red', 0, 0),
      n('kar', 'Karpenter controller\nWatches unschedulable Pods', 'purple', 1, 0),
      n('np', 'NodePool + NodeClass\nInstance families, zones,\ncapacity type, limits', 'gold', 2, 0),
      n('bin', 'Bin-packing decision\nPicks the cheapest instance\nthat fits the pending set', 'navy', 3, 0),
      n('ec2', 'EC2 Fleet API\nLaunches the node directly —\nno Auto Scaling Group', 'teal', 4, 0),
      n('sched', 'Pod scheduled\nNode joins and registers', 'green', 5, 0),
      n('consol', 'Consolidation\nRepacks and removes\nunderused nodes', 'cyan', 3, 1),
    ],
    edges: [
      ['pend', 'kar', 'observes'], ['kar', 'np', 'reads constraints'],
      ['np', 'bin', ''], ['bin', 'ec2', 'launch'], ['ec2', 'sched', ''],
      ['consol', 'ec2', 'terminates', { color: '#ef4444', dashed: true }],
    ],
  },
  {
    file: '/diagrams/linkdiags/crossplane-architecture.png',
    title: 'Crossplane Architecture — Cloud Infrastructure as Kubernetes APIs',
    nodes: [
      n('dev', 'Developer\nApplies a claim', 'gray', 0, 0),
      n('claim', 'Claim (XRC)\nNamespaced request\n"I need a Postgres"', 'navy', 1, 0),
      n('xrd', 'CompositeResourceDefinition\nDefines the platform API\nand its schema', 'purple', 2, 0),
      n('comp', 'Composition\nMaps the abstract API to\nconcrete managed resources', 'gold', 3, 0),
      n('mr', 'Managed Resources\nRDSInstance, SubnetGroup,\nSecurityGroup', 'teal', 4, 0),
      n('prov', 'Provider\nprovider-aws controller\nreconciles to the cloud API', 'green', 5, 0),
      n('cloud', 'Cloud account\nReal infrastructure,\ncontinuously reconciled', 'cyan', 6, 0),
    ],
    edges: [
      ['dev', 'claim', ''], ['claim', 'xrd', 'validated by'], ['xrd', 'comp', 'selects'],
      ['comp', 'mr', 'renders'], ['mr', 'prov', ''], ['prov', 'cloud', 'CRUD'],
    ],
  },
  {
    file: '/diagrams/linkdiags/external-secrets-operator.png',
    title: 'External Secrets Operator Flow',
    nodes: [
      n('store', 'External store\nAWS Secrets Manager,\nVault, Azure Key Vault', 'purple', 0, 0),
      n('ss', 'SecretStore\nConnection + auth config\n(IRSA, token, cert)', 'gold', 1, 0),
      n('eso', 'ESO controller\nReconciles on an interval', 'navy', 2, 0),
      n('es', 'ExternalSecret\nWhich remote keys map to\nwhich Secret fields', 'teal', 3, 0),
      n('sec', 'Kubernetes Secret\nCreated and kept in sync —\nnever committed to Git', 'green', 4, 0),
      n('pod', 'Pod\nMounts as env or volume', 'cyan', 5, 0),
    ],
    edges: [
      ['ss', 'eso', 'how to auth'], ['es', 'eso', 'what to fetch'],
      ['eso', 'store', 'pulls', { color: '#6366f1' }],
      ['eso', 'sec', 'writes'], ['sec', 'pod', ''],
    ],
  },
  {
    file: '/diagrams/linkdiags/dora-four-keys.png',
    title: 'DORA Four Keys — Throughput and Stability',
    nodes: [
      n('tp', 'Throughput', 'navy', 0, 0),
      n('df', 'Deployment Frequency\nElite: on demand\nLow: monthly or less', 'teal', 1, 0),
      n('lt', 'Lead Time for Changes\nElite: under one hour\nLow: over a month', 'cyan', 1, 1),
      n('st', 'Stability', 'red', 0, 2),
      n('cfr', 'Change Failure Rate\nElite: 5-10%\nLow: 40-60%', 'gold', 1, 2),
      n('mttr', 'Failed Deployment\nRecovery Time\nElite: under one hour\nLow: over a week', 'purple', 1, 3),
      n('key', 'The finding\nThroughput and stability\nrise together — speed and\nsafety are not a trade-off', 'green', 2, 1),
    ],
    edges: [
      ['tp', 'df', ''], ['tp', 'lt', ''], ['st', 'cfr', ''], ['st', 'mttr', ''],
      ['df', 'key', '', { dashed: true }], ['cfr', 'key', '', { dashed: true }],
    ],
  },
  {
    file: '/diagrams/linkdiags/platform-engineering-idp.png',
    title: 'Platform Engineering Maturity Model',
    nodes: [
      n('l1', 'Level 1 — Ad hoc\nTickets and tribal knowledge\nOps is a queue', 'red', 0, 0),
      n('l2', 'Level 2 — Standardised\nShared pipelines and\nbase images', 'gold', 1, 0),
      n('l3', 'Level 3 — Self-service\nGolden paths, templates,\ndevelopers provision alone', 'teal', 2, 0),
      n('l4', 'Level 4 — Product\nPlatform has a roadmap,\nusers and SLOs', 'green', 3, 0),
      n('idp', 'Internal Developer Platform\nPortal + scaffolding +\nGitOps + observability', 'navy', 2, 1),
      n('meas', 'Measured by\nDORA + developer experience,\nnot ticket volume', 'purple', 3, 1),
    ],
    edges: [
      ['l1', 'l2', ''], ['l2', 'l3', ''], ['l3', 'l4', ''],
      ['idp', 'l3', 'enables', { dashed: true }], ['l4', 'meas', ''],
    ],
  },
  {
    file: '/diagrams/linkdiags/grpc-protobuf.png',
    title: 'gRPC vs REST Architecture',
    nodes: [
      n('proto', '.proto file\nOne schema, both sides\nService + message definitions', 'purple', 0, 1),
      n('gen', 'protoc codegen\nTyped client stub and\nserver interface', 'gold', 1, 1),
      n('cli', 'gRPC client\nBinary Protobuf over HTTP/2\nStreaming, multiplexed', 'navy', 2, 0),
      n('srv', 'gRPC server\nStrongly typed handlers', 'teal', 3, 0),
      n('gw', 'grpc-gateway\nReverse proxy generated\nfrom Protobuf annotations', 'cyan', 2, 2),
      n('rest', 'REST / JSON client\nBrowsers and external\nconsumers', 'gray', 3, 2),
      // Far right so the gateway→server edge does not cross it.
      n('lb', 'L4 LB will not work\nHTTP/2 multiplexes many calls\nover one connection — needs a\nmesh or L7 LB (Envoy, NGINX, ALB)', 'red', 4, 1),
    ],
    edges: [
      ['proto', 'gen', ''], ['gen', 'cli', ''], ['gen', 'srv', ''],
      ['cli', 'srv', 'HTTP/2'], ['gw', 'srv', 'translates'], ['rest', 'gw', 'HTTP/JSON'],
      ['cli', 'lb', '', { color: '#ef4444', dashed: true }],
    ],
  },

  // ── linux ─────────────────────────────────────────────────────────────────
  {
    file: '/diagrams/linux/linux-seccomp-chain.png',
    title: 'seccomp Filter Chain',
    nodes: [
      n('app', 'Process\nIssues a syscall', 'navy', 0, 0),
      n('bpf', 'seccomp-BPF filter\nClassic BPF program on\nstruct seccomp_data', 'gold', 1, 0),
      n('allow', 'SECCOMP_RET_ALLOW\nSyscall proceeds', 'green', 2, 0),
      n('errno', 'SECCOMP_RET_ERRNO\nReturns an error —\nno syscall executed', 'teal', 2, 1),
      n('kill', 'SECCOMP_RET_KILL_PROCESS\nProcess terminated', 'red', 2, 2),
      n('notif', 'SECCOMP_RET_USER_NOTIF\nDelegates the decision\nto a supervisor', 'purple', 2, 3),
      n('kern', 'Kernel syscall\nhandler', 'cyan', 3, 0),
    ],
    edges: [
      ['app', 'bpf', 'syscall'], ['bpf', 'allow', ''], ['bpf', 'errno', ''],
      ['bpf', 'kill', ''], ['bpf', 'notif', ''], ['allow', 'kern', ''],
    ],
  },
  {
    file: '/diagrams/linux/linux-ebpf-arch.png',
    title: 'eBPF Architecture',
    nodes: [
      n('src', 'eBPF program\nC compiled to eBPF\nbytecode by clang', 'navy', 0, 0),
      n('load', 'bpf() syscall\nLoader: libbpf, bcc, cilium/ebpf', 'gold', 1, 0),
      n('verif', 'Verifier\nProves termination and\nmemory safety before load', 'red', 2, 0),
      n('jit', 'JIT compiler\nBytecode to native\nmachine code', 'purple', 3, 0),
      n('hook', 'Attach points\nkprobe, tracepoint, XDP,\ntc, cgroup, LSM', 'teal', 4, 0),
      n('maps', 'eBPF maps\nShared kernel/user state:\nhash, array, ring buffer', 'cyan', 4, 1),
      n('user', 'User space\nReads maps, no kernel\nmodule required', 'green', 5, 1),
    ],
    edges: [
      ['src', 'load', ''], ['load', 'verif', ''], ['verif', 'jit', 'accepted'],
      ['jit', 'hook', 'attached'], ['hook', 'maps', 'writes'], ['maps', 'user', 'polls'],
    ],
  },
  {
    file: '/diagrams/linux/linux-cgroup-v2-hierarchy.png',
    title: 'cgroup v2 Unified Hierarchy',
    nodes: [
      n('root', 'Root cgroup\n/sys/fs/cgroup\nSingle unified tree', 'navy', 0, 1),
      n('sys', 'system.slice\nSystem daemons', 'gold', 1, 0),
      n('user', 'user.slice\nLogin sessions', 'teal', 1, 1),
      n('kube', 'kubepods.slice\nkubelet-managed', 'purple', 1, 2),
      n('guar', 'Guaranteed Pods\nrequests == limits\nOwn cgroup directly', 'green', 2, 1),
      n('burst', 'burstable.slice\nrequests < limits', 'cyan', 2, 2),
      n('best', 'besteffort.slice\nNo requests or limits\nFirst to be reclaimed', 'red', 2, 3),
      n('ctrl', 'Controllers\ncpu, memory, io, pids\nEnabled per subtree via\ncgroup.subtree_control', 'gray', 3, 1),
    ],
    edges: [
      ['root', 'sys', ''], ['root', 'user', ''], ['root', 'kube', ''],
      ['kube', 'guar', ''], ['kube', 'burst', ''], ['kube', 'best', ''],
      ['guar', 'ctrl', 'limited by', { dashed: true }],
    ],
  },
  {
    file: '/diagrams/linux/linux-luks-stack.png',
    title: 'LUKS2 Encryption Stack',
    nodes: [
      n('app', 'Application\nOrdinary file I/O', 'gray', 0, 0),
      n('fs', 'Filesystem\next4 / XFS on the\nmapped device', 'navy', 1, 0),
      n('dm', 'dm-crypt\nDevice mapper target\nEncrypts every block', 'purple', 2, 0),
      n('hdr', 'LUKS2 header\nKey slots, PBKDF (Argon2id),\ncipher spec, JSON metadata', 'gold', 3, 1),
      n('mk', 'Master key\nUnwrapped by a passphrase\nor TPM-sealed key', 'red', 3, 0),
      n('disk', 'Block device\n/dev/sda2 — ciphertext\nat rest', 'teal', 4, 0),
    ],
    edges: [
      ['app', 'fs', ''], ['fs', 'dm', 'block writes'], ['dm', 'mk', 'uses'],
      ['mk', 'hdr', 'unwrapped from', { dashed: true }], ['dm', 'disk', 'ciphertext'],
    ],
  },
  {
    file: '/diagrams/linux/linux-overlayfs-layers.png',
    title: 'OverlayFS Layers — How Container Images Stack',
    nodes: [
      n('merged', 'merged/\nWhat the container sees\nUnified view', 'green', 3, 0),
      n('upper', 'upperdir/\nContainer writable layer\nCopy-up on first write\nWhiteouts mark deletions', 'gold', 2, 0),
      n('l3', 'lowerdir — layer 3\nAPP COPY . /app', 'teal', 1, 0),
      n('l2', 'lowerdir — layer 2\nRUN apt-get install', 'teal', 1, 1),
      n('l1', 'lowerdir — layer 1\nFROM debian:bookworm', 'teal', 1, 2),
      n('ro', 'Read-only and shared\nOne copy on disk serves\nevery container using\nthe same image', 'cyan', 0, 1),
    ],
    edges: [
      ['upper', 'merged', 'wins'], ['l3', 'merged', ''], ['l2', 'l3', ''], ['l1', 'l2', ''],
      ['ro', 'l1', '', { dashed: true }],
    ],
  },
  {
    file: '/diagrams/linux/linux-use-method.png',
    title: 'USE Method — Utilisation, Saturation, Errors',
    nodes: [
      n('res', 'For every resource\nCPU, memory, disk, network,\ncontroller, interconnect', 'navy', 0, 1),
      n('u', 'Utilisation\nPercent of time busy\ntop, mpstat, iostat', 'teal', 1, 0),
      n('s', 'Saturation\nQueued work that cannot\nbe serviced yet\nload average, runq, iowait', 'gold', 1, 1),
      n('e', 'Errors\nCount of error events\ndmesg, ethtool -S, SMART', 'red', 1, 2),
      n('find', 'High saturation is the\nstrongest signal —\nutilisation can read 100%\nand still be healthy', 'green', 2, 1),
    ],
    edges: [['res', 'u', ''], ['res', 's', ''], ['res', 'e', ''], ['s', 'find', '', { dashed: true }]],
  },
  {
    file: '/diagrams/linux/linux-flame-graph.png',
    title: 'Flame Graph Anatomy',
    nodes: [
      n('perf', 'perf record -F 99 -g\nSamples stacks at 99 Hz', 'navy', 0, 0),
      n('fold', 'stackcollapse\nOne line per unique stack,\nwith a sample count', 'gold', 1, 0),
      n('svg', 'flamegraph.pl\nRenders the SVG', 'purple', 2, 0),
      n('x', 'X axis = sample population\nAlphabetical, NOT time.\nWidth = time on CPU', 'teal', 3, 0),
      n('y', 'Y axis = stack depth\nCaller below, callee above', 'cyan', 3, 1),
      n('read', 'Reading it\nLook for wide plateaus —\nwide means expensive,\ntall only means deep', 'green', 4, 0),
    ],
    edges: [['perf', 'fold', ''], ['fold', 'svg', ''], ['svg', 'x', ''], ['svg', 'y', ''], ['x', 'read', '']],
  },
  {
    file: '/diagrams/linux/linux-sssd-stack.png',
    title: 'SSSD Authentication Stack',
    nodes: [
      n('login', 'Login\nsshd, login, sudo', 'gray', 0, 0),
      n('pam', 'PAM\npam_sss.so in the\nauth and account stacks', 'navy', 1, 0),
      n('nss', 'NSS\nnss_sss for passwd,\ngroup and shadow', 'teal', 1, 1),
      n('sssd', 'sssd daemon\nResponders + provider\nback ends', 'purple', 2, 0),
      n('cache', 'Local cache\nldb database — offline\nlogin when the directory\nis unreachable', 'gold', 3, 1),
      n('dir', 'Directory\nActive Directory, FreeIPA,\nor plain LDAP over TLS', 'green', 3, 0),
    ],
    edges: [
      ['login', 'pam', ''], ['login', 'nss', 'id lookup'], ['pam', 'sssd', ''],
      ['nss', 'sssd', ''], ['sssd', 'dir', 'LDAP/Kerberos'], ['sssd', 'cache', 'writes through'],
    ],
  },
  {
    file: '/diagrams/linux/linux-ftrace-layers.png',
    title: 'ftrace vs bpftrace — Tracing Layers',
    nodes: [
      n('static', 'Static tracepoints\nCompiled-in, stable ABI\nsched, block, syscalls', 'green', 0, 0),
      n('dyn', 'Dynamic probes\nkprobe / uprobe — any symbol,\nno stable ABI', 'gold', 0, 1),
      n('ftrace', 'ftrace\n/sys/kernel/tracing\nFunction graph, latency\ntracers, no compiler needed', 'navy', 1, 0),
      n('bpf', 'bpftrace\nHigh-level language over\neBPF — aggregation in\nkernel space', 'purple', 1, 1),
      n('out', 'Output\ntrace_pipe (raw text)\nvs maps and histograms', 'teal', 2, 0),
      n('pick', 'Choosing\nftrace for "what did the\nkernel do"; bpftrace for\n"summarise it cheaply"', 'cyan', 2, 1),
    ],
    edges: [
      ['static', 'ftrace', ''], ['static', 'bpf', ''], ['dyn', 'ftrace', ''], ['dyn', 'bpf', ''],
      ['ftrace', 'out', ''], ['bpf', 'pick', ''],
    ],
  },
  {
    file: '/diagrams/linux/linux-numa-topology.png',
    title: 'NUMA Topology — Local vs Remote Memory',
    nodes: [
      n('n0', 'NUMA node 0\nCPUs 0-15', 'navy', 0, 0),
      n('m0', 'Local memory\nBank 0 — fastest path', 'green', 1, 0),
      n('inter', 'Interconnect\nUPI / Infinity Fabric\nRemote access costs\n1.5-2x local latency', 'red', 1, 1),
      n('n1', 'NUMA node 1\nCPUs 16-31', 'navy', 0, 2),
      n('m1', 'Local memory\nBank 1', 'green', 1, 2),
      n('tools', 'Inspect and pin\nnumactl --hardware\nnumastat, lscpu\nCPU Manager static policy +\nTopology Manager alignment', 'gold', 2, 1),
    ],
    edges: [
      ['n0', 'm0', 'local'], ['n1', 'm1', 'local'],
      ['n0', 'inter', 'remote', { color: '#ef4444', dashed: true }],
      ['n1', 'inter', 'remote', { color: '#ef4444', dashed: true }],
      ['inter', 'tools', '', { dashed: true }],
    ],
  },
  {
    file: '/diagrams/linux/linux-swap-hierarchy.png',
    title: 'Linux Memory Hierarchy and Reclaim',
    nodes: [
      n('anon', 'Anonymous pages\nHeap and stack —\nno file backing', 'navy', 0, 0),
      n('file', 'Page cache\nFile-backed — clean pages\ncan simply be dropped', 'teal', 0, 1),
      n('kswapd', 'kswapd / direct reclaim\nTriggered at the low\nwatermark', 'gold', 1, 0),
      n('swap', 'Swap\nAnonymous pages written out\nswappiness tunes the balance', 'purple', 2, 0),
      n('drop', 'Dropped\nClean page cache costs\nnothing to reclaim', 'green', 2, 1),
      n('oom', 'OOM killer\nReclaim failed — kills by\noom_score. In Kubernetes\nthis surfaces as OOMKilled', 'red', 3, 0),
    ],
    edges: [
      ['anon', 'kswapd', 'pressure'], ['file', 'kswapd', ''], ['kswapd', 'swap', 'writes out'],
      ['kswapd', 'drop', 'discards'], ['swap', 'oom', 'still short', { color: '#ef4444' }],
    ],
  },

  // ── sre ───────────────────────────────────────────────────────────────────
  {
    file: '/diagrams/sre/rel-pipeline.png',
    title: 'Release Pipeline — Source to Production in Four Gates',
    nodes: [
      n('src', 'Source\nReviewed commit on\nthe main branch', 'gray', 0, 0),
      n('g1', 'Gate 1 — Build\nHermetic, reproducible\nArtifact is immutable', 'navy', 1, 0),
      n('g2', 'Gate 2 — Test\nUnit, integration, load\nBlocks on failure', 'teal', 2, 0),
      n('g3', 'Gate 3 — Canary\nSmall traffic slice,\nautomated analysis', 'gold', 3, 0),
      n('g4', 'Gate 4 — Rollout\nStaged by zone, with a\ntested rollback path', 'green', 4, 0),
      n('rb', 'Rollback\nFaster than fixing forward\nPractised, not theoretical', 'red', 4, 1),
    ],
    edges: [
      ['src', 'g1', ''], ['g1', 'g2', ''], ['g2', 'g3', ''], ['g3', 'g4', 'healthy'],
      ['g4', 'rb', 'on regression', { color: '#ef4444', dashed: true }],
    ],
  },
  {
    file: '/diagrams/sre/rel-hermetic.png',
    title: 'Hermetic Build — Same Input Always Produces the Same Output',
    nodes: [
      n('src', 'Pinned source\nExact commit SHA', 'navy', 0, 0),
      n('dep', 'Pinned dependencies\nLockfile with hashes,\nvendored or mirrored', 'teal', 0, 1),
      n('tc', 'Pinned toolchain\nCompiler and base image\nby digest, not tag', 'purple', 0, 2),
      n('box', 'Sealed build\nNo network, no clock,\nno ambient environment', 'gold', 1, 1),
      n('art', 'Artifact\nBit-identical on every\nrebuild and every machine', 'green', 2, 1),
      n('why', 'Why it matters\nA rebuild can be verified,\nso the artifact you audit is\nthe artifact you shipped', 'cyan', 3, 1),
    ],
    edges: [
      ['src', 'box', ''], ['dep', 'box', ''], ['tc', 'box', ''],
      ['box', 'art', 'deterministic'], ['art', 'why', ''],
    ],
  },
  {
    file: '/diagrams/sre/test-pyramid.png',
    title: 'SRE Testing Pyramid — Confidence vs Cost',
    nodes: [
      n('unit', 'Unit tests\nThousands, milliseconds\nCheapest, narrowest', 'green', 0, 2),
      n('int', 'Integration tests\nHundreds, seconds\nReal dependencies', 'teal', 0, 1),
      n('e2e', 'End-to-end tests\nDozens, minutes\nSlow and flaky at scale', 'gold', 0, 0),
      n('prod', 'Production testing\nCanaries, synthetic probes,\nchaos experiments', 'purple', 1, 0),
      n('note', 'The SRE addition\nNo pre-production suite proves\nproduction behaviour — some\nconfidence is only buyable live', 'navy', 2, 0),
      n('cost', 'Cost and runtime rise\nas you climb; fidelity\nrises with them', 'gray', 1, 2),
    ],
    edges: [
      ['unit', 'int', ''], ['int', 'e2e', ''], ['e2e', 'prod', 'then'], ['prod', 'note', ''],
    ],
  },
  {
    file: '/diagrams/sre/nalsd-method.png',
    title: 'NALSD — Five Steps from Requirements to Architecture',
    nodes: [
      n('s1', '1. Requirements\nWhat must it do, for whom,\nat what scale', 'navy', 0, 0),
      n('s2', '2. Single machine\nCan one machine do it?\nEstablish the naive design', 'teal', 1, 0),
      n('s3', '3. Scale it up\nWhere does it break —\nCPU, memory, disk, network', 'gold', 2, 0),
      n('s4', '4. Fault tolerance\nWhat happens when each\ncomponent fails', 'red', 3, 0),
      n('s5', '5. Efficiency\nCost per unit of work;\nis it worth building', 'green', 4, 0),
      n('loop', 'Iterate\nEach answer changes the\nrequirements — the method\nis a loop, not a line', 'purple', 2, 1),
    ],
    edges: [
      ['s1', 's2', ''], ['s2', 's3', ''], ['s3', 's4', ''], ['s4', 's5', ''],
      ['s5', 'loop', '', { dashed: true }], ['loop', 's1', '', { dashed: true }],
    ],
  },
  {
    file: '/diagrams/sre/admission-control.png',
    title: 'Admission Control — Three-Layer Defence Against Overload',
    nodes: [
      n('load', 'Incoming load\nBeyond capacity', 'gray', 0, 1),
      n('l1', 'Layer 1 — Client\nAdaptive throttling, retry\nbudgets, exponential backoff\nwith jitter', 'navy', 1, 0),
      n('l2', 'Layer 2 — Edge\nPer-customer quotas and\nrate limits at the front door', 'teal', 1, 1),
      n('l3', 'Layer 3 — Server\nLoad shedding by request\ncriticality; queue depth\nwatermarks', 'gold', 1, 2),
      n('good', 'Graceful degradation\nSheds cheap traffic first,\nkeeps critical requests\nserved', 'green', 2, 1),
      n('bad', 'Without it\nQueues grow, latency\nexplodes, retries amplify —\nmetastable collapse', 'red', 2, 2),
    ],
    edges: [
      ['load', 'l1', ''], ['load', 'l2', ''], ['load', 'l3', ''],
      ['l3', 'good', ''], ['l3', 'bad', 'if absent', { color: '#ef4444', dashed: true }],
    ],
  },
  {
    file: '/diagrams/sre/config-rollout.png',
    title: 'Safe Config Rollout — Staged with Automated Validation',
    nodes: [
      n('chg', 'Config change\nVersioned in the same repo\nas code, reviewed', 'navy', 0, 0),
      n('val', 'Static validation\nSchema, lint, policy —\nrejects malformed config\nbefore any deploy', 'gold', 1, 0),
      n('can', 'Canary tier\nOne task, then one zone', 'teal', 2, 0),
      n('watch', 'Automated watch\nSLI comparison against\nthe unchanged fleet', 'purple', 3, 0),
      n('full', 'Full rollout\nStaged by zone with\nbake time between', 'green', 4, 0),
      n('rb', 'Automatic rollback\nConfig is data — reverting\nis a push, not a rebuild', 'red', 3, 1),
    ],
    edges: [
      ['chg', 'val', ''], ['val', 'can', 'passes'], ['can', 'watch', ''],
      ['watch', 'full', 'SLIs steady'], ['watch', 'rb', 'regression', { color: '#ef4444' }],
    ],
  },
  {
    file: '/diagrams/sre/canary-pipeline.png',
    title: 'Automated Canary Analysis Pipeline',
    nodes: [
      n('dep', 'Deploy canary\nSmall replica count\nbeside the baseline', 'navy', 0, 0),
      n('split', 'Traffic split\n1-5% to canary,\nrest to baseline', 'teal', 1, 0),
      n('coll', 'Metric collection\nSame window, same\nquery, both versions', 'gold', 2, 0),
      n('judge', 'Statistical judgement\nMann-Whitney or similar —\nnot eyeballed dashboards', 'purple', 3, 0),
      n('pass', 'Pass\nPromote in stages\n5% → 25% → 100%', 'green', 4, 0),
      n('fail', 'Fail\nAutomatic rollback,\nartifact quarantined', 'red', 4, 1),
      n('key', 'Compare canary to a\nconcurrent baseline, never\nto yesterday — that controls\nfor load and environment', 'cyan', 2, 1),
    ],
    edges: [
      ['dep', 'split', ''], ['split', 'coll', ''], ['coll', 'judge', ''],
      ['judge', 'pass', ''], ['judge', 'fail', '', { color: '#ef4444' }],
      ['key', 'coll', '', { dashed: true }],
    ],
  },
  {
    file: '/diagrams/sre/data-integrity.png',
    title: 'Data Integrity Verification Pipeline',
    nodes: [
      n('write', 'Write path\nApplication writes,\nchecksums computed', 'navy', 0, 0),
      n('store', 'Primary store\nReplicated', 'teal', 1, 0),
      n('soft', 'Soft deletion\nTombstone with a\nrecovery window —\ncatches user error', 'gold', 2, 0),
      n('backup', 'Backups\nOff-system, versioned,\nindependent failure domain', 'purple', 2, 1),
      n('verify', 'Continuous verification\nOut-of-band checksums and\nsampled restores', 'cyan', 3, 1),
      n('restore', 'Restore drill\nAn untested backup is\nnot a backup — restore is\nthe only real test', 'green', 4, 1),
      n('corrupt', 'Silent corruption\nDetected by verification,\nnot by users', 'red', 3, 0),
    ],
    edges: [
      ['write', 'store', ''], ['store', 'soft', ''], ['store', 'backup', ''],
      ['backup', 'verify', ''], ['verify', 'restore', ''],
      ['verify', 'corrupt', 'catches', { color: '#ef4444', dashed: true }],
    ],
  },
  {
    file: '/diagrams/sre/launch-lifecycle.png',
    title: 'Launch Lifecycle — PRR to Full Traffic',
    nodes: [
      n('design', 'Design consult\nSRE engages early, while\ndecisions are still cheap', 'navy', 0, 0),
      n('prr', 'Production Readiness Review\nSLOs, capacity, dependencies,\nfailure modes, runbooks', 'gold', 1, 0),
      n('dark', 'Dark launch\nProduction traffic mirrored,\nresponses discarded', 'purple', 2, 0),
      n('ramp', 'Staged ramp\n1% → 10% → 50% → 100%\nwith bake time', 'teal', 3, 0),
      n('full', 'Full traffic\nOwnership handed over\nwith the runbook', 'green', 4, 0),
      n('gate', 'Launch checklist\nEvery item has an owner;\nunchecked items block\nthe ramp, not the launch date', 'cyan', 2, 1),
    ],
    edges: [
      ['design', 'prr', ''], ['prr', 'dark', ''], ['dark', 'ramp', ''], ['ramp', 'full', ''],
      ['gate', 'ramp', 'gates', { dashed: true }],
    ],
  },
  {
    file: '/diagrams/sre/dos-mitigation.png',
    title: 'DoS Mitigation Layers — Absorb, Deflect, Shed',
    nodes: [
      n('att', 'Attack traffic\nVolumetric or\napplication-layer', 'red', 0, 1),
      n('absorb', 'Absorb\nAnycast and global CDN\ncapacity spread the load', 'navy', 1, 0),
      n('deflect', 'Deflect\nScrubbing centres, SYN\ncookies, WAF rules,\nbot verification', 'teal', 1, 1),
      n('shed', 'Shed\nRate limits and load\nshedding by criticality\nat the service', 'gold', 1, 2),
      n('svc', 'Service\nStays available for\nlegitimate users', 'green', 2, 1),
      n('note', 'Layered because each\nlayer fails differently —\nabsorption buys the time\nthat deflection needs', 'cyan', 2, 2),
    ],
    edges: [
      ['att', 'absorb', ''], ['att', 'deflect', ''], ['att', 'shed', ''],
      ['absorb', 'svc', ''], ['deflect', 'svc', ''], ['shed', 'svc', ''],
    ],
  },
  {
    file: '/diagrams/sre/design-understandability.png',
    title: 'Understandability Spectrum — From Opaque to Transparent',
    nodes: [
      n('op', 'Opaque\nBehaviour is emergent.\nNobody can predict what a\nchange will do', 'red', 0, 0),
      n('obs', 'Observable\nYou can see what it did,\nafter the fact', 'gold', 1, 0),
      n('pred', 'Predictable\nYou can reason about what\nit will do before running it', 'teal', 2, 0),
      n('trans', 'Transparent\nSystem invariants are\nexplicit and enforced', 'green', 3, 0),
      n('how', 'What moves you right\nBounded state, explicit\ninterfaces, few modes,\nno hidden coupling', 'navy', 1, 1),
      n('why', 'Why it is an SRE concern\nIncident response speed is\ncapped by how well the\nsystem can be reasoned about', 'purple', 3, 1),
    ],
    edges: [
      ['op', 'obs', ''], ['obs', 'pred', ''], ['pred', 'trans', ''],
      ['how', 'pred', 'enables', { dashed: true }], ['trans', 'why', ''],
    ],
  },
];

const only = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1]
  : undefined;
console.log(`Rendering ${SPECS.length} diagrams...`);
const made = generate(SPECS, { only });
console.log(`Done — ${made} written.`);
