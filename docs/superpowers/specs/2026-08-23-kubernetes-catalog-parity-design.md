# Kubernetes Catalog Parity — Design

**Date:** 2026-08-23
**Status:** Approved in principle; awaiting spec review
**Scope:** Capra Prepare → DevOps → Kubernetes content

## Problem

The Kubernetes content in the Prepare catalog is uneven and incomplete.

Uneven: 34 topics are mapped to the `orchestration` category, authored against
three different schemas that accreted over time. The renderer tolerates all
three, so the gap is invisible until measured.

Incomplete: kubernetes.io/docs/concepts publishes ~162 pages across 14 sections.
The catalog compresses each section into one or two topics, so whole areas —
Pod lifecycle, EndpointSlices, StorageClasses, Pod Security Standards,
scheduling framework, API Priority and Fairness, bare-metal setup — have no
dedicated topic.

## Current state (measured 2026-08-23)

### Schema drift across the 34 orchestration topics

| Shape | Fields | Count | Renders as |
|---|---|---:|---|
| A — current best | `introduction` + `topics[]` + `quickFire[]` | 12 | Overview → Deep Dive → Quick-Fire Q&A |
| B — legacy SD/coding | `keyConcepts`, `approach`, `pitfalls`, `whenToUse`, `keyQuestions` | 2 | Overview → concepts → steps → pitfalls |
| C — stub | `visualizations` only | 20 | Description line + diagrams |

Shape A topics run 18–27 KB. Shape C stubs run 5–14 KB and carry no prose
sections at all. `kubernetes-architecture` — the entry point to the whole
subject — is Shape C.

Shape C topics to rewrite: `kubernetes-architecture`, `k8s-core-resources`,
`kubernetes-services`, `kubernetes-gateway-api`, `kubernetes-api-aggregation`,
`kubernetes-custom-schedulers`, `kubernetes-descheduler`, `kubernetes-evictions`,
`operators-and-crds`, `service-mesh`, `ingress-gateway-api`, `helm-vs-kustomize`,
`kubeadm-provisioning`, `kubectl-cli-reference`, `local-kubernetes-setup`,
`container-probes`, `kubernetes-native-sidecars`, `kubernetes-runtime-class`,
`kubernetes-gpu-ai-scheduling`, `kubernetes-app-troubleshooting`.

### Rendering

`TopicDetail.jsx` selects a render branch by page. DevOps is in the
`isSREStyle` list (line 716). That branch (line 2903 onward) reads
`introduction`, `topics[]`, `quickFire[]`, `keyConcepts`, `approach`,
`pitfalls`, `whenToUse`, `keyQuestions`, `visualizations`, `references`,
`video`. Every field in all three shapes already renders — **no renderer change
is needed**. This is purely a content and information-architecture job.

`DocsPage.jsx:3373` assigns topics to categories:

```js
const categoryTopics = filteredTopics.filter(t => devopsTopicCategoryMap[t.id] === category.id);
```

A topic absent from the map renders in no category, silently.

### Page routing (not a bug)

`devopsTopics.js` exports three page bundles, wired separately in `loader.js`:

| Export | Prepare page | Topics |
|---|---|---:|
| `devopsCategories` / `devopsTopicCategoryMap` / `devopsTopics` | DevOps | 137 |
| `observabilityCategories` / `observabilityTopicCategoryMap` / `observabilityTopics` | Observability | 8 |
| `platformCategories` / `platformTopicCategoryMap` / `platformTopics` | Platform Engineering | 5 |

The 13 topics outside `devopsTopicCategoryMap` are intentionally routed to the
Observability and Platform pages. They are reachable. No repair required.

### Size

`devopsTopics.js` is 2.5 MB of source and ships as a single 2.5 MB dynamic
chunk, loaded whenever a user opens DevOps. Orchestration alone accounts for
567 KB. This is the binding constraint on the plan.

## Goals

1. Every Kubernetes topic uses Shape A.
2. The catalog covers the kubernetes.io Concepts tree plus the bare-metal
   portion of `/docs/setup/`, at a granularity of 1 topic per 1–3 doc pages.
3. Kubernetes content is navigable by subject rather than as a flat list of 34+.
4. New content does not inflate the existing DevOps chunk.
5. Every topic carries real kubernetes.io source URLs in `references`.

## Non-goals

- Windows sections (`/docs/concepts/windows/`, `windows-networking`,
  `windows-storage`, `windows-security`, `windows-resource-management`).
  Out of scope; note the omission in the Architecture topic.
- `/docs/concepts/security/pod-security-policy/`. PodSecurityPolicy was
  removed in v1.25; Pod Security Admission replaces it and gets a topic. PSP
  is mentioned only as prior art inside that topic. Recorded here so the
  omission is a decision rather than an oversight.
- Renderer changes. The SRE-style branch already covers every field.
- Touching the Observability or Platform Engineering pages.
- Reorganising non-Kubernetes DevOps categories.
- Verbatim reproduction of kubernetes.io prose. Content is paraphrased and
  attributed; the docs are CC BY 4.0.

## Target information architecture

Replace the single `orchestration` category with ten Kubernetes
sub-categories. Existing topics are reassigned; new topics are authored per
category.

| Category id | Name | Existing topics moved | New topics | Doc pages covered |
|---|---|---:|---:|---:|
| `k8s-architecture` | Architecture & the API | 3 | 10 | ~23 |
| `k8s-workloads` | Workloads & Pods | 5 | 14 | ~36 |
| `k8s-networking` | Networking & Service Discovery | 6 | 7 | ~13 |
| `k8s-storage` | Storage | 1 | 9 | ~15 |
| `k8s-config-policy` | Configuration & Policies | 1 | 5 | ~7 |
| `k8s-security` | Security | 4 | 12 | ~18 |
| `k8s-scheduling` | Scheduling, Preemption & Eviction | 5 | 10 | ~18 |
| `k8s-cluster-admin` | Cluster Administration & Operations | 4 | 11 | ~18 |
| `k8s-baremetal` | Bare Metal & Production Setup | 2 | 7 | `/docs/setup/` |
| `k8s-extending` | Extending Kubernetes | 2 | 6 | ~7 |
| | **Total** | **33** | **91** | |

`helm-vs-kustomize` moves to the existing `helm` category rather than into a
Kubernetes sub-category.

### Category contents

**`k8s-architecture` — Architecture & the API**
Existing: `kubernetes-architecture` (rewrite), `kubectl-cli-reference`,
`local-kubernetes-setup`.
New: nodes and node lifecycle; control-plane ↔ node communication and proxies;
controllers, leases and coordinated leader election; cloud-controller-manager;
garbage collection, self-healing, finalizers and owner references; objects,
names and object management; labels, selectors, annotations and field
selectors; namespaces; the Kubernetes API, storage versions, mixed-version
proxy and compatibility version; cgroup v2, CRI and the container environment.

**`k8s-workloads` — Workloads & Pods**
Existing: `k8s-core-resources` (rewrite as section index), `container-probes`,
`kubernetes-native-sidecars`, `kubernetes-runtime-class`,
`kubernetes-autoscaling` (deepen).
New: Pod lifecycle, conditions and hostname; init and ephemeral containers;
Pod QoS classes; Pod disruptions and PDBs; static Pods and user namespaces;
Downward API and advanced Pod configuration; Deployments, ReplicaSets and
ReplicationController; StatefulSets; DaemonSets; Jobs, CronJobs and TTL
cleanup; Workload API and PodGroups; container images; container lifecycle
hooks; node resource managers.

The node resource managers topic covers the kubelet suite documented at
`/docs/concepts/workloads/resource-managers/` — Topology Manager, CPU Manager
(`none` and `static` policies and their feature-gated options), Memory
Manager, Device Manager and pod-level resource managers — and the QoS-class
rules that decide which Pods get exclusive CPUs. It pairs with Pod QoS classes
and with `k8s-scheduling`'s NUMA and device topics.

`/docs/concepts/workloads/management/` (Managing Workloads) is covered by the
`k8s-core-resources` section index rather than a topic of its own.

**`k8s-networking` — Networking & Service Discovery**
Existing: `kubernetes-services` (rewrite), `kubernetes-networking` (deepen),
`ingress-gateway-api` (rewrite), `kubernetes-gateway-api` (rewrite),
`service-mesh` (rewrite), `k8s-network-policy-guide`.
New: EndpointSlices; DNS for Services and Pods; dual-stack and ClusterIP
allocation; topology-aware routing and internal traffic policy; Ingress
controllers; the cluster networking model; CNI and network plugins.

**`k8s-storage` — Storage**
Existing: `kubernetes-storage` (retarget as section overview).
New: Volumes; PersistentVolumes and PVCs; StorageClasses and dynamic
provisioning; volume snapshots, snapshot classes and CSI cloning; projected,
ephemeral and local ephemeral volumes; VolumeAttributesClasses; storage
capacity and node volume limits; volume health monitoring; CSI driver
internals.

**`k8s-config-policy` — Configuration & Policies**
Existing: `kubernetes-secrets-management`.
New: ConfigMaps; resource requests and limits; kubeconfig and cluster access;
LimitRanges and ResourceQuotas; PID limits and node allocatable.

**`k8s-security` — Security**
Existing: `kubernetes-security` (deepen), `kubernetes-rbac` (deepen),
`kubernetes-admission-control` (deepen), `kubernetes-multitenancy` (deepen).
New: the cloud-native security model; Pod Security Standards; Pod Security
Admission; ServiceAccounts and projected tokens; controlling API access
(authn/authz chain); RBAC good practices; Secrets good practices; the hardening
guides (authentication, scheduler, DRA); API-server bypass risks; Linux kernel
security constraints; security and application-security checklists;
certificates and cluster PKI.

**`k8s-scheduling` — Scheduling, Preemption & Eviction**
Existing: `kubernetes-pod-scheduling`, `kubernetes-custom-schedulers`
(rewrite), `kubernetes-descheduler` (rewrite), `kubernetes-evictions`
(rewrite), `kubernetes-gpu-ai-scheduling` (rewrite).
New: kube-scheduler internals; assigning Pods to nodes; taints and tolerations;
topology spread and topology-aware workload scheduling; the scheduling
framework; Dynamic Resource Allocation; gang scheduling and PodGroup
scheduling; Pod priority, preemption and workload-aware preemption;
node-pressure and API-initiated eviction; scheduler tuning, bin packing, Pod
overhead, scheduling readiness and node declared features.

**`k8s-cluster-admin` — Cluster Administration & Operations**
Existing: `kubernetes-upgrades`, `kubernetes-observability`,
`kubernetes-multicloud`, `kubernetes-app-troubleshooting` (rewrite).
New: node shutdown and swap memory management; node and cluster autoscaling;
logging architecture and system logs; system metrics and kube-state-metrics;
system traces; API Priority and Fairness; addons and cluster services;
admission-webhook good practices; Dynamic Resource Allocation for cluster
admins; etcd operations, backup and restore; cluster certificate rotation.

The DRA topic here covers `/docs/concepts/cluster-administration/dra/` —
operating DRA on a cluster. It is a different page from the DRA hardening
guide under `k8s-security` and from the DRA scheduling concept under
`k8s-scheduling`; all three are separate pages and get separate topics.

**`k8s-baremetal` — Bare Metal & Production Setup**
Existing: `kubeadm-provisioning` (rewrite), `kubernetes-the-hard-way`.
New: production-environment checklist; HA control-plane topologies (stacked vs
external etcd); container runtime installation; bare-metal load balancing
(MetalLB, kube-vip); bare-metal storage (Longhorn, Rook/Ceph, OpenEBS, local
PVs); node provisioning and imaging (PXE, Tinkerbell, Cluster API bare metal);
air-gapped clusters and registry mirroring.

**`k8s-extending` — Extending Kubernetes**
Existing: `operators-and-crds` (rewrite), `kubernetes-api-aggregation`
(rewrite).
New: CustomResourceDefinitions; the operator pattern; device plugins;
admission webhooks and CEL policies (ValidatingAdmissionPolicy,
MutatingAdmissionPolicy); kubectl plugins and Krew; compute, storage and
network extensions.

## Content schema

Shape A is canonical. Every new and rewritten topic conforms:

```js
{
  id: 'k8s-pod-lifecycle',
  title: 'Pod Lifecycle',
  icon: 'package',
  color: '#14b8a6',
  questions: 6,
  description: '…one paragraph, shown on the category card…',
  introduction: '…framing prose, rendered as Overview…',
  topics: [
    { title: '…', content: '…', codeExample: '…', image: '/diagrams/k8s/…png' },
  ],
  quickFire: [ { q: '…', a: '…' } ],
  references: ['https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/'],
}
```

Depth floor per topic: `introduction` present; `topics[]` ≥ 3 sections;
`quickFire[]` ≥ 5 pairs; `references[]` ≥ 1 kubernetes.io URL. Target 15–25 KB
serialized, matching the existing Shape A band.

`codeExample` and `image` are optional per section. Diagrams are additive and
not required for a topic to ship.

## File and loader structure

New content goes in new files so `devopsTopics.js` stops growing:

```
apps/camora/src/data/capra/topics/
  k8sArchitectureTopics.js     k8sSecurityTopics.js
  k8sWorkloadsTopics.js        k8sSchedulingTopics.js
  k8sNetworkingTopics.js       k8sClusterAdminTopics.js
  k8sStorageTopics.js          k8sBareMetalTopics.js
  k8sConfigPolicyTopics.js     k8sExtendingTopics.js
```

Each exports `<name>Topics` and `<name>TopicCategoryMap`. A barrel,
`k8sTopics.js`, re-exports a merged `k8sTopics`, `k8sTopicCategoryMap` and
`k8sCategories`, and is the only module `loader.js` imports:

```js
devops: async () => {
  const [mod, helmMod, fluxMod, cpMod, nbMod, extraMod, k8sMod] = await Promise.all([
    …,
    import('./k8sTopics.js'),
  ]);
  return {
    devopsCategories: [...mod.devopsCategories, ...k8sMod.k8sCategories],
    devopsTopicCategoryMap: {
      ...mod.devopsTopicCategoryMap,
      ...extraMod.devopsExtraTopicCategoryMap,
      ...k8sMod.k8sTopicCategoryMap,
    },
    devopsTopics: [ …, ...k8sMod.k8sTopics ],
  };
},
```

The `orchestration` entry is removed from `devopsCategories` once its topics
are reassigned. Reassignment is a map edit — topic objects stay where they
live today; only `devopsTopicCategoryMap` values change. This keeps Phase 1 a
low-risk, mechanical change.

Rollup emits each `k8s*Topics.js` as its own chunk reachable through the
barrel. If the merged k8s bundle exceeds ~1 MB, split the barrel into
per-category dynamic imports keyed on the selected category. Decide after
Phase 3, on measured numbers.

## Authoring pipeline

Per topic:

1. **Fetch.** `WebFetch` each mapped kubernetes.io page. Extract: the concept,
   the API surface, version-specific facts (feature-gate names, GA/beta/alpha
   status and version, defaults), and any documented failure modes.
2. **Author.** Write Shape A from the fetched material, paraphrased. Version
   claims must come from the fetched page, not memory — the fetch already
   surfaced sections absent from model knowledge (Workload API, gang
   scheduling, node declared features, swap management, compatibility version,
   kube-state-metrics, volume populators).
3. **Attribute.** Every fetched URL goes into `references`.
4. **Validate.** Run the checks below.

Interview framing is retained: `quickFire` stays question-and-answer, and
`topics[]` sections lead with the thing an interviewer probes. Docs parity
governs *coverage*, not tone.

## Validation

A Vitest suite under `apps/camora/src/data/capra/topics/__tests__/`:

1. **Mapping completeness** — every topic in `devopsTopics`, `k8sTopics`,
   `observabilityTopics` and `platformTopics` appears in at least one of the
   corresponding category maps. Catches the silent-drop failure at
   `DocsPage.jsx:3373`.
2. **Category integrity** — every value in every map matches a declared
   category id; no duplicate topic ids across files.
3. **Depth floor** — every topic under a `k8s-*` category satisfies the Shape A
   minimums (`introduction`, ≥3 `topics[]`, ≥5 `quickFire[]`, ≥1 reference).
4. **Reference validity** — every `references` entry on a `k8s-*` topic is a
   well-formed `https://kubernetes.io/` URL. Format only; no network calls in
   the test.

5. **Coverage reconciliation** — every kubernetes.io Concepts page is either
   claimed by a topic or explicitly excluded. Backed by a checked-in
   inventory, `k8s-doc-coverage.json`:

   ```json
   {
     "/docs/concepts/workloads/resource-managers/": "k8s-node-resource-managers",
     "/docs/concepts/workloads/management/": "k8s-core-resources",
     "/docs/concepts/security/pod-security-policy/": { "excluded": "removed in v1.25; superseded by Pod Security Admission" },
     "/docs/concepts/windows/intro/": { "excluded": "Windows out of scope" }
   }
   ```

   The test asserts every value that names a topic id resolves to a real
   topic, and that no id is claimed by two pages without both appearing in
   that topic's `references`. Refreshing the inventory against a live fetch is
   a manual step at the start of each content phase, not a network call in the
   test suite.

Check 3 is what converts "high level" from a judgment call into a build
failure. Check 5 does the same for coverage.

The inventory exists because the first draft of this spec collapsed ~162 doc
pages into ten prose paragraphs and lost four of them —
`/workloads/resource-managers/`, `/workloads/management/`,
`/cluster-administration/dra/` and an unstated decision about
`/security/pod-security-policy/`. Prose cannot be diffed against a page list;
a JSON map can. Depth gaps are visible on review, coverage gaps are not,
because nothing on the page points at the hole.

## Phasing

| Phase | Work | Gate |
|---|---|---|
| 0 | Vitest suite (checks 1–2 only, against today's data) | Suite passes on current `main` |
| 1 | Add 10 `k8s-*` categories; reassign the 33 existing topics; remove `orchestration`; add barrel + loader wiring | Every existing topic still reachable; no prose written |
| 2 | Rewrite the 20 Shape-C stubs to Shape A, fetching docs per topic; enable check 3 | Depth floor passes for all existing k8s topics |
| 3 | Author `k8s-workloads` (13) | Category complete, tests green |
| 4 | Author `k8s-security` (12) | ditto |
| 5 | Author `k8s-scheduling` (10) + `k8s-storage` (9) | ditto |
| 6 | Author `k8s-cluster-admin` (10) + `k8s-architecture` (10) | ditto |
| 7 | Author `k8s-networking` (7) + `k8s-baremetal` (7) | ditto |
| 8 | Author `k8s-config-policy` (5) + `k8s-extending` (6) | Full parity; measure bundle |

Phases 3–8 are ordered by interview value: workloads and security first,
config and extension last. Each phase is independently shippable — the catalog
is never in a broken intermediate state, because Phase 1 makes every category
valid before any new prose exists.

## Risks

**Bundle growth.** ~89 topics at 15–25 KB is ~1.7 MB of new content. Mitigated
by separate files and a barrel that Rollup can split; re-measured after Phase 3
with a hard decision point at 1 MB.

**Fetch drift.** kubernetes.io changes between phases, so topics authored in
Phase 3 may cite older behaviour than those in Phase 8. Accepted: each topic
records its source URLs, and refreshing is a re-fetch of a known list.

**Navigation churn.** Replacing one familiar category with ten changes the
DevOps page. Phase 1 lands this alone, before any content, so the IA can be
judged and reverted independently.

**Volume.** 89 new topics plus 20 rewrites is the largest content change the
catalog has taken. Phasing by category keeps each pass reviewable; the depth
floor keeps quality from sliding as volume grows.

## References

- https://kubernetes.io/docs/concepts/ — Concepts tree (~162 pages, fetched 2026-08-23)
- https://kubernetes.io/docs/concepts/cluster-administration/ — 18 sub-pages
- https://kubernetes.io/docs/setup/ — bare-metal and production setup
- kubernetes.io content is CC BY 4.0; this catalog paraphrases and attributes.
